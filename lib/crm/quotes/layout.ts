/**
 * Quotation document model (pure): everything the PDF prints, as strings, in order. The renderer
 * (./pdf.ts) only draws this, so the content is unit-testable without parsing a PDF.
 *
 * Seller details: published company identity (lib/seo/site-config BUSINESS, owner-confirmed) as
 * defaults; GSTIN, bank details and signatory come only from crm_settings.quotation and are left
 * out when not set — never invented. The owner's letterhead template is still pending.
 */
import { BUSINESS } from "../../seo/site-config"
import type { QuotationLine } from "../model"
import { amountInWords, formatInr, splitGst } from "./money"
import { quoteLabel } from "./numbering"
import type { QuoteTerms } from "./input"

export interface SellerSettings {
  legalName?: string
  gstin?: string
  addressLines?: string[]
  state?: string
  phone?: string
  email?: string
  bank?: { name?: string; account?: string; ifsc?: string; branch?: string }
  signatory?: string
}

export interface Seller {
  legalName: string
  addressLines: string[]
  state: string
  gstin: string | null
  phone: string
  email: string
  bank: { name?: string; account?: string; ifsc?: string; branch?: string } | null
  signatory: string | null
}

const clean = (s: unknown, max = 200): string | null => (typeof s === "string" && s.trim() ? s.trim().slice(0, max) : null)

export function sellerFrom(settings: SellerSettings | null | undefined): Seller {
  const s = settings ?? {}
  const lines = Array.isArray(s.addressLines) ? s.addressLines.map(l => clean(l)).filter((l): l is string => !!l).slice(0, 4) : []
  const bank = s.bank && typeof s.bank === "object" ? s.bank : null
  const bankClean = bank
    ? Object.fromEntries(Object.entries({ name: clean(bank.name), account: clean(bank.account, 40), ifsc: clean(bank.ifsc, 20), branch: clean(bank.branch) }).filter(([, v]) => v))
    : null
  return {
    legalName: clean(s.legalName) ?? "100X Circle Private Limited",
    addressLines: lines.length ? lines : [BUSINESS.streetAddress, `${BUSINESS.addressLocality}, ${BUSINESS.addressRegion} ${BUSINESS.postalCode}`],
    state: clean(s.state, 60) ?? BUSINESS.addressRegion,
    gstin: clean(s.gstin, 15),
    phone: clean(s.phone, 40) ?? BUSINESS.phonePrimary,
    email: clean(s.email, 120) ?? BUSINESS.email,
    bank: bankClean && Object.keys(bankClean).length ? bankClean : null,
    signatory: clean(s.signatory, 80),
  }
}

export interface BuyerInput {
  name: string | null
  company: string | null
  city: string | null
  state: string | null
  phoneE164: string | null
  email: string | null
}

export interface QuotationForLayout {
  quoteNumber: string | null
  version: number
  status: string
  issuedAt: Date | null
  createdAt: Date
  lines: QuotationLine[]
  totals: { taxable: number; gst: number; grandTotal: number }
  terms: QuoteTerms
}

export interface Layout {
  title: string
  watermark: string | null
  seller: { name: string; lines: string[] }
  meta: [string, string][]
  buyer: { heading: string; lines: string[] }
  table: { head: string[]; rows: string[][] }
  tax: [string, string][]
  grandTotal: [string, string]
  amountInWords: string
  terms: [string, string][]
  bank: string[]
  footer: string[]
  /** For PDF metadata. */
  info: { title: string; createdAt: Date }
}

const DAY = 86_400_000
const IST = 5.5 * 3600_000
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/** "10 Oct 2026" in IST. */
export function istDate(d: Date): string {
  const t = new Date(d.getTime() + IST)
  return `${t.getUTCDate()} ${MONTHS[t.getUTCMonth()]} ${t.getUTCFullYear()}`
}

export const validUntilOf = (from: Date, days: number): Date => new Date(from.getTime() + days * DAY)

const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase().replace(/\s+/g, " ")

/** Display phone: +91 98765 43210 for Indian mobiles, else the E.164 string. */
function phoneDisplay(e164: string | null): string | null {
  if (!e164) return null
  const m = /^\+91(\d{5})(\d{5})$/.exec(e164)
  return m ? `+91 ${m[1]} ${m[2]}` : e164
}

export function buildLayout(q: QuotationForLayout, buyer: BuyerInput, seller: Seller): Layout {
  const issued = q.status !== "draft" && q.quoteNumber
  const date = q.issuedAt ?? q.createdAt
  const label = issued ? quoteLabel(q.quoteNumber, q.version) : "DRAFT (not issued)"
  const intra = !!buyer.state && norm(buyer.state) === norm(seller.state)
  const stateKnown = !!buyer.state

  const meta: [string, string][] = [
    ["Quotation No.", label],
    ["Date", istDate(date)],
    ["Valid until", istDate(validUntilOf(date, q.terms.validityDays))],
  ]
  if (q.version > 1 && issued) meta.push(["Revision", `Rev ${q.version}`])

  const buyerLines = [
    buyer.company,
    buyer.name && buyer.company ? `Attn: ${buyer.name}` : buyer.name,
    [buyer.city, buyer.state].filter(Boolean).join(", ") || null,
    phoneDisplay(buyer.phoneE164),
    buyer.email,
  ].filter((l): l is string => !!l && l.trim() !== "")

  const rows = q.lines.map((l, i) => [
    String(i + 1),
    [l.model, l.description].filter(Boolean).join("\n"),
    l.hsn ?? "",
    String(l.qty),
    formatInr(l.unitPrice),
    `${l.gstRate}%`,
    formatInr(l.taxable),
    formatInr(l.lineTotal),
  ])

  const tax: [string, string][] = [["Taxable value", `₹ ${formatInr(q.totals.taxable)}`]]
  if (!stateKnown) tax.push(["GST", `₹ ${formatInr(q.totals.gst)}`])
  else if (intra) {
    const { cgst, sgst } = splitGst(q.totals.gst)
    tax.push(["CGST", `₹ ${formatInr(cgst)}`], ["SGST", `₹ ${formatInr(sgst)}`])
  } else tax.push(["IGST", `₹ ${formatInr(q.totals.gst)}`])

  const t = q.terms
  const terms: [string, string][] = (
    [
      ["Validity", `${t.validityDays} days from the quotation date`],
      ["Payment", t.payment],
      ["Delivery", t.delivery],
      ["Warranty", t.warranty],
      ["Freight", t.freight],
      ["Notes", t.notes],
    ] as [string, string][]
  ).filter(([, v]) => v && v.trim() !== "")
  if (stateKnown) terms.push(["Place of supply", buyer.state as string])

  const bank: string[] = []
  if (seller.bank) {
    const b = seller.bank
    if (b.name) bank.push(`Bank: ${b.name}`)
    if (b.account) bank.push(`A/c No.: ${b.account}`)
    if (b.ifsc) bank.push(`IFSC: ${b.ifsc}`)
    if (b.branch) bank.push(`Branch: ${b.branch}`)
  }

  const sellerLines = [...seller.addressLines, `Phone: ${seller.phone}  ·  ${seller.email}`]
  if (seller.gstin) sellerLines.push(`GSTIN: ${seller.gstin}`)

  return {
    title: "QUOTATION",
    watermark: issued ? null : "DRAFT",
    seller: { name: seller.legalName, lines: sellerLines },
    meta,
    buyer: { heading: "To", lines: buyerLines.length ? buyerLines : ["(customer details not recorded)"] },
    table: { head: ["#", "Item", "HSN", "Qty", "Rate (₹)", "GST", "Taxable (₹)", "Amount (₹)"], rows },
    tax,
    grandTotal: ["Grand total (incl. GST)", `₹ ${formatInr(q.totals.grandTotal)}`],
    amountInWords: amountInWords(q.totals.grandTotal),
    terms,
    bank,
    footer: [
      seller.signatory ? `For ${seller.legalName} — ${seller.signatory}` : `For ${seller.legalName}`,
      "This is a computer-generated quotation.",
    ],
    info: { title: issued ? `Quotation ${label}` : "Quotation draft", createdAt: date },
  }
}
