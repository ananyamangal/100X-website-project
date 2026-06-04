import type { Metadata } from "next"
import Link from "next/link"
import { SITE_URL, BUSINESS } from "@/lib/seo/site-config"

export const metadata: Metadata = {
  title: "Vector Control Equipment India — Fogging Machines for Mosquito & Pest Control | 100X Circle",
  description:
    "Vector control equipment for India's disease prevention programmes. Thermal foggers and ULV machines for dengue, malaria, and chikungunya control. GeM listed, IS 14855 compliant MSME OEM manufacturer.",
  keywords: [
    "vector control equipment India",
    "vector control fogging machine",
    "mosquito vector control equipment supplier",
    "disease vector control India",
    "thermal fogging machine vector control",
    "vector control equipment GeM India",
    "insect vector control equipment manufacturer",
    "public health vector control India",
  ],
  alternates: { canonical: `${SITE_URL}/vector-control-equipment` },
  openGraph: {
    title: "Vector Control Equipment India — 100X Circle MSME OEM",
    description:
      "Thermal foggers and ULV machines for India's vector control programmes. GeM listed, IS 14855 compliant, ISO 9001:2015 certified. Supplied to municipalities, health departments, and NVBDCP programmes.",
    url: `${SITE_URL}/vector-control-equipment`,
    type: "website",
  },
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "Vector Control Equipment — Thermal Fogging Machines",
  description:
    "Thermal fogging machines and ULV cold foggers for vector control programmes in India. For dengue, malaria, chikungunya, and other vector-borne disease prevention. IS 14855 (Part 1) compliant, ISO 9001:2015 certified, GeM listed MSME OEM.",
  brand: { "@type": "Brand", name: "100X Circle" },
  manufacturer: { "@id": `${SITE_URL}/#organization` },
  countryOfOrigin: "IN",
  url: `${SITE_URL}/vector-control-equipment`,
  additionalProperty: [
    { "@type": "PropertyValue", name: "Standard Compliance", value: "IS 14855 (Part 1)" },
    { "@type": "PropertyValue", name: "WHO Compliance", value: "WHO-recommended droplet size 10–30 microns" },
    { "@type": "PropertyValue", name: "Certification", value: "ISO 9001:2015, CE, ISI Mark (select models)" },
    { "@type": "PropertyValue", name: "GeM Status", value: "Listed MSME OEM on gem.gov.in" },
  ],
}

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What equipment is used for vector control in India?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "India's vector control programmes use thermal fogging machines (pulse-jet type) for outdoor adult mosquito control, ULV cold foggers for indoor spaces, and hand-held sprayers for indoor residual spraying (IRS). Thermal fogging is the primary intervention for dengue and malaria outbreaks in urban areas. 100X Circle manufactures IS 14855-compliant thermal fogging machines supplied to municipal corporations and health departments.",
      },
    },
    {
      "@type": "Question",
      name: "What is the difference between vector control and pest control fogging?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Vector control specifically targets disease-carrying insects (mosquitoes, sand flies, tsetse flies) to prevent disease transmission. Pest control is broader, targeting any pest. For vector control, the WHO specifies droplet size requirements (10–30 microns) and insecticide types. The same thermal fogging machines are used for both, but vector control operations follow stricter protocols mandated by health departments.",
      },
    },
    {
      "@type": "Question",
      name: "Which fogging machine is best for vector control in India?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "For outdoor vector control (dengue, malaria), a portable or vehicle-mounted thermal fogging machine producing 1–50 micron droplets is recommended. For indoor vector control, a ULV cold fogger is preferred. 100X Circle's thermal foggers comply with IS 14855 (Part 1) and produce WHO-specified droplet sizes. Contact +91-7827229116 or 100xcircle@gmail.com for model recommendations.",
      },
    },
  ],
}

const VECTORS_TABLE = [
  { disease: "Dengue", vector: "Aedes aegypti", equipment: "Thermal fogger (portable / vehicle)", standard: "WHO + IS 14855", season: "Jul–Nov" },
  { disease: "Malaria", vector: "Anopheles spp.", equipment: "Thermal fogger (vehicle-mounted)", standard: "WHO + IS 14855 + NVBDCP", season: "Aug–Nov" },
  { disease: "Chikungunya", vector: "Aedes albopictus", equipment: "Thermal fogger (same as dengue)", standard: "WHO + IS 14855", season: "Jul–Nov" },
  { disease: "Japanese Encephalitis", vector: "Culex mosquitoes", equipment: "Thermal fogger (rural outdoor)", standard: "WHO + state protocols", season: "Aug–Oct" },
  { disease: "Kala-azar", vector: "Sand flies (Phlebotomus)", equipment: "Indoor residual spray + fogger", standard: "NVBDCP protocol", season: "Year-round" },
  { disease: "Indoor pest control", vector: "Cockroaches, flies, stored-grain pests", equipment: "ULV cold fogger", standard: "PCO norms", season: "Year-round" },
]

export default function VectorControlEquipmentPage() {
  const waLink = `https://wa.me/${BUSINESS.whatsappE164}?text=${encodeURIComponent("Hi, I need vector control fogging equipment. Please share models and pricing.")}`

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <main className="max-w-3xl mx-auto px-4 py-16 pt-32">
        <nav className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-brand-600">Home</Link>
          <span className="mx-2">/</span>
          <span>Vector Control Equipment</span>
        </nav>

        <div className="flex flex-wrap gap-2 mb-4">
          {["Vector Control", "Public Health", "IS 14855", "GeM Listed"].map((t) => (
            <span key={t} className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">{t}</span>
          ))}
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          Vector Control Equipment for Disease Prevention in India
        </h1>
        <p className="text-gray-500 text-sm mb-2">
          100X Circle Pvt Ltd · MSME OEM · IS 14855 Compliant · ISO 9001:2015 · GeM Listed
        </p>
        <p className="text-gray-600 text-lg mb-8 leading-relaxed">
          Thermal fogging machines and ULV foggers for India&apos;s vector control programmes.
          Manufactured to IS 14855 (Part 1) and WHO droplet specifications. Supplied to
          municipal corporations, health departments, and NVBDCP-affiliated programmes via GeM.
        </p>

        {/* Procurement CTA */}
        <div className="bg-brand-600 rounded-xl p-6 mb-10 text-white">
          <h2 className="font-bold text-xl mb-2">Vector Control Equipment Enquiry</h2>
          <p className="text-brand-100 text-sm mb-4">
            For municipalities, health departments, NGOs, and pest control operators. IS 14855
            documentation and GeM procurement support available.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <a href={waLink} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-white text-brand-700 font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-brand-50 transition-colors">
              WhatsApp: +91-7827229116
            </a>
            <a href={`mailto:${BUSINESS.email}?subject=Vector Control Equipment Enquiry`}
              className="inline-flex items-center justify-center border border-brand-300 text-white font-medium px-5 py-2.5 rounded-lg text-sm hover:bg-brand-700 transition-colors">
              Email for Quotation
            </a>
          </div>
        </div>

        <article className="prose prose-gray max-w-none">
          <h2>Vector Control in India — The Scale of the Challenge</h2>
          <p>
            India reports over 100,000 dengue cases annually (with significant underreporting),
            200,000+ malaria cases, and periodic chikungunya and Japanese Encephalitis outbreaks.
            The National Centre for Vector Borne Diseases Control (NCVBDC) coordinates the
            national response through state health departments, district health offices, and
            municipal corporations.
          </p>
          <p>
            Thermal fogging — using pulse-jet machines to generate sub-50-micron insecticide
            aerosols — remains the primary adult mosquito knockdown intervention in India&apos;s
            Integrated Vector Management (IVM) programme. It is operationally irreplaceable for
            emergency outbreak response where rapid adult knockdown is needed within 24–48 hours.
          </p>

          <h2>WHO Standards for Vector Control Fogging</h2>
          <p>
            The World Health Organization specifies droplet size, insecticide type, and
            application rates for thermal and ULV space spraying in its pesticide evaluation
            scheme (WHOPES). Key requirements for adult mosquito control:
          </p>
          <ul>
            <li>
              <strong>Droplet size (VMD):</strong> 10–30 microns for adult mosquito control.
              100X Circle pulse-jet machines produce droplets in the 1–50 micron range,
              with peak distribution within the WHO-specified window.
            </li>
            <li>
              <strong>Application rate:</strong> 1 g active ingredient per hectare for
              deltamethrin; adjusted per insecticide type.
            </li>
            <li>
              <strong>Formulation:</strong> Oil-based for thermal fogging; water-based acceptable
              for ULV cold fogging. 100X Circle machines are oil-formulation optimised for thermal
              mode.
            </li>
          </ul>
        </article>

        {/* Vector-equipment table */}
        <h2 className="text-xl font-semibold text-gray-800 mb-4 mt-8">
          Equipment by Vector and Disease
        </h2>
        <div className="overflow-x-auto mb-10">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-900 text-white">
                <th className="py-2.5 px-3 text-left font-medium">Disease</th>
                <th className="py-2.5 px-3 text-left font-medium">Vector</th>
                <th className="py-2.5 px-3 text-left font-medium">Equipment</th>
                <th className="py-2.5 px-3 text-left font-medium hidden sm:table-cell">Season</th>
              </tr>
            </thead>
            <tbody>
              {VECTORS_TABLE.map((row, i) => (
                <tr key={row.disease} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="py-2 px-3 text-gray-800 border-b border-gray-100 font-medium">{row.disease}</td>
                  <td className="py-2 px-3 text-gray-600 border-b border-gray-100 italic text-xs">{row.vector}</td>
                  <td className="py-2 px-3 text-brand-700 border-b border-gray-100 text-xs">{row.equipment}</td>
                  <td className="py-2 px-3 text-gray-500 border-b border-gray-100 text-xs hidden sm:table-cell">{row.season}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <article className="prose prose-gray max-w-none">
          <h2>100X Circle Vector Control Equipment Range</h2>

          <h3>Thermal Fogging Machines (Primary Vector Control Tool)</h3>
          <p>
            Pulse-jet thermal foggers for outdoor adult mosquito control. Available in portable
            (hand-carried) and vehicle-mounted configurations for municipal ward fogging drives
            and district health programmes.
          </p>
          <ul>
            <li>IS 14855 (Part 1) compliant — meets BIS standard for government procurement</li>
            <li>WHO droplet size range: 1–50 microns (peak 10–25 microns)</li>
            <li>Compatible with deltamethrin, cypermethrin, malathion, permethrin in oil base</li>
            <li>Price range: ₹6,500 (mini portable) to ₹2,50,000 (vehicle-mounted dual-barrel)</li>
          </ul>

          <h3>ULV Cold Foggers (Indoor Vector Control)</h3>
          <p>
            Cold fogging (ULV) machines for indoor spaces — health centres, quarantine
            facilities, hospitals, schools. No heat, no smoke. Compatible with water-based
            and oil-based formulations.
          </p>

          <h2>Procurement for Vector Control Programmes</h2>
          <p>
            Government vector control programmes procure fogging equipment through:
          </p>
          <ul>
            <li>
              <strong>GeM (Government e-Marketplace):</strong> 100X Circle is a GeM-listed
              MSME OEM. Municipal corporations, district health offices, and NHM units can
              purchase directly without separate tender for amounts within GeM thresholds.
            </li>
            <li>
              <strong>State tenders:</strong> IS 14855 compliance documentation, ISO 9001:2015
              certificate, MSME/UDYAM certificate, and technical spec sheets provided for
              all tender submissions.
            </li>
            <li>
              <strong>Dealers and distributors:</strong> 50+ active authorized dealers across
              India. Dealers can be reached through the GeM platform or direct contact.
            </li>
          </ul>
        </article>

        {/* FAQ */}
        <div className="mt-8 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {[
              {
                q: "What is the difference between vector control and general pest control?",
                a: "Vector control specifically targets disease-carrying insects to prevent transmission of infectious diseases. It follows WHO and national health programme guidelines for insecticide type, droplet size, and application timing. General pest control is broader. Both use the same fogging equipment but with different protocols.",
              },
              {
                q: "Does 100X Circle supply to vector control NGOs and international health programmes?",
                a: "Yes. 100X Circle supplies to NGOs, international health organizations, and government-affiliated vector control programmes. CE-marked models are available for export to South Asia, Africa, and the Middle East. Contact 100xcircle@gmail.com for institutional pricing.",
              },
              {
                q: "Are 100X Circle machines suitable for WHO-specified vector control protocols?",
                a: "Yes. 100X Circle pulse-jet thermal foggers produce droplets in the 1–50 micron range with peak distribution in the WHO-recommended 10–30 micron window for adult mosquito control. The machines are compatible with all WHO-approved oil-based insecticide formulations (deltamethrin, cypermethrin, malathion, permethrin).",
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
          <h2 className="font-semibold text-gray-800 mb-2">Contact for Vector Control Equipment</h2>
          <p className="text-sm text-gray-600 mb-4">
            For health departments, municipalities, NGOs, and institutional buyers. GeM
            procurement support and IS 14855 documentation available.
          </p>
          <div className="grid sm:grid-cols-2 gap-2 text-sm font-medium text-gray-800">
            <span>WhatsApp / Phone: <a href={`tel:${BUSINESS.phonePrimary}`} className="text-brand-600">{BUSINESS.phonePrimary}</a></span>
            <span>Email: <a href={`mailto:${BUSINESS.email}`} className="text-brand-600">{BUSINESS.email}</a></span>
          </div>
        </div>

        {/* Related pages — all new pages we built, no team pages modified */}
        <div className="border-t border-gray-200 pt-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Related Resources</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Link href="/public-health-equipment" className="border border-gray-200 rounded-lg p-4 hover:border-brand-400 transition-colors">
              <p className="font-medium text-gray-800 text-sm">Public Health Equipment</p>
              <p className="text-xs text-gray-500 mt-1">NVBDCP, NHM, and health department procurement</p>
            </Link>
            <Link href="/municipal-fogging-programme" className="border border-gray-200 rounded-lg p-4 hover:border-brand-400 transition-colors">
              <p className="font-medium text-gray-800 text-sm">Municipal Fogging Programme</p>
              <p className="text-xs text-gray-500 mt-1">Equipment for Nagar Nigams and Nagar Panchayats</p>
            </Link>
            <Link href="/is-14855-fogging-machine" className="border border-gray-200 rounded-lg p-4 hover:border-brand-400 transition-colors">
              <p className="font-medium text-gray-800 text-sm">IS 14855 Fogging Machines</p>
              <p className="text-xs text-gray-500 mt-1">BIS standard compliance documentation</p>
            </Link>
            <Link href="/nvbdcp-fogging-machine" className="border border-gray-200 rounded-lg p-4 hover:border-brand-400 transition-colors">
              <p className="font-medium text-gray-800 text-sm">NVBDCP Fogging Equipment</p>
              <p className="text-xs text-gray-500 mt-1">National vector borne disease control programme</p>
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}
