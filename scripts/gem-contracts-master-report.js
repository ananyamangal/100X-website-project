"use strict";
// GeM Contracts — Master Analysis Report
// Run AFTER full 12-month collection is complete.
// No browser. No captcha. MongoDB read-only.
//
// Usage:
//   node scripts/gem-contracts-master-report.js
//   node scripts/gem-contracts-master-report.js --json   (also writes audit/master-report.json)

const path = require("path")
const fs   = require("fs")
const { MongoClient } = require("mongodb")

function loadEnv() {
  const lines = fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8").split("\n")
  for (const l of lines) {
    const m = l.match(/^([^=#\s][^=]*)=(.*)$/)
    if (m) process.env[m[1].trim()] = m[2].trim()
  }
}

function fmtInr(n) {
  if (n == null || isNaN(n)) return "—"
  if (n >= 10000000) return `₹ ${(n / 10000000).toFixed(2)} Cr`
  if (n >= 100000)   return `₹ ${(n / 100000).toFixed(2)} L`
  return `₹ ${Math.round(n).toLocaleString()}`
}

function pct(n, d) { return d > 0 ? `${(n / d * 100).toFixed(1)}%` : "—" }

const HR = "═".repeat(74)
const hr = "─".repeat(74)

;(async () => {
  loadEnv()
  const writeJson = process.argv.includes("--json")

  const client = new MongoClient(process.env.MONGODB_URI)
  await client.connect()
  const col = client.db().collection("gem_contracts")

  const total = await col.countDocuments()
  if (total === 0) {
    console.log("\n  gem_contracts is empty — run the collector first.")
    await client.close()
    return
  }

  console.log(`\n  Querying ${total.toLocaleString()} contracts ...`)

  // ── Parallel query block ──────────────────────────────────────────────────────
  const [
    totalValueAgg,
    withValue,
    distinctMinistries,
    distinctDepts,
    distinctProducts,
    distinctOrgTypes,
    distinctBuyingModes,
    dateRange,

    top100ProductsByValue,
    top100ProductsByCount,
    top100DeptsByValue,
    top100DeptsByCount,
    top100MinistriesByValue,
    top100MinistriesByCount,

    deptRepeatDistrib,
    ministryRepeatDistrib,
    productValueConc,       // for concentration ratio

    statusDistrib,
    buyingModeDistrib,
    orgTypeDistrib,
    valueDistrib,
    monthlyDistrib,
  ] = await Promise.all([

    // Total contract value
    col.aggregate([
      { $match:  { contract_value_num: { $ne: null } } },
      { $group:  { _id: null, total: { $sum: "$contract_value_num" }, avg: { $avg: "$contract_value_num" },
                   min: { $min: "$contract_value_num" }, max: { $max: "$contract_value_num" } } },
    ]).toArray().then(r => r[0] || { total: 0, avg: 0, min: 0, max: 0 }),

    col.countDocuments({ contract_value_num: { $ne: null } }),

    col.distinct("ministry").then(r => r.filter(Boolean)),
    col.distinct("dept_name").then(r => r.filter(Boolean)),
    col.distinct("product_name").then(r => r.filter(Boolean)),
    col.distinct("org_type").then(r => r.filter(Boolean)),
    col.distinct("buying_mode").then(r => r.filter(Boolean)),

    // Date range
    col.aggregate([
      { $group: { _id: null,
          earliest: { $min: "$contract_date_dt" },
          latest:   { $max: "$contract_date_dt" } } },
    ]).toArray().then(r => r[0] || {}),

    // Top 100 products by total value
    col.aggregate([
      { $match:  { product_name: { $nin: [null, ""] }, contract_value_num: { $ne: null } } },
      { $group:  { _id: "$product_name", totalValue: { $sum: "$contract_value_num" },
                   count: { $sum: 1 }, avgValue: { $avg: "$contract_value_num" } } },
      { $sort:   { totalValue: -1 } }, { $limit: 100 },
    ]).toArray(),

    // Top 100 products by frequency
    col.aggregate([
      { $match:  { product_name: { $nin: [null, ""] } } },
      { $group:  { _id: "$product_name", count: { $sum: 1 },
                   totalValue: { $sum: "$contract_value_num" } } },
      { $sort:   { count: -1 } }, { $limit: 100 },
    ]).toArray(),

    // Top 100 departments by value
    col.aggregate([
      { $match:  { dept_name: { $nin: [null, ""] }, contract_value_num: { $ne: null } } },
      { $group:  { _id: "$dept_name", totalValue: { $sum: "$contract_value_num" },
                   count: { $sum: 1 }, avgValue: { $avg: "$contract_value_num" } } },
      { $sort:   { totalValue: -1 } }, { $limit: 100 },
    ]).toArray(),

    // Top 100 departments by frequency
    col.aggregate([
      { $match:  { dept_name: { $nin: [null, ""] } } },
      { $group:  { _id: "$dept_name", count: { $sum: 1 },
                   totalValue: { $sum: "$contract_value_num" } } },
      { $sort:   { count: -1 } }, { $limit: 100 },
    ]).toArray(),

    // Top 100 ministries by value
    col.aggregate([
      { $match:  { ministry: { $nin: [null, ""] }, contract_value_num: { $ne: null } } },
      { $group:  { _id: "$ministry", totalValue: { $sum: "$contract_value_num" },
                   count: { $sum: 1 } } },
      { $sort:   { totalValue: -1 } }, { $limit: 100 },
    ]).toArray(),

    // Top 100 ministries by frequency
    col.aggregate([
      { $match:  { ministry: { $nin: [null, ""] } } },
      { $group:  { _id: "$ministry", count: { $sum: 1 },
                   totalValue: { $sum: "$contract_value_num" } } },
      { $sort:   { count: -1 } }, { $limit: 100 },
    ]).toArray(),

    // Repeat-buying department distribution: how many contracts per dept
    col.aggregate([
      { $match:  { dept_name: { $nin: [null, ""] } } },
      { $group:  { _id: "$dept_name", contracts: { $sum: 1 } } },
      { $bucket: { groupBy: "$contracts",
          boundaries: [1, 2, 5, 10, 25, 50, 100, 10000],
          default: "100+",
          output: { deptCount: { $sum: 1 } } } },
    ]).toArray(),

    // Repeat-buying ministry distribution
    col.aggregate([
      { $match:  { ministry: { $nin: [null, ""] } } },
      { $group:  { _id: "$ministry", contracts: { $sum: 1 } } },
      { $bucket: { groupBy: "$contracts",
          boundaries: [1, 2, 5, 10, 25, 50, 100, 10000],
          default: "100+",
          output: { ministryCount: { $sum: 1 } } } },
    ]).toArray(),

    // Product value concentration: cumulative top-N share of total value
    col.aggregate([
      { $match:  { product_name: { $nin: [null, ""] }, contract_value_num: { $ne: null } } },
      { $group:  { _id: "$product_name", totalValue: { $sum: "$contract_value_num" } } },
      { $sort:   { totalValue: -1 } },
      { $limit:  200 },
    ]).toArray(),

    // Contract status distribution
    col.aggregate([
      { $match:  { contract_status: { $nin: [null, ""] } } },
      { $group:  { _id: "$contract_status", count: { $sum: 1 } } },
      { $sort:   { count: -1 } },
    ]).toArray(),

    // Buying mode distribution
    col.aggregate([
      { $match:  { buying_mode: { $nin: [null, ""] } } },
      { $group:  { _id: "$buying_mode", count: { $sum: 1 } } },
      { $sort:   { count: -1 } },
    ]).toArray(),

    // Org type distribution
    col.aggregate([
      { $match:  { org_type: { $nin: [null, ""] } } },
      { $group:  { _id: "$org_type", count: { $sum: 1 } } },
      { $sort:   { count: -1 } },
    ]).toArray(),

    // Value bucket distribution
    col.aggregate([
      { $match: { contract_value_num: { $ne: null } } },
      { $bucket: {
          groupBy: "$contract_value_num",
          boundaries: [0, 5000, 25000, 100000, 500000, 2000000, 10000000, 1e12],
          default: "Other",
          output: { count: { $sum: 1 }, totalValue: { $sum: "$contract_value_num" } },
        } },
    ]).toArray(),

    // Monthly contract volume
    col.aggregate([
      { $match: { contract_date_dt: { $ne: null } } },
      { $group: { _id: { year: { $year: "$contract_date_dt" },
                         month: { $month: "$contract_date_dt" } },
                  count: { $sum: 1 }, totalValue: { $sum: "$contract_value_num" } } },
      { $sort:  { "_id.year": 1, "_id.month": 1 } },
    ]).toArray(),
  ])

  const grandTotal = totalValueAgg.total || 0
  const totalCount = total

  // ── Concentration ratios ────────────────────────────────────────────────────
  let cumValue = 0
  const concRatios = {}
  for (let i = 0; i < productValueConc.length; i++) {
    cumValue += productValueConc[i].totalValue || 0
    for (const n of [5, 10, 20, 50, 100]) {
      if (i + 1 === n) concRatios[`top${n}`] = cumValue
    }
  }

  // ── Repeat-buyer counts ─────────────────────────────────────────────────────
  const repeatDepts      = await col.distinct("dept_name", { dept_name: { $nin: [null, ""] } })
                                    .then(async () => {
    const r = await col.aggregate([
      { $match: { dept_name: { $nin: [null, ""] } } },
      { $group: { _id: "$dept_name", c: { $sum: 1 } } },
      { $match: { c: { $gt: 1 } } },
      { $count: "n" },
    ]).toArray()
    return r[0]?.n || 0
  })
  const repeatMinistries = await col.aggregate([
    { $match: { ministry: { $nin: [null, ""] } } },
    { $group: { _id: "$ministry", c: { $sum: 1 } } },
    { $match: { c: { $gt: 1 } } },
    { $count: "n" },
  ]).toArray().then(r => r[0]?.n || 0)

  const now = new Date()
  const reportTs = now.toISOString().replace("T", " ").slice(0, 19)

  // ── OUTPUT ───────────────────────────────────────────────────────────────────
  console.log("\n" + HR)
  console.log("  GEM CONTRACTS — MASTER ANALYSIS REPORT")
  console.log(`  Generated: ${reportTs}`)
  console.log(HR)

  // Section 1: Overview
  console.log(`\n  ── OVERVIEW ─────────────────────────────────────────────────────`)
  const earliest = dateRange.earliest?.toISOString().slice(0,10) || "—"
  const latest   = dateRange.latest?.toISOString().slice(0,10)   || "—"
  console.log(`  Date range              : ${earliest} → ${latest}`)
  console.log(`  Total contracts         : ${totalCount.toLocaleString()}`)
  console.log(`  Contracts with value    : ${withValue.toLocaleString()} (${pct(withValue, totalCount)})`)
  console.log(`  Total contract value    : ${fmtInr(grandTotal)}`)
  console.log(`  Average contract value  : ${fmtInr(totalValueAgg.avg)}`)
  console.log(`  Min / Max contract value: ${fmtInr(totalValueAgg.min)} / ${fmtInr(totalValueAgg.max)}`)

  // Section 2: Distinct counts
  console.log(`\n  ── DISTINCT COUNTS ──────────────────────────────────────────────`)
  console.log(`  Unique ministries/states: ${distinctMinistries.length.toLocaleString()}`)
  console.log(`  Unique departments      : ${distinctDepts.length.toLocaleString()}`)
  console.log(`  Unique products         : ${distinctProducts.length.toLocaleString()}`)
  console.log(`  Unique org types        : ${distinctOrgTypes.join(" | ")}`)
  console.log(`  Unique buying modes     : ${distinctBuyingModes.join(" | ")}`)

  // Section 3: Repeat buyers
  console.log(`\n  ── REPEAT BUYERS ────────────────────────────────────────────────`)
  console.log(`  Departments with > 1 contract : ${repeatDepts.toLocaleString()} / ${distinctDepts.length} (${pct(repeatDepts, distinctDepts.length)})`)
  console.log(`  Ministries with > 1 contract  : ${repeatMinistries.toLocaleString()} / ${distinctMinistries.length} (${pct(repeatMinistries, distinctMinistries.length)})`)

  console.log(`\n  Department repeat-buy distribution (contracts per dept):`)
  const deptBucketLabels = ["1 contract","2–4","5–9","10–24","25–49","50–99","100+","other"]
  deptRepeatDistrib.forEach((b, i) =>
    console.log(`    ${(deptBucketLabels[i] || String(b._id)).padEnd(14)}: ${b.deptCount} dept(s)`)
  )

  console.log(`\n  Ministry repeat-buy distribution (contracts per ministry):`)
  const minBucketLabels = ["1 contract","2–4","5–9","10–24","25–49","50–99","100+","other"]
  ministryRepeatDistrib.forEach((b, i) =>
    console.log(`    ${(minBucketLabels[i] || String(b._id)).padEnd(14)}: ${b.ministryCount} ministry(ies)`)
  )

  // Section 4: Product concentration
  console.log(`\n  ── PRODUCT VALUE CONCENTRATION ──────────────────────────────────`)
  console.log(`  (What % of total ₹ value comes from the top N products)`)
  for (const n of [5, 10, 20, 50, 100]) {
    const v = concRatios[`top${n}`] || 0
    console.log(`  Top ${String(n).padStart(3)} products: ${fmtInr(v).padStart(16)}  (${pct(v, grandTotal)} of total value)`)
  }

  // Section 5: Contract status
  console.log(`\n  ── CONTRACT STATUS ──────────────────────────────────────────────`)
  statusDistrib.forEach(s =>
    console.log(`  ${s._id.slice(0,40).padEnd(42)}: ${String(s.count).padStart(6)} (${pct(s.count, totalCount)})`)
  )

  // Section 6: Buying mode
  console.log(`\n  ── BUYING MODE ──────────────────────────────────────────────────`)
  buyingModeDistrib.forEach(b =>
    console.log(`  ${b._id.padEnd(22)}: ${String(b.count).padStart(6)} (${pct(b.count, totalCount)})`)
  )

  // Section 7: Org type
  console.log(`\n  ── ORGANIZATION TYPE ────────────────────────────────────────────`)
  orgTypeDistrib.forEach(o =>
    console.log(`  ${o._id.padEnd(30)}: ${String(o.count).padStart(6)} (${pct(o.count, totalCount)})`)
  )

  // Section 8: Value distribution
  console.log(`\n  ── VALUE DISTRIBUTION ───────────────────────────────────────────`)
  const vBucketLabels = ["< ₹5K", "₹5K–25K", "₹25K–1L", "₹1L–5L", "₹5L–20L", "₹20L–1Cr", "≥ ₹1Cr", "Other"]
  valueDistrib.forEach((b, i) => {
    const bar = "█".repeat(Math.min(30, Math.round(b.count / Math.max(...valueDistrib.map(x=>x.count)) * 30)))
    console.log(`  ${(vBucketLabels[i] || "Other").padEnd(12)}: ${String(b.count).padStart(6)}  ${bar}  ${fmtInr(b.totalValue)}`)
  })

  // Section 9: Monthly volume
  console.log(`\n  ── MONTHLY CONTRACT VOLUME ──────────────────────────────────────`)
  const monthNames = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
  monthlyDistrib.forEach(m => {
    const bar = "█".repeat(Math.min(30, Math.round(m.count / Math.max(...monthlyDistrib.map(x=>x.count)) * 30)))
    console.log(`  ${m._id.year}-${monthNames[m._id.month].padEnd(3)}: ${String(m.count).padStart(5)} contracts  ${bar}  ${fmtInr(m.totalValue)}`)
  })

  // Section 10: Top 100 products by value
  console.log("\n" + HR)
  console.log("  TOP 100 PRODUCTS BY TOTAL CONTRACT VALUE")
  console.log(HR)
  console.log(`  ${"#".padStart(3)}  ${"Product".padEnd(55)} ${"Count".padStart(5)}  ${"Total Value".padStart(14)}  ${"Avg".padStart(12)}`)
  console.log("  " + "─".repeat(96))
  top100ProductsByValue.forEach((p, i) =>
    console.log(`  ${String(i+1).padStart(3)}. ${p._id.slice(0,53).padEnd(54)} ${String(p.count).padStart(5)}  ${fmtInr(p.totalValue).padStart(14)}  ${fmtInr(p.avgValue).padStart(12)}`)
  )

  // Section 11: Top 100 products by frequency
  console.log("\n" + HR)
  console.log("  TOP 100 PRODUCTS BY CONTRACT FREQUENCY")
  console.log(HR)
  console.log(`  ${"#".padStart(3)}  ${"Product".padEnd(55)} ${"Count".padStart(5)}  ${"Total Value".padStart(14)}`)
  console.log("  " + "─".repeat(83))
  top100ProductsByCount.forEach((p, i) =>
    console.log(`  ${String(i+1).padStart(3)}. ${p._id.slice(0,53).padEnd(54)} ${String(p.count).padStart(5)}  ${fmtInr(p.totalValue).padStart(14)}`)
  )

  // Section 12: Top 100 departments by value
  console.log("\n" + HR)
  console.log("  TOP 100 DEPARTMENTS BY TOTAL CONTRACT VALUE")
  console.log(HR)
  console.log(`  ${"#".padStart(3)}  ${"Department".padEnd(55)} ${"Count".padStart(5)}  ${"Total Value".padStart(14)}  ${"Avg".padStart(12)}`)
  console.log("  " + "─".repeat(96))
  top100DeptsByValue.forEach((d, i) =>
    console.log(`  ${String(i+1).padStart(3)}. ${d._id.slice(0,53).padEnd(54)} ${String(d.count).padStart(5)}  ${fmtInr(d.totalValue).padStart(14)}  ${fmtInr(d.avgValue).padStart(12)}`)
  )

  // Section 13: Top 100 departments by frequency
  console.log("\n" + HR)
  console.log("  TOP 100 DEPARTMENTS BY CONTRACT FREQUENCY")
  console.log(HR)
  console.log(`  ${"#".padStart(3)}  ${"Department".padEnd(55)} ${"Count".padStart(5)}  ${"Total Value".padStart(14)}`)
  console.log("  " + "─".repeat(83))
  top100DeptsByCount.forEach((d, i) =>
    console.log(`  ${String(i+1).padStart(3)}. ${d._id.slice(0,53).padEnd(54)} ${String(d.count).padStart(5)}  ${fmtInr(d.totalValue).padStart(14)}`)
  )

  // Section 14: Top 100 ministries by value
  console.log("\n" + HR)
  console.log("  TOP 100 MINISTRIES/STATES BY TOTAL CONTRACT VALUE")
  console.log(HR)
  console.log(`  ${"#".padStart(3)}  ${"Ministry/State".padEnd(38)} ${"Count".padStart(5)}  ${"Total Value".padStart(14)}`)
  console.log("  " + "─".repeat(67))
  top100MinistriesByValue.forEach((m, i) =>
    console.log(`  ${String(i+1).padStart(3)}. ${m._id.slice(0,36).padEnd(37)} ${String(m.count).padStart(5)}  ${fmtInr(m.totalValue).padStart(14)}`)
  )

  // Section 15: Top 100 ministries by frequency
  console.log("\n" + HR)
  console.log("  TOP 100 MINISTRIES/STATES BY CONTRACT FREQUENCY")
  console.log(HR)
  console.log(`  ${"#".padStart(3)}  ${"Ministry/State".padEnd(38)} ${"Count".padStart(5)}  ${"Total Value".padStart(14)}`)
  console.log("  " + "─".repeat(67))
  top100MinistriesByCount.forEach((m, i) =>
    console.log(`  ${String(i+1).padStart(3)}. ${m._id.slice(0,36).padEnd(37)} ${String(m.count).padStart(5)}  ${fmtInr(m.totalValue).padStart(14)}`)
  )

  // ── Historical scale estimate ─────────────────────────────────────────────────
  console.log("\n" + HR)
  console.log("  HISTORICAL SCALE ESTIMATE")
  console.log(HR)

  const checkpoint = (() => {
    try { return JSON.parse(fs.readFileSync("audit/contracts-checkpoint.json", "utf8")) }
    catch { return null }
  })()

  const completedChunks = checkpoint?.chunks?.filter(c => c.status === "complete") || []
  const totalInserted   = completedChunks.reduce((s, c) => s + (c.recordsInserted || 0), 0)
  const coveredDays     = completedChunks.reduce((s, c) => s + (c.days || 0), 0)
  const ratePerDay      = coveredDays > 0 ? totalInserted / coveredDays : 0

  console.log(`  Chunks complete          : ${completedChunks.length} / ${checkpoint?.chunks?.length || 13}`)
  console.log(`  Days covered             : ${coveredDays}`)
  console.log(`  Contracts harvested      : ${totalInserted.toLocaleString()}`)
  console.log(`  Rate                     : ${ratePerDay.toFixed(1)} contracts/day`)
  console.log(`  Avg value/contract       : ${fmtInr(totalValueAgg.avg)}`)

  const scenarios = [
    { label: "1 year (365 days)",   days: 365   },
    { label: "2 years (730 days)",  days: 730   },
    { label: "3 years (1095 days)", days: 1095  },
    { label: "5 years (1825 days)", days: 1825  },
  ]
  console.log(`\n  Extrapolation (at ${ratePerDay.toFixed(1)} contracts/day):`)
  scenarios.forEach(s => {
    const estContracts = Math.round(ratePerDay * s.days)
    const estValue     = estContracts * (totalValueAgg.avg || 0)
    console.log(`  ${s.label.padEnd(28)}: ~${estContracts.toLocaleString().padStart(8)} contracts  |  ~${fmtInr(estValue)} total`)
  })

  const chunkCaptchas = (checkpoint?.chunks?.length || 13) - completedChunks.length
  console.log(`\n  Captchas needed to complete 12-month run: ${chunkCaptchas}`)
  console.log(`  Storage per year (est.)  : ~${Math.round(ratePerDay * 365 * 2 / 1024)} MB (gem_contracts + gem_contracts_raw)`)
  console.log(`  MongoDB M0 headroom      : ${Math.round((512 - ratePerDay * 365 * 2 / 1024))} MB remaining on free tier`)

  // ── JSON export ───────────────────────────────────────────────────────────────
  if (writeJson) {
    const report = {
      generatedAt: now.toISOString(),
      overview: {
        dateRange:       { earliest, latest },
        totalContracts:  totalCount,
        withValue,
        grandTotalValue: grandTotal,
        avgValue:        totalValueAgg.avg,
        minValue:        totalValueAgg.min,
        maxValue:        totalValueAgg.max,
      },
      distinctCounts: {
        ministries:   distinctMinistries.length,
        departments:  distinctDepts.length,
        products:     distinctProducts.length,
        orgTypes:     distinctOrgTypes,
        buyingModes:  distinctBuyingModes,
      },
      repeatBuyers: { repeatDepts, repeatMinistries },
      concentration: concRatios,
      top100ProductsByValue,
      top100ProductsByCount,
      top100DeptsByValue,
      top100DeptsByCount,
      top100MinistriesByValue,
      top100MinistriesByCount,
      scaleEstimate: { ratePerDay, coveredDays, scenarios },
    }
    const outFile = `audit/master-report-${now.toISOString().slice(0,10)}.json`
    fs.writeFileSync(outFile, JSON.stringify(report, null, 2))
    console.log(`\n  JSON report written → ${outFile}`)
  }

  console.log("\n" + HR + "\n")
  await client.close()
})().catch(e => { console.error("\nFATAL:", e.message); process.exit(1) })
