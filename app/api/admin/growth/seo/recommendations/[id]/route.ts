/**
 * PATCH /api/admin/growth/seo/recommendations/[id]
 * Update status (approved/rejected/deferred/implemented) or add implementation notes
 */
import { type NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"
import { requireAuth } from "@/lib/rbac/server"

export const dynamic = "force-dynamic"

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const { id } = params
  if (!id || !ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 })
  }

  const body = await req.json().catch(() => ({}))
  const now = new Date().toISOString()

  const allowed = ["status", "reviewed_at", "implemented_at", "implementation_package", "notes"]
  const update: Record<string, unknown> = { updated_at: now }

  for (const key of allowed) {
    if (body[key] !== undefined) update[key] = body[key]
  }

  if (body.status === "approved" && !update.reviewed_at) update.reviewed_at = now
  if (body.status === "implemented" && !update.implemented_at) update.implemented_at = now

  const db = (await clientPromise).db()
  const result = await db.collection("seo_recommendations").updateOne(
    { _id: new ObjectId(id) },
    { $set: update }
  )

  if (result.matchedCount === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  return NextResponse.json({ ok: true, id })
}
