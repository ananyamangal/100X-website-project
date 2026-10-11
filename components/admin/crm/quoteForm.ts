// Quotation builder form logic (client-safe, pure; tested in tests/unit/crm-quotes-ui.test.mjs).
// Totals use the server's own arithmetic (lib/crm/quotes/money.ts) so the preview matches the PDF.
import { GST_RATES, type GstRate } from "@/lib/crm/model"
import { computeLine, totalsOf, MAX_UNIT_PAISE, MAX_QTY, MAX_LINES } from "@/lib/crm/quotes/money"

export { GST_RATES }

export interface LineRow {
  model: string
  description: string
  hsn: string
  qty: string
  price: string // rupees as typed, e.g. "20,500" or "20500.50"
  gstRate: GstRate
}

export interface TermsForm {
  validityDays: string
  payment: string
  delivery: string
  warranty: string
  freight: string
  notes: string
}

export const emptyLine = (): LineRow => ({ model: "", description: "", hsn: "", qty: "1", price: "", gstRate: 18 })
export const emptyTerms = (): TermsForm => ({ validityDays: "15", payment: "", delivery: "", warranty: "", freight: "", notes: "" })

/** "20,500.50" / "₹ 20500" -> paise; 0 allowed (free item); null when not a valid amount (max 2 decimals, ≤ ₹10 crore). */
export function priceToPaise(input: string): number | null {
  const s = input.replace(/[,\s₹]/g, "")
  const m = /^(\d{1,9})(?:\.(\d{1,2}))?$/.exec(s)
  if (!m) return null
  const paise = Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0") || "0")
  return paise <= MAX_UNIT_PAISE ? paise : null
}

/** Paise -> "20500.5" style input text (no grouping, trailing zeros trimmed). */
export function paiseToInput(paise: number): string {
  const r = Math.floor(paise / 100)
  const p = paise % 100
  return p ? `${r}.${String(p).padStart(2, "0").replace(/0$/, "")}` : String(r)
}

export type DraftBody = { lines: Record<string, unknown>[]; terms: Record<string, unknown> }
export type BuildResult = { ok: true; body: DraftBody } | { ok: false; errors: Record<string, string> }

/** Form -> POST/PATCH body (paise integers), or per-field messages keyed like the server ("lines.0.qty"). */
export function buildDraftBody(rows: LineRow[], terms: TermsForm): BuildResult {
  const errors: Record<string, string> = {}
  if (rows.length === 0) errors.lines = "Add at least one item."
  if (rows.length > MAX_LINES) errors.lines = `At most ${MAX_LINES} items.`
  const lines = rows.map((r, i) => {
    const model = r.model.trim()
    if (!model) errors[`lines.${i}.model`] = "Enter the model / item name."
    const qty = /^\d+$/.test(r.qty.trim()) ? Number(r.qty.trim()) : NaN
    if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) errors[`lines.${i}.qty`] = `Quantity must be 1 to ${MAX_QTY.toLocaleString("en-IN")}.`
    const unitPrice = priceToPaise(r.price)
    if (unitPrice === null) errors[`lines.${i}.price`] = "Enter the rate in rupees, e.g. 20500 or 20500.50."
    const hsn = r.hsn.trim()
    if (hsn && !/^\d{4,8}$/.test(hsn)) errors[`lines.${i}.hsn`] = "HSN is 4 to 8 digits."
    return { model, description: r.description.trim(), ...(hsn ? { hsn } : {}), qty, unitPrice: unitPrice ?? 0, gstRate: r.gstRate }
  })
  const vd = /^\d+$/.test(terms.validityDays.trim()) ? Number(terms.validityDays.trim()) : NaN
  if (!Number.isInteger(vd) || vd < 1 || vd > 365) errors["terms.validityDays"] = "Validity is 1 to 365 days."
  if (Object.keys(errors).length) return { ok: false, errors }
  return {
    ok: true,
    body: {
      lines,
      terms: { validityDays: vd, payment: terms.payment.trim(), delivery: terms.delivery.trim(), warranty: terms.warranty.trim(), freight: terms.freight.trim(), notes: terms.notes.trim() },
    },
  }
}

/** Live totals for the builder (invalid rows count as 0). */
export function previewTotals(rows: LineRow[]): { taxable: number; gst: number; grandTotal: number } {
  const lines = rows.map(r => {
    const qty = /^\d+$/.test(r.qty.trim()) ? Math.min(Number(r.qty.trim()), MAX_QTY) : 0
    return computeLine({ productSlug: null, model: "", description: "", hsn: null, qty, unitPrice: priceToPaise(r.price) ?? 0, gstRate: r.gstRate })
  })
  return totalsOf(lines)
}

/** Server quotation -> form rows (for editing a draft). */
export function rowsFromQuotation(lines: { model: string; description: string; hsn: string | null; qty: number; unitPrice: number; gstRate: GstRate }[]): LineRow[] {
  return lines.map(l => ({ model: l.model, description: l.description, hsn: l.hsn ?? "", qty: String(l.qty), price: paiseToInput(l.unitPrice), gstRate: l.gstRate }))
}

/** Client idempotency key (one per user intent; reused when retrying the same action). */
export function newIdemKey(prefix: string): string {
  const rnd = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `${prefix}-${rnd}`.replace(/[^\w:.\-]/g, "").slice(0, 120)
}
