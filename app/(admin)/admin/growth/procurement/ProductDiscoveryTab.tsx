"use client"
import { useEffect, useState } from "react"
import { Package, Loader2, TrendingUp, TrendingDown, Info } from "lucide-react"

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ProductOpp {
  product:            string
  total_contracts:    number
  total_gmv:          number
  seller_count:       number
  dept_count:         number
  growth_rate:        number
  avg_contract_value: number
  total_score:        number
  demand_score:       number
  growth_score:       number
  fragmentation_score:number
  value_score:        number
  reach_score:        number
  route:              string
  estimated_tam:      number
  year_trend:         Record<string, number>
}

type RouteFilter = "all" | "Manufacturing" | "OEM" | "Import" | "Monitor"

// ─── Format helpers ─────────────────────────────────────────────────────────────

function fmtInr(n: number | null | undefined): string {
  if (!n) return "—"
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(0)} K`
  return `₹${n.toLocaleString("en-IN")}`
}

// ─── Route badge ────────────────────────────────────────────────────────────────

function RouteBadge({ route }: { route: string }) {
  if (route.startsWith("Manufacturing")) return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 whitespace-nowrap">
      Manufacturing
    </span>
  )
  if (route.startsWith("OEM")) return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200 whitespace-nowrap">
      OEM Partnership
    </span>
  )
  if (route.startsWith("Import")) return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 whitespace-nowrap">
      Import/Resell
    </span>
  )
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200 whitespace-nowrap">
      Monitor
    </span>
  )
}

// ─── Mini sparkline ─────────────────────────────────────────────────────────────

function Sparkline({ trend }: { trend: Record<string, number> }) {
  const entries = Object.entries(trend).sort(([a], [b]) => Number(a) - Number(b))
  if (entries.length < 2) return <span className="text-gray-300 text-[10px]">—</span>
  const vals = entries.map(([, v]) => v)
  const max = Math.max(...vals, 1)
  const w = 40, h = 16
  const pts = vals.map((v, i) => `${Math.round((i / (vals.length - 1)) * w)},${Math.round(h - (v / max) * h)}`).join(" ")
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="flex-shrink-0">
      <polyline points={pts} fill="none" stroke="#6366f1" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Score breakdown ────────────────────────────────────────────────────────────

function ScoreBreakdown({ p }: { p: ProductOpp }) {
  const items = [
    { label: "Government Demand", score: p.demand_score,       max: 25, color: "bg-blue-400" },
    { label: "Growth Rate",       score: p.growth_score,       max: 25, color: "bg-emerald-400" },
    { label: "Fragmentation",     score: p.fragmentation_score,max: 20, color: "bg-amber-400" },
    { label: "Contract Value",    score: p.value_score,        max: 15, color: "bg-purple-400" },
    { label: "Buyer Reach",       score: p.reach_score,        max: 15, color: "bg-cyan-400" },
  ]
  return (
    <div className="space-y-1.5">
      {items.map(({ label, score, max, color }) => (
        <div key={label} className="flex items-center gap-2">
          <span className="text-[10px] text-gray-500 w-36">{label}</span>
          <div className="flex-1 bg-gray-100 rounded-full h-1.5">
            <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${Math.round((score / max) * 100)}%` }} />
          </div>
          <span className="text-[10px] text-gray-500 w-10 text-right">{Math.round(score)}/{max}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Main Tab ───────────────────────────────────────────────────────────────────

export function ProductDiscoveryTab() {
  const [products, setProducts] = useState<ProductOpp[]>([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState<RouteFilter>("all")
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/admin/procurement/product-discovery")
      .then(r => r.json())
      .then(d => { setProducts(d.products || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = filter === "all"
    ? products
    : products.filter(p => p.route.toLowerCase().startsWith(filter.toLowerCase()))

  const routeCounts = {
    all: products.length,
    Manufacturing: products.filter(p => p.route.startsWith("Manufacturing")).length,
    OEM: products.filter(p => p.route.startsWith("OEM")).length,
    Import: products.filter(p => p.route.startsWith("Import")).length,
    Monitor: products.filter(p => p.route.startsWith("Monitor")).length,
  }

  if (loading) return (
    <div className="flex justify-center py-16">
      <Loader2 size={18} className="animate-spin text-brand-500" />
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
        <div className="flex items-start gap-3">
          <Package size={16} className="text-brand-600 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-gray-800">100X Product Discovery Engine</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Products scored for 100X manufacturing/OEM opportunity. Excludes existing fogging product lines.
              Ranked by: government demand + growth rate + market fragmentation + contract value + buyer reach.
            </p>
          </div>
          <div className="ml-auto flex items-center gap-1 text-[10px] text-gray-400 flex-shrink-0">
            <Info size={10} />
            <span>More fragmented = more opportunity for 100X to capture market share</span>
          </div>
        </div>
      </div>

      {/* Route filter */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "Manufacturing", "OEM", "Import", "Monitor"] as RouteFilter[]).map(r => (
          <button key={r} onClick={() => setFilter(r)}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
              filter === r
                ? "bg-brand-600 text-white border-brand-600"
                : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
            }`}>
            {r === "all" ? `All (${routeCounts.all})` : `${r} (${routeCounts[r]})`}
          </button>
        ))}
      </div>

      {products.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-sm text-gray-400">
          No data yet. Build the Knowledge Graph first.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["#", "Product", "Route", "Score", "Market GMV", "Est. TAM", "Sellers", "Depts", "Growth", "Trend"].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((p, i) => (
                  <>
                    <tr
                      key={p.product}
                      className={`hover:bg-gray-50/50 cursor-pointer ${expanded === p.product ? "bg-gray-50" : ""}`}
                      onClick={() => setExpanded(expanded === p.product ? null : p.product)}>
                      <td className="px-3 py-2.5 text-gray-400">{i + 1}</td>
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-gray-800 max-w-[200px] truncate">{p.product}</p>
                        <p className="text-[10px] text-gray-400">{p.total_contracts} contracts</p>
                      </td>
                      <td className="px-3 py-2.5"><RouteBadge route={p.route} /></td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-gray-800">{p.total_score}</span>
                          <div className="w-12 bg-gray-100 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full bg-brand-500"
                              style={{ width: `${p.total_score}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 font-medium text-orange-600">{fmtInr(p.total_gmv)}</td>
                      <td className="px-3 py-2.5 text-emerald-600 font-medium">{fmtInr(p.estimated_tam)}</td>
                      <td className="px-3 py-2.5 text-gray-600">{p.seller_count}</td>
                      <td className="px-3 py-2.5 text-gray-600">{p.dept_count}</td>
                      <td className="px-3 py-2.5">
                        {typeof p.growth_rate === "number" ? (
                          <span className={`flex items-center gap-0.5 font-bold ${p.growth_rate >= 0 ? "text-green-600" : "text-red-500"}`}>
                            {p.growth_rate >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                            {p.growth_rate > 0 ? "+" : ""}{Math.round(p.growth_rate)}%
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-3 py-2.5">
                        <Sparkline trend={p.year_trend || {}} />
                      </td>
                    </tr>

                    {/* Expanded row */}
                    {expanded === p.product && (
                      <tr key={`${p.product}-exp`}>
                        <td colSpan={10} className="px-4 py-4 bg-blue-50/50 border-b border-gray-100">
                          <div className="grid grid-cols-3 gap-6">
                            <div>
                              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-2">Score Breakdown</p>
                              <ScoreBreakdown p={p} />
                            </div>
                            <div>
                              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-2">Market Intel</p>
                              <div className="space-y-1">
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-500">Avg Contract Value</span>
                                  <span className="font-medium">{fmtInr(p.avg_contract_value)}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-500">Market Size (GMV)</span>
                                  <span className="font-medium">{fmtInr(p.total_gmv)}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-500">Estimated TAM</span>
                                  <span className="font-medium text-emerald-600">{fmtInr(p.estimated_tam)}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                  <span className="text-gray-500">Seller Competition</span>
                                  <span className="font-medium">{p.seller_count} sellers</span>
                                </div>
                              </div>
                            </div>
                            <div>
                              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-2">Recommendation</p>
                              <RouteBadge route={p.route} />
                              <p className="text-xs text-gray-600 mt-2">{p.route}</p>
                              <p className="text-[10px] text-gray-400 mt-2">
                                {p.route.startsWith("Manufacturing")
                                  ? "High demand + high value + fragmented market. 100X can capture significant share."
                                  : p.route.startsWith("OEM")
                                  ? "Growing market. Partner with an existing OEM or contract manufacturer."
                                  : p.route.startsWith("Import")
                                  ? "Moderate opportunity. Source internationally and resell through dealer network."
                                  : "Monitor this category. Re-evaluate in 6 months."}
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
