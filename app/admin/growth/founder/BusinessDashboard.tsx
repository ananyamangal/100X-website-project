"use client"

import { useCallback, useEffect, useState } from "react"
import {
  RefreshCw, TrendingUp, TrendingDown, Minus,
  AlertTriangle, AlertCircle, Info,
  Building2, Truck, Factory, Bug, Leaf, HelpCircle,
  Globe, Search, Megaphone, MessageCircle, Navigation,
  Clock, CheckCircle, FileText, Star,
} from "lucide-react"

// ── Types ──────────────────────────────────────────────────────────────────────

interface DemandScore {
  score: number
  label: string
  trend: "rising" | "stable" | "falling"
  wowChange: number
  breakdown: { volume: number; quality: number; trend: number; diversity: number }
}

interface Classification {
  today: Record<string, number>
  rolling7: Record<string, number>
  rolling30: Record<string, number>
  totalToday: number
  total7d: number
  total30d: number
}

interface Pipeline {
  rfqPending: number
  dealerPending: number
  highValue: number
  quotedWaiting: number
  newLast24h: number
  oldestUnread: string | null
}

interface SourceRow {
  key: string
  name: string
  leads7d: number
  leads30d: number
  pct7d: number
  pct30d: number
}

interface Alert {
  id: string
  type: string
  severity: "critical" | "warning" | "info"
  title: string
  detail: string
}

interface OutcomesData {
  demandScore:    DemandScore
  classification: Classification
  pipeline:       Pipeline
  sources:        SourceRow[]
  alerts:         Alert[]
  generatedAt:    string
}

// ── Config ─────────────────────────────────────────────────────────────────────

const LEAD_TYPES: { key: string; label: string; icon: React.ReactNode; premium: boolean }[] = [
  { key: "government",  label: "Government",  icon: <Building2   size={12} />, premium: true  },
  { key: "dealer",      label: "Dealer",      icon: <Truck       size={12} />, premium: true  },
  { key: "oem",         label: "OEM",         icon: <Factory     size={12} />, premium: true  },
  { key: "pest_control",label: "Pest Control",icon: <Bug         size={12} />, premium: false },
  { key: "farmer",      label: "Farmer",      icon: <Leaf        size={12} />, premium: false },
  { key: "unknown",     label: "Unknown",     icon: <HelpCircle  size={12} />, premium: false },
]

const SOURCE_ICONS: Record<string, React.ReactNode> = {
  google_ads: <Megaphone  size={12} />,
  organic:    <Search     size={12} />,
  gem:        <Star       size={12} />,
  whatsapp:   <MessageCircle size={12} />,
  direct:     <Navigation size={12} />,
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function hoursAgo(iso: string | null): number | null {
  if (!iso) return null
  return Math.round((Date.now() - new Date(iso).getTime()) / 3_600_000)
}

function ago(iso: string): string {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 3600)  return `${Math.round(s / 60)}m ago`
  if (s < 86400) return `${Math.round(s / 3600)}h ago`
  return `${Math.round(s / 86400)}d ago`
}

// ── Score ring ─────────────────────────────────────────────────────────────────

function ScoreRing({ score, label, trend, wowChange }: {
  score: number; label: string; trend: DemandScore["trend"]; wowChange: number
}) {
  const r   = 38
  const circ = 2 * Math.PI * r
  const fill = (score / 100) * circ
  const color =
    score >= 80 ? "#16a34a" :
    score >= 60 ? "#2563eb" :
    score >= 40 ? "#d97706" :
    score >= 20 ? "#dc2626" :
                  "#9ca3af"

  const TrendIcon =
    trend === "rising"  ? TrendingUp   :
    trend === "falling" ? TrendingDown :
    Minus

  const wowColor =
    wowChange > 0  ? "text-green-600" :
    wowChange < 0  ? "text-red-600"   :
    "text-gray-400"

  return (
    <div className="flex items-center gap-5">
      {/* SVG ring */}
      <div className="relative w-24 h-24 flex-shrink-0">
        <svg viewBox="0 0 90 90" className="w-full h-full -rotate-90">
          <circle cx="45" cy="45" r={r} fill="none" stroke="#f3f4f6" strokeWidth="7" />
          <circle
            cx="45" cy="45" r={r} fill="none"
            stroke={color} strokeWidth="7" strokeLinecap="round"
            strokeDasharray={`${fill} ${circ}`}
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black tabular-nums leading-none" style={{ color }}>
            {score}
          </span>
          <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wide mt-0.5">
            /100
          </span>
        </div>
      </div>

      {/* Text info */}
      <div className="space-y-1.5">
        <p className="text-lg font-bold text-gray-900 leading-tight">{label}</p>
        <p className="text-xs text-gray-500">Demand this week</p>
        <div className={`inline-flex items-center gap-1.5 text-sm font-semibold ${wowColor}`}>
          <TrendIcon size={14} />
          <span>
            {wowChange > 0 ? "+" : ""}{wowChange}% vs last week
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Score breakdown ────────────────────────────────────────────────────────────

function ScoreBreakdown({ breakdown }: { breakdown: DemandScore["breakdown"] }) {
  const bars = [
    { label: "Volume",    pts: breakdown.volume,    max: 40, tip: "Leads this week (max 40pt)" },
    { label: "Quality",   pts: breakdown.quality,   max: 30, tip: "Gov/Dealer/OEM mix (max 30pt)" },
    { label: "Trend",     pts: breakdown.trend,     max: 20, tip: "Week-over-week direction (max 20pt)" },
    { label: "Diversity", pts: breakdown.diversity, max: 10, tip: "Number of lead sources (max 10pt)" },
  ]
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
      {bars.map(b => (
        <div key={b.label} title={b.tip}>
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[10px] text-gray-400">{b.label}</span>
            <span className="text-[10px] font-bold text-gray-600 tabular-nums">{b.pts}/{b.max}</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-500 rounded-full transition-all"
              style={{ width: `${(b.pts / b.max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Alert banner ───────────────────────────────────────────────────────────────

function AlertBanner({ alert }: { alert: Alert }) {
  const cfg =
    alert.severity === "critical"
      ? { bg: "bg-red-50 border-red-300",     icon: <AlertCircle   size={13} className="text-red-500 flex-shrink-0 mt-0.5" /> }
    : alert.severity === "warning"
      ? { bg: "bg-amber-50 border-amber-300", icon: <AlertTriangle size={13} className="text-amber-500 flex-shrink-0 mt-0.5" /> }
      : { bg: "bg-blue-50 border-blue-200",   icon: <Info          size={13} className="text-blue-400 flex-shrink-0 mt-0.5" /> }

  return (
    <div className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 ${cfg.bg}`}>
      {cfg.icon}
      <div className="min-w-0">
        <p className={`text-xs font-semibold leading-tight ${
          alert.severity === "critical" ? "text-red-800" :
          alert.severity === "warning"  ? "text-amber-800" : "text-blue-800"
        }`}>{alert.title}</p>
        <p className="text-[11px] text-gray-500 mt-0.5">{alert.detail}</p>
      </div>
    </div>
  )
}

// ── Classification strip ────────────────────────────────────────────────────────

function ClassificationStrip({ classification }: { classification: Classification }) {
  const { rolling7, total7d } = classification
  const total = total7d || 1

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Lead Classification</p>
        <span className="text-[10px] text-gray-400">{total7d} leads / 7d</span>
      </div>
      <div className="space-y-1.5">
        {LEAD_TYPES.filter(t => (rolling7[t.key] || 0) > 0 || t.premium).map(type => {
          const count = rolling7[type.key] || 0
          const pct   = Math.round((count / total) * 100)
          return (
            <div key={type.key} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 w-28 flex-shrink-0 ${type.premium ? "text-gray-700" : "text-gray-400"}`}>
                <span className={type.premium ? "text-brand-600" : "text-gray-300"}>{type.icon}</span>
                <span className={`text-[11px] font-medium truncate ${type.premium ? "text-gray-700" : "text-gray-400"}`}>
                  {type.label}
                </span>
              </div>
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${type.premium ? "bg-brand-500" : "bg-gray-300"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className={`text-[11px] font-bold tabular-nums w-4 text-right flex-shrink-0 ${count > 0 ? "text-gray-800" : "text-gray-200"}`}>
                  {count || "—"}
                </span>
              </div>
            </div>
          )
        })}
      </div>
      <p className="text-[10px] text-gray-400 mt-2">
        Premium (Gov/Dealer/OEM): <span className="font-semibold text-gray-600">
          {(rolling7.government || 0) + (rolling7.dealer || 0) + (rolling7.oem || 0)}
        </span> of {total7d}
      </p>
    </div>
  )
}

// ── Pipeline row ───────────────────────────────────────────────────────────────

function PipelineTile({ icon, label, count, sub, urgent }: {
  icon: React.ReactNode; label: string; count: number; sub?: string; urgent?: boolean
}) {
  return (
    <div className={`rounded-lg border p-3 flex flex-col gap-1 ${
      urgent && count > 0 ? "border-amber-200 bg-amber-50" : "border-gray-200 bg-white"
    }`}>
      <div className={`flex items-center gap-1.5 ${urgent && count > 0 ? "text-amber-600" : "text-gray-400"}`}>
        {icon}
        <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
      </div>
      <p className={`text-xl font-black tabular-nums leading-none ${count === 0 ? "text-gray-200" : urgent ? "text-amber-700" : "text-gray-900"}`}>
        {count === 0 ? "—" : count}
      </p>
      {sub && <p className="text-[10px] text-gray-400">{sub}</p>}
    </div>
  )
}

// ── Source ROI table ────────────────────────────────────────────────────────────

function SourceTable({ sources }: { sources: SourceRow[] }) {
  const max7d = Math.max(...sources.map(s => s.leads7d), 1)

  return (
    <div>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Source ROI</p>
      <div className="space-y-2">
        {sources.map(s => (
          <div key={s.key} className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 w-28 flex-shrink-0 text-gray-500">
              <span className="text-gray-400">{SOURCE_ICONS[s.key] || <Globe size={12} />}</span>
              <span className="text-[11px] font-medium">{s.name}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-500 rounded-full transition-all"
                  style={{ width: `${(s.leads7d / max7d) * 100}%` }}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 w-20 text-right">
              <span className={`text-[11px] font-bold tabular-nums ${s.leads7d > 0 ? "text-gray-800" : "text-gray-200"}`}>
                {s.leads7d || "—"}
              </span>
              <span className="text-[10px] text-gray-400">7d</span>
              <span className={`text-[10px] tabular-nums ${s.leads30d > 0 ? "text-gray-500" : "text-gray-200"}`}>
                {s.leads30d || "—"}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-1.5 text-[9px] text-gray-300 font-medium">
        <span>Source</span>
        <span className="mr-0 pr-0">7-day · 30-day leads</span>
      </div>
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────────

export default function BusinessDashboard() {
  const [data,    setData]    = useState<OutcomesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/growth/business-outcomes")
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setData(await res.json())
      setError(null)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const ds = data?.demandScore
  const cl = data?.classification
  const pl = data?.pipeline

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Business Outcomes</h3>
          <p className="text-[10px] text-gray-400 mt-0.5">Demand · Classification · Pipeline · Source</p>
        </div>
        <div className="flex items-center gap-3">
          {data && (
            <span className="text-[10px] text-gray-400">{ago(data.generatedAt)}</span>
          )}
          <button
            onClick={load} disabled={loading}
            className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-800 border border-gray-200 px-2.5 py-1 rounded-lg hover:bg-gray-50 disabled:opacity-40"
          >
            <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      <div className="p-5 space-y-5">

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-xs text-red-700">
            {error}
          </div>
        )}

        {loading && !data && (
          <div className="space-y-3">
            <div className="h-28 bg-gray-100 rounded-xl animate-pulse" />
            <div className="h-20 bg-gray-100 rounded-xl animate-pulse" />
            <div className="h-32 bg-gray-100 rounded-xl animate-pulse" />
          </div>
        )}

        {data && ds && cl && pl && (
          <>
            {/* ── 1. Demand Score ─────────────────────────────────────── */}
            <div className="rounded-xl border border-gray-200 p-4 space-y-4">
              <ScoreRing
                score={ds.score}
                label={ds.label}
                trend={ds.trend}
                wowChange={ds.wowChange}
              />
              <ScoreBreakdown breakdown={ds.breakdown} />
            </div>

            {/* ── 2. Alerts ────────────────────────────────────────────── */}
            {data.alerts.length > 0 && (
              <div className="space-y-2">
                {data.alerts.map(a => <AlertBanner key={a.id} alert={a} />)}
              </div>
            )}

            {data.alerts.length === 0 && (
              <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                <CheckCircle size={13} className="flex-shrink-0" />
                No alerts — all systems normal
              </div>
            )}

            {/* ── 3. Pipeline ──────────────────────────────────────────── */}
            <div>
              <div className="flex items-baseline justify-between mb-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pipeline</p>
                <span className="text-[10px] text-gray-400">{pl.newLast24h} new in last 24h</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <PipelineTile
                  icon={<Clock size={11} />}
                  label="RFQs pending"
                  count={pl.rfqPending}
                  sub="last 7 days"
                  urgent
                />
                <PipelineTile
                  icon={<Truck size={11} />}
                  label="Dealer apps"
                  count={pl.dealerPending}
                  sub="last 30 days"
                />
                <PipelineTile
                  icon={<Star size={11} />}
                  label="High-value"
                  count={pl.highValue}
                  sub="Gov + OEM / 30d"
                />
                <PipelineTile
                  icon={<FileText size={11} />}
                  label="Quoted"
                  count={pl.quotedWaiting}
                  sub="status = quoted"
                />
              </div>
              {pl.oldestUnread && (
                <p className="text-[10px] text-amber-600 mt-2 flex items-center gap-1">
                  <Clock size={10} />
                  Oldest unread: {hoursAgo(pl.oldestUnread)}h ago ({new Date(pl.oldestUnread).toLocaleDateString("en-IN")})
                </p>
              )}
            </div>

            {/* ── 4. Classification + Source (side by side on wide, stacked on mobile) */}
            <div className="space-y-4">
              <div className="rounded-xl border border-gray-200 p-4">
                <ClassificationStrip classification={cl} />
              </div>

              <div className="rounded-xl border border-gray-200 p-4">
                <SourceTable sources={data.sources} />
              </div>
            </div>

            {/* ── 5. 30-day totals footer ───────────────────────────────── */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Today",   value: cl.totalToday },
                { label: "7-day",   value: cl.total7d    },
                { label: "30-day",  value: cl.total30d   },
              ].map(t => (
                <div key={t.label} className="rounded-lg bg-gray-50 border border-gray-100 p-3 text-center">
                  <p className="text-[10px] text-gray-400 mb-0.5">{t.label}</p>
                  <p className={`text-xl font-black tabular-nums ${t.value > 0 ? "text-gray-900" : "text-gray-200"}`}>
                    {t.value || "—"}
                  </p>
                  <p className="text-[9px] text-gray-400">leads</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
