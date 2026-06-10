import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { runGoogleAdsDirector } from "@/lib/growth-os/agents/google-ads-director"

export const maxDuration = 120

// POST — run the Director (read-only intelligence)
export async function POST() {
  try {
    const result = await runGoogleAdsDirector()
    return NextResponse.json(result)
  } catch (err) {
    console.error("Google Ads Director error:", err)
    return NextResponse.json({ error: "Director failed", detail: String(err) }, { status: 500 })
  }
}

// GET — recommendations + snapshot + last run
export async function GET() {
  const db = (await clientPromise).db()
  const lastSync = await db.collection("ads_syncs").findOne({ status: { $ne: "error" } }, { sort: { syncedAt: -1 } })
  if (!lastSync) {
    return NextResponse.json({ connected: false, message: "No Ads sync yet — connect Google Ads and run a sync.", recommendations: [], snapshot: null })
  }
  const syncDate = lastSync.syncDate as string
  const [recs, snapshot, log] = await Promise.all([
    db.collection("ads_recommendations").find({ syncDate }).toArray(),
    db.collection("ads_director_snapshots").findOne({ syncDate }),
    db.collection("growth_os_logs").findOne({ agent: "Google Ads Director" }, { sort: { ts: -1 } }),
  ])
  return NextResponse.json({
    connected: true,
    syncDate,
    lastRun: log?.ts || null,
    recommendations: JSON.parse(JSON.stringify(recs)),
    snapshot: snapshot ? JSON.parse(JSON.stringify(snapshot)) : null,
  })
}
