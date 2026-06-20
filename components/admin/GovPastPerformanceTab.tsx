"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Edit, Trash2, Save, X, Search, Eye, EyeOff } from "lucide-react"

interface PastPerformanceRecord {
  _id?: string
  department: string
  organization: string
  state: string
  product: string
  quantity?: number | null
  orderValue?: number | null
  orderYear: number
  status: string
  category: string
  notes: string
  isPublic: boolean
}

const EMPTY: PastPerformanceRecord = {
  department: "",
  organization: "",
  state: "",
  product: "",
  quantity: null,
  orderValue: null,
  orderYear: new Date().getFullYear(),
  status: "Completed",
  category: "Municipal",
  notes: "",
  isPublic: true,
}

const STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Delhi","Goa","Gujarat",
  "Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Ladakh","Lakshadweep",
  "Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Puducherry",
  "Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal",
]

const CATEGORIES = ["Municipal", "Health", "Railways", "Defence", "Agriculture", "Other"]
const STATUSES = ["Completed", "Ongoing", "In Progress", "Pending"]

export function GovPastPerformanceTab() {
  const [records, setRecords] = useState<PastPerformanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<PastPerformanceRecord | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [form, setForm] = useState<PastPerformanceRecord>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState("")
  const [notification, setNotification] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    fetch("/api/admin/gov-past-performance")
      .then((r) => r.json())
      .then((data) => setRecords(Array.isArray(data) ? data : []))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const notify = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3000)
  }

  const startAdd = () => { setForm(EMPTY); setEditing(null); setIsAdding(true) }
  const startEdit = (r: PastPerformanceRecord) => { setForm({ ...r }); setEditing(r); setIsAdding(false) }
  const cancel = () => { setIsAdding(false); setEditing(null) }

  const save = async () => {
    setSaving(true)
    try {
      if (editing?._id) {
        await fetch(`/api/admin/gov-past-performance/${editing._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(form),
        })
        notify("Record updated successfully")
      } else {
        await fetch("/api/admin/gov-past-performance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(form),
        })
        notify("Record added successfully")
      }
      load()
      cancel()
    } catch {
      notify("Error saving record")
    } finally {
      setSaving(false)
    }
  }

  const del = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return
    await fetch(`/api/admin/gov-past-performance/${id}`, { method: "DELETE", credentials: "include" })
    notify("Record deleted")
    load()
  }

  const filtered = records.filter((r) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      r.organization.toLowerCase().includes(q) ||
      r.state.toLowerCase().includes(q) ||
      r.department.toLowerCase().includes(q) ||
      r.product.toLowerCase().includes(q)
    )
  })

  const F = (field: keyof PastPerformanceRecord, value: any) => setForm((p) => ({ ...p, [field]: value }))

  return (
    <div>
      {notification && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-5 py-3 rounded-lg shadow-lg text-sm font-medium">
          {notification}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Government Past Performance</h2>
          <p className="text-sm text-gray-500 mt-0.5">{records.length} procurement records · displayed on website &amp; /past-performance-government</p>
        </div>
        <Button onClick={startAdd} className="gap-2 bg-green-600 hover:bg-green-700 text-white">
          <Plus size={16} /> Add Record
        </Button>
      </div>

      {(isAdding || editing) && (
        <Card className="mb-6 border-brand-300">
          <CardContent className="p-5">
            <h3 className="font-semibold text-gray-800 mb-4">{editing ? "Edit Record" : "New Procurement Record"}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Organization Name *</label>
                <Input placeholder="e.g. Nagar Nigam Muzaffarpur" value={form.organization} onChange={(e) => F("organization", e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Department</label>
                <Input placeholder="e.g. Municipal Corporation" value={form.department} onChange={(e) => F("department", e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">State *</label>
                <select
                  value={form.state}
                  onChange={(e) => F("state", e.target.value)}
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select State</option>
                  {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => F("category", e.target.value)}
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Product / Machines Supplied *</label>
                <Input placeholder="e.g. Double Barrel Thermal Fogging Machine" value={form.product} onChange={(e) => F("product", e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Order Value (₹ Lakhs)</label>
                <Input type="number" placeholder="e.g. 5.5" value={form.orderValue ?? ""} onChange={(e) => F("orderValue", e.target.value ? Number(e.target.value) : null)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Quantity (units)</label>
                <Input type="number" placeholder="e.g. 10" value={form.quantity ?? ""} onChange={(e) => F("quantity", e.target.value ? Number(e.target.value) : null)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Year</label>
                <Input type="number" min={2010} max={2030} value={form.orderYear} onChange={(e) => F("orderYear", Number(e.target.value))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => F("status", e.target.value)}
                  className="w-full border border-input rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes / Details</label>
                <Textarea
                  placeholder="Additional details about this procurement…"
                  value={form.notes}
                  onChange={(e) => F("notes", e.target.value)}
                  rows={3}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isPublic}
                    onChange={(e) => F("isPublic", e.target.checked)}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-700">Show on public website</span>
                  <span className="text-xs text-gray-400">(uncheck to keep private)</span>
                </label>
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={save} disabled={saving || !form.organization || !form.state || !form.product} className="bg-green-600 hover:bg-green-700 text-white gap-2">
                <Save size={14} />
                {saving ? "Saving…" : "Save Record"}
              </Button>
              <Button variant="outline" onClick={cancel}>
                <X size={14} className="mr-1" /> Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Search by organization, state, product…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading records…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg mb-3">📋</p>
          <p className="text-gray-600 font-medium">No past performance records yet.</p>
          <p className="text-sm text-gray-400 mt-1">Add your first government procurement record to build credibility.</p>
          <Button onClick={startAdd} className="mt-4 gap-2 bg-green-600 hover:bg-green-700 text-white">
            <Plus size={14} /> Add First Record
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <div key={r._id} className="flex items-start gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-sm font-semibold text-gray-900">{r.organization}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 font-medium">{r.category}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    r.status === "Completed" ? "bg-green-50 text-green-700" :
                    r.status === "Ongoing" ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-600"
                  }`}>{r.status}</span>
                  {!r.isPublic && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium flex items-center gap-1">
                      <EyeOff size={10} /> Private
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500">{r.department} · {r.state} · {r.orderYear}</p>
                <p className="text-xs text-gray-600 mt-1">{r.product}{r.orderValue ? ` · ₹${r.orderValue}L` : ""}{r.quantity ? ` · ${r.quantity} units` : ""}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => startEdit(r)} className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors">
                  <Edit size={14} />
                </button>
                <button onClick={() => del(r._id!, r.organization)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
        <strong className="block mb-2">Bulk Import from Excel/CSV</strong>
        <p className="mb-2">Export your Excel file as CSV and use the API endpoint <code className="bg-blue-100 px-1 rounded text-xs font-mono">/api/admin/gov-past-performance/import</code> (POST with <code>{"{ rows: [...] }"}</code>) to bulk-import records.</p>
        <p>Required columns: <strong>Organization, State</strong>. Optional: Department, Product, Order Value, Quantity, Year, Status, Category, Notes.</p>
      </div>
      <div className="mt-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
        <strong>View on website:</strong>{" "}
        <a href="/past-performance-government" target="_blank" rel="noopener noreferrer" className="underline font-medium">
          /past-performance-government ↗
        </a>{" "}
        and{" "}
        <a href="/gem-approved-fogging-machine-oem" target="_blank" rel="noopener noreferrer" className="underline font-medium">
          /gem-approved-fogging-machine-oem ↗
        </a>
      </div>
    </div>
  )
}
