/**
 * lib/gem/extractor.ts
 *
 * Extracts text and structured fields from GeM contract PDFs.
 * Uses pdf-parse (already installed). No AI, no NLP — regex only.
 * Extraction is best-effort: failure produces status "error" and does NOT
 * block the archive pipeline.
 */

import { ARCHIVE_SCHEMA_VERSION } from "./archive-paths"

// Lazy require — pdf-parse reads a test fixture at module load time, which
// breaks Next.js static page collection during `next build`. Deferring the
// require to call time avoids that cold-start side effect entirely.
function getPdfParse(): (buf: Buffer) => Promise<{ numpages: number; text: string }> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("pdf-parse")
}

export interface DetectedFields {
  gemc_number:          string | null
  is_standard:          string | null
  product_name:         string | null
  quantity:             number | null
  unit_price_inr:       number | null
  total_value_inr:      number | null
  award_date:           string | null
  delivery_period_days: number | null
  warranty_months:      number | null
  consignee_name:       string | null
  consignee_state:      string | null
}

export interface ExtractedContract {
  _schema_version:    typeof ARCHIVE_SCHEMA_VERSION
  _extracted_at:      string
  _extraction_method: "pdf-parse"
  _extraction_status: "success" | "partial" | "image-only" | "error"
  _extraction_error?: string
  page_count:         number
  text_length_chars:  number
  raw_text:           string
  detected_fields:    DetectedFields
}

function first(text: string, ...patterns: RegExp[]): string | null {
  for (const p of patterns) {
    const m = text.match(p)
    if (m?.[1]?.trim()) return m[1].trim()
  }
  return null
}

function cleanMoney(s: string): number | null {
  const n = Number(s.replace(/[₹,\s]/g, "").replace(/\.\d+$/, ""))
  return isNaN(n) || n <= 0 ? null : n
}

function normDate(s: string): string | null {
  const m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/)
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (iso) return s
  return null
}

function detectFields(text: string): DetectedFields {
  const gemcRaw = text.match(/GEMC-\d{12,}/)?.[0] ?? null

  const isStd = first(text, /IS\s*14855\s*\(?\s*Part\s*1\s*\)?/i)
    ? "IS 14855 (Part 1)"
    : null

  const productName = first(text,
    /Product\s+Name\s*[:\-]\s*([^\n|]{3,60})/i,
    /Item\s+Description\s*[:\-]\s*([^\n|]{3,60})/i,
  )

  const qtyRaw = first(text,
    /Quantity\s*[:\-]\s*(\d[\d,.]*)\s*(?:Nos?|Units?|Pcs?)?/i,
    /Qty\s*[:\-]\s*(\d[\d,.]*)/i,
  )
  const quantity = qtyRaw ? (Number(qtyRaw.replace(/,/g, "")) || null) : null

  const unitRaw = first(text,
    /Unit\s*Rate\s*[:\-]\s*₹?\s*([\d,.]+)/i,
    /Rate\s+Per\s+Unit\s*[:\-]\s*₹?\s*([\d,.]+)/i,
    /Per\s+Unit\s+Price\s*[:\-]\s*₹?\s*([\d,.]+)/i,
  )
  const unit_price_inr = unitRaw ? cleanMoney(unitRaw) : null

  const totalRaw = first(text,
    /Contract\s+Value\s*[:\-]\s*₹?\s*([\d,.]+)/i,
    /Total\s+Value\s*[:\-]\s*₹?\s*([\d,.]+)/i,
    /Order\s+Value\s*[:\-]\s*₹?\s*([\d,.]+)/i,
  )
  const total_value_inr = totalRaw ? cleanMoney(totalRaw) : null

  const dateRaw = first(text,
    /Award\s+Date\s*[:\-]\s*(\d{1,2}[-/]\d{1,2}[-/]\d{4})/i,
    /Contract\s+Date\s*[:\-]\s*(\d{1,2}[-/]\d{1,2}[-/]\d{4})/i,
    /Order\s+Date\s*[:\-]\s*(\d{1,2}[-/]\d{1,2}[-/]\d{4})/i,
  )
  const award_date = dateRaw ? normDate(dateRaw) : null

  const delivRaw = first(text,
    /Delivery\s+Period\s*[:\-]\s*(\d+)\s*Days?/i,
    /Delivery\s+[:\-]\s*(\d+)\s*Days?/i,
  )
  const delivery_period_days = delivRaw ? (Number(delivRaw) || null) : null

  const warRaw = first(text,
    /Warranty\s*[:\-]\s*(\d+)\s*Months?/i,
    /Guarantee\s*[:\-]\s*(\d+)\s*Months?/i,
  )
  const warranty_months = warRaw ? (Number(warRaw) || null) : null

  const consigneeName = first(text,
    /Consignee\s+Name\s*[:\-]\s*([^\n|]{3,80})/i,
    /Ship\s+To\s*[:\-]\s*([^\n|]{3,80})/i,
  )

  const consigneeState = first(text,
    /Consignee\s+State\s*[:\-]\s*([A-Za-z\s]{3,40})/i,
  )

  return {
    gemc_number:          gemcRaw,
    is_standard:          isStd,
    product_name:         productName,
    quantity,
    unit_price_inr,
    total_value_inr,
    award_date,
    delivery_period_days,
    warranty_months,
    consignee_name:       consigneeName,
    consignee_state:      consigneeState,
  }
}

const EMPTY_FIELDS: DetectedFields = {
  gemc_number: null, is_standard: null, product_name: null,
  quantity: null, unit_price_inr: null, total_value_inr: null,
  award_date: null, delivery_period_days: null, warranty_months: null,
  consignee_name: null, consignee_state: null,
}

export async function extractPdf(buffer: Buffer): Promise<ExtractedContract> {
  const now = new Date().toISOString()

  let pageCount = 0
  let rawText   = ""

  try {
    const data = await getPdfParse()(buffer)
    pageCount  = data.numpages ?? 0
    rawText    = (data.text ?? "").trim()
  } catch (err) {
    return {
      _schema_version:    ARCHIVE_SCHEMA_VERSION,
      _extracted_at:      now,
      _extraction_method: "pdf-parse",
      _extraction_status: "error",
      _extraction_error:  String(err),
      page_count:         0,
      text_length_chars:  0,
      raw_text:           "",
      detected_fields:    { ...EMPTY_FIELDS },
    }
  }

  if (!rawText) {
    return {
      _schema_version:    ARCHIVE_SCHEMA_VERSION,
      _extracted_at:      now,
      _extraction_method: "pdf-parse",
      _extraction_status: "image-only",
      page_count:         pageCount,
      text_length_chars:  0,
      raw_text:           "",
      detected_fields:    { ...EMPTY_FIELDS },
    }
  }

  const fields  = detectFields(rawText)
  const anyHit  = Object.values(fields).some(v => v !== null)
  const status  = anyHit ? "success" : "partial"

  return {
    _schema_version:    ARCHIVE_SCHEMA_VERSION,
    _extracted_at:      now,
    _extraction_method: "pdf-parse",
    _extraction_status: status,
    page_count:         pageCount,
    text_length_chars:  rawText.length,
    raw_text:           rawText,
    detected_fields:    fields,
  }
}
