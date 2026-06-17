/**
 * Ads Health — unified status endpoint.
 * Returns all 5 health checks + campaign inspection data.
 *
 * GET /api/admin/growth/ads/health
 */
import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { getAdsSettings, searchAds } from "@/lib/google-ads"
import { getStoredTokens, isOAuthAppConfigured } from "@/lib/google-oauth"
import { getTokenReadinessStatus } from "@/lib/google-ads-mutate"
import { CONVERSION_ACTIONS, AW_CONVERSION_ID } from "@/lib/growth-os/conversion-tracking"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const db = (await clientPromise).db()

    // ── 1. Developer Token ──────────────────────────────────────────────────
    const tokenStatus = getTokenReadinessStatus()

    // ── 2. OAuth ────────────────────────────────────────────────────────────
    const tokens       = await getStoredTokens()
    const oauthAppOk   = isOAuthAppConfigured()
    const hasRefresh   = !!tokens?.refreshToken
    const hasAdsScope  = !!(tokens?.scope?.includes("adwords"))
    const oauthStatus  = {
      appConfigured: oauthAppOk,
      connected:     hasRefresh,
      hasAdsScope,
      email:         tokens?.connectedEmail ?? null,
      connectedAt:   tokens?.connectedAt ?? null,
      ok:            hasRefresh && hasAdsScope,
    }

    // ── 3. Customer ID ──────────────────────────────────────────────────────
    const adsSettings  = await getAdsSettings()
    const customerStatus = {
      configured: !!adsSettings?.customerId,
      customerId: adsSettings?.customerId ?? null,
      customerName: adsSettings?.customerName ?? null,
      savedAt: adsSettings?.savedAt ?? null,
    }

    // ── 4. Conversion Tracking ──────────────────────────────────────────────
    const convConfig = await db.collection("ads_conversion_config").findOne({ _docId: "conversion-config" })
    const awId = convConfig?.awConversionId ?? AW_CONVERSION_ID
    const awConfigured = !String(awId).includes("REPLACE")

    const conversionActions = CONVERSION_ACTIONS.map(a => {
      const live = (convConfig?.actions ?? []).find((s: { name: string }) => s.name === a.name)
      const label = live?.conversionLabel ?? a.conversionLabel
      return {
        name:            a.name,
        conversionLabel: label,
        labelConfigured: !String(label).includes("REPLACE"),
        googleAdsId:     live?.googleAdsId ?? null,
        isRevenue:       a.isRevenue,
      }
    })
    const labelsConfigured = conversionActions.every(a => a.labelConfigured)
    const conversionStatus = {
      awConversionId:         awId,
      awConversionIdConfigured: awConfigured,
      allLabelsConfigured:    labelsConfigured,
      configuredCount:        conversionActions.filter(a => a.labelConfigured).length,
      totalCount:             conversionActions.length,
      lastSyncedAt:           convConfig?.syncedAt ?? null,
      actions:                conversionActions,
      ok:                     awConfigured && labelsConfigured,
    }

    // ── 5. Campaign Deployment ──────────────────────────────────────────────
    const [plans, deployments] = await Promise.all([
      db.collection("ads_campaign_plans")
        .find({})
        .sort({ createdAt: -1 })
        .limit(20)
        .toArray(),
      db.collection("ads_deployments")
        .find({})
        .sort({ createdAt: -1 })
        .limit(20)
        .toArray(),
    ])

    // Merge deployment data into plans
    const deploymentMap = new Map(deployments.map(d => [d.deploymentId, d]))

    const campaignInspection = plans.map(p => {
      const dep = p.deploymentId ? deploymentMap.get(p.deploymentId) : null
      const campaignResourceName = dep?.resourceNames?.campaign ?? null
      // Extract numeric Google Campaign ID from resource name (customers/X/campaigns/Y)
      const googleCampaignId = campaignResourceName
        ? campaignResourceName.split("/campaigns/")[1] ?? null
        : null

      return {
        planId:              p.planId,
        deploymentId:        p.deploymentId ?? null,
        campaignName:        p.campaignName,
        status:              p.status,
        simulated:           p.simulated,
        createdAt:           p.createdAt,
        qualityScores:       p.qualityScores,
        // Google Ads identifiers
        googleCampaignId,
        campaignResourceName,
        googleState:         dep?.state ?? null,         // paused | enabled | draft
        googleStatus:        dep?.status ?? null,        // pending | approved | rolled_back | simulated
        // Asset counts for inspection panel
        adGroupCount:        (p.adGroups ?? []).length,
        keywordCount:        (p.adGroups ?? []).reduce((s: number, g: { keywords?: unknown[] }) => s + (g.keywords?.length ?? 0), 0),
        negativeCount:       (p.campaignNegatives ?? []).length,
        headlineCount:       (p.adGroups ?? []).reduce((s: number, g: { rsa?: { headlines?: unknown[] } }) => s + (g.rsa?.headlines?.length ?? 0), 0),
        sitelinkCount:       (dep?.resourceNames?.sitelinkAssets ?? []).length,
        calloutCount:        (dep?.resourceNames?.calloutAssets ?? []).length,
        // Full detail for inspection drawer
        adGroups:            p.adGroups ?? [],
        campaignNegatives:   p.campaignNegatives ?? [],
        resourceNames:       dep?.resourceNames ?? null,
      }
    })

    // Try to enrich with live Google Ads status if connected
    let liveStatusMap: Record<string, string> = {}
    if (tokenStatus.configured && adsSettings?.customerId && oauthStatus.ok) {
      try {
        const validCampaignIds = campaignInspection
          .filter(c => c.googleCampaignId && !c.simulated)
          .map(c => c.googleCampaignId!)

        if (validCampaignIds.length > 0) {
          const { getValidAccessToken } = await import("@/lib/google-oauth")
          const at = await getValidAccessToken()
          const idList = validCampaignIds.join(",")
          const rows = await searchAds(
            adsSettings.customerId,
            `SELECT campaign.id, campaign.status FROM campaign WHERE campaign.id IN (${idList})`,
            at,
            adsSettings.loginCustomerId,
          )
          for (const row of rows) {
            const c = row.campaign as Record<string, unknown> | undefined
            if (c?.id && c?.status) {
              liveStatusMap[String(c.id)] = String(c.status)
            }
          }
        }
      } catch {
        // Non-fatal — live enrichment is best-effort
      }
    }

    const enrichedCampaigns = campaignInspection.map(c => ({
      ...c,
      liveGoogleStatus: c.googleCampaignId ? (liveStatusMap[c.googleCampaignId] ?? null) : null,
    }))

    const activeCampaigns = enrichedCampaigns.filter(c =>
      c.liveGoogleStatus === "ENABLED" || c.googleState === "enabled"
    )

    const deploymentStatus = {
      total:    enrichedCampaigns.length,
      active:   activeCampaigns.length,
      paused:   enrichedCampaigns.filter(c => c.liveGoogleStatus === "PAUSED" || c.googleState === "paused").length,
      pending:  enrichedCampaigns.filter(c => c.status === "pending_approval").length,
      rolled:   enrichedCampaigns.filter(c => c.status === "rejected" || c.googleStatus === "rolled_back").length,
      campaigns: enrichedCampaigns,
    }

    // ── Summary health ──────────────────────────────────────────────────────
    const overallHealthy = tokenStatus.configured
      && oauthStatus.ok
      && customerStatus.configured
      && conversionStatus.ok

    return NextResponse.json({
      overallHealthy,
      checkedAt: new Date().toISOString(),
      developerToken:    tokenStatus,
      oauth:             oauthStatus,
      customer:          customerStatus,
      conversionTracking: conversionStatus,
      deployment:        deploymentStatus,
    })
  } catch (err) {
    console.error("[ads/health] error:", String(err))
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
