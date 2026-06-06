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

// GET /api/admin/procurement/report
// Answers the 4 sales intelligence questions:
//   1. Which 50 dealers should 100X contact first?
//   2. Which 20 departments buy the most fogging equipment?
//   3. Which states are underpenetrated by 100X?
//   4. Which dealers repeatedly win defence procurement?
export async function GET() {
  try {
    const db = (await clientPromise).db()
    const bidCol    = db.collection("gem_awarded_bids")
    const dealerCol = db.collection("gem_dealers")

    const [
      priorityContacts,
      topDepts,
      stateAgg,
      defenceSpecialists,
      hundredXDealers,
      totalBids,
      totalDealers,
      enrichedCount,
    ] = await Promise.all([

      // Q1: Top 50 dealers to contact — non-100X, by opportunity_score
      dealerCol.aggregate([
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
      ]).toArray(),

      // Q2: Top 20 departments by bid count
      bidCol.aggregate([
        { $match: { dept: { $nin: [null, ""] } } },
        { $group: {
            _id: "$dept",
            bid_count: { $sum: 1 },
            l1_dealers: { $addToSet: "$l1_name" },
            latest_bid: { $max: "$updated_at" },
        }},
        { $sort: { bid_count: -1 } },
        { $limit: 20 },
      ]).toArray(),

      // Q3: State data — bids per state + which states have 100X dealers
      bidCol.aggregate([
        { $match: { state: { $nin: [null, ""] } } },
        { $group: {
            _id: "$state",
            bid_count: { $sum: 1 },
            l1_names:  { $addToSet: "$l1_name" },
        }},
        { $sort: { bid_count: -1 } },
      ]).toArray(),

      // Q4: Defence specialists — dealers with defence_l1 > 0
      dealerCol
        .find({ defence_l1: { $gt: 0 } })
        .sort({ defence_l1: -1 })
        .limit(20)
        .toArray(),

      // Supporting: get 100X dealer state coverage
      dealerCol.find({ is_100x_dealer: true }).toArray(),

      bidCol.countDocuments(),
      dealerCol.countDocuments(),
      dealerCol.countDocuments({ opportunity_score: { $exists: true } }),
    ])

    // Build 100X state coverage set
    const hundredXStates = new Set<string>()
    for (const d of hundredXDealers) {
      for (const s of ((d.states as string[]) ?? [])) if (s) hundredXStates.add(s)
    }

    // Q3: State penetration
    const statePenetration = stateAgg.map(s => {
      const hasX = hundredXStates.has(s._id as string)
      const cnt  = s.bid_count as number
      return {
        state:            s._id as string,
        bid_count:        cnt,
        l1_dealers:       ((s.l1_names as string[]) ?? []).filter(Boolean).slice(0, 5),
        has_100x_coverage: hasX,
        priority: hasX ? "covered" : cnt >= 10 ? "critical" : cnt >= 5 ? "high" : "low",
      }
    })

    // Q2: enrich with segment
    const topDepartments = topDepts.map(d => ({
      dept:       d._id as string,
      bid_count:  d.bid_count as number,
      segment:    segmentOf(d._id as string),
      l1_dealers: ((d.l1_dealers as string[]) ?? []).filter(Boolean).slice(0, 3),
      latest_bid: d.latest_bid || null,
    }))

    const critical_uncovered = statePenetration.filter(s => s.priority === "critical")
    const high_uncovered     = statePenetration.filter(s => s.priority === "high")

    return NextResponse.json(JSON.parse(JSON.stringify({
      meta: {
        enriched:        enrichedCount > 0,
        total_bids:      totalBids,
        total_dealers:   totalDealers,
        dealers_to_contact: priorityContacts.length,
        covered_states:     [...hundredXStates].length,
        critical_gaps:      critical_uncovered.length,
        generated_at:       new Date(),
      },

      // Q1
      priority_contacts: priorityContacts.map((d, i) => ({
        rank:              i + 1,
        name:              d.canonical_name,
        opportunity_score: d._score,
        l1_wins:           d.l1_wins ?? 0,
        dept_count:        (d.departments ?? []).length,
        state_count:       (d.states ?? []).length,
        defence_l1:        d.defence_l1   ?? 0,
        municipal_l1:      d.municipal_l1 ?? 0,
        health_l1:         d.health_l1    ?? 0,
        crm_contacted:     d.crm_contacted   ?? false,
        crm_notes:         d.crm_notes       ?? "",
        phone:   d.phone   ?? null,
        email:   d.email   ?? null,
        website: d.website ?? null,
        aliases: ((d.aliases as string[]) ?? []).slice(0, 2),
        departments: ((d.departments as string[]) ?? []).slice(0, 3),
      })),

      // Q2
      top_departments: topDepartments,

      // Q3
      state_penetration: statePenetration,
      critical_uncovered,
      high_uncovered,

      // Q4
      defence_specialists: defenceSpecialists.map((d, i) => ({
        rank:           i + 1,
        name:           d.canonical_name,
        defence_l1:     d.defence_l1    ?? 0,
        municipal_l1:   d.municipal_l1  ?? 0,
        l1_wins:        d.l1_wins       ?? 0,
        dept_count:     (d.departments ?? []).length,
        state_count:    (d.states ?? []).length,
        is_100x_dealer: d.is_100x_dealer  ?? false,
        crm_contacted:  d.crm_contacted   ?? false,
        departments:    ((d.departments as string[]) ?? [])
                          .filter((dep: string) => DEFENCE_RX.test(dep))
                          .slice(0, 4),
      })),
    })))
  } catch (err) {
    console.error("procurement/report GET error:", err)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
