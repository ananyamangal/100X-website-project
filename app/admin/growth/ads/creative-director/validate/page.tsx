"use client"
import { useState, useEffect, useCallback } from "react"
import {
  Wand2, Play, RefreshCw, CheckCircle, AlertCircle,
  TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp,
  Eye, EyeOff,
} from "lucide-react"

interface ExistingAssets {
  headlines:    string[]
  descriptions: string[]
  cqs:          number
  source:       string
  planId:       string | null
  planStatus:   string | null
}

interface NewAssets {
  runId:             string
  topHeadlines:      Array<{ text: string; composite: number; withinLimit: boolean }>
  topDescriptions:   Array<{ text: string; composite: number }>
  cqs:               number
  frameworkCoverage: number
  cost:              { costINR: number; totalTokens: number }
}

interface CampaignResult {
  campaignId:    string
  campaignLabel: string
  objective:     string
  audience:      string
  existingAssets: ExistingAssets
  newAssets:      NewAssets | null
  cdError:        string
  decision:       { verdict: "REPLACE" | "HYBRID" | "KEEP"; reason: string } | null
}

interface ValidationReport {
  reportId:  string
  createdAt: string
  model:     string
  results:   CampaignResult[]
}

type ModelTier = "haiku" | "sonnet" | "opus"

const VERDICT_STYLES = {
  REPLACE: "bg-green-500/15 border-green-500/30 text-green-400",
  HYBRID:  "bg-amber-500/15 border-amber-500/30 text-amber-400",
  KEEP:    "bg-blue-500/15 border-blue-500/30 text-blue-400",
}

const VERDICT_ICON = {
  REPLACE: TrendingUp,
  HYBRID:  Minus,
  KEEP:    TrendingDown,
}

const CQS_COLOR = (s: number) => s >= 7 ? "text-green-400" : s >= 5 ? "text-amber-400" : "text-red-400"

function CQSBadge({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className={`text-xl font-bold ${CQS_COLOR(value)}`}>{value.toFixed(1)}</div>
      <div className="text-[10px] text-gray-500">{label}</div>
    </div>
  )
}

function CampaignCard({ result, defaultExpanded }: { result: CampaignResult; defaultExpanded: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [showAll, setShowAll]   = useState(false)

  const delta = result.newAssets && result.existingAssets
    ? result.newAssets.cqs - result.existingAssets.cqs
    : null

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      {/* Card header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-800/30 transition-colors"
      >
        <div className="flex-1 flex items-center gap-3">
          <span className="text-sm font-semibold text-white">{result.campaignLabel}</span>
          <span className="text-xs text-gray-500">{result.objective.replace(/_/g, " ")}</span>
          {result.decision && (
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${VERDICT_STYLES[result.decision.verdict]}`}>
              {result.decision.verdict}
            </span>
          )}
          {result.cdError && (
            <span className="text-xs text-red-400 flex items-center gap-1">
              <AlertCircle size={11} />Error
            </span>
          )}
        </div>
        {/* CQS comparison */}
        {result.newAssets && (
          <div className="flex items-center gap-4 mr-4">
            <CQSBadge value={result.existingAssets.cqs} label="Existing CQS" />
            <div className="flex items-center gap-1">
              {delta !== null && delta > 0 && <TrendingUp size={12} className="text-green-400" />}
              {delta !== null && delta < 0 && <TrendingDown size={12} className="text-red-400" />}
              {delta !== null && delta === 0 && <Minus size={12} className="text-gray-400" />}
              <span className={`text-xs font-bold ${delta !== null && delta > 0 ? "text-green-400" : delta !== null && delta < 0 ? "text-red-400" : "text-gray-400"}`}>
                {delta !== null ? (delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)) : "—"}
              </span>
            </div>
            <CQSBadge value={result.newAssets.cqs} label="CD CQS" />
          </div>
        )}
        {expanded ? <ChevronUp size={14} className="text-gray-500 shrink-0" /> : <ChevronDown size={14} className="text-gray-500 shrink-0" />}
      </button>

      {expanded && (
        <div className="border-t border-gray-800">
          {/* Decision banner */}
          {result.decision && (
            <div className={`px-4 py-2.5 border-b border-gray-800 flex items-center gap-2 text-sm ${VERDICT_STYLES[result.decision.verdict]}`}>
              {(() => { const Icon = VERDICT_ICON[result.decision.verdict]; return <Icon size={13} /> })()}
              <span className="font-semibold mr-1">Recommendation:</span>
              {result.decision.reason}
            </div>
          )}

          {result.cdError && (
            <div className="px-4 py-2.5 border-b border-gray-800 bg-red-950/20 text-red-400 text-sm">
              Generation failed: {result.cdError}
            </div>
          )}

          <div className="p-4 grid grid-cols-2 gap-6">
            {/* Existing assets */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Existing RSA {result.existingAssets.source === "none" ? "(none found)" : `· CQS ${result.existingAssets.cqs.toFixed(1)}/10`}
                </h4>
                {result.existingAssets.planStatus && (
                  <span className="text-[10px] text-gray-600">{result.existingAssets.planStatus}</span>
                )}
              </div>
              {result.existingAssets.headlines.length === 0 ? (
                <p className="text-xs text-gray-600 italic">No existing plan found in ads_campaign_plans</p>
              ) : (
                <div className="space-y-1">
                  {(showAll ? result.existingAssets.headlines : result.existingAssets.headlines.slice(0, 7)).map((h, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${h.length <= 30 ? "bg-gray-800 text-gray-400" : "bg-red-950/40 text-red-400"}`}>
                        {h.length}
                      </span>
                      <span className="text-sm text-gray-300">{h}</span>
                    </div>
                  ))}
                  {result.existingAssets.headlines.length > 7 && (
                    <button onClick={() => setShowAll(!showAll)} className="text-xs text-gray-500 hover:text-gray-400 flex items-center gap-1 mt-1">
                      {showAll ? <><EyeOff size={10} />Show less</> : <><Eye size={10} />+{result.existingAssets.headlines.length - 7} more</>}
                    </button>
                  )}
                </div>
              )}
              {result.existingAssets.descriptions.slice(0, 2).map((d, i) => (
                <div key={i} className="mt-2 text-xs text-gray-500 border-l-2 border-gray-700 pl-2">{d}</div>
              ))}
            </div>

            {/* Creative Director assets */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-semibold text-brand-400 uppercase tracking-wide">
                  Creative Director · CQS {result.newAssets?.cqs.toFixed(1) ?? "—"}/10
                </h4>
                {result.newAssets?.frameworkCoverage && (
                  <span className="text-[10px] text-gray-600">{result.newAssets.frameworkCoverage}/8 frameworks</span>
                )}
              </div>
              {result.newAssets ? (
                <div className="space-y-1">
                  {result.newAssets.topHeadlines.map((h, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${h.withinLimit ? "bg-gray-800 text-gray-400" : "bg-red-950/40 text-red-400"}`}>
                        {h.text.length}
                      </span>
                      <span className="text-sm text-gray-300 flex-1">{h.text}</span>
                      <span className="text-[10px] text-gray-600 shrink-0">{h.composite.toFixed(1)}</span>
                    </div>
                  ))}
                  {result.newAssets.topDescriptions.slice(0, 2).map((d, i) => (
                    <div key={i} className="mt-2 text-xs text-gray-400 border-l-2 border-brand-600/30 pl-2">{d.text}</div>
                  ))}
                  <div className="text-[10px] text-gray-600 mt-2">
                    ₹{result.newAssets.cost.costINR.toFixed(2)} · {result.newAssets.cost.totalTokens.toLocaleString()} tokens
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-600 italic">Not generated yet</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function CreativeDirectorValidatePage() {
  const [report, setReport]       = useState<ValidationReport | null>(null)
  const [history, setHistory]     = useState<ValidationReport[]>([])
  const [loading, setLoading]     = useState(false)
  const [runningId, setRunningId] = useState<string | null>(null)
  const [model, setModel]         = useState<ModelTier>("sonnet")
  const [error, setError]         = useState("")

  const loadHistory = useCallback(async () => {
    const res  = await fetch("/api/admin/growth/ads/creative-director/validate")
    const data = await res.json()
    if (Array.isArray(data) && data.length) { setHistory(data); setReport(data[0]) }
  }, [])

  useEffect(() => { loadHistory() }, [loadHistory])

  async function runAll() {
    setLoading(true)
    setRunningId(null)
    setError("")
    try {
      const res  = await fetch("/api/admin/growth/ads/creative-director/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run_validation", model }),
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

  async function runSingle(campaignId: string) {
    setRunningId(campaignId)
    setError("")
    try {
      const res  = await fetch("/api/admin/growth/ads/creative-director/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run_validation", campaignId, model }),
      })
      const data = await res.json()
      if (data.ok) {
        // Merge single result into current report
        setReport(prev => prev ? {
          ...prev,
          results: prev.results.map(r =>
            r.campaignId === campaignId ? (data.report.results[0] ?? r) : r
          ),
        } : data.report)
      } else {
        setError(data.error ?? "Run failed")
      }
    } finally {
      setRunningId(null)
    }
  }

  const verdictCounts = report?.results.reduce((acc, r) => {
    if (r.decision) acc[r.decision.verdict] = (acc[r.decision.verdict] ?? 0) + 1
    return acc
  }, {} as Record<string, number>) ?? {}

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white flex items-center gap-2">
            <Wand2 size={20} className="text-brand-400" />
            Creative Director Validation
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Compare existing RSA assets vs Creative Director output · Recommend KEEP / REPLACE / HYBRID
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {(["haiku", "sonnet", "opus"] as ModelTier[]).map(m => (
            <button key={m}
              onClick={() => setModel(m)}
              className={`px-2.5 py-1.5 rounded-lg text-xs border transition-all ${
                model === m
                  ? "bg-brand-600/20 border-brand-500/40 text-brand-300"
                  : "border-gray-700 text-gray-500 hover:border-gray-600 hover:text-gray-400"
              }`}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
          <button
            onClick={runAll}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
          >
            {loading ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
            {loading ? "Running…" : "Run All 3 Campaigns"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-950/40 border border-red-500/30 rounded-xl p-3 flex items-center gap-2 text-red-400 text-sm">
          <AlertCircle size={14} />{error}
        </div>
      )}

      {/* Summary row */}
      {report && (
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">Last run: {new Date(report.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}</span>
          {Object.entries(verdictCounts).map(([verdict, count]) => (
            <span key={verdict} className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${VERDICT_STYLES[verdict as keyof typeof VERDICT_STYLES]}`}>
              {count}× {verdict}
            </span>
          ))}
        </div>
      )}

      {/* Campaign cards */}
      {report ? (
        <div className="space-y-3">
          {report.results.map((result, i) => (
            <div key={result.campaignId} className="relative">
              <CampaignCard result={result} defaultExpanded={i === 0} />
              <button
                onClick={() => runSingle(result.campaignId)}
                disabled={runningId === result.campaignId}
                className="absolute top-3 right-10 flex items-center gap-1 text-[10px] text-gray-600 hover:text-gray-400 transition-colors"
              >
                {runningId === result.campaignId
                  ? <><RefreshCw size={10} className="animate-spin" />Running…</>
                  : <><RefreshCw size={10} />Re-run</>
                }
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-10 text-center space-y-3">
          <Wand2 size={32} className="text-gray-700 mx-auto" />
          <div>
            <p className="text-white font-medium">No validation run yet</p>
            <p className="text-sm text-gray-500 mt-1">
              Run validation to compare Creative Director output against existing RSA assets.
            </p>
          </div>
          <button
            onClick={runAll}
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-sm rounded-lg transition-colors"
          >
            {loading ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
            Run Validation
          </button>
        </div>
      )}

      {/* Interpretation guide */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <p className="text-xs font-medium text-gray-400 mb-2">How verdicts work</p>
        <div className="grid grid-cols-3 gap-3 text-xs">
          {[
            { v: "REPLACE", desc: "Creative Director CQS > Existing CQS + 1.0 — full replacement recommended" },
            { v: "HYBRID",  desc: "Scores within ±1.0 — use Creative Director for A/B testing against existing" },
            { v: "KEEP",    desc: "Existing assets score higher — re-run with better keywords before replacing" },
          ].map(({ v, desc }) => (
            <div key={v} className="flex items-start gap-2">
              <span className={`font-bold mt-0.5 ${VERDICT_STYLES[v as keyof typeof VERDICT_STYLES].split(" ")[2]}`}>{v}</span>
              <span className="text-gray-500">{desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* History */}
      {history.length > 1 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800 text-xs font-medium text-gray-400">Past Validation Runs</div>
          <div className="divide-y divide-gray-800">
            {history.slice(0, 5).map(h => (
              <button key={h.reportId} onClick={() => setReport(h)}
                className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-gray-800/40 transition-colors group text-left">
                <div className="flex-1">
                  <div className="text-xs text-gray-300">{new Date(h.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}</div>
                  <div className="text-[11px] text-gray-600 flex gap-2 mt-0.5">
                    {h.results.filter(r => r.decision?.verdict === "REPLACE").length > 0 && (
                      <span className="text-green-500">{h.results.filter(r => r.decision?.verdict === "REPLACE").length}× REPLACE</span>
                    )}
                    {h.results.filter(r => r.decision?.verdict === "HYBRID").length > 0 && (
                      <span className="text-amber-500">{h.results.filter(r => r.decision?.verdict === "HYBRID").length}× HYBRID</span>
                    )}
                    {h.results.filter(r => r.decision?.verdict === "KEEP").length > 0 && (
                      <span className="text-blue-500">{h.results.filter(r => r.decision?.verdict === "KEEP").length}× KEEP</span>
                    )}
                  </div>
                </div>
                <CheckCircle size={12} className="text-gray-600 group-hover:text-gray-400 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
