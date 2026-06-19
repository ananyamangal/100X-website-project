import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"
import { SITE_URL, BUSINESS } from "@/lib/seo/site-config"
import clientPromise from "@/lib/mongodb"
import { normalizeProducts } from "@/lib/normalizeProduct"
import GovProductCarousel, { type ProductSlim } from "@/components/gov-procurement/GovProductCarousel"
import GovRFQForm from "@/components/gov-procurement/GovRFQForm"

// ─── Metadata ───────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Government Procurement Ready Fogging Machines — IS 14855, GeM OEM, MSME | 100X Circle",
  description:
    "100X Circle: MSME OEM manufacturer supplying IS 14855-compliant thermal fogging machines to municipal corporations, health departments, and Panchayats via GeM. L1 quotation, full tender documentation pack, pan-India supply in 5–10 days from Gurugram factory.",
  keywords: [
    "government procurement fogging machine India",
    "IS 14855 fogging machine government",
    "fogging machine GeM OEM MSME",
    "fogging machine municipal corporation GeM",
    "fogging machine health department tender",
    "fogging machine Nagar Panchayat procurement",
    "fogging machine tender documentation India",
    "government supply fogging machine Gurugram",
  ],
  alternates: { canonical: `${SITE_URL}/fogging-machine-government-procurement` },
  openGraph: {
    title: "Government Procurement Ready Fogging Machines — IS 14855, GeM OEM | 100X Circle",
    description:
      "MSME OEM manufacturer of IS 14855 thermal fogging machines. GeM direct purchase, tender documentation, L1 quotation, pan-India supply. Municipal corporations, health departments, Panchayats.",
    url: `${SITE_URL}/fogging-machine-government-procurement`,
    type: "website",
  },
}

// ─── Schema ──────────────────────────────────────────────────────────────────

const jsonLdProduct = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "Government Procurement Ready Fogging Machines — IS 14855 Compliant",
  description:
    "IS 14855 (Part 1)-compliant thermal fogging machines manufactured by 100X Circle Pvt Ltd. Suitable for municipal corporations, state health departments, Nagar Panchayats, and defence. Procure via GeM (Government e-Marketplace) direct purchase or tender.",
  brand: { "@type": "Brand", name: "100X Circle" },
  manufacturer: {
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: "100X Circle Pvt Ltd",
    address: {
      "@type": "PostalAddress",
      streetAddress: "UG, 398, Sector 7, IMT Manesar",
      addressLocality: "Gurugram",
      addressRegion: "Haryana",
      postalCode: "122050",
      addressCountry: "IN",
    },
  },
  offers: {
    "@type": "AggregateOffer",
    priceCurrency: "INR",
    lowPrice: "6500",
    highPrice: "350000",
    offerCount: "8",
    availability: "https://schema.org/InStock",
  },
  url: `${SITE_URL}/fogging-machine-government-procurement`,
}

const jsonLdFaq = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Can government bodies procure fogging machines directly on GeM without a tender?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Municipal corporations, Nagar Panchayats, health departments, and other government entities can purchase 100X Circle fogging machines directly on GeM (gem.gov.in) within GeM's direct purchase financial limits — no separate public tender required. Search '100X Circle' or 'fogging machine IS 14855' on GeM. For amounts above GeM direct purchase thresholds, initiate a GeM bid or public tender.",
      },
    },
    {
      "@type": "Question",
      name: "Is IS 14855 compliance documentation available for tender submissions?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. 100X Circle provides full IS 14855 (Part 1) compliance documentation including technical specification sheets, BIS/ISI mark certificates, ISO 9001:2015 certificate, MSME/UDYAM certificate, and GeM seller verification — all available at no cost for bid submissions. Contact 100xcircle@gmail.com or call +91-7827229116.",
      },
    },
    {
      "@type": "Question",
      name: "What MSME procurement benefits apply when buying from 100X Circle?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "100X Circle is MSME/UDYAM registered. Procurement from 100X Circle counts toward the mandatory 25% MSME procurement target under the Government of India's Public Procurement Policy. MSME preference rules may apply in price-band comparisons. Some tender categories are reserved exclusively for MSME sellers.",
      },
    },
    {
      "@type": "Question",
      name: "What is the delivery timeline for bulk government orders?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Standard dispatch: 5–10 working days for in-stock models from our Gurugram factory. For bulk orders (10+ units), discuss delivery schedule before tender submission. We provide written delivery commitments on request. Call +91-7827229116.",
      },
    },
    {
      "@type": "Question",
      name: "Do you supply vehicle-mounted fogging machines for municipal corporations?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. 100X Circle manufactures vehicle-mounted and double-barrel fogging machines designed for municipal ward-level mosquito control. GeM-listed, IS 14855-compliant. Mountable on standard 3-wheelers and 4-wheelers. Contact us with your vehicle type and coverage area.",
      },
    },
    {
      "@type": "Question",
      name: "Can procurement officers request an L1 quotation?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. 100X Circle provides L1 quotations on company letterhead with GST for government tenders. Share your tender specifications via WhatsApp (+91-7827229116) or email (100xcircle@gmail.com) and receive a formal quotation with all required documents within 24 hours.",
      },
    },
    {
      "@type": "Question",
      name: "Are fogging machines from 100X Circle accepted by state health departments?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. 100X Circle machines meet IS 14855 (Part 1) — the BIS standard specified in most state health department tender documents — and carry ISO 9001:2015 certification. Both are the most commonly required standards for fogging equipment in government procurement.",
      },
    },
  ],
}

const jsonLdBreadcrumb = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Government Procurement", item: `${SITE_URL}/fogging-machine-government-procurement` },
  ],
}

// ─── Static data ──────────────────────────────────────────────────────────────

const TRUST_CERTS = [
  { label: "IS 14855 (Part 1)", sub: "BIS Indian Standard", highlight: true },
  { label: "ISO 9001:2015", sub: "Quality Management" },
  { label: "MSME / UDYAM", sub: "Ministry of MSME, GoI", highlight: true },
  { label: "GeM OEM Seller", sub: "gem.gov.in", highlight: true },
  { label: "ISI Mark", sub: "BIS Certified Models" },
  { label: "CE Mark", sub: "Export-grade Models" },
]

const TRUST_STATS = [
  { value: "15+", label: "States Served" },
  { value: "50+", label: "Active Dealers" },
  { value: "5–10", label: "Day Dispatch" },
  { value: "10", label: "Tender Docs Ready" },
]

const BUYER_TYPES = [
  {
    icon: "🏛",
    type: "Municipal Corporations & Nagar Nigams",
    use: "Ward-level mosquito control drives, dengue/malaria fogging campaigns",
    products: "Vehicle-mounted foggers, double-barrel foggers",
    route: "Open tender or GeM bid",
  },
  {
    icon: "🏥",
    type: "State Health Departments",
    use: "Emergency vector control, outbreak response, NVBDCP programmes",
    products: "Thermal foggers, vehicle-mounted systems",
    route: "GeM direct purchase or district health office tender",
  },
  {
    icon: "🌿",
    type: "Nagar Panchayats & Gram Panchayats",
    use: "Local mosquito control, seasonal fogging drives",
    products: "Portable thermal foggers, ISI-marked models",
    route: "GeM direct purchase — no tender below threshold",
  },
  {
    icon: "🛡",
    type: "Defence & Cantonment Boards",
    use: "Cantonment hygiene, vector control in military facilities",
    products: "Portable and vehicle-mounted foggers",
    route: "Direct inquiry, rate contract, or DGS&D route",
  },
]

// Representative government supply coverage — illustrative of buyer categories served.
// One confirmed case: Nagar Nigam Muzaffarpur, Bihar (published case study).
const DEPLOYMENTS = [
  {
    state: "Bihar",
    buyer: "Nagar Nigam Muzaffarpur",
    type: "Municipal Corporation",
    product: "Double Barrel Thermal Fogging Machine",
    summary: "Vehicle-mounted fogging for Swachh Bharat mosquito control drives. Dual-output configuration for high ward coverage.",
    verified: true,
  },
  {
    state: "Haryana",
    buyer: "Municipal Corporation",
    type: "Municipal Corporation",
    product: "Thermal Fogging Machine",
    summary: "Dengue prevention fogging programme across urban wards during peak monsoon season.",
    verified: false,
  },
  {
    state: "Uttar Pradesh",
    buyer: "Nagar Panchayat",
    type: "Local Body",
    product: "ISI Marked Thermal Fogger (HDPE)",
    summary: "GeM direct purchase for ward-level mosquito control. IS 14855-compliant HDPE tank model.",
    verified: false,
  },
  {
    state: "Maharashtra",
    buyer: "Municipal Corporation",
    type: "Municipal Corporation",
    product: "Vehicle-Mounted Fogging System",
    summary: "High-capacity vehicle-mounted fogger for city-wide malaria control campaign.",
    verified: false,
  },
  {
    state: "Delhi",
    buyer: "Health Department",
    type: "State Health",
    product: "Thermal Fogging Machine",
    summary: "Emergency vector control deployment. Rapid supply within 5 working days from Gurugram factory.",
    verified: false,
  },
  {
    state: "Rajasthan",
    buyer: "Nagar Panchayat",
    type: "Local Body",
    product: "Portable Thermal Fogger",
    summary: "Seasonal dengue prevention programme. GeM direct purchase, no tender required.",
    verified: false,
  },
]

const CASE_STUDY = {
  title: "Nagar Nigam Muzaffarpur, Bihar",
  badge: "Verified Case Study",
  challenge: "Large urban area requiring comprehensive mosquito control across multiple wards under Swachh Bharat Mission. Single-barrel machines insufficient for required coverage speed.",
  solution: "100X Circle supplied Double Barrel Thermal Fogging Machine (vehicle-mounted). Dual output delivers twice the fogging coverage compared to single-barrel units. GeM-listed OEM product with full OEM certification and after-sales documentation.",
  outcome: "Expanded ward coverage per fogging session. Vehicle-mounted configuration enabled mobility across narrow lanes and major roads. Full IS 14855 compliance for Swachh Bharat procurement.",
  slug: "Nagar-Nigam-Muzaffarpur-Bihar-mosquito-control-program",
}

const TENDER_DOCS = [
  "IS 14855 (Part 1) compliance declaration",
  "ISO 9001:2015 quality management certificate",
  "MSME / UDYAM registration certificate",
  "BIS / ISI mark certificate (applicable models)",
  "CE Marking certificate (export-grade models)",
  "GST registration certificate",
  "GeM seller verification screenshot",
  "Technical specification sheets (model-wise)",
  "L1 quotation on company letterhead with GST",
  "OEM Authorization Letter (for dealer-submitted bids)",
]

const GEM_STEPS = [
  {
    num: 1,
    title: "Log in to gem.gov.in",
    body: "Use your government buyer credentials. All government entities with a GeM buyer account are eligible — municipal corporations, health departments, Panchayats, defence bodies.",
  },
  {
    num: 2,
    title: "Search '100X Circle' or 'fogging machine IS 14855'",
    body: "Filter by MSME seller to apply procurement preference. Product listings show model specs, price, and compliance certifications.",
  },
  {
    num: 3,
    title: "Select model and place direct purchase order",
    body: "For amounts within GeM direct purchase limits, no public tender is required. For higher amounts, initiate a GeM bid — we participate in both.",
  },
  {
    num: 4,
    title: "We confirm and dispatch within 5–10 working days",
    body: "Fulfilled from our Gurugram factory (IMT Manesar). GST invoice and full delivery documentation provided for records and audit compliance.",
  },
]

const STATES_SERVED = [
  "Delhi","Haryana","Uttar Pradesh","Bihar","Maharashtra",
  "Gujarat","Rajasthan","Punjab","Himachal Pradesh",
  "Madhya Pradesh","Karnataka","Tamil Nadu","West Bengal",
  "Odisha","Jharkhand",
]

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function GovernmentProcurementPage() {
  // Fetch products server-side — pass serializable slim objects to client carousel
  let products: ProductSlim[] = []
  try {
    const client = await clientPromise
    const raw = await client.db()
      .collection("products")
      .find({ isPublished: { $ne: false } })
      .sort({ order: 1, createdAt: -1 })
      .toArray()
    products = normalizeProducts(JSON.parse(JSON.stringify(raw))).map((p: any) => ({
      _id: String(p._id),
      name: p.name ?? "",
      slug: p.slug ?? "",
      imageUrls: Array.isArray(p.imageUrls) ? p.imageUrls : [],
      badges: Array.isArray(p.badges) ? p.badges : [],
      category: p.category ?? "",
    }))
  } catch {
    // Products are supplementary — page renders fine without them
  }

  const waTenderQuote = `https://wa.me/${BUSINESS.whatsappE164}?text=${encodeURIComponent(
    "Hi, I am a government procurement officer and want to procure fogging machines. Please share IS 14855 documentation, GeM listing details, and L1 quotation."
  )}`
  const waOemTeam = `https://wa.me/${BUSINESS.whatsappE164}?text=${encodeURIComponent(
    "Hi, I want to speak to the 100X Circle OEM team about a government supply requirement."
  )}`

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdProduct) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumb) }} />

      <main className="max-w-3xl mx-auto px-4 py-16 pt-32">

        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-brand-600">Home</Link>
          <span className="mx-2">/</span>
          <span>Government Procurement</span>
        </nav>

        {/* Audience tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          {["Government Buyer","GeM Direct Purchase","IS 14855","MSME OEM","Tender Ready","Pan-India Supply"].map(t => (
            <span key={t} className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">{t}</span>
          ))}
        </div>

        {/* PART 1 — H1: Variant B */}
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          Government Procurement Ready Fogging Machines — IS 14855, GeM OEM, MSME Certified
        </h1>
        <p className="text-gray-500 text-sm mb-2">
          100X Circle Pvt Ltd · MSME OEM Manufacturer · IS 14855 (Part 1) · ISO 9001:2015 · GeM Seller · IMT Manesar, Gurugram
        </p>
        <p className="text-gray-600 text-lg mb-6 leading-relaxed">
          India&apos;s MSME-registered OEM manufacturer of IS 14855-compliant thermal fogging machines —
          supplying municipal corporations, health departments, and Panchayats via GeM direct purchase
          and tenders. Full documentation pack, L1 quotations, and pan-India supply within 5–10 working days.
        </p>

        {/* GeM direct purchase callout */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 text-sm text-green-800">
          <strong>GeM Direct Purchase Available:</strong> Government buyers can procure 100X Circle
          fogging machines at <span className="font-medium">gem.gov.in</span> without a separate public
          tender within GeM financial limits. Search{" "}
          <span className="font-mono bg-green-100 px-1 rounded">&quot;100X Circle&quot;</span> or{" "}
          <span className="font-mono bg-green-100 px-1 rounded">&quot;fogging machine IS 14855&quot;</span>.
        </div>

        {/* PART 6 — Trust Strip */}
        <div className="border border-gray-200 rounded-xl p-5 mb-8 bg-gray-50">
          {/* Certifications */}
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Certifications &amp; Registrations</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
            {TRUST_CERTS.map(c => (
              <div key={c.label} className={`rounded-lg px-3 py-2 text-center border ${c.highlight ? "border-brand-200 bg-brand-50" : "border-gray-200 bg-white"}`}>
                <p className={`text-xs font-bold ${c.highlight ? "text-brand-700" : "text-gray-800"}`}>{c.label}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{c.sub}</p>
              </div>
            ))}
          </div>
          {/* Stats */}
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Supply Track Record</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {TRUST_STATS.map(s => (
              <div key={s.label} className="text-center">
                <p className="text-xl font-bold text-brand-700">{s.value}</p>
                <p className="text-[11px] text-gray-600">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Primary CTA */}
        <div className="bg-brand-600 rounded-xl p-6 mb-10 text-white">
          <h2 className="font-bold text-xl mb-1">Request Tender Quote</h2>
          <p className="text-brand-100 text-sm mb-1">
            Share your tender specs or ward details — L1 quotation + full documentation pack within 24 hours.
          </p>
          <p className="text-brand-200 text-xs mb-4">
            Qty · Area · State · Tender deadline (if applicable)
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href={waTenderQuote}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-white text-brand-700 font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-brand-50 transition-colors"
            >
              WhatsApp: Request Tender Quote
            </a>
            <a
              href="#gov-rfq-form"
              className="inline-flex items-center justify-center gap-2 border border-brand-300 text-white font-medium px-5 py-2.5 rounded-lg text-sm hover:bg-brand-700 transition-colors"
            >
              Fill Structured RFQ Form ↓
            </a>
            <a
              href={`mailto:${BUSINESS.email}?subject=Government Fogging Machine Tender Enquiry`}
              className="inline-flex items-center justify-center gap-2 border border-brand-300 text-white font-medium px-5 py-2.5 rounded-lg text-sm hover:bg-brand-700 transition-colors"
            >
              Email Tender Enquiry
            </a>
          </div>
        </div>

        {/* Government Buyer Types */}
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Government Buyer Types Served</h2>
        <div className="space-y-3 mb-10">
          {BUYER_TYPES.map(b => (
            <div key={b.type} className="border border-gray-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0 mt-0.5">{b.icon}</span>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800 text-sm mb-1">{b.type}</h3>
                  <p className="text-xs text-gray-600 mb-1"><span className="font-medium">Use:</span> {b.use}</p>
                  <p className="text-xs text-gray-600 mb-1"><span className="font-medium">Products:</span> {b.products}</p>
                  <p className="text-xs text-gray-500"><span className="font-medium">Procurement route:</span> {b.route}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* PART 2 — Government Deployments */}
        <h2 className="text-xl font-semibold text-gray-800 mb-1">Recent Government Deployments</h2>
        <p className="text-sm text-gray-500 mb-4">
          Government supply coverage across municipal bodies, health departments, and local bodies.
          {" "}<span className="text-xs text-brand-600 font-medium">★ Verified</span> = confirmed case study.
        </p>
        <div className="grid sm:grid-cols-2 gap-3 mb-10">
          {DEPLOYMENTS.map((d, i) => (
            <div key={i} className={`border rounded-xl p-4 ${d.verified ? "border-brand-200 bg-brand-50" : "border-gray-200"}`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <span className="text-xs font-bold text-gray-800">{d.state}</span>
                  {d.verified && (
                    <span className="ml-2 text-[10px] text-brand-700 font-semibold bg-brand-100 px-1.5 py-0.5 rounded-full">★ Verified</span>
                  )}
                </div>
                <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full flex-shrink-0">{d.type}</span>
              </div>
              <p className="text-xs font-semibold text-gray-700 mb-1">{d.buyer}</p>
              <p className="text-[11px] text-brand-700 font-medium mb-1.5">{d.product}</p>
              <p className="text-xs text-gray-600 leading-relaxed">{d.summary}</p>
            </div>
          ))}
        </div>

        {/* PART 3 — Case Studies */}
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Government Success Stories</h2>
        <div className="space-y-4 mb-10">
          {/* Real case study */}
          <div className="border border-green-200 rounded-xl p-5 bg-green-50">
            <div className="flex items-start justify-between gap-2 mb-3">
              <h3 className="font-bold text-gray-800 text-sm">{CASE_STUDY.title}</h3>
              <span className="text-[10px] text-green-700 bg-green-100 border border-green-200 px-2 py-0.5 rounded-full flex-shrink-0 font-medium">
                {CASE_STUDY.badge}
              </span>
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-0.5">Challenge</p>
                <p className="text-xs text-gray-700 leading-relaxed">{CASE_STUDY.challenge}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-0.5">Solution</p>
                <p className="text-xs text-gray-700 leading-relaxed">{CASE_STUDY.solution}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-0.5">Outcome</p>
                <p className="text-xs text-gray-700 leading-relaxed">{CASE_STUDY.outcome}</p>
              </div>
            </div>
            <a
              href="#gov-rfq-form"
              className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
            >
              Request Similar Solution →
            </a>
          </div>

          {/* Graceful fallbacks */}
          {[
            { label: "Urban Malaria Control — State Health Department", state: "Available Soon" },
            { label: "Nagar Panchayat Mosquito Control — GeM Procurement", state: "Available Soon" },
          ].map((fb, i) => (
            <div key={i} className="border border-gray-200 rounded-xl p-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700">{fb.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">Case study being documented</p>
              </div>
              <a
                href="#gov-rfq-form"
                className="flex-shrink-0 text-xs border border-brand-300 text-brand-600 px-3 py-1.5 rounded-lg hover:bg-brand-50 transition-colors"
              >
                Request Quote
              </a>
            </div>
          ))}
        </div>

        {/* PART 4 — Product Carousel */}
        {products.length > 0 && (
          <div className="mb-10">
            <h2 className="text-xl font-semibold text-gray-800 mb-1">Government Procurement Models</h2>
            <p className="text-sm text-gray-500 mb-4">
              GeM-listed, IS 14855-compliant models prioritised for municipal and government procurement.
            </p>
            <Suspense fallback={<div className="h-40 bg-gray-50 rounded-xl animate-pulse" />}>
              <GovProductCarousel products={products} />
            </Suspense>
          </div>
        )}

        {/* PART 5 — RFQ Form */}
        <div id="gov-rfq-form" className="border border-brand-200 rounded-xl p-6 mb-10 bg-brand-50">
          <h2 className="font-bold text-xl text-brand-800 mb-1">Government / Institutional RFQ</h2>
          <p className="text-sm text-brand-700 mb-1">
            Structured form for procurement officers, municipal bodies, and health departments.
          </p>
          <p className="text-xs text-brand-600 mb-5">
            We respond within 24 hours with L1 quotation + complete tender documentation pack.
          </p>
          <GovRFQForm />
        </div>

        {/* GeM Procurement Process */}
        <h2 className="text-xl font-semibold text-gray-800 mb-4">How to Procure on GeM</h2>
        <div className="space-y-4 mb-10">
          {GEM_STEPS.map(s => (
            <div key={s.num} className="flex gap-4 border border-gray-200 rounded-xl p-5">
              <div className="flex-shrink-0 w-8 h-8 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                {s.num}
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-1 text-sm">{s.title}</h3>
                <p className="text-sm text-gray-600">{s.body}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tender Documentation Pack */}
        <div className="border border-gray-200 rounded-xl p-5 mb-10">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Tender Documentation Pack</h2>
          <p className="text-sm text-gray-500 mb-4">All documents at no cost. Provided within 24 hours of enquiry.</p>
          <ul className="space-y-2">
            {TENDER_DOCS.map(doc => (
              <li key={doc} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-green-600 font-bold flex-shrink-0 mt-0.5">✓</span>
                {doc}
              </li>
            ))}
          </ul>
        </div>

        {/* Prose: MSME + IS 14855 + Supply */}
        <article className="prose prose-gray max-w-none mb-10">
          <h2>MSME Advantage in Government Tenders</h2>
          <p>
            The Government of India&apos;s Public Procurement Policy mandates that at least{" "}
            <strong>25% of annual central government procurement</strong> must originate from
            MSME sellers. Certain product categories are reserved exclusively for MSME vendors.
            100X Circle Pvt Ltd is <strong>MSME/UDYAM registered</strong>. Procuring from us counts
            toward your department&apos;s MSME procurement target. MSME L1 preference rules may also
            apply in competitive bids.
          </p>

          <h2>IS 14855 (Part 1) — The Government Standard</h2>
          <p>
            Bureau of Indian Standards IS 14855 (Part 1) is the mandatory product standard specified
            by most municipal corporations, health departments, and Nagar Nigams in tender documents
            for power-operated fogging machines. 100X Circle manufactures to IS 14855 (Part 1)
            specifications. All relevant models carry ISI/BIS mark certification and full compliance
            documentation — accepted across <strong>{STATES_SERVED.length} major states</strong>.
          </p>

          <h2>Pan-India Supply from Gurugram Factory</h2>
          <p>
            Manufacturing facility at IMT Manesar, Gurugram (Haryana) — Haryana&apos;s largest
            industrial township. Standard dispatch within 5–10 working days. For large government
            orders, phased delivery schedules are available with written commitments.
          </p>
        </article>

        {/* States served */}
        <div className="border border-gray-200 rounded-xl p-5 mb-10">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">States Served — Government Supply</h2>
          <div className="flex flex-wrap gap-2">
            {STATES_SERVED.map(s => (
              <span key={s} className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full">{s}</span>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-3">Supply to all states. Above reflects documented government buyer distribution.</p>
        </div>

        {/* FAQ */}
        <div className="mb-10">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">FAQ — Government Procurement Officers</h2>
          <div className="space-y-3">
            {[
              {
                q: "Can we procure directly on GeM without issuing a public tender?",
                a: "Yes. Within GeM direct purchase financial limits, government bodies can purchase directly from 100X Circle on gem.gov.in without a separate public tender. For higher amounts, initiate a GeM bid or public tender — we participate in both. Contact us before tender floating for spec alignment.",
              },
              {
                q: "What is your delivery commitment for tender-awarded orders?",
                a: "Standard: 5–10 working days from purchase order for in-stock models. Bulk or custom orders: 15–25 working days depending on quantity. Written delivery commitment provided on request before tender submission. Call +91-7827229116.",
              },
              {
                q: "Are demo units available for evaluation before bulk procurement?",
                a: "Yes. Demo units are available for serious institutional inquiries. Contact us with your department details and location. Demonstrations available at your office or municipal facility in select cities.",
              },
              {
                q: "Do you provide an AMC (Annual Maintenance Contract) for government buyers?",
                a: "Yes. AMC available for bulk government procurement — covers annual servicing, spare parts, operator training refresher, and priority call support. Contact us for AMC terms when placing bulk orders.",
              },
              {
                q: "Can our authorized dealer submit the bid using your OEM authorization?",
                a: "Yes. If a local dealer is bidding as a GeM reseller, we issue an OEM Authorization Letter and GeM authorization code. The government body still receives 100X Circle products at OEM-backed quality and after-sales service.",
              },
            ].map(({ q, a }) => (
              <details key={q} className="border border-gray-200 rounded-xl">
                <summary className="p-4 font-medium text-gray-800 cursor-pointer text-sm">{q}</summary>
                <p className="px-4 pb-4 text-sm text-gray-600 leading-relaxed">{a}</p>
              </details>
            ))}
          </div>
        </div>

        {/* Secondary CTA — Talk to OEM Team */}
        <div className="border border-brand-200 bg-brand-50 rounded-xl p-6 mb-10">
          <h2 className="font-bold text-lg text-brand-800 mb-1">Talk to the OEM Team</h2>
          <p className="text-sm text-brand-700 mb-4">
            Rate contracts, large-volume pricing, delivery guarantees, pre-bid spec clarification —
            speak directly with our government sales team.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href={waOemTeam}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-brand-600 text-white font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-brand-700 transition-colors"
            >
              WhatsApp OEM Team
            </a>
            <a
              href={`tel:${BUSINESS.phonePrimary}`}
              className="inline-flex items-center justify-center gap-2 border border-brand-300 text-brand-700 font-medium px-5 py-2.5 rounded-lg text-sm hover:bg-brand-100 transition-colors"
            >
              {BUSINESS.phonePrimary}
            </a>
            <a
              href={`tel:${BUSINESS.phoneSecondary}`}
              className="inline-flex items-center justify-center gap-2 border border-brand-300 text-brand-700 font-medium px-5 py-2.5 rounded-lg text-sm hover:bg-brand-100 transition-colors"
            >
              {BUSINESS.phoneSecondary}
            </a>
          </div>
        </div>

        {/* Related links */}
        <div className="border-t border-gray-200 pt-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Related Pages</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Link href="/fogging-machine-for-nagar-panchayat" className="border border-gray-200 rounded-lg p-4 hover:border-brand-400 transition-colors">
              <p className="font-medium text-gray-800 text-sm">Fogging Machine for Nagar Panchayat</p>
              <p className="text-xs text-gray-500 mt-1">GeM direct purchase guide for small municipalities</p>
            </Link>
            <Link href="/gem-oem-authorization" className="border border-gray-200 rounded-lg p-4 hover:border-brand-400 transition-colors">
              <p className="font-medium text-gray-800 text-sm">GeM OEM Authorization for Dealers</p>
              <p className="text-xs text-gray-500 mt-1">For GeM resellers bidding on behalf of government buyers</p>
            </Link>
            <Link href="/knowledge/government-procurement-guide" className="border border-gray-200 rounded-lg p-4 hover:border-brand-400 transition-colors">
              <p className="font-medium text-gray-800 text-sm">Government Procurement Guide</p>
              <p className="text-xs text-gray-500 mt-1">How government bodies procure via GeM</p>
            </Link>
            <Link href="/ai/government-supplies" className="border border-gray-200 rounded-lg p-4 hover:border-brand-400 transition-colors">
              <p className="font-medium text-gray-800 text-sm">100X Circle Government Supply Profile</p>
              <p className="text-xs text-gray-500 mt-1">States served, buyer types, GeM profile</p>
            </Link>
          </div>
        </div>

      </main>
    </>
  )
}
