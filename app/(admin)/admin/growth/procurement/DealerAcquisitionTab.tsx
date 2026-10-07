"use client"
import { useCallback, useEffect, useState } from "react"
import {
  Download, Phone, Loader2, RefreshCw,
  Star, CheckCircle, Circle, AlertCircle,
} from "lucide-react"

// ─── Types ─────────────────────────────────────────────────────────────────────

interface AcquisitionDealer {
  dealer:               string
  total_gmv:            number
  total_contracts:      number
  dept_count:           number
  state_count:          number
  product_count:        number
  category_fit:         number
  contact_score:        number
  gmv_score:            number
  state_score:          number
  dept_score:           number
  total_score:          number
  priority:             "A" | "B" | "C"
  seller_phone:         string | null
  seller_gst:           string | null
  seller_msme_category: string | null
  seller_state:         string | null
  products:             string[]
  departments:          string[]
}

type Priority = "all" | "A" | "B" | "C"

// ─── Format helpers ─────────────────────────────────────────────────────────────

function fmtInr(n: number | null): string {
  if (!n) return "—"
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(0)} K`
  return `₹${n.toLocaleString("en-IN")}`
}

// ─── Priority badge ─────────────────────────────────────────────────────────────

function PriorityBadge({ p }: { p: "A" | "B" | "C" }) {
  const styles = {
    A: "bg-emerald-100 text-emerald-700 border-emerald-200",
    B: "bg-blue-100 text-blue-700 border-blue-200",
    C: "bg-gray-100 text-gray-500 border-gray-200",
  }
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${styles[p]}`}>
      Priority {p}
    </span>
  )
}

// ─── Score bar ──────────────────────────────────────────────────────────────────

function ScoreBar({ score, max = 100 }: { score: number; max?: number }) {
  const pct = Math.round((score / max) * 100)
  const color = score >= 65 ? "bg-emerald-500" : score >= 40 ? "bg-blue-500" : "bg-gray-300"
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-bold text-gray-800 w-6">{score}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ─── Contact indicator ──────────────────────────────────────────────────────────

function Contact({ phone, gst }: { phone: string | null; gst: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className={`flex items-center gap-1 text-[10px] ${phone ? "text-green-600" : "text-gray-300"}`}>
        {phone ? <CheckCircle size={9} /> : <Circle size={9} />}
        {phone ? phone.slice(0, 14) : "No phone"}
      </span>
      <span className={`flex items-center gap-1 text-[10px] font-mono ${gst ? "text-gray-600" : "text-gray-300"}`}>
        {gst ? <CheckCircle size={9} /> : <Circle size={9} />}
        {gst ? gst : "No GSTIN"}
      </span>
    </div>
  )
}

// ─── Main Tab ───────────────────────────────────────────────────────────────────

export function DealerAcquisitionTab({ onDealerClick }: { onDealerClick?: (name: string) => void }) {
  const [dealers, setDealers] = useState<AcquisitionDealer[]>([])
  const [priority, setPriority] = useState<Priority>("all")
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [expandedDealer, setExpandedDealer] = useState<string | null>(null)

  const load = useCallback((p = priority) => {
    setLoading(true)
    const q = p === "all" ? "" : `&priority=${p}`
    fetch(`/api/admin/procurement/dealer-acquisition?limit=200${q}`)
      .then(r => r.json())
      .then(d => { setDealers(d.dealers || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [priority])

  useEffect(() => { load() }, [load])

  const handlePriority = (p: Priority) => {
    setPriority(p)
    load(p)
  }

  const exportCSV = async () => {
    setExporting(true)
    try {
      const res = await fetch("/api/admin/procurement/dealer-acquisition?export=csv&limit=1000")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `dealer-acquisition-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  const counts = {
    all: dealers.length,
    A: dealers.filter(d => d.priority === "A").length,
    B: dealers.filter(d => d.priority === "B").length,
    C: dealers.filter(d => d.priority === "C").length,
  }

  const filtered = priority === "all" ? dealers : dealers.filter(d => d.priority === priority)

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-800">Dealer Acquisition Engine</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Dealers scored on GMV, category fit, contact completeness, state/dept coverage
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => load()} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
            <RefreshCw size={11} />Refresh
          </button>
          <button onClick={exportCSV} disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50 shadow-sm">
            {exporting ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />}
            Export CSV
          </button>
        </div>
      </div>

      {/* Priority tabs */}
      <div className="flex gap-2">
        {(["all", "A", "B", "C"] as Priority[]).map(p => (
          <button key={p} onClick={() => handlePriority(p)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              priority === p
                ? p === "A" ? "bg-emerald-600 text-white border-emerald-600"
                  : p === "B" ? "bg-blue-600 text-white border-blue-600"
                  : p === "C" ? "bg-gray-500 text-white border-gray-500"
                  : "bg-gray-800 text-white border-gray-800"
                : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
            }`}>
            {p !== "all" && <Star size={9} fill={priority === p ? "currentColor" : "none"} />}
            {p === "all" ? `All (${counts.all})` : `Priority ${p} (${counts[p]})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={20} className="animate-spin text-brand-500" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-sm text-gray-400">
          No dealers found. Build the Knowledge Graph first.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          {/* Summary stats */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-6 text-xs text-gray-500">
            <span className="font-semibold text-gray-700">{filtered.length} dealers</span>
            <span>Priority A: {counts.A} dealers</span>
            <span>Priority B: {counts.B} dealers</span>
            <span className="ml-auto flex items-center gap-1 text-amber-600">
              <AlertCircle size={11} />
              Build Knowledge Graph for accurate scoring
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["#", "Dealer", "Priority", "Score", "GMV", "Contracts", "Depts", "States", "Contact", "MSME"].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((d, i) => (
                  <>
                    <tr
                      key={d.dealer}
                      className={`hover:bg-gray-50/50 cursor-pointer ${expandedDealer === d.dealer ? "bg-gray-50" : ""}`}
                      onClick={() => setExpandedDealer(expandedDealer === d.dealer ? null : d.dealer)}>
                      <td className="px-3 py-2.5 text-gray-400 w-8">{i + 1}</td>
                      <td className="px-3 py-2.5">
                        <button
                          onClick={e => { e.stopPropagation(); onDealerClick?.(d.dealer) }}
                          className="font-medium text-gray-800 hover:text-brand-600 hover:underline text-left max-w-[180px] truncate block">
                          {d.dealer}
                        </button>
                        {d.seller_state && <p className="text-[10px] text-gray-400">{d.seller_state}</p>}
                      </td>
                      <td className="px-3 py-2.5"><PriorityBadge p={d.priority} /></td>
                      <td className="px-3 py-2.5 w-32"><ScoreBar score={d.total_score} /></td>
                      <td className="px-3 py-2.5 font-medium text-orange-600">{fmtInr(d.total_gmv)}</td>
                      <td className="px-3 py-2.5 text-gray-600">{d.total_contracts}</td>
                      <td className="px-3 py-2.5 text-gray-600">{d.dept_count}</td>
                      <td className="px-3 py-2.5 text-gray-600">{d.state_count}</td>
                      <td className="px-3 py-2.5">
                        <Contact phone={d.seller_phone} gst={d.seller_gst} />
                      </td>
                      <td className="px-3 py-2.5">
                        {d.seller_msme_category ? (
                          <span className="text-[10px] bg-green-50 text-green-700 border border-green-200 rounded-full px-2 py-0.5">
                            {d.seller_msme_category}
                          </span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                    </tr>

                    {/* Expanded row */}
                    {expandedDealer === d.dealer && (
                      <tr key={`${d.dealer}-expanded`}>
                        <td colSpan={10} className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                          <div className="grid grid-cols-2 gap-6">
                            {/* Score breakdown */}
                            <div>
                              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-2">Score Breakdown</p>
                              {[
                                { label: "GMV Weight",       score: d.gmv_score,      max: 30 },
                                { label: "Category Fit",     score: d.category_fit,   max: 25 },
                                { label: "Contact Complete", score: d.contact_score,  max: 20 },
                                { label: "State Coverage",   score: d.state_score,    max: 15 },
                                { label: "Dept Coverage",    score: d.dept_score,     max: 10 },
                              ].map(({ label, score, max }) => (
                                <div key={label} className="flex items-center gap-3 mb-1.5">
                                  <span className="text-[10px] text-gray-500 w-36">{label}</span>
                                  <div className="flex-1 bg-gray-200 rounded-full h-1">
                                    <div className="h-1 rounded-full bg-brand-500"
                                      style={{ width: `${Math.round((score / max) * 100)}%` }} />
                                  </div>
                                  <span className="text-[10px] text-gray-600 w-12 text-right">{Math.round(score)}/{max}</span>
                                </div>
                              ))}
                            </div>

                            {/* Products + Depts */}
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Top Products</p>
                                {(d.products || []).slice(0, 5).map((p, j) => (
                                  <p key={j} className="text-[10px] text-gray-600 truncate">{p || "—"}</p>
                                ))}
                              </div>
                              <div>
                                <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Top Departments</p>
                                {(d.departments || []).slice(0, 5).map((p, j) => (
                                  <p key={j} className="text-[10px] text-gray-600 truncate">{p || "—"}</p>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 flex items-center gap-2">
                            {d.seller_phone && (
                              <a href={`tel:${d.seller_phone}`}
                                className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700">
                                <Phone size={11} />{d.seller_phone}
                              </a>
                            )}
                            <button onClick={() => onDealerClick?.(d.dealer)}
                              className="text-xs text-gray-500 hover:text-gray-700 underline ml-auto">
                              Open dealer profile →
                            </button>
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
