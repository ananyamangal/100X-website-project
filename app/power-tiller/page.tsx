import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Power Tiller in Delhi | 100x Circle',
  description:
    'Looking for the best Power Tiller in Delhi? 100x Circle offers high-performance, durable power tillers designed for efficient soil preparation and long-term field use. Contact us today to explore specifications, pricing, and dealer support.',
}

export default function PowerTillerPage() {
  return (
    <main className="min-h-screen bg-white pt-32 pb-16">
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

        <div className="flex flex-wrap gap-4">
          <Link
            href="/products"
            className="inline-flex items-center justify-center rounded-md bg-green-600 px-6 py-3 text-base font-semibold text-white hover:bg-green-700 transition-colors"
          >
            View All Products
          </Link>
          <a
            href="https://wa.me/917827229116?text=I%27m%20interested%20in%20the%20100x%20Circle%20Power%20Tiller.%20Please%20share%20details."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-md border border-green-600 px-6 py-3 text-base font-semibold text-green-700 hover:bg-green-50 transition-colors"
          >
            Chat on WhatsApp
          </a>
        </div>
      </section>
    </main>
  )
}


