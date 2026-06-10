/**
 * Campaign Quality Scoring — FUV (Funnel A, Search only).
 * Five scores stored with every Deployment Record.
 */

import { QUALITY_THRESHOLDS, AD_GROUPS, LANDING_PAGE_PROFILES } from "@/lib/growth-os/ads-fuv-config"

// ── Types ───────────────────────────────────────────────────────────────────

export interface CampaignQualityScores {
  opportunityScore:      number // 0-100
  keywordQualityScore:   number // 0-100
  adCopyQualityScore:    number // 0-100
  landingPageScore:      number // 0-100 — weighted average across ad groups
  deploymentConfidence:  number // 0-100 — composite
  recommendation:        "recommended_for_deployment" | "needs_review"
  gaps: string[]                // human-readable gap explanations
}

export interface DemandSignal {
  qualifyingTermCount: number   // seed terms with real impressions
  totalImpressions:    number   // sum across qualifying terms
  adsSearchTermCount:  number   // search-term rows matched (0 if not synced)
  dealerOpportunityCount: number // from dealer engine (bonus signal)
  gscSyncAgeDays:      number   // days since last GSC sync
}

// ── Opportunity Score ───────────────────────────────────────────────────────

export function scoreOpportunity(signal: DemandSignal): number {
  const seedCount    = AD_GROUPS.reduce((s, g) => s + g.keywords.length, 0)
  const termRatio    = Math.min(signal.qualifyingTermCount / Math.max(seedCount, 1), 1)
  const impScore     = Math.min(signal.totalImpressions / 500, 1)           // 500+ impressions = max
  const adsBonus     = signal.adsSearchTermCount > 0 ? 10 : 0
  const dealerBonus  = signal.dealerOpportunityCount > 5 ? 10 : signal.dealerOpportunityCount > 0 ? 5 : 0
  const stalePenalty = signal.gscSyncAgeDays > QUALITY_THRESHOLDS.staleGscDays ? -15 : 0

  const raw = termRatio * 50 + impScore * 30 + adsBonus + dealerBonus + stalePenalty
  return Math.min(100, Math.max(0, Math.round(raw)))
}

// ── Keyword Quality Score ───────────────────────────────────────────────────

export interface KeywordSet {
  adGroup: string
  keywords: Array<{ text: string; matchType: "EXACT" | "PHRASE" | "BROAD" }>
  negativeCount: number
}

export function scoreKeywords(sets: KeywordSet[]): { score: number; gaps: string[] } {
  const gaps: string[] = []
  let total = 0

  for (const set of sets) {
    const types = new Set(set.keywords.map(k => k.matchType))
    const hasExact  = types.has("EXACT")
    const hasPhrase = types.has("PHRASE")
    const count     = set.keywords.length

    let groupScore = 0
    if (hasExact)  groupScore += 30
    else           gaps.push(`${set.adGroup}: no Exact match keywords — add high-intent Exact terms`)
    if (hasPhrase) groupScore += 25
    else           gaps.push(`${set.adGroup}: no Phrase match keywords`)
    groupScore += Math.min(count / QUALITY_THRESHOLDS.minKeywordsPerAdGroup, 1) * 25
    groupScore += Math.min(set.negativeCount / QUALITY_THRESHOLDS.negativeCountMin, 1) * 20

    total += groupScore
  }

  const score = sets.length > 0 ? Math.round(total / sets.length) : 0
  return { score: Math.min(100, score), gaps }
}

// ── Ad Copy Quality Score ───────────────────────────────────────────────────

export interface RSASpec {
  headlines:     string[]
  descriptions:  string[]
  callouts:      string[]
  sitelinkCount: number
}

export function scoreAdCopy(specs: RSASpec[]): { score: number; gaps: string[] } {
  const gaps: string[] = []
  let total = 0

  for (const spec of specs) {
    let s = 0
    const hl = spec.headlines.length
    const dl = spec.descriptions.length

    s += Math.min(hl / QUALITY_THRESHOLDS.minHeadlines, 1) * 35
    if (hl < QUALITY_THRESHOLDS.minHeadlines) gaps.push(`RSA: only ${hl} headlines (need ≥${QUALITY_THRESHOLDS.minHeadlines})`)

    s += Math.min(dl / QUALITY_THRESHOLDS.minDescriptions, 1) * 25
    if (dl < QUALITY_THRESHOLDS.minDescriptions) gaps.push(`RSA: only ${dl} descriptions (need ≥${QUALITY_THRESHOLDS.minDescriptions})`)

    s += spec.callouts.length > 0 ? 20 : 0
    if (spec.callouts.length === 0) gaps.push("RSA: no callout extensions")

    s += spec.sitelinkCount > 0 ? 20 : 0
    if (spec.sitelinkCount === 0) gaps.push("RSA: no sitelink extensions")

    total += s
  }

  const score = specs.length > 0 ? Math.round(total / specs.length) : 0
  return { score: Math.min(100, score), gaps }
}

// ── Landing Page Score ──────────────────────────────────────────────────────

export function scoreLandingPages(adGroupPages: Array<{ landingPage: string }>): {
  score: number
  gaps: string[]
  perPage: Array<{ page: string; score: number; gaps: string[] }>
} {
  const gaps: string[] = []
  const perPage: Array<{ page: string; score: number; gaps: string[] }> = []
  let total = 0

  for (const { landingPage } of adGroupPages) {
    const profile = LANDING_PAGE_PROFILES[landingPage] ?? { score: 60, gaps: ["No LP profile configured"] }
    perPage.push({ page: landingPage, score: profile.score, gaps: profile.gaps })
    if (profile.gaps.length > 0) gaps.push(...profile.gaps.map(g => `${landingPage}: ${g}`))
    total += profile.score
  }

  const score = adGroupPages.length > 0 ? Math.round(total / adGroupPages.length) : 60
  return { score: Math.min(100, score), gaps, perPage }
}

// ── Deployment Confidence (composite) ──────────────────────────────────────

export function computeDeploymentConfidence(
  opportunityScore: number,
  keywordScore: number,
  adCopyScore: number,
  landingPageScore: number,
  signal: DemandSignal,
): number {
  const weighted =
    opportunityScore   * 0.30 +
    keywordScore       * 0.25 +
    adCopyScore        * 0.25 +
    landingPageScore   * 0.20

  const stalePenalty = signal.gscSyncAgeDays > QUALITY_THRESHOLDS.staleGscDays ? 10 : 0
  return Math.min(100, Math.max(0, Math.round(weighted - stalePenalty)))
}

// ── Final recommendation ────────────────────────────────────────────────────

export function makeRecommendation(
  deploymentConfidence: number,
  landingPageScore: number,
): "recommended_for_deployment" | "needs_review" {
  return (
    deploymentConfidence >= QUALITY_THRESHOLDS.recommendedConfidence &&
    landingPageScore     >= QUALITY_THRESHOLDS.recommendedLandingPage
  ) ? "recommended_for_deployment" : "needs_review"
}

// ── Orchestrator ────────────────────────────────────────────────────────────

export function scoreCampaign(opts: {
  signal:      DemandSignal
  keywordSets: KeywordSet[]
  rsaSpecs:    RSASpec[]
  adGroupPages: Array<{ landingPage: string }>
}): CampaignQualityScores {
  const opportunityScore   = scoreOpportunity(opts.signal)
  const kwResult           = scoreKeywords(opts.keywordSets)
  const copyResult         = scoreAdCopy(opts.rsaSpecs)
  const lpResult           = scoreLandingPages(opts.adGroupPages)

  const deploymentConfidence = computeDeploymentConfidence(
    opportunityScore, kwResult.score, copyResult.score, lpResult.score, opts.signal,
  )
  const recommendation = makeRecommendation(deploymentConfidence, lpResult.score)

  return {
    opportunityScore,
    keywordQualityScore:  kwResult.score,
    adCopyQualityScore:   copyResult.score,
    landingPageScore:     lpResult.score,
    deploymentConfidence,
    recommendation,
    gaps: [...kwResult.gaps, ...copyResult.gaps, ...lpResult.gaps],
  }
}
