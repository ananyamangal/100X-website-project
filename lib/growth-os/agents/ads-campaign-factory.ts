/**
 * AI Media Buyer — Campaign Factory (FUV, Funnel A, Search only).
 *
 * Orchestrates: Detect demand → Design campaign → Keywords → Match types →
 * RSA ads → LP recommendations → Quality scoring → Deploy as draft →
 * Approval request → Admin notification.
 *
 * Steps 1–7 are automatic and spend-free.
 * Step 8 creates non-serving Google Ads entities (PAUSED campaign).
 * Steps 9–10 queue the campaign for human review.
 * Only a human APPROVE can enable the campaign.
 */

import clientPromise from "@/lib/mongodb"
import { getValidAccessToken } from "@/lib/google-oauth"
import { getAdsSettings } from "@/lib/google-ads"
import {
  createCampaignBudget,
  createPausedSearchCampaign,
  createAdGroups,
  createKeywords,
  createCampaignCriteria,
  createRSAAds,
  isDeveloperTokenReady,
} from "@/lib/google-ads-mutate"
import {
  createDeploymentRecord,
  COLL_CAMPAIGN_PLANS,
  type DeployedResourceNames,
} from "@/lib/growth-os/ads-deployment"
import {
  scoreCampaign,
  type DemandSignal,
  type KeywordSet,
  type RSASpec,
} from "@/lib/growth-os/ads-quality-scoring"
import {
  ADS_FUV_VERSION,
  ADS_FUNNEL_A,
  SEED_TERMS,
  DEMAND_MIN_IMPRESSIONS,
  AD_GROUPS,
  CAMPAIGN_NEGATIVES,
  RSA_ASSETS,
  LANDING_PAGE_PROFILES,
  GEO_INDIA,
  CAMPAIGN_DAILY_BUDGET_MICROS,
} from "@/lib/growth-os/ads-fuv-config"

const AGENT = "ads-campaign-factory"

// ── Types ───────────────────────────────────────────────────────────────────

export interface FactoryRunResult {
  ok:             boolean
  simulated:      boolean
  deploymentId?:  string
  campaignPlanId?: string
  campaignName?:  string
  qualityScores?: ReturnType<typeof scoreCampaign>
  error?:         string
  skippedReason?: string
}

// ── Step 1: Detect demand ───────────────────────────────────────────────────

async function detectDemand(): Promise<DemandSignal & { qualifyingTerms: string[] }> {
  const db = (await clientPromise).db()

  const seedPattern = SEED_TERMS.map(t => t.replace(/\s+/g, "\\s+")).join("|")
  const seedRegex = new RegExp(seedPattern, "i")

  const gscRows = await db
    .collection("gsc_query_rows")
    .find({ query: seedRegex, impressions: { $gte: DEMAND_MIN_IMPRESSIONS } })
    .sort({ impressions: -1 })
    .limit(100)
    .toArray()

  const qualifyingTerms = [...new Set(gscRows.map(r => String(r.query).toLowerCase()))]
  const totalImpressions = gscRows.reduce((s, r) => s + (Number(r.impressions) || 0), 0)

  const adsRows = await db
    .collection("ads_searchterm_rows")
    .find({ searchTerm: seedRegex })
    .limit(50)
    .toArray()

  const dealerCount = await db
    .collection("growth_opportunities")
    .countDocuments({ segment: "dealer" })

  const latestGsc = await db
    .collection("gsc_query_rows")
    .findOne({}, { sort: { syncedAt: -1 }, projection: { syncedAt: 1 } })
  const syncAge = latestGsc?.syncedAt
    ? Math.floor((Date.now() - new Date(String(latestGsc.syncedAt)).getTime()) / 86_400_000)
    : 999

  return {
    qualifyingTermCount:     qualifyingTerms.length,
    totalImpressions,
    adsSearchTermCount:      adsRows.length,
    dealerOpportunityCount:  dealerCount,
    gscSyncAgeDays:          syncAge,
    qualifyingTerms,
  }
}

// ── Steps 3–5: Build keyword sets per ad group ──────────────────────────────

function buildKeywordSets(): KeywordSet[] {
  return AD_GROUPS.map(group => ({
    adGroup:      group.name,
    keywords:     group.keywords,
    negativeCount: CAMPAIGN_NEGATIVES.length,
  }))
}

// ── Step 6: Build RSA specs ─────────────────────────────────────────────────

function buildRSASpecs(): RSASpec[] {
  return AD_GROUPS.map(group => {
    const assets = RSA_ASSETS[group.theme]
    return {
      headlines:     assets.headlines,
      descriptions:  assets.descriptions,
      callouts:      assets.callouts,
      sitelinkCount: assets.sitelinks.length,
    }
  })
}

// ── Persist campaign plan ───────────────────────────────────────────────────

async function persistCampaignPlan(opts: {
  campaignName:    string
  demandSignal:    DemandSignal & { qualifyingTerms: string[] }
  qualityScores:   ReturnType<typeof scoreCampaign>
  deploymentId?:   string
  simulated:       boolean
}): Promise<string> {
  const db = (await clientPromise).db()
  const now = new Date().toISOString()
  const planId = `plan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  await db.collection(COLL_CAMPAIGN_PLANS).insertOne({
    planId,
    funnel:        ADS_FUNNEL_A,
    campaignName:  opts.campaignName,
    status:        "pending_approval",
    simulated:     opts.simulated,
    deploymentId:  opts.deploymentId,
    demandSignal:  opts.demandSignal,
    adGroups:      AD_GROUPS.map(g => ({
      name:        g.name,
      theme:       g.theme,
      landingPage: g.landingPage,
      keywords:    g.keywords,
      rsa:         RSA_ASSETS[g.theme],
    })),
    campaignNegatives: CAMPAIGN_NEGATIVES,
    landingPageRecs:   AD_GROUPS.map(g => ({
      adGroup:    g.name,
      page:       g.landingPage,
      ...LANDING_PAGE_PROFILES[g.landingPage] ?? { score: 60, gaps: [] },
    })),
    qualityScores: opts.qualityScores,
    execHeader: {
      confidence: opts.qualityScores.deploymentConfidence,
      roi:        "High",
      risk:       "Low",
      priority:   "Important",
      recommendation: opts.qualityScores.recommendation,
    },
    fuvVersion: ADS_FUV_VERSION,
    agent:      AGENT,
    createdAt:  now,
    updatedAt:  now,
  })

  return planId
}

// ── Persist approval request ────────────────────────────────────────────────

async function createApprovalRequest(opts: {
  planId:         string
  deploymentId:   string | undefined
  campaignName:   string
  qualityScores:  ReturnType<typeof scoreCampaign>
  simulated:      boolean
}): Promise<void> {
  const db = (await clientPromise).db()
  const now = new Date().toISOString()

  const badgeLabel = opts.qualityScores.recommendation === "recommended_for_deployment"
    ? "Recommended for Deployment"
    : "Needs Review"

  const gapSummary = opts.qualityScores.gaps.length > 0
    ? ` ${opts.qualityScores.gaps.length} gap(s): ${opts.qualityScores.gaps[0]}${opts.qualityScores.gaps.length > 1 ? "…" : ""}.`
    : ""

  await db.collection("growth_os_opportunities").updateOne(
    { planId: opts.planId },
    {
      $set: {
        planId:       opts.planId,
        deploymentId: opts.deploymentId,
        type:         "ads_campaign_approval",
        funnel:       ADS_FUNNEL_A,
        title:        `Draft campaign — Funnel A: Dealer Acquisition (Search)`,
        description:  `New non-serving Search campaign staged: ${opts.campaignName}. ${badgeLabel}. Confidence ${opts.qualityScores.deploymentConfidence}/100.${gapSummary} Review → Approve to launch.`,
        status:       "pending",
        simulated:    opts.simulated,
        qualityScores: opts.qualityScores,
        agent:        AGENT,
        createdAt:    now,
        updatedAt:    now,
      },
    },
    { upsert: true },
  )
}

// ── Log agent run ───────────────────────────────────────────────────────────

async function logRun(opts: {
  planId:       string
  deploymentId: string | undefined
  simulated:    boolean
  error?:       string
}): Promise<void> {
  const db = (await clientPromise).db()
  await db.collection("growth_os_logs").insertOne({
    ts:     new Date().toISOString(),
    agent:  AGENT,
    action: opts.error ? "factory_error" : opts.simulated ? "factory_simulated" : "factory_deployed",
    planId: opts.planId,
    deploymentId: opts.deploymentId,
    simulated:    opts.simulated,
    error:        opts.error,
    fuvVersion:   ADS_FUV_VERSION,
    module:       "ads",
    level:        opts.error ? "error" : "success",
  })
}

// ── Main orchestrator ───────────────────────────────────────────────────────

export async function runAdsCampaignFactory(): Promise<FactoryRunResult> {
  const campaignName = `100X | Funnel A | Dealer Acquisition | Search`

  // Step 1 — Detect demand
  const demandSignal = await detectDemand()
  if (demandSignal.qualifyingTermCount === 0) {
    return {
      ok:            true,
      simulated:     false,
      skippedReason: "No qualifying seed terms found in GSC data. Sync GSC first or verify site connection.",
    }
  }

  // Steps 3–5 — Build keyword sets (config-driven, deterministic in FUV)
  const keywordSets = buildKeywordSets()

  // Step 6 — Build RSA specs
  const rsaSpecs = buildRSASpecs()

  // Step 7 — LP recommendations (from config profiles)
  const adGroupPages = AD_GROUPS.map(g => ({ landingPage: g.landingPage }))

  // Step 8 — Quality scoring
  const qualityScores = scoreCampaign({ signal: demandSignal, keywordSets, rsaSpecs, adGroupPages })

  // Check if we can deploy to real Google Ads
  const tokenReady   = isDeveloperTokenReady()
  const adsSettings  = await getAdsSettings()
  const canDeploy    = tokenReady && !!adsSettings?.customerId
  const simulated    = !canDeploy

  let resourceNames: DeployedResourceNames = {
    campaignBudget:  "",
    campaign:        "",
    adGroups:        [],
    adGroupCriteria: [],
    campaignCriteria:[],
    ads:             [],
  }

  if (!simulated) {
    // Step 9 — Deploy as draft to Google Ads (non-serving)
    const accessToken = await getValidAccessToken()
    const customerId  = adsSettings!.customerId
    const loginId     = adsSettings!.loginCustomerId

    const budgetRn = await createCampaignBudget(customerId, accessToken, {
      name:          `${campaignName} — Budget`,
      amountMicros:  CAMPAIGN_DAILY_BUDGET_MICROS,
      loginCustomerId: loginId,
    })

    const campaignRn = await createPausedSearchCampaign(customerId, accessToken, {
      name:               campaignName,
      budgetResourceName: budgetRn,
      loginCustomerId:    loginId,
    })

    const adGroupRns = await createAdGroups(customerId, accessToken, {
      groups:                AD_GROUPS.map(g => ({ name: g.name })),
      campaignResourceName:  campaignRn,
      loginCustomerId:       loginId,
    })

    const allKeywords = AD_GROUPS.flatMap((g, i) =>
      g.keywords.map(kw => ({
        adGroupResourceName: adGroupRns[i],
        text:      kw.text,
        matchType: kw.matchType,
      }))
    )
    const criteriaRns = await createKeywords(customerId, accessToken, {
      keywords:       allKeywords,
      loginCustomerId: loginId,
    })

    const campaignCriteriaRns = await createCampaignCriteria(customerId, accessToken, {
      campaignResourceName: campaignRn,
      geoTargetConstant:    GEO_INDIA,
      negativeKeywords:     CAMPAIGN_NEGATIVES,
      loginCustomerId:      loginId,
    })

    const adsRns = await createRSAAds(customerId, accessToken, {
      ads: AD_GROUPS.map((g, i) => {
        const assets = RSA_ASSETS[g.theme]
        return {
          adGroupResourceName: adGroupRns[i],
          finalUrl:            g.landingPage,
          headlines:           assets.headlines,
          descriptions:        assets.descriptions,
        }
      }),
      loginCustomerId: loginId,
    })

    resourceNames = {
      campaignBudget:   budgetRn,
      campaign:         campaignRn,
      adGroups:         adGroupRns,
      adGroupCriteria:  criteriaRns,
      campaignCriteria: campaignCriteriaRns,
      ads:              adsRns,
    }
  }

  // Create deployment record
  const deployment = await createDeploymentRecord({
    funnel:          ADS_FUNNEL_A,
    campaignPlanId:  "pending",
    customerId:      adsSettings?.customerId ?? "simulated",
    loginCustomerId: adsSettings?.loginCustomerId,
    campaignName,
    resourceNames,
    qualityScores,
    simulated,
  })

  // Persist campaign plan (with deployment reference)
  const planId = await persistCampaignPlan({
    campaignName,
    demandSignal,
    qualityScores,
    deploymentId: deployment.deploymentId,
    simulated,
  })

  // Link planId back into deployment
  const db = (await clientPromise).db()
  await db.collection("ads_deployments").updateOne(
    { deploymentId: deployment.deploymentId },
    { $set: { campaignPlanId: planId, updatedAt: new Date().toISOString() } },
  )

  // Steps 10–11 — Approval request + admin notification
  await createApprovalRequest({
    planId,
    deploymentId: deployment.deploymentId,
    campaignName,
    qualityScores,
    simulated,
  })

  await logRun({ planId, deploymentId: deployment.deploymentId, simulated })

  return {
    ok:            true,
    simulated,
    deploymentId:  deployment.deploymentId,
    campaignPlanId: planId,
    campaignName,
    qualityScores,
  }
}
