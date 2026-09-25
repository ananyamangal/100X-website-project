import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { PUBLIC_API_FIELDS, pickPublic, projectionFor } from "@/lib/govPastPerformancePublic"

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

    // Public endpoint: return only the allow-listed card fields, never the whole
    // document (notes, documents, orderValue are internal).
    const docs = await db
      .collection("gov_past_performance")
      .find(filter, { projection: projectionFor(PUBLIC_API_FIELDS) })
      .sort({ orderYear: -1, createdAt: -1 })
      .limit(limit)
      .toArray()

    return NextResponse.json(docs.map((d) => pickPublic(d, PUBLIC_API_FIELDS)))
  } catch {
    return NextResponse.json([], { status: 500 })
  }
}
