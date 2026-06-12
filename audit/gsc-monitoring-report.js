/**
 * GSC 4-week monitoring report.
 * Queries MongoDB gsc_query_rows + gsc_page_rows for:
 *   - Current impressions/clicks/position for canonical product pages
 *   - Rankings for primary fogging machine keywords
 *   - Soft-404 / redirect-error candidates (pages with 0 clicks, high position drift)
 *
 * Run: node audit/gsc-monitoring-report.js
 */

const fs = require('fs')
const { MongoClient } = require('mongodb')

// Manual env load (no dotenv)
function loadEnv(p) {
  try {
    fs.readFileSync(p, 'utf8').split('\n').forEach(line => {
      const t = line.trim(); if (!t || t.startsWith('#')) return
      const eq = t.indexOf('='); if (eq < 0) return
      const k = t.slice(0, eq).trim(), v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
      if (k && !process.env[k]) process.env[k] = v
    })
  } catch {}
}
loadEnv('.env.local'); loadEnv('.env')

const MONGODB_URI = process.env.MONGODB_URI
const SITE_URL = 'https://www.100xcircle.com'

const CANONICAL_PAGES = [
  `${SITE_URL}/thermal-and-cold-fogging-machine-100xtfs50`,
  `${SITE_URL}/thermal-fogging-machine-with-stainless-steel-tank-100xssma20`,
  `${SITE_URL}/double-barrel-thermal-fogging-machine-vehicle-mountable-100xdb400`,
]

const FOGGING_KEYWORDS = [
  'thermal fogging machine', 'cold fogging machine', 'thermal fogger',
  'fogging machine price', 'thermal fogger india', 'thermal fogging machine price',
  'stainless steel fogger', 'vehicle mounted fogger', 'thermal cold fogger',
  '100x fogging', '100xcircle', 'fogging machine manufacturer',
  'mosquito fogging machine', 'pest control fogging machine',
  'thermal fogging machine manufacturer india',
]

;(async () => {
  if (!MONGODB_URI) { console.error('MONGODB_URI not set'); process.exit(1) }
  const client = new MongoClient(MONGODB_URI)
  await client.connect()
  const db = client.db()

  // Find latest sync
  const latestSync = await db.collection('gsc_syncs').findOne(
    { status: { $ne: 'error' } },
    { sort: { syncedAt: -1 } }
  )

  if (!latestSync) {
    console.log('⚠️  No GSC sync data found. Reconnect Google OAuth and wait for the daily cron (05:00 UTC).')
    await client.close(); return
  }

  const syncDate = latestSync.syncDate
  const syncedAt = latestSync.syncedAt
  const period   = latestSync.currentPeriod

  console.log('\n' + '='.repeat(72))
  console.log('GSC 4-WEEK MONITORING REPORT')
  console.log(`Generated:   ${new Date().toISOString()}`)
  console.log(`Data source: GSC sync ${syncDate} (synced ${syncedAt})`)
  console.log(`Period:      ${period?.startDate} → ${period?.endDate}`)
  console.log('='.repeat(72))

  // ── 1. Canonical product pages ───────────────────────────────────────────────
  console.log('\n[1] CANONICAL PRODUCT PAGES — Impressions / Clicks / Avg Position')
  console.log('-'.repeat(72))

  const pageRows = await db.collection('gsc_page_rows')
    .find({ syncDate, period: 'current' })
    .toArray()

  const pageMap = new Map(pageRows.map(r => [String(r.page), r]))

  for (const url of CANONICAL_PAGES) {
    const row = pageMap.get(url)
    const slug = url.split('/').pop()
    if (row) {
      console.log(`\n  ${slug}`)
      console.log(`    Impressions: ${row.impressions}`)
      console.log(`    Clicks:      ${row.clicks}`)
      console.log(`    CTR:         ${(row.ctr * 100).toFixed(1)}%`)
      console.log(`    Avg Position:${Number(row.position).toFixed(1)}`)
    } else {
      console.log(`\n  ${slug}`)
      console.log(`    ⚠️  No data yet — URL may not be indexed or was just submitted`)
    }
  }

  // ── 2. Keyword rankings ───────────────────────────────────────────────────────
  console.log('\n\n[2] KEYWORD RANKINGS — Primary Fogging Machine Terms')
  console.log('-'.repeat(72))
  console.log('  Keyword                                      Pos    Impr   Clicks')
  console.log('  ' + '-'.repeat(68))

  const queryRows = await db.collection('gsc_query_rows')
    .find({ syncDate, period: 'current' })
    .toArray()

  const queryMap = new Map(queryRows.map(r => [String(r.query).toLowerCase(), r]))

  const notFound = []
  for (const kw of FOGGING_KEYWORDS) {
    const row = queryMap.get(kw.toLowerCase())
    if (row) {
      const pos  = Number(row.position).toFixed(1).padStart(6)
      const impr = String(row.impressions).padStart(6)
      const clk  = String(row.clicks).padStart(7)
      console.log(`  ${kw.padEnd(44)} ${pos}  ${impr}  ${clk}`)
    } else {
      notFound.push(kw)
    }
  }

  // Fuzzy — find any query containing fogging / fogger
  console.log('\n  All queries containing "fog" (sorted by impressions):')
  const fogQueries = queryRows
    .filter(r => String(r.query).toLowerCase().includes('fog'))
    .sort((a, b) => (b.impressions - a.impressions))
    .slice(0, 20)

  if (fogQueries.length) {
    for (const r of fogQueries) {
      const pos  = Number(r.position).toFixed(1).padStart(6)
      const impr = String(r.impressions).padStart(6)
      const clk  = String(r.clicks).padStart(7)
      console.log(`  ${String(r.query).padEnd(44)} ${pos}  ${impr}  ${clk}`)
    }
  } else {
    console.log('  (none found)')
  }

  // ── 3. Soft-404 / redirect candidates ────────────────────────────────────────
  console.log('\n\n[3] SOFT-404 / REDIRECT RISK — /products/* pages still in GSC index')
  console.log('-'.repeat(72))

  const productPages = pageRows.filter(r =>
    String(r.page).includes('/products/') &&
    !String(r.page).includes('/products/page')
  )

  if (productPages.length === 0) {
    console.log('  ✅ No /products/* pages in GSC data — clean.')
  } else {
    console.log(`  ⚠️  ${productPages.length} /products/* page(s) still receiving impressions:`)
    productPages
      .sort((a, b) => (b.impressions - a.impressions))
      .slice(0, 15)
      .forEach(r => {
        const path = String(r.page).replace(SITE_URL, '')
        console.log(`    ${path.padEnd(60)} pos:${Number(r.position).toFixed(0).padStart(4)}  impr:${r.impressions}`)
      })
    console.log('\n  These should 301 to canonical URLs within 4 weeks as Googlebot re-crawls.')
  }

  // ── 4. Overall site health ────────────────────────────────────────────────────
  console.log('\n\n[4] OVERALL SITE — Top 10 pages by clicks')
  console.log('-'.repeat(72))

  pageRows
    .sort((a, b) => (b.clicks - a.clicks))
    .slice(0, 10)
    .forEach((r, i) => {
      const path = String(r.page).replace(SITE_URL, '') || '/'
      const pos  = Number(r.position).toFixed(1).padStart(6)
      const impr = String(r.impressions).padStart(7)
      const clk  = String(r.clicks).padStart(6)
      console.log(`  ${String(i + 1).padStart(2)}. ${path.padEnd(56)} pos:${pos}  impr:${impr}  clk:${clk}`)
    })

  console.log('\n\n[5] BACKLINK CHECK — requires live GSC OAuth (reconnect to enable)')
  console.log('-'.repeat(72))
  console.log('  GSC Links API endpoint:')
  console.log(`    GET https://www.googleapis.com/webmasters/v3/sites/<site>/links`)
  console.log('  Canonical pages to verify:')
  CANONICAL_PAGES.forEach(u => console.log(`    • ${u}`))
  console.log('\n  Action: reconnect Google OAuth in admin → Growth OS → SEO → Search Console')
  console.log('  Once connected, backlink data can be pulled via GSC or Ahrefs/Semrush API.')

  console.log('\n' + '='.repeat(72))
  console.log('4-WEEK MONITORING SCHEDULE (automated via daily cron at 05:00 UTC)')
  console.log('='.repeat(72))
  console.log('  Week 1 (by 2026-06-19): Check indexing of 3 canonical pages in GSC')
  console.log('  Week 2 (by 2026-06-26): Verify /products/* soft-404s cleared from index')
  console.log('  Week 3 (by 2026-07-03): Check keyword ranking movement for fogging terms')
  console.log('  Week 4 (by 2026-07-10): Full impression/click delta vs pre-migration baseline')
  console.log('\n  Re-run this script weekly: node audit/gsc-monitoring-report.js')
  console.log('='.repeat(72) + '\n')

  await client.close()
})()
