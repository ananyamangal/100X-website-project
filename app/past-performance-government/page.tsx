import type { Metadata } from "next"
import Link from "next/link"
import clientPromise from "@/lib/mongodb"
import { SITE_URL, BUSINESS } from "@/lib/seo/site-config"
import GovKPIStrip from "@/components/trust/GovKPIStrip"
import GovPerformanceCards from "@/components/trust/GovPerformanceCards"
import GovLogoWall, { type GovLogo } from "@/components/trust/GovLogoWall"
import FeaturedCaseStudyCards from "@/components/trust/FeaturedCaseStudyCards"
import StateDeploymentCards from "@/components/trust/StateDeploymentCards"

export const revalidate = 60

export const metadata: Metadata = {
  title: "Government Past Performance — Fogging Machine Supply Track Record | 100X Circle",
  description:
    "100X Circle government procurement track record: fogging machines supplied to 80+ departments across 15+ states. View state-wise deployments, procurement records, and verified case studies.",
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
  description: "Comprehensive government supply track record for 100X Circle thermal fogging machines.",
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

// Maps full state names (from DB records) to 2-letter codes
const STATE_TO_CODE: Record<string, string> = {
  "Andhra Pradesh": "AP", "Arunachal Pradesh": "AR", "Assam": "AS", "Bihar": "BR",
  "Chhattisgarh": "CG", "Goa": "GA", "Gujarat": "GJ", "Haryana": "HR",
  "Himachal Pradesh": "HP", "Jharkhand": "JH", "Karnataka": "KA", "Kerala": "KL",
  "Madhya Pradesh": "MP", "Maharashtra": "MH", "Manipur": "MN", "Meghalaya": "MG",
  "Mizoram": "MZ", "Nagaland": "NL", "Odisha": "OD", "Punjab": "PB",
  "Rajasthan": "RJ", "Sikkim": "SK", "Tamil Nadu": "TN", "Telangana": "TG",
  "Tripura": "TR", "Uttar Pradesh": "UP", "Uttarakhand": "UK", "West Bengal": "WB",
  "Delhi": "DL", "Jammu & Kashmir": "JK", "Jammu and Kashmir": "JK",
  "Lakshadweep": "LD", "Puducherry": "PY", "Andaman and Nicobar Islands": "AN", "Chandigarh": "CH",
}

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

  // Build state-wise deployment data from records
  const stateDeployments: Record<string, { count: number; categories?: string[]; departments?: string[] }> = {}
  for (const r of records) {
    if (!r.state) continue
    const stateCode = STATE_TO_CODE[r.state] || null
    if (!stateCode) continue
    if (!stateDeployments[stateCode]) stateDeployments[stateCode] = { count: 0, departments: [], categories: [] }
    stateDeployments[stateCode].count++
    if (r.department && !stateDeployments[stateCode].departments!.includes(r.department))
      stateDeployments[stateCode].departments!.push(r.department)
    if (r.category && !stateDeployments[stateCode].categories!.includes(r.category))
      stateDeployments[stateCode].categories!.push(r.category)
  }

  const hasRealData = records.length > 0

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <main className="pt-16 min-h-screen bg-gray-950">

        {/* ── Hero ─────────────────────────────────────────────────────────────── */}
        <section className="bg-gray-950 border-b border-white/[0.06] py-20 md:py-28">
          <div className="container mx-auto px-4 md:px-6">
            <nav className="flex items-center gap-2 text-xs text-gray-600 mb-8">
              <Link href="/" className="hover:text-gray-400 transition-colors">Home</Link>
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="9 18 15 12 9 6" /></svg>
              <Link href="/fogging-machine-government-procurement" className="hover:text-gray-400 transition-colors">Government Procurement</Link>
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="9 18 15 12 9 6" /></svg>
              <span className="text-gray-400">Past Performance</span>
            </nav>

            <div className="max-w-3xl">
              <div className="flex flex-wrap gap-2 mb-5">
                <span className="px-3 py-1 bg-brand-600/15 border border-brand-500/30 rounded-full text-brand-400 text-xs font-700 uppercase tracking-widest">
                  GeM Registered OEM
                </span>
                <span className="px-3 py-1 bg-white/[0.05] border border-white/[0.10] rounded-full text-gray-300 text-xs font-600">
                  IS 14855 Compliant
                </span>
              </div>
              <h1 className="text-display-sm font-700 text-white mb-6 leading-tight">
                Government Past Performance
              </h1>
              <p className="text-gray-400 text-lg leading-relaxed mb-8 max-w-2xl">
                Verified record of fogging machine supplies to government departments, municipal bodies,
                and public institutions across India — state coverage, department types, and deployment history.
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href={WA_HREF}
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-7 py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-700 rounded-full text-sm transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  Request Reference List
                </a>
                <a
                  href={`mailto:${BUSINESS.email}?subject=Past Performance / Reference Request`}
                  className="inline-flex items-center gap-2 px-7 py-3.5 bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.10] text-white font-600 rounded-full text-sm transition-colors"
                >
                  Email Reference Request
                </a>
                <Link
                  href="/fogging-machine-government-procurement"
                  className="inline-flex items-center gap-2 px-7 py-3.5 bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.10] text-white font-600 rounded-full text-sm transition-colors"
                >
                  Procurement Guide
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── KPI Dashboard ─────────────────────────────────────────────────────── */}
        <section className="py-14 bg-gray-950">
          <div className="container mx-auto px-4 md:px-6">
            <GovKPIStrip kpis={kpis} />
          </div>
        </section>

        {/* ── Client Logos ─────────────────────────────────────────────────────── */}
        {govLogos.length > 0 && <GovLogoWall logos={govLogos} />}

        {/* ── Procurement Records ───────────────────────────────────────────────── */}
        <section className="py-20 md:py-28 bg-gray-950">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex items-end justify-between mb-10 gap-4">
              <div>
                <p className="eyebrow text-brand-400 mb-4">Procurement Records</p>
                <h2 className="text-display-xs font-700 text-white mb-2">Government Supply Register</h2>
                <p className="text-gray-400 text-sm">
                  {records.length > 0
                    ? `${records.length} procurement records across multiple states and departments.`
                    : "Procurement records are being compiled. Contact us for a formal reference list."}
                </p>
              </div>
            </div>

            {records.length > 0 ? (
              <GovPerformanceCards
                records={records}
                showFilters={true}
                maxVisible={records.length}
                showViewAll={false}
              />
            ) : (
              <div className="glass-card rounded-2xl p-12 text-center">
                <svg className="w-12 h-12 text-gray-700 mx-auto mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
                </svg>
                <h3 className="text-white font-700 text-lg mb-2">Procurement Records Being Compiled</h3>
                <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
                  Our full past performance register is being digitalised. Contact us directly for a formal reference list and OEM certificates.
                </p>
                <div className="flex flex-wrap gap-3 justify-center">
                  <a href={WA_HREF} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-700 rounded-full text-sm transition-colors">
                    Request Reference List
                  </a>
                  <a href={`mailto:${BUSINESS.email}?subject=Past Performance Reference Request`}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-white/[0.06] border border-white/[0.10] hover:bg-white/[0.10] text-white font-600 rounded-full text-sm transition-colors">
                    Email Reference Request
                  </a>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── State-wise Deployments ────────────────────────────────────────────── */}
        <section className="py-20 md:py-28 bg-white">
          <div className="container mx-auto px-4 md:px-6">
            <StateDeploymentCards
              deployments={hasRealData ? stateDeployments : undefined}
              heading="State-wise Government Deployments"
              subheading="Geographic distribution of fogging machine supply orders across India — by state, department type, and buyer category."
              onDark={false}
            />
          </div>
        </section>

        {/* ── Case Studies ──────────────────────────────────────────────────────── */}
        {caseStudies.length > 0 && (
          <section className="py-20 md:py-28 bg-gray-950">
            <div className="container mx-auto px-4 md:px-6">
              <FeaturedCaseStudyCards studies={caseStudies} heading="Verified Deployment Case Studies" maxVisible={3} />
            </div>
          </section>
        )}

        {/* ── Certifications Banner ─────────────────────────────────────────────── */}
        <section className="py-14 bg-gray-950 border-y border-white/[0.06]">
          <div className="container mx-auto px-4 md:px-6">
            <p className="eyebrow text-gray-600 text-center mb-8">OEM Credentials</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "IS 14855 (Part 1)", sub: "BIS Indian Standard — Statutory Compliance" },
                { label: "ISO 9001:2015", sub: "Quality Management System Certified" },
                { label: "MSME / UDYAM", sub: "Ministry of MSME, Government of India" },
                { label: "GeM OEM Seller", sub: "Government e-Marketplace Verified" },
              ].map((c) => (
                <div key={c.label} className="glass-card rounded-xl p-4 text-center">
                  <svg className="w-5 h-5 text-brand-500 mx-auto mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><polyline points="20 6 9 17 4 12" /></svg>
                  <p className="text-white text-sm font-700">{c.label}</p>
                  <p className="text-gray-500 text-[10px] mt-1 leading-snug">{c.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ───────────────────────────────────────────────────────────────── */}
        <section className="py-20 md:py-28 bg-gray-950">
          <div className="container mx-auto px-4 md:px-6 text-center">
            <p className="eyebrow text-brand-400 mb-4">Get in Touch</p>
            <h2 className="text-display-xs font-700 text-white mb-4">Need Full OEM Documentation?</h2>
            <p className="text-gray-400 text-base mb-10 max-w-xl mx-auto leading-relaxed">
              For tender submissions, we provide IS 14855 certificates, ISO certificate, MSME certificate,
              GeM seller verification, and reference letters — within 24 hours, at no cost.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <a href={WA_HREF} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-4 bg-brand-600 hover:bg-brand-700 text-white font-700 rounded-full text-sm transition-colors">
                WhatsApp for Documents
              </a>
              <a href={`mailto:${BUSINESS.email}?subject=Past Performance / Reference Request`}
                className="inline-flex items-center gap-2 px-8 py-4 bg-white/[0.06] border border-white/[0.10] hover:bg-white/[0.10] text-white font-600 rounded-full text-sm transition-colors">
                Email Reference Request
              </a>
              <Link href="/gem-approved-fogging-machine-oem"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white/[0.06] border border-white/[0.10] hover:bg-white/[0.10] text-white font-600 rounded-full text-sm transition-colors">
                Partner with Us
              </Link>
            </div>
          </div>
        </section>

        {/* ── Internal Links ────────────────────────────────────────────────────── */}
        <section className="py-8 bg-gray-950 border-t border-white/[0.06]">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-wrap gap-3 justify-center">
              {[
                { href: "/fogging-machine-government-procurement", label: "Government Procurement Guide" },
                { href: "/gem-approved-fogging-machine-oem", label: "Dealer Partnership" },
                { href: "/case-studies", label: "Case Studies" },
                { href: "/products", label: "All Products" },
              ].map((l) => (
                <Link key={l.href} href={l.href}
                  className="px-4 py-2 border border-white/[0.08] rounded-full text-gray-500 hover:border-white/[0.20] hover:text-gray-300 text-xs transition-all">
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
