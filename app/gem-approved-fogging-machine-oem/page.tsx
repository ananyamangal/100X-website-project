import type { Metadata } from "next"
import Link from "next/link"
import clientPromise from "@/lib/mongodb"
import { SITE_URL, BUSINESS } from "@/lib/seo/site-config"
import { normalizeProducts } from "@/lib/normalizeProduct"
import GovLogoWall, { type GovLogo } from "@/components/trust/GovLogoWall"
import FeaturedCaseStudyCards from "@/components/trust/FeaturedCaseStudyCards"
import GovKPIStrip from "@/components/trust/GovKPIStrip"
import GovProductCarousel, { type ProductSlim } from "@/components/gov-procurement/GovProductCarousel"
import GovPastPerformanceCardsServer from "@/components/trust/GovPastPerformanceCardsServer"

export const revalidate = 60

export const metadata: Metadata = {
  title: "GeM Approved Fogging Machine OEM — IS 14855, MSME, ISO 9001 | 100X Circle",
  description:
    "100X Circle is an OEM manufacturer of GeM-approved IS 14855-compliant thermal fogging machines. MSME registered, ISO 9001:2015 certified. Trusted by 80+ government departments across 15+ states. Quotation, tender docs, and full OEM certification available.",
  keywords: [
    "GeM approved fogging machine OEM",
    "IS 14855 fogging machine OEM manufacturer",
    "fogging machine OEM India",
    "GeM OEM fogging machine supplier",
    "government approved fogging machine manufacturer",
    "MSME fogging machine OEM",
    "thermal fogging machine GeM listed OEM",
  ],
  alternates: { canonical: `${SITE_URL}/gem-approved-fogging-machine-oem` },
  openGraph: {
    title: "GeM Approved Fogging Machine OEM | 100X Circle",
    description:
      "OEM manufacturer of IS 14855 compliant thermal fogging machines. GeM listed, MSME, ISO 9001:2015. Trusted by 80+ government departments.",
    url: `${SITE_URL}/gem-approved-fogging-machine-oem`,
    type: "website",
  },
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: "100X Circle Pvt Ltd",
  url: SITE_URL,
  description:
    "OEM manufacturer of IS 14855-compliant thermal fogging machines. GeM registered, MSME, ISO 9001:2015. Pan-India supply for government procurement.",
  address: {
    "@type": "PostalAddress",
    streetAddress: BUSINESS.streetAddress,
    addressLocality: BUSINESS.addressLocality,
    addressRegion: BUSINESS.addressRegion,
    postalCode: BUSINESS.postalCode,
    addressCountry: BUSINESS.addressCountry,
  },
  contactPoint: [
    {
      "@type": "ContactPoint",
      telephone: BUSINESS.phonePrimary,
      contactType: "sales",
      areaServed: "IN",
      availableLanguage: ["Hindi", "English"],
    },
  ],
  sameAs: [BUSINESS.youtube, BUSINESS.facebook, BUSINESS.instagram],
  hasCredential: [
    { "@type": "EducationalOccupationalCredential", name: "ISO 9001:2015 Quality Management" },
    { "@type": "EducationalOccupationalCredential", name: "IS 14855 (Part 1) BIS Indian Standard" },
    { "@type": "EducationalOccupationalCredential", name: "MSME / UDYAM Registration" },
    { "@type": "EducationalOccupationalCredential", name: "GeM OEM Seller Registration" },
  ],
}

const TRUST_CERTS = [
  { label: "IS 14855 (Part 1)", sub: "BIS Indian Standard", icon: "📋", highlight: true },
  { label: "ISO 9001:2015", sub: "Quality Management", icon: "🏆" },
  { label: "MSME / UDYAM", sub: "Ministry of MSME, GoI", icon: "🇮🇳", highlight: true },
  { label: "GeM OEM Seller", sub: "gem.gov.in verified", icon: "✅", highlight: true },
  { label: "ISI Mark", sub: "BIS Certified Models", icon: "⚙" },
  { label: "CE Mark", sub: "Export-grade Models", icon: "🌐" },
]

const OEM_ADVANTAGES = [
  {
    icon: "🏭",
    title: "Direct Manufacturer",
    desc: "No middlemen. Direct factory pricing, full OEM documentation, and manufacturer warranty on every order.",
  },
  {
    icon: "📦",
    title: "Tender Documentation Pack",
    desc: "Ready-made technical specifications, IS 14855 compliance certificates, ISO cert, MSME cert — all on letterhead within 24 hours.",
  },
  {
    icon: "💰",
    title: "L1 Quotation Ready",
    desc: "Price-competitive L1 quotations with GST invoice on company letterhead for government tender submissions.",
  },
  {
    icon: "🚚",
    title: "Pan-India 5–10 Day Supply",
    desc: "From our Gurugram factory (IMT Manesar). GST invoice, delivery documentation, and full after-sales support.",
  },
  {
    icon: "🤝",
    title: "GeM Direct Purchase",
    desc: "Listed on gem.gov.in. Government entities can purchase without tender below GeM direct purchase limits.",
  },
  {
    icon: "🛠",
    title: "After-Sales & Spare Parts",
    desc: "Domestic spare parts availability from Gurugram. Hindi-language operator manuals and technical support.",
  },
]

const BUYER_CATEGORIES = [
  { icon: "🏙", label: "Municipal Corporations & Nagar Nigams", route: "GeM direct purchase or open tender" },
  { icon: "🏥", label: "State Health Departments / NVBDCP", route: "GeM direct purchase or district health office tender" },
  { icon: "🌿", label: "Nagar Panchayats & Gram Panchayats", route: "GeM direct purchase — no tender below threshold" },
  { icon: "🛡", label: "Defence & Cantonment Boards", route: "Direct inquiry, rate contract, or DGS&D" },
  { icon: "🏫", label: "Universities & Government Institutions", route: "GeM or institutional procurement" },
  { icon: "🚂", label: "Railways & PSUs", route: "Rate contract or DGS&D route" },
]

const WA_HREF = `https://wa.me/${BUSINESS.whatsappE164}?text=${encodeURIComponent(
  "Hi 100X Circle, I need fogging machines for government/tender procurement. Please share quotation and documentation."
)}`

export default async function GemApprovedOEMPage() {
  const client = await clientPromise.catch(() => null)
  const db = client?.db()

  let products: ProductSlim[] = []
  let govLogos: GovLogo[] = []
  let caseStudies: any[] = []
  let kpis = { totalOrders: 500, statesServed: 15, departmentsServed: 80, unitsSupplied: 2000, yearsExperience: 12 }
  let pastPerformance: any[] = []

  if (db) {
    const [rawProducts, rawCustomers, rawCaseStudies, rawKpis, rawPP] = await Promise.all([
      db.collection("products").find({ isPublished: { $ne: false } }).sort({ order: 1 }).limit(12).toArray(),
      db.collection("customers").find({ isActive: { $ne: false } }).sort({ order: 1 }).toArray(),
      db.collection("case_studies").find({ published: true }).sort({ createdAt: -1 }).limit(3).toArray(),
      db.collection("gov_kpis").findOne({ key: "main" }),
      db.collection("gov_past_performance").find({ isPublic: true }).sort({ orderYear: -1 }).limit(6).toArray(),
    ])

    products = normalizeProducts(JSON.parse(JSON.stringify(rawProducts))).map((p: any) => ({
      _id: String(p._id),
      name: p.name,
      slug: p.slug || String(p._id),
      imageUrls: Array.isArray(p.imageUrls) && p.imageUrls.length > 0 ? p.imageUrls : p.imageUrl ? [p.imageUrl] : [],
      badges: Array.isArray(p.badges) ? p.badges : [],
      category: p.category,
    }))

    govLogos = JSON.parse(JSON.stringify(rawCustomers)).map((c: any) => ({
      _id: String(c._id),
      name: c.name || "Government Client",
      logo: c.logo || "",
      category: c.category || "Municipal Bodies",
      state: c.state || "",
      caseStudyLink: c.caseStudyLink || "",
      isActive: c.isActive !== false,
      order: c.order || 0,
    }))

    caseStudies = JSON.parse(JSON.stringify(rawCaseStudies))
    if (rawKpis) kpis = { ...kpis, ...JSON.parse(JSON.stringify(rawKpis)) }
    pastPerformance = JSON.parse(JSON.stringify(rawPP)).map((r: any) => ({ ...r, _id: String(r._id) }))
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="pt-16 min-h-screen bg-white">
        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <section className="bg-gradient-to-br from-gray-900 via-gray-800 to-brand-900 text-white py-16 md:py-24">
          <div className="max-w-6xl mx-auto px-4 md:px-6">
            <div className="max-w-3xl">
              <div className="flex flex-wrap gap-2 mb-6">
                {["GeM Approved", "IS 14855 Compliant", "MSME Registered", "ISO 9001:2015"].map((tag) => (
                  <span key={tag} className="px-3 py-1 bg-brand-600/20 border border-brand-500/30 rounded-full text-xs font-semibold text-brand-300">
                    {tag}
                  </span>
                ))}
              </div>
              <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-4">
                GeM Approved Fogging Machine OEM
              </h1>
              <p className="text-lg text-gray-300 mb-8 leading-relaxed">
                100X Circle Pvt Ltd — MSME manufacturer of IS 14855-compliant thermal fogging machines.
                Direct OEM supply for government tenders, GeM procurement, and institutional orders across India.
              </p>
              <div className="flex flex-wrap gap-3">
                <a
                  href={WA_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#25D366] hover:bg-[#1ebe5a] text-white font-bold rounded-full text-sm transition-all hover:shadow-lg hover:-translate-y-0.5"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  Request OEM Quotation
                </a>
                <Link
                  href="/fogging-machine-government-procurement"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold rounded-full text-sm transition-all"
                >
                  Government Procurement Guide
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── OEM Certifications Strip ─────────────────────────────────────── */}
        <section className="bg-white border-b border-gray-100 py-10">
          <div className="max-w-6xl mx-auto px-4 md:px-6">
            <p className="text-center text-xs font-semibold text-gray-400 uppercase tracking-widest mb-6">OEM Credentials</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              {TRUST_CERTS.map((cert) => (
                <div
                  key={cert.label}
                  className={`text-center p-4 rounded-xl border ${
                    cert.highlight
                      ? "border-brand-200 bg-brand-50"
                      : "border-gray-100 bg-gray-50"
                  }`}
                >
                  <div className="text-2xl mb-2">{cert.icon}</div>
                  <p className="text-xs font-bold text-gray-900">{cert.label}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{cert.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── KPI Strip ────────────────────────────────────────────────────── */}
        <section className="py-12 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4 md:px-6">
            <GovKPIStrip kpis={kpis} />
          </div>
        </section>

        {/* ── Trusted By / Logo Wall ───────────────────────────────────────── */}
        <GovLogoWall logos={govLogos} />

        {/* ── Government Approved Products Carousel ───────────────────────── */}
        {products.length > 0 && (
          <section className="py-16 bg-gray-50">
            <div className="max-w-6xl mx-auto px-4 md:px-6">
              <div className="text-center mb-8">
                <p className="text-xs font-semibold text-brand-600 uppercase tracking-widest mb-2">GeM Listed Models</p>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Government Approved Fogging Machines</h2>
                <p className="text-gray-500 mt-2 text-sm max-w-xl mx-auto">
                  IS 14855-compliant models available on GeM, with full OEM documentation for tender submissions.
                </p>
              </div>
              <GovProductCarousel products={products} />
            </div>
          </section>
        )}

        {/* ── OEM Advantages ───────────────────────────────────────────────── */}
        <section className="py-16 bg-white">
          <div className="max-w-6xl mx-auto px-4 md:px-6">
            <div className="text-center mb-10">
              <p className="text-xs font-semibold text-brand-600 uppercase tracking-widest mb-2">Why OEM Direct</p>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Why Government Buyers Choose 100X Circle</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {OEM_ADVANTAGES.map((adv) => (
                <div key={adv.title} className="p-5 border border-gray-200 rounded-2xl hover:border-brand-300 hover:shadow-md transition-all">
                  <div className="text-3xl mb-3">{adv.icon}</div>
                  <h3 className="font-bold text-gray-900 mb-2">{adv.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{adv.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Who Buys ─────────────────────────────────────────────────────── */}
        <section className="py-16 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4 md:px-6">
            <div className="text-center mb-10">
              <p className="text-xs font-semibold text-brand-600 uppercase tracking-widest mb-2">Buyer Categories</p>
              <h2 className="text-2xl font-bold text-gray-900">Government Categories We Serve</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {BUYER_CATEGORIES.map((b) => (
                <div key={b.label} className="flex gap-4 p-4 bg-white border border-gray-200 rounded-xl">
                  <span className="text-2xl shrink-0">{b.icon}</span>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{b.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{b.route}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Past Performance ─────────────────────────────────────────────── */}
        {pastPerformance.length > 0 && (
          <section className="py-16 bg-white">
            <div className="max-w-6xl mx-auto px-4 md:px-6">
              <div className="flex items-end justify-between mb-8">
                <div>
                  <p className="text-xs font-semibold text-brand-600 uppercase tracking-widest mb-2">Track Record</p>
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Government Supply Performance</h2>
                  <p className="text-gray-500 mt-1 text-sm">Track record of institutional and government supplies across India.</p>
                </div>
                <Link
                  href="/past-performance-government"
                  className="shrink-0 text-sm text-brand-600 font-semibold hover:underline"
                >
                  View all records →
                </Link>
              </div>
              <GovPastPerformanceCardsServer records={pastPerformance} maxVisible={6} showFilters={false} showViewAll={true} />
            </div>
          </section>
        )}

        {/* ── Featured Case Studies ────────────────────────────────────────── */}
        {caseStudies.length > 0 && (
          <section className="py-16 bg-gray-50">
            <div className="max-w-6xl mx-auto px-4 md:px-6">
              <FeaturedCaseStudyCards studies={caseStudies} heading="Deployment Success Stories" maxVisible={3} />
            </div>
          </section>
        )}

        {/* ── CTA Section ──────────────────────────────────────────────────── */}
        <section className="py-16 bg-gray-900 text-white">
          <div className="max-w-4xl mx-auto px-4 md:px-6 text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Ready to Procure via GeM or Tender?</h2>
            <p className="text-gray-300 mb-8 text-sm leading-relaxed max-w-xl mx-auto">
              Share your tender specification or GeM bid details. We'll provide L1 quotation, full documentation pack,
              and OEM certificates within 24 hours.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <a
                href={WA_HREF}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#25D366] hover:bg-[#1ebe5a] text-white font-bold rounded-full text-sm transition-all hover:shadow-lg hover:-translate-y-0.5"
              >
                WhatsApp for Quotation
              </a>
              <a
                href={`mailto:${BUSINESS.email}?subject=GeM/Tender Quotation Request&body=Dear 100X Circle, I need fogging machines for government procurement. Please share your quotation.`}
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-white/10 border border-white/20 hover:bg-white/20 text-white font-semibold rounded-full text-sm transition-all"
              >
                Email Inquiry
              </a>
              <Link
                href="/fogging-machine-government-procurement"
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-white/10 border border-white/20 hover:bg-white/20 text-white font-semibold rounded-full text-sm transition-all"
              >
                Government Procurement Guide
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-gray-400">
              <span>📞 {BUSINESS.phonePrimary}</span>
              <span>✉ {BUSINESS.email}</span>
              <span>📍 Gurugram, Haryana</span>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
