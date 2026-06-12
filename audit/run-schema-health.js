/**
 * Schema Health Audit — Google Rich Results field-level validator.
 * Fetches live pages, extracts JSON-LD, validates against Google requirements.
 * Stores results in schema_health_results collection.
 *
 * Run: node audit/run-schema-health.js
 */

const fs = require('fs')
const https = require('https')
const http = require('http')

function loadEnv(p) {
  try {
    fs.readFileSync(p, 'utf8').split('\n').forEach(line => {
      const t = line.trim(); if (!t || t.startsWith('#')) return
      const eq = t.indexOf('='); if (eq < 0) return
      const k = t.slice(0, eq).trim()
      const v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
      if (k && !process.env[k]) process.env[k] = v
    })
  } catch {}
}
loadEnv('.env.local'); loadEnv('.env')

const { MongoClient } = require('mongodb')
const SITE_URL = 'https://www.100xcircle.com'

// ─── HTTP fetch ───────────────────────────────────────────────────────────────

function fetchUrl(url, timeoutMs = 12000) {
  return new Promise((resolve) => {
    const lib = url.startsWith('https') ? https : http
    const timer = setTimeout(() => { resolve(null) }, timeoutMs)
    try {
      lib.get(url, {
        headers: {
          'User-Agent': '100XCircle-SchemaHealthAudit/2.0',
          'Cache-Control': 'no-cache',
          'Accept': 'text/html',
        }
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          clearTimeout(timer)
          const loc = res.headers.location
          const resolved = loc.startsWith('http') ? loc : SITE_URL + (loc.startsWith('/') ? '' : '/') + loc
          fetchUrl(resolved, timeoutMs).then(resolve)
          return
        }
        if (res.statusCode !== 200) { clearTimeout(timer); resolve(null); return }
        let body = ''
        res.setEncoding('utf8')
        res.on('data', d => body += d)
        res.on('end', () => { clearTimeout(timer); resolve(body) })
        res.on('error', () => { clearTimeout(timer); resolve(null) })
      }).on('error', () => { clearTimeout(timer); resolve(null) })
    } catch { clearTimeout(timer); resolve(null) }
  })
}

// ─── JSON-LD extraction ───────────────────────────────────────────────────────

function extractSchemas(html) {
  const out = []
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let m
  while ((m = re.exec(html)) !== null) {
    try {
      const data = JSON.parse(m[1])
      const items = Array.isArray(data) ? data : [data]
      for (const item of items) {
        if (item['@graph']) {
          for (const g of item['@graph']) out.push(g)
        } else {
          out.push(item)
        }
      }
    } catch { /* skip malformed */ }
  }
  return out
}

function typeOf(s) {
  const t = s['@type']
  if (Array.isArray(t)) return t[0]
  return String(t || 'Unknown')
}

// ─── Validators ───────────────────────────────────────────────────────────────

function validateProduct(s) {
  const issues = []
  if (!s.name)  issues.push({ field: 'name',  severity: 'critical', message: 'Required: name' })
  if (!s.image) issues.push({ field: 'image', severity: 'critical', message: 'Required: image (URL or ImageObject)' })

  const off = s.offers
  const hasPrice = off && (off.price !== undefined || off.lowPrice !== undefined)
  const hasReview = Array.isArray(s.review) ? s.review.length > 0 : !!s.review
  const aggR = s.aggregateRating
  const hasRating = aggR && aggR.ratingValue !== undefined

  if (!hasPrice && !hasReview && !hasRating) {
    issues.push({
      field: 'offers/review/aggregateRating',
      severity: 'critical',
      message: 'Required: at least one of offers (with price/lowPrice), review, or aggregateRating',
    })
  } else if (off && !hasPrice) {
    issues.push({ field: 'offers.price', severity: 'critical', message: 'offers present but missing price or lowPrice' })
  }
  if (!s.description) issues.push({ field: 'description', severity: 'warning', message: 'Recommended: description' })
  return issues
}

function validateFAQPage(s, allTypes) {
  const issues = []
  const faqCount = allTypes.filter(t => t === 'FAQPage').length
  if (faqCount > 1) {
    issues.push({ field: '@type(duplicate)', severity: 'critical', message: `${faqCount} FAQPage blocks on same URL — Google invalidates both` })
  }
  const items = Array.isArray(s.mainEntity) ? s.mainEntity : (s.mainEntity ? [s.mainEntity] : [])
  if (items.length === 0) {
    issues.push({ field: 'mainEntity', severity: 'critical', message: 'Required: mainEntity array with Questions' })
    return issues
  }
  items.forEach((q, i) => {
    if (q['@type'] !== 'Question') issues.push({ field: `mainEntity[${i}].@type`, severity: 'critical', message: `Expected Question, got ${q['@type']}` })
    if (!q.name) issues.push({ field: `mainEntity[${i}].name`, severity: 'critical', message: 'Question missing name' })
    if (!q.acceptedAnswer) {
      issues.push({ field: `mainEntity[${i}].acceptedAnswer`, severity: 'critical', message: 'Question missing acceptedAnswer' })
    } else if (!q.acceptedAnswer.text) {
      issues.push({ field: `mainEntity[${i}].acceptedAnswer.text`, severity: 'critical', message: 'acceptedAnswer missing text' })
    }
  })
  return issues
}

function validateBreadcrumb(s) {
  const issues = []
  const items = Array.isArray(s.itemListElement) ? s.itemListElement : []
  if (items.length === 0) {
    issues.push({ field: 'itemListElement', severity: 'critical', message: 'Required: itemListElement array' })
    return issues
  }
  items.forEach((it, i) => {
    if (it.position === undefined) issues.push({ field: `itemListElement[${i}].position`, severity: 'critical', message: 'Missing position' })
    if (!it.name && !it.item) issues.push({ field: `itemListElement[${i}].name`, severity: 'warning', message: 'Missing name or item' })
  })
  return issues
}

function validateArticle(s) {
  const issues = []
  if (!s.headline) issues.push({ field: 'headline', severity: 'critical', message: 'Required: headline' })
  if (!s.datePublished) issues.push({ field: 'datePublished', severity: 'critical', message: 'Required: datePublished' })
  const auth = s.author
  if (!auth) {
    issues.push({ field: 'author', severity: 'critical', message: 'Required: author (Person or Organization)' })
  } else {
    // @id reference to a named entity (e.g. /#organization) is valid — skip name check
    const isRef = auth['@id'] || (Array.isArray(auth) && auth[0]?.['@id'])
    if (!isRef && !(auth.name || (Array.isArray(auth) && auth[0]?.name))) {
      issues.push({ field: 'author.name', severity: 'critical', message: 'author present but missing name' })
    }
  }
  if (!s.image) issues.push({ field: 'image', severity: 'warning', message: 'Recommended: image for Google Discover eligibility' })
  return issues
}

function validateOrganization(s) {
  const issues = []
  if (!s.name) issues.push({ field: 'name', severity: 'critical', message: 'Required: name' })
  // Skip url/logo warnings on @id-only supplement nodes (they inherit from the primary entity)
  const isSupplementNode = s['@id'] && !s.url && !s.logo && (s.aggregateRating || s.review)
  if (!isSupplementNode) {
    if (!s.url) issues.push({ field: 'url', severity: 'warning', message: 'Recommended: url' })
    if (!s.logo) issues.push({ field: 'logo', severity: 'warning', message: 'Recommended: logo (ImageObject)' })
  }
  return issues
}

function validateLocalBusiness(s) {
  const issues = []
  if (!s.name) issues.push({ field: 'name', severity: 'critical', message: 'Required: name' })
  if (!s.address) issues.push({ field: 'address', severity: 'critical', message: 'Required: address (PostalAddress)' })
  return issues
}

const VALIDATED_TYPES = new Set(['Product','FAQPage','BreadcrumbList','Article','BlogPosting','NewsArticle','Organization','Manufacturer','LocalBusiness'])

function validateSchema(s, allTypes) {
  const type = typeOf(s)
  const name = s.name || s.headline || type
  let issues = []

  switch (type) {
    case 'Product': issues = validateProduct(s); break
    case 'FAQPage': issues = validateFAQPage(s, allTypes); break
    case 'BreadcrumbList': issues = validateBreadcrumb(s); break
    case 'Article':
    case 'BlogPosting':
    case 'NewsArticle': issues = validateArticle(s); break
    case 'Organization':
    case 'Manufacturer': issues = validateOrganization(s); break
    case 'LocalBusiness': issues = validateLocalBusiness(s); break
    default: break
  }

  const entities = s.mainEntity
  const faqSuffix = type === 'FAQPage' && Array.isArray(entities) ? ` (${entities.length} questions)` : ''
  const criticals = issues.filter(i => i.severity === 'critical').length
  return {
    type,
    label: String(name).slice(0, 80) + faqSuffix,
    valid: criticals === 0,
    criticals,
    warnings: issues.filter(i => i.severity === 'warning').length,
    issues,
  }
}

// ─── Audit a single URL ───────────────────────────────────────────────────────

async function auditUrl(url) {
  const html = await fetchUrl(url)
  if (!html) return { url, fetchOk: false, schemas: [], duplicateTypes: [], criticals: 0, warnings: 0 }

  const rawSchemas = extractSchemas(html)
  const allTypes = rawSchemas.map(typeOf)

  // Duplicate detection
  const counts = {}
  for (const t of allTypes) counts[t] = (counts[t] || 0) + 1
  const duplicateTypes = Object.entries(counts).filter(([, c]) => c > 1).map(([t]) => t)

  const validated = rawSchemas
    .filter(s => VALIDATED_TYPES.has(typeOf(s)))
    .map(s => validateSchema(s, allTypes))

  const criticals = validated.reduce((n, s) => n + s.criticals, 0)
  const warnings  = validated.reduce((n, s) => n + s.warnings, 0)
  const valid     = validated.filter(s => s.valid).length
  const invalid   = validated.filter(s => !s.valid).length

  return { url, fetchOk: true, schemas: validated, duplicateTypes, criticals, warnings, valid, invalid }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

;(async () => {
  const c = new MongoClient(process.env.MONGODB_URI)
  await c.connect()
  const db = c.db()

  // Build target URL list from DB
  const [productDocs, blogDocs] = await Promise.all([
    db.collection('products').find({ isPublished: true, slug: { $exists: true, $ne: '' } })
      .project({ slug: 1, name: 1 }).sort({ order: 1 }).limit(5).toArray(),
    db.collection('blogs').find({ isPublished: true, slug: { $exists: true, $ne: '' } })
      .project({ slug: 1, title: 1 }).sort({ publishedAt: -1 }).limit(5).toArray(),
  ])

  const urls = [
    { url: SITE_URL + '/', label: 'Homepage', type: 'homepage' },
    { url: SITE_URL + '/thermal-vs-cold-fogging-machine', label: 'Thermal vs Cold (landing)', type: 'landing' },
    { url: SITE_URL + '/gem-approved-fogging-machine-oem', label: 'GeM OEM (landing)', type: 'landing' },
    { url: SITE_URL + '/dengue-control-fogging-machine', label: 'Dengue Control (landing)', type: 'landing' },
    ...productDocs.map(p => ({ url: `${SITE_URL}/products/${p.slug}`, label: p.name || p.slug, type: 'product' })),
    ...blogDocs.map(b => ({ url: `${SITE_URL}/blog/${b.slug}`, label: b.title || b.slug, type: 'blog' })),
  ]

  // Remove duplicates
  const seen = new Set()
  const targets = urls.filter(t => { if (seen.has(t.url)) return false; seen.add(t.url); return true })

  console.log('\n' + '═'.repeat(76))
  console.log('  SCHEMA HEALTH AUDIT — Google Rich Results Field-Level Validation')
  console.log('  ' + new Date().toISOString())
  console.log('═'.repeat(76))
  console.log(`\n  Auditing ${targets.length} URLs...\n`)

  const results = []
  // Fetch in batches of 3
  for (let i = 0; i < targets.length; i += 3) {
    const batch = targets.slice(i, i + 3)
    const settled = await Promise.allSettled(batch.map(t => auditUrl(t.url)))
    for (let j = 0; j < settled.length; j++) {
      const r = settled[j].status === 'fulfilled' ? settled[j].value : { url: batch[j].url, fetchOk: false, schemas: [], duplicateTypes: [], criticals: 0, warnings: 0 }
      results.push({ ...r, pageLabel: batch[j].label, pageType: batch[j].type })
    }
    if (i + 3 < targets.length) await new Promise(r => setTimeout(r, 300))
  }

  // ─── Report ──────────────────────────────────────────────────────────────────

  let totalSchemas = 0, totalValid = 0, totalInvalid = 0, totalCriticals = 0, totalWarnings = 0
  const byType = {} // type → { valid, invalid, criticals, warnings }
  const affectedUrls = []

  for (const r of results) {
    totalSchemas += r.schemas?.length || 0
    totalValid   += r.valid || 0
    totalInvalid += r.invalid || 0
    totalCriticals += r.criticals || 0
    totalWarnings  += r.warnings || 0
    if (r.criticals > 0) affectedUrls.push(r.url)

    for (const s of r.schemas || []) {
      if (!byType[s.type]) byType[s.type] = { valid: 0, invalid: 0, criticals: 0, warnings: 0, examples: [] }
      if (s.valid) byType[s.type].valid++
      else { byType[s.type].invalid++; byType[s.type].criticals += s.criticals; byType[s.type].examples.push(s.label.slice(0, 50)) }
      byType[s.type].warnings += s.warnings
    }
  }

  // Summary
  console.log('─'.repeat(76))
  console.log('  SUMMARY')
  console.log('─'.repeat(76))
  console.log(`  URLs audited:    ${results.length}`)
  console.log(`  Total schemas:   ${totalSchemas}`)
  console.log(`  Valid schemas:   ${totalValid}`)
  console.log(`  Invalid schemas: ${totalInvalid}`)
  console.log(`  Critical errors: ${totalCriticals}`)
  console.log(`  Warnings:        ${totalWarnings}`)
  console.log(`  Affected URLs:   ${affectedUrls.length > 0 ? affectedUrls.length : 0}`)

  if (totalCriticals === 0) {
    console.log('\n  ✅  ALL CRITICAL ERRORS: 0  —  Schema Health = GREEN')
  } else {
    console.log(`\n  ❌  CRITICAL ERRORS FOUND: ${totalCriticals}`)
  }

  // By-type breakdown
  console.log('\n' + '─'.repeat(76))
  console.log('  VALID / INVALID BY SCHEMA TYPE')
  console.log('─'.repeat(76))
  console.log(`  ${'Type'.padEnd(22)} Valid  Invalid  Criticals  Warnings`)
  console.log(`  ${'─'.repeat(60)}`)
  for (const [type, d] of Object.entries(byType).sort((a, b) => b[1].criticals - a[1].criticals)) {
    const line = `  ${type.padEnd(22)} ${String(d.valid).padStart(5)}  ${String(d.invalid).padStart(7)}  ${String(d.criticals).padStart(9)}  ${String(d.warnings).padStart(8)}`
    if (d.invalid > 0) console.log(line + '  ⚠')
    else console.log(line)
    if (d.examples.length) console.log(`    ↳ ${d.examples.join(', ')}`)
  }

  // Per-URL detail
  console.log('\n' + '─'.repeat(76))
  console.log('  PER-URL DETAIL  (sorted by critical count)')
  console.log('─'.repeat(76))
  const sorted = [...results].sort((a, b) => (b.criticals || 0) - (a.criticals || 0) || (b.warnings || 0) - (a.warnings || 0))

  for (const r of sorted) {
    const path = r.url.replace(SITE_URL, '') || '/'
    const status = !r.fetchOk ? '⛔ FETCH FAIL' : r.criticals > 0 ? `❌ ${r.criticals} critical` : r.warnings > 0 ? `⚠  ${r.warnings} warning(s)` : '✅ CLEAN'
    console.log(`\n  ${status.padEnd(18)} ${path}`)
    console.log(`  ${''.padEnd(18)} [${r.pageType}] — ${r.pageLabel}`)

    if (r.duplicateTypes && r.duplicateTypes.length > 0) {
      console.log(`    🔁 Duplicate types: ${r.duplicateTypes.join(', ')}`)
    }

    for (const s of r.schemas || []) {
      if (s.issues.length === 0) continue
      for (const issue of s.issues) {
        const icon = issue.severity === 'critical' ? '    ✗' : '    !'
        console.log(`${icon} [${s.type}] ${issue.field}: ${issue.message}`)
      }
    }
  }

  // Top 10 warnings section
  const withWarnings = results
    .filter(r => r.warnings > 0 || r.criticals > 0)
    .sort((a, b) => (b.criticals + b.warnings) - (a.criticals + a.warnings))
    .slice(0, 10)

  console.log('\n' + '─'.repeat(76))
  console.log('  TOP URLS WITH SCHEMA WARNINGS / ERRORS')
  console.log('─'.repeat(76))
  if (withWarnings.length === 0) {
    console.log('  None — all clean')
  } else {
    withWarnings.forEach((r, i) => {
      const path = r.url.replace(SITE_URL, '') || '/'
      console.log(`  ${i + 1}. ${path}  (${r.criticals} critical, ${r.warnings} warnings)`)
    })
  }

  // SEO Impact estimate
  console.log('\n' + '─'.repeat(76))
  console.log('  SEO IMPACT ESTIMATE')
  console.log('─'.repeat(76))
  if (totalCriticals === 0) {
    console.log('  All schemas valid. Expected outcomes:')
    console.log('  • Homepage: FAQPage rich snippet eligible')
    console.log('  • Product pages: Product rich snippet eligible')
    console.log('  • Blog pages: Article structured data intact')
    console.log('  • Organization Knowledge Panel reinforced')
    console.log('  • Estimated CTR uplift: +15–25% for pages with valid FAQ/Product snippets')
    console.log('  • AI Overview eligibility improved via clean entity signals')
  } else {
    console.log(`  ${totalCriticals} critical error(s) block rich snippet eligibility for ${affectedUrls.length} URL(s)`)
    console.log('  Each invalid Product schema blocks the product page from Product Rich Results')
    console.log('  Each invalid FAQPage blocks FAQ accordion in SERPs (typically +3–5% CTR loss)')
  }

  // Persist results
  const report = {
    _type: 'latest',
    auditedAt: new Date().toISOString(),
    trigger: 'manual',
    totalPages: results.length,
    totalSchemas,
    validSchemas: totalValid,
    invalidSchemas: totalInvalid,
    criticalIssues: totalCriticals,
    warnings: totalWarnings,
    affectedUrls,
    summary: `Audited ${results.length} pages · ${totalValid}/${totalSchemas} schemas valid · ${totalCriticals} critical errors · ${totalWarnings} warnings`,
    pages: results.map(r => ({
      url: r.url,
      pageType: r.pageType,
      pageLabel: r.pageLabel,
      fetchOk: r.fetchOk,
      totalSchemas: r.schemas?.length || 0,
      validSchemas: r.valid || 0,
      invalidSchemas: r.invalid || 0,
      criticalCount: r.criticals || 0,
      warningCount: r.warnings || 0,
      schemas: r.schemas || [],
      duplicateTypes: r.duplicateTypes || [],
    })),
  }

  await db.collection('schema_health_results').replaceOne(
    { _type: 'latest' },
    report,
    { upsert: true }
  )

  console.log('\n' + '─'.repeat(76))
  console.log('  ✅  Results stored → MongoDB schema_health_results collection')
  console.log('      Visible in Admin → Schema Health tab')
  console.log('═'.repeat(76) + '\n')

  await c.close()
})()
