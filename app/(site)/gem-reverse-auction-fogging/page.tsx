import type { Metadata } from "next"
import Link from "next/link"
import { SITE_URL, BUSINESS } from "@/lib/seo/site-config"

export const revalidate = 60

export const metadata: Metadata = {
  title: "GeM Reverse Auction Fogging Machine — Bidding Guide for Dealers | 100X Circle",
  description:
    "Complete guide for GeM reverse auction (RA) bidding for fogging machines. Price strategy, L1 bidding, OEM support, IS 14855 documentation. 100X Circle MSME OEM provides full RA support to authorized dealers.",
  keywords: [
    "GeM reverse auction fogging machine",
    "GeM RA fogging machine bidding",
    "GeM bid fogging machine India",
    "L1 bidding fogging machine GeM",
    "GeM reverse auction dealer fogging",
    "fogging machine GeM bid support",
    "GeM RA fogging machine strategy",
  ],
  alternates: { canonical: `${SITE_URL}/gem-reverse-auction-fogging` },
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "GeM Reverse Auction for Fogging Machines: Complete Dealer Bidding Guide",
  description:
    "How authorized dealers win GeM reverse auctions for fogging machines — L1 pricing strategy, documentation, OEM support, and bid qualification tips.",
  url: `${SITE_URL}/gem-reverse-auction-fogging`,
  author: { "@type": "Organization", name: "100X Circle Pvt Ltd", url: SITE_URL },
  publisher: { "@id": `${SITE_URL}/#organization` },
  datePublished: "2026-06-04",
}

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is a GeM reverse auction for fogging machines?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A GeM reverse auction (RA) is a competitive bidding process where government buyers invite sellers to bid the lowest price for fogging machines. Unlike direct purchase, RA is used for larger orders above the direct purchase threshold. Sellers submit opening bids and then progressively lower their prices during the auction window. The lowest qualified L1 bidder typically wins the order.",
      },
    },
    {
      "@type": "Question",
      name: "Can authorized dealers bid in GeM reverse auctions for fogging machines?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. GeM-authorized resellers of fogging machine OEMs can participate in reverse auctions. To bid, you need: (1) active GeM seller registration, (2) OEM authorization code paired to your seller account, (3) OEM authorization letter for bid submission, (4) IS 14855 compliance documentation, and (5) competitive pricing from the OEM. 100X Circle provides all this to authorized dealers.",
      },
    },
    {
      "@type": "Question",
      name: "How do I get L1 pricing from 100X Circle for a GeM reverse auction?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Contact 100X Circle before submitting your opening bid. Share the tender/RA reference number, quantity, delivery state, and your GeM seller ID. We discuss your target bid price and confirm it is achievable while maintaining your margin. WhatsApp: +91-7827229116 or email: 100xcircle@gmail.com.",
      },
    },
  ],
}

const RA_STEPS = [
  { num: 1, title: "Identify active fogging machine RAs", body: "Monitor bidplus.gem.gov.in daily. Filter by product category 'Fogging Machine (V2) as per IS 14855 Part 1'. Set alerts for your target states. Check for RA notices during peak season (May–October)." },
  { num: 2, title: "Verify eligibility before bidding", body: "Confirm: your GeM account has 100X Circle OEM authorization code paired. You have OEM authorization letter valid for this RA. Your seller profile is complete and compliant. Any MSME preference flag is active." },
  { num: 3, title: "Contact 100X Circle for L1 pricing", body: "Before placing your opening bid, contact +91-7827229116 with the RA reference. We confirm pricing that lets you bid L1 while maintaining margin. Don't overbid on your opening — you can lower later in the RA." },
  { num: 4, title: "Prepare bid documentation", body: "Assemble: OEM authorization letter (from 100X Circle), IS 14855 compliance docs, ISO 9001:2015 certificate, MSME/UDYAM certificate, technical spec sheets matching the RA BOQ, GST registration." },
  { num: 5, title: "Submit opening bid and monitor", body: "Submit your opening bid within the RA window. Monitor competitor bids. Lower your bid progressively if needed — GeM RA usually runs for 2–4 hours. Be present during the active RA window." },
  { num: 6, title: "Win and fulfil the order", body: "On RA win, receive government purchase order via GeM. Place purchase order with 100X Circle. We dispatch within 5–10 working days. Provide GST invoice and delivery documentation to government buyer." },
]

export default function GemReverseAuctionFoggingPage() {
  const waLink = `https://wa.me/${BUSINESS.whatsappE164}?text=${encodeURIComponent("Hi, I am bidding in a GeM reverse auction for fogging machines. RA reference: [fill]. Please help with L1 pricing and documentation.")}`

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <main className="max-w-3xl mx-auto px-4 py-16 pt-32">
        <nav className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-brand-600">Home</Link>
          <span className="mx-2">/</span>
          <span>GeM Reverse Auction — Fogging Machines</span>
        </nav>

        <div className="flex flex-wrap gap-2 mb-4">
          {["GeM Reverse Auction", "L1 Bidding", "Dealer Guide", "OEM Support"].map((t) => (
            <span key={t} className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">{t}</span>
          ))}
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          GeM Reverse Auction for Fogging Machines — Complete Dealer Bidding Guide
        </h1>
        <p className="text-gray-500 text-sm mb-8">
          By 100X Circle Pvt Ltd · GeM-Listed MSME OEM · 7 min read · Updated June 2026
        </p>

        <div className="bg-brand-50 border border-brand-200 rounded-xl p-5 mb-8 text-sm text-gray-700">
          <strong>Active RA?</strong> Contact us immediately with your RA reference number for
          L1 pricing support and documentation. WhatsApp{" "}
          <a href={`tel:${BUSINESS.phonePrimary}`} className="text-brand-600 font-medium">{BUSINESS.phonePrimary}</a>
          {" "}for same-day response.
        </div>

        <article className="prose prose-gray max-w-none">
          <h2>What Is a GeM Reverse Auction for Fogging Machines?</h2>
          <p>
            When a government buyer needs to procure fogging machines above the GeM direct
            purchase threshold, they initiate a Reverse Auction (RA) or Bid on the GeM
            platform. In an RA, registered sellers compete by progressively lowering their
            price. The lowest qualified L1 bidder wins the purchase order.
          </p>
          <p>
            Fogging machine RAs are common during May–October (mosquito season) when
            municipalities and health departments execute annual procurement budgets. A single
            RA can be for 10–200+ machines — representing ₹5 lakh to ₹1 crore+ in order value.
          </p>

          <h2>Who Can Bid in GeM Fogging Machine RAs?</h2>
          <ul>
            <li>GeM-registered OEMs (manufacturers like 100X Circle)</li>
            <li>GeM-registered authorized resellers (dealers with OEM authorization code)</li>
          </ul>
          <p>
            Unauthorized sellers cannot bid on category-restricted RAs. If you have 100X
            Circle&apos;s OEM authorization code paired to your GeM account, you qualify as
            an authorized reseller for all 100X Circle model RAs.
          </p>

          <h2>Why Indian MSME OEM Authorization Wins RAs</h2>
          <ul>
            <li>
              <strong>Price advantage:</strong> 100X Circle machines cost 3–5× less than
              Korean/German imports — you can bid L1 and still earn margin
            </li>
            <li>
              <strong>MSME preference:</strong> In MSME-preference RAs, non-MSME bidders may
              be disqualified or have their bids adjusted unfavourably
            </li>
            <li>
              <strong>IS 14855 documentation:</strong> Complete BIS compliance docs ensure
              your bid isn&apos;t disqualified on technical grounds
            </li>
            <li>
              <strong>Delivery reliability:</strong> 5–10 working day dispatch — government
              buyers value suppliers who meet delivery timelines
            </li>
          </ul>
        </article>

        {/* Steps */}
        <h2 className="text-xl font-semibold text-gray-800 mb-4 mt-8">How to Win a GeM Fogging Machine RA</h2>
        <div className="space-y-4 mb-10">
          {RA_STEPS.map((s) => (
            <div key={s.num} className="flex gap-4 border border-gray-200 rounded-xl p-5">
              <div className="flex-shrink-0 w-8 h-8 bg-brand-600 text-white rounded-full flex items-center justify-center text-sm font-bold">{s.num}</div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-1">{s.title}</h3>
                <p className="text-sm text-gray-600">{s.body}</p>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ inline */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Frequently Asked Questions</h2>
          <div className="space-y-3">
            {[
              { q: "How long does a GeM fogging machine RA run?", a: "Most GeM reverse auctions run for 2–4 hours during business hours. You must be present and monitoring during the RA window to respond to competitor bids. Set calendar reminders and ensure you have the 100X Circle pricing floor confirmed before the RA starts." },
              { q: "What if I win an RA but 100X Circle doesn't have stock?", a: "Always confirm stock availability with 100X Circle before submitting your opening bid. We maintain inventory of standard models. For large orders (50+ units), discuss stock and production timeline before the RA. We can reserve stock for active RA participants." },
              { q: "Can I bid in multiple state RAs simultaneously?", a: "Yes. As an authorized reseller, you can bid in RAs across all states. Ensure your delivery commitment in each RA bid is realistic — 100X Circle dispatches pan-India from Gurugram within 5–10 working days for in-stock models." },
            ].map(({ q, a }) => (
              <details key={q} className="border border-gray-200 rounded-xl">
                <summary className="p-4 font-medium text-gray-800 cursor-pointer text-sm">{q}</summary>
                <p className="px-4 pb-4 text-sm text-gray-600">{a}</p>
              </details>
            ))}
          </div>
        </div>

        <div className="bg-brand-50 border border-brand-200 rounded-xl p-6 mb-8">
          <h2 className="font-semibold text-brand-800 mb-2">Get OEM Authorization to Start Bidding</h2>
          <p className="text-sm text-brand-700 mb-4">Contact 100X Circle to get your GeM OEM authorization code and full RA support package.</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/gem-oem-authorization" className="inline-flex items-center justify-center bg-brand-600 text-white font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-brand-700 transition-colors">
              Apply for GeM Authorization →
            </Link>
            <a href={waLink} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center justify-center border border-brand-300 text-brand-700 font-medium px-5 py-2.5 rounded-lg text-sm hover:bg-brand-100 transition-colors">
              Active RA? WhatsApp Now
            </a>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-8">
          <div className="grid sm:grid-cols-2 gap-4">
            <Link href="/gem-oem-authorization" className="border border-gray-200 rounded-lg p-4 hover:border-brand-400 transition-colors">
              <p className="font-medium text-gray-800 text-sm">GeM OEM Authorization</p>
              <p className="text-xs text-gray-500 mt-1">Get authorized to bid on GeM RAs</p>
            </Link>
            <Link href="/gem-tender-support" className="border border-gray-200 rounded-lg p-4 hover:border-brand-400 transition-colors">
              <p className="font-medium text-gray-800 text-sm">Tender Documentation Support</p>
              <p className="text-xs text-gray-500 mt-1">Full documentation for bids and RAs</p>
            </Link>
            <Link href="/knowledge/gem-reseller-guide" className="border border-gray-200 rounded-lg p-4 hover:border-brand-400 transition-colors">
              <p className="font-medium text-gray-800 text-sm">GeM Reseller Guide</p>
              <p className="text-xs text-gray-500 mt-1">Complete guide to selling on GeM</p>
            </Link>
            <Link href="/dealer-application" className="border border-gray-200 rounded-lg p-4 hover:border-brand-400 transition-colors">
              <p className="font-medium text-gray-800 text-sm">Apply for Dealership</p>
              <p className="text-xs text-gray-500 mt-1">Become an authorized 100X Circle dealer</p>
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}
