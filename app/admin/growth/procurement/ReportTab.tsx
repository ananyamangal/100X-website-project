"use client"
import { useEffect, useState, useCallback } from "react"
import { RefreshCw, TrendingUp, AlertTriangle, CheckCircle, Shield } from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContactRow {
  rank:              number
  name:              string
  opportunity_score: number
  l1_wins:           number
  dept_count:        number
  state_count:       number
  defence_l1:        number
  municipal_l1:      number
  health_l1:         number
  crm_contacted:     boolean
  crm_notes:         string
  phone:             string | null
  email:             string | null
  website:           string | null
  aliases:           string[]
  departments:       string[]
}

interface DeptRow {
  dept:       string
  bid_count:  number
  segment:    string
  l1_dealers: string[]
  latest_bid: string | null
}

interface StateRow {
  state:             string
  bid_count:         number
  l1_dealers:        string[]
  has_100x_coverage: boolean
  priority:          "covered" | "critical" | "high" | "low"
}

interface DefSpecialist {
  rank:           number
  name:           string
  defence_l1:     number
  municipal_l1:   number
  l1_wins:        number
  dept_count:     number
  state_count:    number
  is_100x_dealer: boolean
  crm_contacted:  boolean
  departments:    string[]
}

interface ReportMeta {
  enriched:              boolean
  total_bids:            number
  total_dealers:         number
  dealers_to_contact:    number
  covered_states:        number
  critical_gaps:         number
  generated_at:          string
}

interface ReportData {
  meta:                ReportMeta
  priority_contacts:   ContactRow[]
  top_departments:     DeptRow[]
  state_penetration:   StateRow[]
  critical_uncovered:  StateRow[]
  high_uncovered:      StateRow[]
  defence_specialists: DefSpecialist[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })
}

function Pill({ c, children }: { c: string; children: React.ReactNode }) {
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${c}`}>{children}</span>
}

const SEG_COLOR: Record<string, string> = {
  defence:   "bg-red-100 text-red-700",
  municipal: "bg-blue-100 text-blue-700",
  health:    "bg-green-100 text-green-700",
  other:     "bg-gray-100 text-gray-500",
}

const PRI_COLOR: Record<string, string> = {
  covered:  "bg-green-100 text-green-700",
  critical: "bg-red-100 text-red-700",
  high:     "bg-amber-100 text-amber-700",
  low:      "bg-gray-100 text-gray-500",
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ num, title, subtitle }: { num: string; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="w-7 h-7 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
        {num}
      </div>
      <div>
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
        <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
      </div>
    </div>
  )
}

// ─── Q1: Priority Contacts ────────────────────────────────────────────────────

function PriorityContacts({ rows, onDealerClick }: { rows: ContactRow[]; onDealerClick: (name: string) => void }) {
  const [showAll, setShowAll] = useState(false)
  const display = showAll ? rows : rows.slice(0, 20)
  const maxScore = Math.max(...rows.map(r => r.opportunity_score), 1)

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <SectionHeader
          num="1"
          title="Which 50 dealers should 100X contact first?"
          subtitle="Non-100X dealers ranked by opportunity score (L1 wins × 4 + dept breadth × 2 + state breadth + defence × 3 + municipal × 2 + health × 2)"
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {["#","Dealer","Score","L1","Depts","States","Def L1","Mun L1","Status"].map(h => (
                <th key={h} className="text-left px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {display.map(d => (
              <tr key={d.name} className={`hover:bg-gray-50/50 ${d.crm_contacted ? "bg-amber-50/20" : ""}`}>
                <td className="px-3 py-2 w-8 font-mono text-[10px] text-gray-400">{d.rank}</td>
                <td className="px-3 py-2 max-w-[200px]">
                  <button onClick={() => onDealerClick(d.name)}
                    className="font-medium text-gray-800 hover:text-brand-600 hover:underline text-left truncate block max-w-[190px]"
                    title={d.name}>{d.name}</button>
                  {d.departments[0] && (
                    <span className="text-[9px] text-gray-400 truncate block">{d.departments[0].slice(0, 35)}</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-brand-600">{d.opportunity_score}</span>
                    <div className="w-10 bg-gray-100 rounded-full h-1">
                      <div className="h-1 rounded-full bg-brand-500"
                        style={{ width: `${Math.round((d.opportunity_score / maxScore) * 100)}%` }} />
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2 font-bold text-green-700">{d.l1_wins}</td>
                <td className="px-3 py-2 text-gray-600">{d.dept_count}</td>
                <td className="px-3 py-2 text-gray-600">{d.state_count || "—"}</td>
                <td className="px-3 py-2">
                  {d.defence_l1 > 0 ? <Pill c="bg-red-100 text-red-700">{d.defence_l1}</Pill> : <span className="text-gray-200">—</span>}
                </td>
                <td className="px-3 py-2">
                  {d.municipal_l1 > 0 ? <Pill c="bg-blue-100 text-blue-700">{d.municipal_l1}</Pill> : <span className="text-gray-200">—</span>}
                </td>
                <td className="px-3 py-2">
                  {d.crm_contacted
                    ? <Pill c="bg-amber-100 text-amber-700">Contacted</Pill>
                    : <button onClick={() => onDealerClick(d.name)}
                        className="text-[10px] text-brand-600 border border-brand-200 px-1.5 py-0.5 rounded hover:bg-brand-50">
                        Start
                      </button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > 20 && (
        <div className="px-5 py-3 border-t border-gray-100 text-center">
          <button onClick={() => setShowAll(!showAll)}
            className="text-xs text-brand-600 hover:underline">
            {showAll ? `Show top 20 only` : `Show all ${rows.length} contacts`}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Q2: Top Departments ──────────────────────────────────────────────────────

function TopDepartments({ rows }: { rows: DeptRow[] }) {
  const maxBids = Math.max(...rows.map(r => r.bid_count), 1)
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <SectionHeader
          num="2"
          title="Which 20 departments buy the most fogging equipment?"
          subtitle="Top departments by total awarded bids. These are the repeat buyers — highest value for relationship development."
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {["#","Department","Segment","Bids","Top Dealer","Last Purchase"].map(h => (
                <th key={h} className="text-left px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((d, i) => (
              <tr key={d.dept} className="hover:bg-gray-50/50">
                <td className="px-3 py-2.5 text-gray-400 w-8">{i + 1}</td>
                <td className="px-3 py-2.5 max-w-[260px]">
                  <span className="font-medium text-gray-800 truncate block max-w-[250px]" title={d.dept}>{d.dept}</span>
                </td>
                <td className="px-3 py-2.5">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${SEG_COLOR[d.segment] ?? SEG_COLOR.other}`}>
                    {d.segment}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-800">{d.bid_count}</span>
                    <div className="w-20 bg-gray-100 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full ${
                        d.segment === "defence" ? "bg-red-400" : d.segment === "municipal" ? "bg-blue-400" :
                        d.segment === "health" ? "bg-green-400" : "bg-gray-400"
                      }`} style={{ width: `${Math.round((d.bid_count / maxBids) * 100)}%` }} />
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2.5 max-w-[150px]">
                  <span className="text-gray-600 truncate block max-w-[140px]" title={d.l1_dealers[0]}>
                    {d.l1_dealers[0] ?? "—"}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-gray-400 whitespace-nowrap">{fmtDate(d.latest_bid)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Q3: State Penetration ────────────────────────────────────────────────────

function StatePenetration({ rows, critical, high }: { rows: StateRow[]; critical: StateRow[]; high: StateRow[] }) {
  const coveredCount = rows.filter(s => s.has_100x_coverage).length
  const totalBids    = rows.reduce((s, r) => s + r.bid_count, 0)

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <SectionHeader
          num="3"
          title="Which states are underpenetrated by 100X?"
          subtitle="States where bids exist but no 100X dealer is present. Coverage derived from gem_dealers.states[] marked is_100x_dealer."
        />
        <div className="grid grid-cols-3 gap-3 mt-3">
          <div className="bg-green-50 rounded-xl p-3 border border-green-100">
            <div className="flex items-center gap-1.5 mb-1">
              <CheckCircle size={12} className="text-green-600" />
              <span className="text-[10px] text-green-700 font-semibold uppercase tracking-wide">Covered</span>
            </div>
            <p className="text-2xl font-bold text-green-700">{coveredCount}</p>
            <p className="text-[10px] text-green-600">states with 100X dealers</p>
          </div>
          <div className="bg-red-50 rounded-xl p-3 border border-red-100">
            <div className="flex items-center gap-1.5 mb-1">
              <AlertTriangle size={12} className="text-red-600" />
              <span className="text-[10px] text-red-700 font-semibold uppercase tracking-wide">Critical Gaps</span>
            </div>
            <p className="text-2xl font-bold text-red-700">{critical.length}</p>
            <p className="text-[10px] text-red-600">states with ≥10 bids, no 100X</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp size={12} className="text-amber-600" />
              <span className="text-[10px] text-amber-700 font-semibold uppercase tracking-wide">High Priority</span>
            </div>
            <p className="text-2xl font-bold text-amber-700">{high.length}</p>
            <p className="text-[10px] text-amber-600">states with 5–9 bids, no 100X</p>
          </div>
        </div>
      </div>

      {/* State grid */}
      <div className="p-5 grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
        {rows.map(s => (
          <div key={s.state} className={`rounded-xl border p-3 ${
            s.priority === "covered"  ? "border-green-200 bg-green-50/40" :
            s.priority === "critical" ? "border-red-200 bg-red-50/40" :
            s.priority === "high"     ? "border-amber-200 bg-amber-50/40" :
            "border-gray-200 bg-white"
          }`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold text-gray-700 truncate">{s.state}</span>
              <span className={`text-[10px] font-bold ${
                s.priority === "covered" ? "text-green-600" :
                s.priority === "critical" ? "text-red-600" :
                s.priority === "high" ? "text-amber-600" : "text-gray-400"
              }`}>{s.bid_count}</span>
            </div>
            <Pill c={PRI_COLOR[s.priority] ?? PRI_COLOR.low}>
              {s.priority === "covered" ? "✓" : s.priority}
            </Pill>
          </div>
        ))}
      </div>

      {/* Critical gaps detail */}
      {critical.length > 0 && (
        <div className="px-5 pb-5">
          <p className="text-xs font-semibold text-red-700 mb-2">Critical Gaps — high-bid states without 100X dealer coverage</p>
          <div className="border border-red-200 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-red-50 border-b border-red-100">
                  {["State","Bids","Top Dealers Winning There"].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-red-600 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-red-50">
                {critical.map(s => (
                  <tr key={s.state}>
                    <td className="px-4 py-2.5 font-semibold text-gray-800">{s.state}</td>
                    <td className="px-4 py-2.5 font-bold text-red-600">{s.bid_count}</td>
                    <td className="px-4 py-2.5 text-gray-600">{s.l1_dealers.filter(Boolean).join(" · ") || "—"}</td>
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

// ─── Q4: Defence Specialists ──────────────────────────────────────────────────

function DefenceSpecialists({ rows, onDealerClick }: { rows: DefSpecialist[]; onDealerClick: (name: string) => void }) {
  if (rows.length === 0)
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <SectionHeader num="4" title="Which dealers repeatedly win defence procurement?"
            subtitle="Run Refresh Scores in the Targets tab first to compute defence L1 counts." />
        </div>
        <p className="text-sm text-gray-400 py-8 text-center">No defence specialist data yet — click "Refresh Scores" in the Targets tab.</p>
      </div>
    )

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <SectionHeader
          num="4"
          title="Which dealers repeatedly win defence procurement?"
          subtitle="Dealers with the most L1 wins in Army, Air Force, Navy, Coast Guard, DRDO, and Border departments."
        />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100 bg-red-50">
              {["#","Dealer","Def L1","Total L1","Depts","States","100X?","Contacted?","Defence Buyers"].map(h => (
                <th key={h} className="text-left px-3 py-2.5 text-red-600 font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map(d => (
              <tr key={d.name} className="hover:bg-red-50/20">
                <td className="px-3 py-2.5 text-gray-400 w-8">{d.rank}</td>
                <td className="px-3 py-2.5 max-w-[180px]">
                  <button onClick={() => onDealerClick(d.name)}
                    className="font-medium text-gray-800 hover:text-brand-600 hover:underline text-left truncate block max-w-[170px]"
                    title={d.name}>{d.name}</button>
                </td>
                <td className="px-3 py-2.5 font-bold text-2xl text-red-600">{d.defence_l1}</td>
                <td className="px-3 py-2.5 font-bold text-green-700">{d.l1_wins}</td>
                <td className="px-3 py-2.5 text-gray-600">{d.dept_count}</td>
                <td className="px-3 py-2.5 text-gray-600">{d.state_count || "—"}</td>
                <td className="px-3 py-2.5">
                  {d.is_100x_dealer ? <Pill c="bg-green-100 text-green-700">Yes</Pill> : <Pill c="bg-gray-100 text-gray-400">No</Pill>}
                </td>
                <td className="px-3 py-2.5">
                  {d.crm_contacted ? <Pill c="bg-amber-100 text-amber-700">Yes</Pill> : <Pill c="bg-gray-100 text-gray-400">No</Pill>}
                </td>
                <td className="px-3 py-2.5 max-w-[200px]">
                  <span className="text-[10px] text-gray-500 line-clamp-2">{d.departments.slice(0, 2).join(" · ")}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ReportTab({ onDealerClick }: { onDealerClick: (name: string) => void }) {
  const [data, setData]       = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const d = await fetch("/api/admin/procurement/report").then(r => r.json())
    setData(d)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  if (loading)
    return (
      <div className="flex justify-center py-24">
        <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )

  if (!data)
    return <p className="text-sm text-red-500 text-center py-8">Failed to load report.</p>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Sales Intelligence Report</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Generated from {data.meta.total_bids} awarded bids · {data.meta.total_dealers} canonical dealers · GeM fogging procurement 2024–2026
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!data.meta.enriched && (
              <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg flex items-center gap-1">
                <AlertTriangle size={10} />Scores not enriched
              </span>
            )}
            <button onClick={load}
              className="text-[11px] text-gray-400 hover:text-gray-700 flex items-center gap-1">
              <RefreshCw size={11} />Refresh
            </button>
          </div>
        </div>

        {/* Summary metrics */}
        <div className="grid grid-cols-4 gap-3 mt-4">
          {[
            { label: "Dealers to Contact",    value: data.meta.dealers_to_contact, color: "text-brand-600", icon: <TrendingUp size={14} /> },
            { label: "States Covered by 100X", value: data.meta.covered_states,     color: "text-green-600", icon: <CheckCircle size={14} /> },
            { label: "Critical State Gaps",    value: data.meta.critical_gaps,       color: "text-red-600",   icon: <AlertTriangle size={14} /> },
            { label: "Defence Specialists",    value: data.defence_specialists.length, color: "text-red-700", icon: <Shield size={14} /> },
          ].map(m => (
            <div key={m.label} className="bg-gray-50 rounded-xl border border-gray-100 p-3 text-center">
              <div className={`flex justify-center mb-1 ${m.color}`}>{m.icon}</div>
              <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{m.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Q1 */}
      <PriorityContacts rows={data.priority_contacts} onDealerClick={onDealerClick} />

      {/* Q2 */}
      <TopDepartments rows={data.top_departments} />

      {/* Q3 */}
      <StatePenetration
        rows={data.state_penetration}
        critical={data.critical_uncovered}
        high={data.high_uncovered}
      />

      {/* Q4 */}
      <DefenceSpecialists rows={data.defence_specialists} onDealerClick={onDealerClick} />
    </div>
  )
}
