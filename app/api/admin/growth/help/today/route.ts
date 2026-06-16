import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { requireAuth } from "@/lib/rbac/server"
import { ObjectId } from "mongodb"

export interface TodayItem {
  id: string
  urgency: "critical" | "high" | "medium"
  type: "director" | "dealer_followup" | "opportunity" | "automation" | "weekly"
  title: string
  detail: string
  action: string
  link: string
}

export async function GET(req: NextRequest) {
  const authError = await requireAuth(req)
  if (authError) return authError

  const client = await clientPromise
  const db = client.db()
  const items: TodayItem[] = []
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  // ── 1. Director: pending recs waiting for approval ─────────────────────────
  try {
    const pendingRecs = await db
      .collection("director_recommendations")
      .find({ status: "pending" })
      .sort({ confidence: -1 })
      .limit(3)
      .toArray()

    if (pendingRecs.length > 0) {
      items.push({
        id: "director-pending",
        urgency: "critical",
        type: "director",
        title: `${pendingRecs.length} Director recommendation${pendingRecs.length > 1 ? "s" : ""} awaiting approval`,
        detail: `Top: ${pendingRecs[0]?.title ?? pendingRecs[0]?.rec_type ?? "recommendation"} (${Math.round((pendingRecs[0]?.confidence ?? 0) * 100)}% confidence)`,
        action: "Review and approve",
        link: "/admin/growth/director",
      })
    }
  } catch { /* collection may be empty on fresh install */ }

  // ── 2. Director: today's run status ───────────────────────────────────────
  try {
    const latestRun = await db
      .collection("director_daily_runs")
      .findOne({}, { sort: { run_date: -1 } })

    if (latestRun) {
      const runDate = new Date(latestRun.run_date)
      const isToday = runDate >= todayStart
      if (!isToday) {
        items.push({
          id: "director-stale",
          urgency: "high",
          type: "director",
          title: "Revenue Director has not run today",
          detail: `Last run: ${runDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}. Expected at 07:00 IST.`,
          action: "Check Operations Center",
          link: "/admin/growth/operations",
        })
      }
    }
  } catch { /* ok */ }

  // ── 3. Dealers: overdue follow-ups ────────────────────────────────────────
  try {
    const overdueDealers = await db
      .collection("crm_dealers")
      .find({
        follow_up_date: { $lt: now },
        stage: { $nin: ["active_dealer", "lost"] },
      })
      .limit(5)
      .toArray()

    if (overdueDealers.length > 0) {
      items.push({
        id: "dealer-followup",
        urgency: "high",
        type: "dealer_followup",
        title: `${overdueDealers.length} dealer follow-up${overdueDealers.length > 1 ? "s" : ""} overdue`,
        detail: `${overdueDealers.map(d => d.name).slice(0, 3).join(", ")}${overdueDealers.length > 3 ? ` +${overdueDealers.length - 3} more` : ""}`,
        action: "Update stage or reschedule",
        link: "/admin/growth/crm/dealers",
      })
    }
  } catch { /* ok */ }

  // ── 4. Opportunities: stale (no update in 7+ days) ────────────────────────
  try {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const staleOpps = await db
      .collection("crm_opportunities")
      .find({
        stage: { $nin: ["won", "lost"] },
        updated_at: { $lt: sevenDaysAgo },
      })
      .limit(5)
      .toArray()

    if (staleOpps.length > 0) {
      items.push({
        id: "opp-stale",
        urgency: "medium",
        type: "opportunity",
        title: `${staleOpps.length} opportunit${staleOpps.length > 1 ? "ies" : "y"} with no update in 7+ days`,
        detail: `${staleOpps.map(o => o.title ?? o.name).slice(0, 3).join(", ")}`,
        action: "Update stage or next action",
        link: "/admin/growth/crm/opportunities",
      })
    }
  } catch { /* ok */ }

  // ── 5. Opportunities: high-value near closing ─────────────────────────────
  try {
    const closingOpps = await db
      .collection("crm_opportunities")
      .find({
        stage: { $in: ["quotation_submitted", "bid_submitted"] },
      })
      .sort({ value: -1 })
      .limit(3)
      .toArray()

    if (closingOpps.length > 0) {
      const totalValue = closingOpps.reduce((sum, o) => sum + (o.value ?? 0), 0)
      items.push({
        id: "opp-closing",
        urgency: "high",
        type: "opportunity",
        title: `${closingOpps.length} opportunit${closingOpps.length > 1 ? "ies" : "y"} in closing stages`,
        detail: `₹${(totalValue / 100000).toFixed(1)}L at stake — quotation or bid submitted`,
        action: "Follow up on submitted proposals",
        link: "/admin/growth/crm/opportunities",
      })
    }
  } catch { /* ok */ }

  // ── 6. Approved Director recs not yet executed ────────────────────────────
  try {
    const approvedRecs = await db
      .collection("director_recommendations")
      .find({ status: "approved" })
      .limit(3)
      .toArray()

    if (approvedRecs.length > 0) {
      items.push({
        id: "director-approved-pending",
        urgency: "medium",
        type: "director",
        title: `${approvedRecs.length} approved rec${approvedRecs.length > 1 ? "s" : ""} waiting for execution`,
        detail: "These were approved but execution has not started yet.",
        action: "Open Execution Hub to begin",
        link: "/admin/growth/execution",
      })
    }
  } catch { /* ok */ }

  // Sort: critical first, then high, then medium; max 10 items
  const ORDER = { critical: 0, high: 1, medium: 2 }
  items.sort((a, b) => ORDER[a.urgency] - ORDER[b.urgency])
  const top10 = items.slice(0, 10)

  // If nothing to do
  if (top10.length === 0) {
    top10.push({
      id: "all-clear",
      urgency: "medium",
      type: "director",
      title: "All clear — no urgent actions found",
      detail: "No pending recs, overdue follow-ups, or stale opportunities.",
      action: "Review Revenue Director for today's intelligence",
      link: "/admin/growth/director",
    })
  }

  return NextResponse.json({
    items: top10,
    generated_at: now.toISOString(),
    total_found: items.length,
  })
}
