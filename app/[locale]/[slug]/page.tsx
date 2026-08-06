export const revalidate = 300

import { notFound } from "next/navigation"
import LandingRenderer from "@/components/landing/LandingRenderer"
import ProductPage from "./ProductPage"
import { productLandingMetadata } from "@/lib/seo/product-landing-meta"
import { getLandingPage } from "@/lib/seo/landing-pages"
import { isUntranslatableProductLanding } from "@/lib/seo/locale-gate"
import { getProductBySlug } from "@/lib/productsQuery"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>
}) {
  const { slug, locale } = await params
  if (await isUntranslatableProductLanding(slug, locale)) {
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
  // isUntranslatableProductLanding for why product slugs 404 for hi/id/etc —
  // both the 3 registered product-landing pages (TFS50/DB400/SSMA20) AND any
  // other live product reached via the branch below are covered by that gate.
  // Registered SEO landing page wins (custom content via landing-pages.ts).
  // Translated fields (if any exist for this locale) are merged in by
  // LandingRenderer via getMergedLandingPage(slug, locale); untranslated
  // locales fall back to the English registry content, never a 404.
  if (getLandingPage(slug)) return <LandingRenderer slug={slug} locale={locale} />
  // Fetch normalized product server-side — no client round-trip, no null-access crashes.
  // Note: products with no landing-page entry never render here for a non-
  // English locale — isUntranslatableProductLanding (checked above, in this
  // page's generateMetadata and in layout.tsx) already 404s them before this
  // branch is reached. This branch only runs for locale="en" (or a product
  // that turned out not to exist, handled by notFound() below), so it stays
  // English-only content by construction, not by an unenforced convention.
  const product = await getProductBySlug(slug)
  if (product) return <ProductPage product={product} slug={slug} />
  // Neither landing page nor product matches — proper 404 for SEO.
  notFound()
}
