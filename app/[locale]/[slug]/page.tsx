export const revalidate = 300

import { notFound } from "next/navigation"
import LandingRenderer from "@/components/landing/LandingRenderer"
import ProductPage from "./ProductPage"
import { productLandingMetadata } from "@/lib/seo/product-landing-meta"
import { getLandingPage, isUntranslatableProductLanding } from "@/lib/seo/landing-pages"
import { getProductBySlug } from "@/lib/productsQuery"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>
}) {
  const { slug, locale } = await params
  if (isUntranslatableProductLanding(slug, locale)) {
    return { title: "Not Found", robots: { index: false, follow: false } }
  }
  return productLandingMetadata(slug, locale)
}

export default async function Page({ params }: { params: Promise<{ slug: string; locale: string }> }) {
  const { slug, locale } = await params
  // The untranslatable-locale 404 itself is handled one level up, in
  // layout.tsx — this segment's loading.tsx wraps this page in a Suspense
  // boundary, and Next.js commits the response status once that boundary's
  // fallback flushes, before an async component further down gets to call
  // notFound(). The layout renders outside that boundary, so its notFound()
  // call is what actually produces a real HTTP 404 instead of a 200 with
  // 404-looking content. See lib/seo/landing-pages.ts's
  // isUntranslatableProductLanding for why these 3 slugs 404 for hi/id.
  // Registered SEO landing page wins (custom content via landing-pages.ts).
  // Translated fields (if any exist for this locale) are merged in by
  // LandingRenderer via getMergedLandingPage(slug, locale); untranslated
  // locales fall back to the English registry content, never a 404.
  if (getLandingPage(slug)) return <LandingRenderer slug={slug} locale={locale} />
  // Fetch normalized product server-side — no client round-trip, no null-access crashes.
  // Note: the 3 products with a landing-page entry (TFS50, DB400, SSMA20) are
  // handled by the branch above via LandingRenderer, not here — this branch
  // only covers products with no landing page, which stay English-only for
  // now (app/products/[id]/page.tsx, untouched in Phase 1, is the other path
  // to these; both are out of scope until Phase 2's product-translation work).
  const product = await getProductBySlug(slug)
  if (product) return <ProductPage product={product} slug={slug} />
  // Neither landing page nor product matches — proper 404 for SEO.
  notFound()
}
