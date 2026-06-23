"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Search, Upload, Copy, Check, X, Info, Image as ImageIcon, FileText, Tag, Award, Layout, Film, Layers } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

const CLOUDINARY_CLOUD = "dhbvzugv6"
const CLOUDINARY_PRESET = "product_uploads"

interface MediaItem {
  url: string
  category: string
  label: string
  source?: string
  altText?: string
  uploadedAt?: string
  usageCount: number
  thumbnailUrl?: string
  webpUrl?: string
  optimizedUrl?: string
}

const CATEGORIES = [
  { key: "all",           label: "All Assets",    icon: Layers },
  { key: "uploads",       label: "Uploads",       icon: Upload },
  { key: "products",      label: "Products",      icon: ImageIcon },
  { key: "case-studies",  label: "Case Studies",  icon: ImageIcon },
  { key: "deployments",   label: "Deployments",   icon: ImageIcon },
  { key: "certifications",label: "Certifications",icon: Award },
  { key: "badges",        label: "Badges",        icon: Tag },
  { key: "homepage",      label: "Homepage",      icon: Layout },
  { key: "documents",     label: "Documents",     icon: FileText },
]

function isDocument(url: string) { return /\.(pdf|docx?|xlsx?|pptx?)(\?|$)/i.test(url) }
function isVideo(url: string)    { return /\.(mp4|webm|mov|avi)(\?|$)/i.test(url) }

function makeCloudinaryTransform(url: string, transform: string): string {
  if (!url.includes("res.cloudinary.com")) return url
  return url.replace(/\/upload\//, `/upload/${transform}/`)
}

function formatDate(iso?: string) {
  if (!iso) return "Unknown"
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* fallback */ }
  }
  return (
    <button
      onClick={copy}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-600 rounded-lg transition-all ${
        copied ? "bg-green-50 text-green-700 border border-green-200" : "bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200"
      }`}
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? "Copied!" : label}
    </button>
  )
}

export function MediaLibraryTab() {
  const [items, setItems]         = useState<MediaItem[]>([])
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState("all")
  const [search, setSearch]       = useState("")
  const [preview, setPreview]     = useState<MediaItem | null>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver]   = useState(false)
  const [uploadedCount, setUploadedCount] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(() => {
    setLoading(true)
    fetch("/api/admin/media-library")
      .then(r => r.json())
      .then(d => setItems(Array.isArray(d) ? d : (Array.isArray(d?.images) ? d.images : [])))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const visible = items.filter(i => {
    const catOk = filter === "all" || i.category === filter
    const q = search.toLowerCase()
    const textOk = !search || (i.label || i.url).toLowerCase().includes(q) || (i.source || "").toLowerCase().includes(q) || (i.altText || "").toLowerCase().includes(q)
    return catOk && textOk
  })

  const counts = CATEGORIES.reduce<Record<string, number>>((acc, c) => {
    acc[c.key] = c.key === "all" ? items.length : items.filter(i => i.category === c.key).length
    return acc
  }, {})

  const uploadFiles = async (files: File[]) => {
    setUploading(true)
    let count = 0
    for (const file of files) {
      try {
        const fd = new FormData()
        fd.append("file", file)
        fd.append("upload_preset", CLOUDINARY_PRESET)
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, { method: "POST", body: fd })
        const data = await res.json()
        if (data.secure_url) {
          await fetch("/api/admin/media-assets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              url: data.secure_url,
              publicId: data.public_id,
              altText: file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " "),
              source: "direct-upload",
              tags: [],
            }),
          })
          count++
        }
      } catch { /* continue on error */ }
    }
    setUploadedCount(count)
    setUploading(false)
    load()
    setTimeout(() => setUploadedCount(0), 3000)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"))
    if (files.length) uploadFiles(files)
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length) uploadFiles(files)
    e.target.value = ""
  }

  const catColor: Record<string, string> = {
    products: "bg-blue-100 text-blue-700",
    "case-studies": "bg-purple-100 text-purple-700",
    deployments: "bg-orange-100 text-orange-700",
    certifications: "bg-green-100 text-green-700",
    badges: "bg-amber-100 text-amber-700",
    homepage: "bg-teal-100 text-teal-700",
    uploads: "bg-brand-100 text-brand-700",
    documents: "bg-gray-100 text-gray-700",
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Media Library</h2>
          <p className="text-gray-600 mt-1 text-sm">
            {items.length} assets across products, case studies, deployments, and uploads.
            {uploadedCount > 0 && <span className="ml-2 text-green-600 font-600">{uploadedCount} new files uploaded!</span>}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <input ref={fileRef} type="file" accept="image/*" multiple className="sr-only" onChange={handleFileChange} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-400 text-white text-sm font-700 rounded-xl transition-colors shadow-sm"
          >
            <Upload size={15} />
            {uploading ? "Uploading…" : "Upload Asset"}
          </button>
        </div>
      </div>

      {/* Drag-and-drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
          dragOver ? "border-brand-500 bg-brand-50" : "border-gray-200 hover:border-brand-300 hover:bg-gray-50"
        }`}
      >
        <Upload size={24} className={`mx-auto mb-2 ${dragOver ? "text-brand-600" : "text-gray-300"}`} />
        <p className={`text-sm font-600 ${dragOver ? "text-brand-700" : "text-gray-400"}`}>
          {uploading ? "Uploading…" : dragOver ? "Drop images here" : "Drag & drop images here, or click to browse"}
        </p>
        <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP · Auto-uploaded to Cloudinary</p>
      </div>

      {/* Upload standards */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="py-4">
          <p className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-1.5">
            <Info size={14} />Asset Size Guide
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-blue-700">
            {[
              { label: "Product Hero", specs: ["1920×1080", "16:9", "Max 2 MB"] },
              { label: "Badge / Icon", specs: ["128×128", "1:1", "PNG/SVG"] },
              { label: "Case Study", specs: ["1200×800", "3:2", "Max 1 MB"] },
              { label: "Deployment Photo", specs: ["Any", "Landscape preferred", "Max 2 MB"] },
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
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map(c => (
            <button
              key={c.key}
              onClick={() => setFilter(c.key)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-600 transition-colors ${
                filter === c.key ? "bg-green-600 text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <c.icon size={10} />
              {c.label}
              {counts[c.key] > 0 && (
                <span className={`${filter === c.key ? "opacity-70" : "text-gray-400"}`}>({counts[c.key]})</span>
              )}
            </button>
          ))}
        </div>
        <div className="relative sm:ml-auto shrink-0">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…" className="pl-8 w-56" />
        </div>
      </div>

      {/* Grid */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
              {[...Array(24)].map((_, i) => <div key={i} className="aspect-square bg-gray-100 rounded-lg animate-pulse" />)}
            </div>
          ) : visible.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <ImageIcon size={40} className="mx-auto mb-2 opacity-30" />
              <p className="font-medium">No assets found.</p>
              {search && <p className="text-sm mt-1">Try a different search term.</p>}
              {!search && filter !== "all" && <p className="text-sm mt-1">No assets in this category yet.</p>}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                {visible.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => setPreview(item)}
                    className="group relative aspect-square rounded-lg border border-gray-100 bg-gray-50 overflow-hidden hover:border-brand-400 hover:shadow-md transition-all text-left"
                  >
                    {isDocument(item.url) ? (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-2">
                        <FileText size={20} className="text-gray-300" />
                        <span className="text-[9px] text-gray-400 truncate w-full text-center">{item.label}</span>
                      </div>
                    ) : isVideo(item.url) ? (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                        <Film size={20} className="text-gray-300" />
                      </div>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.thumbnailUrl || item.url}
                        alt={item.altText || item.label}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={e => { (e.target as HTMLImageElement).src = item.url }}
                      />
                    )}
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-end p-1.5 pointer-events-none">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity w-full space-y-0.5">
                        <p className="text-white text-[9px] font-600 truncate leading-tight">{item.label}</p>
                        <span className={`text-[8px] font-700 px-1.5 py-0.5 rounded-full capitalize ${catColor[item.category] || "bg-gray-100 text-gray-700"}`}>
                          {item.category}
                        </span>
                      </div>
                    </div>
                    {/* Usage count badge */}
                    {item.usageCount > 1 && (
                      <span className="absolute top-1 right-1 bg-black/60 text-white text-[8px] font-700 px-1.5 py-0.5 rounded-full">
                        ×{item.usageCount}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 text-right mt-3">
                Showing {visible.length} of {items.length} assets
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Preview / Detail panel */}
      {preview && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setPreview(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`text-[10px] font-700 px-2 py-0.5 rounded-full capitalize shrink-0 ${catColor[preview.category] || "bg-gray-100 text-gray-700"}`}>
                  {preview.category}
                </span>
                <p className="font-700 text-gray-900 truncate text-sm">{preview.label}</p>
              </div>
              <button onClick={() => setPreview(null)} className="text-gray-400 hover:text-gray-700 ml-3 shrink-0">
                <X size={18} />
              </button>
            </div>

            {/* Image preview */}
            {!isDocument(preview.url) && !isVideo(preview.url) && (
              <div className="bg-gray-50 flex items-center justify-center" style={{ maxHeight: "300px" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview.url}
                  alt={preview.altText || preview.label}
                  className="max-h-72 object-contain"
                />
              </div>
            )}

            <div className="p-5 space-y-4">
              {/* Metadata */}
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                <div><span className="text-gray-400 block">Uploaded</span>{formatDate(preview.uploadedAt)}</div>
                <div><span className="text-gray-400 block">Used In</span>{preview.usageCount} place{preview.usageCount !== 1 ? "s" : ""}</div>
                {preview.altText && <div className="col-span-2"><span className="text-gray-400 block">Alt Text</span>{preview.altText}</div>}
              </div>

              {/* URL variants */}
              <div className="space-y-2">
                <p className="text-xs font-700 text-gray-500 uppercase tracking-wide">URLs</p>

                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[10px] text-gray-400 font-600 uppercase tracking-wide">Original</p>
                      <p className="text-xs text-gray-700 truncate font-mono">{preview.url}</p>
                    </div>
                    <CopyButton text={preview.url} label="Copy" />
                  </div>

                  {preview.url.includes("res.cloudinary.com") && (
                    <>
                      {(() => {
                        const thumb = makeCloudinaryTransform(preview.url, "w_300,h_300,c_fill,q_auto")
                        const webp  = makeCloudinaryTransform(preview.url, "f_webp,q_auto")
                        const opt   = makeCloudinaryTransform(preview.url, "q_auto,f_auto")
                        return (
                          <>
                            <div className="border-t border-gray-200 pt-2 flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-[10px] text-gray-400 font-600 uppercase tracking-wide">Thumbnail (300×300)</p>
                                <p className="text-xs text-gray-600 truncate font-mono">{thumb.slice(0, 60)}…</p>
                              </div>
                              <CopyButton text={thumb} label="Copy" />
                            </div>
                            <div className="border-t border-gray-200 pt-2 flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-[10px] text-gray-400 font-600 uppercase tracking-wide">WebP (auto quality)</p>
                                <p className="text-xs text-gray-600 truncate font-mono">{webp.slice(0, 60)}…</p>
                              </div>
                              <CopyButton text={webp} label="Copy" />
                            </div>
                            <div className="border-t border-gray-200 pt-2 flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-[10px] text-gray-400 font-600 uppercase tracking-wide">Optimised (auto format + quality)</p>
                                <p className="text-xs text-gray-600 truncate font-mono">{opt.slice(0, 60)}…</p>
                              </div>
                              <CopyButton text={opt} label="Copy" />
                            </div>
                          </>
                        )
                      })()}
                    </>
                  )}
                </div>
              </div>

              {/* Where used */}
              <div>
                <p className="text-xs font-700 text-gray-500 uppercase tracking-wide mb-1.5">Where Used</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-600 px-2.5 py-1 rounded-full capitalize ${catColor[preview.category] || "bg-gray-100 text-gray-600"}`}>
                    {preview.source || preview.category}
                  </span>
                  {preview.usageCount > 1 && (
                    <span className="text-xs text-gray-400">+ {preview.usageCount - 1} more reference{preview.usageCount > 2 ? "s" : ""}</span>
                  )}
                </div>
              </div>

              {/* Open in new tab */}
              <a
                href={preview.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center text-xs font-600 text-brand-600 hover:text-brand-700 py-2 border border-brand-200 rounded-lg hover:bg-brand-50 transition-colors"
              >
                Open full image ↗
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
