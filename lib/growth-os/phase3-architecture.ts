/**
 * Growth OS — Phase 3 Architecture & Data Models.
 *
 * This file defines interfaces and collection schemas for Phase 3 features.
 * NO implementation. These are data models for review and approval before build.
 *
 * Phase 3 modules (in priority order):
 *   1. Lead Value Intelligence  — weight conversions by business value, not count
 *   2. State Intelligence       — geo-level conversion density and quality
 *   3. Search Volume Gate       — block low-volume keywords from deployment
 *   4. Competitor Campaign Intelligence — draft campaigns targeting competitor keywords
 *   5. Budget Recommendation Engine    — full budget rationale in approval queue
 *
 * Design principles:
 *   - Every recommendation carries: whyGenerated + conversionEvidence + expectedImpact
 *   - No auto-spend. No auto-publish. All outputs → Approval Queue.
 *   - Objective: More RFQs, dealer applications, OEM enquiries, lower CPQL.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// 1. LEAD VALUE INTELLIGENCE
//    Not all conversions are equal. A dealer application is worth far more
//    than a brochure download. Keyword ranking must reflect business value.
// ═══════════════════════════════════════════════════════════════════════════════

export type LeadType =
  | "oem_authorization"    // 100 — highest value: full OEM partner, multi-year revenue
  | "dealer_application"   // 80  — channel acquisition: recurring commissions
  | "gem_inquiry"          // 70  — government procurement, high-value tender
  | "rfq"                  // 50  — direct machine purchase enquiry
  | "whatsapp_lead"        // 30  — WhatsApp contact (intent unclear until qualified)
  | "phone_lead"           // 25  — phone call (intent unclear until qualified)
  | "brochure_download"    // 10  — research intent, top of funnel

export const LEAD_VALUE_SCORE: Record<LeadType, number> = {
  oem_authorization:  100,
  dealer_application:  80,
  gem_inquiry:         70,
  rfq:                 50,
  whatsapp_lead:       30,
  phone_lead:          25,
  brochure_download:   10,
}

export interface LeadValueSignal {
  keyword:        string
  leadType:       LeadType
  leadValueScore: number        // LEAD_VALUE_SCORE[leadType]
  count:          number        // number of leads with this keyword + type
  weightedScore:  number        // count × leadValueScore
  landingPage:    string
  state?:         string
  campaign?:      string
  adGroup?:       string
  createdAt:      string
}

export interface KeywordValueRank {
  keyword:           string
  totalLeads:        number
  weightedScore:     number     // sum(count × leadValueScore) across all lead types
  leadMix:           Partial<Record<LeadType, number>>   // breakdown by type
  topLeadType:       LeadType
  valueConfidence:   "high" | "medium" | "low"
  recommendedPriority: "must_have" | "strong" | "moderate" | "weak"
  rationale:         string     // e.g. "3 dealer applications (×80) + 2 OEM enquiries (×100) = total 440"
}

// MongoDB collection: ads_lead_value_intelligence
export interface LeadValueIntelligenceRun {
  runId:           string
  periodDays:      number
  totalLeads:      number
  totalWeighted:   number
  keywordRanks:    KeywordValueRank[]  // sorted by weightedScore DESC
  leadMixSummary:  Partial<Record<LeadType, { count: number; weightedContrib: number }>>
  generatedAt:     string
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. STATE INTELLIGENCE
//    Which states are converting? Where should we increase budget?
//    Where should we decrease? Which states represent untapped opportunity?
// ═══════════════════════════════════════════════════════════════════════════════

export type StateSignal =
  | "strong_performer"     // high conversion density + high lead quality
  | "emerging"             // growing conversion count in last 30 days
  | "low_performer"        // leads exist but low value or quality
  | "untapped"             // no leads yet but high population/government-spend state
  | "over_represented"     // disproportionately high spend vs conversions

export interface StateConversionProfile {
  state:                string
  totalLeads:           number
  weightedLeadValue:    number             // sum of LEAD_VALUE_SCORE across all leads
  leadMix:              Partial<Record<LeadType, number>>
  avgLeadValue:         number             // weightedLeadValue / totalLeads
  conversionDensity:    "high" | "medium" | "low"  // relative to other states
  signal:               StateSignal
  budgetRecommendation: "increase" | "decrease" | "maintain" | "new_campaign"
  rationale:            string
  topKeywords:          string[]
  topLandingPages:      string[]
}

export interface StateIntelligenceRun {
  runId:          string
  periodDays:     number
  statesAnalyzed: number
  profiles:       StateConversionProfile[]
  topState:       string
  bottomState:    string
  recommendations: Array<{
    state:   string
    action:  "increase_budget" | "decrease_budget" | "new_campaign" | "pause"
    rationale: string
    expectedImpact: string
  }>
  generatedAt: string
}

// MongoDB collection: ads_state_intelligence

// ═══════════════════════════════════════════════════════════════════════════════
// 3. SEARCH VOLUME GATE
//    No keyword enters deployment unless estimated volume exceeds minimum.
//    Extends the Campaign Viability Checker with per-keyword gates.
// ═══════════════════════════════════════════════════════════════════════════════

export type VolumeSource = "gsc_actual" | "keyword_map" | "intent_estimate"
export type VolumeConfidence = "high" | "medium" | "low"

export interface SearchVolumeEstimate {
  keyword:            string
  intent:             string
  estimatedMonthly:   number
  volumeSource:       VolumeSource
  volumeConfidence:   VolumeConfidence
  deploymentEligible: boolean
  deploymentReason?:  string  // reason if not eligible
  cpcBidMicros:       number  // recommended Google Ads bid
}

// Minimum monthly volume thresholds per funnel
export const VOLUME_GATE_THRESHOLDS = {
  funnel_a_dealer:  30,    // Funnel A is niche B2B — lower volume acceptable
  funnel_a_oem:     10,
  funnel_a_gem:     20,
  funnel_b_machine: 100,   // Funnel B is direct buyer — need meaningful volume
}

// Fields added to GeneratedKeyword in Phase 3:
// searchVolumeConfidence: VolumeConfidence
// deploymentEligibility:  boolean
// cpcBidMicros:           number

// ═══════════════════════════════════════════════════════════════════════════════
// 4. COMPETITOR CAMPAIGN INTELLIGENCE
//    Draft-only competitor acquisition campaigns.
//    Targets keywords where competitors are visible but 100X is not.
//    GOVERNANCE: Competitor campaigns never auto-deploy. Always draft.
// ═══════════════════════════════════════════════════════════════════════════════

export interface CompetitorKeyword {
  keyword:          string
  competitorDomain: string
  ourRank:          number | null   // null = not ranking
  theirRank:        number
  monthlyVolume:    number
  cpcEstimate:      number
  intent:           string
  adGroupTheme:     string
  rationale:        string
}

export interface CompetitorCampaignDraft {
  planId:           string
  campaignName:     string
  objective:        "Capture competitor search traffic where 100X has better product/price"
  status:           "draft_pending_approval"
  targetCompetitors: string[]
  keywords:         CompetitorKeyword[]
  adCopyGuidance:   string   // guidance for writing ads (do not mention competitor names directly)
  landingPage:      string
  dailyBudgetINR:   number
  rationale:        string
  estimatedImpact:  string
  governance:       "DRAFT ONLY — competitor campaigns require explicit human approval and legal review before activation"
  generatedAt:      string
  requiresApproval: true
}

// MongoDB collection: ads_competitor_campaigns
// Data source: Will require competitor intelligence agent (not yet built)

// ═══════════════════════════════════════════════════════════════════════════════
// 5. BUDGET RECOMMENDATION ENGINE V2
//    Every campaign recommendation includes full budget rationale.
//    The Approval Queue MUST display these fields before any human action.
// ═══════════════════════════════════════════════════════════════════════════════

export interface BudgetRecommendationV2 {
  // What
  campaignName:        string
  adGroup?:            string
  action:              "set_budget" | "increase_budget" | "decrease_budget" | "pause" | "resume"

  // Current state
  currentDailyBudgetINR?: number
  currentSpendINR?:       number
  currentConversions?:    number

  // Recommended state
  recommendedDailyBudgetINR: number
  recommendedChangeINR?:     number  // delta; negative = decrease

  // Why
  rationale:           string
  whyGenerated:        string   // e.g. "3 dealer applications attributed to this campaign"
  conversionEvidence:  string   // e.g. "weighted lead value score: 320 (4 leads: 2 RFQ + 1 dealer + 1 OEM)"

  // Expected impact
  expectedClicksPerMonth:  number
  expectedLeadsPerMonth:   number
  expectedCPQL:            number  // cost per qualified lead = budget / expected leads
  confidence:              "high" | "medium" | "low"
  confidenceReason:        string

  // Risk
  riskLevel:           "low" | "medium" | "high"
  riskReason?:         string

  // Approval queue integration
  requiresApproval:    true
  expiresInDays:       number  // recommendation stale after N days
}

// Approval Queue item payload for budget recommendations
// type: "increase_budget" | "decrease_budget" — existing types in approval-queue.ts
// payload: BudgetRecommendationV2

// MongoDB collection: ads_budget_recommendations_v2
// Output feed: Approval Queue (ads_approval_queue)

// ═══════════════════════════════════════════════════════════════════════════════
// IMPLEMENTATION ORDER (when approved to build Phase 3)
//
// Week 1:
//   1. Lead Value Intelligence — depends on existing rfq_popup_leads + dealer-lead agent
//   2. Search Volume Gate — extends existing campaign-viability-checker.ts
//
// Week 2:
//   3. State Intelligence — depends on Lead Value Intelligence output
//   4. Budget Recommendation Engine V2 — upgrade existing budget-allocation-engine.ts
//
// Week 3:
//   5. Competitor Campaign Intelligence — blocked on competitor data source
//      (requires a new data ingestion agent — out of scope until Phase 3 is validated)
//
// SUCCESS METRIC (same as Phase 2):
//   More RFQs, more WhatsApp conversations, more dealer applications,
//   more OEM authorization enquiries, lower cost per qualified enquiry.
//   All optimization decisions tied to business outcomes, not keyword count.
// ═══════════════════════════════════════════════════════════════════════════════
