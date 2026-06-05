import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export async function GET() {
  try {
    const db = (await clientPromise).db()

    // Aggregate L1 wins per dealer name from bid_lifecycle
    const [l1Agg, l2Agg, l3Agg, manualDealers] = await Promise.all([
      db.collection("bid_lifecycle").aggregate([
        { $match: { l1_dealer_name: { $nin: [null, ""] } } },
        {
          $group: {
            _id: "$l1_dealer_name",
            l1_wins: { $sum: 1 },
            l1_value: { $sum: "$l1_price_inr" },
            states: { $addToSet: "$state" },
            oems: { $addToSet: "$l1_oem_brand" },
            departments: { $addToSet: "$department_name" },
            last_win: { $max: "$award_date" },
          },
        },
      ]).toArray(),

      db.collection("bid_lifecycle").aggregate([
        { $match: { l2_dealer_name: { $nin: [null, ""] } } },
        { $group: { _id: "$l2_dealer_name", l2_appearances: { $sum: 1 } } },
      ]).toArray(),

      db.collection("bid_lifecycle").aggregate([
        { $match: { l3_dealer_name: { $nin: [null, ""] } } },
        { $group: { _id: "$l3_dealer_name", l3_appearances: { $sum: 1 } } },
      ]).toArray(),

      db.collection("proc_dealers").find({}).toArray(),
    ])

    // Build lookup maps
    const l2Map: Record<string, number> = {}
    for (const r of l2Agg) if (r._id) l2Map[r._id] = r.l2_appearances

    const l3Map: Record<string, number> = {}
    for (const r of l3Agg) if (r._id) l3Map[r._id] = r.l3_appearances

    const manualMap = new Map(manualDealers.map((d) => [d.canonical_name, d]))

    // Build derived dealer list from bid data
    const dealers = l1Agg.map((d) => {
      const name: string = d._id
      const l1 = d.l1_wins as number
      const l2 = l2Map[name] || 0
      const l3 = l3Map[name] || 0
      const total = l1 + l2 + l3
      const manual = manualMap.get(name)
      return {
        name,
        l1_wins: l1,
        l2_appearances: l2,
        l3_appearances: l3,
        total_participations: total,
        win_rate_pct: total > 0 ? Math.round((l1 / total) * 100) : 100,
        l1_value_inr: d.l1_value || 0,
        states: (d.states as string[]).filter(Boolean).sort(),
        known_oems: (d.oems as string[]).filter(Boolean).filter(s => s !== ""),
        departments_count: (d.departments as string[]).filter(Boolean).length,
        last_win: d.last_win || null,
        // Enrich from manual record if present
        is_100x_dealer: manual?.is_100x_dealer ?? false,
        gstin: manual?.gstin || "",
        phone: manual?.phone || "",
        email: manual?.email || "",
        notes: manual?.notes || "",
      }
    }).sort((a, b) => b.l1_wins - a.l1_wins)

    // Dealers only in proc_dealers (not yet seen in bids)
    const bidDealerNames = new Set(dealers.map((d) => d.name))
    const manualOnly = manualDealers
      .filter((m) => !bidDealerNames.has(m.canonical_name))
      .map((m) => ({
        name: m.canonical_name,
        l1_wins: 0,
        l2_appearances: 0,
        l3_appearances: 0,
        total_participations: 0,
        win_rate_pct: 0,
        l1_value_inr: 0,
        states: [],
        known_oems: m.known_oems || [],
        departments_count: 0,
        last_win: null,
        is_100x_dealer: m.is_100x_dealer ?? false,
        gstin: m.gstin || "",
        phone: m.phone || "",
        email: m.email || "",
        notes: m.notes || "",
      }))

    return NextResponse.json(
      JSON.parse(JSON.stringify({ dealers: [...dealers, ...manualOnly] }))
    )
  } catch (err) {
    console.error("procurement/dealers GET error:", err)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (!body.canonical_name)
      return NextResponse.json({ error: "canonical_name required" }, { status: 400 })

    const db = (await clientPromise).db()
    const now = new Date()

    const doc = { ...body, updated_at: now }
    delete doc._id

    const result = await db.collection("proc_dealers").updateOne(
      { canonical_name: body.canonical_name },
      { $set: doc, $setOnInsert: { created_at: now } },
      { upsert: true }
    )

    return NextResponse.json({ ok: true, upserted: result.upsertedCount > 0 })
  } catch (err) {
    console.error("procurement/dealers POST error:", err)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
