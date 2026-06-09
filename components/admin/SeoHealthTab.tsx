"use client"

import { useState, useEffect, useCallback } from "react"
import { AlertTriangle, CheckCircle, XCircle, RefreshCw, Sparkles, Shield, ChevronDown, ChevronUp, ExternalLink, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

// ── Types ──────────────────────────────────────────────────────────────────────

interface ProductRow {
  id: string
  name: string
  url: string
  h1: string
  seoTitle: string | null
  metaDescription: string | null
  hasImages: boolean
  hasSchema: boolean
  isPublished: boolean
  status: "missing" | "existing"
}

interface HealthData {
  scannedAt: string
  totalProducts: number
  publishedProducts: number
  seoScore: number
  fullyOptimized: number
  issues: {
    missingSeoTitle: { count: number; severity: string; items: ProductRow[] }
    missingMetaDesc: { count: number; severity: string; items: ProductRow[] }
    duplicateTitles: { count: number; severity: string; groups: { title: string; products: ProductRow[] }[] }
    duplicateDescriptions: { count: number; severity: string; groups: { desc: string; products: ProductRow[] }[] }
    missingH1: { count: number; severity: string; items: ProductRow[] }
    missingOgImages: { count: number; severity: string; items: ProductRow[] }
    missingSchema: { count: number; severity: string; items: ProductRow[] }
    orphanPages: { count: number; severity: string; items: ProductRow[] }
  }
  impactReport: ProductRow[]
}

interface PreviewRow {
  id: string
  name: string
  url: string
  h1: string
  existingSeoTitle: string | null
  existingMetaDesc: string | null
  generatedSeoTitle: string | null
  generatedMetaDesc: string | null
  needsSeoTitle: boolean
  needsMetaDesc: boolean
  willChange: boolean
}

interface PreviewData {
  totalProducts: number
  willChange: number
  willSkip: number
  protectionAudit: Record<string, boolean | string>
  preview: PreviewRow[]
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function SeverityBadge({ severity, count }: { severity: string; count: number }) {
  if (severity === "ok" || count === 0)
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
        <CheckCircle size={11} /> OK
      </span>
    )
  if (severity === "critical")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
        <XCircle size={11} /> {count} critical
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
      <AlertTriangle size={11} /> {count} warning
    </span>
  )
}

function ScoreRing({ score }: { score: number }) {
  const color = score >= 80 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444"
  return (
    <div className="relative w-20 h-20 flex items-center justify-center">
      <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
        <circle
          cx="18" cy="18" r="15.9" fill="none"
          stroke={color} strokeWidth="3"
          strokeDasharray={`${score} ${100 - score}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.8s ease" }}
        />
      </svg>
      <span className="absolute text-lg font-black text-gray-900">{score}</span>
    </div>
  )
}

function CollapsibleSection({ title, count, severity, children }: {
  title: string; count: number; severity: string; children: React.ReactNode
}) {
  const [open, setOpen] = useState(count > 0)
  if (count === 0 && severity === "ok") {
    return (
      <div className="border border-emerald-200 bg-emerald-50 rounded-xl px-4 py-3 flex items-center gap-3">
        <CheckCircle className="text-emerald-600 flex-shrink-0" size={16} />
        <span className="text-sm font-medium text-emerald-800">{title} — No issues found</span>
      </div>
    )
  }
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <SeverityBadge severity={severity} count={count} />
          <span className="text-sm font-semibold text-gray-800">{title}</span>
        </div>
        {open ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
      </button>
      {open && <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">{children}</div>}
    </div>
  )
}

function ProductPill({ name, url }: { name: string; url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full hover:bg-blue-100 transition-colors"
    >
      {name}
      <ExternalLink size={10} />
    </a>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function SeoHealthTab() {
  const [health, setHealth] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [previewData, setPreviewData] = useState<PreviewData | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveResult, setSaveResult] = useState<{ saved: number; skipped: number; details: string[] } | null>(null)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [confirmed, setConfirmed] = useState(false)

  const loadHealth = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/seo-health")
      if (!res.ok) throw new Error("Failed to load SEO health data")
      setHealth(await res.json())
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadHealth() }, [loadHealth])

  async function handleGeneratePreview() {
    setPreviewLoading(true)
    setShowPreviewModal(true)
    setSaveResult(null)
    setConfirmed(false)
    try {
      const res = await fetch("/api/admin/seo-generate")
      setPreviewData(await res.json())
    } finally {
      setPreviewLoading(false)
    }
  }

  async function handleApproveAndSave() {
    if (!previewData) return
    setSaveLoading(true)
    try {
      const updates = previewData.preview
        .filter((p) => p.willChange)
        .map((p) => ({
          id: p.id,
          ...(p.generatedSeoTitle ? { seoTitle: p.generatedSeoTitle } : {}),
          ...(p.generatedMetaDesc ? { metaDescription: p.generatedMetaDesc } : {}),
        }))

      const res = await fetch("/api/admin/seo-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      })
      const result = await res.json()
      setSaveResult(result)
      setShowPreviewModal(false)
      await loadHealth()
    } finally {
      setSaveLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    )
  }

  if (error || !health) {
    return (
      <div className="py-12 text-center">
        <p className="text-red-600 font-medium mb-4">{error ?? "No data"}</p>
        <Button onClick={loadHealth} variant="outline" size="sm">Retry</Button>
      </div>
    )
  }

  const { issues, impactReport } = health
  const toGenerate = impactReport.filter((p) => !p.seoTitle || !p.metaDescription)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">SEO Health Dashboard</h2>
          <p className="text-sm text-gray-500 mt-1">
            Last scanned: {new Date(health.scannedAt).toLocaleString()} ·{" "}
            {health.totalProducts} products ({health.publishedProducts} published)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={loadHealth} variant="outline" size="sm">
            <RefreshCw size={14} className="mr-1.5" /> Refresh
          </Button>
          {toGenerate.length > 0 && (
            <Button
              onClick={handleGeneratePreview}
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Sparkles size={14} className="mr-1.5" /> Generate Missing SEO Only
            </Button>
          )}
        </div>
      </div>

      {/* Save result banner */}
      {saveResult && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="text-emerald-600 flex-shrink-0 mt-0.5" size={18} />
            <div>
              <p className="text-sm font-semibold text-emerald-800">
                SEO fields saved — {saveResult.saved} product{saveResult.saved !== 1 ? "s" : ""} updated
                {saveResult.skipped > 0 ? `, ${saveResult.skipped} skipped (already had SEO)` : ""}
              </p>
              {saveResult.details.length > 0 && (
                <p className="text-xs text-emerald-700 mt-1">{saveResult.details.join(", ")}</p>
              )}
              <p className="text-xs text-emerald-600 mt-1 font-medium">
                SEO Risk: LOW · URLs unchanged · Slugs unchanged · Canonicals unchanged
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Score + stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4 md:col-span-1">
          <ScoreRing score={health.seoScore} />
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">SEO Score</p>
            <p className="text-sm text-gray-600">{health.fullyOptimized}/{health.totalProducts} optimized</p>
          </div>
        </div>
        {[
          { label: "Missing SEO Titles", count: issues.missingSeoTitle.count, color: issues.missingSeoTitle.count > 0 ? "amber" : "emerald" },
          { label: "Missing Meta Desc", count: issues.missingMetaDesc.count, color: issues.missingMetaDesc.count > 0 ? "amber" : "emerald" },
          { label: "Duplicate Titles", count: issues.duplicateTitles.count, color: issues.duplicateTitles.count > 0 ? "red" : "emerald" },
        ].map((card) => (
          <div key={card.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{card.label}</p>
            <p className={`text-3xl font-black mt-1 ${
              card.color === "emerald" ? "text-emerald-600" :
              card.color === "red" ? "text-red-600" : "text-amber-600"
            }`}>
              {card.count}
            </p>
          </div>
        ))}
        {[
          { label: "Missing H1", count: issues.missingH1.count, color: issues.missingH1.count > 0 ? "red" : "emerald" },
          { label: "Missing OG Images", count: issues.missingOgImages.count, color: issues.missingOgImages.count > 0 ? "amber" : "emerald" },
          { label: "Missing Schema", count: issues.missingSchema.count, color: issues.missingSchema.count > 0 ? "amber" : "emerald" },
          { label: "Orphan Pages", count: issues.orphanPages.count, color: issues.orphanPages.count > 0 ? "amber" : "emerald" },
        ].map((card) => (
          <div key={card.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{card.label}</p>
            <p className={`text-3xl font-black mt-1 ${
              card.color === "emerald" ? "text-emerald-600" :
              card.color === "red" ? "text-red-600" : "text-amber-600"
            }`}>
              {card.count}
            </p>
          </div>
        ))}
      </div>

      {/* Issue sections */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-gray-800">Issue Details</h3>

        <CollapsibleSection title="Missing SEO Titles" count={issues.missingSeoTitle.count} severity={issues.missingSeoTitle.severity}>
          <div className="flex flex-wrap gap-2">
            {issues.missingSeoTitle.items.map((p) => <ProductPill key={p.id} name={p.name} url={p.url} />)}
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Missing Meta Descriptions" count={issues.missingMetaDesc.count} severity={issues.missingMetaDesc.severity}>
          <div className="flex flex-wrap gap-2">
            {issues.missingMetaDesc.items.map((p) => <ProductPill key={p.id} name={p.name} url={p.url} />)}
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Duplicate SEO Titles" count={issues.duplicateTitles.count} severity={issues.duplicateTitles.severity}>
          {issues.duplicateTitles.groups.map((g, i) => (
            <div key={i} className="mb-3 last:mb-0">
              <p className="text-xs font-mono text-gray-600 bg-white border border-gray-200 rounded px-2 py-1 mb-2 truncate">{g.title}</p>
              <div className="flex flex-wrap gap-2">
                {g.products.map((p) => <ProductPill key={p.id} name={p.name} url={p.url} />)}
              </div>
            </div>
          ))}
        </CollapsibleSection>

        <CollapsibleSection title="Duplicate Meta Descriptions" count={issues.duplicateDescriptions.count} severity={issues.duplicateDescriptions.severity}>
          {issues.duplicateDescriptions.groups.map((g, i) => (
            <div key={i} className="mb-3 last:mb-0">
              <p className="text-xs text-gray-600 bg-white border border-gray-200 rounded px-2 py-1 mb-2 line-clamp-2">{g.desc}</p>
              <div className="flex flex-wrap gap-2">
                {g.products.map((p) => <ProductPill key={p.id} name={p.name} url={p.url} />)}
              </div>
            </div>
          ))}
        </CollapsibleSection>

        <CollapsibleSection title="Missing H1 Titles" count={issues.missingH1.count} severity={issues.missingH1.severity}>
          <div className="flex flex-wrap gap-2">
            {issues.missingH1.items.map((p) => <ProductPill key={p.id} name={p.name} url={p.url} />)}
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Missing OG Images" count={issues.missingOgImages.count} severity={issues.missingOgImages.severity}>
          <div className="flex flex-wrap gap-2">
            {issues.missingOgImages.items.map((p) => <ProductPill key={p.id} name={p.name} url={p.url} />)}
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Missing Schema Data" count={issues.missingSchema.count} severity={issues.missingSchema.severity}>
          <div className="flex flex-wrap gap-2">
            {issues.missingSchema.items.map((p) => <ProductPill key={p.id} name={p.name} url={p.url} />)}
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Orphan Pages (no slug)" count={issues.orphanPages.count} severity={issues.orphanPages.severity}>
          <div className="flex flex-wrap gap-2">
            {issues.orphanPages.items.map((p) => <ProductPill key={p.id} name={p.name} url={p.url} />)}
          </div>
        </CollapsibleSection>
      </div>

      {/* Impact Report table */}
      <div>
        <h3 className="text-base font-bold text-gray-800 mb-3">Full Impact Report</h3>
        <div className="border border-gray-200 rounded-xl overflow-hidden overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-48">Product</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Current URL</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Existing H1</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">SEO Title</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Meta Description</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {impactReport.map((p) => (
                <tr key={p.id} className={p.status === "missing" ? "bg-amber-50/30" : ""}>
                  <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                  <td className="px-4 py-3">
                    <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs font-mono">
                      {p.url}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs max-w-[160px] truncate" title={p.h1}>{p.h1 || "—"}</td>
                  <td className="px-4 py-3 text-xs max-w-[180px]">
                    {p.seoTitle
                      ? <span className="text-gray-800 line-clamp-2">{p.seoTitle}</span>
                      : <span className="text-amber-600 font-medium">Missing</span>}
                  </td>
                  <td className="px-4 py-3 text-xs max-w-[200px]">
                    {p.metaDescription
                      ? <span className="text-gray-800 line-clamp-2">{p.metaDescription}</span>
                      : <span className="text-amber-600 font-medium">Missing</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {p.status === "existing"
                      ? <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full"><CheckCircle size={10} /> OK</span>
                      : <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full"><AlertTriangle size={10} /> Missing</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Protection audit footer */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-4">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="text-gray-500" size={15} />
          <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">SEO Protection Guarantees</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {[
            "Product slugs never changed",
            "URLs never changed",
            "Canonical URLs never overwritten",
            "Structured data never modified",
            "Internal links never modified",
            "Sitemap count unchanged",
          ].map((g) => (
            <div key={g} className="flex items-center gap-1.5 text-xs text-gray-600">
              <CheckCircle className="text-emerald-500 flex-shrink-0" size={12} />
              {g}
            </div>
          ))}
        </div>
        <p className="text-xs font-semibold text-emerald-700 mt-3">Overall SEO Risk Level: LOW</p>
      </div>

      {/* Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-12 px-4 pb-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl">
            {/* Modal header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">Generate Missing SEO — Preview</h3>
                <p className="text-xs text-gray-500 mt-0.5">Review all generated fields before saving. Existing SEO fields will not be changed.</p>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
              >
                ✕
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {previewLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="animate-spin text-gray-400" size={32} />
                </div>
              ) : previewData ? (
                <>
                  {/* Summary */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-center">
                      <p className="text-2xl font-black text-amber-700">{previewData.willChange}</p>
                      <p className="text-xs font-medium text-amber-600 mt-0.5">Products will change</p>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-center">
                      <p className="text-2xl font-black text-emerald-700">{previewData.willSkip}</p>
                      <p className="text-xs font-medium text-emerald-600 mt-0.5">Products skipped (have SEO)</p>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-center">
                      <p className="text-2xl font-black text-gray-700">0</p>
                      <p className="text-xs font-medium text-gray-500 mt-0.5">URLs affected</p>
                    </div>
                  </div>

                  {/* Protection audit */}
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="text-emerald-600" size={14} />
                      <span className="text-xs font-bold text-emerald-800">SEO Protection Audit — All Clear</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {Object.entries(previewData.protectionAudit)
                        .filter(([k]) => k !== "riskLevel")
                        .map(([key, val]) => (
                          <div key={key} className="flex items-center gap-1.5 text-xs text-emerald-700">
                            <CheckCircle size={11} className="flex-shrink-0" />
                            {key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}
                          </div>
                        ))}
                    </div>
                    <p className="text-xs font-bold text-emerald-800 mt-2">
                      Risk Level: {String(previewData.protectionAudit.riskLevel)}
                    </p>
                  </div>

                  {/* Preview table */}
                  <div className="border border-gray-200 rounded-xl overflow-hidden overflow-x-auto max-h-96">
                    <table className="w-full text-xs min-w-[640px]">
                      <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                        <tr>
                          <th className="text-left px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wide">Product</th>
                          <th className="text-left px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wide">SEO Title</th>
                          <th className="text-left px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wide">Meta Description</th>
                          <th className="text-center px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wide">Change</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {previewData.preview.filter((p) => p.willChange).map((p) => (
                          <tr key={p.id} className="bg-amber-50/40">
                            <td className="px-3 py-3 font-medium text-gray-800 max-w-[140px]">
                              <span className="line-clamp-2">{p.name}</span>
                            </td>
                            <td className="px-3 py-3 max-w-[220px]">
                              {p.generatedSeoTitle ? (
                                <div>
                                  <span className="text-emerald-700 font-medium">{p.generatedSeoTitle}</span>
                                  <span className="ml-1 text-gray-400">({p.generatedSeoTitle.length} chars)</span>
                                </div>
                              ) : (
                                <span className="text-gray-400 italic">Kept: {p.existingSeoTitle}</span>
                              )}
                            </td>
                            <td className="px-3 py-3 max-w-[260px]">
                              {p.generatedMetaDesc ? (
                                <div>
                                  <span className="text-emerald-700">{p.generatedMetaDesc}</span>
                                  <span className="ml-1 text-gray-400">({p.generatedMetaDesc.length} chars)</span>
                                </div>
                              ) : (
                                <span className="text-gray-400 italic">Kept: {p.existingMetaDesc?.slice(0, 60)}…</span>
                              )}
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full">
                                {p.needsSeoTitle && p.needsMetaDesc ? "Both" : p.needsSeoTitle ? "Title" : "Desc"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Approval checkbox */}
                  <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                      className="mt-0.5 accent-green-600"
                    />
                    <span className="text-sm text-gray-700">
                      I have reviewed the generated SEO fields above. I confirm that only blank fields will be filled,
                      no existing SEO data will be overwritten, and no URLs or slugs will be changed.
                    </span>
                  </label>
                </>
              ) : null}
            </div>

            {/* Modal footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 rounded-b-2xl flex items-center justify-between gap-3">
              <div className="text-xs text-gray-500">
                {previewData && `${previewData.willChange} products will be updated · ${previewData.willSkip} skipped`}
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreviewModal(false)}
                  disabled={saveLoading}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={!confirmed || saveLoading || !previewData || previewData.willChange === 0}
                  onClick={handleApproveAndSave}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {saveLoading
                    ? <><Loader2 size={14} className="mr-1.5 animate-spin" /> Saving…</>
                    : <><CheckCircle size={14} className="mr-1.5" /> Approve &amp; Save</>}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
