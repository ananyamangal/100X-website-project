/**
 * Landing Page Approval
 * POST — approve | reject | modify a landing page draft
 */
import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { COLL_LANDING_PLANS } from "@/lib/growth-os/landing-page-factory"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  try {
    const body = await req.json() as {
      action:  "approve" | "reject" | "modify"
      planId:  string
      reason?: string
    }

    const { action, planId, reason } = body
    if (!action || !planId) {
      return NextResponse.json({ error: "action and planId required" }, { status: 400 })
    }

    const db  = (await clientPromise).db()
    const now = new Date().toISOString()

    const plan = await db.collection(COLL_LANDING_PLANS).findOne({ planId })
    if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 })

    if (action === "approve") {
      await db.collection(COLL_LANDING_PLANS).updateOne(
        { planId },
        { $set: { status: "approved", approvedAt: now, updatedAt: now } },
      )
      await db.collection("growth_os_logs").insertOne({
        ts: now, agent: "landing-page-approval",
        action: "lp_approved", planId,
        keyword: plan.keyword, source: plan.source, module: "landing", level: "success",
      })
      return NextResponse.json({ ok: true, note: "Landing page approved. Use Publish to deploy to site." })
    }

    if (action === "reject") {
      await db.collection(COLL_LANDING_PLANS).updateOne(
        { planId },
        { $set: { status: "rejected", rejectedReason: reason ?? "", rejectedAt: now, updatedAt: now } },
      )
      await db.collection("growth_os_logs").insertOne({
        ts: now, agent: "landing-page-approval",
        action: "lp_rejected", planId, reason: reason ?? "",
        module: "landing", level: "info",
      })
      return NextResponse.json({ ok: true })
    }

    if (action === "modify") {
      await db.collection(COLL_LANDING_PLANS).updateOne(
        { planId },
        { $set: { status: "modify_requested", modifyReason: reason ?? "", modifyRequestedAt: now, updatedAt: now } },
      )
      await db.collection("growth_os_logs").insertOne({
        ts: now, agent: "landing-page-approval",
        action: "lp_modify_requested", planId, reason: reason ?? "",
        module: "landing", level: "info",
      })
      return NextResponse.json({ ok: true, note: "Modification logged. Re-run factory with updated parameters." })
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
