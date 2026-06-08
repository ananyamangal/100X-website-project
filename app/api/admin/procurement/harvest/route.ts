/**
 * GET  /api/admin/procurement/harvest
 *   → Called by Vercel cron daily at 00:30 UTC (06:00 IST).
 *   → Scans SCAN_PER_RUN sequential IDs starting from last_scanned_id.
 *   → For each ID: fetches the page, checks for fogging keywords, saves matches.
 *   → Returns a JSON report.
 *
 * POST /api/admin/procurement/harvest
 *   → { action: "scan", from: number, to: number, concurrency?: number }
 *   → Manual scan of an explicit range (used by admin UI and local script).
 *   → { action: "status" }
 *   → Returns harvester state without running anything.
 *   → { action: "reset_position", to: number }
 *   → Moves last_scanned_id to a specific value.
 */

import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { requirePermission } from "@/lib/rbac/server"

export const maxDuration = 120

// ─── Config ───────────────────────────────────────────────────────────────────

// Calibrated June 2026 (empirically verified — see MASTER_STATE.md GeM Harvester section).
// Rate: ~4,000 IDs/day ≈ 120,000 IDs/month.
// BidPlus page ID ≠ GeM bid sequential number (offset ~+1,790,000 as of Jun 2026).
// 9,420,000 ≈ Jun 2026 live frontier. Cron scans forward from here.
const DEFAULT_START_ID = 9_420_000

// IDs to scan per daily cron run. At concurrency=5 and 5s/timeout this fits in ~90s.
const SCAN_PER_RUN = 80

// Number of parallel fetches at once (5 is conservative for Vercel cron)
const CRON_CONCURRENCY = 5

// GeM base detail URL
const DETAIL_BASE = "https://bidplus.gem.gov.in/bidding/bid/getSinglePacketResultView/"

// Keywords that identify a fogging-related bid
const FOGGING_KEYWORDS = ["fogging", "fogger", "fog machine", "thermal fog", "cold fog"]

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-IN,en;q=0.9",
  Referer: "https://bidplus.gem.gov.in/all-bids",
}

// ─── HTML stripping ───────────────────────────────────────────────────────────

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|tr|td|th|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim()
}

function isFoggingPage(text: string): boolean {
  const lower = text.toLowerCase()
  return FOGGING_KEYWORDS.some(kw => lower.includes(kw))
}

// ─── Minimal bid parser ───────────────────────────────────────────────────────

function first(t: string, ...ps: RegExp[]): string | null {
  for (const p of ps) { const m = t.match(p); if (m?.[1]?.trim()) return m[1].trim() }
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

const STATES = ["Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chandigarh","Chhattisgarh",
  "Delhi","Goa","Gujarat","Haryana","Himachal Pradesh","Jammu and Kashmir","Jharkhand",
  "Karnataka","Kerala","Ladakh","Madhya Pradesh","Maharashtra","Manipur","Meghalaya",
  "Mizoram","Nagaland","Odisha","Puducherry","Punjab","Rajasthan","Sikkim","Tamil Nadu",
  "Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
].sort((a,b) => b.length - a.length)

function detectStatus(t: string): string {
  if (/L[-\s]?1\s*(Bidder|Firm)/i.test(t)) return "awarded"
  const s = (first(t, /(?:Bid\s*Status)\s*[:\-]\s*([^\n,]{1,30})/i) || "").toLowerCase()
  if (/award|conclud/.test(s)) return "awarded"
  if (/financial/.test(s)) return "financial_eval"
  if (/technical/.test(s)) return "technical_eval"
  if (/cancel/.test(s)) return "cancelled"
  return "published"
}

interface BidDoc {
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
  source: string
}

function parseBidText(text: string, numericId: string): BidDoc | null {
  const bidNum = text.match(/\b(GEM\/\d{4}\/[A-Z]+\/\d+)\b/i)?.[1]?.toUpperCase()
  if (!bidNum) return null

  let state = ""
  for (const s of STATES) { if (new RegExp(`\\b${s}\\b`, "i").test(text)) { state = s; break } }

  const dept = (first(text,
    /(?:Buyer(?:\s+Name)?|Organisation\s+Name|Consignee\s+Org(?:anization)?)\s*[:\-]\s*([^\n]+)/i,
  ) || "").replace(/\s+/g," ").trim()

  const product = (first(text,
    /(Fogging Machine[^\n]{0,80})/i,
    /(Fogger[^\n]{0,60})/i,
    /(?:Item|Product)\s*[:\-]?\s*([^\n]+)/i,
  ) || "").trim()

  const detectCat = (t: string) => {
    const l = t.toLowerCase()
    if (/vehicle.{0,20}fog|truck.{0,20}fog/.test(l)) return "vehicle_fogger"
    if (/mini.{0,10}fog/.test(l)) return "mini_fogger"
    if (/fog/.test(l)) return "thermal_fogger"
    return "thermal_fogger"
  }

  const qty = text.match(/(\d+)\s*(?:Nos?|nos?|Units?)\b/)?.[1]
  const DR = /(\d{1,2}[-\/]\d{1,2}[-\/]\d{4})/
  const pd = first(text, new RegExp(`(?:Bid\\s*(?:Publish|Start)\\s*Date)[:\\-\\s]+${DR.source}`,"i"))
  const ed = first(text, new RegExp(`(?:Bid\\s*(?:End|Close)\\s*Date)[:\\-\\s]+${DR.source}`,"i"))
  const ad = first(text, new RegExp(`(?:Award\\s*Date|RA\\s*Concluded)[:\\-\\s]+${DR.source}`,"i"))

  const l1n = (first(text, /L[-\s]?1\s*(?:Bidder|Firm|Supplier)[:\-\s]+([^\n]+)/i) || "").replace(/\s+/g," ")
  const l1p = (() => { const v = first(text, /L[-\s]?1[^\n]{0,30}₹\s*([\d,]+(?:\.\d+)?)/i); return v ? cleanMoney(v) : null })()
  const l2n = (first(text, /L[-\s]?2\s*(?:Bidder|Firm|Supplier)[:\-\s]+([^\n]+)/i) || "").replace(/\s+/g," ")
  const l2p = (() => { const v = first(text, /L[-\s]?2[^\n]{0,30}₹\s*([\d,]+(?:\.\d+)?)/i); return v ? cleanMoney(v) : null })()
  const l3n = (first(text, /L[-\s]?3\s*(?:Bidder|Firm|Supplier)[:\-\s]+([^\n]+)/i) || "").replace(/\s+/g," ")
  const l3p = (() => { const v = first(text, /L[-\s]?3[^\n]{0,30}₹\s*([\d,]+(?:\.\d+)?)/i); return v ? cleanMoney(v) : null })()
  const bdr = first(text, /(?:Total\s*(?:No\.?\s*of\s*)?Bidders?)[:\-\s]+(\d+)/i)

  const estMatch = text.match(/(?:Total\s*Estimated|Consignee\s*Estimated)\s*[:\-]?\s*₹?\s*([\d,]+(?:\.\d+)?)/i)
  const estVal = estMatch ? cleanMoney(estMatch[1]) : null

  return {
    bid_number: bidNum,
    department_name: dept,
    state,
    product_category: detectCat(product || text),
    product_name_raw: product,
    quantity: qty ? parseInt(qty) : null,
    estimated_value_inr: estVal,
    current_status: detectStatus(text),
    publish_date: pd ? normDate(pd) : null,
    bid_end_date:  ed ? normDate(ed) : null,
    award_date:    ad ? normDate(ad) : null,
    l1_dealer_name: l1n, l1_price_inr: l1p,
    l2_dealer_name: l2n, l2_price_inr: l2p,
    l3_dealer_name: l3n, l3_price_inr: l3p,
    total_bidders_count: bdr ? parseInt(bdr) : null,
    source: `gem_harvest_id_${numericId}`,
  }
}

// ─── Core scan function ───────────────────────────────────────────────────────

async function scanRange(
  from: number,
  count: number,
  concurrency: number,
  db: import("mongodb").Db,
  now: Date
): Promise<{
  scanned: number; found: number; saved: number; updated: number
  new_dealers: string[]; errors: number; last_id: number
}> {
  const stats = { scanned: 0, found: 0, saved: 0, updated: 0, new_dealers: [] as string[], errors: 0, last_id: from }

  // Process IDs in batches of `concurrency`
  for (let i = from; i < from + count; i += concurrency) {
    const batch = Array.from({ length: Math.min(concurrency, from + count - i) }, (_, j) => i + j)

    await Promise.all(batch.map(async (id) => {
      try {
        const res = await fetch(`${DETAIL_BASE}${id}`, {
          headers: FETCH_HEADERS,
          signal: AbortSignal.timeout(8000),
        })
        stats.scanned++
        if (!res.ok) return

        const html = await res.text()
        if (html.length < 300) return

        const text = htmlToText(html)
        if (!isFoggingPage(text)) return

        stats.found++
        const bid = parseBidText(text, String(id))
        if (!bid) return

        // Upsert bid
        const r = await db.collection("bid_lifecycle").updateOne(
          { bid_number: bid.bid_number },
          { $set: { ...bid, updated_at: now }, $setOnInsert: { created_at: now } },
          { upsert: true }
        )
        r.upsertedCount > 0 ? stats.saved++ : stats.updated++

        // Auto-detect dealers
        const dealers = [bid.l1_dealer_name, bid.l2_dealer_name, bid.l3_dealer_name].filter(Boolean)
        const existing = new Set(await db.collection("proc_dealers").distinct("canonical_name", { canonical_name: { $in: dealers } }))
        for (const name of dealers) {
          if (existing.has(name)) continue
          await db.collection("proc_dealers").updateOne(
            { canonical_name: name },
            { $set: { canonical_name: name, enrichment_status: "stub", source: "auto_harvest", updated_at: now },
              $setOnInsert: { created_at: now } },
            { upsert: true }
          )
          stats.new_dealers.push(name)
        }
      } catch {
        stats.errors++
      }
    }))

    // Small pause between batches to be respectful
    await new Promise(r => setTimeout(r, 300))
  }

  stats.last_id = from + count - 1
  return stats
}

// ─── Route handlers ───────────────────────────────────────────────────────────

// GET — called by Vercel cron
export async function GET(req: NextRequest) {
  // Verify this is a Vercel cron call or internal request
  const authHeader = req.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // Still allow GET from admin (no auth header) — just don't run the scan
    // Only block non-cron external requests
    const referer = req.headers.get("referer") || ""
    if (!referer.includes(process.env.NEXTAUTH_URL || "localhost")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  try {
    const db = (await clientPromise).db()

    // Get or initialize state
    const existingState = await db.collection("harvester_state").findOne({ key: "singleton" })
    if (!existingState) {
      await db.collection("harvester_state").insertOne({
        key: "singleton",
        last_scanned_id: DEFAULT_START_ID,
        total_scanned: 0,
        total_fogging_found: 0,
        last_run_at: null,
        last_run_scanned: 0,
        last_run_found: 0,
        new_dealers_last_run: [],
        running: false,
        running_since: null,
      })
    }

    const state = existingState || await db.collection("harvester_state").findOne({ key: "singleton" })
    if (!state) throw new Error("Failed to init harvester_state")

    const now = new Date()

    // Prevent concurrent runs — auto-clear stale locks (Vercel can kill without cleanup)
    if (state.running) {
      const since = state.running_since ? new Date(state.running_since as string) : null
      const ageMs = since ? now.getTime() - since.getTime() : Infinity
      if (ageMs < 3 * 60 * 1000) {
        return NextResponse.json({ skipped: true, reason: "Already running" })
      }
      // Lock is stale (> 3 min with no completion) — auto-reset and proceed
    }

    await db.collection("harvester_state").updateOne(
      { key: "singleton" },
      { $set: { running: true, running_since: now } }
    )

    const from = (state.last_scanned_id as number) + 1

    const result = await scanRange(from, SCAN_PER_RUN, CRON_CONCURRENCY, db, now)

    // Update state
    await db.collection("harvester_state").updateOne(
      { key: "singleton" },
      {
        $set: {
          last_scanned_id: result.last_id,
          last_run_at: now,
          last_run_scanned: result.scanned,
          last_run_found: result.found,
          new_dealers_last_run: result.new_dealers,
          running: false,
          running_since: null,
        },
        $inc: {
          total_scanned: result.scanned,
          total_fogging_found: result.found,
        },
      }
    )

    return NextResponse.json({
      ok: true,
      run_at: now.toISOString(),
      scanned: result.scanned,
      fogging_found: result.found,
      saved: result.saved,
      updated: result.updated,
      new_dealers: result.new_dealers,
      errors: result.errors,
      id_range: `${from} – ${result.last_id}`,
    })
  } catch (err) {
    // Reset running flag on error
    try {
      const db = (await clientPromise).db()
      await db.collection("harvester_state").updateOne({ key: "singleton" }, { $set: { running: false, running_since: null } })
    } catch { /* ignore */ }
    console.error("harvest GET error:", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// POST — manual trigger and admin actions
export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, "procurement.batch_collect.run")
  if (!("user" in auth)) return auth

  try {
    const body = await req.json()
    const db = (await clientPromise).db()

    if (body.action === "status") {
      const state = await db.collection("harvester_state").findOne({ key: "singleton" })
      const totalBids = await db.collection("bid_lifecycle").countDocuments()
      const totalDealers = await db.collection("proc_dealers").countDocuments()
      return NextResponse.json(JSON.parse(JSON.stringify({ state, totalBids, totalDealers })))
    }

    if (body.action === "reset") {
      await db.collection("harvester_state").updateOne(
        { key: "singleton" },
        { $set: { running: false, running_since: null } },
        { upsert: true }
      )
      return NextResponse.json({ ok: true, reset: true })
    }

    if (body.action === "reset_position") {
      if (typeof body.to !== "number")
        return NextResponse.json({ error: "to (number) required" }, { status: 400 })
      await db.collection("harvester_state").updateOne(
        { key: "singleton" },
        { $set: { last_scanned_id: body.to } },
        { upsert: true }
      )
      return NextResponse.json({ ok: true, new_position: body.to })
    }

    if (body.action === "scan") {
      const from: number = body.from
      const to: number   = body.to
      const concurrency  = Math.min(body.concurrency || 10, 20)
      if (!from || !to || from >= to)
        return NextResponse.json({ error: "from and to (numbers) required, from < to" }, { status: 400 })
      if (to - from > 5000)
        return NextResponse.json({ error: "Range too large for single API call (max 5000). Use the local harvest script for large ranges." }, { status: 400 })

      const now = new Date()
      const result = await scanRange(from, to - from, concurrency, db, now)

      return NextResponse.json(JSON.parse(JSON.stringify({
        ok: true,
        scanned: result.scanned,
        fogging_found: result.found,
        saved: result.saved,
        updated: result.updated,
        new_dealers: result.new_dealers,
        errors: result.errors,
        id_range: `${from} – ${result.last_id}`,
      })))
    }

    return NextResponse.json({ error: "Unknown action. Use: status | scan | reset_position" }, { status: 400 })
  } catch (err) {
    console.error("harvest POST error:", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
