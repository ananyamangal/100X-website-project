/**
 * seed-bidra-fogging.mjs
 *
 * Seeds the 220 missing Bid/RA fogging contracts from audit/fogging-deep-raw.json
 * into gem_contracts using deep-raw field mapping from the design review.
 *
 * Usage:
 *   node seed-bidra-fogging.mjs --dry-run    ← no writes, full stats report
 *   node seed-bidra-fogging.mjs              ← runs dry-run first, validates, then inserts
 */

import { MongoClient } from "mongodb"
import fs from "fs"

// ── Config ────────────────────────────────────────────────────────────────────
const DRY_RUN    = process.argv.includes("--dry-run")
const CATEGORY   = "home_fa68031381_agri_disp_fogg"
const PARSER_VER = 3
const SOURCE_TAG = "deep_raw_seed"
const DEEP_RAW   = "audit/fogging-deep-raw.json"

// Expected thresholds from design review — used for auto-validation
const EXPECTED_INSERTS = 220
const EXPECTED_GMV_CR  = 31.34   // ₹ Cr  (tolerance ±0.05 Cr)
const EXPECTED_CONFLICTS = 0

const SEP = "═".repeat(72)
const sep = "─".repeat(72)
const BATCH = 50   // upsert batch size (individual ops, sequential within batch)

// ── DB ────────────────────────────────────────────────────────────────────────
const envRaw = fs.readFileSync(".env.local", "utf8")
const ENV = {}
for (const l of envRaw.split("\n")) {
  const m = l.match(/^([^=#\s][^=]*)=(.*)$/); if (m) ENV[m[1].trim()] = m[2].trim()
}
const client = new MongoClient(ENV["MONGODB_URI"])
await client.connect()
const db = client.db()
const gc = db.collection("gem_contracts")

// ── Helpers ───────────────────────────────────────────────────────────────────
function canonicalize(name) {
  return (name || "")
    .replace(/^(M\/S\.?|M\.S\.?|SH\.|SMT\.|MR\.|DR\.)\s*/i, "")
    .replace(/\s+/g, " ")
    .toUpperCase()
    .trim()
}

const STATE_RX = /\b(Rajasthan|Maharashtra|Uttar Pradesh|Karnataka|Tamil Nadu|Gujarat|Delhi|Madhya Pradesh|Bihar|West Bengal|Andhra Pradesh|Haryana|Kerala|Punjab|Odisha|Assam|Jharkhand|Uttarakhand|Himachal Pradesh|Goa|Tripura|Manipur|Meghalaya|Nagaland|Arunachal Pradesh|Mizoram|Sikkim|Jammu|Ladakh|Chandigarh|Puducherry|Telangana|Chhattisgarh)\b/i

function deriveState(r) {
  const text = [r.ministry, r.dept, r.office_zone, r.org_name]
    .filter(Boolean)
    .join(" ")
  const m = text.match(STATE_RX)
  return m ? m[1].toUpperCase() : null
}

// Exact mapping: fogging-deep-raw.json → gem_contracts $set fields
function buildSetDoc(r, now) {
  return {
    gemc_no:               r.gemc_no,
    source:                SOURCE_TAG,
    category_id:           CATEGORY,
    parser_version:        PARSER_VER,
    buying_mode:           r.buying_mode,
    contract_status:       r.status,
    contract_date:         r.contract_date,
    contract_date_dt:      null,
    contract_value:        r.total_value != null ? `₹ ${r.total_value}` : null,
    contract_value_num:    r.contract_value_num ?? null,
    ministry:              r.ministry ?? null,
    dept_name:             r.dept ?? null,
    office_name:           r.office_zone ?? null,
    org_type:              r.org_type ?? null,
    org_name:              (!r.org_name || r.org_name === "N/A") ? null : r.org_name,
    state:                 deriveState(r),
    seller_name_raw:       r.seller_name ?? null,
    seller_name_canonical: canonicalize(r.seller_name) || null,
    product_name:          r.product_full ?? null,
    detail_scraped:        false,
    harvested_at:          null,
    updated_at:            now,
    // Explicitly null fields so the document is uniform with harvested records
    buyer_designation:     null,
    seller_gem_id:         null,
    seller_gst:            null,
    seller_msme:           null,
    seller_state:          null,
    quantity:              null,
    unit_rate:             null,
  }
}

// ── Load deep-raw & identify missing Bid/RA ───────────────────────────────────
console.log(`\n${SEP}`)
console.log(`  SEED BID/RA FOGGING CONTRACTS${DRY_RUN ? "  [DRY-RUN — NO WRITES]" : "  [LIVE MODE]"}`)
console.log(SEP)

const deep = JSON.parse(fs.readFileSync(DEEP_RAW, "utf8"))

// Check which GEMCs are already in DB
const allGemcs = deep.map(r => r.gemc_no)
const matchedSet = new Set()
for (let i = 0; i < allGemcs.length; i += 500) {
  const docs = await gc.find(
    { gemc_no: { $in: allGemcs.slice(i, i + 500) } },
    { projection: { gemc_no: 1 } }
  ).toArray()
  for (const d of docs) matchedSet.add(d.gemc_no)
}

const deepBidRA      = deep.filter(r => r.buying_mode === "Bid/RA")
const alreadyInDB    = deepBidRA.filter(r =>  matchedSet.has(r.gemc_no))
const bidRA_miss     = deepBidRA.filter(r => !matchedSet.has(r.gemc_no))
// Candidate conflicts = GEMCs in the 220 that somehow also exist in DB (should be 0)
const candidateConflicts = bidRA_miss.filter(r => matchedSet.has(r.gemc_no))

console.log(`\n  Deep-raw universe total      : ${deep.length}`)
console.log(`  Bid/RA in deep-raw           : ${deepBidRA.length}`)
console.log(`  Already in DB (pre-existing) : ${alreadyInDB.length}`)
console.log(`  Missing (candidates to seed) : ${bidRA_miss.length}`)
console.log(`  Candidate conflicts (in DB)  : ${candidateConflicts.length}`)

// ── Build seed documents ──────────────────────────────────────────────────────
const NOW  = new Date()
const docs = bidRA_miss.map(r => buildSetDoc(r, NOW))
const totalGMV = docs.reduce((a, d) => a + (d.contract_value_num || 0), 0)

// ── DRY-RUN STATS REPORT ─────────────────────────────────────────────────────
console.log(`\n${sep}`)
console.log("  DRY-RUN ANALYSIS\n")
console.log(`  Contracts to insert    : ${docs.length}`)
console.log(`  Total GMV              : ₹${(totalGMV/1e7).toFixed(2)} Cr`)
console.log(`  Candidate conflicts    : ${candidateConflicts.length}  (seed-set GEMCs already in DB)`)
console.log(`  Pre-existing Bid/RA    : ${alreadyInDB.length}  (in DB, not re-seeded)`)

// Count by status
const byStatus = {}
for (const d of docs) byStatus[d.contract_status] = (byStatus[d.contract_status]||0)+1
console.log(`\n  COUNT BY STATUS:`)
for (const [s,n] of Object.entries(byStatus).sort((a,b)=>b[1]-a[1]))
  console.log(`    ${s.padEnd(38)}: ${n}`)

// Count by state
const byState = {}
for (const d of docs) {
  const k = d.state || "(no state derived)"
  byState[k] = (byState[k]||0)+1
}
console.log(`\n  COUNT BY STATE:`)
for (const [s,n] of Object.entries(byState).sort((a,b)=>b[1]-a[1]))
  console.log(`    ${s.padEnd(38)}: ${n}`)

// Count by ministry
const byMinistry = {}
for (const d of docs) {
  const k = d.ministry || "(null)"
  byMinistry[k] = (byMinistry[k]||0)+1
}
console.log(`\n  COUNT BY MINISTRY:`)
for (const [m,n] of Object.entries(byMinistry).sort((a,b)=>b[1]-a[1]))
  console.log(`    ${m.slice(0,45).padEnd(45)}: ${n}`)

// Top 20 sellers (GMV)
const bySeller = {}
for (const d of docs) {
  const k = d.seller_name_canonical || "(unknown)"
  bySeller[k] = (bySeller[k]||0) + (d.contract_value_num||0)
}
const topSellers = Object.entries(bySeller).sort((a,b)=>b[1]-a[1]).slice(0,20)
console.log(`\n  TOP 20 SELLERS (by GMV):`)
for (const [s,g] of topSellers)
  console.log(`    ${s.padEnd(38)}: ₹${(g/1e7).toFixed(2)} Cr  (${Math.round(g/totalGMV*100)}%)`)

// Top 20 buyers (by count + GMV)
const byBuyer = {}
for (const d of docs) {
  const k = d.dept_name || d.org_name || d.office_name || "(unknown)"
  if (!byBuyer[k]) byBuyer[k] = { count: 0, gmv: 0 }
  byBuyer[k].count++
  byBuyer[k].gmv += d.contract_value_num || 0
}
const topBuyers = Object.entries(byBuyer).sort((a,b)=>b[1].gmv-a[1].gmv).slice(0,20)
console.log(`\n  TOP 20 BUYERS (by GMV):`)
for (const [b, {count, gmv}] of topBuyers)
  console.log(`    ${b.slice(0,45).padEnd(45)}: ${String(count).padStart(3)} contracts  ₹${(gmv/1e7).toFixed(2)} Cr`)

// Missing state
const missingState = docs.filter(d => !d.state)
console.log(`\n  DOCUMENTS WITH MISSING STATE (${missingState.length}):`)
for (const d of missingState)
  console.log(`    ${d.gemc_no}  |  ${d.ministry?.slice(0,50) ?? "—"}`)

// Missing org_name
const missingOrg = docs.filter(d => !d.org_name)
console.log(`\n  DOCUMENTS WITH MISSING ORG_NAME (${missingOrg.length}):`)
for (const d of missingOrg.slice(0,20))
  console.log(`    ${d.gemc_no}  |  ${d.dept_name?.slice(0,50) ?? "—"}`)
if (missingOrg.length > 20)
  console.log(`    ... and ${missingOrg.length - 20} more`)

// Duplicate GEMCs within the 220 (internal)
const seenGemcs = new Set()
const internalDups = []
for (const d of docs) {
  if (seenGemcs.has(d.gemc_no)) internalDups.push(d.gemc_no)
  seenGemcs.add(d.gemc_no)
}
console.log(`\n  INTERNAL DUPLICATE GEMCs IN CANDIDATE SET: ${internalDups.length}`)
if (internalDups.length > 0)
  for (const g of internalDups) console.log(`    ${g}`)

// ── Validation against design-review numbers ──────────────────────────────────
console.log(`\n${sep}`)
console.log("  VALIDATION AGAINST DESIGN-REVIEW TARGETS\n")

const gmvCr       = totalGMV / 1e7
const insertMatch  = docs.length      === EXPECTED_INSERTS
const gmvMatch     = Math.abs(gmvCr - EXPECTED_GMV_CR) <= 0.05
const conflictMatch = candidateConflicts.length === EXPECTED_CONFLICTS
const internalOk   = internalDups.length === 0

function mark(ok) { return ok ? "✓ PASS" : "✗ FAIL" }
console.log(`  Contracts to insert : ${docs.length.toString().padStart(5)}  (expected ${EXPECTED_INSERTS})         ${mark(insertMatch)}`)
console.log(`  GMV                 : ₹${gmvCr.toFixed(2)} Cr  (expected ₹${EXPECTED_GMV_CR.toFixed(2)} Cr ±0.05)  ${mark(gmvMatch)}`)
console.log(`  Conflicts (in seed) : ${candidateConflicts.length.toString().padStart(5)}  (expected ${EXPECTED_CONFLICTS})           ${mark(conflictMatch)}`)
console.log(`  Internal dups       : ${internalDups.length.toString().padStart(5)}  (expected 0)           ${mark(internalOk)}`)

const allPass = insertMatch && gmvMatch && conflictMatch && internalOk

if (!allPass) {
  console.log(`\n  VALIDATION FAILED — aborting. Fix mismatches before live run.\n`)
  await client.close()
  process.exit(1)
}

console.log(`\n  All checks PASSED.\n`)

if (DRY_RUN) {
  console.log(`  Dry-run complete — no writes made.`)
  console.log(`  Re-run without --dry-run to execute the seed.\n`)
  await client.close()
  process.exit(0)
}

// ── LIVE SEED EXECUTION ───────────────────────────────────────────────────────
console.log(SEP)
console.log("  LIVE SEED EXECUTION\n")

let inserted = 0
let updated  = 0
let errors   = 0
let gmvAdded = 0

for (let i = 0; i < docs.length; i++) {
  const d = docs[i]
  const setDoc = { ...d }

  try {
    const result = await gc.updateOne(
      { gemc_no: d.gemc_no },
      {
        $set:         setDoc,
        $setOnInsert: { first_seen: NOW },
        $unset:       { enrichment_error: 1 },
      },
      { upsert: true }
    )

    if (result.upsertedCount > 0) {
      inserted++
      gmvAdded += d.contract_value_num || 0
    } else if (result.modifiedCount > 0) {
      updated++
    }
  } catch (err) {
    errors++
    console.error(`  ERROR on ${d.gemc_no}: ${err.message}`)
  }

  // Progress every 50 or at end
  if ((i + 1) % 50 === 0 || i === docs.length - 1) {
    process.stdout.write(`\r  Progress: ${i + 1}/${docs.length}  inserted=${inserted}  updated=${updated}  errors=${errors}`)
  }
}

console.log("\n")

// ── POST-SEED VERIFICATION ────────────────────────────────────────────────────
console.log(sep)
console.log("  POST-SEED VERIFICATION\n")

const finalTotal   = await gc.countDocuments()
const finalFogging = await gc.countDocuments({ category_id: CATEGORY })
const finalBidRA   = await gc.countDocuments({ category_id: CATEGORY, buying_mode: "Bid/RA" })
const finalDirect  = await gc.countDocuments({ category_id: CATEGORY, buying_mode: "Direct" })
const finalQueue   = await gc.countDocuments({ category_id: CATEGORY, detail_scraped: false,
                                               enrichment_error: { $exists: false } })
const finalErrors  = await gc.countDocuments({ category_id: CATEGORY, detail_scraped: false,
                                               enrichment_error: { $exists: true } })
const finalEnriched = await gc.countDocuments({ category_id: CATEGORY, detail_scraped: true })

const gmvAgg = await gc.aggregate([
  { $match: { category_id: CATEGORY } },
  { $group: { _id: null, gmv: { $sum: "$contract_value_num" } } }
]).toArray()
const finalGMV = gmvAgg[0]?.gmv || 0

const universeGMV   = deep.reduce((a,r) => a+(r.contract_value_num||0), 0)
const universeTotal = deep.length
const universeBidRA = deepBidRA.length

console.log(`  Seed result:`)
console.log(`    Inserted         : ${inserted}`)
console.log(`    Updated          : ${updated}`)
console.log(`    Errors           : ${errors}`)
console.log(`    GMV added        : ₹${(gmvAdded/1e7).toFixed(2)} Cr`)
console.log()
console.log(`  Final DB state (fogging category):`)
console.log(`    Total fogging    : ${finalFogging}  (universe: ${universeTotal})`)
console.log(`    Bid/RA           : ${finalBidRA} / ${universeBidRA}  (${Math.round(finalBidRA/universeBidRA*100)}% of Bid/RA universe)`)
console.log(`    Direct           : ${finalDirect}`)
console.log(`    Enriched         : ${finalEnriched}`)
console.log(`    Clean queue      : ${finalQueue}`)
console.log(`    Error queue      : ${finalErrors}`)
console.log()
console.log(`  GMV coverage:`)
console.log(`    DB fogging GMV   : ₹${(finalGMV/1e7).toFixed(2)} Cr`)
console.log(`    Universe GMV     : ₹${(universeGMV/1e7).toFixed(2)} Cr`)
console.log(`    Coverage         : ${Math.round(finalGMV/universeGMV*100)}%`)
console.log()
console.log(`  gem_contracts total  : ${finalTotal}`)
console.log()

if (inserted === EXPECTED_INSERTS && errors === 0) {
  console.log(`  SEED COMPLETE — all ${inserted} Bid/RA contracts seeded successfully.`)
  console.log(`  Next step: run gem-enrich-contracts.js to fill enricher fields on ${finalQueue} queued contracts.`)
} else if (errors > 0) {
  console.log(`  SEED COMPLETED WITH ${errors} ERROR(S) — review logs above.`)
} else {
  console.log(`  SEED COMPLETE. Inserted=${inserted} (expected ${EXPECTED_INSERTS}).`)
}

console.log(`\n${SEP}\n`)

await client.close()
