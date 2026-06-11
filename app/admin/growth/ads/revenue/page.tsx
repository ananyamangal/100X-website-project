"use client"
import { useState, useEffect, useCallback } from "react"
import { DollarSign, RotateCw, TrendingUp, Users, Target, AlertCircle, ChevronDown, ChevronUp } from "lucide-react"
import type { AttributionReport, AttributionRow, FunnelStage } from "@/lib/growth-os/revenue-attribution"

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(1)}Cr`
  if (n >= 1_00_000)    return `₹${(n / 1_00_000).toFixed(1)}L`
  if (n >= 1000)        return `₹${(n / 1000).toFixed(0)}K`
  return n > 0 ? `₹${n.toLocaleString("en-IN")}` : "—"
}
function fmtROI(roi: number) {
  const color = roi > 100 ? "text-green-600" : roi > 0 ? "text-amber-600" : "text-red-600"
  return <span className={`font-bold ${color}`}>{roi > 0 ? "+" : ""}{roi}%</span>
}

const STAGE_ORDER: FunnelStage[] = [
  "lead", "qualified_lead", "dealer_application", "oem_request",
  "tender_request", "proposal_sent", "won", "lost",
]
const STAGE_LABELS: Record<FunnelStage, string> = {
  lead:                "Lead",
  qualified_lead:      "Qualified Lead",
  dealer_application:  "Dealer Application",
  oem_request:         "OEM Request",
  tender_request:      "Tender Request",
  proposal_sent:       "Proposal Sent",
  won:                 "Won",
  lost:                "Lost",
}
const STAGE_COLORS: Record<FunnelStage, string> = {
  lead:                "bg-gray-100 text-gray-600",
  qualified_lead:      "bg-blue-100 text-blue-700",
  dealer_application:  "bg-purple-100 text-purple-700",
  oem_request:         "bg-indigo-100 text-indigo-700",
  tender_request:      "bg-violet-100 text-violet-700",
  proposal_sent:       "bg-amber-100 text-amber-700",
  won:                 "bg-green-100 text-green-700",
  lost:                "bg-red-100 text-red-600",
}

// ── Attribution table ─────────────────────────────────────────────────────────

function AttribTable({ rows, title }: { rows: AttributionRow[]; title: string }) {
  const [open, setOpen] = useState(true)
  if (!rows.length) return null
  const cols = [
    { key: "dimension",      label: title,         align: "left" },
    { key: "leads",          label: "Leads",       align: "right" },
    { key: "qualifiedLeads", label: "Qual.",        align: "right" },
    { key: "deals",          label: "Deals",       align: "right" },
    { key: "revenue",        label: "Revenue",     align: "right" },
    { key: "cost",           label: "Ad Spend",    align: "right" },
    { key: "roi",            label: "ROI",         align: "right" },
    { key: "roas",           label: "ROAS",        align: "right" },
    { key: "cpl",            label: "CPL",         align: "right" },
  ] as const

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 border-b border-gray-100 hover:bg-gray-50 transition-colors">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-gray-400">{rows.length} rows</span>
          {open ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
        </div>
      </button>
      {open && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {cols.map(c => (
                  <th key={c.key} className={`px-4 py-2.5 font-medium text-gray-400 ${c.align === "right" ? "text-right" : "text-left"}`}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.slice(0, 20).map((row, i) => (
                <tr key={i} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 text-gray-700 font-medium max-w-[200px] truncate">{row.dimension}</td>
                  <td className="px-4 py-3 text-gray-500 text-right">{row.leads}</td>
                  <td className="px-4 py-3 text-gray-500 text-right">{row.qualifiedLeads}</td>
                  <td className="px-4 py-3 text-gray-500 text-right">{row.deals}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-700">{row.revenue > 0 ? fmt(row.revenue) : "—"}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{row.cost > 0 ? fmt(row.cost) : "—"}</td>
                  <td className="px-4 py-3 text-right">{row.cost > 0 ? fmtROI(row.roi) : "—"}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{row.roas > 0 ? `${row.roas}x` : "—"}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{row.cpl > 0 ? fmt(row.cpl) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Lead update modal ─────────────────────────────────────────────────────────

interface Lead {
  leadId: string; name?: string; email?: string; phone?: string;
  product?: string; state?: string; stage: FunnelStage; revenue: number;
  keyword?: string; campaign?: string; utm?: Record<string, string>;
  createdAt: string;
}

function LeadRow({ lead, onUpdate }: { lead: Lead; onUpdate: () => void }) {
  const [editing, setEditing] = useState(false)
  const [stage, setStage]     = useState<FunnelStage>(lead.stage)
  const [revenue, setRevenue] = useState(String(lead.revenue || ""))
  const [saving, setSaving]   = useState(false)

  const save = async () => {
    setSaving(true)
    await fetch("/api/admin/growth/ads/revenue-attribution", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_stage", leadId: lead.leadId, stage, revenue: Number(revenue) || 0 }),
    })
    setSaving(false)
    setEditing(false)
    onUpdate()
  }

  return (
    <tr className="hover:bg-gray-50/50">
      <td className="px-4 py-3 text-gray-700 font-medium">
        <p>{lead.name ?? "—"}</p>
        {lead.email && <p className="text-[10px] text-gray-400 truncate max-w-[140px]">{lead.email}</p>}
      </td>
      <td className="px-4 py-3 text-gray-500 text-xs truncate max-w-[100px]">{lead.keyword ?? lead.utm?.term ?? "organic"}</td>
      <td className="px-4 py-3 text-gray-500 text-xs truncate max-w-[100px]">{lead.campaign ?? lead.utm?.campaign ?? "—"}</td>
      <td className="px-4 py-3 text-gray-500 text-xs">{lead.product ?? "—"}</td>
      <td className="px-4 py-3 text-gray-500 text-xs">{lead.state ?? "—"}</td>
      <td className="px-4 py-3">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STAGE_COLORS[lead.stage]}`}>
          {STAGE_LABELS[lead.stage]}
        </span>
      </td>
      <td className="px-4 py-3 text-right text-xs font-medium text-gray-700">
        {lead.revenue > 0 ? fmt(lead.revenue) : "—"}
      </td>
      <td className="px-4 py-3">
        {editing ? (
          <div className="flex items-center gap-1">
            <select value={stage} onChange={e => setStage(e.target.value as FunnelStage)}
              className="text-[10px] border border-gray-200 rounded px-1 py-0.5 bg-white">
              {STAGE_ORDER.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
            </select>
            {stage === "won" && (
              <input type="number" value={revenue} onChange={e => setRevenue(e.target.value)}
                className="w-20 text-[10px] border border-gray-200 rounded px-1 py-0.5" placeholder="₹ revenue" />
            )}
            <button onClick={save} disabled={saving} className="text-[10px] bg-brand-600 text-white px-2 py-0.5 rounded">
              {saving ? "…" : "Save"}
            </button>
            <button onClick={() => setEditing(false)} className="text-[10px] text-gray-400 px-1">✕</button>
          </div>
        ) : (
          <button onClick={() => setEditing(true)}
            className="text-[10px] text-gray-400 hover:text-brand-600 border border-gray-200 px-2 py-0.5 rounded hover:border-brand-300 transition-colors">
            Update
          </button>
        )}
      </td>
    </tr>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function RevenueAttributionPage() {
  const [report,   setReport]   = useState<AttributionReport | null>(null)
  const [leads,    setLeads]    = useState<Lead[]>([])
  const [loading,  setLoading]  = useState(true)
  const [syncing,  setSyncing]  = useState(false)
  const [tab,      setTab]      = useState<"funnel" | "keywords" | "campaigns" | "products" | "states" | "leads">("funnel")

  const loadReport = useCallback(async () => {
    setLoading(true)
    try {
      const [rRes, lRes] = await Promise.all([
        fetch("/api/admin/growth/ads/revenue-attribution"),
        fetch("/api/admin/growth/ads/revenue-attribution?view=leads"),
      ])
      const r = await rRes.json()
      const l = await lRes.json()
      setReport(r as AttributionReport)
      setLeads(Array.isArray(l) ? l : [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadReport() }, [loadReport])

  const sync = async () => {
    setSyncing(true)
    await fetch("/api/admin/growth/ads/revenue-attribution", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "sync" }),
    })
    setSyncing(false)
    loadReport()
  }

  const funnel = report?.funnel

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      <div className="bg-white border-b border-gray-200 px-8 py-5 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign size={18} className="text-brand-600" />
            <div>
              <h1 className="text-base font-bold text-gray-900">Revenue Attribution</h1>
              <p className="text-gray-400 text-[11px]">Keyword → Campaign → Lead → Deal → Revenue. Every recommendation prioritizes revenue, not traffic.</p>
            </div>
          </div>
          <button onClick={sync} disabled={syncing}
            className="flex items-center gap-1.5 text-xs font-medium border border-gray-200 text-gray-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50">
            <RotateCw size={12} className={syncing ? "animate-spin" : ""} />
            Sync Leads
          </button>
        </div>
      </div>

      <div className="px-8 py-6 max-w-[1400px] space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* KPI row */}
            {funnel && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <p className="text-xs text-gray-400 mb-1 flex items-center gap-1"><Users size={11} /> Total Leads</p>
                  <p className="text-3xl font-bold text-gray-900">{funnel.lead}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{funnel.won} won · {funnel.lost} lost</p>
                </div>
                <div className="bg-white rounded-xl border border-green-200 p-5 shadow-sm">
                  <p className="text-xs text-gray-400 mb-1 flex items-center gap-1"><DollarSign size={11} /> Total Revenue</p>
                  <p className="text-3xl font-bold text-green-600">{funnel.totalRevenue > 0 ? fmt(funnel.totalRevenue) : "₹0"}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">from {funnel.won} closed deals</p>
                </div>
                <div className="bg-white rounded-xl border border-amber-200 p-5 shadow-sm">
                  <p className="text-xs text-gray-400 mb-1 flex items-center gap-1"><TrendingUp size={11} /> Ad Spend</p>
                  <p className="text-3xl font-bold text-amber-600">{funnel.totalCost > 0 ? fmt(funnel.totalCost) : "—"}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">last 30 days</p>
                </div>
                <div className="bg-white rounded-xl border border-brand-200 p-5 shadow-sm">
                  <p className="text-xs text-gray-400 mb-1 flex items-center gap-1"><Target size={11} /> Blended ROI</p>
                  <p className="text-3xl font-bold text-brand-600">
                    {funnel.totalCost > 0 ? `${funnel.blendedROI > 0 ? "+" : ""}${funnel.blendedROI}%` : "—"}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">revenue vs. ad spend</p>
                </div>
              </div>
            )}

            {leads.length === 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-xs text-amber-700">
                <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold mb-1">No attribution data yet</p>
                  <p>Click "Sync Leads" to import contacts from your RFQ form. Then update lead stages manually as deals progress. Revenue attribution data will grow over time as you track outcomes.</p>
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex border-b border-gray-100 overflow-x-auto">
                {[
                  { id: "funnel",    label: "Funnel" },
                  { id: "keywords",  label: "By Keyword" },
                  { id: "campaigns", label: "By Campaign" },
                  { id: "products",  label: "By Product" },
                  { id: "states",    label: "By State" },
                  { id: "leads",     label: `Leads (${leads.length})` },
                ].map(t => (
                  <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
                    className={`text-[11px] font-medium px-4 py-3 shrink-0 border-b-2 transition-colors ${
                      tab === t.id ? "border-brand-600 text-brand-700 bg-brand-50/30" : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}>
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="p-4">
                {tab === "funnel" && funnel && (
                  <div className="space-y-2">
                    {STAGE_ORDER.filter(s => s !== "lost").map(stage => {
                      const count = funnel[stage as keyof typeof funnel] as number
                      const pct = funnel.lead > 0 ? Math.round((count / funnel.lead) * 100) : 0
                      return (
                        <div key={stage} className="flex items-center gap-3">
                          <span className={`text-[10px] font-semibold w-32 shrink-0 px-2 py-0.5 rounded-full ${STAGE_COLORS[stage]}`}>
                            {STAGE_LABELS[stage]}
                          </span>
                          <div className="flex-1 bg-gray-100 rounded-full h-4 relative">
                            <div className="h-4 rounded-full bg-brand-500 transition-all" style={{ width: `${pct}%` }} />
                            <span className="absolute left-2 top-0 leading-4 text-[10px] font-bold text-white">{count}</span>
                          </div>
                          <span className="text-[11px] text-gray-400 w-10 text-right">{pct}%</span>
                        </div>
                      )
                    })}
                    <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
                      <span className="text-[10px] font-semibold w-32 shrink-0 px-2 py-0.5 rounded-full bg-red-100 text-red-600">Lost</span>
                      <span className="text-xs text-gray-500">{funnel.lost} leads</span>
                    </div>
                  </div>
                )}

                {tab === "keywords" && report && (
                  <AttribTable rows={report.byKeyword} title="Keyword" />
                )}
                {tab === "campaigns" && report && (
                  <AttribTable rows={report.byCampaign} title="Campaign" />
                )}
                {tab === "products" && report && (
                  <AttribTable rows={report.byProduct} title="Product" />
                )}
                {tab === "states" && report && (
                  <AttribTable rows={report.byState} title="State" />
                )}

                {tab === "leads" && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          {["Name", "Keyword", "Campaign", "Product", "State", "Stage", "Revenue", ""].map(h => (
                            <th key={h} className="px-4 py-2.5 text-left font-medium text-gray-400">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {leads.slice(0, 50).map(lead => (
                          <LeadRow key={lead.leadId} lead={lead} onUpdate={loadReport} />
                        ))}
                      </tbody>
                    </table>
                    {leads.length === 0 && (
                      <p className="text-center text-xs text-gray-400 py-8">No leads yet. Click "Sync Leads" to import from RFQ form.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
