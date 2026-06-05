"use client"
import { useEffect, useState, useCallback } from "react"
import {
  BarChart2, Users, TrendingUp, TrendingDown, RotateCw,
  RefreshCw, Info, Clock, MousePointerClick, Timer, Eye,
} from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────

interface SyncStatus {
  connected: boolean
  hasAnalyticsScope: boolean
  propertyId: string | null
  propertyName: string | null
  lastSync: { syncedAt: string } | null
}

interface Overview {
  syncedAt: string
  period: { startDate: string; endDate: string }
  activeUsers: number
  newUsers: number
  sessions: number
  engagementRate: number
  averageSessionDuration: number
  pageViews: number
  trends: {
    activeUsers: number | null
    sessions: number | null
    engagementRate: number | null
    averageSessionDuration: number | null
    pageViews: number | null
  }
}

interface LandingRow {
  landingPage: string
  sessions: number
  activeUsers: number
  bounceRate: number
  engagementRate: number
}

interface SourceRow {
  sessionDefaultChannelGrouping: string
  sessions: number
  activeUsers: number
  engagementRate: number
  conversions: number
  share: number
}

interface ConversionRow {
  eventName: string
  conversions: number
  totalUsers: number
}

type Tab = "overview" | "landing" | "sources" | "conversions"

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDuration(secs: number): string {
  if (secs < 60) return `${secs}s`
  return `${Math.floor(secs / 60)}m ${secs % 60}s`
}

function Trend({ v }: { v: number | null | undefined }) {
  if (v === null || v === undefined) return null
  const up = v >= 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${up ? "text-green-600" : "text-red-500"}`}>
      {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {up ? "+" : ""}{v}%
    </span>
  )
}

function KpiCard({ label, value, trend, icon: Icon, sub }: {
  label: string; value: string; trend?: number | null; icon: React.ElementType; sub?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{label}</p>
        <Icon size={14} className="text-gray-300" />
      </div>
      <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
      {trend !== undefined && trend !== null && (
        <div className="mt-1.5"><Trend v={trend} /></div>
      )}
    </div>
  )
}

function Bar({ value, max, color = "bg-brand-500" }: { value: number; max: number; color?: string }) {
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5">
      <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${Math.round((value / Math.max(max, 1)) * 100)}%` }} />
    </div>
  )
}

// ── Not-connected panel ───────────────────────────────────────────────────────

function NotReady({ status }: { status: SyncStatus | null }) {
  const href = !status?.connected
    ? "/admin/growth/seo/setup"
    : !status.hasAnalyticsScope || !status.propertyId
    ? "/admin/growth/analytics/setup"
    : "/admin/growth/analytics/setup"

  const msg = !status?.connected
    ? "Connect your Google account first."
    : !status.hasAnalyticsScope
    ? "Grant Analytics access — reconnect your Google account."
    : !status.propertyId
    ? "Select a GA4 property in setup, then run a sync."
    : "No sync data yet — run a sync first."

  return (
    <div className="bg-white rounded-xl border border-amber-200 p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <Info size={18} className="text-amber-500 shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-1">Analytics not ready</h3>
          <p className="text-xs text-gray-500 mb-4">{msg}</p>
          <a href={href} className="inline-flex items-center gap-1.5 text-xs bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700">
            Go to GA4 Setup →
          </a>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function GA4Dashboard() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [overview, setOverview] = useState<Overview | null>(null)
  const [landing, setLanding] = useState<LandingRow[]>([])
  const [sources, setSources] = useState<SourceRow[]>([])
  const [conversions, setConversions] = useState<ConversionRow[]>([])
  const [tab, setTab] = useState<Tab>("overview")
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const s = await fetch("/api/admin/ga4/sync").then(r => r.json()) as SyncStatus
    setSyncStatus(s)
    if (s.connected && s.hasAnalyticsScope && s.propertyId && s.lastSync) {
      const [ov, lp, sr, cv] = await Promise.allSettled([
        fetch("/api/admin/ga4/data?type=overview").then(r => r.json()),
        fetch("/api/admin/ga4/data?type=landing-pages").then(r => r.json()),
        fetch("/api/admin/ga4/data?type=sources").then(r => r.json()),
        fetch("/api/admin/ga4/data?type=conversions").then(r => r.json()),
      ])
      if (ov.status === "fulfilled" && !ov.value.error) setOverview(ov.value)
      if (lp.status === "fulfilled" && lp.value.rows) setLanding(lp.value.rows)
      if (sr.status === "fulfilled" && sr.value.rows) setSources(sr.value.rows)
      if (cv.status === "fulfilled" && cv.value.rows) setConversions(cv.value.rows)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const sync = async () => {
    setSyncing(true)
    setSyncError(null)
    const d = await fetch("/api/admin/ga4/sync", { method: "POST" }).then(r => r.json())
    if (!d.ok) setSyncError(d.errors?.join("; ") || d.message || "Sync failed")
    else await load()
    setSyncing(false)
  }

  const ready = syncStatus?.connected && syncStatus.hasAnalyticsScope && syncStatus.propertyId

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "landing", label: "Landing Pages" },
    { id: "sources", label: "Traffic Sources" },
    { id: "conversions", label: "Conversions" },
  ]

  const period = overview?.period
  const periodLabel = period
    ? `${period.startDate} → ${period.endDate}`
    : syncStatus?.lastSync
    ? `Last sync: ${new Date(syncStatus.lastSync.syncedAt).toLocaleDateString("en-IN")}`
    : null

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-5 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <BarChart2 size={17} className="text-brand-500" />
              GA4 Analytics
            </h1>
            <p className="text-gray-400 text-[11px] mt-0.5">
              {loading ? "Loading…"
                : !ready ? "Setup required"
                : syncStatus?.propertyName || syncStatus?.propertyId || ""}
              {periodLabel && !loading && ready && (
                <span className="ml-2 flex items-center gap-1 inline-flex">
                  <Clock size={9} />{periodLabel}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/admin/growth/analytics/setup"
              className="text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50"
            >
              Setup
            </a>
            {ready && (
              <button
                onClick={sync}
                disabled={syncing}
                className="flex items-center gap-1.5 text-xs bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 disabled:opacity-50"
              >
                {syncing ? <RotateCw size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                {syncing ? "Syncing…" : "Sync now"}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-8 py-6 max-w-[1100px] space-y-5">

        {syncError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs text-red-700">{syncError}</div>
        )}

        {!ready && !loading && <NotReady status={syncStatus} />}

        {ready && (
          <>
            {/* KPI cards */}
            {overview && (
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
                <KpiCard label="Active Users" value={overview.activeUsers.toLocaleString()} trend={overview.trends.activeUsers} icon={Users} />
                <KpiCard label="New Users" value={overview.newUsers.toLocaleString()} icon={Users} />
                <KpiCard label="Sessions" value={overview.sessions.toLocaleString()} trend={overview.trends.sessions} icon={BarChart2} />
                <KpiCard label="Engagement Rate" value={`${overview.engagementRate}%`} trend={overview.trends.engagementRate} icon={TrendingUp} />
                <KpiCard label="Avg Duration" value={fmtDuration(overview.averageSessionDuration)} trend={overview.trends.averageSessionDuration} icon={Timer} />
                <KpiCard label="Page Views" value={overview.pageViews.toLocaleString()} trend={overview.trends.pageViews} icon={Eye} />
              </div>
            )}

            {/* Tabs */}
            <div className="border-b border-gray-200 flex gap-0">
              {tabs.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                    tab === t.id
                      ? "border-brand-600 text-brand-600"
                      : "border-transparent text-gray-500 hover:text-gray-800"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab: Overview */}
            {tab === "overview" && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {!overview ? (
                  <div className="p-8 text-center text-sm text-gray-400">No overview data. Run a sync first.</div>
                ) : (
                  <div className="p-6">
                    <p className="text-xs text-gray-500 mb-4">
                      28-day window: <strong>{overview.period.startDate}</strong> → <strong>{overview.period.endDate}</strong>.
                      Trends compare to the prior 28-day period.
                    </p>
                    <div className="grid sm:grid-cols-2 gap-4">
                      {[
                        { label: "Active Users", value: overview.activeUsers, trend: overview.trends.activeUsers, fmt: (v: number) => v.toLocaleString() },
                        { label: "New Users", value: overview.newUsers, trend: null, fmt: (v: number) => v.toLocaleString() },
                        { label: "Sessions", value: overview.sessions, trend: overview.trends.sessions, fmt: (v: number) => v.toLocaleString() },
                        { label: "Engagement Rate", value: overview.engagementRate, trend: overview.trends.engagementRate, fmt: (v: number) => `${v}%` },
                        { label: "Avg Session Duration", value: overview.averageSessionDuration, trend: overview.trends.averageSessionDuration, fmt: fmtDuration },
                        { label: "Page Views", value: overview.pageViews, trend: overview.trends.pageViews, fmt: (v: number) => v.toLocaleString() },
                      ].map(({ label, value, trend, fmt }) => (
                        <div key={label} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                          <p className="text-xs text-gray-600">{label}</p>
                          <div className="flex items-center gap-3">
                            <Trend v={trend} />
                            <p className="text-sm font-semibold text-gray-900 w-24 text-right">{fmt(value)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Landing Pages */}
            {tab === "landing" && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {landing.length === 0 ? (
                  <div className="p-8 text-center text-sm text-gray-400">No landing page data. Run a sync first.</div>
                ) : (
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-500 w-full">Landing Page</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-500 whitespace-nowrap">Sessions</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-500 whitespace-nowrap">Users</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-500 whitespace-nowrap">Engagement</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-500 whitespace-nowrap">Bounce</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {landing.map((r, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 font-mono text-gray-700 max-w-xs truncate">{r.landingPage || "/"}</td>
                          <td className="px-4 py-2.5 text-right text-gray-800 font-medium">{r.sessions?.toLocaleString()}</td>
                          <td className="px-4 py-2.5 text-right text-gray-600">{r.activeUsers?.toLocaleString()}</td>
                          <td className="px-4 py-2.5 text-right text-gray-600">{Math.round((r.engagementRate ?? 0) * 1000) / 10}%</td>
                          <td className="px-4 py-2.5 text-right text-gray-600">{Math.round((r.bounceRate ?? 0) * 1000) / 10}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Tab: Traffic Sources */}
            {tab === "sources" && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {sources.length === 0 ? (
                  <div className="p-8 text-center text-sm text-gray-400">No traffic source data. Run a sync first.</div>
                ) : (
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-500">Channel</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-500">Sessions</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-500">Share</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-500">Users</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-500">Engagement</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-500">Conversions</th>
                        <th className="px-4 py-3 w-28"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {sources.map((r, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 font-medium text-gray-800">{r.sessionDefaultChannelGrouping || "Unknown"}</td>
                          <td className="px-4 py-2.5 text-right text-gray-800 font-medium">{r.sessions?.toLocaleString()}</td>
                          <td className="px-4 py-2.5 text-right text-gray-500">{r.share}%</td>
                          <td className="px-4 py-2.5 text-right text-gray-600">{r.activeUsers?.toLocaleString()}</td>
                          <td className="px-4 py-2.5 text-right text-gray-600">{Math.round((r.engagementRate ?? 0) * 1000) / 10}%</td>
                          <td className="px-4 py-2.5 text-right text-gray-600">{r.conversions?.toLocaleString()}</td>
                          <td className="px-4 py-2.5">
                            <Bar value={r.sessions} max={sources[0]?.sessions ?? 1} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Tab: Conversions */}
            {tab === "conversions" && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {conversions.length === 0 ? (
                  <div className="p-8 text-center">
                    <MousePointerClick size={24} className="text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400 mb-1">No conversion events found in this period.</p>
                    <p className="text-xs text-gray-400">To track conversions, mark events as conversions in your GA4 property: Admin → Events → toggle &quot;Mark as conversion&quot;.</p>
                  </div>
                ) : (
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-500 w-full">Event</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-500">Conversions</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-500">Total Users</th>
                        <th className="px-4 py-3 w-28"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {conversions.map((r, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 font-mono text-gray-700">{r.eventName}</td>
                          <td className="px-4 py-2.5 text-right font-semibold text-brand-600">{r.conversions?.toLocaleString()}</td>
                          <td className="px-4 py-2.5 text-right text-gray-600">{r.totalUsers?.toLocaleString()}</td>
                          <td className="px-4 py-2.5">
                            <Bar value={r.conversions} max={conversions[0]?.conversions ?? 1} color="bg-brand-500" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
