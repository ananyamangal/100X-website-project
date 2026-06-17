"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Layers, RefreshCw, CheckCircle, XCircle, AlertTriangle,
  ChevronDown, ChevronUp, Globe, Link2, Code2, BarChart3,
  Rocket, Edit3, ArrowRight, Shield, Play, Zap, Users,
  ShoppingBag, Target, TrendingUp, Clock, Star, FileText,
  MessageSquare, Gift,
} from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────

type Source = "seo" | "dealer" | "procurement" | "ads"
type Status = "draft" | "approved" | "rejected" | "modify_requested" | "published" | "tracking"

interface Opportunity {
  id: string; source: Source; title: string; keyword: string
  targetUrl: string; pageType: string; priority: string
  context: string; expectedClicks: number; hasPlan: boolean
}

interface LpHero { headline: string; subheadline: string; badge: string }
interface LpCta  { primary: string; secondary: string; urgency: string }
interface LpBenefit { title: string; description: string; icon: string }
interface LpFaqItem { question: string; answer: string }
interface LpSection { heading: string; content: string; wordCount: number }
interface LpInternalLink { anchor: string; url: string; rationale: string }

interface GeneratedContent {
  metaTitle: string; metaDescription: string
  hero: LpHero; cta: LpCta
  benefits: LpBenefit[]; faq: LpFaqItem[]
  sections: LpSection[]; schema: string
  internalLinks: LpInternalLink[]; wordCount: number
  generationMethod: "llm" | "template"
}

interface QualityScores {
  heroStrength: number; ctaClarity: number; benefitDepth: number
  faqCoverage: number; metaQuality: number; schemaPresent: number
  confidence: number; gaps: string[]
}

interface Performance {
  pageViews?: number; uniqueVisitors?: number; leads?: number
  leadRate?: number; revenueAttributed?: number
  avgPosition?: number | null; lastCheckedAt?: string
}

interface LandingPlan {
  planId: string; opportunityId: string; source: Source
  keyword: string; targetUrl: string; pageType: string
  priority: string; status: Status; simulated: boolean
  generatedContent: GeneratedContent; qualityScores: QualityScores
  performance?: Performance
  deploymentInfo?: { publishedAt?: string; publishedUrl?: string }
  createdAt: string
}

interface Preflight {
  apiKeyConfigured: boolean; totalPlans: number
  pendingApproval: number; published: number; tracking: number
  plans: LandingPlan[]
  opportunities: Opportunity[]
  sourceBreakdown: { seo: number; dealer: number; procurement: number; ads: number }
}

type ContentTab = "hero" | "cta" | "benefits" | "faq" | "sections" | "meta" | "schema" | "links"

// ── Source config ─────────────────────────────────────────────────────────────

const SOURCE_CONFIG: Record<Source, { label: string; color: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  seo:         { label: "SEO",         color: "text-blue-400 border-blue-800 bg-blue-950/20",          icon: TrendingUp },
  dealer:      { label: "Dealer",      color: "text-purple-400 border-purple-800 bg-purple-950/20",    icon: Users },
  procurement: { label: "Procurement", color: "text-amber-400 border-amber-800 bg-amber-950/20",       icon: ShoppingBag },
  ads:         { label: "Ads",         color: "text-emerald-400 border-emerald-800 bg-emerald-950/20", icon: Target },
}

const STATUS_COLORS: Record<string, string> = {
  draft:            "bg-blue-900/40 text-blue-300 border-blue-700",
  approved:         "bg-emerald-900/40 text-emerald-300 border-emerald-700",
  rejected:         "bg-red-900/40 text-red-300 border-red-700",
  modify_requested: "bg-purple-900/40 text-purple-300 border-purple-700",
  published:        "bg-teal-900/40 text-teal-300 border-teal-700",
  tracking:         "bg-brand-900/40 text-brand-300 border-brand-700",
}

const PRIORITY_COLORS: Record<string, string> = {
  critical: "bg-red-900/40 text-red-300 border-red-700",
  high:     "bg-orange-900/40 text-orange-300 border-orange-700",
  medium:   "bg-amber-900/40 text-amber-300 border-amber-700",
  low:      "bg-gray-800 text-gray-400 border-gray-700",
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function StatusChip({ status }: { status: string }) {
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_COLORS[status] ?? "bg-gray-800 text-gray-400 border-gray-700"}`}>
      {status.replace(/_/g, " ")}
    </span>
  )
}

function SourceBadge({ source }: { source: Source }) {
  const cfg  = SOURCE_CONFIG[source]
  const Icon = cfg.icon
  return (
    <span className={`flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${cfg.color}`}>
      <Icon size={8} />{cfg.label}
    </span>
  )
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const color = score >= 75 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : "bg-red-500"
  const text  = score >= 75 ? "text-emerald-400" : score >= 50 ? "text-amber-400" : "text-red-400"
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-gray-500">{label}</span>
        <span className={`font-bold ${text}`}>{score}</span>
      </div>
      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(score, 100)}%` }} />
      </div>
    </div>
  )
}

function StepIndicator({ status }: { status: string }) {
  const steps = [
    { id: "draft",     label: "Draft" },
    { id: "approved",  label: "Approved" },
    { id: "published", label: "Published" },
    { id: "tracking",  label: "Tracking" },
  ]
  const order = ["draft", "approved", "published", "tracking"]
  const idx   = order.indexOf(status)
  return (
    <div className="flex items-center gap-0">
      {steps.map((step, i) => {
        const done   = i < idx
        const active = i === idx
        return (
          <div key={step.id} className="flex items-center">
            <span className={`text-[11px] px-3 py-1 rounded-lg font-medium ${
              done ? "text-emerald-400" : active ? "text-white bg-brand-600/20 border border-brand-600/40" : "text-gray-600"
            }`}>
              {done ? <CheckCircle size={11} className="inline mr-1" /> : null}{step.label}
            </span>
            {i < steps.length - 1 && <ArrowRight size={12} className={`mx-1 ${done ? "text-emerald-800" : "text-gray-800"}`} />}
          </div>
        )
      })}
    </div>
  )
}

// ── Content panel ─────────────────────────────────────────────────────────────

function ContentPanel({ plan }: { plan: LandingPlan }) {
  const [tab, setTab] = useState<ContentTab>("hero")
  const gc = plan.generatedContent

  const TABS: { key: ContentTab; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
    { key: "hero",     label: "Hero",     icon: Zap },
    { key: "cta",      label: "CTA",      icon: Target },
    { key: "benefits", label: "Benefits", icon: Gift },
    { key: "faq",      label: "FAQ",      icon: MessageSquare },
    { key: "sections", label: "Sections", icon: FileText },
    { key: "meta",     label: "Meta",     icon: Globe },
    { key: "schema",   label: "Schema",   icon: Code2 },
    { key: "links",    label: "Links",    icon: Link2 },
  ]

  return (
    <div className="space-y-3">
      <div className="flex border-b border-gray-800 overflow-x-auto">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap flex-shrink-0 border-b-2 transition-colors ${
              tab === key ? "border-brand-500 text-white" : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            <Icon size={11} />{label}
          </button>
        ))}
      </div>

      {/* Hero */}
      {tab === "hero" && (
        <div className="space-y-3">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-2">Badge (Trust Signal)</p>
            <span className="inline-block text-xs bg-brand-900/40 text-brand-300 border border-brand-700 px-3 py-1 rounded-full">{gc.hero?.badge}</span>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-2">Headline (H1)</p>
            <p className="text-white font-bold text-xl leading-snug">{gc.hero?.headline}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-2">Subheadline</p>
            <p className="text-gray-300 text-sm leading-relaxed">{gc.hero?.subheadline}</p>
          </div>
        </div>
      )}

      {/* CTA */}
      {tab === "cta" && (
        <div className="space-y-3">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-3">Call to Action Preview</p>
            <div className="flex gap-2 flex-wrap mb-3">
              <button className="px-5 py-2.5 bg-brand-600 text-white text-sm font-bold rounded-lg">{gc.cta?.primary}</button>
              <button className="px-5 py-2.5 bg-gray-700 text-white text-sm font-medium rounded-lg">{gc.cta?.secondary}</button>
            </div>
            <p className="text-[11px] text-amber-400 flex items-center gap-1">
              <AlertTriangle size={10} />{gc.cta?.urgency}
            </p>
          </div>
        </div>
      )}

      {/* Benefits */}
      {tab === "benefits" && (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {(gc.benefits ?? []).map((b, i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand-900/30 border border-brand-800/30 flex items-center justify-center flex-shrink-0">
                <Star size={14} className="text-brand-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white mb-1">{b.title}</p>
                <p className="text-xs text-gray-400 leading-relaxed">{b.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FAQ */}
      {tab === "faq" && (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {(gc.faq ?? []).map((f, i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-sm font-semibold text-white mb-1.5 flex items-start gap-2">
                <MessageSquare size={13} className="text-brand-400 flex-shrink-0 mt-0.5" />
                {f.question}
              </p>
              <p className="text-xs text-gray-400 leading-relaxed pl-5">{f.answer}</p>
            </div>
          ))}
        </div>
      )}

      {/* Sections */}
      {tab === "sections" && (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {(gc.sections ?? []).map((sec, i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-white">{sec.heading}</p>
                <span className="text-[10px] text-gray-600">{sec.wordCount}w</span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">{sec.content}</p>
            </div>
          ))}
          <p className="text-[11px] text-gray-600 flex items-center gap-2">
            <FileText size={10} />
            {gc.wordCount} total words · {gc.generationMethod === "llm" ? "AI-generated" : "Template (add ANTHROPIC_API_KEY for AI content)"}
          </p>
        </div>
      )}

      {/* Meta */}
      {tab === "meta" && (
        <div className="space-y-3">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Meta Title</p>
              <span className={`text-[10px] ${(gc.metaTitle?.length ?? 0) <= 60 ? "text-emerald-400" : "text-red-400"}`}>
                {gc.metaTitle?.length ?? 0}/60
              </span>
            </div>
            <p className="text-white text-sm font-medium">{gc.metaTitle}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Meta Description</p>
              <span className={`text-[10px] ${(gc.metaDescription?.length ?? 0) <= 160 ? "text-emerald-400" : "text-red-400"}`}>
                {gc.metaDescription?.length ?? 0}/160
              </span>
            </div>
            <p className="text-gray-300 text-sm">{gc.metaDescription}</p>
          </div>
          <div className="bg-white rounded-xl p-4">
            <p className="text-[9px] text-gray-400 mb-0.5">100xcircle.com{plan.targetUrl}</p>
            <p className="text-blue-700 text-sm font-medium leading-snug">{gc.metaTitle}</p>
            <p className="text-gray-600 text-xs mt-0.5 leading-relaxed">{gc.metaDescription}</p>
          </div>
        </div>
      )}

      {/* Schema */}
      {tab === "schema" && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-2">JSON-LD Schema</p>
          <pre className="text-[11px] text-gray-300 overflow-x-auto whitespace-pre-wrap break-words leading-relaxed">
            {(() => { try { return JSON.stringify(JSON.parse(gc.schema), null, 2) } catch { return gc.schema } })()}
          </pre>
        </div>
      )}

      {/* Links */}
      {tab === "links" && (
        <div className="space-y-3">
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-4 py-2 border-b border-gray-800">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Internal Links ({gc.internalLinks?.length ?? 0})</p>
            </div>
            <div className="divide-y divide-gray-800/60">
              {(gc.internalLinks ?? []).map((link, i) => (
                <div key={i} className="px-4 py-2.5 flex items-start gap-3">
                  <Link2 size={11} className="text-brand-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-blue-400 font-medium">{link.anchor}</p>
                    <p className="text-[11px] text-gray-500">{link.url} · {link.rationale}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Performance panel ─────────────────────────────────────────────────────────

function PerformancePanel({ plan, onRefresh }: { plan: LandingPlan; onRefresh: () => void }) {
  const [loading, setLoading] = useState(false)
  const [perf, setPerf]       = useState<Performance | null>(plan.performance ?? null)

  const refresh = async () => {
    setLoading(true)
    try {
      const res  = await fetch(`/api/admin/growth/landing/${plan.planId}/performance`)
      const data = await res.json() as { performance?: Performance }
      if (data.performance) setPerf(data.performance)
      onRefresh()
    } catch { /* silent */ } finally { setLoading(false) }
  }

  return (
    <div className="px-5 py-4 border-t border-gray-800">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold flex items-center gap-1.5">
          <BarChart3 size={11} />Performance & Attribution
        </p>
        <button
          onClick={refresh}
          disabled={loading}
          className="text-[10px] text-gray-500 hover:text-gray-300 flex items-center gap-1"
        >
          <RefreshCw size={10} className={loading ? "animate-spin" : ""} />Refresh
        </button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Impressions",  value: perf?.pageViews?.toLocaleString("en-IN") ?? "—" },
          { label: "Clicks",       value: perf?.uniqueVisitors?.toLocaleString("en-IN") ?? "—" },
          { label: "Leads",        value: perf?.leads?.toString() ?? "—" },
          { label: "Lead Rate",    value: perf?.leadRate != null ? `${perf.leadRate}%` : "—" },
          { label: "Avg Position", value: perf?.avgPosition != null ? perf.avgPosition.toFixed(1) : "—" },
          { label: "Revenue Attr.", value: perf?.revenueAttributed != null ? `₹${(perf.revenueAttributed / 100000).toFixed(1)}L` : "—" },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center">
            <p className="text-sm font-bold text-white">{value}</p>
            <p className="text-[10px] text-gray-600 mt-0.5">{label}</p>
          </div>
        ))}
      </div>
      {perf?.lastCheckedAt && (
        <p className="text-[10px] text-gray-700 mt-2 text-right">
          Last checked: {new Date(perf.lastCheckedAt).toLocaleString("en-IN")}
        </p>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function LandingPageFactoryPage() {
  const [preflight, setPreflight]     = useState<Preflight | null>(null)
  const [loading, setLoading]         = useState(true)
  const [running, setRunning]         = useState(false)
  const [acting, setActing]           = useState(false)
  const [msg, setMsg]                 = useState<{ type: "ok" | "error" | "warn"; text: string } | null>(null)
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null)
  const [expandedPlan, setExpanded]   = useState<string | null>(null)
  const [modifyReason, setModifyReason] = useState("")
  const [showModify, setShowModify]   = useState(false)
  const [filterStatus, setFilter]     = useState<string>("all")
  const [filterSource, setFilterSrc]  = useState<string>("all")
  const [sourceTab, setSourceTab]     = useState<Source>("seo")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/growth/landing")
      const d   = await res.json() as Preflight
      setPreflight(d)
    } catch (e) {
      setMsg({ type: "error", text: String(e) })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const generate = async () => {
    if (!selectedOpp) { setMsg({ type: "warn", text: "Select an opportunity first." }); return }
    setRunning(true); setMsg(null)
    try {
      const res = await fetch("/api/admin/growth/landing", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          opportunityId: selectedOpp.id,
          source:        selectedOpp.source,
          keyword:       selectedOpp.keyword,
          targetUrl:     selectedOpp.targetUrl,
          pageType:      selectedOpp.pageType,
          priority:      selectedOpp.priority,
          sourceContext: selectedOpp.context,
        }),
      })
      const d = await res.json() as { ok?: boolean; simulated?: boolean; planId?: string; keyword?: string; confidence?: number; error?: string }
      if (d.ok) {
        setMsg({ type: d.simulated ? "warn" : "ok", text: d.simulated
          ? `Draft generated (template mode — add ANTHROPIC_API_KEY for AI content). Confidence: ${d.confidence}/100`
          : `AI landing page drafted for "${d.keyword}". Confidence: ${d.confidence}/100. Review below.`
        })
        setSelectedOpp(null)
        await load()
      } else {
        setMsg({ type: "error", text: d.error ?? "Generation failed" })
      }
    } catch (e) {
      setMsg({ type: "error", text: String(e) })
    } finally { setRunning(false) }
  }

  const actOnPlan = async (planId: string, action: "approve" | "reject" | "modify", reason?: string) => {
    setActing(true); setMsg(null)
    try {
      const res = await fetch("/api/admin/growth/landing/approve", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action, planId, reason }),
      })
      const d = await res.json() as { ok?: boolean; note?: string; error?: string }
      if (d.ok) {
        setMsg({ type: "ok", text: d.note ?? `${action} successful.` })
        setShowModify(false); setModifyReason("")
        await load()
      } else { setMsg({ type: "error", text: d.error ?? "Action failed" }) }
    } catch (e) { setMsg({ type: "error", text: String(e) })
    } finally { setActing(false) }
  }

  const publishPlan = async (planId: string) => {
    setActing(true); setMsg(null)
    try {
      const res = await fetch("/api/admin/growth/landing/publish", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ planId }),
      })
      const d = await res.json() as { ok?: boolean; publishedAt?: string; url?: string; error?: string }
      if (d.ok) {
        setMsg({ type: "ok", text: `Published to ${d.url} at ${new Date(d.publishedAt!).toLocaleString("en-IN")}` })
        await load()
      } else { setMsg({ type: "error", text: d.error ?? "Publish failed" }) }
    } catch (e) { setMsg({ type: "error", text: String(e) })
    } finally { setActing(false) }
  }

  const filteredOpps = (preflight?.opportunities ?? []).filter(o => o.source === sourceTab)

  const filteredPlans = (preflight?.plans ?? []).filter(p =>
    (filterStatus === "all" || p.status === filterStatus) &&
    (filterSource === "all" || p.source === filterSource)
  )

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Layers size={20} className="text-brand-400" />
              <h1 className="text-xl font-bold">Landing Page Factory</h1>
            </div>
            <p className="text-gray-400 text-sm">Opportunity → Draft → Approve → Publish → Track traffic, leads, and revenue</p>
          </div>
          <button onClick={load} className="p-2 text-gray-500 hover:text-white border border-gray-800 rounded-lg">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Governance banner */}
        <div className="flex items-start gap-3 bg-gray-900 border border-gray-800 rounded-xl p-4">
          <Shield size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-gray-400">
            <strong className="text-gray-300">No automatic publishing.</strong>{" "}
            Pages are generated as drafts. Publish only fires after explicit Approve → Publish. Performance tracking starts automatically on publish.
          </p>
        </div>

        {/* System readiness */}
        {preflight && (
          <div className="flex flex-wrap gap-2">
            {[
              { ok: preflight.apiKeyConfigured, label: preflight.apiKeyConfigured ? "AI Generation (Claude)" : "Template Mode" },
              { ok: preflight.totalPlans > 0,     label: `${preflight.totalPlans} Plans` },
              { ok: preflight.pendingApproval > 0, label: `${preflight.pendingApproval} Pending Approval` },
              { ok: preflight.published > 0,       label: `${preflight.published} Published` },
              { ok: preflight.tracking > 0,        label: `${preflight.tracking} Tracking` },
            ].map(({ ok, label }) => (
              <div key={label} className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border ${ok ? "border-emerald-800 text-emerald-400 bg-emerald-950/30" : "border-gray-700 text-gray-500 bg-gray-900"}`}>
                {ok ? <CheckCircle size={11} /> : <AlertTriangle size={11} />}
                {label}
              </div>
            ))}
          </div>
        )}

        {/* Source breakdown */}
        {preflight && (
          <div className="grid grid-cols-4 gap-3">
            {(["seo", "dealer", "procurement", "ads"] as Source[]).map(src => {
              const cfg = SOURCE_CONFIG[src]
              const Icon = cfg.icon
              return (
                <div key={src} className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
                  <Icon size={16} className="mx-auto mb-1 text-gray-500" />
                  <p className="text-lg font-bold text-white">{preflight.sourceBreakdown[src]}</p>
                  <p className="text-[10px] text-gray-600">{cfg.label} Opportunities</p>
                </div>
              )
            })}
          </div>
        )}

        {/* Message */}
        {msg && (
          <div className={`flex items-start gap-3 p-4 rounded-xl border text-sm ${
            msg.type === "error" ? "bg-red-950/20 border-red-800/50 text-red-400" :
            msg.type === "warn"  ? "bg-amber-950/20 border-amber-800/50 text-amber-400" :
                                   "bg-emerald-950/20 border-emerald-800/50 text-emerald-400"
          }`}>
            {msg.type === "ok"   ? <CheckCircle size={16} className="flex-shrink-0 mt-0.5" /> :
             msg.type === "warn" ? <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" /> :
             <XCircle size={16} className="flex-shrink-0 mt-0.5" />}
            {msg.text}
          </div>
        )}

        {/* ── Opportunity picker ── */}
        {preflight && preflight.opportunities.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-800 flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Select Opportunity</p>
              <button
                onClick={generate}
                disabled={!selectedOpp || running}
                className="flex items-center gap-2 px-4 py-1.5 bg-brand-600 text-white text-xs rounded-lg hover:bg-brand-500 disabled:opacity-50 font-medium"
              >
                {running ? <RefreshCw size={12} className="animate-spin" /> : <Play size={12} />}
                {running ? "Generating…" : "Generate Page Draft"}
              </button>
            </div>

            {/* Source tabs */}
            <div className="flex border-b border-gray-800">
              {(["seo", "dealer", "procurement", "ads"] as Source[]).map(src => {
                const cfg  = SOURCE_CONFIG[src]
                const Icon = cfg.icon
                return (
                  <button
                    key={src}
                    onClick={() => setSourceTab(src)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                      sourceTab === src ? "border-brand-500 text-white" : "border-transparent text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    <Icon size={11} />{cfg.label}
                    <span className="ml-1 text-[9px] text-gray-600">{preflight.sourceBreakdown[src]}</span>
                  </button>
                )
              })}
            </div>

            <div className="divide-y divide-gray-800/60 max-h-64 overflow-y-auto">
              {filteredOpps.length === 0 ? (
                <div className="px-5 py-8 text-center text-gray-600 text-xs">No {sourceTab} opportunities available</div>
              ) : filteredOpps.map(opp => (
                <button
                  key={opp.id}
                  onClick={() => setSelectedOpp(selectedOpp?.id === opp.id ? null : opp)}
                  className={`w-full flex items-start gap-3 px-5 py-3.5 text-left transition-colors ${
                    selectedOpp?.id === opp.id ? "bg-brand-900/20 border-l-2 border-brand-500" : "hover:bg-gray-800/40"
                  } ${opp.hasPlan ? "opacity-50" : ""}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-xs font-medium text-white truncate">{opp.title}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${PRIORITY_COLORS[opp.priority] ?? PRIORITY_COLORS.medium}`}>{opp.priority}</span>
                      {opp.hasPlan && <span className="text-[9px] bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded">plan exists</span>}
                    </div>
                    <div className="flex gap-3 text-[11px] text-gray-600 flex-wrap">
                      <span className="flex items-center gap-1"><Globe size={10} />{opp.targetUrl}</span>
                      {opp.keyword && <span className="flex items-center gap-1 truncate max-w-48">{opp.keyword}</span>}
                      {opp.context && <span className="flex items-center gap-1 truncate max-w-64">{opp.context}</span>}
                    </div>
                  </div>
                  {selectedOpp?.id === opp.id && <CheckCircle size={14} className="text-brand-400 flex-shrink-0 mt-0.5" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Plans list ── */}
        {preflight && filteredPlans.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-[11px] text-gray-600 font-semibold uppercase tracking-wider">Landing Page Plans ({filteredPlans.length})</p>
              <div className="flex gap-1 flex-wrap">
                {["all", "draft", "approved", "published", "tracking"].map(s => (
                  <button
                    key={s}
                    onClick={() => setFilter(s)}
                    className={`text-[10px] px-2.5 py-1 rounded-lg border transition-colors ${filterStatus === s ? "border-brand-600 text-brand-300 bg-brand-900/20" : "border-gray-800 text-gray-500 hover:border-gray-700"}`}
                  >
                    {s === "all" ? "All" : s.replace(/_/g, " ")}
                  </button>
                ))}
                <div className="w-px bg-gray-800 mx-1" />
                {["all", "seo", "dealer", "procurement", "ads"].map(s => (
                  <button
                    key={s}
                    onClick={() => setFilterSrc(s)}
                    className={`text-[10px] px-2.5 py-1 rounded-lg border transition-colors ${filterSource === s ? "border-brand-600 text-brand-300 bg-brand-900/20" : "border-gray-800 text-gray-500 hover:border-gray-700"}`}
                  >
                    {s === "all" ? "All Sources" : SOURCE_CONFIG[s as Source]?.label ?? s}
                  </button>
                ))}
              </div>
            </div>

            {filteredPlans.map(plan => (
              <div key={plan.planId}>
                {/* Collapsed row */}
                <button
                  className="w-full flex items-center gap-3 bg-gray-900 border border-gray-800 rounded-xl px-5 py-3.5 hover:border-gray-700 text-left transition-colors"
                  onClick={() => setExpanded(expandedPlan === plan.planId ? null : plan.planId)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-sm font-medium text-white truncate">{plan.keyword}</span>
                      <StatusChip status={plan.status} />
                      <SourceBadge source={plan.source} />
                      {plan.simulated && <span className="text-[9px] text-gray-600">template</span>}
                    </div>
                    <div className="flex gap-3 text-[11px] text-gray-600 flex-wrap">
                      <span className="flex items-center gap-1"><Globe size={10} />{plan.targetUrl}</span>
                      <span className="flex items-center gap-1"><Clock size={10} />{new Date(plan.createdAt).toLocaleDateString("en-IN")}</span>
                      {plan.performance?.leads ? (
                        <span className="flex items-center gap-1 text-emerald-600"><TrendingUp size={10} />{plan.performance.leads} leads</span>
                      ) : null}
                    </div>
                  </div>
                  <div className={`text-sm font-bold flex-shrink-0 ${plan.qualityScores.confidence >= 65 ? "text-emerald-400" : "text-amber-400"}`}>
                    {plan.qualityScores.confidence}/100
                  </div>
                  {expandedPlan === plan.planId ? <ChevronUp size={14} className="text-gray-600 flex-shrink-0" /> : <ChevronDown size={14} className="text-gray-600 flex-shrink-0" />}
                </button>

                {/* Expanded detail */}
                {expandedPlan === plan.planId && (
                  <div className="mt-1 bg-gray-950 border border-gray-800 rounded-xl overflow-hidden">
                    {/* Plan header */}
                    <div className="px-5 py-4 border-b border-gray-800">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <h3 className="text-sm font-bold text-white">{plan.keyword}</h3>
                        <StatusChip status={plan.status} />
                        <SourceBadge source={plan.source} />
                      </div>
                      <StepIndicator status={plan.status} />
                    </div>

                    {/* Quality scores */}
                    <div className="px-5 py-3 border-b border-gray-800 bg-gray-900/30">
                      <div className="grid grid-cols-3 gap-x-6 gap-y-2">
                        <ScoreBar label="Hero Strength"     score={plan.qualityScores.heroStrength} />
                        <ScoreBar label="CTA Clarity"       score={plan.qualityScores.ctaClarity} />
                        <ScoreBar label="Benefit Depth"     score={plan.qualityScores.benefitDepth} />
                        <ScoreBar label="FAQ Coverage"      score={plan.qualityScores.faqCoverage} />
                        <ScoreBar label="Meta Quality"      score={plan.qualityScores.metaQuality} />
                        <ScoreBar label="Confidence"        score={plan.qualityScores.confidence} />
                      </div>
                      {plan.qualityScores.gaps.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {plan.qualityScores.gaps.map((g, i) => (
                            <span key={i} className="text-[10px] bg-amber-950/30 text-amber-400 border border-amber-900/40 px-2 py-0.5 rounded flex items-center gap-1">
                              <AlertTriangle size={9} />{g}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Content tabs */}
                    <div className="px-5 py-4">
                      <ContentPanel plan={plan} />
                    </div>

                    {/* Performance (published/tracking) */}
                    {(plan.status === "published" || plan.status === "tracking") && (
                      <PerformancePanel plan={plan} onRefresh={load} />
                    )}

                    {/* Action bar */}
                    <div className="px-5 py-4 border-t border-gray-800 bg-gray-900/20">
                      {plan.status === "draft" && (
                        <div className="flex items-center justify-between flex-wrap gap-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setShowModify(s => !s)}
                              disabled={acting}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-blue-400 border border-blue-800 rounded-lg hover:bg-blue-950/30 disabled:opacity-50"
                            >
                              <Edit3 size={11} />Modify
                            </button>
                            <button
                              onClick={() => actOnPlan(plan.planId, "reject")}
                              disabled={acting}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 border border-red-800 rounded-lg hover:bg-red-950/30 disabled:opacity-50"
                            >
                              <XCircle size={11} />Reject
                            </button>
                          </div>
                          <button
                            onClick={() => actOnPlan(plan.planId, "approve")}
                            disabled={acting}
                            className="flex items-center gap-2 px-5 py-2 bg-emerald-700 text-white text-xs font-bold rounded-lg hover:bg-emerald-600 disabled:opacity-50"
                          >
                            {acting ? <RefreshCw size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                            Approve Page
                          </button>
                        </div>
                      )}

                      {plan.status === "approved" && (
                        <div className="flex items-center justify-between flex-wrap gap-3">
                          <div className="flex items-center gap-2 text-xs text-emerald-400">
                            <CheckCircle size={14} />
                            <span>Approved — ready to publish</span>
                          </div>
                          <button
                            onClick={() => publishPlan(plan.planId)}
                            disabled={acting}
                            className="flex items-center gap-2 px-5 py-2 bg-teal-700 text-white text-xs font-bold rounded-lg hover:bg-teal-600 disabled:opacity-50"
                          >
                            {acting ? <RefreshCw size={12} className="animate-spin" /> : <Rocket size={12} />}
                            Publish Landing Page
                          </button>
                        </div>
                      )}

                      {plan.status === "published" && (
                        <div className="flex items-center gap-2 text-xs text-teal-400">
                          <Globe size={12} />
                          <span>Live at {plan.deploymentInfo?.publishedUrl}</span>
                          {plan.deploymentInfo?.publishedAt && (
                            <span className="text-gray-600">· {new Date(plan.deploymentInfo.publishedAt).toLocaleDateString("en-IN")}</span>
                          )}
                        </div>
                      )}

                      {plan.status === "tracking" && (
                        <div className="flex items-center gap-2 text-xs text-brand-400">
                          <BarChart3 size={12} />
                          <span>Tracking traffic, leads, and revenue attribution</span>
                        </div>
                      )}

                      {/* Modify input */}
                      {showModify && plan.status === "draft" && (
                        <div className="mt-3 border-t border-gray-800 pt-3">
                          <p className="text-[11px] text-gray-500 mb-2">Describe what to change — re-run factory to regenerate.</p>
                          <div className="flex gap-2">
                            <input
                              value={modifyReason}
                              onChange={e => setModifyReason(e.target.value)}
                              placeholder="e.g. Make hero more urgent, add government case study, shorter FAQ answers"
                              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 outline-none focus:border-brand-600"
                            />
                            <button
                              onClick={() => actOnPlan(plan.planId, "modify", modifyReason)}
                              disabled={acting || !modifyReason.trim()}
                              className="px-4 py-2 text-xs bg-blue-700 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 font-medium"
                            >Submit</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && preflight && filteredPlans.length === 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-16 text-center">
            <Layers size={36} className="text-gray-700 mx-auto mb-4" />
            <p className="text-gray-400 text-sm font-medium">No landing page plans yet</p>
            <p className="text-gray-600 text-xs mt-1.5 max-w-sm mx-auto">
              Select an opportunity above (SEO, Dealer, Procurement, or Ads) and click "Generate Page Draft".
            </p>
          </div>
        )}

        {loading && (
          <div className="space-y-3">
            <div className="h-14 bg-gray-900 rounded-xl animate-pulse" />
            <div className="h-48 bg-gray-900 rounded-xl animate-pulse" />
          </div>
        )}

        {/* Nav links */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-800">
          {[
            { href: "/admin/growth/seo/execution", label: "SEO Content Factory" },
            { href: "/admin/growth/ads/health",    label: "Ads Health" },
            { href: "/admin/growth/fogging",       label: "Fogging Intelligence" },
            { href: "/admin/growth/director",      label: "Revenue Director" },
          ].map(({ href, label }) => (
            <a key={href} href={href} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 px-3 py-1.5 border border-gray-800 rounded-lg hover:border-gray-700">
              <ArrowRight size={11} />{label}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
