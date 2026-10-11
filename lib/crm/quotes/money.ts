/**
 * Quotation arithmetic (DATA_MODEL §1.12). All amounts are integer paise; no floats anywhere.
 *
 * - line: taxable = qty × unitPrice; gst = taxable × rate / 100 rounded half-up to the paisa;
 *   lineTotal = taxable + gst.
 * - totals: sums of the line values (so the PDF's columns always add up).
 * - Place of supply (display only): a buyer in the seller's state gets CGST + SGST (half each, the
 *   odd paisa on SGST); anyone else IGST. The stored gst per line does not change.
 */
import type { GstRate, Paise, QuotationLine } from "../model"

/** Caps keep every intermediate product a safe integer (1e12 × 28 < 2^53). */
export const MAX_QTY = 100_000
export const MAX_UNIT_PAISE = 10_000_000_000 // ₹10 crore per unit
export const MAX_LINE_TAXABLE_PAISE = 1_000_000_000_000 // ₹1,000 crore
export const MAX_LINES = 50

export interface LineInput {
  productSlug: string | null
  model: string
  description: string
  hsn: string | null
  qty: number
  unitPrice: Paise
  gstRate: GstRate
}

export function gstOf(taxable: Paise, rate: GstRate): Paise {
  // half-up on non-negative integers: floor((taxable × rate + 50) / 100)
  return Math.floor((taxable * rate + 50) / 100)
}

export function computeLine(l: LineInput): QuotationLine {
  const taxable = l.qty * l.unitPrice
  const gst = gstOf(taxable, l.gstRate)
  return { ...l, taxable, gst, lineTotal: taxable + gst }
}

export function totalsOf(lines: readonly QuotationLine[]): { taxable: Paise; gst: Paise; grandTotal: Paise } {
  let taxable = 0
  let gst = 0
  for (const l of lines) {
    taxable += l.taxable
    gst += l.gst
  }
  return { taxable, gst, grandTotal: taxable + gst }
}

export function splitGst(gst: Paise): { cgst: Paise; sgst: Paise } {
  const cgst = Math.floor(gst / 2)
  return { cgst, sgst: gst - cgst }
}

/** "1,23,45,678.90" (Indian digit grouping), from paise. */
export function formatInr(paise: Paise, opts: { decimals?: boolean } = {}): string {
  const neg = paise < 0
  const abs = Math.abs(Math.trunc(paise))
  const rupees = Math.floor(abs / 100)
  const ps = abs % 100
  const s = String(rupees)
  const last3 = s.slice(-3)
  const rest = s.slice(0, -3)
  const grouped = rest ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3 : last3
  const out = opts.decimals === false ? grouped : `${grouped}.${String(ps).padStart(2, "0")}`
  return neg ? `-${out}` : out
}

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"]
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]

function below1000(n: number): string {
  const h = Math.floor(n / 100)
  const r = n % 100
  const parts: string[] = []
  if (h) parts.push(`${ONES[h]} Hundred`)
  if (r) parts.push(r < 20 ? ONES[r] : `${TENS[Math.floor(r / 10)]}${r % 10 ? " " + ONES[r % 10] : ""}`)
  return parts.join(" ")
}

/** "Rupees Forty Eight Thousand Three Hundred Eighty and Fifty Paise Only" (Indian system: lakh, crore). */
export function amountInWords(paise: Paise): string {
  const abs = Math.abs(Math.trunc(paise))
  let r = Math.floor(abs / 100)
  const ps = abs % 100
  if (r === 0 && ps === 0) return "Rupees Zero Only"
  const parts: string[] = []
  const crore = Math.floor(r / 10_000_000)
  r %= 10_000_000
  const lakh = Math.floor(r / 100_000)
  r %= 100_000
  const thousand = Math.floor(r / 1000)
  r %= 1000
  if (crore) parts.push(`${crore >= 1000 ? amountInWords(crore * 100).replace(/^Rupees | Only$/g, "") : below1000(crore)} Crore`)
  if (lakh) parts.push(`${below1000(lakh)} Lakh`)
  if (thousand) parts.push(`${below1000(thousand)} Thousand`)
  if (r) parts.push(below1000(r))
  const rupeeWords = parts.join(" ")
  const paiseWords = ps ? `${rupeeWords ? " and " : ""}${below1000(ps)} Paise` : ""
  return `Rupees ${rupeeWords}${paiseWords} Only`.replace(/\s+/g, " ")
}
