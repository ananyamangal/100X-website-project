import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { requireAuth } from "@/lib/rbac/server"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(req.url)
  const limit = Math.min(Number(searchParams.get("limit") ?? 20), 50)

  const db = (await clientPromise).db()
  const runs = await db.collection("seo_discovery_runs")
    .find({})
    .sort({ ran_at: -1 })
    .limit(limit)
    .toArray()

  return NextResponse.json(runs.map(r => ({ ...r, _id: String(r._id) })))
}
