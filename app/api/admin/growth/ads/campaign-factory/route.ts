import { NextResponse } from "next/server"
import { runAdsCampaignFactory } from "@/lib/growth-os/agents/ads-campaign-factory"
import { getTokenReadinessStatus } from "@/lib/google-ads-mutate"
import { getAdsSettings } from "@/lib/google-ads"
import clientPromise from "@/lib/mongodb"

export const maxDuration = 300
export const dynamic = "force-dynamic"

// GET — preflight: token status + account + recent plans
export async function GET() {
  try {
    const tokenStatus = getTokenReadinessStatus()
    const adsSettings = await getAdsSettings()
    const db = (await clientPromise).db()

    const recentPlans = await db
      .collection("ads_campaign_plans")
      .find({}, { projection: { planId: 1, campaignName: 1, status: 1, simulated: 1, qualityScores: 1, createdAt: 1 } })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray()

    return NextResponse.json({
      tokenStatus,
      accountConnected: !!adsSettings?.customerId,
      customerId:       adsSettings?.customerId,
      canDeploy:        tokenStatus.configured && !!adsSettings?.customerId,
      recentPlans:      recentPlans.map(({ _id, ...rest }) => rest),
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// POST — run the factory (creates a draft campaign or simulation)
export async function POST() {
  try {
    const result = await runAdsCampaignFactory()
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 500 })
    }
    return NextResponse.json(result)
  } catch (err) {
    console.error("[campaign-factory] error:", String(err))
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
