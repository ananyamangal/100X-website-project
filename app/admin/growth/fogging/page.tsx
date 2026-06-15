"use client"
import { useEffect, useState, useCallback, useRef } from "react"
import Link from "next/link"
import {
  BarChart3, Target, TrendingUp, Calendar, Users, Building2,
  RefreshCw, Download, X, ExternalLink, Flame, Search,
  ChevronRight, AlertCircle, Store,
} from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────────────

interface OemRow {
  oem_canonical:          string
  brand_name:             string
  is_100x:                boolean
  total_contracts:        number
  total_gmv:              number
  buyer_count:            number
  state_count:            number
  market_share_gmv:       number
  market_share_contracts: number
  avg_unit_price:         number | null
  median_unit_price:      number | null
  min_unit_price:         number | null
  max_unit_price:         number | null
  quarterly:              { quarter: string; cnt: number; gmv: number }[]
  last_seen:              string | null
}

interface OemSpendEntry {
  oem_canonical: string
  brand_name:    string
  is_100x:       boolean
  gmv:           number
  contracts:     number
  share_pct:     number
  last_contract: string | null
}

interface ForecastSlot {
  month:         number
  year:          number
  quarter:       string
  days_until:    number
  confidence:    string
  predicted_gmv: number
}

interface BuyerRow {
  buyer_canonical:       string
  buyer_display_name:    string
  buyer_state:           string | null
  org_type:              string | null
  ministry:              string | null
  total_contracts:       number
  total_gmv:             number
  avg_contract_value:    number
  days_since_last:       number
  oem_count:             number
  year_count:            number
  oems_purchased:        string[]
  oem_spend:             OemSpendEntry[]
  primary_incumbent:     string | null
  purchased_100x:        boolean
  purchased_neptune:     boolean
  purchased_pulsfog:     boolean
  purchased_sse:         boolean
  purchased_instafog:    boolean
  purchased_foggers:     boolean
  purchase_months:       number[]
  active_years:          number[]
  peak_months:           number[]
  peak_quarter:          string | null
  opportunity_score:     number
  opportunity_tier:      "A" | "B" | "C" | "D"
  opportunity_reasons:   string[]
  estimated_opportunity: number | null
  action_priority:       string | null
  recommended_action:    string | null
  urgency:               string | null
  is_anomalous:          boolean
  anomaly_reason:        string | null
  rank:                  number | null
  forecast_next_month:   number | null
  forecast_next_quarter: string | null
  forecast_next_year:    number | null
  forecast_confidence:   string
  forecast_days_until:   number | null
  forecast_6mo:          ForecastSlot[]
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
  market:          { min: number | null; p25: number | null; p50: number | null; p75: number | null; max: number | null; avg: number | null }
  quote_band:      { low: number | null; mid: number | null; high: number | null; label: string }
  competitor_data: { oem_canonical: string; brand: string; contract_count: number; price_p50: number | null }[]
  recommendation:  string
  data_points:     number
}

interface OemDetail {
  profile:          OemRow
  state_breakdown:  { _id: string; cnt: number; gmv: number }[]
  buyer_breakdown:  { _id: string; name: string; cnt: number; gmv: number }[]
  model_breakdown:  { _id: string; model: string; cnt: number; gmv: number }[]
  quarterly_trend:  { _id: string; cnt: number; gmv: number; buyer_count: number }[]
  recent_contracts: Record<string, unknown>[]
}

interface Contract {
  gemc_no:            string
  contract_date:      string | null
  contract_quarter:   string | null
  oem_canonical:      string
  oem_short_brand:    string
  model_raw:          string | null
  contract_value_num: number | null
  quantity:           number | null
  unit_price:         number | null
  contract_status:    string | null
  buying_mode:        string | null
}

interface BuyerDetail {
  profile:     BuyerRow
  contracts:   Contract[]
  oem_history: { oem_canonical: string; first: string; last: string; count: number; gmv: number }[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const INR = (n: number | null | undefined, cr = false) => {
  if (n == null) return "—"
  if (cr && n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`
  return `₹${Math.round(n).toLocaleString()}`
}
const PCT   = (n: number) => `${n.toFixed(1)}%`
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
const MONTH_FULL = ["January","February","March","April","May","June","July","August","September","October","November","December"]

const TIER_COLOR: Record<string, string> = {
  A: "bg-red-100 text-red-700 font-bold",
  B: "bg-amber-100 text-amber-700",
  C: "bg-gray-100 text-gray-600",
  D: "bg-gray-50 text-gray-400",
}
const URGENCY_COLOR: Record<string, string> = {
  hot:      "bg-red-100 text-red-700",
  warm:     "bg-amber-100 text-amber-700",
  upcoming: "bg-blue-100 text-blue-700",
  distant:  "bg-gray-100 text-gray-500",
  stale:    "bg-gray-50 text-gray-400",
}
const CONF_ICON: Record<string, string> = { high: "🟢", medium: "🟡", low: "🔴" }

const OEM_COLORS: Record<string, string> = {
  "NEPTUNE":                  "bg-blue-500",
  "SSE SAI SHREE ENTERPRISES":"bg-green-500",
  "PULSFOG":                  "bg-purple-500",
  "INSTA FOG":                "bg-orange-500",
  "FOGGERS":                  "bg-pink-500",
  "100X CIRCLE":              "bg-sky-500",
}
const oemColor = (c: string) => OEM_COLORS[c] ?? "bg-gray-400"

// ─── Shared components ────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${accent ? "border-blue-200 bg-blue-50" : "border-gray-200 bg-white"}`}>
      <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</div>
      <div className={`text-xl font-bold ${accent ? "text-blue-700" : "text-gray-900"}`}>{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
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

function TierPill({ tier, score }: { tier: string; score?: number }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${TIER_COLOR[tier] ?? "bg-gray-100 text-gray-600"}`}>
      {score != null ? `${score} ` : ""}{tier}
    </span>
  )
}

// ─── OEM Spend stacked bar ────────────────────────────────────────────────────

function OemSpendBar({ spend }: { spend: OemSpendEntry[] }) {
  if (!spend || spend.length === 0) return <span className="text-xs text-gray-400">—</span>
  return (
    <div className="space-y-1">
      <div className="flex h-3 rounded overflow-hidden gap-px">
        {spend.map(o => (
          <div
            key={o.oem_canonical}
            className={`${oemColor(o.oem_canonical)} transition-all`}
            style={{ width: `${o.share_pct}%` }}
            title={`${o.brand_name}: ${PCT(o.share_pct)} (${INR(o.gmv, true)})`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {spend.map(o => (
          <span key={o.oem_canonical} className="text-xs text-gray-500 flex items-center gap-0.5">
            <span className={`inline-block w-2 h-2 rounded-full ${oemColor(o.oem_canonical)}`} />
            {o.brand_name.length > 12 ? o.brand_name.slice(0, 12) + "…" : o.brand_name} {PCT(o.share_pct)}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── TAB 1: Market Share ──────────────────────────────────────────────────────

function MarketShareTab({ oems }: { oems: OemRow[] }) {
  const [detail, setDetail] = useState<OemRow | null>(null)

  if (!oems.length) return <Spinner />

  const totalGmv = oems.reduce((a, o) => a + (o.total_gmv || 0), 0)
  const entry100x = oems.find(o => o.is_100x)
  const neptune   = oems.find(o => o.oem_canonical === "NEPTUNE")
  const rank100x  = oems.findIndex(o => o.is_100x) + 1

  return (
    <div className="space-y-4">
      {/* Competitive position strip */}
      {entry100x && neptune && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex flex-wrap gap-6 text-sm">
          <span><span className="text-blue-500 font-semibold">100X rank:</span> #{rank100x} of {oems.length} OEMs</span>
          <span><span className="text-blue-500 font-semibold">100X GMV:</span> {INR(entry100x.total_gmv, true)} ({PCT(entry100x.market_share_gmv)} share)</span>
          <span><span className="text-blue-500 font-semibold">Neptune leads by:</span> {INR(neptune.total_gmv - entry100x.total_gmv, true)}</span>
          <span><span className="text-blue-500 font-semibold">Gap in contracts:</span> {neptune.total_contracts - entry100x.total_contracts} contracts</span>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <KpiCard label="Total Market GMV"  value={INR(totalGmv, true)} />
        <KpiCard label="Active OEMs"       value={oems.length.toString()} />
        <KpiCard label="100X Share"        value={PCT(entry100x?.market_share_gmv || 0)} accent />
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
                  <Link
                    href={`/admin/growth/fogging/oem/${encodeURIComponent(o.oem_canonical)}`}
                    onClick={e => e.stopPropagation()}
                    className="hover:text-blue-700 hover:underline transition-colors">
                    {o.brand_name}
                  </Link>
                  {o.is_100x && <span className="ml-1 text-xs bg-blue-500 text-white px-1 rounded">100X</span>}
                </td>
                <td className="px-3 py-2 text-right">{INR(o.total_gmv, true)}</td>
                <td className="px-3 py-2 text-right">
                  <span className="inline-flex items-center gap-1">
                    <span className="inline-block bg-blue-500 h-1.5 rounded" style={{ width: `${Math.max(2, Math.min(60, o.market_share_gmv * 2.4))}px` }} />
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
          <Link href={`/admin/growth/fogging/oem/${encodeURIComponent(detail.oem_canonical)}`}
            className="text-xs text-blue-600 hover:underline flex items-center gap-1">
            View OEM 360 — contracts · buyers · models <ChevronRight size={12} />
          </Link>
        </div>
      )}
    </div>
  )
}

// ─── TAB 2: Attack Accounts ───────────────────────────────────────────────────

const INCUMBENT_FLAGS: Record<string, string> = {
  "NEPTUNE":   "purchased_neptune",
  "SSE":       "purchased_sse",
  "PULSFOG":   "purchased_pulsfog",
  "INSTA FOG": "purchased_instafog",
  "FOGGERS":   "purchased_foggers",
}

function AttackAccountsTab() {
  const [buyers,  setBuyers]  = useState<BuyerRow[]>([])
  const [total,   setTotal]   = useState(0)
  const [meta,    setMeta]    = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [detail,  setDetail]  = useState<BuyerRow | null>(null)
  const [page,    setPage]    = useState(1)
  const [filters, setFilters] = useState({
    tier: "A,B", incumbent: "", state: "", days: "", view: "50"
  })

  const load = useCallback(() => {
    setLoading(true)
    const qs = new URLSearchParams({
      purchased_100x: "false",
      page:           String(page),
      page_size:      filters.view === "20" ? "20" : filters.view === "100" ? "100" : "50",
    })
    if (filters.tier)      qs.set("opportunity_tier_in", filters.tier)
    if (filters.state)     qs.set("buyer_state", filters.state)
    if (filters.days)      qs.set("days_since_max", filters.days)
    if (filters.incumbent) {
      const flag = INCUMBENT_FLAGS[filters.incumbent]
      if (flag) qs.set(flag, "true")
    }
    fetch(`/api/fogging/buyers?${qs}`)
      .then(r => r.json())
      .then(d => { setBuyers(d.data || []); setTotal(d.total || 0); setMeta(d.meta?.tiers || {}) })
      .finally(() => setLoading(false))
  }, [filters, page])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [filters])

  const exportUrl = () => {
    const qs = new URLSearchParams({ limit: "100" })
    if (filters.tier)      qs.set("tier", filters.tier)
    if (filters.state)     qs.set("state", filters.state)
    if (filters.days)      qs.set("days_max", filters.days)
    if (filters.incumbent) qs.set("incumbent", filters.incumbent)
    return `/api/fogging/attack-accounts/export?${qs}`
  }

  return (
    <div className="space-y-4">
      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-3">
        <KpiCard label="Not Buying 100X" value={total.toString()} sub="of 274 total buyers" />
        <KpiCard label="Tier A Targets"  value={String(meta.A || 0)} sub="score 80+"  accent />
        <KpiCard label="Tier B Targets"  value={String(meta.B || 0)} sub="score 60–79" />
        <KpiCard label="Tier C Targets"  value={String(meta.C || 0)} sub="score 40–59" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-gray-500 font-medium">Tier:</span>
        {["A", "B", "C", "A,B", "A,B,C"].map(t => (
          <button key={t} onClick={() => setFilters(f => ({ ...f, tier: t }))}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${filters.tier === t ? "bg-blue-600 text-white border-blue-600" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}>
            {t}
          </button>
        ))}
        <span className="text-xs text-gray-500 font-medium ml-2">Incumbent:</span>
        {["", "NEPTUNE", "SSE", "PULSFOG", "INSTA FOG", "FOGGERS"].map(inc => (
          <button key={inc} onClick={() => setFilters(f => ({ ...f, incumbent: inc }))}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${filters.incumbent === inc ? "bg-gray-800 text-white border-gray-800" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}>
            {inc || "All"}
          </button>
        ))}
        <input className="border border-gray-200 rounded px-2 py-1 text-xs ml-2" placeholder="State…"
          value={filters.state} onChange={e => setFilters(f => ({ ...f, state: e.target.value }))} />
        <input type="number" className="border border-gray-200 rounded px-2 py-1 text-xs w-20" placeholder="≤Nd active"
          value={filters.days} onChange={e => setFilters(f => ({ ...f, days: e.target.value }))} />
        <span className="text-xs text-gray-500 font-medium ml-2">View:</span>
        {["20","50","100"].map(v => (
          <button key={v} onClick={() => setFilters(f => ({ ...f, view: v }))}
            className={`text-xs px-2 py-1 rounded border ${filters.view === v ? "bg-gray-800 text-white border-gray-800" : "border-gray-300 text-gray-600"}`}>
            Top {v}
          </button>
        ))}
        <a href={exportUrl()} download className="ml-auto flex items-center gap-1 text-xs px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700">
          <Download size={12} /> Export CSV
        </a>
      </div>

      {loading ? <Spinner /> : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th className="px-3 py-2 text-right w-8">#</th>
                <th className="px-4 py-2 text-left">Buyer</th>
                <th className="px-3 py-2 text-left">State</th>
                <th className="px-3 py-2 text-right">Spend</th>
                <th className="px-3 py-2 text-center">Last Buy</th>
                <th className="px-3 py-2 text-left">Incumbent</th>
                <th className="px-3 py-2 text-center">Score</th>
                <th className="px-3 py-2 text-right">Est Opp</th>
              </tr>
            </thead>
            <tbody>
              {buyers.map((b, idx) => (
                <tr key={b.buyer_canonical}
                  className={`border-t border-gray-50 cursor-pointer hover:bg-blue-50 ${detail?.buyer_canonical === b.buyer_canonical ? "bg-blue-50" : ""} ${b.is_anomalous ? "opacity-60" : ""}`}
                  onClick={() => setDetail(detail?.buyer_canonical === b.buyer_canonical ? null : b)}>
                  <td className="px-3 py-2 text-right text-gray-400 text-xs">
                    {b.rank ?? ((page - 1) * parseInt(filters.view) + idx + 1)}
                  </td>
                  <td className="px-4 py-2 font-medium text-sm max-w-xs">
                    <Link
                      href={`/admin/growth/fogging/buyer/${encodeURIComponent(b.buyer_canonical)}`}
                      onClick={e => e.stopPropagation()}
                      className="truncate block hover:text-blue-700 hover:underline transition-colors">
                      {b.buyer_display_name}
                    </Link>
                    {b.is_anomalous && <span className="text-xs text-amber-600">⚠ investigate identity</span>}
                  </td>
                  <td className="px-3 py-2 text-gray-500 text-xs">{b.buyer_state || "—"}</td>
                  <td className="px-3 py-2 text-right">{INR(b.total_gmv, true)}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={b.days_since_last <= 30 ? "text-green-600 font-medium" : b.days_since_last <= 90 ? "text-amber-600" : "text-gray-500"}>
                      {b.days_since_last}d
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-600">
                    {b.primary_incumbent
                      ? <span className="flex items-center gap-1">
                          <span className={`w-2 h-2 rounded-full ${oemColor(b.primary_incumbent)}`} />
                          {b.primary_incumbent.length > 14 ? b.primary_incumbent.slice(0,14)+"…" : b.primary_incumbent}
                        </span>
                      : b.oems_purchased[0] || "—"}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <TierPill tier={b.opportunity_tier} score={b.opportunity_score} />
                  </td>
                  <td className="px-3 py-2 text-right text-xs text-gray-600">
                    {b.estimated_opportunity ? INR(b.estimated_opportunity, true) : "—"}
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
              <button disabled={buyers.length < parseInt(filters.view)} onClick={() => setPage(p => p + 1)} className="px-2 py-1 rounded hover:bg-gray-100 disabled:opacity-30">Next →</button>
            </div>
          </div>
        </div>
      )}

      {/* Detail panel */}
      {detail && (
        <div className="bg-white border border-blue-200 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-semibold text-gray-800">{detail.buyer_display_name}</span>
              {detail.is_anomalous && (
                <span className="ml-2 text-xs text-amber-600 flex items-center gap-1 inline-flex">
                  <AlertCircle size={12} /> {detail.anomaly_reason === 'truncated_name' ? 'Truncated name — investigate raw GEMC' : detail.anomaly_reason === 'masked_gem_buyer' ? 'GeM-masked buyer — identity not resolvable from GeM data' : 'Anomalous buyer name'}
                </span>
              )}
            </div>
            <button onClick={() => setDetail(null)}><X size={16} className="text-gray-400" /></button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div><div className="text-xs text-gray-400">State / Type</div><div>{detail.buyer_state} · {detail.org_type || "—"}</div></div>
            <div><div className="text-xs text-gray-400">Total Spend</div><div className="font-bold">{INR(detail.total_gmv, true)}</div></div>
            <div><div className="text-xs text-gray-400">Last Purchase</div>
              <div className={detail.days_since_last <= 30 ? "text-green-600 font-medium" : ""}>{detail.days_since_last}d ago</div>
            </div>
            <div><div className="text-xs text-gray-400">Score</div>
              <TierPill tier={detail.opportunity_tier} score={detail.opportunity_score} />
            </div>
          </div>

          {/* Incumbent OEM spend breakdown */}
          {detail.oem_spend && detail.oem_spend.length > 0 && (
            <div>
              <div className="text-xs text-gray-500 font-medium uppercase mb-2">Incumbent OEM spend breakdown</div>
              <OemSpendBar spend={detail.oem_spend} />
              <table className="w-full text-xs mt-2">
                <thead className="text-gray-400">
                  <tr>
                    <th className="text-left py-1">OEM</th>
                    <th className="text-right py-1">GMV</th>
                    <th className="text-right py-1">Contracts</th>
                    <th className="text-right py-1">Share</th>
                    <th className="text-right py-1">Last</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.oem_spend.map(o => (
                    <tr key={o.oem_canonical} className={`border-t border-gray-50 ${o.is_100x ? "text-blue-700 font-medium" : ""}`}>
                      <td className="py-1 flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-full ${oemColor(o.oem_canonical)}`} />
                        {o.brand_name}
                        {o.is_100x && <span className="text-xs bg-blue-100 px-1 rounded">100X</span>}
                      </td>
                      <td className="text-right py-1">{INR(o.gmv, true)}</td>
                      <td className="text-right py-1 text-gray-500">{o.contracts}</td>
                      <td className="text-right py-1">{PCT(o.share_pct)}</td>
                      <td className="text-right py-1 text-gray-400">
                        {o.last_contract ? new Date(o.last_contract).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Opportunity reasons */}
          <div>
            <div className="text-xs text-gray-500 font-medium uppercase mb-1">Score breakdown</div>
            <ul className="text-xs space-y-0.5">
              {detail.opportunity_reasons.map((r, i) => <li key={i} className="text-gray-600">• {r}</li>)}
            </ul>
          </div>

          {/* Recommended action */}
          {detail.recommended_action && (
            <div className={`text-xs px-3 py-2 rounded ${detail.action_priority === 'immediate' ? 'bg-red-50 text-red-700' : detail.action_priority === 'nurture' ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-600'}`}>
              <span className="font-medium uppercase mr-2">{detail.action_priority}</span>
              {detail.recommended_action}
            </div>
          )}

          {/* Forecast */}
          <div className="text-xs text-gray-500">
            Next predicted: <strong>{detail.forecast_next_month ? MONTHS[detail.forecast_next_month - 1] : "—"} {detail.forecast_next_year}</strong>
            {" "}({detail.forecast_confidence} confidence
            {detail.forecast_days_until != null ? `, ${detail.forecast_days_until}d` : ""})
          </div>

          <Link href={`/admin/growth/fogging/buyer/${encodeURIComponent(detail.buyer_canonical)}`}
            className="text-xs text-blue-600 hover:underline flex items-center gap-1">
            View Buyer 360 — full procurement history <ChevronRight size={12} />
          </Link>
        </div>
      )}
    </div>
  )
}

// ─── TAB 3: Pricing Intelligence ──────────────────────────────────────────────

function PricingTab() {
  const [pricingView, setPricingView] = useState<"oem"|"model"|"buyer"|"state"|"quote">("oem")
  const [data,    setData]    = useState<PriceGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ oem: "", state: "", model: "", year: "" })
  const [qaState, setQaState] = useState("")
  const [qaOem,   setQaOem]   = useState("")
  const [qaModel, setQaModel] = useState("")
  const [qaQty,   setQaQty]   = useState("")
  const [qaResult, setQaResult] = useState<QuoteAdvisor | null>(null)
  const [qaLoading, setQaLoading] = useState(false)

  const fetchPricing = useCallback(() => {
    if (pricingView === "quote") return
    setLoading(true)
    const qs = new URLSearchParams({
      group_by: pricingView,
      ...Object.fromEntries(Object.entries(filters).filter(([,v]) => v))
    })
    fetch(`/api/fogging/pricing?${qs}`)
      .then(r => r.json())
      .then(d => setData(d.data || []))
      .finally(() => setLoading(false))
  }, [pricingView, filters])

  useEffect(() => { fetchPricing() }, [fetchPricing])

  const runQuoteAdvisor = async () => {
    setQaLoading(true)
    const qs = new URLSearchParams()
    if (qaState)  qs.set("buyer_state",      qaState)
    if (qaOem)    qs.set("oem_canonical",    qaOem)
    if (qaModel)  qs.set("model_normalized", qaModel)
    if (qaQty)    qs.set("quantity",         qaQty)
    const r = await fetch(`/api/fogging/pricing/quote-advisor?${qs}`)
    setQaResult(await r.json())
    setQaLoading(false)
  }

  const views = [
    { id: "oem",   label: "OEM Pricing"   },
    { id: "model", label: "Model Pricing" },
    { id: "buyer", label: "Buyer Pricing" },
    { id: "state", label: "State Pricing" },
    { id: "quote", label: "Quote Advisor" },
  ] as const

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        {views.map(v => (
          <button key={v.id} onClick={() => setPricingView(v.id)}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${pricingView === v.id ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}>
            {v.label}
          </button>
        ))}
      </div>

      {pricingView !== "quote" ? (
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
                    <td className="px-4 py-2 font-medium">
                      {pricingView === "model" && row.group ? (
                        <Link href={`/admin/growth/fogging/model/${encodeURIComponent(String(row.group))}`}
                          className="text-blue-700 hover:underline">
                          {row.label || String(row.group)}
                        </Link>
                      ) : pricingView === "oem" && row.group ? (
                        <Link href={`/admin/growth/fogging/oem/${encodeURIComponent(String(row.group))}`}
                          className="hover:text-blue-700 hover:underline">
                          {row.label || String(row.group)}
                        </Link>
                      ) : (
                        row.label || String(row.group)
                      )}
                    </td>
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
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
          <h3 className="font-semibold text-gray-800">Quote Advisor</h3>
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
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {qaLoading ? "Calculating…" : "Get Quote Band"}
          </button>

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

// ─── TAB 4: Forecasts ─────────────────────────────────────────────────────────

interface CalendarCell { total: number; tier_A: number; tier_B: number; tier_C: number }

function ForecastTab() {
  const [window,  setWindow]  = useState(30)
  const [data,    setData]    = useState<BuyerRow[]>([])
  const [meta,    setMeta]    = useState<Record<string, number | string>>({})
  const [loading, setLoading] = useState(true)
  const [conf,    setConf]    = useState("high,medium")
  const [detail,  setDetail]  = useState<BuyerRow | null>(null)
  const [calData, setCalData] = useState<Map<string, CalendarCell>>(new Map())
  const [calLoading, setCalLoading] = useState(true)
  const [calSelected, setCalSelected] = useState<string | null>(null)

  // Build next 6 month labels
  const monthSlots = (() => {
    const now = new Date(); const slots = []
    for (let i = 1; i <= 6; i++) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1))
      slots.push({ month: d.getUTCMonth() + 1, year: d.getUTCFullYear(), label: MONTHS[d.getUTCMonth()] + " " + d.getUTCFullYear() })
    }
    return slots
  })()

  useEffect(() => {
    // Load 6-month calendar data concurrently
    setCalLoading(true)
    Promise.all(
      monthSlots.map(s =>
        fetch(`/api/fogging/forecast/calendar?month=${s.month}&year=${s.year}`)
          .then(r => r.json())
          .then(d => ({ key: `${s.year}-${s.month}`, summary: d.summary as CalendarCell }))
          .catch(() => ({ key: `${s.year}-${s.month}`, summary: { total: 0, tier_A: 0, tier_B: 0, tier_C: 0 } }))
      )
    ).then(results => {
      const m = new Map<string, CalendarCell>()
      for (const r of results) m.set(r.key, r.summary)
      setCalData(m)
    }).finally(() => setCalLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadMainTable = useCallback(() => {
    setLoading(true)
    const qs = new URLSearchParams({ window: String(window), page_size: "100" })
    if (conf !== "all") qs.set("confidence", conf.split(",")[0] || "high")
    fetch(`/api/fogging/forecast?${qs}`)
      .then(r => r.json())
      .then(d => { setData(d.data || []); setMeta(d.meta || {}) })
      .finally(() => setLoading(false))
  }, [window, conf])

  useEffect(() => { loadMainTable() }, [loadMainTable])

  const loadCalendarMonth = (month: number, year: number) => {
    const key = `${year}-${month}`
    setCalSelected(calSelected === key ? null : key)
    if (calSelected !== key) {
      setLoading(true)
      fetch(`/api/fogging/forecast/calendar?month=${month}&year=${year}`)
        .then(r => r.json())
        .then(d => { setData(d.buyers || []); setMeta({ total_buyers: d.summary?.total, ...d.summary }) })
        .finally(() => setLoading(false))
    } else {
      loadMainTable()
    }
  }

  return (
    <div className="space-y-4">
      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-3">
        <KpiCard label="Buyers in Window" value={String(meta.total_buyers || 0)} sub={calSelected ? `in selected month` : `next ${window} days`} />
        <KpiCard label="High Confidence"  value={String(meta.high_confidence_count || 0)} />
        <KpiCard label="Tier A in Window" value={String(meta.tier_a_count || 0)} accent />
        <KpiCard label="Predicted GMV"    value={INR(Number(meta.total_potential_gmv), true)} sub="combined buyer spend" />
      </div>

      {/* 6-month calendar grid */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 font-semibold text-gray-800 text-sm">
          6-Month Procurement Calendar <span className="text-gray-400 font-normal text-xs ml-2">click a cell to filter the table below</span>
        </div>
        {calLoading ? (
          <div className="py-4 flex justify-center"><RefreshCw size={16} className="animate-spin text-gray-300" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-gray-500 w-20">Tier</th>
                  {monthSlots.map(s => (
                    <th key={s.label} className="px-3 py-2 text-center text-gray-600 font-medium">{s.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(["tier_A", "tier_B", "tier_C"] as const).map((tier, ti) => (
                  <tr key={tier} className="border-t border-gray-50">
                    <td className="px-4 py-2">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${TIER_COLOR["ABC"[ti]]}`}>Tier {"ABC"[ti]}</span>
                    </td>
                    {monthSlots.map(s => {
                      const key = `${s.year}-${s.month}`
                      const cell = calData.get(key)
                      const count = cell?.[tier] ?? 0
                      const isSelected = calSelected === key
                      return (
                        <td key={key} className="px-3 py-2 text-center">
                          <button
                            onClick={() => loadCalendarMonth(s.month, s.year)}
                            className={`w-10 h-8 rounded font-semibold transition-colors ${count === 0 ? "text-gray-300 cursor-default" : isSelected ? "bg-blue-600 text-white" : "bg-gray-100 hover:bg-blue-100 text-gray-700"}`}
                            disabled={count === 0}
                          >
                            {count || "—"}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Window / confidence controls */}
      {!calSelected && (
        <div className="flex gap-2 items-center">
          <span className="text-xs text-gray-500">Window:</span>
          {[30, 60, 90].map(w => (
            <button key={w} onClick={() => setWindow(w)}
              className={`text-xs px-3 py-1 rounded-full border ${window === w ? "bg-blue-600 text-white border-blue-600" : "border-gray-300 text-gray-600"}`}>
              {w}d
            </button>
          ))}
          <span className="text-xs text-gray-500 ml-3">Confidence:</span>
          {[["high","🟢 High only"],["high,medium","🟢🟡 High+Med"],["all","All"]].map(([c, label]) => (
            <button key={c} onClick={() => setConf(c)}
              className={`text-xs px-3 py-1 rounded-full border ${conf === c ? "bg-amber-500 text-white border-amber-500" : "border-gray-300 text-gray-600"}`}>
              {label}
            </button>
          ))}
          {calSelected && (
            <button onClick={() => { setCalSelected(null); loadMainTable() }}
              className="ml-auto text-xs text-blue-600 hover:underline">← Back to window view</button>
          )}
        </div>
      )}
      {calSelected && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-600">Showing buyers predicted in <strong>{MONTH_FULL[parseInt(calSelected.split("-")[1]) - 1]} {calSelected.split("-")[0]}</strong></span>
          <button onClick={() => { setCalSelected(null); loadMainTable() }} className="text-xs text-blue-600 hover:underline">← Back to window view</button>
        </div>
      )}

      {/* Buyer table */}
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
                <th className="px-3 py-2 text-center">Urgency</th>
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
                  <td className="px-3 py-2 text-center">{CONF_ICON[b.forecast_confidence] || "⚪"} {b.forecast_confidence}</td>
                  <td className="px-3 py-2 text-center">
                    {b.urgency
                      ? <span className={`text-xs px-1.5 py-0.5 rounded ${URGENCY_COLOR[b.urgency] ?? ""}`}>{b.urgency}</span>
                      : <span className="text-xs text-gray-400">{b.forecast_days_until != null ? `${b.forecast_days_until}d` : "—"}</span>}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <TierPill tier={b.opportunity_tier} />
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
          {detail.peak_months && detail.peak_months.length > 0 && (
            <div className="text-xs text-gray-600">Peak months: <strong>{detail.peak_months.map(m => MONTHS[m-1]).join(", ")}</strong></div>
          )}
          {detail.forecast_6mo && detail.forecast_6mo.length > 0 && (
            <div>
              <div className="text-xs text-gray-500 font-medium mb-1">6-month forecast horizon</div>
              <div className="flex gap-2 flex-wrap">
                {detail.forecast_6mo.map((s, i) => (
                  <div key={i} className={`text-xs px-2 py-1 rounded border ${s.confidence === 'high' ? 'border-green-200 bg-green-50' : s.confidence === 'medium' ? 'border-amber-200 bg-amber-50' : 'border-gray-200 bg-gray-50'}`}>
                    {MONTHS[s.month - 1]} {s.year} <span className="text-gray-400">({s.days_until}d)</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="text-xs text-gray-600">OEMs: {(detail.oems_purchased || []).join(", ")}</div>
        </div>
      )}
    </div>
  )
}

// ─── TAB 5: OEM Profiles ─────────────────────────────────────────────────────

function OemProfilesTab({ oems }: { oems: OemRow[] }) {
  const [selected, setSelected]   = useState<string | null>(null)
  const [detail,   setDetail]     = useState<OemDetail | null>(null)
  const [loading,  setDetailLoad] = useState(false)
  const [attackCount, setAttackCount] = useState<number | null>(null)

  const loadDetail = useCallback((oemCanonical: string) => {
    if (selected === oemCanonical) { setSelected(null); setDetail(null); return }
    setSelected(oemCanonical)
    setDetail(null)
    setAttackCount(null)
    setDetailLoad(true)

    // Determine the buyer flag for this OEM
    const flagMap: Record<string, string> = {
      "NEPTUNE":                  "purchased_neptune=true",
      "SSE SAI SHREE ENTERPRISES":"purchased_sse=true",
      "PULSFOG":                  "purchased_pulsfog=true",
      "INSTA FOG":                "purchased_instafog=true",
      "FOGGERS":                  "purchased_foggers=true",
    }
    const oemFlag = flagMap[oemCanonical]

    Promise.all([
      fetch(`/api/fogging/oems/${encodeURIComponent(oemCanonical)}`).then(r => r.json()),
      oemFlag
        ? fetch(`/api/fogging/buyers?purchased_100x=false&${oemFlag}&page_size=1`).then(r => r.json()).then(d => d.total ?? null)
        : Promise.resolve(null),
    ]).then(([det, cnt]) => {
      setDetail(det)
      setAttackCount(cnt)
    }).finally(() => setDetailLoad(false))
  }, [selected])

  if (!oems.length) return <Spinner />

  return (
    <div className="flex gap-4 h-full">
      {/* OEM list */}
      <div className="w-56 flex-shrink-0 bg-white border border-gray-200 rounded-lg overflow-hidden self-start">
        <div className="px-3 py-2 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase">OEMs by GMV</div>
        <div className="divide-y divide-gray-50 max-h-[70vh] overflow-y-auto">
          {oems.map((o, i) => (
            <button key={o.oem_canonical} onClick={() => loadDetail(o.oem_canonical)}
              className={`w-full text-left px-3 py-2.5 hover:bg-blue-50 transition-colors ${selected === o.oem_canonical ? "bg-blue-50 border-l-2 border-blue-500" : ""}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium truncate">
                  {o.brand_name}
                  {o.is_100x && <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-1 rounded">100X</span>}
                </span>
                <span className="text-xs text-gray-400 ml-1">#{i + 1}</span>
              </div>
              <div className="text-xs text-gray-400 mt-0.5">{INR(o.total_gmv, true)} · {o.total_contracts}c</div>
            </button>
          ))}
        </div>
      </div>

      {/* OEM detail */}
      <div className="flex-1 min-w-0">
        {!selected && (
          <div className="text-sm text-gray-400 text-center py-12">← Select an OEM to view its profile</div>
        )}
        {selected && loading && <Spinner />}
        {selected && !loading && detail && (
          <div className="space-y-4">
            {/* Header */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {detail.profile.brand_name}
                    {detail.profile.is_100x && <span className="ml-2 text-sm bg-blue-500 text-white px-2 py-0.5 rounded">100X</span>}
                  </h2>
                  <div className="text-xs text-gray-500 mt-0.5">
                    #{oems.findIndex(o => o.oem_canonical === selected) + 1} in market by GMV
                  </div>
                </div>
                <a href={`/api/fogging/oems/${encodeURIComponent(selected)}`} target="_blank" rel="noreferrer"
                  className="text-xs text-gray-400 hover:text-blue-600 flex items-center gap-1">
                  <ExternalLink size={12} /> Raw JSON
                </a>
              </div>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3 text-sm">
                <div><div className="text-xs text-gray-400">Total GMV</div><div className="font-bold">{INR(detail.profile.total_gmv, true)}</div></div>
                <div><div className="text-xs text-gray-400">Contracts</div><div className="font-bold">{detail.profile.total_contracts}</div></div>
                <div><div className="text-xs text-gray-400">Buyers</div><div className="font-bold">{detail.profile.buyer_count}</div></div>
                <div><div className="text-xs text-gray-400">States</div><div className="font-bold">{detail.profile.state_count}</div></div>
                <div><div className="text-xs text-gray-400">GMV Share</div><div className="font-bold">{PCT(detail.profile.market_share_gmv)}</div></div>
                <div><div className="text-xs text-gray-400">P50 Price</div><div className="font-bold">{INR(detail.profile.median_unit_price)}</div></div>
              </div>
              {/* Price band */}
              {detail.profile.min_unit_price != null && (
                <div className="mt-3 flex gap-4 text-xs">
                  <span className="text-green-600">Min: {INR(detail.profile.min_unit_price)}</span>
                  <span className="text-gray-600">P50: {INR(detail.profile.median_unit_price)}</span>
                  <span className="text-red-600">Max: {INR(detail.profile.max_unit_price)}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Top buyers */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-4 py-2 border-b border-gray-100 text-xs font-semibold text-gray-600 uppercase">Top Buyers by GMV</div>
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-400">
                    <tr>
                      <th className="px-3 py-1.5 text-left">Buyer</th>
                      <th className="px-3 py-1.5 text-right">GMV</th>
                      <th className="px-3 py-1.5 text-right">Contracts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.buyer_breakdown.slice(0, 10).map(b => (
                      <tr key={b._id} className="border-t border-gray-50 hover:bg-gray-50">
                        <td className="px-3 py-1.5 max-w-[160px] truncate" title={b.name}>{b.name}</td>
                        <td className="px-3 py-1.5 text-right">{INR(b.gmv, true)}</td>
                        <td className="px-3 py-1.5 text-right text-gray-400">{b.cnt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* State footprint */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-4 py-2 border-b border-gray-100 text-xs font-semibold text-gray-600 uppercase">Geographic Footprint</div>
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-400">
                    <tr>
                      <th className="px-3 py-1.5 text-left">State</th>
                      <th className="px-3 py-1.5 text-right">GMV</th>
                      <th className="px-3 py-1.5 text-right">Contracts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.state_breakdown.slice(0, 10).map(s => (
                      <tr key={s._id} className="border-t border-gray-50 hover:bg-gray-50">
                        <td className="px-3 py-1.5">{s._id || "—"}</td>
                        <td className="px-3 py-1.5 text-right">{INR(s.gmv, true)}</td>
                        <td className="px-3 py-1.5 text-right text-gray-400">{s.cnt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Models */}
            {detail.model_breakdown.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="px-4 py-2 border-b border-gray-100 text-xs font-semibold text-gray-600 uppercase">Top Models</div>
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 text-gray-400">
                    <tr>
                      <th className="px-3 py-1.5 text-left">Model</th>
                      <th className="px-3 py-1.5 text-right">GMV</th>
                      <th className="px-3 py-1.5 text-right">Contracts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.model_breakdown.slice(0, 8).map(m => (
                      <tr key={m._id} className="border-t border-gray-50">
                        <td className="px-3 py-1.5">{m.model || m._id || "—"}</td>
                        <td className="px-3 py-1.5 text-right">{INR(m.gmv, true)}</td>
                        <td className="px-3 py-1.5 text-right text-gray-400">{m.cnt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Quarterly trend */}
            {detail.quarterly_trend.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="text-xs font-semibold text-gray-600 uppercase mb-3">Quarterly GMV Trend</div>
                <div className="flex gap-1 items-end h-20">
                  {detail.quarterly_trend.slice(-10).map(q => {
                    const maxG = Math.max(...detail.quarterly_trend.map(x => x.gmv), 1)
                    const pct  = Math.max(4, (q.gmv / maxG) * 100)
                    return (
                      <div key={q._id} className="flex-1 flex flex-col items-center gap-0.5" title={`${q._id}: ${INR(q.gmv, true)}`}>
                        <div className="w-full bg-blue-400 rounded-t" style={{ height: `${pct}%`, minHeight: "4px" }} />
                        <div className="text-gray-400 rotate-90 origin-center" style={{ fontSize: "8px" }}>{q._id?.slice(5)}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Attack intel — only for non-100X OEMs */}
            {!detail.profile.is_100x && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-amber-800">Attack Intel</div>
                  {attackCount != null
                    ? <div className="text-xs text-amber-700 mt-0.5"><strong>{attackCount}</strong> buyers use {detail.profile.brand_name} and have NOT purchased 100X — these are your targets.</div>
                    : <div className="text-xs text-amber-700 mt-0.5">Buyers of {detail.profile.brand_name} who haven&apos;t bought 100X.</div>}
                </div>
                <a
                  href="#"
                  onClick={e => { e.preventDefault(); /* switch to attack tab with incumbent filter — handled by parent */ }}
                  className="text-xs px-3 py-1.5 bg-amber-600 text-white rounded hover:bg-amber-700 whitespace-nowrap"
                >
                  View in Attack Accounts →
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── TAB 6: Buyer Profiles ────────────────────────────────────────────────────

function BuyerProfilesTab() {
  const [query,      setQuery]    = useState("")
  const [results,    setResults]  = useState<BuyerRow[]>([])
  const [searching,  setSearching]= useState(false)
  const [selected,   setSelected] = useState<string | null>(null)
  const [detail,     setDetail]   = useState<BuyerDetail | null>(null)
  const [detLoading, setDetLoad]  = useState(false)
  const [showContracts, setShowContracts] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback((q: string) => {
    if (q.length < 2) { setResults([]); return }
    setSearching(true)
    fetch(`/api/fogging/buyers/search?q=${encodeURIComponent(q)}`)
      .then(r => r.json())
      .then(d => setResults(d.data || []))
      .finally(() => setSearching(false))
  }, [])

  const handleInput = (val: string) => {
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(val), 300)
  }

  const selectBuyer = (buyerCanonical: string) => {
    setSelected(buyerCanonical)
    setResults([])
    setQuery("")
    setDetail(null)
    setShowContracts(false)
    setDetLoad(true)
    fetch(`/api/fogging/buyers/${encodeURIComponent(buyerCanonical)}`)
      .then(r => r.json())
      .then(d => setDetail(d))
      .finally(() => setDetLoad(false))
  }

  const b = detail?.profile

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full border border-gray-300 rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search buyer name… (type 2+ chars)"
            value={query}
            onChange={e => handleInput(e.target.value)}
          />
          {searching && <RefreshCw size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />}
        </div>
        {results.length > 0 && (
          <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 mt-1 divide-y divide-gray-50">
            {results.map(r => (
              <button key={r.buyer_canonical} className="w-full text-left px-4 py-2.5 hover:bg-blue-50 flex items-center justify-between"
                onClick={() => selectBuyer(r.buyer_canonical)}>
                <div>
                  <div className="text-sm font-medium truncate max-w-md">{r.buyer_display_name}</div>
                  <div className="text-xs text-gray-400">{r.buyer_state} · {INR(r.total_gmv, true)} · {r.total_contracts} contracts</div>
                </div>
                <TierPill tier={r.opportunity_tier} score={r.opportunity_score} />
              </button>
            ))}
          </div>
        )}
      </div>

      {!selected && !detLoading && (
        <div className="text-sm text-gray-400 text-center py-16">
          Search for a buyer to see their full profile, OEM history, scoring breakdown, and contract log.
        </div>
      )}
      {detLoading && <Spinner />}

      {b && detail && (
        <div className="space-y-4">
          {/* Header */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">{b.buyer_display_name}</h2>
                <div className="text-xs text-gray-500 mt-0.5">
                  {b.buyer_state} · {b.org_type || "—"} · {b.ministry || "—"}
                </div>
              </div>
              {b.purchased_100x
                ? <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">100X CUSTOMER</span>
                : <TierPill tier={b.opportunity_tier} score={b.opportunity_score} />}
            </div>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3 text-sm mt-3">
              <div><div className="text-xs text-gray-400">Total Spend</div><div className="font-bold">{INR(b.total_gmv, true)}</div></div>
              <div><div className="text-xs text-gray-400">Contracts</div><div className="font-bold">{b.total_contracts}</div></div>
              <div><div className="text-xs text-gray-400">Avg Value</div><div className="font-bold">{INR(b.avg_contract_value)}</div></div>
              <div><div className="text-xs text-gray-400">OEMs Used</div><div className="font-bold">{b.oem_count}</div></div>
              <div><div className="text-xs text-gray-400">Years Active</div><div className="font-bold">{b.year_count} ({(b.active_years || []).join(", ")})</div></div>
              <div><div className="text-xs text-gray-400">Last Purchase</div><div className={b.days_since_last <= 30 ? "font-bold text-green-600" : "font-bold"}>{b.days_since_last}d ago</div></div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* OEM History */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-4 py-2 border-b border-gray-100 text-xs font-semibold text-gray-600 uppercase">OEM Purchase History</div>
              {b.oem_spend && b.oem_spend.length > 0 ? (
                <>
                  <div className="p-3"><OemSpendBar spend={b.oem_spend} /></div>
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 text-gray-400">
                      <tr>
                        <th className="px-3 py-1.5 text-left">OEM</th>
                        <th className="px-3 py-1.5 text-right">GMV</th>
                        <th className="px-3 py-1.5 text-right">Contracts</th>
                        <th className="px-3 py-1.5 text-right">Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {b.oem_spend.map(o => (
                        <tr key={o.oem_canonical} className={`border-t border-gray-50 ${o.is_100x ? "text-blue-700 bg-blue-50" : ""}`}>
                          <td className="px-3 py-1.5 flex items-center gap-1">
                            <span className={`w-2 h-2 rounded-full ${oemColor(o.oem_canonical)}`} />
                            {o.brand_name}
                          </td>
                          <td className="px-3 py-1.5 text-right">{INR(o.gmv, true)}</td>
                          <td className="px-3 py-1.5 text-right text-gray-400">{o.contracts}</td>
                          <td className="px-3 py-1.5 text-right">{PCT(o.share_pct)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              ) : (
                <div className="p-4">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 text-gray-400">
                      <tr>
                        <th className="px-3 py-1.5 text-left">OEM</th>
                        <th className="px-3 py-1.5 text-right">Contracts</th>
                        <th className="px-3 py-1.5 text-right">Last</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.oem_history.map(o => (
                        <tr key={o.oem_canonical} className="border-t border-gray-50">
                          <td className="px-3 py-1.5">{o.oem_canonical}</td>
                          <td className="px-3 py-1.5 text-right text-gray-400">{o.count}</td>
                          <td className="px-3 py-1.5 text-right text-gray-400">
                            {o.last ? new Date(o.last).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-xs text-gray-400 mt-2">Rebuild fogging-02 to see GMV per OEM.</p>
                </div>
              )}
            </div>

            {/* Scoring + Forecast */}
            <div className="space-y-3">
              {/* Score breakdown */}
              {!b.purchased_100x && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="text-xs font-semibold text-gray-600 uppercase mb-2">Opportunity Score — {b.opportunity_score}/100 <TierPill tier={b.opportunity_tier} /></div>
                  <ul className="space-y-1">
                    {b.opportunity_reasons.map((r, i) => (
                      <li key={i} className="text-xs text-gray-600 flex items-center gap-2">
                        <span className="text-green-500">✓</span> {r}
                      </li>
                    ))}
                  </ul>
                  {b.recommended_action && (
                    <div className={`mt-3 text-xs px-3 py-2 rounded ${b.action_priority === 'immediate' ? 'bg-red-50 text-red-700' : b.action_priority === 'nurture' ? 'bg-amber-50 text-amber-700' : 'bg-gray-50 text-gray-600'}`}>
                      <strong className="uppercase mr-1">{b.action_priority}:</strong> {b.recommended_action}
                    </div>
                  )}
                </div>
              )}

              {/* Forecast */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="text-xs font-semibold text-gray-600 uppercase mb-2">Procurement Forecast</div>
                <div className="text-sm">
                  Next predicted: <strong>{b.forecast_next_month ? MONTHS[b.forecast_next_month - 1] : "—"} {b.forecast_next_year}</strong>
                  <span className="ml-2 text-xs">{CONF_ICON[b.forecast_confidence]} {b.forecast_confidence}</span>
                  {b.forecast_days_until != null && <span className="text-xs text-gray-400 ml-1">({b.forecast_days_until}d from now)</span>}
                </div>
                {b.forecast_6mo && b.forecast_6mo.length > 0 && (
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {b.forecast_6mo.map((s, i) => (
                      <div key={i} className={`text-xs px-2 py-1 rounded border ${s.confidence === 'high' ? 'border-green-200 bg-green-50 text-green-700' : s.confidence === 'medium' ? 'border-amber-100 bg-amber-50 text-amber-700' : 'border-gray-200 bg-gray-50 text-gray-500'}`}>
                        {MONTHS[s.month - 1]} {s.year}
                        <span className="text-gray-400 ml-1">({s.days_until}d)</span>
                      </div>
                    ))}
                  </div>
                )}
                {b.purchase_months && b.purchase_months.length > 0 && (
                  <div className="text-xs text-gray-400 mt-2">
                    Historical months: {b.purchase_months.map(m => MONTHS[m - 1]).join(", ")}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Contract history */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-600 uppercase">Contract History ({detail.contracts.length})</span>
              <button className="text-xs text-blue-600 hover:underline" onClick={() => setShowContracts(v => !v)}>
                {showContracts ? "Collapse" : "Expand"}
              </button>
            </div>
            {showContracts && (
              <table className="w-full text-xs">
                <thead className="bg-gray-50 text-gray-400">
                  <tr>
                    <th className="px-3 py-1.5 text-left">Date</th>
                    <th className="px-3 py-1.5 text-left">OEM</th>
                    <th className="px-3 py-1.5 text-left">Model</th>
                    <th className="px-3 py-1.5 text-right">Value</th>
                    <th className="px-3 py-1.5 text-right">Qty</th>
                    <th className="px-3 py-1.5 text-right">Unit ₹</th>
                    <th className="px-3 py-1.5 text-left">Mode</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.contracts.map(c => (
                    <tr key={c.gemc_no} className="border-t border-gray-50 hover:bg-gray-50">
                      <td className="px-3 py-1.5 text-gray-500">
                        {c.contract_date ? new Date(c.contract_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : "—"}
                      </td>
                      <td className="px-3 py-1.5">{c.oem_short_brand}</td>
                      <td className="px-3 py-1.5 text-gray-500 max-w-[140px] truncate">{c.model_raw || "—"}</td>
                      <td className="px-3 py-1.5 text-right">{INR(c.contract_value_num)}</td>
                      <td className="px-3 py-1.5 text-right text-gray-400">{c.quantity ?? "—"}</td>
                      <td className="px-3 py-1.5 text-right">{INR(c.unit_price)}</td>
                      <td className="px-3 py-1.5 text-gray-400">{c.buying_mode || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

type TabId = "market" | "attack" | "pricing" | "forecast" | "oem_profiles" | "buyer_profiles"

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "market",        label: "Market Share",        icon: <BarChart3 size={14} /> },
  { id: "attack",        label: "Attack Accounts",      icon: <Target size={14} /> },
  { id: "pricing",       label: "Pricing Intelligence", icon: <TrendingUp size={14} /> },
  { id: "forecast",      label: "Forecasts",            icon: <Calendar size={14} /> },
  { id: "oem_profiles",  label: "OEM Profiles",         icon: <Building2 size={14} /> },
  { id: "buyer_profiles",label: "Buyer Profiles",       icon: <Users size={14} /> },
]

export default function FoggingIntelligencePage() {
  const [tab,  setTab]  = useState<TabId>("market")
  const [oems, setOems] = useState<OemRow[]>([])
  const [kpiLoading, setKpiLoading] = useState(true)

  useEffect(() => {
    fetch("/api/fogging/oems")
      .then(r => r.json())
      .then(d => setOems(d.data || []))
      .finally(() => setKpiLoading(false))
  }, [])

  const totalGmv = oems.reduce((a, o) => a + (o.total_gmv || 0), 0)
  const entry100x = oems.find(o => o.is_100x)
  const neptune   = oems.find(o => o.oem_canonical === "NEPTUNE")

  return (
    <div className="flex flex-col min-h-0 flex-1">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Flame size={18} className="text-orange-500" />
              Fogging Intelligence
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              1,418 contracts · 274 buyers · 34 OEMs · 27 states
            </p>
          </div>
          <a href="/api/fogging/oems" target="_blank" rel="noreferrer"
            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
            <ExternalLink size={12} /> API
          </a>
        </div>

        {/* Persistent KPI strip */}
        {!kpiLoading && oems.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
            <KpiCard label="Market GMV"    value={INR(totalGmv, true)} sub="1,418 contracts" />
            <KpiCard label="Active OEMs"   value={oems.length.toString()} sub="34 brands" />
            <KpiCard label="100X Share"    value={PCT(entry100x?.market_share_gmv || 0)} sub={INR(entry100x?.total_gmv, true)} accent />
            <KpiCard label="100X Price P50" value={INR(entry100x?.median_unit_price)} sub="median unit" accent />
            <KpiCard label="Neptune Share" value={PCT(neptune?.market_share_gmv || 0)} sub="#1 competitor" />
            <KpiCard label="Price Gap"
              value={
                (entry100x?.median_unit_price && neptune?.median_unit_price)
                  ? INR(entry100x.median_unit_price - neptune.median_unit_price)
                  : "—"
              }
              sub="100X vs Neptune P50" />
          </div>
        )}

        {/* Tab bar */}
        <div className="flex gap-1 -mb-4 pb-0 border-t border-gray-100 pt-3 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-md transition-colors border-b-2 -mb-px whitespace-nowrap ${
                tab === t.id
                  ? "border-blue-600 text-blue-700 bg-blue-50"
                  : "border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
          <Link
            href="/admin/growth/fogging/sellers"
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-md transition-colors border-b-2 -mb-px whitespace-nowrap border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50"
          >
            <Store size={14} /> Dealer Network
          </Link>
          <Link
            href="/admin/growth/fogging/sales"
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-md transition-colors border-b-2 -mb-px whitespace-nowrap border-transparent text-red-600 hover:text-red-800 hover:bg-red-50 font-semibold"
          >
            <Target size={14} /> Sales Command Center
          </Link>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto p-6">
        {tab === "market"        && <MarketShareTab oems={oems} />}
        {tab === "attack"        && <AttackAccountsTab />}
        {tab === "pricing"       && <PricingTab />}
        {tab === "forecast"      && <ForecastTab />}
        {tab === "oem_profiles"  && <OemProfilesTab oems={oems} />}
        {tab === "buyer_profiles"&& <BuyerProfilesTab />}
      </div>
    </div>
  )
}
