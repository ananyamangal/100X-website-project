"use client"
import { useState } from "react"
import { RefreshCw, CheckCircle2, AlertTriangle, XCircle, Clock, Database, Shield, ChevronDown, ChevronUp } from "lucide-react"

export type HealthStatus = "healthy" | "degraded" | "stale" | "error"

export interface IntelligenceStatusSource {
  name: string
  active: boolean
  recordCount?: number
  lastSeen?: string
}

export interface IntelligenceStatusProps {
  module: string
  lastUpdated?: string        // ISO string
  lastSuccessfulRun?: string  // ISO string
  nextRefresh?: string        // ISO string
  refreshFrequency?: string   // e.g. "Daily 02:00 IST"
  autoRefresh?: boolean
  confidenceScore?: number    // 0-100
  coveragePct?: number        // 0-100
  health?: HealthStatus
  sources?: IntelligenceStatusSource[]
  version?: string
  totalRecords?: number
  processingTimeMs?: number
  onRefresh?: () => void
  refreshing?: boolean
}

const HEALTH_CONFIG: Record<HealthStatus, { icon: typeof CheckCircle2; label: string; cls: string; dot: string }> = {
  healthy:  { icon: CheckCircle2,   label: "Healthy",  cls: "text-emerald-600 bg-emerald-50 border-emerald-200", dot: "bg-emerald-400" },
  degraded: { icon: AlertTriangle,  label: "Degraded", cls: "text-amber-600 bg-amber-50 border-amber-200",     dot: "bg-amber-400" },
  stale:    { icon: Clock,          label: "Stale",    cls: "text-orange-600 bg-orange-50 border-orange-200",   dot: "bg-orange-400" },
  error:    { icon: XCircle,        label: "Error",    cls: "text-red-600 bg-red-50 border-red-200",            dot: "bg-red-400" },
}

function fmtDate(iso?: string) {
  if (!iso) return "—"
  const d = new Date(iso)
  if (isNaN(d.getTime())) return "—"
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }) + " IST"
}

function timeAgo(iso?: string) {
  if (!iso) return ""
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export default function IntelligenceStatus(props: IntelligenceStatusProps) {
  const [expanded, setExpanded] = useState(false)

  const {
    lastUpdated, lastSuccessfulRun, nextRefresh, refreshFrequency,
    autoRefresh, confidenceScore, coveragePct, health = "healthy",
    sources = [], version, totalRecords, processingTimeMs,
    onRefresh, refreshing,
  } = props

  const cfg   = HEALTH_CONFIG[health]
  const HIcon = cfg.icon
  const activeSources = sources.filter(s => s.active)
  const staleHours = lastUpdated
    ? (Date.now() - new Date(lastUpdated).getTime()) / 3_600_000
    : Infinity

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {/* Compact always-visible strip */}
      <div className="flex items-center gap-4 px-4 py-2.5 flex-wrap">
        {/* Health pill */}
        <span className={`flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${cfg.cls}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} animate-pulse`} />
          {cfg.label}
        </span>

        {/* Last updated */}
        {lastUpdated && (
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 min-w-0">
            <Clock size={11} className="text-gray-400 shrink-0" />
            <span className="font-medium text-gray-700">Updated</span>
            <span className={staleHours > 48 ? "text-amber-600 font-semibold" : ""}>
              {timeAgo(lastUpdated)}
            </span>
          </div>
        )}

        {/* Confidence */}
        {confidenceScore != null && (
          <div className="flex items-center gap-1.5 text-[11px]">
            <Shield size={11} className={confidenceScore >= 80 ? "text-emerald-500" : confidenceScore >= 60 ? "text-amber-500" : "text-red-500"} />
            <span className="text-gray-500">Confidence</span>
            <span className={`font-bold ${confidenceScore >= 80 ? "text-emerald-600" : confidenceScore >= 60 ? "text-amber-600" : "text-red-600"}`}>
              {confidenceScore}%
            </span>
          </div>
        )}

        {/* Coverage */}
        {coveragePct != null && (
          <div className="flex items-center gap-1.5 text-[11px]">
            <Database size={11} className="text-blue-400" />
            <span className="text-gray-500">Coverage</span>
            <span className="font-bold text-blue-600">{coveragePct}%</span>
          </div>
        )}

        {/* Records */}
        {totalRecords != null && (
          <span className="text-[11px] text-gray-500">
            <span className="font-semibold text-gray-700">{totalRecords.toLocaleString()}</span> records
          </span>
        )}

        {/* Active sources pills */}
        {activeSources.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {activeSources.slice(0, 5).map(s => (
              <span key={s.name} className="text-[10px] px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full font-medium">
                ✓ {s.name}
              </span>
            ))}
            {activeSources.length > 5 && (
              <span className="text-[10px] text-gray-400">+{activeSources.length - 5} more</span>
            )}
          </div>
        )}

        {/* Spacer + controls */}
        <div className="flex items-center gap-2 ml-auto shrink-0">
          {version && <span className="text-[10px] text-gray-300 font-mono">v{version}</span>}

          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50 transition-colors"
            >
              <RefreshCw size={11} className={refreshing ? "animate-spin" : ""} />
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
          )}

          <button
            onClick={() => setExpanded(e => !e)}
            className="text-gray-300 hover:text-gray-500 transition-colors"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Expanded detail panel */}
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3">
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Last Updated</p>
            <p className="text-[11px] font-medium text-gray-700">{fmtDate(lastUpdated)}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Last Successful Run</p>
            <p className="text-[11px] font-medium text-gray-700">{fmtDate(lastSuccessfulRun || lastUpdated)}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Next Refresh</p>
            <p className="text-[11px] font-medium text-gray-700">{nextRefresh ? fmtDate(nextRefresh) : (refreshFrequency ?? "Manual")}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Auto Refresh</p>
            <p className={`text-[11px] font-medium ${autoRefresh ? "text-emerald-600" : "text-gray-400"}`}>
              {autoRefresh ? "Enabled" : "Manual only"}
            </p>
          </div>
          {processingTimeMs != null && (
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Processing Time</p>
              <p className="text-[11px] font-medium text-gray-700">{processingTimeMs < 1000 ? `${processingTimeMs}ms` : `${(processingTimeMs / 1000).toFixed(1)}s`}</p>
            </div>
          )}

          {/* All sources */}
          {sources.length > 0 && (
            <div className="col-span-2 sm:col-span-4">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1.5">Data Sources</p>
              <div className="flex flex-wrap gap-1.5">
                {sources.map(s => (
                  <span
                    key={s.name}
                    className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                      s.active
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-gray-100 text-gray-400 border-gray-200"
                    }`}
                  >
                    {s.active ? "✓" : "○"} {s.name}
                    {s.recordCount != null && s.active ? ` (${s.recordCount.toLocaleString()})` : ""}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
