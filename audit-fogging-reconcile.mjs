/**
 * audit-fogging-reconcile.mjs
 * Read-only. No writes.
 * Cross-references the 1,418 deep-raw discovery against gem_contracts.
 */
import { MongoClient } from "mongodb"
import fs              from "fs"
import path            from "path"

const envRaw = fs.readFileSync(".env.local", "utf8")
const ENV = {}
for (const l of envRaw.split("\n")) {
  const m = l.match(/^([^=#\s][^=]*)=(.*)$/); if (m) ENV[m[1].trim()] = m[2].trim()
}
const client = new MongoClient(ENV["MONGODB_URI"])
await client.connect()
const db = client.db()
const gc = db.collection("gem_contracts")

// ── Load authoritative universe ────────────────────────────────────────────────
const deep    = JSON.parse(fs.readFileSync("audit/fogging-deep-raw.json", "utf8"))
const ckpt    = JSON.parse(fs.readFileSync("audit/contracts-checkpoint-fogging_v2.json", "utf8"))
const CATEGORY = "home_fa68031381_agri_disp_fogg"

const SEP = "═".repeat(72)
const sep = "─".repeat(72)

console.log("\n" + SEP)
console.log("  FOGGING COVERAGE RECONCILIATION")
console.log("  Authoritative universe: audit/fogging-deep-raw.json")
console.log(SEP)

// ── 1. Universe ────────────────────────────────────────────────────────────────
console.log("\n1. DISCOVERY UNIVERSE\n")
const deepByGemc = new Map(deep.map(r => [r.gemc_no, r]))
const allGemcs   = [...deepByGemc.keys()]
console.log(`  Total contracts discovered : ${allGemcs.length}`)
console.log(`  Source                     : audit/fogging-deep-raw.json`)
console.log(`  Category                   : ${CATEGORY}`)

// Date range in deep-raw
const deepDates = deep.map(r => r.contract_date_dt || r.contract_date).filter(Boolean).sort()
const deepVals  = deep.map(r => parseFloat(r.total_value) || r.contract_value_num || 0)
const deepGMV   = deepVals.reduce((a,b) => a+b, 0)
console.log(`  Date range                 : ${deep.reduce((min,r)=>r.contract_date<min?r.contract_date:min, deep[0].contract_date)} → ${deep.reduce((max,r)=>r.contract_date>max?r.contract_date:max, deep[0].contract_date)}`)
console.log(`  Total GMV                  : ₹${(deepGMV/1e7).toFixed(2)} Cr`)

// ── 2. gem_contracts current state ────────────────────────────────────────────
console.log("\n" + sep)
console.log("2. gem_contracts CURRENT STATE\n")

const BATCH = 500
const matchedDocs = []
for (let i = 0; i < allGemcs.length; i += BATCH) {
  const chunk = allGemcs.slice(i, i + BATCH)
  const docs  = await gc.find(
    { gemc_no: { $in: chunk } },
    { projection: { gemc_no: 1, category_id: 1, detail_scraped: 1,
                    contract_value_num: 1, contract_date: 1, contract_date_dt: 1,
                    buying_mode: 1, harvested_at: 1 } }
  ).toArray()
  matchedDocs.push(...docs)
}

const matchedGemcSet = new Set(matchedDocs.map(d => d.gemc_no))
const missingGemcs   = allGemcs.filter(g => !matchedGemcSet.has(g))
const missingRecords = missingGemcs.map(g => deepByGemc.get(g))

console.log(`  Found in gem_contracts      : ${matchedDocs.length}`)
console.log(`  Missing from gem_contracts  : ${missingGemcs.length}`)
console.log(`  category_id = fogging       : ${matchedDocs.filter(d=>d.category_id===CATEGORY).length}`)
console.log(`  detail_scraped = true       : ${matchedDocs.filter(d=>d.detail_scraped).length}`)
console.log(`  detail_scraped = false      : ${matchedDocs.filter(d=>!d.detail_scraped).length}`)

// ── 3. Collector checkpoint ────────────────────────────────────────────────────
console.log("\n" + sep)
console.log("3. COLLECTOR CHECKPOINT ANALYSIS\n")
const chunks = ckpt.chunks
const totalInserted = chunks.reduce((a,c) => a + c.recordsInserted, 0)
const totalSkipped  = chunks.reduce((a,c) => a + c.recordsSkipped,  0)
console.log(`  Checkpoint file : audit/contracts-checkpoint-fogging_v2.json`)
console.log(`  Total chunks    : ${chunks.length}  (all status=complete)`)
console.log(`  Window          : ${chunks[chunks.length-1].from} → ${chunks[0].to}`)
console.log(`  Days covered    : ${ckpt.totalDays}  (chunk size: ${ckpt.chunkDays})`)
console.log(`  Records inserted: ${totalInserted}`)
console.log(`  Records skipped : ${totalSkipped}`)
console.log(`  DISCREPANCY     : ${totalInserted} inserted by collector vs ${matchedDocs.length} found in DB vs ${allGemcs.length} in discovery`)

// Chunk breakdown: which chunks had > 0 inserts
const nonZeroChunks = chunks.filter(c => c.recordsInserted > 0)
console.log(`  Non-zero chunks : ${nonZeroChunks.length} of ${chunks.length}`)

// Top inserting chunks
const topChunks = [...chunks].sort((a,b) => b.recordsInserted - a.recordsInserted).slice(0, 10)
console.log("\n  Top 10 chunks by insertion count:")
for (const c of topChunks) {
  if (c.recordsInserted === 0) break
  console.log(`    chunk ${String(c.id).padStart(2)}  ${c.from} → ${c.to}  : ${c.recordsInserted} inserted`)
}

// ── 4. Missing GEMCs — why they're missing ────────────────────────────────────
console.log("\n" + sep)
console.log("4. MISSING CONTRACTS — ROOT CAUSE ANALYSIS\n")

// Parse dates from missing records
function parseDate(s) {
  if (!s) return null
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (m) {
    const d = new Date(`${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`)
    return isNaN(d.getTime()) ? null : d
  }
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d
}

const missingWithDates = missingRecords.map(r => ({
  ...r,
  dt: parseDate(r.contract_date),
  val: parseFloat(r.total_value) || r.contract_value_num || 0,
}))

// Present records with dates (for comparison)
const presentWithDates = matchedDocs.map(d => ({
  gemc_no: d.gemc_no,
  dt: d.contract_date_dt || parseDate(d.contract_date),
  val: d.contract_value_num || 0,
}))

// Date distribution of missing
const missingByYear = {}
const presentByYear = {}
for (const r of missingWithDates) {
  const y = r.dt ? r.dt.getFullYear() : "unknown"
  missingByYear[y] = (missingByYear[y] || 0) + 1
}
for (const d of presentWithDates) {
  const y = d.dt ? d.dt.getFullYear() : "unknown"
  presentByYear[y] = (presentByYear[y] || 0) + 1
}

console.log("  Date distribution — MISSING vs PRESENT:\n")
console.log(`  Year    Missing  Present`)
const allYears = [...new Set([...Object.keys(missingByYear), ...Object.keys(presentByYear)])].sort()
for (const y of allYears) {
  const m = missingByYear[y] || 0
  const p = presentByYear[y] || 0
  const bar = "█".repeat(Math.round(m / 10))
  console.log(`  ${y}    ${String(m).padStart(7)}  ${String(p).padStart(7)}  ${bar}`)
}

// Monthly distribution of missing
console.log("\n  Monthly distribution of MISSING contracts:")
const byMonth = {}
for (const r of missingWithDates) {
  if (!r.dt) continue
  const k = `${r.dt.getFullYear()}-${String(r.dt.getMonth()+1).padStart(2,"0")}`
  byMonth[k] = (byMonth[k]||0) + 1
}
const maxM = Math.max(...Object.values(byMonth))
for (const [ym, cnt] of Object.entries(byMonth).sort()) {
  const bar = "█".repeat(Math.round((cnt/maxM)*30))
  console.log(`  ${ym}  ${String(cnt).padStart(3)}  ${bar}`)
}

// Buying mode breakdown of missing
console.log("\n  Buying mode — MISSING:")
const missingModes = {}
for (const r of missingRecords) {
  const m = r.buying_mode || "(null)"
  missingModes[m] = (missingModes[m]||0) + 1
}
for (const [m,n] of Object.entries(missingModes).sort((a,b)=>b[1]-a[1]))
  console.log(`    ${m.padEnd(25)}: ${n}`)

// Overlap analysis: which collector chunk date windows cover the missing records
console.log("\n  Coverage of missing contracts by collector window:")
const collectorStart = parseDate(chunks[chunks.length-1].from.split("-").reverse().join("/"))
const collectorEnd   = new Date()  // today
const missingInWindow  = missingWithDates.filter(r => r.dt && r.dt >= collectorStart && r.dt <= collectorEnd)
const missingOutWindow = missingWithDates.filter(r => !r.dt || r.dt < collectorStart)
console.log(`  Collector window: ${chunks[chunks.length-1].from} → today`)
console.log(`  Missing IN window   : ${missingInWindow.length}  (collector SHOULD have found these)`)
console.log(`  Missing OUT window  : ${missingOutWindow.length}  (pre-dating collector window or no date)`)

// ── 5. Root cause breakdown ────────────────────────────────────────────────────
console.log("\n" + sep)
console.log("5. ROOT CAUSE BREAKDOWN\n")

// Cross-reference: which of the missing GEMCs does the collector checkpoint claim to have inserted?
// The checkpoint only has aggregate counts per chunk, not individual GEMCs.
// So we infer from date windows: missing contracts whose dates fall in a COMPLETE chunk
// should have been collected — their absence suggests a page-limit issue.

const missingInCompleteWindow = []
const missingPreWindow        = []
const missingNoDate           = []

for (const r of missingWithDates) {
  if (!r.dt) { missingNoDate.push(r); continue }
  const inAnyCompleteChunk = chunks.some(c => {
    const from = parseDate(c.from.split("-").reverse().join("/"))
    const to   = parseDate(c.to.split("-").reverse().join("/"))
    if (!from || !to) return false
    return c.status === "complete" && r.dt >= from && r.dt <= to
  })
  if (inAnyCompleteChunk) missingInCompleteWindow.push(r)
  else missingPreWindow.push(r)
}

console.log(`  A. Collector page-limit / pagination truncation`)
console.log(`     Missing contracts whose date falls in a complete collector chunk`)
console.log(`     (collector ran the window but didn't retrieve all pages of results)`)
console.log(`     Count: ${missingInCompleteWindow.length}`)
console.log()
console.log(`  B. Pre-window / date-range gap`)
console.log(`     Missing contracts dated before or outside collector window`)
console.log(`     Count: ${missingPreWindow.length}`)
console.log()
console.log(`  C. No parseable date in deep-raw`)
console.log(`     Count: ${missingNoDate.length}`)
console.log()

// Check: are there contracts in gem_contracts with fogging category but NOT in deep-raw?
const allFoggingInDb = await gc.find(
  { category_id: CATEGORY },
  { projection: { gemc_no: 1, contract_value_num: 1, detail_scraped: 1 } }
).toArray()
const inDbNotInDeep = allFoggingInDb.filter(d => !deepByGemc.has(d.gemc_no))
console.log(`  D. In gem_contracts (category=fogging) but NOT in deep-raw file`)
console.log(`     (contracts collected by standard harvester but not in discovery scan)`)
console.log(`     Count: ${inDbNotInDeep.length}`)
if (inDbNotInDeep.length > 0) {
  for (const d of inDbNotInDeep.slice(0,5))
    console.log(`       ${d.gemc_no}  ₹${((d.contract_value_num||0)/100000).toFixed(2)}L  detail_scraped:${d.detail_scraped}`)
}

// ── 6. Top 50 missing by value ─────────────────────────────────────────────────
console.log("\n" + sep)
console.log("6. TOP 50 MISSING GEMCs BY VALUE\n")

const sorted = [...missingWithDates].sort((a,b) => b.val - a.val).slice(0, 50)
console.log(`  ${"#".padStart(3)}  ${"GEMC".padEnd(30)}  ${"Value (₹)".padStart(14)}  ${"Date".padEnd(12)}  ${"Seller".padEnd(35)}  Mode`)
console.log(`  ${"─".repeat(3)}  ${"─".repeat(30)}  ${"─".repeat(14)}  ${"─".repeat(12)}  ${"─".repeat(35)}  ─────`)
for (let i = 0; i < sorted.length; i++) {
  const r   = sorted[i]
  const val = r.val >= 1e7 ? `₹${(r.val/1e7).toFixed(2)} Cr` : `₹${(r.val/1e5).toFixed(2)} L`
  const dt  = r.dt ? r.dt.toISOString().slice(0,10) : (r.contract_date || "—").slice(0,10)
  const sel = (r.seller_name || "—").slice(0,35)
  const mo  = (r.buying_mode || "—").slice(0,8)
  console.log(`  ${String(i+1).padStart(3)}  ${r.gemc_no.padEnd(30)}  ${val.padStart(14)}  ${dt.padEnd(12)}  ${sel.padEnd(35)}  ${mo}`)
}

// GMV of missing
const missingGMV = missingWithDates.reduce((a,r)=>a+r.val,0)
const presentGMV = presentWithDates.reduce((a,d)=>a+d.val,0)
console.log(`\n  Missing GMV  : ₹${(missingGMV/1e7).toFixed(2)} Cr`)
console.log(`  Present GMV  : ₹${(presentGMV/1e7).toFixed(2)} Cr  (from deep-raw values matched in DB)`)
console.log(`  Universe GMV : ₹${(deepGMV/1e7).toFixed(2)} Cr`)
console.log(`  Coverage     : ${((matchedDocs.length/allGemcs.length)*100).toFixed(1)}% of contracts  |  ${((presentGMV/deepGMV)*100).toFixed(1)}% of GMV`)

// ── 7. Can the current collector harvest the missing? ─────────────────────────
console.log("\n" + sep)
console.log("7. HARVESTABILITY OF MISSING CONTRACTS\n")

// Check collector behaviour: does it use pagination?
// From checkpoint: chunk with most inserts
const maxInserts = Math.max(...chunks.map(c=>c.recordsInserted))
const maxChunk   = chunks.find(c=>c.recordsInserted===maxInserts)
const avgPerChunk = (totalInserted / nonZeroChunks.length).toFixed(1)
console.log(`  Collector behaviour:`)
console.log(`    Max inserts in one chunk : ${maxInserts}  (chunk ${maxChunk?.id}: ${maxChunk?.from} → ${maxChunk?.to})`)
console.log(`    Avg inserts per non-zero : ${avgPerChunk}`)
console.log(`    Pages collected per chunk: varies (from checkpoint.pagesCollected)`)

// Check pagesCollected per chunk
const pagesPerChunk = chunks.map(c=>c.pagesCollected||0)
const maxPages = Math.max(...pagesPerChunk)
const avgPages = (pagesPerChunk.reduce((a,b)=>a+b,0)/chunks.length).toFixed(1)
console.log(`    Max pages in one chunk   : ${maxPages}`)
console.log(`    Avg pages per chunk      : ${avgPages}`)

const onePageChunks = chunks.filter(c=>(c.pagesCollected||0)===1 && c.recordsInserted>0)
const multiPageChunks = chunks.filter(c=>(c.pagesCollected||0)>1)
console.log(`    Chunks with 1 page only  : ${onePageChunks.length}  (potential pagination truncation)`)
console.log(`    Chunks with >1 page      : ${multiPageChunks.length}`)

if (multiPageChunks.length > 0) {
  console.log(`\n    Multi-page chunks:`)
  for (const c of multiPageChunks)
    console.log(`      chunk ${c.id}: ${c.from} → ${c.to}  pages:${c.pagesCollected}  inserted:${c.recordsInserted}`)
}

// Conclusion: if ALL chunks collected only 1 page, and some chunks have many records,
// the missing contracts are likely on page 2+ of those busy chunks.
console.log()
const allOnePageOrZero = chunks.every(c => (c.pagesCollected||0) <= 1)
if (allOnePageOrZero) {
  console.log(`  FINDING: Every collector chunk fetched at most 1 page.`)
  console.log(`  GeM's default page size is 20 records per page.`)
  console.log(`  Any chunk with more than 20 contracts in its 30-day window`)
  console.log(`  would have records on page 2+ that were NEVER collected.`)
  console.log()
  const busyChunks = chunks.filter(c=>c.recordsInserted>20)
  console.log(`  Chunks with >20 inserts (page-limit definite): ${busyChunks.length}`)
  for (const c of busyChunks.slice(0,10))
    console.log(`    chunk ${c.id}: ${c.from} → ${c.to}  inserted:${c.recordsInserted}  (page 2+ missed)`)
  console.log()
  console.log(`  Estimated missed from page-limit (inserted >20 means at least page 2 existed):`)
  const estimatedMissed = busyChunks.reduce((a,c) => a + Math.max(0, c.recordsInserted - 20), 0)
  console.log(`  Conservative estimate: ${estimatedMissed} additional contracts were on missed pages`)
}

// ── Summary ────────────────────────────────────────────────────────────────────
console.log("\n" + SEP)
console.log("  RECONCILIATION SUMMARY")
console.log(SEP)
console.log(`  Universe (deep-raw)         : ${allGemcs.length}`)
console.log(`  In gem_contracts            : ${matchedDocs.length}  (${(matchedDocs.length/allGemcs.length*100).toFixed(1)}%)`)
console.log(`  Missing from gem_contracts  : ${missingGemcs.length}  (${(missingGemcs.length/allGemcs.length*100).toFixed(1)}%)`)
console.log(`  In DB not in deep-raw       : ${inDbNotInDeep.length}`)
console.log()
console.log(`  Missing breakdown:`)
console.log(`    Pagination truncation     : ~${missingInCompleteWindow.length}  (in completed chunk window, not retrieved)`)
console.log(`    Pre/out-of-window         : ${missingPreWindow.length}`)
console.log(`    No date                   : ${missingNoDate.length}`)
console.log()
console.log(`  GMV coverage: ${((presentGMV/deepGMV)*100).toFixed(1)}% of total universe GMV is in DB`)
console.log(SEP+"\n")

await client.close()
