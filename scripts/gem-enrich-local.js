#!/usr/bin/env node
/**
 * gem-enrich-local.js
 *
 * Enriches contracts whose PDFs already exist in the OneDrive archive.
 * No browser. No network. No captcha.
 * Reads each PDF from GeMArchive/PDFs/, parses text, extracts fields,
 * writes to MongoDB and GeMArchive/RawText/ + GeMArchive/JSON/.
 *
 * Usage:
 *   node scripts/gem-enrich-local.js              # all pending with local PDF
 *   node scripts/gem-enrich-local.js --force       # re-process even if detail_scraped=true
 *   node scripts/gem-enrich-local.js --limit 10    # cap at N contracts
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
const pdfParse = require("pdf-parse")

const ARCHIVE_ROOT = process.env.GEM_ARCHIVE_ROOT ||
  path.join("F:", "OneDrive", "Data", "SULABH2018", "E drive", "GeMArchive")

const PDF_DIR  = path.join(ARCHIVE_ROOT, "PDFs")
const TEXT_DIR = path.join(ARCHIVE_ROOT, "RawText")
const JSON_DIR = path.join(ARCHIVE_ROOT, "JSON")

for (const d of [PDF_DIR, TEXT_DIR, JSON_DIR]) fs.mkdirSync(d, { recursive: true })

const FORCE = process.argv.includes("--force")
const args  = process.argv.slice(2)
const limIdx = args.indexOf("--limit")
const LIMIT  = limIdx >= 0 ? parseInt(args[limIdx + 1]) : Infinity

const EXTRACTION_VERSION = 1

function slug(id)   { return id.replace(/[^A-Z0-9]/g, "_") }
function sha256(buf){ return crypto.createHash("sha256").update(buf).digest("hex") }
function fmtInr(n)  {
  if (!n) return "(null)"
  if (n >= 1e7) return "₹" + (n/1e7).toFixed(2) + " Cr"
  if (n >= 1e5) return "₹" + (n/1e5).toFixed(1) + " L"
  return "₹" + n.toLocaleString()
}

// ── Field extraction (copied from gem-enrich-contracts.js) ───────────────────
const STATES_LONG = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chandigarh","Chhattisgarh",
  "Dadra and Nagar Haveli","Daman and Diu","Delhi","Goa","Gujarat","Haryana",
  "Himachal Pradesh","Jammu and Kashmir","Jharkhand","Karnataka","Kerala","Ladakh",
  "Lakshadweep","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram",
  "Nagaland","Odisha","Puducherry","Punjab","Rajasthan","Sikkim","Tamil Nadu",
  "Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
].sort((a, b) => b.length - a.length)

function detectState(text) {
  for (const s of STATES_LONG) {
    if (new RegExp("\\b" + s + "\\b", "i").test(text)) return s
  }
  return null
}

function extractGstin(text) {
  const m = text.match(/\b([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z])\b/i)
  return m ? m[1].toUpperCase() : null
}

function extractPin(text) {
  const m = text.match(/\b([1-9][0-9]{5})\b/)
  return m ? m[1] : null
}

function extractPhone(text) {
  if (!text) return null
  let m = text.match(/\b(?:\+91[-\s]?|0)?([6-9]\d{9})\b/)
  if (m) return m[1]
  const stripped = text.replace(/[\s\-.()]/g, "")
  m = stripped.match(/(?:\+91|91|0)?([6-9]\d{9})/)
  return m ? m[1] : null
}

function extractEmail(text) {
  if (!text) return null
  const m = text.match(/\b([A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,})\b/)
  return m ? m[1].toLowerCase() : null
}

function parseNum(s) {
  if (!s) return null
  const n = Number(String(s).replace(/[₹,\s]/g, "").trim())
  return isNaN(n) ? null : n
}

const MONTHS = { Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12 }

function parseDateStr(s) {
  if (!s) return null
  let m = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/)
  if (m) {
    const mon = MONTHS[m[2][0].toUpperCase() + m[2].slice(1).toLowerCase()]
    if (mon) return new Date(`${m[3]}-${String(mon).padStart(2,"0")}-${m[1].padStart(2,"0")}`)
  }
  m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (m) return new Date(`${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`)
  const iso = new Date(s)
  return isNaN(iso) ? null : iso
}

const SCORED_FIELDS = [
  "seller_name","seller_gstin","seller_phone","seller_address","seller_state",
  "buyer_name","buyer_ministry","buyer_dept",
  "consignee_name","consignee_address",
  "contract_value_pdf","unit_price","delivery_start",
  "oem_name","country_of_origin",
]

function extractFields(rawText) {
  const t = rawText.replace(/\r/g, "").replace(/[ \t]+/g, " ")

  function sectionIdx(...markers) {
    let best = -1
    for (const m of markers) {
      const i = t.indexOf(m + "|" + m)
      if (i >= 0 && (best < 0 || i < best)) best = i
      const j = t.indexOf(m)
      if (j >= 0 && (best < 0 || j < best)) best = j
    }
    return best
  }

  const iOrg       = sectionIdx("Organisation Details")
  const iBuyer     = sectionIdx("Buyer Details")
  const iSeller    = Math.max(sectionIdx("Seller Details"), sectionIdx("Service Provider Details"))
  const iProduct   = Math.max(sectionIdx("Product Details"), sectionIdx("Service Details"))
  const iConsignee = Math.max(sectionIdx("Consignee Detail"), sectionIdx("Consignee Details"))

  function cut(from, ...ends) {
    if (from < 0) return ""
    let end = t.length
    for (const e of ends) { if (e > from && e < end) end = e }
    return t.slice(from, end)
  }

  const orgSec       = cut(iOrg,      iBuyer >= 0 ? iBuyer : t.length)
  const buyerSec     = cut(iBuyer,    iSeller >= 0 ? iSeller : t.length, iConsignee > iBuyer ? iConsignee : t.length)
  const sellerSec    = cut(iSeller,   iProduct  > iSeller   ? iProduct  : t.length, iConsignee > iSeller  ? iConsignee : t.length)
  const consigneeSec = cut(iConsignee,iSeller  > iConsignee ? iSeller  : t.length, iProduct   > iConsignee ? iProduct   : t.length)

  function lbl(text, ...labels) {
    for (const label of labels) {
      const esc = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      const rx  = new RegExp(esc + "\\s*:?\\s*([^\\n|]{1,200})", "gi")
      let last  = null
      for (const m of text.matchAll(rx)) {
        const v = m[1].trim()
        if (v && v !== "-" && v !== "--" && v !== "N/A" && v !== "NA") last = v
      }
      if (last) return last
    }
    return null
  }

  function extractAddr(section) {
    const m = section.match(/\bAddress\s*:\s*([^\n]*)\n?((?:[^\n]+\n){0,4})/)
    if (!m) return null
    const inline = m[1].trim()
    const lines  = m[2] ? m[2].split("\n").map(l => l.trim()).filter(l => l && !/^[^\x00-\x7F]/.test(l)) : []
    const all    = [...(inline ? [inline] : []), ...lines]
    const idx    = all.findIndex((l, i) => i > 0 && /(India\b|\d{6})/i.test(l))
    const keep   = idx >= 0 ? all.slice(0, idx + 1) : all
    return keep.join(", ").replace(/,\s*,/g, ",").trim() || null
  }

  const seller_gem_id          = lbl(sellerSec, "GeM Seller ID")
  const seller_name            = lbl(sellerSec, "Company Name")
  const seller_gstin           = extractGstin(sellerSec) || extractGstin(t)
  const seller_phone           = extractPhone(lbl(sellerSec, "Contact No.") || "") ||
                                 extractPhone((sellerSec.match(/Contact No\.\s*:([^\n]{0,30})/) || [])[1] || "")
  const seller_email           = extractEmail(lbl(sellerSec, "Email ID") || "") ||
                                 extractEmail(sellerSec.slice(0, 800))
  const seller_msme_number     = lbl(sellerSec, "MSME Registration number", "MSME Reg. No.")
  const seller_msme_category   = lbl(sellerSec, "MSE Social Category", "MSME Category", "MSME Type")
  const seller_gender_category = lbl(sellerSec, "MSE Gender", "MSE Gender Category")
  const seller_address         = extractAddr(sellerSec)
  const seller_pincode         = extractPin(seller_address || sellerSec)
  const seller_state           = detectState(seller_address || sellerSec.slice(0, 600))

  const buyer_ministry    = lbl(orgSec,   "Ministry")
  const buyer_dept        = lbl(orgSec,   "Department")
  const buyer_name        = lbl(orgSec,   "Organisation Name") || buyer_dept || null
  const buyer_designation = lbl(buyerSec, "Designation") || lbl(t, "Designation")
  const buyer_contact     = extractPhone(lbl(buyerSec, "Contact No.") || "")
  const buyer_email       = extractEmail(lbl(buyerSec, "Email ID") || "")
  const buyer_address     = extractAddr(buyerSec)
  const buyer_state       = detectState(buyer_address || buyer_dept || buyer_ministry || "")

  const consignee_name    = lbl(consigneeSec, "Consignee Name") || null
  const consignee_address = extractAddr(consigneeSec)

  const contract_value_pdf = (() => {
    const m = t.match(/Total Order Value \(in INR\)([\d,.]+)/i)
           || t.match(/Total Contract Value Including All Duties and Taxes\(INR\)([\d,.]+)/i)
           || t.match(/Total Value Including Addons\(INR\)([\d,.]+)/i)
           || t.match(/Total Value without Addons\(INR\)([\d,.]+)/i)
    if (!m) return null
    const raw = m[1].replace(/,/g, "")
    if (raw.indexOf(".") < 0) {
      const len = raw.length
      if (len % 2 === 0) {
        const half = len / 2
        if (raw.slice(0, half) === raw.slice(half)) return parseFloat(raw.slice(0, half))
      }
      return parseFloat(raw)
    }
    const parts = raw.split(".")
    if (parts.length === 3) return parseFloat(parts[0] + "." + parts[2])
    return parseFloat(raw)
  })()

  const payment_mode = lbl(t, "Payment Mode")

  const _pickDate = (s) => {
    if (!s) return null
    const m = s.match(/(\d{1,2}-[A-Za-z]{3}-\d{4}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/)
    return m ? parseDateStr(m[1]) : null
  }
  let delivery_start = _pickDate(lbl(t, "Service Start Date (latest by)", "Delivery Start Date", "Delivery Start After"))
  let delivery_end   = _pickDate(lbl(t, "Service End Date", "Delivery End Date", "Delivery To Be Completed By"))

  if (!delivery_start || !delivery_end) {
    const dm = consigneeSec.match(/(\d{2}-[A-Z][a-z]{2}-\d{4})(\d{2}-[A-Z][a-z]{2}-\d{4})/)
    if (dm) {
      if (!delivery_start) delivery_start = parseDateStr(dm[1])
      if (!delivery_end)   delivery_end   = parseDateStr(dm[2])
    }
  }

  const product_name_pdf = (() => {
    const all  = [...t.matchAll(/Product Name\s*:?\s*([^\n|]{3,200})/gi)]
    const vals = all.map(m => m[1].trim()).filter(v => v.length > 3 && v !== "-")
    return vals[vals.length - 1] || null
  })()

  const brand = (() => {
    const all  = [...t.matchAll(/\bBrand\s*:\s*([^\n|]{2,80})/gi)]
    const vals = all.map(m => m[1].trim()).filter(v => v.length > 1 && !/^(Type|Registered|Unregistered|NA|-)/i.test(v))
    return vals[0] || null
  })()

  const model = (() => {
    const all  = [...t.matchAll(/Model:\s*([^\n|]{2,80})/gi)]
    const vals = all.map(m => m[1].trim()).filter(v => v.length > 1 && v !== "-")
    return vals[vals.length - 1] || null
  })()

  const category = (() => {
    const m = t.match(/Category Name & Quadrant\s*:?\s*\|[^|]*\|\s*([^\n]{3,150})/i)
           || t.match(/Category Name\s*:\s*\|[^|]*\|\s*([^\n]{3,100})/i)
    return m ? m[1].trim() : lbl(t, "Category Name")
  })()

  const country_of_origin = (() => {
    const all  = [...t.matchAll(/Country Of Origin\s*:?\s*([^\n|]{2,40})/gi)]
    const vals = all.map(m => m[1].trim()).filter(v => v.length > 1 && v !== "-")
    return vals[vals.length - 1] || null
  })()

  const catalogue_status = (() => {
    const all  = [...t.matchAll(/Catalogue Status\s*:?\s*([^\n|]{3,80})/gi)]
    const vals = all.map(m => m[1].trim()).filter(v => v.length > 2 && v !== "-")
    return vals[vals.length - 1] || null
  })()

  const selling_as = (() => {
    const all  = [...t.matchAll(/Selling As\s*:?\s*([^\n|]{3,60})/gi)]
    const vals = all.map(m => m[1].trim()).filter(v => v.length > 2)
    return vals[vals.length - 1] || null
  })()

  const oem_name = (() => {
    if (selling_as && /OEM/i.test(selling_as) && brand) return brand
    const m = t.match(/OEM\s*(?:Name|Manufacturer)\s*:\s*([^\n|]{3,80})/i)
    return m ? m[1].trim() : (brand || null)
  })()
  const oem_indicator          = /\bOEM\b/i.test(t)
  const reseller_indicator     = /\b(Reseller|Dealer|Distributor)\b/i.test(t)
  const manufacturer_indicator = /\b(Manufacturer|Manufacturing)\b/i.test(t)

  const result = {
    seller_name, seller_gem_id, seller_phone, seller_email, seller_gstin,
    seller_msme_number, seller_msme_category, seller_gender_category,
    seller_address, seller_city: null, seller_district: null,
    seller_state, seller_pincode,
    buyer_name, buyer_ministry, buyer_dept, buyer_designation,
    buyer_contact, buyer_email, buyer_address, buyer_state, buyer_district: null,
    consignee_name, consignee_address,
    contract_value_pdf, unit_price: null, quantity_pdf: null,
    delivery_start, delivery_end, payment_mode,
    product_name_pdf, brand, model, category,
    country_of_origin, catalogue_status, selling_as,
    oem_name, oem_indicator, reseller_indicator, manufacturer_indicator,
  }

  const found      = SCORED_FIELDS.filter(f => result[f] !== null && result[f] !== undefined).length
  const confidence = Math.round((found / SCORED_FIELDS.length) * 100)
  return { fields: result, confidence, found, total: SCORED_FIELDS.length }
}

// ── Main ─────────────────────────────────────────────────────────────────────
;(async () => {
  const client = new MongoClient(process.env.MONGODB_URI)
  await client.connect()
  const db = client.db()
  const gc = db.collection("gem_contracts")

  const query = FORCE
    ? { pdf_path: { $regex: "GeMArchive" } }
    : { detail_scraped: { $ne: true } }

  const all = await gc.find(query, {
    projection: { gemc_no: 1, contract_value_num: 1, product_name: 1, dept_name: 1, buyer_designation: 1, unit_rate: 1, quantity: 1, oem_brand: 1, category_name: 1 }
  }).sort({ contract_value_num: -1 }).limit(LIMIT === Infinity ? 0 : LIMIT).toArray()

  // Filter to those with PDF on disk
  const withPdf = all.filter(c => {
    const p = path.join(PDF_DIR, slug(c.gemc_no) + ".pdf")
    return fs.existsSync(p)
  })
  const noPdf   = all.length - withPdf.length

  console.log("\n" + "═".repeat(70))
  console.log("  Phase 2A — Local Enrichment (archive PDFs, no browser)")
  console.log("═".repeat(70))
  console.log("  Queue total        : " + all.length)
  console.log("  With local PDF     : " + withPdf.length)
  console.log("  Missing PDF (skip) : " + noPdf)
  console.log("  Archive            : " + ARCHIVE_ROOT)
  console.log("═".repeat(70))

  if (withPdf.length === 0) {
    console.log("\n  Nothing to enrich — all contracts either done or missing local PDFs.")
    await client.close()
    return
  }

  let enriched = 0, failed = 0
  const startTime = Date.now()

  for (const contract of withPdf) {
    const { gemc_no } = contract
    const s       = slug(gemc_no)
    const pdfPath  = path.join(PDF_DIR,  s + ".pdf")
    const textPath = path.join(TEXT_DIR, s + ".txt")
    const jsonPath = path.join(JSON_DIR, s + ".json")
    const now      = new Date()

    const elapsed = (Date.now() - startTime) / 1000
    const done    = enriched + failed
    const rate    = done > 1 ? Math.round(done / (elapsed / 3600)) : "—"
    process.stdout.write(`  [${done + 1}/${withPdf.length}] ${gemc_no}  ${fmtInr(contract.contract_value_num)}  rate:${rate}/hr\r`)

    try {
      const pdfBuf  = fs.readFileSync(pdfPath)
      const pdfSize = pdfBuf.length
      const pdfHash = sha256(pdfBuf)

      const pdfData = await pdfParse(pdfBuf, { max: 0 })
      fs.writeFileSync(textPath, pdfData.text, "utf8")

      const { fields, confidence } = extractFields(pdfData.text)

      const intel = {
        gemc_no, extracted_at: now.toISOString(), confidence,
        pdf_path: pdfPath, pdf_hash: pdfHash, pdf_size_bytes: pdfSize,
        ...fields,
      }
      fs.writeFileSync(jsonPath, JSON.stringify(intel, null, 2), "utf8")

      await gc.updateOne(
        { gemc_no },
        {
          $set: {
            enrichment_attempts:   1,
            enrichment_timestamp:  now,
            extraction_version:    EXTRACTION_VERSION,
            seller_name_raw:       fields.seller_name,
            seller_name_canonical: fields.seller_name
              ? fields.seller_name.toUpperCase().replace(/\s+/g, " ").trim()
              : null,
            seller_gem_id:         fields.seller_gem_id,
            seller_phone:          fields.seller_phone,
            seller_email:          fields.seller_email,
            seller_gst:            fields.seller_gstin,
            seller_msme:           fields.seller_msme_category || (fields.seller_msme_number ? "yes" : null),
            seller_msme_number:    fields.seller_msme_number,
            seller_msme_category:  fields.seller_msme_category,
            seller_gender_category: fields.seller_gender_category,
            seller_address:        fields.seller_address,
            seller_city:           null,
            seller_district:       null,
            seller_state:          fields.seller_state,
            seller_pincode:        fields.seller_pincode,
            buyer_name:            fields.buyer_name,
            buyer_designation:     fields.buyer_designation || contract.buyer_designation,
            buyer_contact:         fields.buyer_contact,
            buyer_email:           fields.buyer_email,
            buyer_address:         fields.buyer_address,
            buyer_state:           fields.buyer_state,
            buyer_district:        null,
            consignee_name:        fields.consignee_name,
            consignee_address:     fields.consignee_address,
            contract_value_pdf:    fields.contract_value_pdf,
            unit_rate:             fields.unit_price || contract.unit_rate,
            quantity:              fields.quantity_pdf || contract.quantity,
            delivery_start:        fields.delivery_start,
            delivery_end:          fields.delivery_end,
            payment_mode:          fields.payment_mode,
            product_desc:          fields.product_name_pdf,
            oem_brand:             fields.brand || contract.oem_brand,
            model:                 fields.model,
            category_name:         fields.category || contract.category_name,
            country_of_origin:     fields.country_of_origin,
            catalogue_status:      fields.catalogue_status,
            selling_as:            fields.selling_as,
            oem_name:              fields.oem_name,
            oem_indicator:         fields.oem_indicator,
            reseller_indicator:    fields.reseller_indicator,
            manufacturer_indicator: fields.manufacturer_indicator,
            detail_scraped:        true,
            pdf_downloaded:        true,
            pdf_path:              pdfPath,
            pdf_hash:              pdfHash,
            pdf_size_bytes:        pdfSize,
            text_path:             textPath,
            json_path:             jsonPath,
            extraction_confidence: confidence,
            enrichment_error:      null,
            updated_at:            now,
          },
        }
      )

      enriched++

    } catch (err) {
      failed++
      console.log("\n  [FAIL] " + gemc_no + " — " + err.message.slice(0, 120))
      await gc.updateOne({ gemc_no }, {
        $set: { enrichment_error: err.message.slice(0, 300), updated_at: new Date() }
      })
    }
  }

  const totalSec = Math.round((Date.now() - startTime) / 1000)
  console.log("\n\n" + "═".repeat(70))
  console.log("  LOCAL ENRICHMENT COMPLETE")
  console.log("═".repeat(70))
  console.log("  Enriched  : " + enriched)
  console.log("  Failed    : " + failed)
  console.log("  Skipped   : " + noPdf + " (no local PDF)")
  console.log("  Duration  : " + Math.floor(totalSec/60) + "m " + (totalSec%60) + "s")
  console.log("  Rate      : ~" + Math.round(enriched / (totalSec / 3600)) + " contracts/hr")
  console.log("═".repeat(70))

  await client.close()
})().catch(e => { console.error("\nFATAL:", e.message); process.exit(1) })
