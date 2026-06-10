/**
 * Phase 2C: Negative Keyword Intelligence Engine.
 *
 * Sources negatives from three channels:
 *   1. category_rule — known irrelevant intent clusters for Funnel A (dealer acquisition)
 *   2. gsc_signal — GSC queries that appeared for our site but are non-dealer intent
 *   3. intent_mismatch — queries that could attract buyer (Funnel B) traffic into Funnel A
 *
 * Every negative keyword stores: reason, source, confidence
 */

import type { Db } from "mongodb"
import clientPromise from "@/lib/mongodb"
import type { GeneratedKeyword } from "@/lib/growth-os/ads-keyword-intelligence"

// ── Types ────────────────────────────────────────────────────────────────────

export type NegativeSource =
  | "category_rule"     // known irrelevant categories for Funnel A
  | "gsc_signal"        // GSC query with non-dealer intent
  | "intent_mismatch"   // buyer intent bleeding into dealer campaign

export interface GeneratedNegative {
  text:       string
  matchType:  "EXACT" | "PHRASE" | "BROAD"
  reason:     string   // human-readable explanation
  source:     NegativeSource
  confidence: number   // 0–100
}

export interface NegativeIntelligenceRun {
  runId:         string
  generatedAt:   string
  totalCount:    number
  negatives:     GeneratedNegative[]
  bySource:      Partial<Record<NegativeSource, number>>
  engineVersion: string
}

export const NEGATIVE_INTELLIGENCE_COLL = "ads_negative_intelligence"
const ENGINE_VERSION = "v1.0.0"

// ── Category rule negatives ───────────────────────────────────────────────────
// These are permanent structural negatives for Funnel A (dealer acquisition).
// Each category has a semantic purpose, not a keyword list.

const CATEGORY_RULES: Array<{
  terms:      string[]
  matchType:  "EXACT" | "PHRASE" | "BROAD"
  reason:     string
  confidence: number
}> = [
  {
    terms:      ["repair", "service center", "spare part", "maintenance", "warranty claim", "fix", "broken", "not working"],
    matchType:  "PHRASE",
    reason:     "Product maintenance intent — post-sale, not dealer acquisition",
    confidence: 95,
  },
  {
    terms:      ["price", "cost", "rate", "how much", "cheap", "affordable", "discount", "offer", "lowest price"],
    matchType:  "BROAD",
    reason:     "Price-comparison intent — buyer, not prospective dealer",
    confidence: 90,
  },
  {
    terms:      ["buy", "purchase", "order", "online", "amazon", "flipkart", "indiamart", "shop"],
    matchType:  "BROAD",
    reason:     "Direct purchase intent — buyer funnel (Funnel B), not dealer acquisition",
    confidence: 92,
  },
  {
    terms:      ["rent", "rental", "hire", "lease", "on hire"],
    matchType:  "PHRASE",
    reason:     "Rental intent — neither buyer nor dealer acquisition",
    confidence: 95,
  },
  {
    terms:      ["how to use", "how to operate", "manual", "user guide", "tutorial", "video"],
    matchType:  "PHRASE",
    reason:     "Operational/instructional content — existing customer, not prospective dealer",
    confidence: 93,
  },
  {
    terms:      ["pesticide", "chemical", "insecticide", "spray solution", "liquid", "chemical only"],
    matchType:  "PHRASE",
    reason:     "Chemical/consumable queries — not fogging machine dealer intent",
    confidence: 88,
  },
  {
    terms:      ["mist fan", "nebulizer", "humidifier", "air freshener", "room spray", "sanitizer machine", "disinfectant spray"],
    matchType:  "PHRASE",
    reason:     "Adjacent product categories — wrong product vertical",
    confidence: 90,
  },
  {
    terms:      ["second hand", "used", "old", "refurbished", "second-hand"],
    matchType:  "PHRASE",
    reason:     "Used/refurbished product intent — not relevant for new dealer program",
    confidence: 92,
  },
  {
    terms:      ["home use", "domestic", "for home", "personal use", "household"],
    matchType:  "PHRASE",
    reason:     "Residential/consumer use — dealer program targets commercial/government buyers",
    confidence: 88,
  },
  {
    terms:      ["review", "comparison", "vs", "alternative", "rating", "feedback", "complaint"],
    matchType:  "PHRASE",
    reason:     "Evaluation/review intent — research, not dealer acquisition",
    confidence: 85,
  },
]

function buildCategoryNegatives(): GeneratedNegative[] {
  return CATEGORY_RULES.flatMap(rule =>
    rule.terms.map(term => ({
      text:       term,
      matchType:  rule.matchType,
      reason:     rule.reason,
      source:     "category_rule" as NegativeSource,
      confidence: rule.confidence,
    }))
  )
}

// ── GSC signal negatives ──────────────────────────────────────────────────────
// GSC queries that triggered our pages but showed non-dealer intent.
// These are real search signals, making them high-confidence negatives.

async function extractGSCNegatives(
  db:               Db,
  positiveKeywords: GeneratedKeyword[],
): Promise<GeneratedNegative[]> {
  const positiveTexts = new Set(positiveKeywords.map(k => k.text))

  const rows = await db
    .collection("gsc_query_rows")
    .find({ impressions: { $gte: 1 } })
    .sort({ impressions: -1 })
    .limit(500)
    .toArray()

  const NON_DEALER_SIGNALS = [
    "price", "cost", "buy", "purchase", "how", "what", "which",
    "repair", "service", "manual", "review", "compare", "vs",
    "cheap", "affordable", "discount", "rent", "hire", "used",
    "second hand", "home", "domestic", "personal",
  ]

  const negatives: GeneratedNegative[] = []
  for (const row of rows) {
    const query = String(row.query ?? "").trim().toLowerCase()
    if (!query || query.length < 3) continue
    if (positiveTexts.has(query)) continue  // already a positive keyword

    const hasNonDealerSignal = NON_DEALER_SIGNALS.some(sig => query.includes(sig))
    if (!hasNonDealerSignal) continue

    const impressions = Number(row.impressions ?? 0)
    negatives.push({
      text:       query,
      matchType:  "PHRASE",
      reason:     `GSC signal: query appeared ${impressions} time${impressions !== 1 ? "s" : ""} but shows non-dealer intent`,
      source:     "gsc_signal",
      confidence: impressions >= 10 ? 85 : 70,
    })
  }

  return negatives
}

// ── Intent mismatch negatives ─────────────────────────────────────────────────
// Buyer-intent terms that, if not negated, would bring Funnel B traffic
// into Funnel A campaigns — wasting budget on wrong audience.

const BUYER_INTENT_TERMS: Array<{ text: string; reason: string }> = [
  { text: "price list",          reason: "Buyer price list intent — belongs in Funnel B (Machine Sales)" },
  { text: "buy fogging machine", reason: "Direct purchase intent — Funnel B, not Funnel A" },
  { text: "fogging machine cost", reason: "Cost inquiry — buyer, not dealer prospect" },
  { text: "fogging machine rate", reason: "Rate inquiry — buyer price shopping" },
  { text: "fogging machine mrp",  reason: "MRP lookup — consumer intent, not dealer" },
  { text: "fogging machine specification", reason: "Product spec lookup — not dealer acquisition" },
  { text: "500 watt fogging machine", reason: "Consumer product spec — buyer funnel" },
  { text: "1000 watt fogging machine", reason: "Consumer product spec — buyer funnel" },
]

function buildIntentMismatchNegatives(): GeneratedNegative[] {
  return BUYER_INTENT_TERMS.map(item => ({
    text:       item.text,
    matchType:  "PHRASE" as const,
    reason:     item.reason,
    source:     "intent_mismatch" as NegativeSource,
    confidence: 90,
  }))
}

// ── Deduplication ─────────────────────────────────────────────────────────────

function deduplicateNegatives(negatives: GeneratedNegative[]): GeneratedNegative[] {
  const seen = new Map<string, GeneratedNegative>()
  for (const neg of negatives) {
    const key = `${neg.matchType}:${neg.text}`
    const ex  = seen.get(key)
    if (!ex || neg.confidence > ex.confidence) seen.set(key, neg)
  }
  return Array.from(seen.values()).sort((a, b) => b.confidence - a.confidence)
}

// ── Main ──────────────────────────────────────────────────────────────────────

export async function runNegativeIntelligence(opts: {
  positiveKeywords: GeneratedKeyword[]
}): Promise<NegativeIntelligenceRun> {
  const db = (await clientPromise).db() as Db
  const { positiveKeywords } = opts

  const [gscNegatives] = await Promise.all([
    extractGSCNegatives(db, positiveKeywords),
  ])

  const all = deduplicateNegatives([
    ...buildCategoryNegatives(),
    ...buildIntentMismatchNegatives(),
    ...gscNegatives,
  ])

  const bySource = all.reduce((acc, n) => {
    acc[n.source] = (acc[n.source] ?? 0) + 1
    return acc
  }, {} as Partial<Record<NegativeSource, number>>)

  const runId = `nki_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  const run: NegativeIntelligenceRun = {
    runId, generatedAt: new Date().toISOString(),
    totalCount: all.length, negatives: all, bySource, engineVersion: ENGINE_VERSION,
  }

  await db.collection(NEGATIVE_INTELLIGENCE_COLL).insertOne({ ...run })
  return run
}
