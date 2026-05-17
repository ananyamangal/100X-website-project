import ProductPage from "./ProductPage"
import { ProductLandingJsonLd } from "@/components/seo/ProductLandingJsonLd"
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd"
import { productLandingMetadata } from "@/lib/seo/product-landing-meta"
import { getLandingDisplayName, getLandingPage } from "@/lib/seo/landing-pages"

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
  const landing = getLandingPage(slug)
  const displayName = getLandingDisplayName(slug) ?? slug

  return (
    <>
      <ProductLandingJsonLd slug={slug} />
      {landing ? (
        <BreadcrumbJsonLd
          items={[
            { name: "Home", url: "/" },
            { name: "Products", url: "/products" },
            { name: displayName, url: `/${slug}` },
          ]}
        />
      ) : null}
      <ProductPage />
    </>
  )
}
