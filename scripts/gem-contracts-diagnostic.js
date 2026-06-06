"use strict";
// GeM View Contracts — 3-test diagnostic
// Tests: (1) all-categories (empty select), (2) Bond Paper (high-volume), (3) Fogging Machine
// Run: node scripts/gem-contracts-diagnostic.js
// Output: audit/diag-*.html + console report

const path     = require("path")
const fs       = require("fs")
const readline = require("readline")
const { chromium } = require("playwright")

fs.mkdirSync("audit", { recursive: true })

function ask(q) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(res => rl.question(q, a => { rl.close(); res(a.trim()) }))
}

function dateRange() {
  const today = new Date()
  const from  = new Date(today)
  from.setDate(from.getDate() - 365)
  const fmt = d =>
    `${String(d.getDate()).padStart(2,"0")}-${String(d.getMonth()+1).padStart(2,"0")}-${d.getFullYear()}`
  return { from: fmt(from), to: fmt(today) }
}

// ── Aggressive multi-strategy record extraction ──────────────────────────────
async function extractRecords(page, label) {
  const strategies = {}

  // S1: Standard <table> rows
  strategies.table = await page.$$eval("table tbody tr", rows =>
    rows.map(r => {
      const cells = Array.from(r.querySelectorAll("td")).map(td => td.innerText.trim())
      return cells.length >= 2 ? cells : null
    }).filter(Boolean)
  ).catch(() => [])

  // S2: Any <tr> with 3+ <td>
  strategies.any_tr = await page.$$eval("tr", rows =>
    rows.map(r => {
      const cells = Array.from(r.querySelectorAll("td")).map(td => td.innerText.trim())
      return cells.length >= 3 ? cells : null
    }).filter(Boolean)
  ).catch(() => [])

  // S3: Divs that look like result cards
  strategies.cards = await page.$$eval(
    "div[class*='result'], div[class*='contract'], div[class*='row'], div[class*='record']",
    els => els.map(el => el.innerText.trim().slice(0, 300)).filter(t => t.length > 20)
  ).catch(() => [])

  // S4: All visible text with GEMC pattern
  strategies.gemc_scan = await page.evaluate(() => {
    const text = document.body.innerText
    const matches = text.match(/GEMC-\d{3}-\d{4}-\d+|GEMC\/\d+\/\d+/g) || []
    return [...new Set(matches)]
  }).catch(() => [])

  // S5: Any links that look like contract links
  strategies.contract_links = await page.$$eval("a", els =>
    els.map(a => ({ href: a.href, text: a.innerText.trim() }))
       .filter(a => /GEMC|contract|contr/i.test(a.href + a.text))
       .slice(0, 10)
  ).catch(() => [])

  // S6: Page text summary
  const pageText = await page.evaluate(() => document.body.innerText).catch(() => "")
  const hasNoRecords = /no record|no result|no data|not found|0 record/i.test(pageText)
  const totalCountMatch = pageText.match(/(\d[\d,]+)\s*(records?|results?|contracts?|found)/i)
  const resultCountText = totalCountMatch ? totalCountMatch[0] : null

  return {
    s1_table_rows:    strategies.table.length,
    s2_any_tr_rows:   strategies.any_tr.length,
    s3_cards:         strategies.cards.length,
    s4_gemc_numbers:  strategies.gemc_scan.length,
    s5_contract_links: strategies.contract_links.length,
    gemc_samples:     strategies.gemc_scan.slice(0, 5),
    sample_row:       strategies.table[0] || strategies.any_tr[0] || null,
    sample_card:      strategies.cards[0] || null,
    page_text_snippet: pageText.slice(0, 600),
    has_no_records:   hasNoRecords,
    total_count_text: resultCountText,
  }
}

// ── Check pagination ──────────────────────────────────────────────────────────
async function checkPagination(page) {
  const paginationEl = await page.$("ul.pagination, nav[aria-label*='page'], div.pagination").catch(() => null)
  const nextBtn = await page.$("a:text('Next'), li.next:not(.disabled) a, [aria-label='Next page']").catch(() => null)
  const pageLinks = await page.$$eval(
    "ul.pagination a, .pagination a, [class*='page-link']",
    els => els.map(e => e.innerText.trim()).filter(t => t)
  ).catch(() => [])
  return {
    pagination_element_found: !!paginationEl,
    next_button_found:        !!nextBtn,
    page_links:               pageLinks,
  }
}

// ── Run one test ──────────────────────────────────────────────────────────────
async function runTest(page, testNum, label, categoryVal, fromDate, toDate) {
  console.log(`\n${"═".repeat(60)}`)
  console.log(`  TEST ${testNum}: ${label}`)
  console.log(`  Category value: "${categoryVal || "(empty — all categories)"}"`)
  console.log("═".repeat(60))

  await page.goto("https://gem.gov.in/view_contracts", {
    waitUntil: "networkidle",
    timeout:   40000,
  })

  // Select category (or leave as --Select--)
  if (categoryVal === "") {
    // Leave dropdown at default (--Select--)
    console.log("  Category: leaving at --Select-- (all categories test)")
  } else {
    await page.selectOption("select#buyer_category", categoryVal).catch(async () => {
      console.log("  [warn] selectOption by value failed — trying by label")
      await page.selectOption("select#buyer_category", { label: label }).catch(() =>
        console.log("  [error] Could not select category at all")
      )
    })
  }
  await page.waitForTimeout(500)

  // Fill date range
  const fromSel = "#from_date_contract_search1, [name='from_date_contract_search1']"
  const toSel   = "#to_date_contract_search1, [name='to_date_contract_search1']"
  for (const [sel, val] of [[fromSel, fromDate], [toSel, toDate]]) {
    await page.click(sel, { clickCount: 3 }).catch(() => {})
    await page.keyboard.type(val).catch(() => {})
  }
  await page.waitForTimeout(500)

  // Verify form state before captcha
  const selectedCat = await page.$eval("select#buyer_category option:checked", o => ({
    val: o.value, txt: o.text.trim()
  })).catch(() => null)
  console.log(`  Selected category: ${JSON.stringify(selectedCat)}`)

  console.log("\n  *** CAPTCHA ***")
  console.log(`  Date range: ${fromDate} → ${toDate}`)
  console.log("  Type captcha in browser, then press Enter here.")
  await ask("  Press Enter when captcha is typed: ")

  // Click search
  const clicked = await page.click(
    "#searchlocation1, button#searchlocation1, [id='searchlocation1']"
  ).then(() => true).catch(() => false)

  if (!clicked) {
    console.log("  [ERROR] Search button not found")
    const html = await page.content()
    fs.writeFileSync(`audit/diag-test${testNum}-no-button.html`, html)
    console.log(`  HTML dumped → audit/diag-test${testNum}-no-button.html`)
    return { test: testNum, label, error: "search button not found" }
  }

  await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {})
  await page.waitForTimeout(1500)

  // Extract all diagnostic data
  const data      = await extractRecords(page, label)
  const pagInfo   = await checkPagination(page)

  // Dump HTML for offline inspection
  const htmlFile  = `audit/diag-test${testNum}-${label.replace(/\s+/g,"_").slice(0,20)}.html`
  const html      = await page.content()
  fs.writeFileSync(htmlFile, html)

  // Report
  console.log(`\n  ── RESULTS ──────────────────────────────────────────`)
  console.log(`  Invalid captcha?    : ${/invalid captcha/i.test(data.page_text_snippet) ? "YES — redo" : "No"}`)
  console.log(`  No-records message? : ${data.has_no_records ? "YES" : "No"}`)
  console.log(`  Total count text    : ${data.total_count_text || "not found on page"}`)
  console.log(`\n  Extraction strategies:`)
  console.log(`    S1 table rows     : ${data.s1_table_rows}`)
  console.log(`    S2 any <tr> rows  : ${data.s2_any_tr_rows}`)
  console.log(`    S3 result cards   : ${data.s3_cards}`)
  console.log(`    S4 GEMC numbers   : ${data.s4_gemc_numbers}`)
  console.log(`    S5 contract links : ${data.s5_contract_links}`)
  console.log(`\n  GEMC samples        : ${data.gemc_samples.join(", ") || "none"}`)
  console.log(`  Sample row[0]       : ${JSON.stringify(data.sample_row)?.slice(0,120) || "none"}`)
  console.log(`  Sample card[0]      : ${data.sample_card?.slice(0,120) || "none"}`)
  console.log(`\n  Pagination:`)
  console.log(`    Pagination element: ${pagInfo.pagination_element_found}`)
  console.log(`    Next button found : ${pagInfo.next_button_found}`)
  console.log(`    Page links        : ${pagInfo.page_links.join(" | ") || "none"}`)
  console.log(`\n  Page text snippet:`)
  console.log(`  ${data.page_text_snippet.replace(/\n/g, " | ").slice(0, 400)}`)
  console.log(`\n  HTML saved → ${htmlFile}`)

  // Verdict
  const works = data.s1_table_rows > 0 || data.s2_any_tr_rows > 0 ||
                data.s3_cards > 0 || data.s4_gemc_numbers > 0
  console.log(`\n  VERDICT: ${works ? "✓ DATA FOUND — extraction possible" : "✗ NO STRUCTURED DATA — selectors need updating"}`)

  if (pagInfo.next_button_found && works) {
    console.log("  PAGINATION: ✓ Next page button found — pagination traversal possible")
    const ans = await ask("  Try clicking Next page? (y/n): ")
    if (ans.toLowerCase() === "y") {
      await pagInfo.nextBtn?.click().catch(() => page.click("a:text('Next')").catch(() => {}))
      await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {})
      await page.waitForTimeout(1000)
      const page2data = await extractRecords(page, label + "_p2")
      console.log(`  Page 2 — S1 rows: ${page2data.s1_table_rows} | S2 rows: ${page2data.s2_any_tr_rows} | GEMC: ${page2data.s4_gemc_numbers}`)
    }
  }

  return {
    test:              testNum,
    label,
    category:          categoryVal,
    data_found:        works,
    table_rows:        data.s1_table_rows,
    any_tr_rows:       data.s2_any_tr_rows,
    gemc_count:        data.s4_gemc_numbers,
    gemc_samples:      data.gemc_samples,
    total_count_text:  data.total_count_text,
    pagination:        pagInfo.pagination_element_found,
    next_button:       pagInfo.next_button_found,
    html_file:         htmlFile,
    captcha_fail:      /invalid captcha/i.test(data.page_text_snippet),
    no_records:        data.has_no_records,
  }
}

// ── Main ───────────────────────────────────────────────────────────────────────
;(async () => {
  const { from: fromDate, to: toDate } = dateRange()

  const TESTS = [
    { num: 1, label: "All Categories (empty select)", val: "" },
    { num: 2, label: "Bond Paper (high-volume office)",  val: "home_pape_pape_prin_bond" },
    { num: 3, label: "Fogging Machine (V2)",             val: "home_fa68031381_agri_disp_fogg" },
  ]

  console.log("\n" + "═".repeat(60))
  console.log("  GeM VIEW CONTRACTS — DIAGNOSTIC (3 tests)")
  console.log("═".repeat(60))
  console.log(`  Date range: ${fromDate} → ${toDate}`)
  console.log(`  You will need to solve 3 captchas (one per test).`)
  console.log(`  Each test dumps HTML to audit/ for offline inspection.`)
  console.log("═".repeat(60))

  const browser = await chromium.launch({ headless: false, slowMo: 80 })
  const context = await browser.newContext()
  const page    = await context.newPage()

  const results = []
  for (const t of TESTS) {
    const r = await runTest(page, t.num, t.label, t.val, fromDate, toDate)
    results.push(r)
  }

  await browser.close()

  // ── Summary ─────────────────────────────────────────────────────────────────
  console.log("\n" + "═".repeat(60))
  console.log("  DIAGNOSTIC SUMMARY")
  console.log("═".repeat(60))
  results.forEach(r => {
    console.log(`\n  Test ${r.test}: ${r.label}`)
    if (r.error) { console.log(`    ERROR: ${r.error}`); return }
    if (r.captcha_fail) { console.log("    CAPTCHA FAILED — redo"); return }
    console.log(`    Data found      : ${r.data_found ? "YES" : "NO"}`)
    console.log(`    Table rows      : ${r.table_rows}`)
    console.log(`    GEMC numbers    : ${r.gemc_count}`)
    console.log(`    Total count text: ${r.total_count_text || "not visible"}`)
    console.log(`    Pagination      : ${r.pagination ? "YES" : "NO"}`)
    console.log(`    Next button     : ${r.next_button ? "YES" : "NO"}`)
    console.log(`    HTML            : ${r.html_file}`)
  })

  console.log("\n" + "─".repeat(60))
  const allCatResult = results.find(r => r.test === 1)
  if (allCatResult?.data_found) {
    console.log("  ✓ ALL-CATEGORIES WORKS")
    console.log("  → Redesign PoC to use empty category selection.")
    console.log("  → One captcha per date-range chunk = maximum coverage.")
  } else if (allCatResult?.no_records) {
    console.log("  ✗ ALL-CATEGORIES RETURNED ZERO RESULTS")
    console.log("  → GeM requires a category selection.")
    console.log("  → Proceed with sector-sampling (8 categories, 8 captchas).")
  } else {
    console.log("  ? ALL-CATEGORIES RESULT UNCLEAR — inspect audit/diag-test1-*.html")
  }
  console.log("─".repeat(60))

  fs.writeFileSync("audit/diag-results.json", JSON.stringify(results, null, 2))
  console.log("\n  Full results → audit/diag-results.json")
})().catch(e => { console.error("FATAL:", e.message); process.exit(1) })
