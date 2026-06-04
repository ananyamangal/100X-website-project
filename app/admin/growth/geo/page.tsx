"use client"
import { useEffect, useState } from "react"
import { Bot, CheckCircle2, XCircle, Minus, RefreshCw, Plus } from "lucide-react"

const AI_PLATFORMS = ["ChatGPT", "Gemini", "Claude", "Perplexity", "Google AIO"]

const TARGET_QUERIES = [
  "OEM authorization letter fogging machine India",
  "GeM dealer authorization fogging machine",
  "fogging machine manufacturer India",
  "IS 14855 fogging machine",
  "municipal fogging machine GeM",
  "public health equipment GeM India",
  "thermal fogging machine MSME OEM India",
  "NHM fogging machine procurement",
  "vector control equipment GeM",
  "Make in India fogging machine",
]

const COVERAGE_CHECKS = [
  { label: "llms.txt published", status: "done", detail: "35 URL entries — AI crawlers can discover all pages" },
  { label: "MCP endpoint live", status: "done", detail: "/api/mcp — AI agents can query structured data" },
  { label: "Organization JSON-LD", status: "done", detail: "GlobalJsonLd.tsx on all pages" },
  { label: "FAQPage schema on key pages", status: "done", detail: "gem-oem-auth, become-a-dealer, is-14855, nvbdcp, nhm ✓" },
  { label: "FAQPage on /dealers-and-government", status: "gap", detail: "Hub page has no FAQ schema — add for AI Overview eligibility" },
  { label: "/ai/dealer-authorization profile", status: "done", detail: "Machine-readable OEM profile for AI systems" },
  { label: "/ai/procurement-guide", status: "gap", detail: "Missing — AI systems cannot answer 'how does GeM procurement work'" },
  { label: "Product schema on authority pages", status: "done", detail: "Product + FAQPage on nhm, nagar-panchayat, gem-reverse-auction, make-in-india" },
]

type CellVal = "mentioned" | "competitor" | "missing" | "unknown"

interface Citation {
  platform: string
  query: string
  status: CellVal
  source: string
  competitor: string
  notes: string
  checkedAt: string
}

const STORAGE_KEY = "growth_os_geo_citations"

function loadCitations(): Citation[] {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveCitations(c: Citation[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(c)) } catch {}
}

function StatusIcon({ s }: { s: CellVal }) {
  if (s === "mentioned") return <CheckCircle2 size={14} className="text-green-500" />
  if (s === "competitor") return <XCircle size={14} className="text-red-400" />
  if (s === "missing") return <Minus size={14} className="text-amber-400" />
  return <Minus size={14} className="text-gray-300" />
}

export default function GEOCommandCenter() {
  const [citations, setCitations] = useState<Citation[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ platform: "ChatGPT", query: TARGET_QUERIES[0], status: "unknown" as CellVal, source: "", competitor: "", notes: "" })

  useEffect(() => { setCitations(loadCitations()) }, [])

  const add = () => {
    const c: Citation = { ...form, checkedAt: new Date().toISOString() }
    const updated = [c, ...citations.filter(x => !(x.platform === form.platform && x.query === form.query))]
    setCitations(updated)
    saveCitations(updated)
    setShowAdd(false)
    setForm({ platform: "ChatGPT", query: TARGET_QUERIES[0], status: "unknown", source: "", competitor: "", notes: "" })
  }

  // AI Visibility Score: % of (platform, query) cells where status === "mentioned"
  const total = AI_PLATFORMS.length * TARGET_QUERIES.length
  const mentioned = citations.filter(c => c.status === "mentioned").length
  const score = Math.round((mentioned / total) * 100)
  const gaps = COVERAGE_CHECKS.filter(c => c.status === "gap")

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      <div className="bg-white border-b border-gray-200 px-8 py-5 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot size={18} className="text-brand-600" />
            <div>
              <h1 className="text-base font-bold text-gray-900">GEO / AI Search Command Center</h1>
              <p className="text-gray-400 text-[11px]">Track AI citation visibility across ChatGPT, Gemini, Claude, Perplexity, and Google AI Overviews</p>
            </div>
          </div>
          <button onClick={() => setShowAdd(s => !s)} className="flex items-center gap-1.5 text-xs bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700">
            <Plus size={13} /> Log Citation Check
          </button>
        </div>
      </div>

      <div className="px-8 py-6 max-w-[1400px] space-y-6">
        {/* AI Visibility Score */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-brand-200 p-5 shadow-sm text-center">
            <p className="text-4xl font-bold text-brand-600">{score}%</p>
            <p className="text-xs text-gray-400 mt-1">AI Visibility Score</p>
            <p className="text-[10px] text-gray-300 mt-0.5">{mentioned}/{total} cells tracked</p>
          </div>
          <div className="bg-white rounded-xl border border-red-200 p-5 shadow-sm text-center">
            <p className="text-4xl font-bold text-red-500">{gaps.length}</p>
            <p className="text-xs text-gray-400 mt-1">Coverage Gaps</p>
          </div>
          <div className="bg-white rounded-xl border border-green-200 p-5 shadow-sm text-center">
            <p className="text-4xl font-bold text-green-600">{citations.filter(c => c.status === "mentioned").length}</p>
            <p className="text-xs text-gray-400 mt-1">Citations Confirmed</p>
          </div>
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
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as CellVal }))} className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500">
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
              <button onClick={add} className="text-xs bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700">Save</button>
              <button onClick={() => setShowAdd(false)} className="text-xs border border-gray-200 text-gray-500 px-4 py-2 rounded-lg">Cancel</button>
            </div>
          </div>
        )}

        {/* Coverage checks */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Technical Coverage Checklist</h3>
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
        </div>

        {/* Citation matrix */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">Citation Tracking Matrix</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Manually log results from AI platform tests. Green = cited, Red = competitor shown, Amber = missing.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-2.5 text-gray-400 font-medium min-w-[240px]">Query</th>
                  {AI_PLATFORMS.map(p => <th key={p} className="text-center px-3 py-2.5 text-gray-400 font-medium">{p}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {TARGET_QUERIES.map(q => (
                  <tr key={q} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-gray-600 text-[11px]">{q}</td>
                    {AI_PLATFORMS.map(p => {
                      const c = citations.find(x => x.platform === p && x.query === q)
                      return (
                        <td key={p} className="px-3 py-3 text-center">
                          <div className="flex items-center justify-center">
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
        </div>

        {/* Recent checks */}
        {citations.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-800">Recent Citation Logs</h3>
            </div>
            <div className="divide-y divide-gray-50">
              {citations.slice(0, 10).map((c, i) => (
                <div key={i} className="px-5 py-3 flex items-center gap-3 text-xs">
                  <StatusIcon s={c.status} />
                  <div className="flex-1">
                    <p className="text-gray-700 font-medium">{c.platform}: {c.query}</p>
                    {c.competitor && <p className="text-red-500 text-[11px]">Competitor: {c.competitor}</p>}
                    {c.notes && <p className="text-gray-400 text-[11px]">{c.notes}</p>}
                  </div>
                  <span className="text-gray-300 text-[10px] whitespace-nowrap">{new Date(c.checkedAt).toLocaleDateString("en-IN")}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
