import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

function extractOemBrand(raw: string): string {
  const m = raw.match(/Make\s*:\s*([^-\n]{2,30}?)(?:\s*--|$)/i)
  return m?.[1]?.trim() || raw.slice(0, 30).trim()
}

export async function GET() {
  try {
    const db = (await clientPromise).db()

    const deptAgg = await db.collection("bid_lifecycle").aggregate([
      { $match: { department_name: { $nin: [null, ""] } } },
      {
        $group: {
          _id: "$department_name",
          bid_count: { $sum: 1 },
          total_estimated_value: { $sum: "$estimated_value_inr" },
          total_l1_value: { $sum: "$l1_price_inr" },
          total_quantity: { $sum: "$quantity" },
          states: { $addToSet: "$state" },
          product_categories: { $addToSet: "$product_category" },
          statuses: { $addToSet: "$current_status" },
          latest_bid_date: { $max: "$publish_date" },
          earliest_bid_date: { $min: "$publish_date" },
          l1_dealers: { $push: "$l1_dealer_name" },
          l1_oems: { $push: "$l1_oem_brand" },
        },
      },
      { $sort: { bid_count: -1 } },
    ]).toArray()

    const departments = deptAgg.map((d) => {
      const dealerCounts: Record<string, number> = {}
      for (const name of (d.l1_dealers as string[])) {
        if (name) dealerCounts[name] = (dealerCounts[name] || 0) + 1
      }
      const top_dealers = Object.entries(dealerCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, wins]) => ({ name, wins }))

      const oemCounts: Record<string, number> = {}
      for (const raw of (d.l1_oems as string[])) {
        if (!raw) continue
        const brand = extractOemBrand(raw)
        if (brand) oemCounts[brand] = (oemCounts[brand] || 0) + 1
      }
      const top_oems = Object.entries(oemCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, count]) => ({ name, count }))

      const statuses = (d.statuses as string[]) || []

      return {
        department_name: d._id as string,
        bid_count: d.bid_count as number,
        total_estimated_value: (d.total_estimated_value as number) || 0,
        total_l1_value: (d.total_l1_value as number) || 0,
        total_quantity: (d.total_quantity as number) || 0,
        states: (d.states as string[]).filter(Boolean).sort(),
        product_categories: (d.product_categories as string[]).filter(Boolean),
        is_repeat_buyer: (d.bid_count as number) > 1,
        has_active_bid: statuses.some(s =>
          ["published", "technical_eval", "financial_eval"].includes(s)
        ),
        latest_bid_date: d.latest_bid_date || null,
        earliest_bid_date: d.earliest_bid_date || null,
        top_dealers,
        top_oems,
      }
    })

    return NextResponse.json(
      JSON.parse(JSON.stringify({ departments, total: departments.length }))
    )
  } catch (err) {
    console.error("procurement/departments GET error:", err)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
