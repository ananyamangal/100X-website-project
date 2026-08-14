"use client"
import React, { useEffect, useState } from "react"
import { Plus, Edit, Trash2, Save, X, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface RedirectRule {
  _id?: string
  sourcePath: string
  destinationPath: string
  redirectType: 301 | 302
  active: boolean
  createdAt?: string
  updatedAt?: string
}

const empty: RedirectRule = {
  sourcePath: "",
  destinationPath: "",
  redirectType: 301,
  active: true,
}

export function RedirectsTab() {
  const [redirects, setRedirects] = useState<RedirectRule[]>([])
  const [loading, setLoading] = useState(true)
  const [editItem, setEditItem] = useState<RedirectRule | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const load = () => {
    setLoading(true)
    fetch("/api/admin/redirects")
      .then((r) => r.json())
      .then((data) => {
        setRedirects(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const save = async () => {
    if (!editItem) return
    setSaving(true)
    setError("")
    const isNew = !editItem._id
    const url = isNew ? "/api/admin/redirects" : `/api/admin/redirects/${editItem._id}`
    const method = isNew ? "POST" : "PUT"
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(editItem),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Failed to save redirect")
        return
      }
      setEditItem(null)
      load()
    } catch {
      setError("Failed to save redirect")
    } finally {
      setSaving(false)
    }
  }

  const del = async (id: string) => {
    if (!confirm("Delete this redirect? Any traffic to the source path will 404 again until a new rule is added.")) return
    await fetch(`/api/admin/redirects/${id}`, { method: "DELETE", credentials: "include" })
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">URL Redirects</h2>
          <p className="text-sm text-gray-500 mt-1">
            301/302 redirects for discontinued or moved URLs — preserves SEO ranking on old links. Every
            published product also auto-redirects from its bare slug (e.g. /some-slug) to /products/some-slug
            even without a manual rule below.
          </p>
        </div>
        <Button onClick={() => { setError(""); setEditItem({ ...empty }) }} className="bg-green-600 hover:bg-green-700">
          <Plus size={16} className="mr-2" /> Add Redirect
        </Button>
      </div>

      {editItem && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">{editItem._id ? "Edit Redirect" : "New Redirect"}</h3>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Source path *</label>
              <Input
                value={editItem.sourcePath}
                onChange={(e) => setEditItem((p) => (p ? { ...p, sourcePath: e.target.value } : p))}
                placeholder="/old-url-that-404s"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Destination path *</label>
              <Input
                value={editItem.destinationPath}
                onChange={(e) => setEditItem((p) => (p ? { ...p, destinationPath: e.target.value } : p))}
                placeholder="/products/final-canonical-slug"
              />
              <p className="text-xs text-gray-400 mt-1">Must be the final live URL — chained redirects (A→B→C) are rejected.</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Redirect type</label>
              <select
                className="w-full h-9 rounded-md border border-gray-300 px-3 text-sm"
                value={editItem.redirectType}
                onChange={(e) => setEditItem((p) => (p ? { ...p, redirectType: Number(e.target.value) as 301 | 302 } : p))}
              >
                <option value={301}>301 — Permanent (preserves SEO ranking)</option>
                <option value={302}>302 — Temporary</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={!!editItem.active}
                  onChange={(e) => setEditItem((p) => (p ? { ...p, active: e.target.checked } : p))}
                  className="rounded"
                />
                Active
              </label>
            </div>
          </div>
          {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
          <div className="flex gap-3">
            <Button onClick={save} disabled={saving} className="bg-green-600 hover:bg-green-700">
              <Save size={16} className="mr-2" /> {saving ? "Saving…" : "Save Redirect"}
            </Button>
            <Button variant="outline" onClick={() => { setEditItem(null); setError("") }}>
              <X size={16} className="mr-2" /> Cancel
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading…</div>
      ) : redirects.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <ArrowRight size={32} className="mx-auto mb-3 text-gray-200" />
          <p>No manual redirects yet. The /products/ auto-fallback still applies to every published product.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {redirects.map((r) => (
            <div key={r._id} className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-sm font-mono">
                  <span className="text-gray-900 truncate">{r.sourcePath}</span>
                  <ArrowRight size={14} className="text-gray-400 shrink-0" />
                  <span className="text-brand-600 truncate">{r.destinationPath}</span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                  <span>{r.redirectType} {r.redirectType === 301 ? "Permanent" : "Temporary"}</span>
                  {!r.active && <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inactive</span>}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="outline" onClick={() => { setError(""); setEditItem({ ...r }) }}>
                  <Edit size={14} />
                </Button>
                <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => del(r._id!)}>
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
