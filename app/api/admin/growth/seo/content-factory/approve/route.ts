/**
 * SEO Content Approval Queue
 * POST — approve | reject | modify a content plan
 */
import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { COLL_SEO_CONTENT_PLANS } from "@/lib/growth-os/seo-content-factory"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      action:   "approve" | "reject" | "modify"
      planId:   string
      reason?:  string
    }

    const { action, planId, reason } = body
    if (!action || !planId) {
      return NextResponse.json({ error: "action and planId required" }, { status: 400 })
    }

    const db  = (await clientPromise).db()
    const now = new Date().toISOString()

    const plan = await db.collection(COLL_SEO_CONTENT_PLANS).findOne({ planId })
    if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 })

    if (action === "approve") {
      await db.collection(COLL_SEO_CONTENT_PLANS).updateOne(
        { planId },
        { $set: { status: "approved", approvedAt: now, updatedAt: now } },
      )
      await db.collection("growth_os_logs").insertOne({
        ts: now, agent: "seo-approval-queue",
        action: "content_approved", planId,
        keyword: plan.keyword, module: "seo", level: "success",
      })
      return NextResponse.json({ ok: true, note: "Content approved. Use the Publish action to deploy to the site." })
    }

    if (action === "reject") {
      await db.collection(COLL_SEO_CONTENT_PLANS).updateOne(
        { planId },
        { $set: { status: "rejected", rejectedReason: reason ?? "", rejectedAt: now, updatedAt: now } },
      )
      await db.collection("growth_os_logs").insertOne({
        ts: now, agent: "seo-approval-queue",
        action: "content_rejected", planId,
        reason: reason ?? "", module: "seo", level: "info",
      })
      return NextResponse.json({ ok: true })
    }

    if (action === "modify") {
      await db.collection(COLL_SEO_CONTENT_PLANS).updateOne(
        { planId },
        { $set: { status: "modify_requested", modifyReason: reason ?? "", modifyRequestedAt: now, updatedAt: now } },
      )
      await db.collection("growth_os_logs").insertOne({
        ts: now, agent: "seo-approval-queue",
        action: "content_modify_requested", planId,
        reason: reason ?? "", module: "seo", level: "info",
      })
      return NextResponse.json({ ok: true, note: "Modification request logged. Re-run factory with updated parameters." })
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
