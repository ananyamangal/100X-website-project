import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { requirePermission } from "@/lib/rbac/server"
import { getAllLandingPages } from "@/lib/seo/landing-pages"
import { SITE_URL } from "@/lib/seo/site-config"

export const dynamic = "force-dynamic"

// GET /api/admin/landing-pages/metrics
// Returns GSC impressions/clicks/position for each landing page.
// Reads only — no writes. Requires landing_pages.view permission.
export async function GET(request: Request) {
  const auth = await requirePermission(request as any, "landing_pages.view")
  if (auth instanceof NextResponse) return auth

  try {
    const client = await clientPromise
    const db = client.db()

    const pages = getAllLandingPages()
    const fullUrls = pages.map(p => `${SITE_URL}/${p.slug}`)

    // Find the most recent sync date for "current" period GSC page rows
    const latestSync = await db
      .collection("gsc_page_rows")
      .findOne({ period: "current" }, { sort: { syncDate: -1 }, projection: { syncDate: 1 } })

    const syncDate = latestSync?.syncDate ?? null

    // Query GSC page rows for the latest sync
    const gscRows = syncDate
      ? await db
          .collection("gsc_page_rows")
          .find({ period: "current", syncDate, page: { $in: fullUrls } })
          .project({ page: 1, clicks: 1, impressions: 1, ctr: 1, position: 1, _id: 0 })
          .toArray()
      : []

    // Index GSC rows by slug
    const gscBySlug: Record<string, { clicks: number; impressions: number; ctr: number; position: number }> = {}
    for (const row of gscRows) {
      const url: string = row.page ?? ""
      // Extract slug from full URL: "https://www.100xcircle.com/my-slug" → "my-slug"
      const slug = url.replace(/^https?:\/\/[^/]+\//, "")
      if (slug) {
        gscBySlug[slug] = {
          clicks: row.clicks ?? 0,
          impressions: row.impressions ?? 0,
          ctr: row.ctr ?? 0,
          position: row.position ?? 0,
        }
      }
    }

    // Leads: not yet trackable without landingSlug field in submissions.
    // Will be wired in Stage B when the form adds slug attribution.
    const result: Record<string, {
      impressions: number | null
      clicks: number | null
      position: number | null
      ctr: number | null
      leads: number | null
      syncDate: string | null
      available: boolean
    }> = {}

    for (const p of pages) {
      const gsc = gscBySlug[p.slug]
      result[p.slug] = {
        impressions: gsc?.impressions ?? null,
        clicks: gsc?.clicks ?? null,
        position: gsc ? Math.round(gsc.position * 10) / 10 : null,
        ctr: gsc ? Math.round(gsc.ctr * 10000) / 100 : null,
        leads: null,
        syncDate,
        available: !!gsc,
      }
    }

    return NextResponse.json({ ok: true, metrics: result, syncDate })
  } catch (err) {
    console.error("landing-pages/metrics GET error:", err)
    return NextResponse.json({ ok: false, error: "Failed to load metrics" }, { status: 500 })
  }
}
