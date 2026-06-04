"use client"
import { useEffect, useState, useCallback } from "react"
import { Search, Link2, AlertCircle, ExternalLink, CheckCircle2, XCircle, Play, RotateCw, TrendingUp, TrendingDown, Zap, RefreshCw, Clock, Info } from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────────────

interface SyncStatus { configured: boolean; siteUrl: string; lastSync: { syncedAt: string; queryCount: number; pageCount: number; status: string } | null }

interface GSCOverview { syncedAt: string; period: { startDate: string; endDate: string }; totalClicks: number; totalImpressions: number; avgPosition: number; uniqueQueries: number; uniquePages: number; nearWinCount: number }

interface QueryRow { query: string; clicks: number; impressions: number; ctr: number; position: number }
interface PageRow { pagePath: string; page: string; clicks: number; impressions: number; ctr: number; position: number }

interface NearWin { query: string; position: number; impressions: number; clicks: number; ctr: number; expectedCtr: number; ctrGap: number; priority: "high" | "medium" | "low" }

interface TrendQuery { query: string; position: number; impressions: number; clicks: number; posChange: number | null; clickChange: number | null; isNew?: boolean }
interface TrendPage { pagePath: string; clicks: number; impressions: number; clickChange: number | null; posChange: number | null; isNew?: boolean }
interface Trends { syncedAt: string; currentPeriod: { startDate: string; endDate: string }; previousPeriod: { startDate: string; endDate: string }; risingQueries: TrendQuery[]; fallingQueries: TrendQuery[]; risingPages: TrendPage[]; fallingPages: TrendPage[] }

interface SchemaFinding { path: string; priority: string; foundTypes: string[]; missingTypes: string[]; status: string }
interface SchemaAudit { pagesFromSitemap: number; pagesAudited: number; auditedAt: string; findings: { noSchema: string[]; invalidSchema: string[]; missingFAQ: string[]; missingProduct: string[]; passing: string[] }; details: SchemaFinding[] }

interface LinkPage { path: string; priority?: number; inboundCount?: number; addLinkFrom?: string[]; linkedBy?: string[] }
interface LinkRec { from: string; to: string; reason: string }
interface LinkGraph { sourcesAnalyzed: number; authorityPagesTracked: number; auditedAt: string; orphanPages: LinkPage[]; weakPages: LinkPage[]; strongPages: LinkPage[]; recommendations: LinkRec[] }

// ─── Small helpers ────────────────────────────────────────────────────────────

function pct(n: number) { return `${Math.round(n * 1000) / 10}%` }
function pos(n: number) { return Math.round(n * 10) / 10 }

function PriorityBadge({ p }: { p: string }) {
  const c = p === "high" ? "bg-red-100 text-red-700" : p === "medium" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${c}`}>{p}</span>
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = { pass: "bg-green-100 text-green-700", partial: "bg-amber-100 text-amber-700", no_schema: "bg-red-100 text-red-700", invalid: "bg-red-100 text-red-700", error: "bg-gray-100 text-gray-500" }
  const label: Record<string, string> = { pass: "Pass", partial: "Partial", no_schema: "No schema", invalid: "Invalid", error: "Error" }
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${map[status] || map.error}`}>{label[status] || status}</span>
}

function Bar({ value, max, color = "bg-brand-500" }: { value: number; max: number; color?: string }) {
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5">
      <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${Math.round((value / Math.max(max, 1)) * 100)}%` }} />
    </div>
  )
}

// ─── Not-connected panel ──────────────────────────────────────────────────────

function NotConnected({ siteUrl }: { siteUrl: string }) {
  return (
    <div className="bg-white rounded-xl border border-amber-200 p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <Info size={18} className="text-amber-500 shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">Connect Google Search Console</h3>
          <p className="text-xs text-gray-500 mb-4">Search Console is not connected. Once connected, Growth OS will pull keyword rankings, impressions, CTR, and trend data automatically.</p>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs space-y-2.5">
            <p className="font-semibold text-gray-700 mb-1">Setup (5 minutes):</p>
            <ol className="space-y-2 text-gray-600 list-decimal list-inside">
              <li>Go to <strong>Google Cloud Console</strong> → create or open a project</li>
              <li>Enable the <strong>Google Search Console API</strong></li>
              <li>Go to <strong>IAM & Admin → Service Accounts</strong> → Create service account → Add role: <em>Viewer</em> → Create JSON key</li>
              <li>In <strong>Google Search Console</strong> → Settings → Users and permissions → Add user → paste the service account email → set as <em>Owner</em> or <em>Restricted</em></li>
              <li>In <strong>Vercel</strong> → Settings → Environment Variables:
                <ul className="list-disc ml-4 mt-1 space-y-1">
                  <li><code className="bg-gray-200 px-1 rounded">GOOGLE_SC_KEY</code> — paste the full contents of the JSON key file</li>
                  <li><code className="bg-gray-200 px-1 rounded">GOOGLE_SC_SITE_URL</code> — the exact URL as shown in Search Console (e.g. <code className="bg-gray-200 px-1 rounded">{siteUrl}</code>)</li>
                </ul>
              </li>
              <li>Redeploy → click <strong>Sync now</strong> above</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SEOCommandCenter() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [overview, setOverview] = useState<GSCOverview | null>(null)
  const [queries, setQueries] = useState<QueryRow[]>([])
  const [pages, setPages] = useState<PageRow[]>([])
  const [nearWins, setNearWins] = useState<NearWin[]>([])
  const [trends, setTrends] = useState<Trends | null>(null)
  const [schemaAudit, setSchemaAudit] = useState<SchemaAudit | null>(null)
  const [linkGraph, setLinkGraph] = useState<LinkGraph | null>(null)

  const [activeTab, setActiveTab] = useState<"keywords" | "pages" | "near-wins" | "trends" | "schema" | "links">("keywords")
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [runningSchema, setRunningSchema] = useState(false)
  const [runningLinks, setRunningLinks] = useState(false)
  const [schemaResult, setSchemaResult] = useState<string | null>(null)
  const [linkResult, setLinkResult] = useState<string | null>(null)
  const [gscLoading, setGscLoading] = useState(true)

  const loadGSC = useCallback(async () => {
    setGscLoading(true)
    await Promise.allSettled([
      fetch("/api/admin/gsc/sync").then(r => r.json()).then(setSyncStatus),
      fetch("/api/admin/gsc/data?type=overview").then(r => r.json()).then(d => !d.error && setOverview(d)),
      fetch("/api/admin/gsc/data?type=queries&limit=50&sort=impressions").then(r => r.json()).then(d => !d.error && setQueries(d.rows || [])),
      fetch("/api/admin/gsc/data?type=pages&limit=30&sort=clicks").then(r => r.json()).then(d => !d.error && setPages(d.rows || [])),
      fetch("/api/admin/gsc/data?type=near-wins").then(r => r.json()).then(d => !d.error && setNearWins(d.nearWins || [])),
      fetch("/api/admin/gsc/data?type=trends").then(r => r.json()).then(d => !d.error && setTrends(d)),
      fetch("/api/admin/growth/agents/schema-audit").then(r => r.json()).then(d => d._type === "latest" && setSchemaAudit(d)),
      fetch("/api/admin/growth/agents/internal-link").then(r => r.json()).then(d => d._type === "latest" && setLinkGraph(d)),
    ])
    setGscLoading(false)
  }, [])

  useEffect(() => { loadGSC() }, [loadGSC])

  const syncNow = async () => {
    setSyncing(true); setSyncError(null)
    try {
      const r = await fetch("/api/admin/gsc/sync", { method: "POST" })
      const d = await r.json()
      if (!d.ok) { setSyncError(d.error || d.errors?.[0] || "Sync failed"); setSyncing(false); return }
      await loadGSC()
    } catch (e) { setSyncError(String(e)) }
    setSyncing(false)
  }

  const runSchemaAgent = async () => {
    setRunningSchema(true); setSchemaResult(null)
    try {
      const d = await fetch("/api/admin/growth/agents/schema-audit", { method: "POST" }).then(r => r.json())
      setSchemaResult(d.summary || "Done"); await loadGSC()
    } catch { setSchemaResult("Error") }
    setRunningSchema(false)
  }

  const runLinkAgent = async () => {
    setRunningLinks(true); setLinkResult(null)
    try {
      const d = await fetch("/api/admin/growth/agents/internal-link", { method: "POST" }).then(r => r.json())
      setLinkResult(d.summary || "Done"); await loadGSC()
    } catch { setLinkResult("Error") }
    setRunningLinks(false)
  }

  const configured = syncStatus?.configured ?? false
  const hasGSCData = !!overview
  const tabs = [
    { id: "keywords", label: "Keywords" },
    { id: "pages", label: "Pages" },
    { id: "near-wins", label: `Near-Wins${nearWins.length ? ` (${nearWins.length})` : ""}` },
    { id: "trends", label: "Trends" },
    { id: "schema", label: "Schema" },
    { id: "links", label: "Internal Links" },
  ] as const

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-5 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search size={18} className="text-brand-600" />
            <div>
              <h1 className="text-base font-bold text-gray-900">SEO Command Center</h1>
              <p className="text-gray-400 text-[11px]">
                {syncStatus?.lastSync
                  ? `Last sync ${new Date(syncStatus.lastSync.syncedAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })} · ${syncStatus.lastSync.queryCount} queries · ${syncStatus.lastSync.pageCount} pages`
                  : configured ? "Never synced" : "Google Search Console not connected"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {configured && (
              <button onClick={syncNow} disabled={syncing}
                className="flex items-center gap-1.5 text-xs bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 disabled:opacity-50">
                {syncing ? <RotateCw size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                {syncing ? "Syncing…" : "Sync now"}
              </button>
            )}
          </div>
        </div>
        {syncError && <p className="text-red-600 text-[11px] mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">{syncError}</p>}
      </div>

      <div className="px-8 py-6 max-w-[1400px] space-y-6">
        {/* Not connected */}
        {!configured && <NotConnected siteUrl={syncStatus?.siteUrl || "https://www.100xcircle.com/"} />}

        {/* GSC Overview stats */}
        {hasGSCData && overview && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "Total Clicks", value: overview.totalClicks.toLocaleString(), color: "text-green-600", border: "border-green-200" },
              { label: "Impressions", value: overview.totalImpressions.toLocaleString(), color: "text-brand-600", border: "border-brand-200" },
              { label: "Avg Position", value: pos(overview.avgPosition), color: "text-gray-800", border: "border-gray-200" },
              { label: "Unique Queries", value: overview.uniqueQueries.toLocaleString(), color: "text-gray-800", border: "border-gray-200" },
              { label: "Unique Pages", value: overview.uniquePages.toLocaleString(), color: "text-gray-800", border: "border-gray-200" },
              { label: "Near-Win Queries", value: overview.nearWinCount, color: "text-amber-600", border: "border-amber-200" },
            ].map(({ label, value, color, border }) => (
              <div key={label} className={`bg-white rounded-xl border ${border} p-3 shadow-sm text-center`}>
                <p className={`text-xl font-bold ${color}`}>{value}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Period label */}
        {overview?.period && (
          <div className="flex items-center gap-2 text-[11px] text-gray-400">
            <Clock size={11} />
            Data: {overview.period.startDate} → {overview.period.endDate} (28-day window)
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-sm flex-wrap">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${activeTab === tab.id ? "bg-brand-600 text-white" : "text-gray-500 hover:text-gray-700"}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── KEYWORDS ─────────────────────────────────────────────────────── */}
        {activeTab === "keywords" && (
          <div className="space-y-4">
            {!hasGSCData ? (
              <div className="bg-white rounded-xl border border-dashed border-gray-200 p-10 text-center">
                <p className="text-gray-400 text-sm">{configured ? (gscLoading ? "Loading…" : "No data yet — click Sync now") : "Connect Google Search Console to see keyword data"}</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-800">Top Queries by Impressions</h3>
                  <span className="text-[11px] text-gray-400">{queries.length} queries</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        {["Query", "Position", "Impressions", "Clicks", "CTR"].map(h => (
                          <th key={h} className="text-left px-4 py-2.5 text-gray-400 font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {queries.map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50/50">
                          <td className="px-4 py-2.5 text-gray-700 max-w-[300px] truncate font-medium">{row.query}</td>
                          <td className="px-4 py-2.5">
                            <span className={`font-semibold ${row.position <= 3 ? "text-green-600" : row.position <= 10 ? "text-amber-600" : "text-gray-500"}`}>
                              {pos(row.position)}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-gray-600">{row.impressions.toLocaleString()}</td>
                          <td className="px-4 py-2.5 text-gray-600">{row.clicks}</td>
                          <td className="px-4 py-2.5 text-gray-500">{pct(row.ctr)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── PAGES ────────────────────────────────────────────────────────── */}
        {activeTab === "pages" && (
          <div className="space-y-4">
            {!hasGSCData ? (
              <div className="bg-white rounded-xl border border-dashed border-gray-200 p-10 text-center">
                <p className="text-gray-400 text-sm">{configured ? "No data yet — click Sync now" : "Connect Google Search Console"}</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-800">Pages by Organic Clicks</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        {["Page", "Clicks", "Impressions", "CTR", "Avg Position"].map(h => (
                          <th key={h} className="text-left px-4 py-2.5 text-gray-400 font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {pages.map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50/50">
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-1">
                              <code className="text-[11px] text-gray-700">{row.pagePath}</code>
                              <a href={`https://www.100xcircle.com${row.pagePath}`} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-brand-500"><ExternalLink size={10} /></a>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 font-semibold text-green-600">{row.clicks}</td>
                          <td className="px-4 py-2.5 text-gray-600">{row.impressions.toLocaleString()}</td>
                          <td className="px-4 py-2.5 text-gray-500">{pct(row.ctr)}</td>
                          <td className="px-4 py-2.5 text-gray-500">{pos(row.position)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── NEAR-WINS ────────────────────────────────────────────────────── */}
        {activeTab === "near-wins" && (
          <div className="space-y-4">
            {!hasGSCData ? (
              <div className="bg-white rounded-xl border border-dashed border-gray-200 p-10 text-center">
                <p className="text-gray-400 text-sm">{configured ? "No data yet — sync first" : "Connect Google Search Console"}</p>
              </div>
            ) : nearWins.length === 0 ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                <CheckCircle2 size={20} className="text-green-500 mx-auto mb-2" />
                <p className="text-green-700 text-sm font-medium">No near-wins detected</p>
                <p className="text-green-600 text-xs mt-1">All ranked keywords have CTR close to expected for their position. Strong result.</p>
              </div>
            ) : (
              <>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
                  <Zap size={14} className="text-amber-500 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-700">
                    <p className="font-semibold mb-1">Near-Win Definition</p>
                    <p>Position 4–20 + impressions ≥50 + actual CTR &lt;75% of expected CTR for that position. These keywords are already indexed and visible — small improvements (FAQ, title tag, internal links) unlock disproportionate traffic.</p>
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-800">Near-Win Keywords ({nearWins.length})</h3>
                    <span className="text-[11px] text-gray-400">Sorted by impressions — highest-volume opportunities first</span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {nearWins.map((nw, i) => (
                      <div key={i} className="px-5 py-4">
                        <div className="flex items-start gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <p className="text-sm font-semibold text-gray-800">{nw.query}</p>
                              <PriorityBadge p={nw.priority} />
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-[11px]">
                              <div>
                                <p className="text-gray-400 mb-0.5">Position</p>
                                <p className={`font-semibold ${nw.position <= 10 ? "text-amber-600" : "text-gray-600"}`}>{nw.position}</p>
                              </div>
                              <div>
                                <p className="text-gray-400 mb-0.5">Impressions</p>
                                <p className="font-semibold text-gray-700">{nw.impressions.toLocaleString()}</p>
                              </div>
                              <div>
                                <p className="text-gray-400 mb-0.5">Actual CTR</p>
                                <p className="font-semibold text-red-500">{nw.ctr}%</p>
                              </div>
                              <div>
                                <p className="text-gray-400 mb-0.5">Expected CTR</p>
                                <p className="font-semibold text-gray-600">{nw.expectedCtr}%</p>
                              </div>
                              <div>
                                <p className="text-gray-400 mb-0.5">CTR gap</p>
                                <p className="font-semibold text-amber-600">−{nw.ctrGap}%</p>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="mt-2">
                          <Bar value={nw.ctr} max={nw.expectedCtr} color="bg-red-400" />
                          <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                            <span>Actual {nw.ctr}%</span>
                            <span>Expected {nw.expectedCtr}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── TRENDS ────────────────────────────────────────────────────────── */}
        {activeTab === "trends" && (
          <div className="space-y-4">
            {!trends ? (
              <div className="bg-white rounded-xl border border-dashed border-gray-200 p-10 text-center">
                <p className="text-gray-400 text-sm">{configured ? "No trend data yet — you need at least one sync with previous period data" : "Connect Google Search Console"}</p>
              </div>
            ) : (
              <>
                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Rising queries */}
                  <div className="bg-white rounded-xl border border-green-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-green-100 flex items-center gap-2">
                      <TrendingUp size={14} className="text-green-500" />
                      <h3 className="text-sm font-semibold text-gray-800">Rising Queries ({trends.risingQueries.length})</h3>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {trends.risingQueries.slice(0, 12).map((r, i) => (
                        <div key={i} className="px-5 py-2.5 flex items-center justify-between text-xs">
                          <span className="text-gray-700 truncate max-w-[200px]">{r.query}</span>
                          <div className="flex items-center gap-3 shrink-0 ml-2">
                            <span className="text-gray-400">pos {pos(r.position)}</span>
                            {r.isNew ? (
                              <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-semibold">NEW</span>
                            ) : r.posChange !== null ? (
                              <span className="text-green-600 font-semibold">+{Math.abs(r.posChange).toFixed(1)}</span>
                            ) : null}
                          </div>
                        </div>
                      ))}
                      {trends.risingQueries.length === 0 && <p className="px-5 py-4 text-xs text-gray-400">No significant rising queries in this period.</p>}
                    </div>
                  </div>

                  {/* Falling queries */}
                  <div className="bg-white rounded-xl border border-red-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-red-100 flex items-center gap-2">
                      <TrendingDown size={14} className="text-red-500" />
                      <h3 className="text-sm font-semibold text-gray-800">Falling Queries ({trends.fallingQueries.length})</h3>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {trends.fallingQueries.slice(0, 12).map((r, i) => (
                        <div key={i} className="px-5 py-2.5 flex items-center justify-between text-xs">
                          <span className="text-gray-700 truncate max-w-[200px]">{r.query}</span>
                          <div className="flex items-center gap-3 shrink-0 ml-2">
                            <span className="text-gray-400">pos {pos(r.position)}</span>
                            {r.posChange !== null && <span className="text-red-600 font-semibold">−{r.posChange.toFixed(1)}</span>}
                          </div>
                        </div>
                      ))}
                      {trends.fallingQueries.length === 0 && <p className="px-5 py-4 text-xs text-gray-400">No significant falling queries.</p>}
                    </div>
                  </div>

                  {/* Rising pages */}
                  <div className="bg-white rounded-xl border border-green-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-green-100 flex items-center gap-2">
                      <TrendingUp size={14} className="text-green-500" />
                      <h3 className="text-sm font-semibold text-gray-800">Rising Pages ({trends.risingPages.length})</h3>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {trends.risingPages.slice(0, 10).map((r, i) => (
                        <div key={i} className="px-5 py-2.5 flex items-center justify-between text-xs">
                          <code className="text-gray-700 truncate max-w-[200px] text-[11px]">{r.pagePath}</code>
                          <div className="flex items-center gap-3 shrink-0 ml-2">
                            {r.isNew ? (
                              <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-semibold">NEW</span>
                            ) : r.clickChange !== null ? (
                              <span className="text-green-600 font-semibold">+{r.clickChange} clicks</span>
                            ) : null}
                          </div>
                        </div>
                      ))}
                      {trends.risingPages.length === 0 && <p className="px-5 py-4 text-xs text-gray-400">No significant rising pages.</p>}
                    </div>
                  </div>

                  {/* Falling pages */}
                  <div className="bg-white rounded-xl border border-red-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-red-100 flex items-center gap-2">
                      <TrendingDown size={14} className="text-red-500" />
                      <h3 className="text-sm font-semibold text-gray-800">Falling Pages ({trends.fallingPages.length})</h3>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {trends.fallingPages.slice(0, 10).map((r, i) => (
                        <div key={i} className="px-5 py-2.5 flex items-center justify-between text-xs">
                          <code className="text-gray-700 truncate max-w-[200px] text-[11px]">{r.pagePath}</code>
                          {r.clickChange !== null && <span className="text-red-600 font-semibold shrink-0 ml-2">{r.clickChange} clicks</span>}
                        </div>
                      ))}
                      {trends.fallingPages.length === 0 && <p className="px-5 py-4 text-xs text-gray-400">No significant falling pages.</p>}
                    </div>
                  </div>
                </div>
                {trends.currentPeriod && trends.previousPeriod && (
                  <p className="text-[11px] text-gray-400 flex items-center gap-1"><Clock size={11} /> Current: {trends.currentPeriod.startDate} → {trends.currentPeriod.endDate} vs Previous: {trends.previousPeriod.startDate} → {trends.previousPeriod.endDate}</p>
                )}
              </>
            )}
          </div>
        )}

        {/* ── SCHEMA ───────────────────────────────────────────────────────── */}
        {activeTab === "schema" && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-1">Schema Audit Agent</h3>
                <p className="text-xs text-gray-500">Fetches live sitemap, audits JSON-LD on all pages with schema expectations.</p>
                {schemaAudit?.auditedAt && <p className="text-[11px] text-gray-400 mt-1">Last run: {new Date(schemaAudit.auditedAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p>}
                {schemaResult && <p className="text-[11px] text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5 mt-2">{schemaResult}</p>}
              </div>
              <button onClick={runSchemaAgent} disabled={runningSchema} className="flex items-center gap-1.5 text-xs bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 disabled:opacity-50 shrink-0">
                {runningSchema ? <RotateCw size={12} className="animate-spin" /> : <Play size={12} />}
                {runningSchema ? "Running…" : "Run now"}
              </button>
            </div>
            {!schemaAudit ? (
              <div className="bg-white rounded-xl border border-dashed border-gray-200 p-10 text-center"><p className="text-gray-400 text-sm">No audit data yet.</p></div>
            ) : (
              <>
                <div className="grid sm:grid-cols-4 gap-4">
                  {[
                    { label: "No JSON-LD", pages: schemaAudit.findings.noSchema, color: "border-red-200", textColor: "text-red-600" },
                    { label: "Missing FAQPage", pages: schemaAudit.findings.missingFAQ, color: "border-amber-200", textColor: "text-amber-600" },
                    { label: "Missing Product", pages: schemaAudit.findings.missingProduct, color: "border-amber-200", textColor: "text-amber-600" },
                    { label: "Passing", pages: schemaAudit.findings.passing, color: "border-green-200", textColor: "text-green-600" },
                  ].map(({ label, pages, color, textColor }) => (
                    <div key={label} className={`bg-white rounded-xl border ${color} p-4 shadow-sm`}>
                      <p className={`text-xl font-bold ${textColor}`}>{pages.length}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                      {pages.slice(0, 3).map(p => <p key={p} className="text-[10px] text-gray-500 font-mono truncate mt-1">{p}</p>)}
                      {pages.length > 3 && <p className="text-[10px] text-gray-400">+{pages.length - 3} more</p>}
                    </div>
                  ))}
                </div>
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100"><h3 className="text-sm font-semibold text-gray-800">All Audited Pages</h3></div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead><tr className="border-b border-gray-100 bg-gray-50">{["Page", "Priority", "Status", "Found", "Missing"].map(h => <th key={h} className="text-left px-4 py-2.5 text-gray-400 font-medium">{h}</th>)}</tr></thead>
                      <tbody className="divide-y divide-gray-50">
                        {schemaAudit.details.sort((a, b) => { const o = { high: 0, medium: 1, low: 2 }; return (o[a.priority as keyof typeof o] ?? 3) - (o[b.priority as keyof typeof o] ?? 3) }).map(d => (
                          <tr key={d.path} className="hover:bg-gray-50/50">
                            <td className="px-4 py-2.5"><div className="flex items-center gap-1"><code className="text-[11px] text-gray-700">{d.path}</code><a href={`https://www.100xcircle.com${d.path}`} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-brand-500"><ExternalLink size={10} /></a></div></td>
                            <td className="px-4 py-2.5"><span className={`text-[10px] font-semibold ${d.priority === "high" ? "text-red-600" : d.priority === "medium" ? "text-amber-600" : "text-gray-400"}`}>{d.priority}</span></td>
                            <td className="px-4 py-2.5"><StatusBadge status={d.status} /></td>
                            <td className="px-4 py-2.5 text-gray-500 text-[11px]">{d.foundTypes.join(", ") || "—"}</td>
                            <td className="px-4 py-2.5">{d.missingTypes.length > 0 ? <span className="text-red-600 text-[11px] font-medium">{d.missingTypes.join(", ")}</span> : <span className="text-gray-300">—</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── INTERNAL LINKS ─────────────────────────────────────────────── */}
        {activeTab === "links" && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-1">Internal Link Agent</h3>
                <p className="text-xs text-gray-500">Crawls live sitemap, builds inbound link graph, surfaces orphan and weak pages.</p>
                {linkGraph?.auditedAt && <p className="text-[11px] text-gray-400 mt-1">Last run: {new Date(linkGraph.auditedAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p>}
                {linkResult && <p className="text-[11px] text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5 mt-2">{linkResult}</p>}
              </div>
              <button onClick={runLinkAgent} disabled={runningLinks} className="flex items-center gap-1.5 text-xs bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 disabled:opacity-50 shrink-0">
                {runningLinks ? <RotateCw size={12} className="animate-spin" /> : <Play size={12} />}
                {runningLinks ? "Crawling…" : "Run now"}
              </button>
            </div>
            {!linkGraph ? (
              <div className="bg-white rounded-xl border border-dashed border-gray-200 p-10 text-center"><p className="text-gray-400 text-sm">No data yet.</p></div>
            ) : (
              <>
                <div className="grid sm:grid-cols-3 gap-4">
                  {[
                    { label: "Orphan pages", value: linkGraph.orphanPages.length, desc: "0 inbound links", color: "border-red-200", textColor: "text-red-600" },
                    { label: "Weak pages", value: linkGraph.weakPages.length, desc: "≤2 inbound links", color: "border-amber-200", textColor: "text-amber-600" },
                    { label: "Strong pages", value: linkGraph.strongPages.length, desc: "3+ inbound links", color: "border-green-200", textColor: "text-green-600" },
                  ].map(({ label, value, desc, color, textColor }) => (
                    <div key={label} className={`bg-white rounded-xl border ${color} p-5 shadow-sm text-center`}>
                      <p className={`text-3xl font-bold ${textColor}`}>{value}</p>
                      <p className="text-xs font-medium text-gray-700 mt-1">{label}</p>
                      <p className="text-[11px] text-gray-400">{desc}</p>
                    </div>
                  ))}
                </div>
                {linkGraph.orphanPages.length > 0 && (
                  <div className="bg-white rounded-xl border border-red-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-red-100 flex items-center gap-2"><XCircle size={14} className="text-red-500" /><h3 className="text-sm font-semibold text-gray-800">Orphan Pages</h3></div>
                    <div className="divide-y divide-gray-50">
                      {linkGraph.orphanPages.map(p => (
                        <div key={p.path} className="px-5 py-3">
                          <code className="text-[11px] text-gray-700">{p.path}</code>
                          {p.addLinkFrom && p.addLinkFrom.length > 0 && <p className="text-[11px] text-gray-500 mt-0.5">Add link from: <span className="text-brand-600">{p.addLinkFrom.slice(0, 2).join(", ")}</span></p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {linkGraph.recommendations.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2"><Link2 size={14} className="text-brand-600" /><h3 className="text-sm font-semibold text-gray-800">Recommendations</h3></div>
                    <div className="divide-y divide-gray-50">
                      {linkGraph.recommendations.map((r, i) => (
                        <div key={i} className="px-5 py-3 text-[11px]">
                          <div className="flex items-center gap-2 mb-0.5"><code className="text-gray-600">{r.from}</code><span className="text-gray-300">→</span><code className="text-brand-600 font-medium">{r.to}</code></div>
                          <p className="text-gray-400">{r.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
