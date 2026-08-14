/**
 * GET /api/redirects/active
 *
 * Lightweight read-only endpoint polled by middleware.ts to refresh its
 * in-memory redirect cache (see the cache comment above middleware()).
 * No auth required — returns only public routing information (redirect
 * source/destination paths, and the set of published product slugs used
 * for the /products/ prefix auto-fallback), the same trust level as
 * sitemap.xml or /api/product-slug.
 */
import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const client = await clientPromise
    const db = client.db()
    const [redirects, products] = await Promise.all([
      db
        .collection("url_redirects")
        .find({ active: true })
        .project({ sourcePath: 1, destinationPath: 1, redirectType: 1, _id: 0 })
        .toArray(),
      db
        .collection("products")
        .find({ isPublished: { $ne: false }, slug: { $exists: true, $ne: "" } })
        .project({ slug: 1, _id: 0 })
        .toArray(),
    ])

    return NextResponse.json(
      {
        redirects: redirects.map((r) => ({
          source: r.sourcePath,
          destination: r.destinationPath,
          type: r.redirectType === 302 ? 302 : 301,
        })),
        productSlugs: products.map((p) => p.slug).filter(Boolean),
      },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch (error) {
    console.error("Error building active-redirects cache payload:", error)
    return NextResponse.json({ redirects: [], productSlugs: [] }, { status: 500 })
  }
}
