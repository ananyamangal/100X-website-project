/**
 * Growth OS — Auto-Negative Engine.
 *
 * Daily detection of low-quality queries that should become negative keywords.
 * Runs against GSC queries + Ads search term report.
 *
 * Detection categories:
 *   1. Anti-fog / coating / defog (wrong product category)
 *   2. Consumer / home-use (wrong buyer type)
 *   3. Job seeker / career queries
 *   4. Service / repair / post-sale (after-sale, not buyer)
 *   5. Rental / hire (not purchase)
 *   6. Informational / educational (research, not commercial)
 *   7. E-commerce platform leakage (amazon, flipkart searches)
 *   8. Entertainment / stage fog (wrong context)
 *   9. Competitor brand (if not running competitor campaigns)
 *  10. Agricultural off-target (sprayers, tillers, reapers — not foggers)
 *
 * Output: Approval Queue items (never applied automatically).
 * Human must approve before any negative is activated.
 *
 * GOVERNANCE: Draft negatives only. Human approval mandatory.
 */

import type { Db } from "mongodb"
import clientPromise from "@/lib/mongodb"
import { pushBatch, type ApprovalItem } from "@/lib/growth-os/approval-queue"

// ── Collection names ──────────────────────────────────────────────────────────

const COLL_GSC        = "gsc_query_rows"
const COLL_SEARCHTERM = "ads_searchterm_rows"
export const AUTO_NEGATIVE_COLL = "ads_auto_negative_runs"

// ── Types ────────────────────────────────────────────────────────────────────

export type NegativeCategory =
  | "anti_fog_coating"
  | "consumer_home_use"
  | "job_seeker"
  | "service_repair"
  | "rental_hire"
  | "informational"
  | "ecommerce_platform"
  | "entertainment_stage"
  | "competitor_brand"
  | "agricultural_off_target"

export interface DetectedNegative {
  query:       string
  category:    NegativeCategory
  reason:      string
  matchType:   "EXACT" | "PHRASE"
  confidence:  number   // 0–100
  source:      "gsc" | "ads_search_terms"
  impressions: number
  clicks:      number
  conversions: number
  spend?:      number
}

export interface AutoNegativeRun {
  runId:        string
  detectedCount: number
  byCategory:   Partial<Record<NegativeCategory, number>>
  detected:     DetectedNegative[]
  pushedToQueue: number
  generatedAt:  string
}

// ── Detection pattern library ─────────────────────────────────────────────────

interface NegativePattern {
  category:   NegativeCategory
  re:         RegExp
  matchType:  "EXACT" | "PHRASE"
  reason:     string
  confidence: number
}

const NEGATIVE_PATTERNS: NegativePattern[] = [
  // Anti-fog / defog / coating — wrong product entirely
  { category: "anti_fog_coating",   re: /\banti[\s-]?fog(?:ging)?\b/i,            matchType: "PHRASE", reason: "Anti-fog coating product — not a fogging machine", confidence: 98 },
  { category: "anti_fog_coating",   re: /\bde[\s-]?fog(?:ging)?\b/i,              matchType: "PHRASE", reason: "Defog product — not a fogging machine", confidence: 95 },
  { category: "anti_fog_coating",   re: /\banti[\s-]?mist\b/i,                    matchType: "PHRASE", reason: "Anti-mist coating — not a fogging machine", confidence: 95 },
  { category: "anti_fog_coating",   re: /\banti[\s-]?condensation\b/i,            matchType: "PHRASE", reason: "Anti-condensation product", confidence: 95 },
  { category: "anti_fog_coating",   re: /\bfogging\s+agent\b/i,                   matchType: "EXACT",  reason: "Fogging agent = chemical solution, not machine", confidence: 90 },
  { category: "anti_fog_coating",   re: /\bfog(?:ging)?\s+(?:coating|film|solution|spray\s+only)\b/i, matchType: "PHRASE", reason: "Fog coating product", confidence: 92 },
  { category: "anti_fog_coating",   re: /\bwindshield\b/i,                        matchType: "PHRASE", reason: "Windshield anti-fog — automotive, not fogger", confidence: 96 },
  { category: "anti_fog_coating",   re: /\bglass\s+coating\b/i,                   matchType: "PHRASE", reason: "Glass coating — not a fogging machine", confidence: 93 },
  { category: "anti_fog_coating",   re: /\blens\s+fog(?:ging)?\b/i,               matchType: "PHRASE", reason: "Lens fogging — eyewear context", confidence: 92 },

  // Consumer / home use — wrong buyer type for B2B fogging machines
  { category: "consumer_home_use",  re: /\bfor\s+(?:home|room|indoor|domestic|household|personal|garden|bedroom)\b/i, matchType: "PHRASE", reason: "Consumer home-use query — not institutional buyer", confidence: 97 },
  { category: "consumer_home_use",  re: /\bhome\s+use\b/i,                        matchType: "PHRASE", reason: "Home use — not institutional procurement", confidence: 97 },
  { category: "consumer_home_use",  re: /\broom\s+fog(?:ger|ging)?\b/i,           matchType: "PHRASE", reason: "Room fogger — consumer product", confidence: 96 },
  { category: "consumer_home_use",  re: /\bmini\s+fog(?:ger|ging)?\b/i,           matchType: "PHRASE", reason: "Mini fogger — consumer/hobby segment", confidence: 92 },
  { category: "consumer_home_use",  re: /\bsmall\s+fog(?:ger|ging)?\b/i,          matchType: "PHRASE", reason: "Small fogger — likely consumer use", confidence: 88 },
  { category: "consumer_home_use",  re: /\bportable.*for\s+home\b/i,              matchType: "PHRASE", reason: "Portable fogger for home — consumer", confidence: 95 },

  // Job seeker — not a buyer at all
  { category: "job_seeker",         re: /\bjob(?:s)?\b.*fog(?:ger|ging)?\b/i,     matchType: "PHRASE", reason: "Job/career search — not a buyer", confidence: 97 },
  { category: "job_seeker",         re: /\bfog(?:ger|ging)?.*\bjob(?:s)?\b/i,     matchType: "PHRASE", reason: "Job/career search — not a buyer", confidence: 97 },
  { category: "job_seeker",         re: /\bvacancy\b/i,                           matchType: "PHRASE", reason: "Job vacancy search", confidence: 96 },
  { category: "job_seeker",         re: /\bcareer\b.*fog/i,                       matchType: "PHRASE", reason: "Career query — not a buyer", confidence: 94 },
  { category: "job_seeker",         re: /\boperator\s+(?:job|vacancy|salary)\b/i, matchType: "PHRASE", reason: "Fogger operator job seeker", confidence: 93 },
  { category: "job_seeker",         re: /\bsalary\b/i,                            matchType: "PHRASE", reason: "Salary query — job seeker", confidence: 90 },

  // Service / repair / post-sale — existing owner, not a buyer
  { category: "service_repair",     re: /\brepair\b/i,                            matchType: "PHRASE", reason: "Repair query — existing owner, not buyer", confidence: 94 },
  { category: "service_repair",     re: /\bservice\s+cent(?:re|er)\b/i,           matchType: "PHRASE", reason: "Service center query — post-sale", confidence: 96 },
  { category: "service_repair",     re: /\bspare\s+part(?:s)?\b/i,               matchType: "PHRASE", reason: "Spare parts — existing owner", confidence: 95 },
  { category: "service_repair",     re: /\bmaintenance\b/i,                       matchType: "PHRASE", reason: "Maintenance query — post-sale support", confidence: 90 },
  { category: "service_repair",     re: /\bnot\s+working\b/i,                     matchType: "PHRASE", reason: "Troubleshooting — existing owner", confidence: 96 },
  { category: "service_repair",     re: /\bbroken\b/i,                            matchType: "PHRASE", reason: "Broken machine — existing owner", confidence: 92 },
  { category: "service_repair",     re: /\bwarranty\s+claim\b/i,                  matchType: "PHRASE", reason: "Warranty claim — post-sale", confidence: 95 },
  { category: "service_repair",     re: /\bfog(?:ger|ging)?\s+fix\b/i,           matchType: "PHRASE", reason: "Fix/repair query — existing owner", confidence: 93 },

  // Rental / hire
  { category: "rental_hire",        re: /\brent(?:al)?\b/i,                       matchType: "PHRASE", reason: "Rental intent — not purchasing", confidence: 96 },
  { category: "rental_hire",        re: /\bon\s+hire\b/i,                         matchType: "PHRASE", reason: "Hire intent — not purchasing", confidence: 97 },
  { category: "rental_hire",        re: /\bhire\b.*fog/i,                         matchType: "PHRASE", reason: "Hire intent — not purchasing", confidence: 94 },
  { category: "rental_hire",        re: /\blease\b.*fog/i,                        matchType: "PHRASE", reason: "Lease intent — not purchasing", confidence: 90 },
  { category: "rental_hire",        re: /\bper\s+day\s+rate\b/i,                  matchType: "PHRASE", reason: "Per-day rate — rental pricing, not purchase", confidence: 92 },

  // Informational / educational
  { category: "informational",      re: /\bhow\s+to\s+(?:use|operate|make|build)\b/i, matchType: "PHRASE", reason: "How-to / operational — not buying", confidence: 93 },
  { category: "informational",      re: /\bwhat\s+is\s+a?\s+fog(?:ger|ging)?\b/i, matchType: "PHRASE", reason: "What-is query — informational intent", confidence: 95 },
  { category: "informational",      re: /\bmeaning\s+of\b/i,                      matchType: "PHRASE", reason: "Meaning query — educational", confidence: 96 },
  { category: "informational",      re: /\bdefinition\b/i,                        matchType: "PHRASE", reason: "Definition query — educational", confidence: 96 },
  { category: "informational",      re: /\btutorial\b/i,                          matchType: "PHRASE", reason: "Tutorial — educational", confidence: 94 },
  { category: "informational",      re: /\bmanual\b.*fog/i,                       matchType: "PHRASE", reason: "Manual/guide — existing user", confidence: 90 },
  { category: "informational",      re: /\breview(?:s)?\b/i,                      matchType: "PHRASE", reason: "Review query — pre-purchase research, not B2B intent", confidence: 82 },
  { category: "informational",      re: /\bcompare\b.*fog/i,                      matchType: "PHRASE", reason: "Comparison query — research stage", confidence: 80 },
  { category: "informational",      re: /\bvs\b.*fog/i,                           matchType: "PHRASE", reason: "Comparison vs. query", confidence: 80 },

  // E-commerce platform leakage — consumer channel, not B2B direct
  { category: "ecommerce_platform", re: /\bamazon\b/i,                            matchType: "PHRASE", reason: "Amazon — consumer e-commerce platform", confidence: 98 },
  { category: "ecommerce_platform", re: /\bflipkart\b/i,                          matchType: "PHRASE", reason: "Flipkart — consumer e-commerce platform", confidence: 98 },
  { category: "ecommerce_platform", re: /\bmeesho\b/i,                            matchType: "PHRASE", reason: "Meesho — consumer platform", confidence: 98 },
  { category: "ecommerce_platform", re: /\bsnapdeal\b/i,                          matchType: "PHRASE", reason: "Snapdeal — consumer platform", confidence: 98 },
  { category: "ecommerce_platform", re: /\bonline\s+shop(?:ping)?\b/i,            matchType: "PHRASE", reason: "Online shopping query — consumer channel", confidence: 88 },
  { category: "ecommerce_platform", re: /\bsecond[\s-]?hand\b/i,                  matchType: "PHRASE", reason: "Second-hand — used goods, not new procurement", confidence: 96 },
  { category: "ecommerce_platform", re: /\bused\s+fog(?:ger|ging)?\b/i,           matchType: "PHRASE", reason: "Used fogger — not new procurement", confidence: 95 },

  // Entertainment / stage fog — completely different product
  { category: "entertainment_stage", re: /\bhalloween\b/i,                        matchType: "PHRASE", reason: "Halloween fog machine — entertainment, not commercial", confidence: 99 },
  { category: "entertainment_stage", re: /\bparty\s+fog\b/i,                      matchType: "PHRASE", reason: "Party fog machine — entertainment", confidence: 98 },
  { category: "entertainment_stage", re: /\bstage\s+(?:fog|smoke)\b/i,            matchType: "PHRASE", reason: "Stage effects — entertainment fog machine", confidence: 98 },
  { category: "entertainment_stage", re: /\bdisco\s+fog\b/i,                      matchType: "PHRASE", reason: "Disco fog — entertainment", confidence: 99 },
  { category: "entertainment_stage", re: /\bdry\s+ice\s+fog\b/i,                  matchType: "PHRASE", reason: "Dry ice fog — events/entertainment", confidence: 97 },
  { category: "entertainment_stage", re: /\bwedding\s+fog\b/i,                    matchType: "PHRASE", reason: "Wedding fog — events", confidence: 98 },

  // Agricultural off-target — not fogging machines
  { category: "agricultural_off_target", re: /\bknapsack\s+sprayer\b/i,           matchType: "PHRASE", reason: "Knapsack hand-sprayer — agricultural, not fogger", confidence: 93 },
  { category: "agricultural_off_target", re: /\bpower\s+sprayer\b/i,              matchType: "PHRASE", reason: "Power sprayer — agricultural, not fogger", confidence: 85 },
  { category: "agricultural_off_target", re: /\btractor\s+(?:mount|spray)\b/i,    matchType: "PHRASE", reason: "Tractor sprayer — agricultural, not thermal fogger", confidence: 88 },
  { category: "agricultural_off_target", re: /\breaper\b/i,                       matchType: "PHRASE", reason: "Reaper — agricultural machinery, not fogger", confidence: 99 },
  { category: "agricultural_off_target", re: /\btiller\b/i,                       matchType: "PHRASE", reason: "Tiller — agricultural machinery, not fogger", confidence: 99 },
  { category: "agricultural_off_target", re: /\bseeder\b/i,                       matchType: "PHRASE", reason: "Seeder — agricultural machinery, not fogger", confidence: 99 },
  { category: "agricultural_off_target", re: /\bharvester\b/i,                    matchType: "PHRASE", reason: "Harvester — agricultural machinery, not fogger", confidence: 99 },
  { category: "agricultural_off_target", re: /\bbrush\s*cutter\b/i,              matchType: "PHRASE", reason: "Brush cutter — agricultural, not fogger", confidence: 99 },
]

// ── Detection ─────────────────────────────────────────────────────────────────

function detectCategory(query: string): { category: NegativeCategory; reason: string; matchType: "EXACT" | "PHRASE"; confidence: number } | null {
  const q = query.toLowerCase().trim()
  for (const p of NEGATIVE_PATTERNS) {
    if (p.re.test(q)) {
      return { category: p.category, reason: p.reason, matchType: p.matchType, confidence: p.confidence }
    }
  }
  return null
}

// ── Main runner ───────────────────────────────────────────────────────────────

export async function runAutoNegativeEngine(
  opts: { minImpressions?: number; minConfidence?: number; pushToQueue?: boolean } = {},
): Promise<AutoNegativeRun> {
  const minImpressions = opts.minImpressions ?? 5
  const minConfidence  = opts.minConfidence  ?? 80
  const pushToQueue    = opts.pushToQueue    ?? true

  const client = await clientPromise
  const db     = client.db() as Db

  const detected: DetectedNegative[] = []
  const seen      = new Set<string>()

  // ── Scan GSC queries ──────────────────────────────────────────────────────
  const gscRows = await db.collection(COLL_GSC)
    .find({ impressions: { $gte: minImpressions } })
    .sort({ impressions: -1 })
    .limit(1000)
    .toArray()

  for (const row of gscRows) {
    const query = String(row.query ?? "").trim().toLowerCase()
    if (!query || seen.has(query)) continue
    const match = detectCategory(query)
    if (!match || match.confidence < minConfidence) continue

    seen.add(query)
    detected.push({
      query,
      category:    match.category,
      reason:      match.reason,
      matchType:   match.matchType,
      confidence:  match.confidence,
      source:      "gsc",
      impressions: Number(row.impressions ?? 0),
      clicks:      Number(row.clicks      ?? 0),
      conversions: 0,
    })
  }

  // ── Scan Ads search terms ─────────────────────────────────────────────────
  const adRows = await db.collection(COLL_SEARCHTERM)
    .find({})
    .limit(500)
    .toArray()

  for (const row of adRows) {
    const query = String(row.searchTerm ?? row.search_term ?? "").trim().toLowerCase()
    if (!query || seen.has(query)) continue
    const match = detectCategory(query)
    if (!match || match.confidence < minConfidence) continue

    seen.add(query)
    detected.push({
      query,
      category:    match.category,
      reason:      match.reason,
      matchType:   match.matchType,
      confidence:  match.confidence,
      source:      "ads_search_terms",
      impressions: Number(row.impressions ?? 0),
      clicks:      Number(row.clicks      ?? 0),
      conversions: Number(row.conversions ?? 0),
      spend:       Number(row.cost        ?? row.spend ?? 0),
    })
  }

  // Sort by: ads_search_terms first (wasted spend), then by impressions desc
  detected.sort((a, b) => {
    if (a.source !== b.source) return a.source === "ads_search_terms" ? -1 : 1
    return b.impressions - a.impressions
  })

  // ── Summarize by category ─────────────────────────────────────────────────
  const byCategory: Partial<Record<NegativeCategory, number>> = {}
  for (const d of detected) {
    byCategory[d.category] = (byCategory[d.category] ?? 0) + 1
  }

  // ── Push to approval queue ────────────────────────────────────────────────
  let pushedCount = 0
  if (pushToQueue && detected.length > 0) {
    const queueItems: Omit<ApprovalItem, "id" | "status" | "generatedAt" | "expiresAt">[] = detected.map(d => ({
      type:            "add_negative_keyword" as const,
      priority:        d.source === "ads_search_terms" && (d.spend ?? 0) > 0 ? "high" : "medium" as const,
      title:           `Negative keyword: "${d.query}" (${d.category})`,
      rationale:       `${d.reason}. Source: ${d.source}. ${d.impressions} impressions, ${d.clicks} clicks${d.spend ? `, ₹${d.spend.toFixed(0)} spend` : ""}.`,
      payload: {
        query:       d.query,
        matchType:   d.matchType,
        category:    d.category,
        source:      d.source,
        impressions: d.impressions,
        clicks:      d.clicks,
        conversions: d.conversions,
        spend:       d.spend,
      },
      estimatedImpact: d.source === "ads_search_terms" && (d.spend ?? 0) > 0
        ? `Stop wasting ₹${(d.spend ?? 0).toFixed(0)} on irrelevant query "${d.query}"`
        : `Prevent budget allocation to low-quality query "${d.query}"`,
      agentSource:    "auto-negative-engine",
      dataWindowDays: 30,
      confidence:     d.confidence,
    }))

    await pushBatch(db, queueItems)
    pushedCount = queueItems.length
  }

  const runId = `ane_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  const run: AutoNegativeRun = {
    runId,
    detectedCount: detected.length,
    byCategory,
    detected,
    pushedToQueue: pushedCount,
    generatedAt:  new Date().toISOString(),
  }

  await db.collection(AUTO_NEGATIVE_COLL).insertOne({ ...run })
  return run
}
