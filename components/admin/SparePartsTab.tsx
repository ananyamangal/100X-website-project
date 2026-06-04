"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Pencil, Trash2, Wrench, Upload, X, ExternalLink } from "lucide-react"

const EMPTY = {
  name: "",
  slug: "",
  sku: "",
  category: "",
  description: "",
  priceRange: "",
  images: [] as string[],
  specifications: [] as string[],
  compatibleProducts: [] as string[],
  compatibleProductNames: [] as string[],
  videoUrl: "",
  downloads: [] as Array<{ label: string; url: string }>,
  isPublished: true,
  order: 0,
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-")
}

export function SparePartsTab() {
  const [parts, setParts] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([]) // for compatible-product picker
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<typeof EMPTY & { [k: string]: any }>({ ...EMPTY })
  const [editing, setEditing] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [searchQ, setSearchQ] = useState("")

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      fetch("/api/admin/spare-parts").then((r) => r.json()),
      fetch("/api/products").then((r) => r.json()),
    ])
      .then(([partsData, prodsData]) => {
        setParts(Array.isArray(partsData) ? partsData : [])
        setProducts(Array.isArray(prodsData) ? prodsData : [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const reset = () => { setForm({ ...EMPTY }); setEditing(null); setShowForm(false); setMsg(null) }

  const startEdit = (p: any) => {
    setForm({ ...EMPTY, ...p, specifications: Array.isArray(p.specifications) ? p.specifications : [], compatibleProductNames: Array.isArray(p.compatibleProductNames) ? p.compatibleProductNames : [], compatibleProducts: Array.isArray(p.compatibleProducts) ? p.compatibleProducts : [], downloads: Array.isArray(p.downloads) ? p.downloads : [], images: Array.isArray(p.images) ? p.images : [] })
    setEditing(p._id)
    setShowForm(true)
    setMsg(null)
    setTimeout(() => document.getElementById("spare-form")?.scrollIntoView({ behavior: "smooth" }), 100)
  }

  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }))

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) { setMsg({ type: "error", text: "Part name is required" }); return }
    setSaving(true)
    setMsg(null)
    try {
      const payload = { ...form, slug: form.slug || slugify(form.name) }
      const url = editing ? `/api/admin/spare-parts/${editing}` : "/api/admin/spare-parts"
      const method = editing ? "PUT" : "POST"
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      if (!res.ok) throw new Error()
      setMsg({ type: "success", text: editing ? "Updated successfully" : "Created successfully" })
      load()
      setTimeout(() => reset(), 1200)
    } catch {
      setMsg({ type: "error", text: "Failed to save. Please try again." })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    await fetch(`/api/admin/spare-parts/${id}`, { method: "DELETE" })
    load()
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("upload_preset", "product_uploads")
      const res = await fetch("https://api.cloudinary.com/v1_1/dhbvzugv6/image/upload", { method: "POST", body: fd })
      const data = await res.json()
      if (data.secure_url) set("images", [...(form.images || []), data.secure_url])
      else if (data.error) setMsg({ type: "error", text: `Upload failed: ${data.error.message}` })
    } catch {
      setMsg({ type: "error", text: "Upload failed. Please try again." })
    }
    setUploading(false)
    e.target.value = ""
  }

  const toggleProduct = (pid: string, pname: string) => {
    const ids: string[] = form.compatibleProducts || []
    const names: string[] = form.compatibleProductNames || []
    if (ids.includes(pid)) {
      set("compatibleProducts", ids.filter((x) => x !== pid))
      set("compatibleProductNames", names.filter((x) => x !== pname))
    } else {
      set("compatibleProducts", [...ids, pid])
      set("compatibleProductNames", [...names, pname])
    }
  }

  const filtered = parts.filter((p) => p.name?.toLowerCase().includes(searchQ.toLowerCase()) || p.sku?.toLowerCase().includes(searchQ.toLowerCase()))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-700 text-gray-900">Spare Parts</h2>
          <p className="text-gray-500 text-sm mt-0.5">{parts.length} parts — manage your OEM spare parts catalogue</p>
        </div>
        <Button onClick={() => { setShowForm(true); setEditing(null); setForm({ ...EMPTY }) }} className="bg-green-600 hover:bg-green-700 gap-1.5">
          <Plus size={16} /> Add Spare Part
        </Button>
      </div>

      {/* Search */}
      <Input placeholder="Search by name or SKU…" value={searchQ} onChange={(e) => setSearchQ(e.target.value)} className="max-w-sm" />

      {/* Form */}
      {showForm && (
        <Card id="spare-form" className="border-green-200 shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-700 text-lg text-gray-900">{editing ? "Edit Spare Part" : "New Spare Part"}</h3>
              <button onClick={reset} className="text-gray-400 hover:text-gray-600 p-1"><X size={18} /></button>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-500 text-gray-700 mb-1 block">Part Name *</label>
                  <Input value={form.name} onChange={(e) => { set("name", e.target.value); if (!editing) set("slug", slugify(e.target.value)) }} placeholder="e.g. Carburetor Assembly" required />
                </div>
                <div>
                  <label className="text-sm font-500 text-gray-700 mb-1 block">SKU / Part Number</label>
                  <Input value={form.sku} onChange={(e) => set("sku", e.target.value)} placeholder="e.g. 100X-CARB-01" />
                </div>
                <div>
                  <label className="text-sm font-500 text-gray-700 mb-1 block">Slug (URL)</label>
                  <Input value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder="auto-generated from name" />
                </div>
                <div>
                  <label className="text-sm font-500 text-gray-700 mb-1 block">Category</label>
                  <Input value={form.category} onChange={(e) => set("category", e.target.value)} placeholder="e.g. Engine Parts, Nozzles" />
                </div>
                <div>
                  <label className="text-sm font-500 text-gray-700 mb-1 block">Price Range</label>
                  <Input value={form.priceRange} onChange={(e) => set("priceRange", e.target.value)} placeholder="e.g. ₹500 – ₹1,200" />
                </div>
                <div>
                  <label className="text-sm font-500 text-gray-700 mb-1 block">Display Order</label>
                  <Input type="number" value={form.order} onChange={(e) => set("order", Number(e.target.value))} />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-sm font-500 text-gray-700 mb-1 block">Description</label>
                <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} placeholder="Describe the part, its function, and any installation notes." />
              </div>

              {/* Images */}
              <div>
                <label className="text-sm font-500 text-gray-700 mb-2 block">Images</label>
                <div className="flex flex-wrap gap-3 mb-3">
                  {(form.images || []).map((img: string, i: number) => (
                    <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img} alt="" className="w-full h-full object-contain p-1 bg-gray-50" />
                      <button type="button" onClick={() => set("images", form.images.filter((_: string, j: number) => j !== i))} className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 rounded-full text-white flex items-center justify-center text-[10px]">×</button>
                    </div>
                  ))}
                  <label className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-green-400 transition-colors text-gray-400 text-xs gap-1">
                    {uploading ? <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" /> : <><Upload size={16} /><span>Upload</span></>}
                    <input type="file" accept="image/*" className="sr-only" onChange={handleUpload} disabled={uploading} />
                  </label>
                </div>
                <Input value={(form.images || []).join("\n")} onChange={(e) => set("images", e.target.value.split("\n").filter(Boolean))} placeholder="Or paste image URLs (one per line)" className="text-xs font-mono" />
              </div>

              {/* Specifications */}
              <div>
                <label className="text-sm font-500 text-gray-700 mb-1 block">Specifications (one per line, format: Label: Value)</label>
                <Textarea value={(form.specifications || []).join("\n")} onChange={(e) => set("specifications", e.target.value.split("\n").filter(Boolean))} rows={4} placeholder={"Weight: 0.8 kg\nMaterial: Aluminium alloy\nThread size: M10"} className="font-mono text-sm" />
              </div>

              {/* Compatible Products */}
              <div>
                <label className="text-sm font-500 text-gray-700 mb-2 block">Compatible Products</label>
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-3 border border-gray-200 rounded-lg">
                  {products.length === 0 && <p className="text-gray-400 text-xs">No products found</p>}
                  {products.map((p: any) => {
                    const pid = p._id || p.id
                    const checked = (form.compatibleProducts || []).includes(pid)
                    return (
                      <button key={pid} type="button" onClick={() => toggleProduct(pid, p.name)} className={`text-xs px-3 py-1.5 rounded-full border transition-all ${checked ? "bg-green-600 text-white border-green-600" : "border-gray-300 text-gray-600 hover:border-green-400"}`}>
                        {p.name}
                      </button>
                    )
                  })}
                </div>
                {(form.compatibleProductNames || []).length > 0 && (
                  <p className="text-xs text-green-600 mt-1">Selected: {(form.compatibleProductNames || []).join(", ")}</p>
                )}
              </div>

              {/* Downloads */}
              <div>
                <label className="text-sm font-500 text-gray-700 mb-2 block">Downloads</label>
                {(form.downloads || []).map((d: any, i: number) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <Input value={d.label} onChange={(e) => { const dl = [...form.downloads]; dl[i].label = e.target.value; set("downloads", dl) }} placeholder="Label (e.g. Installation Guide)" className="flex-1" />
                    <Input value={d.url} onChange={(e) => { const dl = [...form.downloads]; dl[i].url = e.target.value; set("downloads", dl) }} placeholder="URL" className="flex-1" />
                    <button type="button" onClick={() => set("downloads", form.downloads.filter((_: any, j: number) => j !== i))} className="text-red-400 hover:text-red-600 p-2"><X size={14} /></button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => set("downloads", [...(form.downloads || []), { label: "", url: "" }])} className="text-xs">
                  <Plus size={12} className="mr-1" /> Add Download
                </Button>
              </div>

              {/* Published toggle */}
              <div className="flex items-center gap-3">
                <input type="checkbox" id="sp-published" checked={form.isPublished} onChange={(e) => set("isPublished", e.target.checked)} className="w-4 h-4 rounded text-green-600" />
                <label htmlFor="sp-published" className="text-sm text-gray-700">Published (visible on site)</label>
              </div>

              {/* Message */}
              {msg && (
                <div className={`rounded-lg px-4 py-2.5 text-sm font-500 ${msg.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
                  {msg.text}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={saving} className="bg-green-600 hover:bg-green-700">
                  {saving ? "Saving…" : editing ? "Save Changes" : "Create Part"}
                </Button>
                <Button type="button" variant="outline" onClick={reset}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Parts list */}
      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Loading spare parts…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl">
          <Wrench size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-600 font-600">{searchQ ? "No parts match your search" : "No spare parts yet"}</p>
          <p className="text-gray-400 text-sm mt-1">Add your first spare part to build the catalogue</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((part) => (
            <div key={part._id} className="flex items-start gap-4 p-4 bg-white rounded-xl border border-gray-100 hover:border-green-200 transition-all group">
              {/* Thumbnail */}
              <div className="w-16 h-16 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0 overflow-hidden border border-gray-100">
                {part.images?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={part.images[0]} alt="" className="w-full h-full object-contain p-1" />
                ) : (
                  <Wrench size={20} className="text-gray-300" />
                )}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 flex-wrap">
                  <h3 className="font-600 text-gray-900 text-sm">{part.name}</h3>
                  {!part.isPublished && <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-600">Draft</span>}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {part.sku && <span className="mr-3">SKU: {part.sku}</span>}
                  {part.category && <span className="mr-3">{part.category}</span>}
                  {part.priceRange && <span className="text-green-600 font-600">{part.priceRange}</span>}
                </p>
                {part.compatibleProductNames?.length > 0 && (
                  <p className="text-xs text-gray-400 mt-1">For: {part.compatibleProductNames.slice(0, 3).join(", ")}{part.compatibleProductNames.length > 3 ? ` +${part.compatibleProductNames.length - 3} more` : ""}</p>
                )}
              </div>
              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <a href={`/spare-parts/${part.slug}`} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-400 hover:text-gray-600 transition-colors" title="View on site">
                  <ExternalLink size={14} />
                </a>
                <button onClick={() => startEdit(part)} className="p-2 text-gray-400 hover:text-green-600 transition-colors">
                  <Pencil size={14} />
                </button>
                <button onClick={() => handleDelete(part._id, part.name)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
