"use client"

import React, { useState, useEffect } from "react"
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

export function DeploymentsTab() {
  const [deployments, setDeployments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<typeof EMPTY & { [k: string]: any }>({ ...EMPTY })
  const [editing, setEditing] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [uploading, setUploading] = useState(false)

  const load = () => {
    setLoading(true)
    fetch("/api/admin/deployments")
      .then((r) => r.json())
      .then((data) => setDeployments(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const reset = () => { setForm({ ...EMPTY }); setEditing(null); setShowForm(false); setMsg(null) }

  const startEdit = (d: any) => {
    setForm({ ...EMPTY, ...d })
    setEditing(d._id)
    setShowForm(true)
    setMsg(null)
  }

  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }))

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-1">Deployments</h2>
          <p className="text-gray-600 text-sm">Manage government and institutional field deployments shown at /deployments</p>
        </div>
        <Button onClick={() => { reset(); setShowForm(true) }} className="bg-green-600 hover:bg-green-700">
          + New Deployment
        </Button>
      </div>

      {showForm && (
        <Card>
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                  <Input value={form.product} onChange={(e) => set("product", e.target.value)} placeholder="e.g. 100XDB400 Vehicle-Mounted Fogger" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} placeholder="Describe the deployment, purpose, scale, and outcome." />
              </div>

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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Video URLs (YouTube, one per line)</label>
                <Textarea value={(form.videos || []).join("\n")} onChange={(e) => set("videos", e.target.value.split("\n").filter(Boolean))} rows={2} placeholder="https://www.youtube.com/watch?v=..." />
              </div>

              {msg && <p className={`text-sm ${msg.type === "success" ? "text-green-600" : "text-red-600"}`}>{msg.text}</p>}

              <div className="flex gap-3">
                <Button type="submit" disabled={saving || uploading} className="bg-green-600 hover:bg-green-700">
                  {saving ? "Saving…" : editing ? "Update Deployment" : "Create Deployment"}
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
            <p>No deployments yet. Click &quot;New Deployment&quot; to add one.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {deployments.map((d) => (
            <Card key={d._id}>
              <CardContent className="p-4 flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  {d.images?.[0] && <img src={d.images[0]} alt="" className="w-16 h-12 object-cover rounded-lg shrink-0" />}
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{d.location}</h3>
                    {d.department && <p className="text-xs text-gray-500">{d.department}</p>}
                    {d.product && <p className="text-xs text-green-600">{d.product}</p>}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => startEdit(d)} className="bg-transparent">Edit</Button>
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
