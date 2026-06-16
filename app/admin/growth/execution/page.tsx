"use client"
import { useState, useEffect, useCallback } from "react"
import {
  Zap, RefreshCw, ChevronRight, AlertCircle,
  Users, Target, BarChart2, Link2,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Rec {
  _id: string
  title: string
  type: string
  status: string
  priority: number
  generated_at: string
  summary?: string
}

interface Dealer {
  _id: string
  name: string
  company: string
  state: string
  stage: string
  expected_revenue: number
  source_recommendation_id?: string
  next_followup_at?: string
}

interface Opportunity {
  _id: string
  name: string
  organization: string
  state: string
  stage: string
  opportunity_type: string
  value: number
  probability: number
  next_action?: string
  source_recommendation_id?: string
}

interface ExecutionData {
  recs: Rec[]
  dealers: Dealer[]
  opportunities: Opportunity[]
  counts: { recs: number; dealers: number; opportunities: number }
}

// ─── Label maps ───────────────────────────────────────────────────────────────

const REC_STATUS_COLOR: Record<string, string> = {
  approved:   "bg-blue-100 text-blue-700",
  in_progress:"bg-indigo-100 text-indigo-700",
  applied:    "bg-purple-100 text-purple-700",
  waiting:    "bg-yellow-100 text-yellow-700",
  completed:  "bg-green-100 text-green-700",
}

const DEALER_STAGE_COLOR: Record<string, string> = {
  lead:       "bg-gray-100 text-gray-600",
  contacted:  "bg-blue-100 text-blue-700",
  qualified:  "bg-indigo-100 text-indigo-700",
  discussion: "bg-yellow-100 text-yellow-700",
  authorized: "bg-purple-100 text-purple-700",
}

const OPP_STAGE_COLOR: Record<string, string> = {
  identified:          "bg-gray-100 text-gray-600",
  approved:            "bg-blue-100 text-blue-700",
  research:            "bg-indigo-100 text-indigo-700",
  meeting_scheduled:   "bg-yellow-100 text-yellow-700",
  quotation_submitted: "bg-orange-100 text-orange-700",
  bid_submitted:       "bg-purple-100 text-purple-700",
}

const OPP_TYPE_LABEL: Record<string, string> = {
  dealer_recruitment: "Dealer",
  oem_displacement:   "OEM",
  procurement:        "Procurement",
  other:              "Other",
}

const INR = (n: number) =>
  n >= 1e7 ? `₹${(n / 1e7).toFixed(1)} Cr` :
  n >= 1e5 ? `₹${(n / 1e5).toFixed(1)} L` :
  n > 0 ? `₹${Math.round(n).toLocaleString("en-IN")}` : "—"

function fmtLabel(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
}

function fmtDate(iso?: string) {
  if (!iso) return null
  try { return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) }
  catch { return null }
}

// ─── Section card wrapper ─────────────────────────────────────────────────────

function Section({
  icon: Icon, title, count, href, color, children, empty,
}: {
  icon: React.ElementType
  title: string
  count: number
  href: string
  color: string
  children: React.ReactNode
  empty: string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Icon size={16} className={color} />
          <span className="text-sm font-semibold text-gray-900">{title}</span>
          <span className="text-xs text-gray-400 font-normal">({count})</span>
        </div>
        <a href={href} className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
          View all <ChevronRight size={11} />
        </a>
      </div>
      <div className="divide-y divide-gray-50">
        {count === 0 ? (
          <div className="p-6 text-center text-sm text-gray-400">{empty}</div>
        ) : children}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ExecutionHubPage() {
  const [data,    setData]    = useState<ExecutionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/growth/execution")
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setData(await res.json())
    } catch (e) { setError(String(e)) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const totalItems = (data?.counts.recs ?? 0) + (data?.counts.dealers ?? 0) + (data?.counts.opportunities ?? 0)

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Zap size={20} className="text-amber-500" />
            <h1 className="text-xl font-bold text-gray-900">Execution Hub</h1>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            All active work in one view — approved recs, in-flight dealers, and open opportunities
          </p>
        </div>
        <button onClick={() => load()} disabled={loading} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700 flex items-center gap-2">
          <AlertCircle size={14} className="text-red-400 flex-shrink-0" />{error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
          <RefreshCw size={16} className="animate-spin mr-2" /> Loading execution state…
        </div>
      ) : (
        <>
          {/* Summary strip */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6 flex flex-wrap items-center gap-x-6 gap-y-2">
            <span className="text-sm font-semibold text-amber-800">{totalItems} active items</span>
            {data && (
              <>
                <span className="text-sm text-amber-700">{data.counts.recs} Director recommendations</span>
                <span className="text-sm text-amber-700">{data.counts.dealers} dealer pipeline</span>
                <span className="text-sm text-amber-700">{data.counts.opportunities} open opportunities</span>
              </>
            )}
            {totalItems === 0 && (
              <span className="text-sm text-amber-600">Nothing in execution yet — approve recommendations in Revenue Director to populate this hub.</span>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Revenue Director Recs */}
            <Section
              icon={BarChart2}
              title="Director Recs"
              count={data?.counts.recs ?? 0}
              href="/admin/growth/director"
              color="text-blue-500"
              empty="No approved or in-progress recommendations"
            >
              {data?.recs.map(rec => (
                <div key={rec._id} className="px-4 py-3 hover:bg-gray-50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{rec.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${REC_STATUS_COLOR[rec.status] || "bg-gray-100 text-gray-600"}`}>
                          {fmtLabel(rec.status)}
                        </span>
                        <span className="text-[10px] text-gray-400">{fmtLabel(rec.type)}</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-gray-400 flex-shrink-0">P{rec.priority}</span>
                  </div>
                  {rec.summary && (
                    <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{rec.summary}</p>
                  )}
                  <a
                    href={`/admin/growth/director?rec=${rec._id}`}
                    className="inline-flex items-center gap-0.5 text-[11px] text-blue-600 hover:underline mt-1.5"
                  >
                    <Link2 size={9} />View pack
                  </a>
                </div>
              ))}
            </Section>

            {/* Active Dealers */}
            <Section
              icon={Users}
              title="Dealer Pipeline"
              count={data?.counts.dealers ?? 0}
              href="/admin/growth/crm/dealers"
              color="text-blue-600"
              empty="No active dealers in pipeline"
            >
              {data?.dealers.map(dealer => (
                <div key={dealer._id} className="px-4 py-3 hover:bg-gray-50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{dealer.company}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${DEALER_STAGE_COLOR[dealer.stage] || "bg-gray-100 text-gray-600"}`}>
                          {fmtLabel(dealer.stage)}
                        </span>
                        {dealer.state && <span className="text-[10px] text-gray-400">{dealer.state}</span>}
                      </div>
                    </div>
                    {dealer.expected_revenue > 0 && (
                      <span className="text-[11px] text-emerald-600 font-medium flex-shrink-0">{INR(dealer.expected_revenue)}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5">
                    {dealer.next_followup_at && (
                      <span className="text-[11px] text-orange-600">Follow-up: {fmtDate(dealer.next_followup_at)}</span>
                    )}
                    {dealer.source_recommendation_id && (
                      <a
                        href={`/admin/growth/director?rec=${dealer.source_recommendation_id}`}
                        className="inline-flex items-center gap-0.5 text-[11px] text-blue-600 hover:underline"
                      >
                        <Link2 size={9} />Rec
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </Section>

            {/* Open Opportunities */}
            <Section
              icon={Target}
              title="Opportunities"
              count={data?.counts.opportunities ?? 0}
              href="/admin/growth/crm/opportunities"
              color="text-indigo-600"
              empty="No open opportunities"
            >
              {data?.opportunities.map(opp => (
                <div key={opp._id} className="px-4 py-3 hover:bg-gray-50">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{opp.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${OPP_STAGE_COLOR[opp.stage] || "bg-gray-100 text-gray-600"}`}>
                          {fmtLabel(opp.stage)}
                        </span>
                        <span className="text-[10px] text-gray-400">{OPP_TYPE_LABEL[opp.opportunity_type] ?? opp.opportunity_type}</span>
                      </div>
                    </div>
                    {opp.value > 0 && (
                      <div className="text-right flex-shrink-0">
                        <div className="text-[11px] text-emerald-600 font-medium">{INR(opp.value)}</div>
                        <div className="text-[10px] text-gray-400">{opp.probability}%</div>
                      </div>
                    )}
                  </div>
                  {opp.next_action && (
                    <p className="text-[11px] text-orange-600 mt-1.5 truncate">{opp.next_action}</p>
                  )}
                  {opp.source_recommendation_id && (
                    <a
                      href={`/admin/growth/director?rec=${opp.source_recommendation_id}`}
                      className="inline-flex items-center gap-0.5 text-[11px] text-blue-600 hover:underline mt-1"
                    >
                      <Link2 size={9} />Source rec
                    </a>
                  )}
                </div>
              ))}
            </Section>
          </div>

          {/* Execution Packs link */}
          <div className="mt-4 bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">Execution Packs</p>
              <p className="text-xs text-gray-500 mt-0.5">Auto-generated when a Director recommendation is approved — contains daily actions, target list, and scripts</p>
            </div>
            <a
              href="/admin/growth/director"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50 flex-shrink-0"
            >
              <Zap size={13} />View in Director
            </a>
          </div>
        </>
      )}
    </div>
  )
}
