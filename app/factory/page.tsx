import type { Metadata } from "next"
import Link from "next/link"
import { SITE_URL } from "@/lib/seo/site-config"
import { AI_FACTORY, AI_CERTIFICATIONS } from "@/lib/ai/knowledge"

export const metadata: Metadata = {
  title: "100X Circle Factory — IMT Manesar Manufacturing Facility | Gurugram",
  description:
    "100X Circle's ISO 9001:2015 certified manufacturing facility at IMT Manesar, Gurugram. Factory processes, quality systems, product range, and GPS location for visiting buyers.",
  alternates: { canonical: `${SITE_URL}/factory` },
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": ["LocalBusiness", "AutoPartsStore"],
  "@id": `${SITE_URL}/#factory`,
  name: "100X Circle Manufacturing Facility",
  description:
    "ISO 9001:2015 certified factory producing pulse-jet thermal fogging machines and agricultural equipment at IMT Manesar, Gurugram, Haryana.",
  url: SITE_URL,
  telephone: "+91-7827229116",
  email: "100xcircle@gmail.com",
  address: {
    "@type": "PostalAddress",
    streetAddress: AI_FACTORY.location.address,
    addressLocality: AI_FACTORY.location.city,
    addressRegion: AI_FACTORY.location.state,
    postalCode: AI_FACTORY.location.postal_code,
    addressCountry: "IN",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: AI_FACTORY.location.coordinates.latitude,
    longitude: AI_FACTORY.location.coordinates.longitude,
  },
  hasMap: `https://maps.google.com/?q=${AI_FACTORY.location.coordinates.latitude},${AI_FACTORY.location.coordinates.longitude}`,
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      opens: "09:00",
      closes: "18:00",
    },
  ],
  containedInPlace: {
    "@type": "Place",
    name: "IMT Manesar — Industrial Model Township",
    address: { "@type": "PostalAddress", addressLocality: "Manesar", addressRegion: "Haryana", addressCountry: "IN" },
  },
  hasCredential: AI_CERTIFICATIONS.map((c) => ({
    "@type": "EducationalOccupationalCredential",
    name: c.name,
    credentialCategory: c.type,
    description: c.significance,
  })),
  makesOffer: {
    "@type": "OfferCatalog",
    name: "100X Circle Products",
    itemListElement: AI_FACTORY.products_manufactured.map((p) => ({
      "@type": "Offer",
      itemOffered: { "@type": "Product", name: p },
    })),
  },
}

export default function FactoryPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="max-w-4xl mx-auto px-4 py-16 pt-32">
        <nav className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-brand-600">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/about" className="hover:text-brand-600">About</Link>
          <span className="mx-2">/</span>
          <span>Factory</span>
        </nav>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          100X Circle Manufacturing Facility
        </h1>
        <p className="text-gray-500 text-sm mb-8">
          ISO 9001:2015 certified factory at IMT Manesar, Gurugram, Haryana, India.
        </p>

        {/* Location */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Factory Location</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            <table className="text-sm border-collapse">
              <tbody>
                {[
                  ["Street Address", AI_FACTORY.location.address],
                  ["City", AI_FACTORY.location.city],
                  ["State", AI_FACTORY.location.state],
                  ["Pin Code", AI_FACTORY.location.postal_code],
                  ["Industrial Zone", AI_FACTORY.industrial_zone],
                  ["GPS", `${AI_FACTORY.location.coordinates.latitude}, ${AI_FACTORY.location.coordinates.longitude}`],
                ].map(([k, v]) => (
                  <tr key={k} className="border-b border-gray-100">
                    <td className="py-2 pr-4 text-gray-500 w-36 align-top text-xs">{k}</td>
                    <td className="py-2 font-medium text-gray-800 text-xs">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="bg-gray-100 rounded-xl overflow-hidden h-48 flex items-center justify-center">
              <a
                href={`https://maps.google.com/?q=${AI_FACTORY.location.coordinates.latitude},${AI_FACTORY.location.coordinates.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-2 text-gray-600 hover:text-brand-600"
              >
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-sm font-medium">Open in Google Maps</span>
                <span className="text-xs text-gray-400">IMT Manesar, Gurugram</span>
              </a>
            </div>
          </div>
        </section>

        {/* About IMT Manesar */}
        <section className="mb-10 bg-gray-50 rounded-xl p-5">
          <h2 className="font-semibold text-gray-800 mb-2">About IMT Manesar</h2>
          <p className="text-sm text-gray-600">
            IMT Manesar (Industrial Model Township) is Haryana&apos;s largest planned industrial estate,
            located 30 km southwest of Delhi. Home to 1,500+ manufacturing units including Maruti
            Suzuki, Hero MotoCorp, and hundreds of engineering and manufacturing companies. IMT
            Manesar offers strong supply chain infrastructure, skilled labour, and connectivity
            via NH-48 (Delhi-Jaipur highway). 100X Circle has operated from Sector 7, IMT Manesar
            since inception.
          </p>
        </section>

        {/* Manufacturing Processes */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Manufacturing Processes</h2>
          <ol className="space-y-3">
            {AI_FACTORY.processes.map((p, i) => (
              <li key={p} className="flex gap-4 text-sm">
                <span className="flex-shrink-0 w-7 h-7 bg-brand-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                  {i + 1}
                </span>
                <span className="text-gray-700 pt-1">{p}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* Quality Control */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Quality Control Systems</h2>
          <ul className="space-y-2">
            {AI_FACTORY.quality_control.map((q) => (
              <li key={q} className="flex gap-2 text-sm text-gray-700">
                <span className="text-green-500 mt-0.5">✓</span>
                {q}
              </li>
            ))}
          </ul>
        </section>

        {/* Certifications */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Factory Certifications</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {AI_CERTIFICATIONS.map((cert) => (
              <div key={cert.name} className="border border-gray-200 rounded-lg p-4 text-sm">
                <p className="font-semibold text-gray-800">{cert.name}</p>
                <p className="text-xs text-gray-500 mt-1">{cert.type}</p>
                <p className="text-xs text-gray-400 mt-0.5">Issued by: {cert.issued_by}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Certificate copies available on request for tender and procurement documentation.
            Contact: 100xcircle@gmail.com
          </p>
        </section>

        {/* Products Made */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Products Manufactured</h2>
          <ul className="space-y-2">
            {AI_FACTORY.products_manufactured.map((p) => (
              <li key={p} className="flex gap-2 text-sm text-gray-700">
                <span className="text-green-500">▸</span>
                {p}
              </li>
            ))}
          </ul>
        </section>

        {/* Visit / Contact */}
        <div className="bg-brand-50 border border-brand-200 rounded-xl p-5 text-sm">
          <h2 className="font-semibold text-brand-800 mb-2">Visit the Factory or Request a Demo</h2>
          <p className="text-brand-700 mb-3">
            Government procurement officers and institutional buyers are welcome to visit the
            factory at IMT Manesar for product demonstrations. Please call or email in advance
            to schedule.
          </p>
          <div className="flex flex-wrap gap-4 text-brand-800 font-medium">
            <span>📞 +91-7827229116</span>
            <span>✉ 100xcircle@gmail.com</span>
            <a
              href={`https://maps.google.com/?q=${AI_FACTORY.location.coordinates.latitude},${AI_FACTORY.location.coordinates.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:no-underline"
            >
              Get Directions →
            </a>
          </div>
        </div>
      </main>
    </>
  )
}
