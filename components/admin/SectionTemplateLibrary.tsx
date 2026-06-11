"use client"
import { useState, useEffect } from "react"
import { X, RefreshCw, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ProductSection, SectionType } from "./SectionBuilder"

interface Template {
  _id: string
  name: string
  type: SectionType
  category: string
  description: string
  icon: string
  contentDefaults?: Record<string, unknown>
}

const CATEGORY_LABELS: Record<string, string> = {
  industrial: 'Industrial',
  government: 'Government',
  agriculture: 'Agriculture',
  technology: 'Technology',
  corporate: 'Corporate',
}

function genId() {
  return `sec-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

interface Props {
  open: boolean
  onClose: () => void
  onUseTemplate: (section: ProductSection) => void
}

export function SectionTemplateLibrary({ open, onClose, onUseTemplate }: Props) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const [activeCategory, setActiveCategory] = useState('all')
  const [search, setSearch] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/product-section-templates')
      if (res.ok) setTemplates(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) load()
  }, [open])

  const seed = async () => {
    setSeeding(true)
    try {
      const res = await fetch('/api/admin/product-section-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seed' }),
      })
      if (res.ok) await load()
    } finally {
      setSeeding(false)
    }
  }

  const applyTemplate = (t: Template) => {
    const section: ProductSection = {
      id: genId(),
      type: t.type,
      title: t.name,
      hidden: false,
      order: 0,
      contentDefaults: t.contentDefaults || {},
    }
    onUseTemplate(section)
    onClose()
  }

  if (!open) return null

  const categories = ['all', ...Object.keys(CATEGORY_LABELS)]
  const filtered = templates.filter(t => {
    if (activeCategory !== 'all' && t.category !== activeCategory) return false
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.description.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <h3 className="font-semibold text-gray-900">Section Templates</h3>
            <p className="text-xs text-gray-500 mt-0.5">Pick a pre-configured section to add to this product</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        {/* Search + Seed */}
        <div className="px-5 py-3 border-b flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search templates…"
              className="w-full pl-7 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
          </div>
          {templates.length === 0 && (
            <Button type="button" size="sm" onClick={seed} disabled={seeding} className="h-8 text-xs flex-shrink-0">
              {seeding ? <RefreshCw size={12} className="mr-1 animate-spin" /> : null}
              Load Templates
            </Button>
          )}
        </div>

        {/* Category tabs */}
        <div className="flex gap-1 px-5 py-2 border-b overflow-x-auto flex-shrink-0">
          {categories.map(c => (
            <button key={c} type="button"
              onClick={() => setActiveCategory(c)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                activeCategory === c ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {c === 'all' ? 'All' : CATEGORY_LABELS[c]}
              {c !== 'all' && <span className="ml-1 opacity-60">({templates.filter(t => t.category === c).length})</span>}
            </button>
          ))}
        </div>

        {/* Template grid */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="text-center py-10 text-gray-400 text-sm">Loading templates…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm text-gray-400">
                {templates.length === 0 ? 'No templates loaded yet. Click "Load Templates" above.' : 'No templates match your search.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filtered.map(t => (
                <div key={t._id}
                  className="border border-gray-200 rounded-lg p-3 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer group"
                  onClick={() => applyTemplate(t)}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-xl flex-shrink-0">{t.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800 truncate">{t.name}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5 line-clamp-2">{t.description}</div>
                      <div className="mt-1.5">
                        <span className="inline-block text-[9px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 uppercase tracking-wide">{CATEGORY_LABELS[t.category] || t.category}</span>
                        <span className="inline-block text-[9px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-500 uppercase tracking-wide ml-1">{t.type}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs text-blue-600 font-medium">+ Use this template →</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
