"use client"
import { useEffect, useState, useCallback } from "react"
import {
  RefreshCw, AlertTriangle, CheckCircle, XCircle,
  TrendingUp, Database, Activity, ChevronDown, ChevronUp, Loader2,
} from "lucide-react"

interface HealthData {
  generatedAt: string
  contracts: {
    total: number; enriched: number; pending: number; pctEnriched: number
    enrichmentErrors: number; missingValue: number; missingDept: number
    missingProduct: number; missingState: number; missingMinistry: number
    missingGst: number; lowConfidence: number
    lastCollected: string | null; staleDays: number | null
  }
  dealers: {
    total: number; withScore: number; withoutScore: number
    noBids: number; duplicates: number; scoreAgeDays: number | null
  }
  knowledgeGraph: {
    built: boolean; totalNodes: number
    collections: Record<string, number>
  }
  legacyBids: { gemAwardedBids: number; bidLifecycle: number }
  insights: { total: number; lastUpdated: string | null }
  alerts: { total: number; unread: number }
  harvester: { lastScannedId: number | null; isRunning: boolean }
  queryCache: { size: number }
  websiteProducts: {
    total: number; missingImages: number; missingDesc: number
    missingSpec: number; missingPrice: number; missingSlug: number
  }
  issues: Array<{ sev: "critical" | "warn" | "info"; msg: string; action: string }>
  roiActions: Array<{ rank: number; action: string; why: string; effort: string }>
}

interface EnrichResult {
  ok?: boolean; total?: number; enriched?: number; failed?: number
  message?: string; errors?: string[]; dryRun?: boolean; pending?: number
}

const SEV_CONFIG = {
  critical: { color: "text-red-600",   bg: "bg-red-50",   border: "border-red-200",   icon: XCircle,       badge: "bg-red-100 text-red-700"    },
  warn:     { color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", icon: AlertTriangle, badge: "bg-amber-100 text-amber-700" },
  info:     { color: "text-blue-600",  bg: "bg-blue-50",  border: "border-blue-200",  icon: Activity,      badge: "bg-blue-100 text-blue-700"   },
}

function StatCard({ label, value, sub, color = "text-gray-900", border = "border-gray-200" }: {
  label: string; value: string | number; sub?: string
  color?: string; border?: string
}) {
  return (
    <div className={`bg-white rounded-xl border ${border} p-4 shadow-sm`}>
      <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function ProgressBar({ pct, color = "bg-brand-600" }: { pct: number; color?: string }) {
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 mt-1">
      <div className={`h-2 rounded-full transition-all duration-500 ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  )
}

export function CollectionHealthTab() {
  const [data, setData]             = useState<HealthData | null>(null)
  const [loading, setLoading]       = useState(true)
  const [enriching, setEnriching]   = useState(false)
  const [enrichResult, setEnrichResult] = useState<EnrichResult | null>(null)
  const [showKgDetail, setShowKgDetail] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/procurement/health")
      const d   = await res.json()
      setData(d)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const runEnrich = async (dryRun = false) => {
    setEnriching(true)
    setEnrichResult(null)
    try {
      const res = await fetch("/api/admin/procurement/enrich-pending", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun, maxItems: 600 }),
      })
      const d = await res.json()
      setEnrichResult(d)
      if (!dryRun) await load()
    } catch (e) {
      setEnrichResult({ message: e instanceof Error ? e.message : "Failed" })
    } finally {
      setEnriching(false)
    }
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-xs text-gray-400">Running health checks across all collections…</p>
    </div>
  )

  if (!data) return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-sm text-red-700">
      Failed to load health data. Check API logs.
    </div>
  )

  const { contracts, dealers, knowledgeGraph, insights, harvester, websiteProducts, issues, roiActions } = data

  const criticalCount = issues.filter(i => i.sev === "critical").length
  const warnCount     = issues.filter(i => i.sev === "warn").length

  return (
    <div className="space-y-5">

      {/* Header strip */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            criticalCount > 0 ? "bg-red-100" : warnCount > 0 ? "bg-amber-100" : "bg-green-100"
          }`}>
            {criticalCount > 0
              ? <XCircle size={16} className="text-red-600" />
              : warnCount > 0
              ? <AlertTriangle size={16} className="text-amber-600" />
              : <CheckCircle size={16} className="text-green-600" />
            }
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {criticalCount > 0
                ? `${criticalCount} critical issue${criticalCount > 1 ? "s" : ""} need attention`
                : warnCount > 0
                ? `System healthy — ${warnCount} warning${warnCount > 1 ? "s" : ""}`
                : "All systems healthy"}
            </p>
            <p className="text-[11px] text-gray-400">Last checked: {new Date(data.generatedAt).toLocaleTimeString("en-IN")}</p>
          </div>
        </div>
        <button onClick={load}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
          <RefreshCw size={11} />Refresh
        </button>
      </div>

      {/* Issues list */}
      {issues.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Issues ({issues.length})</h3>
          {issues.map((issue, i) => {
            const cfg = SEV_CONFIG[issue.sev]
            const Icon = cfg.icon
            return (
              <div key={i} className={`flex items-start gap-3 ${cfg.bg} border ${cfg.border} rounded-xl px-4 py-3`}>
                <Icon size={14} className={`${cfg.color} flex-shrink-0 mt-0.5`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold ${cfg.color}`}>{issue.msg}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{issue.action}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${cfg.badge}`}>
                  {issue.sev.toUpperCase()}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Contracts health */}
      <div>
        <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Contract Collection</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          <StatCard label="Total Contracts"  value={contracts.total.toLocaleString("en-IN")} />
          <StatCard
            label="Enriched"
            value={`${contracts.pctEnriched}%`}
            sub={`${contracts.enriched.toLocaleString("en-IN")} of ${contracts.total.toLocaleString("en-IN")}`}
            color={contracts.pctEnriched >= 95 ? "text-green-600" : contracts.pctEnriched >= 80 ? "text-amber-600" : "text-red-600"}
            border={contracts.pctEnriched >= 95 ? "border-green-200" : contracts.pctEnriched >= 80 ? "border-amber-200" : "border-red-200"}
          />
          <StatCard
            label="Pending Enrichment"
            value={contracts.pending.toLocaleString("en-IN")}
            sub="target: 0"
            color={contracts.pending > 0 ? "text-amber-600" : "text-green-600"}
          />
          <StatCard
            label="Last Collected"
            value={contracts.staleDays !== null ? `${contracts.staleDays}d ago` : "Unknown"}
            sub={contracts.lastCollected ? new Date(contracts.lastCollected).toLocaleDateString("en-IN") : "—"}
            color={contracts.staleDays !== null && contracts.staleDays > 10 ? "text-red-600" : "text-gray-900"}
            border={contracts.staleDays !== null && contracts.staleDays > 10 ? "border-red-200" : "border-gray-200"}
          />
        </div>

        {/* Enrichment progress */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-700">Enrichment Progress</span>
            <span className="text-xs text-gray-500">{contracts.pctEnriched}% complete</span>
          </div>
          <ProgressBar
            pct={contracts.pctEnriched}
            color={contracts.pctEnriched >= 95 ? "bg-green-500" : contracts.pctEnriched >= 80 ? "bg-amber-500" : "bg-red-500"}
          />
          <p className="text-[11px] text-gray-400 mt-2">Target: 95% enrichment for full intelligence coverage</p>
        </div>

        {/* Data quality grid */}
        <div className="mt-3 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
            <h4 className="text-xs font-semibold text-gray-700">Field Completeness (of {contracts.total.toLocaleString("en-IN")} contracts)</h4>
          </div>
          <div className="divide-y divide-gray-50">
            {[
              { label: "Contract Value (GMV)",  missing: contracts.missingValue,   total: contracts.total, critical: true  },
              { label: "Department Name",        missing: contracts.missingDept,    total: contracts.total, critical: true  },
              { label: "Product Name",           missing: contracts.missingProduct, total: contracts.total, critical: true  },
              { label: "Seller State",           missing: contracts.missingState,   total: contracts.total, critical: false },
              { label: "Ministry",               missing: contracts.missingMinistry,total: contracts.total, critical: false },
              { label: "Seller GST Number",      missing: contracts.missingGst,     total: contracts.total, critical: false },
              { label: "Low Confidence Extract", missing: contracts.lowConfidence,  total: contracts.total, critical: false },
              { label: "Enrichment Errors",      missing: contracts.enrichmentErrors, total: contracts.total, critical: true },
            ].map(row => {
              const pctMissing = contracts.total > 0 ? Math.round((row.missing / contracts.total) * 100) : 0
              const pctOk      = 100 - pctMissing
              return (
                <div key={row.label} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="text-xs text-gray-600 w-48 flex-shrink-0">{row.label}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                        <div className={`h-1.5 rounded-full ${pctOk >= 95 ? "bg-green-500" : pctOk >= 80 ? "bg-amber-400" : "bg-red-400"}`}
                          style={{ width: `${pctOk}%` }} />
                      </div>
                      <span className={`text-[11px] font-semibold w-10 text-right ${pctOk >= 95 ? "text-green-600" : "text-amber-600"}`}>{pctOk}%</span>
                    </div>
                  </div>
                  <div className="w-20 text-right">
                    {row.missing > 0 ? (
                      <span className={`text-[11px] ${row.critical ? "text-red-600 font-semibold" : "text-amber-600"}`}>
                        {row.missing.toLocaleString("en-IN")} missing
                      </span>
                    ) : (
                      <span className="text-[11px] text-green-600">Complete</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Enrichment control */}
      <div>
        <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Enrichment Control</h3>
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <p className="text-xs font-semibold text-gray-800 mb-1">Re-enrich Pending Contracts</p>
              <p className="text-[11px] text-gray-500">
                Fetches BidPlus pages for all unenriched contracts and extracts: seller name, dept, product, state, GST, and contract value.
                Processes up to 600 contracts per run. <strong className="text-amber-600">Takes 2–5 minutes.</strong>
              </p>
              {contracts.pending > 0 && (
                <p className="text-[11px] text-gray-400 mt-1">
                  {contracts.pending.toLocaleString("en-IN")} contracts pending →
                  ~{Math.ceil(contracts.pending / 600)} run{Math.ceil(contracts.pending / 600) > 1 ? "s" : ""} needed to complete
                </p>
              )}
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={() => runEnrich(true)}
                disabled={enriching || contracts.pending === 0}
                className="text-xs border border-gray-200 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1.5"
              >
                {enriching ? <Loader2 size={12} className="animate-spin" /> : <Database size={12} />}
                Dry Run
              </button>
              <button
                onClick={() => runEnrich(false)}
                disabled={enriching || contracts.pending === 0}
                className="text-xs bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50 flex items-center gap-1.5 font-medium"
              >
                {enriching ? <Loader2 size={12} className="animate-spin" /> : <TrendingUp size={12} />}
                {enriching ? "Running…" : `Enrich ${Math.min(600, contracts.pending)} Contracts`}
              </button>
            </div>
          </div>

          {enrichResult && (
            <div className={`rounded-lg p-3 text-xs ${enrichResult.ok ? "bg-green-50 border border-green-200 text-green-800" : "bg-amber-50 border border-amber-200 text-amber-800"}`}>
              {enrichResult.dryRun
                ? `Dry run: ${enrichResult.pending} contracts would be enriched`
                : enrichResult.message || "Complete"}
              {enrichResult.errors && enrichResult.errors.length > 0 && (
                <p className="mt-1 text-[11px] opacity-70">{enrichResult.errors.length} errors: {enrichResult.errors[0]}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Dealers health */}
      <div>
        <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Dealer Collection</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard label="Total Dealers"       value={dealers.total.toLocaleString("en-IN")} />
          <StatCard
            label="With Opportunity Score"
            value={dealers.total > 0 ? `${Math.round((dealers.withScore / dealers.total) * 100)}%` : "0%"}
            sub={`${dealers.withScore} scored`}
            color={dealers.withScore === dealers.total ? "text-green-600" : "text-amber-600"}
          />
          <StatCard
            label="Duplicate Entities"
            value={dealers.duplicates}
            sub="same canonical name"
            color={dealers.duplicates > 0 ? "text-red-600" : "text-green-600"}
            border={dealers.duplicates > 0 ? "border-red-200" : "border-gray-200"}
          />
        </div>
      </div>

      {/* Knowledge Graph */}
      <div>
        <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Knowledge Graph</h3>
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${knowledgeGraph.built ? "bg-green-500" : "bg-red-500"}`} />
              <span className="text-xs font-semibold text-gray-700">
                {knowledgeGraph.built ? "Built" : "Not built"} · {knowledgeGraph.totalNodes.toLocaleString("en-IN")} total nodes
              </span>
            </div>
            <button onClick={() => setShowKgDetail(!showKgDetail)} className="text-xs text-gray-400 flex items-center gap-1">
              {showKgDetail ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {showKgDetail ? "Hide" : "Details"}
            </button>
          </div>
          {showKgDetail && (
            <div className="border-t border-gray-100 divide-y divide-gray-50">
              {Object.entries(knowledgeGraph.collections).map(([col, count]) => (
                <div key={col} className="flex items-center justify-between px-4 py-2">
                  <span className="text-[11px] font-mono text-gray-500">{col.replace("gem_kg_", "")}</span>
                  <span className={`text-[11px] font-semibold ${count > 0 ? "text-green-600" : "text-red-500"}`}>
                    {count > 0 ? count.toLocaleString("en-IN") + " nodes" : "EMPTY"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Support systems */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Insights"    value={insights.total} sub={insights.lastUpdated ? `Last: ${new Date(insights.lastUpdated).toLocaleDateString("en-IN")}` : "Never generated"} color={insights.total === 0 ? "text-amber-600" : "text-gray-900"} />
        <StatCard label="Alerts"      value={data.alerts.unread} sub={`${data.alerts.total} total`} color={data.alerts.unread > 0 ? "text-amber-600" : "text-gray-900"} />
        <StatCard label="Harvester ID" value={harvester.lastScannedId?.toLocaleString("en-IN") ?? "—"} sub={harvester.isRunning ? "RUNNING" : "Idle"} color={harvester.isRunning ? "text-green-600" : "text-gray-900"} />
        <StatCard label="Query Cache"  value={data.queryCache.size} sub="cached responses" />
      </div>

      {/* ROI Recommendations */}
      <div>
        <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Highest ROI Actions for 100X</h3>
        <div className="space-y-2">
          {roiActions.map(action => (
            <div key={action.rank} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-brand-50 border border-brand-200 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-brand-600">{action.rank}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800">{action.action}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{action.why}</p>
              </div>
              <span className={`text-[10px] px-2 py-1 rounded-full font-medium flex-shrink-0 ${
                action.effort.startsWith("Low") ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
              }`}>{action.effort.split(" — ")[0]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Website Products */}
      <div>
        <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Website Product Integrity</h3>
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
            <h4 className="text-xs font-semibold text-gray-700">Products on 100xcircle.com ({websiteProducts.total} total)</h4>
          </div>
          <div className="divide-y divide-gray-50">
            {[
              { label: "Missing product images",        count: websiteProducts.missingImages, critical: true  },
              { label: "Missing product description",   count: websiteProducts.missingDesc,   critical: true  },
              { label: "Missing specifications",        count: websiteProducts.missingSpec,   critical: false },
              { label: "Missing price",                 count: websiteProducts.missingPrice,  critical: true  },
              { label: "Missing URL slug",              count: websiteProducts.missingSlug,   critical: true  },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-xs text-gray-600">{row.label}</span>
                <span className={`text-xs font-semibold ${
                  row.count === 0 ? "text-green-600" : row.critical ? "text-red-600" : "text-amber-600"
                }`}>
                  {row.count === 0 ? "OK" : `${row.count} products`}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
