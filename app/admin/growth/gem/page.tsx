"use client"
import { ShoppingBag, TrendingUp, AlertCircle, AlertTriangle, CheckCircle2, ExternalLink } from "lucide-react"

const GEM_SEASONS = [
  { month: "Jan", demand: 40 }, { month: "Feb", demand: 45 }, { month: "Mar", demand: 60 },
  { month: "Apr", demand: 75 }, { month: "May", demand: 85 }, { month: "Jun", demand: 95 },
  { month: "Jul", demand: 100 }, { month: "Aug", demand: 100 }, { month: "Sep", demand: 90 },
  { month: "Oct", demand: 70 }, { month: "Nov", demand: 50 }, { month: "Dec", demand: 35 },
]

const GEM_SEGMENTS = [
  { segment: "Municipal Corporations / Nagar Nigams", buyers: "750+ ULBs", season: "Jun–Oct", avgOrder: "₹2–₹5L", path: "GeM direct / tender" },
  { segment: "Nagar Panchayats (small municipalities)", buyers: "3,000+ in India", season: "Jun–Sep", avgOrder: "₹40K–₹2L", path: "GeM direct purchase" },
  { segment: "NHM State Societies", buyers: "28 states + UTs", season: "Q1 & Q3", avgOrder: "₹1–₹10L", path: "GeM + state DGS&D" },
  { segment: "NVBDCP / District Health Offices", buyers: "700+ district units", season: "Pre-monsoon (Mar–May)", avgOrder: "₹50K–₹5L", path: "GeM + state health tender" },
  { segment: "Defence / Railways / PSU", buyers: "Emerging segment", season: "Year-round", avgOrder: "₹1–₹20L", path: "Central tender / GeM" },
]

const AUTH_DEMAND = [
  { state: "Uttar Pradesh", demand: "Very High", dealers: "Active", trend: "↑" },
  { state: "Bihar", demand: "High", dealers: "Active", trend: "↑" },
  { state: "Maharashtra", demand: "High", dealers: "Growing", trend: "↑" },
  { state: "Haryana", demand: "Medium", dealers: "Active", trend: "→" },
  { state: "Rajasthan", demand: "Medium", dealers: "Growing", trend: "↑" },
  { state: "West Bengal", demand: "Medium", dealers: "Few", trend: "→" },
  { state: "Karnataka", demand: "Medium", dealers: "Few", trend: "↑" },
  { state: "Tamil Nadu", demand: "Low-Medium", dealers: "None", trend: "→" },
]

export default function GeMIntelligence() {
  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      <div className="bg-white border-b border-gray-200 px-8 py-5 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <ShoppingBag size={18} className="text-brand-600" />
          <div>
            <h1 className="text-base font-bold text-gray-900">GeM Intelligence</h1>
            <p className="text-gray-400 text-[11px]">GeM procurement trends, OEM authorization demand, and dealer coverage by state</p>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 max-w-[1400px] space-y-6">
        {/* Static data notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-xs text-amber-700">
          <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <p><strong>Static intelligence.</strong> Data below is from manual research (last updated 2026-06-04). Live GeM monitoring via the GeM Opportunity Agent is on the roadmap — not yet connected.</p>
        </div>
        {/* Key facts */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "GeM Fogging Listings", value: "310+", sub: "active V2/IS 14855 listings", color: "border-brand-200 text-brand-600" },
            { label: "Peak Bid Season", value: "Jun–Oct", sub: "mosquito season peak", color: "border-amber-200 text-amber-600" },
            { label: "Avg Order Value", value: "₹40K–₹5L", sub: "per GeM order", color: "border-green-200 text-green-600" },
            { label: "MSME Preference", value: "25%", sub: "mandatory govt procurement", color: "border-blue-200 text-blue-600" },
          ].map(({ label, value, sub, color }) => (
            <div key={label} className={`bg-white rounded-xl border p-5 shadow-sm ${color.split(" ")[0]}`}>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">{label}</p>
              <p className={`text-2xl font-bold ${color.split(" ")[1]}`}>{value}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>

        {/* Seasonal demand */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp size={14} className="text-brand-600" />
            Seasonal GeM Demand Pattern
          </h3>
          <div className="flex items-end gap-1 h-20">
            {GEM_SEASONS.map(({ month, demand }) => (
              <div key={month} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full rounded-t" style={{ height: `${demand * 0.7}px`, background: demand >= 90 ? "#16a34a" : demand >= 60 ? "#84cc16" : demand >= 40 ? "#fbbf24" : "#e5e7eb" }} />
                <p className="text-[9px] text-gray-400">{month}</p>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-gray-400 mt-3">Peak season: June–October (monsoon vector control drives). Plan dealer onboarding and stock by April.</p>
        </div>

        {/* Government buyer segments */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800">Government Buyer Segments</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {["Segment", "Buyer Count", "Peak Season", "Avg Order", "Procurement Path"].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-gray-400 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {GEM_SEGMENTS.map(s => (
                  <tr key={s.segment} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-gray-700 font-medium">{s.segment}</td>
                    <td className="px-4 py-3 text-gray-500">{s.buyers}</td>
                    <td className="px-4 py-3 text-gray-500">{s.season}</td>
                    <td className="px-4 py-3 text-gray-500">{s.avgOrder}</td>
                    <td className="px-4 py-3 text-gray-500">{s.path}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Authorization demand by state */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">OEM Authorization Demand by State</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {AUTH_DEMAND.map(({ state, demand, dealers, trend }) => {
              const demandColor = demand.startsWith("Very") ? "text-red-600" : demand === "High" ? "text-orange-600" : "text-amber-600"
              return (
                <div key={state} className="bg-gray-50 rounded-xl border border-gray-100 p-3">
                  <p className="text-xs font-semibold text-gray-700 mb-1">{state} {trend}</p>
                  <p className={`text-xs font-bold ${demandColor}`}>{demand} demand</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Dealers: {dealers}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Integration */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3 text-xs text-blue-700">
          <AlertCircle size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-1">Live GeM monitoring — activate agent</p>
            <p>Go to Automation Center → GeM Opportunity Agent → Resume to start monitoring tender listings, category changes, and new buyer patterns automatically.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
