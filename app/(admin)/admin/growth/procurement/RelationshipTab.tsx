"use client"
import { useState } from "react"
import {
  Search, Users, Building2, Package, Map, ArrowRight,
  ChevronRight, Loader2, Home,
} from "lucide-react"

// ─── Types ─────────────────────────────────────────────────────────────────────

type EntityType = "dealer" | "dept" | "product"

interface Connection {
  name:           string
  total_gmv:      number
  contract_count: number
  state_count?:   number
  dept_count?:    number
  product_count?: number
  seller_count?:  number
}

interface RelResult {
  type:             EntityType
  name:             string
  total_gmv:        number
  total_contracts:  number
  products?:        Connection[]
  departments?:     Connection[]
  states?:          Connection[]
  dealers?:         Connection[]
  recent_contracts?:{ gemc_no: string; product_name: string; dept_name: string; contract_value_num: number; contract_date_dt: string }[]
}

interface ExploreData {
  top_dealers:   { dealer: string; total_gmv: number; total_contracts: number; dealer_score: number }[]
  top_depts:     { dept: string; total_gmv: number; total_contracts: number; ministry: string }[]
  top_products:  { product: string; total_gmv: number; total_contracts: number; growth_rate: number }[]
}

type NavEntry = { type: EntityType; name: string }

// ─── Format helpers ─────────────────────────────────────────────────────────────

function fmtInr(n: number | null | undefined): string {
  if (!n) return "—"
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(1)} Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(0)} K`
  return `₹${n.toLocaleString("en-IN")}`
}

// ─── EntityType icon ───────────────────────────────────────────────────────────

function TypeIcon({ type }: { type: EntityType }) {
  if (type === "dealer")  return <Users size={13} className="text-teal-600" />
  if (type === "dept")    return <Building2 size={13} className="text-purple-600" />
  return <Package size={13} className="text-amber-600" />
}

function TypeBg(type: EntityType): string {
  if (type === "dealer")  return "bg-teal-50 border-teal-200"
  if (type === "dept")    return "bg-purple-50 border-purple-200"
  return "bg-amber-50 border-amber-200"
}

// ─── Connection list ────────────────────────────────────────────────────────────

function ConnectionList({ title, icon: Icon, items, type, onNavigate }: {
  title: string
  icon: React.ElementType
  items: Connection[]
  type: EntityType
  onNavigate: (type: EntityType, name: string) => void
}) {
  if (!items || items.length === 0) return null
  return (
    <div className="space-y-1">
      <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium flex items-center gap-1.5">
        <Icon size={10} />{title} ({items.length})
      </p>
      <div className="space-y-0.5">
        {items.slice(0, 15).map((item, i) => (
          <button
            key={i}
            onClick={() => onNavigate(type, item.name)}
            className="w-full flex items-center justify-between text-left px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors group">
            <span className="text-xs text-gray-700 group-hover:text-brand-600 truncate mr-2">
              {item.name || "—"}
            </span>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-[10px] text-gray-400">{fmtInr(item.total_gmv)}</span>
              <ChevronRight size={10} className="text-gray-300 group-hover:text-brand-500" />
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Main Tab ───────────────────────────────────────────────────────────────────

export function RelationshipTab({ onDealerClick }: { onDealerClick?: (name: string) => void }) {
  const [query, setQuery]         = useState("")
  const [entityType, setEntityType] = useState<EntityType>("dealer")
  const [loading, setLoading]     = useState(false)
  const [result, setResult]       = useState<RelResult | null>(null)
  const [explore, setExplore]     = useState<ExploreData | null>(null)
  const [exploreLoading, setExploreLoading] = useState(false)
  const [nav, setNav]             = useState<NavEntry[]>([])

  // Load explore data on mount
  const loadExplore = () => {
    setExploreLoading(true)
    fetch("/api/admin/procurement/relationships")
      .then(r => r.json())
      .then(d => { setExplore(d); setExploreLoading(false) })
      .catch(() => setExploreLoading(false))
  }

  const navigate = (type: EntityType, name: string) => {
    setLoading(true)
    setResult(null)
    fetch(`/api/admin/procurement/relationships?type=${type}&name=${encodeURIComponent(name)}`)
      .then(r => r.json())
      .then(d => {
        setResult(d)
        setNav(prev => [...prev.filter(n => !(n.type === type && n.name === name)), { type, name }])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  const search = () => {
    if (!query.trim()) return
    navigate(entityType, query.trim())
  }

  const goHome = () => {
    setResult(null)
    setNav([])
    if (!explore) loadExplore()
  }

  // Load explore on first render
  if (!explore && !exploreLoading && !result) { loadExplore() }

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm space-y-3">
        <p className="text-sm font-semibold text-gray-800">Relationship Explorer</p>

        <div className="flex gap-2">
          {/* Entity type tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 flex-shrink-0">
            {(["dealer", "dept", "product"] as EntityType[]).map(t => (
              <button key={t} onClick={() => setEntityType(t)}
                className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
                  entityType === t ? "bg-white shadow-sm text-gray-800" : "text-gray-500 hover:text-gray-700"
                }`}>
                <TypeIcon type={t} />
                {t === "dealer" ? "Dealer" : t === "dept" ? "Department" : "Product"}
              </button>
            ))}
          </div>

          {/* Search input */}
          <div className="flex-1 flex gap-2">
            <div className="flex-1 relative">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && search()}
                placeholder={`Search by ${entityType} name…`}
                className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-brand-400" />
            </div>
            <button onClick={search} disabled={loading || !query.trim()}
              className="px-4 py-2 bg-brand-600 text-white rounded-lg text-xs font-medium disabled:opacity-40 hover:bg-brand-700 transition-colors flex items-center gap-1.5">
              {loading ? <Loader2 size={11} className="animate-spin" /> : <ArrowRight size={11} />}
              Explore
            </button>
          </div>
        </div>

        {/* Breadcrumb navigation */}
        {nav.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap text-xs text-gray-400">
            <button onClick={goHome} className="hover:text-gray-700 flex items-center gap-1">
              <Home size={10} />Home
            </button>
            {nav.map((entry, i) => (
              <span key={i} className="flex items-center gap-1">
                <ChevronRight size={10} />
                <button
                  onClick={() => navigate(entry.type, entry.name)}
                  className={`hover:text-brand-600 transition-colors ${i === nav.length - 1 ? "text-gray-700 font-medium" : ""}`}>
                  {entry.name.length > 30 ? entry.name.slice(0, 28) + "…" : entry.name}
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 size={18} className="animate-spin text-brand-500" />
        </div>
      )}

      {/* Entity result */}
      {result && !loading && (
        <div className="space-y-3">
          {/* Entity header */}
          <div className={`border rounded-xl px-4 py-3 ${TypeBg(result.type)}`}>
            <div className="flex items-center gap-2">
              <TypeIcon type={result.type} />
              <div>
                <p className="text-sm font-semibold text-gray-800">{result.name}</p>
                <p className="text-xs text-gray-500">
                  {fmtInr(result.total_gmv)} GMV · {result.total_contracts} contracts
                </p>
              </div>
              {result.type === "dealer" && onDealerClick && (
                <button onClick={() => onDealerClick(result.name)}
                  className="ml-auto text-xs text-brand-600 hover:text-brand-700 underline">
                  Open dealer profile →
                </button>
              )}
            </div>
          </div>

          {/* Connections grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {result.products && (
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <ConnectionList title="Products" icon={Package}
                  items={result.products} type="product" onNavigate={navigate} />
              </div>
            )}
            {result.departments && (
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <ConnectionList title="Departments" icon={Building2}
                  items={result.departments} type="dept" onNavigate={navigate} />
              </div>
            )}
            {result.dealers && (
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <ConnectionList title="Dealers" icon={Users}
                  items={result.dealers} type="dealer" onNavigate={navigate} />
              </div>
            )}
            {result.states && result.states.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide font-medium flex items-center gap-1.5 mb-1">
                  <Map size={10} />States ({result.states.length})
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {result.states.map((s, i) => (
                    <span key={i} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {s.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Recent contracts */}
          {result.recent_contracts && result.recent_contracts.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-700">Recent Contracts</p>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {["Contract #", "Product", "Department", "Value", "Date"].map(h => (
                      <th key={h} className="text-left px-3 py-2 text-gray-400 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {result.recent_contracts.map((c, i) => (
                    <tr key={i} className="hover:bg-gray-50/50">
                      <td className="px-3 py-2 font-mono text-gray-500 text-[10px]">{c.gemc_no?.slice(0, 22)}</td>
                      <td className="px-3 py-2 text-gray-700 max-w-[150px] truncate">{c.product_name || "—"}</td>
                      <td className="px-3 py-2 text-gray-600 max-w-[150px] truncate">{c.dept_name || "—"}</td>
                      <td className="px-3 py-2 font-medium text-orange-600">{fmtInr(c.contract_value_num)}</td>
                      <td className="px-3 py-2 text-gray-400">
                        {c.contract_date_dt ? new Date(c.contract_date_dt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" }) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Explore home: top entities */}
      {!result && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Top dealers */}
          <div className="bg-white border border-teal-100 rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100 bg-teal-50">
              <p className="text-xs font-semibold text-teal-800 flex items-center gap-1.5">
                <Users size={12} />Top Dealers by Score
              </p>
            </div>
            <div className="divide-y divide-gray-50">
              {exploreLoading ? (
                <div className="flex justify-center py-8"><Loader2 size={14} className="animate-spin text-gray-300" /></div>
              ) : (explore?.top_dealers || []).map((d, i) => (
                <button key={i} onClick={() => navigate("dealer", d.dealer)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-gray-50 transition-colors text-left group">
                  <span className="text-gray-700 group-hover:text-brand-600 truncate mr-2">{d.dealer}</span>
                  <span className="text-gray-400 flex-shrink-0 font-medium">{d.dealer_score}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Top departments */}
          <div className="bg-white border border-purple-100 rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100 bg-purple-50">
              <p className="text-xs font-semibold text-purple-800 flex items-center gap-1.5">
                <Building2 size={12} />Top Departments by GMV
              </p>
            </div>
            <div className="divide-y divide-gray-50">
              {exploreLoading ? (
                <div className="flex justify-center py-8"><Loader2 size={14} className="animate-spin text-gray-300" /></div>
              ) : (explore?.top_depts || []).map((d, i) => (
                <button key={i} onClick={() => navigate("dept", d.dept)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-gray-50 transition-colors text-left group">
                  <span className="text-gray-700 group-hover:text-brand-600 truncate mr-2">{d.dept}</span>
                  <span className="text-gray-400 flex-shrink-0">{fmtInr(d.total_gmv)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Top products */}
          <div className="bg-white border border-amber-100 rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100 bg-amber-50">
              <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
                <Package size={12} />Top Products by GMV
              </p>
            </div>
            <div className="divide-y divide-gray-50">
              {exploreLoading ? (
                <div className="flex justify-center py-8"><Loader2 size={14} className="animate-spin text-gray-300" /></div>
              ) : (explore?.top_products || []).map((p, i) => (
                <button key={i} onClick={() => navigate("product", p.product)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-gray-50 transition-colors text-left group">
                  <span className="text-gray-700 group-hover:text-brand-600 truncate mr-2">{p.product}</span>
                  <span className="text-gray-400 flex-shrink-0">{fmtInr(p.total_gmv)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
