"use client"
import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, ExternalLink, MapPin, Phone, Mail, Building2, X, ChevronLeft, ChevronRight } from "lucide-react"

// ── Helpers ───────────────────────────────────────────────────────────────────
const INR = (v: number | null | undefined, cr = false) => {
  if (v == null) return "—"
  if (cr) {
    if (v >= 10_000_000) return `₹${(v / 10_000_000).toFixed(2)} Cr`
    if (v >= 100_000)    return `₹${(v / 100_000).toFixed(1)} L`
    return `₹${v.toLocaleString('en-IN')}`
  }
  return `₹${v.toLocaleString('en-IN')}`
}
const fmt = (d: string | Date | null | undefined) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : "—"
const daysAgo = (n: number | null | undefined) => {
  if (n == null) return "—"
  if (n === 0)   return "Today"
  if (n < 30)    return `${n}d ago`
  if (n < 365)   return `${Math.round(n / 30)}mo ago`
  return `${(n / 365).toFixed(1)}yr ago`
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface SellerProfile {
  seller_slug: string; seller_gst: string | null; seller_canonical: string
  seller_display_name: string; seller_name_raw: string | null
  seller_state: string | null; seller_state_code: string | null
  seller_address: string | null; seller_email: string | null
  seller_phone: string | null; seller_pincode: string | null
  seller_gem_id: string | null; seller_msme: string | null
  seller_msme_number: string | null; seller_gender: string | null
  is_reseller: boolean | null; is_oem_seller: boolean | null
  is_manufacturer: boolean | null; selling_as: string | null
  has_gst: boolean; is_100x_dealer: boolean
  total_gmv: number; total_contracts: number; average_contract_value: number
  buyers_served: number; states_served: number; oem_count: number; model_count: number
  first_contract_date: string | null; last_contract_date: string | null; days_since_last: number
  top_buyer: string | null; top_buyer_display: string | null
  top_oem: string | null; top_model: string | null; top_model_raw: string | null
  avg_unit_price: number | null; median_unit_price: number | null
  min_unit_price: number | null; max_unit_price: number | null; priced_contract_count: number
  oems_represented: OemItem[]; top_buyers: BuyerItem[]; models_sold: ModelItem[]
  yearly_gmv: YearItem[]
}

interface OemItem {
  oem_canonical: string; brand_name: string; gmv: number; contracts: number; is_100x: boolean
}
interface BuyerItem {
  buyer_canonical: string; buyer_display_name: string; buyer_state: string | null
  gmv: number; contracts: number; last_purchase: string | null
}
interface ModelItem {
  model_normalized: string; model_raw: string | null; oem_canonical: string
  gmv: number; contracts: number; avg_unit_price: number | null; median_unit_price: number | null
}
interface YearItem { year: number; gmv: number; contracts: number }

interface LiveContract {
  gemc_no: string; contract_date: string | null; contract_quarter: string | null
  buyer_display_name: string; buyer_state: string | null; org_type: string | null
  oem_canonical: string; oem_short_brand: string | null; model_raw: string | null
  contract_value_num: number | null; quantity: number | null; unit_price: number | null
  contract_status: string | null; has_unit_price: boolean
}

// ── Contract side panel ────────────────────────────────────────────────────────
function ContractPanel({ contract, onClose }: { contract: LiveContract; onClose: () => void }) {
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
          <div><div className="text-xs text-gray-400 mb-0.5">Buyer</div><div className="font-medium leading-tight text-xs">{contract.buyer_display_name}</div></div>
          <div><div className="text-xs text-gray-400 mb-0.5">State / Type</div><div className="text-sm">{contract.buyer_state ?? "—"} · {contract.org_type ?? "—"}</div></div>
          <div><div className="text-xs text-gray-400 mb-0.5">OEM / Brand</div><div className="font-medium">{contract.oem_short_brand ?? contract.oem_canonical ?? "—"}</div></div>
          <div><div className="text-xs text-gray-400 mb-0.5">Model</div><div className="font-medium text-xs leading-tight">{contract.model_raw ?? "—"}</div></div>
          <div><div className="text-xs text-gray-400 mb-0.5">Quantity</div><div className="font-medium">{contract.quantity ?? "—"}</div></div>
          <div><div className="text-xs text-gray-400 mb-0.5">Unit Price</div><div className="font-medium text-green-700">{INR(contract.unit_price)}</div></div>
        </div>
        <div className="border-t border-gray-100 pt-3 space-y-2">
          <div className="text-xs text-gray-400 uppercase tracking-wide">GeM Contract</div>
          <a href={gemUrl} target="_blank" rel="noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
            <ExternalLink size={15} /> Open on GeM Portal
          </a>
        </div>
        <div className="border-t border-gray-100 pt-3">
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">Embedded View</div>
          <iframe src={gemUrl} className="w-full h-64 border border-gray-200 rounded-lg bg-gray-50"
            title={`GeM ${contract.gemc_no}`} onError={() => {}} />
          <p className="text-xs text-gray-400 mt-1">If frame is blocked, use the button above.</p>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SellerPage() {
  const params = useParams()
  const router = useRouter()
  const slug   = decodeURIComponent(params.slug as string)

  const [data,     setData]     = useState<{ profile: SellerProfile; quarterly_trend: QuarterItem[]; recent_contracts: LiveContract[]; buyer_breakdown: BuyerBreak[] } | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState<LiveContract | null>(null)

  // Live contract table state
  const [liveContracts, setLiveContracts] = useState<LiveContract[]>([])
  const [liveTotal,     setLiveTotal]     = useState(0)
  const [liveLoading,   setLiveLoading]   = useState(true)
  const [livePage,      setLivePage]      = useState(1)
  const [liveFilters,   setLiveFilters]   = useState({ sort: "date_desc", year: "", q: "" })
  const PAGE_SIZE = 50

  useEffect(() => {
    setLoading(true)
    fetch(`/api/fogging/sellers/${encodeURIComponent(slug)}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) return
        setData(d)
      })
      .finally(() => setLoading(false))
  }, [slug])

  const loadLive = useCallback(() => {
    if (!data) return
    setLiveLoading(true)
    const gst  = data.profile.seller_gst
    const name = data.profile.seller_display_name
    const qs = new URLSearchParams({
      page: String(livePage), page_size: String(PAGE_SIZE), sort: liveFilters.sort
    })
    if (gst)              qs.set("seller_gst",  gst)
    else                  qs.set("seller_name", name)
    if (liveFilters.year) qs.set("year",        liveFilters.year)
    if (liveFilters.q)    qs.set("q",           liveFilters.q)

    fetch(`/api/fogging/contracts?${qs}`)
      .then(r => r.json())
      .then(d => { setLiveContracts(d.data ?? []); setLiveTotal(d.total ?? 0) })
      .finally(() => setLiveLoading(false))
  }, [data, livePage, liveFilters])

  useEffect(() => { if (data) loadLive() }, [loadLive, data])
  useEffect(() => { setLivePage(1) }, [liveFilters])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500 text-sm">Loading seller profile…</div>
      </div>
    )
  }

  if (!data || !data.profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-700 font-semibold">Seller not found</div>
          <div className="text-gray-400 text-sm mt-1 font-mono">{slug}</div>
          <button onClick={() => router.back()} className="mt-4 text-sm text-blue-600 hover:underline">← Go back</button>
        </div>
      </div>
    )
  }

  const { profile, quarterly_trend = [], buyer_breakdown = [] } = data
  const totalLivePages = Math.ceil(liveTotal / PAGE_SIZE)

  // Seller type tag
  const typeTag = profile.selling_as?.includes('OEM') && !profile.selling_as?.includes('Reseller')
    ? { label: "OEM Direct", cls: "bg-purple-100 text-purple-700" }
    : profile.selling_as?.includes('verified')
    ? { label: "Verified Reseller", cls: "bg-green-100 text-green-700" }
    : profile.selling_as
    ? { label: "Reseller", cls: "bg-orange-100 text-orange-700" }
    : null

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
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-gray-900 leading-tight">{profile.seller_display_name}</h1>
              {profile.is_100x_dealer && (
                <span className="shrink-0 text-xs bg-blue-600 text-white px-2 py-0.5 rounded font-medium">100X Dealer</span>
              )}
              {typeTag && (
                <span className={`shrink-0 text-xs px-2 py-0.5 rounded font-medium ${typeTag.cls}`}>{typeTag.label}</span>
              )}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              Seller 360 · Fogging Intelligence
              {profile.seller_gst && <span className="font-mono ml-2">{profile.seller_gst}</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">

        {/* ── 1. KPI Strip ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Total GMV",    value: INR(profile.total_gmv, true),                  sub: undefined },
            { label: "Contracts",    value: profile.total_contracts.toString(),             sub: `Avg ${INR(profile.average_contract_value, true)}` },
            { label: "Buyers Served",value: profile.buyers_served.toString(),               sub: `${profile.states_served} states` },
            { label: "OEM Brands",   value: profile.oem_count.toString(),                  sub: `${profile.model_count} models` },
            { label: "Median Price", value: INR(profile.median_unit_price),                 sub: profile.priced_contract_count ? `${profile.priced_contract_count} priced` : undefined },
            { label: "Last Contract",value: daysAgo(profile.days_since_last),              sub: fmt(profile.last_contract_date) },
          ].map(k => (
            <div key={k.label} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="text-xs text-gray-400 mb-1">{k.label}</div>
              <div className="text-xl font-bold text-gray-900">{k.value}</div>
              {k.sub && <div className="text-xs text-gray-400 mt-0.5">{k.sub}</div>}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Left column: Identity + OEM Portfolio ───────────────────────── */}
          <div className="space-y-4">
            {/* Identity card */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Seller Identity</div>
              <div className="space-y-2 text-sm">
                {profile.seller_state && (
                  <div className="flex items-start gap-2 text-gray-700">
                    <MapPin size={14} className="mt-0.5 shrink-0 text-gray-400" />
                    <div>
                      <span className="font-medium">{profile.seller_state}</span>
                      {profile.seller_pincode && <span className="text-gray-400 ml-1">— {profile.seller_pincode}</span>}
                      {profile.seller_address && <div className="text-xs text-gray-500 mt-0.5 leading-snug">{profile.seller_address}</div>}
                    </div>
                  </div>
                )}
                {profile.seller_phone && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <Phone size={14} className="shrink-0 text-gray-400" />
                    <a href={`tel:${profile.seller_phone}`} className="hover:text-blue-600 transition-colors">{profile.seller_phone}</a>
                  </div>
                )}
                {profile.seller_email && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <Mail size={14} className="shrink-0 text-gray-400" />
                    <a href={`mailto:${profile.seller_email}`} className="hover:text-blue-600 transition-colors text-xs break-all">{profile.seller_email}</a>
                  </div>
                )}
                {profile.seller_gem_id && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Building2 size={14} className="shrink-0 text-gray-400" />
                    <span className="text-xs font-mono">{profile.seller_gem_id}</span>
                  </div>
                )}
              </div>

              {/* Meta tags */}
              <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-2">
                {!profile.has_gst && (
                  <span className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded border border-red-100">No GSTIN</span>
                )}
                {profile.seller_msme && (
                  <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-100">
                    {profile.seller_msme === 'General' ? 'General' : `MSME · ${profile.seller_msme}`}
                  </span>
                )}
                {profile.is_oem_seller && (
                  <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-100">OEM</span>
                )}
                {profile.is_manufacturer && (
                  <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100">Manufacturer</span>
                )}
                {profile.is_reseller && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Reseller</span>
                )}
                {profile.is_100x_dealer && (
                  <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded">100X Dealer</span>
                )}
              </div>

              {/* First / last seen */}
              <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500 space-y-1">
                <div>First contract: <span className="font-medium text-gray-700">{fmt(profile.first_contract_date)}</span></div>
                <div>Last contract:  <span className="font-medium text-gray-700">{fmt(profile.last_contract_date)}</span></div>
              </div>
            </div>

            {/* ── 2. OEM Portfolio ─────────────────────────────────────────────── */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">OEM Portfolio</div>
              <div className="space-y-2">
                {(profile.oems_represented || []).map(o => {
                  const share = profile.total_gmv > 0 ? (o.gmv / profile.total_gmv * 100) : 0
                  return (
                    <div key={o.oem_canonical}
                      className="cursor-pointer hover:bg-gray-50 -mx-2 px-2 py-2 rounded-lg transition-colors"
                      onClick={() => router.push(`/admin/growth/fogging/oem/${encodeURIComponent(o.oem_canonical)}`)}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-xs text-gray-900">{o.brand_name || o.oem_canonical}</span>
                          {o.is_100x && <span className="text-xs bg-blue-600 text-white px-1.5 py-0 rounded">100X</span>}
                        </div>
                        <span className="text-xs text-gray-500">{o.contracts}c</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5 mb-0.5">
                        <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, share)}%` }} />
                      </div>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>{INR(o.gmv, true)}</span>
                        <span>{share.toFixed(1)}%</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* ── Middle column: Buyer Relationships + Pricing ─────────────────── */}
          <div className="space-y-4">
            {/* ── 3. Buyer Relationships ──────────────────────────────────────── */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Top Buyers <span className="normal-case text-gray-400 font-normal">({profile.buyers_served} total)</span>
              </div>
              <div className="space-y-2">
                {(buyer_breakdown.length > 0 ? buyer_breakdown : profile.top_buyers).slice(0, 12).map(b => {
                  const buyer = 'buyer_display_name' in b ? b.buyer_display_name : (b as BuyerItem).buyer_display_name
                  const buyerGmv = 'gmv' in b ? b.gmv : 0
                  const buyerCnt = 'contracts' in b ? (b as BuyerItem).contracts : ('cnt' in b ? (b as unknown as { cnt: number }).cnt : 0)
                  const buyerState = 'buyer_state' in b ? b.buyer_state : null
                  const buyerCanonical = 'buyer_canonical' in b
                    ? (b as BuyerItem).buyer_canonical
                    : ('_id' in b ? (b as unknown as { _id: string })._id : '')
                  const share = profile.total_gmv > 0 ? (buyerGmv / profile.total_gmv * 100) : 0
                  return (
                    <div key={buyerCanonical}
                      className="cursor-pointer hover:bg-gray-50 -mx-2 px-2 py-2 rounded-lg transition-colors"
                      onClick={() => router.push(`/admin/growth/fogging/buyer/${encodeURIComponent(buyerCanonical)}`)}>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="text-xs font-medium text-gray-900 leading-snug flex-1 min-w-0 truncate">{buyer}</div>
                        <div className="shrink-0 text-right">
                          <div className="text-xs font-semibold text-gray-800">{INR(buyerGmv, true)}</div>
                          <div className="text-xs text-gray-400">{buyerCnt}c</div>
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1">
                        <div className="bg-emerald-400 h-1 rounded-full" style={{ width: `${Math.min(100, share)}%` }} />
                      </div>
                      {buyerState && <div className="text-xs text-gray-400 mt-0.5">{buyerState}</div>}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── 5. Pricing History ───────────────────────────────────────────── */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Pricing History</div>
              {profile.priced_contract_count === 0 ? (
                <div className="text-xs text-gray-400 py-2">No unit-priced contracts available.</div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Median Price",  value: INR(profile.median_unit_price) },
                    { label: "Average Price", value: INR(profile.avg_unit_price)    },
                    { label: "Lowest Price",  value: INR(profile.min_unit_price)    },
                    { label: "Highest Price", value: INR(profile.max_unit_price)    },
                  ].map(k => (
                    <div key={k.label} className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs text-gray-400 mb-1">{k.label}</div>
                      <div className="font-bold text-gray-900">{k.value}</div>
                    </div>
                  ))}
                  <div className="col-span-2 text-xs text-gray-400 pt-1 border-t border-gray-100">
                    Based on {profile.priced_contract_count} of {profile.total_contracts} contracts with unit price data
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Right column: Model Portfolio + Timeline ──────────────────────── */}
          <div className="space-y-4">
            {/* ── 4. Model Portfolio ───────────────────────────────────────────── */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
                Models Sold <span className="normal-case text-gray-400 font-normal">({profile.model_count} total)</span>
              </div>
              <div className="space-y-2">
                {(profile.models_sold || []).slice(0, 12).map(m => {
                  const share = profile.total_gmv > 0 ? (m.gmv / profile.total_gmv * 100) : 0
                  return (
                    <div key={m.model_normalized}
                      className="cursor-pointer hover:bg-gray-50 -mx-2 px-2 py-2 rounded-lg transition-colors"
                      onClick={() => router.push(`/admin/growth/fogging/model/${encodeURIComponent(m.model_normalized)}`)}>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="text-xs font-medium text-gray-900 leading-snug flex-1 min-w-0">
                          <div className="truncate">{m.model_raw || m.model_normalized}</div>
                          <div className="text-xs text-gray-400 font-normal">{m.oem_canonical}</div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-xs font-semibold text-gray-800">{INR(m.gmv, true)}</div>
                          <div className="text-xs text-gray-400">{m.contracts}c</div>
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1 mb-0.5">
                        <div className="bg-amber-400 h-1 rounded-full" style={{ width: `${Math.min(100, share)}%` }} />
                      </div>
                      {m.median_unit_price && (
                        <div className="text-xs text-gray-400">P50 {INR(m.median_unit_price)}</div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── 6. Contract Timeline (Yearly GMV) ─────────────────────────── */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Annual Activity</div>
              {profile.yearly_gmv?.length === 0 ? (
                <div className="text-xs text-gray-400">No yearly data.</div>
              ) : (
                <div className="space-y-2">
                  {(profile.yearly_gmv || []).slice().reverse().map(y => {
                    const maxGmv = Math.max(...(profile.yearly_gmv || []).map(x => x.gmv), 1)
                    const pct    = (y.gmv / maxGmv * 100)
                    return (
                      <div key={y.year}>
                        <div className="flex justify-between text-xs text-gray-700 mb-1">
                          <span className="font-medium">{y.year}</span>
                          <span className="text-gray-500">{y.contracts}c · {INR(y.gmv, true)}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div className="bg-violet-400 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── 6b. Quarterly Trend Table ─────────────────────────────────────── */}
        {quarterly_trend.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Quarterly Trend</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 border-b border-gray-100">
                    <th className="py-2 text-left">Quarter</th>
                    <th className="py-2 text-right">Contracts</th>
                    <th className="py-2 text-right">GMV</th>
                    <th className="py-2 text-right">Buyers</th>
                    <th className="py-2 text-right">OEMs</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {quarterly_trend.slice().reverse().map((q: QuarterItem) => (
                    <tr key={q._id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-2 font-mono text-xs text-gray-700">{q._id}</td>
                      <td className="py-2 text-right text-xs">{q.cnt}</td>
                      <td className="py-2 text-right text-xs font-medium">{INR(q.gmv, true)}</td>
                      <td className="py-2 text-right text-xs">{q.buyer_count}</td>
                      <td className="py-2 text-right text-xs">{q.oem_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── 7. Live Contract Table ────────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              All Contracts <span className="normal-case text-gray-400 font-normal">({liveTotal.toLocaleString()})</span>
            </div>
            <div className="flex items-center gap-2">
              <select value={liveFilters.year}
                onChange={e => setLiveFilters(f => ({ ...f, year: e.target.value }))}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option value="">All Years</option>
                {[2026,2025,2024,2023,2022,2021,2020,2019].map(y =>
                  <option key={y} value={y}>{y}</option>)}
              </select>
              <select value={liveFilters.sort}
                onChange={e => setLiveFilters(f => ({ ...f, sort: e.target.value }))}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option value="date_desc">Newest first</option>
                <option value="date_asc">Oldest first</option>
                <option value="value_desc">Highest value</option>
                <option value="value_asc">Lowest value</option>
              </select>
            </div>
          </div>

          {liveLoading ? (
            <div className="py-12 text-center text-gray-400 text-sm">Loading contracts…</div>
          ) : liveContracts.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">No contracts found.</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr className="text-xs text-gray-500 uppercase tracking-wide">
                      <th className="px-4 py-3 text-left">Date</th>
                      <th className="px-4 py-3 text-left">Buyer</th>
                      <th className="px-3 py-3 text-left">State</th>
                      <th className="px-4 py-3 text-left">OEM · Model</th>
                      <th className="px-3 py-3 text-right">Qty</th>
                      <th className="px-3 py-3 text-right">Unit ₹</th>
                      <th className="px-3 py-3 text-right">Value</th>
                      <th className="px-3 py-3 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {liveContracts.map(c => (
                      <tr key={c.gemc_no}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => setSelected(c)}>
                        <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">{fmt(c.contract_date)}</td>
                        <td className="px-4 py-2.5 max-w-xs">
                          <div className="font-medium text-gray-900 truncate text-xs leading-tight">{c.buyer_display_name}</div>
                          {c.org_type && <div className="text-xs text-gray-400">{c.org_type}</div>}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-gray-500 whitespace-nowrap">{c.buyer_state ?? "—"}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-700 max-w-52">
                          <div className="text-xs text-gray-500 font-medium">{c.oem_short_brand ?? c.oem_canonical}</div>
                          <div className="truncate text-gray-800">{c.model_raw ?? "—"}</div>
                        </td>
                        <td className="px-3 py-2.5 text-right text-xs">{c.quantity ?? "—"}</td>
                        <td className="px-3 py-2.5 text-right text-xs font-medium text-green-700">{INR(c.unit_price)}</td>
                        <td className="px-3 py-2.5 text-right text-xs font-semibold">{INR(c.contract_value_num, true)}</td>
                        <td className="px-3 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => setSelected(c)}
                              className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs text-gray-700 transition-colors">
                              Detail
                            </button>
                            <a href={`https://mkp.gem.gov.in/GeM-Brochures/public/brochure/${c.gemc_no}`}
                              target="_blank" rel="noreferrer"
                              className="px-2 py-1 bg-blue-50 hover:bg-blue-100 rounded text-xs text-blue-700 transition-colors flex items-center gap-0.5"
                              onClick={e => e.stopPropagation()}>
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
                <span>Page {livePage} of {totalLivePages} · {liveTotal.toLocaleString()} contracts</span>
                <div className="flex items-center gap-2">
                  <button disabled={livePage <= 1} onClick={() => setLivePage(p => p - 1)}
                    className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30">
                    <ChevronLeft size={14} />
                  </button>
                  {Array.from({ length: Math.min(5, totalLivePages) }, (_, i) => {
                    const start = Math.max(1, Math.min(livePage - 2, totalLivePages - 4))
                    return start + i
                  }).map(n => (
                    <button key={n} onClick={() => setLivePage(n)}
                      className={`w-7 h-7 rounded text-xs transition-colors ${n === livePage ? "bg-blue-600 text-white" : "hover:bg-gray-100"}`}>
                      {n}
                    </button>
                  ))}
                  <button disabled={livePage >= totalLivePages} onClick={() => setLivePage(p => p + 1)}
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

// Extra type for quarterly trend items from the API
interface QuarterItem {
  _id: string; cnt: number; gmv: number; buyer_count: number; oem_count: number
}
interface BuyerBreak {
  _id: string; buyer_display_name: string; buyer_state: string | null; gmv: number; contracts: number; cnt: number
}
