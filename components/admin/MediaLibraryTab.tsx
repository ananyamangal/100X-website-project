"use client"
import { useState, useEffect } from "react"
import { Search, Image, FileText, Tag, Award, Layout, Film, Info } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

interface MediaItem {
  url: string
  category: string
  label: string
  uploadedAt?: string
  usageCount: number
}

const CATEGORIES = [
  { key: "all",          label: "All Files",   icon: Image },
  { key: "products",     label: "Products",    icon: Image },
  { key: "certifications", label: "Certifications", icon: Award },
  { key: "badges",       label: "Badges",      icon: Tag },
  { key: "homepage",     label: "Homepage",    icon: Layout },
  { key: "documents",    label: "Documents",   icon: FileText },
]

function isVideo(url: string) {
  return /\.(mp4|webm|mov|avi)(\?|$)/i.test(url)
}

function isDocument(url: string) {
  return /\.(pdf|docx?|xlsx?|pptx?)(\?|$)/i.test(url)
}

function formatDate(iso?: string) {
  if (!iso) return "Unknown"
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

function categoryIcon(cat: string) {
  if (cat === "documents") return <FileText size={24} className="text-gray-400" />
  if (cat === "videos")    return <Film size={24} className="text-gray-400" />
  return null
}

export function MediaLibraryTab() {
  const [items, setItems]       = useState<MediaItem[]>([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState("all")
  const [search, setSearch]     = useState("")
  const [preview, setPreview]   = useState<MediaItem | null>(null)

  useEffect(() => {
    fetch("/api/admin/media-library")
      .then(r => r.json())
      .then(d => { setItems(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const visible = items.filter(i => {
    const catMatch = filter === "all" || i.category === filter
    const searchMatch = !search || i.label.toLowerCase().includes(search.toLowerCase()) || i.url.toLowerCase().includes(search.toLowerCase())
    return catMatch && searchMatch
  })

  const counts = CATEGORIES.reduce<Record<string, number>>((acc, c) => {
    acc[c.key] = c.key === "all" ? items.length : items.filter(i => i.category === c.key).length
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Media Library</h2>
        <p className="text-gray-600 mt-1">All uploaded assets across products, certifications, badges, and homepage.</p>
      </div>

      {/* Upload Standards Reference */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="py-4">
          <p className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-1.5">
            <Info size={14} />Asset Upload Standards
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-blue-700">
            {[
              { label: "Product Hero Image", specs: ["1920×1080 px", "16:9 ratio", "Max 2 MB", "JPG, WebP, PNG"] },
              { label: "Badge Icon",          specs: ["128×128 px",   "1:1 ratio",  "Max 500 KB", "PNG, SVG"] },
              { label: "Certification Logo",  specs: ["300×120 px",   "2.5:1 ratio","Max 500 KB", "PNG, SVG (transparent)"] },
              { label: "Banner Image",        specs: ["1920×600 px",  "16:5 ratio", "Max 2 MB",   "JPG, WebP"] },
            ].map(s => (
              <div key={s.label} className="bg-white/60 rounded-lg p-2.5 border border-blue-100">
                <p className="font-semibold text-blue-900 mb-1">{s.label}</p>
                {s.specs.map((sp, i) => <p key={i}>{sp}</p>)}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filters + Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(c => (
            <button
              key={c.key}
              onClick={() => setFilter(c.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === c.key
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <c.icon size={11} />
              {c.label}
              {counts[c.key] > 0 && (
                <span className={`ml-0.5 ${filter === c.key ? "opacity-80" : "text-gray-400"}`}>
                  ({counts[c.key]})
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="relative sm:ml-auto">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or URL…"
            className="pl-8 w-64"
          />
        </div>
      </div>

      {/* Grid */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="aspect-square bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Image size={40} className="mx-auto mb-2 opacity-40" />
              <p className="font-medium">No assets found.</p>
              {search && <p className="text-sm mt-1">Try a different search term.</p>}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {visible.map((item, i) => (
                <button
                  key={i}
                  onClick={() => setPreview(item)}
                  className="group relative aspect-square rounded-lg border bg-gray-50 overflow-hidden hover:border-green-400 transition-colors text-left"
                >
                  {isDocument(item.url) ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                      <FileText size={28} className="text-gray-300" />
                      <span className="text-[10px] text-gray-400 px-1 truncate w-full text-center">
                        {item.label}
                      </span>
                    </div>
                  ) : isVideo(item.url) ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                      <Film size={28} className="text-gray-300" />
                      <span className="text-[10px] text-gray-400 px-1 truncate w-full text-center">
                        {item.label}
                      </span>
                    </div>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.url}
                      alt={item.label}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={e => { (e.target as HTMLImageElement).src = "/placeholder.svg" }}
                    />
                  )}

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end p-1.5">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity w-full">
                      <p className="text-white text-[10px] font-medium truncate">{item.label}</p>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full capitalize ${
                          item.category === "products" ? "bg-blue-500/80 text-white" :
                          item.category === "badges"   ? "bg-amber-500/80 text-white" :
                          item.category === "certifications" ? "bg-green-500/80 text-white" :
                          "bg-gray-500/80 text-white"
                        }`}>
                          {item.category}
                        </span>
                        {item.usageCount > 1 && (
                          <span className="text-[9px] text-white/80">×{item.usageCount}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {!loading && visible.length > 0 && (
            <p className="text-xs text-gray-400 text-right mt-3">
              Showing {visible.length} of {items.length} assets
            </p>
          )}
        </CardContent>
      </Card>

      {/* Preview modal */}
      {preview && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setPreview(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-4 border-b flex items-center justify-between">
              <p className="font-semibold text-gray-900 truncate">{preview.label}</p>
              <button onClick={() => setPreview(null)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
            </div>
            <div className="p-4">
              {!isDocument(preview.url) && !isVideo(preview.url) && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview.url}
                  alt={preview.label}
                  className="max-h-80 mx-auto object-contain rounded"
                />
              )}
              <div className="mt-4 space-y-1.5 text-xs text-gray-600">
                <div className="flex gap-2">
                  <span className="text-gray-400 w-20 flex-shrink-0">Category</span>
                  <span className="capitalize font-medium">{preview.category}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-gray-400 w-20 flex-shrink-0">Uploaded</span>
                  <span>{formatDate(preview.uploadedAt)}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-gray-400 w-20 flex-shrink-0">Used</span>
                  <span>{preview.usageCount} time{preview.usageCount !== 1 ? "s" : ""}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-gray-400 w-20 flex-shrink-0">URL</span>
                  <a
                    href={preview.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline truncate"
                  >
                    {preview.url}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
