"use client"
import { useEffect, useState, useCallback } from "react"
import {
  Package, RefreshCw, Plus, Play, Pause, CheckCircle2,
  AlertTriangle, Clock, ChevronRight, ChevronDown, Database,
  BarChart3, Layers, Users, Globe, Brain, Search, Shield,
  Zap, Info, TrendingUp, X, FileDown,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type PackStatus = "active" | "importing" | "pending" | "not_started"

interface Category {
  slug:        string
  name:        string
  icon:        string
  description: string
  keywords:    string[]
  status:      "active" | "importing" | "not_started" | "paused"
  enabled:     boolean
  estimate:    { contracts: number; gmvCr: number; importTimeMin: number; storageMb: number }
  packs:       Record<string, PackStatus>
  liveStats:   {
    importedContracts: number
    gmvCr:            number
    enrichedContracts: number
    statesCovered:    number
    buyerCount:       number
    coveragePct:      number
  }
  archiveNote?: string
}

interface CoverageRow {
  slug:         string
  name:         string
  icon:         string
  status:       string
  contracts:    number
  gmvCr:        number
  buyers:       number
  states:       number
  enrichPct:    number
  qualityScore: number
  coveragePct:  number
  lastRefresh:  string | null
  packs:        Record<string, PackStatus>
  archiveNote?: string
}

interface Job {
  status:   string
  progress: { scanned: number; matched: number; saved: number; total: number; pct: number }
  message:  string
  isComplete?: boolean
  archiveNote?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PACK_META: { key: string; label: string; icon: typeof BarChart3 }[] = [
  { key: "procurement", label: "Procurement",  icon: BarChart3  },
  { key: "buyer",       label: "Buyer",        icon: Users      },
  { key: "supplier",    label: "Supplier",     icon: Database   },
  { key: "oem",         label: "OEM",          icon: Layers     },
  { key: "competitor",  label: "Competitor",   icon: Shield     },
  { key: "market",      label: "Market",       icon: TrendingUp },
  { key: "aiSearch",    label: "AI Search",    icon: Brain      },
]

const PACK_COLOR: Record<PackStatus, string> = {
  active:      "text-emerald-600 bg-emerald-50 border-emerald-200",
  importing:   "text-blue-600 bg-blue-50 border-blue-200",
  pending:     "text-amber-600 bg-amber-50 border-amber-200",
  not_started: "text-gray-400 bg-gray-50 border-gray-200",
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  active:      { label: "Active",      cls: "bg-emerald-100 text-emerald-700 border border-emerald-200" },
  importing:   { label: "Importing…",  cls: "bg-blue-100 text-blue-700 border border-blue-200" },
  not_started: { label: "Not Started", cls: "bg-gray-100 text-gray-500 border border-gray-200" },
  paused:      { label: "Paused",      cls: "bg-amber-100 text-amber-700 border border-amber-200" },
}

function fmtN(n: number) { return n.toLocaleString("en-IN") }
function fmtDate(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

// ─── Pack badge ───────────────────────────────────────────────────────────────

function PackBadge({ packKey, status }: { packKey: string; status: PackStatus }) {
  const meta  = PACK_META.find(p => p.key === packKey)
  if (!meta) return null
  const Icon  = meta.icon
  const color = PACK_COLOR[status]
  return (
    <div className={`flex items-center gap-1 text-[9px] border rounded px-1.5 py-0.5 ${color}`} title={`${meta.label}: ${status.replace("_", " ")}`}>
      <Icon size={8} />
      <span>{meta.label}</span>
    </div>
  )
}

// ─── Import dialog ────────────────────────────────────────────────────────────

function ImportDialog({
  cat,
  onClose,
  onDone,
}: { cat: Category; onClose: () => void; onDone: () => void }) {
  const [job,     setJob]     = useState<Job | null>(null)
  const [loading, setLoading] = useState(false)

  const startImport = async (resume = false) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/growth/categories/${cat.slug}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ resume }),
      })
      const data = await res.json()
      setJob(data)

      if (!data.isComplete && data.status !== "completed") {
        // Poll for completion — call again
        poll(data.status)
      }
    } catch {
      setJob({ status: "failed", progress: { scanned: 0, matched: 0, saved: 0, total: 0, pct: 0 }, message: "Request failed", isComplete: false })
    } finally {
      setLoading(false)
    }
  }

  const poll = async (prevStatus: string) => {
    if (prevStatus === "completed" || prevStatus === "failed") return
    await new Promise(r => setTimeout(r, 1500))
    try {
      const res = await fetch(`/api/admin/growth/categories/${cat.slug}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume: true }),
      })
      const data = await res.json()
      setJob(data)
      if (!data.isComplete && data.status !== "completed") {
        poll(data.status)
      } else {
        onDone()
      }
    } catch { /* ignore */ }
  }

  const pct = job?.progress?.pct ?? 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <span className="text-2xl">{cat.icon}</span>
            <h2 className="text-base font-bold text-gray-900 mt-1">{cat.name}</h2>
            <p className="text-xs text-gray-500">Category Import Job</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X size={16} />
          </button>
        </div>

        {/* Estimates */}
        {!job && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-blue-800">Pre-Import Estimates</p>
            <div className="grid grid-cols-2 gap-2">
              {([
                ["Est. Contracts",    fmtN(cat.estimate.contracts)],
                ["Est. GMV",          `₹${cat.estimate.gmvCr} Cr`],
                ["Est. Import Time",  cat.estimate.importTimeMin === 0 ? "N/A" : `~${cat.estimate.importTimeMin} min`],
                ["Storage Impact",    `~${cat.estimate.storageMb} MB`],
                ["Existing Coverage", `${cat.liveStats.importedContracts} contracts`],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} className="bg-white/70 rounded-lg p-2">
                  <p className="text-[9px] text-blue-400 uppercase tracking-wide">{k}</p>
                  <p className="text-xs font-bold text-blue-900">{v}</p>
                </div>
              ))}
            </div>

            <div className="text-[10px] text-blue-700 flex gap-1.5 items-start">
              <Info size={9} className="shrink-0 mt-0.5 text-blue-500" />
              <span>
                Import scans the <strong>gem_contracts</strong> archive and tags all matching records
                with this category. If the archive doesn&apos;t yet include this category&apos;s data,
                0 contracts will be found.
              </span>
            </div>
          </div>
        )}

        {/* Archive note */}
        {cat.slug !== "fogging-machines" && cat.liveStats.importedContracts === 0 && !job && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[10px] text-amber-800 flex gap-1.5">
            <AlertTriangle size={10} className="shrink-0 mt-0.5 text-amber-500" />
            <span>
              The gem_contracts archive currently has limited non-fogging data. This import will
              tag whatever matching contracts exist. Results may be 0 until the GeM archive is
              expanded with this category&apos;s historical data.
            </span>
          </div>
        )}

        {/* Job progress */}
        {job && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-700">
                {job.status === "completed" || job.isComplete ? "Complete" : "Running…"}
              </span>
              <span className="text-xs text-gray-500">{pct}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  job.isComplete || job.status === "completed"
                    ? "bg-emerald-500"
                    : "bg-blue-500 animate-pulse"
                }`}
                style={{ width: `${pct || 5}%` }}
              />
            </div>
            <div className="grid grid-cols-3 gap-1 text-center">
              {([
                ["Scanned",  fmtN(job.progress?.scanned ?? 0)],
                ["Matched",  fmtN(job.progress?.matched ?? 0)],
                ["Tagged",   fmtN(job.progress?.saved   ?? 0)],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} className="bg-gray-50 rounded-lg p-2">
                  <p className="text-[9px] text-gray-400 uppercase tracking-wide">{k}</p>
                  <p className="text-xs font-bold text-gray-800">{v}</p>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-gray-600">{job.message}</p>
            {job.archiveNote && (
              <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                {job.archiveNote}
              </p>
            )}
          </div>
        )}

        {/* Intelligence packs that will be unlocked */}
        <div>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
            Intelligence Packs — Auto-activated on import
          </p>
          <div className="flex flex-wrap gap-1.5">
            {PACK_META.map(p => (
              <div
                key={p.key}
                className={`flex items-center gap-1 text-[9px] border rounded px-2 py-1 ${
                  ["procurement", "buyer", "supplier"].includes(p.key)
                    ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                    : "text-gray-400 bg-gray-50 border-gray-200"
                }`}
              >
                <p.icon size={8} />
                <span>{p.label}</span>
                {["procurement", "buyer", "supplier"].includes(p.key) && (
                  <CheckCircle2 size={7} className="text-emerald-500" />
                )}
              </div>
            ))}
          </div>
          <p className="text-[9px] text-gray-400 mt-1">
            OEM / Competitor / Market Intelligence requires additional enrichment after import.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 text-xs px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            {job?.isComplete || job?.status === "completed" ? "Close" : "Cancel"}
          </button>
          {!job && (
            <button
              onClick={() => startImport(false)}
              disabled={loading || cat.slug === "fogging-machines"}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs px-4 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {loading ? <RefreshCw size={12} className="animate-spin" /> : <Play size={12} />}
              {cat.slug === "fogging-machines" ? "Already Active" : "Start Import"}
            </button>
          )}
          {job && !job.isComplete && job.status !== "completed" && (
            <button
              onClick={() => startImport(true)}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs px-4 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {loading ? <RefreshCw size={12} className="animate-spin" /> : <Play size={12} />}
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Category Card ────────────────────────────────────────────────────────────

function CategoryCard({
  cat,
  onImport,
}: { cat: Category; onImport: (c: Category) => void }) {
  const [open, setOpen] = useState(false)
  const s    = cat.liveStats
  const badge = STATUS_BADGE[cat.status] ?? STATUS_BADGE.not_started
  const pct  = s.coveragePct ?? 0

  return (
    <div className={`bg-white border rounded-xl shadow-sm overflow-hidden transition-all ${
      cat.status === "active" ? "border-emerald-200" : "border-gray-200"
    }`}>
      {/* Card header */}
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">{cat.icon}</span>
            <div>
              <p className="text-sm font-bold text-gray-900 leading-tight">{cat.name}</p>
              <span className={`inline-flex text-[9px] px-1.5 py-0.5 rounded-full font-medium ${badge.cls}`}>
                {badge.label}
              </span>
            </div>
          </div>
          {cat.status !== "active" && (
            <button
              onClick={() => onImport(cat)}
              className="flex items-center gap-1 text-[10px] px-2.5 py-1.5 rounded-lg bg-brand-50 border border-brand-200 text-brand-700 hover:bg-brand-100 shrink-0"
            >
              <Play size={9} />
              Import
            </button>
          )}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-2">
          {([
            ["Contracts", fmtN(s.importedContracts || 0)],
            ["GMV",       s.gmvCr ? `₹${s.gmvCr}Cr` : "—"],
            ["Buyers",    fmtN(s.buyerCount || 0)],
          ] as [string, string][]).map(([label, val]) => (
            <div key={label} className="bg-gray-50 rounded-lg p-2 text-center">
              <p className="text-[9px] text-gray-400 uppercase tracking-wide">{label}</p>
              <p className="text-xs font-bold text-gray-800">{val}</p>
            </div>
          ))}
        </div>

        {/* Coverage bar */}
        {cat.status !== "not_started" && (
          <div>
            <div className="flex justify-between text-[9px] text-gray-500 mb-1">
              <span>Coverage</span>
              <span>{pct}% of est. {fmtN(cat.estimate.contracts)} contracts</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${pct >= 80 ? "bg-emerald-500" : pct >= 40 ? "bg-blue-500" : "bg-amber-500"}`}
                style={{ width: `${Math.min(100, pct)}%` }}
              />
            </div>
          </div>
        )}

        {cat.status === "not_started" && (
          <div className="text-[10px] text-gray-400 flex items-center gap-1.5">
            <Clock size={9} />
            <span>Est. {cat.estimate.contracts.toLocaleString("en-IN")} contracts · ₹{cat.estimate.gmvCr}Cr GMV · ~{cat.estimate.importTimeMin}min import</span>
          </div>
        )}
      </div>

      {/* Intelligence packs */}
      <div className="border-t border-gray-100 px-4 py-2.5">
        <button
          onClick={() => setOpen(v => !v)}
          className="w-full flex items-center justify-between text-[10px] text-gray-500"
        >
          <span className="font-medium">Intelligence Packs</span>
          {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        </button>
        {open && (
          <div className="mt-2 flex flex-wrap gap-1">
            {PACK_META.map(p => (
              <PackBadge key={p.key} packKey={p.key} status={(cat.packs?.[p.key] as PackStatus) ?? "not_started"} />
            ))}
          </div>
        )}
        {!open && (
          <div className="flex items-center gap-1 mt-1">
            {PACK_META.map(p => {
              const st = (cat.packs?.[p.key] as PackStatus) ?? "not_started"
              return (
                <div
                  key={p.key}
                  className={`w-2 h-2 rounded-full ${
                    st === "active" ? "bg-emerald-500"
                    : st === "pending" ? "bg-amber-400"
                    : st === "importing" ? "bg-blue-500"
                    : "bg-gray-200"
                  }`}
                  title={`${p.label}: ${st}`}
                />
              )
            })}
            <span className="text-[9px] text-gray-400 ml-1">
              {PACK_META.filter(p => cat.packs?.[p.key] === "active").length}/{PACK_META.length} active
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Coverage Table ───────────────────────────────────────────────────────────

function CoverageDashboard({ rows }: { rows: CoverageRow[] }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <p className="text-xs font-bold text-gray-700 flex items-center gap-2">
          <BarChart3 size={13} className="text-brand-600" />
          Coverage Dashboard
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {["Category", "Status", "Contracts", "GMV (Cr)", "Buyers", "States",
                "Enrichment", "Quality", "Coverage %", "Last Refresh", "Packs"].map(h => (
                <th key={h} className="px-3 py-2 text-left text-[9px] text-gray-400 uppercase tracking-wide font-semibold whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map(row => {
              const badge = STATUS_BADGE[row.status] ?? STATUS_BADGE.not_started
              return (
                <tr key={row.slug} className="hover:bg-gray-50">
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{row.icon}</span>
                      <span className="font-medium text-gray-800">{row.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 font-semibold text-gray-700">{fmtN(row.contracts)}</td>
                  <td className="px-3 py-2.5 text-gray-600">₹{row.gmvCr}</td>
                  <td className="px-3 py-2.5 text-gray-600">{fmtN(row.buyers)}</td>
                  <td className="px-3 py-2.5 text-gray-600">{row.states}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-12 h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${row.enrichPct >= 80 ? "bg-emerald-500" : "bg-amber-400"}`}
                          style={{ width: `${row.enrichPct}%` }} />
                      </div>
                      <span className="text-gray-500">{row.enrichPct}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-[9px] font-bold ${
                      row.qualityScore >= 80 ? "text-emerald-600"
                      : row.qualityScore >= 50 ? "text-amber-600"
                      : "text-gray-400"
                    }`}>
                      {row.qualityScore > 0 ? `${row.qualityScore}/100` : "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    {row.contracts > 0 ? (
                      <div className="flex items-center gap-1.5">
                        <div className="w-12 h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${Math.min(100, row.coveragePct)}%` }} />
                        </div>
                        <span className="text-gray-500">{row.coveragePct}%</span>
                      </div>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-gray-400 whitespace-nowrap">{fmtDate(row.lastRefresh)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-0.5">
                      {PACK_META.map(p => {
                        const st = (row.packs?.[p.key] as PackStatus) ?? "not_started"
                        return (
                          <div key={p.key} title={`${p.label}: ${st}`}
                            className={`w-1.5 h-1.5 rounded-full ${
                              st === "active"      ? "bg-emerald-500"
                              : st === "pending"   ? "bg-amber-400"
                              : st === "importing" ? "bg-blue-500"
                              : "bg-gray-200"
                            }`}
                          />
                        )
                      })}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = "categories" | "coverage"

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [coverage,   setCoverage]   = useState<CoverageRow[]>([])
  const [summary,    setSummary]    = useState<Record<string, number>>({})
  const [tab,        setTab]        = useState<Tab>("categories")
  const [loading,    setLoading]    = useState(true)
  const [covLoading, setCovLoading] = useState(false)
  const [importCat,  setImportCat]  = useState<Category | null>(null)

  const loadCategories = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch("/api/admin/growth/categories")
      const data = await res.json()
      setCategories(data.categories ?? [])
      setSummary(data.summary ?? {})
    } finally {
      setLoading(false)
    }
  }, [])

  const loadCoverage = useCallback(async () => {
    setCovLoading(true)
    try {
      const res  = await fetch("/api/admin/growth/categories/coverage")
      const data = await res.json()
      setCoverage(data.rows ?? [])
      setSummary(prev => ({ ...prev, ...data.summary }))
    } finally {
      setCovLoading(false)
    }
  }, [])

  useEffect(() => { loadCategories() }, [loadCategories])
  useEffect(() => {
    if (tab === "coverage") loadCoverage()
  }, [tab, loadCoverage])

  const handleImportDone = () => {
    setImportCat(null)
    loadCategories()
  }

  const TABS: { id: Tab; label: string; icon: typeof Package }[] = [
    { id: "categories", label: "Category Registry",    icon: Package  },
    { id: "coverage",   label: "Coverage Dashboard",   icon: BarChart3 },
  ]

  return (
    <main className="flex-1 p-4 space-y-4 min-h-0">
      {/* Import dialog */}
      {importCat && (
        <ImportDialog
          cat={importCat}
          onClose={() => setImportCat(null)}
          onDone={handleImportDone}
        />
      )}

      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Layers size={20} className="text-brand-600" />
            Category Intelligence Platform
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Modular intelligence packs — add any industry as a knowledge domain
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadCategories}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {([
          ["Total Categories",   summary.totalCategories   ?? "—", "text-gray-700"],
          ["Active",             summary.activeCategories  ?? "—", "text-emerald-600"],
          ["Importing",          summary.importing         ?? "—", "text-blue-600"],
          ["Total Contracts",    summary.totalImported     ? fmtN(Number(summary.totalImported)) : "—", "text-gray-700"],
          ["Total GMV",          summary.totalGmvCr        ? `₹${summary.totalGmvCr}Cr` : "—", "text-gray-700"],
        ] as [string, string | number, string][]).map(([label, val, color]) => (
          <div key={label} className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
            <p className="text-[9px] text-gray-400 uppercase tracking-wide">{label}</p>
            <p className={`text-lg font-bold ${color}`}>{val}</p>
          </div>
        ))}
      </div>

      {/* Context banner */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 text-[11px] text-indigo-800 flex gap-2 items-start">
        <Info size={12} className="text-indigo-500 shrink-0 mt-0.5" />
        <span>
          Each category is an independent intelligence pack. Once imported, a category
          automatically receives <strong>Procurement · Buyer · Supplier Intelligence</strong>.
          OEM, Competitor, Market, and AI Search intelligence require additional enrichment.
          Fogging Machines is the only fully enriched category (v1.4 — all 7 packs active or pending).
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors ${
              tab === t.id
                ? "bg-white shadow-sm text-gray-900 font-semibold"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <t.icon size={12} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Categories tab */}
      {tab === "categories" && (
        <div className="space-y-4">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="h-48 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              {/* Active first */}
              {categories.filter(c => c.status === "active").length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 size={10} className="text-emerald-500" />
                    Active ({categories.filter(c => c.status === "active").length})
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categories.filter(c => c.status === "active").map(cat => (
                      <CategoryCard key={cat.slug} cat={cat} onImport={setImportCat} />
                    ))}
                  </div>
                </div>
              )}

              {/* Not started */}
              {categories.filter(c => c.status !== "active").length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock size={10} className="text-gray-400" />
                    Available to Import ({categories.filter(c => c.status !== "active").length})
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categories.filter(c => c.status !== "active").map(cat => (
                      <CategoryCard key={cat.slug} cat={cat} onImport={setImportCat} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Coverage tab */}
      {tab === "coverage" && (
        covLoading ? (
          <div className="h-64 bg-gray-50 rounded-xl animate-pulse flex items-center justify-center">
            <p className="text-sm text-gray-400">Loading coverage data…</p>
          </div>
        ) : (
          <CoverageDashboard rows={coverage} />
        )
      )}
    </main>
  )
}
