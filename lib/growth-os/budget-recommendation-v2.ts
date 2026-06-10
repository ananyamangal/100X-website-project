/**
 * Growth OS — Budget Recommendation Engine V2 (Phase 3A).
 *
 * Reads Lead Value Intelligence + State Intelligence to generate budget recommendations
 * with full economic rationale. Every recommendation includes:
 *   - Daily budget recommendation in INR
 *   - Which conversion signals support it
 *   - Expected clicks / leads / CPQL
 *   - Confidence level and reason
 *
 * ALL recommendations go to the Approval Queue as "pending".
 * No auto-spend. No auto-increase. Human approval required.
 *
 * CPQL = Cost Per Qualified Lead = daily budget × 30 / expected monthly leads
 *
 * CPC benchmarks (India B2B industrial equipment, 2026):
 *   EXACT match product intent:    ₹20–35
 *   PHRASE match product intent:   ₹15–25
 *   BROAD match / discovery:       ₹10–18
 *   Competitor keyword:            ₹25–45
 *   Dealer/OEM acquisition:        ₹28–50
 */

import type { Db } from "mongodb"
import clientPromise from "@/lib/mongodb"
import { pushToQueue, type RecommendationType } from "@/lib/growth-os/approval-queue"
import type { LeadValueIntelligenceRun, KeywordValueRank } from "@/lib/growth-os/lead-value-intelligence"
import type { StateIntelligenceRun, StateConversionProfile } from "@/lib/growth-os/state-intelligence"

// ── Collections ───────────────────────────────────────────────────────────────

const COLL_LVI    = "ads_lead_value_intelligence"
const COLL_SI     = "ads_state_intelligence"
const COLL_BUDGET = "ads_budget_recommendations_v2"

// ── CPC benchmarks ────────────────────────────────────────────────────────────

const CPC_BY_INTENT: Record<string, { min: number; max: number; mid: number }> = {
  // Direct buyer — product-intent keywords
  thermal_fogging_machine:    { min: 20, max: 38, mid: 28 },
  mosquito_fogging_machine:   { min: 18, max: 32, mid: 24 },
  ulv_fogging_machine:        { min: 20, max: 35, mid: 26 },
  vehicle_mounted_fogger:     { min: 22, max: 40, mid: 30 },
  fogging_machine_price:      { min: 18, max: 30, mid: 23 },
  fogging_machine_manufacturer: { min: 22, max: 40, mid: 30 },

  // Dealer / channel acquisition
  dealer_acquisition:         { min: 28, max: 50, mid: 38 },
  distributor_enquiry:        { min: 25, max: 45, mid: 34 },
  fogging_machine_dealer:     { min: 25, max: 42, mid: 32 },

  // OEM / government
  oem_authorization:          { min: 30, max: 55, mid: 40 },
  gem_supplier:               { min: 20, max: 38, mid: 28 },
  government_tender:          { min: 22, max: 40, mid: 30 },

  // Generic fallback
  generic:                    { min: 12, max: 25, mid: 17 },
}

function estimateCPC(keywordText: string): number {
  const text = keywordText.toLowerCase()
  if (text.includes("oem") || text.includes("authoriz")) return CPC_BY_INTENT.oem_authorization.mid
  if (text.includes("dealer") || text.includes("distribut")) return CPC_BY_INTENT.dealer_acquisition.mid
  if (text.includes("gem") || text.includes("gem portal")) return CPC_BY_INTENT.gem_supplier.mid
  if (text.includes("vehicle") || text.includes("mounted")) return CPC_BY_INTENT.vehicle_mounted_fogger.mid
  if (text.includes("thermal fog")) return CPC_BY_INTENT.thermal_fogging_machine.mid
  if (text.includes("mosquito")) return CPC_BY_INTENT.mosquito_fogging_machine.mid
  if (text.includes("ulv") || text.includes("ultra low volume")) return CPC_BY_INTENT.ulv_fogging_machine.mid
  if (text.includes("manufacturer") || text.includes("supplier")) return CPC_BY_INTENT.fogging_machine_manufacturer.mid
  if (text.includes("price") || text.includes("cost") || text.includes("rate")) return CPC_BY_INTENT.fogging_machine_price.mid
  return CPC_BY_INTENT.generic.mid
}

// CTR estimates by match type for India B2B
const CTR_BY_MATCH: Record<string, number> = {
  EXACT: 0.07,    // 7% CTR for exact match B2B keywords
  PHRASE: 0.05,   // 5%
  BROAD: 0.03,    // 3%
  default: 0.05,
}

// Monthly search volume estimates for India B2B fogging machine keywords
// (derived from GSC impressions analysis — not keyword planner data)
const VOLUME_BY_INTENT: Record<string, number> = {
  thermal_fogging:    800,
  mosquito_fogging:   600,
  ulv_machine:        400,
  dealer_acquisition: 200,
  oem_authorization:  80,
  gem_supplier:       150,
  vehicle_mounted:    300,
  generic_fogging:    1200,
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BudgetRecommendationV2 {
  recommendationId:          string
  campaignName:              string
  adGroupFocus?:             string
  action:                    "set_budget" | "increase_budget" | "decrease_budget" | "activate_paused"

  // Current state (from Google Ads API data if available)
  currentDailyBudgetINR?:    number
  currentSpendINR?:          number

  // Recommendation
  recommendedDailyBudgetINR: number
  recommendedMonthlyBudgetINR: number
  changeDeltaINR?:           number     // positive = increase, negative = decrease

  // Why this recommendation exists
  whyGenerated:              string
  conversionEvidence:        string
  leadValueEvidence:         string     // weightedLeadScore breakdown

  // Expected outcomes
  estimatedMonthlyClicks:    number
  estimatedMonthlyLeads:     number
  expectedCPQL:              number     // INR per qualified lead
  expectedCTR:               number
  avgCPCEstimate:            number

  // Confidence
  confidence:                "high" | "medium" | "low"
  confidenceReason:          string
  dataWindowDays:            number

  // Risk
  riskLevel:                 "low" | "medium" | "high"
  riskReason:                string

  // Supporting data
  topKeywordsByValue:        Array<{ keyword: string; weightedScore: number; recommendedPriority: string }>
  topStatesByValue:          Array<{ state: string; weightedScore: number; totalLeads: number; signal: string }>

  // Governance
  requiresApproval:          true
  expiresInDays:             number
  generatedAt:               string
}

export interface BudgetRunResult {
  runId:             string
  periodDays:        number
  lviRunId:          string
  siRunId:           string
  recommendations:   BudgetRecommendationV2[]
  queued:            number
  summary:           string
  generatedAt:       string
}

// ── Budget calculation helpers ────────────────────────────────────────────────

function computeBudgetFromKeywords(
  keywordRanks: KeywordValueRank[],
  funnelLabel: string,
): {
  recommendedDailyBudgetINR: number
  estimatedMonthlyClicks: number
  estimatedMonthlyLeads: number
  expectedCPQL: number
  avgCPC: number
  reasoning: string[]
} {
  // Take the top 20 keywords by weighted score
  const top20 = keywordRanks.slice(0, 20)
  if (top20.length === 0) {
    return {
      recommendedDailyBudgetINR: 150,
      estimatedMonthlyClicks: 30,
      estimatedMonthlyLeads: 2,
      expectedCPQL: 2250,
      avgCPC: 25,
      reasoning: ["No keyword data — using conservative fallback of ₹150/day"],
    }
  }

  // Estimate monthly volume and clicks across top keywords
  let totalMonthlyVolume  = 0
  let totalWeightedCPC    = 0
  let totalWeight         = 0
  const reasoning: string[] = []

  for (const kw of top20) {
    const cpc    = estimateCPC(kw.keyword)
    const volume = VOLUME_BY_INTENT.generic_fogging    // conservative shared pool
    totalMonthlyVolume += volume / top20.length         // distribute volume across keywords
    totalWeightedCPC   += cpc * kw.totalWeightedScore
    totalWeight        += kw.totalWeightedScore
  }

  const avgCPC     = totalWeight > 0 ? totalWeightedCPC / totalWeight : 25
  const ctr        = CTR_BY_MATCH.EXACT   // assume EXACT for high-value keywords
  const monthlyClicks = Math.round(totalMonthlyVolume * ctr)
  const conversionRate = 0.05  // 5% conversion rate — conservative for B2B landing page

  // Budget: enough to capture the estimated click volume
  const requiredMonthlyBudget = monthlyClicks * avgCPC
  const dailyBudget = Math.round(requiredMonthlyBudget / 30)

  // Clamp to sane range: ₹100–₹500/day for India B2B SMB
  const clampedDailyBudget = Math.min(500, Math.max(100, dailyBudget))
  const monthlyLeads = Math.round(monthlyClicks * conversionRate)
  const cpql = monthlyLeads > 0 ? Math.round((clampedDailyBudget * 30) / monthlyLeads) : 9999

  reasoning.push(`Top ${top20.length} keywords by weighted lead value score`)
  reasoning.push(`Avg CPC estimate: ₹${Math.round(avgCPC)} (weighted by lead value)`)
  reasoning.push(`Est. monthly clicks: ${monthlyClicks} at ${(ctr * 100).toFixed(0)}% CTR`)
  reasoning.push(`Est. conversion rate: ${(conversionRate * 100).toFixed(0)}% → ${monthlyLeads} leads/month`)
  reasoning.push(`Required budget: ₹${Math.round(requiredMonthlyBudget)}/month → ₹${dailyBudget}/day (clamped to ₹${clampedDailyBudget}/day)`)
  reasoning.push(`Expected CPQL: ₹${cpql}`)

  return {
    recommendedDailyBudgetINR: clampedDailyBudget,
    estimatedMonthlyClicks:    monthlyClicks,
    estimatedMonthlyLeads:     monthlyLeads,
    expectedCPQL:              cpql,
    avgCPC,
    reasoning,
  }
}

function buildConversionEvidence(
  lvi: Pick<LeadValueIntelligenceRun, "totalLeads" | "totalWeightedScore" | "leadMixSummary" | "topLeadType">,
): string {
  const mixParts = Object.entries(lvi.leadMixSummary)
    .sort((a, b) => b[1].weightedScore - a[1].weightedScore)
    .slice(0, 4)
    .map(([t, d]) => `${d.count} ${t.replace(/_/g, " ")} (score ${Math.round(d.weightedScore)})`)
    .join(", ")

  return (
    `${lvi.totalLeads} leads in period. ` +
    `Total weighted score: ${lvi.totalWeightedScore}. ` +
    `Lead mix: ${mixParts}. ` +
    `Dominant type: ${lvi.topLeadType.replace(/_/g, " ")}.`
  )
}

function buildLeadValueEvidence(topKeywords: KeywordValueRank[]): string {
  if (topKeywords.length === 0) return "No keyword-level lead data available."
  const top3 = topKeywords.slice(0, 3)
  return top3
    .map(k =>
      `"${k.keyword}" (${k.recommendedPriority}): ${k.totalLeads} leads, weighted score ${k.totalWeightedScore} — ${k.rationale}`,
    )
    .join("; ")
}

function assessConfidence(
  lvi: Pick<LeadValueIntelligenceRun, "totalLeads" | "totalWeightedScore">,
  si: Pick<StateIntelligenceRun, "statesAnalyzed"> | null,
): { confidence: "high" | "medium" | "low"; reason: string } {
  if (lvi.totalLeads >= 20 && lvi.totalWeightedScore >= 500) {
    return {
      confidence: "high",
      reason: `${lvi.totalLeads} leads with total weighted score ${lvi.totalWeightedScore} provides strong signal.`,
    }
  }
  if (lvi.totalLeads >= 5) {
    return {
      confidence: "medium",
      reason: `${lvi.totalLeads} leads — sufficient for directional recommendation, but more conversion data would improve accuracy.`,
    }
  }
  return {
    confidence: "low",
    reason: `Only ${lvi.totalLeads} leads in the analysis period. Budget estimate is based on keyword intent and market benchmarks, not conversion data.`,
  }
}

function assessRisk(
  confidence: "high" | "medium" | "low",
  dailyBudget: number,
  cpql: number,
): { riskLevel: "low" | "medium" | "high"; riskReason: string } {
  if (confidence === "low") {
    return {
      riskLevel: "high",
      riskReason: "Low confidence (insufficient conversion data) — risk of budget being spent on non-converting traffic.",
    }
  }
  if (dailyBudget > 300 && confidence === "medium") {
    return {
      riskLevel: "medium",
      riskReason: `Budget ₹${dailyBudget}/day with medium confidence. Monitor CPQL closely in first 7 days.`,
    }
  }
  if (cpql > 3000) {
    return {
      riskLevel: "medium",
      riskReason: `Expected CPQL of ₹${cpql} is above the ₹3000 threshold — ensure leads are properly classified before increasing budget.`,
    }
  }
  return {
    riskLevel: "low",
    riskReason: "Strong conversion data supports this budget level. Expected CPQL is within acceptable range.",
  }
}

// ── Per-funnel recommendation builder ────────────────────────────────────────

function buildFunnelARecommendation(
  lvi: LeadValueIntelligenceRun,
  si: StateIntelligenceRun | null,
  now: string,
): BudgetRecommendationV2 {
  // Funnel A = Dealer Acquisition
  const dealerKeywords = lvi.keywordRanks.filter(
    k => k.leadMix.dealer_application || k.leadMix.oem_authorization,
  )
  const allKeywords = dealerKeywords.length > 0 ? dealerKeywords : lvi.keywordRanks

  const calc = computeBudgetFromKeywords(allKeywords, "Funnel A — Dealer Acquisition")
  const { confidence, reason: confidenceReason } = assessConfidence(lvi, si)
  const { riskLevel, riskReason } = assessRisk(confidence, calc.recommendedDailyBudgetINR, calc.expectedCPQL)

  const topStatesByValue = (si?.profiles ?? [])
    .filter(p => p.totalLeads > 0)
    .sort((a, b) => b.totalWeightedScore - a.totalWeightedScore)
    .slice(0, 3)
    .map(p => ({ state: p.state, weightedScore: p.totalWeightedScore, totalLeads: p.totalLeads, signal: p.signal }))

  const whyGenerated = [
    `Funnel A (Dealer Acquisition) has ${lvi.leadMixSummary.dealer_application?.count ?? 0} dealer applications and ${lvi.leadMixSummary.oem_authorization?.count ?? 0} OEM authorization leads in the last ${lvi.periodDays} days.`,
    `These leads carry a combined weighted score of ${Math.round((lvi.leadMixSummary.dealer_application?.weightedScore ?? 0) + (lvi.leadMixSummary.oem_authorization?.weightedScore ?? 0))}.`,
    `Budget recommendation uses multiplicative lead scoring: leadTypeScore × opportunityScore × businessFitScore.`,
  ].join(" ")

  return {
    recommendationId:          `brec_a_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
    campaignName:              "Funnel A — Dealer Acquisition",
    adGroupFocus:              "Dealer applications, OEM authorization, government procurement",
    action:                    "activate_paused",  // Funnel A is currently paused
    recommendedDailyBudgetINR: calc.recommendedDailyBudgetINR,
    recommendedMonthlyBudgetINR: calc.recommendedDailyBudgetINR * 30,
    whyGenerated,
    conversionEvidence:        buildConversionEvidence(lvi),
    leadValueEvidence:         buildLeadValueEvidence(allKeywords.slice(0, 5)),
    estimatedMonthlyClicks:    calc.estimatedMonthlyClicks,
    estimatedMonthlyLeads:     calc.estimatedMonthlyLeads,
    expectedCPQL:              calc.expectedCPQL,
    expectedCTR:               CTR_BY_MATCH.EXACT,
    avgCPCEstimate:            calc.avgCPC,
    confidence,
    confidenceReason,
    dataWindowDays:            lvi.periodDays,
    riskLevel,
    riskReason,
    topKeywordsByValue:        allKeywords.slice(0, 5).map(k => ({
      keyword:              k.keyword,
      weightedScore:        k.totalWeightedScore,
      recommendedPriority:  k.recommendedPriority,
    })),
    topStatesByValue,
    requiresApproval:          true,
    expiresInDays:             14,
    generatedAt:               now,
  }
}

function buildFunnelBRecommendation(
  lvi: LeadValueIntelligenceRun,
  si: StateIntelligenceRun | null,
  now: string,
): BudgetRecommendationV2 {
  // Funnel B = Direct Buyer (product-intent keywords)
  const buyerKeywords = lvi.keywordRanks.filter(k => {
    const kw = k.keyword.toLowerCase()
    return (
      kw.includes("fogg") ||
      kw.includes("fogger") ||
      kw.includes("mosquito") ||
      kw.includes("ulv") ||
      kw.includes("thermal")
    )
  })
  const allKeywords = buyerKeywords.length > 0 ? buyerKeywords : lvi.keywordRanks

  // Funnel B needs higher volume — target ₹150–₹300/day
  const calc = computeBudgetFromKeywords(allKeywords, "Funnel B — Direct Buyer")
  const funnelBBudget = Math.min(300, Math.max(150, calc.recommendedDailyBudgetINR))

  const { confidence, reason: confidenceReason } = assessConfidence(lvi, si)
  const { riskLevel, riskReason } = assessRisk(confidence, funnelBBudget, calc.expectedCPQL)

  const topStatesByValue = (si?.profiles ?? [])
    .filter(p => p.totalLeads > 0)
    .sort((a, b) => b.totalWeightedScore - a.totalWeightedScore)
    .slice(0, 3)
    .map(p => ({ state: p.state, weightedScore: p.totalWeightedScore, totalLeads: p.totalLeads, signal: p.signal }))

  const rfqLeads  = lvi.leadMixSummary.general?.count ?? lvi.leadMixSummary.rfq?.count ?? 0
  const rfqScore  = lvi.leadMixSummary.general?.weightedScore ?? lvi.leadMixSummary.rfq?.weightedScore ?? 0

  const whyGenerated = [
    `Funnel B (Direct Buyer) targets product-intent searchers with ${rfqLeads} RFQ leads (weighted score ${Math.round(rfqScore)}) in the last ${lvi.periodDays} days.`,
    `${buyerKeywords.length} product-intent keywords identified from GSC and conversion signals.`,
    `Higher daily budget vs Funnel A — direct buyer searches have higher volume and shorter sales cycle.`,
  ].join(" ")

  return {
    recommendationId:          `brec_b_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
    campaignName:              "Funnel B — Direct Buyer",
    adGroupFocus:              "Thermal fogging machine, mosquito fogging machine, ULV machine, manufacturer/supplier",
    action:                    "set_budget",
    recommendedDailyBudgetINR: funnelBBudget,
    recommendedMonthlyBudgetINR: funnelBBudget * 30,
    whyGenerated,
    conversionEvidence:        buildConversionEvidence(lvi),
    leadValueEvidence:         buildLeadValueEvidence(allKeywords.slice(0, 5)),
    estimatedMonthlyClicks:    calc.estimatedMonthlyClicks,
    estimatedMonthlyLeads:     calc.estimatedMonthlyLeads,
    expectedCPQL:              calc.expectedCPQL,
    expectedCTR:               CTR_BY_MATCH.PHRASE,
    avgCPCEstimate:            calc.avgCPC,
    confidence,
    confidenceReason,
    dataWindowDays:            lvi.periodDays,
    riskLevel,
    riskReason,
    topKeywordsByValue:        allKeywords.slice(0, 5).map(k => ({
      keyword:              k.keyword,
      weightedScore:        k.totalWeightedScore,
      recommendedPriority:  k.recommendedPriority,
    })),
    topStatesByValue,
    requiresApproval:          true,
    expiresInDays:             14,
    generatedAt:               now,
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

export async function runBudgetRecommendationV2(
  opts: { periodDays?: number; enqueueRecommendations?: boolean } = {},
): Promise<BudgetRunResult> {
  const periodDays          = opts.periodDays ?? 90
  const enqueueRecommendations = opts.enqueueRecommendations ?? true

  const client = await clientPromise
  const db     = client.db() as Db

  // 1. Load latest LVI run (or generate one)
  const latestLVI = await db.collection(COLL_LVI)
    .findOne({}, { sort: { generatedAt: -1 } }) as LeadValueIntelligenceRun | null

  let lvi: LeadValueIntelligenceRun
  if (latestLVI?.keywordRanks?.length) {
    lvi = latestLVI
  } else {
    const { runLeadValueIntelligence } = await import("@/lib/growth-os/lead-value-intelligence")
    lvi = await runLeadValueIntelligence({ periodDays })
  }

  // 2. Load latest State Intelligence run (optional — not blocking)
  const latestSI = await db.collection(COLL_SI)
    .findOne({}, { sort: { generatedAt: -1 } }) as StateIntelligenceRun | null

  const NOW = new Date().toISOString()

  // 3. Build per-funnel recommendations
  const funnelA = buildFunnelARecommendation(lvi, latestSI, NOW)
  const funnelB = buildFunnelBRecommendation(lvi, latestSI, NOW)
  const recommendations: BudgetRecommendationV2[] = [funnelA, funnelB]

  // 4. Push to approval queue
  let queued = 0
  if (enqueueRecommendations) {
    for (const rec of recommendations) {
      const recType: RecommendationType =
        rec.action === "increase_budget" ? "increase_budget" :
        rec.action === "decrease_budget" ? "decrease_budget" :
        rec.action === "set_budget"      ? "increase_budget" :   // set_budget → increase_budget queue type
        "increase_budget"

      const priority =
        rec.confidence === "high"   ? "high"   :
        rec.confidence === "medium" ? "medium" : "low"

      await pushToQueue(db, {
        type:            recType,
        priority,
        title:           `Budget Recommendation — ${rec.campaignName}`,
        rationale:       rec.whyGenerated,
        estimatedImpact: [
          `Daily budget: ₹${rec.recommendedDailyBudgetINR}/day (₹${rec.recommendedMonthlyBudgetINR}/month)`,
          `Expected: ${rec.estimatedMonthlyClicks} clicks/month, ${rec.estimatedMonthlyLeads} leads/month`,
          `Expected CPQL: ₹${rec.expectedCPQL}`,
          `Risk: ${rec.riskLevel} — ${rec.riskReason}`,
        ].join(" | "),
        agentSource:     "budget_recommendation_v2",
        dataWindowDays:  periodDays,
        confidence:      rec.confidence === "high" ? 80 : rec.confidence === "medium" ? 55 : 30,
        payload:         rec as unknown as Record<string, unknown>,
      })
      queued++
    }
  }

  // 5. Persist run
  const runId = `brec_run_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`
  const summary = [
    `Generated ${recommendations.length} budget recommendations.`,
    `Funnel A (Dealer): ₹${funnelA.recommendedDailyBudgetINR}/day, expected CPQL ₹${funnelA.expectedCPQL}, confidence ${funnelA.confidence}.`,
    `Funnel B (Direct Buyer): ₹${funnelB.recommendedDailyBudgetINR}/day, expected CPQL ₹${funnelB.expectedCPQL}, confidence ${funnelB.confidence}.`,
    enqueueRecommendations ? `${queued} items pushed to Approval Queue.` : "Queue push skipped.",
  ].join(" ")

  const result: BudgetRunResult = {
    runId,
    periodDays,
    lviRunId: lvi.runId,
    siRunId:  latestSI?.runId ?? "none",
    recommendations,
    queued,
    summary,
    generatedAt: NOW,
  }

  await db.collection(COLL_BUDGET).insertOne({ ...result })

  return result
}
