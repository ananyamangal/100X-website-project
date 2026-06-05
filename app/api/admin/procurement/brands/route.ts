import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export async function GET() {
  try {
    const db = (await clientPromise).db()

    const [l1Agg, storedBrands] = await Promise.all([
      db.collection("bid_lifecycle").aggregate([
        { $match: { l1_oem_brand: { $nin: [null, ""] } } },
        {
          $group: {
            _id: "$l1_oem_brand",
            l1_wins: { $sum: 1 },
            states: { $addToSet: "$state" },
            departments: { $addToSet: "$department_name" },
            total_l1_value: { $sum: "$l1_price_inr" },
          },
        },
        { $sort: { l1_wins: -1 } },
      ]).toArray(),
      db.collection("proc_brand_profiles").find({}).toArray(),
    ])

    const storedMap = new Map(storedBrands.map((b) => [b.brand_name, b]))

    const brands = l1Agg.map((b) => {
      const stored = storedMap.get(b._id)
      return {
        brand_name: b._id as string,
        l1_wins: b.l1_wins as number,
        states: (b.states as string[]).filter(Boolean).sort(),
        departments_count: (b.departments as string[]).filter(Boolean).length,
        total_l1_value: (b.total_l1_value as number) || 0,
        is_competitor: stored?.is_competitor ?? true,
        is_100x: stored?.is_100x ?? false,
        country_of_origin: stored?.country_of_origin || "",
        notes: stored?.notes || "",
      }
    })

    // Brands in proc_brand_profiles not yet seen in any bid
    const bidBrandNames = new Set(brands.map((b) => b.brand_name))
    for (const s of storedBrands) {
      if (!bidBrandNames.has(s.brand_name)) {
        brands.push({
          brand_name: s.brand_name,
          l1_wins: 0,
          states: [],
          departments_count: 0,
          total_l1_value: 0,
          is_competitor: s.is_competitor ?? true,
          is_100x: s.is_100x ?? false,
          country_of_origin: s.country_of_origin || "",
          notes: s.notes || "",
        })
      }
    }

    return NextResponse.json(JSON.parse(JSON.stringify({ brands })))
  } catch (err) {
    console.error("procurement/brands GET error:", err)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (!body.brand_name)
      return NextResponse.json({ error: "brand_name required" }, { status: 400 })

    const db = (await clientPromise).db()
    const now = new Date()

    const doc = { ...body, updated_at: now }
    delete doc._id

    const result = await db.collection("proc_brand_profiles").updateOne(
      { brand_name: body.brand_name },
      { $set: doc, $setOnInsert: { created_at: now } },
      { upsert: true }
    )

    return NextResponse.json({ ok: true, upserted: result.upsertedCount > 0 })
  } catch (err) {
    console.error("procurement/brands POST error:", err)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
