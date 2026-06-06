"use client"
import { useEffect, useState, useCallback } from "react"
import {
  HardDrive, Database, FileText, Archive, AlertTriangle,
  CheckCircle, RefreshCw, Copy, Trash2, BookmarkCheck,
} from "lucide-react"

// ─── Types ─────────────────────────────────────────────────────────────────────
interface ClassStats {
  count:        number
  pdf_on_disk:  number
  pdf_bytes:    number
  deleted_count: number
}

interface Overview {
  total:           number
  enriched:        number
  classified:      number
  unclassified:    number
  by_class:        { A: ClassStats; B: ClassStats; C: ClassStats }
  tier1_mongo_kb:  number
  tier2_raw_kb:    number
  tier3_pdf_kb:    number
  tier3_pdf_count: number
  raw_count:       number
  duplicate_groups: number
  reclaimable_C_kb: number
}

interface ForecastRow {
  scenario: string
  per_year: number
  year1: ForecastPoint
  year3: ForecastPoint
  year5: ForecastPoint
}

interface ForecastPoint {
  years:           number
  contracts_total: number
  tier1_mongo_mb:  number
  tier2_raw_mb:    number
  tier3_pdf_a_mb:  number
  tier3_pdf_b_mb:  number
  tier3_pdf_c_mb:  number
  total_tiered_mb: number
  naive_total_mb:  number
  savings_pct:     number
}

interface ContractRecord {
  gemc_no:              string
  seller_name_canonical: string | null
  product_name:         string | null
  contract_value_num:   number | null
  pdf_retention_class:  string | null
  pdf_saved:            boolean | null
  pdf_size:             number | null
  pdf_deleted_at:       string | null
  pdf_bookmarked:       boolean | null
  extraction_confidence: number | null
  first_seen:           string | null
  raw_deleted_at:       string | null
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function fmtBytes(kb: number | null | undefined) {
  if (!kb) return "0 KB"
  if (kb >= 1024 * 1024) return `${(kb / 1024 / 1024).toFixed(1)} TB`
  if (kb >= 1024)        return `${(kb / 1024).toFixed(1)} GB`
  return `${Math.round(kb)} MB`
}

function fmtKB(bytes: number | null | undefined) {
  if (!bytes) return "—"
  const kb = bytes / 1024
  if (kb >= 1024) return `${(kb / 1024).toFixed(1)} MB`
  return `${Math.round(kb)} KB`
}

function fmtInr(n: number | null | undefined) {
  if (!n) return "—"
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(1)} Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`
  return `₹${n.toLocaleString()}`
}

function fmtDate(s: string | null | undefined) {
  if (!s) return "—"
  const d = new Date(s)
  if (isNaN(d.getTime())) return "—"
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })
}

function truncate(s: string | null | undefined, len = 35) {
  if (!s) return "—"
  return s.length > len ? s.slice(0, len) + "…" : s
}

function ClassBadge({ cls }: { cls: string | null }) {
  if (!cls) return <span className="text-gray-600 text-[10px]">—</span>
  const styles: Record<string, string> = {
    A: "bg-green-900/40 text-green-400 border-green-800/50",
    B: "bg-blue-900/40  text-blue-400  border-blue-800/50",
    C: "bg-gray-700     text-gray-400  border-gray-600",
  }
  const labels: Record<string, string> = { A: "Class A", B: "Class B", C: "Class C" }
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono ${styles[cls] || "bg-gray-700 text-gray-400"}`}>
      {labels[cls] || cls}
    </span>
  )
}

function Spinner() {
  return <div className="py-10 text-center text-gray-500 text-sm animate-pulse">Loading…</div>
}

// ─── Tier card ─────────────────────────────────────────────────────────────────
function TierCard({
  tier, label, description, kb, count, extra, color,
  icon: Icon,
}: {
  tier: string; label: string; description: string
  kb: number; count?: number; extra?: string; color: string
  icon: React.ElementType
}) {
  const fmtStorage = () => {
    if (kb >= 1024) return `${(kb / 1024).toFixed(1)} GB`
    return `${Math.round(kb)} MB`
  }
  return (
    <div className={`bg-gray-900 border rounded-xl p-4 border-gray-700`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1.5 rounded-lg bg-gray-800`}>
          <Icon size={14} className={color} />
        </div>
        <div>
          <div className="text-[10px] text-gray-400 uppercase tracking-widest">{tier}</div>
          <div className="text-sm font-semibold text-white">{label}</div>
        </div>
      </div>
      <div className="text-2xl font-bold font-mono text-white mt-1">{fmtStorage()}</div>
      {count !== undefined && <div className="text-xs text-gray-500 mt-0.5">{count.toLocaleString()} records</div>}
      <div className="text-[11px] text-gray-500 mt-2 leading-relaxed">{description}</div>
      {extra && <div className={`text-xs mt-1.5 ${color}`}>{extra}</div>}
    </div>
  )
}

// ─── Class card ────────────────────────────────────────────────────────────────
function ClassCard({
  cls, label, policy, stats,
}: {
  cls: "A" | "B" | "C"
  label: string
  policy: string
  stats: ClassStats
}) {
  const colors: Record<string, { ring: string; text: string; bg: string }> = {
    A: { ring: "border-green-700/50", text: "text-green-400", bg: "bg-green-900/20" },
    B: { ring: "border-blue-700/50",  text: "text-blue-400",  bg: "bg-blue-900/20" },
    C: { ring: "border-gray-600",     text: "text-gray-400",  bg: "bg-gray-800/50" },
  }
  const c = colors[cls]
  const sizeMB = stats.pdf_bytes ? (stats.pdf_bytes / 1024 / 1024).toFixed(1) : "0"
  const avgKB  = stats.pdf_on_disk ? Math.round(stats.pdf_bytes / stats.pdf_on_disk / 1024) : 0

  return (
    <div className={`${c.bg} border ${c.ring} rounded-xl p-4`}>
      <div className="flex items-start justify-between">
        <div>
          <div className={`text-xs font-bold ${c.text} mb-0.5`}>Class {cls} — {label}</div>
          <div className="text-[11px] text-gray-400 leading-snug">{policy}</div>
        </div>
        <div className={`text-2xl font-bold font-mono ${c.text}`}>{stats.count}</div>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-3 text-center">
        <div>
          <div className="text-xs font-bold text-white">{stats.pdf_on_disk}</div>
          <div className="text-[10px] text-gray-500">PDFs on disk</div>
        </div>
        <div>
          <div className="text-xs font-bold text-white">{sizeMB} MB</div>
          <div className="text-[10px] text-gray-500">disk used</div>
        </div>
        <div>
          <div className="text-xs font-bold text-white">{avgKB > 0 ? `${avgKB} KB` : "—"}</div>
          <div className="text-[10px] text-gray-500">avg PDF</div>
        </div>
      </div>
      {stats.deleted_count > 0 && (
        <div className="mt-2 text-[10px] text-gray-500 flex items-center gap-1">
          <CheckCircle size={9} className="text-green-500" />
          {stats.deleted_count} PDFs already cleaned up
        </div>
      )}
    </div>
  )
}

// ─── Forecast table ────────────────────────────────────────────────────────────
function ForecastTable({ rows }: { rows: ForecastRow[] }) {
  const COLOR = ["text-emerald-400", "text-yellow-400", "text-red-400"]

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-700 flex items-center gap-2">
        <Database size={13} className="text-orange-400" />
        <span className="text-sm font-semibold text-white">Storage Forecast</span>
        <span className="text-[10px] text-gray-500 ml-1">— tiered strategy vs. naive (keep everything)</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-700/80 text-[10px] uppercase tracking-wide text-gray-400">
              <th className="text-left py-2.5 px-5 w-48">Scenario</th>
              {["Year 1", "Year 3", "Year 5"].map(y => (
                <th key={y} colSpan={2} className="text-center py-2.5 px-2 border-l border-gray-700/40">{y}</th>
              ))}
            </tr>
            <tr className="border-b border-gray-700/40 text-[10px] text-gray-500">
              <th className="py-1.5 px-5" />
              {[1, 3, 5].map(y => (
                <>
                  <th key={`t${y}`} className="py-1.5 px-2 text-center border-l border-gray-700/20">Tiered</th>
                  <th key={`n${y}`} className="py-1.5 px-2 text-center">Naive</th>
                </>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.scenario} className="border-b border-gray-800/60">
                <td className="py-3 px-5">
                  <div className={`text-xs font-medium ${COLOR[i]}`}>{row.scenario}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">{row.per_year.toLocaleString()} contracts/yr</div>
                </td>
                {[row.year1, row.year3, row.year5].map((pt, j) => (
                  <>
                    <td key={`t${j}`} className="py-3 px-2 text-center border-l border-gray-700/20">
                      <div className={`font-mono font-bold ${COLOR[i]}`}>
                        {fmtBytes(pt.total_tiered_mb)}
                      </div>
                      <div className="text-[10px] text-gray-600 mt-0.5">{pt.contracts_total.toLocaleString()} contracts</div>
                    </td>
                    <td key={`n${j}`} className="py-3 px-2 text-center">
                      <div className="font-mono text-gray-400">{fmtBytes(pt.naive_total_mb)}</div>
                      <div className="text-[10px] text-green-600 mt-0.5">save {pt.savings_pct}%</div>
                    </td>
                  </>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Breakdown for first scenario */}
      {rows[0] && (
        <div className="px-5 py-3 border-t border-gray-700/40 text-[11px] text-gray-500">
          <div className="font-medium text-gray-400 mb-1">Storage breakdown at Year 5 ({rows[0].scenario})</div>
          <div className="flex flex-wrap gap-4">
            {[
              { label: "MongoDB (Tier 1)",     mb: rows[0].year5.tier1_mongo_mb,   color: "text-orange-400" },
              { label: "Raw text (Tier 2)",    mb: rows[0].year5.tier2_raw_mb,     color: "text-yellow-400" },
              { label: "PDFs Class A",         mb: rows[0].year5.tier3_pdf_a_mb,   color: "text-green-400" },
              { label: "PDFs Class B (steady)", mb: rows[0].year5.tier3_pdf_b_mb,  color: "text-blue-400" },
            ].map(({ label, mb, color }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className={`font-mono ${color}`}>{fmtBytes(mb)}</span>
                <span>{label}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 text-gray-600">
            Assumes {rows[0].per_year.toLocaleString()} contracts/yr · PDF avg {58} KB · Raw text avg {13} KB
            · Class A {55}% / Class B {35}% / Class C {10}%
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Records table ─────────────────────────────────────────────────────────────
function RecordsTable({ records }: { records: ContractRecord[] }) {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Archive size={13} className="text-orange-400" />
          PDF Record Status ({records.length})
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-700 text-[10px] uppercase tracking-wide text-gray-400">
              <th className="text-left py-2.5 px-4">GEMC / Seller</th>
              <th className="text-left py-2.5 px-2 hidden md:table-cell">Product</th>
              <th className="text-right py-2.5 px-2">Value</th>
              <th className="text-center py-2.5 px-2">Class</th>
              <th className="text-center py-2.5 px-2">PDF</th>
              <th className="text-right py-2.5 px-2 hidden sm:table-cell">Size</th>
              <th className="text-right py-2.5 px-2 hidden md:table-cell">Confidence</th>
              <th className="text-left py-2.5 px-3 hidden lg:table-cell">Deleted</th>
            </tr>
          </thead>
          <tbody>
            {records.map(r => (
              <tr key={r.gemc_no} className="border-b border-gray-800/60">
                <td className="py-2.5 px-4">
                  <div className="text-gray-500 font-mono text-[10px]">{r.gemc_no}</div>
                  <div className="text-gray-300 text-xs mt-0.5">{truncate(r.seller_name_canonical, 30)}</div>
                </td>
                <td className="py-2.5 px-2 hidden md:table-cell text-gray-400">{truncate(r.product_name, 35)}</td>
                <td className="py-2.5 px-2 text-right font-mono text-orange-400 whitespace-nowrap">{fmtInr(r.contract_value_num)}</td>
                <td className="py-2.5 px-2 text-center"><ClassBadge cls={r.pdf_retention_class} /></td>
                <td className="py-2.5 px-2 text-center">
                  {r.pdf_deleted_at ? (
                    <span className="text-[10px] text-gray-500 flex items-center justify-center gap-0.5">
                      <Trash2 size={9} />deleted
                    </span>
                  ) : r.pdf_saved ? (
                    <span className="text-[10px] text-green-400 flex items-center justify-center gap-0.5">
                      <CheckCircle size={9} />saved
                    </span>
                  ) : (
                    <span className="text-[10px] text-gray-600">—</span>
                  )}
                </td>
                <td className="py-2.5 px-2 text-right hidden sm:table-cell text-gray-500">
                  {fmtKB(r.pdf_size)}
                </td>
                <td className="py-2.5 px-2 text-right hidden md:table-cell">
                  {r.extraction_confidence != null ? (
                    <span className={`text-[10px] ${r.extraction_confidence >= 80 ? "text-green-400" : r.extraction_confidence >= 60 ? "text-yellow-400" : "text-red-400"}`}>
                      {r.extraction_confidence}%
                    </span>
                  ) : "—"}
                </td>
                <td className="py-2.5 px-3 text-gray-500 text-[10px] hidden lg:table-cell">
                  {r.pdf_deleted_at ? fmtDate(r.pdf_deleted_at) : (r.raw_deleted_at ? `raw ${fmtDate(r.raw_deleted_at)}` : "—")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Main StorageTab ────────────────────────────────────────────────────────────
export function StorageTab() {
  const [overview, setOverview]   = useState<Overview | null>(null)
  const [forecast, setForecast]   = useState<{ rows: ForecastRow[] } | null>(null)
  const [records,  setRecords]    = useState<ContractRecord[]>([])
  const [loading,  setLoading]    = useState(true)
  const [filter,   setFilter]     = useState<"all" | "A" | "B" | "C">("all")

  const load = useCallback(async () => {
    setLoading(true)
    const [ov, fc, recs] = await Promise.all([
      fetch("/api/admin/procurement/storage?section=overview").then(r => r.json()),
      fetch("/api/admin/procurement/storage?section=forecast").then(r => r.json()),
      fetch("/api/admin/procurement/storage?section=records&limit=140").then(r => r.json()),
    ])
    setOverview(ov)
    setForecast(fc)
    setRecords(recs.rows || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filteredRecords = filter === "all"
    ? records
    : records.filter(r => r.pdf_retention_class === filter)

  if (loading) return <Spinner />
  if (!overview) return null

  const ov = overview
  const totalDiskKB = ov.tier1_mongo_kb + ov.tier2_raw_kb + ov.tier3_pdf_kb
  const unclassifiedWarning = ov.unclassified > 0

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-bold text-base">PDF & Storage Architecture</h2>
          <p className="text-gray-500 text-xs mt-0.5">
            {ov.total} contracts · {ov.enriched} enriched · {ov.classified} classified
          </p>
        </div>
        <button onClick={load}
          className="flex items-center gap-1.5 text-gray-400 hover:text-white text-xs border border-gray-700 rounded-lg px-3 py-1.5 hover:border-gray-500 transition-colors">
          <RefreshCw size={11} />Refresh
        </button>
      </div>

      {/* Warning: unclassified contracts */}
      {unclassifiedWarning && (
        <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-xl px-4 py-3 flex items-center gap-3">
          <AlertTriangle size={14} className="text-yellow-400 shrink-0" />
          <div className="text-xs text-yellow-200">
            <span className="font-semibold">{ov.unclassified} contracts not yet classified.</span>
            {" "}Run <code className="bg-gray-800 px-1.5 py-0.5 rounded font-mono text-yellow-300">node scripts/gem-classify-pdfs.js</code> to assign PDF retention classes.
          </div>
        </div>
      )}

      {/* Tier summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <TierCard
          tier="Tier 1 — Permanent"
          label="Intelligence DB"
          description="gem_contracts MongoDB — all extracted fields, GSTIN, phone, email, OEM, confidence scores. Never deleted."
          kb={ov.tier1_mongo_kb}
          count={ov.total}
          extra="Grows with every contract — this is the asset"
          color="text-orange-400"
          icon={Database}
        />
        <TierCard
          tier="Tier 2 — 90-Day TTL"
          label="Raw Text Archive"
          description="gem_contracts_raw — raw HTML and extracted text. Deleted after 90 days when confidence ≥ 60%."
          kb={ov.tier2_raw_kb}
          count={ov.raw_count}
          extra={ov.raw_count > 0 ? `~${Math.round(ov.tier2_raw_kb / ov.raw_count)} KB avg` : undefined}
          color="text-yellow-400"
          icon={FileText}
        />
        <TierCard
          tier="Tier 3 — Policy Driven"
          label="PDF Archive"
          description="Local PDFs classified A/B/C. Class C deleted after extraction. Class B after 6 months. Class A kept permanently."
          kb={ov.tier3_pdf_kb}
          count={ov.tier3_pdf_count}
          extra={ov.reclaimable_C_kb > 0 ? `${Math.round(ov.reclaimable_C_kb)} KB reclaimable (Class C)` : "No Class C PDFs pending deletion"}
          color="text-green-400"
          icon={Archive}
        />
      </div>

      {/* Class breakdown */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <HardDrive size={13} className="text-gray-400" />
          <span className="text-sm font-semibold text-white">PDF Retention Classes</span>
          {ov.duplicate_groups > 0 && (
            <span className="ml-auto flex items-center gap-1 text-[10px] bg-yellow-900/30 text-yellow-400 border border-yellow-700/40 px-2 py-0.5 rounded">
              <Copy size={9} />{ov.duplicate_groups} duplicate PDF hash groups
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <ClassCard
            cls="A"
            label="Strategic"
            policy="Value > ₹10L, or fogging / health / defense related, or manually bookmarked. Keep permanently."
            stats={ov.by_class.A}
          />
          <ClassCard
            cls="B"
            label="Useful"
            policy="Value ₹1L – ₹10L, general procurement. Keep 6 months then delete. Intelligence already extracted."
            stats={ov.by_class.B}
          />
          <ClassCard
            cls="C"
            label="Disposable"
            policy="Value < ₹1L, commodity purchases. Delete PDF after extraction. Metadata and parsed fields kept in Tier 1."
            stats={ov.by_class.C}
          />
        </div>
      </div>

      {/* Command reference */}
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
        <div className="text-xs font-semibold text-gray-300 mb-3 flex items-center gap-2">
          <BookmarkCheck size={12} className="text-orange-400" /> Maintenance Commands
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            {
              cmd: "node scripts/gem-classify-pdfs.js",
              desc: "Classify all contracts and update MongoDB (safe to re-run)",
              note: "Run after any bulk enrichment",
            },
            {
              cmd: "node scripts/gem-classify-pdfs.js --dry-run",
              desc: "Preview classifications without writing to MongoDB",
              note: "Safe — read only",
            },
            {
              cmd: "node scripts/gem-cleanup-pdfs.js",
              desc: "Delete Class C PDFs + Class B PDFs past retention + expired raw text",
              note: "Run monthly or after large collections",
            },
            {
              cmd: "node scripts/gem-cleanup-pdfs.js --dry-run",
              desc: "Preview what would be deleted",
              note: "Safe — read only",
            },
          ].map(({ cmd, desc, note }) => (
            <div key={cmd} className="bg-gray-800 rounded-lg p-3">
              <code className="text-[11px] text-orange-300 font-mono block mb-1">{cmd}</code>
              <div className="text-[11px] text-gray-400">{desc}</div>
              <div className="text-[10px] text-gray-600 mt-0.5">{note}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Forecast */}
      {forecast && <ForecastTable rows={forecast.rows} />}

      {/* Records filter + table */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-semibold text-white">All Contracts</span>
          <div className="ml-2 flex gap-1">
            {(["all", "A", "B", "C"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`text-[10px] px-2.5 py-1 rounded-lg border transition-colors ${
                  filter === f
                    ? "bg-orange-600 border-orange-500 text-white"
                    : "border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-200"
                }`}>
                {f === "all" ? "All" : `Class ${f}`}
              </button>
            ))}
          </div>
          <span className="text-xs text-gray-500 ml-1">{filteredRecords.length} records</span>
        </div>
        <RecordsTable records={filteredRecords} />
      </div>
    </div>
  )
}
