"use client"
import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"

// ── Formatters ─────────────────────────────────────────────────────────────────
const INR = (v: number | null | undefined, decimals = 1) => {
  if (v == null || isNaN(v)) return "—"
  if (v >= 10_000_000) return `₹${(v / 10_000_000).toFixed(decimals)} Cr`
  if (v >= 100_000)    return `₹${(v / 100_000).toFixed(decimals)}L`
  if (v >= 1_000)      return `₹${(v / 1_000).toFixed(0)}K`
  return `₹${Math.round(v).toLocaleString("en-IN")}`
}
const days = (d: number | null | undefined) =>
  d == null || d >= 9000 ? "—" : d < 1 ? "today" : `${d}d`
const pct = (n: number | null | undefined) =>
  n == null ? "—" : `${n.toFixed(1)}%`

const TIER_CHIP: Record<string, string> = {
  A: "bg-red-100 text-red-700 border border-red-200",
  B: "bg-amber-100 text-amber-700 border border-amber-200",
  C: "bg-blue-100 text-blue-700 border border-blue-200",
  D: "bg-gray-100 text-gray-600",
}

function TierBadge({ tier }: { tier?: string }) {
  if (!tier) return null
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold ${TIER_CHIP[tier] || TIER_CHIP.D}`}>
      {tier}
    </span>
  )
}

function OemChip({ name, highlight }: { name: string; highlight?: boolean }) {
  const n = (name || "").toUpperCase()
  const cls = highlight
    ? n.includes("NEPTUNE")  ? "bg-blue-100 text-blue-700 border border-blue-200"
    : n.includes("SSE")      ? "bg-purple-100 text-purple-700 border border-purple-200"
    : n.includes("INSTA")    ? "bg-green-100 text-green-700 border border-green-200"
    : n.includes("PULSFOG")  ? "bg-orange-100 text-orange-700 border border-orange-200"
    : n.includes("FOGGERS")  ? "bg-yellow-100 text-yellow-700 border border-yellow-200"
    : "bg-gray-100 text-gray-600"
    : "bg-gray-100 text-gray-600"
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${cls}`}>
      {name}
    </span>
  )
}

function Pg({ page, pages, set }: { page: number; pages: number; set: (p: number) => void }) {
  if (pages <= 1) return null
  const visible: number[] = []
  for (let i = Math.max(1, page - 2); i <= Math.min(pages, page + 2); i++) visible.push(i)
  return (
    <div className="flex items-center gap-1 text-xs">
      <button onClick={() => set(Math.max(1, page - 1))} disabled={page === 1}
        className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"><ChevronLeft size={14} /></button>
      {visible[0] > 1 && <><button onClick={() => set(1)} className="px-2 py-1 rounded hover:bg-gray-100">1</button><span className="text-gray-400">…</span></>}
      {visible.map(n => (
        <button key={n} onClick={() => set(n)}
          className={`px-2 py-1 rounded ${n === page ? "bg-gray-800 text-white" : "hover:bg-gray-100"}`}>{n}</button>
      ))}
      {visible[visible.length - 1] < pages && <><span className="text-gray-400">…</span><button onClick={() => set(pages)} className="px-2 py-1 rounded hover:bg-gray-100">{pages}</button></>}
      <button onClick={() => set(Math.min(pages, page + 1))} disabled={page === pages}
        className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"><ChevronRight size={14} /></button>
    </div>
  )
}

// ── P1 — EXPANSION BOARD ────────────────────────────────────────────────────────
interface ExpRow {
  buyer_canonical: string; buyer_display_name: string; buyer_state: string
  total_gmv: number; _100x_spend: number; non_100x_gmv: number; _100x_share_pct: number
  contract_count: number; primary_incumbent: string
  incumbent_seller_gst: string | null; incumbent_seller_name: string | null
  last_contract_date: string | null; days_since_last: number
  opportunity_score: number; opportunity_tier: string
  oem_spend: { oem_canonical: string; brand_name: string; is_100x: boolean; gmv: number }[]
}

function ExpansionBoard() {
  const router = useRouter()
  const [rows, setRows] = useState<ExpRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/fogging/sales/expansion")
      .then(r => r.json())
      .then(d => { setRows(d.data ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-center text-gray-400 text-sm">Loading …</div>
  if (!rows.length) return <div className="p-8 text-center text-gray-400 text-sm">No buyers with 100X history + competitor spend found.</div>

  return (
    <div className="p-4">
      <div className="mb-3 px-1">
        <p className="text-xs text-gray-500">
          {rows.length} buyers who have already purchased 100X — but still spend heavily on competitors.
          Fastest revenue pool: relationship exists, trust barrier is cleared.
        </p>
      </div>
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wide">
              <th className="px-3 py-2 text-left font-semibold w-8">#</th>
              <th className="px-3 py-2 text-left font-semibold">Buyer</th>
              <th className="px-3 py-2 text-left font-semibold">St</th>
              <th className="px-3 py-2 text-right font-semibold">Total Spend</th>
              <th className="px-3 py-2 text-right font-semibold text-green-700">100X Spend</th>
              <th className="px-3 py-2 text-right font-semibold text-red-700">Leakage</th>
              <th className="px-3 py-2 text-right font-semibold">100X%</th>
              <th className="px-3 py-2 text-left font-semibold">Incumbent OEM</th>
              <th className="px-3 py-2 text-left font-semibold">Incumbent Seller</th>
              <th className="px-3 py-2 text-right font-semibold">Last Buy</th>
              <th className="px-3 py-2 text-right font-semibold">Cnts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r, i) => {
              const leakagePct = r.total_gmv > 0 ? (r.non_100x_gmv / r.total_gmv * 100) : 0
              const rowCls = leakagePct > 90
                ? "bg-red-50 hover:bg-red-100"
                : leakagePct > 50
                ? "bg-orange-50 hover:bg-orange-100"
                : "bg-white hover:bg-gray-50"
              return (
                <tr key={r.buyer_canonical} className={`${rowCls} cursor-pointer transition-colors`}
                  onClick={() => router.push(`/admin/growth/fogging/buyer/${encodeURIComponent(r.buyer_canonical)}`)}>
                  <td className="px-3 py-2.5 text-gray-400">{i + 1}</td>
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-gray-900 max-w-[240px] truncate">{r.buyer_display_name}</div>
                    <div className="text-gray-400">{r.buyer_state}</div>
                  </td>
                  <td className="px-3 py-2.5 text-gray-600">{(r.buyer_state || "?").slice(0, 2).toUpperCase()}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-gray-700">{INR(r.total_gmv)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-green-700 font-medium">{INR(r._100x_spend)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-red-700 font-bold">{INR(r.non_100x_gmv)}</td>
                  <td className="px-3 py-2.5 text-right text-gray-600">{pct(r._100x_share_pct)}</td>
                  <td className="px-3 py-2.5">
                    <OemChip name={r.primary_incumbent || "—"} highlight />
                  </td>
                  <td className="px-3 py-2.5">
                    {r.incumbent_seller_gst ? (
                      <a href={`/admin/growth/fogging/sellers/${encodeURIComponent(r.incumbent_seller_gst)}`}
                        onClick={e => e.stopPropagation()}
                        className="text-amber-700 hover:text-amber-900 hover:underline max-w-[140px] truncate block">
                        {r.incumbent_seller_name?.slice(0, 28) || r.incumbent_seller_gst}
                      </a>
                    ) : (
                      <span className="text-gray-400 truncate block max-w-[140px]">
                        {r.incumbent_seller_name?.slice(0, 28) || "—"}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right text-gray-500">{days(r.days_since_last)}</td>
                  <td className="px-3 py-2.5 text-right text-gray-600">{r.contract_count}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── P2 — ATTACK ACCOUNTS BOARD ─────────────────────────────────────────────────
const DEPTS = [
  "Municipality / Civic Body","Urban Development / Housing","Panchayat / Rural Body",
  "Health / Medical","Other Government","Railways / Metro","Police / Defence / Paramilitary",
  "Agriculture / Horticulture","Education","Disaster / Fire / Emergency",
  "Forest / Environment","Water / Irrigation","PWD / Infrastructure",
]
const ATTACK_OEMS = ["NEPTUNE","SSE SAI SHREE ENTERPRISES","PULSFOG","INSTA FOG","FOGGERS","LUMINICA","INDOFOG"]

interface AttackRow {
  buyer_canonical: string; buyer_display_name: string; buyer_state: string
  dept_category: string; total_gmv: number; non_100x_gmv: number; has_100x: boolean
  contract_count: number; primary_incumbent: string
  incumbent_seller_gst: string | null; incumbent_seller_name: string | null
  last_contract_date: string | null; days_since_last: number
  opportunity_score: number; opportunity_tier: string; rank: number
}

function AttackAccountsBoard() {
  const router = useRouter()
  const [rows, setRows]   = useState<AttackRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const PAGE = 50

  const [f, setF] = useState({ state: "", oem: "", dept: "", tier: "", max_days: "" })

  const load = useCallback(() => {
    setLoading(true)
    const qs = new URLSearchParams({ page: String(page), page_size: String(PAGE) })
    if (f.state)    qs.set("state", f.state)
    if (f.oem)      qs.set("oem", f.oem)
    if (f.dept)     qs.set("dept", f.dept)
    if (f.tier)     qs.set("tier", f.tier)
    if (f.max_days) qs.set("max_days", f.max_days)
    fetch(`/api/fogging/sales/attack-accounts?${qs}`)
      .then(r => r.json())
      .then(d => { setRows(d.data ?? []); setTotal(d.total ?? 0) })
      .finally(() => setLoading(false))
  }, [f, page])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [f])

  const selClx = "text-xs border border-gray-200 rounded px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-400"

  return (
    <div className="p-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-3">
        <select className={selClx} value={f.tier} onChange={e => setF(v => ({ ...v, tier: e.target.value }))}>
          <option value="">All Tiers</option>
          <option value="A">Tier A</option>
          <option value="B">Tier B</option>
          <option value="C">Tier C</option>
        </select>
        <select className={selClx} value={f.oem} onChange={e => setF(v => ({ ...v, oem: e.target.value }))}>
          <option value="">All Incumbents</option>
          {ATTACK_OEMS.map(o => <option key={o}>{o}</option>)}
        </select>
        <select className={selClx} value={f.dept} onChange={e => setF(v => ({ ...v, dept: e.target.value }))}>
          <option value="">All Departments</option>
          {DEPTS.map(d => <option key={d}>{d}</option>)}
        </select>
        <select className={selClx} value={f.max_days} onChange={e => setF(v => ({ ...v, max_days: e.target.value }))}>
          <option value="">Any Recency</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="180">Last 180 days</option>
          <option value="365">Last 365 days</option>
        </select>
        {(f.state || f.oem || f.dept || f.tier || f.max_days) && (
          <button onClick={() => setF({ state: "", oem: "", dept: "", tier: "", max_days: "" })}
            className="text-xs text-gray-500 hover:text-gray-800 underline px-1">Clear</button>
        )}
        <span className="ml-auto text-xs text-gray-400 self-center">{total.toLocaleString()} buyers</span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wide">
              <th className="px-3 py-2 text-left font-semibold w-8">#</th>
              <th className="px-3 py-2 text-left font-semibold">Buyer</th>
              <th className="px-3 py-2 text-left font-semibold">Dept</th>
              <th className="px-3 py-2 text-right font-semibold">GMV</th>
              <th className="px-3 py-2 text-left font-semibold">Incumbent OEM</th>
              <th className="px-3 py-2 text-left font-semibold">Incumbent Seller</th>
              <th className="px-3 py-2 text-right font-semibold">Last Buy</th>
              <th className="px-3 py-2 text-right font-semibold">Cnts</th>
              <th className="px-3 py-2 text-right font-semibold">Score</th>
              <th className="px-3 py-2 text-center font-semibold">Tier</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={10} className="px-3 py-8 text-center text-gray-400">Loading …</td></tr>
            ) : rows.map(r => {
              const rowCls = r.opportunity_tier === "A"
                ? "bg-amber-50 hover:bg-amber-100"
                : r.opportunity_tier === "B"
                ? "bg-white hover:bg-gray-50"
                : "bg-white hover:bg-gray-50"
              return (
                <tr key={r.buyer_canonical} className={`${rowCls} cursor-pointer transition-colors`}
                  onClick={() => router.push(`/admin/growth/fogging/buyer/${encodeURIComponent(r.buyer_canonical)}`)}>
                  <td className="px-3 py-2.5 text-gray-400">{r.rank}</td>
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-gray-900 max-w-[220px] truncate">{r.buyer_display_name}</div>
                    <div className="text-gray-400">{r.buyer_state}</div>
                  </td>
                  <td className="px-3 py-2.5 text-gray-500 max-w-[130px] truncate">{r.dept_category || "—"}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-gray-700">{INR(r.total_gmv)}</td>
                  <td className="px-3 py-2.5"><OemChip name={r.primary_incumbent || "—"} highlight /></td>
                  <td className="px-3 py-2.5">
                    {r.incumbent_seller_gst ? (
                      <a href={`/admin/growth/fogging/sellers/${encodeURIComponent(r.incumbent_seller_gst)}`}
                        onClick={e => e.stopPropagation()}
                        className="text-amber-700 hover:underline truncate block max-w-[140px]">
                        {r.incumbent_seller_name?.slice(0, 26) || r.incumbent_seller_gst}
                      </a>
                    ) : (
                      <span className="text-gray-400 truncate block max-w-[140px]">{r.incumbent_seller_name?.slice(0, 26) || "—"}</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right text-gray-500">{days(r.days_since_last)}</td>
                  <td className="px-3 py-2.5 text-right text-gray-600">{r.contract_count}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-gray-700">{r.opportunity_score}</td>
                  <td className="px-3 py-2.5 text-center"><TierBadge tier={r.opportunity_tier} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between mt-2 px-1">
        <span className="text-xs text-gray-400">Showing {rows.length} of {total}</span>
        <Pg page={page} pages={Math.ceil(total / PAGE)} set={setPage} />
      </div>
    </div>
  )
}

// ── P3 — DEALER RECRUITMENT BOARD ─────────────────────────────────────────────
interface DealerRow {
  seller_slug: string; seller_gst: string | null; seller_display_name: string
  seller_state: string; is_100x_dealer: boolean; selling_as: string | null
  total_gmv: number; buyers_served: number; oem_count: number
  oems_represented: { oem_canonical: string; brand_name: string; gmv: number }[]
  carries_neptune: boolean; carries_sse: boolean; carries_instafog: boolean
  carries_pulsfog: boolean; competitor_oem_count: number
  seller_opportunity_score: number; days_since_last: number; rank: number
}

const RECRUIT_OEMS = [
  { value: "any_competitor", label: "Any Competitor" },
  { value: "neptune",        label: "Neptune" },
  { value: "sse",            label: "SSE Sai Shree" },
  { value: "instafog",       label: "Insta Fog" },
  { value: "pulsfog",        label: "Pulsfog" },
]

function DealerRecruitmentBoard() {
  const router = useRouter()
  const [rows, setRows]   = useState<DealerRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage]   = useState(1)
  const PAGE = 50

  const [f, setF] = useState({ oem_carried: "any_competitor", is_100x: "false", min_buyers: "", sort: "opp" })

  const load = useCallback(() => {
    setLoading(true)
    const qs = new URLSearchParams({ page: String(page), page_size: String(PAGE), sort: f.sort })
    if (f.oem_carried) qs.set("oem_carried", f.oem_carried)
    if (f.is_100x)     qs.set("is_100x", f.is_100x)
    if (f.min_buyers)  qs.set("min_buyers", f.min_buyers)
    fetch(`/api/fogging/sales/dealer-targets?${qs}`)
      .then(r => r.json())
      .then(d => { setRows(d.data ?? []); setTotal(d.total ?? 0) })
      .finally(() => setLoading(false))
  }, [f, page])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [f])

  const selClx = "text-xs border border-gray-200 rounded px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-400"

  return (
    <div className="p-4">
      <div className="flex flex-wrap gap-2 mb-3">
        <select className={selClx} value={f.oem_carried} onChange={e => setF(v => ({ ...v, oem_carried: e.target.value }))}>
          <option value="">All Sellers</option>
          {RECRUIT_OEMS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select className={selClx} value={f.is_100x} onChange={e => setF(v => ({ ...v, is_100x: e.target.value }))}>
          <option value="">All (incl. 100X)</option>
          <option value="false">Not carrying 100X</option>
          <option value="true">100X dealers only</option>
        </select>
        <select className={selClx} value={f.min_buyers} onChange={e => setF(v => ({ ...v, min_buyers: e.target.value }))}>
          <option value="">Any buyer count</option>
          <option value="5">≥ 5 buyers</option>
          <option value="10">≥ 10 buyers</option>
          <option value="20">≥ 20 buyers</option>
        </select>
        <select className={selClx} value={f.sort} onChange={e => setF(v => ({ ...v, sort: e.target.value }))}>
          <option value="opp">Best Targets First</option>
          <option value="gmv">Highest GMV</option>
          <option value="buyers">Most Buyers</option>
        </select>
        <span className="ml-auto text-xs text-gray-400 self-center">{total.toLocaleString()} sellers</span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wide">
              <th className="px-3 py-2 text-left font-semibold w-8">#</th>
              <th className="px-3 py-2 text-left font-semibold">Seller</th>
              <th className="px-3 py-2 text-left font-semibold">State</th>
              <th className="px-3 py-2 text-right font-semibold">GMV</th>
              <th className="px-3 py-2 text-right font-semibold">Buyers</th>
              <th className="px-3 py-2 text-left font-semibold">OEMs Carried</th>
              <th className="px-3 py-2 text-center font-semibold">Status</th>
              <th className="px-3 py-2 text-right font-semibold">Last Sale</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-gray-400">Loading …</td></tr>
            ) : rows.map(r => {
              const rowCls = r.is_100x_dealer
                ? "bg-green-50 hover:bg-green-100"
                : r.competitor_oem_count >= 2
                ? "bg-blue-50 hover:bg-blue-100"
                : "bg-white hover:bg-gray-50"
              const oemList = (r.oems_represented || []).slice(0, 4)
              return (
                <tr key={r.seller_slug} className={`${rowCls} cursor-pointer transition-colors`}
                  onClick={() => router.push(`/admin/growth/fogging/sellers/${encodeURIComponent(r.seller_slug)}`)}>
                  <td className="px-3 py-2.5 text-gray-400">{r.rank}</td>
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-gray-900 max-w-[200px] truncate">{r.seller_display_name}</div>
                    {r.seller_gst && <div className="text-gray-400 font-mono text-[10px]">{r.seller_gst}</div>}
                  </td>
                  <td className="px-3 py-2.5 text-gray-600">{r.seller_state || "—"}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-gray-700">{INR(r.total_gmv)}</td>
                  <td className="px-3 py-2.5 text-right text-gray-700 font-medium">{r.buyers_served}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {oemList.map(o => (
                        <OemChip key={o.oem_canonical} name={o.brand_name || o.oem_canonical} highlight />
                      ))}
                      {(r.oems_represented?.length || 0) > 4 && (
                        <span className="text-gray-400">+{r.oems_represented.length - 4}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {r.is_100x_dealer ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700 border border-green-200">100X</span>
                    ) : (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs text-gray-500 bg-gray-100">Recruit</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right text-gray-500">{days(r.days_since_last)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between mt-2 px-1">
        <span className="text-xs text-gray-400">Showing {rows.length} of {total}</span>
        <Pg page={page} pages={Math.ceil(total / PAGE)} set={setPage} />
      </div>
    </div>
  )
}

// ── P4 — STATE EXPANSION BOARD ─────────────────────────────────────────────────
interface StateRow {
  state: string; total_gmv: number; gmv_100x: number; non100x_gmv: number
  contracts: number; buyer_count: number; seller_count: number
  penetration_pct: number; top_oems: string[]; opp_score: number
  zero_penetration: boolean; days_since_last: number
}

function StateExpansionBoard() {
  const router = useRouter()
  const [rows, setRows]   = useState<StateRow[]>([])
  const [summary, setSummary] = useState<{ zero_pen_states: number; total_non100x_gmv: number } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/fogging/sales/state-heatmap")
      .then(r => r.json())
      .then(d => { setRows(d.data ?? []); setSummary(d.summary ?? null) })
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="p-8 text-center text-gray-400 text-sm">Loading …</div>

  return (
    <div className="p-4">
      {summary && (
        <div className="flex gap-4 mb-3 text-xs text-gray-500">
          <span><span className="font-semibold text-red-600">{summary.zero_pen_states} states</span> with 0% 100X penetration</span>
          <span>Non-100X GMV: <span className="font-semibold text-gray-800">{INR(summary.total_non100x_gmv)}</span></span>
        </div>
      )}
      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wide">
              <th className="px-3 py-2 text-left font-semibold w-8">#</th>
              <th className="px-3 py-2 text-left font-semibold">State</th>
              <th className="px-3 py-2 text-right font-semibold">Market GMV</th>
              <th className="px-3 py-2 text-right font-semibold text-green-700">100X GMV</th>
              <th className="px-3 py-2 text-right font-semibold">100X%</th>
              <th className="px-3 py-2 text-right font-semibold">Buyers</th>
              <th className="px-3 py-2 text-right font-semibold">Sellers</th>
              <th className="px-3 py-2 text-right font-semibold">Opp Score</th>
              <th className="px-3 py-2 text-left font-semibold">Top OEMs</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((r, i) => {
              const rowCls = r.zero_penetration
                ? "bg-amber-50 hover:bg-amber-100"
                : r.penetration_pct < 5
                ? "bg-white hover:bg-gray-50"
                : "bg-green-50 hover:bg-green-100"
              return (
                <tr key={r.state}
                  className={`${rowCls} cursor-pointer transition-colors`}
                  onClick={() => router.push(`/admin/growth/fogging/contracts?buyer_state=${encodeURIComponent(r.state)}`)}>
                  <td className="px-3 py-2.5 text-gray-400">{i + 1}</td>
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-gray-900">{r.state}</div>
                    {r.zero_penetration && (
                      <span className="text-[10px] text-red-500 font-semibold">ZERO PENETRATION</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-gray-700">{INR(r.total_gmv)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-green-700">{INR(r.gmv_100x)}</td>
                  <td className="px-3 py-2.5 text-right">
                    <span className={r.zero_penetration ? "text-red-600 font-bold" : r.penetration_pct < 5 ? "text-amber-600" : "text-green-700 font-medium"}>
                      {pct(r.penetration_pct)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right text-gray-700">{r.buyer_count}</td>
                  <td className="px-3 py-2.5 text-right text-gray-700">{r.seller_count}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-gray-700">{INR(r.opp_score)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {r.top_oems.slice(0, 2).map(o => (
                        <Link key={o} href={`/admin/growth/fogging/oem/${encodeURIComponent(o)}`} onClick={e => e.stopPropagation()}>
                          <OemChip name={o} highlight />
                        </Link>
                      ))}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── P5 — MODEL GAP BOARD ───────────────────────────────────────────────────────
interface ModelRow {
  model_normalized: string; model_display: string; oem_canonical: string
  total_gmv: number; contract_count: number; buyer_count: number
  is_100x: boolean; gap_status: string
  p50_price: number | null; p_min: number | null; p_max: number | null
  price_variance_pct: number; priced_count: number
  model_opportunity_score: number; rank: number
}

const MODEL_OEMS = ["NEPTUNE","SSE SAI SHREE ENTERPRISES","PULSFOG","INSTA FOG","FOGGERS",
  "ASPEE","INFINITY","LUMINICA","INDOFOG","FOGGREX","PUREFOG","SPACESPRAY"]

function ModelGapsBoard() {
  const router = useRouter()
  const [rows, setRows]   = useState<ModelRow[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage]   = useState(1)
  const PAGE = 50
  const [summary, setSummary] = useState<{ gap_models: number; competing_models: number } | null>(null)

  const [f, setF] = useState({ oem: "", gap_only: "true", min_buyers: "" })

  const load = useCallback(() => {
    setLoading(true)
    const qs = new URLSearchParams({ page: String(page), page_size: String(PAGE) })
    if (f.oem)        qs.set("oem", f.oem)
    if (f.gap_only)   qs.set("gap_only", f.gap_only)
    if (f.min_buyers) qs.set("min_buyers", f.min_buyers)
    fetch(`/api/fogging/sales/model-gaps?${qs}`)
      .then(r => r.json())
      .then(d => { setRows(d.data ?? []); setTotal(d.total ?? 0); setSummary(d.summary ?? null) })
      .finally(() => setLoading(false))
  }, [f, page])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [f])

  const selClx = "text-xs border border-gray-200 rounded px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-gray-400"

  const fmtPrice = (n: number | null) => n ? `₹${n.toLocaleString("en-IN")}` : "—"

  return (
    <div className="p-4">
      {summary && (
        <div className="flex gap-4 mb-3 text-xs text-gray-500">
          <span>Gap models (no 100X offer): <span className="font-semibold text-red-600">{summary.gap_models}</span></span>
          <span>100X competing models: <span className="font-semibold text-green-700">{summary.competing_models}</span></span>
        </div>
      )}
      <div className="flex flex-wrap gap-2 mb-3">
        <select className={selClx} value={f.oem} onChange={e => setF(v => ({ ...v, oem: e.target.value }))}>
          <option value="">All OEMs</option>
          {MODEL_OEMS.map(o => <option key={o}>{o}</option>)}
        </select>
        <select className={selClx} value={f.gap_only} onChange={e => setF(v => ({ ...v, gap_only: e.target.value }))}>
          <option value="true">Competitor models only</option>
          <option value="">All models</option>
        </select>
        <select className={selClx} value={f.min_buyers} onChange={e => setF(v => ({ ...v, min_buyers: e.target.value }))}>
          <option value="">Any buyer count</option>
          <option value="3">≥ 3 buyers</option>
          <option value="5">≥ 5 buyers</option>
          <option value="10">≥ 10 buyers</option>
        </select>
        <span className="ml-auto text-xs text-gray-400 self-center">{total} models</span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wide">
              <th className="px-3 py-2 text-left font-semibold w-8">#</th>
              <th className="px-3 py-2 text-left font-semibold">Model</th>
              <th className="px-3 py-2 text-left font-semibold">OEM</th>
              <th className="px-3 py-2 text-right font-semibold">GMV</th>
              <th className="px-3 py-2 text-right font-semibold">Buyers</th>
              <th className="px-3 py-2 text-right font-semibold">P50 Price</th>
              <th className="px-3 py-2 text-right font-semibold">Spread</th>
              <th className="px-3 py-2 text-center font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-gray-400">Loading …</td></tr>
            ) : rows.map(r => {
              const rowCls = r.is_100x
                ? "bg-green-50 hover:bg-green-100"
                : "bg-white hover:bg-gray-50"
              return (
                <tr key={r.model_normalized} className={`${rowCls} cursor-pointer transition-colors`}
                  onClick={() => router.push(`/admin/growth/fogging/model/${encodeURIComponent(r.model_normalized)}`)}>
                  <td className="px-3 py-2.5 text-gray-400">{r.rank}</td>
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-gray-900 max-w-[200px] truncate">
                      {r.model_display || r.model_normalized}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <Link href={`/admin/growth/fogging/oem/${encodeURIComponent(r.oem_canonical)}`} onClick={e => e.stopPropagation()}>
                      <OemChip name={r.oem_canonical} highlight={!r.is_100x} />
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-gray-700">{INR(r.total_gmv)}</td>
                  <td className="px-3 py-2.5 text-right text-gray-700">{r.buyer_count}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-gray-700">{fmtPrice(r.p50_price)}</td>
                  <td className="px-3 py-2.5 text-right">
                    {r.price_variance_pct > 200
                      ? <span className="text-red-600 font-semibold">{r.price_variance_pct}%</span>
                      : <span className="text-gray-500">{r.price_variance_pct}%</span>}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {r.is_100x ? (
                      <span className="inline-flex px-1.5 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700 border border-green-200">Competing</span>
                    ) : (
                      <span className="inline-flex px-1.5 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-700 border border-red-200">Gap</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between mt-2 px-1">
        <span className="text-xs text-gray-400">Showing {rows.length} of {total}</span>
        <Pg page={page} pages={Math.ceil(total / PAGE)} set={setPage} />
      </div>
    </div>
  )
}

// ── MAIN PAGE ──────────────────────────────────────────────────────────────────
type Tab = "expansion" | "attack" | "dealers" | "states" | "models"

const TABS: { id: Tab; label: string; sublabel: string }[] = [
  { id: "expansion", label: "Expansion",          sublabel: "Existing 100X buyers leaking" },
  { id: "attack",    label: "Attack Accounts",    sublabel: "Non-100X buyer targets" },
  { id: "dealers",   label: "Dealer Recruitment", sublabel: "Competitor dealer targets" },
  { id: "states",    label: "State Expansion",    sublabel: "Geography opportunity" },
  { id: "models",    label: "Model Gaps",         sublabel: "Product coverage gaps" },
]

export default function SalesCommandCenter() {
  const [tab, setTab] = useState<Tab>("expansion")

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-screen-xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3 mb-3">
            <a href="/admin/growth/fogging"
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              ← Fogging Intelligence
            </a>
          </div>
          <div className="flex items-baseline gap-3">
            <h1 className="text-lg font-bold text-gray-900">Sales Command Center</h1>
            <span className="text-xs text-gray-400">274 buyers · 679 sellers · ₹75.08 Cr market · 1.2% 100X share</span>
          </div>
          {/* Tabs */}
          <div className="flex gap-0 mt-3 -mb-px overflow-x-auto">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex-none px-4 py-2.5 text-xs font-medium border-b-2 transition-colors whitespace-nowrap
                  ${tab === t.id
                    ? "border-gray-900 text-gray-900"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}>
                <div>{t.label}</div>
                <div className={`text-[10px] font-normal ${tab === t.id ? "text-gray-500" : "text-gray-400"}`}>
                  {t.sublabel}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Boards */}
      <div className="max-w-screen-xl mx-auto">
        {tab === "expansion" && <ExpansionBoard />}
        {tab === "attack"    && <AttackAccountsBoard />}
        {tab === "dealers"   && <DealerRecruitmentBoard />}
        {tab === "states"    && <StateExpansionBoard />}
        {tab === "models"    && <ModelGapsBoard />}
      </div>
    </div>
  )
}
