import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { requirePermission } from "@/lib/rbac/server"

export const maxDuration = 30

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, "procurement.contracts.view")
  if (!("user" in auth)) return auth

  try {
    const db  = (await clientPromise).db()
    const col = db.collection("contract_analytics")
    const baseMatch = { doc_type: "buyer_seller_pair" }

    const [
      totalPairs,
      tierDist,
      aggResult,
      scorePercentiles,
      foggingAgg,
      meta,
    ] = await Promise.all([
      col.countDocuments(baseMatch),

      col.aggregate([
        { $match: baseMatch },
        { $group: { _id: "$relationship_tier", count: { $sum: 1 }, total_gmv: { $sum: "$total_gmv" } } },
        { $sort: { _id: 1 } },
      ]).toArray(),

      col.aggregate([
        { $match: baseMatch },
        {
          $group: {
            _id:                  null,
            total_gmv:            { $sum: "$total_gmv"              },
            total_contracts:      { $sum: "$contract_count"         },
            avg_gmv_per_pair:     { $avg: "$total_gmv"              },
            avg_opp_score:        { $avg: "$opportunity_score"      },
            exclusive_pairs:      { $sum: { $cond: ["$is_exclusive", 1, 0] } },
            repeat_pairs:         { $sum: { $cond: ["$is_repeat",    1, 0] } },
            fogging_pairs:        { $sum: { $cond: ["$has_fogging_products", 1, 0] } },
            unique_buyers:        { $addToSet: "$buyer_slug"         },
            unique_sellers:       { $addToSet: "$seller_slug"        },
            max_opportunity:      { $max: "$opportunity_score"       },
            max_gmv:              { $max: "$total_gmv"               },
          },
        },
        { $project: {
          total_gmv: 1, total_contracts: 1, avg_gmv_per_pair: 1, avg_opp_score: 1,
          exclusive_pairs: 1, repeat_pairs: 1, fogging_pairs: 1,
          unique_buyer_count:  { $size: "$unique_buyers"  },
          unique_seller_count: { $size: "$unique_sellers" },
          max_opportunity: 1, max_gmv: 1,
        } },
      ]).toArray(),

      // Score distribution buckets
      col.aggregate([
        { $match: baseMatch },
        { $bucket: {
          groupBy: "$opportunity_score",
          boundaries: [0, 20, 40, 60, 80, 100],
          default: "100",
          output: { count: { $sum: 1 } },
        } },
      ]).toArray(),

      // Top fogging pairs
      col.aggregate([
        { $match: { ...baseMatch, has_fogging_products: true } },
        { $sort: { opportunity_score: -1 } },
        { $limit: 10 },
        { $project: {
          pair_key: 1, buyer_name: 1, seller_name: 1,
          total_gmv: 1, contract_count: 1, opportunity_score: 1,
          relationship_tier: 1, is_exclusive: 1,
        } },
      ]).toArray(),

      col.findOne({ doc_type: "__meta__", meta_type: "buyer_seller_pair" }) as Promise<Record<string, unknown> | null>,
    ])

    const agg = aggResult[0] ?? {
      total_gmv: 0, total_contracts: 0, avg_gmv_per_pair: 0, avg_opp_score: 0,
      exclusive_pairs: 0, repeat_pairs: 0, fogging_pairs: 0,
      unique_buyer_count: 0, unique_seller_count: 0, max_opportunity: 0, max_gmv: 0,
    }

    const lastBuildAt = (meta?.last_incremental_at ?? meta?.last_full_build_at) as Date | null

    return NextResponse.json({
      total_pairs:          totalPairs,
      total_gmv:            agg.total_gmv            as number,
      total_contracts:      agg.total_contracts       as number,
      avg_gmv_per_pair:     agg.avg_gmv_per_pair      as number,
      avg_opportunity_score: Math.round((agg.avg_opp_score as number) * 10) / 10,
      max_opportunity_score: agg.max_opportunity      as number,
      exclusive_pairs:      agg.exclusive_pairs       as number,
      repeat_pairs:         agg.repeat_pairs          as number,
      fogging_pairs:        agg.fogging_pairs         as number,
      unique_buyers:        agg.unique_buyer_count    as number,
      unique_sellers:       agg.unique_seller_count   as number,

      tier_distribution: tierDist.map(r => ({
        tier:      r._id       as string,
        count:     r.count     as number,
        total_gmv: r.total_gmv as number,
      })),

      score_distribution: scorePercentiles.map(r => ({
        bucket: r._id as number | string,
        count:  r.count as number,
      })),

      top_fogging_pairs: foggingAgg.map(p => ({ ...p, _id: undefined })),

      meta: {
        last_build_at:        lastBuildAt?.toISOString()  ?? null,
        last_full_build_at:   (meta?.last_full_build_at  as Date | null)?.toISOString() ?? null,
        last_incremental_at:  (meta?.last_incremental_at as Date | null)?.toISOString() ?? null,
        build_duration_ms:    (meta?.build_duration_ms   as number | null) ?? null,
        total_pairs:          (meta?.total_pairs          as number | null) ?? null,
      },
    })
  } catch (err) {
    console.error("contract-analytics/stats GET error:", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
