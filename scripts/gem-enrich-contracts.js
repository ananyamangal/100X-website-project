"use strict";
// Phase 2A — Contract Enrichment Pipeline
//
// Enriches every gem_contracts record that has detail_scraped:false.
// No human captcha required:
//   - captcha.php returns the answer in plaintext (auto-solvable)
//   - sbtCaptcha validates only { oid }, never checks captcha server-side
//
// Run:
//   node scripts/gem-enrich-contracts.js              # process all pending
//   node scripts/gem-enrich-contracts.js --limit 50   # cap at 50 contracts
//   node scripts/gem-enrich-contracts.js --value-first # highest GMV first
//   node scripts/gem-enrich-contracts.js --retry-failed # retry errored records
//
// Output:
//   audit/enrichment/pdfs/<gemc>.pdf
//   audit/enrichment/text/<gemc>.txt
//   gem_contracts   — all Phase 2A fields written
//   gem_contracts_raw — pdf_text + pdf_path added

const fs   = require("fs")
const path = require("path")
const { MongoClient } = require("mongodb")
const { chromium }    = require("playwright")
const pdfParse        = require("pdf-parse")

// ── Config ────────────────────────────────────────────────────────────────────
const EXTRACTION_VERSION = 1
const BATCH_DELAY_MS     = 1200   // between contracts
const PDF_DIR            = path.join("audit", "enrichment", "pdfs")
const TEXT_DIR           = path.join("audit", "enrichment", "text")
const MAX_RETRIES        = 3      // skip after this many failed attempts
const SBT_URL            = "https://gem.gov.in/view_contracts/sbtCaptcha"
const CAP_URL            = "https://gem.gov.in/assets/phpcaptcha/captcha.php"

// ── Setup ─────────────────────────────────────────────────────────────────────
for (const d of [PDF_DIR, TEXT_DIR]) fs.mkdirSync(d, { recursive: true })

function loadEnv() {
  const lines = fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8").split("\n")
  for (const l of lines) {
    const m = l.match(/^([^=#\s][^=]*)=(.*)$/)
    if (m) process.env[m[1].trim()] = m[2].trim()
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }
function slug(id)   { return id.replace(/[^A-Z0-9]/g, "_") }
function fmtInr(n)  {
  if (!n) return "(null)"
  if (n >= 1e7) return `₹${(n/1e7).toFixed(2)} Cr`
  if (n >= 1e5) return `₹${(n/1e5).toFixed(1)} L`
  return `₹${n.toLocaleString()}`
}

// ── Field extraction ──────────────────────────────────────────────────────────
const STATES_LONG = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chandigarh","Chhattisgarh",
  "Dadra and Nagar Haveli","Daman and Diu","Delhi","Goa","Gujarat","Haryana",
  "Himachal Pradesh","Jammu and Kashmir","Jharkhand","Karnataka","Kerala","Ladakh",
  "Lakshadweep","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram",
  "Nagaland","Odisha","Puducherry","Punjab","Rajasthan","Sikkim","Tamil Nadu",
  "Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
].sort((a, b) => b.length - a.length)

function first(text, ...pats) {
  for (const rx of pats) {
    const m = text.match(rx)
    if (m?.[1]?.trim()) return m[1].trim()
  }
  return null
}

function detectState(text) {
  for (const s of STATES_LONG) {
    if (new RegExp(`\\b${s}\\b`, "i").test(text)) return s
  }
  return null
}

function parseNum(s) {
  if (!s) return null
  const n = Number(String(s).replace(/[₹,\s]/g, "").trim())
  return isNaN(n) ? null : n
}

const MONTHS = { Jan:1, Feb:2, Mar:3, Apr:4, May:5, Jun:6, Jul:7, Aug:8, Sep:9, Oct:10, Nov:11, Dec:12 }

function parseDateStr(s) {
  if (!s) return null
  // "dd-Mon-yyyy" — GeM format
  let m = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/)
  if (m) {
    const mon = MONTHS[m[2][0].toUpperCase() + m[2].slice(1).toLowerCase()]
    if (mon) return new Date(`${m[3]}-${String(mon).padStart(2,"0")}-${m[1].padStart(2,"0")}`)
  }
  // "dd/mm/yyyy" or "dd-mm-yyyy"
  m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (m) return new Date(`${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`)
  const iso = new Date(s)
  return isNaN(iso) ? null : iso
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
  // Bare 10-digit mobile, optional +91 or leading 0
  let m = text.match(/\b(?:\+91[-\s]?|0)?([6-9]\d{9})\b/)
  if (m) return m[1]
  // Dashed formats: "90044-90761", "09350-043727" — strip separators then retry
  const stripped = text.replace(/[\s\-.()]/g, "")
  m = stripped.match(/(?:\+91|91|0)?([6-9]\d{9})/)
  return m ? m[1] : null
}

function extractEmail(text) {
  const m = text.match(/\b([A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,})\b/)
  return m ? m[1].toLowerCase() : null
}

// Scored fields for confidence calculation
const SCORED_FIELDS = [
  "seller_name","seller_gstin","seller_phone","seller_address","seller_state",
  "buyer_name","buyer_ministry","buyer_dept",
  "consignee_name","consignee_address",
  "contract_value_pdf","unit_price","delivery_start",
  "oem_name","country_of_origin",
]

function extractFields(rawText) {
  // Normalise: collapse horizontal whitespace, preserve newlines
  const t = rawText.replace(/\r/g, "").replace(/[ \t]+/g, " ")

  // ── Section boundaries ──────────────────────────────────────────────────────
  // GeM bilingual PDFs use "Hindi|English Header|English Header" for section titles.
  // Seller section may be "Seller Details" (product) or "Service Provider Details" (service).
  function sectionIdx(...markers) {
    let best = -1
    for (const m of markers) {
      const i = t.indexOf(m + "|" + m)   // bilingual dupe: most reliable
      if (i >= 0 && (best < 0 || i < best)) best = i
      const j = t.indexOf(m)             // fallback: plain
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

  // ── Label extractor for "English Label :VALUE" bilingual format ─────────────
  // Some fields repeat: "|Label : |Label : Value" — matchAll, take last non-empty
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

  // Extract address block: multi-line after "Address :", stop at blank/Hindi/known terminator
  function extractAddr(section) {
    // Require ":" so we don't match "Consignee Name & Address" table headers
    const m = section.match(/\bAddress\s*:\s*([^\n]*)\n?((?:[^\n]+\n){0,4})/)
    if (!m) return null
    const inline  = m[1].trim()
    const lines   = m[2] ? m[2].split("\n").map(l => l.trim()).filter(l => l && !/^[^\x00-\x7F]/.test(l)) : []
    const all     = [...(inline ? [inline] : []), ...lines]
    // Stop collecting after a line containing "India" or a 6-digit pincode
    const idx     = all.findIndex((l, i) => i > 0 && /(India\b|\d{6})/i.test(l))
    const keep    = idx >= 0 ? all.slice(0, idx + 1) : all
    return keep.join(", ").replace(/,\s*,/g, ",").trim() || null
  }

  // ── SELLER ─────────────────────────────────────────────────────────────────
  const seller_gem_id          = lbl(sellerSec, "GeM Seller ID")
  const seller_name            = lbl(sellerSec, "Company Name")
  // GSTIN may span next line; extract from seller section then full text
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
  const seller_city            = null
  const seller_district        = null

  // ── BUYER ──────────────────────────────────────────────────────────────────
  const buyer_ministry    = lbl(orgSec, "Ministry")
  const buyer_dept        = lbl(orgSec, "Department")
  const buyer_name        = lbl(orgSec, "Organisation Name") || buyer_dept || null
  const buyer_designation = lbl(buyerSec, "Designation") || lbl(t, "Designation")
  const buyer_contact     = extractPhone(lbl(buyerSec, "Contact No.") || "")
  const buyer_email       = extractEmail(lbl(buyerSec, "Email ID") || "")
  const buyer_address     = extractAddr(buyerSec)
  const buyer_state       = detectState(buyer_address || buyer_dept || buyer_ministry || "")
  const buyer_district    = null

  // ── CONSIGNEE ──────────────────────────────────────────────────────────────
  const consignee_name    = lbl(consigneeSec, "Consignee Name") || null
  const consignee_address = extractAddr(consigneeSec)

  // ── COMMERCIAL ─────────────────────────────────────────────────────────────
  // Contract total value — appears duplicated in bilingual PDFs: "30,567,90030,567,900"
  const contract_value_pdf = (() => {
    // Capture generously ([\d,.]+) — bilingual PDFs repeat values like "30,567,90030,567,900"
    // or for decimals "7,039,170.847,039,170.84" (two decimal points after comma removal)
    const m = t.match(/Total Order Value \(in INR\)([\d,.]+)/i)
           || t.match(/Total Contract Value Including All Duties and Taxes\(INR\)([\d,.]+)/i)
           || t.match(/Total Value Including Addons\(INR\)([\d,.]+)/i)
           || t.match(/Total Value without Addons\(INR\)([\d,.]+)/i)
    if (!m) return null
    const raw = m[1].replace(/,/g, "")   // remove commas, keep digits and periods
    // Integer dedup: "3056790030567900" → half = "30567900"
    if (raw.indexOf(".") < 0) {
      const len = raw.length
      if (len % 2 === 0) {
        const half = len / 2
        if (raw.slice(0, half) === raw.slice(half)) return parseFloat(raw.slice(0, half))
      }
      return parseFloat(raw)
    }
    // Decimal dedup: "7039170.847039170.84" → split(".") → ["7039170","847039170","84"]
    const parts = raw.split(".")
    if (parts.length === 3) return parseFloat(parts[0] + "." + parts[2])
    return parseFloat(raw)
  })()

  const unit_price  = null  // product table layout is too variable to parse reliably
  const quantity_pdf = null

  const payment_mode = lbl(t, "Payment Mode")

  // Delivery / service dates — GeM uses "dd-Mon-yyyy" format
  const _pickDate = (s) => {
    if (!s) return null
    const m = s.match(/(\d{1,2}-[A-Za-z]{3}-\d{4}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/)
    return m ? parseDateStr(m[1]) : null
  }
  let delivery_start = _pickDate(lbl(t, "Service Start Date (latest by)", "Delivery Start Date", "Delivery Start After"))
  let delivery_end   = _pickDate(lbl(t, "Service End Date", "Delivery End Date", "Delivery To Be Completed By"))

  // Product contracts embed dates in consignee table row: "...27-May-202626-Jul-2026"
  if (!delivery_start || !delivery_end) {
    const dm = consigneeSec.match(/(\d{2}-[A-Z][a-z]{2}-\d{4})(\d{2}-[A-Z][a-z]{2}-\d{4})/)
    if (dm) {
      if (!delivery_start) delivery_start = parseDateStr(dm[1])
      if (!delivery_end)   delivery_end   = parseDateStr(dm[2])
    }
  }

  // ── PRODUCT ────────────────────────────────────────────────────────────────
  // Product name appears in bilingual-repeat format: "|Product Name :  |Product Name : VALUE"
  const product_name_pdf = (() => {
    const all = [...t.matchAll(/Product Name\s*:?\s*([^\n|]{3,200})/gi)]
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

  // ── COMPETITIVE ────────────────────────────────────────────────────────────
  const oem_name = (() => {
    if (selling_as && /OEM/i.test(selling_as) && brand) return brand
    const m = t.match(/OEM\s*(?:Name|Manufacturer)\s*:\s*([^\n|]{3,80})/i)
    return m ? m[1].trim() : (brand || null)
  })()
  const oem_indicator          = /\bOEM\b/i.test(t)
  const reseller_indicator     = /\b(Reseller|Dealer|Distributor)\b/i.test(t)
  const manufacturer_indicator = /\b(Manufacturer|Manufacturing)\b/i.test(t)

  // ── Confidence ─────────────────────────────────────────────────────────────
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

// ── PDF download — 3 layers ───────────────────────────────────────────────────
async function downloadPdf(context, page, url, dest) {
  // 1. New-tab download (link is target="_blank")
  try {
    const [dl] = await Promise.all([
      context.waitForEvent("page", { timeout: 12000 })
        .then(async tab => {
          const [d] = await Promise.all([
            tab.waitForEvent("download", { timeout: 20000 }),
            Promise.resolve(),
          ]).catch(() => [null])
          await tab.close().catch(() => {})
          return d
        }),
      page.evaluate(u => {
        const a = Object.assign(document.createElement("a"), { href: u, target: "_blank", rel: "noopener" })
        document.body.appendChild(a); a.click(); document.body.removeChild(a)
      }, url),
    ])
    if (dl) { await dl.saveAs(dest); return "new-tab" }
  } catch {}

  // 2. In-page navigate download
  try {
    const [dl] = await Promise.all([
      page.waitForEvent("download", { timeout: 20000 }),
      page.evaluate(u => { window.location.href = u }, url),
    ])
    if (dl) { await dl.saveAs(dest); return "in-page" }
  } catch {}

  // 3. fetch() inside browser context (inherits session cookies)
  const b64 = await page.evaluate(async u => {
    const res  = await fetch(u)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const buf  = await res.arrayBuffer()
    const arr  = new Uint8Array(buf)
    let s = ""
    for (const b of arr) s += String.fromCharCode(b)
    return btoa(s)
  }, url)
  fs.writeFileSync(dest, Buffer.from(b64, "base64"))
  return "fetch"
}

// ── Main ──────────────────────────────────────────────────────────────────────
;(async () => {
  loadEnv()

  const args       = process.argv.slice(2)
  const limitIdx   = args.indexOf("--limit")
  const limit      = limitIdx >= 0 ? parseInt(args[limitIdx + 1]) : Infinity
  const valueFirst = args.includes("--value-first")
  const retryFailed = args.includes("--retry-failed")
  const dryRun     = args.includes("--dry-run")

  const client = new MongoClient(process.env.MONGODB_URI)
  await client.connect()
  const db    = client.db()
  const gc    = db.collection("gem_contracts")
  const gcRaw = db.collection("gem_contracts_raw")

  // Build queue query
  const queueQuery = retryFailed
    ? { detail_scraped: false, enrichment_attempts: { $lt: MAX_RETRIES } }
    : { detail_scraped: false, enrichment_error: { $exists: false } }

  const totalPending = await gc.countDocuments(queueQuery)
  const totalAll     = await gc.countDocuments()
  const totalDone    = await gc.countDocuments({ detail_scraped: true })

  console.log("\n" + "═".repeat(70))
  console.log("  Phase 2A — Contract Enrichment Pipeline")
  console.log("═".repeat(70))
  console.log(`  Total contracts  : ${totalAll}`)
  console.log(`  Already enriched : ${totalDone}`)
  console.log(`  Pending          : ${totalPending}`)
  console.log(`  Processing       : ${Math.min(totalPending, limit === Infinity ? totalPending : limit)}`)
  console.log(`  Order            : ${valueFirst ? "highest GMV first" : "insertion order"}`)
  if (dryRun) console.log("  DRY RUN — no writes")
  console.log("═".repeat(70))

  if (totalPending === 0) {
    console.log("  Nothing to enrich. All contracts are detail_scraped:true.")
    await client.close()
    return
  }

  // ── Browser ────────────────────────────────────────────────────────────────
  const browser = await chromium.launch({
    headless: false, slowMo: 0,
    args: ["--no-sandbox","--disable-setuid-sandbox","--disable-dev-shm-usage",
           "--disable-gpu","--disable-software-rasterizer","--no-zygote"],
  })
  browser.on("disconnected", () => console.error("[BROWSER] Disconnected"))

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    acceptDownloads: true,
  })
  const page = await context.newPage()
  page.on("crash",     () => console.error("[PAGE] Crashed"))
  page.on("pageerror", e  => console.error("[PAGE] JS error:", e.message))

  // Establish gem.gov.in session (needed for sbtCaptcha cookie context)
  console.log("\n[SESSION] Establishing gem.gov.in session ...")
  await page.goto("https://gem.gov.in/view_contracts", {
    waitUntil: "domcontentloaded", timeout: 60000,
  }).catch(e => console.warn("[SESSION] Nav warning:", e.message))
  await sleep(2000)
  console.log("[SESSION] Session ready — URL:", page.url())

  // ── Process queue ──────────────────────────────────────────────────────────
  const sort = valueFirst ? { contract_value_num: -1 } : { first_seen: 1 }
  const cursor = gc.find(queueQuery).sort(sort).limit(limit === Infinity ? 0 : limit)

  let processed = 0, enriched = 0, failed = 0
  const startTime = Date.now()

  while (await cursor.hasNext()) {
    const contract = await cursor.next()
    const { gemc_no } = contract
    processed++

    const elapsed     = (Date.now() - startTime) / 1000
    const rate        = processed > 1 ? Math.round((processed - 1) / (elapsed / 3600)) : "—"
    console.log(`\n${"─".repeat(70)}`)
    console.log(`  [${processed}] ${gemc_no}  |  ${fmtInr(contract.contract_value_num)}  |  rate: ${rate}/hr`)
    console.log("─".repeat(70))

    const pdfPath  = path.join(PDF_DIR,  slug(gemc_no) + ".pdf")
    const textPath = path.join(TEXT_DIR, slug(gemc_no) + ".txt")
    const now      = new Date()

    const update = {
      enrichment_attempts: (contract.enrichment_attempts || 0) + 1,
      enrichment_timestamp: now,
      extraction_version:   EXTRACTION_VERSION,
    }

    try {
      // A: sbtCaptcha — no captcha solving needed
      console.log("  [A] sbtCaptcha ...")
      const sbt = await page.evaluate(async ({ oid, sbtUrl }) => {
        const res = await fetch(sbtUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ oid }).toString(),
        })
        const text = await res.text()
        let obj = {}
        try { obj = JSON.parse(text) } catch {}
        const m = (obj.code || "").match(/href="([^"]+)"/)
        return { status: obj.status, url: m ? m[1] : null, raw: text.slice(0, 200) }
      }, { oid: gemc_no, sbtUrl: SBT_URL })

      console.log(`      status: ${sbt.status}  url: ${sbt.url ? sbt.url.slice(0, 60) + "..." : "(none)"}`)

      if (sbt.status !== "1" || !sbt.url) {
        throw new Error(`sbtCaptcha failed: status=${sbt.status} raw=${sbt.raw}`)
      }

      // B: Download PDF
      console.log("  [B] Downloading PDF ...")
      const dlLayer = await downloadPdf(context, page, sbt.url, pdfPath)
      const pdfSize = fs.statSync(pdfPath).size
      console.log(`      ${pdfSize.toLocaleString()} bytes via ${dlLayer} → ${path.basename(pdfPath)}`)

      if (pdfSize < 500) throw new Error(`PDF too small (${pdfSize} bytes) — likely an error page`)

      // C: Parse PDF text
      console.log("  [C] Parsing PDF ...")
      const pdfBuf  = fs.readFileSync(pdfPath)
      const pdfData = await pdfParse(pdfBuf, { max: 0 })
      fs.writeFileSync(textPath, pdfData.text, "utf8")
      console.log(`      pages: ${pdfData.numpages}  chars: ${pdfData.text.length}`)

      // D: Extract fields
      console.log("  [D] Extracting fields ...")
      const { fields, confidence, found, total } = extractFields(pdfData.text)
      console.log(`      confidence: ${confidence}%  (${found}/${total})`)

      // Log key finds
      const show = ["seller_name","seller_gstin","buyer_name","oem_name","contract_value_pdf"]
      show.forEach(k => console.log(`      ${k.padEnd(22)}: ${fields[k] ?? "(not found)"}`))

      if (!dryRun) {
        // Update gem_contracts
        await gc.updateOne(
          { gemc_no },
          {
            $set: {
              ...update,
              // IDENTITY
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
              seller_city:           fields.seller_city,
              seller_district:       fields.seller_district,
              seller_state:          fields.seller_state,
              seller_pincode:        fields.seller_pincode,
              // BUYER
              buyer_name:            fields.buyer_name,
              buyer_designation:     fields.buyer_designation || contract.buyer_designation,
              buyer_contact:         fields.buyer_contact,
              buyer_email:           fields.buyer_email,
              buyer_address:         fields.buyer_address,
              buyer_state:           fields.buyer_state,
              buyer_district:        fields.buyer_district,
              consignee_name:        fields.consignee_name,
              consignee_address:     fields.consignee_address,
              // COMMERCIAL
              contract_value_pdf:    fields.contract_value_pdf,
              unit_rate:             fields.unit_price || contract.unit_rate,
              quantity:              fields.quantity_pdf || contract.quantity,
              delivery_start:        fields.delivery_start,
              delivery_end:          fields.delivery_end,
              payment_mode:          fields.payment_mode,
              // PRODUCT
              product_desc:          fields.product_name_pdf,
              oem_brand:             fields.brand || contract.oem_brand,
              model:                 fields.model,
              category_name:         fields.category || contract.category_name,
              country_of_origin:     fields.country_of_origin,
              catalogue_status:      fields.catalogue_status,
              selling_as:            fields.selling_as,
              // COMPETITIVE
              oem_name:              fields.oem_name,
              oem_indicator:         fields.oem_indicator,
              reseller_indicator:    fields.reseller_indicator,
              manufacturer_indicator: fields.manufacturer_indicator,
              // AUDIT
              detail_scraped:        true,
              pdf_downloaded:        true,
              pdf_path:              pdfPath,
              pdf_size_bytes:        pdfSize,
              extraction_confidence: confidence,
              enrichment_error:      null,
              updated_at:            now,
            },
          }
        )

        // Update gem_contracts_raw
        await gcRaw.updateOne(
          { gemc_no },
          {
            $set: {
              pdf_text:   pdfData.text,
              pdf_path:   pdfPath,
              enriched_at: now,
            },
          },
          { upsert: true }
        )
      }

      enriched++

    } catch (err) {
      failed++
      console.log(`  [FAIL] ${err.message}`)
      if (!dryRun) {
        await gc.updateOne(
          { gemc_no },
          {
            $set: {
              ...update,
              enrichment_error: err.message.slice(0, 300),
              detail_scraped:   false,
              updated_at:       now,
            },
          }
        )
      }
    }

    const done = enriched + failed
    const pct  = Math.round((done / Math.min(totalPending, limit)) * 100)
    process.stdout.write(`  Progress: ${done}/${Math.min(totalPending, limit)} (${pct}%)  enriched: ${enriched}  failed: ${failed}\n`)

    await sleep(BATCH_DELAY_MS)
  }

  // ── Final summary ──────────────────────────────────────────────────────────
  const totalSec = Math.round((Date.now() - startTime) / 1000)
  console.log("\n" + "═".repeat(70))
  console.log("  ENRICHMENT COMPLETE")
  console.log("═".repeat(70))
  console.log(`  Processed  : ${processed}`)
  console.log(`  Enriched   : ${enriched}`)
  console.log(`  Failed     : ${failed}`)
  console.log(`  Duration   : ${Math.floor(totalSec/60)}m ${totalSec%60}s`)
  console.log(`  Rate       : ~${Math.round(enriched / (totalSec / 3600))} contracts/hr`)
  console.log(`  PDFs saved : ${PDF_DIR}`)
  console.log(`  Text saved : ${TEXT_DIR}`)
  console.log("═".repeat(70))

  await cursor.close()
  await client.close()
  await browser.close()
})().catch(e => { console.error("\nFATAL:", e.message); process.exit(1) })
