import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export async function GET() {
  try {
    const db = (await clientPromise).db()
    const bidCol    = db.collection("gem_awarded_bids")
    const dealerCol = db.collection("gem_dealers")

    const [
      totalBids,
      totalDealers,
      defenceCount,
      municipalCount,
      statesArr,
      deptArr,
      lastSync,
    ] = await Promise.all([
      bidCol.countDocuments(),
      dealerCol.countDocuments(),
      bidCol.countDocuments({ dept: { $regex: "Army|Air Force|Navy|Coast Guard|DGQA|Defence|DRDO|Border", $options: "i" } }),
      bidCol.countDocuments({ dept: { $regex: "Nagar|Municipal|Palika|Nigam|Corporation|ULB|E-nagar|Panchayat", $options: "i" } }),
      bidCol.distinct("state"),
      bidCol.distinct("dept"),
      bidCol.find({}).sort({ updated_at: -1 }).limit(1).toArray(),
    ])

    return NextResponse.json({
      total_bids: totalBids,
      total_dealers: totalDealers,
      defence_count: defenceCount,
      municipal_count: municipalCount,
      states_covered: statesArr.filter(Boolean).length,
      dept_coverage: deptArr.filter(Boolean).length,
      last_sync: lastSync[0]?.updated_at?.toISOString() ?? null,
    })
  } catch (err) {
    console.error("procurement/stats error:", err)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
