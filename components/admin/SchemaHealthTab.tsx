"use client"

import { useState, useEffect, useCallback } from "react"
import {
  CheckCircle, XCircle, AlertTriangle, RefreshCw, Loader2,
  ChevronDown, ChevronUp, ExternalLink, Shield, Play,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import type { SchemaHealthReport, PageAuditResult, SchemaItemResult, ValidationIssue } from "@/lib/seo/schemaHealthAuditor"

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: number | string; color: "green" | "red" | "amber" | "gray" }) {
  const colors = {
    green: "text-emerald-600 bg-emerald-50 border-emerald-200",
    red:   "text-red-600 bg-red-50 border-red-200",
    amber: "text-amber-600 bg-amber-50 border-amber-200",
    gray:  "text-gray-700 bg-gray-50 border-gray-200",
  }
  return (
    <div className={`border rounded-xl px-4 py-4 ${colors[color]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70 mb-1">{label}</p>
      <p className="text-3xl font-black">{value}</p>
    </div>
  )
}

function IssuePill({ issue }: { issue: ValidationIssue }) {
  return (
    <div className={`flex items-start gap-2 text-xs px-3 py-2 rounded-lg border ${
      issue.severity === "critical"
        ? "bg-red-50 border-red-200 text-red-800"
        : "bg-amber-50 border-amber-200 text-amber-800"
    }`}>
      {issue.severity === "critical"
        ? <XCircle size={13} className="mt-0.5 flex-shrink-0" />
        : <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />}
      <div>
        <span className="font-mono font-semibold">{issue.field}</span>
        <span className="ml-1 opacity-80">— {issue.message}</span>
      </div>
    </div>
  )
}

function SchemaRow({ schema }: { schema: SchemaItemResult }) {
  const [open, setOpen] = useState(!schema.valid)
  const criticals = schema.issues.filter(i => i.severity === "critical")
  const warnings  = schema.issues.filter(i => i.severity === "warning")

  return (
    <div className={`border rounded-xl overflow-hidden ${schema.valid ? "border-emerald-200" : "border-red-200"}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
          schema.valid ? "bg-emerald-50 hover:bg-emerald-100" : "bg-red-50 hover:bg-red-100"
        }`}
      >
        {schema.valid
          ? <CheckCircle size={15} className="text-emerald-600 flex-shrink-0" />
          : <XCircle     size={15} className="text-red-600 flex-shrink-0" />}
        <span className={`text-sm font-semibold ${schema.valid ? "text-emerald-900" : "text-red-900"}`}>
          {schema.type}
        </span>
        <span className="text-xs text-gray-500 truncate flex-1">{schema.label}</span>
        {criticals.length > 0 && (
          <span className="text-xs font-semibold text-red-700 bg-red-100 border border-red-200 px-1.5 py-0.5 rounded">
            {criticals.length} error{criticals.length > 1 ? "s" : ""}
          </span>
        )}
        {warnings.length > 0 && (
          <span className="text-xs font-semibold text-amber-700 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded">
            {warnings.length} warn
          </span>
        )}
        {open ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
      </button>
      {open && schema.issues.length > 0 && (
        <div className="px-4 py-3 bg-white border-t border-gray-100 space-y-2">
          {schema.issues.map((issue, i) => <IssuePill key={i} issue={issue} />)}
        </div>
      )}
      {open && schema.issues.length === 0 && (
        <div className="px-4 py-3 bg-white border-t border-gray-100">
          <p className="text-xs text-emerald-700 flex items-center gap-1.5">
            <CheckCircle size={12} /> All required and recommended fields present
          </p>
        </div>
      )}
    </div>
  )
}

function PageRow({ page }: { page: PageAuditResult }) {
  const [open, setOpen] = useState(page.invalidSchemas > 0)
  const slug = page.url.replace("https://www.100xcircle.com", "") || "/"

  const statusColor = !page.fetchOk
    ? "border-gray-300 bg-gray-50"
    : page.invalidSchemas > 0
      ? "border-red-200 bg-red-50"
      : "border-emerald-200 bg-emerald-50"

  return (
    <div className={`border rounded-xl overflow-hidden ${statusColor}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:brightness-95 transition-all"
      >
        {!page.fetchOk ? (
          <AlertTriangle size={15} className="text-gray-400 flex-shrink-0" />
        ) : page.invalidSchemas > 0 ? (
          <XCircle size={15} className="text-red-600 flex-shrink-0" />
        ) : (
          <CheckCircle size={15} className="text-emerald-600 flex-shrink-0" />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900 truncate">{slug}</span>
            <span className="text-xs text-gray-400 capitalize flex-shrink-0">{page.pageType}</span>
          </div>
          {page.duplicateTypes.length > 0 && (
            <p className="text-xs text-red-700 mt-0.5">
              Duplicate schema types: {page.duplicateTypes.join(", ")}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {page.fetchOk ? (
            <>
              <span className="text-xs text-emerald-700 font-semibold">{page.validSchemas} valid</span>
              {page.invalidSchemas > 0 && (
                <span className="text-xs text-red-700 font-semibold">{page.invalidSchemas} invalid</span>
              )}
              {page.criticalCount > 0 && (
                <span className="text-xs bg-red-600 text-white font-bold px-1.5 py-0.5 rounded">
                  {page.criticalCount} critical
                </span>
              )}
            </>
          ) : (
            <span className="text-xs text-gray-500">fetch failed</span>
          )}
          <a
            href={page.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="text-gray-400 hover:text-blue-600 transition-colors"
          >
            <ExternalLink size={13} />
          </a>
          {open ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-gray-200 bg-white px-4 py-3 space-y-2">
          {page.schemas.length === 0 ? (
            <p className="text-xs text-gray-500">No validated schemas found on this page.</p>
          ) : (
            page.schemas.map((s, i) => <SchemaRow key={i} schema={s} />)
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main tab ─────────────────────────────────────────────────────────────────

export function SchemaHealthTab() {
  const [data, setData] = useState<SchemaHealthReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<"all" | "invalid" | "valid">("all")

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/schema-health")
      if (!res.ok) throw new Error("Failed to load schema health data")
      const json = await res.json()
      if (json.message) {
        setData(null)
      } else {
        setData(json as SchemaHealthReport)
      }
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  async function handleRunAudit() {
    setRunning(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/schema-health", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trigger: "manual" }),
      })
      if (!res.ok) throw new Error("Audit run failed")
      setData(await res.json())
    } catch (e) {
      setError(String(e))
    } finally {
      setRunning(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-12 text-center space-y-3">
        <p className="text-red-600 font-medium">{error}</p>
        <Button onClick={loadData} variant="outline" size="sm">Retry</Button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Schema Health Audit</h2>
          <p className="text-sm text-gray-500 mt-1">
            Google Rich Results field-level validation · Product, FAQPage, Article, Organization, BreadcrumbList
          </p>
          {data && (
            <p className="text-xs text-gray-400 mt-0.5">
              Last run: {new Date(data.auditedAt).toLocaleString()} · trigger: {data.trigger}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={loadData} variant="outline" size="sm" disabled={running}>
            <RefreshCw size={14} className="mr-1.5" /> Refresh
          </Button>
          <Button
            onClick={handleRunAudit}
            size="sm"
            disabled={running}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {running
              ? <><Loader2 size={14} className="mr-1.5 animate-spin" /> Running…</>
              : <><Play size={14} className="mr-1.5" /> Run Audit</>}
          </Button>
        </div>
      </div>

      {/* First run state */}
      {!data && !running && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl px-6 py-10 text-center space-y-4">
          <Shield className="mx-auto text-gray-300" size={40} />
          <p className="text-gray-600 font-medium">No audit results yet.</p>
          <p className="text-sm text-gray-500">Click <strong>Run Audit</strong> to validate all homepage, product, blog, and landing page schemas against Google Rich Results requirements.</p>
          <Button onClick={handleRunAudit} disabled={running} className="bg-blue-600 hover:bg-blue-700 text-white">
            {running ? <><Loader2 size={14} className="mr-1.5 animate-spin" /> Running…</> : <><Play size={14} className="mr-1.5" /> Run First Audit</>}
          </Button>
        </div>
      )}

      {running && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-6 py-8 text-center space-y-3">
          <Loader2 className="mx-auto animate-spin text-blue-500" size={28} />
          <p className="text-blue-800 font-semibold">Fetching and validating pages…</p>
          <p className="text-blue-600 text-sm">Rendering live URLs · extracting JSON-LD · checking Google Rich Results requirements</p>
        </div>
      )}

      {data && !running && (
        <>
          {/* Summary */}
          {data.criticalIssues > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-4 flex items-start gap-3">
              <XCircle className="text-red-600 flex-shrink-0 mt-0.5" size={18} />
              <div>
                <p className="text-sm font-bold text-red-900">
                  {data.criticalIssues} critical schema error{data.criticalIssues > 1 ? "s" : ""} found
                </p>
                <p className="text-xs text-red-700 mt-0.5">
                  Affected: {data.affectedUrls.map(u => u.replace("https://www.100xcircle.com", "") || "/").join(", ")}
                </p>
              </div>
            </div>
          )}
          {data.criticalIssues === 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-4 flex items-center gap-3">
              <CheckCircle className="text-emerald-600 flex-shrink-0" size={18} />
              <p className="text-sm font-bold text-emerald-900">All schemas valid — no critical errors found</p>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatCard label="Pages Audited"    value={data.totalPages}    color="gray" />
            <StatCard label="Total Schemas"    value={data.totalSchemas}  color="gray" />
            <StatCard label="Valid Schemas"    value={data.validSchemas}  color={data.validSchemas === data.totalSchemas ? "green" : "amber"} />
            <StatCard label="Invalid Schemas"  value={data.invalidSchemas} color={data.invalidSchemas > 0 ? "red" : "green"} />
            <StatCard label="Critical Errors"  value={data.criticalIssues} color={data.criticalIssues > 0 ? "red" : "green"} />
          </div>

          {/* Summary text */}
          <p className="text-xs text-gray-500 font-mono bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            {data.summary}
          </p>

          {/* Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Show:</span>
            {(["all", "invalid", "valid"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  filter === f
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {f === "all" ? `All pages (${data.totalPages})` : f === "invalid" ? `Issues (${data.affectedUrls.length})` : `Clean (${data.totalPages - data.affectedUrls.length})`}
              </button>
            ))}
          </div>

          {/* Per-URL breakdown */}
          <div className="space-y-3">
            {data.pages
              .filter(p => {
                if (filter === "invalid") return p.invalidSchemas > 0 || p.criticalCount > 0 || !p.fetchOk
                if (filter === "valid")   return p.invalidSchemas === 0 && p.criticalCount === 0 && p.fetchOk
                return true
              })
              .sort((a, b) => b.criticalCount - a.criticalCount || b.invalidSchemas - a.invalidSchemas)
              .map((page, i) => <PageRow key={i} page={page} />)}
          </div>

          {/* Integration note */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="text-gray-500" size={14} />
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">Auto-trigger setup</span>
            </div>
            <div className="space-y-1.5 text-xs text-gray-600">
              <p>
                <span className="font-semibold">After deployment:</span> Add a Vercel Deploy Hook that calls
                <code className="bg-gray-200 px-1 rounded ml-1">POST /api/admin/schema-health</code> with body
                <code className="bg-gray-200 px-1 rounded ml-1">{"{ \"trigger\": \"post_deploy\" }"}</code>
              </p>
              <p>
                <span className="font-semibold">Daily SEO sync:</span> Schema audit runs automatically at the end of each GSC sync.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
