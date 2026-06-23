import type { Metadata } from "next"
import Link from "next/link"
import clientPromise from "@/lib/mongodb"
import { SITE_URL, BUSINESS } from "@/lib/seo/site-config"
import { normalizeProducts } from "@/lib/normalizeProduct"
import GovKPIStrip from "@/components/trust/GovKPIStrip"
import GovPerformanceCards from "@/components/trust/GovPerformanceCards"
import GovLogoWall, { type GovLogo } from "@/components/trust/GovLogoWall"
import FeaturedCaseStudyCards from "@/components/trust/FeaturedCaseStudyCards"
import FeaturedDeployments, { type DeploymentRecord } from "@/components/trust/FeaturedDeployments"
import FeaturedGovSupplies, { type SupplyRecord } from "@/components/trust/FeaturedGovSupplies"
import GovProductCarousel, { type ProductSlim } from "@/components/gov-procurement/GovProductCarousel"
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd"

export const revalidate = 60

export const metadata: Metadata = {
  title: "Government Past Performance — Fogging Machine Supply Track Record | 100X Circle",
  description:
    "100X Circle government procurement track record: fogging machines supplied to 80+ departments across 15+ states. View procurement records, verified case studies, and organizational clients.",
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
      "Track record of government fogging machine supplies across 15+ states: municipal corporations, health departments, and public institutions.",
    url: `${SITE_URL}/past-performance-government`,
    type: "website",
    images: [{ url: `${SITE_URL}/og-gov-procurement.jpg`, width: 1200, height: 630, alt: "100X Circle Government Past Performance" }],
  },
  twitter: { card: "summary_large_image", images: [`${SITE_URL}/og-gov-procurement.jpg`] },
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

// Fallback institution categories shown when no logo data in DB
const FALLBACK_INSTITUTIONS = [
  { name: "Municipal Corporation", category: "Municipal Bodies", state: "Pan-India" },
  { name: "Nagar Nigam", category: "Municipal Bodies", state: "Multiple States" },
  { name: "Nagar Panchayat", category: "Municipal Bodies", state: "Multiple States" },
  { name: "Health Department", category: "State Health", state: "Pan-India" },
  { name: "National Health Mission", category: "State Health", state: "Multiple States" },
  { name: "NVBDCP District Office", category: "State Health", state: "Pan-India" },
  { name: "Cantonment Board", category: "Central Govt", state: "Pan-India" },
  { name: "Public Sector Undertaking", category: "PSU", state: "Pan-India" },
]

export default async function PastPerformancePage() {
  const client = await clientPromise.catch(() => null)
  const db = client?.db()

  let records: any[] = []
  let supplyCards: SupplyRecord[] = []
  let kpis = { totalOrders: 500, statesServed: 15, departmentsServed: 80, unitsSupplied: 2000, yearsExperience: 12 }
  let govLogos: GovLogo[] = []
  let caseStudies: any[] = []
  let deployments: DeploymentRecord[] = []
  let products: ProductSlim[] = []

  if (db) {
    const [rawRecords, rawKpis, rawCustomers, rawCaseStudies, rawProducts, rawDeployments] = await Promise.all([
      db.collection("gov_past_performance").find({ isPublic: true }).sort({ orderYear: -1 }).limit(200).toArray(),
      db.collection("gov_kpis").findOne({ key: "main" }),
      db.collection("customers").find({ isActive: { $ne: false } }).sort({ order: 1 }).toArray(),
      db.collection("case_studies").find({ published: true }).sort({ createdAt: -1 }).limit(6).toArray(),
      db.collection("products").find({ isPublished: { $ne: false } }).sort({ order: 1 }).limit(8).toArray(),
      db.collection("deployments").find({ images: { $exists: true, $ne: [] } }).sort({ createdAt: -1 }).limit(6).toArray(),
    ])

    records = JSON.parse(JSON.stringify(rawRecords)).map((r: any) => ({ ...r, _id: String(r._id) }))
    if (rawKpis) kpis = { ...kpis, ...JSON.parse(JSON.stringify(rawKpis)) }

    govLogos = JSON.parse(JSON.stringify(rawCustomers)).map((c: any) => ({
      _id: String(c._id), name: c.name || "Government Client", logo: c.logo || "",
      category: c.category || "Municipal Bodies", state: c.state || "",
      caseStudyLink: c.caseStudyLink || "", isActive: c.isActive !== false, order: c.order || 0,
    }))

    caseStudies = JSON.parse(JSON.stringify(rawCaseStudies))
    deployments = JSON.parse(JSON.stringify(rawDeployments)).map((d: any) => ({ ...d, _id: String(d._id) }))

    products = normalizeProducts(JSON.parse(JSON.stringify(rawProducts))).map((p: any) => ({
      _id: String(p._id), name: p.name, slug: p.slug || String(p._id),
      imageUrls: Array.isArray(p.imageUrls) && p.imageUrls.length > 0 ? p.imageUrls : p.imageUrl ? [p.imageUrl] : [],
      badges: Array.isArray(p.badges) ? p.badges : [], category: p.category,
    }))

    supplyCards = records.slice(0, 6).map((r: any) => ({
      _id: r._id, organization: r.organization, department: r.department,
      state: r.state, product: r.product, category: r.category,
      status: r.status, orderYear: r.orderYear, verified: r.verified || false,
    }))
  }

  const hasRealData = records.length > 0

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <BreadcrumbJsonLd items={[
        { name: "Home", url: "/" },
        { name: "Government Past Performance", url: "/past-performance-government" },
      ]} />

      <main className="pt-16 min-h-screen bg-gray-950">

        {/* ── 1. Hero ───────────────────────────────────────────────────────────── */}
        <section className="bg-gray-950 border-b border-white/[0.06] py-16 md:py-24 overflow-hidden">
          <div className="container mx-auto px-4 md:px-6">
            <nav className="flex items-center gap-2 text-xs text-gray-600 mb-10">
              <Link href="/" className="hover:text-gray-400 transition-colors">Home</Link>
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="9 18 15 12 9 6" /></svg>
              <Link href="/fogging-machine-government-procurement" className="hover:text-gray-400 transition-colors">Government Procurement</Link>
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="9 18 15 12 9 6" /></svg>
              <span className="text-gray-400">Past Performance</span>
            </nav>

            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              {/* LEFT: Content */}
              <div>
                <div className="flex flex-wrap gap-2 mb-5">
                  <span className="px-3 py-1 bg-brand-600/15 border border-brand-500/30 rounded-full text-brand-400 text-xs font-700 uppercase tracking-widest">
                    GeM Registered OEM
                  </span>
                  <span className="px-3 py-1 bg-white/[0.05] border border-white/[0.10] rounded-full text-gray-300 text-xs font-600">
                    IS 14855 Compliant
                  </span>
                  <span className="px-3 py-1 bg-white/[0.05] border border-white/[0.10] rounded-full text-gray-300 text-xs font-600">
                    MSME Registered
                  </span>
                </div>
                <h1 className="text-display-sm font-700 text-white mb-6 leading-tight">
                  Government Past Performance
                </h1>
                <p className="text-gray-400 text-lg leading-relaxed mb-4">
                  Real fogging machine supply orders to municipal bodies, health departments, and public institutions
                  across India — 12+ years of government procurement experience.
                </p>
                <p className="text-gray-500 text-sm mb-8">
                  Reference letters, IS 14855 certificates, and OEM documentation available within 24 hours.
                </p>
                <div className="flex flex-wrap gap-3 mb-8">
                  <a href={WA_HREF} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-7 py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-700 rounded-full text-sm transition-colors">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    Request Reference List
                  </a>
                  <a href={`mailto:${BUSINESS.email}?subject=Past Performance / Reference Request`}
                    className="inline-flex items-center gap-2 px-7 py-3.5 bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.10] text-white font-600 rounded-full text-sm transition-colors">
                    Email Reference Request
                  </a>
                </div>
                {/* Quick stats */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { value: "15+", label: "States" },
                    { value: "80+", label: "Departments" },
                    { value: "12+", label: "Years" },
                  ].map((s) => (
                    <div key={s.label} className="text-center glass-card rounded-xl py-3">
                      <p className="text-xl font-700 text-white">{s.value}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* RIGHT: Product visual + customer logos */}
              <div className="hidden lg:block relative">
                {products[0]?.imageUrls?.[0] ? (
                  <div className="relative">
                    <div className="absolute -inset-12 bg-brand-600/8 rounded-full blur-3xl pointer-events-none" />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={products[0].imageUrls[0]}
                      alt={products[0].name || "100X Circle Fogging Machine"}
                      className="relative w-full max-w-md mx-auto rounded-2xl shadow-2xl shadow-black/60 border border-white/[0.06]"
                    />
                  </div>
                ) : (
                  <div className="w-full max-w-sm aspect-[4/3] rounded-2xl bg-white/[0.03] border border-white/[0.07] flex flex-col items-center justify-center gap-4 mx-auto">
                    <svg className="w-20 h-20 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={0.8}>
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                    </svg>
                    <p className="text-gray-600 text-sm font-600">Thermal Fogging Machine</p>
                  </div>
                )}
                {/* Customer logo mini strip */}
                {govLogos.length > 0 && (
                  <div className="mt-6 glass-card rounded-xl p-4">
                    <p className="text-[10px] text-gray-600 uppercase tracking-widest text-center mb-3 font-600">Trusted by government institutions</p>
                    <div className="flex flex-wrap gap-2 justify-center items-center">
                      {govLogos.slice(0, 6).map((logo) =>
                        logo.logo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={logo._id} src={logo.logo} alt={logo.name} className="h-9 w-auto object-contain opacity-60 hover:opacity-90 transition-opacity" />
                        ) : (
                          <div key={logo._id} className="h-9 px-3 rounded bg-white/[0.06] flex items-center justify-center">
                            <p className="text-[10px] text-gray-500 text-center leading-tight">{logo.name}</p>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── 2. Proven Government Procurement Experience ───────────────────────── */}
        <section className="py-20 md:py-24 bg-gray-950">
          <div className="container mx-auto px-4 md:px-6">
            <div className="mb-10">
              <p className="eyebrow text-brand-400 mb-4">Track Record</p>
              <h2 className="text-display-xs font-700 text-white mb-3">Proven Government Procurement Experience</h2>
              <p className="text-gray-400 text-base max-w-2xl">
                Trusted by Municipal Bodies, Health Departments, Public Institutions and Government Procurement Agencies across India.
              </p>
            </div>
            <GovKPIStrip kpis={kpis} />
          </div>
        </section>

        {/* ── 3. Organizations Served ───────────────────────────────────────────── */}
        {govLogos.length > 0 ? (
          <GovLogoWall
            logos={govLogos}
            eyebrow="Trusted By"
            heading="Organizations Served"
            subheading="Municipal corporations, health departments, and government institutions that have procured 100X Circle fogging machines across India."
          />
        ) : (
          <section className="py-20 md:py-28 bg-gray-950">
            <div className="container mx-auto px-4 md:px-6">
              <div className="mb-10">
                <p className="eyebrow text-brand-400 mb-4">Trusted By</p>
                <h2 className="text-display-xs font-700 text-white mb-3">Organizations Served</h2>
                <p className="text-gray-400 text-base max-w-2xl">
                  Categories of government institutions served across India since 2014 — with full OEM documentation available on request.
                </p>
              </div>
              <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
                {FALLBACK_INSTITUTIONS.map((inst) => (
                  <div key={inst.name} className="glass-card rounded-2xl p-5">
                    <p className="font-700 text-white text-sm mb-1">{inst.name}</p>
                    <p className="text-[11px] text-brand-400 font-600 uppercase tracking-wide mb-1">{inst.category}</p>
                    <p className="text-[10px] text-gray-600">{inst.state}</p>
                  </div>
                ))}
              </div>
              <p className="text-gray-600 text-xs mt-6 text-center">
                Specific client references available on request via WhatsApp or email. Reference letters provided within 24 hours.
              </p>
            </div>
          </section>
        )}

        {/* ── 4. Featured Government Supplies ──────────────────────────────────── */}
        <section className="py-20 md:py-28 bg-gray-950">
          <div className="container mx-auto px-4 md:px-6">
            <p className="eyebrow text-brand-400 mb-4">Verified Deliveries</p>
            <FeaturedGovSupplies
              records={supplyCards}
              maxVisible={6}
              heading="Featured Government Supplies"
              subheading="A cross-section of verified supply orders fulfilled for government departments and public institutions across India."
              showViewAll={false}
            />
          </div>
        </section>

        {/* ── 5. Full Supply Register ───────────────────────────────────────────── */}
        <section className="py-20 md:py-28 bg-gray-950 border-t border-white/[0.06]">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex items-end justify-between mb-10 gap-4">
              <div>
                <p className="eyebrow text-brand-400 mb-4">Procurement Records</p>
                <h2 className="text-display-xs font-700 text-white mb-2">Government Supply Register</h2>
                <p className="text-gray-400 text-sm">
                  {hasRealData
                    ? `${records.length} procurement records — filterable by state, department type, and product category.`
                    : "Procurement records are being compiled. Contact us for a formal reference list."}
                </p>
              </div>
            </div>

            {hasRealData ? (
              <GovPerformanceCards records={records} showFilters={true} maxVisible={records.length} showViewAll={false} />
            ) : (
              <div className="glass-card rounded-2xl p-12 text-center">
                <svg className="w-12 h-12 text-gray-700 mx-auto mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
                </svg>
                <h3 className="text-white font-700 text-lg mb-2">Full Register Being Compiled</h3>
                <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
                  Our complete past performance register is being digitalised. Contact us for a formal reference list with OEM certificates.
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

        {/* ── 6. Case Studies ───────────────────────────────────────────────────── */}
        {caseStudies.length > 0 && (
          <section className="py-20 md:py-28 bg-white">
            <div className="container mx-auto px-4 md:px-6">
              <p className="eyebrow text-brand-600 mb-4">Verified Deployments</p>
              <FeaturedCaseStudyCards studies={caseStudies} heading="Featured Success Stories" maxVisible={6} showViewAll />
            </div>
          </section>
        )}

        {/* ── 6b. Real World Deployments ───────────────────────────────────────── */}
        {deployments.length > 0 && (
          <section className="py-20 md:py-28 bg-gray-950">
            <div className="container mx-auto px-4 md:px-6">
              <FeaturedDeployments deployments={deployments} heading="Deployment Gallery" maxVisible={6} showViewAll darkBg />
            </div>
          </section>
        )}

        {/* ── 7. Product Portfolio ──────────────────────────────────────────────── */}
        {products.length > 0 && (
          <section className="py-20 md:py-28 bg-white border-t border-gray-100">
            <div className="container mx-auto px-4 md:px-6">
              <div className="mb-10">
                <p className="eyebrow text-brand-600 mb-4">Product Portfolio</p>
                <h2 className="text-display-xs font-700 text-gray-900 mb-3">Government Procurement Ready Product Portfolio</h2>
                <p className="text-gray-500 text-base max-w-xl">
                  Products supported with technical documentation, certifications and partner assistance.
                </p>
              </div>
              <GovProductCarousel products={products} />
              <div className="mt-8 text-center">
                <Link href="/products"
                  className="inline-flex items-center gap-2 text-sm font-600 text-brand-600 hover:text-brand-700 transition-colors">
                  View full product range
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="9 18 15 12 9 6" /></svg>
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* ── 8. Certifications ────────────────────────────────────────────────── */}
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

        {/* ── 9. CTA ────────────────────────────────────────────────────────────── */}
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
                Become a Partner
              </Link>
            </div>
          </div>
        </section>

        {/* ── Footer Links ─────────────────────────────────────────────────────── */}
        <section className="py-8 bg-gray-950 border-t border-white/[0.06]">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-wrap gap-3 justify-center">
              {[
                { href: "/fogging-machine-government-procurement", label: "Procurement Guide" },
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
