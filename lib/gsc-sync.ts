import clientPromise from "@/lib/mongodb"
import { getGSCSiteUrl, fetchAllGSCRows, dateRange } from "@/lib/gsc"
import { getValidAccessToken } from "@/lib/google-oauth"
import { runSchemaHealthAudit } from "@/lib/seo/schemaHealthAuditor"

export interface GSCSyncResult {
  ok: boolean
  queryCount: number
  pageCount: number
  syncedAt: string
  currentPeriod: { startDate: string; endDate: string }
  errors: string[]
}

/**
 * Run a Search Console sync: current 28-day window + previous 28-day window
 * (queries + pages) for trend comparison. Shared by the manual route and the
 * scheduled cron. Throws "NOT_CONNECTED" / "auth_failed: …" when the Google
 * account is not connected — callers map these to HTTP responses.
 */
export async function runGSCSync(): Promise<GSCSyncResult> {
  const accessToken = await getValidAccessToken() // throws NOT_CONNECTED / auth errors

  const db = (await clientPromise).db()
  const syncedAt = new Date().toISOString()
  const syncDate = syncedAt.split("T")[0]

  const current = dateRange(28)
  const previous = dateRange(28, new Date(current.startDate))

  let queryCount = 0
  let pageCount = 0
  const errors: string[] = []

  try {
    const currQueries = await fetchAllGSCRows({ dimensions: ["query"], ...current }, accessToken)
    queryCount = currQueries.length
    if (currQueries.length > 0) {
      await db.collection("gsc_query_rows").deleteMany({ syncDate, period: "current" })
      await db.collection("gsc_query_rows").insertMany(currQueries.map((r) => ({ ...r, syncDate, period: "current", ...current })))
    }

    const prevQueries = await fetchAllGSCRows({ dimensions: ["query"], ...previous }, accessToken)
    if (prevQueries.length > 0) {
      await db.collection("gsc_query_rows").deleteMany({ syncDate, period: "previous" })
      await db.collection("gsc_query_rows").insertMany(prevQueries.map((r) => ({ ...r, syncDate, period: "previous", ...previous })))
    }

    const currPages = await fetchAllGSCRows({ dimensions: ["page"], ...current }, accessToken)
    pageCount = currPages.length
    if (currPages.length > 0) {
      await db.collection("gsc_page_rows").deleteMany({ syncDate, period: "current" })
      await db.collection("gsc_page_rows").insertMany(currPages.map((r) => ({ ...r, syncDate, period: "current", ...current })))
    }

    const prevPages = await fetchAllGSCRows({ dimensions: ["page"], ...previous }, accessToken)
    if (prevPages.length > 0) {
      await db.collection("gsc_page_rows").deleteMany({ syncDate, period: "previous" })
      await db.collection("gsc_page_rows").insertMany(prevPages.map((r) => ({ ...r, syncDate, period: "previous", ...previous })))
    }
  } catch (err) {
    errors.push(String(err))
  }

  const syncDoc = {
    syncedAt, syncDate, siteUrl: getGSCSiteUrl(),
    currentPeriod: current, previousPeriod: previous,
    queryCount, pageCount, errors,
    status: errors.length === 0 ? "ok" : "partial",
  }
  await db.collection("gsc_syncs").insertOne(syncDoc)

  const count = await db.collection("gsc_syncs").countDocuments()
  if (count > 30) {
    const oldest = await db.collection("gsc_syncs").find({}).sort({ syncedAt: 1 }).limit(count - 30).project({ _id: 1 }).toArray()
    if (oldest.length) await db.collection("gsc_syncs").deleteMany({ _id: { $in: oldest.map((d) => d._id) } })
  }

  // Run schema health audit after each GSC sync (non-blocking — failure does not fail the sync)
  runSchemaHealthAudit("daily_sync").catch(() => {})

  return { ok: errors.length === 0, queryCount, pageCount, syncedAt, currentPeriod: current, errors }
}
