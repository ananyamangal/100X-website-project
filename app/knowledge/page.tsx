import type { Metadata } from "next"
import Link from "next/link"
import { SITE_URL } from "@/lib/seo/site-config"
import { AI_KNOWLEDGE_ARTICLES } from "@/lib/ai/knowledge"

export const metadata: Metadata = {
  title: "Knowledge Hub — Thermal Fogging, Vector Control, Government Procurement | 100X Circle",
  description:
    "Technical knowledge base on thermal fogging technology, mosquito vector control, and government procurement. Authored by 100X Circle Pvt Ltd, Indian OEM manufacturer.",
  alternates: { canonical: `${SITE_URL}/knowledge` },
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "100X Circle Knowledge Hub",
  description:
    "Technical articles on thermal fogging technology, vector-borne disease control, and government procurement for fogging equipment.",
  url: `${SITE_URL}/knowledge`,
  publisher: { "@id": `${SITE_URL}/#organization` },
  hasPart: AI_KNOWLEDGE_ARTICLES.map((a) => ({
    "@type": "Article",
    name: a.title,
    url: a.url,
    description: a.summary,
  })),
}

const ARTICLES = [
  {
    slug: "how-thermal-fogging-works",
    title: "How Thermal Fogging Works: Pulse-Jet Technology Explained",
    summary:
      "Pulse-jet engine mechanics, combustion cycle, droplet formation, and why sub-50-micron particles reach deeper than conventional spraying.",
    readTime: "6 min",
    tags: ["Technology", "Pulse-Jet", "Physics"],
  },
  {
    slug: "thermal-vs-ulv-fogging",
    title: "Thermal Fogging vs ULV Cold Fogging: Complete Comparison",
    summary:
      "Side-by-side comparison of thermal and ULV cold fogging — technology, droplet size, penetration, use cases, and when to choose which.",
    readTime: "7 min",
    tags: ["Comparison", "ULV", "Technology"],
  },
  {
    slug: "government-procurement-guide",
    title: "Government Procurement Guide: Buying Fogging Machines via GeM",
    summary:
      "Step-by-step guide for municipal corporations, health departments, and Panchayats to procure fogging machines via the Government e-Marketplace (GeM).",
    readTime: "5 min",
    tags: ["GeM", "Government", "Procurement"],
  },
  {
    slug: "mosquito-control-india",
    title: "Mosquito Control and Thermal Fogging in India",
    summary:
      "India's vector control programme, dengue/malaria prevention drives, and how municipal corporations deploy thermal fogging at scale.",
    readTime: "6 min",
    tags: ["Vector Control", "India", "Municipal"],
  },
]

export default function KnowledgeHubPage() {
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
          <span>Knowledge Hub</span>
        </nav>

        <h1 className="text-3xl font-bold text-gray-900 mb-3">Knowledge Hub</h1>
        <p className="text-gray-600 mb-10 max-w-2xl">
          Technical articles on thermal fogging technology, vector control operations, and
          government procurement. Written by 100X Circle — Indian OEM manufacturer since 2014.
        </p>

        <div className="grid sm:grid-cols-2 gap-6 mb-12">
          {ARTICLES.map((article) => (
            <Link
              key={article.slug}
              href={`/knowledge/${article.slug}`}
              className="group border border-gray-200 rounded-xl p-5 hover:border-green-400 hover:shadow-sm transition-all"
            >
              <div className="flex flex-wrap gap-1.5 mb-3">
                {article.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <h2 className="font-semibold text-gray-900 group-hover:text-green-700 mb-2 text-base">
                {article.title}
              </h2>
              <p className="text-sm text-gray-500 leading-relaxed mb-3">{article.summary}</p>
              <span className="text-xs text-gray-400">{article.readTime} read</span>
            </Link>
          ))}
        </div>

        <div className="border-t border-gray-200 pt-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">About This Knowledge Base</h2>
          <p className="text-sm text-gray-600 mb-4">
            This knowledge base is authored by 100X Circle Pvt Ltd, an ISO 9001 certified Indian
            OEM manufacturer of thermal fogging machines. All technical information reflects
            operational experience from 10+ years of manufacturing and supplying equipment to
            municipal corporations, health departments, and agricultural buyers across India.
          </p>
          <p className="text-sm text-gray-600">
            Machine-readable versions of all knowledge articles are available at{" "}
            <Link href="/api/ai/knowledge" className="text-green-600 hover:underline font-mono text-xs">
              /api/ai/knowledge
            </Link>
            .
          </p>
        </div>
      </main>
    </>
  )
}
