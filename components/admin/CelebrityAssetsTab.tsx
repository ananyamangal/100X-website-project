"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"

const CLOUDINARY_CLOUD = "dhbvzugv6"
const CLOUDINARY_PRESET = "product_uploads"

const CATEGORIES = ["celebrity", "endorsement", "awareness", "government", "agriculture", "testimonial"]

const EMPTY = {
  name: "",
  category: "celebrity",
  tags: [] as string[],
  altText: "",
  description: "",
  usageNotes: "",
  imageUrl: "",
  cloudinaryPublicId: "",
  resourceType: "image",
}

const SMART_RECOMMENDATIONS: Record<string, string> = {
  concerned: `RECOMMENDED PLACEMENTS:\n1. Homepage "The Problem" section — headline "Mosquito Problems Cost More Than You Think"\n2. Hero banner background (left position) with problem-focused CTA\n3. Awareness campaign: Government/Public Health angle\n4. Before/After split: left panel (before)\n\nHEADLINE IDEAS:\n• "क्या आपके शहर में डेंगू का खतरा है?"\n• "Mosquito-Borne Diseases Cost India ₹15,000 Crore Every Year"\n• "Before 100x Circle — Communities at Risk"\n\nCONVERSION REASONING: Concerned expression creates empathy and problem awareness. Best used at top of funnel where visitors haven't seen the product yet.`,
  happy: `RECOMMENDED PLACEMENTS:\n1. Homepage "After Effective Fogging" section — headline "Cleaner Environment. Better Protection."\n2. Below-the-fold trust section after product listing\n3. Thank-you/success state overlay\n4. Government campaign: results and outcomes\n\nHEADLINE IDEAS:\n• "अब 100x Circle के साथ — हर शहर सुरक्षित"\n• "Communities Protected. Dengue Eliminated."\n• "After 100x Circle — Peace of Mind Guaranteed"\n\nCONVERSION REASONING: Happy/satisfied expression signals solution success. Best used mid-funnel after problem awareness to complete the transformation story.`,
}

export function CelebrityAssetsTab() {
  const [assets, setAssets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<Record<string, any>>({ ...EMPTY })
  const [editing, setEditing] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [tagInput, setTagInput] = useState("")
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    fetch("/api/admin/celebrity-assets")
      .then((r) => r.json())
      .then((d) => setAssets(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const reset = () => { setForm({ ...EMPTY }); setEditing(null); setShowForm(false); setMsg(null); setTagInput("") }

  const startEdit = (a: any) => {
    setForm({ ...EMPTY, ...a, tags: a.tags || [] })
    setEditing(a._id)
    setShowForm(true)
    setMsg(null)
  }

  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }))

  const uploadImage = async (file: File) => {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("upload_preset", CLOUDINARY_PRESET)
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, { method: "POST", body: fd })
      const data = await res.json()
      if (data.secure_url) {
        set("imageUrl", data.secure_url)
        set("cloudinaryPublicId", data.public_id || "")
        set("width", data.width || null)
        set("height", data.height || null)
      }
    } catch { /* ignore */ }
    setUploading(false)
  }

  const addTag = () => {
    const t = tagInput.trim()
    if (t && !form.tags.includes(t)) {
      set("tags", [...form.tags, t])
    }
    setTagInput("")
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    try {
      let res: Response
      if (editing) {
        res = await fetch(`/api/admin/celebrity-assets/${editing}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        })
      } else {
        res = await fetch("/api/admin/celebrity-assets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        })
      }
      if (res.ok) {
        setMsg({ type: "success", text: editing ? "Asset updated." : "Asset saved." })
        load()
        if (!editing) reset()
      } else {
        setMsg({ type: "error", text: "Failed to save." })
      }
    } catch { setMsg({ type: "error", text: "Network error." }) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this asset?")) return
    await fetch(`/api/admin/celebrity-assets/${id}`, { method: "DELETE" })
    load()
  }

  const recDetect = (a: any): string => {
    const name = (a.name || "").toLowerCase()
    const tags = ((a.tags || []) as string[]).join(" ").toLowerCase()
    const combined = `${name} ${tags}`
    if (combined.includes("concern") || combined.includes("worried") || combined.includes("problem") || combined.includes("before")) return SMART_RECOMMENDATIONS.concerned
    if (combined.includes("happy") || combined.includes("satisfied") || combined.includes("after") || combined.includes("success")) return SMART_RECOMMENDATIONS.happy
    return "Add tags like 'concerned', 'happy', 'before', 'after' to get smart placement recommendations."
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-1">Celebrity Assets</h2>
          <p className="text-gray-600 text-sm">Upload and manage licensed celebrity images for homepage sections, banners, and campaigns.</p>
        </div>
        <Button onClick={() => { reset(); setShowForm(true) }} className="bg-green-600 hover:bg-green-700">
          + Upload Asset
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">{editing ? "Edit Asset" : "Upload New Asset"}</h3>
            <form onSubmit={handleSave} className="space-y-4">
              {/* Image upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Image *</label>
                <div className="flex gap-4 items-start">
                  {form.imageUrl && (
                    <img src={form.imageUrl} alt="" className="w-28 h-28 object-cover rounded-xl border shadow-sm" />
                  )}
                  <div className="flex-1 space-y-2">
                    <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
                      {uploading ? "Uploading…" : "Choose Image"}
                      <input type="file" accept="image/*" className="hidden" disabled={uploading}
                        onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])} />
                    </label>
                    <p className="text-xs text-gray-500">PNG, WebP, JPG, GIF, transparent PNG — max 20MB</p>
                    <p className="text-xs text-gray-400">Uploads to Cloudinary image CDN (public, fast delivery)</p>
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Asset Name *</label>
                  <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Mushtaq Khan - Concerned" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select value={form.category} onChange={(e) => set("category", e.target.value)} className="w-full h-10 rounded-md border border-gray-300 px-3 text-sm">
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Alt Text (for accessibility &amp; SEO)</label>
                <Input value={form.altText} onChange={(e) => set("altText", e.target.value)} placeholder="e.g. Mushtaq Khan expressing concern about mosquito problems" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} placeholder="Describe the emotion, pose, and composition…" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Usage Notes (internal)</label>
                <Textarea value={form.usageNotes} onChange={(e) => set("usageNotes", e.target.value)} rows={2} placeholder="License notes, usage restrictions, approved contexts…" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                <div className="flex gap-2">
                  <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag() }}} placeholder="Add tag (press Enter)" />
                  <Button type="button" variant="outline" onClick={addTag} className="bg-transparent shrink-0">Add</Button>
                </div>
                <div className="flex gap-1.5 flex-wrap mt-2">
                  {form.tags.map((t: string) => (
                    <span key={t} className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-xs px-2.5 py-1 rounded-full">
                      {t}
                      <button type="button" onClick={() => set("tags", form.tags.filter((x: string) => x !== t))} className="hover:text-red-500">×</button>
                    </span>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">Use tags like: concerned, happy, before, after, government, agriculture</p>
              </div>

              {msg && <p className={`text-sm ${msg.type === "success" ? "text-green-600" : "text-red-600"}`}>{msg.text}</p>}

              <div className="flex gap-3">
                <Button type="submit" disabled={saving || uploading || !form.imageUrl} className="bg-green-600 hover:bg-green-700">
                  {saving ? "Saving…" : editing ? "Update" : "Save Asset"}
                </Button>
                <Button type="button" variant="outline" onClick={reset} className="bg-transparent">Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : assets.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <div className="text-5xl mb-4">🎬</div>
            <h3 className="font-semibold text-gray-800 mb-2">No Celebrity Assets Yet</h3>
            <p className="text-sm text-gray-500 mb-4">Upload your licensed Mushtaq Khan images to use them across homepage sections, banners, and campaigns.</p>
            <Button onClick={() => { reset(); setShowForm(true) }} className="bg-green-600 hover:bg-green-700">Upload First Asset</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {assets.map((a) => (
            <Card key={a._id} className="overflow-hidden">
              <div className="aspect-video bg-gray-100 relative overflow-hidden">
                {a.imageUrl ? (
                  <img src={a.imageUrl} alt={a.altText || a.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 text-sm">No image</div>
                )}
                <div className="absolute top-2 right-2">
                  <span className="bg-black/60 text-white text-xs px-2 py-0.5 rounded-full capitalize">{a.category}</span>
                </div>
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold text-gray-900 text-sm mb-1">{a.name}</h3>
                {a.tags?.length > 0 && (
                  <div className="flex gap-1 flex-wrap mb-2">
                    {a.tags.map((t: string) => (
                      <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{t}</span>
                    ))}
                  </div>
                )}

                {/* Smart Recommendations */}
                <button onClick={() => setExpanded(expanded === a._id ? null : a._id)} className="text-xs text-green-700 underline mb-2">
                  {expanded === a._id ? "Hide" : "Show"} Smart Recommendations
                </button>
                {expanded === a._id && (
                  <pre className="text-xs text-gray-600 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap font-sans mb-3 max-h-40 overflow-y-auto">{recDetect(a)}</pre>
                )}

                <div className="flex gap-2 mt-2">
                  <Button variant="outline" size="sm" onClick={() => startEdit(a)} className="bg-transparent flex-1">Edit</Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(a._id)} className="bg-transparent text-red-600 border-red-200">Delete</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
