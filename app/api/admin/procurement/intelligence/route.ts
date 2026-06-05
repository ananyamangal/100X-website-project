/**
 * GET /api/admin/procurement/intelligence
 *
 * Synthesis view for Procurement Intelligence:
 * - Top dealers by L1 wins (with 100X flag)
 * - Top OEMs by bid wins (normalized brand names)
 * - Top buying departments (repeat buyer flag)
 * - Top buying states
 * - OEM authorization opportunities (non-100X dealers winning bids)
 */
import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

function extractOemBrand(raw: string): string {
  const m = raw.match(/Make\s*:\s*([^-\n]{2,30}?)(?:\s*--|$)/i)
  return m?.[1]?.trim() || raw.slice(0, 30).trim()
}

export async function GET() {
  try {
    const db = (await clientPromise).db()

    const [
      dealerAgg,
      oemRawAgg,
      deptAgg,
      stateAgg,
      totalBids,
      dealers100x,
    ] = await Promise.all([
      db.collection("bid_lifecycle").aggregate([
        { $match: { l1_dealer_name: { $nin: [null, ""] } } },
        {
          $group: {
            _id: "$l1_dealer_name",
            l1_wins: { $sum: 1 },
            l1_value: { $sum: "$l1_price_inr" },
            states: { $addToSet: "$state" },
            oems: { $push: "$l1_oem_brand" },
          },
        },
        { $sort: { l1_wins: -1 } },
        { $limit: 15 },
      ]).toArray(),

      db.collection("bid_lifecycle").aggregate([
        { $match: { l1_oem_brand: { $nin: [null, ""] } } },
        {
          $group: {
            _id: "$l1_oem_brand",
            wins: { $sum: 1 },
            total_l1_value: { $sum: "$l1_price_inr" },
            states: { $addToSet: "$state" },
            dealers: { $addToSet: "$l1_dealer_name" },
          },
        },
        { $sort: { wins: -1 } },
      ]).toArray(),

      db.collection("bid_lifecycle").aggregate([
        { $match: { department_name: { $nin: [null, ""] } } },
        {
          $group: {
            _id: "$department_name",
            bid_count: { $sum: 1 },
            total_l1_value: { $sum: "$l1_price_inr" },
            state: { $first: "$state" },
            latest_bid: { $max: "$publish_date" },
            statuses: { $addToSet: "$current_status" },
          },
        },
        { $sort: { bid_count: -1 } },
        { $limit: 15 },
      ]).toArray(),

      db.collection("bid_lifecycle").aggregate([
        { $match: { state: { $nin: [null, ""] } } },
        {
          $group: {
            _id: "$state",
            bid_count: { $sum: 1 },
            total_l1_value: { $sum: "$l1_price_inr" },
            awarded_count: {
              $sum: { $cond: [{ $eq: ["$current_status", "awarded"] }, 1, 0] },
            },
            l1_oems: { $push: "$l1_oem_brand" },
          },
        },
        { $sort: { bid_count: -1 } },
        { $limit: 15 },
      ]).toArray(),

      db.collection("bid_lifecycle").countDocuments(),
      db.collection("proc_dealers").find({ is_100x_dealer: true }).toArray(),
    ])

    // Normalize OEM data: merge raw strings into cleaned brand names
    const oemBrandMap: Record<string, {
      wins: number; total_l1_value: number
      states: Set<string>; dealers: Set<string>
    }> = {}
    for (const o of oemRawAgg) {
      const brand = extractOemBrand(o._id as string)
      if (!brand) continue
      if (!oemBrandMap[brand]) {
        oemBrandMap[brand] = { wins: 0, total_l1_value: 0, states: new Set(), dealers: new Set() }
      }
      oemBrandMap[brand].wins += o.wins as number
      oemBrandMap[brand].total_l1_value += (o.total_l1_value as number) || 0
      for (const s of (o.states as string[]).filter(Boolean)) oemBrandMap[brand].states.add(s)
      for (const d of (o.dealers as string[]).filter(Boolean)) oemBrandMap[brand].dealers.add(d)
    }
    const topOems = Object.entries(oemBrandMap)
      .map(([brand, data]) => ({
        brand,
        wins: data.wins,
        total_l1_value: data.total_l1_value,
        states: [...data.states].sort(),
        dealer_count: data.dealers.size,
        is_100x: brand.toLowerCase().includes("100x") || brand.toLowerCase().includes("instafog"),
      }))
      .sort((a, b) => b.wins - a.wins)
      .slice(0, 10)

    // 100X dealer lookup set
    const is100xSet = new Set(dealers100x.map(d => d.canonical_name as string))

    // Top dealers enriched
    const topDealers = dealerAgg.map(d => {
      const oems = (d.oems as string[]).filter(Boolean)
      const topOem = oems.length > 0 ? extractOemBrand(oems[0]) : ""
      return {
        name: d._id as string,
        l1_wins: d.l1_wins as number,
        l1_value: (d.l1_value as number) || 0,
        states: (d.states as string[]).filter(Boolean).sort(),
        primary_oem: topOem,
        is_100x_dealer: is100xSet.has(d._id as string),
      }
    })

    // OEM authorization opportunities: dealers winning bids NOT selling 100X
    const authOpportunities = topDealers
      .filter(d => !d.is_100x_dealer && d.l1_wins > 0)
      .map(d => ({
        dealer: d.name,
        current_oem: d.primary_oem,
        l1_wins: d.l1_wins,
        l1_value: d.l1_value,
        states: d.states,
        opportunity_score: d.l1_wins * Math.max(d.states.length, 1),
        reason: `${d.l1_wins} L1 win${d.l1_wins !== 1 ? "s" : ""} selling ${d.primary_oem || "non-100X OEM"} — active GeM dealer, not yet 100X authorized`,
      }))
      .sort((a, b) => b.opportunity_score - a.opportunity_score)
      .slice(0, 10)

    // Top states enriched
    const topStates = stateAgg.map(s => {
      const oemCounts: Record<string, number> = {}
      for (const raw of (s.l1_oems as string[]).filter(Boolean)) {
        const brand = extractOemBrand(raw)
        if (brand) oemCounts[brand] = (oemCounts[brand] || 0) + 1
      }
      const dominantOem = Object.entries(oemCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || ""
      return {
        state: (s._id as string) || "Unknown",
        bid_count: s.bid_count as number,
        total_l1_value: (s.total_l1_value as number) || 0,
        awarded_count: (s.awarded_count as number) || 0,
        dominant_oem: dominantOem,
        has_100x_presence: false, // enriched below
      }
    })

    // Mark states where at least one 100X dealer has won
    const statesWith100x = new Set<string>()
    for (const d of topDealers.filter(d => d.is_100x_dealer)) {
      for (const s of d.states) statesWith100x.add(s)
    }
    for (const s of topStates) {
      s.has_100x_presence = statesWith100x.has(s.state)
    }

    // Top departments
    const topDepartments = deptAgg.slice(0, 10).map(d => ({
      department: d._id as string,
      bid_count: d.bid_count as number,
      total_l1_value: (d.total_l1_value as number) || 0,
      state: (d.state as string) || "",
      latest_bid: d.latest_bid || null,
      is_repeat_buyer: (d.bid_count as number) > 1,
      has_active_bid: ((d.statuses as string[]) || []).some(s =>
        ["published", "technical_eval", "financial_eval"].includes(s)
      ),
    }))

    return NextResponse.json(JSON.parse(JSON.stringify({
      summary: {
        total_bids: totalBids,
        unique_dealers: topDealers.length,
        dealers_100x: topDealers.filter(d => d.is_100x_dealer).length,
        dealers_competitor: topDealers.filter(d => !d.is_100x_dealer).length,
        unique_oems: topOems.length,
        states_with_100x_presence: statesWith100x.size,
        oem_auth_opportunities: authOpportunities.length,
      },
      top_dealers: topDealers.slice(0, 10),
      top_oems: topOems,
      top_departments: topDepartments,
      top_states: topStates,
      oem_auth_opportunities: authOpportunities,
    })))
  } catch (err) {
    console.error("procurement/intelligence GET error:", err)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
