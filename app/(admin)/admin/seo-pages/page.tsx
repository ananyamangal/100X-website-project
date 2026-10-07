/**
 * /admin/seo-pages
 *
 * Read-only dashboard showing all growth and SEO pages added by the
 * growth agent. Protected by admin cookie (same middleware as all /admin/* routes).
 * Zero interference with existing admin tabs or content.
 *
 * Access: /admin/seo-pages (while logged into admin)
 */

import Link from "next/link"

const SITE = "https://www.100xcircle.com"

const PAGES = [
  // ── Dealer Acquisition Funnel ──────────────────────────────────────────
  {
    group: "Dealer Acquisition Funnel",
    color: "blue",
    pages: [
      { path: "/become-a-dealer", title: "Become a Dealer", desc: "Dealer program landing page", priority: "0.9" },
      { path: "/dealer-application", title: "Dealer Application", desc: "Structured WhatsApp funnel — 4 dealer types", priority: "0.9" },
      { path: "/gem-oem-authorization", title: "GeM OEM Authorization", desc: "OEM auth code + letter for GeM resellers", priority: "0.9" },
      { path: "/gem-tender-support", title: "Tender Documentation Support", desc: "OEM docs for active tender bids", priority: "0.85" },
      { path: "/gem-reverse-auction-fogging", title: "GeM Reverse Auction Guide", desc: "L1 bidding strategy for dealers", priority: "0.8" },
    ],
  },
  // ── Government Procurement ─────────────────────────────────────────────
  {
    group: "Government Procurement",
    color: "green",
    pages: [
      { path: "/is-14855-fogging-machine", title: "IS 14855 Fogging Machine", desc: "BIS standard compliance + procurement docs", priority: "0.85" },
      { path: "/municipal-fogging-programme", title: "Municipal Fogging Programme", desc: "All municipal body types — procurement hub", priority: "0.85" },
      { path: "/fogging-machine-for-nagar-panchayat", title: "Nagar Panchayat Fogging Machine", desc: "Small municipality GeM direct purchase", priority: "0.85" },
      { path: "/make-in-india-fogging-machine", title: "Make in India Fogging Machine", desc: "Atmanirbhar Bharat + MSME preference", priority: "0.8" },
    ],
  },
  // ── Public Health ──────────────────────────────────────────────────────
  {
    group: "Public Health & Vector Control",
    color: "purple",
    pages: [
      { path: "/public-health-equipment", title: "Public Health Equipment", desc: "NVBDCP, NHM, hospital procurement hub", priority: "0.85" },
      { path: "/vector-control-equipment", title: "Vector Control Equipment", desc: "By disease vector — dengue/malaria/chikungunya", priority: "0.85" },
      { path: "/nvbdcp-fogging-machine", title: "NVBDCP Fogging Machine", desc: "National vector control programme", priority: "0.8" },
      { path: "/nhm-fogging-machine", title: "NHM Fogging Machine", desc: "National Health Mission procurement", priority: "0.8" },
    ],
  },
  // ── Knowledge Articles ─────────────────────────────────────────────────
  {
    group: "Knowledge Articles (New)",
    color: "orange",
    pages: [
      { path: "/knowledge/gem-oem-authorization-process", title: "GeM OEM Authorization Process Guide", desc: "Educational — feeds dealer funnel", priority: "0.8" },
      { path: "/knowledge/gem-reseller-guide", title: "GeM Reseller Guide", desc: "How to earn income selling on GeM", priority: "0.8" },
      { path: "/knowledge/fogging-machine-for-pest-control-business", title: "PCO Fogging Machine Guide", desc: "PCO buyer journey → dealer acquisition", priority: "0.75" },
    ],
  },
  // ── AI Visibility ──────────────────────────────────────────────────────
  {
    group: "AI Search Visibility Pages",
    color: "gray",
    pages: [
      { path: "/ai/dealer-authorization", title: "AI — Dealer Authorization Profile", desc: "Machine-readable for ChatGPT/Perplexity citation", priority: "0.7" },
    ],
  },
  // ── Resource Hubs ──────────────────────────────────────────────────────
  {
    group: "Resource Hubs (Frontend Navigation)",
    color: "teal",
    pages: [
      { path: "/dealers-and-government", title: "Dealers & Government Hub", desc: "Frontend hub linking all dealer + govt pages", priority: "0.8" },
    ],
  },
]

const COLOR_MAP: Record<string, string> = {
  blue: "bg-blue-50 border-blue-200 text-blue-700",
  green: "bg-green-50 border-green-200 text-green-700",
  purple: "bg-purple-50 border-purple-200 text-purple-700",
  orange: "bg-orange-50 border-orange-200 text-orange-700",
  gray: "bg-gray-100 border-gray-200 text-gray-600",
  teal: "bg-teal-50 border-teal-200 text-teal-700",
}

export default function AdminSeoPagesPage() {
  const total = PAGES.reduce((sum, g) => sum + g.pages.length, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Growth &amp; SEO Pages</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} pages added by growth agent · Read-only reference</p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin" className="text-sm text-gray-600 hover:text-gray-900 border border-gray-200 px-3 py-1.5 rounded-lg">
            ← Back to Admin
          </Link>
          <a href="/dealers-and-government" target="_blank" rel="noopener noreferrer"
            className="text-sm bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700">
            View Frontend Hub →
          </a>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Growth Pages", value: total },
            { label: "Dealer/GeM Pages", value: 5 },
            { label: "Govt/Health Pages", value: 8 },
            { label: "Knowledge Articles", value: 3 },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* How to find from frontend */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-8">
          <h2 className="font-semibold text-blue-900 mb-2">How Users Find These Pages</h2>
          <ul className="text-sm text-blue-800 space-y-1.5">
            <li>• <strong>Frontend hub:</strong> <a href={`${SITE}/dealers-and-government`} target="_blank" rel="noopener noreferrer" className="underline">/dealers-and-government</a> — links to all dealer + government pages</li>
            <li>• <strong>Footer &quot;For Dealers&quot; section:</strong> Links to 4 key dealer pages (visible sitewide)</li>
            <li>• <strong>Organic search:</strong> All pages are in sitemap and indexed</li>
            <li>• <strong>Internal links:</strong> Cross-links between related pages throughout the site</li>
            <li>• <strong>AI systems:</strong> llms.txt and /ai/dealer-authorization expose pages to ChatGPT/Perplexity</li>
          </ul>
        </div>

        {/* Page groups */}
        {PAGES.map((group) => (
          <section key={group.group} className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${COLOR_MAP[group.color]}`}>
                {group.group}
              </span>
              <span className="text-xs text-gray-400">{group.pages.length} pages</span>
            </div>
            <div className="space-y-2">
              {group.pages.map((page) => (
                <div key={page.path} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm">{page.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{page.desc}</p>
                    <code className="text-xs text-brand-600 mt-1 block">{page.path}</code>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      priority: {page.priority}
                    </span>
                    <a
                      href={`${SITE}${page.path}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 transition-colors"
                    >
                      View Live →
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

        {/* Growth opportunity files */}
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full border bg-yellow-50 border-yellow-200 text-yellow-700">
              Intelligence Files (repo)
            </span>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="font-semibold text-gray-800 text-sm">growth-opportunities.md</p>
              <p className="text-xs text-gray-500 mt-1">Keyword universe, competitor weaknesses, content gaps, AI citation gaps</p>
              <code className="text-xs text-gray-400 mt-1 block">/ (repo root)</code>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="font-semibold text-gray-800 text-sm">ads-opportunities.md</p>
              <p className="text-xs text-gray-500 mt-1">5 campaign structures, 12 ad groups, headlines, descriptions, CPCs</p>
              <code className="text-xs text-gray-400 mt-1 block">/ (repo root)</code>
            </div>
          </div>
        </section>

        <p className="text-xs text-gray-400 text-center">
          This page is for admin reference only · URL: /admin/seo-pages · Protected by admin auth
        </p>
      </div>
    </div>
  )
}
