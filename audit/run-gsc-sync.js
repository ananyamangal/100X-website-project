/**
 * Full GSC sync — local equivalent of runGSCSync() in lib/gsc-sync.ts.
 * Reads stored OAuth token from MongoDB, fetches current+previous 28-day
 * windows (queries + pages), stores to MongoDB in the same schema, then
 * prints a full report.
 *
 * Run: node audit/run-gsc-sync.js
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
const SITE_URL    = (process.env.GOOGLE_SC_SITE_URL || 'https://www.100xcircle.com/').trim()
const CANONICAL   = [
  'https://www.100xcircle.com/thermal-and-cold-fogging-machine-100xtfs50',
  'https://www.100xcircle.com/thermal-fogging-machine-with-stainless-steel-tank-100xssma20',
  'https://www.100xcircle.com/double-barrel-thermal-fogging-machine-vehicle-mountable-100xdb400',
]

function toGSCDate(d) { return d.toISOString().split('T')[0] }

function dateRange(daysBack, endDate) {
  const e = endDate ? new Date(endDate) : new Date()
  const s = new Date(e)
  s.setDate(s.getDate() - daysBack)
  return { startDate: toGSCDate(s), endDate: toGSCDate(e) }
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
  if (!r.ok) { const b = await r.text(); console.log('  Refresh failed:', b.slice(0,200)); return null }
  const j = await r.json()
  return { accessToken: j.access_token, expiresIn: j.expires_in }
}

async function queryGSC(opts, accessToken) {
  const encodedSite = encodeURIComponent(SITE_URL)
  const res = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodedSite}/searchAnalytics/query`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startDate: opts.startDate,
        endDate:   opts.endDate,
        dimensions: opts.dimensions,
        rowLimit:   opts.rowLimit ?? 1000,
        startRow:   opts.startRow ?? 0,
        dataState: 'final',
      }),
    }
  )
  if (res.status === 401) throw new Error('GSC 401 — access token invalid')
  if (res.status === 403) throw new Error('GSC 403 — account lacks GSC property access')
  if (res.status === 404) throw new Error(`GSC 404 — property not found (${SITE_URL})`)
  if (!res.ok) { const e = await res.text(); throw new Error(`GSC ${res.status}: ${e.slice(0,300)}`) }
  const data = await res.json()
  if (!data.rows) return []
  return data.rows.map(row => {
    const r = { clicks: row.clicks, impressions: row.impressions, ctr: row.ctr, position: row.position }
    opts.dimensions.forEach((dim, i) => { r[dim] = row.keys[i] })
    return r
  })
}

async function fetchAll(opts, accessToken) {
  const all = []
  let startRow = 0
  const BATCH = 1000
  while (true) {
    const batch = await queryGSC({ ...opts, rowLimit: BATCH, startRow }, accessToken)
    all.push(...batch)
    if (batch.length < BATCH) break
    startRow += BATCH
    if (startRow >= 5000) break
  }
  return all
}

;(async () => {
  console.log('\n' + '='.repeat(72))
  console.log('GSC SYNC — RUNNING')
  console.log(`Timestamp: ${new Date().toISOString()}`)
  console.log(`Property:  ${SITE_URL}`)
  console.log('='.repeat(72))

  const client = new MongoClient(MONGODB_URI)
  await client.connect()
  const db = client.db()

  // ── Get stored OAuth token ──────────────────────────────────────────────────
  const doc = await db.collection('google_oauth_tokens').findOne({ _docId: 'google-oauth-singleton' })
  if (!doc?.refreshToken) {
    console.log('\n❌ No Google account connected. Reconnect in admin panel.')
    await client.close(); process.exit(1)
  }

  const nowMs      = Date.now()
  const expiresAt  = new Date(doc.expiresAt).getTime()
  const tokenFresh = nowMs < expiresAt - 5 * 60 * 1000

  console.log(`\nConnected as: ${doc.connectedEmail || 'unknown'}`)
  console.log(`Token:        ${tokenFresh ? '✅ Valid' : '⚠️ Expired — attempting refresh'}`)

  let accessToken = doc.accessToken
  if (!tokenFresh) {
    console.log('Refreshing token...')
    const refreshed = await tryRefresh(doc.refreshToken)
    if (!refreshed) {
      console.log('\n❌ Token refresh failed. Reconnect OAuth in admin panel.')
      await client.close(); process.exit(1)
    }
    accessToken = refreshed.accessToken
    const newExpiry = new Date(nowMs + refreshed.expiresIn * 1000).toISOString()
    await db.collection('google_oauth_tokens').updateOne(
      { _docId: 'google-oauth-singleton' },
      { $set: { accessToken, expiresAt: newExpiry, updatedAt: new Date().toISOString() } }
    )
    console.log('✅ Token refreshed.')
  }

  // ── Date windows ───────────────────────────────────────────────────────────
  const current  = dateRange(28)
  const previous = dateRange(28, new Date(current.startDate))
  const syncedAt = new Date().toISOString()
  const syncDate = syncedAt.split('T')[0]

  console.log(`\nSync date:   ${syncDate}`)
  console.log(`Current:     ${current.startDate} → ${current.endDate}`)
  console.log(`Previous:    ${previous.startDate} → ${previous.endDate}`)

  // ── Fetch and store ─────────────────────────────────────────────────────────
  let queryCount = 0, pageCount = 0
  const errors = []

  try {
    process.stdout.write('\nFetching current queries...')
    const currQueries = await fetchAll({ dimensions: ['query'], ...current }, accessToken)
    queryCount = currQueries.length
    process.stdout.write(` ${queryCount} rows\n`)
    if (currQueries.length > 0) {
      await db.collection('gsc_query_rows').deleteMany({ syncDate, period: 'current' })
      await db.collection('gsc_query_rows').insertMany(currQueries.map(r => ({ ...r, syncDate, period: 'current', ...current })))
    }

    process.stdout.write('Fetching previous queries...')
    const prevQueries = await fetchAll({ dimensions: ['query'], ...previous }, accessToken)
    process.stdout.write(` ${prevQueries.length} rows\n`)
    if (prevQueries.length > 0) {
      await db.collection('gsc_query_rows').deleteMany({ syncDate, period: 'previous' })
      await db.collection('gsc_query_rows').insertMany(prevQueries.map(r => ({ ...r, syncDate, period: 'previous', ...previous })))
    }

    process.stdout.write('Fetching current pages...')
    const currPages = await fetchAll({ dimensions: ['page'], ...current }, accessToken)
    pageCount = currPages.length
    process.stdout.write(` ${pageCount} rows\n`)
    if (currPages.length > 0) {
      await db.collection('gsc_page_rows').deleteMany({ syncDate, period: 'current' })
      await db.collection('gsc_page_rows').insertMany(currPages.map(r => ({ ...r, syncDate, period: 'current', ...current })))
    }

    process.stdout.write('Fetching previous pages...')
    const prevPages = await fetchAll({ dimensions: ['page'], ...previous }, accessToken)
    process.stdout.write(` ${prevPages.length} rows\n`)
    if (prevPages.length > 0) {
      await db.collection('gsc_page_rows').deleteMany({ syncDate, period: 'previous' })
      await db.collection('gsc_page_rows').insertMany(prevPages.map(r => ({ ...r, syncDate, period: 'previous', ...previous })))
    }
  } catch (err) {
    errors.push(String(err))
    console.log('\n❌ Error during fetch:', String(err))
  }

  // ── Persist sync doc ────────────────────────────────────────────────────────
  const syncDoc = {
    syncedAt, syncDate, siteUrl: SITE_URL,
    currentPeriod: current, previousPeriod: previous,
    queryCount, pageCount, errors,
    status: errors.length === 0 ? 'ok' : 'partial',
  }
  await db.collection('gsc_syncs').insertOne(syncDoc)

  // Prune old syncs (keep 30)
  const count = await db.collection('gsc_syncs').countDocuments()
  if (count > 30) {
    const oldest = await db.collection('gsc_syncs').find({}).sort({ syncedAt: 1 }).limit(count - 30).project({ _id: 1 }).toArray()
    if (oldest.length) await db.collection('gsc_syncs').deleteMany({ _id: { $in: oldest.map(d => d._id) } })
  }

  if (errors.length > 0) {
    console.log('\n❌ Sync completed with errors — see above.')
    await client.close(); process.exit(1)
  }

  console.log('\n✅ Sync complete.')

  // ── BASELINE COMPARISON (previous sync for delta) ─────────────────────────
  // Find the most recent prior sync (not today's)
  const prevSync = await db.collection('gsc_syncs').findOne(
    { syncDate: { $ne: syncDate } },
    { sort: { syncedAt: -1 } }
  )
  const prevSyncDate = prevSync?.syncDate

  // ── REPORT ─────────────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(72))
  console.log('GSC SYNC REPORT')
  console.log('='.repeat(72))
  console.log(`\n[1] SYNC METADATA`)
  console.log(`    Synced at:     ${syncedAt}`)
  console.log(`    Sync date:     ${syncDate}`)
  console.log(`    Period:        ${current.startDate} → ${current.endDate}`)
  console.log(`    Queries stored:${queryCount}`)
  console.log(`    Pages stored:  ${pageCount}`)
  console.log(`    Status:        ${errors.length === 0 ? '✅ OK' : '⚠️ Partial'}`)
  console.log(`    Baseline from: ${prevSyncDate || 'none (first sync)'}`)

  // ── Canonical pages ─────────────────────────────────────────────────────────
  console.log('\n[2] CANONICAL PAGE PERFORMANCE')
  console.log('    ' + '-'.repeat(68))
  console.log('    Slug                                              Impr  Clk   CTR   Pos')
  console.log('    ' + '-'.repeat(68))

  const currPageRows = await db.collection('gsc_page_rows').find({ syncDate, period: 'current' }).toArray()
  const prevPageRows = prevSyncDate
    ? await db.collection('gsc_page_rows').find({ syncDate: prevSyncDate, period: 'current' }).toArray()
    : []

  const currPageMap = new Map(currPageRows.map(r => [String(r.page), r]))
  const prevPageMap = new Map(prevPageRows.map(r => [String(r.page), r]))

  const canonResults = []
  for (const url of CANONICAL) {
    const slug = url.split('/').pop()
    const curr = currPageMap.get(url)
    const prev = prevPageMap.get(url)
    const impr = curr?.impressions ?? 0
    const clks = curr?.clicks ?? 0
    const ctr  = curr ? (curr.ctr * 100).toFixed(1) + '%' : 'n/a'
    const pos  = curr ? Number(curr.position).toFixed(1) : 'n/a'

    let delta = ''
    if (prev) {
      const dImpr = impr - (prev.impressions ?? 0)
      const dPos  = Number(curr?.position ?? 0) - Number(prev.position ?? 0)
      delta = `  Δimpr: ${dImpr >= 0 ? '+' : ''}${dImpr}  Δpos: ${dPos >= 0 ? '+' : ''}${dPos.toFixed(1)}`
    }

    console.log(`    ${slug.slice(0,50).padEnd(50)} ${String(impr).padStart(4)}  ${String(clks).padStart(3)}  ${ctr.padStart(6)}  ${String(pos).padStart(5)}`)
    if (delta) console.log(`    ${''.padEnd(50)} ${delta}`)
    canonResults.push({ url, slug, impr, clks, ctr, pos, prev })
  }

  // ── Legacy /products/* ─────────────────────────────────────────────────────
  console.log('\n[3] LEGACY /products/* PAGES — still receiving impressions')
  console.log('    ' + '-'.repeat(68))
  const legacyPages = currPageRows
    .filter(r => String(r.page).includes('/products/') && !String(r.page).endsWith('/products'))
    .sort((a, b) => b.impressions - a.impressions)

  if (legacyPages.length === 0) {
    console.log('    ✅ None — all /products/* pages have dropped from GSC data.')
  } else {
    console.log(`    ⚠️  ${legacyPages.length} legacy page(s) still visible:`)
    legacyPages.forEach(r => {
      const p = String(r.page).replace('https://www.100xcircle.com', '')
      const prev = prevPageMap.get(String(r.page))
      const dImpr = prev ? ` (was ${prev.impressions})` : ''
      console.log(`    ${p.padEnd(60)} impr:${r.impressions}${dImpr}  pos:${Number(r.position).toFixed(0)}`)
    })
    console.log('\n    These 301-redirect to canonical URLs and will clear as Googlebot re-crawls.')
  }

  // ── Top 20 queries ──────────────────────────────────────────────────────────
  console.log('\n[4] TOP 20 QUERIES BY IMPRESSIONS')
  console.log('    ' + '-'.repeat(72))
  console.log('    Query                                          Pos    Impr   Clk   CTR')
  console.log('    ' + '-'.repeat(72))

  const currQueryRows = await db.collection('gsc_query_rows').find({ syncDate, period: 'current' }).sort({ impressions: -1 }).limit(20).toArray()
  const prevQueryRows = prevSyncDate
    ? await db.collection('gsc_query_rows').find({ syncDate: prevSyncDate, period: 'current' }).toArray()
    : []
  const prevQueryMap = new Map(prevQueryRows.map(r => [String(r.query), r]))

  for (const r of currQueryRows) {
    const pos   = Number(r.position).toFixed(1).padStart(6)
    const impr  = String(r.impressions).padStart(6)
    const clk   = String(r.clicks).padStart(5)
    const ctr   = (r.ctr * 100).toFixed(1).padStart(5) + '%'
    const pRow  = prevQueryMap.get(String(r.query))
    const dPos  = pRow ? (Number(r.position) - Number(pRow.position)).toFixed(1) : null
    const flag  = dPos !== null ? (parseFloat(dPos) < -1 ? ' ↑' : parseFloat(dPos) > 1 ? ' ↓' : '  ') : '  '
    console.log(`    ${String(r.query).slice(0,46).padEnd(46)} ${pos}  ${impr}  ${clk}  ${ctr}${flag}`)
  }

  // ── Soft-404 / indexing issues ─────────────────────────────────────────────
  console.log('\n[5] INDEXING & SOFT-404 CHECK')
  console.log('    ' + '-'.repeat(68))

  // Pages ranked in pos 1-10 with 0 clicks (potential soft-404 or title mismatch)
  const zeroClickTopPages = currPageRows
    .filter(r => r.position <= 10 && r.clicks === 0 && r.impressions >= 5)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 10)

  if (zeroClickTopPages.length) {
    console.log(`    ⚠️  Pages in top-10 with 0 clicks (CTR issue or title mismatch):`)
    zeroClickTopPages.forEach(r => {
      const p = String(r.page).replace('https://www.100xcircle.com', '') || '/'
      console.log(`    ${p.padEnd(60)} pos:${Number(r.position).toFixed(0).padStart(3)}  impr:${r.impressions}`)
    })
  } else {
    console.log('    ✅ No top-10 pages with zero clicks detected.')
  }

  // ── Delta vs baseline ───────────────────────────────────────────────────────
  if (prevSyncDate) {
    console.log('\n[6] DELTA VS PREVIOUS BASELINE')
    console.log(`    Comparing ${syncDate} vs ${prevSyncDate}`)
    console.log('    ' + '-'.repeat(68))

    const currAllPages = await db.collection('gsc_page_rows').find({ syncDate, period: 'current' }).toArray()
    const prevAllPages = await db.collection('gsc_page_rows').find({ syncDate: prevSyncDate, period: 'current' }).toArray()

    const totalCurrImpr = currAllPages.reduce((s, r) => s + (r.impressions || 0), 0)
    const totalCurrClks = currAllPages.reduce((s, r) => s + (r.clicks || 0), 0)
    const totalPrevImpr = prevAllPages.reduce((s, r) => s + (r.impressions || 0), 0)
    const totalPrevClks = prevAllPages.reduce((s, r) => s + (r.clicks || 0), 0)

    const dImpr = totalCurrImpr - totalPrevImpr
    const dClks = totalCurrClks - totalPrevClks

    console.log(`    Site impressions: ${totalCurrImpr}  (${dImpr >= 0 ? '+' : ''}${dImpr} vs baseline)`)
    console.log(`    Site clicks:      ${totalCurrClks}  (${dClks >= 0 ? '+' : ''}${dClks} vs baseline)`)
    console.log(`    Pages in index:   ${currAllPages.length}  (prev: ${prevAllPages.length})`)
    console.log(`    Queries indexed:  ${queryCount}`)

    // Canonical pages delta
    console.log('\n    Canonical pages delta:')
    for (const url of CANONICAL) {
      const slug = url.split('/').pop().slice(0, 50)
      const curr = currPageMap.get(url)
      const prev = prevPageMap.get(url)
      if (curr && prev) {
        const dI = (curr.impressions || 0) - (prev.impressions || 0)
        const dP = Number(curr.position) - Number(prev.position)
        const dC = (curr.clicks || 0) - (prev.clicks || 0)
        console.log(`    ${slug.padEnd(50)} impr:${dI >= 0 ? '+' : ''}${dI}  clks:${dC >= 0 ? '+' : ''}${dC}  pos:${dP >= 0 ? '+' : ''}${dP.toFixed(1)}`)
      } else if (curr && !prev) {
        console.log(`    ${slug.padEnd(50)} NEW in index (${curr.impressions} impr, pos ${Number(curr.position).toFixed(1)})`)
      } else {
        console.log(`    ${slug.padEnd(50)} No data in either period`)
      }
    }
  }

  // ── Export CSV ──────────────────────────────────────────────────────────────
  const OUT_DIR = path.join(__dirname, 'gsc-exports')
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true })

  function toCsv(rows, cols) {
    return [cols.join(','), ...rows.map(r => cols.map(c => {
      const v = String(r[c] ?? '')
      return v.includes(',') || v.includes('"') ? `"${v.replace(/"/g,'""')}"` : v
    }).join(','))].join('\r\n')
  }

  // Top queries CSV
  const allQueryRows100 = await db.collection('gsc_query_rows').find({ syncDate, period: 'current' }).sort({ impressions: -1 }).limit(200).toArray()
  fs.writeFileSync(
    path.join(OUT_DIR, `sync-${syncDate}-queries.csv`),
    toCsv(allQueryRows100.map(r => ({
      query: r.query, impressions: r.impressions, clicks: r.clicks,
      ctr: (r.ctr*100).toFixed(2)+'%', avg_position: Number(r.position).toFixed(1), sync_date: syncDate,
    })), ['query','impressions','clicks','ctr','avg_position','sync_date'])
  )

  // All pages CSV
  const allPageRows100 = await db.collection('gsc_page_rows').find({ syncDate, period: 'current' }).sort({ impressions: -1 }).limit(100).toArray()
  fs.writeFileSync(
    path.join(OUT_DIR, `sync-${syncDate}-pages.csv`),
    toCsv(allPageRows100.map(r => ({
      page: r.page, impressions: r.impressions, clicks: r.clicks,
      ctr: (r.ctr*100).toFixed(2)+'%', avg_position: Number(r.position).toFixed(1), sync_date: syncDate,
    })), ['page','impressions','clicks','ctr','avg_position','sync_date'])
  )

  console.log(`\n✅ Exports: audit/gsc-exports/sync-${syncDate}-queries.csv  |  sync-${syncDate}-pages.csv`)
  console.log('\n' + '='.repeat(72) + '\n')

  await client.close()
})()
