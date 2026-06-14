import type { Db } from "mongodb"

// ─── Public types ─────────────────────────────────────────────────────────────

export interface SellerProfile {
  // Identity
  seller_key:           string
  seller_slug:          string
  seller_name:          string
  seller_name_variants: string[]

  // Government identifiers
  seller_pan:              string | null
  seller_gstin:            string | null   // representative GSTIN
  seller_gstin_set:        string[]        // all validated GSTINs
  seller_gstin_invalid:    string[]        // GSTINs that failed validation
  seller_gem_id:           string | null
  seller_msme_number:      string | null
  seller_msme_category:    "micro" | "small" | "medium" | null
  seller_msme:             boolean | null

  // Location
  seller_state:        string | null
  seller_states:       string[]   // states seller actively sells to (buyer dept states)
  seller_gstin_states: string[]   // states from GSTIN prefix codes

  seller_address: string | null

  // Contract metrics
  contract_count:              number
  total_gmv:                   number
  avg_contract_value:          number | null
  max_contract_value:          number | null
  first_contract_date:         string | null
  last_contract_date:          string | null
  avg_days_between_contracts:  number | null
  revenue_per_year:            number | null

  // Buyer relationships
  buyer_count:        number
  state_count:        number
  department_count:   number
  top_buyer:          string | null
  top_buyer_share_pct: number | null
  repeat_buyer_pct:   number | null

  // Product intelligence
  product_count:         number
  top_product:           string | null
  top_product_share_pct: number | null
  categories:            string[]
  category_count:        number

  // OEM intelligence
  oem_brands: string[]
  oem_names:  string[]

  // Business flags (default false)
  supplies_fogging_products: boolean
  competes_with_100x:        boolean
  is_100x_supplier:          boolean

  // Identity quality
  seller_identity_confidence: "high" | "medium" | "low"
  seller_identity_method:     | "gstin"
                              | "gstin_pan_grouped"
                              | "gem_id"
                              | "gem_id_gstin_confirmed"
                              | "canonical_name"
                              | "needs_review"
  needs_review:              boolean
  merge_candidates:          string[]
  identity_conflicts:        string[]
  gstin_count:               number
  gstin_validation_failures: number

  // Archive coverage
  archive_contract_count: number
  archive_coverage_pct:   number

  // Tier & audit
  seller_tier:          "A" | "B" | "C" | "D"
  updated_at:           Date
  source_contract_count: number
}

export interface SellerBuildResult {
  profiles_built:            number
  profiles_written:          number
  duration_ms:               number
  as_of:                     Date
  is_incremental:            boolean
  contracts_processed:       number
  validation: {
    gstin_seen:                number
    gstin_valid:               number
    gstin_invalid:             number
    pan_groups_formed:         number
    multi_gstin_sellers:       number
    level_1_count:             number
    level_2_count:             number
    level_3_count:             number
    needs_review_count:        number
    merge_candidates_count:    number
    identity_conflicts_total:  number
    fogging_suppliers:         number
  }
}

// ─── Internal aggregation row ─────────────────────────────────────────────────

interface RawRow {
  total_gmv:     number
  enriched_count: number
  max_value:     number | null
  first_date:    unknown
  last_date:     unknown
  gem_ids:       (string | null)[]
  names:         (string | null)[]
  buyer_names:   (string | null)[]  // one per contract (for repeat calc)
  buyer_gmv:     { name: string | null; value: number }[]
  buyer_states:  (string | null)[]
  products:      { name: string | null; value: number }[]
  oem_brands:    (string | null)[]
  oem_names_raw: (string | null)[]
  seller_state:  string | null
  msme_cat:      string | null
  msme:          boolean | null
  msme_number:   string | null
  address:       string | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SELLER_META_SLUG = "__meta__"
export { SELLER_META_SLUG }

const GSTIN_CHARSET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"

const GSTIN_STATE_MAP: Record<string, string> = {
  "01": "Jammu & Kashmir",   "02": "Himachal Pradesh", "03": "Punjab",
  "04": "Chandigarh",        "05": "Uttarakhand",      "06": "Haryana",
  "07": "Delhi",             "08": "Rajasthan",        "09": "Uttar Pradesh",
  "10": "Bihar",             "11": "Sikkim",           "12": "Arunachal Pradesh",
  "13": "Nagaland",          "14": "Manipur",          "15": "Mizoram",
  "16": "Tripura",           "17": "Meghalaya",        "18": "Assam",
  "19": "West Bengal",       "20": "Jharkhand",        "21": "Odisha",
  "22": "Chhattisgarh",      "23": "Madhya Pradesh",   "24": "Gujarat",
  "25": "Daman & Diu",       "26": "Dadra & NH",       "27": "Maharashtra",
  "28": "Andhra Pradesh (old)", "29": "Karnataka",     "30": "Goa",
  "31": "Lakshadweep",       "32": "Kerala",           "33": "Tamil Nadu",
  "34": "Puducherry",        "35": "Andaman & Nicobar","36": "Telangana",
  "37": "Andhra Pradesh",    "38": "Ladakh",
  "97": "Other Territory",   "99": "Centre Jurisdiction",
}

const VALID_STATE_CODES = new Set(Object.keys(GSTIN_STATE_MAP))

const ENTITY_SUFFIX_REPLACEMENTS: [RegExp, string][] = [
  [/\bPRIVATE\s+LIMITED\b/g,       "PRIVATE LIMITED"],
  [/\bPVT\.?\s+LTD\.?\b/g,         "PRIVATE LIMITED"],
  [/\bPVT\.?\s+LIMITED\b/g,         "PRIVATE LIMITED"],
  [/\bPRIVATE\s+LTD\.?\b/g,         "PRIVATE LIMITED"],
  [/\bLTD\.?\b/g,                   "LIMITED"],
  [/\bLIMITED\s+LIABILITY\s+PARTNERSHIP\b/g, "LLP"],
  [/\bONE\s+PERSON\s+COMPANY\b/g,  "OPC"],
  [/\bENTERPRISES?\b/g,             "ENTERPRISES"],
  [/\bINDUSTRIES?\b/g,              "INDUSTRIES"],
  [/\bTRADERS?\b/g,                 "TRADERS"],
  [/\bSUPPLIERS?\b/g,               "SUPPLIERS"],
  [/\bMANUFACTURERS?\b/g,           "MANUFACTURERS"],
  [/\bCOMPANIES\b/g,                "COMPANY"],
]

const SELLER_ABBREV_MAP: [RegExp, string][] = [
  [/\bGOVT\.?\b/g,   "GOVERNMENT"],
  [/\bDEPT\.?\b/g,   "DEPARTMENT"],
  [/\bDIST\.?\b/g,   "DISTRICT"],
  [/\bCORP\.?\b/g,   "CORPORATION"],
  [/\bINTL\.?\b/g,   "INTERNATIONAL"],
  [/\bMFRS\.?\b/g,   "MANUFACTURERS"],
  [/\bMFG\.?\b/g,    "MANUFACTURING"],
  [/\bTECH\.?\b/g,   "TECHNOLOGIES"],
  [/\bENGG\.?\b/g,   "ENGINEERING"],
  [/\bSOLNS?\.?\b/g, "SOLUTIONS"],
  [/\bASSO?C?\.?\b/g,"ASSOCIATES"],
  [/\bBROS\.?\b/g,   "BROTHERS"],
  [/\bINDS\.?\b/g,   "INDUSTRIES"],
]

const FOGGING_KEYWORDS = [
  "fog", "fogging", "mist", "misting", "ulv", "ultra low volume",
  "thermal fog", "vector control", "mosquito", "pest control",
  "sprayer", "spray machine", "disinfect", "sanitiz", "fumigat",
  "thermal spray", "cold fog",
]

const GEM_ID_REGEX = /^GEM-1-1-\d{8}$/

// ─── GSTIN validation ─────────────────────────────────────────────────────────

interface GSTINResult {
  valid:           boolean
  pan:             string | null
  state_code:      string | null
  state_name:      string | null
  reject_reason:   string | null
  checksum_warn:   boolean
}

function validateGSTIN(raw: string): GSTINResult {
  const gstin = raw.trim().toUpperCase().replace(/[Ol]/g, c => c === "O" ? "0" : "1")

  if (gstin.length !== 15) {
    return { valid: false, pan: null, state_code: null, state_name: null,
             reject_reason: "invalid_length", checksum_warn: false }
  }

  const stateCode = gstin.slice(0, 2)
  if (!VALID_STATE_CODES.has(stateCode)) {
    return { valid: false, pan: null, state_code: stateCode, state_name: null,
             reject_reason: "invalid_state_code", checksum_warn: false }
  }

  const pan = gstin.slice(2, 12)
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) {
    return { valid: false, pan: null, state_code: stateCode, state_name: GSTIN_STATE_MAP[stateCode] ?? null,
             reject_reason: "invalid_pan_format", checksum_warn: false }
  }

  const entityCode = gstin[12]
  if (!/^[1-9A-Z]$/.test(entityCode)) {
    return { valid: false, pan, state_code: stateCode, state_name: GSTIN_STATE_MAP[stateCode] ?? null,
             reject_reason: "invalid_entity_code", checksum_warn: false }
  }

  // Position 13 is 'Z' for regular GST registrations; allow any alphanumeric
  if (!/^[A-Z0-9]$/.test(gstin[13])) {
    return { valid: false, pan, state_code: stateCode, state_name: GSTIN_STATE_MAP[stateCode] ?? null,
             reject_reason: "invalid_register_digit", checksum_warn: false }
  }

  // Checksum (soft — logs warn but does not reject structurally valid GSTINs)
  let checksumWarn = false
  try {
    let sum = 0
    let factor = 2
    for (let i = 13; i >= 0; i--) {
      const code = GSTIN_CHARSET.indexOf(gstin[i])
      if (code < 0) throw new Error("bad_char")
      let addend = factor * code
      addend = Math.floor(addend / 36) + (addend % 36)
      sum += addend
      factor = factor === 2 ? 1 : 2
    }
    const expected = GSTIN_CHARSET[(36 - (sum % 36)) % 36]
    if (gstin[14] !== expected) checksumWarn = true
  } catch {
    checksumWarn = true
  }

  return {
    valid: true,
    pan,
    state_code: stateCode,
    state_name: GSTIN_STATE_MAP[stateCode] ?? null,
    reject_reason: null,
    checksum_warn: checksumWarn,
  }
}

function validatePAN(pan: string): boolean {
  return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan) &&
    ["P","C","H","F","A","T","B","L","J","G"].includes(pan[3])
}

// ─── Name normalization ───────────────────────────────────────────────────────

function normalizeSellerName(raw: string): string {
  let s = raw.trim().replace(/\s+/g, " ").toUpperCase()

  // Strip leading prefixes
  s = s.replace(/^(M\/S\.?\s+|M\.S\.\s+|MS\s+|SRI\s+|SHRI\s+|SMT\.\s+)/, "").trim()
  s = s.replace(/^(THE|A|AN)\s+/, "").trim()

  // Multi-word entity suffixes (order matters: most specific first)
  for (const [p, r] of ENTITY_SUFFIX_REPLACEMENTS) s = s.replace(p, r)

  // Abbreviation expansion
  for (const [p, r] of SELLER_ABBREV_MAP) s = s.replace(p, r)

  // Strip punctuation
  s = s.replace(/[.,'";\-\(\)\[\]{}&]/g, " ").replace(/\s+/g, " ").trim()

  return s
}

function toSlug(normalized: string): string {
  return normalized.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

function sellerSlugFromGemId(gemId: string): string {
  const suffix = gemId.replace("GEM-1-1-", "")
  return `gem-${suffix}`
}

// ─── Date utilities ───────────────────────────────────────────────────────────

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

// ─── Levenshtein (early-exit at threshold) ────────────────────────────────────

function levenshtein(a: string, b: string, threshold: number): number {
  if (Math.abs(a.length - b.length) > threshold) return threshold + 1
  const m = a.length, n = b.length
  const row = Array.from({ length: n + 1 }, (_, i) => i)
  for (let i = 1; i <= m; i++) {
    let prev = i
    let rowMin = prev
    for (let j = 1; j <= n; j++) {
      const val = a[i - 1] === b[j - 1]
        ? row[j - 1]
        : 1 + Math.min(row[j - 1], row[j], prev)
      row[j - 1] = prev
      prev = val
      if (val < rowMin) rowMin = val
    }
    row[n] = prev
    if (rowMin > threshold) return threshold + 1
  }
  return row[n]
}

// ─── Computation helpers ──────────────────────────────────────────────────────

function avgDaysBetween(dateMsList: (number | null)[]): number | null {
  const sorted = dateMsList.filter((t): t is number => t !== null).sort((a, b) => a - b)
  if (sorted.length < 2) return null
  const gaps: number[] = []
  for (let i = 1; i < sorted.length; i++) {
    const d = Math.round((sorted[i] - sorted[i - 1]) / 86_400_000)
    if (d >= 0) gaps.push(d)
  }
  if (!gaps.length) return null
  return Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length)
}

function revenuePerYear(count: number, firstMs: number | null, lastMs: number | null): number | null {
  if (!firstMs || !lastMs || count < 2) return null
  const spanDays = Math.round((lastMs - firstMs) / 86_400_000)
  if (spanDays < 30) return null
  return Math.round((count / (spanDays / 365)) * 10) / 10
}

function detectFogging(productNames: (string | null)[]): boolean {
  const lower = productNames.filter(Boolean).map(n => n!.toLowerCase())
  return lower.some(n => FOGGING_KEYWORDS.some(kw => n.includes(kw)))
}

// ─── MongoDB aggregations ─────────────────────────────────────────────────────

const ENRICH_PROJECT = {
  total_gmv:     { $sum:    "$contract_value_num" },
  enriched_count:{ $sum:    1                     },
  max_value:     { $max:    "$contract_value_num" },
  first_date:    { $min:    "$contract_date_dt"   },
  last_date:     { $max:    "$contract_date_dt"   },
  gem_ids:       { $addToSet: "$seller_gem_id"    },
  names:         { $addToSet: "$seller_name_canonical" },
  buyer_names:   { $push:   "$dept_name"          },
  buyer_gmv:     { $push:   { name: "$dept_name", value: "$contract_value_num" } },
  buyer_states:  { $addToSet: "$state"            },
  products:      { $push:   { name: "$product_name", value: "$contract_value_num" } },
  oem_brands:    { $addToSet: "$oem_brand"        },
  oem_names_raw: { $addToSet: "$oem_name"         },
  seller_state:  { $first:  "$seller_state"       },
  msme_cat:      { $first:  "$seller_msme_category" },
  msme:          { $first:  "$seller_msme"        },
  msme_number:   { $first:  "$seller_msme_number" },
  address:       { $first:  "$seller_address"     },
}

async function fetchByGSTIN(db: Db, gstinFilter?: string[]): Promise<Map<string, RawRow>> {
  const matchStage: Record<string, unknown> = {
    detail_scraped: true,
    seller_gst: { $nin: [null, ""] },
    contract_value_num: { $gt: 0 },
  }
  if (gstinFilter?.length) matchStage.seller_gst = { $in: gstinFilter }

  const rows = await db.collection("gem_contracts").aggregate([
    { $match: matchStage },
    { $group: { _id: "$seller_gst", ...ENRICH_PROJECT } },
  ]).toArray()

  const map = new Map<string, RawRow>()
  for (const r of rows) {
    map.set(r._id as string, r as unknown as RawRow)
  }
  return map
}

async function fetchByGemId(db: Db, gemFilter?: string[]): Promise<Map<string, RawRow>> {
  const matchStage: Record<string, unknown> = {
    detail_scraped: true,
    seller_gst: { $in: [null, ""] },
    seller_gem_id: { $nin: [null, ""] },
    contract_value_num: { $gt: 0 },
  }
  if (gemFilter?.length) matchStage.seller_gem_id = { $in: gemFilter }

  const rows = await db.collection("gem_contracts").aggregate([
    { $match: matchStage },
    { $group: { _id: "$seller_gem_id", ...ENRICH_PROJECT } },
  ]).toArray()

  const map = new Map<string, RawRow>()
  for (const r of rows) map.set(r._id as string, r as unknown as RawRow)
  return map
}

async function fetchByName(db: Db, nameFilter?: string[]): Promise<Map<string, RawRow>> {
  const matchStage: Record<string, unknown> = {
    detail_scraped: true,
    seller_gst: { $in: [null, ""] },
    seller_gem_id: { $in: [null, ""] },
    seller_name_canonical: { $nin: [null, ""] },
    contract_value_num: { $gt: 0 },
  }
  if (nameFilter?.length) matchStage.seller_name_canonical = { $in: nameFilter }

  const rows = await db.collection("gem_contracts").aggregate([
    { $match: matchStage },
    { $group: { _id: "$seller_name_canonical", ...ENRICH_PROJECT } },
  ]).toArray()

  const map = new Map<string, RawRow>()
  for (const r of rows) map.set(r._id as string, r as unknown as RawRow)
  return map
}

async function fetchAllCountBySeller(db: Db): Promise<{
  byGSTIN: Map<string, number>
  byGemId: Map<string, number>
  byName:  Map<string, number>
}> {
  const [rGSTIN, rGem, rName] = await Promise.all([
    db.collection("gem_contracts").aggregate([
      { $match: { seller_gst: { $nin: [null, ""] } } },
      { $group: { _id: "$seller_gst", count: { $sum: 1 } } },
    ]).toArray(),
    db.collection("gem_contracts").aggregate([
      { $match: { seller_gst: { $in: [null, ""] }, seller_gem_id: { $nin: [null, ""] } } },
      { $group: { _id: "$seller_gem_id", count: { $sum: 1 } } },
    ]).toArray(),
    db.collection("gem_contracts").aggregate([
      { $match: {
        seller_gst: { $in: [null, ""] },
        seller_gem_id: { $in: [null, ""] },
        seller_name_canonical: { $nin: [null, ""] },
      } },
      { $group: { _id: "$seller_name_canonical", count: { $sum: 1 } } },
    ]).toArray(),
  ])

  return {
    byGSTIN: new Map(rGSTIN.map(r => [r._id as string, r.count as number])),
    byGemId: new Map(rGem.map(r  => [r._id as string, r.count as number])),
    byName:  new Map(rName.map(r => [r._id as string, r.count as number])),
  }
}

async function fetchArchiveByGSTIN(db: Db): Promise<{ byGSTIN: Map<string, number>; byName: Map<string, number> }> {
  const [rG, rN] = await Promise.all([
    db.collection("gem_contract_archives").aggregate([
      { $match: { seller_gstin: { $nin: [null, ""] } } },
      { $group: { _id: "$seller_gstin", count: { $sum: 1 } } },
    ]).toArray(),
    db.collection("gem_contract_archives").aggregate([
      { $match: { seller_gstin: { $in: [null, ""] }, seller_name: { $nin: [null, ""] } } },
      { $group: { _id: "$seller_name", count: { $sum: 1 } } },
    ]).toArray(),
  ])
  return {
    byGSTIN: new Map(rG.map(r => [r._id as string, r.count as number])),
    byName:  new Map(rN.map(r => [r._id as string, r.count as number])),
  }
}

// ─── Profile builder from a raw row ──────────────────────────────────────────

function buildMetrics(row: RawRow, totalCount: number, archiveCount: number) {
  const firstMs = toDateMs(row.first_date)
  const lastMs  = toDateMs(row.last_date)

  // Buyer analysis
  const buyerSpend = new Map<string, number>()
  for (const b of row.buyer_gmv) {
    if (!b.name) continue
    buyerSpend.set(b.name, (buyerSpend.get(b.name) ?? 0) + (b.value ?? 0))
  }
  const buyerOrderCount = new Map<string, number>()
  for (const b of row.buyer_names) {
    if (!b) continue
    buyerOrderCount.set(b, (buyerOrderCount.get(b) ?? 0) + 1)
  }
  const buyerCount    = buyerSpend.size
  const repeatBuyers  = [...buyerOrderCount.values()].filter(c => c > 1).length
  const repeatBuyerPct = buyerCount > 0 ? Math.round((repeatBuyers / buyerCount) * 1000) / 10 : null

  const buyersSorted = [...buyerSpend.entries()].sort((a, b) => b[1] - a[1])
  const topBuyer     = buyersSorted[0]?.[0] ?? null
  const topBuyerSpend = buyersSorted[0]?.[1] ?? 0
  const topBuyerSharePct = row.total_gmv > 0
    ? Math.round((topBuyerSpend / row.total_gmv) * 1000) / 10
    : null

  const stateCount = (row.buyer_states ?? []).filter(Boolean).length

  // Product analysis
  const productSpend = new Map<string, number>()
  for (const p of row.products) {
    if (!p.name) continue
    productSpend.set(p.name, (productSpend.get(p.name) ?? 0) + (p.value ?? 0))
  }
  const productsSorted  = [...productSpend.entries()].sort((a, b) => b[1] - a[1])
  const topProduct      = productsSorted[0]?.[0] ?? null
  const topProductSpend = productsSorted[0]?.[1] ?? 0
  const topProductSharePct = row.total_gmv > 0
    ? Math.round((topProductSpend / row.total_gmv) * 1000) / 10
    : null

  // OEM
  const oemBrands = [...new Set((row.oem_brands ?? []).filter(Boolean))] as string[]
  const oemNames  = [...new Set((row.oem_names_raw ?? []).filter(Boolean))] as string[]

  // Business flags
  const productNames = row.products.map(p => p.name)
  const supplyFogging = detectFogging(productNames)

  // Temporal
  const contractDates = row.products.map(() => null) // placeholder — dates not in products
  const avgDays = avgDaysBetween(
    // Use first_date and last_date as bookends for a rough cadence estimate
    [firstMs, lastMs]
  )
  const rvpYear = revenuePerYear(row.enriched_count, firstMs, lastMs)

  // Archive
  const archiveCoveragePct = totalCount > 0
    ? Math.round((archiveCount / totalCount) * 1000) / 10
    : 0

  return {
    total_gmv:              row.total_gmv,
    avg_contract_value:     row.enriched_count > 0 ? Math.round(row.total_gmv / row.enriched_count) : null,
    max_contract_value:     (row.max_value as number | null) ?? null,
    first_contract_date:    toIsoDate(row.first_date),
    last_contract_date:     toIsoDate(row.last_date),
    avg_days_between_contracts: row.enriched_count > 1 ? avgDays : null,
    revenue_per_year:       rvpYear,
    buyer_count:            buyerCount,
    state_count:            stateCount,
    department_count:       buyerCount,
    top_buyer:              topBuyer,
    top_buyer_share_pct:    topBuyerSharePct,
    repeat_buyer_pct:       repeatBuyerPct,
    product_count:          productSpend.size,
    top_product:            topProduct,
    top_product_share_pct:  topProductSharePct,
    categories:             [],
    category_count:         0,
    oem_brands:             oemBrands,
    oem_names:              oemNames,
    supplies_fogging_products: supplyFogging,
    competes_with_100x:        supplyFogging,
    is_100x_supplier:          false,
    seller_states:          (row.buyer_states ?? []).filter(Boolean) as string[],
    archive_contract_count: archiveCount,
    archive_coverage_pct:   archiveCoveragePct,
    source_contract_count:  row.enriched_count,
    contract_count:         totalCount,
  }
}

// ─── Phase: Build Level 1 profiles (GSTIN → PAN grouped) ─────────────────────

function buildLevel1Profiles(
  gstinMap:     Map<string, RawRow>,
  countByGSTIN: Map<string, number>,
  archiveByGSTIN: Map<string, number>,
  archiveByName:  Map<string, number>,
  now: Date,
): { profiles: SellerProfile[]; panMap: Map<string, SellerProfile>; validGSTINs: number; invalidGSTINs: string[] } {
  // Group GSTINs by PAN
  const panToGSTINs = new Map<string, string[]>()
  const validGSTINs: string[] = []
  const invalidGSTINs: string[] = []
  const gstinResults = new Map<string, ReturnType<typeof validateGSTIN>>()

  for (const gstin of gstinMap.keys()) {
    const result = validateGSTIN(gstin)
    gstinResults.set(gstin, result)
    if (result.valid && result.pan && validatePAN(result.pan)) {
      validGSTINs.push(gstin)
      const existing = panToGSTINs.get(result.pan) ?? []
      panToGSTINs.set(result.pan, [...existing, gstin])
    } else {
      invalidGSTINs.push(gstin)
    }
  }

  const profiles: SellerProfile[] = []
  const panMap = new Map<string, SellerProfile>()

  for (const [pan, gstins] of panToGSTINs) {
    const conflicts: string[] = []
    const allGemIds = new Set<string>()
    const allNames  = new Set<string>()
    let totalGMV    = 0
    let enrichedCount = 0
    let maxValue: number | null = null
    let firstDate: unknown = null
    let lastDate:  unknown = null
    let sellerState: string | null = null
    let msmeCat: string | null  = null
    let msme: boolean | null    = null
    let msmeNumber: string | null = null
    let address: string | null  = null
    const buyerNames: (string | null)[]  = []
    const buyerGmv:   { name: string | null; value: number }[] = []
    const buyerStates: (string | null)[] = []
    const products:   { name: string | null; value: number }[] = []
    const oemBrandsRaw: (string | null)[] = []
    const oemNamesRaw:  (string | null)[] = []

    // Merge all GSTIN rows for this PAN
    for (const gstin of gstins) {
      const row = gstinMap.get(gstin)
      if (!row) continue
      const r = gstinResults.get(gstin)!

      if (r.checksum_warn) {
        conflicts.push(`checksum_warn: ${gstin}`)
      }

      totalGMV      += row.total_gmv
      enrichedCount += row.enriched_count
      if (row.max_value !== null && row.max_value !== undefined) {
        maxValue = maxValue === null ? (row.max_value as number) : Math.max(maxValue, row.max_value as number)
      }

      const fd = toDateMs(row.first_date)
      const ld = toDateMs(row.last_date)
      if (fd !== null) firstDate = !firstDate ? row.first_date : (fd < toDateMs(firstDate)! ? row.first_date : firstDate)
      if (ld !== null) lastDate  = !lastDate  ? row.last_date  : (ld > toDateMs(lastDate)!  ? row.last_date  : lastDate)

      if (!sellerState && row.seller_state) sellerState = row.seller_state
      if (!msmeCat    && row.msme_cat)     msmeCat     = row.msme_cat
      if (msme === null && row.msme !== null) msme      = row.msme as boolean
      if (!msmeNumber && row.msme_number)  msmeNumber  = row.msme_number
      if (!address    && row.address)      address     = row.address

      for (const id of row.gem_ids)      { if (id) allGemIds.add(id) }
      for (const n of row.names)         { if (n)  allNames.add(n) }
      buyerNames.push(...row.buyer_names)
      buyerGmv.push(...row.buyer_gmv)
      buyerStates.push(...(row.buyer_states ?? []))
      products.push(...row.products)
      oemBrandsRaw.push(...(row.oem_brands ?? []))
      oemNamesRaw.push(...(row.oem_names_raw ?? []))
    }

    // Check for entity code mismatch across GSTINs
    const entityCodes = [...new Set(gstins.map(g => g[12]))]
    if (entityCodes.length > 1) {
      conflicts.push(`pan_entity_code_mismatch: ${entityCodes.join(" vs ")}`)
    }

    // Canonical name = highest frequency across all name variants
    const nameCounts = new Map<string, number>()
    for (const b of buyerNames) { /* not names */ }
    for (const n of allNames) nameCounts.set(n, 1) // all equally seen in $addToSet
    const canonicalName = [...allNames][0] ?? pan

    // Total contract count across all GSTINs
    const totalCount = gstins.reduce((sum, g) => sum + (countByGSTIN.get(g) ?? 0), 0)

    // Archive coverage across all GSTINs
    const archiveCount = gstins.reduce((sum, g) => sum + (archiveByGSTIN.get(g) ?? 0), 0)

    // Primary GSTIN (highest contract count)
    const primaryGSTIN = gstins.sort((a, b) => (countByGSTIN.get(b) ?? 0) - (countByGSTIN.get(a) ?? 0))[0]
    const primaryResult = gstinResults.get(primaryGSTIN)!

    // Build seller_slug
    const normalizedName = normalizeSellerName(canonicalName)
    const slug = toSlug(normalizedName) || `pan-${pan.toLowerCase()}`

    // Confidence
    const isMultiGSTIN = gstins.length > 1
    const gemIdList    = [...allGemIds].filter(Boolean)
    let confidence: SellerProfile["seller_identity_confidence"] = "high"
    let method: SellerProfile["seller_identity_method"]         = isMultiGSTIN ? "gstin_pan_grouped" : "gstin"
    let needsReview = false

    if (gstins.length > 5) { needsReview = true }
    if (conflicts.some(c => c.startsWith("pan_entity_code_mismatch"))) {
      confidence  = "medium"
      needsReview = true
    }

    // GSTIN states
    const gstinStates = gstins
      .map(g => GSTIN_STATE_MAP[g.slice(0, 2)] ?? null)
      .filter(Boolean) as string[]

    const mergedRow: RawRow = {
      total_gmv: totalGMV, enriched_count: enrichedCount,
      max_value: maxValue, first_date: firstDate, last_date: lastDate,
      gem_ids: [...allGemIds], names: [...allNames],
      buyer_names: buyerNames, buyer_gmv: buyerGmv, buyer_states: buyerStates,
      products, oem_brands: oemBrandsRaw, oem_names_raw: oemNamesRaw,
      seller_state: sellerState, msme_cat: msmeCat, msme, msme_number: msmeNumber,
      address,
    }

    const metrics = buildMetrics(mergedRow, totalCount, archiveCount)

    const profile: SellerProfile = {
      seller_key:           pan,
      seller_slug:          slug,
      seller_name:          canonicalName,
      seller_name_variants: [...allNames].filter(Boolean) as string[],
      seller_pan:           pan,
      seller_gstin:         primaryGSTIN,
      seller_gstin_set:     gstins,
      seller_gstin_invalid: [],
      seller_gem_id:        gemIdList[0] ?? null,
      seller_msme_number:   msmeNumber,
      seller_msme_category: msmeCat as "micro" | "small" | "medium" | null,
      seller_msme:          msme,
      seller_state:         sellerState,
      seller_gstin_states:  [...new Set(gstinStates)],
      seller_address:       address,
      seller_identity_confidence: confidence,
      seller_identity_method:     method,
      needs_review:               needsReview,
      merge_candidates:           [],
      identity_conflicts:         conflicts,
      gstin_count:                gstins.length,
      gstin_validation_failures:  0,
      seller_tier:  "D",
      updated_at:   now,
      ...metrics,
    }

    profiles.push(profile)
    panMap.set(pan, profile)
  }

  return { profiles, panMap, validGSTINs: validGSTINs.length, invalidGSTINs }
}

// ─── Phase: Build Level 2 profiles (GeM ID) ──────────────────────────────────

function buildLevel2Profiles(
  gemMap:      Map<string, RawRow>,
  panMap:      Map<string, SellerProfile>,
  countByGemId: Map<string, number>,
  archiveByName: Map<string, number>,
  now: Date,
): SellerProfile[] {
  const profiles: SellerProfile[] = []

  for (const [gemId, row] of gemMap) {
    if (!GEM_ID_REGEX.test(gemId)) continue

    // Check if already absorbed into a Level 1 profile
    const alreadyCovered = [...panMap.values()].some(p => p.seller_gem_id === gemId)
    if (alreadyCovered) continue

    const names       = (row.names ?? []).filter(Boolean) as string[]
    const canonicalName = names[0] ?? gemId
    const slug = sellerSlugFromGemId(gemId)
    const totalCount  = countByGemId.get(gemId) ?? row.enriched_count
    const archiveCount = archiveByName.get(canonicalName) ?? 0
    const metrics = buildMetrics(row, totalCount, archiveCount)

    const profile: SellerProfile = {
      seller_key:           gemId,
      seller_slug:          slug,
      seller_name:          canonicalName,
      seller_name_variants: names,
      seller_pan:           null,
      seller_gstin:         null,
      seller_gstin_set:     [],
      seller_gstin_invalid: [],
      seller_gem_id:        gemId,
      seller_msme_number:   row.msme_number,
      seller_msme_category: row.msme_cat as "micro" | "small" | "medium" | null,
      seller_msme:          row.msme as boolean | null,
      seller_state:         row.seller_state,
      seller_gstin_states:  [],
      seller_address:       row.address,
      seller_identity_confidence: "medium",
      seller_identity_method:     "gem_id",
      needs_review:         false,
      merge_candidates:     [],
      identity_conflicts:   [],
      gstin_count:          0,
      gstin_validation_failures: 0,
      seller_tier:  "D",
      updated_at:   now,
      ...metrics,
    }

    profiles.push(profile)
  }

  return profiles
}

// ─── Phase: Build Level 3 profiles (canonical name) ──────────────────────────

function buildLevel3Profiles(
  nameMap:      Map<string, RawRow>,
  existingSlugs: Set<string>,
  countByName:  Map<string, number>,
  archiveByName: Map<string, number>,
  now: Date,
): SellerProfile[] {
  // Group raw names by normalized slug
  const slugGroups = new Map<string, { names: string[]; rows: RawRow[] }>()

  for (const [name, row] of nameMap) {
    const normalized = normalizeSellerName(name)
    const slug = toSlug(normalized)
    if (!slug) continue
    if (existingSlugs.has(slug)) continue  // already covered by L1/L2

    if (!slugGroups.has(slug)) slugGroups.set(slug, { names: [], rows: [] })
    const g = slugGroups.get(slug)!
    g.names.push(name)
    g.rows.push(row)
  }

  const profiles: SellerProfile[] = []

  for (const [slug, { names, rows }] of slugGroups) {
    // Merge rows
    let totalGMV = 0, enrichedCount = 0
    let maxValue: number | null = null
    let firstDate: unknown = null, lastDate: unknown = null
    let sellerState: string | null = null
    let msmeCat: string | null = null, msme: boolean | null = null
    let msmeNumber: string | null = null, address: string | null = null
    const allGemIds = new Set<string>()
    const allNames  = new Set<string>(names)
    const buyerNames: (string | null)[] = []
    const buyerGmv: { name: string | null; value: number }[] = []
    const buyerStates: (string | null)[] = []
    const products: { name: string | null; value: number }[] = []
    const oemBrands: (string | null)[] = []
    const oemNamesRaw: (string | null)[] = []

    for (const row of rows) {
      totalGMV      += row.total_gmv
      enrichedCount += row.enriched_count
      if ((row.max_value as number | null) !== null) {
        maxValue = maxValue === null ? (row.max_value as number) : Math.max(maxValue, row.max_value as number)
      }
      const fd = toDateMs(row.first_date), ld = toDateMs(row.last_date)
      if (fd !== null) firstDate = !firstDate ? row.first_date : (fd < toDateMs(firstDate)! ? row.first_date : firstDate)
      if (ld !== null) lastDate  = !lastDate  ? row.last_date  : (ld > toDateMs(lastDate)!  ? row.last_date  : lastDate)
      if (!sellerState && row.seller_state) sellerState = row.seller_state
      if (!msmeCat && row.msme_cat)         msmeCat = row.msme_cat
      if (msme === null && row.msme !== null) msme   = row.msme as boolean
      if (!msmeNumber && row.msme_number)   msmeNumber = row.msme_number
      if (!address && row.address)          address   = row.address
      for (const id of (row.gem_ids ?? [])) { if (id) allGemIds.add(id) }
      for (const n  of (row.names ?? []))   { if (n)  allNames.add(n) }
      buyerNames.push(...row.buyer_names)
      buyerGmv.push(...row.buyer_gmv)
      buyerStates.push(...(row.buyer_states ?? []))
      products.push(...row.products)
      oemBrands.push(...(row.oem_brands ?? []))
      oemNamesRaw.push(...(row.oem_names_raw ?? []))
    }

    const totalCount = names.reduce((s, n) => s + (countByName.get(n) ?? 0), 0)
    const archiveCount = names.reduce((s, n) => s + (archiveByName.get(n) ?? 0), 0)
    const variantCount = allNames.size

    let confidence: SellerProfile["seller_identity_confidence"] = "medium"
    let needsReview = false
    if (variantCount > 8) { confidence = "low"; needsReview = true }
    else if (!sellerState && !msmeCat) confidence = "low"

    const canonicalName = names[0]
    const mergedRow: RawRow = {
      total_gmv: totalGMV, enriched_count: enrichedCount,
      max_value: maxValue, first_date: firstDate, last_date: lastDate,
      gem_ids: [...allGemIds], names: [...allNames],
      buyer_names: buyerNames, buyer_gmv: buyerGmv, buyer_states: buyerStates,
      products, oem_brands: oemBrands, oem_names_raw: oemNamesRaw,
      seller_state: sellerState, msme_cat: msmeCat, msme, msme_number: msmeNumber, address,
    }
    const metrics = buildMetrics(mergedRow, totalCount, archiveCount)

    profiles.push({
      seller_key:           slug,
      seller_slug:          slug,
      seller_name:          canonicalName,
      seller_name_variants: [...allNames].filter(Boolean) as string[],
      seller_pan:           null,
      seller_gstin:         null,
      seller_gstin_set:     [],
      seller_gstin_invalid: [],
      seller_gem_id:        [...allGemIds][0] ?? null,
      seller_msme_number:   msmeNumber,
      seller_msme_category: msmeCat as "micro" | "small" | "medium" | null,
      seller_msme:          msme,
      seller_state:         sellerState,
      seller_gstin_states:  [],
      seller_address:       address,
      seller_identity_confidence: confidence,
      seller_identity_method:     "canonical_name",
      needs_review:         needsReview,
      merge_candidates:     [],
      identity_conflicts:   [],
      gstin_count:          0,
      gstin_validation_failures: 0,
      seller_tier: "D",
      updated_at:  now,
      ...metrics,
    })
  }

  return profiles
}

// ─── Phase: Alias match pass (Levenshtein ≤ 2, same state) ───────────────────

function runAliasPass(l3Profiles: SellerProfile[]): void {
  const THRESHOLD = 2
  for (let i = 0; i < l3Profiles.length; i++) {
    for (let j = i + 1; j < l3Profiles.length; j++) {
      const a = l3Profiles[i], b = l3Profiles[j]
      if (a.seller_state !== b.seller_state) continue
      const dist = levenshtein(a.seller_slug, b.seller_slug, THRESHOLD)
      if (dist <= THRESHOLD) {
        if (!a.merge_candidates.includes(b.seller_slug)) a.merge_candidates.push(b.seller_slug)
        if (!b.merge_candidates.includes(a.seller_slug)) b.merge_candidates.push(a.seller_slug)
      }
    }
  }
}

// ─── Phase: Tier assignment ───────────────────────────────────────────────────

function assignSellerTiers(profiles: SellerProfile[]): void {
  const multi  = profiles.filter(p => p.contract_count > 1)
  const single = profiles.filter(p => p.contract_count <= 1)
  multi.sort((a, b) => b.total_gmv - a.total_gmv)
  const n = multi.length
  const tierAEnd = Math.max(1, Math.floor(n * 0.10))
  const tierBEnd = tierAEnd + Math.max(1, Math.floor(n * 0.20))
  multi.forEach((p, i) => { p.seller_tier = i < tierAEnd ? "A" : i < tierBEnd ? "B" : "C" })
  single.forEach(p => { p.seller_tier = "D" })
}

export async function reassignAllSellerTiers(db: Db): Promise<void> {
  const all = await db.collection("seller_profiles")
    .find({ seller_slug: { $ne: SELLER_META_SLUG } })
    .project({ seller_slug: 1, contract_count: 1, total_gmv: 1 })
    .toArray() as { seller_slug: string; contract_count: number; total_gmv: number }[]

  const multi  = all.filter(p => p.contract_count > 1).sort((a, b) => b.total_gmv - a.total_gmv)
  const single = all.filter(p => p.contract_count <= 1)
  const n = multi.length
  const tierAEnd = Math.max(1, Math.floor(n * 0.10))
  const tierBEnd = tierAEnd + Math.max(1, Math.floor(n * 0.20))

  const ops = [
    ...multi.map((p, i) => ({
      updateOne: {
        filter: { seller_slug: p.seller_slug },
        update: { $set: { seller_tier: i < tierAEnd ? "A" : i < tierBEnd ? "B" : "C" } },
      },
    })),
    ...single.map(p => ({
      updateOne: { filter: { seller_slug: p.seller_slug }, update: { $set: { seller_tier: "D" } } },
    })),
  ]
  if (ops.length) await db.collection("seller_profiles").bulkWrite(ops, { ordered: false })
}

// ─── Indexes ──────────────────────────────────────────────────────────────────

export async function ensureSellerProfileIndexes(db: Db): Promise<void> {
  const col = db.collection("seller_profiles")
  await Promise.all([
    col.createIndex({ seller_slug:     1 }, { unique: true,  name: "seller_slug_unique"  }),
    col.createIndex({ seller_gstin:    1 }, { sparse: true,  name: "seller_gstin"         }),
    col.createIndex({ seller_pan:      1 }, { sparse: true,  name: "seller_pan"           }),
    col.createIndex({ seller_gem_id:   1 }, { sparse: true,  name: "seller_gem_id"        }),
    col.createIndex({ seller_tier: 1, total_gmv: -1 },         { name: "tier_gmv"         }),
    col.createIndex({ seller_state: 1, total_gmv: -1 },        { name: "state_gmv"        }),
    col.createIndex({ seller_msme_category: 1, total_gmv: -1 },{ name: "msme_gmv", sparse: true }),
    col.createIndex({ needs_review: 1 },              { sparse: true,  name: "needs_review"     }),
    col.createIndex({ last_contract_date: -1 },                { name: "last_date_desc"    }),
    col.createIndex({ supplies_fogging_products: 1 }, { sparse: true,  name: "fogging_flag"     }),
    col.createIndex(
      { seller_name: "text", seller_name_variants: "text" },
      { name: "seller_name_text" }
    ),
  ])
}

// ─── Meta document ────────────────────────────────────────────────────────────

async function readSellerMeta(db: Db) {
  const doc = await db.collection("seller_profiles").findOne({ seller_slug: SELLER_META_SLUG }) as Record<string, unknown> | null
  return {
    last_full_build_at:  (doc?.last_full_build_at  as Date | null) ?? null,
    last_incremental_at: (doc?.last_incremental_at as Date | null) ?? null,
  }
}

async function writeSellerMeta(db: Db, patch: {
  last_full_build_at?:  Date
  last_incremental_at?: Date
  total_profiles:       number
  build_duration_ms:    number
}): Promise<void> {
  await db.collection("seller_profiles").updateOne(
    { seller_slug: SELLER_META_SLUG },
    { $set: { seller_slug: SELLER_META_SLUG, ...patch, updated_at: new Date() } },
    { upsert: true },
  )
}

// ─── Public: full rebuild ─────────────────────────────────────────────────────

export async function buildAllSellerProfiles(db: Db): Promise<SellerBuildResult> {
  const start = Date.now()
  await ensureSellerProfileIndexes(db)

  const [gstinMap, gemMap, nameMap, counts, archive] = await Promise.all([
    fetchByGSTIN(db),
    fetchByGemId(db),
    fetchByName(db),
    fetchAllCountBySeller(db),
    fetchArchiveByGSTIN(db),
  ])

  const now = new Date()

  // Level 1 — GSTIN / PAN-grouped
  const { profiles: l1, panMap, validGSTINs, invalidGSTINs } =
    buildLevel1Profiles(gstinMap, counts.byGSTIN, archive.byGSTIN, archive.byName, now)

  // Collect invalid GSTINs onto the profile that "claimed" them — mark globally
  // (invalid GSTINs don't produce profiles; they're just logged in the validation report)

  // Level 2 — GeM ID
  const l2 = buildLevel2Profiles(gemMap, panMap, counts.byGemId, archive.byName, now)

  // Level 3 — Canonical name
  const existingSlugs = new Set([...l1.map(p => p.seller_slug), ...l2.map(p => p.seller_slug)])
  const l3 = buildLevel3Profiles(nameMap, existingSlugs, counts.byName, archive.byName, now)

  // Alias pass (L3 only)
  runAliasPass(l3)

  const allProfiles = [...l1, ...l2, ...l3]
  assignSellerTiers(allProfiles)

  if (allProfiles.length > 0) {
    const ops = allProfiles.map(p => ({
      replaceOne: { filter: { seller_slug: p.seller_slug }, replacement: p, upsert: true },
    }))
    await db.collection("seller_profiles").bulkWrite(ops, { ordered: false })
  }

  const durationMs = Date.now() - start
  await writeSellerMeta(db, {
    last_full_build_at: now,
    total_profiles:     allProfiles.length,
    build_duration_ms:  durationMs,
  })

  const foggingCount = allProfiles.filter(p => p.supplies_fogging_products).length

  return {
    profiles_built:      allProfiles.length,
    profiles_written:    allProfiles.length,
    duration_ms:         durationMs,
    as_of:               now,
    is_incremental:      false,
    contracts_processed: [...gstinMap.values()].reduce((s, r) => s + r.enriched_count, 0)
                       + [...gemMap.values()].reduce((s, r) => s + r.enriched_count, 0)
                       + [...nameMap.values()].reduce((s, r) => s + r.enriched_count, 0),
    validation: {
      gstin_seen:               gstinMap.size,
      gstin_valid:              validGSTINs,
      gstin_invalid:            invalidGSTINs.length,
      pan_groups_formed:        panMap.size,
      multi_gstin_sellers:      l1.filter(p => p.gstin_count > 1).length,
      level_1_count:            l1.length,
      level_2_count:            l2.length,
      level_3_count:            l3.length,
      needs_review_count:       allProfiles.filter(p => p.needs_review).length,
      merge_candidates_count:   allProfiles.filter(p => p.merge_candidates.length > 0).length,
      identity_conflicts_total: allProfiles.reduce((s, p) => s + p.identity_conflicts.length, 0),
      fogging_suppliers:        foggingCount,
    },
  }
}

// ─── Public: incremental refresh ─────────────────────────────────────────────

export async function buildIncrementalSellerProfiles(db: Db): Promise<SellerBuildResult> {
  const start = Date.now()
  const meta  = await readSellerMeta(db)
  const since = meta.last_incremental_at ?? meta.last_full_build_at

  if (!since) return buildAllSellerProfiles(db)

  // Find contracts added since last run
  const newContracts = await db.collection("gem_contracts")
    .find({ first_seen: { $gt: since } })
    .project({ seller_gst: 1, seller_gem_id: 1, seller_name_canonical: 1, _id: 0 })
    .toArray()

  if (!newContracts.length) {
    return {
      profiles_built: 0, profiles_written: 0,
      duration_ms: Date.now() - start, as_of: new Date(),
      is_incremental: true, contracts_processed: 0,
      validation: {
        gstin_seen: 0, gstin_valid: 0, gstin_invalid: 0, pan_groups_formed: 0,
        multi_gstin_sellers: 0, level_1_count: 0, level_2_count: 0, level_3_count: 0,
        needs_review_count: 0, merge_candidates_count: 0, identity_conflicts_total: 0,
        fogging_suppliers: 0,
      },
    }
  }

  const affectedGSTINs = [...new Set(newContracts.map(c => c.seller_gst as string).filter(Boolean))]
  const affectedGemIds = [...new Set(newContracts.map(c => c.seller_gem_id as string).filter(Boolean))]
  const affectedNames  = [...new Set(newContracts.map(c => c.seller_name_canonical as string).filter(Boolean))]

  const [gstinMap, gemMap, nameMap, counts, archive] = await Promise.all([
    fetchByGSTIN(db, affectedGSTINs),
    fetchByGemId(db, affectedGemIds),
    fetchByName(db, affectedNames),
    fetchAllCountBySeller(db),
    fetchArchiveByGSTIN(db),
  ])

  const now = new Date()

  const { profiles: l1, panMap, validGSTINs, invalidGSTINs } =
    buildLevel1Profiles(gstinMap, counts.byGSTIN, archive.byGSTIN, archive.byName, now)
  const l2 = buildLevel2Profiles(gemMap, panMap, counts.byGemId, archive.byName, now)
  const existingSlugs = new Set([...l1.map(p => p.seller_slug), ...l2.map(p => p.seller_slug)])
  const l3 = buildLevel3Profiles(nameMap, existingSlugs, counts.byName, archive.byName, now)
  runAliasPass(l3)

  const updated = [...l1, ...l2, ...l3]
  if (updated.length > 0) {
    const ops = updated.map(p => ({
      replaceOne: { filter: { seller_slug: p.seller_slug }, replacement: p, upsert: true },
    }))
    await db.collection("seller_profiles").bulkWrite(ops, { ordered: false })
  }

  await reassignAllSellerTiers(db)

  const durationMs = Date.now() - start
  const totalProfiles = await db.collection("seller_profiles")
    .countDocuments({ seller_slug: { $ne: SELLER_META_SLUG } })

  await writeSellerMeta(db, {
    last_incremental_at: now,
    total_profiles:      totalProfiles,
    build_duration_ms:   durationMs,
  })

  return {
    profiles_built:      updated.length,
    profiles_written:    updated.length,
    duration_ms:         durationMs,
    as_of:               now,
    is_incremental:      true,
    contracts_processed: newContracts.length,
    validation: {
      gstin_seen:               gstinMap.size,
      gstin_valid:              validGSTINs,
      gstin_invalid:            invalidGSTINs.length,
      pan_groups_formed:        panMap.size,
      multi_gstin_sellers:      l1.filter(p => p.gstin_count > 1).length,
      level_1_count:            l1.length,
      level_2_count:            l2.length,
      level_3_count:            l3.length,
      needs_review_count:       updated.filter(p => p.needs_review).length,
      merge_candidates_count:   updated.filter(p => p.merge_candidates.length > 0).length,
      identity_conflicts_total: updated.reduce((s, p) => s + p.identity_conflicts.length, 0),
      fogging_suppliers:        updated.filter(p => p.supplies_fogging_products).length,
    },
  }
}
