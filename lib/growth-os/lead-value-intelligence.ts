/**
 * Growth OS — Lead Value Intelligence (Phase 3A).
 *
 * Every lead is scored on three dimensions:
 *
 *   weightedLeadScore = leadTypeScore × opportunityScore × businessFitScore
 *
 * Lead Type Score (fixed, by conversion type):
 *   OEM Authorization = 100   (full OEM partner — multi-year recurring revenue)
 *   Dealer Application = 80   (channel acquisition — recurring commissions)
 *   GeM / Tender = 70         (government procurement)
 *   Government Procurement = 65
 *   RFQ (general) = 50        (direct machine purchase enquiry)
 *   Brochure Download = 10    (research intent, top of funnel)
 *
 * Opportunity Score (computed from lead signals):
 *   High-value GeM dealer = 2.0   (GeM inquiry, high dealer score ≥8, GeM keyword signals)
 *   Medium opportunity = 1.5      (dealer application, government procurement, score ≥5)
 *   Unknown = 1.0
 *
 * Business Fit Score (computed from product signals in the lead):
 *   Fogging machine = 2.0         (thermal/ULV/fog machine — core product)
 *   ULV / Vector Control = 1.8    (mosquito control, dengue, NVBDCP — adjacent)
 *   Agricultural sprayer = 1.2    (adjacent category, lower margin)
 *   Generic / unknown = 1.0
 *
 * Score range: 10 (brochure × unknown × generic) → 400 (OEM × GeM dealer × fogging).
 *
 * All keyword, landing page, state, and campaign recommendations use this score —
 * not raw conversion count.
 */

import type { Db } from "mongodb"
import clientPromise from "@/lib/mongodb"

// ── Collections ───────────────────────────────────────────────────────────────

const COLL_RFQ      = "rfq_popup_leads"
const COLL_BROCHURE = "brochure_leads"
const COLL_GEM_INQ  = "gem_inquiries"
const COLL_LVI      = "ads_lead_value_intelligence"

// ── Score tables ─────────────────────────────────────────────────────────────

export const LEAD_TYPE_SCORES: Record<string, number> = {
  oem_authorization:     100,
  dealer_application:     80,
  gem_inquiry:            70,
  tender_support:         70,
  government_procurement: 65,
  general:                50,   // generic RFQ
  brochure_download:      10,
}

export const OPPORTUNITY_LABELS = {
  gem_dealer:  { score: 2.0, label: "High-value GeM dealer" },
  medium:      { score: 1.5, label: "Medium opportunity"    },
  unknown:     { score: 1.0, label: "Unknown"               },
} as const

export const BUSINESS_FIT_LABELS = {
  fogging:     { score: 2.0, label: "Fogging machine"       },
  ulv_vector:  { score: 1.8, label: "ULV / Vector Control"  },
  agri:        { score: 1.2, label: "Agricultural sprayer"  },
  generic:     { score: 1.0, label: "Generic"               },
} as const

// ── Scoring functions ─────────────────────────────────────────────────────────

function getLeadTypeScore(leadType: string): { score: number; label: string } {
  const score = LEAD_TYPE_SCORES[leadType] ?? LEAD_TYPE_SCORES.general
  const label = leadType.replace(/_/g, " ")
  return { score, label }
}

const GEM_OPPORTUNITY_RE = /\b(gem|government\s*(e-)?marketplace|gem\s*(portal|seller|vendor|resell|auth|listed)|government\s*tender|tender\s*(bid|l1)|reverse\s*auction|gem\s*ra|nvbdcp|nhm|municipal\s*corp)\b/i
const MEDIUM_OPPORTUNITY_RE = /\b(dealer|dealership|distributor|reseller|government|panchayat|corporation|health\s*department|municipal)\b/i

function getOpportunityScore(lead: Record<string, unknown>): { score: number; label: string; signals: string[] } {
  const signals: string[] = []
  const allText = extractAllText(lead)

  const dealerScore = Number(lead.dealerScore ?? 0)
  const leadType    = String(lead.leadType ?? "general")
  const source      = String(lead.source ?? lead._collection ?? "")

  // High-value GeM dealer
  if (
    leadType === "gem_inquiry" ||
    source === "gem_inquiry" ||
    dealerScore >= 8 ||
    GEM_OPPORTUNITY_RE.test(allText)
  ) {
    if (leadType === "gem_inquiry" || source === "gem_inquiry") signals.push("GeM inquiry source")
    if (dealerScore >= 8) signals.push(`High dealer score (${dealerScore})`)
    if (GEM_OPPORTUNITY_RE.test(allText)) signals.push("GeM/government keyword in lead")
    return { ...OPPORTUNITY_LABELS.gem_dealer, signals }
  }

  // Medium opportunity
  if (
    leadType === "dealer_application" ||
    leadType === "government_procurement" ||
    leadType === "tender_support" ||
    dealerScore >= 5 ||
    MEDIUM_OPPORTUNITY_RE.test(allText)
  ) {
    if (leadType === "dealer_application") signals.push("Dealer application type")
    if (leadType === "government_procurement") signals.push("Government procurement type")
    if (dealerScore >= 5) signals.push(`Dealer score (${dealerScore})`)
    return { ...OPPORTUNITY_LABELS.medium, signals }
  }

  signals.push("No opportunity signal detected")
  return { ...OPPORTUNITY_LABELS.unknown, signals }
}

const FOGGING_RE    = /\b(fogg(?:ing|er|ers)?|thermal\s*fog|fog\s*machine|fogger|mist\s*blow(?:er)?|aero\s*blast)\b/i
const ULV_RE        = /\b(ulv|ultra\s*low\s*volume|vector\s*control|mosquito\s*control|dengue|malaria|nvbdcp|nhm|public\s*health|disinfect(?:ion|ant)?)\b/i
const AGRI_RE       = /\b(agricultural?\s*sprayer|crop\s*sprayer|farm\s*sprayer|pesticide\s*sprayer|knapsack)\b/i

function getBusinessFitScore(lead: Record<string, unknown>): { score: number; label: string; signals: string[] } {
  const signals: string[] = []
  const allText = extractAllText(lead)

  if (FOGGING_RE.test(allText)) {
    signals.push("Fogging machine keyword in lead")
    return { ...BUSINESS_FIT_LABELS.fogging, signals }
  }
  if (ULV_RE.test(allText)) {
    signals.push("ULV/vector control keyword in lead")
    return { ...BUSINESS_FIT_LABELS.ulv_vector, signals }
  }
  if (AGRI_RE.test(allText)) {
    signals.push("Agricultural sprayer keyword in lead")
    return { ...BUSINESS_FIT_LABELS.agri, signals }
  }

  signals.push("No specific product signal")
  return { ...BUSINESS_FIT_LABELS.generic, signals }
}

// Combine all text fields of a lead into a single string for regex matching
function extractAllText(lead: Record<string, unknown>): string {
  const parts: string[] = []
  const answers = lead.answers as Record<string, unknown> | undefined
  if (answers) parts.push(Object.values(answers).join(" "))
  for (const field of ["productName", "product", "message", "notes", "description", "requirement", "pagePath", "landingPage", "pageUrl", "utmTerm", "utmCampaign"]) {
    if (typeof lead[field] === "string") parts.push(String(lead[field]))
  }
  return parts.join(" ").toLowerCase()
}

// ── Dimension extraction ─────────────────────────────────────────────────────

function extractState(lead: Record<string, unknown>): string {
  // Direct field (brochure_leads, submissions)
  if (typeof lead.state === "string" && lead.state.trim()) return lead.state.trim()

  // From answers object (rfq_popup_leads)
  const answers = lead.answers as Record<string, string> | undefined
  if (answers) {
    for (const [key, val] of Object.entries(answers)) {
      if (/state|location|city|region/i.test(key) && typeof val === "string" && val.trim()) {
        return val.trim()
      }
    }
  }
  return "(unknown)"
}

function extractKeyword(lead: Record<string, unknown>): string {
  // RFQ leads: utm_term is the search keyword that drove the lead
  if (typeof lead.utmTerm === "string" && lead.utmTerm.trim()) return lead.utmTerm.trim().toLowerCase()
  // Brochure leads: productName is what the prospect was researching
  if (typeof lead.productName === "string" && lead.productName.trim()) return lead.productName.trim().toLowerCase()
  return "(direct/unknown)"
}

function extractLandingPage(lead: Record<string, unknown>): string {
  return String(lead.landingPage ?? lead.pagePath ?? lead.pageUrl ?? "(unknown)")
    .replace(/^https?:\/\/[^/]+/, "")  // strip domain, keep path
    .replace(/\?.*$/, "")              // strip query string
    || "(unknown)"
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface WeightedLeadScore {
  total:             number
  leadTypeScore:     number
  leadTypeLabel:     string
  opportunityScore:  number
  opportunityLabel:  string
  businessFitScore:  number
  businessFitLabel:  string
  opportunitySignals: string[]
  businessFitSignals: string[]
  breakdown:         string  // e.g. "80 (dealer) × 1.5 (medium) × 2.0 (fogging) = 240"
}

export interface ScoredLead {
  id:          string
  collection:  string
  keyword:     string
  landingPage: string
  state:       string
  campaign:    string
  adGroup:     string
  leadType:    string
  score:       WeightedLeadScore
  createdAt:   string
}

export interface KeywordValueRank {
  keyword:              string
  totalLeads:           number
  totalWeightedScore:   number
  avgWeightedScore:     number
  maxWeightedScore:     number
  leadMix:              Record<string, number>   // leadType → count
  topLandingPages:      string[]
  topStates:            string[]
  recommendedPriority:  "must_have" | "strong" | "moderate" | "weak"
  rationale:            string
}

export interface LandingPageValueRank {
  landingPage:          string
  totalLeads:           number
  totalWeightedScore:   number
  avgWeightedScore:     number
  leadMix:              Record<string, number>
  topKeywords:          string[]
  topStates:            string[]
}

export interface StateValueRank {
  state:                string
  totalLeads:           number
  totalWeightedScore:   number
  avgWeightedScore:     number
  leadMix:              Record<string, number>
  topKeywords:          string[]
  topLandingPages:      string[]
  densityLabel:         "high" | "medium" | "low"
}

export interface LeadValueIntelligenceRun {
  runId:               string
  periodDays:          number
  totalLeads:          number
  totalWeightedScore:  number
  avgWeightedScore:    number
  scoredLeads:         ScoredLead[]       // full per-lead detail for downstream use
  keywordRanks:        KeywordValueRank[]
  landingPageRanks:    LandingPageValueRank[]
  stateRanks:          StateValueRank[]
  topLeadType:         string
  leadMixSummary:      Record<string, { count: number; weightedScore: number }>
  generatedAt:         string
}

// ── Compute weighted score for a single lead ──────────────────────────────────

export function computeWeightedLeadScore(
  lead: Record<string, unknown>,
  sourceLeadType?: string,
): WeightedLeadScore {
  const leadType = sourceLeadType ?? String(lead.leadType ?? lead.type ?? "general")
  const { score: lts, label: ltl } = getLeadTypeScore(leadType)
  const { score: ops, label: opl, signals: opSig } = getOpportunityScore(lead)
  const { score: bfs, label: bfl, signals: bfSig } = getBusinessFitScore(lead)
  const total = lts * ops * bfs

  return {
    total:             Math.round(total * 10) / 10,
    leadTypeScore:     lts,
    leadTypeLabel:     ltl,
    opportunityScore:  ops,
    opportunityLabel:  opl,
    businessFitScore:  bfs,
    businessFitLabel:  bfl,
    opportunitySignals: opSig,
    businessFitSignals: bfSig,
    breakdown: `${lts} (${ltl}) × ${ops} (${opl}) × ${bfs} (${bfl}) = ${Math.round(total)}`,
  }
}

// ── Aggregation helpers ────────────────────────────────────────────────────────

function buildKeywordRanks(leads: ScoredLead[]): KeywordValueRank[] {
  const map = new Map<string, {
    leads: ScoredLead[]
    totalScore: number
    maxScore: number
    leadMix: Record<string, number>
    pages: Map<string, number>
    states: Map<string, number>
  }>()

  for (const lead of leads) {
    const kw  = lead.keyword || "(direct/unknown)"
    const ex  = map.get(kw) ?? {
      leads:      [] as ScoredLead[],
      totalScore: 0,
      maxScore:   0,
      leadMix:    {} as Record<string, number>,
      pages:      new Map<string, number>(),
      states:     new Map<string, number>(),
    }
    ex.leads.push(lead)
    ex.totalScore += lead.score.total
    ex.maxScore    = Math.max(ex.maxScore, lead.score.total)
    ex.leadMix[lead.leadType] = (ex.leadMix[lead.leadType] ?? 0) + 1
    ex.pages.set(lead.landingPage, (ex.pages.get(lead.landingPage) ?? 0) + 1)
    ex.states.set(lead.state, (ex.states.get(lead.state) ?? 0) + 1)
    map.set(kw, ex)
  }

  return Array.from(map.entries())
    .map(([keyword, data]) => {
      const total = Math.round(data.totalScore)
      const avg   = Math.round(data.totalScore / data.leads.length)
      const priority: KeywordValueRank["recommendedPriority"] =
        total >= 300 ? "must_have" :
        total >= 100 ? "strong"    :
        total >= 40  ? "moderate"  : "weak"

      const topTypes = Object.entries(data.leadMix)
        .sort((a, b) => b[1] - a[1])
        .map(([t, c]) => `${c} ${t.replace(/_/g, " ")}`)
        .join(", ")

      return {
        keyword,
        totalLeads:          data.leads.length,
        totalWeightedScore:  total,
        avgWeightedScore:    avg,
        maxWeightedScore:    Math.round(data.maxScore),
        leadMix:             data.leadMix,
        topLandingPages:     [...data.pages.entries()].sort((a,b)=>b[1]-a[1]).slice(0,3).map(([p])=>p),
        topStates:           [...data.states.entries()].sort((a,b)=>b[1]-a[1]).slice(0,3).map(([s])=>s),
        recommendedPriority: priority,
        rationale:           `Weighted score ${total} from ${data.leads.length} leads: ${topTypes}. Score uses leadTypeScore × opportunityScore × businessFitScore.`,
      }
    })
    .sort((a, b) => b.totalWeightedScore - a.totalWeightedScore)
}

function buildLandingPageRanks(leads: ScoredLead[]): LandingPageValueRank[] {
  const map = new Map<string, { leads: ScoredLead[]; totalScore: number; leadMix: Record<string,number>; kws: Map<string,number>; states: Map<string,number> }>()
  for (const lead of leads) {
    const page = lead.landingPage
    const ex = map.get(page) ?? { leads: [] as ScoredLead[], totalScore: 0, leadMix: {} as Record<string, number>, kws: new Map<string, number>(), states: new Map<string, number>() }
    ex.leads.push(lead)
    ex.totalScore += lead.score.total
    ex.leadMix[lead.leadType] = (ex.leadMix[lead.leadType] ?? 0) + 1
    ex.kws.set(lead.keyword, (ex.kws.get(lead.keyword) ?? 0) + 1)
    ex.states.set(lead.state, (ex.states.get(lead.state) ?? 0) + 1)
    map.set(page, ex)
  }

  return Array.from(map.entries())
    .map(([landingPage, data]) => ({
      landingPage,
      totalLeads:         data.leads.length,
      totalWeightedScore: Math.round(data.totalScore),
      avgWeightedScore:   Math.round(data.totalScore / data.leads.length),
      leadMix:            data.leadMix,
      topKeywords:        [...data.kws.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k])=>k),
      topStates:          [...data.states.entries()].sort((a,b)=>b[1]-a[1]).slice(0,3).map(([s])=>s),
    }))
    .sort((a, b) => b.totalWeightedScore - a.totalWeightedScore)
}

function buildStateRanks(leads: ScoredLead[]): StateValueRank[] {
  const map = new Map<string, { leads: ScoredLead[]; totalScore: number; leadMix: Record<string,number>; kws: Map<string,number>; pages: Map<string,number> }>()
  for (const lead of leads) {
    const state = lead.state
    const ex = map.get(state) ?? { leads: [] as ScoredLead[], totalScore: 0, leadMix: {} as Record<string, number>, kws: new Map<string, number>(), pages: new Map<string, number>() }
    ex.leads.push(lead)
    ex.totalScore += lead.score.total
    ex.leadMix[lead.leadType] = (ex.leadMix[lead.leadType] ?? 0) + 1
    ex.kws.set(lead.keyword, (ex.kws.get(lead.keyword) ?? 0) + 1)
    ex.pages.set(lead.landingPage, (ex.pages.get(lead.landingPage) ?? 0) + 1)
    map.set(state, ex)
  }

  const ranked = Array.from(map.entries())
    .map(([state, data]) => ({
      state,
      totalLeads:         data.leads.length,
      totalWeightedScore: Math.round(data.totalScore),
      avgWeightedScore:   Math.round(data.totalScore / data.leads.length),
      leadMix:            data.leadMix,
      topKeywords:        [...data.kws.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k])=>k),
      topLandingPages:    [...data.pages.entries()].sort((a,b)=>b[1]-a[1]).slice(0,3).map(([p])=>p),
      densityLabel:       "low" as StateValueRank["densityLabel"],
    }))
    .sort((a, b) => b.totalWeightedScore - a.totalWeightedScore)

  // Assign density label based on relative position
  const topScore = ranked[0]?.totalWeightedScore ?? 1
  for (const r of ranked) {
    r.densityLabel =
      r.totalWeightedScore >= topScore * 0.5 ? "high" :
      r.totalWeightedScore >= topScore * 0.2 ? "medium" : "low"
  }

  return ranked
}

// ── Main ──────────────────────────────────────────────────────────────────────

export async function runLeadValueIntelligence(
  opts: { periodDays?: number } = {},
): Promise<LeadValueIntelligenceRun> {
  const periodDays = opts.periodDays ?? 90
  const since      = new Date(Date.now() - periodDays * 86_400_000).toISOString()

  const client = await clientPromise
  const db     = client.db() as Db

  const [rfqLeads, brochureLeads, gemInquiries] = await Promise.all([
    db.collection(COLL_RFQ)
      .find({ createdAt: { $gte: since } })
      .sort({ createdAt: -1 })
      .limit(3000)
      .toArray(),
    db.collection(COLL_BROCHURE)
      .find({ createdAt: { $gte: since } })
      .sort({ createdAt: -1 })
      .limit(2000)
      .toArray(),
    db.collection(COLL_GEM_INQ)
      .find({ createdAt: { $gte: since } })
      .sort({ createdAt: -1 })
      .limit(500)
      .toArray(),
  ])

  const scoredLeads: ScoredLead[] = []

  // ── RFQ leads ──────────────────────────────────────────────────────────────
  for (const lead of rfqLeads) {
    const leadType  = String(lead.leadType ?? "general")
    const utmCampaign = String(lead.utmCampaign ?? "")
    const score     = computeWeightedLeadScore(lead as Record<string, unknown>, leadType)
    scoredLeads.push({
      id:          String(lead._id),
      collection:  COLL_RFQ,
      keyword:     extractKeyword(lead as Record<string, unknown>),
      landingPage: extractLandingPage(lead as Record<string, unknown>),
      state:       extractState(lead as Record<string, unknown>),
      campaign:    String(lead.utmCampaign ?? ""),
      adGroup:     utmCampaign.includes("|") ? utmCampaign.split("|")[1]?.trim() ?? "" : "",
      leadType,
      score,
      createdAt:   String(lead.createdAt ?? ""),
    })
  }

  // ── Brochure leads ─────────────────────────────────────────────────────────
  for (const lead of brochureLeads) {
    const score = computeWeightedLeadScore(lead as Record<string, unknown>, "brochure_download")
    scoredLeads.push({
      id:          String(lead._id),
      collection:  COLL_BROCHURE,
      keyword:     extractKeyword(lead as Record<string, unknown>),
      landingPage: extractLandingPage(lead as Record<string, unknown>),
      state:       extractState(lead as Record<string, unknown>),
      campaign:    "",
      adGroup:     "",
      leadType:    "brochure_download",
      score,
      createdAt:   String(lead.createdAt ?? ""),
    })
  }

  // ── GeM inquiries ──────────────────────────────────────────────────────────
  for (const lead of gemInquiries) {
    const score = computeWeightedLeadScore(lead as Record<string, unknown>, "gem_inquiry")
    scoredLeads.push({
      id:          String(lead._id),
      collection:  COLL_GEM_INQ,
      keyword:     extractKeyword(lead as Record<string, unknown>),
      landingPage: extractLandingPage(lead as Record<string, unknown>),
      state:       extractState(lead as Record<string, unknown>),
      campaign:    "",
      adGroup:     "",
      leadType:    "gem_inquiry",
      score,
      createdAt:   String(lead.createdAt ?? ""),
    })
  }

  // ── Aggregations ──────────────────────────────────────────────────────────
  const totalWeightedScore = scoredLeads.reduce((s, l) => s + l.score.total, 0)
  const avgWeightedScore   = scoredLeads.length > 0
    ? Math.round(totalWeightedScore / scoredLeads.length) : 0

  const keywordRanks     = buildKeywordRanks(scoredLeads)
  const landingPageRanks = buildLandingPageRanks(scoredLeads)
  const stateRanks       = buildStateRanks(scoredLeads)

  // Lead mix summary
  const leadMixSummary: LeadValueIntelligenceRun["leadMixSummary"] = {}
  for (const lead of scoredLeads) {
    const ex = leadMixSummary[lead.leadType] ?? { count: 0, weightedScore: 0 }
    ex.count++
    ex.weightedScore += lead.score.total
    leadMixSummary[lead.leadType] = ex
  }

  const topLeadType = Object.entries(leadMixSummary)
    .sort((a, b) => b[1].weightedScore - a[1].weightedScore)[0]?.[0] ?? "(none)"

  const runId = `lvi_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  const run: LeadValueIntelligenceRun = {
    runId,
    periodDays,
    totalLeads:          scoredLeads.length,
    totalWeightedScore:  Math.round(totalWeightedScore),
    avgWeightedScore,
    scoredLeads,
    keywordRanks,
    landingPageRanks,
    stateRanks,
    topLeadType,
    leadMixSummary,
    generatedAt: new Date().toISOString(),
  }

  // Store without the full scoredLeads array to keep the document manageable;
  // scoredLeads is useful for downstream modules but bloats the run document.
  const { scoredLeads: _omit, ...runSummary } = run
  void _omit
  await db.collection(COLL_LVI).insertOne({
    ...runSummary,
    scoredLeadCount: scoredLeads.length,
    // Store only the top 100 scored leads for audit (sorted by score DESC)
    topScoredLeads: scoredLeads
      .sort((a, b) => b.score.total - a.score.total)
      .slice(0, 100),
  })

  return run
}
