import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { getRelatedProducts } from "@/lib/productsQuery"
import { getProductCanonicalUrl } from "@/lib/seo/product-landing-map"

type Props = {
  category: string | undefined
  excludeId: string
  /** Heading override; defaults to "Related products". */
  heading?: string
  /** Defaults to 4. */
  limit?: number
}

const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'%3E%3Crect fill='%23e5e7eb' width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-size='16'%3EProduct%3C/text%3E%3C/svg%3E"

export default async function RelatedProductsSection({
  category,
  excludeId,
  heading = "Related products",
  limit = 4,
}: Props) {
  const items = await getRelatedProducts(category, excludeId, limit)
  if (items.length === 0) return null

  return (
    <section
      className="bg-gray-50 py-12 md:py-16"
      aria-labelledby="related-products-heading"
    >
      <div className="container mx-auto px-4">
        <div className="flex items-end justify-between mb-6 md:mb-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">
              {category ?? "More from 100x Circle"}
            </p>
            <h2
              id="related-products-heading"
              className="mt-1 text-2xl md:text-3xl font-bold text-gray-900"
            >
              {heading}
            </h2>
          </div>
          <Link
            href="/products"
            className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800"
          >
            View all products
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>

        <ul className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 list-none">
          {items.map((p) => {
            const img = p.imageUrls?.[0] || PLACEHOLDER
            return (
              <li key={p.id}>
                <Link
                  href={getProductCanonicalUrl(p.slug || p.id)}
                  className="group block bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
                >
                  <div className="aspect-[4/3] bg-gray-100 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img}
                      alt={p.name}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm md:text-base font-semibold text-gray-900 line-clamp-2">
                      {p.name}
                    </h3>
                    {p.priceRange ? (
                      <p className="mt-1 text-sm text-gray-600">{p.priceRange}</p>
                    ) : null}
                    <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-700">
                      View details
                      <ArrowRight
                        size={14}
                        aria-hidden="true"
                        className="transition-transform group-hover:translate-x-0.5"
                      />
                    </span>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
