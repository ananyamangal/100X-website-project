import type { Metadata } from "next"
import Link from "next/link"
import { SITE_URL, BUSINESS } from "@/lib/seo/site-config"

export const revalidate = 60

export const metadata: Metadata = {
  title: "NVBDCP Fogging Machine — National Vector Control Programme Equipment | 100X Circle",
  description:
    "Fogging machines for NVBDCP (National Vector Borne Disease Control Programme) operations. IS 14855 compliant, ISO 9001:2015, GeM listed MSME OEM. Supplied to state and district health departments across India.",
  keywords: [
    "NVBDCP fogging machine",
    "national vector borne disease control programme equipment",
    "NVBDCP thermal fogger India",
    "vector borne disease control fogging machine",
    "NCVBDC fogging equipment",
    "NHM fogging machine procurement",
    "malaria fogging machine government India",
    "dengue control equipment NVBDCP",
  ],
  alternates: { canonical: `${SITE_URL}/nvbdcp-fogging-machine` },
  openGraph: {
    title: "NVBDCP Fogging Machine — National Vector Control Programme | 100X Circle",
    description:
      "Thermal fogging machines for NVBDCP operations. IS 14855 compliant, GeM listed MSME OEM. For district health departments and state vector control programmes.",
    url: `${SITE_URL}/nvbdcp-fogging-machine`,
    type: "website",
  },
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "NVBDCP Fogging Machine — National Vector Control Programme",
  description:
    "Thermal fogging machines for NVBDCP (National Vector Borne Disease Control Programme) operations across India. IS 14855 (Part 1) compliant, ISO 9001:2015 certified, GeM listed MSME OEM.",
  brand: { "@type": "Brand", name: "100X Circle" },
  manufacturer: { "@id": `${SITE_URL}/#organization` },
  countryOfOrigin: "IN",
  url: `${SITE_URL}/nvbdcp-fogging-machine`,
}

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What fogging machines are used in NVBDCP operations?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "NVBDCP (National Vector Borne Disease Control Programme) operations use thermal pulse-jet fogging machines for adult mosquito and vector knockdown. Machines must comply with IS 14855 (Part 1) — the Bureau of Indian Standards specification. 100X Circle manufactures IS 14855-compliant thermal fogging machines supplied to district health departments and state vector control units via GeM.",
      },
    },
    {
      "@type": "Question",
      name: "How do state health departments procure NVBDCP fogging equipment?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "State health departments and district health offices procure fogging machines for NVBDCP operations through GeM (Government e-Marketplace) or state tenders. For GeM procurement, 100X Circle is listed as a GeM-verified MSME OEM seller. Documentation provided: IS 14855 compliance certificate, ISO 9001:2015 certificate, MSME/UDYAM certificate, technical spec sheets. Contact +91-7827229116 or 100xcircle@gmail.com.",
      },
    },
    {
      "@type": "Question",
      name: "What insecticides does NVBDCP recommend for fogging?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "NVBDCP recommends pyrethroid-based insecticides for adult vector control fogging: deltamethrin (2.5% EC in mineral oil — most common for malaria), alpha-cypermethrin, and malathion. All formulations must be oil-based for thermal fogging. 100X Circle machines are compatible with all NVBDCP-approved oil-based insecticide formulations.",
      },
    },
  ],
}

const NVBDCP_DISEASES = [
  {
    programme: "National Malaria Control",
    equipment: "Vehicle-mounted or portable thermal fogger",
    operation: "Adult Anopheles knockdown, evening and early morning",
    states: "Odisha, Chhattisgarh, Jharkhand, MP, NE states, UP, Bihar",
    gemCategory: "Fogging Machine as per IS 14855 (Part 1)",
  },
  {
    programme: "National Dengue Programme",
    equipment: "Portable thermal fogger (ward-level drives)",
    operation: "Adult Aedes aegypti control, morning and evening drives",
    states: "All states — urban and peri-urban",
    gemCategory: "Fogging Machine as per IS 14855 (Part 1)",
  },
  {
    programme: "National Chikungunya Programme",
    equipment: "Same as dengue (same vector Aedes albopictus)",
    operation: "Combined dengue-chikungunya control drives",
    states: "Maharashtra, Karnataka, Kerala, Rajasthan, others",
    gemCategory: "Fogging Machine as per IS 14855 (Part 1)",
  },
  {
    programme: "National Kala-azar Elimination",
    equipment: "ULV fogger / IRS sprayer",
    operation: "Indoor residual spraying and sand fly control",
    states: "Bihar, Jharkhand, UP, West Bengal",
    gemCategory: "Fogging Machine / ULV sprayer",
  },
  {
    programme: "National Japanese Encephalitis Programme",
    equipment: "Thermal fogger (outdoor, Culex mosquito control)",
    operation: "Culex mosquito knockdown near pig farms and rice fields",
    states: "UP, Bihar, WB, Assam, AP",
    gemCategory: "Fogging Machine as per IS 14855 (Part 1)",
  },
]

export default function NvbdcpFoggingMachinePage() {
  const waLink = `https://wa.me/${BUSINESS.whatsappE164}?text=${encodeURIComponent("Hi, I need fogging machines for NVBDCP / NHM vector control programme procurement. Please share details and GeM listing.")}`

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <main className="max-w-3xl mx-auto px-4 py-16 pt-32">
        <nav className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-brand-600">Home</Link>
          <span className="mx-2">/</span>
          <span>NVBDCP Fogging Machine</span>
        </nav>

        <div className="flex flex-wrap gap-2 mb-4">
          {["NVBDCP", "NHM", "Vector Control", "IS 14855", "GeM"].map((t) => (
            <span key={t} className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">{t}</span>
          ))}
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          NVBDCP Fogging Machine — National Vector Borne Disease Control Programme
        </h1>
        <p className="text-gray-500 text-sm mb-2">
          100X Circle Pvt Ltd · MSME OEM · IS 14855 Compliant · ISO 9001:2015 · GeM Listed
        </p>
        <p className="text-gray-600 text-lg mb-8 leading-relaxed">
          100X Circle manufactures thermal fogging machines for NVBDCP (now NCVBDC) operations
          across India. IS 14855 (Part 1) compliant. Supplied to state health departments,
          district health offices, and NHM-affiliated vector control units via GeM and direct tender.
        </p>

        {/* CTA */}
        <div className="bg-brand-600 rounded-xl p-6 mb-10 text-white">
          <h2 className="font-bold text-xl mb-2">NVBDCP / NHM Procurement Enquiry</h2>
          <p className="text-brand-100 text-sm mb-4">
            For state health departments, district health offices, and NHM procurement units.
            IS 14855 documentation, GeM authorization, and bulk pricing available.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <a href={waLink} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-white text-brand-700 font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-brand-50 transition-colors">
              WhatsApp: +91-7827229116
            </a>
            <a href={`mailto:${BUSINESS.email}?subject=NVBDCP Fogging Machine Procurement`}
              className="inline-flex items-center justify-center border border-brand-300 text-white font-medium px-5 py-2.5 rounded-lg text-sm hover:bg-brand-700 transition-colors">
              Email for Quote
            </a>
          </div>
        </div>

        <article className="prose prose-gray max-w-none">
          <h2>About NVBDCP and Its Fogging Equipment Requirements</h2>
          <p>
            The National Centre for Vector Borne Diseases Control (NCVBDC), formerly the
            National Vector Borne Disease Control Programme (NVBDCP), is the nodal agency
            under India&apos;s Ministry of Health and Family Welfare responsible for control
            and prevention of six major vector-borne diseases: malaria, dengue, chikungunya,
            Japanese Encephalitis (JE), kala-azar, and lymphatic filariasis.
          </p>
          <p>
            NVBDCP coordinates through state vector control officers, district malaria officers,
            and CMHOs. At the operational level, municipal corporations and district health
            departments conduct fogging drives using government-owned or contracted fogging
            equipment. Procurement is primarily via GeM or state-level tenders specifying
            IS 14855 compliance.
          </p>

          <h2>IS 14855 — The NVBDCP Procurement Standard</h2>
          <p>
            Government tenders issued for NVBDCP fogging operations specify IS 14855 (Part 1)
            as the required equipment standard. GeM&apos;s fogging machine category is titled
            &quot;Fogging Machine (V2) as per IS 14855 (Part 1)&quot; — directly referencing this
            standard as the baseline specification for all machines listed on the platform.
          </p>
          <p>
            100X Circle thermal fogging machines are manufactured to IS 14855 (Part 1)
            compliance. Complete compliance documentation is available for all tender bids and
            GeM submissions.
          </p>

          <h2>NVBDCP Insecticide Protocols</h2>
          <p>
            NVBDCP specifies the following insecticides for space spraying (thermal fogging)
            operations:
          </p>
          <ul>
            <li>
              <strong>Malaria control:</strong> Deltamethrin 2.5% EC in mineral oil (primary),
              alpha-cypermethrin as alternative
            </li>
            <li>
              <strong>Dengue / chikungunya:</strong> Deltamethrin 0.5–1% EC in mineral oil,
              malathion 5% in oil
            </li>
            <li>
              <strong>Japanese Encephalitis:</strong> Deltamethrin, pyrethrum extract
            </li>
          </ul>
          <p>
            All 100X Circle thermal fogging machines are compatible with oil-based formulations
            including all NVBDCP-approved insecticide concentrates.
          </p>
        </article>

        {/* NVBDCP programme table */}
        <h2 className="text-xl font-semibold text-gray-800 mb-4 mt-8">
          Equipment by NVBDCP Disease Programme
        </h2>
        <div className="space-y-4 mb-10">
          {NVBDCP_DISEASES.map((prog) => (
            <div key={prog.programme} className="border border-gray-200 rounded-xl p-5">
              <h3 className="font-semibold text-gray-800 mb-2">{prog.programme}</h3>
              <div className="grid sm:grid-cols-2 gap-2 text-xs text-gray-600">
                <span><strong className="text-gray-700">Equipment:</strong> {prog.equipment}</span>
                <span><strong className="text-gray-700">Operation:</strong> {prog.operation}</span>
                <span><strong className="text-gray-700">Active states:</strong> {prog.states}</span>
                <span><strong className="text-brand-700">GeM category:</strong> {prog.gemCategory}</span>
              </div>
            </div>
          ))}
        </div>

        <article className="prose prose-gray max-w-none mb-8">
          <h2>How State Health Departments Procure NVBDCP Equipment</h2>
          <p>
            Procurement for NVBDCP fogging operations happens at multiple levels:
          </p>
          <ol>
            <li>
              <strong>Central procurement:</strong> Ministry of Health may centrally procure
              and allocate equipment to states under national programme budgets.
            </li>
            <li>
              <strong>State health directorate:</strong> State-level rate contracts or tenders
              for bulk supply to district health offices.
            </li>
            <li>
              <strong>NHM state units:</strong> National Health Mission state societies procure
              under NHM flexible pool budgets, often via GeM.
            </li>
            <li>
              <strong>District health office / CMHO:</strong> District-level GeM direct purchase
              or local tender for immediate requirement.
            </li>
          </ol>
          <p>
            100X Circle participates at all levels: central allocation, state tenders, and
            district GeM direct purchase. Contact us with your tender or procurement reference
            for documentation and pricing.
          </p>

          <h2>Why NVBDCP Programmes Choose Indian MSME OEMs</h2>
          <p>
            Government procurement policy under NVBDCP and NHM increasingly favours Indian
            MSME manufacturers for several reasons:
          </p>
          <ul>
            <li>MSME procurement preference — 25% of central procurement mandated from MSMEs</li>
            <li>Make in India policy — preference for domestically manufactured equipment</li>
            <li>Lower cost vs Korean/German imports — 3–5× price advantage</li>
            <li>Local spare parts availability — critical for field maintenance during outbreak response</li>
            <li>No import delays — domestic stock with 5–10 day dispatch</li>
          </ul>
        </article>

        {/* FAQ */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {[
              {
                q: "Is NVBDCP the same as NCVBDC?",
                a: "Yes. The National Vector Borne Disease Control Programme (NVBDCP) was renamed to National Centre for Vector Borne Diseases Control (NCVBDC) under the reorganization of national health programmes. Both names refer to the same programme operated under India's Ministry of Health and Family Welfare.",
              },
              {
                q: "What tender documentation does 100X Circle provide for NVBDCP procurement?",
                a: "100X Circle provides: IS 14855 (Part 1) compliance documentation, ISO 9001:2015 quality management certificate, MSME/UDYAM registration certificate, CE marking certificate (export models), technical specification sheets (matching tender BOQ), GeM seller verification, GST registration, and OEM authorization letter for dealers. Contact 100xcircle@gmail.com with your tender reference.",
              },
              {
                q: "Can gram panchayats and Panchayati Raj institutions procure for NVBDCP operations?",
                a: "Yes. Gram panchayats and Panchayati Raj institutions are eligible GeM buyers and can procure fogging machines for NVBDCP-supported vector control operations under District Mineral Foundation (DMF) or 14th/15th Finance Commission grants. 100X Circle is a GeM-listed MSME OEM for direct purchase without separate tender.",
              },
            ].map(({ q, a }) => (
              <details key={q} className="border border-gray-200 rounded-xl">
                <summary className="p-4 font-medium text-gray-800 cursor-pointer text-sm">{q}</summary>
                <p className="px-4 pb-4 text-sm text-gray-600">{a}</p>
              </details>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-8">
          <h2 className="font-semibold text-gray-800 mb-2">Contact for NVBDCP Procurement</h2>
          <p className="text-sm text-gray-600 mb-4">
            State health departments, NHM units, district health offices, and CMHOs. IS 14855
            documentation and GeM support available.
          </p>
          <div className="grid sm:grid-cols-2 gap-2 text-sm font-medium text-gray-800">
            <span>WhatsApp / Phone: <a href={`tel:${BUSINESS.phonePrimary}`} className="text-brand-600">{BUSINESS.phonePrimary}</a></span>
            <span>Email: <a href={`mailto:${BUSINESS.email}`} className="text-brand-600">{BUSINESS.email}</a></span>
          </div>
        </div>

        {/* Related — only pages we built */}
        <div className="border-t border-gray-200 pt-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Related Resources</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Link href="/public-health-equipment" className="border border-gray-200 rounded-lg p-4 hover:border-brand-400 transition-colors">
              <p className="font-medium text-gray-800 text-sm">Public Health Equipment</p>
              <p className="text-xs text-gray-500 mt-1">Full public health procurement guide</p>
            </Link>
            <Link href="/vector-control-equipment" className="border border-gray-200 rounded-lg p-4 hover:border-brand-400 transition-colors">
              <p className="font-medium text-gray-800 text-sm">Vector Control Equipment</p>
              <p className="text-xs text-gray-500 mt-1">Equipment by disease vector and programme</p>
            </Link>
            <Link href="/is-14855-fogging-machine" className="border border-gray-200 rounded-lg p-4 hover:border-brand-400 transition-colors">
              <p className="font-medium text-gray-800 text-sm">IS 14855 Fogging Machines</p>
              <p className="text-xs text-gray-500 mt-1">BIS standard documentation for tenders</p>
            </Link>
            <Link href="/municipal-fogging-programme" className="border border-gray-200 rounded-lg p-4 hover:border-brand-400 transition-colors">
              <p className="font-medium text-gray-800 text-sm">Municipal Fogging Programme</p>
              <p className="text-xs text-gray-500 mt-1">Urban local body procurement guide</p>
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}
