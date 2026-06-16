"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Link from "next/link"
import {
  TrendingUp, Zap, Clock, RefreshCw, CheckCircle2, XCircle, Pause,
  AlertTriangle, ChevronRight, Target, Users, Search, FileText,
  DollarSign, Cpu, BarChart3, Flame, Megaphone, ArrowRight,
  ChevronDown, ChevronUp, Package, Circle, Trophy, X,
  Bot, Youtube, Monitor, MousePointerClick, Swords, RotateCcw,
  HelpCircle, Calendar, User, Check, Play, BookOpen, Lightbulb,
  Phone, Mail, Plus, Trash2, MessageSquare,
} from "lucide-react"
import { getCampaignIntelligence } from "@/lib/growth-os/campaign-decision-engine"
import { PLATFORM_VERSION } from "@/lib/growth-os/platform-registry"

// ─── Types ────────────────────────────────────────────────────────────────────

type RecType =
  | "oem_displacement" | "dealer_recruit" | "procurement_target"
  | "search_campaign" | "landing_page_create" | "creative_refresh"
  | "budget_reallocate" | "negative_keyword" | "customer_match" | "content_create"
  | "remarketing_campaign" | "youtube_campaign" | "performance_max_campaign"
  | "customer_match_campaign" | "competitor_conquest_campaign"

type Priority = "critical" | "high" | "medium" | "low"
type Status = "pending" | "approved" | "rejected" | "deferred" | "applied"
  | "in_progress" | "completed" | "won" | "lost"

interface Rec {
  _id: string
  run_date: string
  type: RecType
  priority: Priority
  title: string
  why_now: string
  evidence: string
  expected_action: string
  expected_revenue_impact: number
  confidence: number
  effort: string
  sources: string[]
  status: Status
  generated_at: string
  rejection_reason?: string
  // v1.1 lifecycle
  owner?: string
  target_completion_date?: string
  reviewed_at?: string
  in_progress_at?: string
  completed_at?: string
  won_at?: string
  lost_at?: string
  realized_impact?: number
  outcome_notes?: string
  // v1.1 help
  help_what?: string
  help_why?: string
  help_if_approved?: string
  help_if_ignored?: string
  // v1.1 pack
  execution_pack_id?: string
  // payload for campaign intelligence
  payload?: Record<string, unknown>
}

interface DailyRun {
  date: string
  status: string
  started_at: string
  completed_at?: string
  duration_ms?: number
  rec_count: number
  critical_count: number
  high_count: number
  sources_connected: string[]
  sources_missing: string[]
  email_sent: boolean
}

interface Measurement {
  total_generated: number
  total_approved: number
  total_in_progress: number
  total_completed: number
  total_won: number
  total_lost: number
  total_rejected: number
  total_deferred: number
  approval_rate_pct: number
  completion_rate_pct: number
  win_rate_pct: number
  estimated_impact_total: number
  realized_impact_total: number
  impact_realization_rate_pct: number
  packs_generated: number
}

interface Contact {
  _id: string
  org_name: string
  contact_name: string
  designation: string
  department: string
  email: string
  phone: string
  source: "gem" | "website" | "procurement_records" | "crm" | "founder_added"
  confidence: number
  created_at: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const INR = (n: number) =>
  n >= 1e7 ? `₹${(n / 1e7).toFixed(2)} Cr` :
  n >= 1e5 ? `₹${(n / 1e5).toFixed(1)} L` :
  n > 0 ? `₹${Math.round(n).toLocaleString("en-IN")}` : "₹0"

function fmtDate(iso?: string) {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })
  } catch { return null }
}

function fmtTime(iso?: string) {
  if (!iso) return null
  try {
    return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
  } catch { return null }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIORITY_COLOR: Record<Priority, string> = {
  critical: "bg-red-100 text-red-700 border-red-200",
  high:     "bg-orange-100 text-orange-700 border-orange-200",
  medium:   "bg-yellow-100 text-yellow-700 border-yellow-200",
  low:      "bg-green-100 text-green-700 border-green-200",
}

const PRIORITY_BORDER: Record<Priority, string> = {
  critical: "border-l-red-500",
  high:     "border-l-orange-500",
  medium:   "border-l-yellow-500",
  low:      "border-l-green-500",
}

const TYPE_ICON: Record<RecType, React.ReactNode> = {
  oem_displacement:            <Flame size={13} />,
  dealer_recruit:              <Users size={13} />,
  procurement_target:          <Target size={13} />,
  search_campaign:             <Search size={13} />,
  landing_page_create:         <FileText size={13} />,
  creative_refresh:            <Zap size={13} />,
  budget_reallocate:           <BarChart3 size={13} />,
  negative_keyword:            <XCircle size={13} />,
  customer_match:              <Users size={13} />,
  content_create:              <BookOpen size={13} />,
  remarketing_campaign:        <RotateCcw size={13} />,
  youtube_campaign:            <Youtube size={13} />,
  performance_max_campaign:    <Monitor size={13} />,
  customer_match_campaign:     <MousePointerClick size={13} />,
  competitor_conquest_campaign: <Swords size={13} />,
}

const TYPE_LABEL: Record<RecType, string> = {
  oem_displacement:            "OEM Displacement",
  dealer_recruit:              "Dealer Recruit",
  procurement_target:          "Procurement Target",
  search_campaign:             "Search Campaign",
  landing_page_create:         "Landing Page",
  creative_refresh:            "Creative Refresh",
  budget_reallocate:           "Budget Realloc",
  negative_keyword:            "Neg. Keyword",
  customer_match:              "Customer Match",
  content_create:              "Content",
  remarketing_campaign:        "Remarketing",
  youtube_campaign:            "YouTube",
  performance_max_campaign:    "Perf. Max",
  customer_match_campaign:     "Cust. Match",
  competitor_conquest_campaign: "Conquest",
}

const EFFORT_LABEL: Record<string, string> = {
  "5_min": "5 min", "30_min": "30 min",
  "1_hour": "1 hr", "half_day": "½ day", "project": "Project",
}

const STATUS_DISPLAY: Record<Status, { label: string; color: string; icon: React.ReactNode }> = {
  pending:     { label: "Pending",      color: "bg-gray-100 text-gray-600",        icon: <Circle size={11} /> },
  approved:    { label: "Approved",     color: "bg-green-50 text-green-700",       icon: <CheckCircle2 size={11} /> },
  in_progress: { label: "In Progress",  color: "bg-blue-50 text-blue-700",         icon: <Play size={11} /> },
  applied:     { label: "In Progress",  color: "bg-blue-50 text-blue-700",         icon: <Play size={11} /> },
  completed:   { label: "Completed",    color: "bg-indigo-50 text-indigo-700",     icon: <Check size={11} /> },
  won:         { label: "Won ✓",        color: "bg-emerald-50 text-emerald-700",   icon: <Trophy size={11} /> },
  lost:        { label: "Lost",         color: "bg-red-50 text-red-700",           icon: <X size={11} /> },
  rejected:    { label: "Rejected",     color: "bg-red-50 text-red-600",           icon: <XCircle size={11} /> },
  deferred:    { label: "Deferred",     color: "bg-gray-100 text-gray-500",        icon: <Pause size={11} /> },
}

const FILTER_TABS: Array<Status | "all"> = [
  "pending", "approved", "in_progress", "completed", "won", "lost", "rejected", "all",
]

// ─── Execution Readiness ──────────────────────────────────────────────────────

interface ReadinessItem { label: string; status: "YES" | "NO" | "PENDING" | "NA"; note?: string }

interface ReadinessDimension { label: string; status: "YES" | "NO" | "PARTIAL" | "NA"; note?: string }

interface ReadinessAssessment {
  status: "READY" | "PARTIAL" | "BLOCKED"
  score: number
  dimensions: ReadinessDimension[]
  ready_to_execute: boolean
  audience: string
  budget: string
  roi: string
  blockers: string[]
  ads_checklist?: ReadinessItem[]
  is_customer_match: boolean
  display_title?: string
}

const AD_REC_TYPES = new Set([
  "search_campaign", "remarketing_campaign", "youtube_campaign",
  "performance_max_campaign", "competitor_conquest_campaign",
  "customer_match", "customer_match_campaign",
  "negative_keyword", "budget_reallocate", "creative_refresh",
])

function scoreFromDims(dims: ReadinessDimension[]): number {
  const scoreable = dims.filter(d => d.status !== "NA")
  if (scoreable.length === 0) return 50
  const sum = scoreable.reduce((acc, d) => acc + (d.status === "YES" ? 1 : d.status === "PARTIAL" ? 0.5 : 0), 0)
  return Math.round((sum / scoreable.length) * 100)
}

function contactQuality(contacts: Contact[]): "NO" | "PARTIAL" | "YES" {
  if (!contacts || contacts.length === 0) return "NO"
  const hasEmailOrPhone = contacts.some(c => c.email || c.phone)
  return hasEmailOrPhone ? "YES" : "PARTIAL"
}

function getReadiness(rec: Rec, sourcesConnected: string[], contacts: Contact[] = []): ReadinessAssessment {
  const type = rec.type
  const payload = rec.payload ?? {}
  const hasGoogleAds = sourcesConnected.some(s => s.toLowerCase().includes("google ads") || s.toLowerCase().includes("ads"))

  // Customer Match — always BLOCKED without contact data
  if (type === "customer_match" || type === "customer_match_campaign") {
    const dims: ReadinessDimension[] = [
      { label: "Data Ready", status: "YES", note: "Fogging procurement data available" },
      { label: "Audience Ready", status: "PARTIAL", note: "670 orgs identified — no contact details" },
      { label: "Contact Ready", status: "NO", note: "0 emails/phones — required for Customer Match upload" },
      { label: "Creative Ready", status: "PARTIAL", note: "Ad copy drafts available on approval" },
      { label: "Landing Page Ready", status: "PARTIAL", note: "Verify quote form conversion rate" },
      { label: "Tracking Ready", status: hasGoogleAds ? "PARTIAL" : "NO", note: hasGoogleAds ? "Conversion tag install unverified" : "Google Ads not connected" },
    ]
    const score = scoreFromDims(dims)
    return {
      status: "BLOCKED",
      score,
      dimensions: dims,
      ready_to_execute: false,
      audience: `~450 govt orgs identified — 0 emails or phones available`,
      budget: "₹10,000/mo ad spend planned — cannot deploy without contacts",
      roi: "0% until contact enrichment complete",
      blockers: [
        "No email or phone data — Google Ads Customer Match requires contact identifiers",
        "Fogging intelligence has organization names only, not purchase officer contacts",
        "Action: Source contacts via GeM Seller Directory or LinkedIn before spending",
      ],
      ads_checklist: [
        { label: "Contact list (emails/phones)", status: "NO", note: "0 contacts — enrichment required before upload" },
        { label: "Ad copy drafts", status: "PENDING", note: "Available in execution pack after approval" },
        { label: "Budget ₹10K/mo", status: "YES" },
        { label: "Landing page / quote form", status: "PENDING", note: "Verify current page conversion rate" },
        { label: "Conversion tracking", status: "PENDING", note: "Verify Google Ads conversion tag is installed" },
        { label: "Google Ads account", status: hasGoogleAds ? "YES" : "NO", note: hasGoogleAds ? undefined : "Connect in Ads Director" },
      ],
      is_customer_match: true,
      display_title: "Government Buyer Audience Identified — Contact Enrichment Required",
    }
  }

  // Dealer Recruitment
  if (type === "dealer_recruit") {
    const state = String(payload.state || "")
    const orgCount = Number(payload.org_count || 0)
    const cq = contactQuality(contacts)
    const dims: ReadinessDimension[] = [
      { label: "Data Ready", status: "YES", note: `${state} market data — ${orgCount} orgs identified` },
      { label: "Audience Ready", status: "PARTIAL", note: "Dealer candidates need to be identified (IndiaMart, trade directories)" },
      { label: "Contact Ready", status: cq, note: cq === "NO" ? "No contacts — add dealer name/email/phone" : cq === "PARTIAL" ? "Name added — add email or phone to reach out" : "Email or phone available — ready to outreach" },
      { label: "Creative Ready", status: "YES", note: "WhatsApp draft + email template in execution pack" },
      { label: "Landing Page Ready", status: "NA" },
      { label: "Tracking Ready", status: "PARTIAL", note: "Manual tracking via CRM notes" },
    ]
    const score = scoreFromDims(dims)
    return {
      status: score >= 80 ? "READY" : "PARTIAL",
      score,
      dimensions: dims,
      ready_to_execute: score >= 80,
      audience: `Distributors / dealers in ${state || "target state"}${orgCount ? ` · ${orgCount} buyer orgs in market` : ""}`,
      budget: "₹0 — direct outreach, no ad spend",
      roi: `${INR(rec.expected_revenue_impact)} if dealer authorised and wins GeM tenders`,
      blockers: [
        `Find dealer candidates in ${state || "target state"} (IndiaMart, TradeIndia, trade directories)`,
        "Get phone number and email — required for WhatsApp + email outreach",
        "Confirm candidate has active GeM Seller account (or can register)",
      ],
      is_customer_match: false,
    }
  }

  // OEM Displacement / Procurement Target
  if (type === "oem_displacement" || type === "procurement_target") {
    const orgName = String(payload.organization_name || "target organization")
    const state = String(payload.organization_state || payload.state || "")
    const cq = contactQuality(contacts)
    const dims: ReadinessDimension[] = [
      { label: "Data Ready", status: "YES", note: "GeM procurement intelligence available" },
      { label: "Audience Ready", status: "YES", note: orgName },
      { label: "Contact Ready", status: cq, note: cq === "NO" ? "No purchase officer contact — source from GeM directory" : cq === "PARTIAL" ? "Name added — add email or phone" : "Contact available — ready to outreach" },
      { label: "Creative Ready", status: "YES", note: "Email + WhatsApp + call script in execution pack" },
      { label: "Landing Page Ready", status: "NA" },
      { label: "Tracking Ready", status: "PARTIAL", note: "Track via GeM bid status + CRM" },
    ]
    const score = scoreFromDims(dims)
    return {
      status: score >= 80 ? "READY" : "PARTIAL",
      score,
      dimensions: dims,
      ready_to_execute: score >= 80,
      audience: `${orgName}${state ? ` · ${state}` : ""}`,
      budget: "₹0 — direct government buyer outreach",
      roi: `${INR(rec.expected_revenue_impact)} if GeM bid won`,
      blockers: [
        `Source purchase officer contact for ${orgName} (GeM Seller Directory → find buyer contact)`,
        state ? `Confirm 100X dealer or rep is available in ${state}` : "Assign dealer for this state",
        "Check GeM for next tender cycle and open bids from this org",
      ],
      is_customer_match: false,
    }
  }

  // SEO / Content
  if (type === "landing_page_create" || type === "content_create") {
    const keyword = String(payload.query || payload.keyword || "target keyword")
    const impressions = Number(payload.impressions || 0)
    const dims: ReadinessDimension[] = [
      { label: "Data Ready", status: "YES", note: `GSC keyword: "${keyword}"${impressions ? ` — ${impressions.toLocaleString()} impressions` : ""}` },
      { label: "Audience Ready", status: "YES", note: "Search intent defined from GSC data" },
      { label: "Contact Ready", status: "NA" },
      { label: "Creative Ready", status: "PARTIAL", note: "Content brief + outline in execution pack" },
      { label: "Landing Page Ready", status: "NO", note: "Page needs to be created and published" },
      { label: "Tracking Ready", status: "PARTIAL", note: "GSC connected — submit URL after publish" },
    ]
    const score = scoreFromDims(dims)
    return {
      status: "PARTIAL",
      score,
      dimensions: dims,
      ready_to_execute: score >= 80,
      audience: `Organic search — "${keyword}"${impressions ? ` · ${impressions.toLocaleString()} impressions/mo` : ""}`,
      budget: "₹0 — organic SEO, no ad spend",
      roi: "Organic traffic increase, measured via GSC impressions and clicks",
      blockers: [
        "Brief developer or writer using the SEO brief in the execution pack",
        `Create and publish page targeting "${keyword}" (goal: top 3 ranking)`,
        "Submit URL to Google Search Console after publishing",
      ],
      is_customer_match: false,
    }
  }

  // Ad types
  const budgetByType: Record<string, number> = {
    search_campaign: 15000, remarketing_campaign: 8000, youtube_campaign: 20000,
    performance_max_campaign: 25000, competitor_conquest_campaign: 20000,
    negative_keyword: 0, budget_reallocate: 0, creative_refresh: 0,
  }
  const adBudget = budgetByType[type] ?? 0
  const blockers: string[] = []
  if (!hasGoogleAds) blockers.push("Google Ads account not connected — link account in Ads Director first")
  if (adBudget > 0) blockers.push(`Budget approval required: ${INR(adBudget)}/month`)
  if (type === "remarketing_campaign") blockers.push("Remarketing pixel must be installed on 100xcircle.com first")
  blockers.push("Ad creatives (copy + images) need to be built — drafts available in execution pack after approval")

  const adDims: ReadinessDimension[] = [
    { label: "Data Ready", status: hasGoogleAds ? "YES" : "PARTIAL", note: hasGoogleAds ? "Google Ads connected" : "Connect Google Ads account first" },
    { label: "Audience Ready", status: type === "remarketing_campaign" ? "PARTIAL" : "YES", note: type === "remarketing_campaign" ? "Pixel install + 100 visitor minimum required" : "Keyword/intent targeting defined" },
    { label: "Contact Ready", status: "NA" },
    { label: "Creative Ready", status: "PARTIAL", note: "Ad copy drafts generated on approval — needs copywriter review" },
    { label: "Landing Page Ready", status: "PARTIAL", note: "Verify quote form conversion rate before launch" },
    { label: "Tracking Ready", status: hasGoogleAds ? "PARTIAL" : "NO", note: hasGoogleAds ? "Verify conversion tag is active" : "Google Ads not connected" },
  ]
  const adScore = scoreFromDims(adDims)

  return {
    status: "PARTIAL",
    score: adScore,
    dimensions: adDims,
    ready_to_execute: adScore >= 80,
    audience: type === "remarketing_campaign"
      ? "Previous site visitors (remarketing audience)"
      : "Google search users targeting thermal fogging keywords",
    budget: adBudget > 0 ? `${INR(adBudget)}/month` : "₹0 — optimization action",
    roi: `${INR(rec.expected_revenue_impact)} estimated if campaign runs`,
    blockers,
    ads_checklist: [
      {
        label: type === "remarketing_campaign" ? "Audience: Remarketing list (site visitors)" : "Audience: Keyword / intent targeting",
        status: type === "remarketing_campaign" ? "PENDING" : "YES",
        note: type === "remarketing_campaign" ? "Pixel install + 100 visitor minimum required" : undefined,
      },
      { label: "Ad copy drafts", status: "PENDING", note: "Approve rec → execution pack generates drafts" },
      { label: `Budget: ${adBudget > 0 ? INR(adBudget) + "/mo" : "₹0 (optimisation)"}`, status: "YES" },
      { label: "Landing page / quote form", status: "PENDING", note: "Verify page converts before launch" },
      { label: "Conversion tracking", status: "PENDING", note: "Verify Google Ads conversion tag is active" },
      { label: "Google Ads account", status: hasGoogleAds ? "YES" : "NO", note: hasGoogleAds ? undefined : "Link account in Ads Director" },
    ],
    is_customer_match: false,
  }
}

const READINESS_STYLE = {
  READY:   { border: "border-green-200", bg: "bg-green-50",  badge: "bg-green-100 text-green-800",  bullet: "text-green-600" },
  PARTIAL: { border: "border-amber-200", bg: "bg-amber-50",  badge: "bg-amber-100 text-amber-800",  bullet: "text-amber-600" },
  BLOCKED: { border: "border-red-200",   bg: "bg-red-50",    badge: "bg-red-100 text-red-800",      bullet: "text-red-600"   },
}

const DIM_BADGE: Record<string, string> = {
  YES:     "bg-green-100 text-green-800 border-green-200",
  NO:      "bg-red-100 text-red-800 border-red-200",
  PARTIAL: "bg-amber-100 text-amber-800 border-amber-200",
  NA:      "bg-gray-100 text-gray-400 border-gray-200",
}

function ReadinessScore({ readiness }: { readiness: ReadinessAssessment }) {
  const r = readiness
  const s = READINESS_STYLE[r.status]
  const [showAll, setShowAll] = useState(false)

  return (
    <div className={`mt-3 rounded-lg border p-3 space-y-2.5 ${s.border} ${s.bg}`}>
      {/* Status + score + READY badge */}
      <div className="flex flex-wrap items-center gap-2">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${s.badge}`}>{r.status}</span>
        <span className="text-[11px] text-gray-600">Execution Readiness: <strong className="text-gray-800">{r.score}%</strong></span>
        {r.ready_to_execute && (
          <span className="text-[10px] font-bold text-green-800 bg-green-100 border border-green-300 px-2 py-0.5 rounded">
            ✓ READY TO EXECUTE
          </span>
        )}
        {r.is_customer_match && (
          <span className="text-[10px] font-bold text-red-700 bg-red-100 border border-red-200 px-2 py-0.5 rounded">
            Contact Enrichment Required
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-white/60 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${r.score >= 80 ? "bg-green-500" : r.score >= 50 ? "bg-amber-400" : "bg-red-400"}`}
          style={{ width: `${r.score}%` }}
        />
      </div>

      {/* 6-dimension grid */}
      {r.dimensions && r.dimensions.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {r.dimensions.map((dim, i) => (
            <div key={i} className="flex items-center gap-1.5 min-w-0">
              <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded border ${DIM_BADGE[dim.status]}`}>{dim.status}</span>
              <div className="min-w-0">
                <span className="text-[10px] text-gray-700 font-medium truncate block">{dim.label}</span>
                {dim.note && <span className="text-[9px] text-gray-400 leading-none block">{dim.note}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Blockers */}
      {r.blockers.length > 0 && !r.ready_to_execute && (
        <div>
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">What must happen before execution</p>
          <div className="space-y-1">
            {(showAll ? r.blockers : r.blockers.slice(0, 2)).map((b, i) => (
              <div key={i} className="flex items-start gap-1.5 text-[11px] text-gray-700">
                <span className={`shrink-0 font-bold ${s.bullet}`}>▸</span>
                <span>{b}</span>
              </div>
            ))}
          </div>
          {r.blockers.length > 2 && (
            <button onClick={() => setShowAll(v => !v)} className="text-[10px] text-blue-600 underline mt-1.5">
              {showAll ? "Show less" : `+${r.blockers.length - 2} more blockers`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function AdsDeploymentChecklist({ items }: { items: ReadinessItem[] }) {
  const yesCount = items.filter(i => i.status === "YES").length
  const score = Math.round(yesCount / items.length * 100)

  const ITEM_STYLE: Record<string, string> = {
    YES:     "bg-green-100 text-green-800 border-green-200",
    NO:      "bg-red-100 text-red-800 border-red-200",
    PENDING: "bg-amber-100 text-amber-800 border-amber-200",
    NA:      "bg-gray-100 text-gray-500 border-gray-200",
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
      <div className="flex items-center gap-2">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Google Ads Deployment Readiness</p>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
          score >= 70 ? "bg-green-100 text-green-800 border-green-200" :
          score >= 40 ? "bg-amber-100 text-amber-800 border-amber-200" :
          "bg-red-100 text-red-800 border-red-200"
        }`}>{score}% ready</span>
      </div>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={i} className="flex items-start gap-2 text-[11px]">
            <span className={`shrink-0 min-w-[48px] text-center px-1.5 py-0.5 rounded border text-[9px] font-bold ${ITEM_STYLE[item.status]}`}>
              {item.status}
            </span>
            <div className="flex-1 min-w-0">
              <span className="text-gray-700">{item.label}</span>
              {item.note && <span className="text-gray-400 ml-1">— {item.note}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Contact Panel ────────────────────────────────────────────────────────────

function ContactPanel({
  orgName, contacts, onContactAdded, onContactDeleted,
}: {
  orgName: string
  contacts: Contact[]
  onContactAdded: (c: Contact) => void
  onContactDeleted: (id: string) => void
}) {
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ contact_name: "", designation: "", department: "", email: "", phone: "", source: "founder_added", confidence: "80" })

  async function addContact() {
    if (!form.contact_name.trim()) return
    setSaving(true)
    try {
      const res = await fetch("/api/admin/growth/director/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_name: orgName, ...form, confidence: Number(form.confidence) }),
      })
      const d = await res.json()
      if (d.contact) {
        onContactAdded(d.contact)
        setForm({ contact_name: "", designation: "", department: "", email: "", phone: "", source: "founder_added", confidence: "80" })
        setShowForm(false)
      }
    } catch { /* ignore */ } finally { setSaving(false) }
  }

  async function deleteContact(id: string) {
    try {
      await fetch(`/api/admin/growth/director/contacts/${id}`, { method: "DELETE" })
      onContactDeleted(id)
    } catch { /* ignore */ }
  }

  return (
    <div className="space-y-2">
      {/* Contact list */}
      {contacts.length > 0 ? (
        <div className="divide-y divide-gray-100 rounded border border-gray-200 overflow-hidden">
          {contacts.map(c => (
            <div key={c._id} className="flex items-start gap-2 px-3 py-2 bg-white">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-semibold text-gray-800">{c.contact_name}</span>
                  {c.designation && <span className="text-[10px] text-gray-500">{c.designation}</span>}
                  {c.department && <span className="text-[10px] text-gray-400">· {c.department}</span>}
                  <span className={`text-[9px] px-1 py-0.5 rounded border font-semibold ${
                    c.confidence >= 80 ? "bg-green-50 text-green-700 border-green-200" :
                    c.confidence >= 50 ? "bg-amber-50 text-amber-700 border-amber-200" :
                    "bg-gray-50 text-gray-500 border-gray-200"
                  }`}>{c.confidence}%</span>
                </div>
                <div className="flex flex-wrap gap-2 mt-0.5 text-[10px]">
                  {c.email && <span className="flex items-center gap-0.5 text-blue-600"><Mail size={9} />{c.email}</span>}
                  {c.phone && <span className="flex items-center gap-0.5 text-green-600"><Phone size={9} />{c.phone}</span>}
                  <span className="text-gray-400">{c.source}</span>
                </div>
              </div>
              <button
                onClick={() => deleteContact(c._id)}
                className="shrink-0 text-gray-300 hover:text-red-500 mt-0.5"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-gray-400 italic">No contacts yet — add purchase officer or dealer contact below.</p>
      )}

      {/* Add form */}
      {showForm ? (
        <div className="border border-blue-200 rounded bg-blue-50 p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text" placeholder="Contact name *" value={form.contact_name}
              onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))}
              className="col-span-2 text-xs border border-gray-300 rounded px-2 py-1.5"
            />
            <input
              type="text" placeholder="Designation" value={form.designation}
              onChange={e => setForm(f => ({ ...f, designation: e.target.value }))}
              className="text-xs border border-gray-300 rounded px-2 py-1.5"
            />
            <input
              type="text" placeholder="Department" value={form.department}
              onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
              className="text-xs border border-gray-300 rounded px-2 py-1.5"
            />
            <input
              type="email" placeholder="Email" value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="text-xs border border-gray-300 rounded px-2 py-1.5"
            />
            <input
              type="tel" placeholder="Phone" value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              className="text-xs border border-gray-300 rounded px-2 py-1.5"
            />
            <select
              value={form.source}
              onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
              className="text-xs border border-gray-300 rounded px-2 py-1.5"
            >
              <option value="founder_added">Founder added</option>
              <option value="gem">GeM directory</option>
              <option value="website">Website</option>
              <option value="procurement_records">Procurement records</option>
              <option value="crm">CRM</option>
            </select>
            <input
              type="number" placeholder="Confidence 0–100" value={form.confidence}
              onChange={e => setForm(f => ({ ...f, confidence: e.target.value }))}
              className="text-xs border border-gray-300 rounded px-2 py-1.5"
              min={0} max={100}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={addContact} disabled={saving || !form.contact_name.trim()}
              className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Contact"}
            </button>
            <button onClick={() => setShowForm(false)} className="text-xs text-gray-400 underline">Cancel</button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
        >
          <Plus size={11} />Add contact
        </button>
      )}
    </div>
  )
}

// ─── Outreach Timeline Panel ──────────────────────────────────────────────────

function OutreachTimelinePanel({ schedule }: {
  schedule: {
    day_1: { whatsapp: string; email: string; note: string }
    day_3: { call_script: string; note: string }
    day_7: { follow_up_whatsapp: string; note: string }
    day_14: { final_whatsapp: string; note: string }
  }
}) {
  const [activeDay, setActiveDay] = useState<"day_1" | "day_3" | "day_7" | "day_14">("day_1")

  const tabs: Array<{ key: "day_1" | "day_3" | "day_7" | "day_14"; label: string; color: string; activeColor: string }> = [
    { key: "day_1",  label: "Day 1",  color: "text-gray-500", activeColor: "border-blue-500 text-blue-700 bg-blue-50" },
    { key: "day_3",  label: "Day 3",  color: "text-gray-500", activeColor: "border-indigo-500 text-indigo-700 bg-indigo-50" },
    { key: "day_7",  label: "Day 7",  color: "text-gray-500", activeColor: "border-violet-500 text-violet-700 bg-violet-50" },
    { key: "day_14", label: "Day 14", color: "text-gray-500", activeColor: "border-gray-500 text-gray-700 bg-gray-100" },
  ]

  return (
    <div className="border border-emerald-200 rounded overflow-hidden">
      <div className="bg-emerald-50 px-3 py-2 flex items-center gap-2">
        <Calendar size={11} className="text-emerald-700" />
        <span className="text-xs font-semibold text-emerald-800">Outreach Timeline — Day-by-day sequence</span>
      </div>
      {/* Tab row */}
      <div className="flex border-b border-gray-200 bg-white">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveDay(tab.key)}
            className={`flex-1 text-[11px] font-medium py-1.5 border-b-2 transition-colors ${
              activeDay === tab.key ? tab.activeColor + " border-b-2" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {/* Content */}
      <div className="p-3 space-y-2.5 bg-white">
        {activeDay === "day_1" && (
          <>
            <p className="text-[10px] text-blue-700 font-medium bg-blue-50 px-2 py-1 rounded">{schedule.day_1.note}</p>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">WhatsApp Message</p>
              <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed bg-gray-50 rounded p-2 border border-gray-100">{schedule.day_1.whatsapp}</pre>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Email</p>
              <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed bg-gray-50 rounded p-2 border border-gray-100">{schedule.day_1.email}</pre>
            </div>
          </>
        )}
        {activeDay === "day_3" && (
          <>
            <p className="text-[10px] text-indigo-700 font-medium bg-indigo-50 px-2 py-1 rounded">{schedule.day_3.note}</p>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Call Script</p>
              <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed bg-gray-50 rounded p-2 border border-gray-100">{schedule.day_3.call_script}</pre>
            </div>
          </>
        )}
        {activeDay === "day_7" && (
          <>
            <p className="text-[10px] text-violet-700 font-medium bg-violet-50 px-2 py-1 rounded">{schedule.day_7.note}</p>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Follow-up WhatsApp</p>
              <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed bg-gray-50 rounded p-2 border border-gray-100">{schedule.day_7.follow_up_whatsapp}</pre>
            </div>
          </>
        )}
        {activeDay === "day_14" && (
          <>
            <p className="text-[10px] text-gray-700 font-medium bg-gray-100 px-2 py-1 rounded">{schedule.day_14.note}</p>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Final WhatsApp</p>
              <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed bg-gray-50 rounded p-2 border border-gray-100">{schedule.day_14.final_whatsapp}</pre>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── WhatsApp Sequence Panel ──────────────────────────────────────────────────

function WhatsAppSequencePanel({ sequence }: {
  sequence: { first_message: string; follow_up: string; reminder: string; meeting_confirmation: string }
}) {
  const [active, setActive] = useState<"first" | "followup" | "reminder" | "confirm">("first")

  const tabs: Array<{ key: "first" | "followup" | "reminder" | "confirm"; label: string }> = [
    { key: "first",   label: "First" },
    { key: "followup", label: "Follow-up" },
    { key: "reminder", label: "Reminder" },
    { key: "confirm", label: "Meeting Confirm" },
  ]
  const content = {
    first: sequence.first_message,
    followup: sequence.follow_up,
    reminder: sequence.reminder,
    confirm: sequence.meeting_confirmation,
  }

  return (
    <div className="border border-green-200 rounded overflow-hidden">
      <div className="bg-green-50 px-3 py-2 flex items-center gap-2">
        <MessageSquare size={11} className="text-green-700" />
        <span className="text-xs font-semibold text-green-800">WhatsApp Sequence</span>
      </div>
      <div className="flex border-b border-gray-200 bg-white">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            className={`flex-1 text-[11px] font-medium py-1.5 border-b-2 transition-colors ${
              active === tab.key ? "border-green-500 text-green-700 bg-green-50" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="p-3 bg-white">
        <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed bg-gray-50 rounded p-2 border border-gray-100">
          {content[active]}
        </pre>
      </div>
    </div>
  )
}

// ─── Ads Deployment Package ───────────────────────────────────────────────────

function AdsDeploymentPackage({ pack }: { pack: Record<string, unknown> }) {
  const [openGroup, setOpenGroup] = useState<number | null>(0)

  const campaignName = String(pack.campaign_name || "")
  const objective = String(pack.campaign_objective || "")
  const adGroups = (pack.ad_groups as Array<{
    name: string; match_type: string; keywords: string[]; headlines: string[]; descriptions: string[]
  }>) || []
  const negKw = (pack.negative_keywords as string[]) || []

  if (!campaignName && adGroups.length === 0) return null

  return (
    <div className="border border-blue-200 rounded overflow-hidden">
      <div className="bg-blue-50 px-3 py-2 space-y-0.5">
        <div className="flex items-center gap-1.5">
          <Megaphone size={11} className="text-blue-700" />
          <span className="text-xs font-semibold text-blue-800">Google Ads Deployment Package</span>
        </div>
        <p className="text-[10px] text-blue-600">Copy directly into Google Ads — no editing needed</p>
      </div>

      <div className="p-3 space-y-3 bg-white">
        {/* Campaign name + objective */}
        {campaignName && (
          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Campaign Name</p>
            <code className="text-xs bg-gray-100 px-2 py-1 rounded block text-gray-800 font-mono">{campaignName}</code>
            {objective && <p className="text-[11px] text-gray-600">{objective}</p>}
          </div>
        )}

        {/* Ad groups */}
        {adGroups.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Ad Groups ({adGroups.length})</p>
            {adGroups.map((group, gi) => (
              <div key={gi} className="border border-gray-200 rounded overflow-hidden">
                <button
                  onClick={() => setOpenGroup(openGroup === gi ? null : gi)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-800">{group.name}</span>
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{group.match_type}</span>
                  </div>
                  {openGroup === gi ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                </button>
                {openGroup === gi && (
                  <div className="px-3 py-2.5 space-y-3">
                    {/* Keywords */}
                    {group.keywords.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Keywords</p>
                        <div className="flex flex-wrap gap-1">
                          {group.keywords.map((kw, ki) => (
                            <span key={ki} className="text-[10px] bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded border border-gray-200">{kw}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Headlines */}
                    {group.headlines.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Headlines <span className="text-gray-300 font-normal">(max 30 chars each)</span></p>
                        <div className="space-y-1">
                          {group.headlines.map((h, hi) => (
                            <div key={hi} className="flex items-start gap-2">
                              <span className="text-xs text-gray-700 flex-1">{h}</span>
                              <span className={`text-[9px] shrink-0 font-mono ${h.length > 30 ? "text-red-600" : "text-gray-400"}`}>{h.length}/30</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Descriptions */}
                    {group.descriptions.length > 0 && (
                      <div>
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Descriptions <span className="text-gray-300 font-normal">(max 90 chars each)</span></p>
                        <div className="space-y-1">
                          {group.descriptions.map((d, di) => (
                            <div key={di} className="flex items-start gap-2">
                              <span className="text-xs text-gray-700 flex-1">{d}</span>
                              <span className={`text-[9px] shrink-0 font-mono ${d.length > 90 ? "text-red-600" : "text-gray-400"}`}>{d.length}/90</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Negative keywords */}
        {negKw.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Negative Keywords</p>
            <div className="flex flex-wrap gap-1">
              {negKw.map((kw, ki) => (
                <span key={ki} className="text-[10px] bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.5 rounded">[{kw}]</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Execution Pack Panel ─────────────────────────────────────────────────────

interface NextStep { step: string; action: string; time: string; owner: string; dependency: string; expected_result: string }

const NEXT_STEPS: Record<string, NextStep[]> = {
  dealer_recruitment: [
    { step: "1", action: "Send WhatsApp message using the draft below", time: "5 min", owner: "Founder", dependency: "Dealer phone number", expected_result: "Dealer opens message; replies within 24 hours" },
    { step: "2", action: "Send outreach email using the draft below", time: "5 min", owner: "Founder", dependency: "Dealer email address", expected_result: "Dealer reads market data; gets on a call" },
    { step: "3", action: "Call using the call script if no response in 24 hours", time: "15 min", owner: "Founder", dependency: "WhatsApp sent", expected_result: "Call booked or verbal interest confirmed" },
    { step: "4", action: "Run meeting using agenda below when call is confirmed", time: "45 min", owner: "Founder", dependency: "Call booked", expected_result: "Dealer agreement signed or next meeting set" },
  ],
  oem_displacement: [
    { step: "1", action: "Send outreach email using the draft below", time: "5 min", owner: "Founder", dependency: "Purchase officer email", expected_result: "Officer reads email; requests catalog or quote" },
    { step: "2", action: "Send WhatsApp message using the draft below", time: "5 min", owner: "Founder", dependency: "Officer phone number", expected_result: "WhatsApp reply within 48 hours" },
    { step: "3", action: "Call using the call script if no response in 2 days", time: "10 min", owner: "Founder", dependency: "Email sent", expected_result: "Demo or meeting booked with purchase team" },
    { step: "4", action: "Run meeting using agenda when demo is confirmed", time: "30 min", owner: "Founder / Dealer", dependency: "Meeting scheduled", expected_result: "Tender specification includes 100X; quote submitted on GeM" },
  ],
  landing_page: [
    { step: "1", action: "Brief developer with SEO brief below", time: "15 min", owner: "Founder", dependency: "Developer available", expected_result: "Developer has clear spec; can start same day" },
    { step: "2", action: "Create page content using content outline below", time: "2 hours", owner: "Developer / Writer", dependency: "Brief approved", expected_result: "Draft content ready for founder review" },
    { step: "3", action: "Publish using meta tags below and submit to GSC", time: "30 min", owner: "Developer", dependency: "Content ready", expected_result: "Page indexed within 3-7 days; GSC shows impressions" },
    { step: "4", action: "Add internal links from existing pages to new page", time: "15 min", owner: "Developer", dependency: "Page live", expected_result: "Page authority improves; faster rank movement" },
  ],
  campaign: [
    { step: "1", action: "Review creative brief and targeting notes below", time: "10 min", owner: "Founder", dependency: "None", expected_result: "Campaign strategy confirmed before spend begins" },
    { step: "2", action: "Create campaign in Google Ads using ad copy drafts", time: "30 min", owner: "Founder", dependency: "Google Ads access", expected_result: "Campaign live within 24-48 hours" },
    { step: "3", action: "Set budget per recommendation in Revenue Director", time: "5 min", owner: "Founder", dependency: "Campaign created", expected_result: "Budget allocated; campaign starts generating impressions" },
    { step: "4", action: "Monitor performance after 72 hours, adjust bids", time: "15 min", owner: "Founder", dependency: "Campaign running", expected_result: "Optimized CPC; first leads within 5-7 days" },
  ],
  customer_match: [
    { step: "1", action: "Download audience CSV below — source contact emails separately (purchase officers)", time: "30 min", owner: "Founder", dependency: "CSV downloaded", expected_result: "Clean CSV with emails + org names ready for upload" },
    { step: "2", action: "Upload contact CSV to Google Ads → Tools → Audience Manager → Customer Lists", time: "10 min", owner: "Founder", dependency: "CSV ready (min 1,000 contacts)", expected_result: "Audience list appears in Google Ads within 24 hours" },
    { step: "3", action: "Wait 24-48 hours for Google to match and build audience", time: "0 min", owner: "Google", dependency: "Upload complete", expected_result: "Matched audience of 300-500 contacts (28% match rate)" },
    { step: "4", action: "Add audience to campaign with +30% bid adjustment", time: "10 min", owner: "Founder", dependency: "Audience built", expected_result: "Higher ad visibility to known buyers; improved conversion rate" },
  ],
}

interface AudienceCategoryBreakdown {
  category: string
  org_count: number
  total_gmv: number
  priority_score: number
}

function CustomerMatchBreakdown({ recId }: { recId: string }) {
  const [breakdown, setBreakdown] = useState<{ categories: AudienceCategoryBreakdown[]; total_orgs: number; total_gmv: number; upload_ready: boolean } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/admin/growth/director/customer-match-export")
      .then(r => r.json())
      .then(d => setBreakdown(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [recId])

  const INR_fmt = (n: number) =>
    n >= 1e7 ? `₹${(n / 1e7).toFixed(1)}Cr` :
    n >= 1e5 ? `₹${(n / 1e5).toFixed(1)}L` : `₹${Math.round(n).toLocaleString()}`

  if (loading) return <div className="text-xs text-gray-400 py-2">Loading audience breakdown…</div>
  if (!breakdown) return null

  return (
    <div className="space-y-3 mt-2">
      {/* Summary strip */}
      <div className="flex flex-wrap gap-4 text-xs bg-blue-50 rounded px-3 py-2.5 border border-blue-100">
        <span><span className="font-semibold text-blue-900">Total orgs:</span> <span className="text-blue-700">{breakdown.total_orgs.toLocaleString()}</span></span>
        <span><span className="font-semibold text-blue-900">Market GMV:</span> <span className="text-blue-700">{INR_fmt(breakdown.total_gmv)}</span></span>
        <span>
          <span className="font-semibold text-blue-900">Upload ready:</span>{" "}
          <span className={breakdown.upload_ready ? "text-green-700 font-semibold" : "text-amber-600"}>
            {breakdown.upload_ready ? "Yes (≥1,000 orgs)" : `No (${breakdown.total_orgs} — need 1,000+)`}
          </span>
        </span>
      </div>

      {/* Category breakdown table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {["Audience Category", "Org Count", "Market GMV", "Priority"].map(h => (
                <th key={h} className="text-left px-3 py-2 text-gray-400 font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {breakdown.categories.map(cat => (
              <tr key={cat.category} className="hover:bg-gray-50/50">
                <td className="px-3 py-2 font-semibold text-gray-800">{cat.category}</td>
                <td className="px-3 py-2 text-gray-600">{cat.org_count.toLocaleString()}</td>
                <td className="px-3 py-2 text-emerald-700 font-semibold">{INR_fmt(cat.total_gmv)}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 rounded-full bg-gray-200 w-16 overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(cat.priority_score, 100)}%` }} />
                    </div>
                    <span className="text-gray-500">{cat.priority_score}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Download button + Google Ads warning */}
      <div className="bg-amber-50 border border-amber-200 rounded px-3 py-2.5 text-[11px] text-amber-800 space-y-1">
        <p className="font-semibold">Before uploading to Google Ads Customer Match:</p>
        <p>This CSV contains <strong>procurement intelligence</strong> (org names, GMV, categories) — not contact details. Google Ads Customer Match requires email addresses or phone numbers.</p>
        <p>Step 1: Download this CSV to identify which orgs to target. Step 2: Source contact details (purchase officers) via GeM directory or LinkedIn. Step 3: Upload the contact file to Google Ads.</p>
      </div>
      <a
        href="/api/admin/growth/director/customer-match-export?format=csv"
        download
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        <Package size={11} />
        Download Audience Intelligence CSV ({breakdown.total_orgs.toLocaleString()} orgs)
      </a>
      <p className="text-[10px] text-gray-400">Columns: org name · state · dept category · GMV · contracts · audience category · priority score</p>
    </div>
  )
}

function ExecutionPackPanel({ recId, recType }: { recId: string; recType: string }) {
  const [pack, setPack] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [doneSteps, setDoneSteps] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch(`/api/admin/growth/director/packs/${recId}`)
      .then(r => r.json())
      .then(d => { if (d.pack) setPack(d.pack as Record<string, unknown>) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [recId])

  if (loading) return (
    <div className="flex items-center gap-1.5 text-xs text-gray-400 py-2">
      <RefreshCw size={11} className="animate-spin" /> Generating execution pack…
    </div>
  )

  if (!pack) return (
    <div className="text-xs text-gray-400 py-1">Pack not ready yet — check back in a moment.</div>
  )

  const packType = String(pack.type || "")
  const nextSteps = NEXT_STEPS[packType] ?? []

  const sections: Array<{ key: string; label: string; content: string }> = []

  if (packType === "dealer_recruitment") {
    if (pack.market_evidence) sections.push({ key: "evidence", label: "Market Intelligence", content: String(pack.market_evidence) })
    if (pack.outreach_email_draft) sections.push({ key: "email", label: "Outreach Email Draft", content: String(pack.outreach_email_draft) })
    if (pack.whatsapp_draft) sections.push({ key: "whatsapp", label: "WhatsApp Draft", content: String(pack.whatsapp_draft) })
    if (pack.call_script) sections.push({ key: "call", label: "Call Script", content: String(pack.call_script) })
    if (pack.meeting_agenda) sections.push({ key: "meeting", label: "Meeting Agenda", content: String(pack.meeting_agenda) })
  } else if (packType === "oem_displacement") {
    if (pack.market_evidence) sections.push({ key: "evidence", label: "Organization Intelligence", content: String(pack.market_evidence) })
    if (pack.outreach_email_draft) sections.push({ key: "email", label: "Outreach Email Draft", content: String(pack.outreach_email_draft) })
    if (pack.whatsapp_draft) sections.push({ key: "whatsapp", label: "WhatsApp Draft", content: String(pack.whatsapp_draft) })
    if (pack.call_script) sections.push({ key: "call", label: "Call Script", content: String(pack.call_script) })
    if (pack.meeting_agenda) sections.push({ key: "meeting", label: "Meeting Agenda", content: String(pack.meeting_agenda) })
  } else if (packType === "landing_page") {
    if (pack.seo_brief) sections.push({ key: "seo", label: "SEO Brief", content: String(pack.seo_brief) })
    if (pack.content_outline) sections.push({ key: "outline", label: "Content Outline", content: String(pack.content_outline) })
    if (pack.cta_recommendation) sections.push({ key: "cta", label: "CTA Recommendation", content: String(pack.cta_recommendation) })
    if (pack.meta_title) sections.push({ key: "meta", label: "Meta Tags", content: `Title: ${pack.meta_title}\n\nDescription: ${pack.meta_description}` })
  } else if (packType === "campaign") {
    if (pack.creative_brief) sections.push({ key: "brief", label: "Creative Brief", content: String(pack.creative_brief) })
    if (pack.targeting_notes) sections.push({ key: "targeting", label: "Targeting", content: String(pack.targeting_notes) })
    if (Array.isArray(pack.ad_copy_drafts) && pack.ad_copy_drafts.length > 0) {
      const copies = (pack.ad_copy_drafts as Array<{ headline: string; description: string }>)
        .map((c, i) => `AD ${i + 1}\nHeadline: ${c.headline}\nDescription: ${c.description}`)
        .join("\n\n")
      sections.push({ key: "adcopy", label: "Ad Copy Drafts", content: copies })
    }
  } else if (packType === "customer_match") {
    if (pack.campaign_brief) sections.push({ key: "brief", label: "Campaign Brief", content: String(pack.campaign_brief) })
    if (pack.upload_instructions) sections.push({ key: "upload", label: "Upload Instructions", content: String(pack.upload_instructions) })
  }

  // v2.3: outreach schedule (dealer packs) replaces next steps checklist
  const hasOutreachSchedule = packType === "dealer_recruitment" && pack.outreach_schedule != null
  const hasWhatsAppSeq = (packType === "dealer_recruitment" || packType === "oem_displacement" || packType === "campaign") && pack.whatsapp_sequence != null
  const hasAdGroups = packType === "campaign" && Array.isArray(pack.ad_groups) && (pack.ad_groups as unknown[]).length > 0

  return (
    <div className="space-y-2">
      {/* ── Outreach Timeline (v2.3 dealer packs) ────────────────────────── */}
      {hasOutreachSchedule ? (
        <OutreachTimelinePanel schedule={pack.outreach_schedule as Parameters<typeof OutreachTimelinePanel>[0]["schedule"]} />
      ) : nextSteps.length > 0 && (
        /* ── Next Steps: one-click handoff ──────────────────────────────── */
        <div className="border border-emerald-200 rounded overflow-hidden">
          <div className="bg-emerald-50 px-3 py-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800">Next Steps — Exact Actions</span>
            <span className="text-[10px] text-emerald-600">{doneSteps.size}/{nextSteps.length} complete</span>
          </div>
          <div className="divide-y divide-emerald-50">
            {nextSteps.map(ns => {
              const done = doneSteps.has(ns.step)
              return (
                <div key={ns.step} className={`flex items-start gap-3 px-3 py-2.5 ${done ? "bg-emerald-50/50" : "bg-white"}`}>
                  <button
                    onClick={() => setDoneSteps(prev => {
                      const next = new Set(prev)
                      if (next.has(ns.step)) next.delete(ns.step)
                      else next.add(ns.step)
                      return next
                    })}
                    className={`shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 ${
                      done ? "bg-emerald-500 border-emerald-500" : "border-gray-300 hover:border-emerald-400"
                    }`}
                  >
                    {done && <Check size={10} className="text-white" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium ${done ? "text-gray-400 line-through" : "text-gray-800"}`}>
                      Step {ns.step}: {ns.action}
                    </p>
                    <div className="flex flex-wrap gap-3 mt-0.5 text-[10px] text-gray-400">
                      <span>⏱ {ns.time}</span>
                      <span>👤 {ns.owner}</span>
                      {ns.dependency && <span>🔗 Needs: {ns.dependency}</span>}
                    </div>
                    {ns.expected_result && !done && (
                      <p className="text-[10px] text-emerald-700 mt-0.5">✓ Expected: {ns.expected_result}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── WhatsApp Sequence (v2.3) ─────────────────────────────────────── */}
      {hasWhatsAppSeq && (
        <WhatsAppSequencePanel sequence={pack.whatsapp_sequence as Parameters<typeof WhatsAppSequencePanel>[0]["sequence"]} />
      )}

      {/* ── Google Ads Deployment Package (v2.3 campaign packs) ──────────── */}
      {hasAdGroups && (
        <AdsDeploymentPackage pack={pack} />
      )}

      {/* ── Audience Breakdown for Customer Match ──────────────────────────── */}
      {packType === "customer_match" && (
        <div className="border border-blue-200 rounded overflow-hidden">
          <div className="bg-blue-50 px-3 py-2">
            <span className="text-xs font-semibold text-blue-800">Audience Breakdown by Category</span>
          </div>
          <div className="px-3 py-3">
            <CustomerMatchBreakdown recId={recId} />
          </div>
        </div>
      )}

      {/* ── Pack sections ───────────────────────────────────────────────────── */}
      {sections.length === 0 ? (
        <div className="text-xs text-gray-400 py-1">Pack generated (type: {packType})</div>
      ) : (
        sections.map(s => (
          <div key={s.key} className="border border-gray-200 rounded overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === s.key ? null : s.key)}
              className="w-full flex items-center justify-between px-3 py-2 text-left bg-gray-50 hover:bg-gray-100"
            >
              <span className="text-xs font-semibold text-gray-700">{s.label}</span>
              {expanded === s.key ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            {expanded === s.key && (
              <div className="px-3 py-2.5">
                <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{s.content}</pre>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}

// ─── Help Panel ───────────────────────────────────────────────────────────────

function HelpPanel({ rec }: { rec: Rec }) {
  if (!rec.help_what && !rec.help_why && !rec.help_if_approved && !rec.help_if_ignored) return null
  return (
    <div className="space-y-2.5 text-xs text-gray-600">
      {rec.help_what && (
        <div>
          <span className="font-semibold text-gray-800 block mb-0.5">What is this?</span>
          {rec.help_what}
        </div>
      )}
      {rec.help_why && (
        <div>
          <span className="font-semibold text-gray-800 block mb-0.5">Why was it generated?</span>
          {rec.help_why}
        </div>
      )}
      {rec.help_if_approved && (
        <div>
          <span className="font-semibold text-green-700 block mb-0.5">If you approve →</span>
          {rec.help_if_approved}
        </div>
      )}
      {rec.help_if_ignored && (
        <div>
          <span className="font-semibold text-orange-700 block mb-0.5">If you ignore →</span>
          {rec.help_if_ignored}
        </div>
      )}
    </div>
  )
}

// ─── Lifecycle Timeline ───────────────────────────────────────────────────────

function LifecycleTimeline({ rec }: { rec: Rec }) {
  const steps: Array<{ label: string; date: string | null | undefined; done: boolean }> = [
    { label: "Generated",   date: rec.generated_at,   done: true },
    { label: "Reviewed",    date: rec.reviewed_at,     done: Boolean(rec.reviewed_at) },
    { label: "In Progress", date: rec.in_progress_at,  done: ["in_progress", "applied", "completed", "won", "lost"].includes(rec.status) },
    {
      label: rec.status === "won" ? "Won" : rec.status === "lost" ? "Lost" : "Completed",
      date: rec.won_at || rec.lost_at || rec.completed_at,
      done: ["completed", "won", "lost"].includes(rec.status),
    },
  ]

  return (
    <div className="flex items-center gap-0 text-[10px] text-gray-400">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center">
          <div className={`flex flex-col items-center ${step.done ? "text-gray-600" : "text-gray-300"}`}>
            <div className={`w-1.5 h-1.5 rounded-full mb-0.5 ${step.done ? "bg-gray-500" : "bg-gray-200"}`} />
            <span className="whitespace-nowrap">{step.label}</span>
            {step.date && <span className="text-gray-400">{fmtDate(step.date)}</span>}
          </div>
          {i < steps.length - 1 && (
            <div className={`w-6 h-px mx-1 ${steps[i + 1]?.done ? "bg-gray-400" : "bg-gray-200"}`} />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Execution Path Panel ─────────────────────────────────────────────────────

function ExecutionPathPanel({ rec }: { rec: Rec }) {
  const steps: Array<{
    step: number
    label: string
    status: "done" | "active" | "generating" | "pending" | "skipped"
    content: React.ReactNode
  }> = [
    {
      step: 1,
      label: "Intelligence Signal",
      status: "done",
      content: (
        <div className="text-xs text-gray-600 space-y-1">
          <div className="flex flex-wrap items-center gap-1">
            <span className="font-medium text-gray-700">Sources:</span>
            {rec.sources.map(s => (
              <span key={s} className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-[11px]">{s}</span>
            ))}
          </div>
          <p className="text-gray-500 text-[11px]">{rec.evidence}</p>
        </div>
      ),
    },
    {
      step: 2,
      label: "Recommendation Generated",
      status: "done",
      content: (
        <div className="text-xs text-gray-600 space-y-0.5">
          <p><span className="font-medium">Type:</span> {TYPE_LABEL[rec.type]}</p>
          <p><span className="font-medium">Est. impact:</span> {INR(rec.expected_revenue_impact)}</p>
          <p><span className="font-medium">Confidence:</span> {rec.confidence}%</p>
          <p className="text-gray-400 text-[11px]">Generated {fmtDate(rec.generated_at)} at {fmtTime(rec.generated_at)}</p>
        </div>
      ),
    },
    {
      step: 3,
      label: "Founder Decision",
      status: rec.status !== "pending" ? "done" : "pending",
      content: rec.status !== "pending" ? (
        <div className="text-xs text-gray-600 space-y-0.5">
          <p>
            <span className={`font-medium ${
              ["approved","in_progress","applied","completed","won"].includes(rec.status) ? "text-green-700" :
              rec.status === "rejected" ? "text-red-700" : "text-gray-700"
            }`}>
              {STATUS_DISPLAY[rec.status]?.label ?? rec.status}
            </span>
            {rec.reviewed_at && (
              <span className="text-gray-400 ml-1.5 text-[11px]">on {fmtDate(rec.reviewed_at)}</span>
            )}
          </p>
          {rec.rejection_reason && (
            <p className="text-red-600 text-[11px]">Reason: {rec.rejection_reason}</p>
          )}
        </div>
      ) : (
        <p className="text-xs text-gray-400 italic">Awaiting founder review</p>
      ),
    },
    {
      step: 4,
      label: "Execution Pack",
      status: rec.execution_pack_id
        ? "done"
        : ["approved","in_progress","applied","completed","won"].includes(rec.status)
          ? "generating"
          : "skipped",
      content: rec.execution_pack_id ? (
        <p className="text-xs text-green-700">Pack generated. Expand "View Execution Pack" above to see outreach emails, call scripts, and briefs.</p>
      ) : ["approved","in_progress","applied","completed","won"].includes(rec.status) ? (
        <p className="text-xs text-yellow-600 italic">Generating execution artifacts…</p>
      ) : (
        <p className="text-xs text-gray-400 italic">No pack — recommendation was not approved.</p>
      ),
    },
    {
      step: 5,
      label: "Execution",
      status: ["in_progress","applied","completed","won","lost"].includes(rec.status) ? "done"
        : rec.status === "approved" ? "active"
        : "pending",
      content: (
        <div className="text-xs text-gray-600 space-y-0.5">
          {rec.owner && <p><span className="font-medium">Owner:</span> {rec.owner}</p>}
          {rec.target_completion_date && (
            <p><span className="font-medium">Target:</span> {rec.target_completion_date}</p>
          )}
          {rec.in_progress_at && (
            <p className="text-gray-400 text-[11px]">Started {fmtDate(rec.in_progress_at)}</p>
          )}
          {!rec.owner && !rec.in_progress_at && (
            <p className="text-gray-400 italic">Not yet started</p>
          )}
        </div>
      ),
    },
    {
      step: 6,
      label: "Outcome",
      status: ["won","lost"].includes(rec.status) ? "done"
        : rec.status === "completed" ? "active"
        : "pending",
      content: (
        <div className="text-xs text-gray-600 space-y-0.5">
          {rec.status === "won" && (
            <>
              <p className="text-emerald-700 font-medium">Won on {fmtDate(rec.won_at)}</p>
              <p>
                <span className="font-medium">Revenue captured:</span>{" "}
                <span className="text-emerald-700 font-semibold">{INR(rec.realized_impact || 0)}</span>
                {rec.expected_revenue_impact > 0 && rec.realized_impact ? (
                  <span className="text-gray-400 ml-1.5 text-[11px]">
                    ({Math.round((rec.realized_impact / rec.expected_revenue_impact) * 100)}% of {INR(rec.expected_revenue_impact)} estimate)
                  </span>
                ) : null}
              </p>
              {rec.outcome_notes && <p className="text-gray-500 text-[11px]">{rec.outcome_notes}</p>}
            </>
          )}
          {rec.status === "lost" && (
            <>
              <p className="text-red-600 font-medium">Lost on {fmtDate(rec.lost_at)}</p>
              {rec.outcome_notes && <p className="text-gray-500 text-[11px]">{rec.outcome_notes}</p>}
            </>
          )}
          {rec.status === "completed" && (
            <p className="text-indigo-700 italic">Completed — awaiting final outcome (Won / Lost)</p>
          )}
          {!["won","lost","completed"].includes(rec.status) && (
            <p className="text-gray-400 italic">No outcome recorded yet</p>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-0">
      {steps.map((step, i) => (
        <div key={step.step} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
              step.status === "done"       ? "bg-gray-800 text-white" :
              step.status === "active"     ? "bg-blue-600 text-white" :
              step.status === "generating" ? "bg-yellow-400 text-yellow-900" :
              "bg-gray-100 text-gray-400 border border-gray-200"
            }`}>
              {step.step}
            </div>
            {i < steps.length - 1 && (
              <div className={`w-px flex-1 min-h-[16px] my-1 ${step.status === "done" ? "bg-gray-300" : "bg-gray-100"}`} />
            )}
          </div>
          <div className="flex-1 pb-3">
            <p className={`text-xs font-semibold mb-1 ${
              step.status === "done"       ? "text-gray-800" :
              step.status === "active"     ? "text-blue-700" :
              step.status === "generating" ? "text-yellow-700" :
              "text-gray-400"
            }`}>
              {step.label}
              {step.status === "generating" && (
                <span className="ml-1.5 text-[10px] font-normal text-yellow-600">generating…</span>
              )}
            </p>
            {step.content}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Campaign Intelligence Panel ─────────────────────────────────────────────

function CampaignIntelPanel({ rec, sourcesConnected }: { rec: Rec; sourcesConnected: string[] }) {
  const [showRejected, setShowRejected] = useState(true)
  const intel = getCampaignIntelligence(
    rec.type,
    rec.payload ?? {},
    rec.confidence,
    rec.expected_revenue_impact,
  )
  const readiness = getReadiness(rec, sourcesConnected)

  return (
    <div className="space-y-3">
      {/* Strategic thesis */}
      <p className="text-xs text-gray-700 leading-relaxed bg-amber-50 border border-amber-100 rounded px-3 py-2">
        {intel.strategic_thesis}
      </p>

      {/* Primary bundles */}
      <div className="space-y-2">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Recommended Campaigns</p>
        {intel.primary_bundles.map((b, i) => (
          <div key={i} className="border border-green-200 rounded bg-green-50 px-3 py-2 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-green-800">{b.campaign_label}</span>
              <div className="flex items-center gap-2 text-[10px] text-green-700">
                {b.estimated_budget_inr > 0 && (
                  <span className="flex items-center gap-0.5"><DollarSign size={10} />{INR(b.estimated_budget_inr)}/mo</span>
                )}
                <span>{b.confidence_pct}% conf.</span>
              </div>
            </div>
            <p className="text-[11px] text-gray-600">{b.reason_selected}</p>
            <div className="flex gap-3 text-[10px] text-green-700 pt-0.5">
              <span>~{b.expected_leads} leads</span>
              <span>·</span>
              <span>{INR(b.expected_revenue_inr)} est. rev.</span>
              <span>·</span>
              <span className="font-semibold">
                {b.estimated_budget_inr > 0
                  ? `${Math.round((b.expected_revenue_inr - b.estimated_budget_inr) / b.estimated_budget_inr * 100)}% ROI`
                  : "Organic (∞ ROI)"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* If-nothing */}
      <div className="bg-red-50 border border-red-100 rounded px-3 py-2">
        <p className="text-[10px] font-semibold text-red-600 mb-0.5 uppercase tracking-wide">If Nothing Happens</p>
        <p className="text-xs text-red-700">{intel.if_nothing_impact}</p>
      </div>

      {/* Totals */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-600 bg-gray-50 rounded px-3 py-2">
        <span><span className="font-semibold text-gray-800">Budget:</span> {intel.total_budget_estimate_inr > 0 ? INR(intel.total_budget_estimate_inr) + "/mo" : "₹0 (organic)"}</span>
        <span><span className="font-semibold text-gray-800">Rev target:</span> {INR(intel.total_expected_revenue_inr)}</span>
        <span>
          <span className="font-semibold text-gray-800">ROI:</span>{" "}
          <span className={intel.total_budget_estimate_inr > 0 && intel.total_expected_revenue_inr > intel.total_budget_estimate_inr ? "text-emerald-700 font-semibold" : "text-gray-600"}>
            {intel.total_budget_estimate_inr > 0
              ? `${Math.round((intel.total_expected_revenue_inr - intel.total_budget_estimate_inr) / intel.total_budget_estimate_inr * 100)}%`
              : "∞ (organic)"}
          </span>
        </span>
        <span><span className="font-semibold text-gray-800">Confidence:</span> {intel.overall_confidence}%</span>
      </div>

      {/* Rejected campaigns */}
      {intel.rejected_bundles.length > 0 && (
        <div>
          <button
            onClick={() => setShowRejected(r => !r)}
            className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-600"
          >
            {showRejected ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            {showRejected ? "Hide" : "Show"} rejected alternatives ({intel.rejected_bundles.length})
          </button>
          {showRejected && (
            <div className="mt-1.5 space-y-1.5">
              {intel.rejected_bundles.map((b, i) => (
                <div key={i} className="border border-gray-200 rounded bg-gray-50 px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <XCircle size={10} className="text-gray-400" />
                    <span className="text-[11px] font-medium text-gray-600">{b.campaign_label}</span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5 ml-3.5">{b.reason_rejected}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Cross-links */}
      <div className="flex flex-wrap gap-1.5 pt-1">
        {intel.cross_links.map((link, i) => (
          <Link
            key={i}
            href={link.href}
            className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300"
          >
            <ArrowRight size={9} />
            {link.label}
            {link.badge && (
              <span className="ml-0.5 px-1 py-0 text-[9px] bg-gray-100 text-gray-500 rounded">{link.badge}</span>
            )}
          </Link>
        ))}
      </div>

      {/* Google Ads Deployment Readiness — for all ad-type recs */}
      {readiness.ads_checklist && readiness.ads_checklist.length > 0 && (
        <AdsDeploymentChecklist items={readiness.ads_checklist} />
      )}
    </div>
  )
}

// ─── Rec Card ─────────────────────────────────────────────────────────────────

function RecCard({
  rec, onAction, actioning, sourcesConnected,
}: {
  rec: Rec
  onAction: (id: string, action: string, extra?: Record<string, unknown>) => Promise<void>
  actioning: string | null
  sourcesConnected: string[]
}) {
  const [showReject, setShowReject]     = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [showHelp, setShowHelp]         = useState(false)
  const [showPack, setShowPack]         = useState(false)
  const [showPath, setShowPath]         = useState(false)
  const [showIntel, setShowIntel]       = useState(true)
  const [showOwner, setShowOwner]       = useState(false)
  const [showContacts, setShowContacts] = useState(false)
  const [owner, setOwner]               = useState(rec.owner || "")
  const [targetDate, setTargetDate]     = useState(rec.target_completion_date || "")
  const [realizedImpact, setRealizedImpact] = useState("")
  const [outcomeNotes, setOutcomeNotes] = useState("")
  const [showWonInput, setShowWonInput] = useState(false)
  const [showLostInput, setShowLostInput] = useState(false)
  const [contacts, setContacts]         = useState<Contact[]>([])

  // Fetch contacts for org-based recs (oem_displacement, procurement_target, dealer_recruit)
  const orgName = ["oem_displacement", "procurement_target"].includes(rec.type)
    ? String(rec.payload?.organization_name || "")
    : rec.type === "dealer_recruit"
    ? String(rec.payload?.state || "")
    : ""

  useEffect(() => {
    if (!orgName) return
    fetch(`/api/admin/growth/director/contacts?org_name=${encodeURIComponent(orgName)}`)
      .then(r => r.json())
      .then(d => setContacts(d.contacts || []))
      .catch(() => {})
  }, [orgName])

  const isActioning = actioning === rec._id
  const hasPack = Boolean(rec.execution_pack_id)
  const statusDisplay = STATUS_DISPLAY[rec.status] || STATUS_DISPLAY.pending
  const readiness = getReadiness(rec, sourcesConnected, contacts)
  const displayTitle = readiness.display_title || rec.title

  const needsOutcomeInput = (action: "won" | "lost") => {
    if (action === "won") setShowWonInput(true)
    else setShowLostInput(true)
  }

  async function submitOutcome(action: "won" | "lost") {
    await onAction(rec._id, action, {
      realized_impact: realizedImpact ? Number(realizedImpact) : undefined,
      outcome_notes: outcomeNotes || undefined,
    })
    setShowWonInput(false)
    setShowLostInput(false)
    setRealizedImpact("")
    setOutcomeNotes("")
  }

  async function saveOwner() {
    await onAction(rec._id, "update_meta", { owner, target_completion_date: targetDate })
    setShowOwner(false)
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 border-l-4 ${PRIORITY_BORDER[rec.priority]} shadow-sm`}>
      {/* Card body */}
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded border ${PRIORITY_COLOR[rec.priority]}`}>
              {rec.priority.toUpperCase()}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] bg-gray-100 text-gray-600 rounded border border-gray-200">
              {TYPE_ICON[rec.type]}
              {TYPE_LABEL[rec.type]}
            </span>
            {rec.sources.map(s => (
              <span key={s} className="px-1.5 py-0.5 text-[11px] bg-blue-50 text-blue-600 rounded">{s}</span>
            ))}
            {rec.status !== "pending" && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded font-medium ${statusDisplay.color}`}>
                {statusDisplay.icon} {statusDisplay.label}
              </span>
            )}
          </div>
          <div className="text-right shrink-0">
            <div className="text-lg font-bold text-gray-900">{INR(rec.expected_revenue_impact)}</div>
            <div className="text-[11px] text-gray-400">est. impact</div>
            {rec.realized_impact !== undefined && rec.realized_impact > 0 && (
              <div className="text-[11px] text-emerald-600 font-semibold">
                {INR(rec.realized_impact)} realized
              </div>
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="mt-3 text-[15px] font-semibold text-gray-900 leading-snug">{displayTitle}</h3>
        {readiness.display_title && (
          <p className="text-[10px] text-gray-400 mt-0.5">Original: {rec.title}</p>
        )}

        {/* Why now */}
        <p className="mt-1.5 text-sm text-gray-700">{rec.why_now}</p>

        {/* Evidence */}
        <p className="mt-2 text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded border border-gray-100">{rec.evidence}</p>

        {/* Expected action */}
        <div className="mt-3 flex items-start gap-2">
          <ArrowRight size={13} className="text-blue-600 mt-0.5 shrink-0" />
          <p className="text-sm text-blue-700 font-medium leading-snug">{rec.expected_action}</p>
        </div>

        {/* Meta row */}
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Cpu size={11} />{rec.confidence}% confidence
          </span>
          <span className="flex items-center gap-1">
            <Clock size={11} />{EFFORT_LABEL[rec.effort] || rec.effort}
          </span>
          {rec.owner && (
            <span className="flex items-center gap-1 text-indigo-600">
              <User size={11} />Owner: {rec.owner}
            </span>
          )}
          {rec.target_completion_date && (
            <span className="flex items-center gap-1 text-orange-600">
              <Calendar size={11} />By {rec.target_completion_date}
            </span>
          )}
        </div>

        {/* Confidence bar */}
        <div className="mt-2 h-1 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-blue-400 rounded-full" style={{ width: `${rec.confidence}%` }} />
        </div>

        {/* Pre-approval readiness — visible for pending recs */}
        {rec.status === "pending" && (
          <ReadinessScore readiness={readiness} />
        )}

        {/* Lifecycle timeline for non-pending */}
        {rec.status !== "pending" && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <LifecycleTimeline rec={rec} />
          </div>
        )}

        {/* Rejection reason */}
        {rec.status === "rejected" && rec.rejection_reason && (
          <div className="mt-2 text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded">
            Rejected: {rec.rejection_reason}
          </div>
        )}
        {/* Outcome notes */}
        {rec.outcome_notes && (
          <div className="mt-2 text-xs text-gray-600 bg-gray-50 px-3 py-1.5 rounded">
            Notes: {rec.outcome_notes}
          </div>
        )}
      </div>

      {/* Expandable sections */}
      {(rec.help_what || rec.help_why) && (
        <div className="border-t border-gray-100">
          <button
            onClick={() => setShowHelp(h => !h)}
            className="w-full flex items-center gap-1.5 px-4 py-2 text-xs text-gray-500 hover:bg-gray-50 hover:text-gray-700"
          >
            <HelpCircle size={12} />
            {showHelp ? "Hide help" : "What is this? Why was it generated?"}
            {showHelp ? <ChevronUp size={11} className="ml-auto" /> : <ChevronDown size={11} className="ml-auto" />}
          </button>
          {showHelp && (
            <div className="px-4 py-3 bg-amber-50 border-t border-amber-100">
              <HelpPanel rec={rec} />
            </div>
          )}
        </div>
      )}

      {/* Campaign Intelligence */}
      <div className="border-t border-gray-100">
        <button
          onClick={() => setShowIntel(v => !v)}
          className="w-full flex items-center gap-1.5 px-4 py-2 text-xs text-gray-500 hover:bg-gray-50 hover:text-gray-700"
        >
          <Lightbulb size={12} className="text-amber-500" />
          Campaign Intelligence — why this, budget, if nothing
          {showIntel ? <ChevronUp size={11} className="ml-auto" /> : <ChevronDown size={11} className="ml-auto" />}
        </button>
        {showIntel && (
          <div className="px-4 py-3 border-t border-amber-50 bg-white">
            <CampaignIntelPanel rec={rec} sourcesConnected={sourcesConnected} />
          </div>
        )}
      </div>

      {/* Execution pack */}
      {(hasPack || rec.status === "approved" || ["in_progress", "applied", "completed", "won"].includes(rec.status)) && (
        <div className="border-t border-gray-100">
          <button
            onClick={() => setShowPack(p => !p)}
            className="w-full flex items-center gap-1.5 px-4 py-2 text-xs text-gray-500 hover:bg-gray-50 hover:text-gray-700"
          >
            <Package size={12} />
            {hasPack ? "View Execution Pack" : "Generating execution pack…"}
            {showPack ? <ChevronUp size={11} className="ml-auto" /> : <ChevronDown size={11} className="ml-auto" />}
          </button>
          {showPack && (
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
              <ExecutionPackPanel recId={rec._id} recType={rec.type} />
            </div>
          )}
        </div>
      )}

      {/* Contact Intelligence — for org-based recs */}
      {orgName && (
        <div className="border-t border-gray-100">
          <button
            onClick={() => setShowContacts(c => !c)}
            className="w-full flex items-center gap-1.5 px-4 py-2 text-xs text-gray-500 hover:bg-gray-50 hover:text-gray-700"
          >
            <Phone size={12} />
            Contact Intelligence
            {contacts.length > 0 && (
              <span className="ml-1 text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded font-semibold">{contacts.length} contact{contacts.length !== 1 ? "s" : ""}</span>
            )}
            {showContacts ? <ChevronUp size={11} className="ml-auto" /> : <ChevronDown size={11} className="ml-auto" />}
          </button>
          {showContacts && (
            <div className="px-4 py-3 border-t border-gray-100">
              <p className="text-[10px] text-gray-400 mb-2">Contacts for <strong>{orgName}</strong></p>
              <ContactPanel
                orgName={orgName}
                contacts={contacts}
                onContactAdded={c => setContacts(prev => [c, ...prev])}
                onContactDeleted={id => setContacts(prev => prev.filter(c => c._id !== id))}
              />
            </div>
          )}
        </div>
      )}

      {/* Execution path */}
      {rec.status !== "pending" && (
        <div className="border-t border-gray-100">
          <button
            onClick={() => setShowPath(p => !p)}
            className="w-full flex items-center gap-1.5 px-4 py-2 text-xs text-gray-500 hover:bg-gray-50 hover:text-gray-700"
          >
            <ChevronRight size={12} />
            {showPath ? "Hide Execution Path" : "Show Execution Path"}
            {showPath ? <ChevronUp size={11} className="ml-auto" /> : <ChevronDown size={11} className="ml-auto" />}
          </button>
          {showPath && (
            <div className="px-4 py-4 border-t border-gray-100">
              <ExecutionPathPanel rec={rec} />
            </div>
          )}
        </div>
      )}

      {/* Action zone */}
      <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">

        {/* PENDING actions */}
        {rec.status === "pending" && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onAction(rec._id, "approved")}
              disabled={isActioning}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              <CheckCircle2 size={13} />Approve
            </button>
            <button
              onClick={() => onAction(rec._id, "deferred")}
              disabled={isActioning}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-white text-gray-700 rounded-md hover:bg-gray-100 border border-gray-300 disabled:opacity-50"
            >
              <Pause size={13} />Defer
            </button>
            {showReject ? (
              <div className="flex gap-2 items-center w-full mt-1">
                <input
                  type="text"
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  placeholder="Reason (optional)"
                  className="flex-1 text-xs border border-gray-300 rounded px-2 py-1.5"
                />
                <button
                  onClick={() => { onAction(rec._id, "rejected", { reason: rejectReason }); setShowReject(false) }}
                  disabled={isActioning}
                  className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                >
                  Confirm
                </button>
                <button onClick={() => setShowReject(false)} className="text-xs text-gray-500 underline">Cancel</button>
              </div>
            ) : (
              <button
                onClick={() => setShowReject(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-red-50 text-red-600 rounded-md hover:bg-red-100 border border-red-200"
              >
                <XCircle size={13} />Reject
              </button>
            )}
          </div>
        )}

        {/* APPROVED actions */}
        {(rec.status === "approved") && (
          <div className="flex flex-wrap gap-2 items-start">
            <button
              onClick={() => onAction(rec._id, "in_progress")}
              disabled={isActioning}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              <Play size={13} />Start Execution
            </button>
            <button
              onClick={() => setShowOwner(o => !o)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-white text-gray-600 rounded-md hover:bg-gray-100 border border-gray-300"
            >
              <User size={13} />Set Owner & Date
            </button>
            {showOwner && (
              <div className="w-full flex flex-wrap gap-2 mt-1">
                <input
                  type="text"
                  value={owner}
                  onChange={e => setOwner(e.target.value)}
                  placeholder="Owner name"
                  className="flex-1 min-w-[120px] text-xs border border-gray-300 rounded px-2 py-1.5"
                />
                <input
                  type="date"
                  value={targetDate}
                  onChange={e => setTargetDate(e.target.value)}
                  className="text-xs border border-gray-300 rounded px-2 py-1.5"
                />
                <button
                  onClick={saveOwner}
                  disabled={isActioning}
                  className="px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                >
                  Save
                </button>
                <button onClick={() => setShowOwner(false)} className="text-xs text-gray-400 underline">Cancel</button>
              </div>
            )}
          </div>
        )}

        {/* IN_PROGRESS / APPLIED actions */}
        {(rec.status === "in_progress" || rec.status === "applied") && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onAction(rec._id, "completed")}
                disabled={isActioning}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                <Check size={13} />Mark Complete
              </button>
              <button
                onClick={() => needsOutcomeInput("won")}
                disabled={isActioning}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50"
              >
                <Trophy size={13} />Mark Won
              </button>
              <button
                onClick={() => needsOutcomeInput("lost")}
                disabled={isActioning}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-white text-gray-600 rounded-md hover:bg-gray-100 border border-gray-300 disabled:opacity-50"
              >
                <X size={13} />Mark Lost
              </button>
            </div>
            {showWonInput && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded space-y-2">
                <p className="text-xs font-semibold text-emerald-700">Mark as Won — what revenue was captured?</p>
                <div className="flex gap-2">
                  <input type="number" value={realizedImpact} onChange={e => setRealizedImpact(e.target.value)}
                    placeholder="Revenue realized (₹)" className="flex-1 text-xs border border-emerald-300 rounded px-2 py-1.5" />
                </div>
                <textarea value={outcomeNotes} onChange={e => setOutcomeNotes(e.target.value)}
                  placeholder="Notes (optional)" rows={2}
                  className="w-full text-xs border border-emerald-300 rounded px-2 py-1.5" />
                <div className="flex gap-2">
                  <button onClick={() => submitOutcome("won")} disabled={isActioning}
                    className="px-3 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50">
                    Confirm Won
                  </button>
                  <button onClick={() => setShowWonInput(false)} className="text-xs text-gray-400 underline">Cancel</button>
                </div>
              </div>
            )}
            {showLostInput && (
              <div className="p-3 bg-red-50 border border-red-200 rounded space-y-2">
                <p className="text-xs font-semibold text-red-700">Mark as Lost — what happened?</p>
                <textarea value={outcomeNotes} onChange={e => setOutcomeNotes(e.target.value)}
                  placeholder="Notes (optional)" rows={2}
                  className="w-full text-xs border border-red-200 rounded px-2 py-1.5" />
                <div className="flex gap-2">
                  <button onClick={() => submitOutcome("lost")} disabled={isActioning}
                    className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50">
                    Confirm Lost
                  </button>
                  <button onClick={() => setShowLostInput(false)} className="text-xs text-gray-400 underline">Cancel</button>
                </div>
              </div>
            )}
            {showOwner && (
              <div className="flex flex-wrap gap-2">
                <input type="text" value={owner} onChange={e => setOwner(e.target.value)}
                  placeholder="Owner name" className="flex-1 min-w-[120px] text-xs border border-gray-300 rounded px-2 py-1.5" />
                <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)}
                  className="text-xs border border-gray-300 rounded px-2 py-1.5" />
                <button onClick={saveOwner} disabled={isActioning}
                  className="px-3 py-1.5 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50">Save</button>
                <button onClick={() => setShowOwner(false)} className="text-xs text-gray-400 underline">Cancel</button>
              </div>
            )}
          </div>
        )}

        {/* COMPLETED actions */}
        {rec.status === "completed" && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => needsOutcomeInput("won")}
              disabled={isActioning}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50"
            >
              <Trophy size={13} />Mark Won
            </button>
            <button
              onClick={() => needsOutcomeInput("lost")}
              disabled={isActioning}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-white text-gray-600 rounded-md hover:bg-gray-100 border border-gray-300 disabled:opacity-50"
            >
              <X size={13} />Mark Lost
            </button>
            {showWonInput && (
              <div className="w-full p-3 bg-emerald-50 border border-emerald-200 rounded space-y-2">
                <input type="number" value={realizedImpact} onChange={e => setRealizedImpact(e.target.value)}
                  placeholder="Revenue realized (₹)" className="w-full text-xs border border-emerald-300 rounded px-2 py-1.5" />
                <textarea value={outcomeNotes} onChange={e => setOutcomeNotes(e.target.value)}
                  placeholder="Notes" rows={2} className="w-full text-xs border border-emerald-300 rounded px-2 py-1.5" />
                <div className="flex gap-2">
                  <button onClick={() => submitOutcome("won")} disabled={isActioning}
                    className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded disabled:opacity-50">Confirm Won</button>
                  <button onClick={() => setShowWonInput(false)} className="text-xs text-gray-400 underline">Cancel</button>
                </div>
              </div>
            )}
            {showLostInput && (
              <div className="w-full p-3 bg-red-50 border border-red-200 rounded space-y-2">
                <textarea value={outcomeNotes} onChange={e => setOutcomeNotes(e.target.value)}
                  placeholder="Notes" rows={2} className="w-full text-xs border border-red-200 rounded px-2 py-1.5" />
                <div className="flex gap-2">
                  <button onClick={() => submitOutcome("lost")} disabled={isActioning}
                    className="px-3 py-1.5 text-xs bg-red-600 text-white rounded disabled:opacity-50">Confirm Lost</button>
                  <button onClick={() => setShowLostInput(false)} className="text-xs text-gray-400 underline">Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Terminal states: won / lost / rejected — read-only, just show date */}
        {["won", "lost", "rejected", "deferred"].includes(rec.status) && (
          <div className="text-xs text-gray-400">
            {rec.status === "won" && `Won on ${fmtDate(rec.won_at)} · ${INR(rec.realized_impact || 0)} captured`}
            {rec.status === "lost" && `Marked lost on ${fmtDate(rec.lost_at)}`}
            {rec.status === "rejected" && `Rejected on ${fmtDate(rec.reviewed_at)}`}
            {rec.status === "deferred" && `Deferred on ${fmtDate(rec.reviewed_at)}`}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Measurement Strip ────────────────────────────────────────────────────────

function MeasurementStrip({ m }: { m: Measurement }) {
  const items = [
    { label: "Generated",    value: m.total_generated,                color: "text-gray-700" },
    { label: "Approval rate",value: `${m.approval_rate_pct}%`,        color: m.approval_rate_pct >= 50 ? "text-green-600" : "text-orange-600" },
    { label: "In Progress",  value: m.total_in_progress,              color: "text-blue-600" },
    { label: "Win rate",     value: (m.total_won + m.total_lost) > 0 ? `${m.win_rate_pct}%` : "—", color: "text-emerald-600" },
    { label: "Won",          value: m.total_won,                      color: "text-emerald-700" },
    { label: "Realized",     value: m.realized_impact_total > 0 ? INR(m.realized_impact_total) : "₹0", color: "text-emerald-700" },
    { label: "Packs",        value: m.packs_generated,                color: "text-violet-600" },
  ]

  return (
    <div className="bg-gray-900 rounded-lg p-3 mb-4">
      <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Outcome Intelligence</div>
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
        {items.map(item => (
          <div key={item.label}>
            <div className={`text-base font-bold ${item.color}`}>{item.value}</div>
            <div className="text-[10px] text-gray-500">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Founder Priority Mode ────────────────────────────────────────────────────

function FounderPriorityMode({ pendingRecs, sourcesConnected }: { pendingRecs: Rec[]; sourcesConnected: string[] }) {
  if (pendingRecs.length === 0) return null

  const RANK_BADGE = ["", "🥇", "🥈", "🥉", "4.", "5."]

  const scored = pendingRecs.map(rec => {
    const revenueScore = Math.min(rec.expected_revenue_impact / 500_000, 1)
    const confScore = rec.confidence / 100
    const readiness = getReadiness(rec, sourcesConnected, [])
    const readinessScore = readiness.score / 100
    const composite = revenueScore * 0.4 + confScore * 0.3 + readinessScore * 0.3
    return { rec, composite, readiness }
  }).sort((a, b) => b.composite - a.composite).slice(0, 5)

  return (
    <div className="mb-4 bg-gray-900 rounded-lg overflow-hidden border border-gray-800">
      <div className="px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Zap size={14} className="text-yellow-400" />
          <span className="text-sm font-bold text-white">Founder Priority Mode</span>
        </div>
        <p className="text-xs text-gray-400 mt-0.5">If you have 2 hours this week — do these {scored.length} things first</p>
      </div>
      <div className="divide-y divide-gray-800">
        {scored.map(({ rec, composite, readiness }, i) => (
          <div key={rec._id} className="px-4 py-3 flex items-start gap-3">
            <span className={`shrink-0 text-base leading-none mt-0.5 ${i === 0 ? "text-yellow-400" : i === 1 ? "text-gray-300" : i === 2 ? "text-amber-600" : "text-gray-500"}`}>
              {RANK_BADGE[i + 1]}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white leading-snug">{rec.title}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{rec.expected_action}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs font-bold text-emerald-400">{INR(rec.expected_revenue_impact)}</p>
                  <p className="text-[9px] text-gray-500">est. impact</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-1.5 text-[10px]">
                <span className={`px-1.5 py-0.5 rounded font-semibold ${PRIORITY_COLOR[rec.priority]}`}>{rec.priority.toUpperCase()}</span>
                <span className="text-gray-500">Conf: <span className="text-gray-300">{rec.confidence}%</span></span>
                <span className="text-gray-500">Ready: <span className={readiness.score >= 70 ? "text-green-400" : "text-amber-400"}>{readiness.score}%</span></span>
                <span className="text-gray-500">Score: <span className="text-white font-mono">{(composite * 100).toFixed(0)}</span></span>
                <span className="text-gray-500">Effort: <span className="text-gray-300">{EFFORT_LABEL[rec.effort] || rec.effort}</span></span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Budget Allocation Engine ─────────────────────────────────────────────────

const BUDGET_BY_TYPE: Record<string, number> = {
  oem_displacement:            0,
  dealer_recruit:              0,
  procurement_target:          0,
  negative_keyword:            0,
  landing_page_create:         0,
  content_create:              0,
  search_campaign:             15000,
  customer_match:              10000,
  customer_match_campaign:     10000,
  remarketing_campaign:        8000,
  youtube_campaign:            20000,
  performance_max_campaign:    25000,
  competitor_conquest_campaign: 20000,
  creative_refresh:            0,
  budget_reallocate:           0,
}

function BudgetRankPanel({ pendingRecs }: { pendingRecs: Rec[] }) {
  if (pendingRecs.length === 0) return null

  interface RankedRec { rec: Rec; budget: number; roi: number | null; score: number }

  const ranked: RankedRec[] = pendingRecs
    .map(rec => {
      const budget = BUDGET_BY_TYPE[rec.type] ?? 0
      const revenue = rec.expected_revenue_impact
      const conf = rec.confidence / 100
      const roi = budget > 0 ? Math.round(((revenue - budget) / budget) * 100) : null
      const score = revenue * conf - (budget > 0 ? budget * 0.5 : 0)
      return { rec, budget, roi, score }
    })
    .sort((a, b) => b.score - a.score)

  const top3 = ranked.slice(0, 3)
  const totalBudget = top3.reduce((s, r) => s + r.budget, 0)
  const totalRevenue = top3.reduce((s, r) => s + r.rec.expected_revenue_impact, 0)

  return (
    <div className="mb-4 bg-violet-50 border border-violet-200 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-violet-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy size={14} className="text-violet-600" />
          <span className="text-sm font-semibold text-violet-900">Budget Allocation Engine — Top 3 to approve this week</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-violet-700">
          {totalBudget > 0 && <span>Budget needed: <span className="font-semibold">{INR(totalBudget)}/mo</span></span>}
          <span>Expected: <span className="font-semibold text-emerald-700">{INR(totalRevenue)}</span></span>
        </div>
      </div>
      <div className="divide-y divide-violet-100">
        {top3.map(({ rec, budget, roi }, i) => (
          <div key={rec._id} className="px-4 py-3 flex items-start gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-violet-600 text-white text-xs font-bold flex items-center justify-center mt-0.5">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-gray-900">{rec.title}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border ${PRIORITY_COLOR[rec.priority]}`}>
                  {rec.priority.toUpperCase()}
                </span>
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">{rec.why_now || rec.evidence}</p>
              <div className="flex flex-wrap gap-3 mt-1.5 text-[11px]">
                <span className="text-gray-500">Budget: <span className="font-semibold text-gray-700">{budget > 0 ? `${INR(budget)}/mo` : "₹0 (no spend)"}</span></span>
                <span className="text-gray-500">Expected: <span className="font-semibold text-emerald-700">{INR(rec.expected_revenue_impact)}</span></span>
                <span className="text-gray-500">Confidence: <span className="font-semibold text-gray-700">{rec.confidence}%</span></span>
                {roi !== null && (
                  <span className="text-gray-500">ROI: <span className={`font-semibold ${roi > 0 ? "text-emerald-700" : "text-red-600"}`}>{roi}%</span></span>
                )}
                {roi === null && (
                  <span className="text-emerald-700 font-semibold">∞ ROI (no spend)</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      {pendingRecs.length > 3 && (
        <div className="px-4 py-2 bg-violet-100/50 text-[11px] text-violet-700 text-center">
          {pendingRecs.length - 3} more pending — approve these 3 first for maximum ROI
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function RevenueDashboardPage() {
  const [recs, setRecs]             = useState<Rec[]>([])
  const [run, setRun]               = useState<DailyRun | null>(null)
  const [measurement, setMeasurement] = useState<Measurement | null>(null)
  const [loading, setLoading]       = useState(true)
  const [running, setRunning]       = useState(false)
  const [actioning, setActioning]   = useState<string | null>(null)
  const [filter, setFilter]         = useState<Status | "all">("pending")
  const [error, setError]           = useState<string | null>(null)

  const loadMeasurement = useCallback(async () => {
    const res = await fetch("/api/admin/growth/director/measurement").catch(() => null)
    if (res?.ok) {
      const d = await res.json()
      setMeasurement(d)
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = filter !== "all" ? `?status=${filter}` : ""
      const res = await fetch(`/api/admin/growth/director/recommendations${params}`)
      const data = await res.json()
      setRecs(data.recs || [])
      setRun(data.run || null)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => { load() }, [load])
  useEffect(() => { loadMeasurement() }, [loadMeasurement])

  async function handleRun(force = false) {
    setRunning(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/growth/director/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      })
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || "Run failed")
      await load()
    } catch (e) {
      setError(String(e))
    } finally {
      setRunning(false)
    }
  }

  async function handleAction(id: string, action: string, extra?: Record<string, unknown>) {
    setActioning(id)
    try {
      await fetch(`/api/admin/growth/director/approvals/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      })
      await load()
      await loadMeasurement()
    } catch (e) {
      setError(String(e))
    } finally {
      setActioning(null)
    }
  }

  // KPI strip stats
  const pendingRecs    = recs.filter(r => r.status === "pending")
  const pendingRevenue = pendingRecs.reduce((s, r) => s + r.expected_revenue_impact, 0)
  const criticalCount  = pendingRecs.filter(r => r.priority === "critical").length

  // Tab counts for display
  const countsByStatus = FILTER_TABS.reduce((acc, f) => {
    acc[f] = f === "all" ? recs.length : recs.filter(r => r.status === f).length
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp size={22} className="text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">Revenue Director</h1>
            <span className="text-[10px] px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded font-bold">Revenue OS {PLATFORM_VERSION}</span>
            {criticalCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-bold bg-red-600 text-white rounded-full animate-pulse">
                {criticalCount} CRITICAL
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            Intelligence → Recommendation → Approval → Execution → Measurement
            {run?.completed_at && ` · Last run ${fmtTime(run.completed_at)} IST`}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => { load(); loadMeasurement() }}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            onClick={() => handleRun(true)}
            disabled={running}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {running ? <RefreshCw size={13} className="animate-spin" /> : <Zap size={13} />}
            {running ? "Running…" : "Run Now"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700 flex items-start gap-2">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />{error}
        </div>
      )}

      {/* KPI strip — today's pending */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="text-2xl font-bold text-gray-900">{pendingRecs.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">Pending decisions</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="text-2xl font-bold text-orange-600">{INR(pendingRevenue)}</div>
          <div className="text-xs text-gray-500 mt-0.5">Estimated impact</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="text-2xl font-bold text-gray-900">
            {run?.sources_connected?.length || 0}/{((run?.sources_connected?.length || 0) + (run?.sources_missing?.length || 0)) || "—"}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">Sources connected</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className={`text-2xl font-bold ${run?.email_sent ? "text-green-600" : "text-gray-400"}`}>
            {run?.email_sent ? "Sent" : "—"}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">Morning brief</div>
        </div>
      </div>

      {/* Measurement strip — cumulative outcomes */}
      {measurement && measurement.total_generated > 0 && (
        <MeasurementStrip m={measurement} />
      )}

      {/* Source health */}
      {run && (
        <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg flex flex-wrap gap-3 text-xs">
          {(run.sources_connected || []).map(s => (
            <span key={s} className="inline-flex items-center gap-1 text-green-700">
              <CheckCircle2 size={11} />{s}
            </span>
          ))}
          {(run.sources_missing || []).map(s => (
            <span key={s} className="inline-flex items-center gap-1 text-red-600">
              <XCircle size={11} />{s} (not connected)
            </span>
          ))}
          {run.duration_ms && (
            <span className="ml-auto text-gray-400">Done in {(run.duration_ms / 1000).toFixed(1)}s</span>
          )}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-1 mb-4 bg-gray-100 p-1 rounded-lg w-fit">
        {FILTER_TABS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f as Status | "all")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors capitalize ${
              filter === f ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {f.replace("_", " ")}
          </button>
        ))}
      </div>

      {/* Priority Mode + Budget Engine — when viewing pending */}
      {!loading && filter === "pending" && (
        <>
          <FounderPriorityMode pendingRecs={pendingRecs} sourcesConnected={run?.sources_connected ?? []} />
          <BudgetRankPanel pendingRecs={pendingRecs} />
        </>
      )}

      {/* Recommendations */}
      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
          <RefreshCw size={18} className="animate-spin mr-2" /> Loading…
        </div>
      ) : recs.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-10 text-center">
          <DollarSign size={32} className="text-gray-300 mx-auto mb-3" />
          {filter === "pending" ? (
            <>
              <p className="text-gray-500 font-medium">No pending recommendations</p>
              <p className="text-sm text-gray-400 mt-1">
                {run ? `Last run: ${run.date}` : "Click Run Now to generate today's intelligence."}
              </p>
              <button
                onClick={() => handleRun(true)}
                disabled={running}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                <Zap size={14} />
                {running ? "Running…" : "Generate Recommendations"}
              </button>
            </>
          ) : (
            <p className="text-gray-400">No {filter.replace("_", " ")} recommendations</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {recs.map(rec => (
            <RecCard key={rec._id} rec={rec} onAction={handleAction} actioning={actioning} sourcesConnected={run?.sources_connected ?? []} />
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-gray-200 text-xs text-gray-400 flex items-center justify-between">
        <span>All recommendations require founder approval before execution — no changes are made automatically.</span>
        <div className="flex items-center gap-1">
          <ChevronRight size={11} />
          <a href="/admin/growth/fogging" className="hover:text-gray-600">Fogging Intelligence</a>
        </div>
      </div>
    </div>
  )
}
