"use client"
import { useEffect, useState } from "react"
import { X, RefreshCw, Download, ExternalLink } from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DealerBid {
  bid_number: string
  page_id: number | null
  dept: string | null
  state: string | null
  keyword: string
  variant: string
  l1_name: string | null
  l2_name: string | null
  l3_name: string | null
  l1_price: string | null
  est_value: string | null
  updated_at: string
  rank: string
}

export interface DealerDetail {
  name: string
  aliases: string[]
  l1_wins: number
  l2_count: number
  l3_count: number
  departments: string[]
  states: string[]
  is_100x_dealer: boolean
  crm_contacted: boolean
  crm_notes: string
  crm_follow_up: string
  contacted_at: string | null
  auth_score: number
  first_bid_date: string | null
  last_bid_date: string | null
  bid_count: number
  bids: DealerBid[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })
}

function Pill({ c, children }: { c: string; children: React.ReactNode }) {
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${c}`}>{children}</span>
}

const RANK_COLOR: Record<string, string> = {
  L1: "bg-green-100 text-green-700",
  L2: "bg-blue-100 text-blue-700",
  L3: "bg-gray-100 text-gray-600",
}

function exportCSV(dealer: DealerDetail) {
  const headers = ["bid_number", "dept", "state", "keyword", "variant", "rank", "l1_name", "l2_name", "l3_name", "date"]
  const rows = dealer.bids.map(b => [
    b.bid_number, b.dept ?? "", b.state ?? "",
    b.keyword, b.variant, b.rank,
    b.l1_name ?? "", b.l2_name ?? "", b.l3_name ?? "",
    fmtDate(b.updated_at),
  ])
  const csv = [headers, ...rows]
    .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n")
  const blob = new Blob([csv], { type: "text/csv" })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement("a")
  a.href     = url
  a.download = `${dealer.name.replace(/\s+/g, "_")}_bids.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  name: string
  onClose: () => void
  onBidClick: (bidNumber: string) => void
  onRefreshList?: () => void
}

export function DealerPanel({ name, onClose, onBidClick, onRefreshList }: Props) {
  const [dealer, setDealer] = useState<DealerDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState("")

  // CRM form state (separate from dealer to allow edits without re-fetch)
  const [is100x,   setIs100x]   = useState(false)
  const [contacted, setContacted] = useState(false)
  const [notes,    setNotes]    = useState("")
  const [followUp, setFollowUp] = useState("")

  useEffect(() => {
    setLoading(true)
    setSaved(false)
    setSaveError("")
    fetch(`/api/admin/procurement/dealer?name=${encodeURIComponent(name)}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setLoading(false); return }
        setDealer(d)
        setIs100x(d.is_100x_dealer ?? false)
        setContacted(d.crm_contacted ?? false)
        setNotes(d.crm_notes ?? "")
        setFollowUp(d.crm_follow_up ?? "")
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [name])

  const handleSave = async () => {
    setSaving(true)
    setSaveError("")
    try {
      const res = await fetch("/api/admin/procurement/dealer", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          canonical_name: name,
          is_100x_dealer: is100x,
          crm_contacted: contacted,
          already_contacted: dealer?.crm_contacted,
          crm_notes: notes,
          crm_follow_up: followUp,
        }),
      }).then(r => r.json())

      if (!res.ok && !res.modified) throw new Error("Save failed")
      if (dealer) setDealer({ ...dealer, is_100x_dealer: is100x, crm_contacted: contacted, crm_notes: notes, crm_follow_up: followUp })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      onRefreshList?.()
    } catch {
      setSaveError("Save failed")
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/25" onClick={onClose} />

      {/* Slide-over panel */}
      <div className="fixed right-0 top-0 h-full w-[580px] z-50 bg-white shadow-2xl flex flex-col border-l border-gray-200">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-white shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm font-bold text-gray-900 leading-tight">{name}</h2>
                {is100x && <Pill c="bg-green-100 text-green-700">100X</Pill>}
                {contacted && <Pill c="bg-amber-100 text-amber-700">Contacted</Pill>}
              </div>
              {dealer && (
                <div className="flex items-center flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[11px] text-gray-400">
                  <span>Score <strong className="text-brand-600">{dealer.auth_score}</strong></span>
                  <span>{dealer.bid_count} bids</span>
                  {dealer.first_bid_date && <span>Since {fmtDate(dealer.first_bid_date)}</span>}
                  {dealer.last_bid_date  && <span>Last {fmtDate(dealer.last_bid_date)}</span>}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {dealer && (
                <button onClick={() => exportCSV(dealer)}
                  title="Export CSV"
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700">
                  <Download size={14} />
                </button>
              )}
              <button onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700">
                <X size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !dealer ? (
            <div className="p-8 text-sm text-red-500 text-center">Dealer not found in database.</div>
          ) : (
            <>
              {/* Stats row */}
              <div className="px-6 py-4 grid grid-cols-5 gap-2 border-b border-gray-100">
                {[
                  { label: "L1 Wins",  value: dealer.l1_wins,            color: "text-green-700" },
                  { label: "L2",       value: dealer.l2_count || "—",    color: "text-blue-700"  },
                  { label: "L3",       value: dealer.l3_count || "—",    color: "text-gray-600"  },
                  { label: "Depts",    value: dealer.departments.length,  color: "text-purple-700"},
                  { label: "States",   value: dealer.states.length || "—",color: "text-amber-700" },
                ].map(s => (
                  <div key={s.label} className="text-center py-2">
                    <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-[9px] text-gray-400 uppercase tracking-wide mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Departments + States */}
              {(dealer.departments.length > 0 || dealer.states.length > 0) && (
                <div className="px-6 py-3 border-b border-gray-100 space-y-2">
                  {dealer.departments.length > 0 && (
                    <div>
                      <p className="text-[9px] text-gray-400 uppercase tracking-wide mb-1.5">Departments</p>
                      <div className="flex flex-wrap gap-1">
                        {dealer.departments.map(d => (
                          <span key={d} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full max-w-[200px] truncate" title={d}>{d}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {dealer.states.length > 0 && (
                    <div>
                      <p className="text-[9px] text-gray-400 uppercase tracking-wide mb-1.5">States</p>
                      <div className="flex flex-wrap gap-1">
                        {dealer.states.map(s => <Pill key={s} c="bg-blue-50 text-blue-600">{s}</Pill>)}
                      </div>
                    </div>
                  )}
                  {dealer.aliases.length > 1 && (
                    <div>
                      <p className="text-[9px] text-gray-400 uppercase tracking-wide mb-1">Also listed as</p>
                      <p className="text-[10px] text-gray-500">{dealer.aliases.filter(a => a.toUpperCase() !== name).slice(0,3).join(" · ")}</p>
                    </div>
                  )}
                </div>
              )}

              {/* CRM Section */}
              <div className="px-6 py-4 border-b border-gray-100 bg-amber-50/20">
                <p className="text-[9px] text-gray-500 uppercase tracking-wide font-semibold mb-3">CRM Actions</p>
                <div className="space-y-3">
                  {/* Contacted + 100X in one row */}
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={contacted} onChange={e => setContacted(e.target.checked)}
                        className="rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                      <span className="text-xs text-gray-700">Contacted</span>
                      {dealer.contacted_at && (
                        <span className="text-[10px] text-gray-400">({fmtDate(dealer.contacted_at)})</span>
                      )}
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={is100x} onChange={e => setIs100x(e.target.checked)}
                        className="rounded border-gray-300 text-green-600 focus:ring-green-500" />
                      <span className="text-xs font-medium text-gray-700">100X Dealer</span>
                    </label>
                  </div>

                  {/* Follow-up date */}
                  <div>
                    <label className="text-[9px] text-gray-400 uppercase tracking-wide block mb-1">Follow-up date</label>
                    <input type="date" value={followUp} onChange={e => setFollowUp(e.target.value)}
                      className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 bg-white w-44 focus:outline-none focus:ring-1 focus:ring-brand-400" />
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="text-[9px] text-gray-400 uppercase tracking-wide block mb-1">Notes</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)}
                      rows={3} placeholder="Add notes about this dealer…"
                      className="text-xs border border-gray-200 rounded-lg px-3 py-2 w-full resize-none bg-white focus:outline-none focus:ring-1 focus:ring-brand-400" />
                  </div>

                  {/* Save */}
                  <div className="flex items-center gap-3">
                    <button onClick={handleSave} disabled={saving}
                      className="text-xs bg-brand-600 text-white px-4 py-1.5 rounded-lg hover:bg-brand-700 disabled:opacity-50 flex items-center gap-1.5">
                      {saving
                        ? <><RefreshCw size={11} className="animate-spin" />Saving…</>
                        : "Save CRM"}
                    </button>
                    {saved     && <span className="text-xs text-green-600 font-medium">Saved!</span>}
                    {saveError && <span className="text-xs text-red-500">{saveError}</span>}
                  </div>
                </div>
              </div>

              {/* Bids table */}
              <div className="px-6 py-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-gray-700">
                    Associated Bids <span className="text-gray-400 font-normal">({dealer.bids.length})</span>
                  </p>
                  <button onClick={() => exportCSV(dealer)}
                    className="text-[11px] text-brand-600 border border-brand-200 px-2.5 py-1 rounded-lg hover:bg-brand-50 flex items-center gap-1">
                    <Download size={10} />Export CSV
                  </button>
                </div>

                {dealer.bids.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">No bids found for this dealer.</p>
                ) : (
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          {["Bid Number","Department","Rank","Date"].map(h => (
                            <th key={h} className="text-left px-3 py-2 text-gray-400 font-medium whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {dealer.bids.map(b => (
                          <tr key={b.bid_number}
                            className={`hover:bg-gray-50/50 transition-colors ${b.rank === "L1" ? "bg-green-50/30" : ""}`}>
                            <td className="px-3 py-2">
                              <button onClick={() => onBidClick(b.bid_number)}
                                className="font-mono text-[10px] text-brand-600 hover:underline text-left">
                                {b.bid_number}
                              </button>
                            </td>
                            <td className="px-3 py-2 text-gray-600 max-w-[160px]">
                              <span className="truncate block" title={b.dept ?? ""}>{(b.dept ?? "—").slice(0, 28)}</span>
                            </td>
                            <td className="px-3 py-2">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${RANK_COLOR[b.rank] ?? "bg-gray-50 text-gray-400"}`}>
                                {b.rank}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-gray-400 whitespace-nowrap">{fmtDate(b.updated_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
