import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { requirePermission } from "@/lib/rbac/server"
import {
  buildAllSellerProfiles,
  buildIncrementalSellerProfiles,
  SELLER_META_SLUG,
} from "@/lib/gem/seller-profile-builder"

export const maxDuration = 60

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, "procurement.contracts.view")
  if (!("user" in auth)) return auth

  try {
    const db  = (await clientPromise).db()
    const col = db.collection("seller_profiles")
    const sp  = req.nextUrl.searchParams

    const sellerState        = sp.get("seller_state") ?? ""
    const tier               = sp.get("tier") ?? ""
    const identityMethod     = sp.get("identity_method") ?? ""
    const needsReview        = sp.get("needs_review") === "true"
    const foggingOnly        = sp.get("supplies_fogging_products") === "true"
    const msmeCategory       = sp.get("msme_category") ?? ""
    const search             = sp.get("q") ?? ""
    const page               = Math.max(1, parseInt(sp.get("page")  ?? "1",  10))
    const limit              = Math.min(100, Math.max(1, parseInt(sp.get("limit") ?? "50", 10)))
    const sortBy             = sp.get("sort_by")  ?? "total_gmv"
    const sortDir            = sp.get("sort_dir") === "asc" ? 1 : -1

    const filter: Record<string, unknown> = { seller_slug: { $ne: SELLER_META_SLUG } }

    if (sellerState)    filter.seller_state        = sellerState
    if (tier)           filter.seller_tier          = tier
    if (identityMethod) filter.seller_identity_method = identityMethod
    if (needsReview)    filter.needs_review          = true
    if (foggingOnly)    filter.supplies_fogging_products = true
    if (msmeCategory)   filter.seller_msme_category = msmeCategory
    if (search) {
      filter.$or = [
        { seller_name:          { $regex: search, $options: "i" } },
        { seller_gstin:         { $regex: search, $options: "i" } },
        { seller_pan:           { $regex: search, $options: "i" } },
        { seller_gem_id:        { $regex: search, $options: "i" } },
        { seller_name_variants: { $regex: search, $options: "i" } },
      ]
    }

    const validSortFields = new Set([
      "total_gmv", "contract_count", "buyer_count", "last_contract_date",
      "first_contract_date", "avg_contract_value", "repeat_buyer_pct",
      "state_count", "department_count",
    ])
    const finalSort = validSortFields.has(sortBy) ? sortBy : "total_gmv"

    const [total, profiles, meta] = await Promise.all([
      col.countDocuments(filter),
      col
        .find(filter, {
          projection: {
            seller_slug: 1, seller_name: 1, seller_pan: 1, seller_gstin: 1,
            seller_gem_id: 1, seller_state: 1, seller_tier: 1,
            seller_identity_confidence: 1, seller_identity_method: 1,
            contract_count: 1, total_gmv: 1, buyer_count: 1, state_count: 1,
            last_contract_date: 1, top_buyer: 1, top_buyer_share_pct: 1,
            needs_review: 1, merge_candidates: 1, identity_conflicts: 1,
            supplies_fogging_products: 1, is_100x_supplier: 1, competes_with_100x: 1,
            seller_msme: 1, seller_msme_category: 1, gstin_count: 1,
            repeat_buyer_pct: 1, updated_at: 1,
          },
        })
        .sort({ [finalSort]: sortDir as 1 | -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray(),
      col.findOne({ seller_slug: SELLER_META_SLUG }) as Promise<Record<string, unknown> | null>,
    ])

    const lastBuildAt = (meta?.last_incremental_at ?? meta?.last_full_build_at) as Date | null
    let staleCount = 0
    if (lastBuildAt) {
      staleCount = await db.collection("gem_contracts")
        .countDocuments({ first_seen: { $gt: lastBuildAt } })
    }

    return NextResponse.json({
      profiles: profiles.map(p => ({ ...p, _id: undefined })),
      pagination: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
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
    console.error("seller-profiles GET error:", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, "procurement.contracts.view")
  if (!("user" in auth)) return auth

  try {
    const { action } = await req.json() as { action?: string }
    if (action !== "rebuild" && action !== "refresh") {
      return NextResponse.json({ error: "action must be 'rebuild' or 'refresh'" }, { status: 400 })
    }

    const db = (await clientPromise).db()
    const result = action === "rebuild"
      ? await buildAllSellerProfiles(db)
      : await buildIncrementalSellerProfiles(db)

    return NextResponse.json({ ok: true, result })
  } catch (err) {
    console.error("seller-profiles POST error:", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
