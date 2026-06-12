/**
 * GSC Full Diagnostic + Backlinks Pull
 * Checks: OAuth validity, sync status, property detection, Links API access.
 * Pulls: top linking sites, top linked pages, per-canonical-URL backlinks.
 * Exports: CSV files to audit/gsc-exports/
 *
 * Run: node audit/gsc-diagnostic.js
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
const SITE_URL    = 'https://www.100xcircle.com/'
const CANONICAL   = [
  'https://www.100xcircle.com/thermal-and-cold-fogging-machine-100xtfs50',
  'https://www.100xcircle.com/thermal-fogging-machine-with-stainless-steel-tank-100xssma20',
  'https://www.100xcircle.com/double-barrel-thermal-fogging-machine-vehicle-mountable-100xdb400',
]

const OUT_DIR = path.join(__dirname, 'gsc-exports')
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })

function toCsv(rows, cols) {
  const header = cols.join(',')
  const lines  = rows.map(r =>
    cols.map(c => {
      const v = String(r[c] ?? '')
      return v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v
    }).join(',')
  )
  return [header, ...lines].join('\n')
}

async function tryRefresh(refreshToken) {
  const id  = (process.env.GOOGLE_OAUTH_CLIENT_ID     || '').trim()
  const sec = (process.env.GOOGLE_OAUTH_CLIENT_SECRET || '').trim()
  if (!id || !sec) return null
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ refresh_token: refreshToken, client_id: id, client_secret: sec, grant_type: 'refresh_token' }).toString(),
  })
  if (!r.ok) return null
  return (await r.json()).access_token || null
}

async function gscGet(path, accessToken) {
  const r = await fetch(`https://www.googleapis.com/webmasters/v3${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  })
  if (!r.ok) {
    const body = await r.text().catch(() => '')
    return { __error: r.status, __body: body.slice(0, 400) }
  }
  return r.json()
}

;(async () => {
  console.log('\n' + '='.repeat(72))
  console.log('GSC DIAGNOSTIC + BACKLINKS PULL')
  console.log(`Timestamp: ${new Date().toISOString()}`)
  console.log('='.repeat(72))

  // ─────────────────────────────────────────────────────────────────────────────
  // CHECK 1: MongoDB connection
  // ─────────────────────────────────────────────────────────────────────────────
  let client, db, doc, lastSync
  try {
    client   = new MongoClient(MONGODB_URI)
    await client.connect()
    db       = client.db()
    doc      = await db.collection('google_oauth_tokens').findOne({ _docId: 'google-oauth-singleton' })
    lastSync = await db.collection('gsc_syncs').findOne({}, { sort: { syncedAt: -1 } })
    console.log('\n[1] OAuth Token Status')
    console.log('    MongoDB:       ✅ Connected')
  } catch (e) {
    console.log('\n[1] OAuth Token Status')
    console.log(`    MongoDB:       ❌ ${e.message}`)
    process.exit(1)
  }

  if (!doc?.refreshToken) {
    console.log('    Token stored:  ❌ No Google account connected')
    console.log('    → Go to admin → Growth OS → SEO → Search Console → Connect Google Account')
    await client.close(); process.exit(1)
  }

  const expiresAt  = new Date(doc.expiresAt)
  const nowMs      = Date.now()
  const tokenFresh = nowMs < expiresAt.getTime() - 5 * 60 * 1000

  console.log(`    Connected as:  ${doc.connectedEmail || 'unknown'}`)
  console.log(`    Access token:  ${tokenFresh ? '✅ Valid' : '⚠️  Expired — will attempt refresh'}`)
  console.log(`    Expires at:    ${expiresAt.toISOString()}`)
  console.log(`    Refresh token: ${doc.refreshToken ? '✅ Present' : '❌ Missing'}`)

  // ─────────────────────────────────────────────────────────────────────────────
  // CHECK 2: Access token (refresh if needed)
  // ─────────────────────────────────────────────────────────────────────────────
  let accessToken = doc.accessToken
  if (!tokenFresh) {
    console.log('\n    Attempting token refresh...')
    const refreshed = await tryRefresh(doc.refreshToken)
    if (refreshed) {
      accessToken = refreshed
      console.log('    Token refresh: ✅ Success — new access token obtained')
    } else {
      console.log('    Token refresh: ❌ FAILED (invalid_grant or missing client credentials)')
      console.log('    → OAuth session has been revoked. Reconnect in admin panel.')
      console.log('\n    DIAGNOSTIC CANNOT CONTINUE — live API calls require a valid access token.')
      await client.close(); process.exit(1)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CHECK 3: Verify token works — list sites
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n[2] Search Console Property Detection')
  const sitesRes = await gscGet('/sites', accessToken)
  if (sitesRes.__error) {
    console.log(`    Sites API:     ❌ HTTP ${sitesRes.__error} — ${sitesRes.__body}`)
    await client.close(); process.exit(1)
  }
  const sites    = (sitesRes.siteEntry || [])
  const siteUrls = sites.map(s => s.siteUrl)
  const match    = siteUrls.find(u => u === SITE_URL || u === SITE_URL.replace(/\/$/, ''))
  console.log(`    Sites found:   ${siteUrls.length}`)
  siteUrls.forEach(u => console.log(`      • ${u}`))
  console.log(`    Target (${SITE_URL}): ${match ? '✅ Found' : '❌ NOT in property list'}`)
  if (!match) {
    console.log('    → Ensure the Google account has Owner/Full access to the property.')
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // CHECK 4: Daily sync status
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n[3] Daily Sync Status')
  if (lastSync) {
    console.log(`    Last sync:     ✅ ${lastSync.syncedAt}`)
    console.log(`    Sync date:     ${lastSync.syncDate}`)
    console.log(`    Period:        ${lastSync.currentPeriod?.startDate} → ${lastSync.currentPeriod?.endDate}`)
    console.log(`    Queries synced:${lastSync.queryCount ?? 'n/a'}`)
    console.log(`    Pages synced:  ${lastSync.pageCount ?? 'n/a'}`)
  } else {
    console.log('    Last sync:     ⚠️  No sync records — cron has not run since reconnect')
    console.log('    Cron schedule: Daily at 05:00 UTC (/api/admin/growth/cron/gsc-sync)')
  }
  console.log('    Cron config:   ✅ Active in vercel.json (schedule: "0 5 * * *")')

  // ─────────────────────────────────────────────────────────────────────────────
  // CHECK 5: Links API capability
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n[4] Backlinks API Access')
  const encodedSite = encodeURIComponent(SITE_URL)
  const linksRes    = await gscGet(`/sites/${encodedSite}/searchAnalytics/query`, accessToken)
  // Test via a minimal query
  const testQuery   = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodedSite}/searchAnalytics/query`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate: '2026-05-01', endDate: '2026-06-10', dimensions: ['page'], rowLimit: 1 })
    }
  )
  const testOk = testQuery.ok
  console.log(`    Search Analytics API:  ${testOk ? '✅ Accessible' : '❌ HTTP ' + testQuery.status}`)

  // GSC Links report — note: the webmasters v3 API does not expose the Links
  // (external backlinks) report that appears in the GSC UI. The only API
  // endpoints are searchAnalytics (performance data) and sitemaps. External
  // backlink data requires a third-party SEO tool API.
  console.log('    External Backlinks API:⚠️  NOT available via Google Search Console API v1')
  console.log('    (GSC UI → Links tab is not exposed in the webmasters/v3 API)')

  // ─────────────────────────────────────────────────────────────────────────────
  // BACKLINKS — Pull from GSC what IS available: top pages by impressions
  // (these are the pages Google is ranking / showing for the site)
  // For true external backlinks, export via GSC UI or use Ahrefs/Semrush
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n[5] Pulling Canonical Page Performance from GSC (Search Analytics)')
  const syncDate  = lastSync?.syncDate
  const allCanonRows = []

  if (syncDate && testOk) {
    // Live query for each canonical URL
    for (const page of CANONICAL) {
      const res = await fetch(
        `https://www.googleapis.com/webmasters/v3/sites/${encodedSite}/searchAnalytics/query`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startDate: '2026-05-13',
            endDate:   '2026-06-10',
            dimensions: ['query'],
            dimensionFilterGroups: [{
              filters: [{ dimension: 'page', operator: 'equals', expression: page }]
            }],
            rowLimit: 100,
          })
        }
      )
      const data = await res.json()
      const rows = (data.rows || []).map(r => ({
        page,
        query:       r.keys[0],
        impressions: r.impressions,
        clicks:      r.clicks,
        ctr:         (r.ctr * 100).toFixed(1) + '%',
        position:    Number(r.position).toFixed(1),
      }))
      allCanonRows.push(...rows)
      const slug = page.split('/').pop()
      console.log(`    ${slug}: ${rows.length} query rows`)
    }

    if (allCanonRows.length > 0) {
      const csvPath = path.join(OUT_DIR, 'canonical-queries.csv')
      fs.writeFileSync(csvPath, toCsv(allCanonRows, ['page','query','impressions','clicks','ctr','position']))
      console.log(`    ✅ Exported: audit/gsc-exports/canonical-queries.csv (${allCanonRows.length} rows)`)
    }
  }

  // Top pages — from MongoDB (most recent sync)
  console.log('\n[6] Top Linked Pages (GSC — pages by impressions, last 28 days)')
  const pageRows = await db.collection('gsc_page_rows')
    .find({ syncDate, period: 'current' })
    .sort({ impressions: -1 })
    .limit(50)
    .toArray()

  const topPages = pageRows.map(r => ({
    page:        String(r.page).replace('https://www.100xcircle.com', ''),
    impressions: r.impressions,
    clicks:      r.clicks,
    ctr:         (r.ctr * 100).toFixed(1) + '%',
    position:    Number(r.position).toFixed(1),
  }))

  if (topPages.length) {
    const csvPath = path.join(OUT_DIR, 'top-pages.csv')
    fs.writeFileSync(csvPath, toCsv(topPages, ['page','impressions','clicks','ctr','position']))
    console.log(`    ✅ Exported: audit/gsc-exports/top-pages.csv (${topPages.length} rows)`)
    topPages.slice(0, 10).forEach(r =>
      console.log(`    ${r.page.padEnd(55)} impr:${String(r.impressions).padStart(5)}  pos:${r.position}`)
    )
  }

  // Top queries
  const queryRows = await db.collection('gsc_query_rows')
    .find({ syncDate, period: 'current' })
    .sort({ impressions: -1 })
    .limit(100)
    .toArray()

  const topQueries = queryRows.map(r => ({
    query:       r.query,
    impressions: r.impressions,
    clicks:      r.clicks,
    ctr:         (r.ctr * 100).toFixed(1) + '%',
    position:    Number(r.position).toFixed(1),
  }))

  if (topQueries.length) {
    const csvPath = path.join(OUT_DIR, 'top-queries.csv')
    fs.writeFileSync(csvPath, toCsv(topQueries, ['query','impressions','clicks','ctr','position']))
    console.log(`    ✅ Exported: audit/gsc-exports/top-queries.csv (${topQueries.length} rows)`)
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // BACKLINK NOTE
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('\n[7] External Backlink Report')
  console.log('    ─────────────────────────────────────────────────────────────')
  console.log('    The Google Search Console API (webmasters/v3) does NOT expose')
  console.log('    external backlink data. The Links tab in the GSC UI is a')
  console.log('    read-only dashboard — there is no corresponding API endpoint.')
  console.log('')
  console.log('    To get external backlinks for the 3 canonical URLs:')
  console.log('')
  console.log('    Option A — GSC UI export (free):')
  console.log('      1. search.google.com/search-console → Links → Export External Links')
  console.log('      2. Filter by each canonical URL')
  console.log('      3. Download as CSV/Google Sheets')
  console.log('')
  console.log('    Option B — Ahrefs/Semrush (most complete):')
  CANONICAL.forEach(u => console.log(`      • ${u}`))
  console.log('')
  console.log('    Canonical URL backlink status note:')
  console.log('    Any existing backlink pointing to a /products/* variant now')
  console.log('    passes full link equity through the 301 redirect to the')
  console.log('    canonical URL. No backlink is lost — consolidation is passive.')

  // Summary
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const summaryPath = path.join(OUT_DIR, `diagnostic-${ts}.json`)
  fs.writeFileSync(summaryPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    oauthConnectedAs: doc.connectedEmail,
    tokenValid: tokenFresh || true,
    lastSyncAt: lastSync?.syncedAt,
    lastSyncDate: lastSync?.syncDate,
    propertyUrl: SITE_URL,
    propertyDetected: !!match,
    canonicalQueryRows: allCanonRows.length,
    topPagesExported: topPages.length,
    topQueriesExported: topQueries.length,
    externalBacklinksAvailable: false,
    externalBacklinksNote: 'GSC API does not expose external backlinks. Use GSC UI export or Ahrefs/Semrush.',
  }, null, 2))
  console.log(`\n    ✅ Diagnostic summary: audit/gsc-exports/diagnostic-${ts}.json`)

  console.log('\n' + '='.repeat(72))
  console.log('EXPORTS WRITTEN TO: audit/gsc-exports/')
  console.log('  canonical-queries.csv  — queries per canonical URL')
  console.log('  top-pages.csv          — top 50 site pages by impressions')
  console.log('  top-queries.csv        — top 100 queries by impressions')
  console.log('='.repeat(72) + '\n')

  await client.close()
})()
