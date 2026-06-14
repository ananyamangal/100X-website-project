import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { requirePermission } from "@/lib/rbac/server"
import { SELLER_META_SLUG } from "@/lib/gem/seller-profile-builder"

export const maxDuration = 30

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, "procurement.contracts.view")
  if (!("user" in auth)) return auth

  try {
    const db  = (await clientPromise).db()
    const col = db.collection("seller_profiles")
    const baseMatch = { seller_slug: { $ne: SELLER_META_SLUG } }

    const [
      totalSellers,
      tierDist,
      stateDist,
      msmeDist,
      methodDist,
      aggResult,
      meta,
      needsReviewCount,
      foggingCount,
      multiGSTINCount,
      conflictAgg,
    ] = await Promise.all([
      col.countDocuments(baseMatch),

      col.aggregate([
        { $match: baseMatch },
        { $group: { _id: "$seller_tier", count: { $sum: 1 }, total_gmv: { $sum: "$total_gmv" } } },
        { $sort: { _id: 1 } },
      ]).toArray(),

      col.aggregate([
        { $match: { ...baseMatch, seller_state: { $nin: [null, ""] } } },
        { $group: { _id: "$seller_state", count: { $sum: 1 }, total_gmv: { $sum: "$total_gmv" } } },
        { $sort: { total_gmv: -1 } },
        { $limit: 15 },
      ]).toArray(),

      col.aggregate([
        { $match: { ...baseMatch, seller_msme_category: { $nin: [null, ""] } } },
        { $group: { _id: "$seller_msme_category", count: { $sum: 1 }, total_gmv: { $sum: "$total_gmv" } } },
        { $sort: { total_gmv: -1 } },
      ]).toArray(),

      col.aggregate([
        { $match: baseMatch },
        { $group: { _id: "$seller_identity_method", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]).toArray(),

      col.aggregate([
        { $match: baseMatch },
        {
          $group: {
            _id:                   null,
            total_gmv:             { $sum: "$total_gmv"           },
            total_contracts:       { $sum: "$contract_count"      },
            avg_contracts:         { $avg: "$contract_count"      },
            max_gmv:               { $max: "$total_gmv"           },
            repeat_sellers:        { $sum: { $cond: [{ $gt: ["$contract_count", 1] }, 1, 0] } },
            with_archive:          { $sum: { $cond: [{ $gt: ["$archive_contract_count", 0] }, 1, 0] } },
            gstin_seen_total:      { $sum: "$gstin_count"         },
            gstin_fail_total:      { $sum: "$gstin_validation_failures" },
            merge_cands_total:     { $sum: { $size: "$merge_candidates" } },
            pan_grouped_sellers:   { $sum: { $cond: [{ $eq: ["$seller_identity_method", "gstin_pan_grouped"] }, 1, 0] } },
            high_confidence:       { $sum: { $cond: [{ $eq: ["$seller_identity_confidence", "high"] }, 1, 0] } },
            medium_confidence:     { $sum: { $cond: [{ $eq: ["$seller_identity_confidence", "medium"] }, 1, 0] } },
            low_confidence:        { $sum: { $cond: [{ $eq: ["$seller_identity_confidence", "low"] }, 1, 0] } },
          },
        },
      ]).toArray(),

      col.findOne({ seller_slug: SELLER_META_SLUG }) as Promise<Record<string, unknown> | null>,

      col.countDocuments({ ...baseMatch, needs_review: true }),

      col.countDocuments({ ...baseMatch, supplies_fogging_products: true }),

      col.countDocuments({ ...baseMatch, gstin_count: { $gt: 1 } }),

      col.aggregate([
        { $match: { ...baseMatch, "identity_conflicts.0": { $exists: true } } },
        { $group: { _id: null, total: { $sum: { $size: "$identity_conflicts" } }, sellers: { $sum: 1 } } },
      ]).toArray(),
    ])

    const agg = aggResult[0] ?? {
      total_gmv: 0, total_contracts: 0, avg_contracts: 0, max_gmv: 0,
      repeat_sellers: 0, with_archive: 0,
      gstin_seen_total: 0, gstin_fail_total: 0, merge_cands_total: 0,
      pan_grouped_sellers: 0, high_confidence: 0, medium_confidence: 0, low_confidence: 0,
    }

    const lastBuildAt = (meta?.last_incremental_at ?? meta?.last_full_build_at) as Date | null
    let staleCount = 0
    if (lastBuildAt) {
      staleCount = await db.collection("gem_contracts")
        .countDocuments({ first_seen: { $gt: lastBuildAt } })
    }

    return NextResponse.json({
      total_sellers:        totalSellers,
      repeat_sellers:       agg.repeat_sellers       as number,
      sellers_with_archive: agg.with_archive          as number,
      needs_review_count:   needsReviewCount,
      fogging_suppliers:    foggingCount,

      total_gmv:            agg.total_gmv             as number,
      total_contracts:      agg.total_contracts       as number,
      avg_contracts_per_seller: Math.round((agg.avg_contracts as number) * 10) / 10,
      max_single_seller_gmv:   agg.max_gmv            as number,

      tier_distribution: tierDist.map(r => ({
        tier:      r._id  as string,
        count:     r.count as number,
        total_gmv: r.total_gmv as number,
      })),

      state_distribution: stateDist.map(r => ({
        state:     r._id  as string,
        count:     r.count as number,
        total_gmv: r.total_gmv as number,
      })),

      msme_distribution: msmeDist.map(r => ({
        category:  r._id  as string,
        count:     r.count as number,
        total_gmv: r.total_gmv as number,
      })),

      identity_distribution: methodDist.map(r => ({
        method: r._id  as string,
        count:  r.count as number,
      })),

      // Validation report block
      validation: {
        gstin_seen:               agg.gstin_seen_total           as number,
        gstin_validation_failures: agg.gstin_fail_total          as number,
        multi_gstin_sellers:      multiGSTINCount,
        pan_grouped_sellers:      agg.pan_grouped_sellers        as number,
        merge_candidates_count:   agg.merge_cands_total          as number,
        identity_conflicts_total: (conflictAgg[0]?.total as number) ?? 0,
        sellers_with_conflicts:   (conflictAgg[0]?.sellers as number) ?? 0,
        confidence_distribution: {
          high:   agg.high_confidence   as number,
          medium: agg.medium_confidence as number,
          low:    agg.low_confidence    as number,
        },
      },

      meta: {
        last_build_at:        lastBuildAt?.toISOString()  ?? null,
        last_full_build_at:   (meta?.last_full_build_at  as Date | null)?.toISOString() ?? null,
        last_incremental_at:  (meta?.last_incremental_at as Date | null)?.toISOString() ?? null,
        build_duration_ms:    (meta?.build_duration_ms   as number | null) ?? null,
        is_stale:             staleCount > 0,
        stale_contract_count: staleCount,
      },
    })
  } catch (err) {
    console.error("seller-profiles/stats error:", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
