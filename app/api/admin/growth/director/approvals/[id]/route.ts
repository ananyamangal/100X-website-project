import { type NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"
import { requireAuth } from "@/lib/rbac/server"

export const dynamic = "force-dynamic"

/** POST /api/admin/growth/director/approvals/[id] — approve | reject | defer | apply */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const { id } = params
  if (!id || !ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid recommendation ID" }, { status: 400 })
  }

  const body = await req.json().catch(() => ({}))
  const action = body.action as string
  if (!["approved", "rejected", "deferred", "applied"].includes(action)) {
    return NextResponse.json({ error: "action must be approved | rejected | deferred | applied" }, { status: 400 })
  }

  const db = (await clientPromise).db()
  const now = new Date().toISOString()

  const update: Record<string, unknown> = { status: action, reviewed_at: now }
  if (action === "rejected" && body.reason) update.rejection_reason = body.reason
  if (action === "applied") update.applied_at = now

  const result = await db.collection("director_recommendations").updateOne(
    { _id: new ObjectId(id) },
    { $set: update }
  )

  if (result.matchedCount === 0) {
    return NextResponse.json({ error: "Recommendation not found" }, { status: 404 })
  }

  // Write to outcomes for learning loop
  if (action === "approved" || action === "rejected" || action === "deferred") {
    const rec = await db.collection("director_recommendations").findOne({ _id: new ObjectId(id) })
    if (rec) {
      await db.collection("director_outcomes").insertOne({
        rec_id: id,
        run_date: rec.run_date,
        rec_type: rec.type,
        title: rec.title,
        decision: action,
        decided_at: now,
        expected_revenue: rec.expected_revenue_impact || 0,
        created_at: now,
      })
    }
  }

  return NextResponse.json({ ok: true, id, action })
}
