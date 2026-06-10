"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import {
  CheckCircle2, AlertTriangle, XCircle, Clock, TrendingUp,
  ChevronRight, Loader2, RefreshCw, Zap, Target, Shield,
  Users, MessageSquare, FileText, BarChart2,
} from "lucide-react"
import type { DailyBriefing, ActionItem, RiskItem, OpportunityItem } from "@/lib/growth-os/user-success/daily-briefing"
import type { ReadinessResult } from "@/lib/growth-os/user-success/readiness-checker"

// ── Helpers ──────────────────────────────────────────────────────────────────

function ago(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 3_600_000)  return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

const IMPACT_COLORS = {
  high:   "bg-red-50 text-red-700 border-red-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  low:    "bg-gray-50 text-gray-600 border-gray-200",
} as const

const PRIORITY_ICON = {
  urgent:    <Zap size={12} className="text-red-500" />,
  important: <Target size={12} className="text-amber-500" />,
  this_week: <Clock size={12} className="text-blue-500" />,
} as const

const STATUS_ICON: Record<string, React.ReactNode> = {
  ok:      <CheckCircle2 size={14} className="text-green-500" />,
  warning: <AlertTriangle size={14} className="text-amber-500" />,
  error:   <XCircle size={14} className="text-red-500" />,
  unknown: <Clock size={14} className="text-gray-400" />,
}

// ── Sub-components ───────────────────────────────────────────────────────────

function ActionCard({ action, index }: { action: ActionItem; index: number }) {
  const [running, setRunning] = useState(false)
  const [done,    setDone]    = useState(false)

  async function trigger() {
    if (!action.actionUrl || !action.actionUrl.startsWith("/api")) return
    setRunning(true)
    try {
      await fetch(action.actionUrl, { method: "POST" })
      setDone(true)
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className={`rounded-xl border p-4 ${IMPACT_COLORS[action.impact]}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white shadow-sm flex items-center justify-center text-xs font-bold text-gray-500 mt-0.5">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            {PRIORITY_ICON[action.priority]}
            <span className="text-[10px] font-semibold uppercase tracking-wider opacity-70">
              {action.priority.replace("_", " ")} · {action.effort.replace("_", " ")}
            </span>
          </div>
          <p className="font-semibold text-sm leading-tight mb-1">{action.title}</p>
          <p className="text-xs opacity-80 mb-2">{action.why}</p>
          <p className="text-xs opacity-60 italic mb-3">Expected: {action.expectedOutcome}</p>
          <div className="flex gap-2 flex-wrap">
            {action.actionUrl?.startsWith("/api") ? (
              <button
                onClick={trigger}
                disabled={running || done}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-white rounded-lg shadow-sm border border-current/20 hover:shadow-md transition disabled:opacity-50"
              >
                {running ? <Loader2 size={10} className="animate-spin" /> : done ? <CheckCircle2 size={10} /> : <Zap size={10} />}
                {done ? "Done" : running ? "Running…" : "Run now"}
              </button>
            ) : action.actionUrl ? (
              <Link
                href={action.actionUrl}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-white rounded-lg shadow-sm border border-current/20 hover:shadow-md transition"
              >
                Go there <ChevronRight size={10} />
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

function RiskCard({ risk }: { risk: RiskItem }) {
  const color = risk.severity === "critical" ? "border-l-red-500 bg-red-50"
    : risk.severity === "high" ? "border-l-amber-500 bg-amber-50"
    : "border-l-yellow-400 bg-yellow-50"
  return (
    <div className={`border-l-4 rounded-r-lg p-3 ${color}`}>
      <p className="text-xs font-bold mb-0.5">{risk.title}</p>
      <p className="text-xs text-gray-600 mb-1">{risk.description}</p>
      <p className="text-[11px] text-gray-500">Fix: {risk.mitigation}</p>
      {risk.actionUrl && (
        <Link href={risk.actionUrl} className="text-[11px] font-medium text-blue-600 hover:underline mt-1 inline-flex items-center gap-1">
          Fix it <ChevronRight size={9} />
        </Link>
      )}
    </div>
  )
}

function OppCard({ opp }: { opp: OpportunityItem }) {
  const conf = opp.confidence === "high" ? "text-green-600" : opp.confidence === "medium" ? "text-amber-600" : "text-gray-500"
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <div className="flex items-start justify-between mb-1">
        <p className="font-semibold text-sm text-gray-900 flex-1">{opp.title}</p>
        <span className={`text-[10px] font-bold uppercase ml-2 ${conf}`}>{opp.confidence}</span>
      </div>
      <p className="text-xs text-gray-500 mb-2">{opp.description}</p>
      <p className="text-[11px] text-gray-400 mb-2 italic">Evidence: {opp.evidence}</p>
      {opp.actionUrl && (
        <Link href={opp.actionUrl} className="text-xs font-medium text-brand-600 hover:underline inline-flex items-center gap-1">
          Take action <ChevronRight size={10} />
        </Link>
      )}
    </div>
  )
}

function ReadinessBar({ result }: { result: ReadinessResult }) {
  const barColor = result.score >= 80 ? "bg-green-500"
    : result.score >= 50 ? "bg-amber-500"
    : "bg-red-500"

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">System Readiness</p>
        <span className="text-lg font-bold text-gray-900">{result.score}/100</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full mb-4">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${result.score}%` }}
        />
      </div>
      <div className="space-y-2">
        {Object.entries(result.systems).map(([key, sys]) => (
          <div key={key} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              {STATUS_ICON[sys.status]}
              <span className="text-gray-600 capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</span>
            </div>
            <span className={`font-medium ${sys.status === "ok" ? "text-green-600" : sys.status === "warning" ? "text-amber-600" : "text-red-600"}`}>
              {sys.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function FounderModePage() {
  const [briefing,   setBriefing]   = useState<DailyBriefing | null>(null)
  const [readiness,  setReadiness]  = useState<ReadinessResult | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<string>("")

  const load = useCallback(async (force = false) => {
    if (force) setRefreshing(true)
    try {
      const [br, rd] = await Promise.all([
        force
          ? fetch("/api/admin/growth/daily-briefing", { method: "POST" }).then(r => r.json()).then(r => r.briefing)
          : fetch("/api/admin/growth/daily-briefing").then(r => r.json()),
        fetch("/api/admin/growth/readiness").then(r => r.json()),
      ])
      setBriefing(br)
      setReadiness(rd)
      setLastRefresh(new Date().toISOString())
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 border-brand-600 animate-spin mx-auto mb-3 text-brand-600" />
          <p className="text-gray-400 text-sm">Preparing your daily briefing…</p>
        </div>
      </div>
    )
  }

  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })
  const risks      = briefing?.risks ?? []
  const actions    = briefing?.topActions ?? []
  const opps       = briefing?.opportunities ?? []
  const changed    = briefing?.whatChanged ?? []
  const criticals  = risks.filter(r => r.severity === "critical").length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Good morning</h1>
            <p className="text-sm text-gray-400">{today}</p>
          </div>
          <div className="flex items-center gap-3">
            {lastRefresh && (
              <span className="text-xs text-gray-400">Updated {ago(lastRefresh)}</span>
            )}
            <button
              onClick={() => load(true)}
              disabled={refreshing}
              className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 transition"
            >
              <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>
            <Link
              href="/admin/growth/dashboard"
              className="text-xs text-gray-400 hover:text-gray-600 transition"
            >
              Full dashboard →
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">

        {/* System health banner */}
        {criticals > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <XCircle size={18} className="text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-700">
              <strong>{criticals} critical issue{criticals > 1 ? "s" : ""} need attention:</strong>{" "}
              {risks.filter(r => r.severity === "critical").map(r => r.title).join("; ")}
            </p>
          </div>
        )}

        {briefing?.readinessSummary && criticals === 0 && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <CheckCircle2 size={18} className="text-green-500 flex-shrink-0" />
            <p className="text-sm text-green-700">{briefing.readinessSummary}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left column: actions */}
          <div className="lg:col-span-2 space-y-4">
            {/* Today's actions */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Zap size={14} className="text-brand-600" />
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                  Today&apos;s Actions
                </h2>
                <span className="text-xs text-gray-400">({actions.length} items)</span>
              </div>
              {actions.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-sm text-gray-400">
                  No urgent actions today. Check the approval queue.
                </div>
              ) : (
                <div className="space-y-3">
                  {actions.map((a, i) => (
                    <ActionCard key={a.id} action={a} index={i} />
                  ))}
                </div>
              )}
            </section>

            {/* Risks */}
            {risks.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Shield size={14} className="text-red-500" />
                  <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                    Active Risks
                  </h2>
                </div>
                <div className="space-y-2">
                  {risks.map((r, i) => <RiskCard key={i} risk={r} />)}
                </div>
              </section>
            )}

            {/* What changed */}
            {changed.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <RefreshCw size={14} className="text-gray-400" />
                  <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                    What Changed Today
                  </h2>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                  {changed.map((c, i) => (
                    <div key={i} className="px-4 py-3 flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-2 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-gray-800">{c.what}</p>
                        <p className="text-[11px] text-gray-400">{c.impact}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right column: readiness + opportunities */}
          <div className="space-y-4">
            {readiness && <ReadinessBar result={readiness} />}

            {/* Quick links */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Quick Links</p>
              <div className="space-y-1">
                {[
                  { label: "Approval Queue",      url: "/admin/growth/ads/approval-queue",        icon: <CheckCircle2 size={13} /> },
                  { label: "Lead Intelligence",   url: "/admin/growth/ads/lead-value-intelligence", icon: <TrendingUp size={13} /> },
                  { label: "State Intelligence",  url: "/admin/growth/ads/state-intelligence",    icon: <BarChart2 size={13} /> },
                  { label: "Keyword Pipeline",    url: "/admin/growth/ads/keyword-intelligence",  icon: <Target size={13} /> },
                  { label: "Leads",               url: "/admin/growth/leads",                     icon: <Users size={13} /> },
                  { label: "Dealer Opportunities",url: "/admin/growth/dealers",                   icon: <MessageSquare size={13} /> },
                  { label: "Brochure Analytics",  url: "/admin/growth/analytics",                 icon: <FileText size={13} /> },
                ].map(item => (
                  <Link
                    key={item.url}
                    href={item.url}
                    className="flex items-center gap-2 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg px-2 py-1.5 transition"
                  >
                    <span className="text-gray-400">{item.icon}</span>
                    {item.label}
                    <ChevronRight size={10} className="ml-auto text-gray-300" />
                  </Link>
                ))}
              </div>
            </div>

            {/* Opportunities */}
            {opps.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp size={14} className="text-green-500" />
                  <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                    Opportunities
                  </h2>
                </div>
                <div className="space-y-3">
                  {opps.map((o, i) => <OppCard key={i} opp={o} />)}
                </div>
              </section>
            )}

            {/* Next actions from readiness */}
            {readiness?.nextActions && readiness.nextActions.some(a => a.impact === "high") && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-amber-700 mb-2 uppercase tracking-wider">Setup Required</p>
                <div className="space-y-2">
                  {readiness.nextActions.filter(a => a.impact === "high").slice(0, 2).map((a, i) => (
                    <div key={i} className="text-xs">
                      <p className="font-medium text-amber-800">{a.action}</p>
                      <p className="text-amber-600">{a.why}</p>
                      {a.setupUrl && (
                        <Link href={a.setupUrl} className="text-amber-700 font-medium hover:underline inline-flex items-center gap-0.5 mt-0.5">
                          Fix it <ChevronRight size={9} />
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
