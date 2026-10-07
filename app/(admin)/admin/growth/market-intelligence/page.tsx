"use client"
import { useState, useEffect, useCallback } from "react"
import {
  Brain, RefreshCw, TrendingUp, MapPin, DollarSign,
  Target, Zap, ChevronRight, AlertCircle, BarChart2,
  Database, Search, ShoppingBag, Users,
} from "lucide-react"
import type { MarketIntelligenceRun, ProductOpportunity, StateOpportunity, CampaignBudgetScore } from "@/lib/growth-os/agents/market-intelligence"
import IntelligenceStatus from "@/components/growth-os/IntelligenceStatus"

// Snapshot type returned by /api/admin/growth/market-intelligence/snapshot
interface MISnapshot {
  isSnapshot:      boolean
  generatedAt:     string
  processingTimeMs: number
  sources: {
    procurement: { active: boolean; records: number }
    gem:         { active: boolean; records: number }
    gsc:         { active: boolean; records: number; lastSync: string | null }
    crm:         { active: boolean; records: number }
    sellers:     { active: boolean; records: number }
  }
  procurement: {
    totalContracts: number
    totalGmvCr:     number
    firstDate:      string
    lastDate:       string
    topStates:      { state: string; contracts: number; gmvCr: number }[]
    topOems:        { oem: string; contracts: number; gmvCr: number }[]
    topBuyers:      { buyer: string; state: string; contracts: number }[]
  }
  gem: { totalContracts: number; stateCount: number; topStates: { state: string; count: number }[] }
  search: {
    totalQueries:   number
    totalClicks:    number
    totalImpressions: number
    lastSync:       string | null
    topQueries:     { query: string; clicks: number; impressions: number }[]
  }
  crm: { dealerProspects: number; rfqLeads: number; brochureLeads: number }
  founderBrief: {
    whatToSell:    string
    whereToSell:   string
    whoToTarget:   string
    whichCampaignNeedsBudget: string
    topActionThisWeek: string
    confidenceLevel: string
    dataQualityNote: string
  }
  meta: { confidenceScore: number; coveragePct: number; health: "healthy" | "degraded" | "stale" | "error"; refreshFrequency: string }
}

type ModelTier = "haiku" | "sonnet" | "opus"

const MODEL_INFO: Record<ModelTier, { label: string; cost: string }> = {
  haiku:  { label: "Fast",    cost: "~₹0.05/run" },
  sonnet: { label: "Precise", cost: "~₹0.20/run" },
  opus:   { label: "Deep",    cost: "~₹1.00/run" },
}

const SCORE_COLOR = (s: number) =>
  s >= 70 ? "text-green-400"
  : s >= 40 ? "text-amber-400"
  : "text-red-400"

const SCORE_BG = (s: number) =>
  s >= 70 ? "bg-green-500/10 border-green-500/20"
  : s >= 40 ? "bg-amber-500/10 border-amber-500/20"
  : "bg-red-500/10 border-red-500/20"

const CONFIDENCE_COLOR: Record<string, string> = {
  high:   "text-green-400",
  medium: "text-amber-400",
  low:    "text-red-400",
}

const RECOMMENDATION_STYLES: Record<string, string> = {
  increase: "bg-green-500/15 text-green-400 border-green-500/25",
  maintain: "bg-blue-500/15 text-blue-400 border-blue-500/25",
  reduce:   "bg-amber-500/15 text-amber-400 border-amber-500/25",
  pause:    "bg-red-500/15 text-red-400 border-red-500/25",
}

const MOMENTUM_COLOR: Record<string, string> = {
  rising: "text-green-400",
  stable: "text-amber-400",
  low:    "text-gray-500",
}

export default function MarketIntelligencePage() {
  const [run, setRun]         = useState<MarketIntelligenceRun | null>(null)
  const [snapshot, setSnapshot] = useState<MISnapshot | null>(null)
  const [history, setHistory] = useState<MarketIntelligenceRun[]>([])
  const [loading, setLoading] = useState(false)
  const [snapshotLoading, setSnapshotLoading] = useState(true)
  const [model, setModel]     = useState<ModelTier>("sonnet")
  const [dateRange, setDateRange] = useState(90)
  const [activeTab, setActiveTab] = useState<"briefing" | "products" | "states" | "campaigns">("briefing")
  const [error, setError]     = useState("")

  const loadSnapshot = useCallback(async () => {
    setSnapshotLoading(true)
    try {
      const res  = await fetch("/api/admin/growth/market-intelligence/snapshot")
      const data = await res.json()
      if (res.ok) setSnapshot(data)
    } finally {
      setSnapshotLoading(false)
    }
  }, [])

  const loadHistory = useCallback(async () => {
    const res  = await fetch("/api/admin/growth/agents/market-intelligence")
    const data = await res.json()
    if (Array.isArray(data)) setHistory(data)
  }, [])

  useEffect(() => { loadHistory(); loadSnapshot() }, [loadHistory, loadSnapshot])

  async function runAnalysis() {
    setLoading(true)
    setError("")
    try {
      const res  = await fetch("/api/admin/growth/agents/market-intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run", model, dateRange }),
      })
      const data = await res.json()
      if (data.ok) {
        setRun(data.run)
        setActiveTab("briefing")
        await loadHistory()
      } else {
        setError(data.error ?? "Analysis failed")
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error")
    } finally {
      setLoading(false)
    }
  }

  async function loadRun(runId: string) {
    const res  = await fetch("/api/admin/growth/agents/market-intelligence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ runId }),
    })
    const data = await res.json()
    if (!data.error) { setRun(data); setActiveTab("briefing") }
  }

  const tabs = [
    { id: "briefing",  label: "Founder Briefing",    icon: Zap },
    { id: "products",  label: `Products (${run?.productOpportunities.length ?? 0})`,  icon: TrendingUp },
    { id: "states",    label: `States (${run?.stateOpportunities.length ?? 0})`,   icon: MapPin },
    { id: "campaigns", label: `Campaigns (${run?.campaignScores.length ?? 0})`, icon: DollarSign },
  ] as const

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white flex items-center gap-2">
            <Brain size={20} className="text-brand-400" />
            Market Intelligence Director
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            What to sell · Where to sell · Who to target · Which campaign needs budget
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Model picker */}
          {(["haiku", "sonnet", "opus"] as ModelTier[]).map(m => (
            <button key={m}
              onClick={() => setModel(m)}
              className={`px-2.5 py-1.5 rounded-lg text-xs border transition-all ${
                model === m
                  ? "bg-brand-600/20 border-brand-500/40 text-brand-300"
                  : "border-gray-700 text-gray-500 hover:border-gray-600 hover:text-gray-400"
              }`}
            >
              <div className="font-medium">{MODEL_INFO[m].label}</div>
              <div className="text-[10px] opacity-70">{MODEL_INFO[m].cost}</div>
            </button>
          ))}
          {/* Date range */}
          <select
            value={dateRange}
            onChange={e => setDateRange(Number(e.target.value))}
            className="bg-gray-900 border border-gray-700 text-gray-300 text-xs rounded-lg px-2.5 py-1.5"
          >
            <option value={30}>30 days</option>
            <option value={60}>60 days</option>
            <option value={90}>90 days</option>
          </select>
          <button
            onClick={runAnalysis}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-sm rounded-lg transition-colors"
          >
            {loading ? <RefreshCw size={14} className="animate-spin" /> : <Brain size={14} />}
            {loading ? "Analysing…" : "Run Analysis"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-950/40 border border-red-500/30 rounded-xl p-3 flex items-center gap-2 text-red-400 text-sm">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {/* Data snapshot */}
      {run && (
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: "Leads Analysed",   value: run.dataSnapshot.totalLeadsAnalyzed },
            { label: "Attribution Leads", value: run.dataSnapshot.attributionLeads },
            { label: "Brochure DLs",     value: run.dataSnapshot.totalBrochureLeads },
            { label: "Search Queries",   value: run.dataSnapshot.totalSearchQueries },
            { label: "Ad Campaigns",     value: run.dataSnapshot.totalCampaigns },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-3">
              <div className="text-2xl font-bold text-white">{value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Main content */}
      {run ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-800">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium border-b-2 transition-colors ${
                  activeTab === id
                    ? "border-brand-500 text-brand-400"
                    : "border-transparent text-gray-500 hover:text-gray-300"
                }`}
              >
                <Icon size={12} />
                {label}
              </button>
            ))}
            <div className="ml-auto px-4 py-3 text-xs text-gray-600">
              {new Date(run.generatedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "short", timeStyle: "short" })}
              {" · "}{run.modelUsed.split("-")[1]}
            </div>
          </div>

          {/* Founder Briefing */}
          {activeTab === "briefing" && (
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-semibold uppercase tracking-wide ${CONFIDENCE_COLOR[run.founderBriefing.confidenceLevel]}`}>
                  {run.founderBriefing.confidenceLevel} confidence
                </span>
                <span className="text-gray-700">·</span>
                <span className="text-xs text-gray-500">{run.founderBriefing.dataQualityNote}</span>
              </div>

              {[
                { q: "What to sell?",                icon: TrendingUp,  answer: run.founderBriefing.whatToSell },
                { q: "Where to sell?",               icon: MapPin,      answer: run.founderBriefing.whereToSell },
                { q: "Who to target?",               icon: Target,      answer: run.founderBriefing.whoToTarget },
                { q: "Which campaign needs budget?", icon: DollarSign,  answer: run.founderBriefing.whichCampaignNeedsBudget },
              ].map(({ q, icon: Icon, answer }) => (
                <div key={q} className="border border-gray-800 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-xs text-gray-500 font-medium mb-2">
                    <Icon size={12} className="text-brand-400" />
                    {q}
                  </div>
                  <p className="text-sm text-white leading-relaxed">{answer}</p>
                </div>
              ))}

              {/* Top Action This Week */}
              <div className="bg-brand-600/10 border border-brand-500/25 rounded-xl p-4">
                <div className="flex items-center gap-2 text-xs text-brand-400 font-semibold mb-2">
                  <Zap size={12} />
                  TOP ACTION THIS WEEK
                </div>
                <p className="text-sm text-white leading-relaxed">{run.founderBriefing.topActionThisWeek}</p>
              </div>
            </div>
          )}

          {/* Product Opportunities */}
          {activeTab === "products" && (
            <div className="divide-y divide-gray-800">
              {run.productOpportunities.length === 0 && (
                <div className="p-8 text-center text-gray-500 text-sm">
                  No product data yet — sync leads and brochures to populate this.
                </div>
              )}
              {run.productOpportunities.map((p: ProductOpportunity, i: number) => (
                <div key={p.product} className="p-4 flex items-center gap-4">
                  <div className={`w-9 h-9 rounded-lg border flex items-center justify-center text-sm font-bold shrink-0 ${SCORE_BG(p.opportunityScore)}`}>
                    <span className={SCORE_COLOR(p.opportunityScore)}>{p.opportunityScore}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{p.product}</span>
                      <span className={`text-[10px] font-semibold ${MOMENTUM_COLOR[p.momentum]}`}>
                        {p.momentum === "rising" ? "▲" : p.momentum === "stable" ? "→" : "▼"} {p.momentum}
                      </span>
                    </div>
                    {p.insight && <p className="text-xs text-gray-400 mt-0.5 truncate">{p.insight}</p>}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500 shrink-0">
                    <span>{p.leadCount} leads</span>
                    <span>{p.brochureCount} brochures</span>
                    <span>{p.searchClicks} clicks</span>
                  </div>
                  <div className="text-xs text-gray-600 w-4 text-right">{i + 1}</div>
                </div>
              ))}
            </div>
          )}

          {/* State Opportunities */}
          {activeTab === "states" && (
            <div className="divide-y divide-gray-800">
              {run.stateOpportunities.length === 0 && (
                <div className="p-8 text-center text-gray-500 text-sm">
                  No state data yet — sync leads to populate this.
                </div>
              )}
              {run.stateOpportunities.map((s: StateOpportunity) => (
                <div key={s.state} className="p-4 flex items-center gap-4">
                  <div className={`w-9 h-9 rounded-lg border flex items-center justify-center text-sm font-bold shrink-0 ${SCORE_BG(s.opportunityScore)}`}>
                    <span className={SCORE_COLOR(s.opportunityScore)}>{s.opportunityScore}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{s.state}</span>
                      {s.coverageGap && (
                        <span className="text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/25 px-1.5 py-0.5 rounded-full">coverage gap</span>
                      )}
                    </div>
                    {s.insight && <p className="text-xs text-gray-400 mt-0.5 truncate">{s.insight}</p>}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500 shrink-0">
                    <span>{s.leadCount} leads</span>
                    <span>{s.brochureCount} brochures</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Campaign Budget Scores */}
          {activeTab === "campaigns" && (
            <div className="divide-y divide-gray-800">
              {run.campaignScores.length === 0 && (
                <div className="p-8 text-center text-gray-500 text-sm">
                  No campaign data — sync Google Ads to populate this.
                </div>
              )}
              {run.campaignScores.map((c: CampaignBudgetScore) => (
                <div key={c.campaign} className="p-4 flex items-center gap-4">
                  <div className={`w-9 h-9 rounded-lg border flex items-center justify-center text-sm font-bold shrink-0 ${SCORE_BG(c.score)}`}>
                    <span className={SCORE_COLOR(c.score)}>{c.score}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white truncate max-w-xs">{c.campaign}</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${RECOMMENDATION_STYLES[c.recommendation]}`}>
                        {c.recommendation}
                      </span>
                    </div>
                    {c.insight && <p className="text-xs text-gray-400 mt-0.5 truncate">{c.insight}</p>}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500 shrink-0">
                    <span>₹{c.spend}</span>
                    <span>{c.conversions} conv</span>
                    {c.cpa > 0 && <span>₹{c.cpa} CPA</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Fallback: Live data snapshot — never show "Insufficient Data" */
        <div className="space-y-4">
          {/* IntelligenceStatus */}
          {snapshot && (
            <IntelligenceStatus
              module="market-intelligence"
              lastUpdated={snapshot.generatedAt}
              refreshFrequency={snapshot.meta.refreshFrequency}
              autoRefresh={false}
              confidenceScore={snapshot.meta.confidenceScore}
              coveragePct={snapshot.meta.coveragePct}
              health={snapshot.meta.health}
              processingTimeMs={snapshot.processingTimeMs}
              sources={[
                { name: "Procurement",    active: snapshot.sources.procurement.active, recordCount: snapshot.sources.procurement.records },
                { name: "GeM Contracts",  active: snapshot.sources.gem.active,         recordCount: snapshot.sources.gem.records },
                { name: "Search Console", active: snapshot.sources.gsc.active,         recordCount: snapshot.sources.gsc.records },
                { name: "CRM / Leads",    active: snapshot.sources.crm.active,         recordCount: snapshot.sources.crm.records },
                { name: "Seller Intel",   active: snapshot.sources.sellers.active,     recordCount: snapshot.sources.sellers.records },
                { name: "Google Ads",     active: false },
                { name: "Analytics",      active: false },
              ]}
              totalRecords={
                snapshot.sources.procurement.records +
                snapshot.sources.gem.records +
                snapshot.sources.gsc.records
              }
              onRefresh={loadSnapshot}
              refreshing={snapshotLoading}
            />
          )}

          {snapshot && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              {/* Snapshot header */}
              <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database size={14} className="text-brand-400" />
                  <span className="text-sm font-semibold text-white">Live Market Snapshot</span>
                  <span className="text-[10px] px-2 py-0.5 bg-amber-500/15 text-amber-400 border border-amber-500/25 rounded-full">
                    Rules-based · {snapshot.founderBrief.confidenceLevel} confidence
                  </span>
                </div>
                <button
                  onClick={runAnalysis}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs rounded-lg transition-colors"
                >
                  <Brain size={12} />
                  {loading ? "Analysing…" : "Upgrade to AI Analysis"}
                </button>
              </div>

              {/* Stat tiles */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-px bg-gray-800">
                {[
                  { label: "Fogging Contracts", value: snapshot.procurement.totalContracts, icon: ShoppingBag, color: "text-blue-400" },
                  { label: "Total GMV",          value: `₹${snapshot.procurement.totalGmvCr} Cr`, icon: DollarSign, color: "text-green-400" },
                  { label: "GeM Contracts",      value: snapshot.gem.totalContracts, icon: Database, color: "text-purple-400" },
                  { label: "Search Queries",     value: snapshot.search.totalQueries, icon: Search, color: "text-cyan-400" },
                  { label: "CRM Prospects",      value: snapshot.crm.dealerProspects + snapshot.crm.rfqLeads, icon: Users, color: "text-amber-400" },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="bg-gray-900 p-4">
                    <Icon size={14} className={`${color} mb-1.5`} />
                    <div className="text-xl font-bold text-white">{value}</div>
                    <div className="text-[10px] text-gray-500 mt-0.5">{label}</div>
                  </div>
                ))}
              </div>

              {/* Founder Brief (rules-based) */}
              <div className="p-5 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-amber-400 uppercase tracking-wide">
                    {snapshot.founderBrief.confidenceLevel} confidence
                  </span>
                  <span className="text-gray-700">·</span>
                  <span className="text-xs text-gray-500">{snapshot.founderBrief.dataQualityNote}</span>
                </div>

                {[
                  { q: "What to sell?",                icon: TrendingUp,  answer: snapshot.founderBrief.whatToSell },
                  { q: "Where to sell?",               icon: MapPin,      answer: snapshot.founderBrief.whereToSell },
                  { q: "Who to target?",               icon: Target,      answer: snapshot.founderBrief.whoToTarget },
                  { q: "Which campaign needs budget?", icon: DollarSign,  answer: snapshot.founderBrief.whichCampaignNeedsBudget },
                ].map(({ q, icon: Icon, answer }) => (
                  <div key={q} className="border border-gray-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-xs text-gray-500 font-medium mb-2">
                      <Icon size={12} className="text-brand-400" />
                      {q}
                    </div>
                    <p className="text-sm text-white leading-relaxed">{answer}</p>
                  </div>
                ))}

                <div className="bg-brand-600/10 border border-brand-500/25 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-xs text-brand-400 font-semibold mb-2">
                    <Zap size={12} />TOP ACTION THIS WEEK
                  </div>
                  <p className="text-sm text-white leading-relaxed">{snapshot.founderBrief.topActionThisWeek}</p>
                </div>
              </div>

              {/* Top States + Products side-by-side */}
              <div className="grid sm:grid-cols-2 gap-px bg-gray-800 border-t border-gray-800">
                {/* Top States by Procurement */}
                <div className="bg-gray-900 p-4">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <MapPin size={10} />Top States · Procurement
                    <span className="ml-auto text-gray-700 normal-case font-normal text-[10px]">Source: fogging_contracts</span>
                  </p>
                  <div className="space-y-2">
                    {snapshot.procurement.topStates.map((s, i) => (
                      <div key={s.state} className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-600 w-4">{i + 1}</span>
                        <span className="text-xs text-gray-300 flex-1 truncate">{s.state || "Unknown"}</span>
                        <span className="text-[10px] text-gray-500">{s.contracts} c</span>
                        <span className="text-[10px] text-green-400 font-mono">₹{s.gmvCr}Cr</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top OEMs / Products */}
                <div className="bg-gray-900 p-4">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <TrendingUp size={10} />Top Products · Procurement
                    <span className="ml-auto text-gray-700 normal-case font-normal text-[10px]">Source: fogging_contracts</span>
                  </p>
                  <div className="space-y-2">
                    {snapshot.procurement.topOems.map((o, i) => (
                      <div key={o.oem} className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-600 w-4">{i + 1}</span>
                        <span className="text-xs text-gray-300 flex-1 truncate">{o.oem || "Unknown"}</span>
                        <span className="text-[10px] text-gray-500">{o.contracts} c</span>
                        <span className="text-[10px] text-green-400 font-mono">₹{o.gmvCr}Cr</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Top Search Queries */}
              {snapshot.search.totalQueries > 0 && (
                <div className="border-t border-gray-800 p-4">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <Search size={10} />Top Search Queries
                    <span className="ml-auto text-gray-700 normal-case font-normal text-[10px]">
                      Source: Google Search Console · {snapshot.search.totalClicks.toLocaleString()} total clicks
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {snapshot.search.topQueries.map(q => (
                      <div key={q.query} className="flex items-center gap-1.5 bg-gray-800 rounded-lg px-2.5 py-1.5">
                        <span className="text-xs text-gray-300">{q.query}</span>
                        <span className="text-[10px] text-blue-400">{q.clicks} clicks</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Loading state for snapshot */}
          {snapshotLoading && !snapshot && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 flex items-center justify-center gap-3 text-gray-500">
              <RefreshCw size={16} className="animate-spin text-brand-400" />
              <span className="text-sm">Loading live market data…</span>
            </div>
          )}
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-2">
            <BarChart2 size={13} className="text-gray-500" />
            <span className="text-xs font-medium text-gray-400">Past Runs</span>
          </div>
          <div className="divide-y divide-gray-800">
            {history.slice(0, 5).map(h => (
              <button
                key={h.runId}
                onClick={() => loadRun(h.runId)}
                className="w-full px-4 py-2.5 flex items-center gap-3 text-left hover:bg-gray-800/50 transition-colors group"
              >
                <div className="flex-1">
                  <div className="text-xs text-gray-300">
                    {new Date(h.generatedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}
                  </div>
                  <div className="text-[11px] text-gray-600 mt-0.5">
                    {h.dataSnapshot?.totalLeadsAnalyzed ?? 0} leads · {h.dateRange}d window
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
