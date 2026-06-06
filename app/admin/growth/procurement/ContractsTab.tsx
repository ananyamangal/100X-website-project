"use client"
import { useEffect, useState, useCallback } from "react"
import {
  TrendingUp, Users, Building2, Package, Map,
  RefreshCw, AlertCircle, ArrowLeft, ExternalLink,
} from "lucide-react"

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtInr(n: number | null | undefined) {
  if (!n) return "—"
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`
  return `₹${n.toLocaleString()}`
}

function pct(part: number, whole: number) {
  return whole ? Math.round((part / whole) * 100) : 0
}

function useContractsData(section: string, params: Record<string, string> = {}) {
  const [data, setData]     = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const qs = new URLSearchParams({ section, ...params }).toString()
      const res = await fetch(`/api/admin/procurement/contracts?${qs}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "API error")
      setData(json)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [section, JSON.stringify(params)])   // eslint-disable-line

  useEffect(() => { load() }, [load])
  return { data, loading, error, reload: load }
}

// ── Overview card ─────────────────────────────────────────────────────────────
function OverviewCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  )
}

// ── Rank table ────────────────────────────────────────────────────────────────
interface RankRow { _id: string; gmv?: number; count?: number; [k: string]: unknown }

function RankTable({
  rows, label, valueCol, countCol, onSelect,
}: {
  rows: RankRow[]; label: string
  valueCol?: "gmv"; countCol?: "count"
  onSelect?: (name: string) => void
}) {
  if (!rows.length) return <div className="text-gray-500 text-sm py-4 text-center">No data yet</div>

  const maxGmv   = Math.max(...rows.map(r => r.gmv   || 0))
  const maxCount = Math.max(...rows.map(r => r.count  || 0))

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-700 text-gray-400 text-xs uppercase">
            <th className="text-left py-2 pr-4 w-6">#</th>
            <th className="text-left py-2 pr-4">{label}</th>
            {valueCol && <th className="text-right py-2 pr-4">GMV</th>}
            {countCol && <th className="text-right py-2">Contracts</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row._id}
              className={`border-b border-gray-800 ${onSelect ? "cursor-pointer hover:bg-gray-800" : ""}`}
              onClick={() => onSelect?.(row._id)}
            >
              <td className="py-2 pr-4 text-gray-500">{i + 1}</td>
              <td className="py-2 pr-4">
                <div className="text-white text-xs">{row._id}</div>
                {!!row.gstin    && <div className="text-gray-500 text-xs font-mono">{String(row.gstin)}</div>}
                {!!row.ministry && <div className="text-gray-500 text-xs">{String(row.ministry)}</div>}
                {valueCol && (
                  <div className="mt-1 h-1 rounded bg-gray-700 w-full">
                    <div
                      className="h-1 rounded bg-orange-500"
                      style={{ width: `${pct(row.gmv || 0, maxGmv)}%` }}
                    />
                  </div>
                )}
              </td>
              {valueCol && (
                <td className="py-2 pr-4 text-right text-orange-400 font-mono text-xs whitespace-nowrap">
                  {fmtInr(row.gmv)}
                </td>
              )}
              {countCol && (
                <td className="py-2 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="h-1 w-16 rounded bg-gray-700">
                      <div
                        className="h-1 rounded bg-blue-500"
                        style={{ width: `${pct(row.count || 0, maxCount)}%` }}
                      />
                    </div>
                    <span className="text-gray-300 text-xs w-8 text-right">{row.count}</span>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, icon: Icon, children, onReload }: {
  title: string; icon: React.ElementType
  children: React.ReactNode; onReload?: () => void
}) {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-white font-semibold">
          <Icon size={16} className="text-orange-400" />
          {title}
        </div>
        {onReload && (
          <button onClick={onReload} className="text-gray-500 hover:text-white transition-colors">
            <RefreshCw size={14} />
          </button>
        )}
      </div>
      {children}
    </div>
  )
}

function LoadingBox() {
  return (
    <div className="py-8 text-center text-gray-500 text-sm animate-pulse">Loading...</div>
  )
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="py-4 text-center text-red-400 text-sm flex items-center justify-center gap-2">
      <AlertCircle size={14} /> {msg}
    </div>
  )
}

// ── Profile views ─────────────────────────────────────────────────────────────
function SellerProfile({ name, onBack }: { name: string; onBack: () => void }) {
  const { data, loading, error } = useContractsData("seller_profile", { name })
  if (loading) return <LoadingBox />
  if (error)   return <ErrorBox msg={error} />
  if (!data)   return null

  const d = data as Record<string, unknown>
  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-gray-400 hover:text-white text-sm">
        <ArrowLeft size={14} /> Back
      </button>
      <div className="bg-gray-800 rounded-xl p-5 space-y-3">
        <div className="text-white font-bold text-lg">{d.name as string}</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div><div className="text-gray-400 text-xs">Total GMV</div><div className="text-orange-400 font-mono">{fmtInr(d.gmv as number)}</div></div>
          <div><div className="text-gray-400 text-xs">Contracts</div><div className="text-white">{d.count as number}</div></div>
          <div><div className="text-gray-400 text-xs">GSTIN</div><div className="text-white font-mono text-xs">{(d.gstin as string) || "—"}</div></div>
          <div><div className="text-gray-400 text-xs">MSME</div><div className="text-white">{(d.msme as string) || "—"}</div></div>
          <div><div className="text-gray-400 text-xs">State</div><div className="text-white">{(d.state as string) || "—"}</div></div>
          <div><div className="text-gray-400 text-xs">In Dealer DB</div><div className={d.in_gem_dealers ? "text-green-400" : "text-yellow-400"}>{d.in_gem_dealers ? "Yes" : "New"}</div></div>
          <div><div className="text-gray-400 text-xs">Bid Wins (L1)</div><div className="text-white">{d.bid_wins as number}</div></div>
        </div>
        <div className="text-xs text-gray-400">
          Departments: {(d.departments as string[]).slice(0, 5).join(", ") || "—"}
        </div>
        <div className="text-xs text-gray-400">
          Products: {(d.products as string[]).slice(0, 5).join(", ") || "—"}
        </div>
      </div>
    </div>
  )
}

function DeptProfile({ name, onBack }: { name: string; onBack: () => void }) {
  const { data, loading, error } = useContractsData("dept_profile", { name })
  if (loading) return <LoadingBox />
  if (error)   return <ErrorBox msg={error} />
  if (!data)   return null

  const d = data as Record<string, unknown>
  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-gray-400 hover:text-white text-sm">
        <ArrowLeft size={14} /> Back
      </button>
      <div className="bg-gray-800 rounded-xl p-5 space-y-3">
        <div className="text-white font-bold text-lg">{d.name as string}</div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <div><div className="text-gray-400 text-xs">Total Spend</div><div className="text-orange-400 font-mono">{fmtInr(d.gmv as number)}</div></div>
          <div><div className="text-gray-400 text-xs">Contracts</div><div className="text-white">{d.count as number}</div></div>
          <div><div className="text-gray-400 text-xs">Ministry</div><div className="text-white text-xs">{(d.ministry as string) || "—"}</div></div>
        </div>
        <div className="text-xs text-gray-400">
          Sellers ({(d.sellers as string[]).length}): {(d.sellers as string[]).slice(0, 5).join(", ")}
        </div>
        <div className="text-xs text-gray-400">
          Products: {(d.products as string[]).slice(0, 5).join(", ")}
        </div>
      </div>
    </div>
  )
}

function ProductProfile({ name, onBack }: { name: string; onBack: () => void }) {
  const { data, loading, error } = useContractsData("product_profile", { name })
  if (loading) return <LoadingBox />
  if (error)   return <ErrorBox msg={error} />
  if (!data)   return null

  const d = data as Record<string, unknown>
  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-gray-400 hover:text-white text-sm">
        <ArrowLeft size={14} /> Back
      </button>
      <div className="bg-gray-800 rounded-xl p-5 space-y-3">
        <div className="text-white font-bold text-base leading-snug">{d.name as string}</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div><div className="text-gray-400 text-xs">Total GMV</div><div className="text-orange-400 font-mono">{fmtInr(d.gmv as number)}</div></div>
          <div><div className="text-gray-400 text-xs">Contracts</div><div className="text-white">{d.count as number}</div></div>
          <div><div className="text-gray-400 text-xs">Avg Unit Price</div><div className="text-white">{fmtInr(d.avg_unit_price as number)}</div></div>
          <div><div className="text-gray-400 text-xs">Price Range</div><div className="text-white text-xs">{fmtInr(d.min_price as number)} – {fmtInr(d.max_price as number)}</div></div>
        </div>
        <div className="text-xs text-gray-400">
          Sellers: {(d.sellers as string[]).slice(0, 5).join(", ") || "—"}
        </div>
        <div className="text-xs text-gray-400">
          Departments: {(d.departments as string[]).slice(0, 5).join(", ") || "—"}
        </div>
      </div>
    </div>
  )
}

// ── Main tab ──────────────────────────────────────────────────────────────────
export function ContractsTab() {
  const [profile, setProfile] = useState<{ type: "seller"|"dept"|"product"; name: string } | null>(null)

  const overview    = useContractsData("overview")
  const sellersGmv  = useContractsData("sellers_by_gmv",   { limit: "20" })
  const sellersCnt  = useContractsData("sellers_by_count",  { limit: "20" })
  const newSellers  = useContractsData("new_sellers",       { limit: "30" })
  const depts       = useContractsData("depts_by_spend",    { limit: "20" })
  const products    = useContractsData("products_by_spend", { limit: "20" })
  const states      = useContractsData("states_by_spend")

  // ── Profile drill-down ───────────────────────────────────────────────────
  if (profile?.type === "seller") {
    return <SellerProfile name={profile.name} onBack={() => setProfile(null)} />
  }
  if (profile?.type === "dept") {
    return <DeptProfile name={profile.name} onBack={() => setProfile(null)} />
  }
  if (profile?.type === "product") {
    return <ProductProfile name={profile.name} onBack={() => setProfile(null)} />
  }

  const ov = overview.data as Record<string, number> | null

  return (
    <div className="space-y-6">

      {/* ── Enrichment status banner ─────────────────────────────────────── */}
      {ov && ov.pct_enriched < 100 && (
        <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-lg p-3 text-sm text-yellow-300 flex items-center gap-2">
          <AlertCircle size={14} />
          <span>
            Enrichment in progress: {ov.enriched}/{ov.total} contracts ({ov.pct_enriched}%).
            Run <code className="text-yellow-200 font-mono text-xs">node scripts/gem-enrich-contracts.js</code> to continue.
          </span>
        </div>
      )}

      {/* ── Overview cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <OverviewCard
          label="Total Contracts"
          value={ov?.total?.toLocaleString() ?? "—"}
          sub={`${ov?.enriched ?? 0} enriched`}
        />
        <OverviewCard
          label="Total GMV"
          value={fmtInr(ov?.total_gmv)}
          sub="all contracts"
        />
        <OverviewCard
          label="Enriched GMV"
          value={fmtInr(ov?.enriched_gmv)}
          sub={`${ov?.pct_enriched ?? 0}% enriched`}
        />
        <OverviewCard
          label="Pending"
          value={ov?.pending?.toLocaleString() ?? "—"}
          sub={`${ov?.failed ?? 0} failed`}
        />
      </div>

      {/* ── 2×2 grid: sellers ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* 1. Top sellers by GMV */}
        <Section title="Top Sellers by GMV" icon={TrendingUp} onReload={sellersGmv.reload}>
          {sellersGmv.loading && <LoadingBox />}
          {sellersGmv.error   && <ErrorBox msg={sellersGmv.error} />}
          {sellersGmv.data && (
            <RankTable
              rows={(sellersGmv.data.rows as RankRow[]) || []}
              label="Seller" valueCol="gmv" countCol="count"
              onSelect={name => setProfile({ type: "seller", name })}
            />
          )}
        </Section>

        {/* 2. Top sellers by contract count */}
        <Section title="Top Sellers by Contract Count" icon={Users} onReload={sellersCnt.reload}>
          {sellersCnt.loading && <LoadingBox />}
          {sellersCnt.error   && <ErrorBox msg={sellersCnt.error} />}
          {sellersCnt.data && (
            <RankTable
              rows={(sellersCnt.data.rows as RankRow[]) || []}
              label="Seller" countCol="count" valueCol="gmv"
              onSelect={name => setProfile({ type: "seller", name })}
            />
          )}
        </Section>

      </div>

      {/* 3. New sellers not in gem_dealers */}
      <Section title="New Sellers — Not in Dealer Database" icon={Users} onReload={newSellers.reload}>
        {newSellers.loading && <LoadingBox />}
        {newSellers.error   && <ErrorBox msg={newSellers.error} />}
        {newSellers.data && (() => {
          const rows = (newSellers.data.rows as RankRow[]) || []
          if (!rows.length) return (
            <div className="text-center text-green-400 text-sm py-4">
              All enriched sellers are already in the dealer database.
            </div>
          )
          return (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-700 text-gray-400 uppercase text-xs">
                    <th className="text-left py-2 pr-4">#</th>
                    <th className="text-left py-2 pr-4">Seller</th>
                    <th className="text-right py-2 pr-4">GMV</th>
                    <th className="text-right py-2 pr-4">Contracts</th>
                    <th className="text-left py-2">GSTIN</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr
                      key={r._id}
                      className="border-b border-gray-800 cursor-pointer hover:bg-gray-800"
                      onClick={() => setProfile({ type: "seller", name: r._id })}
                    >
                      <td className="py-2 pr-4 text-gray-500">{i + 1}</td>
                      <td className="py-2 pr-4 text-white">{r._id}</td>
                      <td className="py-2 pr-4 text-orange-400 font-mono text-right">{fmtInr(r.gmv)}</td>
                      <td className="py-2 pr-4 text-gray-300 text-right">{r.count}</td>
                      <td className="py-2 text-gray-500 font-mono">{(r.gstin as string) || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        })()}
      </Section>

      {/* ── 3-column: dept / product / state ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* 4. Top departments by spend */}
        <Section title="Top Departments by Spend" icon={Building2} onReload={depts.reload}>
          {depts.loading && <LoadingBox />}
          {depts.error   && <ErrorBox msg={depts.error} />}
          {depts.data && (
            <RankTable
              rows={(depts.data.rows as RankRow[]) || []}
              label="Department" valueCol="gmv" countCol="count"
              onSelect={name => setProfile({ type: "dept", name })}
            />
          )}
        </Section>

        {/* 5. Top products by spend */}
        <Section title="Top Products by Spend" icon={Package} onReload={products.reload}>
          {products.loading && <LoadingBox />}
          {products.error   && <ErrorBox msg={products.error} />}
          {products.data && (
            <RankTable
              rows={(products.data.rows as RankRow[]) || []}
              label="Product" valueCol="gmv" countCol="count"
              onSelect={name => setProfile({ type: "product", name })}
            />
          )}
        </Section>

        {/* 6. Top states by spend */}
        <Section title="Top States by Spend" icon={Map} onReload={states.reload}>
          {states.loading && <LoadingBox />}
          {states.error   && <ErrorBox msg={states.error} />}
          {states.data && (
            <RankTable
              rows={(states.data.rows as RankRow[]) || []}
              label="State" valueCol="gmv" countCol="count"
            />
          )}
        </Section>

      </div>

      <div className="text-xs text-gray-600 text-center pb-2">
        Procurement intelligence graph · Seller ↔ Product ↔ Department ↔ State ↔ Contract
      </div>
    </div>
  )
}
