import { notFound } from "next/navigation"
import LandingRenderer from "@/components/landing/LandingRenderer"
import ProductPage from "./ProductPage"
import { productLandingMetadata } from "@/lib/seo/product-landing-meta"
import { getLandingPage } from "@/lib/seo/landing-pages"
import { productExistsBySlug } from "@/lib/productsQuery"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return productLandingMetadata(slug)
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  // Registered SEO landing page wins (custom content via landing-pages.ts).
  if (getLandingPage(slug)) return <LandingRenderer slug={slug} />
  // Otherwise, treat the slug as a product name — falls through to the
  // client ProductPage which fetches /api/admin/<decoded-slug>.
  if (await productExistsBySlug(slug)) return <ProductPage />
  // Neither landing page nor product matches — proper 404 for SEO.
  notFound()
}
