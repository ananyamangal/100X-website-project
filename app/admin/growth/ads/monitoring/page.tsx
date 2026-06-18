"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Activity, BarChart3, TrendingUp, RefreshCw, Zap, Target,
  DollarSign, Eye, MousePointer, Lightbulb, CheckCircle,
  AlertTriangle, XCircle, Search, ArrowLeft,
} from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────

interface TopKeyword {
  text: string; matchType: string
  impressions: number; clicks: number; cost: number; conversions: number
}

interface TopSearchTerm {
  term: string
  impressions: number; clicks: number; conversions: number; cost: number
}

interface CampaignMetrics {
  campaignId: string; campaignName: string
  syncedAt: string; dateRange: string; googleStatus: string
  impressions: number; clicks: number; ctr: number; ctrRaw: number
  averageCpc: number; cost: number; costToday: number
  conversions: number; conversionsValue: number; costPerConversion: number
  searchImpressionShare: number
  topKeywords: TopKeyword[]; topSearchTerms: TopSearchTerm[]
}

interface Recommendation {
  campaignId: string; campaignName: string
  type: string; priority: "high" | "medium" | "low"
  title: string; description: string
  metric: string; threshold: string; dataPoints: string[]
  status: string; generatedAt: string
}

interface MonitoringData {
  ok: boolean
  metrics: CampaignMetrics[]
  recommendations: Recommendation[]
}

// ── CTR traffic light ─────────────────────────────────────────────────────────

type CtrHealth = "green" | "yellow" | "red"

function ctrHealth(ctr: number): CtrHealth {
  if (ctr > 5)  return "green"
  if (ctr >= 2) return "yellow"
  return "red"
}

const CTR_CFG: Record<CtrHealth, { label: string; glow: string; bg: string; text: string; border: string; dot: string }> = {
  green:  { label: "Healthy",  glow: "shadow-[0_0_12px_#10b981]", bg: "bg-emerald-950/30", text: "text-emerald-400", border: "border-emerald-800/50", dot: "bg-emerald-400" },
  yellow: { label: "Monitor",  glow: "shadow-[0_0_12px_#f59e0b]", bg: "bg-amber-950/30",   text: "text-amber-400",   border: "border-amber-800/50",   dot: "bg-amber-400"   },
  red:    { label: "Critical", glow: "shadow-[0_0_12px_#ef4444]", bg: "bg-red-950/30",     text: "text-red-400",     border: "border-red-800/50",     dot: "bg-red-400"     },
}

const PRIORITY_CFG: Record<string, { bg: string; text: string; border: string }> = {
  high:   { bg: "bg-red-950/30",     text: "text-red-400",     border: "border-red-800/40"   },
  medium: { bg: "bg-amber-950/30",   text: "text-amber-400",   border: "border-amber-800/40" },
  low:    { bg: "bg-blue-950/30",    text: "text-blue-400",    border: "border-blue-800/40"  },
}

// ── Small components ──────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon: Icon, warn }: {
  label: string; value: string; sub?: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  warn?: boolean
}) {
  return (
    <div className={`bg-gray-900 border rounded-xl p-4 ${warn ? "border-amber-800/50" : "border-gray-800"}`}>
      <div className="flex items-center gap-1.5 mb-2">
        <Icon size={11} className="text-gray-600" />
        <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">{label}</p>
      </div>
      <p className={`text-xl font-black ${warn ? "text-amber-400" : "text-white"}`}>{value}</p>
      {sub && <p className="text-[10px] text-gray-600 mt-0.5">{sub}</p>}
    </div>
  )
}

function MatchBadge({ type }: { type: string }) {
  const t = type.toUpperCase()
  const cls =
    t === "EXACT"  ? "bg-emerald-900/30 text-emerald-400 border-emerald-800/40" :
    t === "PHRASE" ? "bg-blue-900/30 text-blue-400 border-blue-800/40" :
                     "bg-gray-800 text-gray-500 border-gray-700"
  return (
    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border flex-shrink-0 ${cls}`}>
      {t === "EXACT" ? "[e]" : t === "PHRASE" ? '"p"' : "+b"}
    </span>
  )
}

function MsgBar({ msg }: { msg: { type: "ok" | "error" | "warn"; text: string } }) {
  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border text-sm ${
      msg.type === "error" ? "bg-red-950/20 border-red-800/50 text-red-400"     :
      msg.type === "warn"  ? "bg-amber-950/20 border-amber-800/50 text-amber-400" :
                             "bg-emerald-950/20 border-emerald-800/50 text-emerald-400"
    }`}>
      {msg.type === "ok"   ? <CheckCircle  size={15} className="flex-shrink-0 mt-0.5" /> :
       msg.type === "warn" ? <AlertTriangle size={15} className="flex-shrink-0 mt-0.5" /> :
                             <XCircle       size={15} className="flex-shrink-0 mt-0.5" />}
      {msg.text}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdsMonitoringPage() {
  const [data,     setData]     = useState<MonitoringData | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [syncing,  setSyncing]  = useState(false)
  const [msg,      setMsg]      = useState<{ type: "ok" | "error" | "warn"; text: string } | null>(null)
  const [selected, setSelected] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/growth/ads/monitoring")
      const d   = await res.json() as MonitoringData
      setData(d)
      if (d.metrics?.length && !selected) setSelected(d.metrics[0].campaignId)
    } catch (e) {
      setMsg({ type: "error", text: `Load error: ${String(e)}` })
    } finally {
      setLoading(false)
    }
  }, [selected])

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const sync = async () => {
    setSyncing(true)
    setMsg(null)
    try {
      const res = await fetch("/api/admin/growth/ads/monitoring", { method: "POST" })
      const d   = await res.json() as {
        ok?: boolean; error?: string; note?: string
        syncedCampaigns?: string[]; recommendationsGenerated?: number
      }
      if (d.error) {
        setMsg({ type: "error", text: d.error })
      } else if (d.note) {
        setMsg({ type: "warn", text: d.note })
      } else {
        setMsg({ type: "ok", text: `Synced ${d.syncedCampaigns?.length ?? 0} campaign(s). ${d.recommendationsGenerated ?? 0} recommendation(s) generated.` })
        await load()
      }
    } catch (e) {
      setMsg({ type: "error", text: String(e) })
    } finally {
      setSyncing(false)
    }
  }

  const campaign    = data?.metrics.find((m) => m.campaignId === selected) ?? data?.metrics[0] ?? null
  const health      = campaign ? ctrHealth(campaign.ctr) : "red"
  const cfg         = CTR_CFG[health]
  const campaignRecs = data?.recommendations.filter((r) => r.campaignId === campaign?.campaignId) ?? []
  const highCount   = campaignRecs.filter((r) => r.priority === "high").length

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <a href="/admin/growth/ads" className="text-gray-600 hover:text-gray-400 mr-1">
                <ArrowLeft size={14} />
              </a>
              <Activity size={18} className="text-emerald-400" />
              <h1 className="text-xl font-bold">Campaign Monitoring</h1>
            </div>
            <p className="text-gray-500 text-sm">
              Last 30 days · CTR traffic light (
              <span className="text-emerald-400">Green &gt;5%</span> ·{" "}
              <span className="text-amber-400">Yellow 2–5%</span> ·{" "}
              <span className="text-red-400">Red &lt;2%</span>
              ) · auto recommendations
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="p-2 text-gray-600 hover:text-gray-300 border border-gray-800 rounded-lg" title="Reload stored data">
              <RefreshCw size={13} />
            </button>
            <button
              onClick={sync}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-sm rounded-lg disabled:opacity-50 font-medium transition-colors"
            >
              {syncing ? <RefreshCw size={13} className="animate-spin" /> : <Zap size={13} />}
              {syncing ? "Syncing…" : "Sync from Google Ads"}
            </button>
          </div>
        </div>

        {/* Message */}
        {msg && <MsgBar msg={msg} />}

        {/* Loading */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-28 bg-gray-900 rounded-xl animate-pulse" />)}
          </div>
        )}

        {/* Empty state */}
        {!loading && !campaign && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-16 text-center">
            <Activity size={36} className="text-gray-700 mx-auto mb-4" />
            <p className="text-gray-400 text-sm font-medium">No monitoring data yet</p>
            <p className="text-gray-600 text-xs mt-1.5 max-w-sm mx-auto">
              Deploy a campaign via Campaign Factory, then click "Sync from Google Ads" to pull performance metrics.
            </p>
            <button
              onClick={sync}
              disabled={syncing}
              className="mt-6 mx-auto flex items-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white text-sm rounded-lg disabled:opacity-50 font-medium"
            >
              <Zap size={13} />
              Try Sync Now
            </button>
          </div>
        )}

        {/* Campaign selector tabs */}
        {!loading && data && data.metrics.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            {data.metrics.map((m) => (
              <button
                key={m.campaignId}
                onClick={() => setSelected(m.campaignId)}
                className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                  m.campaignId === selected
                    ? "bg-brand-600/20 border-brand-600/40 text-brand-300"
                    : "border-gray-800 text-gray-500 hover:text-gray-300 hover:border-gray-700"
                }`}
              >
                {m.campaignName}
              </button>
            ))}
          </div>
        )}

        {/* Campaign detail */}
        {!loading && campaign && (
          <div className="space-y-4">

            {/* CTR health banner */}
            <div className={`flex items-center gap-4 p-5 rounded-xl border ${cfg.bg} ${cfg.border}`}>
              <div className={`w-4 h-4 rounded-full flex-shrink-0 ${cfg.dot} ${cfg.glow}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <p className={`font-bold ${cfg.text}`}>{cfg.label} — CTR {campaign.ctr}%</p>
                  {highCount > 0 && (
                    <span className="text-[10px] bg-red-900/40 text-red-400 border border-red-800/50 px-2 py-0.5 rounded-full font-semibold">
                      {highCount} HIGH-priority rec{highCount > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <p className={`text-xs truncate ${cfg.text} opacity-60`}>
                  {campaign.campaignName} · {campaign.googleStatus} · Synced {new Date(campaign.syncedAt).toLocaleString("en-IN")}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className={`text-3xl font-black ${cfg.text}`}>{campaign.ctr}%</p>
                <p className="text-[10px] text-gray-600">CTR · target &gt;5%</p>
              </div>
            </div>

            {/* KPI grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KpiCard label="Impressions"      value={campaign.impressions.toLocaleString("en-IN")}                     icon={Eye} />
              <KpiCard label="Clicks"           value={campaign.clicks.toLocaleString("en-IN")}                          icon={MousePointer} />
              <KpiCard label="CTR"              value={`${campaign.ctr}%`}                                               icon={TrendingUp}  warn={health !== "green"} sub={`Target >5%${health === "red" ? " ⚠" : ""}`} />
              <KpiCard label="Avg CPC"          value={`₹${campaign.averageCpc.toFixed(2)}`}                             icon={Target} />
              <KpiCard label="30-day Spend"     value={`₹${campaign.cost.toLocaleString("en-IN")}`}                     icon={DollarSign}  sub={campaign.costToday > 0 ? `Today: ₹${campaign.costToday.toFixed(2)}` : "Today: ₹0"} />
              <KpiCard label="Conversions"      value={String(campaign.conversions)}                                      icon={CheckCircle} sub={campaign.conversionsValue > 0 ? `Value: ₹${campaign.conversionsValue.toLocaleString("en-IN")}` : undefined} />
              <KpiCard label="CPA"              value={campaign.costPerConversion > 0 ? `₹${campaign.costPerConversion.toLocaleString("en-IN")}` : "—"} icon={BarChart3}   sub="Target: <₹2,000" />
              <KpiCard label="Impression Share" value={campaign.searchImpressionShare > 0 ? `${campaign.searchImpressionShare}%` : "—"}              icon={Search}      sub="Target: >50%" />
            </div>

            {/* Keywords + Search Terms */}
            <div className="grid lg:grid-cols-2 gap-4">

              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Top Keywords (30d)</p>
                  <p className="text-[10px] text-gray-600">by impressions</p>
                </div>
                {campaign.topKeywords.length === 0 ? (
                  <p className="px-5 py-8 text-center text-gray-600 text-xs">No keyword data yet</p>
                ) : (
                  <div className="divide-y divide-gray-800/60">
                    {campaign.topKeywords.slice(0, 12).map((kw, i) => (
                      <div key={i} className="px-5 py-2.5 flex items-center gap-2.5">
                        <MatchBadge type={kw.matchType} />
                        <p className="text-xs text-white flex-1 truncate">{kw.text}</p>
                        <div className="flex items-center gap-3 text-[10px] flex-shrink-0">
                          <span className="text-gray-500">{kw.impressions.toLocaleString("en-IN")}<span className="text-gray-700 ml-0.5">imp</span></span>
                          <span className="text-gray-500">{kw.clicks}<span className="text-gray-700 ml-0.5">clk</span></span>
                          {kw.conversions > 0 && (
                            <span className="text-emerald-400 font-semibold">{kw.conversions.toFixed(1)}<span className="text-emerald-700 ml-0.5 font-normal">cv</span></span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Search Terms (30d)</p>
                  <p className="text-[10px] text-gray-600">by conversions · then clicks</p>
                </div>
                {campaign.topSearchTerms.length === 0 ? (
                  <p className="px-5 py-8 text-center text-gray-600 text-xs">No search-term data yet (requires spend)</p>
                ) : (
                  <div className="divide-y divide-gray-800/60">
                    {campaign.topSearchTerms.slice(0, 12).map((st, i) => (
                      <div key={i} className="px-5 py-2.5 flex items-center gap-2.5">
                        <Search size={10} className="text-gray-700 flex-shrink-0" />
                        <p className="text-xs text-gray-300 flex-1 truncate">{st.term}</p>
                        <div className="flex items-center gap-3 text-[10px] flex-shrink-0">
                          <span className="text-gray-500">{st.clicks}<span className="text-gray-700 ml-0.5">clk</span></span>
                          {st.conversions > 0
                            ? <span className="text-emerald-400 font-semibold">{st.conversions.toFixed(1)}<span className="text-emerald-700 ml-0.5 font-normal">cv</span></span>
                            : <span className="text-red-500 text-[10px]">0 cv</span>
                          }
                          <span className="text-gray-600">₹{st.cost.toFixed(0)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recommendations */}
            {campaignRecs.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lightbulb size={13} className="text-amber-400" />
                    <p className="text-[11px] font-semibold text-gray-300 uppercase tracking-wider">Auto Recommendations</p>
                  </div>
                  <p className="text-[10px] text-gray-600">{campaignRecs.length} pending review · approve in Director</p>
                </div>
                <div className="divide-y divide-gray-800/60">
                  {campaignRecs.map((rec, i) => {
                    const p = PRIORITY_CFG[rec.priority] ?? PRIORITY_CFG.medium
                    return (
                      <div key={i} className="px-5 py-4">
                        <div className="flex items-start gap-3">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 mt-0.5 ${p.bg} ${p.text} ${p.border}`}>
                            {rec.priority.toUpperCase()}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white mb-0.5">{rec.title}</p>
                            <p className="text-xs text-gray-500 mb-2 leading-relaxed">{rec.description}</p>
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                              <span className="text-[10px] bg-gray-800 border border-gray-700 text-gray-400 px-2 py-0.5 rounded">{rec.metric}</span>
                              <span className="text-[10px] text-gray-600">vs {rec.threshold}</span>
                            </div>
                            {rec.dataPoints.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {rec.dataPoints.map((dp, j) => (
                                  <span key={j} className="text-[10px] text-gray-500 bg-gray-800/50 px-2 py-0.5 rounded">{dp}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="px-5 py-3 border-t border-gray-800 bg-gray-900/50">
                  <a
                    href="/admin/growth/ads/director"
                    className="text-[11px] text-gray-400 hover:text-white flex items-center gap-1.5 w-fit"
                  >
                    Review and approve in Ads Director →
                  </a>
                </div>
              </div>
            )}

            {/* No recs yet */}
            {!loading && campaignRecs.length === 0 && campaign && campaign.impressions > 0 && (
              <p className="text-center text-xs text-gray-700 py-2">No recommendations generated yet — sync more data to surface optimization opportunities.</p>
            )}

          </div>
        )}
      </div>
    </div>
  )
}
