/**
 * POST /api/admin/ads/negatives
 * Adds campaign-level negative keywords to an existing campaign.
 * Body: { campaignId: string, negatives: [{ text, matchType }] }
 *
 * Audience-separation tool: does not change campaign status, budget, or any
 * serving entity. Safe on PAUSED and ENABLED campaigns. Every addition is
 * logged to growth_os_logs.
 */
import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { searchAds, getAdsSettings } from "@/lib/google-ads"
import { addCampaignNegatives } from "@/lib/google-ads-mutate"
import { getValidAccessToken } from "@/lib/google-oauth"

export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      campaignId: string
      negatives: Array<{ text: string; matchType: "EXACT" | "PHRASE" | "BROAD" }>
    }
    if (!body.campaignId || !Array.isArray(body.negatives) || body.negatives.length === 0) {
      return NextResponse.json({ error: "campaignId and negatives[] required" }, { status: 400 })
    }

    const settings = await getAdsSettings()
    if (!settings?.customerId) {
      return NextResponse.json({ error: "Ads account not connected" }, { status: 400 })
    }
    const accessToken = await getValidAccessToken()

    // Resolve and verify the campaign exists in the connected account
    const rows = await searchAds(
      settings.customerId,
      `SELECT campaign.resource_name, campaign.name, campaign.status FROM campaign WHERE campaign.id = ${Number(body.campaignId)}`,
      accessToken,
      settings.loginCustomerId,
    )
    const camp = rows[0]?.campaign as { resourceName?: string; name?: string; status?: string } | undefined
    if (!camp?.resourceName) {
      return NextResponse.json({ error: `Campaign ${body.campaignId} not found in account ${settings.customerId}` }, { status: 404 })
    }

    const result = await addCampaignNegatives(settings.customerId, accessToken, {
      campaignResourceName: camp.resourceName,
      negatives: body.negatives,
      loginCustomerId: settings.loginCustomerId,
    })

    const db = (await clientPromise).db()
    await db.collection("growth_os_logs").insertOne({
      ts: new Date().toISOString(),
      agent: "negatives-api",
      action: "campaign_negatives_added",
      campaignId: body.campaignId,
      campaignName: camp.name,
      addedCount: result.resourceNames.length,
      skipped: result.skipped,
      negatives: body.negatives.map(n => `${n.matchType}:${n.text}`),
      level: "success",
      module: "ads",
    })

    return NextResponse.json({
      ok: true,
      campaignId: body.campaignId,
      campaignName: camp.name,
      campaignStatus: camp.status,
      addedCount: result.resourceNames.length,
      skipped: result.skipped,
      resourceNames: result.resourceNames,
    })
  } catch (err) {
    console.error("[ads/negatives] error:", String(err))
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
