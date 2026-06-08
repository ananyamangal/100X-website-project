"use client"
import { useEffect, useState } from "react"
import { CheckCircle2, AlertTriangle, Circle, RefreshCw } from "lucide-react"

interface Governance {
  contracts:         number
  enriched:          number
  pct_enriched:      number
  total_gmv:         number
  total_sellers:     number
  total_depts:       number
  date_range:        { earliest: string | null; latest: string | null; last_seen: string | null }
  kg_built_at:       string | null
  warnings:          string[]
}

function dateFmt(s: string | null, fallback = "—") {
  if (!s) return fallback
  const d = new Date(s)
  return isNaN(d.getTime()) ? fallback : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

function daysAgo(s: string | null): string {
  if (!s) return ""
  const d = Math.floor((Date.now() - new Date(s).getTime()) / 86400000)
  if (d === 0) return "today"
  if (d === 1) return "yesterday"
  return `${d}d ago`
}

export function GovernanceStrip() {
  const [g, setG]           = useState<Governance | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  const load = () => {
    setLoading(true)
    fetch("/api/admin/procurement/data-quality")
      .then(r => r.json())
      .then(d => { setG(d); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  if (loading && !g) return null

  const hasWarnings = g && g.warnings && g.warnings.length > 0

  return (
    <div className={`rounded-xl border text-xs shadow-sm ${
      hasWarnings ? "bg-amber-50 border-amber-200" : "bg-white border-gray-200"
    }`}>
      {/* Compact strip */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 hover:bg-black/[0.03] transition-colors rounded-xl text-left">

        {/* Status icon */}
        {hasWarnings
          ? <AlertTriangle size={12} className="text-amber-500 flex-shrink-0" />
          : <CheckCircle2 size={12} className="text-green-500 flex-shrink-0" />
        }

        {/* Coverage period */}
        {g?.date_range.earliest && (
          <span className="text-gray-600">
            <span className="text-gray-400">Coverage:</span>{" "}
            <strong>{dateFmt(g.date_range.earliest)}</strong>
            {" → "}
            <strong>{dateFmt(g.date_range.latest)}</strong>
          </span>
        )}

        <span className="text-gray-300 hidden sm:inline">|</span>

        {/* Key metrics */}
        {g && (
          <>
            <span className="text-gray-600">
              <strong className="text-gray-800">{g.contracts.toLocaleString("en-IN")}</strong>
              <span className="text-gray-400"> contracts</span>
            </span>
            <span className="text-gray-600">
              <strong className="text-gray-800">₹{(g.total_gmv / 1e7).toFixed(0)} Cr</strong>
              <span className="text-gray-400"> GMV</span>
            </span>
            <span className="text-gray-600">
              <strong className={g.pct_enriched > 80 ? "text-green-700" : "text-amber-600"}>{g.pct_enriched}%</strong>
              <span className="text-gray-400"> enriched</span>
            </span>
          </>
        )}

        <span className="text-gray-300 hidden sm:inline">|</span>

        {/* KG status */}
        {g && (
          <span className="flex items-center gap-1 text-gray-600">
            <Circle size={6} className={g.kg_built_at ? "text-green-500 fill-green-500" : "text-gray-300 fill-gray-300"} />
            <span className="text-gray-400">KG:</span>{" "}
            {g.kg_built_at ? (
              <><strong>Built</strong> <span className="text-gray-400">{daysAgo(g.kg_built_at)}</span></>
            ) : (
              <strong className="text-amber-600">Not built</strong>
            )}
          </span>
        )}

        {/* Last collected */}
        {g?.date_range.last_seen && (
          <span className="text-gray-400 hidden md:inline">
            Collected: <strong>{daysAgo(g.date_range.last_seen)}</strong>
          </span>
        )}

        {/* Warnings badge */}
        {hasWarnings && (
          <span className="ml-auto text-[10px] bg-amber-500 text-white font-bold rounded-full px-2 py-0.5">
            {g.warnings.length} warning{g.warnings.length > 1 ? "s" : ""}
          </span>
        )}

        <button
          onClick={e => { e.stopPropagation(); load() }}
          className="text-gray-300 hover:text-gray-500 ml-auto sm:ml-0">
          <RefreshCw size={10} />
        </button>
      </button>

      {/* Expanded warnings */}
      {expanded && hasWarnings && (
        <div className="px-4 pb-3 pt-0 border-t border-amber-200 space-y-1.5 mt-0">
          {g.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-amber-800">
              <AlertTriangle size={11} className="mt-0.5 flex-shrink-0 text-amber-500" />
              {w}
            </div>
          ))}
        </div>
      )}

      {/* Expanded clean state */}
      {expanded && !hasWarnings && g && (
        <div className="px-4 pb-3 pt-1 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-3 mt-0">
          {[
            ["Contracts",  g.contracts.toLocaleString("en-IN")],
            ["Sellers",    g.total_sellers.toLocaleString("en-IN")],
            ["Depts",      g.total_depts.toLocaleString("en-IN")],
            ["Enriched",   `${g.enriched.toLocaleString("en-IN")} (${g.pct_enriched}%)`],
          ].map(([label, val]) => (
            <div key={label}>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
              <p className="font-semibold text-gray-700">{val}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
