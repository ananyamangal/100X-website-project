"use client"
import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { Search, ChevronLeft, ChevronRight, RefreshCw, Building2, AlertCircle } from "lucide-react"

const INR = (v: number | null | undefined) => {
  if (v == null) return "—"
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(1)} L`
  return `₹${Math.round(v).toLocaleString()}`
}

const DEPT_CATS = [
  "Railways","Health","Agriculture & Rural","Urban Development","Municipal",
  "Defence & Police","Education & Research","Science & Research",
  "Power & Energy","Finance & Commerce","Forest & Environment","Public Works","Other",
]
const ORG_TYPES = [
  "Railway","State Department","Central Department","PSU","Corporation","Panchayat",
  "Municipality","Development Authority","Health Authority","University","Police","Statutory Body",
]
const STATES = [
  "Central Government","Uttar Pradesh","Maharashtra","Gujarat","Uttarakhand","Haryana",
  "Bihar","Madhya Pradesh","Karnataka","Kerala","Rajasthan","Punjab","Odisha","Jharkhand",
  "Tamil Nadu","Chhattisgarh","Delhi","Andhra Pradesh","Assam","Himachal Pradesh",
  "Jammu","Manipur","Tripura","Sikkim","Chandigarh","Lakshadweep","West Bengal",
]
const STATUS_COLORS: Record<string, string> = {
  verified:         "bg-green-100 text-green-700",
  merged:           "bg-blue-100 text-blue-700",
  review_required:  "bg-yellow-100 text-yellow-700",
  unresolved:       "bg-red-100 text-red-700",
}

interface Org {
  organization_canonical: string
  organization_name:      string
  organization_state:     string | null
  dept_category:          string
  organization_type:      string
  organization_status:    string
  total_gmv:              number | null
  total_contracts:        number
  oem_count:              number
  seller_count:           number
  incumbent_oem_brand:    string | null
  is_100x_buyer:          boolean
  buyer_count_merged:     number
  first_contract:         string | null
  last_contract:          string | null
}

function Pg({ page, pages, set }: { page: number; pages: number; set: (p: number) => void }) {
  const visible: number[] = []
  for (let i = Math.max(1, page-2); i <= Math.min(pages, page+2); i++) visible.push(i)
  return (
    <div className="flex items-center gap-1 text-xs">
      <button onClick={() => set(Math.max(1, page-1))} disabled={page===1}
        className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"><ChevronLeft size={14}/></button>
      {visible[0]>1 && <><button onClick={()=>set(1)} className="px-2 py-1 rounded hover:bg-gray-100">1</button><span className="text-gray-400">…</span></>}
      {visible.map(n=>(
        <button key={n} onClick={()=>set(n)}
          className={`px-2 py-1 rounded ${n===page?"bg-gray-800 text-white":"hover:bg-gray-100"}`}>{n}</button>
      ))}
      {visible[visible.length-1]<pages && <><span className="text-gray-400">…</span><button onClick={()=>set(pages)} className="px-2 py-1 rounded hover:bg-gray-100">{pages}</button></>}
      <button onClick={()=>set(Math.min(pages, page+1))} disabled={page===pages}
        className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"><ChevronRight size={14}/></button>
    </div>
  )
}

export default function OrganizationDirectory() {
  const [rows, setRows]     = useState<Org[]>([])
  const [total, setTotal]   = useState(0)
  const [pages, setPages]   = useState(1)
  const [summary, setSummary] = useState<Record<string, number> | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage]     = useState(1)
  const PAGE = 50

  const [f, setF] = useState({ q: "", state: "", dept_cat: "", org_type: "", status: "", sort: "gmv_desc" })

  const buildUrl = useCallback((p: number) => {
    const qs = new URLSearchParams({ page: String(p), page_size: String(PAGE), sort: f.sort })
    if (f.q)        qs.set("q",        f.q)
    if (f.state)    qs.set("state",    f.state)
    if (f.dept_cat) qs.set("dept_cat", f.dept_cat)
    if (f.org_type) qs.set("org_type", f.org_type)
    if (f.status)   qs.set("status",   f.status)
    return `/api/fogging/organizations?${qs}`
  }, [f])

  const load = useCallback(() => {
    setLoading(true)
    fetch(buildUrl(page)).then(r=>r.json()).then(d=>{
      setRows(d.data ?? [])
      setTotal(d.total ?? 0)
      setPages(d.pages ?? 1)
      setSummary(d.summary ?? null)
    }).finally(() => setLoading(false))
  }, [buildUrl, page])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [f])

  const sel = "text-xs border border-gray-200 rounded px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-300"

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-screen-xl mx-auto px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
            <Link href="/admin/growth/fogging" className="hover:text-gray-700">Fogging Intelligence</Link>
            <span>/</span>
            <span className="text-gray-800">Organizations</span>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Building2 size={18} className="text-indigo-600" /> Organization Directory
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Primary procurement intelligence layer — organizations, not departments
              </p>
            </div>
            {summary && (
              <div className="flex items-center gap-4 text-xs text-gray-600">
                <span><span className="font-bold">{summary.org_count}</span> orgs</span>
                <span><span className="font-bold text-indigo-700">{INR(summary.total_gmv)}</span> GMV</span>
                <span><span className="font-bold">{summary.total_contracts?.toLocaleString()}</span> contracts</span>
                {summary.unresolved > 0 && (
                  <span className="flex items-center gap-1 text-red-600">
                    <AlertCircle size={12}/> {summary.unresolved} unresolved
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 py-4 space-y-4">

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input className="pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded bg-white focus:outline-none focus:ring-1 focus:ring-gray-300 w-48"
              placeholder="Org name, canonical…" value={f.q}
              onChange={e => setF(v => ({ ...v, q: e.target.value }))}/>
          </div>
          <select className={sel} value={f.state} onChange={e => setF(v => ({ ...v, state: e.target.value }))}>
            <option value="">All States</option>
            {STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className={sel} value={f.dept_cat} onChange={e => setF(v => ({ ...v, dept_cat: e.target.value }))}>
            <option value="">All Categories</option>
            {DEPT_CATS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className={sel} value={f.org_type} onChange={e => setF(v => ({ ...v, org_type: e.target.value }))}>
            <option value="">All Types</option>
            {ORG_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className={sel} value={f.status} onChange={e => setF(v => ({ ...v, status: e.target.value }))}>
            <option value="">All Statuses</option>
            <option value="verified">Verified</option>
            <option value="merged">Merged</option>
            <option value="unresolved">Unresolved</option>
          </select>
          <select className={sel} value={f.sort} onChange={e => setF(v => ({ ...v, sort: e.target.value }))}>
            <option value="gmv_desc">Highest GMV</option>
            <option value="gmv_asc">Lowest GMV</option>
            <option value="contracts_desc">Most Contracts</option>
            <option value="name_asc">Name A–Z</option>
          </select>
          {(f.q||f.state||f.dept_cat||f.org_type||f.status) && (
            <button onClick={() => setF({ q:"",state:"",dept_cat:"",org_type:"",status:"",sort:f.sort })}
              className="text-xs text-gray-500 hover:text-gray-800 underline">Clear</button>
          )}
          <span className="ml-auto text-xs text-gray-400">{total} organizations</span>
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-12"><RefreshCw size={20} className="animate-spin text-gray-400"/></div>
          ) : rows.length === 0 ? (
            <div className="text-center py-12 text-xs text-gray-400">No organizations found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wide">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Organization</th>
                    <th className="px-3 py-2 text-left font-semibold">State</th>
                    <th className="px-3 py-2 text-left font-semibold">Category</th>
                    <th className="px-3 py-2 text-left font-semibold">Type</th>
                    <th className="px-3 py-2 text-right font-semibold">GMV</th>
                    <th className="px-3 py-2 text-right font-semibold">Contracts</th>
                    <th className="px-3 py-2 text-left font-semibold">Incumbent OEM</th>
                    <th className="px-3 py-2 text-center font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {rows.map(r => (
                    <tr key={r.organization_canonical} className={`hover:bg-gray-50 ${r.is_100x_buyer ? "bg-blue-50/30" : ""}`}>
                      <td className="px-3 py-2 max-w-[240px]">
                        <Link href={`/admin/growth/fogging/organizations/${encodeURIComponent(r.organization_canonical)}`}
                          className="font-medium text-indigo-700 hover:underline block truncate">
                          {r.organization_name}
                        </Link>
                        {r.buyer_count_merged > 1 && (
                          <span className="text-[10px] text-blue-500">{r.buyer_count_merged} buyers merged</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {r.organization_state ? (
                          <Link href={`/admin/growth/fogging/state/${encodeURIComponent(r.organization_state)}`}
                            className="text-gray-600 hover:text-indigo-700 hover:underline text-[11px]">
                            {r.organization_state.slice(0, 18)}
                          </Link>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-3 py-2 text-gray-600 text-[11px]">{r.dept_category}</td>
                      <td className="px-3 py-2 text-gray-500 text-[11px]">{r.organization_type}</td>
                      <td className="px-3 py-2 text-right font-semibold">{INR(r.total_gmv)}</td>
                      <td className="px-3 py-2 text-right text-gray-600">{r.total_contracts}</td>
                      <td className="px-3 py-2">
                        {r.incumbent_oem_brand ? (
                          <Link href={`/admin/growth/fogging/oem/${encodeURIComponent(r.incumbent_oem_brand?.toUpperCase() || '')}`}
                            className="text-purple-700 hover:underline text-[11px]">
                            {r.incumbent_oem_brand}
                          </Link>
                        ) : r.is_100x_buyer ? (
                          <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">100X</span>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${STATUS_COLORS[r.organization_status] || "bg-gray-100 text-gray-600"}`}>
                          {r.organization_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Showing {rows.length} of {total}</span>
          <Pg page={page} pages={pages} set={setPage}/>
        </div>
      </div>
    </div>
  )
}
