import type { Metadata } from "next"
import Link from "next/link"
import { SITE_URL, BUSINESS } from "@/lib/seo/site-config"

export const revalidate = 60

export const metadata: Metadata = {
  title: "Fogging Machine for Nagar Panchayat — GeM Direct Purchase | 100X Circle",
  description:
    "Affordable thermal fogging machines for Nagar Panchayats and small municipalities. GeM direct purchase, IS 14855 compliant, MSME OEM. No tender required below GeM threshold. Pan-India delivery.",
  keywords: [
    "fogging machine for Nagar Panchayat",
    "Nagar Panchayat fogging machine GeM",
    "small municipality fogging machine India",
    "Nagar Palika fogging machine",
    "Gram Panchayat fogging machine",
    "fogging machine local body GeM India",
    "Nagar Panchayat mosquito control machine",
  ],
  alternates: { canonical: `${SITE_URL}/fogging-machine-for-nagar-panchayat` },
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "Fogging Machine for Nagar Panchayat",
  description:
    "Portable thermal fogging machines for Nagar Panchayats, Nagar Palikas, and gram panchayats. GeM direct purchase available. IS 14855 (Part 1) compliant. MSME OEM seller. No tender required below GeM threshold.",
  brand: { "@type": "Brand", name: "100X Circle" },
  manufacturer: { "@id": `${SITE_URL}/#organization` },
  offers: {
    "@type": "AggregateOffer",
    priceCurrency: "INR",
    lowPrice: "6500",
    highPrice: "80000",
    offerCount: "6",
  },
  url: `${SITE_URL}/fogging-machine-for-nagar-panchayat`,
}

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Can Nagar Panchayats buy fogging machines on GeM?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Nagar Panchayats are eligible government buyers on GeM and can purchase fogging machines directly from GeM-listed MSME OEM sellers like 100X Circle without a separate tender for amounts within GeM direct purchase limits. The process is simple: log in to gem.gov.in, search '100X Circle' or 'fogging machine IS 14855', and place a direct purchase order.",
      },
    },
    {
      "@type": "Question",
      name: "What is the best fogging machine for a small Nagar Panchayat?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "For a Nagar Panchayat with 1–3 wards, a portable thermal fogging machine with 18–35 litre capacity (₹20,000–₹48,000) is ideal. It handles one ward per session without refilling and can be operated by a single person. The ISI-marked HDPE tank model (₹48,000) or stainless steel tank model (₹40,000) are most commonly procured by small municipalities. Both are IS 14855 compliant and GeM-listed.",
      },
    },
    {
      "@type": "Question",
      name: "How many fogging machines does a Nagar Panchayat need?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A Nagar Panchayat typically needs 1–3 fogging machines depending on area and ward count. For dengue and malaria season, 1 portable machine handles about 3–5 km of roads per session. A panchayat with 5+ wards should consider 2–3 machines to run parallel fogging drives. Contact 100X Circle (+91-7827229116) with your ward count for a specific recommendation.",
      },
    },
  ],
}

const MODELS = [
  { name: "Mini Portable Fogger (100XKB200)", price: "₹6,500", capacity: "5–10L", use: "Very small areas, spot treatment, gram panchayat" },
  { name: "Thermal + Cold Combo (100XTFS50)", price: "~₹20,000", capacity: "~50L", use: "Nagar Panchayat general fogging" },
  { name: "SS Tank Thermal Fogger", price: "~₹40,000", capacity: "Standard", use: "PCO and Nagar Panchayat use" },
  { name: "ISI Marked Thermal Fogger (HDPE)", price: "~₹48,000", capacity: "Standard", use: "Most common Nagar Panchayat procurement model" },
]

export default function FoggingMachineForNagarPanchayatPage() {
  const waLink = `https://wa.me/${BUSINESS.whatsappE164}?text=${encodeURIComponent("Hi, I am from a Nagar Panchayat and want to procure fogging machines via GeM. Please share IS 14855 documentation and GeM listing details.")}`

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <main className="max-w-3xl mx-auto px-4 py-16 pt-32">
        <nav className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-brand-600">Home</Link>
          <span className="mx-2">/</span>
          <span>Fogging Machine for Nagar Panchayat</span>
        </nav>

        <div className="flex flex-wrap gap-2 mb-4">
          {["Nagar Panchayat", "GeM Direct Purchase", "IS 14855", "MSME OEM"].map((t) => (
            <span key={t} className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">{t}</span>
          ))}
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          Fogging Machine for Nagar Panchayat — GeM Direct Purchase
        </h1>
        <p className="text-gray-500 text-sm mb-2">
          100X Circle Pvt Ltd · MSME OEM · IS 14855 (Part 1) · ISO 9001:2015 · GeM Listed
        </p>
        <p className="text-gray-600 text-lg mb-8 leading-relaxed">
          Affordable, IS 14855-compliant thermal fogging machines for Nagar Panchayats, Nagar
          Palikas, and gram panchayats. Buy directly on GeM without a separate tender. MSME
          procurement preference applies.
        </p>

        <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-8 text-sm text-green-800">
          <strong>GeM Direct Purchase:</strong> Nagar Panchayats can purchase 100X Circle
          fogging machines directly on GeM without issuing a public tender (within GeM purchase
          thresholds). Log in to gem.gov.in and search &quot;100X Circle&quot; or &quot;fogging
          machine IS 14855&quot;.
        </div>

        <div className="bg-brand-600 rounded-xl p-6 mb-10 text-white">
          <h2 className="font-bold text-xl mb-2">Nagar Panchayat Procurement Enquiry</h2>
          <p className="text-brand-100 text-sm mb-4">
            Share your ward count and area — we recommend the right model and quantity. IS 14855
            documentation provided for your GeM order.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <a href={waLink} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-white text-brand-700 font-semibold px-5 py-2.5 rounded-lg text-sm">
              WhatsApp: +91-7827229116
            </a>
            <a href={`mailto:${BUSINESS.email}?subject=Nagar Panchayat Fogging Machine`}
              className="inline-flex items-center justify-center border border-brand-300 text-white font-medium px-5 py-2.5 rounded-lg text-sm">
              Email for Quote
            </a>
          </div>
        </div>

        {/* Models */}
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Recommended Models for Nagar Panchayats</h2>
        <div className="space-y-3 mb-10">
          {MODELS.map((m) => (
            <div key={m.name} className="flex justify-between items-start gap-4 border border-gray-200 rounded-xl p-4 flex-wrap">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-800 text-sm">{m.name}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{m.use}</p>
              </div>
              <span className="text-sm font-bold text-brand-700 flex-shrink-0">{m.price}</span>
            </div>
          ))}
        </div>

        <article className="prose prose-gray max-w-none">
          <h2>How Nagar Panchayats Buy on GeM</h2>
          <ol>
            <li>Log in to gem.gov.in with your government buyer credentials</li>
            <li>Search &quot;fogging machine&quot; or &quot;100X Circle&quot;</li>
            <li>Filter by MSME seller for procurement preference</li>
            <li>Select model, add to cart, and place direct purchase order</li>
            <li>100X Circle dispatches within 5–10 working days</li>
          </ol>
          <p>
            For amounts above the GeM direct purchase limit, initiate a GeM bid or contact
            us for rate contract pricing.
          </p>

          <h2>MSME Benefit for Nagar Panchayat Procurement</h2>
          <p>
            Procuring from 100X Circle (MSME-registered OEM) counts toward your
            Panchayat&apos;s mandatory MSME procurement target under the Government of
            India&apos;s Public Procurement Policy. MSME preference may also allow the
            Panchayat to purchase from 100X Circle even if a marginally cheaper non-MSME
            option exists.
          </p>
        </article>

        <div className="mt-8 border-t border-gray-200 pt-8">
          <div className="grid sm:grid-cols-2 gap-4">
            <Link href="/municipal-fogging-programme" className="border border-gray-200 rounded-lg p-4 hover:border-brand-400 transition-colors">
              <p className="font-medium text-gray-800 text-sm">Municipal Fogging Programme</p>
              <p className="text-xs text-gray-500 mt-1">Full guide for all municipal body types</p>
            </Link>
            <Link href="/is-14855-fogging-machine" className="border border-gray-200 rounded-lg p-4 hover:border-brand-400 transition-colors">
              <p className="font-medium text-gray-800 text-sm">IS 14855 Documentation</p>
              <p className="text-xs text-gray-500 mt-1">BIS compliance for GeM procurement</p>
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}
