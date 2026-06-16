"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  Activity, CheckCircle2, AlertTriangle, XCircle, HelpCircle,
  Clock, RefreshCw, Calendar, Database, Zap, ChevronRight,
  Cpu, Globe, BarChart3, Flame, Users, Megaphone, Search,
  FileText, TrendingUp, Brain, Wand2, ShoppingBag, ArrowUpRight,
  PlayCircle, Download,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type Status = "active" | "dormant" | "broken" | "unknown"
type TriggerType = "scheduled" | "manual" | "event_driven"
type Category = "daily_cron" | "weekly_cron" | "manual_ai" | "manual_data" | "etl"

interface AutomationEntry {
  id: string
  module: string
  purpose: string
  trigger_type: TriggerType
  category: Category
  schedule?: string
  schedule_label?: string
  expected_interval_hours?: number
  cron_path?: string
  agent_string?: string
  api_path?: string
  output_type: string
  output_collections: string[]
  output_description: string
  founder_url?: string
  founder_visibility: string
  founder_visibility_label: string
  version?: string
  dependencies?: string[]
  // live data
  status: Status
  last_run_at: string | null
  last_run_failed: boolean
  last_run_output?: string
  next_run_at?: string
}

interface Stats {
  total: number; active: number; dormant: number; broken: number; unknown: number
  scheduled: number; manual: number
}

interface UpcomingRun {
  id: string; module: string; next_run_at: string; schedule_label?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<Status, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  active:  { label: "Active",   color: "text-green-700",  bg: "bg-green-50 border-green-200",   icon: <CheckCircle2 size={13} /> },
  dormant: { label: "Dormant",  color: "text-yellow-700", bg: "bg-yellow-50 border-yellow-200", icon: <Clock size={13} /> },
  broken:  { label: "Broken",   color: "text-red-700",    bg: "bg-red-50 border-red-200",       icon: <XCircle size={13} /> },
  unknown: { label: "Unknown",  color: "text-gray-500",   bg: "bg-gray-50 border-gray-200",     icon: <HelpCircle size={13} /> },
}

const TRIGGER_CONFIG: Record<TriggerType, { label: string; color: string }> = {
  scheduled:    { label: "Scheduled",    color: "bg-blue-100 text-blue-700" },
  manual:       { label: "Manual",       color: "bg-purple-100 text-purple-700" },
  event_driven: { label: "Event-Driven", color: "bg-orange-100 text-orange-700" },
}

const CATEGORY_LABEL: Record<Category, string> = {
  daily_cron:  "Daily Cron",
  weekly_cron: "Weekly Cron",
  manual_ai:   "Manual (AI)",
  manual_data: "Manual (Data)",
  etl:         "ETL Pipeline",
}

const MODULE_ICON: Record<string, React.ReactNode> = {
  "Revenue Director":          <TrendingUp size={14} />,
  "Procurement Intelligence":  <ShoppingBag size={14} />,
  "Search Console":            <Globe size={14} />,
  "Dealer Intelligence":       <Users size={14} />,
  "Opportunity Engine":        <Zap size={14} />,
  "Revenue Attribution":       <BarChart3 size={14} />,
  "Google Ads Director":       <Megaphone size={14} />,
  "SEO Command Center":        <Search size={14} />,
  "GEO / AI Search":           <Brain size={14} />,
  "Off-Page SEO":              <FileText size={14} />,
  "SEO Validation":            <CheckCircle2 size={14} />,
  "Competitor Intel":          <Activity size={14} />,
  "Creative Director":         <Wand2 size={14} />,
  "Fogging Intelligence":      <Flame size={14} />,
}

function relativeTime(iso: string | null): string {
  if (!iso) return "Never"
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3_600_000)
  const d = Math.floor(h / 24)
  if (h < 1) return "< 1h ago"
  if (h < 24) return `${h}h ago`
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
}

function relativeTimeAhead(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now()
  const h = Math.floor(diff / 3_600_000)
  const m = Math.floor((diff % 3_600_000) / 60_000)
  if (h <= 0) return "< 1h"
  if (h < 24) return `in ${h}h ${m}m`
  const d = Math.floor(h / 24)
  return `in ${d}d ${h % 24}h`
}

const CATEGORY_ORDER: Category[] = ["daily_cron", "weekly_cron", "manual_ai", "manual_data", "etl"]

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Status }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded border ${cfg.color} ${cfg.bg}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  )
}

// ─── Automation Row ───────────────────────────────────────────────────────────

function AutomationRow({ entry, onTrigger, triggering }: {
  entry: AutomationEntry
  onTrigger: (id: string, apiPath: string) => Promise<void>
  triggering: string | null
}) {
  const [expanded, setExpanded] = useState(false)
  const trigger = TRIGGER_CONFIG[entry.trigger_type]
  const icon = MODULE_ICON[entry.module] || <Cpu size={14} />

  return (
    <>
      <tr
        className="hover:bg-gray-50 cursor-pointer border-b border-gray-100 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Module */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-gray-400">{icon}</span>
            <div>
              <div className="text-sm font-medium text-gray-900">{entry.module}</div>
              <div className="text-xs text-gray-400">{CATEGORY_LABEL[entry.category]}</div>
            </div>
          </div>
        </td>

        {/* Purpose (truncated) */}
        <td className="px-4 py-3 hidden lg:table-cell">
          <div className="text-xs text-gray-600 max-w-xs truncate">{entry.purpose}</div>
        </td>

        {/* Trigger */}
        <td className="px-4 py-3">
          <span className={`px-2 py-0.5 text-xs rounded font-medium ${trigger.color}`}>
            {trigger.label}
          </span>
        </td>

        {/* Schedule / Frequency */}
        <td className="px-4 py-3 hidden sm:table-cell">
          <div className="text-xs text-gray-700">{entry.schedule_label || "On demand"}</div>
          {entry.schedule && (
            <div className="text-xs text-gray-400 font-mono mt-0.5">{entry.schedule}</div>
          )}
        </td>

        {/* Last Run */}
        <td className="px-4 py-3">
          <div className={`text-xs font-medium ${entry.last_run_failed ? "text-red-600" : "text-gray-700"}`}>
            {relativeTime(entry.last_run_at)}
          </div>
          {entry.last_run_output && (
            <div className="text-xs text-gray-400 truncate max-w-[120px]">{entry.last_run_output}</div>
          )}
        </td>

        {/* Output */}
        <td className="px-4 py-3 hidden xl:table-cell">
          <div className="text-xs text-gray-500 capitalize">{entry.output_type}</div>
          <div className="text-xs text-gray-400">{entry.output_collections.length} collection{entry.output_collections.length !== 1 ? "s" : ""}</div>
        </td>

        {/* Founder Visibility */}
        <td className="px-4 py-3 hidden md:table-cell">
          <div className="text-xs text-gray-500">{entry.founder_visibility_label}</div>
        </td>

        {/* Status */}
        <td className="px-4 py-3">
          <StatusBadge status={entry.status} />
        </td>
      </tr>

      {/* Expanded detail row */}
      {expanded && (
        <tr className="bg-gray-50 border-b border-gray-100">
          <td colSpan={8} className="px-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <div className="font-semibold text-gray-700 mb-1">Purpose</div>
                <div className="text-gray-600">{entry.purpose}</div>
                {entry.agent_string && (
                  <div className="mt-2 font-mono text-gray-400">Agent: "{entry.agent_string}"</div>
                )}
              </div>
              <div>
                <div className="font-semibold text-gray-700 mb-1">Output</div>
                <div className="text-gray-600 mb-1">{entry.output_description}</div>
                <div className="flex flex-wrap gap-1">
                  {entry.output_collections.map((c) => (
                    <span key={c} className="px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded font-mono text-[11px]">{c}</span>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {entry.next_run_at && (
                  <div>
                    <div className="font-semibold text-gray-700 mb-1">Next Run</div>
                    <div className="text-gray-600">
                      {relativeTimeAhead(entry.next_run_at)} · {new Date(entry.next_run_at).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" })} IST
                    </div>
                  </div>
                )}
                {entry.dependencies && entry.dependencies.length > 0 && (
                  <div>
                    <div className="font-semibold text-gray-700 mb-1">Dependencies</div>
                    <div className="text-gray-500">{entry.dependencies.join(", ")}</div>
                  </div>
                )}
                <div className="flex gap-2 mt-auto pt-2">
                  {entry.founder_url && (
                    <Link
                      href={entry.founder_url}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 text-gray-700"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ArrowUpRight size={11} />
                      Open
                    </Link>
                  )}
                  {entry.trigger_type !== "scheduled" && entry.api_path && (
                    <button
                      onClick={async (e) => {
                        e.stopPropagation()
                        await onTrigger(entry.id, entry.api_path!)
                      }}
                      disabled={triggering === entry.id}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {triggering === entry.id ? <RefreshCw size={11} className="animate-spin" /> : <PlayCircle size={11} />}
                      Run
                    </button>
                  )}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function OperationsCenterPage() {
  const [entries, setEntries] = useState<AutomationEntry[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [upcoming, setUpcoming] = useState<UpcomingRun[]>([])
  const [failures, setFailures] = useState<AutomationEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [triggering, setTriggering] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<Status | "all">("all")
  const [filterTrigger, setFilterTrigger] = useState<TriggerType | "all">("all")
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/growth/operations")
      const data = await res.json()
      setEntries(data.entries || [])
      setStats(data.stats || null)
      setUpcoming(data.upcoming || [])
      setFailures(data.failures || [])
      setLastRefreshed(new Date().toLocaleTimeString("en-IN"))
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSeed() {
    setSeeding(true)
    try {
      await fetch("/api/admin/growth/operations/seed", { method: "POST" })
      await load()
    } catch (e) {
      setError(String(e))
    } finally {
      setSeeding(false)
    }
  }

  async function handleTrigger(id: string, apiPath: string) {
    setTriggering(id)
    try {
      await fetch(apiPath, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" })
      await load()
    } catch (e) {
      setError(String(e))
    } finally {
      setTriggering(null)
    }
  }

  // Filtering + grouping
  const filtered = entries.filter((e) => {
    if (filterStatus !== "all" && e.status !== filterStatus) return false
    if (filterTrigger !== "all" && e.trigger_type !== filterTrigger) return false
    return true
  })

  const grouped = CATEGORY_ORDER
    .map((cat) => ({ cat, items: filtered.filter((e) => e.category === cat) }))
    .filter(({ items }) => items.length > 0)

  const categoryLabel: Record<string, string> = {
    daily_cron:  "Daily Crons",
    weekly_cron: "Weekly Crons",
    manual_ai:   "Manual — AI Agents",
    manual_data: "Manual — Data Agents",
    etl:         "ETL Pipelines",
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Activity size={22} className="text-gray-700" />
            <h1 className="text-xl font-bold text-gray-900">Operations Center</h1>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            Every automation, bot, and agent across Growth OS
            {lastRefreshed && ` · Last refreshed ${lastRefreshed}`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => load()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            {seeding ? <RefreshCw size={13} className="animate-spin" /> : <Download size={13} />}
            Seed Registry
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700 flex items-start gap-2">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Auto vs Manual summary strip */}
      {stats && (
        <div className="mb-4 p-3 bg-gray-900 rounded-lg flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
            <span className="text-xs text-gray-300">
              <span className="font-bold text-white">{stats.scheduled}</span> run automatically on schedule
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-400 flex-shrink-0" />
            <span className="text-xs text-gray-300">
              <span className="font-bold text-white">{stats.manual}</span> require manual trigger
            </span>
          </div>
          {stats.broken > 0 ? (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 animate-pulse" />
              <span className="text-xs text-red-400 font-semibold">{stats.broken} broken — needs attention</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
              <span className="text-xs text-green-400 font-medium">0 broken</span>
            </div>
          )}
          {upcoming.length > 0 && (
            <div className="ml-auto text-xs text-gray-500">
              Next: <span className="text-gray-300 font-medium">{upcoming[0].module}</span>
              {" "}· {relativeTimeAhead(upcoming[0].next_run_at)}
            </div>
          )}
        </div>
      )}

      {/* KPI strip */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {([
            { label: "Active", value: stats.active, color: "text-green-600", bg: "border-green-200", icon: <CheckCircle2 size={18} className="text-green-500" /> },
            { label: "Dormant", value: stats.dormant, color: "text-yellow-600", bg: "border-yellow-200", icon: <Clock size={18} className="text-yellow-500" /> },
            { label: "Broken", value: stats.broken, color: "text-red-600", bg: "border-red-200", icon: <XCircle size={18} className="text-red-500" /> },
            { label: "Unknown", value: stats.unknown, color: "text-gray-500", bg: "border-gray-200", icon: <HelpCircle size={18} className="text-gray-400" /> },
          ] as const).map(({ label, value, color, bg, icon }) => (
            <div
              key={label}
              className={`bg-white rounded-lg border ${bg} p-4 cursor-pointer hover:shadow-sm transition-shadow`}
              onClick={() => setFilterStatus(filterStatus === label.toLowerCase() as Status ? "all" : label.toLowerCase() as Status)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className={`text-3xl font-bold ${color}`}>{value}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{label}</div>
                </div>
                {icon}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Broken automations alert */}
      {failures.length > 0 && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <XCircle size={15} className="text-red-600" />
            <span className="font-semibold text-red-700 text-sm">{failures.length} automation{failures.length > 1 ? "s" : ""} failing</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {failures.map((f) => (
              <span key={f.id} className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
                {f.module} · last failed {relativeTime(f.last_run_at)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming scheduled runs */}
      {upcoming.length > 0 && (
        <div className="mb-6 bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
            <Calendar size={14} className="text-blue-600" />
            <span className="text-sm font-semibold text-gray-700">Upcoming Scheduled Runs</span>
          </div>
          <div className="divide-y divide-gray-50">
            {upcoming.map((run) => (
              <div key={run.id} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock size={13} className="text-gray-400" />
                  <span className="text-sm text-gray-700 font-medium">{run.module}</span>
                  <span className="text-xs text-gray-400">{run.schedule_label}</span>
                </div>
                <div className="text-right">
                  <div className="text-xs font-medium text-blue-700">{relativeTimeAhead(run.next_run_at)}</div>
                  <div className="text-xs text-gray-400">
                    {new Date(run.next_run_at).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" })} IST
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {(["all", "active", "dormant", "broken", "unknown"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-2.5 py-1 text-xs font-medium rounded capitalize transition-colors ${filterStatus === s ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {(["all", "scheduled", "manual", "event_driven"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterTrigger(t)}
              className={`px-2.5 py-1 text-xs font-medium rounded capitalize transition-colors ${filterTrigger === t ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
            >
              {t.replace("_", " ")}
            </button>
          ))}
        </div>
        {stats && (
          <div className="ml-auto text-xs text-gray-400 self-center">
            {filtered.length} of {stats.total} automations
          </div>
        )}
      </div>

      {/* Automation table */}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
          <RefreshCw size={16} className="animate-spin mr-2" />
          Loading automation registry…
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-10 text-center text-gray-400 text-sm">
          <Database size={28} className="mx-auto mb-3 text-gray-300" />
          No automations match the current filter.
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ cat, items }) => (
            <div key={cat} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {categoryLabel[cat]}
                </span>
                <span className="text-xs text-gray-400">{items.length} automation{items.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wider">
                      <th className="px-4 py-2 text-left">Module</th>
                      <th className="px-4 py-2 text-left hidden lg:table-cell">Purpose</th>
                      <th className="px-4 py-2 text-left">Trigger</th>
                      <th className="px-4 py-2 text-left hidden sm:table-cell">Schedule</th>
                      <th className="px-4 py-2 text-left">Last Run</th>
                      <th className="px-4 py-2 text-left hidden xl:table-cell">Output</th>
                      <th className="px-4 py-2 text-left hidden md:table-cell">Founder View</th>
                      <th className="px-4 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((entry) => (
                      <AutomationRow
                        key={entry.id}
                        entry={entry}
                        onTrigger={handleTrigger}
                        triggering={triggering}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer legend */}
      <div className="mt-6 pt-4 border-t border-gray-200 flex flex-wrap gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1"><CheckCircle2 size={11} className="text-green-500" /> Active = ran within expected window</span>
        <span className="flex items-center gap-1"><Clock size={11} className="text-yellow-500" /> Dormant = overdue or not run recently</span>
        <span className="flex items-center gap-1"><XCircle size={11} className="text-red-500" /> Broken = last run failed</span>
        <span className="flex items-center gap-1"><HelpCircle size={11} className="text-gray-400" /> Unknown = no run data in MongoDB</span>
        <span className="ml-auto flex items-center gap-1">
          <ChevronRight size={11} />
          Click any row to expand details
        </span>
      </div>
    </div>
  )
}
