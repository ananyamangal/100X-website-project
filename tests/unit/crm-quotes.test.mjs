// Run: node --import ./tests/support/register.mjs --test --test-concurrency=1 tests/unit/crm-quotes.test.mjs
// STEP 6a quotations: paise arithmetic, FY numbering, input validation, draft → issue (gapless,
// transactional) → revise → superseded, internal-note tripwire, permissions and lead scope.
import test, { before, after } from "node:test"
import assert from "node:assert/strict"
import { ObjectId } from "mongodb"
import { startMemoryMongo } from "./crm/helpers/memory-mongo.mjs"
import { all, count } from "./crm/helpers/wa-harness.mjs"
import { NOW, jreq, reqCtx, apiDeps, seedContact } from "./crm/helpers/outbound-kit.mjs"
import { crmDbFrom } from "../../lib/crm/db.ts"
import { COLL } from "../../lib/crm/model.ts"
import { computeLine, totalsOf, splitGst, formatInr, amountInWords, gstOf } from "../../lib/crm/quotes/money.ts"
import { fyOf, formatQuoteNumber, quoteLabel, quoteFilename } from "../../lib/crm/quotes/numbering.ts"
import { parseQuoteInput, DEFAULT_TERMS } from "../../lib/crm/quotes/input.ts"
import { createDraft, updateDraft, discardDraft, issueQuotation, reviseQuotation } from "../../lib/crm/quotes/service.ts"
import {
  listDealQuotationsHandler, createQuotationHandler, getQuotationHandler, updateQuotationHandler, discardQuotationHandler,
  issueQuotationHandler, reviseQuotationHandler,
} from "../../lib/crm/api/quotations.ts"
import { createInternalNote, toNoteText } from "../../lib/crm/notes/index.ts"

let m
before(async () => { m = await startMemoryMongo() })
after(async () => { if (m) await m.stop() })
const need = t => { if (!m.ok) { t.skip(m.skip); return false } return true }

let n = 0
async function txCrm() {
  const crm = crmDbFrom(m.client.db(`crm_q_${process.pid}_${++n}`), "fogging", { client: m.client })
  await crm.ensureIndexes()
  return crm
}
const ACTOR = { userId: "u1", name: "Asha", role: "sales", permissions: ["crm.view", "crm.quotes.create", "crm.quotes.send", "crm.leads.view_all"] }
const ALL = { kind: "all" }
const LINE = { productSlug: "thermal-fogger-tf-35", model: "TF-35", description: "Thermal fogger, 35 L/h", hsn: "84248990", qty: 2, unitPrice: 2050000, gstRate: 18 }
const body = r => r.json()

async function seedDeal(crm, o = {}) {
  const c = o.contact ?? (await seedContact(crm, { assignedTo: o.contactAssignedTo ?? null }))
  const _id = new ObjectId()
  await crm.collection(COLL.deals).insertOne({
    _id, contactId: c._id, stage: o.stage ?? "requirement_shared", isOpen: o.isOpen ?? true, stageEnteredAt: NOW, stageHistory: [],
    assignedTo: o.assignedTo ?? null, productInterest: [], lastQuotation: null, createdAt: NOW, updatedAt: NOW,
  })
  return { dealId: _id, contact: c }
}
const draft = async (crm, dealId, lines = [LINE], terms) => {
  const r = await createDraft(crm, ACTOR, ALL, dealId, { lines: parseQuoteInput({ lines }, { requireLines: true }).input.lines, ...(terms ? { terms } : {}) }, { now: NOW })
  assert.ok(r.ok, JSON.stringify(r))
  return r.quotation
}

// ───────────────────────── pure ─────────────────────────
test("money: half-up GST per line, totals add up, CGST/SGST split, Indian grouping, amount in words", () => {
  assert.equal(gstOf(333, 18), 60, "59.94 -> 60")
  assert.equal(gstOf(250, 18), 45)
  assert.equal(gstOf(25, 18), 5, "4.5 -> 5 (half-up)")
  assert.equal(gstOf(1_000_000_000_000, 28), 280_000_000_000)
  const l = computeLine(LINE)
  assert.deepEqual([l.taxable, l.gst, l.lineTotal], [4100000, 738000, 4838000])
  const t = totalsOf([l, computeLine({ ...LINE, qty: 1, unitPrice: 333, gstRate: 5 })])
  assert.deepEqual(t, { taxable: 4100333, gst: 738017, grandTotal: 4838350 })
  assert.deepEqual(splitGst(738017), { cgst: 369008, sgst: 369009 })
  assert.equal(formatInr(12345678), "1,23,456.78")
  assert.equal(formatInr(4838000), "48,380.00")
  assert.equal(formatInr(99), "0.99")
  assert.equal(formatInr(1234567890123, { decimals: false }), "12,34,56,78,901")
  assert.equal(amountInWords(4838050), "Rupees Forty Eight Thousand Three Hundred Eighty and Fifty Paise Only")
  assert.equal(amountInWords(1_23_45_678_00), "Rupees One Crore Twenty Three Lakh Forty Five Thousand Six Hundred Seventy Eight Only")
  assert.equal(amountInWords(0), "Rupees Zero Only")
  assert.equal(amountInWords(5), "Rupees Five Paise Only")
})

test("numbering: FY flips at 1 April 00:00 IST; format, revision label, file name", () => {
  assert.equal(fyOf(new Date("2026-03-31T18:29:59Z")), "2025-26", "31 Mar 23:59:59 IST")
  assert.equal(fyOf(new Date("2026-03-31T18:30:00Z")), "2026-27", "1 Apr 00:00 IST")
  assert.equal(fyOf(new Date("2027-01-15T00:00:00Z")), "2026-27")
  assert.equal(fyOf(new Date("2099-12-31T00:00:00Z")), "2099-00")
  assert.equal(formatQuoteNumber("2026-27", 1), "100X/QT/2026-27/0001")
  assert.equal(formatQuoteNumber("2026-27", 12345), "100X/QT/2026-27/12345")
  assert.equal(quoteLabel("100X/QT/2026-27/0001", 1), "100X/QT/2026-27/0001")
  assert.equal(quoteLabel("100X/QT/2026-27/0001", 3), "100X/QT/2026-27/0001 Rev 3")
  assert.equal(quoteLabel(null, 1), "Draft")
  assert.equal(quoteFilename("100X/QT/2026-27/0001", 2), "Quotation-100X-QT-2026-27-0001-Rev2.pdf")
})

test("input: required / unknown / prototype keys, enums, bounds, caps, terms defaults", () => {
  const p = b => parseQuoteInput(b, { requireLines: true })
  assert.deepEqual(p({}).fields, { lines: "required" })
  assert.equal(p({ lines: [LINE] }).ok, true)
  assert.equal(p({ lines: [LINE], extra: 1 }).fields.extra, "unknown_field")
  assert.equal(p(JSON.parse('{"lines":[],"__proto__":{"x":1}}')).fields.__proto__, "unknown_field")
  const f = p({ lines: [{ ...LINE, qty: 0, gstRate: 7, hsn: "12", productSlug: "Bad Slug", model: "" }] }).fields
  assert.deepEqual([f["lines.0.qty"], f["lines.0.gstRate"], f["lines.0.hsn"], f["lines.0.productSlug"], f["lines.0.model"]], ["invalid_number", "invalid_enum", "invalid", "invalid", "required"])
  assert.equal(p({ lines: [{ ...LINE, unitPrice: 12.5 }] }).fields["lines.0.unitPrice"], "invalid_number", "paise are integers")
  assert.equal(p({ lines: [{ ...LINE, qty: 100000, unitPrice: 10_000_000_000 }] }).fields["lines.0.unitPrice"], "line_too_large")
  assert.equal(p({ lines: [{ ...LINE, colour: "red" }] }).fields["lines.0.colour"], "unknown_field")
  assert.equal(p({ lines: Array(51).fill(LINE) }).fields.lines, "too_many")
  const t = p({ lines: [LINE], terms: { payment: "50% advance" } })
  assert.deepEqual(t.input.terms, { ...DEFAULT_TERMS, payment: "50% advance" })
  assert.equal(p({ lines: [LINE], terms: { validityDays: 0 } }).fields["terms.validityDays"], "invalid_number")
  assert.equal(parseQuoteInput({}, { requireLines: false }).fields.body, "empty")
})

// ───────────────────────── life cycle ─────────────────────────
test("draft: no number; update recomputes totals; discard only drafts; issued quotations can never be discarded", async t => {
  if (!need(t)) return
  const crm = await txCrm()
  const { dealId } = await seedDeal(crm)
  const q = await draft(crm, dealId)
  assert.equal(q.status, "draft"); assert.equal(q.quoteNumber, null); assert.equal(q.version, 1)
  assert.equal(q.totals.grandTotal, 4838000)
  const u = await updateDraft(crm, ACTOR, ALL, q._id, { lines: [computeLineInput({ ...LINE, qty: 3 })] }, { now: NOW })
  assert.equal(u.ok, true); assert.equal(u.quotation.totals.grandTotal, 7257000)
  assert.equal((await all(crm, COLL.quotations))[0].totals.grandTotal, 7257000)
  const d2 = await draft(crm, dealId)
  assert.equal((await discardDraft(crm, ACTOR, ALL, d2._id)).ok, true)
  assert.equal(await count(crm, COLL.quotations), 1)
  await issueQuotation(crm, ACTOR, ALL, q._id, { now: NOW })
  const x = await discardDraft(crm, ACTOR, ALL, q._id)
  assert.deepEqual([x.ok, x.status, x.error], [false, 409, "not_draft"])
  assert.equal((await updateDraft(crm, ACTOR, ALL, q._id, { terms: DEFAULT_TERMS })).error, "not_draft")
  assert.equal(await count(crm, COLL.quotations), 1)
})
function computeLineInput(l) { return l }

test("issue: gapless numbers per FY, counter row, deal.lastQuotation, activity + audit; issuing twice -> 409", async t => {
  if (!need(t)) return
  const crm = await txCrm()
  const { dealId } = await seedDeal(crm)
  const a = await draft(crm, dealId)
  const b = await draft(crm, dealId)
  const ra = await issueQuotation(crm, ACTOR, ALL, a._id, { now: NOW })
  assert.equal(ra.ok, true); assert.equal(ra.quotation.quoteNumber, "100X/QT/2026-27/0001"); assert.equal(ra.quotation.status, "issued")
  assert.equal(ra.quotation.issuedBy.userId, "u1")
  assert.equal((await issueQuotation(crm, ACTOR, ALL, b._id, { now: NOW })).quotation.quoteNumber, "100X/QT/2026-27/0002")
  const again = await issueQuotation(crm, ACTOR, ALL, a._id, { now: NOW })
  assert.deepEqual([again.status, again.error], [409, "not_draft"])
  const [ctr] = await all(crm, COLL.counters)
  assert.equal(ctr._id, "fogging:quotation:2026-27"); assert.equal(ctr.seq, 2)
  const deal = (await all(crm, COLL.deals))[0]
  assert.equal(deal.lastQuotation.quoteNumber, "100X/QT/2026-27/0002"); assert.equal(deal.lastQuotation.sentAt, null); assert.equal(deal.lastQuotation.grandTotal, 4838000)
  assert.equal(await count(crm, COLL.activities, { kind: "quotation_issued" }), 2)
  const aud = await all(crm, COLL.audit, { action: "quotation.issue" })
  assert.equal(aud.length, 2); assert.ok(!JSON.stringify(aud).includes("Thermal fogger"), "no line text in audit")
  // next FY starts at 0001 again
  const c = await draft(crm, dealId)
  const next = await issueQuotation(crm, ACTOR, ALL, c._id, { now: new Date("2027-04-01T00:00:00+05:30") })
  assert.equal(next.quotation.quoteNumber, "100X/QT/2027-28/0001")
})

test("issue under concurrency: two drafts -> two distinct consecutive numbers; the SAME draft twice -> exactly one issue and no gap", async t => {
  if (!need(t)) return
  const crm = await txCrm()
  const { dealId } = await seedDeal(crm)
  const a = await draft(crm, dealId); const b = await draft(crm, dealId)
  const [ra, rb] = await Promise.all([issueQuotation(crm, ACTOR, ALL, a._id, { now: NOW }), issueQuotation(crm, ACTOR, ALL, b._id, { now: NOW })])
  assert.ok(ra.ok && rb.ok)
  assert.deepEqual([ra.quotation.quoteNumber, rb.quotation.quoteNumber].sort(), ["100X/QT/2026-27/0001", "100X/QT/2026-27/0002"])
  const c = await draft(crm, dealId)
  const res = await Promise.all([1, 2, 3].map(() => issueQuotation(crm, ACTOR, ALL, c._id, { now: NOW })))
  assert.equal(res.filter(r => r.ok).length, 1, "one winner")
  assert.ok(res.filter(r => !r.ok).every(r => r.status === 409))
  assert.equal((await all(crm, COLL.counters))[0].seq, 3, "losers' increments rolled back: no gap")
  assert.equal(res.find(r => r.ok).quotation.quoteNumber, "100X/QT/2026-27/0003")
})

test("revise: draft v2 with the same number; one revision at a time; issuing v2 supersedes v1; superseded cannot be revised", async t => {
  if (!need(t)) return
  const crm = await txCrm()
  const { dealId } = await seedDeal(crm)
  const q = await draft(crm, dealId)
  assert.equal((await reviseQuotation(crm, ACTOR, ALL, q._id)).error, "not_issued")
  await issueQuotation(crm, ACTOR, ALL, q._id, { now: NOW })
  const r = await reviseQuotation(crm, ACTOR, ALL, q._id, { now: NOW })
  assert.equal(r.ok, true)
  assert.deepEqual([r.quotation.status, r.quotation.quoteNumber, r.quotation.version], ["draft", "100X/QT/2026-27/0001", 2])
  assert.equal(String(r.quotation.revisionOf), String(q._id))
  assert.equal((await reviseQuotation(crm, ACTOR, ALL, q._id)).error, "revision_exists")
  await updateDraft(crm, ACTOR, ALL, r.quotation._id, { lines: [{ ...LINE, unitPrice: 1900000 }] }, { now: NOW })
  const i2 = await issueQuotation(crm, ACTOR, ALL, r.quotation._id, { now: NOW })
  assert.equal(i2.ok, true); assert.equal(i2.quotation.quoteNumber, "100X/QT/2026-27/0001"); assert.equal(i2.quotation.version, 2)
  const v1 = await crm.collection(COLL.quotations).findOne({ _id: q._id })
  assert.equal(v1.status, "superseded")
  assert.equal((await all(crm, COLL.counters))[0].seq, 1, "a revision allocates no new number")
  assert.equal((await reviseQuotation(crm, ACTOR, ALL, q._id)).error, "not_latest")
  assert.equal((await all(crm, COLL.deals))[0].lastQuotation.version, 2)
  assert.equal(await count(crm, COLL.quotations), 2, "superseded stays visible")
})

test("guards: closed deal -> 409; empty quotation -> 400; unknown -> 404", async t => {
  if (!need(t)) return
  const crm = await txCrm()
  const { dealId } = await seedDeal(crm, { isOpen: false, stage: "closed_lost" })
  const r = await createDraft(crm, ACTOR, ALL, dealId, { lines: [] })
  assert.deepEqual([r.status, r.error], [409, "deal_closed"])
  const open = await seedDeal(crm)
  const e = await draft(crm, open.dealId, [])
  assert.deepEqual(await issueQuotation(crm, ACTOR, ALL, e._id).then(x => [x.status, x.error]), [400, "empty_quotation"])
  const z = await draft(crm, open.dealId, [{ ...LINE, unitPrice: 0 }])
  assert.equal((await issueQuotation(crm, ACTOR, ALL, z._id)).error, "empty_quotation")
  assert.equal((await issueQuotation(crm, ACTOR, ALL, new ObjectId())).status, 404)
  // deal closed after drafting -> cannot issue
  const q = await draft(crm, open.dealId)
  await crm.collection(COLL.deals).updateOne({ _id: open.dealId }, { $set: { isOpen: false, stage: "closed_won" } })
  assert.equal((await issueQuotation(crm, ACTOR, ALL, q._id)).error, "deal_closed")
})

test("internal notes never reach a quotation: create / update / issue refuse note text (422) with an audit row and no text", async t => {
  if (!need(t)) return
  const crm = await txCrm()
  const { dealId, contact } = await seedDeal(crm)
  const NOTE = "Customer is a tough negotiator, offer 8% max discount"
  await createInternalNote(crm, { contactId: contact._id, dealId, author: { userId: "u1", name: "A" }, text: toNoteText(NOTE).text, now: NOW })
  const c = await createDraft(crm, ACTOR, ALL, dealId, { lines: [{ ...LINE, description: "  " + NOTE.toUpperCase() }] })
  assert.deepEqual([c.status, c.error], [422, "matches_internal_note"])
  const q = await draft(crm, dealId)
  const u = await updateDraft(crm, ACTOR, ALL, q._id, { terms: { ...DEFAULT_TERMS, notes: NOTE } })
  assert.equal(u.error, "matches_internal_note")
  // note written after the draft -> caught at issue
  const NOTE2 = "Margin is thin, do not go below 18k"
  await crm.collection(COLL.quotations).updateOne({ _id: q._id }, { $set: { "terms.payment": NOTE2 } })
  await createInternalNote(crm, { contactId: contact._id, dealId, author: { userId: "u1", name: "A" }, text: toNoteText(NOTE2).text, now: NOW })
  assert.equal((await issueQuotation(crm, ACTOR, ALL, q._id)).error, "matches_internal_note")
  assert.equal(await count(crm, COLL.counters), 0, "no number allocated")
  const rows = await all(crm, COLL.audit, { action: "outbound.blocked_internal_note" })
  assert.equal(rows.length, 3)
  assert.ok(!JSON.stringify(rows).includes("negotiator") && !JSON.stringify(rows).includes("18k"))
})

// ───────────────────────── API ─────────────────────────
test("API: create 201 / list / get / patch / issue / revise / discard; permissions; validation; scope -> 404", async t => {
  if (!need(t)) return
  const crm = await txCrm()
  const { dealId } = await seedDeal(crm, { assignedTo: { userId: "u1", name: "Asha" } })
  const other = await seedDeal(crm, { assignedTo: { userId: "u9", name: "X" } })
  const perms = ["crm.view", "crm.quotes.create", "crm.leads.view_all"]
  const d = (o = {}) => apiDeps(crm, { perms, ...o })
  const created = await createQuotationHandler(jreq("POST", "http://x/q", { lines: [LINE] }), reqCtx(dealId), d())
  assert.equal(created.status, 201)
  const q = (await body(created)).quotation
  assert.equal(q.label, "Draft"); assert.equal(q.totals.grandTotal, 4838000); assert.ok(q.id)
  assert.equal((await createQuotationHandler(jreq("POST", "http://x/q", { lines: [LINE] }), reqCtx(dealId), d({ perms: ["crm.view", "crm.leads.view_all"] }))).status, 403)
  const bad = await createQuotationHandler(jreq("POST", "http://x/q", { lines: [{ ...LINE, gstRate: 3 }] }), reqCtx(dealId), d())
  assert.equal(bad.status, 400); assert.equal((await body(bad)).fields["lines.0.gstRate"], "invalid_enum")
  assert.equal((await updateQuotationHandler(jreq("PATCH", "http://x/q", { terms: { payment: "100% advance" } }), reqCtx(q.id), d())).status, 200)
  const list = await body(await listDealQuotationsHandler(jreq("GET", "http://x/q"), reqCtx(dealId), d()))
  assert.equal(list.items.length, 1); assert.equal(list.items[0].terms.payment, "100% advance")
  const issued = await body(await issueQuotationHandler(jreq("POST", "http://x/i"), reqCtx(q.id), d()))
  assert.equal(issued.quotation.label, "100X/QT/2026-27/0001")
  const rev = await reviseQuotationHandler(jreq("POST", "http://x/r"), reqCtx(q.id), d())
  assert.equal(rev.status, 201)
  const revId = (await body(rev)).quotation.id
  assert.equal((await body(await getQuotationHandler(jreq("GET", "http://x/g"), reqCtx(revId), d()))).quotation.version, 2)
  assert.equal((await discardQuotationHandler(jreq("DELETE", "http://x/d"), reqCtx(revId), d())).status, 200)
  assert.equal((await discardQuotationHandler(jreq("DELETE", "http://x/d"), reqCtx(q.id), d())).status, 409)
  // assigned-scope user who does not own the deal sees 404
  const scoped = d({ perms: ["crm.view", "crm.quotes.create", "crm.leads.view_assigned"], sub: "u1" })
  assert.equal((await listDealQuotationsHandler(jreq("GET", "http://x/q"), reqCtx(other.dealId), scoped)).status, 404)
  assert.equal((await createQuotationHandler(jreq("POST", "http://x/q", { lines: [LINE] }), reqCtx(other.dealId), scoped)).status, 404)
  assert.equal((await listDealQuotationsHandler(jreq("GET", "http://x/q"), reqCtx(dealId), scoped)).status, 200)
  // afterQuoteIssue hook runs; its failure never fails the issue
  const q2 = (await body(await createQuotationHandler(jreq("POST", "http://x/q", { lines: [LINE] }), reqCtx(dealId), d()))).quotation
  const r2 = await issueQuotationHandler(jreq("POST", "http://x/i"), reqCtx(q2.id), d({ afterQuoteIssue: async () => { throw new Error("pdf boom") } }))
  assert.equal(r2.status, 200)
})

test("Checker.fail records a __proto__ field error as an own property (shared validator)", async () => {
  const { Checker } = await import("../../lib/crm/validate.ts")
  const c = new Checker()
  c.fail("__proto__", "unknown_field")
  assert.equal(c.ok, false)
  assert.deepEqual(Object.keys(c.errors), ["__proto__"])
  assert.equal(Object.getPrototypeOf(c.errors), Object.prototype, "prototype untouched")
  c.fail("__proto__", "other"); assert.equal(c.errors.__proto__, "unknown_field", "first code wins")
})
