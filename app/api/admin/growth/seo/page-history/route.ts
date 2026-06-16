/**
 * GET /api/admin/growth/seo/page-history?path=
 *
 * Returns chronological SEO history for a page:
 * recommendations generated, approved, executed, rolled back, traffic alerts
 */
import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { requireAuth } from "@/lib/rbac/server"

export const dynamic = "force-dynamic"

export interface HistoryEvent {
  date: string
  type: "generated" | "approved" | "rejected" | "deferred" | "executed" | "implemented" | "rolled_back" | "traffic_alert" | "traffic_ok"
  label: string
  detail: string
  rec_id?: string
  rec_title?: string
  status?: string
  ok?: boolean
}

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  const { searchParams } = new URL(req.url)
  const path = searchParams.get("path")
  if (!path) return NextResponse.json({ error: "path required" }, { status: 400 })

  const db = (await clientPromise).db()

  const [recs, execLogs, alerts, baselines] = await Promise.all([
    db.collection("seo_recommendations")
      .find({ url: path })
      .sort({ generated_at: -1 })
      .limit(30)
      .toArray(),
    db.collection("seo_execution_log")
      .find({ path })
      .sort({ executed_at: -1 })
      .limit(30)
      .toArray(),
    db.collection("seo_traffic_alerts")
      .find({ path })
      .sort({ created_at: -1 })
      .limit(10)
      .toArray(),
    db.collection("seo_execution_baselines")
      .find({ path })
      .sort({ captured_at: -1 })
      .limit(10)
      .toArray(),
  ])

  const events: HistoryEvent[] = []

  // ── Recommendations lifecycle ─────────────────────────────────────────────
  for (const rec of recs) {
    const rid = String(rec._id)
    const title = rec.title || rec.type || "Recommendation"

    events.push({ date: rec.generated_at, type: "generated", label: "Detected", detail: title, rec_id: rid, rec_title: title, status: rec.status })

    if (rec.reviewed_at && (rec.status === "approved" || rec.implemented_at || rec.executed_at)) {
      events.push({ date: rec.reviewed_at, type: "approved", label: "Approved", detail: title, rec_id: rid, rec_title: title })
    }
    if (rec.status === "rejected" && rec.reviewed_at) {
      events.push({ date: rec.reviewed_at, type: "rejected", label: "Rejected", detail: title, rec_id: rid, rec_title: title })
    }
    if (rec.status === "deferred" && rec.reviewed_at) {
      events.push({ date: rec.reviewed_at, type: "deferred", label: "Deferred", detail: title, rec_id: rid, rec_title: title })
    }
    if (rec.implemented_at) {
      events.push({ date: rec.implemented_at, type: "implemented", label: "Implemented", detail: title, rec_id: rid, rec_title: title, ok: true })
    }
    if (rec.rolled_back_at) {
      events.push({ date: rec.rolled_back_at, type: "rolled_back", label: "Rolled Back", detail: title, rec_id: rid, rec_title: title, ok: false })
    }
  }

  // ── Execution log events ──────────────────────────────────────────────────
  for (const log of execLogs) {
    if (log.action === "execute") {
      events.push({
        date: log.executed_at,
        type: log.final_status === "implemented" ? "executed" : "rolled_back",
        label: log.final_status === "implemented" ? "Executed" : `Execution ${log.final_status}`,
        detail: log.rec_title || log.rec_type || "Change",
        rec_id: log.rec_id,
        rec_title: log.rec_title,
        ok: log.status === "success",
        status: log.final_status,
      })
    }
  }

  // ── Traffic alerts ────────────────────────────────────────────────────────
  for (const alert of alerts) {
    events.push({
      date: alert.created_at,
      type: "traffic_alert",
      label: "Traffic Alert",
      detail: alert.message || "Regression detected",
      ok: false,
      status: alert.status,
    })
  }

  // ── Baseline captures = traffic snapshot events ───────────────────────────
  for (const b of baselines) {
    events.push({
      date: b.captured_at,
      type: "traffic_ok",
      label: "Baseline Captured",
      detail: `${b.clicks_28d} clicks, pos ${Number(b.avg_position_28d || 0).toFixed(1)} at execution`,
      rec_id: b.rec_id,
    })
  }

  // Sort descending (most recent first)
  events.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0))

  return NextResponse.json({
    path,
    events,
    total: events.length,
    rec_count: recs.length,
    exec_count: execLogs.length,
  })
}
