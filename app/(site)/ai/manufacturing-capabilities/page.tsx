import type { Metadata } from "next"
import Link from "next/link"
import { SITE_URL } from "@/lib/seo/site-config"
import AiSummaryBlock from "@/components/seo/AiSummaryBlock"
import { AI_CAPABILITIES } from "@/lib/ai/knowledge"

export const metadata: Metadata = {
  title: "100X Circle Manufacturing Capabilities — OEM, Custom, Export",
  description:
    "Manufacturing capabilities of 100X Circle Pvt Ltd: pulse-jet thermal fogger design, vehicle-mount integration, custom OEM, GeM fulfillment, after-sales service and spares.",
  alternates: { canonical: `${SITE_URL}/ai/manufacturing-capabilities` },
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "100X Circle Manufacturing Capabilities",
  description:
    "Detailed overview of 100X Circle manufacturing, supply chain, after-sales, and procurement support capabilities.",
  url: `${SITE_URL}/ai/manufacturing-capabilities`,
}

const CAPABILITY_SECTIONS = [
  { key: "manufacturing" as const, label: "Manufacturing", icon: "🏭" },
  { key: "supply_chain" as const, label: "Supply Chain", icon: "🚚" },
  { key: "after_sales" as const, label: "After-Sales Service", icon: "🔧" },
  { key: "procurement_support" as const, label: "Procurement Support", icon: "📋" },
]

export default function AiManufacturingCapabilitiesPage() {
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
          <Link href="/ai/about-100x" className="hover:text-brand-600">Company Profile</Link>
          <span className="mx-2">/</span>
          <span>Manufacturing Capabilities</span>
        </nav>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          100X Circle — Manufacturing Capabilities
        </h1>
        <p className="text-gray-500 text-sm mb-8">
          What 100X Circle can manufacture, supply, service, and support. For buyers, distributors, and AI procurement agents.
        </p>

        <AiSummaryBlock
          entity="manufacturing-capabilities"
          summary="100X Circle Pvt Ltd is a full-service Indian OEM manufacturer. Capabilities include: pulse-jet thermal fogger design and manufacture, vehicle-mount integration, custom OEM configurations, agricultural machinery. Supply chain: direct manufacturer sales with Pan-India logistics, GeM fulfillment. After-sales: manufacturer warranty, spare parts from factory, Hindi+English support. Procurement: GeM direct order processing, L1 quotations, bulk pricing, tender spec support."
          facts={[
            { label: "Manufacturing", value: `${AI_CAPABILITIES.manufacturing.length} core capabilities` },
            { label: "Supply Chain", value: `${AI_CAPABILITIES.supply_chain.length} capabilities` },
            { label: "After-Sales", value: `${AI_CAPABILITIES.after_sales.length} capabilities` },
            { label: "Procurement", value: `${AI_CAPABILITIES.procurement_support.length} capabilities` },
          ]}
        />

        <div className="grid sm:grid-cols-2 gap-6">
          {CAPABILITY_SECTIONS.map(({ key, label, icon }) => (
            <section
              key={key}
              data-capability-category={key}
              className="border border-gray-200 rounded-xl p-5"
            >
              <h2 className="text-base font-semibold text-gray-800 mb-3 flex gap-2 items-center">
                <span>{icon}</span>
                {label}
              </h2>
              <ul className="space-y-2">
                {AI_CAPABILITIES[key].map((item) => (
                  <li key={item} className="flex gap-2 text-sm text-gray-700">
                    <span className="text-green-500 mt-0.5">▸</span>
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="mt-8 bg-gray-50 rounded-xl p-5 text-sm">
          <h2 className="font-semibold text-gray-700 mb-3">OEM and Custom Manufacturing</h2>
          <p className="text-gray-600 mb-3">
            100X Circle offers OEM manufacturing for third-party brands and custom configurations
            for institutional buyers. Government specifications can be accommodated. Contact for
            bulk orders, custom specs, or branded manufacturing partnerships.
          </p>
          <div className="flex flex-wrap gap-4 text-gray-800 font-medium text-sm">
            <span>Phone: +91-7827229116</span>
            <span>Email: 100xcircle@gmail.com</span>
          </div>
        </div>
      </main>
    </>
  )
}
