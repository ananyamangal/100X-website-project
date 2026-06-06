#!/usr/bin/env node
/**
 * gem-cleanup-pdfs.js
 *
 * Enforces PDF and raw-text retention policy.
 * Run AFTER gem-classify-pdfs.js.
 *
 * Usage:
 *   node scripts/gem-cleanup-pdfs.js [--dry-run] [--raw-only] [--pdf-only]
 *
 * What it does:
 *   Tier 2 (raw text in gem_contracts_raw):
 *     Delete raw entries older than RAW_RETENTION_DAYS where
 *     gem_contracts.extraction_confidence >= CONFIDENCE_THRESHOLD
 *
 *   Tier 3 — Class C PDFs:
 *     Delete immediately (should have been deleted at enrichment time)
 *
 *   Tier 3 — Class B PDFs:
 *     Delete if first_seen older than B_RETENTION_DAYS (default: 180 days)
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

const DRY_RUN          = process.argv.includes("--dry-run")
const RAW_ONLY         = process.argv.includes("--raw-only")
const PDF_ONLY         = process.argv.includes("--pdf-only")

const RAW_RETENTION_DAYS   = 90    // days before raw text deletion
const B_RETENTION_DAYS     = 180   // days before Class B PDF deletion
const CONFIDENCE_THRESHOLD = 60    // minimum confidence to allow raw deletion

const PDF_DIR = path.join(process.cwd(), "audit", "enrichment", "pdfs")

function daysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
}

function slug(id) { return id.replace(/[^A-Z0-9]/g, "_") }
function pdfDiskPath(gemcNo) { return path.join(PDF_DIR, `${slug(gemcNo)}.pdf`) }

async function cleanupRaw(gc, raw, dryRun) {
  const cutoff = daysAgo(RAW_RETENTION_DAYS)

  // Find raw entries old enough to delete
  const candidates = await raw.find({
    $or: [
      { enrichment_timestamp: { $lt: cutoff } },
      { created_at: { $lt: cutoff } },
    ]
  }, { projection: { gemc_no: 1 } }).toArray()

  if (!candidates.length) {
    console.log("  Raw cleanup: no entries past retention window.")
    return { checked: 0, deleted: 0 }
  }

  const gemcNos = candidates.map(r => r.gemc_no)

  // Only delete if the contract has sufficient extraction confidence
  const highConfidence = await gc.find(
    {
      gemc_no: { $in: gemcNos },
      extraction_confidence: { $gte: CONFIDENCE_THRESHOLD },
    },
    { projection: { gemc_no: 1 } }
  ).toArray()

  const safeToDelete = new Set(highConfidence.map(c => c.gemc_no))
  const toDelete = candidates.filter(r => safeToDelete.has(r.gemc_no))

  console.log(`  Raw cleanup: ${candidates.length} candidates, ${toDelete.length} safe to delete (confidence ≥ ${CONFIDENCE_THRESHOLD}%)`)

  if (!dryRun && toDelete.length) {
    const deleteNos = toDelete.map(r => r.gemc_no)
    const result = await raw.deleteMany({ gemc_no: { $in: deleteNos } })
    // Mark in gem_contracts
    await gc.updateMany(
      { gemc_no: { $in: deleteNos } },
      { $set: { raw_deleted_at: new Date() } }
    )
    console.log(`  ✓ Deleted ${result.deletedCount} raw entries.`)
    return { checked: candidates.length, deleted: result.deletedCount }
  }

  return { checked: candidates.length, deleted: 0 }
}

async function cleanupPdfs(gc, dryRun) {
  const deleted = { C: 0, B: 0, missingFromDisk: 0 }
  const freed   = { C: 0, B: 0 }

  // ── Class C: delete immediately ──────────────────────────────────────────
  const classC = await gc.find(
    { pdf_retention_class: "C", pdf_saved: true },
    { projection: { gemc_no: 1, pdf_path: 1, pdf_size: 1 } }
  ).toArray()

  console.log(`\n  Class C PDFs on disk: ${classC.length}`)
  for (const c of classC) {
    const diskPath = pdfDiskPath(c.gemc_no)
    if (fs.existsSync(diskPath)) {
      const size = fs.statSync(diskPath).size
      if (!dryRun) {
        fs.unlinkSync(diskPath)
        await gc.updateOne({ gemc_no: c.gemc_no }, {
          $set: { pdf_saved: false, pdf_deleted_at: new Date() }
        })
      }
      deleted.C++
      freed.C += size
    } else {
      // Already gone — sync the flag
      if (!dryRun) {
        await gc.updateOne({ gemc_no: c.gemc_no }, {
          $set: { pdf_saved: false, pdf_deleted_at: new Date() }
        })
      }
      deleted.missingFromDisk++
    }
  }

  // ── Class B: delete if past retention ─────────────────────────────────────
  const bCutoff = daysAgo(B_RETENTION_DAYS)
  const classB = await gc.find(
    {
      pdf_retention_class: "B",
      pdf_saved: true,
      $or: [
        { first_seen: { $lt: bCutoff } },
        { first_seen_at: { $lt: bCutoff } },
      ]
    },
    { projection: { gemc_no: 1, pdf_path: 1, pdf_size: 1, first_seen: 1 } }
  ).toArray()

  console.log(`  Class B PDFs past ${B_RETENTION_DAYS}-day retention: ${classB.length}`)
  for (const c of classB) {
    const diskPath = pdfDiskPath(c.gemc_no)
    if (fs.existsSync(diskPath)) {
      const size = fs.statSync(diskPath).size
      if (!dryRun) {
        fs.unlinkSync(diskPath)
        await gc.updateOne({ gemc_no: c.gemc_no }, {
          $set: { pdf_saved: false, pdf_deleted_at: new Date() }
        })
      }
      deleted.B++
      freed.B += size
    }
  }

  const totalFreedMB = ((freed.C + freed.B) / 1024 / 1024).toFixed(2)
  console.log(`\n  PDF cleanup summary:`)
  console.log(`    Class C deleted: ${deleted.C}  (${(freed.C / 1024 / 1024).toFixed(2)} MB freed)`)
  console.log(`    Class B deleted: ${deleted.B}  (${(freed.B / 1024 / 1024).toFixed(2)} MB freed)`)
  console.log(`    Disk stale flags fixed: ${deleted.missingFromDisk}`)
  console.log(`    Total freed: ${totalFreedMB} MB`)

  return { deleted, freed }
}

async function run() {
  const client = new MongoClient(process.env.MONGODB_URI)
  await client.connect()
  const db  = client.db()
  const gc  = db.collection("gem_contracts")
  const raw = db.collection("gem_contracts_raw")

  console.log(`${"─".repeat(60)}`)
  console.log(`PDF & RAW CLEANUP ${DRY_RUN ? "[DRY RUN]" : "(LIVE)"}`)
  console.log(`${"─".repeat(60)}`)

  if (!PDF_ONLY) {
    console.log("\nTier 2 — Raw text cleanup:")
    const rawResult = await cleanupRaw(gc, raw, DRY_RUN)
    if (!rawResult.deleted && !DRY_RUN) {
      console.log("  Nothing to clean up in gem_contracts_raw.")
    }
  }

  if (!RAW_ONLY) {
    console.log("\nTier 3 — PDF cleanup:")
    await cleanupPdfs(gc, DRY_RUN)
  }

  if (DRY_RUN) {
    console.log("\n⚠  DRY RUN — no files deleted. Remove --dry-run to execute.")
  } else {
    console.log("\n✓  Cleanup complete.")
  }

  await client.close()
}

run().catch(e => { console.error(e); process.exit(1) })
