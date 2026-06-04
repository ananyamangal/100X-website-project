export const revalidate = 60

import type { Metadata } from "next"
import { permanentRedirect } from "next/navigation"
import ProductDetailClient from "./ProductDetailClient"
import { ProductJsonLd } from "@/components/seo/ProductJsonLd"
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd"
import RelatedProductsSection from "@/components/RelatedProductsSection"
import { getProductBySlugOrId } from "@/lib/productsQuery"
import { SITE_URL } from "@/lib/seo/site-config"
import { plainTextFromHtml } from "@/lib/rich-text"
import ProductAiSummary from "@/components/seo/ProductAiSummary"

function absolutizeImages(urls: string[]): string[] {
  return urls
    .filter(Boolean)
    .slice(0, 10)
    .map((src) => (src.startsWith("http") ? src : `${SITE_URL}${src.startsWith("/") ? "" : "/"}${src}`))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const result = await getProductBySlugOrId(id)
  if (!result) {
    return {
      title: "Product | 100x Circle",
      description: "This product could not be found.",
      robots: { index: false, follow: true },
    }
  }
  const { product } = result
  const name = String(product.name ?? "Product")
  const productSlug = typeof product.slug === "string" ? product.slug : String(product._id ?? id)
  const canonicalPath = `/products/${productSlug}`
  const title = `${name} | 100x Circle`
  const rawDesc = String(product.shortDescription || product.detailedDescription || "")
  const description =
    plainTextFromHtml(rawDesc).slice(0, 155) ||
    `Buy ${name} from 100x Circle — thermal fogging and agricultural equipment in India.`
  const url = `${SITE_URL}${canonicalPath}`
  const imgs = absolutizeImages((product.imageUrls as string[]) || [])
  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      title,
      description,
      url,
      siteName: "100x Circle",
      locale: "en_IN",
      type: "website",
      images: imgs.length ? imgs.map((u) => ({ url: u })) : [{ url: `${SITE_URL}/logo-main.png` }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  }
}

function getYouTubeId(url: string): string | null {
  if (!url || typeof url !== "string") return null
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/
  )
  return match ? match[1] : null
}

export default async function ProductRoutePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await getProductBySlugOrId(id)

  // Legacy ObjectId URL → 308 permanent redirect to slug URL
  if (result?.resolvedBy === "id") {
    const product = result.product
    const slug = typeof product.slug === "string" ? product.slug : null
    if (slug) {
      permanentRedirect(`/products/${slug}`)
    }
  }

  const product = result?.product ?? null
  const rawId = product ? String(product._id ?? id) : id
  const productSlug = product && typeof product.slug === "string" ? product.slug : rawId
  const url = `${SITE_URL}/products/${productSlug}`
  const imgs = product ? absolutizeImages((product.imageUrls as string[]) || []) : []
  const productName = product ? String(product.name) : ""
  const category = product && typeof product.category === "string" ? product.category : undefined
  const rating = product && typeof product.rating === "number" ? product.rating : undefined
  const reviewsCount =
    product && typeof product.reviewsCount === "number" ? product.reviewsCount : undefined
  const priceRange =
    product && typeof product.priceRange === "string" ? product.priceRange : undefined
  const inStock = product ? product.inStock !== false : true
  const features = product && Array.isArray(product.features) ? (product.features as string[]) : []
  const badges = product && Array.isArray(product.badges) ? (product.badges as string[]) : []
  const shortDescription = String(product?.shortDescription || product?.detailedDescription || "")

  // VideoObject schema when product has a YouTube link
  const youtubeLink = product && typeof product.youtubeLink === "string" ? product.youtubeLink : null
  const videoId = youtubeLink ? getYouTubeId(youtubeLink) : null
  const videoJsonLd = videoId
    ? {
        "@context": "https://schema.org",
        "@type": "VideoObject",
        name: `${productName} — Product Video`,
        description: shortDescription || `Product video for ${productName} by 100X Circle`,
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        embedUrl: `https://www.youtube.com/embed/${videoId}`,
        contentUrl: `https://www.youtube.com/watch?v=${videoId}`,
        uploadDate: "2024-01-01",
        publisher: { "@id": `${SITE_URL}/#organization` },
      }
    : null

  return (
    <>
      {product ? (
        <>
          <ProductAiSummary
            id={rawId}
            name={productName}
            category={category ?? ""}
            shortDescription={shortDescription}
            priceRange={priceRange}
            inStock={inStock}
            features={features}
            badges={badges}
          />
          <ProductJsonLd
            name={productName}
            description={shortDescription}
            images={imgs.length ? imgs : [`${SITE_URL}/logo-main.png`]}
            url={url}
            sku={rawId}
            inStock={inStock}
            rating={rating}
            reviewsCount={reviewsCount}
            priceRange={priceRange}
            category={category}
          />
          {videoJsonLd && (
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(videoJsonLd) }}
            />
          )}
          <BreadcrumbJsonLd
            items={[
              { name: "Home", url: "/" },
              { name: "Products", url: "/products" },
              { name: productName, url: `/products/${productSlug}` },
            ]}
          />
        </>
      ) : null}
      <ProductDetailClient productId={rawId} initialProduct={product ? JSON.parse(JSON.stringify(product)) : undefined} />
      {product ? (
        <RelatedProductsSection category={category} excludeId={rawId} limit={4} />
      ) : null}
    </>
  )
}
