import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export const maxDuration = 60

const OWN_PRODUCT_RE = /fog|fogger|thermal fog|ulv fogger/i

export async function GET() {
  try {
    const db = (await clientPromise).db()

    let products: Record<string, unknown>[] = []
    let fromKG = false

    try {
      const raw = await db.collection("gem_kg_product_scores").find({}).toArray()
      if (raw.length > 0) {
        products = raw
        fromKG = true
      }
    } catch { /* fall through */ }

    if (!fromKG) {
      const now = new Date()
      const yearBoundary = new Date(now); yearBoundary.setFullYear(yearBoundary.getFullYear() - 1)
      const [currYear, prevYear] = await Promise.all([
        db.collection("gem_contracts").aggregate([
          { $match: { contract_date_dt: { $gte: yearBoundary.toISOString() }, product_name: { $ne: null } } },
          { $group: { _id: "$product_name", total_gmv: { $sum: "$contract_value_num" }, total_contracts: { $sum: 1 }, sellers: { $addToSet: "$seller_name_canonical" }, depts: { $addToSet: "$dept_name" }, unit_rates: { $push: "$unit_rate" } } },
          { $addFields: { seller_count: { $size: "$sellers" }, dept_count: { $size: "$depts" } } },
          { $project: { sellers: 0, depts: 0 } },
        ]).toArray(),
        db.collection("gem_contracts").aggregate([
          { $match: { contract_date_dt: { $lt: yearBoundary.toISOString() }, product_name: { $ne: null } } },
          { $group: { _id: "$product_name", total_gmv: { $sum: "$contract_value_num" } } },
        ]).toArray(),
      ])
      const prevMap = new Map(prevYear.map((d) => [d._id, d.total_gmv]))
      products = currYear.map((d) => {
        const prev = prevMap.get(d._id) || 0
        const growth_rate = prev > 0 ? Math.round(((d.total_gmv - prev) / prev) * 100) : 50
        const avg_contract_value = d.total_contracts > 0 ? Math.round(d.total_gmv / d.total_contracts) : 0
        return { product: d._id, total_contracts: d.total_contracts, total_gmv: d.total_gmv, seller_count: d.seller_count, dept_count: d.dept_count, growth_rate, avg_contract_value, year_trend: [] }
      })
    }

    // Exclude 100X own products
    const filtered = products.filter((p) => {
      const name: string = (p.product as string) || (p._id as string) || ""
      return !OWN_PRODUCT_RE.test(name)
    })

    const maxContracts = Math.max(...filtered.map((p) => (p.total_contracts as number) || 0), 1)
    const maxSellers = Math.max(...filtered.map((p) => (p.seller_count as number) || 0), 1)
    const maxDepts = Math.max(...filtered.map((p) => (p.dept_count as number) || 0), 1)
    const maxAvgValue = Math.max(...filtered.map((p) => (p.avg_contract_value as number) || 0), 1)

    const scored = filtered.map((p) => {
      const product: string = (p.product as string) || (p._id as string) || ""
      const total_contracts = (p.total_contracts as number) || 0
      const total_gmv = (p.total_gmv as number) || 0
      const seller_count = (p.seller_count as number) || 0
      const dept_count = (p.dept_count as number) || 0
      const growth_rate = (p.growth_rate as number) || 0
      const avg_contract_value = (p.avg_contract_value as number) || (total_contracts > 0 ? Math.round(total_gmv / total_contracts) : 0)

      const demand_score = (total_contracts / maxContracts) * 25
      const growth_score = Math.min(25, Math.max(0, growth_rate / 4))
      const fragmentation_score = (seller_count / maxSellers) * 20
      const value_score = (avg_contract_value / maxAvgValue) * 15
      const reach_score = (dept_count / maxDepts) * 15
      const total_score = Math.round(demand_score + growth_score + fragmentation_score + value_score + reach_score)

      let route: string
      if (total_score >= 70 && avg_contract_value > 500000) route = "Manufacturing — High Priority"
      else if (total_score >= 55) route = "OEM Partnership — Medium Priority"
      else if (total_score >= 40) route = "Import/Resell — Low Priority"
      else route = "Monitor Only"

      const estimated_tam = Math.round(total_gmv * 1.3 * (1 + Math.max(0, growth_rate) / 100))

      return {
        product,
        total_contracts,
        total_gmv,
        seller_count,
        dept_count,
        growth_rate,
        avg_contract_value,
        total_score,
        demand_score: Math.round(demand_score),
        growth_score: Math.round(growth_score),
        fragmentation_score: Math.round(fragmentation_score),
        value_score: Math.round(value_score),
        reach_score: Math.round(reach_score),
        route,
        estimated_tam,
        year_trend: p.year_trend || [],
      }
    })

    const result = scored.sort((a, b) => b.total_score - a.total_score).slice(0, 50)
    return NextResponse.json({ products: result, total: filtered.length, source: fromKG ? "knowledge_graph" : "contracts_aggregation" })
  } catch (err) {
    console.error("product-discovery error:", err)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
