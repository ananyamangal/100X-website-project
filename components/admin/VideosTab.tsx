"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"

function slugify(t: string) {
  return t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80)
}

const EMPTY = {
  title: "",
  slug: "",
  description: "",
  videoUrl: "",
  transcript: "",
  relatedProduct: "",
  relatedBlog: "",
  published: false,
}

export function VideosTab() {
  const [videos, setVideos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<Record<string, any>>({ ...EMPTY })
  const [editing, setEditing] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [showForm, setShowForm] = useState(false)

  const load = () => {
    setLoading(true)
    fetch("/api/admin/videos")
      .then((r) => r.json())
      .then((data) => setVideos(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const reset = () => { setForm({ ...EMPTY }); setEditing(null); setShowForm(false); setMsg(null) }

  const startEdit = (v: any) => {
    setForm({ ...EMPTY, ...v })
    setEditing(v._id)
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
        res = await fetch(`/api/admin/videos/${editing}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch("/api/admin/videos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      }
      if (res.ok) {
        setMsg({ type: "success", text: editing ? "Video updated." : "Video created." })
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
    if (!confirm("Delete this video?")) return
    await fetch(`/api/admin/videos/${id}`, { method: "DELETE" })
    load()
  }

  function getYtId(url: string) {
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s?]+)/)
    return m ? m[1] : null
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-1">Video Library</h2>
          <p className="text-gray-600 text-sm">Manage product and tutorial videos shown at /videos</p>
        </div>
        <Button onClick={() => { reset(); setShowForm(true) }} className="bg-green-600 hover:bg-green-700">
          + New Video
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-gray-900 mb-4">{editing ? "Edit Video" : "New Video"}</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                  <Input value={form.title} onChange={(e) => { set("title", e.target.value); if (!editing) set("slug", slugify(e.target.value)) }} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                  <Input value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder="auto-generated" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Video URL (YouTube) *</label>
                <Input value={form.videoUrl} onChange={(e) => set("videoUrl", e.target.value)} placeholder="https://www.youtube.com/watch?v=..." required />
              </div>

              {form.videoUrl && getYtId(form.videoUrl) && (
                <div className="aspect-video max-w-sm rounded-xl overflow-hidden">
                  <iframe src={`https://www.youtube.com/embed/${getYtId(form.videoUrl)}`} title="Preview" className="w-full h-full" allowFullScreen />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Transcript</label>
                <Textarea value={form.transcript} onChange={(e) => set("transcript", e.target.value)} rows={4} placeholder="Full video transcript for SEO..." />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Related Product (name)</label>
                  <Input value={form.relatedProduct} onChange={(e) => set("relatedProduct", e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Related Blog (slug)</label>
                  <Input value={form.relatedBlog} onChange={(e) => set("relatedBlog", e.target.value)} placeholder="blog-post-slug" />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!form.published} onChange={(e) => set("published", e.target.checked)} className="rounded text-green-600" />
                Published (visible on website)
              </label>

              {msg && <p className={`text-sm ${msg.type === "success" ? "text-green-600" : "text-red-600"}`}>{msg.text}</p>}

              <div className="flex gap-3">
                <Button type="submit" disabled={saving} className="bg-green-600 hover:bg-green-700">
                  {saving ? "Saving…" : editing ? "Update Video" : "Create Video"}
                </Button>
                <Button type="button" variant="outline" onClick={reset} className="bg-transparent">Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : videos.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            <p>No videos yet. Click &quot;New Video&quot; to add one.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {videos.map((v) => {
            const ytId = v.videoUrl ? getYtId(v.videoUrl) : null
            return (
              <Card key={v._id}>
                <CardContent className="p-0 overflow-hidden">
                  {ytId ? (
                    <div className="aspect-video">
                      <iframe src={`https://www.youtube.com/embed/${ytId}`} title={v.title} className="w-full h-full" allowFullScreen />
                    </div>
                  ) : (
                    <div className="aspect-video bg-gray-100 flex items-center justify-center">
                      <span className="text-gray-400 text-xs">No preview</span>
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${v.published ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                        {v.published ? "Published" : "Draft"}
                      </span>
                      {v.relatedProduct && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{v.relatedProduct}</span>}
                    </div>
                    <h3 className="font-semibold text-gray-900 text-sm mb-2">{v.title}</h3>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => startEdit(v)} className="bg-transparent">Edit</Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(v._id)} className="bg-transparent text-red-600 border-red-200">Delete</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
