/**
 * Growth OS — System Readiness Checker.
 *
 * Checks whether each system is properly configured and operational.
 * Used by the Founder Mode dashboard and Readiness Score widget.
 *
 * Systems checked:
 *   1. Google Ads      — developer token, customer ID, campaign deployed
 *   2. GSC             — OAuth configured, recent query data
 *   3. GTM             — container ID set
 *   4. Conversion Tracking — conversion data in search term rows
 *   5. Campaign Activation — high-viability campaign ready to activate
 */

import type { Db } from "mongodb"
import clientPromise from "@/lib/mongodb"

// ── Types ─────────────────────────────────────────────────────────────────────

export type CheckStatus = "ok" | "warning" | "error" | "unknown"

export interface SystemCheck {
  status:    CheckStatus
  label:     string        // short status label, e.g. "Connected", "Missing token"
  detail:    string        // one-sentence explanation
  setupUrl?: string        // where to go to fix it
  score:     number        // 0–20 per system (5 systems × 20 = 100 max)
}

export interface ReadinessResult {
  overall:          "ready" | "partial" | "not_ready"
  score:            number        // 0–100
  systems:          Record<string, SystemCheck>
  nextActions:      NextAction[]  // sorted by impact
  checkedAt:        string
}

export interface NextAction {
  action:      string
  why:         string
  impact:      "high" | "medium" | "low"
  setupUrl?:   string
}

// ── Individual system checks ──────────────────────────────────────────────────

async function checkGoogleAds(db: Db): Promise<SystemCheck> {
  const tokenSet   = !!(process.env.GOOGLE_ADS_DEVELOPER_TOKEN || "").trim()
  const settings   = await db.collection("ads_settings").findOne({})
  const customerId = settings?.customerId as string | undefined
  const campaigns  = await db.collection("ads_deployments").countDocuments({})

  if (!tokenSet) return {
    status:   "error",
    label:    "No developer token",
    detail:   "GOOGLE_ADS_DEVELOPER_TOKEN is not set. Google Ads API calls will fail.",
    setupUrl: "/admin/growth/paid",
    score:    0,
  }
  if (!customerId) return {
    status:   "error",
    label:    "No customer ID",
    detail:   "Google Ads customer ID not configured. Add it in Paid Ads settings.",
    setupUrl: "/admin/growth/paid",
    score:    5,
  }
  if (campaigns === 0) return {
    status:   "warning",
    label:    "No campaigns deployed",
    detail:   "Google Ads is connected but no campaigns have been created yet.",
    setupUrl: "/admin/growth/paid",
    score:    12,
  }
  return {
    status:  "ok",
    label:   `Connected — ${campaigns} campaign(s)`,
    detail:  `Google Ads API connected, customer ${customerId}, ${campaigns} deployment record(s).`,
    score:   20,
  }
}

async function checkGSC(db: Db): Promise<SystemCheck> {
  const clientId  = !!(process.env.GOOGLE_OAUTH_CLIENT_ID  || "").trim()
  const clientSec = !!(process.env.GOOGLE_OAUTH_CLIENT_SECRET || "").trim()

  if (!clientId || !clientSec) return {
    status:   "error",
    label:    "OAuth not configured",
    detail:   "Google OAuth client credentials are missing. GSC data sync will not work.",
    setupUrl: "/admin/growth/seo",
    score:    0,
  }

  // Check for recent GSC data (within 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString()
  const recentRows   = await db.collection("gsc_query_rows")
    .countDocuments({ syncedAt: { $gte: sevenDaysAgo } })

  if (recentRows === 0) {
    const totalRows = await db.collection("gsc_query_rows").countDocuments({})
    if (totalRows === 0) return {
      status:   "error",
      label:    "No GSC data",
      detail:   "Google Search Console data has not been synced yet. Connect GSC to start.",
      setupUrl: "/admin/growth/seo",
      score:    5,
    }
    return {
      status:   "warning",
      label:    "Data stale (>7 days)",
      detail:   `GSC has ${totalRows} rows but nothing synced in the last 7 days. Run a fresh sync.`,
      setupUrl: "/admin/growth/seo",
      score:    12,
    }
  }

  return {
    status:  "ok",
    label:   `${recentRows} rows synced recently`,
    detail:  `GSC connected and data is current (${recentRows} rows in last 7 days).`,
    score:   20,
  }
}

async function checkGTM(): Promise<SystemCheck> {
  const containerId = (process.env.NEXT_PUBLIC_GTM_CONTAINER_ID || "").trim()

  if (!containerId) return {
    status:   "error",
    label:    "Container ID not set",
    detail:   "NEXT_PUBLIC_GTM_CONTAINER_ID is missing. GTM tags are not firing.",
    setupUrl: "https://tagmanager.google.com",
    score:    0,
  }

  return {
    status:  "ok",
    label:   containerId,
    detail:  `GTM container ${containerId} is configured. Verify tags are published in GTM.`,
    score:   20,
  }
}

async function checkConversionTracking(db: Db): Promise<SystemCheck> {
  // Check if any search term rows have conversion data
  const withConversions = await db.collection("ads_searchterm_rows")
    .countDocuments({ conversions: { $gt: 0 } })

  if (withConversions > 0) return {
    status:  "ok",
    label:   `${withConversions} converting queries`,
    detail:  `Conversion tracking is working — ${withConversions} search term rows have conversion data.`,
    score:   20,
  }

  const totalRows = await db.collection("ads_searchterm_rows").countDocuments({})
  if (totalRows === 0) return {
    status:   "error",
    label:    "No search term data",
    detail:   "Google Ads search term data has not been imported. Run the search term sync first.",
    setupUrl: "/admin/growth/paid",
    score:    0,
  }

  // Search term rows exist but zero conversions — GTM / conversion actions likely not configured
  return {
    status:   "warning",
    label:    "No conversions tracked",
    detail:   `${totalRows} search term rows imported but zero conversions. Create conversion actions in Google Ads and import GTM container.`,
    setupUrl: "/admin/growth/paid",
    score:    8,
  }
}

async function checkCampaignActivation(db: Db): Promise<SystemCheck> {
  // Check approval queue for pending items that are actionable
  const pendingCount = await db.collection("ads_approval_queue")
    .countDocuments({ status: "pending" })

  // Check if there's a viable campaign ready to activate
  const latestViability = await db.collection("ads_keyword_intelligence")
    .findOne({}, { sort: { generatedAt: -1 }, projection: { meetsSuccessCriterion: 1, totalCount: 1 } })

  const paused = await db.collection("ads_deployments")
    .countDocuments({ state: "paused", status: { $in: ["pending", "approved"] } })

  if (paused > 0 && pendingCount === 0) return {
    status:   "warning",
    label:    `${paused} campaign(s) paused`,
    detail:   "Campaign(s) are paused and waiting to be activated. Recharge account and enable in Google Ads.",
    setupUrl: "/admin/growth/paid",
    score:    15,
  }

  if (pendingCount > 0) return {
    status:   "warning",
    label:    `${pendingCount} pending approvals`,
    detail:   `${pendingCount} recommendation(s) waiting for your review in the Approval Queue.`,
    setupUrl: "/admin/growth/ads/approval-queue",
    score:    12,
  }

  const hasKeywords = latestViability?.meetsSuccessCriterion === true
  if (!hasKeywords) return {
    status:   "error",
    label:    "No viable campaign",
    detail:   "No high-viability campaign is ready. Run Keyword Intelligence to generate one.",
    setupUrl: "/admin/growth/paid",
    score:    2,
  }

  return {
    status:  "ok",
    label:   "Campaign-ready",
    detail:  "Keyword pipeline has met the success criterion. Campaign is ready for deployment.",
    score:   20,
  }
}

// ── Next actions generator ────────────────────────────────────────────────────

function buildNextActions(systems: Record<string, SystemCheck>): NextAction[] {
  const actions: NextAction[] = []

  if (systems.googleAds.status === "error") {
    actions.push({
      action:    "Configure Google Ads developer token and customer ID",
      why:       systems.googleAds.detail,
      impact:    "high",
      setupUrl:  systems.googleAds.setupUrl,
    })
  }
  if (systems.conversionTracking.status === "warning" || systems.conversionTracking.status === "error") {
    actions.push({
      action:    "Set up conversion tracking in Google Ads + GTM",
      why:       systems.conversionTracking.detail,
      impact:    "high",
      setupUrl:  systems.conversionTracking.setupUrl,
    })
  }
  if (systems.gsc.status !== "ok") {
    actions.push({
      action:    "Connect Google Search Console and sync data",
      why:       systems.gsc.detail,
      impact:    "medium",
      setupUrl:  systems.gsc.setupUrl,
    })
  }
  if (systems.gtm.status !== "ok") {
    actions.push({
      action:    "Add GTM container ID to environment variables",
      why:       systems.gtm.detail,
      impact:    "medium",
      setupUrl:  systems.gtm.setupUrl,
    })
  }
  if (systems.campaignActivation.status === "warning") {
    actions.push({
      action:    "Review and approve pending campaign recommendations",
      why:       systems.campaignActivation.detail,
      impact:    "high",
      setupUrl:  systems.campaignActivation.setupUrl,
    })
  }

  if (actions.length === 0) {
    actions.push({
      action:    "All systems operational — monitor campaign performance",
      why:       "Every system is configured and active. Review the approval queue daily.",
      impact:    "low",
      setupUrl:  "/admin/growth/ads/approval-queue",
    })
  }

  return actions.slice(0, 5)
}

// ── Main ──────────────────────────────────────────────────────────────────────

export async function checkSystemReadiness(): Promise<ReadinessResult> {
  const client = await clientPromise
  const db     = client.db() as Db

  const [googleAds, gsc, conversionTracking, campaignActivation] = await Promise.all([
    checkGoogleAds(db),
    checkGSC(db),
    checkConversionTracking(db),
    checkCampaignActivation(db),
  ])
  const gtm = await checkGTM()

  const systems: Record<string, SystemCheck> = {
    googleAds, gsc, gtm, conversionTracking, campaignActivation,
  }

  const score = Object.values(systems).reduce((s, c) => s + c.score, 0)
  const overall: ReadinessResult["overall"] =
    score >= 80 ? "ready" :
    score >= 40 ? "partial" : "not_ready"

  return {
    overall,
    score,
    systems,
    nextActions: buildNextActions(systems),
    checkedAt:   new Date().toISOString(),
  }
}
