import type { Metadata } from "next"
import Link from "next/link"
import clientPromise from "@/lib/mongodb"
import { SITE_URL, BUSINESS } from "@/lib/seo/site-config"
import GovKPIStrip from "@/components/trust/GovKPIStrip"
import GovPerformanceCards from "@/components/trust/GovPerformanceCards"
import GovLogoWall, { type GovLogo } from "@/components/trust/GovLogoWall"
import FeaturedCaseStudyCards from "@/components/trust/FeaturedCaseStudyCards"

export const revalidate = 60

export const metadata: Metadata = {
  title: "Government Past Performance — Fogging Machine Supply Track Record | 100X Circle",
  description:
    "100X Circle's government procurement track record: fogging machines supplied to municipal corporations, health departments, defence bodies, and public institutions across 15+ states. View our full past performance, case studies, and client references.",
  keywords: [
    "fogging machine government supply track record India",
    "100X Circle government past performance",
    "fogging machine municipal corporation supply",
    "fogging machine health department procurement",
    "thermal fogging machine government orders India",
    "GeM supplier past performance fogging machine",
  ],
  alternates: { canonical: `${SITE_URL}/past-performance-government` },
  openGraph: {
    title: "Government Past Performance — 100X Circle Fogging Machines",
    description:
      "Track record of government fogging machine supplies across 15+ states: municipal corporations, health departments, defence, and public institutions.",
    url: `${SITE_URL}/past-performance-government`,
    type: "website",
  },
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Government Past Performance — 100X Circle",
  description:
    "Comprehensive government supply track record for 100X Circle thermal fogging machines: departments served, states covered, procurement records.",
  url: `${SITE_URL}/past-performance-government`,
  breadcrumb: {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Government Procurement", item: `${SITE_URL}/fogging-machine-government-procurement` },
      { "@type": "ListItem", position: 3, name: "Past Performance", item: `${SITE_URL}/past-performance-government` },
    ],
  },
}

const WA_HREF = `https://wa.me/${BUSINESS.whatsappE164}?text=${encodeURIComponent(
  "Hi 100X Circle, I need fogging machines for government procurement. Please share quotation and reference list."
)}`

export default async function PastPerformancePage() {
  const client = await clientPromise.catch(() => null)
  const db = client?.db()

  let records: any[] = []
  let kpis = { totalOrders: 500, statesServed: 15, departmentsServed: 80, unitsSupplied: 2000, yearsExperience: 12 }
  let govLogos: GovLogo[] = []
  let caseStudies: any[] = []

  if (db) {
    const [rawRecords, rawKpis, rawCustomers, rawCaseStudies] = await Promise.all([
      db.collection("gov_past_performance").find({ isPublic: true }).sort({ orderYear: -1 }).limit(200).toArray(),
      db.collection("gov_kpis").findOne({ key: "main" }),
      db.collection("customers").find({ isActive: { $ne: false } }).sort({ order: 1 }).toArray(),
      db.collection("case_studies").find({ published: true }).sort({ createdAt: -1 }).limit(3).toArray(),
    ])

    records = JSON.parse(JSON.stringify(rawRecords)).map((r: any) => ({ ...r, _id: String(r._id) }))
    if (rawKpis) kpis = { ...kpis, ...JSON.parse(JSON.stringify(rawKpis)) }
    govLogos = JSON.parse(JSON.stringify(rawCustomers)).map((c: any) => ({
      _id: String(c._id),
      name: c.name || "Government Client",
      logo: c.logo || "",
      category: c.category || "Municipal Bodies",
      state: c.state || "",
      caseStudyLink: c.caseStudyLink || "",
      isActive: c.isActive !== false,
    }))
    caseStudies = JSON.parse(JSON.stringify(rawCaseStudies))
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="pt-16 min-h-screen bg-white">
        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className="bg-gradient-to-br from-gray-900 to-gray-800 text-white py-14 md:py-20">
          <div className="max-w-6xl mx-auto px-4 md:px-6">
            <nav className="flex items-center gap-2 text-xs text-gray-400 mb-6">
              <Link href="/" className="hover:text-white transition-colors">Home</Link>
              <span>/</span>
              <Link href="/fogging-machine-government-procurement" className="hover:text-white transition-colors">Government Procurement</Link>
              <span>/</span>
              <span className="text-white">Past Performance</span>
            </nav>
            <div className="max-w-3xl">
              <p className="text-xs font-semibold text-brand-400 uppercase tracking-widest mb-3">Government Supply Track Record</p>
              <h1 className="text-3xl md:text-4xl font-bold mb-4">
                Government Past Performance
              </h1>
              <p className="text-gray-300 text-lg leading-relaxed mb-8">
                Comprehensive record of fogging machine supplies to government departments, municipal bodies,
                and public institutions across India — with procurement details, product information, and verified case studies.
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href={WA_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#25D366] hover:bg-[#1ebe5a] text-white font-bold rounded-full text-sm transition-all"
                >
                  Request Reference List
                </a>
                <Link
                  href="/fogging-machine-government-procurement"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 border border-white/20 hover:bg-white/20 text-white font-semibold rounded-full text-sm transition-all"
                >
                  Procurement Guide
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── KPI Dashboard ────────────────────────────────────────────────── */}
        <section className="py-14 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4 md:px-6">
            <GovKPIStrip kpis={kpis} />
          </div>
        </section>

        {/* ── Logo Wall ────────────────────────────────────────────────────── */}
        <GovLogoWall logos={govLogos} />

        {/* ── Past Performance Records ─────────────────────────────────────── */}
        <section className="py-16 bg-white">
          <div className="max-w-6xl mx-auto px-4 md:px-6">
            <div className="mb-8">
              <p className="text-xs font-semibold text-brand-600 uppercase tracking-widest mb-2">Procurement Records</p>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">Government Supply Records</h2>
              <p className="text-gray-500 text-sm">
                {records.length > 0
                  ? `${records.length} procurement records across multiple states and departments.`
                  : "Procurement records are being compiled. Contact us for a formal reference list."}
              </p>
            </div>

            {records.length > 0 ? (
              <GovPerformanceCards
                records={records}
                showFilters={true}
                maxVisible={records.length}
                showViewAll={false}
              />
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-10 text-center">
                <p className="text-4xl mb-4">📋</p>
                <h3 className="font-bold text-gray-900 mb-2">Procurement Records Being Compiled</h3>
                <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
                  Our full past performance register is being digitised. In the meantime, contact us directly
                  for a formal reference list and OEM certificates.
                </p>
                <a
                  href={WA_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white font-semibold rounded-full text-sm hover:bg-gray-700 transition-colors"
                >
                  Request Reference List on WhatsApp
                </a>
              </div>
            )}
          </div>
        </section>

        {/* ── Case Studies ─────────────────────────────────────────────────── */}
        {caseStudies.length > 0 && (
          <section className="py-16 bg-gray-50">
            <div className="max-w-6xl mx-auto px-4 md:px-6">
              <FeaturedCaseStudyCards studies={caseStudies} heading="Verified Deployment Case Studies" maxVisible={3} />
            </div>
          </section>
        )}

        {/* ── CTA + Download ───────────────────────────────────────────────── */}
        <section className="py-16 bg-gray-900 text-white">
          <div className="max-w-4xl mx-auto px-4 md:px-6 text-center">
            <h2 className="text-2xl font-bold mb-3">Need Full OEM Documentation?</h2>
            <p className="text-gray-300 text-sm mb-8 max-w-xl mx-auto">
              For tender submissions, we provide IS 14855 certificates, ISO certificate, MSME certificate,
              GeM seller verification, and reference letters on company letterhead — at no cost.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <a
                href={WA_HREF}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#25D366] hover:bg-[#1ebe5a] text-white font-bold rounded-full text-sm transition-all"
              >
                WhatsApp for Documents
              </a>
              <a
                href={`mailto:${BUSINESS.email}?subject=Past Performance / Reference Request`}
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-white/10 border border-white/20 hover:bg-white/20 text-white font-semibold rounded-full text-sm transition-all"
              >
                Email Reference Request
              </a>
              <Link
                href="/gem-approved-fogging-machine-oem"
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-white/10 border border-white/20 hover:bg-white/20 text-white font-semibold rounded-full text-sm transition-all"
              >
                OEM Landing Page
              </Link>
            </div>
          </div>
        </section>

        {/* ── Internal Links ───────────────────────────────────────────────── */}
        <section className="py-10 bg-white border-t border-gray-100">
          <div className="max-w-6xl mx-auto px-4 md:px-6">
            <div className="flex flex-wrap gap-4 justify-center text-sm">
              {[
                { href: "/fogging-machine-government-procurement", label: "Government Procurement" },
                { href: "/gem-approved-fogging-machine-oem", label: "GeM OEM Page" },
                { href: "/case-studies", label: "Case Studies" },
                { href: "/gem-oem-authorization", label: "GeM OEM Authorization" },
                { href: "/gem-tender-support", label: "Tender Support" },
                { href: "/deployments", label: "Deployments" },
              ].map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="px-4 py-2 border border-gray-200 rounded-full text-gray-600 hover:border-brand-300 hover:text-brand-700 hover:bg-brand-50 transition-all"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
