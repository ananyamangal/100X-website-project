#!/usr/bin/env node
/**
 * gem-master-report.js
 *
 * Full intelligence report across gem_contracts, gem_dealers, gem_awarded_bids.
 * Run after collection + enrichment.
 *
 * Usage:
 *   node scripts/gem-master-report.js
 *   node scripts/gem-master-report.js --json          → also write audit/master-report-<date>.json
 *   node scripts/gem-master-report.js --top=50        → show top 50 (default 25)
 */

;(function loadEnv() {
  const fs = require("fs"), path = require("path")
  const lines = fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8").split("\n")
  for (const line of lines) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) process.env[m[1].trim()] = m[2].trim()
  }
})()

const { MongoClient } = require("mongodb")
const fs   = require("fs")
const path = require("path")

const CLI   = {}
for (const arg of process.argv.slice(2)) {
  if (arg.startsWith("--")) { const [k, v] = arg.slice(2).split("="); CLI[k] = v === undefined ? true : v }
}

const WRITE_JSON = !!CLI.json
const TOP_N      = parseInt(CLI.top || "25")

function inr(n) {
  if (!n) return "₹0"
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`
  return `₹${n.toLocaleString()}`
}

function bar(val, maxVal, width = 30) {
  const filled = maxVal ? Math.round((val / maxVal) * width) : 0
  return "█".repeat(filled) + "░".repeat(width - filled)
}

function sep(label = "") {
  if (label) {
    const pad = Math.max(0, 68 - label.length - 4)
    console.log(`\n  ── ${label} ${"─".repeat(pad)}`)
  } else {
    console.log("─".repeat(70))
  }
}

async function run() {
  const client = new MongoClient(process.env.MONGODB_URI)
  await client.connect()
  const db      = client.db()
  const gc      = db.collection("gem_contracts")
  const dealers = db.collection("gem_dealers")
  const bids    = db.collection("gem_awarded_bids")

  const report = {}

  console.log("\n" + "═".repeat(70))
  console.log("  GEM PROCUREMENT INTELLIGENCE — MASTER REPORT")
  console.log(`  Generated: ${new Date().toLocaleString("en-IN")}`)
  console.log("═".repeat(70))

  // ── A. Dataset overview ────────────────────────────────────────────────────
  const [
    total, enriched, withSeller, withPhone, withEmail, withValue,
    rawCount, dealerCount, bidCount,
  ] = await Promise.all([
    gc.countDocuments(),
    gc.countDocuments({ detail_scraped: true }),
    gc.countDocuments({ seller_name_canonical: { $nin: [null, ""] } }),
    gc.countDocuments({ seller_phone: { $nin: [null, ""] } }),
    gc.countDocuments({ seller_email: { $nin: [null, ""] } }),
    gc.countDocuments({ contract_value_num: { $nin: [null, 0] } }),
    db.collection("gem_contracts_raw").countDocuments(),
    dealers.countDocuments(),
    bids.countDocuments(),
  ])

  const [gmvAgg, enrichedGmv] = await Promise.all([
    gc.aggregate([
      { $match: { contract_value_num: { $nin: [null, 0] } } },
      { $group: { _id: null, total: { $sum: "$contract_value_num" }, avg: { $avg: "$contract_value_num" }, max: { $max: "$contract_value_num" }, min: { $min: "$contract_value_num" } } }
    ]).toArray(),
    gc.aggregate([
      { $match: { detail_scraped: true, contract_value_num: { $nin: [null, 0] } } },
      { $group: { _id: null, total: { $sum: "$contract_value_num" } } }
    ]).toArray(),
  ])

  const gmv = gmvAgg[0] || {}
  report.overview = {
    total_contracts: total, enriched, raw_count: rawCount,
    total_gmv: gmv.total || 0, avg_gmv: gmv.avg || 0, max_gmv: gmv.max || 0,
    pct_enriched: total ? Math.round(enriched / total * 100) : 0,
    pct_with_seller: total ? Math.round(withSeller / total * 100) : 0,
    pct_with_phone: total ? Math.round(withPhone / total * 100) : 0,
    pct_with_email: total ? Math.round(withEmail / total * 100) : 0,
    dealer_count: dealerCount, bid_count: bidCount,
  }

  sep("A. DATASET OVERVIEW")
  console.log(`  Contracts:         ${total.toLocaleString()}  (${enriched.toLocaleString()} enriched = ${report.overview.pct_enriched}%)`)
  console.log(`  Total GMV:         ${inr(gmv.total)}`)
  console.log(`  Avg contract:      ${inr(gmv.avg)}`)
  console.log(`  Max contract:      ${inr(gmv.max)}`)
  console.log(`  With seller name:  ${withSeller} (${report.overview.pct_with_seller}%)`)
  console.log(`  With phone:        ${withPhone} (${report.overview.pct_with_phone}%)`)
  console.log(`  With email:        ${withEmail} (${report.overview.pct_with_email}%)`)
  console.log(`  Dealer DB:         ${dealerCount.toLocaleString()}`)
  console.log(`  Awarded bids:      ${bidCount.toLocaleString()}`)

  // ── B. Unique dimension counts ─────────────────────────────────────────────
  const [sellers, buyers, depts, ministries, products, states, orgTypes] = await Promise.all([
    gc.distinct("seller_name_canonical").then(r => r.filter(Boolean)),
    gc.distinct("buyer_name").then(r => r.filter(Boolean)),
    gc.distinct("dept_name").then(r => r.filter(Boolean)),
    gc.distinct("ministry").then(r => r.filter(Boolean)),
    gc.distinct("product_name").then(r => r.filter(Boolean)),
    gc.distinct("seller_state").then(r => r.filter(Boolean)),
    gc.distinct("org_type").then(r => r.filter(Boolean)),
  ])

  report.uniques = {
    sellers: sellers.length, buyers: buyers.length, departments: depts.length,
    ministries: ministries.length, products: products.length, states: states.length,
    org_types: orgTypes.length,
  }

  sep("B. UNIQUE DIMENSIONS")
  for (const [k, v] of Object.entries(report.uniques)) {
    console.log(`  ${k.padEnd(20)}: ${v.toLocaleString()}`)
  }

  // ── C. Top sellers by GMV ──────────────────────────────────────────────────
  const topSellerGmv = await gc.aggregate([
    { $match: { seller_name_canonical: { $nin: [null, ""] } } },
    { $group: {
      _id:   "$seller_name_canonical",
      gmv:   { $sum: "$contract_value_num" },
      count: { $sum: 1 },
      state: { $first: "$seller_state" },
      phone: { $first: "$seller_phone" },
      email: { $first: "$seller_email" },
      gstin: { $first: "$seller_gst" },
    }},
    { $sort: { gmv: -1 } }, { $limit: TOP_N },
  ]).toArray()

  report.top_sellers_gmv = topSellerGmv
  const maxGmvSeller = topSellerGmv[0]?.gmv || 1

  sep(`C. TOP ${TOP_N} SELLERS BY GMV`)
  topSellerGmv.forEach((s, i) => {
    const b = bar(s.gmv, maxGmvSeller, 20)
    const contact = [s.phone ? "📞" : "", s.email ? "✉" : ""].filter(Boolean).join("")
    console.log(`  ${String(i+1).padStart(2)}. ${s._id.slice(0, 38).padEnd(39)}${b} ${inr(s.gmv).padStart(12)}  ×${s.count}  ${contact}`)
  })

  // ── D. Top sellers by contract count ──────────────────────────────────────
  const topSellerCount = await gc.aggregate([
    { $match: { seller_name_canonical: { $nin: [null, ""] } } },
    { $group: { _id: "$seller_name_canonical", count: { $sum: 1 }, gmv: { $sum: "$contract_value_num" } } },
    { $sort: { count: -1 } }, { $limit: TOP_N },
  ]).toArray()

  report.top_sellers_count = topSellerCount
  const maxCountSeller = topSellerCount[0]?.count || 1

  sep(`D. TOP ${TOP_N} SELLERS BY CONTRACT COUNT`)
  topSellerCount.forEach((s, i) => {
    const b = bar(s.count, maxCountSeller, 20)
    console.log(`  ${String(i+1).padStart(2)}. ${s._id.slice(0, 38).padEnd(39)}${b} ×${String(s.count).padStart(4)}  ${inr(s.gmv)}`)
  })

  // ── E. Top departments by spend ────────────────────────────────────────────
  const topDepts = await gc.aggregate([
    { $match: { dept_name: { $nin: [null, ""] } } },
    { $group: { _id: "$dept_name", gmv: { $sum: "$contract_value_num" }, count: { $sum: 1 }, ministry: { $first: "$ministry" } } },
    { $sort: { gmv: -1 } }, { $limit: TOP_N },
  ]).toArray()

  report.top_departments = topDepts
  const maxGmvDept = topDepts[0]?.gmv || 1

  sep(`E. TOP ${TOP_N} DEPARTMENTS BY SPEND`)
  topDepts.forEach((d, i) => {
    const b = bar(d.gmv, maxGmvDept, 18)
    console.log(`  ${String(i+1).padStart(2)}. ${d._id.slice(0, 38).padEnd(39)}${b} ${inr(d.gmv).padStart(12)}  ×${d.count}`)
  })

  // ── F. Top products by spend ───────────────────────────────────────────────
  const topProducts = await gc.aggregate([
    { $match: { product_name: { $nin: [null, ""] } } },
    { $group: {
      _id: "$product_name",
      gmv: { $sum: "$contract_value_num" },
      count: { $sum: 1 },
      sellers: { $addToSet: "$seller_name_canonical" },
      depts:   { $addToSet: "$dept_name" },
    }},
    { $sort: { gmv: -1 } }, { $limit: TOP_N },
  ]).toArray()

  report.top_products = topProducts
  const maxGmvProduct = topProducts[0]?.gmv || 1

  sep(`F. TOP ${TOP_N} PRODUCTS BY SPEND`)
  topProducts.forEach((p, i) => {
    const b = bar(p.gmv, maxGmvProduct, 16)
    const sel = (p.sellers || []).filter(Boolean).length
    const dep = (p.depts   || []).filter(Boolean).length
    console.log(`  ${String(i+1).padStart(2)}. ${p._id.slice(0, 36).padEnd(37)}${b} ${inr(p.gmv).padStart(12)}  ×${p.count}  S:${sel} D:${dep}`)
  })

  // ── G. Top ministries by spend ─────────────────────────────────────────────
  const topMinistries = await gc.aggregate([
    { $match: { ministry: { $nin: [null, ""] } } },
    { $group: { _id: "$ministry", gmv: { $sum: "$contract_value_num" }, count: { $sum: 1 } } },
    { $sort: { gmv: -1 } }, { $limit: TOP_N },
  ]).toArray()

  report.top_ministries = topMinistries
  const maxGmvMin = topMinistries[0]?.gmv || 1

  sep(`G. TOP ${TOP_N} MINISTRIES BY SPEND`)
  topMinistries.forEach((m, i) => {
    const b = bar(m.gmv, maxGmvMin, 20)
    console.log(`  ${String(i+1).padStart(2)}. ${m._id.slice(0, 38).padEnd(39)}${b} ${inr(m.gmv).padStart(12)}  ×${m.count}`)
  })

  // ── H. States by seller activity ──────────────────────────────────────────
  const topStates = await gc.aggregate([
    { $match: { seller_state: { $nin: [null, ""] } } },
    { $group: { _id: "$seller_state", gmv: { $sum: "$contract_value_num" }, count: { $sum: 1 }, sellers: { $addToSet: "$seller_name_canonical" } } },
    { $sort: { gmv: -1 } }, { $limit: 25 },
  ]).toArray()

  report.top_states = topStates.map(s => ({ ...s, unique_sellers: (s.sellers || []).filter(Boolean).length }))
  const maxGmvState = topStates[0]?.gmv || 1

  sep("H. STATES BY GMV (SELLER STATE)")
  topStates.forEach((s, i) => {
    const b = bar(s.gmv, maxGmvState, 20)
    const uniq = (s.sellers || []).filter(Boolean).length
    console.log(`  ${String(i+1).padStart(2)}. ${s._id.padEnd(22)}${b} ${inr(s.gmv).padStart(12)}  ×${s.count}  S:${uniq}`)
  })

  // ── I. New sellers (not in gem_dealers) ────────────────────────────────────
  if (enriched > 0) {
    const dealerNames = new Set(
      (await dealers.distinct("canonical_name")).map(n => n.toUpperCase())
    )
    const enrichedSellers = await gc.aggregate([
      { $match: { detail_scraped: true, seller_name_canonical: { $nin: [null, ""] } } },
      { $group: {
        _id:   "$seller_name_canonical",
        gmv:   { $sum: "$contract_value_num" },
        count: { $sum: 1 },
        phone: { $first: "$seller_phone" },
        email: { $first: "$seller_email" },
        state: { $first: "$seller_state" },
        gstin: { $first: "$seller_gst" },
      }},
      { $sort: { gmv: -1 } },
    ]).toArray()

    const newSellers = enrichedSellers.filter(s => !dealerNames.has(s._id.toUpperCase()))
    const inDB       = enrichedSellers.filter(s => dealerNames.has(s._id.toUpperCase()))
    const newWithContact = newSellers.filter(s => s.phone || s.email)

    report.new_sellers = {
      total: newSellers.length,
      with_contact: newWithContact.length,
      in_dealer_db: inDB.length,
      top: newSellers.slice(0, TOP_N),
    }

    sep(`I. NEW SELLERS NOT IN DEALER DB  (top ${Math.min(TOP_N, newSellers.length)} of ${newSellers.length})`)
    console.log(`  ${newSellers.length} new sellers discovered  ·  ${newWithContact.length} have phone/email  ·  ${inDB.length} already in dealer DB`)
    const maxGmvNew = newSellers[0]?.gmv || 1
    newSellers.slice(0, TOP_N).forEach((s, i) => {
      const b = bar(s.gmv, maxGmvNew, 16)
      const contact = [s.phone ? "📞" : "  ", s.email ? "✉" : " "].join("")
      console.log(`  ${String(i+1).padStart(2)}. ${s._id.slice(0, 35).padEnd(36)}${b} ${inr(s.gmv).padStart(12)}  ${contact}  ${s.state || ""}`)
    })
  }

  // ── J. Value distribution ──────────────────────────────────────────────────
  const valueDist = await gc.aggregate([
    { $match: { contract_value_num: { $nin: [null, 0] } } },
    { $bucket: {
      groupBy: "$contract_value_num",
      boundaries: [0, 10000, 50000, 100000, 500000, 1000000, 5000000, 10000000, 1e12],
      default: "Other",
      output: { count: { $sum: 1 }, total: { $sum: "$contract_value_num" } },
    }},
  ]).toArray()

  report.value_distribution = valueDist

  const bucketLabels = ["< ₹10K", "₹10K–50K", "₹50K–1L", "₹1L–5L", "₹5L–10L", "₹10L–50L", "₹50L–1Cr", "₹1Cr+", "Other"]
  const maxBucketCount = Math.max(...valueDist.map(b => b.count || 0))

  sep("J. CONTRACT VALUE DISTRIBUTION")
  valueDist.forEach((b, i) => {
    const label = bucketLabels[i] || String(b._id)
    const bBar  = bar(b.count, maxBucketCount, 28)
    console.log(`  ${label.padEnd(12)} ${bBar}  ${String(b.count).padStart(5)}  ${inr(b.total)}`)
  })

  // ── K. Fogging / health adjacency ─────────────────────────────────────────
  const FOGGING_KW = ["fog", "mist", "mosquito", "vector", "pest", "malaria", "dengue", "larvi", "aerosol", "spray machine", "fumigat"]
  const HEALTH_KW  = ["health", "hospital", "sanit", "hygiene", "epidemic", "disease"]
  const MUNI_KW    = ["municipal", "civic", "nagar", "phed", "water supply", "drain", "corporation", "panchayat"]

  const foggingContracts = await gc.find({
    $or: [
      ...FOGGING_KW.map(k => ({ product_name: { $regex: k, $options: "i" } })),
      ...FOGGING_KW.map(k => ({ dept_name:    { $regex: k, $options: "i" } })),
    ]
  }, { projection: { dept_name: 1, ministry: 1, product_name: 1, contract_value_num: 1 } }).toArray()

  const foggingDeptNames = new Set(foggingContracts.map(c => c.dept_name).filter(Boolean))

  sep("K. FOGGING / HEALTH / MUNICIPAL INTELLIGENCE")
  console.log(`  Fogging-tagged contracts:  ${foggingContracts.length}`)
  console.log(`  Departments buying fogging: ${foggingDeptNames.size}`)

  if (foggingDeptNames.size > 0) {
    // What ELSE do fogging departments buy?
    const otherProducts = await gc.aggregate([
      { $match: { dept_name: { $in: [...foggingDeptNames] }, product_name: { $nin: [null, ""] } } },
      { $group: { _id: "$product_name", count: { $sum: 1 }, gmv: { $sum: "$contract_value_num" } } },
      { $sort: { count: -1 } }, { $limit: 20 },
    ]).toArray()

    report.adjacent_products = otherProducts
    console.log(`\n  Products bought by fogging departments (top 20):`)
    otherProducts.forEach((p, i) => {
      const isFog = FOGGING_KW.some(k => p._id.toLowerCase().includes(k))
      const flag  = isFog ? " [FOGGING]" : ""
      console.log(`    ${String(i+1).padStart(2)}. ${p._id.slice(0, 55).padEnd(56)} ×${p.count}${flag}`)
    })
  }

  // ── L. Storage report ──────────────────────────────────────────────────────
  const archiveRoot = process.env.GEM_ARCHIVE_ROOT ||
    path.join("F:", "OneDrive", "Data", "SULABH2018", "E drive", "GeMArchive")
  const pdfDir  = path.join(archiveRoot, "PDFs")
  const textDir = path.join(archiveRoot, "RawText")
  const jsonDir = path.join(archiveRoot, "JSON")
  let pdfCount = 0, pdfBytes = 0, textBytes = 0, jsonBytes = 0

  function scanDir(dir, ext) {
    try {
      const files = fs.readdirSync(dir).filter(f => f.endsWith(ext))
      const bytes = files.reduce((s, f) => {
        try { return s + fs.statSync(path.join(dir, f)).size } catch { return s }
      }, 0)
      return { count: files.length, bytes }
    } catch { return { count: 0, bytes: 0 } }
  }

  const pdfScan  = scanDir(pdfDir,  ".pdf")
  const textScan = scanDir(textDir, ".txt")
  const jsonScan = scanDir(jsonDir, ".json")
  pdfCount = pdfScan.count; pdfBytes = pdfScan.bytes
  textBytes = textScan.bytes; jsonBytes = jsonScan.bytes

  const classDist = await gc.aggregate([
    { $match: { pdf_retention_class: { $exists: true } } },
    { $group: { _id: "$pdf_retention_class", count: { $sum: 1 }, pdf_bytes: { $sum: { $ifNull: ["$pdf_size_bytes", 0] } } } },
  ]).toArray()

  const mongoEst = total * 5 * 1024  // ~5KB/doc (structured fields only, no raw text)
  report.storage = {
    archive_root: archiveRoot,
    pdf_count: pdfCount, pdf_bytes: pdfBytes,
    text_bytes: textBytes, json_bytes: jsonBytes,
    est_mongo_bytes: mongoEst,
    class_dist: classDist,
  }

  sep("L. STORAGE — ONEDRIVE ARCHIVE")
  console.log(`  Archive root:      ${archiveRoot}`)
  console.log(`  PDFs:              ${pdfCount} files  (${(pdfBytes / 1024 / 1024).toFixed(1)} MB)`)
  console.log(`  RawText:           ${textScan.count} files  (${(textBytes / 1024 / 1024).toFixed(1)} MB)`)
  console.log(`  JSON intelligence: ${jsonScan.count} files  (${(jsonBytes / 1024 / 1024).toFixed(1)} MB)`)
  console.log(`  MongoDB (est.):    ${Math.round(mongoEst / 1024 / 1024)} MB  (structured fields only)`)
  console.log(`  Total OneDrive:    ${((pdfBytes + textBytes + jsonBytes) / 1024 / 1024).toFixed(1)} MB`)
  for (const c of classDist.sort((a, b) => (a._id || "Z").localeCompare(b._id || "Z"))) {
    console.log(`  Class ${c._id}:         ${c.count} contracts  (${(c.pdf_bytes / 1024 / 1024).toFixed(1)} MB PDFs in MongoDB metadata)`)
  }

  // ── Final ──────────────────────────────────────────────────────────────────
  console.log("\n" + "═".repeat(70))
  console.log("  SUMMARY")
  console.log("═".repeat(70))
  console.log(`  ${total.toLocaleString()} total contracts  ·  ${inr(gmv.total || 0)} GMV  ·  ${enriched} enriched`)
  console.log(`  ${sellers.length} sellers  ·  ${depts.length} depts  ·  ${products.length} products  ·  ${states.length} states`)
  console.log(`  ${report.new_sellers?.total || "?"} new sellers discovered  ·  ${report.new_sellers?.with_contact || "?"} contactable`)
  console.log("═".repeat(70))

  // ── Optional JSON export ───────────────────────────────────────────────────
  if (WRITE_JSON) {
    const dateStr  = new Date().toISOString().slice(0, 10)
    const archRoot = process.env.GEM_ARCHIVE_ROOT ||
      path.join("F:", "OneDrive", "Data", "SULABH2018", "E drive", "GeMArchive")
    const rptDir   = path.join(archRoot, "Reports")
    fs.mkdirSync(rptDir, { recursive: true })
    const outPath  = path.join(rptDir, `master-report-${dateStr}.json`)
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2))
    console.log(`\n  Report saved to ${outPath}`)
  }

  await client.close()
}

run().catch(e => { console.error(e); process.exit(1) })
