/**
 * Growth OS — Campaign Viability Checker.
 *
 * Run BEFORE any campaign deployment or activation recommendation.
 * Computes:
 *   - Eligible keyword count (post-validator)
 *   - Estimated monthly search volume (GSC-backed or intent-tier estimate)
 *   - Estimated CPC range (intent-based, India B2B benchmarks)
 *   - Expected monthly clicks and spend
 *   - Viability tier: HIGH / MEDIUM / LOW
 *
 * If viability is LOW, mark "Low Viability Campaign" and do NOT recommend activation.
 *
 * CPC benchmarks (India B2B industrial equipment, June 2026):
 *   dealer_acquisition   ₹15–40  (B2B channel acquisition, competitive but niche)
 *   oem_authorization    ₹20–50  (high-value B2B, fewer bidders)
 *   gem_reseller         ₹10–30  (government procurement niche)
 *   machine_purchase     ₹10–25  (direct buyer, broader competition)
 *   commercial_general   ₹5–15   (generic commercial, lower intent)
 *
 * These replace the ₹0.01 placeholder that was causing zero-impression delivery.
 */

import type { Db } from "mongodb"

// ── CPC config ────────────────────────────────────────────────────────────────

export interface CPCRange {
  minINR: number
  maxINR: number
  recommendedINR: number
  rationale: string
}

export const CPC_BY_INTENT: Record<string, CPCRange> = {
  dealer_acquisition: {
    minINR: 15, maxINR: 40, recommendedINR: 22,
    rationale: "B2B channel acquisition — competitive niche, moderate bid needed for page-1 position",
  },
  oem_authorization: {
    minINR: 20, maxINR: 50, recommendedINR: 28,
    rationale: "High-value OEM/B2B commercial intent — fewer advertisers, higher CPA tolerance",
  },
  gem_reseller: {
    minINR: 10, maxINR: 30, recommendedINR: 18,
    rationale: "Government procurement niche — smaller buyer pool, moderate competition",
  },
  machine_purchase: {
    minINR: 10, maxINR: 25, recommendedINR: 15,
    rationale: "Direct buyer intent — broader competition from consumer/commercial mix",
  },
  commercial_general: {
    minINR: 5, maxINR: 15, recommendedINR: 10,
    rationale: "General commercial — low specificity, use PHRASE/EXACT to guard budget",
  },
}

export const DEFAULT_CPC: CPCRange = {
  minINR: 10, maxINR: 30, recommendedINR: 15,
  rationale: "Default estimate — no intent data available",
}

// Helper: INR → Google Ads micros (1 INR = 1,000,000 micros)
export function inrToMicros(inr: number): number {
  return Math.round(inr * 1_000_000)
}

// ── Volume estimation ─────────────────────────────────────────────────────────
// Monthly search volume estimates for India — intent-based tiers.
// Source: GSC impressions data takes priority; these are fallback estimates.

interface VolumeTier {
  min: number   // monthly searches
  max: number
  label: "high" | "medium" | "low"
}

const VOLUME_TIERS: Record<string, VolumeTier> = {
  // Machine purchase (Funnel B) — actual product searches, higher volume
  "thermal fogging machine":          { min: 1000, max: 5000, label: "high" },
  "mosquito fogging machine":         { min: 500,  max: 3000, label: "high" },
  "fogging machine manufacturer":     { min: 300,  max: 1500, label: "high" },
  "vehicle mounted fogging machine":  { min: 200,  max: 1000, label: "medium" },
  "ulv fogging machine":              { min: 200,  max: 800,  label: "medium" },
  "thermal fogger":                   { min: 500,  max: 2000, label: "high" },
  "ulv fogger":                       { min: 300,  max: 1500, label: "medium" },
  "fogging machine":                  { min: 2000, max: 8000, label: "high" },
  // Dealer / OEM (Funnel A) — niche B2B, lower volume
  "fogging machine dealership":       { min: 50,   max: 300,  label: "low" },
  "fogging machine dealer":           { min: 100,  max: 500,  label: "medium" },
  "oem authorization fogging machine":{ min: 20,   max: 100,  label: "low" },
  "gem fogging machine reseller":     { min: 50,   max: 200,  label: "low" },
}

// Intent-level fallback when keyword isn't in the exact map
const INTENT_VOLUME_FALLBACK: Record<string, VolumeTier> = {
  machine_purchase:   { min: 100, max: 1000, label: "medium" },
  dealer_acquisition: { min: 30,  max: 300,  label: "low" },
  oem_authorization:  { min: 10,  max: 100,  label: "low" },
  gem_reseller:       { min: 30,  max: 200,  label: "low" },
  commercial_general: { min: 50,  max: 500,  label: "medium" },
}

function estimateVolume(
  keyword: string,
  intent: string,
  gscImpressions?: number,
): { monthly: number; label: VolumeTier["label"]; source: "gsc" | "keyword_map" | "intent_estimate" } {
  // GSC impressions are 28-day rolling — multiply by ~1.07 for monthly
  if (gscImpressions && gscImpressions > 0) {
    const monthly = Math.round(gscImpressions * 1.07)
    return {
      monthly,
      label: monthly >= 500 ? "high" : monthly >= 100 ? "medium" : "low",
      source: "gsc",
    }
  }

  const mapped = VOLUME_TIERS[keyword.toLowerCase().trim()]
  if (mapped) return { monthly: Math.round((mapped.min + mapped.max) / 2), label: mapped.label, source: "keyword_map" }

  const fallback = INTENT_VOLUME_FALLBACK[intent] ?? { min: 30, max: 200, label: "low" as const }
  return { monthly: Math.round((fallback.min + fallback.max) / 2), label: fallback.label, source: "intent_estimate" }
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface KeywordViability {
  text:               string
  intent:             string
  eligible:           boolean
  estimatedMonthly:   number
  volumeLabel:        "high" | "medium" | "low"
  volumeSource:       "gsc" | "keyword_map" | "intent_estimate"
  cpcRange:           CPCRange
  cpcBidMicros:       number   // recommended bid in Google Ads micros
  searchVolumeConfidence: "high" | "medium" | "low"
  deploymentEligible: boolean
  deploymentReason?:  string
}

export type ViabilityTier = "HIGH" | "MEDIUM" | "LOW"

export interface CampaignViabilityReport {
  campaignName:           string
  funnel:                 string
  totalKeywords:          number
  eligibleKeywords:       number
  ineligibleKeywords:     number  // failed validator
  deploymentEligible:     number  // passed validator + volume gate
  estimatedMonthlyVolume: number
  estimatedMonthlyClicks: number  // clicks = volume × estimated CTR
  estimatedMonthlySpend:  number  // clicks × avgCPC
  avgCPCRange:            CPCRange
  viabilityScore:         number  // 0–100
  viabilityTier:          ViabilityTier
  recommendActivation:    boolean
  lowViabilityReason?:    string
  issues:                 string[]
  recommendations:        string[]
  keywordDetails:         KeywordViability[]
  checkedAt:              string
}

export interface ViabilityThresholds {
  minEligibleKeywords:    number
  minMonthlyVolume:       number
  minDeployableKeywords:  number
  minMonthlyClicks:       number
}

const THRESHOLDS_FUNNEL_A: ViabilityThresholds = {
  minEligibleKeywords:   5,
  minMonthlyVolume:      100,
  minDeployableKeywords: 5,
  minMonthlyClicks:      20,
}

const THRESHOLDS_FUNNEL_B: ViabilityThresholds = {
  minEligibleKeywords:   5,
  minMonthlyVolume:      500,
  minDeployableKeywords: 5,
  minMonthlyClicks:      50,
}

// ── GSC lookup ────────────────────────────────────────────────────────────────

async function lookupGSCImpressions(
  db: Db,
  keywords: string[],
): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  if (keywords.length === 0) return map

  const rows = await db.collection("gsc_query_rows")
    .find({ query: { $in: keywords } })
    .project({ query: 1, impressions: 1 })
    .toArray()

  for (const row of rows) {
    const q = String(row.query ?? "").toLowerCase().trim()
    map.set(q, Number(row.impressions ?? 0))
  }
  return map
}

// ── Main ──────────────────────────────────────────────────────────────────────

export async function checkCampaignViability(
  db: Db,
  opts: {
    campaignName:  string
    funnel:        "A" | "B" | "C"
    keywords: Array<{
      text:     string
      intent:   string
      eligible: boolean   // pre-validated by ads-keyword-validator
    }>
    dailyBudgetINR?: number
  },
): Promise<CampaignViabilityReport> {
  const thresholds = opts.funnel === "B" ? THRESHOLDS_FUNNEL_B : THRESHOLDS_FUNNEL_A
  const dailyBudget = opts.dailyBudgetINR ?? (opts.funnel === "A" ? 150 : 300)

  const eligibleKws = opts.keywords.filter(k => k.eligible)

  // Batch-lookup GSC impressions
  const gscMap = await lookupGSCImpressions(db, eligibleKws.map(k => k.text.toLowerCase()))

  const keywordDetails: KeywordViability[] = opts.keywords.map(kw => {
    const cpcRange = CPC_BY_INTENT[kw.intent] ?? DEFAULT_CPC
    const vol      = estimateVolume(kw.text, kw.intent, gscMap.get(kw.text.toLowerCase()))

    // Deployment eligibility: must pass validator AND have enough search volume
    const volOk = vol.monthly >= (opts.funnel === "B" ? 50 : 20)
    const deploymentEligible = kw.eligible && volOk

    const searchVolumeConfidence: "high" | "medium" | "low" =
      vol.source === "gsc" ? "high" :
      vol.source === "keyword_map" ? "medium" : "low"

    return {
      text:               kw.text,
      intent:             kw.intent,
      eligible:           kw.eligible,
      estimatedMonthly:   vol.monthly,
      volumeLabel:        vol.label,
      volumeSource:       vol.source,
      cpcRange,
      cpcBidMicros:       inrToMicros(cpcRange.recommendedINR),
      searchVolumeConfidence,
      deploymentEligible,
      deploymentReason:   !kw.eligible ? "Failed keyword validator"
                        : !volOk       ? `Low estimated volume (${vol.monthly}/month < threshold)`
                        : undefined,
    }
  })

  const eligible    = keywordDetails.filter(k => k.eligible)
  const deployable  = keywordDetails.filter(k => k.deploymentEligible)
  const ineligible  = keywordDetails.filter(k => !k.eligible)

  const totalVolume = deployable.reduce((s, k) => s + k.estimatedMonthly, 0)
  const avgCPC      = deployable.length > 0
    ? deployable.reduce((s, k) => s + k.cpcRange.recommendedINR, 0) / deployable.length
    : DEFAULT_CPC.recommendedINR

  const estimatedCTR = opts.funnel === "B" ? 0.04 : 0.03  // 4% Funnel B, 3% Funnel A estimate
  const estimatedClicks = Math.round(totalVolume * estimatedCTR)
  const estimatedSpend  = Math.round(estimatedClicks * avgCPC)

  // Viability scoring
  const issues: string[] = []
  const recommendations: string[] = []
  let viabilityScore = 100

  if (eligible.length < thresholds.minEligibleKeywords) {
    issues.push(`Only ${eligible.length} eligible keywords (minimum: ${thresholds.minEligibleKeywords})`)
    viabilityScore -= 30
    recommendations.push(`Add more product/dealer/OEM keywords. Currently ${ineligible.length} rejected by validator.`)
  }

  if (deployable.length < thresholds.minDeployableKeywords) {
    issues.push(`Only ${deployable.length} keywords meet volume threshold (minimum: ${thresholds.minDeployableKeywords})`)
    viabilityScore -= 25
    recommendations.push("Expand to broader match types or add high-volume product terms (thermal fogging machine, mosquito fogging machine).")
  }

  if (totalVolume < thresholds.minMonthlyVolume) {
    issues.push(`Estimated ${totalVolume} monthly searches — below threshold of ${thresholds.minMonthlyVolume}`)
    viabilityScore -= 20
    recommendations.push(`Funnel B terms have higher volume (1000–5000/month). Consider prioritising direct-buyer keywords.`)
  }

  if (estimatedClicks < thresholds.minMonthlyClicks) {
    issues.push(`Estimated ${estimatedClicks} clicks/month — below threshold of ${thresholds.minMonthlyClicks}`)
    viabilityScore -= 15
    recommendations.push(`Increase daily budget to ₹${Math.max(dailyBudget * 2, 300)}/day or add higher-volume keywords.`)
  }

  // Budget adequacy check
  const dailyClicks = Math.round(estimatedClicks / 30)
  const dailySpend  = dailyClicks * avgCPC
  if (dailySpend > dailyBudget * 1.5) {
    issues.push(`Daily spend estimate ₹${Math.round(dailySpend)} exceeds budget ₹${dailyBudget}`)
    recommendations.push(`Increase budget to ₹${Math.round(dailySpend * 1.2)}/day or reduce keyword list.`)
    viabilityScore -= 10
  }

  // CPC sanity check — warn if keywords were previously bidding at ₹0.01
  const avgRecommendedCPC = deployable.length > 0 ? avgCPC : DEFAULT_CPC.recommendedINR
  if (avgRecommendedCPC < 5) {
    issues.push("Recommended CPC below ₹5 — unlikely to win any auctions in India B2B")
    recommendations.push(`Set keyword-level CPCs to ₹${DEFAULT_CPC.recommendedINR}+ for any impressions.`)
    viabilityScore -= 20
  }

  viabilityScore = Math.max(0, Math.min(100, viabilityScore))

  const viabilityTier: ViabilityTier =
    viabilityScore >= 70 ? "HIGH" :
    viabilityScore >= 40 ? "MEDIUM" : "LOW"

  const recommendActivation = viabilityTier !== "LOW" && deployable.length >= thresholds.minDeployableKeywords

  const avgCPCRange: CPCRange = {
    minINR:         Math.round(deployable.reduce((s, k) => s + k.cpcRange.minINR, 0) / Math.max(1, deployable.length)),
    maxINR:         Math.round(deployable.reduce((s, k) => s + k.cpcRange.maxINR, 0) / Math.max(1, deployable.length)),
    recommendedINR: Math.round(avgRecommendedCPC),
    rationale:      `Weighted average across ${deployable.length} deployable keywords`,
  }

  if (!recommendActivation) {
    recommendations.unshift(
      viabilityTier === "LOW"
        ? `LOW VIABILITY CAMPAIGN — Do not activate. ${issues[0] ?? "Insufficient signal."}. Resolve issues before deploying.`
        : `Review ${issues.length} issue(s) before activating.`,
    )
  }

  return {
    campaignName:           opts.campaignName,
    funnel:                 opts.funnel,
    totalKeywords:          opts.keywords.length,
    eligibleKeywords:       eligible.length,
    ineligibleKeywords:     ineligible.length,
    deploymentEligible:     deployable.length,
    estimatedMonthlyVolume: totalVolume,
    estimatedMonthlyClicks: estimatedClicks,
    estimatedMonthlySpend:  estimatedSpend,
    avgCPCRange,
    viabilityScore,
    viabilityTier,
    recommendActivation,
    lowViabilityReason:     viabilityTier === "LOW" ? issues[0] : undefined,
    issues,
    recommendations,
    keywordDetails,
    checkedAt: new Date().toISOString(),
  }
}
