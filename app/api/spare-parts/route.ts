import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

// Cache spare-parts listing for 2 minutes at the CDN edge.
export const revalidate = 120

// GET /api/spare-parts — public listing
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const product = searchParams.get("product")       // filter by compatibleProducts ID
  const category = searchParams.get("category")

  const filter: Record<string, any> = { isPublished: true }
  if (product) filter.compatibleProducts = product
  if (category) filter.category = category

  const client = await clientPromise
  const parts = await client
    .db()
    .collection("spare_parts")
    .find(filter)
    .sort({ order: 1, name: 1 })
    .toArray()

  return NextResponse.json(JSON.parse(JSON.stringify(parts)))
}
