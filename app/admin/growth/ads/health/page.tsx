"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Activity, CheckCircle, XCircle, AlertTriangle, RefreshCw,
  Key, User, BarChart3, Zap, Globe, ChevronDown, ChevronUp,
  RotateCcw, Rocket, Target, Type, Shield, ExternalLink,
  ArrowRight, Layers, Link2,
} from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────

interface TokenStatus { configured: boolean; note: string }
interface OAuthStatus { appConfigured: boolean; connected: boolean; hasAdsScope: boolean; email: string | null; connectedAt: string | null; ok: boolean }
interface CustomerStatus { configured: boolean; customerId: string | null; customerName: string | null; savedAt: string | null }

interface ConversionAction {
  name: string; conversionLabel: string; labelConfigured: boolean
  googleAdsId: string | null; isRevenue: boolean
}
interface ConversionStatus {
  awConversionId: string; awConversionIdConfigured: boolean
  allLabelsConfigured: boolean; configuredCount: number; totalCount: number
  lastSyncedAt: string | null; actions: ConversionAction[]; ok: boolean
}

interface Keyword { text: string; matchType: string; rationale?: string; confidence?: number }
interface RSA { headlines: string[]; descriptions: string[]; callouts?: string[] }
interface AdGroup { name: string; theme?: string; landingPage: string; keywords: Keyword[]; rsa: RSA }
interface Negative { text: string; matchType?: string }

interface Campaign {
  planId: string; deploymentId: string | null; campaignName: string; status: string
  simulated: boolean; createdAt: string
  qualityScores: { deploymentConfidence: number; recommendation: string }
  googleCampaignId: string | null; campaignResourceName: string | null
  googleState: string | null; googleStatus: string | null
  liveGoogleStatus: string | null
  adGroupCount: number; keywordCount: number; negativeCount: number
  headlineCount: number; sitelinkCount: number; calloutCount: number
  adGroups: AdGroup[]; campaignNegatives: Negative[]
  resourceNames: Record<string, unknown> | null
}

interface DeploymentStatus {
  total: number; active: number; paused: number; pending: number; rolled: number
  campaigns: Campaign[]
}

interface HealthData {
  overallHealthy: boolean; checkedAt: string
  developerToken: TokenStatus; oauth: OAuthStatus; customer: CustomerStatus
  conversionTracking: ConversionStatus; deployment: DeploymentStatus
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function StatusLight({ ok, partial }: { ok: boolean; partial?: boolean }) {
  if (ok) return <CheckCircle size={16} className="text-emerald-400 flex-shrink-0" />
  if (partial) return <AlertTriangle size={16} className="text-amber-400 flex-shrink-0" />
  return <XCircle size={16} className="text-red-400 flex-shrink-0" />
}

function CampaignStatusBadge({ campaign }: { campaign: Campaign }) {
  const live = campaign.liveGoogleStatus
  const db   = campaign.status

  const label =
    live === "ENABLED" ? "ENABLED" :
    live === "PAUSED"  ? "PAUSED"  :
    db === "pending_approval" ? "Pending" :
    db === "approved"  ? "Approved" :
    db === "rejected"  ? "Rejected" :
    db === "approved_simulated" ? "Simulated" :
    db === "modify_requested" ? "Modify Req." :
    "Unknown"

  const cls =
    live === "ENABLED" ? "bg-emerald-900/40 text-emerald-300 border-emerald-700" :
    live === "PAUSED"  ? "bg-amber-900/40 text-amber-300 border-amber-700" :
    db === "pending_approval" ? "bg-blue-900/40 text-blue-300 border-blue-700" :
    db === "approved"  ? "bg-emerald-900/40 text-emerald-300 border-emerald-700" :
    db === "rejected" || db === "modify_requested" ? "bg-red-900/40 text-red-300 border-red-700" :
    "bg-gray-800 text-gray-400 border-gray-700"

  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cls}`}>{label}</span>
  )
}

function MatchBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    EXACT:  "bg-blue-900/60 text-blue-300 border-blue-700",
    PHRASE: "bg-purple-900/60 text-purple-300 border-purple-700",
    BROAD:  "bg-gray-800 text-gray-400 border-gray-700",
  }
  const labels: Record<string, string> = { EXACT: "[exact]", PHRASE: '"phrase"', BROAD: "~broad" }
  return (
    <span className={`text-[9px] px-1.5 py-0.5 rounded border font-mono flex-shrink-0 ${styles[type] ?? styles.BROAD}`}>
      {labels[type] ?? type}
    </span>
  )
}

// ── Health status row ─────────────────────────────────────────────────────────

function HealthRow({
  icon: Icon, label, ok, partial, note, detail,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string; ok: boolean; partial?: boolean; note?: string; detail?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`rounded-xl border transition-all ${ok ? "border-emerald-800/60 bg-emerald-950/10" : partial ? "border-amber-800/60 bg-amber-950/10" : "border-red-800/60 bg-red-950/10"}`}>
      <button
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
        onClick={() => detail && setOpen(o => !o)}
      >
        <Icon size={15} className="text-gray-400 flex-shrink-0" />
        <span className="flex-1 text-sm font-medium text-white">{label}</span>
        {note && <span className="text-xs text-gray-500 truncate max-w-xs hidden sm:block">{note}</span>}
        <StatusLight ok={ok} partial={partial} />
        {detail && (open ? <ChevronUp size={14} className="text-gray-600" /> : <ChevronDown size={14} className="text-gray-600" />)}
      </button>
      {open && detail && (
        <div className="border-t border-gray-800/60 px-4 pb-4 pt-3">{detail}</div>
      )}
    </div>
  )
}

// ── Campaign inspection drawer ────────────────────────────────────────────────

type InspectTab = "keywords" | "negatives" | "ads" | "extensions"

function CampaignInspector({
  c, onDeploy, onRollback, acting,
}: {
  c: Campaign
  onDeploy: (c: Campaign) => void
  onRollback: (c: Campaign) => void
  acting: boolean
}) {
  const [tab, setTab] = useState<InspectTab>("keywords")

  const canDeploy   = c.status === "pending_approval" && !c.simulated
  const canRollback = (c.status === "approved" || c.liveGoogleStatus === "ENABLED" || c.liveGoogleStatus === "PAUSED") && !c.simulated

  const TABS: { key: InspectTab; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
    { key: "keywords",   label: "Keywords",    icon: Target },
    { key: "negatives",  label: "Negatives",   icon: Shield },
    { key: "ads",        label: "RSA Ads",     icon: Type },
    { key: "extensions", label: "Extensions",  icon: Link2 },
  ]

  return (
    <div className="bg-gray-950 border border-gray-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-800 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-bold text-white">{c.campaignName}</span>
            <CampaignStatusBadge campaign={c} />
            {c.simulated && <span className="text-[10px] text-gray-600 border border-gray-700 px-1.5 py-0.5 rounded">sim</span>}
          </div>
          <div className="flex flex-wrap gap-3 text-[11px] text-gray-500">
            {c.googleCampaignId && (
              <span className="flex items-center gap-1">
                <Globe size={10} />Campaign ID: <code className="text-gray-300">{c.googleCampaignId}</code>
              </span>
            )}
            <span>{c.adGroupCount} ad groups · {c.keywordCount} keywords · {c.negativeCount} negatives</span>
            <span>{c.headlineCount} headlines · {c.sitelinkCount} sitelinks · {c.calloutCount} callouts</span>
            <span>{new Date(c.createdAt).toLocaleDateString("en-IN")}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canRollback && (
            <button
              onClick={() => onRollback(c)}
              disabled={acting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 border border-red-800 rounded-lg hover:bg-red-950/30 disabled:opacity-50"
            >
              <RotateCcw size={12} />Rollback
            </button>
          )}
          {canDeploy && (
            <button
              onClick={() => onDeploy(c)}
              disabled={acting}
              className="flex items-center gap-2 px-4 py-1.5 bg-emerald-700 text-white text-xs rounded-lg hover:bg-emerald-600 disabled:opacity-50 font-semibold"
            >
              {acting ? <RefreshCw size={12} className="animate-spin" /> : <Rocket size={12} />}
              Deploy to Google Ads
            </button>
          )}
          {c.googleCampaignId && (
            <a
              href={`https://ads.google.com/aw/campaigns?campaignId=${c.googleCampaignId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300"
            >
              <ExternalLink size={11} />Ads
            </a>
          )}
        </div>
      </div>

      {/* Quality bar */}
      <div className="px-5 py-2 border-b border-gray-800/60 flex items-center gap-3">
        <span className="text-[11px] text-gray-500">Confidence</span>
        <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${c.qualityScores?.deploymentConfidence >= 65 ? "bg-emerald-500" : "bg-amber-500"}`}
            style={{ width: `${Math.min(c.qualityScores?.deploymentConfidence ?? 0, 100)}%` }}
          />
        </div>
        <span className={`text-xs font-bold ${c.qualityScores?.deploymentConfidence >= 65 ? "text-emerald-400" : "text-amber-400"}`}>
          {c.qualityScores?.deploymentConfidence ?? "—"}/100
        </span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800/60 overflow-x-auto">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium whitespace-nowrap flex-shrink-0 border-b-2 transition-colors ${
              tab === key ? "border-brand-500 text-white" : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            <Icon size={11} />{label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-4 max-h-64 overflow-y-auto">
        {tab === "keywords" && (
          <div className="space-y-3">
            {c.adGroups.map(ag => (
              <div key={ag.name}>
                <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-1.5">{ag.name}</p>
                <div className="flex flex-wrap gap-1.5">
                  {ag.keywords.map((kw, i) => (
                    <div key={i} className="flex items-center gap-1 bg-gray-900 border border-gray-800 rounded px-2 py-0.5">
                      <MatchBadge type={kw.matchType} />
                      <code className="text-[11px] text-gray-300">{kw.text}</code>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "negatives" && (
          <div className="flex flex-wrap gap-1.5">
            {c.campaignNegatives.map((neg, i) => (
              <span key={i} className="text-[11px] bg-red-950/20 text-red-400 border border-red-900/40 px-2 py-0.5 rounded">
                −{typeof neg === "string" ? neg : neg.text}
              </span>
            ))}
            {c.campaignNegatives.length === 0 && (
              <p className="text-xs text-gray-600">No negatives configured.</p>
            )}
          </div>
        )}

        {tab === "ads" && (
          <div className="space-y-4">
            {c.adGroups.map(ag => (
              <div key={ag.name}>
                <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-2">{ag.name}</p>
                {/* Ad preview */}
                <div className="bg-white rounded-lg p-3 mb-2">
                  <div className="text-[9px] text-gray-400 mb-0.5">Ad · 100xcircle.com{ag.landingPage}</div>
                  <p className="text-blue-700 text-xs font-medium">{ag.rsa?.headlines?.slice(0, 3).join(" | ")}</p>
                  <p className="text-gray-500 text-[11px] mt-0.5">{ag.rsa?.descriptions?.[0]}</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(ag.rsa?.headlines ?? []).map((h, i) => (
                    <span key={i} className="text-[10px] bg-gray-800 text-gray-400 border border-gray-700 px-1.5 py-0.5 rounded">{h}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "extensions" && (
          <div className="space-y-4">
            {/* Sitelinks */}
            <div>
              <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Link2 size={10} />Sitelinks ({c.sitelinkCount})
              </p>
              {c.sitelinkCount > 0 ? (
                <div className="grid grid-cols-2 gap-1.5">
                  {/* Show from first ad group RSA sitelinks if available */}
                  {(c.adGroups[0]?.rsa as { sitelinks?: Array<{ text: string; url: string }> })?.sitelinks?.map((sl, i) => (
                    <div key={i} className="text-[11px] bg-gray-900 border border-gray-800 rounded px-2 py-1.5">
                      <p className="text-gray-300 font-medium">{sl.text}</p>
                      <p className="text-gray-600 truncate">{sl.url}</p>
                    </div>
                  )) ?? (
                    <p className="text-xs text-gray-600 col-span-2">
                      {c.sitelinkCount} sitelinks deployed to Google Ads (see resource names for details).
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-600">No sitelinks deployed for this campaign.</p>
              )}
            </div>

            {/* Callouts */}
            <div>
              <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Type size={10} />Callouts ({c.calloutCount})
              </p>
              {c.calloutCount > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {(c.adGroups[0]?.rsa?.callouts ?? []).map((co, i) => (
                    <span key={i} className="text-[11px] bg-gray-900 border border-gray-800 px-2 py-0.5 rounded text-gray-400">{co}</span>
                  ))}
                  {(c.adGroups[0]?.rsa?.callouts ?? []).length === 0 && (
                    <p className="text-xs text-gray-600">{c.calloutCount} callouts deployed (see Google Ads account).</p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-600">No callouts deployed for this campaign.</p>
              )}
            </div>

            {/* Resource names (for debugging) */}
            {c.campaignResourceName && (
              <div className="bg-gray-900 border border-gray-800 rounded px-3 py-2">
                <p className="text-[10px] text-gray-600 font-semibold uppercase tracking-wider mb-1">Google Resource Name</p>
                <code className="text-[10px] text-gray-400 break-all">{c.campaignResourceName}</code>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdsHealthPage() {
  const [data, setData]             = useState<HealthData | null>(null)
  const [loading, setLoading]       = useState(true)
  const [syncing, setSyncing]       = useState(false)
  const [acting, setActing]         = useState(false)
  const [expandedPlan, setExpanded] = useState<string | null>(null)
  const [msg, setMsg]               = useState<{ type: "ok" | "error" | "warn"; text: string } | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/growth/ads/health")
      const d   = await res.json() as HealthData
      setData(d)
    } catch (e) {
      setMsg({ type: "error", text: String(e) })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const syncConversions = async () => {
    setSyncing(true)
    setMsg(null)
    try {
      const res = await fetch("/api/admin/growth/ads/conversion-actions", { method: "POST" })
      const d   = await res.json() as { ok?: boolean; discovered?: number; matched?: number; error?: string }
      if (d.ok) {
        setMsg({ type: "ok", text: `Synced ${d.discovered} conversion actions from Google Ads (${d.matched} matched).` })
        await load()
      } else {
        setMsg({ type: "error", text: d.error ?? "Sync failed" })
      }
    } catch (e) {
      setMsg({ type: "error", text: String(e) })
    } finally {
      setSyncing(false)
    }
  }

  const deployPlan = async (c: Campaign) => {
    if (!c.deploymentId || !c.planId) return
    setActing(true)
    setMsg(null)
    try {
      const res = await fetch("/api/admin/growth/ads/approval-queue", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "approve", planId: c.planId, deploymentId: c.deploymentId }),
      })
      const d = await res.json() as { ok?: boolean; error?: string }
      if (d.ok) {
        setMsg({ type: "ok", text: `Campaign "${c.campaignName}" is now ENABLED in Google Ads.` })
        await load()
      } else {
        setMsg({ type: "error", text: d.error ?? "Deploy failed" })
      }
    } catch (e) {
      setMsg({ type: "error", text: String(e) })
    } finally {
      setActing(false)
    }
  }

  const rollbackPlan = async (c: Campaign) => {
    if (!c.deploymentId) return
    setActing(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/admin/growth/ads/deployment/${c.deploymentId}`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ reason: "manual_rollback_from_health_dashboard" }),
      })
      const d = await res.json() as { ok?: boolean; error?: string }
      if (d.ok) {
        setMsg({ type: "warn", text: `Campaign "${c.campaignName}" rolled back from Google Ads.` })
        await load()
      } else {
        setMsg({ type: "error", text: d.error ?? "Rollback failed" })
      }
    } catch (e) {
      setMsg({ type: "error", text: String(e) })
    } finally {
      setActing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Activity size={20} className="text-brand-400" />
              <h1 className="text-xl font-bold">Ads Health Dashboard</h1>
            </div>
            <p className="text-gray-400 text-sm">System status · Conversion tracking · Campaign inspection</p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-xs border border-gray-700 rounded-lg text-gray-400 hover:text-white hover:border-gray-600 disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />Refresh
          </button>
        </div>

        {/* Message */}
        {msg && (
          <div className={`flex items-start gap-3 p-4 rounded-xl border text-sm ${
            msg.type === "error" ? "bg-red-950/20 border-red-800/50 text-red-400" :
            msg.type === "warn"  ? "bg-amber-950/20 border-amber-800/50 text-amber-400" :
                                   "bg-emerald-950/20 border-emerald-800/50 text-emerald-400"
          }`}>
            {msg.type === "ok"    ? <CheckCircle size={16} className="flex-shrink-0 mt-0.5" /> :
             msg.type === "warn"  ? <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" /> :
             <XCircle size={16} className="flex-shrink-0 mt-0.5" />}
            {msg.text}
          </div>
        )}

        {loading && !data && (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-14 bg-gray-900 rounded-xl animate-pulse" />)}
          </div>
        )}

        {data && (
          <>
            {/* Overall health banner */}
            <div className={`flex items-center gap-3 p-4 rounded-xl border ${data.overallHealthy ? "bg-emerald-950/20 border-emerald-800/40" : "bg-amber-950/20 border-amber-800/40"}`}>
              <StatusLight ok={data.overallHealthy} partial={!data.overallHealthy} />
              <div className="flex-1">
                <p className={`font-bold text-sm ${data.overallHealthy ? "text-emerald-300" : "text-amber-300"}`}>
                  {data.overallHealthy ? "All systems operational" : "Action required — see checks below"}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Last checked: {new Date(data.checkedAt).toLocaleString("en-IN")}</p>
              </div>
              <div className="flex items-center gap-4 text-center">
                <div>
                  <p className="text-lg font-black text-emerald-400">{data.deployment.active}</p>
                  <p className="text-[10px] text-gray-600">Active</p>
                </div>
                <div>
                  <p className="text-lg font-black text-amber-400">{data.deployment.paused}</p>
                  <p className="text-[10px] text-gray-600">Paused</p>
                </div>
                <div>
                  <p className="text-lg font-black text-blue-400">{data.deployment.pending}</p>
                  <p className="text-[10px] text-gray-600">Pending</p>
                </div>
              </div>
            </div>

            {/* ── 5 Health checks ── */}
            <div className="space-y-2">
              <p className="text-[11px] text-gray-600 font-semibold uppercase tracking-wider">Health Checks</p>

              {/* 1. Developer Token */}
              <HealthRow
                icon={Key}
                label="Developer Token"
                ok={data.developerToken.configured}
                note={data.developerToken.configured ? "GOOGLE_ADS_DEVELOPER_TOKEN is set" : "Token missing"}
                detail={
                  <div className="space-y-2 text-xs text-gray-400">
                    <p>{data.developerToken.note}</p>
                    {!data.developerToken.configured && (
                      <div className="bg-gray-900 rounded-lg p-3 font-mono text-[11px] text-gray-300">
                        GOOGLE_ADS_DEVELOPER_TOKEN=your_token_here
                      </div>
                    )}
                  </div>
                }
              />

              {/* 2. OAuth */}
              <HealthRow
                icon={User}
                label="OAuth / Google Account"
                ok={data.oauth.ok}
                partial={data.oauth.connected && !data.oauth.hasAdsScope}
                note={data.oauth.ok ? `Connected: ${data.oauth.email}` : data.oauth.connected ? "Connected but missing Ads scope" : "Not connected"}
                detail={
                  <div className="space-y-2 text-xs">
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "App Configured", ok: data.oauth.appConfigured },
                        { label: "Refresh Token",  ok: data.oauth.connected },
                        { label: "Ads Scope",      ok: data.oauth.hasAdsScope },
                      ].map(({ label, ok }) => (
                        <div key={label} className={`flex items-center gap-1.5 p-2 rounded-lg ${ok ? "bg-emerald-950/30 text-emerald-400" : "bg-red-950/30 text-red-400"}`}>
                          <StatusLight ok={ok} />
                          <span>{label}</span>
                        </div>
                      ))}
                    </div>
                    {data.oauth.email && <p className="text-gray-500">Account: {data.oauth.email}</p>}
                    {!data.oauth.ok && (
                      <a href="/admin/growth/ads/setup" className="inline-flex items-center gap-1 text-brand-400 hover:text-brand-300">
                        <ArrowRight size={12} />Go to Ads Setup to reconnect
                      </a>
                    )}
                  </div>
                }
              />

              {/* 3. Customer ID */}
              <HealthRow
                icon={Layers}
                label="Google Ads Account"
                ok={data.customer.configured}
                note={data.customer.configured ? `Account: ${data.customer.customerName} (${data.customer.customerId})` : "No account connected"}
                detail={
                  data.customer.configured ? (
                    <div className="text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Customer ID</span>
                        <code className="text-gray-300">{data.customer.customerId}</code>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Account Name</span>
                        <span className="text-gray-300">{data.customer.customerName}</span>
                      </div>
                    </div>
                  ) : (
                    <a href="/admin/growth/ads/setup" className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
                      <ArrowRight size={12} />Connect account in Ads Setup
                    </a>
                  )
                }
              />

              {/* 4. Conversion Tracking */}
              <HealthRow
                icon={BarChart3}
                label="Conversion Tracking"
                ok={data.conversionTracking.ok}
                partial={data.conversionTracking.configuredCount > 0 && !data.conversionTracking.ok}
                note={data.conversionTracking.ok
                  ? `${data.conversionTracking.configuredCount}/${data.conversionTracking.totalCount} labels configured`
                  : `${data.conversionTracking.configuredCount}/${data.conversionTracking.totalCount} configured — sync needed`
                }
                detail={
                  <div className="space-y-3">
                    {/* Sync button */}
                    <button
                      onClick={syncConversions}
                      disabled={syncing || !data.oauth.ok || !data.customer.configured}
                      className="flex items-center gap-2 text-xs px-3 py-1.5 bg-brand-700 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50"
                    >
                      <RefreshCw size={11} className={syncing ? "animate-spin" : ""} />
                      {syncing ? "Syncing…" : "Sync from Google Ads"}
                    </button>
                    {data.conversionTracking.lastSyncedAt && (
                      <p className="text-[11px] text-gray-600">Last synced: {new Date(data.conversionTracking.lastSyncedAt).toLocaleString("en-IN")}</p>
                    )}
                    {/* Actions table */}
                    <div className="space-y-1.5">
                      {data.conversionTracking.actions.map(action => (
                        <div key={action.name} className="flex items-center justify-between gap-3 text-xs py-1.5 border-b border-gray-800/60 last:border-0">
                          <div className="flex items-center gap-2">
                            <StatusLight ok={action.labelConfigured} />
                            <span className="text-gray-300">{action.name}</span>
                            {action.isRevenue && <span className="text-[9px] bg-brand-900/40 text-brand-400 px-1.5 rounded border border-brand-800/40">primary</span>}
                          </div>
                          <code className={`text-[10px] ${action.labelConfigured ? "text-gray-400" : "text-red-400"}`}>
                            {action.conversionLabel}
                          </code>
                        </div>
                      ))}
                    </div>
                    <div className="bg-gray-900 rounded-lg px-3 py-2 text-[11px]">
                      <p className="text-gray-500">Conversion ID: <code className={`${data.conversionTracking.awConversionIdConfigured ? "text-gray-300" : "text-red-400"}`}>{data.conversionTracking.awConversionId}</code></p>
                    </div>
                  </div>
                }
              />

              {/* 5. Campaign Deployment */}
              <HealthRow
                icon={Zap}
                label="Campaign Deployment"
                ok={data.deployment.active > 0}
                partial={data.deployment.total > 0 && data.deployment.active === 0}
                note={data.deployment.total > 0
                  ? `${data.deployment.total} total · ${data.deployment.active} active · ${data.deployment.pending} pending review`
                  : "No campaigns deployed yet"
                }
              />
            </div>

            {/* ── Campaign Inspection ── */}
            {data.deployment.campaigns.length > 0 && (
              <div className="space-y-3">
                <p className="text-[11px] text-gray-600 font-semibold uppercase tracking-wider flex items-center gap-2">
                  <Zap size={11} />Campaign Inspection ({data.deployment.campaigns.length})
                </p>

                {data.deployment.campaigns.map(c => (
                  <div key={c.planId}>
                    {/* Collapsed row */}
                    <button
                      className="w-full flex items-center gap-3 bg-gray-900 border border-gray-800 rounded-xl px-5 py-3.5 hover:border-gray-700 transition-colors text-left"
                      onClick={() => setExpanded(expandedPlan === c.planId ? null : c.planId)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span className="text-sm font-medium text-white truncate">{c.campaignName}</span>
                          <CampaignStatusBadge campaign={c} />
                          {c.simulated && <span className="text-[10px] text-gray-600">sim</span>}
                        </div>
                        <div className="flex gap-3 text-[11px] text-gray-600 flex-wrap">
                          {c.googleCampaignId && <span>ID: {c.googleCampaignId}</span>}
                          <span>{c.keywordCount} kw</span>
                          <span>{c.negativeCount} neg</span>
                          <span>{c.sitelinkCount} sitelinks</span>
                          <span>{c.calloutCount} callouts</span>
                          <span>{new Date(c.createdAt).toLocaleDateString("en-IN")}</span>
                        </div>
                      </div>
                      <div className={`text-sm font-bold flex-shrink-0 ${c.qualityScores?.deploymentConfidence >= 65 ? "text-emerald-400" : "text-amber-400"}`}>
                        {c.qualityScores?.deploymentConfidence ?? "—"}
                      </div>
                      {expandedPlan === c.planId ? <ChevronUp size={14} className="text-gray-600 flex-shrink-0" /> : <ChevronDown size={14} className="text-gray-600 flex-shrink-0" />}
                    </button>

                    {/* Expanded inspector */}
                    {expandedPlan === c.planId && (
                      <div className="mt-1">
                        <CampaignInspector
                          c={c}
                          onDeploy={deployPlan}
                          onRollback={rollbackPlan}
                          acting={acting}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Nav to other Ads pages */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-800">
              {[
                { href: "/admin/growth/ads/campaign-factory", label: "Campaign Factory" },
                { href: "/admin/growth/ads/dashboard", label: "Performance Dashboard" },
                { href: "/admin/growth/ads/setup", label: "Account Setup" },
                { href: "/admin/growth/ads/director", label: "Ads Director" },
              ].map(({ href, label }) => (
                <a key={href} href={href} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 px-3 py-1.5 border border-gray-800 rounded-lg hover:border-gray-700">
                  <ArrowRight size={11} />{label}
                </a>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
