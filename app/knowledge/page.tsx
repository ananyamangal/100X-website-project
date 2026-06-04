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
    slug: "dengue-prevention-thermal-fogging",
    title: "Dengue Prevention Using Thermal Fogging",
    summary:
      "WHO-compliant thermal fogging protocols for dengue prevention. Covers timing, insecticide selection, droplet size requirements, and equipment for Indian municipal operations.",
    readTime: "8 min",
    tags: ["Dengue", "Public Health", "Municipal"],
  },
  {
    slug: "malaria-control-fogging-india",
    title: "Malaria Control Using Thermal Fogging in India",
    summary:
      "Anopheles mosquito biology, NVBDCP-aligned fogging protocols, night-time operations, and insecticide selection for Indian district health departments.",
    readTime: "8 min",
    tags: ["Malaria", "Public Health", "Government"],
  },
  {
    slug: "mosquito-control-india",
    title: "Mosquito Control and Thermal Fogging in India",
    summary:
      "India's vector control programme, dengue/malaria prevention drives, and how municipal corporations deploy thermal fogging at scale.",
    readTime: "6 min",
    tags: ["Vector Control", "India", "Municipal"],
  },
  {
    slug: "agricultural-fogging-guide",
    title: "Agricultural Fogging Guide — Crop Protection Using Thermal Foggers",
    summary:
      "How farmers, FPOs, and agricultural cooperatives use thermal fogging for crop protection — chemicals, timing, coverage, and equipment for Indian field conditions.",
    readTime: "7 min",
    tags: ["Agriculture", "Crop Protection", "Farming"],
  },
  {
    slug: "how-to-choose-fogging-machine",
    title: "How to Choose a Fogging Machine — Complete Buyer's Guide",
    summary:
      "A practical guide to selecting the right fogging machine for your use case — comparing capacity, technology, portability, and budget for municipal, agricultural, and PCO buyers.",
    readTime: "8 min",
    tags: ["Buyer's Guide", "Selection", "Comparison"],
  },
  {
    slug: "thermal-fogging-chemicals-guide",
    title: "Thermal Fogging Chemicals Guide — Insecticides, Fungicides & Formulations",
    summary:
      "Which chemicals work in thermal foggers, correct dilution ratios, oil carrier selection, mixing safety, storage, and regulatory compliance for India.",
    readTime: "9 min",
    tags: ["Chemicals", "Insecticides", "Safety"],
  },
  {
    slug: "fogging-machine-operators-guide",
    title: "Fogging Machine Operator's Guide — Pre-Operation, Operation & Post-Operation",
    summary:
      "Complete step-by-step guide for thermal fogging machine operators — pre-start checks, safe operation, chemical handling, shutdown, and maintenance.",
    readTime: "10 min",
    tags: ["Operations", "Training", "Safety"],
  },
  {
    slug: "fogging-machine-maintenance-guide",
    title: "Fogging Machine Maintenance Guide — Keep Your Fogger Running",
    summary:
      "Daily, weekly, and monthly maintenance routines for thermal fogging machines — nozzle cleaning, fuel system care, muffler maintenance, and storage.",
    readTime: "8 min",
    tags: ["Maintenance", "Servicing", "Longevity"],
  },
  {
    slug: "fogging-machine-safety-guide",
    title: "Fogging Machine Safety Guide — PPE, Chemicals & Safe Operation",
    summary:
      "Complete safety guide for fogging operators — required PPE, chemical handling, safe distances, pre-operation checks, and emergency procedures.",
    readTime: "7 min",
    tags: ["Safety", "PPE", "Compliance"],
  },
  {
    slug: "government-procurement-guide",
    title: "Government Procurement Guide: Buying Fogging Machines via GeM",
    summary:
      "Step-by-step guide for municipal corporations, health departments, and Panchayats to procure fogging machines via the Government e-Marketplace (GeM).",
    readTime: "5 min",
    tags: ["GeM", "Government", "Procurement"],
  },
]

export default function KnowledgeHubPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Cinematic hero */}
      <section className="bg-gray-950 pt-24 pb-12 md:pt-28 md:pb-14">
        <div className="container mx-auto px-4 md:px-6">
          <nav className="flex items-center gap-2 text-xs text-cinema-500 mb-6">
            <Link href="/" className="hover:text-cinema-300 transition-colors">Home</Link>
            <span>/</span>
            <span className="text-cinema-300">Knowledge Hub</span>
          </nav>
          <div className="max-w-3xl">
            <p className="eyebrow text-brand-400 mb-3">Technical Knowledge</p>
            <h1 className="text-3xl md:text-4xl font-800 text-white mb-4 text-balance">
              Knowledge Hub
            </h1>
            <p className="text-cinema-300 leading-relaxed">
              Technical articles on thermal fogging technology, vector control, and government procurement.
            </p>
          </div>
        </div>
      </section>
      <main className="max-w-4xl mx-auto px-4 py-10">

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
                    className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <h2 className="font-semibold text-gray-900 group-hover:text-brand-700 mb-2 text-base">
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
            <Link href="/api/ai/knowledge" className="text-brand-600 hover:underline font-mono text-xs">
              /api/ai/knowledge
            </Link>
            .
          </p>
        </div>
      </main>
    </>
  )
}
