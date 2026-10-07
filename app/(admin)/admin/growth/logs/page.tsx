"use client"
import { useEffect, useState, useCallback } from "react"
import { ScrollText, RefreshCw, Trash2, AlertCircle, CheckCircle2, Info, AlertTriangle } from "lucide-react"
import type { GrowthLog } from "@/lib/growth-os/types"

const LEVEL_STYLE: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
  info: { bg: "bg-blue-50 border-blue-200", text: "text-blue-600", icon: Info },
  success: { bg: "bg-green-50 border-green-200", text: "text-green-600", icon: CheckCircle2 },
  warning: { bg: "bg-amber-50 border-amber-200", text: "text-amber-600", icon: AlertTriangle },
  error: { bg: "bg-red-50 border-red-200", text: "text-red-600", icon: AlertCircle },
}

const MODULES = ["all", "seo", "geo", "competitors", "opportunities", "content", "dealers", "gem", "ads", "automation", "system"]

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<GrowthLog[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filterModule, setFilterModule] = useState("all")
  const [filterLevel, setFilterLevel] = useState("all")
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ limit: "200" })
    if (filterModule !== "all") params.set("module", filterModule)
    if (filterLevel !== "all") params.set("level", filterLevel)
    fetch(`/api/admin/growth/logs?${params}`)
      .then(r => r.json())
      .then(d => { setLogs(d.logs || []); setTotal(d.total || 0) })
      .finally(() => setLoading(false))
  }, [filterModule, filterLevel])

  useEffect(() => { load() }, [load])

  const deleteLog = async (id: string) => {
    await fetch(`/api/admin/growth/logs?id=${id}`, { method: "DELETE" })
    setLogs(l => l.filter(x => x._id !== id))
  }

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      <div className="bg-white border-b border-gray-200 px-8 py-5 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ScrollText size={18} className="text-brand-600" />
            <div>
              <h1 className="text-base font-bold text-gray-900">Activity Logs</h1>
              <p className="text-gray-400 text-[11px]">Every automated and manual action — auditable, traceable, reversible</p>
            </div>
          </div>
          <button onClick={load} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-brand-600 border border-gray-200 rounded-lg px-3 py-1.5 bg-white hover:border-brand-400 transition-colors">
            <RefreshCw size={12} />
            Refresh
          </button>
        </div>
      </div>

      <div className="px-8 py-6 max-w-[1400px]">
        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex flex-wrap gap-4 items-center shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">Module:</span>
            <select value={filterModule} onChange={e => setFilterModule(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500">
              {MODULES.map(m => <option key={m} value={m}>{m === "all" ? "All Modules" : m}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">Level:</span>
            <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500">
              {["all", "info", "success", "warning", "error"].map(l => <option key={l} value={l}>{l === "all" ? "All Levels" : l}</option>)}
            </select>
          </div>
          <div className="ml-auto text-xs text-gray-400">{total} total entries</div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
            <ScrollText size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 text-sm font-medium">No activity logs yet</p>
            <p className="text-gray-400 text-xs mt-1">Logs will appear as agents run and actions are taken</p>
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map(log => {
              const style = LEVEL_STYLE[log.level] || LEVEL_STYLE.info
              const LevelIcon = style.icon
              const isOpen = expanded === log._id
              return (
                <div key={log._id} className={`bg-white rounded-xl border shadow-sm overflow-hidden ${isOpen ? "border-gray-300" : "border-gray-200"}`}>
                  <div
                    className="px-5 py-3.5 flex items-center gap-3 cursor-pointer hover:bg-gray-50/50"
                    onClick={() => setExpanded(isOpen ? null : log._id || null)}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${style.bg.split(" ")[0]} border ${style.bg.split(" ")[1]}`}>
                      <LevelIcon size={12} className={style.text} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-semibold text-gray-800 truncate">{log.action}</span>
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full shrink-0">{log.module}</span>
                      </div>
                      <p className="text-[11px] text-gray-500 truncate">{log.agent} · {log.reason}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[11px] text-gray-400 whitespace-nowrap">
                        {new Date(log.ts).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); if (log._id) deleteLog(log._id) }}
                      className="text-gray-300 hover:text-red-400 transition-colors p-1 rounded"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>

                  {isOpen && (
                    <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 space-y-3">
                      <div className="grid sm:grid-cols-2 gap-3">
                        {log.expectedImpact && (
                          <div>
                            <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Expected Impact</p>
                            <p className="text-xs text-gray-700">{log.expectedImpact}</p>
                          </div>
                        )}
                        {log.actualImpact && (
                          <div>
                            <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Actual Impact</p>
                            <p className="text-xs text-gray-700">{log.actualImpact}</p>
                          </div>
                        )}
                      </div>
                      {(log.before || log.after) && (
                        <div className="grid sm:grid-cols-2 gap-3">
                          {log.before && (
                            <div>
                              <p className="text-[10px] text-red-400 uppercase tracking-wide mb-1">Before</p>
                              <pre className="text-[11px] text-gray-600 bg-red-50 border border-red-100 rounded-lg p-2 overflow-auto max-h-24 whitespace-pre-wrap">{log.before}</pre>
                            </div>
                          )}
                          {log.after && (
                            <div>
                              <p className="text-[10px] text-green-600 uppercase tracking-wide mb-1">After</p>
                              <pre className="text-[11px] text-gray-600 bg-green-50 border border-green-100 rounded-lg p-2 overflow-auto max-h-24 whitespace-pre-wrap">{log.after}</pre>
                            </div>
                          )}
                        </div>
                      )}
                      {log.rollbackData && (
                        <div>
                          <p className="text-[10px] text-amber-500 uppercase tracking-wide mb-1">Rollback Data</p>
                          <pre className="text-[11px] text-gray-600 bg-amber-50 border border-amber-100 rounded-lg p-2 overflow-auto max-h-24 whitespace-pre-wrap">{log.rollbackData}</pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
