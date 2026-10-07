"use client"
import { useEffect, useState } from "react"
import {
  Database, ChevronDown, ChevronRight, CheckCircle2, AlertCircle,
  Clock, XCircle, BarChart3, RefreshCw, Info,
} from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

// ── Types ──────────────────────────────────────────────────────────────────────
interface PipelineStage { stage: string; count: number; pct: number; detail: string }
interface MonthlyVolume  { label: string; contracts: number; gmvCr: number }
interface Registry {
  datasetVersion: string; lastEnrichment: string | null; lastImport: string | null
  coverageWindow: string; firstRecordDate: string | null; lastRecordDate: string | null
  dataFreshness: string; daysSinceNewest: number; confidenceScore: number
  coveragePct: number; duplicateRate: number; missingFieldPct: number; health: string
  processingTimeMs: number
}
interface RegistryData {
  registry:      Registry
  counts: { totalContracts: number; totalGmvCr: number; totalBuyers: number; totalSuppliers: number; totalOems: number; totalDepts: number; totalStates: number; totalCities: number; enrichedContracts: number }
  missing: Record<string, { count: number; pct: number }>
  pipeline:      PipelineStage[]
  monthlyVolume: MonthlyVolume[]
  sources:       Array<{ name: string; active: boolean; records: number; note: string }>
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const HEALTH_CONFIG: Record<string, { color: string; bg: string; icon: React.ElementType; label: string }> = {
  healthy:  { color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200",  icon: CheckCircle2, label: "Healthy"  },
  degraded: { color: "text-amber-700",   bg: "bg-amber-50 border-amber-200",      icon: AlertCircle,  label: "Warning"  },
  stale:    { color: "text-orange-700",  bg: "bg-orange-50 border-orange-200",    icon: Clock,        label: "Stale"    },
  error:    { color: "text-red-700",     bg: "bg-red-50 border-red-200",          icon: XCircle,      label: "Error"    },
}

function fmtDate(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

function SourceEvidenceTip({ note, count }: { note: string; count: number }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="relative inline-block ml-1">
      <button onClick={() => setOpen(v => !v)} className="text-gray-400 hover:text-brand-600">
        <Info size={11} />
      </button>
      {open && (
        <div className="absolute z-30 bottom-5 left-0 bg-white border border-gray-200 shadow-lg rounded-lg px-3 py-2 w-52 text-[11px]">
          <p className="font-semibold text-gray-700 mb-1">Source Evidence</p>
          <p className="text-gray-500">{note}</p>
          <p className="text-gray-400 mt-1">{count.toLocaleString()} records</p>
        </div>
      )}
    </span>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export function RegistryPanel() {
  const [data,       setData]       = useState<RegistryData | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [expanded,   setExpanded]   = useState(false)
  const [showChart,  setShowChart]  = useState<"contracts" | "gmv">("contracts")
  const [refreshing, setRefreshing] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const r = await fetch("/api/admin/growth/procurement/registry")
      const j = await r.json()
      setData(j)
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetch("/api/admin/growth/snapshots", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ module: "procurement", force: true }) })
    await load()
    setRefreshing(false)
  }

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 animate-pulse">
        <div className="h-4 w-48 bg-gray-200 rounded mb-2" />
        <div className="h-3 w-72 bg-gray-100 rounded" />
      </div>
    )
  }

  if (!data) return null

  const { registry: reg, counts, missing, pipeline, monthlyVolume, sources } = data
  const hc       = HEALTH_CONFIG[reg.health] ?? HEALTH_CONFIG.stale
  const HealthIcon = hc.icon

  return (
    <div className={`border rounded-xl mb-4 overflow-hidden ${hc.bg}`}>
      {/* Header strip — always visible */}
      <button
        className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-white/30 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <Database size={15} className={hc.color} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-bold ${hc.color}`}>Procurement Intelligence Registry</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${hc.bg} ${hc.color}`}>
              {hc.label}
            </span>
            <span className="text-[10px] text-gray-400 font-mono">{reg.datasetVersion}</span>
          </div>
          <div className="flex items-center gap-4 mt-0.5 flex-wrap">
            <span className="text-[11px] text-gray-500">
              <strong className="text-gray-700">{counts.totalContracts.toLocaleString()}</strong> contracts ·{" "}
              <strong className="text-gray-700">₹{counts.totalGmvCr} Cr</strong> GMV ·{" "}
              <strong className="text-gray-700">{reg.coveragePct}%</strong> enriched ·{" "}
              Coverage: <strong className="text-gray-700">{reg.coverageWindow}</strong>
            </span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              reg.dataFreshness === "Fresh" ? "bg-emerald-100 text-emerald-700" :
              reg.dataFreshness === "Recent" ? "bg-blue-100 text-blue-700" :
              reg.dataFreshness === "Aging" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
            }`}>{reg.dataFreshness} · last record {reg.daysSinceNewest}d ago</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={e => { e.stopPropagation(); handleRefresh() }}
            disabled={refreshing}
            className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-brand-600 border border-gray-200 bg-white rounded-lg px-2 py-1 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={10} className={refreshing ? "animate-spin" : ""} /> Snapshot
          </button>
          {expanded ? <ChevronDown size={14} className={hc.color} /> : <ChevronRight size={14} className={hc.color} />}
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="bg-white border-t border-gray-200 p-5 space-y-6">
          {/* 24-field registry grid */}
          <div>
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Dataset Metadata</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {[
                { label: "Dataset Version",   value: reg.datasetVersion },
                { label: "Last Enrichment",   value: fmtDate(reg.lastEnrichment) },
                { label: "Last GeM Sync",     value: fmtDate(reg.lastImport) },
                { label: "Last Tender Sync",  value: "Not configured" },
                { label: "Coverage Window",   value: reg.coverageWindow },
                { label: "First Record",      value: fmtDate(reg.firstRecordDate) },
                { label: "Last Record",       value: fmtDate(reg.lastRecordDate) },
                { label: "Auto Refresh",      value: "Manual" },
                { label: "Next Refresh",      value: "On demand" },
                { label: "Query Time",        value: `${reg.processingTimeMs}ms` },
                { label: "Data Freshness",    value: reg.dataFreshness },
                { label: "Confidence",        value: `${reg.confidenceScore}%` },
                { label: "Coverage",          value: `${reg.coveragePct}%` },
                { label: "Duplicate Rate",    value: `${reg.duplicateRate}%` },
                { label: "Missing Fields",    value: `${reg.missingFieldPct}%` },
                { label: "Total Contracts",   value: counts.totalContracts.toLocaleString() },
                { label: "Total GMV",         value: `₹${counts.totalGmvCr} Cr` },
                { label: "Unique Buyers",     value: counts.totalBuyers.toLocaleString() },
                { label: "Unique Suppliers",  value: counts.totalSuppliers.toLocaleString() },
                { label: "OEM Brands",        value: counts.totalOems.toLocaleString() },
                { label: "Departments",       value: counts.totalDepts.toLocaleString() },
                { label: "States Covered",    value: counts.totalStates.toLocaleString() },
                { label: "GeM Offices",       value: counts.totalCities.toLocaleString() },
                { label: "Enriched Records",  value: counts.enrichedContracts.toLocaleString() },
              ].map(({ label, value }) => (
                <div key={label} className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                  <p className="text-[10px] text-gray-400 font-medium">{label}</p>
                  <p className="text-xs font-semibold text-gray-800 mt-0.5">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Missing field coverage */}
          <div>
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Field Coverage</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(missing).map(([field, { count, pct }]) => (
                <div key={field} className="bg-gray-50 rounded-lg border border-gray-100 px-3 py-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-medium text-gray-500 capitalize">{field} field</span>
                    <span className={`text-[10px] font-bold ${pct > 50 ? "text-red-600" : pct > 20 ? "text-amber-600" : "text-emerald-600"}`}>{100 - pct}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${pct > 50 ? "bg-red-400" : pct > 20 ? "bg-amber-400" : "bg-emerald-400"}`}
                      style={{ width: `${100 - pct}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">{count.toLocaleString()} missing</p>
                </div>
              ))}
            </div>
          </div>

          {/* Enrichment pipeline */}
          <div>
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Enrichment Pipeline</h3>
            <div className="space-y-2">
              {pipeline.map((stage, i) => (
                <div key={stage.stage} className="flex items-center gap-3">
                  <span className="text-[10px] text-gray-400 w-3 font-mono">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-medium text-gray-700">{stage.stage}</span>
                      <span className="text-[10px] text-gray-500">{stage.count.toLocaleString()} · {stage.pct}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${stage.pct >= 95 ? "bg-emerald-400" : stage.pct >= 70 ? "bg-blue-400" : "bg-amber-400"}`}
                        style={{ width: `${stage.pct}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-400 w-36 truncate hidden sm:block">{stage.detail}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Contract volume trend chart */}
          {monthlyVolume.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                  <BarChart3 size={13} />
                  Contract Volume by Month
                </h3>
                <div className="flex gap-1.5">
                  {(["contracts", "gmv"] as const).map(m => (
                    <button key={m} onClick={() => setShowChart(m)}
                      className={`text-[10px] px-2 py-1 rounded-lg font-medium transition-colors ${showChart === m ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                      {m === "contracts" ? "Contracts" : "GMV (Cr)"}
                    </button>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthlyVolume} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip
                    contentStyle={{ fontSize: 11, borderRadius: 8 }}
                    formatter={(v: number) => showChart === "gmv" ? [`₹${v} Cr`, "GMV"] : [v.toLocaleString(), "Contracts"]}
                  />
                  <Bar dataKey={showChart} fill={showChart === "contracts" ? "#6366f1" : "#10b981"} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Data sources */}
          <div>
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Data Sources</h3>
            <div className="flex flex-wrap gap-2">
              {sources.map(src => (
                <div key={src.name} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-medium ${
                  src.active ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-gray-50 border-gray-200 text-gray-400"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${src.active ? "bg-emerald-400" : "bg-gray-300"}`} />
                  {src.name}
                  <SourceEvidenceTip note={src.note} count={src.records} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
