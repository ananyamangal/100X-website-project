"use client"
import { useState, useEffect, useCallback } from "react"
import {
  Users, Plus, RefreshCw, ChevronRight, ChevronDown, Phone,
  Mail, MapPin, DollarSign, Calendar, FileText, Edit2, Check,
  X, Link2, Package,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type Stage =
  | "lead" | "contacted" | "meeting_scheduled" | "proposal_sent"
  | "authorized" | "active_dealer" | "lost"

type GemStatus  = "registered" | "not_registered" | "pending" | "unknown"
type OemStatus  = "authorized" | "pending" | "unknown"

interface Dealer {
  _id: string
  name: string
  company: string
  state: string
  phone?: string
  email?: string
  stage: Stage
  gem_status: GemStatus
  oem_status: OemStatus
  expected_revenue: number
  notes?: string
  last_contact_at?: string
  next_followup_at?: string
  source_recommendation_id?: string
  source_type: string
  created_at: string
  updated_at: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STAGES: Stage[] = [
  "lead", "contacted", "meeting_scheduled", "proposal_sent",
  "authorized", "active_dealer", "lost",
]

const STAGE_LABEL: Record<Stage, string> = {
  lead:             "Lead",
  contacted:        "Contacted",
  meeting_scheduled:"Meeting Scheduled",
  proposal_sent:    "Proposal Sent",
  authorized:       "Authorized",
  active_dealer:    "Active Dealer",
  lost:             "Lost",
}

const STAGE_COLOR: Record<Stage, string> = {
  lead:             "bg-gray-100 text-gray-600 border-gray-200",
  contacted:        "bg-blue-100 text-blue-700 border-blue-200",
  meeting_scheduled:"bg-yellow-100 text-yellow-700 border-yellow-200",
  proposal_sent:    "bg-orange-100 text-orange-700 border-orange-200",
  authorized:       "bg-purple-100 text-purple-700 border-purple-200",
  active_dealer:    "bg-green-100 text-green-700 border-green-200",
  lost:             "bg-red-100 text-red-600 border-red-200",
}

const STAGE_BAR_COLOR: Record<Stage, string> = {
  lead:             "bg-gray-300",
  contacted:        "bg-blue-400",
  meeting_scheduled:"bg-yellow-400",
  proposal_sent:    "bg-orange-400",
  authorized:       "bg-purple-500",
  active_dealer:    "bg-green-500",
  lost:             "bg-red-400",
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
  name: "", company: "", state: "", phone: "", email: "",
  stage: "lead" as Stage, gem_status: "unknown" as GemStatus, oem_status: "unknown" as OemStatus,
  expected_revenue: 0, notes: "", last_contact_at: "", next_followup_at: "",
  source_recommendation_id: "", source_type: "manual",
}

// ─── Add / Edit modal ─────────────────────────────────────────────────────────

function DealerModal({
  initial, onSave, onClose,
}: {
  initial: typeof BLANK | Dealer
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
          <h2 className="text-base font-semibold text-gray-900">{"_id" in initial ? "Edit Dealer" : "Add Dealer"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>
        <div className="px-5 py-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {/* Name + Company */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Name *</label>
              <input value={form.name} onChange={e => set("name", e.target.value)} className="w-full text-sm border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="Contact name" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Company *</label>
              <input value={form.company} onChange={e => set("company", e.target.value)} className="w-full text-sm border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="Business name" />
            </div>
          </div>
          {/* State + Stage */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">State</label>
              <input value={form.state} onChange={e => set("state", e.target.value)} className="w-full text-sm border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="Maharashtra" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Stage</label>
              <select value={form.stage} onChange={e => set("stage", e.target.value)} className="w-full text-sm border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white">
                {STAGES.map(s => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
              </select>
            </div>
          </div>
          {/* Phone + Email */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Phone</label>
              <input value={form.phone} onChange={e => set("phone", e.target.value)} className="w-full text-sm border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="+91 98765 43210" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Email</label>
              <input value={form.email} onChange={e => set("email", e.target.value)} className="w-full text-sm border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="dealer@example.com" type="email" />
            </div>
          </div>
          {/* GeM + OEM status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">GeM Status</label>
              <select value={form.gem_status} onChange={e => set("gem_status", e.target.value)} className="w-full text-sm border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white">
                <option value="unknown">Unknown</option>
                <option value="registered">GeM Registered</option>
                <option value="not_registered">Not Registered</option>
                <option value="pending">Registration Pending</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">OEM Auth Status</label>
              <select value={form.oem_status} onChange={e => set("oem_status", e.target.value)} className="w-full text-sm border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white">
                <option value="unknown">Unknown</option>
                <option value="authorized">Authorized</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>
          {/* Expected Revenue */}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Expected Revenue (₹)</label>
            <input type="number" value={form.expected_revenue} onChange={e => set("expected_revenue", Number(e.target.value))} className="w-full text-sm border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="500000" />
          </div>
          {/* Last Contact + Next Follow-up */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Last Contact</label>
              <input type="date" value={form.last_contact_at?.substring(0, 10) || ""} onChange={e => set("last_contact_at", e.target.value)} className="w-full text-sm border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Next Follow-up</label>
              <input type="date" value={form.next_followup_at?.substring(0, 10) || ""} onChange={e => set("next_followup_at", e.target.value)} className="w-full text-sm border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200" />
            </div>
          </div>
          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={3} className="w-full text-sm border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none" placeholder="Key observations, meeting notes..." />
          </div>
          {/* Source recommendation ID */}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Source Recommendation ID</label>
            <input value={form.source_recommendation_id} onChange={e => set("source_recommendation_id", e.target.value)} className="w-full text-sm border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200 font-mono" placeholder="Links to Revenue Director recommendation" />
          </div>
        </div>
        <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
          <button onClick={save} disabled={saving || !form.name.trim()} className="px-4 py-1.5 text-sm font-medium bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Dealer Card ──────────────────────────────────────────────────────────────

function DealerCard({
  dealer, onEdit, onStageChange, stageChanging,
}: {
  dealer: Dealer
  onEdit: (d: Dealer) => void
  onStageChange: (id: string, stage: Stage) => Promise<void>
  stageChanging: string | null
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div
        className="px-4 py-3 cursor-pointer hover:bg-gray-50 flex items-start gap-3"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-900">{dealer.company}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${STAGE_COLOR[dealer.stage]}`}>
              {STAGE_LABEL[dealer.stage]}
            </span>
            {dealer.gem_status === "registered" && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">GeM ✓</span>
            )}
            {dealer.oem_status === "authorized" && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-50 text-green-700 border border-green-200">OEM Auth ✓</span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
            <span>{dealer.name}</span>
            {dealer.state && <span className="flex items-center gap-0.5"><MapPin size={10} />{dealer.state}</span>}
            {dealer.expected_revenue > 0 && (
              <span className="flex items-center gap-0.5 text-emerald-600 font-medium">
                <DollarSign size={10} />{INR(dealer.expected_revenue)}
              </span>
            )}
            {dealer.next_followup_at && (
              <span className="flex items-center gap-0.5 text-orange-600">
                <Calendar size={10} />Follow-up: {fmtDate(dealer.next_followup_at)}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={e => { e.stopPropagation(); onEdit(dealer) }}
            className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100"
          >
            <Edit2 size={12} />
          </button>
          {expanded ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
          {/* Contact */}
          {(dealer.phone || dealer.email) && (
            <div className="flex gap-4 text-xs text-gray-600">
              {dealer.phone && <a href={`tel:${dealer.phone}`} className="flex items-center gap-1 hover:text-blue-600"><Phone size={11} />{dealer.phone}</a>}
              {dealer.email && <a href={`mailto:${dealer.email}`} className="flex items-center gap-1 hover:text-blue-600"><Mail size={11} />{dealer.email}</a>}
            </div>
          )}
          {/* Notes */}
          {dealer.notes && (
            <div className="text-xs text-gray-600 bg-gray-50 px-3 py-2 rounded border border-gray-100">
              <span className="font-medium text-gray-500 block mb-0.5">Notes</span>
              {dealer.notes}
            </div>
          )}
          {/* Attribution */}
          {dealer.source_recommendation_id && (
            <a
              href={`/admin/growth/director?rec=${dealer.source_recommendation_id}`}
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
            >
              <Link2 size={10} />Source recommendation
            </a>
          )}
          {/* Stage progression */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Move to stage</p>
            <div className="flex flex-wrap gap-1.5">
              {STAGES.filter(s => s !== dealer.stage).map(s => (
                <button
                  key={s}
                  onClick={() => onStageChange(dealer._id, s)}
                  disabled={stageChanging === dealer._id}
                  className={`text-[11px] px-2 py-1 rounded border font-medium transition-colors hover:opacity-80 disabled:opacity-40 ${STAGE_COLOR[s]}`}
                >
                  {stageChanging === dealer._id ? "…" : STAGE_LABEL[s]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Pipeline summary bar ─────────────────────────────────────────────────────

function PipelineBar({ dealers }: { dealers: Dealer[] }) {
  const total = dealers.filter(d => d.stage !== "lost").length
  if (total === 0) return null
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-600">Pipeline</span>
        <span className="text-xs text-gray-400">{total} active dealers</span>
      </div>
      <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
        {STAGES.filter(s => s !== "lost").map(s => {
          const count = dealers.filter(d => d.stage === s).length
          const pct   = total > 0 ? (count / total) * 100 : 0
          if (pct === 0) return null
          return <div key={s} className={`${STAGE_BAR_COLOR[s]} rounded-full`} style={{ width: `${pct}%` }} title={`${STAGE_LABEL[s]}: ${count}`} />
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
        {STAGES.map(s => {
          const count = dealers.filter(d => d.stage === s).length
          if (count === 0) return null
          return (
            <span key={s} className="text-[11px] text-gray-500">
              <span className="font-semibold text-gray-900">{count}</span> {STAGE_LABEL[s]}
            </span>
          )
        })}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DealerCRMPage() {
  const [dealers,       setDealers]       = useState<Dealer[]>([])
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState<string | null>(null)
  const [stageFilter,   setStageFilter]   = useState<Stage | "all">("all")
  const [showModal,     setShowModal]     = useState(false)
  const [editingDealer, setEditingDealer] = useState<Dealer | null>(null)
  const [stageChanging, setStageChanging] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch("/api/admin/growth/crm/dealers")
      const data = await res.json()
      setDealers(Array.isArray(data) ? data : [])
    } catch (e) { setError(String(e)) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = stageFilter === "all" ? dealers : dealers.filter(d => d.stage === stageFilter)

  async function handleSave(form: typeof BLANK) {
    if (editingDealer) {
      await fetch(`/api/admin/growth/crm/dealers/${editingDealer._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
    } else {
      await fetch("/api/admin/growth/crm/dealers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
    }
    setShowModal(false)
    setEditingDealer(null)
    await load()
  }

  async function handleStageChange(id: string, stage: Stage) {
    setStageChanging(id)
    await fetch(`/api/admin/growth/crm/dealers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    })
    setStageChanging(null)
    await load()
  }

  const totalRevenue = dealers
    .filter(d => d.stage !== "lost")
    .reduce((s, d) => s + (d.expected_revenue || 0), 0)

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Users size={20} className="text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">Dealer CRM</h1>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            Convert Revenue Director dealer recommendations into tracked relationships
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => load()} disabled={loading} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button onClick={() => { setEditingDealer(null); setShowModal(true) }} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700">
            <Plus size={13} />
            Add Dealer
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">{error}</div>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {[
          { label: "Total Dealers",     value: dealers.length },
          { label: "Active Pipeline",   value: dealers.filter(d => !["lost", "active_dealer"].includes(d.stage)).length },
          { label: "Active Dealers",    value: dealers.filter(d => d.stage === "active_dealer").length },
          { label: "Pipeline Revenue",  value: INR(totalRevenue) },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-lg border border-gray-200 p-3">
            <div className="text-2xl font-bold text-gray-900">{k.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Pipeline bar */}
      <PipelineBar dealers={dealers} />

      {/* Stage filter tabs */}
      <div className="flex flex-wrap gap-1 mb-4 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setStageFilter("all")}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${stageFilter === "all" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
        >
          All ({dealers.length})
        </button>
        {STAGES.map(s => {
          const count = dealers.filter(d => d.stage === s).length
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

      {/* Dealer list */}
      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
          <RefreshCw size={16} className="animate-spin mr-2" /> Loading dealers…
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-10 text-center">
          <Users size={28} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No dealers yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Add dealers manually or approve a dealer recommendation in Revenue Director to auto-populate.
          </p>
          <button
            onClick={() => { setEditingDealer(null); setShowModal(true) }}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
          >
            <Plus size={14} /> Add First Dealer
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(dealer => (
            <DealerCard
              key={dealer._id}
              dealer={dealer}
              onEdit={d => { setEditingDealer(d); setShowModal(true) }}
              onStageChange={handleStageChange}
              stageChanging={stageChanging}
            />
          ))}
        </div>
      )}

      {/* Footer note */}
      <div className="mt-6 pt-4 border-t border-gray-200 text-xs text-gray-400 flex items-center justify-between">
        <span>All dealer changes require manual entry — no automatic CRM actions.</span>
        <a href="/admin/growth/director" className="hover:text-gray-600 flex items-center gap-1">
          Revenue Director <ChevronRight size={11} />
        </a>
      </div>

      {/* Modal */}
      {showModal && (
        <DealerModal
          initial={editingDealer ?? BLANK}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingDealer(null) }}
        />
      )}
    </div>
  )
}
