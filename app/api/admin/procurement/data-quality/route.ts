import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export const maxDuration = 60

export async function GET() {
  try {
    const db = (await clientPromise).db()
    const gc = db.collection("gem_contracts")

    const [
      contracts,
      enriched,
      pending_enrichment,
      gmvArr,
      sellers,
      depts,
      products,
      states,
      earliestArr,
      latestArr,
      lastSeenArr,
      kgDoc,
      alertDoc,
    ] = await Promise.all([
      gc.countDocuments(),
      gc.countDocuments({ detail_scraped: true }),
      gc.countDocuments({ detail_scraped: { $ne: true } }),
      gc.aggregate([{ $group: { _id: null, t: { $sum: "$contract_value_num" } } }]).toArray(),
      gc.distinct("seller_name_canonical", { seller_name_canonical: { $ne: null } }),
      gc.distinct("dept_name", { dept_name: { $ne: null } }),
      gc.distinct("product_name", { product_name: { $ne: null } }),
      gc.distinct("seller_state", { seller_state: { $ne: null } }),
      gc.find({ contract_date_dt: { $ne: null } }).sort({ contract_date_dt: 1 }).limit(1).project({ contract_date_dt: 1 }).toArray(),
      gc.find({ contract_date_dt: { $ne: null } }).sort({ contract_date_dt: -1 }).limit(1).project({ contract_date_dt: 1 }).toArray(),
      gc.find({ first_seen: { $ne: null } }).sort({ first_seen: -1 }).limit(1).project({ first_seen: 1 }).toArray(),
      db.collection("gem_kg_dealer_scores").find({}).sort({ updated_at: -1 }).limit(1).project({ updated_at: 1 }).toArray(),
      db.collection("gem_procurement_alerts").find({}).sort({ created_at: -1 }).limit(1).project({ created_at: 1 }).toArray(),
    ])

    const total_gmv = gmvArr[0]?.t || 0
    const pct_enriched = contracts ? Math.round((enriched / contracts) * 100) : 0
    const total_sellers = sellers.length
    const total_depts = depts.length
    const total_products = products.length
    const total_states = states.length

    const earliest = earliestArr[0]?.contract_date_dt ?? null
    const latest = latestArr[0]?.contract_date_dt ?? null
    const last_seen = lastSeenArr[0]?.first_seen ?? null
    const kg_built_at = kgDoc[0]?.updated_at ?? null
    const last_alert = alertDoc[0]?.created_at ?? null

    const warnings: string[] = []
    const now = new Date()

    if (latest) {
      const latestDate = new Date(latest)
      const daysAgo = Math.floor((now.getTime() - latestDate.getTime()) / 86400000)
      if (daysAgo > 30) {
        warnings.push(`No data collected after ${latestDate.toISOString().slice(0, 10)} (${daysAgo} days ago)`)
      }
    }

    if (!kg_built_at) {
      warnings.push("Knowledge Graph not built — click Build Now in AI Analyst tab")
    } else {
      const kgDaysAgo = Math.floor((now.getTime() - new Date(kg_built_at).getTime()) / 86400000)
      if (kgDaysAgo > 7) {
        warnings.push(`Knowledge Graph built ${kgDaysAgo} days ago — rebuild recommended`)
      }
    }

    if (pending_enrichment > 0) {
      warnings.push(`${pending_enrichment} contracts pending enrichment`)
    }

    return NextResponse.json({
      contracts,
      enriched,
      pending_enrichment,
      pct_enriched,
      total_gmv,
      total_sellers,
      total_depts,
      total_products,
      total_states,
      date_range: { earliest, latest, last_seen },
      kg_built_at,
      last_alert,
      warnings,
    })
  } catch (err) {
    console.error("data-quality error:", err)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
