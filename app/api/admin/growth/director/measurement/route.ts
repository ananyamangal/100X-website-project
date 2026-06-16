/**
 * GET /api/admin/growth/director/measurement
 * Returns aggregate outcome metrics for the Revenue Director learning loop.
 */
import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { requireAuth } from "@/lib/rbac/server"

export const dynamic = "force-dynamic"

const APPROVED_STATUSES = ["approved", "applied", "in_progress", "completed", "won", "lost"]
const COMPLETED_STATUSES = ["completed", "won", "lost"]

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const db = (await clientPromise).db()
  const recs = db.collection("director_recommendations")
  const packs = db.collection("director_execution_packs")

  const [
    totalGenerated,
    totalApproved,
    totalInProgress,
    totalCompleted,
    totalWon,
    totalLost,
    totalRejected,
    totalDeferred,
    totalPacks,
    impactAgg,
    realizedAgg,
  ] = await Promise.all([
    recs.countDocuments(),
    recs.countDocuments({ status: { $in: APPROVED_STATUSES } }),
    recs.countDocuments({ status: "in_progress" }),
    recs.countDocuments({ status: { $in: COMPLETED_STATUSES } }),
    recs.countDocuments({ status: "won" }),
    recs.countDocuments({ status: "lost" }),
    recs.countDocuments({ status: "rejected" }),
    recs.countDocuments({ status: "deferred" }),
    packs.countDocuments(),
    // Sum estimated impact for all approved recs
    recs.aggregate([
      { $match: { status: { $in: APPROVED_STATUSES } } },
      { $group: { _id: null, total: { $sum: "$expected_revenue_impact" } } },
    ]).toArray(),
    // Sum realized impact for won recs
    recs.aggregate([
      { $match: { status: "won", realized_impact: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: "$realized_impact" } } },
    ]).toArray(),
  ])

  const estimatedImpactTotal = Number(impactAgg[0]?.total || 0)
  const realizedImpactTotal = Number(realizedAgg[0]?.total || 0)

  const approvalRate = totalGenerated > 0
    ? Math.round((totalApproved / totalGenerated) * 100)
    : 0

  const completionRate = totalApproved > 0
    ? Math.round((totalCompleted / totalApproved) * 100)
    : 0

  const winLossTotal = totalWon + totalLost
  const winRate = winLossTotal > 0
    ? Math.round((totalWon / winLossTotal) * 100)
    : 0

  const impactRealizationRate = estimatedImpactTotal > 0
    ? Math.round((realizedImpactTotal / estimatedImpactTotal) * 100)
    : 0

  return NextResponse.json({
    total_generated: totalGenerated,
    total_approved: totalApproved,
    total_in_progress: totalInProgress,
    total_completed: totalCompleted,
    total_won: totalWon,
    total_lost: totalLost,
    total_rejected: totalRejected,
    total_deferred: totalDeferred,
    approval_rate_pct: approvalRate,
    completion_rate_pct: completionRate,
    win_rate_pct: winRate,
    estimated_impact_total: estimatedImpactTotal,
    realized_impact_total: realizedImpactTotal,
    impact_realization_rate_pct: impactRealizationRate,
    packs_generated: totalPacks,
  })
}
