/**
 * GET /api/admin/ga4/data?type=overview|landing-pages|sources|conversions
 * Returns computed analytics from the latest GA4 sync stored in MongoDB.
 */
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get("type") || "overview"

  const db = (await clientPromise).db()
  const latestSync = await db.collection("ga4_syncs").findOne(
    { status: { $ne: "error" } },
    { sort: { syncedAt: -1 } }
  )
  if (!latestSync) {
    return NextResponse.json({ error: "no_data", message: "No GA4 sync data yet. Select a property and run a sync first." })
  }
  const syncDate = latestSync.syncDate as string

  if (type === "overview") {
    const [curr, prev] = await Promise.all([
      db.collection("ga4_overview_rows").findOne({ syncDate, period: "current" }),
      db.collection("ga4_overview_rows").findOne({ syncDate, period: "previous" }),
    ])
    const n = (v: unknown) => (typeof v === "number" ? v : 0)
    const trend = (c: number, p: number) =>
      p === 0 ? null : Math.round(((c - p) / p) * 1000) / 10

    const activeUsers = n(curr?.activeUsers)
    const prevActiveUsers = n(prev?.activeUsers)
    const sessions = n(curr?.sessions)
    const prevSessions = n(prev?.sessions)
    const engagementRate = n(curr?.engagementRate)
    const prevEngagementRate = n(prev?.engagementRate)
    const avgDuration = n(curr?.averageSessionDuration)
    const prevAvgDuration = n(prev?.averageSessionDuration)
    const pageViews = n(curr?.screenPageViews)
    const prevPageViews = n(prev?.screenPageViews)
    const newUsers = n(curr?.newUsers)

    return NextResponse.json({
      syncedAt: latestSync.syncedAt,
      period: latestSync.currentPeriod,
      activeUsers,
      newUsers,
      sessions,
      engagementRate: Math.round(engagementRate * 1000) / 10,
      averageSessionDuration: Math.round(avgDuration),
      pageViews,
      trends: {
        activeUsers: trend(activeUsers, prevActiveUsers),
        sessions: trend(sessions, prevSessions),
        engagementRate: trend(engagementRate, prevEngagementRate),
        averageSessionDuration: trend(avgDuration, prevAvgDuration),
        pageViews: trend(pageViews, prevPageViews),
      },
    })
  }

  if (type === "landing-pages") {
    const limit = parseInt(searchParams.get("limit") || "30")
    const rows = await db.collection("ga4_landing_rows")
      .find({ syncDate })
      .sort({ sessions: -1 })
      .limit(limit)
      .toArray()
    return NextResponse.json(JSON.parse(JSON.stringify({
      syncedAt: latestSync.syncedAt,
      period: latestSync.currentPeriod,
      rows,
    })))
  }

  if (type === "sources") {
    const rows = await db.collection("ga4_source_rows")
      .find({ syncDate })
      .sort({ sessions: -1 })
      .toArray()
    const totalSessions = rows.reduce((s, r) => s + ((r.sessions as number) || 0), 0)
    const formatted = rows.map(r => ({
      ...r,
      share: totalSessions > 0
        ? Math.round(((r.sessions as number) / totalSessions) * 1000) / 10
        : 0,
    }))
    return NextResponse.json(JSON.parse(JSON.stringify({
      syncedAt: latestSync.syncedAt,
      period: latestSync.currentPeriod,
      rows: formatted,
      totalSessions,
    })))
  }

  if (type === "conversions") {
    const rows = await db.collection("ga4_conversion_rows")
      .find({ syncDate })
      .sort({ conversions: -1 })
      .toArray()
    return NextResponse.json(JSON.parse(JSON.stringify({
      syncedAt: latestSync.syncedAt,
      period: latestSync.currentPeriod,
      rows,
    })))
  }

  return NextResponse.json(
    { error: "Unknown type. Use: overview|landing-pages|sources|conversions" },
    { status: 400 }
  )
}
