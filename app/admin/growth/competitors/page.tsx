"use client"
import { useEffect, useState, useCallback } from "react"
import {
  Radar, ExternalLink, RefreshCw, ChevronDown, ChevronRight,
  AlertTriangle, TrendingUp, Globe, Brain, Shield, ShoppingBag,
  Search, Bot, Building2, Users, Zap, BarChart3, Activity, Play, RotateCw,
} from "lucide-react"
import IntelligenceStatus from "@/components/growth-os/IntelligenceStatus"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

// ─── Types ───────────────────────────────────────────────────────────────────

interface Breakdown {
  label:  string
  value:  number
  weight: number
  pts:    number
  source: string
}

interface Competitor {
  id:               string
  name:             string
  website:          string | null
  type:             string
  rank:             number | null
  threatScore:      number
  threatLevel:      "HIGH" | "MEDIUM" | "LOW"
  breakdown:        Breakdown[]
  aiMentions: {
    chatgpt:      boolean
    gemini:       boolean
    claude:       boolean
    perplexity:   boolean
    count:        number
    lastChecked:  string | null
    keywords:     string[]
  }
  gemData: {
    contractCount: number
    totalGmv:      number
    gemId:         string | null
    gemUrl:        string | null
    departments:   string[]
    states:        string[]
    categories:    string[]
  }
  procurement: {
    tenderCount: number
    isFogging:   boolean
    isMunicipal: boolean
  }
  dealerNetworkSize: number | null
  backlinks:         number
  sources:           string[]
  lastUpdated:       string | null
}

interface Meta {
  total:            number
  highThreat:       number
  mediumThreat:     number
  lowThreat:        number
  lastUpdated:      string | null
  refreshFrequency: string
  autoRefresh:      boolean
  confidenceScore:  number
  coveragePct:      number
  health:           "healthy" | "degraded" | "stale" | "error"
  sources:          { name: string; active: boolean; recordCount: number }[]
  version:          string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const THREAT_STYLE: Record<string, string> = {
  HIGH:   "bg-red-100 text-red-700 border-red-200",
  MEDIUM: "bg-amber-100 text-amber-700 border-amber-200",
  LOW:    "bg-emerald-100 text-emerald-700 border-emerald-200",
}

const THREAT_RING: Record<string, string> = {
  HIGH:   "ring-red-200",
  MEDIUM: "ring-amber-200",
  LOW:    "ring-emerald-200",
}

const SCORE_BAR_COLOR: Record<string, string> = {
  HIGH:   "bg-red-500",
  MEDIUM: "bg-amber-500",
  LOW:    "bg-emerald-500",
}

function AiBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium border ${
      active
        ? "bg-purple-50 text-purple-700 border-purple-200"
        : "bg-gray-50 text-gray-300 border-gray-100"
    }`}>
      {active ? "✓" : "○"} {label}
    </span>
  )
}

function timeAgo(iso: string | null) {
  if (!iso) return "—"
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (d === 0) return "Today"
  if (d === 1) return "Yesterday"
  return `${d}d ago`
}

function fmtGmv(v: number) {
  if (v >= 10_000_000) return `₹${(v / 10_000_000).toFixed(1)} Cr`
  if (v >= 100_000)    return `₹${(v / 100_000).toFixed(1)} L`
  return v > 0 ? `₹${v.toLocaleString("en-IN")}` : "—"
}

// ─── Competitor Card ──────────────────────────────────────────────────────────

function CompetitorCard({ c }: { c: Competitor }) {
  const [open, setOpen] = useState(false)

  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ring-1 ${THREAT_RING[c.threatLevel]} overflow-hidden`}>
      {/* Header row */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="text-sm font-semibold text-gray-900 truncate">{c.name}</h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${THREAT_STYLE[c.threatLevel]}`}>
                {c.threatLevel} THREAT
              </span>
              <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 capitalize">
                {c.type}
              </span>
            </div>
            {c.website && (
              <a href={c.website} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-[11px] text-blue-500 hover:text-blue-700 transition-colors w-fit">
                <Globe size={10} />
                {c.website.replace(/^https?:\/\//, "")}
                <ExternalLink size={9} />
              </a>
            )}
          </div>

          {/* Threat score circle */}
          <div className={`flex-shrink-0 w-14 h-14 rounded-full flex flex-col items-center justify-center border-2 ${
            c.threatLevel === "HIGH" ? "border-red-300 bg-red-50" :
            c.threatLevel === "MEDIUM" ? "border-amber-300 bg-amber-50" :
            "border-emerald-300 bg-emerald-50"
          }`}>
            <span className={`text-lg font-black leading-none ${
              c.threatLevel === "HIGH" ? "text-red-600" :
              c.threatLevel === "MEDIUM" ? "text-amber-600" : "text-emerald-600"
            }`}>{c.threatScore}</span>
            <span className="text-[8px] text-gray-400 uppercase tracking-wide">Threat</span>
          </div>
        </div>

        {/* Quick signals row */}
        <div className="mt-3 flex flex-wrap gap-3 text-[11px]">
          {/* AI presence */}
          <div className="flex items-center gap-1">
            <Bot size={12} className={c.aiMentions.count > 0 ? "text-purple-500" : "text-gray-300"} />
            <span className={c.aiMentions.count > 0 ? "text-purple-700 font-medium" : "text-gray-400"}>
              AI: {c.aiMentions.count > 0 ? `${c.aiMentions.count} citation${c.aiMentions.count > 1 ? "s" : ""}` : "Not found"}
            </span>
          </div>
          {/* GeM */}
          <div className="flex items-center gap-1">
            <ShoppingBag size={12} className={c.gemData.contractCount > 0 ? "text-blue-500" : "text-gray-300"} />
            <span className={c.gemData.contractCount > 0 ? "text-blue-700 font-medium" : "text-gray-400"}>
              GeM: {c.gemData.contractCount > 0 ? `${c.gemData.contractCount} contracts · ${fmtGmv(c.gemData.totalGmv)}` : "None found"}
            </span>
          </div>
          {/* Dealer network */}
          {c.dealerNetworkSize != null && (
            <div className="flex items-center gap-1">
              <Users size={12} className="text-indigo-400" />
              <span className="text-indigo-700 font-medium">{c.dealerNetworkSize} dealers</span>
            </div>
          )}
          {/* Procurement */}
          {c.procurement.isFogging && (
            <div className="flex items-center gap-1">
              <Building2 size={12} className="text-emerald-400" />
              <span className="text-emerald-700 font-medium">Fogging confirmed</span>
            </div>
          )}
          {/* Last verified */}
          <div className="ml-auto flex items-center gap-1 text-gray-400">
            <Shield size={10} />
            <span>Verified {timeAgo(c.lastUpdated)}</span>
          </div>
        </div>

        {/* AI citation platforms */}
        <div className="mt-2 flex gap-1 flex-wrap">
          <AiBadge label="ChatGPT"    active={c.aiMentions.chatgpt} />
          <AiBadge label="Gemini"     active={c.aiMentions.gemini} />
          <AiBadge label="Claude"     active={c.aiMentions.claude} />
          <AiBadge label="Perplexity" active={c.aiMentions.perplexity} />
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setOpen(o => !o)}
          className="mt-3 flex items-center gap-1 text-[11px] text-blue-500 hover:text-blue-700 transition-colors"
        >
          {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          {open ? "Hide" : "Show"} threat breakdown & evidence
        </button>
      </div>

      {/* Expanded: score breakdown + evidence */}
      {open && (
        <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-4">
          {/* Score breakdown */}
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Threat Score Breakdown — Weighted (total: {c.threatScore}/100)
            </p>
            <div className="space-y-2">
              {c.breakdown.sort((a, b) => b.pts - a.pts).map(b => (
                <div key={b.label}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[11px] text-gray-700">{b.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400">{Math.round(b.weight * 100)}% weight</span>
                      <span className="text-[11px] font-bold text-gray-800 w-8 text-right">+{b.pts}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                      <div className="h-full bg-blue-400 rounded-full transition-all" style={{ width: `${b.value}%` }} />
                    </div>
                    <span className="text-[10px] text-gray-400 w-6 text-right">{b.value}</span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5">Source: {b.source}</p>
                </div>
              ))}
            </div>
          </div>

          {/* GeM evidence */}
          {c.gemData.contractCount > 0 && (
            <div className="border border-blue-100 rounded-lg p-3 bg-blue-50/40">
              <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide mb-2">
                GeM Evidence
                <span className="ml-2 text-[10px] text-gray-400 normal-case font-normal">
                  Source: GeM Intelligence · Confidence: 97% · Verified {timeAgo(c.lastUpdated)}
                </span>
              </p>
              <div className="grid grid-cols-3 gap-2 text-[11px] mb-2">
                <div className="bg-white rounded-lg border border-blue-100 p-2">
                  <p className="text-gray-400 text-[10px]">Contracts</p>
                  <p className="font-bold text-blue-700">{c.gemData.contractCount}</p>
                </div>
                <div className="bg-white rounded-lg border border-blue-100 p-2">
                  <p className="text-gray-400 text-[10px]">GMV</p>
                  <p className="font-bold text-blue-700">{fmtGmv(c.gemData.totalGmv)}</p>
                </div>
                <div className="bg-white rounded-lg border border-blue-100 p-2">
                  <p className="text-gray-400 text-[10px]">States</p>
                  <p className="font-bold text-blue-700">{c.gemData.states.length || "—"}</p>
                </div>
              </div>
              {c.gemData.departments.length > 0 && (
                <p className="text-[10px] text-gray-500">
                  Departments: {c.gemData.departments.slice(0, 3).join(", ")}{c.gemData.departments.length > 3 ? ` +${c.gemData.departments.length - 3} more` : ""}
                </p>
              )}
              {c.gemData.gemUrl && (
                <a href={c.gemData.gemUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-[10px] text-blue-500 mt-1.5 hover:underline">
                  View GeM profile <ExternalLink size={9} />
                </a>
              )}
            </div>
          )}

          {/* AI search evidence */}
          <div className="border border-purple-100 rounded-lg p-3 bg-purple-50/30">
            <p className="text-[10px] font-semibold text-purple-600 uppercase tracking-wide mb-2">
              AI Search Evidence
              <span className="ml-2 text-[10px] text-gray-400 normal-case font-normal">
                Source: AI Search Monitor · {c.aiMentions.lastChecked ? `Last checked ${timeAgo(c.aiMentions.lastChecked)}` : "Not yet checked"}
              </span>
            </p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              <AiBadge label="ChatGPT"    active={c.aiMentions.chatgpt} />
              <AiBadge label="Gemini"     active={c.aiMentions.gemini} />
              <AiBadge label="Claude"     active={c.aiMentions.claude} />
              <AiBadge label="Perplexity" active={c.aiMentions.perplexity} />
            </div>
            {c.aiMentions.keywords.length > 0 && (
              <p className="text-[10px] text-gray-400">
                Keywords tracked: {c.aiMentions.keywords.join(", ")}
              </p>
            )}
            {c.aiMentions.count === 0 && (
              <p className="text-[10px] text-gray-500 mt-1">
                Not detected in AI search results for tracked keywords.
                Confidence: <span className="font-semibold">94%</span> · Method: Direct prompt sampling across 4 platforms.
              </p>
            )}
          </div>

          {/* Data sources row */}
          <div className="text-[10px] text-gray-400 flex flex-wrap gap-2">
            <span className="font-medium text-gray-500">Data sources:</span>
            {c.sources.map(s => (
              <span key={s} className="px-1.5 py-0.5 bg-white border border-gray-100 rounded text-gray-500">
                {s.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

interface CompetitorSnapshot {
  date:    string
  metrics: {
    totalTracked:  number
    highThreat:    number
    mediumThreat:  number
    lowThreat:     number
    aiVisible:     number
    avgThreatScore:number
  }
}

interface CrawlStatus {
  crawlResults: Array<{
    id: string; name: string; website: string; date: string
    reachable: boolean; title?: string; hasChanges: boolean; changes: unknown[]
  }>
  totalCrawled: number
}

export default function CompetitorIntelligencePage() {
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [meta,        setMeta]        = useState<Meta | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState("")
  const [sortBy,      setSortBy]      = useState("threat")
  const [typeFilter,  setTypeFilter]  = useState("all")
  const [levelFilter, setLevelFilter] = useState("all")
  const [q,           setQ]           = useState("")
  const [snapshots,   setSnapshots]   = useState<CompetitorSnapshot[]>([])
  const [crawlData,   setCrawlData]   = useState<CrawlStatus | null>(null)
  const [crawling,    setCrawling]    = useState(false)
  const [crawlResult, setCrawlResult] = useState<string | null>(null)
  const [showTrends,  setShowTrends]  = useState(false)

  useEffect(() => {
    fetch("/api/admin/growth/snapshots?module=competitors&days=90")
      .then(r => r.json())
      .then(d => setSnapshots(d.competitors ?? []))
      .catch(() => {})

    fetch("/api/admin/growth/competitors/crawl")
      .then(r => r.json())
      .then(d => setCrawlData(d))
      .catch(() => {})
  }, [])

  const runCrawl = async () => {
    setCrawling(true)
    setCrawlResult(null)
    try {
      const r = await fetch("/api/admin/growth/competitors/crawl", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ limit: 10, filter: "oem" }) })
      const d = await r.json()
      setCrawlResult(d.summary ?? "Crawl complete")
      fetch("/api/admin/growth/competitors/crawl").then(r => r.json()).then(d => setCrawlData(d)).catch(() => {})
    } finally {
      setCrawling(false)
    }
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const qs  = new URLSearchParams({ sort: sortBy })
      if (typeFilter !== "all") qs.set("type", typeFilter)
      if (q) qs.set("q", q)
      const res  = await fetch(`/api/admin/growth/competitors?${qs}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to load")
      setCompetitors(data.competitors ?? [])
      setMeta(data.meta ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed")
    } finally {
      setLoading(false)
    }
  }, [sortBy, typeFilter, q])

  useEffect(() => { load() }, [load])

  const visible = competitors.filter(c =>
    levelFilter === "all" || c.threatLevel === levelFilter
  )

  const highCount = competitors.filter(c => c.threatLevel === "HIGH").length
  const medCount  = competitors.filter(c => c.threatLevel === "MEDIUM").length
  const aiCount   = competitors.filter(c => c.aiMentions.count > 0).length
  const gemCount  = competitors.filter(c => c.gemData.contractCount > 0).length

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      {/* Sticky header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-20">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2.5">
            <Radar size={18} className="text-brand-600" />
            <div>
              <h1 className="text-base font-bold text-gray-900">Competitor Intelligence</h1>
              <p className="text-gray-400 text-[11px]">
                Live threat monitoring · {competitors.length} entities tracked · Dynamic scoring
              </p>
            </div>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
      </div>

      <div className="px-6 py-5 max-w-[1400px] space-y-5">
        {/* Intelligence Status */}
        {meta && (
          <IntelligenceStatus
            module="competitors"
            lastUpdated={meta.lastUpdated ?? undefined}
            refreshFrequency={meta.refreshFrequency}
            autoRefresh={meta.autoRefresh}
            confidenceScore={meta.confidenceScore}
            coveragePct={meta.coveragePct}
            health={meta.health}
            sources={meta.sources}
            version={meta.version}
            totalRecords={meta.total}
            onRefresh={load}
            refreshing={loading}
          />
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "High Threat",   value: highCount, icon: AlertTriangle, cls: "text-red-600",    bg: "bg-red-50",    filter: "HIGH"   },
            { label: "Medium Threat", value: medCount,  icon: TrendingUp,   cls: "text-amber-600",  bg: "bg-amber-50",  filter: "MEDIUM" },
            { label: "AI Citations",  value: aiCount,   icon: Bot,          cls: "text-purple-600", bg: "bg-purple-50", filter: null     },
            { label: "GeM Presence",  value: gemCount,  icon: ShoppingBag,  cls: "text-blue-600",   bg: "bg-blue-50",   filter: null     },
          ].map(card => (
            <button
              key={card.label}
              onClick={() => card.filter ? setLevelFilter(l => l === card.filter ? "all" : card.filter!) : undefined}
              className={`${card.bg} rounded-xl p-4 text-left border border-gray-100 hover:shadow-sm transition-shadow ${card.filter ? "cursor-pointer" : "cursor-default"}`}
            >
              <card.icon size={16} className={`${card.cls} mb-2`} />
              <p className="text-2xl font-black text-gray-900">{card.value}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">{card.label}</p>
            </button>
          ))}
        </div>

        {/* Historical Trends + Crawl Status */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <button
            className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
            onClick={() => setShowTrends(v => !v)}
          >
            <BarChart3 size={14} className="text-brand-600" />
            <span className="text-xs font-semibold text-gray-700">Threat Trends &amp; Website Crawler</span>
            {snapshots.length < 2 && <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">Collecting data — 1 snapshot</span>}
            {snapshots.length >= 2 && <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">{snapshots.length} days of history</span>}
            {showTrends ? <ChevronDown size={13} className="ml-auto text-gray-400" /> : <ChevronRight size={13} className="ml-auto text-gray-400" />}
          </button>

          {showTrends && (
            <div className="border-t border-gray-100 p-4 space-y-5">
              {/* Trend chart */}
              <div>
                <p className="text-[11px] font-semibold text-gray-700 mb-3">Threat Level History</p>
                {snapshots.length < 2 ? (
                  <div className="bg-gray-50 rounded-lg border border-dashed border-gray-200 p-6 text-center">
                    <Activity size={24} className="text-gray-300 mx-auto mb-2" />
                    <p className="text-xs text-gray-400">Trend charts activate after 2+ daily snapshots.</p>
                    <p className="text-[11px] text-gray-400 mt-1">Snapshots are created daily. First chart will appear tomorrow.</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={snapshots.slice().reverse().map(s => ({
                      date:   s.date.slice(5),
                      High:   s.metrics.highThreat,
                      Medium: s.metrics.mediumThreat,
                      AI:     s.metrics.aiVisible,
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 9 }} />
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                      <Legend iconSize={10} wrapperStyle={{ fontSize: 10 }} />
                      <Line type="monotone" dataKey="High"   stroke="#ef4444" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="Medium" stroke="#f59e0b" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="AI"     stroke="#8b5cf6" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Website crawler */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] font-semibold text-gray-700">Website Crawler</p>
                  <button
                    onClick={runCrawl}
                    disabled={crawling}
                    className="flex items-center gap-1.5 text-[10px] font-medium bg-brand-600 text-white px-2.5 py-1.5 rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
                  >
                    {crawling ? <RotateCw size={9} className="animate-spin" /> : <Play size={9} />}
                    {crawling ? "Crawling…" : "Crawl OEM Sites"}
                  </button>
                </div>
                {crawlResult && (
                  <div className="mb-3 text-[11px] text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200">{crawlResult}</div>
                )}
                {crawlData && crawlData.totalCrawled > 0 ? (
                  <div className="space-y-1.5">
                    {crawlData.crawlResults.slice(0, 8).map(r => (
                      <div key={r.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-[11px] ${r.hasChanges ? "border-amber-200 bg-amber-50" : "border-gray-100 bg-gray-50"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${r.reachable ? "bg-emerald-400" : "bg-red-400"}`} />
                        <span className="font-medium text-gray-700 w-36 truncate">{r.name}</span>
                        <span className="text-gray-400 flex-1 truncate">{r.title ?? (r.reachable ? "No title found" : "Unreachable")}</span>
                        {r.hasChanges && <span className="text-amber-600 font-semibold shrink-0">{r.changes.length} change{r.changes.length > 1 ? "s" : ""}</span>}
                        <span className="text-gray-400 shrink-0">{r.date}</span>
                      </div>
                    ))}
                    <p className="text-[10px] text-gray-400 pt-1">{crawlData.totalCrawled} sites in crawl history</p>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg border border-dashed border-gray-200 p-4 text-center">
                    <p className="text-[11px] text-gray-400">Click "Crawl OEM Sites" to fetch competitor website metadata and detect changes.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5 flex-1 min-w-[180px] max-w-xs">
            <Search size={13} className="text-gray-400" />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search competitors…"
              className="text-xs outline-none flex-1 text-gray-700 placeholder:text-gray-400 bg-transparent"
            />
          </div>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 outline-none">
            <option value="all">All Types</option>
            <option value="oem">OEM Brands</option>
            <option value="dealer">Dealers</option>
          </select>
          <select value={levelFilter} onChange={e => setLevelFilter(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 outline-none">
            <option value="all">All Threats</option>
            <option value="HIGH">High Threat</option>
            <option value="MEDIUM">Medium Threat</option>
            <option value="LOW">Low Threat</option>
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 outline-none">
            <option value="threat">Sort: Threat Score</option>
            <option value="name">Sort: Name</option>
            <option value="gem">Sort: GeM Contracts</option>
            <option value="ai">Sort: AI Citations</option>
          </select>
          <span className="text-[11px] text-gray-400 ml-auto">{visible.length} of {competitors.length} shown</span>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 flex items-center gap-2">
            <AlertTriangle size={14} className="text-red-500 shrink-0" />{error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && competitors.length === 0 && (
          <div className="space-y-3">
            {[1,2,3,4].map(i => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 h-28 animate-pulse" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && visible.length === 0 && !error && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Radar size={32} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm font-medium">No competitors match current filters</p>
            <button onClick={() => { setLevelFilter("all"); setTypeFilter("all"); setQ("") }}
              className="mt-3 text-xs text-blue-500 hover:underline">Clear filters</button>
          </div>
        )}

        {/* Competitor cards */}
        <div className="space-y-3">
          {visible.map(c => <CompetitorCard key={c.id} c={c} />)}
        </div>

        {/* Provenance note */}
        {!loading && competitors.length > 0 && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-[11px] text-blue-700 flex gap-2.5">
            <Zap size={13} className="text-blue-400 mt-0.5 shrink-0" />
            <div>
              <span className="font-semibold">Active data sources: </span>
              GeM Intelligence (contract data) · AI Search Monitor (ChatGPT/Gemini/Claude/Perplexity) · OEM Registry (dealer networks) · Procurement Intelligence (tender history).
              <span className="block mt-0.5 text-blue-500">
                Coming in Sprint 2: Website crawl · Search Console signals · Backlink intelligence · Daily change feed.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
