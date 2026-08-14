import type { Metadata } from "next"
import Link from "next/link"
import { SITE_URL, BUSINESS } from "@/lib/seo/site-config"
import RFQForm from "@/components/forms/RFQForm"

export const revalidate = 60

export const metadata: Metadata = {
  title: "Public Health Equipment India — Fogging Machines for Disease Vector Control | 100X Circle",
  description:
    "Public health fogging equipment for vector control programmes in India. Thermal foggers and ULV foggers for dengue, malaria, and chikungunya prevention. ISO 9001, IS 14855, GeM listed MSME OEM.",
  keywords: [
    "public health equipment India",
    "vector control equipment supplier India",
    "fogging machine public health department",
    "mosquito control equipment government India",
    "disease vector control equipment",
    "public health fogging machine GeM",
    "thermal fogger public health India",
    "NVBDCP fogging equipment",
  ],
  alternates: { canonical: `${SITE_URL}/public-health-equipment` },
  openGraph: {
    title: "Public Health Equipment India — Vector Control Fogging Machines",
    description:
      "Thermal fogging machines and ULV foggers for India's public health and vector control programmes. GeM listed, IS 14855 compliant, MSME OEM.",
    url: `${SITE_URL}/public-health-equipment`,
    type: "website",
  },
}

const jsonLdFaq = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What fogging equipment is used in India's public health vector control programmes?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "India's national vector control programme (NVBDCP) uses thermal fogging machines (pulse-jet type) and ULV cold foggers for adult mosquito control. Thermal foggers are used outdoors for large-scale dengue, malaria, and chikungunya prevention. ULV foggers are used indoors in hospitals, health centres, and enclosed public spaces. 100X Circle manufactures IS 14855 (Part 1) compliant machines for both applications, supplied to municipal corporations and health departments via GeM.",
      },
    },
    {
      "@type": "Question",
      name: "Which government bodies purchase public health fogging equipment in India?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Key procurement bodies for public health fogging equipment in India include: National Centre for Vector Borne Diseases Control (NCVBDC / NVBDCP), State health departments and directorates, District health offices and CMHOs, National Health Mission (NHM) state units, Municipal corporations and Nagar Nigams (for urban vector control), and Panchayati Raj institutions. Most procurement is via GeM or state-level tenders.",
      },
    },
    {
      "@type": "Question",
      name: "What standard applies to fogging machines for public health use in India?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "IS 14855 (Part 1), the Bureau of Indian Standards specification for portable power-operated fogging machines, is the primary standard for public health fogging equipment procurement in India. Government tenders and GeM product listings reference IS 14855. 100X Circle machines are manufactured in compliance with IS 14855 (Part 1). WHO also publishes guidelines for ultra-low volume (ULV) and thermal fogging for vector control.",
      },
    },
  ],
}

const jsonLdProduct = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "Public Health Vector Control Fogging Equipment",
  description:
    "Thermal fogging machines and ULV foggers for India's public health vector control programmes — dengue, malaria, chikungunya prevention. IS 14855 (Part 1) compliant, ISO 9001:2015 certified, GeM listed MSME OEM.",
  brand: { "@type": "Brand", name: "100X Circle" },
  manufacturer: { "@id": `${SITE_URL}/#organization` },
  countryOfOrigin: "IN",
  url: `${SITE_URL}/public-health-equipment`,
}

const APPLICATIONS = [
  {
    disease: "Dengue Prevention",
    vector: "Aedes aegypti mosquito",
    equipment: "Thermal Fogger (portable or vehicle-mounted)",
    timing: "Early morning / evening — Aedes peak activity",
    insecticide: "Deltamethrin 0.5–1% in mineral oil",
    coverage: "Outdoor: residential areas, drains, parks",
    link: "/knowledge/dengue-prevention-thermal-fogging",
  },
  {
    disease: "Malaria Control",
    vector: "Anopheles mosquito",
    equipment: "Thermal Fogger (vehicle-mounted preferred)",
    timing: "Dusk and early morning — Anopheles night-biting",
    insecticide: "Deltamethrin 2.5% EC or alpha-cypermethrin",
    coverage: "Outdoor: rural areas, rice fields, drainage channels",
    link: "/knowledge/malaria-control-fogging-india",
  },
  {
    disease: "Chikungunya Prevention",
    vector: "Aedes albopictus mosquito",
    equipment: "Thermal Fogger (same protocol as dengue)",
    timing: "Same as dengue fogging protocol",
    insecticide: "Same as dengue — pyrethroid in oil base",
    coverage: "Peridomestic vegetation, shaded areas",
    link: "/knowledge/mosquito-control-india",
  },
  {
    disease: "Indoor Sanitization",
    vector: "All airborne pathogens, indoor pests",
    equipment: "ULV Cold Fogger (100XMCF42)",
    timing: "Any time — no heat, no smoke",
    insecticide: "Water-based or oil-based compatible",
    coverage: "Hospitals, health centres, quarantine facilities, schools",
    link: "/products",
  },
]

const PROCUREMENT_BODIES = [
  { body: "NVBDCP / NCVBDC", type: "Central", procurement: "Central rate contracts, state allocation" },
  { body: "State Health Directorate", type: "State", procurement: "State tender or GeM bulk order" },
  { body: "NHM State Units", type: "State", procurement: "NHM budget procurement via GeM or tender" },
  { body: "District Health Office / CMHO", type: "District", procurement: "GeM direct purchase or district tender" },
  { body: "Municipal Corporation / Nagar Nigam", type: "Urban Local Body", procurement: "GeM or municipal tender" },
  { body: "Nagar Panchayat / Gram Panchayat", type: "Local Body", procurement: "GeM direct purchase" },
  { body: "Private Hospitals / NGOs", type: "Institutional", procurement: "Direct purchase from OEM or dealer" },
]

export default function PublicHealthEquipmentPage() {
  const waLink = `https://wa.me/${BUSINESS.whatsappE164}?text=${encodeURIComponent("Hi, I represent a public health department and need fogging equipment for our vector control programme. Please share details.")}`

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdProduct) }} />

      <main className="max-w-3xl mx-auto px-4 py-16 pt-32">
        <nav className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-brand-600">Home</Link>
          <span className="mx-2">/</span>
          <span>Public Health Equipment</span>
        </nav>

        <div className="flex flex-wrap gap-2 mb-4">
          {["Public Health", "Vector Control", "GeM", "IS 14855"].map((tag) => (
            <span key={tag} className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">{tag}</span>
          ))}
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          Public Health Equipment for Vector Control in India
        </h1>
        <p className="text-gray-500 text-sm mb-2">
          100X Circle Pvt Ltd · MSME OEM · IS 14855 Compliant · ISO 9001:2015 · GeM Listed
        </p>
        <p className="text-gray-600 text-lg mb-8 leading-relaxed">
          100X Circle manufactures thermal fogging machines and ULV foggers for India&apos;s
          public health vector control programmes. IS 14855 (Part 1) compliant. Supplied to
          NVBDCP programmes, municipal corporations, health departments, and Panchayati Raj
          institutions via GeM and direct tender.
        </p>

        {/* CTA */}
        <div className="bg-brand-600 rounded-xl p-6 mb-10 text-white">
          <h2 className="font-bold text-xl mb-2">Public Health Department Enquiry</h2>
          <p className="text-brand-100 text-sm mb-4">
            For municipal health departments, district health offices, NHM units, and hospitals.
            Full tender documentation and GeM procurement support available.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <a href={waLink} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-white text-brand-700 font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-brand-50 transition-colors">
              WhatsApp: +91-7827229116
            </a>
            <a href={`tel:${BUSINESS.phonePrimary.replace(/\s+/g, "")}`}
              className="inline-flex items-center justify-center border border-brand-300 text-white font-medium px-5 py-2.5 rounded-lg text-sm hover:bg-brand-700 transition-colors">
              Call: {BUSINESS.phonePrimary}
            </a>
          </div>
        </div>

        <article className="prose prose-gray max-w-none">
          <h2>India&apos;s Vector Control Programme and Fogging Equipment</h2>
          <p>
            India&apos;s National Centre for Vector Borne Diseases Control (NCVBDC), formerly
            NVBDCP, coordinates the national vector management strategy under the Ministry of
            Health and Family Welfare. The programme operates across all states managing dengue,
            malaria, chikungunya, Japanese Encephalitis, and Kala-azar.
          </p>
          <p>
            Thermal fogging is one of the primary adult vector control interventions recommended
            under the Integrated Vector Management (IVM) framework. Municipal corporations,
            district health departments, and state vector control units procure fogging machines
            for scheduled drives and emergency outbreak response.
          </p>
        </article>

        {/* Application table */}
        <h2 className="text-xl font-semibold text-gray-800 mb-4 mt-8">
          Equipment by Public Health Application
        </h2>
        <div className="space-y-4 mb-10">
          {APPLICATIONS.map((app) => (
            <div key={app.disease} className="border border-gray-200 rounded-xl p-5">
              <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                <h3 className="font-semibold text-gray-800">{app.disease}</h3>
                <Link href={app.link} className="text-xs text-brand-600 hover:underline flex-shrink-0">
                  Detailed guide →
                </Link>
              </div>
              <div className="grid sm:grid-cols-2 gap-2 text-xs text-gray-600">
                <span><strong className="text-gray-700">Vector:</strong> {app.vector}</span>
                <span><strong className="text-gray-700">Equipment:</strong> {app.equipment}</span>
                <span><strong className="text-gray-700">Timing:</strong> {app.timing}</span>
                <span><strong className="text-gray-700">Insecticide:</strong> {app.insecticide}</span>
                <span className="sm:col-span-2"><strong className="text-gray-700">Coverage:</strong> {app.coverage}</span>
              </div>
            </div>
          ))}
        </div>

        <article className="prose prose-gray max-w-none">
          <h2>IS 14855 and WHO Standards for Public Health Fogging</h2>
          <p>
            Public health fogging equipment procurement in India is governed by:
          </p>
          <ul>
            <li>
              <strong>IS 14855 (Part 1)</strong> — Bureau of Indian Standards specification for
              fogging machines. Referenced in GeM product listings and most government tenders.
              100X Circle machines are manufactured to IS 14855 (Part 1) compliance.
            </li>
            <li>
              <strong>WHO Guidelines on Space Spraying</strong> — WHO&apos;s operational guidelines
              for thermal and ULV space spraying for vector control specify droplet size (10–30
              microns for adult mosquitoes), insecticide formulations, and application rates.
              100X Circle machines achieve WHO-specified droplet ranges.
            </li>
            <li>
              <strong>NVBDCP Operational Guidelines</strong> — The national programme specifies
              fogging protocols, insecticide choices (deltamethrin, malathion, cypermethrin),
              and equipment requirements for state and district health departments.
            </li>
          </ul>
        </article>

        {/* Procurement bodies */}
        <h2 className="text-xl font-semibold text-gray-800 mb-4 mt-8">
          Public Health Procurement Bodies — Who Buys
        </h2>
        <div className="overflow-x-auto mb-10">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-900 text-white">
                <th className="py-2.5 px-4 text-left font-medium">Body</th>
                <th className="py-2.5 px-4 text-left font-medium">Level</th>
                <th className="py-2.5 px-4 text-left font-medium">Procurement Route</th>
              </tr>
            </thead>
            <tbody>
              {PROCUREMENT_BODIES.map((b, i) => (
                <tr key={b.body} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="py-2 px-4 text-gray-800 border-b border-gray-100 font-medium">{b.body}</td>
                  <td className="py-2 px-4 text-gray-600 border-b border-gray-100">{b.type}</td>
                  <td className="py-2 px-4 text-brand-700 border-b border-gray-100">{b.procurement}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <article className="prose prose-gray max-w-none mb-8">
          <h2>100X Circle Public Health Supply Credentials</h2>
          <ul>
            <li><strong>GeM listed MSME OEM:</strong> Direct government procurement without separate tender</li>
            <li><strong>IS 14855 (Part 1) compliant:</strong> BIS standard documentation provided</li>
            <li><strong>ISO 9001:2015 certified:</strong> Quality management — required by most tenders</li>
            <li><strong>WHO-compatible droplet specifications:</strong> 1–50 micron range meeting WHO vector control guidelines</li>
            <li><strong>Supply track record:</strong> Municipalities, Nagar Nigams, and health departments in 15+ states</li>
            <li><strong>Pan-India dispatch:</strong> Gurugram factory, 5–10 working day delivery</li>
          </ul>
        </article>

        {/* RFQ Form */}
        <section id="rfq" className="mt-12 mb-12">
          <div className="rounded-2xl bg-gradient-to-b from-gray-50 to-white shadow-xl p-6 md:p-10">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                Request a Quote — Public Health Equipment
              </h2>
              <p className="text-sm md:text-base text-gray-600">
                For health departments, municipalities, NGOs, and institutional buyers.
                GeM, tender, and direct purchase enquiries — response within 48 hours.
              </p>
            </div>
            <RFQForm
              variant="card"
              location="public-health-equipment"
              defaultProduct="Mosquito Control Fogger"
              defaultOrganization=""
              defaultDescription="Enquiring about public health / vector control fogging equipment."
            />
          </div>
        </section>

        {/* FAQ */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {[
              { q: "Can NGOs and private hospitals procure from 100X Circle?", a: "Yes. NGOs, private hospitals, and institutional buyers can purchase directly from 100X Circle without GeM. Contact us for pricing and documentation." },
              { q: "What documentation is provided for public health programme procurement?", a: "IS 14855 compliance docs, ISO 9001:2015 certificate, MSME/UDYAM certificate, technical spec sheets, CE certificate (export models), GST registration, and GeM seller verification — everything required for government tender bid submissions." },
              { q: "Are insecticide chemicals supplied along with the machines?", a: "100X Circle specialises in fogging machine hardware. For insecticide procurement, we can recommend approved formulations and suppliers. The machines are compatible with all WHO-recommended oil-based insecticide formulations." },
            ].map(({ q, a }) => (
              <details key={q} className="border border-gray-200 rounded-xl">
                <summary className="p-4 font-medium text-gray-800 cursor-pointer text-sm">{q}</summary>
                <p className="px-4 pb-4 text-sm text-gray-600">{a}</p>
              </details>
            ))}
          </div>
        </div>

        {/* Related cluster */}
        <div className="border-t border-gray-200 pt-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Related Resources</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Link href="/municipal-fogging-programme" className="border border-gray-200 rounded-lg p-4 hover:border-brand-400 transition-colors">
              <p className="font-medium text-gray-800 text-sm">Municipal Fogging Programme</p>
              <p className="text-xs text-gray-500 mt-1">Equipment and procurement for municipalities</p>
            </Link>
            <Link href="/knowledge/dengue-prevention-thermal-fogging" className="border border-gray-200 rounded-lg p-4 hover:border-brand-400 transition-colors">
              <p className="font-medium text-gray-800 text-sm">Dengue Prevention Guide</p>
              <p className="text-xs text-gray-500 mt-1">WHO protocols for dengue fogging drives</p>
            </Link>
            <Link href="/knowledge/malaria-control-fogging-india" className="border border-gray-200 rounded-lg p-4 hover:border-brand-400 transition-colors">
              <p className="font-medium text-gray-800 text-sm">Malaria Control Guide</p>
              <p className="text-xs text-gray-500 mt-1">Anopheles control and NVBDCP protocols</p>
            </Link>
            <Link href="/is-14855-fogging-machine" className="border border-gray-200 rounded-lg p-4 hover:border-brand-400 transition-colors">
              <p className="font-medium text-gray-800 text-sm">IS 14855 Fogging Machines</p>
              <p className="text-xs text-gray-500 mt-1">BIS standard compliance and documentation</p>
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}
