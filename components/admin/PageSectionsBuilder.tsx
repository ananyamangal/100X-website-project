"use client"

import React, { useCallback, useEffect, useState } from "react"
import {
  ChevronDown, ChevronUp, GripVertical, Eye, EyeOff,
  Save, RotateCcw, CheckCircle, Loader2, AlertCircle, Image as ImageIcon, X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { ResolvedSection, SectionVariant } from "@/lib/pageSections"

// ── Types ─────────────────────────────────────────────────────────────────────

interface SectionDraft {
  isEnabled:        boolean
  order:            number
  variant:          string
  icon:             string
  heading:          string
  subheading:       string
  eyebrow:          string
  bgColor:          string
  bgImage:          string
  ctaText:          string
  ctaHref:          string
  ctaSecondaryText: string
  ctaSecondaryHref: string
  _id?:             string
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

const BG_OPTIONS = [
  { key: 'white',  label: 'White',  color: '#ffffff' },
  { key: 'gray',   label: 'Gray',   color: '#f3f4f6' },
  { key: 'dark',   label: 'Dark',   color: '#111827' },
  { key: 'green',  label: 'Green',  color: '#16a34a' },
  { key: 'brand',  label: 'Brand',  color: '#15803d' },
]

// Common emoji used in section icons — quick-pick palette
const ICON_PALETTE = [
  '🎬','🖼️','🏆','📦','⚙️','🏭','🏗️','⚡','📋','▶️',
  '🤝','⭐','🛡️','🎯','📰','❓','📢','🛒','📊','🎥',
  '📖','📸','📁','🔧','📥','🔗','🌟','💡','🚀','✅',
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function toDraft(s: ResolvedSection): SectionDraft {
  return {
    isEnabled:        s.isEnabled,
    order:            s.order,
    variant:          s.variant,
    icon:             s.icon,
    heading:          s.heading,
    subheading:       s.subheading,
    eyebrow:          s.eyebrow,
    bgColor:          s.bgColor,
    bgImage:          s.bgImage,
    ctaText:          s.ctaText,
    ctaHref:          s.ctaHref,
    ctaSecondaryText: s.ctaSecondaryText,
    ctaSecondaryHref: s.ctaSecondaryHref,
    _id:              undefined,
  }
}

// ── ImageField — URL input with live preview ───────────────────────────────────

function ImageField({
  label,
  hint,
  value,
  onChange,
}: {
  label:    string
  hint?:    string
  value:    string
  onChange: (v: string) => void
}) {
  const [inputVal, setInputVal] = useState(value)
  const [previewErr, setPreviewErr] = useState(false)

  // Sync when draft resets
  useEffect(() => { setInputVal(value); setPreviewErr(false) }, [value])

  const commit = () => {
    onChange(inputVal.trim())
    setPreviewErr(false)
  }

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      {hint && <p className="text-[10px] text-gray-400 mb-1.5">{hint}</p>}

      {/* Preview */}
      {inputVal && !previewErr ? (
        <div className="relative w-full rounded-lg overflow-hidden border border-gray-200 bg-gray-100 mb-2" style={{ height: 120 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={inputVal}
            alt=""
            className="w-full h-full object-cover"
            onError={() => setPreviewErr(true)}
          />
          <button
            onClick={() => { onChange(''); setInputVal(''); setPreviewErr(false) }}
            className="absolute top-1.5 right-1.5 bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition-colors"
            title="Remove image"
          >
            <X size={12} />
          </button>
        </div>
      ) : previewErr ? (
        <div className="w-full rounded-lg border border-red-200 bg-red-50 flex items-center gap-2 px-3 py-2 mb-2 text-xs text-red-600">
          <AlertCircle size={12} /> Image URL could not load — check the URL
        </div>
      ) : null}

      <div className="flex gap-2">
        <Input
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onBlur={commit}
          onKeyDown={e => e.key === 'Enter' && commit()}
          placeholder="https://res.cloudinary.com/… or /image.jpg"
          className="text-xs flex-1"
        />
        {inputVal !== value && (
          <button
            onClick={commit}
            className="px-3 py-1.5 bg-brand-600 text-white text-xs rounded-lg hover:bg-brand-500"
          >
            Apply
          </button>
        )}
      </div>
    </div>
  )
}

// ── IconPicker ────────────────────────────────────────────────────────────────

function IconPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const [custom, setCustom] = useState('')

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">Section Icon</label>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setOpen(o => !o)}
          className="w-10 h-10 text-xl bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-200 flex items-center justify-center transition-colors"
          title="Pick emoji"
        >
          {value || '?'}
        </button>
        <input
          value={custom}
          onChange={e => setCustom(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && custom.trim()) { onChange(custom.trim()); setCustom(''); setOpen(false) } }}
          placeholder="Paste emoji or type…"
          className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-400 w-44"
        />
      </div>

      {open && (
        <div className="mt-2 flex flex-wrap gap-1 bg-white border border-gray-200 rounded-xl p-3 shadow-md max-w-xs">
          {ICON_PALETTE.map(e => (
            <button
              key={e}
              onClick={() => { onChange(e); setOpen(false) }}
              className={`w-8 h-8 text-base hover:bg-brand-50 rounded-lg flex items-center justify-center transition-colors ${value === e ? 'bg-brand-100 ring-1 ring-brand-400' : ''}`}
            >
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── SectionRow ────────────────────────────────────────────────────────────────

interface SectionRowProps {
  section:     ResolvedSection
  pageKey:     string
  index:       number
  total:       number
  onDragStart: (index: number) => void
  onDragOver:  (index: number) => void
  onDrop:      () => void
  isDragging:  boolean
  isOver:      boolean
  onReorder:   (fromIndex: number, direction: 'up' | 'down') => void
}

function SectionRow({ section, pageKey, index, total, onDragStart, onDragOver, onDrop, isDragging, isOver, onReorder }: SectionRowProps) {
  const [expanded, setExpanded] = useState(false)
  const [draft, setDraft]       = useState<SectionDraft>(toDraft(section))
  const [status, setStatus]     = useState<SaveStatus>('idle')

  const set = (field: keyof SectionDraft, value: unknown) => {
    setDraft(d => ({ ...d, [field]: value }))
    setStatus('idle')
  }

  const save = async () => {
    setStatus('saving')
    try {
      const res = await fetch(`/api/admin/page-sections/by-key`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, pageKey, sectionKey: section.key }),
      })
      if (!res.ok) throw new Error("Save failed")
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 3000)
    } catch {
      setStatus('error')
    }
  }

  const reset = () => {
    setDraft(toDraft(section))
    setStatus('idle')
  }

  const toggleEnabled = async () => {
    const next = !draft.isEnabled
    setDraft(d => ({ ...d, isEnabled: next }))
    await fetch(`/api/admin/page-sections/by-key`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageKey, sectionKey: section.key, isEnabled: next }),
    })
  }

  const variants: SectionVariant[] = section.def.variants
  const hasImageFields = section.def.fields.some(f => f.type === 'image')

  const rowBg = isOver
    ? "bg-brand-50 border-brand-300"
    : isDragging
    ? "opacity-40 border-gray-200"
    : "bg-white border-gray-200"

  return (
    <div
      className={`rounded-xl border shadow-sm overflow-hidden transition-all ${rowBg}`}
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={e => { e.preventDefault(); onDragOver(index) }}
      onDrop={onDrop}
    >
      {/* Row header */}
      <div className="flex items-center gap-2 px-4 py-3">
        <GripVertical size={14} className="text-gray-300 cursor-grab flex-shrink-0" />

        {/* Move up/down */}
        <div className="flex flex-col gap-0.5 flex-shrink-0">
          <button onClick={() => onReorder(index, 'up')} disabled={index === 0}
            className="text-gray-300 hover:text-gray-500 disabled:opacity-20 transition-colors">
            <ChevronUp size={12} />
          </button>
          <button onClick={() => onReorder(index, 'down')} disabled={index === total - 1}
            className="text-gray-300 hover:text-gray-500 disabled:opacity-20 transition-colors">
            <ChevronDown size={12} />
          </button>
        </div>

        {/* Icon */}
        <span className="text-base flex-shrink-0 select-none">{draft.icon}</span>

        {/* Label + description */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 leading-tight">{section.label}</p>
          <p className="text-[11px] text-gray-400 truncate">{section.def.description}</p>
        </div>

        {/* Image indicator */}
        {draft.bgImage && (
          <span title="Has background image" className="flex-shrink-0 text-[10px] font-medium bg-indigo-50 text-indigo-600 border border-indigo-200 px-2 py-0.5 rounded-full">
            img
          </span>
        )}

        {/* Variant badge */}
        <span className="hidden sm:inline-flex text-[10px] font-medium bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full flex-shrink-0">
          {draft.variant}
        </span>

        {/* Required indicator */}
        {section.def.isRequired && (
          <span className="text-[10px] font-medium bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full flex-shrink-0">
            required
          </span>
        )}

        {/* Visibility toggle */}
        <button
          onClick={toggleEnabled}
          disabled={section.def.isRequired}
          title={draft.isEnabled ? "Visible" : "Hidden"}
          className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
            draft.isEnabled
              ? "bg-green-50 text-green-600 hover:bg-green-100"
              : "bg-gray-100 text-gray-400 hover:bg-gray-200"
          } disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {draft.isEnabled ? <Eye size={14} /> : <EyeOff size={14} />}
        </button>

        {/* Expand */}
        <button
          onClick={() => setExpanded(e => !e)}
          className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors text-gray-500"
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Expanded editor */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 py-4 space-y-5 bg-gray-50">

          {/* Icon picker */}
          <IconPicker value={draft.icon} onChange={v => set('icon', v)} />

          {/* Variant picker */}
          {variants.length > 1 && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Layout Variant</label>
              <div className="flex flex-wrap gap-2">
                {variants.map(v => (
                  <button
                    key={v.key}
                    onClick={() => set('variant', v.key)}
                    title={v.description}
                    className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                      draft.variant === v.key
                        ? "bg-brand-600 text-white border-brand-600"
                        : "bg-white text-gray-600 border-gray-200 hover:border-brand-400"
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-gray-400 mt-1">
                {variants.find(v => v.key === draft.variant)?.description}
              </p>
            </div>
          )}

          {/* Heading fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {section.def.defaultEyebrow !== undefined && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Eyebrow</label>
                <Input value={draft.eyebrow} onChange={e => set('eyebrow', e.target.value)}
                  placeholder={section.def.defaultEyebrow} className="text-xs" />
              </div>
            )}
            {section.def.defaultHeading !== undefined && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Heading</label>
                <Input value={draft.heading} onChange={e => set('heading', e.target.value)}
                  placeholder={section.def.defaultHeading} className="text-xs" />
              </div>
            )}
            {section.def.defaultSubheading !== undefined && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Subheading</label>
                <textarea
                  value={draft.subheading}
                  onChange={e => set('subheading', e.target.value)}
                  placeholder={section.def.defaultSubheading}
                  rows={2}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-400 resize-y bg-white"
                />
              </div>
            )}
          </div>

          {/* Image fields — rendered for every field of type 'image' in the section def */}
          {section.def.fields.filter(f => f.type === 'image').map(field => (
            <ImageField
              key={field.key}
              label={field.label}
              hint={field.hint}
              value={field.key === 'bgImage' ? draft.bgImage : (draft as any)[field.key] ?? ''}
              onChange={v => set(field.key === 'bgImage' ? 'bgImage' : field.key as any, v)}
            />
          ))}

          {/* CTA fields */}
          {section.def.fields.some(f => f.key.startsWith('cta')) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Primary CTA Text</label>
                <Input value={draft.ctaText} onChange={e => set('ctaText', e.target.value)}
                  placeholder="Get a Quote" className="text-xs" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Primary CTA URL</label>
                <Input value={draft.ctaHref} onChange={e => set('ctaHref', e.target.value)}
                  placeholder="/contact-us" className="text-xs" />
              </div>
              {section.def.fields.some(f => f.key === 'ctaSecondaryText') && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Secondary CTA Text</label>
                    <Input value={draft.ctaSecondaryText} onChange={e => set('ctaSecondaryText', e.target.value)}
                      placeholder="Browse Products" className="text-xs" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Secondary CTA URL</label>
                    <Input value={draft.ctaSecondaryHref} onChange={e => set('ctaSecondaryHref', e.target.value)}
                      placeholder="/products" className="text-xs" />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Background color */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">Background Color</label>
            <div className="flex gap-2 flex-wrap">
              {BG_OPTIONS.map(opt => (
                <button key={opt.key} onClick={() => set('bgColor', opt.key)} title={opt.label}
                  className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all ${
                    draft.bgColor === opt.key
                      ? "border-brand-600 ring-1 ring-brand-400"
                      : "border-gray-200 hover:border-gray-400"
                  }`}
                >
                  <span className="w-3 h-3 rounded-full border border-gray-300 flex-shrink-0"
                    style={{ background: opt.color }} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic content notice */}
          {section.def.isDynamic && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-[11px] text-blue-700">
              Content is pulled automatically from your catalog/customer list. Heading and layout overrides apply on top.
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-1">
            <button onClick={reset}
              className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 transition-colors">
              <RotateCcw size={12} />Reset to defaults
            </button>
            <div className="flex items-center gap-2">
              {status === 'error' && (
                <span className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle size={12} />Save failed
                </span>
              )}
              <Button onClick={save} disabled={status === 'saving'} size="sm"
                className="bg-brand-600 hover:bg-brand-500 text-white gap-1.5 text-xs">
                {status === 'saving' ? <><Loader2 size={12} className="animate-spin" />Saving…</>
                  : status === 'saved' ? <><CheckCircle size={12} />Saved</>
                  : <><Save size={12} />Save Section</>}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── PageSectionsBuilder ────────────────────────────────────────────────────────

interface PageSectionsBuilderProps {
  pageKey: 'homepage' | 'product'
}

export function PageSectionsBuilder({ pageKey }: PageSectionsBuilderProps) {
  const [sections, setSections] = useState<ResolvedSection[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState("")
  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)
  const [saving, setSaving]     = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setError("")
    try {
      const res  = await fetch(`/api/admin/page-sections?pageKey=${pageKey}`)
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Failed to load"); return }
      setSections(data.resolved)
    } catch { setError("Network error") }
    finally { setLoading(false) }
  }, [pageKey])

  useEffect(() => { load() }, [load])

  const reorder = async (newSections: ResolvedSection[]) => {
    const reindexed = newSections.map((s, i) => ({ ...s, order: (i + 1) * 10 }))
    setSections(reindexed)
    setSaving(true)
    try {
      await fetch("/api/admin/page-sections", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageKey,
          order: reindexed.map(s => ({ sectionKey: s.key, order: s.order })),
        }),
      })
    } finally { setSaving(false) }
  }

  const handleDrop = async () => {
    if (dragFrom === null || dragOver === null || dragFrom === dragOver) {
      setDragFrom(null); setDragOver(null); return
    }
    const next = [...sections]
    const [moved] = next.splice(dragFrom, 1)
    next.splice(dragOver, 0, moved)
    setDragFrom(null); setDragOver(null)
    await reorder(next)
  }

  const handleReorder = (index: number, direction: 'up' | 'down') => {
    const next = [...sections]
    const swap = direction === 'up' ? index - 1 : index + 1
    if (swap < 0 || swap >= next.length) return
    ;[next[index], next[swap]] = [next[swap], next[index]]
    reorder(next)
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          {sections.length} sections · drag or use arrows to reorder · click row to edit
        </p>
        <div className="flex items-center gap-2">
          {saving && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Loader2 size={12} className="animate-spin" />Saving order…
            </span>
          )}
          <button onClick={load}
            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
            <RotateCcw size={12} />Reload
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-14 bg-white border border-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {sections.map((section, index) => (
            <SectionRow
              key={section.key}
              section={section}
              pageKey={pageKey}
              index={index}
              total={sections.length}
              onDragStart={setDragFrom}
              onDragOver={setDragOver}
              onDrop={handleDrop}
              isDragging={dragFrom === index}
              isOver={dragOver === index}
              onReorder={handleReorder}
            />
          ))}
        </div>
      )}
    </div>
  )
}
