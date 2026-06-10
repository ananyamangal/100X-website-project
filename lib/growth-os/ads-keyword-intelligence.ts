/**
 * Phase 2A + 2B: Keyword Intelligence & Match-Type Intelligence Engine.
 *
 * Phase 2A: Generates keyword candidates from demand signals (GSC, ads search terms)
 *           and algorithmic expansion. No manually curated keyword lists.
 * Phase 2B: Applies match-type heuristics inline during generation. Each keyword
 *           stores the reasoning behind its match type assignment.
 *
 * Every generated keyword stores:
 *   funnel, intent, matchType, confidence, expectedLeadQuality, reason, source
 */

import type { Db } from "mongodb"
import clientPromise from "@/lib/mongodb"
import type { Funnel } from "@/lib/growth-os/ads-fuv-config"

// ── Types ────────────────────────────────────────────────────────────────────

export type KeywordIntent =
  | "dealer_acquisition"   // distributorship, dealership, franchise
  | "oem_authorization"    // OEM / brand authorization
  | "gem_reseller"         // GeM portal seller / government reseller
  | "commercial_general"   // commercial but not specifically funnel-matched
  | "informational"        // research, how-to → candidate negative

export type AdGroupTheme = "dealer" | "oem" | "gem"
export type KeywordSource = "gsc" | "ads_search_terms" | "expansion"

export interface GeneratedKeyword {
  text:                string
  funnel:              Funnel
  intent:              KeywordIntent
  matchType:           "EXACT" | "PHRASE" | "BROAD"
  matchTypeReason:     string
  confidence:          number   // 0–100
  expectedLeadQuality: "high" | "medium" | "low"
  reason:              string   // full explanation of why this keyword was selected
  source:              KeywordSource
  adGroupTheme:        AdGroupTheme
  impressions?:        number
}

export interface KeywordIntelligenceRun {
  runId:         string
  funnel:        Funnel
  generatedAt:   string
  totalCount:    number
  byTheme:       Record<AdGroupTheme, GeneratedKeyword[]>
  bySource:      Partial<Record<KeywordSource, number>>
  byIntent:      Partial<Record<KeywordIntent, number>>
  engineVersion: string
}

export const KEYWORD_INTELLIGENCE_COLL = "ads_keyword_intelligence"
const ENGINE_VERSION = "v1.0.0"
const MAX_PER_GROUP  = 12

// ── Intent classification ─────────────────────────────────────────────────────
// Signal arrays are intent indicators — not keyword lists.
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
  if (source === "gsc" && confidence >= 60 && wordCount >= 2) {
    return { matchType: "PHRASE", reason: "GSC-validated query — Phrase captures variants while maintaining relevance" }
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

// ── Phase 2A: Extract from GSC ────────────────────────────────────────────────

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

    return [{
      text: query, funnel, intent, matchType, matchTypeReason, confidence,
      expectedLeadQuality: computeLeadQuality(intent, matchType, confidence),
      reason:  `GSC signal: ${impressions} impression${impressions !== 1 ? "s" : ""}. ${matchTypeReason}`,
      source:  "gsc" as const,
      adGroupTheme: theme,
      impressions,
    }] satisfies GeneratedKeyword[]
  })
}

// ── Phase 2A: Extract from Ads search terms ───────────────────────────────────

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

    const { matchType, reason: matchTypeReason } = assignMatchType(query, intent, 80, "ads_search_terms")
    return [{
      text: query, funnel, intent, matchType, matchTypeReason, confidence: 80,
      expectedLeadQuality: computeLeadQuality(intent, matchType, 80),
      reason:  `Ads search term signal. ${matchTypeReason}`,
      source:  "ads_search_terms" as const,
      adGroupTheme: theme,
    }] satisfies GeneratedKeyword[]
  })
}

// ── Phase 2A: Expansion generation ───────────────────────────────────────────
// Algorithmic: product-category descriptors × intent-signal modifiers.
// Produces keyword COMBINATIONS at runtime — not a manually curated list.

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
          adGroupTheme: theme,
        })
      }
    }
  }
  return results
}

// ── Selection ─────────────────────────────────────────────────────────────────

function deduplicate(keywords: GeneratedKeyword[]): GeneratedKeyword[] {
  const seen = new Map<string, GeneratedKeyword>()
  for (const kw of keywords) {
    const key = `${kw.adGroupTheme}:${kw.text}`
    const ex  = seen.get(key)
    if (!ex || kw.confidence > ex.confidence) seen.set(key, kw)
  }
  return Array.from(seen.values())
}

function selectBest(all: GeneratedKeyword[], theme: AdGroupTheme): GeneratedKeyword[] {
  const group  = all.filter(k => k.adGroupTheme === theme)
  const exact  = group.filter(k => k.matchType === "EXACT").sort((a, b) => b.confidence - a.confidence)
  const phrase = group.filter(k => k.matchType === "PHRASE").sort((a, b) => b.confidence - a.confidence)
  const broad  = group.filter(k => k.matchType === "BROAD").sort( (a, b) => b.confidence - a.confidence)

  // Guarantee ≥1 EXACT + ≥1 PHRASE if available, then fill by confidence
  const selected: GeneratedKeyword[] = []
  if (exact.length)  selected.push(exact[0])
  if (phrase.length) selected.push(phrase[0])
  const rest = [...exact.slice(1), ...phrase.slice(1), ...broad].filter(k => !selected.includes(k))
  selected.push(...rest.slice(0, MAX_PER_GROUP - selected.length))
  return selected
}

// ── Main ──────────────────────────────────────────────────────────────────────

export async function runKeywordIntelligence(opts: {
  funnel: Funnel
}): Promise<KeywordIntelligenceRun> {
  const db = (await clientPromise).db() as Db
  const { funnel } = opts

  const [gscKws, adsKws] = await Promise.all([
    extractFromGSC(db, funnel),
    extractFromAdsSearchTerms(db, funnel),
  ])
  const expKws = generateExpansions(funnel)

  const all    = deduplicate([...gscKws, ...adsKws, ...expKws])
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

  const runId = `kwi_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  const run: KeywordIntelligenceRun = {
    runId, funnel, generatedAt: new Date().toISOString(),
    totalCount: flat.length, byTheme, bySource, byIntent, engineVersion: ENGINE_VERSION,
  }

  await db.collection(KEYWORD_INTELLIGENCE_COLL).insertOne({ ...run })
  return run
}
