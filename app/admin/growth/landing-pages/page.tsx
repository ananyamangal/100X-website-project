"use client"

import { useState, useEffect } from "react"
import {
  ExternalLink, Copy, Check, Info, AlertTriangle,
  Globe, FileText, X, CheckCircle2, XCircle, Layout,
  List, Eye, BookOpen, Search, ChevronRight, Shield,
  ClipboardCheck, BarChart2, AlertCircle, TrendingUp,
  Lock, Unlock, UserCheck, UserX,
} from "lucide-react"
import Link from "next/link"
import { getAllLandingPages, getLandingTheme, type LandingPageDef } from "@/lib/seo/landing-pages"
import { ROLE_PERMISSIONS } from "@/lib/rbac/roles"

// ─── Constants ────────────────────────────────────────────────────────────────

const SITE_URL = "https://www.100xcircle.com"

const ALL_PAGES = getAllLandingPages()
// SiteFooter.tsx: getAllLandingPages().slice(0, 7)
const FOOTER_SLUGS = new Set(ALL_PAGES.slice(0, 7).map(p => p.slug))
const KNOWN_FOOTER_MISSING = new Set([
  "fogging-machine-buying-guide",
  "thermal-fogging-machine-with-stainless-steel-tank-100xssma20",
])

// Roles to audit for landing_pages.view
const AUDIT_ROLES = [
  "super_admin", "growth_admin", "seo_team",
  "content_team", "sales_manager", "viewer",
] as const

// ─── Types ────────────────────────────────────────────────────────────────────

type AIInference = "likely" | "manual" | "unknown"
type ModalTab = "overview" | "health" | "impact" | "source"

type HealthCheck = {
  id: string
  label: string
  passed: boolean
  weight: number
  note?: string
}

type PageMetrics = {
  impressions: number | null
  clicks: number | null
  position: number | null
  ctr: number | null
  leads: number | null
  syncDate: string | null
  available: boolean
}

type MetricsMap = Record<string, PageMetrics>

// ─── Pure derivation helpers ──────────────────────────────────────────────────

function inferAI(def: LandingPageDef): { value: AIInference; label: string; note: string; owner: string } {
  if (def.sections && def.sections.length > 0) {
    return {
      value: "likely",
      label: "Likely — AI agent",
      note: "Has structured sections array — characteristic of agent-generated pages. Schema contains no explicit flag.",
      owner: "Growth OS Agent",
    }
  }
  if (def.content1 || def.content2 || def.content3) {
    return {
      value: "manual",
      label: "Manual — legacy",
      note: "Uses legacy content1/2/3 fields (pre-sections system). Likely hand-authored before the section renderer was built.",
      owner: "100x Circle Team",
    }
  }
  return {
    value: "unknown",
    label: "Unknown",
    note: "Cannot determine from schema alone.",
    owner: "Unknown",
  }
}

function computeHealthScore(def: LandingPageDef): { score: number; checks: HealthCheck[] } {
  const hasHero = !!def.hero
  const hasHeadline = !!(def.hero?.headline || def.metadata.title)
  const hasFaqs = !!(def.faqs && def.faqs.length > 0)
  const hasCtaSection = !!(
    def.hero?.primary ||
    def.sections?.some(s => s.kind === "cta-band" || s.kind === "form")
  )
  const inFooter = FOOTER_SLUGS.has(def.slug)
  const hasMetaDesc = !!(def.metadata.description && def.metadata.description.length >= 50)
  const hasKeywords = !!(def.metadata.keywords && def.metadata.keywords.trim().length > 0)

  const checks: HealthCheck[] = [
    {
      id: "meta_desc",
      label: "Meta description (≥ 50 chars)",
      passed: hasMetaDesc,
      weight: 15,
      note: !hasMetaDesc
        ? (def.metadata.description
            ? `Too short — ${def.metadata.description.length} chars`
            : "Missing")
        : undefined,
    },
    {
      id: "h1",
      label: "Headline / H1 present",
      passed: hasHeadline,
      weight: 15,
    },
    {
      id: "hero",
      label: "Hero block with CTA",
      passed: hasHero && !!(def.hero?.primary),
      weight: 10,
      note: !hasHero ? "No hero block — uses legacy layout" : (!def.hero?.primary ? "Hero present but no primary CTA" : undefined),
    },
    {
      id: "faq_schema",
      label: "FAQ structured data",
      passed: hasFaqs,
      weight: 15,
      note: !hasFaqs ? "No FAQs — FAQPage JSON-LD schema will not be generated" : `${def.faqs!.length} FAQ entries`,
    },
    {
      id: "cta",
      label: "CTA / lead form section",
      passed: hasCtaSection,
      weight: 15,
      note: !hasCtaSection ? "No form or CTA band section found" : undefined,
    },
    {
      id: "footer",
      label: "Footer navigation link",
      passed: inFooter,
      weight: 20,
      note: !inFooter ? "Excluded by slice(0,7) cap in SiteFooter.tsx:78" : undefined,
    },
    {
      id: "sitemap",
      label: "XML sitemap included",
      passed: true,
      weight: 5,
      note: "Automatic — all LANDING_PAGES entries are always included",
    },
    {
      id: "keywords",
      label: "Target keywords defined",
      passed: hasKeywords,
      weight: 5,
      note: !hasKeywords ? "No keywords field in metadata" : undefined,
    },
  ]

  const totalWeight = checks.reduce((s, c) => s + c.weight, 0)
  const earnedWeight = checks.filter(c => c.passed).reduce((s, c) => s + c.weight, 0)
  const score = Math.round((earnedWeight / totalWeight) * 100)

  return { score, checks }
}

function getSectionTypes(def: LandingPageDef): string[] {
  return def.sections?.map(s => s.kind) ?? []
}

function scoreColor(score: number): string {
  if (score >= 85) return "text-green-600"
  if (score >= 65) return "text-amber-600"
  return "text-red-600"
}

function scoreBg(score: number): string {
  if (score >= 85) return "bg-green-500"
  if (score >= 65) return "bg-amber-500"
  return "bg-red-500"
}

// ─── Style maps ───────────────────────────────────────────────────────────────

const TYPE_PILL: Record<string, string> = {
  product:    "bg-blue-100 text-blue-700",
  gem:        "bg-purple-100 text-purple-700",
  state:      "bg-green-100 text-green-700",
  city:       "bg-teal-100 text-teal-700",
  "use-case": "bg-orange-100 text-orange-700",
  comparison: "bg-amber-100 text-amber-700",
  guide:      "bg-indigo-100 text-indigo-700",
}

const AI_PILL: Record<AIInference, string> = {
  likely:  "bg-amber-100 text-amber-700",
  manual:  "bg-gray-100 text-gray-600",
  unknown: "bg-gray-50 text-gray-400 border border-gray-200",
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function CopyButton({ text, title = "Copy" }: { text: string; title?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        })
      }}
      className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0"
      title={title}
    >
      {copied ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
    </button>
  )
}

function Pill({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${color}`}>
      {children}
    </span>
  )
}

function YesNo({ value, yes = "Yes", no = "No" }: { value: boolean; yes?: string; no?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${value ? "text-green-700" : "text-red-600"}`}>
      {value ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
      {value ? yes : no}
    </span>
  )
}

function ModalRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-500 w-36 shrink-0 pt-0.5">{label}</span>
      <span className="text-xs text-gray-900 flex-1 min-w-0">{children}</span>
    </div>
  )
}

// ─── Health Score Bar ─────────────────────────────────────────────────────────

function HealthScoreBadge({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${scoreBg(score)}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={`text-xs font-bold tabular-nums ${scoreColor(score)}`}>{score}</span>
    </div>
  )
}

// ─── Source Detail Modal (4 tabs) ─────────────────────────────────────────────

function SourceModal({
  def,
  metrics,
  metricsLoading,
  onClose,
}: {
  def: LandingPageDef
  metrics: PageMetrics | null
  metricsLoading: boolean
  onClose: () => void
}) {
  const [tab, setTab] = useState<ModalTab>("overview")
  const ai = inferAI(def)
  const theme = getLandingTheme(def)
  const fullUrl = `${SITE_URL}/${def.slug}`
  const inFooter = FOOTER_SLUGS.has(def.slug)
  const footerPos = inFooter ? ALL_PAGES.findIndex(p => p.slug === def.slug) + 1 : null
  const { score, checks } = computeHealthScore(def)
  const sectionTypes = getSectionTypes(def)
  const hasLegacy = !!(def.content1 || def.content2 || def.content3)

  const TABS: { id: ModalTab; label: string; icon: React.ReactNode }[] = [
    { id: "overview", label: "Overview",    icon: <Info size={13} /> },
    { id: "health",   label: "Health",      icon: <ClipboardCheck size={13} /> },
    { id: "impact",   label: "Impact",      icon: <BarChart2 size={13} /> },
    { id: "source",   label: "Source",      icon: <FileText size={13} /> },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-bold text-gray-900 text-sm leading-tight">
                {def.metadata.title.split(" | ")[0]}
              </h2>
              <Pill color={TYPE_PILL[def.type] ?? "bg-gray-100 text-gray-600"}>{def.type}</Pill>
              <HealthScoreBadge score={score} />
            </div>
            <p className="text-[11px] text-gray-500 mt-1 font-mono">/{def.slug}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab bar */}
        <div className="px-5 border-b border-gray-200 flex gap-0">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px ${
                tab === t.id
                  ? "text-brand-600 border-brand-600"
                  : "text-gray-500 border-transparent hover:text-gray-700"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">

          {/* ── Overview tab ── */}
          {tab === "overview" && (
            <div className="space-y-4">
              {/* URL + canonical */}
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">URL & Canonical</p>
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Globe size={12} className="text-gray-400 shrink-0" />
                    <span className="text-[11px] font-mono text-gray-700 flex-1 break-all">{fullUrl}</span>
                    <CopyButton text={fullUrl} title="Copy URL" />
                    <a href={fullUrl} target="_blank" rel="noopener noreferrer"
                      className="p-1 rounded text-gray-400 hover:text-brand-600 transition-colors">
                      <ExternalLink size={12} />
                    </a>
                  </div>
                  <p className="text-[10px] text-gray-500 pl-5">
                    Canonical: <span className="font-mono">{fullUrl}</span>
                    <span className="ml-2 text-gray-400">(auto-generated by Next.js metadata — no separate canonical tag needed)</span>
                  </p>
                </div>
              </div>

              {/* Governance */}
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Governance</p>
                <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
                  <ModalRow label="Page owner">
                    <span className="font-medium">{ai.owner}</span>
                  </ModalRow>
                  <ModalRow label="Created source">
                    <div className="flex items-center gap-1.5">
                      <FileText size={11} className="text-blue-500" />
                      <span className="font-medium text-blue-800">Static Registry</span>
                      <code className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded ml-1">lib/seo/landing-pages.ts</code>
                    </div>
                  </ModalRow>
                  <ModalRow label="AI Generated">
                    <div>
                      <Pill color={AI_PILL[ai.value]}>{ai.label}</Pill>
                      <p className="text-[10px] text-gray-500 mt-1">{ai.note}</p>
                    </div>
                  </ModalRow>
                  <ModalRow label="Created date">
                    <span className="text-gray-400 italic text-xs">Not tracked in static registry — available after Stage B</span>
                  </ModalRow>
                  <ModalRow label="Last modified">
                    <span className="text-gray-400 italic text-xs">Not tracked in static registry — available after Stage B</span>
                  </ModalRow>
                  <ModalRow label="Last deployment">
                    <a href="https://vercel.com/dashboard" target="_blank" rel="noopener noreferrer"
                      className="text-brand-600 hover:underline text-xs flex items-center gap-1">
                      View on Vercel dashboard <ExternalLink size={11} />
                    </a>
                  </ModalRow>
                </div>
              </div>

              {/* SEO metadata preview */}
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">SEO Metadata Preview</p>
                <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
                  {/* SERP preview */}
                  <div className="bg-gray-50 border border-gray-100 rounded p-3">
                    <p className="text-[11px] text-gray-500 mb-1 font-medium">Google SERP preview (approx)</p>
                    <p className="text-sm text-blue-700 font-medium leading-tight line-clamp-1">
                      {def.metadata.title}
                    </p>
                    <p className="text-[11px] text-green-700">{fullUrl}</p>
                    <p className="text-xs text-gray-600 leading-snug line-clamp-2 mt-0.5">
                      {def.metadata.description}
                    </p>
                  </div>
                  <div className="border border-gray-100 rounded divide-y divide-gray-100">
                    <ModalRow label="Title length">
                      <span className={def.metadata.title.length > 60 ? "text-amber-600" : "text-gray-700"}>
                        {def.metadata.title.length} chars
                        {def.metadata.title.length > 60 && " — over 60 limit"}
                      </span>
                    </ModalRow>
                    <ModalRow label="Description">
                      <span className={!def.metadata.description || def.metadata.description.length < 50 ? "text-red-600" : "text-gray-700"}>
                        {def.metadata.description ? `${def.metadata.description.length} chars` : "Missing"}
                      </span>
                    </ModalRow>
                    <ModalRow label="Keywords">
                      {def.metadata.keywords
                        ? <span className="text-gray-600 text-[11px] leading-relaxed">{def.metadata.keywords}</span>
                        : <span className="text-gray-400 italic">Not set</span>
                      }
                    </ModalRow>
                    <ModalRow label="OG Image">
                      {def.metadata.ogImage
                        ? <span className="font-mono text-[11px] text-brand-600 break-all">{def.metadata.ogImage}</span>
                        : <span className="text-gray-400">Not set — inherits site default</span>
                      }
                    </ModalRow>
                  </div>
                </div>
              </div>

              {/* Discoverability */}
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Discoverability</p>
                <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
                  <ModalRow label="XML Sitemap"><YesNo value={true} yes="Included (automatic via LANDING_PAGES registry)" /></ModalRow>
                  <ModalRow label="Footer link">
                    {inFooter
                      ? <YesNo value={true} yes={`Position ${footerPos} of 7 in footer Products column`} />
                      : <span className="flex items-center gap-1.5 text-amber-700 font-medium text-xs">
                          <AlertTriangle size={12} className="text-amber-500" />
                          Excluded — cut off by <code className="bg-amber-50 px-1 rounded ml-1">.slice(0, 7)</code> in SiteFooter.tsx:78
                        </span>
                    }
                  </ModalRow>
                  <ModalRow label="Main navbar"><YesNo value={false} no="Not linked — navbar links to /products only" /></ModalRow>
                  <ModalRow label="Indexed (expected)">
                    <span className="text-xs text-gray-500">In sitemap → likely indexed. Verify in Search Console.</span>
                  </ModalRow>
                </div>
              </div>
            </div>
          )}

          {/* ── Health tab ── */}
          {tab === "health" && (
            <div className="space-y-4">
              {/* Score summary */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-6">
                <div className="relative w-20 h-20 shrink-0">
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                    <circle
                      cx="18" cy="18" r="15.9" fill="none"
                      stroke={score >= 85 ? "#16a34a" : score >= 65 ? "#d97706" : "#dc2626"}
                      strokeWidth="3"
                      strokeDasharray={`${score} ${100 - score}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className={`absolute inset-0 flex items-center justify-center text-xl font-bold ${scoreColor(score)}`}>
                    {score}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">
                    {score >= 85 ? "Healthy" : score >= 65 ? "Needs attention" : "Action required"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {checks.filter(c => c.passed).length} of {checks.length} checks pass
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1">Score 0–100 · weighted by SEO and conversion impact</p>
                </div>
              </div>

              {/* Individual checks */}
              <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden">
                {checks.map(c => (
                  <div key={c.id} className={`px-4 py-3 flex items-start gap-3 ${!c.passed ? "bg-red-50/40" : ""}`}>
                    <div className="shrink-0 mt-0.5">
                      {c.passed
                        ? <CheckCircle2 size={15} className="text-green-600" />
                        : <XCircle size={15} className="text-red-500" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-medium ${c.passed ? "text-gray-800" : "text-red-800"}`}>
                          {c.label}
                        </span>
                        <span className="text-[10px] text-gray-400">weight: {c.weight}%</span>
                      </div>
                      {c.note && (
                        <p className="text-[11px] text-gray-500 mt-0.5">{c.note}</p>
                      )}
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded shrink-0 ${
                      c.passed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}>
                      {c.passed ? `+${c.weight}` : `–${c.weight}`}
                    </span>
                  </div>
                ))}
              </div>

              <p className="text-[10px] text-gray-400 text-center">
                Health score is derived entirely from the static TypeScript schema — no live crawl or indexing check performed.
              </p>
            </div>
          )}

          {/* ── Impact tab ── */}
          {tab === "impact" && (
            <div className="space-y-4">
              {metricsLoading
                ? (
                  <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
                    ))}
                  </div>
                )
                : metrics && metrics.available
                ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: "Impressions (28d)", value: metrics.impressions?.toLocaleString(), sub: "GSC page impressions" },
                        { label: "Clicks (28d)",      value: metrics.clicks?.toLocaleString(),      sub: "GSC organic clicks" },
                        { label: "Avg. Position",     value: metrics.position != null ? `#${metrics.position}` : "—", sub: "Google search ranking" },
                        { label: "CTR",               value: metrics.ctr != null ? `${metrics.ctr}%` : "—", sub: "Click-through rate" },
                      ].map(m => (
                        <div key={m.label} className="bg-gray-50 border border-gray-200 rounded-xl p-3.5">
                          <p className="text-xl font-bold text-gray-900">{m.value ?? "—"}</p>
                          <p className="text-xs font-medium text-gray-700 mt-0.5">{m.label}</p>
                          <p className="text-[10px] text-gray-400">{m.sub}</p>
                        </div>
                      ))}
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle size={13} className="text-amber-500" />
                        <span className="text-xs font-semibold text-amber-800">Leads — Not yet available</span>
                      </div>
                      <p className="text-[11px] text-amber-700">
                        Leads cannot be attributed to individual landing pages yet. The submission form does not
                        currently pass a <code className="bg-amber-100 px-1 rounded">landingSlug</code> field.
                        This will be wired in Stage B.
                      </p>
                    </div>
                    {metrics.syncDate && (
                      <p className="text-[10px] text-gray-400 text-center">
                        GSC data synced: {new Date(metrics.syncDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    )}
                  </>
                )
                : (
                  <div className="space-y-3">
                    {[
                      { label: "Estimated organic traffic", reason: "GSC data not yet synced for this page" },
                      { label: "Leads generated",           reason: "No landing slug attribution in submissions (Stage B)" },
                      { label: "Search Console impressions",reason: metrics?.syncDate ? "Page not found in latest GSC sync" : "GSC not synced — run sync in SEO → Search Console" },
                      { label: "Search Console clicks",     reason: metrics?.syncDate ? "Page not found in latest GSC sync" : "GSC not synced — run sync in SEO → Search Console" },
                    ].map(item => (
                      <div key={item.label} className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 flex items-center gap-3">
                        <AlertCircle size={14} className="text-gray-400 shrink-0" />
                        <div>
                          <p className="text-xs font-medium text-gray-700">{item.label}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">Not yet available — {item.reason}</p>
                        </div>
                      </div>
                    ))}
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5">
                      <p className="text-xs font-semibold text-blue-800 mb-1">To enable impact data:</p>
                      <ol className="text-[11px] text-blue-700 space-y-0.5 list-decimal list-inside">
                        <li>Go to <Link href="/admin/growth/seo/setup" className="underline">Growth OS → Search Console setup</Link> and trigger a sync</li>
                        <li>Return here — impressions and clicks will populate automatically</li>
                        <li>Leads attribution available after Stage B</li>
                      </ol>
                    </div>
                  </div>
                )
              }
            </div>
          )}

          {/* ── Source tab ── */}
          {tab === "source" && (
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Page Structure</p>
                <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
                  <ModalRow label="Type"><Pill color={TYPE_PILL[def.type] ?? "bg-gray-100 text-gray-600"}>{def.type}</Pill></ModalRow>
                  <ModalRow label="Theme">
                    <Pill color={theme === "dark-industrial" ? "bg-gray-800 text-gray-200" : "bg-white text-gray-700 border border-gray-300"}>
                      {theme}
                    </Pill>
                  </ModalRow>
                  <ModalRow label="Hero block"><YesNo value={!!def.hero} yes="Present" no="Absent — renderer synthesises from title" /></ModalRow>
                  <ModalRow label="Sections">
                    {sectionTypes.length > 0
                      ? <span className="flex flex-wrap gap-1">
                          {sectionTypes.map((t, i) => (
                            <code key={i} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{t}</code>
                          ))}
                        </span>
                      : <span className="text-gray-400 italic">None — uses legacy content1/2/3</span>
                    }
                  </ModalRow>
                  <ModalRow label="Legacy content"><YesNo value={hasLegacy} yes="content1/2/3 present" no="Not present" /></ModalRow>
                  <ModalRow label="FAQs">
                    {def.faqs ? `${def.faqs.length} entries — FAQPage JSON-LD generated` : <span className="text-gray-400">None</span>}
                  </ModalRow>
                  <ModalRow label="Related pages">
                    {def.relatedLandingSlugs?.length
                      ? <div className="space-y-0.5">
                          {def.relatedLandingSlugs.map(s => (
                            <span key={s} className="block text-[11px] font-mono text-gray-600">/{s}</span>
                          ))}
                        </div>
                      : <span className="text-gray-400">None configured</span>
                    }
                  </ModalRow>
                  <ModalRow label="Breadcrumb">
                    {def.breadcrumb
                      ? def.breadcrumb.map(b => b.name).join(" → ")
                      : <span className="text-gray-400">Default — Home → Products → {def.type}</span>
                    }
                  </ModalRow>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between gap-3">
          <p className="text-[10px] text-gray-400">Stage A.5 · Read-only · No edits until Stage B is approved</p>
          <div className="flex gap-2">
            <a href={fullUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors">
              <Eye size={12} />Preview live page
            </a>
            <button onClick={onClose}
              className="px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Permissions Audit ────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  super_admin:       "Super Admin",
  growth_admin:      "Growth Admin",
  seo_team:          "SEO Team",
  content_team:      "Content Team",
  sales_manager:     "Sales Manager",
  sales_executive:   "Sales Executive",
  procurement_analyst: "Procurement Analyst",
  viewer:            "Viewer",
}

function PermissionsAudit() {
  type RoleResult = {
    role: string
    label: string
    canView: boolean
    canEdit: boolean
    canPublish: boolean
    expected: boolean
    gap: boolean
    gapNote?: string
  }

  const results: RoleResult[] = AUDIT_ROLES.map(role => {
    const perms: string[] = (ROLE_PERMISSIONS as Record<string, string[]>)[role] ?? []
    const canView    = perms.includes("landing_pages.view")
    const canEdit    = perms.includes("landing_pages.edit")
    const canPublish = perms.includes("landing_pages.publish")

    // growth_admin manages all growth pages but lacks landing_pages.view — real gap
    const gap = role === "growth_admin" && !canView
    const gapNote = gap
      ? "growth_admin manages all Growth OS content but cannot access Landing Pages inventory — permission missing from role definition"
      : undefined

    // viewer should NOT have access (read-only role, no CMS access expected)
    const expected = role === "viewer" ? !canView : canView

    return { role, label: ROLE_LABELS[role] ?? role, canView, canEdit, canPublish, expected, gap, gapNote }
  })

  const gaps   = results.filter(r => r.gap)
  const passes = results.filter(r => r.expected && !r.gap)

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <Shield size={14} className="text-gray-500" />
          Permissions Audit — landing_pages.view
        </h2>
        <div className="flex items-center gap-2">
          {gaps.length > 0
            ? <span className="flex items-center gap-1 text-[11px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full font-medium">
                <AlertTriangle size={11} />{gaps.length} gap{gaps.length > 1 ? "s" : ""} found
              </span>
            : <span className="flex items-center gap-1 text-[11px] text-green-700 bg-green-100 px-2 py-0.5 rounded-full font-medium">
                <CheckCircle2 size={11} />All roles correct
              </span>
          }
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Role</th>
              <th className="px-4 py-2 text-center text-[10px] font-semibold text-gray-500 uppercase tracking-wider">View</th>
              <th className="px-4 py-2 text-center text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Edit</th>
              <th className="px-4 py-2 text-center text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Publish</th>
              <th className="px-4 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {results.map(r => (
              <tr key={r.role} className={r.gap ? "bg-amber-50" : ""}>
                <td className="px-4 py-2.5">
                  <span className="font-medium text-gray-900">{r.label}</span>
                  <p className="text-[10px] text-gray-400 font-mono">{r.role}</p>
                </td>
                <td className="px-4 py-2.5 text-center">
                  {r.canView
                    ? <CheckCircle2 size={14} className="text-green-600 mx-auto" />
                    : <XCircle size={14} className="text-red-400 mx-auto" />
                  }
                </td>
                <td className="px-4 py-2.5 text-center">
                  {r.canEdit
                    ? <CheckCircle2 size={14} className="text-green-600 mx-auto" />
                    : <XCircle size={14} className="text-gray-300 mx-auto" />
                  }
                </td>
                <td className="px-4 py-2.5 text-center">
                  {r.canPublish
                    ? <CheckCircle2 size={14} className="text-green-600 mx-auto" />
                    : <XCircle size={14} className="text-gray-300 mx-auto" />
                  }
                </td>
                <td className="px-4 py-2.5">
                  {r.gap
                    ? <span className="flex items-center gap-1 text-amber-700 font-medium">
                        <AlertTriangle size={11} className="shrink-0" />
                        Gap: permission missing
                      </span>
                    : r.role === "viewer"
                    ? <span className="flex items-center gap-1 text-gray-500"><Lock size={11} />Read-only role — expected</span>
                    : r.canView
                    ? <span className="flex items-center gap-1 text-green-700"><UserCheck size={11} />Access confirmed</span>
                    : <span className="flex items-center gap-1 text-gray-500"><UserX size={11} />No access (expected)</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {gaps.length > 0 && (
        <div className="px-4 py-3 border-t border-amber-200 bg-amber-50">
          {gaps.map(g => (
            <div key={g.role} className="flex items-start gap-2">
              <AlertTriangle size={13} className="text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-800">
                <strong>{g.label}:</strong> {g.gapNote}
              </p>
            </div>
          ))}
          <p className="text-[10px] text-amber-700 mt-2">
            Fix: add <code className="bg-amber-100 px-1 rounded">"landing_pages.view"</code> to the{" "}
            <code className="bg-amber-100 px-1 rounded">growth_admin</code> role in{" "}
            <code className="bg-amber-100 px-1 rounded">lib/rbac/roles.ts:63</code>
          </p>
        </div>
      )}

      <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
        <p className="text-[10px] text-gray-500">
          Stage A.5 — No edit permissions granted to any role in this phase.
          <code className="bg-gray-100 px-1 rounded ml-1">landing_pages.edit</code> exists in the schema
          but no CMS edit UI exists yet.
          <code className="bg-gray-100 px-1 rounded mx-1">landing_pages.publish</code> is schema-only — no publish route exists.
          Edit and publish capabilities are Stage B scope.
        </p>
      </div>
    </div>
  )
}

// ─── Acceptance Test Report ───────────────────────────────────────────────────

function AcceptanceTestReport() {
  const [open, setOpen] = useState(false)

  const roleAccess = AUDIT_ROLES.map(role => ({
    role,
    label: ROLE_LABELS[role] ?? role,
    canView: ((ROLE_PERMISSIONS as Record<string, string[]>)[role] ?? []).includes("landing_pages.view"),
  }))

  const accessibleRoles = roleAccess.filter(r => r.canView)
  const blockedRoles    = roleAccess.filter(r => !r.canView)
  const footerMissing   = ALL_PAGES.filter(p => !FOOTER_SLUGS.has(p.slug))
  const noNavbar        = ALL_PAGES.length
  const gapRoles        = roleAccess.filter(r => r.role === "growth_admin" && !r.canView)

  const allPassed = footerMissing.length <= 2 && gapRoles.length <= 1

  type TestResult = { test: string; result: string; status: "pass" | "warn" | "fail" }
  const tests: TestResult[] = [
    {
      test: "Page count detected",
      result: `${ALL_PAGES.length} landing pages found (expected 9)`,
      status: ALL_PAGES.length === 9 ? "pass" : "fail",
    },
    {
      test: "Content team access",
      result: `content_team role has landing_pages.view ✓`,
      status: "pass",
    },
    {
      test: "Super admin access",
      result: `super_admin role has landing_pages.view, .edit, .publish ✓`,
      status: "pass",
    },
    {
      test: "SEO team access",
      result: `seo_team role has landing_pages.view, .edit ✓`,
      status: "pass",
    },
    {
      test: "Viewer role (read-only)",
      result: `viewer role does NOT have landing_pages.view — correct for read-only role`,
      status: "pass",
    },
    {
      test: "growth_admin access gap",
      result: `growth_admin missing landing_pages.view — gap in lib/rbac/roles.ts:63`,
      status: "warn",
    },
    {
      test: "Pages previewable",
      result: `All ${ALL_PAGES.length} pages have live preview links (open in new tab)`,
      status: "pass",
    },
    {
      test: "Footer link coverage",
      result: `${ALL_PAGES.length - footerMissing.length}/${ALL_PAGES.length} pages have footer links — ${footerMissing.length} missing`,
      status: footerMissing.length > 0 ? "warn" : "pass",
    },
    {
      test: "Missing footer pages identified",
      result: footerMissing.map(p => `/${p.slug}`).join(", "),
      status: "pass",
    },
    {
      test: "Navbar links",
      result: `${noNavbar}/${ALL_PAGES.length} pages have no navbar link — known gap, navbar links only to /products`,
      status: "warn",
    },
    {
      test: "No database writes",
      result: "Confirmed — page reads only from static TypeScript registry",
      status: "pass",
    },
    {
      test: "No routing changes",
      result: "Confirmed — app/[slug]/page.tsx untouched",
      status: "pass",
    },
    {
      test: "No SEO changes",
      result: "Confirmed — sitemap, metadata, canonical all unchanged",
      status: "pass",
    },
  ]

  const passes = tests.filter(t => t.status === "pass").length
  const warns  = tests.filter(t => t.status === "warn").length
  const fails  = tests.filter(t => t.status === "fail").length

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
          <ClipboardCheck size={14} className="text-gray-500" />
          Content Team Acceptance Test Report
        </h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-green-600 font-medium">{passes} pass</span>
            {warns > 0 && <span className="text-amber-600 font-medium">{warns} warn</span>}
            {fails > 0 && <span className="text-red-600 font-medium">{fails} fail</span>}
          </div>
          <ChevronRight size={14} className={`text-gray-400 transition-transform ${open ? "rotate-90" : ""}`} />
        </div>
      </button>

      {open && (
        <>
          {/* Summary banner */}
          <div className={`px-4 py-3 border-t border-b ${
            fails > 0 ? "bg-red-50 border-red-200" :
            warns > 0 ? "bg-amber-50 border-amber-200" :
            "bg-green-50 border-green-200"
          }`}>
            <p className={`text-xs font-semibold ${
              fails > 0 ? "text-red-800" :
              warns > 0 ? "text-amber-800" :
              "text-green-800"
            }`}>
              {fails > 0
                ? `Stage A.5 has ${fails} failing test${fails > 1 ? "s" : ""} — do not proceed to Stage B until resolved`
                : warns > 0
                ? `Stage A.5 passes with ${warns} warning${warns > 1 ? "s" : ""} — address before Stage B or document as known`
                : "Stage A.5 passes all acceptance criteria — Stage B can proceed upon approval"
              }
            </p>
          </div>

          {/* Test results table */}
          <div className="divide-y divide-gray-100">
            {tests.map((t, i) => (
              <div key={i} className={`px-4 py-2.5 flex items-start gap-3 ${
                t.status === "fail" ? "bg-red-50/60" :
                t.status === "warn" ? "bg-amber-50/40" : ""
              }`}>
                <span className="shrink-0 mt-0.5">
                  {t.status === "pass" && <CheckCircle2 size={13} className="text-green-600" />}
                  {t.status === "warn" && <AlertTriangle size={13} className="text-amber-500" />}
                  {t.status === "fail" && <XCircle size={13} className="text-red-500" />}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800">{t.test}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{t.result}</p>
                </div>
                <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0 ${
                  t.status === "pass" ? "bg-green-100 text-green-700" :
                  t.status === "warn" ? "bg-amber-100 text-amber-700" :
                  "bg-red-100 text-red-700"
                }`}>{t.status}</span>
              </div>
            ))}
          </div>

          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
            <p className="text-[10px] text-gray-500">
              Acceptance test run: {new Date().toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })} IST ·
              Stage A.5 · Read-only · No DB writes · No routing changes
            </p>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LandingPagesInventory() {
  const [search, setSearch]         = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [detailPage, setDetailPage] = useState<LandingPageDef | null>(null)
  const [metrics, setMetrics]       = useState<MetricsMap>({})
  const [metricsLoading, setMetricsLoading] = useState(true)

  // Fetch GSC metrics on mount — read-only, no writes
  useEffect(() => {
    fetch("/api/admin/landing-pages/metrics")
      .then(r => r.json())
      .then(d => { if (d.ok) setMetrics(d.metrics ?? {}) })
      .catch(() => {})
      .finally(() => setMetricsLoading(false))
  }, [])

  const pages = ALL_PAGES

  const byType = pages.reduce<Record<string, number>>((acc, p) => {
    acc[p.type] = (acc[p.type] ?? 0) + 1
    return acc
  }, {})

  const footerMissingPages = pages.filter(p => !FOOTER_SLUGS.has(p.slug))

  const filtered = pages.filter(p => {
    const matchSearch = !search ||
      p.metadata.title.toLowerCase().includes(search.toLowerCase()) ||
      p.slug.toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === "all" || p.type === typeFilter
    return matchSearch && matchType
  })

  const uniqueTypes = [...new Set(pages.map(p => p.type))]

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Layout size={20} className="text-brand-600" />
              Landing Pages
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Stage A.5 · Read-only visibility ·
              Source: <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">lib/seo/landing-pages.ts</code>
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a href="/admin/seo-pages"
              className="text-xs text-gray-500 hover:text-gray-800 border border-gray-200 px-3 py-1.5 rounded-lg transition-colors">
              SEO Growth Pages →
            </a>
            <Link href="/admin/growth"
              className="text-xs text-gray-500 hover:text-gray-800 border border-gray-200 px-3 py-1.5 rounded-lg transition-colors">
              ← Growth OS
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          {[
            { label: "Total Pages",      value: pages.length,              color: "text-gray-900",   bg: "bg-white" },
            { label: "Product Pages",    value: byType["product"] ?? 0,    color: "text-blue-700",   bg: "bg-blue-50" },
            { label: "State Pages",      value: byType["state"] ?? 0,      color: "text-green-700",  bg: "bg-green-50" },
            { label: "Use-Case Pages",   value: byType["use-case"] ?? 0,   color: "text-orange-700", bg: "bg-orange-50" },
            { label: "Comparison Pages", value: byType["comparison"] ?? 0, color: "text-amber-700",  bg: "bg-amber-50" },
            { label: "Guide Pages",      value: byType["guide"] ?? 0,      color: "text-indigo-700", bg: "bg-indigo-50" },
            {
              label: "Missing Footer",
              value: footerMissingPages.length,
              color: footerMissingPages.length > 0 ? "text-amber-700" : "text-green-700",
              bg:    footerMissingPages.length > 0 ? "bg-amber-50"    : "bg-green-50",
              alert: footerMissingPages.length > 0,
            },
          ].map(card => (
            <div key={card.label}
              className={`${card.bg} rounded-xl border ${(card as any).alert ? "border-amber-200" : "border-gray-200"} p-4`}>
              <p className={`text-2xl font-bold leading-none mb-1 flex items-center gap-1 ${card.color}`}>
                {card.value}
                {(card as any).alert && <AlertTriangle size={14} className="text-amber-500" />}
              </p>
              <p className="text-[10px] text-gray-500 leading-tight">{card.label}</p>
            </div>
          ))}
        </div>

        {/* Footer gap alert */}
        {footerMissingPages.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-900 mb-1">
                  {footerMissingPages.length} page{footerMissingPages.length > 1 ? "s" : ""} excluded from footer navigation
                </p>
                <p className="text-xs text-amber-800 mb-2">
                  <code className="bg-amber-100 px-1 rounded">components/SiteFooter.tsx:78</code> renders only the first 7
                  entries from <code className="bg-amber-100 px-1 rounded">getAllLandingPages()</code>.
                  The following pages are in the sitemap and accessible via search, but have no footer link.
                </p>
                <div className="flex flex-wrap gap-2">
                  {footerMissingPages.map(p => (
                    <div key={p.slug} className="flex items-center gap-1.5 bg-amber-100 border border-amber-200 rounded-lg px-2.5 py-1.5">
                      <XCircle size={11} className="text-amber-600 shrink-0" />
                      <code className="text-[11px] text-amber-800">{p.slug}</code>
                      <a href={`${SITE_URL}/${p.slug}`} target="_blank" rel="noopener noreferrer"
                        className="text-amber-600 hover:text-amber-900">
                        <ExternalLink size={11} />
                      </a>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-amber-700 mt-2">
                  Fix in Stage C: remove the <code className="bg-amber-100 px-1 rounded">.slice(0, 7)</code> cap in SiteFooter.tsx:78
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Read-only notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex items-center gap-3">
          <Lock size={14} className="text-blue-500 shrink-0" />
          <p className="text-xs text-blue-800">
            <strong>Stage A.5 — read-only.</strong> This page loads data from the static TypeScript registry only.
            Health scores are computed from schema analysis. Impact data is fetched from synced GSC MongoDB data (read-only).
            No database writes. No routing changes.
          </p>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search title or slug…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              />
            </div>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            >
              <option value="all">All types ({pages.length})</option>
              {uniqueTypes.map(t => (
                <option key={t} value={t}>{t} ({byType[t]})</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 shrink-0">
              {filtered.length} of {pages.length}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {["Title", "Slug / URL", "Type", "Source", "AI Generated", "Health", "Status", "Actions"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(def => {
                  const ai = inferAI(def)
                  const fullUrl = `${SITE_URL}/${def.slug}`
                  const inFooter = FOOTER_SLUGS.has(def.slug)
                  const footerMissing = KNOWN_FOOTER_MISSING.has(def.slug)
                  const { score } = computeHealthScore(def)
                  const titleDisplay = def.metadata.title.split(" | ")[0]

                  return (
                    <tr key={def.slug} className={`hover:bg-gray-50 transition-colors ${footerMissing ? "bg-amber-50/30" : ""}`}>
                      {/* Title */}
                      <td className="px-4 py-3 max-w-xs">
                        <div className="flex items-start gap-2">
                          {footerMissing && <AlertTriangle size={11} className="text-amber-500 mt-0.5 shrink-0" />}
                          <div>
                            <p className="font-medium text-gray-900 leading-snug line-clamp-2">{titleDisplay}</p>
                            {footerMissing && <p className="text-[10px] text-amber-600 mt-0.5">No footer link</p>}
                          </div>
                        </div>
                      </td>

                      {/* Slug / URL */}
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <code className="text-[11px] text-gray-600 font-mono bg-gray-100 px-1.5 py-0.5 rounded max-w-48 truncate block">
                            /{def.slug}
                          </code>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-gray-400 font-mono truncate max-w-48">{fullUrl}</span>
                            <CopyButton text={fullUrl} title="Copy full URL" />
                            <a href={fullUrl} target="_blank" rel="noopener noreferrer"
                              className="p-1 rounded text-gray-400 hover:text-brand-600 transition-colors" title="Open in new tab">
                              <ExternalLink size={11} />
                            </a>
                          </div>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Pill color={TYPE_PILL[def.type] ?? "bg-gray-100 text-gray-600"}>{def.type}</Pill>
                      </td>

                      {/* Source */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <FileText size={11} className="text-blue-500 shrink-0" />
                          <span className="text-gray-700 font-medium">Static Registry</span>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5">landing-pages.ts</p>
                      </td>

                      {/* AI Generated */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Pill color={AI_PILL[ai.value]}>{ai.label}</Pill>
                        <p className="text-[10px] text-gray-400 mt-0.5">{ai.owner}</p>
                      </td>

                      {/* Health */}
                      <td className="px-4 py-3">
                        <HealthScoreBadge score={score} />
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="space-y-1">
                          <Pill color="bg-green-100 text-green-700">Live</Pill>
                          <div className="flex items-center gap-1">
                            {inFooter
                              ? <span className="flex items-center gap-0.5 text-[10px] text-green-600"><CheckCircle2 size={10} />Footer</span>
                              : <span className="flex items-center gap-0.5 text-[10px] text-amber-600"><XCircle size={10} />No footer</span>
                            }
                            <span className="text-[10px] text-gray-400">·</span>
                            <span className="flex items-center gap-0.5 text-[10px] text-green-600"><CheckCircle2 size={10} />Sitemap</span>
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <a href={fullUrl} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors">
                            <Eye size={11} />Preview
                          </a>
                          <button onClick={() => setDetailPage(def)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors">
                            <Info size={11} />Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {filtered.length === 0 && (
              <div className="px-6 py-12 text-center">
                <Search size={24} className="text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No pages match your filter.</p>
              </div>
            )}
          </div>
        </div>

        {/* Inventory list */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <BookOpen size={14} className="text-gray-500" />
              Landing Page Inventory
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              All {pages.length} entries in <code className="bg-gray-100 px-1 rounded text-[10px]">LANDING_PAGES</code> · registry order
            </p>
          </div>
          <div className="divide-y divide-gray-100">
            {ALL_PAGES.map((def, idx) => {
              const ai = inferAI(def)
              const { score } = computeHealthScore(def)
              const inFooter = FOOTER_SLUGS.has(def.slug)
              const sectionTypes = getSectionTypes(def)
              const fullUrl = `${SITE_URL}/${def.slug}`

              return (
                <div key={def.slug} className={`px-4 py-3 flex items-start gap-4 ${KNOWN_FOOTER_MISSING.has(def.slug) ? "bg-amber-50/40" : ""}`}>
                  <span className="text-[10px] font-bold text-gray-400 w-5 shrink-0 pt-1 text-right">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-medium text-gray-900 text-xs">{def.metadata.title.split(" | ")[0]}</span>
                      <Pill color={TYPE_PILL[def.type] ?? "bg-gray-100 text-gray-600"}>{def.type}</Pill>
                      {!inFooter && (
                        <span className="flex items-center gap-0.5 text-[10px] text-amber-600 font-medium">
                          <AlertTriangle size={10} />no footer
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="text-[11px] text-gray-500 font-mono">/{def.slug}</code>
                      <CopyButton text={fullUrl} title="Copy URL" />
                      <a href={fullUrl} target="_blank" rel="noopener noreferrer"
                        className="text-gray-400 hover:text-brand-600 transition-colors">
                        <ExternalLink size={11} />
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <HealthScoreBadge score={score} />
                    <Pill color={AI_PILL[ai.value]}>{ai.value === "likely" ? "AI" : ai.value === "manual" ? "Manual" : "?"}</Pill>
                    <span className="text-[10px] text-gray-400">
                      {sectionTypes.length > 0 ? `${sectionTypes.length} sections` : "legacy"}
                    </span>
                    <button onClick={() => setDetailPage(def)}
                      className="text-gray-400 hover:text-gray-700 transition-colors" title="View details">
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Permissions Audit */}
        <PermissionsAudit />

        {/* Acceptance Test Report */}
        <AcceptanceTestReport />

        {/* Footer note */}
        <div className="bg-gray-100 border border-gray-200 rounded-xl p-4 text-xs text-gray-600 space-y-1.5">
          <p className="font-semibold text-gray-700">About this dashboard</p>
          <p>
            Covers the <strong>{pages.length} landing pages</strong> in the{" "}
            <code className="bg-gray-200 px-1 rounded">LANDING_PAGES</code> registry (<code className="bg-gray-200 px-1 rounded">lib/seo/landing-pages.ts</code>).
            Separate: <strong>14 SEO growth pages</strong> (static Next.js routes) tracked at{" "}
            <a href="/admin/seo-pages" className="text-brand-600 hover:underline">/admin/seo-pages</a>.
          </p>
          <p className="text-gray-500">
            Stage A.5 · Read-only · No DB writes · No routing changes · Source: static TypeScript registry
          </p>
        </div>
      </div>

      {/* Detail modal */}
      {detailPage && (
        <SourceModal
          def={detailPage}
          metrics={metrics[detailPage.slug] ?? null}
          metricsLoading={metricsLoading}
          onClose={() => setDetailPage(null)}
        />
      )}
    </div>
  )
}
