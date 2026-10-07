"use client"

import { useState, useCallback } from "react"
import Link from "next/link"
import {
  CheckCircle2, AlertTriangle, HelpCircle, XCircle,
  RefreshCw, ChevronDown, ChevronRight, Download,
  ExternalLink, Zap, Activity,
} from "lucide-react"

// ─────────────────────────────────────────────────────────────────────────────
// Types (mirrors the API response)
// ─────────────────────────────────────────────────────────────────────────────
type Status = "VERIFIED" | "PARTIALLY_VERIFIED" | "UNVERIFIED" | "BROKEN"

interface Issue {
  severity: "critical" | "warning" | "info"
  code: string
  message: string
  fix?: string
}

interface SystemDiagnostic {
  system: string
  key: string
  status: Status
  headline: string
  issues: Issue[]
  metrics: Record<string, unknown>
}

interface DiagnosticReport {
  checkedAt: string
  summary: { verified: number; partiallyVerified: number; unverified: number; broken: number; total: number }
  systems: SystemDiagnostic[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Style config
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_CFG: Record<Status, {
  label: string
  icon: typeof CheckCircle2
  chip: string
  card: string
  dot: string
}> = {
  VERIFIED:           { label: "VERIFIED",          icon: CheckCircle2,  chip: "bg-emerald-900/60 text-emerald-300 border-emerald-700",  card: "border-emerald-800/40",  dot: "bg-emerald-400" },
  PARTIALLY_VERIFIED: { label: "PARTIALLY VERIFIED", icon: AlertTriangle, chip: "bg-amber-900/60 text-amber-300 border-amber-700",        card: "border-amber-800/40",    dot: "bg-amber-400"   },
  UNVERIFIED:         { label: "UNVERIFIED",         icon: HelpCircle,    chip: "bg-gray-800 text-gray-400 border-gray-700",              card: "border-gray-700/40",     dot: "bg-gray-500"    },
  BROKEN:             { label: "BROKEN",             icon: XCircle,       chip: "bg-red-900/60 text-red-400 border-red-700",              card: "border-red-800/50",      dot: "bg-red-500"     },
}

const SEV_CFG: Record<Issue["severity"], { icon: string; text: string }> = {
  critical: { icon: "✗", text: "text-red-400"    },
  warning:  { icon: "⚠", text: "text-amber-400"  },
  info:     { icon: "ℹ", text: "text-gray-400"   },
}

// Quick nav links per system
const SYSTEM_LINKS: Record<string, Array<{ label: string; href: string }>> = {
  ga4:                [{ label: "Analytics Setup", href: "/admin/growth/analytics/setup" }],
  gtm:                [{ label: "Download GTM JSON", href: "#gtm-download" }],
  ads_api:            [{ label: "Ads Setup", href: "/admin/growth/ads/setup" }],
  conversion_tracking:[{ label: "Configure Labels ↓", href: "#conversion-config" }],
  whatsapp_conversion:[{ label: "Conversion Labels ↓", href: "#conversion-config" }],
  conversion_linker:  [{ label: "Download GTM JSON ↓", href: "#gtm-download" }],
  customer_match:     [{ label: "Customer Match", href: "/admin/growth/ads/customer-match" }],
  search_console:     [{ label: "SEO Setup", href: "/admin/growth/seo" }],
  ads_monitoring:     [{ label: "Monitoring Dashboard", href: "/admin/growth/ads/monitoring" }],
  revenue_attribution:[{ label: "Revenue Director", href: "/admin/growth/ads/revenue" }],
}

// ─────────────────────────────────────────────────────────────────────────────
// Components
// ─────────────────────────────────────────────────────────────────────────────
function StatusChip({ status }: { status: Status }) {
  const cfg = STATUS_CFG[status]
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-bold tracking-widest ${cfg.chip}`}>
      <Icon size={10} />
      {cfg.label}
    </span>
  )
}

function IssueRow({ issue }: { issue: Issue }) {
  const [expanded, setExpanded] = useState(false)
  const cfg = SEV_CFG[issue.severity]
  return (
    <div className="space-y-0.5">
      <button onClick={() => issue.fix && setExpanded(!expanded)}
        className={`flex items-start gap-2 text-left w-full ${issue.fix ? "cursor-pointer" : "cursor-default"}`}>
        <span className={`mt-0.5 text-[11px] font-bold shrink-0 ${cfg.text}`}>{cfg.icon}</span>
        <span className={`text-[12px] leading-snug ${cfg.text}`}>{issue.message}</span>
        {issue.fix && <span className="ml-auto shrink-0">{expanded ? <ChevronDown size={12} className="text-gray-500" /> : <ChevronRight size={12} className="text-gray-600" />}</span>}
      </button>
      {expanded && issue.fix && (
        <div className="ml-5 text-[11px] text-gray-400 bg-gray-900 border border-gray-700 rounded p-2">
          <span className="text-gray-500 font-medium mr-1">Fix:</span>{issue.fix}
        </div>
      )}
    </div>
  )
}

function SystemCard({ sys, onAction }: { sys: SystemDiagnostic; onAction?: () => void }) {
  const [open, setOpen] = useState(sys.status === "BROKEN" || sys.status === "PARTIALLY_VERIFIED")
  const cfg = STATUS_CFG[sys.status]
  const links = SYSTEM_LINKS[sys.key] ?? []

  return (
    <div className={`bg-gray-900 border rounded-lg overflow-hidden ${cfg.card}`}>
      <button onClick={() => setOpen(!open)} className="w-full text-left p-4 flex items-start gap-3 hover:bg-gray-800/40 transition-colors">
        <span className={`mt-1 h-2 w-2 rounded-full shrink-0 ${cfg.dot}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-white">{sys.system}</span>
            <StatusChip status={sys.status} />
          </div>
          <p className="text-[12px] text-gray-400 mt-0.5 leading-snug">{sys.headline}</p>
        </div>
        <span className="shrink-0 text-gray-600">{open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
      </button>

      {open && (
        <div className="border-t border-gray-800 px-4 pb-4 pt-3 space-y-3">
          {sys.issues.length > 0 && (
            <div className="space-y-2">
              {sys.issues.map((issue) => <IssueRow key={issue.code} issue={issue} />)}
            </div>
          )}

          {links.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {links.map(l => (
                l.href.startsWith("#") ? (
                  <a key={l.href} href={l.href} className="text-[11px] text-indigo-400 hover:text-indigo-200 border border-indigo-800 rounded px-2 py-0.5 transition-colors"
                    onClick={() => onAction?.()}>
                    {l.label}
                  </a>
                ) : (
                  <Link key={l.href} href={l.href} className="text-[11px] text-indigo-400 hover:text-indigo-200 border border-indigo-800 rounded px-2 py-0.5 transition-colors">
                    {l.label} <ExternalLink size={9} className="inline ml-0.5" />
                  </Link>
                )
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Conversion Label Config Form
// ─────────────────────────────────────────────────────────────────────────────
const ACTIONS_ORDER = ["RFQ Submit", "WhatsApp Click", "Phone Click", "Dealer Application", "OEM Authorization"]

function ConversionLabelForm({ current, onSaved }: {
  current?: DiagnosticReport["systems"][number] | undefined
  onSaved: () => void
}) {
  const existing = (current?.metrics?.actions as Array<{ name: string; configured: boolean }>) ?? []
  const savedAwId = String(current?.metrics?.awConversionId ?? "")

  const [awId,    setAwId]    = useState(savedAwId.includes("REPLACE") ? "" : savedAwId)
  const [labels,  setLabels]  = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {}
    for (const a of existing) m[a.name] = a.configured ? "" : ""
    return m
  })
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState("")
  const [success, setSuccess] = useState("")

  async function handleSave() {
    if (!awId.match(/^AW-\d+$/)) { setError("AW Conversion ID must be AW-XXXXXXXXX (digits only after AW-)"); return }
    const actions = ACTIONS_ORDER
      .filter(name => labels[name])
      .map(name => ({ name, conversionLabel: labels[name] }))

    setSaving(true); setError(""); setSuccess("")
    try {
      const r = await fetch("/api/admin/growth/ads/conversion-actions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ awConversionId: awId, actions }),
      })
      const data = await r.json() as { ok?: boolean; error?: string; configured?: number; total?: number }
      if (!r.ok) throw new Error(data.error ?? "Save failed")
      setSuccess(`Saved ${data.configured}/${data.total} labels. Refresh diagnostics to see updated status.`)
      onSaved()
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div id="conversion-config" className="bg-gray-950 border border-red-900/50 rounded-xl p-6 space-y-5">
      <div>
        <h3 className="text-base font-semibold text-white">Configure Conversion Labels</h3>
        <p className="text-[12px] text-gray-400 mt-1">
          Find these in Google Ads → Goals → Conversions → [action] → Tag setup → copy the <code className="bg-gray-800 px-1 rounded text-gray-300">AW-XXXXXXXXX/LABEL</code> value.
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-[11px] text-gray-400 uppercase tracking-wide">AW Conversion ID</label>
          <input value={awId} onChange={e => setAwId(e.target.value)} placeholder="AW-123456789"
            className="mt-1 w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm text-white font-mono placeholder-gray-600 focus:outline-none focus:border-indigo-500" />
        </div>

        <div className="grid grid-cols-1 gap-2">
          {ACTIONS_ORDER.map(name => (
            <div key={name} className="flex items-center gap-3">
              <span className="text-[11px] text-gray-400 w-44 shrink-0">{name}</span>
              <input value={labels[name] ?? ""} onChange={e => setLabels(p => ({ ...p, [name]: e.target.value }))}
                placeholder="e.g. abc123XYZ456"
                className="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-sm text-white font-mono placeholder-gray-600 focus:outline-none focus:border-indigo-500" />
            </div>
          ))}
        </div>
      </div>

      {error   && <p className="text-[12px] text-red-400">{error}</p>}
      {success && <p className="text-[12px] text-emerald-400">{success}</p>}

      <div className="flex items-center gap-3">
        <button onClick={handleSave} disabled={saving || !awId}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded-lg font-medium transition-colors">
          {saving ? "Saving…" : "Save Labels"}
        </button>
        <p className="text-[11px] text-gray-500">Saves to DB. Download Updated GTM JSON will appear when all labels are saved.</p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// GTM Download Banner
// ─────────────────────────────────────────────────────────────────────────────
function GTMDownloadBanner({ report }: { report: DiagnosticReport }) {
  const convSystem = report.systems.find(s => s.key === "conversion_tracking")
  if (!convSystem || convSystem.status === "BROKEN") return null

  return (
    <div id="gtm-download" className="bg-gray-950 border border-emerald-800/50 rounded-xl p-5 flex items-start gap-4">
      <Download size={20} className="text-emerald-400 mt-0.5 shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-white">Download Updated GTM Container</p>
        <p className="text-[12px] text-gray-400 mt-0.5">
          Conversion labels are configured. Download the regenerated GTM JSON and import it into your GTM workspace.
        </p>
        <a href="/api/admin/growth/ads/conversion-actions/gtm-export" download
          className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-sm rounded-lg font-medium transition-colors">
          <Download size={14} />
          Download gtm-100xcircle.json
        </a>
        <p className="text-[11px] text-gray-500 mt-2">
          After downloading: GTM → Admin → Import Container → choose file → Existing workspace → Merge → Publish.
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────
export default function DiagnosticsPage() {
  const [report,   setReport]   = useState<DiagnosticReport | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState("")
  const [loaded,   setLoaded]   = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true); setError("")
    try {
      const r = await fetch("/api/admin/growth/diagnostics")
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      setReport(await r.json() as DiagnosticReport)
      setLoaded(true)
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e))
    } finally {
      setLoading(false)
    }
  }, [])

  // auto-load on mount
  useState(() => { refresh() })

  const sum = report?.summary

  const convSystem = report?.systems.find(s => s.key === "conversion_tracking")
  const showConvForm = convSystem?.status === "BROKEN" || (loaded && convSystem?.status === "PARTIALLY_VERIFIED")

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] text-gray-500 mb-1">
            <Link href="/admin/growth/ads" className="hover:text-gray-300">Ads</Link>
            <span>/</span>
            <span>Diagnostics</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Growth OS Diagnostics</h1>
          <p className="text-sm text-gray-400 mt-1">Production-grade health check — every system classified.</p>
        </div>
        <button onClick={refresh} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-sm text-white rounded-lg disabled:opacity-50 transition-colors shrink-0">
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          {loading ? "Checking…" : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-700 text-red-400 text-sm rounded-lg p-4">{error}</div>
      )}

      {/* Summary strip */}
      {sum && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "VERIFIED",          count: sum.verified,          cls: "border-emerald-800/50 text-emerald-400", dot: "bg-emerald-500" },
            { label: "PARTIALLY VERIFIED",count: sum.partiallyVerified,  cls: "border-amber-800/50 text-amber-400",    dot: "bg-amber-500"   },
            { label: "UNVERIFIED",        count: sum.unverified,        cls: "border-gray-700 text-gray-400",          dot: "bg-gray-500"    },
            { label: "BROKEN",            count: sum.broken,            cls: "border-red-800/50 text-red-400",         dot: "bg-red-500"     },
          ].map(s => (
            <div key={s.label} className={`bg-gray-900 border rounded-lg p-3 flex items-center gap-3 ${s.cls}`}>
              <span className={`h-2.5 w-2.5 rounded-full ${s.dot} shrink-0`} />
              <div>
                <div className="text-xl font-bold">{s.count}</div>
                <div className={`text-[9px] tracking-widest font-semibold opacity-70`}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* System grid */}
      {report && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {report.systems.map(sys => (
            <SystemCard key={sys.key} sys={sys} onAction={refresh} />
          ))}
        </div>
      )}

      {/* Loading placeholder */}
      {loading && !report && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-lg h-20 animate-pulse" />
          ))}
        </div>
      )}

      {/* GTM download (shows when labels configured) */}
      {report && <GTMDownloadBanner report={report} />}

      {/* Conversion label entry form */}
      {loaded && (
        <div className={showConvForm ? "block" : "hidden"}>
          <div className="flex items-center gap-2 mb-3">
            <Zap size={16} className="text-red-400" />
            <h2 className="text-base font-semibold text-white">Fix: Configure Conversion Labels</h2>
            <span className="text-[10px] bg-red-900/50 text-red-400 border border-red-800 rounded px-1.5 py-0.5 font-bold">REQUIRED</span>
          </div>
          <p className="text-[12px] text-gray-400 mb-4">
            Without these, Google Ads cannot attribute any leads, WhatsApp clicks, or phone calls to your campaigns. Revenue optimisation is blind.
          </p>
          <ConversionLabelForm current={convSystem} onSaved={refresh} />
        </div>
      )}

      {/* Checked timestamp */}
      {report && (
        <p className="text-[11px] text-gray-600 text-right">
          <Activity size={10} className="inline mr-1" />
          Last checked: {new Date(report.checkedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST
        </p>
      )}
    </div>
  )
}
