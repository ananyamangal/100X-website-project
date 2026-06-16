/**
 * GET  /api/admin/growth/seo/risk-score?path=   — cached risk profile for a page
 * POST /api/admin/growth/seo/risk-score          — compute + cache fresh score
 */
import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { requireAuth } from "@/lib/rbac/server"
import { scorePageRisk } from "@/lib/growth-os/seo-risk-engine"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const path = new URL(req.url).searchParams.get("path") || "/"
  const db = (await clientPromise).db()

  // Try cached first
  const cached = await db.collection("seo_page_risk_scores").findOne({ path }, { sort: { scored_at: -1 } })
  if (cached) {
    return NextResponse.json({ profile: { ...cached, _id: String(cached._id) }, cached: true })
  }

  // Compute inline if no cache
  const profile = await computeRiskProfile(db, path)
  await db.collection("seo_page_risk_scores").updateOne(
    { path },
    { $set: profile },
    { upsert: true }
  )
  return NextResponse.json({ profile, cached: false })
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => ({}))
  const path = body.path || "/"
  const db = (await clientPromise).db()

  const profile = await computeRiskProfile(db, path, {
    backlink_count: Number(body.backlink_count || 0),
    referring_domains: Number(body.referring_domains || 0),
  })

  await db.collection("seo_page_risk_scores").updateOne(
    { path },
    { $set: profile },
    { upsert: true }
  )

  return NextResponse.json({ ok: true, profile })
}

// ── Internal ────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function computeRiskProfile(db: any, path: string, overrides: { backlink_count?: number; referring_domains?: number } = {}) {
  // Query GSC data for this page
  const pageRows = await db.collection("gsc_query_rows")
    .find({
      $or: [
        { page: path },
        { page: { $regex: `^https?://[^/]+${escapeRegex(path)}$` } },
        { pagePath: path },
      ]
    })
    .toArray()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clicks_28d = pageRows.reduce((s: number, r: any) => s + Number(r.clicks || 0), 0)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const impressions_28d = pageRows.reduce((s: number, r: any) => s + Number(r.impressions || 0), 0)
  const avg_position = pageRows.length > 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? pageRows.reduce((s: number, r: any) => s + Number(r.position || 0), 0) / pageRows.length
    : 0
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const top10_keywords = pageRows.filter((r: any) => Number(r.position || 99) <= 10).length

  // Check for manually set backlink data
  const existingScore = await db.collection("seo_page_risk_scores").findOne({ path })
  const backlink_count = overrides.backlink_count ?? (existingScore?.backlink_count || 0)
  const referring_domains = overrides.referring_domains ?? (existingScore?.referring_domains || 0)

  return scorePageRisk({
    path,
    clicks_28d,
    impressions_28d,
    avg_position,
    ranking_keywords: pageRows.length,
    top10_keywords,
    backlink_count,
    referring_domains,
  })
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
