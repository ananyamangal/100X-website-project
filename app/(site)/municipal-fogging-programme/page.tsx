import type { Metadata } from "next"
import Link from "next/link"
import { SITE_URL, BUSINESS } from "@/lib/seo/site-config"

export const revalidate = 60

export const metadata: Metadata = {
  title: "Municipal Fogging Programme — Thermal Fogging Machines for Municipalities | 100X Circle",
  description:
    "Thermal fogging machines for municipal corporations, Nagar Nigams, Nagar Panchayats, and gram panchayats. GeM listed, IS 14855 compliant, MSME OEM. For dengue, malaria, and vector control programmes.",
  keywords: [
    "municipal fogging machine India",
    "fogging machine for municipal corporation",
    "Nagar Nigam fogging machine",
    "municipal vector control India",
    "thermal fogging machine government",
    "dengue control fogging machine municipality",
    "municipal mosquito control equipment",
    "fogging machine Nagar Panchayat GeM",
  ],
  alternates: { canonical: `${SITE_URL}/municipal-fogging-programme` },
  openGraph: {
    title: "Municipal Fogging Programme — Thermal Fogging Machines for Municipalities",
    description:
      "GeM-listed, IS 14855 compliant fogging machines for municipal vector control. 100X Circle supplies Nagar Nigams, Nagar Panchayats, and health departments across India.",
    url: `${SITE_URL}/municipal-fogging-programme`,
    type: "website",
  },
}

const jsonLdFaq = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Which fogging machine is best for municipal corporation use?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "For large municipal corporations (Nagar Nigams), vehicle-mounted fogging machines with 50–100 litre capacity are ideal for ward-level fogging drives. For smaller municipalities (Nagar Panchayats), portable thermal foggers (18–50 litre) operated by a single person are more practical. 100X Circle supplies both types — IS 14855 compliant, ISO 9001 certified, GeM listed. Contact +91-7827229116.",
      },
    },
    {
      "@type": "Question",
      name: "Can municipalities buy fogging machines on GeM?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. All municipal bodies including Nagar Nigams, Nagar Palika Parishads, Nagar Panchayats, and gram panchayats can purchase fogging machines on GeM (Government e-Marketplace) as government buyers. 100X Circle is a GeM-listed MSME OEM seller. For amounts within GeM direct purchase limits, municipalities can order without a separate tender.",
      },
    },
    {
      "@type": "Question",
      name: "What is the standard fogging schedule for municipal mosquito control?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Municipal mosquito control fogging is typically scheduled: (1) Early morning (5–7 AM) or evening (7–9 PM) when mosquitoes are active and wind is low. (2) Weekly fogging during high-risk months (June–October in most Indian states). (3) Emergency fogging within 48 hours of dengue or malaria case clusters. WHO recommends thermal fogging for outdoor vector control with oil-based insecticide formulations.",
      },
    },
    {
      "@type": "Question",
      name: "What documentation does a municipality need to procure fogging machines?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "For GeM direct purchase: government buyer GeM login and valid procurement authorization. For open tender: IS 14855 compliance certificate from supplier, ISO 9001 certificate, MSME/UDYAM certificate, technical specifications, GST registration. 100X Circle provides all required documentation for municipal procurement. Contact 100xcircle@gmail.com.",
      },
    },
  ],
}

const jsonLdProduct = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "Thermal Fogging Machine for Municipal Vector Control",
  description:
    "IS 14855 (Part 1) compliant, ISO 9001:2015 certified thermal fogging machines for municipal corporations, Nagar Nigams, Nagar Panchayats, and health departments. For dengue, malaria, and mosquito vector control programmes. GeM listed MSME OEM.",
  brand: { "@type": "Brand", name: "100X Circle" },
  manufacturer: { "@id": `${SITE_URL}/#organization` },
  countryOfOrigin: "IN",
  url: `${SITE_URL}/municipal-fogging-programme`,
}

const BUYER_TYPES = [
  {
    type: "Municipal Corporation (Nagar Nigam)",
    cities: "Delhi, Mumbai, Kolkata, Chennai, Pune, Nagpur, and all Class I cities",
    machine: "Vehicle-mounted fogger (50–100L) or fleet of portable foggers",
    procurement: "GeM direct purchase, GeM reverse auction, or open tender",
  },
  {
    type: "Nagar Palika Parishad / Nagar Panchayat",
    cities: "Class II and III towns across all states",
    machine: "Portable thermal fogger (18–50L), single or fleet",
    procurement: "GeM direct purchase (within threshold) or state tender",
  },
  {
    type: "Gram Panchayat",
    cities: "Rural areas, village-level administration",
    machine: "Portable thermal fogger or handheld mini fogger",
    procurement: "State government scheme, Panchayati Raj funds, or direct order",
  },
  {
    type: "District Health Department",
    cities: "District-level vector control programmes, all states",
    machine: "Portable thermal foggers for health worker teams",
    procurement: "State health department tender or GeM",
  },
  {
    type: "State Vector Control Programme",
    cities: "State-level NVBDCP, NHM, and health mission procurement",
    machine: "Bulk fleet procurement of portable and vehicle-mounted foggers",
    procurement: "State rate contract tender or GeM bulk order",
  },
]

const KNOWLEDGE_LINKS = [
  { href: "/knowledge/dengue-prevention-thermal-fogging", title: "Dengue Prevention Using Thermal Fogging", desc: "How thermal fogging controls Aedes mosquitoes that spread dengue" },
  { href: "/knowledge/malaria-control-fogging-india", title: "Malaria Control Using Thermal Fogging in India", desc: "Thermal fogging in India's national malaria control programme" },
  { href: "/knowledge/mosquito-control-india", title: "Mosquito Control and Thermal Fogging in India", desc: "Municipal mosquito control operations and outbreak response" },
  { href: "/knowledge/government-procurement-guide", title: "Government Procurement Guide", desc: "Step-by-step GeM procurement for municipal buyers" },
  { href: "/knowledge/fogging-machine-operators-guide", title: "Fogging Machine Operator's Guide", desc: "Pre-operation, operation, and post-operation procedures" },
  { href: "/knowledge/fogging-machine-safety-guide", title: "Fogging Machine Safety Guide", desc: "PPE, chemical safety, and municipal worker protection" },
]

export default function MunicipalFoggingProgrammePage() {
  const waLink = `https://wa.me/${BUSINESS.whatsappE164}?text=${encodeURIComponent("Hi, I am from a municipal body and need fogging machines for our vector control programme. Please share details.")}`

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
          <span>Municipal Fogging Programme</span>
        </nav>

        <div className="flex flex-wrap gap-2 mb-4">
          {["Municipal", "Vector Control", "GeM", "Government"].map((tag) => (
            <span key={tag} className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          Thermal Fogging Machines for Municipal Vector Control Programmes
        </h1>
        <p className="text-gray-500 text-sm mb-2">
          100X Circle Pvt Ltd · MSME OEM · GeM Listed · IS 14855 Compliant · ISO 9001:2015
        </p>
        <p className="text-gray-600 text-lg mb-8 leading-relaxed">
          100X Circle supplies municipal corporations, Nagar Nigams, Nagar Panchayats, and
          district health departments with IS 14855-compliant thermal fogging machines for
          dengue, malaria, and mosquito vector control. GeM procurement available.
        </p>

        {/* CTA */}
        <div className="bg-brand-600 rounded-xl p-6 mb-10 text-white">
          <h2 className="font-bold text-xl mb-2">Procurement Enquiry</h2>
          <p className="text-brand-100 text-sm mb-4">
            For municipal corporations, health departments, and Panchayati Raj institutions.
            Share your requirement — machines, quantity, delivery state. We respond within
            1 working day with quotation and IS 14855 documentation.
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
              href={`mailto:${BUSINESS.email}?subject=Municipal Fogging Machine Procurement`}
              className="inline-flex items-center justify-center border border-brand-300 text-white font-medium px-5 py-2.5 rounded-lg text-sm hover:bg-brand-700 transition-colors"
            >
              Email for Quotation
            </a>
          </div>
        </div>

        <article className="prose prose-gray max-w-none">
          <h2>Why Municipalities Use Thermal Fogging for Vector Control</h2>
          <p>
            Thermal fogging is the most effective outdoor mosquito control method for
            municipal vector programmes. The pulse-jet engine vaporises oil-based insecticide
            into ultra-fine droplets (1–50 microns) that penetrate dense vegetation, drains,
            and shaded areas where mosquitoes rest — areas that sprayers cannot reach.
          </p>
          <p>
            Key reasons municipal health departments rely on thermal fogging:
          </p>
          <ul>
            <li>
              <strong>Rapid coverage:</strong> A single portable fogger can cover 2–5 acres
              per hour. Vehicle-mounted units cover entire wards in a single drive-through.
            </li>
            <li>
              <strong>Penetration depth:</strong> The fog particle size (1–30 microns) is
              sized to remain airborne and penetrate canopy cover, wall voids, and drain
              openings — targeting resting adult mosquitoes.
            </li>
            <li>
              <strong>Speed during outbreaks:</strong> Emergency fogging response can be
              deployed within hours of outbreak notification — critical for dengue cluster
              control.
            </li>
            <li>
              <strong>Proven efficacy:</strong> WHO-recommended for adult mosquito control
              in outdoor environments. Standard protocol of national vector control programmes.
            </li>
          </ul>

          <h2>100X Circle Municipal Supply Credentials</h2>
          <ul>
            <li><strong>GeM Listed:</strong> Government e-Marketplace approved MSME OEM seller</li>
            <li><strong>IS 14855 (Part 1):</strong> Fogging machines manufactured to BIS standard</li>
            <li><strong>ISO 9001:2015:</strong> Quality management certified manufacturing</li>
            <li><strong>MSME/UDYAM:</strong> Registered — qualifies for 25% MSME procurement preference</li>
            <li><strong>Track record:</strong> Supplies to municipal corporations, Nagar Nigams, and health departments in Bihar, Uttar Pradesh, Haryana, Delhi NCR, Maharashtra, and 10+ other states</li>
            <li><strong>Pan-India dispatch:</strong> 5–10 working days from Gurugram factory</li>
          </ul>
        </article>

        {/* Buyer types */}
        <h2 className="text-xl font-semibold text-gray-800 mb-4 mt-8">
          Procurement by Municipal Body Type
        </h2>
        <div className="space-y-4 mb-10">
          {BUYER_TYPES.map((b) => (
            <div key={b.type} className="border border-gray-200 rounded-xl p-5">
              <h3 className="font-semibold text-gray-800 mb-2">{b.type}</h3>
              <div className="grid sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-gray-400 block mb-0.5">Coverage</span>
                  <span className="text-gray-700">{b.cities}</span>
                </div>
                <div>
                  <span className="text-gray-400 block mb-0.5">Machine</span>
                  <span className="text-gray-700">{b.machine}</span>
                </div>
                <div>
                  <span className="text-gray-400 block mb-0.5">Procurement Route</span>
                  <span className="text-brand-700 font-medium">{b.procurement}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <article className="prose prose-gray max-w-none mb-8">
          <h2>Standard Documentation for Municipal Tenders</h2>
          <p>
            100X Circle provides the following for municipal procurement tenders:
          </p>
          <ul>
            <li>IS 14855 (Part 1) compliance documentation</li>
            <li>ISO 9001:2015 quality management certificate</li>
            <li>MSME/UDYAM registration certificate</li>
            <li>Technical specification sheets (matching tender BOQ parameters)</li>
            <li>GeM seller verification and OEM profile</li>
            <li>GST registration documents</li>
            <li>CE marking certificate (export-grade models)</li>
            <li>Sample/demo unit availability on request</li>
          </ul>

          <h2>Procurement via GeM — Fastest Route</h2>
          <p>
            For municipal bodies within GeM direct purchase limits, purchasing from 100X
            Circle on GeM is the fastest procurement route — no separate tender required.
            Search for "100X Circle" or "fogging machine IS 14855" on gem.gov.in.
          </p>
          <p>
            For larger orders, initiate a GeM reverse auction — 100X Circle participates
            and provides competitive pricing. MSME preference applies.
          </p>

          <h2>Seasonal Fogging Programme Planning</h2>
          <p>
            Municipal fogging procurement is seasonal, peaking with India&apos;s monsoon
            cycle. Planning procurement 2–3 months before the peak season (May–June) ensures
            machines are available when dengue and malaria risk is highest.
          </p>
          <p>
            100X Circle maintains production inventory to meet seasonal demand. For bulk
            municipal orders (10+ units), advance ordering is recommended. Contact us in
            Q1 (January–March) to plan seasonal procurement.
          </p>
        </article>

        {/* FAQ */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {[
              {
                q: "How many fogging machines does a typical Nagar Panchayat need?",
                a: "A Nagar Panchayat typically needs 2–5 portable thermal foggers for seasonal vector control. Larger Nagar Palika Parishads may need 5–20 machines. The exact requirement depends on area coverage, population density, and programme intensity. Contact us with your ward count and area size for a recommendation.",
              },
              {
                q: "What insecticide formulations are used with 100X Circle foggers?",
                a: "Thermal fogging requires oil-based insecticide formulations. Common choices for municipal mosquito control include: deltamethrin (0.5% EC in oil), cypermethrin, malathion, and permethrin — all in oil-based formulations as specified by NVBDCP and WHO. Water-based formulations are not suitable for thermal fogging and should only be used with ULV cold foggers.",
              },
              {
                q: "Does 100X Circle offer maintenance contracts for municipal machines?",
                a: "100X Circle provides genuine spare parts and after-sales support. For annual maintenance contracts (AMC), contact us to discuss options. We can also train your municipal fogging operators through technical sessions at the factory or on-site.",
              },
            ].map(({ q, a }) => (
              <details key={q} className="border border-gray-200 rounded-xl">
                <summary className="p-4 font-medium text-gray-800 cursor-pointer text-sm">{q}</summary>
                <p className="px-4 pb-4 text-sm text-gray-600">{a}</p>
              </details>
            ))}
          </div>
        </div>

        {/* Knowledge cluster links */}
        <div className="border border-gray-200 rounded-xl p-6 mb-8">
          <h2 className="font-semibold text-gray-800 mb-4">Municipal Vector Control Resources</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {KNOWLEDGE_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="border border-gray-100 bg-gray-50 rounded-lg p-3 hover:border-brand-300 transition-colors"
              >
                <p className="font-medium text-gray-800 text-xs mb-0.5">{l.title}</p>
                <p className="text-xs text-gray-500">{l.desc}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-8">
          <h2 className="font-semibold text-gray-800 mb-2">Contact for Municipal Procurement</h2>
          <p className="text-sm text-gray-600 mb-4">
            For procurement quotations, IS 14855 documentation, and GeM order support.
            We respond within 1 working day.
          </p>
          <div className="grid sm:grid-cols-2 gap-2 text-sm font-medium text-gray-800">
            <span>Phone / WhatsApp: <a href={`tel:${BUSINESS.phonePrimary}`} className="text-brand-600">{BUSINESS.phonePrimary}</a></span>
            <span>Email: <a href={`mailto:${BUSINESS.email}`} className="text-brand-600">{BUSINESS.email}</a></span>
            <span className="sm:col-span-2">GeM: <span className="text-brand-600">gem.gov.in → search &quot;100X Circle&quot;</span></span>
          </div>
        </div>

        {/* Related */}
        <div className="border-t border-gray-200 pt-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Related</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Link href="/knowledge/government-procurement-guide" className="border border-gray-200 rounded-lg p-4 hover:border-brand-400 transition-colors">
              <p className="font-medium text-gray-800 text-sm">Government Procurement Guide</p>
              <p className="text-xs text-gray-500 mt-1">Full GeM procurement process for government buyers</p>
            </Link>
            <Link href="/is-14855-fogging-machine" className="border border-gray-200 rounded-lg p-4 hover:border-brand-400 transition-colors">
              <p className="font-medium text-gray-800 text-sm">IS 14855 Fogging Machines</p>
              <p className="text-xs text-gray-500 mt-1">BIS standard compliance and documentation</p>
            </Link>
            <Link href="/vehicle-mounted-fogging-machine" className="border border-gray-200 rounded-lg p-4 hover:border-brand-400 transition-colors">
              <p className="font-medium text-gray-800 text-sm">Vehicle-Mounted Fogger</p>
              <p className="text-xs text-gray-500 mt-1">High-capacity municipal ward fogging</p>
            </Link>
            <Link href="/compare/best-thermal-fogging-machine-for-municipal-use" className="border border-gray-200 rounded-lg p-4 hover:border-brand-400 transition-colors">
              <p className="font-medium text-gray-800 text-sm">Best Fogging Machine for Municipal Use</p>
              <p className="text-xs text-gray-500 mt-1">Comparison guide for municipal buyers</p>
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}
