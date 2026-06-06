import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export const maxDuration = 60

export async function GET(req: NextRequest) {
  try {
    const db = (await clientPromise).db()
    const gc = db.collection("gem_contracts")
    const sp = req.nextUrl.searchParams
    const section = sp.get("section") || "overview"

    // ── Overview / enrichment progress ────────────────────────────────────────
    if (section === "overview") {
      const [total, enriched, failed, totalValue, enrichedValue] = await Promise.all([
        gc.countDocuments(),
        gc.countDocuments({ detail_scraped: true }),
        gc.countDocuments({ enrichment_error: { $exists: true, $ne: null } }),
        gc.aggregate([
          { $group: { _id: null, total: { $sum: "$contract_value_num" } } },
        ]).toArray().then(r => r[0]?.total || 0),
        gc.aggregate([
          { $match: { detail_scraped: true } },
          { $group: { _id: null, total: { $sum: "$contract_value_num" } } },
        ]).toArray().then(r => r[0]?.total || 0),
      ])
      return NextResponse.json({
        total, enriched, pending: total - enriched - failed, failed,
        pct_enriched: total ? Math.round((enriched / total) * 100) : 0,
        total_gmv: totalValue, enriched_gmv: enrichedValue,
      })
    }

    // ── Top sellers by GMV ────────────────────────────────────────────────────
    if (section === "sellers_by_gmv") {
      const limit = parseInt(sp.get("limit") || "20")
      const rows  = await gc.aggregate([
        { $match: { seller_name_canonical: { $nin: [null, ""] } } },
        { $group: {
            _id:            "$seller_name_canonical",
            gmv:            { $sum: "$contract_value_num" },
            count:          { $sum: 1 },
            gstin:          { $first: "$seller_gst" },
            seller_state:   { $first: "$seller_state" },
            msme:           { $first: "$seller_msme_category" },
            last_contract:  { $max: "$contract_date_dt" },
        }},
        { $sort: { gmv: -1 } },
        { $limit: limit },
      ]).toArray()
      return NextResponse.json({ rows })
    }

    // ── Top sellers by contract count ─────────────────────────────────────────
    if (section === "sellers_by_count") {
      const limit = parseInt(sp.get("limit") || "20")
      const rows  = await gc.aggregate([
        { $match: { seller_name_canonical: { $nin: [null, ""] } } },
        { $group: {
            _id:   "$seller_name_canonical",
            count: { $sum: 1 },
            gmv:   { $sum: "$contract_value_num" },
            gstin: { $first: "$seller_gst" },
        }},
        { $sort: { count: -1 } },
        { $limit: limit },
      ]).toArray()
      return NextResponse.json({ rows })
    }

    // ── New sellers — present in gem_contracts but not in gem_dealers ─────────
    if (section === "new_sellers") {
      const limit       = parseInt(sp.get("limit") || "30")
      const dealerNames = await db.collection("gem_dealers")
        .distinct("canonical_name")
        .then(r => new Set(r.map((n: string) => n.toUpperCase())))

      const rows = await gc.aggregate([
        { $match: { seller_name_canonical: { $nin: [null, ""] }, detail_scraped: true } },
        { $group: {
            _id:   "$seller_name_canonical",
            gmv:   { $sum: "$contract_value_num" },
            count: { $sum: 1 },
            gstin: { $first: "$seller_gst" },
            state: { $first: "$seller_state" },
        }},
        { $sort: { gmv: -1 } },
        { $limit: limit * 3 },   // over-fetch, filter locally
      ]).toArray()

      type AggRow = { _id: string; gmv: number; count: number; gstin?: string; state?: string }
      const newSellers = (rows as AggRow[])
        .filter(r => !dealerNames.has(r._id))
        .slice(0, limit)
      return NextResponse.json({ rows: newSellers })
    }

    // ── Top departments by spend ───────────────────────────────────────────────
    if (section === "depts_by_spend") {
      const limit = parseInt(sp.get("limit") || "20")
      const rows  = await gc.aggregate([
        { $match: { dept_name: { $nin: [null, ""] } } },
        { $group: {
            _id:      "$dept_name",
            gmv:      { $sum: "$contract_value_num" },
            count:    { $sum: 1 },
            ministry: { $first: "$ministry" },
        }},
        { $sort: { gmv: -1 } },
        { $limit: limit },
      ]).toArray()
      return NextResponse.json({ rows })
    }

    // ── Top products by spend ─────────────────────────────────────────────────
    if (section === "products_by_spend") {
      const limit = parseInt(sp.get("limit") || "20")
      const rows  = await gc.aggregate([
        { $match: { product_name: { $nin: [null, ""] } } },
        { $group: {
            _id:   "$product_name",
            gmv:   { $sum: "$contract_value_num" },
            count: { $sum: 1 },
        }},
        { $sort: { gmv: -1 } },
        { $limit: limit },
      ]).toArray()
      return NextResponse.json({ rows })
    }

    // ── Top states by spend ───────────────────────────────────────────────────
    if (section === "states_by_spend") {
      const rows = await gc.aggregate([
        { $match: { state: { $nin: [null, ""] } } },
        { $group: {
            _id:   "$state",
            gmv:   { $sum: "$contract_value_num" },
            count: { $sum: 1 },
        }},
        { $sort: { gmv: -1 } },
      ]).toArray()
      return NextResponse.json({ rows })
    }

    // ── Seller profile ────────────────────────────────────────────────────────
    if (section === "seller_profile") {
      const name = sp.get("name")
      if (!name) return NextResponse.json({ error: "name required" }, { status: 400 })

      const contracts = await gc
        .find({ seller_name_canonical: name.toUpperCase() })
        .sort({ contract_value_num: -1 })
        .limit(50)
        .toArray()

      const gmv       = contracts.reduce((s, r) => s + (r.contract_value_num || 0), 0)
      const depts     = [...new Set(contracts.map(r => r.dept_name).filter(Boolean))]
      const states    = [...new Set(contracts.map(r => r.state).filter(Boolean))]
      const products  = [...new Set(contracts.map(r => r.product_name).filter(Boolean))]
      const firstSeen = contracts.reduce((min, r) => r.first_seen < min ? r.first_seen : min, contracts[0]?.first_seen)

      const dealer = await db.collection("gem_dealers")
        .findOne({ canonical_name: new RegExp(`^${name}$`, "i") })

      return NextResponse.json({
        name,
        gmv, count: contracts.length,
        gstin: contracts[0]?.seller_gst,
        msme:  contracts[0]?.seller_msme_category,
        state: contracts[0]?.seller_state,
        departments: depts, states, products,
        first_seen: firstSeen,
        in_gem_dealers: !!dealer,
        bid_wins: dealer?.l1_wins || 0,
        contracts: contracts.slice(0, 20),
      })
    }

    // ── Department profile ────────────────────────────────────────────────────
    if (section === "dept_profile") {
      const name = sp.get("name")
      if (!name) return NextResponse.json({ error: "name required" }, { status: 400 })

      const contracts = await gc
        .find({ dept_name: name })
        .sort({ contract_value_num: -1 })
        .limit(50)
        .toArray()

      const gmv      = contracts.reduce((s, r) => s + (r.contract_value_num || 0), 0)
      const sellers  = [...new Set(contracts.map(r => r.seller_name_canonical).filter(Boolean))]
      const products = [...new Set(contracts.map(r => r.product_name).filter(Boolean))]

      return NextResponse.json({
        name,
        gmv, count: contracts.length,
        ministry:  contracts[0]?.ministry,
        sellers, products,
        contracts: contracts.slice(0, 20),
      })
    }

    // ── Product profile ───────────────────────────────────────────────────────
    if (section === "product_profile") {
      const name = sp.get("name")
      if (!name) return NextResponse.json({ error: "name required" }, { status: 400 })

      const contracts = await gc
        .find({ product_name: name })
        .sort({ contract_value_num: -1 })
        .limit(50)
        .toArray()

      const gmv     = contracts.reduce((s, r) => s + (r.contract_value_num || 0), 0)
      const sellers = [...new Set(contracts.map(r => r.seller_name_canonical).filter(Boolean))]
      const depts   = [...new Set(contracts.map(r => r.dept_name).filter(Boolean))]
      const prices  = contracts.map(r => r.unit_rate).filter(Boolean) as number[]
      const avgPrice = prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : null

      return NextResponse.json({
        name, gmv, count: contracts.length,
        avg_unit_price: avgPrice,
        min_price: prices.length ? Math.min(...prices) : null,
        max_price: prices.length ? Math.max(...prices) : null,
        sellers, departments: depts,
        contracts: contracts.slice(0, 20),
      })
    }

    return NextResponse.json({ error: `Unknown section: ${section}` }, { status: 400 })

  } catch (err) {
    console.error("contracts intelligence error:", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
