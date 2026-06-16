"use client"
import { useEffect, useState, useCallback } from "react"
import { Search, Link2, AlertCircle, ExternalLink, CheckCircle2, XCircle, Play, RotateCw, TrendingUp, TrendingDown, Zap, RefreshCw, Clock, Info, Target, ChevronDown, ChevronUp, Pause, Check, Shield, History, Globe, RotateCcw, Loader2, FlaskConical, ArrowRight, AlertTriangle, Activity, BarChart2 } from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────────────

interface SyncStatus { oauthConfigured: boolean; connected: boolean; connectedEmail: string | null; siteUrl: string; lastSync: { syncedAt: string; queryCount: number; pageCount: number; status: string } | null }

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

interface SeoRec {
  _id: string
  type: string
  priority: "critical" | "high" | "medium" | "low"
  title: string
  url: string
  why: string
  current_state: string
  proposed_change: string
  expected_clicks: number
  expected_revenue_inr: number
  confidence: number
  difficulty: string
  effort: string
  status: "pending" | "approved" | "rejected" | "deferred" | "implementing" | "executing" | "validating" | "implemented" | "failed" | "rolled_back"
  generated_at: string
  executed_at?: string
  implemented_at?: string
  rolled_back_at?: string
  validation_result?: {
    pass: boolean
    reason?: string
    checks: Record<string, { pass: boolean; reason?: string; value?: unknown }>
    safe_types_only: boolean
  }
  sanity_flags?: {
    ctr_capped?: boolean
    original_expected_clicks?: number
    review_required?: boolean
    revenue_note?: string
  }
  implementation_package?: {
    meta_title?: string
    meta_description?: string
    schema_snippet?: string
    link_recommendations?: Array<{ from: string; anchor: string; to: string }>
    notes?: string
  }
}

interface ExecLogEntry {
  _id: string
  rec_id: string
  rec_type: string
  rec_title: string
  action: "execute" | "rollback"
  path: string
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  status: "success" | "failed"
  validation_result?: SeoRec["validation_result"]
  executed_at: string
  final_status: string
  auto_rollback?: boolean
  manual_rollback?: boolean
  risk_gate?: { risk_level: string; risk_score: number; founder_approval: boolean; admin_override: boolean }
}

type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"

interface RiskProfile {
  path: string
  risk_level: RiskLevel
  risk_score: number
  clicks_28d: number
  impressions_28d: number
  avg_position: number
  ranking_keywords: number
  top10_keywords: number
  backlink_count: number
  referring_domains: number
  revenue_attribution_30d: number
  requires_founder_approval: boolean
  requires_admin_approval: boolean
  warnings: string[]
  scored_at: string
}

interface TrafficAlert {
  _id: string
  path: string
  rec_id: string
  alert_types: string[]
  message: string
  suggestion: string
  click_drop_pct: number
  position_drop: number
  status: "active" | "acknowledged"
  created_at: string
}

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

function NotConnected() {
  return (
    <div className="bg-white rounded-xl border border-amber-200 p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <Info size={18} className="text-amber-500 shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">Google Search Console not connected</h3>
          <p className="text-xs text-gray-500 mb-4">Once connected, Growth OS pulls keyword rankings, impressions, CTR, and trend data automatically. Uses OAuth2 — no service account keys required.</p>
          <div className="flex gap-3 flex-wrap">
            <a href="/admin/growth/seo/setup"
              className="inline-flex items-center gap-1.5 text-xs bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700">
              Go to Search Console Setup →
            </a>
            <p className="text-[11px] text-gray-400 self-center">Set up OAuth credentials, then click &quot;Connect Google Account&quot; to sign in.</p>
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
  const [seoRecs, setSeoRecs] = useState<SeoRec[]>([])
  const [recsLoading, setRecsLoading] = useState(false)
  const [generatingRecs, setGeneratingRecs] = useState(false)
  const [recsResult, setRecsResult] = useState<string | null>(null)
  const [actioning, setActioning] = useState<string | null>(null)
  const [executingId, setExecutingId] = useState<string | null>(null)
  const [rollingBackId, setRollingBackId] = useState<string | null>(null)
  const [execResult, setExecResult] = useState<{ id: string; ok: boolean; msg: string } | null>(null)
  const [execLog, setExecLog] = useState<ExecLogEntry[]>([])
  const [execLogLoading, setExecLogLoading] = useState(false)
  const [showExecLog, setShowExecLog] = useState(false)
  const [trafficAlerts, setTrafficAlerts] = useState<TrafficAlert[]>([])
  const [runningMonitor, setRunningMonitor] = useState(false)

  const [activeTab, setActiveTab] = useState<"keywords" | "pages" | "near-wins" | "trends" | "schema" | "links" | "recommendations">("keywords")
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

  const loadRecs = useCallback(async () => {
    setRecsLoading(true)
    try {
      const d = await fetch("/api/admin/growth/seo/recommendations").then(r => r.json())
      setSeoRecs(d.recs || [])
    } catch { /* ignore */ } finally { setRecsLoading(false) }
  }, [])

  const loadTrafficAlerts = useCallback(async () => {
    try {
      const d = await fetch("/api/admin/growth/seo/traffic-monitor").then(r => r.json())
      setTrafficAlerts(d.alerts || [])
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { loadGSC(); loadRecs(); loadTrafficAlerts() }, [loadGSC, loadRecs, loadTrafficAlerts])

  const generateRecs = async () => {
    setGeneratingRecs(true); setRecsResult(null)
    try {
      const d = await fetch("/api/admin/growth/seo/recommendations", { method: "POST" }).then(r => r.json())
      setRecsResult(d.error ? `Error: ${d.error}` : `${d.created} new recommendations generated (${d.skipped || 0} duplicates skipped)`)
      await loadRecs()
    } catch (e) { setRecsResult(String(e)) } finally { setGeneratingRecs(false) }
  }

  const actionRec = async (id: string, status: string) => {
    setActioning(id)
    try {
      await fetch(`/api/admin/growth/seo/recommendations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reviewed_at: new Date().toISOString() }),
      })
      await loadRecs()
    } catch { /* ignore */ } finally { setActioning(null) }
  }

  const executeRec = async (id: string, options?: { founder_approval?: boolean; admin_override?: boolean }) => {
    setExecutingId(id); setExecResult(null)
    try {
      const d = await fetch(`/api/admin/growth/seo/recommendations/${id}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(options || {}),
      }).then(r => r.json())
      const ok = d.ok && d.status === "implemented"
      setExecResult({
        id,
        ok,
        msg: ok
          ? `Executed successfully — ${d.status}`
          : d.error || `Validation failed: ${d.reason || "unknown reason"}${d.auto_rollback ? " (auto-rolled back)" : ""}`,
      })
      await loadRecs()
    } catch (e) {
      setExecResult({ id, ok: false, msg: String(e) })
    } finally { setExecutingId(null) }
  }

  const runTrafficMonitor = async () => {
    setRunningMonitor(true)
    try {
      await fetch("/api/admin/growth/seo/traffic-monitor", { method: "POST" })
      await loadTrafficAlerts()
    } catch { /* ignore */ }
    setRunningMonitor(false)
  }

  const rollbackRec = async (id: string) => {
    setRollingBackId(id); setExecResult(null)
    try {
      const d = await fetch(`/api/admin/growth/seo/recommendations/${id}/rollback`, { method: "POST" }).then(r => r.json())
      setExecResult({ id, ok: !!d.ok, msg: d.ok ? "Rolled back successfully" : (d.error || "Rollback failed") })
      await loadRecs()
    } catch (e) {
      setExecResult({ id, ok: false, msg: String(e) })
    } finally { setRollingBackId(null) }
  }

  const loadExecLog = useCallback(async () => {
    setExecLogLoading(true)
    try {
      const d = await fetch("/api/admin/growth/seo/execution-log?limit=30").then(r => r.json())
      setExecLog(d.entries || [])
    } catch { /* ignore */ } finally { setExecLogLoading(false) }
  }, [])

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

  const configured = (syncStatus?.oauthConfigured && syncStatus?.connected) ?? false
  const hasGSCData = !!overview
  const pendingRecs = seoRecs.filter(r => r.status === "pending")
  const tabs = [
    { id: "keywords", label: "Keywords" },
    { id: "pages", label: "Pages" },
    { id: "near-wins", label: `Near-Wins${nearWins.length ? ` (${nearWins.length})` : ""}` },
    { id: "trends", label: "Trends" },
    { id: "schema", label: "Schema" },
    { id: "links", label: "Internal Links" },
    { id: "recommendations", label: `Recommendations${pendingRecs.length ? ` (${pendingRecs.length})` : ""}` },
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
        {!configured && <NotConnected />}

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

        {/* ── RECOMMENDATIONS (v2.5) ──────────────────────────────────────────── */}
        {activeTab === "recommendations" && (
          <SeoRecommendationsTab
            recs={seoRecs}
            loading={recsLoading}
            generating={generatingRecs}
            result={recsResult}
            actioning={actioning}
            executingId={executingId}
            rollingBackId={rollingBackId}
            execResult={execResult}
            execLog={execLog}
            execLogLoading={execLogLoading}
            showExecLog={showExecLog}
            trafficAlerts={trafficAlerts}
            runningMonitor={runningMonitor}
            onGenerate={generateRecs}
            onAction={actionRec}
            onExecute={executeRec}
            onRollback={rollbackRec}
            onRunMonitor={runTrafficMonitor}
            onToggleExecLog={() => {
              if (!showExecLog) loadExecLog()
              setShowExecLog(p => !p)
            }}
          />
        )}
      </div>
    </div>
  )
}

// ─── SEO Recommendations Tab ─────────────────────────────────────────────────

const REC_TYPE_LABEL: Record<string, string> = {
  ctr_opportunity:    "CTR Opportunity",
  ranking_opportunity: "Ranking Opportunity",
  schema_fix:         "Schema Fix",
  internal_link:      "Internal Link",
  content_gap:        "Content Gap",
  title_optimization: "Title Optimization",
}

const REC_TYPE_COLOR: Record<string, string> = {
  ctr_opportunity:    "bg-blue-50 text-blue-700 border-blue-200",
  ranking_opportunity: "bg-indigo-50 text-indigo-700 border-indigo-200",
  schema_fix:         "bg-orange-50 text-orange-700 border-orange-200",
  internal_link:      "bg-green-50 text-green-700 border-green-200",
  content_gap:        "bg-violet-50 text-violet-700 border-violet-200",
  title_optimization: "bg-amber-50 text-amber-700 border-amber-200",
}

const PRIORITY_COLOR_SEO: Record<string, string> = {
  critical: "bg-red-100 text-red-700 border-red-200",
  high:     "bg-orange-100 text-orange-700 border-orange-200",
  medium:   "bg-yellow-100 text-yellow-700 border-yellow-200",
  low:      "bg-gray-100 text-gray-600 border-gray-200",
}

const STATUS_COLOR_SEO: Record<string, string> = {
  pending:     "bg-gray-100 text-gray-600",
  approved:    "bg-blue-100 text-blue-700",
  executing:   "bg-amber-100 text-amber-700",
  validating:  "bg-violet-100 text-violet-700",
  implemented: "bg-emerald-100 text-emerald-700",
  failed:      "bg-red-100 text-red-700",
  rolled_back: "bg-orange-100 text-orange-700",
  rejected:    "bg-red-100 text-red-600",
  deferred:    "bg-gray-100 text-gray-500",
}

// State machine steps for display
const STATE_STEPS = ["Detected", "Approved", "Executing", "Validating", "Implemented"]
const STATE_STEP_INDEX: Record<string, number> = {
  pending: 0, approved: 1, executing: 2, validating: 3, implemented: 4,
  failed: 3, rolled_back: 3,
}

// Types that support SERP preview
const SERP_PREVIEW_TYPES = new Set(["ctr_opportunity", "title_optimization"])
// Types that are auto-executable
const AUTO_EXEC_TYPES = new Set(["ctr_opportunity", "ranking_opportunity", "schema_fix", "internal_link", "title_optimization", "content_gap"])

const EFFORT_LABEL_SEO: Record<string, string> = {
  "5_min": "5 min", "30_min": "30 min", "1_hour": "1 hr", "half_day": "½ day", "project": "Project",
}

const INR_SEO = (n: number) =>
  n >= 1e7 ? `₹${(n / 1e7).toFixed(2)} Cr` :
  n >= 1e5 ? `₹${(n / 1e5).toFixed(1)} L` :
  n > 0 ? `₹${Math.round(n).toLocaleString("en-IN")}` : "₹0"

// ─── SERP Preview ─────────────────────────────────────────────────────────────

function SerpPreview({ url, title, description }: { url: string; title: string; description: string }) {
  const displayUrl = `www.100xcircle.com${url}`.replace(/\/$/, "")
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-1.5 mb-2">
        <Globe size={10} className="text-gray-400" />
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">SERP Preview</span>
      </div>
      <div className="max-w-[520px] font-sans">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-5 h-5 rounded-full bg-brand-100 flex items-center justify-center text-[8px] font-bold text-brand-600">1</div>
          <div>
            <p className="text-[11px] text-gray-700 font-medium leading-none">100x Circle</p>
            <p className="text-[10px] text-gray-400 leading-none mt-0.5">{displayUrl} ▾</p>
          </div>
        </div>
        <p className="text-[17px] text-[#1a0dab] font-normal leading-tight mt-1 hover:underline cursor-pointer line-clamp-1">
          {title || <span className="text-gray-400 italic">No title set</span>}
        </p>
        <p className="text-[12px] text-[#4d5156] leading-snug mt-0.5 line-clamp-2">
          {description || <span className="text-gray-400 italic">No description set</span>}
        </p>
        <div className="flex gap-3 mt-1.5">
          <span className={`text-[10px] ${(title?.length || 0) > 60 ? "text-red-500 font-semibold" : "text-gray-400"}`}>
            Title: {title?.length || 0}/60
          </span>
          <span className={`text-[10px] ${(description?.length || 0) > 160 ? "text-red-500 font-semibold" : "text-gray-400"}`}>
            Desc: {description?.length || 0}/160
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── State Machine Stepper ────────────────────────────────────────────────────

function StateStepper({ status }: { status: string }) {
  const currentStep = STATE_STEP_INDEX[status] ?? 0
  const failed = status === "failed" || status === "rolled_back"
  return (
    <div className="flex items-center gap-0 py-3 px-5 bg-gray-50 border-t border-gray-100 overflow-x-auto">
      {STATE_STEPS.map((step, i) => {
        const done = i < currentStep || status === "implemented"
        const active = i === currentStep && !failed
        const isFailed = failed && i === currentStep
        return (
          <div key={step} className="flex items-center gap-0 shrink-0">
            <div className="flex flex-col items-center">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold border
                ${done ? "bg-emerald-500 border-emerald-500 text-white" :
                  isFailed ? "bg-red-500 border-red-500 text-white" :
                  active ? "bg-brand-600 border-brand-600 text-white" :
                  "bg-white border-gray-300 text-gray-400"}`}>
                {done ? "✓" : isFailed ? "✗" : i + 1}
              </div>
              <p className={`text-[9px] mt-0.5 font-medium whitespace-nowrap
                ${done ? "text-emerald-600" : isFailed ? "text-red-600" : active ? "text-brand-700" : "text-gray-400"}`}>
                {step}
              </p>
            </div>
            {i < STATE_STEPS.length - 1 && (
              <div className={`h-[1px] w-8 mx-0.5 mb-3.5 ${i < currentStep ? "bg-emerald-400" : "bg-gray-200"}`} />
            )}
          </div>
        )
      })}
      {(status === "failed" || status === "rolled_back") && (
        <div className="ml-3 flex items-center gap-1 text-[10px] text-red-600 font-semibold shrink-0">
          <ArrowRight size={10} />{status === "rolled_back" ? "Rolled Back" : "Failed"}
        </div>
      )}
    </div>
  )
}

// ─── Validation Result Panel ──────────────────────────────────────────────────

function ValidationPanel({ result }: { result: SeoRec["validation_result"] }) {
  if (!result) return null
  return (
    <div className={`border-t px-5 py-3 ${result.pass ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100"}`}>
      <div className="flex items-center gap-2 mb-2">
        <FlaskConical size={12} className={result.pass ? "text-emerald-600" : "text-red-600"} />
        <span className={`text-xs font-semibold ${result.pass ? "text-emerald-700" : "text-red-700"}`}>
          Validation {result.pass ? "Passed" : "Failed"}
        </span>
        {!result.pass && result.reason && (
          <span className="text-[10px] text-red-600">— {result.reason}</span>
        )}
      </div>
      {Object.entries(result.checks).map(([key, check]) => (
        <div key={key} className="flex items-start gap-2 text-[11px] mb-0.5">
          {check.pass
            ? <CheckCircle2 size={10} className="text-emerald-500 mt-0.5 shrink-0" />
            : <XCircle size={10} className="text-red-500 mt-0.5 shrink-0" />}
          <span className="text-gray-600 font-medium">{key.replace(/_/g, " ")}:</span>
          <span className={check.pass ? "text-gray-500" : "text-red-600"}>
            {check.pass ? (check.value !== undefined ? String(check.value) : "OK") : check.reason || "Failed"}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Risk Badge ──────────────────────────────────────────────────────────────

const RISK_COLOR: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-700 border-red-300",
  HIGH:     "bg-orange-100 text-orange-700 border-orange-300",
  MEDIUM:   "bg-amber-100 text-amber-700 border-amber-300",
  LOW:      "bg-green-100 text-green-700 border-green-300",
}

function RiskBadge({ level, score }: { level: string; score: number }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border ${RISK_COLOR[level] || "bg-gray-100 text-gray-600 border-gray-300"}`}>
      <Shield size={9} />
      {level} RISK · {score}/100
    </span>
  )
}

// ─── SEO Equity Shield (pre-execution gate panel) ─────────────────────────────

function SeoEquityShield({ rec, riskProfile, riskLoading, confirmed, founderApproved, onConfirmedChange, onFounderChange, onConfirm, onCancel, executing }: {
  rec: SeoRec
  riskProfile: RiskProfile | null
  riskLoading: boolean
  confirmed: boolean
  founderApproved: boolean
  onConfirmedChange: (v: boolean) => void
  onFounderChange: (v: boolean) => void
  onConfirm: () => void
  onCancel: () => void
  executing: boolean
}) {
  const rl = riskProfile?.risk_level

  const canConfirm = !executing && riskProfile && (
    rl === "LOW" ? confirmed
    : rl === "MEDIUM" ? confirmed
    : founderApproved && confirmed   // HIGH + CRITICAL need founder
  )

  return (
    <div className={`border-t px-5 py-4 space-y-3 ${rl === "CRITICAL" ? "bg-red-50 border-red-200" : rl === "HIGH" ? "bg-orange-50 border-orange-200" : rl === "MEDIUM" ? "bg-amber-50 border-amber-200" : "bg-blue-50 border-blue-200"}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield size={13} className={rl === "CRITICAL" || rl === "HIGH" ? "text-red-600" : rl === "MEDIUM" ? "text-amber-600" : "text-blue-600"} />
          <span className="text-xs font-bold text-gray-800">SEO Equity Shield</span>
          <span className="text-[10px] text-gray-500">v2.5.1</span>
        </div>
        <button onClick={onCancel} className="text-[10px] text-gray-400 hover:text-gray-600">Cancel</button>
      </div>

      {riskLoading ? (
        <div className="flex items-center gap-2 text-xs text-gray-500 py-3">
          <Loader2 size={12} className="animate-spin" />Scanning page SEO equity…
        </div>
      ) : riskProfile ? (
        <>
          {/* Risk score header */}
          <div className="flex items-center gap-3 flex-wrap">
            <RiskBadge level={riskProfile.risk_level} score={riskProfile.risk_score} />
            <span className="text-[11px] text-gray-500">{rec.url}</span>
          </div>

          {/* Metrics grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: "Organic Clicks", value: riskProfile.clicks_28d.toLocaleString(), sub: "28-day", color: "text-green-700" },
              { label: "Impressions", value: riskProfile.impressions_28d.toLocaleString(), sub: "28-day", color: "text-blue-700" },
              { label: "Top-10 Keywords", value: riskProfile.top10_keywords, sub: "in top 10", color: riskProfile.top10_keywords > 0 ? "text-amber-700" : "text-gray-500" },
              { label: "Est. Revenue/mo", value: `₹${Math.round(riskProfile.revenue_attribution_30d / 1000)}K`, sub: "at current traffic", color: "text-emerald-700" },
            ].map(({ label, value, sub, color }) => (
              <div key={label} className="bg-white rounded-lg border border-gray-200 px-3 py-2 text-center">
                <p className={`text-sm font-bold ${color}`}>{value}</p>
                <p className="text-[10px] text-gray-400 leading-tight">{label}</p>
                <p className="text-[9px] text-gray-300">{sub}</p>
              </div>
            ))}
          </div>

          {/* Backlinks row */}
          {(riskProfile.backlink_count > 0 || riskProfile.referring_domains > 0) && (
            <div className="flex items-start gap-2 bg-white border border-amber-200 rounded-lg px-3 py-2 text-[11px]">
              <AlertTriangle size={11} className="text-amber-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-amber-800">Backlink protection: </span>
                <span className="text-amber-700">
                  {riskProfile.backlink_count} backlink{riskProfile.backlink_count !== 1 ? "s" : ""}
                  {riskProfile.referring_domains > 0 ? ` from ${riskProfile.referring_domains} domain${riskProfile.referring_domains !== 1 ? "s" : ""}` : ""} point to this page.
                  Changes to this page affect these inbound links.
                </span>
              </div>
            </div>
          )}

          {/* Warnings */}
          {riskProfile.warnings.length > 0 && (
            <div className="space-y-1">
              {riskProfile.warnings.map((w, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[11px] text-gray-600">
                  <AlertCircle size={10} className="text-amber-500 shrink-0" />
                  {w}
                </div>
              ))}
            </div>
          )}

          {/* Risk-level specific approval controls */}
          <div className="border-t border-gray-200 pt-3 space-y-2">
            {rl === "LOW" && (
              <div className="flex items-start gap-2">
                <input type="checkbox" id="shield-low-confirm" checked={confirmed} onChange={e => onConfirmedChange(e.target.checked)}
                  className="mt-0.5 accent-brand-600" />
                <label htmlFor="shield-low-confirm" className="text-xs text-gray-700 cursor-pointer">
                  I confirm this change is safe to execute. Low-risk page — no significant traffic or backlinks.
                </label>
              </div>
            )}

            {rl === "MEDIUM" && (
              <div className="flex items-start gap-2">
                <input type="checkbox" id="shield-medium-confirm" checked={confirmed} onChange={e => onConfirmedChange(e.target.checked)}
                  className="mt-0.5 accent-amber-600" />
                <label htmlFor="shield-medium-confirm" className="text-xs text-amber-800 cursor-pointer font-medium">
                  Admin Override — I have reviewed the risk profile and approve this change as admin.
                </label>
              </div>
            )}

            {(rl === "HIGH" || rl === "CRITICAL") && (
              <div className="space-y-2">
                {rl === "CRITICAL" && (
                  <div className="bg-red-100 border border-red-300 rounded-lg px-3 py-2 text-[11px] text-red-800 font-semibold">
                    CRITICAL RISK — This page generates significant organic traffic, has top-10 keyword rankings, or has inbound backlinks.
                    Any SEO change carries high risk of ranking loss.
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <input type="checkbox" id="shield-founder-confirm" checked={founderApproved} onChange={e => onFounderChange(e.target.checked)}
                    className="mt-0.5 accent-red-600" />
                  <label htmlFor="shield-founder-confirm" className="text-xs text-red-800 cursor-pointer font-semibold">
                    Founder Approval — I confirm the Founder has explicitly approved this SEO change.
                  </label>
                </div>
                <div className="flex items-start gap-2">
                  <input type="checkbox" id="shield-high-confirm" checked={confirmed} onChange={e => onConfirmedChange(e.target.checked)}
                    className="mt-0.5 accent-red-600" />
                  <label htmlFor="shield-high-confirm" className="text-xs text-gray-700 cursor-pointer">
                    I understand this change may affect organic rankings, traffic, and revenue for this page.
                  </label>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={onConfirm}
                disabled={!canConfirm}
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-md disabled:opacity-40 ${
                  rl === "CRITICAL" || rl === "HIGH" ? "bg-red-600 text-white hover:bg-red-700"
                  : rl === "MEDIUM" ? "bg-amber-600 text-white hover:bg-amber-700"
                  : "bg-brand-600 text-white hover:bg-brand-700"
                }`}
              >
                {executing ? <Loader2 size={11} className="animate-spin" /> : <Zap size={11} />}
                {executing ? "Executing…" : "Confirm & Execute"}
              </button>
              <button onClick={onCancel} disabled={executing}
                className="px-3 py-1.5 text-xs text-gray-500 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40">
                Cancel
              </button>
              {!canConfirm && (
                <span className="text-[10px] text-gray-400">
                  {rl === "LOW" || rl === "MEDIUM" ? "Check the box above to proceed" : "Both checkboxes required"}
                </span>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="text-xs text-red-600 py-2">Could not load risk profile. Refresh and try again.</div>
      )}
    </div>
  )
}

// ─── Traffic Alert Banner ─────────────────────────────────────────────────────

function TrafficAlertBanner({ alerts, onRunMonitor, running }: { alerts: TrafficAlert[]; onRunMonitor: () => void; running: boolean }) {
  if (alerts.length === 0) return null
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Activity size={13} className="text-red-600" />
          <span className="text-xs font-bold text-red-800">Traffic Regression Alerts ({alerts.length})</span>
          <span className="text-[10px] text-red-600">Post-implementation monitoring</span>
        </div>
        <button onClick={onRunMonitor} disabled={running}
          className="inline-flex items-center gap-1 text-[10px] px-2.5 py-1 border border-red-300 text-red-700 rounded-md hover:bg-red-100 disabled:opacity-50">
          {running ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
          Run check
        </button>
      </div>
      {alerts.slice(0, 3).map(alert => (
        <div key={alert._id} className="flex items-start gap-2 text-[11px]">
          <AlertTriangle size={11} className="text-red-500 shrink-0 mt-0.5" />
          <div>
            <code className="text-red-700 font-mono">{alert.path}</code>
            <span className="text-red-600 ml-1">— {alert.message}</span>
            <span className="text-gray-500 ml-1 italic">{alert.suggestion}</span>
          </div>
        </div>
      ))}
      {alerts.length > 3 && <p className="text-[10px] text-red-500">+{alerts.length - 3} more alerts — see Execution Audit Log for details</p>}
    </div>
  )
}

// ─── SeoRecCard ───────────────────────────────────────────────────────────────

function SeoRecCard({ rec, actioning, executingId, rollingBackId, onAction, onExecute, onRollback }: {
  rec: SeoRec
  actioning: string | null
  executingId: string | null
  rollingBackId: string | null
  onAction: (id: string, status: string) => Promise<void>
  onExecute: (id: string, options?: { founder_approval?: boolean; admin_override?: boolean }) => Promise<void>
  onRollback: (id: string) => Promise<void>
}) {
  const [showPackage, setShowPackage] = useState(false)
  const [showSerp, setShowSerp] = useState(false)
  // Gate state (v2.5.1)
  const [showGate, setShowGate] = useState(false)
  const [riskProfile, setRiskProfile] = useState<RiskProfile | null>(null)
  const [riskLoading, setRiskLoading] = useState(false)
  const [gateConfirmed, setGateConfirmed] = useState(false)
  const [gateFounderApproved, setGateFounderApproved] = useState(false)

  const isActioning = actioning === rec._id
  const isExecuting = executingId === rec._id
  const isRollingBack = rollingBackId === rec._id
  const pkg = rec.implementation_package
  const canExecute = AUTO_EXEC_TYPES.has(rec.type)
  const canSerp = SERP_PREVIEW_TYPES.has(rec.type) && (pkg?.meta_title || pkg?.meta_description)
  const inProgress = rec.status === "executing" || rec.status === "validating"

  const openGate = async () => {
    setShowGate(true)
    setRiskProfile(null)
    setRiskLoading(true)
    setGateConfirmed(false)
    setGateFounderApproved(false)
    try {
      const d = await fetch(`/api/admin/growth/seo/risk-score?path=${encodeURIComponent(rec.url)}`).then(r => r.json())
      setRiskProfile(d.profile || null)
    } catch { /* ignore */ }
    setRiskLoading(false)
  }

  const closeGate = () => {
    setShowGate(false)
    setRiskProfile(null)
    setGateConfirmed(false)
    setGateFounderApproved(false)
  }

  const handleConfirmExecute = () => {
    const options: { founder_approval?: boolean; admin_override?: boolean } = {}
    const rl = riskProfile?.risk_level
    if (rl === "MEDIUM") options.admin_override = gateConfirmed
    if (rl === "HIGH" || rl === "CRITICAL") options.founder_approval = gateFounderApproved
    onExecute(rec._id, options)
    closeGate()
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* State machine stepper — shown for any non-pending/approved status */}
      {!["pending", "approved", "rejected", "deferred"].includes(rec.status) && (
        <StateStepper status={rec.status} />
      )}

      {/* Header */}
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${PRIORITY_COLOR_SEO[rec.priority]}`}>{rec.priority.toUpperCase()}</span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${REC_TYPE_COLOR[rec.type] || "bg-gray-50 text-gray-600 border-gray-200"}`}>
              {REC_TYPE_LABEL[rec.type] || rec.type}
            </span>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${STATUS_COLOR_SEO[rec.status] || "bg-gray-100 text-gray-600"}`}>
              {inProgress ? <span className="flex items-center gap-1"><Loader2 size={9} className="animate-spin" />{rec.status}</span> : rec.status}
            </span>
          </div>
          <div className="text-right shrink-0">
            <div className="text-base font-bold text-emerald-700">{INR_SEO(rec.expected_revenue_inr)}</div>
            <div className="text-[10px] text-gray-400">est. revenue</div>
          </div>
        </div>

        <h3 className="mt-2.5 text-sm font-semibold text-gray-900 leading-snug">{rec.title}</h3>
        <code className="text-[10px] text-gray-400 mt-0.5 block">{rec.url}</code>
        <p className="mt-2 text-xs text-gray-600">{rec.why}</p>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
          <div className="bg-gray-50 rounded px-3 py-2">
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mb-0.5">Current State</p>
            <p className="text-gray-700">{rec.current_state}</p>
          </div>
          <div className="bg-blue-50 rounded px-3 py-2">
            <p className="text-[10px] text-blue-500 font-semibold uppercase tracking-wide mb-0.5">Proposed Change</p>
            <p className="text-blue-800">{rec.proposed_change}</p>
          </div>
        </div>

        <div className="mt-2.5 flex flex-wrap gap-3 text-[11px] text-gray-500">
          <span>+{rec.expected_clicks} clicks/mo</span>
          <span>Conf: {rec.confidence}%</span>
          <span>Effort: {EFFORT_LABEL_SEO[rec.effort] || rec.effort}</span>
          <span className={`font-medium ${rec.difficulty === "easy" ? "text-green-600" : rec.difficulty === "medium" ? "text-amber-600" : "text-red-600"}`}>
            {rec.difficulty}
          </span>
          {rec.executed_at && <span className="text-gray-400">Executed: {new Date(rec.executed_at).toLocaleDateString("en-IN")}</span>}
          {rec.rolled_back_at && <span className="text-orange-500">Rolled back: {new Date(rec.rolled_back_at).toLocaleDateString("en-IN")}</span>}
          {rec.sanity_flags?.ctr_capped && (
            <span className="flex items-center gap-1 text-amber-600 font-medium">
              <AlertTriangle size={10} />Projection capped (CTR sanity)
            </span>
          )}
          {rec.sanity_flags?.review_required && (
            <span className="flex items-center gap-1 text-red-600 font-medium">
              <AlertTriangle size={10} />Revenue projection: review manually
            </span>
          )}
        </div>
      </div>

      {/* Validation result */}
      {rec.validation_result && !["pending", "approved"].includes(rec.status) && (
        <ValidationPanel result={rec.validation_result} />
      )}

      {/* SERP Preview toggle */}
      {canSerp && rec.status === "approved" && (
        <div className="border-t border-gray-100">
          <button
            onClick={() => setShowSerp(p => !p)}
            className="w-full flex items-center gap-1.5 px-5 py-2 text-xs text-gray-500 hover:bg-gray-50 hover:text-gray-700"
          >
            <Globe size={11} />SERP Preview
            {showSerp ? <ChevronUp size={10} className="ml-auto" /> : <ChevronDown size={10} className="ml-auto" />}
          </button>
          {showSerp && pkg && (
            <div className="px-5 pb-3">
              <SerpPreview
                url={rec.url}
                title={pkg.meta_title || rec.title}
                description={pkg.meta_description || rec.why}
              />
            </div>
          )}
        </div>
      )}

      {/* Implementation Package */}
      {pkg && (
        <div className="border-t border-gray-100">
          <button
            onClick={() => setShowPackage(p => !p)}
            className="w-full flex items-center gap-1.5 px-5 py-2 text-xs text-gray-500 hover:bg-gray-50 hover:text-gray-700"
          >
            <Target size={11} />Implementation Package
            {showPackage ? <ChevronUp size={10} className="ml-auto" /> : <ChevronDown size={10} className="ml-auto" />}
          </button>
          {showPackage && (
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 space-y-3">
              {pkg.meta_title && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Proposed Meta Title</p>
                  <code className="text-xs text-gray-800 bg-white border border-gray-200 rounded px-2 py-1.5 block">{pkg.meta_title}</code>
                  <span className={`text-[10px] ${pkg.meta_title.length > 60 ? "text-red-500" : "text-gray-400"}`}>{pkg.meta_title.length}/60 chars</span>
                </div>
              )}
              {pkg.meta_description && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Proposed Meta Description</p>
                  <code className="text-xs text-gray-800 bg-white border border-gray-200 rounded px-2 py-1.5 block">{pkg.meta_description}</code>
                  <span className={`text-[10px] ${pkg.meta_description.length > 160 ? "text-red-500" : "text-gray-400"}`}>{pkg.meta_description.length}/160 chars</span>
                </div>
              )}
              {pkg.schema_snippet && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Schema JSON-LD to Add</p>
                  <pre className="text-[10px] text-gray-700 bg-white border border-gray-200 rounded px-2 py-1.5 overflow-x-auto max-h-40">{pkg.schema_snippet}</pre>
                </div>
              )}
              {pkg.link_recommendations && pkg.link_recommendations.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Link Recommendations</p>
                  {pkg.link_recommendations.map((lr, i) => (
                    <div key={i} className="text-[11px] text-gray-700 flex items-center gap-1.5 mb-1">
                      <code className="text-gray-500">{lr.from}</code>
                      <span className="text-gray-300">→</span>
                      <span className="text-blue-600 font-medium">"{lr.anchor}"</span>
                      <span className="text-gray-300">→</span>
                      <code className="text-brand-600">{lr.to}</code>
                    </div>
                  ))}
                </div>
              )}
              {pkg.notes && <p className="text-[11px] text-gray-500 italic">{pkg.notes}</p>}
            </div>
          )}
        </div>
      )}

      {/* ── Action bar ── */}
      {rec.status === "pending" && (
        <div className="border-t border-gray-100 px-5 py-3 bg-gray-50 flex flex-wrap gap-2">
          <button onClick={() => onAction(rec._id, "approved")} disabled={isActioning}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50">
            <Check size={11} />Approve
          </button>
          <button onClick={() => onAction(rec._id, "deferred")} disabled={isActioning}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-white text-gray-600 rounded-md hover:bg-gray-100 border border-gray-300 disabled:opacity-50">
            <Pause size={11} />Defer
          </button>
          <button onClick={() => onAction(rec._id, "rejected")} disabled={isActioning}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-red-50 text-red-600 rounded-md hover:bg-red-100 border border-red-200 disabled:opacity-50">
            <XCircle size={11} />Reject
          </button>
        </div>
      )}

      {rec.status === "approved" && !showGate && (
        <div className="border-t border-gray-100 px-5 py-3 bg-blue-50 flex flex-wrap gap-2 items-center">
          {canExecute ? (
            <button onClick={openGate} disabled={isExecuting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-brand-600 text-white rounded-md hover:bg-brand-700 disabled:opacity-50">
              {isExecuting ? <Loader2 size={11} className="animate-spin" /> : <Zap size={11} />}
              {isExecuting ? "Executing…" : "Execute"}
            </button>
          ) : null}
          <button onClick={() => onAction(rec._id, "implemented")} disabled={isActioning}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-white text-gray-700 rounded-md hover:bg-gray-100 border border-gray-300 disabled:opacity-50">
            <CheckCircle2 size={11} />Mark Implemented
          </button>
          <span className="text-[10px] text-blue-500 ml-auto">
            {canExecute ? "Execute opens SEO Equity Shield — risk check before applying" : "Manual implementation required"}
          </span>
        </div>
      )}

      {rec.status === "approved" && showGate && (
        <SeoEquityShield
          rec={rec}
          riskProfile={riskProfile}
          riskLoading={riskLoading}
          confirmed={gateConfirmed}
          founderApproved={gateFounderApproved}
          onConfirmedChange={setGateConfirmed}
          onFounderChange={setGateFounderApproved}
          onConfirm={handleConfirmExecute}
          onCancel={closeGate}
          executing={isExecuting}
        />
      )}

      {rec.status === "implemented" && (
        <div className="border-t border-gray-100 px-5 py-3 bg-emerald-50 flex flex-wrap gap-2 items-center">
          <span className="flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
            <CheckCircle2 size={12} />Live in override store
          </span>
          <button onClick={() => onRollback(rec._id)} disabled={isRollingBack}
            className="ml-auto inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-white text-orange-600 rounded-md hover:bg-orange-50 border border-orange-200 disabled:opacity-50">
            {isRollingBack ? <Loader2 size={11} className="animate-spin" /> : <RotateCcw size={11} />}
            {isRollingBack ? "Rolling back…" : "Rollback"}
          </button>
        </div>
      )}

      {(rec.status === "failed" || rec.status === "rolled_back") && (
        <div className="border-t border-gray-100 px-5 py-3 bg-orange-50 flex flex-wrap gap-2 items-center">
          <span className="text-[11px] text-orange-700">
            {rec.status === "rolled_back" ? "Change rolled back — safe to re-approve with updated implementation package" : "Execution failed — review validation results above"}
          </span>
          <button onClick={() => onAction(rec._id, "approved")} disabled={isActioning}
            className="ml-auto inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-white text-blue-600 rounded-md hover:bg-blue-50 border border-blue-200 disabled:opacity-50">
            <RotateCcw size={11} />Re-approve
          </button>
        </div>
      )}
    </div>
  )
}

function SeoRecommendationsTab({ recs, loading, generating, result, actioning, executingId, rollingBackId, execResult, execLog, execLogLoading, showExecLog, trafficAlerts, runningMonitor, onGenerate, onAction, onExecute, onRollback, onRunMonitor, onToggleExecLog }: {
  recs: SeoRec[]
  loading: boolean
  generating: boolean
  result: string | null
  actioning: string | null
  executingId: string | null
  rollingBackId: string | null
  execResult: { id: string; ok: boolean; msg: string } | null
  execLog: ExecLogEntry[]
  execLogLoading: boolean
  showExecLog: boolean
  trafficAlerts: TrafficAlert[]
  runningMonitor: boolean
  onGenerate: () => void
  onAction: (id: string, status: string) => Promise<void>
  onExecute: (id: string, options?: { founder_approval?: boolean; admin_override?: boolean }) => Promise<void>
  onRollback: (id: string) => Promise<void>
  onRunMonitor: () => void
  onToggleExecLog: () => void
}) {
  const [statusFilter, setStatusFilter] = useState<"pending" | "approved" | "implemented" | "all">("pending")

  const filtered = statusFilter === "all" ? recs : recs.filter(r => r.status === statusFilter)
  const pendingCount = recs.filter(r => r.status === "pending").length
  const approvedCount = recs.filter(r => r.status === "approved").length
  const implementedCount = recs.filter(r => r.status === "implemented").length
  const rolledBackCount = recs.filter(r => r.status === "rolled_back" || r.status === "failed").length

  const totalExpectedRevenue = recs.filter(r => r.status === "pending").reduce((s, r) => s + r.expected_revenue_inr, 0)

  return (
    <div className="space-y-4">
      {/* Header strip */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <Target size={16} className="text-brand-600" />
            <h2 className="text-sm font-bold text-gray-900">SEO Recommendation Engine</h2>
            <span className="text-[10px] px-1.5 py-0.5 bg-brand-100 text-brand-700 rounded font-bold">v2.5.1</span>
          </div>
          <p className="text-[11px] text-gray-500 mt-0.5">Detect → Approve → Execute (SEO Equity Shield) → Validate → Implement — risk-gated execution</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-center">
            <p className="text-sm font-bold text-emerald-700">{INR_SEO(totalExpectedRevenue)}</p>
            <p className="text-[10px] text-gray-400">pending opportunity</p>
          </div>
          <button
            onClick={onGenerate}
            disabled={generating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50"
          >
            {generating ? <RefreshCw size={11} className="animate-spin" /> : <Zap size={11} />}
            {generating ? "Detecting…" : "Detect Opportunities"}
          </button>
        </div>
      </div>

      {result && (
        <div className={`text-xs px-4 py-2.5 rounded-lg border ${result.startsWith("Error") ? "bg-red-50 border-red-200 text-red-700" : "bg-green-50 border-green-200 text-green-700"}`}>
          {result}
        </div>
      )}

      {execResult && (
        <div className={`text-xs px-4 py-2.5 rounded-lg border flex items-start gap-2 ${execResult.ok ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"}`}>
          {execResult.ok ? <CheckCircle2 size={13} className="shrink-0 mt-0.5" /> : <XCircle size={13} className="shrink-0 mt-0.5" />}
          <span>{execResult.msg}</span>
        </div>
      )}

      {/* Traffic regression alerts */}
      <TrafficAlertBanner alerts={trafficAlerts} onRunMonitor={onRunMonitor} running={runningMonitor} />

      {/* SEO Preservation notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-[11px] text-amber-800">
        <strong>SEO Equity Protection v2.5.1:</strong> Risk-gated execution — LOW auto, MEDIUM needs admin, HIGH/CRITICAL needs Founder approval.
        Sanity engine validates projections. Traffic monitored 14 days post-implementation. No URL/redirect/canonical changes ever.
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 flex-wrap">
        {([
          { key: "pending",     label: `Pending (${pendingCount})` },
          { key: "approved",    label: `Approved (${approvedCount})` },
          { key: "implemented", label: `Implemented (${implementedCount})` },
          { key: "all",         label: `All (${recs.length})${rolledBackCount > 0 ? ` · ${rolledBackCount} failed/rolled-back` : ""}` },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${statusFilter === tab.key ? "bg-brand-600 text-white" : "bg-white text-gray-500 border border-gray-200 hover:text-gray-700"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Rec cards */}
      {loading ? (
        <div className="text-center py-10 text-gray-400 text-sm"><RefreshCw size={16} className="animate-spin mx-auto mb-2" />Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-200 p-10 text-center">
          <Target size={28} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">{recs.length === 0 ? 'No recommendations yet — click "Detect Opportunities" to scan GSC data' : `No ${statusFilter} recommendations`}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(rec => (
            <SeoRecCard
              key={rec._id}
              rec={rec}
              actioning={actioning}
              executingId={executingId}
              rollingBackId={rollingBackId}
              onAction={onAction}
              onExecute={onExecute}
              onRollback={onRollback}
            />
          ))}
        </div>
      )}

      {/* Traffic Monitor Panel */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 flex items-center gap-2 flex-wrap">
          <Activity size={13} className="text-gray-400" />
          <span className="text-xs font-semibold text-gray-700">Traffic Loss Protection</span>
          <span className="text-[10px] text-gray-400">14-day post-implementation monitoring</span>
          {trafficAlerts.length > 0 && (
            <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-semibold ml-1">{trafficAlerts.length} active alert{trafficAlerts.length !== 1 ? "s" : ""}</span>
          )}
          <button onClick={onRunMonitor} disabled={runningMonitor}
            className="ml-auto inline-flex items-center gap-1 text-[10px] px-2.5 py-1 border border-gray-300 text-gray-600 rounded-md hover:bg-gray-50 disabled:opacity-50">
            {runningMonitor ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
            Run monitor check
          </button>
        </div>
        {trafficAlerts.length === 0 && (
          <p className="px-5 pb-3 text-[11px] text-gray-400">No traffic regressions detected. Alerts appear here if clicks drop &gt;20% or position drops &gt;3 places after an implementation.</p>
        )}
      </div>

      {/* Execution Audit Log */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <button
          onClick={onToggleExecLog}
          className="w-full flex items-center gap-2 px-5 py-3 text-xs text-gray-600 hover:bg-gray-50"
        >
          <History size={13} className="text-gray-400" />
          <span className="font-semibold">Execution Audit Log</span>
          {execLog.length > 0 && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{execLog.length} entries</span>}
          {showExecLog ? <ChevronUp size={11} className="ml-auto text-gray-400" /> : <ChevronDown size={11} className="ml-auto text-gray-400" />}
        </button>
        {showExecLog && (
          <div className="border-t border-gray-100">
            {execLogLoading ? (
              <div className="flex items-center justify-center py-6 text-gray-400 text-xs gap-2">
                <Loader2 size={13} className="animate-spin" />Loading audit log…
              </div>
            ) : execLog.length === 0 ? (
              <p className="px-5 py-6 text-center text-xs text-gray-400">No execution history yet. Execute a recommendation to see the audit trail.</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {execLog.map(entry => (
                  <div key={entry._id} className="px-5 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${entry.status === "success" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                          {entry.action.toUpperCase()}
                        </span>
                        {entry.auto_rollback && <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">AUTO-ROLLBACK</span>}
                        {entry.manual_rollback && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">MANUAL-ROLLBACK</span>}
                        <span className="text-[11px] font-medium text-gray-700">{entry.rec_title || entry.rec_type}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`text-[10px] font-semibold ${entry.status === "success" ? "text-emerald-600" : "text-red-600"}`}>
                          {entry.final_status}
                        </span>
                        <p className="text-[10px] text-gray-400">{new Date(entry.executed_at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-400">
                      <Shield size={9} />
                      <code>{entry.path}</code>
                    </div>
                    {entry.validation_result && !entry.validation_result.pass && entry.validation_result.reason && (
                      <p className="text-[11px] text-red-600 mt-1">Reason: {entry.validation_result.reason}</p>
                    )}
                    {entry.risk_gate && (
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400">
                        <BarChart2 size={9} />
                        Risk gate: <span className={`font-semibold ${entry.risk_gate.risk_level === "CRITICAL" || entry.risk_gate.risk_level === "HIGH" ? "text-red-600" : entry.risk_gate.risk_level === "MEDIUM" ? "text-amber-600" : "text-green-600"}`}>{entry.risk_gate.risk_level}</span>
                        {entry.risk_gate.founder_approval && <span className="bg-orange-100 text-orange-700 px-1 py-0.5 rounded">FOUNDER APPROVED</span>}
                        {entry.risk_gate.admin_override && <span className="bg-blue-100 text-blue-700 px-1 py-0.5 rounded">ADMIN OVERRIDE</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
