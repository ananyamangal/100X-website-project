import type { Metadata } from "next"
import Link from "next/link"
import { SITE_URL, BUSINESS } from "@/lib/seo/site-config"

export const metadata: Metadata = {
  title: "Fogging Machine for Government Procurement — GeM OEM, IS 14855, MSME | 100X Circle",
  description:
    "Procure IS 14855-compliant thermal fogging machines via GeM from India's MSME OEM manufacturer. Municipal corporations, health departments, Panchayats, defence. L1 quotation, tender documentation, pan-India supply from Gurugram factory.",
  keywords: [
    "fogging machine government procurement",
    "fogging machine GeM tender",
    "fogging machine municipal corporation",
    "fogging machine health department India",
    "IS 14855 fogging machine government",
    "MSME OEM fogging machine GeM",
    "fogging machine tender documentation India",
    "fogging machine Nagar Nigam procurement",
    "government fogging machine supplier India",
    "fogging machine Panchayat GeM",
  ],
  alternates: { canonical: `${SITE_URL}/fogging-machine-government-procurement` },
  openGraph: {
    title: "Fogging Machines for Government Procurement — GeM OEM | 100X Circle",
    description:
      "IS 14855-compliant thermal fogging machines for municipal corporations, health departments, and Panchayats. GeM direct purchase, MSME OEM, tender documentation ready. 100X Circle Pvt Ltd.",
    url: `${SITE_URL}/fogging-machine-government-procurement`,
    type: "website",
  },
}

const jsonLdProduct = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "Fogging Machine for Government Procurement — IS 14855 Compliant",
  description:
    "IS 14855 (Part 1)-compliant thermal fogging machines manufactured by 100X Circle Pvt Ltd. Suitable for municipal corporations, state health departments, Nagar Panchayats, and other government bodies. Procure directly via GeM (Government e-Marketplace).",
  brand: { "@type": "Brand", name: "100X Circle" },
  manufacturer: {
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: "100X Circle Pvt Ltd",
    address: {
      "@type": "PostalAddress",
      streetAddress: "UG, 398, Sector 7, IMT Manesar",
      addressLocality: "Gurugram",
      addressRegion: "Haryana",
      postalCode: "122050",
      addressCountry: "IN",
    },
  },
  offers: {
    "@type": "AggregateOffer",
    priceCurrency: "INR",
    lowPrice: "6500",
    highPrice: "350000",
    offerCount: "8",
    availability: "https://schema.org/InStock",
    seller: { "@type": "Organization", name: "100X Circle Pvt Ltd" },
  },
  url: `${SITE_URL}/fogging-machine-government-procurement`,
}

const jsonLdFaq = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Can government bodies procure fogging machines directly on GeM without a tender?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Municipal corporations, Nagar Panchayats, health departments, and other government entities can purchase 100X Circle fogging machines directly on GeM (gem.gov.in) without issuing a separate tender, within GeM's direct purchase financial limits. Log in to gem.gov.in, search '100X Circle' or 'fogging machine IS 14855', and place a direct purchase order. For amounts above GeM direct purchase thresholds, initiate a GeM bid or public tender.",
      },
    },
    {
      "@type": "Question",
      name: "Is IS 14855 compliance documentation available for tender submissions?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. 100X Circle provides full IS 14855 (Part 1) compliance documentation including technical specification sheets, BIS/ISI mark certificates, ISO 9001:2015 certificate, MSME/UDYAM certificate, and GeM seller verification — all available for inclusion in tender bid documents. Contact 100xcircle@gmail.com or call +91-7827229116.",
      },
    },
    {
      "@type": "Question",
      name: "What MSME procurement benefits apply when buying from 100X Circle?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "100X Circle is MSME/UDYAM registered. Government procurement from 100X Circle counts toward the mandatory 25% MSME procurement target under the Government of India's Public Procurement Policy for MSME. In cases where an MSME L1 bidder is within a price band of the non-MSME L1, MSME preference rules may apply. Additionally, some fogging machine tender categories are reserved exclusively for MSME sellers.",
      },
    },
    {
      "@type": "Question",
      name: "What is the delivery timeline for bulk government orders?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Standard dispatch is 5–10 working days for in-stock models from our Gurugram factory. For bulk orders (10+ units), discuss delivery schedule at the inquiry stage. We have fulfilled state-level orders with phased deliveries. Contact +91-7827229116 for bulk order commitments before tender submission.",
      },
    },
    {
      "@type": "Question",
      name: "Do you supply vehicle-mounted fogging machines for municipal corporations?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. 100X Circle manufactures vehicle-mounted fogging machines designed for municipal ward-level mosquito control drives. These can be mounted on pickup trucks or tempo travellers. GeM-listed, IS 14855-compliant. Suitable for Nagar Nigams and large municipal corporations. Contact us with your vehicle type and coverage area for a quote.",
      },
    },
    {
      "@type": "Question",
      name: "Can procurement officers request a tender quotation or L1 quote?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. 100X Circle provides L1 quotations on company letterhead with GST for government tenders. Share your tender specifications via WhatsApp (+91-7827229116) or email (100xcircle@gmail.com) and we will provide a formal quotation with all required documents within 24 hours of receiving the specification.",
      },
    },
    {
      "@type": "Question",
      name: "Are fogging machines from 100X Circle accepted by state health departments?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. 100X Circle has supplied to state health departments and district health offices. Our machines meet IS 14855 (Part 1) — the BIS standard for power-operated fogging machines — and carry ISO 9001:2015 quality certification. These are the two most commonly specified standards in state health department tender documents for fogging equipment.",
      },
    },
  ],
}

const jsonLdBreadcrumb = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
    {
      "@type": "ListItem",
      position: 2,
      name: "Government Procurement",
      item: `${SITE_URL}/fogging-machine-government-procurement`,
    },
  ],
}

const TRUST_BADGES = [
  { label: "IS 14855 (Part 1)", sub: "BIS Indian Standard" },
  { label: "ISO 9001:2015", sub: "Quality Management" },
  { label: "MSME / UDYAM", sub: "Ministry of MSME, GoI" },
  { label: "GeM OEM Seller", sub: "gem.gov.in" },
  { label: "ISI Mark", sub: "BIS Certified Models" },
  { label: "CE Mark", sub: "Export-grade Models" },
]

const BUYER_TYPES = [
  {
    type: "Municipal Corporations & Nagar Nigams",
    icon: "🏛",
    use: "Ward-level mosquito control drives, dengue/malaria fogging campaigns",
    product: "Vehicle-mounted foggers, double-barrel foggers",
    tender: "Open tender or GeM bid above threshold",
  },
  {
    type: "Health Departments",
    icon: "🏥",
    use: "Emergency outbreak response, vector control programmes",
    product: "Thermal foggers, vehicle-mounted systems",
    tender: "GeM direct purchase or district health office tender",
  },
  {
    type: "Nagar Panchayats & Gram Panchayats",
    icon: "🌿",
    use: "Local mosquito control, seasonal fogging drives",
    product: "Portable thermal foggers, ISI-marked models",
    tender: "GeM direct purchase (no tender below threshold)",
  },
  {
    type: "Defence & Canteen Stores",
    icon: "🛡",
    use: "Cantonment hygiene, vector control in military facilities",
    product: "Portable and vehicle-mounted foggers",
    tender: "Direct inquiry, rate contract, or DGS&D route",
  },
]

const TENDER_DOCS = [
  "IS 14855 (Part 1) compliance declaration",
  "ISO 9001:2015 quality management certificate",
  "MSME / UDYAM registration certificate",
  "BIS / ISI mark certificate (applicable models)",
  "CE Marking certificate (export-grade models)",
  "GST registration certificate",
  "GeM seller verification screenshot",
  "Technical specification sheets (model-wise)",
  "L1 quotation on company letterhead with GST",
  "OEM Authorization Letter (for dealer bids)",
]

const STATES_SERVED = [
  "Delhi", "Haryana", "Uttar Pradesh", "Bihar", "Maharashtra",
  "Gujarat", "Rajasthan", "Punjab", "Himachal Pradesh",
  "Madhya Pradesh", "Karnataka", "Tamil Nadu", "West Bengal",
  "Odisha", "Jharkhand",
]

const GEM_STEPS = [
  {
    num: 1,
    title: "Log in to gem.gov.in",
    body: "Use your government buyer credentials. Municipal corporations, health departments, Panchayats, and all government bodies with a GeM buyer account are eligible.",
  },
  {
    num: 2,
    title: "Search '100X Circle' or 'fogging machine IS 14855'",
    body: "Filter by MSME seller to apply procurement preference. Our product listings show model specs, price, and compliance certifications.",
  },
  {
    num: 3,
    title: "Select model and place order",
    body: "Choose your model based on area coverage and ward count. For uncertainty, contact us before placing the order — we recommend the right configuration.",
  },
  {
    num: 4,
    title: "We confirm and dispatch in 5–10 working days",
    body: "Order is fulfilled from our Gurugram factory. GST invoice and delivery documentation provided for your records and audit compliance.",
  },
]

export default function GovernmentProcurementPage() {
  const waTenderQuote = `https://wa.me/${BUSINESS.whatsappE164}?text=${encodeURIComponent(
    "Hi, I am a government procurement officer and want to procure fogging machines. Please share IS 14855 documentation, GeM listing details, and L1 quotation."
  )}`
  const waOemTeam = `https://wa.me/${BUSINESS.whatsappE164}?text=${encodeURIComponent(
    "Hi, I want to speak to the 100X Circle OEM team about a government supply requirement."
  )}`

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdProduct) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumb) }} />

      <main className="max-w-3xl mx-auto px-4 py-16 pt-32">

        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-brand-600">Home</Link>
          <span className="mx-2">/</span>
          <span>Government Procurement</span>
        </nav>

        {/* Audience tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          {["Government Buyer", "GeM Direct Purchase", "IS 14855", "MSME OEM", "Tender Ready"].map((t) => (
            <span key={t} className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">{t}</span>
          ))}
        </div>

        {/* H1 */}
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          Fogging Machines for Municipal Corporations, Health Departments &amp; Panchayats — GeM OEM
        </h1>
        <p className="text-gray-500 text-sm mb-2">
          100X Circle Pvt Ltd · MSME OEM Manufacturer · IS 14855 (Part 1) · ISO 9001:2015 · GeM Seller · Made in Gurugram
        </p>
        <p className="text-gray-600 text-lg mb-6 leading-relaxed">
          India&apos;s MSME-registered OEM manufacturer of IS 14855-compliant thermal fogging machines.
          Procure directly on GeM without a separate tender. Full tender documentation pack, L1 quotations,
          and pan-India supply from factory within 5–10 working days.
        </p>

        {/* GeM direct purchase callout */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 text-sm text-green-800">
          <strong>GeM Direct Purchase Available:</strong> Government buyers can procure 100X Circle fogging
          machines directly at gem.gov.in — no separate public tender required within GeM financial limits.
          Search <span className="font-mono bg-green-100 px-1 rounded">&quot;100X Circle&quot;</span> or{" "}
          <span className="font-mono bg-green-100 px-1 rounded">&quot;fogging machine IS 14855&quot;</span>.
        </div>

        {/* Trust badges */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
          {TRUST_BADGES.map((b) => (
            <div key={b.label} className="border border-gray-200 rounded-lg px-3 py-2.5 text-center">
              <p className="text-xs font-semibold text-gray-800">{b.label}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">{b.sub}</p>
            </div>
          ))}
        </div>

        {/* ── PRIMARY CTA ── */}
        <div className="bg-brand-600 rounded-xl p-6 mb-10 text-white">
          <h2 className="font-bold text-xl mb-1">Request Tender Quote</h2>
          <p className="text-brand-100 text-sm mb-1">
            Share your tender specs or ward details — we provide L1 quotation + full documentation pack within 24 hours.
          </p>
          <p className="text-brand-200 text-xs mb-4">
            Required: approx. quantity · area covered · delivery state · tender deadline (if applicable)
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href={waTenderQuote}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-white text-brand-700 font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-brand-50 transition-colors"
            >
              WhatsApp: Request Tender Quote
            </a>
            <a
              href={`mailto:${BUSINESS.email}?subject=Government Fogging Machine Tender Enquiry`}
              className="inline-flex items-center justify-center gap-2 border border-brand-300 text-white font-medium px-5 py-2.5 rounded-lg text-sm hover:bg-brand-700 transition-colors"
            >
              Email Tender Enquiry
            </a>
          </div>
        </div>

        {/* Buyer types */}
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Government Buyer Types Served</h2>
        <div className="space-y-3 mb-10">
          {BUYER_TYPES.map((b) => (
            <div key={b.type} className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0 mt-0.5">{b.icon}</span>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800 text-sm mb-1">{b.type}</h3>
                  <p className="text-xs text-gray-600 mb-1"><span className="font-medium">Use:</span> {b.use}</p>
                  <p className="text-xs text-gray-600 mb-1"><span className="font-medium">Typical products:</span> {b.product}</p>
                  <p className="text-xs text-gray-500"><span className="font-medium">Procurement route:</span> {b.tender}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* GeM procurement process */}
        <h2 className="text-xl font-semibold text-gray-800 mb-4">How to Procure on GeM</h2>
        <div className="space-y-4 mb-10">
          {GEM_STEPS.map((s) => (
            <div key={s.num} className="flex gap-4 border border-gray-200 rounded-xl p-5">
              <div className="flex-shrink-0 w-8 h-8 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                {s.num}
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-1 text-sm">{s.title}</h3>
                <p className="text-sm text-gray-600">{s.body}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tender documentation pack */}
        <div className="border border-gray-200 rounded-xl p-5 mb-10">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Tender Documentation Pack</h2>
          <p className="text-sm text-gray-500 mb-4">
            All documents available at no cost. Provided within 24 hours of enquiry.
          </p>
          <ul className="space-y-2">
            {TENDER_DOCS.map((doc) => (
              <li key={doc} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-green-600 font-bold flex-shrink-0 mt-0.5">✓</span>
                {doc}
              </li>
            ))}
          </ul>
        </div>

        {/* MSME advantage block */}
        <article className="prose prose-gray max-w-none mb-10">
          <h2>MSME Advantage in Government Tenders</h2>
          <p>
            The Government of India&apos;s Public Procurement Policy mandates that at least{" "}
            <strong>25% of annual central government procurement</strong> must originate from
            MSME sellers. Certain product categories are reserved exclusively for MSME vendors.
          </p>
          <p>
            100X Circle Pvt Ltd is <strong>MSME/UDYAM registered</strong>. Procuring from us
            counts toward your ministry or department&apos;s MSME procurement target. In competitive
            bids, MSME L1 preference rules may allow procurement from 100X Circle even when a
            marginally lower non-MSME quote exists.
          </p>

          <h2>IS 14855 (Part 1) — The Government Standard for Fogging Machines</h2>
          <p>
            Bureau of Indian Standards IS 14855 (Part 1) is the mandatory product standard
            specified by most municipal corporations, health departments, and Nagar Nigams in
            their tender documents for power-operated fogging machines.
          </p>
          <p>
            100X Circle manufactures to IS 14855 (Part 1) specifications. All relevant models
            carry ISI/BIS mark certification and full compliance documentation. Our machines
            are accepted in government tenders across{" "}
            <strong>{STATES_SERVED.length} major states</strong>.
          </p>

          <h2>Pan-India Supply from Gurugram Factory</h2>
          <p>
            Manufacturing facility at IMT Manesar, Gurugram (Haryana) — Haryana&apos;s largest
            industrial township. We supply to all major Indian states with standard dispatch
            within 5–10 working days. For large government orders, phased delivery schedules
            are available.
          </p>
        </article>

        {/* States served */}
        <div className="border border-gray-200 rounded-xl p-5 mb-10">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            States Served — Government Supply
          </h2>
          <div className="flex flex-wrap gap-2">
            {STATES_SERVED.map((s) => (
              <span key={s} className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full">
                {s}
              </span>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Supply to all states. Above reflects documented government buyer distribution.
          </p>
        </div>

        {/* FAQ */}
        <div className="mb-10">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            FAQ — Government Procurement Officers
          </h2>
          <div className="space-y-3">
            {[
              {
                q: "Can we procure directly on GeM without issuing a public tender?",
                a: "Yes. Within GeM direct purchase financial limits, government bodies can purchase directly from 100X Circle on gem.gov.in without a separate public tender. For higher amounts, initiate a GeM bid or public tender — we participate in both. Contact us before tender floating for spec alignment.",
              },
              {
                q: "What is your delivery commitment for tender-awarded orders?",
                a: "Standard: 5–10 working days from purchase order for in-stock models. Bulk or custom orders: 15–25 working days depending on quantity. We provide a written delivery commitment before your tender submission on request. Call +91-7827229116 to discuss your timeline.",
              },
              {
                q: "Are demo units available for evaluation before bulk procurement?",
                a: "Yes. Demo units are available for serious institutional inquiries. Contact us with your department details and location. We can arrange a demonstration at your office or municipal facility in select cities.",
              },
              {
                q: "Do you provide an AMC (Annual Maintenance Contract) for government buyers?",
                a: "Yes. AMC is available for bulk government procurement. AMC scope: annual servicing, spare parts, operator training refresher, and priority call support. Contact us for AMC terms when placing bulk orders.",
              },
              {
                q: "Can our authorized dealer submit the bid using your OEM authorization?",
                a: "Yes. If a local dealer is submitting the tender on your behalf or bidding as a GeM reseller, we issue an OEM Authorization Letter and GeM authorization code to the dealer. The end buyer (government body) still gets 100X Circle products at OEM-backed quality and after-sales.",
              },
            ].map(({ q, a }) => (
              <details key={q} className="border border-gray-200 rounded-xl">
                <summary className="p-4 font-medium text-gray-800 cursor-pointer text-sm">
                  {q}
                </summary>
                <p className="px-4 pb-4 text-sm text-gray-600 leading-relaxed">{a}</p>
              </details>
            ))}
          </div>
        </div>

        {/* ── SECONDARY CTA ── */}
        <div className="border border-brand-200 bg-brand-50 rounded-xl p-6 mb-10">
          <h2 className="font-bold text-lg text-brand-800 mb-1">Talk to the OEM Team</h2>
          <p className="text-sm text-brand-700 mb-4">
            For rate contracts, large-volume pricing, delivery guarantees, or pre-bid spec
            clarification — speak directly with our government sales team.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href={waOemTeam}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-brand-600 text-white font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-brand-700 transition-colors"
            >
              WhatsApp: +91-7827229116
            </a>
            <a
              href={`tel:${BUSINESS.phonePrimary}`}
              className="inline-flex items-center justify-center gap-2 border border-brand-300 text-brand-700 font-medium px-5 py-2.5 rounded-lg text-sm hover:bg-brand-100 transition-colors"
            >
              Call: {BUSINESS.phonePrimary}
            </a>
            <a
              href={`tel:${BUSINESS.phoneSecondary}`}
              className="inline-flex items-center justify-center gap-2 border border-brand-300 text-brand-700 font-medium px-5 py-2.5 rounded-lg text-sm hover:bg-brand-100 transition-colors"
            >
              Alt: {BUSINESS.phoneSecondary}
            </a>
          </div>
        </div>

        {/* Related links */}
        <div className="border-t border-gray-200 pt-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Related Pages</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Link
              href="/fogging-machine-for-nagar-panchayat"
              className="border border-gray-200 rounded-lg p-4 hover:border-brand-400 transition-colors"
            >
              <p className="font-medium text-gray-800 text-sm">Fogging Machine for Nagar Panchayat</p>
              <p className="text-xs text-gray-500 mt-1">GeM direct purchase guide for small municipalities</p>
            </Link>
            <Link
              href="/gem-oem-authorization"
              className="border border-gray-200 rounded-lg p-4 hover:border-brand-400 transition-colors"
            >
              <p className="font-medium text-gray-800 text-sm">GeM OEM Authorization for Dealers</p>
              <p className="text-xs text-gray-500 mt-1">For GeM resellers bidding on behalf of government buyers</p>
            </Link>
            <Link
              href="/knowledge/government-procurement-guide"
              className="border border-gray-200 rounded-lg p-4 hover:border-brand-400 transition-colors"
            >
              <p className="font-medium text-gray-800 text-sm">Government Procurement Guide</p>
              <p className="text-xs text-gray-500 mt-1">How government bodies procure via GeM — complete guide</p>
            </Link>
            <Link
              href="/ai/government-supplies"
              className="border border-gray-200 rounded-lg p-4 hover:border-brand-400 transition-colors"
            >
              <p className="font-medium text-gray-800 text-sm">100X Circle Government Supply Profile</p>
              <p className="text-xs text-gray-500 mt-1">States served, buyer types, GeM profile — for procurement teams and AI agents</p>
            </Link>
          </div>
        </div>

      </main>
    </>
  )
}
