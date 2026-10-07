"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { RefreshCw, ExternalLink, ChevronRight, CheckCircle2, AlertCircle, XCircle, HelpCircle } from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────

interface CheckResult {
  id:          string
  label:       string
  status:      "pass" | "warn" | "fail" | "unknown"
  value:       string
  detail:      string
  requirement: string
}

interface ReadinessData {
  checkedAt:   string
  verdict:     "YES" | "NO" | "NOT_YET"
  verdictReason: string
  checks:      CheckResult[]
  summary:     { pass: number; warn: number; fail: number; unknown: number; total: number }
  estimatedAudienceBuildTime: string
}

// ── Check Card ────────────────────────────────────────────────────────────────

function CheckCard({ check }: { check: CheckResult }) {
  const [open, setOpen] = useState(false)

  const colors = {
    pass:    { wrap: "border-green-200 bg-green-50",   icon: <CheckCircle2 size={16} className="text-green-500" />, badge: "bg-green-100 text-green-700", label: "PASS" },
    warn:    { wrap: "border-amber-200 bg-amber-50",   icon: <AlertCircle  size={16} className="text-amber-500" />, badge: "bg-amber-100 text-amber-700", label: "WARNING" },
    fail:    { wrap: "border-red-200 bg-red-50",       icon: <XCircle      size={16} className="text-red-500"   />, badge: "bg-red-100 text-red-700",     label: "NOT MET" },
    unknown: { wrap: "border-gray-200 bg-gray-50",     icon: <HelpCircle   size={16} className="text-gray-400" />, badge: "bg-gray-100 text-gray-500",   label: "UNKNOWN" },
  }
  const c = colors[check.status]

  return (
    <div className={`rounded-xl border overflow-hidden ${c.wrap}`}>
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-start gap-3 p-4 text-left">
        <div className="flex-shrink-0 mt-0.5">{c.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-gray-900">{check.label}</p>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${c.badge}`}>{c.label}</span>
          </div>
          <p className="text-xs text-gray-600 mt-0.5">{check.value}</p>
        </div>
        {open
          ? <span className="text-[10px] text-gray-400 flex-shrink-0 mt-0.5">Hide</span>
          : <span className="text-[10px] text-gray-400 flex-shrink-0 mt-0.5">Details</span>}
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-white/50 pt-3 space-y-2">
          <p className="text-xs text-gray-700">{check.detail}</p>
          <div className="flex items-start gap-2 pt-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex-shrink-0 mt-0.5">Requirement</span>
            <p className="text-[11px] text-gray-500">{check.requirement}</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Verdict Banner ────────────────────────────────────────────────────────────

function VerdictBanner({ verdict, reason }: { verdict: string; reason: string }) {
  if (verdict === "YES") return (
    <div className="rounded-2xl border-2 border-green-300 bg-green-50 p-6">
      <div className="flex items-center gap-3 mb-2">
        <CheckCircle2 size={24} className="text-green-500 flex-shrink-0" />
        <div>
          <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Verdict</span>
          <h2 className="text-2xl font-bold text-green-800">YES — Ready for Remarketing</h2>
        </div>
      </div>
      <p className="text-sm text-green-700">{reason}</p>
    </div>
  )

  if (verdict === "NO") return (
    <div className="rounded-2xl border-2 border-red-300 bg-red-50 p-6">
      <div className="flex items-center gap-3 mb-2">
        <XCircle size={24} className="text-red-500 flex-shrink-0" />
        <div>
          <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Verdict</span>
          <h2 className="text-2xl font-bold text-red-800">NO — Not Ready</h2>
        </div>
      </div>
      <p className="text-sm text-red-700">{reason}</p>
      <p className="text-xs text-red-500 mt-2 font-medium">Do not build remarketing campaigns until the issues above are fixed.</p>
    </div>
  )

  return (
    <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-6">
      <div className="flex items-center gap-3 mb-2">
        <AlertCircle size={24} className="text-amber-500 flex-shrink-0" />
        <div>
          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Verdict</span>
          <h2 className="text-2xl font-bold text-amber-800">NOT YET — Work In Progress</h2>
        </div>
      </div>
      <p className="text-sm text-amber-700">{reason}</p>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RemarketingReadinessPage() {
  const [data,    setData]    = useState<ReadinessData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/growth/ads/remarketing-readiness")
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setData(await res.json())
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const passCount = data?.summary.pass ?? 0
  const total     = data?.summary.total ?? 6

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin/growth/founder"
              className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
              Revenue Dashboard <ChevronRight size={12} />
            </Link>
            <div>
              <h1 className="text-base font-bold text-gray-900">Remarketing Readiness Audit</h1>
              <p className="text-[11px] text-gray-400">
                {data ? `Checked ${new Date(data.checkedAt).toLocaleTimeString()}` : "Loading…"}
              </p>
            </div>
          </div>
          <button onClick={load} disabled={loading}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      <div className="px-8 py-6 max-w-3xl space-y-5">

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs text-red-700">
            Failed to load: {error}
          </div>
        )}

        {/* Context banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-xs text-blue-800 font-medium mb-1">What is this audit?</p>
          <p className="text-xs text-blue-700">
            Remarketing shows ads to people who already visited your website. This audit checks whether the
            6 required prerequisites are in place before you build remarketing campaigns. Do not skip this —
            running remarketing before audiences are large enough wastes budget.
          </p>
        </div>

        {/* Progress */}
        {loading && !data ? (
          <div className="h-24 bg-gray-100 rounded-xl animate-pulse" />
        ) : data ? (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-900">Prerequisites</h3>
              <span className="text-sm font-bold text-gray-600">{passCount}/{total} met</span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-brand-500 rounded-full transition-all"
                style={{ width: `${(passCount / total) * 100}%` }} />
            </div>
            <div className="flex gap-4 mt-3 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" />{data.summary.pass} pass</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />{data.summary.warn} warn</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400  inline-block" />{data.summary.fail} fail</span>
              {data.summary.unknown > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />{data.summary.unknown} unknown</span>}
            </div>
          </div>
        ) : null}

        {/* Verdict */}
        {loading && !data ? (
          <div className="h-32 bg-gray-100 rounded-2xl animate-pulse" />
        ) : data ? (
          <VerdictBanner verdict={data.verdict} reason={data.verdictReason} />
        ) : null}

        {/* Audience build time */}
        {data && (
          <div className="bg-white rounded-xl border border-gray-200 px-5 py-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Audience Growth Estimate</p>
            <p className="text-sm text-gray-700">{data.estimatedAudienceBuildTime}</p>
            <p className="text-xs text-gray-400 mt-1">
              Based on paid traffic only. GA4 organic traffic is not integrated and would improve this estimate.
            </p>
          </div>
        )}

        {/* Checks */}
        <div>
          <h3 className="text-sm font-bold text-gray-700 mb-3">6 Prerequisites</h3>
          {loading && !data ? (
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {data?.checks.map(check => (
                <CheckCard key={check.id} check={check} />
              ))}
            </div>
          )}
        </div>

        {/* Next steps */}
        {data && data.verdict !== "YES" && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-3">How to get ready</h3>
            <div className="space-y-2.5">
              {data.checks.filter(c => c.status === "fail" || c.status === "warn").map(c => (
                <div key={c.id} className="flex items-start gap-2">
                  <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold mt-0.5 ${
                    c.status === "fail" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700"
                  }`}>
                    {c.status === "fail" ? "!" : "~"}
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-gray-800">{c.label}</p>
                    <p className="text-xs text-gray-500">{c.requirement}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Links */}
        <div className="flex flex-wrap gap-2 pb-6">
          <Link href="/admin/growth/founder"
            className="text-[11px] text-gray-500 hover:text-brand-600 border border-gray-200 hover:border-brand-300 px-2.5 py-1 rounded-lg transition-colors bg-white">
            Revenue Dashboard
          </Link>
          <a href="https://ads.google.com/aw/audiences" target="_blank" rel="noopener noreferrer"
            className="text-[11px] text-gray-500 hover:text-brand-600 border border-gray-200 hover:border-brand-300 px-2.5 py-1 rounded-lg transition-colors bg-white flex items-center gap-1">
            Google Ads Audiences <ExternalLink size={10} />
          </a>
          <a href="https://tagmanager.google.com" target="_blank" rel="noopener noreferrer"
            className="text-[11px] text-gray-500 hover:text-brand-600 border border-gray-200 hover:border-brand-300 px-2.5 py-1 rounded-lg transition-colors bg-white flex items-center gap-1">
            Tag Manager <ExternalLink size={10} />
          </a>
        </div>

      </div>
    </div>
  )
}
