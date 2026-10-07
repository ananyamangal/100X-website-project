import type { Metadata } from "next"
import Link from "next/link"
import { SITE_URL, BUSINESS } from "@/lib/seo/site-config"

export const metadata: Metadata = {
  title: "Dealers & Government Resources — 100X Circle Fogging Machine OEM",
  description:
    "Complete resource hub for fogging machine dealers, GeM resellers, and government procurement officers. GeM authorization, IS 14855 documentation, tender support, and dealer onboarding.",
  alternates: { canonical: `${SITE_URL}/dealers-and-government` },
}

const DEALER_PAGES = [
  { href: "/become-a-dealer", title: "Become an Authorized Dealer", desc: "Dealer program, benefits, and how to apply", tag: "Dealer" },
  { href: "/dealer-application", title: "Apply for Authorization", desc: "Pre-filled WhatsApp application by dealer type", tag: "Apply" },
  { href: "/gem-oem-authorization", title: "GeM OEM Authorization", desc: "OEM authorization codes and letters for GeM resellers", tag: "GeM" },
  { href: "/gem-tender-support", title: "Tender Documentation", desc: "IS 14855, OEM letters, ISO certs for active bids", tag: "Tender" },
  { href: "/gem-reverse-auction-fogging", title: "GeM Reverse Auction Guide", desc: "L1 bidding strategy and RA win tactics", tag: "GeM RA" },
  { href: "/knowledge/gem-reseller-guide", title: "GeM Reseller Guide", desc: "How to earn income selling fogging machines on GeM", tag: "Guide" },
  { href: "/knowledge/gem-oem-authorization-process", title: "OEM Authorization Process", desc: "How the GeM authorization code process works", tag: "Guide" },
  { href: "/knowledge/fogging-machine-for-pest-control-business", title: "PCO Dealer Guide", desc: "PCOs adding equipment sales to service revenue", tag: "PCO" },
]

const GOVT_PAGES = [
  { href: "/municipal-fogging-programme", title: "Municipal Fogging Programme", desc: "Equipment for Nagar Nigams, Nagar Panchayats, and corporations", tag: "Municipal" },
  { href: "/fogging-machine-for-nagar-panchayat", title: "Nagar Panchayat Fogging Machine", desc: "GeM direct purchase for small municipalities", tag: "Panchayat" },
  { href: "/is-14855-fogging-machine", title: "IS 14855 Fogging Machines", desc: "BIS standard compliance and tender documentation", tag: "IS 14855" },
  { href: "/gem-tender-support", title: "Tender Support", desc: "Full documentation package for government tender bids", tag: "Tender" },
  { href: "/public-health-equipment", title: "Public Health Equipment", desc: "For NVBDCP, NHM, and health department procurement", tag: "Health" },
  { href: "/nvbdcp-fogging-machine", title: "NVBDCP Fogging Machine", desc: "National vector control programme equipment", tag: "NVBDCP" },
  { href: "/nhm-fogging-machine", title: "NHM Fogging Machine", desc: "National Health Mission procurement guide", tag: "NHM" },
  { href: "/vector-control-equipment", title: "Vector Control Equipment", desc: "By disease vector — dengue, malaria, chikungunya", tag: "Vector" },
  { href: "/make-in-india-fogging-machine", title: "Make in India Fogging Machine", desc: "MSME OEM — Atmanirbhar Bharat procurement preference", tag: "Make in India" },
  { href: "/knowledge/government-procurement-guide", title: "GeM Procurement Guide", desc: "Step-by-step GeM buying for government bodies", tag: "Guide" },
]

const CONTACT_PATHS = [
  { type: "GeM Seller", message: "I am a GeM seller and want OEM authorization for fogging machines. My GeM ID:" },
  { type: "Pest Control Operator", message: "I run a pest control business and want to become an authorized dealer. My state:" },
  { type: "Government Buyer", message: "I am from a municipal body / health department and need fogging machines. Please share GeM listing:" },
  { type: "Active Tender", message: "I have an active tender for fogging machines and need OEM documentation. Tender ref:" },
]

export default function DealersAndGovernmentPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-16 pt-32">
      <nav className="text-sm text-gray-500 mb-6">
        <Link href="/" className="hover:text-brand-600">Home</Link>
        <span className="mx-2">/</span>
        <span>Dealers &amp; Government</span>
      </nav>

      <h1 className="text-3xl font-bold text-gray-900 mb-3">
        Dealers &amp; Government Resources
      </h1>
      <p className="text-gray-600 text-lg mb-10 leading-relaxed">
        Everything for fogging machine dealers, GeM resellers, and government procurement
        officers — from OEM authorization to IS 14855 documentation to tender support.
      </p>

      {/* Quick contact by type */}
      <div className="bg-brand-600 rounded-2xl p-6 mb-12 text-white">
        <h2 className="font-bold text-xl mb-4">Quick Contact — Pick Your Situation</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {CONTACT_PATHS.map((p) => (
            <a
              key={p.type}
              href={`https://wa.me/${BUSINESS.whatsappE164}?text=${encodeURIComponent(p.message)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl p-3 transition-colors text-sm"
            >
              <span className="font-semibold block">{p.type}</span>
              <span className="text-brand-200 text-xs">Click to open pre-filled WhatsApp →</span>
            </a>
          ))}
        </div>
      </div>

      {/* Dealer Resources */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-1 h-7 bg-brand-600 rounded-full" />
          <h2 className="text-xl font-bold text-gray-900">For Dealers &amp; Resellers</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {DEALER_PAGES.map((p) => (
            <Link key={p.href} href={p.href}
              className="border border-gray-200 rounded-xl p-4 hover:border-brand-400 hover:shadow-sm transition-all group">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-gray-800 text-sm group-hover:text-brand-700 transition-colors">{p.title}</p>
                <span className="text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full flex-shrink-0">{p.tag}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{p.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Government Resources */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-1 h-7 bg-green-600 rounded-full" />
          <h2 className="text-xl font-bold text-gray-900">For Government Buyers</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {GOVT_PAGES.map((p) => (
            <Link key={p.href} href={p.href}
              className="border border-gray-200 rounded-xl p-4 hover:border-green-400 hover:shadow-sm transition-all group">
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-gray-800 text-sm group-hover:text-green-700 transition-colors">{p.title}</p>
                <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full flex-shrink-0">{p.tag}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">{p.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Direct contact */}
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6">
        <h2 className="font-bold text-gray-800 mb-2">Direct Contact</h2>
        <p className="text-sm text-gray-600 mb-4">
          Not sure which page applies to you? Contact us directly — we respond within 1 working day.
        </p>
        <div className="grid sm:grid-cols-3 gap-3 text-sm">
          <a href={`https://wa.me/${BUSINESS.whatsappE164}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 bg-green-600 text-white font-semibold px-4 py-2.5 rounded-lg justify-center">
            WhatsApp
          </a>
          <a href={`tel:${BUSINESS.phonePrimary}`}
            className="flex items-center gap-2 border border-gray-300 text-gray-700 font-medium px-4 py-2.5 rounded-lg justify-center">
            {BUSINESS.phonePrimary}
          </a>
          <a href={`mailto:${BUSINESS.email}`}
            className="flex items-center gap-2 border border-gray-300 text-gray-700 font-medium px-4 py-2.5 rounded-lg justify-center">
            Email
          </a>
        </div>
      </div>
    </main>
  )
}
