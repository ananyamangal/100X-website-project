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
      { unique: true, name: "pair_key_unique" },
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
