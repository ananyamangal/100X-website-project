import type { Metadata } from "next"
import Link from "next/link"
import { SITE_URL, BUSINESS } from "@/lib/seo/site-config"

export const revalidate = 60

export const metadata: Metadata = {
  title: "NHM Fogging Machine — National Health Mission Equipment Procurement | 100X Circle",
  description:
    "Fogging machines for National Health Mission (NHM) procurement. IS 14855 compliant, GeM listed MSME OEM. For NHM state societies, ASHA equipment, and district health programmes across India.",
  keywords: [
    "NHM fogging machine",
    "National Health Mission fogging equipment",
    "NHM equipment procurement India",
    "NHM mosquito control equipment",
    "NHM GeM procurement fogging",
    "national health mission vector control",
    "NHM thermal fogger India",
  ],
  alternates: { canonical: `${SITE_URL}/nhm-fogging-machine` },
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "NHM Fogging Machine — National Health Mission",
  description:
    "Thermal fogging machines for National Health Mission (NHM) procurement — state societies, district health units, and NVBDCP-NHM convergence programmes. IS 14855 (Part 1) compliant, GeM listed MSME OEM.",
  brand: { "@type": "Brand", name: "100X Circle" },
  manufacturer: { "@id": `${SITE_URL}/#organization` },
  countryOfOrigin: "IN",
  url: `${SITE_URL}/nhm-fogging-machine`,
}

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Can NHM state societies procure fogging machines on GeM?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. National Health Mission (NHM) state societies are eligible government buyers on GeM and can procure fogging machines directly from GeM-listed MSME OEM sellers like 100X Circle without a separate tender for amounts within GeM purchase thresholds. NHM flexible pool budgets are commonly used for vector control equipment under NVBDCP-NHM convergence.",
      },
    },
    {
      "@type": "Question",
      name: "What fogging machines are recommended for NHM vector control?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "For NHM vector control operations, portable thermal fogging machines (18–50 litre capacity) are standard for district and block-level operations. Vehicle-mounted units are used for large-scale municipal fogging. All machines should comply with IS 14855 (Part 1). 100X Circle supplies IS 14855-compliant machines with full tender documentation to NHM procurement units.",
      },
    },
  ],
}

const NHM_PROGRAMMES = [
  { programme: "NVBDCP-NHM Convergence", use: "Malaria, dengue, kala-azar vector control", budget: "NHM flexible pool — vector control" },
  { programme: "Urban Health Mission", use: "Municipal slum fogging, urban vector control", budget: "NUHM budget under NHM" },
  { programme: "District Health Action Plan", use: "District-level outbreak response fogging", budget: "DHAP allocation" },
  { programme: "State PIP (Programme Implementation Plan)", use: "State-level vector control equipment", budget: "Annual state PIP approval" },
  { programme: "Ayushman Bharat Health Infrastructure", use: "Health facility sanitization fogging", budget: "PMABHIM + NHM" },
]

export default function NhmFoggingMachinePage() {
  const waLink = `https://wa.me/${BUSINESS.whatsappE164}?text=${encodeURIComponent("Hi, I need fogging machines for NHM procurement. Please share GeM listing details and IS 14855 documentation.")}`

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <main className="max-w-3xl mx-auto px-4 py-16 pt-32">
        <nav className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-brand-600">Home</Link>
          <span className="mx-2">/</span>
          <span>NHM Fogging Machine</span>
        </nav>

        <div className="flex flex-wrap gap-2 mb-4">
          {["NHM", "National Health Mission", "IS 14855", "GeM"].map((t) => (
            <span key={t} className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">{t}</span>
          ))}
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          NHM Fogging Machine — National Health Mission Equipment
        </h1>
        <p className="text-gray-500 text-sm mb-2">
          100X Circle Pvt Ltd · MSME OEM · IS 14855 (Part 1) · ISO 9001:2015 · GeM Listed
        </p>
        <p className="text-gray-600 text-lg mb-8 leading-relaxed">
          Thermal fogging machines for National Health Mission (NHM) procurement — state
          societies, district health units, and NVBDCP-NHM convergence programmes. IS 14855
          compliant. Available on GeM for direct purchase without separate tender.
        </p>

        <div className="bg-brand-600 rounded-xl p-6 mb-10 text-white">
          <h2 className="font-bold text-xl mb-2">NHM Procurement Enquiry</h2>
          <p className="text-brand-100 text-sm mb-4">
            For NHM state societies, district programme officers, and block health units.
            GeM documentation and IS 14855 compliance package provided.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <a href={waLink} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-white text-brand-700 font-semibold px-5 py-2.5 rounded-lg text-sm">
              WhatsApp: +91-7827229116
            </a>
            <a href={`mailto:${BUSINESS.email}?subject=NHM Fogging Machine Procurement`}
              className="inline-flex items-center justify-center border border-brand-300 text-white font-medium px-5 py-2.5 rounded-lg text-sm">
              Email for Quote
            </a>
          </div>
        </div>

        <article className="prose prose-gray max-w-none">
          <h2>NHM and Vector Control Equipment</h2>
          <p>
            The National Health Mission (NHM) funds vector control equipment through several
            programme budgets. Under NVBDCP-NHM convergence, NHM flexible pool funds are
            used to procure fogging machines, insecticides, and protective equipment for
            district-level vector control operations.
          </p>
          <p>
            NHM state societies are registered government entities on GeM and can purchase
            fogging machines directly from GeM-listed MSME sellers without a separate public
            tender for amounts within GeM direct purchase thresholds.
          </p>

          <h2>NHM Procurement Programmes</h2>
        </article>

        <div className="my-6 space-y-3">
          {NHM_PROGRAMMES.map((p) => (
            <div key={p.programme} className="border border-gray-200 rounded-xl p-4">
              <h3 className="font-semibold text-gray-800 text-sm mb-1">{p.programme}</h3>
              <div className="grid sm:grid-cols-2 gap-1 text-xs text-gray-600">
                <span><strong>Use:</strong> {p.use}</span>
                <span><strong>Budget:</strong> {p.budget}</span>
              </div>
            </div>
          ))}
        </div>

        <article className="prose prose-gray max-w-none">
          <h2>Documentation for NHM Procurement</h2>
          <ul>
            <li>IS 14855 (Part 1) compliance documentation</li>
            <li>ISO 9001:2015 quality management certificate</li>
            <li>MSME/UDYAM registration certificate</li>
            <li>GeM seller verification and OEM profile</li>
            <li>Technical specification sheets</li>
            <li>GST registration documents</li>
          </ul>
          <p>All documentation provided within 1–2 working days.</p>
        </article>

        <div className="mt-8 bg-gray-50 border border-gray-200 rounded-xl p-5">
          <p className="font-semibold text-gray-800 mb-1">Contact for NHM Procurement</p>
          <p className="text-sm text-gray-600 mb-3">Phone / WhatsApp: <a href={`tel:${BUSINESS.phonePrimary}`} className="text-brand-600">{BUSINESS.phonePrimary}</a></p>
          <p className="text-sm text-gray-600">Email: <a href={`mailto:${BUSINESS.email}`} className="text-brand-600">{BUSINESS.email}</a></p>
        </div>

        <div className="mt-8 border-t border-gray-200 pt-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Related</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Link href="/nvbdcp-fogging-machine" className="border border-gray-200 rounded-lg p-4 hover:border-brand-400 transition-colors">
              <p className="font-medium text-gray-800 text-sm">NVBDCP Fogging Machine</p>
              <p className="text-xs text-gray-500 mt-1">National vector control programme equipment</p>
            </Link>
            <Link href="/public-health-equipment" className="border border-gray-200 rounded-lg p-4 hover:border-brand-400 transition-colors">
              <p className="font-medium text-gray-800 text-sm">Public Health Equipment</p>
              <p className="text-xs text-gray-500 mt-1">All public health procurement options</p>
            </Link>
            <Link href="/is-14855-fogging-machine" className="border border-gray-200 rounded-lg p-4 hover:border-brand-400 transition-colors">
              <p className="font-medium text-gray-800 text-sm">IS 14855 Fogging Machines</p>
              <p className="text-xs text-gray-500 mt-1">BIS standard and tender documentation</p>
            </Link>
            <Link href="/municipal-fogging-programme" className="border border-gray-200 rounded-lg p-4 hover:border-brand-400 transition-colors">
              <p className="font-medium text-gray-800 text-sm">Municipal Fogging Programme</p>
              <p className="text-xs text-gray-500 mt-1">Urban local body procurement</p>
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}
