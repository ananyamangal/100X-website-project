"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Search, CheckSquare, Square } from "lucide-react"

const CLOUDINARY_CLOUD = "dhbvzugv6"
const CLOUDINARY_PRESET = "product_uploads"

const EMPTY: Record<string, any> = {
  title: "",
  slug: "",
  linkedProductIds: [],
  customer: "",
  department: "",
  state: "",
  city: "",
  industry: "",
  productUsed: "",
  problem: "",
  solution: "",
  results: "",
  images: [],
  videos: [],
  testimonial: "",
  pdfUrl: "",
  published: false,
  isSample: false,
}

function slugify(t: string) {
  return t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80)
}

function ProductMultiSelect({
  selectedIds,
  onChange,
  allProducts,
}: {
  selectedIds: string[]
  onChange: (ids: string[]) => void
  allProducts: any[]
}) {
  const [search, setSearch] = useState("")
  const filtered = allProducts.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.category || "").toLowerCase().includes(search.toLowerCase())
  )
  const toggle = (id: string) => {
    if (selectedIds.includes(id)) onChange(selectedIds.filter(x => x !== id))
    else onChange([...selectedIds, id])
  }
  const selected = allProducts.filter(p => selectedIds.includes(p._id))
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Linked Products <span className="text-xs text-gray-400 font-normal">(These products will show this case study on their page)</span>
      </label>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map(p => (
            <span key={p._id} className="inline-flex items-center gap-1 bg-brand-100 text-brand-800 text-xs px-2.5 py-1 rounded-full font-500">
              {p.name.slice(0, 40)}
              <button type="button" onClick={() => toggle(p._id)} className="ml-0.5 text-brand-500 hover:text-brand-700">×</button>
            </span>
          ))}
        </div>
      )}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 bg-gray-50">
          <Search size={14} className="text-gray-400 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search products…"
            className="flex-1 text-sm bg-transparent outline-none"
          />
        </div>
        <div className="max-h-48 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-xs text-gray-400 px-3 py-4 text-center">No products found</p>
          ) : filtered.map(p => {
            const checked = selectedIds.includes(p._id)
            return (
              <button
                key={p._id}
                type="button"
                onClick={() => toggle(p._id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 ${checked ? "bg-brand-50/50" : ""}`}
              >
                {checked
                  ? <CheckSquare size={16} className="text-brand-600 shrink-0" />
                  : <Square size={16} className="text-gray-300 shrink-0" />}
                {p.imageUrls?.[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.imageUrls[0]} alt="" className="w-8 h-8 object-contain bg-gray-50 rounded shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-500 text-gray-800 truncate">{p.name}</p>
                  {p.category && <p className="text-xs text-gray-400">{p.category}</p>}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function CaseStudiesTab() {
  const [studies, setStudies] = useState<any[]>([])
  const [allProducts, setAllProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<Record<string, any>>(EMPTY)
  const [editing, setEditing] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [uploading, setUploading] = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([
      fetch("/api/admin/case-studies").then(r => r.json()),
      fetch("/api/products").then(r => r.json()),
    ])
      .then(([studies, products]) => {
        setStudies(Array.isArray(studies) ? studies : [])
        setAllProducts(Array.isArray(products) ? products : [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const reset = () => { setForm(EMPTY); setEditing(null); setShowForm(false); setMsg(null) }

  const startEdit = (s: any) => {
    setForm({ ...EMPTY, ...s })
    setEditing(s._id)
    setShowForm(true)
    setMsg(null)
  }

  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }))

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    const payload = { ...form, slug: form.slug || slugify(form.title) }
    try {
      let res: Response
      if (editing) {
        res = await fetch(`/api/admin/case-studies/${editing}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch("/api/admin/case-studies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      }
      if (res.ok) {
        setMsg({ type: "success", text: editing ? "Case study updated." : "Case study created." })
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
    if (!confirm("Delete this case study?")) return
    await fetch(`/api/admin/case-studies/${id}`, { method: "DELETE" })
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

  const uploadPdf = async (file: File) => {
    setUploading(true)
    const fd = new FormData()
    fd.append("file", file)
    const res = await fetch("/api/admin/upload-file", { method: "POST", body: fd })
    const data = await res.json()
    if (res.ok && data.url) set("pdfUrl", data.url as string)
    setUploading(false)
  }

  // Seed the Gujarat example
  const seedExample = async () => {
    const example = {
      title: "Gujarat Medical Department Vector Control Program",
      slug: "gujarat-medical-department-vector-control-program",
      customer: "Gujarat State Health Department",
      department: "Vector Control Unit",
      state: "Gujarat",
      city: "Ahmedabad",
      industry: "Public Health",
      productUsed: "100XDB400 Vehicle-Mounted Thermal Fogging Machine",
      problem: "The Gujarat Medical Department needed to rapidly scale up vector control operations during peak monsoon season to combat rising dengue and malaria cases. Existing equipment was insufficient for the scale of operations required across 18 districts.",
      solution: "100x Circle supplied 12 vehicle-mounted thermal fogging machines with 50-litre tanks and swivel nozzles. Machines were procured via GeM direct purchase, eliminating lengthy tender processes. Operators were trained on-site in Ahmedabad within 3 days of delivery.",
      results: "The department successfully covered over 2,400 km of mosquito breeding zones in 6 weeks. Dengue case reporting dropped by 34% in treated wards compared to the previous season. All equipment was operational throughout the campaign with zero mechanical downtime.",
      testimonial: "The 100x Circle machines were reliable, easy to operate, and the after-sales support from the Gurugram team was excellent. We will be scaling up our fleet next season.",
      images: [],
      videos: [],
      pdfUrl: "",
      published: true,
      isSample: true,
    }
    await fetch("/api/admin/case-studies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(example),
    })
    load()
    setMsg({ type: "success", text: "Gujarat example case study created." })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-1">Case Studies</h2>
          <p className="text-gray-600 text-sm">Manage customer success stories and deployment case studies.</p>
        </div>
        <div className="flex gap-2">
          {studies.length === 0 && (
            <Button variant="outline" onClick={seedExample} className="bg-transparent text-sm">
              Seed Gujarat Example
            </Button>
          )}
          <Button onClick={() => { reset(); setShowForm(true) }} className="bg-green-600 hover:bg-green-700">
            + New Case Study
          </Button>
        </div>
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">{editing ? "Edit Case Study" : "New Case Study"}</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                  <Input value={form.title} onChange={(e) => { set("title", e.target.value); if (!editing) set("slug", slugify(e.target.value)) }} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                  <Input value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder="auto-generated from title" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer / Organization</label>
                  <Input value={form.customer} onChange={(e) => set("customer", e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <Input value={form.department} onChange={(e) => set("department", e.target.value)} placeholder="e.g. Vector Control Unit" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <Input value={form.state} onChange={(e) => set("state", e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <Input value={form.city} onChange={(e) => set("city", e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                  <Input value={form.industry} onChange={(e) => set("industry", e.target.value)} placeholder="e.g. Public Health, Agriculture" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Used</label>
                  <Input value={form.productUsed} onChange={(e) => set("productUsed", e.target.value)} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Problem / Challenge</label>
                <Textarea value={form.problem} onChange={(e) => set("problem", e.target.value)} rows={3} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Solution</label>
                <Textarea value={form.solution} onChange={(e) => set("solution", e.target.value)} rows={3} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Results</label>
                <Textarea value={form.results} onChange={(e) => set("results", e.target.value)} rows={3} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Testimonial (quote)</label>
                <Textarea value={form.testimonial} onChange={(e) => set("testimonial", e.target.value)} rows={2} />
              </div>

              {/* Images */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Images</label>
                <input type="file" accept="image/*" multiple disabled={uploading} onChange={(e) => e.target.files && uploadImages(e.target.files)} className="text-sm" />
                {form.images?.length > 0 && (
                  <div className="flex gap-2 flex-wrap mt-2">
                    {form.images.map((url: string, i: number) => (
                      <div key={i} className="relative">
                        <img src={url} alt="" className="w-20 h-16 object-cover rounded-lg border" />
                        <button type="button" onClick={() => set("images", form.images.filter((_: string, j: number) => j !== i))} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Videos */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Video URLs (YouTube, one per line)</label>
                <Textarea value={(form.videos || []).join("\n")} onChange={(e) => set("videos", e.target.value.split("\n").filter(Boolean))} rows={2} placeholder="https://www.youtube.com/watch?v=..." />
              </div>

              {/* PDF */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Downloadable PDF</label>
                {form.pdfUrl ? (
                  <div className="flex items-center gap-3">
                    <a href={form.pdfUrl} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline text-sm">View PDF</a>
                    <button type="button" onClick={() => set("pdfUrl", "")} className="text-xs text-red-500 hover:underline">Remove</button>
                  </div>
                ) : (
                  <input type="file" accept="application/pdf" disabled={uploading} onChange={(e) => e.target.files?.[0] && uploadPdf(e.target.files[0])} className="text-sm" />
                )}
              </div>

              <ProductMultiSelect
                selectedIds={form.linkedProductIds || []}
                onChange={ids => set("linkedProductIds", ids)}
                allProducts={allProducts}
              />

              <div className="flex gap-4 items-center">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={!!form.published} onChange={(e) => set("published", e.target.checked)} className="rounded text-green-600" />
                  Published (visible on website)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={!!form.isSample} onChange={(e) => set("isSample", e.target.checked)} className="rounded text-amber-500" />
                  Mark as Sample / Demo content
                </label>
              </div>

              {msg && <p className={`text-sm ${msg.type === "success" ? "text-green-600" : "text-red-600"}`}>{msg.text}</p>}

              <div className="flex gap-3">
                <Button type="submit" disabled={saving || uploading} className="bg-green-600 hover:bg-green-700">
                  {saving ? "Saving…" : editing ? "Update Case Study" : "Create Case Study"}
                </Button>
                <Button type="button" variant="outline" onClick={reset} className="bg-transparent">Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : studies.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            <p className="mb-2">No case studies yet.</p>
            <p className="text-sm">Click &quot;New Case Study&quot; or &quot;Seed Gujarat Example&quot; to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {studies.map((s) => (
            <Card key={s._id}>
              <CardContent className="p-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.published ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                      {s.published ? "Published" : "Draft"}
                    </span>
                    {s.isSample && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Sample</span>}
                    {s.industry && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{s.industry}</span>}
                  </div>
                  <h3 className="font-semibold text-gray-900 truncate">{s.title}</h3>
                  {s.customer && <p className="text-xs text-gray-500 mt-0.5">{s.customer}{s.state ? ` · ${s.state}` : ""}</p>}
                  <a href={`/case-studies/${s.slug}`} target="_blank" rel="noopener noreferrer" className="text-xs text-green-600 hover:underline mt-1 inline-block">
                    /case-studies/{s.slug}
                  </a>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => startEdit(s)} className="bg-transparent">Edit</Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(s._id)} className="bg-transparent text-red-600 hover:text-red-700 border-red-200">Delete</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
