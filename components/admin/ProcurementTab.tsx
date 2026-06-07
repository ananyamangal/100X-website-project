"use client"
import React, { useEffect, useState, useCallback } from "react"
import { Search, RefreshCw, TrendingUp, Users, Building2, Package, IndianRupee, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

// ── helpers ──────────────────────────────────────────────────────────────────
function cr(v: number) {
  if (!v) return "—"
  if (v >= 1_00_00_000) return `₹${(v / 1_00_00_000).toFixed(2)} Cr`
  if (v >= 1_00_000)    return `₹${(v / 1_00_000).toFixed(2)} L`
  return `₹${v.toLocaleString("en-IN")}`
}

function pct(n: number, d: number) {
  return d ? `${Math.round((n / d) * 100)}%` : "0%"
}

type Tab = "overview" | "contracts" | "sellers" | "dealers" | "depts" | "opportunities"

// ── types ─────────────────────────────────────────────────────────────────────
interface Overview {
  total: number; enriched: number; pending: number; failed: number
  pct_enriched: number; total_gmv: number; enriched_gmv: number
}

interface OppOverview {
  total: number; enriched: number
  new_sellers: number; high_value_contracts: number; fogging_contracts: number
  coverage_pct: number
}

interface Contract {
  gemc_no: string; seller_name_canonical?: string; dept_name?: string
  product_name?: string; contract_value_num?: number; seller_state?: string
  state?: string; contract_status?: string; contract_date_dt?: string
  ministry?: string; buyer_name?: string; detail_scraped?: boolean
  seller_gst?: string; buying_mode?: string
}

interface Seller {
  _id: string; gmv: number; count: number; gstin?: string; state?: string
}

interface Target {
  name: string; gmv: number; count: number; score: number
  phone?: string; email?: string; gstin?: string; state?: string
  msme?: string; states: number; depts: number; cat_rel: number
}

interface Dept {
  _id: string; gmv: number; count: number; ministry?: string
}

interface Opportunity {
  product: string; gmv: number; count: number; opp_score: number
  tag?: string; sellers?: number; depts?: number
}

// ── stat card ─────────────────────────────────────────────────────────────────
function Stat({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color ?? "text-gray-900"}`}>{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  )
}

// ── tag badge ─────────────────────────────────────────────────────────────────
function Tag({ t }: { t?: string }) {
  const map: Record<string, string> = {
    core:     "bg-green-100 text-green-800",
    health:   "bg-blue-100 text-blue-800",
    municipal:"bg-yellow-100 text-yellow-800",
    defense:  "bg-red-100 text-red-800",
    adjacent: "bg-gray-100 text-gray-700",
    general:  "bg-gray-100 text-gray-700",
  }
  if (!t) return null
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[t] ?? map.general}`}>{t}</span>
}

// ── score bar ─────────────────────────────────────────────────────────────────
function ScoreBar({ v }: { v: number }) {
  const color = v >= 70 ? "bg-green-500" : v >= 40 ? "bg-yellow-400" : "bg-gray-300"
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${v}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-7 text-right">{v}</span>
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────
export function ProcurementTab() {
  const [tab, setTab] = useState<Tab>("overview")
  const [loading, setLoading] = useState(false)

  // overview
  const [overview, setOverview] = useState<Overview | null>(null)
  const [oppOverview, setOppOverview] = useState<OppOverview | null>(null)

  // contracts
  const [contracts, setContracts] = useState<Contract[]>([])
  const [contractQ, setContractQ] = useState("")
  const [expanded, setExpanded] = useState<string | null>(null)

  // sellers
  const [sellers, setSellers] = useState<Seller[]>([])

  // dealer targets
  const [targets, setTargets] = useState<Target[]>([])
  const [targetTotal, setTargetTotal] = useState(0)

  // depts
  const [depts, setDepts] = useState<Dept[]>([])

  // opportunities
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])

  // ── loaders ──────────────────────────────────────────────────────────────
  const loadOverview = useCallback(async () => {
    setLoading(true)
    const [ov, oov] = await Promise.all([
      fetch("/api/admin/procurement/contracts?section=overview").then(r => r.json()).catch(() => null),
      fetch("/api/admin/procurement/opportunity?section=overview").then(r => r.json()).catch(() => null),
    ])
    setOverview(ov)
    setOppOverview(oov)
    setLoading(false)
  }, [])

  const loadContracts = useCallback(async (q = "") => {
    setLoading(true)
    const url = `/api/admin/procurement/contracts?section=contracts_list${q.length >= 2 ? `&q=${encodeURIComponent(q)}` : ""}`
    const data = await fetch(url).then(r => r.json()).catch(() => ({ contracts: [] }))
    setContracts(data.contracts || [])
    setLoading(false)
  }, [])

  const loadSellers = useCallback(async () => {
    setLoading(true)
    const data = await fetch("/api/admin/procurement/contracts?section=sellers_by_gmv&limit=50").then(r => r.json()).catch(() => ({ rows: [] }))
    setSellers(data.rows || [])
    setLoading(false)
  }, [])

  const loadTargets = useCallback(async () => {
    setLoading(true)
    const data = await fetch("/api/admin/procurement/opportunity?section=dealer_targets&limit=100").then(r => r.json()).catch(() => ({ targets: [] }))
    setTargets(data.targets || [])
    setTargetTotal(data.total_new_sellers || 0)
    setLoading(false)
  }, [])

  const loadDepts = useCallback(async () => {
    setLoading(true)
    const data = await fetch("/api/admin/procurement/contracts?section=depts_by_spend&limit=50").then(r => r.json()).catch(() => ({ rows: [] }))
    setDepts(data.rows || [])
    setLoading(false)
  }, [])

  const loadOpportunities = useCallback(async () => {
    setLoading(true)
    const data = await fetch("/api/admin/procurement/opportunity?section=product_opportunities").then(r => r.json()).catch(() => ({ opportunities: [] }))
    setOpportunities(data.opportunities || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    if (tab === "overview")      loadOverview()
    if (tab === "contracts")     loadContracts(contractQ)
    if (tab === "sellers")       loadSellers()
    if (tab === "dealers")       loadTargets()
    if (tab === "depts")         loadDepts()
    if (tab === "opportunities") loadOpportunities()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  // contract search with debounce
  useEffect(() => {
    if (tab !== "contracts") return
    const t = setTimeout(() => loadContracts(contractQ), 400)
    return () => clearTimeout(t)
  }, [contractQ, tab, loadContracts])

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview",      label: "Overview" },
    { id: "contracts",     label: `Contracts${overview ? ` (${overview.total.toLocaleString("en-IN")})` : ""}` },
    { id: "sellers",       label: "Top Sellers" },
    { id: "dealers",       label: `Dealer Targets${targetTotal ? ` (${targetTotal})` : ""}` },
    { id: "depts",         label: "Departments" },
    { id: "opportunities", label: "Opportunities" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">GeM Procurement Intelligence</h2>
          <p className="text-sm text-gray-500 mt-1">
            {overview ? `${overview.total.toLocaleString("en-IN")} contracts · ${cr(overview.total_gmv)} GMV · 3-year historical` : "Loading…"}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => {
          if (tab === "overview")      loadOverview()
          if (tab === "contracts")     loadContracts(contractQ)
          if (tab === "sellers")       loadSellers()
          if (tab === "dealers")       loadTargets()
          if (tab === "depts")         loadDepts()
          if (tab === "opportunities") loadOpportunities()
        }} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              tab === t.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ─────────────────────────────────────────────────────────── */}
      {tab === "overview" && (
        <div className="space-y-6">
          {loading && !overview && <p className="text-gray-400 text-sm">Loading…</p>}

          {overview && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Stat label="Total Contracts" value={overview.total.toLocaleString("en-IN")} color="text-blue-700" />
                <Stat label="Total GMV" value={cr(overview.total_gmv)} color="text-green-700" />
                <Stat label="Enriched" value={`${overview.enriched.toLocaleString("en-IN")}`} sub={pct(overview.enriched, overview.total)} />
                <Stat label="Pending Enrich" value={overview.pending.toLocaleString("en-IN")} />
              </div>

              {oppOverview && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Stat label="New Sellers" value={oppOverview.new_sellers.toLocaleString("en-IN")} sub="not in dealer DB" color="text-purple-700" />
                  <Stat label="High-Value (≥₹10L)" value={oppOverview.high_value_contracts.toLocaleString("en-IN")} />
                  <Stat label="Fogging-Adjacent" value={oppOverview.fogging_contracts.toLocaleString("en-IN")} />
                  <Stat label="Coverage" value={`${oppOverview.coverage_pct}%`} sub="enriched" />
                </div>
              )}

              {/* Enrichment progress bar */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-gray-700">Enrichment progress</span>
                  <span className="text-gray-500">{overview.enriched.toLocaleString("en-IN")} / {overview.total.toLocaleString("en-IN")}</span>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${overview.pct_enriched}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>Enriched: {overview.pct_enriched}%</span>
                  {overview.failed > 0 && <span className="text-red-500">Failed: {overview.failed}</span>}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── CONTRACTS ────────────────────────────────────────────────────────── */}
      {tab === "contracts" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                className="pl-9"
                placeholder="Search by GEMC, seller, dept, product…"
                value={contractQ}
                onChange={e => setContractQ(e.target.value)}
              />
            </div>
            {loading && <span className="text-xs text-gray-400 self-center">Loading…</span>}
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2 text-left">GEMC No</th>
                  <th className="px-3 py-2 text-left">Seller</th>
                  <th className="px-3 py-2 text-left">Department</th>
                  <th className="px-3 py-2 text-left">Product</th>
                  <th className="px-3 py-2 text-right">Value</th>
                  <th className="px-3 py-2 text-left">State</th>
                  <th className="px-3 py-2 text-center">Enriched</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {contracts.length === 0 && !loading && (
                  <tr><td colSpan={7} className="py-8 text-center text-gray-400">No contracts found</td></tr>
                )}
                {contracts.map(c => (
                  <React.Fragment key={c.gemc_no}>
                    <tr
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setExpanded(expanded === c.gemc_no ? null : c.gemc_no)}
                    >
                      <td className="px-3 py-2 font-mono text-xs text-blue-700">{c.gemc_no}</td>
                      <td className="px-3 py-2 max-w-[160px] truncate">{c.seller_name_canonical || "—"}</td>
                      <td className="px-3 py-2 max-w-[160px] truncate text-gray-600">{c.dept_name || "—"}</td>
                      <td className="px-3 py-2 max-w-[160px] truncate text-gray-600">{c.product_name || "—"}</td>
                      <td className="px-3 py-2 text-right font-medium tabular-nums">{cr(c.contract_value_num ?? 0)}</td>
                      <td className="px-3 py-2 text-gray-500">{c.seller_state || c.state || "—"}</td>
                      <td className="px-3 py-2 text-center">
                        {c.detail_scraped
                          ? <span className="text-green-600 text-xs">✓</span>
                          : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                    </tr>
                    {expanded === c.gemc_no && (
                      <tr className="bg-blue-50">
                        <td colSpan={7} className="px-4 py-3">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs text-gray-600">
                            <div><span className="font-medium">Ministry:</span> {c.ministry || "—"}</div>
                            <div><span className="font-medium">Buyer:</span> {c.buyer_name || "—"}</div>
                            <div><span className="font-medium">GST:</span> {c.seller_gst || "—"}</div>
                            <div><span className="font-medium">Status:</span> {c.contract_status || "—"}</div>
                            <div><span className="font-medium">Mode:</span> {c.buying_mode || "—"}</div>
                            <div><span className="font-medium">Date:</span> {c.contract_date_dt ? new Date(c.contract_date_dt).toLocaleDateString("en-IN") : "—"}</div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
          {contracts.length === 500 && (
            <p className="text-xs text-gray-400 text-center">Showing top 500 by value — use search to filter</p>
          )}
        </div>
      )}

      {/* ── TOP SELLERS ───────────────────────────────────────────────────────── */}
      {tab === "sellers" && (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          {loading && sellers.length === 0 && <p className="py-8 text-center text-gray-400 text-sm">Loading…</p>}
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-3 py-2 text-left w-8">#</th>
                <th className="px-3 py-2 text-left">Seller</th>
                <th className="px-3 py-2 text-right">GMV</th>
                <th className="px-3 py-2 text-right">Contracts</th>
                <th className="px-3 py-2 text-left">State</th>
                <th className="px-3 py-2 text-left">GSTIN</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sellers.map((s, i) => (
                <tr key={s._id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-400 text-xs">{i + 1}</td>
                  <td className="px-3 py-2 font-medium max-w-[200px] truncate">{s._id}</td>
                  <td className="px-3 py-2 text-right font-medium tabular-nums text-green-700">{cr(s.gmv)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-600">{s.count}</td>
                  <td className="px-3 py-2 text-gray-500 text-xs">{s.state || "—"}</td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-400">{s.gstin || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── DEALER TARGETS ────────────────────────────────────────────────────── */}
      {tab === "dealers" && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            {targetTotal} new sellers not yet in dealer DB — ranked by acquisition score (GMV × contact quality × category fit × geographic spread)
          </p>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            {loading && targets.length === 0 && <p className="py-8 text-center text-gray-400 text-sm">Loading…</p>}
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2 text-left w-8">#</th>
                  <th className="px-3 py-2 text-left">Seller</th>
                  <th className="px-3 py-2 text-right">GMV</th>
                  <th className="px-3 py-2 text-center">Score</th>
                  <th className="px-3 py-2 text-left">Phone</th>
                  <th className="px-3 py-2 text-left">Email</th>
                  <th className="px-3 py-2 text-left">State</th>
                  <th className="px-3 py-2 text-right">States</th>
                  <th className="px-3 py-2 text-right">Depts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {targets.map((t, i) => (
                  <tr key={t.name} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-3 py-2 font-medium max-w-[180px] truncate">
                      <div className="truncate">{t.name}</div>
                      {t.msme && <div className="text-xs text-gray-400">{t.msme}</div>}
                    </td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums text-green-700">{cr(t.gmv)}</td>
                    <td className="px-3 py-2 w-24"><ScoreBar v={t.score} /></td>
                    <td className="px-3 py-2 text-xs font-mono text-blue-600">{t.phone || <span className="text-gray-300">—</span>}</td>
                    <td className="px-3 py-2 text-xs max-w-[140px] truncate text-gray-600">{t.email || <span className="text-gray-300">—</span>}</td>
                    <td className="px-3 py-2 text-xs text-gray-500">{t.state || "—"}</td>
                    <td className="px-3 py-2 text-right text-xs text-gray-500">{t.states}</td>
                    <td className="px-3 py-2 text-right text-xs text-gray-500">{t.depts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── DEPARTMENTS ───────────────────────────────────────────────────────── */}
      {tab === "depts" && (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          {loading && depts.length === 0 && <p className="py-8 text-center text-gray-400 text-sm">Loading…</p>}
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-3 py-2 text-left w-8">#</th>
                <th className="px-3 py-2 text-left">Department</th>
                <th className="px-3 py-2 text-left">Ministry</th>
                <th className="px-3 py-2 text-right">GMV</th>
                <th className="px-3 py-2 text-right">Contracts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {depts.map((d, i) => (
                <tr key={d._id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-400 text-xs">{i + 1}</td>
                  <td className="px-3 py-2 font-medium max-w-[240px] truncate">{d._id}</td>
                  <td className="px-3 py-2 text-xs text-gray-500 max-w-[180px] truncate">{d.ministry || "—"}</td>
                  <td className="px-3 py-2 text-right font-medium tabular-nums text-green-700">{cr(d.gmv)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-600">{d.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── OPPORTUNITIES ─────────────────────────────────────────────────────── */}
      {tab === "opportunities" && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Products scoring highest on opportunity score — high GMV × category relevance × seller fragmentation
          </p>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            {loading && opportunities.length === 0 && <p className="py-8 text-center text-gray-400 text-sm">Loading…</p>}
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2 text-left w-8">#</th>
                  <th className="px-3 py-2 text-left">Product</th>
                  <th className="px-3 py-2 text-left">Tag</th>
                  <th className="px-3 py-2 text-right">GMV</th>
                  <th className="px-3 py-2 text-right">Contracts</th>
                  <th className="px-3 py-2 text-right">Sellers</th>
                  <th className="px-3 py-2 text-center w-32">Opp. Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {opportunities.map((o, i) => (
                  <tr key={o.product} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-3 py-2 font-medium max-w-[240px] truncate">{o.product}</td>
                    <td className="px-3 py-2"><Tag t={o.tag} /></td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums text-green-700">{cr(o.gmv)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-600">{o.count}</td>
                    <td className="px-3 py-2 text-right text-gray-500 text-xs">{o.sellers ?? "—"}</td>
                    <td className="px-3 py-2 w-32"><ScoreBar v={o.opp_score} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
