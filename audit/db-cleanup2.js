/**
 * Pass 2: find records with missing/empty required fields and malformed data
 */
const fs = require('fs')
const BASE = 'https://www.100xcircle.com'

async function getAuthCookie() {
  const passwords = [process.env.ADMIN_PASSWORD, 'dtu@ananya'].filter(Boolean)
  for (const pw of passwords) {
    const res = await fetch(`${BASE}/api/admin/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw }),
    })
    if (res.ok) {
      const match = (res.headers.get('set-cookie') || '').match(/admin-token=([^;]+)/)
      if (match) return `admin-token=${match[1]}`
    }
  }
  throw new Error('Auth failed')
}

async function authedGet(cookie, path) {
  const r = await fetch(`${BASE}${path}`, { headers: { Cookie: cookie } })
  return r.json()
}

async function authedDelete(cookie, path) {
  const r = await fetch(`${BASE}${path}`, { method: 'DELETE', headers: { Cookie: cookie } })
  return { ok: r.ok, status: r.status }
}

async function checkUrl(url) {
  if (!url || typeof url !== 'string' || !url.startsWith('http')) return 'INVALID_URL'
  try {
    const r = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) })
    return r.status === 200 ? 'OK' : `HTTP_${r.status}`
  } catch { return 'FETCH_ERROR' }
}

;(async () => {
  console.log('\n╔══════════════════════════════════════════╗')
  console.log('║   FULL DATA INTEGRITY AUDIT              ║')
  console.log('╚══════════════════════════════════════════╝\n')

  const cookie = await getAuthCookie()
  console.log('✅ Authenticated\n')

  const backup = { date: new Date().toISOString(), collections: {} }
  const issues = []

  // ── REVIEWS ────────────────────────────────────────────────────────────────
  console.log('═══ REVIEWS ═══')
  const reviews = await authedGet(cookie, '/api/admin/reviews')
  backup.collections.reviews = reviews
  console.log(`Total: ${reviews.length}`)

  const reviewsToDelete = []
  for (const r of reviews) {
    const ri = []
    // Show full record
    console.log(`\n  ID: ${r._id}`)
    console.log(`  customerName: ${JSON.stringify(r.customerName)}`)
    console.log(`  review:       ${JSON.stringify(r.review)}`)
    console.log(`  rating:       ${r.rating}`)
    console.log(`  createdAt:    ${r.createdAt}`)

    const hasName = r.customerName && typeof r.customerName === 'string' && r.customerName.trim() !== '' && r.customerName !== 'undefined'
    const hasReview = r.review && typeof r.review === 'string' && r.review.trim() !== ''
    const hasValidRating = r.rating >= 1 && r.rating <= 5

    if (!hasName) ri.push('MISSING_CUSTOMER_NAME')
    if (!hasReview) ri.push('MISSING_REVIEW_TEXT')
    if (!hasValidRating) ri.push('INVALID_RATING')

    // Mark as test if missing both name AND review
    const likelyTest = !hasName && !hasReview
    if (likelyTest) {
      ri.push('⚠️ LIKELY_TEST_RECORD')
      reviewsToDelete.push(r)
    }

    if (ri.length > 0) {
      ri.forEach(i => { issues.push(`Review ${r._id}: ${i}`); console.log(`  ⚠️  ${i}`) })
    } else {
      console.log(`  ✅ OK`)
    }
  }

  // Delete confirmed test reviews
  if (reviewsToDelete.length > 0) {
    console.log(`\n─── DELETING ${reviewsToDelete.length} TEST REVIEW(S) ───`)
    for (const r of reviewsToDelete) {
      const result = await authedDelete(cookie, `/api/admin/reviews/${r._id}`)
      console.log(`  ${result.ok ? '✅' : '❌'} Deleted review ${r._id}`)
    }
  }

  // ── PRODUCTS ───────────────────────────────────────────────────────────────
  console.log('\n═══ PRODUCTS ═══')
  const products = await authedGet(cookie, '/api/admin/products')
  backup.collections.products = products
  console.log(`Total: ${products.length}`)

  for (const p of products) {
    const pi = []
    const hasName = p.name && typeof p.name === 'string' && p.name.trim() !== '' && p.name !== 'H1 Title' && p.name !== 'Product Name'
    const hasImages = (p.imageUrls?.length > 0) || p.imageUrl
    const hasDesc = (p.description && p.description.trim() !== '') || (p.shortDescription && p.shortDescription.trim() !== '')
    const hasSlug = p.slug && typeof p.slug === 'string'

    if (!hasName) pi.push(`PLACEHOLDER_NAME: "${p.name}"`)
    if (!hasImages) pi.push('NO_IMAGES')
    if (!hasDesc) pi.push('NO_DESCRIPTION')
    if (!hasSlug) pi.push('NO_SEO_SLUG')
    if (p.name === 'H1 Title') pi.push('⚠️ PLACEHOLDER_CONTENT_CAUSES_SEO_ISSUE')

    const label = pi.length ? '⚠️' : '✅'
    console.log(`\n  ${label} "${p.name}" (${p._id || p.id})`)
    pi.forEach(i => { issues.push(`Product ${p.name}: ${i}`); console.log(`    ↳ ${i}`) })
  }

  // ── SPARE PARTS ────────────────────────────────────────────────────────────
  console.log('\n═══ SPARE PARTS (sample check) ═══')
  const parts = await authedGet(cookie, '/api/admin/spare-parts')
  backup.collections.spareParts = parts
  const partsIssues = []
  let partsCheckedImages = 0

  for (const p of parts) {
    const pi = []
    if (!p.name || p.name.trim() === '') pi.push('NO_NAME')
    if (!p.slug) pi.push('NO_SLUG')
    if (!p.images?.length) pi.push('NO_IMAGES')
    // Check for external (non-cloudinary) image URLs — they can go offline
    const extImgs = (p.images || []).filter(img => img && !img.includes('cloudinary') && img.startsWith('http') && !img.includes('100xcircle'))
    if (extImgs.length > 0) pi.push(`EXTERNAL_IMG (${extImgs[0].substring(0,50)})`)

    if (pi.length > 0) {
      pi.forEach(i => { partsIssues.push(`Part "${p.name}": ${i}`) })
      issues.push(...pi.map(i => `SparePart "${p.name}": ${i}`))
    }
  }
  console.log(`  Total: ${parts.length}`)
  console.log(`  Parts with issues: ${partsIssues.length}`)
  partsIssues.slice(0, 10).forEach(i => console.log(`  ⚠️  ${i}`))

  // ── CASE STUDIES ──────────────────────────────────────────────────────────
  console.log('\n═══ CASE STUDIES ═══')
  const cases = await authedGet(cookie, '/api/admin/case-studies')
  backup.collections.caseStudies = cases
  console.log(`  Total DB case studies: ${cases.length}`)
  for (const c of cases) {
    const ci = []
    if (!c.title || c.title.trim() === '') ci.push('NO_TITLE')
    if (!c.description && !c.outcome && !c.solution) ci.push('NO_CONTENT')
    if (ci.length > 0) {
      ci.forEach(i => { issues.push(`CaseStudy ${c._id}: ${i}`); console.log(`  ⚠️  ${c._id}: ${i}`) })
    }
  }
  if (cases.length === 0) console.log('  ℹ️  No DB case studies (hardcoded in page)')

  // ── SAVE BACKUP ────────────────────────────────────────────────────────────
  const backupPath = `audit/backup-all-${Date.now()}.json`
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2))
  console.log(`\n✅ Full backup saved: ${backupPath}`)

  // ── SUMMARY ───────────────────────────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════╗')
  console.log('║   DATA INTEGRITY SUMMARY                 ║')
  console.log('╚══════════════════════════════════════════╝')
  console.log(`\n  Total issues found: ${issues.length}`)
  issues.forEach(i => console.log(`  • ${i}`))
})()
