"use strict"
/**
 * gem-bidder-poc.js
 *
 * Proof-of-concept: bidder extraction from GeM BidPlus.
 *
 * Phase 1 (browser): Use Playwright to search BidPlus for awarded/evaluated
 *   fogging machine bids and collect their getSinglePacketResultView page IDs.
 *
 * Phase 2 (HTTP): For each page ID, fetch the result page and extract
 *   L1/L2/L3 bidder names, prices, department, state, tender value.
 *
 * Phase 3 (report): Print success/failure counts and exact failure reasons.
 *
 * Usage:
 *   node scripts/gem-bidder-poc.js
 *   node scripts/gem-bidder-poc.js --headless   (no browser window)
 *   node scripts/gem-bidder-poc.js --skip-phase1 (reuse saved page IDs)
 */

const { chromium } = require("playwright")
const https        = require("https")
const fs           = require("fs")
const path         = require("path")

const HEADLESS      = process.argv.includes("--headless")
const SKIP_PHASE1   = process.argv.includes("--skip-phase1")
const IDS_FILE      = path.join(__dirname, "gem-poc-ids.json")
const RESULTS_FILE  = path.join(__dirname, "gem-poc-results.json")
const DETAIL_BASE   = "https://bidplus.gem.gov.in/bidding/bid/getSinglePacketResultView/"

// ─── Phase 2: HTTP fetch ─────────────────────────────────────────────────────

function fetchPage(id) {
  return new Promise(resolve => {
    const url  = `${DETAIL_BASE}${id}`
    const opts = {
      timeout: 15000,
      headers: {
        "User-Agent":      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept":          "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-IN,en;q=0.9",
        "Referer":         "https://bidplus.gem.gov.in/all-bids",
      },
    }
    const req = https.get(url, opts, res => {
      if (res.statusCode !== 200) {
        res.resume()
        return resolve({ ok: false, reason: `HTTP ${res.statusCode}`, html: null })
      }
      const chunks = []
      res.on("data", c => chunks.push(c))
      res.on("end",  () => resolve({ ok: true, html: Buffer.concat(chunks).toString("utf8") }))
      res.on("error", e => resolve({ ok: false, reason: `stream: ${e.message}`, html: null }))
    })
    req.on("error",   e => resolve({ ok: false, reason: `req: ${e.message}`, html: null }))
    req.on("timeout", () => { req.destroy(); resolve({ ok: false, reason: "timeout", html: null }) })
  })
}

// ─── Phase 2: HTML → text ────────────────────────────────────────────────────

function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi,   " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|tr|td|th|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim()
}

// ─── Phase 2: Parser ─────────────────────────────────────────────────────────

const STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chandigarh","Chhattisgarh",
  "Delhi","Goa","Gujarat","Haryana","Himachal Pradesh","Jammu and Kashmir","Jharkhand",
  "Karnataka","Kerala","Ladakh","Madhya Pradesh","Maharashtra","Manipur","Meghalaya",
  "Mizoram","Nagaland","Odisha","Puducherry","Punjab","Rajasthan","Sikkim","Tamil Nadu",
  "Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
].sort((a, b) => b.length - a.length)

function first(t, ...ps) {
  for (const p of ps) { const m = t.match(p); if (m?.[1]?.trim()) return m[1].trim() }
  return null
}
function cleanMoney(s) {
  const n = Number(String(s).replace(/[₹,\s]/g, "").replace(/\.\d+$/, ""))
  return isNaN(n) || n <= 0 ? null : n
}
function normDate(s) {
  const m = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/)
  return m ? `${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}` : s
}

function parseBid(text, pageId) {
  const bidMatch = text.match(/\b(GEM\/\d{4}\/[A-Z]+\/\d+)\b/i)
  if (!bidMatch) return { error: "no_bid_number", pageId }
  const bid_number = bidMatch[1].toUpperCase()

  let state = ""
  for (const s of STATES) {
    if (new RegExp(`\\b${s}\\b`, "i").test(text)) { state = s; break }
  }

  const dept = (first(text,
    /(?:Buyer(?:\s+Name)?|Organisation\s+Name|Consignee\s+Org)\s*[:\-]\s*([^\n]+)/i,
    /(?:Department)\s*[:\-]\s*([^\n]+)/i,
  ) || "").replace(/\s+/g, " ").trim()

  const COMPANY_RE = /\b(?:PRIVATE\s+LIMITED|PVT\.?\s*LTD\.?|LTD\.?|LLP|ENTERPRISES|INDUSTRIES|TRADERS|AGENCIES)\b/i
  const productLine = (() => {
    const labeled = first(text,
      /(?:Item(?:\s+Description)?|Product(?:\s+(?:Description|Name))?)\s*[:\-]\s*([^\n]{3,80})/i,
      /(?:Item|Product)\s*[:\-]\s*([^\n]{3,80})/i,
    )
    if (labeled && !COMPANY_RE.test(labeled)) return labeled.trim()
    const kw = first(text, /(Fogging Machine[^\n]{0,80})/i, /((?:Thermal\s+)?Fogger[^\n]{0,60})/i)
    if (kw && !COMPANY_RE.test(kw)) return kw.trim()
    return ""
  })()

  const DR  = "(?:(?:\\d{1,2})[-\\/](?:\\d{1,2})[-\\/](?:\\d{4}))"
  const pd  = first(text, new RegExp(`(?:Bid\\s*(?:Publish|Start)\\s*Date)[:\\-\\s]+(${DR})`, "i"))
  const ed  = first(text, new RegExp(`(?:Bid\\s*(?:End|Close)\\s*Date)[:\\-\\s]+(${DR})`, "i"))

  const status = (() => {
    if (/L[-\s]?1\s*(Bidder|Firm)/i.test(text)) return "awarded"
    const s = (first(text, /(?:Bid\s*Status)\s*[:\-]\s*([^\n,]{1,30})/i) || "").toLowerCase()
    if (/award|conclud/.test(s)) return "awarded"
    if (/financial/.test(s))     return "financial_eval"
    if (/technical/.test(s))     return "technical_eval"
    if (/cancel/.test(s))        return "cancelled"
    return "published"
  })()

  const l1n = (first(text, /L[-\s]?1\s*(?:Bidder|Firm|Supplier)[:\-\s]+([^\n]+)/i) || "").replace(/\s+/g, " ")
  const l1p = (() => { const v = first(text, /L[-\s]?1[^\n]{0,30}₹\s*([\d,]+(?:\.\d+)?)/i); return v ? cleanMoney(v) : null })()
  const l2n = (first(text, /L[-\s]?2\s*(?:Bidder|Firm|Supplier)[:\-\s]+([^\n]+)/i) || "").replace(/\s+/g, " ")
  const l2p = (() => { const v = first(text, /L[-\s]?2[^\n]{0,30}₹\s*([\d,]+(?:\.\d+)?)/i); return v ? cleanMoney(v) : null })()
  const l3n = (first(text, /L[-\s]?3\s*(?:Bidder|Firm|Supplier)[:\-\s]+([^\n]+)/i) || "").replace(/\s+/g, " ")
  const l3p = (() => { const v = first(text, /L[-\s]?3[^\n]{0,30}₹\s*([\d,]+(?:\.\d+)?)/i); return v ? cleanMoney(v) : null })()
  const est = (() => { const m = text.match(/(?:Total\s*Estimated|Consignee\s*Estimated)[:\-]?\s*₹?\s*([\d,]+(?:\.\d+)?)/i); return m ? cleanMoney(m[1]) : null })()
  const bdr = first(text, /(?:Total\s*(?:No\.?\s*of\s*)?Bidders?)[:\-\s]+(\d+)/i)

  return {
    page_id: pageId,
    bid_number, department_name: dept, state,
    product_name_raw: productLine,
    estimated_value_inr: est,
    current_status: status,
    publish_date: pd ? normDate(pd) : null,
    bid_end_date:  ed ? normDate(ed) : null,
    l1_dealer_name: l1n, l1_price_inr: l1p,
    l2_dealer_name: l2n, l2_price_inr: l2p,
    l3_dealer_name: l3n, l3_price_inr: l3p,
    total_bidders_count: bdr ? parseInt(bdr) : null,
  }
}

// ─── Phase 1: Browser automation ─────────────────────────────────────────────

// ─── Phase 1b: Direct API approach (no browser needed after CSRF grab) ────────

async function callAllBidsApi(payload, csrfToken) {
  return new Promise(resolve => {
    const body = `payload=${encodeURIComponent(JSON.stringify(payload))}&csrf_bd_gem_nk=${csrfToken}`
    const opts = {
      method: "POST",
      hostname: "bidplus.gem.gov.in",
      path: "/all-bids-data",
      headers: {
        "Content-Type":  "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(body),
        "User-Agent":     "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer":        "https://bidplus.gem.gov.in/all-bids",
        "X-Requested-With": "XMLHttpRequest",
      },
    }
    const req = require("https").request(opts, res => {
      const chunks = []
      res.on("data", c => chunks.push(c))
      res.on("end",  () => {
        try { resolve({ ok: true, data: JSON.parse(Buffer.concat(chunks).toString("utf8")) }) }
        catch(e) { resolve({ ok: false, reason: e.message }) }
      })
      res.on("error", e => resolve({ ok: false, reason: e.message }))
    })
    req.on("error", e => resolve({ ok: false, reason: e.message }))
    req.write(body)
    req.end()
  })
}

async function findFoggingBidPageIds() {
  const browser = await chromium.launch({
    headless: HEADLESS,
    args: ["--no-sandbox", "--disable-blink-features=AutomationControlled"],
  })
  const ctx  = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
    locale:    "en-IN",
    viewport:  { width: 1366, height: 768 },
  })
  const page = await ctx.newPage()

  // BidPlus FOGGING MACHINE category ID (confirmed from API response)
  const FOGGING_CAT_IDS = ["home_fa68031381_agri_disp_fogg", "home_fa68031381_agri_disp"]

  const bidEntries = []  // { showDocId, bidNumber, catName }

  try {
    // ── Step 1: Get CSRF token from page ─────────────────────────────────────────
    console.log("\n[Phase 1] Getting CSRF token from BidPlus...")
    await page.goto("https://bidplus.gem.gov.in/all-bids", { waitUntil: "domcontentloaded", timeout: 30000 })
    await page.waitForTimeout(3000)

    const csrfToken = await page.evaluate(() => {
      // CSRF token is embedded in the page or cookies
      const hidden = document.querySelector("input[name='csrf_bd_gem_nk'], meta[name='csrf_bd_gem_nk']")
      if (hidden) return hidden.value || hidden.content
      // Try to extract from page source
      const m = document.documentElement.innerHTML.match(/csrf_bd_gem_nk['":\s]+([a-f0-9]{32})/i)
      return m ? m[1] : null
    })

    // Also try to get it from cookies
    const cookies = await ctx.cookies()
    const csrfCookie = cookies.find(c => c.name.toLowerCase().includes("csrf"))
    const finalCsrf = csrfToken || csrfCookie?.value || ""

    console.log(`  CSRF token: ${finalCsrf ? finalCsrf.slice(0, 8) + "..." : "not found"}`)

    // ── Step 2: Paginate through awarded fogging bids via API ─────────────────────
    // Use browser's fetch to make the API call (handles cookies/session automatically)
    console.log("  Fetching awarded fogging bids from API...")

    let start = 0
    const pageSize = 20
    let totalFogging = 0
    let totalPages = 0

    while (true) {
      const payload = {
        param: { searchBid: "fogging", searchType: "fullText" },
        filter: {
          bidStatusType: "bidrastatus",
          byType: "all",
          highBidValue: "",
          byEndDate: { from: "", to: "" },
          sort: "Bid-End-Date-Latest",
          byStatus: "bid_awarded",
          start: start,
          rows: pageSize,
        },
      }

      const result = await page.evaluate(async ({ payload, csrf }) => {
        const body = `payload=${encodeURIComponent(JSON.stringify(payload))}&csrf_bd_gem_nk=${csrf}`
        const res = await fetch("/all-bids-data", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded", "X-Requested-With": "XMLHttpRequest" },
          body,
        })
        const text = await res.text()
        try { return JSON.parse(text) } catch { return { error: text.slice(0, 200) } }
      }, { payload, csrf: finalCsrf })

      if (result.error || result.status !== 1) {
        console.log(`  API error at start=${start}:`, result.error || JSON.stringify(result).slice(0, 100))
        break
      }

      const docs  = result.response?.response?.docs || []
      const total = result.response?.response?.numFound || 0

      if (totalPages === 0) console.log(`  Total results: ${total} bids matching "fogging" + awarded`)

      // Filter to pure fogging machine bids (not BOQ bids that incidentally contain fogging)
      for (const doc of docs) {
        const catIds   = doc.b_cat_id || []
        const catNames = (doc.b_category_name || doc.bd_category_name || []).join("|")
        const isFoggingBid = catIds.some(c => c.includes("fogg")) ||
                             /fogg/i.test(catNames)

        if (isFoggingBid) {
          const showDocId  = parseInt(doc.id)
          const bidNumber  = (doc.b_bid_number || [])[0] || ""
          const catName    = catIds[0] || ""
          bidEntries.push({ showDocId, bidNumber, catName })
          totalFogging++
        }
      }

      totalPages++
      start += pageSize
      if (start >= total || docs.length === 0 || totalFogging >= 30) break

      // Small delay to avoid hammering the API
      await page.waitForTimeout(500)
    }

    console.log(`  Found ${totalFogging} fogging-specific bids (from ${totalPages} API pages)`)
    if (bidEntries.length > 0) {
      console.log("  Sample:", JSON.stringify(bidEntries.slice(0, 3), null, 2))
    }

  } catch (err) {
    console.error("\n  Phase 1 error:", err.message)
  } finally {
    await browser.close()
  }

  // ── Step 3: Map showbidDocument IDs → getSinglePacketResultView IDs ───────────
  // The showbidDoc ID and resultView ID are in the same sequential space,
  // offset by ~200-400 IDs. Try showDocId first, then +300 as fallback.
  const pageIds = bidEntries.map(e => e.showDocId)

  console.log(`\n  Total page IDs to test: ${pageIds.length}`)
  return { pageIds, bidEntries }
}

// ─── Phase 2: Extract bidder data ────────────────────────────────────────────

async function extractBidderData(pageIds) {
  const results  = []
  let   success  = 0
  let   fail     = 0

  console.log(`\n[Phase 2] Extracting bidder data for ${pageIds.length} page(s)...`)

  for (let i = 0; i < pageIds.length; i++) {
    const id  = pageIds[i]
    const res = await fetchPage(id)
    process.stdout.write(`  [${i+1}/${pageIds.length}] page ${id}: `)

    if (!res.ok) {
      console.log(`FAIL — ${res.reason}`)
      results.push({ page_id: id, ok: false, reason: res.reason })
      fail++
      continue
    }

    const text   = htmlToText(res.html)
    const parsed = parseBid(text, id)

    if (parsed.error) {
      console.log(`FAIL — ${parsed.error}`)
      results.push({ page_id: id, ok: false, reason: parsed.error })
      fail++
      continue
    }

    // Check if there are any bidder records at all
    const hasBidders = parsed.l1_dealer_name || parsed.l2_dealer_name || parsed.l3_dealer_name
    if (!hasBidders) {
      // Partial success — bid parsed but no bidder data (bid might still be open)
      console.log(`PARTIAL — ${parsed.bid_number} (no L1/L2/L3 data, status=${parsed.current_status})`)
      results.push({ page_id: id, ok: "partial", bid_number: parsed.bid_number, reason: "no_bidder_data", ...parsed })
    } else {
      console.log(`OK — ${parsed.bid_number} | ${parsed.department_name?.slice(0,30)} | ${parsed.state} | L1=${parsed.l1_dealer_name?.slice(0,30)} @ ₹${parsed.l1_price_inr?.toLocaleString("en-IN") ?? "?"}`)
      results.push({ page_id: id, ok: true, ...parsed })
      success++
    }
  }

  return { results, success, fail }
}

// ─── Phase 3: Report ─────────────────────────────────────────────────────────

function printReport(results) {
  const ok      = results.filter(r => r.ok === true)
  const partial = results.filter(r => r.ok === "partial")
  const fail    = results.filter(r => r.ok === false)
  const total   = results.length

  console.log("\n" + "═".repeat(70))
  console.log(" BIDDER EXTRACTION PROOF-OF-CONCEPT — REPORT")
  console.log("═".repeat(70))
  console.log(`\n Tenders processed:       ${total}`)
  console.log(` Full extraction (L1+):    ${ok.length} (${total ? Math.round(100*ok.length/total) : 0}%)`)
  console.log(` Partial (no bidder data): ${partial.length} (${total ? Math.round(100*partial.length/total) : 0}%)`)
  console.log(` Failed:                   ${fail.length} (${total ? Math.round(100*fail.length/total) : 0}%)`)

  if (fail.length > 0) {
    console.log("\n FAILURE REASONS:")
    const reasons = {}
    for (const r of fail) reasons[r.reason] = (reasons[r.reason] || 0) + 1
    for (const [reason, count] of Object.entries(reasons)) {
      console.log(`   ${count}x — ${reason}`)
    }
  }

  if (ok.length > 0) {
    console.log("\n SUCCESSFULLY EXTRACTED TENDERS:")
    console.log(" " + "-".repeat(68))
    const header = " #  | Bid Number              | State        | L1 Bidder            | L1 Price"
    console.log(header)
    console.log(" " + "-".repeat(68))
    ok.forEach((r, i) => {
      const num   = String(i+1).padStart(2)
      const bn    = (r.bid_number || "").padEnd(23)
      const st    = (r.state || "").padEnd(12)
      const l1    = (r.l1_dealer_name || "").slice(0, 20).padEnd(20)
      const price = r.l1_price_inr ? `₹${r.l1_price_inr.toLocaleString("en-IN")}` : "N/A"
      console.log(` ${num} | ${bn} | ${st} | ${l1} | ${price}`)
    })
  }

  if (partial.length > 0) {
    console.log("\n PARTIAL RESULTS (bid found, no bidders yet):")
    partial.forEach(r => console.log(`   ${r.bid_number} — ${r.reason} (status: ${r.current_status})`))
  }

  console.log("\n" + "═".repeat(70))

  const successRate = total ? (ok.length / total * 100) : 0
  if (successRate >= 90) {
    console.log(" VERDICT: SUCCESS RATE ≥ 90% — PROCEED TO SCALABLE ARCHITECTURE")
  } else if (successRate > 0) {
    console.log(` VERDICT: SUCCESS RATE ${Math.round(successRate)}% — BELOW 90% — REDESIGN REQUIRED`)
  } else {
    console.log(" VERDICT: ZERO SUCCESSFUL EXTRACTIONS — INVESTIGATION REQUIRED")
  }
  console.log("═".repeat(70) + "\n")
}

// ─── Main ─────────────────────────────────────────────────────────────────────

;(async () => {
  let pageIds
  let bidEntries = []

  if (SKIP_PHASE1 && fs.existsSync(IDS_FILE)) {
    const saved = JSON.parse(fs.readFileSync(IDS_FILE, "utf8"))
    pageIds    = saved.pageIds || saved
    bidEntries = saved.bidEntries || []
    console.log(`[Phase 1 skipped] Loaded ${pageIds.length} page ID(s) from ${IDS_FILE}`)
  } else {
    const phase1 = await findFoggingBidPageIds()
    pageIds    = phase1.pageIds
    bidEntries = phase1.bidEntries
    if (pageIds.length > 0) {
      fs.writeFileSync(IDS_FILE, JSON.stringify({ pageIds, bidEntries }, null, 2))
      console.log(`  Saved ${pageIds.length} page ID(s) to ${IDS_FILE}`)
    }
  }

  if (pageIds.length === 0) {
    console.log("\n[Phase 1] No page IDs found.")
    console.log("  The API returned 0 fogging-specific awarded bids.")
    console.log("  Try expanding the status filter to include 'fin_evaluated' as well.")
    process.exit(1)
  }

  const { results, success, fail } = await extractBidderData(pageIds)

  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2))
  console.log(`\n  Full results saved to ${RESULTS_FILE}`)

  printReport(results)
})()
