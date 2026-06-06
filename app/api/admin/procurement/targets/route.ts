import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

const DEFENCE_RX   = /Army|Air Force|Navy|Coast Guard|DGQA|Defence|DRDO|Border/i
const MUNICIPAL_RX = /Nagar|Municipal|Palika|Nigam|Corporation|ULB|E-nagar|Panchayat/i
const HEALTH_RX    = /Hospital|Medical|Health|AIIMS|ESIC|CGHS|Dispensary|Nursing|Clinic|PHC|CHC/i

function segmentOf(dept: string) {
  if (DEFENCE_RX.test(dept))   return "defence"
  if (MUNICIPAL_RX.test(dept)) return "municipal"
  if (HEALTH_RX.test(dept))    return "health"
  return "other"
}

// GET /api/admin/procurement/targets
// Returns 4 buyer segment lists + 3 dealer target lists.
export async function GET() {
  try {
    const db = (await clientPromise).db()
    const bidCol    = db.collection("gem_awarded_bids")
    const dealerCol = db.collection("gem_dealers")

    // ── Department target lists ───────────────────────────────────────────
    const deptAgg = await bidCol.aggregate([
      { $match: { dept: { $nin: [null, ""] } } },
      { $group: {
          _id: "$dept",
          bid_count:   { $sum: 1 },
          states:      { $addToSet: "$state" },
          l1_dealers:  { $push: "$l1_name" },
          latest_bid:  { $max: "$updated_at" },
          earliest_bid:{ $min: "$updated_at" },
      }},
      { $sort: { bid_count: -1 } },
    ]).toArray()

    const allDeptRows = deptAgg.map(d => {
      const dealerCounts: Record<string, number> = {}
      for (const name of (d.l1_dealers as string[])) {
        if (name) dealerCounts[name] = (dealerCounts[name] || 0) + 1
      }
      const top_dealers = Object.entries(dealerCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, wins]) => ({ name, wins }))

      const dept = d._id as string
      return {
        dept,
        segment: segmentOf(dept),
        bid_count:    d.bid_count as number,
        dealer_count: Object.keys(dealerCounts).length,
        states:       (d.states as string[]).filter(Boolean).sort(),
        top_dealers,
        latest_bid:   d.latest_bid   || null,
        earliest_bid: d.earliest_bid || null,
        is_repeat_buyer: (d.bid_count as number) > 1,
      }
    })

    const defence_buyers   = allDeptRows.filter(d => d.segment === "defence").slice(0, 50)
    const municipal_buyers = allDeptRows.filter(d => d.segment === "municipal").slice(0, 50)
    const health_buyers    = allDeptRows.filter(d => d.segment === "health").slice(0, 50)
    const high_frequency   = allDeptRows.slice(0, 50)

    // ── Dealer target lists ───────────────────────────────────────────────
    // Prospects: not yet 100X, sorted by opportunity_score (if enriched) or fallback
    const dealer_prospects = await dealerCol.aggregate([
      { $match: { is_100x_dealer: { $ne: true } } },
      { $addFields: {
          _score: { $ifNull: [
            "$opportunity_score",
            { $add: [
                { $multiply: ["$l1_wins", 4] },
                { $multiply: [{ $size: { $ifNull: ["$departments", []] } }, 2] },
                { $size: { $ifNull: ["$states", []] } },
            ]},
          ]},
      }},
      { $sort: { _score: -1 } },
      { $limit: 50 },
    ]).toArray()

    const defence_specialists = await dealerCol
      .find({ defence_l1: { $gt: 0 } })
      .sort({ defence_l1: -1 })
      .limit(20)
      .toArray()

    const municipal_specialists = await dealerCol
      .find({ municipal_l1: { $gt: 0 } })
      .sort({ municipal_l1: -1 })
      .limit(20)
      .toArray()

    // Did enrichment run? (check if any dealer has the field)
    const enriched = await dealerCol.countDocuments({ opportunity_score: { $exists: true } })

    return NextResponse.json(JSON.parse(JSON.stringify({
      enriched: enriched > 0,
      defence_buyers,
      municipal_buyers,
      health_buyers,
      high_frequency,
      dealer_prospects: dealer_prospects.map(d => ({
        name:              d.canonical_name,
        opportunity_score: d._score,
        l1_wins:           d.l1_wins ?? 0,
        l2_count:          d.l2_count ?? 0,
        dept_count:        (d.departments ?? []).length,
        state_count:       (d.states ?? []).length,
        defence_l1:        d.defence_l1  ?? 0,
        municipal_l1:      d.municipal_l1 ?? 0,
        health_l1:         d.health_l1   ?? 0,
        crm_contacted:     d.crm_contacted   ?? false,
        is_100x_dealer:    d.is_100x_dealer  ?? false,
        phone:   d.phone   ?? null,
        email:   d.email   ?? null,
        website: d.website ?? null,
      })),
      defence_specialists: defence_specialists.map(d => ({
        name:           d.canonical_name,
        defence_l1:     d.defence_l1  ?? 0,
        defence_l2:     d.defence_l2  ?? 0,
        l1_wins:        d.l1_wins     ?? 0,
        departments:    (d.departments ?? []).filter((dep: string) => DEFENCE_RX.test(dep)),
        states:         d.states      ?? [],
        is_100x_dealer: d.is_100x_dealer  ?? false,
        crm_contacted:  d.crm_contacted   ?? false,
      })),
      municipal_specialists: municipal_specialists.map(d => ({
        name:           d.canonical_name,
        municipal_l1:   d.municipal_l1 ?? 0,
        municipal_l2:   d.municipal_l2 ?? 0,
        l1_wins:        d.l1_wins      ?? 0,
        departments:    (d.departments ?? []).filter((dep: string) => MUNICIPAL_RX.test(dep)),
        states:         d.states       ?? [],
        is_100x_dealer: d.is_100x_dealer ?? false,
        crm_contacted:  d.crm_contacted  ?? false,
      })),
    })))
  } catch (err) {
    console.error("procurement/targets GET error:", err)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
