"use client"
import { useEffect, useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"

interface DeptRow {
  dept:           string
  segment:        "defence" | "municipal" | "health" | "other"
  bid_count:      number
  dealer_count:   number
  states:         string[]
  top_dealers:    { name: string; wins: number }[]
  latest_bid:     string | null
  earliest_bid:   string | null
  is_repeat_buyer:boolean
}

interface Props {
  onDealerClick: (name: string) => void
}

function fmtDate(d: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })
}

function SegBadge({ seg }: { seg: string }) {
  const map: Record<string, string> = {
    defence:   "bg-red-100 text-red-700",
    municipal: "bg-blue-100 text-blue-700",
    health:    "bg-green-100 text-green-700",
    other:     "bg-gray-100 text-gray-500",
  }
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${map[seg] ?? map.other}`}>{seg}</span>
}

export function BuyersTab({ onDealerClick }: Props) {
  const [departments, setDepartments] = useState<DeptRow[]>([])
  const [loading, setLoading]         = useState(true)
  const [segment, setSegment]         = useState<"all" | "defence" | "municipal" | "health" | "other">("all")
  const [search, setSearch]           = useState("")
  const [expanded, setExpanded]       = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/admin/procurement/departments")
      .then(r => r.json())
      .then(d => { setDepartments(d.departments || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const counts = {
    all:       departments.length,
    defence:   departments.filter(d => d.segment === "defence").length,
    municipal: departments.filter(d => d.segment === "municipal").length,
    health:    departments.filter(d => d.segment === "health").length,
    other:     departments.filter(d => d.segment === "other").length,
  }

  const filtered = departments.filter(d => {
    if (segment !== "all" && d.segment !== segment) return false
    if (search && !d.dept.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const maxBids = Math.max(...filtered.map(d => d.bid_count), 1)

  const SEG_TABS = [
    { id: "all",       label: "All Depts",  color: "text-gray-700" },
    { id: "defence",   label: "Defence",    color: "text-red-600"  },
    { id: "municipal", label: "Municipal",  color: "text-blue-600" },
    { id: "health",    label: "Health",     color: "text-green-600"},
    { id: "other",     label: "Other Govt", color: "text-gray-500" },
  ] as const

  return (
    <div className="space-y-4">
      {/* Segment summary cards */}
      <div className="grid grid-cols-5 gap-3">
        {SEG_TABS.map(s => (
          <button key={s.id} onClick={() => setSegment(s.id)}
            className={`bg-white rounded-xl border p-4 shadow-sm text-left transition-colors ${
              segment === s.id ? "border-brand-300 ring-1 ring-brand-300" : "border-gray-200 hover:border-gray-300"
            }`}>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">{s.label}</p>
            <p className={`text-xl font-bold ${s.color}`}>{counts[s.id]}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">departments</p>
          </button>
        ))}
      </div>

      {/* Search + filter bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm flex items-center gap-3">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search department name…"
          className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 flex-1 max-w-xs" />
        <span className="text-xs text-gray-400">{filtered.length} of {departments.length} departments shown</span>
        <span className="text-[10px] text-gray-400 ml-auto">Click a dealer name to open their CRM profile</span>
      </div>

      {/* Department table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {["","Buyer Department","Segment","Bids","Dealers","States","Top Dealer","Last Purchase"].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(dept => (
                  <>
                    <tr key={dept.dept}
                      className={`hover:bg-gray-50/50 cursor-pointer ${expanded === dept.dept ? "bg-gray-50" : ""}`}
                      onClick={() => setExpanded(expanded === dept.dept ? null : dept.dept)}>
                      <td className="px-2 py-2.5 w-6 text-gray-300">
                        {expanded === dept.dept ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      </td>
                      <td className="px-3 py-2.5 max-w-[260px]">
                        <span className="font-medium text-gray-800 truncate block max-w-[250px]" title={dept.dept}>
                          {dept.dept}
                        </span>
                        {dept.is_repeat_buyer && (
                          <span className="text-[9px] text-purple-500 font-semibold">Repeat buyer</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5"><SegBadge seg={dept.segment} /></td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-800">{dept.bid_count}</span>
                          <div className="w-16 bg-gray-100 rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full ${
                              dept.segment === "defence" ? "bg-red-400" :
                              dept.segment === "municipal" ? "bg-blue-400" :
                              dept.segment === "health" ? "bg-green-400" : "bg-gray-400"
                            }`} style={{ width: `${Math.round((dept.bid_count / maxBids) * 100)}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-gray-600">{dept.dealer_count}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap gap-0.5">
                          {dept.states.slice(0, 2).map(s => (
                            <span key={s} className="text-[9px] bg-blue-50 text-blue-600 px-1 py-0.5 rounded">{s.slice(0, 8)}</span>
                          ))}
                          {dept.states.length > 2 && <span className="text-[9px] text-gray-400">+{dept.states.length - 2}</span>}
                          {dept.states.length === 0 && <span className="text-[9px] text-gray-300">—</span>}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        {dept.top_dealers[0]
                          ? <button onClick={e => { e.stopPropagation(); onDealerClick(dept.top_dealers[0].name) }}
                              className="text-gray-700 hover:text-brand-600 hover:underline text-left max-w-[120px] truncate block"
                              title={dept.top_dealers[0].name}>
                              {dept.top_dealers[0].name}
                              <span className="text-gray-400 ml-1">({dept.top_dealers[0].wins}W)</span>
                            </button>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-gray-400 whitespace-nowrap">{fmtDate(dept.latest_bid)}</td>
                    </tr>

                    {/* Expanded detail row */}
                    {expanded === dept.dept && (
                      <tr key={`${dept.dept}-detail`} className="bg-blue-50/20">
                        <td colSpan={8} className="px-8 py-4">
                          <div className="grid grid-cols-3 gap-6">
                            <div>
                              <p className="text-[9px] text-gray-400 uppercase tracking-wide mb-2 font-semibold">All Top Dealers in this Department</p>
                              <div className="space-y-1">
                                {dept.top_dealers.map(td => (
                                  <div key={td.name} className="flex items-center justify-between">
                                    <button onClick={() => onDealerClick(td.name)}
                                      className="text-xs text-gray-700 hover:text-brand-600 hover:underline text-left truncate max-w-[160px]"
                                      title={td.name}>{td.name}</button>
                                    <span className="text-[10px] text-green-700 font-bold ml-2">{td.wins}W</span>
                                  </div>
                                ))}
                                {dept.top_dealers.length === 0 && <p className="text-xs text-gray-400">No dealer data</p>}
                              </div>
                            </div>
                            <div>
                              <p className="text-[9px] text-gray-400 uppercase tracking-wide mb-2 font-semibold">States Covered</p>
                              <div className="flex flex-wrap gap-1">
                                {dept.states.map(s => (
                                  <span key={s} className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{s}</span>
                                ))}
                                {dept.states.length === 0 && <span className="text-xs text-gray-400">No state data</span>}
                              </div>
                            </div>
                            <div>
                              <p className="text-[9px] text-gray-400 uppercase tracking-wide mb-2 font-semibold">Timeline</p>
                              <p className="text-xs text-gray-600">First: {fmtDate(dept.earliest_bid)}</p>
                              <p className="text-xs text-gray-600">Latest: {fmtDate(dept.latest_bid)}</p>
                              <p className="text-xs text-gray-600 mt-2">{dept.bid_count} total bids from {dept.dealer_count} dealers</p>
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
        )}
      </div>
    </div>
  )
}
