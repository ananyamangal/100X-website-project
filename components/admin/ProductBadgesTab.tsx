"use client"
import { useState, useEffect, useRef } from "react"
import { Plus, Edit, Trash2, X, Save, ArrowUp, ArrowDown, Check, Info, Merge, ChevronDown, ChevronRight, RefreshCw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

interface UsedByProduct { id: string; name: string; slug: string }

interface ProductBadge {
  _id?: string
  name: string
  iconUrl: string
  color: string
  colorClass: string
  priority: number
  isActive: boolean
  tooltipText: string
  order: number
  usageCount?: number
  usedByProducts?: UsedByProduct[]
}

const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dhbvzugv6/image/upload"
const UPLOAD_PRESET = "product_uploads"

const COLOR_PRESETS = [
  { label: "Gray",   color: "#6b7280", cls: "bg-gray-100 text-gray-800" },
  { label: "Green",  color: "#16a34a", cls: "bg-green-100 text-green-800" },
  { label: "Blue",   color: "#2563eb", cls: "bg-blue-100 text-blue-800" },
  { label: "Red",    color: "#dc2626", cls: "bg-red-100 text-red-800" },
  { label: "Amber",  color: "#d97706", cls: "bg-amber-100 text-amber-800" },
  { label: "Purple", color: "#9333ea", cls: "bg-purple-100 text-purple-800" },
  { label: "Indigo", color: "#4f46e5", cls: "bg-indigo-100 text-indigo-800" },
  { label: "Teal",   color: "#0d9488", cls: "bg-teal-100 text-teal-800" },
]

const EMPTY_BADGE: Omit<ProductBadge, "_id" | "order"> = {
  name: "", iconUrl: "", color: "#6b7280",
  colorClass: "bg-gray-100 text-gray-800",
  priority: 0, isActive: true, tooltipText: "",
}

function UploadHint({ lines }: { lines: string[] }) {
  return (
    <div className="mt-1 bg-blue-50 border border-blue-100 rounded p-2 space-y-0.5">
      {lines.map((l, i) => (
        <p key={i} className="text-[11px] text-blue-600 flex items-center gap-1">
          <Info size={10} className="flex-shrink-0" />{l}
        </p>
      ))}
    </div>
  )
}

export function ProductBadgesTab() {
  const [badges, setBadges]               = useState<ProductBadge[]>([])
  const [loading, setLoading]             = useState(true)
  const [editing, setEditing]             = useState<ProductBadge | null>(null)
  const [isAdding, setIsAdding]           = useState(false)
  const [form, setForm]                   = useState({ ...EMPTY_BADGE })
  const [saving, setSaving]               = useState(false)
  const [uploadingIcon, setUploadingIcon] = useState(false)
  const [seeding, setSeeding]             = useState(false)
  const [merging, setMerging]             = useState(false)
  const [mergeFrom, setMergeFrom]         = useState<ProductBadge | null>(null)
  const [mergeTo, setMergeTo]             = useState("")
  const [expandedId, setExpandedId]       = useState<string | null>(null)
  const [notification, setNotification]   = useState<{ type: "success" | "error"; msg: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const notify = (type: "success" | "error", msg: string) => {
    setNotification({ type, msg })
    setTimeout(() => setNotification(null), 4000)
  }

  const load = async () => {
    setLoading(true)
    const r = await fetch("/api/admin/product-badges")
    const data = await r.json()
    setBadges(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openAdd = () => { setForm({ ...EMPTY_BADGE }); setEditing(null); setIsAdding(true) }
  const openEdit = (b: ProductBadge) => {
    setForm({ name: b.name, iconUrl: b.iconUrl, color: b.color, colorClass: b.colorClass, priority: b.priority, isActive: b.isActive, tooltipText: b.tooltipText })
    setEditing(b); setIsAdding(true)
  }
  const cancel = () => { setIsAdding(false); setEditing(null) }

  const uploadIcon = async (file: File) => {
    setUploadingIcon(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("upload_preset", UPLOAD_PRESET)
      const r = await fetch(CLOUDINARY_URL, { method: "POST", body: fd })
      const d = await r.json()
      setForm(f => ({ ...f, iconUrl: d.secure_url }))
    } catch { notify("error", "Icon upload failed.") }
    finally { setUploadingIcon(false) }
  }

  const save = async () => {
    if (!form.name.trim()) { notify("error", "Badge name is required."); return }
    setSaving(true)
    try {
      const endpoint = editing ? `/api/admin/product-badges/${editing._id}` : "/api/admin/product-badges"
      const r = await fetch(endpoint, { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
      if (!r.ok) throw new Error()
      notify("success", editing ? "Badge updated." : "Badge created.")
      cancel(); load()
    } catch { notify("error", "Failed to save badge.") }
    finally { setSaving(false) }
  }

  const remove = async (b: ProductBadge) => {
    if (!confirm(`Delete badge "${b.name}"? Products using it will keep the name but lose the icon/color.`)) return
    await fetch(`/api/admin/product-badges/${b._id}`, { method: "DELETE" })
    notify("success", "Badge deleted."); load()
  }

  const moveOrder = async (b: ProductBadge, dir: "up" | "down") => {
    const newOrder = dir === "up" ? b.order - 1 : b.order + 1
    if (newOrder < 0 || newOrder >= badges.length) return
    await fetch(`/api/admin/product-badges/${b._id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...b, order: newOrder }) })
    load()
  }

  const toggleActive = async (b: ProductBadge) => {
    await fetch(`/api/admin/product-badges/${b._id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !b.isActive }) })
    load()
  }

  const seedFromProducts = async () => {
    if (!confirm("Scan all products and auto-create missing badges? Existing badges will be skipped.")) return
    setSeeding(true)
    try {
      const r = await fetch("/api/admin/product-badges/seed", { method: "POST" })
      const d = await r.json()
      notify("success", `Seeded ${d.seeded} new badge(s). ${d.skipped} already existed.`)
      load()
    } catch { notify("error", "Seed failed.") }
    finally { setSeeding(false) }
  }

  const startMerge = (b: ProductBadge) => {
    setMergeFrom(b)
    setMergeTo("")
    setMerging(true)
  }

  const executeMerge = async () => {
    if (!mergeFrom || !mergeTo) return
    const target = badges.find(b => String(b._id) === mergeTo)
    if (!target) return
    if (!confirm(`Merge "${mergeFrom.name}" → "${target.name}"? All products using "${mergeFrom.name}" will be updated to "${target.name}".`)) return
    try {
      const r = await fetch("/api/admin/product-badges/merge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fromName: mergeFrom.name, toId: mergeTo }) })
      if (!r.ok) throw new Error()
      notify("success", `Merged "${mergeFrom.name}" into "${target.name}".`)
      setMerging(false); setMergeFrom(null); load()
    } catch { notify("error", "Merge failed.") }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Product Badge Manager</h2>
          <p className="text-gray-600 mt-1">Reusable badge definitions — icon, color, tooltip.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={seedFromProducts} disabled={seeding} className="text-sm">
            {seeding ? <RefreshCw size={14} className="mr-2 animate-spin" /> : <RefreshCw size={14} className="mr-2" />}
            Seed from Products
          </Button>
          {!isAdding && (
            <Button onClick={openAdd} className="bg-green-600 hover:bg-green-700">
              <Plus size={16} className="mr-2" />Add Badge
            </Button>
          )}
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`px-4 py-3 rounded-lg text-sm font-medium ${notification.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
          {notification.msg}
        </div>
      )}

      {/* Merge panel */}
      {merging && mergeFrom && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="py-4 space-y-3">
            <p className="text-sm font-semibold text-orange-900">
              Merge "{mergeFrom.name}" into another badge
            </p>
            <p className="text-xs text-orange-700">
              All products using "{mergeFrom.name}" will have their badge renamed. "{mergeFrom.name}" will then be deleted.
            </p>
            <div className="flex items-center gap-3">
              <select
                value={mergeTo}
                onChange={e => setMergeTo(e.target.value)}
                className="flex-1 border border-orange-300 rounded px-2 py-1.5 text-sm bg-white"
              >
                <option value="">— Select target badge —</option>
                {badges.filter(b => String(b._id) !== String(mergeFrom._id)).map(b => (
                  <option key={String(b._id)} value={String(b._id)}>{b.name}</option>
                ))}
              </select>
              <Button onClick={executeMerge} disabled={!mergeTo} className="bg-orange-600 hover:bg-orange-700 text-sm">
                <Merge size={13} className="mr-1" />Merge
              </Button>
              <Button variant="outline" onClick={() => { setMerging(false); setMergeFrom(null) }} className="text-sm">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add / Edit Form */}
      {isAdding && (
        <Card>
          <CardHeader>
            <CardTitle>{editing ? `Edit: ${editing.name}` : "Add New Badge"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Badge Name *</label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. German Technology, GeM, BIS Approved" className="max-w-md" />
              <p className="text-xs text-gray-400 mt-1">Must match the string stored in the product's badges array.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Badge Icon / Logo</label>
              <div className="flex items-center gap-3">
                {form.iconUrl && <img src={form.iconUrl} alt="icon" className="w-12 h-12 object-contain rounded border bg-white p-1" />}
                <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploadingIcon}>
                  {uploadingIcon ? "Uploading…" : form.iconUrl ? "Replace Icon" : "Upload Icon"}
                </Button>
                {form.iconUrl && <button type="button" onClick={() => setForm(f => ({ ...f, iconUrl: "" }))} className="text-xs text-red-500 hover:text-red-700">Remove</button>}
                <input ref={fileRef} type="file" accept="image/png,image/svg+xml,image/webp,image/jpeg" className="hidden" onChange={e => { if (e.target.files?.[0]) uploadIcon(e.target.files[0]) }} />
              </div>
              <UploadHint lines={["Recommended: 128×128 px", "Aspect ratio: 1:1", "Max size: 500 KB", "Formats: PNG, SVG, WebP (transparent background preferred)"]} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Badge Color</label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map(p => (
                  <button key={p.color} type="button" onClick={() => setForm(f => ({ ...f, color: p.color, colorClass: p.cls }))}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border-2 transition-all ${p.cls} ${form.color === p.color ? "border-gray-800 scale-105" : "border-transparent"}`}
                  >
                    {form.color === p.color && <Check size={10} />}{p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 max-w-sm">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <Input type="number" min={0} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: Number(e.target.value) }))} />
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="rounded border-gray-300 text-green-600 focus:ring-green-500" />
                  <span className="text-sm font-medium text-gray-700">Active</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tooltip Text</label>
              <Input value={form.tooltipText} onChange={e => setForm(f => ({ ...f, tooltipText: e.target.value }))} placeholder="e.g. Certified by Bureau of Indian Standards" className="max-w-lg" />
            </div>

            {form.name && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Preview</p>
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${form.colorClass}`}>
                  {form.iconUrl && <img src={form.iconUrl} alt="" className="w-4 h-4 object-contain" />}
                  {form.name}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button onClick={save} disabled={saving} className="bg-green-600 hover:bg-green-700">
                <Save size={14} className="mr-2" />{saving ? "Saving…" : "Save Badge"}
              </Button>
              <Button variant="outline" onClick={cancel}><X size={14} className="mr-2" />Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Badge List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>All Badges ({badges.length})</span>
            <span className="text-xs font-normal text-gray-400">Order = display priority on product pages</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />)}</div>
          ) : badges.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="font-medium">No badges yet.</p>
              <p className="text-sm mt-1">Click "Seed from Products" to auto-import from existing product data, or add manually.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {badges.map((b, idx) => {
                const isExpanded = expandedId === String(b._id)
                return (
                  <div key={String(b._id)} className="rounded-lg border bg-white">
                    <div className="flex items-center gap-3 p-3 hover:bg-gray-50">
                      {/* Order */}
                      <div className="flex flex-col gap-0.5">
                        <button onClick={() => moveOrder(b, "up")} disabled={idx === 0} className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-20"><ArrowUp size={12} /></button>
                        <button onClick={() => moveOrder(b, "down")} disabled={idx === badges.length - 1} className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-20"><ArrowDown size={12} /></button>
                      </div>

                      {/* Icon */}
                      <div className="w-10 h-10 rounded border bg-gray-50 flex items-center justify-center flex-shrink-0">
                        {b.iconUrl ? <img src={b.iconUrl} alt={b.name} className="w-8 h-8 object-contain" /> : <span className="text-lg">🏷️</span>}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${b.colorClass}`}>{b.name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${b.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{b.isActive ? "Active" : "Inactive"}</span>
                          {/* Usage count */}
                          {(b.usageCount !== undefined) && (
                            <button
                              type="button"
                              onClick={() => setExpandedId(isExpanded ? null : String(b._id))}
                              className="text-[11px] text-gray-500 hover:text-gray-800 flex items-center gap-0.5"
                            >
                              {isExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                              {b.usageCount} product{b.usageCount !== 1 ? 's' : ''}
                            </button>
                          )}
                        </div>
                        {b.tooltipText && <p className="text-xs text-gray-400 mt-0.5 truncate">{b.tooltipText}</p>}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => startMerge(b)} className="px-2 py-1 rounded text-xs font-medium text-orange-600 hover:bg-orange-50" title="Merge into another badge">
                          <Merge size={12} />
                        </button>
                        <button onClick={() => toggleActive(b)} className={`px-2 py-1 rounded text-xs font-medium transition-colors ${b.isActive ? "text-amber-600 hover:bg-amber-50" : "text-green-600 hover:bg-green-50"}`}>
                          {b.isActive ? "Disable" : "Enable"}
                        </button>
                        <Button variant="outline" size="sm" onClick={() => openEdit(b)}><Edit size={12} /></Button>
                        <Button variant="outline" size="sm" onClick={() => remove(b)} className="text-red-600 hover:bg-red-50 border-red-200"><Trash2 size={12} /></Button>
                      </div>
                    </div>

                    {/* Expanded: product list */}
                    {isExpanded && b.usedByProducts && b.usedByProducts.length > 0 && (
                      <div className="px-4 pb-3 pt-1 border-t bg-gray-50">
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Used by {b.usedByProducts.length} products</p>
                        <div className="flex flex-wrap gap-1.5">
                          {b.usedByProducts.map(p => (
                            <a key={p.id} href={`/${p.slug}`} target="_blank" rel="noreferrer"
                              className="text-xs px-2 py-0.5 rounded bg-white border border-gray-200 text-blue-600 hover:border-blue-300 hover:bg-blue-50">
                              {p.name}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Migration note */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="py-4">
          <p className="text-sm font-semibold text-amber-800 mb-1">Existing Products Notice</p>
          <p className="text-xs text-amber-700">
            Products store badge names as strings (e.g., "German Technology"). Create badges with matching names here and product pages will automatically use the CMS icon, color, and tooltip — no product data migration needed. Use "Seed from Products" to auto-populate all unique badge names at once.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
