import type { Metadata } from "next"
import Link from "next/link"
import { SITE_URL, BUSINESS } from "@/lib/seo/site-config"

export const metadata: Metadata = {
  title: "Apply for 100X Circle Dealer Authorization | GeM Fogging Machine Reseller",
  description:
    "Apply to become an authorized 100X Circle dealer. GeM OEM authorization, IS 14855 documentation, and tender support provided. No fee. Respond within 1 working day.",
  keywords: [
    "100x circle dealer application",
    "fogging machine dealer apply",
    "GeM OEM authorization apply",
    "become fogging machine dealer application",
    "fogging machine reseller application India",
  ],
  alternates: { canonical: `${SITE_URL}/dealer-application` },
  robots: { index: true, follow: true },
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Apply for 100X Circle Dealer Authorization",
  description:
    "Application page for fogging machine dealers, GeM resellers, and pest control operators seeking authorized dealer status with 100X Circle Pvt Ltd.",
  url: `${SITE_URL}/dealer-application`,
  publisher: { "@id": `${SITE_URL}/#organization` },
}

// Pre-filled WhatsApp messages per dealer type
function waLink(msg: string) {
  return `https://wa.me/${BUSINESS.whatsappE164}?text=${encodeURIComponent(msg)}`
}

const DEALER_PATHS = [
  {
    id: "gem-seller",
    label: "I am a GeM Seller",
    icon: "🏛️",
    description: "Already registered on GeM, want to add fogging machines to my catalog",
    need: "OEM Authorization Code + Catalog Pairing",
    timeToActivate: "2–5 working days",
    message: `Hi 100X Circle,

I am a GeM seller and want to become an authorized reseller of your fogging machines on GeM.

My details:
- GeM Seller ID: [please fill]
- GST Number: [please fill]
- Business Name: [please fill]
- State(s) I operate in: [please fill]

Please share the OEM authorization process.`,
    cta: "Apply via WhatsApp — GeM Seller",
    color: "bg-blue-600 hover:bg-blue-700",
  },
  {
    id: "pco",
    label: "I am a Pest Control Operator",
    icon: "🐛",
    description: "Run a PCO business, want to add equipment sales and bid on government tenders",
    need: "Dealer Authorization + GeM OEM Code + Tender Support",
    timeToActivate: "3–5 working days",
    message: `Hi 100X Circle,

I run a pest control business and want to become an authorized dealer for your fogging machines.

My details:
- Business Name: [please fill]
- State(s) I operate in: [please fill]
- GST Number: [please fill]
- Are you on GeM? Yes/No: [please fill]
- Current client types: [municipalities / housing societies / industrial / other]

Interested in: Equipment sales revenue + GeM tender bidding`,
    cta: "Apply via WhatsApp — PCO",
    color: "bg-green-600 hover:bg-green-700",
  },
  {
    id: "agri-equipment",
    label: "I am an Agricultural Equipment Dealer",
    icon: "🌾",
    description: "Sell farm machinery, want to add fogging machines to product range",
    need: "Dealer Authorization + Product Catalog",
    timeToActivate: "2–3 working days",
    message: `Hi 100X Circle,

I am an agricultural equipment dealer and want to add your fogging machines to my product range.

My details:
- Business Name: [please fill]
- State(s) I operate in: [please fill]
- GST Number: [please fill]
- Current products I sell: [please fill]
- Are you on GeM? Yes/No: [please fill]`,
    cta: "Apply via WhatsApp — Agri Dealer",
    color: "bg-yellow-600 hover:bg-yellow-700",
  },
  {
    id: "govt-supplier",
    label: "I am a Government Supplier / Contractor",
    icon: "📋",
    description: "Respond to tenders and government RFQs, need OEM support for fogging machine bids",
    need: "OEM Authorization Letter + IS 14855 Docs + Tender Support",
    timeToActivate: "1–2 working days (urgent available)",
    message: `Hi 100X Circle,

I am a government supplier/contractor and need OEM authorization to bid on a fogging machine tender.

My details:
- Business Name: [please fill]
- GST Number: [please fill]
- Tender details (if active): [Tender number / issuing authority / deadline]
- Documents needed: OEM Authorization Letter / IS 14855 Compliance / ISO Certificate / Other

Please confirm availability for urgent documentation.`,
    cta: "Apply via WhatsApp — Tender Support",
    color: "bg-red-600 hover:bg-red-700",
  },
]

const WHAT_YOU_GET = [
  { title: "GeM OEM Authorization Code", desc: "Issued via GeM OEM panel. Pair the 100X Circle catalog to your seller account." },
  { title: "Signed OEM Authorization Letter", desc: "On 100X Circle letterhead. Valid for government tenders and GeM bid submissions." },
  { title: "IS 14855 (Part 1) Documentation", desc: "BIS compliance documentation — mandatory for most municipal and government tenders." },
  { title: "ISO 9001:2015 Certificate", desc: "Quality management certificate for inclusion in tender bids." },
  { title: "MSME/UDYAM Certificate", desc: "Enables MSME procurement preference — up to 25% bid advantage on GeM." },
  { title: "Technical Specification Sheets", desc: "Model-specific data sheets matching government tender BOQ parameters." },
  { title: "L1 Quotation Support", desc: "Competitive pricing guidance for GeM reverse auctions and tender price bids." },
  { title: "Spare Parts & After-Sales Backing", desc: "Genuine spares for all models. Strengthens your post-supply service commitment." },
]

const FAQS = [
  {
    q: "Is there a fee to become an authorized dealer?",
    a: "No. 100X Circle charges no fee for dealer authorization. No franchise fee, no security deposit. Your revenue comes from product margin.",
  },
  {
    q: "How quickly can I get authorization for an active tender?",
    a: "For active tenders with upcoming deadlines, contact us directly on WhatsApp (+91-7827229116) mentioning the tender deadline. We prioritize urgent requests and can often turn around documentation within 1 working day for existing or known dealers.",
  },
  {
    q: "Do I need to carry stock to be a dealer?",
    a: "No minimum stock is required. You can operate as an order-fulfillment dealer — accept orders from customers and government tenders, then purchase from 100X Circle for direct dispatch to the buyer. This is the most common model for GeM bidders.",
  },
  {
    q: "What states is authorization available for?",
    a: "Authorization is available pan-India. We have active dealers across UP, Bihar, Haryana, Delhi NCR, Maharashtra, Gujarat, Rajasthan, Punjab, and more. Contact us to discuss your target territory.",
  },
  {
    q: "Can I become a dealer if I am not on GeM?",
    a: "Yes. GeM registration is not required to become an authorized dealer. Many dealers serve direct institutional buyers (municipalities, industries, hospitals) without GeM. If you want to sell on GeM in the future, we can guide you through registration.",
  },
]

export default function DealerApplicationPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="max-w-3xl mx-auto px-4 py-16 pt-32">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-brand-600">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/become-a-dealer" className="hover:text-brand-600">Become a Dealer</Link>
          <span className="mx-2">/</span>
          <span>Apply</span>
        </nav>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Apply for 100X Circle Dealer Authorization
        </h1>
        <p className="text-gray-500 text-sm mb-8">
          Select your dealer type below. Your WhatsApp message will be pre-filled with the right information — just add your details and send.
        </p>

        {/* Dealer type selector */}
        <div className="space-y-4 mb-12">
          {DEALER_PATHS.map((path) => (
            <div key={path.id} className="border border-gray-200 rounded-2xl p-5">
              <div className="flex items-start gap-4">
                <span className="text-2xl flex-shrink-0 mt-0.5">{path.icon}</span>
                <div className="flex-1 min-w-0">
                  <h2 className="font-bold text-gray-900 mb-1">{path.label}</h2>
                  <p className="text-sm text-gray-600 mb-2">{path.description}</p>
                  <div className="flex flex-wrap gap-3 text-xs mb-4">
                    <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full">
                      You get: {path.need}
                    </span>
                    <span className="bg-green-50 text-green-700 px-2.5 py-1 rounded-full border border-green-100">
                      Ready in: {path.timeToActivate}
                    </span>
                  </div>
                  <a
                    href={waLink(path.message)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-2 ${path.color} text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors`}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    {path.cta}
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Alternative contact */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-10">
          <p className="font-semibold text-gray-800 mb-1">Prefer email or phone?</p>
          <p className="text-sm text-gray-600 mb-3">
            Send your business name, GST number, state, and dealer type to:
          </p>
          <div className="grid sm:grid-cols-2 gap-2 text-sm">
            <a href={`mailto:${BUSINESS.email}?subject=Dealer Authorization Application`} className="text-brand-600 font-medium hover:underline">
              {BUSINESS.email}
            </a>
            <a href={`tel:${BUSINESS.phonePrimary}`} className="text-brand-600 font-medium hover:underline">
              {BUSINESS.phonePrimary}
            </a>
          </div>
        </div>

        {/* What you get */}
        <h2 className="text-xl font-semibold text-gray-800 mb-4">What Authorized Dealers Receive</h2>
        <div className="grid sm:grid-cols-2 gap-3 mb-10">
          {WHAT_YOU_GET.map((item) => (
            <div key={item.title} className="flex gap-3 border border-gray-100 bg-gray-50 rounded-xl p-3">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-600 flex-shrink-0 mt-2" />
              <div>
                <p className="font-semibold text-gray-800 text-xs">{item.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Frequently Asked Questions</h2>
        <div className="space-y-3 mb-10">
          {FAQS.map(({ q, a }) => (
            <details key={q} className="border border-gray-200 rounded-xl">
              <summary className="p-4 font-medium text-gray-800 cursor-pointer text-sm">{q}</summary>
              <p className="px-4 pb-4 text-sm text-gray-600">{a}</p>
            </details>
          ))}
        </div>

        {/* Related */}
        <div className="border-t border-gray-200 pt-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Related</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Link href="/become-a-dealer" className="border border-gray-200 rounded-lg p-4 hover:border-brand-400 transition-colors">
              <p className="font-medium text-gray-800 text-sm">Dealer Program Details</p>
              <p className="text-xs text-gray-500 mt-1">Benefits, eligibility, and how it works</p>
            </Link>
            <Link href="/gem-oem-authorization" className="border border-gray-200 rounded-lg p-4 hover:border-brand-400 transition-colors">
              <p className="font-medium text-gray-800 text-sm">GeM OEM Authorization</p>
              <p className="text-xs text-gray-500 mt-1">How the GeM authorization code process works</p>
            </Link>
            <Link href="/gem-tender-support" className="border border-gray-200 rounded-lg p-4 hover:border-brand-400 transition-colors">
              <p className="font-medium text-gray-800 text-sm">Tender Documentation Support</p>
              <p className="text-xs text-gray-500 mt-1">Documents for active government tender bids</p>
            </Link>
            <Link href="/knowledge/gem-reseller-guide" className="border border-gray-200 rounded-lg p-4 hover:border-brand-400 transition-colors">
              <p className="font-medium text-gray-800 text-sm">GeM Reseller Guide</p>
              <p className="text-xs text-gray-500 mt-1">How to earn income selling on GeM</p>
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}
