import ProductPage from "./ProductPage"
import { ProductLandingJsonLd } from "@/components/seo/ProductLandingJsonLd"
import { productLandingMetadata } from "@/lib/seo/product-landing-meta"

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
  return (
    <>
      <ProductLandingJsonLd slug={slug} />
      <ProductPage />
    </>
  )
}
