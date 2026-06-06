import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export async function GET() {
  try {
    const db = (await clientPromise).db()
    const bidCol = db.collection("gem_awarded_bids")

    const [stateAgg, segmentAgg] = await Promise.all([
      bidCol.aggregate([
        { $match: { state: { $ne: null } } },
        { $group: {
            _id: "$state",
            bid_count: { $sum: 1 },
            l1_dealers: { $push: "$l1_name" },
            depts: { $addToSet: "$dept" },
        }},
        { $sort: { bid_count: -1 } },
      ]).toArray(),

      bidCol.aggregate([
        { $match: { dept: { $ne: null } } },
        { $group: {
            _id: null,
            defence: { $sum: { $cond: [{ $regexMatch: { input: "$dept", regex: "Army|Air Force|Navy|Coast Guard|DGQA|Defence|DRDO|Border", options: "i" } }, 1, 0] } },
            municipal: { $sum: { $cond: [{ $regexMatch: { input: "$dept", regex: "Nagar|Municipal|Palika|Nigam|Corporation|ULB|E-nagar|Panchayat", options: "i" } }, 1, 0] } },
            total: { $sum: 1 },
        }},
      ]).toArray(),
    ])

    const states = stateAgg.map(s => {
      const dealerCounts: Record<string, number> = {}
      for (const d of (s.l1_dealers as string[])) {
        if (d) dealerCounts[d] = (dealerCounts[d] || 0) + 1
      }
      const top_dealers = Object.entries(dealerCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, wins]) => ({ name, wins }))

      return {
        state: s._id as string,
        bid_count: s.bid_count as number,
        top_dealers,
        dept_count: ((s.depts as string[]) ?? []).filter(Boolean).length,
      }
    })

    const seg = segmentAgg[0] ?? { defence: 0, municipal: 0, total: 0 }

    return NextResponse.json(JSON.parse(JSON.stringify({
      states,
      segment: {
        defence:   seg.defence,
        municipal: seg.municipal,
        other:     seg.total - seg.defence - seg.municipal,
        total:     seg.total,
      },
      note: "State coverage: ~21% of bids. Segment breakdown covers all bids via department name.",
    })))
  } catch (err) {
    console.error("procurement/heatmap GET error:", err)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
