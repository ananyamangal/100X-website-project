"use strict";
// GeM View Contracts Collector — v3
// Architecture: 30-day date chunks, true resume via chunk checkpoint,
//               dual-collection storage (structured + raw card HTML)
//               Card-based extraction — div#pagi_content div.border.block
//               Infinite-scroll pagination — scroll #load_more into view
//
// Usage:
//   node scripts/gem-contracts-collector.js          → 1 chunk (last 30 days)
//   node scripts/gem-contracts-collector.js --full   → all pending chunks (12 months)
//
// Collections written:
//   gem_contracts       — structured, indexed, queryable
//   gem_contracts_raw   — raw card HTML per contract, append-only, reprocessable
//
// Resume: re-run any command — completed chunks are skipped automatically.
//         An interrupted chunk restarts from page 1 of that chunk only.

const path     = require("path")
const fs       = require("fs")
const readline = require("readline")
const { chromium } = require("playwright")
const { MongoClient } = require("mongodb")

// ── Constants ─────────────────────────────────────────────────────────────────
const CHUNK_DAYS  = 30
const TOTAL_DAYS  = 365
const PARSER_VER  = 3          // increment when parseCard() logic changes
const CHECKPOINT  = "audit/contracts-checkpoint.json"

// ── Env ───────────────────────────────────────────────────────────────────────
function loadEnv() {
  const lines = fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf8").split("\n")
  for (const l of lines) {
    const m = l.match(/^([^=#\s][^=]*)=(.*)$/)
    if (m) process.env[m[1].trim()] = m[2].trim()
  }
}

// ── Utilities ─────────────────────────────────────────────────────────────────
function ask(q) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(res => rl.question(q, a => { rl.close(); res(a.trim()) }))
}

function fmtDate(d) {
  return `${String(d.getDate()).padStart(2,"0")}-${String(d.getMonth()+1).padStart(2,"0")}-${d.getFullYear()}`
}

// "27/5/2026 00:07" or "27-05-2026" → ISODate
function parseGemDate(str) {
  if (!str) return null
  const clean = str.split(" ")[0].trim()           // strip time component
  const m = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (!m) return null
  return new Date(`${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}T00:00:00.000Z`)
}

function canonicalize(name) {
  return (name || "")
    .replace(/^(M\/S\.?|M\.S\.?|SH\.|SMT\.|MR\.|DR\.)\s*/i, "")
    .replace(/\s+/g, " ")
    .toUpperCase()
    .trim()
}

// "11160.000" / "₹1,23,456" / "1.23L" → number
function parseValue(raw) {
  if (!raw) return null
  const clean = String(raw).replace(/[₹,\s]/g, "")
  const lakh  = clean.match(/^([\d.]+)[Ll]$/)
  if (lakh) return Math.round(parseFloat(lakh[1]) * 100000)
  const n = parseFloat(clean)
  return isNaN(n) ? null : n
}

// ── Date chunk generation ─────────────────────────────────────────────────────
function generateChunks() {
  const today   = new Date()
  const chunks  = []
  let offset    = 0
  let remaining = TOTAL_DAYS
  let id        = 1
  while (remaining > 0) {
    const size   = Math.min(CHUNK_DAYS, remaining)
    const to_d   = new Date(today); to_d.setDate(to_d.getDate() - offset)
    const from_d = new Date(today); from_d.setDate(from_d.getDate() - offset - size + 1)
    chunks.push({
      id, from: fmtDate(from_d), to: fmtDate(to_d), days: size,
      status: "pending", pagesCollected: 0, recordsInserted: 0, recordsSkipped: 0,
      startedAt: null, completedAt: null, error: null,
    })
    offset += size; remaining -= size; id++
  }
  return chunks
}

// ── Checkpoint ────────────────────────────────────────────────────────────────
function loadCheckpoint() {
  try {
    const saved = JSON.parse(fs.readFileSync(CHECKPOINT, "utf8"))
    if (saved.version === 2 && Array.isArray(saved.chunks)) return saved
  } catch {}
  return null
}

function saveCheckpoint(state) {
  fs.writeFileSync(CHECKPOINT, JSON.stringify(state, null, 2))
}

// ── MongoDB indexes ───────────────────────────────────────────────────────────
async function ensureIndexes(db) {
  const gc  = db.collection("gem_contracts")
  const gcr = db.collection("gem_contracts_raw")

  await gc.createIndex({ gemc_no: 1 },                                      { unique: true, sparse: true, name: "gemc_unique" })
  await gc.createIndex({ contract_date_dt: -1 },                            { name: "idx_date" })
  await gc.createIndex({ contract_value_num: -1 },                          { name: "idx_value" })
  await gc.createIndex({ dept_name: 1 },                                    { name: "idx_dept" })
  await gc.createIndex({ ministry: 1 },                                     { name: "idx_ministry" })
  await gc.createIndex({ org_type: 1 },                                     { name: "idx_org_type" })
  await gc.createIndex({ buying_mode: 1 },                                  { name: "idx_buying_mode" })
  await gc.createIndex({ state: 1 },                                        { name: "idx_state" })
  await gc.createIndex({ product_name: 1 },                                 { name: "idx_product" })
  await gc.createIndex({ seller_name_canonical: 1 },                        { name: "idx_canonical" })
  await gc.createIndex({ state: 1, contract_date_dt: -1 },                  { name: "idx_state_date" })
  await gc.createIndex({ dept_name: 1, contract_date_dt: -1 },              { name: "idx_dept_date" })

  await gcr.createIndex({ gemc_no: 1 }, { unique: true, sparse: true, name: "raw_gemc_unique" })
}

// ── Extraction ────────────────────────────────────────────────────────────────
// S0: card-based — primary strategy for GeM view_contracts.
//     Each div.border.block is one contract. Fields extracted via ajxtag_* classes.
//     Returns objects (not cell arrays) so parseCard() handles them.
//
// S1-S5: table/text fallbacks — kept in case GeM restructures the page.
async function extractPage(page) {
  // S0: card layout inside #pagi_content
  const cards = await page.$$eval(
    "div#pagi_content div.border.block",
    blocks => blocks.map(block => {
      const txt  = sel => block.querySelector(sel)?.innerText?.replace(/\s+/g, " ").trim() || null
      const txts = sel => Array.from(block.querySelectorAll(sel))
                              .map(el => el.innerText?.replace(/\s+/g, " ").trim() || "")

      const buyModes = txts(".ajxtag_buying_mode")    // [ministry, dept, office_zone, buying_mode]
      const deptOrgs = txts(".ajxtag_buyer_dept_org") // [org_type, org_name, buyer_designation]

      return {
        gemc_no:           txt(".ajxtag_order_number"),
        status:            txt(".ajxtag_order_status"),
        contract_date:     txt(".ajxtag_contract_date"),
        total_value:       txt(".ajxtag_totalvalue"),   // first match = contract total, not line-item
        ministry:          buyModes[0] || null,
        department:        buyModes[1] || null,
        office_zone:       buyModes[2] || null,
        buying_mode:       buyModes[3] || null,
        org_type:          deptOrgs[0] || null,
        org_name:          deptOrgs[1] || null,
        buyer_designation: deptOrgs[2] || null,
        product_name:      txt(".ajxtag_item_title"),
        quantity:          txt(".ajxtag_quantity"),
        raw_html:          block.innerHTML,
      }
    })
  ).catch(() => [])
  if (cards.length > 0) return { strategy: "S0_cards", rows: cards }

  // S1: Bootstrap table rows (fallback)
  const s1 = await page.$$eval(
    "table.table tbody tr, .table-responsive table tbody tr",
    rows => rows.map(r => {
      const cells = Array.from(r.querySelectorAll("td")).map(td => td.innerText.replace(/\s+/g," ").trim())
      return cells.length >= 2 ? cells : null
    }).filter(Boolean)
  ).catch(() => [])
  if (s1.length) return { strategy: "S1_table", rows: s1 }

  // S2: Any tr with 3+ cells
  const s2 = await page.$$eval("table tr", rows =>
    rows.map(r => {
      const cells = Array.from(r.querySelectorAll("td")).map(td => td.innerText.replace(/\s+/g," ").trim())
      return cells.length >= 3 ? cells : null
    }).filter(Boolean)
  ).catch(() => [])
  if (s2.length) return { strategy: "S2_any_table", rows: s2 }

  // S3: List/card items
  const s3 = await page.$$eval(
    ".list-group-item, .card-body, div[class*='contract-item']",
    els => els.map(el => {
      const text = el.innerText.replace(/\s+/g," ").trim()
      return text.length > 20 ? [text] : null
    }).filter(Boolean)
  ).catch(() => [])
  if (s3.length) return { strategy: "S3_cards", rows: s3 }

  // S5: GEMC regex scan
  const s5 = await page.evaluate(() => {
    const text = document.body.innerText
    const pattern = /GEMC[-\/]\S{5,40}/g
    const matches = []
    let m
    while ((m = pattern.exec(text)) !== null) {
      const start = Math.max(0, m.index - 20)
      matches.push(text.slice(start, Math.min(text.length, m.index + 200)).replace(/\s+/g," ").trim())
    }
    return [...new Set(matches)]
  }).catch(() => [])
  if (s5.length) return { strategy: "S5_regex", rows: s5.map(r => [r]) }

  return { strategy: "NONE", rows: [] }
}

// ── Parse S0 card object → gem_contracts document ────────────────────────────
function parseCard(card) {
  const STATE_RX = /\b(Rajasthan|Maharashtra|Uttar Pradesh|Karnataka|Tamil Nadu|Gujarat|Delhi|Madhya Pradesh|Bihar|West Bengal|Andhra Pradesh|Haryana|Kerala|Punjab|Odisha|Assam|Jharkhand|Uttarakhand|Himachal Pradesh|Goa|Tripura|Manipur|Meghalaya|Nagaland|Arunachal Pradesh|Mizoram|Sikkim|Jammu|Ladakh|Chandigarh|Puducherry|Telangana|Chhattisgarh)\b/i

  const gemc         = card.gemc_no?.trim() || null
  const dateRaw      = card.contract_date?.trim() || null   // "27/5/2026 00:07"
  const valueRaw     = card.total_value?.trim() || null     // "11160.000"
  const qtyNum       = card.quantity ? parseInt(card.quantity, 10) : null
  const allText      = [card.ministry, card.department, card.office_zone, card.org_name].filter(Boolean).join(" ")
  const stateMatch   = allText.match(STATE_RX)

  return {
    gemc_no:              gemc,
    // Seller — not in list view; Phase 2 detail scraping
    seller_name_raw:      null,
    seller_name_canonical: null,
    seller_gem_id:        null,
    seller_state:         null,
    seller_msme:          null,
    seller_gst:           null,
    // Buyer — available in list view
    dept_name:            card.department,
    ministry:             card.ministry,
    office_name:          card.office_zone,
    org_type:             card.org_type,
    org_name:             card.org_name,
    buyer_designation:    card.buyer_designation,
    buying_mode:          card.buying_mode,
    contract_status:      card.status,
    state:                stateMatch ? stateMatch[1] : null,
    city:                 null,
    // Category — not in list view
    category_name:        null,
    category_id:          null,
    category_path:        null,
    // Contract
    contract_date:        dateRaw,
    contract_date_dt:     parseGemDate(dateRaw),
    contract_value:       valueRaw ? `₹ ${valueRaw}` : null,
    contract_value_num:   parseValue(valueRaw),
    // Product — from nested table in card
    product_name:         card.product_name,
    quantity:             isNaN(qtyNum) ? null : qtyNum,
    unit_rate:            null,
    delivery_days:        null,
    product_desc:         null,
    oem_brand:            null,
    // Meta
    source:               "view_contracts",
    detail_scraped:       false,
    parser_version:       PARSER_VER,
  }
}

// ── Parse S1/S2/S3/S5 cell arrays → gem_contracts document ───────────────────
function parseRow(cells, strategy) {
  const STATE_RX = /\b(Rajasthan|Maharashtra|Uttar Pradesh|Karnataka|Tamil Nadu|Gujarat|Delhi|Madhya Pradesh|Bihar|West Bengal|Andhra Pradesh|Haryana|Kerala|Punjab|Odisha|Assam|Jharkhand|Uttarakhand|Himachal Pradesh|Goa|Tripura|Manipur|Meghalaya|Nagaland|Arunachal Pradesh|Mizoram|Sikkim|Jammu|Ladakh|Chandigarh|Puducherry|Telangana|Chhattisgarh)\b/i

  if (strategy !== "S1_table" && strategy !== "S2_any_table") {
    const text   = Array.isArray(cells) ? cells.join(" ") : String(cells)
    const gMatch = text.match(/GEMC[-\/]\S{5,40}/)
    const dMatch = text.match(/\d{1,2}[-\/]\d{1,2}[-\/]\d{4}/)
    const vMatch = text.match(/₹\s*[\d,]+(?:\.\d+)?(?:\s*[LlCc])?|\d[\d,]+(?:\.\d+)?\s*(?:Lakh|Cr)/i)
    const sMatch = text.match(STATE_RX)
    return {
      gemc_no: gMatch ? gMatch[0].trim() : null,
      seller_name_raw: null, seller_name_canonical: null,
      seller_gem_id: null, seller_state: null, seller_msme: null, seller_gst: null,
      dept_name: null, ministry: null, office_name: null,
      org_type: null, org_name: null, buyer_designation: null, buying_mode: null, contract_status: null,
      state: sMatch ? sMatch[1] : null, city: null,
      category_name: null, category_id: null, category_path: null,
      contract_date: dMatch ? dMatch[0] : null, contract_date_dt: parseGemDate(dMatch?.[0]),
      contract_value: vMatch ? vMatch[0] : null, contract_value_num: parseValue(vMatch?.[0]),
      quantity: null, unit_rate: null, delivery_days: null,
      product_name: null, product_desc: null, oem_brand: null,
      source: "view_contracts", detail_scraped: false, parser_version: PARSER_VER,
    }
  }

  const gemcIdx  = cells.findIndex(c => /GEMC[-\/\d]/i.test(c.trim()))
  const dateIdx  = cells.findIndex(c => /^\d{1,2}[-\/]\d{1,2}[-\/]\d{4}/.test(c.trim()))
  const valueIdx = cells.findIndex(c => /₹|lakh|,\d{3}/i.test(c) && !/GEMC/i.test(c))
  const gemc      = gemcIdx >= 0 ? cells[gemcIdx]?.trim() : (cells[0]?.trim() || null)
  const sellerRaw = gemcIdx >= 0 ? cells[gemcIdx + 1]?.trim() : (cells[1]?.trim() || null)
  const dept      = gemcIdx >= 0 ? cells[gemcIdx + 2]?.trim() : (cells[2]?.trim() || null)
  const catName   = gemcIdx >= 0 ? cells[gemcIdx + 3]?.trim() : (cells[3]?.trim() || null)
  const date      = dateIdx  >= 0 ? cells[dateIdx]?.trim()  : null
  const value     = valueIdx >= 0 ? cells[valueIdx]?.trim() : null
  const stateMatch = (dept || "" + cells.join(" ")).match(STATE_RX)

  return {
    gemc_no: gemc,
    seller_name_raw: sellerRaw, seller_name_canonical: canonicalize(sellerRaw) || null,
    seller_gem_id: null, seller_state: null, seller_msme: null, seller_gst: null,
    dept_name: dept, ministry: null, office_name: null,
    org_type: null, org_name: null, buyer_designation: null, buying_mode: null, contract_status: null,
    state: stateMatch ? stateMatch[1] : null, city: null,
    category_name: catName, category_id: null, category_path: null,
    contract_date: date, contract_date_dt: parseGemDate(date),
    contract_value: value, contract_value_num: parseValue(value),
    quantity: null, unit_rate: null, delivery_days: null,
    product_name: null, product_desc: null, oem_brand: null,
    source: "view_contracts", detail_scraped: false, parser_version: PARSER_VER,
  }
}

// ── Dispatch: card or row depending on strategy ───────────────────────────────
function parseItem(item, strategy) {
  return strategy === "S0_cards" ? parseCard(item) : parseRow(item, strategy)
}

// ── Pagination: scroll #load_more into view (infinite scroll) ─────────────────
// GeM view_contracts uses a scroll-triggered AJAX loader, not traditional pages.
// Scrolling #load_more into view fires the jQuery scroll handler which calls
// load_result(pageno) and appends new cards to #pagi_content.
async function clickLoadMore(page) {
  const loadMore = await page.$("#load_more").catch(() => null)
  if (!loadMore) return false

  const visible = await loadMore.isVisible().catch(() => false)
  if (!visible) return false

  // pageno == 0 means server reported no more results
  const pageNo = await page.$eval("#pageno", el => el.value).catch(() => "0")
  if (pageNo === "0") return false

  // div_load_more class = ready to trigger; if absent it's mid-load already
  const ready = await loadMore.evaluate(el => el.classList.contains("div_load_more")).catch(() => false)
  if (!ready) {
    await page.waitForTimeout(2000)
    const readyAfter = await loadMore.evaluate(el => el.classList.contains("div_load_more")).catch(() => false)
    if (!readyAfter) return false
  }

  await loadMore.scrollIntoViewIfNeeded()
  await page.waitForTimeout(3000)   // wait for AJAX + render
  return true
}

// ── Upsert one contract into both collections ─────────────────────────────────
async function upsertOne(colGC, colRaw, rec, rawItem, strategy, chunkId, batchNum, chunkFrom, chunkTo) {
  const now = new Date()

  await colRaw.updateOne(
    { gemc_no: rec.gemc_no },
    {
      $set: {
        card_html:          strategy === "S0_cards" ? rawItem.raw_html : null,
        list_cells:         strategy !== "S0_cards" ? (Array.isArray(rawItem) ? rawItem : [String(rawItem)]) : null,
        raw_format:         strategy === "S0_cards" ? "card_html" : "cell_array",
        chunk_id:           chunkId,
        batch_num:          batchNum,
        scraped_at:         now,
        parser_version:     PARSER_VER,
        source_chunk_start: chunkFrom,
        source_chunk_end:   chunkTo,
      },
      $setOnInsert: { first_seen: now },
    },
    { upsert: true }
  )

  const result = await colGC.updateOne(
    { gemc_no: rec.gemc_no },
    {
      $set: {
        ...rec,
        updated_at:         now,
        source_chunk_start: chunkFrom,
        source_chunk_end:   chunkTo,
        harvested_at:       now,
      },
      $setOnInsert: { first_seen: now },
    },
    { upsert: true }
  )

  return result.upsertedCount > 0 ? "inserted" : "updated"
}

// ── Process one date chunk ────────────────────────────────────────────────────
async function processChunk(page, chunk, colGC, colRaw, state) {
  console.log(`\n${"─".repeat(65)}`)
  console.log(`  Chunk ${chunk.id}: ${chunk.from} → ${chunk.to}  (${chunk.days} days)`)
  console.log("─".repeat(65))

  await page.goto("https://gem.gov.in/view_contracts", {
    waitUntil: "networkidle", timeout: 40000,
  })

  // Blank category = all categories
  const catVal = await page.$eval(
    "select#buyer_category option:checked", o => o.value
  ).catch(() => "?")
  if (catVal !== "") {
    await page.selectOption("select#buyer_category", "").catch(() => {})
  }

  // Fill date range
  const fromSel = "#from_date_contract_search1, [name='from_date_contract_search1']"
  const toSel   = "#to_date_contract_search1, [name='to_date_contract_search1']"
  for (const [sel, val] of [[fromSel, chunk.from], [toSel, chunk.to]]) {
    await page.click(sel, { clickCount: 3 }).catch(() => {})
    await page.keyboard.type(val).catch(() => {})
  }
  await page.waitForTimeout(400)

  // Captcha
  console.log(`\n  CAPTCHA required for chunk ${chunk.id}`)
  console.log(`  Date: ${chunk.from} → ${chunk.to}`)
  console.log("  1. Type captcha in the browser window")
  console.log("  2. Press Enter here (do NOT click Search in the browser)")
  await ask("  Press Enter: ")

  const clicked = await page.click(
    "#searchlocation1, button#searchlocation1, [id='searchlocation1']"
  ).then(() => true).catch(() => false)

  if (!clicked) {
    const html = await page.content()
    fs.writeFileSync(`audit/chunk${chunk.id}-no-button.html`, html)
    throw new Error(`Search button not found — HTML dumped to audit/chunk${chunk.id}-no-button.html`)
  }

  await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {})
  await page.waitForTimeout(2000)

  const pageText = await page.evaluate(() => document.body.innerText).catch(() => "")
  if (/invalid captcha/i.test(pageText)) {
    throw new Error("Invalid captcha — re-run to retry chunk " + chunk.id)
  }
  if (/no record|no result|no data found/i.test(pageText)) {
    console.log(`  No records found for this date range`)
    return { batches: 0, inserted: 0, updated: 0, skipped: 0, totalCards: 0 }
  }

  // ── Initial page validation ──────────────────────────────────────────────────
  const first = await extractPage(page)
  console.log(`\n  Strategy  : ${first.strategy}`)
  console.log(`  Cards p.1 : ${first.rows.length}`)

  if (first.rows.length === 0) {
    const html = await page.content()
    fs.writeFileSync(`audit/chunk${chunk.id}-zero-cards.html`, html)
    throw new Error(`Zero cards extracted — HTML dumped. Update extractPage() selectors and re-run.`)
  }

  // Log first 3 cards so mapping is always verifiable
  console.log("\n  First 3 extracted cards:")
  first.rows.slice(0, 3).forEach((card, i) => {
    if (first.strategy === "S0_cards") {
      console.log(`\n  Card ${i + 1}:`)
      console.log(`    gemc_no    : ${card.gemc_no || "(null)"}`)
      console.log(`    ministry   : ${card.ministry || "(null)"}`)
      console.log(`    department : ${(card.department || "(null)").slice(0, 70)}`)
      console.log(`    date       : ${card.contract_date || "(null)"}`)
      console.log(`    value      : ${card.total_value || "(null)"}`)
      console.log(`    product    : ${(card.product_name || "(null)").slice(0, 70)}`)
      console.log(`    quantity   : ${card.quantity || "(null)"}`)
    } else {
      const cells = Array.isArray(card) ? card : [String(card)]
      console.log(`\n  Row ${i + 1} (${cells.length} cells):`)
      cells.forEach((c, ci) => console.log(`    [${ci}]: ${String(c).slice(0, 120)}`))
    }
  })

  const sampleRec = parseItem(first.rows[0], first.strategy)
  const gemcOk    = sampleRec.gemc_no && /GEMC/i.test(sampleRec.gemc_no)
  if (!gemcOk) {
    const html = await page.content()
    fs.writeFileSync(`audit/chunk${chunk.id}-page1.html`, html)
    throw new Error(
      `GEMC not found in card 1 (got: "${sampleRec.gemc_no}") — HTML dumped to audit/chunk${chunk.id}-page1.html`
    )
  }

  // ── Collect: batch loop (each Load More = one batch) ─────────────────────────
  let batchNum    = 1
  let inserted    = 0
  let updated     = 0
  let skipped     = 0
  let prevCount   = 0      // cards already processed in previous batches
  const page1Sample = []   // first 5 for line-by-line display
  const batch1Recs  = []   // all valid batch-1 records for aggregate stats

  while (true) {
    const ext      = await extractPage(page)
    const allCards = ext.rows
    const newCards = allCards.slice(prevCount)   // only cards added in this batch

    let batchInserted = 0
    let batchSkipped  = 0

    for (const item of newCards) {
      const rec = parseItem(item, ext.strategy)
      if (!rec.gemc_no?.includes("GEMC")) {
        batchSkipped++
        continue
      }
      if (batchNum === 1 && page1Sample.length < 5) page1Sample.push(rec)
      if (batchNum === 1) batch1Recs.push(rec)

      const outcome = await upsertOne(colGC, colRaw, rec, item, ext.strategy,
                                      chunk.id, batchNum, chunk.from, chunk.to)
      if (outcome === "inserted") batchInserted++
      else updated++
    }

    skipped  += batchSkipped
    inserted += batchInserted
    prevCount = allCards.length

    chunk.pagesCollected  = batchNum
    chunk.recordsInserted = inserted
    chunk.recordsSkipped  = skipped

    const dbTotal = await colGC.countDocuments()
    process.stdout.write(
      `\r  Batch ${String(batchNum).padStart(3)} | cards ${String(allCards.length).padStart(4)} | +${String(batchInserted).padStart(3)} new | db: ${dbTotal}  `
    )
    saveCheckpoint(state)

    // ── Human validation checkpoint after batch 1 ────────────────────────────
    if (batchNum === 1) {
      console.log(`\n\n${"─".repeat(65)}`)
      console.log("  BATCH 1 VALIDATION — review before continuing")
      console.log("─".repeat(65))
      console.log(`  Extraction strategy : ${ext.strategy}`)
      console.log(`  Cards in batch 1    : ${allCards.length}`)
      console.log(`  Valid (with GEMC)   : ${inserted}`)
      console.log(`  Skipped (no GEMC)   : ${skipped}`)

      if (page1Sample.length === 0) {
        console.log("\n  [!] No valid records. Check cards above and HTML dumps in audit/.")
        const cont = await ask("  Continue anyway? (y/n): ")
        if (cont.toLowerCase() !== "y") { break }
      } else {
        console.log(`\n  First ${page1Sample.length} contract(s) from batch 1:\n`)
        page1Sample.forEach((r, i) => {
          console.log(`  [${i + 1}]`)
          console.log(`    GEMC no      : ${r.gemc_no}`)
          console.log(`    Ministry     : ${r.ministry || "(null)"}`)
          console.log(`    Department   : ${(r.dept_name || "(null)").slice(0, 70)}`)
          console.log(`    Office zone  : ${r.office_name || "(null)"}`)
          console.log(`    Org type     : ${r.org_type || "(null)"}`)
          console.log(`    Buying mode  : ${r.buying_mode || "(null)"}`)
          console.log(`    Date         : ${r.contract_date || "(null)"}`)
          console.log(`    Value        : ${r.contract_value || "(null)"}`)
          console.log(`    Product      : ${(r.product_name || "(null)").slice(0, 70)}`)
          console.log(`    Quantity     : ${r.quantity ?? "(null)"}`)
          console.log(`    State        : ${r.state || "(null)"}`)
          console.log(`    Status       : ${r.contract_status || "(null)"}`)
          console.log("")
        })

        console.log("─".repeat(65))
        console.log("  Seller name = null throughout — expected (Phase 1, list view only).")

        // ── Batch 1 aggregate stats ─────────────────────────────────────────
        const b1 = batch1Recs
        const b1Values = b1.map(r => r.contract_value_num).filter(v => v != null)
        const b1Total  = b1Values.reduce((s, v) => s + v, 0)

        // Top 10 products by count
        const prodCount = {}
        const deptSum   = {}
        for (const r of b1) {
          if (r.product_name) prodCount[r.product_name] = (prodCount[r.product_name] || 0) + 1
          if (r.dept_name) {
            if (!deptSum[r.dept_name]) deptSum[r.dept_name] = { count: 0, value: 0 }
            deptSum[r.dept_name].count++
            deptSum[r.dept_name].value += r.contract_value_num || 0
          }
        }
        const top10Products = Object.entries(prodCount)
          .sort((a, b) => b[1] - a[1]).slice(0, 10)
        const top10Depts = Object.entries(deptSum)
          .sort((a, b) => b[1].value - a[1].value).slice(0, 10)

        console.log(`\n  ── Batch 1 intelligence (${b1.length} contracts) ────────────────`)
        console.log(`\n  Total contract value on page : ₹ ${b1Total.toLocaleString()}`)
        console.log(`  Min / Max value              : ₹ ${Math.min(...b1Values).toLocaleString()} / ₹ ${Math.max(...b1Values).toLocaleString()}`)
        console.log(`  Contracts with value         : ${b1Values.length} / ${b1.length}`)

        if (top10Products.length) {
          console.log(`\n  Top ${top10Products.length} products:`)
          top10Products.forEach(([p, n], i) =>
            console.log(`    ${String(i+1).padStart(2)}. ${p.slice(0, 58).padEnd(59)}${n}`)
          )
        }

        if (top10Depts.length) {
          console.log(`\n  Top ${top10Depts.length} departments (by value):`)
          top10Depts.forEach(([d, s], i) =>
            console.log(`    ${String(i+1).padStart(2)}. ${d.slice(0, 50).padEnd(51)}${String(s.count).padStart(3)}  ₹ ${s.value.toLocaleString()}`)
          )
        }

        console.log("\n" + "─".repeat(65))
        const cont = await ask("  Continue to load all batches? (y/n): ")
        if (cont.toLowerCase() !== "y") {
          console.log(`\n  Stopped at user request. ${inserted} record(s) saved.`)
          break
        }
        console.log("  Confirmed — continuing...\n")
      }
    }
    // ── End of batch 1 checkpoint ────────────────────────────────────────────

    // Scroll Load More into view to trigger next AJAX batch
    const prevTotal  = allCards.length
    const hasMore    = await clickLoadMore(page)

    if (!hasMore) {
      console.log(`\n  Load More exhausted — ${prevTotal} total contracts in this chunk`)
      break
    }

    // Verify new cards actually appeared
    const newTotal = await page.$$eval(
      "div#pagi_content div.border.block", els => els.length
    ).catch(() => 0)

    if (newTotal <= prevTotal) {
      console.log(`\n  No new cards after scroll — end of results (${prevTotal} total)`)
      break
    }

    batchNum++
  }

  return { batches: batchNum, inserted, updated, skipped, totalCards: prevCount }
}

// ── Report ────────────────────────────────────────────────────────────────────
async function printReport(db) {
  const col    = db.collection("gem_contracts")
  const colRaw = db.collection("gem_contracts_raw")
  const total  = await col.countDocuments()
  const rawTotal = await colRaw.countDocuments()

  if (total === 0) {
    console.log("\n  gem_contracts is empty — no report to show")
    return
  }

  const [
    uniqueDepts,
    uniqueOrgs,
    uniqueProducts,
    uniqueMinistries,
    topDepts,
    topProducts,
    topOrgs,
    topMinistries,
    topBuyingModes,
    withValue,
    totalValueAgg,
    valueDist,
  ] = await Promise.all([
    col.distinct("dept_name").then(r => r.filter(Boolean)),
    col.distinct("org_name").then(r => r.filter(Boolean)),
    col.distinct("product_name").then(r => r.filter(Boolean)),
    col.distinct("ministry").then(r => r.filter(Boolean)),
    col.aggregate([
      { $match: { dept_name: { $nin: [null, ""] } } },
      { $group: { _id: "$dept_name", count: { $sum: 1 },
          totalValue: { $sum: "$contract_value_num" } } },
      { $sort: { count: -1 } }, { $limit: 20 },
    ]).toArray(),
    col.aggregate([
      { $match: { product_name: { $nin: [null, ""] } } },
      { $group: { _id: "$product_name", count: { $sum: 1 },
          totalValue: { $sum: "$contract_value_num" } } },
      { $sort: { count: -1 } }, { $limit: 20 },
    ]).toArray(),
    col.aggregate([
      { $match: { org_name: { $nin: [null, ""] } } },
      { $group: { _id: "$org_name", count: { $sum: 1 } } },
      { $sort: { count: -1 } }, { $limit: 20 },
    ]).toArray(),
    col.aggregate([
      { $match: { ministry: { $nin: [null, ""] } } },
      { $group: { _id: "$ministry", count: { $sum: 1 },
          totalValue: { $sum: "$contract_value_num" } } },
      { $sort: { totalValue: -1 } }, { $limit: 20 },
    ]).toArray(),
    col.aggregate([
      { $match: { buying_mode: { $nin: [null, ""] } } },
      { $group: { _id: "$buying_mode", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]).toArray(),
    col.countDocuments({ contract_value_num: { $ne: null } }),
    col.aggregate([
      { $match: { contract_value_num: { $ne: null } } },
      { $group: { _id: null, total: { $sum: "$contract_value_num" } } },
    ]).toArray().then(r => r[0]?.total || 0),
    col.aggregate([
      { $match: { contract_value_num: { $ne: null } } },
      { $bucket: {
          groupBy: "$contract_value_num",
          boundaries: [0, 10000, 50000, 100000, 500000, 1000000, 5000000, 1e10],
          default: "Other",
          output: { count: { $sum: 1 }, total: { $sum: "$contract_value_num" } },
        }
      },
    ]).toArray(),
  ])

  const valuePct = total > 0 ? Math.round(withValue / total * 100) : 0

  const totalValueCr = (totalValueAgg / 10000000).toFixed(2)  // convert to Crores
  const totalValueL  = (totalValueAgg / 100000).toFixed(1)    // Lakhs

  console.log("\n" + "═".repeat(70))
  console.log("  GEM CONTRACTS — 30-DAY COLLECTION REPORT")
  console.log("═".repeat(70))
  console.log(`  gem_contracts     : ${total.toLocaleString()} structured records`)
  console.log(`  gem_contracts_raw : ${rawTotal.toLocaleString()} raw records`)

  console.log(`\n  ── 7-Point Summary ─────────────────────────────────────────────`)
  console.log(`  1. Contracts collected      : ${total.toLocaleString()}`)
  console.log(`  2. Unique ministries/states : ${uniqueMinistries.length.toLocaleString()}`)
  console.log(`  3. Unique departments       : ${uniqueDepts.length.toLocaleString()}`)
  console.log(`  4. Unique products          : ${uniqueProducts.length.toLocaleString()}`)
  console.log(`  5. Total contract value     : ₹ ${totalValueAgg.toLocaleString()} (${totalValueL}L / ${totalValueCr} Cr)`)
  console.log(`     Records with value       : ${withValue.toLocaleString()} / ${total.toLocaleString()} (${valuePct}%)`)
  console.log(`  6. Value by department      : see table below`)
  console.log(`  7. Value by product         : see table below`)
  console.log(`  ────────────────────────────────────────────────────────────────`)

  console.log(`\n  Value distribution (₹):`)
  const bucketLabels = ["<10K", "10K-50K", "50K-1L", "1L-5L", "5L-10L", "10L-50L", "50L+", "Other"]
  valueDist.forEach((b, i) => {
    const label = bucketLabels[i] || String(b._id)
    const bar   = "█".repeat(Math.min(40, Math.round(b.count / Math.max(...valueDist.map(x=>x.count)) * 40)))
    console.log(`    ${label.padEnd(10)}: ${String(b.count).padStart(5)} contracts | ${bar}`)
  })

  console.log(`\n  Buying modes:`)
  topBuyingModes.forEach(b => console.log(`    ${b._id.padEnd(20)}: ${b.count}`))

  console.log(`\n  Top 20 buying departments (by contract count):`)
  topDepts.forEach((d, i) =>
    console.log(`  ${String(i+1).padStart(2)}. ${d._id.slice(0,55).padEnd(56)}${String(d.count).padStart(4)}  ₹${Math.round((d.totalValue||0)/1000)}K`)
  )

  console.log(`\n  Top 20 ministries/states (by contract value):`)
  topMinistries.forEach((m, i) =>
    console.log(`  ${String(i+1).padStart(2)}. ${m._id.slice(0,45).padEnd(46)}${String(m.count).padStart(5)} contracts  ₹${Math.round((m.totalValue||0)/100000)}L`)
  )

  console.log(`\n  Top 20 products (by contract count):`)
  topProducts.forEach((p, i) =>
    console.log(`  ${String(i+1).padStart(2)}. ${p._id.slice(0,55).padEnd(56)}${String(p.count).padStart(4)}`)
  )

  console.log(`\n  Top 20 organizations (by contract count):`)
  topOrgs.forEach((o, i) =>
    console.log(`  ${String(i+1).padStart(2)}. ${o._id.slice(0,58).padEnd(59)}${String(o.count).padStart(4)}`)
  )

  // 5 sample gem_contracts
  console.log(`\n${"─".repeat(70)}`)
  console.log("  5 SAMPLE RECORDS — gem_contracts")
  console.log("─".repeat(70))
  const samples = await col.find({}).limit(5).toArray()
  samples.forEach((doc, i) => {
    console.log(`\n  [${i+1}] ${doc.gemc_no || "(no gemc)"}`)
    console.log(`    ministry         : ${doc.ministry || "(null)"}`)
    console.log(`    dept_name        : ${(doc.dept_name || "(null)").slice(0, 65)}`)
    console.log(`    office_name      : ${(doc.office_name || "(null)").slice(0, 65)}`)
    console.log(`    org_type         : ${doc.org_type || "(null)"}`)
    console.log(`    org_name         : ${(doc.org_name || "(null)").slice(0, 65)}`)
    console.log(`    buyer_designation: ${doc.buyer_designation || "(null)"}`)
    console.log(`    buying_mode      : ${doc.buying_mode || "(null)"}`)
    console.log(`    contract_status  : ${doc.contract_status || "(null)"}`)
    console.log(`    contract_date    : ${doc.contract_date || "(null)"}`)
    console.log(`    contract_value   : ${doc.contract_value || "(null)"}`)
    console.log(`    product_name     : ${(doc.product_name || "(null)").slice(0, 65)}`)
    console.log(`    quantity         : ${doc.quantity ?? "(null)"}`)
    console.log(`    state            : ${doc.state || "(null)"}`)
    console.log(`    seller_name_raw  : ${doc.seller_name_raw || "(null — Phase 2)"}`)
    console.log(`    harvested_at     : ${doc.harvested_at?.toISOString() || "(null)"}`)
    console.log(`    parser_version   : ${doc.parser_version}`)
  })

  // 3 sample gem_contracts_raw
  console.log(`\n${"─".repeat(70)}`)
  console.log("  3 SAMPLE RECORDS — gem_contracts_raw")
  console.log("─".repeat(70))
  const rawSamples = await colRaw.find({}).limit(3).toArray()
  rawSamples.forEach((doc, i) => {
    console.log(`\n  [${i+1}] ${doc.gemc_no || "(no gemc)"}`)
    console.log(`    chunk_id          : ${doc.chunk_id ?? "(null)"}`)
    console.log(`    batch_num         : ${doc.batch_num ?? "(null)"}`)
    console.log(`    raw_format        : ${doc.raw_format || "(null)"}`)
    console.log(`    source_chunk_start: ${doc.source_chunk_start || "(null)"}`)
    console.log(`    source_chunk_end  : ${doc.source_chunk_end || "(null)"}`)
    console.log(`    parser_version    : ${doc.parser_version ?? "(null)"}`)
    console.log(`    card_html length  : ${doc.card_html?.length ?? 0} chars`)
    console.log(`    scraped_at        : ${doc.scraped_at?.toISOString() || "(null)"}`)
  })

  // Phase 2 estimation
  console.log(`\n${"─".repeat(70)}`)
  console.log("  PHASE 2 ESTIMATE — Seller Enrichment")
  console.log("─".repeat(70))
  console.log(`  Total contracts in this dataset : ${total.toLocaleString()}`)
  console.log(`  Each contract requires 1 detail page click (openCap)`)
  console.log(`  Estimated at 3s/contract        : ${Math.round(total * 3 / 60)} minutes`)
  console.log(`  Estimated at 5s/contract        : ${Math.round(total * 5 / 60)} minutes`)
  const topValueContracts = await col.countDocuments({
    contract_value_num: { $gte: 500000 }
  })
  console.log(`\n  Contracts ≥ ₹5L (high-value)    : ${topValueContracts.toLocaleString()}`)
  console.log(`  Selective enrichment (≥₹5L) at 5s: ${Math.round(topValueContracts * 5 / 60)} minutes`)
  console.log(`\n  Recommendation:`)
  if (topValueContracts < 500) {
    console.log("  → Selective: enrich only ≥₹5L contracts. High ROI, low cost.")
  } else if (topValueContracts < 5000) {
    console.log("  → Selective feasible. Consider ≥₹1L threshold to widen coverage.")
  } else {
    console.log("  → Full-scale enrichment warranted. Run overnight in headless mode.")
  }
  console.log("═".repeat(70))
}

// ── Main ───────────────────────────────────────────────────────────────────────
;(async () => {
  loadEnv()
  fs.mkdirSync("audit", { recursive: true })

  const fullMode = process.argv.includes("--full")

  const client = new MongoClient(process.env.MONGODB_URI)
  await client.connect()
  const db    = client.db()
  const colGC  = db.collection("gem_contracts")
  const colRaw = db.collection("gem_contracts_raw")

  await ensureIndexes(db)

  const existingCount = await colGC.countDocuments()

  let state = loadCheckpoint()
  if (!state) {
    state = {
      version:   2,
      totalDays: TOTAL_DAYS,
      chunkDays: CHUNK_DAYS,
      chunks:    generateChunks(),
      createdAt: new Date().toISOString(),
    }
    saveCheckpoint(state)
    console.log(`  Checkpoint created: ${state.chunks.length} chunks`)
  }

  const pending = state.chunks.filter(c => c.status !== "complete")
  const toRun   = fullMode ? pending : pending.slice(0, 1)

  console.log("\n" + "═".repeat(65))
  console.log("  GeM VIEW CONTRACTS COLLECTOR — v3 (card-based, infinite scroll)")
  console.log("═".repeat(65))
  console.log(`  Mode             : ${fullMode ? "--full (all pending)" : "TEST (1 chunk)"}`)
  console.log(`  gem_contracts    : ${existingCount} existing records`)
  console.log(`  Total chunks     : ${state.chunks.length}`)
  console.log(`  Complete         : ${state.chunks.filter(c => c.status === "complete").length}`)
  console.log(`  Pending / Error  : ${pending.length}`)
  console.log(`  Will run now     : ${toRun.length} chunk(s)`)

  if (toRun.length === 0) {
    console.log("\n  All chunks complete.")
    await printReport(db)
    await client.close()
    return
  }

  console.log("\n  Chunks to process:")
  toRun.forEach(c =>
    console.log(`    Chunk ${String(c.id).padStart(2)}: ${c.from} → ${c.to} (${c.days} days) [${c.status}]`)
  )
  console.log("")

  const browser = await chromium.launch({ headless: false, slowMo: 50 })
  const context = await browser.newContext()
  const page    = await context.newPage()

  for (const chunk of toRun) {
    chunk.status    = "in_progress"
    chunk.startedAt = new Date().toISOString()
    chunk.error     = null
    saveCheckpoint(state)

    try {
      const result = await processChunk(page, chunk, colGC, colRaw, state)
      chunk.status         = "complete"
      chunk.completedAt    = new Date().toISOString()
      chunk.pagesCollected = result.batches
      chunk.recordsInserted += result.inserted
      chunk.recordsSkipped  += result.skipped
      console.log(
        `\n  ✓ Chunk ${chunk.id} done: ${result.inserted} new | ${result.updated} updated | ` +
        `${result.batches} batches | ${result.totalCards} total cards`
      )
    } catch (err) {
      chunk.status = "error"
      chunk.error  = err.message
      console.log(`\n  ✗ Chunk ${chunk.id} failed: ${err.message}`)
      console.log("  Re-run to retry.")
    }
    saveCheckpoint(state)
  }

  await browser.close()

  const finalCount = await colGC.countDocuments()
  console.log("\n" + "─".repeat(65))
  console.log(`  gem_contracts total: ${finalCount.toLocaleString()}`)
  console.log("─".repeat(65))

  if (finalCount > 0) await printReport(db)
  await client.close()
})().catch(e => { console.error("\nFATAL:", e.message); process.exit(1) })
