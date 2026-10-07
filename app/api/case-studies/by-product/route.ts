import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export const revalidate = 300

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

  // Reading the query string makes this handler dynamic (the `revalidate`
  // export is ignored); the CDN header caches each ?productId=… answer instead.
  return NextResponse.json(JSON.parse(JSON.stringify(studies)), {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  })
}
