"use client"

import React, { useCallback, useEffect, useRef, useState } from "react"
import {
  ChevronDown, ChevronUp, GripVertical, Eye, EyeOff,
  Save, RotateCcw, CheckCircle, Loader2, AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { ResolvedSection, SectionVariant } from "@/lib/pageSections"

// ── Types ─────────────────────────────────────────────────────────────────────

interface SectionDraft {
  isEnabled:        boolean
  order:            number
  variant:          string
  heading:          string
  subheading:       string
  eyebrow:          string
  bgColor:          string
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

// ── Helpers ───────────────────────────────────────────────────────────────────

function toDraft(s: ResolvedSection): SectionDraft {
  return {
    isEnabled:        s.isEnabled,
    order:            s.order,
    variant:          s.variant,
    heading:          s.heading,
    subheading:       s.subheading,
    eyebrow:          s.eyebrow,
    bgColor:          s.bgColor,
    ctaText:          s.ctaText,
    ctaHref:          s.ctaHref,
    ctaSecondaryText: s.ctaSecondaryText,
    ctaSecondaryHref: s.ctaSecondaryHref,
    _id:              undefined,
  }
}

// ── SectionRow ─────────────────────────────────────────────────────────────────

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

  const reset = async () => {
    if (!draft._id) {
      setDraft(toDraft(section))
      return
    }
    // Find current _id from API — for simplicity just reset draft to section defaults
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

  const rowBg = isOver ? "bg-brand-50 border-brand-300" : isDragging ? "opacity-40 border-gray-200" : "bg-white border-gray-200"

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
        {/* Drag handle */}
        <GripVertical size={14} className="text-gray-300 cursor-grab flex-shrink-0" />

        {/* Move up/down */}
        <div className="flex flex-col gap-0.5 flex-shrink-0">
          <button
            onClick={() => onReorder(index, 'up')}
            disabled={index === 0}
            className="text-gray-300 hover:text-gray-500 disabled:opacity-20 transition-colors"
          >
            <ChevronUp size={12} />
          </button>
          <button
            onClick={() => onReorder(index, 'down')}
            disabled={index === total - 1}
            className="text-gray-300 hover:text-gray-500 disabled:opacity-20 transition-colors"
          >
            <ChevronDown size={12} />
          </button>
        </div>

        {/* Icon + label */}
        <span className="text-base flex-shrink-0">{section.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 leading-tight">{section.label}</p>
          <p className="text-[11px] text-gray-400 truncate">{section.def.description}</p>
        </div>

        {/* Variant badge */}
        <span className="hidden sm:inline-flex text-[10px] font-medium bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full flex-shrink-0">
          {draft.variant}
        </span>

        {/* isRequired indicator */}
        {section.def.isRequired && (
          <span className="text-[10px] font-medium bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full flex-shrink-0">
            required
          </span>
        )}

        {/* Toggle */}
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

        {/* Expand button */}
        <button
          onClick={() => setExpanded(e => !e)}
          className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors text-gray-500"
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Expanded editor */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 py-4 space-y-4 bg-gray-50">

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
                <Input
                  value={draft.eyebrow}
                  onChange={e => set('eyebrow', e.target.value)}
                  placeholder={section.def.defaultEyebrow}
                  className="text-xs"
                />
              </div>
            )}
            {section.def.defaultHeading !== undefined && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Heading</label>
                <Input
                  value={draft.heading}
                  onChange={e => set('heading', e.target.value)}
                  placeholder={section.def.defaultHeading}
                  className="text-xs"
                />
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

          {/* CTA fields */}
          {section.def.fields.some(f => f.key.startsWith('cta')) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Primary CTA Text</label>
                <Input
                  value={draft.ctaText}
                  onChange={e => set('ctaText', e.target.value)}
                  placeholder="Get a Quote"
                  className="text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Primary CTA URL</label>
                <Input
                  value={draft.ctaHref}
                  onChange={e => set('ctaHref', e.target.value)}
                  placeholder="/contact-us"
                  className="text-xs"
                />
              </div>
              {section.def.fields.some(f => f.key === 'ctaSecondaryText') && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Secondary CTA Text</label>
                    <Input
                      value={draft.ctaSecondaryText}
                      onChange={e => set('ctaSecondaryText', e.target.value)}
                      placeholder="Browse Products"
                      className="text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Secondary CTA URL</label>
                    <Input
                      value={draft.ctaSecondaryHref}
                      onChange={e => set('ctaSecondaryHref', e.target.value)}
                      placeholder="/products"
                      className="text-xs"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Background color */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">Background</label>
            <div className="flex gap-2 flex-wrap">
              {BG_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => set('bgColor', opt.key)}
                  title={opt.label}
                  className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all ${
                    draft.bgColor === opt.key
                      ? "border-brand-600 ring-1 ring-brand-400"
                      : "border-gray-200 hover:border-gray-400"
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full border border-gray-300 flex-shrink-0"
                    style={{ background: opt.color }}
                  />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic content notice */}
          {section.def.isDynamic && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-[11px] text-blue-700">
              Content for this section is managed automatically from your product catalog, customer list, or other dynamic sources.
              Heading and layout overrides apply on top.
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={reset}
              className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 transition-colors"
            >
              <RotateCcw size={12} />
              Reset to defaults
            </button>
            <div className="flex items-center gap-2">
              {status === 'error' && (
                <span className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle size={12} />Save failed
                </span>
              )}
              <Button
                onClick={save}
                disabled={status === 'saving'}
                size="sm"
                className="bg-brand-600 hover:bg-brand-500 text-white gap-1.5 text-xs"
              >
                {status === 'saving' ? (
                  <><Loader2 size={12} className="animate-spin" />Saving…</>
                ) : status === 'saved' ? (
                  <><CheckCircle size={12} />Saved</>
                ) : (
                  <><Save size={12} />Save Section</>
                )}
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

  // Move item in local state and persist order to DB
  const reorder = async (newSections: ResolvedSection[]) => {
    const reindexed = newSections.map((s, i) => ({
      ...s,
      order: (i + 1) * 10,
    }))
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
      setDragFrom(null); setDragOver(null)
      return
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
    if (swap < 0 || swap >= next.length) return;
    [next[index], next[swap]] = [next[swap], next[index]]
    reorder(next)
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          {sections.length} sections · drag rows or use arrows to reorder
        </p>
        <div className="flex items-center gap-2">
          {saving && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Loader2 size={12} className="animate-spin" />Saving order…
            </span>
          )}
          <button
            onClick={load}
            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
          >
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
