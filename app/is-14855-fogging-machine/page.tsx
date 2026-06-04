import type { Metadata } from "next"
import Link from "next/link"
import { SITE_URL, BUSINESS } from "@/lib/seo/site-config"

export const metadata: Metadata = {
  title: "IS 14855 Fogging Machine | BIS Certified Thermal Fogger for Government Tenders | 100X Circle",
  description:
    "IS 14855 (Part 1) compliant thermal fogging machines for government tenders and GeM procurement. 100X Circle manufactures BIS-standard fogging machines for municipal corporations, health departments, and Nagar Panchayats.",
  keywords: [
    "IS 14855 fogging machine",
    "IS 14855 Part 1 thermal fogger",
    "BIS certified fogging machine India",
    "IS 14855 compliant fogger",
    "government tender fogging machine IS standard",
    "fogging machine BIS standard India",
    "IS 14855 Part 1 pest control",
    "municipal corporation fogging machine IS 14855",
  ],
  alternates: { canonical: `${SITE_URL}/is-14855-fogging-machine` },
  openGraph: {
    title: "IS 14855 Fogging Machine — BIS Standard Compliance | 100X Circle",
    description:
      "Thermal fogging machines compliant with IS 14855 (Part 1) — the Bureau of Indian Standards specification for government procurement and municipal tenders.",
    url: `${SITE_URL}/is-14855-fogging-machine`,
    type: "website",
  },
}

const jsonLdFaq = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is IS 14855 for fogging machines?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "IS 14855 (Part 1) is the Bureau of Indian Standards (BIS) specification for portable power-operated thermal fogging machines used in pest control, vector control, and public health applications. It defines requirements for construction, materials, safety, and performance. Many government tenders — particularly from municipal corporations and health departments — specify IS 14855 compliance as a mandatory requirement.",
      },
    },
    {
      "@type": "Question",
      name: "Are 100X Circle fogging machines IS 14855 compliant?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. 100X Circle thermal fogging machines are manufactured in compliance with IS 14855 (Part 1), the BIS standard for fogging machines. IS 14855 compliance documentation is available for inclusion in tender bids and government procurement submissions. Contact 100xcircle@gmail.com or +91-7827229116 for documentation.",
      },
    },
    {
      "@type": "Question",
      name: "Do government tenders require IS 14855 for fogging machines?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, many government tenders specify IS 14855 (Part 1) as the required standard for fogging machines. Municipal corporation tenders, Nagar Nigam procurement, state health department bids, and GeM product listings for fogging machines increasingly reference IS 14855 compliance. Suppliers without IS 14855 documentation may face bid disqualification.",
      },
    },
    {
      "@type": "Question",
      name: "What documentation is available for IS 14855 compliance?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "100X Circle provides IS 14855 (Part 1) compliance documentation including technical specification sheets aligned with IS 14855 requirements, quality management certification (ISO 9001:2015), and manufacturer declaration of compliance. These are provided to dealers and direct buyers for use in tender bids. Contact 100xcircle@gmail.com for documentation.",
      },
    },
    {
      "@type": "Question",
      name: "Where are IS 14855 compliant fogging machines manufactured?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "100X Circle manufactures IS 14855 (Part 1) compliant thermal fogging machines at its factory in IMT Manesar, Gurugram, Haryana, India. The factory operates under ISO 9001:2015 quality management certification. Products are dispatched pan-India within 5–10 working days for in-stock models.",
      },
    },
  ],
}

const jsonLdProduct = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "IS 14855 Compliant Thermal Fogging Machine",
  description:
    "Pulse-jet thermal fogging machine manufactured in compliance with IS 14855 (Part 1) — the Bureau of Indian Standards specification for power-operated fogging machines. For municipal vector control, government procurement, and GeM tender supply.",
  brand: { "@type": "Brand", name: "100X Circle" },
  manufacturer: { "@id": `${SITE_URL}/#organization` },
  countryOfOrigin: "IN",
  url: `${SITE_URL}/is-14855-fogging-machine`,
  additionalProperty: [
    {
      "@type": "PropertyValue",
      name: "Standard Compliance",
      value: "IS 14855 (Part 1) — Bureau of Indian Standards",
    },
    {
      "@type": "PropertyValue",
      name: "Quality Certification",
      value: "ISO 9001:2015",
    },
    {
      "@type": "PropertyValue",
      name: "Manufacturer Type",
      value: "MSME OEM, GeM Listed",
    },
  ],
}

const PRODUCTS = [
  {
    name: "100XDB400 — Double Barrel Vehicle-Mounted Fogger",
    spec: "Dual-output, ~100L capacity. IS 14855 compliant. For large municipal ward fogging drives.",
    price: "~₹2,50,000",
    use: "Municipal Corporation, Nagar Nigam",
  },
  {
    name: "ISI Marked Thermal Fogging Machine (HDPE Tank)",
    spec: "Portable, HDPE tank, ISI/BIS marked. IS 14855 compliant. Standard government procurement model.",
    price: "~₹48,000",
    use: "Nagar Panchayat, Health Department",
  },
  {
    name: "Stainless Steel Tank Thermal Fogging Machine",
    spec: "SS tank, corrosion resistant. IS 14855 compliant. For pest control operators and municipal use.",
    price: "~₹40,000",
    use: "PCO, Municipality, Industrial Estate",
  },
  {
    name: "100XTFS50 — Thermal and Cold Fogging Machine",
    spec: "Dual-mode thermal + ULV cold fogger. ~50L capacity. IS 14855 compliant thermal mode.",
    price: "~₹20,000",
    use: "Municipal, Agricultural, Dual-purpose",
  },
]

export default function Is14855FoggingMachinePage() {
  const waLink = `https://wa.me/${BUSINESS.whatsappE164}?text=${encodeURIComponent("Hi, I need IS 14855 compliant fogging machines for a government tender. Please share specifications and pricing.")}`

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdProduct) }}
      />

      <main className="max-w-3xl mx-auto px-4 py-16 pt-32">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-brand-600">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/products" className="hover:text-brand-600">Products</Link>
          <span className="mx-2">/</span>
          <span>IS 14855 Fogging Machine</span>
        </nav>

        <div className="flex flex-wrap gap-2 mb-4">
          {["IS 14855", "BIS Standard", "Government Procurement", "GeM"].map((tag) => (
            <span key={tag} className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          IS 14855 Fogging Machine — BIS Standard Compliant Thermal Foggers
        </h1>
        <p className="text-gray-500 text-sm mb-2">
          100X Circle Pvt Ltd · MSME OEM · ISO 9001:2015 · GeM Listed · Factory: IMT Manesar, Gurugram
        </p>
        <p className="text-gray-600 text-lg mb-8 leading-relaxed">
          Government tenders for fogging machines increasingly specify IS 14855 (Part 1) as
          the required Bureau of Indian Standards specification. 100X Circle manufactures
          IS 14855-compliant thermal fogging machines for municipal corporations, Nagar
          Panchayats, health departments, and GeM procurement.
        </p>

        {/* Procurement CTA */}
        <div className="bg-brand-600 rounded-xl p-6 mb-10 text-white">
          <h2 className="font-bold text-xl mb-2">Procurement Enquiry — IS 14855 Machines</h2>
          <p className="text-brand-100 text-sm mb-4">
            Need IS 14855 compliant fogging machines for a tender or GeM bid? We provide
            full technical documentation, compliance certificates, and competitive pricing.
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
              href={`mailto:${BUSINESS.email}?subject=IS 14855 Fogging Machine Enquiry`}
              className="inline-flex items-center justify-center border border-brand-300 text-white font-medium px-5 py-2.5 rounded-lg text-sm hover:bg-brand-700 transition-colors"
            >
              Email for Quotation
            </a>
          </div>
        </div>

        {/* What is IS 14855 */}
        <article className="prose prose-gray max-w-none">
          <h2>What Is IS 14855 (Part 1)?</h2>
          <p>
            IS 14855 (Part 1) is the Bureau of Indian Standards (BIS) specification for
            portable power-operated thermal fogging machines. Published by the Bureau of
            Indian Standards under the Ministry of Consumer Affairs, it defines requirements
            for:
          </p>
          <ul>
            <li>Construction materials and build quality</li>
            <li>Thermal fogging mechanism and pulse-jet engine performance</li>
            <li>Tank construction and chemical compatibility</li>
            <li>Safety requirements for operator protection</li>
            <li>Performance testing and quality verification</li>
          </ul>
          <p>
            IS 14855 is the Indian national standard equivalent to the international standard
            for fogging machines. Government procurement officers reference it as the quality
            benchmark for thermal fogging equipment in India.
          </p>

          <h2>Why Government Tenders Specify IS 14855</h2>
          <p>
            Municipal corporations, Nagar Nigams, state health departments, and Panchayati
            Raj institutions specify IS 14855 in their tender documents for fogging machines
            for several reasons:
          </p>
          <ol>
            <li>
              <strong>Quality assurance:</strong> IS 14855 ensures that the machine meets
              minimum construction and performance standards, reducing the risk of procuring
              substandard imported equipment.
            </li>
            <li>
              <strong>Safety compliance:</strong> The standard includes operator safety
              requirements that are relevant to municipal workers using the equipment for
              mosquito control and vector management.
            </li>
            <li>
              <strong>Make in India alignment:</strong> IS 14855 aligns with BIS standards
              that favour Indian-manufactured equipment, supporting the government&apos;s
              Atmanirbhar Bharat and Make in India procurement policies.
            </li>
            <li>
              <strong>GeM product listing compliance:</strong> GeM&apos;s fogging machine
              product category (Fogging Machine V2 as per IS 14855 Part 1) directly references
              the standard as the product specification baseline.
            </li>
          </ol>

          <h2>100X Circle and IS 14855 Compliance</h2>
          <p>
            100X Circle thermal fogging machines are manufactured to comply with IS 14855
            (Part 1) at our factory in IMT Manesar, Gurugram, Haryana. Our manufacturing
            process operates under ISO 9001:2015 quality management certification.
          </p>
          <p>
            For tender bids and GeM procurement submissions, we provide:
          </p>
          <ul>
            <li>Technical specification sheets aligned with IS 14855 (Part 1) requirements</li>
            <li>ISO 9001:2015 quality management certificate</li>
            <li>MSME/UDYAM registration certificate</li>
            <li>CE Marking certificate (export-grade models)</li>
            <li>ISI/BIS certification (applicable models — see model list below)</li>
            <li>Manufacturer declaration of IS 14855 compliance</li>
            <li>GeM seller verification</li>
          </ul>
        </article>

        {/* Product Grid */}
        <h2 className="text-xl font-semibold text-gray-800 mb-4 mt-8">
          IS 14855 Compliant Models
        </h2>
        <div className="space-y-4 mb-10">
          {PRODUCTS.map((p) => (
            <div key={p.name} className="border border-gray-200 rounded-xl p-5">
              <div className="flex justify-between items-start gap-4 flex-wrap">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800 mb-1">{p.name}</h3>
                  <p className="text-sm text-gray-600 mb-2">{p.spec}</p>
                  <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-200">
                    Use: {p.use}
                  </span>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-sm font-bold text-gray-800">{p.price}</span>
                  <p className="text-xs text-gray-400">ex-factory</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <article className="prose prose-gray max-w-none">
          <h2>GeM Fogging Machine Category: IS 14855 (Part 1)</h2>
          <p>
            The Government e-Marketplace lists fogging machines under the product category
            "Fogging Machine (V2) as per IS 14855 (Part 1)". This means all fogging machines
            listed on GeM for government procurement are expected to comply with IS 14855
            (Part 1) as the baseline specification.
          </p>
          <p>
            100X Circle is a GeM-listed MSME OEM seller. Our products appear under this
            category and come with full IS 14855 compliance documentation. Government buyers
            can purchase directly on GeM without a separate tender for amounts within GeM
            direct purchase limits.
          </p>

          <h2>Tender Documentation Checklist for IS 14855 Fogging Machines</h2>
          <p>
            If you are a dealer or contractor bidding on a government tender specifying
            IS 14855 fogging machines, the typical documentation required includes:
          </p>
          <ul>
            <li>IS 14855 (Part 1) compliance certificate or manufacturer declaration</li>
            <li>ISO 9001:2015 quality certificate of the manufacturer</li>
            <li>OEM authorization letter (if bidding as a reseller)</li>
            <li>MSME/UDYAM certificate (if bidding under MSME preference)</li>
            <li>Technical specification sheet meeting IS 14855 parameters</li>
            <li>GST registration of supplier</li>
            <li>Sample/demo unit availability (for some tenders)</li>
          </ul>
          <p>
            100X Circle provides all of the above documentation to direct buyers and
            authorized dealers. Contact us to request a complete tender documentation package.
          </p>
        </article>

        {/* FAQ */}
        <div className="mt-8 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Frequently Asked Questions
          </h2>
          <div className="space-y-3">
            {[
              {
                q: "Is ISI marking the same as IS 14855 compliance?",
                a: "Not exactly. ISI marking indicates that a product has been tested and certified by BIS under a specific IS standard. IS 14855 compliance means the product is manufactured to meet the IS 14855 specification. Some 100X Circle models carry the ISI mark. For tenders that specify IS 14855 (without mandatory ISI marking), manufacturer compliance documentation and ISO 9001:2015 certification are typically sufficient. Clarify with the tender issuing authority if ISI mark is mandatory.",
              },
              {
                q: "Can I order IS 14855 compliant machines for a GeM bid without visiting the factory?",
                a: "Yes. All orders can be placed remotely — by phone, WhatsApp, or email. We dispatch pan-India from Gurugram. For large government orders, we recommend a prior product discussion to confirm the correct model meets all tender specifications.",
              },
              {
                q: "What is the delivery timeline for IS 14855 machines?",
                a: "In-stock models: 5–10 working days from order confirmation. For bulk orders (10+ units), contact us in advance to confirm availability and lead time. We maintain inventory of standard models at our Gurugram factory.",
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

        {/* Bottom contact */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-8">
          <h2 className="font-semibold text-gray-800 mb-2">
            Request IS 14855 Documentation or Quotation
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            For government tenders, GeM bids, or direct procurement. We provide complete
            IS 14855 compliance documentation with every order.
          </p>
          <div className="grid sm:grid-cols-2 gap-2 text-sm font-medium text-gray-800">
            <span>Phone / WhatsApp: <a href={`tel:${BUSINESS.phonePrimary}`} className="text-brand-600">{BUSINESS.phonePrimary}</a></span>
            <span>Email: <a href={`mailto:${BUSINESS.email}`} className="text-brand-600">{BUSINESS.email}</a></span>
          </div>
        </div>

        {/* Related */}
        <div className="border-t border-gray-200 pt-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Related Resources</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Link href="/knowledge/government-procurement-guide" className="border border-gray-200 rounded-lg p-4 hover:border-brand-400 transition-colors">
              <p className="font-medium text-gray-800 text-sm">Government Procurement Guide</p>
              <p className="text-xs text-gray-500 mt-1">How to buy fogging machines via GeM</p>
            </Link>
            <Link href="/gem-oem-authorization" className="border border-gray-200 rounded-lg p-4 hover:border-brand-400 transition-colors">
              <p className="font-medium text-gray-800 text-sm">GeM OEM Authorization</p>
              <p className="text-xs text-gray-500 mt-1">For dealers bidding on GeM tenders</p>
            </Link>
            <Link href="/compare/gem-fogging-machines-india" className="border border-gray-200 rounded-lg p-4 hover:border-brand-400 transition-colors">
              <p className="font-medium text-gray-800 text-sm">GeM Fogging Machines India</p>
              <p className="text-xs text-gray-500 mt-1">Buyer guide for GeM procurement</p>
            </Link>
            <Link href="/products" className="border border-gray-200 rounded-lg p-4 hover:border-brand-400 transition-colors">
              <p className="font-medium text-gray-800 text-sm">All Products</p>
              <p className="text-xs text-gray-500 mt-1">Complete fogging machine catalog</p>
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}
