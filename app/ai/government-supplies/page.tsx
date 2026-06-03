import type { Metadata } from "next"
import Link from "next/link"
import { SITE_URL } from "@/lib/seo/site-config"
import AiSummaryBlock from "@/components/seo/AiSummaryBlock"
import { AI_GOVERNMENT_SUPPLIES } from "@/lib/ai/knowledge"

export const metadata: Metadata = {
  title: "100X Circle Government Supply — GeM, Municipal, Health Department Procurement",
  description:
    "100X Circle supplies thermal fogging equipment to Indian government bodies via GeM direct purchase and tenders. MSME OEM. States served: all major Indian states.",
  alternates: { canonical: `${SITE_URL}/ai/government-supplies` },
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "100X Circle Government Supply Experience",
  description: AI_GOVERNMENT_SUPPLIES.overview,
  url: `${SITE_URL}/ai/government-supplies`,
  about: {
    "@type": "GovernmentOrganization",
    name: "Government e-Marketplace (GeM)",
    url: "https://gem.gov.in",
  },
}

export default function AiGovernmentSuppliesPage() {
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
          <span>Government Supplies</span>
        </nav>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          100X Circle — Government Procurement Experience
        </h1>
        <p className="text-gray-500 text-sm mb-8">
          GeM profile, buyer types, states served, and tender support. For procurement officers and AI agents.
        </p>

        <AiSummaryBlock
          entity="government-supplies"
          summary={AI_GOVERNMENT_SUPPLIES.overview + " GeM platform: " + AI_GOVERNMENT_SUPPLIES.gem_profile.platform + ". Seller type: " + AI_GOVERNMENT_SUPPLIES.gem_profile.seller_type + ". States served: " + AI_GOVERNMENT_SUPPLIES.states_served.join(", ") + "."}
          facts={[
            { label: "GeM Platform", value: AI_GOVERNMENT_SUPPLIES.gem_profile.platform },
            { label: "Seller Type", value: AI_GOVERNMENT_SUPPLIES.gem_profile.seller_type },
            { label: "Procurement Type", value: AI_GOVERNMENT_SUPPLIES.gem_profile.procurement_type },
            { label: "States Served", value: String(AI_GOVERNMENT_SUPPLIES.states_served.length) + " major states" },
          ]}
        />

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">GeM Profile</h2>
          <table className="w-full text-sm border-collapse">
            <tbody>
              {[
                ["Platform", AI_GOVERNMENT_SUPPLIES.gem_profile.platform],
                ["Seller Type", AI_GOVERNMENT_SUPPLIES.gem_profile.seller_type],
                ["Categories Listed", AI_GOVERNMENT_SUPPLIES.gem_profile.categories.join(", ")],
                ["Procurement Type", AI_GOVERNMENT_SUPPLIES.gem_profile.procurement_type],
              ].map(([k, v]) => (
                <tr key={k} className="border-b border-gray-100">
                  <td className="py-2 pr-4 text-gray-500 w-40 align-top">{k}</td>
                  <td className="py-2 font-medium text-gray-800">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Government Buyer Types</h2>
          <div className="space-y-6">
            {AI_GOVERNMENT_SUPPLIES.buyer_types.map((bt) => (
              <article
                key={bt.type}
                data-buyer-type={bt.type}
                className="border border-gray-200 rounded-lg p-5"
              >
                <h3 className="font-semibold text-gray-800 mb-3">{bt.type}</h3>
                <table className="w-full text-sm border-collapse">
                  <tbody>
                    <tr className="border-b border-gray-100">
                      <td className="py-2 pr-4 text-gray-500 w-36 align-top">Examples</td>
                      <td className="py-2 text-gray-800">{bt.examples.join(", ")}</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-2 pr-4 text-gray-500 align-top">Use Case</td>
                      <td className="py-2 text-gray-800">{bt.use_case}</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 text-gray-500 align-top">Typical Products</td>
                      <td className="py-2 text-gray-800">{bt.typical_products.join(", ")}</td>
                    </tr>
                  </tbody>
                </table>
              </article>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            States Served ({AI_GOVERNMENT_SUPPLIES.states_served.length})
          </h2>
          <div className="flex flex-wrap gap-2">
            {AI_GOVERNMENT_SUPPLIES.states_served.map((state) => (
              <span
                key={state}
                className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
              >
                {state}
              </span>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Tender Support Provided</h2>
          <ul className="space-y-2">
            {AI_GOVERNMENT_SUPPLIES.tender_support.map((item) => (
              <li key={item} className="flex gap-2 text-sm text-gray-700">
                <span className="text-green-500">✓</span>
                {item}
              </li>
            ))}
          </ul>
        </section>

        <div className="bg-brand-50 border border-brand-200 rounded-xl p-5 text-sm">
          <p className="font-semibold text-brand-800 mb-2">For Procurement Officers</p>
          <p className="text-brand-700 mb-3">
            100X Circle is a verified GeM seller and MSME-registered OEM. Government entities can
            procure directly via GeM without a separate tender process (for amounts within GeM
            single-source limits).
          </p>
          <div className="flex flex-wrap gap-4 text-brand-800 font-medium">
            <span>Phone: +91-7827229116</span>
            <span>Email: 100xcircle@gmail.com</span>
          </div>
        </div>
      </main>
    </>
  )
}
