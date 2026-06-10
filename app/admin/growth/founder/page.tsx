"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import {
  CheckCircle2, AlertTriangle, XCircle, Clock, RefreshCw, Zap,
  ChevronDown, ChevronRight, ExternalLink, ArrowRight,
  Users, TrendingUp, Shield, MessageSquare, Settings,
  BarChart3, Search, Megaphone, FileText, Bot, ShoppingBag,
  Activity, Target, DollarSign, Bell,
} from "lucide-react"
import type { ReadinessResult, ReadinessTier, SetupCheck } from "@/lib/growth-os/user-success/readiness-checker"
import type { DailyBriefing, ActionItem, RiskItem, OpportunityItem } from "@/lib/growth-os/user-success/daily-briefing"

// ── Types ────────────────────────────────────────────────────────────────────

interface RevenueMetrics {
  leadsToday:     number
  leadsTotal:     number
  highValueLeads: number
  pendingReviews: number
  activeCampaigns: number
  rolledBack:     number
}

// ── Wizard step definitions ──────────────────────────────────────────────────

const WIZARDS: Record<string, { steps: string[]; url: string; urlLabel: string }> = {
  fix_rolled_back_campaign: {
    steps: [
      "Go to Paid Growth → check deployment status and rollback reason",
      "Ensure your Google Ads account has ₹500+ balance",
      "Verify keyword count meets the 50-keyword minimum threshold",
      "Click 'Re-deploy Campaign' and review the new plan",
      "Approve the campaign plan to push it live",
    ],
    url: "/admin/growth/paid",
    urlLabel: "Open Paid Growth",
  },
  setup_conversion_tracking: {
    steps: [
      "Log into Google Ads → Tools → Conversions → + New Conversion",
      "Create 3 Phase 1 actions: RFQ Submit (Enquiry Form), WhatsApp Click, Phone Call",
      "Copy the AW-XXXXXXXX/XXXXXXXXXXXXX conversion ID for each action",
      "Open GTM container GTM-5JMGCKRW → add 3 conversion tags, one per action",
      "Preview → test each conversion → Publish GTM. Phase 2 (Dealer Application, OEM Authorization) can be added after launch.",
    ],
    url: "/admin/growth/paid",
    urlLabel: "Open Paid Growth Setup",
  },
  setup_gtm: {
    steps: [
      "Log into Google Tag Manager → open container GTM-5JMGCKRW",
      "Go to Vercel Dashboard → your project → Settings → Environment Variables",
      "Add: NEXT_PUBLIC_GTM_CONTAINER_ID = GTM-5JMGCKRW",
      "Redeploy the site on Vercel (push any small change to main)",
      "Verify GTM Preview mode shows tags firing",
    ],
    url: "https://tagmanager.google.com",
    urlLabel: "Open Google Tag Manager",
  },
  review_queue: {
    steps: [
      "Open the Recommendations Queue below",
      "For each recommendation: read the evidence and rationale",
      "Approve items you agree with — they'll be queued for your next action",
      "Reject items you don't want with a reason",
      "Aim to clear the queue weekly",
    ],
    url: "/admin/growth/ads/approval-queue",
    urlLabel: "Open Review Queue",
  },
  activate_campaign: {
    steps: [
      "Log into Google Ads and check account balance",
      "Recharge to at least ₹2,000 to run for 10+ days",
      "Return here and click 'Activate Campaign'",
      "Monitor impressions for the first 48 hours",
    ],
    url: "/admin/growth/paid",
    urlLabel: "Open Paid Growth",
  },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function ago(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 3_600_000)  return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

function statusIcon(status: "ok" | "warning" | "error") {
  if (status === "ok")      return <CheckCircle2 size={14} className="text-green-500 flex-shrink-0" />
  if (status === "warning") return <AlertTriangle size={14} className="text-amber-500 flex-shrink-0" />
  return <XCircle size={14} className="text-red-500 flex-shrink-0" />
}

function tierColor(status: string) {
  if (status === "ready")    return { bar: "bg-green-500",  text: "text-green-600",  bg: "bg-green-50" }
  if (status === "partial")  return { bar: "bg-amber-400",  text: "text-amber-600",  bg: "bg-amber-50" }
  return                            { bar: "bg-red-400",    text: "text-red-600",    bg: "bg-red-50"   }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ReadinessBar({ tier }: { tier: ReadinessTier }) {
  const [open, setOpen] = useState(false)
  const c = tierColor(tier.status)

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-semibold text-gray-900">{tier.label}</span>
            <span className={`text-xs font-bold ${c.text}`}>{tier.score}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full ${c.bar} rounded-full transition-all duration-500`}
              style={{ width: `${tier.score}%` }}
            />
          </div>
          {tier.topBlocker && (
            <p className="text-xs text-gray-500 mt-1 truncate">
              Next: {tier.topBlocker}
            </p>
          )}
        </div>
        {open
          ? <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />
          : <ChevronRight size={14} className="text-gray-400 flex-shrink-0" />
        }
      </button>

      {open && (
        <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 space-y-2">
          <p className="text-xs text-gray-500 mb-2">{tier.description}</p>
          {tier.checks.map(c => <CheckRow key={c.id} check={c} />)}
        </div>
      )}
    </div>
  )
}

function CheckRow({ check }: { check: SetupCheck }) {
  return (
    <div className="flex items-start gap-2 py-1">
      {statusIcon(check.status)}
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-gray-800 leading-snug">{check.label}</div>
        <div className="text-xs text-gray-500 leading-snug mt-0.5">{check.detail}</div>
        {check.evidence.collection && (
          <div className="text-[10px] text-gray-400 mt-0.5">
            Source: {check.evidence.collection}
            {check.evidence.count !== undefined ? ` · ${check.evidence.count} records` : ""}
            {check.evidence.lastSeen ? ` · ${check.evidence.lastSeen}` : ""}
          </div>
        )}
        {check.evidence.value && !check.evidence.collection && (
          <div className="text-[10px] text-gray-400 mt-0.5">Value: {check.evidence.value}</div>
        )}
      </div>
      {check.setupUrl && check.status !== "ok" && (
        <Link
          href={check.setupUrl}
          className="text-[10px] text-brand-600 hover:text-brand-700 font-medium whitespace-nowrap flex-shrink-0"
          target={check.setupUrl.startsWith("http") ? "_blank" : undefined}
        >
          Fix →
        </Link>
      )}
      <span className={`text-[10px] font-bold flex-shrink-0 ${
        check.status === "ok" ? "text-green-600" : check.status === "warning" ? "text-amber-600" : "text-red-600"
      }`}>
        {check.points}/{check.maxPoints}
      </span>
    </div>
  )
}

function ActionCard({ action, index }: { action: ActionItem; index: number }) {
  const [wizardOpen, setWizardOpen] = useState(false)
  const wizard = WIZARDS[action.id]

  const priorityStyle = action.priority === "urgent"
    ? "border-l-red-500 bg-red-50/30"
    : action.priority === "important"
    ? "border-l-amber-400 bg-amber-50/20"
    : "border-l-gray-300 bg-gray-50/30"

  const priorityLabel = action.priority === "urgent" ? "🔴 Urgent"
    : action.priority === "important" ? "🟡 Important"
    : "🔵 This week"

  const effortLabel: Record<string, string> = {
    "5_min": "5 min", "30_min": "30 min", "1_hour": "1 hour", "half_day": "Half day",
  }

  return (
    <div className={`border border-l-4 rounded-xl overflow-hidden ${priorityStyle}`}>
      <div className="px-4 py-3">
        <div className="flex items-start gap-3">
          <span className="text-xl flex-shrink-0">{index === 0 ? "1️⃣" : index === 1 ? "2️⃣" : index === 2 ? "3️⃣" : index === 3 ? "4️⃣" : "5️⃣"}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-[10px] font-semibold text-gray-500">{priorityLabel}</span>
              <span className="text-[10px] text-gray-400">·</span>
              <Clock size={10} className="text-gray-400" />
              <span className="text-[10px] text-gray-400">{effortLabel[action.effort] ?? action.effort}</span>
            </div>
            <h3 className="text-sm font-semibold text-gray-900 leading-snug">{action.title}</h3>
            <p className="text-xs text-gray-600 mt-1 leading-relaxed">
              <strong>Why this matters:</strong> {action.why}
            </p>
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
              <strong>Evidence:</strong> {action.evidence}
            </p>
            <p className="text-xs text-green-700 mt-0.5 leading-relaxed">
              <strong>Expected result:</strong> {action.expectedOutcome}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3">
          {wizard && (
            <button
              onClick={() => setWizardOpen(o => !o)}
              className="text-xs font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              {wizardOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
              {wizardOpen ? "Hide steps" : "How to fix this"}
            </button>
          )}
          <Link
            href={action.actionUrl}
            className="ml-auto flex items-center gap-1 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 px-3 py-1.5 rounded-lg transition-colors"
          >
            Go <ArrowRight size={11} />
          </Link>
        </div>

        {wizard && wizardOpen && (
          <div className="mt-3 border-t border-gray-200 pt-3">
            <p className="text-xs font-semibold text-gray-700 mb-2">Step-by-step guide:</p>
            <ol className="space-y-1.5">
              {wizard.steps.map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                  <span className="flex-shrink-0 w-4 h-4 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-[10px] font-bold mt-0.5">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
            {wizard.url.startsWith("http") ? (
              <a
                href={wizard.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium"
              >
                {wizard.urlLabel} <ExternalLink size={10} />
              </a>
            ) : (
              <Link
                href={wizard.url}
                className="mt-2 flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium"
              >
                {wizard.urlLabel} <ArrowRight size={10} />
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function RiskBadge({ risk }: { risk: RiskItem }) {
  const s = risk.severity === "critical"
    ? { bg: "bg-red-50 border-red-200", icon: "🔴", label: "Critical" }
    : risk.severity === "high"
    ? { bg: "bg-orange-50 border-orange-200", icon: "🟠", label: "High" }
    : { bg: "bg-amber-50 border-amber-200", icon: "🟡", label: "Medium" }
  return (
    <div className={`border rounded-lg px-3 py-2 ${s.bg}`}>
      <div className="flex items-center gap-2 mb-0.5">
        <span className="text-xs">{s.icon}</span>
        <span className="text-xs font-semibold text-gray-800">{risk.title}</span>
        <span className={`text-[10px] font-bold ml-auto ${
          risk.severity === "critical" ? "text-red-600" : risk.severity === "high" ? "text-orange-600" : "text-amber-600"
        }`}>{s.label}</span>
      </div>
      <p className="text-xs text-gray-600">{risk.description}</p>
      <p className="text-xs text-gray-500 mt-0.5"><strong>Fix:</strong> {risk.mitigation}</p>
    </div>
  )
}

function OppCard({ opp }: { opp: OpportunityItem }) {
  return (
    <div className="border border-green-200 rounded-lg px-3 py-2 bg-green-50/50">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-green-800">{opp.title}</p>
          <p className="text-xs text-gray-600 mt-0.5">{opp.description}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">Evidence: {opp.evidence}</p>
        </div>
        {opp.actionUrl && (
          <Link href={opp.actionUrl} className="text-xs text-green-700 hover:text-green-800 font-medium flex-shrink-0">
            Review →
          </Link>
        )}
      </div>
    </div>
  )
}

function RevenueTracker({ metrics }: { metrics: RevenueMetrics }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {[
        {
          icon: <Users size={14} className="text-blue-500" />,
          label: "Leads today",
          value: String(metrics.leadsToday),
          sub: `${metrics.leadsTotal} total`,
          alert: metrics.leadsToday === 0,
        },
        {
          icon: <Target size={14} className="text-purple-500" />,
          label: "High-value leads",
          value: String(metrics.highValueLeads),
          sub: "dealer / OEM / govt",
          alert: metrics.highValueLeads === 0,
        },
        {
          icon: <Bell size={14} className="text-amber-500" />,
          label: "Awaiting review",
          value: String(metrics.pendingReviews),
          sub: "recommendations",
          alert: metrics.pendingReviews > 0,
        },
        {
          icon: <Activity size={14} className="text-green-500" />,
          label: "Active campaigns",
          value: String(metrics.activeCampaigns),
          sub: metrics.rolledBack > 0 ? `${metrics.rolledBack} rolled back` : "running",
          alert: metrics.activeCampaigns === 0,
        },
      ].map(item => (
        <div
          key={item.label}
          className={`border rounded-xl p-3 ${item.alert ? "border-amber-200 bg-amber-50/30" : "border-gray-200 bg-white"}`}
        >
          <div className="flex items-center gap-1.5 mb-1">
            {item.icon}
            <span className="text-[10px] text-gray-500 font-medium">{item.label}</span>
          </div>
          <div className={`text-xl font-bold ${item.alert ? "text-amber-600" : "text-gray-900"}`}>
            {item.value}
          </div>
          <div className="text-[10px] text-gray-400">{item.sub}</div>
        </div>
      ))}
    </div>
  )
}

const ADVANCED_TOOLS = [
  { href: "/admin/growth/seo",            label: "SEO Command Center",   icon: Search },
  { href: "/admin/growth/analytics",      label: "GA4 Analytics",        icon: BarChart3 },
  { href: "/admin/growth/geo",            label: "AI Search (GEO)",      icon: Bot },
  { href: "/admin/growth/competitors",    label: "Competitor Intel",     icon: Shield },
  { href: "/admin/growth/opportunities",  label: "Opportunity Engine",   icon: TrendingUp },
  { href: "/admin/growth/content",        label: "Content Factory",      icon: FileText },
  { href: "/admin/growth/procurement",    label: "Procurement Intel",    icon: ShoppingBag },
  { href: "/admin/growth/dealers",        label: "Dealer Intelligence",  icon: Users },
  { href: "/admin/growth/ads",            label: "Google Ads Intel",     icon: Megaphone },
  { href: "/admin/growth/automation",     label: "Automation Center",    icon: Settings },
  { href: "/admin/growth/logs",           label: "Activity Logs",        icon: MessageSquare },
  { href: "/admin/growth/paid",           label: "Paid Growth",          icon: DollarSign },
]

// ── Main page ─────────────────────────────────────────────────────────────────

export default function FounderModePage() {
  const [readiness, setReadiness] = useState<ReadinessResult | null>(null)
  const [briefing,  setBriefing]  = useState<DailyBriefing | null>(null)
  const [metrics,   setMetrics]   = useState<RevenueMetrics | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (force = false) => {
    try {
      if (force) setRefreshing(true)
      else setLoading(true)

      const [r, b] = await Promise.all([
        fetch("/api/admin/growth/readiness").then(r => r.json()),
        fetch("/api/admin/growth/daily-briefing", {
          method:  force ? "POST" : "GET",
          headers: { "Content-Type": "application/json" },
        }).then(r => r.json()),
      ])

      setReadiness(r)
      const br = b.briefing ?? b
      setBriefing(br)

      // Build revenue metrics from briefing data
      setMetrics({
        leadsToday:      0,  // will be updated from briefing when available
        leadsTotal:      0,
        highValueLeads:  0,
        pendingReviews:  (br?.opportunities?.[0]?.evidence?.match(/\d+/) ?? ["0"])[0] as unknown as number,
        activeCampaigns: 0,
        rolledBack:      0,
      })

      // Derive metrics from readiness checks
      if (r?.revenue?.checks) {
        const campCheck = r.revenue.checks.find((c: SetupCheck) => c.id === "campaign")
        const leadCheck = r.revenue.checks.find((c: SetupCheck) => c.id === "lead_flow")
        const appCheck  = r.revenue.checks.find((c: SetupCheck) => c.id === "approvals")
        setMetrics({
          leadsToday:      0,
          leadsTotal:      leadCheck?.evidence?.count ?? 0,
          highValueLeads:  0,
          pendingReviews:  appCheck?.evidence?.count ?? 0,
          activeCampaigns: campCheck?.status === "ok" ? (campCheck.evidence?.count ?? 1) : 0,
          rolledBack:      campCheck?.status === "error" && campCheck.detail?.includes("rolled back") ? 1 : 0,
        })
      }

      setError(null)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <Zap size={24} className="text-brand-600 mx-auto mb-3 animate-pulse" />
          <p className="text-sm text-gray-500">Loading your business dashboard…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-sm">
          <XCircle size={24} className="text-red-500 mx-auto mb-3" />
          <p className="text-sm text-gray-800 font-medium mb-1">Something went wrong</p>
          <p className="text-xs text-gray-500 mb-4">{error}</p>
          <button onClick={() => load()} className="text-xs text-brand-600 hover:text-brand-700">Try again</button>
        </div>
      </div>
    )
  }

  const overallScore  = readiness?.overallScore ?? 0
  const overallStatus = readiness?.overall ?? "not_ready"
  const overallLabel  = overallStatus === "ready" ? "System Ready" : overallStatus === "partial" ? "Partially Set Up" : "Setup Incomplete"
  const topActions    = briefing?.topActions ?? []
  const risks         = briefing?.risks ?? []
  const opportunities = briefing?.opportunities ?? []

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-lg font-bold text-gray-900">Your Business Dashboard</h1>
              <p className="text-xs text-gray-500 mt-0.5">{today}</p>
            </div>
            <button
              onClick={() => load(true)}
              disabled={refreshing}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-2.5 py-1.5 transition-colors"
            >
              <RefreshCw size={11} className={refreshing ? "animate-spin" : ""} />
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
          </div>

          {/* Overall score */}
          <div className="mt-4 flex items-center gap-4">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-lg ${
              overallStatus === "ready"   ? "bg-green-100 text-green-700" :
              overallStatus === "partial" ? "bg-amber-100 text-amber-700" :
                                           "bg-red-100 text-red-600"
            }`}>
              {overallScore}%
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">{overallLabel}</div>
              <div className="text-xs text-gray-500 mt-0.5">
                {overallStatus === "ready"
                  ? "All systems operational. Focus on campaign performance."
                  : overallStatus === "partial"
                  ? "Some systems need attention. See actions below."
                  : "Critical setup items are incomplete. Start with Action #1."
                }
              </div>
            </div>
          </div>

          {briefing?.generatedAt && (
            <p className="text-[10px] text-gray-400 mt-3">
              Last updated {ago(briefing.generatedAt)}
            </p>
          )}
        </div>

        {/* ── Revenue Operations ─────────────────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">Revenue Operations</h2>
          {metrics && <RevenueTracker metrics={metrics} />}
        </section>

        {/* ── Readiness Tiers ────────────────────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">
            System Health — click to expand
          </h2>
          <div className="space-y-2">
            {readiness?.setup   && <ReadinessBar tier={readiness.setup}   />}
            {readiness?.data    && <ReadinessBar tier={readiness.data}    />}
            {readiness?.revenue && <ReadinessBar tier={readiness.revenue} />}
          </div>
        </section>

        {/* ── Today's Actions ────────────────────────────────────────────────── */}
        {topActions.length > 0 && (
          <section>
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">
              Your Actions Today
            </h2>
            <div className="space-y-3">
              {topActions.map((action, i) => (
                <ActionCard key={action.id} action={action} index={i} />
              ))}
            </div>
          </section>
        )}

        {/* ── Risks ──────────────────────────────────────────────────────────── */}
        {risks.length > 0 && (
          <section>
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">Active Risks</h2>
            <div className="space-y-2">
              {risks.map((r, i) => <RiskBadge key={i} risk={r} />)}
            </div>
          </section>
        )}

        {/* ── Opportunities ──────────────────────────────────────────────────── */}
        {opportunities.length > 0 && (
          <section>
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">Opportunities</h2>
            <div className="space-y-2">
              {opportunities.map((o, i) => <OppCard key={i} opp={o} />)}
            </div>
          </section>
        )}

        {/* ── What Changed ───────────────────────────────────────────────────── */}
        {(briefing?.whatChanged ?? []).length > 0 && (
          <section>
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">What Changed</h2>
            <div className="border border-gray-200 rounded-xl bg-white divide-y divide-gray-100">
              {(briefing?.whatChanged ?? []).map((c, i) => (
                <div key={i} className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-800">{c.what}</span>
                    <span className="text-[10px] text-gray-400 ml-auto">{c.when}</span>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-0.5">{c.impact}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Advanced Tools ─────────────────────────────────────────────────── */}
        <section className="border border-gray-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setAdvancedOpen(o => !o)}
            className="w-full flex items-center gap-2 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
          >
            <Settings size={13} className="text-gray-400" />
            <span className="text-xs font-semibold text-gray-600">Advanced Tools</span>
            <span className="text-[10px] text-gray-400 ml-1">— For technical setup and detailed analysis</span>
            {advancedOpen
              ? <ChevronDown size={13} className="text-gray-400 ml-auto" />
              : <ChevronRight size={13} className="text-gray-400 ml-auto" />
            }
          </button>
          {advancedOpen && (
            <div className="border-t border-gray-200 px-4 py-3 bg-white">
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {ADVANCED_TOOLS.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-100 hover:border-brand-200 hover:bg-brand-50 transition-colors group"
                  >
                    <Icon size={12} className="text-gray-400 group-hover:text-brand-500 flex-shrink-0" />
                    <span className="text-xs text-gray-600 group-hover:text-brand-700 leading-tight">{label}</span>
                  </Link>
                ))}
              </div>
              <p className="text-[10px] text-gray-400 mt-3 border-t border-gray-100 pt-2">
                These tools require technical knowledge of Google Ads, GTM, and analytics systems.
                All important actions are surfaced automatically in this dashboard.
              </p>
            </div>
          )}
        </section>

        {/* ── Footer ─────────────────────────────────────────────────────────── */}
        <div className="text-center pb-6">
          <p className="text-[10px] text-gray-400">
            Growth OS · {readiness?.checkedAt ? `Readiness checked ${ago(readiness.checkedAt)}` : ""}
          </p>
        </div>
      </div>
    </div>
  )
}
