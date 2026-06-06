#!/usr/bin/env node
/**
 * gem-classify-pdfs.js
 *
 * Classifies existing gem_contracts by PDF retention tier and updates MongoDB.
 * Safe to re-run — always idempotent.
 *
 * Usage:
 *   node scripts/gem-classify-pdfs.js [--dry-run] [--force-reclassify]
 *
 * What it does:
 *   - Assigns pdf_retention_class (A / B / C) to every contract
 *   - Checks local disk for PDF existence, records pdf_saved / pdf_size / pdf_hash
 *   - Does NOT delete anything — run gem-cleanup-pdfs.js for deletions
 */

// Load .env.local manually (no dotenv dependency)
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
const crypto = require("crypto")

const DRY_RUN           = process.argv.includes("--dry-run")
const FORCE_RECLASSIFY  = process.argv.includes("--force-reclassify")

const ARCHIVE_ROOT = process.env.GEM_ARCHIVE_ROOT ||
  path.join("F:", "OneDrive", "Data", "SULABH2018", "E drive", "GeMArchive")
const PDF_DIR  = path.join(ARCHIVE_ROOT, "PDFs")
const TEXT_DIR = path.join(ARCHIVE_ROOT, "RawText")

// ─── Classification keywords ──────────────────────────────────────────────────
const FOGGING_KW = [
  "fog", "mist", "ulv", "thermal", "mosquito", "vector", "pest", "malaria",
  "dengue", "larvi", "aerosol", "spray machine", "fumigat", "sanit",
]
const HEALTH_KW = [
  "health", "hospital", "medical", "epidemic", "disease", "civic",
  "municipal corporation", "phed", "water supply",
]
const DEFENSE_KW = [
  "defense", "defence", "army", "navy", "air force", "military",
  "drdo", "ordnance", "canteen stores", "border security",
]

function classifyContract(c) {
  const value   = c.contract_value_num || 0
  const product = (c.product_name      || "").toLowerCase()
  const dept    = (c.dept_name         || "").toLowerCase()
  const ministry = (c.ministry         || "").toLowerCase()
  const combined = `${product} ${dept} ${ministry}`

  const isFogging = FOGGING_KW.some(k => combined.includes(k))
  const isHealth  = HEALTH_KW.some(k  => combined.includes(k))
  const isDefense = DEFENSE_KW.some(k => combined.includes(k))
  const isBookmarked = !!c.pdf_bookmarked
  const isHighValue  = value >= 1_000_000  // ₹10L+

  if (isHighValue || isFogging || isHealth || isDefense || isBookmarked) return "A"
  if (value >= 100_000) return "B"   // ₹1L – ₹10L
  return "C"
}

function slug(id) { return id.replace(/[^A-Z0-9]/g, "_") }

function pdfPath(gemcNo)  { return path.join(PDF_DIR,  `${slug(gemcNo)}.pdf`) }
function textPath(gemcNo) { return path.join(TEXT_DIR, `${slug(gemcNo)}.txt`) }

function sha256(filePath) {
  try {
    const buf = fs.readFileSync(filePath)
    return crypto.createHash("sha256").update(buf).digest("hex")
  } catch { return null }
}

async function run() {
  const client = new MongoClient(process.env.MONGODB_URI)
  await client.connect()
  const db = client.db()
  const gc = db.collection("gem_contracts")

  const contracts = await gc
    .find(
      FORCE_RECLASSIFY ? {} : { pdf_retention_class: { $exists: false } },
      { projection: { gemc_no: 1, contract_value_num: 1, product_name: 1, dept_name: 1, ministry: 1, pdf_bookmarked: 1, pdf_retention_class: 1 } }
    )
    .toArray()

  if (!contracts.length) {
    console.log("All contracts already classified. Use --force-reclassify to re-run.")
    await client.close()
    return
  }

  console.log(`Classifying ${contracts.length} contracts${DRY_RUN ? " (DRY RUN)" : ""}…\n`)

  const counts = { A: 0, B: 0, C: 0 }
  const pdfExists = { A: 0, B: 0, C: 0 }
  const pdfSizes  = { A: 0, B: 0, C: 0 }
  let updated = 0

  for (const c of contracts) {
    const cls    = classifyContract(c)
    const pPath  = pdfPath(c.gemc_no)
    const tPath  = textPath(c.gemc_no)
    const exists = fs.existsSync(pPath)
    const size   = exists ? fs.statSync(pPath).size : null
    const hash   = exists ? sha256(pPath) : null
    const textExists = fs.existsSync(tPath)

    counts[cls]++
    if (exists) { pdfExists[cls]++; pdfSizes[cls] += size || 0 }

    const safeName = slug(c.gemc_no)
    const update = {
      pdf_retention_class: cls,
      pdf_saved:  exists,
      pdf_path:   exists ? `audit/enrichment/pdfs/${safeName}.pdf` : (c.pdf_path || null),
      pdf_size:   size,
      pdf_hash:   hash,
      raw_text_available: textExists,
    }

    if (!DRY_RUN) {
      await gc.updateOne({ gemc_no: c.gemc_no }, { $set: update })
      updated++
    } else {
      updated++
    }

    if (updated % 20 === 0) process.stdout.write(`  ${updated}/${contracts.length}…\r`)
  }

  // ── Print summary ──────────────────────────────────────────────────────────
  console.log(`\n${"─".repeat(60)}`)
  console.log(`PDF CLASSIFICATION RESULTS ${DRY_RUN ? "[DRY RUN]" : "(committed to MongoDB)"}`)
  console.log(`${"─".repeat(60)}`)

  for (const cls of ["A", "B", "C"]) {
    const label = { A: "Class A — Strategic  (keep permanently)", B: "Class B — Useful     (keep 6–12 months)", C: "Class C — Disposable (delete after extraction)" }[cls]
    const diskMB = (pdfSizes[cls] / 1024 / 1024).toFixed(1)
    const diskKB = pdfExists[cls] ? Math.round(pdfSizes[cls] / pdfExists[cls] / 1024) : 0
    console.log(`\n  ${label}`)
    console.log(`    Count:   ${counts[cls]}`)
    console.log(`    On disk: ${pdfExists[cls]} PDFs (${diskMB} MB, avg ${diskKB} KB each)`)
  }

  const totalPdfs = Object.values(pdfExists).reduce((a, b) => a + b, 0)
  const totalMB   = (Object.values(pdfSizes).reduce((a, b) => a + b, 0) / 1024 / 1024).toFixed(1)
  const reclaimC  = (pdfSizes.C / 1024 / 1024).toFixed(1)
  const reclaimB  = (pdfSizes.B / 1024 / 1024).toFixed(1)

  console.log(`\n${"─".repeat(60)}`)
  console.log(`Total PDFs on disk: ${totalPdfs}  (${totalMB} MB)`)
  console.log(`Immediately reclaimable (Class C): ${pdfSizes.C ? reclaimC + " MB" : "nothing"}`)
  console.log(`Reclaimable in 6–12 months (B):   ${pdfSizes.B ? reclaimB + " MB" : "nothing"}`)
  console.log(`Class A (permanent archive):       ${(pdfSizes.A / 1024 / 1024).toFixed(1)} MB`)

  if (DRY_RUN) {
    console.log("\n⚠  DRY RUN — MongoDB not updated. Remove --dry-run to commit.")
  } else {
    console.log(`\n✓  Updated ${updated} contracts in gem_contracts.`)
    console.log("   Run gem-cleanup-pdfs.js to delete Class C PDFs.")
  }

  await client.close()
}

run().catch(e => { console.error(e); process.exit(1) })
