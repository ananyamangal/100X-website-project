export const revalidate = 300

import { notFound } from "next/navigation"
import LandingRenderer from "@/components/landing/LandingRenderer"
import ProductPage from "./ProductPage"
import { productLandingMetadata } from "@/lib/seo/product-landing-meta"
import { getLandingPage } from "@/lib/seo/landing-pages"
import { getProductBySlug } from "@/lib/productsQuery"

// type:"product" landing pages (TFS50, DB400, SSMA20) render via
// LandingRenderer's product branch, which pulls body content straight from
// the live Mongo product document — not from any translatable field. There
// is no mechanism to localize that body today, so serving them under a
// locale prefix would just be English content at a second URL: duplicate
// content, not a translation. 404 for non-English locales until product-doc
// translation is built, rather than silently duplicating.
function isUntranslatableProductLanding(slug: string, locale: string): boolean {
  return getLandingPage(slug)?.type === "product" && locale !== "en"
}

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
  if (isUntranslatableProductLanding(slug, locale)) notFound()
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
