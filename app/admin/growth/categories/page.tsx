"use client"
import { useEffect, useState, useCallback, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  Layers, RefreshCw, Plus, Play, X, CheckCircle2,
  Clock, AlertTriangle, ChevronRight, Search,
  BarChart3, Database, Info, Package, Zap,
  TrendingUp, ArrowRight, Globe,
} from "lucide-react"
import { CATEGORY_CATALOG } from "@/lib/category-catalog"

// ─── Types ────────────────────────────────────────────────────────────────────

interface LiveCategory {
  slug:    string
  name:    string
  icon:    string
  status:  string
  enabled: boolean
  estimate: { contracts: number; gmvCr: number; importTimeMin: number; storageMb: number }
  packs:   Record<string, string>
  liveStats: {
    importedContracts: number
    gmvCr:            number
    enrichedContracts: number
    statesCovered:    number
    buyerCount:       number
    coveragePct:      number
  }
}

interface Job {
  status:     string
  isComplete: boolean
  progress:   { scanned: number; matched: number; saved: number; total: number; pct: number }
  message:    string
  archiveNote?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtN(n: number) { return n.toLocaleString("en-IN") }

// ─── Import Modal ─────────────────────────────────────────────────────────────

function ImportModal({ cat, onClose, onDone }: {
  cat: LiveCategory; onClose: () => void; onDone: () => void
}) {
  const [job,     setJob]     = useState<Job | null>(null)
  const [loading, setLoading] = useState(false)
  const pollRef = useRef(false)

  const runImport = async (resume = false) => {
    setLoading(true)
    try {
      const res  = await fetch(`/api/admin/growth/categories/${cat.slug}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume }),
      })
      const data = await res.json()
      setJob(data)
      if (!data.isComplete && data.status !== "completed") {
        pollRef.current = true
        continuePolling()
      } else {
        onDone()
      }
    } finally {
      setLoading(false)
    }
  }

  const continuePolling = async () => {
    if (!pollRef.current) return
    await new Promise(r => setTimeout(r, 1200))
    if (!pollRef.current) return
    const res  = await fetch(`/api/admin/growth/categories/${cat.slug}/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resume: true }),
    })
    const data = await res.json()
    setJob(data)
    if (!data.isComplete && data.status !== "completed") {
      continuePolling()
    } else {
      pollRef.current = false
      onDone()
    }
  }

  useEffect(() => () => { pollRef.current = false }, [])

  const isActive    = cat.status === "active"
  const pct         = job?.progress?.pct ?? 0
  const isDone      = job?.isComplete || job?.status === "completed"

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md space-y-5 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{cat.icon}</span>
            <div>
              <h2 className="text-sm font-black text-gray-900">{cat.name}</h2>
              <p className="text-[10px] text-gray-400">Category Import Job</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-300 hover:text-gray-600 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Already active notice */}
        {isActive && !job && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-600" />
              <p className="text-xs font-semibold text-emerald-800">Category Active</p>
            </div>
            <p className="text-[10px] text-emerald-700">
              {fmtN(cat.liveStats.importedContracts)} contracts imported — {cat.liveStats.coveragePct}% coverage.
              You can re-import to pick up new archive data.
            </p>
          </div>
        )}

        {/* Estimates */}
        {!job && (
          <div className="grid grid-cols-2 gap-2">
            {([
              ["Est. Contracts",   fmtN(cat.estimate.contracts)],
              ["Est. GMV",         `₹${cat.estimate.gmvCr} Cr`],
              ["Import Time",      cat.estimate.importTimeMin === 0 ? "N/A" : `~${cat.estimate.importTimeMin} min`],
              ["Storage Impact",   `~${cat.estimate.storageMb} MB`],
              ["Already Imported", fmtN(cat.liveStats.importedContracts)],
              ["Coverage",         `${cat.liveStats.coveragePct}%`],
            ] as [string, string][]).map(([k, v]) => (
              <div key={k} className="bg-gray-50 rounded-xl p-2.5">
                <p className="text-[9px] text-gray-400 uppercase tracking-wide">{k}</p>
                <p className="text-xs font-bold text-gray-800">{v}</p>
              </div>
            ))}
          </div>
        )}

        {/* Archive note */}
        {!isActive && !job && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[10px] text-amber-800 flex gap-1.5">
            <AlertTriangle size={10} className="text-amber-500 shrink-0 mt-0.5" />
            <span>
              Import tags matching contracts in <strong>gem_contracts</strong> archive.
              Results may be 0 if this category&apos;s data isn&apos;t in the archive yet.
            </span>
          </div>
        )}

        {/* Progress */}
        {job && (
          <div className="space-y-3">
            <div className="flex justify-between text-[11px] font-medium text-gray-700">
              <span>{isDone ? "Complete" : "Importing…"}</span>
              <span>{pct}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${isDone ? "bg-emerald-500" : "bg-brand-500 animate-pulse"}`}
                style={{ width: `${pct || 3}%` }} />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {([
                ["Scanned", fmtN(job.progress?.scanned ?? 0)],
                ["Matched", fmtN(job.progress?.matched ?? 0)],
                ["Tagged",  fmtN(job.progress?.saved   ?? 0)],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} className="bg-gray-50 rounded-lg p-2">
                  <p className="text-[9px] text-gray-400">{k}</p>
                  <p className="text-xs font-bold text-gray-700">{v}</p>
                </div>
              ))}
            </div>
            {job.message && <p className="text-[10px] text-gray-500">{job.message}</p>}
            {job.archiveNote && (
              <div className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                {job.archiveNote}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 text-xs px-4 py-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">
            {isDone ? "Done" : "Cancel"}
          </button>
          {!isDone && (
            <button
              onClick={() => runImport(!!job)}
              disabled={loading || cat.slug === "fogging-machines" && isActive}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs px-4 py-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 disabled:opacity-40"
            >
              {loading ? <RefreshCw size={11} className="animate-spin" /> : <Play size={11} />}
              {job ? "Continue" : (isActive ? "Re-import" : "Start Import")}
            </button>
          )}
          {isDone && (
            <Link href={`/admin/growth/categories/${cat.slug}`}
              className="flex-1 flex items-center justify-center gap-1.5 text-xs px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700">
              <Zap size={11} />Open Workspace
            </Link>
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
}: { cat: LiveCategory; onImport: (c: LiveCategory) => void }) {
  const isActive  = cat.status === "active"
  const s         = cat.liveStats
  const activePacks = Object.values(cat.packs ?? {}).filter(v => v === "active").length
  const totalPacks  = Object.keys(cat.packs ?? {}).length

  return (
    <div className={`bg-white border rounded-2xl shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md ${
      isActive ? "border-emerald-200" : "border-gray-200 hover:border-gray-300"
    }`}>
      {/* Card top */}
      <div className="p-4 flex-1">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-3xl leading-none">{cat.icon}</span>
            <div>
              <p className="text-sm font-bold text-gray-900 leading-tight">{cat.name}</p>
              <span className={`inline-block text-[9px] px-2 py-0.5 rounded-full font-semibold border mt-1 ${
                isActive
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-gray-50 text-gray-400 border-gray-200"
              }`}>
                {isActive ? "● Active" : "Not Imported"}
              </span>
            </div>
          </div>
        </div>

        {/* Stats */}
        {isActive ? (
          <div className="grid grid-cols-3 gap-1.5 mb-3">
            {([
              [fmtN(s.importedContracts), "Contracts"],
              [`₹${s.gmvCr}Cr`,          "GMV"],
              [fmtN(s.buyerCount),        "Buyers"],
            ] as [string, string][]).map(([v, l]) => (
              <div key={l} className="bg-gray-50 rounded-lg p-1.5 text-center">
                <p className="text-[10px] font-black text-gray-800">{v}</p>
                <p className="text-[8px] text-gray-400">{l}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 rounded-xl p-3 mb-3 space-y-1">
            <div className="flex justify-between text-[10px]">
              <span className="text-gray-400">Est. Contracts</span>
              <span className="font-semibold text-gray-600">{fmtN(cat.estimate.contracts)}</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-gray-400">Est. GMV</span>
              <span className="font-semibold text-gray-600">₹{cat.estimate.gmvCr} Cr</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-gray-400">Import Time</span>
              <span className="font-semibold text-gray-600">
                {cat.estimate.importTimeMin === 0 ? "Instant" : `~${cat.estimate.importTimeMin} min`}
              </span>
            </div>
          </div>
        )}

        {/* Coverage bar */}
        {isActive && (
          <div className="mb-3">
            <div className="flex justify-between text-[9px] text-gray-400 mb-1">
              <span>Coverage</span>
              <span>{s.coveragePct}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${s.coveragePct >= 80 ? "bg-emerald-500" : s.coveragePct >= 40 ? "bg-blue-500" : "bg-amber-400"}`}
                style={{ width: `${Math.min(100, s.coveragePct)}%` }} />
            </div>
          </div>
        )}

        {/* Pack dots */}
        <div className="flex items-center gap-1">
          {Object.entries(cat.packs ?? {}).map(([key, st]) => (
            <div key={key} title={key}
              className={`w-2 h-2 rounded-full ${st === "active" ? "bg-emerald-500" : st === "pending" ? "bg-amber-400" : "bg-gray-200"}`}
            />
          ))}
          <span className="text-[9px] text-gray-400 ml-1">{activePacks}/{totalPacks} packs</span>
        </div>
      </div>

      {/* Card footer */}
      <div className="border-t border-gray-100 p-3 flex gap-2">
        {isActive ? (
          <Link
            href={`/admin/growth/categories/${cat.slug}`}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 font-semibold"
          >
            Open Workspace
            <ArrowRight size={11} />
          </Link>
        ) : (
          <button
            onClick={() => onImport(cat)}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 font-semibold"
          >
            <Play size={11} />
            Import Category
          </button>
        )}
        {isActive && (
          <button
            onClick={() => onImport(cat)}
            className="flex items-center justify-center text-xs px-3 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-500"
            title="Refresh import"
          >
            <RefreshCw size={11} />
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CategoryManagerPage() {
  const searchParams  = useSearchParams()
  const router        = useRouter()

  const [categories, setCategories] = useState<LiveCategory[]>([])
  const [summary,    setSummary]    = useState<Record<string, number>>({})
  const [loading,    setLoading]    = useState(true)
  const [filter,     setFilter]     = useState<"all" | "active" | "pending">("all")
  const [query,      setQuery]      = useState("")
  const [importCat,  setImportCat]  = useState<LiveCategory | null>(null)

  // Auto-open import modal if URL has ?import=slug
  const importSlug = searchParams.get("import")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch("/api/admin/growth/categories")
      const data = await res.json()
      setCategories(data.categories ?? [])
      setSummary(data.summary ?? {})

      // If ?import=slug, open that category's modal
      if (importSlug) {
        const target = (data.categories as LiveCategory[]).find(c => c.slug === importSlug)
        if (target) setImportCat(target)
      }
    } finally {
      setLoading(false)
    }
  }, [importSlug])

  useEffect(() => { load() }, [load])

  const handleImportDone = () => {
    setImportCat(null)
    router.replace("/admin/growth/categories")
    load()
  }

  const filtered = categories
    .filter(c => filter === "all" || (filter === "active" ? c.status === "active" : c.status !== "active"))
    .filter(c => !query || c.name.toLowerCase().includes(query.toLowerCase()))

  const active  = categories.filter(c => c.status === "active").length
  const pending = categories.filter(c => c.status !== "active").length

  // Estimated remaining
  const estRemainingContracts = categories
    .filter(c => c.status !== "active")
    .reduce((s, c) => s + c.estimate.contracts, 0)
  const estRemainingGmv = categories
    .filter(c => c.status !== "active")
    .reduce((s, c) => s + c.estimate.gmvCr, 0)

  const totalActiveContracts = categories
    .filter(c => c.status === "active")
    .reduce((s, c) => s + (c.liveStats?.importedContracts ?? 0), 0)
  const totalActiveGmv = categories
    .filter(c => c.status === "active")
    .reduce((s, c) => s + (c.liveStats?.gmvCr ?? 0), 0)

  return (
    <main className="flex-1 p-4 space-y-5 min-h-0">
      {importCat && (
        <ImportModal cat={importCat} onClose={() => setImportCat(null)} onDone={handleImportDone} />
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-900 flex items-center gap-2.5">
            <Layers size={22} className="text-brand-600" />
            Category Intelligence Platform
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Add any industry as a modular intelligence workspace — procurement, buyers, suppliers, OEM, market, AI search
          </p>
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 text-xs px-3 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-500">
          <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Platform Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {([
          ["Total Categories",     String(categories.length),                   "gray"],
          ["Active",               String(active),                              "emerald"],
          ["Pending Import",       String(pending),                             "amber"],
          ["Active Contracts",     fmtN(totalActiveContracts),                 "brand"],
          ["Active GMV",           `₹${totalActiveGmv.toFixed(0)}Cr`,         "blue"],
          ["Est. Remaining",       `${fmtN(estRemainingContracts)} contracts`, "purple"],
          ["Est. Pipeline GMV",    `₹${estRemainingGmv.toFixed(0)}Cr`,        "pink"],
        ] as [string, string, string][]).map(([label, val, color]) => (
          <div key={label} className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 shadow-sm">
            <p className="text-[9px] text-gray-400 uppercase tracking-wide truncate">{label}</p>
            <p className={`text-sm font-black text-${color}-600 leading-tight mt-0.5`}>{val}</p>
          </div>
        ))}
      </div>

      {/* Search + filter bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search categories…"
            className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-brand-400"
          />
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {(["all", "active", "pending"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-lg capitalize transition-colors ${
                filter === f ? "bg-white shadow-sm text-gray-900 font-semibold" : "text-gray-500 hover:text-gray-700"
              }`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Banner: how this works */}
      {!loading && active === 1 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 text-[11px] text-indigo-800 flex items-start gap-2.5">
          <Info size={13} className="text-indigo-500 shrink-0 mt-0.5" />
          <div>
            <strong>Thermal Fogging Machines is your only active intelligence workspace.</strong>{" "}
            Each category you import becomes a full intelligence workspace with procurement, buyer, supplier, OEM,
            competitor, and market intelligence — all driven from a single slug. No frontend code required to add new industries.
          </div>
        </div>
      )}

      {/* Category Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="h-60 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active workspaces */}
          {filtered.filter(c => c.status === "active").length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 size={13} className="text-emerald-500" />
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                  Active Intelligence Workspaces ({filtered.filter(c => c.status === "active").length})
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filtered.filter(c => c.status === "active").map(cat => (
                  <CategoryCard key={cat.slug} cat={cat} onImport={setImportCat} />
                ))}
              </div>
            </div>
          )}

          {/* Available to import */}
          {filtered.filter(c => c.status !== "active").length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock size={13} className="text-gray-400" />
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                  Available to Import ({filtered.filter(c => c.status !== "active").length} categories · est. ₹{estRemainingGmv.toFixed(0)}Cr pipeline)
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filtered.filter(c => c.status !== "active").map(cat => (
                  <CategoryCard key={cat.slug} cat={cat} onImport={setImportCat} />
                ))}
              </div>
            </div>
          )}

          {filtered.length === 0 && (
            <div className="text-center py-16 text-gray-400 text-sm">No categories match your filter.</div>
          )}
        </div>
      )}

      {/* Bottom architecture note */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-[10px] text-gray-500">
        <p className="font-bold text-gray-600 mb-1.5 text-xs">Universal Architecture</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[10px]">
          <div className="flex items-start gap-1.5">
            <Database size={10} className="text-gray-400 shrink-0 mt-0.5" />
            <span><strong>Add a category:</strong> slug + keyword list + archive import. No schema changes, no frontend code.</span>
          </div>
          <div className="flex items-start gap-1.5">
            <Globe size={10} className="text-gray-400 shrink-0 mt-0.5" />
            <span><strong>Each workspace:</strong> 15 intelligence tabs, all driven by slug. OEM / Competitor / Market unlock after enrichment.</span>
          </div>
          <div className="flex items-start gap-1.5">
            <TrendingUp size={10} className="text-gray-400 shrink-0 mt-0.5" />
            <span><strong>Import engine:</strong> keyword filter on gem_contracts archive. Resumable batches, progress tracking, honest 0-result explanation.</span>
          </div>
        </div>
      </div>
    </main>
  )
}
