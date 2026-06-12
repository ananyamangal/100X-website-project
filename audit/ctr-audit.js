/**
 * CTR Audit — maps GSC query data to target pages, computes CTR opportunity,
 * compares current title/description vs ideal, and outputs ranked recommendations.
 *
 * Run: node audit/ctr-audit.js
 */

const fs = require('fs')
const path = require('path')
function loadEnv(p) {
  try {
    fs.readFileSync(p,'utf8').split('\n').forEach(line => {
      const t = line.trim(); if (!t || t.startsWith('#')) return
      const eq = t.indexOf('='); if (eq < 0) return
      const k = t.slice(0,eq).trim(), v = t.slice(eq+1).trim().replace(/^["']|["']$/g,'')
      if (k && !process.env[k]) process.env[k] = v
    })
  } catch {}
}
loadEnv('.env.local'); loadEnv('.env')
const { MongoClient } = require('mongodb')

const SITE = 'https://www.100xcircle.com'

// Current title + description for each target page
const PAGE_META = {
  '/': {
    label: 'Homepage',
    title: 'Best Thermal Fogging Machine Manufacturer | 100x Circle',
    desc:  'Discover 100x Circle — thermal fogging machine manufacturer serving Delhi, Uttar Pradesh, Bihar, Mumbai, Pune, and across India. Industrial mosquito foggers, vehicle-mounted systems, and agricultural equipment.',
  },
  '/thermal-and-cold-fogging-machine-100xtfs50': {
    label: 'TFS50 — Thermal & Cold Fogging Machine',
    title: 'Buy Thermal and Cold Fogging Machine | 100x Circle',
    desc:  'Buy thermal and cold fogging machines from 100x Circle. High-performance, durable foggers for mosquito control and industrial use across India. Contact us today!',
  },
  '/thermal-fogging-machine-with-stainless-steel-tank-100xssma20': {
    label: 'SSMA20 — SS Tank Thermal Fogging Machine',
    title: 'Thermal Fogging Machine with Stainless Steel Tank | 100x Circle',
    desc:  null, // need to check
  },
  '/double-barrel-thermal-fogging-machine-vehicle-mountable-100xdb400': {
    label: 'DB400 — Double Barrel Vehicle-Mountable',
    title: 'Buy Double Barrel Thermal Fogging Machine | 100x Circle',
    desc:  'Buy Double Barrel Thermal Fogging Machine from 100x Circle. High-power, durable fogger for industrial mosquito control and public health use. Contact us today!',
  },
  '/gem-approved-fogging-machine-oem': {
    label: 'GeM OEM Page',
    title: 'GeM Approved OEM for Fogging Machines | 100x Circle',
    desc:  '100x Circle is a GeM-approved OEM manufacturer for fogging machines (Q2 category). OEM reseller code, spec-compliant machines, factory pricing, Pan-India supply.',
  },
  '/thermal-vs-cold-fogging-machine': {
    label: 'Thermal vs Cold Fogging Machine (landing)',
    title: null,
    desc:  null,
  },
  '/dengue-control-fogging-machine': {
    label: 'Dengue Control Fogging Machine (landing)',
    title: null,
    desc:  null,
  },
}

// Expected CTR by position (industry average approximations for branded/commercial SERPs)
function expectedCtr(pos) {
  if (pos <= 1)  return 0.316
  if (pos <= 2)  return 0.247
  if (pos <= 3)  return 0.187
  if (pos <= 4)  return 0.137
  if (pos <= 5)  return 0.095
  if (pos <= 6)  return 0.069
  if (pos <= 7)  return 0.051
  if (pos <= 8)  return 0.038
  if (pos <= 10) return 0.026
  if (pos <= 15) return 0.014
  if (pos <= 20) return 0.009
  return 0.004
}

;(async () => {
  const c = new MongoClient(process.env.MONGODB_URI)
  await c.connect()
  const db = c.db()

  const lastSync = await db.collection('gsc_syncs').findOne({}, { sort: { syncedAt: -1 } })
  const syncDate = lastSync?.syncDate
  const period   = lastSync?.currentPeriod

  console.log('\n' + '='.repeat(72))
  console.log('CTR AUDIT — IMPRESSIONS HIGH, CLICKS NEAR ZERO')
  console.log(`Data: GSC sync ${syncDate}  (${period?.startDate} → ${period?.endDate})`)
  console.log('='.repeat(72))

  const allPageRows  = await db.collection('gsc_page_rows').find({ syncDate, period: 'current' }).toArray()
  const allQueryRows = await db.collection('gsc_query_rows').find({ syncDate, period: 'current' }).toArray()

  const pageMap  = new Map(allPageRows.map(r => [String(r.page), r]))
  const queryMap = allQueryRows

  const OUT_DIR = path.join(__dirname, 'gsc-exports')
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })

  const auditRows = []

  for (const [urlPath, meta] of Object.entries(PAGE_META)) {
    const fullUrl  = urlPath === '/' ? SITE + '/' : SITE + urlPath
    const pageRow  = pageMap.get(fullUrl) || pageMap.get(SITE + urlPath)

    const impressions = pageRow?.impressions ?? 0
    const clicks      = pageRow?.clicks      ?? 0
    const actualCtr   = pageRow?.ctr         ?? 0
    const position    = pageRow?.position    ?? 0

    const expCtr         = expectedCtr(position)
    const ctrGap         = expCtr - actualCtr           // negative = beating expectation
    const missedClicks   = Math.round((expCtr - actualCtr) * impressions)

    console.log(`\n${'─'.repeat(72)}`)
    console.log(`PAGE: ${meta.label}`)
    console.log(`URL:  ${urlPath}`)
    console.log(`─`.repeat(72))
    console.log(`  Impressions:   ${impressions}`)
    console.log(`  Clicks:        ${clicks}`)
    console.log(`  Actual CTR:    ${(actualCtr * 100).toFixed(1)}%`)
    console.log(`  Avg Position:  ${Number(position).toFixed(1)}`)
    console.log(`  Expected CTR:  ${(expCtr * 100).toFixed(1)}%  (industry avg at pos ${Number(position).toFixed(0)})`)
    if (missedClicks > 0) {
      console.log(`  Missed clicks: ~${missedClicks}/month  ⚠️  CTR BELOW EXPECTATION`)
    } else if (impressions > 0) {
      console.log(`  CTR status:    ✅ Meeting or beating expected CTR`)
    }

    if (meta.title) {
      console.log(`\n  TITLE (${meta.title.length} chars):`)
      console.log(`    "${meta.title}"`)
      const titleIssues = []
      if (!meta.title.includes('India') && !meta.title.includes('India')) titleIssues.push('no India geo-modifier')
      if (!meta.title.match(/price|buy|order|get quote|manufacturers?|supplier/i)) titleIssues.push('no commercial intent signal')
      if (meta.title.length > 60) titleIssues.push(`long (${meta.title.length} > 60 chars — may truncate)`)
      if (meta.title.length < 40) titleIssues.push(`short (${meta.title.length} chars — room to add keywords)`)
      if (titleIssues.length) console.log(`    Issues: ${titleIssues.join(', ')}`)
      else console.log(`    Structure: OK`)
    } else {
      console.log(`\n  TITLE: [not in registry — check page.tsx]`)
    }

    if (meta.desc) {
      console.log(`\n  DESCRIPTION (${meta.desc.length} chars):`)
      console.log(`    "${meta.desc}"`)
      const descIssues = []
      if (meta.desc.length > 155) descIssues.push(`long (${meta.desc.length} > 155 chars — will truncate in SERP)`)
      if (meta.desc.length < 100) descIssues.push(`short (${meta.desc.length} chars — use full 150 chars)`)
      if (!meta.desc.match(/call|contact|quote|enquir|order|buy now|get a quote|whatsapp/i)) descIssues.push('no call-to-action phrase')
      if (!meta.desc.match(/india|delhi|mumbai|UP|Bihar|manufacturing|manufacturer/i)) descIssues.push('no India / manufacturer signal')
      if (descIssues.length) console.log(`    Issues: ${descIssues.join(', ')}`)
      else console.log(`    Structure: OK`)
    }

    // Top queries for this page (by impressions, no-click focus)
    // Since the DB stores query rows globally, we approximate by matching
    // query keywords to the page slug/type and looking at position windows
    const slug = urlPath.replace(/^\//, '')
    const isHomepage   = urlPath === '/'
    const isGem        = slug.includes('gem')
    const isTfs50      = slug.includes('tfs50')
    const isSsma20     = slug.includes('ssma20')
    const isDb400      = slug.includes('db400')
    const isDengue     = slug.includes('dengue')
    const isThermalVsCold = slug.includes('thermal-vs-cold')

    let matchFn = () => false
    if (isHomepage)      matchFn = r => ['fogger machine','fogging machine','fogger','thermal fogging machine','cold fogging machine','100x','100xcircle','fogging machine manufacturer','fogging machine price'].some(kw => String(r.query).toLowerCase().includes(kw))
    if (isGem)           matchFn = r => String(r.query).toLowerCase().match(/gem|oem|government|tender|reseller|portal/)
    if (isTfs50)         matchFn = r => String(r.query).toLowerCase().match(/tfs50|thermal and cold|thermal.cold fog|cold fogg/)
    if (isSsma20)        matchFn = r => String(r.query).toLowerCase().match(/ssma20|stainless steel fog|stainless.*fog/)
    if (isDb400)         matchFn = r => String(r.query).toLowerCase().match(/db400|double barrel|vehicle mount.*fog|vehicle.mounted.*fog/)
    if (isDengue)        matchFn = r => String(r.query).toLowerCase().match(/dengue|mosquito.*fog|vector.control/)
    if (isThermalVsCold) matchFn = r => String(r.query).toLowerCase().match(/thermal vs cold|thermal vs ulv|cold vs thermal|fog.*comparison/)

    const pageQueries = queryMap.filter(matchFn).sort((a,b) => b.impressions - a.impressions).slice(0, 8)

    if (pageQueries.length) {
      console.log(`\n  TOP RELATED QUERIES (mapped by keyword):`)
      console.log(`  ${'Query'.padEnd(44)} Pos   Impr  Clks  CTR`)
      console.log(`  ${'-'.repeat(66)}`)
      for (const r of pageQueries) {
        const ctr = (r.ctr * 100).toFixed(1) + '%'
        console.log(`  ${String(r.query).padEnd(44)} ${Number(r.position).toFixed(1).padStart(5)} ${String(r.impressions).padStart(6)} ${String(r.clicks).padStart(5)} ${ctr.padStart(6)}`)
      }
    }

    auditRows.push({
      page:          meta.label,
      url:           urlPath,
      impressions,
      clicks,
      actual_ctr:    (actualCtr * 100).toFixed(1) + '%',
      avg_position:  Number(position).toFixed(1),
      expected_ctr:  (expCtr * 100).toFixed(1) + '%',
      missed_clicks_per_month: missedClicks,
      current_title:  meta.title ?? '[unknown]',
      title_length:   (meta.title ?? '').length,
      desc_length:    (meta.desc ?? '').length,
    })
  }

  // Recommendation output
  console.log('\n' + '='.repeat(72))
  console.log('RANKED CTR OPPORTUNITIES (by missed clicks/month)')
  console.log('='.repeat(72))
  auditRows
    .sort((a,b) => b.missed_clicks_per_month - a.missed_clicks_per_month)
    .forEach((r, i) => {
      const flag = r.missed_clicks_per_month > 50 ? '🔴 HIGH' : r.missed_clicks_per_month > 10 ? '🟡 MED' : '🟢 LOW'
      console.log(`\n  ${i+1}. ${r.page}  ${flag}`)
      console.log(`     Impressions: ${r.impressions}  Actual CTR: ${r.actual_ctr}  Expected: ${r.expected_ctr}  Missed: ~${r.missed_clicks_per_month}/mo`)
    })

  // CSV
  function toCsv(rows, cols) {
    return [cols.join(','), ...rows.map(r => cols.map(c => {
      const v = String(r[c] ?? '')
      return v.includes(',') || v.includes('"') ? `"${v.replace(/"/g,'""')}"` : v
    }).join(','))].join('\r\n')
  }
  fs.writeFileSync(
    path.join(OUT_DIR, 'ctr-audit.csv'),
    toCsv(auditRows, ['page','url','impressions','clicks','actual_ctr','avg_position','expected_ctr','missed_clicks_per_month','current_title','title_length','desc_length'])
  )
  console.log('\n✅ Exported: audit/gsc-exports/ctr-audit.csv')
  console.log('')

  await c.close()
})()
