"use strict";
// GeM View Contracts PoC — expanded category search
// Opens a visible browser; type captcha manually when prompted.
// Run: node scripts/gem-contracts-poc.js
// Output: audit/contracts-poc-YYYY-MM-DD.json + final report

const path      = require("path")
const fs        = require("fs")
const readline  = require("readline")
const { chromium } = require("playwright")
const { MongoClient } = require("mongodb")

function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env.local")
  const lines = fs.readFileSync(envPath, "utf8").split("\n")
  for (const line of lines) {
    const m = line.match(/^([^=#\s][^=]*)=(.*)$/)
    if (m) process.env[m[1].trim()] = m[2].trim()
  }
}

// ── Categories to search (12 total — 4 original + 8 expanded) ────────────────
// Tier 1: Direct fogging / ULV / disinfection spraying equipment
// Tier 2: Agricultural sprayers (overlapping dealer base)
// Tier 3: ULV insecticide chemicals (same vendors often supply machine + chemical)
const CATEGORIES = [
  // ── TIER 1: Core fogging & disinfection ──────────────────────────────────
  { val: "home_fa68031381_agri_disp_fogg",          label: "Fogging Machine (V2)",               tier: 1 },
  { val: "home_fa68031381_agri_disp_fogo",          label: "Fog or Mist Generators",             tier: 1 },
  { val: "home_live_pest_pe38147474_cy65684188",    label: "Cypermethrin Smoke Generator",       tier: 1 },
  { val: "home_medi_me43558647_inst_powe",          label: "Power Spray Machine (Disinfection)", tier: 1 },
  { val: "home_dist_in40220274_pump_sani",          label: "Hand Spray Pumps / Sprayers / Misters", tier: 1 },
  { val: "home_medi_me43558647_inst_ultr",          label: "Ultrasonic Fog Sanitizer",           tier: 1 },
  { val: "home_heal_dise_dise_full",                label: "Full Body Sanitizer Spray Chamber",  tier: 1 },

  // ── TIER 2: Agricultural sprayers (overlapping dealer base) ──────────────
  { val: "home_fa68031381_agri_agri_powe",          label: "Power Sprayer",                      tier: 2 },
  { val: "home_fa68031381_agri_disp_manu",          label: "Manually Operated Knapsack Sprayer", tier: 2 },
  { val: "home_fa68031381_agri_disp_cr62830384",    label: "Hand Knapsack Sprayer (Compression)", tier: 2 },

  // ── TIER 3: ULV chemicals (fogging machine vendors supply both) ───────────
  { val: "home_live_pest_pe38147474_ma08607807",    label: "Malathion 96% ULV",                  tier: 3 },
  { val: "home_live_pest_pe38147474_de16861203",    label: "Deltamethrin ULV (V2)",              tier: 3 },
]

// Date range: last 365 days
function dateRange() {
  const today = new Date()
  const from  = new Date(today)
  from.setDate(from.getDate() - 365)
  const fmt = d => `${String(d.getDate()).padStart(2,"0")}-${String(d.getMonth()+1).padStart(2,"0")}-${d.getFullYear()}`
  return { from: fmt(from), to: fmt(today) }
}

function canonicalize(name) {
  return (name || "")
    .replace(/^(M\/S\.?|M\.S\.?|SH\.|SMT\.|MR\.|DR\.)\s*/i, "")
    .toUpperCase()
    .trim()
}

function ask(q) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(res => rl.question(q, a => { rl.close(); res(a.trim()) }))
}

async function scrapePage(page, categoryLabel) {
  // Table-based layout (most common on GeM)
  const rows = await page.$$eval(
    "table.table tbody tr, table tbody tr",
    (els, catLabel) => {
      const results = []
      for (const el of els) {
        const cells = Array.from(el.querySelectorAll("td")).map(td => td.innerText.trim())
        if (cells.length < 3) continue
        results.push({
          raw: cells,
          gemc:     cells[0] || "",
          seller:   cells[1] || "",
          dept:     cells[2] || "",
          value:    cells[3] || "",
          date:     cells[4] || "",
          product:  cells[5] || catLabel,
          category: catLabel,
        })
      }
      return results
    },
    categoryLabel
  ).catch(() => [])

  if (rows.length > 0) return rows

  // Card-based layout fallback
  return await page.$$eval(
    ".contract_details, .result_box, .gem-contract-card, div[class*='contract'], div[class*='result']",
    (els, catLabel) => els.map(el => ({
      raw:      [el.innerText.trim().slice(0, 200)],
      gemc:     el.querySelector(".gemc_no, [class*='gemc']")?.innerText.trim() || "",
      seller:   el.querySelector(".seller, [class*='seller'], [class*='vendor']")?.innerText.trim() || "",
      dept:     el.querySelector(".dept, [class*='dept'], [class*='buyer']")?.innerText.trim() || "",
      value:    el.querySelector(".value, [class*='value'], [class*='amount']")?.innerText.trim() || "",
      date:     el.querySelector(".date, [class*='date']")?.innerText.trim() || "",
      product:  el.querySelector(".product, [class*='product'], [class*='item']")?.innerText.trim() || catLabel,
      category: catLabel,
    })),
    categoryLabel
  ).catch(() => [])
}

async function clickNextPage(page) {
  const nextBtn = await page.$(
    "a.page-link:text('Next'), li.next a, [aria-label='Next'], .pagination .next a, a:text('Next >')"
  ).catch(() => null)
  if (!nextBtn) return false
  const isDisabled = await nextBtn.evaluate(
    el => el.closest("li")?.classList.contains("disabled") || el.getAttribute("aria-disabled") === "true"
  )
  if (isDisabled) return false
  await nextBtn.click()
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {})
  return true
}

async function dumpHtml(page, label) {
  const html  = await page.content()
  const fname = `audit/contracts-poc-debug-${label.replace(/\s+/g, "_").slice(0, 40)}.html`
  fs.writeFileSync(fname, html)
  console.log(`  [debug] HTML → ${fname}`)
}

// ── Main ───────────────────────────────────────────────────────────────────────
;(async () => {
  loadEnv()
  fs.mkdirSync("audit", { recursive: true })

  const dateStr      = new Date().toISOString().slice(0, 10)
  const outFile      = `audit/contracts-poc-${dateStr}.json`
  const allContracts = []

  const browser = await chromium.launch({ headless: false, slowMo: 100 })
  const context = await browser.newContext()
  const page    = await context.newPage()

  const { from: fromDate, to: toDate } = dateRange()
  console.log("\n" + "═".repeat(60))
  console.log("  GeM VIEW CONTRACTS PoC — EXPANDED SEARCH")
  console.log("═".repeat(60))
  console.log(`  Date range         : ${fromDate} → ${toDate}`)
  console.log(`  Categories (total) : ${CATEGORIES.length}`)
  console.log(`    Tier 1 (core)    : ${CATEGORIES.filter(c => c.tier === 1).length} categories`)
  console.log(`    Tier 2 (agri)    : ${CATEGORIES.filter(c => c.tier === 2).length} categories`)
  console.log(`    Tier 3 (chemical): ${CATEGORIES.filter(c => c.tier === 3).length} categories`)
  console.log("  Record cap         : 600 (stop pagination at this threshold)")
  console.log("─".repeat(60))

  let currentTier = 0
  for (const cat of CATEGORIES) {
    if (cat.tier !== currentTier) {
      currentTier = cat.tier
      console.log(`\n${"─".repeat(60)}`)
      console.log(`  TIER ${cat.tier} categories starting`)
      console.log("─".repeat(60))
    }

    console.log(`\n▶ [${allContracts.length} records so far]  ${cat.label}`)
    console.log(`  Category value: ${cat.val}`)

    await page.goto("https://gem.gov.in/view_contracts", {
      waitUntil: "networkidle",
      timeout:   40000,
    })

    // Select category
    await page.selectOption("select#buyer_category", cat.val).catch(async () => {
      console.log("  [warn] selectOption by value failed — trying by label")
      await page.selectOption("select#buyer_category", { label: cat.label }).catch(() => {})
    })
    await page.waitForTimeout(500)

    // Set date range (triple-click + type handles all date-picker variants)
    const fromSel = "#from_date_contract_search1, [name='from_date_contract_search1']"
    const toSel   = "#to_date_contract_search1, [name='to_date_contract_search1']"
    for (const [sel, val] of [[fromSel, fromDate], [toSel, toDate]]) {
      await page.click(sel, { clickCount: 3 }).catch(() => {})
      await page.keyboard.type(val).catch(() => {})
    }
    await page.waitForTimeout(500)

    console.log("\n  *** CAPTCHA REQUIRED ***")
    console.log("  1. Look at the GeM browser window")
    console.log(`  2. Verify the date range shows ${fromDate} → ${toDate}`)
    console.log("  3. Type the captcha code into the captcha field IN THE BROWSER")
    console.log("  4. Return here and press Enter (do NOT click Search in the browser)")
    await ask("\n  Press Enter when captcha is typed: ")

    // Click search
    const clicked = await page.click(
      "#searchlocation1, button#searchlocation1, [id='searchlocation1']"
    ).then(() => true).catch(() => false)

    if (!clicked) {
      console.log("  [warn] Could not find Search button — dumping HTML for inspection")
      await dumpHtml(page, cat.label + "_pre_search")
      continue
    }

    await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {})
    await page.waitForTimeout(1000)

    const pageText = await page.evaluate(() => document.body.innerText).catch(() => "")
    const textLow  = pageText.toLowerCase()

    if (textLow.includes("invalid captcha")) {
      console.log("  [!] Invalid captcha — skipping this category (re-run to retry)")
      await dumpHtml(page, cat.label + "_captcha_error")
      continue
    }
    if (textLow.includes("no record") || textLow.includes("no result") || textLow.includes("no data")) {
      console.log(`  [info] No results found for: ${cat.label}`)
      continue
    }

    let pageNum  = 1
    let catTotal = 0
    while (true) {
      const rows = await scrapePage(page, cat.label)

      if (rows.length === 0) {
        console.log(`  [info] Page ${pageNum}: no structured rows found — dumping HTML`)
        await dumpHtml(page, `${cat.label}_page${pageNum}`)
        break
      }

      allContracts.push(...rows)
      catTotal += rows.length
      console.log(`  Page ${pageNum}: ${rows.length} rows  |  Running total: ${allContracts.length}`)

      // Save after every page
      fs.writeFileSync(outFile, JSON.stringify(allContracts, null, 2))

      if (allContracts.length >= 600) {
        console.log("  [cap] 600 record limit reached — stopping pagination")
        break
      }

      const hasNext = await clickNextPage(page)
      if (!hasNext) break
      pageNum++
      await page.waitForTimeout(1000)
    }

    console.log(`  ✓ ${cat.label}: ${catTotal} records`)
  }

  await browser.close()

  if (allContracts.length === 0) {
    console.log("\n[!] Zero contract records collected.")
    console.log("Check the debug HTML files in audit/ for the actual page structure.")
    console.log("The selectors may need updating based on what GeM actually renders.")
    process.exit(0)
  }

  // ── Dedup by GEMC number ───────────────────────────────────────────────────
  const seen  = new Set()
  const dedup = allContracts.filter(c => {
    const key = c.gemc || JSON.stringify(c.raw)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  console.log(`\nDedup: ${allContracts.length} raw → ${dedup.length} unique`)
  fs.writeFileSync(outFile, JSON.stringify(dedup, null, 2))

  // ── MongoDB comparison ─────────────────────────────────────────────────────
  console.log("\nConnecting to MongoDB…")
  const client  = new MongoClient(process.env.MONGODB_URI)
  await client.connect()
  const db      = client.db()
  const dealers = await db.collection("gem_dealers")
    .find({}, { projection: { canonical_name: 1, l1_wins: 1 } })
    .toArray()
  await client.close()

  const knownSet = new Set(dealers.map(d => d.canonical_name))
  console.log(`Loaded ${knownSet.size} canonical names from gem_dealers`)

  const counts      = { known: 0, new: 0, blank: 0 }
  const newDealers  = {}
  const deptCounts  = {}
  const stateCounts = {}
  const uniqueSellers = new Set()

  for (const c of dedup) {
    const canon = canonicalize(c.seller)
    c.canonical = canon

    if (!canon) {
      c.status = "blank"
      counts.blank++
    } else {
      uniqueSellers.add(canon)
      if (knownSet.has(canon)) {
        c.status = "known"
        counts.known++
      } else {
        c.status = "new"
        counts.new++
        newDealers[canon] = (newDealers[canon] || 0) + 1
      }
    }

    // Department tally
    if (c.dept) {
      const dept = c.dept.trim().slice(0, 80)
      deptCounts[dept] = (deptCounts[dept] || 0) + 1
    }

    // State extraction (last word of dept field that matches a known state abbreviation)
    const stateMatch = (c.dept || "").match(
      /\b(Rajasthan|Maharashtra|UP|Uttar Pradesh|Karnataka|Tamil Nadu|Gujarat|Delhi|Madhya Pradesh|Bihar|West Bengal|Andhra Pradesh|Haryana|Kerala|Punjab|Odisha|Assam|Jharkhand|Uttarakhand|Himachal Pradesh|Goa|Tripura|Manipur|Meghalaya|Nagaland|Arunachal Pradesh|Mizoram|Sikkim|J&K|Jammu|Ladakh|Chandigarh|Puducherry)\b/i
    )
    if (stateMatch) {
      const st = stateMatch[1]
      stateCounts[st] = (stateCounts[st] || 0) + 1
    }
  }

  fs.writeFileSync(outFile, JSON.stringify(dedup, null, 2))

  // ── Final Report ───────────────────────────────────────────────────────────
  const total    = dedup.length
  const newPct   = total > 0 ? Math.round((counts.new / total) * 100) : 0
  const knownPct = total > 0 ? Math.round((counts.known / total) * 100) : 0

  const top50New = Object.entries(newDealers)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)

  const top20Depts = Object.entries(deptCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)

  const top10States = Object.entries(stateCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  console.log("\n" + "═".repeat(60))
  console.log("  VIEW CONTRACTS PoC — FINAL REPORT")
  console.log("═".repeat(60))
  console.log(`  Total unique contracts        : ${total}`)
  console.log(`  Unique sellers               : ${uniqueSellers.size}`)
  console.log(`  Known dealers (gem_dealers)  : ${counts.known} (${knownPct}%)`)
  console.log(`  Net-NEW dealers (catalog-only): ${counts.new} (${newPct}%)`)
  console.log(`  Blank / unreadable names     : ${counts.blank}`)
  console.log("")
  console.log(`  Categories searched : ${CATEGORIES.length}`)
  console.log(`  Date range          : ${fromDate} → ${toDate}`)
  console.log("")

  if (top50New.length > 0) {
    console.log(`  Top ${Math.min(top50New.length, 50)} net-new sellers (catalog-only):`)
    top50New.forEach(([name, n], i) =>
      console.log(`    ${String(i + 1).padStart(2)}. ${name} (${n} contracts)`)
    )
    console.log("")
  }

  if (top20Depts.length > 0) {
    console.log("  Top buying departments:")
    top20Depts.forEach(([dept, n], i) =>
      console.log(`    ${String(i + 1).padStart(2)}. ${dept} (${n} contracts)`)
    )
    console.log("")
  }

  if (top10States.length > 0) {
    console.log("  Top states by contract volume:")
    top10States.forEach(([st, n], i) =>
      console.log(`    ${String(i + 1).padStart(2)}. ${st} (${n} contracts)`)
    )
    console.log("")
  }

  console.log("─".repeat(60))
  if (newPct >= 20) {
    console.log("  VERDICT: ✓ BUILD")
    console.log("  Net-new dealer discovery exceeds 20% threshold.")
    console.log("  Recommendation: Build full View Contracts harvester.")
  } else {
    console.log("  VERDICT: ✗ DEFER")
    console.log("  Net-new dealer discovery is below 20% threshold.")
    console.log("  Recommendation: Skip View Contracts system for now.")
  }
  console.log("═".repeat(60))
  console.log(`\nFull data saved to: ${outFile}`)
})().catch(e => { console.error("FATAL:", e.message); process.exit(1) })
