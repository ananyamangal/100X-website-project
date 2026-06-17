import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { requireAuth } from "@/lib/rbac/server"

export const dynamic = "force-dynamic"

const SNAP_COLL = "seo_authority_snapshots"

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const db = (await clientPromise).db()

  const [latest, history] = await Promise.all([
    db.collection(SNAP_COLL).findOne({}, { sort: { created_at: -1 } }),
    db.collection(SNAP_COLL).find({}).sort({ created_at: -1 }).limit(36).toArray(), // up to 12 months of weekly snapshots
  ])

  return NextResponse.json({
    latest: latest ? { ...latest, _id: String(latest._id) } : null,
    history: history.map(h => ({ ...h, _id: String(h._id) })),
  })
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const db = (await clientPromise).db()
  const now = new Date().toISOString()

  // Gather live stats from all off-page collections
  const [
    backlinkStats,
    citationVerified,
    gemActive,
    partnerActive,
    prevSnapshot,
  ] = await Promise.all([
    db.collection("seo_backlinks").aggregate([
      { $group: {
        _id: null,
        total: { $sum: 1 },
        acquired: { $sum: { $cond: [{ $in: ["$status", ["acquired", "verified", "impact_measured"]] }, 1, 0] } },
        dofollow: { $sum: { $cond: [{ $and: [{ $in: ["$status", ["acquired", "verified", "impact_measured"]] }, { $eq: ["$is_dofollow", true] }] }, 1, 0] } },
        avg_da:   { $avg: { $cond: [{ $in: ["$status", ["acquired", "verified", "impact_measured"]] }, "$domain_authority", null] } },
        domains:  { $addToSet: { $cond: [{ $in: ["$status", ["acquired", "verified", "impact_measured"]] }, "$domain", null] } },
      }},
    ]).toArray(),
    db.collection("seo_citations").countDocuments({ status: "verified" }),
    db.collection("seo_gem_authority").countDocuments({ status: "active" }),
    db.collection("seo_partnerships").countDocuments({ status: "active", has_existing_link: true }),
    db.collection(SNAP_COLL).findOne({}, { sort: { created_at: -1 } }),
  ])

  const bs = backlinkStats[0] ?? { total: 0, acquired: 0, dofollow: 0, avg_da: 0, domains: [] }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const uniqueDomains = (bs.domains as any[]).filter(Boolean).length
  const avgDA = Number(bs.avg_da || 0)
  const acquired = Number(bs.acquired || 0)
  const dofollow = Number(bs.dofollow || 0)
  const dofollowPct = acquired > 0 ? dofollow / acquired : 0

  // Authority Score formula (0-100):
  // Referring domains (0-35): log scale, 50+ domains = 35pts
  const domainPts = Math.min(35, Math.round((Math.log10(Math.max(1, uniqueDomains)) / Math.log10(50)) * 35))
  // Link quality (0-25): avg DA / 100 * 25
  const qualityPts = Math.min(25, Math.round((avgDA / 100) * 25))
  // Link diversity (0-20): dofollow%, spread across types
  const diversityPts = Math.min(20, Math.round(dofollowPct * 20))
  // Brand authority (0-20): citations + gems + partner links
  const brandRaw = citationVerified + gemActive + partnerActive
  const brandPts = Math.min(20, Math.round(Math.min(1, brandRaw / 20) * 20))

  const authority_score = domainPts + qualityPts + diversityPts + brandPts

  const snapshot = {
    date:             now.slice(0, 10),
    referring_domains: uniqueDomains,
    total_backlinks:   Number(bs.total || 0),
    acquired_backlinks: acquired,
    dofollow_backlinks: dofollow,
    avg_domain_authority: Math.round(avgDA * 10) / 10,
    citations_verified: citationVerified,
    gem_active:        gemActive,
    partner_links:     partnerActive,
    score_breakdown: { domain_pts: domainPts, quality_pts: qualityPts, diversity_pts: diversityPts, brand_pts: brandPts },
    authority_score,
    delta: prevSnapshot ? authority_score - (prevSnapshot.authority_score ?? 0) : 0,
    created_at: now,
  }

  await db.collection(SNAP_COLL).insertOne(snapshot)
  return NextResponse.json({ ok: true, snapshot: { ...snapshot } })
}
