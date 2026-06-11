import { NextRequest, NextResponse } from "next/server"
import { buildAttributionReport, createAttributionLead, updateLeadStage, syncFromRFQLeads, type FunnelStage } from "@/lib/growth-os/revenue-attribution"
import clientPromise from "@/lib/mongodb"

export async function GET(req: NextRequest) {
  const url  = new URL(req.url)
  const view = url.searchParams.get("view")

  if (view === "leads") {
    const db = (await clientPromise).db()
    const leads = await db.collection("revenue_attribution")
      .find({})
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray()
    return NextResponse.json(JSON.parse(JSON.stringify(leads)))
  }

  if (view === "sync") {
    const result = await syncFromRFQLeads()
    return NextResponse.json(result)
  }

  // Default: full attribution report
  try {
    const report = await buildAttributionReport()
    return NextResponse.json(report)
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  if (body.action === "sync") {
    const result = await syncFromRFQLeads()
    return NextResponse.json(result)
  }

  if (body.action === "update_stage") {
    const { leadId, stage, revenue, notes } = body
    if (!leadId || !stage) return NextResponse.json({ error: "leadId and stage required" }, { status: 400 })
    await updateLeadStage(leadId, stage as FunnelStage, { revenue, notes })
    return NextResponse.json({ ok: true })
  }

  if (body.action === "create") {
    const id = await createAttributionLead(body.lead ?? {})
    return NextResponse.json({ ok: true, leadId: id })
  }

  return NextResponse.json({ error: "action required: sync | update_stage | create" }, { status: 400 })
}
