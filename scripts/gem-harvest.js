#!/usr/bin/env node
/**
 * gem-harvest.js — GeM Procurement Autonomous Harvester
 *
 * Scans sequential getSinglePacketResultView IDs on GeM BidPlus.
 * These pages are fully server-rendered — no browser required.
 * Filters for fogging-related bids and saves them to the database.
 *
 * Usage:
 *   node scripts/gem-harvest.js                       # scan default range (last 30 days)
 *   node scripts/gem-harvest.js --from=8000000        # scan from specific ID
 *   node scripts/gem-harvest.js --from=8000000 --to=9500000
 *   node scripts/gem-harvest.js --from=9000000 --max-bids=500
 *   node scripts/gem-harvest.js --concurrency=30      # more parallel fetches (faster)
 *   node scripts/gem-harvest.js --dry-run             # scan but don't save
 *
 * Environment:
 *   MONGODB_URI     — from .env.local (auto-loaded if dotenv installed)
 *   SITE_URL        — optional, for API mode instead of direct DB
 *
 * ID range guide (approximate):
 *   6,000,000 = Feb 2024
 *   7,000,000 = Jul 2024
 *   8,500,000 = Jun 2025
 *   9,000,000 = Feb 2026
 *   9,500,000 = Jun 2026 (current)
 *
 * Recommended first run for 2025-2026 backfill:
 *   node scripts/gem-harvest.js --from=8500000 --to=9500000 --max-bids=500
 *
 * Expected time: 3-6 hours depending on connection speed.
 * Expected yield: 400-700 fogging bids from the 2025-present range.
 */

"use strict"

const https = require("https")
const http = require("http")

// ─── Load env ─────────────────────────────────────────────────────────────────

let MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) {
  const fs = require("fs")
  const path = require("path")
  const envPath = path.join(__dirname, "..", ".env.local")
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf8").split("\n")
    for (const line of lines) {
      const [k, ...vParts] = line.split("=")
      if (k?.trim() === "MONGODB_URI") {
        MONGODB_URI = vParts.join("=").trim()
        break
      }
    }
  }
}

if (!MONGODB_URI) {
  console.error("ERROR: MONGODB_URI not found in environment or .env.local")
  process.exit(1)
}

// ─── Parse CLI args ───────────────────────────────────────────────────────────

const args = {}
for (const arg of process.argv.slice(2)) {
  if (arg.startsWith("--")) {
    const [k, v] = arg.slice(2).split("=")
    args[k] = v === undefined ? true : v
  }
}

// Default range: IDs 9,200,000 to 9,500,000 (~Jan 2026 to present)
const FROM        = parseInt(args.from || "9200000")
const TO          = parseInt(args.to || "9500000")
const CONCURRENCY = Math.min(parseInt(args.concurrency || "20"), 50)
const MAX_BIDS    = parseInt(args["max-bids"] || "9999999")
const DRY_RUN     = args["dry-run"] === true
const BATCH_DELAY = parseInt(args["delay-ms"] || "200") // ms between concurrent batches

const KEYWORDS = ["fogging", "fogger", "fog machine", "thermal fog", "cold fog"]
const DETAIL_BASE = "https://bidplus.gem.gov.in/bidding/bid/getSinglePacketResultView/"

// ─── HTTP fetch (no external deps) ───────────────────────────────────────────

function fetchPage(id) {
  return new Promise((resolve) => {
    const url = `${DETAIL_BASE}${id}`
    const mod = url.startsWith("https") ? https : http
    const options = {
      timeout: 10000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-IN,en;q=0.9",
        "Referer": "https://bidplus.gem.gov.in/all-bids",
      }
    }
    const req = mod.get(url, options, (res) => {
      if (res.statusCode !== 200) { res.resume(); return resolve(null) }
      const chunks = []
      res.on("data", c => chunks.push(c))
      res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")))
      res.on("error", () => resolve(null))
    })
    req.on("error", () => resolve(null))
    req.on("timeout", () => { req.destroy(); resolve(null) })
  })
}

// ─── HTML → plain text ────────────────────────────────────────────────────────

function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|tr|td|th|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim()
}

function isFogging(text) {
  const l = text.toLowerCase()
  return KEYWORDS.some(k => l.includes(k))
}

// ─── Bid parser ───────────────────────────────────────────────────────────────

const STATES = ["Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chandigarh","Chhattisgarh",
  "Delhi","Goa","Gujarat","Haryana","Himachal Pradesh","Jammu and Kashmir","Jharkhand",
  "Karnataka","Kerala","Ladakh","Madhya Pradesh","Maharashtra","Manipur","Meghalaya",
  "Mizoram","Nagaland","Odisha","Puducherry","Punjab","Rajasthan","Sikkim","Tamil Nadu",
  "Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
].sort((a,b) => b.length - a.length)

function first(t, ...ps) {
  for (const p of ps) { const m = t.match(p); if (m?.[1]?.trim()) return m[1].trim() }
  return null
}

function cleanMoney(s) {
  const n = Number(String(s).replace(/[₹,\s]/g,"").replace(/\.\d+$/,""))
  return isNaN(n) || n <= 0 ? null : n
}

function normDate(s) {
  const m = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/)
  return m ? `${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}` : s
}

function parseBid(text, numericId) {
  const bidMatch = text.match(/\b(GEM\/\d{4}\/[A-Z]+\/\d+)\b/i)
  if (!bidMatch) return null
  const bid_number = bidMatch[1].toUpperCase()

  let state = ""
  for (const s of STATES) { if (new RegExp(`\\b${s}\\b`,"i").test(text)) { state = s; break } }

  const dept = (first(text,
    /(?:Buyer(?:\s+Name)?|Organisation\s+Name|Consignee\s+Org)\s*[:\-]\s*([^\n]+)/i,
    /(?:Department)\s*[:\-]\s*([^\n]+)/i,
  ) || "").replace(/\s+/g," ").trim()

  const productLine = (first(text,
    /(Fogging Machine[^\n]{0,80})/i,
    /(Fogger[^\n]{0,60})/i,
    /(?:Item|Product)\s*[:\-]?\s*([^\n]+)/i,
  ) || "").trim()

  const cat = (() => {
    const l = (productLine || text).toLowerCase()
    if (/vehicle.{0,20}fog|truck.{0,20}fog/.test(l)) return "vehicle_fogger"
    if (/mini.{0,10}fog/.test(l)) return "mini_fogger"
    return "thermal_fogger"
  })()

  const qty = text.match(/(\d+)\s*(?:Nos?|nos?|Units?)\b/)?.[1]
  const DR  = "(?:(?:\\d{1,2})[-\\/](?:\\d{1,2})[-\\/](?:\\d{4}))"
  const pd  = first(text, new RegExp(`(?:Bid\\s*(?:Publish|Start)\\s*Date)[:\\-\\s]+(${DR})`,"i"))
  const ed  = first(text, new RegExp(`(?:Bid\\s*(?:End|Close)\\s*Date)[:\\-\\s]+(${DR})`,"i"))
  const ad  = first(text, new RegExp(`(?:Award\\s*Date|RA\\s*Concluded)[:\\-\\s]+(${DR})`,"i"))

  const status = (() => {
    if (/L[-\s]?1\s*(Bidder|Firm)/i.test(text)) return "awarded"
    const s = (first(text,/(?:Bid\s*Status)\s*[:\-]\s*([^\n,]{1,30})/i)||"").toLowerCase()
    if (/award|conclud/.test(s)) return "awarded"
    if (/financial/.test(s)) return "financial_eval"
    if (/technical/.test(s)) return "technical_eval"
    if (/cancel/.test(s)) return "cancelled"
    return "published"
  })()

  const l1n = (first(text, /L[-\s]?1\s*(?:Bidder|Firm|Supplier)[:\-\s]+([^\n]+)/i)||"").replace(/\s+/g," ")
  const l1p = (() => { const v = first(text, /L[-\s]?1[^\n]{0,30}₹\s*([\d,]+(?:\.\d+)?)/i); return v ? cleanMoney(v) : null })()
  const l2n = (first(text, /L[-\s]?2\s*(?:Bidder|Firm|Supplier)[:\-\s]+([^\n]+)/i)||"").replace(/\s+/g," ")
  const l2p = (() => { const v = first(text, /L[-\s]?2[^\n]{0,30}₹\s*([\d,]+(?:\.\d+)?)/i); return v ? cleanMoney(v) : null })()
  const l3n = (first(text, /L[-\s]?3\s*(?:Bidder|Firm|Supplier)[:\-\s]+([^\n]+)/i)||"").replace(/\s+/g," ")
  const l3p = (() => { const v = first(text, /L[-\s]?3[^\n]{0,30}₹\s*([\d,]+(?:\.\d+)?)/i); return v ? cleanMoney(v) : null })()
  const bdr = first(text, /(?:Total\s*(?:No\.?\s*of\s*)?Bidders?)[:\-\s]+(\d+)/i)
  const est = (() => { const m = text.match(/(?:Total\s*Estimated|Consignee\s*Estimated)[:\-]?\s*₹?\s*([\d,]+(?:\.\d+)?)/i); return m ? cleanMoney(m[1]) : null })()

  return {
    bid_number, department_name: dept, state,
    product_category: cat, product_name_raw: productLine,
    quantity: qty ? parseInt(qty) : null, estimated_value_inr: est,
    current_status: status,
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

// ─── MongoDB writer ───────────────────────────────────────────────────────────

let mongoClient = null

async function getDb() {
  if (!mongoClient) {
    const { MongoClient } = require("mongodb")
    mongoClient = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 8000 })
    await mongoClient.connect()
  }
  return mongoClient.db()
}

async function saveBid(bid) {
  const db = await getDb()
  const now = new Date()
  const r = await db.collection("bid_lifecycle").updateOne(
    { bid_number: bid.bid_number },
    { $set: { ...bid, updated_at: now }, $setOnInsert: { created_at: now } },
    { upsert: true }
  )
  return r.upsertedCount > 0 ? "created" : "updated"
}

async function autoDetectDealers(names) {
  const db = await getDb()
  const now = new Date()
  const valid = names.filter(Boolean)
  if (!valid.length) return []
  const existing = new Set(
    await db.collection("proc_dealers").distinct("canonical_name", { canonical_name: { $in: valid } })
  )
  const newOnes = []
  for (const name of valid) {
    if (existing.has(name)) continue
    await db.collection("proc_dealers").updateOne(
      { canonical_name: name },
      { $set: { canonical_name: name, enrichment_status: "stub", source: "auto_harvest", updated_at: now },
        $setOnInsert: { created_at: now } },
      { upsert: true }
    )
    newOnes.push(name)
  }
  return newOnes
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const total = TO - FROM
  console.log(`\n${"═".repeat(60)}`)
  console.log(` GeM Fogging Bid Harvester`)
  console.log(` Scanning IDs: ${FROM.toLocaleString()} → ${TO.toLocaleString()} (${total.toLocaleString()} IDs)`)
  console.log(` Concurrency: ${CONCURRENCY} | Delay: ${BATCH_DELAY}ms | Dry-run: ${DRY_RUN}`)
  console.log(` Keywords: ${KEYWORDS.join(", ")}`)
  if (!DRY_RUN) console.log(` Database: ${MONGODB_URI.replace(/:[^:@]+@/, ":***@")}`)
  console.log(`${"═".repeat(60)}\n`)

  const startTime = Date.now()
  let scanned = 0, found = 0, saved = 0, updated = 0, errors = 0
  const newDealers = []
  const foundBids = []

  for (let i = FROM; i < TO && found < MAX_BIDS; i += CONCURRENCY) {
    const batch = Array.from({ length: Math.min(CONCURRENCY, TO - i) }, (_, j) => i + j)

    const results = await Promise.all(batch.map(async (id) => {
      try {
        const html = await fetchPage(id)
        if (!html || html.length < 200) return null
        const text = htmlToText(html)
        if (!isFogging(text)) return null
        const bid = parseBid(text, String(id))
        if (!bid) return null
        return { id, bid }
      } catch {
        errors++
        return null
      }
    }))

    scanned += batch.length

    for (const result of results) {
      if (!result) continue
      found++
      foundBids.push(result.bid.bid_number)

      if (!DRY_RUN) {
        const op = await saveBid(result.bid)
        op === "created" ? saved++ : updated++
        const dealers = await autoDetectDealers([
          result.bid.l1_dealer_name,
          result.bid.l2_dealer_name,
          result.bid.l3_dealer_name,
        ])
        newDealers.push(...dealers)
      }
    }

    // Progress log every 1000 IDs
    if (scanned % 1000 < CONCURRENCY || found > 0 && found % 10 === 0) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)
      const rate = (scanned / ((Date.now() - startTime) / 1000)).toFixed(1)
      const remaining = TO - (i + CONCURRENCY)
      const eta = remaining > 0 ? Math.round(remaining / parseFloat(rate)) : 0
      process.stdout.write(
        `\r Scanned: ${scanned.toLocaleString()}/${total.toLocaleString()} | ` +
        `Fogging: ${found} | Saved: ${saved} | ` +
        `Rate: ${rate}/s | ETA: ${Math.floor(eta/60)}m${eta%60}s  `
      )
    }

    await new Promise(r => setTimeout(r, BATCH_DELAY))
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)
  console.log(`\n\n${"═".repeat(60)}`)
  console.log(` HARVEST COMPLETE`)
  console.log(`${"═".repeat(60)}`)
  console.log(` Scanned:      ${scanned.toLocaleString()} IDs`)
  console.log(` Fogging bids: ${found}`)
  console.log(` Saved (new):  ${saved}`)
  console.log(` Updated:      ${updated}`)
  console.log(` New dealers:  ${newDealers.length}`)
  console.log(` Errors:       ${errors}`)
  console.log(` Time:         ${elapsed}s`)
  if (foundBids.length > 0) {
    console.log(`\n Bids found:`)
    foundBids.forEach(b => console.log(`   ${b}`))
  }
  if (newDealers.length > 0) {
    console.log(`\n New dealers auto-created:`)
    newDealers.forEach(d => console.log(`   ${d}`))
  }
  console.log(`${"═".repeat(60)}\n`)

  if (mongoClient) await mongoClient.close()
}

main().catch(err => {
  console.error("\nFATAL:", err.message)
  if (mongoClient) mongoClient.close().catch(() => {})
  process.exit(1)
})
