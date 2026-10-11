// STEP 6d quotation builder logic (components/admin/crm/quoteForm.ts) and UI error texts.
import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { priceToPaise, paiseToInput, buildDraftBody, previewTotals, rowsFromQuotation, emptyLine, emptyTerms, newIdemKey } from "../../components/admin/crm/quoteForm.ts"
import { parseQuoteInput } from "../../lib/crm/quotes/input.ts"
import { computeLine, totalsOf } from "../../lib/crm/quotes/money.ts"
import { ApiError, errorText } from "../../components/admin/crm/api.ts"

test("priceToPaise: grouping, ₹, decimals; 0 allowed; invalid / too many decimals / over ₹10 crore -> null; round trip", () => {
  assert.equal(priceToPaise("20,500"), 2050000)
  assert.equal(priceToPaise("₹ 20500.5"), 2050050)
  assert.equal(priceToPaise("0"), 0)
  for (const bad of ["", "abc", "1.234", "-5", "1e5", "100000001"]) assert.equal(priceToPaise(bad), null, bad)
  assert.equal(priceToPaise("100000000"), 10_000_000_000)
  for (const p of [0, 5, 50, 2050000, 2050050, 2050055]) assert.equal(priceToPaise(paiseToInput(p)), p, String(p))
  assert.equal(paiseToInput(2050050), "20500.5")
})

test("buildDraftBody: per-field messages keyed like the server; valid form passes the SERVER parser unchanged", () => {
  const bad = buildDraftBody([{ ...emptyLine(), model: "", qty: "0", price: "x", hsn: "12" }], { ...emptyTerms(), validityDays: "0" })
  assert.equal(bad.ok, false)
  assert.deepEqual(Object.keys(bad.errors).sort(), ["lines.0.hsn", "lines.0.model", "lines.0.price", "lines.0.qty", "terms.validityDays"])
  assert.equal(buildDraftBody([], emptyTerms()).errors.lines, "Add at least one item.")
  const good = buildDraftBody([{ model: " TF-35 ", description: "Fogger", hsn: "84248990", qty: "2", price: "20,500", gstRate: 18 }], { ...emptyTerms(), payment: " 50% advance " })
  assert.equal(good.ok, true)
  const server = parseQuoteInput(good.body, { requireLines: true })
  assert.equal(server.ok, true, JSON.stringify(server.fields))
  assert.deepEqual(server.input.lines[0], { productSlug: null, model: "TF-35", description: "Fogger", hsn: "84248990", qty: 2, unitPrice: 2050000, gstRate: 18 })
  assert.equal(server.input.terms.payment, "50% advance")
})

test("previewTotals equals the server's totals for valid rows; invalid rows count as 0; rows round-trip from a quotation", () => {
  const rows = [{ model: "A", description: "", hsn: "", qty: "3", price: "333.33", gstRate: 5 }, { model: "B", description: "", hsn: "", qty: "1", price: "20500", gstRate: 18 }]
  const server = totalsOf([computeLine({ productSlug: null, model: "A", description: "", hsn: null, qty: 3, unitPrice: 33333, gstRate: 5 }), computeLine({ productSlug: null, model: "B", description: "", hsn: null, qty: 1, unitPrice: 2050000, gstRate: 18 })])
  assert.deepEqual(previewTotals(rows), server)
  assert.deepEqual(previewTotals([{ ...rows[0], price: "oops" }]), { taxable: 0, gst: 0, grandTotal: 0 })
  const back = rowsFromQuotation([{ model: "B", description: "d", hsn: null, qty: 1, unitPrice: 2050050, gstRate: 18 }])
  assert.deepEqual(back, [{ model: "B", description: "d", hsn: "", qty: "1", price: "20500.5", gstRate: 18 }])
})

test("idempotency keys match the server pattern and are unique per intent", () => {
  const a = newIdemKey("qwa"), b = newIdemKey("qwa")
  assert.match(a, /^[\w:.\-]{8,128}$/); assert.notEqual(a, b)
})

test("errorText: quotation/send codes get specific messages (503 is not always 'permissions'); prototype codes are safe", () => {
  assert.match(errorText(new ApiError(503, "whatsapp_not_configured")), /WhatsApp is not connected/)
  assert.match(errorText(new ApiError(503, "email_not_configured")), /Email sending is not configured/)
  assert.match(errorText(new ApiError(503, "permissions_unavailable")), /Permissions are temporarily unavailable/)
  assert.match(errorText(new ApiError(422, "matches_internal_note")), /internal note/)
  assert.match(errorText(new ApiError(422, "template_unknown")), /template is not set up/)
  assert.equal(errorText(new ApiError(409, "constructor")), "Something went wrong. Please try again.")
  assert.match(errorText(new ApiError(400, "validation", { to: "invalid_email" })), /valid email/)
})

test("lead detail wires the quotations panel (placeholder gone); panel never imports the notes module", () => {
  const detail = readFileSync("components/admin/crm/LeadDetail.tsx", "utf8")
  assert.ok(detail.includes("<QuotationsPanel") && !detail.includes("coming in step 6"))
  const panel = readFileSync("components/admin/crm/QuotationsPanel.tsx", "utf8") + readFileSync("components/admin/crm/quoteForm.ts", "utf8")
  assert.ok(!/notes/i.test(panel.split("\n").filter(l => /^import /.test(l)).join("\n")), "no notes import")
  assert.ok(!/from ["']mongodb["']|lib\/crm\/db|quotes\/(service|send|document|pdf)/.test(panel), "client code imports no server modules")
})
