"use client"
import { useEffect, useState, useCallback } from "react"
import {
  FileSearch, Users, Map, RefreshCw,
  TrendingUp, Building2, Search, X,
  BarChart3, PlusCircle, Download, HardDrive, Zap, Sparkles,
} from "lucide-react"
import { CollectTab }      from "./CollectTab"
import { BatchTab }        from "./BatchTab"
import { DealerPanel }     from "./DealerPanel"
import { BidPanel }        from "./BidPanel"
import { BuyersTab }       from "./BuyersTab"
import { TargetsTab }      from "./TargetsTab"
import { ReportTab }       from "./ReportTab"
import { ContractsTab }    from "./ContractsTab"
import { StorageTab }      from "./StorageTab"
import { OpportunityTab }  from "./OpportunityTab"
import { AiAnalystTab }    from "./AiAnalystTab"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Stats {
  total_contracts:    number
  enriched_contracts: number
  pct_enriched:       number
  total_gmv:          number
  total_dealers:      number
  states_covered:     number
  dept_coverage:      number
  last_sync:          string | null
  // legacy
  total_bids:      number
  defence_count:   number
  municipal_count: number
}

interface GemBid {
  _id:        string
  bid_number: string
  page_id:    number
  variant:    string
  keyword:    string
  dept:       string
  state:      string | null
  l1_name:    string
  l2_name:    string | null
  l3_name:    string | null
  l1_price:   string | null
  est_value:  string | null
  updated_at: string
}

interface BidFilters { keywords: string[]; variants: string[]; depts: string[] }

interface GemDealer {
  name:          string
  l1_wins:       number
  l2_count:      number
  l3_count:      number
  departments:   string[]
  states:        string[]
  bid_count:     number
  is_100x_dealer:boolean
  aliases:       string[]
}

interface StateRow {
  state:       string
  bid_count:   number
  top_dealers: { name: string; wins: number }[]
  dept_count:  number
}

interface IntelSummary {
  total_bids:    number
  total_dealers: number
  defence_bids:  number
  municipal_bids:number
  other_bids:    number
  last_sync:     string | null
}

interface TopDealer {
  name:          string
  l1_wins:       number
  l2_count:      number
  l3_count:      number
  departments:   string[]
  states:        string[]
  dept_count:    number
  state_count:   number
  score:         number
  is_100x_dealer:boolean
  bid_count:     number
}

interface AuthTarget {
  name:         string
  l1_wins:      number
  departments:  string[]
  states:       string[]
  dept_count:   number
  state_count:  number
  score:        number
  aliases:      string[]
}

interface DeptRow {
  dept:    string
  count:   number
  segment: "defence" | "municipal" | "other"
}

interface IntelData {
  summary:              IntelSummary
  top_dealers:          TopDealer[]
  auth_targets:         AuthTarget[]
  dept_distribution:    DeptRow[]
  keyword_distribution: { keyword: string; count: number }[]
  variant_distribution: { variant: string; count: number }[]
}

type Tab = "ai-analyst" | "intelligence" | "contracts" | "storage" | "opportunity" | "bids" | "dealers" | "heatmap" | "buyers" | "targets" | "report" | "batch" | "collect"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })
}

function fmtSync(d: string | null) {
  if (!d) return "never"
  const dt = new Date(d)
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    + " " + dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
}

function Pill({ c, children }: { c: string; children: React.ReactNode }) {
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${c}`}>{children}</span>
}

function SegBadge({ seg }: { seg: string }) {
  if (seg === "defence")   return <Pill c="bg-red-100 text-red-700">Defence</Pill>
  if (seg === "municipal") return <Pill c="bg-blue-100 text-blue-700">Municipal</Pill>
  return <Pill c="bg-gray-100 text-gray-500">Other</Pill>
}

const VARIANT_COLOR: Record<string, string> = {
  "D-PMA-Awarded": "bg-purple-100 text-purple-700",
  "C-RA-Awarded":  "bg-amber-100 text-amber-700",
  "B-Awarded":     "bg-green-100 text-green-700",
  "A-ProductTable":"bg-blue-100 text-blue-700",
}

// ─── INTELLIGENCE TAB ─────────────────────────────────────────────────────────

function IntelligenceTab({ onDealerClick }: { onDealerClick: (name: string) => void }) {
  const [data, setData]       = useState<IntelData | null>(null)
  const [loading, setLoading] = useState(true)
  const [section, setSection] = useState<"dealers" | "targets" | "depts">("dealers")

  useEffect(() => {
    fetch("/api/admin/procurement/intelligence")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex justify-center py-24">
      <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!data) return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-sm text-red-700">
      Failed to load intelligence data.
    </div>
  )

  const { summary, top_dealers, auth_targets, dept_distribution, keyword_distribution, variant_distribution } = data
  const defPct = summary.total_bids > 0 ? Math.round(100 * summary.defence_bids  / summary.total_bids) : 0
  const munPct = summary.total_bids > 0 ? Math.round(100 * summary.municipal_bids / summary.total_bids) : 0
  const othPct = 100 - defPct - munPct

  return (
    <div className="space-y-5">
      {/* Diagnostics bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-wrap items-center gap-4 text-xs text-gray-600">
        <span className="font-semibold text-gray-800">{summary.total_bids.toLocaleString()} awarded bids</span>
        <span className="text-gray-300">|</span>
        <span className="font-semibold text-gray-800">{summary.total_dealers.toLocaleString()} canonical dealers</span>
        <span className="text-gray-300">|</span>
        <span>Defence: <strong className="text-red-600">{summary.defence_bids}</strong></span>
        <span>Municipal: <strong className="text-blue-600">{summary.municipal_bids}</strong></span>
        <span>Other: <strong className="text-gray-600">{summary.other_bids}</strong></span>
        <span className="text-gray-300">|</span>
        <span className="text-gray-400">Last sync: {fmtSync(summary.last_sync)}</span>
        <span className="ml-auto text-[10px] text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded-full">Live from MongoDB</span>
      </div>

      {/* Segment cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Defence",        count: summary.defence_bids,   pct: defPct, color: "border-red-200",  text: "text-red-600",  bar: "bg-red-500"  },
          { label: "Municipal / ULB",count: summary.municipal_bids, pct: munPct, color: "border-blue-200", text: "text-blue-600", bar: "bg-blue-500" },
          { label: "Other Govt.",    count: summary.other_bids,     pct: othPct, color: "border-gray-200", text: "text-gray-600", bar: "bg-gray-400" },
        ].map(s => (
          <div key={s.label} className={`bg-white rounded-xl border ${s.color} p-4 shadow-sm`}>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.text}`}>{s.count}</p>
            <div className="mt-2 w-full bg-gray-100 rounded-full h-1.5">
              <div className={`h-1.5 rounded-full ${s.bar}`} style={{ width: `${s.pct}%` }} />
            </div>
            <p className="text-[10px] text-gray-400 mt-1">{s.pct}% of awarded bids</p>
          </div>
        ))}
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {([
          { id: "dealers", label: "Top L1 Winners"      },
          { id: "targets", label: "OEM Auth Targets"    },
          { id: "depts",   label: "Department Breakdown"},
        ] as const).map(s => (
          <button key={s.id} onClick={() => setSection(s.id)}
            className={`text-xs px-4 py-1.5 rounded-md font-medium transition-colors ${
              section === s.id ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Top L1 Winners */}
      {section === "dealers" && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h3 className="text-xs font-semibold text-gray-700">Top 30 L1 Winners — government fogging procurement (2024–2026)</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">Click a dealer name to open the detail + CRM view.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {["#","Dealer","L1","L2","L3","Depts","States","Score","100X?"].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {top_dealers.map((d, i) => {
                  const maxWins = top_dealers[0]?.l1_wins || 1
                  return (
                    <tr key={d.name} className={`hover:bg-gray-50/50 ${d.is_100x_dealer ? "bg-green-50/30" : ""}`}>
                      <td className="px-3 py-2.5 text-gray-400 w-8">{i + 1}</td>
                      <td className="px-3 py-2.5 max-w-[200px]">
                        <button onClick={() => onDealerClick(d.name)}
                          className="font-medium text-gray-800 hover:text-brand-600 hover:underline text-left truncate block max-w-[190px]"
                          title={d.name}>
                          {d.name}
                        </button>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-green-700">{d.l1_wins}</span>
                          <div className="w-12 bg-gray-100 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full bg-green-500"
                              style={{ width: `${Math.round((d.l1_wins / maxWins) * 100)}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-gray-500">{d.l2_count || "—"}</td>
                      <td className="px-3 py-2.5 text-gray-500">{d.l3_count || "—"}</td>
                      <td className="px-3 py-2.5 text-gray-600">{d.dept_count}</td>
                      <td className="px-3 py-2.5 text-gray-600">{d.state_count || "—"}</td>
                      <td className="px-3 py-2.5 font-bold text-brand-600">{d.score}</td>
                      <td className="px-3 py-2.5">
                        {d.is_100x_dealer
                          ? <Pill c="bg-green-100 text-green-700">Yes</Pill>
                          : <Pill c="bg-gray-100 text-gray-400">No</Pill>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* OEM Authorization Targets */}
      {section === "targets" && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h3 className="text-xs font-semibold text-gray-700">OEM Authorization Targets — non-100X dealers with ≥2 L1 wins</h3>
            <p className="text-[10px] text-gray-400 mt-0.5">Click dealer name to open CRM view and mark as contacted.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {["#","Dealer","Score","L1 Wins","Depts","States","Sample Depts"].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {auth_targets.map((d, i) => (
                  <tr key={d.name} className="hover:bg-amber-50/30">
                    <td className="px-3 py-2.5 text-gray-400 w-8">{i + 1}</td>
                    <td className="px-3 py-2.5 max-w-[200px]">
                      <button onClick={() => onDealerClick(d.name)}
                        className="font-medium text-gray-800 hover:text-brand-600 hover:underline text-left truncate block max-w-[190px]"
                        title={d.name}>
                        {d.name}
                      </button>
                      {d.aliases[0] && d.aliases[0] !== d.name && (
                        <div className="text-[10px] text-gray-400 truncate">Also: {d.aliases[0].slice(0, 35)}</div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 font-bold text-amber-600 text-sm">{d.score}</td>
                    <td className="px-3 py-2.5 font-bold text-green-700">{d.l1_wins}</td>
                    <td className="px-3 py-2.5 text-gray-700">{d.dept_count}</td>
                    <td className="px-3 py-2.5 text-gray-700">{d.state_count || "—"}</td>
                    <td className="px-3 py-2.5 max-w-[220px]">
                      <span className="text-[10px] text-gray-500 line-clamp-2">
                        {d.departments.slice(0, 3).join(" · ")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Department Breakdown */}
      {section === "depts" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {(["defence", "municipal", "other"] as const).map(seg => {
              const rows  = dept_distribution.filter(d => d.segment === seg)
              const total = rows.reduce((s, d) => s + d.count, 0)
              const colors = {
                defence:   { border: "border-red-200",  text: "text-red-600",  badge: "bg-red-100 text-red-700" },
                municipal: { border: "border-blue-200", text: "text-blue-600", badge: "bg-blue-100 text-blue-700" },
                other:     { border: "border-gray-200", text: "text-gray-600", badge: "bg-gray-100 text-gray-600" },
              }[seg]
              return (
                <div key={seg} className={`bg-white rounded-xl border ${colors.border} p-4 shadow-sm`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${colors.badge} capitalize`}>{seg}</span>
                    <span className={`text-xl font-bold ${colors.text}`}>{total}</span>
                  </div>
                  <p className="text-[10px] text-gray-400">{rows.length} unique departments</p>
                </div>
              )
            })}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <h3 className="text-xs font-semibold text-gray-700">All Departments ({dept_distribution.length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {["Department","Bids","Segment"].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-gray-400 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {dept_distribution.map(d => {
                    const maxCount = dept_distribution[0]?.count || 1
                    return (
                      <tr key={d.dept} className="hover:bg-gray-50/50">
                        <td className="px-4 py-2.5 text-gray-700 max-w-[320px] truncate" title={d.dept}>{d.dept}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-800 w-6 text-right">{d.count}</span>
                            <div className="w-24 bg-gray-100 rounded-full h-1.5">
                              <div className={`h-1.5 rounded-full ${d.segment === "defence" ? "bg-red-400" : d.segment === "municipal" ? "bg-blue-400" : "bg-gray-400"}`}
                                style={{ width: `${Math.round((d.count / maxCount) * 100)}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2.5"><SegBadge seg={d.segment} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <h4 className="text-xs font-semibold text-gray-700 mb-3">Keyword Coverage</h4>
              {keyword_distribution.map(k => (
                <div key={k.keyword} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                  <span className="text-xs text-gray-600">{k.keyword}</span>
                  <span className="text-xs font-semibold text-gray-800">{k.count} bids</span>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <h4 className="text-xs font-semibold text-gray-700 mb-3">Page Variant Distribution</h4>
              {variant_distribution.map(v => (
                <div key={v.variant} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${VARIANT_COLOR[v.variant ?? ""] || "bg-gray-100 text-gray-500"}`}>
                    {v.variant}
                  </span>
                  <span className="text-xs font-semibold text-gray-800">{v.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── BIDS TAB ─────────────────────────────────────────────────────────────────

function BidsTab({ onBidClick, onDealerClick }: {
  onBidClick: (bidNumber: string) => void
  onDealerClick: (name: string) => void
}) {
  const [bids, setBids]       = useState<GemBid[]>([])
  const [total, setTotal]     = useState(0)
  const [filters, setFilters] = useState<BidFilters>({ keywords: [], variants: [], depts: [] })
  const [keyword, setKeyword] = useState("")
  const [variant, setVariant] = useState("")
  const [search, setSearch]   = useState("")
  const [skip, setSkip]       = useState(0)
  const [loading, setLoading] = useState(true)
  const limit = 100

  const load = useCallback(async (s = skip) => {
    setLoading(true)
    const p = new URLSearchParams({ limit: String(limit), skip: String(s) })
    if (keyword) p.set("keyword", keyword)
    if (variant) p.set("variant", variant)
    if (search)  p.set("search",  search)
    const res = await fetch(`/api/admin/procurement/bids?${p}`).then(r => r.json())
    setBids(res.bids || [])
    setTotal(res.total || 0)
    if (res.filters) setFilters(res.filters)
    setLoading(false)
  }, [keyword, variant, search, skip])

  useEffect(() => { setSkip(0); load(0) }, [keyword, variant])
  useEffect(() => { load(skip) }, [skip])

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setSkip(0); load(0) }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-[10px] text-gray-400 uppercase tracking-wide block mb-1">Keyword</label>
            <select value={keyword} onChange={e => setKeyword(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 min-w-[140px]">
              <option value="">All Keywords</option>
              {filters.keywords.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-gray-400 uppercase tracking-wide block mb-1">Variant</label>
            <select value={variant} onChange={e => setVariant(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 min-w-[140px]">
              <option value="">All Variants</option>
              {filters.variants.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-[10px] text-gray-400 uppercase tracking-wide block mb-1">Search</label>
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Bid number, department, dealer…"
                className="text-xs border border-gray-200 rounded-lg pl-7 pr-3 py-1.5 w-full" />
            </div>
          </div>
          <button type="submit" className="text-xs bg-brand-600 text-white px-4 py-1.5 rounded-lg hover:bg-brand-700">Search</button>
          {(keyword || variant || search) && (
            <button type="button" onClick={() => { setKeyword(""); setVariant(""); setSearch("") }}
              className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1">
              <X size={12} />Clear
            </button>
          )}
        </form>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-500">{total.toLocaleString()} awarded bids — click a bid number to see detail, click a dealer name to open CRM</span>
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
            <p className="text-sm text-gray-400">No bids match this filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {["Bid Number","Department","State","Keyword","Variant","L1 Winner","L2","L3","Updated"].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {bids.map(b => (
                  <tr key={b._id || b.bid_number} className="hover:bg-gray-50/50">
                    <td className="px-3 py-2.5">
                      <button onClick={() => onBidClick(b.bid_number)}
                        className="font-mono text-[10px] text-brand-600 hover:underline text-left whitespace-nowrap">
                        {b.bid_number}
                      </button>
                    </td>
                    <td className="px-3 py-2.5 text-gray-700 max-w-[160px] truncate" title={b.dept}>{b.dept || "—"}</td>
                    <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{b.state || "—"}</td>
                    <td className="px-3 py-2.5">
                      <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{b.keyword}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${VARIANT_COLOR[b.variant] || "bg-gray-100 text-gray-500"}`}>
                        {b.variant}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 max-w-[140px]">
                      {b.l1_name
                        ? <button onClick={() => onDealerClick(b.l1_name)}
                            className="text-gray-700 font-medium hover:text-brand-600 hover:underline text-left truncate block max-w-[130px]"
                            title={b.l1_name}>{b.l1_name}</button>
                        : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-3 py-2.5 max-w-[110px]">
                      {b.l2_name
                        ? <button onClick={() => onDealerClick(b.l2_name!)}
                            className="text-gray-400 hover:text-brand-600 hover:underline text-left truncate block max-w-[100px]"
                            title={b.l2_name}>{b.l2_name}</button>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-2.5 max-w-[110px]">
                      {b.l3_name
                        ? <button onClick={() => onDealerClick(b.l3_name!)}
                            className="text-gray-400 hover:text-brand-600 hover:underline text-left truncate block max-w-[100px]"
                            title={b.l3_name}>{b.l3_name}</button>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-gray-400 whitespace-nowrap">{fmtDate(b.updated_at)}</td>
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

function DealersTab({ onDealerClick }: { onDealerClick: (name: string) => void }) {
  const [dealers, setDealers] = useState<GemDealer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState("")

  const load = () => {
    setLoading(true)
    fetch("/api/admin/procurement/dealers")
      .then(r => r.json())
      .then(d => { setDealers(d.dealers || []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = dealers.filter(d =>
    !search ||
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.departments.some(s => s.toLowerCase().includes(search.toLowerCase())) ||
    d.states.some(s => s.toLowerCase().includes(search.toLowerCase()))
  )

  const maxWins = Math.max(...dealers.map(d => d.l1_wins), 1)

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name, department, state…"
            className="text-xs border border-gray-200 rounded-lg pl-7 pr-3 py-1.5 w-full" />
        </div>
        <span className="text-xs text-gray-400">Click a dealer name to open the CRM panel.</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100">
          <span className="text-xs text-gray-500">{filtered.length.toLocaleString()} of {dealers.length.toLocaleString()} canonical dealers</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Users size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No dealers found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {["Dealer","L1","L2","L3","Bids","Departments","States","100X?"].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(d => (
                  <tr key={d.name} className={`hover:bg-gray-50/50 ${d.is_100x_dealer ? "bg-green-50/40" : ""}`}>
                    <td className="px-3 py-2.5 max-w-[220px]">
                      <button onClick={() => onDealerClick(d.name)}
                        className="font-medium text-gray-800 hover:text-brand-600 hover:underline text-left truncate block max-w-[210px]"
                        title={d.name}>{d.name}</button>
                      {d.aliases[0] && d.aliases[0] !== d.name && (
                        <div className="text-[10px] text-gray-400 truncate">{d.aliases[0].slice(0, 28)}</div>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-green-700 text-sm">{d.l1_wins}</span>
                        <div className="w-14 bg-gray-100 rounded-full h-1.5">
                          <div className="h-1.5 rounded-full bg-green-500"
                            style={{ width: `${Math.round((d.l1_wins / maxWins) * 100)}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-gray-500">{d.l2_count || "—"}</td>
                    <td className="px-3 py-2.5 text-gray-500">{d.l3_count || "—"}</td>
                    <td className="px-3 py-2.5 text-gray-500">{d.bid_count}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1 max-w-[160px]">
                        {d.departments.slice(0, 2).map(dep => (
                          <span key={dep} className="text-[10px] text-gray-500 truncate" title={dep}>{dep.slice(0, 18)}</span>
                        ))}
                        {d.departments.length > 2 && <span className="text-[10px] text-gray-400">+{d.departments.length - 2}</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {d.states.slice(0, 2).map(s => <Pill key={s} c="bg-blue-50 text-blue-600">{s.slice(0, 10)}</Pill>)}
                        {d.states.length > 2 && <span className="text-[10px] text-gray-400">+{d.states.length - 2}</span>}
                        {d.states.length === 0 && <span className="text-gray-300 text-[10px]">—</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      {d.is_100x_dealer
                        ? <Pill c="bg-green-100 text-green-700">Yes</Pill>
                        : <Pill c="bg-gray-100 text-gray-400">No</Pill>}
                    </td>
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

// ─── HEATMAP TAB ──────────────────────────────────────────────────────────────

function HeatMapTab({ onDealerClick }: { onDealerClick: (name: string) => void }) {
  const [data, setData]       = useState<{ states: StateRow[]; segment: { defence: number; municipal: number; other: number; total: number } } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/admin/procurement/heatmap")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const states = data?.states ?? []
  const seg    = data?.segment
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
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {seg && (
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: "Total Bids",     value: seg.total,     color: "text-gray-800",  border: "border-gray-200" },
                { label: "Defence",        value: seg.defence,   color: "text-red-600",   border: "border-red-200"  },
                { label: "Municipal / ULB",value: seg.municipal, color: "text-blue-600",  border: "border-blue-200" },
                { label: "Other Govt.",    value: seg.other,     color: "text-gray-600",  border: "border-gray-200" },
              ].map(s => (
                <div key={s.label} className={`bg-white rounded-xl border ${s.border} p-4 shadow-sm`}>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">{s.label}</p>
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                </div>
              ))}
            </div>
          )}

          {states.length === 0 ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-700">
              <strong>State coverage is limited (~21% of bids).</strong> Most defence bids do not expose state data on the result page. The segment breakdown above covers all 563 bids via department name.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                {states.map(s => (
                  <div key={s.state} className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-700 truncate">{s.state}</span>
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${heatColor(s.bid_count)}`} />
                    </div>
                    <p className="text-xl font-bold text-gray-900">{s.bid_count}</p>
                    <p className="text-[10px] text-gray-400">bids</p>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100">
                  <h3 className="text-xs font-semibold text-gray-700">State Detail ({states.length} states with data)</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        {["State","Bids","Top L1 Dealer","Depts"].map(h => (
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
                          <td className="px-4 py-3">
                            {s.top_dealers[0]
                              ? <button onClick={() => onDealerClick(s.top_dealers[0].name)}
                                  className="text-gray-700 hover:text-brand-600 hover:underline text-left">
                                  {s.top_dealers[0].name}
                                  <span className="text-gray-400 ml-1">({s.top_dealers[0].wins}W)</span>
                                </button>
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-gray-500">{s.dept_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function ProcurementIntelligence() {
  const [activeTab, setActiveTab]         = useState<Tab>("ai-analyst")
  const [stats, setStats]                 = useState<Stats | null>(null)
  const [selectedDealer, setSelectedDealer] = useState<string | null>(null)
  const [selectedBid, setSelectedBid]     = useState<string | null>(null)

  const loadStats = () => {
    fetch("/api/admin/procurement/stats").then(r => r.json()).then(setStats).catch(() => {})
  }

  useEffect(() => { loadStats() }, [])

  // When a dealer name is clicked from any tab or panel, canonicalize and open panel
  const handleDealerClick = useCallback((rawName: string) => {
    const canonical = rawName.toUpperCase()
      .replace(/^(M\/S\.?\s*|M\/S\s*|MS\s+|SH\.\s*|SMT\.\s*|MR\.\s*|DR\.\s*)/, "")
      .replace(/\s+/g, " ").trim()
    setSelectedBid(null)
    setSelectedDealer(canonical)
  }, [])

  const handleBidClick = useCallback((bidNumber: string) => {
    setSelectedBid(bidNumber)
  }, [])

  const TABS: { id: Tab; label: string; icon: React.ElementType; highlight?: boolean; group?: string }[] = [
    { id: "ai-analyst",   label: "AI Analyst",         icon: Sparkles,   highlight: true },
    { id: "intelligence", label: "Intelligence",        icon: BarChart3,  highlight: true },
    { id: "contracts",    label: "Contracts Intel",    icon: TrendingUp, highlight: true },
    { id: "opportunity",  label: "Opportunity Engine",  icon: Zap,        highlight: true },
    { id: "storage",      label: "PDF Storage",         icon: HardDrive },
    { id: "buyers",       label: "Buyer Profiles",     icon: Building2,  highlight: true },
    { id: "targets",      label: "Target Lists",       icon: TrendingUp, highlight: true },
    { id: "report",       label: "Sales Report",       icon: BarChart3,  highlight: true },
    { id: "bids",         label: "Bid Explorer",       icon: FileSearch },
    { id: "dealers",      label: "All Dealers",        icon: Users },
    { id: "heatmap",      label: "Procurement Map",    icon: Map },
    { id: "batch",        label: "Batch Collect",      icon: TrendingUp },
    { id: "collect",      label: "Single Bid",         icon: PlusCircle },
  ]

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-5 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 size={18} className="text-brand-600" />
            <div>
              <h1 className="text-base font-bold text-gray-900">Procurement Intelligence</h1>
              <p className="text-gray-400 text-[11px]">
                {stats
                  ? `${stats.total_contracts.toLocaleString("en-IN")} contracts · ₹${(stats.total_gmv / 1e7).toFixed(1)} Cr GMV · ${stats.total_dealers.toLocaleString("en-IN")} dealers · ${stats.dept_coverage} depts · 3-year historical`
                  : "GeM contracts intelligence · 3-year historical · dealer acquisition engine"
                }
              </p>
            </div>
          </div>
          <button onClick={loadStats}
            className="text-[11px] text-gray-400 hover:text-gray-700 flex items-center gap-1">
            <RefreshCw size={11} />Refresh
          </button>
        </div>
      </div>

      <div className="px-8 py-6 max-w-[1600px] space-y-6">
        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { label: "Contracts",     value: stats?.total_contracts?.toLocaleString("en-IN")    ?? "—", color: "text-gray-800",   border: "border-gray-200" },
            { label: "Total GMV",     value: stats ? `₹${(stats.total_gmv / 1e7).toFixed(1)} Cr` : "—", color: "text-orange-600",  border: "border-orange-200" },
            { label: "Enriched",      value: stats ? `${stats.enriched_contracts.toLocaleString("en-IN")} (${stats.pct_enriched}%)` : "—", color: "text-green-600",  border: "border-green-200" },
            { label: "Dealers",       value: stats?.total_dealers?.toLocaleString("en-IN")      ?? "—", color: "text-teal-600",   border: "border-teal-200" },
            { label: "States",        value: stats?.states_covered?.toString()                  ?? "—", color: "text-amber-600",  border: "border-amber-200"},
            { label: "Depts Covered", value: stats?.dept_coverage?.toString()                   ?? "—", color: "text-purple-600", border: "border-purple-200"},
            { label: "Last Seen",     value: stats?.last_sync ? fmtDate(stats.last_sync) : "—", color: "text-blue-600",  border: "border-blue-200" },
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
              <Icon size={12} />{label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "ai-analyst"   && <AiAnalystTab onDealerClick={handleDealerClick} />}
        {activeTab === "intelligence" && <IntelligenceTab onDealerClick={handleDealerClick} />}
        {activeTab === "contracts"    && <ContractsTab />}
        {activeTab === "opportunity"  && <OpportunityTab />}
        {activeTab === "storage"      && <StorageTab />}
        {activeTab === "buyers"       && <BuyersTab onDealerClick={handleDealerClick} />}
        {activeTab === "targets"      && <TargetsTab onDealerClick={handleDealerClick} />}
        {activeTab === "report"       && <ReportTab onDealerClick={handleDealerClick} />}
        {activeTab === "bids"         && <BidsTab onBidClick={handleBidClick} onDealerClick={handleDealerClick} />}
        {activeTab === "dealers"      && <DealersTab onDealerClick={handleDealerClick} />}
        {activeTab === "heatmap"      && <HeatMapTab onDealerClick={handleDealerClick} />}
        {activeTab === "batch"        && <BatchTab onSaved={loadStats} />}
        {activeTab === "collect"      && <CollectTab onSaved={loadStats} />}
      </div>

      {/* Dealer detail panel (slide-over) */}
      {selectedDealer && (
        <DealerPanel
          name={selectedDealer}
          onClose={() => setSelectedDealer(null)}
          onBidClick={handleBidClick}
          onRefreshList={loadStats}
        />
      )}

      {/* Bid detail modal (stacked above dealer panel) */}
      {selectedBid && (
        <BidPanel
          bidNumber={selectedBid}
          onClose={() => setSelectedBid(null)}
          onDealerClick={name => { setSelectedBid(null); setSelectedDealer(name) }}
        />
      )}
    </div>
  )
}
