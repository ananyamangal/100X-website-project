import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import {
  HOMEPAGE_SECTIONS,
  PRODUCT_SECTIONS,
  PageSectionRecord,
  resolveSections,
  toSectionMap,
} from "@/lib/pageSections"

export const revalidate = 60

// GET /api/page-sections?pageKey=homepage
// Public ISR endpoint — read by HomePageClient and ProductDetailClient
export async function GET(req: NextRequest) {
  const pageKey = req.nextUrl.searchParams.get("pageKey") ?? "homepage"

  try {
    const client = await clientPromise
    const db = client.db()
    const records = await db
      .collection<PageSectionRecord>("page_sections")
      .find({ pageKey })
      .toArray()

    const serialised = records.map(r => ({
      ...r,
      _id: r._id?.toString(),
    }))

    const defs = pageKey === "homepage" ? HOMEPAGE_SECTIONS : PRODUCT_SECTIONS
    const resolved = resolveSections(defs, serialised as PageSectionRecord[])
    const map = toSectionMap(resolved)

    return NextResponse.json({ resolved, map }, {
      headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=300" },
    })
  } catch (err) {
    console.error("GET /api/page-sections error", err)
    // On error, fall back to pure defaults — never break the page
    const defs = pageKey === "homepage" ? HOMEPAGE_SECTIONS : PRODUCT_SECTIONS
    const resolved = resolveSections(defs, [])
    const map = toSectionMap(resolved)
    return NextResponse.json({ resolved, map })
  }
}
