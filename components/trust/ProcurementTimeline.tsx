"use client"

import { useState } from "react"

export interface TimelineRecord {
  _id: string
  organization: string
  department: string
  state: string
  product: string
  orderYear: number
  orderValue?: number | null
  quantity?: number | null
  status: string
  category: string
}

interface Props {
  records: TimelineRecord[]
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Municipal: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 21h18M3 7v1a3 3 0 006 0V7m0 1a3 3 0 006 0V7m0 1a3 3 0 006 0V7M6 21V10.85M18 21V10.85M3 7l9-4 9 4" />
    </svg>
  ),
  Health: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  ),
  Defence: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s-8-4-8-10V5l8-3 8 3v7c0 6-8 10-8 10z" />
    </svg>
  ),
  Railways: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="16" height="13" rx="2" /><path d="M4 13h16M7 21h10M9 21V16M15 21V16" />
    </svg>
  ),
}

const CATEGORY_COLORS: Record<string, string> = {
  Municipal: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  Health: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  Defence: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  Railways: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  Agriculture: "bg-lime-500/20 text-lime-400 border-lime-500/30",
  Other: "bg-violet-500/20 text-violet-400 border-violet-500/30",
}

function groupByYear(records: TimelineRecord[]) {
  const map: Record<number, TimelineRecord[]> = {}
  for (const r of records) {
    if (!map[r.orderYear]) map[r.orderYear] = []
    map[r.orderYear].push(r)
  }
  return Object.entries(map)
    .sort(([a], [b]) => Number(b) - Number(a))
    .map(([year, recs]) => ({ year: Number(year), recs }))
}

export default function ProcurementTimeline({ records }: Props) {
  const [expanded, setExpanded] = useState<number | null>(null)
  const groups = groupByYear(records)

  if (records.length === 0) {
    return (
      <div className="bg-slate-900 rounded-2xl border border-white/[0.06] p-10 text-center">
        <svg className="w-10 h-10 text-slate-700 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <p className="text-slate-500 text-sm">Timeline populates automatically once procurement records are imported</p>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-[5.5rem] md:left-24 top-0 bottom-0 w-px bg-gradient-to-b from-emerald-500/30 via-emerald-500/10 to-transparent" />

      <div className="space-y-6">
        {groups.map(({ year, recs }) => {
          const isOpen = expanded === year
          const totalValue = recs.reduce((s, r) => s + (r.orderValue || 0), 0)
          const totalQty = recs.reduce((s, r) => s + (r.quantity || 0), 0)

          return (
            <div key={year} className="flex gap-4 md:gap-6">
              {/* Year marker */}
              <div className="w-20 md:w-24 shrink-0 pt-4 text-right">
                <span className="text-white font-black text-xl md:text-2xl">{year}</span>
              </div>

              {/* Dot on timeline */}
              <div className="relative shrink-0 mt-4">
                <div className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-emerald-300 shadow-lg shadow-emerald-500/50 relative z-10" />
              </div>

              {/* Content */}
              <div className="flex-1 pb-2">
                <button
                  onClick={() => setExpanded(isOpen ? null : year)}
                  className="w-full text-left group"
                >
                  <div className="bg-slate-900 border border-white/[0.06] hover:border-white/[0.12] rounded-2xl p-4 md:p-5 transition-all duration-200 group-hover:bg-slate-800/60">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-white font-bold">
                          {recs.length} {recs.length === 1 ? "Deployment" : "Deployments"}
                        </span>
                        {totalValue > 0 && (
                          <span className="text-emerald-400 text-sm font-semibold">₹{totalValue.toLocaleString("en-IN")}L</span>
                        )}
                        {totalQty > 0 && (
                          <span className="text-slate-400 text-sm">{totalQty} units</span>
                        )}
                        <div className="flex gap-1.5 flex-wrap">
                          {[...new Set(recs.map((r) => r.state))].slice(0, 3).map((s) => (
                            <span key={s} className="text-[10px] px-2 py-0.5 bg-white/5 text-slate-400 rounded-full border border-white/[0.08]">{s}</span>
                          ))}
                          {[...new Set(recs.map((r) => r.state))].length > 3 && (
                            <span className="text-[10px] text-slate-500">+{[...new Set(recs.map((r) => r.state))].length - 3} states</span>
                          )}
                        </div>
                      </div>
                      <svg
                        className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </div>
                </button>

                {/* Expanded records */}
                {isOpen && (
                  <div className="mt-2 space-y-2 pl-4">
                    {recs.map((r) => {
                      const catColor = CATEGORY_COLORS[r.category] || CATEGORY_COLORS.Other
                      const icon = CATEGORY_ICONS[r.category]
                      return (
                        <div
                          key={r._id}
                          className="bg-slate-900/80 border border-white/[0.06] rounded-xl p-4 flex gap-3"
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${catColor} border`}>
                            {icon || (
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                <path d="M3 21h18M3 7v1a3 3 0 006 0V7" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-semibold text-sm truncate">{r.organization}</p>
                            <p className="text-slate-500 text-xs mt-0.5">{r.department} · {r.state}</p>
                            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                              <span className="text-slate-400 text-xs">{r.product}</span>
                              {r.orderValue && (
                                <span className="text-emerald-400 text-xs font-semibold">₹{r.orderValue}L</span>
                              )}
                              {r.quantity && (
                                <span className="text-slate-400 text-xs">{r.quantity} units</span>
                              )}
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${catColor}`}>
                                {r.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
