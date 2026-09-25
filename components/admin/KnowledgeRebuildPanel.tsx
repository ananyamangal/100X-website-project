"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { summarizeSource } from "@/lib/knowledge/sync/summary"

interface SourceResult {
  source: string
  scanned: number
  created: number
  updated: number
  unchanged: number
  published: number
  drafted: number
  skippedLocked: number
  unpublished: number
  errors: string[]
}

interface Job {
  id: string
  status: "running" | "success" | "partial" | "failed"
  trigger: "manual" | "auto"
  sources: string[]
  startedBy?: string
  startedAt: string
  finishedAt?: string
  progress: { done: number; total: number; current: string | null }
  results?: SourceResult[]
  totals?: { errors: number }
  error?: string
}

interface Info {
  sources: { key: string; label: string }[]
  latest: Job | null
  lastSuccess: Job | null
}

const btn = "px-2 py-1 text-xs rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-40"
const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleString() : "never")

export function KnowledgeRebuildPanel({ onFinished }: { onFinished?: () => void }) {
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [info, setInfo] = useState<Info | null>(null)
  const [picked, setPicked] = useState<Record<string, boolean>>({})
  const [job, setJob] = useState<Job | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = useCallback(() => {
    if (timer.current) clearInterval(timer.current)
    timer.current = null
  }, [])

  const loadInfo = useCallback(async () => {
    const res = await fetch("/api/admin/knowledge/rebuild")
    // No knowledge.rebuild permission: the panel simply does not exist for this user.
    if (res.status === 403 || res.status === 401) {
      setAllowed(false)
      return null
    }
    if (!res.ok) throw new Error(`status ${res.status}`)
    const data = (await res.json()) as Info
    setAllowed(true)
    setInfo(data)
    setPicked((p) => (Object.keys(p).length ? p : Object.fromEntries(data.sources.map((s) => [s.key, true]))))
    return data
  }, [])

  const poll = useCallback(
    (jobId: string) => {
      stopPolling()
      const tick = async () => {
        try {
          const res = await fetch(`/api/admin/knowledge/rebuild?jobId=${encodeURIComponent(jobId)}`)
          if (!res.ok) return
          const { job: j } = (await res.json()) as { job: Job }
          setJob(j)
          if (j.status !== "running") {
            stopPolling()
            await loadInfo().catch(() => {})
            onFinished?.()
          }
        } catch {
          /* keep polling; a transient error must not end the watch */
        }
      }
      void tick()
      timer.current = setInterval(tick, 2000)
    },
    [loadInfo, onFinished, stopPolling],
  )

  useEffect(() => {
    loadInfo()
      .then((d) => {
        if (d?.latest) {
          setJob(d.latest)
          if (d.latest.status === "running") poll(d.latest.id)
        }
      })
      .catch(() => setMessage("Could not load sync status."))
    return stopPolling
  }, [loadInfo, poll, stopPolling])

  if (allowed !== true || !info) return null

  const chosen = info.sources.filter((s) => picked[s.key]).map((s) => s.key)
  const running = job?.status === "running"
  const labelOf = (key: string) => info.sources.find((s) => s.key === key)?.label ?? key

  async function start() {
    setMessage(null)
    try {
      const res = await fetch("/api/admin/knowledge/rebuild", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(chosen.length === info!.sources.length ? {} : { sources: chosen }),
      })
      const data = await res.json()
      if (res.status === 202) {
        poll(data.jobId)
      } else if (res.status === 409 && data.job) {
        setMessage("A sync is already running; showing its progress.")
        setJob(data.job)
        poll(data.job.id)
      } else {
        setMessage(data.error ?? "Could not start the sync.")
      }
    } catch {
      setMessage("Could not start the sync.")
    }
  }

  const last = info.lastSuccess
  return (
    <section className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50" data-testid="knowledge-rebuild-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-gray-900">Knowledge Base sync</h3>
          <p className="text-xs text-gray-600 mt-0.5">
            Builds Knowledge Hub pages from blog posts, case studies and past performance. Pages that touch chemicals, dosing or safety are
            held as drafts for review. Each generated page points to its source page as canonical. Saving a blog, case study or past-performance
            record also runs this automatically.
          </p>
        </div>
        <button
          type="button"
          className="px-3 py-1.5 text-sm rounded bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
          disabled={running || chosen.length === 0}
          onClick={start}
          data-testid="rebuild-knowledge-base"
        >
          {running ? "Rebuilding…" : "Rebuild Knowledge Base"}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-700">
        <span className="font-medium">Rebuild:</span>
        {info.sources.map((s) => (
          <label key={s.key} className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={!!picked[s.key]}
              disabled={running}
              onChange={(e) => setPicked((p) => ({ ...p, [s.key]: e.target.checked }))}
            />
            {s.label}
          </label>
        ))}
      </div>

      <div className="text-xs text-gray-700 space-y-1">
        <div>
          <span className="font-medium">Last synced:</span> {last ? fmt(last.finishedAt ?? last.startedAt) : "never"}
          {last ? ` (${last.trigger === "auto" ? "automatic" : "manual"}${last.startedBy ? `, ${last.startedBy}` : ""})` : ""}
        </div>
        {job ? (
          <div data-testid="sync-status">
            <span className="font-medium">Status:</span>{" "}
            {job.status === "running" ? (
              <span className="text-blue-700">
                In progress{job.progress.current ? `: ${labelOf(job.progress.current)}` : ""} ({job.progress.done}/{job.progress.total} sources)
              </span>
            ) : job.status === "success" ? (
              <span className="text-green-700">Success</span>
            ) : job.status === "partial" ? (
              <span className="text-amber-700">Finished with errors</span>
            ) : (
              <span className="text-red-700">Failed{job.error ? `: ${job.error}` : ""}</span>
            )}
          </div>
        ) : null}
      </div>

      {job?.results?.length ? (
        <ul className="text-xs text-gray-800 space-y-1 list-disc pl-5" data-testid="sync-summary">
          {job.results.map((r) => (
            <li key={r.source}>
              {summarizeSource(r, labelOf(r.source))}
              {r.errors.length ? (
                <ul className="list-none pl-0 text-red-700">
                  {r.errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      {message ? <p className="text-xs text-amber-700">{message}</p> : null}
    </section>
  )
}
