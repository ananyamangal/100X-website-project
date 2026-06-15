"use client"
import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Search, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react"

const INR = (v: number | null | undefined) => {
  if (v == null) return "—"
  if (v >= 10_000_000) return `₹${(v / 10_000_000).toFixed(2)} Cr`
  if (v >= 100_000)    return `₹${(v / 100_000).toFixed(1)} L`
  return `₹${v.toLocaleString('en-IN')}`
}

interface Seller {
  seller_slug: string; seller_gst: string | null; seller_display_name: string
  seller_state: string | null; seller_state_code: string | null; has_gst: boolean
  is_100x_dealer: boolean; is_reseller: boolean | null; is_oem_seller: boolean | null
  selling_as: string | null; seller_msme: string | null
  total_gmv: number; total_contracts: number; average_contract_value: number
  buyers_served: number; states_served: number; oem_count: number
  last_contract_date: string | null; days_since_last: number
  top_oem: string | null
  avg_unit_price: number | null; median_unit_price: number | null
  oems_represented: { oem_canonical: string; brand_name: string; gmv: number }[]
}

const SORT_OPTIONS = [
  { value: "gmv",       label: "Highest GMV" },
  { value: "contracts", label: "Most Contracts" },
  { value: "buyers",    label: "Most Buyers" },
  { value: "states",    label: "Most States" },
  { value: "recent",    label: "Most Recent" },
]

export default function SellersPage() {
  const router = useRouter()
  const [sellers, setSellers]   = useState<Seller[]>([])
  const [total,   setTotal]     = useState(0)
  const [loading, setLoading]   = useState(true)
  const [page,    setPage]      = useState(1)
  const PAGE_SIZE = 50

  const [filters, setFilters] = useState({
    q: "", sort: "gmv", state: "", is_100x: "", multi_oem: "", has_gst: ""
  })

  const load = useCallback(() => {
    setLoading(true)
    const qs = new URLSearchParams({ sort: filters.sort, page: String(page), page_size: String(PAGE_SIZE) })
    if (filters.q)         qs.set("q",         filters.q)
    if (filters.state)     qs.set("state",      filters.state)
    if (filters.is_100x)   qs.set("is_100x",    filters.is_100x)
    if (filters.multi_oem) qs.set("multi_oem",  filters.multi_oem)
    if (filters.has_gst)   qs.set("has_gst",    filters.has_gst)
    fetch(`/api/fogging/sellers?${qs}`)
      .then(r => r.json())
      .then(d => { setSellers(d.data ?? []); setTotal(d.total ?? 0) })
      .finally(() => setLoading(false))
  }, [filters, page])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [filters])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-lg font-bold text-gray-900">Seller / Dealer Intelligence</h1>
              <div className="text-xs text-gray-400">
                {total.toLocaleString()} sellers · Fogging Intelligence
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-5 space-y-4">
        {/* Filter bar */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={filters.q}
                onChange={e => setFilters(f => ({ ...f, q: e.target.value }))}
                placeholder="Search seller name or GST…"
                className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select value={filters.sort} onChange={e => setFilters(f => ({ ...f, sort: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            <select value={filters.state} onChange={e => setFilters(f => ({ ...f, state: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All States</option>
              {["Uttar Pradesh","Maharashtra","Madhya Pradesh","Bihar","Gujarat","Haryana",
                "Delhi","Rajasthan","Chhattisgarh","Punjab","Uttarakhand","Jharkhand",
                "Odisha","Karnataka","Tamil Nadu","West Bengal","Assam","Kerala"].map(s =>
                <option key={s} value={s}>{s}</option>)}
            </select>

            <select value={filters.is_100x} onChange={e => setFilters(f => ({ ...f, is_100x: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All Sellers</option>
              <option value="true">100X Dealers only</option>
              <option value="false">Non-100X only</option>
            </select>

            <select value={filters.multi_oem} onChange={e => setFilters(f => ({ ...f, multi_oem: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Single or multi-OEM</option>
              <option value="true">Multi-OEM only</option>
            </select>

            {(filters.q || filters.state || filters.is_100x || filters.multi_oem || filters.has_gst) && (
              <button onClick={() => setFilters(f => ({ ...f, q:"", state:"", is_100x:"", multi_oem:"", has_gst:"" }))}
                className="text-sm text-gray-500 hover:text-gray-800 underline">Clear</button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="py-16 text-center text-gray-400 text-sm">Loading sellers…</div>
          ) : sellers.length === 0 ? (
            <div className="py-16 text-center text-gray-400 text-sm">No sellers match the current filters.</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr className="text-xs text-gray-500 uppercase tracking-wide">
                      <th className="px-4 py-3 text-right w-10">#</th>
                      <th className="px-4 py-3 text-left">Seller / Dealer</th>
                      <th className="px-3 py-3 text-left">State</th>
                      <th className="px-3 py-3 text-right">GMV</th>
                      <th className="px-3 py-3 text-right">Contracts</th>
                      <th className="px-3 py-3 text-right">Buyers</th>
                      <th className="px-3 py-3 text-left">OEMs</th>
                      <th className="px-3 py-3 text-left">Type</th>
                      <th className="px-3 py-3 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sellers.map((s, i) => {
                      const rank = (page - 1) * PAGE_SIZE + i + 1
                      const oemLabels = (s.oems_represented || []).slice(0, 3).map(o => o.brand_name || o.oem_canonical)
                      return (
                        <tr key={s.seller_slug}
                          className="hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => router.push(`/admin/growth/fogging/sellers/${encodeURIComponent(s.seller_slug)}`)}>
                          <td className="px-4 py-2.5 text-right text-xs text-gray-400">{rank}</td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <div>
                                <div className="font-medium text-gray-900 text-xs leading-tight">
                                  {s.seller_display_name}
                                </div>
                                {s.seller_gst && (
                                  <div className="font-mono text-xs text-gray-400 mt-0.5">{s.seller_gst}</div>
                                )}
                              </div>
                              {s.is_100x_dealer && (
                                <span className="shrink-0 text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded font-medium">100X</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-xs text-gray-600">{s.seller_state ?? "—"}</td>
                          <td className="px-3 py-2.5 text-right text-xs font-semibold text-gray-800">{INR(s.total_gmv)}</td>
                          <td className="px-3 py-2.5 text-right text-xs text-gray-700">{s.total_contracts}</td>
                          <td className="px-3 py-2.5 text-right text-xs text-gray-700">{s.buyers_served}</td>
                          <td className="px-3 py-2.5 text-xs text-gray-600">
                            <div className="flex flex-wrap gap-1">
                              {oemLabels.map(o => (
                                <span key={o} className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{o}</span>
                              ))}
                              {(s.oems_represented?.length ?? 0) > 3 && (
                                <span className="text-xs text-gray-400">+{s.oems_represented.length - 3}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-xs text-gray-500">
                            {s.selling_as === 'OEM' ? (
                              <span className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded text-xs">OEM Direct</span>
                            ) : s.selling_as?.includes('verified') ? (
                              <span className="bg-green-50 text-green-700 px-1.5 py-0.5 rounded text-xs">Verified Reseller</span>
                            ) : s.selling_as ? (
                              <span className="bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded text-xs">Reseller</span>
                            ) : null}
                          </td>
                          <td className="px-3 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => router.push(`/admin/growth/fogging/sellers/${encodeURIComponent(s.seller_slug)}`)}
                              className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs text-gray-700 transition-colors flex items-center gap-1">
                              360 <ExternalLink size={10} />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <span>Page {page} of {totalPages} · {total.toLocaleString()} sellers</span>
                <div className="flex items-center gap-2">
                  <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                    className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30">
                    <ChevronLeft size={14} />
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const start = Math.max(1, Math.min(page - 2, totalPages - 4))
                    return start + i
                  }).map(n => (
                    <button key={n} onClick={() => setPage(n)}
                      className={`w-7 h-7 rounded text-xs transition-colors ${n === page ? "bg-blue-600 text-white" : "hover:bg-gray-100"}`}>
                      {n}
                    </button>
                  ))}
                  <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                    className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30">
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
