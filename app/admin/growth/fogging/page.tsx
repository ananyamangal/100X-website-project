"use client"
import { useEffect, useState, useCallback } from "react"
import {
  BarChart3, Target, TrendingUp, Calendar, LayoutDashboard,
  RefreshCw, Download, ChevronDown, ChevronUp, X, ExternalLink,
  AlertCircle, CheckCircle, Clock, Flame,
} from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────────────

interface OemRow {
  oem_canonical:        string
  brand_name:           string
  is_100x:              boolean
  total_contracts:      number
  total_gmv:            number
  buyer_count:          number
  state_count:          number
  market_share_gmv:     number
  market_share_contracts: number
  avg_unit_price:       number | null
  median_unit_price:    number | null
  min_unit_price:       number | null
  max_unit_price:       number | null
  quarterly:            { quarter: string; cnt: number; gmv: number }[]
  last_seen:            string | null
}

interface BuyerRow {
  buyer_canonical:    string
  buyer_display_name: string
  buyer_state:        string | null
  org_type:           string | null
  total_contracts:    number
  total_gmv:          number
  days_since_last:    number
  oem_count:          number
  oems_purchased:     string[]
  purchased_100x:     boolean
  purchased_neptune:  boolean
  purchased_instafog: boolean
  year_count:         number
  active_years:       number[]
  opportunity_score:  number
  opportunity_tier:   "A" | "B" | "C" | "D"
  opportunity_reasons: string[]
  forecast_next_month:   number | null
  forecast_next_quarter: string | null
  forecast_next_year:    number | null
  forecast_confidence:   string
  forecast_days_until:   number | null
  purchase_months:       number[]
}

interface PriceGroup {
  group:     string | number
  label:     string | null
  count:     number
  gmv:       number
  price_avg: number | null
  price_min: number | null
  price_max: number | null
  price_p50: number | null
}

interface QuoteAdvisor {
  market:           { min: number | null; p25: number | null; p50: number | null; p75: number | null; max: number | null; avg: number | null }
  quote_band:       { low: number | null; mid: number | null; high: number | null; label: string }
  competitor_data:  { oem_canonical: string; brand: string; contract_count: number; price_p50: number | null }[]
  recommendation:   string
  data_points:      number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const INR = (n: number | null | undefined, cr = false) => {
  if (n == null) return "—"
  if (cr && n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`
  return `₹${Math.round(n).toLocaleString()}`
}
const PCT  = (n: number) => `${n.toFixed(1)}%`
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]

const TIER_COLOR: Record<string, string> = {
  A: "bg-red-100 text-red-700 font-bold",
  B: "bg-amber-100 text-amber-700",
  C: "bg-gray-100 text-gray-600",
  D: "bg-gray-50 text-gray-400",
}
const CONF_ICON: Record<string, string> = {
  high: "🟢", medium: "🟡", low: "🔴",
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-lg border p-4 ${accent ? "border-blue-200 bg-blue-50" : "border-gray-200 bg-white"}`}>
      <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</div>
      <div className={`text-2xl font-bold ${accent ? "text-blue-700" : "text-gray-900"}`}>{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  )
}

function Spinner() {
  return (
    <div className="flex items-center justify-center p-12">
      <RefreshCw size={24} className="animate-spin text-gray-400" />
    </div>
  )
}

// ─── Tab: Executive Overview ──────────────────────────────────────────────────

function OverviewTab() {
  const [oems,     setOems]     = useState<OemRow[]>([])
  const [buyers,   setBuyers]   = useState<BuyerRow[]>([])
  const [forecast, setForecast] = useState<BuyerRow[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    Promise.all([
      fetch("/api/fogging/oems").then(r => r.json()),
      fetch("/api/fogging/buyers?opportunity_tier_in=A,B&page_size=5").then(r => r.json()),
      fetch("/api/fogging/forecast?window=30&page_size=5").then(r => r.json()),
    ]).then(([o, b, f]) => {
      setOems(o.data || [])
      setBuyers(b.data || [])
      setForecast(f.data || [])
    }).finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />

  const totalGmv       = oems.reduce((a, o) => a + (o.total_gmv || 0), 0)
  const totalContracts = oems.reduce((a, o) => a + (o.total_contracts || 0), 0)
  const entry100x      = oems.find(o => o.is_100x)
  const neptune        = oems.find(o => o.oem_canonical === "NEPTUNE")

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="Market GMV"        value={INR(totalGmv, true)} sub="1,418 contracts" />
        <KpiCard label="Active Buyers"     value={oems.reduce((a, o) => a + o.buyer_count, 0).toString()} sub="27 states" />
        <KpiCard label="Active OEMs"       value={oems.length.toString()} />
        <KpiCard label="100X Share"        value={PCT(entry100x?.market_share_gmv || 0)} sub={INR(entry100x?.total_gmv, true)} accent />
        <KpiCard label="Neptune Share"     value={PCT(neptune?.market_share_gmv || 0)} sub="#1 OEM" />
        <KpiCard label="Tier A Targets"    value={buyers.length.toString()} sub="top opportunities" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* OEM league table */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="font-semibold text-gray-800">OEM Market Share</span>
            <span className="text-xs text-gray-400">by GMV</span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="px-4 py-2 text-left">OEM</th>
                <th className="px-3 py-2 text-right">GMV</th>
                <th className="px-3 py-2 text-right">Share</th>
                <th className="px-3 py-2 text-right">Buyers</th>
              </tr>
            </thead>
            <tbody>
              {oems.slice(0, 8).map(o => (
                <tr key={o.oem_canonical} className={`border-t border-gray-50 hover:bg-gray-50 ${o.is_100x ? "bg-blue-50" : ""}`}>
                  <td className="px-4 py-2 font-medium">
                    {o.brand_name}
                    {o.is_100x && <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-1 rounded">100X</span>}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-600">{INR(o.total_gmv, true)}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <div className="w-12 bg-gray-100 rounded-full h-1.5">
                        <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, o.market_share_gmv * 4)}%` }} />
                      </div>
                      <span className="text-gray-600 text-xs w-10 text-right">{PCT(o.market_share_gmv)}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right text-gray-500">{o.buyer_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Top opportunities */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="font-semibold text-gray-800">Top Attack Opportunities</span>
            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Tier A</span>
          </div>
          <div className="divide-y divide-gray-50">
            {buyers.map(b => (
              <div key={b.buyer_canonical} className="px-4 py-3 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium text-gray-800 text-sm truncate max-w-xs">{b.buyer_display_name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {b.buyer_state} · {INR(b.total_gmv, true)} total spend · {b.days_since_last}d ago
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${TIER_COLOR[b.opportunity_tier]}`}>
                    {b.opportunity_score} {b.opportunity_tier}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="px-4 py-2 border-t border-gray-100 text-center">
            <button className="text-xs text-blue-600 hover:underline" onClick={() => {}}>
              View all attack surface →
            </button>
          </div>
        </div>
      </div>

      {/* 30-day forecast */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <Calendar size={14} className="text-amber-500" />
          <span className="font-semibold text-gray-800">30-Day Procurement Forecast</span>
          <span className="text-xs text-gray-400">(buyers predicted to purchase · not yet 100X customers)</span>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr>
              <th className="px-4 py-2 text-left">Buyer</th>
              <th className="px-3 py-2 text-left">State</th>
              <th className="px-3 py-2 text-right">Spend</th>
              <th className="px-3 py-2 text-center">Confidence</th>
              <th className="px-3 py-2 text-center">Predicted</th>
            </tr>
          </thead>
          <tbody>
            {forecast.map(b => (
              <tr key={b.buyer_canonical} className="border-t border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-2 font-medium truncate max-w-xs">{b.buyer_display_name}</td>
                <td className="px-3 py-2 text-gray-500">{b.buyer_state || "—"}</td>
                <td className="px-3 py-2 text-right">{INR(b.total_gmv, true)}</td>
                <td className="px-3 py-2 text-center">{CONF_ICON[b.forecast_confidence] || "⚪"} {b.forecast_confidence}</td>
                <td className="px-3 py-2 text-center text-gray-600">
                  {b.forecast_next_month ? MONTHS[b.forecast_next_month - 1] : "—"} {b.forecast_next_year}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Tab: Pricing Intelligence ────────────────────────────────────────────────

function PricingTab() {
  const [pricingView, setPricingView] = useState<"oem" | "model" | "buyer" | "state" | "quote">("oem")
  const [data,    setData]    = useState<PriceGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ oem: "", state: "", model: "", year: "" })

  // Quote Advisor state
  const [qaState, setQaState] = useState<string>("")
  const [qaOem,   setQaOem]   = useState<string>("")
  const [qaModel, setQaModel] = useState<string>("")
  const [qaQty,   setQaQty]   = useState<string>("")
  const [qaResult, setQaResult] = useState<QuoteAdvisor | null>(null)
  const [qaLoading, setQaLoading] = useState(false)

  const fetchPricing = useCallback(() => {
    if (pricingView === "quote") return
    setLoading(true)
    const groupBy = pricingView
    const qs = new URLSearchParams({ group_by: groupBy, ...Object.fromEntries(Object.entries(filters).filter(([,v]) => v)) })
    fetch(`/api/fogging/pricing?${qs}`)
      .then(r => r.json())
      .then(d => setData(d.data || []))
      .finally(() => setLoading(false))
  }, [pricingView, filters])

  useEffect(() => { fetchPricing() }, [fetchPricing])

  const runQuoteAdvisor = async () => {
    setQaLoading(true)
    const qs = new URLSearchParams()
    if (qaState)  qs.set("buyer_state",     qaState)
    if (qaOem)    qs.set("oem_canonical",   qaOem)
    if (qaModel)  qs.set("model_normalized", qaModel)
    if (qaQty)    qs.set("quantity",         qaQty)
    const r = await fetch(`/api/fogging/pricing/quote-advisor?${qs}`)
    setQaResult(await r.json())
    setQaLoading(false)
  }

  const views = [
    { id: "oem",   label: "OEM Pricing"    },
    { id: "model", label: "Model Pricing"  },
    { id: "buyer", label: "Buyer Pricing"  },
    { id: "state", label: "State Pricing"  },
    { id: "quote", label: "Quote Advisor"  },
  ] as const

  return (
    <div className="space-y-4">
      {/* View selector */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        {views.map(v => (
          <button
            key={v.id}
            onClick={() => setPricingView(v.id)}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
              pricingView === v.id ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {pricingView !== "quote" ? (
        /* Pricing table */
        loading ? <Spinner /> : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-2 text-left">
                    {pricingView === "oem" ? "OEM" : pricingView === "model" ? "Model" : pricingView === "state" ? "State" : "Buyer"}
                  </th>
                  <th className="px-3 py-2 text-right">Contracts</th>
                  <th className="px-3 py-2 text-right">Min</th>
                  <th className="px-3 py-2 text-right">P50</th>
                  <th className="px-3 py-2 text-right">Max</th>
                  <th className="px-3 py-2 text-right">Avg</th>
                </tr>
              </thead>
              <tbody>
                {data.map(row => (
                  <tr key={String(row.group)} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">{row.label || String(row.group)}</td>
                    <td className="px-3 py-2 text-right text-gray-500">{row.count}</td>
                    <td className="px-3 py-2 text-right text-green-600">{INR(row.price_min)}</td>
                    <td className="px-3 py-2 text-right font-semibold">{INR(row.price_p50)}</td>
                    <td className="px-3 py-2 text-right text-red-600">{INR(row.price_max)}</td>
                    <td className="px-3 py-2 text-right text-gray-600">{INR(row.price_avg)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        /* Quote Advisor */
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
          <div>
            <h3 className="font-semibold text-gray-800 mb-4">Quote Advisor</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Buyer State</label>
                <input className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm"
                  placeholder="e.g. Uttar Pradesh" value={qaState} onChange={e => setQaState(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Competitor OEM</label>
                <input className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm"
                  placeholder="e.g. NEPTUNE" value={qaOem} onChange={e => setQaOem(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Model (normalized)</label>
                <input className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm"
                  placeholder="e.g. neptune__npf_35" value={qaModel} onChange={e => setQaModel(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Quantity</label>
                <input type="number" className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm"
                  placeholder="e.g. 10" value={qaQty} onChange={e => setQaQty(e.target.value)} />
              </div>
            </div>
            <button onClick={runQuoteAdvisor} disabled={qaLoading}
              className="mt-3 px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {qaLoading ? "Calculating…" : "Get Quote Band"}
            </button>
          </div>

          {qaResult && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                <TrendingUp size={20} className="text-blue-600" />
                <div>
                  <div className="font-semibold text-blue-800">{qaResult.quote_band.label}</div>
                  <div className="text-xs text-blue-600">{qaResult.recommendation}</div>
                </div>
              </div>

              <div className="grid grid-cols-5 gap-2 text-center">
                {(["min","p25","p50","p75","max"] as const).map(k => (
                  <div key={k} className={`p-3 rounded-lg border ${k === "p50" ? "border-blue-200 bg-blue-50" : "border-gray-200 bg-gray-50"}`}>
                    <div className="text-xs text-gray-500 mb-1">{k.toUpperCase()}</div>
                    <div className={`font-bold text-sm ${k === "p50" ? "text-blue-700" : "text-gray-800"}`}>
                      {INR(qaResult.market[k])}
                    </div>
                  </div>
                ))}
              </div>

              {qaResult.competitor_data.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-600 mb-2 uppercase">Competitor Breakdown</div>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500">
                      <tr>
                        <th className="px-3 py-1.5 text-left">OEM</th>
                        <th className="px-3 py-1.5 text-right">Contracts</th>
                        <th className="px-3 py-1.5 text-right">P50 Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {qaResult.competitor_data.map(c => (
                        <tr key={c.oem_canonical} className="border-t border-gray-100">
                          <td className="px-3 py-1.5">{c.brand}</td>
                          <td className="px-3 py-1.5 text-right text-gray-500">{c.contract_count}</td>
                          <td className="px-3 py-1.5 text-right font-medium">{INR(c.price_p50)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Tab: OEM Market Share ────────────────────────────────────────────────────

function MarketShareTab() {
  const [oems,    setOems]    = useState<OemRow[]>([])
  const [detail,  setDetail]  = useState<OemRow | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/fogging/oems")
      .then(r => r.json())
      .then(d => setOems(d.data || []))
      .finally(() => setLoading(false))
  }, [])

  const totalGmv = oems.reduce((a, o) => a + (o.total_gmv || 0), 0)

  if (loading) return <Spinner />

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <KpiCard label="Total Market GMV"  value={INR(totalGmv, true)} />
        <KpiCard label="Active OEMs"       value={oems.length.toString()} />
        <KpiCard label="100X Share"        value={PCT(oems.find(o => o.is_100x)?.market_share_gmv || 0)} accent />
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 font-semibold text-gray-800 text-sm">
          OEM League Table — click any row for detail
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
            <tr>
              <th className="px-4 py-2 text-left">#</th>
              <th className="px-4 py-2 text-left">OEM</th>
              <th className="px-3 py-2 text-right">GMV</th>
              <th className="px-3 py-2 text-right">Share</th>
              <th className="px-3 py-2 text-right">Contracts</th>
              <th className="px-3 py-2 text-right">Buyers</th>
              <th className="px-3 py-2 text-right">States</th>
              <th className="px-3 py-2 text-right">P50 Price</th>
            </tr>
          </thead>
          <tbody>
            {oems.map((o, i) => (
              <tr
                key={o.oem_canonical}
                className={`border-t border-gray-50 cursor-pointer hover:bg-blue-50 ${o.is_100x ? "bg-blue-50 hover:bg-blue-100" : ""} ${detail?.oem_canonical === o.oem_canonical ? "ring-2 ring-inset ring-blue-300" : ""}`}
                onClick={() => setDetail(detail?.oem_canonical === o.oem_canonical ? null : o)}
              >
                <td className="px-4 py-2 text-gray-400">{i + 1}</td>
                <td className="px-4 py-2 font-medium">
                  {o.brand_name}
                  {o.is_100x && <span className="ml-1 text-xs bg-blue-500 text-white px-1 rounded">100X</span>}
                </td>
                <td className="px-3 py-2 text-right">{INR(o.total_gmv, true)}</td>
                <td className="px-3 py-2 text-right">
                  <span className="inline-flex items-center gap-1">
                    <span className="inline-block bg-blue-500 h-1.5 rounded"
                      style={{ width: `${Math.max(2, Math.min(60, o.market_share_gmv * 2.4))}px` }} />
                    {PCT(o.market_share_gmv)}
                  </span>
                </td>
                <td className="px-3 py-2 text-right text-gray-600">{o.total_contracts}</td>
                <td className="px-3 py-2 text-right text-gray-600">{o.buyer_count}</td>
                <td className="px-3 py-2 text-right text-gray-600">{o.state_count}</td>
                <td className="px-3 py-2 text-right font-medium">{INR(o.median_unit_price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detail && (
        <div className="bg-white border border-blue-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-gray-800">{detail.brand_name} — detail</span>
            <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3 text-sm">
            <div><div className="text-xs text-gray-400">GMV</div><div className="font-bold">{INR(detail.total_gmv, true)}</div></div>
            <div><div className="text-xs text-gray-400">Contracts</div><div className="font-bold">{detail.total_contracts}</div></div>
            <div><div className="text-xs text-gray-400">Buyers</div><div className="font-bold">{detail.buyer_count}</div></div>
            <div><div className="text-xs text-gray-400">States</div><div className="font-bold">{detail.state_count}</div></div>
            <div><div className="text-xs text-gray-400">Min Price</div><div className="font-bold text-green-600">{INR(detail.min_unit_price)}</div></div>
            <div><div className="text-xs text-gray-400">Max Price</div><div className="font-bold text-red-600">{INR(detail.max_unit_price)}</div></div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-2">Quarterly GMV trend</div>
            <div className="flex gap-1 items-end h-16">
              {detail.quarterly?.slice(-8).map(q => {
                const maxGmv = Math.max(...(detail.quarterly?.map(x => x.gmv) || [1]))
                const pct    = Math.max(4, (q.gmv / maxGmv) * 100)
                return (
                  <div key={q.quarter} className="flex-1 flex flex-col items-center gap-0.5">
                    <div className="w-full bg-blue-400 rounded-t" style={{ height: `${pct}%`, minHeight: "4px" }} title={`${q.quarter}: ${INR(q.gmv, true)}`} />
                    <div className="text-gray-400 rotate-90 origin-center" style={{ fontSize: "9px" }}>{q.quarter?.slice(5)}</div>
                  </div>
                )
              })}
            </div>
          </div>
          <a href={`/api/fogging/oems/${encodeURIComponent(detail.oem_canonical)}`} target="_blank" rel="noreferrer"
            className="text-xs text-blue-600 hover:underline flex items-center gap-1">
            View full JSON detail <ExternalLink size={10} />
          </a>
        </div>
      )}
    </div>
  )
}

// ─── Tab: Buyer Attack Surface ────────────────────────────────────────────────

function AttackSurfaceTab() {
  const [buyers,   setBuyers]   = useState<BuyerRow[]>([])
  const [total,    setTotal]    = useState(0)
  const [meta,     setMeta]     = useState<Record<string, number>>({})
  const [loading,  setLoading]  = useState(true)
  const [filters,  setFilters]  = useState({ tier: "A,B", neptune: false, instafog: false, state: "", days: "" })
  const [detail,   setDetail]   = useState<BuyerRow | null>(null)
  const [page,     setPage]     = useState(1)

  const fetch100xBuyers = useCallback(() => {
    setLoading(true)
    const qs = new URLSearchParams({
      purchased_100x: "false",
      page: String(page),
      page_size: "50",
    })
    if (filters.tier)     qs.set("opportunity_tier_in", filters.tier)
    if (filters.neptune)  qs.set("purchased_neptune",   "true")
    if (filters.instafog) qs.set("purchased_instafog",  "true")
    if (filters.state)    qs.set("buyer_state",         filters.state)
    if (filters.days)     qs.set("days_since_max",      filters.days)

    fetch(`/api/fogging/buyers?${qs}`)
      .then(r => r.json())
      .then(d => {
        setBuyers(d.data || [])
        setTotal(d.total || 0)
        setMeta(d.meta || {})
      })
      .finally(() => setLoading(false))
  }, [filters, page])

  useEffect(() => { fetch100xBuyers() }, [fetch100xBuyers])

  return (
    <div className="space-y-4">
      {/* Metric strip */}
      <div className="grid grid-cols-4 gap-3">
        <KpiCard label="Not Buying 100X"   value={total.toString()} sub="of 275 total buyers" />
        <KpiCard label="Tier A Targets"    value={String(meta.A || 0)} sub="score 80+" accent />
        <KpiCard label="Tier B Targets"    value={String(meta.B || 0)} sub="score 60–79" />
        <KpiCard label="Potential GMV"     value={INR(meta.total_potential_gmv, true)} sub="combined spend" />
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-gray-500">Tier:</span>
        {["A", "B", "C", "A,B", "A,B,C"].map(t => (
          <button key={t} onClick={() => setFilters(f => ({ ...f, tier: t }))}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${filters.tier === t ? "bg-blue-600 text-white border-blue-600" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}>
            {t}
          </button>
        ))}
        <label className="flex items-center gap-1 text-xs text-gray-600">
          <input type="checkbox" checked={filters.neptune} onChange={e => setFilters(f => ({ ...f, neptune: e.target.checked }))} />
          Neptune buyers
        </label>
        <label className="flex items-center gap-1 text-xs text-gray-600">
          <input type="checkbox" checked={filters.instafog} onChange={e => setFilters(f => ({ ...f, instafog: e.target.checked }))} />
          INSTA FOG buyers
        </label>
        <input className="border border-gray-200 rounded px-2 py-1 text-xs" placeholder="State…"
          value={filters.state} onChange={e => setFilters(f => ({ ...f, state: e.target.value }))} />
        <input type="number" className="border border-gray-200 rounded px-2 py-1 text-xs w-20" placeholder="Active ≤Nd"
          value={filters.days} onChange={e => setFilters(f => ({ ...f, days: e.target.value }))} />
      </div>

      {loading ? <Spinner /> : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-2 text-left">Buyer</th>
                <th className="px-3 py-2 text-left">State</th>
                <th className="px-3 py-2 text-right">Spend</th>
                <th className="px-3 py-2 text-center">Last Buy</th>
                <th className="px-3 py-2 text-center">OEMs</th>
                <th className="px-3 py-2 text-center">Years</th>
                <th className="px-3 py-2 text-center">Score</th>
              </tr>
            </thead>
            <tbody>
              {buyers.map(b => (
                <tr key={b.buyer_canonical} className={`border-t border-gray-50 cursor-pointer hover:bg-blue-50 ${detail?.buyer_canonical === b.buyer_canonical ? "bg-blue-50" : ""}`}
                  onClick={() => setDetail(detail?.buyer_canonical === b.buyer_canonical ? null : b)}>
                  <td className="px-4 py-2 font-medium text-sm max-w-xs truncate">{b.buyer_display_name}</td>
                  <td className="px-3 py-2 text-gray-500 text-xs">{b.buyer_state || "—"}</td>
                  <td className="px-3 py-2 text-right">{INR(b.total_gmv, true)}</td>
                  <td className="px-3 py-2 text-center text-gray-500">
                    <span className={b.days_since_last <= 30 ? "text-green-600 font-medium" : b.days_since_last <= 90 ? "text-amber-600" : ""}>
                      {b.days_since_last}d
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">{b.oem_count}</td>
                  <td className="px-3 py-2 text-center">{b.year_count}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${TIER_COLOR[b.opportunity_tier]}`}>
                      {b.opportunity_score} {b.opportunity_tier}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>Showing {buyers.length} of {total}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-30">← Prev</button>
              <span>Page {page}</span>
              <button disabled={buyers.length < 50} onClick={() => setPage(p => p + 1)} className="px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-30">Next →</button>
            </div>
          </div>
        </div>
      )}

      {/* Buyer detail panel */}
      {detail && (
        <div className="bg-white border border-blue-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold">{detail.buyer_display_name}</span>
            <button onClick={() => setDetail(null)}><X size={16} className="text-gray-400" /></button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div><div className="text-xs text-gray-400">State / Type</div><div>{detail.buyer_state} · {detail.org_type}</div></div>
            <div><div className="text-xs text-gray-400">Total Spend</div><div className="font-bold">{INR(detail.total_gmv, true)}</div></div>
            <div><div className="text-xs text-gray-400">Last Purchase</div><div className={detail.days_since_last <= 30 ? "text-green-600 font-medium" : ""}>{detail.days_since_last} days ago</div></div>
            <div><div className="text-xs text-gray-400">Opportunity</div><div className={`font-bold ${TIER_COLOR[detail.opportunity_tier]} px-2 py-0.5 rounded-full inline-block`}>{detail.opportunity_score} {detail.opportunity_tier}</div></div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">Opportunity Reasons:</div>
            <ul className="text-xs space-y-0.5">
              {detail.opportunity_reasons.map((r, i) => <li key={i} className="text-gray-600">• {r}</li>)}
            </ul>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">OEMs purchased: {detail.oems_purchased.join(", ")}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-0.5">Forecast: {detail.forecast_next_month ? MONTHS[detail.forecast_next_month - 1] : "—"} {detail.forecast_next_year} ({detail.forecast_confidence} confidence)</div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tab: Procurement Forecasting ────────────────────────────────────────────

function ForecastTab() {
  const [window, setWindow]   = useState(30)
  const [data,   setData]     = useState<BuyerRow[]>([])
  const [meta,   setMeta]     = useState<Record<string, number | string>>({})
  const [loading,setLoading]  = useState(true)
  const [conf,   setConf]     = useState("high")
  const [detail, setDetail]   = useState<BuyerRow | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    const qs = new URLSearchParams({ window: String(window), confidence: conf, page_size: "100" })
    fetch(`/api/fogging/forecast?${qs}`)
      .then(r => r.json())
      .then(d => { setData(d.data || []); setMeta(d.meta || {}) })
      .finally(() => setLoading(false))
  }, [window, conf])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        <KpiCard label="Buyers in Window" value={String(meta.total_buyers || 0)} sub={`next ${window} days`} />
        <KpiCard label="High Confidence"  value={String(meta.high_confidence_count || 0)} />
        <KpiCard label="Tier A in Window" value={String(meta.tier_a_count || 0)} accent />
        <KpiCard label="Potential GMV"    value={INR(Number(meta.total_potential_gmv), true)} sub="combined buyer spend" />
      </div>

      <div className="flex gap-2 items-center">
        <span className="text-xs text-gray-500">Forecast window:</span>
        {[30, 60, 90].map(w => (
          <button key={w} onClick={() => setWindow(w)}
            className={`text-xs px-3 py-1 rounded-full border ${window === w ? "bg-blue-600 text-white border-blue-600" : "border-gray-300 text-gray-600"}`}>
            {w}d
          </button>
        ))}
        <span className="text-xs text-gray-500 ml-3">Confidence:</span>
        {["high","medium","low"].map(c => (
          <button key={c} onClick={() => setConf(c)}
            className={`text-xs px-3 py-1 rounded-full border ${conf === c ? "bg-amber-500 text-white border-amber-500" : "border-gray-300 text-gray-600"}`}>
            {CONF_ICON[c]} {c}
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-4 py-2 text-left">Buyer</th>
                <th className="px-3 py-2 text-left">State</th>
                <th className="px-3 py-2 text-right">Spend</th>
                <th className="px-3 py-2 text-center">Predicted</th>
                <th className="px-3 py-2 text-center">Confidence</th>
                <th className="px-3 py-2 text-center">Score</th>
                <th className="px-3 py-2 text-center">Last Buy</th>
              </tr>
            </thead>
            <tbody>
              {data.map(b => (
                <tr key={b.buyer_canonical}
                  className={`border-t border-gray-50 cursor-pointer hover:bg-amber-50 ${detail?.buyer_canonical === b.buyer_canonical ? "bg-amber-50" : ""}`}
                  onClick={() => setDetail(detail?.buyer_canonical === b.buyer_canonical ? null : b)}>
                  <td className="px-4 py-2 font-medium text-sm max-w-xs truncate">{b.buyer_display_name}</td>
                  <td className="px-3 py-2 text-gray-500 text-xs">{b.buyer_state || "—"}</td>
                  <td className="px-3 py-2 text-right">{INR(b.total_gmv, true)}</td>
                  <td className="px-3 py-2 text-center font-medium">
                    {b.forecast_next_month ? MONTHS[b.forecast_next_month - 1] : "—"} {b.forecast_next_year}
                  </td>
                  <td className="px-3 py-2 text-center">{CONF_ICON[b.forecast_confidence]} {b.forecast_confidence}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${TIER_COLOR[b.opportunity_tier]}`}>{b.opportunity_tier}</span>
                  </td>
                  <td className="px-3 py-2 text-center text-gray-500">{b.days_since_last}d</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {detail && (
        <div className="bg-white border border-amber-200 rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold">{detail.buyer_display_name}</span>
            <button onClick={() => setDetail(null)}><X size={16} className="text-gray-400" /></button>
          </div>
          <div className="text-xs text-gray-600">
            Historical purchase months: {(detail.purchase_months || []).map(m => MONTHS[m - 1]).join(", ") || "—"}
          </div>
          <div className="text-xs text-gray-600">
            Active years: {(detail.active_years || []).join(", ")} · OEMs: {(detail.oems_purchased || []).join(", ")}
          </div>
          <div className="text-xs text-gray-600">
            Next predicted: {detail.forecast_next_month ? MONTHS[detail.forecast_next_month - 1] : "—"} {detail.forecast_next_year}
            {detail.forecast_days_until != null && ` (${detail.forecast_days_until} days from now)`}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type TabId = "overview" | "pricing" | "market" | "buyers" | "forecast"

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "overview",  label: "Executive Overview",     icon: <LayoutDashboard size={14} /> },
  { id: "pricing",   label: "Pricing Intelligence",   icon: <TrendingUp size={14} /> },
  { id: "market",    label: "OEM Market Share",        icon: <BarChart3 size={14} /> },
  { id: "buyers",    label: "Buyer Attack Surface",    icon: <Target size={14} /> },
  { id: "forecast",  label: "Procurement Forecast",   icon: <Calendar size={14} /> },
]

export default function FoggingIntelligencePage() {
  const [tab, setTab] = useState<TabId>("overview")

  return (
    <div className="flex flex-col min-h-0 flex-1">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Flame size={18} className="text-orange-500" />
              Fogging Intelligence
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              1,418 contracts · ₹75.08 Cr GMV · 34 OEMs · 275 buyers · 27 states
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a href="/api/fogging/oems" target="_blank" rel="noreferrer"
              className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
              <ExternalLink size={12} /> API
            </a>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mt-4 -mb-4 pb-0 border-t border-gray-100 pt-3">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-md transition-colors border-b-2 -mb-px ${
                tab === t.id
                  ? "border-blue-600 text-blue-700 bg-blue-50"
                  : "border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto p-6">
        {tab === "overview"  && <OverviewTab />}
        {tab === "pricing"   && <PricingTab />}
        {tab === "market"    && <MarketShareTab />}
        {tab === "buyers"    && <AttackSurfaceTab />}
        {tab === "forecast"  && <ForecastTab />}
      </div>
    </div>
  )
}
