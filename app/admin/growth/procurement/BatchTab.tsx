"use client"
import { useState, useCallback, useEffect } from "react"
import {
  Link2, ClipboardPaste, Loader2, CheckCircle2, AlertCircle,
  Terminal, ChevronDown, ChevronUp, Zap, Users, Tag,
  Bot, Play, RefreshCw, Clock, Database,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface FetchResult {
  created: number; updated: number; skipped: number
  errors: string[]
  new_dealers: string[]
  new_brands: string[]
  bids: { bid_number: string; status: string; state: string; l1: string }[]
}

interface ParseResult {
  total: number; created: number; updated: number
  new_dealers: string[]
  bids: {
    bid_number: string; department_name: string; state: string
    product_category: string; current_status: string
    quantity: number | null; estimated_value_inr: number | null
    l1_dealer_name: string; l1_price_inr: number | null
  }[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCr(n: number | null) {
  if (!n) return "—"
  if (n >= 10000000) return `₹${(n/10000000).toFixed(1)}Cr`
  if (n >= 100000)   return `₹${(n/100000).toFixed(1)}L`
  return `₹${n.toLocaleString("en-IN")}`
}

const STATUS_DOT: Record<string, string> = {
  awarded:        "bg-green-500",
  financial_eval: "bg-amber-400",
  technical_eval: "bg-purple-400",
  published:      "bg-blue-400",
  cancelled:      "bg-red-400",
}

function Pill({ c, children }: { c: string; children: React.ReactNode }) {
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${c}`}>{children}</span>
}

// ─── Console command helper ───────────────────────────────────────────────────

const CONSOLE_CMD = `copy(Array.from(document.querySelectorAll('a[href*="getSinglePacketResultView"]')).map(a=>a.href).join('\\n'))`

function ConsoleHelper() {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(CONSOLE_CMD)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-gray-900 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-gray-300 hover:bg-gray-800">
        <span className="flex items-center gap-2">
          <Terminal size={12} className="text-green-400" />
          How to get URLs from GeM result page
        </span>
        {open ? <ChevronUp size={12} className="text-gray-500" /> : <ChevronDown size={12} className="text-gray-500" />}
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 space-y-3">
          <ol className="text-[11px] text-gray-400 space-y-1.5 list-decimal ml-4">
            <li>Open GeM result list: <span className="text-green-400 font-mono">bidplus.gem.gov.in/all-bids</span></li>
            <li>Apply filter: keyword = <span className="text-amber-300">fogging</span>, status = <span className="text-amber-300">Awarded</span></li>
            <li>Wait for page to load (results appear)</li>
            <li>Press <kbd className="bg-gray-700 border border-gray-600 rounded px-1 text-gray-200 font-mono text-[10px]">F12</kbd> → Console tab</li>
            <li>Paste the command below and press Enter</li>
            <li>Your clipboard now has all result URLs — paste them above</li>
          </ol>

          <div className="bg-black rounded-lg p-3 relative group">
            <code className="text-green-400 text-[10px] font-mono break-all leading-relaxed">
              {CONSOLE_CMD}
            </code>
            <button onClick={copy}
              className="absolute top-2 right-2 text-[10px] bg-gray-700 hover:bg-gray-600 text-gray-300 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>

          <p className="text-[10px] text-gray-500">
            This runs only in your browser — it reads visible links on the page and copies them.
            No data is sent anywhere. Repeat for each results page (use Next Page button on GeM).
          </p>
        </div>
      )}
    </div>
  )
}

// ─── URL FETCH tab ────────────────────────────────────────────────────────────

function UrlFetchMode({ onSaved }: { onSaved: (n: number) => void }) {
  const [urlText, setUrlText] = useState("")
  const [fetching, setFetching] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)
  const [result, setResult] = useState<FetchResult | null>(null)
  const [error, setError] = useState("")

  const urlCount = urlText.trim().split("\n").filter(l => l.trim() && (l.includes("getSinglePacketResultView") || /^\d{5,}$/.test(l.trim()))).length

  const handleFetch = useCallback(async () => {
    const lines = urlText.trim().split("\n").map(l => l.trim()).filter(Boolean)
    if (!lines.length) return

    setFetching(true)
    setError("")
    setResult(null)
    setProgress(`Fetching ${lines.length} pages…`)

    try {
      const res = await fetch("/api/admin/procurement/batch-fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: lines }),
      }).then(r => r.json())

      if (res.error) { setError(res.error); return }
      setResult(res)
      setProgress(null)
      if (res.created + res.updated > 0) {
        onSaved(res.created + res.updated)
        setUrlText("")
      }
    } catch {
      setError("Network error")
    } finally {
      setFetching(false)
      setProgress(null)
    }
  }, [urlText, onSaved])

  return (
    <div className="space-y-4">
      <ConsoleHelper />

      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-700 block">
          Paste getSinglePacketResultView URLs (one per line)
        </label>
        <textarea
          value={urlText}
          onChange={e => { setUrlText(e.target.value); setResult(null) }}
          placeholder={"https://bidplus.gem.gov.in/bidding/bid/getSinglePacketResultView/4083166\nhttps://bidplus.gem.gov.in/bidding/bid/getSinglePacketResultView/4127437\n4234567\n…"}
          className="w-full h-36 text-[11px] font-mono border border-gray-200 rounded-lg p-3 resize-y text-gray-700 focus:outline-none focus:border-brand-400"
        />
        <div className="flex items-center gap-3">
          <button
            onClick={handleFetch}
            disabled={fetching || urlCount === 0}
            className="flex items-center gap-2 text-sm bg-brand-600 text-white px-5 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-40 font-medium"
          >
            {fetching
              ? <><Loader2 size={13} className="animate-spin" />{progress || "Fetching…"}</>
              : <><Zap size={13} />Fetch {urlCount > 0 ? urlCount : ""} bids from GeM</>}
          </button>
          {urlText && !fetching && (
            <button onClick={() => { setUrlText(""); setResult(null) }} className="text-xs text-gray-400 hover:text-gray-600">Clear</button>
          )}
          {urlCount > 0 && <span className="text-xs text-gray-400">{urlCount} URL{urlCount > 1 ? "s" : ""} detected</span>}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex gap-2 text-xs text-red-700">
          <AlertCircle size={13} className="shrink-0 mt-0.5 text-red-500" />
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-3">
          {/* Summary */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={15} className="text-green-600" />
              <span className="text-sm font-semibold text-green-800">
                {result.created + result.updated} bids saved
              </span>
              <span className="text-xs text-green-600">({result.created} new · {result.updated} updated)</span>
            </div>
            {result.new_dealers.length > 0 && (
              <div className="flex items-start gap-2">
                <Users size={12} className="text-blue-500 shrink-0 mt-0.5" />
                <div className="text-xs text-green-700">
                  <span className="font-semibold">{result.new_dealers.length} new dealer{result.new_dealers.length > 1 ? "s" : ""} auto-created:</span>
                  <span className="ml-1 text-green-600">{result.new_dealers.join(" · ")}</span>
                </div>
              </div>
            )}
            {result.errors.length > 0 && (
              <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                {result.errors.length} fetch error{result.errors.length > 1 ? "s" : ""}: {result.errors.slice(0,3).join(" | ")}
              </div>
            )}
          </div>

          {/* Bid list */}
          {result.bids.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-100 text-xs text-gray-500 font-medium">
                Fetched bids
              </div>
              <div className="overflow-x-auto max-h-60">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      {["Bid Number","Status","State","L1 Winner"].map(h => (
                        <th key={h} className="text-left px-3 py-2 text-gray-400 font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {result.bids.map(b => (
                      <tr key={b.bid_number} className="hover:bg-gray-50/50">
                        <td className="px-3 py-2 font-mono text-[10px] text-brand-600">{b.bid_number}</td>
                        <td className="px-3 py-2">
                          <span className="flex items-center gap-1">
                            <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[b.status] || "bg-gray-300"}`} />
                            <span className="text-gray-600">{b.status.replace(/_/g," ")}</span>
                          </span>
                        </td>
                        <td className="px-3 py-2 text-gray-600">{b.state || "—"}</td>
                        <td className="px-3 py-2 text-gray-700 max-w-[180px] truncate" title={b.l1}>{b.l1 || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── TEXT PASTE tab ───────────────────────────────────────────────────────────

function TextPasteMode({ onSaved }: { onSaved: (n: number) => void }) {
  const [text, setText] = useState("")
  const [parsing, setParsing] = useState(false)
  const [preview, setPreview] = useState<ParseResult | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<{ created: number; updated: number; new_dealers: string[] } | null>(null)
  const [error, setError] = useState("")

  const handleParse = useCallback(async () => {
    if (!text.trim()) return
    setParsing(true); setError(""); setPreview(null); setSaved(null)
    try {
      const res = await fetch("/api/admin/procurement/batch-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      }).then(r => r.json())
      if (res.error) { setError(res.error); return }
      setPreview(res)
    } catch { setError("Parse failed") }
    finally { setParsing(false) }
  }, [text])

  const handleSaveAll = useCallback(async () => {
    if (!text.trim()) return
    setSaving(true); setError("")
    try {
      const res = await fetch("/api/admin/procurement/batch-parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, save: true }),
      }).then(r => r.json())
      if (res.error) { setError(res.error); return }
      setSaved({ created: res.created, updated: res.updated, new_dealers: res.new_dealers || [] })
      onSaved(res.created + res.updated)
      setText("")
      setPreview(null)
    } catch { setError("Save failed") }
    finally { setSaving(false) }
  }, [text, onSaved])

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700 space-y-1">
        <p className="font-semibold">Stage 1 — Bid stub creation</p>
        <p>Copy the full rendered GeM result page (Ctrl+A → Ctrl+C from any GeM search/result page). Paste below. All bid numbers found will become records. L1/L2/L3 data extracted where visible in the page text.</p>
      </div>

      <div className="space-y-2">
        <textarea
          value={text}
          onChange={e => { setText(e.target.value); setPreview(null); setSaved(null) }}
          placeholder={"Paste the full text from any GeM bid list or result page here…\n\nExpected to contain bid numbers like GEM/2025/B/6842354"}
          className="w-full h-40 text-[11px] font-mono border border-gray-200 rounded-lg p-3 resize-y text-gray-700 focus:outline-none focus:border-brand-400"
        />
        <div className="flex gap-2">
          <button onClick={handleParse} disabled={parsing || !text.trim()}
            className="flex items-center gap-1.5 text-xs bg-gray-700 text-white px-4 py-1.5 rounded-lg hover:bg-gray-900 disabled:opacity-40">
            {parsing ? <><Loader2 size={11} className="animate-spin" />Parsing…</> : <><ClipboardPaste size={11} />Parse & preview</>}
          </button>
          {text && <button onClick={() => { setText(""); setPreview(null); setSaved(null) }} className="text-xs text-gray-400 hover:text-gray-600">Clear</button>}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 flex gap-2">
          <AlertCircle size={13} className="shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {saved && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex gap-2">
          <CheckCircle2 size={14} className="text-green-600 shrink-0 mt-0.5" />
          <div className="text-xs text-green-800">
            <span className="font-semibold">{saved.created + saved.updated} bids saved</span>
            <span className="text-green-600 ml-1">({saved.created} new · {saved.updated} updated)</span>
            {saved.new_dealers.length > 0 && (
              <span className="ml-2 text-blue-600">{saved.new_dealers.length} new dealer stubs created</span>
            )}
          </div>
        </div>
      )}

      {preview && preview.bids.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600 font-medium">{preview.bids.length} bids found in pasted text</span>
            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="flex items-center gap-1.5 text-xs bg-brand-600 text-white px-4 py-1.5 rounded-lg hover:bg-brand-700 disabled:opacity-40 font-medium"
            >
              {saving ? <><Loader2 size={11} className="animate-spin" />Saving…</> : <><Zap size={11} />Save all {preview.bids.length} bids</>}
            </button>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto max-h-72">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 sticky top-0">
                    {["Bid Number","Dept","State","Cat","Qty","Value","Status","L1"].map(h => (
                      <th key={h} className="text-left px-2.5 py-2 text-gray-400 font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {preview.bids.map(b => (
                    <tr key={b.bid_number} className="hover:bg-gray-50/50">
                      <td className="px-2.5 py-2 font-mono text-[10px] text-brand-600 whitespace-nowrap">{b.bid_number}</td>
                      <td className="px-2.5 py-2 text-gray-600 max-w-[120px] truncate" title={b.department_name}>{b.department_name || "—"}</td>
                      <td className="px-2.5 py-2 text-gray-600 whitespace-nowrap">{b.state || "—"}</td>
                      <td className="px-2.5 py-2 text-gray-500 whitespace-nowrap">{b.product_category?.replace(/_/g," ")}</td>
                      <td className="px-2.5 py-2 text-gray-500 text-right">{b.quantity ?? "—"}</td>
                      <td className="px-2.5 py-2 text-gray-700 whitespace-nowrap">{fmtCr(b.estimated_value_inr)}</td>
                      <td className="px-2.5 py-2 whitespace-nowrap">
                        <span className="flex items-center gap-1">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[b.current_status] || "bg-gray-300"}`} />
                          <span className="text-gray-500">{b.current_status.replace(/_/g," ")}</span>
                        </span>
                      </td>
                      <td className="px-2.5 py-2 text-gray-600 max-w-[140px] truncate" title={b.l1_dealer_name}>{b.l1_dealer_name || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {preview && preview.bids.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 flex gap-2">
          <AlertCircle size={13} className="shrink-0 mt-0.5 text-amber-500" />
          No bid numbers found. Make sure the pasted text contains GeM bid numbers in GEM/YYYY/X/NNNNN format.
        </div>
      )}
    </div>
  )
}

// ─── Harvester Status Panel ───────────────────────────────────────────────────

interface HarvesterState {
  last_scanned_id: number
  total_scanned: number
  total_fogging_found: number
  last_run_at: string | null
  last_run_scanned: number
  last_run_found: number
  new_dealers_last_run: string[]
  running: boolean
}

function HarvesterStatus({ onRefreshed }: { onRefreshed: () => void }) {
  const [state, setState] = useState<HarvesterState | null>(null)
  const [totalBids, setTotalBids] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [lastResult, setLastResult] = useState<{ found: number; saved: number; range: string } | null>(null)

  const loadStatus = useCallback(async () => {
    const res = await fetch("/api/admin/procurement/harvest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "status" }),
    }).then(r => r.json()).catch(() => null)
    if (res?.state) { setState(res.state); setTotalBids(res.totalBids) }
    setLoading(false)
  }, [])

  useEffect(() => { loadStatus() }, [loadStatus])

  const handleRunNow = async () => {
    setRunning(true); setLastResult(null)
    const res = await fetch("/api/admin/procurement/harvest").then(r => r.json()).catch(() => null)
    setRunning(false)
    if (res) {
      setLastResult({ found: res.fogging_found || 0, saved: res.saved || 0, range: res.id_range || "" })
      await loadStatus()
      onRefreshed()
    }
  }

  if (loading) return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center gap-2 text-xs text-gray-400">
      <Loader2 size={12} className="animate-spin" />Loading harvester status…
    </div>
  )

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot size={14} className="text-brand-600" />
          <span className="text-xs font-semibold text-gray-800">Autonomous Harvester</span>
          <span className="text-[10px] text-gray-400">— daily cron, 06:00 IST</span>
        </div>
        <button onClick={handleRunNow} disabled={running || state?.running}
          className="flex items-center gap-1.5 text-xs bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 disabled:opacity-40">
          {running ? <><Loader2 size={11} className="animate-spin" />Running…</> : <><Play size={11} />Run now</>}
        </button>
      </div>

      <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Bids in DB", value: totalBids?.toLocaleString() ?? "—", icon: Database, color: "text-brand-600" },
          { label: "Total IDs Scanned", value: state?.total_scanned?.toLocaleString() ?? "—", icon: RefreshCw, color: "text-gray-600" },
          { label: "Fogging Found (lifetime)", value: state?.total_fogging_found?.toLocaleString() ?? "—", icon: Zap, color: "text-green-600" },
          { label: "Last Run", value: state?.last_run_at ? new Date(state.last_run_at).toLocaleDateString("en-IN", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" }) : "Never", icon: Clock, color: "text-gray-500" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label}>
            <div className="flex items-center gap-1 mb-1">
              <Icon size={11} className={color} />
              <span className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</span>
            </div>
            <p className={`text-lg font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {state && (
        <div className="px-5 pb-4 text-[11px] text-gray-500 space-y-1">
          <p>Current scan position: ID <span className="font-mono text-gray-700">{state.last_scanned_id?.toLocaleString()}</span></p>
          <p>Last run: {state.last_run_scanned} IDs scanned · {state.last_run_found} fogging bids found</p>
          {state.new_dealers_last_run?.length > 0 && (
            <p className="text-blue-600">{state.new_dealers_last_run.length} new dealers: {state.new_dealers_last_run.slice(0,3).join(", ")}{state.new_dealers_last_run.length > 3 ? ` +${state.new_dealers_last_run.length-3} more` : ""}</p>
          )}
        </div>
      )}

      {lastResult && (
        <div className="mx-5 mb-4 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-800">
          Run complete — Scanned: {lastResult.range} · Found: {lastResult.found} fogging bids · Saved: {lastResult.saved}
        </div>
      )}

      <div className="px-5 pb-4 pt-2 border-t border-gray-50 text-[10px] text-gray-400 space-y-0.5">
        <p className="font-medium text-gray-500">For bulk historical backfill (2025-present):</p>
        <code className="block bg-gray-50 rounded px-2 py-1 text-gray-600 font-mono text-[10px]">
          node scripts/gem-harvest.js --from=8500000 --to=9500000 --max-bids=500
        </code>
        <p>Scans ~1M IDs, finds ~400-700 fogging bids in 3-6 hrs unattended.</p>
      </div>
    </div>
  )
}

// ─── Main BatchTab component ──────────────────────────────────────────────────

export function BatchTab({ onSaved }: { onSaved: () => void }) {
  const [mode, setMode] = useState<"url" | "text">("url")
  const [sessionCount, setSessionCount] = useState(0)

  const handleSaved = useCallback((n: number) => {
    setSessionCount(c => c + n)
    onSaved()
  }, [onSaved])

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Harvester status always shown at top */}
      <HarvesterStatus onRefreshed={onSaved} />
      {/* Session counter */}
      {sessionCount > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 flex items-center gap-2">
          <CheckCircle2 size={13} className="text-green-600" />
          <span className="text-xs text-green-800 font-medium">{sessionCount} bids saved this session</span>
        </div>
      )}

      {/* Header */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-1">Batch Data Acquisition</h3>
        <p className="text-xs text-gray-400">Collect 20+ bids in one operation. Choose your method below.</p>
      </div>

      {/* Mode selector */}
      <div className="flex gap-2">
        <button onClick={() => setMode("url")}
          className={`flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg font-medium border transition-colors ${
            mode === "url" ? "bg-brand-600 text-white border-brand-600" : "text-gray-600 border-gray-200 hover:border-brand-400"
          }`}>
          <Link2 size={12} />
          URL Fetch — Full data incl. L1/L2/L3
        </button>
        <button onClick={() => setMode("text")}
          className={`flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg font-medium border transition-colors ${
            mode === "text" ? "bg-brand-600 text-white border-brand-600" : "text-gray-600 border-gray-200 hover:border-brand-400"
          }`}>
          <ClipboardPaste size={12} />
          Text Paste — Bid stubs, no L1
        </button>
      </div>

      {/* Effort comparison */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "URL Fetch (this mode)", effort: "~5 sec/bid", detail: "Full L1/L2/L3 data. Requires console command to get URLs.", color: "border-green-200 bg-green-50", textColor: "text-green-700" },
          { label: "Text Paste (this mode)", effort: "~0.3 sec/bid", detail: "Bid stubs only. No L1 data. Good for capturing active bids.", color: "border-blue-200 bg-blue-50", textColor: "text-blue-700" },
        ].map(c => (
          <div key={c.label} className={`rounded-xl border p-3 ${c.color}`}>
            <p className={`text-xs font-semibold ${c.textColor} mb-0.5`}>{c.label}</p>
            <p className={`text-lg font-bold ${c.textColor}`}>{c.effort}</p>
            <p className={`text-[10px] ${c.textColor} opacity-75 mt-0.5`}>{c.detail}</p>
          </div>
        ))}
      </div>

      {mode === "url"  && <UrlFetchMode  onSaved={handleSaved} />}
      {mode === "text" && <TextPasteMode onSaved={handleSaved} />}
    </div>
  )
}
