"use client"
import Link from "next/link"
import { TrendingUp, AlertCircle, Link2, ExternalLink, CheckCircle2, Circle, ArrowRight } from "lucide-react"

const LIVE_MODULES = [
  {
    title: "Google Ads Dashboard",
    desc: "Live campaign metrics, spend, impressions, clicks, conversions",
    href: "/admin/growth/ads/dashboard",
    status: "live",
  },
  {
    title: "Campaign Factory",
    desc: "AI-generated campaign plans — creates drafts for your approval",
    href: "/admin/growth/ads/campaign-factory",
    status: "live",
  },
  {
    title: "Approval Queue",
    desc: "Review and approve/reject campaigns before any spend is committed",
    href: "/admin/growth/ads/approval-queue",
    status: "live",
  },
  {
    title: "Ads Director",
    desc: "Read-only recommendations — negative keywords, high-CPC, new opportunities",
    href: "/admin/growth/ads/director",
    status: "live",
  },
  {
    title: "Market Intelligence Director",
    desc: "What to sell, where to sell, who to target, which campaign needs budget — Claude-powered analysis of leads + ads + search",
    href: "/admin/growth/market-intelligence",
    status: "live",
  },
  {
    title: "Creative Director",
    desc: "AI-generated RSA headlines, descriptions, callouts, sitelinks, image concepts — scored across 8 frameworks",
    href: "/admin/growth/ads/creative-director",
    status: "live",
  },
  {
    title: "Revenue Attribution",
    desc: "Keyword → Campaign → Lead → Deal → Revenue. ROI, ROAS, payback period per keyword",
    href: "/admin/growth/ads/revenue",
    status: "live",
  },
  {
    title: "Off-Page SEO Director",
    desc: "Backlink opportunities, outreach emails, citation building — GeM, government, MSME verticals",
    href: "/admin/growth/seo/offpage",
    status: "live",
  },
  {
    title: "Launch Checklist",
    desc: "Step-by-step readiness check before enabling live campaigns",
    href: "/admin/growth/launch",
    status: "live",
  },
  {
    title: "SEO Command Center",
    desc: "GSC rankings, near-wins, CTR gaps, trend analysis",
    href: "/admin/growth/seo",
    status: "live",
  },
  {
    title: "GEO / AI Visibility",
    desc: "Track whether 100X Circle appears in ChatGPT, Perplexity, Gemini answers",
    href: "/admin/growth/geo",
    status: "live",
  },
]

const ROADMAP = [
  { title: "SEO ↔ Ads Feedback Loop API", desc: "High-converting GSC keywords auto-create Ads opportunities; high-converting search terms auto-create SEO content opportunities.", status: "roadmap" },
  { title: "GA4 Keyword Attribution", desc: "Per-keyword conversion tracking in GA4 — answer 'which keyword drives dealer leads?'", status: "roadmap" },
  { title: "Metadata Optimizer Agent", desc: "Auto-detect low-CTR pages in GSC and recommend title/description improvements.", status: "roadmap" },
  { title: "Content Brief Agent", desc: "Auto-generate briefs from approved SEO opportunities into Content Factory.", status: "roadmap" },
]

export default function PaidGrowthCenter() {
  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      <div className="bg-white border-b border-gray-200 px-8 py-5 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <TrendingUp size={18} className="text-brand-600" />
          <div>
            <h1 className="text-base font-bold text-gray-900">Growth Hub</h1>
            <p className="text-gray-400 text-[11px]">SEO · GEO · Google Ads · AI Visibility — all live modules and roadmap</p>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 max-w-[1400px] space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3 text-xs text-red-700">
          <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p><strong>Governance:</strong> No autonomous spending. All budget decisions require your approval. Zero automatic campaign launches or bid changes.</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <CheckCircle2 size={14} className="text-green-500" />
            Live Now
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {LIVE_MODULES.map(({ title, desc, href }) => (
              <Link key={href} href={href}
                className="group flex items-start gap-3 p-4 rounded-xl border border-gray-200 hover:border-brand-300 hover:bg-brand-50 transition-colors">
                <CheckCircle2 size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 group-hover:text-brand-700">{title}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{desc}</p>
                </div>
                <ArrowRight size={12} className="text-gray-300 group-hover:text-brand-500 mt-0.5 flex-shrink-0" />
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Link2 size={14} className="text-amber-500" />
            On the Roadmap
          </h3>
          <div className="space-y-3">
            {ROADMAP.map(({ title, desc }) => (
              <div key={title} className="flex items-start gap-3 p-4 rounded-xl border border-dashed border-gray-200">
                <Circle size={14} className="text-gray-300 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-gray-700">{title}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
