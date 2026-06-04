"use client"
import { Megaphone, TrendingUp, AlertCircle, Download, ExternalLink } from "lucide-react"

const CAMPAIGNS = [
  { id: "1A", name: "GeM Dealer — OEM Authorization", budget: "₹500–₹1,000/day", leadQuality: "VERY HIGH", keywords: ["GeM OEM authorization fogging machine", "OEM authorization letter GeM India"], landing: "/gem-oem-authorization", angle: "Speed + zero cost: 'Get your OEM code in 2–5 days. No fee.'", negatives: "jobs, salary, career, price, free download", status: "draft" },
  { id: "1B", name: "GeM Dealer — Dealer Program", budget: "₹300–₹600/day", leadQuality: "HIGH", keywords: ["become fogging machine dealer India", "fogging machine dealer program"], landing: "/become-a-dealer", angle: "Low barrier + govt revenue: 'Join 50+ dealers. No fee.'", negatives: "wholesale, cheap, price, cost, import, job", status: "draft" },
  { id: "1C", name: "GeM Dealer — Reverse Auction", budget: "₹200–₹400/day", leadQuality: "VERY HIGH", keywords: ["GeM reverse auction fogging machine", "L1 price fogging machine GeM"], landing: "/gem-reverse-auction-fogging", angle: "L1 support: 'We back your bid. Win more GeM RAs.'", negatives: "retail, consumer, household, buy cheap", status: "draft" },
  { id: "2A", name: "Municipal — IS 14855 Tender", budget: "₹200–₹400/day", leadQuality: "HIGH", keywords: ["IS 14855 fogging machine", "IS 14855 Part 1 thermal fogger"], landing: "/is-14855-fogging-machine", angle: "Compliance proof: 'IS 14855 certified. Full tender docs ready.'", negatives: "price, cheap, used, second hand, repair", status: "draft" },
  { id: "2B", name: "Municipal — Nagar Nigam", budget: "₹200–₹400/day", leadQuality: "HIGH", keywords: ["fogging machine for municipal corporation", "Nagar Nigam fogging machine"], landing: "/municipal-fogging-programme", angle: "Direct procurement: 'GeM direct purchase. No separate tender below threshold.'", negatives: "hire, rent, maintenance, repair", status: "draft" },
  { id: "2C", name: "Municipal — Nagar Panchayat", budget: "₹100–₹200/day", leadQuality: "HIGH", keywords: ["fogging machine for Nagar Panchayat", "small municipality fogging GeM"], landing: "/fogging-machine-for-nagar-panchayat", angle: "Simplicity: 'No tender required below GeM limit.'", negatives: "hire, rental, vehicle mounted, city corporation", status: "draft" },
  { id: "2D", name: "Health — NHM Procurement", budget: "₹100–₹200/day", leadQuality: "HIGH", keywords: ["NHM fogging machine", "national health mission vector control equipment"], landing: "/nhm-fogging-machine", angle: "Programme fit: 'NHM flexible pool eligible. IS 14855 compliant.'", negatives: "private, household, farm, agriculture, rental", status: "draft" },
  { id: "4A", name: "Tender Support — Urgent Docs", budget: "₹150–₹300/day", leadQuality: "VERY HIGH", keywords: ["fogging machine OEM authorization letter tender", "tender support fogging machine OEM India"], landing: "/gem-tender-support", angle: "Same-day urgency: 'Tender deadline today? Letter issued same day.'", negatives: "free template, generic, draft, self-issue", status: "draft" },
  { id: "5A", name: "Make in India Brand", budget: "₹100–₹200/day", leadQuality: "HIGH", keywords: ["Make in India fogging machine", "Atmanirbhar fogging machine India"], landing: "/make-in-india-fogging-machine", angle: "Policy compliance: 'Indian OEM. MSME preference applies.'", negatives: "import, Korean, German, Chinese, rental, used", status: "draft" },
]

const TOTAL_BUDGET_MIN = CAMPAIGNS.reduce((s, c) => s + parseInt(c.budget.replace(/[^\d]/g, "").slice(0, 3)), 0)
const TOTAL_BUDGET_MAX = CAMPAIGNS.reduce((s, c) => s + parseInt(c.budget.replace(/[^\d–]/g, "").split("").slice(-3).join("")), 0)

const QUALITY_COLOR: Record<string, string> = {
  "VERY HIGH": "bg-red-100 text-red-700",
  "HIGH": "bg-orange-100 text-orange-700",
  "MEDIUM": "bg-amber-100 text-amber-700",
}

function Pill({ c, children }: { c: string; children: React.ReactNode }) {
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${c}`}>{children}</span>
}

export default function AdsIntelligence() {
  const exportCSV = () => {
    const rows = [
      ["Campaign ID", "Campaign Name", "Budget", "Lead Quality", "Keywords", "Landing Page", "Ad Angle", "Negative Keywords"],
      ...CAMPAIGNS.map(c => [c.id, c.name, c.budget, c.leadQuality, c.keywords.join(" | "), c.landing, c.angle, c.negatives]),
    ]
    const csv = rows.map(r => r.map(f => `"${f}"`).join(",")).join("\n")
    const a = document.createElement("a")
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }))
    a.download = "100x-google-ads-campaigns.csv"
    a.click()
  }

  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      <div className="bg-white border-b border-gray-200 px-8 py-5 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Megaphone size={18} className="text-brand-600" />
            <div>
              <h1 className="text-base font-bold text-gray-900">Google Ads Intelligence</h1>
              <p className="text-gray-400 text-[11px]">Campaign recommendations — approved by management before launch</p>
            </div>
          </div>
          <button onClick={exportCSV} className="flex items-center gap-1.5 text-xs border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
            <Download size={13} /> Export CSV
          </button>
        </div>
      </div>

      <div className="px-8 py-6 max-w-[1400px] space-y-6">
        {/* Hard rule */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3 text-xs text-red-700">
          <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p><strong>NO automatic spend.</strong> No campaign launches without explicit management approval. No budget increases, decreases, or bid changes without approval. Growth OS may recommend, draft, and simulate — never spend.</p>
        </div>

        {/* Budget summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-gray-900">{CAMPAIGNS.length}</p>
            <p className="text-xs text-gray-400 mt-0.5">Campaign Drafts</p>
          </div>
          <div className="bg-white rounded-xl border border-amber-200 p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-amber-600">₹{TOTAL_BUDGET_MIN.toLocaleString("en-IN")}+</p>
            <p className="text-xs text-gray-400 mt-0.5">Min. Daily Budget</p>
          </div>
          <div className="bg-white rounded-xl border border-green-200 p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-green-600">4</p>
            <p className="text-xs text-gray-400 mt-0.5">VERY HIGH Lead Quality</p>
          </div>
        </div>

        {/* Launch sequence */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <TrendingUp size={14} className="text-brand-600" />
            Recommended Launch Sequence
          </h3>
          <div className="grid sm:grid-cols-3 gap-4 text-xs">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="font-semibold text-green-700 mb-1">Week 1 — Start here</p>
              <p className="text-green-600">1A (OEM Auth) + 4A (Tender Support)</p>
              <p className="text-green-500 text-[10px] mt-1">Lowest volume, highest intent, quickest ROI</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="font-semibold text-amber-700 mb-1">Week 2 — Expand dealer</p>
              <p className="text-amber-600">1B (Dealer Program) + 2A (IS 14855)</p>
              <p className="text-amber-500 text-[10px] mt-1">Broaden dealer funnel + compliance buyers</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="font-semibold text-blue-700 mb-1">Month 2 — Full rollout</p>
              <p className="text-blue-600">2B, 2C, 2D, 5A + Remarketing</p>
              <p className="text-blue-500 text-[10px] mt-1">Municipal + NHM + Make in India</p>
            </div>
          </div>
        </div>

        {/* Campaign table */}
        <div className="space-y-3">
          {CAMPAIGNS.map(c => (
            <div key={c.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-[11px] font-bold bg-gray-900 text-white px-2 py-0.5 rounded-full">{c.id}</span>
                    <h3 className="text-sm font-semibold text-gray-800">{c.name}</h3>
                    <Pill c={QUALITY_COLOR[c.leadQuality] || "bg-gray-100 text-gray-600"}>{c.leadQuality} lead quality</Pill>
                    <Pill c="bg-gray-100 text-gray-500">draft</Pill>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-[11px] mb-2">
                    <div><span className="text-gray-400">Budget: </span><span className="font-medium text-gray-700">{c.budget}</span></div>
                    <div><span className="text-gray-400">Landing: </span><code className="text-brand-600">{c.landing}</code></div>
                    <div className="col-span-2"><span className="text-gray-400">Ad angle: </span><span className="text-gray-700">{c.angle}</span></div>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-1.5">
                    {c.keywords.map(k => <code key={k} className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{k}</code>)}
                  </div>
                  <p className="text-[10px] text-gray-400">Negatives: {c.negatives}</p>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <a href={`https://www.100xcircle.com${c.landing}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[11px] border border-gray-200 text-gray-500 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                    <ExternalLink size={10} /> Preview
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
