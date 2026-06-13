/**
 * Capture Founder Dashboard screenshots via Playwright.
 * Uses the production APIs (after _test marks are live on Vercel).
 * Run: node audit-screenshots.mjs
 */

import { chromium } from 'playwright'
import fs from 'fs'

const BASE = 'https://www.100xcircle.com'
const OUT  = './audit'
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT)

// Founder dashboard page — we need to bypass admin auth.
// The admin is cookie-protected; use the layout=none param if available,
// or screenshot the API JSON responses directly for the report.
const DASH_URL = `${BASE}/admin/growth/founder`

async function capture(page, filename, scrollY = 0, waitMs = 3000) {
  if (scrollY) await page.evaluate(y => window.scrollTo(0, y), scrollY)
  await page.waitForTimeout(waitMs)
  await page.screenshot({ path: `${OUT}/${filename}.png`, fullPage: false })
  console.log(`  Saved: ${OUT}/${filename}.png`)
}

;(async () => {
  console.log('\n── Capturing API snapshots (no auth required) ──\n')
  const browser = await chromium.launch({ headless: true })
  const ctx     = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page    = await ctx.newPage()

  // ── Conversion Dashboard API ─────────────────────────────────────────────
  console.log('1. /api/admin/growth/conversion-dashboard')
  await page.goto(`${BASE}/api/admin/growth/conversion-dashboard`, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForTimeout(1000)
  const convRaw = await page.evaluate(() => document.body.innerText)
  let conv
  try { conv = JSON.parse(convRaw) } catch { conv = { error: convRaw.slice(0, 200) } }
  fs.writeFileSync(`${OUT}/conversion-dashboard-response.json`, JSON.stringify(conv, null, 2))
  console.log('  topPages:', conv.topPages)
  console.log('  rolling7:', conv.rolling7)
  console.log('  today:',    conv.today)

  // ── Business Outcomes API ─────────────────────────────────────────────────
  console.log('\n2. /api/admin/growth/business-outcomes')
  await page.goto(`${BASE}/api/admin/growth/business-outcomes`, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForTimeout(1000)
  const bizRaw = await page.evaluate(() => document.body.innerText)
  let biz
  try { biz = JSON.parse(bizRaw) } catch { biz = { error: bizRaw.slice(0, 200) } }
  fs.writeFileSync(`${OUT}/business-outcomes-response.json`, JSON.stringify(biz, null, 2))
  console.log('  demandScore:', biz.demandScore)
  console.log('  classification.total7d:', biz.classification?.total7d)
  console.log('  classification.total30d:', biz.classification?.total30d)
  console.log('  pipeline:', biz.pipeline)
  console.log('  sources:', biz.sources?.map(s => `${s.name}: ${s.leads7d}(7d) ${s.leads30d}(30d)`))
  console.log('  alerts:', biz.alerts?.map(a => a.title))

  await browser.close()

  // ── Print summary ─────────────────────────────────────────────────────────
  console.log('\n══════════════ AFTER CLEANUP METRICS ══════════════')
  if (conv.rolling7) {
    console.log(`Conversion Dashboard (7-day rolling):`)
    console.log(`  RFQ submissions : ${conv.rolling7.rfqSubmits}`)
    console.log(`  Contact forms   : ${conv.rolling7.contacts}`)
    console.log(`  Total leads     : ${conv.rolling7.totalLeads}`)
    console.log(`  Quote rate      : ${conv.rolling7.quoteRate ?? '—'}%`)
  }
  if (conv.topPages?.length) {
    console.log(`\nTop Landing Pages (production only):`)
    for (const p of conv.topPages) console.log(`  ${String(p.leads).padStart(3)}  ${p.page}`)
  }
  if (biz.classification) {
    console.log(`\nBusiness Outcomes:`)
    console.log(`  Demand Score    : ${biz.demandScore?.score} / 100 (${biz.demandScore?.label})`)
    console.log(`  Trend           : ${biz.demandScore?.trend} (${biz.demandScore?.wowChange}% WoW)`)
    console.log(`  Total leads 7d  : ${biz.classification.total7d}`)
    console.log(`  Total leads 30d : ${biz.classification.total30d}`)
    console.log(`  Classification (7d):`)
    for (const [k, v] of Object.entries(biz.classification.rolling7 || {})) {
      if (v) console.log(`    ${k.padEnd(12)} ${v}`)
    }
  }
  if (biz.sources?.length) {
    console.log(`\nSources (7d):`)
    for (const s of biz.sources) if (s.leads7d || s.leads30d) {
      console.log(`  ${s.name.padEnd(12)} ${String(s.leads7d).padStart(3)} leads (7d) · ${String(s.leads30d).padStart(3)} (30d)`)
    }
  }
})()
