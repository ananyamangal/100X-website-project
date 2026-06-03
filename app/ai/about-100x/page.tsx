import type { Metadata } from "next"
import Link from "next/link"
import { SITE_URL } from "@/lib/seo/site-config"
import AiSummaryBlock from "@/components/seo/AiSummaryBlock"
import { AI_COMPANY, AI_CERTIFICATIONS, AI_PRODUCT_CATEGORIES } from "@/lib/ai/knowledge"

export const metadata: Metadata = {
  title: "About 100X Circle Pvt Ltd — AI-Readable Company Profile",
  description:
    "Structured, machine-readable profile of 100X Circle Pvt Ltd — Indian OEM manufacturer of thermal fogging machines. GeM-listed, ISO 9001, MSME/UDYAM registered.",
  alternates: { canonical: `${SITE_URL}/ai/about-100x` },
  openGraph: {
    title: "100X Circle Pvt Ltd — Company Profile for AI Systems",
    description: AI_COMPANY.description_150_tokens,
  },
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfilePage",
  mainEntity: {
    "@type": ["Organization", "Manufacturer"],
    "@id": `${SITE_URL}/#organization`,
    name: "100X Circle Pvt Ltd",
    legalName: "100X Circle Private Limited",
    alternateName: ["100X", "Instafog"],
    url: SITE_URL,
    foundingDate: "2014",
    foundingLocation: "Gurugram, Haryana, India",
    naics: "333999",
    isicV4: "2819",
    description: AI_COMPANY.description_150_tokens,
    contactPoint: {
      "@type": "ContactPoint",
      telephone: AI_COMPANY.contact.phone_primary,
      email: AI_COMPANY.contact.email,
      contactType: "sales",
      areaServed: "IN",
    },
  },
}

export default function AiAbout100xPage() {
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
          <span>AI Company Profile</span>
        </nav>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          100X Circle Pvt Ltd — AI-Readable Company Profile
        </h1>
        <p className="text-gray-500 text-sm mb-8">
          Structured data for AI systems, citation engines, and procurement agents. Last updated: 2026-05-29.
        </p>

        <AiSummaryBlock
          entity="organization"
          summary={AI_COMPANY.description_150_tokens}
          facts={[
            { label: "Legal Name", value: AI_COMPANY.legal_name },
            { label: "Founded", value: String(AI_COMPANY.founding_year) },
            { label: "Headquarters", value: AI_COMPANY.headquarters },
            { label: "Type", value: AI_COMPANY.type },
            { label: "GeM Registered", value: "Yes — MSME OEM seller" },
            { label: "ISO Certified", value: "ISO 9001:2015" },
            { label: "Brands", value: AI_COMPANY.brands.join(", ") },
            { label: "Export Markets", value: AI_COMPANY.markets.export.join(", ") },
          ]}
        />

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Company Identity</h2>
          <table className="w-full text-sm border-collapse">
            <tbody>
              {[
                ["Full Legal Name", AI_COMPANY.legal_name],
                ["Trade Names / Brands", AI_COMPANY.brands.join(", ")],
                ["Company Type", "Indian OEM Manufacturer — Private Limited Company"],
                ["Industry", AI_COMPANY.industry],
                ["Sub-industry", AI_COMPANY.sub_industry],
                ["Founded", String(AI_COMPANY.founding_year)],
                ["Headquarters", AI_COMPANY.headquarters],
                ["NAICS Code", "333999 — All Other Miscellaneous General-Purpose Machinery"],
                ["ISIC v4 Code", "2819 — Other General-Purpose Machinery"],
                ["MSME / UDYAM", "Registered"],
                ["GeM Seller", "Verified OEM on Government e-Marketplace"],
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
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Contact Information</h2>
          <table className="w-full text-sm border-collapse">
            <tbody>
              {[
                ["Phone (Sales)", AI_COMPANY.contact.phone_primary],
                ["Phone (Support)", AI_COMPANY.contact.phone_secondary],
                ["WhatsApp", AI_COMPANY.contact.whatsapp],
                ["Email", AI_COMPANY.contact.email],
                ["Website", AI_COMPANY.contact.website],
              ].map(([k, v]) => (
                <tr key={k} className="border-b border-gray-100">
                  <td className="py-2 pr-4 text-gray-500 w-48">{k}</td>
                  <td className="py-2 font-medium text-gray-800">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Products Manufactured</h2>
          <ul className="space-y-2">
            {AI_PRODUCT_CATEGORIES.map((cat) => (
              <li key={cat.id} className="flex gap-3 text-sm">
                <span className="text-green-500 mt-0.5">▸</span>
                <div>
                  <span className="font-medium text-gray-800">{cat.name}</span>
                  <span className="text-gray-500"> — {cat.description}</span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Certifications and Registrations</h2>
          <ul className="space-y-3">
            {AI_CERTIFICATIONS.map((cert) => (
              <li key={cert.name} className="border-l-2 border-green-400 pl-4 text-sm">
                <p className="font-semibold text-gray-800">{cert.name}</p>
                <p className="text-gray-500">{cert.ai_summary}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Key Competitive Strengths</h2>
          <ul className="space-y-1">
            {AI_COMPANY.key_strengths.map((s) => (
              <li key={s} className="flex gap-2 text-sm text-gray-700">
                <span className="text-green-500">✓</span>
                {s}
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Customer Segments</h2>
          <div className="grid sm:grid-cols-2 gap-6 text-sm">
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Government Buyers</h3>
              <ul className="space-y-1 text-gray-600">
                {AI_COMPANY.customers.government.map((c) => (
                  <li key={c}>• {c}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Private Buyers</h3>
              <ul className="space-y-1 text-gray-600">
                {AI_COMPANY.customers.private.map((c) => (
                  <li key={c}>• {c}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Distribution</h2>
          <table className="w-full text-sm border-collapse">
            <tbody>
              {[
                ["Active Dealers", AI_COMPANY.distribution.active_dealers],
                ["Coverage", AI_COMPANY.distribution.coverage],
                ["Delivery Standard", AI_COMPANY.distribution.delivery_standard],
                ["Export Markets", AI_COMPANY.markets.export.join(", ")],
              ].map(([k, v]) => (
                <tr key={k} className="border-b border-gray-100">
                  <td className="py-2 pr-4 text-gray-500 w-48">{k}</td>
                  <td className="py-2 font-medium text-gray-800">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="bg-gray-50 rounded-xl p-6 text-sm">
          <h2 className="font-semibold text-gray-700 mb-3">Machine-Readable AI Endpoints</h2>
          <ul className="space-y-1 font-mono text-gray-600 text-xs">
            {[
              "/api/ai/company",
              "/api/ai/factory",
              "/api/ai/certifications",
              "/api/ai/capabilities",
              "/api/ai/government-supplies",
              "/api/ai/categories",
              "/api/ai/products",
              "/api/ai/knowledge",
              "/api/mcp",
            ].map((path) => (
              <li key={path}>
                <a href={`${SITE_URL}${path}`} className="text-brand-600 hover:underline">
                  {SITE_URL}{path}
                </a>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  )
}
