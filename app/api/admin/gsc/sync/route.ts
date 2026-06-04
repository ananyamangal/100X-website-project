import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { getGSCSiteUrl, fetchAllGSCRows, dateRange } from "@/lib/gsc"
import { getValidAccessToken, getStoredTokens, isOAuthAppConfigured } from "@/lib/google-oauth"

export const maxDuration = 60

export async function GET() {
  const db = (await clientPromise).db()
  const [last, stored] = await Promise.all([
    db.collection("gsc_syncs").findOne({}, { sort: { syncedAt: -1 } }),
    getStoredTokens(),
  ])

  return NextResponse.json({
    oauthConfigured: isOAuthAppConfigured(),
    connected: !!stored,
    connectedEmail: stored?.connectedEmail || null,
    siteUrl: getGSCSiteUrl(),
    lastSync: last ? JSON.parse(JSON.stringify(last)) : null,
  })
}

export async function POST() {
  // Get a valid access token (refreshes automatically if needed)
  let accessToken: string
  try {
    accessToken = await getValidAccessToken()
  } catch (err) {
    const msg = String(err)
    if (msg.startsWith("NOT_CONNECTED")) {
      return NextResponse.json({ error: "not_connected", message: "Connect your Google account first in Growth OS → SEO → Search Console Setup." }, { status: 400 })
    }
    return NextResponse.json({ error: "auth_failed", message: msg }, { status: 401 })
  }

  const db = (await clientPromise).db()
  const syncedAt = new Date().toISOString()
  const syncDate = syncedAt.split("T")[0]

  // Current 28-day window + previous 28-day window for trend comparison
  const current = dateRange(28)
  const previous = dateRange(28, new Date(current.startDate))

  let queryCount = 0
  let pageCount = 0
  const errors: string[] = []

  try {
    // 1. Current period queries
    const currQueries = await fetchAllGSCRows({ dimensions: ["query"], ...current }, accessToken)
    queryCount = currQueries.length
    if (currQueries.length > 0) {
      await db.collection("gsc_query_rows").deleteMany({ syncDate, period: "current" })
      await db.collection("gsc_query_rows").insertMany(
        currQueries.map(r => ({ ...r, syncDate, period: "current", ...current }))
      )
    }

    // 2. Previous period queries (for trend comparison)
    const prevQueries = await fetchAllGSCRows({ dimensions: ["query"], ...previous }, accessToken)
    if (prevQueries.length > 0) {
      await db.collection("gsc_query_rows").deleteMany({ syncDate, period: "previous" })
      await db.collection("gsc_query_rows").insertMany(
        prevQueries.map(r => ({ ...r, syncDate, period: "previous", ...previous }))
      )
    }

    // 3. Current period pages
    const currPages = await fetchAllGSCRows({ dimensions: ["page"], ...current }, accessToken)
    pageCount = currPages.length
    if (currPages.length > 0) {
      await db.collection("gsc_page_rows").deleteMany({ syncDate, period: "current" })
      await db.collection("gsc_page_rows").insertMany(
        currPages.map(r => ({ ...r, syncDate, period: "current", ...current }))
      )
    }

    // 4. Previous period pages
    const prevPages = await fetchAllGSCRows({ dimensions: ["page"], ...previous }, accessToken)
    if (prevPages.length > 0) {
      await db.collection("gsc_page_rows").deleteMany({ syncDate, period: "previous" })
      await db.collection("gsc_page_rows").insertMany(
        prevPages.map(r => ({ ...r, syncDate, period: "previous", ...previous }))
      )
    }

  } catch (err) {
    errors.push(String(err))
  }

  // Record sync
  const syncDoc = {
    syncedAt,
    syncDate,
    siteUrl: getGSCSiteUrl(),
    currentPeriod: current,
    previousPeriod: previous,
    queryCount,
    pageCount,
    errors,
    status: errors.length === 0 ? "ok" : "partial",
  }
  await db.collection("gsc_syncs").insertOne(syncDoc)

  // Keep only last 30 syncs
  const count = await db.collection("gsc_syncs").countDocuments()
  if (count > 30) {
    const oldest = await db.collection("gsc_syncs").find({}).sort({ syncedAt: 1 }).limit(count - 30).project({ _id: 1 }).toArray()
    if (oldest.length) await db.collection("gsc_syncs").deleteMany({ _id: { $in: oldest.map(d => d._id) } })
  }

  if (errors.length > 0) {
    return NextResponse.json({ ok: false, errors, syncedAt }, { status: 500 })
  }
  return NextResponse.json({ ok: true, queryCount, pageCount, syncedAt, currentPeriod: current })
}
