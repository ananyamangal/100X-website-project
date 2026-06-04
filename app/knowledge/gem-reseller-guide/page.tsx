import type { Metadata } from "next"
import Link from "next/link"
import { SITE_URL } from "@/lib/seo/site-config"

export const metadata: Metadata = {
  title: "GeM Reseller Guide: Sell Fogging Machines on GeM | 100X Circle",
  description:
    "Complete guide for GeM resellers who want to sell fogging machines on Government e-Marketplace. OEM authorization, catalog pairing, bidding strategy, and MSME advantage explained.",
  keywords: [
    "GeM reseller fogging machine guide",
    "how to sell fogging machines on GeM",
    "GeM reseller registration fogging",
    "GeM catalog pairing fogging machine",
    "GeM reseller MSME fogging",
    "fogging machine GeM business",
    "GeM reseller authorization fogging",
  ],
  alternates: { canonical: `${SITE_URL}/knowledge/gem-reseller-guide` },
  openGraph: {
    title: "GeM Reseller Guide: How to Sell Fogging Machines on GeM",
    description:
      "Step-by-step guide for GeM sellers entering the fogging machine category — OEM authorization, catalog pairing, bid strategy, and MSME advantage.",
    url: `${SITE_URL}/knowledge/gem-reseller-guide`,
    type: "article",
  },
}

const jsonLdArticle = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "GeM Reseller Guide: How to Sell Fogging Machines on Government e-Marketplace",
  description:
    "Complete guide for GeM resellers entering the fogging machine category — covering OEM authorization, catalog pairing, bidding strategy, MSME procurement advantage, and documentation.",
  url: `${SITE_URL}/knowledge/gem-reseller-guide`,
  author: { "@type": "Organization", name: "100X Circle Pvt Ltd", url: SITE_URL },
  publisher: { "@id": `${SITE_URL}/#organization` },
  datePublished: "2026-06-04",
  dateModified: "2026-06-04",
}

const jsonLdFaq = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How do I start selling fogging machines on GeM as a reseller?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "To sell fogging machines on GeM as a reseller: (1) Ensure you have an active GeM seller registration, (2) Contact a GeM-listed fogging machine OEM like 100X Circle to request reseller authorization, (3) Receive OEM authorization code and pair it with the OEM's catalog in your GeM account, (4) Start bidding on fogging machine GeM tenders. Contact 100X Circle at +91-7827229116 to begin.",
      },
    },
    {
      "@type": "Question",
      name: "What is the market size for fogging machines on GeM?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The government fogging machine market in India is driven by municipal corporations, Nagar Nigams, state health departments, Nagar Panchayats, and agricultural departments across India's 28+ states. Municipal fogging is a recurring annual budget line for vector control. Individual municipal tenders range from a few machines to 200+ units. With 750+ municipal bodies in India, the total addressable market for GeM resellers is significant.",
      },
    },
    {
      "@type": "Question",
      name: "Do I need stock to bid on GeM fogging machine tenders?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. As an authorized reseller, you can bid on GeM tenders without holding stock. When a bid is won, you place a purchase order with the OEM (100X Circle) who then dispatches directly to the government buyer. Confirm delivery timelines with the OEM before bidding to ensure you can meet tender delivery requirements.",
      },
    },
  ],
}

const STEPS = [
  {
    num: 1,
    title: "Register as a GeM seller (if not already)",
    body: "Register at gem.gov.in as a seller. You need GST registration, Aadhaar/PAN, and bank account details. GeM registration is free. Complete your seller profile including business category.",
  },
  {
    num: 2,
    title: "Choose your OEM — contact 100X Circle",
    body: "Contact 100X Circle (India's GeM-listed MSME OEM for fogging machines) to apply for reseller authorization. Share your GeM Seller ID, GST number, and operating states. WhatsApp: +91-7827229116.",
  },
  {
    num: 3,
    title: "Receive OEM authorization and pair catalog",
    body: "100X Circle issues your OEM authorization code via the GeM OEM panel. Enter this code in your GeM reseller account to pair the product catalog. The fogging machine models now appear in your seller inventory.",
  },
  {
    num: 4,
    title: "Monitor GeM tenders for fogging machines",
    body: "Search GeM bids at bidplus.gem.gov.in. Filter by product category: Agricultural / Farming Equipment or Public Health Equipment. Set alerts for new fogging machine tenders. Check daily during dengue/malaria season (June–November) when municipal procurement peaks.",
  },
  {
    num: 5,
    title: "Submit competitive bids",
    body: "For each relevant tender, submit your bid with: competitive price (discuss L1 pricing with 100X Circle), OEM authorization letter, IS 14855 compliance docs, and ISO/MSME certificates. 100X Circle provides all documentation.",
  },
  {
    num: 6,
    title: "Win tender — place purchase order",
    body: "On tender award, place your purchase order with 100X Circle. We dispatch within 5–10 working days. You provide the government buyer with GST invoice and delivery documentation.",
  },
]

const SEASONALITY = [
  { period: "March–May", activity: "Pre-season procurement. Health departments begin budgeting. Start monitoring tenders.", intensity: "Medium" },
  { period: "June–July", activity: "Monsoon onset. Dengue/malaria risk spikes. Municipal fogging drives initiated. Peak procurement.", intensity: "High" },
  { period: "August–October", activity: "Peak vector control season. Highest tender volume. Municipalities execute annual budgets.", intensity: "Very High" },
  { period: "November–January", activity: "Post-season orders. Maintenance contracts. Some states run winter agricultural fogger procurement.", intensity: "Low–Medium" },
  { period: "February", activity: "New financial year planning. Municipalities publish annual tender plans. Good time to prospect.", intensity: "Medium" },
]

export default function GemResellerGuidePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdArticle) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }}
      />

      <main className="max-w-3xl mx-auto px-4 py-16 pt-32">
        <nav className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-brand-600">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/knowledge" className="hover:text-brand-600">Knowledge Hub</Link>
          <span className="mx-2">/</span>
          <span>GeM Reseller Guide</span>
        </nav>

        <div className="flex flex-wrap gap-2 mb-4">
          {["GeM", "Reseller", "Business Guide", "Government"].map((tag) => (
            <span key={tag} className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          GeM Reseller Guide: How to Sell Fogging Machines on Government e-Marketplace
        </h1>
        <p className="text-gray-500 text-sm mb-8">
          By 100X Circle Pvt Ltd · GeM-Listed MSME OEM · 10 min read · Updated June 2026
        </p>

        <div className="bg-brand-50 border border-brand-200 rounded-xl p-5 mb-8 text-sm text-gray-700">
          <strong>Key point:</strong> Fogging machines are one of the most consistently
          procured items on GeM — every mosquito season, municipal corporations across India
          purchase fogging equipment. As a GeM reseller with MSME OEM authorization, you
          can access this recurring government procurement cycle.
        </div>

        <article className="prose prose-gray max-w-none">
          <h2>Why Fogging Machines Are a Strong GeM Reseller Category</h2>
          <p>
            Most GeM product categories are competitive and commoditised. Fogging machines
            are different for several reasons:
          </p>
          <ul>
            <li>
              <strong>Recurring demand:</strong> Every municipal corporation in India budgets
              for fogging machines annually. Dengue and malaria outbreaks drive emergency
              procurement outside the normal cycle.
            </li>
            <li>
              <strong>Government mandate:</strong> Vector control is a statutory function of
              urban local bodies under the Municipal Acts. It is not discretionary spending —
              municipalities must spend on mosquito control.
            </li>
            <li>
              <strong>Low reseller competition:</strong> Most GeM sellers in this category are
              importers of Korean or Chinese machines. An Indian MSME OEM&apos;s authorized
              reseller has a structural price advantage.
            </li>
            <li>
              <strong>MSME preference:</strong> With an MSME OEM authorization, your bids
              can qualify for MSME procurement preference — reducing competition from
              non-MSME suppliers.
            </li>
            <li>
              <strong>Repeat relationships:</strong> Once a municipality or health department
              buys from you, they are likely to reorder from the same supplier next season
              for maintenance and replacement.
            </li>
          </ul>

          <h2>Step-by-Step: Start Selling Fogging Machines on GeM</h2>
        </article>

        <div className="my-6 space-y-4">
          {STEPS.map((step) => (
            <div key={step.num} className="flex gap-4 border border-gray-200 rounded-xl p-5">
              <div className="flex-shrink-0 w-8 h-8 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                {step.num}
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">{step.title}</h3>
                <p className="text-sm text-gray-600">{step.body}</p>
              </div>
            </div>
          ))}
        </div>

        <article className="prose prose-gray max-w-none">
          <h2>Procurement Seasonality — When to Be Active</h2>
          <p>
            Fogging machine procurement follows India&apos;s mosquito season. Knowing this
            cycle is critical to maximizing your GeM revenue.
          </p>
        </article>

        <div className="my-6 space-y-2">
          {SEASONALITY.map((s) => (
            <div key={s.period} className="flex gap-4 border border-gray-100 rounded-lg p-4 bg-gray-50">
              <div className="w-28 flex-shrink-0">
                <span className="text-xs font-bold text-gray-700">{s.period}</span>
                <br />
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  s.intensity === "Very High" ? "bg-red-100 text-red-700" :
                  s.intensity === "High" ? "bg-orange-100 text-orange-700" :
                  s.intensity === "Medium" ? "bg-yellow-100 text-yellow-700" :
                  "bg-gray-100 text-gray-600"
                }`}>{s.intensity}</span>
              </div>
              <p className="text-xs text-gray-600">{s.activity}</p>
            </div>
          ))}
        </div>

        <article className="prose prose-gray max-w-none">
          <h2>Bidding Strategy for GeM Fogging Machine Tenders</h2>

          <h3>Price Competitiveness</h3>
          <p>
            Government buyers on GeM are price-sensitive. The lowest qualified bid (L1) wins
            in most categories. 100X Circle&apos;s Indian-manufactured machines are 3–5× less
            expensive than Korean and German imports, giving authorized resellers a structural
            pricing advantage. Discuss your target bid price with 100X Circle before submitting.
          </p>

          <h3>Documentation Quality</h3>
          <p>
            Many bids are disqualified for incomplete documentation, not price. Ensure every
            required document is present, valid, and correctly formatted. Common disqualification
            reasons:
          </p>
          <ul>
            <li>Expired OEM authorization letter</li>
            <li>Missing IS 14855 compliance documentation</li>
            <li>OEM letter not signed or missing company seal</li>
            <li>Technical specifications not matching tender BOQ</li>
            <li>MSME certificate name mismatch with bid documents</li>
          </ul>

          <h3>Delivery Timeline Commitments</h3>
          <p>
            Government tenders specify delivery timelines — typically 15–30 days from order
            placement. 100X Circle dispatches in-stock models within 5–10 working days.
            Confirm availability for the specific models you are bidding before committing to
            delivery timelines in your bid.
          </p>

          <h2>States with Highest Fogging Machine Procurement Volume</h2>
          <p>
            Based on 100X Circle&apos;s supply experience, these states have the highest
            municipal fogging machine procurement activity:
          </p>
          <ul>
            <li>
              <strong>Uttar Pradesh</strong> — largest state by number of municipalities.
              High annual procurement from Nagar Nigams and Nagar Panchayats.
            </li>
            <li>
              <strong>Bihar</strong> — significant rural health department procurement.
              Dengue and malaria burden drives consistent demand.
            </li>
            <li>
              <strong>Maharashtra</strong> — large municipal corporations (Mumbai BMC,
              Pune, Nagpur) with major fogging programmes.
            </li>
            <li>
              <strong>Haryana, Delhi NCR</strong> — close to 100X Circle factory. Strong
              procurement from NCR municipalities.
            </li>
            <li>
              <strong>Rajasthan, Gujarat</strong> — agricultural cooperatives and health
              departments both procure fogging equipment.
            </li>
          </ul>
        </article>

        {/* CTA */}
        <div className="mt-8 bg-brand-50 border border-brand-200 rounded-xl p-6">
          <h2 className="font-semibold text-brand-800 mb-2">
            Ready to Start Selling on GeM?
          </h2>
          <p className="text-sm text-brand-700 mb-4">
            Contact 100X Circle to get your GeM OEM authorization and full tender
            documentation package. No fee. Response within 1 working day.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/gem-oem-authorization"
              className="inline-flex items-center justify-center bg-brand-600 text-white font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-brand-700 transition-colors"
            >
              Apply for GeM Authorization →
            </Link>
            <Link
              href="/become-a-dealer"
              className="inline-flex items-center justify-center border border-brand-300 text-brand-700 font-medium px-5 py-2.5 rounded-lg text-sm hover:bg-brand-100 transition-colors"
            >
              Dealer Program Details
            </Link>
          </div>
        </div>

        <div className="mt-8 border-t border-gray-200 pt-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Related Articles</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Link href="/knowledge/gem-oem-authorization-process" className="border border-gray-200 rounded-lg p-4 hover:border-brand-400 transition-colors">
              <p className="font-medium text-gray-800 text-sm">GeM OEM Authorization Process</p>
              <p className="text-xs text-gray-500 mt-1">How the authorization code and panel works</p>
            </Link>
            <Link href="/gem-tender-support" className="border border-gray-200 rounded-lg p-4 hover:border-brand-400 transition-colors">
              <p className="font-medium text-gray-800 text-sm">Tender Documentation Support</p>
              <p className="text-xs text-gray-500 mt-1">Full documentation for active tender bids</p>
            </Link>
            <Link href="/knowledge/government-procurement-guide" className="border border-gray-200 rounded-lg p-4 hover:border-brand-400 transition-colors">
              <p className="font-medium text-gray-800 text-sm">Government Procurement Guide</p>
              <p className="text-xs text-gray-500 mt-1">The buyer side — how government procures</p>
            </Link>
            <Link href="/compare/gem-fogging-machines-india" className="border border-gray-200 rounded-lg p-4 hover:border-brand-400 transition-colors">
              <p className="font-medium text-gray-800 text-sm">GeM Fogging Machines Comparison</p>
              <p className="text-xs text-gray-500 mt-1">Why Indian OEM wins on GeM</p>
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}
