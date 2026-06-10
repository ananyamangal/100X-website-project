"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import {
  RefreshCw, ExternalLink, TrendingUp, AlertCircle,
  ChevronDown, ChevronRight, CheckCircle2, Circle,
} from "lucide-react"

// ── API shape ─────────────────────────────────────────────────────────────────

interface NextAction {
  id:          string
  title:       string
  description: string
  cta:         string
  ctaUrl:      string
  urgency:     "critical" | "high" | "normal"
  external:    boolean
}

interface FounderV2 {
  revenue: {
    revenueToday:         number
    leadsToday:           number
    dealerLeadsThisMonth: number
    oemLeadsThisMonth:    number
    adSpendToday:         number
    costPerLead:          number | null
  }
  campaign: { status: string; live: boolean }
  funnel: {
    impressions:    number
    clicks:         number
    landingVisits:  null
    rfqs:           number
    dealerLeads:    number
    oemLeads:       number
    clickRate:      number | null
    convRate:       number | null
    bottleneck:     string | null
  }
  milestones: {
    firstPaidClick:      boolean
    firstAttributedLead: boolean
    firstDealerLead:     boolean
    firstOEMLead:        boolean
  }
  nextAction: NextAction
  checkedAt:  string
}

// ── Utils ─────────────────────────────────────────────────────────────────────

function ago(iso: string) {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.round(s / 60)}m ago`
  return `${Math.round(s / 3600)}h ago`
}

function pct(num: number, denom: number): string {
  if (denom === 0) return "—"
  return `${((num / denom) * 100).toFixed(1)}%`
}

function fmtINR(n: number | null): string {
  if (n === null || n === 0) return "—"
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000)   return `₹${(n / 1000).toFixed(1)}k`
  return `₹${Math.round(n)}`
}

// ── Revenue metric tile ───────────────────────────────────────────────────────

function Tile({
  label, sub, value, highlight,
}: {
  label:     string
  sub?:      string
  value:     string | number
  highlight?: boolean
}) {
  const isEmpty = value === 0 || value === "0" || value === null || value === "—"
  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-1 ${
      highlight ? "bg-brand-50 border-brand-200" : "bg-white border-gray-200"
    }`}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 leading-tight">
        {label}
        {sub && <span className="block normal-case font-normal text-gray-300">{sub}</span>}
      </p>
      <p className={`text-2xl font-bold leading-none ${
        isEmpty ? "text-gray-200" : highlight ? "text-brand-600" : "text-gray-900"
      }`}>
        {isEmpty ? "—" : value}
      </p>
    </div>
  )
}

// ── Next Best Action card ─────────────────────────────────────────────────────

function ActionCard({ action }: { action: NextAction }) {
  const s = {
    critical: {
      wrap:  "border-red-300 bg-red-50",
      badge: "bg-red-100 text-red-700",
      label: "URGENT",
      btn:   "bg-red-600 hover:bg-red-700 text-white",
    },
    high: {
      wrap:  "border-amber-300 bg-amber-50",
      badge: "bg-amber-100 text-amber-700",
      label: "ACTION NEEDED",
      btn:   "bg-amber-600 hover:bg-amber-700 text-white",
    },
    normal: {
      wrap:  "border-gray-200 bg-white",
      badge: "bg-gray-100 text-gray-500",
      label: "NEXT STEP",
      btn:   "bg-brand-600 hover:bg-brand-700 text-white",
    },
  }[action.urgency]

  return (
    <div className={`rounded-2xl border-2 p-6 ${s.wrap}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mb-2 ${s.badge}`}>
            {s.label}
          </span>
          <h2 className="text-xl font-bold text-gray-900 leading-snug mb-1.5">
            {action.title}
          </h2>
          <p className="text-sm text-gray-600">{action.description}</p>
        </div>
        {action.external ? (
          <a
            href={action.ctaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex-shrink-0 flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${s.btn}`}
          >
            {action.cta} <ExternalLink size={13} />
          </a>
        ) : (
          <Link
            href={action.ctaUrl}
            className={`flex-shrink-0 flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${s.btn}`}
          >
            {action.cta} <ChevronRight size={13} />
          </Link>
        )}
      </div>
    </div>
  )
}

// ── Funnel visualization ──────────────────────────────────────────────────────

interface FunnelStage {
  id:       string
  label:    string
  value:    number
  through?: string
}

function FunnelBar({
  stage, max, isBottleneck,
}: {
  stage:        FunnelStage
  max:          number
  isBottleneck: boolean
}) {
  const width = max > 0 ? Math.max((stage.value / max) * 100, stage.value > 0 ? 2 : 0) : 0

  return (
    <div className="flex items-center gap-3 py-1">
      <div className="w-36 flex-shrink-0 text-right">
        <span className={`text-xs font-medium ${isBottleneck ? "text-red-600" : "text-gray-500"}`}>
          {stage.label}
        </span>
      </div>
      <div className="flex-1 min-w-0 relative h-7">
        <div className="absolute inset-0 bg-gray-100 rounded-md overflow-hidden">
          <div
            className={`h-full rounded-md transition-all duration-500 ${
              isBottleneck ? "bg-red-400" : "bg-brand-500"
            }`}
            style={{ width: `${width}%` }}
          />
        </div>
        {isBottleneck && (
          <span className="absolute right-1 top-1 text-[9px] font-bold text-red-500 leading-none">
            ← drop-off
          </span>
        )}
      </div>
      <div className="w-24 flex-shrink-0">
        <span className={`text-sm font-bold tabular-nums ${
          stage.value === 0 ? "text-gray-200" : isBottleneck ? "text-red-700" : "text-gray-800"
        }`}>
          {stage.value.toLocaleString()}
        </span>
        {stage.through && (
          <span className="block text-[10px] text-gray-400">{stage.through} CTR</span>
        )}
      </div>
    </div>
  )
}

function FunnelChart({ funnel }: { funnel: FounderV2["funnel"] }) {
  const stages: FunnelStage[] = [
    { id: "impressions", label: "Impressions",  value: funnel.impressions },
    { id: "clicks",      label: "Clicks",       value: funnel.clicks,      through: pct(funnel.clicks, funnel.impressions) },
    { id: "rfqs",        label: "RFQ Submits",  value: funnel.rfqs,        through: pct(funnel.rfqs, funnel.clicks) },
    { id: "dealerLeads", label: "Dealer Leads", value: funnel.dealerLeads, through: pct(funnel.dealerLeads, funnel.rfqs) },
    { id: "oemLeads",    label: "OEM Leads",    value: funnel.oemLeads,    through: pct(funnel.oemLeads, funnel.rfqs) },
  ]

  const max = funnel.impressions || 1
  const allZero = funnel.impressions === 0

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-baseline justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-800">Revenue Funnel</h3>
        <span className="text-[11px] text-gray-400">today</span>
      </div>

      {allZero ? (
        <div className="py-8 text-center">
          <TrendingUp size={28} className="text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-400">Funnel populates once the campaign is serving</p>
        </div>
      ) : (
        <div className="space-y-0.5">
          {stages.map(stage => (
            <FunnelBar
              key={stage.id}
              stage={stage}
              max={max}
              isBottleneck={stage.id === funnel.bottleneck}
            />
          ))}
        </div>
      )}

      {funnel.bottleneck && !allZero && (
        <div className="mt-4 bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-xs text-red-700 flex items-start gap-1.5">
          <AlertCircle size={11} className="mt-0.5 flex-shrink-0" />
          <span>
            Biggest drop-off: <strong>{
              funnel.bottleneck === "clicks"      ? "Impressions → Clicks — ad copy may not match intent" :
              funnel.bottleneck === "rfqs"        ? "Clicks → Form Submits — landing page not converting" :
              funnel.bottleneck === "dealerLeads" ? "Submits → Dealer Leads — review landing page targeting" :
              "Dealer → OEM Leads — OEM pages may need work"
            }</strong>
          </span>
        </div>
      )}
    </div>
  )
}

// ── Advanced section (lazy readiness) ─────────────────────────────────────────

interface Readiness {
  overall: number
  tiers:   { setup: number; data: number; revenue: number }
  checks:  Array<{ id: string; status: string; label: string; points: number; maxPoints: number; detail?: string }>
}

function AdvancedSection({ milestones }: { milestones: FounderV2["milestones"] }) {
  const [open, setOpen]           = useState(false)
  const [readiness, setReadiness] = useState<Readiness | null>(null)
  const [loading, setLoading]     = useState(false)

  const loadReadiness = useCallback(async () => {
    if (readiness) return
    setLoading(true)
    try {
      const r = await fetch("/api/admin/growth/readiness")
      if (r.ok) setReadiness(await r.json())
    } finally {
      setLoading(false)
    }
  }, [readiness])

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next) loadReadiness()
  }

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="text-sm font-semibold text-gray-400">Advanced — technical systems</span>
        {open
          ? <ChevronDown  size={15} className="text-gray-400" />
          : <ChevronRight size={15} className="text-gray-400" />}
      </button>

      {open && (
        <div className="border-t border-gray-100 px-5 py-4 space-y-4 bg-gray-50/50">

          {/* Milestones */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Milestones</p>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { label: "First paid click",       done: milestones.firstPaidClick },
                { label: "First attributed lead",  done: milestones.firstAttributedLead },
                { label: "First dealer lead",      done: milestones.firstDealerLead },
                { label: "First OEM lead",         done: milestones.firstOEMLead },
              ].map(m => (
                <div key={m.label} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
                  m.done
                    ? "bg-green-50 text-green-800"
                    : "bg-white text-gray-400 border border-gray-100"
                }`}>
                  {m.done
                    ? <CheckCircle2 size={12} className="text-green-500 flex-shrink-0" />
                    : <Circle       size={12} className="text-gray-300 flex-shrink-0" />}
                  {m.label}
                </div>
              ))}
            </div>
          </div>

          {/* Readiness */}
          {loading && (
            <div className="space-y-1.5">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-8 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          )}

          {readiness && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Readiness</p>
                <span className="text-xs font-bold text-gray-600">{readiness.overall}%</span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full mb-3">
                <div
                  className="h-full bg-brand-500 rounded-full transition-all"
                  style={{ width: `${readiness.overall}%` }}
                />
              </div>
              <div className="grid grid-cols-3 gap-1.5 mb-3">
                {[
                  { label: "Setup",   score: readiness.tiers.setup },
                  { label: "Data",    score: readiness.tiers.data },
                  { label: "Revenue", score: readiness.tiers.revenue },
                ].map(t => (
                  <div key={t.label} className="bg-white border border-gray-100 rounded-lg px-3 py-2 text-center">
                    <p className="text-xs font-bold text-gray-700">{t.score}%</p>
                    <p className="text-[10px] text-gray-400">{t.label}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                {readiness.checks.map(c => (
                  <div key={c.id} className={`flex items-start gap-2 px-3 py-2 rounded-lg text-xs ${
                    c.status === "ok"      ? "bg-green-50 text-green-800" :
                    c.status === "warning" ? "bg-amber-50 text-amber-700" :
                                             "bg-red-50 text-red-700"
                  }`}>
                    <span className="flex-shrink-0 font-bold">
                      {c.status === "ok" ? "✓" : c.status === "warning" ? "!" : "✗"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium leading-tight">{c.label}</p>
                      {c.detail && <p className="text-[10px] opacity-75 mt-0.5 truncate">{c.detail}</p>}
                    </div>
                    <span className="flex-shrink-0 font-mono text-[10px] opacity-60">
                      {c.points}/{c.maxPoints}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Technical page links */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Technical pages</p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Launch Status",    href: "/admin/growth/launch" },
                { label: "Paid Growth",      href: "/admin/growth/paid" },
                { label: "Ads Dashboard",    href: "/admin/growth/ads/dashboard" },
                { label: "Ads Director",     href: "/admin/growth/ads/director" },
                { label: "Activity Logs",    href: "/admin/growth/logs" },
              ].map(l => (
                <Link key={l.href} href={l.href}
                  className="text-[11px] text-gray-500 hover:text-brand-600 border border-gray-200 hover:border-brand-300 px-2.5 py-1 rounded-lg transition-colors bg-white"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function FounderModePage() {
  const [data, setData]       = useState<FounderV2 | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/growth/founder-v2")
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      setData(await r.json())
      setError(null)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Auto-refresh every 90 s
  useEffect(() => {
    const t = setInterval(load, 90_000)
    return () => clearInterval(t)
  }, [load])

  const r = data?.revenue

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base font-bold text-gray-900">Revenue Dashboard</h1>
            <p className="text-[11px] text-gray-400">
              {data ? `Updated ${ago(data.checkedAt)}` : "Loading…"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {data && (
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                data.campaign.live
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-500"
              }`}>
                Campaign {data.campaign.live ? "LIVE" : data.campaign.status}
              </span>
            )}
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40"
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 max-w-3xl space-y-5">

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs text-red-700">
            Failed to load: {error}
          </div>
        )}

        {/* 6 Revenue Metrics */}
        <section>
          {loading && !data ? (
            <div className="grid grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <Tile label="Revenue today"    value="—" />
              <Tile label="Leads today"      value={r?.leadsToday ?? 0}           highlight={(r?.leadsToday ?? 0) > 0} />
              <Tile label="Dealer leads"     sub="this month" value={r?.dealerLeadsThisMonth ?? 0} highlight={(r?.dealerLeadsThisMonth ?? 0) > 0} />
              <Tile label="OEM leads"        sub="this month" value={r?.oemLeadsThisMonth ?? 0}    highlight={(r?.oemLeadsThisMonth ?? 0) > 0} />
              <Tile label="Ad spend"         sub="today"      value={r?.adSpendToday ? fmtINR(r.adSpendToday) : "—"} />
              <Tile label="Cost per lead"                     value={r?.costPerLead ? fmtINR(r.costPerLead) : "—"} />
            </div>
          )}
        </section>

        {/* Next Best Action — single prominent card */}
        <section>
          {loading && !data ? (
            <div className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
          ) : data ? (
            <ActionCard action={data.nextAction} />
          ) : null}
        </section>

        {/* Revenue Funnel */}
        {data && <FunnelChart funnel={data.funnel} />}

        {/* Advanced — collapsed */}
        {data && <AdvancedSection milestones={data.milestones} />}

      </div>
    </div>
  )
}
