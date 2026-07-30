import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"
import { SITE_URL, BUSINESS } from "@/lib/seo/site-config"

export const revalidate = 60
import clientPromise from "@/lib/mongodb"
import { normalizeProducts } from "@/lib/normalizeProduct"
import GovProductCarousel, { type ProductSlim } from "@/components/gov-procurement/GovProductCarousel"
import GovRFQForm from "@/components/gov-procurement/GovRFQForm"
import CelebrityTrustBadge from "@/components/landing/CelebrityTrustBadge"
import GovPastPerformance from "@/components/gov-procurement/GovPastPerformance"
import TenderPackLeadCapture from "@/components/gov-procurement/TenderPackLeadCapture"
import GovLogoWall, { type GovLogo } from "@/components/trust/GovLogoWall"
import GovKPIStrip from "@/components/trust/GovKPIStrip"
import FeaturedCaseStudyCards from "@/components/trust/FeaturedCaseStudyCards"
import FeaturedGovSupplies, { type SupplyRecord } from "@/components/trust/FeaturedGovSupplies"
import FeaturedDeployments, { type DeploymentRecord } from "@/components/trust/FeaturedDeployments"
import {
  StickyProcurementCTA,
  ProcurementLifecycleTimeline,
  ProcurementReadinessScore,
  InstitutionalBuyerTabs,
  GovInstitutionalProductCards,
  type BuyerTypeDef,
} from "@/components/gov-procurement/GovProcurementInteractive"

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

const BUYER_TYPES: BuyerTypeDef[] = [
  {
    icon: "🏛",
    type: "Municipal Corporations & Nagar Nigams",
    use: "Ward-level mosquito control drives, dengue/malaria fogging campaigns",
    products: "Vehicle-mounted foggers, double-barrel foggers",
    route: "Open tender or GeM bid",
    typical: "5–20 units per procurement cycle, often vehicle-mounted for ward coverage",
    recommended: "Double Barrel Vehicle-Mounted Fogger, IS 14855 Heavy-Duty Series",
  },
  {
    icon: "🏥",
    type: "State Health Departments",
    use: "Emergency vector control, outbreak response, NVBDCP programmes",
    products: "Thermal foggers, vehicle-mounted systems",
    route: "GeM direct purchase or district health office tender",
    typical: "2–10 units for district-level deployment, portable preferred for rapid response",
    recommended: "ISI Marked Portable Thermal Fogger, IS 14855 Petrol Series",
  },
  {
    icon: "🌿",
    type: "Nagar Panchayats & Gram Panchayats",
    use: "Local mosquito control, seasonal fogging drives",
    products: "Portable thermal foggers, ISI-marked models",
    route: "GeM direct purchase — no tender below threshold",
    typical: "1–5 units, portable models, GeM direct purchase under financial limit",
    recommended: "ISI Marked HDPE Tank Fogger, Petrol Portable Series",
  },
  {
    icon: "🛡",
    type: "Defence & Cantonment Boards",
    use: "Cantonment hygiene, vector control in military facilities",
    products: "Portable and vehicle-mounted foggers",
    route: "Direct inquiry, rate contract, or DGS&D route",
    typical: "3–15 units for cantonment coverage, robust construction required",
    recommended: "Heavy-Duty Vehicle-Mounted Fogger, IS 14855 Defence Grade",
  },
  {
    icon: "🌾",
    type: "Agriculture & Forest Departments",
    use: "Pest control in agricultural settings, forestry vector management",
    products: "Portable thermal foggers, backpack foggers",
    route: "Open tender or state DGS&D rate contract",
    typical: "10–50 units for district-level pest management programmes",
    recommended: "IS 14855 Agricultural Series, Portable Thermal Fogger",
  },
  {
    icon: "✈️",
    type: "Airport & Port Authorities",
    use: "Vector control within airport perimeter and cargo areas",
    products: "Vehicle-mounted foggers, portable IS 14855 units",
    route: "Direct inquiry or AAI/port trust tender",
    typical: "2–8 units for perimeter fogging and cargo area sanitation",
    recommended: "Double Barrel Vehicle-Mounted, High-Capacity IS 14855",
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
}

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

const PROCUREMENT_MODELS = [
  {
    icon: "🛒",
    title: "GeM Direct Purchase",
    badge: "No Tender Needed",
    badgeColor: "bg-green-100 text-green-700",
    desc: "Below GeM financial limit — any government buyer purchases 100X Circle products directly on gem.gov.in without floating a separate public tender.",
    steps: ["Log in to gem.gov.in", "Search 100X Circle", "Place order directly"],
    speed: "Same day",
  },
  {
    icon: "⚡",
    title: "GeM Competitive Bid",
    badge: "Price Discovery",
    badgeColor: "bg-blue-100 text-blue-700",
    desc: "Above direct purchase threshold. Buyer floats a GeM bid with technical specifications. 100X Circle participates and competes on price.",
    steps: ["Buyer creates GeM bid", "We submit bid", "L1 selected"],
    speed: "3–10 days",
  },
  {
    icon: "📋",
    title: "Open Tender / NIT",
    badge: "Large Quantities",
    badgeColor: "bg-violet-100 text-violet-700",
    desc: "For large municipal requirements. NIT published, 100X Circle submits technical + financial bid. IS 14855 compliance and MSME status qualify us in most tenders.",
    steps: ["NIT published", "We submit bid + docs", "Award on L1"],
    speed: "3–8 weeks",
  },
  {
    icon: "📄",
    title: "Annual Rate Contract",
    badge: "Repeat Supply",
    badgeColor: "bg-amber-100 text-amber-700",
    desc: "Annual contract at agreed rate — department can draw off-takes throughout the year without re-tendering. Preferred by large municipal corporations and state health departments.",
    steps: ["Rate contract tender", "Annual rate agreed", "Draw-offs as needed"],
    speed: "As needed",
  },
  {
    icon: "🤝",
    title: "DGS&D / NIC Route",
    badge: "Central Govt",
    badgeColor: "bg-indigo-100 text-indigo-700",
    desc: "Central government ministries and departments can procure through DGS&D rate contracts or NIC empanelment. 100X Circle supports DGS&D inquiry routing.",
    steps: ["Ministry inquiry", "Rate contract reference", "Order issued"],
    speed: "Per contract",
  },
  {
    icon: "🏪",
    title: "Dealer-Assisted Supply",
    badge: "Local Presence",
    badgeColor: "bg-teal-100 text-teal-700",
    desc: "Local authorized dealers submit bids using 100X Circle OEM Authorization. Government still receives 100X Circle products with OEM warranty and after-sales support.",
    steps: ["Local dealer bids", "OEM auth issued", "Supply + OEM warranty"],
    speed: "Per dealer SLA",
  },
]

const DOCUMENTATION_ITEMS = [
  { icon: "📋", title: "IS 14855 (Part 1) Technical Spec Sheet", desc: "BIS Indian Standard compliance document", pages: "2 pages", category: "Compliance" },
  { icon: "🏆", title: "BIS / ISI Mark Certificate", desc: "Bureau of Indian Standards certification", pages: "1 page", category: "Compliance" },
  { icon: "🌐", title: "ISO 9001:2015 Certificate", desc: "Quality Management System certification", pages: "1 page", category: "Quality" },
  { icon: "🏢", title: "MSME / UDYAM Certificate", desc: "Ministry of MSME registration", pages: "1 page", category: "Registration" },
  { icon: "🛒", title: "GeM Seller Verification Letter", desc: "gem.gov.in OEM seller verification", pages: "1 page", category: "Registration" },
  { icon: "📊", title: "GST Registration Certificate", desc: "With HSN 8424 classification", pages: "1 page", category: "Registration" },
  { icon: "🏭", title: "Company Profile & OEM Credentials", desc: "Factory, capabilities, history", pages: "4 pages", category: "Company" },
  { icon: "📦", title: "Full Tender Documentation Pack", desc: "All documents in one package", pages: "12+ pages", category: "Tender", highlight: true },
  { icon: "💰", title: "L1 Quotation Template", desc: "On company letterhead with GST breakdown", pages: "2 pages", category: "Commercial" },
  { icon: "🔧", title: "AMC Terms & Conditions", desc: "Annual Maintenance Contract template", pages: "3 pages", category: "Support" },
]

const EXPANDED_FAQ = [
  { q: "Can we procure directly on GeM without issuing a public tender?", a: "Yes. Within GeM direct purchase financial limits, government bodies can purchase directly from 100X Circle on gem.gov.in without a separate public tender. For higher amounts, initiate a GeM bid or public tender — we participate in both. Contact us before tender floating for spec alignment." },
  { q: "What is your delivery commitment for tender-awarded orders?", a: "Standard: 5–10 working days from purchase order for in-stock models. Bulk or custom orders: 15–25 working days depending on quantity. Written delivery commitment provided on request before tender submission. Call +91-7827229116." },
  { q: "Are demo units available for evaluation before bulk procurement?", a: "Yes. Demo units are available for serious institutional inquiries. Contact us with your department details and location. Demonstrations available at your office or municipal facility in select cities." },
  { q: "Do you provide an AMC (Annual Maintenance Contract) for government buyers?", a: "Yes. AMC available for bulk government procurement — covers annual servicing, spare parts, operator training refresher, and priority call support. Contact us for AMC terms when placing bulk orders." },
  { q: "Can our authorized dealer submit the bid using your OEM authorization?", a: "Yes. If a local dealer is bidding as a GeM reseller, we issue an OEM Authorization Letter and GeM authorization code. The government body still receives 100X Circle products at OEM-backed quality and after-sales service." },
  { q: "What are the GeM product listing IDs for 100X Circle foggers?", a: "Our GeM product listings are searchable on gem.gov.in by searching '100X Circle' or 'fogging machine IS 14855'. Filter by MSME seller for preference application. Contact us for current GeM listing IDs to cite in your procurement documentation." },
  { q: "Do you participate in GeM reverse auctions (RA)?", a: "Yes. 100X Circle participates in GeM Reverse Auctions where our products are included in the buyer's product category. We are prepared for RA-based price discovery. Contact us before floating RA to ensure our product is mapped to your category." },
  { q: "What is the minimum order quantity for government procurement?", a: "There is no minimum quantity for government orders. Single-unit GeM direct purchases are accepted. For orders of 5+ units, contact us directly for volume pricing and priority dispatch scheduling." },
  { q: "Can we visit the Gurugram manufacturing facility?", a: "Yes. Factory visits are welcome for serious institutional buyers. Our facility is at UG-398, Sector 7, IMT Manesar, Gurugram — 40 km from Delhi. Schedule via email (100xcircle@gmail.com) or WhatsApp (+91-7827229116)." },
  { q: "Do you provide operator training with bulk government supply?", a: "Yes. Operator training is included for orders of 5+ units. We provide on-site training at your facility covering machine operation, fuel handling, maintenance, and IS 14855 safety protocols. Training can also be conducted at our Gurugram factory." },
  { q: "How do you handle defective units under government warranty?", a: "All units carry a 12-month manufacturer warranty from date of delivery. For government buyers, we provide priority replacement or repair within 48–72 hours of defect reporting. Contact our service line at +91-7827229116." },
  { q: "What payment terms are accepted for government orders?", a: "Government standard payment terms apply — 30/60/90 days credit against verified purchase order, or payment on delivery for GeM orders. Bank transfer (RTGS/NEFT) and PFMS (Public Financial Management System) routing accepted." },
  { q: "Are spare parts covered under the government supply contract?", a: "Core spare parts (nozzles, filters, fuel caps) are available for purchase post-supply. For AMC contracts, a critical spares kit is included. Spare parts are available nationally via our dealer network." },
  { q: "Can specifications be customized for specific tender requirements?", a: "Within IS 14855 compliance parameters, yes. Tank size, fuel type, nozzle configuration, and mounting options can be adjusted. Contact us before tender drafting — we assist with spec alignment to ensure our product qualifies." },
  { q: "What certifications does the vehicle-mounted fogger carry?", a: "Vehicle-mounted models carry IS 14855 (Part 1) compliance, ISI mark on applicable components, and ISO 9001:2015 quality certification. Mounting hardware is designed for compatibility with standard Indian commercial vehicles (Mahindra, TATA, Piaggio 3-wheelers)." },
  { q: "How is the MSME L1 preference applied in competitive bids?", a: "Under GoI Public Procurement Policy for MSMEs: if our bid is within 15% of the L1 price from a non-MSME, we may be considered for the order at the L1 price. State-specific policies may vary. Check the MSME preference clause in your tender document." },
  { q: "Do you supply under NVBDCP (National Vector Borne Disease Control Programme)?", a: "Yes. Our products are used in NVBDCP-supported fogging programmes at the district level via state health departments. We provide IS 14855-compliant documentation and NVBDCP-aligned specifications on request." },
  { q: "What is the HSN code for fogging machines for GST purposes?", a: "HSN Code: 8424 — 'Mechanical appliances for projecting, dispersing or spraying liquids or powders.' GST rate: 18%. All invoices include HSN 8424 with GST breakdown for your accounts and audit records." },
  { q: "Is an EMD (Earnest Money Deposit) required for tenders?", a: "100X Circle as an MSME/UDYAM registered company is exempt from EMD requirements under GoI Public Procurement Policy for MSME orders. For tenders where EMD exemption needs to be invoked, we provide the MSME/UDYAM certificate as documentary evidence." },
  { q: "Can 100X Circle supply to NHM (National Health Mission) programmes?", a: "Yes. 100X Circle supplies to state NHM programmes via state health departments and district health officers. NHM-funded procurement typically follows state health department tender procedures or GeM direct purchase. Contact us with your district and requirement." },
  { q: "What is the warranty on IS 14855 certified models?", a: "12-month comprehensive manufacturer warranty covering manufacturing defects. Engine warranty follows OEM engine manufacturer terms. Free replacement/repair within warranty period. Extended warranty available for AMC contract holders." },
  { q: "Do you supply under Swachh Bharat Mission procurement?", a: "Yes. Several of our municipal corporation customers procure for Swachh Bharat Mission vector control activities. We have a verified case study from Nagar Nigam Muzaffarpur, Bihar under Swachh Bharat. IS 14855 compliance satisfies Swachh Bharat technical specifications." },
  { q: "Can we get a pre-bid technical meeting with your team?", a: "Yes. We strongly recommend pre-bid technical meetings before floatation for large tenders. Our team can participate online or in person at your location. This helps align specifications with our product range and avoid bid disqualification on technical grounds." },
  { q: "What documents are required to register 100X Circle as a vendor in our system?", a: "Standard government vendor registration documents: GST certificate, MSME/UDYAM certificate, PAN, cancelled cheque, ISO 9001 certificate, GeM seller ID, and company incorporation certificate. Contact us for a complete vendor registration pack — shareable within 24 hours." },
  { q: "Do you supply refurbished or used machines?", a: "No. All government supply is new machines directly from our Gurugram manufacturing facility. We do not supply refurbished or used equipment. Each unit ships with a factory quality inspection report." },
]

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function GovernmentProcurementPage() {
  const client = await clientPromise.catch(() => null)
  const db = client?.db()

  let products: ProductSlim[] = []
  let govLogos: GovLogo[] = []
  let customerLogos: string[] = []
  let govKpis = { totalOrders: 500, statesServed: 15, departmentsServed: 80, unitsSupplied: 2000, yearsExperience: 12 }
  let caseStudies: any[] = []
  let supplyRecords: SupplyRecord[] = []
  let deployments: DeploymentRecord[] = []

  if (db) {
    try {
      const [rawProducts, rawCustomers, rawKpis, rawCaseStudies, rawPP, rawDeployments] = await Promise.all([
        db.collection("products").find({ isPublished: { $ne: false } }).sort({ order: 1, createdAt: -1 }).toArray(),
        db.collection("customers").find({ isActive: { $ne: false } }).sort({ order: 1 }).toArray(),
        db.collection("gov_kpis").findOne({ key: "main" }),
        db.collection("case_studies").find({ published: true }).sort({ createdAt: -1 }).limit(9).toArray(),
        db.collection("gov_past_performance").find({ isPublic: true }).sort({ orderYear: -1 }).limit(9).toArray(),
        db.collection("deployments").find({ images: { $exists: true, $ne: [] } }).sort({ createdAt: -1 }).limit(6).toArray(),
      ])

      products = normalizeProducts(JSON.parse(JSON.stringify(rawProducts))).map((p: any) => ({
        _id: String(p._id),
        name: p.name ?? "",
        slug: p.slug ?? "",
        imageUrls: Array.isArray(p.imageUrls) ? p.imageUrls : [],
        badges: Array.isArray(p.badges) ? p.badges : [],
        category: p.category ?? "",
      }))

      const parsedCustomers = JSON.parse(JSON.stringify(rawCustomers))
      govLogos = parsedCustomers.map((c: any) => ({
        _id: String(c._id), name: c.name || "Government Client", logo: c.logo || "",
        category: c.category || "Municipal Bodies", state: c.state || "",
        caseStudyLink: c.caseStudyLink || "", isActive: c.isActive !== false, order: c.order || 0,
      }))
      customerLogos = parsedCustomers.map((c: any) => c.logo).filter(Boolean)

      if (rawKpis) govKpis = { ...govKpis, ...JSON.parse(JSON.stringify(rawKpis)) }
      caseStudies = JSON.parse(JSON.stringify(rawCaseStudies))
      supplyRecords = JSON.parse(JSON.stringify(rawPP)).map((r: any) => ({
        _id: String(r._id), organization: r.organization, department: r.department,
        state: r.state, product: r.product, category: r.category,
        status: r.status, orderYear: r.orderYear, verified: r.verified || false,
      }))
      deployments = JSON.parse(JSON.stringify(rawDeployments)).map((d: any) => ({ ...d, _id: String(d._id) }))
    } catch {
      // Supplementary data — page renders without it
    }
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

      {/* Sticky procurement CTA */}
      <StickyProcurementCTA
        waTenderQuote={waTenderQuote}
        waOemTeam={waOemTeam}
        phonePrimary={BUSINESS.phonePrimary}
        email={BUSINESS.email}
      />

      <main className="min-h-screen bg-white pt-16">

        {/* ── 1. Hero ───────────────────────────────────────────────────────────── */}
        <section className="bg-gray-950 py-10 md:py-16 overflow-hidden">
          <div className="container mx-auto px-4 md:px-6">
            <nav className="flex items-center gap-2 text-xs text-gray-600 mb-5">
              <Link href="/" className="hover:text-gray-400 transition-colors">Home</Link>
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="9 18 15 12 9 6" /></svg>
              <span className="text-gray-400">Government Procurement</span>
            </nav>

            <div className="grid md:grid-cols-[1fr_320px] lg:grid-cols-2 gap-8 md:gap-10 lg:gap-14 items-start">
              {/* LEFT: Content */}
              <div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {["IS 14855", "GeM Direct Purchase", "MSME OEM", "Tender Ready", "Pan-India Supply"].map(t => (
                    <span key={t} className="text-xs bg-white/[0.07] border border-white/[0.10] text-gray-300 px-2.5 py-1 rounded-full font-semibold">{t}</span>
                  ))}
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 leading-tight">
                  Government Procurement Ready Fogging Machines
                </h1>
                <p className="text-gray-500 text-xs mb-2">
                  100X Circle Pvt Ltd · MSME OEM Manufacturer · IS 14855 (Part 1) · ISO 9001:2015 · GeM Seller · IMT Manesar, Gurugram
                </p>
                <p className="text-gray-300 text-base md:text-lg mb-5 leading-relaxed">
                  India&apos;s MSME-registered OEM manufacturer of IS 14855-compliant thermal fogging machines —
                  supplying municipal corporations, health departments, and Panchayats via GeM direct purchase
                  and tenders. Full documentation pack, L1 quotations, and pan-India supply within 5–10 working days.
                </p>
                <div className="bg-brand-600/15 border border-brand-500/30 rounded-xl p-3.5 mb-5 text-sm text-brand-300">
                  <strong className="text-brand-200">GeM Direct Purchase Available:</strong> Government buyers can procure 100X Circle
                  fogging machines at gem.gov.in without a separate public tender within GeM financial limits.
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <a href={waTenderQuote} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-7 py-3.5 rounded-full text-sm transition-colors">
                    WhatsApp: Request Tender Quote
                  </a>
                  <a href="#gov-rfq-form"
                    className="inline-flex items-center justify-center gap-2 bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.10] text-white font-semibold px-7 py-3.5 rounded-full text-sm transition-colors">
                    Fill RFQ Form ↓
                  </a>
                </div>
              </div>

              {/* RIGHT: Procurement Intelligence Dashboard */}
              <div className="hidden md:block">
                <div className="glass-card rounded-2xl overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Procurement Intelligence</p>
                    <span className="flex items-center gap-1.5 text-[10px] text-brand-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-400 inline-block animate-pulse" />
                      Live
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-px bg-white/[0.04]">
                    {[
                      { label: "States Covered", value: "15+", sub: "Active government supply" },
                      { label: "Govt Orders", value: "500+", sub: "Fulfilled to date" },
                      { label: "Dispatch Time", value: "5–10", sub: "Working days from Gurugram" },
                      { label: "Tender Docs", value: "10", sub: "Ready to share instantly" },
                      { label: "IS Standard", value: "14855", sub: "Part 1 certified" },
                      { label: "Response SLA", value: "24h", sub: "L1 quotation turnaround" },
                    ].map((w, i) => (
                      <div key={i} className="bg-gray-900/60 px-4 py-4">
                        <p className="text-xl font-black text-white">{w.value}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mt-0.5">{w.label}</p>
                        <p className="text-[10px] text-gray-600 mt-0.5">{w.sub}</p>
                      </div>
                    ))}
                  </div>
                  <div className="px-5 py-3 bg-white/[0.02] flex flex-wrap items-center gap-3 text-[10px] text-gray-500">
                    {["IS 14855", "ISO 9001", "MSME", "GeM OEM"].map(c => (
                      <span key={c} className="flex items-center gap-1">
                        <svg className="w-2.5 h-2.5 text-brand-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}><polyline points="20 6 9 17 4 12"/></svg>
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
                {products[0]?.imageUrls?.[0] && (
                  <div className="relative mt-4 w-full">
                    <div className="absolute -inset-6 bg-brand-600/6 rounded-full blur-3xl pointer-events-none" />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={products[0].imageUrls[0]}
                      alt={products[0].name || "100X Circle Government Fogging Machine"}
                      className="relative w-full rounded-2xl shadow-2xl shadow-black/60 border border-white/[0.06]"
                    />
                    <div className="absolute top-3 right-3 bg-gray-900/80 backdrop-blur-sm border border-white/[0.12] rounded-xl px-3 py-2 text-center">
                      <p className="text-[10px] font-bold text-brand-400 uppercase tracking-widest">IS 14855</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">BIS Certified</p>
                    </div>
                    <div className="absolute bottom-3 left-3 bg-gray-900/80 backdrop-blur-sm border border-white/[0.12] rounded-xl px-3 py-2">
                      <p className="text-[10px] font-bold text-white">GeM OEM Seller</p>
                      <p className="text-[10px] text-brand-400 mt-0.5">gem.gov.in Verified</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── 2. KPI strip — dark section so glass-card and white text render correctly ── */}
        <section className="bg-gray-950 border-b border-white/[0.06] py-10 md:py-14">
          <div className="container mx-auto px-4 md:px-6">
            <GovKPIStrip kpis={govKpis} />
          </div>
        </section>

        {/* ── 2b. Institutional Product Catalogue (static-first, always visible) ── */}
        <section className="bg-gray-950 border-b border-white/[0.06] py-14 md:py-20">
          <div className="container mx-auto px-4 md:px-6">
            <GovInstitutionalProductCards products={products} />
          </div>
        </section>

        {/* ── 3. Procurement Readiness Score ───────────────────────────────────── */}
        <section className="py-14 md:py-20 bg-white border-b border-gray-100">
          <div className="container mx-auto px-4 md:px-6 max-w-5xl">
            <div className="mb-8">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Government Procurement Readiness</p>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Procurement Readiness Score</h2>
              <p className="text-gray-500 text-sm max-w-2xl">
                Every certification and credential that government tender evaluation committees check.
                100X Circle is fully compliant across all standard government procurement requirements.
              </p>
            </div>
            <ProcurementReadinessScore />
          </div>
        </section>

        {/* ── 4. Certifications strip ───────────────────────────────────────────── */}
        <section className="py-10 bg-gray-50 border-b border-gray-100">
          <div className="container mx-auto px-4 md:px-6">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4 text-center">Certifications &amp; Registrations</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 max-w-4xl mx-auto">
              {TRUST_CERTS.map(c => (
                <div key={c.label} className={`rounded-xl px-3 py-3 text-center border ${c.highlight ? "border-brand-200 bg-brand-50 shadow-sm" : "border-gray-200 bg-white"}`}>
                  <p className={`text-xs font-bold ${c.highlight ? "text-brand-700" : "text-gray-800"}`}>{c.label}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{c.sub}</p>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap justify-center gap-8 mt-8">
              {TRUST_STATS.map(s => (
                <div key={s.label} className="text-center">
                  <p className="text-2xl font-black text-gray-900">{s.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 5. Customer Logos ────────────────────────────────────────────────── */}
        {govLogos.length > 0 ? (
          <GovLogoWall
            logos={govLogos}
            eyebrow="Trusted By"
            heading="Organizations Served"
            subheading="Municipal corporations, health departments, and government institutions that have procured 100X Circle fogging machines across India."
          />
        ) : customerLogos.length > 0 ? (
          <section className="py-16 bg-gray-50 border-b border-gray-100">
            <div className="container mx-auto px-4 md:px-6">
              <p className="text-xs font-semibold text-brand-600 uppercase tracking-wide text-center mb-3">Trusted By</p>
              <h2 className="text-2xl font-bold text-gray-800 text-center mb-8">Government &amp; Public Health Institutions</h2>
              <GovPastPerformance customerLogos={customerLogos} />
            </div>
          </section>
        ) : null}

        {/* ── 6. Government Success Stories (CMS) ──────────────────────────────── */}
        {caseStudies.length > 0 && (
          <section className="py-16 md:py-20 bg-white border-b border-gray-100">
            <div className="container mx-auto px-4 md:px-6">
              <FeaturedCaseStudyCards
                studies={caseStudies}
                heading="Government Success Stories"
                maxVisible={9}
                showViewAll
              />
              <div className="mt-8 text-center">
                <Link href="/past-performance-government"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors">
                  View Full Past Performance Record
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="9 18 15 12 9 6" /></svg>
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Static verified case study */}
        <section className="py-14 bg-gray-50 border-b border-gray-100">
          <div className="container mx-auto px-4 md:px-6 max-w-4xl">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Verified Case Study</p>
            <h2 className="text-xl font-bold text-gray-900 mb-6">Government Procurement in Action</h2>
            <div className="border border-brand-200 rounded-2xl overflow-hidden">
              <div className="px-6 py-5 bg-brand-600">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🏛</span>
                  <div>
                    <span className="inline-block bg-white/20 text-white text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full mb-1">{CASE_STUDY.badge}</span>
                    <h3 className="text-white font-bold text-lg">{CASE_STUDY.title}</h3>
                  </div>
                </div>
              </div>
              <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-brand-100 bg-brand-50">
                <div className="px-5 py-5">
                  <p className="text-[10px] font-bold text-brand-700 uppercase tracking-wider mb-2">Challenge</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{CASE_STUDY.challenge}</p>
                </div>
                <div className="px-5 py-5">
                  <p className="text-[10px] font-bold text-brand-700 uppercase tracking-wider mb-2">Solution</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{CASE_STUDY.solution}</p>
                </div>
                <div className="px-5 py-5">
                  <p className="text-[10px] font-bold text-brand-700 uppercase tracking-wider mb-2">Outcome</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{CASE_STUDY.outcome}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Past Performance (CMS) */}
        {supplyRecords.length > 0 && (
          <section className="py-16 md:py-20 bg-white border-b border-gray-100">
            <div className="container mx-auto px-4 md:px-6">
              <p className="text-xs font-semibold text-brand-600 uppercase tracking-wide mb-4">Procurement Track Record</p>
              <FeaturedGovSupplies
                records={supplyRecords}
                maxVisible={9}
                heading="Recent Government Procurement Orders"
                subheading="A sample of IS 14855-compliant fogging machine orders fulfilled for government buyers across India."
                showViewAll
              />
            </div>
          </section>
        )}

        {/* Real World Deployments (CMS) */}
        {deployments.length > 0 && (
          <section className="py-16 md:py-20 bg-gray-50 border-b border-gray-100">
            <div className="container mx-auto px-4 md:px-6">
              <FeaturedDeployments deployments={deployments} heading="Real World Deployments" maxVisible={6} showViewAll />
            </div>
          </section>
        )}

        {/* ── 7. Institutional Buyer Types ─────────────────────────────────────── */}
        <section className="py-14 md:py-20 bg-white border-b border-gray-100">
          <div className="container mx-auto px-4 md:px-6 max-w-5xl">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Government Buyer Categories</p>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Institutional Buyers We Serve</h2>
            <p className="text-gray-500 text-sm mb-8 max-w-2xl">
              Every government buyer category has different procurement routes, unit requirements, and product preferences.
              Select your institution type to see the procurement path we recommend.
            </p>
            <InstitutionalBuyerTabs buyers={BUYER_TYPES} />
          </div>
        </section>

        {/* ── 8. Procurement Lifecycle Timeline ───────────────────────────────── */}
        <section className="py-14 md:py-20 bg-gray-50 border-b border-gray-100">
          <div className="container mx-auto px-4 md:px-6 max-w-3xl">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Procurement Process</p>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Government Procurement Lifecycle</h2>
            <p className="text-gray-500 text-sm mb-8">
              12 stages from requirement identification to post-supply support. Click any stage to expand.
            </p>
            <ProcurementLifecycleTimeline />
          </div>
        </section>

        {/* ── 9. Procurement Models ────────────────────────────────────────────── */}
        <section className="py-14 md:py-20 bg-white border-b border-gray-100">
          <div className="container mx-auto px-4 md:px-6 max-w-5xl">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">How to Buy</p>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">6 Government Procurement Routes</h2>
            <p className="text-gray-500 text-sm mb-8 max-w-2xl">
              Choose the procurement model that matches your institution&apos;s financial limits and tender requirements.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {PROCUREMENT_MODELS.map((m, i) => (
                <div key={i} className="border border-gray-200 rounded-xl p-5 bg-white hover:border-gray-300 hover:shadow-sm transition-all">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="text-2xl">{m.icon}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m.badgeColor}`}>{m.badge}</span>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2 text-sm">{m.title}</h3>
                  <p className="text-xs text-gray-600 mb-3 leading-relaxed">{m.desc}</p>
                  <div className="space-y-1 mb-3">
                    {m.steps.map((step, j) => (
                      <div key={j} className="flex items-center gap-2 text-xs text-gray-500">
                        <span className="w-4 h-4 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-[9px] font-bold flex-shrink-0">{j+1}</span>
                        {step}
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-400 border-t border-gray-100 pt-2">
                    <span className="font-medium">Timeline:</span> {m.speed}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 10. Geographic Coverage ──────────────────────────────────────────── */}
        <section className="py-14 bg-gray-50 border-b border-gray-100">
          <div className="container mx-auto px-4 md:px-6 max-w-4xl">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Geographic Coverage</p>
            <h2 className="text-xl font-semibold text-gray-800 mb-1">Recent Government Deployments</h2>
            <p className="text-sm text-gray-500 mb-6">
              Government supply coverage across municipal bodies, health departments, and local bodies.
              <span className="text-xs text-brand-600 font-medium ml-1">★ Verified</span> = confirmed case study.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {DEPLOYMENTS.map((d, i) => (
                <div key={i} className={`border rounded-xl p-4 ${d.verified ? "border-brand-200 bg-brand-50" : "border-gray-200 bg-white"}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="text-xs font-bold text-gray-800">{d.state}</span>
                      {d.verified && (
                        <span className="ml-2 text-[10px] text-brand-700 font-bold bg-brand-100 px-1.5 py-0.5 rounded-full">★ Verified</span>
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
          </div>
        </section>

        {/* ── 11. Product Catalogue (detailed cards) ───────────────────────────── */}
        {products.length > 0 && (
          <section className="py-14 md:py-20 bg-white border-b border-gray-100">
            <div className="container mx-auto px-4 md:px-6 max-w-5xl">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Detailed Specifications</p>
              <h2 className="text-xl font-semibold text-gray-800 mb-1">Government Procurement Product Specifications</h2>
              <p className="text-sm text-gray-500 mb-6">
                Full specifications, compliance certifications, and procurement routes for each model.
              </p>
              <Suspense fallback={<div className="h-40 bg-gray-50 rounded-xl animate-pulse" />}>
                <GovProductCarousel products={products} />
              </Suspense>
            </div>
          </section>
        )}

        {/* ── 12. Documentation Centre ─────────────────────────────────────────── */}
        <section className="py-14 md:py-20 bg-gray-50 border-b border-gray-100">
          <div className="container mx-auto px-4 md:px-6 max-w-5xl">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Documentation Ready</p>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Procurement Documentation Centre</h2>
            <p className="text-gray-500 text-sm mb-8 max-w-2xl">
              All documents required for government tender submissions are pre-prepared and shareable within 24 hours.
              Request via WhatsApp or email — we respond on the same business day.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
              {DOCUMENTATION_ITEMS.map((doc, i) => (
                <div key={i} className={`border rounded-xl p-4 flex items-start gap-3 ${(doc as any).highlight ? "border-brand-300 bg-brand-50 shadow-sm" : "border-gray-200 bg-white"}`}>
                  <span className="text-xl flex-shrink-0">{doc.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold leading-tight ${(doc as any).highlight ? "text-brand-800" : "text-gray-800"}`}>{doc.title}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">{doc.desc}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${(doc as any).highlight ? "bg-brand-100 text-brand-700" : "bg-gray-100 text-gray-500"}`}>{doc.category}</span>
                      <span className="text-[10px] text-gray-400">{doc.pages}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
              <a href={waTenderQuote} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-gray-900 text-white font-semibold px-6 py-3 rounded-xl text-sm hover:bg-gray-800 transition-colors">
                Request Full Documentation Pack
              </a>
              <a href={`mailto:${BUSINESS.email}?subject=Tender Documentation Request — Fogging Machines`}
                className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 font-medium px-6 py-3 rounded-xl text-sm hover:bg-gray-100 transition-colors">
                Email Documentation Request
              </a>
            </div>
          </div>
        </section>

        {/* ── 13. Primary CTA ───────────────────────────────────────────────────── */}
        <section className="py-10 bg-brand-600">
          <div className="container mx-auto px-4 md:px-6 max-w-4xl">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <div>
                <h2 className="font-bold text-xl text-white mb-1">Request Tender Quote</h2>
                <p className="text-brand-100 text-sm">
                  L1 quotation + full documentation pack within 24 hours · Qty · Area · State · Tender deadline
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                <a href={waTenderQuote} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 bg-white text-brand-700 font-semibold px-5 py-2.5 rounded-full text-sm hover:bg-brand-50 transition-colors">
                  WhatsApp: Request Tender Quote
                </a>
                <a href={`mailto:${BUSINESS.email}?subject=Government Fogging Machine Tender Enquiry`}
                  className="inline-flex items-center justify-center gap-2 border border-brand-300 text-white font-medium px-5 py-2.5 rounded-full text-sm hover:bg-brand-700 transition-colors">
                  Email Tender Enquiry
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ── Content sections ─────────────────────────────────────────────────── */}
        <div className="container mx-auto px-4 md:px-6 max-w-4xl py-12 space-y-12">

          {/* RFQ Form */}
          <div id="gov-rfq-form" className="border border-brand-200 rounded-xl p-6 bg-brand-50">
            <h2 className="font-bold text-xl text-brand-800 mb-1">Government / Institutional RFQ</h2>
            <p className="text-sm text-brand-700 mb-1">
              Structured form for procurement officers, municipal bodies, and health departments.
            </p>
            <p className="text-xs text-brand-600 mb-5">
              We respond within 24 hours with L1 quotation + complete tender documentation pack.
            </p>
            <GovRFQForm />
            <div className="flex justify-center mt-6">
              <CelebrityTrustBadge theme="light" />
            </div>
          </div>

          {/* GeM Steps */}
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">How to Procure on GeM</h2>
            <div className="space-y-4">
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
          </div>

          {/* Tender Pack Lead Capture */}
          <TenderPackLeadCapture />

          {/* Prose article */}
          <article className="prose prose-gray max-w-none">
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

          {/* States */}
          <div className="border border-gray-200 rounded-xl p-5">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">States Served — Government Supply</h2>
            <div className="flex flex-wrap gap-2">
              {STATES_SERVED.map(s => (
                <span key={s} className="text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full">{s}</span>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-3">Supply to all states. Above reflects documented government buyer distribution.</p>
          </div>

          {/* FAQ — 25 questions */}
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-1">FAQ — Government Procurement Officers</h2>
            <p className="text-sm text-gray-500 mb-5">
              Answers to the most common questions from procurement officers, municipal finance teams, and tender committees.
            </p>
            <div className="space-y-2">
              {EXPANDED_FAQ.map(({ q, a }) => (
                <details key={q} className="border border-gray-200 rounded-xl group">
                  <summary className="p-4 font-medium text-gray-800 cursor-pointer text-sm flex items-center justify-between gap-3 list-none [&::-webkit-details-marker]:hidden">
                    <span>{q}</span>
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0 transition-transform group-open:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><polyline points="6 9 12 15 18 9"/></svg>
                  </summary>
                  <p className="px-4 pb-4 text-sm text-gray-600 leading-relaxed">{a}</p>
                </details>
              ))}
            </div>
          </div>

          {/* Secondary CTA */}
          <div className="border border-brand-200 bg-brand-50 rounded-xl p-6">
            <h2 className="font-bold text-lg text-brand-800 mb-1">Talk to the OEM Team</h2>
            <p className="text-sm text-brand-700 mb-4">
              Rate contracts, large-volume pricing, delivery guarantees, pre-bid spec clarification —
              speak directly with our government sales team.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a href={waOemTeam} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 bg-brand-600 text-white font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-brand-700 transition-colors">
                WhatsApp OEM Team
              </a>
              <a href={`tel:${BUSINESS.phonePrimary}`}
                className="inline-flex items-center justify-center gap-2 border border-brand-300 text-brand-700 font-medium px-5 py-2.5 rounded-lg text-sm hover:bg-brand-100 transition-colors">
                {BUSINESS.phonePrimary}
              </a>
              <a href={`tel:${BUSINESS.phoneSecondary}`}
                className="inline-flex items-center justify-center gap-2 border border-brand-300 text-brand-700 font-medium px-5 py-2.5 rounded-lg text-sm hover:bg-brand-100 transition-colors">
                {BUSINESS.phoneSecondary}
              </a>
            </div>
          </div>

          {/* Related links */}
          <div className="border-t border-gray-200 pt-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Related Pages</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <Link href="/past-performance-government" className="border border-gray-200 rounded-lg p-4 hover:border-brand-400 transition-colors">
                <p className="font-medium text-gray-800 text-sm">Government Past Performance</p>
                <p className="text-xs text-gray-500 mt-1">Full supply register, case studies, and KPIs</p>
              </Link>
              <Link href="/gem-approved-fogging-machine-oem" className="border border-gray-200 rounded-lg p-4 hover:border-brand-400 transition-colors">
                <p className="font-medium text-gray-800 text-sm">Dealer Partnership Program</p>
                <p className="text-xs text-gray-500 mt-1">Become an authorized GeM supply partner</p>
              </Link>
              <Link href="/fogging-machine-for-nagar-panchayat" className="border border-gray-200 rounded-lg p-4 hover:border-brand-400 transition-colors">
                <p className="font-medium text-gray-800 text-sm">Fogging Machine for Nagar Panchayat</p>
                <p className="text-xs text-gray-500 mt-1">GeM direct purchase guide for small municipalities</p>
              </Link>
              <Link href="/knowledge/government-procurement-guide" className="border border-gray-200 rounded-lg p-4 hover:border-brand-400 transition-colors">
                <p className="font-medium text-gray-800 text-sm">Government Procurement Guide</p>
                <p className="text-xs text-gray-500 mt-1">How government bodies procure via GeM</p>
              </Link>
            </div>
          </div>

        </div>
      </main>
    </>
  )
}
