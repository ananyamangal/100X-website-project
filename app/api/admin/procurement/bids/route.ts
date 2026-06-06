import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const keyword  = searchParams.get("keyword")  || ""
    const variant  = searchParams.get("variant")  || ""
    const dept     = searchParams.get("dept")      || ""
    const search   = searchParams.get("search")   || ""
    const limit    = Math.min(parseInt(searchParams.get("limit") || "100"), 500)
    const skip     = parseInt(searchParams.get("skip") || "0")

    const db = (await clientPromise).db()
    const query: Record<string, unknown> = { l1_name: { $ne: null } }

    if (keyword) query.keyword = keyword
    if (variant) query.variant = variant
    if (dept)    query.dept    = { $regex: dept, $options: "i" }
    if (search) {
      query.$or = [
        { bid_number: { $regex: search, $options: "i" } },
        { dept:       { $regex: search, $options: "i" } },
        { l1_name:    { $regex: search, $options: "i" } },
        { l2_name:    { $regex: search, $options: "i" } },
      ]
    }

    const [bids, total] = await Promise.all([
      db.collection("gem_awarded_bids")
        .find(query)
        .sort({ updated_at: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      db.collection("gem_awarded_bids").countDocuments(query),
    ])

    const [keywords, variants, depts] = await Promise.all([
      db.collection("gem_awarded_bids").distinct("keyword"),
      db.collection("gem_awarded_bids").distinct("variant"),
      db.collection("gem_awarded_bids").distinct("dept"),
    ])

    return NextResponse.json(
      JSON.parse(JSON.stringify({
        bids,
        total,
        limit,
        skip,
        filters: {
          keywords: keywords.filter(Boolean).sort(),
          variants: variants.filter(Boolean).sort(),
          depts:    depts.filter(Boolean).sort(),
        },
      }))
    )
  } catch (err) {
    console.error("procurement/bids GET error:", err)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
