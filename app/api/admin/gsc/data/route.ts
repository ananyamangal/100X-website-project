/**
 * GET /api/admin/gsc/data?type=queries|pages|near-wins|trends|country|overview
 *
 * Returns data from the latest GSC sync stored in MongoDB.
 * All computations happen here so the UI stays thin.
 */
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

// Expected CTR by position band — used for near-win detection
function expectedCtr(position: number): number {
  if (position <= 1) return 0.28
  if (position <= 2) return 0.15
  if (position <= 3) return 0.11
  if (position <= 4) return 0.09
  if (position <= 5) return 0.08
  if (position <= 6) return 0.07
  if (position <= 7) return 0.065
  if (position <= 8) return 0.06
  if (position <= 9) return 0.055
  if (position <= 10) return 0.05
  if (position <= 15) return 0.025
  if (position <= 20) return 0.015
  return 0.005
}

function isNearWin(row: { position: number; impressions: number; ctr: number }): boolean {
  if (row.position < 4 || row.position > 20) return false
  if (row.impressions < 50) return false
  return row.ctr < expectedCtr(row.position) * 0.75
}

type Row = Record<string, unknown>

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get("type") || "overview"

  const db = (await clientPromise).db()

  // Find the latest syncDate
  const latestSync = await db.collection("gsc_syncs").findOne({ status: { $ne: "error" } }, { sort: { syncedAt: -1 } })
  if (!latestSync) {
    return NextResponse.json({ error: "no_data", message: "No GSC sync data yet. Run a sync first." })
  }
  const latestSyncDate = latestSync.syncDate as string

  if (type === "overview") {
    // Top-level summary from latest sync
    const [queryRows, pageRows] = await Promise.all([
      db.collection("gsc_query_rows").find({ syncDate: latestSyncDate, period: "current" }).toArray(),
      db.collection("gsc_page_rows").find({ syncDate: latestSyncDate, period: "current" }).toArray(),
    ])
    const totalClicks = queryRows.reduce((s, r) => s + ((r.clicks as number) || 0), 0)
    const totalImpressions = queryRows.reduce((s, r) => s + ((r.impressions as number) || 0), 0)
    const avgPosition = queryRows.length
      ? queryRows.reduce((s, r) => s + ((r.position as number) || 0), 0) / queryRows.length
      : 0
    const nearWins = queryRows.filter(r => isNearWin(r as unknown as { position: number; impressions: number; ctr: number }))
    return NextResponse.json({
      syncedAt: latestSync.syncedAt,
      period: latestSync.currentPeriod,
      totalClicks,
      totalImpressions,
      avgPosition: Math.round(avgPosition * 10) / 10,
      uniqueQueries: queryRows.length,
      uniquePages: pageRows.length,
      nearWinCount: nearWins.length,
    })
  }

  if (type === "queries") {
    const limit = parseInt(searchParams.get("limit") || "50")
    const sort = searchParams.get("sort") || "impressions"
    const rows = await db.collection("gsc_query_rows")
      .find({ syncDate: latestSyncDate, period: "current" })
      .sort({ [sort]: -1 })
      .limit(limit)
      .toArray()
    return NextResponse.json(JSON.parse(JSON.stringify({ syncedAt: latestSync.syncedAt, period: latestSync.currentPeriod, rows })))
  }

  if (type === "pages") {
    const limit = parseInt(searchParams.get("limit") || "30")
    const sort = searchParams.get("sort") || "clicks"
    const rows = await db.collection("gsc_page_rows")
      .find({ syncDate: latestSyncDate, period: "current" })
      .sort({ [sort]: -1 })
      .limit(limit)
      .toArray()
    // Strip site URL prefix for cleaner display
    const siteUrl = latestSync.siteUrl as string || ""
    const formatted = rows.map(r => ({
      ...r,
      pagePath: String(r.page || "").replace(siteUrl.replace(/\/$/, ""), "") || "/",
    }))
    return NextResponse.json(JSON.parse(JSON.stringify({ syncedAt: latestSync.syncedAt, period: latestSync.currentPeriod, rows: formatted })))
  }

  if (type === "near-wins") {
    const rows = await db.collection("gsc_query_rows")
      .find({ syncDate: latestSyncDate, period: "current" })
      .toArray()
    const nw = rows
      .filter(r => isNearWin(r as unknown as { position: number; impressions: number; ctr: number }))
      .map(r => ({
        query: r.query,
        position: Math.round((r.position as number) * 10) / 10,
        impressions: r.impressions,
        clicks: r.clicks,
        ctr: Math.round((r.ctr as number) * 1000) / 10, // as %
        expectedCtr: Math.round(expectedCtr(r.position as number) * 1000) / 10,
        ctrGap: Math.round((expectedCtr(r.position as number) - (r.ctr as number)) * 1000) / 10,
        priority: (r.impressions as number) >= 200 ? "high" : (r.impressions as number) >= 100 ? "medium" : "low",
      }))
      .sort((a, b) => b.impressions - a.impressions)
    return NextResponse.json(JSON.parse(JSON.stringify({ syncedAt: latestSync.syncedAt, period: latestSync.currentPeriod, nearWins: nw })))
  }

  if (type === "trends") {
    // Compare current vs previous period for both queries and pages
    const [currQ, prevQ, currP, prevP] = await Promise.all([
      db.collection("gsc_query_rows").find({ syncDate: latestSyncDate, period: "current" }).toArray(),
      db.collection("gsc_query_rows").find({ syncDate: latestSyncDate, period: "previous" }).toArray(),
      db.collection("gsc_page_rows").find({ syncDate: latestSyncDate, period: "current" }).toArray(),
      db.collection("gsc_page_rows").find({ syncDate: latestSyncDate, period: "previous" }).toArray(),
    ])

    const prevQMap = new Map<string, Row>(prevQ.map(r => [String(r.query), r]))
    const prevPMap = new Map<string, Row>(prevP.map(r => [String(r.page), r]))

    // Rising queries: position improved by >= 3, or new in current (no previous)
    const risingQueries = currQ
      .map(r => {
        const prev = prevQMap.get(String(r.query))
        const posChange = prev ? (r.position as number) - (prev.position as number) : null // negative = improved
        const clickChange = prev ? (r.clicks as number) - (prev.clicks as number) : null
        return { query: r.query, position: r.position, impressions: r.impressions, clicks: r.clicks, posChange, clickChange, isNew: !prev }
      })
      .filter(r => r.isNew || (r.posChange !== null && r.posChange <= -3))
      .sort((a, b) => (a.posChange ?? -999) - (b.posChange ?? -999))
      .slice(0, 20)

    // Falling queries: position worsened by >= 3
    const fallingQueries = currQ
      .map(r => {
        const prev = prevQMap.get(String(r.query))
        if (!prev) return null
        const posChange = (r.position as number) - (prev.position as number)
        return posChange >= 3 ? { query: r.query, position: r.position, impressions: r.impressions, clicks: r.clicks, posChange } : null
      })
      .filter(Boolean)
      .sort((a, b) => b!.posChange - a!.posChange)
      .slice(0, 20)

    // Rising pages: clicks increased >= 5 or impressions up >= 50
    const risingPages = currP
      .map(r => {
        const prev = prevPMap.get(String(r.page))
        const siteUrl = latestSync.siteUrl as string || ""
        const pagePath = String(r.page || "").replace(siteUrl.replace(/\/$/, ""), "") || "/"
        if (!prev) return { pagePath, page: r.page, clicks: r.clicks, impressions: r.impressions, clickChange: null, posChange: null, isNew: true }
        const clickChange = (r.clicks as number) - (prev.clicks as number)
        const posChange = (r.position as number) - (prev.position as number)
        return { pagePath, page: r.page, clicks: r.clicks, impressions: r.impressions, clickChange, posChange, isNew: false }
      })
      .filter(r => r.isNew || (r.clickChange !== null && r.clickChange >= 5))
      .sort((a, b) => (b.clickChange ?? 999) - (a.clickChange ?? 999))
      .slice(0, 20)

    // Falling pages: clicks down >= 5
    const fallingPages = currP
      .map(r => {
        const prev = prevPMap.get(String(r.page))
        if (!prev) return null
        const siteUrl = latestSync.siteUrl as string || ""
        const pagePath = String(r.page || "").replace(siteUrl.replace(/\/$/, ""), "") || "/"
        const clickChange = (r.clicks as number) - (prev.clicks as number)
        return clickChange <= -5 ? { pagePath, page: r.page, clicks: r.clicks, impressions: r.impressions, clickChange } : null
      })
      .filter(Boolean)
      .sort((a, b) => a!.clickChange - b!.clickChange)
      .slice(0, 20)

    return NextResponse.json(JSON.parse(JSON.stringify({
      syncedAt: latestSync.syncedAt,
      currentPeriod: latestSync.currentPeriod,
      previousPeriod: latestSync.previousPeriod,
      risingQueries,
      fallingQueries,
      risingPages,
      fallingPages,
    })))
  }

  return NextResponse.json({ error: "Unknown type. Use: overview|queries|pages|near-wins|trends" }, { status: 400 })
}
