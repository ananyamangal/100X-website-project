"use client"
import { useEffect, useState, useCallback } from "react"
import {
  Megaphone, Play, RotateCw, AlertCircle, TrendingDown, Plus,
  DollarSign, MousePointerClick, ShieldAlert, Users, Target,
  CheckCircle2, XCircle, ChevronDown, ChevronUp, ExternalLink,
} from "lucide-react"

// ── Ads Director types ────────────────────────────────────────────────────────

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

// ── Audience Intelligence types ───────────────────────────────────────────────

interface AudienceSegment {
  id: string
  label: string
  description: string
  size: number
  estimated_value_inr: number
  recommended_campaign: string
  campaign_rationale: string
  readiness: "ready" | "needs_data" | "not_ready"
}

interface CustomerMatchRec {
  id: string
  label: string
  list_size: number
  match_rate_est: number
  expected_matches: number
  ready_to_upload: boolean
  reason: string
}

interface AudienceIntelData {
  generated_at: string
  segments: AudienceSegment[]
  customer_match: CustomerMatchRec[]
  summary: {
    total_addressable_size: number
    total_addressable_value_inr: number
    ready_segments: number
    customer_match_eligible: boolean
  }
}

// ── Remarketing types ─────────────────────────────────────────────────────────

interface RemarketingData {
  verdict: "YES" | "NO" | "NOT_YET"
  verdictReason: string
  summary: { pass: number; warn: number; fail: number; total: number }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const TYPE_META: Record<Rec["type"], { label: string; icon: React.ComponentType<{ size?: number; className?: string }>; color: string }> = {
  negative_keyword: { label: "Negative keyword", icon: TrendingDown, color: "text-red-600" },
  new_keyword:      { label: "New keyword",       icon: Plus,         color: "text-green-600" },
  high_cpc:         { label: "High CPC",          icon: DollarSign,   color: "text-amber-600" },
  low_ctr:          { label: "Low CTR",           icon: MousePointerClick, color: "text-blue-600" },
}
const CONF: Record<string, string> = {
  high: "bg-green-100 text-green-700", medium: "bg-amber-100 text-amber-700", low: "bg-gray-100 text-gray-500"
}

const INR = (n: number) =>
  n >= 1e7 ? `₹${(n / 1e7).toFixed(1)} Cr` :
  n >= 1e5 ? `₹${(n / 1e5).toFixed(1)} L` :
  n > 0    ? `₹${Math.round(n).toLocaleString("en-IN")}` : "₹0"

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`

const READINESS_STYLE: Record<AudienceSegment["readiness"], string> = {
  ready:      "bg-green-100 text-green-700",
  needs_data: "bg-amber-100 text-amber-700",
  not_ready:  "bg-red-100 text-red-600",
}

// ── Audience Intelligence Panel ───────────────────────────────────────────────

function AudienceIntelPanel() {
  const [data, setData] = useState<AudienceIntelData | null>(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(true)
  const [showCM, setShowCM] = useState(false)

  useEffect(() => {
    fetch("/api/admin/growth/ads/audience-intelligence")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="bg-white rounded-xl border border-blue-200 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-blue-50"
      >
        <div className="flex items-center gap-2">
          <Users size={16} className="text-blue-600" />
          <span className="text-sm font-semibold text-gray-900">Audience Intelligence</span>
          {data && (
            <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-semibold">
              {data.summary.ready_segments}/{data.segments.length} ready
            </span>
          )}
        </div>
        {open ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
      </button>

      {open && (
        <div className="border-t border-blue-100 px-5 py-4 space-y-4">
          {loading ? (
            <div className="h-24 flex items-center justify-center text-gray-400 text-sm">Loading audience data…</div>
          ) : !data ? (
            <div className="text-sm text-gray-400 py-4 text-center">Could not load audience data</div>
          ) : (
            <>
              {/* Summary strip */}
              <div className="flex flex-wrap gap-4 text-xs bg-blue-50 rounded-lg px-4 py-3">
                <span><span className="font-semibold text-blue-900">Addressable orgs:</span> <span className="text-blue-700">{data.summary.total_addressable_size.toLocaleString()}</span></span>
                <span><span className="font-semibold text-blue-900">Market value:</span> <span className="text-blue-700">{INR(data.summary.total_addressable_value_inr)}</span></span>
                <span><span className="font-semibold text-blue-900">Customer Match:</span> <span className={data.summary.customer_match_eligible ? "text-green-700 font-semibold" : "text-amber-600"}>
                  {data.summary.customer_match_eligible ? "Eligible" : "Not yet eligible"}
                </span></span>
              </div>

              {/* Segment table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      {["Audience", "Size", "Market Value", "Readiness", "Recommended Campaign"].map(h => (
                        <th key={h} className="text-left px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.segments.map(seg => (
                      <tr key={seg.id} className="hover:bg-gray-50/50">
                        <td className="px-3 py-3">
                          <p className="font-semibold text-gray-800">{seg.label}</p>
                          <p className="text-gray-400 text-[11px] mt-0.5 max-w-[200px]">{seg.description}</p>
                        </td>
                        <td className="px-3 py-3 font-semibold text-gray-700 whitespace-nowrap">{seg.size.toLocaleString()}</td>
                        <td className="px-3 py-3 text-emerald-700 font-semibold whitespace-nowrap">{INR(seg.estimated_value_inr)}</td>
                        <td className="px-3 py-3">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${READINESS_STYLE[seg.readiness]}`}>
                            {seg.readiness === "ready" ? "Ready" : seg.readiness === "needs_data" ? "Needs Data" : "Not Ready"}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-medium text-gray-700">{seg.recommended_campaign}</p>
                          <p className="text-gray-400 text-[11px] mt-0.5 max-w-[220px]">{seg.campaign_rationale}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Customer Match section */}
              <div>
                <button
                  onClick={() => setShowCM(v => !v)}
                  className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline font-medium"
                >
                  {showCM ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                  Customer Match Recommendations ({data.customer_match.length})
                </button>
                {showCM && (
                  <div className="mt-3 space-y-2">
                    {data.customer_match.map(cm => (
                      <div key={cm.id} className={`rounded-lg border px-4 py-3 ${cm.ready_to_upload ? "border-green-200 bg-green-50" : "border-gray-200 bg-gray-50"}`}>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-gray-800">{cm.label}</p>
                          <div className="flex items-center gap-1.5 text-[10px]">
                            {cm.ready_to_upload
                              ? <><CheckCircle2 size={11} className="text-green-500" /><span className="text-green-700 font-semibold">Ready to upload</span></>
                              : <><XCircle size={11} className="text-amber-500" /><span className="text-amber-600">Not ready</span></>
                            }
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-4 mt-1.5 text-[11px] text-gray-500">
                          <span>List size: <span className="font-semibold text-gray-700">{cm.list_size.toLocaleString()}</span></span>
                          <span>Est. match rate: <span className="font-semibold">{cm.match_rate_est}%</span></span>
                          <span>Expected matches: <span className="font-semibold">{cm.expected_matches.toLocaleString()}</span></span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-1">{cm.reason}</p>
                      </div>
                    ))}
                    <p className="text-[10px] text-gray-400 mt-1">
                      No automatic deployment. Upload lists manually via{" "}
                      <a href="https://ads.google.com/aw/audiences" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline inline-flex items-center gap-0.5">
                        Google Ads Audience Manager <ExternalLink size={9} />
                      </a>
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Remarketing Status Card ───────────────────────────────────────────────────

function RemarketingStatusCard() {
  const [data, setData] = useState<RemarketingData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/admin/growth/ads/remarketing-readiness")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const VERDICT_STYLE = {
    YES:      { bg: "bg-green-50 border-green-200", badge: "bg-green-100 text-green-700", label: "Ready for Remarketing" },
    NO:       { bg: "bg-red-50 border-red-200",     badge: "bg-red-100 text-red-700",     label: "Not Ready" },
    NOT_YET:  { bg: "bg-amber-50 border-amber-200", badge: "bg-amber-100 text-amber-700", label: "Work In Progress" },
  }

  const style = data ? (VERDICT_STYLE[data.verdict] ?? VERDICT_STYLE.NOT_YET) : null

  return (
    <div className={`rounded-xl border px-5 py-4 flex items-center justify-between gap-4 ${style?.bg ?? "bg-gray-50 border-gray-200"}`}>
      <div className="flex items-center gap-3">
        <Target size={16} className="text-gray-500 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-gray-900">Remarketing Readiness</p>
          {loading ? (
            <p className="text-xs text-gray-400 mt-0.5">Checking…</p>
          ) : data ? (
            <p className="text-xs text-gray-600 mt-0.5">{data.verdictReason}</p>
          ) : (
            <p className="text-xs text-gray-400 mt-0.5">Could not load status</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {data && (
          <>
            <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${style?.badge}`}>{style?.label}</span>
            <span className="text-[10px] text-gray-400">{data.summary.pass}/{data.summary.total} checks</span>
          </>
        )}
        <a
          href="/admin/growth/ads/remarketing-readiness"
          className="text-[11px] text-blue-600 hover:underline whitespace-nowrap"
        >
          Full audit →
        </a>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

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

        {/* Remarketing status — always visible */}
        <RemarketingStatusCard />

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

        {/* Audience Intelligence — always visible, from fogging data */}
        <AudienceIntelPanel />
      </div>
    </div>
  )
}
