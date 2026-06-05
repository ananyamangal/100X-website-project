"use client"
import { useEffect, useState, useCallback, useRef } from "react"
import {
  FileSearch, Users, Map, Upload, RefreshCw, ChevronDown,
  TrendingUp, Building2, Package, Award, AlertCircle, CheckCircle2,
  Search, X, ExternalLink, Tag, PlusCircle,
} from "lucide-react"
import { CollectTab } from "./CollectTab"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Stats {
  total_bids: number
  active_bids: number
  awarded_bids: number
  total_estimated_value: number
  total_l1_value: number
  states_covered: number
  unique_l1_dealers: number
}

interface Bid {
  _id: string
  bid_number: string
  department_name: string
  state: string
  product_category: string
  product_name_raw: string
  quantity: number | null
  estimated_value_inr: number | null
  current_status: string
  publish_date: string | null
  award_date: string | null
  l1_dealer_name: string
  l1_oem_brand: string
  l1_price_inr: number | null
  l2_dealer_name: string
  l2_oem_brand: string
  l3_dealer_name: string
  l3_oem_brand: string
  is_100x_win: boolean
}

interface BidFilters { states: string[]; statuses: string[]; categories: string[] }

interface Dealer {
  name: string
  l1_wins: number
  l2_appearances: number
  l3_appearances: number
  total_participations: number
  win_rate_pct: number
  l1_value_inr: number
  states: string[]
  known_oems: string[]
  departments_count: number
  last_win: string | null
  is_100x_dealer: boolean
  gstin: string
  phone: string
  email: string
  notes: string
}

interface StateRow {
  state: string
  bid_count: number
  total_estimated_value: number
  total_l1_value: number
  active_bids: number
  awarded_bids: number
  top_dealers: { name: string; wins: number }[]
  top_oems: { name: string; count: number }[]
}

interface Brand {
  brand_name: string
  l1_wins: number
  states: string[]
  departments_count: number
  total_l1_value: number
  is_competitor: boolean
  is_100x: boolean
  notes: string
}

type Tab = "bids" | "dealers" | "heatmap" | "brands" | "import" | "collect"
type ImportType = "bids" | "dealers" | "products" | "brands"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCr(n: number) {
  if (!n) return "—"
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)} Cr`
  if (n >= 100000)   return `₹${(n / 100000).toFixed(1)} L`
  return `₹${n.toLocaleString("en-IN")}`
}

function fmtDate(d: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })
}

const STATUS_COLOR: Record<string, string> = {
  published:          "bg-blue-100 text-blue-700",
  technical_eval:     "bg-purple-100 text-purple-700",
  financial_eval:     "bg-amber-100 text-amber-700",
  financial_evaluated:"bg-amber-100 text-amber-700",
  awarded:            "bg-green-100 text-green-700",
  cancelled:          "bg-red-100 text-red-600",
}

function StatusBadge({ s }: { s: string }) {
  const c = STATUS_COLOR[s] || "bg-gray-100 text-gray-500"
  const label = s.replace(/_/g, " ")
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${c}`}>{label}</span>
}

function Pill({ c, children }: { c: string; children: React.ReactNode }) {
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${c}`}>{children}</span>
}

// ─── CSV TEMPLATES ────────────────────────────────────────────────────────────

const TEMPLATES: Record<ImportType, { headers: string[]; sample: string[] }> = {
  bids: {
    headers: [
      "bid_number","department_name","state","district","city",
      "product_category","product_name_raw","quantity","estimated_value_inr",
      "current_status","publish_date","bid_end_date","award_date",
      "l1_dealer_name","l1_oem_brand","l1_price_inr",
      "l2_dealer_name","l2_oem_brand","l2_price_inr",
      "l3_dealer_name","l3_oem_brand","l3_price_inr",
      "total_bidders_count","is_100x_win",
    ],
    sample: [
      "GEM/2025/B/6842354","Indo Tibetan Border Police","Haryana","","",
      "thermal_fogger","Fogging Machine V2 IS 14855 Part 1","12","1440000",
      "awarded","2025-01-10","2025-01-25","2025-02-05",
      "ABC Traders","Longray","1180000",
      "XYZ Enterprises","IGEBA","1210000",
      "PQR Agencies","Swastik","1230000",
      "8","false",
    ],
  },
  dealers: {
    headers: ["canonical_name","state","city","gstin","phone","email","is_100x_dealer","known_oems","notes"],
    sample: ["ABC Traders Pvt Ltd","Haryana","Gurugram","06XXXXX","9876543210","abc@example.com","false","Longray,IGEBA","Active bidder in defence segment"],
  },
  products: {
    headers: ["name","category","selling_price_inr","gross_margin_pct","dealer_margin_pct","is_bis_certified","certification_number","gem_listed","government_suitability_score","dealer_suitability_score","tier","notes"],
    sample: ["Thermal Fogger TF-75","thermal_fogger","85000","35","20","true","BIS-12345","true","85","90","A","Primary government product"],
  },
  brands: {
    headers: ["brand_name","is_competitor","is_100x","country_of_origin","notes"],
    sample: ["Longray","true","false","China","Dominant in Mumbai municipal. 224 units at BMC."],
  },
}

function downloadTemplate(type: ImportType) {
  const t = TEMPLATES[type]
  const csv = [t.headers.join(","), t.sample.join(",")].join("\n")
  const blob = new Blob([csv], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `template_${type}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split("\n").filter(Boolean)
  if (lines.length < 2) return []
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""))
  return lines.slice(1).map(line => {
    const values = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""))
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = values[i] || "" })
    return row
  })
}

// ─── BIDS TAB ─────────────────────────────────────────────────────────────────

function BidsTab() {
  const [bids, setBids] = useState<Bid[]>([])
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState<BidFilters>({ states: [], statuses: [], categories: [] })
  const [state, setState] = useState("")
  const [status, setStatus] = useState("")
  const [category, setCategory] = useState("")
  const [search, setSearch] = useState("")
  const [skip, setSkip] = useState(0)
  const [loading, setLoading] = useState(true)
  const limit = 100

  const load = useCallback(async (s = skip) => {
    setLoading(true)
    const p = new URLSearchParams({ limit: String(limit), skip: String(s) })
    if (state)    p.set("state", state)
    if (status)   p.set("status", status)
    if (category) p.set("category", category)
    if (search)   p.set("search", search)
    const res = await fetch(`/api/admin/procurement/bids?${p}`).then(r => r.json())
    setBids(res.bids || [])
    setTotal(res.total || 0)
    if (res.filters) setFilters(res.filters)
    setLoading(false)
  }, [state, status, category, search, skip])

  useEffect(() => { setSkip(0); load(0) }, [state, status, category])
  useEffect(() => { load(skip) }, [skip])

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setSkip(0); load(0) }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-[10px] text-gray-400 uppercase tracking-wide block mb-1">State</label>
            <select value={state} onChange={e => setState(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 min-w-[140px]">
              <option value="">All States</option>
              {filters.states.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-gray-400 uppercase tracking-wide block mb-1">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 min-w-[140px]">
              <option value="">All Statuses</option>
              {filters.statuses.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-gray-400 uppercase tracking-wide block mb-1">Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 min-w-[160px]">
              <option value="">All Categories</option>
              {filters.categories.map(c => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-[10px] text-gray-400 uppercase tracking-wide block mb-1">Search</label>
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Bid number, department, dealer, OEM…"
                className="text-xs border border-gray-200 rounded-lg pl-7 pr-3 py-1.5 w-full" />
            </div>
          </div>
          <button type="submit" className="text-xs bg-brand-600 text-white px-4 py-1.5 rounded-lg hover:bg-brand-700">Search</button>
          {(state || status || category || search) && (
            <button type="button" onClick={() => { setState(""); setStatus(""); setCategory(""); setSearch("") }}
              className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1">
              <X size={12} />Clear
            </button>
          )}
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-500">{total.toLocaleString()} bids</span>
          <div className="flex gap-2">
            {skip > 0 && (
              <button onClick={() => setSkip(Math.max(0, skip - limit))}
                className="text-[11px] text-brand-600 hover:underline">← Prev</button>
            )}
            {skip + limit < total && (
              <button onClick={() => setSkip(skip + limit)}
                className="text-[11px] text-brand-600 hover:underline">Next →</button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : bids.length === 0 ? (
          <div className="py-16 text-center">
            <FileSearch size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No bids yet.</p>
            <p className="text-xs text-gray-300 mt-1">Use the Import tab to load GeM bid data.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {["Bid Number","Department","State","Category","Qty","Est. Value","L1 Winner","L1 OEM","L2","L3","Status","Date"].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {bids.map(b => (
                  <tr key={b._id || b.bid_number} className={`hover:bg-gray-50/50 ${b.is_100x_win ? "bg-green-50/30" : ""}`}>
                    <td className="px-3 py-2.5 font-mono text-[10px] text-brand-600 whitespace-nowrap">
                      {b.bid_number}
                      {b.is_100x_win && <span className="ml-1 text-[9px] bg-green-600 text-white px-1 rounded">100X</span>}
                    </td>
                    <td className="px-3 py-2.5 text-gray-700 max-w-[160px] truncate" title={b.department_name}>{b.department_name || "—"}</td>
                    <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{b.state || "—"}</td>
                    <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{b.product_category?.replace(/_/g, " ") || "—"}</td>
                    <td className="px-3 py-2.5 text-gray-500 text-right">{b.quantity ?? "—"}</td>
                    <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap font-medium">{fmtCr(b.estimated_value_inr || 0)}</td>
                    <td className="px-3 py-2.5 text-gray-700 max-w-[140px] truncate" title={b.l1_dealer_name}>{b.l1_dealer_name || "—"}</td>
                    <td className="px-3 py-2.5">
                      {b.l1_oem_brand ? (
                        <Pill c="bg-orange-100 text-orange-700">{b.l1_oem_brand}</Pill>
                      ) : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-gray-400 max-w-[100px] truncate" title={b.l2_dealer_name}>{b.l2_dealer_name || "—"}</td>
                    <td className="px-3 py-2.5 text-gray-400 max-w-[100px] truncate" title={b.l3_dealer_name}>{b.l3_dealer_name || "—"}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap"><StatusBadge s={b.current_status} /></td>
                    <td className="px-3 py-2.5 text-gray-400 whitespace-nowrap">{fmtDate(b.award_date || b.publish_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── DEALERS TAB ──────────────────────────────────────────────────────────────

function DealersTab() {
  const [dealers, setDealers] = useState<Dealer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetch("/api/admin/procurement/dealers")
      .then(r => r.json())
      .then(d => { setDealers(d.dealers || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = dealers.filter(d =>
    !search ||
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.states.some(s => s.toLowerCase().includes(search.toLowerCase())) ||
    d.known_oems.some(o => o.toLowerCase().includes(search.toLowerCase()))
  )

  const maxWins = Math.max(...dealers.map(d => d.l1_wins), 1)

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="relative max-w-sm">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search dealer name, state, OEM…"
            className="text-xs border border-gray-200 rounded-lg pl-7 pr-3 py-1.5 w-full" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <span className="text-xs text-gray-500">{filtered.length} dealers identified from bid data</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Users size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No dealers yet.</p>
            <p className="text-xs text-gray-300 mt-1">Dealers are identified automatically from bid L1/L2/L3 data.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {["Dealer","L1 Wins","Win Rate","Participations","L1 Value","States","Known OEMs","100X?","Last Win"].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(d => (
                  <tr key={d.name} className={`hover:bg-gray-50/50 ${d.is_100x_dealer ? "bg-green-50/40" : ""}`}>
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-gray-800 max-w-[180px] truncate" title={d.name}>{d.name}</div>
                      {d.gstin && <div className="text-[10px] text-gray-400 font-mono">{d.gstin}</div>}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-green-700 text-sm">{d.l1_wins}</span>
                        <div className="w-16 bg-gray-100 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full bg-green-500"
                            style={{ width: `${Math.round((d.l1_wins / maxWins) * 100)}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`font-semibold ${d.win_rate_pct >= 50 ? "text-green-600" : "text-amber-600"}`}>
                        {d.win_rate_pct}%
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-gray-500">{d.total_participations}</td>
                    <td className="px-3 py-2.5 text-gray-700 font-medium whitespace-nowrap">{fmtCr(d.l1_value_inr)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1 max-w-[140px]">
                        {d.states.slice(0, 3).map(s => (
                          <Pill key={s} c="bg-blue-50 text-blue-600">{s}</Pill>
                        ))}
                        {d.states.length > 3 && <span className="text-[10px] text-gray-400">+{d.states.length - 3}</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1 max-w-[160px]">
                        {d.known_oems.filter(Boolean).slice(0, 2).map(o => (
                          <Pill key={o} c="bg-orange-100 text-orange-700">{o}</Pill>
                        ))}
                        {d.known_oems.filter(Boolean).length > 2 && (
                          <span className="text-[10px] text-gray-400">+{d.known_oems.filter(Boolean).length - 2}</span>
                        )}
                        {!d.known_oems.filter(Boolean).length && <span className="text-gray-300">—</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      {d.is_100x_dealer
                        ? <Pill c="bg-green-100 text-green-700">Yes</Pill>
                        : <Pill c="bg-gray-100 text-gray-400">No</Pill>}
                    </td>
                    <td className="px-3 py-2.5 text-gray-400 whitespace-nowrap">{fmtDate(d.last_win)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── HEAT MAP TAB ─────────────────────────────────────────────────────────────

function HeatMapTab() {
  const [states, setStates] = useState<StateRow[]>([])
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(365)

  const load = useCallback((d: number) => {
    setLoading(true)
    fetch(`/api/admin/procurement/heatmap?days=${d}`)
      .then(r => r.json())
      .then(data => { setStates(data.states || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => { load(days) }, [days])

  const maxBids = Math.max(...states.map(s => s.bid_count), 1)

  const heatColor = (count: number) => {
    const pct = count / maxBids
    if (pct >= 0.75) return "bg-green-500"
    if (pct >= 0.50) return "bg-green-400"
    if (pct >= 0.25) return "bg-amber-400"
    if (pct >= 0.10) return "bg-amber-300"
    return "bg-gray-200"
  }

  return (
    <div className="space-y-4">
      {/* Time window */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center gap-3">
        <span className="text-xs text-gray-500">Time window:</span>
        {[30, 90, 180, 365].map(d => (
          <button key={d} onClick={() => setDays(d)}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
              days === d ? "bg-brand-600 text-white" : "text-gray-500 border border-gray-200 hover:border-brand-400"
            }`}>
            {d === 365 ? "1 yr" : `${d}d`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : states.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-16 text-center shadow-sm">
          <Map size={32} className="text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">No data yet. Import bids to see the procurement heat map.</p>
        </div>
      ) : (
        <>
          {/* State grid */}
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            {states.map(s => (
              <div key={s.state} className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-700 truncate">{s.state}</span>
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${heatColor(s.bid_count)}`} />
                </div>
                <p className="text-xl font-bold text-gray-900">{s.bid_count}</p>
                <p className="text-[10px] text-gray-400">bids</p>
                <p className="text-[11px] text-gray-600 font-medium mt-1">{fmtCr(s.total_estimated_value)}</p>
                {s.active_bids > 0 && (
                  <p className="text-[10px] text-blue-600 mt-0.5">{s.active_bids} active</p>
                )}
              </div>
            ))}
          </div>

          {/* Detailed table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <h3 className="text-xs font-semibold text-gray-700">State Intelligence Detail</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {["State","Bids","Est. Value","Active","Awarded","Top L1 Dealer","Top OEM"].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-gray-400 font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {states.map(s => (
                    <tr key={s.state} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 font-semibold text-gray-800">{s.state}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-700">{s.bid_count}</span>
                          <div className="w-20 bg-gray-100 rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full ${heatColor(s.bid_count)}`}
                              style={{ width: `${Math.round((s.bid_count / maxBids) * 100)}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700 font-medium">{fmtCr(s.total_estimated_value)}</td>
                      <td className="px-4 py-3 text-blue-600 font-medium">{s.active_bids || "—"}</td>
                      <td className="px-4 py-3 text-green-600 font-medium">{s.awarded_bids || "—"}</td>
                      <td className="px-4 py-3">
                        {s.top_dealers[0] ? (
                          <span className="text-gray-700">{s.top_dealers[0].name}
                            <span className="text-gray-400 ml-1">({s.top_dealers[0].wins}W)</span>
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {s.top_oems[0]
                          ? <Pill c="bg-orange-100 text-orange-700">{s.top_oems[0].name}</Pill>
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── BRANDS TAB ───────────────────────────────────────────────────────────────

function BrandsTab() {
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/admin/procurement/brands")
      .then(r => r.json())
      .then(d => { setBrands(d.brands || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const maxWins = Math.max(...brands.map(b => b.l1_wins), 1)
  const totalWins = brands.reduce((s, b) => s + b.l1_wins, 0)

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <h3 className="text-xs font-semibold text-gray-700">OEM Brand Market Share — from concluded bids</h3>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : brands.length === 0 ? (
          <div className="py-12 text-center">
            <Tag size={28} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No brand data yet. Import awarded bids with L1 OEM fields populated.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {["Brand","L1 Wins","Market Share","States","Depts","L1 Value","Type","Notes"].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-gray-400 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {brands.map(b => (
                  <tr key={b.brand_name} className={b.is_100x ? "bg-green-50/40" : "hover:bg-gray-50/50"}>
                    <td className="px-4 py-3 font-semibold text-gray-800">
                      {b.brand_name}
                      {b.is_100x && <span className="ml-1.5 text-[9px] bg-green-600 text-white px-1.5 rounded-full">100X</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-700">{b.l1_wins}</span>
                        <div className="w-16 bg-gray-100 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full bg-brand-500"
                            style={{ width: `${Math.round((b.l1_wins / maxWins) * 100)}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-brand-600">
                      {totalWins > 0 ? `${Math.round((b.l1_wins / totalWins) * 100)}%` : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{b.states.length || "—"}</td>
                    <td className="px-4 py-3 text-gray-500">{b.departments_count || "—"}</td>
                    <td className="px-4 py-3 text-gray-700 font-medium">{fmtCr(b.total_l1_value)}</td>
                    <td className="px-4 py-3">
                      {b.is_100x
                        ? <Pill c="bg-green-100 text-green-700">Our Brand</Pill>
                        : b.is_competitor
                        ? <Pill c="bg-red-100 text-red-600">Competitor</Pill>
                        : <Pill c="bg-gray-100 text-gray-500">Unknown</Pill>}
                    </td>
                    <td className="px-4 py-3 text-gray-400 max-w-[200px] truncate" title={b.notes}>{b.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── IMPORT TAB ───────────────────────────────────────────────────────────────

function ImportTab() {
  const [importType, setImportType] = useState<ImportType>("bids")
  const [csvText, setCsvText] = useState("")
  const [preview, setPreview] = useState<Record<string, string>[]>([])
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; created: number; updated: number; skipped: number; total: number } | null>(null)
  const [error, setError] = useState("")

  const handleParse = () => {
    const rows = parseCSV(csvText)
    setPreview(rows)
    setResult(null)
    setError("")
  }

  const handleImport = async () => {
    if (!preview.length) return
    setImporting(true)
    setError("")
    try {
      const res = await fetch("/api/admin/procurement/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: importType, rows: preview }),
      }).then(r => r.json())

      if (res.error) { setError(res.error); return }
      setResult(res)
      setCsvText("")
      setPreview([])
    } catch {
      setError("Import failed — check console")
    } finally {
      setImporting(false)
    }
  }

  const t = TEMPLATES[importType]

  return (
    <div className="space-y-5">
      {/* Type selector */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <p className="text-xs text-gray-500 mb-3">What are you importing?</p>
        <div className="flex gap-2 flex-wrap">
          {(["bids","dealers","products","brands"] as ImportType[]).map(type => (
            <button key={type} onClick={() => { setImportType(type); setPreview([]); setResult(null); setCsvText("") }}
              className={`text-xs px-4 py-1.5 rounded-lg font-medium border transition-colors ${
                importType === type
                  ? "bg-brand-600 text-white border-brand-600"
                  : "text-gray-500 border-gray-200 hover:border-brand-400"
              }`}>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Template */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
        <AlertCircle size={14} className="text-blue-500 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-xs font-semibold text-blue-700 mb-1">Required columns for {importType}:</p>
          <div className="flex flex-wrap gap-1 mb-3">
            {t.headers.map(h => (
              <code key={h} className="text-[10px] bg-white border border-blue-200 text-blue-600 px-1.5 py-0.5 rounded">{h}</code>
            ))}
          </div>
          <button onClick={() => downloadTemplate(importType)}
            className="text-xs bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700">
            Download CSV template
          </button>
        </div>
      </div>

      {/* Paste area */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <label className="text-xs font-medium text-gray-700 block mb-2">
          Paste CSV data (first row must be headers)
        </label>
        <textarea
          value={csvText}
          onChange={e => setCsvText(e.target.value)}
          placeholder={`${t.headers.join(",")}\n${t.sample.join(",")}`}
          className="w-full h-40 text-[11px] font-mono border border-gray-200 rounded-lg p-3 resize-y text-gray-700"
        />
        <div className="flex gap-2 mt-3">
          <button onClick={handleParse} disabled={!csvText.trim()}
            className="text-xs bg-gray-700 text-white px-4 py-1.5 rounded-lg hover:bg-gray-900 disabled:opacity-40">
            Parse & Preview
          </button>
          {csvText && (
            <button onClick={() => { setCsvText(""); setPreview([]); setResult(null) }}
              className="text-xs text-gray-400 hover:text-gray-700">Clear</button>
          )}
        </div>
      </div>

      {/* Preview */}
      {preview.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-700 font-medium">{preview.length} rows ready to import</span>
            <button onClick={handleImport} disabled={importing}
              className="flex items-center gap-1.5 text-xs bg-brand-600 text-white px-4 py-1.5 rounded-lg hover:bg-brand-700 disabled:opacity-50">
              {importing
                ? <><RefreshCw size={11} className="animate-spin" />Importing…</>
                : <><Upload size={11} />Import {preview.length} rows</>}
            </button>
          </div>
          <div className="overflow-x-auto max-h-64">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 sticky top-0">
                  {Object.keys(preview[0]).map(h => (
                    <th key={h} className="text-left px-3 py-2 text-gray-400 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {preview.slice(0, 20).map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50/50">
                    {Object.values(row).map((v, j) => (
                      <td key={j} className="px-3 py-1.5 text-gray-600 max-w-[120px] truncate" title={v}>{v || "—"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex gap-3">
          <CheckCircle2 size={16} className="text-green-600 shrink-0 mt-0.5" />
          <div className="text-xs text-green-800">
            <p className="font-semibold mb-1">Import complete</p>
            <p>Created: {result.created} · Updated: {result.updated} · Skipped: {result.skipped} · Total: {result.total}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
          <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function ProcurementIntelligence() {
  const [activeTab, setActiveTab] = useState<Tab>("bids")
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    fetch("/api/admin/procurement/stats")
      .then(r => r.json())
      .then(setStats)
      .catch(() => {})
  }, [])

  const reloadStats = () => {
    fetch("/api/admin/procurement/stats").then(r => r.json()).then(setStats).catch(() => {})
  }

  const TABS: { id: Tab; label: string; icon: React.ElementType; highlight?: boolean }[] = [
    { id: "collect",  label: "Collect Bid",          icon: PlusCircle, highlight: true },
    { id: "bids",     label: "Bid Intelligence",      icon: FileSearch },
    { id: "dealers",  label: "Dealer Intelligence",   icon: Users },
    { id: "heatmap",  label: "Procurement Heat Map",  icon: Map },
    { id: "brands",   label: "Brand Intelligence",    icon: Tag },
    { id: "import",   label: "Bulk Import",           icon: Upload },
  ]

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-5 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Building2 size={18} className="text-brand-600" />
          <div>
            <h1 className="text-base font-bold text-gray-900">Procurement Intelligence</h1>
            <p className="text-gray-400 text-[11px]">GeM bid intelligence · Dealer tracking · OEM market share · State heat map</p>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 max-w-[1600px] space-y-6">
        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { label: "Total Bids",     value: stats?.total_bids?.toLocaleString()     || "—", color: "text-gray-800",   border: "border-gray-200" },
            { label: "Active Bids",    value: stats?.active_bids?.toLocaleString()    || "—", color: "text-blue-600",   border: "border-blue-200" },
            { label: "Awarded",        value: stats?.awarded_bids?.toLocaleString()   || "—", color: "text-green-600",  border: "border-green-200" },
            { label: "Est. Value",     value: fmtCr(stats?.total_estimated_value || 0),       color: "text-brand-600",  border: "border-brand-200" },
            { label: "L1 Value",       value: fmtCr(stats?.total_l1_value || 0),              color: "text-purple-600", border: "border-purple-200" },
            { label: "States",         value: stats?.states_covered?.toString()       || "—", color: "text-amber-600",  border: "border-amber-200" },
            { label: "Unique Dealers", value: stats?.unique_l1_dealers?.toString()    || "—", color: "text-teal-600",   border: "border-teal-200" },
          ].map(({ label, value, color, border }) => (
            <div key={label} className={`bg-white rounded-xl border ${border} p-4 shadow-sm`}>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">{label}</p>
              <p className={`text-xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-sm w-fit">
          {TABS.map(({ id, label, icon: Icon, highlight }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-lg font-medium transition-colors ${
                activeTab === id
                  ? "bg-brand-600 text-white"
                  : highlight
                  ? "text-brand-600 border border-brand-200 hover:bg-brand-50"
                  : "text-gray-500 hover:text-gray-700"
              }`}>
              <Icon size={12} />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "collect"  && <CollectTab onSaved={reloadStats} />}
        {activeTab === "bids"     && <BidsTab />}
        {activeTab === "dealers"  && <DealersTab />}
        {activeTab === "heatmap"  && <HeatMapTab />}
        {activeTab === "brands"   && <BrandsTab />}
        {activeTab === "import"   && <ImportTab />}
      </div>
    </div>
  )
}
