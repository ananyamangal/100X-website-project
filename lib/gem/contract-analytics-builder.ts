import type { Db } from "mongodb"

// ─── Public types ─────────────────────────────────────────────────────────────

export interface BuyerSellerPair {
  doc_type:              "buyer_seller_pair"
  pair_key:              string   // "{buyer_slug}::{seller_slug}"

  // Identity
  buyer_slug:            string
  buyer_name:            string
  seller_slug:           string
  seller_name:           string
  seller_pan:            string | null
  seller_gstin:          string | null

  // Core metrics
  contract_count:        number
  total_gmv:             number
  first_contract_date:   string | null
  last_contract_date:    string | null
  avg_contract_value:    number | null
  max_contract_value:    number | null

  // Temporal depth
  relationship_span_days: number | null
  consecutive_years:      number

  // Relationship flags
  is_repeat:             boolean
  is_exclusive:          boolean   // seller's entire buyer_count === 1

  // Share metrics (null when profile totals unavailable)
  buyer_share_of_seller: number | null   // pair GMV / seller total_gmv
  seller_share_of_buyer: number | null   // pair GMV / buyer total_spend

  // Classification
  relationship_tier: "anchor" | "regular" | "occasional"
  // anchor    : seller_share_of_buyer > 0.40 AND contract_count > 3
  // regular   : contract_count >= 2
  // occasional: contract_count === 1

  // Products transacted in this pair
  products:              string[]
  product_count:         number
  has_fogging_products:  boolean

  // Opportunity score (deterministic, 0–100)
  opportunity_score:     number

  // Audit
  updated_at:            Date
}

export interface PairBuildResult {
  pairs_built:           number
  pairs_written:         number
  duration_ms:           number
  as_of:                 Date
  is_incremental:        boolean
  contracts_processed:   number
  stats: {
    anchor_pairs:        number
    regular_pairs:       number
    occasional_pairs:    number
    exclusive_pairs:     number
    repeat_pairs:        number
    fogging_pairs:       number
    unique_buyers:       number
    unique_sellers:      number
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const CA_META_SLUG = "__meta__"

const FOGGING_KEYWORDS = [
  "fog", "fogging", "mist", "misting", "ulv", "ultra low volume",
  "thermal fog", "vector control", "mosquito", "pest control",
  "sprayer", "spray machine", "disinfect", "sanitiz", "fumigat",
  "thermal spray", "cold fog",
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateMs(d: unknown): number | null {
  if (!d) return null
  if (d instanceof Date) return isNaN(d.getTime()) ? null : d.getTime()
  if (typeof d === "string") { const ms = new Date(d).getTime(); return isNaN(ms) ? null : ms }
  return null
}

function toIsoDate(d: unknown): string | null {
  const ms = toDateMs(d)
  return ms === null ? null : new Date(ms).toISOString().slice(0, 10)
}

function hasfogging(products: (string | null)[]): boolean {
  const lower = products.filter(Boolean).map(p => p!.toLowerCase())
  return lower.some(p => FOGGING_KEYWORDS.some(kw => p.includes(kw)))
}

/**
 * Deterministic opportunity score 0–100.
 *
 * Components:
 *   GMV score        0–35  — log₁₀-scaled (₹10 L → ~28, ₹1 Cr → ~35)
 *   Exclusivity      0–25  — seller sells only to this buyer
 *   Dependency       0–20  — seller_share_of_buyer (how much of buyer's wallet)
 *   Tier             0–15  — anchor 15, regular 8, occasional 0
 *   Longevity        0–5   — min(consecutive_years, 5)
 *
 * High score = large wallet + seller lock-in + buyer dependency.
 * This is a disruption signal, not a lead score.
 */
function calcOpportunityScore(p: {
  total_gmv:             number
  is_exclusive:          boolean
  seller_share_of_buyer: number | null
  relationship_tier:     "anchor" | "regular" | "occasional"
  consecutive_years:     number
}): number {
  const gmvScore        = Math.min(35, Math.floor(Math.log10(Math.max(p.total_gmv, 1)) * 7))
  const exclusiveScore  = p.is_exclusive ? 25 : 0
  const dependencyScore = Math.floor(Math.min(1, p.seller_share_of_buyer ?? 0) * 20)
  const tierScore       = p.relationship_tier === "anchor" ? 15
                        : p.relationship_tier === "regular" ? 8 : 0
  const longevityScore  = Math.min(5, p.consecutive_years)
  return Math.min(100, gmvScore + exclusiveScore + dependencyScore + tierScore + longevityScore)
}

// ─── Profile lookup maps ──────────────────────────────────────────────────────

interface BuyerLookup {
  buyer_slug:  string
  buyer_name:  string
  total_spend: number
}

interface SellerLookup {
  seller_slug:  string
  seller_name:  string
  seller_pan:   string | null
  seller_gstin: string | null
  total_gmv:    number
  buyer_count:  number
}

async function buildBuyerMap(db: Db): Promise<Map<string, BuyerLookup>> {
  const docs = await db.collection("buyer_profiles")
    .find(
      { buyer_slug: { $ne: "__meta__" } },
      { projection: { buyer_slug: 1, buyer_name: 1, buyer_name_variants: 1, total_spend: 1 } },
    )
    .toArray()

  const map = new Map<string, BuyerLookup>()
  for (const d of docs) {
    const entry: BuyerLookup = {
      buyer_slug:  d.buyer_slug  as string,
      buyer_name:  d.buyer_name  as string,
      total_spend: (d.total_spend as number) ?? 0,
    }
    // Index every name variant
    const variants = (d.buyer_name_variants as string[] | null) ?? [d.buyer_name as string]
    for (const v of variants) {
      if (v) map.set(v.toUpperCase(), entry)
    }
  }
  return map
}

async function buildSellerMap(db: Db): Promise<Map<string, SellerLookup>> {
  const docs = await db.collection("seller_profiles")
    .find(
      { seller_slug: { $ne: "__meta__" } },
      {
        projection: {
          seller_slug: 1, seller_name: 1, seller_pan: 1,
          seller_gstin: 1, seller_gstin_set: 1,
          total_gmv: 1, buyer_count: 1,
        },
      },
    )
    .toArray()

  const map = new Map<string, SellerLookup>()
  for (const d of docs) {
    const entry: SellerLookup = {
      seller_slug:  d.seller_slug  as string,
      seller_name:  d.seller_name  as string,
      seller_pan:   (d.seller_pan  as string | null) ?? null,
      seller_gstin: (d.seller_gstin as string | null) ?? null,
      total_gmv:    (d.total_gmv   as number) ?? 0,
      buyer_count:  (d.buyer_count as number) ?? 0,
    }
    // Index by all GSTINs the seller owns
    const gstinSet = (d.seller_gstin_set as string[] | null) ?? []
    if (d.seller_gstin) gstinSet.push(d.seller_gstin as string)
    for (const g of [...new Set(gstinSet)]) {
      if (g) map.set(g, entry)
    }
  }
  return map
}

// ─── Raw aggregation row ──────────────────────────────────────────────────────

interface RawPairRow {
  dept_name:     string | null
  seller_gst:    string | null
  contract_count: number
  total_gmv:     number
  max_value:     number | null
  first_date:    unknown
  last_date:     unknown
  years:         number[]          // distinct contract years
  products:      (string | null)[] // addToSet product_name
}

async function fetchRawPairs(db: Db, gstinFilter?: string[]): Promise<RawPairRow[]> {
  const matchStage: Record<string, unknown> = {
    detail_scraped:      true,
    seller_gst:          { $nin: [null, ""] },
    dept_name:           { $nin: [null, ""] },
    contract_value_num:  { $gt: 0 },
  }
  if (gstinFilter?.length) matchStage.seller_gst = { $in: gstinFilter }

  return db.collection("gem_contracts").aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: { dept_name: "$dept_name", seller_gst: "$seller_gst" },
        contract_count: { $sum: 1 },
        total_gmv:      { $sum: "$contract_value_num" },
        max_value:      { $max: "$contract_value_num" },
        first_date:     { $min: "$contract_date_dt" },
        last_date:      { $max: "$contract_date_dt" },
        years:          { $addToSet: { $year: "$contract_date_dt" } },
        products:       { $addToSet: "$product_name" },
      },
    },
  ], { allowDiskUse: true }).toArray() as Promise<RawPairRow[]>
}

// ─── Build pair document ──────────────────────────────────────────────────────

function buildPair(
  row:        RawPairRow,
  buyerMap:   Map<string, BuyerLookup>,
  sellerMap:  Map<string, SellerLookup>,
  now:        Date,
): BuyerSellerPair | null {
  const deptName  = (row as unknown as { _id: { dept_name: string; seller_gst: string } })._id.dept_name
  const sellerGST = (row as unknown as { _id: { dept_name: string; seller_gst: string } })._id.seller_gst

  // Resolve buyer
  const buyer = buyerMap.get(deptName.toUpperCase())
  if (!buyer) return null  // no buyer profile for this dept — skip

  // Resolve seller
  const seller = sellerMap.get(sellerGST)
  if (!seller) return null  // no seller profile — skip

  const pairKey = `${buyer.buyer_slug}::${seller.seller_slug}`

  // Temporal
  const firstMs = toDateMs(row.first_date)
  const lastMs  = toDateMs(row.last_date)
  const spanDays = (firstMs !== null && lastMs !== null)
    ? Math.round((lastMs - firstMs) / 86_400_000)
    : null

  const distinctYears = [...new Set((row.years ?? []).filter((y): y is number => typeof y === "number" && !isNaN(y)))]
  const consecutiveYears = distinctYears.length

  // Share metrics
  const buyerShareOfSeller = seller.total_gmv > 0
    ? Math.round((row.total_gmv / seller.total_gmv) * 10000) / 10000
    : null
  const sellerShareOfBuyer = buyer.total_spend > 0
    ? Math.round((row.total_gmv / buyer.total_spend) * 10000) / 10000
    : null

  // Flags
  const isRepeat    = row.contract_count > 1
  const isExclusive = seller.buyer_count === 1

  // Tier
  const relationshipTier: BuyerSellerPair["relationship_tier"] =
    ((sellerShareOfBuyer ?? 0) > 0.40 && row.contract_count > 3) ? "anchor"
    : row.contract_count >= 2 ? "regular"
    : "occasional"

  // Products
  const products = (row.products ?? []).filter((p): p is string => Boolean(p)).slice(0, 30)

  // Score
  const opportunityScore = calcOpportunityScore({
    total_gmv:             row.total_gmv,
    is_exclusive:          isExclusive,
    seller_share_of_buyer: sellerShareOfBuyer,
    relationship_tier:     relationshipTier,
    consecutive_years:     consecutiveYears,
  })

  return {
    doc_type:              "buyer_seller_pair",
    pair_key:              pairKey,
    buyer_slug:            buyer.buyer_slug,
    buyer_name:            buyer.buyer_name,
    seller_slug:           seller.seller_slug,
    seller_name:           seller.seller_name,
    seller_pan:            seller.seller_pan,
    seller_gstin:          sellerGST,
    contract_count:        row.contract_count,
    total_gmv:             row.total_gmv,
    first_contract_date:   toIsoDate(row.first_date),
    last_contract_date:    toIsoDate(row.last_date),
    avg_contract_value:    row.contract_count > 0
                             ? Math.round(row.total_gmv / row.contract_count)
                             : null,
    max_contract_value:    (row.max_value as number | null) ?? null,
    relationship_span_days: spanDays,
    consecutive_years:     consecutiveYears,
    is_repeat:             isRepeat,
    is_exclusive:          isExclusive,
    buyer_share_of_seller: buyerShareOfSeller,
    seller_share_of_buyer: sellerShareOfBuyer,
    relationship_tier:     relationshipTier,
    products,
    product_count:         products.length,
    has_fogging_products:  hasfogging(products),
    opportunity_score:     opportunityScore,
    updated_at:            now,
  }
}

// ─── Indexes ──────────────────────────────────────────────────────────────────

export async function ensurePairIndexes(db: Db): Promise<void> {
  const col = db.collection("contract_analytics")
  await Promise.all([
    col.createIndex(
      { doc_type: 1, pair_key: 1 },
      { unique: true, name: "pair_key_unique",
        partialFilterExpression: { doc_type: "buyer_seller_pair" } },
    ),
    col.createIndex(
      { doc_type: 1, total_gmv: -1 },
      { name: "pairs_gmv_desc" },
    ),
    col.createIndex(
      { doc_type: 1, opportunity_score: -1 },
      { name: "pairs_opportunity_desc" },
    ),
    col.createIndex(
      { doc_type: 1, buyer_slug: 1, total_gmv: -1 },
      { name: "pairs_by_buyer" },
    ),
    col.createIndex(
      { doc_type: 1, seller_slug: 1, total_gmv: -1 },
      { name: "pairs_by_seller" },
    ),
    col.createIndex(
      { doc_type: 1, relationship_tier: 1, opportunity_score: -1 },
      { name: "pairs_tier_score" },
    ),
    col.createIndex(
      { doc_type: 1, is_exclusive: 1, opportunity_score: -1 },
      { name: "pairs_exclusive", sparse: true },
    ),
    col.createIndex(
      { doc_type: 1, has_fogging_products: 1, opportunity_score: -1 },
      { name: "pairs_fogging", sparse: true },
    ),
  ])
}

// ─── Meta helpers ─────────────────────────────────────────────────────────────

async function readPairMeta(db: Db) {
  const doc = await db.collection("contract_analytics")
    .findOne({ doc_type: "__meta__", meta_type: "buyer_seller_pair" }) as Record<string, unknown> | null
  return {
    last_full_build_at:  (doc?.last_full_build_at  as Date | null) ?? null,
    last_incremental_at: (doc?.last_incremental_at as Date | null) ?? null,
  }
}

async function writePairMeta(db: Db, patch: {
  last_full_build_at?:  Date
  last_incremental_at?: Date
  total_pairs:          number
  build_duration_ms:    number
}): Promise<void> {
  await db.collection("contract_analytics").updateOne(
    { doc_type: "__meta__", meta_type: "buyer_seller_pair" },
    { $set: { doc_type: "__meta__", meta_type: "buyer_seller_pair", ...patch, updated_at: new Date() } },
    { upsert: true },
  )
}

// ─── Build stats helper ───────────────────────────────────────────────────────

function summarisePairs(pairs: BuyerSellerPair[]): PairBuildResult["stats"] {
  return {
    anchor_pairs:    pairs.filter(p => p.relationship_tier === "anchor").length,
    regular_pairs:   pairs.filter(p => p.relationship_tier === "regular").length,
    occasional_pairs: pairs.filter(p => p.relationship_tier === "occasional").length,
    exclusive_pairs: pairs.filter(p => p.is_exclusive).length,
    repeat_pairs:    pairs.filter(p => p.is_repeat).length,
    fogging_pairs:   pairs.filter(p => p.has_fogging_products).length,
    unique_buyers:   new Set(pairs.map(p => p.buyer_slug)).size,
    unique_sellers:  new Set(pairs.map(p => p.seller_slug)).size,
  }
}

// ─── Public: full rebuild ─────────────────────────────────────────────────────

export async function buildAllBuyerSellerPairs(db: Db): Promise<PairBuildResult> {
  const start = Date.now()
  await ensurePairIndexes(db)

  const [rawRows, buyerMap, sellerMap] = await Promise.all([
    fetchRawPairs(db),
    buildBuyerMap(db),
    buildSellerMap(db),
  ])

  const now  = new Date()
  const pairs: BuyerSellerPair[] = []

  for (const row of rawRows) {
    const pair = buildPair(row, buyerMap, sellerMap, now)
    if (pair) pairs.push(pair)
  }

  if (pairs.length > 0) {
    const CHUNK = 500
    for (let i = 0; i < pairs.length; i += CHUNK) {
      const ops = pairs.slice(i, i + CHUNK).map(p => ({
        replaceOne: {
          filter:      { doc_type: "buyer_seller_pair", pair_key: p.pair_key },
          replacement: p,
          upsert:      true,
        },
      }))
      await db.collection("contract_analytics").bulkWrite(ops, { ordered: false })
    }
  }

  // Remove stale pairs no longer in the data
  const activePairKeys = new Set(pairs.map(p => p.pair_key))
  const existingKeys = await db.collection("contract_analytics")
    .find({ doc_type: "buyer_seller_pair" }, { projection: { pair_key: 1 } })
    .toArray()
  const staleOps = existingKeys
    .filter(d => !activePairKeys.has(d.pair_key as string))
    .map(d => ({ deleteOne: { filter: { doc_type: "buyer_seller_pair", pair_key: d.pair_key } } }))
  if (staleOps.length > 0) {
    await db.collection("contract_analytics").bulkWrite(staleOps, { ordered: false })
  }

  const durationMs = Date.now() - start
  await writePairMeta(db, {
    last_full_build_at: now,
    total_pairs:        pairs.length,
    build_duration_ms:  durationMs,
  })

  return {
    pairs_built:         pairs.length,
    pairs_written:       pairs.length,
    duration_ms:         durationMs,
    as_of:               now,
    is_incremental:      false,
    contracts_processed: rawRows.length,
    stats:               summarisePairs(pairs),
  }
}

// ─── ContractConcentration & SupplierConcentration types ─────────────────────

export interface ContractConcentration {
  doc_type:               "contract_concentration"
  entity_type:            "buyer" | "ministry" | "state"
  entity_key:             string    // dept_name | ministry | state (raw)
  entity_slug:            string
  entity_name:            string

  hhi:                    number    // 0–10000
  concentration_label:    "monopoly" | "high" | "moderate" | "competitive"
  top_seller_share_pct:   number    // 0–100
  top_3_seller_share_pct: number    // 0–100
  switch_risk:            "critical" | "high" | "moderate" | "low"

  total_spend:            number
  contract_count:         number
  supplier_count:         number
  top_supplier_gst:       string | null
  top_supplier_name:      string | null
  top_supplier_slug:      string | null

  has_fogging_activity:            boolean
  fogging_supplier_count:          number
  fogging_spend:                   number
  fogging_hhi:                     number    // HHI within fogging suppliers only
  fogging_top_supplier_share_pct:  number    // top fogging supplier's share of fogging spend

  market_significance:             "strategic" | "material" | "minor" | "negligible"
  acquisition_priority:            "critical" | "high" | "medium" | "low"
  reason_codes:                    string[]  // e.g. high_hhi, single_supplier, fogging_activity

  ministry:               string | null   // buyer-level context
  state:                  string | null   // buyer-level context

  updated_at:             Date
}

export interface SupplierConcentration {
  doc_type:               "supplier_concentration"
  seller_slug:            string
  seller_name:            string
  seller_pan:             string | null
  seller_gstin:           string | null

  hhi:                    number
  concentration_label:    "monopoly" | "high" | "moderate" | "competitive"
  top_buyer_share_pct:    number    // 0–100
  top_3_buyer_share_pct:  number    // 0–100
  switch_risk:            "critical" | "high" | "moderate" | "low"

  total_revenue:          number
  contract_count:         number
  buyer_count:            number
  top_buyer_key:          string | null
  top_buyer_name:         string | null
  top_buyer_slug:         string | null

  has_fogging_activity:   boolean

  updated_at:             Date
}

export interface ConcentrationBuildResult {
  buyer_docs:    number
  ministry_docs: number
  state_docs:    number
  supplier_docs: number
  duration_ms:   number
  as_of:         Date
  stats: {
    monopoly_buyers:       number
    monopoly_ministries:   number
    monopoly_states:       number
    high_conc_buyers:      number
    fogging_buyers:        number
    fogging_states:        number
    critical_priority:     number
    high_priority:         number
  }
}

// ─── Concentration helpers ────────────────────────────────────────────────────

function slugConc(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

function hhi(spends: number[], total: number): number {
  if (total <= 0) return 0
  return Math.round(spends.reduce((acc, s) => acc + (s / total) ** 2, 0) * 10000)
}

function concLabel(h: number, n: number): ContractConcentration["concentration_label"] {
  if (n === 1)    return "monopoly"
  if (h >= 2500)  return "high"
  if (h >= 1500)  return "moderate"
  return "competitive"
}

function switchRisk(h: number, n: number): ContractConcentration["switch_risk"] {
  if (n === 1)    return "critical"
  if (h > 5000)   return "high"
  if (h > 2500)   return "moderate"
  return "low"
}

// Spend thresholds
const STRATEGIC_THRESHOLD    = 5_000_000   // ₹50 lakh
const HIGH_SPEND_THRESHOLD   = 1_000_000   // ₹10 lakh  (acquisition signal)
const MATERIAL_THRESHOLD     = 1_000_000   // ₹10 lakh
const MINOR_THRESHOLD        =   100_000   // ₹1 lakh
const HIGH_FOGGING_THRESHOLD =   100_000   // ₹1 lakh

function marketSignificance(totalSpend: number): ContractConcentration["market_significance"] {
  if (totalSpend >= STRATEGIC_THRESHOLD) return "strategic"
  if (totalSpend >= MATERIAL_THRESHOLD)  return "material"
  if (totalSpend >= MINOR_THRESHOLD)     return "minor"
  return "negligible"
}

interface ConcSellerRow { gst: string; spend: number; count: number }

type AcqResult = { priority: ContractConcentration["acquisition_priority"]; reason_codes: string[]; score: number }

function calcAcquisitionPriority(p: {
  hhi:              number
  topSharePct:      number
  totalSpend:       number
  foggingSpend:     number
  supplierCount:    number
  hasFogging:       boolean
  hasRepeat:        boolean
}): AcqResult {
  let score = 0
  const codes: string[] = []

  if (p.hhi > 8000)                            { score += 40; codes.push("high_hhi") }
  if (p.topSharePct > 80)                      { score += 30; codes.push("top_supplier_dominance") }
  if (p.totalSpend > HIGH_SPEND_THRESHOLD)     { score += 20; codes.push("high_spend") }
  if (p.foggingSpend > HIGH_FOGGING_THRESHOLD) { score += 20; codes.push("fogging_high_spend") }
  if (p.supplierCount <= 2)                    { score += 10; codes.push("limited_competition") }

  // Descriptive codes (no score)
  if (p.supplierCount === 1) codes.push("single_supplier")
  if (p.hasFogging)          codes.push("fogging_activity")
  if (p.hasRepeat)           codes.push("repeat_relationships")

  const priority: ContractConcentration["acquisition_priority"] =
    score >= 90 ? "critical"
    : score >= 70 ? "high"
    : score >= 40 ? "medium"
    : "low"

  return { priority, reason_codes: codes, score }
}

function buildConcDoc(
  entityType: ContractConcentration["entity_type"],
  entityKey:  string,
  entitySlug: string,
  rows:       ConcSellerRow[],
  sellerMap:  Map<string, { seller_slug: string; seller_name: string; seller_pan: string | null; seller_gstin: string | null; is_fogging: boolean }>,
  ministry:   string | null,
  state:      string | null,
  now:        Date,
): ContractConcentration {
  const sorted     = [...rows].sort((a, b) => b.spend - a.spend)
  const totalSpend = sorted.reduce((s, r) => s + r.spend, 0)
  const totalCount = sorted.reduce((s, r) => s + r.count, 0)
  const n          = sorted.length

  const h               = hhi(sorted.map(r => r.spend), totalSpend)
  const top1            = sorted[0]
  const top1Info        = top1 ? sellerMap.get(top1.gst) : undefined
  const top3Spend       = sorted.slice(0, 3).reduce((s, r) => s + r.spend, 0)
  const topSharePct     = totalSpend > 0 ? Math.round((top1?.spend ?? 0) / totalSpend * 1000) / 10 : 0
  const top3SharePct    = totalSpend > 0 ? Math.round(top3Spend / totalSpend * 1000) / 10 : 0

  // Fogging subset (already sorted by spend desc)
  const foggingRows  = sorted.filter(r => sellerMap.get(r.gst)?.is_fogging)
  const foggingSpend = foggingRows.reduce((s, r) => s + r.spend, 0)
  const foggingN     = foggingRows.length
  const foggingHHI   = hhi(foggingRows.map(r => r.spend), foggingSpend)
  const topFogRow    = foggingRows[0]
  const foggingTopSharePct = foggingSpend > 0
    ? Math.round((topFogRow?.spend ?? 0) / foggingSpend * 1000) / 10
    : 0

  // Acquisition priority
  const hasRepeat    = rows.some(r => r.count > 1)
  const { priority, reason_codes } = calcAcquisitionPriority({
    hhi:           h,
    topSharePct,
    totalSpend,
    foggingSpend,
    supplierCount: n,
    hasFogging:    foggingN > 0,
    hasRepeat,
  })

  return {
    doc_type:               "contract_concentration",
    entity_type:            entityType,
    entity_key:             entityKey,
    entity_slug:            entitySlug,
    entity_name:            entityKey,
    hhi:                    h,
    concentration_label:    concLabel(h, n),
    top_seller_share_pct:   topSharePct,
    top_3_seller_share_pct: top3SharePct,
    switch_risk:            switchRisk(h, n),
    total_spend:            totalSpend,
    contract_count:         totalCount,
    supplier_count:         n,
    top_supplier_gst:       top1?.gst ?? null,
    top_supplier_name:      top1Info?.seller_name ?? null,
    top_supplier_slug:      top1Info?.seller_slug ?? null,
    has_fogging_activity:              foggingN > 0,
    fogging_supplier_count:            foggingN,
    fogging_spend:                     foggingSpend,
    fogging_hhi:                       foggingHHI,
    fogging_top_supplier_share_pct:    foggingTopSharePct,
    market_significance:               marketSignificance(totalSpend),
    acquisition_priority:              priority,
    reason_codes,
    ministry,
    state,
    updated_at:             now,
  }
}

// ─── Public: concentration rebuild ───────────────────────────────────────────

export async function buildAllConcentrationDocs(db: Db): Promise<ConcentrationBuildResult> {
  const start = Date.now()
  const col   = db.collection("contract_analytics")
  const now   = new Date()

  // ── Load seller lookup (with fogging flag) ─────────────────────────────
  const sellerDocs = await db.collection("seller_profiles")
    .find(
      { seller_slug: { $ne: "__meta__" } },
      { projection: { seller_slug: 1, seller_name: 1, seller_pan: 1,
                       seller_gstin: 1, seller_gstin_set: 1, supplies_fogging_products: 1 } },
    ).toArray()

  const sellerMapConc = new Map<string, {
    seller_slug: string; seller_name: string; seller_pan: string | null;
    seller_gstin: string | null; is_fogging: boolean
  }>()
  for (const d of sellerDocs) {
    const entry = {
      seller_slug:  d.seller_slug  as string,
      seller_name:  d.seller_name  as string,
      seller_pan:   (d.seller_pan  as string | null) ?? null,
      seller_gstin: (d.seller_gstin as string | null) ?? null,
      is_fogging:   Boolean(d.supplies_fogging_products),
    }
    const gstinSet = [...new Set([
      ...((d.seller_gstin_set as string[] | null) ?? []),
      ...((d.seller_gstin as string | null) ? [d.seller_gstin as string] : []),
    ])]
    for (const g of gstinSet) if (g) sellerMapConc.set(g, entry)
  }

  // ── Load buyer slug lookup ─────────────────────────────────────────────
  const buyerDocs = await db.collection("buyer_profiles")
    .find(
      { buyer_slug: { $ne: "__meta__" } },
      { projection: { buyer_slug: 1, buyer_name_variants: 1 } },
    ).toArray()
  const buyerSlugMap = new Map<string, { buyer_slug: string; buyer_name: string }>()
  for (const d of buyerDocs) {
    const entry = { buyer_slug: d.buyer_slug as string, buyer_name: d.buyer_slug as string }
    const variants = (d.buyer_name_variants as string[] | null) ?? []
    for (const v of variants) if (v) buyerSlugMap.set(v.toUpperCase(), entry)
  }

  // ── Raw aggregation ────────────────────────────────────────────────────
  type RawConcRow = {
    _id:      { dept_name: string; seller_gst: string }
    spend:    number
    count:    number
    ministry: string | null
    state:    string | null
  }
  const pairRows = await db.collection("gem_contracts").aggregate<RawConcRow>([
    { $match: {
      detail_scraped:     true,
      seller_gst:         { $nin: [null, ""] },
      dept_name:          { $nin: [null, ""] },
      contract_value_num: { $gt: 0 },
    }},
    { $group: {
      _id:      { dept_name: "$dept_name", seller_gst: "$seller_gst" },
      spend:    { $sum: "$contract_value_num" },
      count:    { $sum: 1 },
      ministry: { $first: "$ministry" },
      state:    { $first: "$state" },
    }},
  ], { allowDiskUse: true }).toArray()

  // ── Partition into buyer / ministry / state / seller buckets ──────────
  const buyerBucket    = new Map<string, { rows: ConcSellerRow[]; ministry: string | null; state: string | null; slug: string }>()
  const ministryBucket = new Map<string, Map<string, ConcSellerRow>>()
  const stateBucket    = new Map<string, Map<string, ConcSellerRow>>()
  type SellerInfo = { seller_slug: string; seller_name: string; seller_pan: string | null; seller_gstin: string | null; is_fogging: boolean }
  type BuyerSpendRow = { spend: number; count: number; buyer_key: string; buyer_name: string; buyer_slug: string | null }
  const sellerBucket = new Map<string, { rows: Map<string, BuyerSpendRow>; info: SellerInfo }>()

  for (const row of pairRows) {
    const deptName  = row._id.dept_name
    const sellerGST = row._id.seller_gst
    const spend     = row.spend
    const count     = row.count
    const ministry  = row.ministry ?? null
    const state     = row.state ?? null
    const buyerEntry = buyerSlugMap.get(deptName.toUpperCase())
    const buyerSlug  = buyerEntry?.buyer_slug ?? slugConc(deptName)

    // buyer bucket
    if (!buyerBucket.has(deptName)) {
      buyerBucket.set(deptName, { rows: [], ministry, state, slug: buyerSlug })
    }
    const bb = buyerBucket.get(deptName)!
    const existing = bb.rows.find(r => r.gst === sellerGST)
    if (existing) { existing.spend += spend; existing.count += count }
    else bb.rows.push({ gst: sellerGST, spend, count })

    // ministry bucket
    if (ministry) {
      if (!ministryBucket.has(ministry)) ministryBucket.set(ministry, new Map())
      const mb = ministryBucket.get(ministry)!
      const me = mb.get(sellerGST)
      if (me) { me.spend += spend; me.count += count }
      else mb.set(sellerGST, { gst: sellerGST, spend, count })
    }

    // state bucket
    if (state) {
      if (!stateBucket.has(state)) stateBucket.set(state, new Map())
      const sb = stateBucket.get(state)!
      const se = sb.get(sellerGST)
      if (se) { se.spend += spend; se.count += count }
      else sb.set(sellerGST, { gst: sellerGST, spend, count })
    }

    // seller bucket
    const sellerInfo = sellerMapConc.get(sellerGST)
    if (sellerInfo) {
      if (!sellerBucket.has(sellerInfo.seller_slug)) {
        sellerBucket.set(sellerInfo.seller_slug, { rows: new Map(), info: sellerInfo })
      }
      const sb2 = sellerBucket.get(sellerInfo.seller_slug)!
      const se2 = sb2.rows.get(deptName)
      const buyerName = deptName
      const buyerSlugVal = buyerSlug
      if (se2) { se2.spend += spend; se2.count += count }
      else sb2.rows.set(deptName, { spend, count, buyer_key: deptName, buyer_name: buyerName, buyer_slug: buyerSlugVal })
    }
  }

  // ── Build docs ─────────────────────────────────────────────────────────
  const allDocs: (ContractConcentration | SupplierConcentration)[] = []

  for (const [deptName, bucket] of buyerBucket) {
    allDocs.push(buildConcDoc("buyer", deptName, bucket.slug, bucket.rows, sellerMapConc, bucket.ministry, bucket.state, now))
  }

  for (const [ministry, sellerMap2] of ministryBucket) {
    allDocs.push(buildConcDoc("ministry", ministry, slugConc(ministry), [...sellerMap2.values()], sellerMapConc, null, null, now))
  }

  for (const [state, sellerMap2] of stateBucket) {
    allDocs.push(buildConcDoc("state", state, slugConc(state), [...sellerMap2.values()], sellerMapConc, null, null, now))
  }

  for (const [sellerSlug, bucket] of sellerBucket) {
    const buyerRows = [...bucket.rows.values()]
    const totalRev  = buyerRows.reduce((s, r) => s + r.spend, 0)
    const totalCnt  = buyerRows.reduce((s, r) => s + r.count, 0)
    const sorted    = [...buyerRows].sort((a, b) => b.spend - a.spend)
    const n         = sorted.length
    const top1      = sorted[0]
    const top3Spend = sorted.slice(0, 3).reduce((s, r) => s + r.spend, 0)
    const h         = hhi(sorted.map(r => r.spend), totalRev)
    const topSharePct  = totalRev > 0 ? Math.round((top1?.spend ?? 0) / totalRev * 1000) / 10 : 0
    const top3SharePct = totalRev > 0 ? Math.round(top3Spend / totalRev * 1000) / 10 : 0

    allDocs.push({
      doc_type:               "supplier_concentration",
      seller_slug:            sellerSlug,
      seller_name:            bucket.info.seller_name,
      seller_pan:             bucket.info.seller_pan,
      seller_gstin:           bucket.info.seller_gstin,
      hhi:                    h,
      concentration_label:    concLabel(h, n) as ContractConcentration["concentration_label"],
      top_buyer_share_pct:    topSharePct,
      top_3_buyer_share_pct:  top3SharePct,
      switch_risk:            switchRisk(h, n) as ContractConcentration["switch_risk"],
      total_revenue:          totalRev,
      contract_count:         totalCnt,
      buyer_count:            n,
      top_buyer_key:          top1?.buyer_key ?? null,
      top_buyer_name:         top1?.buyer_name ?? null,
      top_buyer_slug:         top1?.buyer_slug ?? null,
      has_fogging_activity:   bucket.info.is_fogging,
      updated_at:             now,
    } satisfies SupplierConcentration)
  }

  // ── Write to MongoDB ───────────────────────────────────────────────────
  await ensureConcentrationIndexes(db)

  const CHUNK = 500
  for (let i = 0; i < allDocs.length; i += CHUNK) {
    const ops = allDocs.slice(i, i + CHUNK).map(d => {
      if (d.doc_type === "contract_concentration") {
        return {
          replaceOne: {
            filter:      { doc_type: "contract_concentration", entity_type: d.entity_type, entity_key: d.entity_key },
            replacement: d,
            upsert:      true,
          },
        }
      } else {
        return {
          replaceOne: {
            filter:      { doc_type: "supplier_concentration", seller_slug: d.seller_slug },
            replacement: d,
            upsert:      true,
          },
        }
      }
    })
    await col.bulkWrite(ops, { ordered: false })
  }

  const buyerDocs_   = allDocs.filter(d => d.doc_type === "contract_concentration" && (d as ContractConcentration).entity_type === "buyer").length
  const ministryDocs = allDocs.filter(d => d.doc_type === "contract_concentration" && (d as ContractConcentration).entity_type === "ministry").length
  const stateDocs    = allDocs.filter(d => d.doc_type === "contract_concentration" && (d as ContractConcentration).entity_type === "state").length
  const supplierDocs = allDocs.filter(d => d.doc_type === "supplier_concentration").length

  const buyerConcDocs    = allDocs.filter((d): d is ContractConcentration => d.doc_type === "contract_concentration" && d.entity_type === "buyer")
  const ministryConcDocs = allDocs.filter((d): d is ContractConcentration => d.doc_type === "contract_concentration" && d.entity_type === "ministry")
  const stateConcDocs    = allDocs.filter((d): d is ContractConcentration => d.doc_type === "contract_concentration" && d.entity_type === "state")

  return {
    buyer_docs:    buyerDocs_,
    ministry_docs: ministryDocs,
    state_docs:    stateDocs,
    supplier_docs: supplierDocs,
    duration_ms:   Date.now() - start,
    as_of:         now,
    stats: {
      monopoly_buyers:      buyerConcDocs.filter(d => d.concentration_label === "monopoly").length,
      monopoly_ministries:  ministryConcDocs.filter(d => d.concentration_label === "monopoly").length,
      monopoly_states:      stateConcDocs.filter(d => d.concentration_label === "monopoly").length,
      high_conc_buyers:     buyerConcDocs.filter(d => d.concentration_label === "high").length,
      fogging_buyers:       buyerConcDocs.filter(d => d.has_fogging_activity).length,
      fogging_states:       stateConcDocs.filter(d => d.has_fogging_activity).length,
      critical_priority:    buyerConcDocs.filter(d => d.acquisition_priority === "critical").length,
      high_priority:        buyerConcDocs.filter(d => d.acquisition_priority === "high").length,
    },
  }
}

export async function ensureConcentrationIndexes(db: Db): Promise<void> {
  const col = db.collection("contract_analytics")
  try {
    await Promise.all([
      col.createIndex(
        { doc_type: 1, entity_type: 1, entity_key: 1 },
        { unique: true, name: "conc_entity_key_unique", partialFilterExpression: { doc_type: "contract_concentration" } },
      ),
      col.createIndex(
        { doc_type: 1, entity_type: 1, hhi: -1 },
        { name: "conc_hhi_desc" },
      ),
      col.createIndex(
        { doc_type: 1, entity_type: 1, has_fogging_activity: 1, hhi: -1 },
        { name: "conc_fogging_hhi", sparse: true },
      ),
      col.createIndex(
        { doc_type: 1, seller_slug: 1 },
        { unique: true, name: "supp_conc_seller_unique", partialFilterExpression: { doc_type: "supplier_concentration" } },
      ),
      col.createIndex(
        { doc_type: 1, hhi: -1 },
        { name: "supp_conc_hhi_desc", partialFilterExpression: { doc_type: "supplier_concentration" } },
      ),
    ])
  } catch { /* existing indexes OK */ }
}

// ─── Public: incremental refresh ─────────────────────────────────────────────

export async function buildIncrementalBuyerSellerPairs(db: Db): Promise<PairBuildResult> {
  const start = Date.now()
  const meta  = await readPairMeta(db)
  const since = meta.last_incremental_at ?? meta.last_full_build_at

  if (!since) return buildAllBuyerSellerPairs(db)

  // Contracts added since last build
  const newContracts = await db.collection("gem_contracts")
    .find(
      { first_seen: { $gt: since }, seller_gst: { $nin: [null, ""] } },
      { projection: { seller_gst: 1, _id: 0 } },
    )
    .toArray()

  if (!newContracts.length) {
    return {
      pairs_built: 0, pairs_written: 0,
      duration_ms: Date.now() - start, as_of: new Date(),
      is_incremental: true, contracts_processed: 0,
      stats: { anchor_pairs: 0, regular_pairs: 0, occasional_pairs: 0,
               exclusive_pairs: 0, repeat_pairs: 0, fogging_pairs: 0,
               unique_buyers: 0, unique_sellers: 0 },
    }
  }

  const affectedGSTINs = [...new Set(newContracts.map(c => c.seller_gst as string))]

  const [rawRows, buyerMap, sellerMap] = await Promise.all([
    fetchRawPairs(db, affectedGSTINs),
    buildBuyerMap(db),
    buildSellerMap(db),
  ])

  const now   = new Date()
  const pairs: BuyerSellerPair[] = []
  for (const row of rawRows) {
    const pair = buildPair(row, buyerMap, sellerMap, now)
    if (pair) pairs.push(pair)
  }

  if (pairs.length > 0) {
    const ops = pairs.map(p => ({
      replaceOne: {
        filter:      { doc_type: "buyer_seller_pair", pair_key: p.pair_key },
        replacement: p,
        upsert:      true,
      },
    }))
    await db.collection("contract_analytics").bulkWrite(ops, { ordered: false })
  }

  const durationMs = Date.now() - start
  const totalPairs = await db.collection("contract_analytics")
    .countDocuments({ doc_type: "buyer_seller_pair" })

  await writePairMeta(db, {
    last_incremental_at: now,
    total_pairs:         totalPairs,
    build_duration_ms:   durationMs,
  })

  return {
    pairs_built:         pairs.length,
    pairs_written:       pairs.length,
    duration_ms:         durationMs,
    as_of:               now,
    is_incremental:      true,
    contracts_processed: newContracts.length,
    stats:               summarisePairs(pairs),
  }
}
