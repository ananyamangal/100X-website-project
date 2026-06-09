'use client'

import { useEffect, useState, useCallback } from 'react'
import { RefreshCw, XCircle, AlertCircle, Info, ChevronDown, ChevronRight, ExternalLink, Package, Wrench, Tag, Award } from 'lucide-react'

type Severity = 'critical' | 'warning' | 'info'

interface AuditItem {
  id: string
  name: string
  extra?: string
}

interface AuditIssue {
  severity: Severity
  category: string
  title: string
  detail: string
  count: number
  items: AuditItem[]
}

interface AuditResult {
  scannedAt: string
  counts: {
    products: number
    published: number
    drafts: number
    parts: number
    badges: number
    certs: number
  }
  criticalCount: number
  warningCount: number
  infoCount: number
  issues: AuditIssue[]
}

const SEV_STYLES: Record<Severity, { bg: string; border: string; badge: string; icon: React.ReactNode; label: string }> = {
  critical: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    badge: 'bg-red-100 text-red-700 border-red-200',
    icon: <XCircle size={15} className="text-red-500 shrink-0" />,
    label: 'Critical',
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
    icon: <AlertCircle size={15} className="text-amber-500 shrink-0" />,
    label: 'Warning',
  },
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: <Info size={15} className="text-blue-500 shrink-0" />,
    label: 'Info',
  },
}

function IssueRow({ issue }: { issue: AuditIssue }) {
  const [open, setOpen] = useState(false)
  const s = SEV_STYLES[issue.severity]

  return (
    <div className={`rounded-xl border ${s.border} overflow-hidden`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-start gap-3 px-4 py-3.5 text-left ${s.bg} hover:brightness-[0.97] transition-all`}
      >
        <span className="mt-0.5">{s.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[11px] font-600 uppercase tracking-wide px-2 py-0.5 rounded border ${s.badge}`}>
              {s.label}
            </span>
            <span className="text-[11px] text-gray-500 font-500">{issue.category}</span>
          </div>
          <p className="text-sm font-600 text-gray-900 mt-1">{issue.title}</p>
          <p className="text-xs text-gray-500 mt-0.5 leading-snug">{issue.detail}</p>
        </div>
        <span className="text-xs font-700 text-gray-600 bg-white border border-gray-200 rounded-full px-2.5 py-0.5 shrink-0 mt-0.5">
          {issue.count}
        </span>
        <span className="text-gray-400 mt-0.5 shrink-0">
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
      </button>

      {open && (
        <div className="bg-white border-t border-gray-100 divide-y divide-gray-50 max-h-72 overflow-y-auto">
          {issue.items.map((item, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2.5">
              <span className="text-xs font-mono text-gray-400 shrink-0 w-24 truncate">{item.id.slice(-8)}</span>
              <span className="text-xs text-gray-800 font-500 flex-1 truncate">{item.name || '(unnamed)'}</span>
              {item.extra && (
                <span className="text-[11px] text-gray-400 shrink-0 max-w-[160px] truncate" title={item.extra}>
                  {item.extra}
                </span>
              )}
              <a
                href={`/admin?product=${item.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-gray-300 hover:text-brand-600 transition-colors"
                title="Edit in admin"
              >
                <ExternalLink size={11} />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function CatalogAuditPage() {
  const [result, setResult] = useState<AuditResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Severity | 'all'>('all')

  const run = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch('/api/admin/catalog-audit')
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`)
      setResult(await r.json())
    } catch (e: any) {
      setError(e?.message ?? 'Audit failed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { run() }, [run])

  const visible = result?.issues.filter((i) => filter === 'all' || i.severity === filter) ?? []

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Catalog Audit</h1>
          <p className="text-gray-500 text-sm mt-1">
            {result
              ? `Scanned ${result.counts.products} products · ${result.counts.parts} spare parts · ${new Date(result.scannedAt).toLocaleTimeString()}`
              : loading ? 'Scanning…' : 'Ready to scan'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/admin/system-health"
            className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            ← System Health
          </a>
          <button
            onClick={run}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            {loading ? 'Scanning…' : 'Re-scan'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {/* Summary cards */}
      {result && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Critical', count: result.criticalCount, color: result.criticalCount === 0 ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700', sev: 'critical' as Severity },
              { label: 'Warnings', count: result.warningCount, color: result.warningCount === 0 ? 'bg-green-50 border-green-200 text-green-700' : 'bg-amber-50 border-amber-200 text-amber-700', sev: 'warning' as Severity },
              { label: 'Info', count: result.infoCount, color: 'bg-blue-50 border-blue-200 text-blue-700', sev: 'info' as Severity },
              { label: 'Total Issues', count: result.issues.length, color: result.issues.length === 0 ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-700', sev: 'all' as Severity | 'all' },
            ].map((c) => (
              <button
                key={c.label}
                onClick={() => setFilter(filter === c.sev ? 'all' : c.sev as Severity | 'all')}
                className={`p-4 rounded-xl border text-left transition-all hover:brightness-95 ${c.color} ${filter === c.sev ? 'ring-2 ring-offset-1 ring-gray-400' : ''}`}
              >
                <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{c.label}</p>
                <p className="text-2xl font-bold mt-1">{c.count}</p>
              </button>
            ))}
          </div>

          {/* DB stats */}
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              { icon: <Package size={14} />, label: 'Products', main: result.counts.products, sub: `${result.counts.published} published · ${result.counts.drafts} drafts` },
              { icon: <Wrench size={14} />, label: 'Spare Parts', main: result.counts.parts, sub: 'in catalog' },
              { icon: <Tag size={14} />, label: 'Badges / Certs', main: `${result.counts.badges} / ${result.counts.certs}`, sub: 'in CMS' },
            ].map((s) => (
              <div key={s.label} className="bg-white border border-gray-100 rounded-xl px-4 py-3 flex items-center gap-3">
                <span className="text-gray-400">{s.icon}</span>
                <div>
                  <p className="text-xs text-gray-500">{s.label}</p>
                  <p className="text-lg font-bold text-gray-900">{s.main}</p>
                  <p className="text-[11px] text-gray-400">{s.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Zero issues state */}
      {result && result.issues.length === 0 && (
        <div className="text-center py-16 bg-green-50 rounded-2xl border border-green-200">
          <Award size={40} className="text-green-400 mx-auto mb-3" />
          <h2 className="text-lg font-600 text-green-800">Catalog is clean</h2>
          <p className="text-green-600 text-sm mt-1">No issues found across {result.counts.products} products and {result.counts.parts} spare parts.</p>
        </div>
      )}

      {/* Filter bar */}
      {result && result.issues.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 font-500">Filter:</span>
          {(['all', 'critical', 'warning', 'info'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${filter === f ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-600 hover:border-gray-400'}`}
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* Issues list */}
      {result && visible.length > 0 && (
        <div className="space-y-3">
          {visible.map((issue, i) => (
            <IssueRow key={i} issue={issue} />
          ))}
        </div>
      )}

      {result && visible.length === 0 && result.issues.length > 0 && (
        <div className="text-center py-10 text-gray-400 text-sm">
          No {filter} issues. <button onClick={() => setFilter('all')} className="underline text-gray-600">Show all</button>
        </div>
      )}

      {loading && !result && (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400 text-right">
        Scans products, spare_parts, product_badges, certifications collections. Admin only.
      </p>
    </div>
  )
}
