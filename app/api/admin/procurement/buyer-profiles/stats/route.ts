import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { requirePermission } from "@/lib/rbac/server"
import { META_SLUG } from "@/lib/gem/buyer-profile-builder"

export const maxDuration = 30

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, "procurement.contracts.view")
  if (!("user" in auth)) return auth

  try {
    const db  = (await clientPromise).db()
    const col = db.collection("buyer_profiles")

    const baseMatch = { buyer_slug: { $ne: META_SLUG } }

    const [
      totalBuyers,
      tierDist,
      stateDist,
      ministryDist,
      spendAgg,
      meta,
      needsReviewCount,
    ] = await Promise.all([
      col.countDocuments(baseMatch),

      col.aggregate([
        { $match: baseMatch },
        { $group: { _id: "$buyer_tier", count: { $sum: 1 }, total_spend: { $sum: "$total_spend" } } },
        { $sort: { _id: 1 } },
      ]).toArray(),

      col.aggregate([
        { $match: { ...baseMatch, state: { $nin: [null, ""] } } },
        { $group: { _id: "$state", count: { $sum: 1 }, total_spend: { $sum: "$total_spend" } } },
        { $sort: { total_spend: -1 } },
        { $limit: 15 },
      ]).toArray(),

      col.aggregate([
        { $match: { ...baseMatch, ministry: { $nin: [null, ""] } } },
        { $group: { _id: "$ministry", count: { $sum: 1 }, total_spend: { $sum: "$total_spend" } } },
        { $sort: { total_spend: -1 } },
        { $limit: 15 },
      ]).toArray(),

      col.aggregate([
        { $match: baseMatch },
        {
          $group: {
            _id:             null,
            total_spend:     { $sum: "$total_spend" },
            total_contracts: { $sum: "$contract_count" },
            avg_contracts:   { $avg: "$contract_count" },
            max_spend:       { $max: "$total_spend"    },
            repeat_buyers:   { $sum: { $cond: [{ $gt: ["$contract_count", 1] }, 1, 0] } },
            with_archive:    { $sum: { $cond: [{ $gt: ["$archive_contract_count", 0] }, 1, 0] } },
          },
        },
      ]).toArray(),

      col.findOne({ buyer_slug: META_SLUG }) as Promise<Record<string, unknown> | null>,

      col.countDocuments({ ...baseMatch, needs_review: true }),
    ])

    const agg = spendAgg[0] || {
      total_spend: 0, total_contracts: 0, avg_contracts: 0,
      max_spend: 0, repeat_buyers: 0, with_archive: 0,
    }

    const lastBuildAt = (meta?.last_incremental_at ?? meta?.last_full_build_at) as Date | null
    let staleCount = 0
    if (lastBuildAt) {
      staleCount = await db.collection("gem_contracts")
        .countDocuments({ first_seen: { $gt: lastBuildAt } })
    }

    return NextResponse.json({
      total_buyers:        totalBuyers,
      repeat_buyers:       agg.repeat_buyers as number,
      buyers_with_archive: agg.with_archive  as number,
      needs_review_count:  needsReviewCount,
      total_indexed_spend: agg.total_spend   as number,
      total_contracts:     agg.total_contracts as number,
      avg_contracts_per_buyer: Math.round((agg.avg_contracts as number) * 10) / 10,
      max_single_buyer_spend:  agg.max_spend  as number,

      tier_distribution: tierDist.map(r => ({
        tier:        r._id  as string,
        count:       r.count as number,
        total_spend: r.total_spend as number,
      })),

      state_distribution: stateDist.map(r => ({
        state:       r._id  as string,
        count:       r.count as number,
        total_spend: r.total_spend as number,
      })),

      ministry_distribution: ministryDist.map(r => ({
        ministry:    r._id  as string,
        count:       r.count as number,
        total_spend: r.total_spend as number,
      })),

      meta: {
        last_build_at:        lastBuildAt?.toISOString() ?? null,
        last_full_build_at:   (meta?.last_full_build_at  as Date | null)?.toISOString() ?? null,
        last_incremental_at:  (meta?.last_incremental_at as Date | null)?.toISOString() ?? null,
        build_duration_ms:    (meta?.build_duration_ms   as number | null) ?? null,
        is_stale:             staleCount > 0,
        stale_contract_count: staleCount,
      },
    })
  } catch (err) {
    console.error("buyer-profiles/stats error:", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
