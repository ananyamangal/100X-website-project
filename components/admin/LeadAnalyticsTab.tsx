"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"

interface AnalyticsData {
  total: number
  popupLeadsCount: number
  submissionsCount: number
  rfqConversions: number
  bySource: { label: string; count: number }[]
  byPage: { label: string; count: number }[]
  byProduct: { label: string; count: number }[]
  byUtmSource: { label: string; count: number }[]
  byDate: { date: string; count: number }[]
  recentLeads: any[]
}

function Bar({ label, count, max }: { label: string; count: number; max: number }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0
  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="w-36 text-gray-700 truncate text-xs" title={label}>{label}</div>
      <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
        <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="w-8 text-right text-xs text-gray-600">{count}</div>
    </div>
  )
}

export function LeadAnalyticsTab() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [dateFilter, setDateFilter] = useState("all")

  useEffect(() => {
    setLoading(true)
    fetch("/api/admin/lead-analytics")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(d.error); return }
        setData(d)
      })
      .catch(() => setError("Failed to load analytics"))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="text-gray-500 py-8">Loading analytics…</div>
  if (error) return <div className="text-red-600 py-8">{error}</div>
  if (!data) return null

  // Filter byDate by selected range
  const now = new Date()
  const filteredDates = data.byDate.filter(({ date }) => {
    if (dateFilter === "all") return true
    const d = new Date(date)
    const days = dateFilter === "7d" ? 7 : dateFilter === "30d" ? 30 : 90
    return (now.getTime() - d.getTime()) / 86400000 <= days
  })
  const maxDateCount = Math.max(...filteredDates.map((d) => d.count), 1)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-1">Lead Analytics</h2>
        <p className="text-gray-600 text-sm">Combined view of all leads — RFQ popup + form submissions</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Leads", value: data.total, color: "green" },
          { label: "Popup Leads", value: data.popupLeadsCount, color: "blue" },
          { label: "Form Submissions", value: data.submissionsCount, color: "purple" },
          { label: "RFQ Conversions", value: data.rfqConversions, color: "orange" },
        ].map(({ label, value, color }) => (
          <Card key={label}>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500 mt-1">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Date Chart */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Leads by Date</h3>
            <div className="flex gap-2">
              {(["7d", "30d", "90d", "all"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setDateFilter(r)}
                  className={`text-xs px-3 py-1 rounded-full transition-colors ${dateFilter === r ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                >
                  {r === "all" ? "All time" : r}
                </button>
              ))}
            </div>
          </div>
          {filteredDates.length === 0 ? (
            <p className="text-gray-400 text-sm">No data for this period.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredDates.slice(-30).reverse().map(({ date, count }) => (
                <Bar key={date} label={date} count={count} max={maxDateCount} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid sm:grid-cols-2 gap-6">
        {/* By Source */}
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold text-gray-900 mb-3">By Source</h3>
            <div className="space-y-2">
              {data.bySource.map(({ label, count }) => (
                <Bar key={label} label={label} count={count} max={data.bySource[0]?.count || 1} />
              ))}
              {data.bySource.length === 0 && <p className="text-gray-400 text-xs">No data</p>}
            </div>
          </CardContent>
        </Card>

        {/* By UTM Source */}
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold text-gray-900 mb-3">By UTM Source</h3>
            <div className="space-y-2">
              {data.byUtmSource.map(({ label, count }) => (
                <Bar key={label} label={label} count={count} max={data.byUtmSource[0]?.count || 1} />
              ))}
              {data.byUtmSource.length === 0 && <p className="text-gray-400 text-xs">No data</p>}
            </div>
          </CardContent>
        </Card>

        {/* By Page */}
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold text-gray-900 mb-3">By Page</h3>
            <div className="space-y-2">
              {data.byPage.map(({ label, count }) => (
                <Bar key={label} label={label} count={count} max={data.byPage[0]?.count || 1} />
              ))}
              {data.byPage.length === 0 && <p className="text-gray-400 text-xs">No data</p>}
            </div>
          </CardContent>
        </Card>

        {/* By Product */}
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold text-gray-900 mb-3">By Product</h3>
            <div className="space-y-2">
              {data.byProduct.map(({ label, count }) => (
                <Bar key={label} label={label} count={count} max={data.byProduct[0]?.count || 1} />
              ))}
              {data.byProduct.length === 0 && <p className="text-gray-400 text-xs">No data</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Leads */}
      <Card>
        <CardContent className="p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Recent Leads (last 50)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-gray-600 font-medium">Date</th>
                  <th className="px-3 py-2 text-left text-gray-600 font-medium">Source</th>
                  <th className="px-3 py-2 text-left text-gray-600 font-medium">Name</th>
                  <th className="px-3 py-2 text-left text-gray-600 font-medium">Phone</th>
                  <th className="px-3 py-2 text-left text-gray-600 font-medium">Product</th>
                  <th className="px-3 py-2 text-left text-gray-600 font-medium">Page</th>
                  <th className="px-3 py-2 text-left text-gray-600 font-medium">UTM</th>
                  <th className="px-3 py-2 text-left text-gray-600 font-medium">Attach.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.recentLeads.map((l) => (
                  <tr key={l._id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                      {l.createdAt ? new Date(l.createdAt).toLocaleDateString("en-IN") : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <span className="bg-green-50 text-green-700 px-1.5 py-0.5 rounded text-xs">{l.source}</span>
                    </td>
                    <td className="px-3 py-2 text-gray-800">{l.name || "—"}</td>
                    <td className="px-3 py-2 text-gray-800">{l.phone || "—"}</td>
                    <td className="px-3 py-2 text-gray-600 max-w-[120px] truncate">{l.product || "—"}</td>
                    <td className="px-3 py-2 text-gray-500 max-w-[100px] truncate">{l.page || "—"}</td>
                    <td className="px-3 py-2 text-gray-500">{l.utm_source || "—"}</td>
                    <td className="px-3 py-2 text-center">{l.hasAttachment ? "📎" : "—"}</td>
                  </tr>
                ))}
                {data.recentLeads.length === 0 && (
                  <tr><td colSpan={8} className="px-3 py-8 text-center text-gray-400">No leads yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
