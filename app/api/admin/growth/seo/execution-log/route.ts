/**
 * GET /api/admin/growth/seo/execution-log
 * Returns the SEO execution audit trail from seo_execution_log collection.
 */
import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { requireAuth } from "@/lib/rbac/server"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(req.url)
  const path = searchParams.get("path") || ""
  const limit = Math.min(Number(searchParams.get("limit") || "50"), 100)

  try {
    const db = (await clientPromise).db()
    const filter: Record<string, unknown> = {}
    if (path) filter.path = path

    const entries = await db.collection("seo_execution_log")
      .find(filter)
      .sort({ executed_at: -1 })
      .limit(limit)
      .toArray()

    return NextResponse.json({
      entries: entries.map(e => ({ ...e, _id: String(e._id) })),
      total: entries.length,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
