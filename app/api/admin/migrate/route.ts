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
        hasFaqs: Array.isArray(p.productFaqs) && p.productFaqs.length > 0,
        hasCertIds: Array.isArray(p.certificationIds) && p.certificationIds.length > 0,
      })
    }

    const fullyMigrated = productRows.filter(p => p.status === 'full').length
    const partiallyMigrated = productRows.filter(p => p.status === 'partial').length
    const legacyCount = productRows.filter(p => p.status === 'legacy').length

    // Normalization score: products with zero blocking issues (same as status=full)
    const fullyNormalized = fullyMigrated
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

    if (action === 'build-part-relationships') {
      // Auto-detect assembly group from part name/category, then link related parts
      const COMPLEMENTARY: Record<string, string[]> = {
        'fuel-system':      ['ignition-system', 'filtration'],
        'ignition-system':  ['fuel-system', 'electrical'],
        'chemical-system':  ['nozzle-system', 'seals-gaskets'],
        'nozzle-system':    ['chemical-system', 'filtration'],
        'heating-system':   ['fuel-system'],
        'blower':           ['chassis-frame'],
        'seals-gaskets':    ['chemical-system', 'fuel-system'],
        'filtration':       ['fuel-system', 'chemical-system'],
        'electrical':       ['ignition-system'],
        'engine':           ['fuel-system', 'ignition-system'],
      }

      function detectGroup(part: any): string {
        const t = `${part.name} ${part.category || ''}`.toLowerCase()
        if (t.match(/carburetor|carb|fuel.?cap|fuel.?tank|fuel.?line|fuel.?filter|fuel.?pipe|fuel.?hose/)) return 'fuel-system'
        if (t.match(/valve|chemical.?tank|chemical.?hose|chemical.?pipe|spray.?tip/)) return 'chemical-system'
        if (t.match(/ignition|spark.?plug|coil|igniter/)) return 'ignition-system'
        if (t.match(/engine|piston|ring|crankshaft|cylinder|connecting.?rod/)) return 'engine'
        if (t.match(/blower|fan|impeller/)) return 'blower'
        if (t.match(/heat.?shield|heat.?element|vaporizer|heating/)) return 'heating-system'
        if (t.match(/nozzle/)) return 'nozzle-system'
        if (t.match(/filter/)) return 'filtration'
        if (t.match(/seal|gasket|o.?ring/)) return 'seals-gaskets'
        if (t.match(/electric|switch|wire|cable|battery|sensor/)) return 'electrical'
        if (t.match(/frame|chassis|handle|strap|bracket/)) return 'chassis-frame'
        return 'other'
      }

      const allParts = await db.collection('spare_parts').find({}).toArray()

      // Assign assemblyGroup where missing
      for (const p of allParts) {
        if (!p.assemblyGroup) {
          const g = detectGroup(p)
          await db.collection('spare_parts').updateOne({ _id: p._id }, { $set: { assemblyGroup: g, updatedAt: new Date().toISOString() } })
          p.assemblyGroup = g
        }
      }

      // Re-fetch with updated groups
      const parts = await db.collection('spare_parts').find({}).toArray()
      const byGroup: Record<string, any[]> = {}
      for (const p of parts) {
        const g = p.assemblyGroup || 'other'
        if (!byGroup[g]) byGroup[g] = []
        byGroup[g].push(p)
      }

      let updated = 0
      for (const p of parts) {
        const g = p.assemblyGroup || 'other'
        // Related = same group, excluding self
        const relatedSlugs = (byGroup[g] || []).filter((x: any) => String(x._id) !== String(p._id)).map((x: any) => x.slug).filter(Boolean)
        // Frequently bought together = parts from complementary groups (up to 4)
        const complementGroups = COMPLEMENTARY[g] || []
        const fbtSlugs: string[] = []
        for (const cg of complementGroups) {
          for (const cp of (byGroup[cg] || []).slice(0, 2)) {
            if (cp.slug && !fbtSlugs.includes(cp.slug)) fbtSlugs.push(cp.slug)
          }
        }
        // Only update if values actually changed (avoid unnecessary writes)
        const existingRel = JSON.stringify((p.relatedParts || []).sort())
        const newRel = JSON.stringify([...relatedSlugs].sort())
        const existingFbt = JSON.stringify((p.frequentlyBoughtTogether || []).sort())
        const newFbt = JSON.stringify([...fbtSlugs].sort())
        if (existingRel !== newRel || existingFbt !== newFbt) {
          await db.collection('spare_parts').updateOne(
            { _id: p._id },
            { $set: { relatedParts: relatedSlugs, frequentlyBoughtTogether: fbtSlugs, updatedAt: new Date().toISOString() } }
          )
          updated++
        }
      }

      return NextResponse.json({
        success: true, action: 'build-part-relationships',
        totalParts: parts.length,
        updatedParts: updated,
        groups: Object.fromEntries(Object.entries(byGroup).map(([k, v]) => [k, v.length])),
        message: `Built relationships for ${updated} of ${parts.length} spare parts across ${Object.keys(byGroup).length} assembly groups`,
      })
    }

    if (action === 'spare-parts-audit') {
      const allParts = await db.collection('spare_parts').find({}).toArray()
      const products = await db.collection('products').find({}, { projection: { _id: 1, name: 1, slug: 1 } }).toArray()
      const productNameSet = new Set(products.map((p: any) => String(p.name).toLowerCase()))

      const total = allParts.length
      const published = allParts.filter((p: any) => p.isPublished).length
      const unpublished = total - published
      const orphaned = allParts.filter((p: any) => !Array.isArray(p.compatibleProductNames) || p.compatibleProductNames.length === 0)
      const missingSlug = allParts.filter((p: any) => !p.slug || p.slug.trim() === '')
      const noAssemblyGroup = allParts.filter((p: any) => !p.assemblyGroup)
      const noRelatedParts = allParts.filter((p: any) => !Array.isArray(p.relatedParts) || p.relatedParts.length === 0)
      const noFbt = allParts.filter((p: any) => !Array.isArray(p.frequentlyBoughtTogether) || p.frequentlyBoughtTogether.length === 0)

      // Slug anomalies: parts where slug doesn't match name
      const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-')
      const slugAnomalies = allParts
        .filter((p: any) => p.slug && p.name && p.slug !== slugify(p.name) && Math.abs(p.slug.length - p.name.length) > 5)
        .map((p: any) => ({ name: p.name, slug: p.slug, expected: slugify(p.name) }))

      // Unresolved compatible product references
      const unresolvedRefs: string[] = []
      for (const p of allParts) {
        for (const name of (p.compatibleProductNames || [])) {
          if (!productNameSet.has(String(name).toLowerCase())) {
            if (!unresolvedRefs.includes(String(name))) unresolvedRefs.push(String(name))
          }
        }
      }

      return NextResponse.json({
        success: true, action: 'spare-parts-audit',
        summary: { total, published, unpublished },
        issues: {
          orphaned: orphaned.length,
          missingSlug: missingSlug.length,
          noAssemblyGroup: noAssemblyGroup.length,
          noRelatedParts: noRelatedParts.length,
          noFrequentlyBoughtTogether: noFbt.length,
          slugAnomalies: slugAnomalies.length,
          unresolvedCompatibleProducts: unresolvedRefs.length,
        },
        details: {
          orphanedParts: orphaned.map((p: any) => ({ name: p.name, slug: p.slug })),
          slugAnomalies,
          unresolvedCompatibleProducts: unresolvedRefs,
          missingSlugParts: missingSlug.map((p: any) => ({ name: p.name, id: String(p._id) })),
        },
      })
    }

    if (action === 'migrate-certs') {
      const [products, cmsCerts] = await Promise.all([
        db.collection('products').find({}, {
          projection: { _id: 1, name: 1, certifications: 1, certificationIds: 1 }
        }).toArray(),
        db.collection('certifications').find({}).toArray(),
      ])

      // Build name → _id map (case-insensitive, also index legacyString alias)
      const certNameToId = new Map<string, string>()
      for (const c of cmsCerts) {
        certNameToId.set(String(c.name || '').toLowerCase().trim(), String(c._id))
        if (c.legacyString) certNameToId.set(String(c.legacyString).toLowerCase().trim(), String(c._id))
      }

      const report: {
        total: number; migrated: number; skipped: number
        unmatched: string[]; perProduct: any[]
      } = { total: products.length, migrated: 0, skipped: 0, unmatched: [], perProduct: [] }

      for (const p of products) {
        const legacyCerts: string[] = Array.isArray(p.certifications)
          ? p.certifications.filter((c: any) => typeof c === 'string')
          : []

        if (legacyCerts.length === 0) {
          report.skipped++
          report.perProduct.push({ name: p.name, action: 'skipped', reason: 'no legacy cert strings' })
          continue
        }

        const matchedIds: string[] = []
        const unmatched: string[] = []
        for (const cert of legacyCerts) {
          const id = certNameToId.get(cert.toLowerCase().trim())
          if (id) { if (!matchedIds.includes(id)) matchedIds.push(id) }
          else { unmatched.push(cert) }
        }

        // Merge with existing certificationIds, dedup
        const existingIds: string[] = Array.isArray(p.certificationIds) ? p.certificationIds : []
        const allIds = [...new Set([...existingIds, ...matchedIds])]

        await db.collection('products').updateOne(
          { _id: p._id },
          { $set: { certificationIds: allIds, certifications: [], updatedAt: new Date() } }
        )

        report.migrated++
        for (const u of unmatched) {
          if (!report.unmatched.includes(u)) report.unmatched.push(u)
        }
        report.perProduct.push({
          name: p.name, action: 'migrated',
          matched: matchedIds.length, unmatched, certificationIds: allIds,
        })
      }

      return NextResponse.json({ success: true, action: 'migrate-certs', ...report })
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
