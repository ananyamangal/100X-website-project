import type { Metadata } from "next"
import Link from "next/link"
import { SITE_URL, BUSINESS } from "@/lib/seo/site-config"
import RFQForm from "@/components/forms/RFQForm"

export const metadata: Metadata = {
  title: "Make in India Fogging Machine — Atmanirbhar Bharat OEM Manufacturer | 100X Circle",
  description:
    "100X Circle manufactures thermal fogging machines in India — Gurugram factory, MSME OEM, IS 14855 compliant. Make in India and Atmanirbhar Bharat procurement preference for government buyers on GeM.",
  keywords: [
    "Make in India fogging machine",
    "Atmanirbhar Bharat fogging machine",
    "Indian made fogging machine",
    "fogging machine manufacturer India Make in India",
    "Indian fogging machine OEM GeM",
    "domestic fogging machine India government",
    "Made in India thermal fogger",
  ],
  alternates: { canonical: `${SITE_URL}/make-in-india-fogging-machine` },
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "Make in India Thermal Fogging Machine",
  description:
    "Thermal fogging machines manufactured in India by 100X Circle Pvt Ltd. MSME OEM, factory at IMT Manesar Gurugram. Make in India and Atmanirbhar Bharat procurement preference applies for government buyers.",
  brand: { "@type": "Brand", name: "100X Circle" },
  manufacturer: {
    "@type": "Organization",
    name: "100X Circle Pvt Ltd",
    "@id": `${SITE_URL}/#organization`,
    address: { "@type": "PostalAddress", addressLocality: "Gurugram", addressRegion: "Haryana", addressCountry: "IN" },
  },
  countryOfOrigin: "IN",
  url: `${SITE_URL}/make-in-india-fogging-machine`,
}

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Why should government bodies choose Make in India fogging machines?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Government procurement policy mandates preference for domestically manufactured products under Make in India and Atmanirbhar Bharat. For fogging machines, this means: (1) MSME-registered Indian OEMs get procurement preference, (2) 25% of government procurement must be from MSME sellers, (3) Indian-made products don't face import duty and supply chain delays, (4) Spare parts availability is faster and cheaper for domestic machines.",
      },
    },
    {
      "@type": "Question",
      name: "Are 100X Circle fogging machines truly Made in India?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. 100X Circle manufactures fogging machines at its factory in IMT Manesar, Gurugram, Haryana. Manufacturing processes include metal fabrication, welding, pulse-jet engine assembly, fuel system assembly, chemical delivery system assembly, and quality testing — all done in-house at the Gurugram factory. 100X Circle is MSME/UDYAM registered and qualifies for Make in India and Atmanirbhar Bharat procurement preference.",
      },
    },
    {
      "@type": "Question",
      name: "What is the price advantage of Indian-made fogging machines vs imports?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Indian-manufactured fogging machines from 100X Circle are 3–5× less expensive than equivalent Korean or German imports. A mid-range portable thermal fogger costs ₹40,000–₹48,000 from 100X Circle vs ₹1,50,000–₹2,00,000 for imported equivalents. This price advantage is sustained over the machine's life through cheaper Indian spare parts (30–60% less than imported spares) and local maintenance support.",
      },
    },
  ],
}

const ADVANTAGES = [
  { title: "MSME Procurement Preference", desc: "25% of government procurement mandated from MSME sellers. 100X Circle is MSME/UDYAM registered — your procurement from us counts toward this target." },
  { title: "Make in India Compliance", desc: "100% manufactured at Gurugram factory. Qualifies for Make in India and Public Procurement (Preference to Make in India) Order, 2017." },
  { title: "No Import Dependency", desc: "No supply chain disruptions from global shipping delays or import restrictions. Stock maintained in Gurugram for 5–10 day pan-India dispatch." },
  { title: "Local Spare Parts", desc: "All spare parts manufactured or sourced domestically. 3–7 day delivery anywhere in India. No 6-week wait for imported spare parts." },
  { title: "Direct Manufacturer Warranty", desc: "Warranty backed by the actual manufacturer — not an importer or trading house. Direct factory support." },
  { title: "IS 14855 and BIS Standards", desc: "Manufactured to Indian Standards (IS 14855 Part 1). Korean and German imports may not meet this standard, creating tender disqualification risk." },
]

export default function MakeInIndiaFoggingMachinePage() {
  const waLink = `https://wa.me/${BUSINESS.whatsappE164}?text=${encodeURIComponent("Hi, I want to procure Make in India fogging machines. Please share details and GeM listing.")}`

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <main className="max-w-3xl mx-auto px-4 py-16 pt-32">
        <nav className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-brand-600">Home</Link>
          <span className="mx-2">/</span>
          <span>Make in India Fogging Machine</span>
        </nav>

        <div className="flex flex-wrap gap-2 mb-4">
          {["Make in India", "Atmanirbhar Bharat", "MSME OEM", "GeM Listed"].map((t) => (
            <span key={t} className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">{t}</span>
          ))}
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          Make in India Fogging Machine — Atmanirbhar Bharat OEM Manufacturer
        </h1>
        <p className="text-gray-500 text-sm mb-2">
          100X Circle Pvt Ltd · Manufactured in Gurugram, Haryana · MSME OEM · GeM Listed
        </p>
        <p className="text-gray-600 text-lg mb-8 leading-relaxed">
          100X Circle manufactures thermal fogging machines at its factory in IMT Manesar,
          Gurugram — genuinely Made in India. MSME/UDYAM registered. Qualifies for Make in
          India and Atmanirbhar Bharat procurement preference on GeM.
        </p>

        <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-8 text-sm text-green-800">
          <strong>Procurement Officers:</strong> Buying from 100X Circle counts toward your
          MSME procurement mandate and Make in India compliance. MSME/UDYAM certificate and
          Make in India declaration available for all orders.
        </div>

        <div className="bg-brand-600 rounded-xl p-6 mb-10 text-white">
          <h2 className="font-bold text-xl mb-2">Buy Make in India Fogging Machines</h2>
          <p className="text-brand-100 text-sm mb-4">
            Available on GeM. Direct from factory. MSME OEM with IS 14855 documentation.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <a href={waLink} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-white text-brand-700 font-semibold px-5 py-2.5 rounded-lg text-sm">
              WhatsApp: +91-7827229116
            </a>
            <a href={`tel:${BUSINESS.phonePrimary.replace(/\s+/g, "")}`}
              className="inline-flex items-center justify-center border border-brand-300 text-white font-medium px-5 py-2.5 rounded-lg text-sm">
              Call: {BUSINESS.phonePrimary}
            </a>
          </div>
        </div>

        <article className="prose prose-gray max-w-none">
          <h2>100X Circle — India&apos;s MSME Fogging Machine Manufacturer</h2>
          <p>
            100X Circle Pvt Ltd has manufactured pulse-jet thermal fogging machines in India
            since 2014. The factory at IMT Manesar, Gurugram (Haryana) operates under ISO
            9001:2015 quality management certification. All manufacturing — from metal
            fabrication to final assembly and quality testing — is performed at the Gurugram
            facility.
          </p>
          <p>
            This distinguishes 100X Circle from importers and trading houses that source
            Korean, Chinese, or German machines and resell under Indian brand names. 100X
            Circle is the actual OEM — the original equipment manufacturer.
          </p>

          <h2>The Public Procurement Preference for Make in India</h2>
          <p>
            The Government of India&apos;s Public Procurement (Preference to Make in India)
            Order, 2017 mandates procurement preference for domestically manufactured goods.
            For fogging machines, this means:
          </p>
          <ul>
            <li>Government buyers must prefer Indian-manufactured machines over imports when comparing equivalent specifications</li>
            <li>MSME-registered Indian manufacturers receive additional procurement preference</li>
            <li>GeM platform implements these preferences automatically — MSME sellers are flagged for preference treatment</li>
          </ul>
        </article>

        {/* Advantages grid */}
        <h2 className="text-xl font-semibold text-gray-800 mb-4 mt-8">Why Make in India Fogging Machines Win</h2>
        <div className="grid sm:grid-cols-2 gap-4 mb-10">
          {ADVANTAGES.map((a) => (
            <div key={a.title} className="border border-gray-200 rounded-xl p-4">
              <h3 className="font-semibold text-gray-800 text-sm mb-1">{a.title}</h3>
              <p className="text-xs text-gray-600">{a.desc}</p>
            </div>
          ))}
        </div>

        <article className="prose prose-gray max-w-none mb-8">
          <h2>Manufacturing at IMT Manesar, Gurugram</h2>
          <p>
            100X Circle&apos;s factory is located at UG, 398, Sector 7, Industrial Model
            Township (IMT) Manesar, Gurugram, Haryana 122050. Factory processes:
          </p>
          <ul>
            <li>Metal fabrication and welding (tank bodies, chassis)</li>
            <li>Pulse-jet engine assembly (resonance chamber, combustion nozzle)</li>
            <li>Fuel system assembly (tank, lines, fittings)</li>
            <li>Chemical delivery system assembly (chemical tank, nozzle, valves)</li>
            <li>Quality control and performance testing</li>
            <li>Packaging and dispatch</li>
          </ul>
          <p>
            Factory visits for institutional buyers and dealers are available by appointment.
          </p>
        </article>

        {/* RFQ Form */}
        <section id="rfq" className="mt-12 mb-12">
          <div className="rounded-2xl bg-gradient-to-b from-gray-50 to-white shadow-xl p-6 md:p-10">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                Enquire About Make in India Fogging Machines
              </h2>
              <p className="text-sm md:text-base text-gray-600">
                For government buyers, GeM procurement, MSME compliance, and bulk orders.
                MSME/UDYAM and Make in India documentation available for all orders.
              </p>
            </div>
            <RFQForm
              variant="card"
              location="make-in-india-fogging-machine"
              defaultProduct="Thermal Fogging Machine"
              defaultOrganization=""
              defaultDescription="Enquiring about Make in India / Atmanirbhar Bharat fogging machines for government procurement."
            />
          </div>
        </section>

        <div className="border-t border-gray-200 pt-8">
          <div className="grid sm:grid-cols-2 gap-4">
            <Link href="/become-a-dealer" className="border border-gray-200 rounded-lg p-4 hover:border-brand-400 transition-colors">
              <p className="font-medium text-gray-800 text-sm">Become a Dealer</p>
              <p className="text-xs text-gray-500 mt-1">Sell Make in India fogging machines</p>
            </Link>
            <Link href="/is-14855-fogging-machine" className="border border-gray-200 rounded-lg p-4 hover:border-brand-400 transition-colors">
              <p className="font-medium text-gray-800 text-sm">IS 14855 Fogging Machines</p>
              <p className="text-xs text-gray-500 mt-1">BIS standard compliance</p>
            </Link>
            <Link href="/gem-oem-authorization" className="border border-gray-200 rounded-lg p-4 hover:border-brand-400 transition-colors">
              <p className="font-medium text-gray-800 text-sm">GeM OEM Authorization</p>
              <p className="text-xs text-gray-500 mt-1">Reseller authorization for GeM</p>
            </Link>
            <Link href="/municipal-fogging-programme" className="border border-gray-200 rounded-lg p-4 hover:border-brand-400 transition-colors">
              <p className="font-medium text-gray-800 text-sm">Municipal Fogging Programme</p>
              <p className="text-xs text-gray-500 mt-1">Government procurement guide</p>
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}
