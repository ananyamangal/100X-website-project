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
import { TARGET_QUERIES } from "@/lib/growth-os/citation-constants"

// ── GeM keyword intelligence filter (TIER_A fogging-only) ────────────────────
// Deliberately excludes TIER_B (agricultural: reapers, tillers, seeders, brush
// cutters, harvesters) and broad sprayer terms. A false-positive keyword is more
// dangerous than a missed keyword. Broader categories remain available to the
// Dealer Opportunity Engine via taxonomyMatchRegexSource() in opportunity-core.ts.
//
// Include: thermal foggers, ULV foggers, fogging machines, vector-control and
// public-health fogging equipment, fogging-specific chemicals (larvicide/adulticide).
// Exclude: anything agricultural, general sprayers, tillers, reapers, seeders.
const KI_GEM_FOGGING_PATTERNS = [
  "thermal\\s*fog",
  "\\bfogger\\b",
  "fogging\\s*machine",
  "fogging\\s*equipment",
  "fog\\s*sanitizer",
  "cold\\s*fog",
  "mist\\s*blow",          // mist blower — vector control use
  "aero\\s*blast",         // brand type used for fogging
  "vehicle\\s*mount\\w*\\s*fog",
  "\\bULV\\b",             // Ultra Low Volume — strictly vector/public-health
  "mosquito\\s*control",
  "vector\\s*control",
  "disease\\s*control\\s*(machine|equipment|spray|fogger)",
  "public\\s*health.*fog",
  "larvicid",              // mosquito larvicide — always fogging-operation-linked
  "adulticid",             // mosquito adulticide — always fogging-operation-linked
]

const KI_GEM_FOGGING_RE = new RegExp(KI_GEM_FOGGING_PATTERNS.join("|"), "i")

// Secondary exclusion: even if the regex matches, reject if the normalized
// product name contains any of these agricultural / off-target patterns.
const KI_GEM_EXCLUDE_PATTERNS = [
  /\breaper\b/i,
  /\btiller\b/i,
  /\btilling\b/i,
  /\bseeder\b/i,
  /\bseeding\b/i,
  /\bsower\b/i,
  /\bplanter\b/i,
  /\bharvest/i,
  /\bthresher\b/i,
  /\bchaff\b/i,
  /\bbrush\s*cut/i,
  /\bweeder\b/i,
  /\bweeding\b/i,
  /\brotavat/i,
  /\brotovat/i,
  /\bwinnow/i,
  /\bdrip\s*irrigat/i,
  /\bsprinkler\s*irrigat/i,
  /\bpump\s*set\b/i,
  /\bsubmersible\s*pump/i,
  /\btractor\b/i,
  /\bknapsack\s*sprayer\b/i,     // agricultural hand-sprayer (not fogger)
  /\bhand\s*operated\s*sprayer/i,
  /\bknapsack\s*pump\b/i,
  /\bback\s*pack\s*sprayer/i,
  /\bsanitary\s*napkin/i,        // unrelated false positive from "sanitizer" stem
  /\bhand\s*sanitizer\b/i,       // consumer hygiene — not fogging machine
  /\bface\s*mask\b/i,
]

function isExcludedGeMProduct(normalized: string): boolean {
  return KI_GEM_EXCLUDE_PATTERNS.some(re => re.test(normalized))
}

// ── GeM phrase quality filter — 4-gate classification ────────────────────────
//
// Gate 0 (preprocessing): strip filler words + company suffix indicators.
// Gate 1 (primary pass): phrase contains a STRONG machine noun → KEEP.
// Gate 2 (chemical reject): no machine noun + chemical product term → REJECT.
// Gate 3 (designation reject): no machine noun, no chemical + bare spec code
//         or technology designation → REJECT.
//
// Design principle: IS 14855 / ISI / WHO / NVBDCP are NOT globally rejected.
// They are compliance signals. "IS 14855 fogging machine" passes Gate 1.
// "deltamethrin per IS 15227" fails Gate 1 (no machine noun), fails Gate 2
// (deltamethrin = chemical) → correctly rejected.

export const USABILITY_THRESHOLD = 50

// ── Gate 0: Preprocessing ─────────────────────────────────────────────────────

// Words with no keyword value — stripped before shortform extraction.
const GEM_FILLER_RE = /\b(unbranded|branded)\b/gi

// Company suffix words that indicate a supplier/company-name prefix in GeM
// product names. When detected, the suffix word AND the immediately preceding
// word (the company's proper name, e.g. "Radiant" in "Radiant Enterprise")
// are both removed, then the remaining phrase is re-evaluated.
//
// "Radiant Enterprise ABS Portable Disinfectant Fogging Machine"
//   → strip "enterprise" + "radiant" → "ABS Portable Disinfectant Fogging Machine"
//   → Gate 1: "fogging machine" → PASS ✓
const GEM_COMPANY_SUFFIXES = new Set([
  "enterprise", "enterprises", "industries", "industry",
  "corporation", "corp", "pvt", "ltd", "limited",
  "traders", "trader", "suppliers", "supplier",
  "agency", "agencies", "associates", "solutions",
  "services", "company",
])

function stripCompanySuffixes(phrase: string): string {
  const words = phrase.split(/\s+/).filter(Boolean)
  const drop  = new Set<number>()
  for (let i = 0; i < words.length; i++) {
    if (GEM_COMPANY_SUFFIXES.has(words[i])) {
      drop.add(i)
      if (i > 0) drop.add(i - 1)   // also drop the preceding proper-name word
    }
  }
  return words.filter((_, i) => !drop.has(i)).join(" ")
}

// ── Gate 1: Strong machine nouns (primary pass gate) ─────────────────────────
// Bare "ULV" alone is NOT sufficient — ULV is also a chemical formulation type
// (ULV concentrate). ULV must be followed by a machine noun to count.
// Bare "fog" alone is NOT sufficient — it appears in product/brand names
// ("Super White Fog", "King Fog") that are not fogging machines.
const KI_STRONG_MACHINE_NOUNS: RegExp[] = [
  /fogging\s+machine/i,
  /fogging\s+equipment/i,
  /\bfogger(s)?\b/i,
  /fog\s+(machine|equipment|sanitizer|unit)/i,
  /\bULV\s+(fogger|machine|equipment|unit)/i,
  /mist\s*blow(er)?/i,
  /aero\s*blast/i,
  /\bfogging\b/i,                                    // fogging as standalone noun/gerund
  /vector\s*control\s+(machine|equipment|device)/i,
  /mosquito\s*control\s+(machine|equipment|device)/i,
]

// ── Gate 2: Chemical intent (reject if no machine noun) ───────────────────────
// Specific chemical names first, then product-type terms, then formulation codes.
const KI_CHEMICAL_TERMS: RegExp[] = [
  /\bdeltamethrin\b/i, /\bcypermethrin\b/i, /\bmalathion\b/i,
  /\btemephos\b/i,     /\bpermethrin\b/i,   /\bfenitrothion\b/i,
  /\bpropoxur\b/i,     /\bpyrethr/i,
  /\boils?\b/i,
  /\bseeds?\b/i,
  /\bchemical(s)?\b/i,
  /\bliquid\b/i,
  /\bpesticide(s)?\b/i,
  /\binsecticide(s)?\b/i,
  /\bformulation\b/i,
  /\blarvicidal\b/i,
  /\badulticidal\b/i,
  /\bfungicide\b/i,
  /\bherbicide\b/i,
  /\bconcentrate\b/i,
  /\bemulsifi/i,
  /\b(wp|ec|sc|gr|wdg|sl|dp)\b/i,
  /\d+(\.\d+)?\s*%/,
  /\d+(\.\d+)?\s*(wp|ec|sc|gr)\b/i,
]

// ── Gate 3: Technology designation / spec code (reject if no machine noun) ────
// Note: IS 14855, ISI, WHO, NVBDCP are NOT listed here — they are compliance
// signals that are fine when paired with a machine noun (Gate 1 already passed
// those phrases). These patterns only fire when Gate 1 has already failed.
const KI_DESIGNATION_PATTERNS: RegExp[] = [
  /\bdrdo\b/i,
  /\bultrasonic\b/i,
  /\bultrasound\b/i,
  /\bnano\s*tech/i,
  /per\s*\d{3,}/i,       // "per 15227" — chemical spec reference without machine context
  /\b\d{4,}\b/,          // standalone 4+ digit cert numbers without machine context
  /\d+(\.\d+)?\s*(ml|litre|ltr|kg|gm|lit)\b/i,  // weight/volume specs without machine
]

// ── Quality check entry point ─────────────────────────────────────────────────

export type GeMRejectClass =
  | "chemical_intent"
  | "designation_intent"
  | "no_machine_noun"

export interface GeMUsabilityResult {
  score:         number        // 0–100; all Gate-1-passing phrases score ≥ 50
  pass:          boolean       // score >= USABILITY_THRESHOLD
  rejectClass?:  GeMRejectClass
  rejectReason?: string
}

export function checkGeMUsability(phrase: string): GeMUsabilityResult {
  // Gate 1: machine noun check — primary pass gate
  if (KI_STRONG_MACHINE_NOUNS.some(re => re.test(phrase))) {
    let score = 50  // guaranteed pass
    const words = phrase.split(/\s+/).filter(Boolean)
    if (words.length >= 2 && words.length <= 4)  score += 25
    else if (words.length === 5)                  score += 15
    else if (words.length === 6)                  score += 5
    if (!/\d/.test(phrase))                        score += 15
    if (/fogging\s+machine|fogger/i.test(phrase))  score += 10
    return { score: Math.min(100, score), pass: true }
  }

  // Gate 2: chemical term check (only reached if Gate 1 failed)
  for (const re of KI_CHEMICAL_TERMS) {
    if (re.test(phrase)) {
      return { score: 0, pass: false, rejectClass: "chemical_intent",
        rejectReason: "Chemical or consumable product — not a fogging machine keyword" }
    }
  }

  // Gate 3: designation check (only reached if Gates 1+2 failed)
  for (const re of KI_DESIGNATION_PATTERNS) {
    if (re.test(phrase)) {
      return { score: 0, pass: false, rejectClass: "designation_intent",
        rejectReason: "Technology designation or spec code without machine noun context" }
    }
  }

  // No machine noun, no chemical, no designation → insufficient signal
  return { score: 20, pass: false, rejectClass: "no_machine_noun",
    rejectReason: "No fogging/vector-control machine noun found in phrase" }
}

// ── GeM Phrase Normalization Engine ──────────────────────────────────────────
// Converts procurement-style 6-word shortforms into 1–2 search-intent phrases.
//
// "abs portable disinfectant fogging machine power"
//   → "portable fogging machine"      [modifier + canonical noun]
//   → "disinfectant fogging machine"  [modifier + canonical noun]
//
// Traceability: each output keyword carries originalPhrase = raw product_name.
// All output keywords retain source="gem_demand" and the full GeM evidence bonus.

interface NormModifier {
  pattern: RegExp
  term:    string
  weight:  number   // higher = shown first when multiple modifiers exist
}

const GEM_NORM_MODIFIERS: NormModifier[] = [
  { pattern: /\bthermal\b/i,                   term: "thermal",          weight: 10 },
  { pattern: /\bULV\b/,                        term: "ULV",              weight: 9  },
  { pattern: /\bportable\b/i,                  term: "portable",         weight: 8  },
  { pattern: /\bmosquito\b/i,                  term: "mosquito",         weight: 8  },
  { pattern: /\bdisinfect/i,                   term: "disinfectant",     weight: 7  },
  { pattern: /\bvector.?control\b/i,           term: "vector control",   weight: 7  },
  { pattern: /\bcold.?fog\b/i,                 term: "cold fog",         weight: 7  },
  { pattern: /\bIS\s*14855\b/i,                term: "IS 14855",         weight: 6  },
  { pattern: /\bpublic.?health\b/i,            term: "public health",    weight: 6  },
  { pattern: /\bbattery/i,                     term: "battery operated", weight: 6  },
  { pattern: /\belectric\b/i,                  term: "electric",         weight: 5  },
  { pattern: /\bvehicle.?mount/i,              term: "vehicle mounted",  weight: 5  },
  { pattern: /\bpetrol\b/i,                    term: "petrol",           weight: 5  },
  { pattern: /\bhandheld\b/i,                  term: "handheld",         weight: 5  },
  { pattern: /\bbackpack\b/i,                  term: "backpack",         weight: 4  },
]

const GEM_NORM_MACHINE_NOUNS: Array<{ pattern: RegExp; canonical: string }> = [
  { pattern: /\bthermal\s+fogging\s+machine\b/i, canonical: "thermal fogging machine" },
  { pattern: /\bULV\s+fog(?:ger|ging)/i,          canonical: "ULV fogger"             },
  { pattern: /\bfogging\s+machine\b/i,            canonical: "fogging machine"        },
  { pattern: /\bfogger\b/i,                       canonical: "fogger"                 },
  { pattern: /\bmist\s*blow(?:er)?\b/i,           canonical: "mist blower"            },
  { pattern: /\bfogging\b/i,                      canonical: "fogging machine"        },
]

function normalizeGeMToSearchPhrases(
  shortform:     string,
  originalRaw:   string,
  funnel:        Funnel,
  gemCount:      number,
  rawUsability:  number,
): GeneratedKeyword[] {
  // Find canonical machine noun (most specific match wins)
  let canonicalNoun = "fogging machine"
  for (const { pattern, canonical } of GEM_NORM_MACHINE_NOUNS) {
    if (pattern.test(shortform)) { canonicalNoun = canonical; break }
  }

  // If canonical is already specific and informative, use it directly
  const canonicalIsSpecific = canonicalNoun !== "fogging machine" && canonicalNoun !== "fogger"

  // Collect applicable modifiers not already encoded in the canonical noun
  const mods = GEM_NORM_MODIFIERS
    .filter(m =>
      m.pattern.test(shortform) &&
      !canonicalNoun.toLowerCase().includes(m.term.toLowerCase().split(" ")[0]),
    )
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 2)  // max 2 modifier-derived phrases per input

  const candidates: Array<{ text: string; reason: string; conf: number }> = []

  if (canonicalIsSpecific) {
    candidates.push({
      text:   canonicalNoun,
      reason: `GeM: canonical machine type from "${shortform}"`,
      conf:   gemCount >= 5 ? 74 : 70,
    })
  }

  const baseNoun = canonicalIsSpecific ? canonicalNoun : "fogging machine"
  for (const { term } of mods) {
    candidates.push({
      text:   `${term} ${baseNoun}`,
      reason: `GeM: "${term}" modifier from "${shortform}"`,
      conf:   gemCount >= 5 ? 72 : 68,
    })
  }

  // Fallback: keep shortform if normalization produced nothing
  if (candidates.length === 0) {
    candidates.push({
      text:   shortform,
      reason: `GeM: shortform used directly — no normalizable modifiers in "${shortform}"`,
      conf:   gemCount >= 5 ? 65 : 62,
    })
  }

  return candidates.map(({ text, reason, conf }) => {
    const normUsability = checkGeMUsability(text)
    const effectiveUsability = normUsability.pass ? normUsability.score : rawUsability
    const { matchType, reason: matchTypeReason } = assignMatchType(text, "dealer_acquisition", conf, "gem_demand")
    return {
      text, funnel,
      intent:              "dealer_acquisition" as const,
      matchType,           matchTypeReason, confidence: conf,
      expectedLeadQuality: computeLeadQuality("dealer_acquisition", matchType, conf),
      reason,
      source:              "gem_demand" as const,
      discoveryMethod:     "gem_normalized",
      adGroupTheme:        "dealer" as const,
      usabilityScore:      effectiveUsability,
      originalPhrase:      originalRaw,
    } satisfies GeneratedKeyword
  })
}

// ── Types ────────────────────────────────────────────────────────────────────

export type KeywordIntent =
  | "dealer_acquisition"   // distributorship, dealership, franchise
  | "oem_authorization"    // OEM / brand authorization
  | "gem_reseller"         // GeM portal seller / government reseller
  | "machine_purchase"     // direct machine-intent query — Funnel B (Direct Buyer)
  | "commercial_general"   // commercial but not specifically funnel-matched
  | "informational"        // research, how-to → candidate negative

export type AdGroupTheme = "dealer" | "oem" | "gem" | "direct_buyer"

export type KeywordSource =
  | "ads_search_terms"    // P1: Google Ads search term report (clicked/converted)
  | "rfq_conversion"      // P2: utm_term that attributed to an RFQ submission
  | "whatsapp_conversion" // P3: utm_term that attributed to a WhatsApp click lead
  | "phone_conversion"    // P4: utm_term that attributed to a phone click lead
  | "dealer_conversion"   // P5: utm_term attributed to a dealer application
  | "oem_conversion"      // P6: utm_term attributed to an OEM authorization enquiry
  | "gsc"                 // P7: Google Search Console impression/click data
  | "ai_search"           // P8: AI search visibility tracking queries
  | "gem_demand"          // P9: GeM government procurement product names (supporting signal)
  | "competitor"          // P10: Competitor intelligence (pending data)
  | "indiamart"           // pending: IndiaMART marketplace signals
  | "expansion"           // P11: Algorithmic PRODUCT_BASES × EXPANSION_SPECS combinations

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
  usabilityScore?:     number   // GeM only: 0–100 phrase quality score; must be ≥ USABILITY_THRESHOLD
  effectiveScore?:     number   // confidence + EVIDENCE_BONUS[source] + qualityBonus; drives ranking
  originalPhrase?:     string   // GeM only: raw product_name before normalization (traceability)
  observeOnly?:        boolean  // Bucket B: high-volume generic — tracked but NOT deployed to campaigns
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
  sourceContribution:       SourceContribution[]
  expansionContributionPct: number
  meetsSuccessCriterion:    boolean
  // GeM quality filter audit trail
  gemRejections: GeMRejection[]
  engineVersion: string
}

export const KEYWORD_INTELLIGENCE_COLL = "ads_keyword_intelligence"
const ENGINE_VERSION = "v2.4.0"  // FUNNEL_B_DIRECT_BUYER: machine_purchase intent + direct_buyer theme + observeOnly Bucket B
const MAX_PER_GROUP  = 12

// Source priority — used for tiebreaking and source contribution reporting.
// Mirrors the priority order: conversion signals > GSC > AI > GeM > expansion.
const SOURCE_PRIORITY: Record<KeywordSource, number> = {
  ads_search_terms:    100,
  rfq_conversion:       95,
  whatsapp_conversion:  90,
  phone_conversion:     85,
  dealer_conversion:    82,
  oem_conversion:       80,
  gsc:                  75,
  ai_search:            60,
  gem_demand:           40,   // demoted: supporting signal only, not primary driver
  competitor:           30,
  indiamart:            20,
  expansion:            10,
}

// Evidence Bonus: additive score reward for real demand signals.
// Conversion signals receive the highest bonus — they are proven commercial intent.
// GeM bonus reduced from 15 → 5: use as corroborating evidence only.
export const EVIDENCE_BONUS: Record<KeywordSource, number> = {
  ads_search_terms:    30,   // highest: real clicks from live campaigns
  rfq_conversion:      28,   // keyword that generated a real RFQ lead
  whatsapp_conversion: 24,   // keyword that drove WhatsApp contact
  phone_conversion:    22,   // keyword that drove phone call
  dealer_conversion:   22,   // keyword that drove dealer application
  oem_conversion:      20,   // keyword that drove OEM authorization enquiry
  gsc:                 18,   // real search impressions on our domain
  ai_search:           10,   // AI platform visibility signal
  gem_demand:           5,   // government procurement terminology — supporting evidence only
  competitor:           8,
  indiamart:            3,
  expansion:            0,
}

// Quality Bonus: applied only when usabilityScore is present (GeM keywords).
// Rewards high-quality machine-noun phrases over borderline-passing ones.
function computeQualityBonus(usabilityScore: number | undefined): number {
  if (usabilityScore === undefined) return 0
  if (usabilityScore >= 90) return 8
  if (usabilityScore >= 75) return 5
  if (usabilityScore >= 60) return 3
  return 0
}

// Effective score = basis for all ranking decisions.
// effectiveScore = confidence + evidenceBonus + qualityBonus
export function computeEffectiveScore(
  kw: Pick<GeneratedKeyword, "confidence" | "source" | "usabilityScore">,
): number {
  return kw.confidence + EVIDENCE_BONUS[kw.source] + computeQualityBonus(kw.usabilityScore)
}

// ── Intent classification ─────────────────────────────────────────────────────
// Signal arrays define intent categories — not keyword lists.
// Evaluated from most specific (gem, oem) to least specific (informational).

const INTENT_SIGNALS: Record<Exclude<KeywordIntent, "commercial_general" | "machine_purchase">, string[]> = {
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
  // Funnel A signals evaluated first — preserves existing dealer/OEM/GeM routing unchanged.
  for (const intent of ["gem_reseller", "oem_authorization", "dealer_acquisition", "informational"] as const) {
    if (INTENT_SIGNALS[intent].some(sig => q.includes(sig))) return intent
  }
  // Funnel B: PRODUCT_INTENT pathway — only fires for queries not caught by Funnel A.
  // Informational guard prevents "fogging machine price" or "what is a fogger" from entering.
  if (PRODUCT_INTENT_RE.test(q) && !DIRECT_BUYER_GUARD_RE.test(q)) {
    return "machine_purchase"
  }
  return "commercial_general"
}

function intentToTheme(intent: KeywordIntent): AdGroupTheme | null {
  if (intent === "dealer_acquisition") return "dealer"
  if (intent === "oem_authorization")  return "oem"
  if (intent === "gem_reseller")       return "gem"
  if (intent === "machine_purchase")   return "direct_buyer"
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
  const isSpecific = ["dealer_acquisition", "oem_authorization", "gem_reseller", "machine_purchase"].includes(intent)

  // Conversion-backed sources → EXACT always: these are proven commercial queries
  const CONVERSION_SOURCES: KeywordSource[] = [
    "rfq_conversion", "whatsapp_conversion", "phone_conversion",
    "dealer_conversion", "oem_conversion",
  ]
  if (CONVERSION_SOURCES.includes(source)) {
    const label = source.replace(/_/g, " ")
    return { matchType: "EXACT", reason: `${label} — proven conversion signal, EXACT protects spend on a known winner` }
  }

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
  const isTopIntent = ["dealer_acquisition", "oem_authorization", "machine_purchase"].includes(intent)
  if (isTopIntent && matchType === "EXACT" && confidence >= 75) return "high"
  if (["dealer_acquisition", "oem_authorization", "gem_reseller", "machine_purchase"].includes(intent) && matchType !== "BROAD" && confidence >= 60) return "medium"
  return "low"
}

// ── Anti-fog false positive guard ─────────────────────────────────────────────
// Rejects GSC queries that contain anti-fog / fogging-agent product intent
// without any fogging-machine context. These bypass classifyIntent() via the
// "agent" signal (dealer_acquisition) but are wrong product category:
//   "fogging agent" → chemical agent for anti-fogging coatings
//   "advantages of thermal curing anti-fog agent" → anti-fog surface treatment
//
// Rule (user-approved): reject if anti-fog intent present AND none of:
//   machine / fogger / thermal / ULV / mosquito / vector control / municipal /
//   GeM / OEM / distributor / dealer / manufacturer

const ANTI_FOG_INTENT_RE = /\banti[\s-]?fog(?:ging)?\b|\bde[\s-]?fog(?:ging)?\b|\banti[\s-]?mist\b|\banti[\s-]?condensation\b|\bfogging\s+agent\b/i

const ANTI_FOG_MACHINE_CONTEXT_RE = /\b(machine|fogger|foggers|thermal|ulv|mosquito|vector\s*control|municipal|gem|oem|distributor|dealer|manufacturer)\b/i

function isAntiFogFalsePositive(query: string): boolean {
  return ANTI_FOG_INTENT_RE.test(query) && !ANTI_FOG_MACHINE_CONTEXT_RE.test(query)
}

// ── FUNNEL_B_DIRECT_BUYER: Product intent patterns ────────────────────────────
//
// Classifies product-centric queries (no dealer/OEM/GeM role words) as
// machine_purchase → direct_buyer theme. Separate from Funnel A.
//
// Bucket A (active, deploy):  specific machine-intent queries with ≥3 words
// Bucket B (observe only):    bare generic product terms — high volume, no clicks yet
//   observeOnly = true on extracted keywords; filtered out at campaign deployment
//
// Detection order inside classifyIntent():
//   1. Existing INTENT_SIGNALS (gem, oem, dealer, informational) fire first.
//   2. PRODUCT_INTENT_RE fires only for queries that escape all Funnel A signals.
//   3. DIRECT_BUYER_GUARD blocks informational queries even if they match product patterns.

const PRODUCT_INTENT_RE = new RegExp(
  [
    "fogging\\s+machine",
    "fogger\\s+machine",
    "\\bfogger\\b",
    "thermal\\s+fog(?:ger|ging)",
    "portable\\s+fogging",
    "mosquito\\s+fogging",
    "mosquito\\s+control\\s+machine",
    "vector\\s+control\\s+(?:equipment|machine|fogger)",
    "ULV\\s+fog(?:ger|ging)",
    "vehicle[\\s-]+mounted\\s+fogging",
    "truck[\\s-]+mounted\\s+fogging",
    "fogging\\s+machine\\s+manufacturer",
    "fogger\\s+manufacturer",
    "mosquito\\s+fogging\\s+equipment",
    "public\\s+health\\s+fogging",
    "fogging\\s+system",
    "fogging\\s+market",
    "commercial\\s+mosquito\\s+fogger",
    "agricultural\\s+fogger",
    "double\\s+barrel\\s+fog",
    "fogging\\s+machine\\s+for\\s+(?:mosquito|pest|dengue|malaria|municipal)",
    "cold\\s+fog(?:ger|ging)?",
  ].join("|"),
  "i",
)

// Bucket B: bare generic product terms — classified machine_purchase but marked observe-only.
// These have thousands of impressions and 0 clicks: not enough signal to bid on yet.
const OBSERVE_ONLY_RE = /^(fogger\s+machine|fogging\s+machine|fogger|thermal\s+fogger(?:\s+machine)?|cold\s+fogging|fogging\s+system|fogger\s+kit|thermal\s+fogging|ulv\s+fogger|mist\s+fogger)$/i

// Guards informational / consumer queries from entering Funnel B even when they match product patterns.
const DIRECT_BUYER_GUARD_RE = /\b(price|cost|how\s+much|rate\b|review|compare|how\s+to|what\s+is|what\s+is\s+a|manual|tutorial|video|buy\b|purchase|amazon|flipkart|near\s+me|for\s+home|home\s+use|meaning|definition|near(?:by)?)\b/i

// ── Source 0: Conversion Signals ─────────────────────────────────────────────
// Reads MongoDB lead collections and extracts search terms that drove real conversions.
// These are the highest-priority signals: proven commercial queries that generated
// RFQ leads, dealer applications, or OEM authorization enquiries.
//
// Data sources:
//   rfq_popup_leads   → utmTerm field; leadType field classifies dealer/oem/rfq
//   brochure_leads    → productName (research signal preceding purchase)
//   gem_inquiries     → government buyer intent (dealer_conversion or oem_conversion)
//
// whatsapp_conversion and phone_conversion will populate once GTM conversion
// tracking is live and Google Ads starts returning conversion-level data in
// ads_searchterm_rows. Until then they remain pending_data.

export async function extractFromConversions(db: Db, funnel: Funnel): Promise<GeneratedKeyword[]> {
  const [rfqLeads, brochureLeads, gemInquiries] = await Promise.all([
    db.collection("rfq_popup_leads")
      .find({ utmTerm: { $exists: true, $ne: "" } })
      .sort({ createdAt: -1 })
      .limit(2000)
      .toArray(),
    db.collection("brochure_leads")
      .find({ productName: { $exists: true, $ne: "" } })
      .sort({ createdAt: -1 })
      .limit(1000)
      .toArray(),
    db.collection("gem_inquiries")
      .find({})
      .sort({ createdAt: -1 })
      .limit(500)
      .toArray(),
  ])

  // ── Aggregate RFQ lead conversions by utmTerm ───────────────────────────────
  const termMap = new Map<string, { rfqCount: number; dealerCount: number; oemCount: number }>()

  for (const lead of rfqLeads) {
    const term = String(lead.utmTerm ?? "").trim().toLowerCase()
    if (!term || term.length < 3) continue
    const leadType = String(lead.leadType ?? "")
    const ex = termMap.get(term) ?? { rfqCount: 0, dealerCount: 0, oemCount: 0 }
    if (leadType === "dealer_application")  ex.dealerCount++
    else if (leadType === "oem_authorization") ex.oemCount++
    else ex.rfqCount++
    termMap.set(term, ex)
  }

  const keywords: GeneratedKeyword[] = []
  const seen = new Set<string>()

  for (const [term, { rfqCount, dealerCount, oemCount }] of termMap) {
    const total = rfqCount + dealerCount + oemCount

    // Primary source: whichever lead type dominates
    const source: KeywordSource =
      dealerCount >= oemCount && dealerCount > 0 ? "dealer_conversion" :
      oemCount > 0 ? "oem_conversion" : "rfq_conversion"

    const intent = classifyIntent(term)
    const resolvedIntent: KeywordIntent = intent ?? "dealer_acquisition"
    const resolvedTheme: AdGroupTheme =
      intentToTheme(intent) ??
      (source === "oem_conversion" ? "oem" : source === "dealer_conversion" ? "dealer" : "dealer")

    // Confidence scales with conversion count — more conversions = stronger signal
    const confidence = Math.min(95, 70 + total * 5)
    const { matchType, reason: matchTypeReason } = assignMatchType(term, resolvedIntent, confidence, source)

    const parts: string[] = []
    if (rfqCount > 0)    parts.push(`${rfqCount} RFQ${rfqCount > 1 ? "s" : ""}`)
    if (dealerCount > 0) parts.push(`${dealerCount} dealer application${dealerCount > 1 ? "s" : ""}`)
    if (oemCount > 0)    parts.push(`${oemCount} OEM enquir${oemCount > 1 ? "ies" : "y"}`)

    keywords.push({
      text: term, funnel,
      intent: resolvedIntent, matchType, matchTypeReason, confidence,
      expectedLeadQuality: "high",
      reason: `Conversion signal: "${term}" directly attributed to ${parts.join(", ")} via UTM tracking. Proven commercial intent — highest priority keyword.`,
      source,
      discoveryMethod: "utm_term_attribution",
      adGroupTheme: resolvedTheme,
    })
    seen.add(`${term}::${source}`)
  }

  // ── Brochure downloads — high-intent research signal ───────────────────────
  const brochureMap = new Map<string, number>()
  for (const lead of brochureLeads) {
    const raw = String(lead.productName ?? "").trim().toLowerCase()
    if (!raw || raw.length < 3 || !KI_GEM_FOGGING_RE.test(raw)) continue
    brochureMap.set(raw, (brochureMap.get(raw) ?? 0) + 1)
  }

  for (const [term, count] of brochureMap) {
    const key = `${term}::rfq_conversion`
    if (seen.has(key)) continue
    const confidence = Math.min(80, 55 + count * 3)
    const intent = classifyIntent(term)
    const resolvedIntent: KeywordIntent = intent ?? "dealer_acquisition"
    const resolvedTheme: AdGroupTheme = intentToTheme(intent) ?? "dealer"
    const { matchType, reason: matchTypeReason } = assignMatchType(term, resolvedIntent, confidence, "rfq_conversion")
    keywords.push({
      text: term, funnel,
      intent: resolvedIntent, matchType, matchTypeReason, confidence,
      expectedLeadQuality: "medium",
      reason: `Brochure download: ${count} prospect${count > 1 ? "s" : ""} downloaded brochure for "${term}" — high-intent research signal preceding a purchase decision.`,
      source: "rfq_conversion" as const,
      discoveryMethod: "brochure_product_name",
      adGroupTheme: resolvedTheme,
    })
    seen.add(key)
  }

  // ── GeM inquiries — government buyer intent ────────────────────────────────
  const gemInqMap = new Map<string, number>()
  for (const inq of gemInquiries) {
    const raw = String(inq.product ?? inq.productName ?? inq.requirement ?? inq.message ?? "").trim().toLowerCase()
    if (!raw || raw.length < 3 || !KI_GEM_FOGGING_RE.test(raw)) continue
    gemInqMap.set(raw, (gemInqMap.get(raw) ?? 0) + 1)
  }

  for (const [term, count] of gemInqMap) {
    const intent = classifyIntent(term)
    const resolvedIntent: KeywordIntent = intent ?? "dealer_acquisition"
    const resolvedTheme: AdGroupTheme = intentToTheme(intent) ?? "gem"
    const source: KeywordSource = intent === "oem_authorization" ? "oem_conversion" : "dealer_conversion"
    const key = `${term}::${source}`
    if (seen.has(key)) continue
    const confidence = Math.min(82, 62 + count * 4)
    const { matchType, reason: matchTypeReason } = assignMatchType(term, resolvedIntent, confidence, source)
    keywords.push({
      text: term, funnel,
      intent: resolvedIntent, matchType, matchTypeReason, confidence,
      expectedLeadQuality: "high",
      reason: `GeM inquiry: ${count} government buyer${count > 1 ? "s" : ""} expressed interest in "${term}" via GeM inquiry form.`,
      source,
      discoveryMethod: "gem_inquiry_form",
      adGroupTheme: resolvedTheme,
    })
    seen.add(key)
  }

  return keywords.sort((a, b) => computeEffectiveScore(b) - computeEffectiveScore(a))
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
    if (isAntiFogFalsePositive(query)) return []  // anti-fog coating/film, not a fogging machine

    const intent = classifyIntent(query)
    const theme  = intentToTheme(intent)
    if (!theme) return []

    const impressions = Number(row.impressions ?? 0)
    const confidence  = impressions >= 100 ? 90 : impressions >= 10 ? 75 : 60
    const { matchType, reason: matchTypeReason } = assignMatchType(query, intent, confidence, "gsc")
    const discoveryMethod = impressions >= 100 ? "gsc_high_impression" : "gsc_impression"

    // Bucket B: bare generic product terms — classified but not deployed.
    // These have high impressions and 0 clicks; deploy after CTR signal emerges.
    const observeOnly = intent === "machine_purchase" && OBSERVE_ONLY_RE.test(query)

    return [{
      text: query, funnel, intent, matchType, matchTypeReason, confidence,
      expectedLeadQuality: computeLeadQuality(intent, matchType, confidence),
      reason:  `GSC: ${impressions} impression${impressions !== 1 ? "s" : ""} on 100xcircle.com. ${matchTypeReason}`,
      source:  "gsc" as const,
      discoveryMethod,
      adGroupTheme: theme,
      impressions,
      ...(observeOnly ? { observeOnly: true } : {}),
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

export interface GeMRejection {
  original:    string
  normalized:  string
  rejectClass: GeMRejectClass | "agricultural_filter"
  rejectReason: string
}

async function extractFromGeM(
  db:         Db,
  funnel:     Funnel,
  rejections: GeMRejection[],  // caller-provided array, populated in-place for run logging
): Promise<GeneratedKeyword[]> {
  const contracts = await db
    .collection("gem_contracts")
    .find(
      { product_name: { $regex: KI_GEM_FOGGING_RE } },
      { projection: { product_name: 1, contract_date_dt: 1 } },
    )
    .sort({ contract_date_dt: -1 })
    .limit(1000)
    .toArray()

  // nameCount maps shortform → { count, usabilityScore, originalRaw }
  const nameCount = new Map<string, { count: number; usabilityScore: number; originalRaw: string }>()

  for (const c of contracts) {
    const raw = String(c.product_name ?? "").trim()
    if (!raw || raw.length < 5) continue

    // Step 1: basic normalization (lowercase, punctuation, stop words)
    const normalized = raw
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\b(?:is|as|for|with|and|the|of|in|on|by|at)\b/g, " ")
      .replace(/\s+/g, " ")
      .trim()

    // Step 2: agricultural exclusion guard (TIER_B contamination prevention)
    if (isExcludedGeMProduct(normalized)) {
      rejections.push({ original: raw, normalized,
        rejectClass: "agricultural_filter",
        rejectReason: "Agricultural or off-target product (TIER_B exclusion)" })
      continue
    }

    // Step 3: strip filler words with no keyword value
    const defilled = normalized.replace(GEM_FILLER_RE, " ").replace(/\s+/g, " ").trim()

    // Step 4: strip company suffix + preceding proper-name word
    //   "Radiant Enterprise ABS Portable Disinfectant Fogging Machine"
    //   → strip "enterprise" + "radiant" → "ABS Portable Disinfectant Fogging Machine"
    const decompanied = stripCompanySuffixes(defilled)

    // Step 5: take first 6 meaningful words
    const shortform = decompanied.split(" ").filter(Boolean).slice(0, 6).join(" ")
    if (shortform.split(" ").length < 2 || shortform.length < 6) continue

    // Step 6: quality filter (4-gate classification)
    const usability = checkGeMUsability(shortform)
    if (!usability.pass) {
      rejections.push({ original: raw, normalized: shortform,
        rejectClass: usability.rejectClass!,
        rejectReason: usability.rejectReason! })
      continue
    }

    const existing = nameCount.get(shortform)
    if (!existing) {
      nameCount.set(shortform, { count: 1, usabilityScore: usability.score, originalRaw: raw })
    } else {
      nameCount.set(shortform, {
        count:         existing.count + 1,
        usabilityScore: Math.max(existing.usabilityScore, usability.score),
        originalRaw:   existing.originalRaw,  // keep first-seen raw name as the trace anchor
      })
    }
  }

  const keywords: GeneratedKeyword[] = []
  for (const [shortform, { count, usabilityScore, originalRaw }] of nameCount) {
    // Normalization converts "abs portable disinfectant fogging machine power"
    // → ["portable fogging machine", "disinfectant fogging machine"]
    keywords.push(...normalizeGeMToSearchPhrases(shortform, originalRaw, funnel, count, usabilityScore))
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
  // direct_buyer has no algorithmic expansion — it is GSC-signal driven only.
  // All direct_buyer keywords must come from real search impressions (Bucket A/B).
  direct_buyer: [],
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

// ── Effective score attachment ─────────────────────────────────────────────────
// Compute and attach effectiveScore to every keyword before dedup/selection.
// Done as a single pass so dedup and selectBest always have the score available.

function withEffectiveScores(kws: GeneratedKeyword[]): GeneratedKeyword[] {
  return kws.map(kw => ({ ...kw, effectiveScore: computeEffectiveScore(kw) }))
}

// ── Deduplication ─────────────────────────────────────────────────────────────
// When the same keyword text appears from multiple sources, keep the version
// with the highest effectiveScore. A GSC keyword at conf 60 (effective 78) beats
// an expansion keyword at conf 70 (effective 70).

function deduplicate(keywords: GeneratedKeyword[]): GeneratedKeyword[] {
  const seen = new Map<string, GeneratedKeyword>()
  for (const kw of keywords) {
    const key = `${kw.adGroupTheme}:${kw.text}`
    const ex  = seen.get(key)
    if (!ex || (kw.effectiveScore ?? 0) > (ex.effectiveScore ?? 0)) {
      seen.set(key, kw)
    }
  }
  return Array.from(seen.values())
}

// ── Selection ─────────────────────────────────────────────────────────────────
// Select best keywords per theme using effectiveScore as the primary sort key.
// Evidence-backed keywords outrank expansion even when their raw confidence is lower.

function selectBest(all: GeneratedKeyword[], theme: AdGroupTheme): GeneratedKeyword[] {
  const compareFn = (a: GeneratedKeyword, b: GeneratedKeyword) =>
    (b.effectiveScore ?? b.confidence) - (a.effectiveScore ?? a.confidence)

  const group  = all.filter(k => k.adGroupTheme === theme)
  const exact  = group.filter(k => k.matchType === "EXACT").sort(compareFn)
  const phrase = group.filter(k => k.matchType === "PHRASE").sort(compareFn)
  const broad  = group.filter(k => k.matchType === "BROAD").sort(compareFn)

  // Guarantee ≥1 EXACT + ≥1 PHRASE if available, then fill by effectiveScore
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
    "ads_search_terms",
    "rfq_conversion",
    "whatsapp_conversion",
    "phone_conversion",
    "dealer_conversion",
    "oem_conversion",
    "gsc",
    "ai_search",
    "gem_demand",
    "competitor",
    "indiamart",
    "expansion",
  ]
  // Sources that are expected to eventually have data — shown as pending_data when empty
  const pendingSources = new Set<KeywordSource>([
    "competitor", "indiamart", "whatsapp_conversion", "phone_conversion",
  ])
  return allSources.map(source => {
    const count = selected.filter(k => k.source === source).length
    const isPending = pendingSources.has(source) && count === 0
    return {
      source,
      count,
      pct:    total > 0 ? Math.round((count / total) * 100) : 0,
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

  // GeM rejection log — populated by extractFromGeM, stored in run document
  const gemRejections: GeMRejection[] = []

  // Run all signal sources in parallel — conversion signals run alongside GSC/Ads/GeM
  const [convKws, gscKws, adsKws, gemKws, aiKws] = await Promise.all([
    extractFromConversions(db, funnel),
    extractFromGSC(db, funnel),
    extractFromAdsSearchTerms(db, funnel),
    extractFromGeM(db, funnel, gemRejections),
    extractFromAISearch(db, funnel),
  ])

  // Pending sources (return empty arrays per governance / missing data)
  const competitorKws = extractFromCompetitorData()
  const indiamartKws  = extractFromIndiaMART()

  // Expansion fills any gaps — should become < 30% as real signals accumulate
  const expKws = generateExpansions(funnel)

  const all = deduplicate(withEffectiveScores([
    ...convKws,    // highest priority: proven conversion-backed keywords
    ...gscKws,
    ...adsKws,
    ...gemKws,
    ...aiKws,
    ...competitorKws,
    ...indiamartKws,
    ...expKws,
  ]))

  const byTheme: Record<AdGroupTheme, GeneratedKeyword[]> = {
    dealer:       selectBest(all, "dealer"),
    oem:          selectBest(all, "oem"),
    gem:          selectBest(all, "gem"),
    direct_buyer: selectBest(all, "direct_buyer"),  // Funnel B — includes Bucket A (active) + Bucket B (observeOnly)
  }

  // Funnel A flat list (for source contribution + expansion % — Funnel B tracked separately)
  const funnelAFlat = [...byTheme.dealer, ...byTheme.oem, ...byTheme.gem]
  // All keywords for bySource/byIntent reporting
  const flat = [...funnelAFlat, ...byTheme.direct_buyer]

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
    gemRejections,
    engineVersion: ENGINE_VERSION,
  }

  await db.collection(KEYWORD_INTELLIGENCE_COLL).insertOne({ ...run })
  return run
}
