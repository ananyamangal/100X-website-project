/**
 * GET /api/admin/growth/director/packs/[id]
 * id = recommendation ID (not pack ID)
 * Returns the execution pack generated when this rec was approved.
 */
import { type NextRequest, NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"
import { requireAuth } from "@/lib/rbac/server"

export const dynamic = "force-dynamic"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const { id } = params

  const db = (await clientPromise).db()

  // Look up by rec_id (string)
  let doc = await db.collection("director_execution_packs").findOne({ rec_id: id })

  if (!doc) {
    // Also check by ObjectId in case it was stored differently
    doc = ObjectId.isValid(id)
      ? await db.collection("director_execution_packs").findOne({ rec_id: new ObjectId(id) })
      : null
  }

  if (!doc) {
    return NextResponse.json({ error: "Pack not found", rec_id: id }, { status: 404 })
  }

  // The wrapper document has shape { rec_id, rec_type, rec_title, generated_at, pack: <actual_data> }.
  // Return the inner pack object so the UI can read pack.type, pack.market_evidence, etc. directly.
  const innerPack = (doc.pack as Record<string, unknown>) ?? doc
  return NextResponse.json({ pack: innerPack })
}
