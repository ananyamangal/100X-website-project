"use client"
import { useState, useEffect, useRef } from "react"
import { Plus, Edit, Trash2, X, Save, ExternalLink, Info } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

interface Certification {
  _id?: string
  name: string
  logoUrl: string
  description: string
  verificationUrl: string
  isActive: boolean
  sortOrder: number
}

const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dhbvzugv6/image/upload"
const UPLOAD_PRESET  = "product_uploads"

const EMPTY: Omit<Certification, "_id" | "sortOrder"> = {
  name: "", logoUrl: "", description: "", verificationUrl: "", isActive: true,
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

export function CertificationsManagerTab() {
  const [certs, setCerts]       = useState<Certification[]>([])
  const [loading, setLoading]   = useState(true)
  const [editing, setEditing]   = useState<Certification | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [form, setForm]         = useState({ ...EMPTY })
  const [saving, setSaving]     = useState(false)
  const [uploading, setUploading] = useState(false)
  const [notif, setNotif]       = useState<{ type: "success" | "error"; msg: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const notify = (type: "success" | "error", msg: string) => {
    setNotif({ type, msg })
    setTimeout(() => setNotif(null), 3000)
  }

  const load = async () => {
    setLoading(true)
    const r = await fetch("/api/admin/certifications")
    const d = await r.json()
    setCerts(Array.isArray(d) ? d : [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openAdd = () => { setForm({ ...EMPTY }); setEditing(null); setIsAdding(true) }
  const openEdit = (c: Certification) => {
    setForm({ name: c.name, logoUrl: c.logoUrl, description: c.description, verificationUrl: c.verificationUrl, isActive: c.isActive })
    setEditing(c)
    setIsAdding(true)
  }
  const cancel = () => { setIsAdding(false); setEditing(null) }

  const uploadLogo = async (file: File) => {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("upload_preset", UPLOAD_PRESET)
      const r = await fetch(CLOUDINARY_URL, { method: "POST", body: fd })
      const d = await r.json()
      setForm(f => ({ ...f, logoUrl: d.secure_url }))
    } catch {
      notify("error", "Logo upload failed.")
    } finally {
      setUploading(false)
    }
  }

  const save = async () => {
    if (!form.name.trim()) { notify("error", "Certification name is required."); return }
    setSaving(true)
    try {
      const url    = editing ? `/api/admin/certifications/${editing._id}` : "/api/admin/certifications"
      const method = editing ? "PUT" : "POST"
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!r.ok) throw new Error()
      notify("success", editing ? "Certification updated." : "Certification created.")
      cancel()
      load()
    } catch {
      notify("error", "Failed to save.")
    } finally {
      setSaving(false)
    }
  }

  const remove = async (c: Certification) => {
    if (!confirm(`Delete "${c.name}"?`)) return
    await fetch(`/api/admin/certifications/${c._id}`, { method: "DELETE" })
    notify("success", "Deleted.")
    load()
  }

  const toggleActive = async (c: Certification) => {
    await fetch(`/api/admin/certifications/${c._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !c.isActive }),
    })
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Certifications & Approvals</h2>
          <p className="text-gray-600 mt-1">Manage ISO, CE, GeM, BIS, MSME and other certification logos.</p>
        </div>
        {!isAdding && (
          <Button onClick={openAdd} className="bg-green-600 hover:bg-green-700">
            <Plus size={16} className="mr-2" />Add Certification
          </Button>
        )}
      </div>

      {notif && (
        <div className={`px-4 py-3 rounded-lg text-sm font-medium ${
          notif.type === "success" ? "bg-green-50 text-green-800 border border-green-200"
            : "bg-red-50 text-red-800 border border-red-200"
        }`}>
          {notif.msg}
        </div>
      )}

      {isAdding && (
        <Card>
          <CardHeader>
            <CardTitle>{editing ? `Edit: ${editing.name}` : "Add Certification"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid md:grid-cols-2 gap-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <Input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. ISO 9001:2015, CE Mark, GeM Registered"
                />
              </div>

              {/* Verification URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Verification URL (optional)</label>
                <Input
                  value={form.verificationUrl}
                  onChange={e => setForm(f => ({ ...f, verificationUrl: e.target.value }))}
                  placeholder="https://verify.example.com/cert/123"
                />
              </div>
            </div>

            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Certification Logo</label>
              <div className="flex items-center gap-3">
                {form.logoUrl && (
                  <img src={form.logoUrl} alt="cert logo" className="h-12 object-contain rounded border bg-white p-1" />
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? "Uploading…" : form.logoUrl ? "Replace Logo" : "Upload Logo"}
                </Button>
                {form.logoUrl && (
                  <button type="button" onClick={() => setForm(f => ({ ...f, logoUrl: "" }))} className="text-xs text-red-500 hover:text-red-700">
                    Remove
                  </button>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/svg+xml,image/webp,image/jpeg"
                  className="hidden"
                  onChange={e => { if (e.target.files?.[0]) uploadLogo(e.target.files[0]) }}
                />
              </div>
              <UploadHint lines={[
                "Recommended: 300×120 px",
                "Aspect ratio: 2.5:1",
                "Max size: 500 KB",
                "Formats: PNG, SVG (transparent background preferred)",
              ]} />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <Textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Brief description of what this certification means…"
                rows={3}
              />
            </div>

            {/* Active */}
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <span className="text-sm font-medium text-gray-700">Active (show on product pages)</span>
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <Button onClick={save} disabled={saving} className="bg-green-600 hover:bg-green-700">
                <Save size={14} className="mr-2" />{saving ? "Saving…" : "Save Certification"}
              </Button>
              <Button variant="outline" onClick={cancel}>
                <X size={14} className="mr-2" />Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle>All Certifications ({certs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : certs.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="font-medium">No certifications yet.</p>
              <p className="text-sm mt-1">Add ISO, CE, GeM and other logos to replace hardcoded images.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {certs.map(c => (
                <div key={String(c._id)} className="flex items-center gap-4 p-3 rounded-lg border bg-white hover:bg-gray-50">
                  {/* Logo */}
                  <div className="w-24 h-12 rounded border bg-gray-50 flex items-center justify-center flex-shrink-0 p-1">
                    {c.logoUrl ? (
                      <img src={c.logoUrl} alt={c.name} className="max-h-full max-w-full object-contain" />
                    ) : (
                      <span className="text-xs text-gray-300">No logo</span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-gray-900">{c.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${c.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {c.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    {c.description && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{c.description}</p>
                    )}
                    {c.verificationUrl && (
                      <a
                        href={c.verificationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:underline flex items-center gap-1 mt-0.5"
                      >
                        Verify <ExternalLink size={10} />
                      </a>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => toggleActive(c)}
                      className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                        c.isActive ? "text-amber-600 hover:bg-amber-50" : "text-green-600 hover:bg-green-50"
                      }`}
                    >
                      {c.isActive ? "Disable" : "Enable"}
                    </button>
                    <Button variant="outline" size="sm" onClick={() => openEdit(c)}>
                      <Edit size={12} />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => remove(c)}
                      className="text-red-600 hover:bg-red-50 border-red-200"
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
