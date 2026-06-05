import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const days = parseInt(searchParams.get("days") || "365")
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)

    const db = (await clientPromise).db()

    const stateAgg = await db.collection("bid_lifecycle").aggregate([
      { $match: { created_at: { $gte: cutoff } } },
      {
        $group: {
          _id: "$state",
          bid_count: { $sum: 1 },
          total_estimated_value: { $sum: "$estimated_value_inr" },
          total_l1_value: { $sum: "$l1_price_inr" },
          active_bids: {
            $sum: {
              $cond: [
                {
                  $in: [
                    "$current_status",
                    ["published", "technical_eval", "financial_eval", "financial_evaluated"],
                  ],
                },
                1,
                0,
              ],
            },
          },
          awarded_bids: {
            $sum: { $cond: [{ $eq: ["$current_status", "awarded"] }, 1, 0] },
          },
          l1_dealers: { $push: "$l1_dealer_name" },
          l1_oems: { $push: "$l1_oem_brand" },
        },
      },
      { $sort: { bid_count: -1 } },
    ]).toArray()

    const states = stateAgg.map((s) => {
      // Top L1 dealers
      const dealerCounts: Record<string, number> = {}
      for (const d of (s.l1_dealers as string[])) {
        if (d) dealerCounts[d] = (dealerCounts[d] || 0) + 1
      }
      const topDealers = Object.entries(dealerCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, wins]) => ({ name, wins }))

      // Top OEMs
      const oemCounts: Record<string, number> = {}
      for (const o of (s.l1_oems as string[])) {
        if (o) oemCounts[o] = (oemCounts[o] || 0) + 1
      }
      const topOems = Object.entries(oemCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, count]) => ({ name, count }))

      return {
        state: (s._id as string) || "Unknown",
        bid_count: s.bid_count as number,
        total_estimated_value: (s.total_estimated_value as number) || 0,
        total_l1_value: (s.total_l1_value as number) || 0,
        active_bids: (s.active_bids as number) || 0,
        awarded_bids: (s.awarded_bids as number) || 0,
        top_dealers: topDealers,
        top_oems: topOems,
      }
    })

    return NextResponse.json(JSON.parse(JSON.stringify({ states, days })))
  } catch (err) {
    console.error("procurement/heatmap GET error:", err)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
