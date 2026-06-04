"use client"
import { useEffect, useState, useCallback } from "react"
import { BarChart2, TrendingUp, TrendingDown, Zap, Clock, RefreshCw, RotateCw, ExternalLink } from "lucide-react"

interface QueryRow { query: string; clicks: number; impressions: number; ctr: number; position: number }
interface NearWin { query: string; position: number; impressions: number; clicks: number; ctr: number; expectedCtr: number; ctrGap: number; priority: string }
interface TrendQuery { query: string; position: number; impressions: number; clicks: number; posChange: number | null; isNew?: boolean }
interface TrendPage { pagePath: string; clicks: number; impressions: number; clickChange: number | null; isNew?: boolean }
interface Trends { syncedAt: string; currentPeriod: { startDate: string; endDate: string }; previousPeriod?: { startDate: string; endDate: string }; risingQueries: TrendQuery[]; fallingQueries: TrendQuery[]; risingPages: TrendPage[]; fallingPages: TrendPage[] }
interface Overview { syncedAt: string; period: { startDate: string; endDate: string }; totalClicks: number; totalImpressions: number; avgPosition: number; uniqueQueries: number; uniquePages: number; nearWinCount: number }
interface SEOAgentResult { summary: string; opportunitiesCreated: number; nearWinsFound: number; rankDropsFound: number; newKeywordsFound: number }

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
  const [activeTab, setActiveTab] = useState<"near-wins" | "keywords-gained" | "keywords-lost" | "pages-gained" | "pages-lost" | "ctr-issues">("near-wins")

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
    { id: "near-wins", label: `Near-Wins (${nearWins.length})` },
    { id: "keywords-gained", label: `Keywords Gained (${trends?.risingQueries.length ?? 0})` },
    { id: "keywords-lost", label: `Keywords Lost (${trends?.fallingQueries.length ?? 0})` },
    { id: "pages-gained", label: `Pages Gained (${trends?.risingPages.length ?? 0})` },
    { id: "pages-lost", label: `Pages Lost (${trends?.fallingPages.length ?? 0})` },
    { id: "ctr-issues", label: `Low CTR (${lowCtrOpportunities.length})` },
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
        ) : noData ? (
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

            {/* Tabs */}
            <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-sm flex-wrap">
              {tabs.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${activeTab === tab.id ? "bg-brand-600 text-white" : "text-gray-500 hover:text-gray-700"}`}>
                  {tab.label}
                </button>
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
        )}
      </div>
    </div>
  )
}
