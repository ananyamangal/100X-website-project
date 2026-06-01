import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const product = searchParams.get("product")
  const limit = parseInt(searchParams.get("limit") || "20", 10)

  const filter: Record<string, any> = { isPublished: true }
  if (product) filter.product = product

  const client = await clientPromise
  const reviews = await client
    .db()
    .collection("reviews")
    .find(filter)
    .sort({ order: 1, createdAt: -1 })
    .limit(limit)
    .toArray()

  return NextResponse.json(JSON.parse(JSON.stringify(reviews)))
}
