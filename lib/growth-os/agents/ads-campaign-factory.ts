/**
 * AI Media Buyer — Campaign Factory (Phase 2, Funnel A, Search only).
 *
 * Phase 2 pipeline (replaces manually curated FUV keyword/ad-copy lists):
 *   2A+2B  Keyword Intelligence + Match-Type Intelligence
 *   2C     Negative Keyword Intelligence
 *   2D     Ad Copy Factory (LLM-generated RSA variants)
 *
 * Steps 1–8 are automatic and spend-free.
 * Step 9 creates non-serving Google Ads entities (PAUSED campaign).
 * Steps 10–11 queue the campaign for human review.
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
  LANDING_PAGE_PROFILES,
  GEO_INDIA,
  CAMPAIGN_DAILY_BUDGET_MICROS,
} from "@/lib/growth-os/ads-fuv-config"
import { runKeywordIntelligence, type GeneratedKeyword, type AdGroupTheme } from "@/lib/growth-os/ads-keyword-intelligence"
import { runNegativeIntelligence }                       from "@/lib/growth-os/ads-negative-intelligence"
import { runAdCopyFactory }                              from "@/lib/growth-os/ads-copy-factory"
import type { NegativeDraftV2 }                          from "@/lib/growth-os/types"

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

// ── Persist campaign plan ───────────────────────────────────────────────────

async function persistCampaignPlan(opts: {
  campaignName:    string
  demandSignal:    DemandSignal & { qualifyingTerms: string[] }
  qualityScores:   ReturnType<typeof scoreCampaign>
  deploymentId?:   string
  simulated:       boolean
  // Phase 2 metadata
  phase2: {
    kwRunId:      string
    negRunId:     string
    copyRunId:    string
    byTheme:      Record<string, GeneratedKeyword[]>
    negatives:    NegativeDraftV2[]
    adCopyVariants: unknown[]
  }
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
    // Phase 2: generated keywords with full intelligence metadata
    adGroups: AD_GROUPS.map(g => ({
      name:        g.name,
      theme:       g.theme,
      landingPage: g.landingPage,
      keywords:    opts.phase2.byTheme[g.theme] ?? [],
      rsa:         opts.phase2.adCopyVariants.find((v: any) => v.adGroupTheme === g.theme),
    })),
    // Phase 2C: generated negatives with reason/source/confidence
    campaignNegatives: opts.phase2.negatives,
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
    // Phase 2 run IDs for traceability
    phase2RunIds: {
      keywords: opts.phase2.kwRunId,
      negatives: opts.phase2.negRunId,
      adCopy:    opts.phase2.copyRunId,
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

  // Phase 2A+2B — Keyword Intelligence (signal-driven, replaces curated keyword lists)
  const kwRun = await runKeywordIntelligence({ funnel: ADS_FUNNEL_A })

  // Safety net: if Phase 2A generated 0 keywords for a theme, fall back to FUV config
  const finalByTheme: Record<AdGroupTheme, GeneratedKeyword[]> = { ...kwRun.byTheme }
  for (const group of AD_GROUPS) {
    const theme = group.theme as AdGroupTheme
    if ((finalByTheme[theme] ?? []).length === 0) {
      finalByTheme[theme] = group.keywords.map(kw => ({
        text:                kw.text,
        funnel:              ADS_FUNNEL_A,
        intent:              "dealer_acquisition" as const,
        matchType:           kw.matchType as "EXACT" | "PHRASE" | "BROAD",
        matchTypeReason:     kw.rationale ?? "FUV config fallback",
        confidence:          70,
        expectedLeadQuality: "medium" as const,
        reason:              "FUV config fallback — Phase 2A returned 0 keywords for this theme",
        source:              "expansion" as const,
        discoveryMethod:     "fuv_config_fallback",
        adGroupTheme:        theme,
      }))
    }
  }

  // Phase 2C — Negative Keyword Intelligence
  const allGeneratedKeywords: GeneratedKeyword[] = [
    ...finalByTheme.dealer,
    ...finalByTheme.oem,
    ...finalByTheme.gem,
  ]
  const negRun = await runNegativeIntelligence({ positiveKeywords: allGeneratedKeywords })

  // Phase 2D — Ad Copy Factory
  const copyRun = await runAdCopyFactory({ funnel: ADS_FUNNEL_A, byTheme: finalByTheme })

  // Build KeywordSet[] for quality scoring (Phase 2 counts, not FUV config)
  const keywordSets: KeywordSet[] = AD_GROUPS.map(g => ({
    adGroup:      g.name,
    keywords:     (finalByTheme[g.theme as AdGroupTheme] ?? []).map(k => ({ text: k.text, matchType: k.matchType })),
    negativeCount: negRun.totalCount,
  }))

  // Build RSASpec[] for quality scoring
  const rsaSpecs: RSASpec[] = AD_GROUPS.map(g => {
    const variant = copyRun.variants.find(v => v.adGroupTheme === g.theme)
    return {
      headlines:     variant?.headlines     ?? [],
      descriptions:  variant?.descriptions  ?? [],
      callouts:      variant?.callouts      ?? [],
      sitelinkCount: variant?.sitelinks?.length ?? 0,
    }
  })

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
    // Unique suffix prevents DUPLICATE_NAME errors if a prior run failed mid-way
    const runSuffix   = Math.random().toString(36).slice(2, 8)

    let budgetRn = ""
    try {
      budgetRn = await createCampaignBudget(customerId, accessToken, {
        name:            `${campaignName} — Budget — ${runSuffix}`,
        amountMicros:    CAMPAIGN_DAILY_BUDGET_MICROS,
        loginCustomerId: loginId,
      })
    } catch (e) {
      throw new Error(`Budget creation failed: ${String(e)}`)
    }

    // Suffix campaign name too — prevents DUPLICATE_CAMPAIGN_NAME if a prior run
    // created the campaign but failed later (no deployment record to roll back from)
    const deployedCampaignName = `${campaignName} — ${runSuffix}`

    let campaignRn = ""
    try {
      campaignRn = await createPausedSearchCampaign(customerId, accessToken, {
        name:               deployedCampaignName,
        budgetResourceName: budgetRn,
        loginCustomerId:    loginId,
      })
    } catch (e) {
      // Clean up orphaned budget before re-throwing
      const { removeDeployedEntities } = await import("@/lib/google-ads-mutate")
      await removeDeployedEntities(customerId, accessToken,
        { ads: [], adGroupCriteria: [], campaignCriteria: [], adGroups: [], campaign: undefined, campaignBudget: budgetRn },
        loginId,
      ).catch(() => {})
      throw new Error(`Campaign creation failed: ${String(e)}`)
    }

    // Track partial resource names so any failure below can roll back everything
    let adGroupRns: string[] = []
    let criteriaRns: string[] = []
    let campaignCriteriaRns: string[] = []
    let adsRns: string[] = []

    try {
      adGroupRns = await createAdGroups(customerId, accessToken, {
        groups:                AD_GROUPS.map(g => ({ name: g.name })),
        campaignResourceName:  campaignRn,
        loginCustomerId:       loginId,
      })

      // Phase 2A+2B keywords — carry source + theme for deployment audit
      const allKeywords = AD_GROUPS.flatMap((g, i) =>
        (finalByTheme[g.theme as AdGroupTheme] ?? []).map(kw => ({
          adGroupResourceName: adGroupRns[i],
          text:      kw.text,
          matchType: kw.matchType,
          source:    kw.source,
          theme:     kw.adGroupTheme,
        }))
      )
      const kwResult = await createKeywords(customerId, accessToken, {
        keywords:       allKeywords,
        loginCustomerId: loginId,
      })
      criteriaRns = kwResult.resourceNames

      // Log any deployment-gate rejections
      if (kwResult.rejections.length > 0) {
        const db2 = (await clientPromise).db()
        await db2.collection("ads_deployment_audit").insertOne({
          type:         "keyword_deployment_rejection",
          campaignName,
          rejectedCount: kwResult.rejections.length,
          deployedCount: criteriaRns.length,
          rejections:   kwResult.rejections,
          loggedAt:     new Date().toISOString(),
        })
        console.warn(
          `[campaign-factory] Deployment gate rejected ${kwResult.rejections.length} keywords.`,
          kwResult.rejections.map(r => `"${r.keyword}" (${r.source}) → ${r.rejectionCategory}`).join(", "),
        )
      }

      // Phase 2C negatives — text-only for Google Ads API
      campaignCriteriaRns = await createCampaignCriteria(customerId, accessToken, {
        campaignResourceName: campaignRn,
        geoTargetConstant:    GEO_INDIA,
        negativeKeywords:     negRun.negatives.map(n => n.text),
        loginCustomerId:      loginId,
      })

      // Phase 2D ad copy — LLM-generated headlines/descriptions with fallback
      adsRns = await createRSAAds(customerId, accessToken, {
        ads: AD_GROUPS.map((g, i) => {
          const variant = copyRun.variants.find(v => v.adGroupTheme === g.theme)
          return {
            adGroupResourceName: adGroupRns[i],
            finalUrl:            g.landingPage,
            headlines:           variant?.headlines    ?? rsaSpecs[i]?.headlines    ?? [],
            descriptions:        variant?.descriptions ?? rsaSpecs[i]?.descriptions ?? [],
          }
        }),
        loginCustomerId: loginId,
      })
    } catch (e) {
      // Roll back everything created so far (budget + campaign + any partial entities)
      const { removeDeployedEntities } = await import("@/lib/google-ads-mutate")
      await removeDeployedEntities(customerId, accessToken, {
        ads:              adsRns,
        adGroupCriteria:  criteriaRns,
        campaignCriteria: campaignCriteriaRns,
        adGroups:         adGroupRns,
        campaign:         campaignRn,
        campaignBudget:   budgetRn,
      }, loginId).catch(() => {})
      throw new Error(`Entity creation failed: ${String(e)}`)
    }

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
    phase2: {
      kwRunId:        kwRun.runId,
      negRunId:       negRun.runId,
      copyRunId:      copyRun.runId,
      byTheme:        finalByTheme,
      negatives:      negRun.negatives.map(n => ({
        text:       n.text,
        matchType:  n.matchType === "BROAD" ? "PHRASE" : n.matchType,
        reason:     n.reason,
        confidence: n.confidence,
        category:   n.source,
      })),
      adCopyVariants: copyRun.variants,
    },
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
