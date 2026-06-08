"use client"
import { useEffect, useRef, useState } from "react"
import {
  Sparkles, Send, RefreshCw, Database, AlertCircle,
  ChevronDown, ChevronUp, ExternalLink, Loader2, BrainCircuit,
} from "lucide-react"

// ─── Types ─────────────────────────────────────────────────────────────────────

interface KgStatus {
  built: boolean
  collections: { collection: string; count: number }[]
}

interface AnalystResult {
  success: boolean
  question: string
  summary: string
  findings: string[]
  columns: Record<string, string>
  data: Record<string, unknown>[]
  total: number
  collection: string
  pipeline_used: unknown[]
  explanation: string
  error?: string
  setup?: string
  detail?: string
}

interface ChatMessage {
  role: "user" | "assistant"
  question?: string
  result?: AnalystResult
  error?: string
  ts: number
}

// ─── Format helpers ─────────────────────────────────────────────────────────────

function fmtInr(n: unknown): string {
  if (typeof n !== "number" || !n) return "—"
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(1)} K`
  return `₹${n.toLocaleString("en-IN")}`
}

function fmtVal(v: unknown): string {
  if (v === null || v === undefined) return "—"
  if (typeof v === "number") {
    const s = String(v)
    // Looks like GMV (large rupee value)?
    if (v > 50000 && s.length >= 6) return fmtInr(v)
    return v.toLocaleString("en-IN")
  }
  if (typeof v === "string" && v.length > 60) return v.slice(0, 58) + "…"
  if (typeof v === "object") return JSON.stringify(v)
  return String(v)
}

function guessDisplayName(key: string, userColumns: Record<string, string>): string {
  if (userColumns[key]) return userColumns[key]
  const map: Record<string, string> = {
    dealer: "Dealer", seller_name_canonical: "Seller", dept: "Department",
    dept_name: "Department", product: "Product", product_name: "Product",
    ministry: "Ministry", state: "State", seller_state: "State",
    contract_count: "Contracts", total_contracts: "Contracts",
    total_gmv: "GMV", gmv: "GMV", count: "Count",
    dept_count: "Depts", state_count: "States", product_count: "Products",
    seller_count: "Sellers", growth_rate: "Growth %", dealer_score: "Score",
    vendor_concentration: "Top Vendor %", gemc_no: "Contract #",
    contract_value_num: "Value", unit_rate: "Unit Rate",
    first_seen: "First Seen", last_seen: "Last Seen",
    seller_gst: "GSTIN", active_years: "Years Active",
  }
  return map[key] || key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
}

// ─── Example questions ──────────────────────────────────────────────────────────

const EXAMPLES = [
  "Find fogging machine dealers who also sell municipal equipment",
  "Which departments repeatedly buy from the same seller?",
  "Show dealers serving health departments in more than 5 states",
  "Which products are bought by departments that also buy fogging machines?",
  "Show top 20 dealers by GMV with their state and department reach",
  "Which departments should 100X target next based on spend patterns?",
  "Find sellers supplying vector control or mosquito control equipment",
  "Show sanitation products growing fastest in the last 3 years",
  "Which dealers could distribute 100X products?",
  "Show departments buying waste management and fogging together",
]

// ─── Knowledge Graph Status Bar ─────────────────────────────────────────────────

function KgStatusBar() {
  const [status, setStatus] = useState<KgStatus | null>(null)
  const [building, setBuilding] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  const load = () => {
    fetch("/api/admin/procurement/knowledge-graph")
      .then(r => r.json())
      .then(setStatus)
      .catch(() => {})
  }

  useEffect(() => { load() }, [])

  const build = async () => {
    setBuilding(true)
    try {
      await fetch("/api/admin/procurement/knowledge-graph", { method: "POST" })
      await load()
    } finally {
      setBuilding(false)
    }
  }

  if (!status) return null

  const total = status.collections.reduce((s, c) => s + c.count, 0)

  return (
    <div className={`rounded-xl border px-4 py-3 text-xs flex flex-wrap items-center gap-3 ${
      status.built ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"
    }`}>
      <BrainCircuit size={14} className={status.built ? "text-green-600" : "text-amber-600"} />
      <span className={`font-semibold ${status.built ? "text-green-800" : "text-amber-800"}`}>
        {status.built ? `Knowledge Graph Built — ${total.toLocaleString("en-IN")} relationship nodes` : "Knowledge Graph Not Built"}
      </span>
      {!status.built && (
        <span className="text-amber-700">Build it for richer cross-collection queries.</span>
      )}

      <button
        onClick={() => setShowDetails(v => !v)}
        className="text-gray-500 hover:text-gray-700 flex items-center gap-1 ml-auto">
        {showDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        {showDetails ? "Hide" : "Details"}
      </button>

      <button
        onClick={build}
        disabled={building}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 shadow-sm">
        {building ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
        {building ? "Building…" : status.built ? "Rebuild" : "Build Now"}
      </button>

      {showDetails && (
        <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
          {status.collections.map(c => (
            <div key={c.collection} className="bg-white rounded-lg border border-gray-200 px-3 py-2">
              <p className="text-[10px] text-gray-400 truncate">{c.collection.replace("gem_kg_", "")}</p>
              <p className="font-bold text-gray-800">{c.count.toLocaleString("en-IN")}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Result Card ────────────────────────────────────────────────────────────────

function ResultCard({ result, onDealerClick }: {
  result: AnalystResult
  onDealerClick?: (name: string) => void
}) {
  const [showPipeline, setShowPipeline] = useState(false)
  const [showAll, setShowAll] = useState(false)

  if (result.error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
        <div className="flex items-center gap-2 text-red-700 text-sm font-semibold">
          <AlertCircle size={14} />
          {result.error}
        </div>
        {result.setup && <p className="text-xs text-red-600">{result.setup}</p>}
        {result.detail && (
          <details className="text-[10px] text-red-500">
            <summary className="cursor-pointer">Technical detail</summary>
            <pre className="mt-1 whitespace-pre-wrap break-all">{result.detail}</pre>
          </details>
        )}
      </div>
    )
  }

  // Determine column keys from data
  const allKeys = result.data.length > 0 ? Object.keys(result.data[0]) : []
  const displayKeys = allKeys.filter(k => !["_id", "year_trend"].includes(k)).slice(0, 10)
  const visibleRows = showAll ? result.data : result.data.slice(0, 15)

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-start gap-2">
          <Sparkles size={14} className="text-brand-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-gray-700 leading-relaxed">{result.summary}</p>
        </div>
      </div>

      {/* Findings */}
      {result.findings && result.findings.length > 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <p className="text-xs font-semibold text-blue-800 mb-2">Key Findings</p>
          <ul className="space-y-1.5">
            {result.findings.map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-blue-700">
                <span className="font-bold text-blue-500 flex-shrink-0">{i + 1}.</span>
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Data table */}
      {result.data.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-700">
              {result.total.toLocaleString("en-IN")} results
              <span className="text-gray-400 font-normal ml-1">from {result.collection}</span>
            </span>
            <span className="text-[10px] text-gray-400">{result.explanation}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {displayKeys.map(k => (
                    <th key={k} className="text-left px-3 py-2.5 text-gray-400 font-medium whitespace-nowrap">
                      {guessDisplayName(k, result.columns)}
                    </th>
                  ))}
                  <th className="px-3 py-2.5 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {visibleRows.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                    {displayKeys.map(k => {
                      const raw = row[k]
                      const isDealer = (k === "dealer" || k === "seller_name_canonical") && typeof raw === "string"
                      const isGemc   = k === "gemc_no" && typeof raw === "string"
                      return (
                        <td key={k} className="px-3 py-2 text-gray-700">
                          {isDealer && onDealerClick ? (
                            <button
                              onClick={() => onDealerClick(raw)}
                              className="text-brand-600 hover:underline font-medium text-left">
                              {raw.length > 35 ? raw.slice(0, 33) + "…" : raw}
                            </button>
                          ) : isGemc ? (
                            <span className="font-mono text-gray-500">{raw.slice(0, 20)}…</span>
                          ) : (
                            <span>{fmtVal(raw)}</span>
                          )}
                        </td>
                      )
                    })}
                    <td className="px-3 py-2">
                      {typeof row["gemc_no"] === "string" && (
                        <a
                          href={`https://mkp.gem.gov.in/contract/order-detail/${row["gemc_no"]}`}
                          target="_blank" rel="noopener noreferrer"
                          className="text-gray-300 hover:text-brand-500 transition-colors"
                          title="View on GeM">
                          <ExternalLink size={11} />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {result.data.length > 15 && (
            <div className="px-4 py-2 border-t border-gray-100 flex items-center justify-between">
              <span className="text-[10px] text-gray-400">
                Showing {showAll ? result.data.length : 15} of {result.data.length}
              </span>
              <button
                onClick={() => setShowAll(v => !v)}
                className="text-[10px] text-brand-600 hover:text-brand-700 font-medium">
                {showAll ? "Show less" : `Show all ${result.data.length}`}
              </button>
            </div>
          )}
        </div>
      )}

      {result.data.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
          <p className="text-sm text-gray-500">No results found for this query.</p>
          <p className="text-xs text-gray-400 mt-1">Try broadening your search terms.</p>
        </div>
      )}

      {/* Pipeline debug */}
      <div>
        <button
          onClick={() => setShowPipeline(v => !v)}
          className="text-[10px] text-gray-400 hover:text-gray-600 flex items-center gap-1">
          <Database size={10} />
          {showPipeline ? "Hide" : "Show"} generated pipeline
        </button>
        {showPipeline && (
          <pre className="mt-2 text-[10px] bg-gray-900 text-green-400 rounded-xl p-4 overflow-x-auto max-h-48">
            {JSON.stringify({ collection: result.collection, pipeline: result.pipeline_used }, null, 2)}
          </pre>
        )}
      </div>
    </div>
  )
}

// ─── Main Tab ───────────────────────────────────────────────────────────────────

export function AiAnalystTab({ onDealerClick }: { onDealerClick?: (name: string) => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const ask = async (q: string) => {
    const question = q.trim()
    if (!question || loading) return

    const userMsg: ChatMessage = { role: "user", question, ts: Date.now() }
    setMessages(prev => [...prev, userMsg])
    setInput("")
    setLoading(true)

    try {
      const res = await fetch("/api/admin/procurement/ai-analyst", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ question }),
      })
      const data: AnalystResult = await res.json()
      setMessages(prev => [...prev, {
        role:   "assistant",
        result: data,
        ts:     Date.now(),
      }])
    } catch (err) {
      setMessages(prev => [...prev, {
        role:   "assistant",
        result: { error: "Network error. Is the server running?", detail: String(err) } as AnalystResult,
        ts:     Date.now(),
      }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      ask(input)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Knowledge Graph status */}
      <KgStatusBar />

      {/* Chat history */}
      {messages.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <div className="w-10 h-10 rounded-full bg-brand-50 flex items-center justify-center">
                <Sparkles size={18} className="text-brand-600" />
              </div>
            </div>
            <h3 className="text-sm font-semibold text-gray-800">AI Procurement Analyst</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              Ask any question about the 16,000+ GeM contracts database. The AI converts your question into a MongoDB query and synthesises the results.
            </p>
          </div>

          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-2 font-medium">Example questions</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {EXAMPLES.map(q => (
                <button key={q} onClick={() => ask(q)}
                  className="text-left text-xs text-gray-600 bg-gray-50 hover:bg-brand-50 hover:text-brand-700 border border-gray-200 hover:border-brand-200 rounded-lg px-3 py-2 transition-colors">
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {messages.map((msg, i) => (
            <div key={i}>
              {msg.role === "user" ? (
                <div className="flex justify-end">
                  <div className="bg-brand-600 text-white rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[80%] text-sm">
                    {msg.question}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {msg.result && (
                    <ResultCard result={msg.result} onDealerClick={onDealerClick} />
                  )}
                  {msg.error && (
                    <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                      {msg.error}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-gray-400 px-1">
              <Loader2 size={12} className="animate-spin text-brand-500" />
              Generating query and analysing data…
            </div>
          )}

          <div ref={bottomRef} />

          {/* New example questions after first message */}
          <div>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-2 font-medium">More questions</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.slice(0, 4).map(q => (
                <button key={q} onClick={() => ask(q)}
                  className="text-[11px] text-gray-600 bg-gray-50 hover:bg-brand-50 hover:text-brand-700 border border-gray-200 hover:border-brand-200 rounded-full px-3 py-1 transition-colors">
                  {q.slice(0, 50)}{q.length > 50 ? "…" : ""}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="sticky bottom-0 bg-gray-50 pt-2 pb-1">
        <div className="bg-white border border-gray-300 rounded-xl shadow-sm focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100 transition-all">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about procurement data… (Enter to send, Shift+Enter for new line)"
            className="w-full px-4 pt-3 pb-2 text-sm text-gray-800 placeholder:text-gray-400 bg-transparent resize-none outline-none min-h-[56px] max-h-36"
            rows={2}
            disabled={loading}
          />
          <div className="px-3 pb-2 flex items-center justify-between">
            <span className="text-[10px] text-gray-400">
              Queries <span className="font-mono bg-gray-100 px-1 rounded">gem_contracts</span> + knowledge graph
            </span>
            <button
              onClick={() => ask(input)}
              disabled={loading || !input.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 text-white rounded-lg text-xs font-medium disabled:opacity-40 hover:bg-brand-700 transition-colors">
              {loading ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
              {loading ? "Thinking…" : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
