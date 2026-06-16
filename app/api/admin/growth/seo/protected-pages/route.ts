/**
 * GET  /api/admin/growth/seo/protected-pages     — list all protected pages
 * POST /api/admin/growth/seo/protected-pages     — auto-classify + add manual entries
 *
 * Protected pages always require Founder approval regardless of risk score.
 * Auto-classification: homepage, top-20 landing pages, pages with backlinks, lead pages.
 */
import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { requireAuth } from "@/lib/rbac/server"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const db = (await clientPromise).db()
  const pages = await db.collection("seo_protected_pages")
    .find({})
    .sort({ clicks_28d: -1 })
    .toArray()

  return NextResponse.json({
    pages: pages.map(p => ({ ...p, _id: String(p._id) })),
    total: pages.length,
  })
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => ({}))
  const db = (await clientPromise).db()
  const now = new Date().toISOString()

  // Manual entry mode
  if (body.path && body.manual) {
    await db.collection("seo_protected_pages").updateOne(
      { path: body.path },
      { $set: { path: body.path, reason: "manual", note: body.note || "", always_require_founder: true, classified_at: now } },
      { upsert: true }
    )
    return NextResponse.json({ ok: true, mode: "manual", path: body.path })
  }

  // Auto-classification mode
  const [gscPages, backlinkPages] = await Promise.all([
    // Top 20 landing pages by clicks
    db.collection("gsc_query_rows")
      .aggregate([
        { $group: { _id: "$pagePath", clicks: { $sum: "$clicks" }, impressions: { $sum: "$impressions" } } },
        { $sort: { clicks: -1 } },
        { $limit: 20 },
      ])
      .toArray(),
    // Pages with backlinks
    db.collection("seo_page_risk_scores")
      .find({ backlink_count: { $gt: 0 } })
      .toArray(),
  ])

  const ops: Promise<unknown>[] = []

  // Homepage always protected
  ops.push(db.collection("seo_protected_pages").updateOne(
    { path: "/" },
    { $set: { path: "/", reason: "homepage", always_require_founder: true, classified_at: now } },
    { upsert: true }
  ))

  // Top traffic pages
  for (const page of gscPages) {
    const path = page._id as string
    if (!path) continue
    ops.push(db.collection("seo_protected_pages").updateOne(
      { path },
      { $set: { path, reason: "top_traffic", clicks_28d: page.clicks, always_require_founder: true, classified_at: now } },
      { upsert: true }
    ))
  }

  // Pages with backlinks
  for (const page of backlinkPages) {
    ops.push(db.collection("seo_protected_pages").updateOne(
      { path: page.path },
      { $set: { path: page.path, reason: "has_backlinks", backlink_count: page.backlink_count, referring_domains: page.referring_domains, always_require_founder: true, classified_at: now } },
      { upsert: true }
    ))
  }

  await Promise.all(ops)

  const total = await db.collection("seo_protected_pages").countDocuments({})
  return NextResponse.json({
    ok: true,
    classified: ops.length,
    total,
    message: `Classified ${ops.length} pages as protected (${total} total protected pages)`,
  })
}
