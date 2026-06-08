import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export const maxDuration = 60

export async function GET() {
  try {
    const db = (await clientPromise).db()
    const insights = await db.collection("gem_procurement_insights").find({}).sort({ type: 1 }).toArray()
    const alert_count = await db.collection("gem_procurement_alerts").countDocuments({ read: { $ne: true } })
    return NextResponse.json({ insights, alert_count })
  } catch (err) {
    console.error("insights GET error:", err)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}

export async function POST() {
  try {
    const db = (await clientPromise).db()
    const gc = db.collection("gem_contracts")
    const now = new Date()
    const generated_at = now.toISOString()
    const results: Record<string, unknown>[] = []

    // Shared date boundaries
    const last12Start = new Date(now); last12Start.setFullYear(last12Start.getFullYear() - 1)
    const prev12Start = new Date(now); prev12Start.setFullYear(prev12Start.getFullYear() - 2)

    // 1. top_new_dealers
    const newDealersRaw = await gc.aggregate([
      { $group: { _id: "$seller_name_canonical", first_seen: { $min: "$first_seen" }, gmv: { $sum: "$contract_value_num" }, count: { $sum: 1 }, state: { $first: "$seller_state" }, phone: { $first: "$seller_phone" } } },
      { $match: { _id: { $ne: null }, first_seen: { $gte: last12Start.toISOString() } } },
      { $sort: { gmv: -1 } },
      { $limit: 20 },
    ]).toArray()
    results.push({
      type: "top_new_dealers",
      title: "New Dealers Discovered",
      summary: `Found ${newDealersRaw.length} dealers with ₹${(newDealersRaw.reduce((s, d) => s + (d.gmv || 0), 0) / 1e7).toFixed(1)} Cr GMV`,
      data: newDealersRaw,
      generated_at,
      contracts_analyzed: newDealersRaw.reduce((s, d) => s + (d.count || 0), 0),
    })

    // 2. top_growing_dealers
    const [last12Raw, prev12Raw] = await Promise.all([
      gc.aggregate([
        { $match: { contract_date_dt: { $gte: last12Start.toISOString() } } },
        { $group: { _id: "$seller_name_canonical", gmv: { $sum: "$contract_value_num" }, count: { $sum: 1 } } },
        { $match: { _id: { $ne: null } } },
      ]).toArray(),
      gc.aggregate([
        { $match: { contract_date_dt: { $gte: prev12Start.toISOString(), $lt: last12Start.toISOString() } } },
        { $group: { _id: "$seller_name_canonical", gmv: { $sum: "$contract_value_num" }, count: { $sum: 1 } } },
        { $match: { _id: { $ne: null } } },
      ]).toArray(),
    ])
    const prev12Map = new Map(prev12Raw.map((d) => [d._id, d.gmv]))
    const growingDealers = last12Raw
      .map((d) => {
        const prevGmv = prev12Map.get(d._id) || 0
        const growth_pct = prevGmv > 0 ? Math.round(((d.gmv - prevGmv) / prevGmv) * 100) : 999
        return { dealer: d._id, current_gmv: d.gmv, prev_gmv: prevGmv, count: d.count, growth_pct }
      })
      .filter((d) => d.growth_pct > 0)
      .sort((a, b) => b.growth_pct - a.growth_pct)
      .slice(0, 20)
    results.push({
      type: "top_growing_dealers",
      title: "Fastest Growing Dealers",
      summary: `${growingDealers.length} dealers grew in last 12 months`,
      data: growingDealers,
      generated_at,
      contracts_analyzed: last12Raw.length,
    })

    // 3. top_repeat_buyers
    let repeatBuyers: Record<string, unknown>[] = []
    try {
      repeatBuyers = await db.collection("gem_kg_dealer_dept").aggregate([
        { $group: { _id: "$dept", total_contracts: { $sum: "$total_contracts" }, dealer_count: { $sum: 1 }, total_gmv: { $sum: "$total_gmv" } } },
        { $addFields: { avg_contracts_per_dealer: { $divide: ["$total_contracts", "$dealer_count"] } } },
        { $match: { avg_contracts_per_dealer: { $gt: 3 } } },
        { $sort: { avg_contracts_per_dealer: -1 } },
        { $limit: 20 },
      ]).toArray()
    } catch {
      repeatBuyers = await gc.aggregate([
        { $group: { _id: "$dept_name", total_contracts: { $sum: 1 }, total_gmv: { $sum: "$contract_value_num" } } },
        { $match: { _id: { $ne: null } } },
        { $sort: { total_contracts: -1 } },
        { $limit: 20 },
      ]).toArray()
    }
    results.push({
      type: "top_repeat_buyers",
      title: "Top Repeat Buyers",
      summary: `${repeatBuyers.length} departments with high repeat purchase rate`,
      data: repeatBuyers,
      generated_at,
      contracts_analyzed: repeatBuyers.length,
    })

    // 4. top_emerging_products
    let emergingProducts: Record<string, unknown>[] = []
    try {
      emergingProducts = await db.collection("gem_kg_product_scores").aggregate([
        { $match: { growth_rate: { $gt: 10 } } },
        { $sort: { growth_rate: -1 } },
        { $limit: 20 },
      ]).toArray()
    } catch { /* ignore */ }
    if (!emergingProducts.length) {
      const yearBoundary = new Date(now); yearBoundary.setFullYear(yearBoundary.getFullYear() - 1)
      const [currYear, prevYear] = await Promise.all([
        gc.aggregate([
          { $match: { contract_date_dt: { $gte: yearBoundary.toISOString() } } },
          { $group: { _id: "$product_name", gmv: { $sum: "$contract_value_num" }, count: { $sum: 1 } } },
          { $match: { _id: { $ne: null } } },
        ]).toArray(),
        gc.aggregate([
          { $match: { contract_date_dt: { $lt: yearBoundary.toISOString() } } },
          { $group: { _id: "$product_name", gmv: { $sum: "$contract_value_num" }, count: { $sum: 1 } } },
          { $match: { _id: { $ne: null } } },
        ]).toArray(),
      ])
      const prevMap = new Map(prevYear.map((d) => [d._id, d.gmv]))
      emergingProducts = currYear
        .map((d) => {
          const prev = prevMap.get(d._id) || 0
          const growth_rate = prev > 0 ? Math.round(((d.gmv - prev) / prev) * 100) : 999
          return { product: d._id, total_gmv: d.gmv, total_contracts: d.count, growth_rate }
        })
        .filter((d) => d.growth_rate > 10)
        .sort((a, b) => b.growth_rate - a.growth_rate)
        .slice(0, 20)
    }
    results.push({
      type: "top_emerging_products",
      title: "Emerging Product Categories",
      summary: `${emergingProducts.length} products growing >10% YoY`,
      data: emergingProducts,
      generated_at,
      contracts_analyzed: emergingProducts.length,
    })

    // 5. top_adjacent_products
    const foggingDepts = await gc.distinct("dept_name", { product_name: { $regex: /fog|fogger|thermal|ulv/i }, dept_name: { $ne: null } })
    const adjacentProducts = await gc.aggregate([
      { $match: { dept_name: { $in: foggingDepts }, product_name: { $not: /fog|fogger|thermal|ulv/i, $ne: null } } },
      { $group: { _id: "$product_name", total_gmv: { $sum: "$contract_value_num" }, dept_count: { $addToSet: "$dept_name" }, count: { $sum: 1 } } },
      { $addFields: { dept_count: { $size: "$dept_count" } } },
      { $sort: { total_gmv: -1 } },
      { $limit: 20 },
    ]).toArray()
    results.push({
      type: "top_adjacent_products",
      title: "Adjacent Products (Same Buyers as Fogging)",
      summary: `${adjacentProducts.length} products bought by same depts as fogging machines`,
      data: adjacentProducts,
      generated_at,
      contracts_analyzed: adjacentProducts.length,
    })

    // 6. top_fragmented_markets
    let fragmentedMarkets: Record<string, unknown>[] = []
    try {
      fragmentedMarkets = await db.collection("gem_kg_product_scores").aggregate([
        { $match: { seller_count: { $gt: 5 }, total_gmv: { $gt: 1000000 }, growth_rate: { $gte: 0 } } },
        { $sort: { seller_count: -1, total_gmv: -1 } },
        { $limit: 20 },
      ]).toArray()
    } catch {
      fragmentedMarkets = await gc.aggregate([
        { $group: { _id: "$product_name", total_gmv: { $sum: "$contract_value_num" }, seller_count: { $addToSet: "$seller_name_canonical" }, count: { $sum: 1 } } },
        { $match: { _id: { $ne: null }, total_gmv: { $gt: 1000000 } } },
        { $addFields: { seller_count: { $size: "$seller_count" } } },
        { $match: { seller_count: { $gt: 5 } } },
        { $sort: { seller_count: -1, total_gmv: -1 } },
        { $limit: 20 },
      ]).toArray()
    }
    results.push({
      type: "top_fragmented_markets",
      title: "Fragmented Markets (High Opportunity)",
      summary: `${fragmentedMarkets.length} markets with >5 sellers`,
      data: fragmentedMarkets,
      generated_at,
      contracts_analyzed: fragmentedMarkets.length,
    })

    // 7-10. Sector opportunities
    const sectors = [
      { type: "top_municipal_ops", title: "Top Municipal Opportunities", regex: /municipal|nagar|corporation|civic|urban local/i },
      { type: "top_health_ops", title: "Top Health Department Opportunities", regex: /health|hospital|medical|PHC/i },
      { type: "top_defence_ops", title: "Top Defence Opportunities", regex: /defence|defense|army|military|cantonm|DRDO/i },
      { type: "top_railway_ops", title: "Top Railway Opportunities", regex: /railway|rail|RCF|DRM/i },
    ]
    for (const sector of sectors) {
      const data = await gc.aggregate([
        { $match: { dept_name: { $regex: sector.regex } } },
        { $group: { _id: "$dept_name", total_gmv: { $sum: "$contract_value_num" }, contract_count: { $sum: 1 }, sellers: { $addToSet: "$seller_name_canonical" } } },
        { $addFields: { seller_count: { $size: "$sellers" } } },
        { $project: { sellers: 0 } },
        { $sort: { total_gmv: -1 } },
        { $limit: 20 },
      ]).toArray()
      results.push({
        type: sector.type,
        title: sector.title,
        summary: `${data.length} departments, ₹${(data.reduce((s, d) => s + (d.total_gmv || 0), 0) / 1e7).toFixed(1)} Cr GMV`,
        data,
        generated_at,
        contracts_analyzed: data.reduce((s, d) => s + (d.contract_count || 0), 0),
      })
    }

    // Replace insights collection
    const insightsCol = db.collection("gem_procurement_insights")
    await insightsCol.deleteMany({})
    if (results.length) await insightsCol.insertMany(results)

    // Generate alerts (no duplicates by title)
    const alertsCol = db.collection("gem_procurement_alerts")
    const newAlerts: Record<string, unknown>[] = []

    const newDealerData = newDealersRaw as Array<{ _id: string; gmv: number }>
    for (const dealer of newDealerData) {
      if ((dealer.gmv || 0) > 5000000) {
        const title = `High-value new dealer: ${dealer._id}`
        const exists = await alertsCol.findOne({ title })
        if (!exists) {
          newAlerts.push({ type: "new_dealer", title, description: `GMV ₹${(dealer.gmv / 1e7).toFixed(2)} Cr`, severity: "high", data: dealer, created_at: generated_at, read: false })
        }
      }
    }

    const emergingData = emergingProducts as Array<{ product?: string; _id?: string; growth_rate: number }>
    for (const p of emergingData) {
      if ((p.growth_rate || 0) > 50) {
        const name = p.product || p._id || ""
        const title = `Growth spike: ${name} (${p.growth_rate}% YoY)`
        const exists = await alertsCol.findOne({ title })
        if (!exists) {
          newAlerts.push({ type: "category_growth_spike", title, description: `Product ${name} grew ${p.growth_rate}% YoY`, severity: "warning", data: p, created_at: generated_at, read: false })
        }
      }
    }

    const fragmentedData = fragmentedMarkets as Array<{ product?: string; _id?: string; seller_count: number }>
    for (const p of fragmentedData) {
      if ((p.seller_count || 0) > 20) {
        const name = p.product || p._id || ""
        const title = `Fragmented market: ${name} (${p.seller_count} sellers)`
        const exists = await alertsCol.findOne({ title })
        if (!exists) {
          newAlerts.push({ type: "fragmented_market", title, description: `${p.seller_count} sellers compete in ${name}`, severity: "info", data: p, created_at: generated_at, read: false })
        }
      }
    }

    if (newAlerts.length) await alertsCol.insertMany(newAlerts)

    return NextResponse.json({ success: true, generated_at, summary: { insights_generated: results.length, alerts_created: newAlerts.length } })
  } catch (err) {
    console.error("insights POST error:", err)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
