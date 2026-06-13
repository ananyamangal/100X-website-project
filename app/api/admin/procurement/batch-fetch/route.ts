/**
 * POST /api/admin/procurement/batch-fetch
 *
 * Accepts a list of getSinglePacketResultView URLs (or numeric IDs).
 * Fetches each page in parallel (server-side rendered — no JS needed).
 * Parses full bid data: bid number, dept, state, L1/L2/L3 names + prices, dates.
 * Upserts into bid_lifecycle.
 * Auto-creates dealer stubs in proc_dealers for every new firm name.
 * Auto-creates brand stubs in proc_brand_profiles for every new OEM brand.
 */

import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { requirePermission, writeAuditLog } from "@/lib/rbac/server"
import { verifyAndConsumeToken } from "@/lib/gem/approval"

export const maxDuration = 60

// ─── Fetch helpers ────────────────────────────────────────────────────────────

const BASE = "https://bidplus.gem.gov.in/bidding/bid/getSinglePacketResultView/"

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-IN,en;q=0.9",
  Referer: "https://bidplus.gem.gov.in/all-bids",
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|tr|td|th|li|h[1-6]|section)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function extractNumericId(input: string): string | null {
  const m = input.match(/getSinglePacketResultView\/(\d+)/i) || input.match(/^(\d{5,})$/)
  return m ? m[1] : null
}

async function fetchPage(numericId: string): Promise<string | null> {
  try {
    const res = await fetch(`${BASE}${numericId}`, {
      headers: HEADERS,
      signal: AbortSignal.timeout(12000),
    })
    if (!res.ok) return null
    const html = await res.text()
    return html.length > 500 ? htmlToText(html) : null
  } catch {
    return null
  }
}

// ─── Parser (self-contained to avoid import from client-side module) ──────────

function first(text: string, ...patterns: RegExp[]): string | null {
  for (const p of patterns) { const m = text.match(p); if (m?.[1]?.trim()) return m[1].trim() }
  return null
}

function cleanMoney(s: string): number | null {
  const n = Number(s.replace(/[₹,\s]/g, "").replace(/\.\d+$/, ""))
  return isNaN(n) || n <= 0 ? null : n
}

function normDate(s: string): string {
  const m = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/)
  return m ? `${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}` : s
}

const INDIA_STATES = [
  "Andaman and Nicobar Islands","Andhra Pradesh","Arunachal Pradesh","Assam",
  "Bihar","Chandigarh","Chhattisgarh","Dadra and Nagar Haveli","Daman and Diu",
  "Delhi","Goa","Gujarat","Haryana","Himachal Pradesh","Jammu and Kashmir",
  "Jharkhand","Karnataka","Kerala","Ladakh","Lakshadweep","Madhya Pradesh",
  "Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Puducherry",
  "Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura",
  "Uttar Pradesh","Uttarakhand","West Bengal",
].sort((a,b) => b.length - a.length)

function detectStatus(t: string): string {
  if (/L[-\s]?1\s*(Bidder|Firm|Supplier)/i.test(t) || /RA\s*Concluded/i.test(t)) return "awarded"
  const s = first(t, /(?:Bid\s*Status|Status)\s*[:\-]\s*([^\n,]+)/i)?.toLowerCase() || ""
  if (/award|concluded/.test(s)) return "awarded"
  if (/financial|ra\s*(open|eval)/i.test(s)) return "financial_eval"
  if (/technical/i.test(s)) return "technical_eval"
  if (/cancel/i.test(s)) return "cancelled"
  if (/active|open|publish/i.test(s)) return "published"
  return "published"
}

interface ParsedBid {
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
  total_bidders_count: number | null
}

function parsePage(text: string): ParsedBid | null {
  const bidNumMatch = text.match(/\b(GEM\/\d{4}\/[A-Z]+\/\d+)\b/i)
  if (!bidNumMatch) return null

  const bid_number = bidNumMatch[1].toUpperCase()

  let state = ""
  for (const s of INDIA_STATES) {
    if (new RegExp(`\\b${s}\\b`, "i").test(text)) { state = s; break }
  }

  const dept = first(text,
    /(?:Buyer(?:\s+Name)?|Organisation\s+Name|Consignee\s+Org(?:anization)?)\s*[:\-]\s*([^\n]+)/i,
    /(?:Department|Organization)\s*[:\-]\s*([^\n]+)/i,
  ) || ""

  const productLine = first(text,
    /(?:Item\s*(?:Name|Description)|Product\s*Name)\s*[:\-]?\s*([^\n]+)/i,
    /(Fogging Machine[^\n]+)/i,
    /(Fogger[^\n]+)/i,
  ) || ""

  const detectCat = (t: string) => {
    const l = t.toLowerCase()
    if (/vehicle.{0,20}(fog|mount)|truck.{0,20}fog/.test(l)) return "vehicle_fogger"
    if (/mini.{0,10}fog/.test(l)) return "mini_fogger"
    if (/fog(ger|ging)/.test(l)) return "thermal_fogger"
    if (/power.?tiller/.test(l)) return "power_tiller"
    if (/brush.?cutter/.test(l)) return "brush_cutter"
    if (/spray/.test(l)) return "sprayer"
    return "thermal_fogger"
  }

  const qtyMatch = text.match(/(\d+)\s*(?:Nos?|nos?|Units?|Pieces?|Pcs?)\b/)
  const quantity = qtyMatch ? parseInt(qtyMatch[1]) : null

  const estMatch = text.match(/(?:Total\s*Estimated|Consignee\s*Estimated|Estimated\s*(?:Total\s*)?(?:Value|Price))\s*[:\-]?\s*₹?\s*([\d,]+(?:\.\d+)?)/i)
  let estimated_value_inr: number | null = null
  if (estMatch) {
    estimated_value_inr = cleanMoney(estMatch[1])
  } else {
    const prices: number[] = []
    const re = /₹\s*([\d,]+(?:\.\d+)?)/g; let m
    while ((m = re.exec(text)) !== null) { const v = cleanMoney(m[1]); if (v && v > 10000) prices.push(v) }
    if (prices.length) estimated_value_inr = Math.max(...prices)
  }

  const DR = /(\d{1,2}[-\/]\d{1,2}[-\/]\d{4})/
  const publish_date   = (() => { const v = first(text, new RegExp(`(?:Bid\\s*(?:Publish|Start|Open)\\s*Date)[:\\-\\s]+${DR.source}`,"i")); return v ? normDate(v) : null })()
  const bid_end_date   = (() => { const v = first(text, new RegExp(`(?:Bid\\s*(?:End|Close|Closing)\\s*Date)[:\\-\\s]+${DR.source}`,"i")); return v ? normDate(v) : null })()
  const award_date     = (() => { const v = first(text, new RegExp(`(?:Award\\s*Date|RA\\s*Concluded|Result\\s*Date)[:\\-\\s]+${DR.source}`,"i")); return v ? normDate(v) : null })()

  const current_status = detectStatus(text)

  const l1Name  = first(text, /L[-\s]?1\s*(?:Bidder|Firm|Supplier|Vendor)[:\-\s]+([^\n]+)/i) || ""
  const l1Price = (() => { const v = first(text, /L[-\s]?1\s*(?:Price|Rate|Quoted)[:\-\s]*₹?\s*([\d,]+(?:\.\d+)?)/i); return v ? cleanMoney(v) : null })()
  const l2Name  = first(text, /L[-\s]?2\s*(?:Bidder|Firm|Supplier|Vendor)[:\-\s]+([^\n]+)/i) || ""
  const l2Price = (() => { const v = first(text, /L[-\s]?2\s*(?:Price|Rate|Quoted)[:\-\s]*₹?\s*([\d,]+(?:\.\d+)?)/i); return v ? cleanMoney(v) : null })()
  const l3Name  = first(text, /L[-\s]?3\s*(?:Bidder|Firm|Supplier|Vendor)[:\-\s]+([^\n]+)/i) || ""
  const l3Price = (() => { const v = first(text, /L[-\s]?3\s*(?:Price|Rate|Quoted)[:\-\s]*₹?\s*([\d,]+(?:\.\d+)?)/i); return v ? cleanMoney(v) : null })()

  const biddersStr = first(text, /(?:Total\s*(?:No\.?\s*of\s*)?Bidders?)[:\-\s]+(\d+)/i)
  const total_bidders_count = biddersStr ? parseInt(biddersStr) : null

  return {
    bid_number,
    department_name: dept.replace(/\s+/g," "),
    state,
    product_category: detectCat(productLine || text),
    product_name_raw: productLine,
    quantity,
    estimated_value_inr,
    current_status,
    publish_date,
    bid_end_date,
    award_date,
    l1_dealer_name: l1Name.replace(/\s+/g," "),
    l1_price_inr: l1Price,
    l2_dealer_name: l2Name.replace(/\s+/g," "),
    l2_price_inr: l2Price,
    l3_dealer_name: l3Name.replace(/\s+/g," "),
    l3_price_inr: l3Price,
    total_bidders_count,
  }
}

// ─── Auto-detection helpers ───────────────────────────────────────────────────

function normalizeBrandRaw(raw: string): string | null {
  if (!raw?.trim()) return null
  const t = raw.trim()
  const makeMatch = t.match(/Make\s*:\s*([^-\n,/]+)/i)
  if (makeMatch) return makeMatch[1].trim().replace(/\s+/g," ")
  const dashPart = t.split(/--|\/|,|\n/)[0].trim()
  return dashPart.substring(0, 60) || null
}

import type { Db } from "mongodb"

async function autoDetectDealers(db: Db, bids: ParsedBid[], now: Date): Promise<string[]> {
  const names = new Set<string>()
  for (const b of bids) {
    if (b.l1_dealer_name) names.add(b.l1_dealer_name)
    if (b.l2_dealer_name) names.add(b.l2_dealer_name)
    if (b.l3_dealer_name) names.add(b.l3_dealer_name)
  }
  const existing = new Set(await db.collection("proc_dealers").distinct("canonical_name"))
  const newDealers: string[] = []
  for (const name of names) {
    if (!name || existing.has(name)) continue
    await db.collection("proc_dealers").updateOne(
      { canonical_name: name },
      { $set: { canonical_name: name, enrichment_status: "stub", source: "auto_detected", updated_at: now },
        $setOnInsert: { created_at: now } },
      { upsert: true }
    )
    newDealers.push(name)
  }
  return newDealers
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Authentication: this route was previously unauthenticated — now enforced.
  const auth = await requirePermission(req, "procurement.batch_collect.run")
  if (!("user" in auth)) return auth

  try {
    const body = await req.json()
    const { urls, approval_token }: { urls: string[]; approval_token?: string } = body

    if (!Array.isArray(urls) || urls.length === 0)
      return NextResponse.json({ error: "urls[] required" }, { status: 400 })
    if (urls.length > 50)
      return NextResponse.json({ error: "Max 50 URLs per batch" }, { status: 400 })

    // Approval token required — writes to bid_lifecycle and proc_dealers.
    if (!approval_token) {
      await writeAuditLog(auth.user, "enrichment_unauthenticated", "batch_fetch", {
        reason: "missing_approval_token",
        url_count: urls.length,
      }, req)
      return NextResponse.json(
        { error: "Approval required. Call POST /api/admin/procurement/enrichment/approve first.", code: "APPROVAL_REQUIRED" },
        { status: 403 },
      )
    }

    const approval = await verifyAndConsumeToken(
      approval_token,
      auth.user.sub,
      "batch_fetch",
      "/api/admin/procurement/batch-fetch",
    )
    if (!approval) {
      await writeAuditLog(auth.user, "enrichment_unauthenticated", "batch_fetch", {
        reason: "invalid_expired_or_consumed_token",
        token_id: approval_token,
        url_count: urls.length,
      }, req)
      return NextResponse.json(
        { error: "Approval token invalid, expired, or already used. Request a new approval.", code: "APPROVAL_INVALID" },
        { status: 403 },
      )
    }

    await writeAuditLog(auth.user, "enrichment_start", "batch_fetch", {
      approval_token_id: approval.token_id,
      url_count: urls.length,
    }, req)

    // Extract numeric IDs
    const jobs: { input: string; id: string | null }[] = urls
      .map(u => u.trim())
      .filter(Boolean)
      .map(u => ({ input: u, id: extractNumericId(u) }))

    const results = {
      created: 0, updated: 0, skipped: 0,
      errors: [] as string[],
      new_dealers: [] as string[],
      new_brands: [] as string[],
      bids: [] as { bid_number: string; status: string; state: string; l1: string }[],
    }

    // Fetch in parallel batches of 6
    const BATCH = 6
    const parsed: ParsedBid[] = []

    for (let i = 0; i < jobs.length; i += BATCH) {
      const batch = jobs.slice(i, i + BATCH)
      await Promise.all(batch.map(async ({ input, id }) => {
        if (!id) { results.errors.push(`No numeric ID in: ${input.substring(0,60)}`); return }
        const text = await fetchPage(id)
        if (!text) { results.errors.push(`Fetch failed: ID ${id}`); return }
        const bid = parsePage(text)
        if (!bid) { results.errors.push(`Parse failed: ID ${id} (no bid number found)`); return }
        parsed.push(bid)
      }))
    }

    if (parsed.length === 0) {
      return NextResponse.json({ ...results, message: "No bids successfully fetched." })
    }

    const db = (await clientPromise).db()
    const now = new Date()

    // Upsert bids
    for (const bid of parsed) {
      const doc = { ...bid, updated_at: now, source: "gem_batch_fetch" }
      const r = await db.collection("bid_lifecycle").updateOne(
        { bid_number: bid.bid_number },
        { $set: doc, $setOnInsert: { created_at: now } },
        { upsert: true }
      )
      if (r.upsertedCount > 0) { results.created++; } else { results.updated++ }
      results.bids.push({
        bid_number: bid.bid_number,
        status: bid.current_status,
        state: bid.state,
        l1: bid.l1_dealer_name,
      })
    }

    // Auto-detect dealers
    results.new_dealers = await autoDetectDealers(db, parsed, now)

    await writeAuditLog(auth.user, "enrichment_complete", "batch_fetch", {
      approval_token_id: approval.token_id,
      created: results.created,
      updated: results.updated,
      skipped: results.skipped,
      errors:  results.errors.length,
    }, req)

    return NextResponse.json(JSON.parse(JSON.stringify(results)))
  } catch (err) {
    console.error("[batch-fetch] error:", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
