import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { isGSCConfigured, getGSCSiteUrl, fetchAllGSCRows, dateRange } from "@/lib/gsc"

export const maxDuration = 60

export async function GET() {
  const db = (await clientPromise).db()
  const last = await db.collection("gsc_syncs").findOne({}, { sort: { syncedAt: -1 } })
  return NextResponse.json({
    configured: isGSCConfigured(),
    siteUrl: getGSCSiteUrl(),
    lastSync: last ? JSON.parse(JSON.stringify(last)) : null,
  })
}

export async function POST() {
  if (!isGSCConfigured()) {
    return NextResponse.json({ error: "GOOGLE_SC_KEY not configured. See /admin/growth/seo for setup instructions." }, { status: 400 })
  }

  const db = (await clientPromise).db()
  const syncedAt = new Date().toISOString()
  const syncDate = syncedAt.split("T")[0]

  // Current 28-day window + previous 28-day window for trend comparison
  const current = dateRange(28)
  const previous = dateRange(56, new Date(current.startDate))

  let queryCount = 0
  let pageCount = 0
  const errors: string[] = []

  try {
    // 1. Fetch current period queries
    const currQueries = await fetchAllGSCRows({ dimensions: ["query"], ...current })
    queryCount = currQueries.length

    // Upsert query rows (replace today's data if re-syncing same day)
    if (currQueries.length > 0) {
      await db.collection("gsc_query_rows").deleteMany({ syncDate, period: "current" })
      await db.collection("gsc_query_rows").insertMany(
        currQueries.map(r => ({ ...r, syncDate, period: "current", ...current }))
      )
    }

    // 2. Fetch previous period queries (for trend)
    const prevQueries = await fetchAllGSCRows({ dimensions: ["query"], ...previous })
    if (prevQueries.length > 0) {
      await db.collection("gsc_query_rows").deleteMany({ syncDate, period: "previous" })
      await db.collection("gsc_query_rows").insertMany(
        prevQueries.map(r => ({ ...r, syncDate, period: "previous", ...previous }))
      )
    }

    // 3. Fetch current period pages
    const currPages = await fetchAllGSCRows({ dimensions: ["page"], ...current })
    pageCount = currPages.length
    if (currPages.length > 0) {
      await db.collection("gsc_page_rows").deleteMany({ syncDate, period: "current" })
      await db.collection("gsc_page_rows").insertMany(
        currPages.map(r => ({ ...r, syncDate, period: "current", ...current }))
      )
    }

    // 4. Fetch previous period pages (for trend)
    const prevPages = await fetchAllGSCRows({ dimensions: ["page"], ...previous })
    if (prevPages.length > 0) {
      await db.collection("gsc_page_rows").deleteMany({ syncDate, period: "previous" })
      await db.collection("gsc_page_rows").insertMany(
        prevPages.map(r => ({ ...r, syncDate, period: "previous", ...previous }))
      )
    }

  } catch (err) {
    errors.push(String(err))
    // Log but don't stop — still record the sync attempt
  }

  // Record sync metadata
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

  // Keep only the last 30 syncs
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
