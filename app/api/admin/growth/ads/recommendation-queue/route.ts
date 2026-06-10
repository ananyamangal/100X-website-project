/**
 * Recommendation Queue API.
 *
 * Manages AI-generated recommendations from the optimization loop.
 * Every recommendation requires human review before action.
 *
 * GET  /api/admin/growth/ads/recommendation-queue        — list items
 * PATCH /api/admin/growth/ads/recommendation-queue       — approve/reject/mark applied
 */

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import clientPromise from "@/lib/mongodb"
import {
  getQueueItems,
  getQueueSummary,
  approveItem,
  rejectItem,
  markApplied,
  type RecommendationStatus,
  type RecommendationPriority,
  type RecommendationType,
} from "@/lib/growth-os/approval-queue"

export const dynamic = "force-dynamic"

// ── GET: list recommendation queue items ─────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams

    const statusParam = sp.get("status")
    const type        = sp.get("type")     as RecommendationType | null
    const priority    = sp.get("priority") as RecommendationPriority | null
    const limit       = parseInt(sp.get("limit") ?? "100", 10)
    const summary     = sp.get("summary") === "1"

    const db = (await clientPromise).db()

    if (summary) {
      const stats = await getQueueSummary(db)
      return NextResponse.json({ summary: stats })
    }

    const statusFilter = statusParam
      ? (statusParam.split(",") as RecommendationStatus[])
      : (["pending"] as RecommendationStatus[])

    const items = await getQueueItems(db, {
      status:   statusFilter,
      type:     type ?? undefined,
      priority: priority ?? undefined,
      limit,
    })

    return NextResponse.json({
      count: items.length,
      items: items.map(({ ...item }) => item),
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// ── PATCH: review a recommendation ───────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json() as {
      action:     "approve" | "reject" | "applied"
      id:         string
      reason?:    string
      notes?:     string
      reviewedBy?: string
    }

    const { action, id, reason, notes, reviewedBy = "admin" } = body

    if (!action || !id) {
      return NextResponse.json({ error: "action and id are required" }, { status: 400 })
    }

    const db = (await clientPromise).db()
    let ok = false

    if (action === "approve") {
      ok = await approveItem(db, id, reviewedBy)
    } else if (action === "reject") {
      if (!reason) return NextResponse.json({ error: "reason required for rejection" }, { status: 400 })
      ok = await rejectItem(db, id, reason, reviewedBy)
    } else if (action === "applied") {
      ok = await markApplied(db, id, notes)
    } else {
      return NextResponse.json({ error: "action must be approve | reject | applied" }, { status: 400 })
    }

    if (!ok) {
      return NextResponse.json({ error: "Item not found or already in final status" }, { status: 404 })
    }

    return NextResponse.json({ ok: true, id, action })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
