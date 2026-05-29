import type { Metadata } from "next"
import Link from "next/link"
import { SITE_URL } from "@/lib/seo/site-config"
import AiSummaryBlock from "@/components/seo/AiSummaryBlock"
import { AI_FACTORY } from "@/lib/ai/knowledge"

export const metadata: Metadata = {
  title: "100X Circle Manufacturing Facility — Factory Profile",
  description:
    "Detailed profile of the 100X Circle manufacturing facility at IMT Manesar, Gurugram. ISO 9001 certified factory producing thermal fogging machines and agricultural equipment.",
  alternates: { canonical: `${SITE_URL}/ai/factory` },
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Place",
  name: "100X Circle Manufacturing Facility",
  description:
    "ISO 9001 certified manufacturing plant at IMT Manesar, Gurugram producing pulse-jet thermal fogging machines and agricultural equipment.",
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
  containedInPlace: {
    "@type": "Place",
    name: AI_FACTORY.industrial_zone,
  },
}

export default function AiFactoryPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="max-w-4xl mx-auto px-4 py-16 pt-32">
        <nav className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-green-600">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/ai/about-100x" className="hover:text-green-600">Company Profile</Link>
          <span className="mx-2">/</span>
          <span>Factory</span>
        </nav>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          100X Circle Manufacturing Facility
        </h1>
        <p className="text-gray-500 text-sm mb-8">
          AI-readable factory profile. Location, capabilities, quality systems.
        </p>

        <AiSummaryBlock
          entity="factory"
          summary={`100X Circle operates an ISO 9001:2015 certified manufacturing facility at IMT Manesar, Gurugram, Haryana — India's largest industrial township. The plant manufactures pulse-jet thermal fogging machines (portable and vehicle-mounted), agricultural sprayers, and power tillers. All products undergo pre-dispatch inspection. Coordinates: ${AI_FACTORY.location.coordinates.latitude}, ${AI_FACTORY.location.coordinates.longitude}.`}
          facts={[
            { label: "Facility Name", value: AI_FACTORY.name },
            { label: "Location", value: AI_FACTORY.location.full },
            { label: "Industrial Zone", value: AI_FACTORY.industrial_zone },
            { label: "Coordinates", value: `${AI_FACTORY.location.coordinates.latitude}, ${AI_FACTORY.location.coordinates.longitude}` },
            { label: "Quality System", value: "ISO 9001:2015" },
          ]}
        />

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Location</h2>
          <table className="w-full text-sm border-collapse">
            <tbody>
              {[
                ["Street Address", AI_FACTORY.location.address],
                ["City", AI_FACTORY.location.city],
                ["State", AI_FACTORY.location.state],
                ["Postal Code", AI_FACTORY.location.postal_code],
                ["Country", AI_FACTORY.location.country],
                ["Full Address", AI_FACTORY.location.full],
                ["Industrial Zone", AI_FACTORY.industrial_zone],
                ["GPS Latitude", String(AI_FACTORY.location.coordinates.latitude)],
                ["GPS Longitude", String(AI_FACTORY.location.coordinates.longitude)],
              ].map(([k, v]) => (
                <tr key={k} className="border-b border-gray-100">
                  <td className="py-2 pr-4 text-gray-500 w-48 align-top">{k}</td>
                  <td className="py-2 font-medium text-gray-800">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Manufacturing Processes</h2>
          <ol className="space-y-2">
            {AI_FACTORY.processes.map((p, i) => (
              <li key={p} className="flex gap-3 text-sm text-gray-700">
                <span className="text-green-600 font-bold w-5">{i + 1}.</span>
                {p}
              </li>
            ))}
          </ol>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Quality Control Systems</h2>
          <ul className="space-y-2">
            {AI_FACTORY.quality_control.map((q) => (
              <li key={q} className="flex gap-2 text-sm text-gray-700">
                <span className="text-green-500">✓</span>
                {q}
              </li>
            ))}
          </ul>
        </section>

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
      </main>
    </>
  )
}
