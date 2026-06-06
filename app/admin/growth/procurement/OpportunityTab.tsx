"use client"
import { useState, useEffect, useCallback } from "react"
import { Target, TrendingUp, Building2, Package, Zap, Users, BarChart3 } from "lucide-react"

const API = "/api/admin/procurement/opportunity"

function fmt(n: number) {
  if (!n) return "₹0"
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(1)} Cr`
  if (n >= 1_00_000)    return `₹${(n / 1_00_000).toFixed(1)} L`
  return `₹${n.toLocaleString("en-IN")}`
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 75 ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" :
    score >= 50 ? "bg-blue-500/20 text-blue-300 border-blue-500/30" :
    score >= 25 ? "bg-amber-500/20 text-amber-300 border-amber-500/30" :
                  "bg-zinc-700 text-zinc-400 border-zinc-600"
  return (
    <span className={`text-xs font-mono px-2 py-0.5 rounded-full border ${color}`}>
      {score}
    </span>
  )
}

function TagBadge({ tag }: { tag?: string }) {
  const styles: Record<string, string> = {
    core:      "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    health:    "bg-sky-500/20 text-sky-300 border-sky-500/30",
    municipal: "bg-violet-500/20 text-violet-300 border-violet-500/30",
    defense:   "bg-red-500/20 text-red-300 border-red-500/30",
    adjacent:  "bg-zinc-700 text-zinc-400 border-zinc-600",
    general:   "bg-zinc-700 text-zinc-400 border-zinc-600",
    fragmented:"bg-amber-500/20 text-amber-300 border-amber-500/30",
  }
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${styles[tag || "general"] || styles.general}`}>
      {tag || "—"}
    </span>
  )
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-zinc-300">
        <Icon className="w-4 h-4" />
        <span className="font-semibold text-sm uppercase tracking-widest">{title}</span>
      </div>
      {children}
    </div>
  )
}

// ── Overview cards ──────────────────────────────────────────────────────────────
function OverviewCards() {
  const [data, setData] = useState<Record<string, number> | null>(null)

  useEffect(() => {
    fetch(`${API}?section=overview`).then(r => r.json()).then(setData).catch(() => null)
  }, [])

  const cards = [
    { label: "Total Contracts",   val: data?.total,                color: "text-zinc-100" },
    { label: "Enriched",          val: data ? `${data.coverage_pct}%` : "—", color: "text-emerald-400" },
    { label: "New Sellers",       val: data?.new_sellers,           color: "text-blue-400" },
    { label: "High Value (>₹10L)", val: data?.high_value_contracts, color: "text-amber-400" },
    { label: "Fogging Contracts", val: data?.fogging_contracts,     color: "text-violet-400" },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
      {cards.map(c => (
        <div key={c.label} className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
          <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">{c.label}</p>
          <p className={`text-xl font-mono font-bold ${c.color}`}>
            {data ? (c.val ?? "0") : <span className="text-zinc-600">…</span>}
          </p>
        </div>
      ))}
    </div>
  )
}

// ── Dealer Targets table ────────────────────────────────────────────────────────
interface DealerTarget {
  name: string; gmv: number; count: number; score: number
  phone: string | null; email: string | null; gstin: string | null
  state: string | null; states: number; depts: number; cat_rel: number
  msme: string | null
}

function DealerTargetsTable() {
  const [rows, setRows] = useState<DealerTarget[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("")
  const [minScore, setMinScore] = useState(0)
  const [contactOnly, setContactOnly] = useState(false)

  useEffect(() => {
    fetch(`${API}?section=dealer_targets&limit=100`)
      .then(r => r.json())
      .then(d => { setRows(d.targets || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = rows.filter(r => {
    if (r.score < minScore) return false
    if (contactOnly && !r.phone && !r.email) return false
    if (filter && !r.name.toLowerCase().includes(filter.toLowerCase())) return false
    return true
  })

  if (loading) return <p className="text-zinc-500 text-sm">Loading dealer targets…</p>

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3 items-center">
        <input
          className="bg-zinc-900 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-200 placeholder-zinc-500 w-64"
          placeholder="Filter by name…"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
          <input type="checkbox" checked={contactOnly} onChange={e => setContactOnly(e.target.checked)} />
          Has phone or email
        </label>
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <span>Min score:</span>
          {[0, 25, 50, 75].map(s => (
            <button
              key={s}
              onClick={() => setMinScore(s)}
              className={`px-2 py-0.5 rounded text-xs ${minScore === s ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-400"}`}
            >
              {s}+
            </button>
          ))}
        </div>
        <span className="text-xs text-zinc-500 ml-auto">{filtered.length} of {rows.length}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-zinc-300">
          <thead>
            <tr className="text-[10px] text-zinc-500 uppercase tracking-widest border-b border-zinc-800">
              <th className="text-left py-2 pr-3">#</th>
              <th className="text-left py-2 pr-3">Seller Name</th>
              <th className="text-right py-2 pr-3">GMV</th>
              <th className="text-right py-2 pr-3">Contracts</th>
              <th className="text-right py-2 pr-3">States</th>
              <th className="text-right py-2 pr-3">Depts</th>
              <th className="text-center py-2 pr-3">Score</th>
              <th className="text-center py-2 pr-3">CatRel</th>
              <th className="text-left py-2">Contact</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 100).map((r, i) => (
              <tr key={r.name} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                <td className="py-2 pr-3 text-zinc-600 tabular-nums">{i + 1}</td>
                <td className="py-2 pr-3 max-w-[200px] truncate font-medium">{r.name}</td>
                <td className="py-2 pr-3 text-right tabular-nums text-emerald-400">{fmt(r.gmv)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{r.count}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{r.states}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{r.depts}</td>
                <td className="py-2 pr-3 text-center"><ScoreBadge score={r.score} /></td>
                <td className="py-2 pr-3 text-center"><ScoreBadge score={r.cat_rel} /></td>
                <td className="py-2">
                  <div className="flex gap-2">
                    {r.phone && <a href={`tel:${r.phone}`} className="text-blue-400 hover:underline">{r.phone}</a>}
                    {r.email && <a href={`mailto:${r.email}`} className="text-blue-400 hover:underline truncate max-w-[140px]">{r.email}</a>}
                    {!r.phone && !r.email && <span className="text-zinc-600">no contact</span>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Govt Reach table ────────────────────────────────────────────────────────────
interface GovtReachRow {
  _id: string; gmv: number; count: number
  ministry_count: number; dept_count: number; state_count: number
  phone: string | null; email: string | null
}

function GovtReachTable() {
  const [rows, setRows] = useState<GovtReachRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API}?section=govt_reach`)
      .then(r => r.json())
      .then(d => { setRows(d.rows || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-zinc-500 text-sm">Loading…</p>

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs text-zinc-300">
        <thead>
          <tr className="text-[10px] text-zinc-500 uppercase tracking-widest border-b border-zinc-800">
            <th className="text-left py-2 pr-3">#</th>
            <th className="text-left py-2 pr-3">Seller</th>
            <th className="text-right py-2 pr-3">GMV</th>
            <th className="text-right py-2 pr-3">Contracts</th>
            <th className="text-right py-2 pr-3">Ministries</th>
            <th className="text-right py-2 pr-3">Depts</th>
            <th className="text-right py-2">States</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r._id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
              <td className="py-2 pr-3 text-zinc-600 tabular-nums">{i + 1}</td>
              <td className="py-2 pr-3 max-w-[200px] truncate font-medium">{r._id}</td>
              <td className="py-2 pr-3 text-right tabular-nums text-emerald-400">{fmt(r.gmv)}</td>
              <td className="py-2 pr-3 text-right tabular-nums">{r.count}</td>
              <td className="py-2 pr-3 text-right tabular-nums">{r.ministry_count}</td>
              <td className="py-2 pr-3 text-right tabular-nums text-blue-400">{r.dept_count}</td>
              <td className="py-2 text-right tabular-nums">{r.state_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Adjacent Products table ─────────────────────────────────────────────────────
interface AdjProduct {
  product: string; gmv: number; count: number
  sellers: number; depts: number; opp_score: number
  is_fogging: boolean; is_health: boolean; is_muni: boolean; tag: string
}

function AdjacentProductsTable() {
  const [data, setData] = useState<{ products: AdjProduct[]; strategic_dept_count: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [tagFilter, setTagFilter] = useState<string>("all")

  useEffect(() => {
    fetch(`${API}?section=adjacent_products`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-zinc-500 text-sm">Loading…</p>
  if (!data?.products?.length) return <p className="text-zinc-500 text-sm">No adjacent products found. Collect more contracts first.</p>

  const tags = ["all", "core", "health", "municipal", "adjacent"]
  const rows = tagFilter === "all" ? data.products : data.products.filter(p => p.tag === tagFilter)

  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-500">
        Products purchased by <span className="text-zinc-300">{data.strategic_dept_count}</span> strategic departments (fogging / health / sanitation / municipal / defense buyers).
      </p>
      <div className="flex gap-2">
        {tags.map(t => (
          <button
            key={t}
            onClick={() => setTagFilter(t)}
            className={`px-2 py-0.5 text-xs rounded capitalize ${tagFilter === t ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-400"}`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-zinc-300">
          <thead>
            <tr className="text-[10px] text-zinc-500 uppercase tracking-widest border-b border-zinc-800">
              <th className="text-left py-2 pr-3">#</th>
              <th className="text-left py-2 pr-3">Product</th>
              <th className="text-right py-2 pr-3">GMV</th>
              <th className="text-right py-2 pr-3">Contracts</th>
              <th className="text-right py-2 pr-3">Sellers</th>
              <th className="text-right py-2 pr-3">Depts</th>
              <th className="text-center py-2 pr-3">Opp</th>
              <th className="text-center py-2">Tag</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.product} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                <td className="py-2 pr-3 text-zinc-600 tabular-nums">{i + 1}</td>
                <td className="py-2 pr-3 max-w-[240px] truncate">{r.product}</td>
                <td className="py-2 pr-3 text-right tabular-nums text-emerald-400">{fmt(r.gmv)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{r.count}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{r.sellers}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{r.depts}</td>
                <td className="py-2 pr-3 text-center"><ScoreBadge score={r.opp_score} /></td>
                <td className="py-2 text-center"><TagBadge tag={r.tag} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Fragmented Categories table ─────────────────────────────────────────────────
interface FragCategory {
  product: string; gmv: number; count: number
  unique_sellers: number; hhi: number; fragmentation: number
  opp_score: number; is_strategic: boolean
}

function FragmentedTable() {
  const [rows, setRows] = useState<FragCategory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API}?section=fragmented_categories`)
      .then(r => r.json())
      .then(d => { setRows(d.categories || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-zinc-500 text-sm">Loading…</p>

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs text-zinc-300">
        <thead>
          <tr className="text-[10px] text-zinc-500 uppercase tracking-widest border-b border-zinc-800">
            <th className="text-left py-2 pr-3">#</th>
            <th className="text-left py-2 pr-3">Product Category</th>
            <th className="text-right py-2 pr-3">GMV</th>
            <th className="text-right py-2 pr-3">Contracts</th>
            <th className="text-right py-2 pr-3">Sellers</th>
            <th className="text-right py-2 pr-3">HHI</th>
            <th className="text-right py-2 pr-3">Frag%</th>
            <th className="text-center py-2 pr-3">Opp</th>
            <th className="text-center py-2">Strategic</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.product} className={`border-b border-zinc-800/50 hover:bg-zinc-800/30 ${r.is_strategic ? "bg-emerald-950/10" : ""}`}>
              <td className="py-2 pr-3 text-zinc-600 tabular-nums">{i + 1}</td>
              <td className="py-2 pr-3 max-w-[240px] truncate">{r.product}</td>
              <td className="py-2 pr-3 text-right tabular-nums text-emerald-400">{fmt(r.gmv)}</td>
              <td className="py-2 pr-3 text-right tabular-nums">{r.count}</td>
              <td className="py-2 pr-3 text-right tabular-nums">{r.unique_sellers}</td>
              <td className="py-2 pr-3 text-right tabular-nums text-zinc-400">{r.hhi}</td>
              <td className="py-2 pr-3 text-right tabular-nums">{r.fragmentation}%</td>
              <td className="py-2 pr-3 text-center"><ScoreBadge score={r.opp_score} /></td>
              <td className="py-2 text-center">
                {r.is_strategic ? <span className="text-emerald-400">✓</span> : <span className="text-zinc-700">—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Top 50 Product Opportunities ────────────────────────────────────────────────
interface ProductOpp {
  product: string; opp_score: number; gmv: number; tag?: string; source: string
}

function Top50ProductsTable() {
  const [rows, setRows] = useState<ProductOpp[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API}?section=product_opportunities`)
      .then(r => r.json())
      .then(d => { setRows(d.opportunities || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-zinc-500 text-sm">Loading…</p>

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs text-zinc-300">
        <thead>
          <tr className="text-[10px] text-zinc-500 uppercase tracking-widest border-b border-zinc-800">
            <th className="text-left py-2 pr-3">#</th>
            <th className="text-left py-2 pr-3">Product</th>
            <th className="text-right py-2 pr-3">GMV</th>
            <th className="text-center py-2 pr-3">Opp Score</th>
            <th className="text-center py-2 pr-3">Tag</th>
            <th className="text-center py-2">Signal</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.product} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
              <td className="py-2 pr-3 text-zinc-600 tabular-nums">{i + 1}</td>
              <td className="py-2 pr-3 max-w-[280px] truncate font-medium">{r.product}</td>
              <td className="py-2 pr-3 text-right tabular-nums text-emerald-400">{fmt(r.gmv)}</td>
              <td className="py-2 pr-3 text-center"><ScoreBadge score={r.opp_score} /></td>
              <td className="py-2 pr-3 text-center"><TagBadge tag={r.tag} /></td>
              <td className="py-2 text-center text-zinc-500 text-[10px]">
                {r.source === "adjacent" ? "dept match" : "fragmented"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Dept Map table ──────────────────────────────────────────────────────────────
interface DeptMapRow {
  name: string; gmv: number; count: number
  ministry: string | null; state: string | null
  products: number; sellers: number
  buys_fogging: boolean; buys_health: boolean; is_target: boolean
}

function DeptMapTable() {
  const [rows, setRows] = useState<DeptMapRow[]>([])
  const [loading, setLoading] = useState(true)
  const [targetOnly, setTargetOnly] = useState(false)

  useEffect(() => {
    fetch(`${API}?section=dept_map`)
      .then(r => r.json())
      .then(d => { setRows(d.departments || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-zinc-500 text-sm">Loading…</p>

  const shown = targetOnly ? rows.filter(r => r.is_target) : rows

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
        <input type="checkbox" checked={targetOnly} onChange={e => setTargetOnly(e.target.checked)} />
        Show only fogging/health buyers
      </label>
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-zinc-300">
          <thead>
            <tr className="text-[10px] text-zinc-500 uppercase tracking-widest border-b border-zinc-800">
              <th className="text-left py-2 pr-3">#</th>
              <th className="text-left py-2 pr-3">Department</th>
              <th className="text-right py-2 pr-3">GMV</th>
              <th className="text-right py-2 pr-3">Contracts</th>
              <th className="text-right py-2 pr-3">Products</th>
              <th className="text-right py-2 pr-3">Sellers</th>
              <th className="text-center py-2 pr-3">Fogging</th>
              <th className="text-center py-2">Health</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r, i) => (
              <tr key={r.name} className={`border-b border-zinc-800/50 hover:bg-zinc-800/30 ${r.is_target ? "bg-emerald-950/10" : ""}`}>
                <td className="py-2 pr-3 text-zinc-600 tabular-nums">{i + 1}</td>
                <td className="py-2 pr-3 max-w-[220px] truncate">
                  {r.name}
                  {r.ministry && <span className="text-zinc-600 ml-1">· {r.ministry}</span>}
                </td>
                <td className="py-2 pr-3 text-right tabular-nums text-emerald-400">{fmt(r.gmv)}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{r.count}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{r.products}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{r.sellers}</td>
                <td className="py-2 pr-3 text-center">
                  {r.buys_fogging ? <span className="text-emerald-400">✓</span> : <span className="text-zinc-700">—</span>}
                </td>
                <td className="py-2 text-center">
                  {r.buys_health ? <span className="text-sky-400">✓</span> : <span className="text-zinc-700">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Main tab ────────────────────────────────────────────────────────────────────
type OppView = "dealers" | "reach" | "adjacent" | "fragmented" | "products" | "deptmap"

const OPP_TABS: { id: OppView; label: string; icon: React.ElementType; desc: string }[] = [
  { id: "dealers",    label: "Dealer Leads",    icon: Users,     desc: "Top 100 seller acquisition targets not yet in dealer DB" },
  { id: "reach",      label: "Govt Reach",      icon: Building2, desc: "Sellers with widest departmental/state spread" },
  { id: "adjacent",   label: "Adjacent Products", icon: Package,  desc: "Products bought by fogging/health/sanitation departments" },
  { id: "fragmented", label: "Fragmented Mkts", icon: BarChart3, desc: "High-GMV categories with many competing sellers (low HHI)" },
  { id: "products",   label: "Top 50 Opps",     icon: Zap,       desc: "Merged ranked list of product opportunities" },
  { id: "deptmap",    label: "Dept Map",         icon: Target,    desc: "Departments mapped by fogging/health buying behaviour" },
]

export function OpportunityTab() {
  const [view, setView] = useState<OppView>("dealers")

  return (
    <div className="space-y-6">
      {/* Overview */}
      <OverviewCards />

      {/* Methodology note */}
      <div className="text-xs text-zinc-500 bg-zinc-900 border border-zinc-800 rounded-lg p-3 leading-relaxed">
        <strong className="text-zinc-300">Opportunity Engine v1</strong> — Scores are computed from GeM contract data.
        Dealer Score = 35% GMV + 30% contact completeness + 20% category relevance + 15% geographic spread.
        Category Relevance: 100% fogging/ULV, 70% health, 60% municipal, 50% defense.
        HHI measures market concentration (0 = perfectly fragmented, 100 = monopoly).
        <span className="text-amber-400 ml-1">Scores improve as more contracts are collected.</span>
      </div>

      {/* Sub-nav */}
      <div className="flex flex-wrap gap-2">
        {OPP_TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setView(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors ${
              view === t.id
                ? "bg-blue-600 text-white"
                : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Description */}
      <p className="text-xs text-zinc-500">
        {OPP_TABS.find(t => t.id === view)?.desc}
      </p>

      {/* Content */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4">
        {view === "dealers"    && <DealerTargetsTable />}
        {view === "reach"      && <GovtReachTable />}
        {view === "adjacent"   && <AdjacentProductsTable />}
        {view === "fragmented" && <FragmentedTable />}
        {view === "products"   && <Top50ProductsTable />}
        {view === "deptmap"    && <DeptMapTable />}
      </div>
    </div>
  )
}
