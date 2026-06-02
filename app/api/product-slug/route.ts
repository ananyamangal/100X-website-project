/**
 * GET /api/product-slug?id={objectId}
 *
 * Lightweight read-only endpoint used by edge middleware to resolve
 * a MongoDB ObjectId to its SEO slug for permanent 308 redirects.
 * No auth required — returns only public slug information.
 */
import { NextRequest, NextResponse } from "next/server"
import { getProductBySlugOrId } from "@/lib/productsQuery"
import { isObjectId } from "@/lib/productSlug"

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") || ""
  if (!id || !isObjectId(id)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 })
  }
  try {
    const result = await getProductBySlugOrId(id)
    if (!result) return NextResponse.json({ error: "not_found" }, { status: 404 })
    return NextResponse.json({
      resolvedBy: result.resolvedBy,
      slug: result.product.slug ?? null,
    })
  } catch {
    return NextResponse.json({ error: "error" }, { status: 500 })
  }
}
