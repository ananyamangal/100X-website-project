/**
 * GET  /api/admin/growth/seo/freeze  — current freeze status + velocity count
 * POST /api/admin/growth/seo/freeze  — toggle freeze on/off
 *
 * When freeze is enabled: all SEO executions are blocked globally (503).
 * Recommendations continue to be generated — only execution is gated.
 */
import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { requireAuth } from "@/lib/rbac/server"

export const dynamic = "force-dynamic"

const VELOCITY_LIMIT = 5

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const db = (await clientPromise).db()
  const [freezeDoc, todayCount, protectedCount] = await Promise.all([
    db.collection("seo_global_settings").findOne({ key: "automation_freeze" }),
    db.collection("seo_execution_log").countDocuments({
      action: "execute",
      final_status: "implemented",
      executed_at: { $gte: new Date(Date.now() - 86_400_000).toISOString() },
    }),
    db.collection("seo_protected_pages").countDocuments({}),
  ])

  return NextResponse.json({
    freeze_enabled: freezeDoc?.value === true,
    freeze_set_at: freezeDoc?.set_at ?? null,
    today_executions: todayCount,
    velocity_limit: VELOCITY_LIMIT,
    velocity_remaining: Math.max(0, VELOCITY_LIMIT - todayCount),
    protected_page_count: protectedCount,
  })
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const body = await req.json().catch(() => ({}))
  const enabled = body.enabled === true
  const db = (await clientPromise).db()

  await db.collection("seo_global_settings").updateOne(
    { key: "automation_freeze" },
    { $set: { key: "automation_freeze", value: enabled, set_at: new Date().toISOString(), set_by: "admin" } },
    { upsert: true }
  )

  return NextResponse.json({
    ok: true,
    freeze_enabled: enabled,
    message: enabled
      ? "SEO Automation Freeze ENABLED — all executions are now blocked"
      : "SEO Automation Freeze DISABLED — executions are permitted",
  })
}
