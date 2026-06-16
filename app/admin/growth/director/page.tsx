"use client"

import { useState, useEffect, useCallback } from "react"
import {
  TrendingUp, Zap, Clock, RefreshCw, CheckCircle2, XCircle, Pause,
  AlertTriangle, ChevronRight, Target, Users, Search, FileText,
  DollarSign, Cpu, BarChart3, Flame, Megaphone, ArrowRight,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type RecType =
  | "oem_displacement" | "dealer_recruit" | "procurement_target"
  | "search_campaign" | "landing_page_create" | "creative_refresh"
  | "budget_reallocate" | "negative_keyword" | "customer_match" | "content_create"

type Priority = "critical" | "high" | "medium" | "low"
type Status = "pending" | "approved" | "rejected" | "deferred" | "applied"

interface Rec {
  _id: string
  run_date: string
  type: RecType
  priority: Priority
  title: string
  why_now: string
  evidence: string
  expected_action: string
  expected_revenue_impact: number
  confidence: number
  effort: string
  sources: string[]
  status: Status
  generated_at: string
  rejection_reason?: string
}

interface DailyRun {
  date: string
  status: string
  started_at: string
  completed_at?: string
  duration_ms?: number
  rec_count: number
  critical_count: number
  high_count: number
  sources_connected: string[]
  sources_missing: string[]
  email_sent: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const INR = (n: number) =>
  n >= 1e7 ? `₹${(n / 1e7).toFixed(2)} Cr` :
  n >= 1e5 ? `₹${(n / 1e5).toFixed(1)} L` :
  `₹${Math.round(n).toLocaleString("en-IN")}`

const PRIORITY_COLOR: Record<Priority, string> = {
  critical: "bg-red-100 text-red-700 border-red-200",
  high:     "bg-orange-100 text-orange-700 border-orange-200",
  medium:   "bg-yellow-100 text-yellow-700 border-yellow-200",
  low:      "bg-green-100 text-green-700 border-green-200",
}

const PRIORITY_BORDER: Record<Priority, string> = {
  critical: "border-l-red-500",
  high:     "border-l-orange-500",
  medium:   "border-l-yellow-500",
  low:      "border-l-green-500",
}

const TYPE_ICON: Record<RecType, React.ReactNode> = {
  oem_displacement:    <Flame size={14} />,
  dealer_recruit:      <Users size={14} />,
  procurement_target:  <Target size={14} />,
  search_campaign:     <Megaphone size={14} />,
  landing_page_create: <FileText size={14} />,
  creative_refresh:    <Zap size={14} />,
  budget_reallocate:   <BarChart3 size={14} />,
  negative_keyword:    <XCircle size={14} />,
  customer_match:      <Users size={14} />,
  content_create:      <Search size={14} />,
}

const TYPE_LABEL: Record<RecType, string> = {
  oem_displacement:    "OEM Displacement",
  dealer_recruit:      "Dealer Recruit",
  procurement_target:  "Procurement Target",
  search_campaign:     "Search Campaign",
  landing_page_create: "Landing Page",
  creative_refresh:    "Creative Refresh",
  budget_reallocate:   "Budget Realloc",
  negative_keyword:    "Negative Keyword",
  customer_match:      "Customer Match",
  content_create:      "Content Create",
}

const EFFORT_LABEL: Record<string, string> = {
  "5_min": "5 min", "30_min": "30 min",
  "1_hour": "1 hour", "half_day": "Half day", "project": "Project",
}

// ─── Rec Card ─────────────────────────────────────────────────────────────────

function RecCard({
  rec,
  onAction,
  actioning,
}: {
  rec: Rec
  onAction: (id: string, action: string) => Promise<void>
  actioning: string | null
}) {
  const [rejectReason, setRejectReason] = useState("")
  const [showReject, setShowReject] = useState(false)

  const isActioning = actioning === rec._id

  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 border-l-4 ${PRIORITY_BORDER[rec.priority]} p-4 shadow-sm`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded border ${PRIORITY_COLOR[rec.priority]}`}>
            {rec.priority.toUpperCase()}
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded border border-gray-200">
            {TYPE_ICON[rec.type]}
            {TYPE_LABEL[rec.type]}
          </span>
          {rec.sources.map((s) => (
            <span key={s} className="px-2 py-0.5 text-xs bg-blue-50 text-blue-600 rounded">
              {s}
            </span>
          ))}
        </div>
        <div className="text-right shrink-0">
          <div className="text-lg font-bold text-gray-900">{INR(rec.expected_revenue_impact)}</div>
          <div className="text-xs text-gray-500">est. impact</div>
        </div>
      </div>

      {/* Title */}
      <h3 className="mt-3 text-base font-semibold text-gray-900 leading-snug">{rec.title}</h3>

      {/* Why now */}
      <p className="mt-1 text-sm text-gray-700">{rec.why_now}</p>

      {/* Evidence */}
      <p className="mt-2 text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded">{rec.evidence}</p>

      {/* Action */}
      <div className="mt-3 flex items-start gap-2">
        <ArrowRight size={14} className="text-blue-600 mt-0.5 shrink-0" />
        <p className="text-sm text-blue-700 font-medium">{rec.expected_action}</p>
      </div>

      {/* Meta row */}
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Cpu size={11} />
          {rec.confidence}% confidence
        </span>
        <span className="flex items-center gap-1">
          <Clock size={11} />
          {EFFORT_LABEL[rec.effort] || rec.effort}
        </span>
      </div>

      {/* Confidence bar */}
      <div className="mt-2 h-1 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all"
          style={{ width: `${rec.confidence}%` }}
        />
      </div>

      {/* Action buttons (only for pending) */}
      {rec.status === "pending" && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => onAction(rec._id, "approved")}
            disabled={isActioning}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            <CheckCircle2 size={13} />
            Approve
          </button>
          <button
            onClick={() => onAction(rec._id, "deferred")}
            disabled={isActioning}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 border border-gray-300 disabled:opacity-50"
          >
            <Pause size={13} />
            Defer
          </button>
          {showReject ? (
            <div className="flex gap-2 items-center w-full mt-1">
              <input
                type="text"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason (optional)"
                className="flex-1 text-xs border border-gray-300 rounded px-2 py-1.5"
              />
              <button
                onClick={() => { onAction(rec._id, "rejected"); setShowReject(false) }}
                disabled={isActioning}
                className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                Confirm Reject
              </button>
              <button onClick={() => setShowReject(false)} className="text-xs text-gray-500 underline">
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowReject(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-red-50 text-red-600 rounded-md hover:bg-red-100 border border-red-200"
            >
              <XCircle size={13} />
              Reject
            </button>
          )}
        </div>
      )}

      {/* Status badge for non-pending */}
      {rec.status !== "pending" && (
        <div className={`mt-3 inline-flex items-center gap-1 text-xs px-2 py-1 rounded ${
          rec.status === "approved" ? "bg-green-50 text-green-700" :
          rec.status === "rejected" ? "bg-red-50 text-red-700" :
          rec.status === "applied" ? "bg-blue-50 text-blue-700" :
          "bg-gray-100 text-gray-600"
        }`}>
          {rec.status === "approved" && <CheckCircle2 size={11} />}
          {rec.status === "rejected" && <XCircle size={11} />}
          {rec.status === "deferred" && <Pause size={11} />}
          <span className="capitalize">{rec.status}</span>
          {rec.rejection_reason && ` — ${rec.rejection_reason}`}
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function RevenueDashboardPage() {
  const [recs, setRecs] = useState<Rec[]>([])
  const [run, setRun] = useState<DailyRun | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [actioning, setActioning] = useState<string | null>(null)
  const [filter, setFilter] = useState<Status | "all">("pending")
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/growth/director/recommendations${filter !== "all" ? `?status=${filter}` : ""}`)
      const data = await res.json()
      setRecs(data.recs || [])
      setRun(data.run || null)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { load() }, [load])

  async function handleRun(force = false) {
    setRunning(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/growth/director/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || "Run failed")
      await load()
    } catch (e) {
      setError(String(e))
    } finally {
      setRunning(false)
    }
  }

  async function handleAction(id: string, action: string) {
    setActioning(id)
    try {
      await fetch(`/api/admin/growth/director/approvals/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      await load()
    } catch (e) {
      setError(String(e))
    } finally {
      setActioning(null)
    }
  }

  // Stats
  const pendingRecs = recs.filter((r) => r.status === "pending")
  const pendingRevenue = pendingRecs.reduce((s, r) => s + r.expected_revenue_impact, 0)
  const criticalCount = pendingRecs.filter((r) => r.priority === "critical").length

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp size={22} className="text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">Revenue Director</h1>
            {criticalCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-bold bg-red-600 text-white rounded-full animate-pulse">
                {criticalCount} CRITICAL
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            Autonomous daily revenue intelligence — runs at 07:00 AM IST
            {run?.completed_at && ` · Last run ${new Date(run.completed_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => load()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            onClick={() => handleRun(true)}
            disabled={running}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {running ? <RefreshCw size={13} className="animate-spin" /> : <Zap size={13} />}
            {running ? "Running…" : "Run Now"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700 flex items-start gap-2">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="text-2xl font-bold text-gray-900">{pendingRecs.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">Pending decisions</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="text-2xl font-bold text-orange-600">{INR(pendingRevenue)}</div>
          <div className="text-xs text-gray-500 mt-0.5">Estimated impact</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="text-2xl font-bold text-gray-900">
            {run?.sources_connected?.length || 0}/{((run?.sources_connected?.length || 0) + (run?.sources_missing?.length || 0)) || "—"}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">Sources connected</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className={`text-2xl font-bold ${run?.email_sent ? "text-green-600" : "text-gray-400"}`}>
            {run?.email_sent ? "Sent" : "—"}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">Morning brief</div>
        </div>
      </div>

      {/* Source health */}
      {run && (
        <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg flex flex-wrap gap-3 text-xs">
          {(run.sources_connected || []).map((s) => (
            <span key={s} className="inline-flex items-center gap-1 text-green-700">
              <CheckCircle2 size={11} />
              {s}
            </span>
          ))}
          {(run.sources_missing || []).map((s) => (
            <span key={s} className="inline-flex items-center gap-1 text-red-600">
              <XCircle size={11} />
              {s} (not connected)
            </span>
          ))}
          {run.duration_ms && (
            <span className="ml-auto text-gray-400">
              Completed in {(run.duration_ms / 1000).toFixed(1)}s
            </span>
          )}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-lg w-fit">
        {(["pending", "approved", "deferred", "rejected", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize ${
              filter === f ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Recommendations */}
      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
          <RefreshCw size={18} className="animate-spin mr-2" /> Loading…
        </div>
      ) : recs.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-10 text-center">
          <DollarSign size={32} className="text-gray-300 mx-auto mb-3" />
          {filter === "pending" ? (
            <>
              <p className="text-gray-500 font-medium">No pending recommendations</p>
              <p className="text-sm text-gray-400 mt-1">
                {run ? `Last run: ${run.date}` : "Click Run Now to generate today's intelligence."}
              </p>
              <button
                onClick={() => handleRun(true)}
                disabled={running}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                <Zap size={14} />
                {running ? "Running…" : "Generate Recommendations"}
              </button>
            </>
          ) : (
            <p className="text-gray-400">No {filter} recommendations</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {recs.map((rec) => (
            <RecCard key={rec._id} rec={rec} onAction={handleAction} actioning={actioning} />
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-gray-200 text-xs text-gray-400 flex items-center justify-between">
        <span>All recommendations require founder approval before execution — no changes are made automatically.</span>
        <div className="flex items-center gap-1">
          <ChevronRight size={11} />
          <a href="/admin/growth/fogging" className="hover:text-gray-600">Fogging Intelligence</a>
        </div>
      </div>
    </div>
  )
}
