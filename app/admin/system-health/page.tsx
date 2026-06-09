'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, CheckCircle, AlertCircle, XCircle, Database, Package, FileText, Tag, Award } from 'lucide-react'

type HealthStatus = 'ok' | 'warn' | 'error' | 'loading'

function StatusDot({ status }: { status: HealthStatus }) {
  const cls = {
    ok: 'bg-green-400',
    warn: 'bg-amber-400',
    error: 'bg-red-500',
    loading: 'bg-gray-300 animate-pulse',
  }[status]
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${cls} shrink-0`} />
}

function StatusIcon({ status }: { status: HealthStatus }) {
  if (status === 'ok') return <CheckCircle size={16} className="text-green-600" />
  if (status === 'warn') return <AlertCircle size={16} className="text-amber-500" />
  if (status === 'error') return <XCircle size={16} className="text-red-500" />
  return <span className="w-4 h-4 rounded-full border-2 border-gray-300 border-t-gray-600 animate-spin inline-block" />
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50">
        <span className="text-gray-500">{icon}</span>
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function Row({ label, value, status }: { label: string; value: string | number; status?: HealthStatus }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-gray-800">{value}</span>
        {status && <StatusDot status={status} />}
      </div>
    </div>
  )
}

export default function SystemHealthPage() {
  const [health, setHealth] = useState<any>(null)
  const [migration, setMigration] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [h, m] = await Promise.all([
        fetch('/api/admin/health').then(r => r.json()).catch(() => null),
        fetch('/api/admin/migrate').then(r => r.json()).catch(() => null),
      ])
      setHealth(h)
      setMigration(m)
      setRefreshedAt(new Date())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const normPct: number = migration?.normalizationScore?.pct ?? 0
  const normStatus: HealthStatus = normPct === 100 ? 'ok' : normPct >= 60 ? 'warn' : 'error'

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Health</h1>
          <p className="text-gray-500 text-sm mt-1">
            {refreshedAt ? `Last refreshed ${refreshedAt.toLocaleTimeString()}` : 'Loading…'}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Top-level status pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'MongoDB', status: (health?.mongodb?.connected ? 'ok' : health ? 'error' : 'loading') as HealthStatus, value: health?.mongodb?.connected ? 'Connected' : health ? 'Down' : '—' },
          { label: 'Email', status: (health?.email?.configured ? 'ok' : health ? 'warn' : 'loading') as HealthStatus, value: health?.email?.configured ? 'Configured' : health ? 'Missing config' : '—' },
          { label: 'Normalization', status: loading ? 'loading' as HealthStatus : normStatus, value: loading ? '—' : `${normPct}%` },
          { label: 'Products', status: (migration?.summary?.total > 0 ? 'ok' : migration ? 'warn' : 'loading') as HealthStatus, value: migration?.summary?.total ?? '—' },
        ].map((s) => (
          <div key={s.label} className={`p-4 rounded-xl border ${s.status === 'ok' ? 'bg-green-50 border-green-200' : s.status === 'error' ? 'bg-red-50 border-red-200' : s.status === 'warn' ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-gray-600">{s.label}</span>
              <StatusIcon status={s.status} />
            </div>
            <p className={`text-xl font-bold ${s.status === 'ok' ? 'text-green-700' : s.status === 'error' ? 'text-red-700' : s.status === 'warn' ? 'text-amber-700' : 'text-gray-400'}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* MongoDB health */}
        <Card title="Database" icon={<Database size={15} />}>
          {health?.mongodb ? (
            <>
              <Row label="Connection" value={health.mongodb.connected ? 'OK' : 'Failed'} status={health.mongodb.connected ? 'ok' : 'error'} />
              <Row label="Submissions" value={health.mongodb.collections?.submissions ?? '—'} />
              <Row label="RFQ leads" value={health.mongodb.collections?.rfqPopupLeads ?? '—'} />
              {health.brochure && <Row label="Brochure" value={health.brochure.configured ? 'Configured' : 'Not set'} status={health.brochure.configured ? 'ok' : 'warn'} />}
            </>
          ) : <p className="text-xs text-gray-400">Loading…</p>}
        </Card>

        {/* CMS health */}
        <Card title="CMS Collections" icon={<Package size={15} />}>
          {migration ? (
            <>
              <Row label="Products" value={migration.summary?.total ?? 0} status={migration.summary?.total > 0 ? 'ok' : 'warn'} />
              <Row label="Fully migrated" value={migration.summary?.fullyMigrated ?? 0} status={migration.summary?.fullyMigrated === migration.summary?.total ? 'ok' : 'warn'} />
              <Row label="Partially migrated" value={migration.summary?.partiallyMigrated ?? 0} status={migration.summary?.partiallyMigrated === 0 ? 'ok' : 'warn'} />
              <Row label="Legacy (unmigrated)" value={migration.summary?.legacy ?? 0} status={migration.summary?.legacy === 0 ? 'ok' : 'error'} />
              <Row label="Badges in CMS" value={migration.cms?.badgesInCms ?? 0} status={(migration.cms?.badgesInCms ?? 0) > 0 ? 'ok' : 'warn'} />
              <Row label="Certs in CMS" value={migration.cms?.certificationsInCms ?? 0} status={(migration.cms?.certificationsInCms ?? 0) > 0 ? 'ok' : 'warn'} />
            </>
          ) : <p className="text-xs text-gray-400">Loading…</p>}
        </Card>

        {/* Field migration status */}
        <Card title="Field Migration Status" icon={<FileText size={15} />}>
          {migration?.fields ? (
            <>
              <Row label="Features migrated" value={`${migration.fields.features?.migrated ?? 0} / ${migration.summary?.total ?? 0}`} status={(migration.fields.features?.legacy ?? 0) === 0 && (migration.fields.features?.empty ?? 0) === 0 ? 'ok' : 'warn'} />
              <Row label="Specs migrated" value={`${migration.fields.specs?.migrated ?? 0} / ${migration.summary?.total ?? 0}`} status={(migration.fields.specs?.legacy ?? 0) === 0 && (migration.fields.specs?.empty ?? 0) === 0 ? 'ok' : 'warn'} />
              <Row label="Apps migrated" value={`${migration.fields.apps?.migrated ?? 0} / ${migration.summary?.total ?? 0}`} status={(migration.fields.apps?.legacy ?? 0) === 0 && (migration.fields.apps?.empty ?? 0) === 0 ? 'ok' : 'warn'} />
              <Row label="Products with FAQs" value={`${migration.fields.faqs?.withFaqs ?? 0} / ${migration.summary?.total ?? 0}`} status={(migration.fields.faqs?.withoutFaqs ?? 0) === 0 ? 'ok' : 'warn'} />
              <Row label="Unmatched badges" value={migration.fields.badges?.productsWithUnmatched ?? 0} status={(migration.fields.badges?.productsWithUnmatched ?? 0) === 0 ? 'ok' : 'warn'} />
              <Row label="Legacy cert strings" value={migration.fields.certs?.productsWithLegacy ?? 0} status={(migration.fields.certs?.productsWithLegacy ?? 0) === 0 ? 'ok' : 'warn'} />
            </>
          ) : <p className="text-xs text-gray-400">Loading…</p>}
        </Card>

        {/* Per-product issues summary */}
        <Card title="Products with Issues" icon={<Award size={15} />}>
          {migration?.products ? (
            <div className="space-y-1 max-h-56 overflow-y-auto">
              {migration.products.filter((p: any) => p.issues.length > 0).length === 0 ? (
                <p className="text-xs text-green-700 font-medium">All products are fully normalized.</p>
              ) : (
                migration.products
                  .filter((p: any) => p.issues.length > 0)
                  .map((p: any) => (
                    <div key={p.id} className="flex items-start gap-2 py-1.5 border-b border-gray-50 last:border-0">
                      <StatusDot status={p.status === 'full' ? 'ok' : p.status === 'partial' ? 'warn' : 'error'} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-800 truncate">{p.name}</p>
                        <p className="text-[10px] text-gray-400">{p.issues.join(', ')}</p>
                      </div>
                    </div>
                  ))
              )}
            </div>
          ) : <p className="text-xs text-gray-400">Loading…</p>}
        </Card>
      </div>

      {/* Audit unmatched items */}
      {migration?.audit && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card title="Unmatched Badge Strings" icon={<Tag size={15} />}>
            {migration.audit.unmatchedBadges?.length === 0 ? (
              <p className="text-xs text-green-700">None — all badges matched CMS.</p>
            ) : (
              <div className="space-y-1">
                {migration.audit.unmatchedBadges?.map((b: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-gray-700">{b.name}</span>
                    <span className="text-amber-600 font-semibold">{b.count} products</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card title="Unmatched Cert Strings" icon={<Award size={15} />}>
            {migration.audit.unmatchedCerts?.length === 0 ? (
              <p className="text-xs text-green-700">None — all certs matched CMS.</p>
            ) : (
              <div className="space-y-1">
                {migration.audit.unmatchedCerts?.map((c: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-gray-700">{c.name}</span>
                    <span className="text-amber-600 font-semibold">{c.count} products</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      <p className="text-xs text-gray-400 text-right">
        Data sources: /api/admin/health + /api/admin/migrate — Super Admin only
      </p>
    </div>
  )
}
