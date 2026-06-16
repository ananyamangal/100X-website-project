/**
 * POST /api/admin/growth/seo/recommendations/[id]/rollback
 * Manually rollback an implemented SEO change.
 * Restores the before snapshot from seo_execution_log.
 */
import { type NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"
import { requireAuth } from "@/lib/rbac/server"

export const dynamic = "force-dynamic"

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

  const db = (await clientPromise).db()
  const now = new Date().toISOString()

  // Load rec — can only rollback "implemented" or "failed" recs
  const rec = await db.collection("seo_recommendations").findOne({ _id: new ObjectId(id) })
  if (!rec) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (!["implemented", "failed"].includes(rec.status)) {
    return NextResponse.json({ error: `Cannot rollback: status is "${rec.status}"` }, { status: 400 })
  }

  const path = rec.url || "/"

  // Load the most recent execution log entry for this rec
  const logEntry = await db.collection("seo_execution_log")
    .findOne({ rec_id: id, action: "execute" }, { sort: { executed_at: -1 } })

  if (!logEntry) {
    return NextResponse.json({ error: "No execution log found — cannot determine before state" }, { status: 404 })
  }

  const beforeSnapshot = logEntry.before

  // Restore before state or deactivate the override
  if (beforeSnapshot) {
    // Restore the previous override
    await db.collection("seo_page_overrides").updateOne(
      { path },
      { $set: { ...beforeSnapshot, path, updated_at: now, active: true } },
      { upsert: true }
    )
  } else {
    // There was no prior override — deactivate/remove the current one
    await db.collection("seo_page_overrides").updateOne(
      { path },
      { $set: { active: false, updated_at: now, rolled_back_at: now } }
    )
  }

  // Write rollback audit log
  await db.collection("seo_execution_log").insertOne({
    rec_id: id,
    rec_type: rec.type,
    rec_title: rec.title,
    action: "rollback",
    path,
    before: logEntry.after,    // what was live before rollback
    after: beforeSnapshot,     // what it's restored to
    status: "success",
    executed_at: now,
    final_status: "rolled_back",
    manual_rollback: true,
  })

  // Update rec status
  await db.collection("seo_recommendations").updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        status: "rolled_back",
        rolled_back_at: now,
        updated_at: now,
      },
    }
  )

  return NextResponse.json({ ok: true, status: "rolled_back", path, restored_to: beforeSnapshot ?? "no prior override" })
}
