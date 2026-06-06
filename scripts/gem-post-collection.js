#!/usr/bin/env node
/**
 * gem-post-collection.js
 *
 * Runs the complete post-collection pipeline in sequence:
 *   1. Enrichment   (gem-enrich-contracts.js --value-first)
 *   2. Classification (gem-classify-pdfs.js --force-reclassify)
 *   3. Master report (gem-master-report.js --json --top=50)
 *
 * Usage:
 *   node scripts/gem-post-collection.js
 *   node scripts/gem-post-collection.js --enrich-only
 *   node scripts/gem-post-collection.js --skip-enrich      (classify + report only)
 *
 * Run after gem-contracts-collector.js finishes all chunks.
 * Safe to run multiple times — all steps are idempotent.
 */

const { spawn } = require("child_process")
const fs = require("fs")
const path = require("path")

;(function loadEnv() {
  const lines = fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8").split("\n")
  for (const l of lines) {
    const m = l.match(/^([^=#\s][^=]*)=(.*)$/)
    if (m) process.env[m[1].trim()] = m[2].trim()
  }
})()

const SKIP_ENRICH = process.argv.includes("--skip-enrich")
const ENRICH_ONLY = process.argv.includes("--enrich-only")

const ARCHIVE_ROOT = process.env.GEM_ARCHIVE_ROOT ||
  path.join("F:", "OneDrive", "Data", "SULABH2018", "E drive", "GeMArchive")

function run(script, args = []) {
  return new Promise((resolve, reject) => {
    console.log(`\n${"═".repeat(70)}`)
    console.log(`  RUNNING: node ${script} ${args.join(" ")}`)
    console.log(`${"═".repeat(70)}`)

    const child = spawn("node", [script, ...args], {
      stdio: "inherit",
      shell: false,
      cwd: path.join(__dirname, ".."),
    })

    child.on("close", code => {
      if (code === 0) {
        console.log(`\n  ✓ ${path.basename(script)} completed (exit 0)`)
        resolve()
      } else {
        console.error(`\n  ✗ ${path.basename(script)} failed (exit ${code})`)
        reject(new Error(`${script} exited with code ${code}`))
      }
    })

    child.on("error", err => reject(err))
  })
}

;(async () => {
  const startedAt = new Date()
  console.log(`\n${"═".repeat(70)}`)
  console.log("  GEM POST-COLLECTION PIPELINE")
  console.log(`  Started: ${startedAt.toISOString()}`)
  console.log(`  Archive: ${ARCHIVE_ROOT}`)
  console.log(`${"═".repeat(70)}`)

  const results = []

  try {
    if (!SKIP_ENRICH) {
      const t = Date.now()
      await run("scripts/gem-enrich-contracts.js", ["--value-first"])
      results.push({ step: "enrichment", ok: true, ms: Date.now() - t })
    }

    if (!ENRICH_ONLY) {
      const t1 = Date.now()
      await run("scripts/gem-classify-pdfs.js", ["--force-reclassify"])
      results.push({ step: "classification", ok: true, ms: Date.now() - t1 })

      const t2 = Date.now()
      await run("scripts/gem-master-report.js", ["--json", "--top=50"])
      results.push({ step: "master_report", ok: true, ms: Date.now() - t2 })
    }

    const completedAt = new Date()
    const totalSec = Math.round((completedAt - startedAt) / 1000)

    // Write run manifest
    const manifestDir = path.join(ARCHIVE_ROOT, "Manifests")
    fs.mkdirSync(manifestDir, { recursive: true })
    const manifest = {
      run_type: "post_collection",
      started_at: startedAt.toISOString(),
      completed_at: completedAt.toISOString(),
      duration_sec: totalSec,
      steps: results,
      status: "completed",
    }
    const mPath = path.join(manifestDir, `run-${startedAt.toISOString().slice(0,10)}.json`)
    fs.writeFileSync(mPath, JSON.stringify(manifest, null, 2))

    console.log(`\n${"═".repeat(70)}`)
    console.log("  POST-COLLECTION PIPELINE COMPLETE")
    console.log(`${"═".repeat(70)}`)
    results.forEach(r => console.log(`  ✓ ${r.step.padEnd(20)} ${(r.ms / 1000).toFixed(1)}s`))
    console.log(`  Total: ${Math.floor(totalSec/60)}m ${totalSec%60}s`)
    console.log(`  Manifest: ${mPath}`)

  } catch (err) {
    console.error("\n  PIPELINE FAILED:", err.message)
    process.exit(1)
  }
})()
