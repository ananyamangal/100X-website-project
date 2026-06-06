import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DEFENCE_RX   = /Army|Air Force|Navy|Coast Guard|DGQA|Defence|DRDO|Border/i
const MUNICIPAL_RX = /Nagar|Municipal|Palika|Nigam|Corporation|ULB|E-nagar|Panchayat/i

export async function GET() {
  try {
    const db = (await clientPromise).db()
    const bidCol = db.collection("gem_awarded_bids")

    const deptAgg = await bidCol.aggregate([
      { $match: { dept: { $nin: [null, ""] } } },
      { $group: {
          _id: "$dept",
          bid_count: { $sum: 1 },
          l1_dealers: { $push: "$l1_name" },
          states: { $addToSet: "$state" },
          keywords: { $addToSet: "$keyword" },
          latest_bid: { $max: "$updated_at" },
      }},
      { $sort: { bid_count: -1 } },
    ]).toArray()

    const departments = deptAgg.map(d => {
      const dealerCounts: Record<string, number> = {}
      for (const name of (d.l1_dealers as string[])) {
        if (name) dealerCounts[name] = (dealerCounts[name] || 0) + 1
      }
      const top_dealers = Object.entries(dealerCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, wins]) => ({ name, wins }))

      const deptName = d._id as string
      return {
        department_name: deptName,
        bid_count: d.bid_count as number,
        states: (d.states as string[]).filter(Boolean).sort(),
        keywords: (d.keywords as string[]).filter(Boolean),
        latest_bid: d.latest_bid || null,
        is_repeat_buyer: (d.bid_count as number) > 1,
        segment: DEFENCE_RX.test(deptName)
          ? "defence"
          : MUNICIPAL_RX.test(deptName)
          ? "municipal"
          : "other",
        top_dealers,
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
