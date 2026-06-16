/**
 * GET /api/admin/growth/seo/impact-report?rec_id=
 *
 * 14-day post-implementation impact comparison:
 * before (seo_execution_baselines) vs after (current GSC data).
 * Includes confidence indicator based on days since execution.
 */
import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { requireAuth } from "@/lib/rbac/server"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const rec_id = new URL(req.url).searchParams.get("rec_id")
  if (!rec_id) return NextResponse.json({ error: "rec_id required" }, { status: 400 })

  const db = (await clientPromise).db()

  // Load execution baseline for this rec
  const baseline = await db.collection("seo_execution_baselines")
    .findOne({ rec_id }, { sort: { captured_at: -1 } })

  if (!baseline) {
    return NextResponse.json({ available: false, reason: "No execution baseline found — page may not have been executed yet" })
  }

  const path = baseline.path as string
  const capturedAt = new Date(baseline.captured_at as string)
  const daysSince = (Date.now() - capturedAt.getTime()) / 86_400_000

  // Current GSC data for the page
  const currentRows = await db.collection("gsc_query_rows")
    .find({ $or: [{ page: path }, { pagePath: path }] })
    .toArray()

  const current_clicks = currentRows.reduce((s: number, r: Record<string, unknown>) => s + Number(r.clicks || 0), 0)
  const current_impressions = currentRows.reduce((s: number, r: Record<string, unknown>) => s + Number(r.impressions || 0), 0)
  const current_ctr = current_impressions > 0 ? current_clicks / current_impressions : 0
  const current_position = currentRows.length > 0 ? currentRows.reduce((s: number, r: Record<string, unknown>) => s + Number(r.position || 0), 0) / currentRows.length : 0

  const before = {
    clicks: Number(baseline.clicks_28d || 0),
    impressions: Number(baseline.impressions_28d || 0),
    ctr: Number(baseline.ctr_28d || 0),
    avg_position: Number(baseline.avg_position_28d || 0),
  }

  const after = {
    clicks: current_clicks,
    impressions: current_impressions,
    ctr: current_ctr,
    avg_position: current_position,
  }

  // Compute changes
  const click_change = after.clicks - before.clicks
  const click_change_pct = before.clicks > 0 ? Math.round((click_change / before.clicks) * 100) : null
  const impression_change = after.impressions - before.impressions
  const impression_change_pct = before.impressions > 0 ? Math.round((impression_change / before.impressions) * 100) : null
  const ctr_change = (after.ctr - before.ctr) * 100  // in percentage points
  const position_change = after.avg_position - before.avg_position  // positive = worse

  // Confidence: data matures over time
  const confidence: "low" | "medium" | "high" =
    daysSince < 7  ? "low"
    : daysSince < 14 ? "medium"
    : "high"

  const overall_positive = click_change > 0
  const regression = click_change < 0 && Math.abs(click_change_pct ?? 0) > 15

  return NextResponse.json({
    available: true,
    rec_id,
    path,
    days_since_execution: Math.round(daysSince * 10) / 10,
    confidence,
    baseline_captured_at: baseline.captured_at,
    before,
    after,
    changes: {
      click_change,
      click_change_pct,
      impression_change,
      impression_change_pct,
      ctr_change_pp: Math.round(ctr_change * 100) / 100,  // percentage points
      position_change: Math.round(position_change * 10) / 10,
    },
    verdict: {
      overall_positive,
      regression,
      label: regression ? "Regression detected — consider rollback" :
             overall_positive ? "Positive impact" :
             daysSince < 7 ? "Data still maturing (7+ days for reliable signal)" :
             "Neutral — no significant change",
    },
  })
}
