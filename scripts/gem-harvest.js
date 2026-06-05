#!/usr/bin/env node
/**
 * gem-harvest.js — GeM Procurement Autonomous Harvester
 *
 * Scans sequential getSinglePacketResultView IDs on GeM BidPlus.
 * These pages are fully server-rendered — no browser required.
 * Filters for fogging-related bids and saves them to the database.
 *
 * Usage:
 *   node scripts/gem-harvest.js                       # scan default range (Jan 2025 → present)
 *   node scripts/gem-harvest.js --from=7150000        # scan from specific ID
 *   node scripts/gem-harvest.js --from=7150000 --to=7580000
 *   node scripts/gem-harvest.js --from=9000000 --max-bids=500
 *   node scripts/gem-harvest.js --concurrency=30      # more parallel fetches (faster)
 *   node scripts/gem-harvest.js --dry-run             # scan but don't save
 *   node scripts/gem-harvest.js --resume              # force-resume from checkpoint
 *   node scripts/gem-harvest.js --no-resume           # ignore checkpoint, fresh start
 *
 * Checkpointing:
 *   Progress is saved to scripts/gem-harvest-checkpoint.json every 500 IDs and
 *   on every bid found. If the script is interrupted (Ctrl+C, crash, power loss),
 *   re-running with the same --from/--to will auto-resume from the checkpoint.
 *   The checkpoint is deleted automatically on successful completion.
 *
 * Environment:
 *   MONGODB_URI     — from .env.local (auto-loaded if dotenv installed)
 *
 * ID range guide (empirically verified 2026-06-05):
 *   Rate: ~4,000 IDs/day ≈ 120,000 IDs/month (consistent across all probe points)
 *
 *   IMPORTANT: BidPlus page IDs are NOT the same as GeM bid sequential numbers.
 *   The XXXXXXX in GEM/YYYY/B/XXXXXXX is a separate sequence; BidPlus page IDs
 *   run ~1,790,000 higher than bid seq numbers as of Jun 2026.
 *
 *   Confirmed probe points (live-fetched 2026-06-05):
 *   6,000,000 = Feb 2024   (GEM/2024/B/4578631)
 *   6,500,000 = Jun 2024   (GEM/2024/B/5032439)
 *   7,000,000 = Oct 2024   (GEM/2024/B/5484709)
 *   7,150,000 = Nov 2024   (GEM/2024/B/5618858)
 *   7,500,000 = Feb 2025   (GEM/2025/B/5930085)
 *   7,580,000 = Feb 2025   (GEM/2025/B/6000670)
 *   8,200,000 = Sep 2025   (GEM/2025/B/6550855)
 *   8,500,000 = Oct 2025   (GEM/2025/R/564557)
 *   9,000,000 = Feb 2026   (GEM/2026/B/7251453)
 *   9,200,000 = Apr 2026   (GEM/2026/B/7423722)
 *   9,400,000 = May-Jun 2026 (GEM/2026/B/7603255)
 *   9,450,000+= not yet live
 *
 *   Year coverage ranges:
 *   2024 full year : ~5,600,000 → ~7,280,000  (~1.68M IDs)
 *   2025 full year : ~7,400,000 → ~8,820,000  (~1.42M IDs)
 *   2026 Jan-Jun   : ~8,860,000 → ~9,420,000  (~560K IDs)
 *
 * NOTE: Vercel-based harvest does NOT work — GeM blocks datacenter IPs.
 * This script must run locally on a real machine.
 *
 * Recommended phased backfill (Jan 2025 → Jun 2026, ~2M IDs total):
 *   Phase A: node scripts/gem-harvest.js --from=7400000 --to=8200000 --concurrency=30  (~800K IDs, 7-9 hrs)
 *   Phase B: node scripts/gem-harvest.js --from=8200000 --to=8900000 --concurrency=30  (~700K IDs, 6-8 hrs)
 *   Phase C: node scripts/gem-harvest.js --from=8900000 --to=9420000 --concurrency=30  (~520K IDs, 4-6 hrs)
 *
 * Expected total yield: 65-175 genuine fogging bids, 20-60 dealer stubs.
 */

"use strict"

const https = require("https")
const http  = require("http")
const fs    = require("fs")
const path  = require("path")

// ─── Load env ─────────────────────────────────────────────────────────────────

let MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) {
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

// No safe single default — always pass explicit --from/--to for backfill phases.
// Phase A: --from=7400000 --to=8200000  (Jan-Sep 2025, ~800K IDs)
// Phase B: --from=8200000 --to=8900000  (Sep 2025-Jan 2026, ~700K IDs)
// Phase C: --from=8900000 --to=9420000  (Jan-Jun 2026, ~520K IDs)
const FROM        = parseInt(args.from || "9420000")
const TO          = parseInt(args.to   || "9430000")
const CONCURRENCY = Math.min(parseInt(args.concurrency || "20"), 50)
const MAX_BIDS    = parseInt(args["max-bids"] || "9999999")
const DRY_RUN     = args["dry-run"] === true
const VERBOSE     = args["verbose"] === true
const BATCH_DELAY = parseInt(args["delay-ms"] || "200")
const NO_RESUME   = args["no-resume"] === true

const KEYWORDS   = ["fogging", "fogger", "fog machine", "thermal fog", "cold fog"]
const DETAIL_BASE = "https://bidplus.gem.gov.in/bidding/bid/getSinglePacketResultView/"

// ─── Checkpointing ────────────────────────────────────────────────────────────

const CHECKPOINT_FILE     = path.join(__dirname, "gem-harvest-checkpoint.json")
const CHECKPOINT_INTERVAL = 500 // save every N IDs scanned

function loadCheckpoint() {
  if (NO_RESUME)             return null
  if (!fs.existsSync(CHECKPOINT_FILE)) return null
  try {
    const cp = JSON.parse(fs.readFileSync(CHECKPOINT_FILE, "utf8"))
    // Only resume if the range matches
    if (cp.from !== FROM || cp.to !== TO) {
      console.log(` [checkpoint] Range mismatch (cp: ${cp.from}→${cp.to}, current: ${FROM}→${TO}) — ignoring checkpoint.`)
      return null
    }
    return cp
  } catch {
    return null
  }
}

function saveCheckpoint(data) {
  if (DRY_RUN) return
  try {
    fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify({ ...data, savedAt: new Date().toISOString() }, null, 2))
  } catch (e) {
    console.error("\n [checkpoint] WARN: failed to save checkpoint:", e.message)
  }
}

function deleteCheckpoint() {
  try {
    if (fs.existsSync(CHECKPOINT_FILE)) fs.unlinkSync(CHECKPOINT_FILE)
  } catch { /* ignore */ }
}

// ─── HTTP fetch ───────────────────────────────────────────────────────────────

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

const SELLER_LINE_RE = /[^\n]*\b(?:PRIVATE\s+LIMITED|PVT\.?\s*LTD\.?|LTD\.?|LLP|ENTERPRISES|INDUSTRIES|TRADERS|AGENCIES|ELECTRICALS?|SOLUTIONS?|SYSTEMS?|CORPORATION|CORP\.?)\b[^\n]*/gi

function isFogging(text) {
  if (!KEYWORDS.some(k => text.toLowerCase().includes(k))) return false
  const stripped = text.replace(SELLER_LINE_RE, " ")
  return KEYWORDS.some(k => stripped.toLowerCase().includes(k))
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

  const COMPANY_RE = /\b(?:PRIVATE\s+LIMITED|PVT\.?\s*LTD\.?|LTD\.?|LLP|ENTERPRISES|INDUSTRIES|TRADERS|AGENCIES)\b/i
  const productLine = (() => {
    const labeled = first(text,
      /(?:Item(?:\s+Description)?|Product(?:\s+(?:Description|Name))?)\s*[:\-]\s*([^\n]{3,80})/i,
      /(?:Item|Product)\s*[:\-]\s*([^\n]{3,80})/i,
    )
    if (labeled && !COMPANY_RE.test(labeled)) return labeled.trim()
    const kw = first(text,
      /(Fogging Machine[^\n]{0,80})/i,
      /((?:Thermal\s+)?Fogger[^\n]{0,60})/i,
    )
    if (kw && !COMPANY_RE.test(kw)) return kw.trim()
    return ""
  })()

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

  // ── Load or init checkpoint ──────────────────────────────────────────────────
  const checkpoint = loadCheckpoint()
  let resumeFrom = FROM
  let scanned  = 0
  let found    = 0
  let saved    = 0
  let updated  = 0
  let errors   = 0
  const newDealers = []
  const foundBids  = []

  if (checkpoint) {
    resumeFrom = checkpoint.nextId
    scanned    = checkpoint.scanned  || 0
    found      = checkpoint.found    || 0
    saved      = checkpoint.saved    || 0
    updated    = checkpoint.updated  || 0
    errors     = checkpoint.errors   || 0
    newDealers.push(...(checkpoint.newDealers || []))
    foundBids.push(...(checkpoint.foundBids   || []))
    console.log(`\n RESUMING from checkpoint — last saved at ID ${checkpoint.nextId - 1} (${checkpoint.savedAt})`)
    console.log(` Progress so far: ${scanned.toLocaleString()} scanned, ${found} bids found`)
  }

  console.log(`\n${"═".repeat(60)}`)
  console.log(` GeM Fogging Bid Harvester`)
  console.log(` Range:       ${FROM.toLocaleString()} → ${TO.toLocaleString()} (${total.toLocaleString()} total IDs)`)
  if (checkpoint) {
  console.log(` Resuming at: ${resumeFrom.toLocaleString()} (${(resumeFrom - FROM).toLocaleString()} already done)`)
  }
  console.log(` Concurrency: ${CONCURRENCY} | Delay: ${BATCH_DELAY}ms | Dry-run: ${DRY_RUN}`)
  console.log(` Keywords:    ${KEYWORDS.join(", ")}`)
  console.log(` Checkpoint:  ${CHECKPOINT_FILE}`)
  if (!DRY_RUN) console.log(` Database:    ${MONGODB_URI.replace(/:[^:@]+@/, ":***@")}`)
  console.log(`${"═".repeat(60)}\n`)

  const overallStart = Date.now() - (checkpoint?.elapsedMs || 0)

  // ── Graceful shutdown handler ─────────────────────────────────────────────────
  let shuttingDown = false
  const shutdown = (signal) => {
    if (shuttingDown) return
    shuttingDown = true
    console.log(`\n\n [${signal}] Saving checkpoint before exit...`)
    saveCheckpoint({ from: FROM, to: TO, nextId: currentId + 1, scanned, found, saved, updated, errors, newDealers, foundBids, elapsedMs: Date.now() - overallStart })
    console.log(` Checkpoint saved → ${CHECKPOINT_FILE}`)
    console.log(` Resume with: node scripts/gem-harvest.js --from=${FROM} --to=${TO} --concurrency=${CONCURRENCY}`)
    if (mongoClient) mongoClient.close().catch(() => {})
    process.exit(0)
  }
  process.on("SIGINT",  () => shutdown("SIGINT"))
  process.on("SIGTERM", () => shutdown("SIGTERM"))
  process.on("SIGHUP",  () => shutdown("SIGHUP"))
  process.on("uncaughtException", (err) => {
    console.error("\n [uncaughtException]", err.message)
    shutdown("uncaughtException")
  })

  // ── Scan loop ─────────────────────────────────────────────────────────────────
  let currentId = resumeFrom
  let lastCheckpointAt = scanned

  for (let i = resumeFrom; i < TO && found < MAX_BIDS && !shuttingDown; i += CONCURRENCY) {
    currentId = i
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
    currentId = i + CONCURRENCY - 1

    for (const result of results) {
      if (!result) continue
      found++
      foundBids.push(result.bid.bid_number)

      if (VERBOSE) {
        console.log(`\n ── BID #${found} (ID ${result.id}) ──`)
        console.log(JSON.stringify(result.bid, null, 2))
      }

      if (!DRY_RUN) {
        const op = await saveBid(result.bid)
        op === "created" ? saved++ : updated++
        const dealers = await autoDetectDealers([
          result.bid.l1_dealer_name,
          result.bid.l2_dealer_name,
          result.bid.l3_dealer_name,
        ])
        newDealers.push(...dealers)

        // Save checkpoint after every bid found
        saveCheckpoint({ from: FROM, to: TO, nextId: i + CONCURRENCY, scanned, found, saved, updated, errors, newDealers, foundBids, elapsedMs: Date.now() - overallStart })
        lastCheckpointAt = scanned
      }
    }

    // Periodic checkpoint every CHECKPOINT_INTERVAL IDs regardless of bid finds
    if (!DRY_RUN && scanned - lastCheckpointAt >= CHECKPOINT_INTERVAL) {
      saveCheckpoint({ from: FROM, to: TO, nextId: i + CONCURRENCY, scanned, found, saved, updated, errors, newDealers, foundBids, elapsedMs: Date.now() - overallStart })
      lastCheckpointAt = scanned
    }

    // Progress display
    const elapsed = (Date.now() - overallStart) / 1000
    const rate    = elapsed > 0 ? scanned / elapsed : 0
    const remaining = TO - (i + CONCURRENCY)
    const eta     = rate > 0 && remaining > 0 ? Math.round(remaining / rate) : 0
    const pct     = ((scanned / total) * 100).toFixed(1)
    process.stdout.write(
      `\r [${pct}%] Scanned: ${scanned.toLocaleString()}/${total.toLocaleString()} | ` +
      `Bids: ${found} | Saved: ${saved} | New dealers: ${newDealers.length} | ` +
      `Rate: ${rate.toFixed(0)}/s | ETA: ${Math.floor(eta/60)}m${eta%60}s  `
    )

    await new Promise(r => setTimeout(r, BATCH_DELAY))
  }

  // ── Final summary ─────────────────────────────────────────────────────────────
  const elapsed = ((Date.now() - overallStart) / 1000).toFixed(0)
  console.log(`\n\n${"═".repeat(60)}`)
  console.log(` HARVEST COMPLETE`)
  console.log(`${"═".repeat(60)}`)
  console.log(` Scanned:      ${scanned.toLocaleString()} IDs`)
  console.log(` Fogging bids: ${found}`)
  console.log(` Saved (new):  ${saved}`)
  console.log(` Updated:      ${updated}`)
  console.log(` New dealers:  ${newDealers.length}`)
  console.log(` Errors:       ${errors}`)
  console.log(` Time:         ${Math.floor(elapsed/60)}m${elapsed%60}s`)
  if (foundBids.length > 0) {
    console.log(`\n Bids found:`)
    foundBids.forEach(b => console.log(`   ${b}`))
  }
  if (newDealers.length > 0) {
    console.log(`\n New dealers auto-created:`)
    newDealers.forEach(d => console.log(`   ${d}`))
  }
  console.log(`${"═".repeat(60)}\n`)

  // Delete checkpoint on clean completion
  deleteCheckpoint()

  if (mongoClient) await mongoClient.close()
}

main().catch(err => {
  console.error("\nFATAL:", err.message)
  if (mongoClient) mongoClient.close().catch(() => {})
  process.exit(1)
})
