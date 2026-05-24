import type { Metadata } from 'next'
import Link from 'next/link'
import { SITE_URL, SITE_NAME, defaultOgImage } from '@/lib/seo/site-config'
import { BreadcrumbJsonLd } from '@/components/seo/BreadcrumbJsonLd'
import RFQForm from '@/components/forms/RFQForm'

export const metadata: Metadata = {
  title: 'Vehicle Mounted Fogging Machine in Delhi | 100x Circle',
  description:
    '100x Circle offers the best vehicle mounted fogging machine in Delhi, designed for large-area mosquito control and public health campaigns. Our machines deliver powerful fog output, reliable performance, and are ideal for municipalities, pest control services, and industrial campuses.',
  alternates: { canonical: "/vehicle-mounted-fogging-machine" },
  openGraph: {
    title: `Vehicle Mounted Fogger Delhi | ${SITE_NAME}`,
    url: `${SITE_URL}/vehicle-mounted-fogging-machine`,
    siteName: SITE_NAME,
    locale: 'en_IN',
    type: 'website',
    images: [{ url: defaultOgImage }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `Vehicle Fogging Machine | ${SITE_NAME}`,
    description: 'Large-area mosquito control fogging systems.',
  },
}

export default function VehicleMountedFoggingMachinePage() {
  return (
    <main className="min-h-screen bg-white pt-32 pb-16">
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: '/' },
          { name: 'Products', url: '/products' },
          { name: 'Vehicle Mounted Fogging Machine in Delhi', url: '/vehicle-mounted-fogging-machine' },
        ]}
      />
      <section className="container mx-auto px-4 max-w-5xl">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          Vehicle Mounted Fogging Machine in Delhi
        </h1>
        <p className="text-lg text-gray-700 mb-6">
          Our vehicle mounted fogging machines are engineered for large-scale mosquito and vector
          control. Built with robust components and high fog output, they are ideal for city-wide
          drives, industrial townships, and housing societies.
        </p>
        <p className="text-lg text-gray-700 mb-8">
          Connect with 100x Circle to discuss technical specifications, suitable models, and
          on-ground deployment support for your fogging operations.
        </p>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/products"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-green-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-green-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
          >
            View All Products
          </Link>
          <a
            href="https://wa.me/917827229116?text=I%27m%20interested%20in%20the%20100x%20Circle%20vehicle%20mounted%20fogging%20machine.%20Please%20share%20details."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-green-600 bg-white px-6 py-3 text-base font-semibold text-green-700 transition-all hover:-translate-y-0.5 hover:bg-green-50 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
          >
            Chat on WhatsApp
          </a>
        </div>
      </section>

      <section className="container mx-auto px-4 max-w-3xl mt-16" id="rfq">
        <div className="rounded-2xl bg-gradient-to-b from-gray-50 to-white shadow-xl p-6 md:p-10">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              Request a Quote for Vehicle Mounted Fogger
            </h2>
            <p className="text-sm md:text-base text-gray-600">
              Tender, GeM, dealer &amp; bulk inquiries — we&apos;ll respond within 48 hours.
            </p>
          </div>
          <RFQForm
            variant="card"
            defaultProduct="Vehicle Mounted Fogger"
            defaultDescription="Inquiring about: Vehicle Mounted Fogging Machine"
            location="landing_vehicle_mounted_fogging"
          />
        </div>
      </section>
    </main>
  )
}


