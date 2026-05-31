"use client"

import React, { useState, useEffect } from "react"
import { X, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export interface CelebrityAsset {
  _id: string
  name: string
  category: string
  tags: string[]
  altText: string
  description: string
  usageNotes: string
  imageUrl: string
  resourceType: string
}

interface Props {
  open: boolean
  onClose: () => void
  onSelect: (asset: CelebrityAsset) => void
  title?: string
}

export function AssetPicker({ open, onClose, onSelect, title = "Pick an Asset" }: Props) {
  const [assets, setAssets] = useState<CelebrityAsset[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")
  const [category, setCategory] = useState("all")

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch("/api/admin/celebrity-assets")
      .then((r) => r.json())
      .then((d) => setAssets(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) return null

  const categories = ["all", ...Array.from(new Set(assets.map((a) => a.category).filter(Boolean)))]

  const filtered = assets.filter((a) => {
    if (category !== "all" && a.category !== category) return false
    if (search.trim()) {
      const q = search.toLowerCase()
      return [a.name, a.category, ...a.tags, a.description].join(" ").toLowerCase().includes(q)
    }
    return true
  })

  return (
    <div className="fixed inset-0 z-[300] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 text-lg">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 rounded-full p-1 hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 py-3 flex gap-3 border-b border-gray-100 flex-wrap">
          <div className="relative flex-1 min-w-40">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search assets…" className="pl-8 h-9 text-sm" />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {categories.map((c) => (
              <button key={c} onClick={() => setCategory(c)} className={`text-xs px-3 py-1.5 rounded-full font-medium capitalize transition-colors ${category === c ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="overflow-y-auto flex-1 p-6">
          {loading ? (
            <p className="text-gray-500 text-sm text-center py-8">Loading assets…</p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-sm">No assets found.</p>
              <p className="text-xs mt-1">Upload images in Admin → Celebrity Assets first.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {filtered.map((asset) => (
                <button
                  key={asset._id}
                  onClick={() => { onSelect(asset); onClose() }}
                  className="group text-left rounded-xl border-2 border-transparent hover:border-green-500 transition-all overflow-hidden bg-gray-50"
                >
                  <div className="aspect-square bg-gray-100 overflow-hidden">
                    {asset.imageUrl ? (
                      <img src={asset.imageUrl} alt={asset.altText || asset.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">No image</div>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-medium text-gray-800 truncate">{asset.name}</p>
                    {asset.category && <p className="text-xs text-gray-500 capitalize">{asset.category}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
