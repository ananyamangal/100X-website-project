"use client"
import { useEffect, useState, useCallback, useRef, useMemo } from "react"
import {
  TrendingUp, Users, Building2, Package, Map, Search,
  X, ArrowLeft, ExternalLink, Phone, Mail, ChevronDown,
  ChevronUp, AlertCircle, RefreshCw, FileText, Shield,
} from "lucide-react"

// ─── Format helpers ────────────────────────────────────────────────────────────
function fmtInr(n: number | null | undefined) {
  if (!n) return "—"
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(1)} K`
  return `₹${n.toLocaleString()}`
}

function fmtDate(s: string | null | undefined) {
  if (!s) return "—"
  const d = new Date(s)
  if (isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

function truncate(s: string | null | undefined, len = 40) {
  if (!s) return "—"
  return s.length > len ? s.slice(0, len) + "…" : s
}

function pct(part: number, whole: number) {
  return whole ? Math.round((part / whole) * 100) : 0
}

// ─── Types ─────────────────────────────────────────────────────────────────────
interface ContractRow {
  gemc_no: string
  seller_name_canonical: string | null
  dept_name: string | null
  product_name: string | null
  contract_value_num: number | null
  seller_state: string | null
  state: string | null
  contract_status: string | null
  contract_date_dt: string | null
  first_seen: string | null
  quantity: number | null
  unit_rate: number | null
  ministry: string | null
  extraction_confidence: number | null
  buyer_name: string | null
  detail_scraped: boolean
  seller_gst: string | null
  buying_mode: string | null
}

interface ContractDetail extends ContractRow {
  gemc_no: string
  buyer_designation: string | null
  buying_mode: string | null
  contract_date: string | null
  contract_status: string | null
  contract_value: string | null
  delivery_days: number | null
  oem_brand: string | null
  office_name: string | null
  org_name: string | null
  org_type: string | null
  product_desc: string | null
  seller_gem_id: string | null
  seller_gst: string | null
  seller_msme: string | null
  seller_name_raw: string | null
  buyer_address: string | null
  buyer_contact: string | null
  buyer_district: string | null
  buyer_email: string | null
  buyer_name: string | null
  buyer_state: string | null
  catalogue_status: string | null
  consignee_address: string | null
  consignee_name: string | null
  contract_value_pdf: number | null
  country_of_origin: string | null
  delivery_end: string | null
  delivery_start: string | null
  extraction_confidence: number | null
  manufacturer_indicator: boolean | null
  model: string | null
  oem_indicator: boolean | null
  oem_name: string | null
  payment_mode: string | null
  reseller_indicator: boolean | null
  seller_address: string | null
  seller_city: string | null
  seller_email: string | null
  seller_gender_category: string | null
  seller_msme_category: string | null
  seller_msme_number: string | null
  seller_phone: string | null
  seller_pincode: string | null
  selling_as: string | null
  pdf_path: string | null
  raw_text: string | null
  enrichment_timestamp: string | null
}

// ─── Shared small components ───────────────────────────────────────────────────
function Spinner() {
  return <div className="py-10 text-center text-gray-500 text-sm animate-pulse">Loading…</div>
}

function ErrMsg({ msg }: { msg: string }) {
  return (
    <div className="py-6 text-center text-red-400 text-sm flex items-center justify-center gap-2">
      <AlertCircle size={14} />{msg}
    </div>
  )
}

function Field({ label, value, mono, badge }: { label: string; value?: string | number | null; mono?: boolean; badge?: string }) {
  if (!value && value !== 0) return null
  return (
    <div className="flex gap-2 min-h-[22px]">
      <span className="text-gray-500 text-xs w-28 shrink-0 leading-5">{label}</span>
      <span className={`text-gray-200 text-xs leading-5 break-all ${mono ? "font-mono" : ""}`}>
        {String(value)}
        {badge && <span className="ml-2 text-[10px] bg-orange-900/40 text-orange-400 px-1.5 py-0.5 rounded">{badge}</span>}
      </span>
    </div>
  )
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 mt-4 mb-2">
      <div className="h-px flex-1 bg-gray-700" />
      <span className="text-gray-500 text-[10px] uppercase tracking-widest whitespace-nowrap">{label}</span>
      <div className="h-px flex-1 bg-gray-700" />
    </div>
  )
}

function StatCard({ label, value, sub, orange }: { label: string; value: string; sub?: string; orange?: boolean }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
      <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">{label}</div>
      <div className={`text-xl font-bold ${orange ? "text-orange-400" : "text-white"}`}>{value}</div>
      {sub && <div className="text-[10px] text-gray-500 mt-0.5">{sub}</div>}
    </div>
  )
}

function MiniTable({
  rows, cols, onRowClick,
}: {
  rows: Record<string, unknown>[]
  cols: { key: string; label: string; fmt?: (v: unknown) => string; mono?: boolean; right?: boolean }[]
  onRowClick?: (row: Record<string, unknown>) => void
}) {
  if (!rows.length) return <div className="text-gray-600 text-sm py-4 text-center">No records</div>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-700">
            {cols.map(c => (
              <th key={c.key} className={`py-2 pr-3 text-gray-400 uppercase text-[10px] font-medium ${c.right ? "text-right" : "text-left"}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              onClick={() => onRowClick?.(row)}
              className={`border-b border-gray-800/60 ${onRowClick ? "cursor-pointer hover:bg-gray-800/60" : ""}`}
            >
              {cols.map(c => (
                <td key={c.key} className={`py-2 pr-3 ${c.right ? "text-right" : ""} ${c.mono ? "font-mono" : ""} text-gray-200`}>
                  {c.fmt ? c.fmt(row[c.key]) : (row[c.key] != null ? String(row[c.key]) : "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Global search bar ─────────────────────────────────────────────────────────
interface SearchSuggestions {
  contracts: Array<{ gemc_no: string; seller_name_canonical: string; contract_value_num: number }>
  sellers:  string[]
  depts:    string[]
  products: string[]
}

function GlobalSearch({
  value, onChange, onSelectGemc, onSelectSeller, onSelectDept, onSelectProduct,
}: {
  value: string
  onChange: (v: string) => void
  onSelectGemc:    (gemc: string) => void
  onSelectSeller:  (name: string) => void
  onSelectDept:    (name: string) => void
  onSelectProduct: (name: string) => void
}) {
  const [sugg, setSugg]   = useState<SearchSuggestions | null>(null)
  const [open, setOpen]   = useState(false)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (value.length < 2) { setSugg(null); setOpen(false); return }
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/admin/procurement/contracts?section=search&q=${encodeURIComponent(value)}`)
        const j = await res.json()
        setSugg(j)
        setOpen(true)
      } finally { setLoading(false) }
    }, 300)
  }, [value])

  // close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const hasSugg = sugg && (sugg.contracts.length || sugg.sellers.length || sugg.depts.length || sugg.products.length)

  return (
    <div ref={ref} className="relative w-full max-w-xl">
      <div className="flex items-center gap-2 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2">
        <Search size={14} className="text-gray-400 shrink-0" />
        <input
          type="text"
          placeholder="Search GEMC, seller, GST, department, product, state…"
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => hasSugg && setOpen(true)}
          className="bg-transparent text-gray-100 text-sm flex-1 outline-none placeholder-gray-500"
        />
        {loading && <RefreshCw size={12} className="text-gray-500 animate-spin" />}
        {value && (
          <button onClick={() => { onChange(""); setSugg(null); setOpen(false) }}>
            <X size={12} className="text-gray-500 hover:text-white" />
          </button>
        )}
      </div>

      {open && hasSugg && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden max-h-80 overflow-y-auto">
          {sugg!.contracts.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[10px] text-gray-500 uppercase tracking-widest bg-gray-800/50">Contracts</div>
              {sugg!.contracts.map(c => (
                <button key={c.gemc_no} className="w-full text-left px-3 py-2 hover:bg-gray-800 flex justify-between items-center"
                  onClick={() => { setOpen(false); onSelectGemc(c.gemc_no) }}>
                  <div>
                    <div className="text-xs text-gray-200 font-mono">{c.gemc_no}</div>
                    <div className="text-[11px] text-gray-500">{truncate(c.seller_name_canonical, 50)}</div>
                  </div>
                  <div className="text-orange-400 text-xs font-mono">{fmtInr(c.contract_value_num)}</div>
                </button>
              ))}
            </div>
          )}
          {sugg!.sellers.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[10px] text-gray-500 uppercase tracking-widest bg-gray-800/50">Sellers</div>
              {sugg!.sellers.map(s => (
                <button key={s} className="w-full text-left px-3 py-2 hover:bg-gray-800 text-xs text-gray-200 flex items-center gap-2"
                  onClick={() => { setOpen(false); onSelectSeller(s) }}>
                  <Users size={11} className="text-gray-500" />{s}
                </button>
              ))}
            </div>
          )}
          {sugg!.depts.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[10px] text-gray-500 uppercase tracking-widest bg-gray-800/50">Departments</div>
              {sugg!.depts.map(d => (
                <button key={d} className="w-full text-left px-3 py-2 hover:bg-gray-800 text-xs text-gray-200 flex items-center gap-2"
                  onClick={() => { setOpen(false); onSelectDept(d) }}>
                  <Building2 size={11} className="text-gray-500" />{truncate(d, 60)}
                </button>
              ))}
            </div>
          )}
          {sugg!.products.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[10px] text-gray-500 uppercase tracking-widest bg-gray-800/50">Products</div>
              {sugg!.products.map(p => (
                <button key={p} className="w-full text-left px-3 py-2 hover:bg-gray-800 text-xs text-gray-200 flex items-center gap-2"
                  onClick={() => { setOpen(false); onSelectProduct(p) }}>
                  <Package size={11} className="text-gray-500" />{truncate(p, 60)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Contract table ────────────────────────────────────────────────────────────
type SortKey = "contract_value_num" | "first_seen" | "seller_name_canonical" | "dept_name"

function ContractsTable({
  contracts, filter, onRowClick, onSellerClick, onDeptClick, onProductClick,
}: {
  contracts: ContractRow[]
  filter: string
  onRowClick:     (gemc: string) => void
  onSellerClick:  (name: string) => void
  onDeptClick:    (name: string) => void
  onProductClick: (name: string) => void
}) {
  const [sortKey, setSortKey] = useState<SortKey>("contract_value_num")
  const [sortAsc, setSortAsc] = useState(false)

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortAsc(a => !a)
    else { setSortKey(k); setSortAsc(false) }
  }

  function SortBtn({ k, label }: { k: SortKey; label: string }) {
    const active = sortKey === k
    const Icon = active ? (sortAsc ? ChevronUp : ChevronDown) : ChevronDown
    return (
      <button onClick={() => toggleSort(k)}
        className={`flex items-center gap-0.5 ${active ? "text-orange-400" : "text-gray-400 hover:text-gray-200"}`}>
        {label}<Icon size={10} />
      </button>
    )
  }

  const filtered = useMemo(() => {
    const q = filter.toLowerCase()
    const base = !q ? contracts : contracts.filter(c =>
      (c.gemc_no?.toLowerCase().includes(q)) ||
      (c.seller_name_canonical?.toLowerCase().includes(q)) ||
      (c.seller_gst?.toLowerCase().includes(q)) ||
      (c.dept_name?.toLowerCase().includes(q)) ||
      (c.product_name?.toLowerCase().includes(q)) ||
      (c.seller_state?.toLowerCase().includes(q)) ||
      (c.state?.toLowerCase().includes(q))
    )
    return [...base].sort((a, b) => {
      const av = a[sortKey] ?? ""
      const bv = b[sortKey] ?? ""
      const cmp = av < bv ? -1 : av > bv ? 1 : 0
      return sortAsc ? cmp : -cmp
    })
  }, [contracts, filter, sortKey, sortAsc])

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-gray-700 flex items-center justify-between">
        <span className="text-sm font-semibold text-white flex items-center gap-2">
          <FileText size={14} className="text-orange-400" />
          Contracts
        </span>
        <span className="text-xs text-gray-500">{filtered.length} of {contracts.length}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-700/80 text-[10px] uppercase tracking-wide">
              <th className="text-left py-2.5 px-4 text-gray-400">
                <SortBtn k="seller_name_canonical" label="GEMC / Seller" />
              </th>
              <th className="text-left py-2.5 px-2 text-gray-400 hidden md:table-cell">
                <SortBtn k="dept_name" label="Department" />
              </th>
              <th className="text-left py-2.5 px-2 text-gray-400 hidden lg:table-cell">Product</th>
              <th className="text-right py-2.5 px-2 text-gray-400">Qty</th>
              <th className="text-right py-2.5 px-3 text-gray-400">
                <SortBtn k="contract_value_num" label="Value" />
              </th>
              <th className="text-left py-2.5 px-2 text-gray-400 hidden sm:table-cell">State</th>
              <th className="text-left py-2.5 px-3 text-gray-400 hidden sm:table-cell">
                <SortBtn k="first_seen" label="Date" />
              </th>
              <th className="text-left py-2.5 px-3 text-gray-400 hidden md:table-cell">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr
                key={c.gemc_no}
                onClick={() => onRowClick(c.gemc_no)}
                className="border-b border-gray-800/60 hover:bg-gray-800/50 cursor-pointer group"
              >
                <td className="py-2.5 px-4">
                  <div className="text-gray-500 font-mono text-[10px] group-hover:text-orange-400 transition-colors">
                    {c.gemc_no}
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); c.seller_name_canonical && onSellerClick(c.seller_name_canonical) }}
                    className="text-gray-200 hover:text-orange-400 transition-colors text-left leading-tight mt-0.5"
                  >
                    {truncate(c.seller_name_canonical, 35)}
                  </button>
                </td>
                <td className="py-2.5 px-2 hidden md:table-cell">
                  <button
                    onClick={e => { e.stopPropagation(); c.dept_name && onDeptClick(c.dept_name) }}
                    className="text-gray-400 hover:text-blue-400 transition-colors text-left leading-tight"
                  >
                    {truncate(c.dept_name, 30)}
                  </button>
                  {c.ministry && <div className="text-gray-600 text-[10px] leading-tight">{truncate(c.ministry, 25)}</div>}
                </td>
                <td className="py-2.5 px-2 hidden lg:table-cell">
                  <button
                    onClick={e => { e.stopPropagation(); c.product_name && onProductClick(c.product_name) }}
                    className="text-gray-400 hover:text-purple-400 transition-colors text-left leading-tight"
                  >
                    {truncate(c.product_name, 35)}
                  </button>
                </td>
                <td className="py-2.5 px-2 text-right text-gray-500">{c.quantity?.toLocaleString() || "—"}</td>
                <td className="py-2.5 px-3 text-right font-mono text-orange-400 whitespace-nowrap">
                  {fmtInr(c.contract_value_num)}
                </td>
                <td className="py-2.5 px-2 hidden sm:table-cell text-gray-500">{c.seller_state || c.state || "—"}</td>
                <td className="py-2.5 px-3 hidden sm:table-cell text-gray-500 whitespace-nowrap">{fmtDate(c.first_seen)}</td>
                <td className="py-2.5 px-3 hidden md:table-cell">
                  {c.contract_status && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      c.contract_status.toLowerCase().includes("accept")
                        ? "bg-green-900/40 text-green-400"
                        : "bg-gray-700 text-gray-400"
                    }`}>{truncate(c.contract_status, 18)}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && (
          <div className="py-10 text-center text-gray-500 text-sm">No contracts match this search</div>
        )}
      </div>
    </div>
  )
}

// ─── Contract detail drawer ────────────────────────────────────────────────────
function ContractDrawer({
  gemc, onClose, onSellerClick, onDeptClick, onProductClick,
}: {
  gemc: string
  onClose: () => void
  onSellerClick:  (name: string) => void
  onDeptClick:    (name: string) => void
  onProductClick: (name: string) => void
}) {
  const [data, setData]   = useState<ContractDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showRaw, setShowRaw] = useState(false)

  useEffect(() => {
    setLoading(true); setError(null); setData(null)
    fetch(`/api/admin/procurement/contracts?section=contract_detail&gemc=${encodeURIComponent(gemc)}`)
      .then(r => r.json())
      .then(j => { if (j.error) throw new Error(j.error); setData(j) })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [gemc])

  const gemUrl = `https://gem.gov.in/view_contracts/viewContractDetails?gemc_no=${gemc}`

  return (
    <>
      {/* backdrop */}
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />

      {/* drawer */}
      <div className="fixed top-0 right-0 h-full w-full max-w-[580px] bg-gray-950 border-l border-gray-700 z-50 flex flex-col shadow-2xl">
        {/* header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-700 bg-gray-900 shrink-0">
          <div>
            <div className="text-xs font-mono text-orange-400">{gemc}</div>
            {data?.contract_status && (
              <span className="text-[10px] bg-green-900/40 text-green-400 px-2 py-0.5 rounded mt-1 inline-block">
                {data.contract_status}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <a href={gemUrl} target="_blank" rel="noopener noreferrer"
              className="text-gray-400 hover:text-white text-xs flex items-center gap-1 px-2 py-1 border border-gray-700 rounded-lg hover:border-gray-500 transition-colors">
              <ExternalLink size={11} /> GeM
            </a>
            <button onClick={onClose}
              className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-700 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-0.5">
          {loading && <Spinner />}
          {error   && <ErrMsg msg={error} />}
          {data && <>
            {/* Contract value — prominent */}
            <div className="bg-orange-950/30 border border-orange-800/40 rounded-xl p-4 mb-4">
              <div className="text-xs text-gray-400 mb-0.5">Contract Value</div>
              <div className="text-3xl font-bold text-orange-400 font-mono">{fmtInr(data.contract_value_pdf || data.contract_value_num)}</div>
              <div className="flex gap-4 mt-2 text-xs text-gray-400">
                {data.quantity && <span>Qty: <span className="text-gray-200">{data.quantity?.toLocaleString()}</span></span>}
                {data.unit_rate && <span>Unit: <span className="text-gray-200">{fmtInr(data.unit_rate)}</span></span>}
                {data.buying_mode && <span>Mode: <span className="text-gray-200">{data.buying_mode}</span></span>}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 flex-wrap mb-4">
              {data.seller_name_canonical && (
                <button
                  onClick={() => { onClose(); onSellerClick(data.seller_name_canonical!) }}
                  className="flex items-center gap-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-200 px-3 py-1.5 rounded-lg border border-gray-600 hover:border-gray-500 transition-colors">
                  <Users size={11} className="text-orange-400" /> Seller Profile
                </button>
              )}
              {data.dept_name && (
                <button
                  onClick={() => { onClose(); onDeptClick(data.dept_name!) }}
                  className="flex items-center gap-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-200 px-3 py-1.5 rounded-lg border border-gray-600 hover:border-gray-500 transition-colors">
                  <Building2 size={11} className="text-blue-400" /> Dept Profile
                </button>
              )}
              {data.product_name && (
                <button
                  onClick={() => { onClose(); onProductClick(data.product_name!) }}
                  className="flex items-center gap-1.5 text-xs bg-gray-800 hover:bg-gray-700 text-gray-200 px-3 py-1.5 rounded-lg border border-gray-600 hover:border-gray-500 transition-colors">
                  <Package size={11} className="text-purple-400" /> Product Profile
                </button>
              )}
            </div>

            {/* Seller section */}
            <SectionDivider label="Seller" />
            <Field label="Company" value={data.seller_name_raw || data.seller_name_canonical} />
            <Field label="GeM ID" value={data.seller_gem_id} mono />
            <Field label="GSTIN" value={data.seller_gst} mono />
            <Field label="MSME" value={data.seller_msme_category || data.seller_msme} />
            <Field label="MSME No." value={data.seller_msme_number} mono />
            <Field label="Category" value={data.seller_gender_category} />
            <Field label="Selling As" value={data.selling_as} />
            <Field label="State" value={data.seller_state} />
            <Field label="Pincode" value={data.seller_pincode} mono />
            {data.seller_phone && (
              <div className="flex gap-2 min-h-[22px]">
                <span className="text-gray-500 text-xs w-28 shrink-0 leading-5">Phone</span>
                <a href={`tel:+91${data.seller_phone}`} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 leading-5">
                  <Phone size={10} />{data.seller_phone}
                </a>
              </div>
            )}
            {data.seller_email && (
              <div className="flex gap-2 min-h-[22px]">
                <span className="text-gray-500 text-xs w-28 shrink-0 leading-5">Email</span>
                <a href={`mailto:${data.seller_email}`} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 leading-5 break-all">
                  <Mail size={10} />{data.seller_email}
                </a>
              </div>
            )}
            <Field label="Address" value={data.seller_address} />

            {/* Buyer section */}
            <SectionDivider label="Buyer" />
            <Field label="Organisation" value={data.buyer_name || data.org_name} />
            <Field label="Department" value={data.dept_name} />
            <Field label="Ministry" value={data.ministry} />
            <Field label="Office" value={data.office_name} />
            <Field label="Designation" value={data.buyer_designation} />
            <Field label="Org Type" value={data.org_type} />
            {data.buyer_contact && (
              <div className="flex gap-2 min-h-[22px]">
                <span className="text-gray-500 text-xs w-28 shrink-0 leading-5">Contact</span>
                <a href={`tel:+91${data.buyer_contact}`} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 leading-5">
                  <Phone size={10} />{data.buyer_contact}
                </a>
              </div>
            )}
            {data.buyer_email && (
              <div className="flex gap-2 min-h-[22px]">
                <span className="text-gray-500 text-xs w-28 shrink-0 leading-5">Email</span>
                <a href={`mailto:${data.buyer_email}`} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 leading-5 break-all">
                  <Mail size={10} />{data.buyer_email}
                </a>
              </div>
            )}
            <Field label="State" value={data.buyer_state} />
            <Field label="District" value={data.buyer_district} />
            <Field label="Address" value={data.buyer_address} />

            {/* Product section */}
            <SectionDivider label="Product" />
            <Field label="Name" value={data.product_name} />
            <Field label="Description" value={data.product_desc} />
            <Field label="OEM Name" value={data.oem_name} />
            <Field label="Brand" value={data.oem_brand} />
            <Field label="Model" value={data.model} />
            <Field label="Country" value={data.country_of_origin} />
            <Field label="Catalogue" value={data.catalogue_status} />
            <div className="flex gap-3 mt-1 flex-wrap">
              {data.oem_indicator && <span className="text-[10px] bg-blue-900/40 text-blue-400 px-2 py-0.5 rounded flex items-center gap-1"><Shield size={9} />OEM Verified</span>}
              {data.manufacturer_indicator && <span className="text-[10px] bg-green-900/40 text-green-400 px-2 py-0.5 rounded">Manufacturer</span>}
              {data.reseller_indicator && <span className="text-[10px] bg-gray-700 text-gray-400 px-2 py-0.5 rounded">Reseller</span>}
            </div>

            {/* Delivery section */}
            <SectionDivider label="Delivery" />
            <Field label="Start Date" value={fmtDate(data.delivery_start)} />
            <Field label="End Date" value={fmtDate(data.delivery_end)} />
            <Field label="Delivery Days" value={data.delivery_days} />
            <Field label="Payment Mode" value={data.payment_mode} />
            <Field label="Consignee" value={data.consignee_name} />
            <Field label="Address" value={data.consignee_address} />

            {/* Extraction metadata */}
            <SectionDivider label="Extraction" />
            <Field label="Confidence" value={data.extraction_confidence ? `${data.extraction_confidence}%` : null} />
            <Field label="Enriched At" value={fmtDate(data.enrichment_timestamp)} />
            <Field label="PDF Path" value={data.pdf_path as string | null} mono />

            {/* Raw text (collapsible) */}
            {data.raw_text && (
              <>
                <SectionDivider label="Raw Extracted Text" />
                <button
                  onClick={() => setShowRaw(r => !r)}
                  className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1 mb-2">
                  {showRaw ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                  {showRaw ? "Collapse" : "Expand raw text"}
                </button>
                {showRaw && (
                  <pre className="text-[10px] text-gray-400 font-mono bg-gray-800/50 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
                    {data.raw_text}
                  </pre>
                )}
              </>
            )}
          </>}
        </div>
      </div>
    </>
  )
}

// ─── Seller profile page ───────────────────────────────────────────────────────
function SellerPage({
  name, onBack, onContractClick, onDeptClick, onProductClick,
}: {
  name: string
  onBack:          () => void
  onContractClick: (gemc: string) => void
  onDeptClick:     (name: string) => void
  onProductClick:  (name: string) => void
}) {
  const [data, setData]   = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true); setError(null)
    fetch(`/api/admin/procurement/contracts?section=seller_profile&name=${encodeURIComponent(name)}`)
      .then(r => r.json())
      .then(j => { if (j.error) throw new Error(j.error); setData(j) })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [name])

  if (loading) return <Spinner />
  if (error)   return <div className="space-y-3"><BackBtn onBack={onBack} /><ErrMsg msg={error} /></div>
  if (!data)   return null

  const contracts = (data.contracts as Record<string, unknown>[]) || []
  const depts     = (data.departments as string[]) || []
  const products  = (data.products as string[]) || []
  const phone     = data.phone as string | null
  const email     = data.email as string | null

  return (
    <div className="space-y-5">
      <BackBtn onBack={onBack} label="← Contracts" />

      {/* Header card */}
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-white font-bold text-lg">{data.name as string}</h2>
              {data.in_gem_dealers
                ? <span className="text-[10px] bg-green-900/40 text-green-400 px-2 py-0.5 rounded">In Dealer DB</span>
                : <span className="text-[10px] bg-yellow-900/40 text-yellow-400 px-2 py-0.5 rounded">New — Not in DB</span>}
            </div>
            <div className="text-gray-400 text-sm mt-1">
              {[data.state, data.gstin, data.msme && `MSME: ${data.msme}`].filter(Boolean).join("  ·  ")}
            </div>
          </div>
          <div className="flex gap-3 text-sm">
            {phone && (
              <a href={`tel:+91${phone}`} className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300">
                <Phone size={13} />{phone}
              </a>
            )}
            {email && (
              <a href={`mailto:${email}`} className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 break-all">
                <Mail size={13} />{email}
              </a>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <StatCard label="Total GMV" value={fmtInr(data.gmv as number)} orange />
          <StatCard label="Contracts" value={String(data.count)} />
          <StatCard label="Avg Contract" value={fmtInr((data.gmv as number) / (data.count as number))} />
          <StatCard label="L1 Bid Wins" value={String(data.bid_wins || 0)} sub={data.in_gem_dealers ? "from dealer DB" : "no bids found"} />
        </div>

        {!!(data.address || data.selling_as || data.gem_id) && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <Field label="GeM Seller ID" value={data.gem_id as string} mono />
            <Field label="Selling As" value={data.selling_as as string} />
            <Field label="MSME No." value={data.msme_number as string} mono />
            <Field label="Gender Cat." value={data.gender_cat as string} />
            <Field label="Address" value={data.address as string} />
          </div>
        )}
      </div>

      {/* Contracts */}
      <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700 text-sm font-semibold text-white flex items-center gap-2">
          <FileText size={13} className="text-orange-400" /> Contract History ({contracts.length})
        </div>
        <MiniTable
          rows={contracts}
          cols={[
            { key: "gemc_no",         label: "GEMC",    mono: true, fmt: v => truncate(String(v), 26) },
            { key: "dept_name",       label: "Dept",    fmt: v => truncate(String(v ?? "—"), 30) },
            { key: "product_name",    label: "Product", fmt: v => truncate(String(v ?? "—"), 35) },
            { key: "quantity",        label: "Qty",     right: true, fmt: v => v ? (v as number).toLocaleString() : "—" },
            { key: "contract_value_num", label: "Value", right: true, mono: true, fmt: v => fmtInr(v as number) },
            { key: "first_seen",      label: "Date",    fmt: v => fmtDate(String(v)) },
          ]}
          onRowClick={row => onContractClick(row.gemc_no as string)}
        />
      </div>

      {/* Departments + Products */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
          <div className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Building2 size={13} className="text-blue-400" /> Departments ({depts.length})
          </div>
          <div className="space-y-1.5">
            {depts.slice(0, 10).map(d => (
              <button key={d} onClick={() => onDeptClick(d)}
                className="w-full text-left text-xs text-gray-400 hover:text-blue-400 transition-colors py-0.5">
                {d}
              </button>
            ))}
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
          <div className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Package size={13} className="text-purple-400" /> Products Sold ({products.length})
          </div>
          <div className="space-y-1.5">
            {products.slice(0, 10).map(p => (
              <button key={p} onClick={() => onProductClick(p)}
                className="w-full text-left text-xs text-gray-400 hover:text-purple-400 transition-colors py-0.5">
                {truncate(p, 65)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Department profile page ───────────────────────────────────────────────────
function DeptPage({
  name, onBack, onContractClick, onSellerClick, onProductClick,
}: {
  name: string
  onBack:          () => void
  onContractClick: (gemc: string) => void
  onSellerClick:   (name: string) => void
  onProductClick:  (name: string) => void
}) {
  const [data, setData]   = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true); setError(null)
    fetch(`/api/admin/procurement/contracts?section=dept_profile&name=${encodeURIComponent(name)}`)
      .then(r => r.json())
      .then(j => { if (j.error) throw new Error(j.error); setData(j) })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [name])

  if (loading) return <Spinner />
  if (error)   return <div className="space-y-3"><BackBtn onBack={onBack} /><ErrMsg msg={error} /></div>
  if (!data)   return null

  const contracts  = (data.contracts  as Record<string, unknown>[]) || []
  const sellers    = (data.sellers    as string[]) || []
  const products   = (data.products   as string[]) || []
  const topSellers = (data.top_sellers as { name: string; gmv: number }[]) || []
  const maxGmv     = topSellers[0]?.gmv || 1

  return (
    <div className="space-y-5">
      <BackBtn onBack={onBack} label="← Contracts" />

      <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
        <h2 className="text-white font-bold text-lg">{name}</h2>
        <div className="text-gray-400 text-sm mt-0.5">
          {[data.ministry, data.org_type].filter(Boolean).join("  ·  ")}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <StatCard label="Total Spend" value={fmtInr(data.gmv as number)} orange />
          <StatCard label="Contracts" value={String(data.count)} />
          <StatCard label="Unique Sellers" value={String(sellers.length)} />
          <StatCard label="Products Bought" value={String(products.length)} />
        </div>
      </div>

      {/* Top sellers bar chart */}
      {topSellers.length > 0 && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
          <div className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <TrendingUp size={13} className="text-orange-400" /> Top Sellers by Spend
          </div>
          <div className="space-y-2">
            {topSellers.map(s => (
              <div key={s.name} className="flex items-center gap-2">
                <button onClick={() => onSellerClick(s.name)}
                  className="text-xs text-gray-300 hover:text-orange-400 transition-colors w-40 shrink-0 text-right pr-2 truncate">
                  {truncate(s.name, 28)}
                </button>
                <div className="flex-1 bg-gray-700 rounded h-1.5">
                  <div className="h-1.5 rounded bg-orange-500" style={{ width: `${pct(s.gmv, maxGmv)}%` }} />
                </div>
                <div className="text-xs font-mono text-orange-400 w-20 text-right">{fmtInr(s.gmv)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contract table */}
      <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700 text-sm font-semibold text-white flex items-center gap-2">
          <FileText size={13} className="text-orange-400" /> Contracts ({contracts.length})
        </div>
        <MiniTable
          rows={contracts}
          cols={[
            { key: "gemc_no",              label: "GEMC",    mono: true, fmt: v => truncate(String(v), 26) },
            { key: "seller_name_canonical", label: "Seller",  fmt: v => truncate(String(v ?? "—"), 28) },
            { key: "product_name",         label: "Product", fmt: v => truncate(String(v ?? "—"), 30) },
            { key: "quantity",             label: "Qty",     right: true, fmt: v => v ? (v as number).toLocaleString() : "—" },
            { key: "contract_value_num",   label: "Value",   right: true, mono: true, fmt: v => fmtInr(v as number) },
            { key: "first_seen",           label: "Date",    fmt: v => fmtDate(String(v)) },
          ]}
          onRowClick={row => onContractClick(row.gemc_no as string)}
        />
      </div>

      {/* Products */}
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
        <div className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Package size={13} className="text-purple-400" /> Products Purchased ({products.length})
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {products.slice(0, 20).map(p => (
            <button key={p} onClick={() => onProductClick(p)}
              className="text-left text-xs text-gray-400 hover:text-purple-400 transition-colors py-0.5">
              {truncate(p, 55)}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Product profile page ──────────────────────────────────────────────────────
function ProductPage({
  name, onBack, onContractClick, onSellerClick, onDeptClick,
}: {
  name: string
  onBack:          () => void
  onContractClick: (gemc: string) => void
  onSellerClick:   (name: string) => void
  onDeptClick:     (name: string) => void
}) {
  const [data, setData]   = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true); setError(null)
    fetch(`/api/admin/procurement/contracts?section=product_profile&name=${encodeURIComponent(name)}`)
      .then(r => r.json())
      .then(j => { if (j.error) throw new Error(j.error); setData(j) })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [name])

  if (loading) return <Spinner />
  if (error)   return <div className="space-y-3"><BackBtn onBack={onBack} /><ErrMsg msg={error} /></div>
  if (!data)   return null

  const contracts   = (data.contracts   as Record<string, unknown>[]) || []
  const sellers     = (data.sellers     as string[]) || []
  const departments = (data.departments as string[]) || []
  const states      = (data.states      as string[]) || []

  return (
    <div className="space-y-5">
      <BackBtn onBack={onBack} label="← Contracts" />

      <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
        <h2 className="text-white font-bold text-base leading-snug">{name}</h2>
        {!!(data.oem || data.brand) && (
          <div className="text-gray-400 text-sm mt-0.5">
            {[data.oem && `OEM: ${data.oem}`, data.brand && `Brand: ${data.brand}`].filter(Boolean).join("  ·  ")}
          </div>
        )}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <StatCard label="Total GMV" value={fmtInr(data.gmv as number)} orange />
          <StatCard label="Contracts" value={String(data.count)} />
          {!!data.avg_price && <StatCard label="Avg Unit Price" value={fmtInr(data.avg_price as number)} />}
          {!!data.min_price && <StatCard label="Price Range"
            value={`${fmtInr(data.min_price as number)} – ${fmtInr(data.max_price as number)}`}
            sub="min – max" />}
        </div>
      </div>

      {/* Sellers + Depts + States */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
          <div className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Users size={13} className="text-orange-400" /> Sellers ({sellers.length})
          </div>
          {sellers.slice(0, 10).map(s => (
            <button key={s} onClick={() => onSellerClick(s)}
              className="block w-full text-left text-xs text-gray-400 hover:text-orange-400 transition-colors py-0.5">
              {truncate(s, 40)}
            </button>
          ))}
        </div>
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
          <div className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Building2 size={13} className="text-blue-400" /> Departments ({departments.length})
          </div>
          {departments.slice(0, 10).map(d => (
            <button key={d} onClick={() => onDeptClick(d)}
              className="block w-full text-left text-xs text-gray-400 hover:text-blue-400 transition-colors py-0.5">
              {truncate(d, 40)}
            </button>
          ))}
        </div>
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
          <div className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Map size={13} className="text-teal-400" /> States ({states.length})
          </div>
          {states.map(s => (
            <div key={s} className="text-xs text-gray-400 py-0.5">{s}</div>
          ))}
        </div>
      </div>

      {/* Contract table */}
      <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700 text-sm font-semibold text-white flex items-center gap-2">
          <FileText size={13} className="text-orange-400" /> Contracts ({contracts.length})
        </div>
        <MiniTable
          rows={contracts}
          cols={[
            { key: "gemc_no",              label: "GEMC",    mono: true, fmt: v => truncate(String(v), 26) },
            { key: "seller_name_canonical", label: "Seller",  fmt: v => truncate(String(v ?? "—"), 28) },
            { key: "dept_name",            label: "Dept",    fmt: v => truncate(String(v ?? "—"), 28) },
            { key: "quantity",             label: "Qty",     right: true, fmt: v => v ? (v as number).toLocaleString() : "—" },
            { key: "unit_rate",            label: "Unit ₹",  right: true, mono: true, fmt: v => fmtInr(v as number) },
            { key: "contract_value_num",   label: "Total",   right: true, mono: true, fmt: v => fmtInr(v as number) },
            { key: "seller_state",         label: "State",   fmt: v => String(v ?? "—") },
          ]}
          onRowClick={row => onContractClick(row.gemc_no as string)}
        />
      </div>
    </div>
  )
}

// ─── Shared back button ────────────────────────────────────────────────────────
function BackBtn({ onBack, label = "← Back" }: { onBack: () => void; label?: string }) {
  return (
    <button onClick={onBack}
      className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition-colors">
      <ArrowLeft size={14} />{label}
    </button>
  )
}

// ─── Summary panels (shown at bottom of list view) ────────────────────────────
function SummaryPanels({
  onSellerClick, onDeptClick, onProductClick,
}: {
  onSellerClick:  (n: string) => void
  onDeptClick:    (n: string) => void
  onProductClick: (n: string) => void
}) {
  interface RankRow { _id: string; gmv?: number; count?: number; gstin?: string; ministry?: string; state?: string }

  function RankList({ section, label, limit, onClick, icon: Icon, color }: {
    section: string; label: string; limit: number
    onClick: (n: string) => void
    icon: React.ElementType; color: string
  }) {
    const [rows, setRows] = useState<RankRow[]>([])
    const [loading, setLoading] = useState(true)
    useEffect(() => {
      fetch(`/api/admin/procurement/contracts?section=${section}&limit=${limit}`)
        .then(r => r.json()).then(j => setRows(j.rows || []))
        .finally(() => setLoading(false))
    }, [section, limit])
    const maxGmv = rows[0]?.gmv || 1
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700 text-sm font-semibold text-white flex items-center gap-2">
          <Icon size={13} className={color} />{label}
        </div>
        {loading ? <Spinner /> : (
          <div className="p-3 space-y-1">
            {rows.slice(0, 8).map(r => (
              <div key={r._id} className="flex items-center gap-2">
                <button onClick={() => onClick(r._id)}
                  className="text-xs text-gray-300 hover:text-orange-400 transition-colors w-44 shrink-0 text-right pr-2 truncate">
                  {truncate(r._id, 30)}
                </button>
                <div className="flex-1 bg-gray-700 rounded h-1">
                  <div className="h-1 rounded bg-orange-500" style={{ width: `${pct(r.gmv || 0, maxGmv)}%` }} />
                </div>
                <div className="text-xs font-mono text-orange-400 w-16 text-right">{fmtInr(r.gmv)}</div>
                <div className="text-xs text-gray-500 w-8 text-right">{r.count}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <RankList section="sellers_by_gmv"   label="Top Sellers by GMV"   limit={8}
        onClick={onSellerClick}  icon={Users}     color="text-orange-400" />
      <RankList section="depts_by_spend"   label="Top Depts by Spend"   limit={8}
        onClick={onDeptClick}    icon={Building2} color="text-blue-400"  />
      <RankList section="products_by_spend" label="Top Products by Spend" limit={8}
        onClick={onProductClick} icon={Package}   color="text-purple-400" />
    </div>
  )
}

// ─── Main ContractsTab ─────────────────────────────────────────────────────────
type View = "list" | "seller" | "dept" | "product"

export function ContractsTab() {
  const [view, setView]           = useState<View>("list")
  const [viewParam, setViewParam] = useState("")
  const [drawerGemc, setDrawerGemc] = useState<string | null>(null)
  const [search, setSearch]       = useState("")
  const [contracts, setContracts] = useState<ContractRow[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [overview, setOverview]   = useState<Record<string, number> | null>(null)

  // Load contracts list + overview on mount
  useEffect(() => {
    fetch("/api/admin/procurement/contracts?section=contracts_list")
      .then(r => r.json()).then(j => setContracts(j.contracts || []))
      .finally(() => setLoadingList(false))
    fetch("/api/admin/procurement/contracts?section=overview")
      .then(r => r.json()).then(j => setOverview(j))
  }, [])

  function navSeller(name: string) { setView("seller"); setViewParam(name); setDrawerGemc(null) }
  function navDept(name: string)   { setView("dept");   setViewParam(name); setDrawerGemc(null) }
  function navProduct(name: string){ setView("product"); setViewParam(name); setDrawerGemc(null) }
  function navBack()               { setView("list"); setViewParam("") }

  // Drill-down pages
  if (view === "seller")  return (
    <SellerPage name={viewParam}  onBack={navBack}
      onContractClick={setDrawerGemc} onDeptClick={navDept} onProductClick={navProduct} />
  )
  if (view === "dept")    return (
    <DeptPage   name={viewParam}  onBack={navBack}
      onContractClick={setDrawerGemc} onSellerClick={navSeller} onProductClick={navProduct} />
  )
  if (view === "product") return (
    <ProductPage name={viewParam} onBack={navBack}
      onContractClick={setDrawerGemc} onSellerClick={navSeller} onDeptClick={navDept} />
  )

  // List / dashboard view
  const ov = overview
  return (
    <div className="space-y-5">

      {/* Top bar: search + stats */}
      <div className="flex items-center gap-4 flex-wrap">
        <GlobalSearch
          value={search}
          onChange={setSearch}
          onSelectGemc={setDrawerGemc}
          onSelectSeller={navSeller}
          onSelectDept={navDept}
          onSelectProduct={navProduct}
        />
        {ov && (
          <div className="flex gap-3 text-xs text-gray-400 flex-wrap">
            <span><span className="text-orange-400 font-bold text-sm">{ov.total}</span> contracts</span>
            <span><span className="text-white font-bold text-sm">{fmtInr(ov.total_gmv)}</span> total GMV</span>
            <span><span className="text-gray-200 font-bold">{ov.pct_enriched}%</span> enriched</span>
          </div>
        )}
      </div>

      {/* Contract table */}
      {loadingList ? <Spinner /> : (
        <ContractsTable
          contracts={contracts}
          filter={search}
          onRowClick={setDrawerGemc}
          onSellerClick={navSeller}
          onDeptClick={navDept}
          onProductClick={navProduct}
        />
      )}

      {/* Summary panels */}
      <SummaryPanels
        onSellerClick={navSeller}
        onDeptClick={navDept}
        onProductClick={navProduct}
      />

      {/* Contract detail drawer */}
      {drawerGemc && (
        <ContractDrawer
          gemc={drawerGemc}
          onClose={() => setDrawerGemc(null)}
          onSellerClick={navSeller}
          onDeptClick={navDept}
          onProductClick={navProduct}
        />
      )}
    </div>
  )
}
