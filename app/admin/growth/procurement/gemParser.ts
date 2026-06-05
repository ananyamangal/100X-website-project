// Client-side GeM bid page text parser.
// Input: raw text copied from any GeM bid page (Ctrl+A, Ctrl+C).
// Output: structured bid fields + per-field confidence score.

export interface ParsedBid {
  bid_number: string
  department_name: string
  state: string
  district: string
  city: string
  product_category: string
  product_name_raw: string
  quantity: number | null
  estimated_value_inr: number | null
  current_status: string
  publish_date: string
  bid_end_date: string
  award_date: string
  l1_dealer_name: string
  l1_oem_brand: string
  l1_price_inr: number | null
  l2_dealer_name: string
  l2_oem_brand: string
  l2_price_inr: number | null
  l3_dealer_name: string
  l3_oem_brand: string
  l3_price_inr: number | null
  total_bidders_count: number | null
  is_100x_win: boolean
  source_url: string
}

export type FieldConfidence = "high" | "medium" | "low" | "manual"
export type ConfidenceMap = Partial<Record<keyof ParsedBid, FieldConfidence>>

export function emptyBid(): ParsedBid {
  return {
    bid_number: "", department_name: "", state: "", district: "", city: "",
    product_category: "thermal_fogger", product_name_raw: "",
    quantity: null, estimated_value_inr: null,
    current_status: "published",
    publish_date: "", bid_end_date: "", award_date: "",
    l1_dealer_name: "", l1_oem_brand: "", l1_price_inr: null,
    l2_dealer_name: "", l2_oem_brand: "", l2_price_inr: null,
    l3_dealer_name: "", l3_oem_brand: "", l3_price_inr: null,
    total_bidders_count: null, is_100x_win: false, source_url: "",
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function cleanMoney(s: string): number | null {
  const stripped = s.replace(/[₹,\s]/g, "").replace(/\.\d+$/, "")
  const n = Number(stripped)
  return isNaN(n) || n <= 0 ? null : n
}

// Convert DD-MM-YYYY or DD/MM/YYYY to YYYY-MM-DD
function normDate(s: string): string {
  const m = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/)
  if (!m) return s
  return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`
}

// Find the first match for any of the given patterns in text
function first(text: string, ...patterns: RegExp[]): string | null {
  for (const p of patterns) {
    const m = text.match(p)
    if (m?.[1]?.trim()) return m[1].trim()
  }
  return null
}

// ─── State detection ─────────────────────────────────────────────────────────

// Ordered longest-first to prefer "Uttar Pradesh" over "Pradesh"
const INDIA_STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam",
  "Bihar", "Chandigarh", "Chhattisgarh", "Dadra and Nagar Haveli",
  "Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh",
  "Jammu and Kashmir", "Jharkhand", "Karnataka", "Kerala", "Ladakh",
  "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
  "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan",
  "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
  "Uttarakhand", "West Bengal", "NCT of Delhi",
].sort((a, b) => b.length - a.length)

function detectState(text: string): string | null {
  for (const state of INDIA_STATES) {
    if (new RegExp(`\\b${state}\\b`, "i").test(text)) {
      return state === "NCT of Delhi" ? "Delhi" : state
    }
  }
  return null
}

// ─── Product category detection ──────────────────────────────────────────────

function detectCategory(text: string): string {
  const t = text.toLowerCase()
  if (/vehicle.{0,20}(fog|mount)|truck.{0,20}fog/.test(t)) return "vehicle_fogger"
  if (/mini.{0,10}fog/.test(t)) return "mini_fogger"
  if (/fog(ger|ging)/.test(t)) return "thermal_fogger"
  if (/power.?tiller|tiller/.test(t)) return "power_tiller"
  if (/brush.?cutter/.test(t)) return "brush_cutter"
  if (/spray(er|ing)/.test(t)) return "sprayer"
  return "thermal_fogger"
}

// ─── Status detection ────────────────────────────────────────────────────────

function detectStatus(text: string): { status: string; confidence: FieldConfidence } {
  // If we see L1 bidder data, it's awarded regardless of stated status
  if (/L[-\s]?1\s*(Bidder|Firm|Supplier)/i.test(text) || /RA\s*Concluded/i.test(text)) {
    return { status: "awarded", confidence: "high" }
  }
  const stated = first(text,
    /(?:Bid\s*Status|Status\s*of\s*Bid)\s*[:\-]\s*([^\n,]+)/i
  )?.toLowerCase()
  if (!stated) return { status: "published", confidence: "low" }
  if (/award|concluded|finali/.test(stated)) return { status: "awarded", confidence: "high" }
  if (/financial|ra\s*(open|eval|close)/i.test(stated)) return { status: "financial_eval", confidence: "high" }
  if (/technical/i.test(stated)) return { status: "technical_eval", confidence: "high" }
  if (/cancel/i.test(stated)) return { status: "cancelled", confidence: "high" }
  if (/active|open|live|publish/i.test(stated)) return { status: "published", confidence: "high" }
  return { status: "published", confidence: "low" }
}

// ─── Main parser ─────────────────────────────────────────────────────────────

export function parseGeMText(raw: string): { bid: ParsedBid; confidence: ConfidenceMap } {
  const bid = emptyBid()
  const conf: ConfidenceMap = {}

  // Normalise whitespace
  const t = raw.replace(/\r\n?/g, "\n").replace(/[ \t]+/g, " ").trim()

  // 1. Bid number ──────────────────────────────────────────────────────────────
  const bidNumMatch = t.match(/\b(GEM\/\d{4}\/[A-Z]+\/\d+)\b/i)
  if (bidNumMatch) {
    bid.bid_number = bidNumMatch[1].toUpperCase()
    conf.bid_number = "high"
  }

  // 2. State ───────────────────────────────────────────────────────────────────
  const state = detectState(t)
  if (state) { bid.state = state; conf.state = "high" }

  // 3. Department ──────────────────────────────────────────────────────────────
  const dept = first(t,
    /(?:Buyer(?:\s+Name)?|Buyer\s+Organisation|Consignee\s+Organization|Organisation\s+Name)\s*[:\-]\s*([^\n]+)/i,
    /(?:Purchasing\s+Authority|Procuring\s+Entity)\s*[:\-]\s*([^\n]+)/i,
  )
  if (dept) { bid.department_name = dept.replace(/\s+/g, " "); conf.department_name = "high" }

  // 4. Product name + category ─────────────────────────────────────────────────
  const productLine = first(t,
    /(?:Item\s*(?:Name|Description)|Product\s*Name|Item\s*1)\s*[:\-]?\s*([^\n]+)/i,
    /(Fogging Machine[^\n]+)/i,
    /(Fogger[^\n]+)/i,
    /(Thermal\s+Fog[^\n]+)/i,
  )
  if (productLine) {
    bid.product_name_raw = productLine.trim()
    conf.product_name_raw = "high"
  }
  bid.product_category = detectCategory(productLine || t)
  conf.product_category = productLine ? "high" : "medium"

  // 5. Quantity ─────────────────────────────────────────────────────────────────
  const qtyMatch = t.match(
    /(?:Quantity\s*[:\-]\s*|Qty\s*[:\-]\s*)?(\d+)\s*(?:Nos?|nos?|Units?|units?|Pieces?|Pcs?)\b/
  )
  if (qtyMatch) { bid.quantity = parseInt(qtyMatch[1]); conf.quantity = "high" }

  // 6. Estimated value ──────────────────────────────────────────────────────────
  // Try label-based first, then largest ₹ figure
  const estMatch = t.match(
    /(?:Total\s*Estimated|Consignee\s*Estimated|Estimated\s*(?:Total\s*)?(?:Value|Price|Cost))\s*[:\-]?\s*₹?\s*([\d,]+(?:\.\d+)?)/i
  )
  if (estMatch) {
    const v = cleanMoney(estMatch[1])
    if (v) { bid.estimated_value_inr = v; conf.estimated_value_inr = "high" }
  } else {
    // Collect all ₹ figures and take the largest
    const all: number[] = []
    const re = /₹\s*([\d,]+(?:\.\d+)?)/g
    let m: RegExpExecArray | null
    while ((m = re.exec(t)) !== null) {
      const v = cleanMoney(m[1])
      if (v && v > 10000) all.push(v)
    }
    if (all.length) {
      bid.estimated_value_inr = Math.max(...all)
      conf.estimated_value_inr = "medium"
    }
  }

  // 7. Dates ────────────────────────────────────────────────────────────────────
  const DATE_RE = /(\d{1,2}[-\/]\d{1,2}[-\/]\d{4})/

  const publishDate = first(t,
    new RegExp(`(?:Bid\\s*(?:Publish|Start|Open|Create)\\s*Date)[:\\-\\s]+${DATE_RE.source}`, "i"),
    new RegExp(`(?:Published\\s*On|Created\\s*On)[:\\-\\s]+${DATE_RE.source}`, "i"),
  )
  if (publishDate) { bid.publish_date = normDate(publishDate); conf.publish_date = "high" }

  const endDate = first(t,
    new RegExp(`(?:Bid\\s*(?:End|Close|Closing|Last)\\s*Date)[:\\-\\s]+${DATE_RE.source}`, "i"),
    new RegExp(`(?:Response\\s*Deadline)[:\\-\\s]+${DATE_RE.source}`, "i"),
  )
  if (endDate) { bid.bid_end_date = normDate(endDate); conf.bid_end_date = "high" }

  const awardDate = first(t,
    new RegExp(`(?:Award\\s*Date|RA\\s*Concluded\\s*On|Result\\s*Date|PO\\s*Date)[:\\-\\s]+${DATE_RE.source}`, "i"),
    new RegExp(`(?:Concluded\\s*On|Finali[sz]ed\\s*On)[:\\-\\s]+${DATE_RE.source}`, "i"),
  )
  if (awardDate) { bid.award_date = normDate(awardDate); conf.award_date = "high" }

  // 8. Status ───────────────────────────────────────────────────────────────────
  const { status, confidence: statusConf } = detectStatus(t)
  bid.current_status = status
  conf.current_status = statusConf

  // 9. L1 / L2 / L3 ────────────────────────────────────────────────────────────
  for (const rank of [1, 2, 3] as const) {
    // Firm name
    const firmName = first(t,
      new RegExp(`L[-\\s]?${rank}\\s*(?:Bidder|Firm|Supplier|Vendor|Winner)[:\\-\\s]+([^\\n]+)`, "i"),
      new RegExp(`L[-\\s]?${rank}\\s*(?:Quote|Quoted)[^\\n]*by[:\\-\\s]+([^\\n]+)`, "i"),
    )
    if (firmName) {
      bid[`l${rank}_dealer_name` as "l1_dealer_name" | "l2_dealer_name" | "l3_dealer_name"] = firmName.replace(/\s+/g, " ")
      conf[`l${rank}_dealer_name` as keyof ParsedBid] = "high"
    }

    // Price
    const priceStr = first(t,
      new RegExp(`L[-\\s]?${rank}\\s*(?:Price|Rate|Quoted\\s*Price|Bid\\s*Price)[:\\-\\s]*₹?\\s*([\\d,]+(?:\\.\\d+)?)`, "i"),
      new RegExp(`L[-\\s]?${rank}[^\\n]{0,40}₹\\s*([\\d,]+(?:\\.\\d+)?)`, "i"),
    )
    if (priceStr) {
      const v = cleanMoney(priceStr)
      if (v) {
        bid[`l${rank}_price_inr` as "l1_price_inr" | "l2_price_inr" | "l3_price_inr"] = v
        conf[`l${rank}_price_inr` as keyof ParsedBid] = "high"
      }
    }
  }

  // 10. Total bidders ───────────────────────────────────────────────────────────
  const biddersStr = first(t,
    /(?:Total\s*(?:No\.?\s*of\s*)?Bidders?|Number\s*of\s*Bidders?)[:\-\s]+(\d+)/i,
    /(\d+)\s*Bidders?\s*Participated/i,
  )
  if (biddersStr) { bid.total_bidders_count = parseInt(biddersStr); conf.total_bidders_count = "high" }

  return { bid, confidence: conf }
}
