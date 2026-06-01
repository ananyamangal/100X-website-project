"use client"
import React, { useEffect, useState } from "react"
import { Plus, Edit, Trash2, Save, X, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

interface Review {
  _id?: string
  customerName: string
  organization?: string
  location?: string
  rating: number
  review: string
  imageUrl?: string
  product?: string
  isPublished: boolean
  order?: number
}

const empty: Review = {
  customerName: "",
  organization: "",
  location: "",
  rating: 5,
  review: "",
  imageUrl: "",
  product: "",
  isPublished: true,
  order: 0,
}

export function ReviewsTab() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [editItem, setEditItem] = useState<Review | null>(null)
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    fetch("/api/admin/reviews")
      .then((r) => r.json())
      .then((data) => { setReviews(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const save = async () => {
    if (!editItem) return
    setSaving(true)
    const isNew = !editItem._id
    const url = isNew ? "/api/admin/reviews" : `/api/admin/reviews/${editItem._id}`
    const method = isNew ? "POST" : "PUT"
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(editItem) })
    setSaving(false)
    setEditItem(null)
    load()
  }

  const del = async (id: string) => {
    if (!confirm("Delete this review?")) return
    await fetch(`/api/admin/reviews/${id}`, { method: "DELETE" })
    load()
  }

  const field = (key: keyof Review, label: string, type: string = "text") => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <Input
        type={type}
        value={String(editItem?.[key] ?? "")}
        onChange={(e) => setEditItem((p) => p ? { ...p, [key]: type === "number" ? Number(e.target.value) : e.target.value } : p)}
      />
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Customer Reviews</h2>
          <p className="text-sm text-gray-500 mt-1">Manage reviews displayed on the homepage and product pages.</p>
        </div>
        <Button onClick={() => setEditItem({ ...empty })} className="bg-green-600 hover:bg-green-700">
          <Plus size={16} className="mr-2" /> Add Review
        </Button>
      </div>

      {editItem && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="font-semibold text-gray-800 mb-4">{editItem._id ? "Edit Review" : "New Review"}</h3>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            {field("customerName", "Customer Name *")}
            {field("organization", "Organization")}
            {field("location", "Location (City, State)")}
            {field("product", "Product (optional — filters to product page)")}
            {field("rating", "Rating (1-5)", "number")}
            {field("imageUrl", "Photo URL (optional)")}
            {field("order", "Display Order", "number")}
          </div>
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-600 mb-1">Review Text *</label>
            <Textarea
              rows={4}
              value={editItem.review || ""}
              onChange={(e) => setEditItem((p) => p ? { ...p, review: e.target.value } : p)}
              placeholder="Write the customer's review here..."
            />
          </div>
          <div className="flex items-center gap-3 mb-4">
            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={!!editItem.isPublished}
                onChange={(e) => setEditItem((p) => p ? { ...p, isPublished: e.target.checked } : p)}
                className="rounded"
              />
              Published
            </label>
          </div>
          <div className="flex gap-3">
            <Button onClick={save} disabled={saving} className="bg-green-600 hover:bg-green-700">
              <Save size={16} className="mr-2" /> {saving ? "Saving…" : "Save Review"}
            </Button>
            <Button variant="outline" onClick={() => setEditItem(null)}>
              <X size={16} className="mr-2" /> Cancel
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading…</div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Star size={32} className="mx-auto mb-3 text-gray-200" />
          <p>No reviews yet. Add your first customer review.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r._id} className="bg-white rounded-xl border border-gray-100 p-5 flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-600 text-gray-900">{r.customerName}</p>
                  {r.organization && <span className="text-xs text-gray-400">· {r.organization}</span>}
                  {r.location && <span className="text-xs text-gray-400">· {r.location}</span>}
                  <div className="flex ml-1">
                    {[1,2,3,4,5].map((s) => (
                      <Star key={s} size={12} className={s <= r.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'} />
                    ))}
                  </div>
                  {!r.isPublished && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Draft</span>}
                </div>
                <p className="text-sm text-gray-600 line-clamp-2 italic">"{r.review}"</p>
                {r.product && <p className="text-xs text-brand-600 mt-1">Product: {r.product}</p>}
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="outline" onClick={() => setEditItem({ ...r })}>
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
