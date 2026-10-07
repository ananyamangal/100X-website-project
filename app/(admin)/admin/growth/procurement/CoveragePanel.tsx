"use client"
import { useEffect, useState } from "react"
import {
  Database, Search, ChevronDown, ChevronRight,
  AlertTriangle, CheckCircle2, RefreshCw, Info,
} from "lucide-react"

interface CoverageData {
  processingMs:  number
  gem: {
    label:           string
    description:     string
    totalContracts:  number
    enrichedCount:   number
    enrichedPct:     number
    searchableCount: number
    searchablePct:   number
    missingProduct:  number
    totalGmvCr:      number
    lastImport:      string | null
    scopeNote:       string
    topProducts:     { name: string; count: number }[]
    topDepts:        { name: string; count: number }[]
  }
  fogging: {
    label:          string
    totalContracts: number
    totalGmvCr:     number
    oemEnrichedPct: number
    statesCovered:  number
    scopeNote:      string
  }
  harvester: {
    lastScannedId: number | null
    isRunning:     boolean
    progressNote:  string
  }
  searchScope: Record<string, string>
  limitation:  string
}

function Bar({ pct, color = "bg-brand-600" }: { pct: number; color?: string }) {
  return (
    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  )
}

function fmtDate(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

export function CoveragePanel() {
  const [data,    setData]    = useState<CoverageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [open,    setOpen]    = useState(false)
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    setLoading(true)
    fetch("/api/admin/procurement/coverage")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [refresh])

  const gem     = data?.gem
  const fogging = data?.fogging

  const scopeStatus = gem
    ? gem.totalContracts === 0
      ? { icon: AlertTriangle, color: "text-red-600",   bg: "bg-red-50 border-red-200",   label: "Empty — no contracts imported" }
      : gem.searchablePct < 50
      ? { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50 border-amber-200", label: "Partial coverage — enrichment incomplete" }
      : { icon: CheckCircle2,  color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", label: "Active" }
    : null

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {/* Header row */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
      >
        <Database size={13} className="text-brand-600 shrink-0" />
        <span className="text-xs font-semibold text-gray-700">Dataset Coverage</span>

        {/* Inline summary pills */}
        {gem && !loading && (
          <div className="flex items-center gap-1.5 ml-1">
            <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-medium">
              {gem.totalContracts.toLocaleString("en-IN")} imported
            </span>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">
              {fogging?.totalContracts?.toLocaleString("en-IN")} fogging
            </span>
            {gem.searchablePct < 100 && (
              <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                {gem.searchablePct}% searchable
              </span>
            )}
          </div>
        )}

        {loading && <span className="text-[10px] text-gray-400 ml-1">Loading…</span>}

        {/* Scope limitation chip */}
        <span className="ml-auto text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
          <Info size={9} />
          Selected categories only
        </span>

        {open
          ? <ChevronDown size={13} className="text-gray-400 shrink-0 ml-1" />
          : <ChevronRight size={13} className="text-gray-400 shrink-0 ml-1" />}
      </button>

      {/* Scope limitation banner — always visible when collapsed */}
      {!open && gem && !loading && gem.totalContracts > 0 && (
        <div className="px-4 pb-2.5">
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-[10px] text-amber-800 flex gap-2 items-start">
            <AlertTriangle size={10} className="shrink-0 mt-0.5 text-amber-500" />
            <span>
              <strong>Procurement Intelligence covers selected imported categories only.</strong>{" "}
              Non-fogging products (e.g. Note Sorting Machines, Currency Counting) may return 0–few results
              because those categories have not been fully imported from the GeM archive.
              {gem.missingProduct > 0 && ` Additionally, ${gem.missingProduct.toLocaleString("en-IN")} imported contracts are missing product names (not yet enriched) and cannot be found by product search.`}
            </span>
          </div>
        </div>
      )}

      {/* Expanded detail */}
      {open && data && (
        <div className="border-t border-gray-100 px-4 py-4 space-y-5">
          {/* Refresh */}
          <div className="flex justify-end">
            <button
              onClick={() => setRefresh(r => r + 1)}
              disabled={loading}
              className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-700"
            >
              <RefreshCw size={10} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>

          {/* Two-column dataset overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* gem_contracts */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-2">
                <Database size={13} className="text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-blue-900">{gem?.label}</p>
                  <p className="text-[10px] text-blue-700 mt-0.5">gem_contracts collection</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {([
                  ["Total Contracts", gem?.totalContracts?.toLocaleString("en-IN") ?? "—"],
                  ["GMV (Cr)", gem?.totalGmvCr ? `₹${gem.totalGmvCr}` : "—"],
                  ["Enriched", `${gem?.enrichedPct ?? 0}%`],
                  ["Searchable by product", `${gem?.searchablePct ?? 0}%`],
                ] as [string, string][]).map(([label, val]) => (
                  <div key={label} className="bg-white/60 rounded-lg p-2">
                    <p className="text-[9px] text-blue-400 uppercase tracking-wide">{label}</p>
                    <p className="text-sm font-bold text-blue-900">{val}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-blue-700">
                  <span>Product search readiness</span>
                  <span>{gem?.searchablePct ?? 0}%</span>
                </div>
                <Bar pct={gem?.searchablePct ?? 0} color="bg-blue-500" />
                {gem?.missingProduct && gem.missingProduct > 0 ? (
                  <p className="text-[10px] text-amber-700">
                    ⚠ {gem.missingProduct.toLocaleString("en-IN")} contracts missing product_name — enrichment required
                  </p>
                ) : null}
              </div>

              <div className="text-[10px] text-blue-600 flex gap-1 items-start">
                <Info size={9} className="shrink-0 mt-0.5" />
                <span>{gem?.scopeNote}</span>
              </div>

              <div className="text-[10px] text-blue-500">Last import: {fmtDate(gem?.lastImport ?? null)}</div>
            </div>

            {/* fogging_contracts */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-2">
                <CheckCircle2 size={13} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-emerald-900">{fogging?.label}</p>
                  <p className="text-[10px] text-emerald-700 mt-0.5">fogging_contracts collection · v1.4</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {([
                  ["Contracts",     fogging?.totalContracts?.toLocaleString("en-IN") ?? "—"],
                  ["GMV (Cr)",      fogging?.totalGmvCr ? `₹${fogging.totalGmvCr}` : "—"],
                  ["OEM Enriched",  `${fogging?.oemEnrichedPct ?? 0}%`],
                  ["States",        String(fogging?.statesCovered ?? "—")],
                ] as [string, string][]).map(([label, val]) => (
                  <div key={label} className="bg-white/60 rounded-lg p-2">
                    <p className="text-[9px] text-emerald-400 uppercase tracking-wide">{label}</p>
                    <p className="text-sm font-bold text-emerald-900">{val}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-emerald-700">
                  <span>Enrichment completeness</span>
                  <span>100%</span>
                </div>
                <Bar pct={100} color="bg-emerald-500" />
              </div>

              <div className="text-[10px] text-emerald-600 flex gap-1 items-start">
                <Info size={9} className="shrink-0 mt-0.5" />
                <span>This is the only fully enriched dataset. Used by Fogging Intelligence, Market Intelligence, and the Registry.</span>
              </div>
            </div>
          </div>

          {/* Top imported products */}
          {gem?.topProducts && gem.topProducts.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                Top Imported Product Categories (by contract count)
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {gem.topProducts.map(p => (
                  <div key={p.name} className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1.5">
                    <span className="text-[10px] text-gray-700 truncate pr-2">{p.name}</span>
                    <span className="text-[10px] font-semibold text-gray-500 shrink-0">{p.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scope mapping */}
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Data Source by Tab</p>
            <div className="space-y-1">
              {data.searchScope && Object.entries(data.searchScope).map(([tab, source]) => (
                <div key={tab} className="flex gap-2 text-[10px]">
                  <span className="text-gray-400 w-28 shrink-0">{tab.replace(/([A-Z])/g, " $1").replace("Tab","").trim()}:</span>
                  <span className="text-gray-600">{source}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Limitation box */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex gap-2">
              <AlertTriangle size={13} className="text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold text-amber-800">Coverage Limitation</p>
                <p className="text-[10px] text-amber-700">{data.limitation}</p>
                <p className="text-[10px] text-amber-600 mt-1">
                  <strong>Note Sorting Machine example:</strong> Returns 1 result because only contracts
                  from the imported archive are searchable. If Note Sorting Machine contracts exist in GeM
                  but were not part of the imported batch, they will not appear. To expand coverage,
                  import additional category batches from the GeM archive.
                </p>
              </div>
            </div>
          </div>

          {/* Harvester state */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Harvester State</p>
            <p className="text-[10px] text-gray-600">{data.harvester.progressNote}</p>
            {data.harvester.isRunning && (
              <p className="text-[10px] text-emerald-600 font-semibold mt-1">● Harvester currently running</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
