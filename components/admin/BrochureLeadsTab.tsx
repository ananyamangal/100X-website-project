"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Download } from "lucide-react"

export function BrochureLeadsTab() {
  const [leads, setLeads] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetch("/api/brochure-leads")
      .then((r) => r.json())
      .then((d) => setLeads(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = leads.filter((l) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return [l.name, l.phone, l.email, l.organization, l.state, l.source].filter(Boolean).join(" ").toLowerCase().includes(q)
  })

  const exportCsv = () => {
    const headers = ["createdAt", "name", "phone", "email", "organization", "state", "source", "brochureType", "pageUrl"]
    const escape = (v: unknown) => {
      const s = v == null ? "" : String(v)
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const lines = [headers.join(","), ...filtered.map((l) => headers.map((h) => escape(l[h])).join(","))]
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `brochure-leads-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const bySource = leads.reduce<Record<string, number>>((acc, l) => {
    const s = l.source || "unknown"
    acc[s] = (acc[s] || 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-1">Brochure Downloads</h2>
          <p className="text-gray-600 text-sm">{leads.length} leads captured via brochure lead form</p>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={!filtered.length} className="bg-transparent">
          <Download className="mr-2" size={16} />
          Export CSV
        </Button>
      </div>

      {/* Stats by source */}
      {Object.keys(bySource).length > 0 && (
        <div className="flex flex-wrap gap-3">
          {Object.entries(bySource).map(([src, count]) => (
            <div key={src} className="bg-green-50 border border-green-100 rounded-xl px-4 py-2 text-sm">
              <span className="font-semibold text-green-800">{count}</span>
              <span className="text-green-600 ml-1 capitalize">{src}</span>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name, phone, email, state…"
        className="w-full max-w-sm h-10 rounded-md border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
      />

      {loading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            <p className="text-sm">No brochure leads yet. Leads appear here when visitors fill the download form.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {["Date", "Name", "Phone", "Email", "Organization", "State", "Source", "Type"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((l) => (
                <tr key={l._id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-500 whitespace-nowrap text-xs">
                    {l.createdAt ? new Date(l.createdAt).toLocaleDateString("en-IN") : "—"}
                  </td>
                  <td className="px-3 py-2 font-medium text-gray-900">{l.name || "—"}</td>
                  <td className="px-3 py-2 text-gray-700">{l.phone || "—"}</td>
                  <td className="px-3 py-2 text-gray-700 max-w-[160px] truncate">{l.email || "—"}</td>
                  <td className="px-3 py-2 text-gray-600">{l.organization || "—"}</td>
                  <td className="px-3 py-2 text-gray-600">{l.state || "—"}</td>
                  <td className="px-3 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${l.source === "navbar" ? "bg-blue-50 text-blue-700" : l.source === "product-detail" ? "bg-purple-50 text-purple-700" : "bg-gray-100 text-gray-600"}`}>
                      {l.source || "unknown"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-500">{l.brochureType || "main"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
