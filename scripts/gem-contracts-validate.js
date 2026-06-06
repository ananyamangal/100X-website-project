"use strict";
// Standalone data validation for gem_contracts collection.
// Run: node scripts/gem-contracts-validate.js
// No browser, no captcha. Reads existing MongoDB data only.

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
  if (n == null) return "(null)"
  if (n >= 10000000) return `₹ ${(n/10000000).toFixed(2)} Cr`
  if (n >= 100000)   return `₹ ${(n/100000).toFixed(1)} L`
  return `₹ ${n.toLocaleString()}`
}

;(async () => {
  loadEnv()
  const client = new MongoClient(process.env.MONGODB_URI)
  await client.connect()
  const col = client.db().collection("gem_contracts")

  const total = await col.countDocuments()
  if (total === 0) {
    console.log("gem_contracts is empty.")
    await client.close()
    return
  }

  // Run all queries in parallel
  const [
    first10,
    distinctMinistries,
    distinctDepts,
    distinctProducts,
    top20Depts,
    top20Ministries,
    top20Products,
    top20ByValue,
    totalValueAgg,
    withValue,
  ] = await Promise.all([

    // 1. First 10 records
    col.find({}).sort({ first_seen: 1 }).limit(10).toArray(),

    // 2. Distinct ministry count
    col.distinct("ministry").then(r => r.filter(Boolean)),

    // 3. Distinct dept count
    col.distinct("dept_name").then(r => r.filter(Boolean)),

    // 4. Distinct product count
    col.distinct("product_name").then(r => r.filter(Boolean)),

    // 5. Top 20 departments by contract count
    col.aggregate([
      { $match:  { dept_name: { $nin: [null, ""] } } },
      { $group:  { _id: "$dept_name", count: { $sum: 1 },
                   totalValue: { $sum: "$contract_value_num" } } },
      { $sort:   { count: -1 } },
      { $limit:  20 },
    ]).toArray(),

    // 6. Top 20 ministries by contract count
    col.aggregate([
      { $match:  { ministry: { $nin: [null, ""] } } },
      { $group:  { _id: "$ministry", count: { $sum: 1 },
                   totalValue: { $sum: "$contract_value_num" } } },
      { $sort:   { count: -1 } },
      { $limit:  20 },
    ]).toArray(),

    // 7. Top 20 products by contract count
    col.aggregate([
      { $match:  { product_name: { $nin: [null, ""] } } },
      { $group:  { _id: "$product_name", count: { $sum: 1 },
                   totalValue: { $sum: "$contract_value_num" } } },
      { $sort:   { count: -1 } },
      { $limit:  20 },
    ]).toArray(),

    // 8. Top 20 contracts by value
    col.find({ contract_value_num: { $ne: null } })
       .sort({ contract_value_num: -1 })
       .limit(20)
       .toArray(),

    // Total contract value
    col.aggregate([
      { $match:  { contract_value_num: { $ne: null } } },
      { $group:  { _id: null, total: { $sum: "$contract_value_num" } } },
    ]).toArray().then(r => r[0]?.total || 0),

    // Count with value
    col.countDocuments({ contract_value_num: { $ne: null } }),
  ])

  const hr = "─".repeat(70)
  const HR = "═".repeat(70)

  // ── 1. First 10 records ──────────────────────────────────────────────────────
  console.log("\n" + HR)
  console.log("  1. FIRST 10 RECORDS — gem_contracts")
  console.log(HR)
  first10.forEach((doc, i) => {
    console.log(`\n  [${i+1}] ${doc.gemc_no || "(no gemc)"}`)
    console.log(`    ministry         : ${doc.ministry || "(null)"}`)
    console.log(`    dept_name        : ${(doc.dept_name || "(null)").slice(0, 65)}`)
    console.log(`    office_name      : ${(doc.office_name || "(null)").slice(0, 65)}`)
    console.log(`    org_type         : ${doc.org_type || "(null)"}`)
    console.log(`    org_name         : ${(doc.org_name || "(null)").slice(0, 65)}`)
    console.log(`    buying_mode      : ${doc.buying_mode || "(null)"}`)
    console.log(`    contract_status  : ${doc.contract_status || "(null)"}`)
    console.log(`    contract_date    : ${doc.contract_date || "(null)"}`)
    console.log(`    contract_value   : ${doc.contract_value || "(null)"}`)
    console.log(`    contract_value_num: ${doc.contract_value_num != null ? fmtInr(doc.contract_value_num) : "(null)"}`)
    console.log(`    product_name     : ${(doc.product_name || "(null)").slice(0, 65)}`)
    console.log(`    quantity         : ${doc.quantity ?? "(null)"}`)
    console.log(`    state            : ${doc.state || "(null)"}`)
    console.log(`    seller_name_raw  : ${doc.seller_name_raw || "(null)"}`)
    console.log(`    parser_version   : ${doc.parser_version}`)
    console.log(`    harvested_at     : ${doc.harvested_at?.toISOString() || "(null)"}`)
  })

  // ── Summary ──────────────────────────────────────────────────────────────────
  console.log("\n" + HR)
  console.log("  SUMMARY")
  console.log(HR)
  console.log(`  Total contracts          : ${total.toLocaleString()}`)
  console.log(`  Contracts with value     : ${withValue.toLocaleString()} / ${total} (${Math.round(withValue/total*100)}%)`)
  console.log(`  Total contract value     : ${fmtInr(totalValueAgg)}  (₹ ${totalValueAgg.toLocaleString()})`)
  console.log(`  2. Unique ministries     : ${distinctMinistries.length}`)
  console.log(`  3. Unique departments    : ${distinctDepts.length}`)
  console.log(`  4. Unique products       : ${distinctProducts.length}`)

  // ── 5. Top 20 departments ────────────────────────────────────────────────────
  console.log("\n" + hr)
  console.log("  5. TOP 20 DEPARTMENTS BY CONTRACT COUNT")
  console.log(hr)
  console.log(`  ${"Department".padEnd(52)} ${"Count".padStart(5)}  ${"Total Value".padStart(14)}`)
  console.log("  " + "─".repeat(68))
  top20Depts.forEach((d, i) =>
    console.log(`  ${String(i+1).padStart(2)}. ${d._id.slice(0, 50).padEnd(51)} ${String(d.count).padStart(5)}  ${fmtInr(d.totalValue).padStart(14)}`)
  )

  // ── 6. Top 20 ministries ─────────────────────────────────────────────────────
  console.log("\n" + hr)
  console.log("  6. TOP 20 MINISTRIES/STATES BY CONTRACT COUNT")
  console.log(hr)
  console.log(`  ${"Ministry/State".padEnd(38)} ${"Count".padStart(5)}  ${"Total Value".padStart(14)}`)
  console.log("  " + "─".repeat(60))
  top20Ministries.forEach((m, i) =>
    console.log(`  ${String(i+1).padStart(2)}. ${m._id.slice(0, 36).padEnd(37)} ${String(m.count).padStart(5)}  ${fmtInr(m.totalValue).padStart(14)}`)
  )

  // ── 7. Top 20 products ───────────────────────────────────────────────────────
  console.log("\n" + hr)
  console.log("  7. TOP 20 PRODUCTS BY CONTRACT COUNT")
  console.log(hr)
  console.log(`  ${"Product".padEnd(58)} ${"Count".padStart(5)}  ${"Total Value".padStart(14)}`)
  console.log("  " + "─".repeat(78))
  top20Products.forEach((p, i) =>
    console.log(`  ${String(i+1).padStart(2)}. ${p._id.slice(0, 56).padEnd(57)} ${String(p.count).padStart(5)}  ${fmtInr(p.totalValue).padStart(14)}`)
  )

  // ── 8. Top 20 contracts by value ─────────────────────────────────────────────
  console.log("\n" + hr)
  console.log("  8. TOP 20 CONTRACTS BY VALUE")
  console.log(hr)
  top20ByValue.forEach((doc, i) => {
    console.log(`\n  ${String(i+1).padStart(2)}. ${doc.gemc_no}`)
    console.log(`      Value   : ${fmtInr(doc.contract_value_num)}`)
    console.log(`      Date    : ${doc.contract_date || "(null)"}`)
    console.log(`      Product : ${(doc.product_name || "(null)").slice(0, 60)}`)
    console.log(`      Dept    : ${(doc.dept_name || "(null)").slice(0, 60)}`)
    console.log(`      Ministry: ${doc.ministry || "(null)"}`)
    console.log(`      Status  : ${doc.contract_status || "(null)"}`)
  })

  console.log("\n" + HR)
  console.log("  END OF VALIDATION REPORT")
  console.log(HR + "\n")

  await client.close()
})().catch(e => { console.error("FATAL:", e.message); process.exit(1) })
