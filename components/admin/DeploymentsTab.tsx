"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"

const CLOUDINARY_CLOUD = "dhbvzugv6"
const CLOUDINARY_PRESET = "product_uploads"

const EMPTY = {
  location: "",
  department: "",
  product: "",
  images: [] as string[],
  videos: [] as string[],
  description: "",
}

// ── Media Library Picker ──────────────────────────────────────────────────────
interface MediaItem { url: string; name?: string; source?: string }

function MediaLibraryPicker({ onSelect, onClose }: { onSelect: (url: string) => void; onClose: () => void }) {
  const [items, setItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetch("/api/admin/media-library")
      .then((r) => r.json())
      .then((data) => {
        const all: MediaItem[] = Array.isArray(data.images) ? data.images : []
        setItems(all.filter((i) => i.url && !i.url.includes("pdf")))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = search
    ? items.filter((i) => (i.name || i.url).toLowerCase().includes(search.toLowerCase()))
    : items

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-bold text-gray-900">Select from Media Library</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">×</button>
        </div>
        <div className="p-3 border-b">
          <Input placeholder="Search images…" value={search} onChange={(e) => setSearch(e.target.value)} className="text-sm" autoFocus />
        </div>
        <div className="overflow-y-auto p-3 flex-1">
          {loading ? (
            <p className="text-center text-gray-400 py-8 text-sm">Loading…</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-gray-400 py-8 text-sm">No images found</p>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
              {filtered.map((item, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => { onSelect(item.url); onClose() }}
                  className="group relative aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-green-500 transition-all"
                >
                  <img src={item.url} alt={item.name || ""} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  {item.source && (
                    <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] px-1 py-0.5 truncate">{item.source}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Tab ──────────────────────────────────────────────────────────────────
export function DeploymentsTab() {
  const [deployments, setDeployments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<typeof EMPTY & { [k: string]: any }>({ ...EMPTY })
  const [editing, setEditing] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showMediaPicker, setShowMediaPicker] = useState(false)
  const [urlInput, setUrlInput] = useState("")

  const load = () => {
    setLoading(true)
    fetch("/api/admin/deployments")
      .then((r) => r.json())
      .then((data) => setDeployments(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const reset = () => { setForm({ ...EMPTY }); setEditing(null); setShowForm(false); setMsg(null); setUrlInput("") }

  const startEdit = (d: any) => {
    setForm({ ...EMPTY, ...d, images: Array.isArray(d.images) ? d.images : [] })
    setEditing(d._id)
    setShowForm(true)
    setMsg(null)
    setUrlInput("")
    setTimeout(() => document.getElementById("deployment-form")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50)
  }

  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }))

  const addImageUrl = useCallback(() => {
    const trimmed = urlInput.trim()
    if (!trimmed) return
    set("images", [...(form.images || []), trimmed])
    setUrlInput("")
  }, [urlInput, form.images])

  const addFromLibrary = useCallback((url: string) => {
    set("images", [...(form.images || []), url])
  }, [form.images])

  const removeImage = useCallback((idx: number) => {
    set("images", form.images.filter((_: string, j: number) => j !== idx))
  }, [form.images])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    try {
      let res: Response
      if (editing) {
        res = await fetch(`/api/admin/deployments/${editing}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        })
      } else {
        res = await fetch("/api/admin/deployments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        })
      }
      if (res.ok) {
        setMsg({ type: "success", text: editing ? "Deployment updated." : "Deployment created." })
        load()
        if (!editing) reset()
      } else {
        setMsg({ type: "error", text: "Failed to save." })
      }
    } catch {
      setMsg({ type: "error", text: "Network error." })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this deployment?")) return
    await fetch(`/api/admin/deployments/${id}`, { method: "DELETE" })
    load()
  }

  const uploadImages = async (files: FileList) => {
    setUploading(true)
    const uploaded: string[] = []
    for (const file of Array.from(files)) {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("upload_preset", CLOUDINARY_PRESET)
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, { method: "POST", body: fd })
      const data = await res.json()
      if (data.secure_url) uploaded.push(data.secure_url as string)
    }
    set("images", [...(form.images || []), ...uploaded])
    setUploading(false)
  }

  const withImages = deployments.filter((d) => d.images?.length > 0).length
  const noImages = deployments.filter((d) => !d.images?.length).length

  return (
    <div className="space-y-6">
      {showMediaPicker && (
        <MediaLibraryPicker
          onSelect={addFromLibrary}
          onClose={() => setShowMediaPicker(false)}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-1">Deployments</h2>
          <p className="text-gray-600 text-sm">
            Manage government and institutional field deployments shown at /deployments
            {deployments.length > 0 && (
              <span className="ml-2">
                — <span className="text-green-600 font-medium">{withImages} with images</span>
                {noImages > 0 && <span className="text-amber-600 font-medium">, {noImages} missing images</span>}
              </span>
            )}
          </p>
        </div>
        <Button onClick={() => { reset(); setShowForm(true) }} className="bg-green-600 hover:bg-green-700">
          + New Deployment
        </Button>
      </div>

      {showForm && (
        <Card id="deployment-form">
          <CardContent className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">{editing ? "Edit Deployment" : "New Deployment"}</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
                  <Input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="e.g. Ahmedabad, Gujarat" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <Input value={form.department} onChange={(e) => set("department", e.target.value)} placeholder="e.g. Municipal Health Department" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                  <Input value={form.product} onChange={(e) => set("product", e.target.value)} placeholder="e.g. 100XDB400 Vehicle-Mounted Fogger" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} placeholder="Describe the deployment, purpose, scale, and outcome." />
              </div>

              {/* ── Images ─────────────────────────────────────────────── */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Images <span className="text-gray-400 font-normal">({form.images?.length || 0} added)</span>
                </label>

                {/* Three ways to add images */}
                <div className="flex flex-wrap gap-2 mb-3">
                  <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border cursor-pointer transition-colors ${uploading ? "bg-gray-100 text-gray-400 border-gray-200" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"}`}>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>
                    {uploading ? "Uploading…" : "Upload Photos"}
                    <input type="file" accept="image/*" multiple disabled={uploading} onChange={(e) => e.target.files && uploadImages(e.target.files)} className="sr-only" />
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowMediaPicker(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border bg-white text-gray-700 border-gray-300 hover:bg-gray-50 transition-colors"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                    Select from Media Library
                  </button>
                </div>

                {/* URL input */}
                <div className="flex gap-2 mb-3">
                  <Input
                    placeholder="Or paste an image URL…"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addImageUrl() } }}
                    className="text-sm flex-1"
                  />
                  <Button type="button" variant="outline" onClick={addImageUrl} disabled={!urlInput.trim()} className="bg-transparent shrink-0">
                    Add URL
                  </Button>
                </div>

                {/* Image preview strip */}
                {form.images?.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {form.images.map((url: string, i: number) => (
                      <div key={i} className="relative group">
                        <img src={url} alt="" className="w-24 h-18 object-cover rounded-lg border border-gray-200" style={{ height: "72px" }} />
                        {i === 0 && (
                          <span className="absolute top-1 left-1 bg-green-600 text-white text-[9px] font-700 px-1.5 py-0.5 rounded">PRIMARY</span>
                        )}
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 text-xs items-center justify-center hidden group-hover:flex shadow"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Video URLs (YouTube, one per line)</label>
                <Textarea value={(form.videos || []).join("\n")} onChange={(e) => set("videos", e.target.value.split("\n").filter(Boolean))} rows={2} placeholder="https://www.youtube.com/watch?v=..." />
              </div>

              {msg && <p className={`text-sm font-medium ${msg.type === "success" ? "text-green-600" : "text-red-600"}`}>{msg.text}</p>}

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={saving || uploading} className="bg-green-600 hover:bg-green-700">
                  {saving ? "Saving…" : uploading ? "Uploading images…" : editing ? "Update Deployment" : "Create Deployment"}
                </Button>
                <Button type="button" variant="outline" onClick={reset} className="bg-transparent">Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : deployments.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            <p className="font-medium mb-1">No deployments yet.</p>
            <p className="text-sm">Click &quot;New Deployment&quot; to add field deployment records with photos.</p>
            <p className="text-xs text-gray-400 mt-2">Deployments with photos appear on /deployments, the OEM page, and the homepage.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {deployments.map((d) => (
            <Card key={d._id} className={!d.images?.length ? "border-amber-200 bg-amber-50/30" : ""}>
              <CardContent className="p-4 flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  {d.images?.[0] ? (
                    <img src={d.images[0]} alt="" className="w-20 h-14 object-cover rounded-lg shrink-0 border" />
                  ) : (
                    <div className="w-20 h-14 bg-amber-100 border border-amber-200 rounded-lg shrink-0 flex items-center justify-center">
                      <svg className="w-6 h-6 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900 truncate">{d.location || "No location"}</h3>
                      {!d.images?.length && (
                        <span className="text-[10px] font-700 text-amber-700 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded-full shrink-0">NO IMAGES</span>
                      )}
                      {d.images?.length > 0 && (
                        <span className="text-[10px] font-600 text-green-700 bg-green-50 border border-green-100 px-1.5 py-0.5 rounded-full shrink-0">{d.images.length} photo{d.images.length !== 1 ? "s" : ""}</span>
                      )}
                    </div>
                    {d.department && <p className="text-xs text-gray-500 mt-0.5">{d.department}</p>}
                    {d.product && <p className="text-xs text-green-600 mt-0.5">{d.product}</p>}
                    {d.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{d.description}</p>}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => startEdit(d)} className={`bg-transparent ${!d.images?.length ? "border-amber-300 text-amber-700 hover:bg-amber-50" : ""}`}>
                    {!d.images?.length ? "Add Photos" : "Edit"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(d._id)} className="bg-transparent text-red-600 hover:text-red-700 border-red-200">Delete</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
