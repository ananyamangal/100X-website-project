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
    const sp  = req.nextUrl.searchParams

    const tier          = sp.get("tier")          ?? ""
    const buyerSlug     = sp.get("buyer_slug")    ?? ""
    const sellerSlug    = sp.get("seller_slug")   ?? ""
    const isExclusive   = sp.get("is_exclusive")  === "true"
    const isRepeat      = sp.get("is_repeat")     === "true"
    const foggingOnly   = sp.get("fogging_only")  === "true"
    const search        = sp.get("q")             ?? ""
    const page          = Math.max(1, parseInt(sp.get("page")  ?? "1",  10))
    const limit         = Math.min(200, Math.max(1, parseInt(sp.get("limit") ?? "50", 10)))
    const sortBy        = sp.get("sort_by")        ?? "opportunity_score"
    const sortDir       = sp.get("sort_dir") === "asc" ? 1 : -1

    const filter: Record<string, unknown> = { doc_type: "buyer_seller_pair" }

    if (tier)          filter.relationship_tier    = tier
    if (buyerSlug)     filter.buyer_slug            = buyerSlug
    if (sellerSlug)    filter.seller_slug           = sellerSlug
    if (isExclusive)   filter.is_exclusive          = true
    if (isRepeat)      filter.is_repeat             = true
    if (foggingOnly)   filter.has_fogging_products  = true
    if (search) {
      filter.$or = [
        { buyer_name:  { $regex: search, $options: "i" } },
        { seller_name: { $regex: search, $options: "i" } },
        { seller_pan:  { $regex: search, $options: "i" } },
        { products:    { $regex: search, $options: "i" } },
      ]
    }

    const validSortFields = new Set([
      "opportunity_score", "total_gmv", "contract_count",
      "consecutive_years", "relationship_span_days",
      "seller_share_of_buyer", "buyer_share_of_seller",
    ])
    const finalSort = validSortFields.has(sortBy) ? sortBy : "opportunity_score"

    const [total, pairs, meta] = await Promise.all([
      col.countDocuments(filter),
      col
        .find(filter, {
          projection: {
            pair_key: 1, buyer_slug: 1, buyer_name: 1,
            seller_slug: 1, seller_name: 1, seller_pan: 1, seller_gstin: 1,
            contract_count: 1, total_gmv: 1, avg_contract_value: 1,
            first_contract_date: 1, last_contract_date: 1,
            relationship_span_days: 1, consecutive_years: 1,
            is_repeat: 1, is_exclusive: 1,
            buyer_share_of_seller: 1, seller_share_of_buyer: 1,
            relationship_tier: 1, product_count: 1,
            has_fogging_products: 1, opportunity_score: 1,
          },
        })
        .sort({ [finalSort]: sortDir as 1 | -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray(),
      col.findOne({ doc_type: "__meta__", meta_type: "buyer_seller_pair" }) as Promise<Record<string, unknown> | null>,
    ])

    const lastBuildAt = (meta?.last_incremental_at ?? meta?.last_full_build_at) as Date | null

    return NextResponse.json({
      pairs: pairs.map(p => ({ ...p, _id: undefined })),
      pagination: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
      meta: {
        last_build_at:        lastBuildAt?.toISOString()   ?? null,
        last_full_build_at:   (meta?.last_full_build_at  as Date | null)?.toISOString() ?? null,
        last_incremental_at:  (meta?.last_incremental_at as Date | null)?.toISOString() ?? null,
        build_duration_ms:    (meta?.build_duration_ms   as number | null) ?? null,
        total_pairs:          (meta?.total_pairs          as number | null) ?? null,
      },
    })
  } catch (err) {
    console.error("contract-analytics/pairs GET error:", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
