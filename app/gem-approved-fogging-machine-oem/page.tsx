import type { Metadata } from "next"
import Link from "next/link"
import clientPromise from "@/lib/mongodb"
import { SITE_URL, BUSINESS } from "@/lib/seo/site-config"
import { normalizeProducts } from "@/lib/normalizeProduct"
import GovLogoWall, { type GovLogo } from "@/components/trust/GovLogoWall"
import GovKPIStrip from "@/components/trust/GovKPIStrip"
import GovProductCarousel, { type ProductSlim } from "@/components/gov-procurement/GovProductCarousel"
import FeaturedGovSupplies, { type SupplyRecord } from "@/components/trust/FeaturedGovSupplies"
import FeaturedCaseStudyCards from "@/components/trust/FeaturedCaseStudyCards"
import FeaturedDeployments, { type DeploymentRecord } from "@/components/trust/FeaturedDeployments"
import PartnerApplyForm from "@/components/oem/PartnerApplyForm"
import OemHeroVisual from "@/components/oem/OemHeroVisual"

export const revalidate = 60

export const metadata: Metadata = {
  title: "Authorized Dealer Partnership Program — GeM Government Supply Partner | 100X Circle",
  description:
    "Become an authorized 100X Circle government supply partner. Access GeM authorization support, tender documentation, technical assistance and government procurement opportunities. IS 14855 certified manufacturer.",
  keywords: [
    "100X Circle authorized dealer",
    "fogging machine dealer partnership India",
    "GeM supply partner fogging machine",
    "IS 14855 fogging machine OEM dealer",
    "government fogging machine reseller",
    "fogging machine dealer program India",
    "thermal fogging machine authorized dealer",
  ],
  alternates: { canonical: `${SITE_URL}/gem-approved-fogging-machine-oem` },
  openGraph: {
    title: "Authorized Dealer Partnership — 100X Circle GeM OEM",
    description:
      "Partner with 100X Circle: IS 14855 certified OEM, GeM registered, MSME. GeM authorization support, tender documentation, technical assistance. Apply for dealership.",
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
  description: "OEM manufacturer of IS 14855-compliant thermal fogging machines. GeM registered, MSME, ISO 9001:2015. Authorized dealer partnership program for pan-India government supply.",
  address: {
    "@type": "PostalAddress",
    streetAddress: BUSINESS.streetAddress,
    addressLocality: BUSINESS.addressLocality,
    addressRegion: BUSINESS.addressRegion,
    postalCode: BUSINESS.postalCode,
    addressCountry: BUSINESS.addressCountry,
  },
  contactPoint: [{ "@type": "ContactPoint", telephone: BUSINESS.phonePrimary, contactType: "sales", areaServed: "IN", availableLanguage: ["Hindi", "English"] }],
  sameAs: [BUSINESS.youtube, BUSINESS.facebook, BUSINESS.instagram],
}

const PARTNER_BENEFITS = [
  {
    title: "GeM Authorization Support",
    desc: "Comprehensive support for GeM listing, bid participation, and OEM authorization codes where applicable — enabling you to access government procurement on GeM.",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
  {
    title: "Government Tender Participation Assistance",
    desc: "End-to-end guidance for participating in government tenders — from documentation to bid submission support alongside our experienced OEM team.",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="9" y1="15" x2="15" y2="15" />
      </svg>
    ),
  },
  {
    title: "Technical Documentation Support",
    desc: "IS 14855 compliance certificates, ISO 9001:2015 certificate, MSME/UDYAM registration, and technical datasheets — all on OEM letterhead for your tender submissions.",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" />
      </svg>
    ),
  },
  {
    title: "Product Compliance Guidance",
    desc: "Expert guidance on IS 14855, BIS, and ISI standards. Full compliance documentation package on request — accepted by municipal corporations and health departments nationwide.",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="6" /><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
      </svg>
    ),
  },
  {
    title: "Dedicated OEM Support Team",
    desc: "A dedicated partner support contact for order queries, pricing, documentation, and tender assistance — direct access to the 100X Circle team during active procurement cycles.",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
  },
  {
    title: "Product Training & Knowledge",
    desc: "Comprehensive product training, Hindi and English manuals, and technical briefings — so you can confidently represent 100X Circle to government procurement officers.",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" /><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
      </svg>
    ),
  },
  {
    title: "Priority Assistance for Active Partners",
    desc: "Active partners receive priority support during live tenders and active procurement cycles — rapid documentation, pricing, and technical response when it matters most.",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    title: "Long-Term Business Growth Opportunities",
    desc: "Build a sustainable government supply business with 100X Circle. As government procurement for fogging machines grows across India, active partners grow with us.",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
      </svg>
    ),
  },
]

const PARTNERSHIP_STEPS = [
  { num: "01", title: "Submit Partner Application", desc: "Fill in the application form below or contact us via WhatsApp. Share brief details about your business, location, and experience." },
  { num: "02", title: "Business Evaluation", desc: "Our team reviews your application and assesses fit based on geography, existing business relationships, and government procurement presence in your region." },
  { num: "03", title: "Partnership Discussion", desc: "A direct call with our partnership team to discuss your requirements, the products you will represent, and the support structure we provide." },
  { num: "04", title: "Onboarding & Support", desc: "Once confirmed, receive product training, documentation pack, and your dedicated contact at 100X Circle. Start participating in government procurement opportunities." },
]

const CERTS = [
  { label: "IS 14855 (Part 1)", sub: "BIS Indian Standard" },
  { label: "ISO 9001:2015", sub: "Quality Management" },
  { label: "MSME / UDYAM", sub: "Ministry of MSME, GoI" },
  { label: "GeM OEM Seller", sub: "gem.gov.in verified" },
  { label: "ISI Mark", sub: "BIS Certified Models" },
  { label: "CE Mark", sub: "Export-grade Models" },
]

const WA_HREF = `https://wa.me/${BUSINESS.whatsappE164}?text=${encodeURIComponent(
  "Hi 100X Circle, I'm interested in becoming an authorized dealer/supply partner. Please share partnership details."
)}`

export default async function GemApprovedOEMPage() {
  const client = await clientPromise.catch(() => null)
  const db = client?.db()

  let products: ProductSlim[] = []
  let govLogos: GovLogo[] = []
  let caseStudies: any[] = []
  let deployments: DeploymentRecord[] = []
  let kpis = { totalOrders: 500, statesServed: 15, departmentsServed: 80, unitsSupplied: 2000, yearsExperience: 12 }
  let supplyRecords: SupplyRecord[] = []

  if (db) {
    const [rawProducts, rawCustomers, rawKpis, rawPP, rawCaseStudies, rawDeployments] = await Promise.all([
      db.collection("products").find({ isPublished: { $ne: false } }).sort({ order: 1 }).limit(12).toArray(),
      db.collection("customers").find({ isActive: { $ne: false } }).sort({ order: 1 }).toArray(),
      db.collection("gov_kpis").findOne({ key: "main" }),
      db.collection("gov_past_performance").find({ isPublic: true }).sort({ orderYear: -1 }).limit(12).toArray(),
      db.collection("case_studies").find({ published: true }).sort({ createdAt: -1 }).limit(9).toArray(),
      db.collection("deployments").find({ images: { $exists: true, $ne: [] } }).sort({ createdAt: -1 }).limit(6).toArray(),
    ])

    products = normalizeProducts(JSON.parse(JSON.stringify(rawProducts))).map((p: any) => ({
      _id: String(p._id), name: p.name, slug: p.slug || String(p._id),
      imageUrls: Array.isArray(p.imageUrls) && p.imageUrls.length > 0 ? p.imageUrls : p.imageUrl ? [p.imageUrl] : [],
      badges: Array.isArray(p.badges) ? p.badges : [], category: p.category,
    }))

    govLogos = JSON.parse(JSON.stringify(rawCustomers)).map((c: any) => ({
      _id: String(c._id), name: c.name || "Government Client", logo: c.logo || "",
      category: c.category || "Municipal Bodies", state: c.state || "",
      caseStudyLink: c.caseStudyLink || "", isActive: c.isActive !== false, order: c.order || 0,
    }))

    if (rawKpis) kpis = { ...kpis, ...JSON.parse(JSON.stringify(rawKpis)) }
    caseStudies = JSON.parse(JSON.stringify(rawCaseStudies))
    deployments = JSON.parse(JSON.stringify(rawDeployments)).map((d: any) => ({ ...d, _id: String(d._id) }))
    supplyRecords = JSON.parse(JSON.stringify(rawPP)).map((r: any) => ({
      _id: String(r._id), organization: r.organization, department: r.department,
      state: r.state, product: r.product, category: r.category,
      status: r.status, orderYear: r.orderYear, verified: r.verified || false,
    }))
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <main className="pt-16 min-h-screen bg-gray-950">

        {/* ── 1. Hero ───────────────────────────────────────────────────────────── */}
        <section className="bg-gray-950 border-b border-white/[0.06] py-16 md:py-24 overflow-hidden">
          <div className="container mx-auto px-4 md:px-6">
            <nav className="flex items-center gap-2 text-xs text-gray-600 mb-10">
              <Link href="/" className="hover:text-gray-400 transition-colors">Home</Link>
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="9 18 15 12 9 6" /></svg>
              <span className="text-gray-400">Dealer Partnership</span>
            </nav>

            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              {/* LEFT: Content */}
              <div>
                <p className="eyebrow text-brand-400 mb-5">Dealer Partnership Program</p>
                <h1 className="text-display-sm font-700 text-white mb-6 leading-tight">
                  Become an Authorized 100X Circle Government Supply Partner
                </h1>
                <p className="text-lg text-gray-400 mb-8 leading-relaxed">
                  Access products, GeM authorization support, technical assistance and government procurement
                  opportunities with one of India&apos;s growing fogging machine manufacturers.
                </p>
                <div className="flex flex-wrap gap-3 mb-8">
                  <a
                    href="#apply"
                    className="inline-flex items-center gap-2 px-7 py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-700 rounded-full text-sm transition-colors"
                  >
                    Apply for Dealership
                  </a>
                  <a
                    href={WA_HREF}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-7 py-3.5 bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.10] text-white font-600 rounded-full text-sm transition-colors"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    Speak to Partnership Team
                  </a>
                </div>
                {/* Cert trust pills */}
                <div className="flex flex-wrap gap-2">
                  {["IS 14855", "ISO 9001:2015", "MSME / UDYAM", "GeM OEM Seller", "ISI Mark"].map((c) => (
                    <span key={c} className="px-3 py-1 bg-white/[0.05] border border-white/[0.08] rounded-full text-xs text-gray-400 font-600">{c}</span>
                  ))}
                </div>
              </div>

              {/* RIGHT: Product visual carousel */}
              <div className="hidden lg:flex items-center justify-center relative">
                <OemHeroVisual products={products} />
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

        {/* ── 3. Partner Benefits ───────────────────────────────────────────────── */}
        <section className="py-20 md:py-28 bg-white">
          <div className="container mx-auto px-4 md:px-6">
            <div className="mb-12">
              <p className="eyebrow text-brand-600 mb-4">Partnership Benefits</p>
              <h2 className="text-display-xs font-700 text-gray-900 mb-4">What You Get as a Partner</h2>
              <p className="text-gray-500 text-base max-w-xl">
                Active partners receive comprehensive support for GeM participation and government business opportunities.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {PARTNER_BENEFITS.map((b) => (
                <div key={b.title} className="group bg-gray-50 hover:bg-white border border-gray-100 hover:border-brand-200 hover:shadow-md rounded-2xl p-6 transition-all">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600 mb-4 group-hover:bg-brand-100 transition-colors">
                    {b.icon}
                  </div>
                  <h3 className="font-700 text-gray-900 text-sm mb-2 leading-snug">{b.title}</h3>
                  <p className="text-gray-500 text-xs leading-relaxed">{b.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 4. Featured Government Supplies ──────────────────────────────────── */}
        <section className="py-20 md:py-28 bg-gray-950">
          <div className="container mx-auto px-4 md:px-6">
            <p className="eyebrow text-brand-400 mb-4">Verified Deliveries</p>
            <FeaturedGovSupplies
              records={supplyRecords}
              maxVisible={6}
              heading="Featured Government Supplies"
              subheading="A cross-section of government procurement orders fulfilled across India — the market you will have access to as a partner."
              showViewAll
            />
          </div>
        </section>

        {/* ── 5. Deployment Case Studies ────────────────────────────────────────── */}
        {caseStudies.length > 0 && (
          <section className="py-20 md:py-28 bg-white">
            <div className="container mx-auto px-4 md:px-6">
              <p className="eyebrow text-brand-600 mb-4">Featured Government Deployments</p>
              <FeaturedCaseStudyCards studies={caseStudies} heading="Deployment Success Stories" maxVisible={9} showViewAll />
            </div>
          </section>
        )}

        {/* ── 5b. Real World Deployments ────────────────────────────────────────── */}
        {deployments.length > 0 && (
          <section className="py-20 md:py-28 bg-gray-950 border-t border-white/[0.06]">
            <div className="container mx-auto px-4 md:px-6">
              <FeaturedDeployments deployments={deployments} heading="Real World Deployments" maxVisible={6} showViewAll darkBg />
            </div>
          </section>
        )}

        {/* ── 6. Product Portfolio ──────────────────────────────────────────────── */}
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
                <Link href="/products" className="inline-flex items-center gap-2 text-sm font-600 text-brand-600 hover:text-brand-700 transition-colors">
                  View full product range
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="9 18 15 12 9 6" /></svg>
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* ── 7. How Partnership Works ──────────────────────────────────────────── */}
        <section className="py-20 md:py-28 bg-gray-950">
          <div className="container mx-auto px-4 md:px-6">
            <div className="mb-12">
              <p className="eyebrow text-brand-400 mb-4">How It Works</p>
              <h2 className="text-display-xs font-700 text-white mb-4">4-Step Partnership Process</h2>
              <p className="text-gray-400 text-base max-w-xl">Simple, transparent, and designed for serious business partners.</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {PARTNERSHIP_STEPS.map((step, i) => (
                <div key={step.num} className="relative">
                  {i < PARTNERSHIP_STEPS.length - 1 && (
                    <div className="hidden lg:block absolute top-7 left-full w-full h-px bg-white/10 z-0" style={{ transform: "translateX(-50%)" }} />
                  )}
                  <div className="relative z-10">
                    <div className="w-14 h-14 rounded-2xl bg-brand-600 flex items-center justify-center mb-5 shadow-lg shadow-brand-600/20">
                      <span className="text-white font-700 text-lg">{step.num}</span>
                    </div>
                    <h3 className="font-700 text-white text-sm mb-2">{step.title}</h3>
                    <p className="text-gray-500 text-xs leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 8. Organizations Served ───────────────────────────────────────────── */}
        <GovLogoWall
          logos={govLogos}
          eyebrow="Trusted By"
          heading="Organizations Served"
          subheading="Municipal corporations, health departments, and public institutions that have procured 100X Circle fogging machines across India."
        />

        {/* ── 9. Certifications ────────────────────────────────────────────────── */}
        <section className="py-14 bg-gray-950 border-y border-white/[0.06]">
          <div className="container mx-auto px-4 md:px-6">
            <p className="text-center eyebrow text-gray-600 mb-8">OEM Credentials You Represent</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {CERTS.map((cert) => (
                <div key={cert.label} className="text-center glass-card p-4 rounded-xl">
                  <svg className="w-4 h-4 text-brand-500 mx-auto mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <p className="text-xs font-700 text-white">{cert.label}</p>
                  <p className="text-[10px] text-gray-600 mt-0.5">{cert.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 10. Apply ─────────────────────────────────────────────────────────── */}
        <section id="apply" className="py-20 md:py-28 bg-gray-950">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-10">
                <p className="eyebrow text-brand-400 mb-4">Apply Now</p>
                <h2 className="text-display-xs font-700 text-white mb-4">Apply for Partnership</h2>
                <p className="text-gray-400 text-base">
                  Tell us about your business and operating region. Our partnership team responds within 1 business day.
                </p>
              </div>
              <div className="glass-card rounded-2xl p-6 md:p-8">
                <PartnerApplyForm source="partner_application" />
              </div>
              <p className="text-center text-gray-600 text-xs mt-6">
                Prefer a call?{" "}
                <a href={`tel:${BUSINESS.phonePrimary}`} className="text-gray-400 hover:text-white transition-colors">{BUSINESS.phonePrimary}</a>
                {" "}·{" "}
                <a href={`mailto:${BUSINESS.email}`} className="text-gray-400 hover:text-white transition-colors">{BUSINESS.email}</a>
              </p>
            </div>
          </div>
        </section>

        {/* ── Footer Links ─────────────────────────────────────────────────────── */}
        <section className="py-8 bg-gray-950 border-t border-white/[0.06]">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-wrap gap-3 justify-center">
              {[
                { href: "/past-performance-government", label: "Government Track Record" },
                { href: "/fogging-machine-government-procurement", label: "Procurement Guide" },
                { href: "/products", label: "All Products" },
                { href: "/case-studies", label: "Case Studies" },
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
