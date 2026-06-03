import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { getProductsByCategory } from "@/lib/productsQuery"
import { getLandingDisplayName, getLandingPage } from "@/lib/seo/landing-pages"
import SectionHeader from "./SectionHeader"

type Props = {
  eyebrow?: string
  title?: string
  /** Pull products by Mongo category (preferred for use-case / state pages). */
  categoryFilter?: string
  /** Or pin to specific landing slugs (cross-links to other landings instead of products). */
  slugs?: string[]
  limit?: number
}

const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'%3E%3Crect fill='%23e5e7eb' width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-size='16'%3EProduct%3C/text%3E%3C/svg%3E"

/**
 * Recommended-products rail. Two modes:
 *   - `categoryFilter` -> fetches Mongo products in that category
 *   - `slugs`          -> renders the matching landing-page cards
 *                        (useful for use-case pages that point to
 *                        curated /[slug] landings rather than Mongo IDs)
 */
export default async function RecommendedProductsBlock({
  eyebrow = "Recommended for this need",
  title = "Pick the right machine",
  categoryFilter,
  slugs,
  limit = 4,
}: Props) {
  if (slugs?.length) {
    const items: { slug: string; title: string; description: string; image?: string }[] = []
    for (const s of slugs) {
      if (items.length >= limit) break
      const def = getLandingPage(s)
      if (!def) continue
      items.push({
        slug: s,
        title: getLandingDisplayName(s) ?? s,
        description: def.metadata.description.slice(0, 130),
        image: def.metadata.ogImage,
      })
    }
    if (items.length === 0) return null
    return (
      <section className="py-14 md:py-20">
        <div className="container mx-auto px-4 max-w-6xl">
          <SectionHeader eyebrow={eyebrow} title={title} />
          <ul className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-4 list-none">
            {items.map((item) => (
              <li key={item.slug}>
                <Link
                  href={`/${item.slug}`}
                  className="group block rounded-2xl border border-gray-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 [[data-theme=dark-industrial]_&]:bg-white/[0.04] [[data-theme=dark-industrial]_&]:border-white/10 [[data-theme=dark-industrial]_&]:hover:border-green-500/40"
                >
                  <h3 className="text-sm md:text-base font-bold text-gray-900 line-clamp-2 [[data-theme=dark-industrial]_&]:text-white">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-xs text-gray-600 line-clamp-3 [[data-theme=dark-industrial]_&]:text-slate-400">
                    {item.description}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 [[data-theme=dark-industrial]_&]:text-brand-400">
                    View details
                    <ArrowRight size={14} aria-hidden="true" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    )
  }

  const products = await getProductsByCategory(categoryFilter, limit)
  if (products.length === 0) return null

  return (
    <section className="py-14 md:py-20">
      <div className="container mx-auto px-4 max-w-6xl">
        <SectionHeader eyebrow={eyebrow} title={title} />
        <ul className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-4 list-none">
          {products.map((p) => {
            const img = p.imageUrls?.[0] || PLACEHOLDER
            return (
              <li key={p.id}>
                <Link
                  href={`/products/${p.slug || p.id}`}
                  className="group block rounded-2xl border border-gray-200 bg-white overflow-hidden transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 [[data-theme=dark-industrial]_&]:bg-white/[0.04] [[data-theme=dark-industrial]_&]:border-white/10 [[data-theme=dark-industrial]_&]:hover:border-green-500/40"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-gray-100 [[data-theme=dark-industrial]_&]:bg-white/5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img}
                      alt={p.name}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover transition-transform group-hover:scale-[1.02]"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm md:text-base font-semibold text-gray-900 line-clamp-2 [[data-theme=dark-industrial]_&]:text-white">
                      {p.name}
                    </h3>
                    {p.priceRange ? (
                      <p className="mt-1 text-xs text-gray-600 [[data-theme=dark-industrial]_&]:text-slate-400">
                        {p.priceRange}
                      </p>
                    ) : null}
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
