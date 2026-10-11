/**
 * Quotation draft input (POST / PATCH bodies). Amounts are integer paise. Unknown keys are refused,
 * prototype keys too. Field errors use dotted paths: "lines.2.qty", "terms.payment".
 */
import { GST_RATES, type GstRate } from "../model"
import { Checker, isPlainObject, type FieldErrors } from "../validate"
import { MAX_LINES, MAX_LINE_TAXABLE_PAISE, MAX_QTY, MAX_UNIT_PAISE, type LineInput } from "./money"

export interface QuoteTerms {
  validityDays: number
  payment: string
  delivery: string
  warranty: string
  freight: string
  notes: string
}

/** Validity only; commercial terms start empty and are filled by sales (never invented here). */
export const DEFAULT_TERMS: QuoteTerms = { validityDays: 15, payment: "", delivery: "", warranty: "", freight: "", notes: "" }

export interface QuoteInput {
  lines?: LineInput[]
  terms?: QuoteTerms
}

const LINE_KEYS = new Set(["productSlug", "model", "description", "hsn", "qty", "unitPrice", "gstRate"])
const TERM_KEYS = new Set(["validityDays", "payment", "delivery", "warranty", "freight", "notes"])
const TOP_KEYS = new Set(["lines", "terms"])
const RATE_SET: ReadonlySet<number> = new Set(GST_RATES)
const PROTO = new Set(["__proto__", "constructor", "prototype"])

function own(o: Record<string, unknown>, k: string): unknown {
  return Object.hasOwn(o, k) ? o[k] : undefined
}

function badKeys(o: Record<string, unknown>, allowed: ReadonlySet<string>): string[] {
  return Object.getOwnPropertyNames(o).filter(k => !allowed.has(k) || PROTO.has(k))
}

export type QuoteParse = { ok: true; input: QuoteInput } | { ok: false; fields: FieldErrors }

/** `require` = POST semantics (lines required); PATCH accepts either key. */
export function parseQuoteInput(body: Record<string, unknown>, opts: { requireLines: boolean }): QuoteParse {
  const fields: FieldErrors = {}
  // Object.hasOwn, not `in`: "__proto__" in {} is true, which would silently drop that error.
  const fail = (k: string, code: string) => { if (!Object.hasOwn(fields, k)) Object.defineProperty(fields, k, { value: code, enumerable: true, writable: true, configurable: true }) }
  for (const k of badKeys(body, TOP_KEYS)) fail(k, "unknown_field")
  const input: QuoteInput = {}

  const rawLines = own(body, "lines")
  if (rawLines === undefined) {
    if (opts.requireLines) fail("lines", "required")
  } else if (!Array.isArray(rawLines)) fail("lines", "invalid")
  else if (rawLines.length > MAX_LINES) fail("lines", "too_many")
  else {
    const lines: LineInput[] = []
    rawLines.forEach((raw, i) => {
      const p = `lines.${i}`
      if (!isPlainObject(raw)) return fail(p, "invalid")
      for (const k of badKeys(raw, LINE_KEYS)) fail(`${p}.${k}`, "unknown_field")
      const c = new Checker()
      const model = c.str(raw, "model", 80, { required: true })
      const description = c.str(raw, "description", 500, { multiline: true }) ?? ""
      const productSlug = c.str(raw, "productSlug", 120)
      if (productSlug !== null && !/^[a-z0-9][a-z0-9-]*$/.test(productSlug)) c.fail("productSlug", "invalid")
      const hsn = c.str(raw, "hsn", 8)
      if (hsn !== null && !/^\d{4,8}$/.test(hsn)) c.fail("hsn", "invalid")
      const qtyRaw = own(raw, "qty")
      if (qtyRaw === undefined || qtyRaw === null || qtyRaw === "") c.fail("qty", "required")
      const qty = c.int(raw, "qty", 1, MAX_QTY)
      const upRaw = own(raw, "unitPrice")
      if (upRaw === undefined || upRaw === null || upRaw === "") c.fail("unitPrice", "required")
      const unitPrice = c.int(raw, "unitPrice", 0, MAX_UNIT_PAISE)
      const gr = own(raw, "gstRate")
      const gstRate = typeof gr === "number" && RATE_SET.has(gr) ? (gr as GstRate) : null
      if (gstRate === null) c.fail("gstRate", gr === undefined ? "required" : "invalid_enum")
      if (qty !== null && unitPrice !== null && qty * unitPrice > MAX_LINE_TAXABLE_PAISE) c.fail("unitPrice", "line_too_large")
      for (const [k, code] of Object.entries(c.errors)) fail(`${p}.${k}`, code)
      if (c.ok && model !== null && qty !== null && unitPrice !== null && gstRate !== null) {
        lines.push({ productSlug, model, description, hsn, qty, unitPrice, gstRate })
      }
    })
    input.lines = lines
  }

  const rawTerms = own(body, "terms")
  if (rawTerms !== undefined) {
    if (!isPlainObject(rawTerms)) fail("terms", "invalid")
    else {
      for (const k of badKeys(rawTerms, TERM_KEYS)) fail(`terms.${k}`, "unknown_field")
      const c = new Checker()
      const validityDays = c.int(rawTerms, "validityDays", 1, 365) ?? DEFAULT_TERMS.validityDays
      const t: QuoteTerms = {
        validityDays,
        payment: c.str(rawTerms, "payment", 300, { multiline: true }) ?? "",
        delivery: c.str(rawTerms, "delivery", 300, { multiline: true }) ?? "",
        warranty: c.str(rawTerms, "warranty", 300, { multiline: true }) ?? "",
        freight: c.str(rawTerms, "freight", 300, { multiline: true }) ?? "",
        notes: c.str(rawTerms, "notes", 1500, { multiline: true }) ?? "",
      }
      for (const [k, code] of Object.entries(c.errors)) fail(`terms.${k}`, code)
      input.terms = t
    }
  }
  if (!opts.requireLines && input.lines === undefined && input.terms === undefined && Object.keys(fields).length === 0) fail("body", "empty")
  return Object.keys(fields).length ? { ok: false, fields } : { ok: true, input }
}

/** Every free text that ends up in the PDF (for the internal-note tripwire). */
export function quoteTexts(lines: readonly { model: string; description: string }[], terms: QuoteTerms): string[] {
  const out: string[] = []
  for (const l of lines) out.push(l.model, l.description)
  out.push(terms.payment, terms.delivery, terms.warranty, terms.freight, terms.notes)
  return out.filter(s => s.trim() !== "")
}
