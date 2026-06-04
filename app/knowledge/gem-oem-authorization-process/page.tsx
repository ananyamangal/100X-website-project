import type { Metadata } from "next"
import Link from "next/link"
import { SITE_URL } from "@/lib/seo/site-config"

export const metadata: Metadata = {
  title: "GeM OEM Authorization Process for Resellers: Complete Guide | 100X Circle",
  description:
    "Complete guide to GeM OEM authorization for fogging machine resellers — what it is, why you need it, how to get it, and what documents are required. From India's GeM-listed fogging machine OEM.",
  keywords: [
    "GeM OEM authorization process",
    "GeM OEM authorization code",
    "GeM reseller authorization guide",
    "how to get OEM authorization GeM",
    "GeM OEM panel fogging machine",
    "OEM authorization letter India",
    "GeM reseller fogging machine",
    "GeM dealer authorization certificate",
  ],
  alternates: { canonical: `${SITE_URL}/knowledge/gem-oem-authorization-process` },
  openGraph: {
    title: "GeM OEM Authorization Process: Complete Guide for Fogging Machine Resellers",
    description:
      "Understand GeM OEM authorization — codes, letters, panel registration, and the full process for fogging machine resellers in India.",
    url: `${SITE_URL}/knowledge/gem-oem-authorization-process`,
    type: "article",
  },
}

const jsonLdArticle = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "GeM OEM Authorization Process for Fogging Machine Resellers: Complete Guide",
  description:
    "Complete guide explaining GeM OEM authorization — what it is, the difference between OEM and reseller on GeM, how the authorization code process works, and what documents are required.",
  url: `${SITE_URL}/knowledge/gem-oem-authorization-process`,
  author: { "@type": "Organization", name: "100X Circle Pvt Ltd", url: SITE_URL },
  publisher: { "@id": `${SITE_URL}/#organization` },
  datePublished: "2026-06-04",
  dateModified: "2026-06-04",
  about: [
    { "@type": "Thing", name: "GeM OEM Authorization" },
    { "@type": "Thing", name: "Government e-Marketplace" },
    { "@type": "Thing", name: "Fogging Machine Reseller" },
  ],
}

const jsonLdFaq = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is an OEM authorization code on GeM?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "An OEM authorization code on GeM is a unique code issued by a registered OEM (manufacturer) to an approved reseller through the GeM OEM Panel. Once you enter this code in your GeM reseller account, it pairs the OEM's product catalog with your seller profile, allowing you to list and sell those products on GeM.",
      },
    },
    {
      "@type": "Question",
      name: "What is the difference between an OEM and a reseller on GeM?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "On GeM, an OEM is the original manufacturer who creates and owns the product listing. A reseller is a registered GeM seller who has been authorized by the OEM to sell the OEM's products on their behalf. OEMs control which resellers are authorized, and can grant or revoke authorization through the GeM OEM panel.",
      },
    },
    {
      "@type": "Question",
      name: "Can I bid on government tenders for fogging machines without OEM authorization?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "It depends on the tender type. For GeM direct purchase categories, you may need to be listed as an OEM or authorized reseller. For open tenders (outside GeM), you typically need an OEM authorization letter from the manufacturer to prove you are supplying genuine products. Tenders that specify a brand usually require dealer/reseller authorization.",
      },
    },
    {
      "@type": "Question",
      name: "What documents does an OEM provide for GeM reseller authorization?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Standard documents from an OEM to a GeM reseller include: (1) OEM Authorization Code issued via GeM portal, (2) Signed OEM Authorization Letter on company letterhead, (3) ISO/quality certificates, (4) Product specification sheets, (5) MSME/UDYAM certificate (if MSME registered). Specific tender requirements may vary.",
      },
    },
  ],
}

export default function GemOemAuthorizationProcessPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdArticle) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }}
      />

      <main className="max-w-3xl mx-auto px-4 py-16 pt-32">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-brand-600">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/knowledge" className="hover:text-brand-600">Knowledge Hub</Link>
          <span className="mx-2">/</span>
          <span>GeM OEM Authorization Process</span>
        </nav>

        <div className="flex flex-wrap gap-2 mb-4">
          {["GeM", "OEM Authorization", "Reseller Guide", "Government"].map((tag) => (
            <span key={tag} className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          GeM OEM Authorization Process for Fogging Machine Resellers: Complete Guide
        </h1>
        <p className="text-gray-500 text-sm mb-8">
          By 100X Circle Pvt Ltd · GeM-Listed MSME OEM · 8 min read · Updated June 2026
        </p>

        <div className="bg-brand-50 border border-brand-200 rounded-xl p-5 mb-8 text-sm text-gray-700">
          <strong>Key point:</strong> To sell fogging machines on GeM as a reseller, you need OEM
          authorization from the manufacturer — both an authorization code for the GeM portal and
          a signed authorization letter for tender submissions. This guide explains the complete
          process.
        </div>

        <article className="prose prose-gray max-w-none">
          <h2>What Is GeM OEM Authorization?</h2>
          <p>
            The Government e-Marketplace (GeM) categorizes sellers into two types: OEMs
            (Original Equipment Manufacturers) who directly list their own products, and resellers
            who are authorized by OEMs to sell on their behalf.
          </p>
          <p>
            For product categories where this distinction is enforced, a reseller cannot list or
            sell a product unless the OEM has explicitly authorized them through the GeM OEM Panel.
            This authorization takes two forms:
          </p>
          <ol>
            <li>
              <strong>OEM Authorization Code</strong> — A unique code issued through the GeM
              portal that you enter in your reseller account to pair the OEM&apos;s catalog
            </li>
            <li>
              <strong>OEM Authorization Letter</strong> — A formal signed document on company
              letterhead for use in tender submissions where documentary proof is required
            </li>
          </ol>

          <h2>Why GeM OEM Authorization Matters for Fogging Machine Dealers</h2>
          <p>
            If you plan to participate in government tenders for mosquito control, vector control,
            or public health equipment — which is where the majority of fogging machine volume
            sits — you need OEM authorization. Here&apos;s why:
          </p>
          <ul>
            <li>
              <strong>GeM bidding requirements:</strong> Many government buyers specify that
              resellers must be authorized by the OEM. Without authorization, your bid may be
              disqualified even if your price is the lowest.
            </li>
            <li>
              <strong>Tender documentation requirements:</strong> Municipal corporation tenders
              and state health department bids routinely ask for an OEM authorization letter as
              mandatory bid documentation.
            </li>
            <li>
              <strong>Credibility with government buyers:</strong> Government procurement
              officers prefer dealing with authorized channels. Authorization signals that you
              have direct manufacturer backing.
            </li>
            <li>
              <strong>MSME OEM preference:</strong> If the OEM is MSME registered, their
              authorized resellers may benefit from MSME procurement preference rules.
            </li>
          </ul>

          <h2>OEM vs Reseller on GeM: The Key Difference</h2>
          <p>
            Understanding this distinction is important for how you structure your GeM business:
          </p>
          <ul>
            <li>
              <strong>OEM (Original Equipment Manufacturer):</strong> The entity that manufactures
              the product. On GeM, the OEM creates and owns the product catalog. The OEM is
              responsible for product quality, compliance, and managing authorized resellers.
            </li>
            <li>
              <strong>Reseller:</strong> A registered GeM seller who has received authorization
              from the OEM to sell the OEM&apos;s products. Resellers do not own the catalog —
              they pair their account with the OEM&apos;s catalog using the authorization code.
            </li>
          </ul>
          <p>
            For fogging machines, 100X Circle is the OEM. Dealers and distributors who want to
            sell 100X Circle products on GeM operate as resellers under 100X Circle&apos;s OEM
            authorization.
          </p>

          <h2>The GeM OEM Authorization Code Process — Step by Step</h2>
          <p>
            Here is how the OEM authorization code process works on GeM:
          </p>

          <h3>Step 1: OEM Registration on GeM OEM Panel</h3>
          <p>
            The OEM (100X Circle in this case) must be registered on GeM and have access to the
            GeM OEM Panel. The OEM Panel allows the manufacturer to manage their product catalog
            and authorize resellers.
          </p>

          <h3>Step 2: Reseller Makes an Authorization Request</h3>
          <p>
            The reseller (you) contacts the OEM and requests authorization. You provide your GeM
            Seller ID, GST number, and business details. The request can also be initiated through
            the GeM portal if the OEM&apos;s OEM Panel is configured.
          </p>

          <h3>Step 3: OEM Approves and Issues Authorization Code</h3>
          <p>
            Once approved, the OEM issues a unique authorization code via the GeM OEM Panel.
            This code is specific to your GeM seller account and the OEM&apos;s product category.
          </p>

          <h3>Step 4: Reseller Enters Code and Pairs Catalog</h3>
          <p>
            Log in to your GeM seller account and navigate to the Reseller Panel. Enter the
            authorization code. This pairs the OEM&apos;s product catalog with your seller
            profile. The products now appear in your seller inventory.
          </p>

          <h3>Step 5: Bid on GeM Tenders</h3>
          <p>
            With catalog paired, you can bid on GeM tenders and purchase orders for fogging
            machines. When placing orders, the OEM fulfils and dispatches directly (in most
            arrangements).
          </p>

          <h2>What Documents Do You Need from the OEM?</h2>
          <p>
            Beyond the authorization code, maintain the following from your OEM for tender
            submissions:
          </p>
          <ul>
            <li>
              <strong>OEM Authorization Letter</strong> — signed on company letterhead, stating
              you are an authorized reseller for specific products or categories
            </li>
            <li>
              <strong>ISO 9001:2015 certificate</strong> — quality management certification
            </li>
            <li>
              <strong>MSME/UDYAM registration certificate</strong> — if the OEM is MSME
              registered (as 100X Circle is)
            </li>
            <li>
              <strong>IS 14855 (Part 1) compliance documentation</strong> — the Indian Standard
              for fogging machines, required by most government tenders
            </li>
            <li>
              <strong>CE marking certificate</strong> — relevant for export-grade models
            </li>
            <li>
              <strong>Technical specification sheets</strong> — matching the tender&apos;s
              technical requirements
            </li>
          </ul>

          <h2>IS 14855 — The Standard Government Buyers Specify</h2>
          <p>
            If you bid on government tenders for fogging machines, you will encounter IS 14855
            (Part 1). This is the Bureau of Indian Standards (BIS) specification for
            power-operated fogging machines. Municipal corporations, Nagar Nigams, and state
            health departments increasingly specify IS 14855 compliance in their tenders.
          </p>
          <p>
            100X Circle&apos;s thermal fogging machines are manufactured to IS 14855 (Part 1)
            compliance requirements. As an authorized reseller, you receive the IS 14855
            compliance documentation to include in your tender bids.
          </p>

          <h2>Common Mistakes Resellers Make with OEM Authorization</h2>
          <ul>
            <li>
              <strong>Using generic templates:</strong> Online tools generate generic OEM
              authorization letter templates that are not legally valid. Government procurement
              officers and GeM reject these. Always get a signed original from the actual
              manufacturer on their letterhead.
            </li>
            <li>
              <strong>Expired authorization:</strong> Some OEMs issue time-limited authorization
              letters. Ensure your authorization is valid for the tender&apos;s date. Request
              renewal in advance.
            </li>
            <li>
              <strong>Wrong product scope:</strong> Ensure the authorization letter specifies the
              correct product models you are bidding on. Vague authorization may be questioned
              during bid evaluation.
            </li>
            <li>
              <strong>Not having the code before the tender deadline:</strong> OEM authorization
              codes take 2–5 days to process. Don&apos;t wait until a tender closes to request
              authorization.
            </li>
          </ul>
        </article>

        {/* CTA */}
        <div className="mt-8 bg-brand-50 border border-brand-200 rounded-xl p-6">
          <h2 className="font-semibold text-brand-800 mb-2">
            Get OEM Authorization from 100X Circle
          </h2>
          <p className="text-sm text-brand-700 mb-4">
            100X Circle is a GeM-listed MSME OEM for fogging machines. We provide OEM
            authorization codes and signed authorization letters to qualified dealers for GeM
            bidding and government tenders.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/gem-oem-authorization"
              className="inline-flex items-center justify-center bg-brand-600 text-white font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-brand-700 transition-colors"
            >
              Apply for Authorization →
            </Link>
            <Link
              href="/become-a-dealer"
              className="inline-flex items-center justify-center border border-brand-300 text-brand-700 font-medium px-5 py-2.5 rounded-lg text-sm hover:bg-brand-100 transition-colors"
            >
              Dealer Program Details
            </Link>
          </div>
        </div>

        {/* Related Articles */}
        <div className="mt-8 border-t border-gray-200 pt-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Related Articles</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Link
              href="/knowledge/government-procurement-guide"
              className="border border-gray-200 rounded-lg p-4 hover:border-brand-400 transition-colors"
            >
              <p className="font-medium text-gray-800 text-sm">Government Procurement Guide</p>
              <p className="text-xs text-gray-500 mt-1">How government buyers purchase via GeM</p>
            </Link>
            <Link
              href="/compare/gem-fogging-machines-india"
              className="border border-gray-200 rounded-lg p-4 hover:border-brand-400 transition-colors"
            >
              <p className="font-medium text-gray-800 text-sm">GeM Fogging Machines India</p>
              <p className="text-xs text-gray-500 mt-1">Buyer guide for GeM fogging machine procurement</p>
            </Link>
            <Link
              href="/compare/msme-fogging-machine-manufacturers-india"
              className="border border-gray-200 rounded-lg p-4 hover:border-brand-400 transition-colors"
            >
              <p className="font-medium text-gray-800 text-sm">MSME Fogging Machine Manufacturers</p>
              <p className="text-xs text-gray-500 mt-1">Why MSME OEM matters for GeM procurement</p>
            </Link>
            <Link
              href="/ai/government-supplies"
              className="border border-gray-200 rounded-lg p-4 hover:border-brand-400 transition-colors"
            >
              <p className="font-medium text-gray-800 text-sm">Government Supply Profile</p>
              <p className="text-xs text-gray-500 mt-1">100X Circle's track record with government buyers</p>
            </Link>
          </div>
        </div>
      </main>
    </>
  )
}
