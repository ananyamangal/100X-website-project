"use client"
import { useEffect, useState, useCallback } from "react"
import { Settings2, Play, Pause, Power, RotateCw, CheckCircle2, AlertCircle, Clock, Zap } from "lucide-react"
import type { Automation } from "@/lib/growth-os/types"

const RISK_COLOR: Record<string, string> = {
  low: "bg-green-100 text-green-700",
  medium: "bg-amber-100 text-amber-700",
  high: "bg-red-100 text-red-700",
}

const STATUS_COLOR: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  paused: "bg-amber-100 text-amber-700",
  disabled: "bg-gray-100 text-gray-500",
  pending: "bg-blue-100 text-blue-700",
}

const STATUS_ICON: Record<string, React.ElementType> = {
  active: CheckCircle2,
  paused: Clock,
  disabled: Power,
  pending: AlertCircle,
}

function Pill({ children, color = "gray" }: { children: React.ReactNode; color?: string }) {
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${color}`}>{children}</span>
}

export default function AutomationCenter() {
  const [agents, setAgents] = useState<Automation[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState<string | null>(null)
  const [lastRunResult, setLastRunResult] = useState<{ id: string; result: string } | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    fetch("/api/admin/growth/automation")
      .then(r => r.json())
      .then(d => { setAgents(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const setStatus = async (id: string, status: string) => {
    await fetch("/api/admin/growth/automation", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) })
    setAgents(prev => prev.map(a => a._id === id ? { ...a, status: status as Automation["status"] } : a))
  }

  const runNow = async (id: string) => {
    setRunning(id)
    try {
      const r = await fetch("/api/admin/growth/automation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) })
      const d = await r.json()
      setLastRunResult({ id, result: d.result || "Run completed" })
      load()
    } finally {
      setRunning(null)
    }
  }

  const activeCount = agents.filter(a => a.status === "active").length
  const pausedCount = agents.filter(a => a.status === "paused").length

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      <div className="bg-white border-b border-gray-200 px-8 py-5 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Settings2 size={18} className="text-brand-600" />
          <div>
            <h1 className="text-base font-bold text-gray-900">Automation Center</h1>
            <p className="text-gray-400 text-[11px]">Configure, monitor, and control Growth OS agents</p>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 max-w-[1400px] space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-gray-900">{agents.length}</p>
            <p className="text-xs text-gray-400 mt-0.5">Total Agents</p>
          </div>
          <div className="bg-white rounded-xl border border-green-200 p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-green-600">{activeCount}</p>
            <p className="text-xs text-gray-400 mt-0.5">Active</p>
          </div>
          <div className="bg-white rounded-xl border border-amber-200 p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-amber-600">{pausedCount}</p>
            <p className="text-xs text-gray-400 mt-0.5">Paused</p>
          </div>
        </div>

        {/* Approval note */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
          <Zap size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-blue-700 text-xs">
            <strong>Approval workflow active.</strong> Low-risk agents (schema, internal links, logs) run automatically.
            High-risk agents (new pages, content publication, navigation) require manual approval before execution.
          </p>
        </div>

        {/* Run result feedback */}
        {lastRunResult && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
            <CheckCircle2 size={14} className="text-green-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-green-800 text-xs font-semibold mb-0.5">Run complete</p>
              <p className="text-green-700 text-xs">{lastRunResult.result}</p>
            </div>
            <button onClick={() => setLastRunResult(null)} className="text-green-400 hover:text-green-600 text-xs">✕</button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-3">
            {agents.map(agent => {
              const StatusIcon = STATUS_ICON[agent.status] || Clock
              return (
                <div key={agent._id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-sm font-semibold text-gray-800">{agent.name}</h3>
                        <Pill color={STATUS_COLOR[agent.status]}>{agent.status}</Pill>
                        <Pill color={RISK_COLOR[agent.riskLevel]}>{agent.riskLevel} risk</Pill>
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{agent.module}</span>
                      </div>
                      <p className="text-xs text-gray-500 mb-3">{agent.description}</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
                        <div>
                          <p className="text-gray-400 mb-0.5">Schedule</p>
                          <p className="text-gray-700 font-medium">{agent.schedule}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 mb-0.5">Last Run</p>
                          <p className="text-gray-700 font-medium">
                            {agent.lastRun ? new Date(agent.lastRun).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "Never"}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400 mb-0.5">Run Count</p>
                          <p className="text-gray-700 font-medium">{agent.runCount || 0}</p>
                        </div>
                        <div>
                          <p className="text-gray-400 mb-0.5">Success Rate</p>
                          <p className="text-gray-700 font-medium">
                            {agent.successRate !== undefined ? `${agent.successRate}%` : "—"}
                          </p>
                        </div>
                      </div>
                      {agent.lastResult && (
                        <p className="mt-2 text-[11px] text-gray-500 bg-gray-50 rounded-lg px-3 py-1.5 border border-gray-100">
                          Last result: {agent.lastResult}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5 shrink-0">
                      <button
                        onClick={() => runNow(agent._id!)}
                        disabled={running === agent._id}
                        className="flex items-center gap-1 text-[11px] font-medium bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors"
                      >
                        {running === agent._id ? <RotateCw size={11} className="animate-spin" /> : <Play size={11} />}
                        Run
                      </button>
                      {agent.status === "active" ? (
                        <button onClick={() => setStatus(agent._id!, "paused")} className="flex items-center gap-1 text-[11px] font-medium border border-amber-300 text-amber-600 px-3 py-1.5 rounded-lg hover:bg-amber-50 transition-colors">
                          <Pause size={11} /> Pause
                        </button>
                      ) : agent.status === "paused" ? (
                        <button onClick={() => setStatus(agent._id!, "active")} className="flex items-center gap-1 text-[11px] font-medium border border-green-300 text-green-600 px-3 py-1.5 rounded-lg hover:bg-green-50 transition-colors">
                          <Play size={11} /> Resume
                        </button>
                      ) : null}
                      <button onClick={() => setStatus(agent._id!, "disabled")} className="flex items-center gap-1 text-[11px] font-medium border border-gray-200 text-gray-400 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                        <Power size={11} /> Disable
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
