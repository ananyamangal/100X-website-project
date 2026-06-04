import type { Metadata } from "next"
import Link from "next/link"
import { SITE_URL, BUSINESS } from "@/lib/seo/site-config"

export const metadata: Metadata = {
  title: "Become an Authorized 100X Circle Dealer | Fogging Machine Distributor India",
  description:
    "Join 100X Circle's authorized dealer network. Sell GeM-listed, ISO 9001 certified thermal fogging machines in your territory. OEM support, tender documentation, and bulk pricing available.",
  keywords: [
    "fogging machine dealer India",
    "thermal fogging machine distributor",
    "become fogging machine dealer",
    "100x circle dealer program",
    "GeM reseller fogging machine",
    "pest control equipment dealer India",
    "fogging machine distributor program",
    "authorized fogging machine dealer",
  ],
  alternates: { canonical: `${SITE_URL}/become-a-dealer` },
  openGraph: {
    title: "Become an Authorized 100X Circle Dealer",
    description:
      "Join 50+ active dealers selling 100X Circle fogging machines across India. GeM OEM authorization, full tender support, and competitive margins.",
    url: `${SITE_URL}/become-a-dealer`,
    type: "website",
  },
}

const jsonLdFaq = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What are the requirements to become a 100X Circle authorized dealer?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "To become an authorized 100X Circle dealer, you need: (1) Valid GST registration, (2) Business registration (proprietorship, partnership, or company), (3) Experience in pest control, public health equipment, agricultural machinery, or government supply is preferred. No security deposit or franchise fee is required.",
      },
    },
    {
      "@type": "Question",
      name: "Does 100X Circle provide GeM OEM authorization to dealers?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. 100X Circle provides GeM OEM authorization codes and authorization letters to approved dealers. This allows you to sell 100X Circle fogging machines on GeM as an authorized reseller and bid on government tenders for fogging equipment.",
      },
    },
    {
      "@type": "Question",
      name: "What margin can dealers expect on 100X Circle fogging machines?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Dealer margins are discussed individually based on volume, territory, and product mix. Please contact 100X Circle at +91-7827229116 or 100xcircle@gmail.com to discuss pricing and margin structure for your specific situation.",
      },
    },
    {
      "@type": "Question",
      name: "Do I need to maintain stock to be a dealer?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Stock holding is optional. You can operate as an order-fulfilment dealer — take orders from customers and government tenders, then purchase from 100X Circle for direct dispatch. For active GeM bidding, stock-free operation works well for most dealers.",
      },
    },
    {
      "@type": "Question",
      name: "Can pest control companies become 100X Circle dealers?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Pest control operators (PCOs) are among our preferred dealer partners. PCOs already have relationships with municipal corporations, housing societies, and institutional buyers — the same buyers who purchase fogging machines. Adding equipment sales to your service business is a natural revenue expansion.",
      },
    },
    {
      "@type": "Question",
      name: "What tender support does 100X Circle provide to dealers?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "100X Circle provides comprehensive tender support including: OEM authorization letters, ISO 9001:2015 certificates, MSME/UDYAM certificates, IS 14855 compliance documentation, technical specification sheets, L1 quotation support, and sample/demo units on request.",
      },
    },
  ],
}

const BENEFITS = [
  {
    icon: "🏛️",
    title: "GeM OEM Authorization",
    body: "Get your OEM authorization code and letters to sell on GeM and bid on government tenders for fogging machines across India.",
  },
  {
    icon: "📄",
    title: "Complete Tender Documentation",
    body: "ISO 9001, MSME, IS 14855, CE certificate, spec sheets — everything you need to submit winning government bids.",
  },
  {
    icon: "🏭",
    title: "Direct from Manufacturer",
    body: "Buy directly from our Gurugram factory. No distributor markup. Competitive pricing with strong margins for dealers.",
  },
  {
    icon: "🚚",
    title: "Pan-India Dispatch",
    body: "We ship to any state in India within 5–10 working days. You can sell anywhere without holding local stock.",
  },
  {
    icon: "🔧",
    title: "Spare Parts & After-Sales",
    body: "Full spare parts ecosystem. Your customers get direct manufacturer support, strengthening your reputation with buyers.",
  },
  {
    icon: "📊",
    title: "MSME Procurement Advantage",
    body: "100X Circle is MSME registered. Your bids on MSME-preferred GeM categories are more competitive by design.",
  },
]

const WHO_CAN_JOIN = [
  {
    type: "Pest Control Operators (PCOs)",
    detail:
      "Already serving municipalities, housing societies, and institutions? Add equipment sales to your service revenue. PCOs are our most successful dealer category.",
  },
  {
    type: "Agricultural Equipment Dealers",
    detail:
      "If you sell power sprayers, power weeders, or farm machinery, fogging machines are a natural adjacent category with strong municipal and government demand.",
  },
  {
    type: "GeM Sellers & Government Traders",
    detail:
      "Already registered on GeM and bidding on government equipment tenders? Adding fogging machines to your catalog opens municipal health and vector control procurement.",
  },
  {
    type: "Public Health Equipment Suppliers",
    detail:
      "Suppliers serving hospitals, health departments, or vector control programmes can expand into fogging machines for disease prevention programmes.",
  },
  {
    type: "Industrial Equipment Distributors",
    detail:
      "Distributors serving industries, factory estates, and housing societies can add thermal fogging to address pest control and sanitization demand.",
  },
]

const STEPS = [
  {
    num: 1,
    title: "Get in touch",
    body: "WhatsApp or call +91-7827229116. Tell us your state(s), your current business, and whether you are on GeM. No commitment required at this stage.",
  },
  {
    num: 2,
    title: "Discuss terms",
    body: "We discuss territory, pricing, margin structure, and GeM authorization. Everything is transparent — no hidden fees.",
  },
  {
    num: 3,
    title: "Submit basic documents",
    body: "GST certificate + business registration. That's all we need to onboard you as an authorized dealer.",
  },
  {
    num: 4,
    title: "Receive authorization",
    body: "Get your dealer authorization letter, GeM OEM code (if GeM registered), and the complete tender documentation package.",
  },
  {
    num: 5,
    title: "Start selling",
    body: "List products on GeM, respond to tenders, and serve local buyers. We dispatch directly to your customers from Gurugram.",
  },
]

export default function BecomeADealerPage() {
  const waLink = `https://wa.me/${BUSINESS.whatsappE164}?text=${encodeURIComponent("Hi, I'm interested in becoming an authorized 100X Circle dealer. My state:")}`

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
          <span>Become a Dealer</span>
        </nav>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          {["Dealer Program", "GeM Reseller", "Distributor", "OEM Authorization"].map((tag) => (
            <span key={tag} className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
        </div>

        {/* Hero */}
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          Become an Authorized 100X Circle Fogging Machine Dealer
        </h1>
        <p className="text-gray-500 text-sm mb-2">
          Join 50+ active dealers across India · GeM OEM Authorization Available
        </p>
        <p className="text-gray-600 text-lg mb-8 leading-relaxed">
          Sell India&apos;s GeM-listed, ISO 9001-certified thermal fogging machines in your
          territory. Access government tender documentation, OEM authorization for GeM, and
          direct-from-factory pricing.
        </p>

        {/* CTA */}
        <div className="bg-brand-600 rounded-xl p-6 mb-10 text-white">
          <h2 className="font-bold text-xl mb-2">Apply for Dealership</h2>
          <p className="text-brand-100 text-sm mb-4">
            Select your dealer type and get a pre-filled application — or call/WhatsApp directly.
            We respond within 1 working day. No fee.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/dealer-application"
              className="inline-flex items-center justify-center gap-2 bg-white text-brand-700 font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-brand-50 transition-colors"
            >
              Apply — Choose Your Dealer Type →
            </Link>
            <a
              href={`tel:${BUSINESS.phonePrimary}`}
              className="inline-flex items-center justify-center gap-2 border border-brand-300 text-white font-medium px-5 py-2.5 rounded-lg text-sm hover:bg-brand-700 transition-colors"
            >
              Call: {BUSINESS.phonePrimary}
            </a>
          </div>
        </div>

        {/* Benefits */}
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Why Partner with 100X Circle</h2>
        <div className="grid sm:grid-cols-2 gap-4 mb-10">
          {BENEFITS.map((b) => (
            <div key={b.title} className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{b.icon}</span>
                <h3 className="font-semibold text-gray-800 text-sm">{b.title}</h3>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">{b.body}</p>
            </div>
          ))}
        </div>

        {/* Who can join */}
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Who Can Become a Dealer</h2>
        <div className="space-y-3 mb-10">
          {WHO_CAN_JOIN.map((w) => (
            <div key={w.type} className="border border-gray-100 bg-gray-50 rounded-xl p-4">
              <h3 className="font-semibold text-gray-800 text-sm mb-1">{w.type}</h3>
              <p className="text-xs text-gray-600">{w.detail}</p>
            </div>
          ))}
        </div>

        {/* Process */}
        <h2 className="text-xl font-semibold text-gray-800 mb-4">How It Works</h2>
        <div className="space-y-4 mb-10">
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

        {/* Product range */}
        <article className="prose prose-gray max-w-none mb-8">
          <h2>Products You Can Sell</h2>
          <p>
            As a 100X Circle authorized dealer, you get access to the complete product range:
          </p>
          <ul>
            <li>
              <strong>Thermal Fogging Machines</strong> — portable and vehicle-mounted, for
              municipal vector control, agricultural pest management, and industrial use
            </li>
            <li>
              <strong>ULV Cold Foggers</strong> — for indoor sanitization, food processing,
              healthcare, and enclosed public spaces
            </li>
            <li>
              <strong>Vehicle-Mounted Foggers</strong> — large-capacity units for municipal
              corporation fogging drives
            </li>
            <li>
              <strong>Agricultural Equipment</strong> — power tillers, sprayers, and farm
              mechanization equipment
            </li>
            <li>
              <strong>Spare Parts</strong> — genuine spare parts for all 100X Circle machines,
              for after-sales revenue
            </li>
          </ul>
          <p>
            All products are manufactured at our Gurugram factory, carry ISO 9001:2015
            certification, and are eligible for GeM procurement.
          </p>
        </article>

        {/* FAQs */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {[
              {
                q: "Is there a minimum order requirement?",
                a: "No minimum order for authorization. You can start with a single machine order. Volume discounts apply as your order size grows.",
              },
              {
                q: "Can I become a dealer if I'm not on GeM?",
                a: "Yes. You don't need GeM registration to become a dealer. Many of our dealers serve direct institutional buyers, pest control operators, and agricultural customers without GeM. If you want to sell on GeM, we'll guide you through the registration.",
              },
              {
                q: "Do I need prior experience in the fogging industry?",
                a: "Preferred but not required. We provide product training and technical support. Experience in any of these fields is relevant: pest control, public health, agricultural equipment, government supply, or industrial equipment.",
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
          <h2 className="font-bold text-xl mb-1">Ready to Start Selling?</h2>
          <p className="text-brand-100 text-sm mb-4">
            We respond within 1 working day. No fee, no minimum order.
            Tell us your state and current business — that&apos;s all we need to start.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/dealer-application"
              className="inline-flex items-center justify-center gap-2 bg-white text-brand-700 font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-brand-50 transition-colors"
            >
              Choose Your Dealer Type →
            </Link>
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 border border-brand-300 text-white font-medium px-5 py-2.5 rounded-lg text-sm hover:bg-brand-700 transition-colors"
            >
              WhatsApp: {BUSINESS.phonePrimary}
            </a>
            <a
              href={`tel:${BUSINESS.phonePrimary}`}
              className="inline-flex items-center justify-center gap-2 border border-brand-300 text-white font-medium px-5 py-2.5 rounded-lg text-sm hover:bg-brand-700 transition-colors"
            >
              Call Us
            </a>
          </div>
        </div>

        {/* Related */}
        <div className="border-t border-gray-200 pt-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Related</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Link
              href="/gem-oem-authorization"
              className="border border-gray-200 rounded-lg p-4 hover:border-brand-400 transition-colors"
            >
              <p className="font-medium text-gray-800 text-sm">GeM OEM Authorization</p>
              <p className="text-xs text-gray-500 mt-1">Get your authorization code and letter for GeM reselling</p>
            </Link>
            <Link
              href="/knowledge/government-procurement-guide"
              className="border border-gray-200 rounded-lg p-4 hover:border-brand-400 transition-colors"
            >
              <p className="font-medium text-gray-800 text-sm">Government Procurement Guide</p>
              <p className="text-xs text-gray-500 mt-1">How government buyers procure via GeM</p>
            </Link>
            <Link
              href="/products"
              className="border border-gray-200 rounded-lg p-4 hover:border-brand-400 transition-colors"
            >
              <p className="font-medium text-gray-800 text-sm">Product Range</p>
              <p className="text-xs text-gray-500 mt-1">Full catalog of thermal foggers and agricultural equipment</p>
            </Link>
            <Link
              href="/about"
              className="border border-gray-200 rounded-lg p-4 hover:border-brand-400 transition-colors"
            >
              <p className="font-medium text-gray-800 text-sm">About 100X Circle</p>
              <p className="text-xs text-gray-500 mt-1">Manufacturing authority, certifications, factory</p>
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}
