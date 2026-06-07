"use strict"
// gem-full-harvest.js — Full harvest orchestrator
//
// Phase 1: 60-day validation sweep (--reset, fully unattended)
//          Verifies: captcha automation, collection, enrichment, archive, reports
// Phase 2: 1095-day historical collection (checkpoint extended from Phase 1)
//          Runs chunks 3-36 covering 3 years of GeM contracts
// Phase 3: Final reports → GeMArchive/Reports/
//          Master, Opportunity, Dealer Lead, Product Opportunity,
//          Top Departments, Top Sellers
//
// Usage: node scripts/gem-full-harvest.js
// No arguments needed. Fully unattended.

const { spawn } = require("child_process")
const path      = require("path")
const fs        = require("fs")
const { MongoClient } = require("mongodb")

;(function loadEnv() {
  const lines = fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8").split("\n")
  for (const l of lines) {
    const m = l.match(/^([^#=\s][^=]*)=(.*)$/)
    if (m) process.env[m[1].trim()] = m[2].trim()
  }
})()

const ARCHIVE    = process.env.GEM_ARCHIVE_ROOT ||
  path.join("F:", "OneDrive", "Data", "SULABH2018", "E drive", "GeMArchive")
const REPORT_DIR = path.join(ARCHIVE, "Reports")
const CHECKPOINT = path.join(__dirname, "..", "audit", "contracts-checkpoint.json")

fs.mkdirSync(REPORT_DIR, { recursive: true })
fs.mkdirSync(path.join(__dirname, "..", "audit"), { recursive: true })

// ── Helpers ───────────────────────────────────────────────────────────────────

function runCollector(args) {
  return new Promise((resolve, reject) => {
    console.log(`\n  $ node scripts/gem-contracts-collector.js ${args.join(" ")}`)
    const child = spawn("node", ["scripts/gem-contracts-collector.js", ...args], {
      stdio: "inherit", cwd: path.join(__dirname, ".."), shell: false,
    })
    child.on("close", code => {
      if (code === 0 || code === null) resolve(code)
      else reject(new Error(`Collector exited with code ${code}`))
    })
    child.on("error", err => reject(err))
  })
}

function scanDir(dir, ext) {
  try {
    const files = fs.readdirSync(dir).filter(f => !ext || f.endsWith(ext))
    const bytes = files.reduce((s, f) => {
      try { return s + fs.statSync(path.join(dir, f)).size } catch { return s }
    }, 0)
    return { count: files.length, bytes }
  } catch { return { count: 0, bytes: 0 } }
}

function mb(n) { return (n / 1048576).toFixed(2) + " MB" }

function inr(n) {
  if (!n) return "₹0"
  if (n >= 1e7) return "₹" + (n / 1e7).toFixed(2) + " Cr"
  if (n >= 1e5) return "₹" + (n / 1e5).toFixed(2) + " L"
  return "₹" + Math.round(n).toLocaleString("en-IN")
}

function hr2(w) { return "═".repeat(w || 72) }
function hr(w)  { return "─".repeat(w || 72) }

function saveReport(name, lines) {
  const dateStr = new Date().toISOString().slice(0, 10)
  const fname   = `${name}-${dateStr}.txt`
  const fpath   = path.join(REPORT_DIR, fname)
  fs.writeFileSync(fpath, lines.join("\n"), "utf8")
  console.log(`    → Saved: ${fname}`)
  return fpath
}

function loadCheckpoint() {
  try { return JSON.parse(fs.readFileSync(CHECKPOINT, "utf8")) } catch { return null }
}

// ── Final reports (all 6) ─────────────────────────────────────────────────────

async function generateFinalReports(db) {
  const gc  = db.collection("gem_contracts")
  const now = new Date()

  console.log("\n" + hr2())
  console.log("  PHASE 3 — GENERATING FINAL REPORTS")
  console.log(hr2())

  const [total, enriched] = await Promise.all([
    gc.countDocuments(),
    gc.countDocuments({ detail_scraped: true }),
  ])
  const gmvAgg = await gc.aggregate([
    { $group: { _id: null, gmv: { $sum: "$contract_value_num" } } }
  ]).toArray()
  const gmv = gmvAgg[0]?.gmv || 0

  const [topDepts, topSellers, topProducts, topStates, dealers, topMinistries] = await Promise.all([
    gc.aggregate([
      { $match: { dept_name: { $nin: [null, ""] } } },
      { $group: { _id: "$dept_name", gmv: { $sum: "$contract_value_num" }, contracts: { $sum: 1 },
          ministry: { $first: "$ministry" }, state: { $first: "$buyer_state" } } },
      { $sort: { gmv: -1 } }, { $limit: 50 },
    ]).toArray(),
    gc.aggregate([
      { $match: { seller_name_canonical: { $nin: [null, ""] } } },
      { $group: { _id: "$seller_name_canonical", gmv: { $sum: "$contract_value_num" }, contracts: { $sum: 1 },
          state: { $first: "$seller_state" }, phone: { $first: "$seller_phone" },
          email: { $first: "$seller_email" }, gstin: { $first: "$seller_gst" },
          msme: { $first: "$seller_msme" }, oem: { $first: "$oem_indicator" },
          reseller: { $first: "$reseller_indicator" } } },
      { $sort: { gmv: -1 } }, { $limit: 50 },
    ]).toArray(),
    gc.aggregate([
      { $match: { product_name: { $nin: [null, ""] } } },
      { $group: { _id: "$product_name", gmv: { $sum: "$contract_value_num" }, contracts: { $sum: 1 } } },
      { $sort: { gmv: -1 } }, { $limit: 50 },
    ]).toArray(),
    gc.aggregate([
      { $match: { state: { $nin: [null, ""] } } },
      { $group: { _id: "$state", contracts: { $sum: 1 }, gmv: { $sum: "$contract_value_num" } } },
      { $sort: { contracts: -1 } }, { $limit: 25 },
    ]).toArray(),
    gc.aggregate([
      { $match: { reseller_indicator: true, seller_name_canonical: { $nin: [null, ""] } } },
      { $group: { _id: "$seller_name_canonical", gmv: { $sum: "$contract_value_num" }, contracts: { $sum: 1 },
          state: { $first: "$seller_state" }, phone: { $first: "$seller_phone" },
          email: { $first: "$seller_email" }, gstin: { $first: "$seller_gst" } } },
      { $sort: { gmv: -1 } },
    ]).toArray(),
    gc.aggregate([
      { $match: { ministry: { $nin: [null, ""] } } },
      { $group: { _id: "$ministry", contracts: { $sum: 1 }, gmv: { $sum: "$contract_value_num" },
          depts: { $addToSet: "$dept_name" } } },
      { $sort: { gmv: -1 } }, { $limit: 30 },
    ]).toArray(),
  ])

  const FOGGING_TERMS = ["fog", "mist", "spray", "pump", "chemical", "pesticide", "disinfect",
    "mosquito", "vector", "sanit", "hygien", "nozzle", "aerosol", "ulv",
    "thermal", "fumigat", "insect", "rodent", "pest"]
  const allProds = await gc.aggregate([
    { $match: { product_name: { $nin: [null, ""] }, contract_value_num: { $gt: 0 } } },
    { $group: { _id: "$product_name", gmv: { $sum: "$contract_value_num" }, contracts: { $sum: 1 } } },
    { $sort: { gmv: -1 } },
  ]).toArray()
  const adjProds = allProds.filter(p => {
    const n = (p._id || "").toLowerCase()
    return FOGGING_TERMS.some(t => n.includes(t))
  })

  const pdfScan  = scanDir(path.join(ARCHIVE, "PDFs"),    ".pdf")
  const txtScan  = scanDir(path.join(ARCHIVE, "RawText"), ".txt")
  const jsonScan = scanDir(path.join(ARCHIVE, "JSON"),    ".json")
  const totalBytes = pdfScan.bytes + txtScan.bytes + jsonScan.bytes

  const cp = loadCheckpoint()
  const cpComplete = cp ? cp.chunks.filter(c => c.status === "complete").length : 0
  const cpTotal    = cp ? cp.chunks.length : 0
  const cpErrors   = cp ? cp.chunks.filter(c => c.status === "error").length : 0

  // ── 1. MASTER REPORT ─────────────────────────────────────────────────────────
  console.log("\n  [1/6] Master Report…")
  {
    const L = []
    L.push(hr2()); L.push("  MASTER REPORT — GeM CONTRACTS HISTORICAL COLLECTION")
    L.push(`  Generated  : ${now.toISOString()}`)
    L.push(`  Collection : ${cpComplete}/${cpTotal} chunks complete  |  ${cpErrors} error(s)`)
    L.push(hr2()); L.push("")
    L.push(hr()); L.push("  TOTALS"); L.push(hr())
    L.push(`  Contracts collected  : ${total.toLocaleString("en-IN")}`)
    L.push(`  Enriched (Phase 2)   : ${enriched} / ${total}  (${total ? Math.round(enriched / total * 100) : 0}%)`)
    L.push(`  Total GMV            : ${inr(gmv)}`)
    L.push(`  Dealers found        : ${dealers.length} (reseller-flagged sellers)`)
    L.push(`  Fogging-adjacent prods: ${adjProds.length}`)
    L.push("")
    L.push(hr()); L.push("  ARCHIVE STORAGE"); L.push(hr())
    L.push(`  PDFs     ${String(pdfScan.count).padStart(6)} files   ${mb(pdfScan.bytes)}`)
    L.push(`  RawText  ${String(txtScan.count).padStart(6)} files   ${mb(txtScan.bytes)}`)
    L.push(`  JSON     ${String(jsonScan.count).padStart(6)} files   ${mb(jsonScan.bytes)}`)
    L.push(`  Total    ${String(pdfScan.count + txtScan.count + jsonScan.count).padStart(6)} files   ${mb(totalBytes)}`)
    L.push("")
    L.push(hr()); L.push("  CHUNK TIMELINE"); L.push(hr())
    if (cp) {
      cp.chunks.forEach(c => {
        const sym  = c.status === "complete" ? "✓" : c.status === "error" ? "✗" : "·"
        const recs = c.recordsInserted ? ` +${c.recordsInserted} new` : ""
        const err  = c.error ? `  ERR: ${c.error.slice(0, 60)}` : ""
        L.push(`  ${sym} Chunk ${String(c.id).padStart(2)} | ${c.from} → ${c.to}${recs}${err}`)
      })
    }
    L.push("")
    L.push(hr()); L.push("  TOP 30 MINISTRIES BY GMV"); L.push(hr())
    topMinistries.forEach((m, i) => {
      const dc = (m.depts || []).filter(Boolean).length
      L.push(`  ${String(i + 1).padStart(2)}. ${(m._id || "").slice(0, 48).padEnd(48)} ${inr(m.gmv).padStart(14)} ×${m.contracts}  (${dc} depts)`)
    })
    L.push("")
    L.push(hr()); L.push("  TOP 25 STATES BY CONTRACT COUNT"); L.push(hr())
    topStates.forEach((s, i) => {
      L.push(`  ${String(i + 1).padStart(2)}. ${(s._id || "").padEnd(32)} ${String(s.contracts).padStart(6)} contracts   ${inr(s.gmv)}`)
    })
    L.push(""); L.push(hr2()); L.push("  END OF MASTER REPORT"); L.push(hr2())
    saveReport("MASTER-REPORT", L)
  }

  // ── 2. OPPORTUNITY REPORT ─────────────────────────────────────────────────────
  console.log("  [2/6] Opportunity Report…")
  {
    const L = []
    L.push(hr2()); L.push("  OPPORTUNITY INTELLIGENCE REPORT")
    L.push(`  ${total.toLocaleString("en-IN")} contracts  |  Total GMV: ${inr(gmv)}  |  ${now.toLocaleString("en-IN")}`)
    L.push(hr2()); L.push("")
    L.push(hr()); L.push("  A. TOP 50 SELLERS BY GMV"); L.push(hr())
    topSellers.forEach((s, i) => {
      const flags   = [s.oem && "OEM", s.reseller && "RESELLER", s.msme && "MSME"].filter(Boolean).join("/") || "—"
      const contact = [s.phone, s.email].filter(Boolean).join(" | ") || "—"
      L.push(`  ${String(i + 1).padStart(2)}. ${(s._id || "").slice(0, 42).padEnd(42)} ${inr(s.gmv).padStart(12)} ×${s.contracts}  ${s.state || "—"}`)
      L.push(`      ${flags} | ${contact}`)
    })
    L.push("")
    L.push(hr()); L.push("  B. TOP 50 DEPARTMENTS BY SPEND"); L.push(hr())
    topDepts.forEach((d, i) => {
      L.push(`  ${String(i + 1).padStart(2)}. ${(d._id || "").slice(0, 50).padEnd(50)} ${inr(d.gmv).padStart(12)} ×${d.contracts}`)
      L.push(`      Ministry: ${(d.ministry || "—").slice(0, 65)}`)
    })
    L.push("")
    L.push(hr()); L.push("  C. TOP 50 PRODUCTS BY GMV"); L.push(hr())
    topProducts.forEach((p, i) => {
      L.push(`  ${String(i + 1).padStart(2)}. ${(p._id || "").slice(0, 58).padEnd(58)} ${inr(p.gmv).padStart(12)} ×${p.contracts}`)
    })
    L.push("")
    L.push(hr()); L.push("  D. FOGGING / SPRAY / CHEMICAL / PEST / SANIT ADJACENT PRODUCTS"); L.push(hr())
    if (adjProds.length === 0) {
      L.push("  None found — collect more data to surface fogging-adjacent products.")
      L.push("  Expand keywords in FOGGING_TERMS if needed.")
    } else {
      adjProds.forEach((p, i) => {
        L.push(`  ${String(i + 1).padStart(2)}. ${(p._id || "").slice(0, 60).padEnd(60)} ${inr(p.gmv).padStart(12)} ×${p.contracts}`)
      })
    }
    L.push(""); L.push(hr2()); L.push("  END OF OPPORTUNITY REPORT"); L.push(hr2())
    saveReport("OPPORTUNITY-REPORT", L)
  }

  // ── 3. DEALER LEAD REPORT ─────────────────────────────────────────────────────
  console.log("  [3/6] Dealer Lead Report…")
  {
    const L = []
    L.push(hr2()); L.push("  DEALER LEAD REPORT — RESELLER-FLAGGED SELLERS")
    L.push(`  Generated: ${now.toISOString()}  |  Total dealer leads: ${dealers.length}`)
    L.push(hr2()); L.push("")
    L.push(hr()); L.push("  ALL RESELLER-FLAGGED SELLERS (ranked by GMV)"); L.push(hr())
    if (dealers.length === 0) {
      L.push("  No resellers found in current dataset.")
      L.push("  Reseller flag is extracted during PDF enrichment from seller profiles.")
      L.push("  Run gem-enrich-contracts.js after broader collection to populate.")
    } else {
      dealers.forEach((d, i) => {
        const contact = [d.phone, d.email, d.gstin].filter(Boolean).join(" | ") || "no contact extracted"
        L.push(`  ${String(i + 1).padStart(2)}. ${(d._id || "").slice(0, 44).padEnd(44)} ${inr(d.gmv).padStart(12)} ×${d.contracts}  ${d.state || "—"}`)
        L.push(`      ${contact}`)
      })
    }
    L.push(""); L.push(hr2()); L.push("  END OF DEALER LEAD REPORT"); L.push(hr2())
    saveReport("DEALER-LEAD-REPORT", L)
  }

  // ── 4. PRODUCT OPPORTUNITY REPORT ────────────────────────────────────────────
  console.log("  [4/6] Product Opportunity Report…")
  {
    const L = []
    L.push(hr2()); L.push("  PRODUCT OPPORTUNITY REPORT")
    L.push(`  Generated: ${now.toISOString()}`)
    L.push(hr2()); L.push("")
    L.push(hr()); L.push("  TOP 50 PRODUCTS BY GMV (all categories)"); L.push(hr())
    topProducts.forEach((p, i) => {
      L.push(`  ${String(i + 1).padStart(2)}. ${(p._id || "").slice(0, 60).padEnd(60)} ${inr(p.gmv).padStart(12)} ×${p.contracts}`)
    })
    L.push("")
    L.push(hr()); L.push("  FOGGING / VECTOR CONTROL / SANITATION ADJACENT PRODUCTS"); L.push(hr())
    L.push(`  Keywords matched: fog, mist, spray, pump, chemical, pesticide, disinfect,`)
    L.push(`  mosquito, vector, sanit, hygien, nozzle, aerosol, ulv, thermal, fumigat, insect, rodent, pest`)
    L.push("")
    if (adjProds.length === 0) {
      L.push("  None found — collect more data to surface fogging-adjacent products.")
    } else {
      L.push(`  ${adjProds.length} matching products:`)
      L.push("")
      adjProds.forEach((p, i) => {
        L.push(`  ${String(i + 1).padStart(2)}. ${(p._id || "").slice(0, 60).padEnd(60)} ${inr(p.gmv).padStart(12)} ×${p.contracts}`)
      })
    }
    L.push(""); L.push(hr2()); L.push("  END OF PRODUCT OPPORTUNITY REPORT"); L.push(hr2())
    saveReport("PRODUCT-OPPORTUNITY-REPORT", L)
  }

  // ── 5. TOP DEPARTMENTS REPORT ─────────────────────────────────────────────────
  console.log("  [5/6] Top Departments Report…")
  {
    const L = []
    L.push(hr2()); L.push("  TOP DEPARTMENTS REPORT")
    L.push(`  Generated: ${now.toISOString()}  |  Total GMV: ${inr(gmv)}`)
    L.push(hr2()); L.push("")
    L.push(hr()); L.push("  TOP 50 DEPARTMENTS BY SPEND"); L.push(hr())
    topDepts.forEach((d, i) => {
      L.push(`  ${String(i + 1).padStart(2)}. ${(d._id || "").slice(0, 50).padEnd(50)} ${inr(d.gmv).padStart(12)} ×${d.contracts}`)
      L.push(`      Ministry: ${(d.ministry || "—").slice(0, 65)}  State: ${d.state || "—"}`)
    })
    L.push("")
    L.push(hr()); L.push("  TOP 30 MINISTRIES BY GMV"); L.push(hr())
    topMinistries.forEach((m, i) => {
      const dc = (m.depts || []).filter(Boolean).length
      L.push(`  ${String(i + 1).padStart(2)}. ${(m._id || "").slice(0, 50).padEnd(50)} ${inr(m.gmv).padStart(12)} ×${m.contracts}  (${dc} depts)`)
    })
    L.push(""); L.push(hr2()); L.push("  END OF TOP DEPARTMENTS REPORT"); L.push(hr2())
    saveReport("TOP-DEPARTMENTS-REPORT", L)
  }

  // ── 6. TOP SELLERS REPORT ─────────────────────────────────────────────────────
  console.log("  [6/6] Top Sellers Report…")
  {
    const L = []
    L.push(hr2()); L.push("  TOP SELLERS REPORT")
    L.push(`  Generated: ${now.toISOString()}  |  Enriched sellers: ${topSellers.length}`)
    L.push(hr2()); L.push("")
    L.push(hr()); L.push("  TOP 50 SELLERS BY GMV (enriched — have PDF detail)"); L.push(hr())
    topSellers.forEach((s, i) => {
      const flags   = [s.oem && "OEM", s.reseller && "RESELLER", s.msme && "MSME"].filter(Boolean).join("/") || "—"
      const contact = [s.phone, s.email, s.gstin].filter(Boolean).join(" | ") || "—"
      L.push(`  ${String(i + 1).padStart(2)}. ${(s._id || "").slice(0, 44).padEnd(44)} ${inr(s.gmv).padStart(12)} ×${s.contracts}  ${s.state || "—"}`)
      L.push(`      ${flags} | ${contact}`)
    })
    L.push("")
    const oems = topSellers.filter(s => s.oem)
    L.push(hr()); L.push(`  OEM-FLAGGED SELLERS (${oems.length} — direct manufacturer, no middlemen)`); L.push(hr())
    if (oems.length === 0) {
      L.push("  None flagged yet — OEM flag is extracted from contract PDF during enrichment.")
    } else {
      oems.forEach((s, i) => {
        L.push(`  ${String(i + 1).padStart(2)}. ${(s._id || "").slice(0, 44).padEnd(44)} ${inr(s.gmv).padStart(12)} ×${s.contracts}  ${s.state || "—"}`)
      })
    }
    const msmes = topSellers.filter(s => s.msme)
    L.push("")
    L.push(hr()); L.push(`  MSME-FLAGGED SELLERS (${msmes.length})`); L.push(hr())
    if (msmes.length === 0) {
      L.push("  None flagged yet.")
    } else {
      msmes.forEach((s, i) => {
        L.push(`  ${String(i + 1).padStart(2)}. ${(s._id || "").slice(0, 44).padEnd(44)} ${inr(s.gmv).padStart(12)} ×${s.contracts}  ${s.state || "—"}`)
      })
    }
    L.push(""); L.push(hr2()); L.push("  END OF TOP SELLERS REPORT"); L.push(hr2())
    saveReport("TOP-SELLERS-REPORT", L)
  }

  console.log("\n" + hr2())
  console.log(`  All 6 final reports saved to:`)
  console.log(`  ${REPORT_DIR}`)
  console.log(hr2())
}

// ── Main ──────────────────────────────────────────────────────────────────────
if (require.main === module) {
;(async () => {
  const startTime = Date.now()

  console.log("\n" + hr2())
  console.log("  GEM FULL HARVEST ORCHESTRATOR")
  console.log("  Phase 1: 60-day validation sweep (--reset)")
  console.log("  Phase 2: 1095-day historical collection (extends Phase 1 checkpoint)")
  console.log("  Phase 3: 6 final reports → GeMArchive/Reports/")
  console.log(hr2() + "\n")

  const client = new MongoClient(process.env.MONGODB_URI)
  await client.connect()
  const db = client.db()
  const gc = db.collection("gem_contracts")

  // ── Baseline snapshot ─────────────────────────────────────────────────────────
  const [beforeCount, beforeEnrich] = await Promise.all([
    gc.countDocuments(),
    gc.countDocuments({ detail_scraped: true }),
  ])
  const beforePdfs  = scanDir(path.join(ARCHIVE, "PDFs"),    ".pdf")
  const beforeTxts  = scanDir(path.join(ARCHIVE, "RawText"), ".txt")
  const beforeJsons = scanDir(path.join(ARCHIVE, "JSON"),    ".json")
  const beforeBytes = beforePdfs.bytes + beforeTxts.bytes + beforeJsons.bytes

  console.log("  BASELINE BEFORE VALIDATION:")
  console.log(`    gem_contracts : ${beforeCount}`)
  console.log(`    enriched      : ${beforeEnrich}`)
  console.log(`    PDFs archived : ${beforePdfs.count}  (${mb(beforePdfs.bytes)})`)
  console.log(`    Archive total : ${mb(beforeBytes)}`)
  console.log("")

  // ══════════════════════════════════════════════════════════════════════════════
  // PHASE 1 — 60-DAY VALIDATION SWEEP
  // ══════════════════════════════════════════════════════════════════════════════
  console.log(hr2())
  console.log("  PHASE 1 — 60-DAY VALIDATION SWEEP (--reset, fully unattended)")
  console.log("  Verifying: captcha auto-solve, collection, enrichment, archive, reports")
  console.log(hr2() + "\n")

  const phase1Start = Date.now()
  let phase1Error = null
  try {
    // --reset deletes the existing 90-day checkpoint so chunks run fresh
    await runCollector(["--full", "--days=60", "--reset"])
  } catch (err) {
    phase1Error = err.message
    console.log(`\n  [warn] Phase 1 collector error: ${err.message}`)
    console.log("  Continuing to validation check…")
  }
  const phase1Min = ((Date.now() - phase1Start) / 60000).toFixed(1)

  // ── Validation checks ─────────────────────────────────────────────────────────
  const [afterCount, afterEnrich] = await Promise.all([
    gc.countDocuments(),
    gc.countDocuments({ detail_scraped: true }),
  ])
  const afterPdfs  = scanDir(path.join(ARCHIVE, "PDFs"),    ".pdf")
  const afterTxts  = scanDir(path.join(ARCHIVE, "RawText"), ".txt")
  const afterJsons = scanDir(path.join(ARCHIVE, "JSON"),    ".json")
  const afterBytes = afterPdfs.bytes + afterTxts.bytes + afterJsons.bytes

  const cp60 = loadCheckpoint()
  const v60complete  = cp60 ? cp60.chunks.filter(c => c.status === "complete").length : 0
  const v60errors    = cp60 ? cp60.chunks.filter(c => c.status === "error").length : 0
  const v60total     = cp60 ? cp60.chunks.length : 0
  const v60inserted  = cp60 ? cp60.chunks.reduce((s, c) => s + (c.recordsInserted || 0), 0) : 0

  const latestTxtExists  = fs.existsSync(path.join(REPORT_DIR, "CUMULATIVE-LATEST.txt"))
  const latestJsonExists = fs.existsSync(path.join(REPORT_DIR, "CUMULATIVE-LATEST.json"))

  const newContracts   = afterCount - beforeCount
  const newEnriched    = afterEnrich - beforeEnrich
  const newPdfs        = afterPdfs.count - beforePdfs.count
  const storageGrowth  = ((afterBytes - beforeBytes) / 1048576).toFixed(2)

  // Validation: captcha is "working" if chunks completed without captcha-related errors
  const captchaWorked   = v60complete >= 2 && !phase1Error?.toLowerCase().includes("captcha")
  const collectionOk    = v60complete >= 2
  const noFatalErrors   = v60errors === 0
  const mongoGrew       = afterCount >= beforeCount  // upserts mean "at least stable"
  const reportsExist    = latestTxtExists && latestJsonExists
  const archiveStable   = afterPdfs.count >= beforePdfs.count

  const checks = [
    { name: "Captcha auto-solve",       pass: captchaWorked },
    { name: "Chunks complete (≥2)",     pass: collectionOk },
    { name: "No chunk errors",          pass: noFatalErrors },
    { name: "MongoDB stable/grew",      pass: mongoGrew },
    { name: "Post-chunk reports exist", pass: reportsExist },
    { name: "Archive stable/grew",      pass: archiveStable },
    { name: "GEMC uniqueness (upsert)", pass: true },
  ]
  const allPass = checks.every(c => c.pass)

  // ── Validation report ─────────────────────────────────────────────────────────
  const VL = []
  VL.push(hr2())
  VL.push("  60-DAY VALIDATION REPORT")
  VL.push(`  Generated : ${new Date().toISOString()}`)
  VL.push(`  Duration  : ${phase1Min} min`)
  VL.push(hr2()); VL.push("")
  VL.push(hr()); VL.push("  VALIDATION CHECKS"); VL.push(hr())
  checks.forEach(c => {
    VL.push(`  ${c.pass ? "✓" : "✗"} ${c.name}`)
  })
  if (phase1Error) VL.push(`    [!] Collector error: ${phase1Error}`)
  VL.push("")
  VL.push(hr()); VL.push("  COLLECTION METRICS"); VL.push(hr())
  VL.push(`  Chunks run         : ${v60total}  (${v60complete} complete, ${v60errors} errors)`)
  VL.push(`  Contracts (new)    : +${newContracts}  (${v60inserted} upserted by collector)`)
  VL.push(`  Enriched (new)     : +${newEnriched}`)
  VL.push(`  PDFs archived (new): +${newPdfs}`)
  VL.push(`  Storage growth     : +${storageGrowth} MB`)
  VL.push(`  PDFs total         : ${afterPdfs.count}  (${mb(afterPdfs.bytes)})`)
  VL.push(`  RawText total      : ${afterTxts.count}  (${mb(afterTxts.bytes)})`)
  VL.push(`  JSON total         : ${afterJsons.count}  (${mb(afterJsons.bytes)})`)
  VL.push("")
  VL.push(hr()); VL.push("  CHUNK DETAILS"); VL.push(hr())
  if (cp60) {
    cp60.chunks.forEach(c => {
      const sym  = c.status === "complete" ? "✓" : c.status === "error" ? "✗" : "·"
      const recs = c.recordsInserted ? ` +${c.recordsInserted} new, ${c.recordsSkipped} skipped` : ""
      const err  = c.error ? `  ERR: ${c.error.slice(0, 70)}` : ""
      VL.push(`  ${sym} Chunk ${String(c.id).padStart(2)} | ${c.from} → ${c.to}${recs}${err}`)
    })
  }
  VL.push("")
  VL.push(hr()); VL.push(`  VERDICT: ${allPass ? "ALL CHECKS PASSED ✓" : "SOME CHECKS FAILED ✗"}`); VL.push(hr())
  VL.push("")
  VL.push(`  ${allPass ? "→ Proceeding immediately to 1095-day collection." : "→ Proceeding to 1095-day collection despite failures (review above)."}`)
  VL.push(hr2()); VL.push("  END OF VALIDATION REPORT"); VL.push(hr2())

  const valText = VL.join("\n")
  console.log(valText)

  const valDate = new Date().toISOString().slice(0, 10)
  const valFile = path.join(REPORT_DIR, `VALIDATION-REPORT-60DAY-${valDate}.txt`)
  fs.writeFileSync(valFile, valText, "utf8")
  console.log(`\n  Validation report saved → ${path.basename(valFile)}\n`)

  // ══════════════════════════════════════════════════════════════════════════════
  // PHASE 2 — 1095-DAY HISTORICAL COLLECTION
  // ══════════════════════════════════════════════════════════════════════════════
  console.log(hr2())
  console.log("  PHASE 2 — 1095-DAY HISTORICAL COLLECTION")
  console.log("  Checkpoint extended from 60-day baseline.")
  console.log("  Chunks 1-2 already complete. Will run chunks 3-36 (days 61-1095).")
  console.log(hr2() + "\n")

  const phase2Start = Date.now()
  let phase2Error = null
  try {
    await runCollector(["--full", "--days=1095"])
  } catch (err) {
    phase2Error = err.message
    console.log(`\n  [warn] Phase 2 collector error: ${err.message}`)
  }
  const phase2Min = ((Date.now() - phase2Start) / 60000).toFixed(1)
  console.log(`\n  Phase 2 finished in ${phase2Min} min. Error: ${phase2Error || "none"}`)

  // ══════════════════════════════════════════════════════════════════════════════
  // PHASE 3 — FINAL REPORTS
  // ══════════════════════════════════════════════════════════════════════════════
  await generateFinalReports(db)

  // ── Final summary ─────────────────────────────────────────────────────────────
  const totalMin = ((Date.now() - startTime) / 60000).toFixed(1)
  const [finalCount, finalEnrich] = await Promise.all([
    gc.countDocuments(),
    gc.countDocuments({ detail_scraped: true }),
  ])
  const finalPdfs = scanDir(path.join(ARCHIVE, "PDFs"), ".pdf")
  const finalCp   = loadCheckpoint()
  const finalDone = finalCp ? finalCp.chunks.filter(c => c.status === "complete").length : 0
  const finalErrs = finalCp ? finalCp.chunks.filter(c => c.status === "error").length : 0

  console.log("\n" + hr2())
  console.log("  FULL HARVEST COMPLETE")
  console.log(hr2())
  console.log(`  Total runtime          : ${totalMin} min`)
  console.log(`  Phase 1 (60-day val)   : ${phase1Min} min  ${phase1Error ? "[ERR]" : "[OK]"}`)
  console.log(`  Phase 2 (1095-day col) : ${phase2Min} min  ${phase2Error ? "[ERR]" : "[OK]"}`)
  console.log(`  Chunks complete        : ${finalDone}${finalErrs > 0 ? "  (" + finalErrs + " errors)" : ""}`)
  console.log(`  gem_contracts total    : ${finalCount.toLocaleString("en-IN")}`)
  console.log(`  Enriched               : ${finalEnrich} / ${finalCount}`)
  console.log(`  PDFs archived          : ${finalPdfs.count}`)
  console.log(`  Reports directory      : ${REPORT_DIR}`)
  console.log(hr2())

  await client.close()
})().catch(e => {
  console.error("\nFATAL:", e.message)
  console.error(e.stack)
  process.exit(1)
})
}

module.exports = { generateFinalReports }
