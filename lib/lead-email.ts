/**
 * Builds the admin notification e-mail for a new lead from EVERY field of the saved
 * document, so a form that adds a field never silently drops it from the e-mail again.
 *
 * Used by /api/submissions, /api/rfq-submit, /api/rfq-popup/submit and /api/brochure-leads.
 *
 * Rules:
 *  - skips `_id`, the honeypot fields, internal bookkeeping and empty values;
 *  - known contact/business fields first, then everything else, then page / attribution
 *    metadata, then the submission time in IST and the Mongo id;
 *  - one-level nested objects (utm, attribution, answers…) become "Parent · key" rows;
 *  - labels are humanised; every value is HTML-escaped and capped at MAX_VALUE_CHARS;
 *  - the plain-text part mirrors the HTML table line for line.
 */

export const MAX_VALUE_CHARS = 2000

const SKIP_KEYS: ReadonlySet<string> = new Set([
  "_id",
  // honeypot fields (see stripBotFields in /api/submissions and the rfq routes)
  "website",
  "company_website",
  "hp",
  "url",
  // internal bookkeeping written by the routes themselves
  "emailStatus",
])

// Known fields, in the order they should appear.
const KNOWN_FIRST: readonly string[] = [
  "name",
  "company",
  "organization",
  "mobile",
  "phone",
  "email",
  "state",
  "city",
  "cityState",
  "intent",
  "type",
  "source",
  "subject",
  "message",
  "requirement",
  "description",
  "product",
  "productName",
  "quantity",
]

// Metadata fields, shown after everything else, in this order.
const META_LAST: readonly string[] = [
  "pageUrl",
  "form_page_url",
  "pagePath",
  "form_page_path",
  "location_label",
  "landingPage",
  "firstPageVisited",
  "sessionPageCount",
  "referrer",
  "entryReferrer",
  "utmSource",
  "utmMedium",
  "utmCampaign",
  "utmTerm",
  "utm",
  "attribution",
  "device",
  "userAgent",
]

const LABELS: Readonly<Record<string, string>> = {
  name: "Name",
  company: "Company",
  organization: "Organization",
  mobile: "Mobile",
  phone: "Phone",
  email: "Email",
  state: "State",
  city: "City",
  cityState: "City / State",
  intent: "Intent",
  type: "Type",
  source: "Source",
  subject: "Subject",
  message: "Message",
  requirement: "Requirement",
  description: "Description",
  product: "Product",
  productName: "Product",
  quantity: "Quantity",
  gemAuthRequired: "GeM authorisation required",
  dealerInquiry: "Dealer inquiry",
  uploadUrl: "Upload",
  uploadName: "Upload file name",
  uploadSizeBytes: "Upload size (bytes)",
  attachmentUrl: "Attachment",
  brochureType: "Brochure type",
  brochureName: "Brochure",
  isConverted: "Converted (has an RFQ)",
  score: "Lead score",
  downloadCount: "Downloads",
  answers: "Answers",
  pageUrl: "Page URL",
  form_page_url: "Page URL",
  pagePath: "Page path",
  form_page_path: "Page path",
  location_label: "Form location",
  landingPage: "Landing page",
  firstPageVisited: "First page visited",
  sessionPageCount: "Pages in session",
  referrer: "Referrer",
  entryReferrer: "Entry referrer",
  utmSource: "UTM source",
  utmMedium: "UTM medium",
  utmCampaign: "UTM campaign",
  utmTerm: "UTM term",
  utm: "UTM",
  attribution: "Attribution",
  device: "Device",
  userAgent: "User agent",
  createdAt: "Submitted (IST)",
  gclid: "Google click id (gclid)",
  fbclid: "Facebook click id (fbclid)",
}

export function humanizeKey(key: string): string {
  if (LABELS[key]) return LABELS[key]
  const spaced = key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
  if (!spaced) return key
  const lower = spaced.toLowerCase()
  const upper = lower.replace(/\b(utm|gem|id|url|rfq|oem|gst|kyc|seo|ip)\b/g, (m) => m.toUpperCase())
  return upper.charAt(0).toUpperCase() + upper.slice(1)
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;")
}

export function formatIst(iso: string | Date): string {
  const d = iso instanceof Date ? iso : new Date(iso)
  if (Number.isNaN(d.getTime())) return String(iso)
  return `${d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour12: false, year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" })} IST`
}

function isEmpty(v: unknown): boolean {
  if (v === undefined || v === null) return true
  if (typeof v === "string") return v.trim() === ""
  if (Array.isArray(v)) return v.length === 0 || v.every(isEmpty)
  if (typeof v === "object") return Object.values(v as Record<string, unknown>).every(isEmpty)
  return false
}

function cap(s: string): string {
  return s.length > MAX_VALUE_CHARS ? s.slice(0, MAX_VALUE_CHARS - 1) + "…" : s
}

function formatScalar(v: unknown): string {
  if (typeof v === "boolean") return v ? "Yes" : "No"
  if (typeof v === "number" || typeof v === "bigint") return String(v)
  if (typeof v === "string") return v.trim()
  if (v instanceof Date) return formatIst(v)
  if (Array.isArray(v)) return v.filter((x) => !isEmpty(x)).map((x) => (typeof x === "object" && x !== null ? JSON.stringify(x) : formatScalar(x))).join(", ")
  if (typeof v === "object" && v !== null) return JSON.stringify(v)
  return String(v)
}

export interface LeadEmailRow {
  key: string
  label: string
  value: string
}

export interface LeadEmailInput {
  /** Heading shown in the HTML part, e.g. "New website lead". */
  title: string
  /** The document as saved to MongoDB (any shape). */
  record: Record<string, unknown>
  /** Mongo _id of the saved document, shown last. */
  id?: string | null
  /** Optional intro line under the heading (plain text; escaped for HTML). */
  intro?: string
  /** Optional extra HTML appended after the table (already escaped by the caller). */
  extraHtml?: string
}

/** Flattens the record into ordered, labelled, capped rows. Exported for tests. */
export function leadRows(record: Record<string, unknown>, id?: string | null): LeadEmailRow[] {
  const entries = Object.entries(record).filter(([k, v]) => !SKIP_KEYS.has(k) && !isEmpty(v))
  const keys = entries.map(([k]) => k)
  const known = KNOWN_FIRST.filter((k) => keys.includes(k))
  const meta = META_LAST.filter((k) => keys.includes(k))
  const rest = keys.filter((k) => !known.includes(k) && !meta.includes(k) && k !== "createdAt")
  const ordered = [...known, ...rest, ...meta]

  const rows: LeadEmailRow[] = []
  for (const key of ordered) {
    const value = record[key]
    if (value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date)) {
      // one level of nesting: utm, attribution, answers …
      const parentLabel = humanizeKey(key)
      for (const [subKey, subValue] of Object.entries(value as Record<string, unknown>)) {
        if (SKIP_KEYS.has(subKey) || isEmpty(subValue)) continue
        rows.push({ key: `${key}.${subKey}`, label: `${parentLabel} · ${humanizeKey(subKey)}`, value: cap(formatScalar(subValue)) })
      }
      continue
    }
    rows.push({ key, label: humanizeKey(key), value: cap(formatScalar(value)) })
  }
  if (!isEmpty(record.createdAt)) {
    rows.push({ key: "createdAt", label: LABELS.createdAt, value: formatIst(record.createdAt as string | Date) })
  }
  if (id) rows.push({ key: "_id", label: "Database id", value: String(id) })
  return rows
}

export function buildLeadEmail(input: LeadEmailInput): { text: string; html: string; rows: LeadEmailRow[] } {
  const rows = leadRows(input.record, input.id)
  const width = Math.min(28, Math.max(8, ...rows.map((r) => r.label.length)))
  const textLines = [input.title, ...(input.intro ? [input.intro] : []), ""]
  for (const r of rows) {
    const [first, ...more] = r.value.split("\n")
    textLines.push(`${(r.label + ":").padEnd(width + 1)} ${first}`)
    for (const line of more) textLines.push(`${" ".repeat(width + 2)}${line}`)
  }
  const text = textLines.join("\n")

  const tr = rows
    .map(
      (r) =>
        `<tr><td style="padding:6px 12px;background:#f3f4f6;font-weight:600;width:200px;vertical-align:top">${escapeHtml(r.label)}</td>` +
        `<td style="padding:6px 12px;white-space:pre-wrap;word-break:break-word">${linkify(escapeHtml(r.value))}</td></tr>`,
    )
    .join("\n        ")
  const html = `
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:680px;color:#111827">
      <h2 style="color:#16a34a;margin:0 0 8px">${escapeHtml(input.title)}</h2>
      ${input.intro ? `<p style="margin:0 0 16px;color:#6b7280;font-size:13px">${escapeHtml(input.intro)}</p>` : ""}
      <table style="border-collapse:collapse;width:100%;border:1px solid #e5e7eb;font-size:14px">
        ${tr}
      </table>
      ${input.extraHtml ?? ""}
    </div>
  `
  return { text, html, rows }
}

// Turns an already-escaped http(s) URL into a clickable link (admin convenience).
function linkify(escaped: string): string {
  return /^https?:\/\/[^\s<>"']+$/.test(escaped) ? `<a href="${escaped}">${escaped}</a>` : escaped
}

/**
 * Subject in the agreed shape: "<prefix> — <name> (<company>) — <source/type>".
 * Missing parts are dropped rather than shown as "undefined".
 */
export function leadSubject(prefix: string, record: Record<string, unknown>, tail?: string): string {
  const str = (k: string) => (typeof record[k] === "string" && (record[k] as string).trim() ? (record[k] as string).trim() : "")
  const name = str("name") || "website lead"
  const company = str("company") || str("organization")
  const kind = tail ?? (str("source") || str("type") || str("product") || str("productName"))
  return `${prefix} — ${name}${company ? ` (${company})` : ""}${kind ? ` — ${kind}` : ""}`
}
