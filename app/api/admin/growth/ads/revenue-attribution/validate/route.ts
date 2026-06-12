/**
 * POST /api/admin/growth/ads/revenue-attribution/validate
 *
 * One-call Revenue Attribution validation:
 *   1. Pre-sync diagnostics (source counts, UTM/keyword/state coverage)
 *   2. Cost-match analysis (ads_keyword_rows ↔ revenue_attribution)
 *   3. Funnel stage breakdown
 *   4. One real sync across all three sources
 *   5. Post-sync diagnostics delta
 *   6. Data quality score (0–100) + recommended fixes
 *   7. Readiness verdict for Market Intelligence
 */

import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import {
  syncAllLeads,
  getAttributionDiagnostics,
  type AttributionDiagnostics,
} from "@/lib/growth-os/revenue-attribution"

export const maxDuration = 120

// ── Quality score ─────────────────────────────────────────────────────────────
// Each dimension is weighted; total = 100.

function computeQualityScore(diag: AttributionDiagnostics, costMatchPct: number): {
  score:      number
  breakdown:  Record<string, { score: number; max: number; label: string }>
} {
  const total = diag.totalInAttribution

  // UTM coverage — 30 pts
  const utmPct    = total > 0 ? diag.withUTM / total : 0
  const utmScore  = Math.round(utmPct * 30)

  // Keyword + campaign coverage — 20 pts (keyword 12 + campaign 8)
  const kwPct     = total > 0 ? diag.withKeyword  / total : 0
  const campPct   = total > 0 ? diag.withCampaign / total : 0
  const kwScore   = Math.round(kwPct  * 12)
  const campScore = Math.round(campPct * 8)

  // State coverage — 15 pts
  const statePct   = total > 0 ? diag.withState / total : 0
  const stateScore = Math.round(statePct * 15)

  // Cost-match coverage — 20 pts (ads spend rows that match attribution leads)
  const costScore = Math.round((costMatchPct / 100) * 20)

  // Funnel progression — 15 pts
  // A healthy funnel has some leads moved beyond "lead" stage
  const progressedStages = ["qualified_lead","dealer_application","oem_request","tender_request","proposal_sent","won","lost"] as const
  const progressed = progressedStages.reduce((s, k) => s + (diag.stageBreakdown[k] ?? 0), 0)
  const progressPct   = total > 0 ? progressed / total : 0
  const progressScore = Math.round(Math.min(progressPct * 75, 1) * 15)  // 20%+ progressed = full marks

  // Volume penalty: < 10 leads = cap at 30; 10–49 = cap at 60; 50+ = no cap
  let score = utmScore + kwScore + campScore + stateScore + costScore + progressScore
  if (total === 0)        score = 0
  else if (total < 10)    score = Math.min(score, 30)
  else if (total < 50)    score = Math.min(score, 60)

  return {
    score,
    breakdown: {
      utm:        { score: utmScore,    max: 30, label: `UTM coverage (${Math.round(utmPct * 100)}%)` },
      keyword:    { score: kwScore,     max: 12, label: `Keyword coverage (${Math.round(kwPct * 100)}%)` },
      campaign:   { score: campScore,   max: 8,  label: `Campaign coverage (${Math.round(campPct * 100)}%)` },
      state:      { score: stateScore,  max: 15, label: `State coverage (${Math.round(statePct * 100)}%)` },
      cost_match: { score: costScore,   max: 20, label: `Cost-match coverage (${Math.round(costMatchPct)}%)` },
      funnel:     { score: progressScore, max: 15, label: `Funnel progression (${Math.round(progressPct * 100)}%)` },
    },
  }
}

// ── Recommended fixes ────────────────────────────────────────────────────────

function buildRecommendations(
  diag:         AttributionDiagnostics,
  costMatchPct: number,
  score:        number,
): string[] {
  const recs: string[] = []
  const total = diag.totalInAttribution

  if (total === 0) {
    recs.push("CRITICAL: No leads in revenue_attribution — run the sync first.")
    return recs
  }

  const utmPct  = diag.withUTM  / total
  const kwPct   = diag.withKeyword  / total
  const campPct = diag.withCampaign / total
  const statePct = diag.withState / total

  if (diag.pendingInRFQ > 0)
    recs.push(`${diag.pendingInRFQ} rfq_popup_leads not yet synced — re-run sync or check duplicate-ID logic.`)
  if (diag.pendingInBrochure > 0)
    recs.push(`${diag.pendingInBrochure} brochure_leads not yet synced.`)
  if (diag.pendingInSubmissions > 0)
    recs.push(`${diag.pendingInSubmissions} form submissions not yet synced.`)

  if (utmPct < 0.2)
    recs.push(`Only ${Math.round(utmPct * 100)}% of leads have UTM data. Add UTM parameters to all Google Ads destination URLs.`)
  else if (utmPct < 0.5)
    recs.push(`${Math.round((1 - utmPct) * 100)}% of leads are missing UTM data. Review landing page UTM stripping or direct-traffic volume.`)

  if (kwPct < 0.1 && campPct < 0.1)
    recs.push("Keyword and campaign attribution is near-zero. Confirm Google Ads auto-tagging is ON and UTM templates are set correctly.")
  else if (kwPct < 0.3)
    recs.push(`Keyword coverage is ${Math.round(kwPct * 100)}%. Consider capturing gclid and resolving keyword via Ads API for full search-term attribution.`)

  if (statePct < 0.5)
    recs.push(`State field missing on ${Math.round((1 - statePct) * 100)}% of leads. Add state/city question to RFQ forms; use IP geolocation as fallback.`)

  if (costMatchPct < 30)
    recs.push(`Cost matching is ${Math.round(costMatchPct)}%. Ensure ads_keyword_rows is populated via a recent Google Ads sync. Check that keyword strings match between Ads rows and UTM terms.`)
  else if (costMatchPct < 60)
    recs.push(`Cost matching at ${Math.round(costMatchPct)}%. Some campaigns spend but leads arrive via different keyword strings than the Ads keyword name — normalise keyword casing.`)

  if ((diag.stageBreakdown.won ?? 0) === 0)
    recs.push("No 'won' deals recorded. Revenue attribution ROI will show 0 until deals are marked Won with a revenue value. Update stages manually or via CRM export.")

  if (score >= 75)
    recs.push("Attribution quality is sufficient for Market Intelligence. Run MI Director to get product/state/campaign scoring.")

  return recs
}

// ── Cost-match analysis ───────────────────────────────────────────────────────

async function analyzeCostMatch(): Promise<{
  adsRowsTotal:      number
  adsRowsWithSpend:  number
  campaignsWithSpend: string[]
  keywordsWithSpend:  string[]
  attrLeadsWithKeyword: number
  matchedKeywords:   number
  unmatchedKeywords: string[]
  matchPct:          number
}> {
  const db = (await clientPromise).db()

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10)

  const [adsRows, attrLeads] = await Promise.all([
    db.collection("ads_keyword_rows")
      .find({ syncDate: { $gte: thirtyDaysAgo } })   // field is syncDate, not date
      .toArray(),
    db.collection("revenue_attribution")
      .find({ keyword: { $exists: true, $nin: [null, ""] } })
      .project({ keyword: 1 })
      .toArray(),
  ])

  const adsRowsWithSpend = adsRows.filter(r => Number(r.spend ?? 0) > 0)  // field is `spend` (INR), not costMicros

  const campaignsWithSpend = [...new Set(
    adsRowsWithSpend.map(r => String(r.campaign ?? "")).filter(Boolean)
  )]
  const keywordsWithSpend = [...new Set(
    adsRowsWithSpend.map(r => String(r.keyword ?? "").toLowerCase()).filter(Boolean)
  )]

  const attrKeywords = new Set(
    attrLeads.map(l => String(l.keyword ?? "").toLowerCase()).filter(Boolean)
  )

  const matchedSet   = keywordsWithSpend.filter(k => attrKeywords.has(k))
  const unmatchedSet = keywordsWithSpend.filter(k => !attrKeywords.has(k))

  const matchPct = keywordsWithSpend.length > 0
    ? (matchedSet.length / keywordsWithSpend.length) * 100
    : 0

  return {
    adsRowsTotal:         adsRows.length,
    adsRowsWithSpend:     adsRowsWithSpend.length,
    campaignsWithSpend,
    keywordsWithSpend:    keywordsWithSpend.slice(0, 50),  // cap for response size
    attrLeadsWithKeyword: attrLeads.length,
    matchedKeywords:      matchedSet.length,
    unmatchedKeywords:    unmatchedSet.slice(0, 20),       // sample
    matchPct,
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST() {
  const db = (await clientPromise).db()

  // ── 1. Source counts ───────────────────────────────────────────────────────
  const [rfqTotal, brochureTotal, submissionsTotal, attrTotal] = await Promise.all([
    db.collection("rfq_popup_leads").countDocuments(),
    db.collection("brochure_leads").countDocuments(),
    db.collection("submissions").countDocuments(),
    db.collection("revenue_attribution").countDocuments(),
  ])

  // ── 2. Pre-sync diagnostics ────────────────────────────────────────────────
  const preDiag = await getAttributionDiagnostics()

  // ── 3. Cost-match analysis ─────────────────────────────────────────────────
  const costMatch = await analyzeCostMatch()

  // ── 4. Run sync ────────────────────────────────────────────────────────────
  const syncResult = await syncAllLeads()

  // ── 5. Post-sync diagnostics ───────────────────────────────────────────────
  const postDiag = await getAttributionDiagnostics()
  const [attrTotalAfter] = await Promise.all([
    db.collection("revenue_attribution").countDocuments(),
  ])

  // ── 6. Quality score ───────────────────────────────────────────────────────
  const { score, breakdown } = computeQualityScore(postDiag, costMatch.matchPct)

  // ── 7. Recommendations ────────────────────────────────────────────────────
  const recommendations = buildRecommendations(postDiag, costMatch.matchPct, score)

  // ── 8. Market Intelligence readiness ──────────────────────────────────────
  const miReady =
    attrTotalAfter >= 50 &&
    postDiag.withUTM / Math.max(attrTotalAfter, 1) >= 0.10 &&
    score >= 40

  const miBlockers: string[] = []
  if (attrTotalAfter < 50)      miBlockers.push(`Need ≥50 leads in attribution (have ${attrTotalAfter})`)
  if (postDiag.withUTM / Math.max(attrTotalAfter, 1) < 0.10)
    miBlockers.push("UTM coverage <10% — Market Intelligence geo/product signals will be inaccurate")
  if (score < 40) miBlockers.push(`Data quality score ${score}/100 below minimum threshold of 40`)

  return NextResponse.json({
    runAt: new Date().toISOString(),

    // A — Lead ingestion
    ingestion: {
      sources: {
        rfq_popup_leads: { total: rfqTotal },
        brochure_leads:  { total: brochureTotal },
        submissions:     { total: submissionsTotal },
      },
      preSyncInAttribution: attrTotal,
    },

    // B — Sync results
    sync: {
      rfq:      syncResult.rfq,
      brochure: syncResult.brochure,
      contact:  syncResult.contact,
      totalNew: syncResult.totalNew,
      postSyncTotal: attrTotalAfter,
    },

    // C — Attribution coverage (post-sync)
    coverage: {
      totalLeads:       postDiag.totalInAttribution,
      utmCoveragePct:   postDiag.totalInAttribution > 0
        ? Math.round(postDiag.withUTM / postDiag.totalInAttribution * 100) : 0,
      keywordCovPct:    postDiag.totalInAttribution > 0
        ? Math.round(postDiag.withKeyword / postDiag.totalInAttribution * 100) : 0,
      campaignCovPct:   postDiag.totalInAttribution > 0
        ? Math.round(postDiag.withCampaign / postDiag.totalInAttribution * 100) : 0,
      paidSourcePct:    postDiag.totalInAttribution > 0
        ? Math.round(postDiag.withPaidSource / postDiag.totalInAttribution * 100) : 0,
      stateCovPct:      postDiag.totalInAttribution > 0
        ? Math.round(postDiag.withState / postDiag.totalInAttribution * 100) : 0,
      withUTM:          postDiag.withUTM,
      withoutUTM:       postDiag.withoutUTM,
      withKeyword:      postDiag.withKeyword,
      withCampaign:     postDiag.withCampaign,
      withState:        postDiag.withState,
      withoutState:     postDiag.withoutState,
      bySource:         postDiag.bySource,
      stateBreakdown:   postDiag.stateBreakdown,
      sampleNoUTM:      postDiag.sampleUnmatched,
    },

    // D — Cost matching
    costMatch: {
      adsKeywordRowsLast30d: costMatch.adsRowsTotal,
      rowsWithSpend:         costMatch.adsRowsWithSpend,
      campaignsWithSpend:    costMatch.campaignsWithSpend,
      uniqueKeywordsInAds:   costMatch.keywordsWithSpend.length,
      attrLeadsWithKeyword:  costMatch.attrLeadsWithKeyword,
      matchedKeywords:       costMatch.matchedKeywords,
      unmatchedKeywordsSample: costMatch.unmatchedKeywords,
      matchPct:              Math.round(costMatch.matchPct),
      note: costMatch.adsRowsTotal === 0
        ? "NO ADS SYNC DATA — ads_keyword_rows is empty. Connect Google Ads and run a sync first."
        : undefined,
    },

    // E — Funnel
    funnel: {
      ...postDiag.stageBreakdown,
      note: (postDiag.stageBreakdown.won ?? 0) === 0
        ? "No won deals — ROI will be 0 until deals are marked Won with revenue values."
        : undefined,
    },

    // F — Quality score
    quality: {
      score,
      rating: score >= 75 ? "GOOD" : score >= 50 ? "PARTIAL" : score >= 25 ? "POOR" : "INSUFFICIENT",
      breakdown,
    },

    // G — Recommendations
    recommendations,

    // H — MI readiness
    marketIntelligenceReadiness: {
      ready:    miReady,
      blockers: miBlockers,
      verdict:  miReady
        ? "Attribution data is sufficient to run Market Intelligence."
        : "Fix the blockers above before running Market Intelligence for accurate results.",
    },

    // Founder answer
    founderSummary: {
      canAttributionBeTrusted: score >= 50
        ? `PARTIALLY — quality score ${score}/100. Directional signals are present but ROI numbers will be incomplete until data gaps are closed.`
        : score >= 25
        ? `NOT YET — quality score ${score}/100. Too many leads missing UTM/keyword data for reliable channel attribution.`
        : `NO — quality score ${score}/100. Critical data missing. Follow recommendations before relying on any numbers.`,
      completenessEstimate: `${score}%`,
      missingData: recommendations.filter(r =>
        r.includes("CRITICAL") || r.includes("missing") || r.includes("not yet synced")
      ),
      roiBlockers: recommendations.filter(r =>
        r.includes("ROI") || r.includes("cost") || r.includes("keyword") || r.includes("UTM") || r.includes("Won")
      ),
    },
  }, { headers: { "Cache-Control": "no-store" } })
}
