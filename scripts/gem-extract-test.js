"use strict"
// Quick test of the new extractFields() against existing raw text files
// Run: node scripts/gem-extract-test.js

const fs   = require("fs")
const path = require("path")

// ── Copy helpers from gem-enrich-contracts.js ──────────────────────────────
const STATES_LONG = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chandigarh","Chhattisgarh",
  "Dadra and Nagar Haveli","Daman and Diu","Delhi","Goa","Gujarat","Haryana",
  "Himachal Pradesh","Jammu and Kashmir","Jharkhand","Karnataka","Kerala","Ladakh",
  "Lakshadweep","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram",
  "Nagaland","Odisha","Puducherry","Punjab","Rajasthan","Sikkim","Tamil Nadu",
  "Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
].sort((a, b) => b.length - a.length)

function detectState(t) {
  for (const s of STATES_LONG) {
    if (new RegExp(`\\b${s}\\b`, "i").test(t)) return s
  }
  return null
}
function extractGstin(t) {
  const m = t.match(/\b([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z])\b/i)
  return m ? m[1].toUpperCase() : null
}
function extractPin(t) {
  const m = t.match(/\b([1-9][0-9]{5})\b/)
  return m ? m[1] : null
}
function extractEmail(t) {
  const m = t.match(/\b([A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,})\b/)
  return m ? m[1].toLowerCase() : null
}
function extractPhone(text) {
  let m = text.match(/\b(?:\+91[-\s]?|0)?([6-9]\d{9})\b/)
  if (m) return m[1]
  const stripped = text.replace(/[\s\-.()]/g, "")
  m = stripped.match(/(?:\+91|91|0)?([6-9]\d{9})/)
  return m ? m[1] : null
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

// ── extractFields (copy from gem-enrich-contracts.js) ──────────────────────
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

  const orgSec      = cut(iOrg,       iBuyer >= 0 ? iBuyer : t.length)
  const buyerSec    = cut(iBuyer,     iSeller >= 0 ? iSeller : t.length,
                                      iConsignee > iBuyer ? iConsignee : t.length)
  const sellerSec   = cut(iSeller,    iProduct  > iSeller   ? iProduct  : t.length,
                                      iConsignee > iSeller  ? iConsignee : t.length)
  const consigneeSec = cut(iConsignee, iSeller  > iConsignee ? iSeller  : t.length,
                                       iProduct  > iConsignee ? iProduct : t.length)

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
    // Require ":" to avoid matching "Consignee Name & Address" table headers
    const m = section.match(/\bAddress\s*:\s*([^\n]*)\n?((?:[^\n]+\n){0,4})/)
    if (!m) return null
    const inline = m[1].trim()
    const lines  = m[2] ? m[2].split("\n").map(l => l.trim())
                            .filter(l => l && !/^[^\x00-\x7F]/.test(l)) : []
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
  const seller_msme_category   = lbl(sellerSec, "MSE Social Category", "MSME Category")
  const seller_gender_category = lbl(sellerSec, "MSE Gender", "MSE Gender Category")
  const seller_address         = extractAddr(sellerSec)
  const seller_pincode         = extractPin(seller_address || sellerSec)
  const seller_state           = detectState(seller_address || sellerSec.slice(0, 600))
  const seller_city            = null
  const seller_district        = null

  const buyer_ministry    = lbl(orgSec, "Ministry")
  const buyer_dept        = lbl(orgSec, "Department")
  const buyer_name        = lbl(orgSec, "Organisation Name") || buyer_dept || null
  const buyer_designation = lbl(buyerSec, "Designation") || lbl(t, "Designation")
  const buyer_contact     = extractPhone(lbl(buyerSec, "Contact No.") || "")
  const buyer_email       = extractEmail(lbl(buyerSec, "Email ID") || "")
  const buyer_address     = extractAddr(buyerSec)
  const buyer_state       = detectState(buyer_address || buyer_dept || buyer_ministry || "")
  const buyer_district    = null

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

  const unit_price   = null
  const quantity_pdf = null
  const payment_mode = lbl(t, "Payment Mode")

  const _pickDate = (s) => {
    if (!s) return null
    const m = s.match(/(\d{1,2}-[A-Za-z]{3}-\d{4}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/)
    return m ? parseDateStr(m[1]) : null
  }
  let delivery_start = _pickDate(lbl(t, "Service Start Date (latest by)", "Delivery Start Date"))
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
    const vals = all.map(m => m[1].trim())
      .filter(v => v.length > 1 && !/^(Type|Registered|Unregistered|NA|-)/i.test(v))
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
    seller_address, seller_city, seller_district, seller_state, seller_pincode,
    buyer_name, buyer_ministry, buyer_dept, buyer_designation,
    buyer_contact, buyer_email, buyer_address, buyer_state, buyer_district,
    consignee_name, consignee_address,
    contract_value_pdf, unit_price, quantity_pdf,
    delivery_start, delivery_end, payment_mode,
    product_name_pdf, brand, model, category,
    country_of_origin, catalogue_status, selling_as,
    oem_name, oem_indicator, reseller_indicator, manufacturer_indicator,
  }

  const found      = SCORED_FIELDS.filter(f => result[f] !== null && result[f] !== undefined).length
  const confidence = Math.round((found / SCORED_FIELDS.length) * 100)
  return { fields: result, confidence, found, total: SCORED_FIELDS.length }
}

// ── Run against all text files ─────────────────────────────────────────────
const TEXT_DIR = path.join("audit", "enrichment", "text")
const files    = fs.readdirSync(TEXT_DIR).filter(f => f.endsWith(".txt"))

console.log(`\nTesting ${files.length} contracts with new extractFields()\n`)
console.log("═".repeat(90))

let totalConf = 0
const fieldCounts = Object.fromEntries(SCORED_FIELDS.map(f => [f, 0]))

for (const f of files) {
  const gemc = f.replace(".txt", "").replace(/_/g, "-").replace(/^GEMC-/, "GEMC-")
  const raw  = fs.readFileSync(path.join(TEXT_DIR, f), "utf8")
  const { fields, confidence, found, total } = extractFields(raw)
  totalConf += confidence

  for (const sf of SCORED_FIELDS) {
    if (fields[sf] !== null && fields[sf] !== undefined) fieldCounts[sf]++
  }

  console.log(`\n${gemc}  conf=${confidence}% (${found}/${total})`)
  console.log(`  seller_name       : ${fields.seller_name}`)
  console.log(`  seller_phone      : ${fields.seller_phone}`)
  console.log(`  seller_email      : ${fields.seller_email}`)
  console.log(`  seller_gstin      : ${fields.seller_gstin}`)
  console.log(`  seller_address    : ${String(fields.seller_address || "").slice(0,60)}`)
  console.log(`  seller_state      : ${fields.seller_state}`)
  console.log(`  buyer_name        : ${String(fields.buyer_name || "").slice(0,50)}`)
  console.log(`  buyer_ministry    : ${fields.buyer_ministry}`)
  console.log(`  buyer_dept        : ${String(fields.buyer_dept || "").slice(0,50)}`)
  console.log(`  buyer_contact     : ${fields.buyer_contact}`)
  console.log(`  contract_value_pdf: ${fields.contract_value_pdf}`)
  console.log(`  delivery_start    : ${fields.delivery_start}`)
  console.log(`  consignee_address : ${String(fields.consignee_address || "").slice(0,60)}`)
  console.log(`  country_of_origin : ${fields.country_of_origin}`)
  console.log(`  oem_name          : ${fields.oem_name}`)
}

console.log("\n" + "═".repeat(90))
console.log(`Average confidence: ${(totalConf / files.length).toFixed(1)}%`)
console.log("\nField population rates (out of " + files.length + "):")
for (const f of SCORED_FIELDS) {
  const n   = fieldCounts[f]
  const pct = Math.round(n / files.length * 100)
  const bar = "█".repeat(Math.round(pct / 5))
  console.log(`  ${f.padEnd(22)} ${String(n).padStart(2)}/${files.length}  ${String(pct).padStart(3)}%  ${bar}`)
}
