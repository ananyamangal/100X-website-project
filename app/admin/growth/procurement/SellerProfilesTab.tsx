"use client"

import { useState, useEffect, useCallback } from "react"
import {
  RefreshCw, AlertTriangle, ChevronRight, X,
  Building2, Shield, Flame, Users, Package,
  TrendingUp, BadgeCheck, AlertCircle, Merge,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface SellerRow {
  seller_slug:              string
  seller_name:              string
  seller_pan:               string | null
  seller_gstin:             string | null
  seller_gem_id:            string | null
  seller_state:             string | null
  seller_tier:              "A" | "B" | "C" | "D"
  seller_identity_confidence: "high" | "medium" | "low"
  seller_identity_method:   string
  contract_count:           number
  total_gmv:                number
  buyer_count:              number
  state_count:              number
  last_contract_date:       string | null
  top_buyer:                string | null
  top_buyer_share_pct:      number | null
  needs_review:             boolean
  merge_candidates:         string[]
  identity_conflicts:       string[]
  supplies_fogging_products: boolean
  is_100x_supplier:         boolean
  competes_with_100x:       boolean
  seller_msme:              boolean | null
  seller_msme_category:     "micro" | "small" | "medium" | null
  gstin_count:              number
  repeat_buyer_pct:         number | null
  updated_at:               string
}

interface SellerDetail extends SellerRow {
  seller_name_variants:  string[]
  seller_gstin_set:      string[]
  seller_gstin_invalid:  string[]
  seller_gstin_states:   string[]
  seller_address:        string | null
  seller_msme_number:    string | null
  oem_brands:            string[]
  oem_names:             string[]
  avg_contract_value:    number | null
  max_contract_value:    number | null
  first_contract_date:   string | null
  department_count:      number
  archive_contract_count: number
  archive_coverage_pct:  number
  revenue_per_year:      number | null
  seller_states:         string[]
}

interface BuyerRow      { dept_name: string; state: string | null; total_spend: number; contract_count: number }
interface ProductRow    { product_name: string; total_spend: number; contract_count: number }
interface ContractRow   { gemc_no: string; product_name: string; contract_value_num: number; dept_name: string; state: string; contract_date_dt: string; oem_brand: string | null }
interface ArchiveRow    { gemc_number: string; product_name_raw: string; contract_value_inr: number; buyer_name: string; award_date: string }

interface Stats {
  total_sellers:        number
  repeat_sellers:       number
  sellers_with_archive: number
  needs_review_count:   number
  fogging_suppliers:    number
  total_gmv:            number
  total_contracts:      number
  avg_contracts_per_seller: number
  tier_distribution:    { tier: string; count: number; total_gmv: number }[]
  validation: {
    gstin_seen:               number
    gstin_validation_failures: number
    multi_gstin_sellers:      number
    merge_candidates_count:   number
    identity_conflicts_total: number
    confidence_distribution:  { high: number; medium: number; low: number }
  }
  meta: {
    last_build_at:       string | null
    last_full_build_at:  string | null
    last_incremental_at: string | null
    build_duration_ms:   number | null
    is_stale:            boolean
    stale_contract_count: number
  }
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtGMV(n: number | null | undefined): string {
  if (!n) return "—"
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)} Cr`
  if (n >= 1_00_000)    return `₹${(n / 1_00_000).toFixed(1)} L`
  return `₹${n.toLocaleString("en-IN")}`
}

function fmtDate(s: string | null | undefined): string {
  if (!s) return "—"
  return new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

function tierColor(t: string) {
  return t === "A" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
       : t === "B" ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
       : t === "C" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
       :             "bg-zinc-700/60 text-zinc-400 border border-zinc-600/30"
}

function confidencePill(c: string) {
  return c === "high"   ? "bg-emerald-500/20 text-emerald-300"
       : c === "medium" ? "bg-amber-500/20 text-amber-300"
       :                  "bg-rose-500/20 text-rose-300"
}

// ─── Detail panel ─────────────────────────────────────────────────────────────

type DetailTab = "overview" | "buyers" | "products" | "contracts" | "archive"

function SellerDetailPanel({
  sellerSlug, onClose,
}: { sellerSlug: string; onClose: () => void }) {
  const [detail, setDetail]     = useState<SellerDetail | null>(null)
  const [buyers, setBuyers]     = useState<BuyerRow[]>([])
  const [products, setProducts] = useState<ProductRow[]>([])
  const [contracts, setContracts] = useState<ContractRow[]>([])
  const [archive, setArchive]   = useState<ArchiveRow[]>([])
  const [tab, setTab]           = useState<DetailTab>("overview")
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState("")

  useEffect(() => {
    setLoading(true); setError("")
    fetch(`/api/admin/procurement/seller-profiles/${sellerSlug}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return }
        setDetail(data.profile as SellerDetail)
        setBuyers(data.buyers ?? [])
        setProducts(data.products ?? [])
        setContracts(data.contracts ?? [])
        setArchive(data.archive_records ?? [])
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [sellerSlug])

  const TABS: { id: DetailTab; label: string }[] = [
    { id: "overview",   label: "Overview"   },
    { id: "buyers",     label: `Buyers (${buyers.length})`   },
    { id: "products",   label: `Products (${products.length})` },
    { id: "contracts",  label: `Contracts (${contracts.length})` },
    { id: "archive",    label: `Archive (${archive.length})` },
  ]

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="h-full w-full max-w-2xl bg-zinc-900 border-l border-zinc-700 overflow-y-auto flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10">
          <div className="flex-1 min-w-0">
            {detail ? (
              <>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${tierColor(detail.seller_tier)}`}>
                    Tier {detail.seller_tier}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded ${confidencePill(detail.seller_identity_confidence)}`}>
                    {detail.seller_identity_confidence} confidence
                  </span>
                  {detail.needs_review && (
                    <span className="text-xs px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> review
                    </span>
                  )}
                  {detail.supplies_fogging_products && (
                    <span className="text-xs px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 flex items-center gap-1">
                      <Flame className="w-3 h-3" /> fogging
                    </span>
                  )}
                  {detail.is_100x_supplier && (
                    <span className="text-xs px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 flex items-center gap-1">
                      <BadgeCheck className="w-3 h-3" /> 100X
                    </span>
                  )}
                </div>
                <h2 className="mt-2 text-lg font-semibold text-white truncate">{detail.seller_name}</h2>
                <p className="text-xs text-zinc-400 mt-0.5 truncate">
                  {detail.seller_pan ?? detail.seller_gstin ?? detail.seller_gem_id ?? detail.seller_slug}
                </p>
              </>
            ) : loading ? (
              <div className="h-16 flex items-center text-zinc-500">Loading…</div>
            ) : (
              <p className="text-rose-400 text-sm">{error}</p>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors mt-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {detail && (
          <>
            {/* Sub-tabs */}
            <div className="flex border-b border-zinc-800 overflow-x-auto sticky top-[89px] bg-zinc-900 z-10">
              {TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                    tab === t.id
                      ? "border-violet-500 text-violet-400"
                      : "border-transparent text-zinc-400 hover:text-white"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="p-5 flex-1">
              {/* Overview */}
              {tab === "overview" && (
                <div className="space-y-5">
                  {/* Key metrics */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Total GMV",     value: fmtGMV(detail.total_gmv)   },
                      { label: "Contracts",     value: detail.contract_count.toLocaleString() },
                      { label: "Unique Buyers", value: detail.buyer_count.toLocaleString()    },
                      { label: "States Sold In",value: detail.state_count.toLocaleString()    },
                      { label: "Repeat Buyer %",value: detail.repeat_buyer_pct != null ? `${detail.repeat_buyer_pct}%` : "—" },
                      { label: "Avg Contract",  value: fmtGMV(detail.avg_contract_value)     },
                      { label: "First Contract",value: fmtDate(detail.first_contract_date)   },
                      { label: "Last Contract", value: fmtDate(detail.last_contract_date)    },
                      { label: "Archive Coverage", value: detail.archive_coverage_pct > 0 ? `${detail.archive_coverage_pct}%` : "—" },
                      { label: "Revenue/Year",  value: detail.revenue_per_year != null ? detail.revenue_per_year.toFixed(1) + "×" : "—" },
                    ].map(m => (
                      <div key={m.label} className="bg-zinc-800/50 rounded-lg p-3">
                        <p className="text-[11px] text-zinc-400">{m.label}</p>
                        <p className="text-sm font-semibold text-white mt-0.5">{m.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Identity */}
                  <div className="bg-zinc-800/50 rounded-lg p-4 space-y-2.5">
                    <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Identity</h3>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                      <p className="text-zinc-400">PAN</p>
                      <p className="text-white font-mono text-xs">{detail.seller_pan ?? "—"}</p>
                      <p className="text-zinc-400">Primary GSTIN</p>
                      <p className="text-white font-mono text-xs truncate">{detail.seller_gstin ?? "—"}</p>
                      <p className="text-zinc-400">GSTIN count</p>
                      <p className="text-white">{detail.gstin_count || "—"}</p>
                      <p className="text-zinc-400">GeM ID</p>
                      <p className="text-white font-mono text-xs">{detail.seller_gem_id ?? "—"}</p>
                      <p className="text-zinc-400">Method</p>
                      <p className="text-white text-xs">{detail.seller_identity_method}</p>
                      <p className="text-zinc-400">MSME</p>
                      <p className="text-white capitalize">{detail.seller_msme_category ?? (detail.seller_msme ? "yes" : "—")}</p>
                      <p className="text-zinc-400">State</p>
                      <p className="text-white">{detail.seller_state ?? "—"}</p>
                    </div>
                    {detail.seller_name_variants.length > 1 && (
                      <div className="mt-2">
                        <p className="text-xs text-zinc-400 mb-1">Name variants ({detail.seller_name_variants.length})</p>
                        <div className="flex flex-wrap gap-1">
                          {detail.seller_name_variants.slice(0, 8).map((v, i) => (
                            <span key={i} className="text-xs bg-zinc-700/60 text-zinc-300 px-2 py-0.5 rounded">{v}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {detail.seller_gstin_set.length > 1 && (
                      <div className="mt-2">
                        <p className="text-xs text-zinc-400 mb-1">All GSTINs</p>
                        <div className="flex flex-col gap-0.5">
                          {detail.seller_gstin_set.map(g => (
                            <span key={g} className="text-xs font-mono text-zinc-300">{g}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {detail.identity_conflicts.length > 0 && (
                      <div className="mt-2 p-2 bg-rose-950/40 border border-rose-800/30 rounded">
                        <p className="text-xs text-rose-300 font-medium mb-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Identity conflicts
                        </p>
                        {detail.identity_conflicts.map((c, i) => (
                          <p key={i} className="text-xs text-rose-400 font-mono">{c}</p>
                        ))}
                      </div>
                    )}
                    {detail.merge_candidates.length > 0 && (
                      <div className="mt-2 p-2 bg-amber-950/40 border border-amber-800/30 rounded">
                        <p className="text-xs text-amber-300 font-medium mb-1 flex items-center gap-1">
                          <Merge className="w-3 h-3" /> Alias candidates
                        </p>
                        {detail.merge_candidates.map((c, i) => (
                          <p key={i} className="text-xs text-amber-400 font-mono">{c}</p>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* OEM / Product flags */}
                  {(detail.oem_brands.length > 0 || detail.oem_names.length > 0) && (
                    <div className="bg-zinc-800/50 rounded-lg p-4 space-y-2">
                      <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">OEM Intelligence</h3>
                      {detail.oem_brands.length > 0 && (
                        <>
                          <p className="text-xs text-zinc-400">Brands</p>
                          <div className="flex flex-wrap gap-1">
                            {detail.oem_brands.map((b, i) => (
                              <span key={i} className="text-xs bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded">{b}</span>
                            ))}
                          </div>
                        </>
                      )}
                      {detail.oem_names.length > 0 && (
                        <>
                          <p className="text-xs text-zinc-400 mt-1">OEM Names</p>
                          <div className="flex flex-wrap gap-1">
                            {detail.oem_names.slice(0, 6).map((n, i) => (
                              <span key={i} className="text-xs bg-zinc-700/60 text-zinc-300 px-2 py-0.5 rounded">{n}</span>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Top buyer */}
                  {detail.top_buyer && (
                    <div className="bg-zinc-800/50 rounded-lg p-4">
                      <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">Top Buyer</h3>
                      <p className="text-sm text-white">{detail.top_buyer}</p>
                      <p className="text-xs text-zinc-400 mt-1">{detail.top_buyer_share_pct}% of GMV from this buyer</p>
                    </div>
                  )}
                </div>
              )}

              {/* Buyers */}
              {tab === "buyers" && (
                <div className="space-y-1">
                  {buyers.map((b, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 py-2.5 border-b border-zinc-800/60">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{b.dept_name}</p>
                        <p className="text-xs text-zinc-500">{b.state ?? "—"} · {b.contract_count} orders</p>
                      </div>
                      <p className="text-sm font-medium text-zinc-200 shrink-0">{fmtGMV(b.total_spend)}</p>
                    </div>
                  ))}
                  {!buyers.length && <p className="text-zinc-500 text-sm">No buyer data available.</p>}
                </div>
              )}

              {/* Products */}
              {tab === "products" && (
                <div className="space-y-1">
                  {products.map((p, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 py-2.5 border-b border-zinc-800/60">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">{p.product_name}</p>
                        <p className="text-xs text-zinc-500">{p.contract_count} contracts</p>
                      </div>
                      <p className="text-sm font-medium text-zinc-200 shrink-0">{fmtGMV(p.total_spend)}</p>
                    </div>
                  ))}
                  {!products.length && <p className="text-zinc-500 text-sm">No product data available.</p>}
                </div>
              )}

              {/* Contracts */}
              {tab === "contracts" && (
                <div className="space-y-1">
                  {contracts.map((c, i) => (
                    <div key={i} className="py-2.5 border-b border-zinc-800/60">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-mono text-zinc-400">{c.gemc_no}</p>
                        <p className="text-sm font-medium text-zinc-200">{fmtGMV(c.contract_value_num)}</p>
                      </div>
                      <p className="text-sm text-white truncate mt-0.5">{c.product_name}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{c.dept_name} · {fmtDate(c.contract_date_dt)}</p>
                      {c.oem_brand && <p className="text-xs text-violet-400 mt-0.5">OEM: {c.oem_brand}</p>}
                    </div>
                  ))}
                  {!contracts.length && <p className="text-zinc-500 text-sm">No contracts found.</p>}
                </div>
              )}

              {/* Archive */}
              {tab === "archive" && (
                <div className="space-y-1">
                  {archive.map((a, i) => (
                    <div key={i} className="py-2.5 border-b border-zinc-800/60">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-mono text-zinc-400">{a.gemc_number}</p>
                        <p className="text-sm font-medium text-zinc-200">{fmtGMV(a.contract_value_inr)}</p>
                      </div>
                      <p className="text-sm text-white truncate mt-0.5">{a.product_name_raw}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{a.buyer_name} · {fmtDate(a.award_date)}</p>
                    </div>
                  ))}
                  {!archive.length && <p className="text-zinc-500 text-sm">No archive records.</p>}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Main tab ─────────────────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { value: "total_gmv",        label: "Total GMV"       },
  { value: "contract_count",   label: "Contracts"       },
  { value: "buyer_count",      label: "Buyers"          },
  { value: "last_contract_date", label: "Last Contract" },
  { value: "repeat_buyer_pct", label: "Repeat Buyer %"  },
]

export function SellerProfilesTab() {
  const [stats, setStats]           = useState<Stats | null>(null)
  const [sellers, setSellers]       = useState<SellerRow[]>([])
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 50, total_pages: 1 })
  const [loading, setLoading]       = useState(true)
  const [rebuilding, setRebuilding] = useState(false)
  const [error, setError]           = useState("")
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)

  // Filters
  const [tierFilter,    setTierFilter]    = useState("")
  const [stateFilter,   setStateFilter]   = useState("")
  const [foggingOnly,   setFoggingOnly]   = useState(false)
  const [needsReview,   setNeedsReview]   = useState(false)
  const [msmeFilter,    setMsmeFilter]    = useState("")
  const [methodFilter,  setMethodFilter]  = useState("")
  const [search,        setSearch]        = useState("")
  const [page,          setPage]          = useState(1)
  const [sortBy,        setSortBy]        = useState("total_gmv")

  const fetchStats = useCallback(() => {
    fetch("/api/admin/procurement/seller-profiles/stats")
      .then(r => r.json())
      .then(d => { if (!d.error) setStats(d) })
      .catch(() => {})
  }, [])

  const fetchSellers = useCallback(() => {
    setLoading(true)
    const p = new URLSearchParams({
      page: String(page), limit: "50", sort_by: sortBy,
      ...(tierFilter   && { tier: tierFilter             }),
      ...(stateFilter  && { seller_state: stateFilter   }),
      ...(foggingOnly  && { supplies_fogging_products: "true" }),
      ...(needsReview  && { needs_review: "true"        }),
      ...(msmeFilter   && { msme_category: msmeFilter   }),
      ...(methodFilter && { identity_method: methodFilter }),
      ...(search       && { q: search                   }),
    })
    fetch(`/api/admin/procurement/seller-profiles?${p}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return }
        setSellers(d.profiles ?? [])
        setPagination(d.pagination ?? { total: 0, page: 1, limit: 50, total_pages: 1 })
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [page, sortBy, tierFilter, stateFilter, foggingOnly, needsReview, msmeFilter, methodFilter, search])

  useEffect(() => { fetchStats() }, [fetchStats])
  useEffect(() => { fetchSellers() }, [fetchSellers])

  async function triggerBuild(action: "rebuild" | "refresh") {
    setRebuilding(true); setError("")
    try {
      const r = await fetch("/api/admin/procurement/seller-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      const d = await r.json()
      if (d.error) { setError(d.error); return }
      fetchStats()
      setPage(1)
      fetchSellers()
    } catch (e) {
      setError(String(e))
    } finally {
      setRebuilding(false)
    }
  }

  const TIERS = ["A", "B", "C", "D"]

  return (
    <div className="space-y-5">
      {/* Stats bar */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { icon: Building2,  label: "Sellers",          value: stats.total_sellers.toLocaleString()        },
            { icon: TrendingUp, label: "Total GMV",         value: fmtGMV(stats.total_gmv)                   },
            { icon: Users,      label: "Repeat Sellers",    value: stats.repeat_sellers.toLocaleString()       },
            { icon: Flame,      label: "Fogging Suppliers", value: stats.fogging_suppliers.toLocaleString()    },
            { icon: AlertTriangle, label: "Needs Review",   value: stats.needs_review_count.toLocaleString()  },
            { icon: Shield,     label: "Multi-GSTIN",       value: stats.validation.multi_gstin_sellers.toLocaleString() },
          ].map(s => (
            <div key={s.label} className="bg-zinc-800/50 border border-zinc-700/40 rounded-xl p-3">
              <div className="flex items-center gap-2 text-zinc-400 mb-1">
                <s.icon className="w-3.5 h-3.5" />
                <span className="text-[11px]">{s.label}</span>
              </div>
              <p className="text-lg font-bold text-white">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Stale banner */}
      {stats?.meta.is_stale && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-950/40 border border-amber-700/40 rounded-xl text-amber-300 text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{stats.meta.stale_contract_count} new contracts since last build.</span>
          <button
            onClick={() => triggerBuild("refresh")}
            disabled={rebuilding}
            className="ml-auto text-xs bg-amber-500/20 hover:bg-amber-500/30 px-3 py-1 rounded-lg transition-colors"
          >
            Refresh now
          </button>
        </div>
      )}

      {/* Validation report */}
      {stats && (
        <div className="bg-zinc-800/30 border border-zinc-700/30 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-3">Identity Validation</h3>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3 text-center">
            {[
              { label: "GSTIN Seen",        value: stats.validation.gstin_seen           },
              { label: "GSTIN Failures",    value: stats.validation.gstin_validation_failures },
              { label: "Multi-GSTIN",       value: stats.validation.multi_gstin_sellers  },
              { label: "Merge Candidates",  value: stats.validation.merge_candidates_count },
              { label: "Conflicts",         value: stats.validation.identity_conflicts_total },
              { label: "High Confidence",   value: stats.validation.confidence_distribution.high },
            ].map(v => (
              <div key={v.label} className="bg-zinc-800/60 rounded-lg p-2">
                <p className="text-[11px] text-zinc-400">{v.label}</p>
                <p className="text-base font-bold text-white">{v.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tier chips */}
      <div className="flex flex-wrap items-center gap-2">
        {TIERS.map(t => (
          <button
            key={t}
            onClick={() => setTierFilter(tierFilter === t ? "" : t)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              tierFilter === t
                ? tierColor(t)
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            Tier {t}
            {stats && (() => {
              const d = stats.tier_distribution.find(x => x.tier === t)
              return d ? ` (${d.count})` : ""
            })()}
          </button>
        ))}
        <button
          onClick={() => setFoggingOnly(!foggingOnly)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1 ${
            foggingOnly ? "bg-orange-500/20 text-orange-300 border border-orange-500/30" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
          }`}
        >
          <Flame className="w-3 h-3" /> Fogging
        </button>
        <button
          onClick={() => setNeedsReview(!needsReview)}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1 ${
            needsReview ? "bg-rose-500/20 text-rose-300 border border-rose-500/30" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
          }`}
        >
          <AlertTriangle className="w-3 h-3" /> Needs Review
        </button>
      </div>

      {/* Filters + actions row */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="Search name / GSTIN / PAN / GeM ID…"
          className="flex-1 min-w-[200px] bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
        />
        <input
          value={stateFilter}
          onChange={e => { setStateFilter(e.target.value); setPage(1) }}
          placeholder="State…"
          className="w-32 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none"
        />
        <select
          value={msmeFilter}
          onChange={e => { setMsmeFilter(e.target.value); setPage(1) }}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
        >
          <option value="">All MSME</option>
          <option value="micro">Micro</option>
          <option value="small">Small</option>
          <option value="medium">Medium</option>
        </select>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
        >
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <div className="flex gap-2 ml-auto">
          <button
            onClick={() => triggerBuild("refresh")}
            disabled={rebuilding}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${rebuilding ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={() => triggerBuild("rebuild")}
            disabled={rebuilding}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <Package className="w-3.5 h-3.5" />
            Full Rebuild
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-rose-950/40 border border-rose-700/40 rounded-xl text-rose-300 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-zinc-700/40">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-700/40 bg-zinc-800/50">
              {["Seller", "State", "Tier", "Confidence", "GMV", "Contracts", "Buyers", "Last Contract", "→"].map(h => (
                <th key={h} className="px-3 py-2.5 text-left text-xs font-medium text-zinc-400 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="px-3 py-10 text-center text-zinc-500">Loading…</td>
              </tr>
            ) : sellers.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-10 text-center text-zinc-500">
                  No seller profiles found. Run a Full Rebuild first.
                </td>
              </tr>
            ) : sellers.map(s => (
              <tr
                key={s.seller_slug}
                className="border-b border-zinc-800/60 hover:bg-zinc-800/30 cursor-pointer transition-colors"
                onClick={() => setSelectedSlug(s.seller_slug)}
              >
                <td className="px-3 py-2.5 max-w-[220px]">
                  <div className="flex items-center gap-1.5">
                    {s.needs_review && <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                    {s.supplies_fogging_products && <Flame className="w-3.5 h-3.5 text-orange-400 shrink-0" />}
                    {s.is_100x_supplier && <BadgeCheck className="w-3.5 h-3.5 text-violet-400 shrink-0" />}
                  </div>
                  <p className="text-white truncate text-xs mt-0.5">{s.seller_name}</p>
                  <p className="text-zinc-500 text-[11px] font-mono truncate">
                    {s.seller_pan ?? s.seller_gstin ?? s.seller_gem_id ?? "—"}
                  </p>
                </td>
                <td className="px-3 py-2.5 text-zinc-300 text-xs whitespace-nowrap">{s.seller_state ?? "—"}</td>
                <td className="px-3 py-2.5">
                  <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${tierColor(s.seller_tier)}`}>
                    {s.seller_tier}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <span className={`text-xs px-1.5 py-0.5 rounded ${confidencePill(s.seller_identity_confidence)}`}>
                    {s.seller_identity_confidence}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-zinc-200 whitespace-nowrap">{fmtGMV(s.total_gmv)}</td>
                <td className="px-3 py-2.5 text-zinc-300">{s.contract_count.toLocaleString()}</td>
                <td className="px-3 py-2.5 text-zinc-300">{s.buyer_count.toLocaleString()}</td>
                <td className="px-3 py-2.5 text-zinc-400 text-xs whitespace-nowrap">{fmtDate(s.last_contract_date)}</td>
                <td className="px-3 py-2.5">
                  <ChevronRight className="w-4 h-4 text-zinc-600" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.total_pages > 1 && (
        <div className="flex items-center justify-between text-sm text-zinc-400">
          <span>{pagination.total.toLocaleString()} sellers · page {pagination.page} of {pagination.total_pages}</span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg disabled:opacity-40 transition-colors"
            >
              ← Prev
            </button>
            <button
              onClick={() => setPage(p => Math.min(pagination.total_pages, p + 1))}
              disabled={page >= pagination.total_pages}
              className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg disabled:opacity-40 transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Detail panel */}
      {selectedSlug && (
        <SellerDetailPanel
          sellerSlug={selectedSlug}
          onClose={() => setSelectedSlug(null)}
        />
      )}
    </div>
  )
}
