"use client"
import { useState, useEffect, useCallback } from "react"
import {
  Link2, Play, RefreshCw, CheckCircle, XCircle, AlertCircle,
  Shield, BarChart2, TrendingUp, ChevronRight,
} from "lucide-react"

interface CycleResult {
  cycle:       number
  vertical:    string
  newInserted: number
  domains:     string[]
  topScore:    number
  avgScore:    number
  error:       string | null
  durationMs:  number
}

interface ValidationReport {
  reportId:    string
  createdAt:   string
  completedAt: string
  totalDurationMs: number
  summary: {
    cyclesRun:              number
    errorsEncountered:      number
    totalNewInserted:       number
    totalOpportunitiesInDB: number
    crossCycleDuplicatesCaught: number
    duplicateDomainCountInDB:   number
    deduplicationWorking:       boolean
    avgNewPerCycle:             number
  }
  qualityReport: {
    scoreDistribution: { excellent: number; good: number; average: number; low: number }
    typeDistribution:  Record<string, number>
    avgPriorityScore:  number
    topDomains:        Array<{ domain: string; score: number; vertical: string }>
  }
  cycleResults: CycleResult[]
}

export default function OffPageValidatePage() {
  const [report, setReport]   = useState<ValidationReport | null>(null)
  const [history, setHistory] = useState<ValidationReport[]>([])
  const [loading, setLoading] = useState(false)
  const [cycles, setCycles]   = useState(10)
  const [error, setError]     = useState("")

  const loadHistory = useCallback(async () => {
    const res  = await fetch("/api/admin/growth/seo/offpage/validate")
    const data = await res.json()
    if (Array.isArray(data) && data.length) { setHistory(data); setReport(data[0]) }
  }, [])

  useEffect(() => { loadHistory() }, [loadHistory])

  async function runValidation() {
    setLoading(true)
    setError("")
    try {
      const res  = await fetch("/api/admin/growth/seo/offpage/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run_validation", cycles }),
      })
      const data = await res.json()
      if (data.ok) { setReport(data.report); await loadHistory() }
      else setError(data.error ?? "Validation failed")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error")
    } finally {
      setLoading(false)
    }
  }

  const dedupeOk   = report?.summary.deduplicationWorking
  const errorsOk   = (report?.summary.errorsEncountered ?? 0) === 0
  const qualityOk  = (report?.qualityReport.avgPriorityScore ?? 0) >= 6
  const overallPass = dedupeOk && errorsOk && qualityOk

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white flex items-center gap-2">
            <Link2 size={20} className="text-brand-400" />
            Off-Page SEO Validation
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Run {cycles} discovery cycles · Verify deduplication · Verify spam filtering · Quality report
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <select
            value={cycles}
            onChange={e => setCycles(Number(e.target.value))}
            className="bg-gray-900 border border-gray-700 text-gray-300 text-xs rounded-lg px-2.5 py-1.5"
            disabled={loading}
          >
            {[3, 5, 7, 10].map(n => <option key={n} value={n}>{n} cycles</option>)}
          </select>
          <button
            onClick={runValidation}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
          >
            {loading ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
            {loading ? `Running… (est. ${cycles * 5}s)` : "Run Validation"}
          </button>
        </div>
      </div>

      {loading && (
        <div className="bg-brand-600/10 border border-brand-500/25 rounded-xl p-4 flex items-center gap-3">
          <RefreshCw size={16} className="text-brand-400 animate-spin shrink-0" />
          <div>
            <p className="text-sm text-brand-300 font-medium">Validation in progress…</p>
            <p className="text-xs text-brand-400/60 mt-0.5">Running {cycles} discovery cycles sequentially. Each call to Claude takes ~3–5s. Do not navigate away.</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-950/40 border border-red-500/30 rounded-xl p-3 flex items-center gap-2 text-red-400 text-sm">
          <AlertCircle size={14} />{error}
        </div>
      )}

      {report && (
        <>
          {/* Pass/Fail summary */}
          <div className={`rounded-xl border p-4 flex items-center gap-4 ${overallPass ? "bg-green-500/10 border-green-500/25" : "bg-amber-500/10 border-amber-500/25"}`}>
            {overallPass
              ? <CheckCircle size={20} className="text-green-400 shrink-0" />
              : <AlertCircle size={20} className="text-amber-400 shrink-0" />
            }
            <div>
              <p className={`text-sm font-semibold ${overallPass ? "text-green-400" : "text-amber-400"}`}>
                {overallPass ? "Validation Passed — system is working correctly" : "Validation Warnings — review issues below"}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {new Date(report.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} · {(report.totalDurationMs / 1000).toFixed(1)}s total
              </p>
            </div>
          </div>

          {/* Check cards */}
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                label:  "Deduplication",
                ok:     dedupeOk,
                value:  `${report.summary.crossCycleDuplicatesCaught} cross-cycle dups caught`,
                detail: `${report.summary.duplicateDomainCountInDB} duplicate domains in DB${dedupeOk ? " (should be 0 ✓)" : " — FIX NEEDED"}`,
                icon:   Shield,
              },
              {
                label:  "Error Rate",
                ok:     errorsOk,
                value:  `${report.summary.errorsEncountered}/${report.summary.cyclesRun} cycles failed`,
                detail: errorsOk ? "All cycles completed successfully" : `${report.summary.errorsEncountered} cycle(s) hit errors — check Claude API key`,
                icon:   AlertCircle,
              },
              {
                label:  "Opportunity Quality",
                ok:     qualityOk,
                value:  `Avg priority: ${report.qualityReport.avgPriorityScore.toFixed(1)}/10`,
                detail: `${report.qualityReport.scoreDistribution.excellent} excellent · ${report.qualityReport.scoreDistribution.good} good · ${report.qualityReport.scoreDistribution.average} average · ${report.qualityReport.scoreDistribution.low} low`,
                icon:   TrendingUp,
              },
            ].map(({ label, ok, value, detail, icon: Icon }) => (
              <div key={label} className={`border rounded-xl p-4 ${ok ? "border-green-500/20 bg-green-500/5" : "border-red-500/20 bg-red-500/5"}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={13} className={ok ? "text-green-400" : "text-red-400"} />
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</span>
                  {ok
                    ? <CheckCircle size={11} className="text-green-400 ml-auto" />
                    : <XCircle size={11} className="text-red-400 ml-auto" />
                  }
                </div>
                <div className={`text-lg font-bold ${ok ? "text-green-400" : "text-red-400"}`}>{value}</div>
                <div className="text-xs text-gray-500 mt-1">{detail}</div>
              </div>
            ))}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "New Opportunities",    value: report.summary.totalNewInserted },
              { label: "Total in DB",          value: report.summary.totalOpportunitiesInDB },
              { label: "Avg per Cycle",        value: report.summary.avgNewPerCycle },
              { label: "Cycles Run",           value: report.summary.cyclesRun },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-3">
                <div className="text-2xl font-bold text-white">{value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-5">
            {/* Cycle breakdown */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
                <BarChart2 size={13} className="text-gray-500" />
                <span className="text-xs font-medium text-gray-400">Cycle Breakdown</span>
              </div>
              <div className="divide-y divide-gray-800">
                {report.cycleResults.map(r => (
                  <div key={r.cycle} className="px-4 py-2.5 flex items-center gap-3">
                    <div className="w-5 h-5 rounded bg-gray-800 flex items-center justify-center text-[10px] font-bold text-gray-400 shrink-0">
                      {r.cycle}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-300 truncate">{r.vertical}</div>
                      {r.error && <div className="text-[10px] text-red-400 truncate">{r.error}</div>}
                    </div>
                    <div className="flex items-center gap-3 shrink-0 text-xs">
                      <span className={r.newInserted > 0 ? "text-green-400" : "text-gray-600"}>
                        +{r.newInserted}
                      </span>
                      <span className="text-gray-600">{(r.durationMs / 1000).toFixed(1)}s</span>
                      {r.error
                        ? <XCircle size={11} className="text-red-400" />
                        : <CheckCircle size={11} className="text-green-500" />
                      }
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top opportunities found */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
                <TrendingUp size={13} className="text-gray-500" />
                <span className="text-xs font-medium text-gray-400">Top Opportunities Found</span>
              </div>
              {report.qualityReport.topDomains.length === 0 ? (
                <div className="p-8 text-center text-gray-600 text-sm">No new opportunities added</div>
              ) : (
                <div className="divide-y divide-gray-800">
                  {report.qualityReport.topDomains.map(d => (
                    <div key={d.domain} className="px-4 py-2.5 flex items-center gap-3">
                      <div className="flex-1">
                        <div className="text-xs text-gray-300">{d.domain}</div>
                        <div className="text-[10px] text-gray-600">{d.vertical}</div>
                      </div>
                      <div className={`text-sm font-bold ${d.score >= 8 ? "text-green-400" : d.score >= 6 ? "text-amber-400" : "text-gray-500"}`}>
                        {d.score.toFixed(1)}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Type distribution */}
              <div className="px-4 py-3 border-t border-gray-800">
                <div className="text-xs font-medium text-gray-500 mb-2">Type Distribution (new opportunities)</div>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(report.qualityReport.typeDistribution).map(([type, count]) => (
                    <span key={type} className="text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">
                      {type}: {count}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {!report && !loading && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-10 text-center space-y-3">
          <Link2 size={32} className="text-gray-700 mx-auto" />
          <div>
            <p className="text-white font-medium">No validation run yet</p>
            <p className="text-sm text-gray-500 mt-1">
              Run validation to verify deduplication, spam filtering, and opportunity quality across 10 discovery cycles.
            </p>
          </div>
          <button
            onClick={runValidation}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-sm rounded-lg transition-colors mt-2"
          >
            <Play size={14} />Run {cycles}-Cycle Validation
          </button>
        </div>
      )}

      {/* Past reports */}
      {history.length > 1 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800 text-xs font-medium text-gray-400">Past Validation Reports</div>
          <div className="divide-y divide-gray-800">
            {history.slice(0, 5).map(h => (
              <button key={h.reportId} onClick={() => setReport(h)}
                className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-gray-800/40 transition-colors group text-left">
                <div className="flex-1">
                  <div className="text-xs text-gray-300">{new Date(h.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}</div>
                  <div className="text-[11px] text-gray-600">
                    {h.summary.cyclesRun} cycles · +{h.summary.totalNewInserted} new · {h.summary.deduplicationWorking ? "Dedup OK" : "Dedup Issues"}
                  </div>
                </div>
                <ChevronRight size={12} className="text-gray-600 group-hover:text-gray-400 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
