"use client"

/**
 * PageGuidance — "What should I do now?" card.
 *
 * Drop this at the top of any Growth OS admin page.
 * It fetches context-aware guidance from the page-guidance API
 * and renders:
 *   - The primary action (most important thing to do right now)
 *   - 1–2 supporting actions
 *   - A contextual tip
 *   - Readiness score for this page
 *
 * Usage:
 *   <PageGuidance page="approval-queue" />
 *   <PageGuidance page="keyword-intelligence" />
 */

import { useEffect, useState } from "react"
import Link from "next/link"
import { Zap, ChevronRight, Loader2, CheckCircle2, XCircle, AlertTriangle, Clock } from "lucide-react"
import type { PageGuidance as PageGuidanceType, PageAction } from "@/lib/growth-os/user-success/page-guidance"

const STATUS_ICON: Record<string, React.ReactNode> = {
  ready:   <CheckCircle2 size={12} className="text-green-500" />,
  partial: <AlertTriangle size={12} className="text-amber-500" />,
  warning: <AlertTriangle size={12} className="text-amber-500" />,
  error:   <XCircle size={12} className="text-red-500" />,
  default: <Clock size={12} className="text-gray-400" />,
}

function ActionButton({ action }: { action: PageAction & { isPrimary?: boolean } }) {
  const [running, setRunning] = useState(false)
  const [done,    setDone]    = useState(false)

  async function trigger() {
    if (!action.apiEndpoint) return
    setRunning(true)
    try {
      await fetch(action.apiEndpoint, { method: action.method ?? "POST" })
      setDone(true)
    } catch { /* silent */ } finally {
      setRunning(false)
    }
  }

  const base = action.isPrimary
    ? "inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition shadow-sm"
    : "inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition"

  if (action.url && !action.apiEndpoint) {
    return (
      <Link href={action.url} className={base}>
        {action.label}
        <ChevronRight size={10} />
      </Link>
    )
  }

  return (
    <button onClick={trigger} disabled={running || done} className={`${base} disabled:opacity-50`}>
      {running ? <Loader2 size={10} className="animate-spin" /> : done ? <CheckCircle2 size={10} /> : <Zap size={10} />}
      {done ? "Done" : running ? "Running…" : action.label}
    </button>
  )
}

export function PageGuidance({ page }: { page: string }) {
  const [guidance, setGuidance] = useState<PageGuidanceType | null>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    fetch(`/api/admin/growth/page-guidance/${encodeURIComponent(page)}`)
      .then(r => r.json())
      .then(setGuidance)
      .catch(() => null)
  }, [page])

  if (!guidance) return null

  const score = guidance.readinessScore
  const scoreColor = score >= 80 ? "bg-green-500" : score >= 50 ? "bg-amber-500" : "bg-red-500"
  const statusKey = score >= 80 ? "ready" : score >= 50 ? "partial" : "error"

  return (
    <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          {/* Page context line */}
          <div className="flex items-center gap-2 mb-2">
            {STATUS_ICON[statusKey]}
            <span className="text-xs font-semibold text-blue-700">{guidance.readinessLabel}</span>
            <div className="flex-1 h-1.5 bg-blue-100 rounded-full max-w-[80px]">
              <div className={`h-1.5 rounded-full ${scoreColor}`} style={{ width: `${score}%` }} />
            </div>
          </div>

          {/* Primary action */}
          <p className="text-sm font-semibold text-gray-900 mb-1">{guidance.primaryAction.description}</p>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 mt-3">
            <ActionButton action={{ ...guidance.primaryAction, isPrimary: true }} />
            {guidance.supportingActions.slice(0, 2).map((a, i) => (
              <ActionButton key={i} action={a} />
            ))}
          </div>
        </div>

        {/* Explainer toggle */}
        <button
          onClick={() => setExpanded(e => !e)}
          className="text-xs text-blue-500 hover:text-blue-700 flex-shrink-0 font-medium"
        >
          {expanded ? "Hide" : "How this page works"}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-blue-100">
          <p className="text-xs text-gray-600 mb-2">{guidance.pageExplainer}</p>
          {guidance.tip && (
            <p className="text-xs text-blue-600 italic">💡 {guidance.tip}</p>
          )}
        </div>
      )}
    </div>
  )
}
