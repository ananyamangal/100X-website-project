"use client"
import { useEffect, useState, useCallback } from "react"
import {
  RefreshCw, Building2, ChevronRight, X, AlertTriangle,
  TrendingUp, Package, Archive, Users, Calendar, Repeat2,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface BuyerRow {
  buyer_slug:                  string
  buyer_name:                  string
  state:                       string | null
  ministry:                    string | null
  contract_count:              number
  total_spend:                 number
  last_contract_date:          string | null
  top_supplier:                string | null
  buyer_tier:                  "A" | "B" | "C" | "D"
  avg_days_between_purchases:  number | null
  archive_coverage_pct:        number
  buyer_identity_confidence:   "high" | "medium" | "low"
  needs_review:                boolean
}

interface BuyerDetail {
  profile: {
    buyer_slug:                  string
    buyer_name:                  string
    buyer_name_variants:         string[]
    state:                       string | null
    ministry:                    string | null
    org_type:                    string | null
    contract_count:              number
    total_spend:                 number
    avg_contract_value:          number | null
    max_contract_value:          number | null
    first_contract_date:         string | null
    last_contract_date:          string | null
    avg_days_between_purchases:  number | null
    purchase_frequency_per_year: number | null
    supplier_count:              number
    top_supplier:                string | null
    top_supplier_share_pct:      number | null
    supplier_switch_count:       number
    supplier_switch_rate:        number | null
    archive_contract_count:      number
    archive_coverage_pct:        number
    buyer_identity_confidence:   "high" | "medium" | "low"
    buyer_identity_method:       string
    needs_review:                boolean
    buyer_tier:                  "A" | "B" | "C" | "D"
    source_contract_count:       number
  }
  top_products: { product_name: string; total_spend: number; contract_count: number }[]
  suppliers:    { seller_name: string; seller_gstin: string | null; total_spend: number; contract_count: number }[]
  contracts:    {
    gemc_no: string; product_name: string | null; contract_value_num: number | null
    seller_name_canonical: string | null; contract_date_dt: string | null; first_seen: string | null
    contract_status: string | null; quantity: number | null; detail_scraped: boolean
  }[]
  archive_records: {
    gemc_number: string; product_name_raw: string | null; contract_value_inr: number | null
    seller_name: string | null; award_date: string | null; status: string; integrity_verified: boolean
    pdf_class: string
  }[]
}

interface Stats {
  total_buyers:            number
  repeat_buyers:           number
  buyers_with_archive:     number
  total_indexed_spend:     number
  avg_contracts_per_buyer: number
  tier_distribution:       { tier: string; count: number; total_spend: number }[]
  meta: {
    last_build_at:        string | null
    is_stale:             boolean
    stale_contract_count: number
    build_duration_ms:    number | null
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtSpend(n: number | null): string {
  if (n === null || n === 0) return "—"
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(1)} Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`
  return `₹${n.toLocaleString("en-IN")}`
}

function fmtDate(d: string | null): string {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })
}

function TierBadge({ tier }: { tier: string }) {
  const cls =
    tier === "A" ? "bg-purple-100 text-purple-700 border-purple-200" :
    tier === "B" ? "bg-blue-100 text-blue-700 border-blue-200" :
    tier === "C" ? "bg-green-100 text-green-700 border-green-200" :
                   "bg-gray-100 text-gray-500 border-gray-200"
  const label =
    tier === "A" ? "Tier A · Strategic" :
    tier === "B" ? "Tier B · Active" :
    tier === "C" ? "Tier C · Occasional" :
                   "Tier D · Single"
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cls}`}>
      {label}
    </span>
  )
}

function ConfBadge({ conf }: { conf: "high" | "medium" | "low" }) {
  const cls =
    conf === "high"   ? "text-green-600" :
    conf === "medium" ? "text-amber-500" : "text-red-500"
  return <span className={`text-[10px] font-medium ${cls}`}>{conf}</span>
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function BuyerDetailPanel({ slug, onClose }: { slug: string; onClose: () => void }) {
  const [data, setData]       = useState<BuyerDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [section, setSection] = useState<"overview" | "suppliers" | "products" | "contracts" | "archive">("overview")

  useEffect(() => {
    setLoading(true)
    fetch(`/api/admin/procurement/buyer-profiles/${slug}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [slug])

  const p = data?.profile

  return (
    <div className="fixed inset-0 z-40 flex justify-end" onClick={onClose}>
      <div
        className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100 bg-gray-50">
          <div className="min-w-0">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Buyer Profile</p>
            {p ? (
              <>
                <h2 className="text-sm font-bold text-gray-900 truncate max-w-xs">{p.buyer_name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  {p.state    && <span className="text-[10px] text-gray-500">{p.state}</span>}
                  {p.ministry && <span className="text-[10px] text-gray-400 truncate max-w-[180px]">{p.ministry}</span>}
                  <TierBadge tier={p.buyer_tier} />
                </div>
              </>
            ) : (
              <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 flex-shrink-0 ml-3">
            <X size={16} />
          </button>
        </div>

        {/* Sub-nav */}
        <div className="flex gap-1 px-3 pt-2 pb-0 border-b border-gray-100">
          {(["overview", "suppliers", "products", "contracts", "archive"] as const).map(s => (
            <button
              key={s}
              onClick={() => setSection(s)}
              className={`text-[11px] px-2.5 py-1.5 rounded-t font-medium capitalize transition-colors ${
                section === s
                  ? "bg-brand-600 text-white"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading && (
            <div className="flex justify-center py-12">
              <div className="w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loading && !data && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs text-red-700">
              Failed to load buyer profile.
            </div>
          )}

          {!loading && p && section === "overview" && (
            <>
              {/* Spend summary */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Total Spend",      value: fmtSpend(p.total_spend),         icon: TrendingUp },
                  { label: "Contracts",         value: p.contract_count,               icon: Building2  },
                  { label: "Avg Order Value",   value: fmtSpend(p.avg_contract_value), icon: Package    },
                  { label: "Largest Order",     value: fmtSpend(p.max_contract_value), icon: TrendingUp },
                  { label: "First Purchase",    value: fmtDate(p.first_contract_date), icon: Calendar   },
                  { label: "Last Purchase",     value: fmtDate(p.last_contract_date),  icon: Calendar   },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="bg-gray-50 rounded-xl border border-gray-200 p-3">
                    <div className="flex items-center gap-1 mb-1">
                      <Icon size={10} className="text-gray-400" />
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</p>
                    </div>
                    <p className="text-sm font-bold text-gray-900">{String(value)}</p>
                  </div>
                ))}
              </div>

              {/* Repeat buying */}
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-1.5 mb-3">
                  <Repeat2 size={12} className="text-brand-500" />
                  <h3 className="text-xs font-semibold text-gray-700">Purchase Cadence</h3>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-[10px] text-gray-400 mb-0.5">Avg days between orders</p>
                    <p className="font-semibold text-gray-800">
                      {p.avg_days_between_purchases ? `${p.avg_days_between_purchases} days` : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 mb-0.5">Frequency per year</p>
                    <p className="font-semibold text-gray-800">
                      {p.purchase_frequency_per_year ? `${p.purchase_frequency_per_year}×` : "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Supplier concentration */}
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-1.5 mb-3">
                  <Users size={12} className="text-brand-500" />
                  <h3 className="text-xs font-semibold text-gray-700">Supplier Relationship</h3>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-[10px] text-gray-400 mb-0.5">Distinct suppliers</p>
                    <p className="font-semibold text-gray-800">{p.supplier_count}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 mb-0.5">Top supplier share</p>
                    <p className="font-semibold text-gray-800">
                      {p.top_supplier_share_pct ? `${p.top_supplier_share_pct}%` : "—"}
                    </p>
                  </div>
                  {p.top_supplier && (
                    <div className="col-span-2">
                      <p className="text-[10px] text-gray-400 mb-0.5">Top supplier</p>
                      <p className="font-semibold text-gray-800 truncate">{p.top_supplier}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[10px] text-gray-400 mb-0.5">Supplier switches</p>
                    <p className="font-semibold text-gray-800">
                      {p.supplier_switch_count}
                      {p.supplier_switch_rate !== null && (
                        <span className="text-gray-400 font-normal ml-1">({p.supplier_switch_rate} rate)</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Archive coverage */}
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-1.5 mb-3">
                  <Archive size={12} className="text-brand-500" />
                  <h3 className="text-xs font-semibold text-gray-700">Archive Coverage</h3>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gray-100 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-teal-500"
                      style={{ width: `${Math.min(p.archive_coverage_pct, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-gray-700 shrink-0">
                    {p.archive_contract_count} / {p.contract_count}
                    <span className="text-gray-400 font-normal ml-1">({p.archive_coverage_pct}%)</span>
                  </span>
                </div>
              </div>

              {/* Identity */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Identity method</span>
                  <span className="text-gray-700 font-medium">{p.buyer_identity_method.replace(/_/g, " ")}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Identity confidence</span>
                  <ConfBadge conf={p.buyer_identity_confidence} />
                </div>
                {p.buyer_name_variants.length > 1 && (
                  <div>
                    <p className="text-gray-500 mb-1">Name variants ({p.buyer_name_variants.length})</p>
                    <div className="space-y-0.5 max-h-24 overflow-y-auto">
                      {p.buyer_name_variants.map(v => (
                        <p key={v} className="text-[10px] text-gray-600 bg-white border border-gray-100 rounded px-2 py-1">{v}</p>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Contracts indexed</span>
                  <span className="text-gray-700 font-medium">{p.source_contract_count} enriched</span>
                </div>
              </div>
            </>
          )}

          {!loading && data && section === "suppliers" && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="text-xs font-semibold text-gray-700">Suppliers ({data.suppliers.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      {["Supplier", "Spend", "Orders"].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 text-gray-400 font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.suppliers.map(s => (
                      <tr key={s.seller_name} className="hover:bg-gray-50/50">
                        <td className="px-4 py-2.5">
                          <p className="font-medium text-gray-800 truncate max-w-[200px]">{s.seller_name}</p>
                          {s.seller_gstin && <p className="text-[10px] text-gray-400">{s.seller_gstin}</p>}
                        </td>
                        <td className="px-4 py-2.5 font-semibold text-gray-800 whitespace-nowrap">{fmtSpend(s.total_spend)}</td>
                        <td className="px-4 py-2.5 text-gray-600">{s.contract_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!loading && data && section === "products" && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="text-xs font-semibold text-gray-700">Top Products</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {data.top_products.map(p => (
                  <div key={p.product_name} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50/50">
                    <p className="text-xs text-gray-800 truncate max-w-xs">{p.product_name}</p>
                    <div className="text-right shrink-0 ml-4">
                      <p className="text-xs font-semibold text-gray-800">{fmtSpend(p.total_spend)}</p>
                      <p className="text-[10px] text-gray-400">{p.contract_count} orders</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && data && section === "contracts" && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="text-xs font-semibold text-gray-700">Contracts ({data.contracts.length} shown)</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      {["GEMC No.", "Product", "Supplier", "Value", "Date"].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 text-gray-400 font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.contracts.map(c => (
                      <tr key={c.gemc_no} className="hover:bg-gray-50/50">
                        <td className="px-4 py-2.5 font-mono text-[10px] text-gray-500 whitespace-nowrap">{c.gemc_no}</td>
                        <td className="px-4 py-2.5">
                          <p className="text-gray-800 truncate max-w-[160px]">{c.product_name ?? "—"}</p>
                        </td>
                        <td className="px-4 py-2.5 text-gray-600 truncate max-w-[140px]">{c.seller_name_canonical ?? "—"}</td>
                        <td className="px-4 py-2.5 font-semibold text-gray-800 whitespace-nowrap">{fmtSpend(c.contract_value_num)}</td>
                        <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{fmtDate(c.contract_date_dt ?? c.first_seen)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!loading && data && section === "archive" && (
            <>
              {data.archive_records.length === 0 ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-700">
                  No archived contracts for this buyer yet.
                  Archive coverage: {p?.archive_coverage_pct ?? 0}%.
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <h3 className="text-xs font-semibold text-gray-700">Archived Contracts ({data.archive_records.length})</h3>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {data.archive_records.map(a => (
                      <div key={a.gemc_number} className="px-4 py-3 hover:bg-gray-50/50">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-[10px] font-mono text-gray-400">{a.gemc_number}</p>
                            <p className="text-xs text-gray-800 truncate">{a.product_name_raw ?? "—"}</p>
                            <p className="text-[10px] text-gray-500">{a.seller_name ?? "—"}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs font-semibold text-gray-800">{fmtSpend(a.contract_value_inr)}</p>
                            <p className="text-[10px] text-gray-400">{fmtDate(a.award_date)}</p>
                            <div className="flex items-center justify-end gap-1 mt-0.5">
                              <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                                a.integrity_verified ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                              }`}>
                                {a.integrity_verified ? "✓ Verified" : "⚠ Unverified"}
                              </span>
                              <span className="text-[9px] text-gray-400">PDF-{a.pdf_class}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Tab ─────────────────────────────────────────────────────────────────

export function BuyerProfilesTab() {
  const [profiles, setProfiles]       = useState<BuyerRow[]>([])
  const [stats, setStats]             = useState<Stats | null>(null)
  const [loading, setLoading]         = useState(true)
  const [building, setBuilding]       = useState(false)
  const [buildMsg, setBuildMsg]       = useState("")
  const [total, setTotal]             = useState(0)
  const [page, setPage]               = useState(1)
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)

  // Filters
  const [filterState,    setFilterState]    = useState("")
  const [filterMinistry, setFilterMinistry] = useState("")
  const [filterTier,     setFilterTier]     = useState("")
  const [sortBy,         setSortBy]         = useState("total_spend")

  const LIMIT = 50

  const loadProfiles = useCallback((p = 1) => {
    setLoading(true)
    const sp = new URLSearchParams({
      page:  String(p),
      limit: String(LIMIT),
      sortBy,
    })
    if (filterState)    sp.set("state",    filterState)
    if (filterMinistry) sp.set("ministry", filterMinistry)
    if (filterTier)     sp.set("tier",     filterTier)

    fetch(`/api/admin/procurement/buyer-profiles?${sp}`)
      .then(r => r.json())
      .then(d => {
        setProfiles(d.profiles ?? [])
        setTotal(d.total ?? 0)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [filterState, filterMinistry, filterTier, sortBy])

  const loadStats = useCallback(() => {
    fetch("/api/admin/procurement/buyer-profiles/stats")
      .then(r => r.json())
      .then(setStats)
      .catch(() => {})
  }, [])

  useEffect(() => { setPage(1); loadProfiles(1) }, [loadProfiles])
  useEffect(() => { loadStats() }, [loadStats])

  const handleBuild = async (action: "rebuild" | "refresh") => {
    setBuilding(true)
    setBuildMsg(`Running ${action}…`)
    try {
      const res = await fetch("/api/admin/procurement/buyer-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      const d = await res.json()
      if (d.error) {
        setBuildMsg(`Error: ${d.error}`)
      } else {
        setBuildMsg(
          `${action === "rebuild" ? "Full rebuild" : "Incremental refresh"} complete — ` +
          `${d.profiles_built} profiles in ${d.duration_ms}ms`
        )
        loadProfiles(1)
        loadStats()
      }
    } catch (e) {
      setBuildMsg(`Error: ${String(e)}`)
    } finally {
      setBuilding(false)
    }
  }

  const noBuild = stats?.meta.last_build_at === null && !loading && profiles.length === 0
  const isStale = stats?.meta.is_stale && !noBuild

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Buyers",       value: stats.total_buyers.toLocaleString("en-IN") },
            { label: "Repeat Buyers",      value: stats.repeat_buyers.toLocaleString("en-IN") },
            { label: "Total Indexed Spend",value: fmtSpend(stats.total_indexed_spend) },
            { label: "Avg Orders / Buyer", value: String(stats.avg_contracts_per_buyer) },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">{s.label}</p>
              <p className="text-xl font-bold text-gray-900">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tier distribution */}
      {stats && stats.tier_distribution.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-3">Tier Distribution</p>
          <div className="flex gap-3 flex-wrap">
            {stats.tier_distribution.map(t => (
              <button
                key={t.tier}
                onClick={() => setFilterTier(filterTier === t.tier ? "" : t.tier)}
                className={`flex flex-col items-start px-3 py-2 rounded-lg border transition-colors cursor-pointer ${
                  filterTier === t.tier
                    ? "border-brand-400 bg-brand-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <TierBadge tier={t.tier} />
                <p className="text-sm font-bold text-gray-900 mt-1">{t.count.toLocaleString("en-IN")}</p>
                <p className="text-[10px] text-gray-400">{fmtSpend(t.total_spend)}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-3">
        {/* Stale warning */}
        {isStale && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
            <AlertTriangle size={12} />
            <span>
              {stats!.meta.stale_contract_count} new contracts since last build.
              Run Incremental Refresh to update.
            </span>
          </div>
        )}

        {/* Build message */}
        {buildMsg && (
          <div className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">{buildMsg}</div>
        )}

        {/* Filters + build buttons */}
        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-gray-400 uppercase tracking-wide">State</label>
            <input
              value={filterState}
              onChange={e => setFilterState(e.target.value)}
              placeholder="e.g. Maharashtra"
              className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 w-36 focus:outline-none focus:ring-1 focus:ring-brand-400"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-gray-400 uppercase tracking-wide">Ministry</label>
            <input
              value={filterMinistry}
              onChange={e => setFilterMinistry(e.target.value)}
              placeholder="e.g. Health"
              className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 w-36 focus:outline-none focus:ring-1 focus:ring-brand-400"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-gray-400 uppercase tracking-wide">Sort by</label>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-400"
            >
              <option value="total_spend">Total Spend</option>
              <option value="contract_count">Contract Count</option>
              <option value="last_contract_date">Last Purchase</option>
              <option value="archive_coverage_pct">Archive Coverage</option>
            </select>
          </div>
          {(filterState || filterMinistry || filterTier) && (
            <button
              onClick={() => { setFilterState(""); setFilterMinistry(""); setFilterTier("") }}
              className="text-xs text-gray-400 hover:text-gray-700 underline self-end pb-1.5"
            >
              Clear filters
            </button>
          )}

          <div className="ml-auto flex gap-2 self-end">
            <button
              onClick={() => handleBuild("refresh")}
              disabled={building || noBuild}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-gray-300 disabled:opacity-40"
            >
              <RefreshCw size={11} className={building ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              onClick={() => handleBuild("rebuild")}
              disabled={building}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-40"
            >
              <RefreshCw size={11} className={building ? "animate-spin" : ""} />
              Full Rebuild
            </button>
          </div>
        </div>
      </div>

      {/* Empty — no build yet */}
      {noBuild && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
          <Building2 size={32} className="text-gray-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-gray-700 mb-1">No buyer profiles built yet</h3>
          <p className="text-xs text-gray-400 mb-4">
            Run a full rebuild to generate buyer profiles from {" "}
            <span className="font-medium">gem_contracts</span>.
          </p>
          <button
            onClick={() => handleBuild("rebuild")}
            disabled={building}
            className="text-xs px-4 py-2 rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-40"
          >
            {building ? "Building…" : "Build Now"}
          </button>
        </div>
      )}

      {/* Table */}
      {!noBuild && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-gray-700">
              Buyer Profiles
              {total > 0 && <span className="text-gray-400 font-normal ml-1">({total.toLocaleString("en-IN")} total)</span>}
            </h3>
            {stats?.meta.last_build_at && (
              <p className="text-[10px] text-gray-400">
                Last built {new Date(stats.meta.last_build_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
              </p>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : profiles.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-400">No profiles match current filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {["Buyer", "State", "Ministry", "Contracts", "Total Spend", "Last Purchase", "Top Supplier", "Tier"].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 text-gray-400 font-medium whitespace-nowrap">{h}</th>
                    ))}
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {profiles.map(bp => (
                    <tr
                      key={bp.buyer_slug}
                      onClick={() => setSelectedSlug(bp.buyer_slug)}
                      className="hover:bg-gray-50/70 cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-1.5">
                          {bp.needs_review && (
                            <AlertTriangle size={10} className="text-amber-500 mt-0.5 shrink-0" />
                          )}
                          <div>
                            <p className="font-semibold text-gray-800 truncate max-w-[200px]">{bp.buyer_name}</p>
                            {bp.archive_coverage_pct > 0 && (
                              <p className="text-[10px] text-teal-600">▪ {bp.archive_coverage_pct}% archived</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{bp.state ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-500 max-w-[140px]">
                        <p className="truncate">{bp.ministry ?? "—"}</p>
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-800">{bp.contract_count}</td>
                      <td className="px-4 py-3 font-semibold text-gray-800 whitespace-nowrap">{fmtSpend(bp.total_spend)}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(bp.last_contract_date)}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-[140px]">
                        <p className="truncate">{bp.top_supplier ?? "—"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <TierBadge tier={bp.buyer_tier} />
                      </td>
                      <td className="px-4 py-3">
                        <ChevronRight size={12} className="text-gray-300" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {total > LIMIT && (
            <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
              <p className="text-[10px] text-gray-400">
                Showing {((page - 1) * LIMIT) + 1}–{Math.min(page * LIMIT, total)} of {total.toLocaleString("en-IN")}
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => { setPage(p => p - 1); loadProfiles(page - 1) }}
                  disabled={page === 1}
                  className="text-xs px-2.5 py-1 rounded border border-gray-200 text-gray-600 disabled:opacity-40"
                >
                  ←
                </button>
                <button
                  onClick={() => { setPage(p => p + 1); loadProfiles(page + 1) }}
                  disabled={page * LIMIT >= total}
                  className="text-xs px-2.5 py-1 rounded border border-gray-200 text-gray-600 disabled:opacity-40"
                >
                  →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Detail panel */}
      {selectedSlug && (
        <BuyerDetailPanel slug={selectedSlug} onClose={() => setSelectedSlug(null)} />
      )}
    </div>
  )
}
