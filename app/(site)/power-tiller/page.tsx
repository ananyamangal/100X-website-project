import type { Metadata } from 'next'
import Link from 'next/link'
import { SITE_URL, SITE_NAME, defaultOgImage } from '@/lib/seo/site-config'
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd'
import RFQForm from '@/components/forms/RFQForm'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Power Tiller in Delhi | 100x Circle',
  description:
    'Looking for the best Power Tiller in Delhi? 100x Circle offers high-performance, durable power tillers designed for efficient soil preparation and long-term field use. Contact us today to explore specifications, pricing, and dealer support.',
  alternates: { canonical: "/power-tiller" },
  openGraph: {
    title: `Power Tiller Delhi | ${SITE_NAME}`,
    url: `${SITE_URL}/power-tiller`,
    siteName: SITE_NAME,
    locale: 'en_IN',
    type: 'website',
    images: [{ url: defaultOgImage }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `Power Tiller | ${SITE_NAME}`,
    description: 'Fuel-efficient power tillers for Indian farms.',
  },
}

export default function PowerTillerPage() {
  return (
    <main className="min-h-screen bg-white pt-32 pb-16">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: '/' },
          { name: 'Products', url: '/products' },
          { name: 'Power Tiller in Delhi', url: '/power-tiller' },
        ]}
      />
      <section className="container mx-auto px-4 max-w-5xl">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          Power Tiller in Delhi
        </h1>
        <p className="text-lg text-gray-700 mb-6">
          100x Circle provides robust, fuel-efficient power tillers engineered for Indian field
          conditions. Our machines are built to deliver deep tilling, better soil aeration, and
          reduced manual labor for farmers and professional users.
        </p>
        <p className="text-lg text-gray-700 mb-8">
          Reach out to our team to get detailed specifications, quotations, and dealer information,
          or explore all our agricultural equipment on the products page.
        </p>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/products"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-brand-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
          >
            View All Products
          </Link>
          <a
            href="https://wa.me/917827229116?text=I%27m%20interested%20in%20the%20100x%20Circle%20Power%20Tiller.%20Please%20share%20details."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-brand-600 bg-white px-6 py-3 text-base font-semibold text-brand-700 transition-all hover:-translate-y-0.5 hover:bg-brand-50 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
          >
            Chat on WhatsApp
          </a>
        </div>
      </section>

      <section className="container mx-auto px-4 max-w-3xl mt-16" id="rfq">
        <div className="rounded-2xl bg-gradient-to-b from-gray-50 to-white shadow-xl p-6 md:p-10">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              Request a Quote for Power Tiller
            </h2>
            <p className="text-sm md:text-base text-gray-600">
              Tender, GeM, dealer &amp; bulk inquiries — we&apos;ll respond within 48 hours.
            </p>
          </div>
          <RFQForm
            variant="card"
            defaultProduct="Custom Requirement"
            defaultDescription="Inquiring about: 100X Power Tiller"
            location="landing_power_tiller"
          />
        </div>
      </section>
    </main>
  )
}


