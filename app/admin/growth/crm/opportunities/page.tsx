"use client"
import { useState, useEffect, useCallback } from "react"
import {
  Target, Plus, RefreshCw, ChevronRight, ChevronDown,
  MapPin, DollarSign, Calendar, TrendingUp, Edit2, X, Link2,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type Stage =
  | "identified" | "approved" | "research" | "meeting_scheduled"
  | "quotation_submitted" | "bid_submitted" | "won" | "lost"

type OppType = "dealer_recruitment" | "oem_displacement" | "procurement" | "other"

interface Opportunity {
  _id: string
  name: string
  organization: string
  state: string
  opportunity_type: OppType
  stage: Stage
  value: number
  probability: number
  actual_revenue: number
  owner: string
  source_recommendation_id?: string
  source_type: string
  notes?: string
  next_action?: string
  created_at: string
  updated_at: string
  won_at?: string
  lost_at?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STAGES: Stage[] = [
  "identified", "approved", "research", "meeting_scheduled",
  "quotation_submitted", "bid_submitted", "won", "lost",
]

const STAGE_LABEL: Record<Stage, string> = {
  identified:           "Identified",
  approved:             "Approved",
  research:             "Research",
  meeting_scheduled:    "Meeting Scheduled",
  quotation_submitted:  "Quotation Submitted",
  bid_submitted:        "Bid Submitted",
  won:                  "Won",
  lost:                 "Lost",
}

const STAGE_COLOR: Record<Stage, string> = {
  identified:           "bg-gray-100 text-gray-600 border-gray-200",
  approved:             "bg-blue-100 text-blue-700 border-blue-200",
  research:             "bg-indigo-100 text-indigo-700 border-indigo-200",
  meeting_scheduled:    "bg-yellow-100 text-yellow-700 border-yellow-200",
  quotation_submitted:  "bg-orange-100 text-orange-700 border-orange-200",
  bid_submitted:        "bg-purple-100 text-purple-700 border-purple-200",
  won:                  "bg-green-100 text-green-700 border-green-200",
  lost:                 "bg-red-100 text-red-600 border-red-200",
}

const TYPE_LABEL: Record<OppType, string> = {
  dealer_recruitment: "Dealer Recruitment",
  oem_displacement:   "OEM Displacement",
  procurement:        "Procurement",
  other:              "Other",
}

const TYPE_COLOR: Record<OppType, string> = {
  dealer_recruitment: "bg-blue-50 text-blue-600 border-blue-200",
  oem_displacement:   "bg-purple-50 text-purple-600 border-purple-200",
  procurement:        "bg-emerald-50 text-emerald-600 border-emerald-200",
  other:              "bg-gray-50 text-gray-500 border-gray-200",
}

const STAGE_PROGRESS: Record<Stage, number> = {
  identified: 1, approved: 2, research: 3, meeting_scheduled: 4,
  quotation_submitted: 5, bid_submitted: 6, won: 7, lost: 0,
}

const INR = (n: number) =>
  n >= 1e7 ? `₹${(n / 1e7).toFixed(1)} Cr` :
  n >= 1e5 ? `₹${(n / 1e5).toFixed(1)} L` :
  n > 0 ? `₹${Math.round(n).toLocaleString("en-IN")}` : "—"

function fmtDate(iso?: string) {
  if (!iso) return null
  try { return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) }
  catch { return null }
}

// ─── Blank form ───────────────────────────────────────────────────────────────

const BLANK = {
  name: "", organization: "", state: "", opportunity_type: "procurement" as OppType,
  stage: "identified" as Stage, value: 0, probability: 50, actual_revenue: 0,
  owner: "", source_recommendation_id: "", source_type: "manual",
  notes: "", next_action: "",
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function OppModal({
  initial, onSave, onClose,
}: {
  initial: typeof BLANK | Opportunity
  onSave:  (data: typeof BLANK) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm]     = useState({ ...BLANK, ...initial })
  const [saving, setSaving] = useState(false)

  function set(k: string, v: string | number) { setForm(f => ({ ...f, [k]: v })) }

  async function save() {
    if (!form.name.trim()) return
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pt-16 pb-8 overflow-y-auto">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-xl border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">{"_id" in initial ? "Edit Opportunity" : "Add Opportunity"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>
        <div className="px-5 py-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {/* Name */}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Opportunity Name *</label>
            <input value={form.name} onChange={e => set("name", e.target.value)} className="w-full text-sm border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-200" placeholder="Pest control tender — NMMC" />
          </div>
          {/* Organization + State */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Organization</label>
              <input value={form.organization} onChange={e => set("organization", e.target.value)} className="w-full text-sm border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-200" placeholder="NMMC" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">State</label>
              <input value={form.state} onChange={e => set("state", e.target.value)} className="w-full text-sm border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-200" placeholder="Maharashtra" />
            </div>
          </div>
          {/* Type + Stage */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Type</label>
              <select value={form.opportunity_type} onChange={e => set("opportunity_type", e.target.value)} className="w-full text-sm border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white">
                {(Object.keys(TYPE_LABEL) as OppType[]).map(t => (
                  <option key={t} value={t}>{TYPE_LABEL[t]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Stage</label>
              <select value={form.stage} onChange={e => set("stage", e.target.value)} className="w-full text-sm border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-200 bg-white">
                {STAGES.map(s => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
              </select>
            </div>
          </div>
          {/* Value + Probability */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Value (₹)</label>
              <input type="number" value={form.value} onChange={e => set("value", Number(e.target.value))} className="w-full text-sm border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-200" placeholder="500000" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Probability (%)</label>
              <input type="number" min={0} max={100} value={form.probability} onChange={e => set("probability", Number(e.target.value))} className="w-full text-sm border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-200" />
            </div>
          </div>
          {/* Owner */}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Owner</label>
            <input value={form.owner} onChange={e => set("owner", e.target.value)} className="w-full text-sm border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-200" placeholder="Team member name" />
          </div>
          {/* Next action */}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Next Action</label>
            <input value={form.next_action} onChange={e => set("next_action", e.target.value)} className="w-full text-sm border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-200" placeholder="Send quotation by Friday" />
          </div>
          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={3} className="w-full text-sm border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-200 resize-none" />
          </div>
          {/* Source recommendation ID */}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Source Recommendation ID</label>
            <input value={form.source_recommendation_id} onChange={e => set("source_recommendation_id", e.target.value)} className="w-full text-sm border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-200 font-mono text-xs" placeholder="Links to Revenue Director recommendation" />
          </div>
        </div>
        <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
          <button onClick={save} disabled={saving || !form.name.trim()} className="px-4 py-1.5 text-sm font-medium bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Opportunity Card ─────────────────────────────────────────────────────────

function OppCard({
  opp, onEdit, onStageChange, stageChanging,
}: {
  opp: Opportunity
  onEdit: (o: Opportunity) => void
  onStageChange: (id: string, stage: Stage) => Promise<void>
  stageChanging: string | null
}) {
  const [expanded, setExpanded] = useState(false)
  const progress = STAGE_PROGRESS[opp.stage]
  const weightedValue = opp.value * (opp.probability / 100)

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* Progress bar */}
      {opp.stage !== "lost" && (
        <div className="h-0.5 bg-gray-100">
          <div className="h-full bg-indigo-500 transition-all" style={{ width: `${(progress / 7) * 100}%` }} />
        </div>
      )}
      <div
        className="px-4 py-3 cursor-pointer hover:bg-gray-50 flex items-start gap-3"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-900">{opp.name}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${STAGE_COLOR[opp.stage]}`}>
              {STAGE_LABEL[opp.stage]}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${TYPE_COLOR[opp.opportunity_type]}`}>
              {TYPE_LABEL[opp.opportunity_type]}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
            {opp.organization && <span>{opp.organization}</span>}
            {opp.state && <span className="flex items-center gap-0.5"><MapPin size={10} />{opp.state}</span>}
            {opp.value > 0 && (
              <span className="flex items-center gap-0.5 text-emerald-600 font-medium">
                <DollarSign size={10} />{INR(opp.value)}
                {opp.probability < 100 && <span className="text-gray-400 font-normal ml-0.5">({opp.probability}% → {INR(weightedValue)})</span>}
              </span>
            )}
            {opp.owner && <span className="text-blue-500">{opp.owner}</span>}
          </div>
          {opp.next_action && (
            <div className="mt-1 text-xs text-orange-600 flex items-center gap-1">
              <TrendingUp size={10} />Next: {opp.next_action}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={e => { e.stopPropagation(); onEdit(opp) }}
            className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100"
          >
            <Edit2 size={12} />
          </button>
          {expanded ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
          {/* Revenue detail */}
          {(opp.value > 0 || opp.actual_revenue > 0) && (
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="bg-gray-50 rounded p-2">
                <div className="text-gray-400 mb-0.5">Value</div>
                <div className="font-semibold text-gray-900">{INR(opp.value)}</div>
              </div>
              <div className="bg-gray-50 rounded p-2">
                <div className="text-gray-400 mb-0.5">Probability</div>
                <div className="font-semibold text-gray-900">{opp.probability}%</div>
              </div>
              <div className="bg-gray-50 rounded p-2">
                <div className="text-gray-400 mb-0.5">Actual</div>
                <div className="font-semibold text-emerald-600">{opp.actual_revenue > 0 ? INR(opp.actual_revenue) : "—"}</div>
              </div>
            </div>
          )}
          {/* Notes */}
          {opp.notes && (
            <div className="text-xs text-gray-600 bg-gray-50 px-3 py-2 rounded border border-gray-100">
              <span className="font-medium text-gray-500 block mb-0.5">Notes</span>
              {opp.notes}
            </div>
          )}
          {/* Won/Lost timestamps */}
          {(opp.won_at || opp.lost_at) && (
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <Calendar size={10} />
              {opp.won_at && <span className="text-green-600">Won: {fmtDate(opp.won_at)}</span>}
              {opp.lost_at && <span className="text-red-500">Lost: {fmtDate(opp.lost_at)}</span>}
            </div>
          )}
          {/* Attribution */}
          {opp.source_recommendation_id && (
            <a
              href={`/admin/growth/director?rec=${opp.source_recommendation_id}`}
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
            >
              <Link2 size={10} />Source recommendation
            </a>
          )}
          {/* Stage progression */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Move to stage</p>
            <div className="flex flex-wrap gap-1.5">
              {STAGES.filter(s => s !== opp.stage).map(s => (
                <button
                  key={s}
                  onClick={() => onStageChange(opp._id, s)}
                  disabled={stageChanging === opp._id}
                  className={`text-[11px] px-2 py-1 rounded border font-medium transition-colors hover:opacity-80 disabled:opacity-40 ${STAGE_COLOR[s]}`}
                >
                  {stageChanging === opp._id ? "…" : STAGE_LABEL[s]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OpportunityCRMPage() {
  const [opps,           setOpps]           = useState<Opportunity[]>([])
  const [loading,        setLoading]        = useState(true)
  const [error,          setError]          = useState<string | null>(null)
  const [stageFilter,    setStageFilter]    = useState<Stage | "all">("all")
  const [typeFilter,     setTypeFilter]     = useState<OppType | "all">("all")
  const [showModal,      setShowModal]      = useState(false)
  const [editingOpp,     setEditingOpp]     = useState<Opportunity | null>(null)
  const [stageChanging,  setStageChanging]  = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch("/api/admin/growth/crm/opportunities")
      const data = await res.json()
      setOpps(Array.isArray(data) ? data : [])
    } catch (e) { setError(String(e)) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  let filtered = opps
  if (stageFilter !== "all") filtered = filtered.filter(o => o.stage === stageFilter)
  if (typeFilter  !== "all") filtered = filtered.filter(o => o.opportunity_type === typeFilter)

  const activeOpps  = opps.filter(o => !["won", "lost"].includes(o.stage))
  const pipelineVal = activeOpps.reduce((s, o) => s + (o.value || 0), 0)
  const weightedVal = activeOpps.reduce((s, o) => s + (o.value || 0) * (o.probability / 100), 0)
  const wonRev      = opps.filter(o => o.stage === "won").reduce((s, o) => s + (o.actual_revenue || o.value || 0), 0)

  async function handleSave(form: typeof BLANK) {
    if (editingOpp) {
      await fetch(`/api/admin/growth/crm/opportunities/${editingOpp._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
    } else {
      await fetch("/api/admin/growth/crm/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
    }
    setShowModal(false)
    setEditingOpp(null)
    await load()
  }

  async function handleStageChange(id: string, stage: Stage) {
    setStageChanging(id)
    await fetch(`/api/admin/growth/crm/opportunities/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    })
    setStageChanging(null)
    await load()
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Target size={20} className="text-indigo-600" />
            <h1 className="text-xl font-bold text-gray-900">Opportunity CRM</h1>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            Track procurement, dealer recruitment, and OEM displacement opportunities
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => load()} disabled={loading} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button onClick={() => { setEditingOpp(null); setShowModal(true) }} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
            <Plus size={13} />
            Add Opportunity
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">{error}</div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Active Pipeline",  value: activeOpps.length },
          { label: "Pipeline Value",   value: INR(pipelineVal) },
          { label: "Weighted Value",   value: INR(weightedVal) },
          { label: "Revenue Won",      value: INR(wonRev) },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-lg border border-gray-200 p-3">
            <div className="text-2xl font-bold text-gray-900">{k.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        {/* Stage filter */}
        <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setStageFilter("all")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${stageFilter === "all" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
          >
            All Stages ({opps.length})
          </button>
          {STAGES.map(s => {
            const count = opps.filter(o => o.stage === s).length
            if (count === 0) return null
            return (
              <button
                key={s}
                onClick={() => setStageFilter(s)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${stageFilter === s ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
              >
                {STAGE_LABEL[s]} ({count})
              </button>
            )
          })}
        </div>
        {/* Type filter */}
        <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setTypeFilter("all")}
            className={`px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${typeFilter === "all" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
          >
            All Types
          </button>
          {(Object.keys(TYPE_LABEL) as OppType[]).map(t => {
            const count = opps.filter(o => o.opportunity_type === t).length
            if (count === 0) return null
            return (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${typeFilter === t ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
              >
                {TYPE_LABEL[t]}
              </button>
            )
          })}
        </div>
      </div>

      {/* Opportunity list */}
      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
          <RefreshCw size={16} className="animate-spin mr-2" /> Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-10 text-center">
          <Target size={28} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No opportunities yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Approve a Revenue Director recommendation or add opportunities manually.
          </p>
          <button
            onClick={() => { setEditingOpp(null); setShowModal(true) }}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700"
          >
            <Plus size={14} /> Add First Opportunity
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(opp => (
            <OppCard
              key={opp._id}
              opp={opp}
              onEdit={o => { setEditingOpp(o); setShowModal(true) }}
              onStageChange={handleStageChange}
              stageChanging={stageChanging}
            />
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-gray-200 text-xs text-gray-400 flex items-center justify-between">
        <span>All opportunity changes require manual entry — no automatic pipeline actions.</span>
        <a href="/admin/growth/execution" className="hover:text-gray-600 flex items-center gap-1">
          Execution Hub <ChevronRight size={11} />
        </a>
      </div>

      {showModal && (
        <OppModal
          initial={editingOpp ?? BLANK}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingOpp(null) }}
        />
      )}
    </div>
  )
}
