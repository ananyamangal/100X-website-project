import { NextRequest, NextResponse } from "next/server"
import { getProductBySlugOrId } from "@/lib/productsQuery"
import { isObjectId } from "@/lib/productSlug"

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") || ""
  try {
    const isOid = isObjectId(id)
    const result = await getProductBySlugOrId(id)
    return NextResponse.json({
      input: id,
      isObjectId: isOid,
      found: !!result,
      resolvedBy: result?.resolvedBy ?? null,
      slug: result?.product?.slug ?? null,
      name: result?.product?.name ?? null,
      _id: result?.product?._id ? String(result.product._id) : null,
    })
  } catch (err) {
    return NextResponse.json({ input: id, error: String(err) }, { status: 500 })
  }
}
