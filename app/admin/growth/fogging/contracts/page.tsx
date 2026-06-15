"use client"
import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { Search, Download, ChevronLeft, ChevronRight, RefreshCw, ExternalLink } from "lucide-react"

const INR = (v: number | null | undefined) => {
  if (v == null) return "—"
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(1)} L`
  if (v >= 1e3) return `₹${(v / 1e3).toFixed(0)} K`
  return `₹${Math.round(v).toLocaleString()}`
}

const OEMS = ["NEPTUNE","SSE SAI SHREE ENTERPRISES","FOGGERS","PULSFOG","INSTA FOG","INDOFOG","INFINITY","LUMINICA","100X CIRCLE"]
const YEARS = ["2019","2020","2021","2022","2023","2024","2025"]
const STATES = ["Uttar Pradesh","Bihar","Rajasthan","Madhya Pradesh","Maharashtra","Gujarat","Punjab","Haryana","Tamil Nadu","West Bengal","Karnataka","Andhra Pradesh","Telangana","Odisha","Jharkhand","Uttarakhand","Himachal Pradesh","Chhattisgarh","Assam","Delhi"]

interface Contract {
  gemc_no: string
  contract_date: string | null
  buyer_display_name: string
  buyer_canonical: string
  buyer_state: string | null
  oem_canonical: string
  oem_short_brand: string | null
  model_raw: string | null
  model_normalized: string | null
  contract_value_num: number | null
  quantity: number | null
  unit_price: number | null
  has_unit_price: boolean
  seller_name: string
  seller_gst: string | null
  buying_mode: string | null
  is_100x: boolean
}

interface Summary {
  total_gmv: number
  priced_count: number
  avg_unit_price: number | null
  min_unit_price: number | null
  max_unit_price: number | null
}

function Pg({ page, pages, set }: { page: number; pages: number; set: (p: number) => void }) {
  const visible: number[] = []
  for (let i = Math.max(1, page - 2); i <= Math.min(pages, page + 2); i++) visible.push(i)
  return (
    <div className="flex items-center gap-1 text-xs">
      <button onClick={() => set(Math.max(1, page - 1))} disabled={page === 1}
        className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"><ChevronLeft size={14} /></button>
      {visible[0] > 1 && <><button onClick={() => set(1)} className="px-2 py-1 rounded hover:bg-gray-100">1</button><span className="text-gray-400">…</span></>}
      {visible.map(n => (
        <button key={n} onClick={() => set(n)}
          className={`px-2 py-1 rounded ${n === page ? "bg-gray-800 text-white" : "hover:bg-gray-100"}`}>{n}</button>
      ))}
      {visible[visible.length - 1] < pages && <><span className="text-gray-400">…</span><button onClick={() => set(pages)} className="px-2 py-1 rounded hover:bg-gray-100">{pages}</button></>}
      <button onClick={() => set(Math.min(pages, page + 1))} disabled={page === pages}
        className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"><ChevronRight size={14} /></button>
    </div>
  )
}

export default function ContractDirectory() {
  const [rows, setRows]       = useState<Contract[]>([])
  const [total, setTotal]     = useState(0)
  const [pages, setPages]     = useState(1)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage]       = useState(1)
  const PAGE = 50

  const [f, setF] = useState({ q: "", oem: "", state: "", year: "", sort: "date_desc", priced_only: "" })

  const buildUrl = useCallback((p: number, exportCsv?: boolean) => {
    const qs = new URLSearchParams({ page: String(p), page_size: String(PAGE), sort: f.sort })
    if (f.q)           qs.set("q", f.q)
    if (f.oem)         qs.set("oem_canonical", f.oem)
    if (f.state)       qs.set("buyer_state", f.state)
    if (f.year)        qs.set("year", f.year)
    if (f.priced_only) qs.set("has_unit_price", "true")
    if (exportCsv)     qs.set("export", "csv")
    return `/api/fogging/contracts?${qs}`
  }, [f])

  const load = useCallback(() => {
    setLoading(true)
    fetch(buildUrl(page))
      .then(r => r.json())
      .then(d => {
        setRows(d.data ?? [])
        setTotal(d.total ?? 0)
        setPages(d.pages ?? 1)
        setSummary(d.summary ?? null)
      })
      .finally(() => setLoading(false))
  }, [buildUrl, page])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [f])

  const selClx = "text-xs border border-gray-200 rounded px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-300"

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-screen-xl mx-auto px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
            <Link href="/admin/growth/fogging" className="hover:text-gray-700">Fogging Intelligence</Link>
            <span>/</span>
            <span className="text-gray-800">Contracts</span>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <h1 className="text-lg font-bold text-gray-900">Contract Directory</h1>
              <p className="text-xs text-gray-500 mt-0.5">1,418 contracts · ₹75.08 Cr GMV · full procurement history</p>
            </div>
            <a href={buildUrl(1, true)} download
              className="flex items-center gap-1 text-xs px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 whitespace-nowrap">
              <Download size={12} /> Export CSV
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 py-4 space-y-4">
        {/* Summary strip */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <div className="text-xs text-gray-400">Total Contracts</div>
              <div className="text-lg font-bold">{total.toLocaleString()}</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <div className="text-xs text-gray-400">Total GMV</div>
              <div className="text-lg font-bold">{INR(summary.total_gmv)}</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <div className="text-xs text-gray-400">With Unit Price</div>
              <div className="text-lg font-bold">{summary.priced_count}</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <div className="text-xs text-gray-400">Min Unit Price</div>
              <div className="text-lg font-bold text-green-600">{INR(summary.min_unit_price)}</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <div className="text-xs text-gray-400">Max Unit Price</div>
              <div className="text-lg font-bold text-red-600">{INR(summary.max_unit_price)}</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-gray-300 w-52"
              placeholder="GEMC#, buyer, seller, model…"
              value={f.q}
              onChange={e => setF(v => ({ ...v, q: e.target.value }))}
            />
          </div>
          <select className={selClx} value={f.oem} onChange={e => setF(v => ({ ...v, oem: e.target.value }))}>
            <option value="">All OEMs</option>
            {OEMS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <select className={selClx} value={f.state} onChange={e => setF(v => ({ ...v, state: e.target.value }))}>
            <option value="">All States</option>
            {STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className={selClx} value={f.year} onChange={e => setF(v => ({ ...v, year: e.target.value }))}>
            <option value="">All Years</option>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select className={selClx} value={f.sort} onChange={e => setF(v => ({ ...v, sort: e.target.value }))}>
            <option value="date_desc">Newest first</option>
            <option value="date_asc">Oldest first</option>
            <option value="value_desc">Highest value</option>
            <option value="value_asc">Lowest value</option>
            <option value="price_desc">Highest unit price</option>
            <option value="price_asc">Lowest unit price</option>
          </select>
          <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer">
            <input type="checkbox" checked={!!f.priced_only} onChange={e => setF(v => ({ ...v, priced_only: e.target.checked ? "1" : "" }))} className="rounded" />
            Unit price only
          </label>
          {(f.q || f.oem || f.state || f.year || f.priced_only) && (
            <button onClick={() => setF({ q: "", oem: "", state: "", year: "", sort: f.sort, priced_only: "" })}
              className="text-xs text-gray-500 hover:text-gray-800 underline">Clear</button>
          )}
          <span className="ml-auto text-xs text-gray-400">{total.toLocaleString()} contracts</span>
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-12"><RefreshCw size={20} className="animate-spin text-gray-400" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">GEMC#</th>
                    <th className="px-3 py-2 text-left font-semibold">Date</th>
                    <th className="px-3 py-2 text-left font-semibold">Buyer</th>
                    <th className="px-3 py-2 text-left font-semibold">St</th>
                    <th className="px-3 py-2 text-left font-semibold">OEM</th>
                    <th className="px-3 py-2 text-left font-semibold">Model</th>
                    <th className="px-3 py-2 text-right font-semibold">Value</th>
                    <th className="px-3 py-2 text-right font-semibold">Qty</th>
                    <th className="px-3 py-2 text-right font-semibold">Unit ₹</th>
                    <th className="px-3 py-2 text-left font-semibold">Seller</th>
                    <th className="px-3 py-2 text-center font-semibold">GeM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {rows.map(r => (
                    <tr key={r.gemc_no} className={`hover:bg-gray-50 ${r.is_100x ? "bg-blue-50/40" : ""}`}>
                      <td className="px-3 py-2">
                        <Link href={`/admin/growth/fogging/contracts/${encodeURIComponent(r.gemc_no)}`}
                          className="font-mono text-blue-600 hover:underline text-[10px] whitespace-nowrap">
                          {r.gemc_no.slice(-12)}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                        {r.contract_date ? new Date(r.contract_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : "—"}
                      </td>
                      <td className="px-3 py-2 max-w-[160px]">
                        <Link href={`/admin/growth/fogging/buyer/${encodeURIComponent(r.buyer_canonical)}`}
                          className="font-medium text-blue-700 hover:underline block truncate">{r.buyer_display_name}</Link>
                      </td>
                      <td className="px-3 py-2 text-gray-500">{r.buyer_state?.slice(0, 3) ?? "—"}</td>
                      <td className="px-3 py-2">
                        <Link href={`/admin/growth/fogging/oem/${encodeURIComponent(r.oem_canonical)}`}
                          className="text-purple-700 hover:underline font-medium whitespace-nowrap">
                          {(r.oem_short_brand ?? r.oem_canonical).slice(0, 12)}
                        </Link>
                        {r.is_100x && <span className="ml-1 text-[9px] bg-blue-100 text-blue-700 px-1 rounded">100X</span>}
                      </td>
                      <td className="px-3 py-2 max-w-[120px]">
                        {r.model_normalized ? (
                          <Link href={`/admin/growth/fogging/model/${encodeURIComponent(r.model_normalized)}`}
                            className="text-green-700 hover:underline truncate block">{r.model_raw?.slice(0, 20) ?? r.model_normalized}</Link>
                        ) : (
                          <span className="text-gray-400 truncate block">{r.model_raw?.slice(0, 20) ?? "—"}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold">{INR(r.contract_value_num)}</td>
                      <td className="px-3 py-2 text-right text-gray-500">{r.quantity ?? "—"}</td>
                      <td className="px-3 py-2 text-right text-green-700">{r.has_unit_price ? INR(r.unit_price) : "—"}</td>
                      <td className="px-3 py-2 max-w-[120px]">
                        {r.seller_gst ? (
                          <Link href={`/admin/growth/fogging/sellers/${encodeURIComponent(r.seller_gst)}`}
                            className="text-amber-700 hover:underline truncate block">{r.seller_name.slice(0, 18)}</Link>
                        ) : (
                          <span className="text-gray-500 truncate block">{r.seller_name.slice(0, 18)}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <a href={`https://mkp.gem.gov.in/GeM-Brochures/public/brochure/${r.gemc_no}`}
                          target="_blank" rel="noreferrer"
                          className="text-blue-500 hover:text-blue-700">
                          <ExternalLink size={12} />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Showing {rows.length} of {total.toLocaleString()}</span>
          <Pg page={page} pages={pages} set={setPage} />
        </div>
      </div>
    </div>
  )
}
