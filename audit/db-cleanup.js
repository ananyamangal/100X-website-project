/**
 * Database cleanup — find, backup, and delete test/audit records
 * Authenticates with admin API, exports backup, then deletes confirmed test data
 */
const fs = require('fs')
const BASE = 'https://www.100xcircle.com'

// ── Auth ──────────────────────────────────────────────────────────────────────
async function getAuthCookie() {
  // Try env var password first, then fallback
  const passwords = [
    process.env.ADMIN_PASSWORD,
    'dtu@ananya',
  ].filter(Boolean)

  for (const pw of passwords) {
    const res = await fetch(`${BASE}/api/admin/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw }),
    })
    if (res.ok) {
      // Extract cookie from Set-Cookie header
      const setCookie = res.headers.get('set-cookie') || ''
      const match = setCookie.match(/admin-token=([^;]+)/)
      if (match) return `admin-token=${match[1]}`
    }
  }
  throw new Error('Authentication failed — check ADMIN_PASSWORD env var or default password')
}

async function authedGet(cookie, path) {
  const r = await fetch(`${BASE}${path}`, {
    headers: { Cookie: cookie }
  })
  if (!r.ok) throw new Error(`GET ${path} returned ${r.status}`)
  return r.json()
}

async function authedDelete(cookie, path) {
  const r = await fetch(`${BASE}${path}`, {
    method: 'DELETE',
    headers: { Cookie: cookie }
  })
  return { status: r.status, ok: r.ok, body: await r.json().catch(() => null) }
}

// ── Pattern matching ──────────────────────────────────────────────────────────
const TEST_PATTERNS = [/AUDIT_TEST/i, /^test$/i, /^testing$/i, /^dummy$/i, /^sample$/i]

function isTestRecord(str) {
  if (!str || typeof str !== 'string') return false
  return TEST_PATTERNS.some(p => p.test(str.trim()))
}

// ── Main ──────────────────────────────────────────────────────────────────────
;(async () => {
  console.log('\n╔══════════════════════════════════════════╗')
  console.log('║   DATABASE TEST RECORD CLEANUP           ║')
  console.log('╚══════════════════════════════════════════╝\n')

  // 1. Authenticate
  console.log('Authenticating with admin API...')
  let cookie
  try {
    cookie = await getAuthCookie()
    console.log('✅ Authenticated\n')
  } catch (e) {
    console.error('❌ ' + e.message)
    process.exit(1)
  }

  // 2. Fetch all reviews
  console.log('─── FETCHING ALL REVIEWS ───')
  const allReviews = await authedGet(cookie, '/api/admin/reviews')
  console.log(`Total reviews in DB: ${allReviews.length}`)

  // 3. Identify test reviews
  const testReviews = allReviews.filter(r => {
    return isTestRecord(r.customerName) ||
           isTestRecord(r.review) ||
           isTestRecord(r.organization)
  })

  const legitReviews = allReviews.filter(r => !testReviews.includes(r))

  console.log(`\nTest/audit reviews found: ${testReviews.length}`)
  console.log(`Legitimate reviews: ${legitReviews.length}\n`)

  if (testReviews.length > 0) {
    console.log('─── TEST REVIEWS IDENTIFIED ───')
    testReviews.forEach((r, i) => {
      console.log(`\n  [${i+1}] ID: ${r._id}`)
      console.log(`      Customer Name: ${JSON.stringify(r.customerName)}`)
      console.log(`      Rating:        ${r.rating}`)
      console.log(`      Review Text:   ${JSON.stringify(r.review)}`)
      console.log(`      Organization:  ${JSON.stringify(r.organization)}`)
      console.log(`      Created:       ${r.createdAt || r.created_at || 'unknown'}`)
    })

    // 4. Export backup BEFORE deletion
    const backup = {
      exportDate: new Date().toISOString(),
      collection: 'reviews',
      recordCount: testReviews.length,
      records: testReviews,
    }
    const backupPath = `audit/backup-reviews-${Date.now()}.json`
    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2))
    console.log(`\n✅ Backup saved: ${backupPath}`)

    // 5. Delete test reviews
    console.log('\n─── DELETING TEST REVIEWS ───')
    let deleted = 0
    let failed = 0
    for (const r of testReviews) {
      const result = await authedDelete(cookie, `/api/admin/reviews/${r._id}`)
      if (result.ok || result.status === 200 || result.status === 204) {
        console.log(`  ✅ Deleted: ${r._id} (${r.customerName || 'no name'})`)
        deleted++
      } else {
        console.log(`  ❌ Failed:  ${r._id} — HTTP ${result.status}`)
        failed++
      }
    }
    console.log(`\n  Deleted: ${deleted}, Failed: ${failed}`)
  } else {
    console.log('✅ No test/audit reviews found.')
  }

  // 6. Also check products for test records
  console.log('\n─── CHECKING PRODUCTS FOR TEST RECORDS ───')
  const allProds = await authedGet(cookie, '/api/admin/products')
  const testProds = allProds.filter(p => isTestRecord(p.name) || isTestRecord(p.description))
  console.log(`Test products found: ${testProds.length}`)
  testProds.forEach(p => console.log(`  ID: ${p._id} | Name: ${p.name}`))
  if (testProds.length > 0) {
    const backupP = { exportDate: new Date().toISOString(), collection: 'products', records: testProds }
    fs.writeFileSync(`audit/backup-products-${Date.now()}.json`, JSON.stringify(backupP, null, 2))
    for (const p of testProds) {
      const r = await authedDelete(cookie, `/api/admin/products/${p._id}`)
      console.log(`  ${r.ok ? '✅ Deleted' : '❌ Failed'}: ${p.name}`)
    }
  }

  // 7. Final review count check
  console.log('\n─── FINAL STATE ───')
  const finalReviews = await authedGet(cookie, '/api/admin/reviews')
  const finalProds = await authedGet(cookie, '/api/admin/products')
  console.log(`Reviews remaining: ${finalReviews.length}`)
  console.log(`Products remaining: ${finalProds.length}`)
  finalReviews.forEach(r => console.log(`  Review: "${r.customerName}" | ${r.rating}★ | "${(r.review||'').substring(0,50)}"` ))

  console.log('\n✅ Cleanup complete.')
})()
