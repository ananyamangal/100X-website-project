"use client"
import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Download, Search, ExternalLink, X, ChevronLeft, ChevronRight } from "lucide-react"

// ── Helpers ──────────────────────────────────────────────────────────────────

const INR = (v: number | null | undefined, cr = false) => {
  if (v == null) return "—"
  if (cr) {
    if (v >= 10_000_000) return `₹${(v / 10_000_000).toFixed(2)} Cr`
    if (v >= 100_000)    return `₹${(v / 100_000).toFixed(1)} L`
    return `₹${v.toLocaleString('en-IN')}`
  }
  return `₹${v.toLocaleString('en-IN')}`
}
const fmt = (d: string | Date | null) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : "—"

// ── Types ────────────────────────────────────────────────────────────────────

interface ModelProfile {
  model_normalized: string; model_display: string; oem_canonical: string
  oem_short_brand: string | null
  total_contracts: number; total_gmv: number; buyer_count: number; state_count: number
  avg_unit_price: number | null; median_unit_price: number | null
  min_unit_price: number | null; max_unit_price: number | null
  first_seen: string | null; last_seen: string | null
}

interface BuyerRow {
  _id: string; buyer_display_name: string; buyer_state: string | null
  organization_name?: string; organization_canonical?: string | null
  contract_count: number; total_gmv: number; total_qty: number
  min_price: number | null; max_price: number | null; avg_price: number | null
  last_purchase: string | null; sellers: string[]
}

interface Contract {
  gemc_no: string; contract_date: string | null
  buyer_display_name: string; buyer_state: string | null; buyer_canonical: string
  organization_name?: string; organization_canonical?: string | null
  oem_canonical: string; oem_short_brand: string | null; is_100x: boolean
  model_raw: string | null
  quantity: number | null; unit_price: number | null; contract_value_num: number | null
  seller_name: string | null; seller_gst: string | null
  buying_mode: string | null
}

// ── Contract Detail Panel ────────────────────────────────────────────────────

function ContractPanel({ contract, onClose }: { contract: Contract; onClose: () => void }) {
  const gemUrl = `https://gem.gov.in/orders/contract/${contract.gemc_no}`
  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-lg bg-white border-l border-gray-200 shadow-2xl z-50 flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <div className="text-xs text-gray-400 uppercase tracking-wide">Contract Detail</div>
          <div className="font-mono text-sm font-semibold text-gray-800 mt-0.5 select-all">{contract.gemc_no}</div>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X size={18} /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><div className="text-xs text-gray-400 mb-0.5">Date</div><div className="font-medium">{fmt(contract.contract_date)}</div></div>
          <div><div className="text-xs text-gray-400 mb-0.5">Value</div><div className="font-semibold text-blue-700">{INR(contract.contract_value_num, true)}</div></div>
          <div className="col-span-2">
            <div className="text-xs text-gray-400 mb-0.5">Organization</div>
            {contract.organization_canonical ? (
              <a href={`/admin/growth/fogging/organizations/${encodeURIComponent(contract.organization_canonical)}`}
                className="font-medium text-indigo-700 hover:underline text-xs leading-tight">
                {contract.organization_name ?? contract.buyer_display_name}
              </a>
            ) : (
              <div className="font-medium text-xs leading-tight">{contract.organization_name ?? contract.buyer_display_name}</div>
            )}
            {contract.organization_name && contract.organization_name !== contract.buyer_display_name && (
              <div className="text-xs text-gray-400 mt-0.5">Dept: {contract.buyer_display_name}</div>
            )}
          </div>
          <div><div className="text-xs text-gray-400 mb-0.5">State</div><div>{contract.buyer_state ?? "—"}</div></div>
          <div><div className="text-xs text-gray-400 mb-0.5">OEM</div><div className={`font-medium ${contract.is_100x ? "text-blue-700" : ""}`}>{contract.oem_short_brand ?? contract.oem_canonical}</div></div>
          <div><div className="text-xs text-gray-400 mb-0.5">Quantity</div><div className="font-medium">{contract.quantity ?? "—"}</div></div>
          <div><div className="text-xs text-gray-400 mb-0.5">Unit Price</div><div className="font-medium text-green-700">{INR(contract.unit_price)}</div></div>
          <div><div className="text-xs text-gray-400 mb-0.5">Mode</div><div>{contract.buying_mode ?? "—"}</div></div>
        </div>
        <div className="border-t border-gray-100 pt-3">
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">Seller / Dealer</div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
            <div className="font-semibold text-gray-800">{contract.seller_name ?? "—"}</div>
            {contract.seller_gst && <div className="font-mono text-xs text-gray-500 select-all">{contract.seller_gst}</div>}
          </div>
          {contract.seller_gst && (
            <a href={`/admin/growth/fogging/sellers/${encodeURIComponent(contract.seller_gst)}`}
              className="mt-2 flex items-center gap-1.5 text-xs text-amber-700 hover:text-amber-900 hover:underline transition-colors">
              View Seller 360 →
            </a>
          )}
        </div>
        <div className="border-t border-gray-100 pt-3 space-y-2">
          <a href={gemUrl} target="_blank" rel="noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            <ExternalLink size={15} /> Open on GeM Portal
          </a>
          <p className="text-xs text-gray-400">View brochure, delivery terms, and download contract PDF on GeM.</p>
        </div>
        <div className="border-t border-gray-100 pt-3">
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">Contract Reference</div>
          <a href={gemUrl} target="_blank" rel="noreferrer"
            className="flex items-center justify-between px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors group">
            <div>
              <div className="font-mono text-sm font-medium text-blue-700 select-all">{contract.gemc_no}</div>
              <div className="text-xs text-gray-500 mt-0.5">GeM brochure · delivery terms · contract PDF</div>
            </div>
            <ExternalLink size={14} className="text-gray-400 group-hover:text-blue-600 flex-shrink-0" />
          </a>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function ModelPage() {
  const params     = useParams()
  const router     = useRouter()
  const normalized = decodeURIComponent(params.normalized as string)

  const [profile,   setProfile]   = useState<ModelProfile | null>(null)
  const [buyers,    setBuyers]    = useState<BuyerRow[]>([])
  const [states,    setStates]    = useState<string[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [total,     setTotal]     = useState(0)
  const [summary,   setSummary]   = useState<{ total_gmv: number } | null>(null)
  const [page,      setPage]      = useState(1)
  const [loading,   setLoading]   = useState(true)
  const [profLoad,  setProfLoad]  = useState(true)
  const [selected,  setSelected]  = useState<Contract | null>(null)
  const [view,      setView]      = useState<"buyers"|"contracts">("buyers")

  const [filters, setFilters] = useState({
    state: "", year: "", q: "", sort: "date_desc"
  })
  const PAGE_SIZE = 50

  // Load model profile + buyer breakdown
  useEffect(() => {
    setProfLoad(true)
    fetch(`/api/fogging/models/${encodeURIComponent(normalized)}`)
      .then(r => r.json())
      .then(d => {
        setProfile(d.profile)
        setBuyers(d.buyer_breakdown ?? [])
        setStates((d.state_breakdown ?? []).map((s: {_id: string}) => s._id).filter(Boolean))
      })
      .finally(() => setProfLoad(false))
  }, [normalized])

  const loadContracts = useCallback(() => {
    if (view !== "contracts") return
    setLoading(true)
    const qs = new URLSearchParams({
      model_normalized: normalized,
      page:             String(page),
      page_size:        String(PAGE_SIZE),
      sort:             filters.sort,
    })
    if (filters.state) qs.set('buyer_state', filters.state)
    if (filters.year)  qs.set('year',        filters.year)
    if (filters.q)     qs.set('q',           filters.q)

    fetch(`/api/fogging/contracts?${qs}`)
      .then(r => r.json())
      .then(d => { setContracts(d.data ?? []); setTotal(d.total ?? 0); setSummary(d.summary ?? null) })
      .finally(() => setLoading(false))
  }, [normalized, page, filters, view])

  useEffect(() => { loadContracts() }, [loadContracts])
  useEffect(() => { setPage(1) }, [filters])

  const exportCsv = () => {
    const qs = new URLSearchParams({ model_normalized: normalized, export: 'csv', page_size: '5000' })
    if (filters.state) qs.set('buyer_state', filters.state)
    if (filters.year)  qs.set('year',        filters.year)
    window.open(`/api/fogging/contracts?${qs}`, '_blank')
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  if (profLoad) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading model profile…</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {selected && <ContractPanel contract={selected} onClose={() => setSelected(null)} />}

      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <button onClick={() => router.back()}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors">
            <ArrowLeft size={16} /> Back
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-gray-900">{profile?.model_display ?? normalized}</h1>
            </div>
            <div className="text-xs text-gray-400">
              Model 360 · {profile?.oem_short_brand ?? profile?.oem_canonical ?? "—"} · <span className="font-mono">{normalized}</span>
            </div>
          </div>
          <button onClick={exportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors">
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* KPI strip */}
        {profile && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "Total GMV",    value: INR(profile.total_gmv, true) },
              { label: "Contracts",    value: profile.total_contracts.toString() },
              { label: "Buyers",       value: profile.buyer_count.toString() },
              { label: "Median Price", value: INR(profile.median_unit_price) },
              { label: "Min Price",    value: INR(profile.min_unit_price) },
              { label: "Max Price",    value: INR(profile.max_unit_price) },
            ].map(k => (
              <div key={k.label} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="text-xs text-gray-400 mb-1">{k.label}</div>
                <div className="text-xl font-bold text-gray-900">{k.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* View toggle */}
        <div className="flex gap-2">
          <button onClick={() => setView("buyers")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === "buyers" ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
            Buyers ({buyers.length})
          </button>
          <button onClick={() => { setView("contracts"); loadContracts() }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === "contracts" ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
            All Contracts ({profile?.total_contracts ?? "…"})
          </button>
        </div>

        {/* Buyer breakdown (answers: "who bought this model and at what price?") */}
        {view === "buyers" && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Buyers — who purchased this model and what they paid</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr className="text-xs text-gray-500 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">#</th>
                    <th className="px-4 py-3 text-left">Organization</th>
                    <th className="px-3 py-3 text-left">State</th>
                    <th className="px-3 py-3 text-right">Contracts</th>
                    <th className="px-3 py-3 text-right">Total Qty</th>
                    <th className="px-3 py-3 text-right">Min ₹</th>
                    <th className="px-3 py-3 text-right">Avg ₹</th>
                    <th className="px-3 py-3 text-right">Max ₹</th>
                    <th className="px-3 py-3 text-right">GMV</th>
                    <th className="px-3 py-3 text-left">Sellers</th>
                    <th className="px-3 py-3 text-right">Last</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {buyers.map((b, i) => (
                    <tr key={b._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2.5 text-xs text-gray-400">{i + 1}</td>
                      <td className="px-4 py-2.5 max-w-xs">
                        {b.organization_canonical ? (
                          <a href={`/admin/growth/fogging/organizations/${encodeURIComponent(b.organization_canonical)}`}
                            className="font-medium text-indigo-700 hover:underline text-xs leading-tight block truncate">
                            {b.organization_name ?? b.buyer_display_name}
                          </a>
                        ) : (
                          <a href={`/admin/growth/fogging/buyer/${encodeURIComponent(b._id)}`}
                            className="font-medium text-blue-700 hover:underline text-xs leading-tight block truncate">
                            {b.organization_name ?? b.buyer_display_name}
                          </a>
                        )}
                        {b.organization_name && b.organization_name !== b.buyer_display_name && (
                          <div className="text-gray-400 text-[10px] truncate">{b.buyer_display_name}</div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">{b.buyer_state ?? "—"}</td>
                      <td className="px-3 py-2.5 text-right text-xs">{b.contract_count}</td>
                      <td className="px-3 py-2.5 text-right text-xs">{b.total_qty ?? "—"}</td>
                      <td className="px-3 py-2.5 text-right text-xs text-green-700">{INR(b.min_price)}</td>
                      <td className="px-3 py-2.5 text-right text-xs font-medium">{INR(b.avg_price)}</td>
                      <td className="px-3 py-2.5 text-right text-xs text-red-600">{INR(b.max_price)}</td>
                      <td className="px-3 py-2.5 text-right text-xs font-semibold">{INR(b.total_gmv, true)}</td>
                      <td className="px-3 py-2.5 text-xs text-amber-800 max-w-48">
                        <div className="truncate">{b.sellers?.filter(Boolean).join(", ") || "—"}</div>
                      </td>
                      <td className="px-3 py-2.5 text-right text-xs text-gray-400 whitespace-nowrap">{fmt(b.last_purchase)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Contract table */}
        {view === "contracts" && (
          <>
            {/* Filter bar */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-48">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={filters.q} onChange={e => setFilters(f => ({ ...f, q: e.target.value }))}
                    placeholder="Search buyer, GEMC#, seller…"
                    className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <select value={filters.state} onChange={e => setFilters(f => ({ ...f, state: e.target.value }))}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">All States</option>
                  {states.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={filters.year} onChange={e => setFilters(f => ({ ...f, year: e.target.value }))}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">All Years</option>
                  {[2025,2024,2023,2022,2021,2020,2019].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <select value={filters.sort} onChange={e => setFilters(f => ({ ...f, sort: e.target.value }))}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="date_desc">Newest first</option>
                  <option value="date_asc">Oldest first</option>
                  <option value="price_asc">Lowest price</option>
                  <option value="price_desc">Highest price</option>
                  <option value="buyer_asc">Buyer A–Z</option>
                </select>
                {(filters.state || filters.year || filters.q) && (
                  <button onClick={() => setFilters({ state: "", year: "", q: "", sort: filters.sort })}
                    className="text-sm text-gray-500 hover:text-gray-800 underline">Clear</button>
                )}
              </div>
              {summary && (
                <div className="mt-3 flex gap-4 text-xs text-gray-500 pt-3 border-t border-gray-100">
                  <span>Showing <strong className="text-gray-800">{total.toLocaleString()}</strong> contracts</span>
                  <span>GMV <strong className="text-gray-800">{INR(summary.total_gmv, true)}</strong></span>
                </div>
              )}
            </div>

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              {loading ? (
                <div className="py-20 text-center text-gray-400 text-sm">Loading…</div>
              ) : contracts.length === 0 ? (
                <div className="py-20 text-center text-gray-400 text-sm">No contracts found.</div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr className="text-xs text-gray-500 uppercase tracking-wide">
                          <th className="px-4 py-3 text-left">Date</th>
                          <th className="px-4 py-3 text-left">Organization</th>
                          <th className="px-3 py-3 text-left">State</th>
                          <th className="px-4 py-3 text-left">OEM</th>
                          <th className="px-3 py-3 text-right">Qty</th>
                          <th className="px-3 py-3 text-right">Unit ₹</th>
                          <th className="px-3 py-3 text-right">Value</th>
                          <th className="px-4 py-3 text-left">Seller / Dealer</th>
                          <th className="px-3 py-3 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {contracts.map(c => (
                          <tr key={c.gemc_no}
                            className="hover:bg-gray-50 cursor-pointer transition-colors"
                            onClick={() => setSelected(c)}>
                            <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">{fmt(c.contract_date)}</td>
                            <td className="px-4 py-2.5 max-w-xs">
                              {c.organization_canonical ? (
                                <a href={`/admin/growth/fogging/organizations/${encodeURIComponent(c.organization_canonical)}`}
                                  className="font-medium text-indigo-700 hover:underline truncate block text-xs">
                                  {c.organization_name ?? c.buyer_display_name}
                                </a>
                              ) : (
                                <div className="font-medium text-gray-900 truncate text-xs">
                                  {c.organization_name ?? c.buyer_display_name}
                                </div>
                              )}
                              {c.organization_name && c.organization_name !== c.buyer_display_name && (
                                <div className="text-gray-400 text-[10px] truncate">{c.buyer_display_name}</div>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">{c.buyer_state ?? "—"}</td>
                            <td className="px-4 py-2.5 text-xs">
                              <span className={c.is_100x ? "font-semibold text-blue-700" : "text-gray-700"}>
                                {c.oem_short_brand ?? c.oem_canonical}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-right text-xs">{c.quantity ?? "—"}</td>
                            <td className="px-3 py-2.5 text-right text-xs font-medium text-green-700">{INR(c.unit_price)}</td>
                            <td className="px-3 py-2.5 text-right text-xs font-semibold">{INR(c.contract_value_num, true)}</td>
                            <td className="px-4 py-2.5 max-w-48">
                              <div className="text-xs font-medium text-amber-800 truncate">{c.seller_name ?? "—"}</div>
                              {c.seller_gst && <div className="font-mono text-xs text-gray-400">{c.seller_gst}</div>}
                            </td>
                            <td className="px-3 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1">
                                <button onClick={() => setSelected(c)}
                                  className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs text-gray-700 transition-colors">Detail</button>
                                <a href={`https://gem.gov.in/orders/contract/${c.gemc_no}`}
                                  target="_blank" rel="noreferrer"
                                  className="px-2 py-1 bg-blue-50 hover:bg-blue-100 rounded text-xs text-blue-700 transition-colors flex items-center gap-0.5">
                                  GeM <ExternalLink size={10} />
                                </a>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                    <span>Page {page} of {totalPages} · {total.toLocaleString()} contracts</span>
                    <div className="flex items-center gap-2">
                      <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                        className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30"><ChevronLeft size={14} /></button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const start = Math.max(1, Math.min(page - 2, totalPages - 4))
                        return start + i
                      }).map(p => (
                        <button key={p} onClick={() => setPage(p)}
                          className={`w-7 h-7 rounded text-xs ${p === page ? "bg-blue-600 text-white" : "hover:bg-gray-100"}`}>{p}</button>
                      ))}
                      <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                        className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30"><ChevronRight size={14} /></button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
