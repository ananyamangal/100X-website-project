/**
 * GET /api/admin/ads/data?type=overview|campaigns|keywords|search-terms|devices|locations|conversions
 */
import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get("type") || "overview"

  const db = (await clientPromise).db()
  const latestSync = await db.collection("ads_syncs").findOne(
    { status: { $ne: "error" } },
    { sort: { syncedAt: -1 } }
  )
  if (!latestSync) {
    return NextResponse.json({ error: "no_data", message: "No Ads sync data yet. Select an account and run a sync first." })
  }
  const syncDate = latestSync.syncDate as string

  if (type === "overview") {
    const row = await db.collection("ads_overview_rows").findOne({ syncDate })
    return NextResponse.json({
      syncedAt: latestSync.syncedAt,
      ...(row ? JSON.parse(JSON.stringify(row)) : {
        spend: 0, clicks: 0, impressions: 0, ctr: 0, avgCpc: 0, conversions: 0, costPerConversion: 0,
      }),
    })
  }

  const collectionMap: Record<string, string> = {
    campaigns: "ads_campaign_rows",
    keywords: "ads_keyword_rows",
    "search-terms": "ads_searchterm_rows",
    devices: "ads_device_rows",
    locations: "ads_location_rows",
    conversions: "ads_conversion_rows",
  }

  const sortMap: Record<string, string> = {
    campaigns: "spend",
    keywords: "clicks",
    "search-terms": "clicks",
    devices: "spend",
    locations: "spend",
    conversions: "conversions",
  }

  const collection = collectionMap[type]
  if (!collection) {
    return NextResponse.json({ error: "Unknown type. Use: overview|campaigns|keywords|search-terms|devices|locations|conversions" }, { status: 400 })
  }

  const limit = parseInt(searchParams.get("limit") || "100")
  const rows = await db.collection(collection)
    .find({ syncDate })
    .sort({ [sortMap[type] ?? "spend"]: -1 })
    .limit(limit)
    .toArray()

  return NextResponse.json(JSON.parse(JSON.stringify({
    syncedAt: latestSync.syncedAt,
    customerName: latestSync.customerName,
    rows,
  })))
}
