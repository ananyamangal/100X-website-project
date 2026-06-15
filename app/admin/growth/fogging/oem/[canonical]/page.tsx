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

interface OemProfile {
  oem_canonical: string; brand_name: string; oem_short_brand: string; is_100x: boolean
  total_contracts: number; total_gmv: number; buyer_count: number; state_count: number
  market_share_gmv: number; median_unit_price: number | null; avg_unit_price: number | null
  first_seen: string | null; last_seen: string | null; model_count: number
}

interface ModelOption { value: string; label: string }

interface Contract {
  gemc_no: string; contract_date: string | null
  buyer_display_name: string; buyer_state: string | null; buyer_canonical: string
  model_raw: string | null; model_normalized: string | null
  quantity: number | null; unit_price: number | null; contract_value_num: number | null
  seller_name: string | null; seller_gst: string | null
  buying_mode: string | null; has_unit_price: boolean; org_type: string | null
}

interface Summary {
  total_gmv: number; priced_count: number
  avg_unit_price: number | null; min_unit_price: number | null; max_unit_price: number | null
}

// ── Contract Detail Panel ────────────────────────────────────────────────────

function ContractPanel({ contract, onClose }: { contract: Contract; onClose: () => void }) {
  const gemUrl = `https://mkp.gem.gov.in/GeM-Brochures/public/brochure/${contract.gemc_no}`
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
          <div><div className="text-xs text-gray-400 mb-0.5">Buyer</div><div className="font-medium leading-tight">{contract.buyer_display_name}</div></div>
          <div><div className="text-xs text-gray-400 mb-0.5">State / Type</div><div>{contract.buyer_state ?? "—"} · {contract.org_type ?? "—"}</div></div>
          <div><div className="text-xs text-gray-400 mb-0.5">Model</div><div className="font-medium">{contract.model_raw ?? "—"}</div></div>
          <div><div className="text-xs text-gray-400 mb-0.5">Quantity</div><div className="font-medium">{contract.quantity ?? "—"}</div></div>
          <div><div className="text-xs text-gray-400 mb-0.5">Unit Price</div><div className="font-medium text-green-700">{INR(contract.unit_price)}</div></div>
          <div><div className="text-xs text-gray-400 mb-0.5">Mode</div><div>{contract.buying_mode ?? "—"}</div></div>
        </div>

        <div className="border-t border-gray-100 pt-3">
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">Seller / Dealer</div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
            <div className="font-semibold text-gray-800">{contract.seller_name ?? "—"}</div>
            {contract.seller_gst && (
              <div className="font-mono text-xs text-gray-500 select-all">{contract.seller_gst}</div>
            )}
          </div>
        </div>

        <div className="border-t border-gray-100 pt-3 space-y-2">
          <div className="text-xs text-gray-400 uppercase tracking-wide">GeM Contract Page</div>
          <a href={gemUrl} target="_blank" rel="noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            <ExternalLink size={15} /> Open on GeM Portal
          </a>
          <p className="text-xs text-gray-400">Contract PDF is available on the GeM portal page above.</p>
        </div>

        <div className="border-t border-gray-100 pt-3">
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">Embedded View</div>
          <iframe
            src={gemUrl}
            className="w-full h-64 border border-gray-200 rounded-lg bg-gray-50"
            title={`GeM Contract ${contract.gemc_no}`}
            onError={() => {}}
          />
          <p className="text-xs text-gray-400 mt-1">If frame is blocked, use the button above.</p>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function OemPage() {
  const params    = useParams()
  const router    = useRouter()
  const canonical = decodeURIComponent(params.canonical as string)

  const [profile,   setProfile]   = useState<OemProfile | null>(null)
  const [models,    setModels]    = useState<ModelOption[]>([])
  const [states,    setStates]    = useState<string[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [summary,   setSummary]   = useState<Summary | null>(null)
  const [total,     setTotal]     = useState(0)
  const [page,      setPage]      = useState(1)
  const [loading,   setLoading]   = useState(true)
  const [profLoad,  setProfLoad]  = useState(true)
  const [selected,  setSelected]  = useState<Contract | null>(null)

  const [filters, setFilters] = useState({
    model: "", state: "", year: "", q: "", sort: "date_desc"
  })
  const PAGE_SIZE = 50

  // Load OEM profile + model/state lists
  useEffect(() => {
    setProfLoad(true)
    fetch(`/api/fogging/oems/${encodeURIComponent(canonical)}`)
      .then(r => r.json())
      .then(d => {
        setProfile(d.profile)
        setModels(
          (d.model_breakdown ?? [])
            .filter((m: {_id: string}) => m._id)
            .map((m: {_id: string; model: string}) => ({ value: m._id, label: m.model || m._id }))
        )
        setStates((d.state_breakdown ?? []).map((s: {_id: string}) => s._id).filter(Boolean))
      })
      .finally(() => setProfLoad(false))
  }, [canonical])

  // Load contracts with filters
  const loadContracts = useCallback(() => {
    setLoading(true)
    const qs = new URLSearchParams({
      oem_canonical: canonical,
      page:          String(page),
      page_size:     String(PAGE_SIZE),
      sort:          filters.sort,
    })
    if (filters.model) qs.set('model_normalized', filters.model)
    if (filters.state) qs.set('buyer_state',      filters.state)
    if (filters.year)  qs.set('year',             filters.year)
    if (filters.q)     qs.set('q',                filters.q)

    fetch(`/api/fogging/contracts?${qs}`)
      .then(r => r.json())
      .then(d => { setContracts(d.data ?? []); setTotal(d.total ?? 0); setSummary(d.summary ?? null) })
      .finally(() => setLoading(false))
  }, [canonical, page, filters])

  useEffect(() => { loadContracts() }, [loadContracts])
  useEffect(() => { setPage(1) }, [filters])

  const exportCsv = () => {
    const qs = new URLSearchParams({ oem_canonical: canonical, export: 'csv', page_size: '5000' })
    if (filters.model) qs.set('model_normalized', filters.model)
    if (filters.state) qs.set('buyer_state',      filters.state)
    if (filters.year)  qs.set('year',             filters.year)
    if (filters.q)     qs.set('q',                filters.q)
    window.open(`/api/fogging/contracts?${qs}`, '_blank')
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  if (profLoad) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading OEM profile…</div>
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
              <h1 className="text-lg font-bold text-gray-900">{profile?.brand_name ?? canonical}</h1>
              {profile?.is_100x && (
                <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded font-medium">100X</span>
              )}
              <span className="text-xs text-gray-400 font-mono">{canonical}</span>
            </div>
            <div className="text-xs text-gray-400">OEM 360 · Fogging Intelligence</div>
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
              { label: "Total GMV",       value: INR(profile.total_gmv, true),         sub: undefined },
              { label: "Contracts",       value: profile.total_contracts.toString(),   sub: undefined },
              { label: "Buyers",          value: profile.buyer_count.toString(),        sub: `${profile.state_count} states` },
              { label: "Market Share",    value: profile.market_share_gmv != null ? `${profile.market_share_gmv.toFixed(1)}%` : "—", sub: "by GMV" },
              { label: "Median Price",    value: INR(profile.median_unit_price),        sub: undefined },
              { label: "Models",          value: profile.model_count?.toString() ?? "—", sub: undefined },
            ].map(k => (
              <div key={k.label} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="text-xs text-gray-400 mb-1">{k.label}</div>
                <div className="text-xl font-bold text-gray-900">{k.value}</div>
                {k.sub && <div className="text-xs text-gray-400 mt-0.5">{k.sub}</div>}
              </div>
            ))}
          </div>
        )}

        {/* Filter bar */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={filters.q}
                onChange={e => setFilters(f => ({ ...f, q: e.target.value }))}
                placeholder="Search buyer, model, GEMC#, seller…"
                className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Model filter */}
            <select value={filters.model} onChange={e => setFilters(f => ({ ...f, model: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">All Models</option>
              {models.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>

            {/* State filter */}
            <select value={filters.state} onChange={e => setFilters(f => ({ ...f, state: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">All States</option>
              {states.map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            {/* Year filter */}
            <select value={filters.year} onChange={e => setFilters(f => ({ ...f, year: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">All Years</option>
              {[2025,2024,2023,2022,2021,2020,2019].map(y => <option key={y} value={y}>{y}</option>)}
            </select>

            {/* Sort */}
            <select value={filters.sort} onChange={e => setFilters(f => ({ ...f, sort: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="date_desc">Newest first</option>
              <option value="date_asc">Oldest first</option>
              <option value="value_desc">Highest value</option>
              <option value="value_asc">Lowest value</option>
              <option value="price_desc">Highest price</option>
              <option value="price_asc">Lowest price</option>
              <option value="buyer_asc">Buyer A–Z</option>
            </select>

            {/* Clear filters */}
            {(filters.model || filters.state || filters.year || filters.q) && (
              <button onClick={() => setFilters({ model: "", state: "", year: "", q: "", sort: filters.sort })}
                className="text-sm text-gray-500 hover:text-gray-800 underline">
                Clear
              </button>
            )}
          </div>

          {/* Summary bar */}
          {summary && (
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500 pt-3 border-t border-gray-100">
              <span>Showing <strong className="text-gray-800">{total.toLocaleString()}</strong> contracts</span>
              <span>GMV <strong className="text-gray-800">{INR(summary.total_gmv, true)}</strong></span>
              {summary.avg_unit_price && <span>Avg price <strong className="text-gray-800">{INR(summary.avg_unit_price)}</strong></span>}
              {summary.min_unit_price && <span>Price range <strong className="text-green-700">{INR(summary.min_unit_price)}</strong> – <strong className="text-red-700">{INR(summary.max_unit_price)}</strong></span>}
            </div>
          )}
        </div>

        {/* Contract table */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="py-20 text-center text-gray-400 text-sm">Loading…</div>
          ) : contracts.length === 0 ? (
            <div className="py-20 text-center text-gray-400 text-sm">No contracts match the current filters.</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr className="text-xs text-gray-500 uppercase tracking-wide">
                      <th className="px-4 py-3 text-left">Date</th>
                      <th className="px-4 py-3 text-left">Buyer</th>
                      <th className="px-3 py-3 text-left">State</th>
                      <th className="px-4 py-3 text-left">Model</th>
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
                          <div className="font-medium text-gray-900 truncate text-xs leading-tight">{c.buyer_display_name}</div>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">{c.buyer_state ?? "—"}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-700 max-w-48">
                          <div className="truncate">{c.model_raw ?? "—"}</div>
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
                            <button
                              onClick={() => setSelected(c)}
                              className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs text-gray-700 transition-colors"
                              title="View contract detail">
                              Detail
                            </button>
                            <a
                              href={`https://mkp.gem.gov.in/GeM-Brochures/public/brochure/${c.gemc_no}`}
                              target="_blank" rel="noreferrer"
                              className="px-2 py-1 bg-blue-50 hover:bg-blue-100 rounded text-xs text-blue-700 transition-colors flex items-center gap-0.5"
                              title="Open on GeM">
                              GeM <ExternalLink size={10} />
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <span>
                  Page {page} of {totalPages} · {total.toLocaleString()} contracts
                </span>
                <div className="flex items-center gap-2">
                  <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                    className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 transition-colors">
                    <ChevronLeft size={14} />
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const start = Math.max(1, Math.min(page - 2, totalPages - 4))
                    return start + i
                  }).map(p => (
                    <button key={p} onClick={() => setPage(p)}
                      className={`w-7 h-7 rounded text-xs transition-colors ${p === page ? "bg-blue-600 text-white" : "hover:bg-gray-100"}`}>
                      {p}
                    </button>
                  ))}
                  <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                    className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30 transition-colors">
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
