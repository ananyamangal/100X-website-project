"use client"

import { useEffect, useState, useCallback } from "react"
import {
  Wifi, WifiOff, AlertTriangle, CheckCircle, Circle,
  BarChart3, Zap, Target, GitMerge, RotateCcw,
  RefreshCw, ArrowRight, ExternalLink, ChevronRight,
  Radio, ShieldCheck, Layers, TrendingUp, Megaphone,
} from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────

type MaturityLevel = "live" | "configured" | "partial" | "blocked" | "not_started"

interface AdsSync {
  devTokenConfigured: boolean
  connected: boolean
  connectedEmail: string | null
  hasAdsScope: boolean
  customerId: string | null
  customerName: string | null
  currencyCode: string
  lastSync: { syncedAt: string; counts: Record<string, number>; status: string; errors?: string[] } | null
}

interface GA4Sync {
  connected: boolean
  connectedEmail: string | null
  hasAnalyticsScope: boolean
  propertyId: string | null
  propertyName: string | null
  lastSync: { syncedAt: string; counts?: Record<string, number>; status: string } | null
}

interface ConvMap {
  conversionIdConfigured: boolean
  allLabelsConfigured: boolean
  awConversionId: string
  gtmContainer: string
  actions: Array<{ name: string; labelConfigured: boolean; defaultValue: number }>
  status: "configured" | "pending_setup"
}

interface FactoryPreflight {
  tokenStatus: { configured: boolean }
  accountConnected: boolean
  canDeploy: boolean
  recentPlans: Array<{ planId: string; status: string; simulated: boolean; campaignName: string; createdAt: string }>
}

interface QueueData {
  items: Array<{ planId: string; status: string; campaignName: string; simulated: boolean }>
}

interface LayerStatus {
  level: MaturityLevel
  headline: string
  bullets: string[]
  action?: { label: string; href: string }
  blockedBy?: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const LEVEL_META: Record<MaturityLevel, { label: string; dot: string; ring: string; text: string; bg: string; border: string }> = {
  live:        { label: "Live",        dot: "bg-emerald-500", ring: "ring-emerald-500/30", text: "text-emerald-700", bg: "bg-emerald-50",  border: "border-emerald-200" },
  configured:  { label: "Configured",  dot: "bg-blue-500",    ring: "ring-blue-500/30",    text: "text-blue-700",   bg: "bg-blue-50",    border: "border-blue-200" },
  partial:     { label: "Partial",     dot: "bg-amber-500",   ring: "ring-amber-500/30",   text: "text-amber-700",  bg: "bg-amber-50",   border: "border-amber-200" },
  blocked:     { label: "Blocked",     dot: "bg-red-500",     ring: "ring-red-500/30",     text: "text-red-700",    bg: "bg-red-50",     border: "border-red-200" },
  not_started: { label: "Not started", dot: "bg-gray-300",    ring: "ring-gray-300/30",    text: "text-gray-500",   bg: "bg-gray-50",    border: "border-gray-200" },
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3_600_000)
  if (h < 1) return `${Math.floor(diff / 60_000)}m ago`
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ── Maturity derivation ───────────────────────────────────────────────────────

function deriveConnectivity(ads: AdsSync | null): LayerStatus {
  if (!ads) return { level: "not_started", headline: "Loading…", bullets: [] }

  if (!ads.connected || !ads.hasAdsScope) return {
    level: "blocked",
    headline: "Google account not connected",
    bullets: [
      !ads.connected ? "No Google OAuth tokens stored" : "adwords scope missing — reconnect",
      "Without a connection, no Ads data can be read",
    ],
    action: { label: "Connect Google Account", href: "/admin/growth/seo/setup" },
  }

  if (!ads.devTokenConfigured) return {
    level: "partial",
    headline: "Developer token missing",
    bullets: [
      `Account connected: ${ads.connectedEmail ?? "unknown"}`,
      "GOOGLE_ADS_DEVELOPER_TOKEN not set in environment",
      "Required to make API calls to Google Ads",
    ],
    action: { label: "Add Developer Token", href: "/admin/growth/ads/setup" },
  }

  if (!ads.customerId) return {
    level: "partial",
    headline: "Token set — no account selected",
    bullets: [
      `Account connected: ${ads.connectedEmail ?? "unknown"}`,
      "Developer token: configured",
      "Customer ID not yet selected",
    ],
    action: { label: "Select Ads Account", href: "/admin/growth/ads/setup" },
  }

  if (!ads.lastSync) return {
    level: "configured",
    headline: "Ready — no sync yet",
    bullets: [
      `Account: ${ads.customerName ?? ads.customerId}`,
      "Developer token: configured",
      "Run a sync to pull 30 days of campaign data",
    ],
    action: { label: "Go to Dashboard & Sync", href: "/admin/growth/ads/dashboard" },
  }

  const counts = ads.lastSync.counts ?? {}
  return {
    level: "live",
    headline: `Syncing — ${ads.customerName ?? ads.customerId}`,
    bullets: [
      `Last sync: ${timeAgo(ads.lastSync.syncedAt)}`,
      `Campaigns: ${counts.campaigns ?? 0} · Keywords: ${counts.keywords ?? 0} · Conversions: ${counts.conversions ?? 0}`,
      ads.lastSync.status === "ok" ? "All data streams healthy" : `Sync status: ${ads.lastSync.status}`,
    ],
    action: { label: "Open Ads Dashboard", href: "/admin/growth/ads/dashboard" },
  }
}

function deriveDeployment(factory: FactoryPreflight | null, queue: QueueData | null): LayerStatus {
  if (!factory) return { level: "not_started", headline: "Loading…", bullets: [] }

  const pending = (queue?.items ?? []).filter(p => p.status === "pending_approval")
  const approved = (queue?.items ?? []).filter(p => p.status === "approved" || p.status === "approved_simulated")
  const allPlans = factory.recentPlans ?? []

  if (allPlans.length === 0) return {
    level: "not_started",
    headline: "No campaign drafts generated",
    bullets: [
      "Campaign Factory is ready to generate drafts",
      "Factory uses keyword intelligence + RSA copy generator",
      "All campaigns created as PAUSED — explicit approval required",
    ],
    action: { label: "Open Campaign Factory", href: "/admin/growth/ads/campaign-factory" },
  }

  if (pending.length > 0) return {
    level: "partial",
    headline: `${pending.length} campaign${pending.length > 1 ? "s" : ""} awaiting approval`,
    bullets: [
      pending.map(p => `"${p.campaignName}"${p.simulated ? " (simulation)" : ""}`).join(", "),
      "Staged as PAUSED in Google Ads — not spending",
      "Click Deploy to enable the campaign",
    ],
    action: { label: "Review Approval Queue", href: "/admin/growth/ads/approval-queue" },
  }

  if (approved.length > 0) {
    const live = approved.filter(p => !p.simulated)
    return {
      level: live.length > 0 ? "live" : "configured",
      headline: live.length > 0 ? `${live.length} live campaign${live.length > 1 ? "s" : ""}` : "Approved (simulation mode)",
      bullets: [
        live.length > 0 ? "Campaigns ENABLED in Google Ads — spending to budget" : "Approval recorded but no real account connected",
        `${allPlans.length} total plan${allPlans.length > 1 ? "s" : ""} in history`,
        live.length === 0 ? "Connect a real Ads account and re-run factory to deploy" : "Monitor in Ads Dashboard",
      ],
      action: { label: "View Approval Queue", href: "/admin/growth/ads/approval-queue" },
    }
  }

  return {
    level: "configured",
    headline: "Drafts generated — none pending",
    bullets: [
      `${allPlans.length} plan${allPlans.length > 1 ? "s" : ""} in history`,
      "Generate a new draft to restart approval flow",
    ],
    action: { label: "Open Campaign Factory", href: "/admin/growth/ads/campaign-factory" },
  }
}

function deriveConversionTracking(conv: ConvMap | null): LayerStatus {
  if (!conv) return { level: "not_started", headline: "Loading…", bullets: [] }

  const labelsMissing = conv.actions.filter(a => !a.labelConfigured).length
  const labelsOk = conv.actions.filter(a => a.labelConfigured).length

  if (!conv.conversionIdConfigured && labelsMissing === conv.actions.length) return {
    level: "not_started",
    headline: "Conversion tracking not configured",
    bullets: [
      `GTM container: ${conv.gtmContainer} (ID exists)`,
      "Google Ads Conversion ID: NOT SET (AW-REPLACE_WITH_YOUR_ID)",
      `All ${conv.actions.length} conversion labels need real values from Google Ads`,
      `Total conversion value defined: ₹${conv.actions.reduce((s, a) => s + a.defaultValue, 0).toLocaleString("en-IN")} per lead`,
    ],
    action: { label: "Ads Conversion Setup", href: "/admin/growth/ads/setup" },
  }

  if (!conv.conversionIdConfigured || labelsMissing > 0) return {
    level: "partial",
    headline: `${labelsOk}/${conv.actions.length} conversion labels configured`,
    bullets: [
      conv.conversionIdConfigured ? "Conversion ID: set" : "Conversion ID: NOT SET",
      `${labelsMissing} label${labelsMissing > 1 ? "s" : ""} still placeholder: ${conv.actions.filter(a => !a.labelConfigured).map(a => a.name).join(", ")}`,
      `GTM container: ${conv.gtmContainer}`,
    ],
    action: { label: "Complete GTM Setup", href: "/admin/growth/ads/setup" },
  }

  return {
    level: "live",
    headline: "All 5 conversion actions configured",
    bullets: [
      `GTM container: ${conv.gtmContainer}`,
      `Conversion ID: ${conv.awConversionId}`,
      `Actions: ${conv.actions.map(a => a.name).join(", ")}`,
    ],
    action: { label: "View Conversion Mapping", href: "/admin/growth/ads/campaign-factory" },
  }
}

function deriveAttribution(ga4: GA4Sync | null, conv: ConvMap | null): LayerStatus {
  if (!ga4) return { level: "not_started", headline: "Loading…", bullets: [] }

  if (!ga4.connected) return {
    level: "not_started",
    headline: "GA4 not connected",
    bullets: [
      "GA4 uses the same Google OAuth as Ads and Search Console",
      "Required for session/traffic attribution data",
      "Without GA4 you have Ads clicks but no website behaviour",
    ],
    action: { label: "Connect GA4", href: "/admin/growth/seo/setup" },
  }

  if (!ga4.propertyId) return {
    level: "partial",
    headline: "GA4 connected — no property selected",
    bullets: [
      `Connected as: ${ga4.connectedEmail ?? "unknown"}`,
      "Select your GA4 property to start attribution",
    ],
    action: { label: "Select GA4 Property", href: "/admin/growth/analytics/setup" },
  }

  const hasSynced = !!ga4.lastSync
  const convConfigured = conv?.status === "configured"

  if (!hasSynced) return {
    level: "partial",
    headline: "GA4 property set — no sync yet",
    bullets: [
      `Property: ${ga4.propertyName ?? ga4.propertyId}`,
      "Run a GA4 sync to pull sessions, sources, and landing pages",
      "UTM parameters are captured in lead forms (source tracking active)",
    ],
    action: { label: "Sync GA4 Data", href: "/admin/growth/analytics" },
  }

  if (!convConfigured) return {
    level: "partial",
    headline: "Traffic data flowing — conversion labels pending",
    bullets: [
      `Property: ${ga4.propertyName ?? ga4.propertyId} · Last sync: ${timeAgo(ga4.lastSync!.syncedAt)}`,
      "Sessions, sources, and landing pages synced",
      "Set conversion labels in GTM to close the loop",
    ],
    action: { label: "Complete Conversion Setup", href: "/admin/growth/ads/setup" },
  }

  return {
    level: "live",
    headline: "Full attribution pipeline active",
    bullets: [
      `GA4 property: ${ga4.propertyName ?? ga4.propertyId} · Last sync: ${timeAgo(ga4.lastSync!.syncedAt)}`,
      "Traffic source → session → lead form → conversion label",
      "Revenue attribution complete — ads spend vs lead value visible",
    ],
    action: { label: "View Analytics", href: "/admin/growth/analytics" },
  }
}

function deriveOptimization(ads: AdsSync | null, deployment: LayerStatus): LayerStatus {
  const canOptimize = ads?.lastSync && deployment.level === "live"

  if (!canOptimize) return {
    level: "not_started",
    headline: "Deploy campaigns first",
    bullets: [
      "Optimization requires live campaign spend data",
      "Google Ads Director will surface: negative keywords, bid adjustments, search term gaps",
      "Attribution must be live to measure ROAS",
    ],
    blockedBy: "Layer 1 (Connectivity) + Layer 2 (Deployment)",
  }

  return {
    level: "configured",
    headline: "Ads Director ready to run",
    bullets: [
      "Campaign data available for intelligence sweep",
      "Run Director to surface: high-CPC keywords, low-CTR ads, search term negatives",
      "Recommendations require your approval — no automatic bid changes",
    ],
    action: { label: "Run Ads Director", href: "/admin/growth/ads/director" },
  }
}

// ── Priority action derivation ────────────────────────────────────────────────

interface PriorityAction {
  id: string
  title: string
  why: string
  status: "done" | "next" | "pending"
  href: string
  label: string
}

function derivePriorityActions(
  ads: AdsSync | null,
  ga4: GA4Sync | null,
  conv: ConvMap | null,
  queue: QueueData | null
): PriorityAction[] {
  const adsReady = !!(ads?.connected && ads.hasAdsScope && ads.devTokenConfigured && ads.customerId)
  const adsLive  = !!(adsReady && ads?.lastSync)
  const ga4Ready = !!(ga4?.connected && ga4.propertyId)
  const ga4Live  = !!(ga4Ready && ga4?.lastSync)
  const convDone = conv?.status === "configured"
  const hasPending = (queue?.items ?? []).some(p => p.status === "pending_approval")

  return [
    {
      id: "ads_connectivity",
      title: "Google Ads Connectivity",
      why: "Token, OAuth scope, and account ID must all be confirmed before any campaign data flows",
      status: adsLive ? "done" : adsReady ? "next" : "pending",
      href: "/admin/growth/ads/setup",
      label: adsLive ? "View Setup" : "Complete Setup",
    },
    {
      id: "ga4",
      title: "GA4 Traffic Attribution",
      why: "GA4 tells you which sessions come from paid vs organic, and which pages convert — essential before spending",
      status: ga4Live ? "done" : ga4Ready ? "next" : "pending",
      href: "/admin/growth/analytics",
      label: ga4Live ? "View Analytics" : ga4Ready ? "Sync GA4 Data" : "Connect GA4",
    },
    {
      id: "gtm_conversion",
      title: "GTM Conversion Labels",
      why: "Without conversion labels, Google Ads has no signal to optimise bids — smart bidding is blind",
      status: convDone ? "done" : "pending",
      href: "/admin/growth/ads/setup",
      label: convDone ? "Configured" : "Set Up Conversions",
    },
    {
      id: "lead_attribution",
      title: "Lead Attribution (UTM → CRM)",
      why: "UTM parameters in lead forms map ad clicks to named leads — so you know which campaign produced which enquiry",
      status: ga4Live ? "done" : adsLive ? "next" : "pending",
      href: "/admin/growth/intelligence",
      label: "View Lead Intelligence",
    },
    {
      id: "campaign_deploy",
      title: "Deploy First Campaign",
      why: "No spend without explicit approval. Campaign Factory stages as PAUSED — you click Deploy",
      status: hasPending ? "next" : "pending",
      href: hasPending ? "/admin/growth/ads/approval-queue" : "/admin/growth/ads/campaign-factory",
      label: hasPending ? "Approve & Deploy" : "Generate Draft",
    },
    {
      id: "revenue_attribution",
      title: "Revenue Attribution (ROAS)",
      why: "Close the loop: ad spend → clicks → leads → pipeline value → closed revenue",
      status: convDone && ga4Live && adsLive ? "next" : "pending",
      href: "/admin/growth/ads/director",
      label: "Run Director",
    },
  ]
}

// ── Subcomponents ─────────────────────────────────────────────────────────────

function LevelBadge({ level }: { level: MaturityLevel }) {
  const m = LEVEL_META[level]
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${m.bg} ${m.border} ${m.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${m.dot}`} />
      {m.label}
    </span>
  )
}

function MaturityRow({
  index, icon: Icon, title, status, loading,
}: {
  index: number
  icon: React.ComponentType<{ size?: number; className?: string }>
  title: string
  status: LayerStatus | null
  loading: boolean
}) {
  if (loading || !status) {
    return (
      <div className="flex items-start gap-4 py-5 border-b border-gray-100 last:border-0 animate-pulse">
        <div className="w-8 h-8 bg-gray-100 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-100 rounded w-1/3" />
          <div className="h-3 bg-gray-100 rounded w-1/2" />
        </div>
        <div className="w-20 h-6 bg-gray-100 rounded-full" />
      </div>
    )
  }

  const m = LEVEL_META[status.level]

  return (
    <div className={`flex items-start gap-4 py-5 border-b border-gray-100 last:border-0 group`}>
      {/* Index + icon */}
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border ${m.bg} ${m.border}`}>
        <Icon size={15} className={m.text} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-4 mb-1.5">
          <div>
            <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mr-2">Layer {index}</span>
            <span className="text-sm font-semibold text-gray-800">{title}</span>
          </div>
          <LevelBadge level={status.level} />
        </div>

        <p className={`text-xs font-medium mb-1.5 ${status.level === "blocked" ? "text-red-700" : status.level === "partial" ? "text-amber-700" : status.level === "live" ? "text-emerald-700" : "text-gray-600"}`}>
          {status.headline}
        </p>

        <ul className="space-y-0.5">
          {status.bullets.map((b, i) => (
            <li key={i} className="text-[11px] text-gray-500 flex items-start gap-1.5">
              <span className="text-gray-300 mt-0.5 flex-shrink-0">·</span>
              {b}
            </li>
          ))}
        </ul>

        {status.blockedBy && (
          <p className="text-[11px] text-gray-400 mt-1.5 italic">Blocked by: {status.blockedBy}</p>
        )}
      </div>

      {/* Action */}
      {status.action && (
        <a
          href={status.action.href}
          className={`flex-shrink-0 text-[11px] font-medium px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5 ${
            status.level === "live"        ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50" :
            status.level === "blocked"    ? "border-red-200 text-red-700 hover:bg-red-50" :
            status.level === "partial"    ? "border-amber-200 text-amber-700 hover:bg-amber-50" :
                                            "border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          {status.action.label}
          <ChevronRight size={11} />
        </a>
      )}
    </div>
  )
}

function PriorityCard({ action, idx }: { action: PriorityAction; idx: number }) {
  const isDone = action.status === "done"
  const isNext = action.status === "next"

  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${
      isDone ? "bg-emerald-50 border-emerald-200 opacity-70" :
      isNext  ? "bg-white border-brand-200 shadow-sm ring-1 ring-brand-100" :
                "bg-gray-50 border-gray-200"
    }`}>
      {/* Step number */}
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
        isDone ? "bg-emerald-500 text-white" :
        isNext  ? "bg-brand-600 text-white" :
                  "bg-gray-200 text-gray-500"
      }`}>
        {isDone ? <CheckCircle size={13} /> : idx + 1}
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-xs font-semibold mb-0.5 ${isDone ? "text-emerald-700 line-through" : isNext ? "text-gray-900" : "text-gray-500"}`}>
          {action.title}
        </p>
        <p className={`text-[11px] leading-relaxed ${isDone ? "text-emerald-600" : "text-gray-500"}`}>{action.why}</p>
      </div>

      <a
        href={action.href}
        className={`flex-shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${
          isDone ? "border border-emerald-200 text-emerald-600 hover:bg-emerald-100" :
          isNext  ? "bg-brand-600 text-white hover:bg-brand-700" :
                    "border border-gray-200 text-gray-400"
        }`}
      >
        {action.label}
        <ArrowRight size={10} />
      </a>
    </div>
  )
}

// ── Quick nav ─────────────────────────────────────────────────────────────────

const QUICK_LINKS = [
  { href: "/admin/growth/ads/setup",            label: "Ads Setup",       icon: Wifi,       desc: "OAuth · token · account" },
  { href: "/admin/growth/ads/dashboard",         label: "Ads Dashboard",   icon: BarChart3,  desc: "Campaigns · keywords · spend" },
  { href: "/admin/growth/ads/campaign-factory",  label: "Campaign Factory",icon: Zap,        desc: "Draft → Approve → Deploy" },
  { href: "/admin/growth/ads/approval-queue",    label: "Approval Queue",  icon: ShieldCheck,desc: "Pending campaigns" },
  { href: "/admin/growth/ads/monitoring",        label: "Monitoring",      icon: Radio,      desc: "CTR health · metrics · recs" },
  { href: "/admin/growth/ads/director",          label: "Ads Director",    icon: TrendingUp, desc: "Recommendations · optimization" },
  { href: "/admin/growth/diagnostics",           label: "Diagnostics",     icon: Layers,     desc: "System health · VERIFIED / BROKEN" },
]

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PaidGrowthCommandCenter() {
  const [adsSync,  setAdsSync]  = useState<AdsSync  | null>(null)
  const [ga4Sync,  setGA4Sync]  = useState<GA4Sync  | null>(null)
  const [convMap,  setConvMap]  = useState<ConvMap  | null>(null)
  const [factory,  setFactory]  = useState<FactoryPreflight | null>(null)
  const [queue,    setQueue]    = useState<QueueData | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [lastLoad, setLastLoad] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [ads, ga4, conv, fact, q] = await Promise.allSettled([
      fetch("/api/admin/ads/sync").then(r => r.json()),
      fetch("/api/admin/ga4/sync").then(r => r.json()),
      fetch("/api/admin/growth/ads/conversion-mapping").then(r => r.json()),
      fetch("/api/admin/growth/ads/campaign-factory").then(r => r.json()),
      fetch("/api/admin/growth/ads/approval-queue?status=all").then(r => r.json()),
    ])
    if (ads.status  === "fulfilled") setAdsSync(ads.value  as AdsSync)
    if (ga4.status  === "fulfilled") setGA4Sync(ga4.value  as GA4Sync)
    if (conv.status === "fulfilled") setConvMap(conv.value  as ConvMap)
    if (fact.status === "fulfilled") setFactory(fact.value  as FactoryPreflight)
    if (q.status    === "fulfilled") setQueue(q.value        as QueueData)
    setLastLoad(new Date().toLocaleTimeString("en-IN"))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Derive all 5 layer statuses
  const l1 = deriveConnectivity(adsSync)
  const l2 = deriveDeployment(factory, queue)
  const l3 = deriveConversionTracking(convMap)
  const l4 = deriveAttribution(ga4Sync, convMap)
  const l5 = deriveOptimization(adsSync, l2)

  const priorityActions = derivePriorityActions(adsSync, ga4Sync, convMap, queue)

  // Overall summary
  const levels = [l1, l2, l3, l4, l5].map(l => l.level)
  const liveCount    = levels.filter(l => l === "live").length
  const blockedCount = levels.filter(l => l === "blocked").length
  const overallLevel: MaturityLevel = blockedCount > 0 ? "blocked" : liveCount >= 4 ? "live" : liveCount >= 2 ? "partial" : "not_started"

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-5 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Megaphone size={18} className="text-brand-600" />
            <div>
              <h1 className="text-base font-bold text-gray-900">Paid Growth Command Center</h1>
              <p className="text-gray-400 text-[11px]">
                Google Ads · GA4 · GTM · Attribution · Optimization
                {lastLoad && !loading && ` · Refreshed ${lastLoad}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              {loading ? "Loading…" : "Refresh"}
            </button>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 max-w-[1100px] space-y-6">

        {/* Governance banner */}
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3 flex items-center gap-3 text-xs text-red-700">
          <Radio size={13} className="text-red-400 flex-shrink-0" />
          <p><strong>NO automatic spend.</strong> Campaigns are created as PAUSED. Every deployment requires your explicit approval in the Approval Queue.</p>
        </div>

        {/* Overall status bar */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold mb-1">Overall Maturity</p>
              <div className="flex items-center gap-3">
                <LevelBadge level={overallLevel} />
                <span className="text-sm text-gray-600">
                  {liveCount}/{levels.length} layers live
                  {blockedCount > 0 && ` · ${blockedCount} blocked`}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {[l1, l2, l3, l4, l5].map((layer, i) => {
                const m = LEVEL_META[layer.level]
                return (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div className={`w-3 h-3 rounded-full ring-2 ${m.dot} ${m.ring}`} />
                    <span className="text-[9px] text-gray-400">{i + 1}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="grid lg:grid-cols-5 gap-6">

          {/* Maturity Matrix — left 3/5 */}
          <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-6 pt-5 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Layers size={14} className="text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-800">Maturity Matrix</h2>
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">Real-time status from live API checks — not hardcoded</p>
            </div>

            <div className="px-6">
              <MaturityRow index={1} icon={Wifi}        title="Google Ads Connectivity"      status={loading ? null : l1} loading={loading} />
              <MaturityRow index={2} icon={Zap}         title="Campaign Deployment"           status={loading ? null : l2} loading={loading} />
              <MaturityRow index={3} icon={Target}      title="Conversion Tracking (GTM)"    status={loading ? null : l3} loading={loading} />
              <MaturityRow index={4} icon={GitMerge}    title="Attribution (GA4 → Leads)"    status={loading ? null : l4} loading={loading} />
              <MaturityRow index={5} icon={RotateCcw}   title="Closed-Loop Optimization"     status={loading ? null : l5} loading={loading} />
            </div>
          </div>

          {/* Priority actions — right 2/5 */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <Target size={14} className="text-brand-500" />
                <h2 className="text-sm font-semibold text-gray-800">Priority Sequence</h2>
              </div>
              <p className="text-[11px] text-gray-400 mb-4">Complete these in order. Skip a step and the downstream layers won't work.</p>

              <div className="space-y-2.5">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
                  ))
                ) : (
                  priorityActions.map((action, idx) => (
                    <PriorityCard key={action.id} action={action} idx={idx} />
                  ))
                )}
              </div>
            </div>

            {/* Quick nav */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <p className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold mb-3">Quick Navigation</p>
              <div className="space-y-1">
                {QUICK_LINKS.map(link => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors group"
                  >
                    <link.icon size={14} className="text-gray-400 group-hover:text-brand-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700 group-hover:text-brand-600">{link.label}</p>
                      <p className="text-[10px] text-gray-400">{link.desc}</p>
                    </div>
                    <ArrowRight size={11} className="text-gray-300 group-hover:text-brand-400" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Live data snapshot */}
        {!loading && adsSync?.lastSync && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <BarChart3 size={14} className="text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-800">Last Ads Sync Snapshot</h2>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-gray-400">
                <span>{timeAgo(adsSync.lastSync.syncedAt)}</span>
                <a href="/admin/growth/ads/dashboard" className="flex items-center gap-1 text-brand-500 hover:text-brand-700 font-medium">
                  Full Dashboard <ExternalLink size={9} />
                </a>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {Object.entries(adsSync.lastSync.counts ?? {}).map(([key, val]) => (
                <div key={key} className="text-center bg-gray-50 rounded-lg px-3 py-2.5">
                  <p className="text-lg font-bold text-gray-800">{String(val)}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5 capitalize">{key}</p>
                </div>
              ))}
              <div className="text-center bg-gray-50 rounded-lg px-3 py-2.5">
                <p className={`text-lg font-bold ${adsSync.lastSync.status === "ok" ? "text-emerald-600" : "text-amber-600"}`}>
                  {adsSync.lastSync.status.toUpperCase()}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">Sync status</p>
              </div>
            </div>
          </div>
        )}

        {/* GA4 snapshot */}
        {!loading && ga4Sync?.lastSync && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <GitMerge size={14} className="text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-800">GA4 Sync Snapshot</h2>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-gray-400">
                <span>{timeAgo(ga4Sync.lastSync.syncedAt)}</span>
                <a href="/admin/growth/analytics" className="flex items-center gap-1 text-brand-500 hover:text-brand-700 font-medium">
                  Full Analytics <ExternalLink size={9} />
                </a>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                <span className="text-gray-400">Property: </span>
                <span className="font-medium">{ga4Sync.propertyName ?? ga4Sync.propertyId}</span>
              </div>
              {Object.entries(ga4Sync.lastSync.counts ?? {}).map(([key, val]) => (
                <div key={key} className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                  <span className="text-gray-400 capitalize">{key}: </span>
                  <span className="font-semibold">{String(val)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Conversion tracking setup status */}
        {!loading && convMap && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Target size={14} className="text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-800">Conversion Tracking ({convMap.gtmContainer})</h2>
              </div>
              <LevelBadge level={convMap.status === "configured" ? "live" : "partial"} />
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2">
              {convMap.actions.map(action => (
                <div key={action.name} className={`rounded-lg border px-3 py-2.5 text-center ${action.labelConfigured ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
                  <p className={`text-[11px] font-semibold ${action.labelConfigured ? "text-emerald-700" : "text-amber-700"}`}>
                    {action.labelConfigured ? "✓" : "⚠"} {action.name}
                  </p>
                  <p className={`text-[10px] mt-0.5 ${action.labelConfigured ? "text-emerald-600" : "text-amber-600"}`}>
                    ₹{action.defaultValue.toLocaleString("en-IN")} · {action.labelConfigured ? "label set" : "label pending"}
                  </p>
                </div>
              ))}
            </div>
            {!convMap.conversionIdConfigured && (
              <p className="text-[11px] text-amber-600 mt-3 flex items-center gap-1.5">
                <AlertTriangle size={11} />
                Conversion ID not set. Open Google Ads → Goals → Conversions → any conversion → Tag setup to get AW-XXXXXXXXXX.
              </p>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
