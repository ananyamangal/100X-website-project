"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, Save, Eye, AlertCircle, CheckCircle2, Plus, Trash2,
  ChevronUp, ChevronDown, X, Clock, User, GitCompare, Info,
  ExternalLink, RotateCcw, History,
} from "lucide-react"
import { getAllLandingPages, getLandingPage } from "@/lib/seo/landing-pages"
import type { LandingPageDef, FaqEntry, LandingSection } from "@/lib/seo/landing-types"
import { SectionsTab } from "./SectionsTab"

// ─── Types ────────────────────────────────────────────────────────────────────

type FaqRow = FaqEntry & { id: string }

type FormState = {
  metadata: {
    title: string
    description: string
    ogTitle: string
    ogDescription: string
    ogImage: string
  }
  hero: {
    headline: string
    sub: string
    primaryLabel: string
    primaryHref: string
  }
  faqs: FaqRow[]
  relatedLandingSlugs: string[]
  sections: LandingSection[]
}

type OverrideDoc = {
  slug: string
  overrides: {
    metadata?: { title?: string; description?: string; ogTitle?: string; ogDescription?: string; ogImage?: string }
    hero?: { headline?: string; sub?: string; primary?: { label?: string; href?: string } }
    faqs?: FaqEntry[]
    relatedLandingSlugs?: string[]
    sections?: LandingSection[]
  }
  modifiedBy: string
  modifiedByName: string
  modifiedAt: string
}

type AuditEntry = {
  slug: string
  userEmail: string
  userName: string
  timestamp: string
  fieldsChanged: string[]
  snapshot?: Record<string, unknown>
}

type Tab = "seo" | "hero" | "sections" | "faqs" | "related"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function headlineText(h: string | { text: string }[] | undefined): string {
  if (!h) return ""
  if (typeof h === "string") return h
  return h.map(p => p.text).join("")
}

function uid(): string {
  return Math.random().toString(36).slice(2, 9)
}

function buildForm(def: LandingPageDef, override: OverrideDoc | null): FormState {
  const ov = override?.overrides ?? {}
  return {
    metadata: {
      title:         ov.metadata?.title         ?? def.metadata.title,
      description:   ov.metadata?.description   ?? def.metadata.description,
      ogTitle:       ov.metadata?.ogTitle        ?? "",
      ogDescription: ov.metadata?.ogDescription  ?? "",
      ogImage:       ov.metadata?.ogImage        ?? def.metadata.ogImage ?? "",
    },
    hero: {
      headline:     ov.hero?.headline     ?? headlineText(def.hero?.headline),
      sub:          ov.hero?.sub          ?? def.hero?.sub ?? "",
      primaryLabel: ov.hero?.primary?.label ?? def.hero?.primary?.label ?? "",
      primaryHref:  ov.hero?.primary?.href  ?? def.hero?.primary?.href  ?? "",
    },
    faqs: (ov.faqs ?? def.faqs ?? []).map(f => ({ ...f, id: uid() })),
    relatedLandingSlugs: ov.relatedLandingSlugs ?? def.relatedLandingSlugs ?? [],
    sections: (ov.sections as LandingSection[] | undefined) ?? def.sections ?? [],
  }
}

function buildStatic(def: LandingPageDef): FormState {
  return {
    metadata: {
      title:         def.metadata.title,
      description:   def.metadata.description,
      ogTitle:       "",
      ogDescription: "",
      ogImage:       def.metadata.ogImage ?? "",
    },
    hero: {
      headline:     headlineText(def.hero?.headline),
      sub:          def.hero?.sub ?? "",
      primaryLabel: def.hero?.primary?.label ?? "",
      primaryHref:  def.hero?.primary?.href  ?? "",
    },
    faqs: (def.faqs ?? []).map(f => ({ ...f, id: uid() })),
    relatedLandingSlugs: def.relatedLandingSlugs ?? [],
    sections: def.sections ?? [],
  }
}

function buildOverridesPayload(form: FormState): Record<string, unknown> {
  return {
    metadata: {
      title:         form.metadata.title,
      description:   form.metadata.description,
      ogTitle:       form.metadata.ogTitle,
      ogDescription: form.metadata.ogDescription,
      ogImage:       form.metadata.ogImage,
    },
    hero: {
      headline:     form.hero.headline,
      sub:          form.hero.sub,
      primary: {
        label: form.hero.primaryLabel,
        href:  form.hero.primaryHref,
      },
    },
    faqs: form.faqs.map(({ id: _id, ...f }) => f),
    relatedLandingSlugs: form.relatedLandingSlugs,
    sections: form.sections,
  }
}

// ─── Health score ─────────────────────────────────────────────────────────────

type HealthCheck = { label: string; pass: boolean; weight: number; tip?: string }

function computeHealth(form: FormState, pageType: string): HealthCheck[] {
  const isLegacy = pageType === "product"
  return [
    { label: "Meta title present",           pass: !!form.metadata.title.trim(),                                  weight: 20 },
    { label: "Meta description ≥ 50 chars",  pass: form.metadata.description.trim().length >= 50,                 weight: 15 },
    { label: "Meta description ≤ 160 chars", pass: form.metadata.description.trim().length <= 160,                weight: 10, tip: "Over 160 chars gets truncated in SERPs" },
    { label: "Hero headline (H1) present",   pass: !isLegacy && !!form.hero.headline.trim(),                      weight: 20 },
    { label: "Primary CTA configured",       pass: !isLegacy && !!form.hero.primaryLabel.trim() && !!form.hero.primaryHref.trim(), weight: 15 },
    { label: "At least 1 FAQ",               pass: form.faqs.length > 0,                                         weight: 10 },
    { label: "OG Image set",                 pass: !!form.metadata.ogImage.trim(),                                weight: 5,  tip: "Improves social share appearance" },
    { label: "Has body sections",            pass: isLegacy || form.sections.length > 0,                          weight: 5 },
  ]
}

function HealthScore({ form, pageType }: { form: FormState; pageType: string }) {
  const checks = computeHealth(form, pageType)
  const score = checks.filter(c => c.pass).reduce((sum, c) => sum + c.weight, 0)
  const color = score >= 85 ? "green" : score >= 60 ? "amber" : "red"
  const colorMap = { green: "text-green-700 bg-green-50 border-green-200", amber: "text-amber-700 bg-amber-50 border-amber-200", red: "text-red-700 bg-red-50 border-red-200" }
  const barMap  = { green: "bg-green-500", amber: "bg-amber-500", red: "bg-red-500" }
  const failing = checks.filter(c => !c.pass)
  return (
    <div className={`border rounded-xl p-4 ${colorMap[color]}`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold">Content Health Score</p>
        <span className="text-lg font-black">{score}<span className="text-xs font-normal opacity-60">/100</span></span>
      </div>
      <div className="h-2 bg-white/60 rounded-full overflow-hidden mb-3">
        <div className={`h-full rounded-full transition-all ${barMap[color]}`} style={{ width: `${score}%` }} />
      </div>
      {failing.length > 0 && (
        <div className="space-y-1">
          {failing.map(c => (
            <p key={c.label} className="text-[11px] flex items-start gap-1.5 opacity-80">
              <span className="shrink-0 mt-0.5">✗</span>
              <span>{c.label}{c.tip ? <em className="opacity-70 ml-1">— {c.tip}</em> : null}</span>
            </p>
          ))}
        </div>
      )}
      {failing.length === 0 && <p className="text-xs font-medium opacity-80">All checks pass — excellent SEO health!</p>}
    </div>
  )
}

// ─── Diff computation ─────────────────────────────────────────────────────────

type FieldDiff = { label: string; staticVal: string; currentVal: string; changed: boolean }

function computeDiff(form: FormState, base: FormState): FieldDiff[] {
  const diffs: FieldDiff[] = [
    { label: "Meta title",        staticVal: base.metadata.title,         currentVal: form.metadata.title,         changed: form.metadata.title         !== base.metadata.title },
    { label: "Meta description",  staticVal: base.metadata.description,   currentVal: form.metadata.description,   changed: form.metadata.description   !== base.metadata.description },
    { label: "OG title",          staticVal: base.metadata.ogTitle,       currentVal: form.metadata.ogTitle,       changed: form.metadata.ogTitle       !== base.metadata.ogTitle },
    { label: "OG description",    staticVal: base.metadata.ogDescription, currentVal: form.metadata.ogDescription, changed: form.metadata.ogDescription !== base.metadata.ogDescription },
    { label: "OG image",          staticVal: base.metadata.ogImage,       currentVal: form.metadata.ogImage,       changed: form.metadata.ogImage       !== base.metadata.ogImage },
    { label: "Hero headline",     staticVal: base.hero.headline,          currentVal: form.hero.headline,          changed: form.hero.headline          !== base.hero.headline },
    { label: "Hero subheadline",  staticVal: base.hero.sub,               currentVal: form.hero.sub,               changed: form.hero.sub               !== base.hero.sub },
    { label: "CTA label",         staticVal: base.hero.primaryLabel,      currentVal: form.hero.primaryLabel,      changed: form.hero.primaryLabel      !== base.hero.primaryLabel },
    { label: "CTA URL",           staticVal: base.hero.primaryHref,       currentVal: form.hero.primaryHref,       changed: form.hero.primaryHref       !== base.hero.primaryHref },
  ]

  // FAQ summary diff
  const staticFaqSig = JSON.stringify(base.faqs.map(f => ({ q: f.q, a: f.a })))
  const formFaqSig   = JSON.stringify(form.faqs.map(f => ({ q: f.q, a: f.a })))
  diffs.push({
    label:      "FAQs",
    staticVal:  `${base.faqs.length} entries`,
    currentVal: `${form.faqs.length} entries`,
    changed:    staticFaqSig !== formFaqSig,
  })

  // Related pages diff
  const staticRel = [...base.relatedLandingSlugs].sort().join(",")
  const formRel   = [...form.relatedLandingSlugs].sort().join(",")
  diffs.push({
    label:      "Related pages",
    staticVal:  base.relatedLandingSlugs.join(", ") || "none",
    currentVal: form.relatedLandingSlugs.join(", ") || "none",
    changed:    staticRel !== formRel,
  })

  // Sections diff
  const staticSec = JSON.stringify(base.sections)
  const formSec   = JSON.stringify(form.sections)
  diffs.push({
    label:      "Sections",
    staticVal:  `${base.sections.length} section${base.sections.length !== 1 ? "s" : ""}`,
    currentVal: `${form.sections.length} section${form.sections.length !== 1 ? "s" : ""}`,
    changed:    staticSec !== formSec,
  })

  return diffs
}

// ─── Shared UI primitives ─────────────────────────────────────────────────────

function Field({
  label, value, onChange, placeholder, as = "input", rows = 3, error,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  as?: "input" | "textarea"
  rows?: number
  error?: string
}) {
  const cls = `w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/30 transition-colors ${
    error ? "border-red-400 bg-red-50" : "border-gray-200 focus:border-brand-400"
  }`
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-gray-700">{label}</label>
      {as === "textarea"
        ? <textarea value={value} onChange={e => onChange(e.target.value)}
            placeholder={placeholder} rows={rows} className={`${cls} resize-y`} />
        : <input type="text" value={value} onChange={e => onChange(e.target.value)}
            placeholder={placeholder} className={cls} />
      }
      {error && <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle size={11} />{error}</p>}
    </div>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      </div>
      <div className="px-5 py-5 space-y-4">{children}</div>
    </div>
  )
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ type, message, onClose }: { type: "success" | "error"; message: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium max-w-sm ${
      type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
    }`}>
      {type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
      <span className="flex-1">{message}</span>
      <button onClick={onClose} className="opacity-70 hover:opacity-100"><X size={14} /></button>
    </div>
  )
}

// ─── Diff Modal ───────────────────────────────────────────────────────────────

function DiffModal({ diffs, onClose }: { diffs: FieldDiff[]; onClose: () => void }) {
  const changed = diffs.filter(d => d.changed)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <GitCompare size={15} className="text-brand-600" />
            Preview Changes
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">
              {changed.length} field{changed.length !== 1 ? "s" : ""} changed from static registry
            </span>
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"><X size={15} /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {changed.length === 0
            ? (
              <div className="py-12 text-center text-gray-500">
                <GitCompare size={28} className="mx-auto mb-3 text-gray-300" />
                <p className="text-sm font-medium">No changes from static registry</p>
                <p className="text-xs text-gray-400 mt-1">Form values match the source file exactly.</p>
              </div>
            )
            : changed.map(d => (
              <div key={d.label} className="px-5 py-4 border-b border-gray-100 last:border-0">
                <p className="text-xs font-semibold text-gray-700 mb-2">{d.label}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <p className="text-[10px] text-red-500 font-semibold uppercase tracking-wider mb-1">Static (before)</p>
                    <p className="text-xs text-red-800 break-words line-clamp-4">{d.staticVal || <em className="opacity-50">empty</em>}</p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <p className="text-[10px] text-green-600 font-semibold uppercase tracking-wider mb-1">Override (after)</p>
                    <p className="text-xs text-green-900 break-words line-clamp-4">{d.currentVal || <em className="opacity-50">empty</em>}</p>
                  </div>
                </div>
              </div>
            ))
          }
        </div>
        <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button onClick={onClose} className="px-4 py-1.5 text-xs text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Tab components ───────────────────────────────────────────────────────────

function SeoTab({ form, errors, set }: {
  form: FormState["metadata"]
  errors: Partial<Record<string, string>>
  set: (k: keyof FormState["metadata"], v: string) => void
}) {
  return (
    <div className="space-y-5">
      <SectionCard title="Core SEO">
        <Field label="Meta Title *" value={form.title} onChange={v => set("title", v)}
          placeholder="Keyword-rich page title" error={errors.title} />
        <Field label="Meta Description" value={form.description} onChange={v => set("description", v)}
          placeholder="Compelling 150–160 char description" as="textarea" rows={3} />
        <p className={`text-xs mt-1 ${form.description.length > 160 ? "text-amber-600" : "text-gray-400"}`}>
          {form.description.length} chars {form.description.length > 160 ? "— over 160 limit" : ""}
        </p>
      </SectionCard>
      <SectionCard title="Open Graph (Social Preview)">
        <Field label="OG Title" value={form.ogTitle} onChange={v => set("ogTitle", v)}
          placeholder="Leave blank to inherit Meta Title" />
        <Field label="OG Description" value={form.ogDescription} onChange={v => set("ogDescription", v)}
          placeholder="Leave blank to inherit Meta Description" as="textarea" rows={3} />
        <Field label="OG Image URL" value={form.ogImage} onChange={v => set("ogImage", v)}
          placeholder="https://res.cloudinary.com/... or /images/..." />
        <div className="mt-2 bg-gray-50 border border-gray-200 rounded-lg p-3.5">
          <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-1.5">Social Preview (approx)</p>
          <div className="bg-white border border-gray-200 rounded p-3">
            {form.ogImage
              ? <img src={form.ogImage} alt="OG preview" className="w-full h-20 object-cover rounded mb-2" />
              : (
                <div className="w-full h-16 bg-gradient-to-r from-gray-100 to-gray-200 rounded mb-2 flex items-center justify-center">
                  <span className="text-[10px] text-gray-400">Paste an OG Image URL above to preview</span>
                </div>
              )
            }
            <p className="text-xs font-bold text-gray-900 line-clamp-1">{form.ogTitle || form.title || "—"}</p>
            <p className="text-[11px] text-gray-600 line-clamp-2 mt-0.5">{form.ogDescription || form.description || "—"}</p>
            <p className="text-[10px] text-gray-400 mt-1">100xcircle.com</p>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}

function HeroTab({ form, errors, set }: {
  form: FormState["hero"]
  errors: Partial<Record<string, string>>
  set: (k: keyof FormState["hero"], v: string) => void
}) {
  return (
    <div className="space-y-5">
      <SectionCard title="Headline & Copy">
        <Field label="Hero Headline (H1) *" value={form.headline} onChange={v => set("headline", v)}
          placeholder="Primary headline displayed above the fold" error={errors.headline} />
        <Field label="Hero Subheadline" value={form.sub} onChange={v => set("sub", v)}
          placeholder="Supporting subtext below the headline" as="textarea" rows={2} />
      </SectionCard>
      <SectionCard title="Primary CTA Button">
        <Field label="CTA Label" value={form.primaryLabel} onChange={v => set("primaryLabel", v)}
          placeholder="e.g. Get Free Quote" />
        <Field label="CTA URL" value={form.primaryHref} onChange={v => set("primaryHref", v)}
          placeholder="/contact or https://..." error={errors.primaryHref} />
        {form.primaryHref && !errors.primaryHref && (
          <a href={form.primaryHref} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-brand-600 hover:underline mt-1">
            <ExternalLink size={11} />Test this URL
          </a>
        )}
      </SectionCard>
    </div>
  )
}

function FaqsTab({ faqs, setFaqs }: {
  faqs: FaqRow[]
  setFaqs: (f: FaqRow[]) => void
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<{ q: string; a: string }>({ q: "", a: "" })
  const [newQ, setNewQ] = useState("")
  const [newA, setNewA] = useState("")

  function startEdit(row: FaqRow) {
    setEditingId(row.id)
    setDraft({ q: row.q, a: row.a })
  }

  function commitEdit(id: string) {
    if (!draft.q.trim()) return
    setFaqs(faqs.map(f => f.id === id ? { ...f, q: draft.q.trim(), a: draft.a.trim() } : f))
    setEditingId(null)
  }

  function addFaq() {
    if (!newQ.trim()) return
    setFaqs([...faqs, { q: newQ.trim(), a: newA.trim(), id: uid() }])
    setNewQ("")
    setNewA("")
  }

  function removeFaq(id: string) {
    setFaqs(faqs.filter(f => f.id !== id))
  }

  function moveUp(idx: number) {
    if (idx === 0) return
    const next = [...faqs]
    ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
    setFaqs(next)
  }

  function moveDown(idx: number) {
    if (idx === faqs.length - 1) return
    const next = [...faqs]
    ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
    setFaqs(next)
  }

  return (
    <div className="space-y-4">
      {/* Existing FAQs */}
      {faqs.length === 0 && (
        <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl py-8 text-center text-gray-400 text-sm">
          No FAQs yet — add one below
        </div>
      )}

      <div className="space-y-2">
        {faqs.map((row, idx) => (
          <div key={row.id} className={`border rounded-xl overflow-hidden ${editingId === row.id ? "border-brand-400 shadow-sm" : "border-gray-200"}`}>
            {editingId === row.id
              ? (
                <div className="p-4 space-y-3 bg-white">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700">Question</label>
                    <input type="text" value={draft.q} onChange={e => setDraft(d => ({ ...d, q: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-brand-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/30" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700">Answer</label>
                    <textarea value={draft.a} onChange={e => setDraft(d => ({ ...d, a: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 text-sm border border-brand-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/30 resize-y" />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setEditingId(null)}
                      className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
                    <button onClick={() => commitEdit(row.id)}
                      className="px-3 py-1.5 text-xs bg-brand-600 text-white rounded-lg hover:bg-brand-700">Save FAQ</button>
                  </div>
                </div>
              )
              : (
                <div className="flex items-start gap-3 px-4 py-3 bg-white hover:bg-gray-50/60 transition-colors">
                  <div className="flex flex-col gap-0.5 shrink-0 pt-0.5">
                    <button onClick={() => moveUp(idx)} disabled={idx === 0}
                      className="p-0.5 rounded text-gray-300 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed">
                      <ChevronUp size={13} />
                    </button>
                    <button onClick={() => moveDown(idx)} disabled={idx === faqs.length - 1}
                      className="p-0.5 rounded text-gray-300 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed">
                      <ChevronDown size={13} />
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900 leading-snug">{row.q}</p>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">{row.a || <em className="opacity-50">No answer</em>}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => startEdit(row)}
                      className="px-2.5 py-1 text-[11px] text-brand-600 border border-brand-200 rounded-lg hover:bg-brand-50 transition-colors">Edit</button>
                    <button onClick={() => removeFaq(row.id)}
                      className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              )
            }
          </div>
        ))}
      </div>

      {/* Add new FAQ */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
        <p className="text-xs font-semibold text-blue-800">Add FAQ</p>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-blue-700">Question</label>
          <input type="text" value={newQ} onChange={e => setNewQ(e.target.value)}
            placeholder="e.g. What is the warranty period?"
            className="w-full px-3 py-2 text-sm border border-blue-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/30"
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addFaq() } }}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-blue-700">Answer</label>
          <textarea value={newA} onChange={e => setNewA(e.target.value)}
            placeholder="Write a clear, concise answer…"
            rows={2}
            className="w-full px-3 py-2 text-sm border border-blue-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/30 resize-y"
          />
        </div>
        <button onClick={addFaq} disabled={!newQ.trim()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          <Plus size={12} />Add FAQ
        </button>
      </div>

      <p className="text-[11px] text-gray-400 text-center">
        {faqs.length} FAQ{faqs.length !== 1 ? "s" : ""} · FAQPage JSON-LD generated automatically
      </p>
    </div>
  )
}

function RelatedTab({ slugs, setSlugs, currentSlug }: {
  slugs: string[]
  setSlugs: (s: string[]) => void
  currentSlug: string
}) {
  const allPages = getAllLandingPages().filter(p => p.slug !== currentSlug)

  function toggle(slug: string) {
    if (slugs.includes(slug)) {
      setSlugs(slugs.filter(s => s !== slug))
    } else {
      setSlugs([...slugs, slug])
    }
  }

  return (
    <div className="space-y-4">
      <SectionCard title="Related Landing Pages">
        <p className="text-xs text-gray-500 -mt-1">
          Selected pages appear as "Related Products" links on this page. Choose up to 4.
        </p>
        <div className="space-y-2 mt-2">
          {allPages.map(page => {
            const selected = slugs.includes(page.slug)
            return (
              <label key={page.slug}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  selected ? "border-brand-400 bg-brand-50" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}>
                <input type="checkbox" checked={selected} onChange={() => toggle(page.slug)}
                  className="mt-0.5 accent-brand-600" />
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold leading-snug ${selected ? "text-brand-800" : "text-gray-800"}`}>
                    {page.metadata.title.split(" | ")[0]}
                  </p>
                  <p className="text-[11px] text-gray-400 font-mono mt-0.5">/{page.slug}</p>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                  page.type === "product" ? "bg-blue-100 text-blue-700" :
                  page.type === "state"   ? "bg-green-100 text-green-700" :
                  "bg-gray-100 text-gray-600"
                }`}>{page.type}</span>
              </label>
            )
          })}
        </div>
        {slugs.length > 4 && (
          <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
            <AlertCircle size={11} />More than 4 related pages selected — consider reducing for best UX
          </p>
        )}
      </SectionCard>

      {slugs.length > 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Selected ({slugs.length})</p>
          <div className="flex flex-wrap gap-2">
            {slugs.map(s => (
              <div key={s} className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2.5 py-1">
                <span className="text-[11px] font-mono text-gray-700">/{s}</span>
                <button onClick={() => toggle(s)} className="text-gray-400 hover:text-red-500 transition-colors">
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Audit History ────────────────────────────────────────────────────────────

function AuditHistory({
  history,
  onRestore,
}: {
  history: AuditEntry[]
  onRestore?: (entry: AuditEntry) => void
}) {
  const [open, setOpen] = useState(false)
  if (history.length === 0) return null
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors">
        <span className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <Clock size={14} className="text-gray-400" />Edit History
        </span>
        <span className="text-xs text-gray-400">{history.length} entries{open ? " ▲" : " ▼"}</span>
      </button>
      {open && (
        <div className="divide-y divide-gray-100">
          {history.map((h, i) => (
            <div key={i} className="px-5 py-3 flex items-start gap-3">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                h.fieldsChanged.includes("revert") ? "bg-red-100" : "bg-brand-100"
              }`}>
                {h.fieldsChanged.includes("revert")
                  ? <RotateCcw size={12} className="text-red-600" />
                  : <User size={12} className="text-brand-600" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-800">{h.userName}</p>
                <p className="text-[11px] text-gray-500">{h.userEmail}</p>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {h.fieldsChanged.map(f => (
                    <span key={f} className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                      f === "revert" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"
                    }`}>{f}</span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {onRestore && h.snapshot && !h.fieldsChanged.includes("revert") && (
                  <button onClick={() => onRestore(h)}
                    className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 hover:border-brand-300 hover:text-brand-700 transition-colors">
                    <History size={10} />Restore
                  </button>
                )}
                <span className="text-[10px] text-gray-400 whitespace-nowrap">
                  {new Date(h.timestamp).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LandingPageEditPage() {
  const { slug } = useParams<{ slug: string }>()

  const def = getLandingPage(slug)

  const [form, setForm]             = useState<FormState | null>(null)
  const [staticBase, setStaticBase] = useState<FormState | null>(null)
  const [overrideMeta, setOverrideMeta] = useState<{
    modifiedBy: string; modifiedByName: string; modifiedAt: string
  } | null>(null)
  const [history, setHistory]   = useState<AuditEntry[]>([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [tab, setTab]           = useState<Tab>("seo")
  const [showDiff, setShowDiff] = useState(false)
  const [toast, setToast]       = useState<{ type: "success" | "error"; message: string } | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const closeToast = useCallback(() => setToast(null), [])

  // Load override on mount
  useEffect(() => {
    if (!def) { setLoading(false); return }
    const base = buildStatic(def)
    setStaticBase(base)

    fetch(`/api/admin/landing-pages/${slug}/override`)
      .then(r => r.json())
      .then(d => {
        if (d.ok) {
          setForm(buildForm(def, d.override))
          if (d.override) {
            setOverrideMeta({
              modifiedBy:     d.override.modifiedBy,
              modifiedByName: d.override.modifiedByName,
              modifiedAt:     d.override.modifiedAt,
            })
          } else {
            setForm(buildForm(def, null))
          }
          setHistory(d.history ?? [])
        }
      })
      .catch(() => setForm(buildForm(def, null)))
      .finally(() => setLoading(false))
  }, [slug, def])

  // Validation
  function validate(): boolean {
    const errs: Record<string, string> = {}
    if (!form) return false
    if (!form.metadata.title.trim())   errs.title    = "Meta title is required"
    if (!form.hero.headline.trim())    errs.headline  = "Hero headline (H1) is required"
    const href = form.hero.primaryHref.trim()
    if (href && !/^(\/|https?:\/\/)/.test(href)) errs.primaryHref = "Must start with / or https://"
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSave() {
    if (!form || !validate()) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/landing-pages/${slug}/override`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overrides: buildOverridesPayload(form) }),
      })
      const data = await res.json()
      if (!res.ok) {
        setToast({ type: "error", message: data.error ?? "Save failed" })
        return
      }
      setOverrideMeta({
        modifiedBy:     data.modifiedBy,
        modifiedByName: data.modifiedByName,
        modifiedAt:     data.modifiedAt,
      })
      // Reload history
      fetch(`/api/admin/landing-pages/${slug}/override`)
        .then(r => r.json())
        .then(d => d.ok && setHistory(d.history ?? []))
        .catch(() => {})
      setToast({ type: "success", message: `Saved — ${(data.fieldsChanged as string[]).join(", ")} updated` })
    } catch {
      setToast({ type: "error", message: "Network error — please try again" })
    } finally {
      setSaving(false)
    }
  }

  // Revert to static registry — deletes the override doc
  async function handleRevert() {
    if (!window.confirm(
      "Revert to static registry?\n\nThis removes all saved overrides. The live page will immediately reflect the static registry values.\n\nThis action cannot be undone.",
    )) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/landing-pages/${slug}/override`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) { setToast({ type: "error", message: data.error ?? "Revert failed" }); return }
      setForm(buildStatic(def!))
      setOverrideMeta(null)
      fetch(`/api/admin/landing-pages/${slug}/override`)
        .then(r => r.json())
        .then(d => d.ok && setHistory(d.history ?? []))
        .catch(() => {})
      setToast({ type: "success", message: "Reverted to static registry — live page revalidated" })
    } catch {
      setToast({ type: "error", message: "Network error — please try again" })
    } finally {
      setSaving(false)
    }
  }

  // Restore a previous version from audit history
  async function handleRestore(entry: AuditEntry) {
    if (!entry.snapshot) return
    const dateStr = new Date(entry.timestamp).toLocaleString("en-IN", {
      day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
    })
    if (!window.confirm(`Restore version saved by ${entry.userName} on ${dateStr}?\n\nThis will overwrite the current override.`)) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/landing-pages/${slug}/override`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overrides: entry.snapshot }),
      })
      const data = await res.json()
      if (!res.ok) { setToast({ type: "error", message: data.error ?? "Restore failed" }); return }
      // Reload full state
      const refreshed = await fetch(`/api/admin/landing-pages/${slug}/override`).then(r => r.json())
      if (refreshed.ok) {
        setForm(buildForm(def!, refreshed.override))
        setOverrideMeta(refreshed.override ? {
          modifiedBy:     refreshed.override.modifiedBy,
          modifiedByName: refreshed.override.modifiedByName,
          modifiedAt:     refreshed.override.modifiedAt,
        } : null)
        setHistory(refreshed.history ?? [])
      }
      setToast({ type: "success", message: `Version from ${dateStr} restored — live page revalidated` })
    } catch {
      setToast({ type: "error", message: "Network error — please try again" })
    } finally {
      setSaving(false)
    }
  }

  // ─── Setters ─────────────────────────────────────────────────────────────

  function setMeta(k: keyof FormState["metadata"], v: string) {
    setForm(f => f ? { ...f, metadata: { ...f.metadata, [k]: v } } : f)
    if (fieldErrors[k === "title" ? "title" : ""]) setFieldErrors(e => ({ ...e, title: "" }))
  }

  function setHero(k: keyof FormState["hero"], v: string) {
    setForm(f => f ? { ...f, hero: { ...f.hero, [k]: v } } : f)
    if (k === "headline" && fieldErrors.headline) setFieldErrors(e => ({ ...e, headline: "" }))
    if (k === "primaryHref" && fieldErrors.primaryHref) setFieldErrors(e => ({ ...e, primaryHref: "" }))
  }

  function setFaqs(faqs: FaqRow[]) {
    setForm(f => f ? { ...f, faqs } : f)
  }

  function setRelated(slugs: string[]) {
    setForm(f => f ? { ...f, relatedLandingSlugs: slugs } : f)
  }

  function setSections(sections: LandingSection[]) {
    setForm(f => f ? { ...f, sections } : f)
  }

  // ─── Guard: page not in registry ─────────────────────────────────────────

  if (!def) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle size={32} className="text-red-400 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-800">Page not found in registry</p>
          <p className="text-xs text-gray-500 mt-1 mb-4">Slug: <code className="bg-gray-100 px-1 rounded">{slug}</code></p>
          <Link href="/admin/growth/landing-pages"
            className="text-xs text-brand-600 hover:underline">← Back to inventory</Link>
        </div>
      </div>
    )
  }

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (loading || !form || !staticBase) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-5xl mx-auto px-6 py-6 space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-white border border-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const diffs        = computeDiff(form, staticBase)
  const changedCount = diffs.filter(d => d.changed).length
  const sectionsChanged = diffs.find(d => d.label === "Sections")?.changed ?? false
  const TABS: { id: Tab; label: string; badge?: number }[] = [
    { id: "seo",      label: "SEO",                    badge: ["Meta title","Meta description","OG title","OG description","OG image"].filter(label => diffs.find(d => d.label === label && d.changed)).length || undefined },
    { id: "hero",     label: "Hero" },
    { id: "sections", label: `Sections (${form.sections.length})`, badge: sectionsChanged ? 1 : undefined },
    { id: "faqs",     label: `FAQs (${form.faqs.length})` },
    { id: "related",  label: "Related Pages" },
  ]

  const titleDisplay = def.metadata.title.split(" | ")[0]

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-start justify-between gap-4 max-w-5xl mx-auto">
          <div>
            <Link href="/admin/growth/landing-pages"
              className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 mb-2 transition-colors">
              <ArrowLeft size={12} />Landing Pages
            </Link>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">{titleDisplay}</h1>
            <p className="text-xs text-gray-400 font-mono mt-0.5">/{slug}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0 mt-1">
            <a href={`https://www.100xcircle.com/${slug}`} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
              <ExternalLink size={12} />Live page
            </a>
            <button onClick={() => setShowDiff(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors">
              <GitCompare size={12} />
              Preview Changes
              {changedCount > 0 && (
                <span className="ml-0.5 w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {changedCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Last modified strip */}
      {overrideMeta && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-2">
          <div className="max-w-5xl mx-auto flex items-center gap-2 text-xs text-amber-800">
            <Clock size={11} className="text-amber-500 shrink-0" />
            <span>
              Last modified by <strong>{overrideMeta.modifiedByName}</strong> ({overrideMeta.modifiedBy}) on{" "}
              {new Date(overrideMeta.modifiedAt).toLocaleString("en-IN", {
                day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
              })}
            </span>
          </div>
        </div>
      )}

      {/* No override notice */}
      {!overrideMeta && (
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-2">
          <div className="max-w-5xl mx-auto flex items-center gap-2 text-xs text-blue-800">
            <Info size={11} className="text-blue-500 shrink-0" />
            <span>Showing static registry values — no overrides saved yet. Edit and save to create an override.</span>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-5">

        {/* Tabs */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex border-b border-gray-200 px-1 pt-1">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px ${
                  tab === t.id
                    ? "text-brand-600 border-brand-600"
                    : "text-gray-500 border-transparent hover:text-gray-700"
                }`}>
                {t.label}
                {t.badge !== undefined && t.badge > 0 && (
                  <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {t.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="p-5">
            {tab === "seo"      && <SeoTab      form={form.metadata} errors={fieldErrors} set={setMeta} />}
            {tab === "hero"     && <HeroTab     form={form.hero}     errors={fieldErrors} set={setHero} />}
            {tab === "sections" && <SectionsTab sections={form.sections} setSections={setSections} pageType={def.type} />}
            {tab === "faqs"     && <FaqsTab     faqs={form.faqs}     setFaqs={setFaqs} />}
            {tab === "related"  && <RelatedTab  slugs={form.relatedLandingSlugs} setSlugs={setRelated} currentSlug={slug} />}
          </div>
        </div>

        {/* Validation errors summary */}
        {Object.keys(fieldErrors).filter(k => fieldErrors[k]).length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-red-800 mb-2 flex items-center gap-1.5">
              <AlertCircle size={13} />Validation errors — fix before saving
            </p>
            <ul className="space-y-1">
              {Object.entries(fieldErrors).filter(([, v]) => v).map(([k, v]) => (
                <li key={k} className="text-xs text-red-700">• {v}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Health score */}
        <HealthScore form={form} pageType={def.type} />

        {/* Save bar */}
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {changedCount > 0
              ? <span className="text-xs text-amber-700 bg-amber-100 px-2.5 py-1 rounded-lg font-medium">
                  {changedCount} field{changedCount !== 1 ? "s" : ""} changed from static
                </span>
              : <span className="text-xs text-gray-400">No changes from static registry</span>
            }
          </div>
          <div className="flex items-center gap-2">
            {overrideMeta && (
              <button onClick={handleRevert} disabled={saving}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs border border-red-200 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                <RotateCcw size={12} />Revert to Registry
              </button>
            )}
            <button onClick={() => setShowDiff(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors">
              <Eye size={12} />Diff View
            </button>
            <button onClick={handleSave} disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors font-medium">
              <Save size={12} />
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>

        {/* Audit history */}
        <AuditHistory history={history} onRestore={handleRestore} />

        {/* Stage note */}
        <p className="text-[10px] text-gray-400 text-center pb-2">
          Finalization Phase D1–D5 active · Sections, health score, OG image, video embed · Overrides merge via <code>getMergedLandingPage</code> · Save triggers <code>revalidatePath</code>
        </p>
      </div>

      {/* Modals & toasts */}
      {showDiff && <DiffModal diffs={diffs} onClose={() => setShowDiff(false)} />}
      {toast    && <Toast type={toast.type} message={toast.message} onClose={closeToast} />}
    </div>
  )
}
