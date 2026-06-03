import { notFound } from "next/navigation"
import LandingRenderer from "@/components/landing/LandingRenderer"
import ProductPage from "./ProductPage"
import { productLandingMetadata } from "@/lib/seo/product-landing-meta"
import { getLandingPage } from "@/lib/seo/landing-pages"
import { getProductBySlug } from "@/lib/productsQuery"

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
  // Fetch normalized product server-side — no client round-trip, no null-access crashes.
  const product = await getProductBySlug(slug)
  if (product) return <ProductPage product={product} slug={slug} />
  // Neither landing page nor product matches — proper 404 for SEO.
  notFound()
}
