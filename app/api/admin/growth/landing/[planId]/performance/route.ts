/**
 * Landing Page Performance
 * GET  — traffic + leads + revenue attribution for a published plan
 * POST — manually record a performance snapshot
 */
import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { COLL_LANDING_PLANS } from "@/lib/growth-os/landing-page-factory"

export const dynamic = "force-dynamic"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ planId: string }> },
) {
  try {
    const { planId } = await params
    const db   = (await clientPromise).db()
    const plan = await db.collection(COLL_LANDING_PLANS).findOne({ planId })
    if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 })

    const targetUrl = plan.targetUrl as string
    const keyword   = plan.keyword   as string
    const now       = new Date().toISOString()

    // ── Traffic: GSC clicks for target URL ────────────────────────────────────
    const gscRows = await db.collection("gsc_url_rows")
      .find({ page: { $regex: targetUrl.replace(/^\//, ""), $options: "i" } })
      .sort({ date: -1 })
      .limit(30)
      .toArray()

    const totalClicks      = gscRows.reduce((s, r) => s + Number(r.clicks ?? 0), 0)
    const totalImpressions = gscRows.reduce((s, r) => s + Number(r.impressions ?? 0), 0)
    const avgPosition      = gscRows.length > 0
      ? gscRows.reduce((s, r) => s + Number(r.position ?? 0), 0) / gscRows.length
      : null

    // ── Leads: RFQ submissions referencing this URL ───────────────────────────
    const leads = await db.collection("gem_inquiries")
      .countDocuments({
        $or: [
          { source_url: { $regex: targetUrl, $options: "i" } },
          { referrer:   { $regex: targetUrl, $options: "i" } },
          { keyword:    { $regex: keyword.split(" ").slice(0, 2).join("|"), $options: "i" } },
        ],
      })

    // ── Revenue: fogging contracts where buyer matches page keyword ───────────
    const contracts = await db.collection("fogging_contracts")
      .find({
        $or: [
          { item_description:   { $regex: keyword.split(" ").slice(0, 2).join("|"), $options: "i" } },
          { buyer_organisation: { $regex: keyword.split(" ").slice(0, 2).join("|"), $options: "i" } },
        ],
      })
      .project({ total_contract_value: 1 })
      .toArray()

    const revenueAttributed = contracts.reduce((s, c) => s + Number(c.total_contract_value ?? 0), 0)
    const leadRate = totalClicks > 0 ? Number(((leads / totalClicks) * 100).toFixed(1)) : 0

    const performance = {
      pageViews:          totalImpressions,
      uniqueVisitors:     totalClicks,
      leads,
      leadRate,
      revenueAttributed,
      avgPosition:        avgPosition ? Number(avgPosition.toFixed(1)) : null,
      gscDataPoints:      gscRows.length,
      contractsMatched:   contracts.length,
      trackedAt:          plan.performance?.trackedAt ?? now,
      lastCheckedAt:      now,
    }

    // Update plan with latest performance
    await db.collection(COLL_LANDING_PLANS).updateOne(
      { planId },
      {
        $set: {
          performance,
          updatedAt: now,
          ...(performance.leads > 0 || performance.uniqueVisitors > 50
            ? { status: "tracking" }
            : {}),
        },
      },
    )

    return NextResponse.json({ planId, targetUrl, keyword, performance })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ planId: string }> },
) {
  try {
    const { planId } = await params
    const body = await req.json() as {
      pageViews?:          number
      leads?:              number
      revenueAttributed?:  number
    }

    const db  = (await clientPromise).db()
    const now = new Date().toISOString()

    const plan = await db.collection(COLL_LANDING_PLANS).findOne({ planId })
    if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 })

    const performance = {
      ...(plan.performance ?? {}),
      ...body,
      lastCheckedAt: now,
    }

    await db.collection(COLL_LANDING_PLANS).updateOne(
      { planId },
      { $set: { performance, updatedAt: now } },
    )

    await db.collection("growth_os_logs").insertOne({
      ts: now, agent: "landing-page-performance",
      action: "performance_recorded", planId,
      performance, module: "landing", level: "success",
    })

    return NextResponse.json({ ok: true, planId, performance })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
