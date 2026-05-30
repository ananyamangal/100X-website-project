import type { Metadata } from "next"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { SITE_URL } from "@/lib/seo/site-config"

export const dynamic = "force-dynamic"
export const metadata: Metadata = { title: "AI & Search Visibility Dashboard — Admin" }

const ADMIN_COOKIE = "admin_auth"
const INDEXNOW_KEY = "a4f8c2b9e1d3f7a5b0c6e2d8f4a1b3c5"

// All indexed URL groups
const PAGE_GROUPS = [
  {
    label: "Core Pages",
    color: "bg-blue-600",
    urls: ["/", "/about", "/products", "/blog", "/contact-us", "/factory", "/case-studies"],
  },
  {
    label: "AI / GEO Pages",
    color: "bg-purple-600",
    urls: ["/ai/about-100x", "/ai/factory", "/ai/certifications", "/ai/product-catalog", "/ai/government-supplies", "/ai/manufacturing-capabilities", "/ai/scorecard", "/ai/entity-graph"],
  },
  {
    label: "Knowledge Base",
    color: "bg-teal-600",
    urls: ["/knowledge", "/knowledge/how-thermal-fogging-works", "/knowledge/thermal-vs-ulv-fogging", "/knowledge/government-procurement-guide", "/knowledge/mosquito-control-india"],
  },
  {
    label: "Comparison Pages",
    color: "bg-orange-600",
    urls: [
      "/compare", "/compare/100x-circle-vs-korean-fogging-machines", "/compare/100x-circle-vs-german-fogging-machines",
      "/compare/vehicle-mounted-vs-portable-thermal-fogger", "/compare/best-thermal-fogging-machine-for-municipal-use",
      "/compare/fogging-machine-for-dengue-control-india", "/compare/fogging-machine-price-guide-india-2026",
      "/compare/gem-fogging-machines-india", "/compare/msme-fogging-machine-manufacturers-india",
    ],
  },
  {
    label: "API / AI Endpoints",
    color: "bg-green-600",
    urls: ["/api/ai/company", "/api/ai/products", "/api/ai/certifications", "/api/ai/factory", "/api/ai/capabilities", "/api/ai/government-supplies", "/api/mcp", "/api/merchant/products.xml", "/api/indexnow"],
  },
  {
    label: "Discovery Files",
    color: "bg-gray-600",
    urls: ["/sitemap.xml", "/robots.txt", "/llms.txt", `/${INDEXNOW_KEY}.txt`],
  },
]

const CONVERSION_EVENTS = [
  { event: "whatsapp_click", description: "WhatsApp button tap", status: "active", trigger: "href contains wa.me / whatsapp" },
  { event: "phone_click", description: "Phone number tap / call click", status: "active", trigger: "href starts with tel:" },
  { event: "rfq_submit", description: "RFQ form submitted", status: "active", trigger: "RFQForm.tsx pushDataLayer" },
  { event: "brochure_download", description: "Brochure downloaded", status: "active", trigger: "BrochureThankYouTracker on /brochure-thank-you" },
  { event: "contact_form_submit", description: "Contact form submitted", status: "active", trigger: "form[id*=contact] submit listener" },
  { event: "generate_lead", description: "GA4 standard lead event", status: "active", trigger: "Fired with rfq_submit + brochure_download" },
  { event: "email_click", description: "Email address click", status: "active", trigger: "href starts with mailto:" },
  { event: "file_download", description: "PDF / file download", status: "active", trigger: "href ends with .pdf" },
  { event: "scroll_depth", description: "25/50/75/100% scroll", status: "active", trigger: "Scroll listener in layout" },
  { event: "user_engagement", description: "30s / 60s engagement", status: "active", trigger: "setTimeout in layout" },
]

const AI_CRAWLERS = [
  { name: "Googlebot", userAgent: "Googlebot", allowed: true },
  { name: "Google-Extended (Gemini)", userAgent: "Google-Extended", allowed: true },
  { name: "GPTBot (ChatGPT)", userAgent: "GPTBot", allowed: true },
  { name: "OAI-SearchBot", userAgent: "OAI-SearchBot", allowed: true },
  { name: "ChatGPT-User", userAgent: "ChatGPT-User", allowed: true },
  { name: "ClaudeBot (Anthropic)", userAgent: "ClaudeBot", allowed: true },
  { name: "Claude-User", userAgent: "Claude-User", allowed: true },
  { name: "anthropic-ai", userAgent: "anthropic-ai", allowed: true },
  { name: "PerplexityBot", userAgent: "PerplexityBot", allowed: true },
  { name: "cohere-ai", userAgent: "cohere-ai", allowed: true },
  { name: "YouBot", userAgent: "YouBot", allowed: true },
  { name: "Diffbot", userAgent: "Diffbot", allowed: true },
]

const NEXT_ACTIONS = [
  { priority: 1, action: "Verify Google Search Console ownership", detail: "GSC tokens in layout metadata. Open search.google.com/search-console and confirm both are verified.", status: "pending-verify" },
  { priority: 2, action: "Submit sitemap.xml in GSC", detail: `Submit ${SITE_URL}/sitemap.xml via GSC > Sitemaps. Confirms indexing of all 70+ pages.`, status: "pending-verify" },
  { priority: 3, action: "Submit to IndexNow", detail: `POST ${SITE_URL}/api/indexnow with header X-Admin-Secret to submit ${INDEXNOW_KEY} key. Pings Bing, Yandex, and compatible engines.`, status: "pending-action" },
  { priority: 4, action: "Register Google Merchant Center account", detail: `Upload product feed from ${SITE_URL}/api/merchant/products.xml. Category: Hardware > Sprayers. 6 products ready (Baggage Trolleys filtered out).`, status: "pending-action" },
  { priority: 5, action: "Add Google Ads conversion IDs to GTM", detail: "In GTM, create Conversion Linker tag + 5 conversion actions: whatsapp_click (AW-XXXXXXXXX/token), phone_click, rfq_submit, brochure_download, contact_form_submit. Contact Google Ads support for conversion IDs.", status: "pending-ads" },
  { priority: 6, action: "Register Bing Webmaster Tools", detail: `Go to bing.com/webmasters, add ${SITE_URL}, verify via meta tag or DNS, submit ${SITE_URL}/sitemap.xml.`, status: "pending-action" },
  { priority: 7, action: "Request indexing for new AI pages via GSC URL Inspection", detail: "In GSC > URL Inspection, manually request indexing for: /ai/about-100x, /ai/scorecard, /ai/entity-graph, /factory, /case-studies, /compare (hub), /compare/gem-fogging-machines-india, /knowledge (hub).", status: "pending-verify" },
  { priority: 8, action: "Connect GA4 property to GTM", detail: "In GTM, add GA4 Configuration tag with Measurement ID (G-XXXXXXXXX). Add triggers for custom events. Link GA4 ↔ Google Ads for smart bidding.", status: "pending-ads" },
  { priority: 9, action: "Upload factory photos", detail: "Factory page and schema reference photos that don't exist. Real factory photos dramatically improve trust signals for both AI and human visitors.", status: "content-needed" },
  { priority: 10, action: "Add GeM seller profile URL to sameAs", detail: "Replace generic gem.gov.in with your specific GeM seller profile URL (e.g. gem.gov.in/seller/...) in GlobalJsonLd.tsx sameAs array.", status: "content-needed" },
]

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    "pending-verify": "bg-yellow-100 text-yellow-800",
    "pending-action": "bg-blue-100 text-blue-800",
    "pending-ads": "bg-purple-100 text-purple-800",
    "content-needed": "bg-orange-100 text-orange-800",
  }
  const labels: Record<string, string> = {
    active: "Active",
    "pending-verify": "Verify in GSC",
    "pending-action": "Action needed",
    "pending-ads": "Needs Ads setup",
    "content-needed": "Content needed",
  }
  const cls = colors[status] ?? "bg-gray-100 text-gray-700"
  return <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{labels[status] ?? status}</span>
}

export default async function VisibilityDashboard() {
  const cookieStore = await cookies()
  const auth = cookieStore.get(ADMIN_COOKIE)
  if (!auth?.value) redirect("/admin")

  const totalPages = PAGE_GROUPS.reduce((sum, g) => sum + g.urls.length, 0)

  return (
    <main className="min-h-screen bg-gray-50 pt-28 pb-16 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <nav className="text-sm text-gray-500 mb-3">
            <Link href="/admin" className="hover:text-green-600">Admin</Link>
            <span className="mx-2">/</span>
            <span>Visibility Dashboard</span>
          </nav>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">AI &amp; Search Visibility Dashboard</h1>
          <p className="text-sm text-gray-500">Phase D audit — 100xcircle.com — Updated May 2026</p>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          {[
            { label: "Sitemap URLs", value: "70+", note: "static + dynamic", color: "text-green-600" },
            { label: "AI Crawlers Allowed", value: `${AI_CRAWLERS.length}`, note: "in robots.txt", color: "text-green-600" },
            { label: "Conversion Events", value: `${CONVERSION_EVENTS.length}`, note: "in GTM dataLayer", color: "text-blue-600" },
            { label: "AI Endpoints", value: "9", note: "/api/ai/* + /api/mcp", color: "text-purple-600" },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className={`text-3xl font-bold ${kpi.color}`}>{kpi.value}</div>
              <div className="text-sm font-medium text-gray-700 mt-1">{kpi.label}</div>
              <div className="text-xs text-gray-400">{kpi.note}</div>
            </div>
          ))}
        </div>

        {/* Top 10 actions */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Top Actions for Visibility (30 days)</h2>
          <div className="space-y-3">
            {NEXT_ACTIONS.map((a) => (
              <div key={a.priority} className="bg-white rounded-xl border border-gray-100 p-4 flex gap-4 items-start">
                <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 shrink-0">{a.priority}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-medium text-gray-800 text-sm">{a.action}</span>
                    <StatusBadge status={a.status} />
                  </div>
                  <p className="text-xs text-gray-500">{a.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Page groups */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Indexable Pages ({totalPages} URLs across {PAGE_GROUPS.length} groups)</h2>
          <div className="space-y-4">
            {PAGE_GROUPS.map((group) => (
              <div key={group.label} className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`inline-block w-2.5 h-2.5 rounded-full ${group.color}`} />
                  <span className="font-medium text-gray-700 text-sm">{group.label}</span>
                  <span className="text-xs text-gray-400 ml-auto">{group.urls.length} URLs</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {group.urls.map((url) => (
                    <a
                      key={url}
                      href={url.startsWith("/") ? `${SITE_URL}${url}` : url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-mono text-blue-600 hover:underline bg-gray-50 px-2 py-1 rounded border border-gray-100"
                    >
                      {url}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* AI crawler status */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">AI Crawler Access (robots.txt)</h2>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="grid sm:grid-cols-2 gap-2">
              {AI_CRAWLERS.map((c) => (
                <div key={c.userAgent} className="flex items-center gap-2 text-sm">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${c.allowed ? "bg-green-500" : "bg-red-500"}`} />
                  <span className="font-mono text-xs text-gray-600 w-36 shrink-0">{c.userAgent}</span>
                  <span className="text-gray-400 text-xs">{c.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Conversion tracking */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Conversion Event Tracking (GTM dataLayer)</h2>
          <div className="bg-white rounded-xl border border-gray-100 p-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                  <th className="pb-2 pr-4">Event Name</th>
                  <th className="pb-2 pr-4">Description</th>
                  <th className="pb-2">Trigger</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {CONVERSION_EVENTS.map((ev) => (
                  <tr key={ev.event}>
                    <td className="py-2 pr-4 font-mono text-xs text-green-700">{ev.event}</td>
                    <td className="py-2 pr-4 text-xs text-gray-700">{ev.description}</td>
                    <td className="py-2 text-xs text-gray-400">{ev.trigger}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Quick links */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Links</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              { label: "Google Search Console", url: "https://search.google.com/search-console", desc: "Verify & submit sitemap" },
              { label: "Bing Webmaster Tools", url: "https://www.bing.com/webmasters", desc: "Submit sitemap to Bing" },
              { label: "Google Merchant Center", url: "https://merchants.google.com", desc: "Upload product feed XML" },
              { label: "Live Sitemap", url: `${SITE_URL}/sitemap.xml`, desc: "Verify all URLs included" },
              { label: "Live robots.txt", url: `${SITE_URL}/robots.txt`, desc: "Verify AI crawler rules" },
              { label: "Live llms.txt", url: `${SITE_URL}/llms.txt`, desc: "AI-crawler company summary" },
              { label: "Product Feed XML", url: `${SITE_URL}/api/merchant/products.xml`, desc: "Google Merchant Center feed" },
              { label: "IndexNow Status", url: `${SITE_URL}/api/indexnow`, desc: "Check key + URL count" },
              { label: "AI Company API", url: `${SITE_URL}/api/ai/company`, desc: "Machine-readable company data" },
              { label: "MCP Server", url: `${SITE_URL}/api/mcp`, desc: "AI agent query endpoint" },
            ].map((l) => (
              <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer"
                className="flex items-start gap-3 bg-white rounded-xl border border-gray-100 p-3 hover:border-green-300 transition-colors">
                <div>
                  <div className="font-medium text-sm text-gray-800">{l.label}</div>
                  <div className="text-xs text-gray-400">{l.desc}</div>
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* Merchant Center readiness */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Google Merchant Center Readiness</h2>
          <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-2 text-sm">
            {[
              { item: "Product feed endpoint", value: `${SITE_URL}/api/merchant/products.xml`, ready: true },
              { item: "Feed format", value: "RSS 2.0 with g: namespace (Google standard)", ready: true },
              { item: "Products in feed", value: "6 fogging/equipment products (Baggage Trolleys filtered)", ready: true },
              { item: "Required fields", value: "id, title, description, link, image_link, availability, condition, brand", ready: true },
              { item: "Price data", value: "INR prices from DB priceRange field", ready: true },
              { item: "Country of origin", value: "India (IN)", ready: true },
              { item: "Shipping", value: "Free shipping configured (update if not accurate)", ready: false },
              { item: "Merchant Center account", value: "Not created — requires Google account login", ready: false },
              { item: "Business verification", value: "Pending — requires phone/address verification in GMC", ready: false },
            ].map((row) => (
              <div key={row.item} className="flex items-start gap-3">
                <span className={`mt-0.5 shrink-0 w-4 h-4 rounded-full text-xs flex items-center justify-center font-bold ${row.ready ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                  {row.ready ? "✓" : "!"}
                </span>
                <div>
                  <span className="font-medium text-gray-700">{row.item}:</span>{" "}
                  <span className="text-gray-500">{row.value}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
