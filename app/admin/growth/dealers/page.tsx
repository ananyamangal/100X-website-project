"use client"
import { useEffect, useState } from "react"
import { Users, TrendingUp, MapPin, Briefcase, Phone, Mail } from "lucide-react"

interface Lead {
  _id: string; source: string; name: string; phone: string; email: string; product: string; page: string; utm_source: string; utm_campaign: string; createdAt: string
}
interface Analytics {
  total: number; bySource: { label: string; count: number }[]; byPage: { label: string; count: number }[]; byProduct: { label: string; count: number }[]; byUtmSource: { label: string; count: number }[]; byDate: { date: string; count: number }[]; recentLeads: Lead[]
}

const DEALER_PAGES = ["/become-a-dealer", "/dealer-application", "/gem-oem-authorization", "/gem-tender-support", "/gem-reverse-auction-fogging", "/dealers-and-government"]

function Pill({ c, children }: { c: string; children: React.ReactNode }) {
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${c}`}>{children}</span>
}

export default function DealerIntelligence() {
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/admin/lead-analytics")
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const dealerLeads = data?.recentLeads.filter(l => DEALER_PAGES.some(p => l.page?.includes(p))) || []
  const gemLeads = data?.recentLeads.filter(l => l.source === "gem_inquiry") || []
  const dealerFunnelPages = data?.byPage.filter(p => DEALER_PAGES.some(dp => p.label.includes(dp))) || []

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      <div className="bg-white border-b border-gray-200 px-8 py-5 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Users size={18} className="text-brand-600" />
          <div>
            <h1 className="text-base font-bold text-gray-900">Dealer Acquisition Intelligence</h1>
            <p className="text-gray-400 text-[11px]">Track dealer leads, applications, and funnel performance</p>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 max-w-[1400px] space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !data ? (
          <p className="text-red-500 text-sm">Failed to load.</p>
        ) : (
          <>
            {/* Top stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Total Leads (All)", value: data.total, color: "border-brand-200", valColor: "text-brand-600" },
                { label: "Dealer Funnel Leads", value: dealerLeads.length, color: "border-green-200", valColor: "text-green-600" },
                { label: "GeM Inquiries", value: gemLeads.length, color: "border-blue-200", valColor: "text-blue-600" },
                { label: "Dealer Pages (All Time)", value: dealerFunnelPages.reduce((s, p) => s + p.count, 0), color: "border-amber-200", valColor: "text-amber-600" },
              ].map(({ label, value, color, valColor }) => (
                <div key={label} className={`bg-white rounded-xl border ${color} p-5 shadow-sm`}>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">{label}</p>
                  <p className={`text-3xl font-bold ${valColor}`}>{value}</p>
                </div>
              ))}
            </div>

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

            {/* Lead source breakdown */}
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

            {/* Integration gaps */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-700">
              <p className="font-semibold mb-1">Intelligence gaps — connect for full visibility</p>
              <ul className="space-y-1 text-blue-600">
                <li>• WhatsApp lead attribution — track WA button clicks per page via GTM</li>
                <li>• Dealer type segmentation — add dealer_type field to application form</li>
                <li>• State segmentation — collect state in dealer application</li>
                <li>• Conversion rates — connect to CRM when available</li>
              </ul>
            </div>

            {/* Recent dealer leads */}
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
          </>
        )}
      </div>
    </div>
  )
}
