import type { Metadata } from "next"
import Link from "next/link"
import { Mail, MapPin, MessageCircle, Phone, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BUSINESS, SITE_NAME, SITE_NAME_LEGAL, SITE_URL } from "@/lib/seo/site-config"
import { ContactThankYouTracker } from "@/components/conversion/ContactThankYouTracker"

export const metadata: Metadata = {
  title: `Thank You | ${SITE_NAME}`,
  description: "Your inquiry was received. Our team will respond shortly.",
  robots: {
    index: false,
    follow: true,
  },
}

const waUrl = `https://wa.me/${BUSINESS.whatsappE164}?text=${encodeURIComponent("Hi, I submitted an inquiry on your website and would like to follow up.")}`

const thankYouJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: `Thank you — ${SITE_NAME}`,
  description: "Inquiry confirmation page.",
  url: `${SITE_URL}/thank-you`,
  isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
}

export default function ThankYouPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 via-white to-gray-50 pt-24 pb-16">
      <ContactThankYouTracker />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(thankYouJsonLd) }}
      />

      <div className="container mx-auto max-w-2xl px-4">
        <div className="rounded-2xl border border-green-100 bg-white p-8 shadow-xl md:p-12">
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-700">
              <ShieldCheck className="h-9 w-9" aria-hidden />
            </div>
          </div>
          <h1 className="text-center text-3xl font-bold text-gray-900 md:text-4xl">
            Thank you — we received your inquiry
          </h1>
          <p className="mt-4 text-center text-lg text-gray-600">
            Your message has been saved securely. A member of our team will review it and respond as soon as possible.
          </p>
          <p className="mt-6 rounded-lg bg-green-50 px-4 py-3 text-center text-sm text-green-900">
            <span className="font-semibold">Typical response time:</span> within one business day (Mon–Sat, 9:00 AM – 6:00
            PM IST).
          </p>

          <div className="mt-10 space-y-4 border-t border-gray-100 pt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Company contact
            </h2>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start gap-3">
                <Phone className="mt-0.5 h-5 w-5 shrink-0 text-green-600" aria-hidden />
                <span>
                  <a href="tel:+917827229116" className="font-medium text-green-700 hover:underline">
                    {BUSINESS.phonePrimary}
                  </a>
                  <span className="text-gray-500"> · </span>
                  <a href="tel:+918178567520" className="font-medium text-green-700 hover:underline">
                    {BUSINESS.phoneSecondary}
                  </a>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Mail className="mt-0.5 h-5 w-5 shrink-0 text-green-600" aria-hidden />
                <a
                  href={`mailto:${BUSINESS.email}`}
                  className="break-all font-medium text-green-700 hover:underline"
                >
                  {BUSINESS.email}
                </a>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-green-600" aria-hidden />
                <span>
                  {SITE_NAME_LEGAL}
                  <br />
                  {BUSINESS.streetAddress}, {BUSINESS.addressLocality}, {BUSINESS.addressRegion}{" "}
                  {BUSINESS.postalCode}
                </span>
              </li>
            </ul>
          </div>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button asChild size="lg" className="bg-green-600 hover:bg-green-700">
              <a href={waUrl} target="_blank" rel="noopener noreferrer" data-gtm-location="thank_you_page">
                <MessageCircle className="mr-2 h-5 w-5" aria-hidden />
                Chat on WhatsApp
              </a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/products">Browse products</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
