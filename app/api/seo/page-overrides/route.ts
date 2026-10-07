/**
 * GET /api/seo/page-overrides?path=/products/thermal-fogger
 * PUBLIC endpoint — returns active schema and link overrides for a page path.
 * Used by SeoSchemaOverrideInjector (client component in layout.tsx).
 *
 * Only schema_additions and link_injections are exposed — never meta_title or
 * meta_description (those are server-side concerns, not exposed to public clients).
 */
import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const path = searchParams.get("path") || ""

  if (!path || !path.startsWith("/")) {
    return NextResponse.json({ schema_additions: [], link_injections: [] })
  }

  try {
    const db = (await clientPromise).db()
    const override = await db.collection("seo_page_overrides").findOne(
      { path, active: true },
      { projection: { schema_additions: 1, link_injections: 1 } }
    )

    return NextResponse.json({
      schema_additions: (override?.schema_additions as object[]) ?? [],
      link_injections: (override?.link_injections as object[]) ?? [],
    }, {
      headers: {
        // Fetched by every public page view (one request per path). s-maxage lets
        // the CDN answer repeats for 5 min without invoking this function;
        // stale-while-revalidate keeps serving while a refresh runs.
        "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=3600",
      },
    })
  } catch {
    return NextResponse.json({ schema_additions: [], link_injections: [] })
  }
}
