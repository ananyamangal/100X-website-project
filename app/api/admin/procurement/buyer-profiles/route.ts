import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { requirePermission } from "@/lib/rbac/server"
import {
  buildAllBuyerProfiles,
  buildIncrementalBuyerProfiles,
  META_SLUG,
} from "@/lib/gem/buyer-profile-builder"

export const maxDuration = 60

// ─── GET /api/admin/procurement/buyer-profiles ────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, "procurement.contracts.view")
  if (!("user" in auth)) return auth

  try {
    const db  = (await clientPromise).db()
    const col = db.collection("buyer_profiles")
    const sp  = req.nextUrl.searchParams

    const state    = sp.get("state")    || ""
    const ministry = sp.get("ministry") || ""
    const tier     = sp.get("tier")     || ""
    const dateFrom = sp.get("dateFrom") || ""
    const dateTo   = sp.get("dateTo")   || ""
    const page     = Math.max(1, parseInt(sp.get("page") || "1"))
    const limit    = Math.min(200, Math.max(1, parseInt(sp.get("limit") || "50")))
    const sortBy   = sp.get("sortBy")   || "total_spend"
    const sortDir  = sp.get("sortDir") === "asc" ? 1 : -1

    const query: Record<string, unknown> = {
      buyer_slug: { $ne: META_SLUG },
    }
    if (state)    query.state    = { $regex: `^${state.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, $options: "i" }
    if (ministry) query.ministry = { $regex: ministry.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" }
    if (tier)     query.buyer_tier = tier.toUpperCase()
    if (dateFrom) query.last_contract_date = { ...(query.last_contract_date as object || {}), $gte: dateFrom }
    if (dateTo)   query.last_contract_date = { ...(query.last_contract_date as object || {}), $lte: dateTo }

    const SORTABLE = new Set(["total_spend", "contract_count", "last_contract_date", "buyer_name", "archive_coverage_pct"])
    const sortField = SORTABLE.has(sortBy) ? sortBy : "total_spend"

    const [profiles, total] = await Promise.all([
      col
        .find(query)
        .sort({ [sortField]: sortDir })
        .skip((page - 1) * limit)
        .limit(limit)
        .project({
          buyer_slug: 1, buyer_name: 1, state: 1, ministry: 1,
          contract_count: 1, total_spend: 1, last_contract_date: 1,
          top_supplier: 1, buyer_tier: 1, avg_days_between_purchases: 1,
          archive_coverage_pct: 1, buyer_identity_confidence: 1,
          needs_review: 1,
        })
        .toArray(),
      col.countDocuments(query),
    ])

    // Staleness check: contracts added since last build
    const meta = await col.findOne({ buyer_slug: META_SLUG }) as Record<string, unknown> | null
    const lastBuildAt = (meta?.last_incremental_at ?? meta?.last_full_build_at) as Date | null
    let staleCount = 0
    if (lastBuildAt) {
      staleCount = await db.collection("gem_contracts")
        .countDocuments({ first_seen: { $gt: lastBuildAt } })
    }

    return NextResponse.json({
      profiles,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      meta: {
        last_build_at:  lastBuildAt?.toISOString() ?? null,
        is_stale:       staleCount > 0,
        stale_count:    staleCount,
      },
    })
  } catch (err) {
    console.error("buyer-profiles GET error:", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// ─── POST /api/admin/procurement/buyer-profiles ───────────────────────────────
// Body: { action: "rebuild" | "refresh" }

export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, "procurement.contracts.view")
  if (!("user" in auth)) return auth

  try {
    const body   = await req.json().catch(() => ({})) as Record<string, unknown>
    const action = body.action === "refresh" ? "refresh" : "rebuild"

    const db     = (await clientPromise).db()
    const result = action === "refresh"
      ? await buildIncrementalBuyerProfiles(db)
      : await buildAllBuyerProfiles(db)

    return NextResponse.json({ ok: true, action, ...result })
  } catch (err) {
    console.error("buyer-profiles POST error:", err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
