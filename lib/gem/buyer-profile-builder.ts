/**
 * lib/gem/buyer-profile-builder.ts
 *
 * Builds and refreshes the buyer_profiles collection from gem_contracts (Tier 1)
 * and gem_contract_archives (Tier 2). No BidPlus data used.
 *
 * Two entry points:
 *   buildAllBuyerProfiles(db)          — full rebuild from scratch
 *   buildIncrementalBuyerProfiles(db)  — rebuild only profiles affected by new contracts
 *
 * Tier assignment is percentile-based (relative to full population) and is always
 * recomputed across all profiles, even on incremental runs.
 */

import type { Db } from "mongodb"

// ─── Public types ─────────────────────────────────────────────────────────────

export interface BuyerProfile {
  buyer_key:    string
  buyer_slug:   string
  buyer_name:   string
  buyer_name_variants: string[]

  ministry:  string | null
  org_type:  string | null
  state:     string | null

  contract_count:      number
  total_spend:         number
  avg_contract_value:  number | null
  max_contract_value:  number | null

  first_contract_date: string | null  // YYYY-MM-DD
  last_contract_date:  string | null  // YYYY-MM-DD

  avg_days_between_purchases:  number | null
  purchase_frequency_per_year: number | null

  supplier_count:         number
  top_supplier:           string | null
  top_supplier_share_pct: number | null
  supplier_switch_count:  number
  supplier_switch_rate:   number | null

  archive_contract_count: number
  archive_coverage_pct:   number

  buyer_identity_confidence: "high" | "medium" | "low"
  buyer_identity_method:     "normalized_dept_name" | "state_disambiguated" | "needs_review"
  needs_review:              boolean

  buyer_tier: "A" | "B" | "C" | "D"

  updated_at:            Date
  source_contract_count: number  // enriched contracts used to build spend/supplier data
}

export interface BuildResult {
  profiles_built:      number
  profiles_written:    number
  duration_ms:         number
  as_of:               Date
  is_incremental:      boolean
  contracts_processed: number
}

// ─── Internal types ───────────────────────────────────────────────────────────

interface RawDeptData {
  total_spend:    number
  enriched_count: number
  max_value:      number | null
  first_date:     unknown   // Date or string from MongoDB — normalized via toDateMs()
  last_date:      unknown
  ministry:       string | null
  org_type:       string | null
  state:          string | null
  sellers:        { name: string | null; value: number; date: unknown }[]
}

// ─── Date utilities ───────────────────────────────────────────────────────────

function toDateMs(d: unknown): number | null {
  if (!d) return null
  if (d instanceof Date) return isNaN(d.getTime()) ? null : d.getTime()
  if (typeof d === "string") {
    const ms = new Date(d).getTime()
    return isNaN(ms) ? null : ms
  }
  return null
}

function toIsoDate(d: unknown): string | null {
  const ms = toDateMs(d)
  if (ms === null) return null
  return new Date(ms).toISOString().slice(0, 10)
}

// ─── Normalization ────────────────────────────────────────────────────────────

const ABBREV_MAP: [RegExp, string][] = [
  [/\bDEPT\.?\b/g,  "DEPARTMENT"],
  [/\bGOVT\.?\b/g,  "GOVERNMENT"],
  [/\bDIST\.?\b/g,  "DISTRICT"],
  [/\bHOSP\.?\b/g,  "HOSPITAL"],
  [/\bZILLA\b/g,    "DISTRICT"],
  [/\bJILLA\b/g,    "DISTRICT"],
]

function normalizeForComparison(raw: string): string {
  let s = raw.trim().replace(/\s+/g, " ")
  s = s.replace(/[.,'";\-\(\)\[\]{}&]/g, " ").replace(/\s+/g, " ").trim()
  s = s.toUpperCase()
  for (const [p, r] of ABBREV_MAP) s = s.replace(p, r)
  s = s.replace(/\s+/g, " ").trim()
  return s.replace(/^(THE|A|AN)\s+/, "").trim()
}

function toSlug(normalized: string): string {
  return normalized.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

// ─── Computation helpers ──────────────────────────────────────────────────────

function avgDaysBetween(dateMsList: (number | null)[]): number | null {
  const sorted = dateMsList.filter((t): t is number => t !== null).sort((a, b) => a - b)
  if (sorted.length < 2) return null
  const gaps: number[] = []
  for (let i = 1; i < sorted.length; i++) {
    const d = Math.round((sorted[i] - sorted[i - 1]) / 86400000)
    if (d >= 0) gaps.push(d)
  }
  if (!gaps.length) return null
  return Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length)
}

function freqPerYear(count: number, firstMs: number | null, lastMs: number | null): number | null {
  if (!firstMs || !lastMs || count < 2) return null
  const spanDays = Math.round((lastMs - firstMs) / 86400000)
  if (spanDays < 30) return null
  return Math.round((count / (spanDays / 365)) * 10) / 10
}

function computeSupplierSwitches(
  sellers: { name: string | null; dateMs: number | null }[]
): { switchCount: number; switchRate: number | null } {
  const sorted = sellers
    .filter((s): s is { name: string; dateMs: number } => !!s.name && s.dateMs !== null)
    .sort((a, b) => a.dateMs - b.dateMs)
  if (sorted.length < 2) return { switchCount: 0, switchRate: null }
  let switches = 0
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].name !== sorted[i - 1].name) switches++
  }
  return {
    switchCount: switches,
    switchRate:  Math.round((switches / (sorted.length - 1)) * 100) / 100,
  }
}

// ─── Phase 1: MongoDB aggregations ───────────────────────────────────────────

async function fetchEnrichedByDept(
  db: Db,
  deptFilter?: string[],
): Promise<Map<string, RawDeptData>> {
  const matchStage: Record<string, unknown> = {
    detail_scraped:     true,
    dept_name:          { $nin: [null, ""] },
    contract_value_num: { $gt: 0 },
  }
  if (deptFilter?.length) {
    matchStage.dept_name = { $in: deptFilter }
  }

  const rows = await db.collection("gem_contracts").aggregate([
    { $match: matchStage },
    {
      $group: {
        _id:            "$dept_name",
        total_spend:    { $sum:  "$contract_value_num" },
        enriched_count: { $sum:  1                     },
        max_value:      { $max:  "$contract_value_num" },
        first_date:     { $min:  "$contract_date_dt"   },
        last_date:      { $max:  "$contract_date_dt"   },
        ministry:       { $first: "$ministry"          },
        org_type:       { $first: "$org_type"          },
        state:          { $first: "$state"             },
        sellers: {
          $push: {
            name:  "$seller_name_canonical",
            value: "$contract_value_num",
            date:  "$contract_date_dt",
          },
        },
      },
    },
  ]).toArray()

  const map = new Map<string, RawDeptData>()
  for (const r of rows) {
    map.set(r._id as string, {
      total_spend:    r.total_spend    as number,
      enriched_count: r.enriched_count as number,
      max_value:      r.max_value      as number | null,
      first_date:     r.first_date,
      last_date:      r.last_date,
      ministry:       (r.ministry as string | null) || null,
      org_type:       (r.org_type as string | null) || null,
      state:          (r.state    as string | null) || null,
      sellers:        (r.sellers  as { name: string | null; value: number; date: unknown }[]) ?? [],
    })
  }
  return map
}

async function fetchAllCountByDept(
  db: Db,
  deptFilter?: string[],
): Promise<Map<string, number>> {
  const matchStage: Record<string, unknown> = { dept_name: { $nin: [null, ""] } }
  if (deptFilter?.length) {
    matchStage.dept_name = { $in: deptFilter }
  }

  const rows = await db.collection("gem_contracts").aggregate([
    { $match: matchStage },
    { $group: { _id: "$dept_name", count: { $sum: 1 } } },
  ]).toArray()

  const map = new Map<string, number>()
  for (const r of rows) map.set(r._id as string, r.count as number)
  return map
}

async function fetchArchiveCoverageBySlug(db: Db): Promise<Map<string, number>> {
  const rows = await db.collection("gem_contract_archives").aggregate([
    { $match: { buyer_slug: { $nin: [null, ""] } } },
    { $group: { _id: "$buyer_slug", count: { $sum: 1 } } },
  ]).toArray()

  const map = new Map<string, number>()
  for (const r of rows) map.set(r._id as string, r.count as number)
  return map
}

// ─── Phase 2: Build profile documents ────────────────────────────────────────

function buildProfileDocuments(
  enrichedByDept: Map<string, RawDeptData>,
  countByDept:    Map<string, number>,
  archiveBySlug:  Map<string, number>,
): BuyerProfile[] {
  // Pass 1: Detect slug collisions across different states
  const slugStateMap = new Map<string, Set<string>>()
  for (const [dept, data] of enrichedByDept) {
    const slug = toSlug(normalizeForComparison(dept))
    if (!slugStateMap.has(slug)) slugStateMap.set(slug, new Set())
    if (data.state) slugStateMap.get(slug)!.add(data.state)
  }

  // Pass 2: Assign final (possibly state-disambiguated) slug to each dept
  const deptToSlug = new Map<string, { slug: string; disambiguated: boolean }>()
  for (const [dept, data] of enrichedByDept) {
    const baseSlug  = toSlug(normalizeForComparison(dept))
    const stateSet  = slugStateMap.get(baseSlug)
    const collision = stateSet && stateSet.size > 1 && !!data.state

    if (collision) {
      const stateSlug = data.state!.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
      deptToSlug.set(dept, { slug: `${baseSlug}-${stateSlug}`, disambiguated: true })
    } else {
      deptToSlug.set(dept, { slug: baseSlug, disambiguated: false })
    }
  }

  // Pass 3: Group depts by final slug
  const slugGroups = new Map<string, {
    deptNames:    string[]
    dataArr:      RawDeptData[]
    disambiguated: boolean
  }>()
  for (const [dept, { slug, disambiguated }] of deptToSlug) {
    if (!slugGroups.has(slug)) slugGroups.set(slug, { deptNames: [], dataArr: [], disambiguated })
    const g = slugGroups.get(slug)!
    g.deptNames.push(dept)
    g.dataArr.push(enrichedByDept.get(dept)!)
  }

  // Pass 4: Build one profile per slug
  const now      = new Date()
  const profiles: BuyerProfile[] = []

  for (const [slug, { deptNames, dataArr, disambiguated }] of slugGroups) {
    // Merge data from all dept variants into one profile
    let totalSpend    = 0
    let enrichedCount = 0
    let maxValue: number | null          = null
    let firstDateMs:  number | null      = null
    let lastDateMs:   number | null      = null
    let ministry:     string | null      = null
    let orgType:      string | null      = null
    let state:        string | null      = null
    const allSellers: { name: string | null; value: number; dateMs: number | null }[] = []

    for (const d of dataArr) {
      totalSpend    += d.total_spend
      enrichedCount += d.enriched_count
      if (d.max_value !== null && (maxValue === null || d.max_value > maxValue)) maxValue = d.max_value

      const fd = toDateMs(d.first_date)
      const ld = toDateMs(d.last_date)
      if (fd !== null && (firstDateMs === null || fd < firstDateMs)) firstDateMs = fd
      if (ld !== null && (lastDateMs  === null || ld > lastDateMs )) lastDateMs  = ld

      if (!ministry && d.ministry) ministry = d.ministry
      if (!orgType  && d.org_type) orgType  = d.org_type
      if (!state    && d.state   ) state    = d.state

      for (const s of d.sellers) {
        allSellers.push({ name: s.name, value: s.value, dateMs: toDateMs(s.date) })
      }
    }

    // Total contract count (all contracts, enriched + raw)
    let totalCount = 0
    for (const dept of deptNames) totalCount += countByDept.get(dept) ?? 0

    // Canonical buyer name: use the dept_name with the highest total contract count
    let buyerName = deptNames[0]
    let maxCount  = 0
    for (const dept of deptNames) {
      const c = countByDept.get(dept) ?? 0
      if (c > maxCount) { maxCount = c; buyerName = dept }
    }

    // Supplier analysis
    const supplierSpend = new Map<string, number>()
    for (const s of allSellers) {
      if (!s.name) continue
      supplierSpend.set(s.name, (supplierSpend.get(s.name) ?? 0) + (s.value ?? 0))
    }
    const suppliersSorted = [...supplierSpend.entries()].sort((a, b) => b[1] - a[1])
    const topSupplier     = suppliersSorted[0]?.[0] ?? null
    const topSpend        = suppliersSorted[0]?.[1] ?? 0
    const topSharePct     = totalSpend > 0 ? Math.round((topSpend / totalSpend) * 1000) / 10 : null

    const { switchCount, switchRate } = computeSupplierSwitches(
      allSellers.map(s => ({ name: s.name, dateMs: s.dateMs }))
    )

    // Temporal analysis (uses enriched contract dates only)
    const dateMsList = allSellers.map(s => s.dateMs)
    const avgDays    = avgDaysBetween(dateMsList)
    const freq       = freqPerYear(enrichedCount, firstDateMs, lastDateMs)

    // Archive coverage
    const archiveCount = archiveBySlug.get(slug) ?? 0
    const archivePct   = totalCount > 0 ? Math.round((archiveCount / totalCount) * 1000) / 10 : 0

    // Identity confidence
    const variantCount = new Set(deptNames).size
    let confidence: "high" | "medium" | "low"
    let method: "normalized_dept_name" | "state_disambiguated" | "needs_review"
    let needsReview = false

    if (variantCount > 6) {
      confidence = "low";    method = "needs_review";          needsReview = true
    } else if (disambiguated) {
      confidence = "medium"; method = "state_disambiguated"
    } else if (ministry && variantCount <= 3) {
      confidence = "high";   method = "normalized_dept_name"
    } else {
      confidence = "medium"; method = "normalized_dept_name"
    }

    profiles.push({
      buyer_key:    slug,
      buyer_slug:   slug,
      buyer_name:   buyerName,
      buyer_name_variants: [...new Set(deptNames)],

      ministry,
      org_type:  orgType,
      state,

      contract_count:      totalCount,
      total_spend:         totalSpend,
      avg_contract_value:  enrichedCount > 0 ? Math.round(totalSpend / enrichedCount) : null,
      max_contract_value:  maxValue,

      first_contract_date: toIsoDate(firstDateMs !== null ? new Date(firstDateMs) : null),
      last_contract_date:  toIsoDate(lastDateMs  !== null ? new Date(lastDateMs)  : null),

      avg_days_between_purchases:  avgDays,
      purchase_frequency_per_year: freq,

      supplier_count:         supplierSpend.size,
      top_supplier:           topSupplier,
      top_supplier_share_pct: topSharePct,
      supplier_switch_count:  switchCount,
      supplier_switch_rate:   switchRate,

      archive_contract_count: archiveCount,
      archive_coverage_pct:   archivePct,

      buyer_identity_confidence: confidence,
      buyer_identity_method:     method,
      needs_review:              needsReview,

      buyer_tier: "D",  // overwritten by assignTiers()

      updated_at:            now,
      source_contract_count: enrichedCount,
    })
  }

  return profiles
}

// ─── Phase 3: Tier assignment (percentile-based) ──────────────────────────────

function assignTiers(profiles: BuyerProfile[]): void {
  // Tier D: single-purchase buyers (always, regardless of spend)
  const multi  = profiles.filter(p => p.contract_count > 1)
  const single = profiles.filter(p => p.contract_count <= 1)

  multi.sort((a, b) => b.total_spend - a.total_spend)

  const n        = multi.length
  const tierAEnd = Math.max(1, Math.floor(n * 0.10))
  const tierBEnd = tierAEnd + Math.max(1, Math.floor(n * 0.20))

  multi.forEach((p, i) => {
    p.buyer_tier = i < tierAEnd ? "A" : i < tierBEnd ? "B" : "C"
  })
  single.forEach(p => { p.buyer_tier = "D" })
}

// Recompute tiers for all existing profiles in DB (used after incremental update)
export async function reassignAllTiers(db: Db): Promise<void> {
  const all = await db.collection("buyer_profiles")
    .find({ buyer_slug: { $ne: META_SLUG } })
    .project({ buyer_slug: 1, contract_count: 1, total_spend: 1 })
    .toArray() as { buyer_slug: string; contract_count: number; total_spend: number }[]

  const multi  = all.filter(p => p.contract_count > 1).sort((a, b) => b.total_spend - a.total_spend)
  const single = all.filter(p => p.contract_count <= 1)

  const n        = multi.length
  const tierAEnd = Math.max(1, Math.floor(n * 0.10))
  const tierBEnd = tierAEnd + Math.max(1, Math.floor(n * 0.20))

  const ops = [
    ...multi.map((p, i) => ({
      updateOne: {
        filter: { buyer_slug: p.buyer_slug },
        update: { $set: { buyer_tier: i < tierAEnd ? "A" : i < tierBEnd ? "B" : "C" } },
      },
    })),
    ...single.map(p => ({
      updateOne: {
        filter: { buyer_slug: p.buyer_slug },
        update: { $set: { buyer_tier: "D" } },
      },
    })),
  ]

  if (ops.length) await db.collection("buyer_profiles").bulkWrite(ops, { ordered: false })
}

// ─── Indexes ──────────────────────────────────────────────────────────────────

export async function ensureBuyerProfileIndexes(db: Db): Promise<void> {
  const col = db.collection("buyer_profiles")
  await Promise.all([
    col.createIndex({ buyer_slug:          1 }, { unique: true,  name: "buyer_slug_unique" }),
    col.createIndex({ buyer_tier:          1, total_spend: -1 }, { name: "tier_spend"       }),
    col.createIndex({ state:               1, total_spend: -1 }, { name: "state_spend"      }),
    col.createIndex({ ministry:            1, total_spend: -1 }, { name: "ministry_spend"   }),
    col.createIndex({ total_spend:         -1 },                  { name: "spend_desc"       }),
    col.createIndex({ last_contract_date:  -1 },                  { name: "last_date_desc"   }),
    col.createIndex({ contract_count:      -1 },                  { name: "contract_count"   }),
    col.createIndex({ needs_review:         1 }, { sparse: true,  name: "needs_review"       }),
    col.createIndex({ "buyer_name_variants": "text", buyer_name: "text" }, { name: "buyer_name_text" }),
  ])
}

// ─── Meta document ────────────────────────────────────────────────────────────

const META_SLUG = "__meta__"

async function readMeta(db: Db): Promise<{
  last_full_build_at:  Date | null
  last_incremental_at: Date | null
}> {
  const doc = await db.collection("buyer_profiles").findOne({ buyer_slug: META_SLUG }) as Record<string, unknown> | null
  return {
    last_full_build_at:  (doc?.last_full_build_at  as Date | null) ?? null,
    last_incremental_at: (doc?.last_incremental_at as Date | null) ?? null,
  }
}

async function writeMeta(db: Db, patch: {
  last_full_build_at?:  Date
  last_incremental_at?: Date
  total_profiles:       number
  build_duration_ms:    number
}): Promise<void> {
  await db.collection("buyer_profiles").updateOne(
    { buyer_slug: META_SLUG },
    { $set: { buyer_slug: META_SLUG, ...patch, updated_at: new Date() } },
    { upsert: true },
  )
}

// ─── Public build functions ───────────────────────────────────────────────────

export async function buildAllBuyerProfiles(db: Db): Promise<BuildResult> {
  const start = Date.now()

  await ensureBuyerProfileIndexes(db)

  const [enrichedByDept, countByDept, archiveBySlug] = await Promise.all([
    fetchEnrichedByDept(db),
    fetchAllCountByDept(db),
    fetchArchiveCoverageBySlug(db),
  ])

  const profiles = buildProfileDocuments(enrichedByDept, countByDept, archiveBySlug)
  assignTiers(profiles)

  if (profiles.length > 0) {
    const ops = profiles.map(p => ({
      replaceOne: { filter: { buyer_slug: p.buyer_slug }, replacement: p, upsert: true },
    }))
    await db.collection("buyer_profiles").bulkWrite(ops, { ordered: false })
  }

  const now        = new Date()
  const durationMs = Date.now() - start

  await writeMeta(db, {
    last_full_build_at: now,
    total_profiles:     profiles.length,
    build_duration_ms:  durationMs,
  })

  return {
    profiles_built:      profiles.length,
    profiles_written:    profiles.length,
    duration_ms:         durationMs,
    as_of:               now,
    is_incremental:      false,
    contracts_processed: [...enrichedByDept.values()].reduce((s, d) => s + d.enriched_count, 0),
  }
}

export async function buildIncrementalBuyerProfiles(db: Db): Promise<BuildResult> {
  const start = Date.now()
  const meta  = await readMeta(db)
  const since = meta.last_incremental_at ?? meta.last_full_build_at

  if (!since) {
    // No prior build — fall back to full build
    return buildAllBuyerProfiles(db)
  }

  // Contracts added since last run
  const newContracts = await db.collection("gem_contracts")
    .find({ first_seen: { $gt: since }, dept_name: { $nin: [null, ""] } })
    .project({ dept_name: 1, _id: 0 })
    .toArray()

  if (!newContracts.length) {
    return {
      profiles_built:      0,
      profiles_written:    0,
      duration_ms:         Date.now() - start,
      as_of:               new Date(),
      is_incremental:      true,
      contracts_processed: 0,
    }
  }

  const affectedDepts = [...new Set(newContracts.map(c => c.dept_name as string).filter(Boolean))]

  const [enrichedByDept, countByDept, archiveBySlug] = await Promise.all([
    fetchEnrichedByDept(db, affectedDepts),
    fetchAllCountByDept(db, affectedDepts),
    fetchArchiveCoverageBySlug(db),
  ])

  const updatedProfiles = buildProfileDocuments(enrichedByDept, countByDept, archiveBySlug)

  if (updatedProfiles.length > 0) {
    const ops = updatedProfiles.map(p => ({
      replaceOne: { filter: { buyer_slug: p.buyer_slug }, replacement: p, upsert: true },
    }))
    await db.collection("buyer_profiles").bulkWrite(ops, { ordered: false })
  }

  // Tiers are relative — reassign across ALL profiles after any update
  await reassignAllTiers(db)

  const now        = new Date()
  const durationMs = Date.now() - start
  const totalProfiles = await db.collection("buyer_profiles")
    .countDocuments({ buyer_slug: { $ne: META_SLUG } })

  await writeMeta(db, {
    last_incremental_at: now,
    total_profiles:      totalProfiles,
    build_duration_ms:   durationMs,
  })

  return {
    profiles_built:      updatedProfiles.length,
    profiles_written:    updatedProfiles.length,
    duration_ms:         durationMs,
    as_of:               now,
    is_incremental:      true,
    contracts_processed: newContracts.length,
  }
}

export { META_SLUG }
