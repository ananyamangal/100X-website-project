"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Zap, RefreshCw, CheckCircle, AlertTriangle, XCircle,
  Megaphone, FileText, Layers, TrendingUp, BarChart3,
  ArrowRight, ExternalLink, Filter, Shield, ChevronDown,
  ChevronUp, Rocket, Eye, Target,
} from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────

type AssetType   = "campaign" | "seo_article" | "landing_page" | "director_rec"
type ActionType  = "deploy" | "approve" | "publish" | "monitor" | "execute"
type AssetSource = "ads" | "seo" | "landing" | "director"

interface QueueItem {
  assetId:        string
  assetType:      AssetType
  source:         AssetSource
  title:          string
  opportunity:    string
  revenueImpact:  number
  status:         string
  requiredAction: ActionType
  actionLabel:    string
  actionEndpoint: string
  actionPayload:  Record<string, unknown>
  priority:       "critical" | "high" | "medium" | "low"
  createdAt:      string
  meta?:          Record<string, unknown>
}

interface Summary {
  totalItems:         number
  campaignsReady:     number
  articlesReady:      number
  pagesReady:         number
  monitoring:         number
  directorRecs:       number
  totalRevenueImpact: number
}

interface ExecutionData { summary: Summary; queue: QueueItem[] }

// ── Config ────────────────────────────────────────────────────────────────────

const ASSET_CONFIG: Record<AssetType, {
  label: string; icon: React.ComponentType<{ size?: number; className?: string }>; color: string; bg: string
}> = {
  campaign:     { label: "Campaign",     icon: Megaphone,  color: "text-emerald-400", bg: "bg-emerald-950/30 border-emerald-800/40" },
  seo_article:  { label: "SEO Article",  icon: FileText,   color: "text-blue-400",    bg: "bg-blue-950/30 border-blue-800/40" },
  landing_page: { label: "Landing Page", icon: Layers,     color: "text-purple-400",  bg: "bg-purple-950/30 border-purple-800/40" },
  director_rec: { label: "Revenue Rec",  icon: TrendingUp, color: "text-amber-400",   bg: "bg-amber-950/30 border-amber-800/40" },
}

const ACTION_CONFIG: Record<ActionType, { label: string; color: string; badge: string }> = {
  deploy:  { label: "Deploy",   color: "bg-emerald-700 hover:bg-emerald-600 text-white",   badge: "bg-emerald-900/40 text-emerald-300 border-emerald-700" },
  approve: { label: "Approve",  color: "bg-blue-700 hover:bg-blue-600 text-white",         badge: "bg-blue-900/40 text-blue-300 border-blue-700" },
  publish: { label: "Publish",  color: "bg-teal-700 hover:bg-teal-600 text-white",         badge: "bg-teal-900/40 text-teal-300 border-teal-700" },
  execute: { label: "Execute",  color: "bg-amber-700 hover:bg-amber-600 text-white",       badge: "bg-amber-900/40 text-amber-300 border-amber-700" },
  monitor: { label: "Monitor",  color: "bg-gray-700 hover:bg-gray-600 text-white",         badge: "bg-gray-800 text-gray-400 border-gray-700" },
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: "text-red-400 border-red-800 bg-red-950/20",
  high:     "text-orange-400 border-orange-800 bg-orange-950/20",
  medium:   "text-amber-400 border-amber-800 bg-amber-950/20",
  low:      "text-gray-500 border-gray-700 bg-gray-900",
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtRevenue(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)} Cr`
  if (n >= 100000)   return `₹${(n / 100000).toFixed(1)} L`
  if (n >= 1000)     return `₹${(n / 1000).toFixed(0)}K`
  return `₹${n}`
}

// ── Summary strip ─────────────────────────────────────────────────────────────

function SummaryStrip({ s }: { s: Summary }) {
  const tiles = [
    { label: "Campaigns Ready",  value: s.campaignsReady,  action: "deploy",  color: "text-emerald-400" },
    { label: "Articles Ready",   value: s.articlesReady,   action: "approve/publish", color: "text-blue-400" },
    { label: "Pages Ready",      value: s.pagesReady,      action: "approve/publish", color: "text-purple-400" },
    { label: "Monitoring",       value: s.monitoring,      action: "monitor", color: "text-gray-500" },
    { label: "Director Recs",    value: s.directorRecs,    action: "execute", color: "text-amber-400" },
    { label: "Revenue Pipeline", value: fmtRevenue(s.totalRevenueImpact), action: "", color: "text-brand-400" },
  ]
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
      {tiles.map(t => (
        <div key={t.label} className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
          <p className={`text-xl font-bold ${t.color}`}>{t.value}</p>
          <p className="text-[10px] text-gray-600 mt-0.5 leading-tight">{t.label}</p>
        </div>
      ))}
    </div>
  )
}

// ── Queue item card ───────────────────────────────────────────────────────────

function QueueCard({
  item,
  onAction,
  actingId,
}: {
  item:      QueueItem
  onAction:  (item: QueueItem) => Promise<void>
  actingId:  string | null
}) {
  const [expanded, setExpanded] = useState(false)
  const asset  = ASSET_CONFIG[item.assetType]
  const action = ACTION_CONFIG[item.requiredAction]
  const AssetIcon = asset.icon
  const isActing = actingId === item.assetId
  const isMonitor = item.requiredAction === "monitor"

  const moduleUrl: Record<AssetSource, string> = {
    ads:      "/admin/growth/ads/health",
    seo:      "/admin/growth/seo/execution",
    landing:  "/admin/growth/landing",
    director: "/admin/growth/director",
  }

  return (
    <div className={`bg-gray-900 border rounded-xl overflow-hidden transition-colors ${
      item.priority === "critical" ? "border-red-900/60" :
      item.priority === "high"     ? "border-orange-900/40" : "border-gray-800"
    }`}>
      {/* Main row */}
      <div className="px-5 py-3.5 flex items-center gap-4">
        {/* Asset type icon */}
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 border ${asset.bg}`}>
          <AssetIcon size={15} className={asset.color} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="text-sm font-semibold text-white truncate max-w-sm">{item.title}</span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${action.badge}`}>
              {asset.label}
            </span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${PRIORITY_COLORS[item.priority]}`}>
              {item.priority}
            </span>
          </div>
          <div className="flex gap-3 text-[11px] text-gray-600 flex-wrap">
            {item.opportunity && <span className="truncate max-w-48">{item.opportunity}</span>}
            {item.revenueImpact > 0 && (
              <span className="flex items-center gap-1 text-brand-500">
                <BarChart3 size={9} />{fmtRevenue(item.revenueImpact)} impact
              </span>
            )}
            <span className="text-gray-700">{item.status.replace(/_/g, " ")}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setExpanded(e => !e)}
            className="p-1.5 text-gray-600 hover:text-gray-300 rounded-lg hover:bg-gray-800"
          >
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          <a
            href={moduleUrl[item.source]}
            className="p-1.5 text-gray-600 hover:text-gray-300 rounded-lg hover:bg-gray-800"
            title="Open in specialist module"
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink size={13} />
          </a>
          <button
            onClick={() => onAction(item)}
            disabled={isActing}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-lg transition-colors disabled:opacity-60 ${action.color}`}
          >
            {isActing
              ? <><RefreshCw size={11} className="animate-spin" />Working…</>
              : isMonitor
              ? <><Eye size={11} />{item.actionLabel}</>
              : <><Rocket size={11} />{item.actionLabel}</>
            }
          </button>
        </div>
      </div>

      {/* Expanded meta */}
      {expanded && item.meta && (
        <div className="border-t border-gray-800 px-5 py-3 bg-gray-950 grid grid-cols-2 gap-x-8 gap-y-1.5 sm:grid-cols-4">
          {Object.entries(item.meta).map(([k, v]) => v != null && v !== "" && (
            <div key={k}>
              <p className="text-[10px] text-gray-600 capitalize">{k.replace(/_/g, " ")}</p>
              <p className="text-[11px] text-gray-300 font-medium truncate">{String(v)}</p>
            </div>
          ))}
          <div>
            <p className="text-[10px] text-gray-600">Created</p>
            <p className="text-[11px] text-gray-300">{new Date(item.createdAt).toLocaleDateString("en-IN")}</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ExecutionHubPage() {
  const [data, setData]         = useState<ExecutionData | null>(null)
  const [loading, setLoading]   = useState(true)
  const [actingId, setActingId] = useState<string | null>(null)
  const [msg, setMsg]           = useState<{ type: "ok" | "error"; text: string } | null>(null)
  const [filterAction, setFilterAction] = useState<string>("all")
  const [filterSource, setFilterSource] = useState<string>("all")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/growth/execution")
      const d   = await res.json() as ExecutionData
      setData(d)
    } catch (e) {
      setMsg({ type: "error", text: String(e) })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleAction = async (item: QueueItem) => {
    // Monitor = navigate to module, not an API call
    if (item.requiredAction === "monitor" || item.requiredAction === "execute") {
      window.open(
        item.source === "ads"      ? "/admin/growth/ads/health" :
        item.source === "seo"      ? "/admin/growth/seo/execution" :
        item.source === "landing"  ? "/admin/growth/landing" :
        "/admin/growth/director",
        "_blank"
      )
      return
    }

    setActingId(item.assetId)
    setMsg(null)
    try {
      const res = await fetch(item.actionEndpoint, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(item.actionPayload),
      })
      const d = await res.json() as { ok?: boolean; error?: string; note?: string; publishedAt?: string; url?: string }
      if (res.ok && (d.ok !== false)) {
        setMsg({
          type: "ok",
          text: d.note ?? (d.url ? `Published to ${d.url}` : `${item.actionLabel} complete for "${item.title}"`)
        })
        await load()
      } else {
        setMsg({ type: "error", text: d.error ?? `${item.actionLabel} failed` })
      }
    } catch (e) {
      setMsg({ type: "error", text: String(e) })
    } finally {
      setActingId(null)
    }
  }

  const queue = (data?.queue ?? []).filter(item =>
    (filterAction === "all" || item.requiredAction === filterAction) &&
    (filterSource === "all" || item.source === filterSource)
  )

  const actionCounts = (data?.queue ?? []).reduce((acc, i) => {
    acc[i.requiredAction] = (acc[i.requiredAction] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Zap size={22} className="text-brand-400" />
              <h1 className="text-2xl font-bold">Execution Hub</h1>
              <span className="text-[10px] bg-brand-900/40 text-brand-300 border border-brand-700 px-2 py-0.5 rounded-full font-bold">v2</span>
            </div>
            <p className="text-gray-400 text-sm">All executable assets in one queue — Campaigns · SEO Articles · Landing Pages · Revenue Recs</p>
          </div>
          <button onClick={load} className="p-2 text-gray-500 hover:text-white border border-gray-800 rounded-lg">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Governance */}
        <div className="flex items-start gap-3 bg-gray-900 border border-gray-800 rounded-xl p-4">
          <Shield size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-gray-400">
            <strong className="text-gray-300">Approval-gated.</strong>{" "}
            Deploy and Publish buttons execute against live systems. Approve/Monitor actions are safe previews.
            All actions are logged to <code className="text-gray-500">growth_os_logs</code>.
          </p>
        </div>

        {/* Summary */}
        {data?.summary && <SummaryStrip s={data.summary} />}

        {/* Message */}
        {msg && (
          <div className={`flex items-start gap-3 p-4 rounded-xl border text-sm ${
            msg.type === "error"
              ? "bg-red-950/20 border-red-800/50 text-red-400"
              : "bg-emerald-950/20 border-emerald-800/50 text-emerald-400"
          }`}>
            {msg.type === "ok"
              ? <CheckCircle size={16} className="flex-shrink-0 mt-0.5" />
              : <XCircle    size={16} className="flex-shrink-0 mt-0.5" />}
            {msg.text}
          </div>
        )}

        {/* ── Filters ── */}
        {data && queue.length > 0 && (
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1 text-[10px] text-gray-600">
              <Filter size={10} />Action
            </div>
            {["all", "deploy", "approve", "publish", "execute", "monitor"].map(a => (
              <button
                key={a}
                onClick={() => setFilterAction(a)}
                className={`text-[10px] px-2.5 py-1 rounded-lg border transition-colors ${
                  filterAction === a
                    ? "border-brand-600 text-brand-300 bg-brand-900/20"
                    : "border-gray-800 text-gray-500 hover:border-gray-700"
                }`}
              >
                {a === "all" ? "All" : a}
                {a !== "all" && actionCounts[a] ? ` (${actionCounts[a]})` : ""}
              </button>
            ))}
            <div className="w-px bg-gray-800 h-5" />
            <div className="flex items-center gap-1 text-[10px] text-gray-600">
              <Filter size={10} />Source
            </div>
            {["all", "ads", "seo", "landing", "director"].map(s => (
              <button
                key={s}
                onClick={() => setFilterSource(s)}
                className={`text-[10px] px-2.5 py-1 rounded-lg border transition-colors ${
                  filterSource === s
                    ? "border-brand-600 text-brand-300 bg-brand-900/20"
                    : "border-gray-800 text-gray-500 hover:border-gray-700"
                }`}
              >
                {s === "all" ? "All Sources" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        )}

        {/* ── Queue ── */}
        {queue.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] text-gray-600 font-semibold uppercase tracking-wider">
              {queue.length} Item{queue.length !== 1 ? "s" : ""} in Queue
            </p>
            {queue.map(item => (
              <QueueCard
                key={`${item.source}-${item.assetId}`}
                item={item}
                onAction={handleAction}
                actingId={actingId}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && data && queue.length === 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-16 text-center">
            <CheckCircle size={40} className="text-emerald-800 mx-auto mb-4" />
            <p className="text-gray-300 text-base font-semibold">Queue is clear</p>
            <p className="text-gray-600 text-sm mt-2 max-w-sm mx-auto">
              No campaigns, articles, or pages are waiting for action.
              Generate new assets from the factory modules below.
            </p>
          </div>
        )}

        {loading && (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-900 rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {/* Module shortcuts */}
        <div className="border-t border-gray-800 pt-4">
          <p className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold mb-3">Specialist Modules</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { href: "/admin/growth/ads/health",     label: "Ads Health",         icon: Megaphone, color: "text-emerald-400" },
              { href: "/admin/growth/seo/execution",  label: "SEO Factory",        icon: FileText,  color: "text-blue-400" },
              { href: "/admin/growth/landing",        label: "LP Factory",         icon: Layers,    color: "text-purple-400" },
              { href: "/admin/growth/director",       label: "Revenue Director",   icon: TrendingUp, color: "text-amber-400" },
            ].map(({ href, label, icon: Icon, color }) => (
              <a
                key={href}
                href={href}
                className="flex items-center gap-2 px-3 py-2.5 bg-gray-900 border border-gray-800 rounded-xl hover:border-gray-700 text-xs text-gray-400 hover:text-white transition-colors"
              >
                <Icon size={13} className={color} />
                {label}
                <ArrowRight size={11} className="ml-auto text-gray-700" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
