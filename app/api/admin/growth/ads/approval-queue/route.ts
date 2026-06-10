import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { getDeployment, updateDeploymentStatus, rollbackDeployment, COLL_CAMPAIGN_PLANS } from "@/lib/growth-os/ads-deployment"
import { enableCampaignPostApproval } from "@/lib/google-ads-mutate"
import { getValidAccessToken } from "@/lib/google-oauth"
import { getAdsSettings } from "@/lib/google-ads"

export const dynamic = "force-dynamic"

// GET — list pending approval queue items
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status") ?? "pending_approval"

    const db = (await clientPromise).db()
    const plans = await db
      .collection(COLL_CAMPAIGN_PLANS)
      .find(
        status === "all" ? {} : { status },
        { sort: { createdAt: -1 }, limit: 50 },
      )
      .toArray()

    return NextResponse.json({
      items: plans.map(({ _id, ...rest }) => rest),
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// POST — approve / reject / modify a campaign plan
export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      action:      "approve" | "reject" | "modify"
      planId:      string
      deploymentId?: string
      reason?:     string
    }

    const { action, planId, deploymentId, reason } = body
    if (!action || !planId) {
      return NextResponse.json({ error: "action and planId required" }, { status: 400 })
    }

    const db = (await clientPromise).db()
    const now = new Date().toISOString()

    if (action === "approve") {
      const plan = await db.collection(COLL_CAMPAIGN_PLANS).findOne({ planId })
      if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 })

      if (plan.simulated) {
        await db.collection(COLL_CAMPAIGN_PLANS).updateOne(
          { planId },
          { $set: { status: "approved_simulated", approvedAt: now, updatedAt: now } },
        )
        return NextResponse.json({ ok: true, simulated: true, note: "Simulated approval — no real Google Ads changes" })
      }

      if (!deploymentId) return NextResponse.json({ error: "deploymentId required for real approval" }, { status: 400 })

      const deployment = await getDeployment(deploymentId)
      if (!deployment) return NextResponse.json({ error: "Deployment not found" }, { status: 404 })

      const adsSettings = await getAdsSettings()
      if (!adsSettings?.customerId) return NextResponse.json({ error: "Ads account not connected" }, { status: 400 })

      const accessToken = await getValidAccessToken()
      await enableCampaignPostApproval(
        adsSettings.customerId,
        accessToken,
        deployment.resourceNames.campaign,
        adsSettings.loginCustomerId,
      )

      await updateDeploymentStatus(deploymentId, {
        status:     "approved",
        state:      "enabled",
        approvedAt: now,
      })
      await db.collection(COLL_CAMPAIGN_PLANS).updateOne(
        { planId },
        { $set: { status: "approved", approvedAt: now, updatedAt: now } },
      )
      await db.collection("growth_os_opportunities").updateOne(
        { planId },
        { $set: { status: "approved", approvedAt: now, updatedAt: now } },
      )
      await db.collection("growth_os_logs").insertOne({
        ts:     now, agent: "approval-queue",
        action: "campaign_approved", planId, deploymentId,
        campaignResourceName: deployment.resourceNames.campaign,
        level:  "success", module: "ads",
      })

      return NextResponse.json({ ok: true, campaignEnabled: true })
    }

    if (action === "reject") {
      const rollbackReason = reason ?? "human_reject"
      let rollbackOk = true
      let rollbackError: string | undefined

      if (deploymentId) {
        const result = await rollbackDeployment(deploymentId, rollbackReason)
        rollbackOk = result.ok
        rollbackError = result.error
      }

      await db.collection(COLL_CAMPAIGN_PLANS).updateOne(
        { planId },
        { $set: { status: "rejected", rejectedAt: now, rejectedReason: reason ?? "", updatedAt: now } },
      )
      await db.collection("growth_os_opportunities").updateOne(
        { planId },
        { $set: { status: "rejected", updatedAt: now } },
      )
      await db.collection("growth_os_logs").insertOne({
        ts:     now, agent: "approval-queue",
        action: "campaign_rejected", planId, deploymentId,
        reason: rollbackReason, rollbackOk,
        rollbackError,
        level:  "info", module: "ads",
      })

      return NextResponse.json({ ok: true, rolledBack: rollbackOk, rollbackError })
    }

    if (action === "modify") {
      await db.collection(COLL_CAMPAIGN_PLANS).updateOne(
        { planId },
        { $set: { status: "modify_requested", modifyReason: reason ?? "", modifyRequestedAt: now, updatedAt: now } },
      )
      await db.collection("growth_os_logs").insertOne({
        ts: now, agent: "approval-queue",
        action: "campaign_modify_requested", planId,
        reason: reason ?? "", level: "info", module: "ads",
      })
      return NextResponse.json({ ok: true, note: "Modify request logged. Re-run the factory to regenerate." })
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (err) {
    console.error("[approval-queue] error:", String(err))
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
