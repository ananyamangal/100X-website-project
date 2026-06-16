import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { requireAuth } from "@/lib/rbac/server"

export const dynamic = "force-dynamic"

/** GET /api/admin/growth/director/recommendations?date=YYYY-MM-DD&status=pending */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const url = new URL(req.url)
  const date = url.searchParams.get("date") || undefined
  const status = url.searchParams.get("status") || undefined
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100)

  const filter: Record<string, unknown> = {}
  if (date) filter.run_date = date
  if (status) filter.status = status

  const db = (await clientPromise).db()
  const [recs, run] = await Promise.all([
    db.collection("director_recommendations")
      .find(filter)
      .sort({ run_date: -1, expected_revenue_impact: -1 })
      .limit(limit)
      .toArray(),
    db.collection("director_daily_runs")
      .findOne(date ? { date } : {}, { sort: { date: -1 } }),
  ])

  return NextResponse.json({ recs, run, total: recs.length })
}
