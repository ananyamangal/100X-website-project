import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { requireAuth } from "@/lib/rbac/server"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const db = (await clientPromise).db()

  const [
    backlinksByStatus,
    citationsByStatus,
    outreachByStatus,
    gemByType,
    recoveryOpen,
    partnerActive,
    authorityLatest,
    recentActivity,
    prByStatus,
  ] = await Promise.all([
    db.collection("seo_backlinks").aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]).toArray(),
    db.collection("seo_citations").aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]).toArray(),
    db.collection("seo_outreach").aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]).toArray(),
    db.collection("seo_gem_authority").aggregate([
      { $group: { _id: "$type", count: { $sum: 1 }, active: { $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } } } },
    ]).toArray(),
    db.collection("seo_link_recovery").countDocuments({ status: { $in: ["detected", "in_recovery"] } }),
    db.collection("seo_partnerships").countDocuments({ status: "active" }),
    db.collection("seo_authority_snapshots").findOne({}, { sort: { created_at: -1 } }),
    db.collection("seo_offpage_audit_log").find({}).sort({ created_at: -1 }).limit(15).toArray(),
    db.collection("seo_pr_opportunities").aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]).toArray(),
  ])

  // Aggregate backlink funnel
  const blMap: Record<string, number> = {}
  for (const s of backlinksByStatus) blMap[String(s._id)] = Number(s.count)

  const acquired = (blMap["acquired"] ?? 0) + (blMap["verified"] ?? 0) + (blMap["impact_measured"] ?? 0)

  return NextResponse.json({
    backlinks: {
      total: Object.values(blMap).reduce((a, b) => a + b, 0),
      by_status: blMap,
      acquired,
      in_progress: (blMap["outreach_sent"] ?? 0) + (blMap["follow_up"] ?? 0),
      pending_approval: blMap["recommended"] ?? 0,
    },
    citations: {
      total: citationsByStatus.reduce((a, b) => a + Number(b.count), 0),
      verified: citationsByStatus.find(s => s._id === "verified")?.count ?? 0,
      by_status: Object.fromEntries(citationsByStatus.map(s => [String(s._id), Number(s.count)])),
    },
    outreach: {
      total: outreachByStatus.reduce((a, b) => a + Number(b.count), 0),
      pending_approval: outreachByStatus.find(s => s._id === "draft")?.count ?? 0,
      won: outreachByStatus.find(s => s._id === "won")?.count ?? 0,
      by_status: Object.fromEntries(outreachByStatus.map(s => [String(s._id), Number(s.count)])),
    },
    gem_authority: {
      by_type: gemByType.map(g => ({ type: String(g._id), total: Number(g.count), active: Number(g.active) })),
      total: gemByType.reduce((a, b) => a + Number(b.count), 0),
      active: gemByType.reduce((a, b) => a + Number(b.active), 0),
    },
    link_recovery: { open: recoveryOpen },
    partnerships: { active: partnerActive },
    pr_opportunities: {
      total: prByStatus.reduce((a, b) => a + Number(b.count), 0),
      by_status: Object.fromEntries(prByStatus.map(s => [String(s._id), Number(s.count)])),
    },
    authority_score: authorityLatest ? {
      score: authorityLatest.authority_score,
      delta: authorityLatest.delta,
      referring_domains: authorityLatest.referring_domains,
      acquired_backlinks: authorityLatest.acquired_backlinks,
      scored_at: authorityLatest.created_at,
    } : null,
    recent_activity: recentActivity.map(a => ({ ...a, _id: String(a._id) })),
  })
}
