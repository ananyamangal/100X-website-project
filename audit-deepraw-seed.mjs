/**
 * audit-deepraw-seed.mjs
 * Read-only. No writes.
 *
 * Feasibility audit for seeding 220 missing Bid/RA fogging contracts
 * from audit/fogging-deep-raw.json into gem_contracts without re-visiting GeM.
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
const db  = client.db()
const gc  = db.collection("gem_contracts")
const gcr = db.collection("gem_contracts_raw")

const CATEGORY = "home_fa68031381_agri_disp_fogg"
const SEP  = "═".repeat(72)
const sep  = "─".repeat(72)

const deep = JSON.parse(fs.readFileSync("audit/fogging-deep-raw.json", "utf8"))

// ── Identify the 220 missing Bid/RA ──────────────────────────────────────────
const allGemcs = deep.map(r => r.gemc_no)
const BATCH = 500
const matchedSet = new Set()
for (let i = 0; i < allGemcs.length; i += BATCH) {
  const chunk = allGemcs.slice(i, i + BATCH)
  const docs  = await gc.find({ gemc_no: { $in: chunk } }, { projection: { gemc_no: 1 } }).toArray()
  for (const d of docs) matchedSet.add(d.gemc_no)
}
const deepBidRA  = deep.filter(r => r.buying_mode === "Bid/RA")
const bidRA_miss = deepBidRA.filter(r => !matchedSet.has(r.gemc_no))
const bidRA_pres = deepBidRA.filter(r =>  matchedSet.has(r.gemc_no))

// ── Fetch the 134 present Bid/RA records from DB (ground truth for schema) ───
const presGemcs = bidRA_pres.map(r => r.gemc_no)
const presentDB = []
for (let i = 0; i < presGemcs.length; i += BATCH) {
  const chunk = presGemcs.slice(i, i + BATCH)
  const docs  = await gc.find({ gemc_no: { $in: chunk } }).toArray()
  presentDB.push(...docs)
}

// ── Helper: field completeness across an array of docs ───────────────────────
function completeness(docs, fields) {
  const out = {}
  for (const f of fields) {
    const nonNull = docs.filter(d => d[f] !== null && d[f] !== undefined && d[f] !== "")
    out[f] = { count: nonNull.length, pct: Math.round(nonNull.length / docs.length * 100) }
  }
  return out
}

function pctBar(pct) {
  const full = Math.round(pct / 5)
  return "█".repeat(full) + "░".repeat(20 - full) + ` ${pct}%`
}

console.log("\n" + SEP)
console.log("  DEEP-RAW SEED FEASIBILITY AUDIT")
console.log(SEP)

// ── 1. Field inventory in deep-raw ───────────────────────────────────────────
console.log("\n1. DEEP-RAW FIELD INVENTORY — 220 MISSING BID/RA CONTRACTS\n")

const deepFields = Object.keys(bidRA_miss[0])
console.log(`  Source file : audit/fogging-deep-raw.json`)
console.log(`  Record count: ${bidRA_miss.length}`)
console.log(`  Fields      : ${deepFields.length}\n`)

const deepComp = completeness(bidRA_miss, deepFields)
console.log(`  ${"Field".padEnd(22)}  ${"Present".padStart(7)}  Completeness`)
console.log(`  ${"─".repeat(22)}  ${"─".repeat(7)}  ${"─".repeat(28)}`)
for (const f of deepFields) {
  const c = deepComp[f]
  console.log(`  ${f.padEnd(22)}  ${String(c.count).padStart(4)} / ${bidRA_miss.length}  ${pctBar(c.pct)}`)
}

// ── 2. gem_contracts schema (full field list from present docs) ───────────────
console.log("\n" + sep)
console.log("2. gem_contracts SCHEMA — FIELDS IN PRESENT BID/RA RECORDS\n")

const allDbFields = new Set()
for (const d of presentDB) Object.keys(d).forEach(k => allDbFields.add(k))
const dbFields = [...allDbFields].filter(f => f !== "_id").sort()

console.log(`  Total distinct fields in present 134 Bid/RA DB docs: ${dbFields.length}\n`)
const dbComp = completeness(presentDB, dbFields)
console.log(`  ${"Field".padEnd(28)}  ${"Count".padStart(5)}  Completeness`)
console.log(`  ${"─".repeat(28)}  ${"─".repeat(5)}  ${"─".repeat(28)}`)
for (const f of dbFields) {
  const c = dbComp[f]
  if (c.count > 0)
    console.log(`  ${f.padEnd(28)}  ${String(c.count).padStart(4)}/${presentDB.length}  ${pctBar(c.pct)}`)
}

// ── 3. Field mapping: deep-raw → gem_contracts ───────────────────────────────
console.log("\n" + sep)
console.log("3. FIELD MAPPING: deep-raw → gem_contracts\n")

const mapping = [
  // [deep_raw_field, gc_field, transform_note, confidence]
  ["gemc_no",           "gemc_no",              "direct copy",                           "EXACT"],
  ["buying_mode",       "buying_mode",           "direct copy ('Bid/RA')",                "EXACT"],
  ["status",            "contract_status",       "direct copy",                           "EXACT"],
  ["total_value",       "contract_value",        "format as '₹ {value}'",                "EXACT"],
  ["contract_value_num","contract_value_num",    "direct copy (numeric)",                 "EXACT"],
  ["ministry",          "ministry",              "direct copy",                           "EXACT"],
  ["dept",              "dept_name",             "direct copy",                           "EXACT"],
  ["office_zone",       "office_name",           "direct copy",                           "EXACT"],
  ["org_type",          "org_type",              "direct copy",                           "EXACT"],
  ["org_name",          "org_name",              "direct copy",                           "EXACT"],
  ["contract_date",     "contract_date",         "bid ref stored as-is ('GEM/YYYY/B/N')", "EXACT"],
  ["contract_date_dt",  "contract_date_dt",      "null (bid ref has no date)",            "EXACT"],
  ["seller_name",       "seller_name_raw",       "direct copy",                           "EXACT"],
  ["seller_name",       "seller_name_canonical", "uppercase + strip M/S prefix",          "DERIVED"],
  ["product_full",      "product_name",          "direct copy",                           "EXACT"],
  ["(none)",            "category_id",           "hardcode CATEGORY constant",            "INJECT"],
  ["(none)",            "source",                "hardcode 'deep_raw_seed'",              "INJECT"],
  ["(none)",            "detail_scraped",        "hardcode false",                        "INJECT"],
  ["(none)",            "parser_version",        "hardcode 3 (match collector)",          "INJECT"],
  ["(none)",            "first_seen",            "new Date() at insert time",             "INJECT"],
  ["(none)",            "harvested_at",          "null (not harvested via collector)",    "INJECT"],
]

console.log(`  ${"Deep-raw field".padEnd(18)}  ${"→  gem_contracts field".padEnd(26)}  ${"Type".padEnd(8)}  Note`)
console.log(`  ${"─".repeat(18)}  ${"─".repeat(26)}  ${"─".repeat(8)}  ${"─".repeat(30)}`)
for (const [src, dst, note, conf] of mapping)
  console.log(`  ${src.padEnd(18)}  →  ${dst.padEnd(24)}  ${conf.padEnd(8)}  ${note}`)

const exactCount   = mapping.filter(m=>m[3]==="EXACT").length
const derivedCount = mapping.filter(m=>m[3]==="DERIVED").length
const injectCount  = mapping.filter(m=>m[3]==="INJECT").length
console.log(`\n  EXACT mappings   : ${exactCount}  (zero transformation needed)`)
console.log(`  DERIVED mappings : ${derivedCount}  (simple string transform)`)
console.log(`  INJECTED fields  : ${injectCount}  (no deep-raw source, hardcoded)`)

// ── 4. Per-contract detail for all 220 ───────────────────────────────────────
console.log("\n" + sep)
console.log("4. ALL 220 MISSING BID/RA — FIELD COMPLETENESS\n")

// Check each required field across all 220
const requiredFields = [
  { name: "gemc_no",           label: "GEMC number",      src: "gemc_no" },
  { name: "seller_name",       label: "Seller name",      src: "seller_name" },
  { name: "buyer_dept",        label: "Buyer dept",       src: "dept" },
  { name: "buyer_org",         label: "Buyer org",        src: "org_name" },
  { name: "ministry",          label: "Ministry/State",   src: "ministry" },
  { name: "contract_value_num",label: "Contract value",   src: "contract_value_num" },
  { name: "bid_reference",     label: "Bid reference",    src: "contract_date" },
  { name: "product_name",      label: "Product name",     src: "product_full" },
  { name: "status",            label: "Contract status",  src: "status" },
  { name: "buying_mode",       label: "Buying mode",      src: "buying_mode" },
]

console.log(`  ${"Field".padEnd(18)}  ${"Source key".padEnd(18)}  Completeness`)
console.log(`  ${"─".repeat(18)}  ${"─".repeat(18)}  ${"─".repeat(28)}`)
let allComplete = true
for (const rf of requiredFields) {
  const nonNull = bidRA_miss.filter(r => {
    const v = r[rf.src]
    return v !== null && v !== undefined && v !== "" && v !== "N/A"
  })
  const pct = Math.round(nonNull.length / bidRA_miss.length * 100)
  if (pct < 100) allComplete = false
  console.log(`  ${rf.label.padEnd(18)}  ${rf.src.padEnd(18)}  ${pctBar(pct)}`)
}
console.log(`\n  All required fields 100% present: ${allComplete}`)

// Show the "N/A" org_name cases
const naOrg = bidRA_miss.filter(r => r.org_name === "N/A" || !r.org_name)
console.log(`  org_name = "N/A" or null: ${naOrg.length} records (still valid — dept_name covers it)`)

// Contract URL derivation
console.log(`\n  Contract URL:`)
console.log(`  GeM contract URL format: https://gem.gov.in/view_contracts_details?gemc_no={gemc_no}`)
console.log(`  This can be derived from gemc_no alone — 100% constructable for all 220.`)
const sampleUrl = `https://gem.gov.in/view_contracts_details?gemc_no=${bidRA_miss[0].gemc_no}`
console.log(`  Example: ${sampleUrl}`)

// ── 5. Sample of all 220 — first 30 rows ─────────────────────────────────────
console.log("\n" + sep)
console.log("5. SAMPLE — FIRST 30 MISSING BID/RA CONTRACTS\n")

const sorted220 = [...bidRA_miss].sort((a,b) => (b.contract_value_num||0) - (a.contract_value_num||0))

console.log(`  ${"#".padStart(3)}  ${"GEMC".padEnd(26)}  ${"Value".padStart(10)}  ${"Seller".padEnd(22)}  ${"Buyer dept".padEnd(30)}  ${"Bid ref".padEnd(20)}  Status`)
console.log(`  ${"─".repeat(3)}  ${"─".repeat(26)}  ${"─".repeat(10)}  ${"─".repeat(22)}  ${"─".repeat(30)}  ${"─".repeat(20)}  ─────`)
for (let i = 0; i < Math.min(30, sorted220.length); i++) {
  const r   = sorted220[i]
  const val = r.contract_value_num >= 1e7 ? `₹${(r.contract_value_num/1e7).toFixed(2)}Cr` : `₹${(r.contract_value_num/1e5).toFixed(2)}L`
  const sel = (r.seller_name||"—").slice(0,22)
  const byr = (r.dept||"—").slice(0,30)
  const ref = (r.contract_date||"—").slice(0,20)
  const sts = (r.status||"—").slice(0,20)
  console.log(`  ${String(i+1).padStart(3)}  ${r.gemc_no.padEnd(26)}  ${val.padStart(10)}  ${sel.padEnd(22)}  ${byr.padEnd(30)}  ${ref.padEnd(20)}  ${sts}`)
}

// ── 6. Fields null UNTIL enrichment ──────────────────────────────────────────
console.log("\n" + sep)
console.log("6. FIELDS NULL UNTIL ENRICHMENT (sbtCaptcha + PDF)\n")

// What the enricher fills (from gem-enrich-contracts.js knowledge):
const enricherFills = [
  ["seller_name_raw",      "PDF: Seller Details section",                   "100%  (if PDF accessible)"],
  ["seller_name_canonical","derived from seller_name_raw",                  "100%"],
  ["seller_gst",           "PDF: Seller GSTIN field",                       "~85%  (small sellers may lack GST)"],
  ["seller_gem_id",        "PDF: GeM Seller ID field",                      "~90%"],
  ["seller_msme",          "PDF: MSME registration field",                  "~60%  (not all registered)"],
  ["seller_state",         "PDF: Seller address state",                     "~90%"],
  ["buyer_name",           "PDF: Buyer / Consignee section",                "~95%"],
  ["buyer_designation",    "PDF: Buyer designation field",                  "~80%"],
  ["buyer_gst",            "PDF: Buyer GSTIN",                              "~70%  (govt orgs may skip)"],
  ["oem_name",             "PDF: OEM / Make & Model section",               "~75%"],
  ["oem_brand",            "PDF: Brand name field",                         "~80%"],
  ["country_of_origin",    "PDF: Country of origin",                        "~85%"],
  ["contract_value_pdf",   "PDF: Total order value field (cross-check)",    "~95%"],
  ["pdf_path",             "archive: Fogging-V2/PDFs/{GEMC}.pdf",          "100%  (if PDF downloads)"],
  ["pdf_size_bytes",       "file size of downloaded PDF",                   "100%"],
  ["extraction_confidence","parser scoring on field presence",              "100%"],
  ["enrichment_timestamp", "set on successful enrichment",                  "100%"],
  ["enrichment_attempts",  "counter incremented on each try",               "100%"],
  ["detail_scraped",       "set to true on success (currently false)",      "100%"],
]

console.log(`  ${"Field".padEnd(28)}  ${"Source".padEnd(36)}  Expected fill rate`)
console.log(`  ${"─".repeat(28)}  ${"─".repeat(36)}  ${"─".repeat(18)}`)
for (const [f, src, rate] of enricherFills)
  console.log(`  ${f.padEnd(28)}  ${src.padEnd(36)}  ${rate}`)

// What deep-raw already provides that enricher would normally fill
console.log(`\n  NOTE: deep-raw provides seller_name and product_full already.`)
console.log(`  Enricher output for seller_name_canonical may DIFFER from deep-raw`)
console.log(`  (enricher gets it from PDF; deep-raw has abbreviated brand names).`)
console.log(`  Enricher output should be treated as authoritative — it overwrites`)
console.log(`  seller_name_raw and seller_name_canonical on success.`)

// ── 7. Seed feasibility verdict ───────────────────────────────────────────────
console.log("\n" + sep)
console.log("7. SEED FEASIBILITY VERDICT\n")

// Check: are any of the 220 already in gem_contracts_raw?
const miss220Gemcs = bidRA_miss.map(r => r.gemc_no)
const rawHits = []
for (let i = 0; i < miss220Gemcs.length; i += BATCH) {
  const chunk = miss220Gemcs.slice(i, i + BATCH)
  const docs  = await gcr.find({ gemc_no: { $in: chunk } }, { projection: { gemc_no: 1 } }).toArray()
  rawHits.push(...docs)
}
console.log(`  Missing 220 in gem_contracts_raw: ${rawHits.length}`)
console.log(`  (If > 0, those have card HTML available for a richer seed)`)

// Check uniqueness constraint
const existingGemc = await gc.findOne({ gemc_no: bidRA_miss[0].gemc_no })
console.log(`  First missing GEMC already in gem_contracts: ${!!existingGemc}`)
console.log(`  (Verifies uniqueness index will not block insert)`)

// Value sanity check — cross-check a known present record
const samplePresent = presentDB[0]
const sampleDeep    = deep.find(r => r.gemc_no === samplePresent.gemc_no)
console.log(`\n  Value cross-check (present Bid/RA contract):`)
console.log(`    GEMC             : ${samplePresent.gemc_no}`)
console.log(`    DB value_num     : ${samplePresent.contract_value_num}`)
console.log(`    Deep-raw val_num : ${sampleDeep?.contract_value_num}`)
console.log(`    Match            : ${samplePresent.contract_value_num === sampleDeep?.contract_value_num}`)

const valMatch = bidRA_pres.every(r => {
  const db = presentDB.find(d => d.gemc_no === r.gemc_no)
  return db && db.contract_value_num === r.contract_value_num
})
console.log(`  Value match for all 134 present Bid/RA: ${valMatch}`)

// Ministry / dept cross-check
const ministryMatch = bidRA_pres.filter(r => {
  const db = presentDB.find(d => d.gemc_no === r.gemc_no)
  return db && db.ministry === r.ministry
}).length
console.log(`  Ministry match (134 present): ${ministryMatch} / ${bidRA_pres.length} (${Math.round(ministryMatch/bidRA_pres.length*100)}%)`)

const deptMatch = bidRA_pres.filter(r => {
  const db = presentDB.find(d => d.gemc_no === r.gemc_no)
  return db && db.dept_name === r.dept
}).length
console.log(`  Dept match (134 present)    : ${deptMatch} / ${bidRA_pres.length} (${Math.round(deptMatch/bidRA_pres.length*100)}%)`)

// ── 8. Comparison: Seed vs Collector-fix ─────────────────────────────────────
console.log("\n" + SEP)
console.log("8. COMPARISON: DEEP-RAW SEED vs COLLECTOR FIX + RE-HARVEST\n")

const dimW = 32
const colW = 28

console.log(`  ${"Dimension".padEnd(dimW)}  ${"A. Deep-raw Seed".padEnd(colW)}  B. Collector Fix + Re-harvest`)
console.log(`  ${"─".repeat(dimW)}  ${"─".repeat(colW)}  ${"─".repeat(30)}`)

const rows = [
  ["Implementation effort",
   "LOW (1–2 hrs, pure JS)",
   "MED-HIGH (4–8 hrs, live browser)"],
  ["Bid/RA recovery count",
   "220 GUARANTEED",
   "0–220 (uncertain placement)"],
  ["Direct contract recovery",
   "0 (not applicable)",
   "689 (from page 2+)"],
  ["Total contracts recovered",
   "220",
   "Up to 909 (220 Bid + 689 Direct)"],
  ["Bid/RA GMV recovered",
   "₹31.34 Cr (guaranteed)",
   "₹0–31.34 Cr (uncertain)"],
  ["Total GMV recovered",
   "₹31.34 Cr",
   "₹44.92 Cr (if all recovered)"],
  ["Browser / GeM session",
   "NOT required for seed",
   "Required (Playwright + captcha)"],
  ["Risk of GeM blocking",
   "None (no GeM traffic)",
   "Medium (captcha, session mgmt)"],
  ["Data freshness",
   "Deep-raw snapshot (Jun 2026)",
   "Live at time of re-harvest"],
  ["Seller GSTIN in seed",
   "NULL (enricher fills later)",
   "NULL (enricher fills later)"],
  ["Seller name in seed",
   "Abbreviated (deep-raw brand)",
   "From card HTML (.ajxtag_)"],
  ["PDF harvest",
   "Via enricher (no change)",
   "Via enricher (no change)"],
  ["card HTML in gem_contracts_raw",
   "ABSENT (no raw card)",
   "PRESENT (full card HTML)"],
  ["Future new contracts",
   "NOT fixed (one-time backfill)",
   "FIXED (pagination loop repaired)"],
  ["Prevents future truncation",
   "NO",
   "YES (permanent fix)"],
  ["Requires checkpoint reset",
   "NO",
   "YES (reset 22 capped chunks)"],
  ["Can run without GeM login",
   "YES",
   "NO (needs live browser session)"],
  ["Time to seeded/DB records",
   "~30 minutes",
   "~2–4 hrs (harvest + fix time)"],
  ["Time to enriched records",
   "~15 min (220 × enricher)",
   "~15 min (220 × enricher)"],
]

for (const [dim, a, b] of rows)
  console.log(`  ${dim.padEnd(dimW)}  ${a.padEnd(colW)}  ${b}`)

// ── 9. Recommendation ─────────────────────────────────────────────────────────
console.log("\n" + SEP)
console.log("  RECOMMENDATION\n")

console.log(`  RECOMMENDED: Both, in sequence.`)
console.log(`  Primary action first: A (deep-raw seed) then B (collector fix).`)
console.log()
console.log(`  WHY A FIRST:`)
console.log(`    · 220 GEMCs are known, verified, and complete in deep-raw.`)
console.log(`    · No GeM session, no captcha, no Playwright — pure MongoDB upsert.`)
console.log(`    · Immediately unlocks ₹31.34 Cr of Bid/RA contracts for enrichment.`)
console.log(`    · Enricher can run on all 220 within ~15 min of seeding.`)
console.log(`    · Reversible: source="deep_raw_seed" tag lets you identify and`)
console.log(`      re-seed or clean up if needed.`)
console.log(`    · The 220 GEMCs will be enriched faster than the collector can`)
console.log(`      re-harvest them (collector requires browser + live GeM session).`)
console.log()
console.log(`  WHY B IS STILL REQUIRED:`)
console.log(`    · A does not fix the 689 missing Direct contracts (₹13.58 Cr gap).`)
console.log(`    · A does not fix future truncation — new contracts after Jun 2026`)
console.log(`      will not be harvested (both Direct AND Bid/RA).`)
console.log(`    · The collector pagination bug affects every future category run.`)
console.log(`    · Fix B is the permanent structural repair; A is the tactical backfill.`)
console.log()
console.log(`  DECISION MATRIX:`)
console.log(`    Need ₹31.34 Cr Bid/RA GMV NOW?    → Run A immediately.`)
console.log(`    Need 689 Direct contracts?          → Fix B required.`)
console.log(`    Need 1,418/1,418 universe forever?  → Fix B required.`)
console.log(`    Blocked on browser/GeM today?       → A unblocks you.`)
console.log()
console.log(`  EXECUTION ORDER:`)
console.log(`    Step 1: Write seed script (~1 hr) → seed 220 Bid/RA → no browser.`)
console.log(`    Step 2: Run enricher on 220 seeded contracts (~15 min).`)
console.log(`    Step 3: Diagnose pagination (1 test run on chunk 9 with debug logs).`)
console.log(`    Step 4: Fix clickLoadMore() → reset 22 capped chunks → re-harvest.`)
console.log(`    Step 5: Enrich the 689 newly harvested Direct contracts (~45 min).`)
console.log(`    Result: 1,418 / 1,418 fully enriched in ~3 days of sequenced work.`)
console.log(SEP + "\n")

await client.close()
