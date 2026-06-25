"use client"
import { useEffect, useState, useCallback, useRef } from "react"
import {
  Search, X, ExternalLink, Download, ChevronLeft, ChevronRight,
  ChevronDown, ChevronUp, Loader2, Filter, SlidersHorizontal,
} from "lucide-react"

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ContractRow {
  gemc_no:                string
  seller_name_canonical:  string | null
  dept_name:              string | null
  ministry:               string | null
  product_name:           string | null
  contract_value_num:     number | null
  seller_state:           string | null
  state:                  string | null
  contract_status:        string | null
  contract_date_dt:       string | null
  quantity:               number | null
  unit_rate:              number | null
  buyer_name:             string | null
  buying_mode:            string | null
  seller_msme_category:   string | null
  detail_scraped:         boolean
}

interface SearchResult {
  contracts: ContractRow[]
  page:      number
  pages:     number
  total:     number
  total_gmv: number
  limit:     number
}

interface Filters {
  q:        string
  seller:   string
  dept:     string
  ministry: string
  product:  string
  state:    string
  dateFrom: string
  dateTo:   string
  valueMin: string
  valueMax: string
  status:   string
  gemc:     string
  msme:     boolean
  country:  string
}

const EMPTY: Filters = {
  q: "", seller: "", dept: "", ministry: "", product: "",
  state: "", dateFrom: "", dateTo: "", valueMin: "", valueMax: "",
  status: "", gemc: "", msme: false, country: "",
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fmtInr(n: number | null | undefined) {
  if (!n) return "—"
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(1)} K`
  return `₹${n.toLocaleString("en-IN")}`
}

function fmtDate(s: string | null | undefined) {
  if (!s) return "—"
  const d = new Date(s)
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })
}

function truncate(s: string | null | undefined, len = 40) {
  if (!s) return "—"
  return s.length > len ? s.slice(0, len) + "…" : s
}

function activeFilterCount(f: Filters): number {
  return Object.entries(f).filter(([, v]) => v !== "" && v !== false).length
}

const INPUT = "w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-brand-400"

// ─── Filter panel ──────────────────────────────────────────────────────────────

function FilterPanel({ f, set, setB, clear }: {
  f: Filters
  set: (k: keyof Filters, v: string) => void
  setB: (k: keyof Filters, v: boolean) => void
  clear: () => void
}) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div>
          <label className="text-[10px] text-gray-400 uppercase tracking-wide">Contract #</label>
          <input placeholder="GEMC-…" value={f.gemc} onChange={e => set("gemc", e.target.value)} className={INPUT} />
        </div>
        <div>
          <label className="text-[10px] text-gray-400 uppercase tracking-wide">Text Search</label>
          <input placeholder="Seller, dept, product…" value={f.q} onChange={e => set("q", e.target.value)} className={INPUT} />
        </div>
        <div>
          <label className="text-[10px] text-gray-400 uppercase tracking-wide">Seller</label>
          <input placeholder="Seller name…" value={f.seller} onChange={e => set("seller", e.target.value)} className={INPUT} />
        </div>
        <div>
          <label className="text-[10px] text-gray-400 uppercase tracking-wide">Department</label>
          <input placeholder="Department…" value={f.dept} onChange={e => set("dept", e.target.value)} className={INPUT} />
        </div>
        <div>
          <label className="text-[10px] text-gray-400 uppercase tracking-wide">Ministry</label>
          <input placeholder="Ministry…" value={f.ministry} onChange={e => set("ministry", e.target.value)} className={INPUT} />
        </div>
        <div>
          <label className="text-[10px] text-gray-400 uppercase tracking-wide">Product</label>
          <input placeholder="Product…" value={f.product} onChange={e => set("product", e.target.value)} className={INPUT} />
        </div>
        <div>
          <label className="text-[10px] text-gray-400 uppercase tracking-wide">State</label>
          <input placeholder="State…" value={f.state} onChange={e => set("state", e.target.value)} className={INPUT} />
        </div>
        <div>
          <label className="text-[10px] text-gray-400 uppercase tracking-wide">Date From</label>
          <input type="date" value={f.dateFrom} onChange={e => set("dateFrom", e.target.value)} className={INPUT} />
        </div>
        <div>
          <label className="text-[10px] text-gray-400 uppercase tracking-wide">Date To</label>
          <input type="date" value={f.dateTo} onChange={e => set("dateTo", e.target.value)} className={INPUT} />
        </div>
        <div>
          <label className="text-[10px] text-gray-400 uppercase tracking-wide">Value Min (₹)</label>
          <input type="number" placeholder="0" value={f.valueMin} onChange={e => set("valueMin", e.target.value)} className={INPUT} />
        </div>
        <div>
          <label className="text-[10px] text-gray-400 uppercase tracking-wide">Value Max (₹)</label>
          <input type="number" placeholder="any" value={f.valueMax} onChange={e => set("valueMax", e.target.value)} className={INPUT} />
        </div>
        <div>
          <label className="text-[10px] text-gray-400 uppercase tracking-wide">Status</label>
          <select value={f.status} onChange={e => set("status", e.target.value)} className={INPUT}>
            <option value="">Any</option>
            <option value="Contract Generated">Contract Generated</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] text-gray-400 uppercase tracking-wide">Country of Origin</label>
          <input placeholder="e.g. India, China…" value={f.country} onChange={e => set("country", e.target.value)} className={INPUT} />
        </div>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={f.msme} onChange={e => setB("msme", e.target.checked)}
              className="w-3.5 h-3.5 rounded border-gray-300 text-brand-600" />
            <span className="text-[10px] text-gray-400 uppercase tracking-wide">MSME Only</span>
          </label>
        </div>
      </div>
      <div className="flex justify-end">
        <button onClick={clear} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
          Clear all filters
        </button>
      </div>
    </div>
  )
}

// ─── Contract detail expand ────────────────────────────────────────────────────

function ContractDetailRow({ row }: { row: ContractRow }) {
  return (
    <div className="bg-gray-50 border-t border-gray-100 px-4 py-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-xs">
      {([
        ["Contract #",    row.gemc_no],
        ["Seller",        row.seller_name_canonical],
        ["Department",    row.dept_name],
        ["Ministry",      row.ministry],
        ["Product",       row.product_name],
        ["Value",         fmtInr(row.contract_value_num)],
        ["Seller State",  row.seller_state],
        ["Delivery State",row.state],
        ["Status",        row.contract_status],
        ["Date",          fmtDate(row.contract_date_dt)],
        ["Qty",           row.quantity?.toString() ?? null],
        ["Unit Rate",     fmtInr(row.unit_rate)],
        ["Buyer",         row.buyer_name],
        ["Mode",          row.buying_mode],
        ["MSME",          row.seller_msme_category],
        ["Enriched",      row.detail_scraped ? "Yes" : "No"],
      ] as [string, string | null][]).map(([label, val]) => (
        <div key={label}>
          <p className="text-gray-400 text-[10px] uppercase tracking-wide">{label}</p>
          <p className="text-gray-700 font-medium mt-0.5 break-words">{val || "—"}</p>
        </div>
      ))}
      <div className="col-span-full">
        <a href={`https://mkp.gem.gov.in/contract/order-detail/${row.gemc_no}`}
          target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[10px] text-brand-600 hover:underline">
          <ExternalLink size={10} />View on GeM
        </a>
      </div>
    </div>
  )
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export function ContractsTab() {
  const [result, setResult]         = useState<SearchResult | null>(null)
  const [loading, setLoading]       = useState(false)
  const [page, setPage]             = useState(1)
  const [filters, setFilters]       = useState<Filters>(EMPTY)
  const [showFilters, setShowFilters] = useState(false)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [exporting, setExporting]   = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const buildUrl = useCallback((p: number, f: Filters, extra = "") => {
    const sp = new URLSearchParams()
    sp.set("page", String(p))
    sp.set("limit", "25")
    if (f.q)        sp.set("q",        f.q)
    if (f.seller)   sp.set("seller",   f.seller)
    if (f.dept)     sp.set("dept",     f.dept)
    if (f.ministry) sp.set("ministry", f.ministry)
    if (f.product)  sp.set("product",  f.product)
    if (f.state)    sp.set("state",    f.state)
    if (f.dateFrom) sp.set("dateFrom", f.dateFrom)
    if (f.dateTo)   sp.set("dateTo",   f.dateTo)
    if (f.valueMin) sp.set("valueMin", f.valueMin)
    if (f.valueMax) sp.set("valueMax", f.valueMax)
    if (f.status)   sp.set("status",   f.status)
    if (f.gemc)     sp.set("gemc",     f.gemc)
    if (f.country)  sp.set("country",  f.country)
    if (f.msme)     sp.set("msme",     "true")
    if (extra)      sp.set("export",   extra)
    return `/api/admin/procurement/search?${sp.toString()}`
  }, [])

  const load = useCallback((p: number, f: Filters) => {
    setLoading(true)
    fetch(buildUrl(p, f))
      .then(r => r.json())
      .then(d => { setResult(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [buildUrl])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { setPage(1); load(1, filters) }, 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [filters, load])

  const exportCsv = async () => {
    setExporting(true)
    try {
      const res = await fetch(buildUrl(1, filters, "csv"))
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `gem-contracts-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  const setFilter  = (k: keyof Filters, v: string)  => setFilters(prev => ({ ...prev, [k]: v }))
  const setFilterB = (k: keyof Filters, v: boolean) => setFilters(prev => ({ ...prev, [k]: v }))
  const clearFilters = () => { setFilters(EMPTY); setPage(1) }
  const goPage = (p: number) => { setPage(p); load(p, filters) }

  const activeCount = activeFilterCount(filters)

  return (
    <div className="space-y-3">
      {/* Summary bar */}
      <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex flex-wrap items-center gap-3 shadow-sm">
        <div className="flex items-center gap-4 text-xs">
          {loading && !result ? (
            <div className="flex items-center gap-2 text-gray-400"><Loader2 size={12} className="animate-spin" />Loading…</div>
          ) : result ? (
            <>
              <span className="font-bold text-gray-900 text-sm">{result.total.toLocaleString("en-IN")}</span>
              <span className="text-gray-500">contracts</span>
              <span className="text-gray-200">|</span>
              <span className="font-bold text-orange-600">{fmtInr(result.total_gmv)}</span>
              <span className="text-gray-500">total GMV</span>
              {loading && <Loader2 size={11} className="animate-spin text-gray-400" />}
            </>
          ) : null}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              showFilters || activeCount > 0
                ? "bg-brand-50 border-brand-200 text-brand-700"
                : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}>
            <SlidersHorizontal size={11} />Filters
            {activeCount > 0 && (
              <span className="bg-brand-600 text-white text-[9px] font-bold rounded-full px-1.5">{activeCount}</span>
            )}
            {showFilters ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>

          {activeCount > 0 && (
            <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700">
              <X size={11} />Clear
            </button>
          )}

          <button
            onClick={exportCsv}
            disabled={exporting || !result || result.total === 0}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40">
            {exporting ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && <FilterPanel f={filters} set={setFilter} setB={setFilterB} clear={clearFilters} />}

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {!loading && result && result.contracts.length === 0 && (
          <div className="py-16 text-center">
            <Filter size={24} className="mx-auto text-gray-200 mb-2" />
            <p className="text-sm text-gray-500">No contracts match your filters.</p>
            <button onClick={clearFilters} className="mt-2 text-xs text-brand-600 hover:underline">Clear filters</button>
          </div>
        )}

        {result && result.contracts.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {["Contract #","Seller","Department","Product","Value","State","Date","Status",""].map(h => (
                      <th key={h} className="text-left px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.contracts.map(row => (
                    <>
                      <tr
                        key={row.gemc_no}
                        onClick={() => setExpandedRow(p => p === row.gemc_no ? null : row.gemc_no)}
                        className="border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer transition-colors">
                        <td className="px-3 py-2.5 font-mono text-[10px] text-gray-400">{row.gemc_no?.slice(-12)}</td>
                        <td className="px-3 py-2.5 text-gray-700 max-w-[180px]" title={row.seller_name_canonical ?? ""}>{truncate(row.seller_name_canonical, 28)}</td>
                        <td className="px-3 py-2.5 text-gray-600 max-w-[160px]" title={row.dept_name ?? ""}>{truncate(row.dept_name, 28)}</td>
                        <td className="px-3 py-2.5 text-gray-600 max-w-[160px]" title={row.product_name ?? ""}>{truncate(row.product_name, 30)}</td>
                        <td className="px-3 py-2.5 font-semibold text-gray-800 whitespace-nowrap">{fmtInr(row.contract_value_num)}</td>
                        <td className="px-3 py-2.5 text-gray-500">{row.seller_state || row.state || "—"}</td>
                        <td className="px-3 py-2.5 text-gray-400 whitespace-nowrap">{fmtDate(row.contract_date_dt)}</td>
                        <td className="px-3 py-2.5">
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                            row.contract_status === "Contract Generated" ? "bg-green-100 text-green-700" :
                            row.contract_status === "Completed"          ? "bg-blue-100 text-blue-700" :
                            row.contract_status === "Cancelled"          ? "bg-red-100 text-red-700" :
                            "bg-gray-100 text-gray-500"
                          }`}>{row.contract_status || "—"}</span>
                        </td>
                        <td className="px-3 py-2.5 text-gray-300">
                          {expandedRow === row.gemc_no ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </td>
                      </tr>
                      {expandedRow === row.gemc_no && (
                        <tr key={`${row.gemc_no}-d`}>
                          <td colSpan={9} className="p-0"><ContractDetailRow row={row} /></td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-[10px] text-gray-400">
                Page {result.page} of {result.pages} · {result.total.toLocaleString("en-IN")} contracts
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => goPage(result.page - 1)} disabled={result.page <= 1 || loading}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30">
                  <ChevronLeft size={12} />
                </button>
                {Array.from({ length: Math.min(7, result.pages) }, (_, i) => {
                  const start = Math.max(1, Math.min(result.page - 3, result.pages - 6))
                  return start + i
                }).map(p => (
                  <button key={p} onClick={() => goPage(p)} disabled={loading}
                    className={`w-7 h-7 text-xs rounded-lg font-medium transition-colors ${
                      p === result.page ? "bg-brand-600 text-white" : "border border-gray-200 text-gray-500 hover:bg-gray-50"
                    }`}>{p}</button>
                ))}
                <button onClick={() => goPage(result.page + 1)} disabled={result.page >= result.pages || loading}
                  className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30">
                  <ChevronRight size={12} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
