"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"

export interface MediaPickerItem {
  url: string
  label?: string
  category?: string
  source?: string
}

const FILTERS = [
  { key: "all", label: "All" },
  { key: "products", label: "Products" },
  { key: "case-studies", label: "Case Studies" },
  { key: "deployments", label: "Deployments" },
  { key: "uploads", label: "Uploads" },
  { key: "certifications", label: "Certs" },
  { key: "homepage", label: "Homepage" },
]

interface Props {
  onSelect: (url: string) => void
  onClose: () => void
  multiSelect?: boolean
  onSelectMultiple?: (urls: string[]) => void
  title?: string
}

export default function MediaLibraryPicker({
  onSelect,
  onClose,
  multiSelect = false,
  onSelectMultiple,
  title = "Select from Media Library",
}: Props) {
  const [items, setItems] = useState<MediaPickerItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("all")
  const [selected, setSelected] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch("/api/admin/media-library")
      .then(r => r.json())
      .then(data => {
        const raw = Array.isArray(data) ? data : (Array.isArray(data?.images) ? data.images : [])
        setItems(raw.filter((i: MediaPickerItem) => i.url && !i.url.match(/\.(pdf|docx?|xlsx?)(\?|$)/i)))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const visible = items.filter(i => {
    const catOk = filter === "all" || i.category === filter
    const q = search.toLowerCase()
    const textOk = !search || (i.label || i.url).toLowerCase().includes(q) || (i.source || "").toLowerCase().includes(q)
    return catOk && textOk
  })

  const toggleSelect = (url: string) => {
    if (!multiSelect) {
      onSelect(url)
      onClose()
      return
    }
    setSelected(prev => {
      const next = new Set(prev)
      next.has(url) ? next.delete(url) : next.add(url)
      return next
    })
  }

  const confirmMulti = () => {
    if (onSelectMultiple) onSelectMultiple(Array.from(selected))
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col"
        style={{ maxHeight: "85vh" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0">
          <h3 className="font-800 text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none w-7 h-7 flex items-center justify-center">×</button>
        </div>

        {/* Search + filters */}
        <div className="px-4 pt-3 pb-2 border-b flex-shrink-0 space-y-2">
          <Input
            placeholder="Search images…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="text-sm"
            autoFocus
          />
          <div className="flex gap-1.5 flex-wrap">
            {FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1 rounded-full text-xs font-600 transition-colors ${filter === f.key ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
              >
                {f.label}
                {f.key !== "all" && (
                  <span className="ml-1 opacity-60">
                    {items.filter(i => i.category === f.key).length || ""}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="overflow-y-auto flex-1 p-4">
          {loading ? (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {[...Array(18)].map((_, i) => <div key={i} className="aspect-square rounded-lg bg-gray-100 animate-pulse" />)}
            </div>
          ) : visible.length === 0 ? (
            <p className="text-center text-gray-400 py-12 text-sm">No images found</p>
          ) : (
            <>
              <p className="text-xs text-gray-400 mb-3">{visible.length} assets</p>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {visible.map((item, i) => {
                  const isSelected = selected.has(item.url)
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleSelect(item.url)}
                      title={item.label}
                      className={`group relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                        isSelected ? "border-brand-500 ring-2 ring-brand-500/30" : "border-transparent hover:border-brand-400"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.url}
                        alt={item.label || ""}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={e => { (e.target as HTMLImageElement).style.display = "none" }}
                      />
                      {isSelected && (
                        <div className="absolute inset-0 bg-brand-600/20 flex items-center justify-center">
                          <div className="w-6 h-6 bg-brand-600 rounded-full flex items-center justify-center">
                            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        </div>
                      )}
                      {item.category && (
                        <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[8px] px-1 py-0.5 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                          {item.category}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {multiSelect && (
          <div className="px-5 py-3 border-t flex items-center justify-between flex-shrink-0">
            <span className="text-sm text-gray-500">{selected.size} selected</span>
            <div className="flex gap-2">
              <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors">Cancel</button>
              <button
                onClick={confirmMulti}
                disabled={selected.size === 0}
                className="px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300 text-white text-sm font-600 rounded-lg transition-colors"
              >
                Add {selected.size > 0 ? `${selected.size} images` : "images"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
