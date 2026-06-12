"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import {
  RefreshCw, ExternalLink, TrendingUp, AlertCircle,
  ChevronDown, ChevronRight, CheckCircle2, Circle,
  Clock, Lock, ArrowRight,
} from "lucide-react"

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface NextAction {
  id:          string
  title:       string
  description: string
  cta:         string
  ctaUrl:      string
  urgency:     "critical" | "high" | "normal"
  external:    boolean
}

interface FounderV2 {
  revenue: {
    revenueToday:         number
    leadsToday:           number
    dealerLeadsThisMonth: number
    oemLeadsThisMonth:    number
    adSpendToday:         number
    costPerLead:          number | null
  }
  campaign: { status: string; live: boolean }
  funnel: {
    impressions:   number
    clicks:        number
    landingVisits: null
    rfqs:          number
    dealerLeads:   number
    oemLeads:      number
    clickRate:     number | null
    convRate:      number | null
    bottleneck:    string | null
  }
  milestones: {
    firstPaidClick:      boolean
    firstAttributedLead: boolean
    firstDealerLead:     boolean
    firstOEMLead:        boolean
  }
  nextAction: NextAction
  checkedAt:  string
}

interface SetupCheck {
  id:        string
  label:     string
  detail:    string
  status:    "ok" | "warning" | "error"
  evidence:  { collection?: string; count?: number; value?: string; lastSeen?: string }
  setupUrl?: string
  points:    number
  maxPoints: number
}

interface ReadinessTier {
  id:          "setup" | "data" | "revenue"
  label:       string
  description: string
  score:       number
  status:      "ready" | "partial" | "not_ready"
  checks:      SetupCheck[]
  topBlocker:  string | null
}

interface ReadinessResult {
  overallScore: number
  overall:      "ready" | "partial" | "not_ready"
  setup:        ReadinessTier
  data:         ReadinessTier
  revenue:      ReadinessTier
  nextActions:  Array<{ action: string; why: string; impact: "high" | "medium" | "low"; effort: string; setupUrl?: string }>
  checkedAt:    string
}

// ══════════════════════════════════════════════════════════════════════════════
// UTILS
// ══════════════════════════════════════════════════════════════════════════════

function ago(iso: string) {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60)   return `${s}s ago`
  if (s < 3600) return `${Math.round(s / 60)}m ago`
  return `${Math.round(s / 3600)}h ago`
}

function pct(num: number, denom: number): string {
  if (denom === 0) return "—"
  return `${((num / denom) * 100).toFixed(1)}%`
}

function fmtINR(n: number | null): string {
  if (n === null || n === 0) return "—"
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000)   return `₹${(n / 1000).toFixed(1)}k`
  return `₹${Math.round(n)}`
}

function findCheck(tier: ReadinessTier, id: string): SetupCheck | undefined {
  return tier.checks.find(c => c.id === id)
}

// ══════════════════════════════════════════════════════════════════════════════
// REVENUE TILE
// ══════════════════════════════════════════════════════════════════════════════

function Tile({ label, sub, value, highlight }: {
  label: string; sub?: string; value: string | number; highlight?: boolean
}) {
  const isEmpty = value === 0 || value === "0" || value === null || value === "—"
  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-1 ${
      highlight ? "bg-brand-50 border-brand-200" : "bg-white border-gray-200"
    }`}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 leading-tight">
        {label}
        {sub && <span className="block normal-case font-normal text-gray-300">{sub}</span>}
      </p>
      <p className={`text-2xl font-bold leading-none ${
        isEmpty ? "text-gray-200" : highlight ? "text-brand-600" : "text-gray-900"
      }`}>
        {isEmpty ? "—" : value}
      </p>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION A — FOUNDER JOURNEY
// ══════════════════════════════════════════════════════════════════════════════

type StageStatus = "done" | "active" | "blocked" | "pending"

interface JourneyStage {
  id:     string
  label:  string
  desc:   string
  status: StageStatus
  url:    string
}

function deriveJourney(r: ReadinessResult): JourneyStage[] {
  const gtm      = findCheck(r.setup,    "gtm")
  const gAds     = findCheck(r.setup,    "google_ads")
  const conv     = findCheck(r.setup,    "conversion")
  const leads    = findCheck(r.data,     "leads")
  const stRows   = findCheck(r.data,     "search_terms")
  const intel    = findCheck(r.data,     "intelligence")
  const budget   = findCheck(r.revenue,  "budget")
  const campaign = findCheck(r.revenue,  "campaign")
  const approvs  = findCheck(r.revenue,  "approvals")
  const leadFlow = findCheck(r.revenue,  "lead_flow")

  // Attribution proxy: conversion tracking + any search term data
  const attrRaw: SetupCheck["status"] =
    conv?.status === "ok" && (stRows?.points ?? 0) >= 12 ? "ok" :
    conv?.status === "error" ? "error" : "warning"

  // Scaling: all tiers healthy
  const scalingRaw: SetupCheck["status"] =
    r.overallScore >= 75 ? "ok" : r.overallScore >= 50 ? "warning" : "error"

  const raw = [
    { id: "infra",     label: "Infrastructure",     desc: "Website, forms, GTM tracking foundation",    s: gtm?.status      ?? "error", url: "https://tagmanager.google.com" },
    { id: "ads_conn",  label: "Ads Connection",      desc: "Google Ads API and account linked",          s: gAds?.status     ?? "error", url: "/admin/growth/paid" },
    { id: "leads",     label: "Lead Collection",     desc: "RFQ and enquiry forms capturing leads",      s: leads?.status    ?? "error", url: "/admin/growth/contact-this-week" },
    { id: "attr",      label: "Attribution",         desc: "Leads linked to keywords and campaigns",     s: attrRaw,                     url: "/admin/growth/ads/revenue" },
    { id: "revenue",   label: "Revenue Tracking",    desc: "Deals marked Won with revenue values",       s: leadFlow?.status ?? "error", url: "/admin/growth/ads/revenue" },
    { id: "mi",        label: "Market Intelligence", desc: "AI scoring keywords, states, products",      s: intel?.status    ?? "error", url: "/admin/growth/market-intelligence" },
    { id: "budget",    label: "Budget Allocation",   desc: "Data-driven spend strategy approved",        s: budget?.status   ?? "error", url: "/admin/growth/ads/approval-queue" },
    { id: "factory",   label: "Campaign Factory",    desc: "Campaigns deployed and serving",             s: campaign?.status ?? "error", url: "/admin/growth/ads/campaign-factory" },
    { id: "approvals", label: "Approval Queue",      desc: "Recommendations reviewed regularly",         s: approvs?.status  ?? "error", url: "/admin/growth/ads/approval-queue" },
    { id: "scaling",   label: "Scaling",             desc: "All systems healthy, budget increasing",     s: scalingRaw,                  url: "/admin/growth/ads/director" },
  ]

  const activeIdx = raw.findIndex(st => st.s !== "ok")

  return raw.map((st, i) => ({
    id:     st.id,
    label:  st.label,
    desc:   st.desc,
    url:    st.url,
    status: st.s === "ok"       ? "done"
          : i === activeIdx     ? "active"
          : st.s === "error"    ? "blocked"
          : "pending",
  }))
}

function JourneySection({ r }: { r: ReadinessResult }) {
  const stages    = deriveJourney(r)
  const doneCount = stages.filter(s => s.status === "done").length
  const active    = stages.find(s => s.status === "active")

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-bold text-gray-900">Founder Journey</h3>
        <span className="text-[11px] text-gray-400">{doneCount}/{stages.length} stages</span>
      </div>
      {active && (
        <p className="text-[11px] text-amber-600 mb-3">Current stage: {active.label}</p>
      )}
      <div className="w-full h-1.5 bg-gray-100 rounded-full mb-4">
        <div className="h-full bg-brand-500 rounded-full transition-all"
          style={{ width: `${(doneCount / stages.length) * 100}%` }} />
      </div>

      <div className="relative">
        <div className="absolute left-[11px] top-4 bottom-4 w-px bg-gray-100" />
        <div className="space-y-1.5">
          {stages.map((stage, i) => (
            <div key={stage.id} className="flex items-start gap-3">
              <div className={`relative z-10 mt-1 w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center ${
                stage.status === "done"    ? "bg-green-500" :
                stage.status === "active"  ? "bg-amber-500" :
                stage.status === "blocked" ? "bg-red-400" :
                "bg-gray-200"
              }`}>
                {stage.status === "done"    && <CheckCircle2 size={12} className="text-white" />}
                {stage.status === "active"  && <ArrowRight   size={10} className="text-white" />}
                {stage.status === "blocked" && <span className="text-[9px] text-white font-bold">!</span>}
                {stage.status === "pending" && <Lock size={9} className="text-gray-400" />}
              </div>

              <div className={`flex-1 min-w-0 flex items-center justify-between px-3 py-2 rounded-lg ${
                stage.status === "active"  ? "bg-amber-50 border border-amber-200" :
                stage.status === "blocked" ? "bg-red-50 border border-red-100" : ""
              }`}>
                <div className="min-w-0">
                  <p className={`text-xs font-semibold leading-tight ${
                    stage.status === "done"    ? "text-gray-400 line-through" :
                    stage.status === "active"  ? "text-amber-900" :
                    stage.status === "blocked" ? "text-red-700" :
                    "text-gray-400"
                  }`}>
                    {i + 1}. {stage.label}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{stage.desc}</p>
                </div>
                {stage.status === "active" && (
                  <Link href={stage.url}
                    className="ml-3 flex-shrink-0 text-[11px] text-amber-700 hover:text-amber-900 font-semibold flex items-center gap-0.5">
                    Fix <ChevronRight size={10} />
                  </Link>
                )}
                {stage.status === "blocked" && (
                  <span className="ml-3 flex-shrink-0 text-[10px] text-red-500 font-semibold">BLOCKED</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION B — GUIDED NEXT ACTION
// ══════════════════════════════════════════════════════════════════════════════

const FIX_TIMES: Record<string, string> = {
  fund:            "5 minutes",
  conversions:     "30 minutes",
  gtm:             "10 minutes",
  enable:          "2 minutes",
  oem_followup:    "Immediately",
  dealer_followup: "Within 2 hours",
  not_serving:     "20 minutes",
  high_cpl:        "15 minutes",
  approvals:       "5 minutes",
  low_ctr:         "20 minutes",
  no_conversion:   "30 minutes",
  monitor:         "No action needed",
}

function GuidedActionCard({ action }: { action: NextAction }) {
  const isHealthy = action.id === "monitor"
  const fixTime   = FIX_TIMES[action.id] ?? "15 minutes"

  const s = action.urgency === "critical"
    ? { wrap: "border-red-300 bg-red-50",    badge: "bg-red-100 text-red-700",    label: "CRITICAL BLOCKER", btn: "bg-red-600 hover:bg-red-700 text-white",    tag: "text-red-600" }
    : action.urgency === "high"
    ? { wrap: "border-amber-300 bg-amber-50", badge: "bg-amber-100 text-amber-700", label: "ACTION NEEDED",    btn: "bg-amber-600 hover:bg-amber-700 text-white", tag: "text-amber-600" }
    : { wrap: "border-green-200 bg-green-50", badge: "bg-green-100 text-green-700", label: "SYSTEM HEALTHY",   btn: "bg-brand-600 hover:bg-brand-700 text-white", tag: "text-green-600" }

  return (
    <div className={`rounded-2xl border-2 p-6 ${s.wrap}`}>
      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mb-4 ${s.badge}`}>
        {s.label}
      </span>

      <div className="space-y-3">
        <div>
          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">
            {isHealthy ? "Status" : "Current Blocker"}
          </p>
          <h2 className="text-lg font-bold text-gray-900 leading-snug">{action.title}</h2>
        </div>

        <div>
          <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Why It Matters</p>
          <p className="text-sm text-gray-700">{action.description}</p>
        </div>

        <div className="flex items-end justify-between gap-4">
          {!isHealthy && (
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Estimated Fix Time</p>
              <p className={`text-sm font-semibold flex items-center gap-1.5 ${s.tag}`}>
                <Clock size={13} />{fixTime}
              </p>
            </div>
          )}
          <div className={isHealthy ? "" : "ml-auto"}>
            {action.external ? (
              <a href={action.ctaUrl} target="_blank" rel="noopener noreferrer"
                className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${s.btn}`}>
                {isHealthy ? action.cta : "Open Fix Guide"} <ExternalLink size={13} />
              </a>
            ) : (
              <Link href={action.ctaUrl}
                className={`inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${s.btn}`}>
                {isHealthy ? action.cta : "Open Fix Guide"} <ChevronRight size={13} />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// REVENUE FUNNEL (unchanged)
// ══════════════════════════════════════════════════════════════════════════════

interface FunnelStage { id: string; label: string; value: number; through?: string }

function FunnelBar({ stage, max, isBottleneck }: { stage: FunnelStage; max: number; isBottleneck: boolean }) {
  const width = max > 0 ? Math.max((stage.value / max) * 100, stage.value > 0 ? 2 : 0) : 0
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="w-36 flex-shrink-0 text-right">
        <span className={`text-xs font-medium ${isBottleneck ? "text-red-600" : "text-gray-500"}`}>
          {stage.label}
        </span>
      </div>
      <div className="flex-1 min-w-0 relative h-7">
        <div className="absolute inset-0 bg-gray-100 rounded-md overflow-hidden">
          <div className={`h-full rounded-md transition-all duration-500 ${isBottleneck ? "bg-red-400" : "bg-brand-500"}`}
            style={{ width: `${width}%` }} />
        </div>
        {isBottleneck && (
          <span className="absolute right-1 top-1 text-[9px] font-bold text-red-500 leading-none">← drop-off</span>
        )}
      </div>
      <div className="w-24 flex-shrink-0">
        <span className={`text-sm font-bold tabular-nums ${stage.value === 0 ? "text-gray-200" : isBottleneck ? "text-red-700" : "text-gray-800"}`}>
          {stage.value.toLocaleString()}
        </span>
        {stage.through && <span className="block text-[10px] text-gray-400">{stage.through} CTR</span>}
      </div>
    </div>
  )
}

function FunnelChart({ funnel }: { funnel: FounderV2["funnel"] }) {
  const stages: FunnelStage[] = [
    { id: "impressions", label: "Impressions",  value: funnel.impressions },
    { id: "clicks",      label: "Clicks",       value: funnel.clicks,      through: pct(funnel.clicks, funnel.impressions) },
    { id: "rfqs",        label: "RFQ Submits",  value: funnel.rfqs,        through: pct(funnel.rfqs, funnel.clicks) },
    { id: "dealerLeads", label: "Dealer Leads", value: funnel.dealerLeads, through: pct(funnel.dealerLeads, funnel.rfqs) },
    { id: "oemLeads",    label: "OEM Leads",    value: funnel.oemLeads,    through: pct(funnel.oemLeads, funnel.rfqs) },
  ]
  const max     = funnel.impressions || 1
  const allZero = funnel.impressions === 0

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-800">Revenue Funnel</h3>
        <span className="text-[11px] text-gray-400">today</span>
      </div>
      {allZero ? (
        <div className="py-8 text-center">
          <TrendingUp size={28} className="text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-400">Funnel populates once the campaign is serving</p>
        </div>
      ) : (
        <div className="space-y-0.5">
          {stages.map(stage => (
            <FunnelBar key={stage.id} stage={stage} max={max} isBottleneck={stage.id === funnel.bottleneck} />
          ))}
        </div>
      )}
      {funnel.bottleneck && !allZero && (
        <div className="mt-4 bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-xs text-red-700 flex items-start gap-1.5">
          <AlertCircle size={11} className="mt-0.5 flex-shrink-0" />
          <span>
            Biggest drop-off: <strong>{
              funnel.bottleneck === "clicks"      ? "Impressions → Clicks — ad copy may not match intent" :
              funnel.bottleneck === "rfqs"        ? "Clicks → Form Submits — landing page not converting" :
              funnel.bottleneck === "dealerLeads" ? "Submits → Dealer Leads — review landing page targeting" :
              "Dealer → OEM Leads — OEM pages may need work"
            }</strong>
          </span>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION C — SYSTEM TRANSPARENCY
// ══════════════════════════════════════════════════════════════════════════════

const CHECK_IMPACT: Record<string, string> = {
  google_ads:   "Source of all spend, keyword, and impression data. Without it ROI cannot be calculated.",
  gtm:          "Deploys conversion tags. Without published tags, form submissions are not counted as conversions.",
  gsc:          "Identifies which organic queries drive traffic. Powers SEO keyword and content decisions.",
  conversion:   "Tells Google Ads which keywords produce leads, enabling Smart Bidding to optimise toward revenue.",
  leads:        "Lead volume determines recommendation reliability. Below 20 leads, patterns are statistically weak.",
  keywords:     "Identifies which search terms are most likely to convert, preventing wasted spend.",
  intelligence: "Scores each lead type and geography, enabling precise budget allocation.",
  search_terms: "Reveals actual user queries. Required for negative keyword work and bid adjustments.",
  campaign:     "Prerequisite for all spend, impression, and lead data collection.",
  lead_flow:    "Validates that the acquisition funnel is working end-to-end.",
  approvals:    "Each ignored recommendation reduces Growth OS optimisation effectiveness over time.",
  budget:       "Prevents overspend on underperforming campaigns and underspend on winning ones.",
}

function TransparencySection({ r }: { r: ReadinessResult }) {
  const allChecks = [
    ...r.setup.checks.map(c => ({ ...c, tier: "Setup" })),
    ...r.data.checks.map(c => ({ ...c, tier: "Data" })),
    ...r.revenue.checks.map(c => ({ ...c, tier: "Revenue" })),
  ].filter(c => c.status !== "ok")

  if (allChecks.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-1">System Transparency</h3>
        <p className="text-xs text-green-600">All checks passing — no active recommendations.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-900">System Transparency</h3>
        <p className="text-[11px] text-gray-400">How Growth OS makes each recommendation</p>
      </div>
      <div className="space-y-3">
        {allChecks.map(c => {
          const evidenceParts: string[] = []
          if (c.evidence.collection) evidenceParts.push(`collection: ${c.evidence.collection}`)
          if (c.evidence.count !== undefined) evidenceParts.push(`count: ${c.evidence.count}`)
          if (c.evidence.value) evidenceParts.push(`value: ${c.evidence.value}`)
          if (c.evidence.lastSeen) evidenceParts.push(`last seen: ${c.evidence.lastSeen}`)

          return (
            <div key={c.id} className="border border-gray-100 rounded-lg p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                    c.status === "error" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
                  }`}>{c.tier}</span>
                  <p className="text-xs font-semibold text-gray-800">{c.label}</p>
                </div>
                <span className={`text-[10px] font-semibold flex-shrink-0 ${
                  c.status === "error" ? "text-red-500" : "text-amber-500"
                }`}>
                  {c.status === "error" ? "Low confidence" : "Medium confidence"}
                </span>
              </div>
              <div className="space-y-1.5 text-[11px]">
                <div>
                  <span className="text-[9px] text-gray-400 uppercase tracking-wider font-bold">Data used — </span>
                  <span className="text-gray-600">
                    {evidenceParts.length > 0 ? evidenceParts.join(", ") : "Environment variable check (no DB query)"}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-gray-400 uppercase tracking-wider font-bold">Logic — </span>
                  <span className="text-gray-600">{c.detail}</span>
                </div>
                <div>
                  <span className="text-[9px] text-gray-400 uppercase tracking-wider font-bold">Business impact — </span>
                  <span className="text-gray-600">{CHECK_IMPACT[c.id] ?? "Affects Growth OS accuracy."}</span>
                </div>
              </div>
              {c.setupUrl && (
                <div className="mt-3">
                  {c.setupUrl.startsWith("http") ? (
                    <a href={c.setupUrl} target="_blank" rel="noopener noreferrer"
                      className="text-[11px] text-brand-600 hover:text-brand-700 flex items-center gap-1">
                      Fix this issue <ExternalLink size={10} />
                    </a>
                  ) : (
                    <Link href={c.setupUrl}
                      className="text-[11px] text-brand-600 hover:text-brand-700 flex items-center gap-1">
                      Fix this issue <ChevronRight size={10} />
                    </Link>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION D — REMARKETING AUDIT
// ══════════════════════════════════════════════════════════════════════════════

function RemarketingSection({ r }: { r: ReadinessResult }) {
  const gtmCheck  = findCheck(r.setup,   "gtm")
  const gadsCheck = findCheck(r.setup,   "google_ads")
  const campCheck = findCheck(r.revenue, "campaign")

  const items = [
    {
      label:    "Remarketing Tag Installed",
      status:   gtmCheck?.status === "ok" ? "partial" : "unknown",
      reason:   gtmCheck?.status === "ok"
        ? "GTM container is installed and firing. A Google Ads Remarketing tag must be configured inside GTM — Growth OS cannot verify individual tag IDs without GTM API access."
        : "GTM is not fully configured. Install GTM first, then add a Google Ads Remarketing tag inside it.",
      codePath: "app/layout.tsx → GTM-5JMGCKRW → Google Ads Remarketing Tag (requires manual GTM verification)",
      setupUrl: "https://tagmanager.google.com",
      external: true,
    },
    {
      label:    "GA4 Audiences Working",
      status:   "unknown",
      reason:   "Growth OS does not query the GA4 Data API. GA4 audience creation and status cannot be verified from here.",
      codePath: "Requires GA4 Data API → audience_export endpoint → not yet implemented in Growth OS",
      setupUrl: "https://analytics.google.com",
      external: true,
    },
    {
      label:    "Google Ads Audience Sync Working",
      status:   gadsCheck?.status === "ok" ? "partial" : "unknown",
      reason:   gadsCheck?.status === "ok"
        ? "Google Ads API is connected. Audience list sync status requires querying UserListService — not yet implemented in Growth OS."
        : "Google Ads API not connected. Connect it first, then verify audience sync.",
      codePath: "Requires Google Ads API → UserListService → not yet implemented in Growth OS",
      setupUrl: gadsCheck?.setupUrl ?? "/admin/growth/paid",
      external: false,
    },
    {
      label:    "Audience Size",
      status:   "unknown",
      reason:   "Audience size requires Google Ads Customer Match or Website Visitor list data. Growth OS does not yet query this endpoint.",
      codePath: "Requires Google Ads API → UserListService.size_for_display → not implemented",
      setupUrl: "https://ads.google.com/aw/audiences",
      external: true,
    },
    {
      label:    "Remarketing Campaign Exists",
      status:   campCheck?.status === "ok" ? "partial" : "none",
      reason:   campCheck?.status === "ok"
        ? "At least one campaign is deployed. A dedicated remarketing campaign (targeting past website visitors) has not been verified separately — ads_deployments does not track campaign type yet."
        : "No campaigns currently active. Deploy a standard acquisition campaign first, then create a remarketing campaign.",
      codePath: "ads_deployments collection → campaignType field → 'remarketing' value not yet stored",
      setupUrl: "/admin/growth/ads/campaign-factory",
      external: false,
    },
  ]

  const verifiedOk  = items.filter(i => i.status === "ok" || i.status === "partial").length
  const readinessPct = Math.round((verifiedOk / items.length) * 100)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-900">Remarketing Audit</h3>
        <span className="text-[11px] text-gray-400">{readinessPct}% verified</span>
      </div>
      <div className="space-y-2.5">
        {items.map(item => (
          <div key={item.label} className={`rounded-lg border p-3 ${
            item.status === "ok"      ? "border-green-200 bg-green-50" :
            item.status === "partial" ? "border-amber-200 bg-amber-50" :
            item.status === "none"    ? "border-red-100 bg-red-50" :
            "border-gray-100 bg-gray-50"
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-semibold text-gray-800">{item.label}</p>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                item.status === "ok"      ? "bg-green-100 text-green-700" :
                item.status === "partial" ? "bg-amber-100 text-amber-700" :
                item.status === "none"    ? "bg-red-100 text-red-600" :
                "bg-gray-100 text-gray-500"
              }`}>
                {item.status === "ok" ? "VERIFIED" :
                 item.status === "partial" ? "PARTIAL" :
                 item.status === "none" ? "NOT SET UP" : "NOT VERIFIED"}
              </span>
            </div>
            <p className="text-[11px] text-gray-600 mb-1">{item.reason}</p>
            <p className="text-[10px] text-gray-400 font-mono mb-1.5">{item.codePath}</p>
            {item.external ? (
              <a href={item.setupUrl} target="_blank" rel="noopener noreferrer"
                className="text-[11px] text-brand-600 hover:text-brand-700 flex items-center gap-1">
                Open <ExternalLink size={10} />
              </a>
            ) : (
              <Link href={item.setupUrl}
                className="text-[11px] text-brand-600 hover:text-brand-700 flex items-center gap-1">
                Open <ChevronRight size={10} />
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION E — TRUST CENTER
// ══════════════════════════════════════════════════════════════════════════════

function TrustBar({ points, maxPoints }: { points: number; maxPoints: number }) {
  const p = maxPoints > 0 ? (points / maxPoints) * 100 : 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${p >= 80 ? "bg-green-500" : p >= 50 ? "bg-amber-500" : "bg-red-400"}`}
          style={{ width: `${p}%` }} />
      </div>
      <span className="text-[10px] text-gray-400 font-mono flex-shrink-0 w-10 text-right">
        {points}/{maxPoints}
      </span>
    </div>
  )
}

function TrustCenterSection({ r }: { r: ReadinessResult }) {
  const adsCheck   = findCheck(r.setup,   "google_ads")  ?? { points: 0, maxPoints: 25, label: "" }
  const convCheck  = findCheck(r.setup,   "conversion")  ?? { points: 0, maxPoints: 25, label: "" }
  const gscCheck   = findCheck(r.setup,   "gsc")         ?? { points: 0, maxPoints: 25, label: "" }
  const intelCheck = findCheck(r.data,    "intelligence") ?? { points: 0, maxPoints: 25, label: "" }
  const kwCheck    = findCheck(r.data,    "keywords")    ?? { points: 0, maxPoints: 25, label: "" }
  const leadsCheck = findCheck(r.data,    "leads")       ?? { points: 0, maxPoints: 25, label: "" }
  const stCheck    = findCheck(r.data,    "search_terms")?? { points: 0, maxPoints: 25, label: "" }

  const scores = [
    {
      name:  "Google Ads Trust",
      score: Math.round((adsCheck.points + convCheck.points) / (adsCheck.maxPoints + convCheck.maxPoints) * 100),
      components: [
        { label: "API connection & customer ID",  points: adsCheck.points,  max: adsCheck.maxPoints,  note: adsCheck.points > 0  ? "Connected" : "Set GOOGLE_ADS_DEVELOPER_TOKEN in Vercel" },
        { label: "Conversion actions configured", points: convCheck.points, max: convCheck.maxPoints, note: convCheck.points > 0 ? "Configured" : "Create 3 conversion actions in Google Ads" },
      ],
    },
    {
      name:  "Attribution Trust",
      score: Math.round((leadsCheck.points + stCheck.points) / (leadsCheck.maxPoints + stCheck.maxPoints) * 100),
      components: [
        { label: "Lead pipeline volume (90d)",   points: leadsCheck.points, max: leadsCheck.maxPoints, note: "Reflects lead count sufficiency for statistical reliability" },
        { label: "Search term data imported",    points: stCheck.points,    max: stCheck.maxPoints,    note: stCheck.points > 0 ? "Data present" : "No search term rows — run Google Ads sync" },
      ],
    },
    {
      name:  "SEO Trust",
      score: Math.round(gscCheck.points / gscCheck.maxPoints * 100),
      components: [
        { label: "Search Console connected & synced", points: gscCheck.points, max: gscCheck.maxPoints, note: gscCheck.points >= gscCheck.maxPoints ? "Synced and current" : "Connect OAuth and sync Search Console" },
      ],
    },
    {
      name:  "AI Trust",
      score: Math.round((intelCheck.points + kwCheck.points) / (intelCheck.maxPoints + kwCheck.maxPoints) * 100),
      components: [
        { label: "Lead Value + State Intelligence", points: intelCheck.points, max: intelCheck.maxPoints, note: intelCheck.points > 0 ? "Intelligence available" : "Run Lead Value Intelligence" },
        { label: "Keyword intelligence ready",      points: kwCheck.points,    max: kwCheck.maxPoints,    note: kwCheck.points > 0   ? "Keywords identified" : "Run Keyword Intelligence" },
      ],
    },
  ]

  const verdict = (s: number) =>
    s >= 80 ? "Highly reliable — recommendations based on complete data" :
    s >= 50 ? "Partially reliable — some data gaps exist" :
    s >= 25 ? "Limited reliability — key data sources missing" :
              "Not reliable — critical setup incomplete"

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-900">Trust Center</h3>
        <p className="text-[11px] text-gray-400">All scores calculated from live DB checks — no hardcoded values</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {scores.map(ts => (
          <div key={ts.name} className="border border-gray-100 rounded-xl p-4">
            <div className="flex items-baseline justify-between mb-2">
              <p className="text-[11px] font-bold text-gray-700">{ts.name}</p>
              <span className={`text-xl font-bold tabular-nums ${
                ts.score >= 80 ? "text-green-600" : ts.score >= 50 ? "text-amber-600" : "text-red-500"
              }`}>{ts.score}</span>
            </div>
            <div className="w-full h-1.5 bg-gray-100 rounded-full mb-3">
              <div className={`h-full rounded-full transition-all ${
                ts.score >= 80 ? "bg-green-500" : ts.score >= 50 ? "bg-amber-500" : "bg-red-400"
              }`} style={{ width: `${ts.score}%` }} />
            </div>
            <div className="space-y-2 mb-3">
              {ts.components.map(c => (
                <div key={c.label}>
                  <p className="text-[10px] text-gray-500 mb-0.5">{c.label}</p>
                  <TrustBar points={c.points} maxPoints={c.max} />
                  <p className="text-[9px] text-gray-400 mt-0.5">{c.note}</p>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-gray-500 italic">{verdict(ts.score)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION F — FOUNDER PLAYBOOK
// ══════════════════════════════════════════════════════════════════════════════

interface PlaybookStep {
  id:      string
  step:    number
  title:   string
  why:     string
  outcome: string
  status:  "done" | "active" | "pending"
  url:     string
  ext:     boolean
}

function derivePlaybook(r: ReadinessResult): PlaybookStep[] {
  const gAds     = findCheck(r.setup,   "google_ads")
  const conv     = findCheck(r.setup,   "conversion")
  const stRows   = findCheck(r.data,    "search_terms")
  const intel    = findCheck(r.data,    "intelligence")
  const campaign = findCheck(r.revenue, "campaign")
  const budget   = findCheck(r.revenue, "budget")

  const attrOk = conv?.status === "ok" && (stRows?.points ?? 0) >= 12

  const raw = [
    {
      id:      "google_ads",
      title:   "Verify Google Ads Connection",
      why:     "Without API access, Growth OS cannot read campaigns, import spend data, or make recommendations. All downstream steps depend on this.",
      outcome: "Campaign data visible in Growth OS. Ad spend appears on Revenue Dashboard.",
      done:    gAds?.status === "ok",
      url:     "/admin/growth/paid",
      ext:     false,
    },
    {
      id:      "spend_sync",
      title:   "Verify Spend Sync",
      why:     "ROI cannot be calculated without spend data. Without it, budget recommendations are guesses, not data-driven decisions.",
      outcome: "Ad spend (₹) appears in Revenue Dashboard. Cost-per-lead calculated automatically.",
      done:    (stRows?.points ?? 0) > 0,
      url:     "/admin/growth/paid",
      ext:     false,
    },
    {
      id:      "conversion",
      title:   "Verify Conversion Tracking",
      why:     "Without conversion tracking, Google Ads optimises for clicks, not leads. Smart Bidding cannot work. Every untracked form submit is permanently lost data.",
      outcome: "Lead form submissions counted as conversions in Google Ads. Conversion column shows > 0.",
      done:    conv?.status === "ok",
      url:     "/admin/growth/paid",
      ext:     false,
    },
    {
      id:      "attribution",
      title:   "Verify Attribution",
      why:     "Attribution links each lead to a specific keyword, campaign, and state. Without it, you cannot identify which ad spend is profitable.",
      outcome: "Each lead shows its source keyword and campaign. UTM coverage > 50% in attribution report.",
      done:    attrOk,
      url:     "/admin/growth/ads/revenue",
      ext:     false,
    },
    {
      id:      "campaign",
      title:   "Approve First Campaign",
      why:     "Ads do not run until a campaign is reviewed and deployed. Unreviewed campaigns also block Market Intelligence from learning.",
      outcome: "Ads serving. Impressions and clicks visible in Revenue Dashboard.",
      done:    campaign?.status === "ok",
      url:     "/admin/growth/ads/approval-queue",
      ext:     false,
    },
    {
      id:      "market_intel",
      title:   "Activate Market Intelligence",
      why:     "Market Intelligence scores each keyword, state, and product by lead quality and conversion probability. Without it, budget is split equally instead of focused on highest-value targets.",
      outcome: "Keyword and state priority scores available. Budget Director makes data-driven allocation recommendations.",
      done:    intel?.status === "ok",
      url:     "/admin/growth/market-intelligence",
      ext:     false,
    },
    {
      id:      "scale",
      title:   "Scale Budget",
      why:     "Once all systems are validated and converting profitably, increasing budget directly multiplies lead volume. Each rupee is now tracked to an outcome.",
      outcome: "Higher impression volume. Lower cost per qualified lead through Smart Bidding optimisation.",
      done:    budget?.status === "ok" && r.overallScore >= 75,
      url:     "/admin/growth/ads/approval-queue",
      ext:     false,
    },
  ]

  const activeIdx = raw.findIndex(s => !s.done)
  return raw.map((s, i) => ({
    id:      s.id,
    step:    i + 1,
    title:   s.title,
    why:     s.why,
    outcome: s.outcome,
    status:  s.done ? "done" : i === activeIdx ? "active" : "pending",
    url:     s.url,
    ext:     s.ext,
  }))
}

function PlaybookSection({ r }: { r: ReadinessResult }) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const steps     = derivePlaybook(r)
  const doneCount = steps.filter(s => s.status === "done").length

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-900">Founder Playbook</h3>
        <p className="text-[11px] text-gray-400">{doneCount}/{steps.length} complete</p>
      </div>
      <div className="space-y-1.5">
        {steps.map(step => {
          const isOpen = expanded === step.id
          return (
            <div key={step.id} className={`rounded-lg border overflow-hidden ${
              step.status === "done"   ? "border-gray-100 bg-gray-50/50" :
              step.status === "active" ? "border-amber-200 bg-amber-50" :
              "border-gray-100"
            }`}>
              <button onClick={() => setExpanded(isOpen ? null : step.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left">
                <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold ${
                  step.status === "done"   ? "bg-green-500 text-white" :
                  step.status === "active" ? "bg-amber-500 text-white" :
                  "bg-gray-200 text-gray-500"
                }`}>
                  {step.status === "done" ? "✓" : step.step}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold ${
                    step.status === "done"   ? "text-gray-400 line-through" :
                    step.status === "active" ? "text-amber-900" : "text-gray-500"
                  }`}>{step.title}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {step.status === "active" && (
                    <span className="text-[10px] text-amber-600 font-bold">CURRENT</span>
                  )}
                  {isOpen
                    ? <ChevronDown  size={13} className="text-gray-400" />
                    : <ChevronRight size={13} className="text-gray-400" />}
                </div>
              </button>

              {isOpen && (
                <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Why It Matters</p>
                    <p className="text-xs text-gray-700">{step.why}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Expected Outcome</p>
                    <p className="text-xs text-gray-700">{step.outcome}</p>
                  </div>
                  {step.status !== "done" && (
                    step.ext ? (
                      <a href={step.url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg transition-colors">
                        Open <ExternalLink size={11} />
                      </a>
                    ) : (
                      <Link href={step.url}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg transition-colors">
                        Open <ChevronRight size={11} />
                      </Link>
                    )
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// ADVANCED SECTION (updated to use ReadinessResult shape)
// ══════════════════════════════════════════════════════════════════════════════

function AdvancedSection({
  milestones,
  readiness,
}: {
  milestones: FounderV2["milestones"]
  readiness:  ReadinessResult | null
}) {
  const [open, setOpen] = useState(false)
  const [local, setLocal] = useState<ReadinessResult | null>(readiness)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (readiness && !local) setLocal(readiness)
  }, [readiness, local])

  const loadReadiness = useCallback(async () => {
    if (local) return
    setLoading(true)
    try {
      const res = await fetch("/api/admin/growth/readiness")
      if (res.ok) setLocal(await res.json())
    } finally {
      setLoading(false)
    }
  }, [local])

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next && !local) loadReadiness()
  }

  const allChecks = local ? [
    ...local.setup.checks,
    ...local.data.checks,
    ...local.revenue.checks,
  ] : []

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <button onClick={toggle}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-gray-50 transition-colors">
        <span className="text-sm font-semibold text-gray-400">Advanced — technical systems</span>
        {open ? <ChevronDown size={15} className="text-gray-400" /> : <ChevronRight size={15} className="text-gray-400" />}
      </button>

      {open && (
        <div className="border-t border-gray-100 px-5 py-4 space-y-4 bg-gray-50/50">

          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Milestones</p>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { label: "First paid click",       done: milestones.firstPaidClick },
                { label: "First attributed lead",  done: milestones.firstAttributedLead },
                { label: "First dealer lead",      done: milestones.firstDealerLead },
                { label: "First OEM lead",         done: milestones.firstOEMLead },
              ].map(m => (
                <div key={m.label} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
                  m.done ? "bg-green-50 text-green-800" : "bg-white text-gray-400 border border-gray-100"
                }`}>
                  {m.done
                    ? <CheckCircle2 size={12} className="text-green-500 flex-shrink-0" />
                    : <Circle       size={12} className="text-gray-300 flex-shrink-0" />}
                  {m.label}
                </div>
              ))}
            </div>
          </div>

          {loading && (
            <div className="space-y-1.5">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-8 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          )}

          {local && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Readiness</p>
                <span className="text-xs font-bold text-gray-600">{local.overallScore}%</span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full mb-3">
                <div className="h-full bg-brand-500 rounded-full transition-all"
                  style={{ width: `${local.overallScore}%` }} />
              </div>
              <div className="grid grid-cols-3 gap-1.5 mb-3">
                {[
                  { label: "Setup",   score: local.setup.score },
                  { label: "Data",    score: local.data.score },
                  { label: "Revenue", score: local.revenue.score },
                ].map(t => (
                  <div key={t.label} className="bg-white border border-gray-100 rounded-lg px-3 py-2 text-center">
                    <p className="text-xs font-bold text-gray-700">{t.score}%</p>
                    <p className="text-[10px] text-gray-400">{t.label}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                {allChecks.map(c => (
                  <div key={c.id} className={`flex items-start gap-2 px-3 py-2 rounded-lg text-xs ${
                    c.status === "ok"      ? "bg-green-50 text-green-800" :
                    c.status === "warning" ? "bg-amber-50 text-amber-700" :
                                             "bg-red-50 text-red-700"
                  }`}>
                    <span className="flex-shrink-0 font-bold">
                      {c.status === "ok" ? "✓" : c.status === "warning" ? "!" : "✗"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium leading-tight">{c.label}</p>
                      {c.detail && <p className="text-[10px] opacity-75 mt-0.5 truncate">{c.detail}</p>}
                    </div>
                    <span className="flex-shrink-0 font-mono text-[10px] opacity-60">{c.points}/{c.maxPoints}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Technical pages</p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Launch Status",  href: "/admin/growth/launch" },
                { label: "Paid Growth",    href: "/admin/growth/paid" },
                { label: "Ads Dashboard",  href: "/admin/growth/ads/dashboard" },
                { label: "Ads Director",   href: "/admin/growth/ads/director" },
                { label: "Activity Logs",  href: "/admin/growth/logs" },
              ].map(l => (
                <Link key={l.href} href={l.href}
                  className="text-[11px] text-gray-500 hover:text-brand-600 border border-gray-200 hover:border-brand-300 px-2.5 py-1 rounded-lg transition-colors bg-white">
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// PAGE
// ══════════════════════════════════════════════════════════════════════════════

export default function FounderModePage() {
  const [data,      setData]      = useState<FounderV2 | null>(null)
  const [readiness, setReadiness] = useState<ReadinessResult | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const [founderRes, readinessRes] = await Promise.all([
        fetch("/api/admin/growth/founder-v2"),
        fetch("/api/admin/growth/readiness"),
      ])
      if (!founderRes.ok) throw new Error(`HTTP ${founderRes.status}`)
      const [founderData, readinessData] = await Promise.all([
        founderRes.json(),
        readinessRes.ok ? readinessRes.json() : Promise.resolve(null),
      ])
      setData(founderData)
      if (readinessData) setReadiness(readinessData)
      setError(null)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Auto-refresh metrics only (fast endpoint)
  useEffect(() => {
    const t = setInterval(() => {
      fetch("/api/admin/growth/founder-v2")
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setData(d) })
        .catch(() => {})
    }, 90_000)
    return () => clearInterval(t)
  }, [])

  const rev = data?.revenue

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-gray-900">Revenue Dashboard</h1>
            <p className="text-[11px] text-gray-400">
              {data ? `Updated ${ago(data.checkedAt)}` : "Loading…"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {data && (
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                data.campaign.live ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
              }`}>
                Campaign {data.campaign.live ? "LIVE" : data.campaign.status}
              </span>
            )}
            <button onClick={load} disabled={loading}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40">
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 max-w-3xl space-y-5">

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs text-red-700">
            Failed to load: {error}
          </div>
        )}

        {/* A — Founder Journey */}
        {readiness
          ? <JourneySection r={readiness} />
          : loading && <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
        }

        {/* B — Guided Next Action */}
        {loading && !data
          ? <div className="h-40 bg-gray-100 rounded-2xl animate-pulse" />
          : data
          ? <GuidedActionCard action={data.nextAction} />
          : null
        }

        {/* Revenue Metrics */}
        <section>
          {loading && !data ? (
            <div className="grid grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <Tile label="Revenue today"                  value="—" />
              <Tile label="Leads today"                    value={rev?.leadsToday ?? 0}             highlight={(rev?.leadsToday ?? 0) > 0} />
              <Tile label="Dealer leads" sub="this month"  value={rev?.dealerLeadsThisMonth ?? 0}   highlight={(rev?.dealerLeadsThisMonth ?? 0) > 0} />
              <Tile label="OEM leads"    sub="this month"  value={rev?.oemLeadsThisMonth ?? 0}      highlight={(rev?.oemLeadsThisMonth ?? 0) > 0} />
              <Tile label="Ad spend"     sub="today"       value={rev?.adSpendToday ? fmtINR(rev.adSpendToday) : "—"} />
              <Tile label="Cost per lead"                  value={rev?.costPerLead ? fmtINR(rev.costPerLead) : "—"} />
            </div>
          )}
        </section>

        {/* Revenue Funnel */}
        {data && <FunnelChart funnel={data.funnel} />}

        {/* C — System Transparency */}
        {readiness
          ? <TransparencySection r={readiness} />
          : loading && <div className="h-32 bg-gray-100 rounded-xl animate-pulse" />
        }

        {/* D — Remarketing Audit */}
        {readiness && <RemarketingSection r={readiness} />}

        {/* E — Trust Center */}
        {readiness && <TrustCenterSection r={readiness} />}

        {/* F — Founder Playbook */}
        {readiness
          ? <PlaybookSection r={readiness} />
          : loading && <div className="h-48 bg-gray-100 rounded-xl animate-pulse" />
        }

        {/* Advanced */}
        {data && <AdvancedSection milestones={data.milestones} readiness={readiness} />}

      </div>
    </div>
  )
}
