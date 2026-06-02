import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

// GET /api/case-studies/by-product?productId=xxx
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const productId = searchParams.get("productId")
  if (!productId) return NextResponse.json([])

  const client = await clientPromise
  const studies = await client
    .db()
    .collection("case_studies")
    .find({
      published: true,
      linkedProductIds: productId,
    })
    .sort({ createdAt: -1 })
    .toArray()

  return NextResponse.json(JSON.parse(JSON.stringify(studies)))
}
