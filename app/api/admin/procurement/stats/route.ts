import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export const maxDuration = 30

export async function GET() {
  try {
    const db = (await clientPromise).db()
    const gc  = db.collection("gem_contracts")
    const dls = db.collection("gem_dealers")

    const [
      totalContracts,
      enrichedContracts,
      totalDealers,
      gmvArr,
      statesArr,
      deptArr,
      lastContract,
    ] = await Promise.all([
      gc.countDocuments(),
      gc.countDocuments({ detail_scraped: true }),
      dls.countDocuments(),
      gc.aggregate([{ $group: { _id: null, t: { $sum: "$contract_value_num" } } }]).toArray(),
      gc.distinct("seller_state"),
      gc.distinct("dept_name"),
      gc.find({}).sort({ first_seen: -1 }).limit(1).toArray(),
    ])

    const totalGmv      = gmvArr[0]?.t || 0
    const statesCovered = statesArr.filter(Boolean).length
    const deptCoverage  = deptArr.filter(Boolean).length

    return NextResponse.json({
      // gem_contracts stats (new primary source)
      total_contracts:  totalContracts,
      enriched_contracts: enrichedContracts,
      pct_enriched:     totalContracts ? Math.round((enrichedContracts / totalContracts) * 100) : 0,
      total_gmv:        totalGmv,
      total_dealers:    totalDealers,
      states_covered:   statesCovered,
      dept_coverage:    deptCoverage,
      last_sync:        lastContract[0]?.first_seen?.toISOString() ?? null,

      // legacy fields kept for backwards compat with existing page
      total_bids:       totalContracts,
      defence_count:    0,
      municipal_count:  0,
    })
  } catch (err) {
    console.error("procurement/stats error:", err)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
