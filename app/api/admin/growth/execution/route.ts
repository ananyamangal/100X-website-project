import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export const dynamic = "force-dynamic"

const WORK_STATUSES = ["approved", "in_progress", "applied", "completed"]

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const stage = searchParams.get("stage") || ""
    const db    = (await clientPromise).db()

    // Pull approved/in-progress/waiting/completed recs from Revenue Director
    const recFilter: Record<string, unknown> = { status: { $in: WORK_STATUSES } }
    if (stage && WORK_STATUSES.includes(stage)) recFilter.status = stage

    const [recs, dealers, opportunities] = await Promise.all([
      db.collection("director_recommendations")
        .find(recFilter)
        .sort({ priority: 1, generated_at: -1 })
        .toArray(),
      db.collection("crm_dealers")
        .find({ stage: { $nin: ["lost", "active_dealer"] } })
        .sort({ updated_at: -1 })
        .toArray(),
      db.collection("crm_opportunities")
        .find({ stage: { $nin: ["won", "lost"] } })
        .sort({ updated_at: -1 })
        .toArray(),
    ])

    return NextResponse.json({
      recs:          recs.map(r => ({ ...r, _id: String(r._id) })),
      dealers:       dealers.map(d => ({ ...d, _id: String(d._id) })),
      opportunities: opportunities.map(o => ({ ...o, _id: String(o._id) })),
      counts: {
        recs:          recs.length,
        dealers:       dealers.length,
        opportunities: opportunities.length,
      },
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
