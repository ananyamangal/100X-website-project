#!/usr/bin/env node
/**
 * gem-migrate-archive.js
 *
 * One-time migration: moves existing enrichment files from audit/enrichment/
 * to the OneDrive GeMArchive, creates JSON intelligence files, and updates
 * MongoDB with new archive paths and pdf_hash values.
 *
 * Safe to re-run: skips files already at destination; skips records already updated.
 *
 * Usage:
 *   node scripts/gem-migrate-archive.js [--dry-run]
 */

;(function loadEnv() {
  const fs = require("fs"), path = require("path")
  const lines = fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8").split("\n")
  for (const line of lines) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) process.env[m[1].trim()] = m[2].trim()
  }
})()

const fs     = require("fs")
const path   = require("path")
const crypto = require("crypto")
const { MongoClient } = require("mongodb")

const DRY_RUN = process.argv.includes("--dry-run")

// ── Paths ──────────────────────────────────────────────────────────────────────
const ARCHIVE_ROOT = process.env.GEM_ARCHIVE_ROOT ||
  path.join("F:", "OneDrive", "Data", "SULABH2018", "E drive", "GeMArchive")

const DEST_PDF  = path.join(ARCHIVE_ROOT, "PDFs")
const DEST_TEXT = path.join(ARCHIVE_ROOT, "RawText")
const DEST_JSON = path.join(ARCHIVE_ROOT, "JSON")

const SRC_PDF  = path.join(process.cwd(), "audit", "enrichment", "pdfs")
const SRC_TEXT = path.join(process.cwd(), "audit", "enrichment", "text")

function slug(id) { return id.replace(/[^A-Z0-9]/g, "_") }
function sha256(buf) { return crypto.createHash("sha256").update(buf).digest("hex") }

function copyIfMissing(src, dest) {
  if (!fs.existsSync(src)) return "no-src"
  if (fs.existsSync(dest)) return "exists"
  if (!DRY_RUN) fs.copyFileSync(src, dest)
  return "copied"
}

async function run() {
  // Ensure destination dirs exist
  for (const d of [DEST_PDF, DEST_TEXT, DEST_JSON]) {
    if (!DRY_RUN) fs.mkdirSync(d, { recursive: true })
  }

  const client = new MongoClient(process.env.MONGODB_URI)
  await client.connect()
  const db = client.db()
  const gc = db.collection("gem_contracts")

  // Load all enriched contracts
  const contracts = await gc.find(
    { detail_scraped: true },
    { projection: {
      gemc_no: 1, seller_name_raw: 1, seller_name_canonical: 1,
      seller_phone: 1, seller_email: 1, seller_gst: 1, seller_state: 1,
      seller_address: 1, seller_msme_category: 1, seller_gem_id: 1,
      buyer_name: 1, buyer_dept: 1, buyer_ministry: 1,
      buyer_state: 1, buyer_address: 1, buyer_contact: 1, buyer_email: 1,
      dept_name: 1, ministry: 1, state: 1,
      consignee_name: 1, consignee_address: 1,
      contract_value_num: 1, contract_value_pdf: 1,
      unit_rate: 1, quantity: 1, delivery_start: 1, delivery_end: 1,
      payment_mode: 1,
      product_name: 1, product_desc: 1, oem_brand: 1, model: 1,
      category_name: 1, country_of_origin: 1, catalogue_status: 1,
      selling_as: 1, oem_name: 1, oem_indicator: 1,
      reseller_indicator: 1, manufacturer_indicator: 1,
      extraction_confidence: 1, enrichment_timestamp: 1,
      pdf_path: 1, pdf_hash: 1, pdf_size_bytes: 1,
    } }
  ).toArray()

  console.log(`\n${"═".repeat(70)}`)
  console.log(`  GEM ARCHIVE MIGRATION ${DRY_RUN ? "[DRY RUN]" : "(LIVE)"}`)
  console.log(`  Source  : ${SRC_PDF}`)
  console.log(`  Dest    : ${ARCHIVE_ROOT}`)
  console.log(`  Records : ${contracts.length} enriched contracts`)
  console.log(`${"═".repeat(70)}\n`)

  const stats = { pdf: { copied:0, exists:0, missing:0 }, text: { copied:0, exists:0, missing:0 }, json: { created:0, exists:0 }, mongo: { updated:0, skipped:0 } }

  for (const c of contracts) {
    const s    = slug(c.gemc_no)
    const srcPdf  = path.join(SRC_PDF,  `${s}.pdf`)
    const srcText = path.join(SRC_TEXT, `${s}.txt`)
    const dstPdf  = path.join(DEST_PDF,  `${s}.pdf`)
    const dstText = path.join(DEST_TEXT, `${s}.txt`)
    const dstJson = path.join(DEST_JSON, `${s}.json`)

    // ── Move PDF ────────────────────────────────────────────────────────────
    const pdfResult = copyIfMissing(srcPdf, dstPdf)
    if (pdfResult === "copied")  stats.pdf.copied++
    if (pdfResult === "exists")  stats.pdf.exists++
    if (pdfResult === "no-src")  { stats.pdf.missing++; console.log(`  WARN: PDF missing for ${c.gemc_no}`) }

    // ── Move text ───────────────────────────────────────────────────────────
    const txtResult = copyIfMissing(srcText, dstText)
    if (txtResult === "copied") stats.text.copied++
    if (txtResult === "exists") stats.text.exists++
    if (txtResult === "no-src") stats.text.missing++

    // ── Compute hash ────────────────────────────────────────────────────────
    let pdfHash = c.pdf_hash || null
    let pdfSize = c.pdf_size_bytes || null
    const hashSrc = fs.existsSync(dstPdf) ? dstPdf : (fs.existsSync(srcPdf) ? srcPdf : null)
    if (hashSrc && !pdfHash) {
      const buf  = fs.readFileSync(hashSrc)
      pdfHash = sha256(buf)
      pdfSize = buf.length
    }

    // ── Write JSON intelligence ─────────────────────────────────────────────
    if (!fs.existsSync(dstJson)) {
      const obj = {
        gemc_no:             c.gemc_no,
        migrated_at:         new Date().toISOString(),
        extraction_confidence: c.extraction_confidence,
        pdf_path:            dstPdf,
        pdf_hash:            pdfHash,
        pdf_size_bytes:      pdfSize,
        seller_name:         c.seller_name_raw,
        seller_canonical:    c.seller_name_canonical,
        seller_phone:        c.seller_phone,
        seller_email:        c.seller_email,
        seller_gstin:        c.seller_gst,
        seller_state:        c.seller_state,
        seller_address:      c.seller_address,
        seller_msme:         c.seller_msme_category,
        seller_gem_id:       c.seller_gem_id,
        buyer_name:          c.buyer_name,
        buyer_dept:          c.dept_name || c.buyer_dept,
        buyer_ministry:      c.ministry  || c.buyer_ministry,
        buyer_state:         c.state     || c.buyer_state,
        buyer_address:       c.buyer_address,
        buyer_contact:       c.buyer_contact,
        buyer_email:         c.buyer_email,
        consignee_name:      c.consignee_name,
        consignee_address:   c.consignee_address,
        contract_value_num:  c.contract_value_num,
        contract_value_pdf:  c.contract_value_pdf,
        unit_rate:           c.unit_rate,
        quantity:            c.quantity,
        delivery_start:      c.delivery_start,
        delivery_end:        c.delivery_end,
        payment_mode:        c.payment_mode,
        product_name:        c.product_name,
        product_desc:        c.product_desc,
        oem_brand:           c.oem_brand,
        model:               c.model,
        category_name:       c.category_name,
        country_of_origin:   c.country_of_origin,
        catalogue_status:    c.catalogue_status,
        selling_as:          c.selling_as,
        oem_name:            c.oem_name,
        oem_indicator:       c.oem_indicator,
        reseller_indicator:  c.reseller_indicator,
        manufacturer_indicator: c.manufacturer_indicator,
      }
      if (!DRY_RUN) fs.writeFileSync(dstJson, JSON.stringify(obj, null, 2), "utf8")
      stats.json.created++
    } else {
      stats.json.exists++
    }

    // ── Update MongoDB: paths + hash ────────────────────────────────────────
    const needsUpdate = !c.pdf_hash || !c.pdf_path?.includes("GeMArchive")
    if (needsUpdate) {
      if (!DRY_RUN) {
        await gc.updateOne(
          { gemc_no: c.gemc_no },
          { $set: {
            pdf_path:      dstPdf,
            text_path:     dstText,
            json_path:     dstJson,
            pdf_hash:      pdfHash,
            pdf_size_bytes: pdfSize,
          } }
        )
      }
      stats.mongo.updated++
    } else {
      stats.mongo.skipped++
    }
  }

  // ── Report ──────────────────────────────────────────────────────────────────
  console.log(`\n${"─".repeat(70)}`)
  console.log("  MIGRATION RESULTS" + (DRY_RUN ? " [DRY RUN — no writes]" : ""))
  console.log(`${"─".repeat(70)}`)
  console.log(`  PDFs     : ${stats.pdf.copied} copied  |  ${stats.pdf.exists} already at dest  |  ${stats.pdf.missing} missing from source`)
  console.log(`  RawText  : ${stats.text.copied} copied  |  ${stats.text.exists} already at dest  |  ${stats.text.missing} missing from source`)
  console.log(`  JSON     : ${stats.json.created} created  |  ${stats.json.exists} already at dest`)
  console.log(`  MongoDB  : ${stats.mongo.updated} records updated  |  ${stats.mongo.skipped} already current`)

  if (!DRY_RUN && (stats.pdf.copied > 0 || stats.text.copied > 0)) {
    console.log(`\n  ✓ Files copied to OneDrive. Original files in audit/enrichment/ are`)
    console.log(`    preserved — delete them manually once OneDrive sync is confirmed.`)
    console.log(`    Command: Remove-Item -Recurse "audit/enrichment"`)
  }

  await client.close()
}

run().catch(e => { console.error("\nFATAL:", e.message); process.exit(1) })
