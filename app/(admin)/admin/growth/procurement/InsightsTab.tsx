"use client"
import { useEffect, useState, useCallback } from "react"
import {
  Zap, RefreshCw, ChevronDown, ChevronUp, Loader2,
  Users, TrendingUp, Package, Building2, AlertTriangle,
  Layers, Train, Shield, Heart, CircleDollarSign,
} from "lucide-react"

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Insight {
  type: string
  title: string
  summary: string
  data: Record<string, unknown>[]
  generated_at: string
  contracts_analyzed: number
}

interface InsightsStatus {
  insights: Insight[]
  last_generated: string | null
  alerts_count: number
}

// ─── Format helpers ─────────────────────────────────────────────────────────────

function fmtInr(n: unknown): string {
  if (typeof n !== "number" || !n) return "—"
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(0)} K`
  return `₹${n.toLocaleString("en-IN")}`
}

function fmtNum(v: unknown): string {
  if (v === null || v === undefined) return "—"
  if (typeof v === "number") return v.toLocaleString("en-IN")
  if (typeof v === "string") return v
  return JSON.stringify(v)
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
  })
}

// ─── Icon map ───────────────────────────────────────────────────────────────────

const INSIGHT_META: Record<string, { icon: React.ElementType; color: string; border: string; bg: string }> = {
  top_new_dealers:        { icon: Users,              color: "text-emerald-600", border: "border-emerald-200", bg: "bg-emerald-50" },
  top_growing_dealers:    { icon: TrendingUp,         color: "text-blue-600",    border: "border-blue-200",    bg: "bg-blue-50" },
  top_repeat_buyers:      { icon: Building2,          color: "text-purple-600",  border: "border-purple-200",  bg: "bg-purple-50" },
  top_emerging_products:  { icon: Package,            color: "text-amber-600",   border: "border-amber-200",   bg: "bg-amber-50" },
  top_adjacent_products:  { icon: Layers,             color: "text-cyan-600",    border: "border-cyan-200",    bg: "bg-cyan-50" },
  top_fragmented_markets: { icon: CircleDollarSign,   color: "text-orange-600",  border: "border-orange-200",  bg: "bg-orange-50" },
  top_municipal_ops:      { icon: Building2,          color: "text-violet-600",  border: "border-violet-200",  bg: "bg-violet-50" },
  top_health_ops:         { icon: Heart,              color: "text-rose-600",    border: "border-rose-200",    bg: "bg-rose-50" },
  top_defence_ops:        { icon: Shield,             color: "text-red-600",     border: "border-red-200",     bg: "bg-red-50" },
  top_railway_ops:        { icon: Train,              color: "text-gray-600",    border: "border-gray-200",    bg: "bg-gray-50" },
}

// ─── Key columns per insight type ───────────────────────────────────────────────

const INSIGHT_COLS: Record<string, string[]> = {
  top_new_dealers:        ["dealer", "gmv", "count", "state"],
  top_growing_dealers:    ["dealer", "recent_gmv", "prev_gmv", "growth_pct", "state"],
  top_repeat_buyers:      ["dept", "total_contracts", "dealer_count", "avg_per_dealer"],
  top_emerging_products:  ["product", "growth_rate", "total_gmv", "seller_count"],
  top_adjacent_products:  ["product", "gmv", "dept_count", "count"],
  top_fragmented_markets: ["product", "seller_count", "total_gmv", "growth_rate"],
  top_municipal_ops:      ["dept", "gmv", "count", "seller_count"],
  top_health_ops:         ["dept", "gmv", "count", "seller_count"],
  top_defence_ops:        ["dept", "gmv", "count", "seller_count"],
  top_railway_ops:        ["dept", "gmv", "count", "seller_count"],
}

const LABEL_MAP: Record<string, string> = {
  dealer: "Dealer", dept: "Department", product: "Product",
  gmv: "GMV", total_gmv: "GMV", recent_gmv: "Last 12M", prev_gmv: "Prev 12M",
  count: "Contracts", total_contracts: "Contracts",
  state: "State", growth_pct: "Growth %", growth_rate: "Growth %",
  seller_count: "Sellers", dealer_count: "Dealers", dept_count: "Depts",
  avg_per_dealer: "Avg/Dealer", contracts_analyzed: "Analyzed",
}

// ─── InsightCard ────────────────────────────────────────────────────────────────

function InsightCard({ insight, onDealerClick }: {
  insight: Insight
  onDealerClick?: (name: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const meta = INSIGHT_META[insight.type] || { icon: Zap, color: "text-gray-600", border: "border-gray-200", bg: "bg-gray-50" }
  const Icon = meta.icon
  const cols = INSIGHT_COLS[insight.type] || Object.keys(insight.data[0] || {}).slice(0, 5)

  return (
    <div className={`bg-white border ${meta.border} rounded-xl shadow-sm overflow-hidden`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-start justify-between p-4 hover:bg-gray-50/50 transition-colors text-left">
        <div className="flex items-start gap-3">
          <div className={`w-8 h-8 rounded-lg ${meta.bg} flex items-center justify-center flex-shrink-0`}>
            <Icon size={15} className={meta.color} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">{insight.title}</p>
            <p className="text-xs text-gray-500 mt-0.5">{insight.summary}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <span className="text-[10px] text-gray-400">{insight.data.length} results</span>
          {expanded ? <ChevronUp size={13} className="text-gray-400" /> : <ChevronDown size={13} className="text-gray-400" />}
        </div>
      </button>

      {/* Data table */}
      {expanded && insight.data.length > 0 && (
        <div className="border-t border-gray-100 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-3 py-2 text-gray-400 font-medium w-8">#</th>
                {cols.map(c => (
                  <th key={c} className="text-left px-3 py-2 text-gray-400 font-medium whitespace-nowrap">
                    {LABEL_MAP[c] || c.replace(/_/g, " ")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {insight.data.slice(0, 20).map((row, i) => (
                <tr key={i} className="hover:bg-gray-50/50">
                  <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                  {cols.map(c => {
                    const v = row[c]
                    const isDealer = c === "dealer" && typeof v === "string" && onDealerClick
                    const isGmv = c === "gmv" || c === "total_gmv" || c === "recent_gmv" || c === "prev_gmv"
                    const isPct = c === "growth_pct" || c === "growth_rate"
                    return (
                      <td key={c} className="px-3 py-2 text-gray-700">
                        {isDealer ? (
                          <button onClick={() => onDealerClick!(v as string)}
                            className="text-brand-600 hover:underline font-medium text-left">
                            {(v as string).length > 35 ? (v as string).slice(0, 33) + "…" : v as string}
                          </button>
                        ) : isGmv ? (
                          <span className="font-medium">{fmtInr(v)}</span>
                        ) : isPct ? (
                          <span className={`font-bold ${typeof v === "number" && v > 0 ? "text-green-600" : "text-red-500"}`}>
                            {typeof v === "number" ? `${v > 0 ? "+" : ""}${Math.round(v)}%` : "—"}
                          </span>
                        ) : (
                          <span>{fmtNum(v)}</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {expanded && insight.data.length === 0 && (
        <div className="border-t border-gray-100 px-4 py-6 text-center text-xs text-gray-400">
          No data yet. Generate insights to populate.
        </div>
      )}
    </div>
  )
}

// ─── Main Tab ───────────────────────────────────────────────────────────────────

export function InsightsTab({ onDealerClick }: { onDealerClick?: (name: string) => void }) {
  const [status, setStatus]     = useState<InsightsStatus | null>(null)
  const [loading, setLoading]   = useState(true)
  const [generating, setGenerating] = useState(false)
  const [lastMsg, setLastMsg]   = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    fetch("/api/admin/procurement/insights")
      .then(r => r.json())
      .then(d => { setStatus(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const generate = async () => {
    setGenerating(true)
    setLastMsg(null)
    try {
      const res = await fetch("/api/admin/procurement/insights", { method: "POST" })
      const d = await res.json()
      setLastMsg(d.summary || "Generated successfully")
      await load()
    } catch {
      setLastMsg("Generation failed. Check server logs.")
    } finally {
      setGenerating(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24 gap-2 text-gray-400 text-sm">
      <Loader2 size={16} className="animate-spin" />Loading insights…
    </div>
  )

  const hasInsights = status?.insights && status.insights.length > 0

  return (
    <div className="space-y-4">
      {/* Control bar */}
      <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-800">Auto-Generated Intelligence</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {status?.last_generated
              ? `Last generated ${fmtDate(status.last_generated)}`
              : "Not yet generated — run the engine to discover opportunities"}
          </p>
          {lastMsg && <p className="text-xs text-green-600 mt-0.5">{lastMsg}</p>}
        </div>
        <div className="flex items-center gap-3">
          {status?.alerts_count != null && status.alerts_count > 0 && (
            <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-1">
              {status.alerts_count} alerts
            </span>
          )}
          <button onClick={generate} disabled={generating}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 text-white rounded-lg text-xs font-medium disabled:opacity-50 hover:bg-brand-700 transition-colors shadow-sm">
            {generating ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
            {generating ? "Generating…" : hasInsights ? "Regenerate" : "Generate Now"}
          </button>
        </div>
      </div>

      {!hasInsights && !generating && (
        <div className="bg-white border border-dashed border-gray-200 rounded-xl p-12 text-center space-y-3">
          <div className="flex justify-center">
            <div className="w-12 h-12 bg-brand-50 rounded-full flex items-center justify-center">
              <Zap size={20} className="text-brand-500" />
            </div>
          </div>
          <p className="text-sm font-semibold text-gray-700">No insights generated yet</p>
          <p className="text-xs text-gray-400 max-w-md mx-auto">
            The engine analyses all 16,000+ contracts across 10 opportunity dimensions automatically.
            Click Generate Now to start — takes ~30 seconds.
          </p>
          <div className="flex items-center gap-1.5 justify-center text-[10px] text-amber-600 bg-amber-50 rounded-lg px-3 py-1.5 w-fit mx-auto">
            <AlertTriangle size={10} />
            Build the Knowledge Graph first for best results
          </div>
        </div>
      )}

      {hasInsights && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Priority section */}
            {["top_new_dealers", "top_growing_dealers", "top_adjacent_products", "top_fragmented_markets"].map(type => {
              const ins = status!.insights.find(i => i.type === type)
              return ins ? (
                <InsightCard key={type} insight={ins} onDealerClick={onDealerClick} />
              ) : null
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {["top_emerging_products", "top_repeat_buyers"].map(type => {
              const ins = status!.insights.find(i => i.type === type)
              return ins ? <InsightCard key={type} insight={ins} onDealerClick={onDealerClick} /> : null
            })}
          </div>

          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Segment Opportunities</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {["top_municipal_ops", "top_health_ops", "top_defence_ops", "top_railway_ops"].map(type => {
              const ins = status!.insights.find(i => i.type === type)
              return ins ? <InsightCard key={type} insight={ins} onDealerClick={onDealerClick} /> : null
            })}
          </div>

          <p className="text-[10px] text-gray-400 text-right">
            Runs nightly at 01:00 IST · {status!.insights[0]?.contracts_analyzed?.toLocaleString("en-IN")} contracts analyzed
          </p>
        </>
      )}
    </div>
  )
}
