"use client"
import { Search, Link2, AlertCircle, TrendingUp, TrendingDown, Minus, ExternalLink } from "lucide-react"

const TRACKED_PAGES = [
  { url: "/gem-oem-authorization", intent: "Dealer — OEM auth", priority: 0.9 },
  { url: "/become-a-dealer", intent: "Dealer — program overview", priority: 0.9 },
  { url: "/gem-tender-support", intent: "Tender — urgent docs", priority: 0.85 },
  { url: "/is-14855-fogging-machine", intent: "Compliance — BIS standard", priority: 0.85 },
  { url: "/municipal-fogging-programme", intent: "Municipal — procurement", priority: 0.85 },
  { url: "/nhm-fogging-machine", intent: "Health — NHM procurement", priority: 0.85 },
  { url: "/nvbdcp-fogging-machine", intent: "Health — NVBDCP", priority: 0.80 },
  { url: "/vector-control-equipment", intent: "Health — vector control", priority: 0.85 },
  { url: "/fogging-machine-for-nagar-panchayat", intent: "Municipal — small body", priority: 0.85 },
  { url: "/gem-reverse-auction-fogging", intent: "Dealer — GeM RA bidding", priority: 0.80 },
  { url: "/make-in-india-fogging-machine", intent: "Govt — Atmanirbhar", priority: 0.80 },
  { url: "/dealers-and-government", intent: "Hub — dealer + govt", priority: 0.85 },
  { url: "/public-health-equipment", intent: "Health — general hub", priority: 0.85 },
  { url: "/dealer-application", intent: "Dealer — apply now", priority: 0.90 },
]

const CANNIBALIZATION = [
  { page1: "/gem-oem-authorization", page2: "/knowledge/gem-oem-authorization-process", risk: "HIGH", action: "Canonicalize knowledge article to main page" },
  { page1: "/nhm-fogging-machine", page2: "/nvbdcp-fogging-machine", risk: "MEDIUM", action: "Differentiate by programme name in title/H1; monitor GSC" },
  { page1: "/vector-control-equipment", page2: "/public-health-equipment", risk: "LOW", action: "Keep — public health is intentionally broader hub" },
]

function RiskBadge({ risk }: { risk: string }) {
  const c: Record<string, string> = { HIGH: "bg-red-100 text-red-700", MEDIUM: "bg-amber-100 text-amber-700", LOW: "bg-green-100 text-green-700" }
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${c[risk] || c.LOW}`}>{risk}</span>
}

export default function SEOCommandCenter() {
  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      <div className="bg-white border-b border-gray-200 px-8 py-5 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Search size={18} className="text-brand-600" />
          <div>
            <h1 className="text-base font-bold text-gray-900">SEO Command Center</h1>
            <p className="text-gray-400 text-[11px]">Rankings, impressions, CTR — connect Google Search Console for live data</p>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 max-w-[1400px] space-y-6">
        {/* GSC Connect */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-800 mb-1">Google Search Console Integration</h3>
              <p className="text-xs text-gray-500 mb-4">Connect GSC to see keyword rankings, impressions, clicks, and CTR for every tracked page. Unlocks the Keyword Intelligence and Page Performance sections below.</p>
              <div className="flex gap-3">
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-500 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-gray-300" />
                  Not connected
                </div>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700 max-w-[300px]">
              <p className="font-semibold mb-1">To connect:</p>
              <ol className="space-y-0.5 text-amber-600">
                <li>1. Create Google Cloud project</li>
                <li>2. Enable Search Console API</li>
                <li>3. Create service account key</li>
                <li>4. Add key to GOOGLE_SC_KEY env var</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Cannibalization risks */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800 mb-1 flex items-center gap-2">
            <AlertCircle size={14} className="text-amber-500" />
            Cannibalization Risks
          </h3>
          <p className="text-xs text-gray-400 mb-4">Pages competing for the same search queries. Monitor in GSC — act if one page consistently outranks the other.</p>
          <div className="space-y-3">
            {CANNIBALIZATION.map(({ page1, page2, risk, action }) => (
              <div key={page1} className="border border-gray-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <code className="text-[11px] bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">{page1}</code>
                      <Minus size={10} className="text-gray-300" />
                      <code className="text-[11px] bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">{page2}</code>
                      <RiskBadge risk={risk} />
                    </div>
                    <p className="text-xs text-gray-500">{action}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tracked pages */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">Tracked Pages ({TRACKED_PAGES.length})</h3>
            <span className="text-xs text-gray-400">Ranking data available after GSC connection</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {["URL", "Intent", "Priority", "Position", "Impressions", "CTR", "Trend"].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-gray-400 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {TRACKED_PAGES.map(p => (
                  <tr key={p.url} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <code className="text-[11px] text-gray-700">{p.url}</code>
                        <a href={`https://www.100xcircle.com${p.url}`} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-brand-500">
                          <ExternalLink size={10} />
                        </a>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{p.intent}</td>
                    <td className="px-4 py-3 text-gray-500">{p.priority}</td>
                    <td className="px-4 py-3 text-gray-300">—</td>
                    <td className="px-4 py-3 text-gray-300">—</td>
                    <td className="px-4 py-3 text-gray-300">—</td>
                    <td className="px-4 py-3 text-gray-300"><Minus size={12} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Internal linking inventory */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Link2 size={14} className="text-brand-600" />
            Internal Link Health
          </h3>
          <div className="grid sm:grid-cols-3 gap-4 text-xs">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="font-semibold text-green-700 mb-1">Strong</p>
              <ul className="text-green-600 space-y-0.5">
                <li>/gem-oem-authorization → 4+ inbound</li>
                <li>/become-a-dealer → 3+ inbound</li>
                <li>/is-14855-fogging-machine → 3+ inbound</li>
              </ul>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="font-semibold text-amber-700 mb-1">Needs attention</p>
              <ul className="text-amber-600 space-y-0.5">
                <li>/make-in-india-fogging-machine → 1 inbound</li>
                <li>/gem-reverse-auction-fogging → 1 inbound</li>
                <li>/ai/dealer-authorization → 1 inbound</li>
              </ul>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="font-semibold text-blue-700 mb-1">Run agent</p>
              <p className="text-blue-600">Use Internal Link Agent in Automation Center to auto-discover linking opportunities across all pages.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
