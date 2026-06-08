#!/usr/bin/env node
// One-shot MongoDB query report — no collection, no scraping.
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

function inr(n) {
  if (!n) return "₹0"
  if (n >= 1e7) return "₹" + (n / 1e7).toFixed(2) + " Cr"
  if (n >= 1e5) return "₹" + (n / 1e5).toFixed(2) + " L"
  return "₹" + Math.round(n).toLocaleString("en-IN")
}

function bar(v, max, w) {
  w = w || 22
  const n = max > 0 ? Math.round((v / max) * w) : 0
  return "█".repeat(n) + "░".repeat(w - n)
}

function sep(s) {
  console.log("\n" + "─".repeat(72) + "\n  " + s + "\n" + "─".repeat(72))
}

function scanDir(dir, ext) {
  try {
    const files = fs.readdirSync(dir).filter(function(f) { return f.endsWith(ext) })
    const bytes = files.reduce(function(s, f) {
      try { return s + fs.statSync(path.join(dir, f)).size } catch(e) { return s }
    }, 0)
    return { count: files.length, bytes: bytes }
  } catch(e) { return { count: 0, bytes: 0 } }
}

const MONTHS = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]

;(async function() {
  const client = new MongoClient(process.env.MONGODB_URI)
  await client.connect()
  const gc = client.db().collection("gem_contracts")

  // ── 1. Totals ────────────────────────────────────────────────────────────────
  const total    = await gc.countDocuments()
  const enriched = await gc.countDocuments({ detail_scraped: true })
  const withPdf  = await gc.countDocuments({ pdf_path: { $regex: "GeMArchive" } })

  // ── 2. Date range ────────────────────────────────────────────────────────────
  const dr = await gc.aggregate([
    { $group: {
      _id: null,
      minDt:  { $min: "$contract_date_dt" },
      maxDt:  { $max: "$contract_date_dt" },
      minRaw: { $min: "$contract_date" },
      maxRaw: { $max: "$contract_date" },
    }}
  ]).toArray()
  const dateMin = dr[0] ? (dr[0].minDt || dr[0].minRaw || "n/a") : "n/a"
  const dateMax = dr[0] ? (dr[0].maxDt || dr[0].maxRaw || "n/a") : "n/a"

  // ── 3. GMV ───────────────────────────────────────────────────────────────────
  const gmvAgg = await gc.aggregate([
    { $group: { _id: null, gmv: { $sum: "$contract_value_num" } } }
  ]).toArray()
  const gmv = gmvAgg[0] ? gmvAgg[0].gmv : 0

  // ── 4. Unique dimensions ─────────────────────────────────────────────────────
  const [sellerList, deptList, ministryList, productList, stateList] = await Promise.all([
    gc.distinct("seller_name_canonical"),
    gc.distinct("dept_name"),
    gc.distinct("ministry"),
    gc.distinct("product_name"),
    gc.distinct("state"),
  ])
  const sellers    = sellerList.filter(Boolean).length
  const depts      = deptList.filter(Boolean).length
  const ministries = ministryList.filter(Boolean).length
  const products   = productList.filter(Boolean).length
  const states     = stateList.filter(Boolean).length

  // ── 5. Class distribution ────────────────────────────────────────────────────
  const classDist = await gc.aggregate([
    { $group: { _id: "$pdf_retention_class", count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]).toArray()

  // ── 6. Top 20 departments by spend ───────────────────────────────────────────
  const topDepts = await gc.aggregate([
    { $match: { dept_name: { $nin: [null, ""] } } },
    { $group: { _id: "$dept_name", count: { $sum: 1 }, gmv: { $sum: "$contract_value_num" } } },
    { $sort: { gmv: -1 } },
    { $limit: 20 }
  ]).toArray()

  // ── 7. Top 20 sellers by GMV ─────────────────────────────────────────────────
  const topSellers = await gc.aggregate([
    { $match: { seller_name_canonical: { $nin: [null, ""] } } },
    { $group: { _id: "$seller_name_canonical", count: { $sum: 1 }, gmv: { $sum: "$contract_value_num" } } },
    { $sort: { gmv: -1 } },
    { $limit: 20 }
  ]).toArray()

  // ── 8. Top 20 products by GMV ────────────────────────────────────────────────
  const topProducts = await gc.aggregate([
    { $match: { product_name: { $nin: [null, ""] } } },
    { $group: { _id: "$product_name", count: { $sum: 1 }, gmv: { $sum: "$contract_value_num" } } },
    { $sort: { gmv: -1 } },
    { $limit: 20 }
  ]).toArray()

  // ── 9. Contracts by month ─────────────────────────────────────────────────────
  const byMonth = await gc.aggregate([
    { $match: { contract_date_dt: { $exists: true, $ne: null } } },
    { $group: {
      _id: { y: { $year: "$contract_date_dt" }, m: { $month: "$contract_date_dt" } },
      count: { $sum: 1 },
      gmv:   { $sum: "$contract_value_num" }
    }},
    { $sort: { "_id.y": 1, "_id.m": 1 } }
  ]).toArray()

  // ── 10. Contracts by year ────────────────────────────────────────────────────
  const byYear = await gc.aggregate([
    { $match: { contract_date_dt: { $exists: true, $ne: null } } },
    { $group: { _id: { $year: "$contract_date_dt" }, count: { $sum: 1 }, gmv: { $sum: "$contract_value_num" } } },
    { $sort: { _id: 1 } }
  ]).toArray()

  // ── 11. Top 50 categories ────────────────────────────────────────────────────
  const topCats = await gc.aggregate([
    { $match: { category_name: { $nin: [null, ""] } } },
    { $group: { _id: "$category_name", count: { $sum: 1 }, gmv: { $sum: "$contract_value_num" } } },
    { $sort: { count: -1 } },
    { $limit: 50 }
  ]).toArray()

  // ── Fallback: raw contract_date grouping if no contract_date_dt ───────────────
  const byMonthRaw = byMonth.length === 0 ? await gc.aggregate([
    { $match: { contract_date: { $nin: [null, ""] } } },
    { $addFields: {
      _dateParts: { $regexFind: { input: "$contract_date", regex: "(\\d{1,2})/(\\d{1,2})/(\\d{4})" } }
    }},
    { $group: {
      _id: {
        y: { $substr: ["$contract_date", 6, 4] },
        m: { $substr: ["$contract_date", 3, 2] }
      },
      count: { $sum: 1 },
      gmv:   { $sum: "$contract_value_num" }
    }},
    { $sort: { "_id.y": 1, "_id.m": 1 } }
  ]).toArray() : []

  // ── OneDrive storage ─────────────────────────────────────────────────────────
  const ARCHIVE = process.env.GEM_ARCHIVE_ROOT ||
    path.join("F:", "OneDrive", "Data", "SULABH2018", "E drive", "GeMArchive")
  const pdfScan  = scanDir(path.join(ARCHIVE, "PDFs"),    ".pdf")
  const txtScan  = scanDir(path.join(ARCHIVE, "RawText"), ".txt")
  const jsonScan = scanDir(path.join(ARCHIVE, "JSON"),    ".json")
  const totalBytes = pdfScan.bytes + txtScan.bytes + jsonScan.bytes

  // ── OUTPUT ───────────────────────────────────────────────────────────────────
  console.log("\n" + "═".repeat(72))
  console.log("  GEM PROCUREMENT DATABASE — LIVE QUERY REPORT")
  console.log("  Source: MongoDB  |  No scraping  |  " + new Date().toLocaleString("en-IN"))
  console.log("═".repeat(72))

  sep("TOTALS  (items 1–12)")
  console.log("   1. Total contracts         : " + total.toLocaleString("en-IN"))
  console.log("   2. Earliest contract date  : " + dateMin)
  console.log("   3. Latest contract date    : " + dateMax)
  console.log("   4. Total GMV               : " + inr(gmv))
  console.log("   5. Unique sellers          : " + sellers.toLocaleString("en-IN"))
  console.log("   6. Unique departments      : " + depts.toLocaleString("en-IN"))
  console.log("   7. Unique ministries       : " + ministries.toLocaleString("en-IN"))
  console.log("   8. Unique products         : " + products.toLocaleString("en-IN"))
  console.log("   9. Unique states           : " + states.toLocaleString("en-IN"))
  console.log("  10. Enriched contracts      : " + enriched + " / " + total + "  (" + (total ? Math.round(enriched / total * 100) : 0) + "%)")
  console.log("  11. PDFs archived (OneDrive): " + pdfScan.count)
  console.log("  12. OneDrive storage        :")
  console.log("        PDFs     " + String(pdfScan.count).padStart(4) + " files   " + (pdfScan.bytes / 1048576).toFixed(2) + " MB")
  console.log("        RawText  " + String(txtScan.count).padStart(4) + " files   " + (txtScan.bytes / 1048576).toFixed(2) + " MB")
  console.log("        JSON     " + String(jsonScan.count).padStart(4) + " files   " + (jsonScan.bytes / 1048576).toFixed(2) + " MB")
  console.log("        ─────────────────────────────────────────────")
  console.log("        Total    " + String(pdfScan.count + txtScan.count + jsonScan.count).padStart(4) + " files   " + (totalBytes / 1048576).toFixed(2) + " MB  (" + (totalBytes / 1073741824).toFixed(4) + " GB)")

  sep("CLASS A / B / C  (PDF retention classification)")
  const classMap = {}
  classDist.forEach(function(c) { classMap[String(c._id)] = c.count })
  const classLabels = {
    A: "Class A — Strategic       (permanent keep)",
    B: "Class B — Useful          (6–12 month keep)",
    C: "Class C — Disposable      (delete post-extraction)",
    "null": "Unclassified"
  }
  ;["A","B","C","null"].forEach(function(cls) {
    const n   = classMap[cls] || 0
    const pct = total > 0 ? (n / total * 100).toFixed(1) : "0.0"
    console.log("  " + classLabels[cls].padEnd(48) + ": " + String(n).padStart(4) + "  (" + pct + "%)")
  })

  sep("13. TOP 20 DEPARTMENTS BY SPEND")
  const maxDG = topDepts.length ? topDepts[0].gmv : 1
  topDepts.forEach(function(d, i) {
    const name = (d._id || "").slice(0, 52).padEnd(52)
    console.log("  " + String(i + 1).padStart(2) + ". " + name + bar(d.gmv, maxDG, 18) + "  " + inr(d.gmv).padStart(13) + "  ×" + d.count)
  })

  sep("14. TOP 20 SELLERS BY GMV")
  const maxSG = topSellers.length ? topSellers[0].gmv : 1
  topSellers.forEach(function(s, i) {
    const name = (s._id || "").slice(0, 48).padEnd(48)
    console.log("  " + String(i + 1).padStart(2) + ". " + name + bar(s.gmv, maxSG, 18) + "  " + inr(s.gmv).padStart(13) + "  ×" + s.count)
  })

  sep("15. TOP 20 PRODUCTS BY GMV")
  const maxPG = topProducts.length ? topProducts[0].gmv : 1
  topProducts.forEach(function(p, i) {
    const name = (p._id || "").slice(0, 52).padEnd(52)
    console.log("  " + String(i + 1).padStart(2) + ". " + name + bar(p.gmv, maxPG, 18) + "  " + inr(p.gmv).padStart(13) + "  ×" + p.count)
  })

  sep("CONTRACTS BY MONTH")
  if (byMonth.length > 0) {
    const maxM = Math.max.apply(null, byMonth.map(function(r) { return r.count }))
    byMonth.forEach(function(r) {
      const label = (MONTHS[r._id.m] + " " + r._id.y).padEnd(10)
      console.log("  " + label + "  " + bar(r.count, maxM, 28) + "  " + String(r.count).padStart(5) + "  " + inr(r.gmv))
    })
  } else if (byMonthRaw.length > 0) {
    const maxM = Math.max.apply(null, byMonthRaw.map(function(r) { return r.count }))
    byMonthRaw.forEach(function(r) {
      const label = (r._id.m + "/" + r._id.y).padEnd(10)
      console.log("  " + label + "  " + bar(r.count, maxM, 28) + "  " + String(r.count).padStart(5) + "  " + inr(r.gmv))
    })
  } else {
    console.log("  No date field populated (contract_date_dt or contract_date not set)")
    console.log("  Raw date range: " + dateMin + "  →  " + dateMax)
  }

  sep("CONTRACTS BY YEAR")
  if (byYear.length > 0) {
    const maxY = Math.max.apply(null, byYear.map(function(r) { return r.count }))
    byYear.forEach(function(r) {
      console.log("  " + String(r._id).padEnd(8) + "  " + bar(r.count, maxY, 28) + "  " + String(r.count).padStart(5) + "  " + inr(r.gmv))
    })
  } else {
    console.log("  No contract_date_dt populated — all raw dates: " + dateMin + " to " + dateMax)
  }

  sep("TOP 50 CATEGORIES  (by contract count)")
  if (topCats.length === 0) {
    console.log("  category_name field not populated in current dataset.")
  } else {
    const maxCat = topCats[0].count
    topCats.forEach(function(c, i) {
      const name = (c._id || "").slice(0, 55).padEnd(55)
      console.log("  " + String(i + 1).padStart(2) + ". " + name + bar(c.count, maxCat, 14) + "  ×" + String(c.count).padStart(4) + "  " + inr(c.gmv))
    })
  }

  console.log("\n" + "═".repeat(72))
  console.log("  END OF REPORT  —  source: gem_contracts  —  no scraping performed")
  console.log("═".repeat(72) + "\n")

  await client.close()
})().catch(function(e) { console.error("FATAL:", e.message); process.exit(1) })
