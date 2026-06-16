"use client"
import { useState, useEffect } from "react"
import Link from "next/link"
import { Zap, AlertCircle, Clock, CheckCircle2, ArrowRight, RefreshCw } from "lucide-react"
import type { TodayItem } from "@/app/api/admin/growth/help/today/route"

const URGENCY_CONFIG = {
  critical: { label: "Critical", color: "red",  bg: "bg-red-50",   border: "border-red-200",  text: "text-red-800",   badge: "bg-red-100 text-red-700", icon: AlertCircle },
  high:     { label: "High",     color: "amber", bg: "bg-amber-50", border: "border-amber-200",text: "text-amber-800", badge: "bg-amber-100 text-amber-700", icon: Clock },
  medium:   { label: "Medium",   color: "blue",  bg: "bg-blue-50",  border: "border-blue-200", text: "text-blue-800",  badge: "bg-blue-100 text-blue-700", icon: Zap },
}

export default function TodayPage() {
  const [items, setItems]       = useState<TodayItem[]>([])
  const [loading, setLoading]   = useState(true)
  const [generatedAt, setGenAt] = useState<string | null>(null)
  const [completed, setCompleted] = useState<Set<string>>(new Set())

  function load() {
    setLoading(true)
    fetch("/api/admin/growth/help/today")
      .then(r => r.json())
      .then(d => {
        setItems(d.items ?? [])
        setGenAt(d.generated_at ?? null)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  function toggleComplete(id: string) {
    setCompleted(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const pending   = items.filter(i => !completed.has(i.id))
  const done      = items.filter(i => completed.has(i.id))

  return (
    <div className="flex-1 p-4 md:p-6 max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
              <Zap size={18} className="text-blue-700" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Founder Daily Brief</h1>
          </div>
          <p className="text-sm text-gray-500 ml-11">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
          {generatedAt && (
            <p className="text-xs text-gray-400 ml-11 mt-0.5">
              Generated at {new Date(generatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 rounded px-2.5 py-1.5 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Progress */}
          {items.length > 0 && (
            <div className="mb-4 flex items-center gap-3">
              <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                <div
                  className="bg-green-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${(completed.size / items.length) * 100}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 flex-shrink-0">
                {completed.size} / {items.length} done
              </span>
            </div>
          )}

          {/* Pending items */}
          {pending.length === 0 && done.length > 0 ? (
            <div className="text-center py-10">
              <CheckCircle2 size={40} className="text-green-500 mx-auto mb-3" />
              <p className="text-lg font-bold text-gray-900">All done for today!</p>
              <p className="text-sm text-gray-500 mt-1">Come back tomorrow after 07:00 IST.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {pending.map((item, i) => {
                const cfg = URGENCY_CONFIG[item.urgency]
                const Icon = cfg.icon
                return (
                  <div
                    key={item.id}
                    className={`rounded-lg border ${cfg.border} ${cfg.bg} p-4`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Rank */}
                      <div className="w-6 h-6 rounded-full bg-white border border-gray-200 text-xs font-bold text-gray-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                        {i + 1}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${cfg.badge}`}>
                            {cfg.label}
                          </span>
                        </div>
                        <p className={`text-sm font-semibold ${cfg.text}`}>{item.title}</p>
                        <p className="text-xs text-gray-600 mt-0.5">{item.detail}</p>

                        <div className="flex items-center gap-3 mt-2.5">
                          <Link
                            href={item.link}
                            className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800"
                          >
                            {item.action} <ArrowRight size={11} />
                          </Link>
                        </div>
                      </div>

                      {/* Done button */}
                      <button
                        onClick={() => toggleComplete(item.id)}
                        className="flex-shrink-0 w-6 h-6 rounded border-2 border-gray-300 hover:border-green-500 transition-colors flex items-center justify-center"
                        title="Mark done"
                      >
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Completed items */}
          {done.length > 0 && (
            <div className="mt-6">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Completed</h3>
              <div className="space-y-1.5">
                {done.map(item => (
                  <div key={item.id} className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded border border-gray-100">
                    <CheckCircle2 size={14} className="text-green-500 flex-shrink-0" />
                    <span className="text-sm text-gray-400 line-through">{item.title}</span>
                    <button
                      onClick={() => toggleComplete(item.id)}
                      className="ml-auto text-[10px] text-gray-400 hover:text-gray-600"
                    >
                      Undo
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer nav */}
          <div className="mt-8 pt-4 border-t border-gray-100 flex flex-wrap gap-3">
            <Link href="/admin/growth/director" className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
              Revenue Director <ArrowRight size={11} />
            </Link>
            <Link href="/admin/growth/execution" className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1">
              Execution Hub <ArrowRight size={11} />
            </Link>
            <Link href="/admin/growth/help" className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
              Knowledge Center <ArrowRight size={11} />
            </Link>
            <Link href="/admin/growth/help/chat" className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1">
              Ask Growth OS <ArrowRight size={11} />
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
