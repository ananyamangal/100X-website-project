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
import WhoProcturesFrom from "@/components/trust/WhoProcturesFrom"
import IndiaDeploymentMap, { type StateDeployment } from "@/components/trust/IndiaDeploymentMap"

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
  { label: "IS 14855 (Part 1)", sub: "BIS Indian Standard", highlight: true, border: "border-blue-500/20 bg-blue-500/5 text-blue-400" },
  { label: "ISO 9001:2015", sub: "Quality Management", border: "border-emerald-500/20 bg-emerald-500/5 text-emerald-400" },
  { label: "MSME / UDYAM", sub: "Ministry of MSME, GoI", highlight: true, border: "border-amber-500/20 bg-amber-500/5 text-amber-400" },
  { label: "GeM OEM Seller", sub: "gem.gov.in verified", highlight: true, border: "border-violet-500/20 bg-violet-500/5 text-violet-400" },
  { label: "ISI Mark", sub: "BIS Certified Models", border: "border-slate-500/20 bg-slate-500/5 text-slate-400" },
  { label: "CE Mark", sub: "Export-grade Models", border: "border-rose-500/20 bg-rose-500/5 text-rose-400" },
]

const OEM_ADVANTAGES = [
  {
    title: "Direct Manufacturer",
    desc: "No middlemen. Direct factory pricing, full OEM documentation, and manufacturer warranty on every order.",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
      </svg>
    ),
  },
  {
    title: "Tender Documentation Pack",
    desc: "Technical specifications, IS 14855 compliance certificates, ISO cert, MSME cert — all on company letterhead within 24 hours.",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="9" y1="15" x2="15" y2="15" />
      </svg>
    ),
  },
  {
    title: "L1 Quotation Ready",
    desc: "Price-competitive L1 quotations with GST invoice on company letterhead for government tender submissions.",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
      </svg>
    ),
  },
  {
    title: "Pan-India 5–10 Day Supply",
    desc: "From our Gurugram factory (IMT Manesar). GST invoice, delivery documentation, and full after-sales support.",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
  },
  {
    title: "GeM Direct Purchase",
    desc: "Listed on gem.gov.in. Government entities can purchase without tender below GeM direct purchase limits.",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
  {
    title: "After-Sales & Spare Parts",
    desc: "Domestic spare parts from Gurugram. Hindi-language operator manuals and dedicated technical support.",
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
      </svg>
    ),
  },
]

const WA_HREF = `https://wa.me/${BUSINESS.whatsappE164}?text=${encodeURIComponent(
  "Hi 100X Circle, I need fogging machines for government/tender procurement. Please share quotation and documentation."
)}`

// Maps full state names to map codes
const STATE_TO_CODE: Record<string, string> = {
  "Andhra Pradesh": "AP", "Arunachal Pradesh": "AR", "Assam": "AS", "Bihar": "BR",
  "Chhattisgarh": "CG", "Goa": "GA", "Gujarat": "GJ", "Haryana": "HR",
  "Himachal Pradesh": "HP", "Jharkhand": "JH", "Karnataka": "KA", "Kerala": "KL",
  "Madhya Pradesh": "MP", "Maharashtra": "MH", "Manipur": "MN", "Meghalaya": "MG",
  "Mizoram": "MZ", "Nagaland": "NL", "Odisha": "OD", "Punjab": "PB",
  "Rajasthan": "RJ", "Sikkim": "SK", "Tamil Nadu": "TN", "Telangana": "TG",
  "Tripura": "TR", "Uttar Pradesh": "UP", "Uttarakhand": "UK", "West Bengal": "WB",
  "Delhi": "DL", "Jammu & Kashmir": "JK", "Jammu and Kashmir": "JK",
  "Puducherry": "PY", "Andaman and Nicobar Islands": "AN",
}

const DEMO_STATE_DATA: Record<string, StateDeployment> = {
  UP: { count: 8 }, BR: { count: 6 }, HR: { count: 5 }, DL: { count: 4 },
  RJ: { count: 4 }, MH: { count: 3 }, GJ: { count: 3 }, WB: { count: 3 },
  TG: { count: 2 }, KA: { count: 2 }, MP: { count: 2 }, PB: { count: 2 },
  UK: { count: 1 }, CG: { count: 1 }, OD: { count: 1 },
}

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

  // Build state deployment map
  const stateDeployments: Record<string, StateDeployment> = {}
  for (const r of pastPerformance) {
    const code = STATE_TO_CODE[r.state]
    if (!code) continue
    if (!stateDeployments[code]) stateDeployments[code] = { count: 0 }
    stateDeployments[code].count++
  }
  const mapData = Object.keys(stateDeployments).length > 0 ? stateDeployments : DEMO_STATE_DATA

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <main className="pt-16 min-h-screen bg-slate-950">
        {/* ── Hero ─────────────────────────────────────────────────────────────── */}
        <section className="bg-slate-950 border-b border-white/[0.06] py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 md:px-6">
            <div className="max-w-3xl">
              <div className="flex flex-wrap gap-2 mb-6">
                {["GeM Approved OEM", "IS 14855 Compliant", "MSME Registered", "ISO 9001:2015"].map((tag) => (
                  <span key={tag} className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-xs font-bold text-emerald-400">
                    {tag}
                  </span>
                ))}
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-white leading-tight mb-5">
                GeM Approved Fogging Machine OEM
              </h1>
              <p className="text-lg text-slate-400 mb-8 leading-relaxed">
                100X Circle Pvt Ltd — MSME manufacturer of IS 14855-compliant thermal fogging machines.
                Direct OEM supply for government tenders, GeM procurement, and institutional orders across India.
              </p>
              <div className="flex flex-wrap gap-3">
                <a href={WA_HREF} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition-colors">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  Request OEM Quotation
                </a>
                <Link href="/fogging-machine-government-procurement"
                  className="inline-flex items-center gap-2 px-6 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold rounded-xl text-sm transition-colors">
                  Government Procurement Guide
                </Link>
                <Link href="/past-performance-government"
                  className="inline-flex items-center gap-2 px-6 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold rounded-xl text-sm transition-colors">
                  Past Performance
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── 1. OEM Credentials Strip ─────────────────────────────────────────── */}
        <section className="bg-slate-900 border-b border-white/[0.06] py-10">
          <div className="max-w-7xl mx-auto px-4 md:px-6">
            <p className="text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-6">OEM Credentials & Certifications</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {TRUST_CERTS.map((cert) => (
                <div key={cert.label} className={`text-center p-4 rounded-xl border ${cert.border}`}>
                  <svg className="w-4 h-4 mx-auto mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <p className="text-xs font-bold text-white">{cert.label}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{cert.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 2. KPI Dashboard ─────────────────────────────────────────────────── */}
        <section className="py-14 bg-slate-950">
          <div className="max-w-7xl mx-auto px-4 md:px-6">
            <GovKPIStrip kpis={kpis} />
          </div>
        </section>

        {/* ── 3. India Deployment Map ──────────────────────────────────────────── */}
        <section className="py-16 bg-slate-950">
          <div className="max-w-7xl mx-auto px-4 md:px-6">
            <div className="mb-8">
              <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-3">Pan-India Presence</p>
              <h2 className="text-3xl font-black text-white mb-2">State-wise Government Deployments</h2>
              <p className="text-slate-400 text-sm max-w-xl">Geographic distribution of government supply orders across India.</p>
            </div>
            <IndiaDeploymentMap deployments={mapData} />
          </div>
        </section>

        {/* ── 4. Trusted By Logo Wall ──────────────────────────────────────────── */}
        <GovLogoWall logos={govLogos} />

        {/* ── 5. Who Procures ──────────────────────────────────────────────────── */}
        <WhoProcturesFrom />

        {/* ── 6. Past Performance Records ─────────────────────────────────────── */}
        {pastPerformance.length > 0 && (
          <section className="py-16 bg-slate-950">
            <div className="max-w-7xl mx-auto px-4 md:px-6">
              <div className="flex items-end justify-between mb-8">
                <div>
                  <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-3">Track Record</p>
                  <h2 className="text-3xl font-black text-white">Government Supply Performance</h2>
                  <p className="text-slate-400 mt-2 text-sm">Institutional and government supply history across India.</p>
                </div>
                <Link href="/past-performance-government"
                  className="shrink-0 text-sm text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 transition-colors">
                  View all records
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="9 18 15 12 9 6" /></svg>
                </Link>
              </div>
              <GovPastPerformanceCardsServer records={pastPerformance} maxVisible={6} showFilters={false} showViewAll={true} />
            </div>
          </section>
        )}

        {/* ── 7. OEM Advantages ────────────────────────────────────────────────── */}
        <section className="py-16 bg-slate-900/60">
          <div className="max-w-7xl mx-auto px-4 md:px-6">
            <div className="mb-10">
              <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-3">OEM Advantages</p>
              <h2 className="text-3xl font-black text-white">Why Government Buyers Choose 100X Circle</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {OEM_ADVANTAGES.map((adv) => (
                <div key={adv.title} className="p-6 bg-slate-900 border border-white/[0.06] hover:border-white/[0.15] rounded-2xl transition-all group">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 group-hover:bg-emerald-500/20 transition-colors">
                    {adv.icon}
                  </div>
                  <h3 className="font-bold text-white mb-2">{adv.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{adv.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 8. Government Approved Products Carousel ─────────────────────────── */}
        {products.length > 0 && (
          <section className="py-16 bg-slate-950">
            <div className="max-w-7xl mx-auto px-4 md:px-6">
              <div className="mb-8">
                <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest mb-3">GeM Listed Models</p>
                <h2 className="text-3xl font-black text-white">Government Approved Fogging Machines</h2>
                <p className="text-slate-400 mt-2 text-sm max-w-xl">
                  IS 14855-compliant models available on GeM, with full OEM documentation for tender submissions.
                </p>
              </div>
              <GovProductCarousel products={products} />
            </div>
          </section>
        )}

        {/* ── 9. Featured Case Studies ─────────────────────────────────────────── */}
        {caseStudies.length > 0 && (
          <section className="py-16 bg-slate-900/60">
            <div className="max-w-7xl mx-auto px-4 md:px-6">
              <FeaturedCaseStudyCards studies={caseStudies} heading="Deployment Success Stories" maxVisible={3} />
            </div>
          </section>
        )}

        {/* ── 10. CTA ──────────────────────────────────────────────────────────── */}
        <section className="py-20 bg-slate-950 border-t border-white/[0.06]">
          <div className="max-w-4xl mx-auto px-4 md:px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4">Ready to Procure via GeM or Tender?</h2>
            <p className="text-slate-400 mb-10 text-base leading-relaxed max-w-xl mx-auto">
              Share your tender specification or GeM bid details. We'll provide L1 quotation, full documentation pack,
              and OEM certificates within 24 hours.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <a href={WA_HREF} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition-colors">
                WhatsApp for Quotation
              </a>
              <a href={`mailto:${BUSINESS.email}?subject=GeM/Tender Quotation Request`}
                className="inline-flex items-center gap-2 px-8 py-4 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold rounded-xl text-sm transition-colors">
                Email Inquiry
              </a>
              <Link href="/fogging-machine-government-procurement"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold rounded-xl text-sm transition-colors">
                Procurement Guide
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap justify-center gap-6 text-sm text-slate-500">
              <span>{BUSINESS.phonePrimary}</span>
              <span>{BUSINESS.email}</span>
              <span>IMT Manesar, Gurugram, Haryana</span>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
