import type { Metadata } from "next"
import Link from "next/link"
import { SITE_URL, BUSINESS } from "@/lib/seo/site-config"

export const revalidate = 60

export const metadata: Metadata = {
  title: "GeM Tender Support for Fogging Machines | OEM Documentation | 100X Circle",
  description:
    "OEM tender support for fogging machine dealers and contractors. Get authorization letters, IS 14855 documentation, L1 quotations, and technical specs for GeM bids and government tenders.",
  keywords: [
    "GeM tender support fogging machine",
    "OEM support government tender India",
    "fogging machine tender documentation",
    "OEM authorization letter tender",
    "L1 quotation fogging machine",
    "GeM bid support fogging machine",
    "government tender fogging machine OEM",
    "tender documentation fogging machine India",
  ],
  alternates: { canonical: `${SITE_URL}/gem-tender-support` },
  openGraph: {
    title: "GeM Tender Support — OEM Documentation for Fogging Machine Bids",
    description:
      "Authorization letters, IS 14855 documentation, and L1 quotation support for dealers bidding on government tenders for fogging machines.",
    url: `${SITE_URL}/gem-tender-support`,
    type: "website",
  },
}

const jsonLdFaq = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What tender support does 100X Circle provide to dealers and contractors?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "100X Circle provides comprehensive tender support including: signed OEM authorization letters, ISO 9001:2015 certificates, MSME/UDYAM certificates, IS 14855 compliance documentation, technical specification sheets, GeM seller verification, GST registration documents, L1 quotation support, and sample/demo units on request. Contact +91-7827229116 or 100xcircle@gmail.com.",
      },
    },
    {
      "@type": "Question",
      name: "How quickly can 100X Circle provide tender documentation?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Standard documentation requests are processed within 1–2 working days. For urgent tenders with tight deadlines, contact us by phone or WhatsApp at +91-7827229116 and we will prioritize your request. We understand that government tender timelines are fixed.",
      },
    },
    {
      "@type": "Question",
      name: "Does 100X Circle provide L1 (lowest bid) quotations for government tenders?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. 100X Circle provides competitive pricing and L1 quotation support for authorized dealers bidding on government tenders. We help dealers bid competitively on GeM reverse auctions and open tenders. Contact us at +91-7827229116 to discuss pricing for your specific tender.",
      },
    },
    {
      "@type": "Question",
      name: "What is the benefit of using an MSME OEM for government tender bids?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Bidding with an MSME OEM's authorization provides several advantages: (1) MSME procurement preference — Government of India mandates 25% procurement from MSMEs; (2) Make in India advantage — Indian-manufactured products preferred in many government tenders; (3) Credibility — ISO 9001-certified OEM documentation strengthens bid quality; (4) Complete documentation — all required certificates available from one source.",
      },
    },
  ],
}

const DOCS = [
  {
    name: "OEM Authorization Letter",
    desc: "Signed letter on 100X Circle letterhead certifying you as an authorized reseller. Accepted in all government tender bid submissions.",
    time: "1–2 working days",
  },
  {
    name: "ISO 9001:2015 Certificate",
    desc: "Quality management system certificate for 100X Circle manufacturing operations. Required by most government tenders.",
    time: "Immediate",
  },
  {
    name: "MSME/UDYAM Registration Certificate",
    desc: "Proof of MSME registration. Used to claim MSME procurement preference in eligible tender categories.",
    time: "Immediate",
  },
  {
    name: "IS 14855 (Part 1) Compliance Documentation",
    desc: "Technical specification sheets and compliance documentation aligned with IS 14855 — the BIS standard specified in fogging machine tenders.",
    time: "Immediate",
  },
  {
    name: "Technical Specification Sheet",
    desc: "Model-specific technical data sheet for the machines you are bidding. Includes all parameters typically specified in government tender BOQs.",
    time: "Immediate",
  },
  {
    name: "CE Marking Certificate",
    desc: "European conformity certificate for export-grade models. Relevant for tenders that specify international safety standards.",
    time: "Immediate",
  },
  {
    name: "GeM Seller Verification",
    desc: "Screenshot/proof of 100X Circle's GeM seller registration and MSME OEM status on the Government e-Marketplace.",
    time: "Immediate",
  },
  {
    name: "L1 Quotation Support",
    desc: "Competitive pricing guidance to help you bid effectively in GeM reverse auctions and open tender price bids.",
    time: "Same day discussion",
  },
]

const TENDER_TYPES = [
  {
    type: "Municipal Corporation Tenders (Nagar Nigam)",
    detail: "Large cities procure vehicle-mounted foggers for ward-level mosquito control drives. Typically specify IS 14855, ISO 9001, and often require 3–5 year maintenance contracts. High volume — 10–200+ machines per tender.",
    docs: ["OEM Letter", "IS 14855 Docs", "ISO Cert", "MSME Cert", "Technical Specs"],
  },
  {
    type: "Nagar Panchayat / Nagar Palika Procurement",
    detail: "Smaller municipalities procuring portable fogging machines for seasonal dengue and malaria control. Often single-supplier GeM direct purchase. 1–10 machines. Simpler documentation requirements.",
    docs: ["OEM Letter", "IS 14855 Docs", "GeM Authorization", "Technical Specs"],
  },
  {
    type: "State Health Department Tenders",
    detail: "State vector control programmes procure fogging machines for district health offices. Annual tenders, often state-wide rate contracts. Require MSME certification and price competitiveness.",
    docs: ["OEM Letter", "ISO Cert", "MSME Cert", "IS 14855 Docs", "L1 Quotation"],
  },
  {
    type: "GeM Direct Purchase & Reverse Auction",
    detail: "Government buyers place direct purchase orders on GeM or initiate reverse auctions. Requires active GeM authorization pairing and catalog listing. Fastest procurement route.",
    docs: ["GeM OEM Authorization Code", "Catalog Pairing", "GeM Listing Active"],
  },
  {
    type: "Agricultural Department Tenders",
    detail: "State agriculture departments and Krishi Vigyan Kendras procure agricultural foggers for crop protection programmes. May also use GeM or direct procurement.",
    docs: ["OEM Letter", "IS 14855 Docs", "ISO Cert", "Technical Specs"],
  },
]

export default function GemTenderSupportPage() {
  const waLink = `https://wa.me/${BUSINESS.whatsappE164}?text=${encodeURIComponent("Hi, I need tender support documentation for a fogging machine bid. Tender details:")}`

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }}
      />

      <main className="max-w-3xl mx-auto px-4 py-16 pt-32">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-brand-600">Home</Link>
          <span className="mx-2">/</span>
          <span>GeM Tender Support</span>
        </nav>

        <div className="flex flex-wrap gap-2 mb-4">
          {["GeM", "Tender Support", "OEM Documentation", "Government"].map((tag) => (
            <span key={tag} className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          GeM Tender Support for Fogging Machine Dealers and Contractors
        </h1>
        <p className="text-gray-500 text-sm mb-2">
          100X Circle Pvt Ltd · MSME OEM · IS 14855 Compliant · ISO 9001:2015
        </p>
        <p className="text-gray-600 text-lg mb-8 leading-relaxed">
          Bidding on a government tender for fogging machines? 100X Circle provides complete
          OEM documentation — authorization letters, IS 14855 compliance docs, MSME
          certificates, and L1 quotation support — to help your bid succeed.
        </p>

        {/* Urgent CTA */}
        <div className="bg-brand-600 rounded-xl p-6 mb-10 text-white">
          <h2 className="font-bold text-xl mb-2">Request Tender Documentation</h2>
          <p className="text-brand-100 text-sm mb-4">
            Active tender deadline? Most documents issued within 1–2 working days. Urgent
            requests prioritized — call or WhatsApp directly.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-white text-brand-700 font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-brand-50 transition-colors"
            >
              WhatsApp Now
            </a>
            <a
              href={`tel:${BUSINESS.phonePrimary}`}
              className="inline-flex items-center justify-center border border-brand-300 text-white font-medium px-5 py-2.5 rounded-lg text-sm hover:bg-brand-700 transition-colors"
            >
              Call: {BUSINESS.phonePrimary}
            </a>
          </div>
        </div>

        {/* Documents available */}
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Documents Available for Tender Bids
        </h2>
        <div className="space-y-3 mb-10">
          {DOCS.map((d) => (
            <div key={d.name} className="flex gap-4 border border-gray-200 rounded-xl p-4">
              <div className="w-2 h-2 rounded-full bg-brand-600 flex-shrink-0 mt-2" />
              <div className="flex-1">
                <div className="flex justify-between items-start gap-2 flex-wrap">
                  <h3 className="font-semibold text-gray-800 text-sm">{d.name}</h3>
                  <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-100 flex-shrink-0">
                    {d.time}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-1">{d.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tender type guide */}
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Documentation by Tender Type
        </h2>
        <div className="space-y-4 mb-10">
          {TENDER_TYPES.map((t) => (
            <div key={t.type} className="border border-gray-200 rounded-xl p-5">
              <h3 className="font-semibold text-gray-800 mb-2">{t.type}</h3>
              <p className="text-sm text-gray-600 mb-3">{t.detail}</p>
              <div className="flex flex-wrap gap-1.5">
                {t.docs.map((d) => (
                  <span key={d} className="text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full border border-brand-100">
                    {d}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <article className="prose prose-gray max-w-none mb-8">
          <h2>Why MSME OEM Authorization Strengthens Your Bid</h2>
          <p>
            Government procurement in India operates under the Public Procurement Policy for
            MSMEs, which mandates that 25% of annual procurement by central government
            entities must come from MSME sellers. In some product categories, procurement is
            reserved exclusively for MSME sellers.
          </p>
          <p>
            When you bid on a fogging machine tender with 100X Circle&apos;s MSME OEM
            authorization, your bid benefits from:
          </p>
          <ul>
            <li>
              <strong>MSME procurement preference:</strong> Your bid may qualify for
              purchase price preference of up to 15% over non-MSME suppliers
            </li>
            <li>
              <strong>Make in India advantage:</strong> 100X Circle is a domestic Indian
              manufacturer, aligning with government procurement preference for locally
              made products
            </li>
            <li>
              <strong>Complete documentation:</strong> All certificates and compliance
              documents from a single source — no chasing multiple suppliers
            </li>
            <li>
              <strong>Supply reliability:</strong> Manufacturer-direct supply from Gurugram
              factory, 5–10 working days pan-India dispatch
            </li>
          </ul>

          <h2>How to Request Tender Support</h2>
          <p>
            To get tender documentation from 100X Circle:
          </p>
          <ol>
            <li>
              Contact us via WhatsApp (+91-7827229116) or email (100xcircle@gmail.com)
            </li>
            <li>
              Share the tender number, tender issuing authority, and the specific
              documentation required
            </li>
            <li>
              For OEM authorization letters, confirm your business name as it should appear
              on the letter
            </li>
            <li>
              Standard documents are issued within 1–2 working days. OEM authorization
              letters require prior dealer registration (2–5 days for new dealers)
            </li>
          </ol>
          <p>
            If you are not yet a registered 100X Circle dealer and need documentation for
            an urgent tender, contact us immediately — we will assess whether expedited
            authorization is possible for your situation.
          </p>
        </article>

        {/* FAQ */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {[
              {
                q: "I have a tender closing in 3 days. Can I still get OEM authorization?",
                a: "Contact us immediately by phone or WhatsApp at +91-7827229116. For active tenders, we assess each situation individually and expedite where possible. If you have a prior relationship with 100X Circle (existing dealer or customer), turnaround can often be accelerated to 1 working day.",
              },
              {
                q: "Can I use the OEM authorization letter for multiple tenders?",
                a: "It depends on how the letter is drafted. Some letters are issued for a specific tender reference number; others are general dealer authorization letters valid for a defined period. Discuss your requirement when you contact us — we issue the format that best fits your situation.",
              },
              {
                q: "Do I need to become a formal dealer to get tender support?",
                a: "For recurring tender support and GeM reselling, formal dealer registration is required. For a one-off tender bid, contact us to discuss your specific situation. We evaluate each case individually.",
              },
            ].map(({ q, a }) => (
              <details key={q} className="border border-gray-200 rounded-xl">
                <summary className="p-4 font-medium text-gray-800 cursor-pointer text-sm">
                  {q}
                </summary>
                <p className="px-4 pb-4 text-sm text-gray-600">{a}</p>
              </details>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="bg-brand-600 rounded-xl p-6 mb-8 text-white">
          <h2 className="font-bold text-xl mb-1">Need Tender Documents Now?</h2>
          <p className="text-brand-100 text-sm mb-4">
            Share your tender details. We respond same day for urgent deadlines.
            Standard requests processed in 1–2 working days.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-white text-brand-700 font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-brand-50 transition-colors"
            >
              WhatsApp: +91-7827229116
            </a>
            <a
              href={`tel:${BUSINESS.phonePrimary}`}
              className="inline-flex items-center justify-center gap-2 border border-brand-300 text-white font-medium px-5 py-2.5 rounded-lg text-sm hover:bg-brand-700 transition-colors"
            >
              Call: {BUSINESS.phonePrimary}
            </a>
            <a
              href={`mailto:${BUSINESS.email}?subject=Tender Documentation Request`}
              className="inline-flex items-center justify-center gap-2 border border-brand-300 text-white font-medium px-5 py-2.5 rounded-lg text-sm hover:bg-brand-700 transition-colors"
            >
              Email Us
            </a>
          </div>
        </div>

        {/* Related */}
        <div className="border-t border-gray-200 pt-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Related</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Link href="/gem-oem-authorization" className="border border-gray-200 rounded-lg p-4 hover:border-brand-400 transition-colors">
              <p className="font-medium text-gray-800 text-sm">GeM OEM Authorization</p>
              <p className="text-xs text-gray-500 mt-1">Full dealer authorization for GeM reselling</p>
            </Link>
            <Link href="/is-14855-fogging-machine" className="border border-gray-200 rounded-lg p-4 hover:border-brand-400 transition-colors">
              <p className="font-medium text-gray-800 text-sm">IS 14855 Fogging Machines</p>
              <p className="text-xs text-gray-500 mt-1">BIS standard compliant models and documentation</p>
            </Link>
            <Link href="/knowledge/government-procurement-guide" className="border border-gray-200 rounded-lg p-4 hover:border-brand-400 transition-colors">
              <p className="font-medium text-gray-800 text-sm">Government Procurement Guide</p>
              <p className="text-xs text-gray-500 mt-1">GeM procurement process for government buyers</p>
            </Link>
            <Link href="/become-a-dealer" className="border border-gray-200 rounded-lg p-4 hover:border-brand-400 transition-colors">
              <p className="font-medium text-gray-800 text-sm">Become a Dealer</p>
              <p className="text-xs text-gray-500 mt-1">Full dealer program and benefits</p>
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}
