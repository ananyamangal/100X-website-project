"use strict";
// GeM PDF Acquisition PoC — structured output
// Proves: GEMC → captcha.php → sbtCaptcha → PDF → seller extraction
//
// Run: node scripts/gem-pdf-poc.js
//
// Output:
//   audit/pdf-poc/pdfs/          ← original PDFs
//   audit/pdf-poc/raw-text/      ← extracted plain text
//   audit/pdf-poc/parsed-json/   ← structured field JSON + confidence score

const fs       = require("fs")
const path     = require("path")
const { chromium } = require("playwright")
const pdfParse = require("pdf-parse")

const OUT_ROOT    = path.join("audit", "pdf-poc")
const OUT_PDFS    = path.join(OUT_ROOT, "pdfs")
const OUT_TEXT    = path.join(OUT_ROOT, "raw-text")
const OUT_JSON    = path.join(OUT_ROOT, "parsed-json")
const MAX_CONTRACTS = 5

for (const d of [OUT_PDFS, OUT_TEXT, OUT_JSON]) fs.mkdirSync(d, { recursive: true })

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }
function slug(gemcId) { return gemcId.replace(/[^A-Z0-9]/g, "_") }

// ── Field extraction ──────────────────────────────────────────────────────────
function extractField(text, ...patterns) {
  for (const rx of patterns) {
    const m = text.match(rx)
    if (m?.[1]?.trim()) return m[1].trim()
  }
  return null
}

const SCORED_FIELDS = [
  "seller_name", "gstin", "pan",
  "buyer_name", "buyer_ministry", "buyer_dept",
  "consignee_name", "consignee_address",
  "seller_address", "oem_name",
  "contract_value", "product_name", "quantity",
]

function parseContractPdf(text) {
  const t = text.replace(/\r/g, "").replace(/[ \t]+/g, " ")

  const fields = {
    seller_name: extractField(t,
      /Seller(?:\s*Name)?[\s:]+([A-Za-z0-9 ,.'&()\-]+?)(?:\n|GST|GSTIN|PAN|Seller|Buyer)/i,
      /Supplier(?:\s*Name)?[\s:]+([A-Za-z0-9 ,.'&()\-]+?)(?:\n|GST)/i,
      /Firm(?:\s*Name)?[\s:]+([A-Za-z0-9 ,.'&()\-]+?)(?:\n|GST)/i,
    ),
    gstin: extractField(t,
      /GSTIN?[\s:]+([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z])/i,
      /GST(?:\s*No\.?)[\s:]+([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z])/i,
    ),
    pan: extractField(t,
      /PAN[\s:]+([A-Z]{5}[0-9]{4}[A-Z])/i,
    ),
    buyer_name: extractField(t,
      /Buyer(?:\s*Name)?[\s:]+([A-Za-z0-9 ,.'&()\-]+?)(?:\n|Ministry|Department|Designation)/i,
    ),
    buyer_ministry: extractField(t,
      /Ministry(?:\/[A-Za-z]+)?[\s:]+([A-Za-z0-9 ,.'&()\-]+?)(?:\n|Department|State)/i,
    ),
    buyer_dept: extractField(t,
      /Department[\s:]+([A-Za-z0-9 ,.'&()\-]+?)(?:\n|Office|Zone)/i,
    ),
    consignee_name: extractField(t,
      /Consignee(?:'s)?\s*(?:Name)?[\s:]+([A-Za-z0-9 ,.'&()\-]+?)(?:\n|Address|Pin)/i,
    ),
    consignee_address: extractField(t,
      /(?:Delivery|Consignee)\s*Address[\s:]+([A-Za-z0-9 ,.'&()\-\/]+?)(?:\n\n|\n[A-Z])/i,
    ),
    seller_address: extractField(t,
      /Seller\s*Address[\s:]+([A-Za-z0-9 ,.'&()\-\/]+?)(?:\n\n|\n[A-Z])/i,
    ),
    oem_name: extractField(t,
      /OEM(?:\s*Name)?[\s:]+([A-Za-z0-9 ,.'&()\-]+?)(?:\n|Country)/i,
      /Make[\s:]+([A-Za-z0-9 ,.'&()\-]+?)(?:\n|Model)/i,
    ),
    contract_value: extractField(t,
      /Total\s*(?:Contract|Order)?\s*Value[\s:₹Rs. ]+([0-9,. ]+)/i,
      /Grand\s*Total[\s:₹Rs. ]+([0-9,. ]+)/i,
      /Contract\s*Amount[\s:₹Rs. ]+([0-9,. ]+)/i,
    ),
    product_name: extractField(t,
      /(?:Product|Item)\s*(?:Name|Description)[\s:]+([A-Za-z0-9 ,.'&()\-]+?)(?:\n|Qty|Quantity)/i,
    ),
    quantity: extractField(t,
      /Quantity[\s:]+([0-9,. ]+\s*(?:Nos?\.?|Units?|Kg|Ltrs?|Sets?)?)/i,
    ),
    msme: /MSME/i.test(t) ? "yes" : "no",
    gemc_no_in_pdf: extractField(t,
      /(?:GEMC|Contract)\s*(?:Number|No\.?)[\s:\-]+([A-Z0-9\-]+)/i,
    ),
  }

  // Confidence: fraction of SCORED_FIELDS that were found
  const found = SCORED_FIELDS.filter(f => fields[f] !== null).length
  const score = Math.round((found / SCORED_FIELDS.length) * 100)
  return { fields, confidence: score, foundCount: found, totalFields: SCORED_FIELDS.length }
}

// ── PDF download helper — 3 fallback layers ───────────────────────────────────
async function downloadPdf(context, page, downloadUrl, pdfPath) {
  // Layer 1: new tab download (link has target="_blank")
  try {
    const [dl] = await Promise.all([
      context.waitForEvent("page", { timeout: 15000 }).then(async newTab => {
        const [tabDl] = await Promise.all([
          newTab.waitForEvent("download", { timeout: 20000 }),
          Promise.resolve(),
        ]).catch(() => [null])
        await newTab.close().catch(() => {})
        return tabDl
      }),
      page.evaluate(url => {
        const a = document.createElement("a")
        a.href = url; a.target = "_blank"; a.rel = "noopener"
        document.body.appendChild(a); a.click(); document.body.removeChild(a)
      }, downloadUrl),
    ])
    if (dl) { await dl.saveAs(pdfPath); return "new-tab" }
  } catch {}

  // Layer 2: in-page navigation download
  try {
    const [dl] = await Promise.all([
      page.waitForEvent("download", { timeout: 20000 }),
      page.evaluate(url => { window.location.href = url }, downloadUrl),
    ])
    if (dl) { await dl.saveAs(pdfPath); return "in-page" }
  } catch {}

  // Layer 3: fetch as binary inside browser (uses session cookies)
  const b64 = await page.evaluate(async url => {
    const res  = await fetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const buf   = await res.arrayBuffer()
    const bytes = new Uint8Array(buf)
    let s = ""
    for (const b of bytes) s += String.fromCharCode(b)
    return btoa(s)
  }, downloadUrl)
  fs.writeFileSync(pdfPath, Buffer.from(b64, "base64"))
  return "fetch-fallback"
}

// ── Main ──────────────────────────────────────────────────────────────────────
;(async () => {
  const summaryRows = []

  console.log("\n[LAUNCH] Starting Chromium ...")
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

  // ── Navigate ────────────────────────────────────────────────────────────────
  console.log("[NAV] gem.gov.in/view_contracts ...")
  await page.goto("https://gem.gov.in/view_contracts", { waitUntil: "domcontentloaded", timeout: 60000 })
  console.log("[NAV] Title:", await page.title())

  // ── Fill dates (last 7 days) ────────────────────────────────────────────────
  const today   = new Date()
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)
  const fmt = d => `${String(d.getDate()).padStart(2,"0")}-${String(d.getMonth()+1).padStart(2,"0")}-${d.getFullYear()}`
  const fromDate = fmt(weekAgo), toDate = fmt(today)

  console.log(`[FORM] Dates: ${fromDate} → ${toDate}`)
  for (const [sel, val] of [
    ["#from_date_contract_search1, [name='from_date_contract_search1']", fromDate],
    ["#to_date_contract_search1,   [name='to_date_contract_search1']",   toDate],
  ]) {
    await page.click(sel, { clickCount: 3 }).catch(() => {})
    await page.keyboard.type(val).catch(() => {})
  }
  await page.selectOption("select#buyer_category", "").catch(() => {})
  await sleep(400)

  // ── Captcha ─────────────────────────────────────────────────────────────────
  console.log("\n══════════════════════════════════════════════════════════════════")
  console.log("  GeM PDF Acquisition PoC")
  console.log("══════════════════════════════════════════════════════════════════")
  console.log(`\n  Date range ${fromDate} → ${toDate} filled automatically.`)
  console.log("  Type the captcha in the browser. Do NOT click Search.\n")
  await new Promise(resolve => {
    const rl = require("readline").createInterface({ input: process.stdin, output: process.stdout })
    rl.question("  Press Enter after typing captcha: ", () => { rl.close(); resolve() })
  })

  const clicked = await page.click(
    "#searchlocation1, button#searchlocation1, [id='searchlocation1']"
  ).then(() => true).catch(() => false)
  console.log(`\n[SEARCH] Clicked: ${clicked}`)

  await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {})
  await sleep(2000)

  const bodyText = await page.evaluate(() => document.body.innerText).catch(() => "")
  if (/invalid captcha/i.test(bodyText)) {
    console.log("[ERROR] Invalid captcha — re-run."); await browser.close(); process.exit(1)
  }

  // ── Poll for cards ──────────────────────────────────────────────────────────
  for (let i = 0; i < 25; i++) {
    const n = await page.$$eval("div#pagi_content div.border.block", els => els.length).catch(() => 0)
    process.stdout.write(`\r[POLL] t+${String(i).padStart(2,"0")}s  cards: ${n}   `)
    if (n > 0) { console.log("→ found"); break }
    await sleep(1000)
  }
  console.log()

  // ── Collect GEMC IDs ────────────────────────────────────────────────────────
  const gemcIds = await page.$$eval(
    "div#pagi_content div.border.block",
    (blocks, max) => blocks
      .map(b => b.querySelector(".ajxtag_order_number")?.innerText?.replace(/\s+/g," ").trim() || null)
      .filter(t => t?.startsWith("GEMC"))
      .slice(0, max),
    MAX_CONTRACTS
  ).catch(() => [])

  if (gemcIds.length === 0) {
    console.log("[ERROR] No GEMC IDs found."); await browser.close(); return
  }
  console.log(`[CARDS] Processing ${gemcIds.length} contracts: ${gemcIds.join("  |  ")}`)

  // ── Process each GEMC ──────────────────────────────────────────────────────
  for (let idx = 0; idx < gemcIds.length; idx++) {
    const gemcId = gemcIds[idx]
    const id     = slug(gemcId)
    const pdfPath  = path.join(OUT_PDFS,  id + ".pdf")
    const txtPath  = path.join(OUT_TEXT,  id + ".txt")
    const jsonPath = path.join(OUT_JSON,  id + ".json")

    console.log(`\n${"═".repeat(70)}`)
    console.log(`  [${idx+1}/${gemcIds.length}] ${gemcId}`)
    console.log("═".repeat(70))

    const record = {
      gemcId,
      pdfPath:       pdfPath,
      pdfSizeBytes:  null,
      downloadOk:    false,
      downloadLayer: null,
      parseOk:       false,
      pageCount:     null,
      confidence:    null,
      foundCount:    null,
      totalFields:   SCORED_FIELDS.length,
      fields:        {},
      errors:        [],
    }

    try {
      // A: captcha.php
      console.log("\n  [A] captcha.php ...")
      const cap = await page.evaluate(async () => {
        const res  = await fetch("https://gem.gov.in/assets/phpcaptcha/captcha.php?ajax=1&rand=" + Math.random(),
          { method: "POST", body: new URLSearchParams({}) })
        const obj  = JSON.parse(await res.text())
        return { text: obj.text || null }
      })
      console.log(`      answer: "${cap.text}"`)

      // B: sbtCaptcha — server ignores captcha, only needs oid
      console.log("  [B] sbtCaptcha ...")
      const sbt = await page.evaluate(async (oid) => {
        const res  = await fetch("https://gem.gov.in/view_contracts/sbtCaptcha", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ oid }).toString(),
        })
        const obj  = JSON.parse(await res.text())
        const m    = (obj.code || "").match(/href="([^"]+)"/)
        return { status: obj.status, url: m ? m[1] : null }
      }, gemcId)

      console.log(`      status: ${sbt.status}  url: ${sbt.url || "(none)"}`)
      if (!sbt.url) { record.errors.push("No download URL"); summaryRows.push(record); continue }

      // C: Download PDF
      console.log("  [C] Downloading PDF ...")
      try {
        record.downloadLayer = await downloadPdf(context, page, sbt.url, pdfPath)
        record.pdfSizeBytes  = fs.statSync(pdfPath).size
        record.downloadOk    = true
        console.log(`      Saved (${record.downloadLayer}): ${pdfPath}  [${record.pdfSizeBytes.toLocaleString()} bytes]`)
      } catch (e) {
        record.errors.push("Download failed: " + e.message)
        console.log(`      [FAIL] ${e.message}`)
        summaryRows.push(record); continue
      }

      // D: Parse PDF
      console.log("  [D] Parsing PDF ...")
      try {
        const pdfBuf  = fs.readFileSync(pdfPath)
        const pdfData = await pdfParse(pdfBuf, { max: 0 })
        record.pageCount  = pdfData.numpages
        record.parseOk    = true

        // Save raw text
        fs.writeFileSync(txtPath, pdfData.text, "utf8")
        console.log(`      Pages: ${pdfData.numpages}  Chars: ${pdfData.text.length}  → ${txtPath}`)

        // E: Extract fields
        console.log("  [E] Extracting fields ...")
        const parsed       = parseContractPdf(pdfData.text)
        record.fields      = parsed.fields
        record.confidence  = parsed.confidence
        record.foundCount  = parsed.foundCount

        // Save structured JSON
        const jsonOut = {
          gemcId,
          extractedAt: new Date().toISOString(),
          pdfPath, pdfSizeBytes: record.pdfSizeBytes,
          pageCount:   record.pageCount,
          confidence:  record.confidence,
          foundCount:  record.foundCount,
          totalFields: record.totalFields,
          fields:      record.fields,
        }
        fs.writeFileSync(jsonPath, JSON.stringify(jsonOut, null, 2), "utf8")
        console.log(`      Confidence: ${record.confidence}%  (${record.foundCount}/${record.totalFields} fields found)`)
        console.log(`      JSON → ${jsonPath}`)

        Object.entries(record.fields).forEach(([k, v]) =>
          console.log(`      ${k.padEnd(22)}: ${v ?? "(not found)"}`)
        )

        // Print first 2 pages (~3000 chars) of raw text
        const preview = pdfData.text.slice(0, 3000)
        console.log(`\n${"─".repeat(70)}`)
        console.log(`  RAW TEXT — ${gemcId} (first ~2 pages)`)
        console.log("─".repeat(70))
        console.log(preview)
        console.log("─".repeat(70))

      } catch (e) {
        record.errors.push("PDF parse: " + e.message)
        console.log(`      [WARN] ${e.message}`)
      }

    } catch (e) {
      record.errors.push("Outer: " + e.message)
      console.log(`  [ERROR] ${e.message}`)
    }

    summaryRows.push(record)
    await sleep(1500)
  }

  // ── Summary table ──────────────────────────────────────────────────────────
  const yn = v => v !== null && v !== undefined ? " Y " : " N "

  console.log("\n" + "═".repeat(70))
  console.log("  EXTRACTION SUMMARY")
  console.log("═".repeat(70))
  console.log(
    "  GEMC".padEnd(32) +
    "PDF  Parse  Sel  GST  Buy  Con  OEM  Val  Conf"
  )
  console.log("  " + "─".repeat(68))

  for (const r of summaryRows) {
    const f = r.fields
    console.log(
      `  ${r.gemcId.padEnd(30)}` +
      `${r.downloadOk ? " Y " : " N "}` +
      `${r.parseOk    ? " Y " : " N "}  ` +
      `${yn(f.seller_name)}` +
      `${yn(f.gstin)}` +
      `${yn(f.buyer_name)}` +
      `${yn(f.consignee_name)}` +
      `${yn(f.oem_name)}` +
      `${yn(f.contract_value)}` +
      `  ${r.confidence != null ? r.confidence + "%" : " — "}`
    )
    if (r.errors.length) console.log(`    Errors: ${r.errors.join(" | ")}`)
  }

  // Save master summary JSON
  const masterPath = path.join(OUT_ROOT, "summary.json")
  fs.writeFileSync(masterPath, JSON.stringify(summaryRows.map(r => ({
    gemcId:        r.gemcId,
    downloadOk:    r.downloadOk,
    parseOk:       r.parseOk,
    pdfSizeBytes:  r.pdfSizeBytes,
    pageCount:     r.pageCount,
    confidence:    r.confidence,
    foundCount:    r.foundCount,
    totalFields:   r.totalFields,
    fields:        r.fields,
    errors:        r.errors,
  })), null, 2))

  console.log(`\n  Output folder : ${OUT_ROOT}`)
  console.log(`  Summary JSON  : ${masterPath}`)
  console.log("═".repeat(70))

  await browser.close()
})().catch(e => { console.error("\nFATAL:", e.message); process.exit(1) })
