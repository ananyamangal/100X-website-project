/**
 * POST /api/admin/growth/seo/traffic-monitor  — run 14-day post-implementation check
 * GET  /api/admin/growth/seo/traffic-monitor  — list active traffic alerts
 *
 * Monitoring thresholds (item 4):
 *  - Clicks drop > 20% vs baseline  → ALERT
 *  - Avg position drop > 3 places   → ALERT
 *  - Never auto-rollback — only suggests (item 8)
 */
import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { requireAuth } from "@/lib/rbac/server"

export const dynamic = "force-dynamic"

const CLICK_DROP_THRESHOLD = 0.20   // 20% click drop triggers alert
const POSITION_DROP_THRESHOLD = 3   // 3-place position drop triggers alert

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const db = (await clientPromise).db()
  const alerts = await db.collection("seo_traffic_alerts")
    .find({ status: "active" })
    .sort({ created_at: -1 })
    .limit(50)
    .toArray()

  return NextResponse.json({
    alerts: alerts.map(a => ({ ...a, _id: String(a._id) })),
    total: alerts.length,
  })
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const db = (await clientPromise).db()
  const now = new Date().toISOString()

  // Find all baselines for implemented recs
  const baselines = await db.collection("seo_traffic_baselines")
    .find({})
    .sort({ captured_at: -1 })
    .toArray()

  if (baselines.length === 0) {
    return NextResponse.json({ ok: true, checked: 0, alerts_created: 0, message: "No baselines to check yet" })
  }

  let alertsCreated = 0
  let checked = 0

  for (const baseline of baselines) {
    const { path, rec_id, clicks, avg_position, captured_at } = baseline

    // Only monitor within 14 days of implementation
    const daysSince = (Date.now() - new Date(captured_at).getTime()) / 86_400_000
    if (daysSince > 14) continue

    checked++

    // Fetch current GSC data for this page
    const currentRows = await db.collection("gsc_query_rows")
      .find({
        $or: [
          { page: path },
          { pagePath: path },
        ]
      })
      .toArray()

    if (currentRows.length === 0) continue

    const currentClicks = currentRows.reduce((s: number, r: Record<string, unknown>) => s + Number(r.clicks || 0), 0)
    const currentAvgPos = currentRows.reduce((s: number, r: Record<string, unknown>) => s + Number(r.position || 0), 0) / currentRows.length

    const clickDrop = clicks > 0 ? (clicks - currentClicks) / clicks : 0
    const positionDrop = currentAvgPos - Number(avg_position || 0)

    const clickAlert = clickDrop > CLICK_DROP_THRESHOLD
    const positionAlert = positionDrop > POSITION_DROP_THRESHOLD

    if (clickAlert || positionAlert) {
      // Check if alert already exists for this rec_id
      const existing = await db.collection("seo_traffic_alerts").findOne({ rec_id, status: "active" })
      if (existing) continue

      await db.collection("seo_traffic_alerts").insertOne({
        path,
        rec_id,
        alert_types: [
          ...(clickAlert ? [`clicks_drop_${Math.round(clickDrop * 100)}pct`] : []),
          ...(positionAlert ? [`position_drop_${positionDrop.toFixed(1)}_places`] : []),
        ],
        baseline: { clicks, avg_position },
        current: { clicks: currentClicks, avg_position: currentAvgPos },
        click_drop_pct: Math.round(clickDrop * 100),
        position_drop: Math.round(positionDrop * 10) / 10,
        message: buildAlertMessage(clickAlert, clickDrop, positionAlert, positionDrop),
        suggestion: "Consider rolling back the SEO change for this page. Review the execution log before deciding.",
        status: "active",
        requires_approval: true,   // Never auto-rollback — suggest only
        created_at: now,
      })
      alertsCreated++
    }
  }

  return NextResponse.json({
    ok: true,
    checked,
    alerts_created: alertsCreated,
    message: `Checked ${checked} page(s). ${alertsCreated} new alert(s) created.`,
  })
}

function buildAlertMessage(clickAlert: boolean, clickDrop: number, posAlert: boolean, posDrop: number): string {
  const parts: string[] = []
  if (clickAlert) parts.push(`clicks dropped ${Math.round(clickDrop * 100)}% vs baseline`)
  if (posAlert) parts.push(`avg position dropped ${posDrop.toFixed(1)} places`)
  return `Traffic regression detected: ${parts.join("; ")}. Rollback suggested — requires Founder approval.`
}
