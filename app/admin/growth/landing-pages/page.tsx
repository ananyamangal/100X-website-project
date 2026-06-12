"use client"

import { useState } from "react"
import {
  ExternalLink, Copy, Check, Info, AlertTriangle,
  Globe, FileText, X, Tag, Hash, CheckCircle2,
  XCircle, Layout, List, Eye, BookOpen, Search,
  MapPin, ChevronRight,
} from "lucide-react"
import Link from "next/link"
import { getAllLandingPages, getLandingTheme, type LandingPageDef } from "@/lib/seo/landing-pages"

// ─── Constants ────────────────────────────────────────────────────────────────

const SITE_URL = "https://www.100xcircle.com"

// SiteFooter.tsx renders: getAllLandingPages().slice(0, 7)
// Any page at index ≥ 7 has no footer link.
const ALL_PAGES = getAllLandingPages()
const FOOTER_SLUGS = new Set(ALL_PAGES.slice(0, 7).map(p => p.slug))

// These two are specifically known to be cut off by the slice(0,7) cap
const KNOWN_FOOTER_MISSING = new Set([
  "fogging-machine-buying-guide",
  "thermal-fogging-machine-with-stainless-steel-tank-100xssma20",
])

// ─── Type helpers ─────────────────────────────────────────────────────────────

type AIInference = "likely" | "manual" | "unknown"

function inferAI(def: LandingPageDef): { value: AIInference; label: string; note: string } {
  if (def.sections && def.sections.length > 0) {
    return {
      value: "likely",
      label: "Likely — AI agent",
      note: "Structured sections array present — characteristic of agent-generated pages. No explicit flag in schema.",
    }
  }
  if (def.content1 || def.content2 || def.content3) {
    return {
      value: "manual",
      label: "Manual — legacy",
      note: "Uses legacy content1/2/3 fields (pre-sections system). Likely hand-authored before the section renderer was built.",
    }
  }
  return { value: "unknown", label: "Unknown", note: "Cannot determine from schema alone." }
}

function getSectionTypes(def: LandingPageDef): string[] {
  if (!def.sections) return []
  return def.sections.map(s => s.kind)
}

// ─── Styling maps ─────────────────────────────────────────────────────────────

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

// ─── Sub-components ───────────────────────────────────────────────────────────

function CopyButton({ text, title = "Copy URL" }: { text: string; title?: string }) {
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
      {copied
        ? <Check size={13} className="text-green-600" />
        : <Copy size={13} />
      }
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

// ─── Source Details Modal ─────────────────────────────────────────────────────

function SourceModal({ def, onClose }: { def: LandingPageDef; onClose: () => void }) {
  const ai = inferAI(def)
  const theme = getLandingTheme(def)
  const fullUrl = `${SITE_URL}/${def.slug}`
  const inFooter = FOOTER_SLUGS.has(def.slug)
  const footerPos = inFooter
    ? ALL_PAGES.findIndex(p => p.slug === def.slug) + 1
    : null
  const sectionTypes = getSectionTypes(def)
  const hasLegacyContent = !!(def.content1 || def.content2 || def.content3)

  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex gap-3 py-2.5 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-500 w-36 shrink-0 pt-0.5">{label}</span>
      <span className="text-xs text-gray-900 flex-1">{children}</span>
    </div>
  )

  const YesNo = ({ value, yes = "Yes", no = "No" }: { value: boolean; yes?: string; no?: string }) => (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${value ? "text-green-700" : "text-red-600"}`}>
      {value
        ? <CheckCircle2 size={12} className="text-green-600" />
        : <XCircle size={12} className="text-red-500" />
      }
      {value ? yes : no}
    </span>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-bold text-gray-900 text-base leading-tight">
              {def.metadata.title.split(" | ")[0]}
            </h2>
            <p className="text-xs text-gray-500 mt-1 font-mono">{def.slug}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-5">

          {/* URL section */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Full URL</p>
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 flex items-center gap-2">
              <Globe size={13} className="text-gray-400 shrink-0" />
              <span className="text-xs text-gray-800 font-mono flex-1 break-all">{fullUrl}</span>
              <CopyButton text={fullUrl} title="Copy full URL" />
              <a
                href={fullUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 rounded text-gray-400 hover:text-brand-600 transition-colors"
                title="Open in new tab"
              >
                <ExternalLink size={13} />
              </a>
            </div>
          </div>

          {/* Source provenance */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Source & Provenance</p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 space-y-1.5">
              <Row label="Source">
                <span className="flex items-center gap-1.5">
                  <FileText size={12} className="text-blue-600" />
                  <span className="font-medium text-blue-800">Static Registry</span>
                </span>
              </Row>
              <Row label="File">
                <code className="text-[11px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                  lib/seo/landing-pages.ts
                </code>
              </Row>
              <Row label="AI Generated">
                <span>
                  <Pill color={AI_PILL[ai.value]}>{ai.label}</Pill>
                  <span className="text-gray-400 ml-2 text-[10px]">{ai.note}</span>
                </span>
              </Row>
              <Row label="Last Modified">
                <span className="text-gray-400 italic text-xs">
                  Not tracked — available after Stage B (CMS edit tracking)
                </span>
              </Row>
            </div>
          </div>

          {/* Page structure */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Page Structure</p>
            <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
              <Row label="Type"><Pill color={TYPE_PILL[def.type] ?? "bg-gray-100 text-gray-600"}>{def.type}</Pill></Row>
              <Row label="Theme">
                <Pill color={theme === "dark-industrial" ? "bg-gray-800 text-gray-200" : "bg-white text-gray-700 border border-gray-300"}>
                  {theme}
                </Pill>
              </Row>
              <Row label="Hero block"><YesNo value={!!def.hero} yes="Present" no="Absent (synthesised from title)" /></Row>
              <Row label="Sections">
                {sectionTypes.length > 0
                  ? <span className="flex flex-wrap gap-1">
                      {sectionTypes.map((t, i) => (
                        <code key={i} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                          {t}
                        </code>
                      ))}
                    </span>
                  : <span className="text-gray-400 italic">None — uses legacy content blocks</span>
                }
              </Row>
              <Row label="Legacy content"><YesNo value={hasLegacyContent} yes="content1/2/3 present" no="Not present" /></Row>
              <Row label="FAQs">
                {def.faqs ? `${def.faqs.length} entries` : <span className="text-gray-400">None</span>}
              </Row>
              <Row label="Related pages">
                {def.relatedLandingSlugs?.length
                  ? def.relatedLandingSlugs.map(s => (
                      <span key={s} className="block text-[11px] font-mono text-gray-600">/{s}</span>
                    ))
                  : <span className="text-gray-400">None</span>
                }
              </Row>
            </div>
          </div>

          {/* SEO metadata */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">SEO Metadata</p>
            <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
              <Row label="Title">
                <span className="leading-snug">{def.metadata.title}</span>
              </Row>
              <Row label="Description">
                <span className="leading-snug text-gray-700">{def.metadata.description}</span>
              </Row>
              <Row label="Keywords">
                {def.metadata.keywords
                  ? <span className="text-gray-600">{def.metadata.keywords}</span>
                  : <span className="text-gray-400">Not set</span>
                }
              </Row>
              <Row label="OG Image">
                {def.metadata.ogImage
                  ? <span className="font-mono text-[11px] text-brand-600">{def.metadata.ogImage}</span>
                  : <span className="text-gray-400">Not set — inherits site default</span>
                }
              </Row>
            </div>
          </div>

          {/* Discoverability */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Discoverability</p>
            <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">
              <Row label="XML Sitemap"><YesNo value={true} yes="Included (automatic)" /></Row>
              <Row label="Footer link">
                {inFooter
                  ? <YesNo value={true} yes={`Yes — position ${footerPos} of 7`} />
                  : <span className="flex items-center gap-1.5 text-amber-700 font-medium text-xs">
                      <AlertTriangle size={12} className="text-amber-500 shrink-0" />
                      No — cut off by footer slice(0, 7) cap
                    </span>
                }
              </Row>
              <Row label="Main navbar"><YesNo value={false} no="Not linked — navbar shows Products only" /></Row>
              <Row label="Internal links">
                {def.relatedLandingSlugs?.length
                  ? <YesNo value={true} yes={`${def.relatedLandingSlugs.length} related-landings cross-link`} />
                  : <span className="text-gray-400 text-xs">None configured</span>
                }
              </Row>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between gap-3">
          <p className="text-[10px] text-gray-400">
            Stage A — read-only view · Editing available in Stage B
          </p>
          <div className="flex items-center gap-2">
            <a
              href={fullUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
            >
              <Eye size={12} />
              Preview
            </a>
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LandingPagesInventory() {
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [detailPage, setDetailPage] = useState<LandingPageDef | null>(null)

  const pages = ALL_PAGES

  // Summary counts
  const byType = pages.reduce<Record<string, number>>((acc, p) => {
    acc[p.type] = (acc[p.type] ?? 0) + 1
    return acc
  }, {})

  const footerMissingPages = pages.filter(p => !FOOTER_SLUGS.has(p.slug))

  // Filtered view
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
              All registered landing pages · Source: <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">lib/seo/landing-pages.ts</code>
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href="/admin/seo-pages"
              className="text-xs text-gray-500 hover:text-gray-800 border border-gray-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              SEO Growth Pages →
            </a>
            <Link
              href="/admin/growth"
              className="text-xs text-gray-500 hover:text-gray-800 border border-gray-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              ← Growth OS
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {/* ── Summary Cards ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          {[
            { label: "Total Pages",       value: pages.length,             color: "text-gray-900",  bg: "bg-white" },
            { label: "Product Pages",     value: byType["product"] ?? 0,   color: "text-blue-700",  bg: "bg-blue-50" },
            { label: "State Pages",       value: byType["state"] ?? 0,     color: "text-green-700", bg: "bg-green-50" },
            { label: "Use-Case Pages",    value: byType["use-case"] ?? 0,  color: "text-orange-700",bg: "bg-orange-50" },
            { label: "Comparison Pages",  value: byType["comparison"] ?? 0,color: "text-amber-700", bg: "bg-amber-50" },
            { label: "Guide Pages",       value: byType["guide"] ?? 0,     color: "text-indigo-700",bg: "bg-indigo-50" },
            {
              label: "Missing Footer Links",
              value: footerMissingPages.length,
              color: footerMissingPages.length > 0 ? "text-amber-700" : "text-green-700",
              bg: footerMissingPages.length > 0 ? "bg-amber-50" : "bg-green-50",
              alert: footerMissingPages.length > 0,
            },
          ].map(card => (
            <div
              key={card.label}
              className={`${card.bg} rounded-xl border ${card.alert ? "border-amber-200" : "border-gray-200"} p-4`}
            >
              <p className={`text-2xl font-bold ${card.color} leading-none mb-1 flex items-center gap-1`}>
                {card.value}
                {card.alert && <AlertTriangle size={14} className="text-amber-500" />}
              </p>
              <p className="text-[10px] text-gray-500 leading-tight">{card.label}</p>
            </div>
          ))}
        </div>

        {/* ── Discoverability Alert ───────────────────────────────────────────── */}
        {footerMissingPages.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-900 mb-1">
                  {footerMissingPages.length} landing {footerMissingPages.length === 1 ? "page has" : "pages have"} no footer link
                </p>
                <p className="text-xs text-amber-800 mb-2">
                  <code className="bg-amber-100 px-1 rounded">components/SiteFooter.tsx</code> renders{" "}
                  <code className="bg-amber-100 px-1 rounded">getAllLandingPages().slice(0, 7)</code> — pages beyond
                  position 7 in the registry are silently excluded. These pages are in the sitemap and can be found
                  via search, but have no footer navigation entry.
                </p>
                <div className="flex flex-wrap gap-2">
                  {footerMissingPages.map(p => (
                    <div key={p.slug} className="flex items-center gap-1.5 bg-amber-100 border border-amber-200 rounded-lg px-2.5 py-1.5">
                      <XCircle size={11} className="text-amber-600 shrink-0" />
                      <code className="text-[11px] text-amber-800">{p.slug}</code>
                      <a
                        href={`${SITE_URL}/${p.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-amber-600 hover:text-amber-900"
                      >
                        <ExternalLink size={11} />
                      </a>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-amber-700 mt-2">
                  Fix: remove the <code className="bg-amber-100 px-1 rounded">.slice(0, 7)</code> cap in{" "}
                  <code className="bg-amber-100 px-1 rounded">components/SiteFooter.tsx:78</code> — scheduled for Stage C.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Read-Only Notice ────────────────────────────────────────────────── */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex items-center gap-3">
          <Info size={14} className="text-blue-500 shrink-0" />
          <p className="text-xs text-blue-800">
            <strong>Stage A — visibility only.</strong> This page is read-only. All data is sourced directly
            from the static TypeScript registry — no database reads or writes. Editing will be available in Stage B.
          </p>
        </div>

        {/* ── Landing Pages Table ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Table toolbar */}
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
              Showing {filtered.length} of {pages.length}
            </p>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {["Title", "Slug / URL", "Type", "Source", "AI Generated", "Sections", "Status", "Actions"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((def, idx) => {
                  const ai = inferAI(def)
                  const fullUrl = `${SITE_URL}/${def.slug}`
                  const inFooter = FOOTER_SLUGS.has(def.slug)
                  const footerMissing = KNOWN_FOOTER_MISSING.has(def.slug)
                  const sectionCount = def.sections?.length ?? 0
                  const titleDisplay = def.metadata.title.split(" | ")[0]

                  return (
                    <tr
                      key={def.slug}
                      className={`hover:bg-gray-50 transition-colors ${footerMissing ? "bg-amber-50/30" : ""}`}
                    >
                      {/* Title */}
                      <td className="px-4 py-3 max-w-xs">
                        <div className="flex items-start gap-2">
                          {footerMissing && (
                            <AlertTriangle size={12} className="text-amber-500 mt-0.5 shrink-0" title="Missing footer link" />
                          )}
                          <div>
                            <p className="font-medium text-gray-900 leading-snug line-clamp-2">{titleDisplay}</p>
                            {footerMissing && (
                              <p className="text-[10px] text-amber-600 mt-0.5">No footer link</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Slug / URL */}
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1">
                            <code className="text-[11px] text-gray-600 font-mono bg-gray-100 px-1.5 py-0.5 rounded max-w-48 truncate block">
                              /{def.slug}
                            </code>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-gray-400 font-mono truncate max-w-48">{fullUrl}</span>
                            <CopyButton text={fullUrl} />
                            <a
                              href={fullUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 rounded text-gray-400 hover:text-brand-600 transition-colors"
                              title="Open in new tab"
                            >
                              <ExternalLink size={11} />
                            </a>
                          </div>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Pill color={TYPE_PILL[def.type] ?? "bg-gray-100 text-gray-600"}>
                          {def.type}
                        </Pill>
                      </td>

                      {/* Source */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <FileText size={11} className="text-blue-500 shrink-0" />
                          <span className="text-gray-700 font-medium">Static Registry</span>
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5">landing-pages.ts</p>
                      </td>

                      {/* AI Generated */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Pill color={AI_PILL[ai.value]}>{ai.label}</Pill>
                      </td>

                      {/* Sections */}
                      <td className="px-4 py-3 text-center">
                        {sectionCount > 0
                          ? <span className="inline-flex items-center gap-1 text-gray-700">
                              <List size={11} />
                              {sectionCount}
                            </span>
                          : <span className="text-gray-400 text-[10px]">legacy</span>
                        }
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="space-y-1">
                          <Pill color="bg-green-100 text-green-700">Live</Pill>
                          <div className="flex items-center gap-1">
                            {inFooter
                              ? <span className="flex items-center gap-0.5 text-[10px] text-green-600">
                                  <CheckCircle2 size={10} />Footer
                                </span>
                              : <span className="flex items-center gap-0.5 text-[10px] text-amber-600">
                                  <XCircle size={10} />No footer
                                </span>
                            }
                            <span className="text-[10px] text-gray-400">·</span>
                            <span className="flex items-center gap-0.5 text-[10px] text-green-600">
                              <CheckCircle2 size={10} />Sitemap
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <a
                            href={fullUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
                          >
                            <Eye size={11} />
                            Preview
                          </a>
                          <button
                            onClick={() => setDetailPage(def)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors"
                          >
                            <Info size={11} />
                            Details
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

        {/* ── Inventory Reference ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <BookOpen size={14} className="text-gray-500" />
              Landing Page Inventory
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              All {pages.length} pages registered in <code className="bg-gray-100 px-1 rounded text-[10px]">LANDING_PAGES</code> · sorted by registry order
            </p>
          </div>
          <div className="divide-y divide-gray-100">
            {ALL_PAGES.map((def, idx) => {
              const ai = inferAI(def)
              const inFooter = FOOTER_SLUGS.has(def.slug)
              const sectionTypes = getSectionTypes(def)
              const fullUrl = `${SITE_URL}/${def.slug}`

              return (
                <div key={def.slug} className={`px-4 py-3 flex items-start gap-4 ${KNOWN_FOOTER_MISSING.has(def.slug) ? "bg-amber-50/40" : ""}`}>
                  <span className="text-[10px] font-bold text-gray-400 w-5 shrink-0 pt-1 text-right">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-medium text-gray-900 text-xs">
                        {def.metadata.title.split(" | ")[0]}
                      </span>
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
                  <div className="flex items-center gap-2 shrink-0">
                    <Pill color={AI_PILL[ai.value]}>{ai.value === "likely" ? "AI" : ai.value === "manual" ? "Manual" : "?"}</Pill>
                    <span className="text-[10px] text-gray-400">
                      {sectionTypes.length > 0 ? `${sectionTypes.length} sections` : "legacy blocks"}
                    </span>
                    <button
                      onClick={() => setDetailPage(def)}
                      className="text-gray-400 hover:text-gray-700 transition-colors"
                      title="View source details"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Footer note ─────────────────────────────────────────────────────── */}
        <div className="bg-gray-100 border border-gray-200 rounded-xl p-4 text-xs text-gray-600 space-y-1.5">
          <p className="font-semibold text-gray-700">About this dashboard</p>
          <p>
            This page covers the <strong>{pages.length} landing pages</strong> registered in the{" "}
            <code className="bg-gray-200 px-1 rounded">LANDING_PAGES</code> registry (<code className="bg-gray-200 px-1 rounded">lib/seo/landing-pages.ts</code>).
            These are routed by <code className="bg-gray-200 px-1 rounded">app/[slug]/page.tsx</code> and rendered by <code className="bg-gray-200 px-1 rounded">LandingRenderer</code>.
          </p>
          <p>
            Separate from this: <strong>14 SEO growth pages</strong> (static Next.js routes like <code className="bg-gray-200 px-1 rounded">/become-a-dealer</code>,{" "}
            <code className="bg-gray-200 px-1 rounded">/gem-oem-authorization</code>, etc.) are tracked at{" "}
            <a href="/admin/seo-pages" className="text-brand-600 hover:underline">/admin/seo-pages</a>.
          </p>
          <p className="text-gray-500">
            Stage A · Read-only · No database · No routing changes · Source: static TypeScript registry
          </p>
        </div>

      </div>

      {/* Source Details Modal */}
      {detailPage && (
        <SourceModal def={detailPage} onClose={() => setDetailPage(null)} />
      )}
    </div>
  )
}
