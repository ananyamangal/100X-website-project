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
} from "lucide-react"
import { getCampaignIntelligence } from "@/lib/growth-os/campaign-decision-engine"

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

// ─── Execution Pack Panel ─────────────────────────────────────────────────────

function ExecutionPackPanel({ recId }: { recId: string }) {
  const [pack, setPack] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

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

  if (sections.length === 0) return (
    <div className="text-xs text-gray-400 py-1">Pack generated (type: {packType})</div>
  )

  return (
    <div className="space-y-1.5">
      {sections.map(s => (
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
      ))}
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

function CampaignIntelPanel({ rec }: { rec: Rec }) {
  const [showRejected, setShowRejected] = useState(false)
  const intel = getCampaignIntelligence(
    rec.type,
    rec.payload ?? {},
    rec.confidence,
    rec.expected_revenue_impact,
  )

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
      <div className="flex gap-4 text-xs text-gray-600 bg-gray-50 rounded px-3 py-2">
        <span><span className="font-semibold text-gray-800">Budget:</span> {intel.total_budget_estimate_inr > 0 ? INR(intel.total_budget_estimate_inr) + "/mo" : "₹0 (organic)"}</span>
        <span><span className="font-semibold text-gray-800">Rev target:</span> {INR(intel.total_expected_revenue_inr)}</span>
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
    </div>
  )
}

// ─── Rec Card ─────────────────────────────────────────────────────────────────

function RecCard({
  rec, onAction, actioning,
}: {
  rec: Rec
  onAction: (id: string, action: string, extra?: Record<string, unknown>) => Promise<void>
  actioning: string | null
}) {
  const [showReject, setShowReject]     = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [showHelp, setShowHelp]         = useState(false)
  const [showPack, setShowPack]         = useState(false)
  const [showPath, setShowPath]         = useState(false)
  const [showIntel, setShowIntel]       = useState(false)
  const [showOwner, setShowOwner]       = useState(false)
  const [owner, setOwner]               = useState(rec.owner || "")
  const [targetDate, setTargetDate]     = useState(rec.target_completion_date || "")
  const [realizedImpact, setRealizedImpact] = useState("")
  const [outcomeNotes, setOutcomeNotes] = useState("")
  const [showWonInput, setShowWonInput] = useState(false)
  const [showLostInput, setShowLostInput] = useState(false)

  const isActioning = actioning === rec._id
  const hasPack = Boolean(rec.execution_pack_id)
  const statusDisplay = STATUS_DISPLAY[rec.status] || STATUS_DISPLAY.pending

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
        <h3 className="mt-3 text-[15px] font-semibold text-gray-900 leading-snug">{rec.title}</h3>

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
            <CampaignIntelPanel rec={rec} />
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
              <ExecutionPackPanel recId={rec._id} />
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
            <span className="text-[10px] px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded font-bold">v1.1</span>
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
            <RecCard key={rec._id} rec={rec} onAction={handleAction} actioning={actioning} />
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
