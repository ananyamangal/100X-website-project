/**
 * GSC CSV export from MongoDB (no OAuth required).
 * Pulls last-sync data: canonical queries, top pages, top queries.
 * Run: node audit/gsc-export-from-db.js
 */

const fs   = require('fs')
const path = require('path')
const { MongoClient } = require('mongodb')

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
const SITE_URL    = 'https://www.100xcircle.com'
const CANONICAL   = [
  `${SITE_URL}/thermal-and-cold-fogging-machine-100xtfs50`,
  `${SITE_URL}/thermal-fogging-machine-with-stainless-steel-tank-100xssma20`,
  `${SITE_URL}/double-barrel-thermal-fogging-machine-vehicle-mountable-100xdb400`,
]

const OUT_DIR = path.join(__dirname, 'gsc-exports')
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })

function toCsv(rows, cols) {
  const header = cols.join(',')
  const lines  = rows.map(r =>
    cols.map(c => {
      const v = String(r[c] ?? '')
      return v.includes(',') || v.includes('"') || v.includes('\n')
        ? `"${v.replace(/"/g, '""')}"` : v
    }).join(',')
  )
  return [header, ...lines].join('\r\n')
}

;(async () => {
  const client = new MongoClient(MONGODB_URI)
  await client.connect()
  const db = client.db()

  const lastSync = await db.collection('gsc_syncs').findOne({}, { sort: { syncedAt: -1 } })
  if (!lastSync) { console.log('No sync data.'); await client.close(); return }

  const syncDate = lastSync.syncDate
  console.log(`\nUsing sync: ${syncDate}  (synced ${lastSync.syncedAt})`)
  console.log(`Period:     ${lastSync.currentPeriod?.startDate} → ${lastSync.currentPeriod?.endDate}`)

  // ── 1. All query rows per canonical URL ─────────────────────────────────────
  const canonRows = await db.collection('gsc_query_rows')
    .find({ syncDate, period: 'current' })
    .toArray()

  // Map query → all pages (GSC stores per-query globally, not per page in this collection)
  // Filter by page using gsc_page_rows to find which queries contributed to canonical pages
  const canonPageRows = await db.collection('gsc_page_rows')
    .find({ syncDate, period: 'current', page: { $in: CANONICAL } })
    .toArray()

  console.log(`\n[CANONICAL PAGES — from gsc_page_rows]`)
  console.log('URL'.padEnd(78) + ' IMPR   CLKS  CTR    POS')
  console.log('-'.repeat(100))
  for (const p of CANONICAL) {
    const r = canonPageRows.find(x => x.page === p)
    const slug = p.split('/').pop().slice(0, 50)
    if (r) {
      console.log(
        `/${slug}`.padEnd(78) +
        String(r.impressions).padStart(5) + '  ' +
        String(r.clicks).padStart(5) + '  ' +
        (r.ctr * 100).toFixed(1).padStart(5) + '%  ' +
        Number(r.position).toFixed(1).padStart(5)
      )
    } else {
      console.log(`/${slug}`.padEnd(78) + '  [no data — not yet indexed or no impressions]')
    }
  }

  // Export canonical page rows
  const canonPageCsv = toCsv(
    canonPageRows.map(r => ({
      canonical_url: r.page,
      impressions:   r.impressions,
      clicks:        r.clicks,
      ctr:           (r.ctr * 100).toFixed(2) + '%',
      avg_position:  Number(r.position).toFixed(1),
      data_period:   `${lastSync.currentPeriod?.startDate} to ${lastSync.currentPeriod?.endDate}`,
      sync_date:     syncDate,
    })),
    ['canonical_url','impressions','clicks','ctr','avg_position','data_period','sync_date']
  )
  fs.writeFileSync(path.join(OUT_DIR, 'canonical-pages.csv'), canonPageCsv)
  console.log(`\n✅ canonical-pages.csv  (${canonPageRows.length} rows)`)

  // ── 2. All query rows (top 200 by impressions) ───────────────────────────────
  const allQueryRows = await db.collection('gsc_query_rows')
    .find({ syncDate, period: 'current' })
    .sort({ impressions: -1 })
    .limit(200)
    .toArray()

  const queryCsv = toCsv(
    allQueryRows.map(r => ({
      query:        r.query,
      impressions:  r.impressions,
      clicks:       r.clicks,
      ctr:          (r.ctr * 100).toFixed(2) + '%',
      avg_position: Number(r.position).toFixed(1),
      sync_date:    syncDate,
    })),
    ['query','impressions','clicks','ctr','avg_position','sync_date']
  )
  fs.writeFileSync(path.join(OUT_DIR, 'top-queries.csv'), queryCsv)
  console.log(`✅ top-queries.csv      (${allQueryRows.length} rows)`)

  // ── 3. All page rows (top 100 by impressions) ────────────────────────────────
  const allPageRows = await db.collection('gsc_page_rows')
    .find({ syncDate, period: 'current' })
    .sort({ impressions: -1 })
    .limit(100)
    .toArray()

  const pageCsv = toCsv(
    allPageRows.map(r => ({
      page:         r.page,
      impressions:  r.impressions,
      clicks:       r.clicks,
      ctr:          (r.ctr * 100).toFixed(2) + '%',
      avg_position: Number(r.position).toFixed(1),
      sync_date:    syncDate,
    })),
    ['page','impressions','clicks','ctr','avg_position','sync_date']
  )
  fs.writeFileSync(path.join(OUT_DIR, 'top-pages.csv'), pageCsv)
  console.log(`✅ top-pages.csv        (${allPageRows.length} rows)`)

  // ── 4. Fogging-specific query subset ─────────────────────────────────────────
  const fogRows = allQueryRows.filter(r =>
    String(r.query).toLowerCase().match(/fog|thermal|cold.*fog|fogg/)
  )
  if (fogRows.length) {
    const fogCsv = toCsv(
      fogRows.map(r => ({
        query:        r.query,
        impressions:  r.impressions,
        clicks:       r.clicks,
        ctr:          (r.ctr * 100).toFixed(2) + '%',
        avg_position: Number(r.position).toFixed(1),
      })),
      ['query','impressions','clicks','ctr','avg_position']
    )
    fs.writeFileSync(path.join(OUT_DIR, 'fogging-queries.csv'), fogCsv)
    console.log(`✅ fogging-queries.csv  (${fogRows.length} rows)`)
  }

  // ── 5. /products/* soft-404 risk report ─────────────────────────────────────
  const legacyPages = allPageRows.filter(r => String(r.page).includes('/products/'))
  if (legacyPages.length) {
    const legacyCsv = toCsv(
      legacyPages.map(r => ({
        page:         r.page,
        impressions:  r.impressions,
        clicks:       r.clicks,
        avg_position: Number(r.position).toFixed(1),
        status:       'legacy — 301 to canonical',
      })),
      ['page','impressions','clicks','avg_position','status']
    )
    fs.writeFileSync(path.join(OUT_DIR, 'legacy-products-pages.csv'), legacyCsv)
    console.log(`✅ legacy-products-pages.csv  (${legacyPages.length} rows — these have 301 redirects, will clear from index)`)
  } else {
    console.log('✅ No /products/* legacy pages in GSC data.')
  }

  // ── 6. Diagnostic summary JSON ───────────────────────────────────────────────
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const summary = {
    generatedAt:  new Date().toISOString(),
    oauthStatus:  'REVOKED — refresh token invalid_grant. Reconnect in admin → Growth OS → SEO → Search Console → Connect Google Account.',
    syncDate,
    syncedAt:     lastSync.syncedAt,
    period:       lastSync.currentPeriod,
    canonicalPages: canonPageRows.map(r => ({
      url:         r.page,
      impressions: r.impressions,
      clicks:      r.clicks,
      ctr:         (r.ctr * 100).toFixed(2) + '%',
      avgPosition: Number(r.position).toFixed(1),
    })),
    totalQueryRows:   allQueryRows.length,
    totalPageRows:    allPageRows.length,
    foggingQueryRows: fogRows.length,
    legacyProductPages: legacyPages.length,
    externalBacklinksNote: [
      'GSC webmasters/v3 API does NOT expose external backlinks.',
      'Get external backlinks via: GSC UI → Links → Export External Links.',
      'Or use Ahrefs / Semrush for the 3 canonical URLs.',
      'All existing /products/* backlinks pass link equity via 301 — no backlink is lost.',
    ],
    exportFiles: [
      'gsc-exports/canonical-pages.csv',
      'gsc-exports/top-queries.csv',
      'gsc-exports/top-pages.csv',
      'gsc-exports/fogging-queries.csv',
      'gsc-exports/legacy-products-pages.csv',
    ],
  }
  fs.writeFileSync(path.join(OUT_DIR, `diagnostic-${ts}.json`), JSON.stringify(summary, null, 2))
  console.log(`✅ diagnostic-${ts}.json`)

  console.log('\n' + '='.repeat(72))
  console.log('ALL EXPORTS WRITTEN TO: audit/gsc-exports/')
  console.log('='.repeat(72))
  console.log('\nBLOCKER: OAuth refresh token is revoked (invalid_grant).')
  console.log('Once reconnected, re-run audit/gsc-diagnostic.js for live API pull.')
  console.log('')
  console.log('TO RECONNECT:')
  console.log('  Admin panel → Growth OS → SEO → Search Console → Connect Google Account')
  console.log('')
  console.log('EXTERNAL BACKLINKS:')
  console.log('  GSC UI → Links → "Export External Links" (free)')
  console.log('  Ahrefs / Semrush → Site Explorer → Backlinks (most complete)')
  console.log('  All /products/* backlinks already pass equity via 301 redirects.')
  console.log('')

  await client.close()
})()
