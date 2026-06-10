/**
 * Growth OS — System Readiness Checker (3-tier model).
 *
 * Three separate readiness tiers:
 *   1. Setup     — Is everything connected? (Google Ads, GTM, Search Console, Conversion Tracking)
 *   2. Data      — Do we have enough data? (Leads, Keywords, Search Terms, Intelligence runs)
 *   3. Revenue   — Is the system generating results? (Active campaigns, spend, approvals)
 *
 * Each tier scores 0–100. Overall = average of the three.
 */

import type { Db } from "mongodb"
import clientPromise from "@/lib/mongodb"

// ── Types ─────────────────────────────────────────────────────────────────────

export type CheckStatus = "ok" | "warning" | "error"

export interface SetupCheck {
  id:        string
  label:     string        // plain-English label: "Google Ads connected"
  detail:    string        // one sentence: what this means
  status:    CheckStatus
  evidence:  {
    collection?: string
    count?:      number
    value?:      string
    lastSeen?:   string
  }
  setupUrl?: string
  points:    number        // 0 | partial | maxPoints
  maxPoints: number        // always 25
}

export interface ReadinessTier {
  id:          "setup" | "data" | "revenue"
  label:       string
  description: string
  score:       number    // 0–100
  status:      "ready" | "partial" | "not_ready"
  checks:      SetupCheck[]
  topBlocker:  string | null
}

export interface ReadinessResult {
  overallScore: number   // 0–100
  overall:      "ready" | "partial" | "not_ready"
  setup:        ReadinessTier
  data:         ReadinessTier
  revenue:      ReadinessTier
  nextActions:  NextAction[]
  checkedAt:    string
}

export interface NextAction {
  action:    string
  why:       string
  impact:    "high" | "medium" | "low"
  effort:    string
  setupUrl?: string
}

// ── Helper ────────────────────────────────────────────────────────────────────

function tierStatus(score: number): ReadinessTier["status"] {
  return score >= 75 ? "ready" : score >= 40 ? "partial" : "not_ready"
}

function tierScore(checks: SetupCheck[]): number {
  const total = checks.reduce((s, c) => s + c.points, 0)
  const max   = checks.reduce((s, c) => s + c.maxPoints, 0)
  return max === 0 ? 0 : Math.round((total / max) * 100)
}

// ── Tier 1: Setup ─────────────────────────────────────────────────────────────
// "Is everything connected?"

async function buildSetupTier(db: Db): Promise<ReadinessTier> {
  const settings = await db.collection("ads_settings").findOne({})

  // ── Check 1: Google Ads API ─────────────────────────────────────────────────
  const hasToken      = !!(process.env.GOOGLE_ADS_DEVELOPER_TOKEN ?? "").trim()
  const customerId    = String(settings?.customerId ?? "").trim()
  const hasCustomerId = !!customerId

  const googleAds: SetupCheck = hasToken && hasCustomerId
    ? {
        id: "google_ads", label: "Google Ads connected",
        detail: `API connected. Account: ${customerId}. Your ads account is linked and ready.`,
        status: "ok", points: 25, maxPoints: 25,
        evidence: { collection: "ads_settings", value: customerId },
      }
    : !hasToken
    ? {
        id: "google_ads", label: "Google Ads API key missing",
        detail: "GOOGLE_ADS_DEVELOPER_TOKEN is not set in Vercel environment variables.",
        status: "error", points: 0, maxPoints: 25,
        evidence: {},
        setupUrl: "/admin/growth/paid",
      }
    : {
        id: "google_ads", label: "Google Ads account not linked",
        detail: "API key is set but no customer ID configured. Add your Google Ads Customer ID in settings.",
        status: "warning", points: 10, maxPoints: 25,
        evidence: { collection: "ads_settings" },
        setupUrl: "/admin/growth/paid",
      }

  // ── Check 2: GTM ────────────────────────────────────────────────────────────
  // GTM-5JMGCKRW is hardcoded in layout.tsx and confirmed firing in production.
  // Also check env var and ads_settings as config sources.
  const gtmEnv      = (process.env.NEXT_PUBLIC_GTM_CONTAINER_ID ?? "").trim()
  const gtmSettings = String(settings?.gtmContainerId ?? "").trim()
  const gtmHardcoded = "GTM-5JMGCKRW"  // confirmed in app/layout.tsx
  const gtmId       = gtmEnv || gtmSettings || gtmHardcoded

  const gtm: SetupCheck = gtmEnv || gtmSettings
    ? {
        id: "gtm", label: `Google Tag Manager installed (${gtmId})`,
        detail: `GTM container ${gtmId} is configured and firing. Conversion tags can be published.`,
        status: "ok", points: 25, maxPoints: 25,
        evidence: { value: gtmId },
        setupUrl: "https://tagmanager.google.com",
      }
    : {
        // GTM is hardcoded in layout.tsx — it IS firing, but Growth OS can't confirm without the env var.
        id: "gtm", label: `GTM installed (${gtmHardcoded}) — confirm in settings`,
        detail: `${gtmHardcoded} is installed on the website. Set NEXT_PUBLIC_GTM_CONTAINER_ID in Vercel so Growth OS can confirm tracking.`,
        status: "warning", points: 18, maxPoints: 25,
        evidence: { value: gtmHardcoded },
        setupUrl: "https://tagmanager.google.com",
      }

  // ── Check 3: Search Console ─────────────────────────────────────────────────
  const hasOAuth = !!(process.env.GOOGLE_OAUTH_CLIENT_ID ?? "").trim()
  const gscTotal = await db.collection("gsc_query_rows").countDocuments({})
  const latestGsc = await db.collection("gsc_query_rows")
    .findOne({}, { sort: { syncDate: -1 }, projection: { syncDate: 1 } })
  const latestSync  = String(latestGsc?.syncDate ?? "")
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10)
  const isGscFresh   = !!latestSync && latestSync >= sevenDaysAgo

  const gsc: SetupCheck = !hasOAuth
    ? {
        id: "gsc", label: "Search Console not connected",
        detail: "Google OAuth credentials are missing. Connect Search Console to see which searches find your website.",
        status: "error", points: 0, maxPoints: 25,
        evidence: {},
        setupUrl: "/admin/growth/seo/setup",
      }
    : gscTotal === 0
    ? {
        id: "gsc", label: "Search Console connected but no data",
        detail: "OAuth is set up but no search data has synced yet. Run a sync from the SEO dashboard.",
        status: "warning", points: 12, maxPoints: 25,
        evidence: { collection: "gsc_query_rows", count: 0 },
        setupUrl: "/admin/growth/seo",
      }
    : !isGscFresh
    ? {
        id: "gsc", label: `Search Console data stale (last sync ${latestSync})`,
        detail: `${gscTotal} rows of search data exist, but the last sync was ${latestSync}. Re-sync to keep data current.`,
        status: "warning", points: 18, maxPoints: 25,
        evidence: { collection: "gsc_query_rows", count: gscTotal, lastSeen: latestSync },
        setupUrl: "/admin/growth/seo",
      }
    : {
        id: "gsc", label: `Search Console synced (${gscTotal} rows, ${latestSync})`,
        detail: `${gscTotal} search query rows available. Data is current as of ${latestSync}.`,
        status: "ok", points: 25, maxPoints: 25,
        evidence: { collection: "gsc_query_rows", count: gscTotal, lastSeen: latestSync },
      }

  // ── Check 4: Conversion Tracking ────────────────────────────────────────────
  const stTotal    = await db.collection("ads_searchterm_rows").countDocuments({})
  const stWithConv = await db.collection("ads_searchterm_rows")
    .countDocuments({ conversions: { $gt: 0 } })

  const conversion: SetupCheck = stWithConv > 0
    ? {
        id: "conversion", label: `Conversion tracking active (${stWithConv} converting searches)`,
        detail: `${stWithConv} search queries have recorded conversions. You can see which searches generate leads.`,
        status: "ok", points: 25, maxPoints: 25,
        evidence: { collection: "ads_searchterm_rows", count: stWithConv },
      }
    : stTotal > 0
    ? {
        id: "conversion", label: "Campaign data exists — verify Phase 1 conversion tags are firing",
        detail: `${stTotal} search term rows imported but no conversions recorded yet. Publish GTM tags for the 3 Phase 1 actions: RFQ Submit, WhatsApp Click, Phone Call. Phase 2 conversions (Dealer Application, OEM Authorization) can be added after launch.`,
        status: "warning", points: 12, maxPoints: 25,
        evidence: { collection: "ads_searchterm_rows", count: stTotal },
        setupUrl: "/admin/growth/paid",
      }
    : {
        id: "conversion", label: "Set up 3 Phase 1 conversion actions before launching",
        detail: "Create RFQ Submit, WhatsApp Click, and Phone Call conversions in Google Ads, then publish GTM tags. Campaign can launch once these 3 are active. Phase 2 conversions (Dealer Application, OEM Authorization) are optional and do not block launch.",
        status: "warning", points: 12, maxPoints: 25,
        evidence: {},
        setupUrl: "/admin/growth/paid",
      }

  const checks = [googleAds, gtm, gsc, conversion]
  const score  = tierScore(checks)
  return {
    id: "setup", label: "Setup", description: "Is everything connected?",
    score, status: tierStatus(score), checks,
    topBlocker: checks.find(c => c.status === "error")?.label
      ?? checks.find(c => c.status === "warning")?.label
      ?? null,
  }
}

// ── Tier 2: Data ──────────────────────────────────────────────────────────────
// "Do we have enough data to make decisions?"

async function buildDataTier(db: Db): Promise<ReadinessTier> {
  const since90d = new Date(Date.now() - 90 * 86_400_000).toISOString()

  // ── Check 1: Lead pipeline ──────────────────────────────────────────────────
  const [rfq, brochure, gem] = await Promise.all([
    db.collection("rfq_popup_leads").countDocuments({ createdAt: { $gte: since90d } }),
    db.collection("brochure_leads").countDocuments({ createdAt: { $gte: since90d } }),
    db.collection("gem_inquiries").countDocuments({ createdAt: { $gte: since90d } }),
  ])
  const totalLeads = rfq + brochure + gem

  const leads: SetupCheck = totalLeads >= 20
    ? {
        id: "leads", label: `Strong lead pipeline (${totalLeads} in 90 days)`,
        detail: `${rfq} RFQ enquiries + ${brochure} brochure downloads + ${gem} government enquiries. Sufficient data for analysis.`,
        status: "ok", points: 25, maxPoints: 25,
        evidence: { collection: "rfq_popup_leads", count: totalLeads },
      }
    : totalLeads >= 5
    ? {
        id: "leads", label: `${totalLeads} leads in 90 days — building up`,
        detail: `${rfq} enquiries, ${brochure} brochure downloads, ${gem} government leads. Need more data for accurate recommendations.`,
        status: "warning", points: 15, maxPoints: 25,
        evidence: { collection: "rfq_popup_leads", count: totalLeads },
      }
    : {
        id: "leads", label: `Only ${totalLeads} lead(s) in 90 days`,
        detail: "Very few leads recorded. Traffic may not be reaching the website or lead capture may need improvement.",
        status: "error", points: 5, maxPoints: 25,
        evidence: { collection: "rfq_popup_leads", count: totalLeads },
      }

  // ── Check 2: Keyword intelligence ──────────────────────────────────────────
  const kwLatest = await db.collection("ads_keyword_intelligence")
    .findOne({}, { sort: { generatedAt: -1 }, projection: { generatedAt: 1, totalCount: 1, meetsSuccessCriterion: 1 } })

  const keywords: SetupCheck = kwLatest?.meetsSuccessCriterion === true
    ? {
        id: "keywords", label: `Keyword list ready (${kwLatest.totalCount} keywords)`,
        detail: `Keyword Intelligence has identified ${kwLatest.totalCount} viable keywords. Campaigns can be deployed.`,
        status: "ok", points: 25, maxPoints: 25,
        evidence: { collection: "ads_keyword_intelligence", count: kwLatest.totalCount, lastSeen: kwLatest.generatedAt },
      }
    : kwLatest
    ? {
        id: "keywords", label: `${kwLatest.totalCount ?? 0} keywords found — threshold not met`,
        detail: `Keyword Intelligence found ${kwLatest.totalCount ?? 0} keywords but needs more to meet the minimum campaign threshold.`,
        status: "warning", points: 12, maxPoints: 25,
        evidence: { collection: "ads_keyword_intelligence", count: kwLatest.totalCount ?? 0, lastSeen: kwLatest.generatedAt },
        setupUrl: "/admin/growth/ads",
      }
    : {
        id: "keywords", label: "Keyword Intelligence not run yet",
        detail: "Run Keyword Intelligence to identify which search terms to bid on. Required before deploying any campaign.",
        status: "error", points: 0, maxPoints: 25,
        evidence: {},
        setupUrl: "/admin/growth/ads",
      }

  // ── Check 3: Lead Value Intelligence ───────────────────────────────────────
  const lviLatest = await db.collection("ads_lead_value_intelligence")
    .findOne({}, { sort: { generatedAt: -1 }, projection: { generatedAt: 1, totalLeads: 1, totalWeightedScore: 1 } })
  const siLatest = await db.collection("ads_state_intelligence")
    .findOne({}, { sort: { generatedAt: -1 }, projection: { generatedAt: 1, statesAnalyzed: 1 } })

  const intelligence: SetupCheck = lviLatest && siLatest
    ? {
        id: "intelligence", label: "Lead & State intelligence complete",
        detail: `Lead Value Intelligence: ${lviLatest.totalLeads} leads scored. State Intelligence: ${siLatest.statesAnalyzed} states analyzed.`,
        status: "ok", points: 25, maxPoints: 25,
        evidence: { collection: "ads_lead_value_intelligence", count: lviLatest.totalLeads, lastSeen: lviLatest.generatedAt },
      }
    : lviLatest
    ? {
        id: "intelligence", label: "Lead intelligence run — state intelligence pending",
        detail: "Lead scoring is complete. Run State Intelligence to identify which regions have the highest opportunity.",
        status: "warning", points: 15, maxPoints: 25,
        evidence: { collection: "ads_lead_value_intelligence", count: lviLatest.totalLeads, lastSeen: lviLatest.generatedAt },
        setupUrl: "/admin/growth/ads/state-intelligence",
      }
    : {
        id: "intelligence", label: "Lead intelligence not run yet",
        detail: "Run Lead Value Intelligence to score your leads and identify which keywords and regions to prioritize.",
        status: "error", points: 0, maxPoints: 25,
        evidence: {},
        setupUrl: "/admin/growth/ads/lead-value-intelligence",
      }

  // ── Check 4: Search term coverage ──────────────────────────────────────────
  const stRows = await db.collection("ads_searchterm_rows").countDocuments({})

  const searchTerms: SetupCheck = stRows >= 50
    ? {
        id: "search_terms", label: `${stRows} search term rows imported`,
        detail: `Google Ads search term data is available. Growth OS can analyze which searches are working.`,
        status: "ok", points: 25, maxPoints: 25,
        evidence: { collection: "ads_searchterm_rows", count: stRows },
      }
    : stRows > 0
    ? {
        id: "search_terms", label: `${stRows} search term rows — limited data`,
        detail: `Some search term data is imported but not enough for reliable recommendations. Import more data from Google Ads.`,
        status: "warning", points: 12, maxPoints: 25,
        evidence: { collection: "ads_searchterm_rows", count: stRows },
        setupUrl: "/admin/growth/paid",
      }
    : {
        id: "search_terms", label: "No search term data imported",
        detail: "Import search term performance data from Google Ads. This shows which searches are generating clicks and leads.",
        status: "error", points: 0, maxPoints: 25,
        evidence: {},
        setupUrl: "/admin/growth/paid",
      }

  const checks = [leads, keywords, intelligence, searchTerms]
  const score  = tierScore(checks)
  return {
    id: "data", label: "Data", description: "Do we have enough data to make good decisions?",
    score, status: tierStatus(score), checks,
    topBlocker: checks.find(c => c.status === "error")?.label
      ?? checks.find(c => c.status === "warning")?.label
      ?? null,
  }
}

// ── Tier 3: Revenue ───────────────────────────────────────────────────────────
// "Is the system generating results?"

async function buildRevenueTier(db: Db): Promise<ReadinessTier> {
  // ── Check 1: Active campaign ────────────────────────────────────────────────
  const [active, paused, rolledBack] = await Promise.all([
    db.collection("ads_deployments").countDocuments({ state: "enabled" }),
    db.collection("ads_deployments").countDocuments({ state: "paused" }),
    db.collection("ads_deployments").countDocuments({ status: "rolled_back" }),
  ])

  const campaign: SetupCheck = active > 0
    ? {
        id: "campaign", label: `${active} campaign(s) active`,
        detail: `Your ads are live and spending. Impressions and leads should be accumulating.`,
        status: "ok", points: 25, maxPoints: 25,
        evidence: { collection: "ads_deployments", count: active },
      }
    : rolledBack > 0
    ? {
        id: "campaign", label: "Campaign was deployed but rolled back",
        detail: "Your campaign deployment was reversed. No ads are running. Review the rollback reason and re-deploy.",
        status: "error", points: 0, maxPoints: 25,
        evidence: { collection: "ads_deployments", count: rolledBack },
        setupUrl: "/admin/growth/paid",
      }
    : paused > 0
    ? {
        id: "campaign", label: `${paused} campaign(s) paused`,
        detail: "Campaigns exist but are paused. Recharge your Google Ads account to resume spending.",
        status: "warning", points: 10, maxPoints: 25,
        evidence: { collection: "ads_deployments", count: paused },
        setupUrl: "/admin/growth/paid",
      }
    : {
        id: "campaign", label: "No campaigns deployed yet",
        detail: "No Google Ads campaigns have been created. Build and deploy your first campaign to start generating leads.",
        status: "error", points: 0, maxPoints: 25,
        evidence: {},
        setupUrl: "/admin/growth/paid",
      }

  // ── Check 2: Lead flow ──────────────────────────────────────────────────────
  const since7d   = new Date(Date.now() - 7 * 86_400_000).toISOString()
  const since30d  = new Date(Date.now() - 30 * 86_400_000).toISOString()
  const [leads7d, highValue30d] = await Promise.all([
    db.collection("rfq_popup_leads").countDocuments({ createdAt: { $gte: since7d } }),
    db.collection("rfq_popup_leads").countDocuments({
      createdAt: { $gte: since30d },
      leadType: { $in: ["dealer_application", "oem_authorization", "gem_inquiry"] },
    }),
  ])

  const leadFlow: SetupCheck = highValue30d >= 3
    ? {
        id: "lead_flow", label: `${highValue30d} high-value leads in 30 days`,
        detail: `${highValue30d} dealer/OEM/government leads received this month. Revenue pipeline is active.`,
        status: "ok", points: 25, maxPoints: 25,
        evidence: { collection: "rfq_popup_leads", count: highValue30d },
      }
    : leads7d >= 2
    ? {
        id: "lead_flow", label: `${leads7d} lead(s) in last 7 days`,
        detail: `${leads7d} enquiries received this week. No high-value (dealer/OEM) leads yet. Qualify and follow up.`,
        status: "warning", points: 15, maxPoints: 25,
        evidence: { collection: "rfq_popup_leads", count: leads7d },
      }
    : {
        id: "lead_flow", label: "Very few recent leads",
        detail: `${leads7d} lead(s) in the last 7 days. Lead volume is too low. Activate a campaign or check website traffic.`,
        status: leads7d === 0 ? "error" : "warning",
        points: leads7d === 0 ? 5 : 10, maxPoints: 25,
        evidence: { collection: "rfq_popup_leads", count: leads7d },
      }

  // ── Check 3: Approval queue health ─────────────────────────────────────────
  const [pendingIntelligence, pendingCampaignPlans] = await Promise.all([
    db.collection("ads_approval_queue").countDocuments({ status: "pending" }),
    db.collection("ads_campaign_plans").countDocuments({ status: "pending_approval" }),
  ])
  const totalPending = pendingIntelligence + pendingCampaignPlans

  const approvals: SetupCheck = totalPending === 0
    ? {
        id: "approvals", label: "No pending approvals — queue clear",
        detail: "All Growth OS recommendations have been reviewed. Queue is clear.",
        status: "ok", points: 25, maxPoints: 25,
        evidence: { collection: "ads_approval_queue", count: 0 },
      }
    : totalPending <= 5
    ? {
        id: "approvals", label: `${totalPending} recommendation(s) waiting for your decision`,
        detail: `${pendingIntelligence} keyword/budget/geo optimizations + ${pendingCampaignPlans} campaign plans need your review.`,
        status: "warning", points: 15, maxPoints: 25,
        evidence: { collection: "ads_approval_queue", count: totalPending },
        setupUrl: "/admin/growth/ads/approval-queue",
      }
    : {
        id: "approvals", label: `${totalPending} recommendations backlogged`,
        detail: `${pendingIntelligence} optimizations + ${pendingCampaignPlans} campaign plans waiting. Review regularly to keep Growth OS running effectively.`,
        status: "warning", points: 10, maxPoints: 25,
        evidence: { collection: "ads_approval_queue", count: totalPending },
        setupUrl: "/admin/growth/ads/approval-queue",
      }

  // ── Check 4: Budget recommendations ────────────────────────────────────────
  const budgetRecs = await db.collection("ads_budget_recommendations_v2")
    .findOne({}, { sort: { generatedAt: -1 }, projection: { generatedAt: 1, recommendations: 1 } })
  const hasApprovedBudget = await db.collection("ads_approval_queue")
    .countDocuments({ type: { $in: ["set_budget", "increase_budget"] }, status: "approved" })

  const budget: SetupCheck = hasApprovedBudget > 0
    ? {
        id: "budget", label: "Budget strategy approved",
        detail: `${hasApprovedBudget} budget recommendation(s) approved. Growth OS is operating with defined spend parameters.`,
        status: "ok", points: 25, maxPoints: 25,
        evidence: { collection: "ads_approval_queue", count: hasApprovedBudget },
      }
    : budgetRecs
    ? {
        id: "budget", label: "Budget recommendations generated — awaiting approval",
        detail: "Budget recommendations have been created but not yet approved. Review in the Approval Queue.",
        status: "warning", points: 12, maxPoints: 25,
        evidence: { collection: "ads_budget_recommendations_v2", lastSeen: budgetRecs.generatedAt },
        setupUrl: "/admin/growth/ads/approval-queue",
      }
    : {
        id: "budget", label: "No budget strategy set",
        detail: "Run Budget Recommendation V2 to get data-driven budget suggestions based on your lead scoring.",
        status: "error", points: 0, maxPoints: 25,
        evidence: {},
        setupUrl: "/admin/growth/ads",
      }

  const checks = [campaign, leadFlow, approvals, budget]
  const score  = tierScore(checks)
  return {
    id: "revenue", label: "Revenue", description: "Is the system generating results?",
    score, status: tierStatus(score), checks,
    topBlocker: checks.find(c => c.status === "error")?.label
      ?? checks.find(c => c.status === "warning")?.label
      ?? null,
  }
}

// ── Next actions ──────────────────────────────────────────────────────────────

function buildNextActions(
  setup: ReadinessTier,
  data: ReadinessTier,
  revenue: ReadinessTier,
): NextAction[] {
  const actions: NextAction[] = []

  // Pull from each tier's error checks first, then warnings
  const allChecks = [
    ...setup.checks, ...data.checks, ...revenue.checks,
  ].sort((a, b) => {
    const order = { error: 0, warning: 1, ok: 2 }
    return order[a.status] - order[b.status]
  })

  for (const check of allChecks) {
    if (check.status === "ok") break
    if (actions.length >= 5) break
    actions.push({
      action:   `Fix: ${check.label}`,
      why:      check.detail,
      impact:   check.status === "error" ? "high" : "medium",
      effort:   "30 min",
      setupUrl: check.setupUrl,
    })
  }

  return actions
}

// ── Main ──────────────────────────────────────────────────────────────────────

export async function checkSystemReadiness(): Promise<ReadinessResult> {
  const client = await clientPromise
  const db     = client.db() as Db

  const [setup, data, revenue] = await Promise.all([
    buildSetupTier(db),
    buildDataTier(db),
    buildRevenueTier(db),
  ])

  const overallScore = Math.round((setup.score + data.score + revenue.score) / 3)
  const overall: ReadinessResult["overall"] =
    overallScore >= 75 ? "ready" :
    overallScore >= 40 ? "partial" : "not_ready"

  return {
    overallScore,
    overall,
    setup,
    data,
    revenue,
    nextActions: buildNextActions(setup, data, revenue),
    checkedAt: new Date().toISOString(),
  }
}
