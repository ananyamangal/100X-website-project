"use client"

import { useState, useEffect } from "react"

interface OemLead {
  _id: string
  name: string
  company: string
  mobile: string
  email: string
  state: string
  gemSellerId?: string
  tenderName?: string
  tenderClosingDate?: string
  product: string
  message?: string
  source: string
  status: "new" | "contacted" | "in_progress" | "completed" | "rejected"
  createdAt: string
}

const STATUS_COLORS: Record<string, string> = {
  new: "bg-emerald-100 text-emerald-700",
  contacted: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  completed: "bg-gray-100 text-gray-600",
  rejected: "bg-red-100 text-red-700",
}

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  in_progress: "In Progress",
  completed: "Completed",
  rejected: "Rejected",
}

export function OemLeadsTab() {
  const [leads, setLeads] = useState<OemLead[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [selected, setSelected] = useState<OemLead | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set("status", statusFilter)
      const res = await fetch(`/api/admin/oem-leads?${params}`)
      const data = await res.json()
      setLeads(Array.isArray(data) ? data : [])
    } catch {
      setLeads([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [statusFilter])

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/admin/oem-leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    await load()
    if (selected?._id === id) setSelected((s) => s ? { ...s, status: status as OemLead["status"] } : s)
  }

  const deleteLead = async (id: string) => {
    if (!confirm("Delete this lead?")) return
    await fetch(`/api/admin/oem-leads/${id}`, { method: "DELETE" })
    setSelected(null)
    await load()
  }

  const filtered = leads.filter((l) => {
    if (!filter) return true
    const q = filter.toLowerCase()
    return l.name?.toLowerCase().includes(q) ||
      l.company?.toLowerCase().includes(q) ||
      l.mobile?.includes(q) ||
      l.email?.toLowerCase().includes(q) ||
      l.state?.toLowerCase().includes(q) ||
      l.tenderName?.toLowerCase().includes(q)
  })

  const exportCsv = () => {
    const headers = ["Name","Company","Mobile","Email","State","GeM Seller ID","Product","Tender Name","Closing Date","Status","Source","Created"]
    const rows = filtered.map((l) => [
      l.name, l.company, l.mobile, l.email, l.state, l.gemSellerId || "",
      l.product, l.tenderName || "", l.tenderClosingDate || "",
      l.status, l.source, new Date(l.createdAt).toLocaleDateString("en-IN"),
    ])
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = "oem-leads.csv"; a.click()
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">OEM Authorization Leads</h2>
          <p className="text-sm text-gray-500">{leads.length} total leads</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select
            className="px-3 py-2 border rounded-lg text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <input
            className="px-3 py-2 border rounded-lg text-sm w-52"
            placeholder="Search name, company, state…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <button onClick={exportCsv} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg text-sm transition-colors">
            Export CSV
          </button>
          <button onClick={load} className="px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 font-semibold rounded-lg text-sm transition-colors">
            Refresh
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {Object.entries(STATUS_LABELS).map(([k, label]) => {
          const count = leads.filter((l) => l.status === k).length
          return (
            <button
              key={k}
              onClick={() => setStatusFilter(statusFilter === k ? "" : k)}
              className={`p-3 rounded-xl border text-left transition-all ${statusFilter === k ? "ring-2 ring-green-500" : ""}`}
            >
              <p className="text-xl font-black text-gray-800">{count}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No leads yet. OEM authorization requests will appear here.</div>
      ) : (
        <div className="overflow-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {["Date","Name","Company","State","Product","Tender","Status","Actions"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((lead) => (
                <tr key={lead._id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelected(lead)}>
                  <td className="px-4 py-3 whitespace-nowrap text-gray-500 text-xs">
                    {new Date(lead.createdAt).toLocaleDateString("en-IN")}
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-800 whitespace-nowrap">{lead.name}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{lead.company}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{lead.state}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-[160px] truncate">{lead.product}</td>
                  <td className="px-4 py-3 text-gray-500 max-w-[180px] truncate">{lead.tenderName || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[lead.status] || "bg-gray-100 text-gray-600"}`}>
                      {STATUS_LABELS[lead.status] || lead.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <select
                      className="text-xs border rounded px-2 py-1 mr-2"
                      value={lead.status}
                      onChange={(e) => updateStatus(lead._id, e.target.value)}
                    >
                      {Object.entries(STATUS_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                    <button
                      className="text-xs text-red-500 hover:text-red-700"
                      onClick={(e) => { e.stopPropagation(); deleteLead(lead._id) }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h3 className="font-bold text-gray-800 text-lg">{selected.name}</h3>
                <p className="text-sm text-gray-500">{selected.company} · {selected.state}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[
                  ["Mobile", selected.mobile],
                  ["Email", selected.email],
                  ["State", selected.state],
                  ["GeM Seller ID", selected.gemSellerId || "—"],
                  ["Product", selected.product],
                  ["Source", selected.source],
                ].map(([k, v]) => (
                  <div key={k}>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">{k}</p>
                    <p className="text-sm text-gray-800 break-all">{v}</p>
                  </div>
                ))}
              </div>
              {selected.tenderName && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Tender Name</p>
                  <p className="text-sm text-gray-800">{selected.tenderName}</p>
                </div>
              )}
              {selected.tenderClosingDate && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Closing Date</p>
                  <p className="text-sm text-gray-800">{selected.tenderClosingDate}</p>
                </div>
              )}
              {selected.message && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Message</p>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{selected.message}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Update Status</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(STATUS_LABELS).map(([v, l]) => (
                    <button
                      key={v}
                      onClick={() => updateStatus(selected._id, v)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${selected.status === v ? "bg-green-600 text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-700"}`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <a href={`tel:${selected.mobile}`} className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl text-sm text-center transition-colors">
                  Call
                </a>
                <a href={`mailto:${selected.email}`} className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm text-center transition-colors">
                  Email
                </a>
                <a href={`https://wa.me/91${selected.mobile.replace(/\D/g, "").slice(-10)}`} target="_blank" rel="noopener noreferrer"
                  className="flex-1 py-2 bg-[#25D366] hover:bg-[#1ebe5a] text-white font-semibold rounded-xl text-sm text-center transition-colors">
                  WhatsApp
                </a>
              </div>
              <button onClick={() => deleteLead(selected._id)}
                className="w-full py-2 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors">
                Delete Lead
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
