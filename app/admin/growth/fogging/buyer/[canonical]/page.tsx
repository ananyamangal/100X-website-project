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
const PCT = (v: number | null | undefined) => v != null ? `${v.toFixed(1)}%` : "—"

// ── Types ────────────────────────────────────────────────────────────────────

interface BuyerProfile {
  buyer_canonical: string; buyer_display_name: string; buyer_state: string | null
  org_type: string | null; is_anomalous: boolean; anomaly_reason: string | null
  total_contracts: number; total_gmv: number; oem_count: number
  last_purchase: string | null; days_since_last: number
  opportunity_tier: string; opportunity_score: number
  primary_incumbent: string | null; purchased_100x: boolean
  oem_spend: { oem_canonical: string; brand_name: string; gmv: number; contracts: number; share_pct: number; last_contract: string | null; is_100x: boolean }[]
}

type BuyerApiResponse = {
  profile: BuyerProfile
  contracts: Contract[]
  oem_history: { oem_canonical: string; first: string | null; last: string | null; count: number; gmv: number }[]
}

interface Contract {
  gemc_no: string; contract_date: string | null
  oem_canonical: string; oem_short_brand: string | null; is_100x: boolean
  buyer_display_name: string; buyer_state: string | null; buyer_canonical: string
  model_raw: string | null; model_normalized: string | null
  quantity: number | null; unit_price: number | null; contract_value_num: number | null
  seller_name: string | null; seller_gst: string | null
  buying_mode: string | null; has_unit_price: boolean; org_type: string | null
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
          <div><div className="text-xs text-gray-400 mb-0.5">OEM</div>
            <div className={`font-medium ${contract.is_100x ? "text-blue-700" : ""}`}>
              {contract.oem_short_brand ?? contract.oem_canonical}
              {contract.is_100x && <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-1 rounded">100X</span>}
            </div>
          </div>
          <div><div className="text-xs text-gray-400 mb-0.5">Model</div><div className="font-medium">{contract.model_raw ?? "—"}</div></div>
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
          <p className="text-xs text-gray-400">Contract PDF is available on the GeM portal page.</p>
        </div>
        <div className="border-t border-gray-100 pt-3">
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">Embedded View</div>
          <iframe src={gemUrl} className="w-full h-64 border border-gray-200 rounded-lg bg-gray-50"
            title={`GeM Contract ${contract.gemc_no}`} onError={() => {}} />
          <p className="text-xs text-gray-400 mt-1">If frame is blocked, use the button above.</p>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function BuyerPage() {
  const params    = useParams()
  const router    = useRouter()
  const canonical = decodeURIComponent(params.canonical as string)

  const [profile,   setProfile]   = useState<BuyerProfile | null>(null)
  const [oems,      setOems]      = useState<string[]>([])
  const [contracts, setContracts] = useState<Contract[]>([])
  const [total,     setTotal]     = useState(0)
  const [summary,   setSummary]   = useState<{ total_gmv: number; min_unit_price: number | null; max_unit_price: number | null } | null>(null)
  const [page,      setPage]      = useState(1)
  const [loading,   setLoading]   = useState(true)
  const [profLoad,  setProfLoad]  = useState(true)
  const [selected,  setSelected]  = useState<Contract | null>(null)

  const [filters, setFilters] = useState({
    oem: "", year: "", q: "", sort: "date_desc"
  })
  const PAGE_SIZE = 50

  // Load buyer profile
  useEffect(() => {
    setProfLoad(true)
    fetch(`/api/fogging/buyers/${encodeURIComponent(canonical)}`)
      .then(r => r.json())
      .then((d: BuyerApiResponse) => {
        setProfile(d.profile)
        const oemList = (d.profile?.oem_spend ?? []).map(o => o.oem_canonical)
        setOems(oemList)
      })
      .finally(() => setProfLoad(false))
  }, [canonical])

  const loadContracts = useCallback(() => {
    setLoading(true)
    const qs = new URLSearchParams({
      buyer_canonical: canonical,
      page:            String(page),
      page_size:       String(PAGE_SIZE),
      sort:            filters.sort,
    })
    if (filters.oem)  qs.set('oem_canonical', filters.oem)
    if (filters.year) qs.set('year',           filters.year)
    if (filters.q)    qs.set('q',              filters.q)

    fetch(`/api/fogging/contracts?${qs}`)
      .then(r => r.json())
      .then(d => { setContracts(d.data ?? []); setTotal(d.total ?? 0); setSummary(d.summary ?? null) })
      .finally(() => setLoading(false))
  }, [canonical, page, filters])

  useEffect(() => { loadContracts() }, [loadContracts])
  useEffect(() => { setPage(1) }, [filters])

  const exportCsv = () => {
    const qs = new URLSearchParams({ buyer_canonical: canonical, export: 'csv', page_size: '5000' })
    if (filters.oem)  qs.set('oem_canonical', filters.oem)
    if (filters.year) qs.set('year',           filters.year)
    if (filters.q)    qs.set('q',              filters.q)
    window.open(`/api/fogging/contracts?${qs}`, '_blank')
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  if (profLoad) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading buyer profile…</div>
      </div>
    )
  }

  const tierColor = (t: string) =>
    t === 'A' ? 'bg-red-100 text-red-700' : t === 'B' ? 'bg-amber-100 text-amber-700' :
    t === 'C' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'

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
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-gray-900 leading-tight">
                {profile?.buyer_display_name ?? canonical}
              </h1>
              {profile?.is_anomalous && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">⚠ {profile.anomaly_reason}</span>
              )}
            </div>
            <div className="text-xs text-gray-400">Buyer 360 · {profile?.buyer_state ?? "—"} · {profile?.org_type ?? "—"}</div>
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
              { label: "Total Spend",  value: INR(profile.total_gmv, true) },
              { label: "Contracts",    value: profile.total_contracts.toString() },
              { label: "OEMs Used",    value: profile.oem_count.toString() },
              { label: "Last Purchase",value: `${profile.days_since_last}d ago` },
              { label: "Opp Tier",     value: profile.opportunity_tier, tier: true },
              { label: "Score",        value: profile.opportunity_score.toString() },
            ].map(k => (
              <div key={k.label} className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="text-xs text-gray-400 mb-1">{k.label}</div>
                {k.tier
                  ? <div className={`inline-flex px-3 py-1 rounded-full text-sm font-bold ${tierColor(k.value)}`}>{k.value}</div>
                  : <div className="text-xl font-bold text-gray-900">{k.value}</div>
                }
              </div>
            ))}
          </div>
        )}

        {/* OEM spend breakdown */}
        {profile?.oem_spend && profile.oem_spend.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Procurement by OEM</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-100">
                    <th className="pb-2 text-left">OEM</th>
                    <th className="pb-2 text-right">GMV</th>
                    <th className="pb-2 text-right">Contracts</th>
                    <th className="pb-2 text-right">Share</th>
                    <th className="pb-2 text-right">Last</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {profile.oem_spend.map(o => (
                    <tr key={o.oem_canonical} className={o.is_100x ? "text-blue-700 font-medium" : ""}>
                      <td className="py-1.5 flex items-center gap-1.5">
                        {o.is_100x && <span className="text-xs bg-blue-100 text-blue-700 px-1 rounded">100X</span>}
                        <button onClick={() => setFilters(f => ({ ...f, oem: o.oem_canonical }))}
                          className="hover:underline text-left">{o.brand_name}</button>
                      </td>
                      <td className="py-1.5 text-right">{INR(o.gmv, true)}</td>
                      <td className="py-1.5 text-right text-gray-500">{o.contracts}</td>
                      <td className="py-1.5 text-right">{PCT(o.share_pct)}</td>
                      <td className="py-1.5 text-right text-gray-400">{fmt(o.last_contract)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Filter bar */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={filters.q}
                onChange={e => setFilters(f => ({ ...f, q: e.target.value }))}
                placeholder="Search model, GEMC#, seller…"
                className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select value={filters.oem} onChange={e => setFilters(f => ({ ...f, oem: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">All OEMs</option>
              {oems.map(o => <option key={o} value={o}>{o}</option>)}
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
              <option value="value_desc">Highest value</option>
              <option value="price_asc">Lowest price</option>
              <option value="price_desc">Highest price</option>
              <option value="oem_asc">OEM A–Z</option>
            </select>
            {(filters.oem || filters.year || filters.q) && (
              <button onClick={() => setFilters({ oem: "", year: "", q: "", sort: filters.sort })}
                className="text-sm text-gray-500 hover:text-gray-800 underline">Clear</button>
            )}
          </div>
          {summary && (
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500 pt-3 border-t border-gray-100">
              <span>Showing <strong className="text-gray-800">{total.toLocaleString()}</strong> contracts</span>
              <span>GMV <strong className="text-gray-800">{INR(summary.total_gmv, true)}</strong></span>
            </div>
          )}
        </div>

        {/* Contract table */}
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
                      <th className="px-4 py-3 text-left">OEM</th>
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
                        className={`hover:bg-gray-50 cursor-pointer transition-colors ${c.is_100x ? "bg-blue-50/50" : ""}`}
                        onClick={() => setSelected(c)}>
                        <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">{fmt(c.contract_date)}</td>
                        <td className="px-4 py-2.5 text-xs">
                          <span className={c.is_100x ? "font-semibold text-blue-700" : "text-gray-700"}>
                            {c.oem_short_brand ?? c.oem_canonical}
                          </span>
                          {c.is_100x && <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-1 rounded">100X</span>}
                        </td>
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
                            <button onClick={() => setSelected(c)}
                              className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs text-gray-700 transition-colors">
                              Detail
                            </button>
                            <a href={`https://mkp.gem.gov.in/GeM-Brochures/public/brochure/${c.gemc_no}`}
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
      </div>
    </div>
  )
}
