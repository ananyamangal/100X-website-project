"use client"

import { useState, useEffect, useCallback } from "react"
import {
  RefreshCw, AlertTriangle, ChevronRight, Flame,
  TrendingUp, Users, Star, Shield, Link,
  AlertCircle, BadgeCheck,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

interface PairRow {
  pair_key:              string
  buyer_slug:            string
  buyer_name:            string
  seller_slug:           string
  seller_name:           string
  seller_pan:            string | null
  seller_gstin:          string | null
  contract_count:        number
  total_gmv:             number
  avg_contract_value:    number | null
  first_contract_date:   string | null
  last_contract_date:    string | null
  relationship_span_days: number | null
  consecutive_years:     number
  is_repeat:             boolean
  is_exclusive:          boolean
  buyer_share_of_seller: number | null
  seller_share_of_buyer: number | null
  relationship_tier:     "anchor" | "regular" | "occasional"
  product_count:         number
  has_fogging_products:  boolean
  opportunity_score:     number
}

interface Stats {
  total_pairs:           number
  total_gmv:             number
  total_contracts:       number
  avg_opportunity_score: number
  max_opportunity_score: number
  exclusive_pairs:       number
  repeat_pairs:          number
  fogging_pairs:         number
  unique_buyers:         number
  unique_sellers:        number
  tier_distribution:     { tier: string; count: number; total_gmv: number }[]
  score_distribution:    { bucket: number | string; count: number }[]
  top_fogging_pairs:     { pair_key: string; buyer_name: string; seller_name: string; total_gmv: number; opportunity_score: number; relationship_tier: string; is_exclusive: boolean }[]
  meta: {
    last_build_at:       string | null
    last_full_build_at:  string | null
    last_incremental_at: string | null
    build_duration_ms:   number | null
    total_pairs:         number | null
  }
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtGMV(n: number | null | undefined): string {
  if (!n) return "—"
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)} Cr`
  if (n >= 1_00_000)    return `₹${(n / 1_00_000).toFixed(1)} L`
  return `₹${n.toLocaleString("en-IN")}`
}

function fmtPct(n: number | null | undefined): string {
  if (n == null) return "—"
  return `${(n * 100).toFixed(1)}%`
}

function fmtDate(s: string | null | undefined): string {
  if (!s) return "—"
  return new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" })
}

function tierColor(t: string) {
  return t === "anchor"    ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
       : t === "regular"   ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
       :                     "bg-zinc-700/60 text-zinc-400 border border-zinc-600/30"
}

function scoreColor(s: number) {
  if (s >= 75) return "text-emerald-400"
  if (s >= 50) return "text-amber-400"
  if (s >= 25) return "text-orange-400"
  return "text-zinc-400"
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 75 ? "bg-emerald-500"
              : score >= 50 ? "bg-amber-500"
              : score >= 25 ? "bg-orange-500"
              : "bg-zinc-600"
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-xs font-semibold ${scoreColor(score)}`}>{score}</span>
    </div>
  )
}

// ─── Pair detail slide-in ─────────────────────────────────────────────────────

function PairDetail({
  pair, onClose,
}: { pair: PairRow; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="h-full w-full max-w-xl bg-zinc-900 border-l border-zinc-700 overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${tierColor(pair.relationship_tier)}`}>
              {pair.relationship_tier}
            </span>
            {pair.is_exclusive && (
              <span className="text-xs px-2 py-0.5 rounded bg-violet-500/20 text-violet-300 flex items-center gap-1">
                <Shield className="w-3 h-3" /> exclusive
              </span>
            )}
            {pair.has_fogging_products && (
              <span className="text-xs px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 flex items-center gap-1">
                <Flame className="w-3 h-3" /> fogging
              </span>
            )}
            <span className="ml-auto text-xs text-zinc-500">Score</span>
            <ScoreBar score={pair.opportunity_score} />
          </div>
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-zinc-400 mb-0.5">Buyer</p>
              <p className="text-sm font-semibold text-white">{pair.buyer_name}</p>
            </div>
            <Link className="w-4 h-4 text-zinc-600 mt-4 shrink-0" />
            <div className="flex-1 min-w-0 text-right">
              <p className="text-xs text-zinc-400 mb-0.5">Seller</p>
              <p className="text-sm font-semibold text-white">{pair.seller_name}</p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Key metrics grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Total GMV",         value: fmtGMV(pair.total_gmv)            },
              { label: "Contracts",          value: pair.contract_count.toLocaleString() },
              { label: "Avg Contract",       value: fmtGMV(pair.avg_contract_value)   },
              { label: "Consecutive Years",  value: String(pair.consecutive_years)    },
              { label: "First Contract",     value: fmtDate(pair.first_contract_date) },
              { label: "Last Contract",      value: fmtDate(pair.last_contract_date)  },
              { label: "Span (days)",        value: pair.relationship_span_days != null ? `${pair.relationship_span_days}d` : "—" },
              { label: "Products",           value: String(pair.product_count)        },
            ].map(m => (
              <div key={m.label} className="bg-zinc-800/50 rounded-lg p-3">
                <p className="text-[11px] text-zinc-400">{m.label}</p>
                <p className="text-sm font-semibold text-white mt-0.5">{m.value}</p>
              </div>
            ))}
          </div>

          {/* Share metrics */}
          <div className="bg-zinc-800/50 rounded-lg p-4 space-y-3">
            <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Wallet Share</h3>
            <div className="space-y-2.5">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-zinc-400">Seller's share of buyer's spend</span>
                  <span className="text-white font-medium">{fmtPct(pair.seller_share_of_buyer)}</span>
                </div>
                {pair.seller_share_of_buyer != null && (
                  <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-violet-500 rounded-full"
                      style={{ width: `${Math.min(100, (pair.seller_share_of_buyer ?? 0) * 100)}%` }}
                    />
                  </div>
                )}
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-zinc-400">Buyer's share of seller's GMV</span>
                  <span className="text-white font-medium">{fmtPct(pair.buyer_share_of_seller)}</span>
                </div>
                {pair.buyer_share_of_seller != null && (
                  <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${Math.min(100, (pair.buyer_share_of_seller ?? 0) * 100)}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Identity */}
          <div className="bg-zinc-800/50 rounded-lg p-4 space-y-2">
            <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Seller Identity</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
              <p className="text-zinc-400">PAN</p>
              <p className="text-white font-mono text-xs">{pair.seller_pan ?? "—"}</p>
              <p className="text-zinc-400">GSTIN</p>
              <p className="text-white font-mono text-xs truncate">{pair.seller_gstin ?? "—"}</p>
              <p className="text-zinc-400">Exclusive</p>
              <p className={pair.is_exclusive ? "text-violet-300 font-medium" : "text-zinc-300"}>
                {pair.is_exclusive ? "Yes — sells only to this buyer" : "No"}
              </p>
            </div>
          </div>

          {/* Opportunity analysis */}
          <div className="bg-zinc-800/50 rounded-lg p-4 space-y-2">
            <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Opportunity Analysis</h3>
            <div className="space-y-2 text-xs text-zinc-300">
              {pair.is_exclusive && (
                <p className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                  Seller is exclusive to this buyer — maximum disruption potential
                </p>
              )}
              {pair.relationship_tier === "anchor" && (
                <p className="flex items-center gap-2">
                  <Star className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  Anchor relationship — buyer relies heavily on this seller
                </p>
              )}
              {pair.has_fogging_products && (
                <p className="flex items-center gap-2">
                  <Flame className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                  Fogging products transacted — direct 100X Circle market overlap
                </p>
              )}
              {pair.consecutive_years >= 2 && (
                <p className="flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  {pair.consecutive_years} years of continuous purchasing history
                </p>
              )}
              {pair.is_repeat && !pair.has_fogging_products && (
                <p className="flex items-center gap-2">
                  <BadgeCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  Repeat buyer — validated purchaser even outside fogging category
                </p>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-2 text-sm text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-500 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main tab ─────────────────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { value: "opportunity_score",    label: "Opportunity Score" },
  { value: "total_gmv",           label: "Total GMV"         },
  { value: "contract_count",      label: "Contracts"         },
  { value: "consecutive_years",   label: "Longevity"         },
  { value: "seller_share_of_buyer", label: "Seller Wallet %"  },
]

const TIER_OPTIONS = ["anchor", "regular", "occasional"]

export function ContractAnalyticsTab() {
  const [stats, setStats]         = useState<Stats | null>(null)
  const [pairs, setPairs]         = useState<PairRow[]>([])
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 50, total_pages: 1 })
  const [loading, setLoading]     = useState(true)
  const [rebuilding, setRebuilding] = useState(false)
  const [error, setError]         = useState("")
  const [selectedPair, setSelectedPair] = useState<PairRow | null>(null)

  // Filters
  const [tierFilter,   setTierFilter]   = useState("")
  const [foggingOnly,  setFoggingOnly]  = useState(false)
  const [exclusiveOnly, setExclusiveOnly] = useState(false)
  const [repeatOnly,   setRepeatOnly]   = useState(false)
  const [search,       setSearch]       = useState("")
  const [page,         setPage]         = useState(1)
  const [sortBy,       setSortBy]       = useState("opportunity_score")

  const fetchStats = useCallback(() => {
    fetch("/api/admin/procurement/contract-analytics/stats")
      .then(r => r.json())
      .then(d => { if (!d.error) setStats(d) })
      .catch(() => {})
  }, [])

  const fetchPairs = useCallback(() => {
    setLoading(true)
    const p = new URLSearchParams({
      page: String(page), limit: "50", sort_by: sortBy,
      ...(tierFilter    && { tier: tierFilter              }),
      ...(foggingOnly   && { fogging_only: "true"         }),
      ...(exclusiveOnly && { is_exclusive: "true"         }),
      ...(repeatOnly    && { is_repeat: "true"            }),
      ...(search        && { q: search                    }),
    })
    fetch(`/api/admin/procurement/contract-analytics/pairs?${p}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); return }
        setPairs(d.pairs ?? [])
        setPagination(d.pagination ?? { total: 0, page: 1, limit: 50, total_pages: 1 })
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false))
  }, [page, sortBy, tierFilter, foggingOnly, exclusiveOnly, repeatOnly, search])

  useEffect(() => { fetchStats() }, [fetchStats])
  useEffect(() => { fetchPairs() }, [fetchPairs])

  async function triggerBuild(action: "rebuild_pairs" | "refresh_pairs") {
    setRebuilding(true); setError("")
    try {
      const r = await fetch("/api/admin/procurement/contract-analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      const d = await r.json()
      if (d.error) { setError(d.error); return }
      fetchStats(); setPage(1); fetchPairs()
    } catch (e) {
      setError(String(e))
    } finally {
      setRebuilding(false)
    }
  }

  const hasPairs = (stats?.total_pairs ?? 0) > 0

  return (
    <div className="space-y-5">
      {/* Stats bar */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[
            { icon: Link,         label: "Pairs",           value: stats.total_pairs.toLocaleString()      },
            { icon: TrendingUp,   label: "Total GMV",       value: fmtGMV(stats.total_gmv)                },
            { icon: Star,         label: "Avg Opp Score",   value: stats.avg_opportunity_score.toFixed(1) },
            { icon: Shield,       label: "Exclusive Pairs", value: stats.exclusive_pairs.toLocaleString() },
            { icon: Flame,        label: "Fogging Pairs",   value: stats.fogging_pairs.toLocaleString()   },
            { icon: Users,        label: "Unique Buyers",   value: stats.unique_buyers.toLocaleString()   },
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

      {/* No data banner */}
      {!hasPairs && !loading && (
        <div className="flex items-center gap-3 px-4 py-4 bg-zinc-800/40 border border-zinc-700/40 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <p className="text-sm text-white font-medium">No buyer-seller pairs built yet</p>
            <p className="text-xs text-zinc-400 mt-0.5">
              Run a Full Rebuild to compute relationship analytics from existing buyer and seller profiles.
            </p>
          </div>
          <button
            onClick={() => triggerBuild("rebuild_pairs")}
            disabled={rebuilding}
            className="ml-auto text-sm bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 shrink-0"
          >
            {rebuilding ? "Building…" : "Build Now"}
          </button>
        </div>
      )}

      {/* Tier distribution */}
      {stats && hasPairs && (
        <div className="grid grid-cols-3 gap-3">
          {stats.tier_distribution.map(t => (
            <div
              key={t.tier}
              onClick={() => setTierFilter(tierFilter === t.tier ? "" : t.tier)}
              className={`cursor-pointer rounded-xl border p-4 transition-all ${
                tierFilter === t.tier
                  ? tierColor(t.tier) + " border-opacity-100"
                  : "bg-zinc-800/40 border-zinc-700/40 hover:border-zinc-600/60"
              }`}
            >
              <p className="text-xs text-zinc-400 capitalize mb-1">{t.tier} relationships</p>
              <p className="text-2xl font-bold text-white">{t.count.toLocaleString()}</p>
              <p className="text-xs text-zinc-400 mt-1">{fmtGMV(t.total_gmv)} GMV</p>
            </div>
          ))}
        </div>
      )}

      {/* Top fogging pairs */}
      {stats && stats.top_fogging_pairs.length > 0 && (
        <div className="bg-zinc-800/30 border border-orange-900/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Flame className="w-4 h-4 text-orange-400" />
            <h3 className="text-sm font-semibold text-white">Top Fogging Opportunity Pairs</h3>
          </div>
          <div className="space-y-1.5">
            {stats.top_fogging_pairs.slice(0, 5).map((p, i) => (
              <div key={p.pair_key} className="flex items-center gap-3 text-xs">
                <span className="text-zinc-500 w-4">{i + 1}</span>
                <span className="text-zinc-300 flex-1 truncate">{p.buyer_name}</span>
                <span className="text-zinc-500 mx-1">←</span>
                <span className="text-zinc-300 flex-1 truncate">{p.seller_name}</span>
                <span className="text-zinc-400 w-16 text-right">{fmtGMV(p.total_gmv)}</span>
                <ScoreBar score={p.opportunity_score} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter row */}
      {hasPairs && (
        <div className="flex flex-wrap items-center gap-3">
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search buyer / seller / product…"
            className="flex-1 min-w-[200px] bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
          {[
            { label: "Exclusive",       active: exclusiveOnly,  toggle: () => { setExclusiveOnly(!exclusiveOnly); setPage(1) }, icon: Shield   },
            { label: "Repeat",          active: repeatOnly,     toggle: () => { setRepeatOnly(!repeatOnly); setPage(1) },       icon: BadgeCheck },
            { label: "Fogging",         active: foggingOnly,    toggle: () => { setFoggingOnly(!foggingOnly); setPage(1) },     icon: Flame    },
          ].map(f => (
            <button
              key={f.label}
              onClick={f.toggle}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg transition-colors ${
                f.active
                  ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 border border-zinc-700"
              }`}
            >
              <f.icon className="w-3.5 h-3.5" />
              {f.label}
            </button>
          ))}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
          >
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <div className="flex gap-2 ml-auto">
            <button
              onClick={() => triggerBuild("refresh_pairs")}
              disabled={rebuilding}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${rebuilding ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={() => triggerBuild("rebuild_pairs")}
              disabled={rebuilding}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Full Rebuild
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-rose-950/40 border border-rose-700/40 rounded-xl text-rose-300 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Table */}
      {hasPairs && (
        <div className="overflow-x-auto rounded-xl border border-zinc-700/40">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-700/40 bg-zinc-800/50">
                {["Score", "Buyer", "Seller", "GMV", "Contracts", "Tier", "Wallet %", "Exclusive", "Fogging", "→"].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs font-medium text-zinc-400 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="px-3 py-10 text-center text-zinc-500">Loading…</td></tr>
              ) : pairs.length === 0 ? (
                <tr><td colSpan={10} className="px-3 py-10 text-center text-zinc-500">No pairs match the current filters.</td></tr>
              ) : pairs.map(p => (
                <tr
                  key={p.pair_key}
                  className="border-b border-zinc-800/60 hover:bg-zinc-800/30 cursor-pointer transition-colors"
                  onClick={() => setSelectedPair(p)}
                >
                  <td className="px-3 py-2.5"><ScoreBar score={p.opportunity_score} /></td>
                  <td className="px-3 py-2.5 max-w-[180px]">
                    <p className="text-white text-xs truncate">{p.buyer_name}</p>
                  </td>
                  <td className="px-3 py-2.5 max-w-[180px]">
                    <p className="text-white text-xs truncate">{p.seller_name}</p>
                    <p className="text-zinc-500 text-[11px] font-mono">{p.seller_pan ?? "—"}</p>
                  </td>
                  <td className="px-3 py-2.5 text-zinc-200 whitespace-nowrap">{fmtGMV(p.total_gmv)}</td>
                  <td className="px-3 py-2.5 text-zinc-300">{p.contract_count}</td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium capitalize ${tierColor(p.relationship_tier)}`}>
                      {p.relationship_tier}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-zinc-300 text-xs">{fmtPct(p.seller_share_of_buyer)}</td>
                  <td className="px-3 py-2.5 text-center">
                    {p.is_exclusive && <Shield className="w-3.5 h-3.5 text-violet-400 mx-auto" />}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {p.has_fogging_products && <Flame className="w-3.5 h-3.5 text-orange-400 mx-auto" />}
                  </td>
                  <td className="px-3 py-2.5">
                    <ChevronRight className="w-4 h-4 text-zinc-600" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {hasPairs && pagination.total_pages > 1 && (
        <div className="flex items-center justify-between text-sm text-zinc-400">
          <span>{pagination.total.toLocaleString()} pairs · page {pagination.page} of {pagination.total_pages}</span>
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

      {selectedPair && <PairDetail pair={selectedPair} onClose={() => setSelectedPair(null)} />}
    </div>
  )
}
