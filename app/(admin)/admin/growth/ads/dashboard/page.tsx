"use client"
import { useEffect, useState, useCallback } from "react"
import {
  Megaphone, RotateCw, RefreshCw, Info, Clock,
  TrendingUp, TrendingDown, DollarSign, MousePointerClick,
  Eye, Target, Zap,
} from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────

interface SyncStatus {
  connected: boolean
  hasAdsScope: boolean
  devTokenConfigured: boolean
  customerId: string | null
  customerName: string | null
  currencyCode: string
  lastSync: { syncedAt: string } | null
}

interface Overview {
  syncedAt: string
  spend: number; clicks: number; impressions: number; ctr: number
  avgCpc: number; conversions: number; costPerConversion: number
}

interface CampaignRow {
  campaignId: string; campaignName: string; status: string; channelType: string
  spend: number; clicks: number; impressions: number; ctr: number
  avgCpc: number; conversions: number; costPerConversion: number
}

interface KeywordRow {
  keyword: string; matchType: string; campaign: string; adGroup: string
  spend: number; clicks: number; impressions: number; ctr: number; avgCpc: number; conversions: number
}

interface SearchTermRow {
  searchTerm: string; status: string; campaign: string; adGroup: string
  spend: number; clicks: number; impressions: number; ctr: number; avgCpc: number; conversions: number
}

interface DeviceRow {
  device: string
  spend: number; clicks: number; impressions: number; ctr: number; avgCpc: number; conversions: number
}

interface LocationRow {
  countryCriterionId: string; locationType: string
  spend: number; clicks: number; impressions: number; conversions: number
}

interface ConversionRow {
  name: string; category: string; conversions: number; costPerConversion: number; allConversions: number
}

type Tab = "campaigns" | "keywords" | "search-terms" | "devices" | "locations" | "conversions"

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number, decimals = 0) { return n.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) }
function fmtCost(n: number, currency = "INR") { return `₹${fmt(n, 2)}` }

function MatchBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    EXACT: "bg-blue-100 text-blue-700",
    PHRASE: "bg-purple-100 text-purple-700",
    BROAD: "bg-gray-100 text-gray-600",
  }
  return <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${colors[type] || colors.BROAD}`}>{type}</span>
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ENABLED: "bg-green-100 text-green-700",
    PAUSED: "bg-amber-100 text-amber-700",
    REMOVED: "bg-red-100 text-red-600",
    ADDED: "bg-blue-100 text-blue-700",
    EXCLUDED: "bg-red-100 text-red-600",
  }
  return <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${colors[status] || "bg-gray-100 text-gray-500"}`}>{status}</span>
}

function Bar({ value, max }: { value: number; max: number }) {
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5">
      <div className="h-1.5 rounded-full bg-brand-500" style={{ width: `${Math.min(100, Math.round((value / Math.max(max, 0.01)) * 100))}%` }} />
    </div>
  )
}

function KpiCard({ label, value, sub, icon: Icon }: { label: string; value: string; sub?: string; icon: React.ElementType }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{label}</p>
        <Icon size={14} className="text-gray-300" />
      </div>
      <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function NotReady({ status }: { status: SyncStatus | null }) {
  const href = !status?.connected ? "/admin/growth/seo/setup"
    : !status.hasAdsScope || !status.devTokenConfigured || !status.customerId
    ? "/admin/growth/ads/setup"
    : "/admin/growth/ads/setup"
  const msg = !status?.connected ? "Connect your Google account first."
    : !status.hasAdsScope ? "Grant Ads access — reconnect your Google account."
    : !status.devTokenConfigured ? "Add GOOGLE_ADS_DEVELOPER_TOKEN in Vercel environment variables."
    : !status.customerId ? "Select a Google Ads account in setup, then run a sync."
    : "No sync data yet — run a sync first."
  return (
    <div className="bg-white rounded-xl border border-amber-200 p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <Info size={18} className="text-amber-500 shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-semibold text-gray-800 mb-1">Ads data not ready</h3>
          <p className="text-xs text-gray-500 mb-4">{msg}</p>
          <a href={href} className="inline-flex items-center gap-1.5 text-xs bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700">
            Go to Ads Setup →
          </a>
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdsDashboard() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)
  const [overview, setOverview] = useState<Overview | null>(null)
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([])
  const [keywords, setKeywords] = useState<KeywordRow[]>([])
  const [searchTerms, setSearchTerms] = useState<SearchTermRow[]>([])
  const [devices, setDevices] = useState<DeviceRow[]>([])
  const [locations, setLocations] = useState<LocationRow[]>([])
  const [conversions, setConversions] = useState<ConversionRow[]>([])
  const [tab, setTab] = useState<Tab>("campaigns")
  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const s = await fetch("/api/admin/ads/sync").then(r => r.json()) as SyncStatus
    setSyncStatus(s)
    if (s.connected && s.hasAdsScope && s.devTokenConfigured && s.customerId && s.lastSync) {
      const [ov, cp, kw, st, dv, lc, cv] = await Promise.allSettled([
        fetch("/api/admin/ads/data?type=overview").then(r => r.json()),
        fetch("/api/admin/ads/data?type=campaigns").then(r => r.json()),
        fetch("/api/admin/ads/data?type=keywords").then(r => r.json()),
        fetch("/api/admin/ads/data?type=search-terms").then(r => r.json()),
        fetch("/api/admin/ads/data?type=devices").then(r => r.json()),
        fetch("/api/admin/ads/data?type=locations").then(r => r.json()),
        fetch("/api/admin/ads/data?type=conversions").then(r => r.json()),
      ])
      if (ov.status === "fulfilled" && !ov.value.error) setOverview(ov.value)
      if (cp.status === "fulfilled" && cp.value.rows) setCampaigns(cp.value.rows)
      if (kw.status === "fulfilled" && kw.value.rows) setKeywords(kw.value.rows)
      if (st.status === "fulfilled" && st.value.rows) setSearchTerms(st.value.rows)
      if (dv.status === "fulfilled" && dv.value.rows) setDevices(dv.value.rows)
      if (lc.status === "fulfilled" && lc.value.rows) setLocations(lc.value.rows)
      if (cv.status === "fulfilled" && cv.value.rows) setConversions(cv.value.rows)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const sync = async () => {
    setSyncing(true); setSyncError(null)
    const d = await fetch("/api/admin/ads/sync", { method: "POST" }).then(r => r.json())
    if (!d.ok) setSyncError(d.errors?.join("; ") || d.message || "Sync failed")
    else await load()
    setSyncing(false)
  }

  const ready = syncStatus?.connected && syncStatus.hasAdsScope && syncStatus.devTokenConfigured && syncStatus.customerId
  const currency = syncStatus?.currencyCode || "INR"
  const tabs: { id: Tab; label: string }[] = [
    { id: "campaigns", label: "Campaigns" },
    { id: "keywords", label: "Keywords" },
    { id: "search-terms", label: "Search Terms" },
    { id: "devices", label: "Devices" },
    { id: "locations", label: "Locations" },
    { id: "conversions", label: "Conversions" },
  ]

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-5 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Megaphone size={17} className="text-brand-500" />
              Google Ads Dashboard
            </h1>
            <p className="text-gray-400 text-[11px] mt-0.5 flex items-center gap-1.5">
              {loading ? "Loading…"
                : !ready ? "Setup required"
                : syncStatus?.customerName || syncStatus?.customerId}
              {overview && !loading && (
                <span className="flex items-center gap-1"><Clock size={9} />Last 30 days</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a href="/admin/growth/ads/setup" className="text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50">Setup</a>
            <a href="/admin/growth/ads" className="text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50">Campaign Plan</a>
            {ready && (
              <button onClick={sync} disabled={syncing}
                className="flex items-center gap-1.5 text-xs bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 disabled:opacity-50">
                {syncing ? <RotateCw size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                {syncing ? "Syncing…" : "Sync now"}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-8 py-6 max-w-[1200px] space-y-5">

        {syncError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs text-red-700 font-mono">{syncError}</div>
        )}

        {!ready && !loading && <NotReady status={syncStatus} />}

        {ready && (
          <>
            {/* KPI cards */}
            {overview && (
              <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
                <KpiCard label="Spend" value={fmtCost(overview.spend, currency)} icon={DollarSign} />
                <KpiCard label="Clicks" value={fmt(overview.clicks)} icon={MousePointerClick} />
                <KpiCard label="Impressions" value={fmt(overview.impressions)} icon={Eye} />
                <KpiCard label="CTR" value={`${overview.ctr}%`} icon={TrendingUp} />
                <KpiCard label="Avg CPC" value={fmtCost(overview.avgCpc, currency)} icon={Zap} />
                <KpiCard label="Conversions" value={fmt(overview.conversions, 1)} icon={Target} />
                <KpiCard label="Cost / Conv" value={overview.conversions > 0 ? fmtCost(overview.costPerConversion, currency) : "—"} icon={DollarSign} />
              </div>
            )}

            {/* Tabs */}
            <div className="border-b border-gray-200 flex gap-0 overflow-x-auto">
              {tabs.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`px-4 py-2.5 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
                    tab === t.id ? "border-brand-600 text-brand-600" : "border-transparent text-gray-500 hover:text-gray-800"
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Campaigns */}
            {tab === "campaigns" && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
                {campaigns.length === 0
                  ? <div className="p-8 text-center text-sm text-gray-400">No campaign data. Run a sync first.</div>
                  : <table className="w-full text-xs min-w-[800px]">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-500">Campaign</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-500">Status</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-500">Spend</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-500">Clicks</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-500">Impr.</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-500">CTR</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-500">Avg CPC</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-500">Conv.</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-500">Cost/Conv</th>
                        <th className="px-4 py-3 w-24"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {campaigns.map((c, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 font-medium text-gray-800 max-w-[200px] truncate">{c.campaignName}</td>
                          <td className="px-4 py-2.5"><StatusBadge status={c.status} /></td>
                          <td className="px-4 py-2.5 text-right font-medium text-gray-800">{fmtCost(c.spend, currency)}</td>
                          <td className="px-4 py-2.5 text-right text-gray-700">{fmt(c.clicks)}</td>
                          <td className="px-4 py-2.5 text-right text-gray-500">{fmt(c.impressions)}</td>
                          <td className="px-4 py-2.5 text-right text-gray-600">{c.ctr}%</td>
                          <td className="px-4 py-2.5 text-right text-gray-600">{fmtCost(c.avgCpc, currency)}</td>
                          <td className="px-4 py-2.5 text-right text-brand-600 font-medium">{c.conversions}</td>
                          <td className="px-4 py-2.5 text-right text-gray-500">{c.conversions > 0 ? fmtCost(c.costPerConversion, currency) : "—"}</td>
                          <td className="px-4 py-2.5"><Bar value={c.spend} max={campaigns[0]?.spend ?? 1} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>}
              </div>
            )}

            {/* Keywords */}
            {tab === "keywords" && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
                {keywords.length === 0
                  ? <div className="p-8 text-center text-sm text-gray-400">No keyword data. Run a sync first.</div>
                  : <table className="w-full text-xs min-w-[900px]">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-500">Keyword</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-500">Match</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-500">Campaign</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-500">Clicks</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-500">Impr.</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-500">CTR</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-500">Avg CPC</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-500">Spend</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-500">Conv.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {keywords.map((k, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 font-mono text-gray-800">{k.keyword}</td>
                          <td className="px-4 py-2.5"><MatchBadge type={k.matchType} /></td>
                          <td className="px-4 py-2.5 text-gray-500 max-w-[160px] truncate">{k.campaign}</td>
                          <td className="px-4 py-2.5 text-right font-medium text-gray-800">{fmt(k.clicks)}</td>
                          <td className="px-4 py-2.5 text-right text-gray-500">{fmt(k.impressions)}</td>
                          <td className="px-4 py-2.5 text-right text-gray-600">{k.ctr}%</td>
                          <td className="px-4 py-2.5 text-right text-gray-600">{fmtCost(k.avgCpc, currency)}</td>
                          <td className="px-4 py-2.5 text-right text-gray-700">{fmtCost(k.spend, currency)}</td>
                          <td className="px-4 py-2.5 text-right text-brand-600">{k.conversions}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>}
              </div>
            )}

            {/* Search Terms */}
            {tab === "search-terms" && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
                {searchTerms.length === 0
                  ? <div className="p-8 text-center text-sm text-gray-400">No search term data. Run a sync first.</div>
                  : <table className="w-full text-xs min-w-[900px]">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-500">Search Term</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-500">Status</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-500">Campaign</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-500">Clicks</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-500">Impr.</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-500">CTR</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-500">Avg CPC</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-500">Spend</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-500">Conv.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {searchTerms.map((s, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 font-mono text-gray-800">{s.searchTerm}</td>
                          <td className="px-4 py-2.5"><StatusBadge status={s.status} /></td>
                          <td className="px-4 py-2.5 text-gray-500 max-w-[160px] truncate">{s.campaign}</td>
                          <td className="px-4 py-2.5 text-right font-medium text-gray-800">{fmt(s.clicks)}</td>
                          <td className="px-4 py-2.5 text-right text-gray-500">{fmt(s.impressions)}</td>
                          <td className="px-4 py-2.5 text-right text-gray-600">{s.ctr}%</td>
                          <td className="px-4 py-2.5 text-right text-gray-600">{fmtCost(s.avgCpc, currency)}</td>
                          <td className="px-4 py-2.5 text-right text-gray-700">{fmtCost(s.spend, currency)}</td>
                          <td className="px-4 py-2.5 text-right text-brand-600">{s.conversions}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>}
              </div>
            )}

            {/* Devices */}
            {tab === "devices" && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {devices.length === 0
                  ? <div className="p-8 text-center text-sm text-gray-400">No device data. Run a sync first.</div>
                  : <table className="w-full text-xs">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-500">Device</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-500">Spend</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-500">Clicks</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-500">Impressions</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-500">CTR</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-500">Avg CPC</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-500">Conv.</th>
                        <th className="px-4 py-3 w-28"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {devices.map((d, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 font-medium text-gray-800 capitalize">{d.device?.replace(/_/g, " ").toLowerCase()}</td>
                          <td className="px-4 py-2.5 text-right font-medium text-gray-800">{fmtCost(d.spend, currency)}</td>
                          <td className="px-4 py-2.5 text-right text-gray-700">{fmt(d.clicks)}</td>
                          <td className="px-4 py-2.5 text-right text-gray-500">{fmt(d.impressions)}</td>
                          <td className="px-4 py-2.5 text-right text-gray-600">{d.ctr}%</td>
                          <td className="px-4 py-2.5 text-right text-gray-600">{fmtCost(d.avgCpc, currency)}</td>
                          <td className="px-4 py-2.5 text-right text-brand-600">{d.conversions}</td>
                          <td className="px-4 py-2.5"><Bar value={d.spend} max={devices[0]?.spend ?? 1} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>}
              </div>
            )}

            {/* Locations */}
            {tab === "locations" && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {locations.length === 0
                  ? <div className="p-8 text-center text-sm text-gray-400">No location data. Run a sync first.</div>
                  : <table className="w-full text-xs">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-500">Location</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-500">Type</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-500">Spend</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-500">Clicks</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-500">Impressions</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-500">Conv.</th>
                        <th className="px-4 py-3 w-28"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {locations.map((l, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 font-mono text-gray-700">{l.countryCriterionId || "Unknown"}</td>
                          <td className="px-4 py-2.5 text-gray-500 capitalize">{l.locationType?.toLowerCase()}</td>
                          <td className="px-4 py-2.5 text-right font-medium text-gray-800">{fmtCost(l.spend, currency)}</td>
                          <td className="px-4 py-2.5 text-right text-gray-700">{fmt(l.clicks)}</td>
                          <td className="px-4 py-2.5 text-right text-gray-500">{fmt(l.impressions)}</td>
                          <td className="px-4 py-2.5 text-right text-brand-600">{l.conversions}</td>
                          <td className="px-4 py-2.5"><Bar value={l.spend} max={locations[0]?.spend ?? 1} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>}
              </div>
            )}

            {/* Conversions */}
            {tab === "conversions" && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {conversions.length === 0
                  ? <div className="p-8 text-center">
                      <Target size={24} className="text-gray-200 mx-auto mb-2" />
                      <p className="text-sm text-gray-400 mb-1">No conversion events found in this period.</p>
                      <p className="text-xs text-gray-400">Set up conversion tracking in Google Ads → Tools → Conversions.</p>
                    </div>
                  : <table className="w-full text-xs">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-gray-500 w-full">Conversion Action</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-500">Category</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-500">Conversions</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-500">All Conv.</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-500">Cost / Conv.</th>
                        <th className="px-4 py-3 w-28"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {conversions.map((c, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 font-medium text-gray-800">{c.name}</td>
                          <td className="px-4 py-2.5 text-gray-500 capitalize text-[10px]">{c.category?.toLowerCase().replace(/_/g, " ")}</td>
                          <td className="px-4 py-2.5 text-right font-semibold text-brand-600">{c.conversions}</td>
                          <td className="px-4 py-2.5 text-right text-gray-600">{c.allConversions}</td>
                          <td className="px-4 py-2.5 text-right text-gray-600">{c.costPerConversion > 0 ? fmtCost(c.costPerConversion, currency) : "—"}</td>
                          <td className="px-4 py-2.5"><Bar value={c.conversions} max={conversions[0]?.conversions ?? 1} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
