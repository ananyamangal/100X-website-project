"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { ChevronRight, Building2, RefreshCw, ExternalLink } from "lucide-react"

const INR = (v: number | null | undefined) => {
  if (v == null) return "—"
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(1)} L`
  if (v >= 1e3) return `₹${(v / 1e3).toFixed(0)} K`
  return `₹${Math.round(v).toLocaleString()}`
}

const fmt = (d: string | null | undefined) => d
  ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
  : "—"

interface Org {
  organization_canonical: string
  organization_name:      string
  organization_state:     string | null
  dept_category:          string
  organization_type:      string
  organization_status:    string
  buyer_count_merged:     number
  buyer_canonicals:       string[]
  buyer_display_names:    string[]
  total_contracts:        number
  total_gmv:              number | null
  total_units:            number | null
  avg_contract_value:     number | null
  median_unit_price:      number | null
  year_count:             number
  active_years:           number[]
  first_contract:         string | null
  last_contract:          string | null
  oem_count:              number
  seller_count:           number
  model_count:            number
  is_100x_buyer:          boolean
  incumbent_oem:          string | null
  incumbent_oem_brand:    string | null
  incumbent_oem_gmv:      number | null
  incumbent_seller:       string | null
  incumbent_seller_gst:   string | null
  incumbent_seller_gmv:   number | null
  oem_breakdown:          { oem_canonical: string; brand_name: string | null; is_100x: boolean; gmv: number; contracts: number; share_pct: number }[]
  seller_breakdown:       { seller_gst: string; seller_name: string; gmv: number; contracts: number }[]
  dominant_mount_type:    string | null
  dominant_starting_type: string | null
  spec_mount_counts:      Record<string, number>
  spec_start_counts:      Record<string, number>
}

interface Contract {
  gemc_no:            string
  contract_date:      string | null
  buyer_display_name: string
  buyer_canonical:    string
  oem_canonical:      string
  oem_short_brand:    string | null
  model_raw:          string | null
  model_normalized:   string | null
  contract_value_num: number | null
  quantity:           number | null
  unit_price:         number | null
  has_unit_price:     boolean
  seller_name:        string | null
  seller_gst:         string | null
  is_100x:            boolean
  spec_mount_type:    string | null
  spec_starting_type: string | null
}

type Tab = "contracts" | "oems" | "sellers" | "models" | "timeline" | "specs"

const TABS: { id: Tab; label: string }[] = [
  { id: "contracts", label: "Contracts" },
  { id: "oems",      label: "OEM History" },
  { id: "sellers",   label: "Seller History" },
  { id: "timeline",  label: "Procurement Timeline" },
  { id: "specs",     label: "Specifications" },
]

export default function OrganizationPage({ params }: { params: { canonical: string } }) {
  const canonical = decodeURIComponent(params.canonical)
  const [org, setOrg]           = useState<Org | null>(null)
  const [contracts, setContracts] = useState<Contract[]>([])
  const [timeline, setTimeline] = useState<{ quarter: string; gmv: number; contracts: number }[]>([])
  const [specs, setSpecs]       = useState<Record<string, Record<string, number>>>({})
  const [loading, setLoading]   = useState(true)
  const [tab, setTab]           = useState<Tab>("contracts")
  const [contractFilter, setContractFilter] = useState("")

  useEffect(() => {
    setLoading(true)
    fetch(`/api/fogging/organizations/${encodeURIComponent(canonical)}`)
      .then(r => r.json())
      .then(d => {
        setOrg(d.org)
        setContracts(d.contracts ?? [])
        setTimeline(d.timeline ?? [])
        setSpecs(d.specs ?? {})
      })
      .finally(() => setLoading(false))
  }, [canonical])

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <RefreshCw size={24} className="animate-spin text-gray-400"/>
    </div>
  )
  if (!org) return <div className="p-8 text-sm text-gray-500">Organization not found.</div>

  const filteredContracts = contractFilter
    ? contracts.filter(c =>
        c.gemc_no.includes(contractFilter) ||
        (c.oem_short_brand || "").toLowerCase().includes(contractFilter.toLowerCase()) ||
        (c.model_raw || "").toLowerCase().includes(contractFilter.toLowerCase()) ||
        (c.seller_name || "").toLowerCase().includes(contractFilter.toLowerCase())
      )
    : contracts

  const maxTimelineGmv = Math.max(...timeline.map(t => t.gmv), 1)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-screen-xl mx-auto px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-2 flex-wrap">
            <Link href="/admin/growth/fogging" className="hover:text-gray-700">Fogging Intelligence</Link>
            <span>/</span>
            <Link href="/admin/growth/fogging/organizations" className="hover:text-gray-700">Organizations</Link>
            <span>/</span>
            <span className="text-gray-800 truncate max-w-[200px]">{org.organization_name}</span>
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Building2 size={20} className="text-indigo-600 shrink-0"/>
                {org.organization_name}
              </h1>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                {org.organization_state && (
                  <Link href={`/admin/growth/fogging/state/${encodeURIComponent(org.organization_state)}`}
                    className="text-xs text-indigo-600 hover:underline">
                    {org.organization_state}
                  </Link>
                )}
                <span className="text-xs text-gray-500">{org.dept_category}</span>
                <span className="text-xs text-gray-400">{org.organization_type}</span>
                {org.buyer_count_merged > 1 && (
                  <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                    {org.buyer_count_merged} sources merged
                  </span>
                )}
                {org.organization_status !== 'verified' && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium
                    ${org.organization_status === 'merged' ? 'bg-blue-100 text-blue-700' :
                      org.organization_status === 'unresolved' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'}`}>
                    {org.organization_status}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 py-4 space-y-4">

        {/* KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "GMV",           value: INR(org.total_gmv),     color: "text-indigo-700" },
            { label: "Contracts",     value: org.total_contracts,     color: "" },
            { label: "OEMs",          value: org.oem_count,          color: "" },
            { label: "Sellers",       value: org.seller_count,        color: "" },
            { label: "Models",        value: org.model_count,         color: "" },
            { label: "Active Years",  value: org.year_count,          color: "" },
          ].map(k => (
            <div key={k.label} className="bg-white border border-gray-200 rounded-lg p-3">
              <div className="text-[10px] text-gray-400 uppercase tracking-wide">{k.label}</div>
              <div className={`text-lg font-bold ${k.color}`}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* Incumbent intelligence */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {org.incumbent_oem && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">Incumbent OEM</div>
              <div className="flex items-center justify-between">
                <Link href={`/admin/growth/fogging/oem/${encodeURIComponent(org.incumbent_oem)}`}
                  className="font-bold text-purple-700 hover:underline text-sm">
                  {org.incumbent_oem_brand || org.incumbent_oem}
                </Link>
                <span className="text-sm font-semibold">{INR(org.incumbent_oem_gmv)}</span>
              </div>
              <div className="mt-2 space-y-1">
                {org.oem_breakdown.slice(0, 4).map(o => (
                  <div key={o.oem_canonical} className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-400 rounded-full" style={{ width: `${o.share_pct}%` }}/>
                    </div>
                    <Link href={`/admin/growth/fogging/oem/${encodeURIComponent(o.oem_canonical)}`}
                      className={`text-[11px] hover:underline w-24 truncate ${o.is_100x ? "text-blue-700 font-semibold" : "text-gray-600"}`}>
                      {o.brand_name || o.oem_canonical}
                    </Link>
                    <span className="text-[11px] text-gray-400 w-10 text-right">{o.share_pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">Key Facts</div>
            <dl className="space-y-1 text-xs">
              <div className="flex justify-between"><dt className="text-gray-500">First contract</dt><dd>{fmt(org.first_contract)}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Last contract</dt><dd>{fmt(org.last_contract)}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Avg contract value</dt><dd>{INR(org.avg_contract_value)}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Median unit price</dt><dd>{INR(org.median_unit_price)}</dd></div>
              <div className="flex justify-between"><dt className="text-gray-500">Total units</dt><dd>{org.total_units?.toLocaleString() ?? "—"}</dd></div>
              {org.dominant_mount_type && (
                <div className="flex justify-between"><dt className="text-gray-500">Preferred type</dt><dd>{org.dominant_mount_type}</dd></div>
              )}
              {org.dominant_starting_type && (
                <div className="flex justify-between"><dt className="text-gray-500">Start method</dt><dd>{org.dominant_starting_type}</dd></div>
              )}
            </dl>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="border-b border-gray-200 flex overflow-x-auto">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors
                  ${tab === t.id ? "border-indigo-600 text-indigo-700" : "border-transparent text-gray-500 hover:text-gray-800"}`}>
                {t.label}
                {t.id === "contracts" && <span className="ml-1 text-[10px] text-gray-400">({contracts.length})</span>}
              </button>
            ))}
          </div>

          <div className="p-4">

            {/* CONTRACTS TAB */}
            {tab === "contracts" && (
              <div>
                <div className="mb-3">
                  <input className="text-xs border border-gray-200 rounded px-3 py-1.5 w-56 focus:outline-none focus:ring-1 focus:ring-gray-300"
                    placeholder="Filter by GEMC, OEM, model, seller…"
                    value={contractFilter}
                    onChange={e => setContractFilter(e.target.value)}/>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wide">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold">GEMC#</th>
                        <th className="px-3 py-2 text-left font-semibold">Date</th>
                        <th className="px-3 py-2 text-left font-semibold">Dept/Branch</th>
                        <th className="px-3 py-2 text-left font-semibold">OEM</th>
                        <th className="px-3 py-2 text-left font-semibold">Model</th>
                        <th className="px-3 py-2 text-right font-semibold">Value</th>
                        <th className="px-3 py-2 text-right font-semibold">Qty</th>
                        <th className="px-3 py-2 text-right font-semibold">Unit ₹</th>
                        <th className="px-3 py-2 text-left font-semibold">Seller</th>
                        <th className="px-3 py-2 text-center font-semibold">GeM</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredContracts.slice(0, 200).map(c => (
                        <tr key={c.gemc_no} className={`hover:bg-gray-50 ${c.is_100x ? "bg-blue-50/40" : ""}`}>
                          <td className="px-3 py-2">
                            <Link href={`/admin/growth/fogging/contracts/${encodeURIComponent(c.gemc_no)}`}
                              className="font-mono text-blue-600 hover:underline text-[10px]">
                              {c.gemc_no.slice(-12)}
                            </Link>
                          </td>
                          <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{fmt(c.contract_date)}</td>
                          <td className="px-3 py-2 max-w-[120px]">
                            <Link href={`/admin/growth/fogging/buyer/${encodeURIComponent(c.buyer_canonical)}`}
                              className="text-gray-600 hover:underline truncate block text-[11px]">
                              {c.buyer_display_name?.slice(0, 25)}
                            </Link>
                          </td>
                          <td className="px-3 py-2">
                            <Link href={`/admin/growth/fogging/oem/${encodeURIComponent(c.oem_canonical)}`}
                              className={`hover:underline font-medium whitespace-nowrap ${c.is_100x ? "text-blue-700" : "text-purple-700"}`}>
                              {(c.oem_short_brand ?? c.oem_canonical).slice(0, 12)}
                            </Link>
                          </td>
                          <td className="px-3 py-2 max-w-[100px]">
                            {c.model_normalized ? (
                              <Link href={`/admin/growth/fogging/model/${encodeURIComponent(c.model_normalized)}`}
                                className="text-green-700 hover:underline truncate block">
                                {c.model_raw?.slice(0, 16) ?? c.model_normalized}
                              </Link>
                            ) : <span className="text-gray-400">{c.model_raw?.slice(0,16) ?? "—"}</span>}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold">{INR(c.contract_value_num)}</td>
                          <td className="px-3 py-2 text-right text-gray-500">{c.quantity ?? "—"}</td>
                          <td className="px-3 py-2 text-right text-green-700">{c.has_unit_price ? INR(c.unit_price) : "—"}</td>
                          <td className="px-3 py-2 max-w-[100px]">
                            {c.seller_gst ? (
                              <Link href={`/admin/growth/fogging/sellers/${encodeURIComponent(c.seller_gst)}`}
                                className="text-amber-700 hover:underline truncate block">
                                {c.seller_name?.slice(0, 16)}
                              </Link>
                            ) : <span className="text-gray-500 truncate block">{c.seller_name?.slice(0, 16)}</span>}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <a href={`https://gem.gov.in/orders/contract/${c.gemc_no}`}
                              target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-700">
                              <ExternalLink size={11}/>
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredContracts.length > 200 && (
                    <p className="text-xs text-gray-400 text-center py-2">Showing first 200 of {filteredContracts.length}</p>
                  )}
                </div>
              </div>
            )}

            {/* OEM HISTORY TAB */}
            {tab === "oems" && (
              <div className="space-y-2">
                {org.oem_breakdown.map(o => {
                  const barW = org.total_gmv ? ((o.gmv / org.total_gmv) * 100) : 0
                  return (
                    <div key={o.oem_canonical} className="flex items-center gap-3">
                      <div className="w-32 text-xs">
                        <Link href={`/admin/growth/fogging/oem/${encodeURIComponent(o.oem_canonical)}`}
                          className={`hover:underline font-medium ${o.is_100x ? "text-blue-700" : "text-purple-700"}`}>
                          {o.brand_name || o.oem_canonical}
                        </Link>
                      </div>
                      <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
                        <div className={`h-full rounded text-[10px] text-white flex items-center px-2 ${o.is_100x ? "bg-blue-500" : "bg-purple-400"}`}
                          style={{ width: `${Math.max(barW, 2)}%` }}>
                          {barW > 15 ? `${o.share_pct}%` : ""}
                        </div>
                      </div>
                      <div className="text-xs font-semibold w-20 text-right">{INR(o.gmv)}</div>
                      <div className="text-xs text-gray-400 w-16 text-right">{o.contracts} contracts</div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* SELLER HISTORY TAB */}
            {tab === "sellers" && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-500">
                    <tr>
                      <th className="px-3 py-2 text-left">Seller</th>
                      <th className="px-3 py-2 text-right">GMV</th>
                      <th className="px-3 py-2 text-right">Contracts</th>
                      <th className="px-3 py-2 text-left">GST</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {org.seller_breakdown.map(s => (
                      <tr key={s.seller_gst} className="hover:bg-gray-50">
                        <td className="px-3 py-2">
                          <Link href={`/admin/growth/fogging/sellers/${encodeURIComponent(s.seller_gst)}`}
                            className="text-amber-700 hover:underline font-medium">{s.seller_name}</Link>
                        </td>
                        <td className="px-3 py-2 text-right font-semibold">{INR(s.gmv)}</td>
                        <td className="px-3 py-2 text-right text-gray-500">{s.contracts}</td>
                        <td className="px-3 py-2 text-gray-400 font-mono text-[10px]">{s.seller_gst}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* TIMELINE TAB */}
            {tab === "timeline" && (
              <div className="space-y-1.5">
                {timeline.map(t => (
                  <div key={t.quarter} className="flex items-center gap-3">
                    <div className="w-20 text-xs text-gray-500 font-mono">{t.quarter}</div>
                    <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
                      <div className="h-full bg-indigo-400 rounded text-[10px] text-white flex items-center px-2"
                        style={{ width: `${Math.max((t.gmv / maxTimelineGmv) * 100, 2)}%` }}>
                        {(t.gmv / maxTimelineGmv) > 0.2 ? INR(t.gmv) : ""}
                      </div>
                    </div>
                    <div className="text-xs font-semibold w-16 text-right">{INR(t.gmv)}</div>
                    <div className="text-xs text-gray-400 w-16 text-right">{t.contracts} contracts</div>
                  </div>
                ))}
              </div>
            )}

            {/* SPECS TAB */}
            {tab === "specs" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(specs).map(([field, counts]) => {
                  const total = Object.values(counts).reduce((a,b) => a+b, 0)
                  return (
                    <div key={field}>
                      <h3 className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                        {field.replace(/_/g, ' ')}
                      </h3>
                      <div className="space-y-2">
                        {Object.entries(counts).sort((a,b) => b[1]-a[1]).map(([k, n]) => (
                          <div key={k} className="flex items-center gap-2">
                            <div className="flex-1 h-4 bg-gray-100 rounded overflow-hidden">
                              <div className="h-full bg-teal-400 rounded"
                                style={{ width: `${(n/total)*100}%` }}/>
                            </div>
                            <span className="text-xs text-gray-700 w-32">{k}</span>
                            <span className="text-xs text-gray-400 w-16 text-right">{n} ({((n/total)*100).toFixed(0)}%)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
                {Object.keys(specs).length === 0 && (
                  <p className="text-xs text-gray-400 col-span-2">No specification data extracted for this organization.</p>
                )}
              </div>
            )}

          </div>
        </div>

        {/* Source buyer canonicals (for merged orgs) */}
        {org.buyer_count_merged > 1 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs">
            <p className="font-medium text-amber-800 mb-1">Merged from {org.buyer_count_merged} buyer entries:</p>
            <div className="flex flex-wrap gap-2">
              {org.buyer_canonicals.map(bc => (
                <Link key={bc} href={`/admin/growth/fogging/buyer/${encodeURIComponent(bc)}`}
                  className="text-amber-700 hover:underline flex items-center gap-1">
                  {bc} <ChevronRight size={10}/>
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
