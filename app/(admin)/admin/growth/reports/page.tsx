"use client"
import { useEffect, useState, useCallback } from "react"
import {
  BarChart2, TrendingUp, TrendingDown, Zap, Clock, RefreshCw, RotateCw, ExternalLink,
  Calendar, Target, Users, Search, Megaphone,
} from "lucide-react"

// ── SEO types ─────────────────────────────────────────────────────────────────

interface QueryRow { query: string; clicks: number; impressions: number; ctr: number; position: number }
interface NearWin { query: string; position: number; impressions: number; clicks: number; ctr: number; expectedCtr: number; ctrGap: number; priority: string }
interface TrendQuery { query: string; position: number; impressions: number; clicks: number; posChange: number | null; isNew?: boolean }
interface TrendPage { pagePath: string; clicks: number; impressions: number; clickChange: number | null; isNew?: boolean }
interface Trends { syncedAt: string; currentPeriod: { startDate: string; endDate: string }; previousPeriod?: { startDate: string; endDate: string }; risingQueries: TrendQuery[]; fallingQueries: TrendQuery[]; risingPages: TrendPage[]; fallingPages: TrendPage[] }
interface Overview { syncedAt: string; period: { startDate: string; endDate: string }; totalClicks: number; totalImpressions: number; avgPosition: number; uniqueQueries: number; uniquePages: number; nearWinCount: number }
interface SEOAgentResult { summary: string; opportunitiesCreated: number; nearWinsFound: number; rankDropsFound: number; newKeywordsFound: number }

// ── Weekly Plan types ─────────────────────────────────────────────────────────

interface WeeklyAction {
  rank: number
  channel: "seo" | "ads" | "dealer" | "procurement"
  title: string
  why: string
  effort: string
  expected_impact: string
  source: string
  href: string
}

interface WeeklyPlanData {
  generated_at: string
  week_start: string
  week_end: string
  actions: WeeklyAction[]
  summary: { seo: number; ads: number; dealer: number; procurement: number; total: number }
  top3_message: string
}

// ── Weekly Plan Channel config ────────────────────────────────────────────────

const CHANNEL_META: Record<WeeklyAction["channel"], { label: string; icon: React.ElementType; color: string; bg: string; border: string }> = {
  seo:         { label: "SEO",         icon: Search,    color: "text-blue-700",   bg: "bg-blue-50",   border: "border-blue-200" },
  ads:         { label: "Ads",         icon: Megaphone, color: "text-violet-700", bg: "bg-violet-50", border: "border-violet-200" },
  dealer:      { label: "Dealer",      icon: Users,     color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
  procurement: { label: "Procurement", icon: Target,    color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200" },
}

// ── Weekly Plan Tab ───────────────────────────────────────────────────────────

function WeeklyPlanTab() {
  const [data, setData] = useState<WeeklyPlanData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [channelFilter, setChannelFilter] = useState<WeeklyAction["channel"] | "all">("all")

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/growth/reports/weekly-plan")
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setData(await res.json())
    } catch (e) { setError(String(e)) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = data?.actions.filter(a => channelFilter === "all" || a.channel === channelFilter) ?? []

  const channels: Array<WeeklyAction["channel"] | "all"> = ["all", "seo", "ads", "dealer", "procurement"]

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !data ? null : (
        <>
          {/* Top 3 message */}
          <div className="bg-violet-50 border border-violet-200 rounded-xl px-5 py-4">
            <div className="flex items-start gap-3">
              <Calendar size={16} className="text-violet-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-violet-900 mb-1">
                  Week of {new Date(data.week_start + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "long" })}
                  {" – "}
                  {new Date(data.week_end + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "long" })}
                </p>
                <p className="text-xs text-violet-800">{data.top3_message}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-violet-200">
              {(["seo", "ads", "dealer", "procurement"] as const).map(ch => {
                const m = CHANNEL_META[ch]
                const count = data.summary[ch]
                return (
                  <span key={ch} className="flex items-center gap-1 text-[11px]">
                    <m.icon size={11} className={m.color} />
                    <span className="text-gray-600">{m.label}:</span>
                    <span className="font-semibold text-gray-800">{count} actions</span>
                  </span>
                )
              })}
            </div>
          </div>

          {/* Channel filter */}
          <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-sm w-fit flex-wrap">
            {channels.map(ch => (
              <button key={ch} onClick={() => setChannelFilter(ch)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium capitalize transition-colors ${channelFilter === ch ? "bg-brand-600 text-white" : "text-gray-500 hover:text-gray-700"}`}>
                {ch === "all" ? `All (${data.summary.total})` : `${CHANNEL_META[ch].label} (${data.summary[ch]})`}
              </button>
            ))}
          </div>

          {/* Action list */}
          {filtered.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-gray-200 p-10 text-center">
              <p className="text-gray-400 text-sm">No actions for this channel. Run Revenue Director to generate priorities.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(action => {
                const m = CHANNEL_META[action.channel]
                return (
                  <div key={action.rank} className={`bg-white rounded-xl border shadow-sm overflow-hidden border-l-4 ${m.border}`}>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white mt-0.5 ${
                            action.rank <= 3 ? "bg-violet-600" : "bg-gray-400"
                          }`}>{action.rank}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${m.bg} ${m.color}`}>
                                <m.icon size={9} />{m.label}
                              </span>
                              <span className="text-[10px] text-gray-400">{action.effort}</span>
                              <span className="text-[10px] text-gray-400">· {action.source}</span>
                            </div>
                            <p className="text-sm font-semibold text-gray-900 mt-1">{action.title}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{action.why}</p>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-xs font-semibold text-emerald-700">{action.expected_impact}</p>
                        </div>
                      </div>
                      <div className="mt-2 pl-9">
                        <a href={action.href} className="text-[11px] text-blue-600 hover:underline">Open →</a>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <p className="text-[10px] text-gray-400">
            Generated {new Date(data.generated_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} · Based on pending Revenue Director recs, GSC near-wins, and CRM pipeline · Run Revenue Director first for best results
          </p>
        </>
      )}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function pos(n: number) { return Math.round(n * 10) / 10 }
function pct(n: number) { return `${Math.round(n * 1000) / 10}%` }

export default function ReportingCenter() {
  const [overview, setOverview] = useState<Overview | null>(null)
  const [nearWins, setNearWins] = useState<NearWin[]>([])
  const [trends, setTrends] = useState<Trends | null>(null)
  const [queries, setQueries] = useState<QueryRow[]>([])
  const [runningAgent, setRunningAgent] = useState(false)
  const [agentResult, setAgentResult] = useState<SEOAgentResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"near-wins" | "keywords-gained" | "keywords-lost" | "pages-gained" | "pages-lost" | "ctr-issues" | "weekly-plan">("near-wins")

  const loadAll = useCallback(async () => {
    setLoading(true)
    await Promise.allSettled([
      fetch("/api/admin/gsc/data?type=overview").then(r => r.json()).then(d => !d.error && setOverview(d)),
      fetch("/api/admin/gsc/data?type=near-wins").then(r => r.json()).then(d => !d.error && setNearWins(d.nearWins || [])),
      fetch("/api/admin/gsc/data?type=trends").then(r => r.json()).then(d => !d.error && setTrends(d)),
      fetch("/api/admin/gsc/data?type=queries&limit=200&sort=impressions").then(r => r.json()).then(d => !d.error && setQueries(d.rows || [])),
    ])
    setLoading(false)
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  const runSEOAgent = async () => {
    setRunningAgent(true); setAgentResult(null)
    try {
      const d = await fetch("/api/admin/growth/agents/seo-opportunity", { method: "POST" }).then(r => r.json()) as SEOAgentResult
      setAgentResult(d)
    } catch { /* noop */ }
    setRunningAgent(false)
  }

  // Compute low-CTR opportunities from query data
  const lowCtrOpportunities = queries.filter(r => r.position <= 10 && r.impressions >= 100 && r.ctr < 0.04).sort((a, b) => b.impressions - a.impressions)

  const noData = !overview
  const tabs = [
    { id: "near-wins",       label: `Near-Wins (${nearWins.length})` },
    { id: "keywords-gained", label: `Keywords Gained (${trends?.risingQueries.length ?? 0})` },
    { id: "keywords-lost",   label: `Keywords Lost (${trends?.fallingQueries.length ?? 0})` },
    { id: "pages-gained",    label: `Pages Gained (${trends?.risingPages.length ?? 0})` },
    { id: "pages-lost",      label: `Pages Lost (${trends?.fallingPages.length ?? 0})` },
    { id: "ctr-issues",      label: `Low CTR (${lowCtrOpportunities.length})` },
    { id: "weekly-plan",     label: "Weekly Plan" },
  ] as const

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      <div className="bg-white border-b border-gray-200 px-8 py-5 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart2 size={18} className="text-brand-600" />
            <div>
              <h1 className="text-base font-bold text-gray-900">SEO Reports</h1>
              <p className="text-gray-400 text-[11px]">
                {overview ? `${overview.period.startDate} → ${overview.period.endDate} · synced ${new Date(overview.syncedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}` : "No GSC data — sync first"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadAll} className="flex items-center gap-1.5 text-xs border border-gray-200 text-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-50">
              <RefreshCw size={12} /> Refresh
            </button>
            <button onClick={runSEOAgent} disabled={runningAgent || noData}
              className="flex items-center gap-1.5 text-xs bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 disabled:opacity-50">
              {runningAgent ? <RotateCw size={12} className="animate-spin" /> : <Zap size={12} />}
              {runningAgent ? "Running…" : "Run Opportunity Agent"}
            </button>
          </div>
        </div>
        {agentResult && (
          <p className="text-[11px] text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5 mt-2">{agentResult.summary}</p>
        )}
      </div>

      <div className="px-8 py-6 max-w-[1400px] space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Tabs — always visible */}
            <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-sm flex-wrap">
              {tabs.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${activeTab === tab.id ? "bg-brand-600 text-white" : "text-gray-500 hover:text-gray-700"}`}>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Weekly Plan — rendered before GSC content, available without GSC data */}
            {activeTab === "weekly-plan" && <WeeklyPlanTab />}

            {/* GSC content — only when GSC data available and not on weekly-plan */}
            {activeTab !== "weekly-plan" && (noData ? (
              <div className="bg-white rounded-xl border border-dashed border-gray-200 p-12 text-center">
                <BarChart2 size={32} className="text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm font-medium">No GSC data yet</p>
                <p className="text-gray-400 text-xs mt-1">Go to SEO Command Center → Sync now to pull data from Google Search Console.</p>
              </div>
            ) : (
            <>
            {/* Summary stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: "Clicks (28d)", value: overview!.totalClicks.toLocaleString(), color: "text-green-600" },
                { label: "Impressions", value: (overview!.totalImpressions / 1000).toFixed(1) + "K", color: "text-brand-600" },
                { label: "Avg Position", value: pos(overview!.avgPosition), color: "text-gray-700" },
                { label: "Near-Wins", value: overview!.nearWinCount, color: "text-amber-600" },
                { label: "Gaining", value: trends?.risingQueries.length ?? "—", color: "text-green-600" },
                { label: "Falling", value: trends?.fallingQueries.length ?? "—", color: "text-red-500" },
              ].map(({ label, value, color }) => (
                <div key={label} className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm text-center">
                  <p className={`text-xl font-bold ${color}`}>{value}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Near-wins */}
            {activeTab === "near-wins" && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                  <Zap size={14} className="text-amber-500" />
                  <h3 className="text-sm font-semibold text-gray-800">Near-Win Keywords — Ranked by Opportunity Size</h3>
                </div>
                {nearWins.length === 0 ? (
                  <p className="px-5 py-10 text-center text-gray-400 text-sm">No near-wins found in current data window.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead><tr className="border-b border-gray-100 bg-gray-50">
                        {["Priority", "Query", "Position", "Impressions", "Actual CTR", "Expected CTR", "CTR Gap", "Action"].map(h => <th key={h} className="text-left px-4 py-2.5 text-gray-400 font-medium whitespace-nowrap">{h}</th>)}
                      </tr></thead>
                      <tbody className="divide-y divide-gray-50">
                        {nearWins.map((nw, i) => (
                          <tr key={i} className="hover:bg-gray-50/50">
                            <td className="px-4 py-2.5"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${nw.priority === "high" ? "bg-red-100 text-red-700" : nw.priority === "medium" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"}`}>{nw.priority}</span></td>
                            <td className="px-4 py-2.5 font-medium text-gray-800 max-w-[260px]">{nw.query}</td>
                            <td className="px-4 py-2.5 font-semibold text-amber-600">{nw.position}</td>
                            <td className="px-4 py-2.5 text-gray-600">{nw.impressions.toLocaleString()}</td>
                            <td className="px-4 py-2.5 text-red-500 font-semibold">{nw.ctr}%</td>
                            <td className="px-4 py-2.5 text-gray-500">{nw.expectedCtr}%</td>
                            <td className="px-4 py-2.5 text-amber-600 font-semibold">−{nw.ctrGap}%</td>
                            <td className="px-4 py-2.5 text-[11px] text-gray-500">{nw.position <= 10 ? "Improve title & FAQ" : "Build internal links"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Keywords gained */}
            {activeTab === "keywords-gained" && (
              <div className="bg-white rounded-xl border border-green-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-green-100 flex items-center gap-2"><TrendingUp size={14} className="text-green-500" /><h3 className="text-sm font-semibold text-gray-800">Keywords Gained / Rising</h3></div>
                {!trends?.risingQueries.length ? <p className="px-5 py-10 text-center text-gray-400 text-sm">No significant gains detected.</p> : (
                  <table className="w-full text-xs"><thead><tr className="border-b border-gray-100 bg-gray-50">{["Query", "Current Pos", "Prev Pos", "Change", "Impressions"].map(h => <th key={h} className="text-left px-4 py-2.5 text-gray-400 font-medium">{h}</th>)}</tr></thead>
                    <tbody className="divide-y divide-gray-50">{trends.risingQueries.map((r, i) => (
                      <tr key={i} className="hover:bg-gray-50/50">
                        <td className="px-4 py-2.5 font-medium text-gray-800 max-w-[260px]">{r.query}</td>
                        <td className="px-4 py-2.5 text-green-600 font-semibold">{pos(r.position)}</td>
                        <td className="px-4 py-2.5 text-gray-400">{r.posChange !== null ? pos(r.position - r.posChange) : "—"}</td>
                        <td className="px-4 py-2.5">{r.isNew ? <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-semibold">NEW</span> : r.posChange !== null ? <span className="text-green-600 font-semibold">↑{Math.abs(r.posChange).toFixed(1)}</span> : "—"}</td>
                        <td className="px-4 py-2.5 text-gray-500">{r.impressions.toLocaleString()}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                )}
              </div>
            )}

            {/* Keywords lost */}
            {activeTab === "keywords-lost" && (
              <div className="bg-white rounded-xl border border-red-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-red-100 flex items-center gap-2"><TrendingDown size={14} className="text-red-500" /><h3 className="text-sm font-semibold text-gray-800">Keywords Lost / Falling</h3></div>
                {!trends?.fallingQueries.length ? <p className="px-5 py-10 text-center text-gray-400 text-sm">No significant drops detected.</p> : (
                  <table className="w-full text-xs"><thead><tr className="border-b border-gray-100 bg-gray-50">{["Query", "Current Pos", "Change", "Impressions"].map(h => <th key={h} className="text-left px-4 py-2.5 text-gray-400 font-medium">{h}</th>)}</tr></thead>
                    <tbody className="divide-y divide-gray-50">{trends.fallingQueries.map((r, i) => (
                      <tr key={i} className="hover:bg-gray-50/50">
                        <td className="px-4 py-2.5 font-medium text-gray-800 max-w-[260px]">{r.query}</td>
                        <td className="px-4 py-2.5 text-red-500 font-semibold">{pos(r.position)}</td>
                        <td className="px-4 py-2.5">{r.posChange !== null ? <span className="text-red-600 font-semibold">↓{r.posChange.toFixed(1)}</span> : "—"}</td>
                        <td className="px-4 py-2.5 text-gray-500">{r.impressions.toLocaleString()}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                )}
              </div>
            )}

            {/* Pages gained */}
            {activeTab === "pages-gained" && (
              <div className="bg-white rounded-xl border border-green-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-green-100 flex items-center gap-2"><TrendingUp size={14} className="text-green-500" /><h3 className="text-sm font-semibold text-gray-800">Pages Gaining Clicks</h3></div>
                {!trends?.risingPages.length ? <p className="px-5 py-10 text-center text-gray-400 text-sm">No significant gains detected.</p> : (
                  <table className="w-full text-xs"><thead><tr className="border-b border-gray-100 bg-gray-50">{["Page", "Clicks", "Click Change"].map(h => <th key={h} className="text-left px-4 py-2.5 text-gray-400 font-medium">{h}</th>)}</tr></thead>
                    <tbody className="divide-y divide-gray-50">{trends.risingPages.map((r, i) => (
                      <tr key={i} className="hover:bg-gray-50/50">
                        <td className="px-4 py-2.5"><div className="flex items-center gap-1"><code className="text-[11px] text-gray-700">{r.pagePath}</code><a href={`https://www.100xcircle.com${r.pagePath}`} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-brand-500"><ExternalLink size={10} /></a></div></td>
                        <td className="px-4 py-2.5 text-green-600 font-semibold">{r.clicks}</td>
                        <td className="px-4 py-2.5">{r.isNew ? <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-semibold">NEW</span> : r.clickChange !== null ? <span className="text-green-600 font-semibold">+{r.clickChange}</span> : "—"}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                )}
              </div>
            )}

            {/* Pages lost */}
            {activeTab === "pages-lost" && (
              <div className="bg-white rounded-xl border border-red-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-red-100 flex items-center gap-2"><TrendingDown size={14} className="text-red-500" /><h3 className="text-sm font-semibold text-gray-800">Pages Losing Clicks</h3></div>
                {!trends?.fallingPages.length ? <p className="px-5 py-10 text-center text-gray-400 text-sm">No significant drops detected.</p> : (
                  <table className="w-full text-xs"><thead><tr className="border-b border-gray-100 bg-gray-50">{["Page", "Clicks", "Click Change"].map(h => <th key={h} className="text-left px-4 py-2.5 text-gray-400 font-medium">{h}</th>)}</tr></thead>
                    <tbody className="divide-y divide-gray-50">{trends.fallingPages.map((r, i) => (
                      <tr key={i} className="hover:bg-gray-50/50">
                        <td className="px-4 py-2.5"><code className="text-[11px] text-gray-700">{r.pagePath}</code></td>
                        <td className="px-4 py-2.5 text-red-500 font-semibold">{r.clicks}</td>
                        <td className="px-4 py-2.5">{r.clickChange !== null ? <span className="text-red-600 font-semibold">{r.clickChange}</span> : "—"}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                )}
              </div>
            )}

            {/* Low CTR */}
            {activeTab === "ctr-issues" && (
              <div className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-amber-100 flex items-center gap-2">
                  <Zap size={14} className="text-amber-500" />
                  <h3 className="text-sm font-semibold text-gray-800">Low CTR on Page 1 — Title/Description Opportunities</h3>
                </div>
                <p className="px-5 py-3 text-[11px] text-gray-400">Queries ranking in positions 1–10 with ≥100 impressions but &lt;4% CTR. These are in good positions but losing clicks to competitors. Fix the title tag and meta description.</p>
                {lowCtrOpportunities.length === 0 ? <p className="px-5 py-10 text-center text-gray-400 text-sm">No low-CTR issues found on page 1.</p> : (
                  <table className="w-full text-xs"><thead><tr className="border-b border-gray-100 bg-gray-50">{["Query", "Position", "Impressions", "CTR", "Clicks missed"].map(h => <th key={h} className="text-left px-4 py-2.5 text-gray-400 font-medium">{h}</th>)}</tr></thead>
                    <tbody className="divide-y divide-gray-50">{lowCtrOpportunities.slice(0, 30).map((r, i) => {
                      const expectedClicks = Math.round(r.impressions * 0.05)
                      const missed = Math.max(0, expectedClicks - r.clicks)
                      return (
                        <tr key={i} className="hover:bg-gray-50/50">
                          <td className="px-4 py-2.5 font-medium text-gray-800 max-w-[260px]">{r.query}</td>
                          <td className="px-4 py-2.5 text-amber-600 font-semibold">{pos(r.position)}</td>
                          <td className="px-4 py-2.5 text-gray-600">{r.impressions.toLocaleString()}</td>
                          <td className="px-4 py-2.5 text-red-500 font-semibold">{pct(r.ctr)}</td>
                          <td className="px-4 py-2.5 text-amber-600">~{missed}/month</td>
                        </tr>
                      )
                    })}</tbody>
                  </table>
                )}
              </div>
            )}

            {/* Period footer */}
            {trends?.currentPeriod && (
              <p className="text-[11px] text-gray-400 flex items-center gap-1">
                <Clock size={11} />
                Current: {trends.currentPeriod.startDate} → {trends.currentPeriod.endDate}
                {trends.previousPeriod && ` vs Previous: ${trends.previousPeriod.startDate} → ${trends.previousPeriod.endDate}`}
              </p>
            )}
          </>
        ))}
      </>
      )}
      </div>
    </div>
  )
}
