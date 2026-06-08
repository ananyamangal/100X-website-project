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
  return result.length < val.length ? result : null // null = no change needed
}

// ── Health report helpers ────────────────────────────────────────────────────

type ProductIssue =
  | 'legacy-features' | 'legacy-specs' | 'legacy-apps'
  | 'duplicate-specs' | 'unmatched-badges' | 'legacy-certs' | 'missing-cert-ids'
  | 'empty-features' | 'empty-specs' | 'empty-apps'

function getProductIssues(
  p: any,
  cmsBadgeNames: Set<string>,
  cmsCertIds: Set<string>,
): ProductIssue[] {
  const issues: ProductIssue[] = []

  // Features
  if (!Array.isArray(p.features) || p.features.length === 0) issues.push('empty-features')
  else if (!isStructured(p.features, 'features')) issues.push('legacy-features')

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
    const cmsCertIds = new Set(cmsCerts.map((c: any) => String(c._id)))

    // Aggregate counters
    let featMigrated = 0, featLegacy = 0, featEmpty = 0
    let specMigrated = 0, specLegacy = 0, specEmpty = 0, specDupes = 0
    let appMigrated = 0, appLegacy = 0, appEmpty = 0
    let productsWithFaqs = 0
    let productsWithUnmatchedBadges = 0
    let productsWithLegacyCerts = 0
    let productsWithCertIds = 0

    const productRows: any[] = []

    for (const p of products) {
      const issues = getProductIssues(p, cmsBadgeNames, cmsCertIds)

      // Features
      if (!Array.isArray(p.features) || p.features.length === 0) featEmpty++
      else if (isStructured(p.features, 'features')) featMigrated++
      else featLegacy++

      // Specs
      if (!Array.isArray(p.specifications) || p.specifications.length === 0) specEmpty++
      else if (isStructured(p.specifications, 'specifications')) {
        specMigrated++
        if (issues.includes('duplicate-specs')) specDupes++
      } else specLegacy++

      // Apps
      if (!Array.isArray(p.applications) || p.applications.length === 0) appEmpty++
      else if (isStructured(p.applications, 'applications')) appMigrated++
      else appLegacy++

      // FAQs
      if (Array.isArray(p.productFaqs) && p.productFaqs.length > 0) productsWithFaqs++

      // Badges/certs
      if (issues.includes('unmatched-badges')) productsWithUnmatchedBadges++
      if (issues.includes('legacy-certs')) productsWithLegacyCerts++
      if (Array.isArray(p.certificationIds) && p.certificationIds.length > 0) productsWithCertIds++

      const status: 'full' | 'partial' | 'legacy' =
        issues.filter(i => i.startsWith('legacy') || i === 'duplicate-specs').length === 0
          ? 'full'
          : issues.filter(i => i.startsWith('legacy')).length === 3 ? 'legacy' : 'partial'

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
        features:  { migrated: featMigrated, legacy: featLegacy, empty: featEmpty },
        specs:     { migrated: specMigrated, legacy: specLegacy, empty: specEmpty, withDuplicates: specDupes },
        apps:      { migrated: appMigrated,  legacy: appLegacy,  empty: appEmpty  },
        faqs:      { withFaqs: productsWithFaqs, withoutFaqs: products.length - productsWithFaqs },
        badges:    { cmsDefined: cmsBadges.length, productsWithUnmatched: productsWithUnmatchedBadges },
        certs:     { cmsDefined: cmsCerts.length, productsWithLegacy: productsWithLegacyCerts, productsWithCertIds },
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
