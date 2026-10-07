"use client"
import { useEffect, useState, useCallback } from "react"
import { Users, TrendingUp, Phone, Mail, Play, RotateCw, Star, Briefcase, MapPin, BarChart2, AlertCircle } from "lucide-react"

interface Lead {
  _id: string; source: string; name: string; phone: string; email: string; product: string; page: string; utm_source: string; utm_campaign: string; createdAt: string
}
interface Analytics {
  total: number; bySource: { label: string; count: number }[]; byPage: { label: string; count: number }[]; byProduct: { label: string; count: number }[]; recentLeads: Lead[]
}

interface PageCount { page: string; count: number }
interface Attribution {
  totalLeads: number
  byLandingPage: PageCount[]
  bySubmissionPage: PageCount[]
  dealerLeadsByPage: PageCount[]
  oemLeadsByPage: PageCount[]
  gemLeadsByPage: PageCount[]
  contentAssistPages: PageCount[]
  byUtmSource: PageCount[]
  sessionDepth: { one: number; two: number; threeOrMore: number }
  hasAttributionData: boolean
}

interface ScoredLead {
  _id: string; name: string; phone: string; email: string; leadType: string; leadValue: string; dealerScore: number; leadSignals: string[]; createdAt: string; source: string
}
interface LeadScores {
  totalClassified: number
  byValue: { high: number; medium: number; low: number }
  byType: Record<string, number>
  topLeads: ScoredLead[]
  lastClassifiedAt: string | null
}

const DEALER_PAGES = ["/become-a-dealer", "/dealer-application", "/gem-oem-authorization", "/gem-tender-support", "/gem-reverse-auction-fogging", "/dealers-and-government"]

const VALUE_COLOR: Record<string, string> = {
  high: "bg-green-100 text-green-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-gray-100 text-gray-500",
}

const TYPE_LABEL: Record<string, string> = {
  dealer_application: "Dealer",
  oem_authorization: "OEM Auth",
  tender_support: "Tender",
  gem_inquiry: "GeM",
  government_procurement: "Govt",
  general: "General",
}

function Pill({ c, children }: { c: string; children: React.ReactNode }) {
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${c}`}>{children}</span>
}

export default function DealerIntelligence() {
  const [data, setData] = useState<Analytics | null>(null)
  const [scores, setScores] = useState<LeadScores | null>(null)
  const [attribution, setAttribution] = useState<Attribution | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [runResult, setRunResult] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"attribution" | "scoring" | "volume">("attribution")

  const loadAll = useCallback(async () => {
    setLoading(true)
    await Promise.allSettled([
      fetch("/api/admin/lead-analytics").then(r => r.json()).then(setData),
      fetch("/api/admin/growth/lead-scores").then(r => r.json()).then(setScores),
      fetch("/api/admin/growth/attribution").then(r => r.json()).then(setAttribution),
    ])
    setLoading(false)
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  const dealerLeads = data?.recentLeads.filter(l => DEALER_PAGES.some(p => l.page?.includes(p))) || []
  const gemLeads = data?.recentLeads.filter(l => l.source === "gem_inquiry") || []
  const dealerFunnelPages = data?.byPage.filter(p => DEALER_PAGES.some(dp => p.label.includes(dp))) || []

  const runAgent = async () => {
    setRunning(true); setRunResult(null)
    try {
      const r = await fetch("/api/admin/growth/agents/dealer-lead", { method: "POST" })
      const d = await r.json()
      setRunResult(d.summary || "Done")
      await fetch("/api/admin/growth/lead-scores").then(r => r.json()).then(setScores)
    } catch { setRunResult("Error running agent") }
    setRunning(false)
  }

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      <div className="bg-white border-b border-gray-200 px-8 py-5 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Users size={18} className="text-brand-600" />
          <div>
            <h1 className="text-base font-bold text-gray-900">Dealer Acquisition Intelligence</h1>
            <p className="text-gray-400 text-[11px]">Lead scoring, dealer/OEM classification, and funnel performance</p>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 max-w-[1400px] space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Top stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Total Leads (All)", value: data?.total ?? 0, color: "border-brand-200", valColor: "text-brand-600" },
                { label: "HIGH Value Leads", value: scores?.byValue.high ?? 0, color: "border-green-200", valColor: "text-green-600" },
                { label: "GeM Inquiries", value: gemLeads.length, color: "border-blue-200", valColor: "text-blue-600" },
                { label: "Dealer Funnel Leads", value: dealerLeads.length, color: "border-amber-200", valColor: "text-amber-600" },
              ].map(({ label, value, color, valColor }) => (
                <div key={label} className={`bg-white rounded-xl border ${color} p-5 shadow-sm`}>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">{label}</p>
                  <p className={`text-3xl font-bold ${valColor}`}>{value}</p>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1 shadow-sm w-fit">
              {(["attribution", "scoring", "volume"] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`text-xs px-4 py-1.5 rounded-lg font-medium transition-colors ${activeTab === tab ? "bg-brand-600 text-white" : "text-gray-500 hover:text-gray-700"}`}>
                  {tab === "attribution" ? "Attribution" : tab === "scoring" ? "Lead Intelligence" : "Volume & Sources"}
                </button>
              ))}
            </div>

            {/* === ATTRIBUTION === */}
            {activeTab === "attribution" && (
              <div className="space-y-4">
                {!attribution?.hasAttributionData && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
                    <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-700">
                      <p className="font-semibold mb-1">Attribution data collection is now active</p>
                      <p>Existing {attribution?.totalLeads || 0} leads were submitted before attribution tracking was deployed — their landing pages are not available. New leads will include full session context: landing page, referrer, UTM params, and page count. Run the Dealer Lead Agent after a week to see attribution-enriched scoring.</p>
                    </div>
                  </div>
                )}

                {/* Q1: Which page generates the most leads? */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <h3 className="text-sm font-semibold text-gray-800 mb-1 flex items-center gap-2">
                    <MapPin size={14} className="text-brand-600" />
                    Which page generates the most leads?
                  </h3>
                  <p className="text-[11px] text-gray-400 mb-4">Ranked by landing page — the first page a visitor hit before submitting any form.</p>
                  {!attribution?.byLandingPage.length ? (
                    <p className="text-xs text-gray-400">No attribution data yet. Landing page tracking is now active — data will appear on new submissions.</p>
                  ) : (
                    <div className="space-y-2">
                      {attribution.byLandingPage.map(({ page, count }) => {
                        const max = Math.max(...attribution.byLandingPage.map(p => p.count), 1)
                        return (
                          <div key={page}>
                            <div className="flex justify-between text-xs mb-1">
                              <code className="text-gray-700 text-[11px]">{page || "(unknown)"}</code>
                              <span className="font-semibold text-gray-800">{count}</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5">
                              <div className="h-1.5 rounded-full bg-brand-500" style={{ width: `${Math.round((count / max) * 100)}%` }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Q2 + Q3 + Q4 side by side */}
                <div className="grid sm:grid-cols-3 gap-4">
                  {[
                    { title: "Dealer leads by page", data: attribution?.dealerLeadsByPage, color: "text-green-600", q: "Q2" },
                    { title: "OEM authorization leads by page", data: attribution?.oemLeadsByPage, color: "text-blue-600", q: "Q3" },
                    { title: "GeM leads by page", data: attribution?.gemLeadsByPage, color: "text-purple-600", q: "Q4" },
                  ].map(({ title, data: d, color, q }) => (
                    <div key={q} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                      <h3 className="text-xs font-semibold text-gray-800 mb-3">{title}</h3>
                      {!d?.length ? (
                        <p className="text-[11px] text-gray-400">No data yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {d.map(({ page, count }) => (
                            <div key={page} className="flex justify-between text-[11px]">
                              <code className={`${color} truncate max-w-[140px]`}>{page || "(unknown)"}</code>
                              <span className="font-semibold text-gray-700 ml-2">{count}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Q5: Content pages assisting conversions */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <h3 className="text-sm font-semibold text-gray-800 mb-1 flex items-center gap-2">
                    <BarChart2 size={14} className="text-brand-600" />
                    Which content pages assist conversions?
                  </h3>
                  <p className="text-[11px] text-gray-400 mb-4">Pages where the user entered the site, then navigated to a form on a different page. These pages generate intent even though the form submission happened elsewhere.</p>
                  {!attribution?.contentAssistPages.length ? (
                    <p className="text-xs text-gray-400">No content-assisted conversions detected yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {attribution.contentAssistPages.map(({ page, count }) => {
                        const max = Math.max(...attribution.contentAssistPages.map(p => p.count), 1)
                        return (
                          <div key={page}>
                            <div className="flex justify-between text-xs mb-1">
                              <code className="text-gray-700 text-[11px]">{page}</code>
                              <span className="font-semibold text-gray-800">{count}</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5">
                              <div className="h-1.5 rounded-full bg-purple-400" style={{ width: `${Math.round((count / max) * 100)}%` }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* UTM source + session depth */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-800 mb-4">Lead source (UTM)</h3>
                    {!attribution?.byUtmSource.length ? (
                      <p className="text-xs text-gray-400">No UTM data yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {attribution.byUtmSource.map(({ page: src, count }) => (
                          <div key={src} className="flex justify-between text-xs">
                            <span className="text-gray-600">{src}</span>
                            <span className="font-semibold text-gray-800">{count}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-800 mb-4">Session depth at submission</h3>
                    {!attribution ? (
                      <p className="text-xs text-gray-400">No data yet.</p>
                    ) : (
                      <div className="space-y-2 text-xs">
                        {[
                          { label: "1 page (direct intent)", value: attribution.sessionDepth.one },
                          { label: "2 pages", value: attribution.sessionDepth.two },
                          { label: "3+ pages (high engagement)", value: attribution.sessionDepth.threeOrMore },
                        ].map(({ label, value }) => (
                          <div key={label} className="flex justify-between">
                            <span className="text-gray-600">{label}</span>
                            <span className="font-semibold text-gray-800">{value}</span>
                          </div>
                        ))}
                        <p className="text-[10px] text-gray-300 pt-1">3+ page sessions score +1 in lead scoring.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* === LEAD INTELLIGENCE === */}
            {activeTab === "scoring" && (
              <div className="space-y-4">
                {/* Dealer Lead Agent */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800 mb-1">Dealer Lead Agent</h3>
                    <p className="text-xs text-gray-500">Reads all leads from MongoDB, scores by page context, keywords, and inquiry type. Classifies as dealer_application, oem_authorization, tender_support, gem_inquiry, or government_procurement.</p>
                    {scores?.lastClassifiedAt && (
                      <p className="text-[11px] text-gray-400 mt-1">Last run: {new Date(scores.lastClassifiedAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                    )}
                    {runResult && (
                      <p className="text-[11px] text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5 mt-2">{runResult}</p>
                    )}
                  </div>
                  <button onClick={runAgent} disabled={running}
                    className="flex items-center gap-1.5 text-xs bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 disabled:opacity-50 shrink-0">
                    {running ? <RotateCw size={12} className="animate-spin" /> : <Play size={12} />}
                    {running ? "Classifying…" : "Run now"}
                  </button>
                </div>

                {!scores || scores.totalClassified === 0 ? (
                  <div className="bg-white rounded-xl border border-dashed border-gray-200 p-10 text-center">
                    <p className="text-gray-400 text-sm">No classified leads yet — run the Dealer Lead Agent above.</p>
                  </div>
                ) : (
                  <>
                    {/* Score breakdown */}
                    <div className="grid sm:grid-cols-3 gap-4">
                      {[
                        { label: "High Value", count: scores.byValue.high, desc: "Score ≥7/10 — follow up now", color: "border-green-200", textColor: "text-green-600", bg: "bg-green-50" },
                        { label: "Medium Value", count: scores.byValue.medium, desc: "Score 5-6/10 — nurture", color: "border-amber-200", textColor: "text-amber-600", bg: "bg-amber-50" },
                        { label: "Low Value", count: scores.byValue.low, desc: "Score ≤4/10 — general inquiry", color: "border-gray-200", textColor: "text-gray-500", bg: "bg-gray-50" },
                      ].map(({ label, count, desc, color, textColor, bg }) => (
                        <div key={label} className={`bg-white rounded-xl border ${color} p-5 shadow-sm`}>
                          <p className={`text-3xl font-bold ${textColor}`}>{count}</p>
                          <p className="text-xs font-semibold text-gray-700 mt-1">{label}</p>
                          <p className="text-[11px] text-gray-400">{desc}</p>
                        </div>
                      ))}
                    </div>

                    {/* By type */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                      <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <Briefcase size={14} className="text-brand-600" />
                        Lead Type Breakdown
                      </h3>
                      <div className="space-y-2">
                        {Object.entries(scores.byType).sort((a, b) => b[1] - a[1]).map(([type, count]) => {
                          const max = Math.max(...Object.values(scores.byType), 1)
                          return (
                            <div key={type}>
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-gray-600">{TYPE_LABEL[type] || type.replace(/_/g, " ")}</span>
                                <span className="font-semibold text-gray-800">{count}</span>
                              </div>
                              <div className="w-full bg-gray-100 rounded-full h-1.5">
                                <div className="h-1.5 rounded-full bg-brand-500" style={{ width: `${Math.round((count / max) * 100)}%` }} />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Top high-value leads */}
                    {scores.topLeads.length > 0 && (
                      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                          <Star size={14} className="text-amber-500" />
                          <h3 className="text-sm font-semibold text-gray-800">High-Value Leads — Follow Up Priority</h3>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-gray-100 bg-gray-50">
                                {["Score", "Name", "Contact", "Type", "Signals", "Date"].map(h => (
                                  <th key={h} className="text-left px-4 py-2.5 text-gray-400 font-medium">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {scores.topLeads.map(l => (
                                <tr key={l._id} className="hover:bg-gray-50/50">
                                  <td className="px-4 py-2.5">
                                    <span className="text-sm font-bold text-green-600">{l.dealerScore}/10</span>
                                  </td>
                                  <td className="px-4 py-2.5 font-medium text-gray-700">{l.name || "—"}</td>
                                  <td className="px-4 py-2.5 text-gray-500">
                                    {l.phone ? (
                                      <a href={`tel:${l.phone}`} className="flex items-center gap-1 hover:text-brand-600">
                                        <Phone size={10} />{l.phone}
                                      </a>
                                    ) : l.email ? (
                                      <a href={`mailto:${l.email}`} className="flex items-center gap-1 hover:text-brand-600">
                                        <Mail size={10} />{l.email}
                                      </a>
                                    ) : "—"}
                                  </td>
                                  <td className="px-4 py-2.5">
                                    <Pill c={VALUE_COLOR[l.leadValue] || VALUE_COLOR.low}>{TYPE_LABEL[l.leadType] || l.leadType}</Pill>
                                  </td>
                                  <td className="px-4 py-2.5 text-gray-400 max-w-[200px]">
                                    <span className="text-[10px]">{(l.leadSignals || []).join(" · ")}</span>
                                  </td>
                                  <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap">
                                    {l.createdAt ? new Date(l.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* === VOLUME & SOURCES === */}
            {activeTab === "volume" && !data ? (
              <p className="text-red-500 text-sm">Failed to load analytics.</p>
            ) : activeTab === "volume" && data && (
              <div className="space-y-4">
                {/* Dealer funnel page performance */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <TrendingUp size={14} className="text-brand-600" />
                    Dealer Funnel Pages — Lead Volume
                  </h3>
                  {dealerFunnelPages.length === 0 ? (
                    <p className="text-gray-400 text-xs">No dealer funnel page leads recorded yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {dealerFunnelPages.map(({ label, count }) => {
                        const maxC = Math.max(...dealerFunnelPages.map(p => p.count), 1)
                        return (
                          <div key={label}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-gray-600 font-mono text-[11px]">{label}</span>
                              <span className="font-semibold text-gray-800">{count}</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5">
                              <div className="h-1.5 rounded-full bg-brand-500" style={{ width: `${Math.round((count / maxC) * 100)}%` }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* By source and product */}
                <div className="grid lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-800 mb-4">By Source</h3>
                    <div className="space-y-2">
                      {data.bySource.slice(0, 8).map(({ label, count }) => (
                        <div key={label} className="flex justify-between text-xs">
                          <span className="text-gray-600">{label.replace("_", " ")}</span>
                          <span className="font-semibold text-gray-800">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                    <h3 className="text-sm font-semibold text-gray-800 mb-4">By Product</h3>
                    <div className="space-y-2">
                      {data.byProduct.slice(0, 8).map(({ label, count }) => (
                        <div key={label} className="flex justify-between text-xs">
                          <span className="text-gray-600 truncate max-w-[200px]">{label || "Not specified"}</span>
                          <span className="font-semibold text-gray-800">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* All recent leads */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                  <div className="px-5 py-4 border-b border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-800">All Recent Leads</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50">
                          {["Source", "Name", "Contact", "Product / Page", "Date"].map(h => (
                            <th key={h} className="text-left px-4 py-2.5 text-gray-400 font-medium">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {data.recentLeads.slice(0, 30).map(l => (
                          <tr key={l._id} className="hover:bg-gray-50/50">
                            <td className="px-4 py-2.5"><Pill c="bg-gray-100 text-gray-600">{l.source.replace("_", " ")}</Pill></td>
                            <td className="px-4 py-2.5 font-medium text-gray-700">{l.name || "—"}</td>
                            <td className="px-4 py-2.5 text-gray-500">
                              {l.phone ? <span className="flex items-center gap-1"><Phone size={10} />{l.phone}</span> : l.email ? <span className="flex items-center gap-1"><Mail size={10} />{l.email}</span> : "—"}
                            </td>
                            <td className="px-4 py-2.5 text-gray-500 max-w-[200px] truncate">{l.product || l.page || "—"}</td>
                            <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap">
                              {l.createdAt ? new Date(l.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" }) : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
