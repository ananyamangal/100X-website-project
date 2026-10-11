// Run: node --import ./tests/support/register.mjs --test --test-concurrency=1 tests/unit/crm-quotes-pdf.test.mjs
// STEP 6b quotation PDF: layout content (pure), font runs, rendering (text extracted back with
// pdf-parse), storage (issued = stored once, never re-rendered; draft = watermarked preview), API.
import test, { before, after } from "node:test"
import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { createHash } from "node:crypto"
import { ObjectId } from "mongodb"
import { startMemoryMongo } from "./crm/helpers/memory-mongo.mjs"
import { all, count } from "./crm/helpers/wa-harness.mjs"
import { NOW, jreq, reqCtx, apiDeps, seedContact } from "./crm/helpers/outbound-kit.mjs"
import { crmDbFrom } from "../../lib/crm/db.ts"
import { COLL } from "../../lib/crm/model.ts"
import { computeLine, totalsOf } from "../../lib/crm/quotes/money.ts"
import { buildLayout, sellerFrom, istDate } from "../../lib/crm/quotes/layout.ts"
import { renderQuotationPdf, scriptRuns } from "../../lib/crm/quotes/pdf.ts"
import { DEFAULT_TERMS } from "../../lib/crm/quotes/input.ts"
import { createQuotationHandler, issueQuotationHandler, quotationPdfHandler, renderPdfAfterIssue } from "../../lib/crm/api/quotations.ts"

const pdfParse = createRequire(import.meta.url)("pdf-parse/lib/pdf-parse.js")
const textOf = async buf => (await pdfParse(buf))
let m
before(async () => { m = await startMemoryMongo() })
after(async () => { if (m) await m.stop() })
const need = t => { if (!m.ok) { t.skip(m.skip); return false } return true }

const L1 = computeLine({ productSlug: null, model: "TF-35", description: "Pulse-jet thermal fogger, 35 L/h output", hsn: "84248990", qty: 2, unitPrice: 2050000, gstRate: 18 })
const L2 = computeLine({ productSlug: null, model: "Spares kit", description: "", hsn: null, qty: 1, unitPrice: 150000, gstRate: 18 })
const ISSUED = new Date("2026-10-10T06:00:00Z")
const Q = (o = {}) => ({ quoteNumber: "100X/QT/2026-27/0001", version: 1, status: "issued", issuedAt: ISSUED, createdAt: ISSUED, lines: [L1, L2], totals: totalsOf([L1, L2]), terms: { ...DEFAULT_TERMS, payment: "50% advance", delivery: "7 working days" }, ...o })
const BUYER = { name: "रमेश कुमार", company: "Nagar Nigam Gurugram", city: "Gurugram", state: "Haryana", phoneE164: "+919800000001", email: "ramesh@example.in" }

// ───────────────────────── layout (pure) ─────────────────────────
test("layout: number/date/validity in IST, Rev label, buyer block, rows, amount in words, terms (empty ones dropped)", () => {
  const l = buildLayout(Q({ version: 2 }), BUYER, sellerFrom(null))
  assert.deepEqual(l.meta, [["Quotation No.", "100X/QT/2026-27/0001 Rev 2"], ["Date", "10 Oct 2026"], ["Valid until", "25 Oct 2026"], ["Revision", "Rev 2"]])
  assert.equal(l.watermark, null)
  assert.deepEqual(l.buyer.lines, ["Nagar Nigam Gurugram", "Attn: रमेश कुमार", "Gurugram, Haryana", "+91 98000 00001", "ramesh@example.in"])
  assert.deepEqual(l.table.rows[0], ["1", "TF-35\nPulse-jet thermal fogger, 35 L/h output", "84248990", "2", "20,500.00", "18%", "41,000.00", "48,380.00"])
  assert.equal(l.table.rows[1][1], "Spares kit")
  assert.deepEqual(l.grandTotal, ["Grand total (incl. GST)", "₹ 50,150.00"])
  assert.equal(l.amountInWords, "Rupees Fifty Thousand One Hundred Fifty Only")
  assert.deepEqual(l.terms.map(t => t[0]), ["Validity", "Payment", "Delivery", "Place of supply"])
  assert.equal(istDate(new Date("2026-10-09T19:00:00Z")), "10 Oct 2026", "IST date, not UTC")
})

test("layout: place of supply decides CGST+SGST (same state) / IGST (other state) / GST (state unknown); totals unchanged", () => {
  const intra = buildLayout(Q(), BUYER, sellerFrom(null)).tax
  assert.deepEqual(intra, [["Taxable value", "₹ 42,500.00"], ["CGST", "₹ 3,825.00"], ["SGST", "₹ 3,825.00"]])
  const inter = buildLayout(Q(), { ...BUYER, state: "Uttar Pradesh" }, sellerFrom(null)).tax
  assert.deepEqual(inter, [["Taxable value", "₹ 42,500.00"], ["IGST", "₹ 7,650.00"]])
  const unknown = buildLayout(Q(), { ...BUYER, state: null }, sellerFrom(null))
  assert.deepEqual(unknown.tax[1], ["GST", "₹ 7,650.00"])
  assert.ok(!unknown.terms.some(t => t[0] === "Place of supply"))
  assert.equal(buildLayout(Q(), { ...BUYER, state: "  haryana " }, sellerFrom(null)).tax[1][0], "CGST", "case/space-insensitive")
})

test("layout: seller = published company identity by default; GSTIN / bank / signatory only from settings, never invented", () => {
  const d = sellerFrom(null)
  assert.equal(d.legalName, "100X Circle Private Limited")
  assert.deepEqual(d.addressLines, ["UG, 398, Sector 7, Industrial Model Township", "Gurugram, Haryana 122050"])
  assert.equal(d.gstin, null); assert.equal(d.bank, null); assert.equal(d.signatory, null)
  const l = buildLayout(Q(), BUYER, d)
  assert.ok(!l.seller.lines.some(x => /GSTIN/.test(x))); assert.deepEqual(l.bank, [])
  const s = sellerFrom({ gstin: "06AAAAA0000A1Z5", bank: { name: "HDFC Bank", account: "0000111122223333", ifsc: "HDFC0000001", branch: "" }, signatory: "Authorised Signatory", addressLines: ["Line 1", "  ", "Line 2"] })
  const l2 = buildLayout(Q(), BUYER, s)
  assert.ok(l2.seller.lines.includes("GSTIN: 06AAAAA0000A1Z5"))
  assert.deepEqual(l2.bank, ["Bank: HDFC Bank", "A/c No.: 0000111122223333", "IFSC: HDFC0000001"])
  assert.deepEqual(s.addressLines, ["Line 1", "Line 2"])
  assert.equal(l2.footer[0], "For 100X Circle Private Limited — Authorised Signatory")
})

test("layout: draft = DRAFT watermark and no number; missing buyer details get a placeholder", () => {
  const l = buildLayout(Q({ status: "draft", quoteNumber: null, issuedAt: null }), { name: null, company: null, city: null, state: null, phoneE164: null, email: null }, sellerFrom(null))
  assert.equal(l.watermark, "DRAFT"); assert.equal(l.meta[0][1], "DRAFT (not issued)")
  assert.deepEqual(l.buyer.lines, ["(customer details not recorded)"])
})

test("font runs: each character goes to a face that has its glyph (₹, Devanagari, accents, punctuation)", () => {
  assert.deepEqual(scriptRuns("Rate (₹)"), [["latin", "Rate ("], ["ext", "₹"], ["latin", ")"]])
  assert.deepEqual(scriptRuns("Attn: रमेश कुमार"), [["latin", "Attn: "], ["deva", "रमेश कुमार"]])
  assert.deepEqual(scriptRuns("₹ 1,770.00"), [["ext", "₹ "], ["latin", "1,770.00"]])
  // the Devanagari subset has no comma glyph, so ", " falls back to latin
  assert.deepEqual(scriptRuns("नमस्ते, ₹500"), [["deva", "नमस्ते"], ["latin", ", "], ["ext", "₹"], ["latin", "500"]])
  assert.deepEqual(scriptRuns("Łódź"), [["ext", "Ł"], ["latin", "ód"], ["ext", "ź"]])
})

// ───────────────────────── rendering ─────────────────────────
test("render: one A4 page, every string present when extracted back, no missing glyphs, Hindi name intact, deterministic bytes", async () => {
  const layout = buildLayout(Q({ version: 2 }), BUYER, sellerFrom({ gstin: "06AAAAA0000A1Z5" }))
  const a = await renderQuotationPdf(layout)
  const b = await renderQuotationPdf(layout)
  assert.ok(a.subarray(0, 5).toString() === "%PDF-")
  assert.ok(a.equals(b), "byte-identical re-render")
  assert.ok(a.length < 60_000, `small file (${a.length} bytes; fonts are subset)`)
  const r = await textOf(a)
  assert.equal(r.numpages, 1)
  assert.equal((r.text.match(/\u0000/g) || []).length, 0, "no .notdef glyphs")
  const flat = r.text.replace(/\s+/g, " ")
  for (const s of ["100X Circle Private Limited", "QUOTATION", "100X/QT/2026-27/0001 Rev 2", "10 Oct 2026", "25 Oct 2026", "Nagar Nigam Gurugram", "रमेश कुमार",
    "TF-35", "Pulse-jet thermal fogger, 35 L/h output", "84248990", "48,380.00", "CGST", "SGST", "50,150.00", "₹", "Rupees Fifty Thousand One Hundred Fifty Only",
    "50% advance", "GSTIN: 06AAAAA0000A1Z5", "Page 1 of 1", "Rate (₹)"]) {
    assert.ok(flat.includes(s), `missing in PDF text: ${s}`)
  }
  assert.ok(!flat.includes("DRAFT"))
})

test("render: many lines flow onto further pages with the header repeated; draft carries the watermark on every page", async () => {
  const lines = Array.from({ length: 30 }, (_, i) => computeLine({ productSlug: null, model: `M-${i + 1}`, description: "Thermal fogger spare part with a longer description line", hsn: null, qty: 1, unitPrice: 10000, gstRate: 18 }))
  const buf = await renderQuotationPdf(buildLayout(Q({ status: "draft", quoteNumber: null, lines, totals: totalsOf(lines) }), BUYER, sellerFrom(null)))
  const r = await textOf(buf)
  assert.ok(r.numpages >= 2, `${r.numpages} pages`)
  const flat = r.text.replace(/\s+/g, " ")
  assert.ok((flat.match(/HSNQty/g) || []).length >= 2, "table header repeated on the next page")
  assert.equal((flat.match(/DRAFT/g) || []).length - (flat.match(/DRAFT \(not issued\)/g) || []).length, r.numpages, "watermark per page")
  assert.ok(flat.includes("M-30") && flat.includes(`Page ${r.numpages} of ${r.numpages}`))
})

// ───────────────────────── storage + API ─────────────────────────
let n = 0
async function txCrm() {
  const crm = crmDbFrom(m.client.db(`crm_qp_${process.pid}_${++n}`), "fogging", { client: m.client })
  await crm.ensureIndexes()
  return crm
}
async function seedDeal(crm, contactO = {}) {
  const c = await seedContact(crm, { name: "Ramesh Kumar", ...contactO })
  await crm.collection(COLL.contacts).updateOne({ _id: c._id }, { $set: { company: "Nagar Nigam", state: "Haryana", city: "Gurugram" } })
  const _id = new ObjectId()
  await crm.collection(COLL.deals).insertOne({ _id, contactId: c._id, stage: "requirement_shared", isOpen: true, assignedTo: null, lastQuotation: null, createdAt: NOW, updatedAt: NOW })
  return _id
}
const PERMS = ["crm.view", "crm.quotes.create", "crm.leads.view_all"]
const LINE = { model: "TF-35", description: "Thermal fogger", qty: 2, unitPrice: 2050000, gstRate: 18 }

test("issue renders + stores the PDF once; downloads serve the stored copy (never re-rendered, even after settings change)", async t => {
  if (!need(t)) return
  const crm = await txCrm()
  const dealId = await seedDeal(crm)
  const d = apiDeps(crm, { perms: PERMS })
  const q = (await (await createQuotationHandler(jreq("POST", "http://x/q", { lines: [LINE] }), reqCtx(dealId), d)).json()).quotation
  const iss = await issueQuotationHandler(jreq("POST", "http://x/i"), reqCtx(q.id), { ...d, afterQuoteIssue: renderPdfAfterIssue })
  const issued = (await iss.json()).quotation
  assert.equal(issued.pdf.storage, "db"); assert.equal(issued.pdf.cloudinaryPublicId, null)
  const [row] = await all(crm, COLL.quotationPdfs)
  assert.equal(String(row._id), q.id); assert.equal(row.bytes, issued.pdf.bytes)
  const res = await quotationPdfHandler(jreq("GET", "http://x/p"), reqCtx(q.id), d)
  assert.equal(res.status, 200)
  assert.equal(res.headers.get("content-type"), "application/pdf")
  assert.equal(res.headers.get("cache-control"), "private, no-store")
  assert.match(res.headers.get("content-disposition"), /filename="Quotation-100X-QT-2026-27-0001\.pdf"/)
  const bytes = Buffer.from(await res.arrayBuffer())
  assert.equal(createHash("sha256").update(bytes).digest("hex"), issued.pdf.sha256)
  // settings change (GSTIN added) must not alter the issued copy
  await crm.collection(COLL.settings).updateOne({ _id: "fogging" }, { $set: { quotation: { gstin: "06AAAAA0000A1Z5" } } }, { upsert: true })
  const again = Buffer.from(await (await quotationPdfHandler(jreq("GET", "http://x/p"), reqCtx(q.id), d)).arrayBuffer())
  assert.ok(again.equals(bytes))
  assert.equal(await count(crm, COLL.quotationPdfs), 1)
})

test("a failed render at issue leaves pdf:null and keeps the number; the first download renders and stores it", async t => {
  if (!need(t)) return
  const crm = await txCrm()
  const dealId = await seedDeal(crm)
  const d = apiDeps(crm, { perms: PERMS })
  const q = (await (await createQuotationHandler(jreq("POST", "http://x/q", { lines: [LINE] }), reqCtx(dealId), d)).json()).quotation
  const iss = await issueQuotationHandler(jreq("POST", "http://x/i"), reqCtx(q.id), { ...d, afterQuoteIssue: async () => { throw new Error("render failed") } })
  assert.equal(iss.status, 200)
  const issued = (await iss.json()).quotation
  assert.equal(issued.quoteNumber, "100X/QT/2026-27/0001"); assert.equal(issued.pdf, null)
  assert.equal(await count(crm, COLL.quotationPdfs), 0)
  const res = await quotationPdfHandler(jreq("GET", "http://x/p"), reqCtx(q.id), d)
  assert.equal(res.status, 200)
  assert.equal(await count(crm, COLL.quotationPdfs), 1)
  assert.equal((await crm.collection(COLL.quotations).findOne({ _id: new ObjectId(q.id) })).pdf.storage, "db")
})

test("draft download: watermarked preview, nothing stored; out-of-scope -> 404; no lead scope -> 403", async t => {
  if (!need(t)) return
  const crm = await txCrm()
  const dealId = await seedDeal(crm)
  const d = apiDeps(crm, { perms: PERMS })
  const q = (await (await createQuotationHandler(jreq("POST", "http://x/q", { lines: [LINE] }), reqCtx(dealId), d)).json()).quotation
  const res = await quotationPdfHandler(jreq("GET", "http://x/p"), reqCtx(q.id), d)
  assert.equal(res.status, 200)
  assert.match(res.headers.get("content-disposition"), /Quotation-draft-preview\.pdf/)
  const flat = (await textOf(Buffer.from(await res.arrayBuffer()))).text.replace(/\s+/g, " ")
  assert.ok(flat.includes("DRAFT (not issued)") && flat.includes("Ramesh Kumar"))
  assert.equal(await count(crm, COLL.quotationPdfs), 0)
  assert.equal((await crm.collection(COLL.quotations).findOne({ _id: new ObjectId(q.id) })).pdf, null)
  assert.equal((await quotationPdfHandler(jreq("GET", "http://x/p"), reqCtx(q.id), apiDeps(crm, { perms: ["crm.view", "crm.leads.view_assigned"], sub: "u7" }))).status, 404)
  assert.equal((await quotationPdfHandler(jreq("GET", "http://x/p"), reqCtx(q.id), apiDeps(crm, { perms: ["crm.view"] }))).status, 403)
})
