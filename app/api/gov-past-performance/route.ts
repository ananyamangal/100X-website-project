import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const state = searchParams.get("state")
    const category = searchParams.get("category")
    const year = searchParams.get("year")
    const search = searchParams.get("search")
    const limit = parseInt(searchParams.get("limit") || "100")

    const client = await clientPromise
    const db = client.db()

    const filter: Record<string, any> = { isPublic: true }
    if (state) filter.state = state
    if (category) filter.category = category
    if (year) filter.orderYear = parseInt(year)
    if (search) {
      filter.$or = [
        { organization: { $regex: search, $options: "i" } },
        { department: { $regex: search, $options: "i" } },
        { state: { $regex: search, $options: "i" } },
        { product: { $regex: search, $options: "i" } },
      ]
    }

    const docs = await db
      .collection("gov_past_performance")
      .find(filter)
      .sort({ orderYear: -1, createdAt: -1 })
      .limit(limit)
      .toArray()

    return NextResponse.json(docs.map((d) => ({ ...d, _id: String(d._id) })))
  } catch {
    return NextResponse.json([], { status: 500 })
  }
}
