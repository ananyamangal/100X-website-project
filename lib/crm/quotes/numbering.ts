/**
 * Gapless quotation numbering (DATA_MODEL §1.12).
 * Counter `_id = "<workspace>:quotation:<FY>"`; FY runs April–March in IST, written "2026-27".
 * Numbers are allocated only at issue, inside the issue transaction (lib/crm/quotes/service.ts).
 */
const IST_OFFSET_MS = 5.5 * 3600_000

export function fyOf(at: Date): string {
  const ist = new Date(at.getTime() + IST_OFFSET_MS)
  const y = ist.getUTCFullYear()
  const start = ist.getUTCMonth() >= 3 ? y : y - 1
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`
}

export const counterIdOf = (workspace: string, fy: string): string => `${workspace}:quotation:${fy}`

/** "100X/QT/2026-27/0001" (at least 4 digits; grows past 9999 rather than wrapping). */
export const formatQuoteNumber = (fy: string, seq: number): string => `100X/QT/${fy}/${String(seq).padStart(4, "0")}`

/** "100X/QT/2026-27/0001" or "100X/QT/2026-27/0001 Rev 2". */
export const quoteLabel = (quoteNumber: string | null, version: number): string =>
  quoteNumber ? (version > 1 ? `${quoteNumber} Rev ${version}` : quoteNumber) : "Draft"

/** File name for downloads / WhatsApp document messages. */
export const quoteFilename = (quoteNumber: string | null, version: number): string =>
  `Quotation-${(quoteNumber ?? "draft").replace(/[^A-Za-z0-9-]+/g, "-")}${version > 1 ? `-Rev${version}` : ""}.pdf`
