"use client"

import React, { useEffect, useState } from "react"
import { X, Search } from "lucide-react"
import { Input } from "@/components/ui/input"

interface MediaItem {
  url: string
  category: string
  label: string
}

interface Props {
  open: boolean
  onSelect: (url: string) => void
  onClose: () => void
}

export function MediaLibraryModal({ open, onSelect, onClose }: Props) {
  const [items, setItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("all")

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch("/api/admin/media-library")
      .then(r => r.json())
      .then(d => setItems(Array.isArray(d) ? d.filter((i: any) => typeof i.url === "string" && i.url.startsWith("http")) : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open])

  if (!open) return null

  const categories = ["all", ...Array.from(new Set(items.map(i => i.category).filter(Boolean)))]

  const filtered = items.filter(item => {
    const matchCat = category === "all" || item.category === category
    const q = search.toLowerCase()
    const matchSearch = !q || (item.label || "").toLowerCase().includes(q) || item.url.toLowerCase().includes(q)
    return matchCat && matchSearch
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Media Library</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <div className="flex gap-3 px-5 py-3 border-b border-gray-100">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search images…"
              className="pl-8 h-8 text-sm"
            />
          </div>
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="h-8 rounded-md border border-gray-200 px-2 text-xs bg-white"
          >
            {categories.map(c => (
              <option key={c} value={c}>
                {c === "all" ? "All categories" : c}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-12 text-gray-400 text-sm">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">No images found</div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {filtered.map((item, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onSelect(item.url)}
                  className="aspect-square overflow-hidden rounded-lg border border-gray-200 hover:border-green-400 hover:ring-2 hover:ring-green-200 transition-all group"
                  title={item.label || item.url}
                >
                  <img
                    src={item.url}
                    alt={item.label}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-gray-100 text-xs text-gray-400">
          {filtered.length} image{filtered.length !== 1 ? "s" : ""} · Click to select
        </div>
      </div>
    </div>
  )
}
