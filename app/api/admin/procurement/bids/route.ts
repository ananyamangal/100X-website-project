import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const state    = searchParams.get("state")    || ""
    const status   = searchParams.get("status")   || ""
    const category = searchParams.get("category") || ""
    const search   = searchParams.get("search")   || ""
    const limit    = Math.min(parseInt(searchParams.get("limit") || "100"), 500)
    const skip     = parseInt(searchParams.get("skip") || "0")

    const db = (await clientPromise).db()
    const query: Record<string, unknown> = {}

    if (state)    query.state = state
    if (status)   query.current_status = status
    if (category) query.product_category = category
    if (search) {
      query.$or = [
        { bid_number:      { $regex: search, $options: "i" } },
        { department_name: { $regex: search, $options: "i" } },
        { l1_dealer_name:  { $regex: search, $options: "i" } },
        { l1_oem_brand:    { $regex: search, $options: "i" } },
        { state:           { $regex: search, $options: "i" } },
      ]
    }

    const [bids, total] = await Promise.all([
      db.collection("bid_lifecycle")
        .find(query)
        .sort({ publish_date: -1, created_at: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection("bid_lifecycle").countDocuments(query),
    ])

    // Pull distinct filter values for dropdowns (unfiltered)
    const [states, statuses, categories] = await Promise.all([
      db.collection("bid_lifecycle").distinct("state"),
      db.collection("bid_lifecycle").distinct("current_status"),
      db.collection("bid_lifecycle").distinct("product_category"),
    ])

    return NextResponse.json(
      JSON.parse(
        JSON.stringify({
          bids,
          total,
          limit,
          skip,
          filters: {
            states:     states.filter(Boolean).sort(),
            statuses:   statuses.filter(Boolean).sort(),
            categories: categories.filter(Boolean).sort(),
          },
        })
      )
    )
  } catch (err) {
    console.error("procurement/bids GET error:", err)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (!body.bid_number)
      return NextResponse.json({ error: "bid_number required" }, { status: 400 })

    const db = (await clientPromise).db()
    const now = new Date()

    const doc: Record<string, unknown> = { ...body, updated_at: now }
    delete doc._id
    for (const dateField of ["publish_date", "bid_end_date", "award_date"]) {
      if (doc[dateField]) doc[dateField] = new Date(doc[dateField] as string)
    }

    const result = await db.collection("bid_lifecycle").updateOne(
      { bid_number: body.bid_number },
      { $set: doc, $setOnInsert: { created_at: now } },
      { upsert: true }
    )

    return NextResponse.json({ ok: true, upserted: result.upsertedCount > 0 })
  } catch (err) {
    console.error("procurement/bids POST error:", err)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
