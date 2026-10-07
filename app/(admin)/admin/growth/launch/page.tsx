"use client"

import { useEffect, useState, useCallback } from "react"
import { CheckCircle2, Circle, RefreshCw, ExternalLink, Rocket, ChevronDown, ChevronRight } from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChecklistItem {
  confirmed: boolean
  manual:    boolean
  label:     string
  detail?:   string
  link?:     string
  linkLabel?:string
}

interface RawCampaign {
  campaign_id:   string
  campaign_name: string
  status:        string
  customer_id:   string
}

interface RawApi {
  usedCustomerId:   string
  usedLoginId:      string | null
  hardcodedId:      string
  campaigns:        RawCampaign[]
  targetedCampaign: RawCampaign | null
  error:            string | null
}

interface LaunchStatus {
  checklist: {
    accountFunded:     ChecklistItem
    conversionActions: ChecklistItem
    gtmTags:           ChecklistItem
    campaignEnabled:   ChecklistItem
  }
  metrics: {
    impressionsToday: number
    clicksToday:      number
    spendToday:       number
    leadsToday:       number
  }
  milestones: {
    firstPaidClick:      boolean
    firstAttributedLead: boolean
    firstDealerLead:     boolean
    firstOEMLead:        boolean
  }
  rawApi?: RawApi
  checkedAt: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function ago(iso: string): string {
  const secs = Math.round((Date.now() - new Date(iso).getTime()) / 1000)
  if (secs < 60)  return `${secs}s ago`
  if (secs < 3600) return `${Math.round(secs / 60)}m ago`
  return `${Math.round(secs / 3600)}h ago`
}

// ── Check row ─────────────────────────────────────────────────────────────────

function CheckRow({
  item,
  field,
  onConfirm,
  confirming,
}: {
  item:       ChecklistItem
  field:      string
  onConfirm:  (field: string, value: boolean) => void
  confirming: string | null
}) {
  const done = item.confirmed
  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border transition-colors ${
      done ? "bg-green-50 border-green-200" : "bg-white border-gray-200"
    }`}>
      <div className="flex-shrink-0 mt-0.5">
        {done
          ? <CheckCircle2 size={18} className="text-green-500" />
          : <Circle size={18} className="text-gray-300" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${done ? "text-green-800" : "text-gray-800"}`}>
          {item.label}
        </p>
        {!item.manual && item.detail && (
          <p className="text-xs text-gray-400 mt-0.5">Status from Google Ads: {item.detail}</p>
        )}
        {item.manual && !done && (
          <p className="text-xs text-gray-400 mt-0.5">Confirm once completed in {item.linkLabel ?? "external tool"}</p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {item.link && (
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium"
          >
            {item.linkLabel} <ExternalLink size={10} />
          </a>
        )}
        {item.manual && (
          <button
            onClick={() => onConfirm(field, !done)}
            disabled={confirming === field}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
              done
                ? "border-gray-200 text-gray-500 hover:bg-gray-50"
                : "border-brand-600 text-brand-600 hover:bg-brand-50"
            } disabled:opacity-50`}
          >
            {confirming === field ? "…" : done ? "Undo" : "Mark done"}
          </button>
        )}
      </div>
    </div>
  )
}

// ── Raw API diagnostic panel ──────────────────────────────────────────────────

function RawApiPanel({ raw }: { raw: RawApi }) {
  const [open, setOpen] = useState(true)   // expanded by default so user sees it immediately

  const statusColor = (s: string) =>
    s === "ENABLED"  ? "text-green-700 bg-green-50 border-green-200" :
    s === "PAUSED"   ? "text-amber-700 bg-amber-50 border-amber-200" :
    s === "REMOVED"  ? "text-red-700 bg-red-50 border-red-200" :
                       "text-gray-500 bg-gray-50 border-gray-200"

  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-gray-900 text-left"
      >
        <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">
          Raw Google Ads API — diagnostic
        </span>
        {open
          ? <ChevronDown  size={14} className="text-gray-500" />
          : <ChevronRight size={14} className="text-gray-500" />}
      </button>

      {open && (
        <div className="bg-gray-950 px-5 py-4 space-y-4 font-mono text-xs">

          {/* Account IDs */}
          <div className="space-y-1">
            <p className="text-gray-500 text-[10px] uppercase tracking-wider">Account identifiers</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2">
                <p className="text-gray-500 text-[10px] mb-0.5">customer_id used in GAQL</p>
                <p className="text-green-400">{raw.usedCustomerId}</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2">
                <p className="text-gray-500 text-[10px] mb-0.5">login-customer-id header</p>
                <p className="text-green-400">{raw.usedLoginId ?? "(not set)"}</p>
              </div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2">
              <p className="text-gray-500 text-[10px] mb-0.5">hardcoded CAMPAIGN_ID in code</p>
              <p className="text-yellow-400">{raw.hardcodedId}</p>
            </div>
          </div>

          {/* Error */}
          {raw.error && (
            <div className="bg-red-950 border border-red-800 rounded-lg px-3 py-2">
              <p className="text-red-400 text-[10px] mb-0.5">API error</p>
              <p className="text-red-300 break-all">{raw.error}</p>
            </div>
          )}

          {/* All campaigns returned */}
          <div>
            <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1.5">
              All campaigns in account ({raw.campaigns.length} returned)
            </p>
            {raw.campaigns.length === 0 && !raw.error && (
              <p className="text-gray-600 italic">No campaigns found</p>
            )}
            <div className="space-y-1.5">
              {raw.campaigns.map(c => (
                <div
                  key={c.campaign_id}
                  className={`rounded-lg border px-3 py-2 ${
                    c.campaign_id === raw.hardcodedId
                      ? "border-yellow-600 bg-yellow-950/50"
                      : "border-gray-800 bg-gray-900"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-white truncate">{c.campaign_name}</p>
                      <p className="text-gray-500 text-[10px]">campaign_id: {c.campaign_id}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${statusColor(c.status)}`}>
                        {c.status}
                      </span>
                      {c.campaign_id === raw.hardcodedId && (
                        <span className="text-[9px] bg-yellow-500 text-black px-1.5 py-0.5 rounded font-bold">
                          HARDCODED ID
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Match result */}
          <div className={`rounded-lg border px-3 py-2 ${
            raw.targetedCampaign
              ? "border-gray-700 bg-gray-900"
              : "border-red-800 bg-red-950/30"
          }`}>
            <p className="text-gray-500 text-[10px] mb-0.5">
              Target campaign ({raw.hardcodedId}) found in API response?
            </p>
            {raw.targetedCampaign ? (
              <div>
                <p className="text-green-400">YES — matched</p>
                <p className="text-gray-400 text-[10px]">
                  name=&quot;{raw.targetedCampaign.campaign_name}&quot;
                  &nbsp;status={raw.targetedCampaign.status}
                </p>
              </div>
            ) : (
              <p className="text-red-400">NO — hardcoded ID not found in API response</p>
            )}
          </div>

        </div>
      )}
    </div>
  )
}

// ── Metric card ───────────────────────────────────────────────────────────────

function MetricCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
      <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{label}</p>
      <p className="text-3xl font-bold text-gray-900 leading-none">
        {value === 0 || value === "0" ? <span className="text-gray-300">—</span> : value}
      </p>
      {sub && <p className="text-[11px] text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

// ── Milestone row ─────────────────────────────────────────────────────────────

function MilestoneRow({ label, done }: { label: string; done: boolean }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg ${done ? "bg-green-50" : "bg-gray-50"}`}>
      {done
        ? <CheckCircle2 size={15} className="text-green-500 flex-shrink-0" />
        : <Circle size={15} className="text-gray-300 flex-shrink-0" />}
      <span className={`text-sm font-medium ${done ? "text-green-800" : "text-gray-500"}`}>{label}</span>
      {done && <span className="ml-auto text-xs font-semibold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">Achieved</span>}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function LaunchStatusPage() {
  const [data, setData]           = useState<LaunchStatus | null>(null)
  const [loading, setLoading]     = useState(true)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [error, setError]         = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/growth/launch-status")
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setData(await res.json())
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  // Auto-refresh every 60 s once campaign might be live
  useEffect(() => {
    const t = setInterval(load, 60_000)
    return () => clearInterval(t)
  }, [load])

  const confirm = async (field: string, value: boolean) => {
    setConfirming(field)
    try {
      await fetch("/api/admin/growth/launch-status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field, value }),
      })
      await load()
    } finally {
      setConfirming(null)
    }
  }

  const allChecklistDone = data
    ? Object.values(data.checklist).every(c => c.confirmed)
    : false

  const completedCount = data
    ? Object.values(data.checklist).filter(c => c.confirmed).length
    : 0

  const milestoneDone = data
    ? Object.values(data.milestones).filter(Boolean).length
    : 0

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-5 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
              <Rocket size={15} className="text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900">Launch Status</h1>
              <p className="text-[11px] text-gray-400">
                {data ? `Last checked ${ago(data.checkedAt)}` : "Loading…"}
              </p>
            </div>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      <div className="px-8 py-6 max-w-2xl space-y-6">

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs text-red-700">
            Failed to load: {error}
          </div>
        )}

        {/* Pre-launch checklist */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-800">Pre-launch checklist</h2>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              allChecklistDone
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-500"
            }`}>
              {completedCount}/4 done
            </span>
          </div>

          {loading && !data ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : data ? (
            <div className="space-y-2">
              <CheckRow item={data.checklist.accountFunded}     field="accountFunded"            onConfirm={confirm} confirming={confirming} />
              <CheckRow item={data.checklist.conversionActions} field="conversionActionsCreated"  onConfirm={confirm} confirming={confirming} />
              <CheckRow item={data.checklist.gtmTags}           field="gtmTagsPublished"          onConfirm={confirm} confirming={confirming} />
              <CheckRow item={data.checklist.campaignEnabled}   field="campaignEnabled"           onConfirm={confirm} confirming={confirming} />
            </div>
          ) : null}

          {allChecklistDone && (
            <div className="mt-3 bg-green-50 border border-green-200 rounded-xl p-3 text-xs text-green-700 font-medium text-center">
              ✓ All pre-launch steps complete — campaign is live
            </div>
          )}
        </section>

        {/* Today's metrics */}
        <section>
          <h2 className="text-sm font-bold text-gray-800 mb-3">Today</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricCard
              label="Impressions"
              value={data?.metrics.impressionsToday ?? 0}
              sub={data && !data.checklist.campaignEnabled.confirmed ? "campaign off" : undefined}
            />
            <MetricCard
              label="Clicks"
              value={data?.metrics.clicksToday ?? 0}
              sub={data?.metrics.clicksToday ? `₹${data.metrics.spendToday} spent` : undefined}
            />
            <MetricCard
              label="Leads"
              value={data?.metrics.leadsToday ?? 0}
            />
            <MetricCard
              label="Spend"
              value={data?.metrics.spendToday ? `₹${data.metrics.spendToday}` : 0}
              sub="today"
            />
          </div>
        </section>

        {/* Milestones */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-800">Milestones</h2>
            <span className="text-xs text-gray-400">{milestoneDone}/4 achieved</span>
          </div>
          {loading && !data ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : data ? (
            <div className="space-y-2">
              <MilestoneRow label="First paid click"       done={data.milestones.firstPaidClick} />
              <MilestoneRow label="First attributed lead"  done={data.milestones.firstAttributedLead} />
              <MilestoneRow label="First dealer lead"      done={data.milestones.firstDealerLead} />
              <MilestoneRow label="First OEM lead"         done={data.milestones.firstOEMLead} />
            </div>
          ) : null}
        </section>

        {/* Phase gate */}
        {data && !data.milestones.firstAttributedLead && (
          <section className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-amber-800 mb-1">Phase gate</p>
            <p className="text-xs text-amber-700">
              No new dashboards, intelligence modules, or workflow features until the first attributed lead is recorded.
              Complete the pre-launch checklist above.
            </p>
          </section>
        )}

        {data && data.milestones.firstAttributedLead && !data.milestones.firstDealerLead && (
          <section className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-blue-800 mb-1">Next milestone</p>
            <p className="text-xs text-blue-700">
              First attributed lead recorded. Now targeting first dealer lead and first OEM lead.
              Monitor campaign keyword performance and verify dealer landing pages are converting.
            </p>
          </section>
        )}

        {data && data.milestones.firstDealerLead && data.milestones.firstOEMLead && (
          <section className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-green-800 mb-1">Ready to scale</p>
            <p className="text-xs text-green-700">
              All 4 milestones achieved. Growth OS Phase 3 unlocked — review budget recommendations and expand to Tier 1 states.
            </p>
          </section>
        )}

        {/* Raw API diagnostic — always visible for debugging */}
        {data?.rawApi && (
          <section>
            <RawApiPanel raw={data.rawApi} />
          </section>
        )}

      </div>
    </div>
  )
}
