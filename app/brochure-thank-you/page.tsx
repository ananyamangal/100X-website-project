import type { Metadata } from "next"
import { ShieldCheck } from "lucide-react"
import clientPromise from "@/lib/mongodb"
import { SITE_NAME, SITE_NAME_LEGAL, SITE_URL } from "@/lib/seo/site-config"
import { BrochureThankYouTracker } from "@/components/conversion/BrochureThankYouTracker"
import BrochureThankYouActions from "./BrochureThankYouActions"

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

export const metadata: Metadata = {
  title: `Thank You — Brochure | ${SITE_NAME}`,
  description: "Your brochure request was received.",
  robots: {
    index: false,
    follow: true,
  },
}

const brochureJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: `Brochure thank you — ${SITE_NAME}`,
  description: "Brochure lead confirmation.",
  url: `${SITE_URL}/brochure-thank-you`,
  isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
}

async function getRelatedProductLinks(): Promise<{ name: string; href: string; _id: string }[]> {
  try {
    const client = await clientPromise
    const db = client.db()
    const cursor = db
      .collection("products")
      .find({})
      .sort({ order: 1, createdAt: -1 })
      .limit(8)
    const list = await cursor.toArray()
    return list.map((p) => ({
      _id: String(p._id),
      name: String(p.name || "Product"),
      href: `/${slugify(String(p.name || "product"))}`,
    }))
  } catch {
    return []
  }
}

export default async function BrochureThankYouPage() {
  const relatedProducts = await getRelatedProductLinks()

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-gray-50 pt-24 pb-16">
      <BrochureThankYouTracker />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(brochureJsonLd) }}
      />

      <div className="container mx-auto max-w-2xl px-4">
        <div className="rounded-2xl border border-emerald-100 bg-white p-8 shadow-xl md:p-12">
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <ShieldCheck className="h-9 w-9" aria-hidden />
            </div>
          </div>
          <h1 className="text-center text-3xl font-bold text-gray-900 md:text-4xl">
            Thank you for your interest
          </h1>
          <p className="mt-4 text-center text-lg text-gray-600">
            Your details were saved successfully. You can open the brochure again below, or reach us on WhatsApp for a demo
            or quote.
          </p>
          <p className="mt-6 rounded-lg bg-emerald-50 px-4 py-3 text-center text-sm text-emerald-900">
            <span className="font-semibold">{SITE_NAME_LEGAL}</span> — we typically reply within one business day (Mon–Sat,
            9:00 AM – 6:00 PM IST).
          </p>

          <BrochureThankYouActions relatedProducts={relatedProducts} />
        </div>
      </div>
    </div>
  )
}
