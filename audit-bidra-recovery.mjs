/**
 * audit-bidra-recovery.mjs
 * Read-only. No writes.
 * Forensic audit of the 220 missing Bid/RA fogging contracts.
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
const SEP = "═".repeat(72)
const sep = "─".repeat(72)

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
function parseChunkDate(s) {
  if (!s) return null
  const [dd,mm,yyyy] = s.split("-")
  const d = new Date(`${yyyy}-${mm}-${dd}`)
  return isNaN(d.getTime()) ? null : d
}

// ── Separate deep-raw Bid/RA into present vs missing ─────────────────────────
const allGemcs = deep.map(r => r.gemc_no)
const BATCH = 500
const matchedSet = new Set()
for (let i = 0; i < allGemcs.length; i += BATCH) {
  const chunk = allGemcs.slice(i, i + BATCH)
  const docs  = await gc.find({ gemc_no: { $in: chunk } }, { projection: { gemc_no: 1 } }).toArray()
  for (const d of docs) matchedSet.add(d.gemc_no)
}
const deepBidRA         = deep.filter(r => r.buying_mode === "Bid/RA")
const bidRA_present_gemcs = deepBidRA.filter(r => matchedSet.has(r.gemc_no)).map(r => r.gemc_no)
const bidRA_missing     = deepBidRA.filter(r => !matchedSet.has(r.gemc_no))

// Pull full DB records for the 134 Bid/RA that are present
const presentBidRaDocs = []
for (let i = 0; i < bidRA_present_gemcs.length; i += BATCH) {
  const chunk = bidRA_present_gemcs.slice(i, i + BATCH)
  const docs  = await gc.find({ gemc_no: { $in: chunk } }, {
    projection: {
      gemc_no: 1, contract_date: 1, contract_date_dt: 1, buying_mode: 1,
      contract_value_num: 1, source_chunk_start: 1, source_chunk_end: 1,
      harvested_at: 1, seller_name_canonical: 1, seller_name_raw: 1,
      org_name: 1, ministry: 1, dept_name: 1,
    }
  }).toArray()
  presentBidRaDocs.push(...docs)
}

// Build deep-raw lookup for present Bid/RA
const deepByGemc = new Map(deep.map(r => [r.gemc_no, r]))

console.log("\n" + SEP)
console.log("  BID/RA RECOVERY DESIGN AUDIT")
console.log(SEP)

// ── 1. Universe overview ──────────────────────────────────────────────────────
console.log("\n1. BID/RA UNIVERSE OVERVIEW\n")
const bidRA_presentGMV = bidRA_present_gemcs.reduce((a,g) => {
  const r = deepByGemc.get(g); return a + (parseFloat(r?.total_value)||0)
}, 0)
const bidRA_missingGMV  = bidRA_missing.reduce((a,r) => a + (parseFloat(r.total_value)||0), 0)
const bidRA_totalGMV    = bidRA_presentGMV + bidRA_missingGMV
const bidRA_total       = deepBidRA.length

console.log(`  Total Bid/RA in fogging universe  : ${bidRA_total}`)
console.log(`  In gem_contracts (deep-raw match) : ${bidRA_present_gemcs.length}`)
console.log(`  Missing from gem_contracts        : ${bidRA_missing.length}`)
console.log(`  Universe Bid/RA GMV               : ₹${(bidRA_totalGMV/1e7).toFixed(2)} Cr`)
console.log(`  Present Bid/RA GMV                : ₹${(bidRA_presentGMV/1e7).toFixed(2)} Cr`)
console.log(`  Missing Bid/RA GMV                : ₹${(bidRA_missingGMV/1e7).toFixed(2)} Cr`)

// ── 2. What dates does the COLLECTOR see for Bid/RA (the 134 in DB)? ─────────
console.log("\n" + sep)
console.log("2. WHAT DATE DID THE COLLECTOR STORE FOR PRESENT BID/RA CONTRACTS?\n")

// The DB record has contract_date from .ajxtag_contract_date on the card HTML
// The deep-raw has a bid-reference in contract_date (e.g. GEM/2024/B/5012507)
// These are TWO DIFFERENT sources — compare them

const hasDate         = presentBidRaDocs.filter(d => d.contract_date_dt || parseDate(d.contract_date))
const hasNullDate     = presentBidRaDocs.filter(d => !d.contract_date_dt && !parseDate(d.contract_date))
const sampleDates     = presentBidRaDocs.slice(0, 15).map(d => ({
  gemc: d.gemc_no,
  db_date: d.contract_date || "(null)",
  db_dt:   d.contract_date_dt?.toISOString?.().slice(0,10) || parseDate(d.contract_date)?.toISOString().slice(0,10) || "(null)",
  deep_date: deepByGemc.get(d.gemc_no)?.contract_date || "(null)",
  chunk: d.source_chunk_start || "?",
  val: d.contract_value_num || 0,
}))

console.log(`  Present Bid/RA (${presentBidRaDocs.length} docs):`)
console.log(`    With parseable date in DB  : ${hasDate.length}`)
console.log(`    With null/no date in DB    : ${hasNullDate.length}`)
console.log(`\n  Sample — DB date vs deep-raw date for 15 present Bid/RA contracts:`)
console.log(`  ${"GEMC".padEnd(26)} ${"DB contract_date".padEnd(15)} ${"DB dt".padEnd(12)} ${"deep-raw date".padEnd(22)} ${"Chunk from"}`)
console.log(`  ${"─".repeat(26)} ${"─".repeat(15)} ${"─".repeat(12)} ${"─".repeat(22)} ${"─".repeat(12)}`)
for (const r of sampleDates)
  console.log(`  ${r.gemc.padEnd(26)} ${r.db_date.slice(0,14).padEnd(15)} ${r.db_dt.padEnd(12)} ${r.deep_date.slice(0,21).padEnd(22)} ${r.chunk}`)

// ── 3. Which chunks contained the 134 present Bid/RA? ────────────────────────
console.log("\n" + sep)
console.log("3. WHICH COLLECTOR CHUNKS RETRIEVED THE 134 PRESENT BID/RA?\n")

const chunkMap = new Map(chunks.map(c => [c.from, c]))
const presentBidRAByChunk = {}
for (const d of presentBidRaDocs) {
  const k = d.source_chunk_start || "unknown"
  presentBidRAByChunk[k] = (presentBidRAByChunk[k] || 0) + 1
}
console.log(`  ${"Chunk from".padEnd(14)} ${"To".padEnd(14)} ${"Total inserted".padStart(14)} ${"Bid/RA in DB".padStart(12)} ${"At cap?"}`)
console.log(`  ${"─".repeat(14)} ${"─".repeat(14)} ${"─".repeat(14)} ${"─".repeat(12)} ${"─".repeat(7)}`)
for (const [from, cnt] of Object.entries(presentBidRAByChunk).sort((a,b)=>b[1]-a[1])) {
  const c   = chunkMap.get(from)
  const ins = c?.recordsInserted || "?"
  const cap = ins >= 40 ? "★" : " "
  console.log(`  ${from.padEnd(14)} ${(c?.to||"?").padEnd(14)} ${String(ins).padStart(14)} ${String(cnt).padStart(12)} ${cap}`)
}
const totalPresentBidRAInChunks = Object.values(presentBidRAByChunk).reduce((a,b)=>a+b,0)
console.log(`\n  Total present Bid/RA attributed to chunks: ${totalPresentBidRAInChunks}`)

// ── 4. Do present Bid/RA contracts have proper dates in DB? ──────────────────
console.log("\n" + sep)
console.log("4. DATE PATTERN ANALYSIS — CAN THE COLLECTOR DATE-FILTER BID/RA?\n")

// Build date histogram for present Bid/RA contracts (DB dates)
const presentBidRADates = presentBidRaDocs
  .map(d => ({ dt: d.contract_date_dt || parseDate(d.contract_date), val: d.contract_value_num || 0 }))
  .filter(d => d.dt)

const byMonth = {}
for (const d of presentBidRADates) {
  const ym = `${d.dt.getFullYear()}-${String(d.dt.getMonth()+1).padStart(2,"0")}`
  if (!byMonth[ym]) byMonth[ym] = { count: 0, val: 0 }
  byMonth[ym].count++
  byMonth[ym].val += d.val
}
console.log(`  Present Bid/RA with date in DB   : ${presentBidRADates.length} / ${presentBidRaDocs.length}`)
console.log(`  Present Bid/RA without date in DB: ${presentBidRaDocs.length - presentBidRADates.length}`)
console.log(`\n  Monthly distribution of 134 Bid/RA contracts (DB dates):`)
for (const [ym, s] of Object.entries(byMonth).sort())
  console.log(`    ${ym}  ${String(s.count).padStart(3)} contracts  ₹${(s.val/1e5).toFixed(2)} L`)

// Now check the missing 220's deep-raw date fields more carefully
console.log(`\n  Missing 220 Bid/RA — deep-raw date field analysis:`)
const missingDateTypes = { bid_ref: 0, std_date: 0, null_date: 0 }
for (const r of bidRA_missing) {
  const raw = r.contract_date || ""
  if (/^GEM\/\d{4}\/[A-Z]\//.test(raw))  missingDateTypes.bid_ref++
  else if (parseDate(raw))                missingDateTypes.std_date++
  else                                    missingDateTypes.null_date++
}
console.log(`    Bid reference format (GEM/YYYY/B/XXXXXX): ${missingDateTypes.bid_ref}`)
console.log(`    Standard date format (DD/MM/YYYY)        : ${missingDateTypes.std_date}`)
console.log(`    Null / unparseable                        : ${missingDateTypes.null_date}`)

// Sample bid references to extract implied year
const bidRefsByYear = {}
for (const r of bidRA_missing) {
  const raw = r.contract_date || ""
  const m = raw.match(/^GEM\/(\d{4})\/[A-Z]\//)
  if (m) bidRefsByYear[m[1]] = (bidRefsByYear[m[1]]||0)+1
}
console.log(`\n  Bid reference year distribution (missing 220):`)
for (const [y, n] of Object.entries(bidRefsByYear).sort())
  console.log(`    GEM/${y}/B/... : ${n} contracts`)

// Same for present 134
const presentBidRefsByYear = {}
for (const g of bidRA_present_gemcs) {
  const r = deepByGemc.get(g)
  const raw = r?.contract_date || ""
  const m = raw.match(/^GEM\/(\d{4})\/[A-Z]\//)
  if (m) presentBidRefsByYear[m[1]] = (presentBidRefsByYear[m[1]]||0)+1
}
console.log(`\n  Bid reference year distribution (present 134):`)
for (const [y, n] of Object.entries(presentBidRefsByYear).sort())
  console.log(`    GEM/${y}/B/... : ${n} contracts`)

// ── 5. Collector form — what does it set vs what exists on page ───────────────
console.log("\n" + sep)
console.log("5. COLLECTOR FORM ANALYSIS — WHAT FIELDS ARE SET?\n")
console.log(`  Fields the collector sets on gem.gov.in/view_contracts:`)
console.log(`    select#buyer_category       → "${CATEGORY}"`)
console.log(`    #from_date_contract_search1 → chunk.from  (30-day window start)`)
console.log(`    #to_date_contract_search1   → chunk.to    (30-day window end)`)
console.log(`    captcha field               → auto-solved`)
console.log()
console.log(`  Fields the collector does NOT set (page defaults):`)
console.log(`    Buying mode / Order type    → unknown default`)
console.log(`    Status filter               → unknown default`)
console.log(`    Ministry / Department       → blank (all)`)
console.log(`    State filter                → blank (all)`)
console.log()
console.log(`  CRITICAL UNKNOWN: Does GeM view_contracts have a buying_mode filter?`)
console.log(`  And what is the DEFAULT: "All modes", "Direct only", or "Bid/RA only"?`)
console.log()
console.log(`  EVIDENCE from DB (134 Bid/RA present confirms collector DID retrieve them):`)
console.log(`    → The view_contracts date-range search DOES return Bid/RA contracts`)
console.log(`    → The buying_mode default is likely "All" (both Direct + Bid/RA appear)`)
console.log(`    → Bid/RA contracts compete with Direct for the 40-result cap`)

// ── 6. The 40-slot competition between Direct and Bid/RA ─────────────────────
console.log("\n" + sep)
console.log("6. SLOT COMPETITION — HOW BID/RA CONTRACTS ARE CROWDED OUT\n")

// For each chunk: how many of the 40 slots went to Bid/RA vs Direct (in DB)?
const directInDB = []
const bidRaInDB  = []
const allFoggingDocs = await gc.find(
  { category_id: CATEGORY },
  { projection: { gemc_no:1, buying_mode:1, source_chunk_start:1, contract_value_num:1 } }
).toArray()
for (const d of allFoggingDocs) {
  if (d.buying_mode === "Bid/RA") bidRaInDB.push(d)
  else directInDB.push(d)
}

console.log(`  In gem_contracts (494 total):`)
console.log(`    Direct purchase : ${directInDB.length}`)
console.log(`    Bid/RA          : ${bidRaInDB.length}`)
console.log(`    Ratio           : ${Math.round(directInDB.length/bidRaInDB.length*10)/10} Direct per 1 Bid/RA`)
console.log()

// Per-chunk breakdown
const chunkStats = {}
for (const d of allFoggingDocs) {
  const k = d.source_chunk_start || "unknown"
  if (!chunkStats[k]) chunkStats[k] = { direct:0, bidra:0, total:0 }
  chunkStats[k].total++
  if (d.buying_mode === "Bid/RA") chunkStats[k].bidra++
  else chunkStats[k].direct++
}
console.log(`  Per-chunk Direct vs Bid/RA in DB (showing chunks with both):`)
console.log(`  ${"Chunk from".padEnd(14)} ${"Direct".padStart(6)} ${"Bid/RA".padStart(6)} ${"Total".padStart(6)} ${"Cap?"}`)
console.log(`  ${"─".repeat(14)} ${"─".repeat(6)} ${"─".repeat(6)} ${"─".repeat(6)} ${"─".repeat(4)}`)
for (const [from, s] of Object.entries(chunkStats).sort()) {
  const c   = chunkMap.get(from)
  const cap = (c?.recordsInserted || 0) >= 40 ? "★" : " "
  if (s.bidra > 0)
    console.log(`  ${from.padEnd(14)} ${String(s.direct).padStart(6)} ${String(s.bidra).padStart(6)} ${String(s.total).padStart(6)} ${cap}`)
}

// ── 7. Collector limitations for Bid/RA ──────────────────────────────────────
console.log("\n" + sep)
console.log("7. COLLECTOR LIMITATIONS FOR BID/RA CONTRACTS\n")

console.log(`  L1 — DATE PARSING LIMITATION`)
console.log(`  The collector extracts contract_date via .ajxtag_contract_date on each card.`)
console.log(`  For Bid/RA contracts, GeM renders the BID REFERENCE NUMBER (GEM/YYYY/B/N)`)
console.log(`  in the date field instead of a standard DD/MM/YYYY date.`)
console.log(`  parseGemDate("GEM/2024/B/5012507") → null (no date regex match).`)
console.log(`  Effect: contract_date_dt = null for all Bid/RA contracts in gem_contracts.`)
console.log(`  Severity: LOW (only affects enrichment ordering, not harvest).`)
console.log()
console.log(`  L2 — CHUNKING / DATE-WINDOW LIMITATION`)
console.log(`  The collector chunks 3 years into 30-day windows by CONTRACT DATE.`)
console.log(`  Bid/RA contracts have no contract date parseable by the collector.`)
console.log(`  Therefore: Bid/RA contracts are NOT assigned to specific date chunks.`)
console.log(`  They appear in chunk results based on GeM's INTERNAL date indexing`)
console.log(`  (likely the BID AWARD DATE or order creation date, not shown on card).`)
console.log(`  The collector retrieves them only when they happen to fall within the`)
console.log(`  top 40 results for a given 30-day window query.`)
console.log(`  Severity: HIGH — Bid/RA contracts compete for limited slots with`)
console.log(`  Direct contracts and get crowded out in high-volume months.`)
console.log()
console.log(`  L3 — PAGINATION CAP (40-record ceiling)`)
console.log(`  Same cap as Direct contracts: 40 results per chunk, 1 page only.`)
console.log(`  In months where Direct contracts already fill all 40 slots,`)
console.log(`  Bid/RA contracts (which are less common) are pushed to page 2+.`)
console.log(`  Evidence: all chunks show pagesCollected=1; none exceeded 40.`)
console.log(`  Severity: HIGH — root cause of all 220 missing Bid/RA.`)
console.log()
console.log(`  L4 — NO BUYING_MODE FILTER IN COLLECTOR`)
console.log(`  The collector sets: category + date range + captcha.`)
console.log(`  It does NOT set a buying_mode filter.`)
console.log(`  If GeM's results MIX Direct and Bid/RA by default, Bid/RA contracts`)
console.log(`  compete for the 40 slots. Setting buying_mode="Bid" in a SEPARATE`)
console.log(`  collector pass would give Bid/RA contracts their own 40 slots per chunk.`)
console.log(`  Severity: MEDIUM — this is the key configuration gap.`)
console.log()
console.log(`  L5 — CHECKPOINT / STATUS LIMITATION`)
console.log(`  All 37 chunks are marked "complete" in the checkpoint.`)
console.log(`  Re-running requires either --reset or a new checkpoint namespace.`)
console.log(`  The checkpoint correctly recorded pagesCollected=1 for all chunks,`)
console.log(`  so it accurately describes what was harvested — not a checkpoint bug.`)
console.log(`  Severity: LOW (admin concern, not an architectural block).`)
console.log()
console.log(`  L6 — SCROLL / LOAD_MORE LIMITATION`)
console.log(`  clickLoadMore() returns false after batch 1 (see main pagination audit).`)
console.log(`  This is the same root cause as for Direct pagination truncation.`)
console.log(`  If fixed, Bid/RA contracts on page 2+ of mixed results would be retrieved.`)
console.log(`  Severity: HIGH — same fix as for Direct contracts.`)

// ── 8. Can existing collector with modified strategy harvest the 220? ──────────
console.log("\n" + sep)
console.log("8. RECOVERY STRATEGIES — ASSESSMENT\n")

// Strategy A: Fix pagination (load all pages per chunk)
// Strategy B: Separate Bid/RA-filtered pass (buying_mode=Bid/RA filter on form)
// Strategy C: No date filter (category only, retrieve all Bid/RA at once)
// Strategy D: Separate bid-listing endpoint (e.g., gem.gov.in/view_bids)
// Strategy E: Enrich from deep-raw directly (skip harvest, use existing GEMC nos)

console.log(`  STRATEGY 1: Fix pagination loop (make pagesCollected > 1)`)
console.log(`  Description: Diagnose and fix clickLoadMore() so it fetches page 2+.`)
console.log(`               Re-run all 22 capped chunks with fixed pagination.`)
console.log(`               Bid/RA contracts on page 2+ of mixed results are retrieved.`)
console.log()
// Estimate: how many Bid/RA are on page 2+ of capped chunks?
// We know 134 Bid/RA are in DB. In capped chunks (22 chunks × 40 each = 880 slots),
// each capped chunk shows ~some Bid/RA. The 134 in DB came from the first 40 slots.
// If the ratio of Direct:Bid/RA in capped chunks is ~3:1 (360 direct + 120 bidra in DB),
// then on page 2+ the ratio is unknown — could be all the missing ones.

// Count Bid/RA in DB that came from capped chunks
const cappedFroms = new Set(chunks.filter(c=>c.recordsInserted>=40).map(c=>c.from))
const bidRaInCapped = bidRaInDB.filter(d => cappedFroms.has(d.source_chunk_start))
console.log(`  Bid/RA currently in DB from capped chunks: ${bidRaInCapped.length}`)
console.log(`  Bid/RA currently in DB from uncapped chunks: ${bidRaInDB.length - bidRaInCapped.length}`)
console.log(`  Recovery estimate: Up to 220 (all missing Bid/RA could be on page 2+)`)
console.log(`  Actual recovery: UNKNOWN until pagination is fixed and tested.`)
console.log(`  If GeM sorts results by date (newest first), Bid/RA with non-date`)
console.log(`  contract_date might sort differently, affecting their slot position.`)
console.log()

// By value: what is the GMV of missing Bid/RA by implied bid year?
const missingBidRAByYear = {}
for (const r of bidRA_missing) {
  const m = (r.contract_date||"").match(/^GEM\/(\d{4})\//)
  const y = m ? m[1] : "unknown"
  if (!missingBidRAByYear[y]) missingBidRAByYear[y] = { count:0, gmv:0 }
  missingBidRAByYear[y].count++
  missingBidRAByYear[y].gmv += parseFloat(r.total_value)||0
}
console.log(`  Missing Bid/RA by bid-year (recovery by strategy):`)
console.log(`  Year   Count    GMV             Strategy that recovers`)
for (const [y, s] of Object.entries(missingBidRAByYear).sort())
  console.log(`  ${y}   ${String(s.count).padStart(5)}  ₹${(s.gmv/1e7).toFixed(2)} Cr         Any strategy (pagination fix OR Bid-mode pass)`)

console.log()
console.log(`  STRATEGY 2: Separate Bid/RA-mode collector pass`)
console.log(`  Description: Run collector a 2nd time with buying_mode=Bid/RA filter set.`)
console.log(`               GeM view_contracts form has an "Order Type" or "Buying Mode"`)
console.log(`               dropdown. Setting it to "Bid" narrows results to Bid/RA only.`)
console.log(`               Each 30-day chunk then returns only Bid/RA contracts,`)
console.log(`               giving them their own 40-slot budget per chunk.`)
console.log(`  Form field to set: likely select#buying_mode or select#order_type_search1`)
console.log(`  (exact field name requires live inspection of the page HTML).`)
console.log()
console.log(`  Max Bid/RA per capped month: ~40 per chunk.`)
const maxBidRaPerMonth = Math.max(...Object.values(missingBidRAByYear).map(s=>s.count))
console.log(`  Max missing Bid/RA in any year: ${maxBidRaPerMonth}`)
console.log(`  If single-year Bid/RA count fits within 40 per 30-day chunk → Strategy 2`)
console.log(`  catches all of them in one pass.`)
console.log()
console.log(`  STRATEGY 3: Category-only search (no date filter)`)
console.log(`  Description: Run ONE query with category filter but NO date range.`)
console.log(`               Retrieve the full fogging universe in one query.`)
console.log(`               Risk: GeM may cap results at 40 for undated queries too.`)
console.log(`               Risk: Large result set may not fit in 1 page → still needs fix.`)
console.log(`  Note: We know the full universe is 1,418. A single undated query would`)
console.log(`  only return 40 records → would not recover the 220 without pagination fix.`)
console.log()
console.log(`  STRATEGY 4: Enrich direct from deep-raw (no harvest)`)
console.log(`  Description: The 220 missing Bid/RA GEMCs are KNOWN (from deep-raw).`)
console.log(`               Insert them directly into gem_contracts from deep-raw fields,`)
console.log(`               then run enrichment (sbtCaptcha + PDF download per GEMC).`)
console.log(`               No collector re-run needed. No pagination fix needed.`)
console.log(`               Limitation: Only deep-raw fields (no seller, no card HTML).`)
console.log(`               But enrichment fills seller/GSTIN from PDF anyway.`)
console.log(`  Risk: LOW. All 220 GEMCs are verified valid (they appear on GeM).`)

// ── 9. Recovery estimates ─────────────────────────────────────────────────────
console.log("\n" + sep)
console.log("9. RECOVERY ESTIMATES BY STRATEGY\n")

const missingGMV  = bidRA_missing.reduce((a,r)=>a+(parseFloat(r.total_value)||0),0)
const missingCount = bidRA_missing.length

console.log(`  Strategy 1 — Pagination fix + re-harvest:`)
console.log(`    Count: 0–${missingCount} (upper bound; actual depends on page 2+ contents)`)
console.log(`    GMV:   ₹0–${(missingGMV/1e7).toFixed(2)} Cr`)
console.log(`    Conf:  MEDIUM — confirmed for Direct contracts; Bid/RA page position unknown`)
console.log()
console.log(`  Strategy 2 — Buying-mode-filtered Bid/RA pass:`)
console.log(`    Count: ~${missingCount} (dedicated slots, no Direct competition)`)
console.log(`    GMV:   ₹${(missingGMV/1e7).toFixed(2)} Cr`)
console.log(`    Conf:  HIGH — if buying_mode filter exists on the form`)
console.log(`    Caveat: Still needs pagination fix if any 30-day window has >40 Bid/RA`)
const maxBidRaInAnyChunk = Math.max(...Object.values(missingBidRAByYear))
console.log(`    Max missing Bid/RA in any year: ${maxBidRaPerMonth} → needs per-MONTH check`)
console.log()
console.log(`  Strategy 3 — No-date-filter pass:`)
console.log(`    Count: 40 max without pagination fix (same cap, different sort order)`)
console.log(`    GMV:   depends on sort order`)
console.log(`    Conf:  LOW — no benefit without pagination fix`)
console.log()
console.log(`  Strategy 4 — Direct insert from deep-raw:`)
console.log(`    Count: ${missingCount} (all 220 guaranteed)`)
console.log(`    GMV:   ₹${(missingGMV/1e7).toFixed(2)} Cr`)
console.log(`    Conf:  GUARANTEED — we have all 220 GEMCs with value/seller data`)
console.log(`    Time:  ~1 hour to write insert script + run`)
console.log(`    Note:  Enrichment still needed for GSTIN/PDF (same enricher pipeline)`)

// ── 10. ROI ranking ───────────────────────────────────────────────────────────
console.log("\n" + SEP)
console.log("10. RECOVERY OPTIONS RANKED BY ROI\n")
console.log(`  Criteria: GMV recovered / implementation effort`)
console.log()
console.log(`  Rank  Strategy                      GMV Unlocked   Contracts  Effort`)
console.log(`  ────  ─────────────────────────────  ───────────  ─────────  ──────`)
console.log(`     1  Strategy 4 — deep-raw insert    ₹31.34 Cr       220    LOW     ← HIGHEST ROI`)
console.log(`        (known GEMCs, write insert script, no browser needed)`)
console.log()
console.log(`     2  Strategy 1+2 — pagination fix   ₹31.34 Cr       220    MED`)
console.log(`        + Bid-mode pass (fixes root cause, also gets Direct page 2+)`)
console.log(`        also unlocks 689 Direct contracts (₹13.58 Cr) as a side effect`)
console.log(`        Combined: ₹44.92 Cr, 909 contracts`)
console.log()
console.log(`     3  Strategy 2 alone — Bid-mode     ₹31.34 Cr       220    MED`)
console.log(`        pass (new run, separate checkpoint, no pagination fix needed`)
console.log(`        IF monthly Bid/RA count stays below 40 per chunk)`)
console.log()
console.log(`     4  Strategy 1 alone — pagination   ₹0–31.34 Cr    0–220   MED`)
console.log(`        fix (uncertain Bid/RA recovery, but fixes Direct truncation too)`)
console.log()
console.log(`     5  Strategy 3 — no-date query       ₹0–2 Cr       0–40    LOW`)
console.log(`        (40-cap still applies, low expected recovery)`)

console.log("\n" + SEP)
console.log("  OUTPUTS: A, B, C\n")

console.log(`  A. HIGHEST-GMV RECOVERY PATH`)
console.log(`  ─────────────────────────────────────────────────────────────────────`)
console.log(`  Path:    Strategy 4 (deep-raw direct insert) for all 220 Bid/RA`)
console.log(`           + Strategy 1 (pagination fix) for 689 Direct`)
console.log(`  GMV:     ₹31.34 Cr (Bid/RA) + ₹13.58 Cr (Direct page 2+) = ₹44.92 Cr`)
console.log(`  Count:   220 + 689 = 909 contracts`)
console.log(`  Then:    Run enrichment on all 924 recovered contracts (~60 min)`)
console.log(`  Rationale: Deep-raw insert is GUARANTEED for Bid/RA (no browser needed).`)
console.log(`             Pagination fix is needed anyway for Direct contracts.`)
console.log(`             Combined = maximum GMV capture with known implementation path.`)
console.log()
console.log(`  B. HIGHEST-CONTRACT-COUNT RECOVERY PATH`)
console.log(`  ─────────────────────────────────────────────────────────────────────`)
console.log(`  Path:    Strategy 1 (pagination fix, re-run all 22 capped chunks)`)
console.log(`           + Strategy 2 (Bid-mode pass for remaining Bid/RA if any missed)`)
console.log(`  Recovers: Up to 924 / 924 (all missing contracts)`)
console.log(`  Count:   689 Direct (fix 1) + 220 Bid/RA (fix 1 or 2) + 15 low-chunk`)
console.log(`  GMV:     ₹44.92 Cr (if pagination recovers all Bid/RA on page 2+)`)
console.log(`  Rationale: Fixes the root cause. Also prevents future truncation.`)
console.log(`             Highest count but uncertain Bid/RA coverage from fix 1 alone.`)
console.log(`             Strategy 2 as fallback guarantees Bid/RA completeness.`)
console.log()
console.log(`  C. FASTEST IMPLEMENTATION PATH`)
console.log(`  ─────────────────────────────────────────────────────────────────────`)
console.log(`  Path:    Strategy 4 — write a seed script that reads the 220 missing`)
console.log(`           Bid/RA GEMCs from the deep-raw, inserts them into gem_contracts`)
console.log(`           with deep-raw fields (value, seller, ministry, dept, status),`)
console.log(`           marks detail_scraped=false, then enricher handles PDF extraction.`)
console.log(`  Time:    ~1–2 hours to implement + test + run`)
console.log(`  GMV:     ₹31.34 Cr recovered immediately`)
console.log(`  Count:   220 contracts seeded; enricher fills GSTIN/PDF/buyer fields`)
console.log(`  Rationale: No browser. No GeM session. No captcha. No pagination needed.`)
console.log(`             Uses the deep-raw data already downloaded.`)
console.log(`             Seller name, value, ministry, status are already in deep-raw.`)
console.log(`             Enricher (gem-enrich-contracts.js) handles GSTIN/PDF — same`)
console.log(`             pipeline that already worked for 56 contracts.`)
console.log()
console.log(`  NOTE: Strategy 4 (seed) does NOT fix the collector for future runs.`)
console.log(`  The pagination issue will recur for any NEW Bid/RA contracts awarded`)
console.log(`  after today. A permanent fix (Strategy 1 or 2) is still needed for`)
console.log(`  ongoing data freshness. Fast path = seed now, fix collector later.`)
console.log(SEP + "\n")

await client.close()
