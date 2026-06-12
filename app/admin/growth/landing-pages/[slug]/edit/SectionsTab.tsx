"use client"

import { useState } from "react"
import {
  Plus, Trash2, ChevronUp, ChevronDown, Copy, ChevronRight,
  AlertCircle,
} from "lucide-react"
import type {
  LandingSection, BenefitItem, ProcessStep, CaseStudy,
  ComparisonRow, TrustMetric, FaqEntry, LandingFormVariant,
} from "@/lib/seo/landing-types"

// ─── Config ───────────────────────────────────────────────────────────────────

const SECTION_TYPES: { kind: string; label: string; description: string }[] = [
  { kind: "trust-strip",         label: "Trust Strip",          description: "Key metrics row (e.g. 10+ years, 500+ clients)" },
  { kind: "benefits-grid",       label: "Features / Benefits",  description: "Icon-led benefit cards grid" },
  { kind: "process-timeline",    label: "Process Timeline",     description: "Numbered how-it-works steps" },
  { kind: "case-studies",        label: "Testimonials",         description: "Client results with quotes" },
  { kind: "recommended-products",label: "Product Showcase",     description: "Product grid with slugs or category" },
  { kind: "comparison-table",    label: "Comparison Table",     description: "Side-by-side feature comparison" },
  { kind: "rich-text",           label: "Rich Text",            description: "Heading + paragraph block" },
  { kind: "cta-band",            label: "CTA Banner",           description: "Call-to-action with button" },
  { kind: "faq",                 label: "FAQ Section",          description: "Q&A block with its own questions" },
  { kind: "form",                label: "Lead Form",            description: "Quote / registration form" },
  { kind: "video",               label: "Video Embed",          description: "YouTube or embed URL" },
]

const SECTION_LABEL: Record<string, string> = Object.fromEntries(
  SECTION_TYPES.map(t => [t.kind, t.label])
)

const FORM_VARIANTS: LandingFormVariant[] = [
  "use-case-quote", "tender-quote", "state-dealer", "reseller", "guide-download",
]

// ─── Factory ──────────────────────────────────────────────────────────────────

function makeSection(kind: string): LandingSection {
  switch (kind) {
    case "trust-strip":
      return { kind: "trust-strip", metrics: [{ value: "10+", label: "Years Experience" }] }
    case "benefits-grid":
      return { kind: "benefits-grid", title: "Key Benefits", items: [{ icon: "✅", title: "Benefit", description: "Describe this benefit." }] }
    case "process-timeline":
      return { kind: "process-timeline", title: "How It Works", steps: [{ title: "Step 1", description: "Describe this step." }] }
    case "case-studies":
      return { kind: "case-studies", title: "Client Results", items: [{ client: "Client Name", result: "Describe the outcome." }] }
    case "recommended-products":
      return { kind: "recommended-products", title: "Our Products", slugs: [] }
    case "comparison-table":
      return { kind: "comparison-table", title: "Comparison", columns: ["Option A", "Option B"], rows: [{ label: "Feature", cells: ["Yes", "No"] }] }
    case "rich-text":
      return { kind: "rich-text", h2: "Section Heading", paragraphs: ["Add your content here."] }
    case "cta-band":
      return { kind: "cta-band", band: { heading: "Ready to get started?", primary: { label: "Get a Free Quote", href: "/contact-us" } } }
    case "faq":
      return { kind: "faq", title: "Frequently Asked Questions", faqs: [{ q: "Question?", a: "Answer." }] }
    case "form":
      return { kind: "form", variant: "use-case-quote", title: "Get a Quote", sub: "", eyebrow: "" }
    case "video":
      return { kind: "video", url: "", title: "", description: "" }
    default:
      return { kind: "rich-text", h2: "New Section", paragraphs: [""] }
  }
}

function sectionPreview(s: LandingSection): string {
  switch (s.kind) {
    case "trust-strip": return `${s.metrics.length} metrics`
    case "benefits-grid": return s.title
    case "process-timeline": return s.title
    case "case-studies": return s.title
    case "recommended-products": return s.title ?? `${(s.slugs ?? []).length} products`
    case "comparison-table": return s.title
    case "rich-text": return s.h2
    case "cta-band": return s.band.heading
    case "faq": return s.title ?? `${(s.faqs ?? []).length} questions`
    case "form": return s.title
    case "video": return s.url ? "Video: " + s.url.slice(0, 40) + "…" : "No URL set"
    default: return (s as { kind: string }).kind
  }
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function F({
  label, value, onChange, placeholder, as = "input", rows = 2,
}: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; as?: "input" | "textarea"; rows?: number
}) {
  const cls = "w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-colors"
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-semibold text-gray-600">{label}</label>
      {as === "textarea"
        ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} className={`${cls} resize-y`} />
        : <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={cls} />}
    </div>
  )
}

function Row({ children, onDelete }: { children: React.ReactNode; onDelete: () => void }) {
  return (
    <div className="flex items-start gap-2 bg-gray-50 border border-gray-200 rounded-lg p-2.5">
      <div className="flex-1 grid grid-cols-2 gap-2">{children}</div>
      <button onClick={onDelete} className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0 mt-0.5">
        <Trash2 size={12} />
      </button>
    </div>
  )
}

function AddBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] border border-dashed border-brand-300 text-brand-600 rounded-lg hover:bg-brand-50 transition-colors">
      <Plus size={11} />{label}
    </button>
  )
}

// ─── Section editors ──────────────────────────────────────────────────────────

function TrustStripEditor({
  data, onChange,
}: { data: Extract<LandingSection, { kind: "trust-strip" }>; onChange: (d: Extract<LandingSection, { kind: "trust-strip" }>) => void }) {
  function update(i: number, field: keyof TrustMetric, v: string) {
    const metrics = data.metrics.map((m, idx) => idx === i ? { ...m, [field]: v } : m)
    onChange({ ...data, metrics })
  }
  function add() { onChange({ ...data, metrics: [...data.metrics, { value: "", label: "" }] }) }
  function del(i: number) { onChange({ ...data, metrics: data.metrics.filter((_, idx) => idx !== i) }) }

  return (
    <div className="space-y-2">
      {data.metrics.map((m, i) => (
        <Row key={i} onDelete={() => del(i)}>
          <F label="Value" value={m.value} onChange={v => update(i, "value", v)} placeholder="e.g. 500+" />
          <F label="Label" value={m.label} onChange={v => update(i, "label", v)} placeholder="e.g. Clients served" />
        </Row>
      ))}
      <AddBtn label="Add metric" onClick={add} />
    </div>
  )
}

function BenefitsGridEditor({
  data, onChange,
}: { data: Extract<LandingSection, { kind: "benefits-grid" }>; onChange: (d: Extract<LandingSection, { kind: "benefits-grid" }>) => void }) {
  function updateItem(i: number, field: keyof BenefitItem, v: string) {
    const items = data.items.map((it, idx) => idx === i ? { ...it, [field]: v } : it)
    onChange({ ...data, items })
  }
  function add() { onChange({ ...data, items: [...data.items, { icon: "✅", title: "", description: "" }] }) }
  function del(i: number) { onChange({ ...data, items: data.items.filter((_, idx) => idx !== i) }) }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <F label="Eyebrow" value={data.eyebrow ?? ""} onChange={v => onChange({ ...data, eyebrow: v })} placeholder="Optional chip label" />
        <F label="Section Title *" value={data.title} onChange={v => onChange({ ...data, title: v })} />
      </div>
      <p className="text-[11px] font-semibold text-gray-500 pt-1">Items</p>
      {data.items.map((it, i) => (
        <div key={i} className="bg-gray-50 border border-gray-200 rounded-lg p-2.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-gray-500">Item {i + 1}</span>
            <button onClick={() => del(i)} className="p-1 rounded text-red-400 hover:text-red-600 hover:bg-red-50">
              <Trash2 size={11} />
            </button>
          </div>
          <div className="grid grid-cols-12 gap-1.5">
            <div className="col-span-2"><F label="Icon" value={it.icon} onChange={v => updateItem(i, "icon", v)} placeholder="Emoji" /></div>
            <div className="col-span-5"><F label="Title" value={it.title} onChange={v => updateItem(i, "title", v)} /></div>
            <div className="col-span-5"><F label="Description" value={it.description} onChange={v => updateItem(i, "description", v)} /></div>
          </div>
        </div>
      ))}
      <AddBtn label="Add item" onClick={add} />
    </div>
  )
}

function ProcessTimelineEditor({
  data, onChange,
}: { data: Extract<LandingSection, { kind: "process-timeline" }>; onChange: (d: Extract<LandingSection, { kind: "process-timeline" }>) => void }) {
  function updateStep(i: number, field: keyof ProcessStep, v: string) {
    const steps = data.steps.map((s, idx) => idx === i ? { ...s, [field]: v } : s)
    onChange({ ...data, steps })
  }
  function add() { onChange({ ...data, steps: [...data.steps, { title: "", description: "" }] }) }
  function del(i: number) { onChange({ ...data, steps: data.steps.filter((_, idx) => idx !== i) }) }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <F label="Eyebrow" value={data.eyebrow ?? ""} onChange={v => onChange({ ...data, eyebrow: v })} placeholder="Optional" />
        <F label="Section Title *" value={data.title} onChange={v => onChange({ ...data, title: v })} />
      </div>
      <p className="text-[11px] font-semibold text-gray-500 pt-1">Steps</p>
      {data.steps.map((s, i) => (
        <Row key={i} onDelete={() => del(i)}>
          <F label={`Step ${i + 1} Title`} value={s.title} onChange={v => updateStep(i, "title", v)} />
          <F label="Description" value={s.description} onChange={v => updateStep(i, "description", v)} />
        </Row>
      ))}
      <AddBtn label="Add step" onClick={add} />
    </div>
  )
}

function CaseStudiesEditor({
  data, onChange,
}: { data: Extract<LandingSection, { kind: "case-studies" }>; onChange: (d: Extract<LandingSection, { kind: "case-studies" }>) => void }) {
  function updateItem(i: number, field: keyof CaseStudy, v: string) {
    const items = data.items.map((it, idx) => idx === i ? { ...it, [field]: v } : it)
    onChange({ ...data, items })
  }
  function add() { onChange({ ...data, items: [...data.items, { client: "", result: "" }] }) }
  function del(i: number) { onChange({ ...data, items: data.items.filter((_, idx) => idx !== i) }) }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <F label="Eyebrow" value={data.eyebrow ?? ""} onChange={v => onChange({ ...data, eyebrow: v })} placeholder="Optional" />
        <F label="Section Title *" value={data.title} onChange={v => onChange({ ...data, title: v })} />
      </div>
      <p className="text-[11px] font-semibold text-gray-500 pt-1">Case Studies / Testimonials</p>
      {data.items.map((it, i) => (
        <div key={i} className="bg-gray-50 border border-gray-200 rounded-lg p-2.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-gray-500">Entry {i + 1}</span>
            <button onClick={() => del(i)} className="p-1 rounded text-red-400 hover:text-red-600"><Trash2 size={11} /></button>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <F label="Client / Organisation" value={it.client} onChange={v => updateItem(i, "client", v)} />
            <F label="Location" value={it.location ?? ""} onChange={v => updateItem(i, "location", v)} placeholder="Optional" />
            <F label="Result (1 sentence)" value={it.result} onChange={v => updateItem(i, "result", v)} />
            <F label="Quote" value={it.quote ?? ""} onChange={v => updateItem(i, "quote", v)} placeholder="Optional testimonial quote" />
          </div>
        </div>
      ))}
      <AddBtn label="Add testimonial" onClick={add} />
    </div>
  )
}

function RecommendedProductsEditor({
  data, onChange,
}: { data: Extract<LandingSection, { kind: "recommended-products" }>; onChange: (d: Extract<LandingSection, { kind: "recommended-products" }>) => void }) {
  const slugsStr = (data.slugs ?? []).join(", ")
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <F label="Eyebrow" value={data.eyebrow ?? ""} onChange={v => onChange({ ...data, eyebrow: v })} placeholder="Optional" />
        <F label="Section Title" value={data.title ?? ""} onChange={v => onChange({ ...data, title: v })} placeholder="e.g. Our Products" />
      </div>
      <F label="Product Slugs (comma-separated)" value={slugsStr}
        onChange={v => onChange({ ...data, slugs: v.split(",").map(s => s.trim()).filter(Boolean) })}
        placeholder="e.g. thermal-and-cold-fogging-machine-100xtfs50, ..." />
      <F label="Category Filter (or leave blank to use slugs)" value={data.categoryFilter ?? ""}
        onChange={v => onChange({ ...data, categoryFilter: v || undefined })}
        placeholder="e.g. thermal-fogging" />
      <F label="Limit" value={String(data.limit ?? "")}
        onChange={v => onChange({ ...data, limit: v ? parseInt(v) || undefined : undefined })}
        placeholder="e.g. 3" />
    </div>
  )
}

function ComparisonTableEditor({
  data, onChange,
}: { data: Extract<LandingSection, { kind: "comparison-table" }>; onChange: (d: Extract<LandingSection, { kind: "comparison-table" }>) => void }) {
  function updateCol(i: number, v: string) {
    const columns = data.columns.map((c, idx) => idx === i ? v : c)
    onChange({ ...data, columns })
  }
  function addCol() { onChange({ ...data, columns: [...data.columns, "Column"], rows: data.rows.map(r => ({ ...r, cells: [...r.cells, ""] })) }) }
  function delCol(i: number) {
    onChange({ ...data, columns: data.columns.filter((_, idx) => idx !== i), rows: data.rows.map(r => ({ ...r, cells: r.cells.filter((_, idx) => idx !== i) })) })
  }
  function updateRow(ri: number, field: keyof Omit<ComparisonRow, "cells">, v: string) {
    const rows = data.rows.map((r, idx) => idx === ri ? { ...r, [field]: v } : r)
    onChange({ ...data, rows })
  }
  function updateCell(ri: number, ci: number, v: string) {
    const rows = data.rows.map((r, idx) => idx === ri ? { ...r, cells: r.cells.map((c, cidx) => cidx === ci ? v : c) } : r)
    onChange({ ...data, rows })
  }
  function addRow() { onChange({ ...data, rows: [...data.rows, { label: "", cells: data.columns.map(() => "") }] }) }
  function delRow(i: number) { onChange({ ...data, rows: data.rows.filter((_, idx) => idx !== i) }) }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <F label="Eyebrow" value={data.eyebrow ?? ""} onChange={v => onChange({ ...data, eyebrow: v })} placeholder="Optional" />
        <F label="Section Title *" value={data.title} onChange={v => onChange({ ...data, title: v })} />
      </div>
      <div className="space-y-1">
        <p className="text-[11px] font-semibold text-gray-500">Columns</p>
        <div className="flex flex-wrap gap-1.5">
          {data.columns.map((c, i) => (
            <div key={i} className="flex items-center gap-1 bg-gray-100 rounded px-2 py-1">
              <input value={c} onChange={e => updateCol(i, e.target.value)}
                className="w-20 text-xs bg-transparent border-b border-gray-400 focus:outline-none focus:border-brand-500" />
              {data.columns.length > 1 && (
                <button onClick={() => delCol(i)} className="text-red-400 hover:text-red-600 ml-1"><Trash2 size={10} /></button>
              )}
            </div>
          ))}
          <AddBtn label="Add column" onClick={addCol} />
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-[11px] font-semibold text-gray-500">Rows</p>
        {data.rows.map((r, ri) => (
          <div key={ri} className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5">
            <input value={r.label} onChange={e => updateRow(ri, "label", e.target.value)}
              placeholder="Row label"
              className="w-28 text-xs border border-gray-200 rounded px-1.5 py-1 bg-white focus:outline-none focus:border-brand-400" />
            {r.cells.map((cell, ci) => (
              <input key={ci} value={cell} onChange={e => updateCell(ri, ci, e.target.value)}
                placeholder={data.columns[ci]}
                className="flex-1 min-w-0 text-xs border border-gray-200 rounded px-1.5 py-1 bg-white focus:outline-none focus:border-brand-400" />
            ))}
            <button onClick={() => delRow(ri)} className="p-1 rounded text-red-400 hover:text-red-600 shrink-0"><Trash2 size={11} /></button>
          </div>
        ))}
        <AddBtn label="Add row" onClick={addRow} />
      </div>
      <F label="Footnote (optional)" value={data.note ?? ""} onChange={v => onChange({ ...data, note: v || undefined })} placeholder="e.g. *Prices ex-GST" />
    </div>
  )
}

function RichTextEditor({
  data, onChange,
}: { data: Extract<LandingSection, { kind: "rich-text" }>; onChange: (d: Extract<LandingSection, { kind: "rich-text" }>) => void }) {
  function updatePara(i: number, v: string) {
    const paragraphs = data.paragraphs.map((p, idx) => idx === i ? v : p)
    onChange({ ...data, paragraphs })
  }
  function add() { onChange({ ...data, paragraphs: [...data.paragraphs, ""] }) }
  function del(i: number) { onChange({ ...data, paragraphs: data.paragraphs.filter((_, idx) => idx !== i) }) }

  return (
    <div className="space-y-2">
      <F label="Heading (H2) *" value={data.h2} onChange={v => onChange({ ...data, h2: v })} />
      <p className="text-[11px] font-semibold text-gray-500 pt-1">Paragraphs</p>
      {data.paragraphs.map((p, i) => (
        <div key={i} className="flex items-start gap-2">
          <textarea value={p} onChange={e => updatePara(i, e.target.value)}
            rows={2}
            placeholder={`Paragraph ${i + 1}`}
            className="flex-1 px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/30 resize-y" />
          {data.paragraphs.length > 1 && (
            <button onClick={() => del(i)} className="p-1.5 rounded text-red-400 hover:text-red-600 hover:bg-red-50 shrink-0 mt-0.5">
              <Trash2 size={12} />
            </button>
          )}
        </div>
      ))}
      <AddBtn label="Add paragraph" onClick={add} />
    </div>
  )
}

function CtaBandEditor({
  data, onChange,
}: { data: Extract<LandingSection, { kind: "cta-band" }>; onChange: (d: Extract<LandingSection, { kind: "cta-band" }>) => void }) {
  const b = data.band
  function set(field: string, v: string) {
    if (field === "heading") onChange({ ...data, band: { ...b, heading: v } })
    else if (field === "sub") onChange({ ...data, band: { ...b, sub: v || undefined } })
    else if (field === "primaryLabel") onChange({ ...data, band: { ...b, primary: { ...b.primary, label: v } } })
    else if (field === "primaryHref") onChange({ ...data, band: { ...b, primary: { ...b.primary, href: v } } })
    else if (field === "secLabel") onChange({ ...data, band: { ...b, secondary: v ? { label: v, href: b.secondary?.href ?? "/" } : undefined } })
    else if (field === "secHref") onChange({ ...data, band: { ...b, secondary: b.secondary ? { ...b.secondary, href: v } : undefined } })
  }
  return (
    <div className="space-y-2">
      <F label="Heading *" value={b.heading} onChange={v => set("heading", v)} />
      <F label="Subtext" value={b.sub ?? ""} onChange={v => set("sub", v)} placeholder="Optional supporting copy" />
      <div className="grid grid-cols-2 gap-2">
        <F label="Primary CTA Label" value={b.primary.label} onChange={v => set("primaryLabel", v)} />
        <F label="Primary CTA URL" value={b.primary.href} onChange={v => set("primaryHref", v)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <F label="Secondary CTA Label (optional)" value={b.secondary?.label ?? ""} onChange={v => set("secLabel", v)} />
        <F label="Secondary CTA URL" value={b.secondary?.href ?? ""} onChange={v => set("secHref", v)} />
      </div>
    </div>
  )
}

function FaqSectionEditor({
  data, onChange,
}: { data: Extract<LandingSection, { kind: "faq" }>; onChange: (d: Extract<LandingSection, { kind: "faq" }>) => void }) {
  const faqs = data.faqs ?? []
  function update(i: number, field: keyof FaqEntry, v: string) {
    const next = faqs.map((f, idx) => idx === i ? { ...f, [field]: v } : f)
    onChange({ ...data, faqs: next })
  }
  function add() { onChange({ ...data, faqs: [...faqs, { q: "", a: "" }] }) }
  function del(i: number) { onChange({ ...data, faqs: faqs.filter((_, idx) => idx !== i) }) }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <F label="Eyebrow" value={data.eyebrow ?? ""} onChange={v => onChange({ ...data, eyebrow: v })} placeholder="Optional" />
        <F label="Section Title" value={data.title ?? ""} onChange={v => onChange({ ...data, title: v })} placeholder="e.g. FAQs" />
      </div>
      <p className="text-[11px] text-gray-500">
        {faqs.length === 0
          ? "No inline FAQs — section will use the page-level FAQs tab."
          : `${faqs.length} inline FAQ(s) — these override the page FAQs tab for this section.`}
      </p>
      {faqs.map((f, i) => (
        <div key={i} className="bg-gray-50 border border-gray-200 rounded-lg p-2.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-gray-500">FAQ {i + 1}</span>
            <button onClick={() => del(i)} className="p-1 rounded text-red-400 hover:text-red-600"><Trash2 size={11} /></button>
          </div>
          <F label="Question" value={f.q} onChange={v => update(i, "q", v)} />
          <F label="Answer" value={f.a} onChange={v => update(i, "a", v)} as="textarea" rows={2} />
        </div>
      ))}
      <AddBtn label="Add FAQ" onClick={add} />
    </div>
  )
}

function FormSectionEditor({
  data, onChange,
}: { data: Extract<LandingSection, { kind: "form" }>; onChange: (d: Extract<LandingSection, { kind: "form" }>) => void }) {
  const checklist = data.checklist ?? []
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-gray-600">Form Variant</label>
          <select value={data.variant}
            onChange={e => onChange({ ...data, variant: e.target.value as LandingFormVariant })}
            className="w-full px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/30">
            {FORM_VARIANTS.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <F label="Eyebrow" value={data.eyebrow ?? ""} onChange={v => onChange({ ...data, eyebrow: v })} placeholder="Optional" />
      </div>
      <F label="Form Title *" value={data.title} onChange={v => onChange({ ...data, title: v })} />
      <F label="Subtext" value={data.sub ?? ""} onChange={v => onChange({ ...data, sub: v || undefined })} placeholder="Optional subtext" />
      <div className="space-y-1">
        <p className="text-[11px] font-semibold text-gray-600">Checklist (optional bullets shown next to form)</p>
        {checklist.map((item, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <input value={item} onChange={e => {
              const next = checklist.map((c, idx) => idx === i ? e.target.value : c)
              onChange({ ...data, checklist: next })
            }} className="flex-1 px-2.5 py-1 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-400" />
            <button onClick={() => onChange({ ...data, checklist: checklist.filter((_, idx) => idx !== i) })}
              className="p-1 rounded text-red-400 hover:text-red-600"><Trash2 size={11} /></button>
          </div>
        ))}
        <AddBtn label="Add bullet" onClick={() => onChange({ ...data, checklist: [...checklist, ""] })} />
      </div>
    </div>
  )
}

function VideoEditor({
  data, onChange,
}: { data: Extract<LandingSection, { kind: "video" }>; onChange: (d: Extract<LandingSection, { kind: "video" }>) => void }) {
  return (
    <div className="space-y-2">
      <F label="YouTube URL *" value={data.url} onChange={v => onChange({ ...data, url: v })}
        placeholder="https://www.youtube.com/watch?v=..." />
      <div className="grid grid-cols-2 gap-2">
        <F label="Title (optional)" value={data.title ?? ""} onChange={v => onChange({ ...data, title: v || undefined })} />
        <F label="Description (optional)" value={data.description ?? ""} onChange={v => onChange({ ...data, description: v || undefined })} />
      </div>
      {data.url && !data.url.includes("youtube.com") && !data.url.includes("youtu.be") && (
        <p className="text-[11px] text-amber-600 flex items-center gap-1">
          <AlertCircle size={11} />Only YouTube URLs are supported.
        </p>
      )}
    </div>
  )
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

function SectionEditor({ section, onChange }: { section: LandingSection; onChange: (s: LandingSection) => void }) {
  switch (section.kind) {
    case "trust-strip":          return <TrustStripEditor data={section} onChange={onChange} />
    case "benefits-grid":        return <BenefitsGridEditor data={section} onChange={onChange} />
    case "process-timeline":     return <ProcessTimelineEditor data={section} onChange={onChange} />
    case "case-studies":         return <CaseStudiesEditor data={section} onChange={onChange} />
    case "recommended-products": return <RecommendedProductsEditor data={section} onChange={onChange} />
    case "comparison-table":     return <ComparisonTableEditor data={section} onChange={onChange} />
    case "rich-text":            return <RichTextEditor data={section} onChange={onChange} />
    case "cta-band":             return <CtaBandEditor data={section} onChange={onChange} />
    case "faq":                  return <FaqSectionEditor data={section} onChange={onChange} />
    case "form":                 return <FormSectionEditor data={section} onChange={onChange} />
    case "video":                return <VideoEditor data={section} onChange={onChange} />
    default:                     return <p className="text-xs text-gray-400">Unknown section kind: {(section as { kind: string }).kind}</p>
  }
}

// ─── Add section modal ────────────────────────────────────────────────────────

function AddSectionModal({ onAdd, onClose }: { onAdd: (s: LandingSection) => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900">Add Section</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 grid grid-cols-1 gap-2">
          {SECTION_TYPES.map(t => (
            <button key={t.kind} onClick={() => { onAdd(makeSection(t.kind)); onClose() }}
              className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-brand-400 hover:bg-brand-50/50 text-left transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-900">{t.label}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{t.description}</p>
              </div>
              <ChevronRight size={14} className="text-gray-300 shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function SectionsTab({
  sections,
  setSections,
  pageType,
}: {
  sections: LandingSection[]
  setSections: (s: LandingSection[]) => void
  pageType: string
}) {
  const [expanded, setExpanded] = useState<number | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  if (pageType === "product") {
    return (
      <div className="py-10 text-center text-gray-500">
        <AlertCircle size={28} className="mx-auto mb-3 text-gray-300" />
        <p className="text-sm font-medium text-gray-700">Section editing unavailable for legacy product pages</p>
        <p className="text-xs text-gray-400 mt-2 max-w-sm mx-auto">
          These pages use <code className="bg-gray-100 px-1 rounded">content1/2/3</code> fields rendered by the legacy ProductPage component.
          Section editing is available for gem, state, use-case, comparison, and guide pages.
        </p>
      </div>
    )
  }

  function updateSection(i: number, s: LandingSection) {
    setSections(sections.map((sec, idx) => idx === i ? s : sec))
  }

  function deleteSection(i: number) {
    if (!window.confirm("Delete this section?")) return
    setSections(sections.filter((_, idx) => idx !== i))
    if (expanded === i) setExpanded(null)
    else if (expanded !== null && expanded > i) setExpanded(expanded - 1)
  }

  function duplicateSection(i: number) {
    const copy = JSON.parse(JSON.stringify(sections[i])) as LandingSection
    const next = [...sections]
    next.splice(i + 1, 0, copy)
    setSections(next)
    setExpanded(i + 1)
  }

  function moveUp(i: number) {
    if (i === 0) return
    const next = [...sections]
    ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
    setSections(next)
    if (expanded === i) setExpanded(i - 1)
    else if (expanded === i - 1) setExpanded(i)
  }

  function moveDown(i: number) {
    if (i === sections.length - 1) return
    const next = [...sections]
    ;[next[i], next[i + 1]] = [next[i + 1], next[i]]
    setSections(next)
    if (expanded === i) setExpanded(i + 1)
    else if (expanded === i + 1) setExpanded(i)
  }

  return (
    <div className="space-y-3">
      {sections.length === 0 && (
        <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl py-10 text-center">
          <p className="text-sm font-medium text-gray-500">No sections — click Add Section to start building.</p>
          <p className="text-xs text-gray-400 mt-1">Sections stored here replace the static registry sections after saving.</p>
        </div>
      )}

      {sections.map((s, i) => {
        const isOpen = expanded === i
        return (
          <div key={i} className={`border rounded-xl overflow-hidden transition-colors ${isOpen ? "border-brand-400 shadow-sm" : "border-gray-200"}`}>
            {/* Section header */}
            <div className={`flex items-center gap-2 px-4 py-3 ${isOpen ? "bg-brand-50" : "bg-white hover:bg-gray-50/60"} transition-colors`}>
              {/* Reorder */}
              <div className="flex flex-col gap-0.5 shrink-0">
                <button onClick={() => moveUp(i)} disabled={i === 0}
                  className="p-0.5 rounded text-gray-300 hover:text-gray-600 disabled:opacity-20"><ChevronUp size={12} /></button>
                <button onClick={() => moveDown(i)} disabled={i === sections.length - 1}
                  className="p-0.5 rounded text-gray-300 hover:text-gray-600 disabled:opacity-20"><ChevronDown size={12} /></button>
              </div>

              {/* Kind badge */}
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 shrink-0">
                {SECTION_LABEL[s.kind] ?? s.kind}
              </span>

              {/* Preview text — expands button */}
              <button onClick={() => setExpanded(isOpen ? null : i)}
                className="flex-1 text-left min-w-0">
                <p className="text-xs text-gray-700 truncate">{sectionPreview(s)}</p>
              </button>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => duplicateSection(i)}
                  title="Duplicate"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors">
                  <Copy size={12} />
                </button>
                <button onClick={() => deleteSection(i)}
                  title="Delete"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                  <Trash2 size={12} />
                </button>
                <button onClick={() => setExpanded(isOpen ? null : i)}
                  className={`p-1.5 rounded-lg transition-colors ${isOpen ? "text-brand-600" : "text-gray-400 hover:text-gray-700"}`}>
                  <ChevronRight size={12} className={`transition-transform ${isOpen ? "rotate-90" : ""}`} />
                </button>
              </div>
            </div>

            {/* Expanded editor */}
            {isOpen && (
              <div className="px-4 py-4 border-t border-gray-100 bg-white">
                <SectionEditor section={s} onChange={ns => updateSection(i, ns)} />
              </div>
            )}
          </div>
        )
      })}

      <button onClick={() => setShowAdd(true)}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm font-medium text-gray-500 hover:border-brand-400 hover:text-brand-600 hover:bg-brand-50/30 transition-colors">
        <Plus size={15} />Add Section
      </button>

      <p className="text-[10px] text-gray-400 text-center">
        {sections.length} section{sections.length !== 1 ? "s" : ""} ·
        Saving stores these sections as an override — "Revert to Registry" clears them
      </p>

      {showAdd && <AddSectionModal onAdd={s => setSections([...sections, s])} onClose={() => setShowAdd(false)} />}
    </div>
  )
}
