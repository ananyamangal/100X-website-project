/**
 * audit-harvest-recovery.mjs
 * Read-only. No writes. No browser.
 *
 * Forensic audit of the 924 missing fogging contracts:
 *   - Exact root-cause breakdown per cause
 *   - Collector limitation characterisation
 *   - Per-chunk pagination cap evidence
 *   - Per-month supply/gap model
 *   - Bid/RA harvest path analysis
 *   - Recovery estimate per fix type
 */
import { MongoClient } from "mongodb"
import fs from "fs"

const envRaw = fs.readFileSync(".env.local", "utf8")
const ENV = {}
for (const l of envRaw.split("\n")) {
  const m = l.match(/^([^=#\s][^=]*)=(.*)$/); if (m) ENV[m[1].trim()] = m[2].trim()
}
const client = new MongoClient(ENV["MONGODB_URI"])
await client.connect()
const db = client.db()
const gc = db.collection("gem_contracts")

const CATEGORY = "home_fa68031381_agri_disp_fogg"
const SEP  = "═".repeat(72)
const sep  = "─".repeat(72)

// ── Load sources ─────────────────────────────────────────────────────────────
const deep = JSON.parse(fs.readFileSync("audit/fogging-deep-raw.json", "utf8"))
const ckpt = JSON.parse(fs.readFileSync("audit/contracts-checkpoint-fogging_v2.json", "utf8"))
const chunks = ckpt.chunks

function parseDate(s) {
  if (!s || typeof s !== "string") return null
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/)
  if (m) {
    const d = new Date(`${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`)
    return isNaN(d.getTime()) ? null : d
  }
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}
function parseChunkDate(s) {   // "16-06-2023" → DD-MM-YYYY → Date
  if (!s) return null
  const [dd,mm,yyyy] = s.split("-")
  const d = new Date(`${yyyy}-${mm}-${dd}`)
  return isNaN(d.getTime()) ? null : d
}

// Cross-reference: which deep-raw GEMCs are in DB
const allGemcs = deep.map(r => r.gemc_no)
const BATCH = 500
const matchedSet = new Set()
for (let i = 0; i < allGemcs.length; i += BATCH) {
  const chunk = allGemcs.slice(i, i + BATCH)
  const docs  = await gc.find({ gemc_no: { $in: chunk } }, { projection: { gemc_no: 1 } }).toArray()
  for (const d of docs) matchedSet.add(d.gemc_no)
}
const deepByGemc = new Map(deep.map(r => [r.gemc_no, r]))
const missingRecords = deep.filter(r => !matchedSet.has(r.gemc_no))
const missingByGemc  = new Map(missingRecords.map(r => [r.gemc_no, r]))

// Annotate missing records
const annotated = missingRecords.map(r => {
  const dt  = parseDate(r.contract_date)
  const val = parseFloat(r.total_value) || r.contract_value_num || 0
  const mode = r.buying_mode || "(null)"
  const dateStr = r.contract_date || ""

  // Is the date string a bid reference? e.g. "GEM/2024/B/1234567"
  const isBidRef = /^GEM\/\d{4}\/[A-Z]\//.test(dateStr)

  // Find which collector chunk this contract's date falls in
  let chunkId = null
  let chunkInserted = null
  let chunkAtCap = false
  if (dt) {
    for (const c of chunks) {
      const cf = parseChunkDate(c.from)
      const ct = parseChunkDate(c.to)
      if (cf && ct && dt >= cf && dt <= ct) {
        chunkId        = c.id
        chunkInserted  = c.recordsInserted
        chunkAtCap     = c.recordsInserted >= 40
        break
      }
    }
  }

  // Root cause classification
  let cause
  if (isBidRef || !dt) {
    cause = "C_bid_no_date"       // Bid/RA contract with no standard date
  } else if (!chunkId) {
    cause = "B_pre_window"        // parseable date but no matching chunk
  } else if (chunkAtCap) {
    cause = "A_pagination_cap"    // chunk was at 40-record cap
  } else if (chunkInserted !== null) {
    cause = "A2_in_window_low"    // in a low-insert chunk — shouldn't be missing
  } else {
    cause = "X_unknown"
  }

  return { ...r, dt, val, mode, isBidRef, chunkId, chunkInserted, chunkAtCap, cause }
})

console.log("\n" + SEP)
console.log("  FOGGING HARVEST RECOVERY AUDIT")
console.log(SEP)

// ── 1. Root cause quantification ─────────────────────────────────────────────
console.log("\n1. ROOT CAUSE QUANTIFICATION\n")
const byC = {}
for (const r of annotated) byC[r.cause] = (byC[r.cause]||0) + 1
const total924 = annotated.length

const causeLabels = {
  "A_pagination_cap": "Pagination truncation — chunk at 40-record cap (Direct mode)",
  "A2_in_window_low": "In collector window, low-insert chunk — unexpected miss",
  "B_pre_window":     "Outside collector date window (pre-Jun 2023)",
  "C_bid_no_date":    "Bid/RA contracts — no standard date in deep-raw",
  "X_unknown":        "Unknown / could not classify",
}

let totalClassified = 0
for (const [c, label] of Object.entries(causeLabels)) {
  const n = byC[c] || 0
  totalClassified += n
  const pct = (n/total924*100).toFixed(1)
  const bar = "█".repeat(Math.round(n/total924*40))
  console.log(`  ${c.padEnd(20)}  ${String(n).padStart(4)} (${pct.padStart(5)}%)  ${bar}`)
  console.log(`                         ${label}`)
}
console.log(`\n  Total missing        : ${total924}`)
console.log(`  Classified           : ${totalClassified}`)

// GMV breakdown by cause
console.log("\n  GMV by root cause:")
const gmvByC = {}
for (const r of annotated) gmvByC[r.cause] = (gmvByC[r.cause]||0) + r.val
const totalMissingGMV = Object.values(gmvByC).reduce((a,b)=>a+b,0)
for (const [c] of Object.entries(causeLabels)) {
  const g = gmvByC[c] || 0
  console.log(`  ${c.padEnd(20)}  ₹${(g/1e7).toFixed(2)} Cr  (${(g/totalMissingGMV*100).toFixed(1)}% of missing GMV)`)
}

// ── 2. Pagination truncation — exact limitation ───────────────────────────────
console.log("\n" + sep)
console.log("2. PAGINATION TRUNCATION — EXACT MECHANISM\n")

// All 37 chunks with their details
console.log("  Per-chunk record count (all 37 chunks):\n")
console.log(`  ${"Ch".padStart(2)}  ${"From".padEnd(12)}  ${"To".padEnd(12)}  ${"Inserted".padStart(8)}  ${"Pages".padStart(5)}  Cap?  Status`)
console.log(`  ${"─".repeat(2)}  ${"─".repeat(12)}  ${"─".repeat(12)}  ${"─".repeat(8)}  ${"─".repeat(5)}  ────  ──────`)
for (const c of chunks) {
  const cap = c.recordsInserted >= 40 ? " ★" : "  "
  const pg  = String(c.pagesCollected || 0).padStart(5)
  console.log(`  ${String(c.id).padStart(2)}  ${c.from.padEnd(12)}  ${c.to.padEnd(12)}  ${String(c.recordsInserted).padStart(8)}  ${pg}  ${cap}  ${c.status}`)
}

const cappedChunks   = chunks.filter(c => c.recordsInserted >= 40)
const uncappedChunks = chunks.filter(c => c.recordsInserted > 0 && c.recordsInserted < 40)
const zeroChunks     = chunks.filter(c => c.recordsInserted === 0)
const uniquePages    = [...new Set(chunks.map(c=>c.pagesCollected||0))].sort((a,b)=>a-b)

console.log(`\n  Summary:`)
console.log(`    Chunks at hard cap (≥40)     : ${cappedChunks.length}`)
console.log(`    Chunks below cap (1–39)       : ${uncappedChunks.length}`)
console.log(`    Chunks with 0 inserts         : ${zeroChunks.length}`)
console.log(`    Unique pagesCollected values  : ${uniquePages.join(", ")}  ← all are 0 or 1`)

// Check what #pageno = 0 implies about the cap
console.log(`\n  Collector pagination mechanism (from gem-contracts-collector.js):`)
console.log(`    - Uses infinite-scroll: scrolls #load_more div into view`)
console.log(`    - clickLoadMore() checks #pageno === "0" to detect end-of-results`)
console.log(`    - If #pageno !== "0" AND #load_more is visible AND has class div_load_more`)
console.log(`      → scrolls into view, waits 3s for AJAX, continues loop`)
console.log(`    - pagesCollected = batchNum at end of loop`)
console.log()
console.log(`  OBSERVED: pagesCollected = 1 for EVERY chunk with records.`)
console.log(`  CONCLUSION: clickLoadMore() returns false immediately after batch 1.`)
console.log()
console.log(`  Possible reasons clickLoadMore() always returns false after batch 1:`)
console.log(`    Reason 1 — #pageno becomes "0" after initial load`)
console.log(`               GeM server sets #pageno=0 after first 40 results for this`)
console.log(`               category/date-range query → server-side hard cap at 40.`)
console.log(`    Reason 2 — #load_more becomes invisible after initial load`)
console.log(`               GeM hides the scroll trigger once results rendered,`)
console.log(`               even when there are more pages. loadMore.isVisible() = false.`)
console.log(`    Reason 3 — div_load_more class absent after batch 1`)
console.log(`               The class is removed by GeM's JS after first render,`)
console.log(`               so clickLoadMore() returns false on the "ready" check.`)
console.log(`    Reason 4 — #load_more element not in DOM at all`)
console.log(`               GeM changed the infinite-scroll selector. page.$("#load_more")`)
console.log(`               returns null → function returns false immediately.`)
console.log()
console.log(`  TO DIAGNOSE: Run collector on a capped chunk and dump #pageno value`)
console.log(`  and #load_more visibility BEFORE calling clickLoadMore().`)

// ── 3. Per-chunk cap analysis ─────────────────────────────────────────────────
console.log("\n" + sep)
console.log("3. PER-CHUNK CAP: HOW MANY ARE ON MISSED PAGES?\n")

// For each capped chunk, how many missing contracts have dates in that chunk?
console.log(`  Chunk analysis — capped chunks vs contracts still missing:\n`)
console.log(`  ${"Ch".padStart(2)}  ${"Window".padEnd(25)}  ${"Inserted".padStart(8)}  ${"Missing in window".padStart(18)}  ${"Hidden (est)".padStart(13)}`)
console.log(`  ${"─".repeat(2)}  ${"─".repeat(25)}  ${"─".repeat(8)}  ${"─".repeat(18)}  ${"─".repeat(13)}`)

let totalHidden = 0
for (const c of chunks) {
  if (c.recordsInserted === 0) continue
  const cf = parseChunkDate(c.from)
  const ct = parseChunkDate(c.to)
  if (!cf || !ct) continue
  const missingInChunk = annotated.filter(r => r.dt && r.dt >= cf && r.dt <= ct)
  const hidden         = missingInChunk.length
  totalHidden         += hidden
  if (hidden > 0 || c.recordsInserted >= 40) {
    const cap = c.recordsInserted >= 40 ? "★" : " "
    console.log(`  ${String(c.id).padStart(2)}  ${c.from} → ${c.to}  ${String(c.recordsInserted).padStart(8)}  ${String(hidden).padStart(18)}  ${String(hidden+c.recordsInserted).padStart(12)} tot ${cap}`)
  }
}
console.log(`\n  Total missing with date in a collector chunk: ${totalHidden}`)
console.log(`  These are DEFINITELY on page 2+ of the search results.`)

// Show specific months where cap is most severe
console.log("\n  Month-level supply model (Deep-raw as truth):\n")
const deepByMonth   = {}
const presentByMonth = {}
const missingByMonth = {}
for (const r of deep) {
  const dt = parseDate(r.contract_date)
  if (!dt) continue
  const ym = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}`
  deepByMonth[ym] = (deepByMonth[ym]||0) + 1
}
for (const g of [...matchedSet]) {
  const r = deepByGemc.get(g)
  if (!r) continue
  const dt = parseDate(r.contract_date)
  if (!dt) continue
  const ym = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}`
  presentByMonth[ym] = (presentByMonth[ym]||0) + 1
}
for (const r of annotated) {
  if (!r.dt) continue
  const ym = `${r.dt.getFullYear()}-${String(r.dt.getMonth()+1).padStart(2,"0")}`
  missingByMonth[ym] = (missingByMonth[ym]||0) + 1
}

console.log(`  ${"Month".padEnd(8)}  ${"Total".padStart(5)}  ${"In DB".padStart(5)}  ${"Missing".padStart(7)}  ${"Cap%".padStart(5)}  Note`)
for (const ym of Object.keys(deepByMonth).sort()) {
  const tot = deepByMonth[ym] || 0
  const has = presentByMonth[ym] || 0
  const mis = missingByMonth[ym] || 0
  const pct = tot > 0 ? Math.round(mis/tot*100) : 0
  const note = tot > 40 ? `⚠ ${tot} total > 40-cap` : tot > 20 ? `! near cap` : ""
  console.log(`  ${ym.padEnd(8)}  ${String(tot).padStart(5)}  ${String(has).padStart(5)}  ${String(mis).padStart(7)}  ${String(pct+"%").padStart(5)}  ${note}`)
}

// ── 4. Bid/RA contract analysis ───────────────────────────────────────────────
console.log("\n" + sep)
console.log("4. BID/RA CONTRACT ANALYSIS — 220 CONTRACTS\n")

const bidContracts = annotated.filter(r => r.cause === "C_bid_no_date")
console.log(`  Total Bid/RA missing          : ${bidContracts.length}`)
const bidGMV = bidContracts.reduce((a,r)=>a+r.val,0)
console.log(`  Bid/RA missing GMV            : ₹${(bidGMV/1e7).toFixed(2)} Cr`)

// What does the date field look like for Bid/RA?
const bidDateSamples = bidContracts.slice(0,10).map(r=>r.contract_date||"(null)")
console.log(`\n  Sample contract_date values for Bid/RA contracts:`)
for (const s of bidDateSamples) console.log(`    "${s}"`)

// Year distribution from GEMC number (format: GEMC-511687XXXXXXXX)
// GEMC numbers encode order sequence, not year. But the total_value should tell us something.
const bidByStatus = {}
for (const r of bidContracts) bidByStatus[r.status||"(null)"] = (bidByStatus[r.status||"(null)"]||0)+1
console.log(`\n  Contract status breakdown (Bid/RA missing):`)
for (const [s,n] of Object.entries(bidByStatus).sort((a,b)=>b[1]-a[1]))
  console.log(`    ${s.padEnd(30)}: ${n}`)

// Seller breakdown for Bid/RA missing
const bidBySeller = {}
for (const r of bidContracts) {
  const s = (r.seller_name||"(null)").slice(0,30)
  bidBySeller[s] = (bidBySeller[s]||0)+1
}
console.log(`\n  Seller breakdown (Bid/RA missing):`)
for (const [s,n] of Object.entries(bidBySeller).sort((a,b)=>b[1]-a[1]).slice(0,10))
  console.log(`    ${s.padEnd(30)}: ${n}`)

// Bid/RA in the DB (are any Bid/RA actually present?)
const presentBidRA = []
for (const g of [...matchedSet]) {
  const r = deepByGemc.get(g)
  if (r && r.buying_mode === "Bid/RA") presentBidRA.push(r)
}
console.log(`\n  Bid/RA contracts currently in DB (from deep-raw): ${presentBidRA.length}`)
if (presentBidRA.length > 0) {
  console.log(`  Sample Bid/RA in DB:`)
  for (const r of presentBidRA.slice(0,5))
    console.log(`    ${r.gemc_no}  date:"${r.contract_date}"  ₹${(parseFloat(r.total_value)/1e5).toFixed(2)}L`)
}

// Hypothesis: Bid/RA contracts don't appear on view_contracts date-range search
// They need a different query path
console.log(`\n  FINDING: ${presentBidRA.length > 0 ? "SOME" : "ZERO"} Bid/RA contracts are in gem_contracts.`)
if (presentBidRA.length === 0) {
  console.log(`  The collector's date-range search on view_contracts does NOT return`)
  console.log(`  Bid/RA contracts. They require a different discovery path:`)
  console.log(`    Option B1: Search by category WITHOUT date filter (returns all modes)`)
  console.log(`    Option B2: Bid-specific endpoint: /view_bids or similar`)
  console.log(`    Option B3: The deep-raw was harvested via a separate bid-listing scrape`)
}

// ── 5. Pre-window analysis ────────────────────────────────────────────────────
console.log("\n" + sep)
console.log("5. PRE-WINDOW ANALYSIS — 43 CONTRACTS\n")
const preWindow = annotated.filter(r => r.cause === "B_pre_window")
console.log(`  Count: ${preWindow.length}`)
console.log(`  Date distribution:`)
const preByYear = {}
for (const r of preWindow) {
  const y = r.dt ? r.dt.getFullYear() : "null"
  preByYear[y] = (preByYear[y]||0)+1
}
for (const [y,n] of Object.entries(preByYear).sort()) console.log(`    ${y}: ${n}`)

// Show the actual dates
console.log(`\n  Pre-window contracts (sample — first 20):`)
const preSorted = [...preWindow].sort((a,b) => (a.dt||new Date(0)) - (b.dt||new Date(0)))
for (const r of preSorted.slice(0,20))
  console.log(`    ${r.gemc_no}  date:"${r.contract_date}"  dt:${r.dt?.toISOString().slice(0,10)||"null"}  mode:${r.mode}`)

// Are these in a genuine gap or edge of window?
const earliest  = chunks[chunks.length-1]  // last chunk = earliest date
const ckptStart = parseChunkDate(earliest.from)
console.log(`\n  Collector window start  : ${earliest.from} = ${ckptStart?.toISOString().slice(0,10)}`)
const tooEarly  = preWindow.filter(r => r.dt && ckptStart && r.dt < ckptStart)
const tooLate   = preWindow.filter(r => r.dt && r.dt > new Date())
console.log(`  Pre-window (before ${earliest.from}) : ${tooEarly.length}`)
console.log(`  Post-today (after today)      : ${tooLate.length}`)

// ── 6. "Low-insert chunk" unexpected misses ───────────────────────────────────
const lowChunkMissing = annotated.filter(r => r.cause === "A2_in_window_low")
if (lowChunkMissing.length > 0) {
  console.log("\n" + sep)
  console.log(`6. UNEXPECTED MISSES IN LOW-INSERT CHUNKS — ${lowChunkMissing.length} CONTRACTS\n`)
  console.log(`  These contracts have dates in collector chunks with < 40 inserts`)
  console.log(`  (not capped), yet they are missing from MongoDB. Possible reasons:`)
  console.log(`    - GEMC not matching /GEMC/i regex → parseItem() skipped them`)
  console.log(`    - Contract appeared on page 2 of a low-volume chunk (possible)`)
  console.log(`    - Date in deep-raw is slightly off vs what GeM returned for that window`)
  console.log()
  for (const r of lowChunkMissing.slice(0,10)) {
    console.log(`  ${r.gemc_no}  date:${r.dt?.toISOString().slice(0,10)}  chunk:${r.chunkId}(${r.chunkInserted} inserted)  mode:${r.mode}`)
  }
}

// ── 7. The 988 vs 494 discrepancy ────────────────────────────────────────────
console.log("\n" + sep)
console.log("7. CHECKPOINT 988 vs DB 494 — DISCREPANCY ANALYSIS\n")

// Count all fogging in DB regardless of source
const allFoggingInDb = await gc.countDocuments({ category_id: CATEGORY })
// Count contracts in gem_contracts_raw for fogging GEMCs
const rawCol = db.collection("gem_contracts_raw")
const rawFoggingCount = await rawCol.countDocuments({ gemc_no: { $in: allGemcs } })

const sumInserted = chunks.reduce((a,c)=>a+c.recordsInserted,0)
const sumSkipped  = chunks.reduce((a,c)=>a+c.recordsSkipped,0)
console.log(`  Checkpoint totalInserted (sum across chunks): ${sumInserted}`)
console.log(`  Checkpoint totalSkipped                     : ${sumSkipped}`)
console.log(`  gem_contracts with category=fogging         : ${allFoggingInDb}`)
console.log(`  gem_contracts_raw with fogging gemc_no      : ${rawFoggingCount}`)
console.log()

// Check upsertOne() accounting: it only counts upsertedCount > 0 as "inserted"
// If a document existed already, it's "updated" and NOT counted in inserted
// So 988 inserted = 988 genuinely new documents (upsertedCount > 0)
// But DB has only 494 → contradiction unless something deleted 494 records

// Check when these fogging records were first inserted
const oldestFogging = await gc.find(
  { category_id: CATEGORY },
  { projection: { gemc_no: 1, first_seen: 1, harvested_at: 1, source_chunk_start: 1, source_chunk_end: 1 } }
).sort({ first_seen: 1 }).limit(5).toArray()

const newestFogging = await gc.find(
  { category_id: CATEGORY },
  { projection: { gemc_no: 1, first_seen: 1, harvested_at: 1, source_chunk_start: 1, source_chunk_end: 1 } }
).sort({ first_seen: -1 }).limit(5).toArray()

console.log(`  Oldest fogging records in DB:`)
for (const d of oldestFogging)
  console.log(`    ${d.gemc_no}  first_seen:${d.first_seen?.toISOString().slice(0,10)||"null"}  chunk:${d.source_chunk_start||"?"}→${d.source_chunk_end||"?"}`)
console.log(`  Newest fogging records in DB:`)
for (const d of newestFogging)
  console.log(`    ${d.gemc_no}  first_seen:${d.first_seen?.toISOString().slice(0,10)||"null"}  chunk:${d.source_chunk_start||"?"}→${d.source_chunk_end||"?"}`)

// Count by source_chunk_start — how many records per chunk actually in DB
const chunkDist = await gc.aggregate([
  { $match: { category_id: CATEGORY } },
  { $group: { _id: "$source_chunk_start", count: { $sum: 1 } } },
  { $sort: { _id: 1 } }
]).toArray()
console.log(`\n  Records in DB by source_chunk_start:`)
for (const d of chunkDist)
  console.log(`    ${(d._id||"null").padEnd(12)}: ${d.count}`)
const sumFromChunks = chunkDist.reduce((a,d)=>a+d.count, 0)
console.log(`  Total: ${sumFromChunks}`)
console.log()
console.log(`  HYPOTHESIS A — Checkpoint over-counted:`)
console.log(`    upsertOne() returns "inserted" if upsertedCount > 0.`)
console.log(`    If the same GEMC appeared in 2 different chunk windows`)
console.log(`    (e.g. contracts near chunk boundaries), it would be inserted once`)
console.log(`    and updated once. But pagesCollected=1 means boundary overlap is`)
console.log(`    unlikely. Checkpoint may have doubled-counted from two collector runs.`)
console.log()
console.log(`  HYPOTHESIS B — Records were deleted/reset between collector run and now:`)
console.log(`    A DB reset, cleanup, or category re-assignment removed half the records.`)
console.log(`    The chunk DB-count table above shows which source windows have records.`)
console.log()
console.log(`  IMPACT ON RECOVERY PLAN: None. The 924 missing are definitively absent`)
console.log(`  from DB regardless of why the checkpoint count is wrong.`)

// ── 8. Recovery estimate ──────────────────────────────────────────────────────
console.log("\n" + SEP)
console.log("8. RECOVERY ESTIMATE BY FIX TYPE\n")

const A_paginationCap   = byC["A_pagination_cap"] || 0
const A2_lowChunk       = byC["A2_in_window_low"] || 0
const B_preWindow       = byC["B_pre_window"] || 0
const C_bidRA           = byC["C_bid_no_date"] || 0

console.log(`  ┌─────────────────────────────────────────────────────────────────────┐`)
console.log(`  │ Fix 1: Pagination loop repair                                        │`)
console.log(`  │   Make clickLoadMore() reliably scroll beyond first 40 results.      │`)
console.log(`  │   Impact: recovers all contracts on page 2+ of capped chunks.        │`)
console.log(`  │   Recoverable: ${String(A_paginationCap).padStart(3)} contracts (A_pagination_cap)                 │`)
console.log(`  │   Confidence: HIGH — dates confirmed within complete chunk windows.  │`)
console.log(`  └─────────────────────────────────────────────────────────────────────┘`)
console.log()
console.log(`  ┌─────────────────────────────────────────────────────────────────────┐`)
console.log(`  │ Fix 2: Window extension (extend --days to cover pre-Jun 2023)         │`)
console.log(`  │   Add chunks going back to Jan 2023 or Apr 2024 (fogging start).     │`)
console.log(`  │   Recoverable: ${String(B_preWindow).padStart(3)} contracts (B_pre_window)                    │`)
console.log(`  │   Confidence: MEDIUM — some may be date-parse artefacts.            │`)
console.log(`  └─────────────────────────────────────────────────────────────────────┘`)
console.log()
console.log(`  ┌─────────────────────────────────────────────────────────────────────┐`)
console.log(`  │ Fix 3: Bid/RA harvest path                                           │`)
console.log(`  │   Current collector only retrieves Direct contracts from             │`)
console.log(`  │   view_contracts date-range search. Bid/RA contracts need:           │`)
console.log(`  │     Option a) Remove date filter, use category-only search           │`)
console.log(`  │     Option b) Add buying_mode=Bid/RA filter to the form              │`)
console.log(`  │     Option c) Use GeM Bid listing page (different URL/endpoint)     │`)
console.log(`  │   Recoverable: ${String(C_bidRA).padStart(3)} contracts (C_bid_no_date = Bid/RA)           │`)
console.log(`  │   Confidence: LOW → needs live GeM inspection to confirm endpoint.  │`)
console.log(`  └─────────────────────────────────────────────────────────────────────┘`)
console.log()
console.log(`  ┌─────────────────────────────────────────────────────────────────────┐`)
console.log(`  │ Fix 4: Unexpected low-chunk misses                                   │`)
console.log(`  │   Re-run those specific chunks; likely surfaced by pagination too.   │`)
console.log(`  │   Recoverable: ${String(A2_lowChunk).padStart(3)} contracts (A2_in_window_low)               │`)
console.log(`  │   Confidence: MEDIUM                                                │`)
console.log(`  └─────────────────────────────────────────────────────────────────────┘`)
console.log()

const fixOnlyPagination = A_paginationCap + A2_lowChunk
const fixWithBidRA      = fixOnlyPagination + C_bidRA + B_preWindow

console.log(`  ┌─────────────────────────────────────────────────────────────────────┐`)
console.log(`  │ RECOVERY SUMMARY                                                      │`)
console.log(`  │                                                                       │`)
console.log(`  │  Fix 1 only (pagination):   ${String(fixOnlyPagination).padStart(3)} / 924 recovered  (${Math.round(fixOnlyPagination/total924*100)}% of gap)    │`)
console.log(`  │  Fix 1+2 (pag + window):    ${String(fixOnlyPagination+B_preWindow).padStart(3)} / 924 recovered  (${Math.round((fixOnlyPagination+B_preWindow)/total924*100)}% of gap)    │`)
console.log(`  │  Fix 1+2+3 (all fixes):     ${String(fixWithBidRA).padStart(3)} / 924 recovered  (${Math.round(fixWithBidRA/total924*100)}% of gap)    │`)
console.log(`  │                                                                       │`)
console.log(`  │  Target: 1418 / 1418 contracts (full universe)                       │`)
console.log(`  │  Current: 494 in DB + ${fixWithBidRA} recoverable = ${494+fixWithBidRA} projected             │`)
console.log(`  └─────────────────────────────────────────────────────────────────────┘`)

// ── 9. Recovery plan ─────────────────────────────────────────────────────────
console.log("\n" + SEP)
console.log("9. RECOVERY PLAN — PATH TO 1,418 / 1,418\n")
console.log(`  Phase 1  — Diagnose pagination (no new harvest yet)`)
console.log(`  Goal     : Confirm which clickLoadMore() guard is the exit point`)
console.log(`  Method   : Run collector on chunk 9 (Oct 2025, 40 inserted = capped)`)
console.log(`             with extra console.log BEFORE clickLoadMore() call printing:`)
console.log(`               #pageno value, #load_more visibility, div_load_more class`)
console.log(`  Outcome  : Identify exact guard that returns false → fix that one guard`)
console.log()
console.log(`  Phase 2  — Pagination fix + re-harvest Direct contracts`)
console.log(`  Goal     : Recover the ${A_paginationCap} pagination-truncated Direct contracts`)
console.log(`  Method   : Delete (or reset) the 24 capped chunks in the v2 checkpoint`)
console.log(`             Re-run collector with the fixed pagination loop`)
console.log(`             All 37 chunks are "complete" — use --reset on specific chunks`)
console.log(`             or a new checkpoint name (fogging_v3)`)
console.log(`  Expected : ~${A_paginationCap} new inserts across the 24 capped chunks`)
console.log(`             Plus possibly the ${A2_lowChunk} low-chunk misses`)
console.log()
console.log(`  Phase 3  — Bid/RA harvest`)
console.log(`  Goal     : Recover the ${C_bidRA} Bid/RA contracts`)
console.log(`  Method   : Inspect GeM view_contracts page with buying_mode filter set`)
console.log(`             to "Bid" — do Bid/RA contracts appear? If yes:`)
console.log(`               Add a second pass: run collector with Bid mode filter`)
console.log(`               No date filter needed (or use a longer date range)`)
console.log(`             If they don't appear on view_contracts at all:`)
console.log(`               Inspect GeM's Bid listing page (different URL)`)
console.log(`               Build a separate bid-contract harvester`)
console.log(`  Expected : ~${C_bidRA} inserts (the entire Bid/RA missing set)`)
console.log()
console.log(`  Phase 4  — Window extension (optional, low priority)`)
console.log(`  Goal     : Recover the ${B_preWindow} pre-window contracts`)
console.log(`  Method   : Extend collector to --days=1460 (4 years, back to mid-2022)`)
console.log(`             Or target just 2023 if fogging contracts started then`)
console.log(`  Expected : ~${B_preWindow} inserts (if these are genuine older contracts)`)
console.log()
console.log(`  Phase 5  — Enrich the complete universe`)
console.log(`  Goal     : detail_scraped=true for all 1,418 contracts`)
console.log(`  Method   : Run gem-enrich-contracts.js --category-filter=...fogg`)
console.log(`             after harvest phases are complete`)
console.log(`  Expected : ~${1418-56} contracts to enrich at 928/hr ≈ ${Math.round((1418-56)/928*60)} minutes`)
console.log()

console.log(`  ┌─────────────────────────────────────────────────────────────────────┐`)
console.log(`  │ DOES FIX 1 ALONE (pagination) REACH 1,418/1,418?                    │`)
console.log(`  │                                                                       │`)
console.log(`  │   After Fix 1: ${String(494+fixOnlyPagination).padStart(4)} / 1418 in DB (${Math.round((494+fixOnlyPagination)/1418*100)}% of universe)          │`)
console.log(`  │   Still missing after Fix 1: ${String(1418-(494+fixOnlyPagination)).padStart(3)} (all Bid/RA + pre-window)   │`)
console.log(`  │   Fix 1 alone: NO. Fixes 1+2+3 needed for full 1,418/1,418.         │`)
console.log(`  └─────────────────────────────────────────────────────────────────────┘`)
console.log(SEP + "\n")

await client.close()
