"use client"
import { useEffect, useState, useCallback } from "react"
import {
  PhoneCall, Phone, Mail, Play, RotateCw, Download, Users, Building2,
  Star, ShieldCheck, MapPin, MessageCircle, UserPlus, StickyNote, CalendarClock,
  X, Zap,
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
  owner?: string | null
  followUpAt?: string | null
  notesCount?: number
  extra?: { tier?: string; oemAuthProbability?: number; dept?: string | null; signals?: string[]; intentPct?: number }
}

interface ActionRecord {
  segment: Segment
  entityKey: string
  status: string
  owner: string | null
  followUpAt: string | null
  notes: Array<{ text: string; at: string; by?: string }>
  statusHistory: Array<{ status: string; at: string; by?: string }>
}

function waLink(phone?: string | null): string | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, "")
  const intl = digits.length === 10 ? `91${digits}` : digits
  return `https://wa.me/${intl}`
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
  "Meeting Scheduled": "bg-cyan-50 text-cyan-700 border-cyan-200",
  "OEM Sent": "bg-purple-50 text-purple-700 border-purple-200",
  "Quote Sent": "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
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
  const [running, setRunning] = useState<Segment | "both" | "summary" | null>(null)
  const [runMsg, setRunMsg] = useState<string | null>(null)
  const [selected, setSelected] = useState<Row | null>(null)
  const [rec, setRec] = useState<ActionRecord | null>(null)
  const [noteText, setNoteText] = useState("")
  const [ownerText, setOwnerText] = useState("")

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

  const openDrawer = async (row: Row) => {
    setSelected(row); setRec(null); setNoteText("")
    const r = await fetch(`/api/admin/growth/opportunity-action?segment=${row.segment}&entityKey=${encodeURIComponent(row.entityName)}`).then((x) => x.json())
    setRec(r); setOwnerText(r.owner || "")
  }

  const act = async (action: string, value?: string) => {
    if (!selected) return
    await fetch("/api/admin/growth/opportunity-action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ segment: selected.segment, entityKey: selected.entityName, action, value }),
    })
    const r = await fetch(`/api/admin/growth/opportunity-action?segment=${selected.segment}&entityKey=${encodeURIComponent(selected.entityName)}`).then((x) => x.json())
    setRec(r)
    if (action === "status" || action === "owner" || action === "followup") await load()
  }

  const logContact = (channel: string, href: string) => {
    if (selected) act("logcontact", channel)
    window.open(href, channel === "email" ? "_self" : "_blank")
  }

  const genSummary = async () => {
    setRunning("summary"); setRunMsg(null)
    try {
      const d = await fetch("/api/admin/growth/exec-summary", { method: "POST" }).then((r) => r.json())
      setRunMsg(`Exec summary ready for ${d.week}: ${d.wins ?? 0} won, ${d.lost ?? 0} lost, ${d.newOpportunities ?? 0} new.`)
      window.open("/api/admin/growth/exec-summary?format=md", "_blank")
    } catch { setRunMsg("Error generating summary") }
    setRunning(null)
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
            <button onClick={genSummary} disabled={!!running}
              className="flex items-center gap-1.5 text-xs border border-gray-200 bg-white text-gray-600 px-3 py-1.5 rounded-lg hover:text-brand-600 disabled:opacity-50">
              {running === "summary" ? <RotateCw size={12} className="animate-spin" /> : <Download size={12} />}
              Weekly Exec Summary
            </button>
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
                    {["#", "Name", "Score", "Conf.", view === "all" ? "Segment" : "OEM%", "State", "Contact", "Owner", "Status", "Action"].map((h) => (
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
                      <td className="px-3 py-3 text-gray-500 whitespace-nowrap">
                        {r.owner ? <span className="text-gray-700">{r.owner}</span> : <span className="text-gray-300">—</span>}
                        {r.followUpAt && <span className="block text-[9px] text-amber-600">⏰ {new Date(r.followUpAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</span>}
                      </td>
                      <td className="px-3 py-3">
                        <select value={r.actionStatus} onChange={(e) => setStatus(r, e.target.value)}
                          className={`text-[10px] font-semibold rounded-md border px-1.5 py-1 ${STATUS_COLOR[r.actionStatus] || STATUS_COLOR.New}`}>
                          {(data?.statuses || []).map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-3">
                        <button onClick={() => openDrawer(r)}
                          className="flex items-center gap-1 text-[11px] text-brand-600 hover:text-brand-700 font-medium whitespace-nowrap">
                          <Zap size={11} /> Action{(r.notesCount ?? 0) > 0 && <span className="text-gray-400">({r.notesCount})</span>}
                        </button>
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

      {/* ── Action Center drawer ─────────────────────────────────────────── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setSelected(null)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-start justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-gray-400">{selected.segment === "dealer" ? "Dealer" : "Machine Buyer"} · {selected.confidence} confidence</p>
                <h3 className="text-sm font-bold text-gray-900 leading-tight">{selected.entityName}</h3>
                <p className="text-[11px] text-gray-500 mt-0.5">{selected.score}/100 · {selected.geography || "—"}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-700"><X size={16} /></button>
            </div>

            <div className="px-5 py-4 space-y-5">
              {/* Contact actions */}
              <div>
                <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-2">Reach out</p>
                <div className="grid grid-cols-3 gap-2">
                  <button disabled={!selected.contact.phone} onClick={() => logContact("call", `tel:${selected.contact.phone}`)}
                    className="flex flex-col items-center gap-1 border border-gray-200 rounded-lg py-2.5 text-[11px] text-gray-600 hover:border-brand-300 hover:text-brand-600 disabled:opacity-30">
                    <Phone size={15} /> Call
                  </button>
                  <button disabled={!selected.contact.phone} onClick={() => logContact("whatsapp", waLink(selected.contact.phone) || "#")}
                    className="flex flex-col items-center gap-1 border border-gray-200 rounded-lg py-2.5 text-[11px] text-gray-600 hover:border-green-300 hover:text-green-600 disabled:opacity-30">
                    <MessageCircle size={15} /> WhatsApp
                  </button>
                  <button disabled={!selected.contact.email} onClick={() => logContact("email", `mailto:${selected.contact.email}`)}
                    className="flex flex-col items-center gap-1 border border-gray-200 rounded-lg py-2.5 text-[11px] text-gray-600 hover:border-blue-300 hover:text-blue-600 disabled:opacity-30">
                    <Mail size={15} /> Email
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-1.5">{selected.contact.phone || "no phone"}{selected.contact.email ? ` · ${selected.contact.email}` : ""}</p>
              </div>

              {/* Recommended next action */}
              <div className="bg-brand-50 border border-brand-100 rounded-lg p-3">
                <p className="text-[10px] uppercase tracking-wide text-brand-400 mb-1">Recommended next action</p>
                <p className="text-xs text-gray-700">{selected.nextAction}</p>
                <p className="text-[10px] text-gray-400 mt-1">{selected.gemActivity}</p>
              </div>

              {/* Outcome status */}
              <div>
                <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-2">Outcome status</p>
                <div className="flex flex-wrap gap-1.5">
                  {(data?.statuses || []).map((s) => (
                    <button key={s} onClick={() => act("status", s)}
                      className={`text-[10px] font-semibold px-2 py-1 rounded-md border ${rec?.status === s ? STATUS_COLOR[s] : "bg-white text-gray-400 border-gray-200 hover:border-gray-300"}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Assign owner */}
              <div>
                <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-2 flex items-center gap-1"><UserPlus size={11} /> Owner</p>
                <div className="flex gap-2">
                  <input value={ownerText} onChange={(e) => setOwnerText(e.target.value)} placeholder="Assign a salesperson…"
                    className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5" />
                  <button onClick={() => act("owner", ownerText)} className="text-xs bg-gray-800 text-white px-3 rounded-lg hover:bg-gray-900">Save</button>
                </div>
              </div>

              {/* Schedule follow-up */}
              <div>
                <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-2 flex items-center gap-1"><CalendarClock size={11} /> Follow-up date</p>
                <input type="date" defaultValue={rec?.followUpAt?.split("T")[0] || ""} onChange={(e) => act("followup", e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1.5" />
              </div>

              {/* Notes */}
              <div>
                <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-2 flex items-center gap-1"><StickyNote size={11} /> Notes</p>
                <div className="flex gap-2 mb-2">
                  <input value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add a note…"
                    onKeyDown={(e) => { if (e.key === "Enter" && noteText.trim()) { act("note", noteText); setNoteText("") } }}
                    className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1.5" />
                  <button onClick={() => { if (noteText.trim()) { act("note", noteText); setNoteText("") } }} className="text-xs bg-brand-600 text-white px-3 rounded-lg hover:bg-brand-700">Add</button>
                </div>
                <div className="space-y-1.5">
                  {(rec?.notes || []).slice().reverse().map((n, i) => (
                    <div key={i} className="bg-gray-50 rounded-lg px-2.5 py-1.5">
                      <p className="text-[11px] text-gray-700">{n.text}</p>
                      <p className="text-[9px] text-gray-400">{new Date(n.at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                  ))}
                  {!rec?.notes?.length && <p className="text-[11px] text-gray-300">No notes yet.</p>}
                </div>
              </div>

              {/* Status timeline */}
              {!!rec?.statusHistory?.length && (
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-2">Timeline</p>
                  <div className="space-y-1">
                    {rec.statusHistory.slice().reverse().map((h, i) => (
                      <p key={i} className="text-[10px] text-gray-500">{h.status} · {new Date(h.at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
