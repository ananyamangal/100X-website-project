import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export async function GET() {
  try {
    const db = (await clientPromise).db()

    const [totalBids, activeBids, awardedBids, valueAgg, statesArr, dealerArr] =
      await Promise.all([
        db.collection("bid_lifecycle").countDocuments(),
        db.collection("bid_lifecycle").countDocuments({
          current_status: { $in: ["published", "technical_eval", "financial_eval", "financial_evaluated"] },
        }),
        db.collection("bid_lifecycle").countDocuments({ current_status: "awarded" }),
        db.collection("bid_lifecycle")
          .aggregate([
            {
              $group: {
                _id: null,
                total_estimated: { $sum: "$estimated_value_inr" },
                total_l1: { $sum: "$l1_price_inr" },
              },
            },
          ])
          .toArray(),
        db.collection("bid_lifecycle").distinct("state"),
        db.collection("bid_lifecycle").distinct("l1_dealer_name"),
      ])

    return NextResponse.json({
      total_bids: totalBids,
      active_bids: activeBids,
      awarded_bids: awardedBids,
      total_estimated_value: valueAgg[0]?.total_estimated || 0,
      total_l1_value: valueAgg[0]?.total_l1 || 0,
      states_covered: statesArr.filter(Boolean).length,
      unique_l1_dealers: dealerArr.filter(Boolean).length,
    })
  } catch (err) {
    console.error("procurement/stats error:", err)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
