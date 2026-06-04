"use client"
import { TrendingUp, AlertCircle, Link2, BarChart2, Target, DollarSign } from "lucide-react"

const FEEDBACK_LOOP = [
  { from: "SEO — high-converting keyword discovered", to: "Ads Opportunity", action: "Keyword → Campaign 1A" },
  { from: "Ads — high search term converting to dealer lead", to: "SEO Opportunity", action: "Create page targeting this intent" },
  { from: "GeM Intelligence — peak season detected (Jun)", to: "Both SEO + Ads", action: "Increase budget and publish timely content" },
  { from: "AI Citation — competitor cited in Perplexity", to: "Content Factory", action: "Create authority page for that query" },
]

const KPI_QUESTIONS = [
  { q: "Which campaign generates the best dealer leads?", a: "To be answered — connect Google Ads API + lead source tracking" },
  { q: "Which keyword generates OEM authorization requests?", a: "To be answered — enable keyword-level conversion tracking in GTM" },
  { q: "Which landing page converts best for dealer inquiries?", a: "To be answered — enable GA4 goal events per page" },
  { q: "Where is ad spend being wasted?", a: "To be answered — connect Google Ads API for search term reports" },
  { q: "What is cost per dealer lead by campaign?", a: "To be answered — connect Google Ads conversions to lead CRM" },
]

const INTEGRATION_STEPS = [
  { step: 1, title: "Google Ads API", desc: "Create Google Cloud project, enable Ads API, create service account. Add GOOGLE_ADS_CLIENT_ID + GOOGLE_ADS_DEVELOPER_TOKEN to Vercel env vars." },
  { step: 2, title: "Google Analytics 4", desc: "Create GA4 property, enable GA4 Data API. Add GA4_PROPERTY_ID + GOOGLE_SA_KEY to env vars. Enables per-page conversion tracking." },
  { step: 3, title: "GTM Conversion Events", desc: "In GTM: map whatsapp_click, form_submit, phone_click events to GA4 conversions. Import conversion actions into Google Ads." },
  { step: 4, title: "Lead Source Attribution", desc: "Add utm_campaign + utm_source tracking to all WhatsApp CTAs. Map UTM params in lead collection API to identify ad-sourced leads." },
  { step: 5, title: "Feedback Loop API", desc: "Build /api/admin/growth/ads/feedback route. When GA4 detects high-converting term → creates SEO opportunity. When SEO gets new high-traffic page → creates ads opportunity." },
]

export default function PaidGrowthCenter() {
  return (
    <div className="flex-1 bg-gray-50 min-h-screen">
      <div className="bg-white border-b border-gray-200 px-8 py-5 sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <TrendingUp size={18} className="text-brand-600" />
          <div>
            <h1 className="text-base font-bold text-gray-900">Paid Growth Command Center</h1>
            <p className="text-gray-400 text-[11px]">SEO ↔ GEO ↔ AI Visibility ↔ Google Ads — closed-loop growth engine</p>
          </div>
        </div>
      </div>

      <div className="px-8 py-6 max-w-[1400px] space-y-6">
        {/* Approval rule */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3 text-xs text-red-700">
          <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p><strong>No autonomous spending.</strong> This system may recommend, simulate, and forecast. All budget decisions require management approval. Zero automatic campaign launches or budget changes.</p>
        </div>

        {/* Integration status */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <BarChart2 size={14} className="text-brand-600" />
            Integration Status — Build in Order
          </h3>
          <div className="space-y-3">
            {INTEGRATION_STEPS.map(({ step, title, desc }) => (
              <div key={step} className="flex gap-4 border border-gray-200 rounded-xl p-4">
                <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {step}
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-800 mb-0.5">{title}</p>
                  <p className="text-xs text-gray-500">{desc}</p>
                </div>
                <div className="ml-auto">
                  <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Pending</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SEO ↔ Ads feedback loop */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800 mb-1 flex items-center gap-2">
            <Link2 size={14} className="text-brand-600" />
            SEO ↔ Ads Feedback Loop Architecture
          </h3>
          <p className="text-xs text-gray-400 mb-4">When activated, high-signal data flows between channels automatically. Each signal creates a trackable opportunity in Opportunity Engine.</p>
          <div className="space-y-3">
            {FEEDBACK_LOOP.map(({ from, to, action }) => (
              <div key={from} className="bg-gray-50 rounded-xl border border-gray-100 p-4 text-xs">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <p className="text-gray-500 mb-1">Trigger: <span className="font-medium text-gray-700">{from}</span></p>
                    <p className="text-gray-500 mb-0.5">→ Creates: <span className="font-medium text-brand-600">{to}</span></p>
                  </div>
                  <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full whitespace-nowrap">{action}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* KPI questions */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Target size={14} className="text-brand-600" />
            Management Questions — Once Connected
          </h3>
          <div className="space-y-3">
            {KPI_QUESTIONS.map(({ q, a }) => (
              <div key={q} className="border border-gray-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-gray-800 mb-1">{q}</p>
                <p className="text-xs text-gray-400">{a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Ultimate goal */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-6 text-white">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center flex-shrink-0">
              <DollarSign size={18} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold mb-2">Ultimate Objective — Closed-Loop Growth Engine</h3>
              <p className="text-gray-300 text-xs mb-3">
                SEO + GEO + AI Visibility + Google Ads + Lead Quality + Revenue operate as one coordinated system.
                The goal is not traffic. The goal is qualified dealer leads, OEM authorization requests, tender support opportunities, and revenue growth.
              </p>
              <div className="flex flex-wrap gap-2">
                {["Dealer Acquisition", "OEM Authorization", "Tender Support", "GeM Revenue", "AI Visibility"].map(t => (
                  <span key={t} className="text-[11px] bg-white/10 text-gray-200 px-2.5 py-1 rounded-full">{t}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
