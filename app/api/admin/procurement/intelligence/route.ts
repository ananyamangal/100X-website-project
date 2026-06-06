import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DEFENCE_RX   = /Army|Air Force|Navy|Coast Guard|DGQA|Defence|DRDO|Border/i
const MUNICIPAL_RX = /Nagar|Municipal|Palika|Nigam|Corporation|ULB|E-nagar|Panchayat/i

export async function GET() {
  try {
    const db = (await clientPromise).db()
    const bidCol    = db.collection("gem_awarded_bids")
    const dealerCol = db.collection("gem_dealers")

    const [
      totalBids,
      totalDealers,
      topL1,
      deptDist,
      kwDist,
      variantDist,
      lastSyncArr,
    ] = await Promise.all([
      bidCol.countDocuments(),
      dealerCol.countDocuments(),

      dealerCol.aggregate([
        { $match: { l1_wins: { $gt: 0 } } },
        { $project: {
            canonical_name: 1, aliases: 1,
            l1_wins: 1, l2_count: 1, l3_count: 1,
            departments: 1, states: 1, bids: 1,
            is_100x_dealer: 1,
            deptCount:  { $size: { $ifNull: ["$departments", []] } },
            stateCount: { $size: { $ifNull: ["$states", []] } },
        }},
        { $addFields: { score: { $add: [
            { $multiply: ["$l1_wins", 3] },
            { $multiply: [{ $size: { $ifNull: ["$departments", []] } }, 2] },
            { $size: { $ifNull: ["$states", []] } },
        ]}}},
        { $sort: { l1_wins: -1 } },
        { $limit: 30 },
      ]).toArray(),

      bidCol.aggregate([
        { $match: { dept: { $ne: null } } },
        { $group: { _id: "$dept", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 25 },
      ]).toArray(),

      bidCol.aggregate([
        { $group: { _id: "$keyword", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]).toArray(),

      bidCol.aggregate([
        { $group: { _id: "$variant", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]).toArray(),

      bidCol.find({}).sort({ updated_at: -1 }).limit(1).toArray(),
    ])

    const authTargets = await dealerCol.aggregate([
      { $match: { l1_wins: { $gte: 2 }, is_100x_dealer: { $ne: true } } },
      { $project: {
          canonical_name: 1, aliases: 1,
          l1_wins: 1, l2_count: 1, l3_count: 1,
          departments: 1, states: 1,
          deptCount:  { $size: { $ifNull: ["$departments", []] } },
          stateCount: { $size: { $ifNull: ["$states", []] } },
      }},
      { $addFields: { score: { $add: [
          { $multiply: ["$l1_wins", 3] },
          { $multiply: [{ $size: { $ifNull: ["$departments", []] } }, 2] },
          { $size: { $ifNull: ["$states", []] } },
      ]}}},
      { $sort: { score: -1 } },
      { $limit: 25 },
    ]).toArray()

    const deptDistribution = deptDist.map(d => ({
      dept: d._id as string,
      count: d.count as number,
      segment: DEFENCE_RX.test(d._id as string)
        ? "defence"
        : MUNICIPAL_RX.test(d._id as string)
        ? "municipal"
        : "other",
    }))

    const defenceTotal   = deptDistribution.filter(d => d.segment === "defence").reduce((s, d) => s + d.count, 0)
    const municipalTotal = deptDistribution.filter(d => d.segment === "municipal").reduce((s, d) => s + d.count, 0)
    const otherTotal     = totalBids - defenceTotal - municipalTotal

    return NextResponse.json(JSON.parse(JSON.stringify({
      summary: {
        total_bids: totalBids,
        total_dealers: totalDealers,
        defence_bids: defenceTotal,
        municipal_bids: municipalTotal,
        other_bids: otherTotal,
        last_sync: lastSyncArr[0]?.updated_at ?? null,
      },
      top_dealers: topL1.map(d => ({
        name: d.canonical_name,
        l1_wins: d.l1_wins,
        l2_count: d.l2_count ?? 0,
        l3_count: d.l3_count ?? 0,
        departments: d.departments ?? [],
        states: d.states ?? [],
        dept_count: d.deptCount ?? 0,
        state_count: d.stateCount ?? 0,
        score: d.score ?? 0,
        is_100x_dealer: d.is_100x_dealer ?? false,
        bid_count: (d.bids ?? []).length,
      })),
      auth_targets: authTargets.map(d => ({
        name: d.canonical_name,
        l1_wins: d.l1_wins,
        l2_count: d.l2_count ?? 0,
        l3_count: d.l3_count ?? 0,
        departments: (d.departments ?? []).slice(0, 5),
        states: (d.states ?? []).slice(0, 5),
        dept_count: d.deptCount ?? 0,
        state_count: d.stateCount ?? 0,
        score: d.score ?? 0,
        aliases: (d.aliases ?? []).slice(0, 2),
      })),
      dept_distribution: deptDistribution,
      keyword_distribution: kwDist.map(d => ({ keyword: d._id, count: d.count })),
      variant_distribution: variantDist.map(d => ({ variant: d._id, count: d.count })),
    })))
  } catch (err) {
    console.error("procurement/intelligence GET error:", err)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
