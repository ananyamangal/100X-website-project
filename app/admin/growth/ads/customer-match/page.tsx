"use client"

import { useEffect, useState, useCallback } from "react"
import {
  Users, Mail, Phone, Upload, Download, RefreshCw,
  CheckCircle, AlertCircle, Clock, XCircle,
  Building2, BarChart2, Loader2, Info, ChevronRight,
} from "lucide-react"
import type { AudienceType, AudienceDoc, QualityScore } from "@/lib/growth-os/customer-match-engine"

// ── Types ─────────────────────────────────────────────────────────────────────

interface AudienceState extends Omit<AudienceDoc, "qualityScore"> {
  qualityScore: QualityScore | null
}

interface AudienceCardProps {
  audience: AudienceState
  selected: boolean
  onClick:  () => void
}

// ── Constants ─────────────────────────────────────────────────────────────────

const AUDIENCE_CONFIG: Record<AudienceType, {
  label:       string
  description: string
  icon:        React.FC<{ size?: number; className?: string }>
  color:       { bg: string; text: string; ring: string; bar: string }
}> = {
  government_buyers: {
    label:       "Government Buyers",
    description: "GeM orgs — needs contact enrichment",
    icon:        Building2,
    color:       { bg: "bg-blue-50",    text: "text-blue-700",    ring: "ring-blue-200",    bar: "bg-blue-500" },
  },
  dealers: {
    label:       "Dealers",
    description: "CRM dealer pipeline",
    icon:        Users,
    color:       { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200", bar: "bg-emerald-500" },
  },
  existing_customers: {
    label:       "Existing Customers",
    description: "100X buyers via GeM — needs enrichment",
    icon:        Building2,
    color:       { bg: "bg-violet-50",  text: "text-violet-700",  ring: "ring-violet-200",  bar: "bg-violet-500" },
  },
  crm_leads: {
    label:       "CRM Leads",
    description: "Brochure + RFQ submissions",
    icon:        Mail,
    color:       { bg: "bg-amber-50",   text: "text-amber-700",   ring: "ring-amber-200",   bar: "bg-amber-500" },
  },
}

const UPLOAD_STATUS_CONFIG = {
  not_uploaded: { label: "Not Uploaded",     icon: AlertCircle,  color: "text-gray-400"   },
  uploading:    { label: "Uploading...",      icon: Loader2,      color: "text-blue-500"   },
  uploaded:     { label: "Live in Google Ads", icon: CheckCircle, color: "text-emerald-600" },
  failed:       { label: "Upload Failed",     icon: XCircle,      color: "text-red-500"    },
}

// ── Audience type tab ─────────────────────────────────────────────────────────

function AudienceCard({ audience, selected, onClick }: AudienceCardProps) {
  const config = AUDIENCE_CONFIG[audience.audienceType]
  const Icon   = config.icon
  const qs     = audience.qualityScore
  const status = UPLOAD_STATUS_CONFIG[audience.uploadStatus] ?? UPLOAD_STATUS_CONFIG.not_uploaded
  const StatusIcon = status.icon

  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left p-4 rounded-xl border transition-all
        ${selected
          ? `${config.color.bg} ${config.color.ring} ring-2 border-transparent`
          : "bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50"
        }
      `}
    >
      <div className="flex items-start justify-between mb-2">
        <div className={`p-1.5 rounded-lg ${selected ? config.color.bg : "bg-gray-100"}`}>
          <Icon size={14} className={selected ? config.color.text : "text-gray-500"} />
        </div>
        <span className={`flex items-center gap-1 text-[10px] font-medium ${status.color}`}>
          <StatusIcon size={10} className={audience.uploadStatus === "uploading" ? "animate-spin" : ""} />
          {status.label}
        </span>
      </div>
      <div className={`text-sm font-semibold mb-0.5 ${selected ? config.color.text : "text-gray-900"}`}>
        {config.label}
      </div>
      <div className="text-[11px] text-gray-500 mb-2">{config.description}</div>
      {qs ? (
        <div className="flex items-center gap-3 text-[11px] text-gray-600">
          <span className="font-medium">{qs.totalRecords.toLocaleString()} records</span>
          <span className="text-gray-300">|</span>
          <span className={`font-semibold ${qs.estimatedMatchRate >= 50 ? "text-emerald-600" : qs.estimatedMatchRate >= 25 ? "text-amber-600" : "text-red-500"}`}>
            ~{qs.estimatedMatchRate}% match
          </span>
        </div>
      ) : (
        <div className="text-[11px] text-gray-400 italic">Not built yet</div>
      )}
    </button>
  )
}

// ── Quality score panel ───────────────────────────────────────────────────────

function QualityPanel({ qs, color }: { qs: QualityScore; color: string }) {
  const emailPct = qs.totalRecords > 0 ? Math.round((qs.withEmail / qs.totalRecords) * 100) : 0
  const phonePct = qs.totalRecords > 0 ? Math.round((qs.withPhone / qs.totalRecords) * 100) : 0
  const bothPct  = qs.totalRecords > 0 ? Math.round((qs.withBoth  / qs.totalRecords) * 100) : 0

  const matchColor = qs.estimatedMatchRate >= 50 ? "text-emerald-700 bg-emerald-50"
    : qs.estimatedMatchRate >= 25 ? "text-amber-700 bg-amber-50"
    : "text-red-700 bg-red-50"

  const barColor = qs.estimatedMatchRate >= 50 ? "bg-emerald-500"
    : qs.estimatedMatchRate >= 25 ? "bg-amber-500"
    : "bg-red-400"

  return (
    <div className="grid grid-cols-1 gap-4">
      {/* Match rate hero */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Estimated Google Match Rate
            </div>
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold ${matchColor}`}>
              ~{qs.estimatedMatchRate}%
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">{qs.totalRecords.toLocaleString()}</div>
            <div className="text-[11px] text-gray-500">total records</div>
          </div>
        </div>

        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${barColor} rounded-full transition-all duration-700`}
            style={{ width: `${Math.max(2, qs.estimatedMatchRate)}%` }}
          />
        </div>
        <div className="mt-1.5 text-[10px] text-gray-400">{qs.matchBasis} · Google typically matches 35–60% of valid emails</div>
      </div>

      {/* Email / Phone / Both */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "With Email", value: qs.withEmail, pct: emailPct, Icon: Mail,  badge: `${emailPct}%` },
          { label: "With Phone", value: qs.withPhone, pct: phonePct, Icon: Phone, badge: `${phonePct}%` },
          { label: "With Both",  value: qs.withBoth,  pct: bothPct,  Icon: Users, badge: `${bothPct}%` },
        ].map(({ label, value, pct, Icon, badge }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <Icon size={12} className="text-gray-400" />
              <span className="text-[10px] font-bold text-gray-500">{badge}</span>
            </div>
            <div className="text-xl font-bold text-gray-900">{value.toLocaleString()}</div>
            <div className="text-[11px] text-gray-500 mt-0.5">{label}</div>
            <div className="mt-2 h-1 bg-gray-100 rounded-full">
              <div className={`h-1 ${color} rounded-full`} style={{ width: `${Math.max(2, pct)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Enrichment panel ──────────────────────────────────────────────────────────

function EnrichmentPanel({ qs }: { qs: QualityScore }) {
  const rows = [
    { label: "Missing Email",       count: qs.missingEmail, flag: "incomplete_email", color: "bg-amber-400" },
    { label: "Missing Phone",       count: qs.missingPhone, flag: "incomplete_phone", color: "bg-orange-400" },
    { label: "Missing Both",        count: qs.missingBoth,  flag: "incomplete_both",  color: "bg-red-400" },
  ]
  const maxVal = Math.max(...rows.map(r => r.count), 1)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Info size={13} className="text-amber-500" />
        <span className="text-sm font-semibold text-gray-800">Enrichment Status</span>
        <span className="text-[10px] text-gray-400 ml-auto">Records needing contact data</span>
      </div>

      <div className="space-y-3">
        {rows.map(({ label, count, color }) => (
          <div key={label}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[12px] text-gray-600">{label}</span>
              <span className="text-[12px] font-semibold text-gray-900">{count.toLocaleString()}</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full">
              <div
                className={`h-1.5 ${color} rounded-full transition-all duration-500`}
                style={{ width: `${Math.max(2, (count / maxVal) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {qs.missingBoth > 0 && (
        <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-100">
          <p className="text-[11px] text-amber-700 leading-relaxed">
            <strong>{qs.missingBoth.toLocaleString()} records</strong> have neither email nor phone and will not be
            included in the Google Customer Match upload. Enrich these records to improve match rate.
          </p>
        </div>
      )}
    </div>
  )
}

// ── Upload status tracker ─────────────────────────────────────────────────────

function UploadTracker({ audience }: { audience: AudienceState }) {
  const steps = [
    { key: "not_uploaded", label: "Not Uploaded" },
    { key: "uploading",    label: "Uploading" },
    { key: "uploaded",     label: "Live in Google Ads" },
  ]
  const current = audience.uploadStatus === "failed" ? "not_uploaded" : audience.uploadStatus

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="text-sm font-semibold text-gray-800 mb-4">Upload Status</div>

      <div className="flex items-center gap-2">
        {steps.map((step, i) => {
          const stepIdx   = steps.findIndex(s => s.key === current)
          const isDone    = i < stepIdx
          const isActive  = step.key === current
          return (
            <div key={step.key} className="flex items-center gap-2 flex-1">
              <div className={`
                flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold
                ${isDone ? "bg-emerald-500 text-white"
                  : isActive && audience.uploadStatus === "uploading" ? "bg-blue-500 text-white"
                  : isActive ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-400"
                }
              `}>
                {isDone ? <CheckCircle size={12} /> : i + 1}
              </div>
              <span className={`text-[11px] font-medium ${
                isDone ? "text-emerald-600"
                : isActive ? "text-gray-900"
                : "text-gray-400"
              }`}>
                {step.label}
              </span>
              {i < steps.length - 1 && (
                <ChevronRight size={10} className="text-gray-300 flex-shrink-0" />
              )}
            </div>
          )
        })}
      </div>

      {audience.uploadStatus === "failed" && audience.uploadError && (
        <div className="mt-3 p-2 bg-red-50 rounded-lg border border-red-100">
          <p className="text-[11px] text-red-600">{audience.uploadError}</p>
        </div>
      )}

      {audience.uploadStatus === "uploaded" && (
        <div className="mt-3 text-[11px] text-emerald-700 bg-emerald-50 rounded-lg p-2 border border-emerald-100">
          Audience is live in Google Ads. Google processes Customer Match lists within 6–48 hours before serving.
          {audience.lastUploadedAt && (
            <span className="block text-gray-400 mt-0.5">
              Last uploaded: {new Date(audience.lastUploadedAt).toLocaleString()}
            </span>
          )}
        </div>
      )}

      {audience.googleUserListResource && (
        <div className="mt-3 text-[10px] text-gray-400 font-mono break-all">
          {audience.googleUserListResource}
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CustomerMatchPage() {
  const [audiences,    setAudiences]    = useState<AudienceState[]>([])
  const [selected,     setSelected]     = useState<AudienceType>("crm_leads")
  const [loading,      setLoading]      = useState(true)
  const [building,          setBuilding]          = useState<AudienceType | null>(null)
  const [exporting,         setExporting]         = useState<"full" | "google" | "hashed" | null>(null)
  const [uploading,         setUploading]         = useState(false)
  const [msg,          setMsg]          = useState<{ text: string; type: "ok" | "err" } | null>(null)

  const flash = (text: string, type: "ok" | "err" = "ok") => {
    setMsg({ text, type })
    setTimeout(() => setMsg(null), 5000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch("/api/admin/growth/ads/customer-match")
      const data = await res.json() as { audiences: AudienceState[] }
      setAudiences(data.audiences ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const currentAudience = audiences.find(a => a.audienceType === selected)
  const config = AUDIENCE_CONFIG[selected]
  const qs = currentAudience?.qualityScore ?? null

  async function handleBuild(type: AudienceType) {
    setBuilding(type)
    try {
      const res  = await fetch("/api/admin/growth/ads/customer-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audienceType: type }),
      })
      const data = await res.json()
      if (!res.ok) { flash(data.error ?? "Build failed", "err"); return }
      flash(`Audience built: ${data.recordCount.toLocaleString()} records, ~${data.qualityScore?.estimatedMatchRate ?? 0}% match rate`)
      await load()
    } finally {
      setBuilding(null)
    }
  }

  async function handleExport(audienceId: string, format: "full" | "google" | "hashed") {
    setExporting(format)
    try {
      const res = await fetch(`/api/admin/growth/ads/customer-match/${audienceId}/export?format=${format}`)
      if (!res.ok) { flash("Export failed", "err"); return }
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement("a")
      a.href     = url
      const date = new Date().toISOString().split("T")[0]
      a.download = format === "full"
        ? `customer_match_full_${audienceId}_${date}.csv`
        : format === "hashed"
          ? `customer_match_hashed_${audienceId}_${date}.csv`
          : `customer_match_google_${audienceId}_${date}.csv`
      a.click()
      URL.revokeObjectURL(url)
      flash(
        format === "full"    ? "Full CSV downloaded — all fields for CRM import or analysis" :
        format === "hashed"  ? "Hashed CSV downloaded — for Google Ads API upload only" :
                               "Google Customer Match CSV downloaded — upload via Google Ads UI"
      )
    } finally {
      setExporting(null)
    }
  }

  async function handleUpload(audienceId: string) {
    if (!confirm("Upload this audience directly to Google Ads? This requires a connected Google Ads account.")) return
    setUploading(true)
    try {
      const res  = await fetch(`/api/admin/growth/ads/customer-match/${audienceId}/upload`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) { flash(data.error ?? "Upload failed", "err"); return }
      flash(`Uploaded ${data.recordsUploaded?.toLocaleString() ?? "0"} records to Google Ads. Processing takes 6–48 hours.`)
      await load()
    } finally {
      setUploading(false)
    }
  }

  const ALL_TYPES: AudienceType[] = ["government_buyers", "dealers", "existing_customers", "crm_leads"]

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Customer Match Engine</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Build Google-compliant audiences from your CRM, dealer pipeline, and GeM data
            </p>
          </div>
          <div className="flex items-center gap-2">
            {msg && (
              <span className={`text-[12px] px-3 py-1.5 rounded-lg border ${
                msg.type === "ok"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-red-50 text-red-700 border-red-200"
              }`}>
                {msg.text}
              </span>
            )}
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>

        {/* Audience type grid */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {ALL_TYPES.map(type => {
            const audience = audiences.find(a => a.audienceType === type) ?? {
              audienceId:   `cm_${type}`,
              audienceType: type,
              displayName:  AUDIENCE_CONFIG[type].label,
              qualityScore: null,
              uploadStatus: "not_uploaded" as const,
              lastBuiltAt:  null,
            }
            return (
              <AudienceCard
                key={type}
                audience={audience}
                selected={selected === type}
                onClick={() => setSelected(type)}
              />
            )
          })}
        </div>

        {/* Selected audience detail */}
        <div className="grid grid-cols-5 gap-4">

          {/* Left: quality + enrichment (3 cols) */}
          <div className="col-span-3 space-y-4">

            {/* Section header */}
            <div className="flex items-center justify-between">
              <h2 className={`text-base font-bold ${config.color.text}`}>
                {config.label}
              </h2>
              <span className="text-[11px] text-gray-500">{config.description}</span>
            </div>

            {qs ? (
              <>
                <QualityPanel qs={qs} color={config.color.bar} />
                <EnrichmentPanel qs={qs} />
              </>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <BarChart2 size={28} className="mx-auto text-gray-300 mb-3" />
                <p className="text-sm font-medium text-gray-600 mb-1">Audience not built yet</p>
                <p className="text-[12px] text-gray-400 mb-4">
                  Click "Rebuild Audience" to calculate quality score and enrichment status
                </p>
                <button
                  onClick={() => handleBuild(selected)}
                  disabled={building === selected}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${config.color.bar} hover:opacity-90 disabled:opacity-50`}
                >
                  {building === selected
                    ? <><Loader2 size={13} className="animate-spin" /> Building...</>
                    : <><RefreshCw size={13} /> Build Audience</>
                  }
                </button>
              </div>
            )}
          </div>

          {/* Right: actions + status (2 cols) */}
          <div className="col-span-2 space-y-4">

            {/* Actions */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="text-sm font-semibold text-gray-800 mb-4">Actions</div>

              <div className="space-y-2">
                <button
                  onClick={() => handleBuild(selected)}
                  disabled={building === selected}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
                >
                  {building === selected
                    ? <Loader2 size={14} className="animate-spin" />
                    : <RefreshCw size={14} />
                  }
                  {building === selected ? "Building..." : "Rebuild Audience"}
                </button>

                {/* Export CSV — all fields */}
                <button
                  onClick={() => handleExport(currentAudience?.audienceId ?? `cm_${selected}`, "full")}
                  disabled={!qs || exporting !== null}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {exporting === "full"
                    ? <Loader2 size={14} className="animate-spin" />
                    : <Download size={14} />
                  }
                  Export CSV
                </button>

                {/* Export Google Customer Match CSV — 6-field format */}
                <button
                  onClick={() => handleExport(currentAudience?.audienceId ?? `cm_${selected}`, "google")}
                  disabled={!qs || exporting !== null}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {exporting === "google"
                    ? <Loader2 size={14} className="animate-spin" />
                    : <Download size={14} />
                  }
                  Export Google Customer Match CSV
                </button>

                <button
                  onClick={() => handleUpload(currentAudience?.audienceId ?? `cm_${selected}`)}
                  disabled={!qs || uploading || qs.withEmail + qs.withPhone === 0}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  {uploading
                    ? <Loader2 size={14} className="animate-spin" />
                    : <Upload size={14} />
                  }
                  Create Audience in Google Ads
                </button>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 space-y-1.5 text-[11px] text-gray-500">
                <p>• <strong>Export CSV</strong> — all fields: name, email, phone, company, state, designation, source, etc.</p>
                <p>• <strong>Google Customer Match CSV</strong> — 6 fields for Google Ads UI upload</p>
                <p>• <strong>Create Audience</strong> — direct API upload (requires connected Google Ads account)</p>
                <p>• Google processes uploaded lists within <strong>6–48 hours</strong></p>
              </div>
            </div>

            {/* Upload tracker */}
            {currentAudience && <UploadTracker audience={currentAudience} />}

            {/* Audience quality summary */}
            {qs && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="text-sm font-semibold text-gray-800 mb-3">Google Match Quality</div>
                <div className="space-y-2">
                  {[
                    {
                      label: "Audience Size",
                      value: qs.totalRecords.toLocaleString(),
                      ok: qs.totalRecords >= 1000,
                      note: qs.totalRecords < 1000 ? "Google requires ≥1,000 records" : "Meets minimum",
                    },
                    {
                      label: "Records With Email",
                      value: `${qs.withEmail.toLocaleString()} (${qs.totalRecords > 0 ? Math.round((qs.withEmail / qs.totalRecords) * 100) : 0}%)`,
                      ok: qs.withEmail >= 500,
                      note: qs.withEmail < 500 ? "Email enrichment needed" : "Good email coverage",
                    },
                    {
                      label: "Records With Phone",
                      value: `${qs.withPhone.toLocaleString()} (${qs.totalRecords > 0 ? Math.round((qs.withPhone / qs.totalRecords) * 100) : 0}%)`,
                      ok: qs.withPhone >= 500,
                      note: qs.withPhone < 500 ? "Phone enrichment needed" : "Good phone coverage",
                    },
                    {
                      label: "Est. Match Rate",
                      value: `~${qs.estimatedMatchRate}%`,
                      ok: qs.estimatedMatchRate >= 40,
                      note: qs.matchBasis,
                    },
                  ].map(({ label, value, ok, note }) => (
                    <div key={label} className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-1.5 text-[12px] text-gray-600 min-w-0">
                        {ok
                          ? <CheckCircle size={11} className="text-emerald-500 flex-shrink-0" />
                          : <Clock       size={11} className="text-amber-500 flex-shrink-0"   />
                        }
                        {label}
                      </div>
                      <div className="text-right">
                        <div className="text-[12px] font-semibold text-gray-900">{value}</div>
                        <div className="text-[10px] text-gray-400">{note}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Bottom info strip */}
        <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
          <div className="flex gap-3">
            <Info size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-[12px] text-blue-700 space-y-1">
              <p>
                <strong>Export CSV</strong> downloads all available fields (name, company, email, phone, state,
                designation, GeM status, lead score, etc.) — suitable for CRM import, analysis, or sharing.
              </p>
              <p>
                <strong>Export Google Customer Match CSV</strong> downloads a 6-field CSV
                (Email, Phone, First Name, Last Name, Country, Zip) formatted for direct upload via the Google Ads UI.
                Google hashes the data automatically on their end.
              </p>
              <p>
                Audiences with <strong>only organization names</strong> (Government Buyers, Existing Customers)
                have 0% match rate without personal contact enrichment. Collect official procurement contact
                emails from GeM portals or tender documents to unlock these audiences.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
