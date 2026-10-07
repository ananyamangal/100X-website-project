"use client"
import { useEffect, useState, useCallback } from "react"
import { FileText, Plus, CheckCircle2, XCircle, Eye, Edit3, Send } from "lucide-react"
import type { ContentDraft } from "@/lib/growth-os/types"

const STATUS_COLOR: Record<string, string> = {
  draft: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  published: "bg-brand-100 text-brand-700",
  rejected: "bg-red-100 text-red-700",
}
const RISK_COLOR: Record<string, string> = {
  low: "bg-green-100 text-green-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-red-100 text-red-700",
}

function Pill({ children, color }: { children: React.ReactNode; color: string }) {
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${color}`}>{children}</span>
}

const BLANK: Partial<ContentDraft> = { title: "", targetIntent: "", opportunitySource: "manual", confidenceScore: 70, expectedImpact: "", riskLevel: "medium", targetUrl: "" }

export default function ContentFactory() {
  const [drafts, setDrafts] = useState<ContentDraft[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState<Partial<ContentDraft>>(BLANK)
  const [editing, setEditing] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")

  const load = useCallback(() => {
    setLoading(true)
    fetch("/api/admin/growth/content")
      .then(r => r.json())
      .then(d => { setDrafts(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const add = async () => {
    await fetch("/api/admin/growth/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    setShowAdd(false)
    setForm(BLANK)
    load()
  }

  const setStatus = async (id: string, status: string) => {
    if (status === "published") {
      const ok = confirm("Are you sure you want to mark this as published? HIGH RISK action.")
      if (!ok) return
    }
    await fetch("/api/admin/growth/content", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    })
    setDrafts(prev => prev.map(d => d._id === id ? { ...d, status: status as ContentDraft["status"] } : d))
  }

  const saveEdit = async (id: string) => {
    await fetch("/api/admin/growth/content", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, content: editContent }),
    })
    setEditing(null)
    load()
  }

  const filtered = filter === "all" ? drafts : drafts.filter(d => d.status === filter)
  const draftCount = drafts.filter(d => d.status === "draft").length
  const publishedCount = drafts.filter(d => d.status === "published").length

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      <div className="bg-white border-b border-gray-200 px-8 py-5 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-brand-600" />
            <div>
              <h1 className="text-base font-bold text-gray-900">Content Factory</h1>
              <p className="text-gray-400 text-[11px]">Draft queue with approval workflow — high-impact content requires approval</p>
            </div>
          </div>
          <button onClick={() => setShowAdd(s => !s)} className="flex items-center gap-1.5 text-xs bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 transition-colors">
            <Plus size={13} /> New Draft
          </button>
        </div>
      </div>

      <div className="px-8 py-6 max-w-[1400px] space-y-4">
        {/* Policy notice */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3 text-xs text-red-700">
          <CheckCircle2 size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
          <p><strong>Approval required:</strong> New pages, published content, and navigation changes are HIGH RISK. They require manual approval before execution. Low-risk changes (schema, metadata, internal links) may auto-execute via Automation Center.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-amber-200 p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-amber-600">{draftCount}</p>
            <p className="text-xs text-gray-400 mt-0.5">In Draft</p>
          </div>
          <div className="bg-white rounded-xl border border-green-200 p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-green-600">{drafts.filter(d => d.status === "approved").length}</p>
            <p className="text-xs text-gray-400 mt-0.5">Approved</p>
          </div>
          <div className="bg-white rounded-xl border border-brand-200 p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-brand-600">{publishedCount}</p>
            <p className="text-xs text-gray-400 mt-0.5">Published</p>
          </div>
        </div>

        {/* Add form */}
        {showAdd && (
          <div className="bg-white rounded-xl border border-brand-200 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">New Content Draft</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <input value={form.title || ""} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Title *" className="text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand-500 col-span-2" />
              <input value={form.targetIntent || ""} onChange={e => setForm(f => ({ ...f, targetIntent: e.target.value }))} placeholder="Target Intent (e.g. dealer seeking GeM OEM auth)" className="text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand-500" />
              <input value={form.targetUrl || ""} onChange={e => setForm(f => ({ ...f, targetUrl: e.target.value }))} placeholder="Target URL (e.g. /dealer-case-study)" className="text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand-500" />
              <input value={form.expectedImpact || ""} onChange={e => setForm(f => ({ ...f, expectedImpact: e.target.value }))} placeholder="Expected Impact" className="text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand-500" />
              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-wide mb-1 block">Risk Level</label>
                <select value={form.riskLevel || "medium"} onChange={e => setForm(f => ({ ...f, riskLevel: e.target.value as ContentDraft["riskLevel"] }))} className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500">
                  {["low", "medium", "high"].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-wide mb-1 block">Confidence Score</label>
                <input type="number" min={0} max={100} value={form.confidenceScore || 70} onChange={e => setForm(f => ({ ...f, confidenceScore: parseInt(e.target.value) }))} className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand-500" />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={add} disabled={!form.title} className="text-xs bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors">Add to Queue</button>
              <button onClick={() => setShowAdd(false)} className="text-xs border border-gray-200 text-gray-500 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
            </div>
          </div>
        )}

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {["all", "draft", "approved", "published", "rejected"].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${filter === s ? "bg-gray-900 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-gray-300"}`}>
              {s === "all" ? `All (${drafts.length})` : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
            <FileText size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 text-sm font-medium">No drafts in this queue</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(draft => (
              <div key={draft._id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-sm font-semibold text-gray-800">{draft.title}</h3>
                        <Pill color={STATUS_COLOR[draft.status]}>{draft.status}</Pill>
                        <Pill color={RISK_COLOR[draft.riskLevel]}>{draft.riskLevel} risk</Pill>
                        <span className="text-[10px] text-gray-400">Score: {draft.confidenceScore}%</span>
                      </div>
                      <div className="grid sm:grid-cols-3 gap-2 text-[11px] text-gray-500 mb-2">
                        <span>Intent: <strong className="text-gray-700">{draft.targetIntent || "—"}</strong></span>
                        <span>URL: <strong className="text-gray-700 font-mono">{draft.targetUrl || "—"}</strong></span>
                        <span>Impact: <strong className="text-gray-700">{draft.expectedImpact || "—"}</strong></span>
                      </div>
                      {editing === draft._id ? (
                        <div className="mt-2">
                          <textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={6} className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand-500 resize-y font-mono" placeholder="Content / outline…" />
                          <div className="flex gap-2 mt-2">
                            <button onClick={() => saveEdit(draft._id!)} className="text-xs bg-brand-600 text-white px-3 py-1.5 rounded-lg">Save</button>
                            <button onClick={() => setEditing(null)} className="text-xs border border-gray-200 text-gray-500 px-3 py-1.5 rounded-lg">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        draft.content && <pre className="mt-2 text-[11px] text-gray-500 bg-gray-50 rounded-lg px-3 py-2 whitespace-pre-wrap max-h-24 overflow-auto border border-gray-100">{draft.content}</pre>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <button onClick={() => { setEditing(draft._id!); setEditContent(draft.content || "") }} className="flex items-center gap-1 text-[11px] border border-gray-200 text-gray-500 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                        <Edit3 size={10} /> Edit
                      </button>
                      {draft.status === "draft" && (
                        <button onClick={() => setStatus(draft._id!, "approved")} className="flex items-center gap-1 text-[11px] bg-green-600 text-white px-2.5 py-1.5 rounded-lg hover:bg-green-700 transition-colors">
                          <CheckCircle2 size={10} /> Approve
                        </button>
                      )}
                      {draft.status === "approved" && (
                        <button onClick={() => setStatus(draft._id!, "published")} className="flex items-center gap-1 text-[11px] bg-brand-600 text-white px-2.5 py-1.5 rounded-lg hover:bg-brand-700 transition-colors">
                          <Send size={10} /> Publish
                        </button>
                      )}
                      {["draft", "approved"].includes(draft.status) && (
                        <button onClick={() => setStatus(draft._id!, "rejected")} className="flex items-center gap-1 text-[11px] border border-gray-200 text-red-400 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
                          <XCircle size={10} /> Reject
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
