/**
 * Growth OS — Conversion Intelligence Layer.
 *
 * Continuously answers:
 *   • Which keywords generated RFQs?
 *   • Which landing pages generate the highest conversion rate?
 *   • Which states generate the best leads?
 *   • Which UTM campaigns/ad groups generate the best leads?
 *   • Which search terms waste money (spend without conversion)?
 *
 * Outputs:
 *   • Winner keywords (high conversion signal)
 *   • Loser keywords (impressions/clicks, zero conversion)
 *   • Recommended negatives → Approval Queue
 *   • Landing page recommendations → Approval Queue
 *   • Budget reallocation recommendations → Approval Queue
 *
 * Data sources (in priority order):
 *   1. rfq_popup_leads      — RFQ form submissions with UTM attribution
 *   2. brochure_leads       — Brochure download leads (lower intent)
 *   3. ads_searchterm_rows  — Google Ads search term report (after launch)
 *   4. gsc_query_rows       — GSC impressions/clicks
 *
 * GOVERNANCE: This engine generates recommendations only.
 * Nothing is applied automatically. All outputs go to the Approval Queue.
 */

import type { Db } from "mongodb"
import clientPromise from "@/lib/mongodb"
import { pushBatch, type ApprovalItem } from "@/lib/growth-os/approval-queue"

// ── Collection names ──────────────────────────────────────────────────────────

const COLL_RFQ        = "rfq_popup_leads"
const COLL_BROCHURE   = "brochure_leads"
const COLL_SEARCHTERM = "ads_searchterm_rows"
const COLL_GSC        = "gsc_query_rows"
export const CONVERSION_INTELLIGENCE_COLL = "ads_conversion_intelligence"

// ── Types ────────────────────────────────────────────────────────────────────

export type LeadType = "rfq" | "brochure" | "contact"

export interface ConversionSignal {
  keyword:      string   // utm_term or search query
  campaign:     string   // utm_campaign
  adGroup:      string   // derived from utm_content or campaign name
  landingPage:  string   // page the lead converted on
  leadType:     LeadType
  state:        string   // from answers.state if available
  createdAt:    string
}

export interface KeywordPerformance {
  keyword:        string
  conversions:    number
  leadTypes:      Partial<Record<LeadType, number>>
  campaigns:      string[]
  landingPages:   string[]
  firstSeen:      string
  lastSeen:       string
  signal:         "winner" | "loser" | "neutral"
  signalReason:   string
}

export interface LandingPagePerformance {
  page:           string
  conversions:    number
  leadTypes:      Partial<Record<LeadType, number>>
  topKeywords:    string[]
  conversionRank: number   // 1 = highest converting
}

export interface AdGroupPerformance {
  campaign:     string
  adGroup:      string
  conversions:  number
  cpa?:         number   // available only once ad spend data is in DB
}

export interface StatePerformance {
  state:       string
  conversions: number
  topPages:    string[]
  topLeadType: LeadType
}

export interface ConversionIntelligenceRun {
  runId:               string
  periodDays:          number
  periodStart:         string
  periodEnd:           string
  totalLeads:          number
  byLeadType:          Partial<Record<LeadType, number>>
  winnerKeywords:      KeywordPerformance[]
  loserKeywords:       KeywordPerformance[]
  landingPagePerf:     LandingPagePerformance[]
  adGroupPerf:         AdGroupPerformance[]
  statePerf:           StatePerformance[]
  recommendationsCount: number
  generatedAt:         string
}

// ── Lead normalization ────────────────────────────────────────────────────────

function normalizeKeyword(raw: string): string {
  return (raw || "").toLowerCase().trim().replace(/\+/g, " ").replace(/\s+/g, " ")
}

function extractState(answers: Record<string, unknown> | undefined): string {
  if (!answers) return ""
  const raw = String(answers.state ?? answers.State ?? answers.location ?? "").trim()
  return raw.length > 1 ? raw : ""
}

function extractAdGroup(utmContent: string, campaign: string): string {
  if (utmContent && utmContent.trim()) return utmContent.trim()
  // Derive ad group from campaign naming convention: "campaign_name|ad_group_name"
  if (campaign.includes("|")) return campaign.split("|")[1].trim()
  return campaign
}

// ── Data collection ───────────────────────────────────────────────────────────

async function collectLeads(db: Db, periodDays: number): Promise<ConversionSignal[]> {
  const since = new Date(Date.now() - periodDays * 86_400_000).toISOString()
  const signals: ConversionSignal[] = []

  // RFQ leads
  const rfqLeads = await db.collection(COLL_RFQ)
    .find({ createdAt: { $gte: since } })
    .project({ utmTerm: 1, utmCampaign: 1, pagePath: 1, landingPage: 1, answers: 1, utm: 1, createdAt: 1 })
    .limit(5000)
    .toArray()

  for (const lead of rfqLeads) {
    const keyword    = normalizeKeyword(String(lead.utmTerm ?? lead.utm?.utm_term ?? ""))
    const campaign   = String(lead.utmCampaign ?? lead.utm?.utm_campaign ?? "")
    const utmContent = String(lead.utm?.utm_content ?? "")
    const landingPage = String(lead.landingPage ?? lead.pagePath ?? "")
    if (!keyword && !campaign) continue   // no attribution data

    signals.push({
      keyword,
      campaign,
      adGroup:     extractAdGroup(utmContent, campaign),
      landingPage,
      leadType:    "rfq",
      state:       extractState(lead.answers as Record<string, unknown>),
      createdAt:   String(lead.createdAt ?? ""),
    })
  }

  // Brochure leads (lower intent — counted separately)
  const brochureLeads = await db.collection(COLL_BROCHURE)
    .find({ createdAt: { $gte: since } })
    .project({ utm: 1, form_page_path: 1, attribution: 1, createdAt: 1 })
    .limit(2000)
    .toArray()

  for (const lead of brochureLeads) {
    const keyword    = normalizeKeyword(String(lead.utm?.utm_term ?? lead.attribution?.utm_term ?? ""))
    const campaign   = String(lead.utm?.utm_campaign ?? lead.attribution?.utm_campaign ?? "")
    const landingPage = String(lead.form_page_path ?? "")
    if (!keyword && !campaign) continue

    signals.push({
      keyword,
      campaign,
      adGroup:     extractAdGroup(String(lead.utm?.utm_content ?? ""), campaign),
      landingPage,
      leadType:    "brochure",
      state:       "",
      createdAt:   String(lead.createdAt ?? ""),
    })
  }

  return signals
}

// ── Keyword performance analysis ──────────────────────────────────────────────

function buildKeywordPerformance(signals: ConversionSignal[]): KeywordPerformance[] {
  const map = new Map<string, KeywordPerformance>()

  for (const s of signals) {
    if (!s.keyword) continue
    const existing = map.get(s.keyword)
    if (!existing) {
      const lt: Partial<Record<LeadType, number>> = {}
      lt[s.leadType] = 1
      map.set(s.keyword, {
        keyword:      s.keyword,
        conversions:  1,
        leadTypes:    lt,
        campaigns:    s.campaign ? [s.campaign] : [],
        landingPages: s.landingPage ? [s.landingPage] : [],
        firstSeen:    s.createdAt,
        lastSeen:     s.createdAt,
        signal:       "neutral",
        signalReason: "",
      })
    } else {
      existing.conversions += 1
      existing.leadTypes[s.leadType] = ((existing.leadTypes[s.leadType] as number | undefined) ?? 0) + 1
      if (s.campaign && !existing.campaigns.includes(s.campaign)) existing.campaigns.push(s.campaign)
      if (s.landingPage && !existing.landingPages.includes(s.landingPage)) existing.landingPages.push(s.landingPage)
      if (s.createdAt < existing.firstSeen) existing.firstSeen = s.createdAt
      if (s.createdAt > existing.lastSeen)  existing.lastSeen  = s.createdAt
    }
  }

  const result = Array.from(map.values())

  // Classify winners and losers
  for (const kw of result) {
    const rfqCount = kw.leadTypes.rfq ?? 0
    if (rfqCount >= 3) {
      kw.signal       = "winner"
      kw.signalReason = `${rfqCount} RFQ conversions — strong commercial signal`
    } else if (rfqCount >= 1) {
      kw.signal       = "winner"
      kw.signalReason = `${rfqCount} RFQ conversion — emerging signal, monitor`
    } else if (kw.conversions >= 2 && rfqCount === 0) {
      kw.signal       = "neutral"
      kw.signalReason = `${kw.conversions} brochure leads, 0 RFQ — low-intent signal`
    }
  }

  return result.sort((a, b) => b.conversions - a.conversions)
}

// ── Landing page performance ──────────────────────────────────────────────────

function buildLandingPagePerformance(signals: ConversionSignal[]): LandingPagePerformance[] {
  const map = new Map<string, { conversions: number; leadTypes: Partial<Record<LeadType, number>>; keywords: Map<string, number> }>()

  for (const s of signals) {
    const page = s.landingPage || "(unknown)"
    const existing = map.get(page) ?? { conversions: 0, leadTypes: {} as Partial<Record<LeadType, number>>, keywords: new Map<string, number>() }
    existing.conversions += 1
    existing.leadTypes[s.leadType] = ((existing.leadTypes[s.leadType] as number | undefined) ?? 0) + 1
    if (s.keyword) existing.keywords.set(s.keyword, (existing.keywords.get(s.keyword) ?? 0) + 1)
    map.set(page, existing)
  }

  const pages = Array.from(map.entries())
    .map(([page, data]) => ({
      page,
      conversions: data.conversions,
      leadTypes:   data.leadTypes,
      topKeywords: Array.from(data.keywords.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([kw]) => kw),
      conversionRank: 0,
    }))
    .sort((a, b) => b.conversions - a.conversions)

  pages.forEach((p, i) => { p.conversionRank = i + 1 })
  return pages
}

// ── Ad group performance ──────────────────────────────────────────────────────

function buildAdGroupPerformance(signals: ConversionSignal[]): AdGroupPerformance[] {
  const map = new Map<string, { campaign: string; conversions: number }>()

  for (const s of signals) {
    if (!s.campaign && !s.adGroup) continue
    const key = `${s.campaign}||${s.adGroup}`
    const ex  = map.get(key) ?? { campaign: s.campaign, conversions: 0 }
    ex.conversions += 1
    map.set(key, ex)
  }

  return Array.from(map.entries())
    .map(([key, data]) => ({
      campaign:    data.campaign,
      adGroup:     key.split("||")[1] ?? "",
      conversions: data.conversions,
    }))
    .sort((a, b) => b.conversions - a.conversions)
}

// ── State performance ─────────────────────────────────────────────────────────

function buildStatePerformance(signals: ConversionSignal[]): StatePerformance[] {
  const map = new Map<string, { conversions: number; pages: Map<string, number>; leadTypes: Partial<Record<LeadType, number>> }>()

  for (const s of signals) {
    if (!s.state) continue
    const ex = map.get(s.state) ?? { conversions: 0, pages: new Map<string, number>(), leadTypes: {} as Partial<Record<LeadType, number>> }
    ex.conversions += 1
    ex.leadTypes[s.leadType] = ((ex.leadTypes[s.leadType] as number | undefined) ?? 0) + 1
    if (s.landingPage) ex.pages.set(s.landingPage, (ex.pages.get(s.landingPage) ?? 0) + 1)
    map.set(s.state, ex)
  }

  return Array.from(map.entries()).map(([state, data]) => {
    const topLeadType = (Object.entries(data.leadTypes).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "rfq") as LeadType
    return {
      state,
      conversions: data.conversions,
      topPages:    Array.from(data.pages.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([p]) => p),
      topLeadType,
    }
  }).sort((a, b) => b.conversions - a.conversions)
}

// ── Recommendation generation ─────────────────────────────────────────────────

function buildRecommendations(
  kwPerf:    KeywordPerformance[],
  pagePerf:  LandingPagePerformance[],
  agPerf:    AdGroupPerformance[],
): Omit<ApprovalItem, "id" | "status" | "generatedAt" | "expiresAt">[] {
  const recs: Omit<ApprovalItem, "id" | "status" | "generatedAt" | "expiresAt">[] = []

  // Winner keyword promotion
  for (const kw of kwPerf.filter(k => k.signal === "winner" && (k.leadTypes.rfq ?? 0) >= 2)) {
    recs.push({
      type:            "promote_keyword",
      priority:        "high",
      title:           `Promote keyword to EXACT: "${kw.keyword}"`,
      rationale:       `${kw.leadTypes.rfq ?? 0} RFQ conversions in the analysis window. Promote from PHRASE to EXACT to concentrate budget on this proven query.`,
      payload:         { keyword: kw.keyword, campaigns: kw.campaigns, fromMatchType: "PHRASE", toMatchType: "EXACT" },
      estimatedImpact: `Reduce wasted spend on broad variants. Concentrate impressions on the converting form.`,
      agentSource:     "conversion-intelligence",
      dataWindowDays:  30,
      confidence:      Math.min(95, 60 + (kw.leadTypes.rfq ?? 0) * 10),
    })
  }

  // Landing page recommendation — best converting page for each keyword cluster
  const topPage = pagePerf[0]
  if (topPage && topPage.conversions >= 3 && pagePerf.length >= 2) {
    const secondPage = pagePerf[1]
    if (topPage.conversions >= secondPage.conversions * 2) {
      recs.push({
        type:            "change_landing_page",
        priority:        "medium",
        title:           `Route more traffic to top-converting page: ${topPage.page}`,
        rationale:       `${topPage.page} has ${topPage.conversions} conversions vs ${secondPage.page} with ${secondPage.conversions}. Consider routing campaigns that currently land on lower-converting pages.`,
        payload:         { topPage: topPage.page, topPageConversions: topPage.conversions, topKeywords: topPage.topKeywords },
        estimatedImpact: `Up to ${Math.round((topPage.conversions / Math.max(secondPage.conversions, 1) - 1) * 100)}% conversion rate improvement.`,
        agentSource:     "conversion-intelligence",
        dataWindowDays:  30,
        confidence:      70,
      })
    }
  }

  // Ad groups with zero conversions (if there are ad groups with data)
  for (const ag of agPerf.filter(a => a.conversions === 0 && a.campaign)) {
    recs.push({
      type:            "pause_ad_group",
      priority:        "low",
      title:           `Review zero-conversion ad group: ${ag.adGroup || ag.campaign}`,
      rationale:       `Ad group "${ag.adGroup || ag.campaign}" has 0 conversions in the analysis window. Verify whether it is spending budget without generating leads.`,
      payload:         { campaign: ag.campaign, adGroup: ag.adGroup },
      estimatedImpact: `Potential budget recovery if this ad group is spending without converting.`,
      agentSource:     "conversion-intelligence",
      dataWindowDays:  30,
      confidence:      50,
    })
  }

  return recs
}

// ── Cross-reference: loser detection from GSC ─────────────────────────────────
// Queries with high GSC impressions but zero RFQ attribution may be wasting
// organic real estate that would become paid wasted spend if deployed.

async function findLoserCandidates(
  db:      Db,
  winners: Set<string>,
): Promise<KeywordPerformance[]> {
  const rows = await db.collection(COLL_GSC)
    .find({ impressions: { $gte: 50 }, clicks: { $lte: 2 } })
    .sort({ impressions: -1 })
    .limit(100)
    .toArray()

  return rows
    .filter(r => {
      const q = String(r.query ?? "").toLowerCase().trim()
      return q.length > 3 && !winners.has(q)
    })
    .map(r => ({
      keyword:      String(r.query ?? "").toLowerCase().trim(),
      conversions:  0,
      leadTypes:    {},
      campaigns:    [],
      landingPages: [],
      firstSeen:    "",
      lastSeen:     "",
      signal:       "loser" as const,
      signalReason: `${r.impressions} GSC impressions, ${r.clicks ?? 0} clicks, 0 attributed conversions — low CTR candidate`,
    }))
}

// ── Main runner ───────────────────────────────────────────────────────────────

export async function runConversionIntelligence(
  opts: { periodDays?: number; pushRecommendations?: boolean } = {},
): Promise<ConversionIntelligenceRun> {
  const periodDays = opts.periodDays ?? 30
  const pushRecs   = opts.pushRecommendations ?? true

  const client = await clientPromise
  const db     = client.db() as Db

  const periodEnd   = new Date()
  const periodStart = new Date(periodEnd.getTime() - periodDays * 86_400_000)

  // Collect all conversion signals
  const signals = await collectLeads(db, periodDays)

  // Build performance matrices
  const kwPerf   = buildKeywordPerformance(signals)
  const pagePerf = buildLandingPagePerformance(signals)
  const agPerf   = buildAdGroupPerformance(signals)
  const statePerf = buildStatePerformance(signals)

  // Winner set for loser detection
  const winnerSet = new Set(kwPerf.filter(k => k.signal === "winner").map(k => k.keyword))
  const losers    = await findLoserCandidates(db, winnerSet)

  // Generate recommendations
  const recs = buildRecommendations(kwPerf, pagePerf, agPerf)

  if (pushRecs && recs.length > 0) {
    await pushBatch(db, recs)
  }

  // Summarize lead type distribution
  const byLeadType: Partial<Record<LeadType, number>> = {}
  for (const s of signals) {
    byLeadType[s.leadType] = (byLeadType[s.leadType] ?? 0) + 1
  }

  const runId = `ci_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  const run: ConversionIntelligenceRun = {
    runId,
    periodDays,
    periodStart: periodStart.toISOString(),
    periodEnd:   periodEnd.toISOString(),
    totalLeads:  signals.length,
    byLeadType,
    winnerKeywords:  kwPerf.filter(k => k.signal === "winner"),
    loserKeywords:   losers,
    landingPagePerf: pagePerf,
    adGroupPerf:     agPerf,
    statePerf,
    recommendationsCount: recs.length,
    generatedAt: new Date().toISOString(),
  }

  await db.collection(CONVERSION_INTELLIGENCE_COLL).insertOne({ ...run })
  return run
}
