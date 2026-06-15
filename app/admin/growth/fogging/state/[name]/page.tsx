"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { MapPin, RefreshCw } from "lucide-react"

const INR = (v: number | null | undefined) => {
  if (v == null) return "—"
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)} Cr`
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(1)} L`
  return `₹${Math.round(v).toLocaleString()}`
}

interface OemRow {
  oem_canonical: string
  brand_name:    string | null
  is_100x:       boolean
  gmv:           number
  contracts:     number
  buyer_count:   number
}
interface OrgRow {
  organization_canonical: string
  organization_name:      string
  dept_category:          string
  organization_type:      string
  organization_status:    string
  total_gmv:              number
  total_contracts:        number
  incumbent_oem_brand:    string | null
  is_100x_buyer:          boolean
}
interface DeptRow { dept_category: string; gmv: number; contracts: number; org_count: number }
interface TimelineRow { quarter: string; gmv: number; contracts: number }

interface StateSummary {
  total_gmv:       number
  total_contracts: number
  total_units:     number
  org_count:       number
  oem_count:       number
  seller_count:    number
  model_count:     number
  buyer_count:     number
  first_contract:  string | null
  last_contract:   string | null
}

type Tab = "organizations" | "oems" | "departments" | "timeline"

export default function StatePage({ params }: { params: { name: string } }) {
  const stateName = decodeURIComponent(params.name)
  const [summary,   setSummary]   = useState<StateSummary | null>(null)
  const [orgs,      setOrgs]      = useState<OrgRow[]>([])
  const [oems,      setOems]      = useState<OemRow[]>([])
  const [depts,     setDepts]     = useState<DeptRow[]>([])
  const [timeline,  setTimeline]  = useState<TimelineRow[]>([])
  const [loading,   setLoading]   = useState(true)
  const [tab,       setTab]       = useState<Tab>("organizations")

  useEffect(() => {
    setLoading(true)
    fetch(`/api/fogging/state/${encodeURIComponent(stateName)}`)
      .then(r => r.json())
      .then(d => {
        setSummary(d.summary)
        setOrgs(d.organizations ?? [])
        setOems(d.oem_breakdown ?? [])
        setDepts(d.dept_breakdown ?? [])
        setTimeline(d.timeline ?? [])
      })
      .finally(() => setLoading(false))
  }, [stateName])

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <RefreshCw size={24} className="animate-spin text-gray-400"/>
    </div>
  )

  const maxOemGmv      = Math.max(...oems.map(o => o.gmv), 1)
  const maxTimelineGmv = Math.max(...timeline.map(t => t.gmv), 1)
  const totalOrgGmv    = orgs.reduce((s, o) => s + o.total_gmv, 0)

  const TABS = [
    { id: "organizations" as Tab, label: `Organizations (${orgs.length})` },
    { id: "oems"          as Tab, label: `OEMs (${oems.length})` },
    { id: "departments"   as Tab, label: "By Category" },
    { id: "timeline"      as Tab, label: "Timeline" },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-screen-xl mx-auto px-4 py-3">
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
            <Link href="/admin/growth/fogging" className="hover:text-gray-700">Fogging Intelligence</Link>
            <span>/</span>
            <Link href="/admin/growth/fogging/organizations" className="hover:text-gray-700">Organizations</Link>
            <span>/</span>
            <span className="text-gray-800">{stateName}</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <MapPin size={20} className="text-rose-500 shrink-0"/>
            {stateName}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">State procurement intelligence — fogging machines</p>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 py-4 space-y-4">

        {/* KPI strip */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {[
              { label: "GMV",         value: INR(summary.total_gmv),           color: "text-rose-600" },
              { label: "Contracts",   value: summary.total_contracts,           color: "" },
              { label: "Orgs",        value: summary.org_count,                 color: "" },
              { label: "OEMs",        value: summary.oem_count,                 color: "" },
              { label: "Sellers",     value: summary.seller_count,              color: "" },
              { label: "Models",      value: summary.model_count,               color: "" },
              { label: "Buyer Depts", value: summary.buyer_count,               color: "" },
              { label: "Units",       value: summary.total_units?.toLocaleString() || "—", color: "" },
            ].map(k => (
              <div key={k.label} className="bg-white border border-gray-200 rounded-lg p-3">
                <div className="text-[10px] text-gray-400 uppercase tracking-wide">{k.label}</div>
                <div className={`text-base font-bold ${k.color}`}>{k.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="border-b border-gray-200 flex overflow-x-auto">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors
                  ${tab === t.id ? "border-rose-500 text-rose-700" : "border-transparent text-gray-500 hover:text-gray-800"}`}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-4">

            {/* ORGANIZATIONS */}
            {tab === "organizations" && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wide">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Organization</th>
                      <th className="px-3 py-2 text-left font-semibold">Category</th>
                      <th className="px-3 py-2 text-left font-semibold">Type</th>
                      <th className="px-3 py-2 text-right font-semibold">GMV</th>
                      <th className="px-3 py-2 text-right font-semibold">Contracts</th>
                      <th className="px-3 py-2 text-left font-semibold">Incumbent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {orgs.map(o => (
                      <tr key={o.organization_canonical} className={`hover:bg-gray-50 ${o.is_100x_buyer ? "bg-blue-50/30" : ""}`}>
                        <td className="px-3 py-2 max-w-[200px]">
                          <Link href={`/admin/growth/fogging/organizations/${encodeURIComponent(o.organization_canonical)}`}
                            className="font-medium text-indigo-700 hover:underline block truncate">
                            {o.organization_name}
                          </Link>
                        </td>
                        <td className="px-3 py-2 text-gray-500">{o.dept_category}</td>
                        <td className="px-3 py-2 text-gray-400">{o.organization_type}</td>
                        <td className="px-3 py-2 text-right font-semibold">
                          <div>{INR(o.total_gmv)}</div>
                          <div className="h-1 bg-gray-100 rounded-full overflow-hidden mt-1">
                            <div className="h-full bg-rose-300 rounded-full"
                              style={{ width: `${(o.total_gmv / totalOrgGmv) * 100}%` }}/>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right text-gray-500">{o.total_contracts}</td>
                        <td className="px-3 py-2">
                          {o.incumbent_oem_brand ? (
                            <span className="text-purple-700 text-[11px]">{o.incumbent_oem_brand}</span>
                          ) : o.is_100x_buyer ? (
                            <span className="text-[10px] bg-blue-100 text-blue-700 px-1 rounded">100X</span>
                          ) : <span className="text-gray-400">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* OEM BREAKDOWN */}
            {tab === "oems" && (
              <div className="space-y-2">
                {oems.map(o => (
                  <div key={o.oem_canonical} className="flex items-center gap-3">
                    <div className="w-28 text-xs">
                      <Link href={`/admin/growth/fogging/oem/${encodeURIComponent(o.oem_canonical)}`}
                        className={`hover:underline font-medium ${o.is_100x ? "text-blue-700" : "text-purple-700"}`}>
                        {o.brand_name || o.oem_canonical}
                      </Link>
                    </div>
                    <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
                      <div className={`h-full rounded text-[10px] text-white flex items-center px-2 ${o.is_100x ? "bg-blue-500" : "bg-purple-400"}`}
                        style={{ width: `${Math.max((o.gmv / maxOemGmv) * 100, 2)}%` }}>
                        {(o.gmv / maxOemGmv) > 0.2 ? INR(o.gmv) : ""}
                      </div>
                    </div>
                    <div className="text-xs font-semibold w-20 text-right">{INR(o.gmv)}</div>
                    <div className="text-xs text-gray-400 w-20 text-right">{o.contracts} contracts</div>
                    <div className="text-xs text-gray-400 w-16 text-right">{o.buyer_count} orgs</div>
                  </div>
                ))}
              </div>
            )}

            {/* DEPT BREAKDOWN */}
            {tab === "departments" && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wide">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Department Category</th>
                      <th className="px-3 py-2 text-right font-semibold">Organizations</th>
                      <th className="px-3 py-2 text-right font-semibold">Contracts</th>
                      <th className="px-3 py-2 text-right font-semibold">GMV</th>
                      <th className="px-3 py-2 text-left font-semibold">Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {depts.map(d => {
                      const totalGmv = summary?.total_gmv || 1
                      return (
                        <tr key={d.dept_category} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium text-gray-700">{d.dept_category}</td>
                          <td className="px-3 py-2 text-right text-gray-500">{d.org_count}</td>
                          <td className="px-3 py-2 text-right text-gray-500">{d.contracts}</td>
                          <td className="px-3 py-2 text-right font-semibold">{INR(d.gmv)}</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-400 rounded-full"
                                  style={{ width: `${(d.gmv / totalGmv) * 100}%` }}/>
                              </div>
                              <span className="text-gray-400">{((d.gmv / totalGmv) * 100).toFixed(1)}%</span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* TIMELINE */}
            {tab === "timeline" && (
              <div className="space-y-1.5">
                {timeline.map(t => (
                  <div key={t.quarter} className="flex items-center gap-3">
                    <div className="w-20 text-xs text-gray-500 font-mono">{t.quarter}</div>
                    <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
                      <div className="h-full bg-rose-400 rounded text-[10px] text-white flex items-center px-2"
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

          </div>
        </div>

      </div>
    </div>
  )
}
