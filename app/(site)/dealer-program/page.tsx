import type { Metadata } from "next"
import Link from "next/link"
import { CheckCircle2, MapPin, TrendingUp, Shield, Package, Phone, MessageCircle } from "lucide-react"
import { SITE_URL, BUSINESS, SITE_NAME } from "@/lib/seo/site-config"
import DealerApplicationForm from "./DealerApplicationForm"

// ─── SEO ──────────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Become a Fogging Machine Dealer | 100X Circle Dealer Program",
  description:
    "Join India's fastest-growing fogging machine dealer network. Earn 20–30% margins, get GeM OEM authorization support, and exclusive territory rights. Apply online — no fee.",
  keywords: [
    "fogging machine dealer India",
    "thermal fogging machine dealership",
    "fogging machine distributor program",
    "GeM fogging machine reseller",
    "pest control equipment dealer",
    "100x circle dealer",
    "fogging machine franchise India",
    "become fogging machine dealer",
  ],
  alternates: { canonical: `${SITE_URL}/dealer-program` },
  openGraph: {
    title: "Become a 100X Circle Dealer — Earn 20–30% Margins",
    description:
      "India's fastest-growing fogging machine brand is expanding its dealer network. Get territory rights, GeM OEM authorization, and factory pricing.",
    url: `${SITE_URL}/dealer-program`,
    type: "website",
  },
}

const jsonLdFaq = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is the investment required to become a 100X Circle dealer?",
      acceptedAnswer: { "@type": "Answer", text: "There is no franchise fee. You only invest in stock as needed — typically ₹2.5L–5L for the first order. Machines are supplied on confirmed purchase orders, so you don't need to hold large inventory." },
    },
    {
      "@type": "Question",
      name: "What margins do 100X Circle dealers earn?",
      acceptedAnswer: { "@type": "Answer", text: "Dealers typically earn 20–30% margin on fogging machine sales depending on volume and model. Government tender wins can add higher margins due to competitive pricing advantages." },
    },
    {
      "@type": "Question",
      name: "Do dealers get exclusive territory rights?",
      acceptedAnswer: { "@type": "Answer", text: "Yes, territory exclusivity is discussed on application. We limit active dealers per region to avoid channel conflict. Apply early to secure your preferred territory." },
    },
    {
      "@type": "Question",
      name: "What support does 100X Circle provide for GeM tenders?",
      acceptedAnswer: { "@type": "Answer", text: "We provide the OEM Reseller Code for GeM catalog pairing, a signed OEM Authorization Letter for tender submissions, IS 14855 compliance documents, GST invoices, and dispatch documents — everything you need to win and fulfill government orders." },
    },
    {
      "@type": "Question",
      name: "What training and support is provided to dealers?",
      acceptedAnswer: { "@type": "Answer", text: "All new dealers receive: product training (in-person or video), sales pitch materials, spec sheets, compliance certificates, and access to our support team. For active tender situations, we provide L1 pricing support and technical clarifications on request." },
    },
    {
      "@type": "Question",
      name: "How long does dealer onboarding take?",
      acceptedAnswer: { "@type": "Answer", text: "Initial call within 24 hours of application. Full onboarding — including GeM OEM code issuance and first price list — is typically completed within 5–7 working days." },
    },
  ],
}

const jsonLdBreadcrumb = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Dealer Program", item: `${SITE_URL}/dealer-program` },
  ],
}

// ─── Content data ─────────────────────────────────────────────────────────────

const TRUST_BADGES = [
  { value: "10,000+", label: "Machines sold" },
  { value: "50+",     label: "Active dealers" },
  { value: "28",      label: "States served" },
  { value: "15+",     label: "Years manufacturing" },
  { value: "GeM OEM", label: "Certified" },
  { value: "ISO 9001",label: ":2015 certified" },
]

const WHY_ITEMS = [
  {
    icon: <TrendingUp className="text-brand-600" size={22} />,
    title: "20–30% Dealer Margins",
    body: "Strong per-machine margins on both retail and government tender sales. Volume tiers unlock better pricing and higher net margins.",
  },
  {
    icon: <MapPin className="text-brand-600" size={22} />,
    title: "Exclusive Territory Rights",
    body: "We limit active dealers per district/state to protect your business. First-mover advantage in your geography — apply before your territory is taken.",
  },
  {
    icon: <Shield className="text-brand-600" size={22} />,
    title: "GeM OEM Authorization",
    body: "Get the GeM OEM Reseller Code and signed Authorization Letter within 5 days. Bid on government and municipal fogging machine tenders immediately.",
  },
  {
    icon: <Package className="text-brand-600" size={22} />,
    title: "Factory-Direct Supply",
    body: "Sourced directly from our Gurugram plant. Pan-India delivery in 5–10 working days. No middlemen, no stock-out surprises during active tenders.",
  },
  {
    icon: <CheckCircle2 className="text-brand-600" size={22} />,
    title: "Full Compliance Documentation",
    body: "ISO 9001:2015, MSME/UDYAM, IS 14855 (Part 1), CE Marking — all the certificates your government buyers will ask for, provided upfront.",
  },
  {
    icon: <Phone className="text-brand-600" size={22} />,
    title: "Dedicated Sales Support",
    body: "Account manager, L1 tender pricing support, technical clarifications, marketing materials, and product training — we're invested in your success.",
  },
]

const ECONOMICS = [
  { metric: "Dealer margin",      value: "20–30% per machine" },
  { metric: "First order (typical)", value: "₹2.5L – ₹5L" },
  { metric: "Revenue potential (Yr 1)", value: "₹5L – ₹25L" },
  { metric: "Government tender margin", value: "Up to 35%*" },
  { metric: "GeM OEM code issuance", value: "Within 5 working days" },
  { metric: "Dispatch lead time",  value: "5–10 working days" },
]

const TERRITORIES = [
  { region: "North India", states: "Delhi NCR, UP, Haryana, Punjab, Rajasthan", slots: "2 open" },
  { region: "East India",  states: "Bihar, Jharkhand, West Bengal, Odisha",     slots: "3 open" },
  { region: "Central India", states: "MP, Chhattisgarh",                        slots: "2 open" },
  { region: "South India", states: "Telangana, AP, Karnataka, TN, Kerala",      slots: "4 open" },
  { region: "West India",  states: "Maharashtra, Gujarat",                      slots: "2 open" },
  { region: "Northeast",   states: "Assam, Meghalaya, Manipur, Others",         slots: "5 open" },
]

const CASE_STUDIES = [
  {
    dealer: "Pest Control Dealer, Delhi NCR",
    result: "₹28L revenue in first 12 months",
    detail: "Won 4 municipal corporation tenders using 100X Circle's GeM OEM authorization and IS 14855 compliance documentation.",
  },
  {
    dealer: "Agricultural Equipment Supplier, Telangana",
    result: "15 government tenders won in 18 months",
    detail: "Expanded from 0 to ₹45L annual revenue by leveraging MSME OEM preference in state health department procurement.",
  },
]

const WA_DEALER_URL = `https://wa.me/${BUSINESS.whatsappE164}?text=${encodeURIComponent("Hi, I want to apply for a 100X Circle dealer partnership. Please share the dealer program details.")}`

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DealerProgramPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumb) }} />

      <div className="min-h-screen bg-white">

        {/* ── Hero ── */}
        <section className="bg-gray-950 pt-24 pb-16 md:pt-28 md:pb-20">
          <div className="container mx-auto px-4 max-w-5xl">
            <nav className="flex items-center gap-2 text-xs text-gray-500 mb-8">
              <Link href="/" className="hover:text-gray-300 transition-colors">Home</Link>
              <span>/</span>
              <span className="text-gray-400">Dealer Program</span>
            </nav>
            <div className="flex flex-wrap gap-2 mb-5">
              {["GeM OEM Approved", "ISO 9001:2015", "MSME Certified", "Pan-India Supply"].map(tag => (
                <span key={tag} className="text-xs bg-brand-900/60 text-brand-300 border border-brand-800 px-2.5 py-0.5 rounded-full">{tag}</span>
              ))}
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-5 leading-tight text-balance">
              Earn 20–30% Margins Selling{" "}
              <span className="text-brand-400">India&apos;s Fastest-Growing</span>{" "}
              Fogging Machine Brand
            </h1>
            <p className="text-gray-300 text-lg leading-relaxed max-w-2xl mb-8">
              Join the 100X Circle dealer network. Exclusive territory rights, GeM OEM authorization
              support, direct factory pricing, and full compliance documentation — everything you need
              to win government tenders and grow a profitable pest-control equipment business.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a href="#dealer-form"
                className="inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-semibold px-6 py-3 rounded-lg text-sm transition-colors">
                Apply for Dealership
              </a>
              <a href={WA_DEALER_URL} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 border border-gray-600 text-gray-200 hover:border-gray-400 hover:text-white font-medium px-6 py-3 rounded-lg text-sm transition-colors">
                <MessageCircle size={16} />
                WhatsApp Us
              </a>
            </div>
          </div>
        </section>

        {/* ── Trust Badges ── */}
        <section className="bg-gray-50 border-b border-gray-200 py-6">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="flex flex-wrap justify-center gap-x-8 gap-y-4">
              {TRUST_BADGES.map(b => (
                <div key={b.value} className="text-center">
                  <div className="text-xl font-bold text-gray-900">{b.value}</div>
                  <div className="text-xs text-gray-500">{b.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Why become a dealer ── */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4 max-w-5xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-600 mb-2">Why partner with us</p>
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-10 text-balance">
              Everything you need to run a profitable fogging machine business
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {WHY_ITEMS.map(item => (
                <div key={item.title} className="border border-gray-200 rounded-xl p-5">
                  <div className="mb-3">{item.icon}</div>
                  <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Dealer Economics ── */}
        <section className="py-12 bg-brand-50 border-y border-brand-100">
          <div className="container mx-auto px-4 max-w-5xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-600 mb-2">Dealer economics</p>
            <h2 className="text-2xl font-bold text-gray-900 mb-8">What you can earn</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {ECONOMICS.map(e => (
                <div key={e.metric} className="bg-white border border-brand-100 rounded-xl p-5">
                  <div className="text-xs text-gray-500 mb-1">{e.metric}</div>
                  <div className="text-base font-bold text-gray-900">{e.value}</div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 mt-4">*Government tender margins depend on L1 bid strategy. Discuss with your account manager.</p>
          </div>
        </section>

        {/* ── GeM & OEM Support ── */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="grid md:grid-cols-2 gap-10 items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-brand-600 mb-2">GeM + Government support</p>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 text-balance">
                  Win government tenders with our full OEM support
                </h2>
                <p className="text-gray-600 leading-relaxed mb-6">
                  100X Circle is a GeM-approved OEM manufacturer. As our authorized dealer, you get
                  everything needed to bid on and win government fogging machine tenders across India.
                </p>
                <ul className="space-y-3">
                  {[
                    "GeM OEM Reseller Code — issued within 5 working days",
                    "Signed OEM Authorization Letter on company letterhead",
                    "IS 14855 (Part 1) compliance documentation",
                    "ISO 9001:2015 quality management certificate",
                    "MSME/UDYAM registration certificate",
                    "L1 pricing support for active tenders",
                  ].map(item => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-gray-700">
                      <CheckCircle2 size={16} className="text-brand-600 mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-gray-950 rounded-2xl p-8 text-white">
                <p className="text-brand-400 text-sm font-semibold mb-3">MSME procurement advantage</p>
                <p className="text-3xl font-bold mb-2">25%</p>
                <p className="text-gray-300 text-sm leading-relaxed mb-6">
                  The Government of India mandates 25% of central procurement from MSME sellers.
                  As a 100X Circle dealer (MSME OEM), your bids qualify for MSME preference —
                  significantly improving your win rate.
                </p>
                <a href={WA_DEALER_URL} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors">
                  <MessageCircle size={16} />
                  Ask about GeM support
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ── Open Territories ── */}
        <section className="py-12 bg-gray-50 border-y border-gray-200">
          <div className="container mx-auto px-4 max-w-5xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-600 mb-2">Territory opportunities</p>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Open territories across India</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {TERRITORIES.map(t => (
                <div key={t.region} className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-800 text-sm">{t.region}</h3>
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full px-2 py-0.5 font-medium">{t.slots}</span>
                  </div>
                  <p className="text-xs text-gray-500">{t.states}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-4">Territory allocation is on a first-come, first-served basis. Apply early to secure your region.</p>
          </div>
        </section>

        {/* ── Case Studies ── */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4 max-w-5xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-600 mb-2">Dealer success stories</p>
            <h2 className="text-2xl font-bold text-gray-900 mb-8">Dealers who are already winning</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {CASE_STUDIES.map(cs => (
                <div key={cs.dealer} className="border border-gray-200 rounded-xl p-6">
                  <div className="text-xl font-bold text-brand-600 mb-2">{cs.result}</div>
                  <p className="text-sm text-gray-600 mb-3">{cs.detail}</p>
                  <p className="text-xs font-medium text-gray-400">{cs.dealer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Application Form ── */}
        <section id="dealer-form" className="py-16 md:py-20 bg-gray-50 border-t border-gray-200">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="grid md:grid-cols-2 gap-10 items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-brand-600 mb-2">Apply now</p>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 text-balance">
                  Join the 100X Circle dealer network
                </h2>
                <p className="text-gray-600 leading-relaxed mb-6">
                  Fill the form and our team will call within 24 hours to discuss your territory,
                  margins, and first order. No fee. No commitment.
                </p>
                <ul className="space-y-2.5">
                  {[
                    "Call within 24 hours of application",
                    "Territory proposal sent within 48 hours",
                    "GeM OEM code issued within 5 working days",
                    "First price list shared immediately",
                    "No franchise fee or joining cost",
                  ].map(item => (
                    <li key={item} className="flex items-center gap-2.5 text-sm text-gray-700">
                      <CheckCircle2 size={14} className="text-brand-600 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-3">Prefer to reach us directly?</p>
                  <a href={WA_DEALER_URL} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors">
                    <MessageCircle size={16} />
                    WhatsApp: +91-7827229116
                  </a>
                </div>
              </div>
              <DealerApplicationForm />
            </div>
          </div>
        </section>

        {/* ── RFQ CTA ── */}
        <section className="py-10 bg-brand-600">
          <div className="container mx-auto px-4 max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-white font-bold text-lg">Need a price quote for a specific fogging machine?</p>
              <p className="text-brand-100 text-sm">Get a detailed quotation with specs, GST invoice, and delivery timeline.</p>
            </div>
            <Link href="/contact-us"
              className="shrink-0 inline-flex items-center gap-2 bg-white text-brand-700 font-semibold px-6 py-3 rounded-lg text-sm hover:bg-brand-50 transition-colors">
              Request a Quote
            </Link>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="py-16 md:py-20">
          <div className="container mx-auto px-4 max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-600 mb-2">Common questions</p>
            <h2 className="text-2xl font-bold text-gray-900 mb-8">Frequently asked questions</h2>
            <div className="space-y-4">
              {jsonLdFaq.mainEntity.map(({ name, acceptedAnswer }) => (
                <details key={name} className="border border-gray-200 rounded-xl group">
                  <summary className="p-5 font-medium text-gray-800 cursor-pointer text-sm list-none flex justify-between items-center">
                    {name}
                    <span className="text-gray-400 group-open:rotate-45 transition-transform ml-4 shrink-0 text-lg leading-none">+</span>
                  </summary>
                  <p className="px-5 pb-5 text-sm text-gray-600 leading-relaxed">{acceptedAnswer.text}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── Bottom CTA ── */}
        <section className="py-12 bg-gray-950 border-t border-gray-800">
          <div className="container mx-auto px-4 max-w-5xl text-center">
            <h2 className="text-2xl font-bold text-white mb-3">Ready to start your {SITE_NAME} dealership?</h2>
            <p className="text-gray-400 mb-6 text-sm">Limited slots per territory. Apply now — response within 24 hours.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a href="#dealer-form"
                className="inline-flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-semibold px-6 py-3 rounded-lg text-sm transition-colors">
                Apply for Dealership
              </a>
              <a href={WA_DEALER_URL} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 border border-gray-600 text-gray-200 hover:border-gray-400 font-medium px-6 py-3 rounded-lg text-sm transition-colors">
                <MessageCircle size={16} />
                WhatsApp us
              </a>
            </div>
          </div>
        </section>

      </div>
    </>
  )
}
