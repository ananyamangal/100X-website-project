/**
 * GET  /api/admin/ga4/sync — connection + last sync status
 * POST /api/admin/ga4/sync — run full sync (users, sessions, landing pages, sources, conversions)
 */
import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { getValidAccessToken, getStoredTokens, isOAuthAppConfigured } from "@/lib/google-oauth"
import { runGA4Report, getGA4Settings, ga4DateRange } from "@/lib/ga4"

export const maxDuration = 60

export async function GET() {
  const db = (await clientPromise).db()
  const [last, stored, settings] = await Promise.all([
    db.collection("ga4_syncs").findOne({}, { sort: { syncedAt: -1 } }),
    getStoredTokens(),
    getGA4Settings(),
  ])
  return NextResponse.json({
    oauthConfigured: isOAuthAppConfigured(),
    connected: !!stored,
    connectedEmail: stored?.connectedEmail ?? null,
    hasAnalyticsScope: stored?.scope?.includes("analytics.readonly") ?? false,
    propertyId: settings?.propertyId ?? null,
    propertyName: settings?.propertyName ?? null,
    lastSync: last ? JSON.parse(JSON.stringify(last)) : null,
  })
}

export async function POST() {
  let accessToken: string
  try {
    accessToken = await getValidAccessToken()
  } catch (err) {
    const msg = String(err)
    if (msg.startsWith("NOT_CONNECTED")) {
      return NextResponse.json({ error: "not_connected", message: "Connect your Google account first." }, { status: 400 })
    }
    return NextResponse.json({ error: "auth_failed", message: msg }, { status: 401 })
  }

  const settings = await getGA4Settings()
  if (!settings?.propertyId) {
    return NextResponse.json({ error: "no_property", message: "No GA4 property selected. Go to Analytics Setup and select a property." }, { status: 400 })
  }

  const db = (await clientPromise).db()
  const syncedAt = new Date().toISOString()
  const syncDate = syncedAt.split("T")[0]
  const { propertyId } = settings

  const current = ga4DateRange(28)
  const previous = ga4DateRange(28, new Date(current.startDate))

  const errors: string[] = []
  const counts: Record<string, number> = {}

  try {
    // 1. Overview (users, sessions, engagement) — current + previous for trends
    const [currOverview, prevOverview] = await Promise.all([
      runGA4Report({
        propertyId,
        dimensions: [],
        metrics: ["activeUsers", "newUsers", "sessions", "engagementRate", "averageSessionDuration", "screenPageViews"],
        startDate: current.startDate,
        endDate: current.endDate,
      }, accessToken),
      runGA4Report({
        propertyId,
        dimensions: [],
        metrics: ["activeUsers", "newUsers", "sessions", "engagementRate", "averageSessionDuration", "screenPageViews"],
        startDate: previous.startDate,
        endDate: previous.endDate,
      }, accessToken),
    ])
    await db.collection("ga4_overview_rows").deleteMany({ syncDate })
    if (currOverview.length > 0) {
      await db.collection("ga4_overview_rows").insertMany(
        currOverview.map(r => ({ ...r, syncDate, period: "current", ...current }))
      )
    }
    if (prevOverview.length > 0) {
      await db.collection("ga4_overview_rows").insertMany(
        prevOverview.map(r => ({ ...r, syncDate, period: "previous", ...previous }))
      )
    }
    counts.overview = currOverview.length

    // 2. Landing pages
    const landingRows = await runGA4Report({
      propertyId,
      dimensions: ["landingPage"],
      metrics: ["sessions", "activeUsers", "bounceRate", "engagementRate"],
      startDate: current.startDate,
      endDate: current.endDate,
      limit: 100,
      orderBy: [{ metric: { metricName: "sessions" } }],
    }, accessToken)
    await db.collection("ga4_landing_rows").deleteMany({ syncDate })
    if (landingRows.length > 0) {
      await db.collection("ga4_landing_rows").insertMany(
        landingRows.map(r => ({ ...r, syncDate, ...current }))
      )
    }
    counts.landingPages = landingRows.length

    // 3. Traffic sources (channel grouping)
    const sourceRows = await runGA4Report({
      propertyId,
      dimensions: ["sessionDefaultChannelGrouping"],
      metrics: ["sessions", "activeUsers", "engagementRate", "conversions"],
      startDate: current.startDate,
      endDate: current.endDate,
      limit: 50,
      orderBy: [{ metric: { metricName: "sessions" } }],
    }, accessToken)
    await db.collection("ga4_source_rows").deleteMany({ syncDate })
    if (sourceRows.length > 0) {
      await db.collection("ga4_source_rows").insertMany(
        sourceRows.map(r => ({ ...r, syncDate, ...current }))
      )
    }
    counts.sources = sourceRows.length

    // 4. Conversions by event name
    const convRows = await runGA4Report({
      propertyId,
      dimensions: ["eventName"],
      metrics: ["conversions", "totalUsers"],
      startDate: current.startDate,
      endDate: current.endDate,
      limit: 50,
      orderBy: [{ metric: { metricName: "conversions" } }],
    }, accessToken)
    const withConversions = convRows.filter(r => (r.conversions as number) > 0)
    await db.collection("ga4_conversion_rows").deleteMany({ syncDate })
    if (withConversions.length > 0) {
      await db.collection("ga4_conversion_rows").insertMany(
        withConversions.map(r => ({ ...r, syncDate, ...current }))
      )
    }
    counts.conversions = withConversions.length

  } catch (err) {
    errors.push(String(err))
  }

  const syncDoc = {
    syncedAt,
    syncDate,
    propertyId,
    propertyName: settings.propertyName,
    currentPeriod: current,
    previousPeriod: previous,
    counts,
    errors,
    status: errors.length === 0 ? "ok" : "partial",
  }
  await db.collection("ga4_syncs").insertOne(syncDoc)

  // Keep only last 30 syncs
  const total = await db.collection("ga4_syncs").countDocuments()
  if (total > 30) {
    const oldest = await db.collection("ga4_syncs").find({}).sort({ syncedAt: 1 }).limit(total - 30).project({ _id: 1 }).toArray()
    if (oldest.length) await db.collection("ga4_syncs").deleteMany({ _id: { $in: oldest.map(d => d._id) } })
  }

  if (errors.length > 0) {
    return NextResponse.json({ ok: false, errors, syncedAt }, { status: 500 })
  }
  return NextResponse.json({ ok: true, counts, syncedAt, currentPeriod: current })
}
