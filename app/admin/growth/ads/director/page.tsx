"use client"
import { useEffect, useState, useCallback } from "react"
import { Megaphone, Play, RotateCw, AlertCircle, TrendingDown, Plus, DollarSign, MousePointerClick, ShieldAlert } from "lucide-react"

interface Rec {
  _id: string
  type: "negative_keyword" | "new_keyword" | "high_cpc" | "low_ctr"
  title: string
  detail: string
  confidence: "high" | "medium" | "low"
  expectedImpact: string
  governance: string
}
interface Snapshot {
  spend: number; clicks: number; impressions: number; ctr: number; avgCpc: number
  adsCallConversions: number
  websiteEnquiries: { rfqPopup: number; submissions: number; gemInquiries: number; window: string }
}
interface DirectorData {
  connected: boolean
  message?: string
  syncDate?: string
  lastRun?: string | null
  recommendations: Rec[]
  snapshot: Snapshot | null
}

const TYPE_META: Record<Rec["type"], { label: string; icon: React.ComponentType<{ size?: number; className?: string }>; color: string }> = {
  negative_keyword: { label: "Negative keyword", icon: TrendingDown, color: "text-red-600" },
  new_keyword: { label: "New keyword", icon: Plus, color: "text-green-600" },
  high_cpc: { label: "High CPC", icon: DollarSign, color: "text-amber-600" },
  low_ctr: { label: "Low CTR", icon: MousePointerClick, color: "text-blue-600" },
}
const CONF: Record<string, string> = { high: "bg-green-100 text-green-700", medium: "bg-amber-100 text-amber-700", low: "bg-gray-100 text-gray-500" }
const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`

export default function AdsDirector() {
  const [data, setData] = useState<DirectorData | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [filter, setFilter] = useState<string>("all")

  const load = useCallback(async () => {
    setLoading(true)
    try { setData(await fetch("/api/admin/growth/agents/google-ads-director").then((r) => r.json())) } catch { /* */ }
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  const run = async () => {
    setRunning(true)
    try { await fetch("/api/admin/growth/agents/google-ads-director", { method: "POST" }); await load() } catch { /* */ }
    setRunning(false)
  }

  const recs = (data?.recommendations || []).filter((r) => filter === "all" || r.type === filter)
  const s = data?.snapshot

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      <div className="bg-white border-b border-gray-200 px-8 py-5 sticky top-0 z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Megaphone size={18} className="text-brand-600" />
          <div>
            <h1 className="text-base font-bold text-gray-900">Google Ads Director — Phase 1</h1>
            <p className="text-gray-400 text-[11px]">Read-only intelligence · recommendations only · no automatic spend{data?.syncDate ? ` · data ${data.syncDate}` : ""}</p>
          </div>
        </div>
        <button onClick={run} disabled={running}
          className="flex items-center gap-1.5 text-xs bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 disabled:opacity-50">
          {running ? <RotateCw size={12} className="animate-spin" /> : <Play size={12} />}{running ? "Analyzing…" : "Run Director"}
        </button>
      </div>

      <div className="px-8 py-6 max-w-[1400px] space-y-5">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2 items-center">
          <ShieldAlert size={14} className="text-amber-500 shrink-0" />
          <p className="text-[11px] text-amber-700">Governance: the Director never changes spend, bids, budgets, or keywords. Every recommendation requires your approval before action.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : !data?.connected ? (
          <div className="bg-white rounded-xl border border-dashed border-gray-200 p-10 text-center">
            <AlertCircle size={20} className="text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">{data?.message || "No Ads data yet."}</p>
            <p className="text-gray-400 text-xs mt-1">Connect Google Ads in <span className="font-mono">Ads Setup</span> and run a sync, then run the Director.</p>
          </div>
        ) : (
          <>
            {/* ROAS V1 funnel snapshot */}
            {s && (
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
                {[
                  { label: "Spend", value: inr(s.spend) },
                  { label: "Clicks", value: s.clicks.toLocaleString("en-IN") },
                  { label: "CTR", value: `${s.ctr}%` },
                  { label: "Avg CPC", value: inr(s.avgCpc) },
                  { label: "Ads Calls", value: s.adsCallConversions },
                  { label: `Enquiries (${s.websiteEnquiries.window})`, value: s.websiteEnquiries.rfqPopup + s.websiteEnquiries.submissions + s.websiteEnquiries.gemInquiries },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">{label}</p>
                    <p className="text-xl font-bold text-gray-800">{value}</p>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[10px] text-gray-400 -mt-2">V1 ROAS funnel: spend → clicks → calls → WhatsApp / RFQ enquiries (enquiries are the conversion event).</p>

            {/* filter */}
            <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-sm w-fit">
              {[["all", "All"], ["negative_keyword", "Negatives"], ["new_keyword", "New keywords"], ["high_cpc", "High CPC"], ["low_ctr", "Low CTR"]].map(([k, label]) => (
                <button key={k} onClick={() => setFilter(k)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium ${filter === k ? "bg-brand-600 text-white" : "text-gray-500 hover:text-gray-700"}`}>{label}</button>
              ))}
            </div>

            {/* recommendations */}
            {recs.length === 0 ? (
              <div className="bg-white rounded-xl border border-dashed border-gray-200 p-10 text-center">
                <p className="text-gray-400 text-sm">No recommendations for this filter. Run the Director after a fresh Ads sync.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recs.map((r) => {
                  const m = TYPE_META[r.type]
                  return (
                    <div key={r._id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-start gap-3">
                      <m.icon size={16} className={`${m.color} shrink-0 mt-0.5`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-semibold text-gray-400 uppercase">{m.label}</span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${CONF[r.confidence]}`}>{r.confidence}</span>
                        </div>
                        <p className="text-sm font-semibold text-gray-800 mt-0.5">{r.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{r.detail}</p>
                        <p className="text-[11px] text-brand-600 mt-1">{r.expectedImpact}</p>
                        <p className="text-[10px] text-gray-300 mt-0.5">{r.governance}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
