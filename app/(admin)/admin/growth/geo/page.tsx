"use client"
import { useEffect, useState, useCallback } from "react"
import { Bot, CheckCircle2, XCircle, Minus, Plus, Play, RotateCw, Clock, AlertCircle } from "lucide-react"
import { TARGET_QUERIES, AI_PLATFORMS } from "@/lib/growth-os/citation-constants"

const COVERAGE_CHECKS = [
  { label: "llms.txt published", status: "done", detail: "35 URL entries — AI crawlers can discover all pages" },
  { label: "MCP endpoint live", status: "done", detail: "/api/mcp — AI agents can query structured data" },
  { label: "Organization JSON-LD", status: "done", detail: "GlobalJsonLd.tsx on all pages" },
  { label: "FAQPage schema on key pages", status: "done", detail: "gem-oem-auth, become-a-dealer, is-14855, nvbdcp, nhm ✓" },
  { label: "FAQPage on /dealers-and-government", status: "gap", detail: "Hub page has no FAQ schema — add for AI Overview eligibility" },
  { label: "/ai/procurement-guide", status: "gap", detail: "Missing — AI systems cannot answer 'how does GeM procurement work'" },
  { label: "Product schema on authority pages", status: "done", detail: "Product + FAQPage on nhm, nagar-panchayat, gem-reverse-auction, make-in-india" },
]

type CellStatus = "mentioned" | "competitor" | "missing" | "unknown"

interface Citation {
  _id?: string; platform: string; query: string; status: CellStatus; competitor?: string; source?: string; notes?: string; checkedAt: string
}
interface CitationTask {
  _id: string; query: string; platform: string; dueDate: string; priority: string; reason: string
}
interface AgentResult {
  summary?: string; visibilityScore?: number; checked?: number; unchecked?: number; stale?: number; weeklyQueueCreated?: number; totalCombinations?: number
}

function StatusIcon({ s }: { s: CellStatus }) {
  if (s === "mentioned") return <CheckCircle2 size={14} className="text-green-500" />
  if (s === "competitor") return <XCircle size={14} className="text-red-400" />
  if (s === "missing") return <Minus size={14} className="text-amber-400" />
  return <Minus size={14} className="text-gray-200" />
}

function PriorityBadge({ p }: { p: string }) {
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${p === "high" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{p}</span>
}

export default function GEOCommandCenter() {
  const [citations, setCitations] = useState<Citation[]>([])
  const [tasks, setTasks] = useState<CitationTask[]>([])
  const [agentResult, setAgentResult] = useState<AgentResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<"matrix" | "tasks" | "coverage">("tasks")
  const [form, setForm] = useState({
    platform: AI_PLATFORMS[0],
    query: TARGET_QUERIES[0],
    status: "unknown" as CellStatus,
    competitor: "",
    source: "",
    notes: "",
  })

  const loadAll = useCallback(async () => {
    setLoading(true)
    await Promise.allSettled([
      fetch("/api/admin/growth/citations").then(r => r.json()).then(d => Array.isArray(d) && setCitations(d)),
      fetch("/api/admin/growth/citation-tasks").then(r => r.json()).then(d => Array.isArray(d) && setTasks(d)),
    ])
    setLoading(false)
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  const runAgent = async () => {
    setRunning(true); setAgentResult(null)
    try {
      const r = await fetch("/api/admin/growth/agents/ai-citation", { method: "POST" })
      const d = await r.json()
      setAgentResult(d)
      await loadAll()
    } catch { setAgentResult({ summary: "Error running agent" }) }
    setRunning(false)
  }

  const saveCitation = async () => {
    setSaving(true)
    await fetch("/api/admin/growth/citations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    await loadAll()
    setSaving(false); setShowAdd(false)
    setForm({ platform: AI_PLATFORMS[0], query: TARGET_QUERIES[0], status: "unknown", competitor: "", source: "", notes: "" })
  }

  const completeTask = async (id: string, query: string, platform: string) => {
    // Mark the task + save as verified citation
    await fetch(`/api/admin/growth/citation-tasks`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "completed" }),
    })
    setTasks(prev => prev.filter(t => t._id !== id))
    // Pre-fill the form to log the result
    setForm(f => ({ ...f, query, platform, status: "unknown" }))
    setShowAdd(true)
  }

  // Build citation matrix lookup
  const citationMap = new Map<string, Citation>()
  for (const c of citations) citationMap.set(`${c.platform}::${c.query}`, c)

  const checkedCitations = citations.filter(c => c.status !== "unknown")
  const mentioned = checkedCitations.filter(c => c.status === "mentioned").length
  const visibilityScore = checkedCitations.length > 0 ? Math.round((mentioned / checkedCitations.length) * 100) : 0
  const gaps = COVERAGE_CHECKS.filter(c => c.status === "gap")

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      <div className="bg-white border-b border-gray-200 px-8 py-5 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot size={18} className="text-brand-600" />
            <div>
              <h1 className="text-base font-bold text-gray-900">GEO / AI Search Command Center</h1>
              <p className="text-gray-400 text-[11px]">Track AI citation visibility — ChatGPT, Gemini, Claude, Perplexity, Google AI Overviews</p>
            </div>
          </div>
          <button onClick={() => setShowAdd(s => !s)} className="flex items-center gap-1.5 text-xs bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700">
            <Plus size={13} /> Log Citation Check
          </button>
        </div>
      </div>

      <div className="px-8 py-6 max-w-[1400px] space-y-6">
        {/* Score header */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-brand-200 p-5 shadow-sm text-center">
            <p className="text-4xl font-bold text-brand-600">{visibilityScore}%</p>
            <p className="text-xs text-gray-400 mt-1">AI Visibility Score</p>
            <p className="text-[10px] text-gray-300 mt-0.5">{mentioned}/{checkedCitations.length} checked cited</p>
          </div>
          <div className="bg-white rounded-xl border border-red-200 p-5 shadow-sm text-center">
            <p className="text-4xl font-bold text-red-500">{tasks.length}</p>
            <p className="text-xs text-gray-400 mt-1">Pending checks</p>
            <p className="text-[10px] text-gray-300 mt-0.5">this week&apos;s queue</p>
          </div>
          <div className="bg-white rounded-xl border border-amber-200 p-5 shadow-sm text-center">
            <p className="text-4xl font-bold text-amber-500">{TARGET_QUERIES.length * AI_PLATFORMS.length - checkedCitations.length}</p>
            <p className="text-xs text-gray-400 mt-1">Unchecked</p>
            <p className="text-[10px] text-gray-300 mt-0.5">never verified</p>
          </div>
          <div className="bg-white rounded-xl border border-green-200 p-5 shadow-sm text-center">
            <p className="text-4xl font-bold text-green-600">{mentioned}</p>
            <p className="text-xs text-gray-400 mt-1">Confirmed citations</p>
          </div>
        </div>

        {/* AI Citation Agent */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-800 mb-1">AI Citation Agent</h3>
            <p className="text-xs text-gray-500">Audits the citation database: finds never-checked queries, stale records (&gt;7 days), and creates a weekly verification queue. Does not call OpenAI — generates tasks for manual verification.</p>
            {agentResult?.summary && (
              <p className="text-[11px] text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5 mt-2">{agentResult.summary}</p>
            )}
          </div>
          <button onClick={runAgent} disabled={running}
            className="flex items-center gap-1.5 text-xs bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 disabled:opacity-50 shrink-0">
            {running ? <RotateCw size={12} className="animate-spin" /> : <Play size={12} />}
            {running ? "Running…" : "Run audit"}
          </button>
        </div>

        {/* Log citation form */}
        {showAdd && (
          <div className="bg-white rounded-xl border border-brand-200 p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">Log AI Citation Check</h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-wide mb-1 block">Platform</label>
                <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))} className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500">
                  {AI_PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-wide mb-1 block">Query</label>
                <select value={form.query} onChange={e => setForm(f => ({ ...f, query: e.target.value }))} className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500">
                  {TARGET_QUERIES.map(q => <option key={q} value={q}>{q}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-wide mb-1 block">Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as CellStatus }))} className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500">
                  <option value="mentioned">Mentioned ✓</option>
                  <option value="competitor">Competitor shown</option>
                  <option value="missing">Missing</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>
              <input value={form.competitor} onChange={e => setForm(f => ({ ...f, competitor: e.target.value }))} placeholder="Competitor cited (if any)" className="text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand-500" />
              <input value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} placeholder="Source URL (if 100X cited)" className="text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand-500" />
              <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notes" className="text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand-500" />
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={saveCitation} disabled={saving} className="text-xs bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50">
                {saving ? "Saving…" : "Save to MongoDB"}
              </button>
              <button onClick={() => setShowAdd(false)} className="text-xs border border-gray-200 text-gray-500 px-4 py-2 rounded-lg">Cancel</button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-sm w-fit">
          {(["tasks", "matrix", "coverage"] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`text-xs px-4 py-1.5 rounded-lg font-medium transition-colors ${activeTab === tab ? "bg-brand-600 text-white" : "text-gray-500 hover:text-gray-700"}`}>
              {tab === "tasks" ? `Verification Queue (${tasks.length})` : tab === "matrix" ? "Citation Matrix" : "Coverage Checklist"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* === VERIFICATION QUEUE === */}
            {activeTab === "tasks" && (
              <div className="space-y-3">
                {tasks.length === 0 ? (
                  <div className="bg-white rounded-xl border border-dashed border-gray-200 p-10 text-center">
                    <CheckCircle2 size={24} className="text-green-400 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm font-medium">No pending tasks</p>
                    <p className="text-gray-400 text-xs mt-1">Run the AI Citation Agent to generate this week&apos;s verification queue.</p>
                  </div>
                ) : (
                  <>
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
                      <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-amber-700 text-xs">
                        <strong>{tasks.length} queries need manual verification this week.</strong> For each: open the platform, paste the query, check if 100X Circle is mentioned. Then click &quot;Log result&quot; below.
                      </p>
                    </div>
                    {tasks.map(task => (
                      <div key={task._id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-start gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-xs font-semibold text-gray-800">{task.platform}</span>
                            <PriorityBadge p={task.priority} />
                            {task.reason === "never_checked" ? (
                              <span className="text-[10px] bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full">Never checked</span>
                            ) : (
                              <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Stale &gt;7 days</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-700 mb-1 italic">&quot;{task.query}&quot;</p>
                          <div className="flex items-center gap-1 text-[11px] text-gray-400">
                            <Clock size={10} />
                            Due: {task.dueDate}
                          </div>
                        </div>
                        <button
                          onClick={() => completeTask(task._id, task.query, task.platform)}
                          className="text-xs border border-brand-300 text-brand-600 px-3 py-1.5 rounded-lg hover:bg-brand-50 shrink-0">
                          Log result
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* === CITATION MATRIX === */}
            {activeTab === "matrix" && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-800">Citation Tracking Matrix</h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">Saved to MongoDB. Green = cited, Red = competitor shown, Amber = missing, Gray = not yet checked.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="text-left px-4 py-2.5 text-gray-400 font-medium min-w-[240px]">Query</th>
                        {AI_PLATFORMS.map(p => <th key={p} className="text-center px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">{p}</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {TARGET_QUERIES.map(q => (
                        <tr key={q} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3 text-gray-600 text-[11px]">{q}</td>
                          {AI_PLATFORMS.map(p => {
                            const c = citationMap.get(`${p}::${q}`)
                            return (
                              <td key={p} className="px-3 py-3 text-center">
                                <div className="flex items-center justify-center" title={c?.notes || c?.competitor || p}>
                                  <StatusIcon s={c?.status || "unknown"} />
                                </div>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {citations.length > 0 && (
                  <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
                    <p className="text-[11px] text-gray-400">{checkedCitations.length} of {TARGET_QUERIES.length * AI_PLATFORMS.length} combinations checked. Last log: {citations[0]?.checkedAt ? new Date(citations[0].checkedAt).toLocaleDateString("en-IN") : "—"}</p>
                  </div>
                )}
              </div>
            )}

            {/* === COVERAGE CHECKLIST === */}
            {activeTab === "coverage" && (
              <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-800 mb-4">Technical GEO Coverage Checklist</h3>
                <div className="space-y-2">
                  {COVERAGE_CHECKS.map(({ label, status, detail }) => (
                    <div key={label} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                      <div className="mt-0.5 flex-shrink-0">
                        {status === "done" ? <CheckCircle2 size={14} className="text-green-500" /> : <XCircle size={14} className="text-red-400" />}
                      </div>
                      <div>
                        <p className={`text-xs font-medium ${status === "done" ? "text-gray-800" : "text-red-700"}`}>{label}</p>
                        <p className="text-[11px] text-gray-500">{detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-[11px] text-gray-400">{gaps.length} coverage gap{gaps.length !== 1 ? "s" : ""} — fix these to improve AI Overview eligibility.</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
