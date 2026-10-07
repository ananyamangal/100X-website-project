"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Search, Zap, RefreshCw, CheckCircle, XCircle, AlertTriangle,
  ChevronDown, ChevronUp, FileText, Globe, Link2, Code2,
  BarChart3, Rocket, RotateCcw, Edit3, Eye, ArrowRight,
  BookOpen, Star, Clock, TrendingUp, Shield, Play,
} from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────

interface Recommendation {
  id: string; type: string; priority: "critical" | "high" | "medium" | "low"
  title: string; url: string; targetKeyword: string; contentType: string
  currentState: string; proposedChange: string
  expectedClicks: number; confidence: number; difficulty: string; hasPlan: boolean
}

interface ContentSection { heading: string; content: string; wordCount: number }
interface InternalLink   { anchor: string; url: string; rationale: string }

interface GeneratedContent {
  metaTitle: string; metaDescription: string; h1: string
  sections: ContentSection[]; schema: string
  internalLinks: InternalLink[]; ctas: string[]
  wordCount: number; generationMethod: "llm" | "template"
}

interface QualityScores {
  keywordPresence: number; contentDepth: number; metaQuality: number
  schemaPresent: number; linksPresent: number; confidence: number; gaps: string[]
}

interface ContentPlan {
  planId: string; recommendationId: string; keyword: string
  targetUrl: string; contentType: string; priority: string; status: string
  simulated: boolean; generatedContent: GeneratedContent; qualityScores: QualityScores
  deploymentInfo?: { publishedAt?: string; publishedUrl?: string; indexRequestedAt?: string; indexStatus?: string }
  outcomeTracking?: { baselineImpressions: number; baselineClicks: number; baselinePosition: number }
  createdAt: string
}

interface Preflight {
  apiKeyConfigured: boolean; totalPlans: number; pendingReview: number; published: number
  plans: ContentPlan[]; recommendations: Recommendation[]
}

type ContentTab = "content" | "meta" | "schema" | "links"

// ── Helpers ───────────────────────────────────────────────────────────────────

const PRIORITY_COLORS: Record<string, string> = {
  critical: "bg-red-900/40 text-red-300 border-red-700",
  high:     "bg-orange-900/40 text-orange-300 border-orange-700",
  medium:   "bg-amber-900/40 text-amber-300 border-amber-700",
  low:      "bg-gray-800 text-gray-400 border-gray-700",
}

const STATUS_COLORS: Record<string, string> = {
  pending_review:   "bg-blue-900/40 text-blue-300 border-blue-700",
  approved:         "bg-emerald-900/40 text-emerald-300 border-emerald-700",
  rejected:         "bg-red-900/40 text-red-300 border-red-700",
  modify_requested: "bg-purple-900/40 text-purple-300 border-purple-700",
  published:        "bg-teal-900/40 text-teal-300 border-teal-700",
  indexed:          "bg-brand-900/40 text-brand-300 border-brand-700",
  tracking:         "bg-emerald-900/40 text-emerald-300 border-emerald-700",
}

function StatusChip({ status }: { status: string }) {
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_COLORS[status] ?? "bg-gray-800 text-gray-400 border-gray-700"}`}>
      {status.replace(/_/g, " ")}
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
    { id: "pending_review", label: "Draft" },
    { id: "approved",       label: "Approved" },
    { id: "published",      label: "Published" },
    { id: "indexed",        label: "Indexed" },
    { id: "tracking",       label: "Tracking" },
  ]
  const order = ["pending_review", "approved", "published", "indexed", "tracking"]
  const idx = order.indexOf(status)

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

// ── Content detail panel ──────────────────────────────────────────────────────

function ContentPanel({ plan }: { plan: ContentPlan }) {
  const [tab, setTab] = useState<ContentTab>("content")

  const TABS: { key: ContentTab; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
    { key: "content", label: "Content", icon: FileText },
    { key: "meta",    label: "Meta & Title", icon: Globe },
    { key: "schema",  label: "Schema", icon: Code2 },
    { key: "links",   label: "Links & CTAs", icon: Link2 },
  ]

  return (
    <div className="space-y-3">
      {/* Tabs */}
      <div className="flex border-b border-gray-800 overflow-x-auto">
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

      {/* Content tab */}
      {tab === "content" && (
        <div className="space-y-4 max-h-80 overflow-y-auto">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-2">H1</p>
            <p className="text-white font-bold text-lg">{plan.generatedContent.h1}</p>
          </div>
          {plan.generatedContent.sections.map((sec, i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-white">{sec.heading}</p>
                <span className="text-[10px] text-gray-600">{sec.wordCount} words</span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">{sec.content}</p>
            </div>
          ))}
          <div className="text-[11px] text-gray-600 flex items-center gap-2">
            <FileText size={10} />
            {plan.generatedContent.wordCount} total words ·
            {plan.generatedContent.generationMethod === "llm" ? " AI-generated" : " Template (add ANTHROPIC_API_KEY for AI content)"}
          </div>
        </div>
      )}

      {/* Meta tab */}
      {tab === "meta" && (
        <div className="space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Meta Title</p>
              <span className={`text-[10px] ${plan.generatedContent.metaTitle.length <= 60 ? "text-emerald-400" : "text-red-400"}`}>
                {plan.generatedContent.metaTitle.length}/60
              </span>
            </div>
            <p className="text-white text-sm font-medium">{plan.generatedContent.metaTitle}</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Meta Description</p>
              <span className={`text-[10px] ${plan.generatedContent.metaDescription.length <= 160 ? "text-emerald-400" : "text-red-400"}`}>
                {plan.generatedContent.metaDescription.length}/160
              </span>
            </div>
            <p className="text-gray-300 text-sm">{plan.generatedContent.metaDescription}</p>
          </div>
          {/* SERP preview */}
          <div className="bg-white rounded-xl p-4">
            <p className="text-[9px] text-gray-400 mb-0.5">100xcircle.com{plan.targetUrl}</p>
            <p className="text-blue-700 text-sm font-medium leading-snug hover:underline">{plan.generatedContent.metaTitle}</p>
            <p className="text-gray-600 text-xs mt-0.5 leading-relaxed">{plan.generatedContent.metaDescription}</p>
          </div>
        </div>
      )}

      {/* Schema tab */}
      {tab === "schema" && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mb-2">JSON-LD Schema Markup</p>
          <pre className="text-[11px] text-gray-300 overflow-x-auto whitespace-pre-wrap break-words leading-relaxed">
            {(() => { try { return JSON.stringify(JSON.parse(plan.generatedContent.schema), null, 2) } catch { return plan.generatedContent.schema } })()}
          </pre>
        </div>
      )}

      {/* Links tab */}
      {tab === "links" && (
        <div className="space-y-3">
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-4 py-2 border-b border-gray-800">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Internal Links ({plan.generatedContent.internalLinks.length})</p>
            </div>
            <div className="divide-y divide-gray-800/60">
              {plan.generatedContent.internalLinks.map((link, i) => (
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
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-4 py-2 border-b border-gray-800">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">CTAs ({plan.generatedContent.ctas.length})</p>
            </div>
            <div className="px-4 py-3 flex flex-wrap gap-2">
              {plan.generatedContent.ctas.map((cta, i) => (
                <span key={i} className="text-xs bg-brand-900/30 text-brand-300 border border-brand-800/40 px-3 py-1 rounded-full">{cta}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SeoExecutionPage() {
  const [preflight, setPreflight]   = useState<Preflight | null>(null)
  const [loading, setLoading]       = useState(true)
  const [running, setRunning]       = useState(false)
  const [acting, setActing]         = useState(false)
  const [msg, setMsg]               = useState<{ type: "ok" | "error" | "warn"; text: string } | null>(null)
  const [selectedRec, setSelectedRec] = useState<Recommendation | null>(null)
  const [expandedPlan, setExpanded] = useState<string | null>(null)
  const [modifyReason, setModifyReason] = useState("")
  const [showModify, setShowModify] = useState(false)
  const [filterStatus, setFilter]   = useState<string>("all")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/growth/seo/content-factory")
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
    if (!selectedRec) { setMsg({ type: "warn", text: "Select a recommendation first." }); return }
    setRunning(true)
    setMsg(null)
    try {
      const res = await fetch("/api/admin/growth/seo/content-factory", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          recommendationId: selectedRec.id,
          keyword:          selectedRec.targetKeyword,
          targetUrl:        selectedRec.url,
          contentType:      selectedRec.contentType,
          priority:         selectedRec.priority,
          currentState:     selectedRec.currentState,
          proposedChange:   selectedRec.proposedChange,
        }),
      })
      const d = await res.json() as { ok?: boolean; simulated?: boolean; planId?: string; keyword?: string; confidence?: number; error?: string }
      if (d.ok) {
        setMsg({ type: d.simulated ? "warn" : "ok", text: d.simulated
          ? `Draft generated (template — add ANTHROPIC_API_KEY for AI content). Confidence: ${d.confidence}/100`
          : `AI content generated for "${d.keyword}". Confidence: ${d.confidence}/100. Review below.`
        })
        setSelectedRec(null)
        await load()
      } else {
        setMsg({ type: "error", text: d.error ?? "Generation failed" })
      }
    } catch (e) {
      setMsg({ type: "error", text: String(e) })
    } finally {
      setRunning(false)
    }
  }

  const actOnPlan = async (planId: string, action: "approve" | "reject" | "modify", reason?: string) => {
    setActing(true)
    setMsg(null)
    try {
      const res = await fetch("/api/admin/growth/seo/content-factory/approve", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action, planId, reason }),
      })
      const d = await res.json() as { ok?: boolean; note?: string; error?: string }
      if (d.ok) {
        setMsg({ type: "ok", text: d.note ?? `${action} successful.` })
        setShowModify(false)
        setModifyReason("")
        await load()
      } else {
        setMsg({ type: "error", text: d.error ?? "Action failed" })
      }
    } catch (e) {
      setMsg({ type: "error", text: String(e) })
    } finally {
      setActing(false)
    }
  }

  const publishPlan = async (planId: string) => {
    setActing(true)
    setMsg(null)
    try {
      const res = await fetch("/api/admin/growth/seo/content-factory/publish", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ planId }),
      })
      const d = await res.json() as { ok?: boolean; publishedAt?: string; url?: string; error?: string }
      if (d.ok) {
        setMsg({ type: "ok", text: `Published to ${d.url} at ${new Date(d.publishedAt!).toLocaleString("en-IN")}` })
        await load()
      } else {
        setMsg({ type: "error", text: d.error ?? "Publish failed" })
      }
    } catch (e) {
      setMsg({ type: "error", text: String(e) })
    } finally {
      setActing(false)
    }
  }

  const requestIndex = async (planId: string) => {
    setActing(true)
    setMsg(null)
    try {
      const res = await fetch("/api/admin/growth/seo/content-factory/index-request", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ planId }),
      })
      const d = await res.json() as { ok?: boolean; indexStatus?: string; note?: string; error?: string }
      if (d.ok) {
        setMsg({ type: "ok", text: d.note ?? `Indexing requested. Status: ${d.indexStatus}` })
        await load()
      } else {
        setMsg({ type: "error", text: d.error ?? "Index request failed" })
      }
    } catch (e) {
      setMsg({ type: "error", text: String(e) })
    } finally {
      setActing(false)
    }
  }

  const filteredPlans = (preflight?.plans ?? []).filter(p =>
    filterStatus === "all" || p.status === filterStatus
  )

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BookOpen size={20} className="text-brand-400" />
              <h1 className="text-xl font-bold">SEO Content Factory</h1>
            </div>
            <p className="text-gray-400 text-sm">Recommendation → Draft → Approve → Publish → Index → Track outcomes</p>
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
            Content is generated as a draft. Only the "Approve → Publish" action deploys to the site — and only after your explicit approval.
          </p>
        </div>

        {/* System readiness */}
        {preflight && (
          <div className="flex flex-wrap gap-2">
            {[
              { ok: preflight.apiKeyConfigured, label: preflight.apiKeyConfigured ? "AI Generation (Claude)" : "Template Mode (no API key)" },
              { ok: preflight.totalPlans > 0,   label: `${preflight.totalPlans} Plans` },
              { ok: preflight.pendingReview > 0, label: `${preflight.pendingReview} Pending Review` },
              { ok: preflight.published > 0,     label: `${preflight.published} Published` },
            ].map(({ ok, label }) => (
              <div key={label} className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border ${ok ? "border-emerald-800 text-emerald-400 bg-emerald-950/30" : "border-gray-700 text-gray-500 bg-gray-900"}`}>
                {ok ? <CheckCircle size={11} /> : <AlertTriangle size={11} />}
                {label}
              </div>
            ))}
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

        {/* ── Recommendation Picker ── */}
        {preflight && preflight.recommendations.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Search size={14} className="text-gray-400" />
                <p className="text-sm font-semibold text-white">Select Recommendation to Generate</p>
              </div>
              <button
                onClick={generate}
                disabled={!selectedRec || running}
                className="flex items-center gap-2 px-4 py-1.5 bg-brand-600 text-white text-xs rounded-lg hover:bg-brand-500 disabled:opacity-50 font-medium"
              >
                {running ? <RefreshCw size={12} className="animate-spin" /> : <Play size={12} />}
                {running ? "Generating…" : "Generate Draft"}
              </button>
            </div>
            <div className="divide-y divide-gray-800/60 max-h-64 overflow-y-auto">
              {preflight.recommendations.map(rec => (
                <button
                  key={rec.id}
                  onClick={() => setSelectedRec(selectedRec?.id === rec.id ? null : rec)}
                  className={`w-full flex items-start gap-3 px-5 py-3.5 text-left transition-colors ${
                    selectedRec?.id === rec.id ? "bg-brand-900/20 border-l-2 border-brand-500" : "hover:bg-gray-800/40"
                  } ${rec.hasPlan ? "opacity-50" : ""}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-xs font-medium text-white truncate">{rec.title}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${PRIORITY_COLORS[rec.priority]}`}>{rec.priority}</span>
                      {rec.hasPlan && <span className="text-[9px] bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded">plan exists</span>}
                    </div>
                    <div className="flex gap-3 text-[11px] text-gray-600">
                      <span className="flex items-center gap-1"><Globe size={10} />{rec.url}</span>
                      <span className="flex items-center gap-1"><Search size={10} />{rec.targetKeyword}</span>
                      {rec.expectedClicks > 0 && <span className="flex items-center gap-1"><TrendingUp size={10} />+{rec.expectedClicks} clicks</span>}
                    </div>
                  </div>
                  {selectedRec?.id === rec.id && <CheckCircle size={14} className="text-brand-400 flex-shrink-0 mt-0.5" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Plans list ── */}
        {preflight && filteredPlans.length > 0 && (
          <div className="space-y-3">
            {/* Filter bar */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-[11px] text-gray-600 font-semibold uppercase tracking-wider">Content Plans ({filteredPlans.length})</p>
              <div className="flex gap-1">
                {["all", "pending_review", "approved", "published", "indexed"].map(s => (
                  <button
                    key={s}
                    onClick={() => setFilter(s)}
                    className={`text-[10px] px-2.5 py-1 rounded-lg border transition-colors ${filterStatus === s ? "border-brand-600 text-brand-300 bg-brand-900/20" : "border-gray-800 text-gray-500 hover:border-gray-700"}`}
                  >
                    {s === "all" ? "All" : s.replace(/_/g, " ")}
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
                      {plan.simulated && <span className="text-[9px] text-gray-600">template</span>}
                    </div>
                    <div className="flex gap-3 text-[11px] text-gray-600">
                      <span className="flex items-center gap-1"><Globe size={10} />{plan.targetUrl}</span>
                      <span className="flex items-center gap-1"><FileText size={10} />{plan.generatedContent.wordCount} words</span>
                      <span className="flex items-center gap-1"><Clock size={10} />{new Date(plan.createdAt).toLocaleDateString("en-IN")}</span>
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
                      </div>
                      <StepIndicator status={plan.status} />
                    </div>

                    {/* Quality scores */}
                    <div className="px-5 py-3 border-b border-gray-800 bg-gray-900/30">
                      <div className="grid grid-cols-3 gap-x-6 gap-y-2">
                        <ScoreBar label="Keyword Presence"   score={plan.qualityScores.keywordPresence} />
                        <ScoreBar label="Content Depth"      score={plan.qualityScores.contentDepth} />
                        <ScoreBar label="Meta Quality"       score={plan.qualityScores.metaQuality} />
                        <ScoreBar label="Schema"             score={plan.qualityScores.schemaPresent} />
                        <ScoreBar label="Internal Links"     score={plan.qualityScores.linksPresent} />
                        <ScoreBar label="Overall Confidence" score={plan.qualityScores.confidence} />
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

                    {/* Baseline outcomes */}
                    {plan.outcomeTracking && (
                      <div className="px-5 py-3 border-b border-gray-800 flex gap-6 text-center">
                        {[
                          { label: "Baseline Impressions", value: plan.outcomeTracking.baselineImpressions.toLocaleString("en-IN") },
                          { label: "Baseline Clicks", value: plan.outcomeTracking.baselineClicks.toLocaleString("en-IN") },
                          { label: "Baseline Position", value: plan.outcomeTracking.baselinePosition.toFixed(1) },
                        ].map(({ label, value }) => (
                          <div key={label}>
                            <p className="text-sm font-bold text-white">{value}</p>
                            <p className="text-[10px] text-gray-600">{label}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Content tabs */}
                    <div className="px-5 py-4">
                      <ContentPanel plan={plan} />
                    </div>

                    {/* Action bar */}
                    <div className="px-5 py-4 border-t border-gray-800 bg-gray-900/20">
                      {plan.status === "pending_review" && (
                        <div className="flex items-center justify-between flex-wrap gap-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setShowModify(showModify ? false : true)}
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
                            Approve Content
                          </button>
                        </div>
                      )}

                      {plan.status === "approved" && (
                        <div className="flex items-center justify-between flex-wrap gap-3">
                          <div className="flex items-center gap-2 text-xs text-emerald-400">
                            <CheckCircle size={14} />
                            <span>Content approved — ready to publish</span>
                          </div>
                          <button
                            onClick={() => publishPlan(plan.planId)}
                            disabled={acting}
                            className="flex items-center gap-2 px-5 py-2 bg-teal-700 text-white text-xs font-bold rounded-lg hover:bg-teal-600 disabled:opacity-50"
                          >
                            {acting ? <RefreshCw size={12} className="animate-spin" /> : <Rocket size={12} />}
                            Publish to Site
                          </button>
                        </div>
                      )}

                      {plan.status === "published" && (
                        <div className="flex items-center justify-between flex-wrap gap-3">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2 text-xs text-teal-400">
                              <Globe size={12} />
                              Published to {plan.deploymentInfo?.publishedUrl}
                            </div>
                            {plan.deploymentInfo?.publishedAt && (
                              <p className="text-[10px] text-gray-600">Published: {new Date(plan.deploymentInfo.publishedAt).toLocaleString("en-IN")}</p>
                            )}
                          </div>
                          <button
                            onClick={() => requestIndex(plan.planId)}
                            disabled={acting}
                            className="flex items-center gap-2 px-5 py-2 bg-brand-700 text-white text-xs font-bold rounded-lg hover:bg-brand-600 disabled:opacity-50"
                          >
                            {acting ? <RefreshCw size={12} className="animate-spin" /> : <Search size={12} />}
                            Request Indexing
                          </button>
                        </div>
                      )}

                      {(plan.status === "indexed" || plan.status === "tracking") && (
                        <div className="flex items-center gap-2 text-xs text-brand-400">
                          <Star size={12} />
                          <span>
                            {plan.status === "indexed" ? "URL submitted for indexing" : "Tracking outcomes"} ·
                            {plan.deploymentInfo?.indexRequestedAt && ` ${new Date(plan.deploymentInfo.indexRequestedAt).toLocaleDateString("en-IN")}`}
                          </span>
                        </div>
                      )}

                      {/* Modify input */}
                      {showModify && plan.status === "pending_review" && (
                        <div className="mt-3 border-t border-gray-800 pt-3">
                          <p className="text-[11px] text-gray-500 mb-2">Describe what needs to change — factory will regenerate on next run.</p>
                          <div className="flex gap-2">
                            <input
                              value={modifyReason}
                              onChange={e => setModifyReason(e.target.value)}
                              placeholder="e.g. Make content more technical, add case studies, shorter meta title"
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
            <BookOpen size={36} className="text-gray-700 mx-auto mb-4" />
            <p className="text-gray-400 text-sm font-medium">No content plans yet</p>
            <p className="text-gray-600 text-xs mt-1.5 max-w-sm mx-auto">
              Select a recommendation above and click "Generate Draft" to start the SEO content pipeline.
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
            { href: "/admin/growth/seo",            label: "SEO Overview" },
            { href: "/admin/growth/seo/workflow",   label: "SEO Workflow" },
            { href: "/admin/growth/seo/offpage",    label: "Off-Page" },
            { href: "/admin/growth/ads/health",     label: "Ads Health" },
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
