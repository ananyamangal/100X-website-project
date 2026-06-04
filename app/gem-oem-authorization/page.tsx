import type { Metadata } from "next"
import Link from "next/link"
import { SITE_URL, BUSINESS } from "@/lib/seo/site-config"

export const metadata: Metadata = {
  title: "GeM OEM Authorization for Dealers | 100X Circle — Fogging Machine OEM",
  description:
    "Get OEM authorization from 100X Circle to sell fogging machines on GeM as an authorized reseller. MSME OEM, ISO 9001:2015, GeM-listed. Apply for dealer authorization code today.",
  keywords: [
    "GeM OEM authorization",
    "OEM authorization letter fogging machine",
    "GeM OEM authorization code",
    "fogging machine GeM reseller",
    "GeM dealer authorization India",
    "OEM authorization certificate GeM",
    "thermal fogging machine authorized dealer",
    "GeM reseller fogging machine India",
  ],
  alternates: { canonical: `${SITE_URL}/gem-oem-authorization` },
  openGraph: {
    title: "GeM OEM Authorization for Dealers | 100X Circle",
    description:
      "Become an authorized 100X Circle reseller on GeM. Get your OEM authorization code, letter, and tender support from India's ISO-certified fogging machine manufacturer.",
    url: `${SITE_URL}/gem-oem-authorization`,
    type: "website",
  },
}

const jsonLdHowTo = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to Get OEM Authorization from 100X Circle for GeM Reselling",
  description:
    "Step-by-step process for dealers and resellers to obtain OEM authorization from 100X Circle to sell fogging machines on GeM as an authorized reseller.",
  url: `${SITE_URL}/gem-oem-authorization`,
  author: { "@type": "Organization", name: "100X Circle Pvt Ltd", url: SITE_URL },
  publisher: { "@id": `${SITE_URL}/#organization` },
  step: [
    {
      "@type": "HowToStep",
      position: 1,
      name: "Submit your dealer inquiry",
      text: "Contact 100X Circle via phone, WhatsApp, or email. Provide your GST number, GeM Seller ID, business name, and the state(s) you plan to cover. WhatsApp: +91-7827229116 or Email: 100xcircle@gmail.com.",
    },
    {
      "@type": "HowToStep",
      position: 2,
      name: "Verification and onboarding",
      text: "100X Circle verifies your GeM seller registration and business credentials. This typically takes 2–3 working days. You may be asked for business registration documents.",
    },
    {
      "@type": "HowToStep",
      position: 3,
      name: "Receive OEM authorization code",
      text: "Once approved, 100X Circle issues your unique OEM Authorization Code on the GeM portal. You also receive a signed OEM Authorization Letter on company letterhead for tender submissions.",
    },
    {
      "@type": "HowToStep",
      position: 4,
      name: "Pair catalog on GeM",
      text: "Log in to your GeM seller account. Navigate to OEM Reseller panel and enter the authorization code provided by 100X Circle. This links the 100X Circle product catalog to your reseller account.",
    },
    {
      "@type": "HowToStep",
      position: 5,
      name: "Start bidding on GeM tenders",
      text: "With the paired catalog, you can now bid on GeM tenders for fogging machines as an authorized reseller of 100X Circle. Use the OEM Authorization Letter in bid submissions where required.",
    },
  ],
}

const jsonLdFaq = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is a GeM OEM authorization code for fogging machines?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "On GeM, resellers can only sell products if the OEM (manufacturer) grants them an authorization code through the GeM OEM panel. 100X Circle, as an MSME OEM, can issue this code to approved resellers, allowing them to list and sell 100X Circle fogging machines on GeM under their seller account.",
      },
    },
    {
      "@type": "Question",
      name: "Does 100X Circle provide OEM authorization letters for government tenders?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. 100X Circle provides signed OEM Authorization Letters on company letterhead for dealers bidding on government tenders and GeM bids. The letter certifies that the dealer is an authorized reseller of 100X Circle products. Contact 100xcircle@gmail.com or call +91-7827229116.",
      },
    },
    {
      "@type": "Question",
      name: "What is the eligibility to become a 100X Circle GeM reseller?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "To become a 100X Circle GeM reseller, you need: (1) Active GeM seller registration, (2) Valid GST registration, (3) Prior experience in pest control, public health, or equipment supply is preferred but not mandatory. Contact 100X Circle to discuss your territory and requirements.",
      },
    },
    {
      "@type": "Question",
      name: "Can I bid on municipal corporation tenders with 100X Circle's OEM authorization?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. With a 100X Circle OEM authorization letter, you can bid on municipal corporation tenders, Nagar Nigam procurement, state health department tenders, and GeM bids for fogging machines. 100X Circle's products comply with IS 14855 (Part 1) and carry ISO 9001:2015 certification, making them eligible for government procurement.",
      },
    },
    {
      "@type": "Question",
      name: "Is 100X Circle registered as an MSME OEM on GeM?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. 100X Circle Pvt Ltd is registered as an MSME OEM on GeM (Government e-Marketplace). This means resellers authorized by 100X Circle can benefit from MSME procurement preference — the Government of India mandates 25% of central government procurement from MSME sellers.",
      },
    },
    {
      "@type": "Question",
      name: "How long does it take to get OEM authorization from 100X Circle?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Standard processing time is 2–5 working days after submission of required documents (GeM seller ID, GST certificate, business registration). Urgent authorization for active tenders can often be expedited. Contact +91-7827229116 for urgent requests.",
      },
    },
  ],
}

const STEPS = [
  {
    num: 1,
    title: "Submit dealer inquiry",
    body: "Contact us via WhatsApp, phone, or email. Share your GeM Seller ID, GST number, and the state(s) you operate in. No registration fee.",
  },
  {
    num: 2,
    title: "Verification (2–3 working days)",
    body: "We verify your GeM registration and business credentials. We may request GST certificate and business registration documents.",
  },
  {
    num: 3,
    title: "Receive authorization code + letter",
    body: "You get your OEM authorization code via GeM portal AND a signed authorization letter on 100X Circle letterhead for use in tender submissions.",
  },
  {
    num: 4,
    title: "Pair catalog on GeM",
    body: "Enter the code in your GeM reseller panel to pair the 100X Circle product catalog. You can now list and sell our products on GeM.",
  },
  {
    num: 5,
    title: "Bid on government tenders",
    body: "Start bidding on fogging machine tenders for municipal corporations, health departments, Nagar Panchayats, and other government buyers across India.",
  },
]

const BENEFITS = [
  {
    title: "MSME OEM — 25% procurement preference",
    body: "100X Circle is MSME registered. Government buyers procuring through you count toward their mandatory MSME targets — giving you a competitive edge in bids.",
  },
  {
    title: "ISO 9001:2015 & IS 14855 compliant",
    body: "Our machines carry ISO 9001 quality certification and comply with IS 14855 (Part 1) — the Indian standard for fogging machines. Accepted in virtually all government tenders.",
  },
  {
    title: "Full tender documentation support",
    body: "ISO certificate, MSME/UDYAM certificate, CE certificate, technical spec sheets, GST registration — everything you need to submit a complete tender bid.",
  },
  {
    title: "Pan-India supply, 5–10 day dispatch",
    body: "Factory at IMT Manesar, Gurugram. We dispatch to any state in India within 5–10 working days for in-stock models. No supply chain surprises during active tenders.",
  },
  {
    title: "Competitive pricing — beat Korean imports",
    body: "Indian-made, Indian-priced. 100X Circle machines are 3–5× lower cost than Korean and German imports. You bid at better prices and still earn strong margins.",
  },
  {
    title: "Dedicated reseller support",
    body: "Dedicated support for active GeM bids: L1 quotations, specification matching, bulk pricing, and technical clarifications — all available on request.",
  },
]

export default function GemOemAuthorizationPage() {
  const waLink = `https://wa.me/${BUSINESS.whatsappE164}?text=${encodeURIComponent("Hi, I want to become an authorized 100X Circle GeM reseller. My GeM Seller ID is:")}`

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdHowTo) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }}
      />

      <main className="max-w-3xl mx-auto px-4 py-16 pt-32">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-brand-600">Home</Link>
          <span className="mx-2">/</span>
          <span>GeM OEM Authorization</span>
        </nav>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          {["GeM", "OEM Authorization", "Dealer", "Reseller"].map((tag) => (
            <span key={tag} className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
        </div>

        {/* Hero */}
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          GeM OEM Authorization for Fogging Machine Dealers
        </h1>
        <p className="text-gray-500 text-sm mb-2">
          By 100X Circle Pvt Ltd · MSME OEM · GeM Listed · ISO 9001:2015 Certified
        </p>
        <p className="text-gray-600 text-lg mb-8 leading-relaxed">
          Are you a GeM seller looking to bid on fogging machine tenders? Get your OEM
          authorization code and authorization letter from 100X Circle — India&apos;s
          MSME-registered, ISO-certified thermal fogging machine manufacturer.
        </p>

        {/* CTA Box */}
        <div className="bg-brand-600 rounded-xl p-6 mb-10 text-white">
          <h2 className="font-bold text-xl mb-2">Apply for GeM Dealer Authorization</h2>
          <p className="text-brand-100 text-sm mb-4">
            Share your GeM Seller ID and GST number. We verify and issue authorization within
            2–5 working days.
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
              href={`mailto:${BUSINESS.email}?subject=GeM OEM Authorization Request`}
              className="inline-flex items-center justify-center gap-2 border border-brand-300 text-white font-medium px-5 py-2.5 rounded-lg text-sm hover:bg-brand-700 transition-colors"
            >
              Email: {BUSINESS.email}
            </a>
          </div>
        </div>

        {/* What is GeM OEM Authorization */}
        <article className="prose prose-gray max-w-none">
          <h2>What Is GeM OEM Authorization?</h2>
          <p>
            On Government e-Marketplace (GeM), product categories are divided into two groups:
            direct OEM listings and reseller listings. To sell as a reseller, you must be
            authorized by the product&apos;s OEM (Original Equipment Manufacturer) through the
            GeM OEM panel.
          </p>
          <p>
            The OEM issues you an <strong>authorization code</strong> via the GeM portal. You
            enter this code in your reseller account to pair the OEM&apos;s product catalog with
            your seller profile. Without this code, you cannot list or sell that brand&apos;s
            products on GeM.
          </p>
          <p>
            For tender submissions, the OEM also provides a signed{" "}
            <strong>OEM Authorization Letter</strong> — a formal document on company letterhead
            certifying you as an authorized dealer. Most government tenders require this letter
            as mandatory bid documentation.
          </p>

          <h2>Why Choose 100X Circle as Your OEM Partner?</h2>
        </article>

        {/* Benefits Grid */}
        <div className="my-6 grid sm:grid-cols-2 gap-4">
          {BENEFITS.map((b) => (
            <div key={b.title} className="border border-gray-200 rounded-xl p-4">
              <h3 className="font-semibold text-gray-800 text-sm mb-1">{b.title}</h3>
              <p className="text-xs text-gray-600 leading-relaxed">{b.body}</p>
            </div>
          ))}
        </div>

        {/* Process Steps */}
        <h2 className="text-xl font-semibold text-gray-800 mb-4 mt-8">
          How to Get Your OEM Authorization
        </h2>
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

        {/* What documents we provide */}
        <article className="prose prose-gray max-w-none">
          <h2>Documents Provided to Authorized Resellers</h2>
          <p>
            Once authorized, 100X Circle provides the following documents for your tender and
            GeM bid submissions:
          </p>
          <ul>
            <li>
              <strong>OEM Authorization Code</strong> — issued via GeM portal for catalog pairing
            </li>
            <li>
              <strong>OEM Authorization Letter</strong> — signed, on company letterhead, valid
              for specific bid or open-ended based on agreement
            </li>
            <li>ISO 9001:2015 quality management certificate</li>
            <li>MSME/UDYAM registration certificate</li>
            <li>CE Marking certificate (for export-grade models)</li>
            <li>ISI/BIS certificate (applicable models)</li>
            <li>Technical specification sheets (IS 14855 compliant)</li>
            <li>GeM seller verification screenshot</li>
            <li>GST registration documents</li>
          </ul>

          <h2>IS 14855 Compliance</h2>
          <p>
            Government tenders for fogging machines — particularly from municipal corporations,
            Nagar Nigams, and health departments — frequently specify IS 14855 (Part 1) as the
            required Indian Standard. 100X Circle products are manufactured to comply with IS
            14855 (Part 1), the Bureau of Indian Standards specification for power-operated
            fogging machines.
          </p>
          <p>
            As an authorized reseller, you can quote IS 14855-compliant machines and include
            100X Circle&apos;s compliance documentation in your bid.
          </p>

          <h2>MSME Preference in Government Procurement</h2>
          <p>
            The Government of India&apos;s Public Procurement Policy mandates that 25% of annual
            procurement by central government entities must come from MSME sellers. For certain
            product categories, procurement is reserved exclusively for MSME sellers.
          </p>
          <p>
            100X Circle is MSME/UDYAM registered. When you bid as an authorized reseller of an
            MSME OEM, your bids may qualify under MSME procurement preference — significantly
            improving your chances in government and GeM tenders.
          </p>
        </article>

        {/* FAQ */}
        <div className="mt-8 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              {
                q: "What is the cost to get OEM authorization from 100X Circle?",
                a: "There is no authorization fee. 100X Circle charges no fee to issue OEM authorization codes or authorization letters to qualified dealers. Your revenue comes from the margin on products you sell.",
              },
              {
                q: "Can I get authorization for a single tender, or is it ongoing?",
                a: "Both options are available. We can issue a single-bid authorization letter for a specific tender, or a general authorization for ongoing GeM reselling. Discuss your requirement when you contact us.",
              },
              {
                q: "What territory does authorization cover?",
                a: "Territory is discussed on a case-by-case basis. We currently have active resellers in multiple states. We work to avoid direct channel conflict. Contact us to discuss your target states.",
              },
              {
                q: "Do I need to stock machines, or can I bid and then order?",
                a: "You can bid on GeM without holding stock. Once a tender is awarded, place your purchase order with 100X Circle. We dispatch within 5–10 working days for in-stock models. For large orders, discuss delivery timelines at the inquiry stage.",
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
          <h2 className="font-bold text-xl mb-1">Ready to Apply for OEM Authorization?</h2>
          <p className="text-brand-100 text-sm mb-1">Active tender deadline? We can expedite to 1 working day.</p>
          <p className="text-brand-200 text-xs mb-4">Send your GeM Seller ID + GST number. No fee. No commitment.</p>
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
              href={`mailto:${BUSINESS.email}?subject=GeM OEM Authorization Request`}
              className="inline-flex items-center justify-center gap-2 border border-brand-300 text-white font-medium px-5 py-2.5 rounded-lg text-sm hover:bg-brand-700 transition-colors"
            >
              Email Us
            </a>
          </div>
        </div>

        {/* Related links */}
        <div className="border-t border-gray-200 pt-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Related Resources</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Link
              href="/become-a-dealer"
              className="border border-gray-200 rounded-lg p-4 hover:border-brand-400 transition-colors"
            >
              <p className="font-medium text-gray-800 text-sm">Become an Authorized Dealer</p>
              <p className="text-xs text-gray-500 mt-1">Dealer program, benefits, and how to apply</p>
            </Link>
            <Link
              href="/knowledge/government-procurement-guide"
              className="border border-gray-200 rounded-lg p-4 hover:border-brand-400 transition-colors"
            >
              <p className="font-medium text-gray-800 text-sm">Government Procurement Guide</p>
              <p className="text-xs text-gray-500 mt-1">How government buyers procure via GeM</p>
            </Link>
            <Link
              href="/knowledge/gem-oem-authorization-process"
              className="border border-gray-200 rounded-lg p-4 hover:border-brand-400 transition-colors"
            >
              <p className="font-medium text-gray-800 text-sm">GeM OEM Authorization Process</p>
              <p className="text-xs text-gray-500 mt-1">Complete guide to GeM authorization for resellers</p>
            </Link>
            <Link
              href="/ai/government-supplies"
              className="border border-gray-200 rounded-lg p-4 hover:border-brand-400 transition-colors"
            >
              <p className="font-medium text-gray-800 text-sm">100X Circle Government Supply Profile</p>
              <p className="text-xs text-gray-500 mt-1">States served, buyer types, procurement track record</p>
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}
