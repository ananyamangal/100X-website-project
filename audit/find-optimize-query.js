/**
 * Finds the exact URL ranking for the "optimize handheld fogging crowds" queries.
 * Uses GSC searchAnalytics with dimensions: [query, page] to get the page.
 * Also searches all MongoDB collections for these strings.
 *
 * Run: node audit/find-optimize-query.js
 */

const fs   = require('fs')
const path = require('path')
const { MongoClient } = require('mongodb')

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

const MONGODB_URI = process.env.MONGODB_URI
const SITE_URL    = (process.env.GOOGLE_SC_SITE_URL || 'https://www.100xcircle.com/').trim()

const TARGETS = [
  '"optimize handheld fogging crowds"',
  '"optimize-handheld-fogging-crowds"',
  'aerosoldiy optimize handheld fogging crowds',
]

// Patterns to search in text content
const SEARCH_PATTERNS = [
  /optimize.{0,10}handheld.{0,20}fogg/i,
  /handheld.{0,20}fogg.{0,20}crowd/i,
  /optimize.{0,20}crowd/i,
]

;(async () => {
  console.log('\n' + '='.repeat(72))
  console.log('URGENT SEO AUDIT — "optimize handheld fogging crowds"')
  console.log(`Timestamp: ${new Date().toISOString()}`)
  console.log('='.repeat(72))

  const client = new MongoClient(MONGODB_URI)
  await client.connect()
  const db = client.db()

  // ── Step 1: GSC live query — find the EXACT page ranking ─────────────────
  console.log('\n[1] GSC LIVE QUERY — dimensions: [query, page]')
  console.log('    Finding the exact URL ranking for these queries...\n')

  const tokenDoc = await db.collection('google_oauth_tokens').findOne({ _docId: 'google-oauth-singleton' })
  let accessToken = tokenDoc?.accessToken

  if (accessToken) {
    // Try to refresh if expired
    const expiresAt  = new Date(tokenDoc.expiresAt).getTime()
    const tokenFresh = Date.now() < expiresAt - 5 * 60 * 1000
    if (!tokenFresh) {
      const id  = (process.env.GOOGLE_OAUTH_CLIENT_ID  || '').trim()
      const sec = (process.env.GOOGLE_OAUTH_CLIENT_SECRET || '').trim()
      if (id && sec) {
        const r = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ refresh_token: tokenDoc.refreshToken, client_id: id, client_secret: sec, grant_type: 'refresh_token' }).toString(),
        })
        if (r.ok) { accessToken = (await r.json()).access_token }
      }
    }

    const encodedSite = encodeURIComponent(SITE_URL)
    for (const q of TARGETS) {
      const res = await fetch(
        `https://www.googleapis.com/webmasters/v3/sites/${encodedSite}/searchAnalytics/query`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startDate: '2026-04-01',
            endDate:   '2026-06-12',
            dimensions: ['query', 'page'],
            dimensionFilterGroups: [{
              filters: [{ dimension: 'query', operator: 'equals', expression: q.replace(/^"|"$/g,'') }]
            }],
            rowLimit: 10,
          })
        }
      )
      const data = await res.json()
      console.log(`  Query: "${q}"`)
      if (data.rows?.length) {
        data.rows.forEach(r => {
          console.log(`    ✅ Page: ${r.keys[1]}`)
          console.log(`       Impr: ${r.impressions}  Clicks: ${r.clicks}  Pos: ${Number(r.position).toFixed(1)}`)
        })
      } else if (data.error) {
        console.log(`    GSC error: ${data.error.message}`)
      } else {
        console.log(`    No rows returned (query may not be in this date window)`)
      }
    }
  } else {
    console.log('  ❌ No OAuth token available for live GSC query.')
  }

  // ── Step 2: Search all MongoDB collections ────────────────────────────────
  console.log('\n[2] MONGODB FULL-CONTENT SEARCH')
  console.log('    Searching across all collections...\n')

  const COLLECTIONS_TO_SEARCH = [
    'blogs', 'landing_page_overrides', 'page_sections', 'product_section_templates',
    'growth_os_drafts', 'growth_os_logs', 'growth_os_opportunities', 'growth_opportunity_reports',
    'growth_opportunities', 'growth_os_automations', 'growth_os_link_graph', 'growth_os_citations',
    'growth_os_citation_tasks', 'growth_os_schema_audit', 'offpage_opportunities',
    'home_content', 'homepage_sections', 'landing_page_audit',
    'products', 'site_settings', 'banners', 'about_page',
    'ads_director_snapshots', 'ads_campaign_plans', 'ads_campaign_factory_v2_runs',
    'ads_keyword_intelligence', 'ads_state_intelligence', 'ads_ad_copy_variants',
  ]

  const findings = []

  for (const colName of COLLECTIONS_TO_SEARCH) {
    try {
      const docs = await db.collection(colName).find({}).limit(500).toArray()
      for (const doc of docs) {
        const text = JSON.stringify(doc).toLowerCase()
        if (
          text.includes('optimize handheld') ||
          text.includes('optimize-handheld') ||
          text.includes('handheld fogging crowds') ||
          text.includes('aerosoldiy')
        ) {
          // Find the exact field
          const docStr = JSON.stringify(doc, null, 2)
          const lines = docStr.split('\n')
          const matchLines = lines.filter(l =>
            l.toLowerCase().includes('optimize handheld') ||
            l.toLowerCase().includes('optimize-handheld') ||
            l.toLowerCase().includes('handheld fogging crowds') ||
            l.toLowerCase().includes('aerosoldiy')
          )
          findings.push({
            collection: colName,
            id: String(doc._id),
            slug: doc.slug || doc.url || doc.path || '',
            title: doc.title || doc.name || doc.keyword || '',
            matchedLines: matchLines.slice(0, 5),
          })
          console.log(`  🔴 MATCH in [${colName}]`)
          console.log(`     _id: ${doc._id}  slug/title: ${doc.slug || doc.title || doc.name || ''}`)
          matchLines.slice(0, 5).forEach(l => console.log(`     → ${l.trim().slice(0,120)}`))
          console.log()
        }
      }
    } catch (err) {
      // collection may not exist or be accessible
    }
  }

  if (findings.length === 0) {
    console.log('  No matches found in MongoDB content collections.')
  }

  // ── Step 3: Search additional AI / growth collections ─────────────────────
  console.log('\n[3] EXTENDED SEARCH — AI content and growth OS artifacts')

  const EXTRA_COLS = [
    'growth_exec_summaries', 'gem_procurement_insights', 'gem_procurement_ai_log',
    'ads_daily_briefing', 'ads_budget_recommendations_v2', 'ads_approval_queue',
    'ads_deployments', 'ads_negative_intelligence', 'gem_kg_dealer_dept',
    'bid_lifecycle', 'case_studies', 'customers', 'reviews', 'submissions',
  ]

  let extraMatches = 0
  for (const colName of EXTRA_COLS) {
    try {
      const docs = await db.collection(colName).find({}).limit(500).toArray()
      for (const doc of docs) {
        const text = JSON.stringify(doc).toLowerCase()
        if (text.includes('optimize handheld') || text.includes('handheld fogging crowds') || text.includes('aerosoldiy')) {
          const docStr = JSON.stringify(doc, null, 2)
          const lines = docStr.split('\n').filter(l =>
            l.toLowerCase().includes('optimize handheld') ||
            l.toLowerCase().includes('handheld fogging crowds') ||
            l.toLowerCase().includes('aerosoldiy')
          )
          console.log(`  🔴 MATCH in [${colName}]`)
          console.log(`     _id: ${doc._id}`)
          lines.slice(0, 3).forEach(l => console.log(`     → ${l.trim().slice(0,120)}`))
          extraMatches++
        }
      }
    } catch {}
  }
  if (extraMatches === 0) console.log('  No matches in extended collections.')

  // ── Step 4: Check sitemap ─────────────────────────────────────────────────
  console.log('\n[4] SITEMAP CHECK')
  try {
    const sitemapRes = await fetch('https://www.100xcircle.com/sitemap.xml')
    const sitemapText = await sitemapRes.text()
    if (sitemapText.toLowerCase().includes('optimize') || sitemapText.toLowerCase().includes('handheld')) {
      console.log('  ⚠️  Sitemap contains "optimize" or "handheld" — check manually')
    } else {
      console.log('  ✅ Sitemap does not contain these terms')
    }
  } catch (e) {
    console.log('  ❌ Could not fetch sitemap:', e.message)
  }

  // ── Step 5: Direct URL probes ─────────────────────────────────────────────
  console.log('\n[5] DIRECT URL PROBES')
  const candidateUrls = [
    'https://www.100xcircle.com/optimize-handheld-fogging-crowds',
    'https://www.100xcircle.com/optimize-handheld-fogging',
    'https://www.100xcircle.com/handheld-fogging-crowds',
    'https://www.100xcircle.com/ai/optimize-handheld-fogging-crowds',
    'https://www.100xcircle.com/knowledge/optimize-handheld-fogging-crowds',
    'https://www.100xcircle.com/blog/optimize-handheld-fogging-crowds',
  ]
  for (const url of candidateUrls) {
    try {
      const r = await fetch(url, { method: 'HEAD', redirect: 'manual' })
      if (r.status === 200) {
        console.log(`  🔴 LIVE PAGE: ${url}  (HTTP ${r.status})`)
      } else if (r.status === 301 || r.status === 308) {
        console.log(`  ↗️  REDIRECT: ${url} → ${r.headers.get('location')}`)
      } else {
        console.log(`  ✅ ${r.status}: ${url}`)
      }
    } catch (e) {
      console.log(`  ❌ Error fetching ${url}: ${e.message}`)
    }
  }

  console.log('\n' + '='.repeat(72))
  console.log(`Total MongoDB findings: ${findings.length + extraMatches}`)
  console.log('='.repeat(72) + '\n')

  await client.close()
})()
