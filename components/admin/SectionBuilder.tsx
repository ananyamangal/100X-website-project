"use client"
import { useState } from "react"
import { Plus, Eye, EyeOff, Trash2, Copy, ArrowUp, ArrowDown, ChevronDown, ChevronRight, LayoutTemplate } from "lucide-react"
import { Button } from "@/components/ui/button"

export type SectionType =
  | 'hero' | 'features' | 'applications' | 'specifications' | 'gallery' | 'video'
  | 'faq' | 'metrics' | 'certifications' | 'case-study' | 'downloads' | 'reviews'
  | 'comparison' | 'dealer-network' | 'warranty' | 'custom'

export interface ProductSection {
  id: string
  type: SectionType
  title?: string
  hidden?: boolean
  order: number
  contentDefaults?: Record<string, unknown>
}

const SECTION_META: Record<SectionType, { label: string; icon: string; description: string; color: string }> = {
  hero:           { label: 'Hero',           icon: '🖼️', description: 'Main product banner with CTAs',      color: 'bg-purple-50 border-purple-200 text-purple-700' },
  features:       { label: 'Features',       icon: '⚡', description: 'Feature cards with icons/values',    color: 'bg-blue-50 border-blue-200 text-blue-700' },
  applications:   { label: 'Applications',   icon: '🎯', description: 'Use-case / industry applications',   color: 'bg-green-50 border-green-200 text-green-700' },
  specifications: { label: 'Specifications', icon: '📋', description: 'Technical spec table by group',      color: 'bg-orange-50 border-orange-200 text-orange-700' },
  gallery:        { label: 'Gallery',        icon: '🖼️', description: 'Image gallery grid or carousel',     color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
  video:          { label: 'Video',          icon: '🎬', description: 'Product demo video embed',           color: 'bg-red-50 border-red-200 text-red-700' },
  faq:            { label: 'FAQ',            icon: '❓', description: 'Accordion FAQ section',              color: 'bg-sky-50 border-sky-200 text-sky-700' },
  metrics:        { label: 'Metrics',        icon: '📊', description: 'Key performance stat cards',         color: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
  certifications: { label: 'Certifications', icon: '🛡️', description: 'Certification badges & logos',      color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
  'case-study':   { label: 'Case Study',     icon: '📁', description: 'Customer case study block',          color: 'bg-teal-50 border-teal-200 text-teal-700' },
  downloads:      { label: 'Downloads',      icon: '📥', description: 'Brochure, datasheet downloads',      color: 'bg-slate-50 border-slate-200 text-slate-700' },
  reviews:        { label: 'Reviews',        icon: '⭐', description: 'Customer testimonials / ratings',    color: 'bg-amber-50 border-amber-200 text-amber-700' },
  comparison:     { label: 'Comparison',     icon: '⚖️', description: 'Side-by-side product comparison',   color: 'bg-violet-50 border-violet-200 text-violet-700' },
  'dealer-network':{ label: 'Dealer Network',icon: '🗺️', description: 'Pan-India dealer network map',      color: 'bg-cyan-50 border-cyan-200 text-cyan-700' },
  warranty:       { label: 'Warranty',       icon: '🔧', description: 'Warranty terms and support info',    color: 'bg-rose-50 border-rose-200 text-rose-700' },
  custom:         { label: 'Custom Block',   icon: '📝', description: 'Free-form rich text / media block',  color: 'bg-gray-50 border-gray-200 text-gray-700' },
}

function genId() {
  return `sec-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

interface Props {
  value: ProductSection[]
  onChange: (sections: ProductSection[]) => void
  onOpenTemplates?: () => void
}

export function SectionBuilder({ value, onChange, onOpenTemplates }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showAddMenu, setShowAddMenu] = useState(false)

  const sections = value || []

  const push = (next: ProductSection[]) => onChange(next.map((s, i) => ({ ...s, order: i })))

  const addSection = (type: SectionType) => {
    const meta = SECTION_META[type]
    const next: ProductSection = {
      id: genId(),
      type,
      title: meta.label,
      hidden: false,
      order: sections.length,
      contentDefaults: {},
    }
    push([...sections, next])
    setShowAddMenu(false)
    setExpandedId(next.id)
  }

  const toggleHidden = (id: string) => push(sections.map(s => s.id === id ? { ...s, hidden: !s.hidden } : s))

  const remove = (id: string) => push(sections.filter(s => s.id !== id))

  const duplicate = (sec: ProductSection) => {
    const idx = sections.findIndex(s => s.id === sec.id)
    const copy = { ...sec, id: genId(), title: (sec.title || '') + ' (copy)' }
    const next = [...sections.slice(0, idx + 1), copy, ...sections.slice(idx + 1)]
    push(next)
  }

  const move = (id: string, dir: 'up' | 'down') => {
    const idx = sections.findIndex(s => s.id === id)
    if (idx === -1 || (dir === 'up' && idx === 0) || (dir === 'down' && idx === sections.length - 1)) return
    const next = [...sections]
    const swap = dir === 'up' ? idx - 1 : idx + 1
    ;[next[idx], next[swap]] = [next[swap], next[idx]]
    push(next)
  }

  const updateTitle = (id: string, title: string) => push(sections.map(s => s.id === id ? { ...s, title } : s))

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <label className="block text-sm font-medium text-gray-700">
          Page Sections
          <span className="ml-2 text-xs font-normal text-gray-400">({sections.length} sections)</span>
        </label>
        <div className="flex gap-2">
          {onOpenTemplates && (
            <Button type="button" variant="outline" size="sm" onClick={onOpenTemplates} className="text-xs h-7">
              <LayoutTemplate size={11} className="mr-1" />Templates
            </Button>
          )}
          <div className="relative">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowAddMenu(!showAddMenu)} className="text-xs h-7">
              <Plus size={11} className="mr-1" />Add Section
            </Button>
            {showAddMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowAddMenu(false)} />
                <div className="absolute right-0 top-8 z-20 w-56 bg-white border border-gray-200 rounded-lg shadow-lg py-1 max-h-80 overflow-y-auto">
                  {(Object.entries(SECTION_META) as [SectionType, typeof SECTION_META[SectionType]][]).map(([type, meta]) => (
                    <button key={type} type="button"
                      onClick={() => addSection(type)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-gray-50"
                    >
                      <span className="text-base flex-shrink-0">{meta.icon}</span>
                      <div>
                        <div className="text-xs font-medium text-gray-800">{meta.label}</div>
                        <div className="text-[10px] text-gray-400 leading-tight">{meta.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {sections.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-gray-200 rounded-lg bg-gray-50">
          <p className="text-xs text-gray-400 mb-2">No sections defined yet.</p>
          <p className="text-[11px] text-gray-300">Use "Add Section" or "Templates" to get started.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {sections.map((sec, idx) => {
            const meta = SECTION_META[sec.type]
            const isExpanded = expandedId === sec.id
            return (
              <div key={sec.id} className={`border rounded-lg overflow-hidden ${sec.hidden ? 'opacity-50' : ''}`}>
                {/* Header row */}
                <div
                  className={`flex items-center gap-2 px-3 py-2 cursor-pointer ${meta.color}`}
                  onClick={() => setExpandedId(isExpanded ? null : sec.id)}
                >
                  {/* Expand/collapse */}
                  {isExpanded ? <ChevronDown size={12} className="flex-shrink-0" /> : <ChevronRight size={12} className="flex-shrink-0" />}
                  {/* Move arrows */}
                  <div className="flex flex-col gap-px flex-shrink-0" onClick={e => e.stopPropagation()}>
                    <button type="button" onClick={() => move(sec.id, 'up')} disabled={idx === 0} className="opacity-60 hover:opacity-100 disabled:opacity-20"><ArrowUp size={9} /></button>
                    <button type="button" onClick={() => move(sec.id, 'down')} disabled={idx === sections.length - 1} className="opacity-60 hover:opacity-100 disabled:opacity-20"><ArrowDown size={9} /></button>
                  </div>
                  <span className="text-sm flex-shrink-0">{meta.icon}</span>
                  <span className="text-xs font-semibold flex-1 truncate">
                    {sec.title || meta.label}
                  </span>
                  <span className="text-[10px] opacity-60 flex-shrink-0">{meta.label}</span>
                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0 ml-1" onClick={e => e.stopPropagation()}>
                    <button type="button" onClick={() => toggleHidden(sec.id)} className="p-0.5 opacity-60 hover:opacity-100" title={sec.hidden ? 'Show' : 'Hide'}>
                      {sec.hidden ? <EyeOff size={12} /> : <Eye size={12} />}
                    </button>
                    <button type="button" onClick={() => duplicate(sec)} className="p-0.5 opacity-60 hover:opacity-100"><Copy size={12} /></button>
                    <button type="button" onClick={() => remove(sec.id)} className="p-0.5 opacity-60 hover:text-red-600"><Trash2 size={12} /></button>
                  </div>
                </div>
                {/* Expanded config */}
                {isExpanded && (
                  <div className="px-3 py-2 bg-white border-t border-gray-100 space-y-2">
                    <div>
                      <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Section Title</label>
                      <input
                        type="text"
                        value={sec.title || ''}
                        onChange={e => updateTitle(sec.id, e.target.value)}
                        className="mt-0.5 w-full text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
                        placeholder={meta.label}
                      />
                    </div>
                    <p className="text-[10px] text-gray-400">{meta.description}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
