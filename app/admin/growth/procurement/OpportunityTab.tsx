"use client"
import { useState, useEffect } from "react"
import {
  TrendingUp, Users, Package, Building2, Shuffle,
  ChevronDown, ChevronUp, Loader2, RefreshCw, AlertCircle,
  CheckCircle2, ArrowRight, Zap,
} from "lucide-react"

// ─── Types ─────────────────────────────────────────────────────────────────────

interface DealerRec {
  dealer:          string
  priority:        "A" | "B" | "C"
  score:           number
  total_gmv:       number
  total_contracts: number
  dept_count:      number
  state_count:     number
  product_count:   number
  active_years:    number
  why:             string[]
  action:          string
  top_products:    string[]
  top_depts:       string[]
}

interface ProductRec {
  product:          string
  opportunity_score:number
  total_gmv:        number
  total_contracts:  number
  dept_count:       number
  seller_count:     number
  growth_rate:      number
  fragmentation:    number
  route:            "Manufacture" | "OEM" | "Import" | "Monitor"
  why:              string[]
  evidence:         { demand_score:number; growth_score:number; fragmentation_score:number; value_score:number; reach_score:number }
}

interface DeptRec {
  dept:              string
  ministry:          string
  total_gmv:         number
  total_contracts:   number
  seller_count:      number
  vendor_concentration: number
  score:             number
  why:               string[]
  action:            string
  top_products:      string[]
}

interface CrossSellRec {
  dealer:            string
  fogging_gmv:       number
  adjacent_products: string[]
  adjacent_count:    number
  why:               string[]
  action:            string
}

interface RecsData {
  dealers:    DealerRec[]
  products:   ProductRec[]
  departments:DeptRec[]
  cross_sell: CrossSellRec[]
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function fmtInr(n: number | null | undefined) {
  if (!n) return "—"
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(1)} Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`
  return `₹${n.toLocaleString("en-IN")}`
}

function truncate(s: string, len = 40) {
  return s.length > len ? s.slice(0, len) + "…" : s
}

const PRIORITY_STYLE: Record<string, string> = {
  A: "bg-green-100 text-green-700 border-green-200",
  B: "bg-amber-100 text-amber-700 border-amber-200",
  C: "bg-gray-100 text-gray-500 border-gray-200",
}

const ROUTE_STYLE: Record<string, string> = {
  Manufacture: "bg-brand-100 text-brand-700 border-brand-200",
  OEM:         "bg-blue-100 text-blue-700 border-blue-200",
  Import:      "bg-purple-100 text-purple-700 border-purple-200",
  Monitor:     "bg-gray-100 text-gray-500 border-gray-200",
}

// ─── Shared Why card ───────────────────────────────────────────────────────────

function WhyList({ why }: { why: string[] }) {
  return (
    <ul className="space-y-1.5">
      {why.map((w, i) => (
        <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
          <CheckCircle2 size={11} className="text-green-500 mt-0.5 flex-shrink-0" />
          {w}
        </li>
      ))}
    </ul>
  )
}

// ─── Dealers section ───────────────────────────────────────────────────────────

function DealerRow({ rec, onDealerClick }: { rec: DealerRec; onDealerClick?: (n: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-gray-100 last:border-0">
      <div
        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50 cursor-pointer transition-colors"
        onClick={() => setOpen(v => !v)}>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${PRIORITY_STYLE[rec.priority]}`}>
          {rec.priority}
        </span>
        <div className="flex-1 min-w-0">
          <button
            onClick={e => { e.stopPropagation(); onDealerClick?.(rec.dealer) }}
            className="text-xs font-semibold text-gray-800 hover:text-brand-600 hover:underline text-left truncate block max-w-[280px]">
            {rec.dealer}
          </button>
          <p className="text-[10px] text-gray-400 mt-0.5 truncate">{rec.action}</p>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-xs text-gray-500 flex-shrink-0">
          <span title="GMV">{fmtInr(rec.total_gmv)}</span>
          <span title="Contracts" className="text-gray-400">{rec.total_contracts} contracts</span>
          <span title="Depts">{rec.dept_count} depts</span>
          <span title="States">{rec.state_count} states</span>
        </div>
        <div className="w-12 flex-shrink-0">
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div className="h-1.5 rounded-full bg-brand-500" style={{ width: `${rec.score}%` }} />
          </div>
          <p className="text-[9px] text-gray-400 text-right mt-0.5">{rec.score}</p>
        </div>
        {open ? <ChevronUp size={12} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={12} className="text-gray-400 flex-shrink-0" />}
      </div>

      {open && (
        <div className="px-4 pb-4 pt-0 space-y-3 bg-gray-50/30">
          <WhyList why={rec.why} />
          {rec.top_products.length > 0 && (
            <div className="text-[10px] text-gray-500">
              <span className="font-medium text-gray-600">Products: </span>
              {rec.top_products.slice(0, 4).map(p => truncate(p, 35)).join(" · ")}
            </div>
          )}
          {rec.top_depts.length > 0 && (
            <div className="text-[10px] text-gray-500">
              <span className="font-medium text-gray-600">Top depts: </span>
              {rec.top_depts.slice(0, 3).map(d => truncate(d, 35)).join(" · ")}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Products section ──────────────────────────────────────────────────────────

function ProductRow({ rec }: { rec: ProductRec }) {
  const [open, setOpen] = useState(false)
  const { evidence: ev } = rec
  const evTotal = ev ? ev.demand_score + ev.growth_score + ev.fragmentation_score + ev.value_score + ev.reach_score : 0

  return (
    <div className="border-b border-gray-100 last:border-0">
      <div
        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50 cursor-pointer transition-colors"
        onClick={() => setOpen(v => !v)}>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ROUTE_STYLE[rec.route] ?? ROUTE_STYLE.Monitor}`}>
          {rec.route}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-800 truncate max-w-[280px]">{rec.product}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">
            {fmtInr(rec.total_gmv)} · {rec.total_contracts} contracts · {rec.growth_rate >= 0 ? "+" : ""}{rec.growth_rate}% growth
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-xs text-gray-500 flex-shrink-0">
          <span>{rec.dept_count} depts</span>
          <span>{rec.seller_count} sellers</span>
          <span className={rec.growth_rate > 20 ? "text-green-600 font-medium" : rec.growth_rate < 0 ? "text-red-500" : ""}>{rec.growth_rate > 0 ? "+" : ""}{rec.growth_rate}% YoY</span>
        </div>
        <div className="w-12 flex-shrink-0">
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div className="h-1.5 rounded-full bg-brand-500" style={{ width: `${rec.opportunity_score}%` }} />
          </div>
          <p className="text-[9px] text-gray-400 text-right mt-0.5">{rec.opportunity_score}</p>
        </div>
        {open ? <ChevronUp size={12} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={12} className="text-gray-400 flex-shrink-0" />}
      </div>

      {open && (
        <div className="px-4 pb-4 pt-0 space-y-3 bg-gray-50/30">
          <WhyList why={rec.why} />
          {ev && (
            <div className="grid grid-cols-5 gap-2 text-[10px]">
              {([
                ["Demand",       ev.demand_score,       25],
                ["Growth",       ev.growth_score,       25],
                ["Fragmentation",ev.fragmentation_score,20],
                ["Value",        ev.value_score,        15],
                ["Reach",        ev.reach_score,        15],
              ] as [string, number, number][]).map(([label, score, max]) => (
                <div key={label} className="bg-white rounded border border-gray-200 px-2 py-1.5 text-center">
                  <p className="text-gray-400">{label}</p>
                  <p className="font-bold text-gray-700">{score}<span className="text-gray-300">/{max}</span></p>
                  <div className="w-full bg-gray-100 rounded-full h-1 mt-1">
                    <div className="h-1 rounded-full bg-brand-400" style={{ width: `${Math.round((score/max)*100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
          {evTotal > 0 && (
            <p className="text-[10px] text-gray-400">Total opportunity score: {evTotal}/100</p>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Departments section ───────────────────────────────────────────────────────

function DeptRow({ rec }: { rec: DeptRec }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-gray-100 last:border-0">
      <div
        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50 cursor-pointer transition-colors"
        onClick={() => setOpen(v => !v)}>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-800 truncate max-w-[280px]">{rec.dept}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{rec.ministry} · {rec.action}</p>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-xs text-gray-500 flex-shrink-0">
          <span>{fmtInr(rec.total_gmv)}</span>
          <span>{rec.total_contracts} contracts</span>
          <span>{rec.seller_count} sellers</span>
          <span className={rec.vendor_concentration < 0.25 ? "text-green-600" : rec.vendor_concentration > 0.6 ? "text-red-500" : "text-amber-600"}>
            conc. {Math.round(rec.vendor_concentration * 100)}%
          </span>
        </div>
        <div className="w-12 flex-shrink-0">
          <div className="w-full bg-gray-100 rounded-full h-1.5">
            <div className="h-1.5 rounded-full bg-brand-500" style={{ width: `${rec.score}%` }} />
          </div>
          <p className="text-[9px] text-gray-400 text-right mt-0.5">{rec.score}</p>
        </div>
        {open ? <ChevronUp size={12} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={12} className="text-gray-400 flex-shrink-0" />}
      </div>

      {open && (
        <div className="px-4 pb-4 pt-0 space-y-3 bg-gray-50/30">
          <WhyList why={rec.why} />
          {rec.top_products.length > 0 && (
            <div className="text-[10px] text-gray-500">
              <span className="font-medium text-gray-600">Buys: </span>
              {rec.top_products.slice(0, 4).map(p => truncate(p, 35)).join(" · ")}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Cross-sell section ────────────────────────────────────────────────────────

function CrossSellRow({ rec, onDealerClick }: { rec: CrossSellRec; onDealerClick?: (n: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-gray-100 last:border-0">
      <div
        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50 cursor-pointer transition-colors"
        onClick={() => setOpen(v => !v)}>
        <Shuffle size={12} className="text-purple-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <button
            onClick={e => { e.stopPropagation(); onDealerClick?.(rec.dealer) }}
            className="text-xs font-semibold text-gray-800 hover:text-brand-600 hover:underline text-left truncate block max-w-[280px]">
            {rec.dealer}
          </button>
          <p className="text-[10px] text-gray-400 mt-0.5">{rec.adjacent_count} adjacent products · {rec.action}</p>
        </div>
        <div className="hidden sm:flex items-center gap-3 text-xs text-gray-500">
          <span>Fogging: {fmtInr(rec.fogging_gmv)}</span>
        </div>
        {open ? <ChevronUp size={12} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={12} className="text-gray-400 flex-shrink-0" />}
      </div>

      {open && (
        <div className="px-4 pb-4 pt-0 space-y-3 bg-gray-50/30">
          <WhyList why={rec.why} />
          <div className="text-[10px] text-gray-500">
            <span className="font-medium text-gray-600">Adjacent: </span>
            {rec.adjacent_products.slice(0, 4).map(p => truncate(p, 35)).join(" · ")}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Section container ────────────────────────────────────────────────────────

function SectionCard({ title, count, children, icon: Icon }: {
  title: string; count: number; children: React.ReactNode; icon: React.ElementType
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <Icon size={13} className="text-brand-500" />
        <span className="text-xs font-semibold text-gray-800">{title}</span>
        <span className="ml-auto text-[10px] text-gray-400">{count} opportunities</span>
      </div>
      {children}
    </div>
  )
}

// ─── Main ──────────────────────────────────────────────────────────────────────

type Section = "dealers" | "products" | "depts" | "cross_sell"

export function OpportunityTab({ onDealerClick }: { onDealerClick?: (name: string) => void }) {
  const [data, setData]     = useState<RecsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [section, setSection] = useState<Section>("dealers")

  const load = () => {
    setLoading(true)
    fetch("/api/admin/procurement/recommendations?type=all&limit=50")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const SECTIONS: { id: Section; label: string; icon: React.ElementType; count: number | undefined }[] = [
    { id: "dealers",    label: "Dealer Targets",   icon: Users,      count: data?.dealers.length },
    { id: "products",   label: "Product Opportunities", icon: Package, count: data?.products.length },
    { id: "depts",      label: "Dept Opportunities", icon: Building2, count: data?.departments.length },
    { id: "cross_sell", label: "Cross-sell",        icon: Shuffle,    count: data?.cross_sell.length },
  ]

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm">
        <Zap size={13} className="text-brand-600" />
        <div>
          <p className="text-xs font-semibold text-gray-800">Decision Recommendations</p>
          <p className="text-[10px] text-gray-400">Ranked opportunities with evidence — no AI key needed</p>
        </div>
        <button onClick={load} disabled={loading}
          className="ml-auto flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700">
          {loading ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
          Refresh
        </button>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-sm w-fit">
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
              section === s.id ? "bg-brand-600 text-white" : "text-gray-500 hover:text-gray-700"
            }`}>
            <s.icon size={11} />
            {s.label}
            {s.count != null && (
              <span className={`text-[9px] rounded-full px-1.5 font-bold ${section === s.id ? "bg-white/20" : "bg-gray-100 text-gray-400"}`}>
                {s.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 size={20} className="animate-spin text-brand-500" />
        </div>
      )}

      {!loading && !data && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-center gap-3">
          <AlertCircle size={16} className="text-red-500" />
          <p className="text-sm text-red-700">Failed to load recommendations. Is the Knowledge Graph built?</p>
        </div>
      )}

      {!loading && data && (
        <>
          {section === "dealers" && (
            <div className="space-y-2">
              {/* Priority summary */}
              <div className="grid grid-cols-3 gap-3">
                {(["A","B","C"] as const).map(p => {
                  const count = data.dealers.filter(d => d.priority === p).length
                  return (
                    <div key={p} className={`rounded-xl border px-4 py-3 ${PRIORITY_STYLE[p]}`}>
                      <p className="text-[10px] uppercase tracking-wide opacity-70">Priority {p}</p>
                      <p className="text-2xl font-bold">{count}</p>
                      <p className="text-[10px] opacity-70">
                        {p === "A" ? "Recruit this month" : p === "B" ? "Nurture — Q3" : "Watch list"}
                      </p>
                    </div>
                  )
                })}
              </div>
              <SectionCard title="Dealer Acquisition Targets" count={data.dealers.length} icon={Users}>
                {data.dealers.map(rec => (
                  <DealerRow key={rec.dealer} rec={rec} onDealerClick={onDealerClick} />
                ))}
              </SectionCard>
            </div>
          )}

          {section === "products" && (
            <div className="space-y-2">
              <div className="grid grid-cols-4 gap-3">
                {(["Manufacture","OEM","Import","Monitor"] as const).map(r => {
                  const count = data.products.filter(p => p.route === r).length
                  return (
                    <div key={r} className={`rounded-xl border px-4 py-3 ${ROUTE_STYLE[r]}`}>
                      <p className="text-[10px] uppercase tracking-wide opacity-70">{r}</p>
                      <p className="text-2xl font-bold">{count}</p>
                      <p className="text-[10px] opacity-70">products</p>
                    </div>
                  )
                })}
              </div>
              <SectionCard title="Product Opportunities" count={data.products.length} icon={Package}>
                {data.products.map(rec => (
                  <ProductRow key={rec.product} rec={rec} />
                ))}
              </SectionCard>
            </div>
          )}

          {section === "depts" && (
            <SectionCard title="Department Opportunities" count={data.departments.length} icon={Building2}>
              {data.departments.map(rec => (
                <DeptRow key={rec.dept} rec={rec} />
              ))}
            </SectionCard>
          )}

          {section === "cross_sell" && (
            <SectionCard title="Cross-sell Opportunities" count={data.cross_sell.length} icon={Shuffle}>
              {data.cross_sell.length === 0 ? (
                <div className="py-12 text-center">
                  <ArrowRight size={24} className="mx-auto text-gray-200 mb-2" />
                  <p className="text-sm text-gray-500">No cross-sell opportunities found.</p>
                  <p className="text-xs text-gray-400 mt-1">Build the Knowledge Graph first to detect adjacent product opportunities.</p>
                </div>
              ) : (
                data.cross_sell.map(rec => (
                  <CrossSellRow key={rec.dealer} rec={rec} onDealerClick={onDealerClick} />
                ))
              )}
            </SectionCard>
          )}
        </>
      )}
    </div>
  )
}
