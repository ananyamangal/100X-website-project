"use client"
import { useEffect, useState, useCallback } from "react"
import {
  Settings2, Play, Pause, Power, RotateCw, CheckCircle2, AlertCircle,
  Clock, Zap, List, ChevronDown, ChevronRight, Terminal, RefreshCw,
  Activity, Calendar, AlertTriangle,
} from "lucide-react"
import type { Automation } from "@/lib/growth-os/types"

// ── Types ──────────────────────────────────────────────────────────────────────
interface ExecutionLog {
  _id:         string
  ts:          string
  agent:       string
  action:      string
  module:      string
  level:       "info" | "warn" | "error"
  executionId?: string
  durationMs?:  number
  created?:     string[]
  rowCount?:    number
  format?:      string
  preset?:      string
  error?:       string
  reason?:      string
}

interface SnapshotResult {
  ok:          boolean
  executionId: string
  date:        string
  created:     string[]
  durationMs:  number
}

// ── Sprint 2 job catalog ───────────────────────────────────────────────────────
const SPRINT2_JOBS = [
  { id: "daily-snapshot",       name: "Daily Snapshot Engine",       schedule: "02:00 IST", module: "snapshots",    riskLevel: "low",    description: "Creates procurement, competitor, and market snapshots for trend history." },
  { id: "competitor-crawl",     name: "Daily Competitor Crawl",      schedule: "02:00 IST", module: "competitors",  riskLevel: "medium", description: "HTTP-based crawl of competitor websites for title, meta, and page change detection." },
  { id: "procurement-sync",     name: "Daily Procurement Sync",      schedule: "02:30 IST", module: "procurement",  riskLevel: "low",    description: "Refreshes fogging_contracts stats and enriches new GeM contracts." },
  { id: "ai-visibility-scan",   name: "Daily AI Visibility Scan",    schedule: "03:30 IST", module: "competitors",  riskLevel: "low",    description: "Checks which competitors appear in ChatGPT, Gemini, Claude, Perplexity." },
  { id: "keyword-gap-refresh",  name: "Daily Keyword Gap Refresh",   schedule: "04:00 IST", module: "seo",          riskLevel: "low",    description: "Refreshes keyword opportunity gap analysis against top GSC queries." },
  { id: "founder-brief",        name: "Daily Founder Brief",         schedule: "05:30 IST", module: "market",       riskLevel: "low",    description: "Generates the morning intelligence brief with top priorities for the founder." },
]

// ── Helpers ────────────────────────────────────────────────────────────────────
const RISK_COLOR: Record<string, string> = {
  low:    "bg-emerald-100 text-emerald-700",
  medium: "bg-amber-100 text-amber-700",
  high:   "bg-red-100 text-red-700",
}
const STATUS_COLOR: Record<string, string> = {
  active:   "bg-emerald-100 text-emerald-700",
  paused:   "bg-amber-100 text-amber-700",
  disabled: "bg-gray-100 text-gray-500",
  pending:  "bg-blue-100 text-blue-700",
}
const STATUS_ICON: Record<string, React.ElementType> = {
  active: CheckCircle2, paused: Clock, disabled: Power, pending: AlertCircle,
}
const LEVEL_COLOR: Record<string, string> = {
  info:  "text-blue-600",
  warn:  "text-amber-600",
  error: "text-red-600",
}

function Pill({ children, color = "bg-gray-100 text-gray-500" }: { children: React.ReactNode; color?: string }) {
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${color}`}>{children}</span>
}

function fmtTs(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" })
  } catch { return iso }
}

function timeAgo(iso: string | null) {
  if (!iso) return "Never"
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (d < 60) return `${d}s ago`
  if (d < 3600) return `${Math.floor(d / 60)}m ago`
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`
  return `${Math.floor(d / 86400)}d ago`
}

// ── Execution Log Row ──────────────────────────────────────────────────────────
function LogRow({ log }: { log: ExecutionLog }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-gray-50 transition-colors text-[11px]" onClick={() => setOpen(v => !v)}>
        <span className={`font-mono font-bold w-8 ${LEVEL_COLOR[log.level] ?? "text-gray-500"}`}>{log.level?.toUpperCase().slice(0,3)}</span>
        <span className="text-gray-400 w-28 shrink-0">{fmtTs(log.ts)}</span>
        <span className="text-gray-500 w-24 shrink-0 truncate">{log.agent}</span>
        <span className="text-gray-700 flex-1 truncate">{log.action.replace(/_/g, " ")}</span>
        {log.durationMs !== undefined && (
          <span className="text-gray-400 w-16 text-right shrink-0">{log.durationMs}ms</span>
        )}
        {open ? <ChevronDown size={11} className="text-gray-300 shrink-0" /> : <ChevronRight size={11} className="text-gray-300 shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-3 bg-gray-50 text-[11px] border-t border-gray-100 space-y-1">
          {log.executionId && <p><span className="text-gray-400">Execution ID:</span> <span className="font-mono text-gray-600">{log.executionId}</span></p>}
          {log.module && <p><span className="text-gray-400">Module:</span> <span className="text-gray-600">{log.module}</span></p>}
          {log.rowCount !== undefined && <p><span className="text-gray-400">Records:</span> <span className="text-gray-600">{log.rowCount.toLocaleString()}</span></p>}
          {log.created && log.created.length > 0 && <p><span className="text-gray-400">Created:</span> <span className="text-gray-600">{log.created.join(", ")}</span></p>}
          {log.format && <p><span className="text-gray-400">Format:</span> <span className="text-gray-600">{log.format}</span></p>}
          {log.preset && <p><span className="text-gray-400">Preset:</span> <span className="text-gray-600">{log.preset}</span></p>}
          {log.error && <p><span className="text-red-400">Error:</span> <span className="text-red-600">{log.error}</span></p>}
          {log.reason && <p><span className="text-gray-400">Reason:</span> <span className="text-gray-600">{log.reason}</span></p>}
        </div>
      )}
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function AutomationCenter() {
  const [agents,         setAgents]         = useState<Automation[]>([])
  const [loading,        setLoading]        = useState(true)
  const [running,        setRunning]        = useState<string | null>(null)
  const [lastRunResult,  setLastRunResult]  = useState<{ id: string; result: string; ok?: boolean } | null>(null)
  const [logs,           setLogs]           = useState<ExecutionLog[]>([])
  const [logsLoading,    setLogsLoading]    = useState(true)
  const [logsPage,       setLogsPage]       = useState(0)
  const [logsFilter,     setLogsFilter]     = useState<"all" | "info" | "warn" | "error">("all")
  const [activeTab,      setActiveTab]      = useState<"agents" | "sprint2" | "logs">("agents")
  const [expandedAgent,  setExpandedAgent]  = useState<string | null>(null)

  const loadAgents = useCallback(() => {
    setLoading(true)
    fetch("/api/admin/growth/automation")
      .then(r => r.json())
      .then(d => { setAgents(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const loadLogs = useCallback(() => {
    setLogsLoading(true)
    fetch("/api/admin/growth/logs?limit=200&sort=desc")
      .then(r => r.json())
      .then(d => { setLogs(Array.isArray(d.logs) ? d.logs : []); setLogsLoading(false) })
      .catch(() => setLogsLoading(false))
  }, [])

  useEffect(() => { loadAgents(); loadLogs() }, [loadAgents, loadLogs])

  const setStatus = async (id: string, status: string) => {
    await fetch("/api/admin/growth/automation", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) })
    setAgents(prev => prev.map(a => a._id === id ? { ...a, status: status as Automation["status"] } : a))
  }

  const runNow = async (id: string) => {
    setRunning(id)
    try {
      const r = await fetch("/api/admin/growth/automation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) })
      const d = await r.json()
      if (d.notImplemented) {
        setLastRunResult({ id, result: `⚠️ ${d.result}`, ok: false })
      } else {
        setLastRunResult({ id, result: d.result || "Run completed", ok: true })
      }
      loadAgents()
      loadLogs()
    } finally {
      setRunning(null)
    }
  }

  const runSnapshot = async (module: string) => {
    const id = `snapshot-${module}`
    setRunning(id)
    try {
      const r  = await fetch("/api/admin/growth/snapshots", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ module, force: true }) })
      const d  = await r.json() as SnapshotResult
      setLastRunResult({ id, result: d.ok ? `Snapshot created: ${d.created?.join(", ") ?? module} (${d.durationMs}ms)` : `Failed: ${String(d)}`, ok: d.ok })
      loadLogs()
    } finally {
      setRunning(null)
    }
  }

  const runCrawl = async () => {
    setRunning("competitor-crawl")
    try {
      const r  = await fetch("/api/admin/growth/competitors/crawl", { method: "POST" })
      const d  = await r.json()
      setLastRunResult({ id: "competitor-crawl", result: d.summary ?? JSON.stringify(d), ok: d.ok !== false })
      loadLogs()
    } finally {
      setRunning(null)
    }
  }

  const activeCount  = agents.filter(a => a.status === "active").length
  const pausedCount  = agents.filter(a => a.status === "paused").length
  const filteredLogs = logs.filter(l => logsFilter === "all" || l.level === logsFilter)
  const PAGE_SIZE    = 20
  const pagedLogs    = filteredLogs.slice(logsPage * PAGE_SIZE, (logsPage + 1) * PAGE_SIZE)
  const totalPages   = Math.ceil(filteredLogs.length / PAGE_SIZE)

  const TABS = [
    { id: "agents",  label: "Agents",     icon: Settings2,  count: agents.length },
    { id: "sprint2", label: "Sprint 2",   icon: Zap,        count: SPRINT2_JOBS.length },
    { id: "logs",    label: "Exec Logs",  icon: Terminal,   count: logs.length },
  ] as const

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      <div className="bg-white border-b border-gray-200 px-8 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Settings2 size={18} className="text-brand-600" />
            <div>
              <h1 className="text-base font-bold text-gray-900">Automation Center</h1>
              <p className="text-gray-400 text-[11px]">Growth OS agents — schedules, execution logs, live runs</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full">{activeCount} active</span>
            <span className="text-[11px] text-amber-600 font-semibold bg-amber-50 px-2.5 py-1 rounded-full">{pausedCount} paused</span>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mt-3">
          {TABS.map(({ id, label, icon: Icon, count }) => (
            <button key={id} onClick={() => setActiveTab(id as typeof activeTab)}
              className={`flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === id ? "bg-brand-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>
              <Icon size={11} />
              {label}
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${activeTab === id ? "bg-white/20 text-white" : "bg-gray-200 text-gray-500"}`}>{count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-8 py-6 max-w-[1400px] space-y-4">
        {/* Approval note */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex gap-2">
          <Zap size={13} className="text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-blue-700 text-[11px]">
            <strong>Approval workflow active.</strong> Low-risk agents run automatically. High-risk agents require manual approval. Snapshots are safe and can be force-created anytime.
          </p>
        </div>

        {/* Run result feedback */}
        {lastRunResult && (
          <div className={`border rounded-xl p-3 flex items-start gap-3 ${lastRunResult.ok !== false ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`}>
            <CheckCircle2 size={13} className={lastRunResult.ok !== false ? "text-emerald-500" : "text-amber-500"} />
            <div className="flex-1">
              <p className={`text-[11px] font-semibold mb-0.5 ${lastRunResult.ok !== false ? "text-emerald-800" : "text-amber-800"}`}>Run complete</p>
              <p className={`text-[11px] ${lastRunResult.ok !== false ? "text-emerald-700" : "text-amber-700"}`}>{lastRunResult.result}</p>
            </div>
            <button onClick={() => setLastRunResult(null)} className="text-gray-400 hover:text-gray-600 text-xs">✕</button>
          </div>
        )}

        {/* ── TAB: AGENTS ── */}
        {activeTab === "agents" && (
          loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              {agents.map(agent => {
                const StatusIcon = STATUS_ICON[agent.status] || Clock
                const isOpen = expandedAgent === agent._id
                return (
                  <div key={agent._id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <button className="w-full px-5 py-4 flex items-start gap-4 text-left" onClick={() => setExpandedAgent(isOpen ? null : agent._id!)}>
                      <StatusIcon size={14} className={agent.status === "active" ? "text-emerald-500 mt-0.5" : "text-gray-400 mt-0.5"} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="text-sm font-semibold text-gray-800">{agent.name}</h3>
                          <Pill color={STATUS_COLOR[agent.status]}>{agent.status}</Pill>
                          <Pill color={RISK_COLOR[agent.riskLevel]}>{agent.riskLevel} risk</Pill>
                          <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{agent.module}</span>
                        </div>
                        <p className="text-[11px] text-gray-500 mb-0">{agent.description}</p>
                        {!isOpen && (
                          <div className="flex items-center gap-4 mt-1.5 text-[10px] text-gray-400">
                            <span><Calendar size={9} className="inline mr-1" />{agent.schedule}</span>
                            <span><Activity size={9} className="inline mr-1" />{agent.runCount || 0} runs</span>
                            <span><Clock size={9} className="inline mr-1" />{timeAgo(agent.lastRun ?? null)}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={e => { e.stopPropagation(); runNow(agent._id!) }}
                          disabled={running === agent._id}
                          className="flex items-center gap-1 text-[11px] font-medium bg-brand-600 text-white px-2.5 py-1.5 rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
                        >
                          {running === agent._id ? <RotateCw size={10} className="animate-spin" /> : <Play size={10} />}
                          Run
                        </button>
                        {agent.status === "active" ? (
                          <button onClick={e => { e.stopPropagation(); setStatus(agent._id!, "paused") }} className="flex items-center gap-1 text-[11px] border border-amber-300 text-amber-600 px-2.5 py-1.5 rounded-lg hover:bg-amber-50 transition-colors">
                            <Pause size={10} /> Pause
                          </button>
                        ) : agent.status === "paused" ? (
                          <button onClick={e => { e.stopPropagation(); setStatus(agent._id!, "active") }} className="flex items-center gap-1 text-[11px] border border-emerald-300 text-emerald-600 px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors">
                            <Play size={10} /> Resume
                          </button>
                        ) : null}
                        {isOpen ? <ChevronDown size={13} className="text-gray-300" /> : <ChevronRight size={13} className="text-gray-300" />}
                      </div>
                    </button>

                    {isOpen && (
                      <div className="border-t border-gray-100 bg-gray-50 px-5 py-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[11px] mb-3">
                          <div><p className="text-gray-400 mb-0.5">Schedule</p><p className="font-semibold text-gray-700">{agent.schedule}</p></div>
                          <div><p className="text-gray-400 mb-0.5">Last Run</p><p className="font-semibold text-gray-700">{agent.lastRun ? fmtTs(agent.lastRun) : "Never"}</p></div>
                          <div><p className="text-gray-400 mb-0.5">Run Count</p><p className="font-semibold text-gray-700">{agent.runCount || 0}</p></div>
                          <div><p className="text-gray-400 mb-0.5">Success Rate</p><p className="font-semibold text-gray-700">{agent.successRate !== undefined ? `${agent.successRate}%` : "—"}</p></div>
                        </div>
                        {agent.lastResult && (
                          <p className="text-[11px] text-gray-600 bg-white rounded-lg px-3 py-2 border border-gray-100">
                            Last result: {agent.lastResult}
                          </p>
                        )}
                        <div className="flex gap-2 mt-3">
                          <button onClick={() => setStatus(agent._id!, "disabled")} className="flex items-center gap-1 text-[10px] border border-gray-200 text-gray-400 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                            <Power size={10} /> Disable
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        )}

        {/* ── TAB: SPRINT 2 JOBS ── */}
        {activeTab === "sprint2" && (
          <div className="space-y-3">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2">
              <AlertTriangle size={13} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-amber-700 text-[11px]">
                <strong>Sprint 2 jobs.</strong> These jobs run via "Run Now" buttons below. Automated scheduling at the listed IST times requires a cron endpoint (can be set up via Vercel or a cron service). Snapshots are live — competitor crawl and keyword jobs are coming in Sprint 3.
              </p>
            </div>

            {SPRINT2_JOBS.map(job => {
              const isSnap = job.id.includes("snapshot") || job.module === "snapshots" || job.module === "procurement" || job.module === "market"
              const isCrawl = job.id === "competitor-crawl"
              return (
                <div key={job.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-sm font-semibold text-gray-800">{job.name}</h3>
                        <Pill color={RISK_COLOR[job.riskLevel]}>{job.riskLevel} risk</Pill>
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{job.module}</span>
                      </div>
                      <p className="text-[11px] text-gray-500 mb-2">{job.description}</p>
                      <span className="text-[10px] text-gray-400 flex items-center gap-1">
                        <Calendar size={9} />Scheduled {job.schedule} daily (set up Vercel cron to activate)
                      </span>
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      {isSnap && (
                        <button
                          onClick={() => runSnapshot(job.module === "market" ? "market" : job.module === "procurement" ? "procurement" : "all")}
                          disabled={running === `snapshot-${job.module}` || running === "snapshot-all"}
                          className="flex items-center gap-1 text-[11px] font-medium bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
                        >
                          {running?.startsWith("snapshot") ? <RotateCw size={10} className="animate-spin" /> : <Play size={10} />}
                          Run Now
                        </button>
                      )}
                      {isCrawl && (
                        <button
                          onClick={runCrawl}
                          disabled={running === "competitor-crawl"}
                          className="flex items-center gap-1 text-[11px] font-medium bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
                        >
                          {running === "competitor-crawl" ? <RotateCw size={10} className="animate-spin" /> : <Play size={10} />}
                          Crawl Now
                        </button>
                      )}
                      {!isSnap && !isCrawl && (
                        <span className="text-[10px] text-gray-400 px-3 py-1.5 border border-gray-100 rounded-lg">Coming Sprint 3</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Quick snapshot panel */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">Quick Snapshot</h3>
              <p className="text-[11px] text-gray-500 mb-3">Create a snapshot for a specific module now. Safe to run anytime — overwrites today&apos;s existing snapshot.</p>
              <div className="flex flex-wrap gap-2">
                {(["all", "procurement", "competitors", "market"] as const).map(mod => (
                  <button key={mod} onClick={() => runSnapshot(mod)}
                    disabled={running?.startsWith("snapshot")}
                    className="flex items-center gap-1.5 text-[11px] font-medium border border-brand-200 text-brand-600 px-3 py-1.5 rounded-lg hover:bg-brand-50 disabled:opacity-50 transition-colors capitalize">
                    {running === `snapshot-${mod}` ? <RotateCw size={10} className="animate-spin" /> : <RefreshCw size={10} />}
                    {mod}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB: EXECUTION LOGS ── */}
        {activeTab === "logs" && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Log toolbar */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
              <Terminal size={13} className="text-gray-400" />
              <span className="text-xs font-semibold text-gray-700">Execution Logs</span>
              <span className="text-[10px] text-gray-400">{filteredLogs.length.toLocaleString()} entries</span>
              <div className="flex gap-1 ml-auto">
                {(["all", "info", "warn", "error"] as const).map(f => (
                  <button key={f} onClick={() => { setLogsFilter(f); setLogsPage(0) }}
                    className={`text-[10px] font-semibold px-2 py-1 rounded-lg transition-colors ${logsFilter === f ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                    {f.toUpperCase()}
                  </button>
                ))}
                <button onClick={loadLogs} disabled={logsLoading} className="ml-2 text-[10px] text-gray-400 hover:text-gray-700 border border-gray-200 px-2 py-1 rounded-lg flex items-center gap-1 disabled:opacity-50">
                  <RefreshCw size={9} className={logsLoading ? "animate-spin" : ""} /> Refresh
                </button>
              </div>
            </div>

            {/* Column header */}
            <div className="flex items-center gap-3 px-4 py-1.5 bg-gray-50 border-b border-gray-100 text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
              <span className="w-8">Lvl</span>
              <span className="w-28">Time (IST)</span>
              <span className="w-24">Agent</span>
              <span className="flex-1">Action</span>
              <span className="w-16 text-right">Duration</span>
              <span className="w-4" />
            </div>

            {logsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">No logs found</div>
            ) : (
              <>
                {pagedLogs.map(log => <LogRow key={log._id} log={log} />)}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
                    <button onClick={() => setLogsPage(p => Math.max(0, p - 1))} disabled={logsPage === 0}
                      className="text-[10px] text-gray-500 hover:text-gray-700 disabled:opacity-40 px-3 py-1 border border-gray-200 rounded-lg">← Prev</button>
                    <span className="text-[10px] text-gray-400">Page {logsPage + 1} of {totalPages}</span>
                    <button onClick={() => setLogsPage(p => Math.min(totalPages - 1, p + 1))} disabled={logsPage >= totalPages - 1}
                      className="text-[10px] text-gray-500 hover:text-gray-700 disabled:opacity-40 px-3 py-1 border border-gray-200 rounded-lg">Next →</button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
