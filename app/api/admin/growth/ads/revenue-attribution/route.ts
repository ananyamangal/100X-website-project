import { NextRequest, NextResponse } from "next/server"
import {
  buildAttributionReport,
  createAttributionLead,
  updateLeadStage,
  syncAllLeads,
  syncFromRFQLeads,
  syncFromBrochureLeads,
  syncFromSubmissions,
  getAttributionDiagnostics,
  type FunnelStage,
} from "@/lib/growth-os/revenue-attribution"
import clientPromise from "@/lib/mongodb"

export async function GET(req: NextRequest) {
  const url  = new URL(req.url)
  const view = url.searchParams.get("view")

  if (view === "leads") {
    const page  = Math.max(0, parseInt(url.searchParams.get("page") ?? "0"))
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "100"), 500)
    const db    = (await clientPromise).db()
    const leads = await db.collection("revenue_attribution")
      .find({})
      .sort({ createdAt: -1 })
      .skip(page * limit)
      .limit(limit)
      .toArray()
    const total = await db.collection("revenue_attribution").countDocuments()
    return NextResponse.json({ leads: JSON.parse(JSON.stringify(leads)), total, page, limit })
  }

  if (view === "diagnostics") {
    try {
      const diag = await getAttributionDiagnostics()
      return NextResponse.json(diag)
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 })
    }
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
    // Full sync across all sources
    const source = body.source as string | undefined
    try {
      if (source === "rfq")      return NextResponse.json(await syncFromRFQLeads())
      if (source === "brochure") return NextResponse.json(await syncFromBrochureLeads())
      if (source === "contact")  return NextResponse.json(await syncFromSubmissions())
      // default: all sources
      const result = await syncAllLeads()
      return NextResponse.json(result)
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "Sync failed" }, { status: 500 })
    }
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

  return NextResponse.json({
    error: "action required: sync | sync (with source: rfq|brochure|contact) | update_stage | create"
  }, { status: 400 })
}
