// Full product migration and health dashboard.
// GET  → health report (no changes to data)
// POST → execute migration, or action=dedup-specs to repair duplicate specs
import { NextRequest, NextResponse } from 'next/server'
import clientPromise from '@/lib/mongodb'

function genId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

// ── Migrate helpers ──────────────────────────────────────────────────────────

function isStructured(val: unknown, key: string): boolean {
  if (!Array.isArray(val) || val.length === 0) return true // empty = already fine
  const first = val[0]
  if (typeof first !== 'object' || first === null) return false
  if (key === 'features') return 'title' in first
  if (key === 'specifications') return 'label' in first
  if (key === 'applications') return 'title' in (first as any) && 'priority' in first
  return false
}

function assignSpecGroup(label: string): string {
  const l = label.toLowerCase()
  if (l.match(/engine|fuel|ignition|rpm|stroke|cylinder/)) return 'Mechanical'
  if (l.match(/tank|capacity|reservoir/)) return 'Mechanical'
  if (l.match(/output|flow|coverage|spray|fog|range|pressure|speed/)) return 'Performance'
  if (l.match(/weight|dimension|length|width|height|size/)) return 'Physical'
  if (l.match(/safety|compliance|certif|approved|standard|bis|ce|iso/)) return 'Compliance'
  if (l.match(/voltage|amp|electric|power|watt|battery/)) return 'Electrical'
  return 'Other'
}

function migrateFeatures(val: unknown): object[] | null {
  if (!Array.isArray(val) || val.length === 0) return null
  if (isStructured(val, 'features')) return null
  const seen = new Set<string>()
  const result: object[] = []
  let order = 0
  for (const item of val) {
    const str = typeof item === 'string' ? item : String(item)
    const colonIdx = str.indexOf(':')
    const title = colonIdx > -1 ? str.slice(0, colonIdx).trim() : str.trim()
    const value = colonIdx > -1 ? str.slice(colonIdx + 1).trim() : ''
    const key = title.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push({ id: genId(), title, value, icon: '', image: '', tooltip: '', order: order++ })
  }
  return result
}

function migrateSpecs(val: unknown): object[] | null {
  if (!Array.isArray(val) || val.length === 0) return null
  if (isStructured(val, 'specifications')) return null
  const seen = new Set<string>()
  const result: object[] = []
  let order = 0
  for (const item of val) {
    const str = typeof item === 'string' ? item : String(item)
    const colonIdx = str.indexOf(':')
    const label = colonIdx > -1 ? str.slice(0, colonIdx).trim() : str.trim()
    const value = colonIdx > -1 ? str.slice(colonIdx + 1).trim() : ''
    const key = label.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push({ id: genId(), label, value, group: assignSpecGroup(label), icon: '', order: order++ })
  }
  return result
}

function migrateApplications(val: unknown): object[] | null {
  if (!Array.isArray(val) || val.length === 0) return null
  if (isStructured(val, 'applications')) return null
  const seen = new Set<string>()
  const result: object[] = []
  let priority = 0
  for (const item of val) {
    const str = typeof item === 'string' ? item : String(item)
    const title = str.trim()
    const key = title.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push({ id: genId(), title, description: '', icon: '', image: '', industry: '', priority: priority++ })
  }
  return result
}

// Dedup already-structured specs (repair pass for post-migration products)
function dedupStructuredSpecs(val: unknown): object[] | null {
  if (!Array.isArray(val) || val.length === 0) return null
  if (!isStructured(val, 'specifications')) return null
  const seen = new Set<string>()
  const result: object[] = []
  for (const item of val as any[]) {
    const key = String(item.label || '').toLowerCase().trim()
    if (!key || seen.has(key)) continue
    seen.add(key)
    result.push(item)
  }
  return result.length < val.length ? result : null
}

function dedupStructuredFeatures(val: unknown): object[] | null {
  if (!Array.isArray(val) || val.length === 0) return null
  if (!isStructured(val, 'features')) return null
  const seen = new Set<string>()
  const result: object[] = []
  for (const item of val as any[]) {
    const key = String(item.title || '').toLowerCase().trim()
    if (!key || seen.has(key)) continue
    seen.add(key)
    result.push(item)
  }
  return result.length < val.length ? result : null
}

function dedupStructuredApps(val: unknown): object[] | null {
  if (!Array.isArray(val) || val.length === 0) return null
  if (!isStructured(val, 'applications')) return null
  const seen = new Set<string>()
  const result: object[] = []
  for (const item of val as any[]) {
    const key = String(item.title || '').toLowerCase().trim()
    if (!key || seen.has(key)) continue
    seen.add(key)
    result.push(item)
  }
  return result.length < val.length ? result : null
}

function hasDuplicateFeatures(val: unknown): boolean {
  if (!Array.isArray(val) || val.length === 0) return false
  if (!isStructured(val, 'features')) return false
  const titles = (val as any[]).map(i => String(i.title || '').toLowerCase().trim()).filter(Boolean)
  return titles.length !== new Set(titles).size
}

function hasDuplicateApps(val: unknown): boolean {
  if (!Array.isArray(val) || val.length === 0) return false
  if (!isStructured(val, 'applications')) return false
  const titles = (val as any[]).map(i => String(i.title || '').toLowerCase().trim()).filter(Boolean)
  return titles.length !== new Set(titles).size
}

// ── Health report helpers ────────────────────────────────────────────────────

type ProductIssue =
  | 'legacy-features' | 'legacy-specs' | 'legacy-apps'
  | 'duplicate-specs' | 'duplicate-features' | 'duplicate-apps'
  | 'unmatched-badges' | 'legacy-certs' | 'missing-cert-ids'
  | 'empty-features' | 'empty-specs' | 'empty-apps'

function getProductIssues(
  p: any,
  cmsBadgeNames: Set<string>,
  cmsCertNames: Set<string>,
): ProductIssue[] {
  const issues: ProductIssue[] = []

  // Features
  if (!Array.isArray(p.features) || p.features.length === 0) issues.push('empty-features')
  else if (!isStructured(p.features, 'features')) issues.push('legacy-features')
  else if (hasDuplicateFeatures(p.features)) issues.push('duplicate-features')

  // Specs
  if (!Array.isArray(p.specifications) || p.specifications.length === 0) issues.push('empty-specs')
  else if (!isStructured(p.specifications, 'specifications')) issues.push('legacy-specs')
  else {
    const specs = p.specifications as any[]
    const labels = specs.map((s: any) => String(s.label || '').toLowerCase())
    if (labels.length !== new Set(labels).size) issues.push('duplicate-specs')
  }

  // Applications
  if (!Array.isArray(p.applications) || p.applications.length === 0) issues.push('empty-apps')
  else if (!isStructured(p.applications, 'applications')) issues.push('legacy-apps')
  else if (hasDuplicateApps(p.applications)) issues.push('duplicate-apps')

  // Badges
  const badges: string[] = Array.isArray(p.badges) ? p.badges.filter((b: any) => typeof b === 'string') : []
  const unmatched = badges.filter(b => !cmsBadgeNames.has(b.toLowerCase()))
  if (unmatched.length > 0) issues.push('unmatched-badges')

  // Certifications
  const legacyCerts: string[] = Array.isArray(p.certifications) ? p.certifications.filter((c: any) => typeof c === 'string') : []
  if (legacyCerts.length > 0) issues.push('legacy-certs')
  const certIds: string[] = Array.isArray(p.certificationIds) ? p.certificationIds : []
  if (certIds.length === 0 && legacyCerts.length > 0) issues.push('missing-cert-ids')

  return issues
}

// ── Routes ───────────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db()

    const [products, cmsBadges, cmsCerts] = await Promise.all([
      db.collection('products').find({}, {
        projection: { name: 1, slug: 1, features: 1, specifications: 1, applications: 1, badges: 1, certifications: 1, certificationIds: 1, productFaqs: 1 }
      }).toArray(),
      db.collection('product_badges').find({}).toArray(),
      db.collection('certifications').find({}).toArray(),
    ])

    const cmsBadgeNames = new Set(cmsBadges.map((b: any) => String(b.name || '').toLowerCase()))
    const cmsCertNames = new Set(cmsCerts.map((c: any) => String(c.name || '').toLowerCase().trim()))

    // Aggregate counters
    let featMigrated = 0, featLegacy = 0, featEmpty = 0, featDupes = 0
    let specMigrated = 0, specLegacy = 0, specEmpty = 0, specDupes = 0
    let appMigrated = 0, appLegacy = 0, appEmpty = 0, appDupes = 0
    let productsWithFaqs = 0
    let productsWithUnmatchedBadges = 0
    let productsWithLegacyCerts = 0
    let productsWithCertIds = 0

    // Audit maps: name → count (for badges/certs not in CMS)
    const unmatchedBadgeMap: Record<string, number> = {}
    const unmatchedCertMap: Record<string, number> = {}

    const productRows: any[] = []

    for (const p of products) {
      const issues = getProductIssues(p, cmsBadgeNames, cmsCertNames)

      // Features
      if (!Array.isArray(p.features) || p.features.length === 0) featEmpty++
      else if (isStructured(p.features, 'features')) {
        featMigrated++
        if (issues.includes('duplicate-features')) featDupes++
      } else featLegacy++

      // Specs
      if (!Array.isArray(p.specifications) || p.specifications.length === 0) specEmpty++
      else if (isStructured(p.specifications, 'specifications')) {
        specMigrated++
        if (issues.includes('duplicate-specs')) specDupes++
      } else specLegacy++

      // Apps
      if (!Array.isArray(p.applications) || p.applications.length === 0) appEmpty++
      else if (isStructured(p.applications, 'applications')) {
        appMigrated++
        if (issues.includes('duplicate-apps')) appDupes++
      } else appLegacy++

      // FAQs
      if (Array.isArray(p.productFaqs) && p.productFaqs.length > 0) productsWithFaqs++

      // Badges — collect unmatched names
      const badges: string[] = Array.isArray(p.badges) ? p.badges.filter((b: any) => typeof b === 'string') : []
      const unmatched = badges.filter(b => !cmsBadgeNames.has(b.toLowerCase()))
      if (unmatched.length > 0) {
        productsWithUnmatchedBadges++
        for (const b of unmatched) {
          unmatchedBadgeMap[b] = (unmatchedBadgeMap[b] || 0) + 1
        }
      }

      // Certs — collect unmatched cert strings
      const legacyCerts: string[] = Array.isArray(p.certifications) ? p.certifications.filter((c: any) => typeof c === 'string') : []
      if (legacyCerts.length > 0) {
        productsWithLegacyCerts++
        for (const c of legacyCerts) {
          if (!cmsCertNames.has(c.toLowerCase().trim())) {
            unmatchedCertMap[c] = (unmatchedCertMap[c] || 0) + 1
          }
        }
      }
      if (Array.isArray(p.certificationIds) && p.certificationIds.length > 0) productsWithCertIds++

      const legacyIssueCount = issues.filter(i => i.startsWith('legacy')).length
      const blockingIssueCount = issues.filter(i =>
        i.startsWith('legacy') || i.startsWith('duplicate') || i === 'unmatched-badges' || i === 'missing-cert-ids'
      ).length

      const status: 'full' | 'partial' | 'legacy' =
        blockingIssueCount === 0 ? 'full'
        : legacyIssueCount >= 3 ? 'legacy'
        : 'partial'

      productRows.push({
        id: String(p._id),
        name: p.name,
        slug: p.slug || '',
        status,
        issues,
      })
    }

    const fullyMigrated = productRows.filter(p => p.status === 'full').length
    const partiallyMigrated = productRows.filter(p => p.status === 'partial').length
    const legacyCount = productRows.filter(p => p.status === 'legacy').length

    // Overall normalization score: products with zero blocking issues
    const fullyNormalized = productRows.filter(p => p.issues.length === 0).length
    const normPct = products.length > 0 ? Math.round((fullyNormalized / products.length) * 100) : 100

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      summary: {
        total: products.length,
        fullyMigrated,
        partiallyMigrated,
        legacy: legacyCount,
      },
      cms: {
        badgesInCms: cmsBadges.length,
        certificationsInCms: cmsCerts.length,
      },
      fields: {
        features:  { migrated: featMigrated, legacy: featLegacy, empty: featEmpty, withDuplicates: featDupes },
        specs:     { migrated: specMigrated, legacy: specLegacy, empty: specEmpty, withDuplicates: specDupes },
        apps:      { migrated: appMigrated,  legacy: appLegacy,  empty: appEmpty, withDuplicates: appDupes  },
        faqs:      { withFaqs: productsWithFaqs, withoutFaqs: products.length - productsWithFaqs },
        badges:    { cmsDefined: cmsBadges.length, productsWithUnmatched: productsWithUnmatchedBadges },
        certs:     { cmsDefined: cmsCerts.length, productsWithLegacy: productsWithLegacyCerts, productsWithCertIds },
      },
      audit: {
        unmatchedBadges: Object.entries(unmatchedBadgeMap)
          .sort((a, b) => b[1] - a[1])
          .map(([name, count]) => ({ name, count })),
        unmatchedCerts: Object.entries(unmatchedCertMap)
          .sort((a, b) => b[1] - a[1])
          .map(([name, count]) => ({ name, count })),
      },
      normalizationScore: {
        pct: normPct,
        fullyNormalized,
        total: products.length,
      },
      products: productRows,
    })
  } catch (error) {
    console.error('Health report error:', error)
    return NextResponse.json({ error: 'Health report failed' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const client = await clientPromise
    const db = client.db()

    // ?action=dedup-specs → repair duplicate labels in already-structured specs
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'dedup-specs') {
      const products = await db.collection('products').find({}, { projection: { _id: 1, specifications: 1 } }).toArray()
      let repaired = 0
      for (const p of products) {
        const fixed = dedupStructuredSpecs(p.specifications)
        if (fixed !== null) {
          await db.collection('products').updateOne({ _id: p._id }, { $set: { specifications: fixed, updatedAt: new Date() } })
          repaired++
        }
      }
      return NextResponse.json({ success: true, action: 'dedup-specs', repairedCount: repaired })
    }

    if (action === 'dedup-features') {
      const products = await db.collection('products').find({}, { projection: { _id: 1, features: 1 } }).toArray()
      let repaired = 0
      for (const p of products) {
        const fixed = dedupStructuredFeatures(p.features)
        if (fixed !== null) {
          await db.collection('products').updateOne({ _id: p._id }, { $set: { features: fixed, updatedAt: new Date() } })
          repaired++
        }
      }
      return NextResponse.json({ success: true, action: 'dedup-features', repairedCount: repaired })
    }

    if (action === 'dedup-apps') {
      const products = await db.collection('products').find({}, { projection: { _id: 1, applications: 1 } }).toArray()
      let repaired = 0
      for (const p of products) {
        const fixed = dedupStructuredApps(p.applications)
        if (fixed !== null) {
          await db.collection('products').updateOne({ _id: p._id }, { $set: { applications: fixed, updatedAt: new Date() } })
          repaired++
        }
      }
      return NextResponse.json({ success: true, action: 'dedup-apps', repairedCount: repaired })
    }

    if (action === 'clean-entities') {
      // Decode HTML entities stored as literal chars in badge name strings in both
      // products.badges[] and product_badges.name
      function decodeEnt(str: string): string {
        return str
          .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<')
          .replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#39;/gi, "'")
          .replace(/&#x27;/gi, "'").replace(/&apos;/gi, "'").trim()
      }
      const products = await db.collection('products').find({}, { projection: { _id: 1, badges: 1 } }).toArray()
      let productsFixed = 0
      for (const p of products) {
        if (!Array.isArray(p.badges)) continue
        const cleaned = p.badges.map((b: unknown) => typeof b === 'string' ? decodeEnt(b) : b)
        const changed = cleaned.some((b: unknown, i: number) => b !== p.badges[i])
        if (changed) {
          await db.collection('products').updateOne({ _id: p._id }, { $set: { badges: cleaned, updatedAt: new Date() } })
          productsFixed++
        }
      }
      const cmsBadges = await db.collection('product_badges').find({}).toArray()
      let cmsBadgesFixed = 0
      for (const b of cmsBadges) {
        const cleaned = decodeEnt(String(b.name || ''))
        if (cleaned !== b.name) {
          await db.collection('product_badges').updateOne({ _id: b._id }, { $set: { name: cleaned, updatedAt: new Date() } })
          cmsBadgesFixed++
        }
      }
      return NextResponse.json({
        success: true, action: 'clean-entities',
        productsFixed, cmsBadgesFixed,
        message: `Cleaned HTML entities from ${productsFixed} products and ${cmsBadgesFixed} CMS badge records`,
      })
    }

    // Default: full migration
    const products = await db.collection('products').find({}).toArray()
    const report = {
      total: products.length,
      migratedCount: 0,
      skippedCount: 0,
      errorCount: 0,
      byField: { features: 0, specs: 0, apps: 0 },
    }

    for (const product of products) {
      const updates: Record<string, unknown> = { updatedAt: new Date() }
      let changed = false

      const newFeatures = migrateFeatures(product.features)
      if (newFeatures !== null) { updates.features = newFeatures; report.byField.features++; changed = true }

      const newSpecs = migrateSpecs(product.specifications)
      if (newSpecs !== null) { updates.specifications = newSpecs; report.byField.specs++; changed = true }
      else {
        // Repair dupes in already-structured specs
        const fixed = dedupStructuredSpecs(product.specifications)
        if (fixed !== null) { updates.specifications = fixed; changed = true }
      }

      const newApps = migrateApplications(product.applications)
      if (newApps !== null) { updates.applications = newApps; report.byField.apps++; changed = true }

      if (!changed) { report.skippedCount++; continue }

      try {
        await db.collection('products').updateOne({ _id: product._id }, { $set: updates })
        report.migratedCount++
      } catch {
        report.errorCount++
      }
    }

    return NextResponse.json({ success: true, ...report })
  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json({ error: 'Migration failed' }, { status: 500 })
  }
}
