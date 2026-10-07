"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import {
  Users, Mail, Phone, Building2, MapPin, Star,
  RefreshCw, Download, Upload, Search, Filter,
  CheckCircle, AlertCircle, Loader2, ChevronRight,
  BarChart2, Database, Inbox, Settings2, X,
  TrendingUp, Zap, Target, FileSpreadsheet,
  ShieldCheck, ArrowUpRight,
} from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────────────

interface Prospect {
  id:             string
  dealer_name:    string
  contact_person: string
  mobile:         string
  email:          string
  city:           string
  state:          string
  gst:            string
  source:         string
  dealer_score:   number
  status:         string
  needs_enrichment: boolean
  gem_gmv?:       number
  gem_contracts?: number
  is_100x_dealer?: boolean
  notes?:         string
}

interface StateRow {
  state:     string
  count:     number
  withEmail: number
  withPhone: number
  withBoth:  number
  matchRate: number
}

interface Stats {
  total:             number
  withEmail:         number
  withPhone:         number
  withBoth:          number
  missingBoth:       number
  withGst:           number
  avgScore:          number
  customerMatchRate: number
  byState:           StateRow[]
  bySource:          Array<{ _id: string; count: number }>
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SOURCE_LABELS: Record<string, string> = {
  gem_seller:       "GeM Seller",
  website_lead:     "Website Lead",
  rfq:              "RFQ Form",
  csv_import:       "CSV Import",
  indiamart:        "IndiaMART",
  trade_association:"Trade Assoc.",
  distributor_db:   "Distributor DB",
  manual:           "Manual",
}

const SOURCE_COLORS: Record<string, string> = {
  gem_seller:       "bg-blue-100 text-blue-700",
  website_lead:     "bg-emerald-100 text-emerald-700",
  rfq:              "bg-violet-100 text-violet-700",
  csv_import:       "bg-amber-100 text-amber-700",
  indiamart:        "bg-orange-100 text-orange-700",
  manual:           "bg-gray-100 text-gray-600",
  trade_association:"bg-rose-100 text-rose-700",
}

const TABS = [
  { key: "database", label: "Dealer Database",   icon: Database },
  { key: "queue",    label: "Enrichment Queue",   icon: Inbox    },
  { key: "dashboard",label: "Quality Dashboard",  icon: BarChart2 },
  { key: "import",   label: "Import & Sync",      icon: Upload   },
] as const
type TabKey = typeof TABS[number]["key"]

// ── Sub-components ────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 70 ? "bg-emerald-100 text-emerald-700"
    : score >= 40 ? "bg-amber-100 text-amber-700"
    : "bg-red-100 text-red-600"
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${color}`}>
      {score}
    </span>
  )
}

function CoverageBar({ value, total, color }: { value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full">
        <div className={`h-1.5 ${color} rounded-full transition-all`} style={{ width: `${Math.max(2, pct)}%` }} />
      </div>
      <span className="text-[11px] font-semibold text-gray-700 w-10 text-right">{pct}%</span>
    </div>
  )
}

function StatCard({
  label, value, sub, icon: Icon, color,
}: { label: string; value: string | number; sub?: string; icon: React.FC<{size?: number; className?: string}>; color: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
        <Icon size={13} className={color} />
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {sub && <div className="text-[11px] text-gray-400 mt-0.5">{sub}</div>}
    </div>
  )
}

// ── State Execution Card ──────────────────────────────────────────────────────

function StateCard({ row, rank }: { row: StateRow; rank: number }) {
  const matchColor = row.matchRate >= 50 ? "text-emerald-600 bg-emerald-50"
    : row.matchRate >= 30 ? "text-amber-600 bg-amber-50"
    : "text-red-600 bg-red-50"

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold
            ${rank <= 3 ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"}`}>
            {rank}
          </span>
          <span className="text-sm font-bold text-gray-900">{row.state || "Unknown"}</span>
        </div>
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${matchColor}`}>
          {row.matchRate}% match
        </span>
      </div>

      <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
        Dealer Opportunity
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: "Prospects", value: row.count,     icon: Users },
          { label: "Emails",    value: row.withEmail,  icon: Mail  },
          { label: "Phones",    value: row.withPhone,  icon: Phone },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-gray-50 rounded-lg p-2">
            <Icon size={11} className="text-gray-400 mx-auto mb-1" />
            <div className="text-lg font-bold text-gray-900">{value.toLocaleString()}</div>
            <div className="text-[9px] text-gray-400">{label}</div>
          </div>
        ))}
      </div>

      <div className="h-px bg-gray-100" />

      <div className="grid grid-cols-3 gap-1.5">
        <a
          href="/admin/growth/ads/customer-match"
          className="flex items-center justify-center gap-1 px-2 py-1.5 bg-emerald-600 text-white rounded-lg text-[11px] font-medium hover:bg-emerald-700 transition-colors"
        >
          <Upload size={10} /> Upload
        </a>
        <a
          href="/admin/growth/contact-this-week"
          className="flex items-center justify-center gap-1 px-2 py-1.5 bg-blue-600 text-white rounded-lg text-[11px] font-medium hover:bg-blue-700 transition-colors"
        >
          <Mail size={10} /> Outreach
        </a>
        <a
          href="/admin/growth/ads/campaign-factory"
          className="flex items-center justify-center gap-1 px-2 py-1.5 bg-violet-600 text-white rounded-lg text-[11px] font-medium hover:bg-violet-700 transition-colors"
        >
          <Zap size={10} /> Campaign
        </a>
      </div>
    </div>
  )
}

// ── Edit Inline Row ───────────────────────────────────────────────────────────

function EditableRow({
  p,
  onSave,
  onCancel,
}: {
  p: Prospect
  onSave: (id: string, fields: Partial<Prospect>) => Promise<void>
  onCancel: () => void
}) {
  const [email,  setEmail]  = useState(p.email)
  const [mobile, setMobile] = useState(p.mobile)
  const [city,   setCity]   = useState(p.city)
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    await onSave(p.id, { email, mobile, city })
    setSaving(false)
  }

  return (
    <tr className="bg-blue-50 border-t border-blue-200">
      <td className="px-3 py-2" colSpan={2}>
        <span className="text-[12px] font-medium text-gray-800">{p.dealer_name || p.contact_person}</span>
      </td>
      <td className="px-2 py-2">
        <input value={mobile} onChange={e => setMobile(e.target.value)}
          placeholder="Mobile" className="w-full text-[11px] border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-blue-400" />
      </td>
      <td className="px-2 py-2">
        <input value={email} onChange={e => setEmail(e.target.value)}
          placeholder="Email" className="w-full text-[11px] border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-blue-400" />
      </td>
      <td className="px-2 py-2">
        <input value={city} onChange={e => setCity(e.target.value)}
          placeholder="City" className="w-full text-[11px] border border-gray-300 rounded px-2 py-1 focus:outline-none focus:border-blue-400" />
      </td>
      <td colSpan={3} className="px-2 py-2">
        <div className="flex gap-1">
          <button onClick={save} disabled={saving}
            className="px-3 py-1 text-[11px] font-medium bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
            {saving ? "Saving…" : "Save"}
          </button>
          <button onClick={onCancel}
            className="px-3 py-1 text-[11px] font-medium bg-gray-200 text-gray-700 rounded hover:bg-gray-300">
            Cancel
          </button>
        </div>
      </td>
    </tr>
  )
}

// ── Prospect Table ─────────────────────────────────────────────────────────────

function ProspectTable({
  prospects, onReject, onEnrich,
}: {
  prospects: Prospect[]
  onReject:  (id: string) => Promise<void>
  onEnrich:  (id: string, fields: Partial<Prospect>) => Promise<void>
}) {
  const [editId, setEditId] = useState<string | null>(null)

  if (!prospects.length) {
    return (
      <div className="text-center py-16 text-gray-400">
        <Database size={32} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm">No records found</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[12px]">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {["Company / Name", "Contact", "Mobile", "Email", "City, State", "Source", "Score", ""].map(h => (
              <th key={h} className="px-3 py-2 font-semibold text-gray-600 text-[11px] uppercase tracking-wide whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {prospects.map(p => {
            if (editId === p.id) return (
              <EditableRow key={p.id} p={p}
                onSave={async (id, fields) => { await onEnrich(id, fields); setEditId(null) }}
                onCancel={() => setEditId(null)} />
            )
            return (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 max-w-[180px]">
                  <div className="font-medium text-gray-900 truncate">{p.dealer_name || "—"}</div>
                  {p.gst && <div className="text-[10px] text-gray-400 font-mono">{p.gst}</div>}
                </td>
                <td className="px-3 py-2 max-w-[120px]">
                  <div className="text-gray-600 truncate">{p.contact_person || "—"}</div>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {p.mobile
                    ? <span className="text-gray-800 font-mono text-[11px]">{p.mobile}</span>
                    : <span className="text-red-400 text-[10px] flex items-center gap-1"><AlertCircle size={9}/> missing</span>
                  }
                </td>
                <td className="px-3 py-2 max-w-[160px]">
                  {p.email
                    ? <span className="text-gray-800 truncate block">{p.email}</span>
                    : <span className="text-red-400 text-[10px] flex items-center gap-1"><AlertCircle size={9}/> missing</span>
                  }
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                  {[p.city, p.state].filter(Boolean).join(", ") || "—"}
                </td>
                <td className="px-3 py-2">
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium
                    ${SOURCE_COLORS[p.source] || "bg-gray-100 text-gray-600"}`}>
                    {SOURCE_LABELS[p.source] || p.source}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <ScoreBadge score={p.dealer_score} />
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    <button onClick={() => setEditId(p.id)}
                      className="p-1 hover:bg-blue-100 rounded text-blue-500 transition-colors" title="Enrich">
                      <Settings2 size={12} />
                    </button>
                    <button onClick={() => onReject(p.id)}
                      className="p-1 hover:bg-red-100 rounded text-red-400 transition-colors" title="Reject">
                      <X size={12} />
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function DealerProspectsPage() {
  const [tab,       setTab]       = useState<TabKey>("database")
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [stats,     setStats]     = useState<Stats | null>(null)
  const [total,     setTotal]     = useState(0)
  const [page,      setPage]      = useState(1)
  const [loading,   setLoading]   = useState(true)
  const [syncing,   setSyncing]   = useState(false)
  const [importing, setImporting] = useState(false)
  const [search,    setSearch]    = useState("")
  const [stateFilter, setStateFilter] = useState("")
  const [msg, setMsg] = useState<{ text: string; type: "ok" | "err" } | null>(null)
  const fileInputRef  = useRef<HTMLInputElement>(null)

  const flash = (text: string, type: "ok" | "err" = "ok") => {
    setMsg({ text, type })
    setTimeout(() => setMsg(null), 6000)
  }

  const PAGE_SIZE = 50

  const load = useCallback(async (opts?: { resetPage?: boolean; queue?: boolean }) => {
    setLoading(true)
    const p = opts?.resetPage ? 1 : page
    if (opts?.resetPage) setPage(1)
    try {
      const params = new URLSearchParams({
        page:     String(p),
        pageSize: String(PAGE_SIZE),
        ...(search      ? { q:     search      } : {}),
        ...(stateFilter ? { state: stateFilter } : {}),
        ...(opts?.queue || tab === "queue" ? { queue: "1" } : {}),
      })
      const res  = await fetch(`/api/admin/growth/dealers/prospects?${params}`)
      const data = await res.json()
      setProspects(data.prospects ?? [])
      setTotal(data.total ?? 0)
      setStats(data.stats  ?? null)
    } finally {
      setLoading(false)
    }
  }, [page, search, stateFilter, tab])

  useEffect(() => { load() }, [load])

  async function handleSync() {
    setSyncing(true)
    try {
      const res  = await fetch("/api/admin/growth/dealers/prospects/sync", { method: "POST" })
      const data = await res.json()
      if (!res.ok) { flash(data.error || "Sync failed", "err"); return }
      flash(`Sync complete — ${data.totalInserted} new, ${data.totalUpdated} updated`)
      await load({ resetPage: true })
    } finally {
      setSyncing(false)
    }
  }

  async function handleCSVUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    try {
      const text = await file.text()
      const res  = await fetch("/api/admin/growth/dealers/prospects/import", {
        method:  "POST",
        headers: { "Content-Type": "text/csv" },
        body:    text,
      })
      const data = await res.json()
      if (!res.ok) { flash(data.error || "Import failed", "err"); return }
      flash(`Imported ${data.inserted} new + ${data.updated} updated from ${data.rowsRead} rows`)
      await load({ resetPage: true })
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  async function handleReject(id: string) {
    await fetch(`/api/admin/growth/dealers/prospects/${id}`, {
      method: "DELETE",
    })
    setProspects(prev => prev.filter(p => p.id !== id))
    setTotal(prev => prev - 1)
  }

  async function handleEnrich(id: string, fields: Partial<Prospect>) {
    await fetch(`/api/admin/growth/dealers/prospects/${id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(fields),
    })
    await load()
    flash("Record updated")
  }

  const qs = stats

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Dealer Prospect Acquisition Engine</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Real dealer contacts for CRM pipeline, outreach, and Google Customer Match
            </p>
          </div>
          <div className="flex items-center gap-2">
            {msg && (
              <span className={`text-[12px] px-3 py-1.5 rounded-lg border ${
                msg.type === "ok"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-red-50 text-red-700 border-red-200"
              }`}>{msg.text}</span>
            )}
            <button onClick={() => load()} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50">
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
        </div>

        {/* ── Stats row ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-5 gap-3 mb-6">
          <StatCard label="Total Prospects" value={(qs?.total ?? 0).toLocaleString()}  sub="across all sources"   icon={Users}    color="text-blue-500" />
          <StatCard label="Email Coverage"  value={qs ? `${Math.round((qs.withEmail / Math.max(1, qs.total)) * 100)}%` : "—"} sub={`${qs?.withEmail ?? 0} records`} icon={Mail}   color="text-emerald-500" />
          <StatCard label="Phone Coverage"  value={qs ? `${Math.round((qs.withPhone / Math.max(1, qs.total)) * 100)}%` : "—"} sub={`${qs?.withPhone ?? 0} records`} icon={Phone}  color="text-violet-500" />
          <StatCard label="GST Verified"    value={qs ? `${Math.round((qs.withGst   / Math.max(1, qs.total)) * 100)}%` : "—"} sub={`${qs?.withGst ?? 0} records`}  icon={ShieldCheck} color="text-amber-500" />
          <StatCard label="Match Score"     value={qs ? `~${qs.customerMatchRate}%` : "—"} sub="est. Google match rate" icon={Target} color="text-rose-500" />
        </div>

        {/* ── Tabs ───────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 mb-4 bg-white border border-gray-200 rounded-xl p-1 w-fit">
          {TABS.map(t => {
            const Icon = t.icon
            return (
              <button key={t.key} onClick={() => { setTab(t.key); load({ resetPage: true }) }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
                  tab === t.key
                    ? "bg-gray-900 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}>
                <Icon size={12} />
                {t.label}
              </button>
            )
          })}
        </div>

        {/* ── Tab: Database ───────────────────────────────────────────────── */}
        {(tab === "database" || tab === "queue") && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {/* Search + filter bar */}
            <div className="p-4 border-b border-gray-100 flex items-center gap-3">
              <div className="flex items-center gap-2 flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
                <Search size={13} className="text-gray-400" />
                <input
                  value={search}
                  onChange={e => { setSearch(e.target.value); load({ resetPage: true }) }}
                  placeholder="Search company, contact, email, phone…"
                  className="flex-1 bg-transparent text-[12px] outline-none text-gray-700 placeholder-gray-400"
                />
              </div>
              <select value={stateFilter}
                onChange={e => { setStateFilter(e.target.value); load({ resetPage: true }) }}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-[12px] text-gray-700 bg-white focus:outline-none focus:border-blue-300">
                <option value="">All States</option>
                {(qs?.byState ?? []).map(s => (
                  <option key={s.state} value={s.state}>{s.state} ({s.count})</option>
                ))}
              </select>
              <span className="text-[11px] text-gray-500 whitespace-nowrap">
                {total.toLocaleString()} {tab === "queue" ? "need enrichment" : "records"}
              </span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={20} className="animate-spin text-gray-400" />
              </div>
            ) : (
              <ProspectTable
                prospects={prospects}
                onReject={handleReject}
                onEnrich={handleEnrich}
              />
            )}

            {/* Pagination */}
            {total > PAGE_SIZE && (
              <div className="p-4 border-t border-gray-100 flex items-center justify-between">
                <span className="text-[11px] text-gray-500">
                  Page {page} of {Math.ceil(total / PAGE_SIZE)}
                </span>
                <div className="flex gap-2">
                  <button disabled={page === 1} onClick={() => { setPage(p => p - 1) }}
                    className="px-3 py-1 text-[11px] border border-gray-200 rounded disabled:opacity-40 hover:bg-gray-50">
                    ← Prev
                  </button>
                  <button disabled={page * PAGE_SIZE >= total} onClick={() => { setPage(p => p + 1) }}
                    className="px-3 py-1 text-[11px] border border-gray-200 rounded disabled:opacity-40 hover:bg-gray-50">
                    Next →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Quality Dashboard ──────────────────────────────────────── */}
        {tab === "dashboard" && qs && (
          <div className="grid grid-cols-3 gap-4">
            {/* Coverage summary */}
            <div className="col-span-2 bg-white border border-gray-200 rounded-xl p-5">
              <div className="text-sm font-semibold text-gray-800 mb-4">Contact Coverage</div>
              <div className="space-y-4">
                {[
                  { label: "Email",        value: qs.withEmail, color: "bg-emerald-500" },
                  { label: "Phone",        value: qs.withPhone, color: "bg-violet-500"  },
                  { label: "Both",         value: qs.withBoth,  color: "bg-blue-500"    },
                  { label: "GST Verified", value: qs.withGst,   color: "bg-amber-500"   },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <div className="flex justify-between text-[12px] mb-1">
                      <span className="text-gray-600">{label}</span>
                      <span className="font-semibold text-gray-900">{value.toLocaleString()} / {qs.total.toLocaleString()}</span>
                    </div>
                    <CoverageBar value={value} total={qs.total} color={color} />
                  </div>
                ))}
              </div>
              <div className="mt-5 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-gray-600">Estimated Customer Match Rate</span>
                  <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                    qs.customerMatchRate >= 50 ? "text-emerald-700 bg-emerald-50"
                      : qs.customerMatchRate >= 25 ? "text-amber-700 bg-amber-50"
                      : "text-red-700 bg-red-50"
                  }`}>
                    ~{qs.customerMatchRate}%
                  </span>
                </div>
                <div className="mt-2 h-2 bg-gray-100 rounded-full">
                  <div className={`h-2 rounded-full transition-all ${
                    qs.customerMatchRate >= 50 ? "bg-emerald-500"
                      : qs.customerMatchRate >= 25 ? "bg-amber-500"
                      : "bg-red-400"
                  }`} style={{ width: `${Math.max(2, qs.customerMatchRate)}%` }} />
                </div>
              </div>
            </div>

            {/* By source */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="text-sm font-semibold text-gray-800 mb-4">By Source</div>
              <div className="space-y-2">
                {qs.bySource.map(s => (
                  <div key={String(s._id)} className="flex items-center justify-between">
                    <span className={`text-[11px] px-2 py-0.5 rounded font-medium ${SOURCE_COLORS[String(s._id)] || "bg-gray-100 text-gray-600"}`}>
                      {SOURCE_LABELS[String(s._id)] || String(s._id)}
                    </span>
                    <span className="text-[12px] font-semibold text-gray-900">{Number(s.count).toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="text-[11px] text-gray-500 font-semibold mb-1">Avg Dealer Score</div>
                <div className="text-2xl font-bold text-gray-900">{qs.avgScore}</div>
                <div className="text-[10px] text-gray-400">out of 100 (email+phone+gst+city+contact)</div>
              </div>
            </div>

            {/* State breakdown */}
            <div className="col-span-3 bg-white border border-gray-200 rounded-xl p-5">
              <div className="text-sm font-semibold text-gray-800 mb-4">State Coverage</div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[12px]">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {["State", "Prospects", "Email", "Phone", "Both", "Match Rate", ""].map(h => (
                        <th key={h} className="px-3 py-2 text-[11px] text-gray-500 font-semibold uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {qs.byState.map((s, i) => (
                      <tr key={s.state} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium text-gray-900">{s.state || "Unknown"}</td>
                        <td className="px-3 py-2 text-gray-700">{s.count.toLocaleString()}</td>
                        <td className="px-3 py-2 text-emerald-700">{s.withEmail.toLocaleString()}</td>
                        <td className="px-3 py-2 text-violet-700">{s.withPhone.toLocaleString()}</td>
                        <td className="px-3 py-2 text-blue-700">{s.withBoth.toLocaleString()}</td>
                        <td className="px-3 py-2">
                          <span className={`font-semibold ${
                            s.matchRate >= 50 ? "text-emerald-600" : s.matchRate >= 25 ? "text-amber-600" : "text-red-500"
                          }`}>~{s.matchRate}%</span>
                        </td>
                        <td className="px-3 py-2">
                          {i < 3 && <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded font-medium">Top Market</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── Tab: Import & Sync ──────────────────────────────────────────── */}
        {tab === "import" && (
          <div className="grid grid-cols-2 gap-4">
            {/* Sync from internal sources */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Database size={16} className="text-blue-500" />
                <span className="text-sm font-semibold text-gray-800">Sync from Internal Sources</span>
              </div>
              <div className="space-y-2 mb-5 text-[12px] text-gray-600">
                {[
                  { src: "GeM Sellers",    count: "679 records", note: "Email + phone + GST available", color: "emerald" },
                  { src: "Seller Profiles", count: "varies",     note: "Fogging suppliers on GeM",       color: "blue"    },
                  { src: "Website Leads",   count: "4 records",  note: "Brochure downloads",             color: "violet"  },
                  { src: "Dealer Inquiries",count: "4 records",  note: "dealerInquiry=true submissions", color: "amber"   },
                  { src: "RFQ Submissions", count: "~10",        note: "Non-test popup RFQs",            color: "rose"    },
                ].map(({ src, count, note, color }) => (
                  <div key={src} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div>
                      <span className="font-medium text-gray-800">{src}</span>
                      <span className="text-gray-400 ml-2">— {note}</span>
                    </div>
                    <span className={`text-[11px] font-medium text-${color}-600 bg-${color}-50 px-2 py-0.5 rounded`}>
                      {count}
                    </span>
                  </div>
                ))}
              </div>
              <button onClick={handleSync} disabled={syncing}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors">
                {syncing
                  ? <><Loader2 size={14} className="animate-spin" /> Syncing…</>
                  : <><RefreshCw size={14} /> Sync All Sources Now</>
                }
              </button>
              <p className="text-[11px] text-gray-400 mt-2 text-center">
                Idempotent — safe to run multiple times. Deduplicates by email → phone → GST.
              </p>
            </div>

            {/* CSV import */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <FileSpreadsheet size={16} className="text-emerald-500" />
                <span className="text-sm font-semibold text-gray-800">CSV / IndiaMART Import</span>
              </div>
              <div className="text-[12px] text-gray-600 mb-4">
                <p className="mb-2">Upload a CSV file from IndiaMART, trade directories, or your own list.</p>
                <p className="font-medium text-gray-700 mb-1">Accepted columns:</p>
                <div className="font-mono text-[10px] bg-gray-50 rounded p-2 text-gray-600 leading-relaxed">
                  dealer_name, contact_person, mobile, email,<br />
                  city, state, gst, source, notes
                </div>
                <p className="mt-2 text-gray-500">Also accepts IndiaMART exports with: Company Name, Contact Person, Mobile, Email, City, State</p>
              </div>

              <div className="space-y-3">
                <a
                  href="/api/admin/growth/dealers/prospects/import"
                  download="dealer-prospects-template.csv"
                  className="flex items-center gap-2 text-[12px] text-blue-600 hover:text-blue-700 font-medium"
                >
                  <Download size={13} /> Download CSV Template
                </a>

                <div
                  className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-blue-300 cursor-pointer transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={20} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-[12px] text-gray-600 font-medium">Click to upload CSV</p>
                  <p className="text-[11px] text-gray-400 mt-1">or drag & drop · .csv files only</p>
                </div>
                <input ref={fileInputRef} type="file" accept=".csv,.txt" className="hidden"
                  onChange={handleCSVUpload} />

                {importing && (
                  <div className="flex items-center gap-2 text-[12px] text-blue-600">
                    <Loader2 size={13} className="animate-spin" /> Importing…
                  </div>
                )}
              </div>
            </div>

            {/* Manual data sources guide */}
            <div className="col-span-2 bg-white border border-gray-200 rounded-xl p-6">
              <div className="text-sm font-semibold text-gray-800 mb-4">Manual Import Sources Guide</div>
              <div className="grid grid-cols-4 gap-3 text-[12px]">
                {[
                  { source: "IndiaMART",         how: "Business Center → Leads → Export CSV",             note: "Best for dealer discovery" },
                  { source: "JustDial B2B",       how: "Search 'thermal fogger dealers' → export",         note: "Secondary source" },
                  { source: "Trade India",        how: "Product search → seller list → export",            note: "Industrial dealers" },
                  { source: "State Trade Lists",  how: "MSME directory, DIC records, state dealer boards", note: "Govt-verified dealers" },
                  { source: "Pharma Pest Lists",  how: "FICCI, PHD Chamber pest control directories",      note: "Pest control distributors" },
                  { source: "GeM Seller Portal",  how: "Seller search → fogging machines → download",      note: "Already synced automatically" },
                  { source: "WhatsApp Groups",    how: "Pest control, agri dealer groups → manual entry",  note: "Add via CSV" },
                  { source: "Field Team Data",    how: "Sales rep contacts → company CSV template",        note: "High-trust source" },
                ].map(({ source, how, note }) => (
                  <div key={source} className="bg-gray-50 rounded-lg p-3">
                    <div className="font-semibold text-gray-800 mb-1">{source}</div>
                    <div className="text-gray-500 text-[11px] mb-1.5">{how}</div>
                    <div className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded inline-block">{note}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── State Execution Hub ─────────────────────────────────────────── */}
        {qs && qs.byState.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-gray-900">State Execution Hub</h2>
                <p className="text-[12px] text-gray-500 mt-0.5">
                  Top markets by dealer prospect volume — ready for Customer Match and outreach
                </p>
              </div>
              <a href="/admin/growth/ads/customer-match"
                className="flex items-center gap-1.5 text-[12px] text-blue-600 hover:text-blue-700 font-medium">
                Open Customer Match <ArrowUpRight size={12} />
              </a>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {qs.byState.slice(0, 6).map((row, i) => (
                <StateCard key={row.state} row={row} rank={i + 1} />
              ))}
            </div>
          </div>
        )}

        {/* ── Empty state: no prospects yet ──────────────────────────────── */}
        {qs && qs.total === 0 && !loading && (
          <div className="mt-8 bg-white border border-gray-200 rounded-xl p-12 text-center">
            <TrendingUp size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-600 mb-1">No dealer prospects yet</p>
            <p className="text-[12px] text-gray-400 mb-4">
              Run a sync to pull from GeM seller data, website leads, and RFQ submissions
            </p>
            <button onClick={handleSync} disabled={syncing}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50">
              {syncing
                ? <><Loader2 size={14} className="animate-spin" /> Syncing…</>
                : <><RefreshCw size={14} /> Sync All Sources Now</>
              }
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
