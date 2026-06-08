"use client"
import { useEffect, useState } from "react"
import { AlertTriangle, CheckCircle, RefreshCw, Database } from "lucide-react"

interface DQData {
  contracts:           number
  enriched:            number
  pending_enrichment:  number
  pct_enriched:        number
  total_gmv:           number
  total_sellers:       number
  total_depts:         number
  total_products:      number
  total_states:        number
  date_range:          { earliest: string | null; latest: string | null; last_seen: string | null }
  kg_built_at:         string | null
  last_alert:          string | null
  warnings:            string[]
}

function fmtShort(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

function fmtInr(n: number) {
  if (!n) return "₹0"
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(1)} Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`
  return `₹${n.toLocaleString("en-IN")}`
}

export function DataQualityPanel() {
  const [data, setData]       = useState<DQData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    fetch("/api/admin/procurement/data-quality")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  if (loading || !data) return null

  const STATS = [
    { label: "Contracts",   value: data.contracts.toLocaleString("en-IN"),        color: "text-gray-800" },
    { label: "GMV",         value: fmtInr(data.total_gmv),                         color: "text-orange-600" },
    { label: "Enriched",    value: `${data.enriched.toLocaleString("en-IN")} (${data.pct_enriched}%)`, color: "text-green-600" },
    { label: "Sellers",     value: data.total_sellers.toLocaleString("en-IN"),     color: "text-teal-600" },
    { label: "Departments", value: data.total_depts.toLocaleString("en-IN"),       color: "text-purple-600" },
    { label: "Products",    value: data.total_products.toLocaleString("en-IN"),    color: "text-blue-600" },
    { label: "States",      value: data.total_states.toLocaleString("en-IN"),      color: "text-amber-600" },
    { label: "Earliest",    value: fmtShort(data.date_range.earliest),             color: "text-gray-600" },
    { label: "Latest",      value: fmtShort(data.date_range.latest),               color: "text-gray-600" },
    { label: "KG Built",    value: data.kg_built_at ? fmtShort(data.kg_built_at) : "Not built", color: data.kg_built_at ? "text-green-600" : "text-red-500" },
    { label: "Pending",     value: data.pending_enrichment.toLocaleString("en-IN"), color: data.pending_enrichment > 0 ? "text-amber-600" : "text-gray-400" },
  ]

  return (
    <div className="space-y-2">
      {/* Metric strip */}
      <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
            <Database size={12} className="text-brand-500" />
            Data Quality Overview
          </div>
          <button onClick={load} className="text-[10px] text-gray-400 hover:text-gray-600 flex items-center gap-1">
            <RefreshCw size={10} />Refresh
          </button>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-11 gap-x-4 gap-y-2">
          {STATS.map(({ label, value, color }) => (
            <div key={label}>
              <p className="text-[9px] text-gray-400 uppercase tracking-wide">{label}</p>
              <p className={`text-xs font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Warnings */}
      {data.warnings.length > 0 && (
        <div className="space-y-1.5">
          {data.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-800">
              <AlertTriangle size={12} className="text-amber-500 flex-shrink-0 mt-0.5" />
              {w}
            </div>
          ))}
        </div>
      )}

      {data.warnings.length === 0 && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-700">
          <CheckCircle size={12} className="text-green-500" />
          All data fresh and complete.
        </div>
      )}
    </div>
  )
}
