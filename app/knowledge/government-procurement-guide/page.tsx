import type { Metadata } from "next"
import Link from "next/link"
import { SITE_URL } from "@/lib/seo/site-config"

export const metadata: Metadata = {
  title: "Government Procurement Guide: Buying Fogging Machines via GeM | 100X Circle",
  description:
    "Step-by-step guide for municipal corporations, health departments, and Panchayats to procure fogging machines via Government e-Marketplace (GeM). MSME seller, direct purchase.",
  alternates: { canonical: `${SITE_URL}/knowledge/government-procurement-guide` },
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to Procure Fogging Machines via Government e-Marketplace (GeM)",
  description:
    "Step-by-step guide for government entities to purchase fogging machines from MSME OEM sellers on GeM without a separate tender process.",
  url: `${SITE_URL}/knowledge/government-procurement-guide`,
  author: { "@type": "Organization", name: "100X Circle Pvt Ltd", url: SITE_URL },
  publisher: { "@id": `${SITE_URL}/#organization` },
  step: [
    {
      "@type": "HowToStep",
      position: 1,
      name: "Register or log in to GeM",
      text: "Government buyers (municipal corporations, health departments, Panchayats, etc.) log in to gem.gov.in with their government credentials. First-time buyers need to complete the GeM buyer registration with organization PAN and designation.",
    },
    {
      "@type": "HowToStep",
      position: 2,
      name: "Search for fogging machines",
      text: "Search for 'fogging machine', 'thermal fogger', 'mosquito control machine', or 'vector control equipment'. Filter by product category: Public Health Equipment or Agricultural Equipment.",
    },
    {
      "@type": "HowToStep",
      position: 3,
      name: "Verify seller credentials",
      text: "Check seller type (OEM preferred), MSME status, GeM rating, and certifications (ISO 9001, ISI). 100X Circle is listed as MSME OEM with ISO 9001:2015 certification.",
    },
    {
      "@type": "HowToStep",
      position: 4,
      name: "Choose procurement method",
      text: "For amounts within GeM direct purchase limits: add to cart and place order directly. For larger amounts: use GeM bid/reverse auction for competitive pricing. MSME sellers like 100X Circle get preference in MSME-reserved categories.",
    },
    {
      "@type": "HowToStep",
      position: 5,
      name: "Place order and receive",
      text: "Place order. 100X Circle ships within 5–10 working days for in-stock models. GST invoice and delivery documentation provided. After-sales warranty and spare parts from manufacturer.",
    },
  ],
}

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Can municipal corporations buy fogging machines directly from GeM without tender?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. For purchase amounts within GeM direct purchase thresholds, government buyers can purchase directly from GeM sellers without a separate tender process. The GeM platform itself serves as the tender and verification mechanism. MSME OEM sellers like 100X Circle are GeM-verified.",
      },
    },
    {
      "@type": "Question",
      name: "What is the GeM direct purchase limit for fogging machines?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "GeM direct purchase limits are set by the Government of India and may change. As of 2024, direct purchase (without bid/RA) is typically allowed up to ₹25,000 per order for standard products. For larger orders, GeM reverse auction (RA) or bid is used. Contact your procurement officer for the current applicable threshold for your organization.",
      },
    },
    {
      "@type": "Question",
      name: "Does 100X Circle supply to Nagar Panchayats and small municipalities?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. 100X Circle supplies to municipal corporations (Nagar Nigams), Nagar Palika Parishads, Nagar Panchayats, and gram panchayats through both GeM direct purchase and direct order with government invoice. Contact 100xcircle@gmail.com or +91-7827229116 for procurement support.",
      },
    },
    {
      "@type": "Question",
      name: "What documents does 100X Circle provide for tenders?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "100X Circle can provide: ISO 9001:2015 certificate, CE certificate, ISI/BIS certificate, MSME/UDYAM registration certificate, GeM seller verification, technical specification sheets, GST registration, and sample/demo unit on request. These cover most tender documentation requirements for fogging equipment procurement.",
      },
    },
  ],
}

const STEPS = [
  {
    num: 1,
    title: "Register on GeM as a government buyer",
    body: "Log in to gem.gov.in with government credentials. First-time buyers complete GeM buyer registration with organization PAN and designation. District health officers, municipal commissioners, and procurement officials are eligible.",
  },
  {
    num: 2,
    title: "Search for fogging machines",
    body: "Search keywords: 'fogging machine', 'thermal fogger', 'mosquito control machine', 'vector control equipment', 'thermal fogging machine'. Filter by product category: Public Health Equipment or Agricultural Equipment.",
  },
  {
    num: 3,
    title: "Compare sellers and verify credentials",
    body: "Filter by MSME sellers for MSME procurement preference. Check seller type (OEM = manufacturer, not reseller), GeM ratings, ISO 9001 certification, and product specifications. 100X Circle is listed as MSME OEM with ISO 9001:2015.",
  },
  {
    num: 4,
    title: "Choose procurement method",
    body: "Within GeM direct purchase limits: add to cart and order directly — no tender required. For larger amounts: initiate GeM bid or reverse auction. MSME OEM sellers receive procurement preference under MSME policy.",
  },
  {
    num: 5,
    title: "Place order and receive delivery",
    body: "100X Circle dispatches within 5–10 working days for in-stock models. GST-compliant invoice, e-way bill, and delivery documentation provided. Warranty and spare parts from manufacturer directly.",
  },
]

export default function GovernmentProcurementGuidePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <main className="max-w-3xl mx-auto px-4 py-16 pt-32">
        <nav className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-brand-600">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/knowledge" className="hover:text-brand-600">Knowledge Hub</Link>
          <span className="mx-2">/</span>
          <span>Government Procurement Guide</span>
        </nav>

        <div className="flex flex-wrap gap-2 mb-4">
          {["GeM", "Government", "Procurement"].map((tag) => (
            <span key={tag} className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          Government Procurement Guide: Buying Fogging Machines via GeM
        </h1>
        <p className="text-gray-500 text-sm mb-8">
          By 100X Circle Pvt Ltd · 5 min read · Updated May 2026
        </p>

        <div className="bg-brand-50 border border-brand-200 rounded-xl p-5 mb-8 text-sm text-gray-700">
          <strong>Key point:</strong> Government entities — municipal corporations, health
          departments, Panchayats — can procure fogging machines directly from GeM without a
          separate tender process, for amounts within GeM direct purchase limits. 100X Circle is a
          verified MSME OEM on GeM.
        </div>

        <article className="prose prose-gray max-w-none">
          <h2>What Is GeM and Why It Matters</h2>
          <p>
            The Government e-Marketplace (GeM) is India&apos;s official online procurement
            platform for government buyers. Launched in 2016, GeM allows government departments,
            municipal bodies, PSUs, and autonomous institutions to purchase goods and services
            from verified sellers.
          </p>
          <p>
            For fogging equipment procurement, GeM offers three key advantages over conventional
            tendering:
          </p>
          <ol>
            <li>
              <strong>No separate tender required:</strong> For amounts within GeM direct purchase
              limits, buyers can order directly from verified sellers.
            </li>
            <li>
              <strong>MSME preference:</strong> MSME-registered sellers like 100X Circle receive
              procurement preference — buyers can reserve orders for MSME OEM suppliers.
            </li>
            <li>
              <strong>Transparency:</strong> All prices, seller ratings, and certification details
              are visible on the platform.
            </li>
          </ol>
        </article>

        <div className="my-8 space-y-4">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Step-by-Step: GeM Procurement</h2>
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
          <h2>Eligible Government Buyers</h2>
          <p>The following government entities can procure via GeM:</p>
          <ul>
            <li>Municipal Corporations, Nagar Nigams, Nagar Palika Parishads, Nagar Panchayats</li>
            <li>District health departments and state vector control programmes</li>
            <li>State agricultural departments and Krishi Vigyan Kendras</li>
            <li>Forest and environment departments</li>
            <li>Central government ministries and departments</li>
            <li>Public sector undertakings (PSUs)</li>
            <li>Autonomous bodies and universities funded by government</li>
          </ul>

          <h2>Documents Available from 100X Circle for Tenders</h2>
          <p>
            For tenders that require supporting documents alongside GeM procurement, 100X Circle
            can provide:
          </p>
          <ul>
            <li>ISO 9001:2015 quality management certificate</li>
            <li>CE Marking certificate for export models</li>
            <li>ISI/BIS certification (applicable products)</li>
            <li>MSME/UDYAM registration certificate</li>
            <li>GeM seller verification screenshot</li>
            <li>GST registration and tax compliance documents</li>
            <li>Technical specification sheets</li>
            <li>Sample/demo unit availability on request</li>
          </ul>

          <h2>MSME Procurement Preference</h2>
          <p>
            Under the Public Procurement Policy for MSMEs (Government of India), 25% of
            annual procurement by central government entities must be from MSME sellers. For
            products in MSME-reserved categories, only MSME sellers are eligible to participate.
          </p>
          <p>
            100X Circle is MSME/UDYAM registered. Government buyers procuring from 100X Circle
            on GeM count toward their mandatory MSME procurement targets.
          </p>

          <h2>Frequently Asked Questions</h2>

          <h3>Can municipal corporations buy fogging machines directly from GeM without tender?</h3>
          <p>
            Yes — within GeM direct purchase thresholds, government buyers can order directly from
            GeM-verified sellers without a separate tender. The GeM platform itself serves as the
            procurement verification mechanism.
          </p>

          <h3>What is the GeM direct purchase limit?</h3>
          <p>
            GeM direct purchase limits are set by Government of India policy and may change.
            For larger orders, GeM bid or reverse auction is used. Contact your procurement officer
            for the current applicable threshold.
          </p>

          <h3>Does 100X Circle supply to Nagar Panchayats and small municipalities?</h3>
          <p>
            Yes. 100X Circle supplies to all tiers of municipal bodies — Nagar Nigams, Nagar
            Palika Parishads, Nagar Panchayats, and gram panchayats — through GeM and direct order.
          </p>

          <h3>What documents does 100X Circle provide for tenders?</h3>
          <p>
            ISO 9001:2015, CE certificate, ISI/BIS certificate, MSME/UDYAM certificate, GeM
            verification, technical specs, GST registration, and demo unit on request.
          </p>
        </article>

        <div className="mt-10 bg-brand-50 border border-brand-200 rounded-xl p-5 text-sm">
          <h2 className="font-semibold text-brand-800 mb-3">Contact for Government Procurement</h2>
          <p className="text-brand-700 mb-3">
            100X Circle provides dedicated support for government procurement inquiries — GeM
            order assistance, tender documentation, demo units, L1 quotations, and bulk pricing.
          </p>
          <div className="grid sm:grid-cols-2 gap-2 text-brand-800 font-medium">
            <span>Phone: +91-7827229116</span>
            <span>WhatsApp: +91-7827229116</span>
            <span>Email: 100xcircle@gmail.com</span>
            <span>GeM: gem.gov.in (search &quot;100X Circle&quot;)</span>
          </div>
        </div>

        <div className="mt-8 border-t border-gray-200 pt-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Related Articles</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Link
              href="/knowledge/mosquito-control-india"
              className="border border-gray-200 rounded-lg p-4 hover:border-green-400 transition-colors"
            >
              <p className="font-medium text-gray-800 text-sm">Mosquito Control in India</p>
              <p className="text-xs text-gray-500 mt-1">Municipal operations and outbreak response</p>
            </Link>
            <Link
              href="/ai/government-supplies"
              className="border border-gray-200 rounded-lg p-4 hover:border-green-400 transition-colors"
            >
              <p className="font-medium text-gray-800 text-sm">100X Circle Government Supply Profile</p>
              <p className="text-xs text-gray-500 mt-1">States served, buyer types, tender support</p>
            </Link>
            <Link
              href="/gem-oem-authorization"
              className="border border-gray-200 rounded-lg p-4 hover:border-green-400 transition-colors"
            >
              <p className="font-medium text-gray-800 text-sm">GeM OEM Authorization for Dealers</p>
              <p className="text-xs text-gray-500 mt-1">Get authorization code and letter to resell on GeM</p>
            </Link>
            <Link
              href="/become-a-dealer"
              className="border border-gray-200 rounded-lg p-4 hover:border-green-400 transition-colors"
            >
              <p className="font-medium text-gray-800 text-sm">Become an Authorized Dealer</p>
              <p className="text-xs text-gray-500 mt-1">Dealer program, GeM reseller benefits, and how to apply</p>
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}
