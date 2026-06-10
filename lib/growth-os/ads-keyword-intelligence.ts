/**
 * Phase 2A.5: Demand Signal Intelligence Engine.
 *
 * Replaces expansion-dominated keyword generation with market-discovered keywords.
 * Six signal sources in priority order:
 *   1. Google Search Console     — real search impressions on 100xcircle.com
 *   2. Google Ads Search Terms   — clicked/converted search terms from live campaigns
 *   3. GeM demand data           — government procurement product names (gem_contracts)
 *   4. AI Search visibility      — queries tracked across 5 AI platforms (growth_os_citations)
 *   5. Competitor intelligence   — pending data (placeholder, returns empty until built)
 *   6. IndiaMART / JustDial      — pending data (governance: no new scraping projects yet)
 *   7. Expansion engine          — algorithmic PRODUCT_BASES × EXPANSION_SPECS (supplement/fallback)
 *
 * Success criterion: Expansion Engine contribution < 30% of selected keywords.
 *
 * Every generated keyword stores:
 *   funnel, intent, matchType, matchTypeReason, confidence, expectedLeadQuality,
 *   reason, source, discoveryMethod, adGroupTheme
 */

import type { Db } from "mongodb"
import clientPromise from "@/lib/mongodb"
import type { Funnel } from "@/lib/growth-os/ads-fuv-config"
import { taxonomyMatchRegexSource } from "@/lib/growth-os/opportunity-core"
import { TARGET_QUERIES } from "@/lib/growth-os/citation-constants"

// ── Types ────────────────────────────────────────────────────────────────────

export type KeywordIntent =
  | "dealer_acquisition"   // distributorship, dealership, franchise
  | "oem_authorization"    // OEM / brand authorization
  | "gem_reseller"         // GeM portal seller / government reseller
  | "commercial_general"   // commercial but not specifically funnel-matched
  | "informational"        // research, how-to → candidate negative

export type AdGroupTheme = "dealer" | "oem" | "gem"

export type KeywordSource =
  | "gsc"              // Google Search Console impression/click data
  | "ads_search_terms" // Google Ads search term report
  | "gem_demand"       // GeM government procurement product names
  | "ai_search"        // AI search visibility tracking queries
  | "competitor"       // Competitor intelligence (pending data)
  | "indiamart"        // IndiaMART marketplace signals (pending data)
  | "expansion"        // Algorithmic PRODUCT_BASES × EXPANSION_SPECS combinations

export interface GeneratedKeyword {
  text:                string
  funnel:              Funnel
  intent:              KeywordIntent
  matchType:           "EXACT" | "PHRASE" | "BROAD"
  matchTypeReason:     string
  confidence:          number   // 0–100
  expectedLeadQuality: "high" | "medium" | "low"
  reason:              string   // human-readable explanation of why this keyword was selected
  source:              KeywordSource
  discoveryMethod:     string   // specific method within the source (e.g. "gsc_high_impression")
  adGroupTheme:        AdGroupTheme
  impressions?:        number
}

export interface SourceContribution {
  source:  KeywordSource
  count:   number
  pct:     number
  status:  "active" | "pending_data" | "no_data"
}

export interface KeywordIntelligenceRun {
  runId:         string
  funnel:        Funnel
  generatedAt:   string
  totalCount:    number
  byTheme:       Record<AdGroupTheme, GeneratedKeyword[]>
  bySource:      Partial<Record<KeywordSource, number>>
  byIntent:      Partial<Record<KeywordIntent, number>>
  // Phase 2A.5 additions
  sourceContribution:       SourceContribution[]
  expansionContributionPct: number
  meetsSuccessCriterion:    boolean  // expansion < 30% of total
  engineVersion: string
}

export const KEYWORD_INTELLIGENCE_COLL = "ads_keyword_intelligence"
const ENGINE_VERSION = "v2.0.0"  // bumped for Phase 2A.5 demand signal intelligence
const MAX_PER_GROUP  = 12

// Source priority for tiebreaking when confidence is equal.
// Real-world demand signals always win over algorithmic expansion.
const SOURCE_PRIORITY: Record<KeywordSource, number> = {
  gsc:              100,
  ads_search_terms:  90,
  gem_demand:        80,
  ai_search:         70,
  competitor:        60,
  indiamart:         50,
  expansion:         10,
}

// ── Intent classification ─────────────────────────────────────────────────────
// Signal arrays define intent categories — not keyword lists.
// Evaluated from most specific (gem, oem) to least specific (informational).

const INTENT_SIGNALS: Record<Exclude<KeywordIntent, "commercial_general">, string[]> = {
  gem_reseller: [
    "gem", "gem portal", "government e-marketplace", "gem seller",
    "gem reseller", "gem vendor", "gem registration", "gem authorized",
    "gem listed", "gem portal seller",
  ],
  oem_authorization: [
    "oem", "original equipment manufacturer", "brand authorization",
    "brand partner", "manufacturer authorization", "oem partnership",
    "oem authorized", "oem supplier", "oem dealer",
  ],
  dealer_acquisition: [
    "dealer", "dealership", "distributor", "franchise", "reseller",
    "channel partner", "become a dealer", "agent", "stockist",
    "dealership opportunity", "sub-dealer", "authorized dealer",
  ],
  informational: [
    "price", "cost", "how to", "what is", "review", "comparison",
    "vs", "specification", "spec", "manual", "repair", "service",
    "youtube", "video", "tutorial", "home use", "domestic",
  ],
}

function classifyIntent(query: string): KeywordIntent {
  const q = query.toLowerCase()
  for (const intent of ["gem_reseller", "oem_authorization", "dealer_acquisition", "informational"] as const) {
    if (INTENT_SIGNALS[intent].some(sig => q.includes(sig))) return intent
  }
  return "commercial_general"
}

function intentToTheme(intent: KeywordIntent): AdGroupTheme | null {
  if (intent === "dealer_acquisition") return "dealer"
  if (intent === "oem_authorization")  return "oem"
  if (intent === "gem_reseller")       return "gem"
  return null
}

// ── Phase 2B: Match-type intelligence ────────────────────────────────────────
// Rules applied in priority order. Each rule stores the reason.

function assignMatchType(
  query:      string,
  intent:     KeywordIntent,
  confidence: number,
  source:     KeywordSource,
): { matchType: "EXACT" | "PHRASE" | "BROAD"; reason: string } {
  const wordCount = query.trim().split(/\s+/).length
  const isSpecific = ["dealer_acquisition", "oem_authorization", "gem_reseller"].includes(intent)

  if (confidence >= 80 && isSpecific) {
    return { matchType: "EXACT", reason: "High-confidence specific intent — Exact protects budget efficiency" }
  }
  if (wordCount >= 4 && confidence >= 70 && isSpecific) {
    return { matchType: "EXACT", reason: "Long-tail specific query — Exact match for precise intent" }
  }
  // Real demand signals (GSC, GeM, AI Search) → Phrase to capture natural variants
  if (["gsc", "gem_demand", "ai_search", "ads_search_terms"].includes(source) && confidence >= 60 && wordCount >= 2) {
    const sourceLabel = source === "gsc" ? "GSC" : source === "gem_demand" ? "GeM" : source === "ai_search" ? "AI search" : "Ads"
    return { matchType: "PHRASE", reason: `${sourceLabel}-validated demand signal — Phrase captures variants while maintaining relevance` }
  }
  if (wordCount <= 2 && confidence >= 60) {
    return { matchType: "PHRASE", reason: "Short query — Phrase prevents irrelevant broad matches" }
  }
  if (source === "expansion" && confidence < 65) {
    return { matchType: "BROAD", reason: "Expansion keyword — Broad enables discovery, guarded by campaign negatives" }
  }
  return { matchType: "PHRASE", reason: "Phrase match balances reach and relevance for this intent cluster" }
}

function computeLeadQuality(
  intent:     KeywordIntent,
  matchType:  "EXACT" | "PHRASE" | "BROAD",
  confidence: number,
): "high" | "medium" | "low" {
  const isTopIntent = ["dealer_acquisition", "oem_authorization"].includes(intent)
  if (isTopIntent && matchType === "EXACT" && confidence >= 75) return "high"
  if (["dealer_acquisition", "oem_authorization", "gem_reseller"].includes(intent) && matchType !== "BROAD" && confidence >= 60) return "medium"
  return "low"
}

// ── Source 1: Google Search Console ──────────────────────────────────────────

async function extractFromGSC(db: Db, funnel: Funnel): Promise<GeneratedKeyword[]> {
  const rows = await db
    .collection("gsc_query_rows")
    .find({ impressions: { $gte: 1 } })
    .sort({ impressions: -1 })
    .limit(500)
    .toArray()

  return rows.flatMap(row => {
    const query = String(row.query ?? "").trim().toLowerCase()
    if (!query || query.length < 3) return []

    const intent = classifyIntent(query)
    const theme  = intentToTheme(intent)
    if (!theme) return []

    const impressions = Number(row.impressions ?? 0)
    const confidence  = impressions >= 100 ? 90 : impressions >= 10 ? 75 : 60
    const { matchType, reason: matchTypeReason } = assignMatchType(query, intent, confidence, "gsc")
    const discoveryMethod = impressions >= 100 ? "gsc_high_impression" : "gsc_impression"

    return [{
      text: query, funnel, intent, matchType, matchTypeReason, confidence,
      expectedLeadQuality: computeLeadQuality(intent, matchType, confidence),
      reason:  `GSC: ${impressions} impression${impressions !== 1 ? "s" : ""} on 100xcircle.com. ${matchTypeReason}`,
      source:  "gsc" as const,
      discoveryMethod,
      adGroupTheme: theme,
      impressions,
    }] satisfies GeneratedKeyword[]
  })
}

// ── Source 2: Google Ads Search Terms ─────────────────────────────────────────

async function extractFromAdsSearchTerms(db: Db, funnel: Funnel): Promise<GeneratedKeyword[]> {
  const rows = await db
    .collection("ads_searchterm_rows")
    .find({})
    .limit(200)
    .toArray()

  return rows.flatMap((row: Record<string, unknown>) => {
    const query = String(row.searchTerm ?? row.search_term ?? "").trim().toLowerCase()
    if (!query || query.length < 3) return []

    const intent = classifyIntent(query)
    const theme  = intentToTheme(intent)
    if (!theme) return []

    const clicks = Number(row.clicks ?? 0)
    const conversions = Number(row.conversions ?? 0)
    const confidence = conversions > 0 ? 88 : clicks >= 5 ? 80 : 75
    const { matchType, reason: matchTypeReason } = assignMatchType(query, intent, confidence, "ads_search_terms")
    const discoveryMethod = conversions > 0 ? "ads_search_term_conversion" : "ads_search_term_click"

    return [{
      text: query, funnel, intent, matchType, matchTypeReason, confidence,
      expectedLeadQuality: computeLeadQuality(intent, matchType, confidence),
      reason:  `Ads search term: ${clicks} click${clicks !== 1 ? "s" : ""}${conversions > 0 ? `, ${conversions} conversion${conversions !== 1 ? "s" : ""}` : ""}. ${matchTypeReason}`,
      source:  "ads_search_terms" as const,
      discoveryMethod,
      adGroupTheme: theme,
    }] satisfies GeneratedKeyword[]
  })
}

// ── Source 3: GeM Government Procurement Demand ────────────────────────────────
// Reads gem_contracts — real government purchase orders.
// Product names in these contracts represent actual procurement terminology
// that dealers and resellers need to understand and target.

async function extractFromGeM(db: Db, funnel: Funnel): Promise<GeneratedKeyword[]> {
  const regexSrc = taxonomyMatchRegexSource()
  const re = new RegExp(regexSrc, "i")

  const contracts = await db
    .collection("gem_contracts")
    .find(
      { product_name: { $regex: re } },
      { projection: { product_name: 1, contract_date_dt: 1 } },
    )
    .sort({ contract_date_dt: -1 })
    .limit(1000)
    .toArray()

  // Count occurrences of each normalized product name
  const nameCount = new Map<string, number>()
  for (const c of contracts) {
    const raw = String(c.product_name ?? "").trim()
    if (!raw || raw.length < 5) continue

    const normalized = raw
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")   // punctuation → space
      .replace(/\b(?:is|as|for|with|and|the|of|in|on|by|at)\b/g, " ")  // strip stop words
      .replace(/\s+/g, " ")
      .trim()

    // Take first 6 words to produce keyword-sized phrases
    const shortform = normalized.split(" ").filter(Boolean).slice(0, 6).join(" ")
    if (shortform.split(" ").length < 2 || shortform.length < 6) continue

    nameCount.set(shortform, (nameCount.get(shortform) || 0) + 1)
  }

  const keywords: GeneratedKeyword[] = []
  for (const [text, count] of nameCount) {
    const intent = classifyIntent(text)
    // Most GeM product names classify as commercial_general — assign to dealer theme
    // because Funnel A targets dealers who supply to these government buyers
    const theme: AdGroupTheme = intentToTheme(intent) ?? "dealer"
    const resolvedIntent: KeywordIntent =
      intentToTheme(intent) ? intent : "dealer_acquisition"

    const confidence = count >= 20 ? 82 : count >= 5 ? 74 : 65
    const { matchType, reason: matchTypeReason } = assignMatchType(text, resolvedIntent, confidence, "gem_demand")

    keywords.push({
      text, funnel,
      intent:              resolvedIntent,
      matchType,           matchTypeReason, confidence,
      expectedLeadQuality: computeLeadQuality(resolvedIntent, matchType, confidence),
      reason:  `GeM procurement signal: ${count} government contract${count !== 1 ? "s" : ""} use this product description`,
      source:  "gem_demand",
      discoveryMethod: "gem_product_name",
      adGroupTheme: theme,
    })
  }

  return keywords.sort((a, b) => b.confidence - a.confidence)
}

// ── Source 4: AI Search Visibility ────────────────────────────────────────────
// TARGET_QUERIES are queries tracked across 5 AI platforms (ChatGPT, Gemini,
// Claude, Perplexity, Google AI Overviews). These represent the vocabulary
// that prospective dealers and OEM partners use when querying AI tools.

async function extractFromAISearch(db: Db, funnel: Funnel): Promise<GeneratedKeyword[]> {
  const citations = await db.collection("growth_os_citations").find({}).toArray()

  // Build per-query citation status
  const citationMap = new Map<string, { mentioned: boolean; hasData: boolean }>()
  for (const c of citations) {
    const q = String(c.query ?? "").trim()
    if (!q) continue
    const existing = citationMap.get(q) || { mentioned: false, hasData: false }
    citationMap.set(q, {
      mentioned: existing.mentioned || Boolean(c.mentioned),
      hasData: true,
    })
  }

  const keywords: GeneratedKeyword[] = []
  for (const query of TARGET_QUERIES) {
    const queryLower = query.toLowerCase().trim()
    if (!queryLower || queryLower.length < 5) continue

    const citData = citationMap.get(query)
    const confidence = citData?.mentioned ? 78 : citData?.hasData ? 68 : 62

    const intent = classifyIntent(queryLower)
    const theme: AdGroupTheme = intentToTheme(intent) ?? "dealer"
    const resolvedIntent: KeywordIntent = intentToTheme(intent) ? intent : "dealer_acquisition"

    const { matchType, reason: matchTypeReason } = assignMatchType(queryLower, resolvedIntent, confidence, "ai_search")
    const discoveryMethod = citData?.mentioned ? "ai_query_mentioned" : "ai_query_tracked"

    keywords.push({
      text: queryLower, funnel,
      intent:              resolvedIntent,
      matchType,           matchTypeReason, confidence,
      expectedLeadQuality: computeLeadQuality(resolvedIntent, matchType, confidence),
      reason:  `AI search visibility: "${query}" tracked across 5 AI platforms — ${citData?.mentioned ? "100X mentioned in AI responses" : citData?.hasData ? "citation data available" : "tracked, pending check"}`,
      source:  "ai_search",
      discoveryMethod,
      adGroupTheme: theme,
    })
  }

  return keywords
}

// ── Source 5: Competitor Intelligence (pending) ───────────────────────────────
// Returns empty until the Competitor Intelligence agent is built.
// Governance: no competitor ad scraping until current engines are validated.

function extractFromCompetitorData(): GeneratedKeyword[] {
  return []
}

// ── Source 6: IndiaMART / JustDial (pending) ──────────────────────────────────
// Returns empty per governance rule: "No additional scraping projects until
// the current opportunity engines have been used and validated in production."

function extractFromIndiaMART(): GeneratedKeyword[] {
  return []
}

// ── Source 7: Expansion engine (supplement / fallback) ────────────────────────
// Algorithmic: PRODUCT_BASES × EXPANSION_SPECS modifiers.
// Should contribute < 30% of final selected keywords (success criterion).

const PRODUCT_BASES = [
  "fogging machine",
  "thermal fogging machine",
  "thermal fogger",
  "ulv fogger",
]

const EXPANSION_SPECS: Record<AdGroupTheme, Array<{ modifier: string; intent: KeywordIntent; confidence: number }>> = {
  dealer: [
    { modifier: "dealership",             intent: "dealer_acquisition", confidence: 75 },
    { modifier: "dealer",                 intent: "dealer_acquisition", confidence: 70 },
    { modifier: "distributor",            intent: "dealer_acquisition", confidence: 70 },
    { modifier: "franchise",              intent: "dealer_acquisition", confidence: 60 },
    { modifier: "reseller",               intent: "dealer_acquisition", confidence: 65 },
    { modifier: "dealership opportunity", intent: "dealer_acquisition", confidence: 65 },
    { modifier: "authorized dealer",      intent: "dealer_acquisition", confidence: 72 },
    { modifier: "distributor india",      intent: "dealer_acquisition", confidence: 63 },
  ],
  oem: [
    { modifier: "oem",                    intent: "oem_authorization", confidence: 72 },
    { modifier: "oem authorization",      intent: "oem_authorization", confidence: 78 },
    { modifier: "oem authorized",         intent: "oem_authorization", confidence: 78 },
    { modifier: "oem supplier",           intent: "oem_authorization", confidence: 68 },
    { modifier: "oem partnership",        intent: "oem_authorization", confidence: 65 },
    { modifier: "brand authorization",    intent: "oem_authorization", confidence: 70 },
  ],
  gem: [
    { modifier: "gem reseller",            intent: "gem_reseller", confidence: 78 },
    { modifier: "gem seller",              intent: "gem_reseller", confidence: 75 },
    { modifier: "gem vendor",              intent: "gem_reseller", confidence: 70 },
    { modifier: "gem portal reseller",     intent: "gem_reseller", confidence: 72 },
    { modifier: "gem authorized reseller", intent: "gem_reseller", confidence: 75 },
    { modifier: "government reseller",     intent: "gem_reseller", confidence: 60 },
  ],
}

function generateExpansions(funnel: Funnel): GeneratedKeyword[] {
  const results: GeneratedKeyword[] = []
  for (const theme of ["dealer", "oem", "gem"] as AdGroupTheme[]) {
    for (const spec of EXPANSION_SPECS[theme]) {
      const bases = spec.confidence >= 70 ? PRODUCT_BASES : PRODUCT_BASES.slice(0, 2)
      for (const base of bases) {
        const text = `${base} ${spec.modifier}`
        const { matchType, reason: matchTypeReason } = assignMatchType(text, spec.intent, spec.confidence, "expansion")
        results.push({
          text, funnel, intent: spec.intent, matchType, matchTypeReason,
          confidence:          spec.confidence,
          expectedLeadQuality: computeLeadQuality(spec.intent, matchType, spec.confidence),
          reason:  `Expansion: "${base}" × "${spec.modifier}". ${matchTypeReason}`,
          source:  "expansion",
          discoveryMethod: "algorithmic_expansion",
          adGroupTheme: theme,
        })
      }
    }
  }
  return results
}

// ── Deduplication ─────────────────────────────────────────────────────────────
// When the same keyword text appears from multiple sources, keep the highest-confidence
// version. Source priority breaks ties so real signals beat expansion.

function deduplicate(keywords: GeneratedKeyword[]): GeneratedKeyword[] {
  const seen = new Map<string, GeneratedKeyword>()
  for (const kw of keywords) {
    const key = `${kw.adGroupTheme}:${kw.text}`
    const ex  = seen.get(key)
    if (!ex) {
      seen.set(key, kw)
    } else if (
      kw.confidence > ex.confidence ||
      (kw.confidence === ex.confidence && SOURCE_PRIORITY[kw.source] > SOURCE_PRIORITY[ex.source])
    ) {
      seen.set(key, kw)
    }
  }
  return Array.from(seen.values())
}

// ── Selection ─────────────────────────────────────────────────────────────────
// Select best keywords per theme. Real demand signals naturally score higher
// and win ties via SOURCE_PRIORITY, so expansion fills gaps only.

function selectBest(all: GeneratedKeyword[], theme: AdGroupTheme): GeneratedKeyword[] {
  const compareFn = (a: GeneratedKeyword, b: GeneratedKeyword) =>
    b.confidence - a.confidence || SOURCE_PRIORITY[b.source] - SOURCE_PRIORITY[a.source]

  const group  = all.filter(k => k.adGroupTheme === theme)
  const exact  = group.filter(k => k.matchType === "EXACT").sort(compareFn)
  const phrase = group.filter(k => k.matchType === "PHRASE").sort(compareFn)
  const broad  = group.filter(k => k.matchType === "BROAD").sort(compareFn)

  // Guarantee ≥1 EXACT + ≥1 PHRASE if available, then fill by confidence + source priority
  const selected: GeneratedKeyword[] = []
  if (exact.length)  selected.push(exact[0])
  if (phrase.length) selected.push(phrase[0])
  const rest = [...exact.slice(1), ...phrase.slice(1), ...broad].filter(k => !selected.includes(k))
  rest.sort(compareFn)
  selected.push(...rest.slice(0, MAX_PER_GROUP - selected.length))
  return selected
}

// ── Source contribution report ────────────────────────────────────────────────

function buildSourceContribution(selected: GeneratedKeyword[]): SourceContribution[] {
  const total = selected.length
  const allSources: KeywordSource[] = [
    "gsc", "ads_search_terms", "gem_demand", "ai_search",
    "competitor", "indiamart", "expansion",
  ]
  return allSources.map(source => {
    const count = selected.filter(k => k.source === source).length
    const isPending = source === "competitor" || source === "indiamart"
    return {
      source,
      count,
      pct: total > 0 ? Math.round((count / total) * 100) : 0,
      status: isPending ? "pending_data" : count === 0 ? "no_data" : "active",
    }
  })
}

// ── Main ──────────────────────────────────────────────────────────────────────

export async function runKeywordIntelligence(opts: {
  funnel: Funnel
}): Promise<KeywordIntelligenceRun> {
  const db = (await clientPromise).db() as Db
  const { funnel } = opts

  // Run all signal sources in parallel
  const [gscKws, adsKws, gemKws, aiKws] = await Promise.all([
    extractFromGSC(db, funnel),
    extractFromAdsSearchTerms(db, funnel),
    extractFromGeM(db, funnel),
    extractFromAISearch(db, funnel),
  ])

  // Pending sources (return empty arrays per governance / missing data)
  const competitorKws = extractFromCompetitorData()
  const indiamartKws  = extractFromIndiaMART()

  // Expansion fills any gaps — should become < 30% as real signals accumulate
  const expKws = generateExpansions(funnel)

  const all = deduplicate([
    ...gscKws,
    ...adsKws,
    ...gemKws,
    ...aiKws,
    ...competitorKws,
    ...indiamartKws,
    ...expKws,
  ])

  const byTheme: Record<AdGroupTheme, GeneratedKeyword[]> = {
    dealer: selectBest(all, "dealer"),
    oem:    selectBest(all, "oem"),
    gem:    selectBest(all, "gem"),
  }

  const flat = [...byTheme.dealer, ...byTheme.oem, ...byTheme.gem]

  const bySource = flat.reduce((acc, k) => {
    acc[k.source] = (acc[k.source] ?? 0) + 1
    return acc
  }, {} as Partial<Record<KeywordSource, number>>)

  const byIntent = flat.reduce((acc, k) => {
    acc[k.intent] = (acc[k.intent] ?? 0) + 1
    return acc
  }, {} as Partial<Record<KeywordIntent, number>>)

  const sourceContribution = buildSourceContribution(flat)
  const expansionCount = bySource.expansion ?? 0
  const expansionContributionPct = flat.length > 0
    ? Math.round((expansionCount / flat.length) * 100)
    : 100
  const meetsSuccessCriterion = expansionContributionPct < 30

  const runId = `kwi_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  const run: KeywordIntelligenceRun = {
    runId, funnel,
    generatedAt:  new Date().toISOString(),
    totalCount:   flat.length,
    byTheme, bySource, byIntent,
    sourceContribution,
    expansionContributionPct,
    meetsSuccessCriterion,
    engineVersion: ENGINE_VERSION,
  }

  await db.collection(KEYWORD_INTELLIGENCE_COLL).insertOne({ ...run })
  return run
}
