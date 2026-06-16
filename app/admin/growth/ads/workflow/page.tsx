"use client"
import { useState, useEffect, useCallback } from "react"
import {
  Megaphone, Plus, RefreshCw, ChevronRight, ChevronDown,
  X, Edit2, Link2, DollarSign, AlertCircle,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type Stage = "recommendation" | "approved" | "draft" | "review" | "deployed" | "tracking"
type CampaignType =
  | "search" | "performance_max" | "remarketing"
  | "customer_match" | "competitor_conquest" | "youtube"

interface AdsItem {
  _id: string
  name: string
  campaign_type: CampaignType
  stage: Stage
  source_recommendation_id?: string
  brief?: string
  notes?: string
  owner?: string
  budget: number
  actual_spend: number
  actual_clicks: number
  actual_conversions: number
  created_at: string
  updated_at: string
  deployed_at?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STAGES: Stage[] = ["recommendation", "approved", "draft", "review", "deployed", "tracking"]

const STAGE_LABEL: Record<Stage, string> = {
  recommendation: "Recommendation",
  approved:       "Approved",
  draft:          "Draft",
  review:         "Review",
  deployed:       "Deployed",
  tracking:       "Tracking",
}

const STAGE_COLOR: Record<Stage, string> = {
  recommendation: "bg-gray-100 text-gray-600 border-gray-200",
  approved:       "bg-blue-100 text-blue-700 border-blue-200",
  draft:          "bg-yellow-100 text-yellow-700 border-yellow-200",
  review:         "bg-orange-100 text-orange-700 border-orange-200",
  deployed:       "bg-green-100 text-green-700 border-green-200",
  tracking:       "bg-emerald-100 text-emerald-700 border-emerald-200",
}

const TYPE_LABEL: Record<CampaignType, string> = {
  search:             "Search",
  performance_max:    "Performance Max",
  remarketing:        "Remarketing",
  customer_match:     "Customer Match",
  competitor_conquest:"Competitor Conquest",
  youtube:            "YouTube",
}

const TYPE_COLOR: Record<CampaignType, string> = {
  search:             "bg-blue-50 text-blue-600 border-blue-200",
  performance_max:    "bg-purple-50 text-purple-600 border-purple-200",
  remarketing:        "bg-orange-50 text-orange-600 border-orange-200",
  customer_match:     "bg-emerald-50 text-emerald-600 border-emerald-200",
  competitor_conquest:"bg-red-50 text-red-600 border-red-200",
  youtube:            "bg-rose-50 text-rose-600 border-rose-200",
}

const STAGE_PROGRESS: Record<Stage, number> = {
  recommendation: 1, approved: 2, draft: 3, review: 4, deployed: 5, tracking: 6,
}

const INR = (n: number) =>
  n >= 1e5 ? `₹${(n / 1e5).toFixed(1)} L` :
  n > 0 ? `₹${Math.round(n).toLocaleString("en-IN")}` : "—"

function fmtDate(iso?: string) {
  if (!iso) return null
  try { return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) }
  catch { return null }
}

// ─── Blank form ───────────────────────────────────────────────────────────────

const BLANK = {
  name: "", campaign_type: "search" as CampaignType, stage: "recommendation" as Stage,
  source_recommendation_id: "", brief: "", notes: "", owner: "", budget: 0,
  actual_spend: 0, actual_clicks: 0, actual_conversions: 0,
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function AdsModal({
  initial, onSave, onClose,
}: {
  initial: typeof BLANK | AdsItem
  onSave:  (data: typeof BLANK) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm]     = useState({ ...BLANK, ...initial })
  const [saving, setSaving] = useState(false)
  const [tab, setTab]       = useState<"details" | "brief" | "results">("details")

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
          <h2 className="text-base font-semibold text-gray-900">{"_id" in initial ? "Edit Campaign" : "Add Campaign"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>
        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-5">
          {(["details", "brief", "results"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`py-2 px-3 text-xs font-medium border-b-2 -mb-px capitalize transition-colors ${tab === t ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="px-5 py-4 space-y-3 max-h-[55vh] overflow-y-auto">
          {tab === "details" && (
            <>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Campaign Name *</label>
                <input value={form.name} onChange={e => set("name", e.target.value)} className="w-full text-sm border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="GeM Thermal Fogging — Q3 Search" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Campaign Type</label>
                  <select value={form.campaign_type} onChange={e => set("campaign_type", e.target.value)} className="w-full text-sm border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white">
                    {(Object.keys(TYPE_LABEL) as CampaignType[]).map(t => (
                      <option key={t} value={t}>{TYPE_LABEL[t]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Stage</label>
                  <select value={form.stage} onChange={e => set("stage", e.target.value)} className="w-full text-sm border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white">
                    {STAGES.map(s => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Budget (₹)</label>
                  <input type="number" value={form.budget} onChange={e => set("budget", Number(e.target.value))} className="w-full text-sm border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="50000" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Owner</label>
                  <input value={form.owner} onChange={e => set("owner", e.target.value)} className="w-full text-sm border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={3} className="w-full text-sm border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Source Recommendation ID</label>
                <input value={form.source_recommendation_id} onChange={e => set("source_recommendation_id", e.target.value)} className="w-full text-sm border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200 font-mono text-xs" placeholder="Links to Revenue Director recommendation" />
              </div>
            </>
          )}
          {tab === "brief" && (
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Campaign Brief</label>
              <p className="text-[11px] text-amber-600 mb-2 flex items-center gap-1">
                <AlertCircle size={10} />No automatic deployment — submit manually in Google Ads when ready.
              </p>
              <textarea
                value={form.brief}
                onChange={e => set("brief", e.target.value)}
                rows={12}
                className="w-full text-sm border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
                placeholder="Campaign objectives, target audience, keywords, ad copy, landing page, targeting…"
              />
            </div>
          )}
          {tab === "results" && (
            <div className="space-y-3">
              <p className="text-[11px] text-gray-400">Enter actuals from Google Ads after deployment.</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Actual Spend (₹)</label>
                  <input type="number" value={form.actual_spend} onChange={e => set("actual_spend", Number(e.target.value))} className="w-full text-sm border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Clicks</label>
                  <input type="number" value={form.actual_clicks} onChange={e => set("actual_clicks", Number(e.target.value))} className="w-full text-sm border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Conversions</label>
                  <input type="number" value={form.actual_conversions} onChange={e => set("actual_conversions", Number(e.target.value))} className="w-full text-sm border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200" />
                </div>
              </div>
              {form.actual_spend > 0 && form.actual_clicks > 0 && (
                <div className="text-xs text-gray-500 bg-gray-50 rounded p-3 space-y-1">
                  <div>CPC: ₹{Math.round(form.actual_spend / form.actual_clicks).toLocaleString("en-IN")}</div>
                  {form.actual_conversions > 0 && (
                    <>
                      <div>CPA: ₹{Math.round(form.actual_spend / form.actual_conversions).toLocaleString("en-IN")}</div>
                      <div>CVR: {((form.actual_conversions / form.actual_clicks) * 100).toFixed(1)}%</div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
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

// ─── Campaign Card ────────────────────────────────────────────────────────────

function AdsCard({
  item, onEdit, onStageChange, stageChanging,
}: {
  item: AdsItem
  onEdit: (i: AdsItem) => void
  onStageChange: (id: string, stage: Stage) => Promise<void>
  stageChanging: string | null
}) {
  const [expanded, setExpanded] = useState(false)
  const progress = STAGE_PROGRESS[item.stage]
  const hasResults = item.actual_spend > 0 || item.actual_clicks > 0

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="h-0.5 bg-gray-100">
        <div className="h-full bg-blue-500 transition-all" style={{ width: `${(progress / 6) * 100}%` }} />
      </div>
      <div
        className="px-4 py-3 cursor-pointer hover:bg-gray-50 flex items-start gap-3"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-900 truncate">{item.name}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium flex-shrink-0 ${STAGE_COLOR[item.stage]}`}>
              {STAGE_LABEL[item.stage]}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded border flex-shrink-0 ${TYPE_COLOR[item.campaign_type]}`}>
              {TYPE_LABEL[item.campaign_type]}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
            {item.budget > 0 && (
              <span className="flex items-center gap-0.5 font-medium text-gray-700">
                <DollarSign size={10} />Budget: {INR(item.budget)}
              </span>
            )}
            {item.actual_spend > 0 && (
              <span className="text-orange-600">Spent: {INR(item.actual_spend)}</span>
            )}
            {item.owner && <span className="text-blue-500">{item.owner}</span>}
            {item.deployed_at && (
              <span className="text-green-600">Deployed: {fmtDate(item.deployed_at)}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={e => { e.stopPropagation(); onEdit(item) }}
            className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100"
          >
            <Edit2 size={12} />
          </button>
          {expanded ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
          {/* Results */}
          {hasResults && (
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="bg-gray-50 rounded p-2">
                <div className="text-gray-400 mb-0.5">Spend</div>
                <div className="font-semibold">{INR(item.actual_spend)}</div>
              </div>
              <div className="bg-gray-50 rounded p-2">
                <div className="text-gray-400 mb-0.5">Clicks</div>
                <div className="font-semibold">{item.actual_clicks.toLocaleString("en-IN")}</div>
              </div>
              <div className="bg-gray-50 rounded p-2">
                <div className="text-gray-400 mb-0.5">Conversions</div>
                <div className="font-semibold text-emerald-600">{item.actual_conversions}</div>
              </div>
            </div>
          )}
          {/* Brief */}
          {item.brief && (
            <div className="text-xs text-gray-600 bg-gray-50 px-3 py-2 rounded border border-gray-100">
              <span className="font-medium text-gray-500 block mb-0.5">Brief</span>
              <span className="line-clamp-3 whitespace-pre-line">{item.brief.substring(0, 300)}{item.brief.length > 300 ? "…" : ""}</span>
            </div>
          )}
          {/* Notes */}
          {item.notes && (
            <div className="text-xs text-gray-600 bg-gray-50 px-3 py-2 rounded border border-gray-100">{item.notes}</div>
          )}
          {/* Attribution */}
          {item.source_recommendation_id && (
            <a
              href={`/admin/growth/director?rec=${item.source_recommendation_id}`}
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
            >
              <Link2 size={10} />Source recommendation
            </a>
          )}
          {/* Stage progression */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Move to stage</p>
            <div className="flex flex-wrap gap-1.5">
              {STAGES.filter(s => s !== item.stage).map(s => (
                <button
                  key={s}
                  onClick={() => onStageChange(item._id, s)}
                  disabled={stageChanging === item._id}
                  className={`text-[11px] px-2 py-1 rounded border font-medium transition-colors hover:opacity-80 disabled:opacity-40 ${STAGE_COLOR[s]}`}
                >
                  {stageChanging === item._id ? "…" : STAGE_LABEL[s]}
                </button>
              ))}
            </div>
            {!["deployed", "tracking"].includes(item.stage) && (
              <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
                <AlertCircle size={9} />No automatic deployment — submit in Google Ads manually before marking Deployed.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdsWorkflowPage() {
  const [items,         setItems]         = useState<AdsItem[]>([])
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState<string | null>(null)
  const [stageFilter,   setStageFilter]   = useState<Stage | "all">("all")
  const [typeFilter,    setTypeFilter]    = useState<CampaignType | "all">("all")
  const [showModal,     setShowModal]     = useState(false)
  const [editingItem,   setEditingItem]   = useState<AdsItem | null>(null)
  const [stageChanging, setStageChanging] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch("/api/admin/growth/ads/workflow")
      const data = await res.json()
      setItems(Array.isArray(data) ? data : [])
    } catch (e) { setError(String(e)) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  let filtered = items
  if (stageFilter !== "all") filtered = filtered.filter(i => i.stage === stageFilter)
  if (typeFilter  !== "all") filtered = filtered.filter(i => i.campaign_type === typeFilter)

  const totalBudget  = items.filter(i => !["tracking"].includes(i.stage)).reduce((s, i) => s + (i.budget || 0), 0)
  const totalSpend   = items.reduce((s, i) => s + (i.actual_spend || 0), 0)
  const totalConv    = items.reduce((s, i) => s + (i.actual_conversions || 0), 0)

  async function handleSave(form: typeof BLANK) {
    if (editingItem) {
      await fetch("/api/admin/growth/ads/workflow", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingItem._id, ...form }),
      })
    } else {
      await fetch("/api/admin/growth/ads/workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
    }
    setShowModal(false)
    setEditingItem(null)
    await load()
  }

  async function handleStageChange(id: string, stage: Stage) {
    setStageChanging(id)
    await fetch("/api/admin/growth/ads/workflow", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, stage }),
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
            <Megaphone size={20} className="text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">Ads Workflow</h1>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            Campaign pipeline for 6 types — no automatic deployment, all submissions are manual
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => load()} disabled={loading} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button onClick={() => { setEditingItem(null); setShowModal(true) }} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700">
            <Plus size={13} />
            Add Campaign
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">{error}</div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Campaigns",        value: items.length },
          { label: "Active Budget",    value: INR(totalBudget) },
          { label: "Total Spend",      value: INR(totalSpend) },
          { label: "Conversions",      value: totalConv },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-lg border border-gray-200 p-3">
            <div className="text-2xl font-bold text-gray-900">{k.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Mandatory notice */}
      <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700 flex items-start gap-2">
        <AlertCircle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
        <span>No automatic deployment — when a campaign is ready, submit it manually in Google Ads and then update the stage to Deployed here.</span>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setStageFilter("all")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${stageFilter === "all" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
          >
            All ({items.length})
          </button>
          {STAGES.map(s => {
            const count = items.filter(i => i.stage === s).length
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
        <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-lg w-fit">
          <button
            onClick={() => setTypeFilter("all")}
            className={`px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${typeFilter === "all" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
          >
            All Types
          </button>
          {(Object.keys(TYPE_LABEL) as CampaignType[]).map(t => {
            const count = items.filter(i => i.campaign_type === t).length
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

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
          <RefreshCw size={16} className="animate-spin mr-2" /> Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-10 text-center">
          <Megaphone size={28} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No campaigns yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Add campaigns from Revenue Director ad recommendations or create manually.
          </p>
          <button
            onClick={() => { setEditingItem(null); setShowModal(true) }}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
          >
            <Plus size={14} /> Add First Campaign
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => (
            <AdsCard
              key={item._id}
              item={item}
              onEdit={i => { setEditingItem(i); setShowModal(true) }}
              onStageChange={handleStageChange}
              stageChanging={stageChanging}
            />
          ))}
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-gray-200 text-xs text-gray-400 flex items-center justify-between">
        <span>6 campaign types: Search, PMax, Remarketing, Customer Match, Competitor Conquest, YouTube</span>
        <a href="/admin/growth/ads" className="hover:text-gray-600 flex items-center gap-1">
          Ads Hub <ChevronRight size={11} />
        </a>
      </div>

      {showModal && (
        <AdsModal
          initial={editingItem ?? BLANK}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingItem(null) }}
        />
      )}
    </div>
  )
}
