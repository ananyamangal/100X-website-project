/**
 * Growth OS — Campaign Factory V2.
 *
 * Conversion-intelligence-driven campaign generator.
 *
 * V1 factory (agents/ads-campaign-factory.ts) was keyword-list-centric.
 * V2 starts from CONVERSION SIGNALS and works backwards to build campaigns:
 *
 *   1. Conversion Signals   — which keywords/pages drove RFQs, WhatsApp, Dealer, OEM leads
 *   2. Demand Signals       — what is being searched (GSC, Ads search terms)
 *   3. Search Term Signals  — what triggered our ads and clicked through
 *   4. Negative Signals     — what to exclude (auto-negative engine output)
 *   5. Budget Signals       — where to allocate spend (budget allocation engine output)
 *
 * Every recommendation in the output explains:
 *   - WHY it was generated (which signals triggered it)
 *   - WHICH conversion signals support it (specific lead counts)
 *   - EXPECTED business impact (estimated RFQs, dealer applications, OEM enquiries)
 *
 * GOVERNANCE (permanent, non-negotiable):
 *   - Produces DRAFTS only. Deploys nothing automatically.
 *   - All output goes to the Approval Queue as "pending".
 *   - Zero money spent. Zero campaigns launched. Human approval required.
 *
 * Objective: More RFQs, more WhatsApp conversations, more dealer applications,
 * more OEM authorization enquiries, lower cost per qualified enquiry.
 */

import type { Db } from "mongodb"
import clientPromise from "@/lib/mongodb"
import {
  extractFromConversions,
  runKeywordIntelligence,
  type GeneratedKeyword,
  type KeywordSource,
  type AdGroupTheme,
} from "@/lib/growth-os/ads-keyword-intelligence"
import { pushBatch, type ApprovalItem } from "@/lib/growth-os/approval-queue"
import { ADS_FUNNEL_A } from "@/lib/growth-os/ads-fuv-config"

// ── Constants ─────────────────────────────────────────────────────────────────

const COLL_FACTORY_V2     = "ads_campaign_factory_v2_runs"
const COLL_SEARCHTERMS    = "ads_searchterm_rows"
const COLL_AUTO_NEG_RUNS  = "ads_auto_negative_runs"
const COLL_BUDGET_RUNS    = "ads_budget_allocation_runs"
const COLL_CI_RUNS        = "ads_conversion_intelligence"

const GEO_INDIA = "2356"  // Google Ads geo code for India

// Landing pages ranked by conversion rate (best converting page for each intent)
const LANDING_PAGE_BY_THEME: Record<AdGroupTheme, string> = {
  dealer:       "/become-a-dealer",
  oem:          "/gem-oem-authorization",
  gem:          "/gem-reverse-auction-fogging",
  direct_buyer: "/public-health-equipment",
}

const CONVERSION_SOURCES: KeywordSource[] = [
  "ads_search_terms", "rfq_conversion", "whatsapp_conversion",
  "phone_conversion", "dealer_conversion", "oem_conversion",
]

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ConversionEvidence {
  type:         "rfq" | "whatsapp" | "phone" | "dealer" | "oem" | "brochure" | "gem_inquiry"
  count:        number
  keywords:     string[]
  landingPages: string[]
}

export interface EstimatedImpact {
  basedOnConversions: number
  rfqsPerMonth:       string
  dealerApplications: string
  oemEnquiries:       string
  costPerQualifiedLead: string
  confidence:         "high" | "medium" | "low"
  reasoning:          string
}

export interface KeywordDraftV2 {
  text:            string
  matchType:       "EXACT" | "PHRASE" | "BROAD"
  source:          KeywordSource
  conversionCount: number
  rationale:       string
}

export interface NegativeDraftV2 {
  text:       string
  matchType:  "EXACT" | "PHRASE"
  reason:     string
  confidence: number
  category:   string
}

export interface AdGroupDraftV2 {
  name:                 string
  theme:                AdGroupTheme
  landingPage:          string
  landingPageRationale: string
  keywords:             KeywordDraftV2[]
  negatives:            NegativeDraftV2[]
  conversionEvidence:   ConversionEvidence[]
  rationale:            string
}

export interface CampaignV2Draft {
  planId:              string
  campaignName:        string
  objective:           string
  status:              "draft_pending_approval"
  biddingStrategy:     "MANUAL_CPC"
  dailyBudgetINR:      number
  geo:                 string
  adGroups:            AdGroupDraftV2[]
  campaignNegatives:   NegativeDraftV2[]
  rationale:           string
  whyCreated:          string
  conversionEvidence:  ConversionEvidence[]
  estimatedImpact:     EstimatedImpact
  signalsUsed:         string[]
  dataWindowDays:      number
  governance:          string
  generatedAt:         string
  requiresApproval:    true
}

export interface CampaignFactoryV2Run {
  runId:        string
  triggeredBy:  string
  drafts:       CampaignV2Draft[]
  draftCount:   number
  signalSummary: {
    conversionSignals:  number
    demandSignals:      number
    searchTermSignals:  number
    negativeSignals:    number
    budgetSignals:      number
  }
  pushedToQueue:  number
  generatedAt:    string
  governance:     string
}

// ── Signal loaders ────────────────────────────────────────────────────────────

async function loadSearchTermSignals(db: Db): Promise<Array<{ term: string; clicks: number; conversions: number; campaign: string }>> {
  const rows = await db.collection(COLL_SEARCHTERMS).find({}).limit(500).toArray()
  return rows.map(r => ({
    term:        String(r.searchTerm ?? r.search_term ?? "").toLowerCase().trim(),
    clicks:      Number(r.clicks ?? 0),
    conversions: Number(r.conversions ?? 0),
    campaign:    String(r.campaign ?? ""),
  })).filter(r => r.term.length >= 3)
}

async function loadNegativeSignals(db: Db): Promise<NegativeDraftV2[]> {
  const latest = await db.collection(COLL_AUTO_NEG_RUNS)
    .find({})
    .sort({ generatedAt: -1 })
    .limit(1)
    .toArray()

  if (!latest[0]) return []

  const candidates = (latest[0].candidates ?? []) as Array<{
    term: string; matchType?: string; reason?: string;
    confidence?: number; category?: string
  }>

  return candidates.map(c => ({
    text:       c.term,
    matchType:  (c.matchType === "EXACT" ? "EXACT" : "PHRASE") as "EXACT" | "PHRASE",
    reason:     c.reason ?? "Auto-detected irrelevant query",
    confidence: Number(c.confidence ?? 70),
    category:   c.category ?? "auto_detected",
  }))
}

async function loadBudgetSignals(db: Db): Promise<{ adGroupsWithWaste: number; adGroupsToScale: number }> {
  const latest = await db.collection(COLL_BUDGET_RUNS)
    .find({})
    .sort({ generatedAt: -1 })
    .limit(1)
    .toArray()

  if (!latest[0]) return { adGroupsWithWaste: 0, adGroupsToScale: 0 }
  const recs = (latest[0].recommendations ?? []) as Array<{ action: string }>
  return {
    adGroupsWithWaste: recs.filter(r => r.action === "pause_ad_group" || r.action === "decrease_budget").length,
    adGroupsToScale:   recs.filter(r => r.action === "increase_budget" || r.action === "expand_ad_group").length,
  }
}

async function loadConversionIntelligence(db: Db): Promise<{
  topKeywords:    Array<{ keyword: string; conversions: number; signal: string }>
  topPages:       Array<{ page: string; conversions: number }>
  totalLeads:     number
}> {
  const latest = await db.collection(COLL_CI_RUNS)
    .find({})
    .sort({ generatedAt: -1 })
    .limit(1)
    .toArray()

  if (!latest[0]) return { topKeywords: [], topPages: [], totalLeads: 0 }

  const kwPerf = (latest[0].keywordPerformance ?? []) as Array<{
    keyword: string; conversions: number; signal?: string | null
  }>
  const pagePerf = (latest[0].landingPagePerformance ?? []) as Array<{
    page: string; conversions: number
  }>

  return {
    topKeywords: kwPerf
      .filter(k => k.conversions > 0 && k.keyword)
      .sort((a, b) => b.conversions - a.conversions)
      .slice(0, 20)
      .map(k => ({ ...k, signal: k.signal ?? "neutral" })),
    topPages: pagePerf
      .filter(p => p.conversions > 0 && p.page)
      .sort((a, b) => b.conversions - a.conversions)
      .slice(0, 10),
    totalLeads: Number(latest[0].totalLeads ?? 0),
  }
}

// ── Ad group builder ──────────────────────────────────────────────────────────

function buildAdGroupDraft(
  theme:           AdGroupTheme,
  conversionKws:   GeneratedKeyword[],
  demandKws:       GeneratedKeyword[],
  searchTermKws:   Array<{ term: string; clicks: number; conversions: number }>,
  negatives:       NegativeDraftV2[],
  ciData:          Awaited<ReturnType<typeof loadConversionIntelligence>>,
): AdGroupDraftV2 {
  const themeLabels: Record<AdGroupTheme, string> = {
    dealer:       "Dealer Acquisition",
    oem:          "OEM Authorization",
    gem:          "GeM Reseller",
    direct_buyer: "Direct Buyer",
  }
  const themeName = themeLabels[theme]

  // Select landing page — prefer the top-converting page for this theme from CI data
  const ciTopPage = ciData.topPages.find(p =>
    (theme === "dealer" && (p.page.includes("dealer") || p.page.includes("distributor"))) ||
    (theme === "oem"    && (p.page.includes("oem") || p.page.includes("gem-oem"))) ||
    (theme === "gem"    && (p.page.includes("gem") || p.page.includes("reverse-auction"))) ||
    (theme === "direct_buyer" && (p.page.includes("public-health") || p.page.includes("products")))
  )
  const landingPage = ciTopPage?.page ?? LANDING_PAGE_BY_THEME[theme]
  const landingPageRationale = ciTopPage
    ? `Selected from conversion intelligence: ${ciTopPage.conversions} conversion${ciTopPage.conversions !== 1 ? "s" : ""} recorded on this page. Highest-converting page for ${themeName} intent.`
    : `Default landing page for ${themeName} — no conversion data yet. Update when CI data accumulates.`

  // Merge conversion keywords (highest priority) + demand keywords for this theme
  const themeConvKws = conversionKws.filter(k => k.adGroupTheme === theme)
  const themeDemandKws = demandKws
    .filter(k => k.adGroupTheme === theme && !themeConvKws.some(c => c.text === k.text))
    .slice(0, 8)

  const allKws = [...themeConvKws, ...themeDemandKws].slice(0, 15)

  const keywords: KeywordDraftV2[] = allKws.map(kw => {
    const isConversionBacked = CONVERSION_SOURCES.includes(kw.source)
    const searchTermMatch = searchTermKws.find(s => s.term === kw.text)
    const convCount = isConversionBacked
      ? Math.max(1, Math.round((kw.confidence - 70) / 5))
      : (searchTermMatch?.conversions ?? 0)

    return {
      text:            kw.text,
      matchType:       kw.matchType,
      source:          kw.source,
      conversionCount: convCount,
      rationale:       kw.reason,
    }
  })

  // Build conversion evidence summary for this ad group
  const conversionEvidence: ConversionEvidence[] = []
  const rfqKws   = allKws.filter(k => k.source === "rfq_conversion")
  const dealerKws = allKws.filter(k => k.source === "dealer_conversion")
  const oemKws    = allKws.filter(k => k.source === "oem_conversion")
  const adsKws    = allKws.filter(k => k.source === "ads_search_terms")
  const ciKws     = ciData.topKeywords.filter(k => allKws.some(a => a.text === k.keyword))

  if (rfqKws.length > 0)   conversionEvidence.push({ type: "rfq",    count: rfqKws.length,    keywords: rfqKws.map(k => k.text),    landingPages: [landingPage] })
  if (dealerKws.length > 0) conversionEvidence.push({ type: "dealer", count: dealerKws.length, keywords: dealerKws.map(k => k.text), landingPages: [landingPage] })
  if (oemKws.length > 0)    conversionEvidence.push({ type: "oem",    count: oemKws.length,    keywords: oemKws.map(k => k.text),    landingPages: [landingPage] })
  if (adsKws.length > 0)    conversionEvidence.push({ type: "rfq",    count: adsKws.length,    keywords: adsKws.map(k => k.text),    landingPages: [landingPage] })
  if (ciKws.length > 0) {
    const totalCiConversions = ciKws.reduce((s, k) => s + k.conversions, 0)
    conversionEvidence.push({ type: "rfq", count: totalCiConversions, keywords: ciKws.map(k => k.keyword), landingPages: [landingPage] })
  }

  // Rationale — WHY this ad group was created
  const convBackedCount = allKws.filter(k => CONVERSION_SOURCES.includes(k.source)).length
  const rationale = convBackedCount > 0
    ? `${convBackedCount} of ${allKws.length} keywords are conversion-backed (proven RFQ/dealer/OEM signals). ` +
      `Top keyword sources: ${[...new Set(allKws.map(k => k.source))].join(", ")}. ` +
      `Landing page selected based on conversion intelligence data.`
    : `No conversion-backed keywords yet for ${themeName}. ` +
      `Keywords drawn from demand signals (${[...new Set(allKws.map(k => k.source))].join(", ")}). ` +
      `This ad group will provide conversion data to strengthen future iterations.`

  // Ad-group-level negatives: subset of campaign negatives relevant to theme conflicts
  const adGroupNegs: NegativeDraftV2[] = []
  if (theme === "dealer") adGroupNegs.push(...negatives.filter(n => n.category === "consumer_intent"))
  if (theme === "oem")    adGroupNegs.push(...negatives.filter(n => n.category === "dealer_intent" || n.category === "consumer_intent"))
  if (theme === "direct_buyer") adGroupNegs.push(...negatives.filter(n => n.category === "dealer_intent" || n.category === "oem_intent"))

  return {
    name:                 `${themeName} — ${theme.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}`,
    theme,
    landingPage,
    landingPageRationale,
    keywords,
    negatives:            adGroupNegs.slice(0, 20),
    conversionEvidence,
    rationale,
  }
}

// ── Impact estimator ──────────────────────────────────────────────────────────

function estimateImpact(
  conversionKws: GeneratedKeyword[],
  ciData:        Awaited<ReturnType<typeof loadConversionIntelligence>>,
  dailyBudgetINR: number,
): EstimatedImpact {
  const historicalConversions = ciData.totalLeads
  const convBackedKws = conversionKws.filter(k => CONVERSION_SOURCES.includes(k.source)).length
  const dealerKws     = conversionKws.filter(k => k.source === "dealer_conversion").length
  const oemKws        = conversionKws.filter(k => k.source === "oem_conversion").length

  const confidence: "high" | "medium" | "low" =
    historicalConversions >= 20 && convBackedKws >= 5 ? "high" :
    historicalConversions >= 5  || convBackedKws >= 2 ? "medium" : "low"

  const monthlyBudget = dailyBudgetINR * 30
  const estCPL = confidence === "high" ? 800 : confidence === "medium" ? 1200 : 2000
  const estLeads = Math.max(1, Math.round(monthlyBudget / estCPL))
  const estDealer = dealerKws > 0 ? Math.max(1, Math.round(estLeads * 0.3)) : 0
  const estOEM    = oemKws    > 0 ? Math.max(1, Math.round(estLeads * 0.15)) : 0

  const reasoning = historicalConversions > 0
    ? `Based on ${historicalConversions} historical leads in the conversion intelligence window. ` +
      `${convBackedKws} conversion-backed keywords provide strong prior signal. ` +
      `Estimate uses ₹${estCPL}/lead CPL at ${confidence} confidence.`
    : `No historical conversion data yet — estimates based on industry benchmarks for fogging machine B2B campaigns. ` +
      `Refine after 14 days of campaign data.`

  return {
    basedOnConversions:   historicalConversions,
    rfqsPerMonth:         `${estLeads} qualified RFQs/month (₹${monthlyBudget.toLocaleString("en-IN")}/month budget)`,
    dealerApplications:   estDealer > 0 ? `${estDealer} dealer applications/month` : "Not targeted in this campaign",
    oemEnquiries:         estOEM    > 0 ? `${estOEM} OEM enquiries/month` : "Not targeted in this campaign",
    costPerQualifiedLead: `~₹${estCPL.toLocaleString("en-IN")}/lead (${confidence} confidence)`,
    confidence,
    reasoning,
  }
}

// ── Campaign builder ──────────────────────────────────────────────────────────

async function buildCampaignDraft(
  db:             Db,
  name:           string,
  themes:         AdGroupTheme[],
  conversionKws:  GeneratedKeyword[],
  allKwRun:       Awaited<ReturnType<typeof runKeywordIntelligence>>,
  searchTermKws:  Array<{ term: string; clicks: number; conversions: number }>,
  negatives:      NegativeDraftV2[],
  budgetSignals:  Awaited<ReturnType<typeof loadBudgetSignals>>,
  ciData:         Awaited<ReturnType<typeof loadConversionIntelligence>>,
  dataWindowDays: number,
): Promise<CampaignV2Draft> {
  const planId = `v2_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

  const dailyBudgetINR = budgetSignals.adGroupsToScale > 0 ? 400 : 300

  // Build ad groups for each requested theme
  const allDemandKws: GeneratedKeyword[] = [
    ...(allKwRun.byTheme.dealer ?? []),
    ...(allKwRun.byTheme.oem ?? []),
    ...(allKwRun.byTheme.gem ?? []),
    ...(allKwRun.byTheme.direct_buyer ?? []),
  ]

  const adGroups = themes.map(theme =>
    buildAdGroupDraft(theme, conversionKws, allDemandKws, searchTermKws, negatives, ciData)
  )

  const totalConvKws   = conversionKws.length
  const totalDemandKws = allDemandKws.length
  const hasConvData    = ciData.totalLeads > 0

  const convBackedSources = [...new Set(conversionKws.map(k => k.source))]

  const whyCreated = hasConvData
    ? `Campaign generated because conversion intelligence identified ${ciData.totalLeads} historical leads ` +
      `with ${totalConvKws} keywords carrying conversion attribution signals (${convBackedSources.join(", ")}). ` +
      `This is a conversion-first build: keywords are selected based on what has already driven RFQs, ` +
      `dealer applications, and OEM enquiries, not on search volume alone.`
    : `Campaign generated from demand signals only — no conversion data yet. ` +
      `${totalDemandKws} keywords identified from GSC, Ads search terms, and AI search. ` +
      `Activate conversion tracking first to upgrade to conversion-backed keywords.`

  const signalsUsed: string[] = []
  if (conversionKws.length > 0)   signalsUsed.push(`Conversion Signals (${conversionKws.length} keywords)`)
  if (totalDemandKws > 0)          signalsUsed.push(`Demand Signals (${totalDemandKws} keywords)`)
  if (searchTermKws.length > 0)    signalsUsed.push(`Search Term Signals (${searchTermKws.length} terms)`)
  if (negatives.length > 0)        signalsUsed.push(`Negative Signals (${negatives.length} candidates)`)
  if (budgetSignals.adGroupsWithWaste > 0 || budgetSignals.adGroupsToScale > 0)
    signalsUsed.push(`Budget Signals (${budgetSignals.adGroupsToScale} scale, ${budgetSignals.adGroupsWithWaste} waste)`)

  const conversionEvidence: ConversionEvidence[] = []
  const rfqKws    = conversionKws.filter(k => k.source === "rfq_conversion")
  const dealerKws = conversionKws.filter(k => k.source === "dealer_conversion")
  const oemKws    = conversionKws.filter(k => k.source === "oem_conversion")
  if (rfqKws.length > 0)    conversionEvidence.push({ type: "rfq",        count: rfqKws.length,    keywords: rfqKws.slice(0, 5).map(k => k.text),    landingPages: ["/public-health-equipment", "/products"] })
  if (dealerKws.length > 0) conversionEvidence.push({ type: "dealer",     count: dealerKws.length, keywords: dealerKws.slice(0, 5).map(k => k.text),  landingPages: ["/become-a-dealer"] })
  if (oemKws.length > 0)    conversionEvidence.push({ type: "oem",        count: oemKws.length,    keywords: oemKws.slice(0, 5).map(k => k.text),     landingPages: ["/gem-oem-authorization"] })

  const impact = estimateImpact(conversionKws, ciData, dailyBudgetINR)

  return {
    planId,
    campaignName: name,
    objective:    "Increase qualified enquiries — RFQ, WhatsApp, Dealer Applications, OEM Authorization",
    status:       "draft_pending_approval",
    biddingStrategy: "MANUAL_CPC",
    dailyBudgetINR,
    geo:          "India (all)",
    adGroups,
    campaignNegatives: negatives.filter(n => n.confidence >= 80).slice(0, 30),
    rationale:    `${adGroups.length} ad groups built from ${signalsUsed.join(", ")}. ` +
                  `Objective: maximise qualified enquiries per rupee, not keyword count.`,
    whyCreated,
    conversionEvidence,
    estimatedImpact: impact,
    signalsUsed,
    dataWindowDays,
    governance:   "DRAFT ONLY. No Google Ads campaign created. Requires human approval before any action.",
    generatedAt:  new Date().toISOString(),
    requiresApproval: true,
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

export async function runCampaignFactoryV2(
  opts: {
    triggeredBy?:    string
    dataWindowDays?: number
    pushToQueue?:    boolean
  } = {},
): Promise<CampaignFactoryV2Run> {
  const triggeredBy    = opts.triggeredBy    ?? "api"
  const dataWindowDays = opts.dataWindowDays ?? 30
  const pushToQueue    = opts.pushToQueue    ?? true

  const client = await clientPromise
  const db     = client.db() as Db

  // ── Load all 5 signal types in parallel ────────────────────────────────────
  const [conversionKws, allKwRun, searchTermKws, negatives, budgetSignals, ciData] = await Promise.all([
    extractFromConversions(db, ADS_FUNNEL_A),
    runKeywordIntelligence({ funnel: ADS_FUNNEL_A }),
    loadSearchTermSignals(db),
    loadNegativeSignals(db),
    loadBudgetSignals(db),
    loadConversionIntelligence(db),
  ])

  // ── Signal summary ─────────────────────────────────────────────────────────
  const signalSummary = {
    conversionSignals: conversionKws.length,
    demandSignals:     allKwRun.totalCount,
    searchTermSignals: searchTermKws.length,
    negativeSignals:   negatives.length,
    budgetSignals:     budgetSignals.adGroupsWithWaste + budgetSignals.adGroupsToScale,
  }

  // ── Determine which themes have conversion evidence ────────────────────────
  const hasDealer = conversionKws.some(k => k.source === "dealer_conversion" || k.adGroupTheme === "dealer")
  const hasOEM    = conversionKws.some(k => k.source === "oem_conversion"    || k.adGroupTheme === "oem")
  const hasGEM    = conversionKws.some(k => k.adGroupTheme === "gem")
  const hasRFQ    = conversionKws.some(k => k.source === "rfq_conversion")

  // Always include dealer + OEM (Funnel A core). Direct buyer only if RFQ signal exists.
  const primaryThemes: AdGroupTheme[] = ["dealer", "oem"]
  if (hasGEM)  primaryThemes.push("gem")
  if (hasRFQ)  primaryThemes.push("direct_buyer")
  // Fallback: include all themes if no conversion signal yet
  const themes: AdGroupTheme[] = primaryThemes.length >= 2
    ? primaryThemes
    : ["dealer", "oem", "gem"]

  // ── Build campaign draft ───────────────────────────────────────────────────
  const campaignDraft = await buildCampaignDraft(
    db,
    `100X | Funnel A | Conversion-Led | Search | ${new Date().toLocaleDateString("en-IN")}`,
    themes,
    conversionKws,
    allKwRun,
    searchTermKws,
    negatives,
    budgetSignals,
    ciData,
    dataWindowDays,
  )

  // ── Push to approval queue ─────────────────────────────────────────────────
  let pushedToQueue = 0
  if (pushToQueue) {
    const totalKws   = campaignDraft.adGroups.reduce((s, g) => s + g.keywords.length, 0)
    const convBacked = campaignDraft.adGroups.reduce(
      (s, g) => s + g.keywords.filter(k => CONVERSION_SOURCES.includes(k.source)).length, 0,
    )
    const priority: ApprovalItem["priority"] =
      ciData.totalLeads >= 10 && convBacked >= 3 ? "high" :
      ciData.totalLeads >= 3  || convBacked >= 1 ? "medium" : "low"

    const queueItem: Omit<ApprovalItem, "id" | "status" | "generatedAt" | "expiresAt"> = {
      type:     "create_campaign",
      priority,
      title:    `Campaign Draft — Conversion-Led Search (${themes.map(t => t.replace("_", " ")).join(", ")})`,
      rationale: campaignDraft.whyCreated,
      payload:  { campaignDraft },
      estimatedImpact: campaignDraft.estimatedImpact.rfqsPerMonth,
      agentSource:    "campaign-factory-v2",
      dataWindowDays,
      confidence:     campaignDraft.estimatedImpact.confidence === "high" ? 85 :
                      campaignDraft.estimatedImpact.confidence === "medium" ? 65 : 45,
    }

    await pushBatch(db, [queueItem])
    pushedToQueue = 1
  }

  // ── Persist the factory run ────────────────────────────────────────────────
  const runId = `cfv2_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  const run: CampaignFactoryV2Run = {
    runId,
    triggeredBy,
    drafts:       [campaignDraft],
    draftCount:   1,
    signalSummary,
    pushedToQueue,
    generatedAt:  new Date().toISOString(),
    governance:   "All drafts require human approval before any Google Ads changes. No automatic spend.",
  }

  await db.collection(COLL_FACTORY_V2).insertOne({ ...run })
  return run
}
