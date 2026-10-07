"use client"
import { useState, useEffect, useCallback } from "react"
import {
  Search, Plus, RefreshCw, ChevronRight, ChevronDown,
  X, Edit2, Link2, FileText, ExternalLink,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type Stage = "identified" | "approved" | "draft" | "review" | "edit" | "published" | "tracking"
type ContentType = "blog" | "landing_page" | "product_page" | "category_page" | "faq" | "case_study"

interface SeoItem {
  _id: string
  title: string
  target_keyword: string
  target_url: string
  content_type: ContentType
  stage: Stage
  source_opportunity_id?: string
  draft_content?: string
  publish_url?: string
  notes?: string
  owner?: string
  created_at: string
  updated_at: string
  published_at?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STAGES: Stage[] = ["identified", "approved", "draft", "review", "edit", "published", "tracking"]

const STAGE_LABEL: Record<Stage, string> = {
  identified: "Identified",
  approved:   "Approved",
  draft:      "Draft",
  review:     "Review",
  edit:       "Edit",
  published:  "Published",
  tracking:   "Tracking",
}

const STAGE_COLOR: Record<Stage, string> = {
  identified: "bg-gray-100 text-gray-600 border-gray-200",
  approved:   "bg-blue-100 text-blue-700 border-blue-200",
  draft:      "bg-yellow-100 text-yellow-700 border-yellow-200",
  review:     "bg-orange-100 text-orange-700 border-orange-200",
  edit:       "bg-indigo-100 text-indigo-700 border-indigo-200",
  published:  "bg-green-100 text-green-700 border-green-200",
  tracking:   "bg-emerald-100 text-emerald-700 border-emerald-200",
}

const STAGE_PROGRESS: Record<Stage, number> = {
  identified: 1, approved: 2, draft: 3, review: 4, edit: 5, published: 6, tracking: 7,
}

const CONTENT_LABEL: Record<ContentType, string> = {
  blog:          "Blog",
  landing_page:  "Landing Page",
  product_page:  "Product Page",
  category_page: "Category Page",
  faq:           "FAQ",
  case_study:    "Case Study",
}

function fmtDate(iso?: string) {
  if (!iso) return null
  try { return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) }
  catch { return null }
}

// ─── Blank form ───────────────────────────────────────────────────────────────

const BLANK = {
  title: "", target_keyword: "", target_url: "", content_type: "blog" as ContentType,
  stage: "identified" as Stage, source_opportunity_id: "", draft_content: "",
  publish_url: "", notes: "", owner: "",
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function SeoModal({
  initial, onSave, onClose,
}: {
  initial: typeof BLANK | SeoItem
  onSave:  (data: typeof BLANK) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm]     = useState({ ...BLANK, ...initial })
  const [saving, setSaving] = useState(false)
  const [tab, setTab]       = useState<"details" | "content">("details")

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function save() {
    if (!form.title.trim()) return
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pt-16 pb-8 overflow-y-auto">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-xl border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">{"_id" in initial ? "Edit SEO Item" : "Add SEO Item"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>
        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-5">
          {(["details", "content"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`py-2 px-3 text-xs font-medium border-b-2 -mb-px transition-colors ${tab === t ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >
              {t === "details" ? "Details" : "Draft Content"}
            </button>
          ))}
        </div>
        <div className="px-5 py-4 space-y-3 max-h-[55vh] overflow-y-auto">
          {tab === "details" ? (
            <>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Title *</label>
                <input value={form.title} onChange={e => set("title", e.target.value)} className="w-full text-sm border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="Best Thermal Fogging Machine for Municipalities" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Target Keyword</label>
                  <input value={form.target_keyword} onChange={e => set("target_keyword", e.target.value)} className="w-full text-sm border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="thermal fogging machine" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Content Type</label>
                  <select value={form.content_type} onChange={e => set("content_type", e.target.value)} className="w-full text-sm border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white">
                    {(Object.keys(CONTENT_LABEL) as ContentType[]).map(t => (
                      <option key={t} value={t}>{CONTENT_LABEL[t]}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Target URL</label>
                  <input value={form.target_url} onChange={e => set("target_url", e.target.value)} className="w-full text-sm border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="/blog/thermal-fogging-guide" />
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
                  <label className="text-xs font-medium text-gray-600 block mb-1">Owner</label>
                  <input value={form.owner} onChange={e => set("owner", e.target.value)} className="w-full text-sm border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="Team member" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Published URL</label>
                  <input value={form.publish_url} onChange={e => set("publish_url", e.target.value)} className="w-full text-sm border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200" placeholder="https://…" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={3} className="w-full text-sm border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Source Opportunity ID</label>
                <input value={form.source_opportunity_id} onChange={e => set("source_opportunity_id", e.target.value)} className="w-full text-sm border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200 font-mono text-xs" placeholder="Links to Opportunity CRM" />
              </div>
            </>
          ) : (
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Draft Content</label>
              <p className="text-[11px] text-gray-400 mb-2">No automatic publishing — manually deploy when ready.</p>
              <textarea
                value={form.draft_content}
                onChange={e => set("draft_content", e.target.value)}
                rows={14}
                className="w-full text-sm border border-gray-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none font-mono"
                placeholder="Paste or type your draft content here…"
              />
            </div>
          )}
        </div>
        <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded">Cancel</button>
          <button onClick={save} disabled={saving || !form.title.trim()} className="px-4 py-1.5 text-sm font-medium bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Item card ────────────────────────────────────────────────────────────────

function SeoCard({
  item, onEdit, onStageChange, stageChanging,
}: {
  item: SeoItem
  onEdit: (i: SeoItem) => void
  onStageChange: (id: string, stage: Stage) => Promise<void>
  stageChanging: string | null
}) {
  const [expanded, setExpanded] = useState(false)
  const progress = STAGE_PROGRESS[item.stage]

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="h-0.5 bg-gray-100">
        <div className="h-full bg-green-500 transition-all" style={{ width: `${(progress / 7) * 100}%` }} />
      </div>
      <div
        className="px-4 py-3 cursor-pointer hover:bg-gray-50 flex items-start gap-3"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-900 truncate">{item.title}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium flex-shrink-0 ${STAGE_COLOR[item.stage]}`}>
              {STAGE_LABEL[item.stage]}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 border border-gray-200 flex-shrink-0">
              {CONTENT_LABEL[item.content_type]}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
            {item.target_keyword && (
              <span className="flex items-center gap-0.5"><Search size={10} />{item.target_keyword}</span>
            )}
            {item.owner && <span className="text-blue-500">{item.owner}</span>}
            {item.published_at && (
              <span className="text-green-600">Published: {fmtDate(item.published_at)}</span>
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
          {/* URLs */}
          <div className="flex flex-wrap gap-3 text-xs">
            {item.target_url && (
              <span className="text-gray-500 flex items-center gap-1"><FileText size={11} />Target: {item.target_url}</span>
            )}
            {item.publish_url && (
              <a href={item.publish_url} target="_blank" rel="noreferrer" className="text-blue-600 flex items-center gap-1 hover:underline">
                <ExternalLink size={11} />Published URL
              </a>
            )}
          </div>
          {/* Draft preview */}
          {item.draft_content && (
            <div className="text-xs text-gray-600 bg-gray-50 px-3 py-2 rounded border border-gray-100">
              <span className="font-medium text-gray-500 block mb-0.5">Draft preview</span>
              <span className="line-clamp-3 whitespace-pre-line">{item.draft_content.substring(0, 300)}{item.draft_content.length > 300 ? "…" : ""}</span>
            </div>
          )}
          {/* Notes */}
          {item.notes && (
            <div className="text-xs text-gray-600 bg-gray-50 px-3 py-2 rounded border border-gray-100">{item.notes}</div>
          )}
          {/* Attribution */}
          {item.source_opportunity_id && (
            <a
              href={`/admin/growth/crm/opportunities`}
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
            >
              <Link2 size={10} />Source opportunity
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
            {item.stage !== "published" && (
              <p className="text-[10px] text-gray-400 mt-2">No automatic publishing — stage must be set to Published manually after you deploy.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SeoWorkflowPage() {
  const [items,          setItems]          = useState<SeoItem[]>([])
  const [loading,        setLoading]        = useState(true)
  const [error,          setError]          = useState<string | null>(null)
  const [stageFilter,    setStageFilter]    = useState<Stage | "all">("all")
  const [showModal,      setShowModal]      = useState(false)
  const [editingItem,    setEditingItem]    = useState<SeoItem | null>(null)
  const [stageChanging,  setStageChanging]  = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch("/api/admin/growth/seo/workflow")
      const data = await res.json()
      setItems(Array.isArray(data) ? data : [])
    } catch (e) { setError(String(e)) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = stageFilter === "all" ? items : items.filter(i => i.stage === stageFilter)

  async function handleSave(form: typeof BLANK) {
    if (editingItem) {
      await fetch(`/api/admin/growth/seo/workflow`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingItem._id, ...form }),
      })
    } else {
      await fetch("/api/admin/growth/seo/workflow", {
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
    await fetch("/api/admin/growth/seo/workflow", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, stage }),
    })
    setStageChanging(null)
    await load()
  }

  const published = items.filter(i => i.stage === "published" || i.stage === "tracking").length

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Search size={20} className="text-green-600" />
            <h1 className="text-xl font-bold text-gray-900">SEO Workflow</h1>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            Editorial pipeline — identify, draft, review, and manually publish SEO content
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => load()} disabled={loading} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button onClick={() => { setEditingItem(null); setShowModal(true) }} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-md hover:bg-green-700">
            <Plus size={13} />
            Add Content
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">{error}</div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Items",   value: items.length },
          { label: "In Progress",   value: items.filter(i => !["published", "tracking", "identified"].includes(i.stage)).length },
          { label: "Published",     value: published },
          { label: "In Tracking",   value: items.filter(i => i.stage === "tracking").length },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-lg border border-gray-200 p-3">
            <div className="text-2xl font-bold text-gray-900">{k.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="mb-4 flex flex-wrap gap-1.5 text-[11px]">
        <span className="text-gray-400 self-center">Related:</span>
        <a href="/admin/growth/landing-pages" className="inline-flex items-center gap-1 px-2 py-1 rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-50">
          <ExternalLink size={10} />Landing Pages
        </a>
        <a href="/admin/growth/content" className="inline-flex items-center gap-1 px-2 py-1 rounded border border-gray-200 bg-white text-gray-600 hover:bg-gray-50">
          <ExternalLink size={10} />Content Factory
        </a>
        <a href="/admin/growth/director" className="inline-flex items-center gap-1 px-2 py-1 rounded border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100">
          <ExternalLink size={10} />Revenue Director
        </a>
      </div>

      {/* Stage filter */}
      <div className="flex flex-wrap gap-1 mb-4 bg-gray-100 p-1 rounded-lg w-fit">
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

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
          <RefreshCw size={16} className="animate-spin mr-2" /> Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-10 text-center">
          <Search size={28} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No SEO items yet</p>
          <p className="text-sm text-gray-400 mt-1">Add content items identified from keyword research or the GSC Opportunity Agent.</p>
          <button
            onClick={() => { setEditingItem(null); setShowModal(true) }}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700"
          >
            <Plus size={14} /> Add First Item
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => (
            <SeoCard
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
        <span>No automatic publishing — all content must be manually deployed and stage updated.</span>
        <a href="/admin/growth/seo" className="hover:text-gray-600 flex items-center gap-1">
          SEO Hub <ChevronRight size={11} />
        </a>
      </div>

      {showModal && (
        <SeoModal
          initial={editingItem ?? BLANK}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingItem(null) }}
        />
      )}
    </div>
  )
}
