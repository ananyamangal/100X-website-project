/**
 * Full data integrity audit using public APIs + Playwright for authenticated checks
 */
const { chromium } = require('playwright')
const fs = require('fs')
const BASE = 'https://www.100xcircle.com'

async function checkImageUrl(url) {
  if (!url || typeof url !== 'string') return 'INVALID'
  if (!url.startsWith('http')) return 'RELATIVE_OR_EMPTY'
  try {
    const r = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(6000) })
    return r.status === 200 ? 'OK' : `HTTP_${r.status}`
  } catch (e) {
    return 'UNREACHABLE'
  }
}

;(async () => {
  const browser = await chromium.launch({ headless: true })
  const issues = []
  const backup = { date: new Date().toISOString(), collections: {} }

  // ── 1. REVIEWS (public API) ────────────────────────────────────────────────
  console.log('\n═══ REVIEWS INTEGRITY ═══')
  const reviews = await fetch(`${BASE}/api/reviews`).then(r => r.json()).catch(() => [])
  backup.collections.reviews = reviews
  console.log(`Public reviews (published): ${Array.isArray(reviews) ? reviews.length : 'error'}`)
  if (Array.isArray(reviews)) {
    for (const r of reviews) {
      const ri = []
      if (!r.customerName || typeof r.customerName !== 'string' || r.customerName.trim() === '') ri.push('MISSING_customerName')
      if (!r.review || typeof r.review !== 'string' || r.review.trim() === '') ri.push('MISSING_review')
      if (!r.rating || r.rating < 1 || r.rating > 5) ri.push('INVALID_rating')
      const status = ri.length === 0 ? '✅' : '❌'
      console.log(`  ${status} "${r.customerName || 'UNNAMED'}" | ${r.rating}★ | "${(r.review || '').substring(0,50)}"`)
      if (ri.length > 0) {
        ri.forEach(i => { console.log(`      ↳ ${i}`); issues.push(`Review: ${i}`) })
      }
    }
  }

  // ── 2. PRODUCTS (public API) ───────────────────────────────────────────────
  console.log('\n═══ PRODUCTS INTEGRITY ═══')
  const products = await fetch(`${BASE}/api/products`).then(r => r.json()).catch(() => [])
  backup.collections.products = products
  console.log(`Products: ${products.length}`)
  let prodImageChecks = 0

  for (const p of products) {
    const pi = []
    if (!p.name || p.name.trim() === '') pi.push('MISSING_name')
    if (p.name === 'H1 Title' || p.name === 'Product Name') pi.push(`PLACEHOLDER_name: "${p.name}"`)
    if (!p.slug) pi.push('MISSING_slug')
    const imgs = Array.isArray(p.imageUrls) ? p.imageUrls : (p.imageUrl ? [p.imageUrl] : [])
    if (imgs.length === 0) pi.push('NO_IMAGES')
    if (!p.description && !p.shortDescription) pi.push('NO_DESCRIPTION')

    // Check first image URL (sample — don't check all to avoid hammering)
    if (imgs[0] && prodImageChecks < 5) {
      const imgStatus = await checkImageUrl(imgs[0])
      if (imgStatus !== 'OK') pi.push(`IMAGE_${imgStatus}: ${imgs[0].substring(0,60)}`)
      prodImageChecks++
    }

    const status = pi.length === 0 ? '✅' : '❌'
    console.log(`  ${status} "${p.name}"`)
    pi.forEach(i => { console.log(`      ↳ ${i}`); issues.push(`Product "${p.name}": ${i}`) })
  }

  // ── 3. SPARE PARTS (public API) ────────────────────────────────────────────
  console.log('\n═══ SPARE PARTS INTEGRITY ═══')
  const parts = await fetch(`${BASE}/api/spare-parts`).then(r => r.json()).catch(() => [])
  backup.collections.spareParts = Array.isArray(parts) ? parts : []
  const partsList = Array.isArray(parts) ? parts : []
  console.log(`Spare parts: ${partsList.length}`)

  let extImgCount = 0
  let missingImgCount = 0
  const extDomains = new Set()

  for (const p of partsList) {
    const pi = []
    if (!p.name || p.name.trim() === '') pi.push('MISSING_name')
    if (!p.slug) pi.push('MISSING_slug')
    if (!p.images?.length) { pi.push('NO_IMAGES'); missingImgCount++ }
    else {
      for (const img of p.images) {
        if (img && !img.includes('cloudinary') && img.startsWith('http') && !img.includes('100xcircle.com')) {
          extImgCount++
          try { extDomains.add(new URL(img).hostname) } catch {}
          pi.push(`EXTERNAL_IMAGE: ${img.substring(0, 60)}`)
        }
      }
    }
    pi.forEach(i => { issues.push(`SparePart "${p.name}": ${i}`) })
  }

  console.log(`  Parts with no images: ${missingImgCount}`)
  console.log(`  Parts with external images: ${extImgCount}`)
  if (extDomains.size > 0) console.log(`  External domains: ${[...extDomains].join(', ')}`)

  // Check external image domains
  if (extDomains.size > 0) {
    console.log('\n  External image domain status:')
    for (const domain of extDomains) {
      const status = await checkImageUrl(`https://${domain}`).catch(() => 'UNREACHABLE')
      console.log(`    ${status === 'OK' ? '⚠️' : '❌'} ${domain}: ${status}`)
      if (status !== 'OK') issues.push(`SpareParts: external image domain ${domain} is ${status}`)
    }
  }

  // ── 4. KNOWLEDGE ARTICLES (page-based) ────────────────────────────────────
  console.log('\n═══ KNOWLEDGE ARTICLES INTEGRITY ═══')
  const knowledgeSlugs = [
    'how-thermal-fogging-works', 'thermal-vs-ulv-fogging',
    'dengue-prevention-thermal-fogging', 'malaria-control-fogging-india',
    'mosquito-control-india', 'agricultural-fogging-guide',
    'how-to-choose-fogging-machine', 'thermal-fogging-chemicals-guide',
    'fogging-machine-operators-guide', 'fogging-machine-maintenance-guide',
    'fogging-machine-safety-guide', 'government-procurement-guide',
  ]
  let kOk = 0, kFail = 0
  for (const slug of knowledgeSlugs) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    const page = await ctx.newPage()
    const errs = []
    page.on('pageerror', e => errs.push(e.message))
    await page.goto(`${BASE}/knowledge/${slug}`, { waitUntil: 'domcontentloaded', timeout: 15000 })
    await page.waitForTimeout(1000)
    const h1 = await page.$eval('h1', el => el.textContent?.trim()).catch(() => null)
    const hasErr = errs.filter(e => !e.includes('analytics')).length > 0
    if (!h1 || hasErr) {
      console.log(`  ❌ /knowledge/${slug}: h1="${h1}" errors=${errs.length}`)
      issues.push(`Knowledge "${slug}": ${!h1 ? 'NO_H1' : ''} ${hasErr ? 'JS_ERROR' : ''}`)
      kFail++
    } else {
      kOk++
    }
    await ctx.close()
  }
  console.log(`  ✅ ${kOk} articles OK, ❌ ${kFail} failed`)

  // ── 5. Case studies ───────────────────────────────────────────────────────
  console.log('\n═══ CASE STUDIES INTEGRITY ═══')
  const casesCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const casesPage = await casesCtx.newPage()
  await casesPage.goto(`${BASE}/case-studies`, { waitUntil: 'domcontentloaded', timeout: 15000 })
  await casesPage.waitForTimeout(1500)
  const caseH1 = await casesPage.$eval('h1', el => el.textContent?.trim()).catch(() => null)
  const caseCards = await casesPage.$$('article, [class*="case"], section[aria-label]').then(els => els.length).catch(() => 0)
  console.log(`  H1: "${caseH1}"`)
  console.log(`  Content sections: ${caseCards}`)
  await casesCtx.close()

  await browser.close()

  // ── SAVE BACKUP ───────────────────────────────────────────────────────────
  const backupPath = `audit/integrity-backup-${Date.now()}.json`
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2))

  // ── SUMMARY ───────────────────────────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════╗')
  console.log('║   INTEGRITY AUDIT SUMMARY                ║')
  console.log('╚══════════════════════════════════════════╝')
  console.log(`\n  Total issues: ${issues.length}`)
  if (issues.length === 0) {
    console.log('  ✅ ALL COLLECTIONS CLEAN')
  } else {
    const critical = issues.filter(i => i.includes('PLACEHOLDER') || i.includes('NO_H1') || i.includes('UNREACHABLE') || i.includes('HTTP_404'))
    const high = issues.filter(i => i.includes('EXTERNAL_IMAGE') || i.includes('NO_IMAGES') || i.includes('MISSING'))
    console.log(`\n  Critical (${critical.length}):`)
    critical.forEach(i => console.log(`    ❌ ${i}`))
    console.log(`\n  High (${high.length}):`)
    high.slice(0,15).forEach(i => console.log(`    ⚠️  ${i}`))
  }
  console.log(`\n  Backup: ${backupPath}`)
})()
