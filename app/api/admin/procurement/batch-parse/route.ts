/**
 * POST /api/admin/procurement/batch-parse
 *
 * Accepts pasted text from a rendered GeM result list or search page.
 * Splits on bid number occurrences (GEM/YYYY/X/NNNNN) to isolate each bid's segment.
 * Parses each segment into a bid stub and optionally saves all to bid_lifecycle.
 *
 * Body: { text: string, save?: boolean }
 * Response: { bids: ParsedBid[], saved?: number, new_dealers?: string[] }
 *
 * When save=false (default): returns preview only.
 * When save=true: upserts all parsed bids + auto-detects dealers.
 */

import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

// ─── Minimal parser (mirrors gemParser.ts for server-side use) ───────────────

function first(text: string, ...patterns: RegExp[]): string | null {
  for (const p of patterns) { const m = text.match(p); if (m?.[1]?.trim()) return m[1].trim() }
  return null
}

function normDate(s: string): string {
  const m = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/)
  return m ? `${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}` : s
}

function cleanMoney(s: string): number | null {
  const n = Number(s.replace(/[₹,\s]/g,"").replace(/\.\d+$/, ""))
  return isNaN(n) || n <= 0 ? null : n
}

const INDIA_STATES = [
  "Andaman and Nicobar Islands","Andhra Pradesh","Arunachal Pradesh","Assam",
  "Bihar","Chandigarh","Chhattisgarh","Delhi","Goa","Gujarat","Haryana",
  "Himachal Pradesh","Jammu and Kashmir","Jharkhand","Karnataka","Kerala",
  "Ladakh","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram",
  "Nagaland","Odisha","Puducherry","Punjab","Rajasthan","Sikkim","Tamil Nadu",
  "Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
].sort((a,b) => b.length - a.length)

function detectState(t: string): string {
  for (const s of INDIA_STATES) { if (new RegExp(`\\b${s}\\b`,"i").test(t)) return s }
  return ""
}

function detectStatus(t: string): string {
  if (/L[-\s]?1\s*(Bidder|Firm)/i.test(t)) return "awarded"
  const s = (first(t, /(?:Bid\s*Status|Status)\s*[:\-]\s*([^\n,]{1,30})/i) || "").toLowerCase()
  if (/award|conclud/.test(s)) return "awarded"
  if (/financial/.test(s)) return "financial_eval"
  if (/technical/.test(s)) return "technical_eval"
  if (/cancel/.test(s)) return "cancelled"
  return "published"
}

function detectCategory(t: string): string {
  const l = t.toLowerCase()
  if (/vehicle.{0,20}fog|truck.{0,20}fog/.test(l)) return "vehicle_fogger"
  if (/mini.{0,10}fog/.test(l)) return "mini_fogger"
  if (/fog/.test(l)) return "thermal_fogger"
  if (/power.?tiller/.test(l)) return "power_tiller"
  if (/brush.?cutter/.test(l)) return "brush_cutter"
  if (/spray/.test(l)) return "sprayer"
  return "thermal_fogger"
}

export interface BidStub {
  bid_number: string
  department_name: string
  state: string
  product_category: string
  product_name_raw: string
  quantity: number | null
  estimated_value_inr: number | null
  current_status: string
  publish_date: string | null
  bid_end_date: string | null
  award_date: string | null
  l1_dealer_name: string
  l1_price_inr: number | null
  l2_dealer_name: string
  l2_price_inr: number | null
  l3_dealer_name: string
  l3_price_inr: number | null
}

function parseSegment(segment: string): BidStub | null {
  const bidMatch = segment.match(/\b(GEM\/\d{4}\/[A-Z]+\/\d+)\b/i)
  if (!bidMatch) return null

  const dept = first(segment,
    /(?:Organisation Name|Buyer|Department)\s*[:\-]\s*([^\n]+)/i
  ) || ""

  const productLine = first(segment,
    /(Fogging Machine[^\n]{0,80})/i,
    /(Fogger[^\n]{0,60})/i,
    /(?:Item|Product)\s*[:\-]?\s*([^\n]+)/i,
  ) || ""

  const qtyMatch = segment.match(/(\d+)\s*(?:Nos?|nos?|Units?)\b/)
  const qty = qtyMatch ? parseInt(qtyMatch[1]) : null

  const priceMatch = segment.match(/₹\s*([\d,]+(?:\.\d+)?)/)
  const estValue = priceMatch ? cleanMoney(priceMatch[1]) : null

  const DR = /(\d{1,2}[-\/]\d{1,2}[-\/]\d{4})/
  const publish_date  = (() => { const v = first(segment, new RegExp(`(?:Publish|Start|Open)\\s*[:\\-]\\s*${DR.source}`,"i")); return v ? normDate(v) : null })()
  const bid_end_date  = (() => { const v = first(segment, new RegExp(`(?:End|Close)\\s*[:\\-]\\s*${DR.source}`,"i")); return v ? normDate(v) : null })()
  const award_date    = (() => { const v = first(segment, new RegExp(`(?:Award|Result|Concluded)\\s*[:\\-]\\s*${DR.source}`,"i")); return v ? normDate(v) : null })()

  // If no labelled date found, just grab any DD-MM-YYYY from the segment
  const anyDate = (() => {
    if (publish_date || bid_end_date || award_date) return null
    const m = segment.match(/(\d{2}[-\/]\d{2}[-\/]\d{4})/)
    return m ? normDate(m[1]) : null
  })()

  const l1Name  = (first(segment, /L[-\s]?1\s*(?:Bidder|Firm|Supplier)[:\-\s]+([^\n]+)/i) || "").replace(/\s+/g," ")
  const l1Price = (() => { const v = first(segment, /L[-\s]?1[^\n]{0,30}₹\s*([\d,]+(?:\.\d+)?)/i); return v ? cleanMoney(v) : null })()
  const l2Name  = (first(segment, /L[-\s]?2\s*(?:Bidder|Firm|Supplier)[:\-\s]+([^\n]+)/i) || "").replace(/\s+/g," ")
  const l2Price = (() => { const v = first(segment, /L[-\s]?2[^\n]{0,30}₹\s*([\d,]+(?:\.\d+)?)/i); return v ? cleanMoney(v) : null })()
  const l3Name  = (first(segment, /L[-\s]?3\s*(?:Bidder|Firm|Supplier)[:\-\s]+([^\n]+)/i) || "").replace(/\s+/g," ")
  const l3Price = (() => { const v = first(segment, /L[-\s]?3[^\n]{0,30}₹\s*([\d,]+(?:\.\d+)?)/i); return v ? cleanMoney(v) : null })()

  return {
    bid_number: bidMatch[1].toUpperCase(),
    department_name: dept.replace(/\s+/g," ").trim(),
    state: detectState(segment),
    product_category: detectCategory(productLine || segment),
    product_name_raw: productLine.trim(),
    quantity: qty,
    estimated_value_inr: estValue,
    current_status: detectStatus(segment),
    publish_date: publish_date || anyDate,
    bid_end_date,
    award_date,
    l1_dealer_name: l1Name,
    l1_price_inr: l1Price,
    l2_dealer_name: l2Name,
    l2_price_inr: l2Price,
    l3_dealer_name: l3Name,
    l3_price_inr: l3Price,
  }
}

// ─── Multi-bid splitter ───────────────────────────────────────────────────────

function splitIntoBids(text: string): BidStub[] {
  const t = text.replace(/\r\n?/g,"\n").replace(/[ \t]+/g," ").trim()

  // Find positions of all bid numbers in the text
  const BID_RE = /\bGEM\/\d{4}\/[A-Z]+\/\d+\b/gi
  const positions: number[] = []
  let m: RegExpExecArray | null
  while ((m = BID_RE.exec(t)) !== null) positions.push(m.index)

  if (positions.length === 0) return []

  // Split text at each bid number position
  const segments: string[] = []
  for (let i = 0; i < positions.length; i++) {
    const start = positions[i]
    const end   = i + 1 < positions.length ? positions[i + 1] : t.length
    segments.push(t.slice(start, end))
  }

  return segments.map(parseSegment).filter(Boolean) as BidStub[]
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { text, save = false }: { text: string; save?: boolean } = await req.json()
    if (!text?.trim())
      return NextResponse.json({ error: "text required" }, { status: 400 })

    const bids = splitIntoBids(text)
    if (bids.length === 0)
      return NextResponse.json({
        bids: [],
        message: "No bid numbers (GEM/YYYY/X/NNNNN) found in pasted text.",
      })

    if (!save)
      return NextResponse.json(JSON.parse(JSON.stringify({ bids, total: bids.length })))

    // Save all parsed bids
    const db = (await clientPromise).db()
    const now = new Date()
    let created = 0, updated = 0

    for (const bid of bids) {
      const doc = { ...bid, updated_at: now, source: "gem_batch_paste" }
      const r = await db.collection("bid_lifecycle").updateOne(
        { bid_number: bid.bid_number },
        { $set: doc, $setOnInsert: { created_at: now } },
        { upsert: true }
      )
      r.upsertedCount > 0 ? created++ : updated++
    }

    // Auto-detect dealers
    const dealerNames = new Set<string>()
    for (const b of bids) {
      if (b.l1_dealer_name) dealerNames.add(b.l1_dealer_name)
      if (b.l2_dealer_name) dealerNames.add(b.l2_dealer_name)
      if (b.l3_dealer_name) dealerNames.add(b.l3_dealer_name)
    }
    const existingDealers = new Set(await db.collection("proc_dealers").distinct("canonical_name"))
    const newDealers: string[] = []
    for (const name of dealerNames) {
      if (!name || existingDealers.has(name)) continue
      await db.collection("proc_dealers").updateOne(
        { canonical_name: name },
        { $set: { canonical_name: name, enrichment_status: "stub", source: "auto_detected", updated_at: now },
          $setOnInsert: { created_at: now } },
        { upsert: true }
      )
      newDealers.push(name)
    }

    return NextResponse.json(
      JSON.parse(JSON.stringify({ bids, total: bids.length, created, updated, new_dealers: newDealers }))
    )
  } catch (err) {
    console.error("batch-parse error:", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
