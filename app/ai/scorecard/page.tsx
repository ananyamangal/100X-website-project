import type { Metadata } from "next"
import Link from "next/link"
import { SITE_URL } from "@/lib/seo/site-config"

export const metadata: Metadata = {
  title: "AI Citation Scorecard — 100xcircle.com | AI Readiness Audit",
  description:
    "AI citation readiness scorecard for 100xcircle.com. Scores each page on structured data, factual density, answer quality, and AI crawler accessibility.",
  alternates: { canonical: `${SITE_URL}/ai/scorecard` },
}

const PAGES = [
  {
    url: "/",
    label: "Homepage",
    scores: { structuredData: 90, factualDensity: 75, entityClarity: 95, crawlerAccess: 100, answerQuality: 70 },
    notes: "AI summary block added. JSON-LD Organization + LocalBusiness + WebSite. Improve: add FAQ schema.",
  },
  {
    url: "/ai/about-100x",
    label: "AI Company Profile",
    scores: { structuredData: 95, factualDensity: 98, entityClarity: 100, crawlerAccess: 100, answerQuality: 95 },
    notes: "Best-in-class page for company entity. All key facts, structured tables, contact info.",
  },
  {
    url: "/ai/certifications",
    label: "Certifications",
    scores: { structuredData: 90, factualDensity: 95, entityClarity: 95, crawlerAccess: 100, answerQuality: 90 },
    notes: "ItemList JSON-LD. All 5 certifications with AI summaries. Add PDF download links.",
  },
  {
    url: "/ai/factory",
    label: "Factory Profile",
    scores: { structuredData: 90, factualDensity: 92, entityClarity: 90, crawlerAccess: 100, answerQuality: 88 },
    notes: "Place + LocalBusiness schema. GPS coordinates. Add real factory photos for image evidence.",
  },
  {
    url: "/ai/product-catalog",
    label: "Product Catalog (AI)",
    scores: { structuredData: 85, factualDensity: 88, entityClarity: 88, crawlerAccess: 100, answerQuality: 85 },
    notes: "Live MongoDB fetch. CollectionPage + Product schema. Improves as more products added.",
  },
  {
    url: "/ai/government-supplies",
    label: "Government Supplies",
    scores: { structuredData: 80, factualDensity: 92, entityClarity: 90, crawlerAccess: 100, answerQuality: 90 },
    notes: "Strong factual content. Add actual GeM order numbers or purchase order references.",
  },
  {
    url: "/ai/manufacturing-capabilities",
    label: "Manufacturing Capabilities",
    scores: { structuredData: 75, factualDensity: 88, entityClarity: 85, crawlerAccess: 100, answerQuality: 85 },
    notes: "Good capability list. Add capacity metrics (units/month, production volume).",
  },
  {
    url: "/api/ai/company",
    label: "API: Company",
    scores: { structuredData: 100, factualDensity: 98, entityClarity: 100, crawlerAccess: 100, answerQuality: 98 },
    notes: "Machine-readable JSON. Primary data source for AI systems. CORS enabled.",
  },
  {
    url: "/api/ai/products",
    label: "API: Products",
    scores: { structuredData: 95, factualDensity: 90, entityClarity: 90, crawlerAccess: 100, answerQuality: 90 },
    notes: "Live product data. Add more spec fields to improve per-product detail.",
  },
  {
    url: "/api/mcp",
    label: "MCP Server",
    scores: { structuredData: 100, factualDensity: 95, entityClarity: 100, crawlerAccess: 100, answerQuality: 98 },
    notes: "JSON-RPC 2.0 compliant. 10 tools. Used by AI agents for structured queries.",
  },
  {
    url: "/llms.txt",
    label: "llms.txt",
    scores: { structuredData: 85, factualDensity: 95, entityClarity: 95, crawlerAccess: 100, answerQuality: 92 },
    notes: "AI-crawler standard file. Update with new pages as they are added.",
  },
  {
    url: "/knowledge/how-thermal-fogging-works",
    label: "How Thermal Fogging Works",
    scores: { structuredData: 90, factualDensity: 95, entityClarity: 88, crawlerAccess: 100, answerQuality: 95 },
    notes: "Article + FAQPage schema. Detailed technical content. Strong for citation.",
  },
  {
    url: "/knowledge/thermal-vs-ulv-fogging",
    label: "Thermal vs ULV Fogging",
    scores: { structuredData: 90, factualDensity: 92, entityClarity: 88, crawlerAccess: 100, answerQuality: 93 },
    notes: "14-row comparison table. FAQPage schema. High-intent query coverage.",
  },
  {
    url: "/knowledge/government-procurement-guide",
    label: "Government Procurement Guide",
    scores: { structuredData: 92, factualDensity: 90, entityClarity: 90, crawlerAccess: 100, answerQuality: 92 },
    notes: "HowTo schema (5 steps). FAQPage. Strong for procurement-intent queries.",
  },
  {
    url: "/knowledge/mosquito-control-india",
    label: "Mosquito Control India",
    scores: { structuredData: 90, factualDensity: 93, entityClarity: 88, crawlerAccess: 100, answerQuality: 93 },
    notes: "Article + FAQPage. Good for disease-control citation queries.",
  },
  {
    url: "/products/[id]",
    label: "Product Pages (each)",
    scores: { structuredData: 88, factualDensity: 80, entityClarity: 85, crawlerAccess: 100, answerQuality: 80 },
    notes: "Product + VideoObject JSON-LD. AI summary block. Improve: add spec tables to product descriptions.",
  },
  {
    url: "/compare/[slug]",
    label: "Comparison Pages (20)",
    scores: { structuredData: 88, factualDensity: 92, entityClarity: 88, crawlerAccess: 100, answerQuality: 90 },
    notes: "Article + FAQPage per page. 20 pages covering high-intent queries. Strong for 'X vs Y' citations.",
  },
  {
    url: "/case-studies",
    label: "Case Studies",
    scores: { structuredData: 82, factualDensity: 85, entityClarity: 85, crawlerAccess: 100, answerQuality: 85 },
    notes: "CollectionPage schema. Add specific order volumes, municipality names with permission.",
  },
  {
    url: "/factory",
    label: "Factory Evidence Page",
    scores: { structuredData: 88, factualDensity: 88, entityClarity: 90, crawlerAccess: 100, answerQuality: 88 },
    notes: "LocalBusiness + Place schema. GPS coordinates. Add real factory photos to complete evidence.",
  },
  {
    url: "/blog/[slug]",
    label: "Blog Posts",
    scores: { structuredData: 85, factualDensity: 65, entityClarity: 78, crawlerAccess: 100, answerQuality: 72 },
    notes: "Article JSON-LD upgraded: @id, publisher entity link, wordCount, inLanguage, isPartOf, author disambiguation. AI summary block added. Improve: factual density in articles.",
  },
]

function avg(scores: Record<string, number>): number {
  const vals = Object.values(scores)
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
}

function ScoreBar({ value }: { value: number }) {
  const color = value >= 90 ? "bg-green-500" : value >= 75 ? "bg-yellow-400" : "bg-red-400"
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
        <div className={`${color} h-1.5 rounded-full`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-mono w-7 text-right">{value}</span>
    </div>
  )
}

export default function AiScorecardPage() {
  const overallAvg = Math.round(PAGES.reduce((a, p) => a + avg(p.scores), 0) / PAGES.length)

  return (
    <main className="max-w-5xl mx-auto px-4 py-16 pt-32">
      <nav className="text-sm text-gray-500 mb-6">
        <Link href="/" className="hover:text-green-600">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/ai/about-100x" className="hover:text-green-600">AI Profile</Link>
        <span className="mx-2">/</span>
        <span>Citation Scorecard</span>
      </nav>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Citation Scorecard</h1>
      <p className="text-gray-500 text-sm mb-2">100xcircle.com — AI readiness audit. Updated May 2026.</p>

      <div className="flex items-center gap-4 mb-10">
        <div className="text-5xl font-bold text-green-600">{overallAvg}</div>
        <div>
          <p className="font-semibold text-gray-800">Overall AI Citation Score</p>
          <p className="text-sm text-gray-500">Average across {PAGES.length} page/endpoint types</p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-5 gap-2 text-xs text-gray-500 font-medium border-b border-gray-200 pb-2">
        <span>Page</span>
        <span>Structured Data</span>
        <span>Factual Density</span>
        <span>Entity Clarity</span>
        <span>Answer Quality</span>
      </div>

      <div className="space-y-4">
        {[...PAGES].sort((a, b) => avg(b.scores) - avg(a.scores)).map((page) => (
          <div key={page.url} className="border border-gray-100 rounded-lg p-4">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <Link
                  href={page.url.includes("[") ? page.url.replace(/\[.*?\]/g, "...") : page.url}
                  className="font-medium text-gray-800 hover:text-green-600 text-sm"
                >
                  {page.label}
                </Link>
                <p className="text-xs text-gray-400 font-mono">{page.url}</p>
              </div>
              <span className={`text-lg font-bold shrink-0 ${avg(page.scores) >= 90 ? "text-green-600" : avg(page.scores) >= 75 ? "text-yellow-500" : "text-red-500"}`}>
                {avg(page.scores)}
              </span>
            </div>
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 mb-2">
              {Object.entries(page.scores).map(([k, v]) => (
                <div key={k}>
                  <div className="flex justify-between text-xs text-gray-500 mb-0.5">
                    <span>{k.replace(/([A-Z])/g, " $1").trim()}</span>
                  </div>
                  <ScoreBar value={v} />
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2 italic">{page.notes}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 bg-gray-50 rounded-xl p-5 text-sm">
        <h2 className="font-semibold text-gray-800 mb-2">Score Definitions</h2>
        <dl className="grid sm:grid-cols-2 gap-2 text-xs text-gray-600">
          <div><dt className="font-medium">Structured Data</dt><dd>JSON-LD schema coverage and accuracy</dd></div>
          <div><dt className="font-medium">Factual Density</dt><dd>Volume of verifiable facts per page</dd></div>
          <div><dt className="font-medium">Entity Clarity</dt><dd>How unambiguously the page identifies its subject</dd></div>
          <div><dt className="font-medium">Crawler Access</dt><dd>Whether AI crawlers are allowed and content is accessible</dd></div>
          <div><dt className="font-medium">Answer Quality</dt><dd>How well the page directly answers likely AI queries</dd></div>
        </dl>
      </div>
    </main>
  )
}
