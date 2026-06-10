"use client"
import { useEffect, useState, useCallback } from "react"
import {
  PhoneCall, Phone, Mail, Play, RotateCw, Download, Users, Building2,
  Star, ShieldCheck, MapPin,
} from "lucide-react"

type Segment = "dealer" | "machine_buyer"
type ViewSeg = "all" | Segment

interface Row {
  segment: Segment
  rank: number
  entityName: string
  score: number
  confidence: "high" | "medium" | "low"
  geography: string | null
  reason: string
  fitExplanation: string
  gemActivity: string
  contact: { phone?: string | null; email?: string | null; gst?: string | null; msme?: string | null }
  nextAction: string
  actionStatus: string
  scoringVersion: string
  taxonomyVersion: string
  generatedAt: string
  extra?: { tier?: string; oemAuthProbability?: number; dept?: string | null; signals?: string[]; intentPct?: number }
}

interface WeekData {
  week: string
  dealers: Row[]
  machineBuyers: Row[]
  combined: Row[]
  states: string[]
  statuses: string[]
  meta: Record<Segment, { count: number; generatedAt: string; suppressed: number; scoringVersion: string; taxonomyVersion: string } | undefined>
}

const CONF_COLOR: Record<string, string> = {
  high: "bg-green-100 text-green-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-gray-100 text-gray-500",
}
const STATUS_COLOR: Record<string, string> = {
  New: "bg-blue-50 text-blue-700 border-blue-200",
  Contacted: "bg-indigo-50 text-indigo-700 border-indigo-200",
  Interested: "bg-violet-50 text-violet-700 border-violet-200",
  "OEM Sent": "bg-purple-50 text-purple-700 border-purple-200",
  "Follow-up": "bg-amber-50 text-amber-700 border-amber-200",
  Won: "bg-green-50 text-green-700 border-green-200",
  Lost: "bg-red-50 text-red-600 border-red-200",
  Ignore: "bg-gray-50 text-gray-400 border-gray-200",
}

function Badge({ c, children }: { c: string; children: React.ReactNode }) {
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${c}`}>{children}</span>
}

export default function ContactThisWeek() {
  const [data, setData] = useState<WeekData | null>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<ViewSeg>("all")
  const [fState, setFState] = useState("")
  const [fScore, setFScore] = useState("0")
  const [fStatus, setFStatus] = useState("")
  const [running, setRunning] = useState<Segment | "both" | null>(null)
  const [runMsg, setRunMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const qs = new URLSearchParams({ segment: "all" })
    if (fState) qs.set("state", fState)
    if (fScore !== "0") qs.set("minScore", fScore)
    if (fStatus) qs.set("status", fStatus)
    try {
      const d = await fetch(`/api/admin/growth/opportunity-week?${qs}`).then((r) => r.json())
      setData(d)
    } catch { /* ignore */ }
    setLoading(false)
  }, [fState, fScore, fStatus])

  useEffect(() => { load() }, [load])

  const runEngine = async (seg: Segment | "both") => {
    setRunning(seg); setRunMsg(null)
    const routes: Record<string, string[]> = {
      dealer: ["/api/admin/growth/agents/dealer-opportunity"],
      machine_buyer: ["/api/admin/growth/agents/machine-buyer-opportunity"],
      both: ["/api/admin/growth/agents/dealer-opportunity", "/api/admin/growth/agents/machine-buyer-opportunity"],
    }
    try {
      const results = await Promise.all(routes[seg].map((r) => fetch(r, { method: "POST" }).then((x) => x.json())))
      const total = results.reduce((s, r) => s + (r.count || 0), 0)
      setRunMsg(`Generated ${total} opportunities for ${results.map((r) => r.week).filter(Boolean)[0] || "this week"}.`)
      await load()
    } catch { setRunMsg("Error running engine") }
    setRunning(null)
  }

  const setStatus = async (row: Row, status: string) => {
    await fetch("/api/admin/growth/opportunity-week", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ segment: row.segment, entityKey: row.entityName, status }),
    })
    await load()
  }

  const rows: Row[] = !data ? [] : view === "all" ? data.combined : view === "dealer" ? data.dealers : data.machineBuyers
  const highCount = data ? data.combined.filter((r) => r.confidence === "high").length : 0
  const meta = data?.meta

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      <div className="bg-white border-b border-gray-200 px-8 py-5 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PhoneCall size={18} className="text-brand-600" />
            <div>
              <h1 className="text-base font-bold text-gray-900">Contact This Week</h1>
              <p className="text-gray-400 text-[11px]">
                Top opportunities to call — dealers to onboard + government machine buyers · {data?.week || "…"}
                {meta?.dealer && <span className="ml-2 text-gray-300">scoring {meta.dealer.scoringVersion} · taxonomy {meta.dealer.taxonomyVersion}</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => runEngine("both")} disabled={!!running}
              className="flex items-center gap-1.5 text-xs bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 disabled:opacity-50">
              {running === "both" ? <RotateCw size={12} className="animate-spin" /> : <Play size={12} />}
              {running === "both" ? "Generating…" : "Refresh recommendations"}
            </button>
          </div>
        </div>
        {runMsg && <p className="text-[11px] text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5 mt-2 inline-block">{runMsg}</p>}
      </div>

      <div className="px-8 py-6 max-w-[1500px] space-y-5">
        {/* stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Dealer Opportunities", value: data?.dealers.length ?? 0, icon: Users, color: "border-brand-200", valColor: "text-brand-600" },
            { label: "Machine Buyers", value: data?.machineBuyers.length ?? 0, icon: Building2, color: "border-blue-200", valColor: "text-blue-600" },
            { label: "High Confidence", value: highCount, icon: Star, color: "border-green-200", valColor: "text-green-600" },
            { label: "Combined (Top 50)", value: data?.combined.length ?? 0, icon: ShieldCheck, color: "border-amber-200", valColor: "text-amber-600" },
          ].map(({ label, value, icon: Icon, color, valColor }) => (
            <div key={label} className={`bg-white rounded-xl border ${color} p-5 shadow-sm`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
                <Icon size={14} className="text-gray-300" />
              </div>
              <p className={`text-3xl font-bold ${valColor}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* segment toggle + per-engine run + filters */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-sm w-fit">
            {([
              { k: "all", label: "Top 50 (Exec)" },
              { k: "dealer", label: "Dealers" },
              { k: "machine_buyer", label: "Machine Buyers" },
            ] as const).map(({ k, label }) => (
              <button key={k} onClick={() => setView(k)}
                className={`text-xs px-4 py-1.5 rounded-lg font-medium transition-colors ${view === k ? "bg-brand-600 text-white" : "text-gray-500 hover:text-gray-700"}`}>
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select value={fState} onChange={(e) => setFState(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700">
              <option value="">All states</option>
              {data?.states.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={fScore} onChange={(e) => setFScore(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700">
              <option value="0">Any score</option>
              <option value="70">≥ 70 (strong)</option>
              <option value="50">≥ 50</option>
            </select>
            <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700">
              <option value="">All statuses</option>
              {(data?.statuses || []).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            {view !== "all" && (
              <a href={`/api/admin/growth/opportunity-week?format=md&segment=${view}&week=${data?.week || ""}`}
                className="flex items-center gap-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-600 hover:text-brand-600">
                <Download size={12} /> Report
              </a>
            )}
          </div>
        </div>

        {/* per-engine run buttons */}
        <div className="flex gap-2">
          <button onClick={() => runEngine("dealer")} disabled={!!running}
            className="flex items-center gap-1.5 text-[11px] border border-gray-200 bg-white text-gray-600 px-2.5 py-1 rounded-lg hover:text-brand-600 disabled:opacity-50">
            {running === "dealer" ? <RotateCw size={11} className="animate-spin" /> : <Play size={11} />} Run Dealer Engine
          </button>
          <button onClick={() => runEngine("machine_buyer")} disabled={!!running}
            className="flex items-center gap-1.5 text-[11px] border border-gray-200 bg-white text-gray-600 px-2.5 py-1 rounded-lg hover:text-brand-600 disabled:opacity-50">
            {running === "machine_buyer" ? <RotateCw size={11} className="animate-spin" /> : <Play size={11} />} Run Machine Buyer Engine
          </button>
        </div>

        {/* table */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-200 p-10 text-center">
            <p className="text-gray-400 text-sm">No opportunities match the current filters. Try “Refresh recommendations”.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {["#", "Name", "Score", "Conf.", view === "all" ? "Segment" : "OEM%", "State", "Contact", "GeM activity", "Recommended action", "Status"].map((h) => (
                      <th key={h} className="text-left px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {rows.map((r) => (
                    <tr key={`${r.segment}-${r.entityName}`} className="hover:bg-gray-50/50 align-top">
                      <td className="px-3 py-3 text-gray-400">{r.rank}</td>
                      <td className="px-3 py-3 max-w-[220px]">
                        <p className="font-semibold text-gray-800 leading-tight">{r.entityName}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{r.fitExplanation}</p>
                      </td>
                      <td className="px-3 py-3"><span className="text-sm font-bold text-gray-800">{r.score}</span></td>
                      <td className="px-3 py-3"><Badge c={CONF_COLOR[r.confidence]}>{r.confidence}</Badge></td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {view === "all"
                          ? <Badge c={r.segment === "dealer" ? "bg-brand-50 text-brand-600" : "bg-blue-50 text-blue-600"}>{r.segment === "dealer" ? "Dealer" : "Buyer"}</Badge>
                          : r.segment === "dealer"
                            ? <span className="text-gray-600">{r.extra?.oemAuthProbability ?? "—"}%</span>
                            : <span className="text-gray-600">{r.extra?.intentPct ?? "—"}%</span>}
                      </td>
                      <td className="px-3 py-3 text-gray-500 whitespace-nowrap">
                        {r.geography ? <span className="flex items-center gap-1"><MapPin size={10} />{r.geography}</span> : "—"}
                      </td>
                      <td className="px-3 py-3 text-gray-500 whitespace-nowrap">
                        {r.contact.phone ? (
                          <a href={`tel:${r.contact.phone}`} className="flex items-center gap-1 hover:text-brand-600"><Phone size={10} />{r.contact.phone}</a>
                        ) : r.contact.email ? (
                          <a href={`mailto:${r.contact.email}`} className="flex items-center gap-1 hover:text-brand-600 max-w-[160px] truncate"><Mail size={10} />{r.contact.email}</a>
                        ) : "—"}
                      </td>
                      <td className="px-3 py-3 text-gray-500 max-w-[200px]">{r.gemActivity}</td>
                      <td className="px-3 py-3 text-gray-600 max-w-[220px]">{r.nextAction}</td>
                      <td className="px-3 py-3">
                        <select value={r.actionStatus} onChange={(e) => setStatus(r, e.target.value)}
                          className={`text-[10px] font-semibold rounded-md border px-1.5 py-1 ${STATUS_COLOR[r.actionStatus] || STATUS_COLOR.New}`}>
                          {(data?.statuses || []).map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {meta && (
          <p className="text-[10px] text-gray-300 text-center">
            Won / Lost / Ignore are suppressed from next week’s list · in-progress entities downgraded so fresh leads surface ·
            scoring {meta.dealer?.scoringVersion} / taxonomy {meta.dealer?.taxonomyVersion}
          </p>
        )}
      </div>
    </div>
  )
}
