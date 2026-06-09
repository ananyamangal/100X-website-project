export const dynamic = "force-dynamic"

import type { Metadata } from "next"
import { notFound, permanentRedirect } from "next/navigation"
import { cookies } from "next/headers"
import ProductDetailV2 from "@/components/product/ProductDetailV2"
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
  // Draft products return noindex metadata — page handler handles the actual 404
  if (product.isPublished === false) {
    return {
      title: "Product | 100x Circle",
      description: "This product could not be found.",
      robots: { index: false, follow: false },
    }
  }
  const name = String(product.name ?? "Product")
  const productSlug = typeof product.slug === "string" ? product.slug : String(product._id ?? id)

  // Stored SEO fields take full priority — never overwrite with fallback if they exist
  const storedSeoTitle = typeof product.seoTitle === "string" ? product.seoTitle.trim() : ""
  const storedMetaDesc = typeof product.metaDescription === "string" ? product.metaDescription.trim() : ""
  const storedOgTitle = typeof product.ogTitle === "string" ? product.ogTitle.trim() : ""
  const storedOgDesc = typeof product.ogDescription === "string" ? product.ogDescription.trim() : ""
  const storedCanonical = typeof product.canonicalUrl === "string" ? product.canonicalUrl.trim() : ""

  // Canonical: respect override; otherwise derive from slug (NEVER change the slug)
  const canonicalPath = storedCanonical || `/products/${productSlug}`

  const rawDesc = String(product.shortDescription || product.detailedDescription || "")
  const fallbackDesc =
    plainTextFromHtml(rawDesc).slice(0, 155) ||
    `Buy ${name} from 100x Circle — thermal fogging and agricultural equipment in India.`

  const title = storedSeoTitle || `${name} | 100x Circle`
  const description = storedMetaDesc || fallbackDesc
  const ogTitle = storedOgTitle || title
  const ogDescription = storedOgDesc || description

  const url = `${SITE_URL}${canonicalPath.startsWith("http") ? "" : canonicalPath}`
  const imgs = absolutizeImages((product.imageUrls as string[]) || [])
  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      url,
      siteName: "100x Circle",
      locale: "en_IN",
      type: "website",
      images: imgs.length ? imgs.map((u) => ({ url: u })) : [{ url: `${SITE_URL}/logo-main.png` }],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: ogDescription,
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

  // Block public access to draft products; allow logged-in admins to preview
  if (result?.product?.isPublished === false) {
    const adminToken = (await cookies()).get("admin-token")?.value
    if (!adminToken) notFound()
  }

  // Legacy ObjectId URL → 308 permanent redirect to slug URL
  if (result?.resolvedBy === "id") {
    const product = result.product
    const slug = typeof product.slug === "string" ? product.slug : null
    if (slug) {
      permanentRedirect(`/products/${slug}`)
    }
  }

  const product = result?.product ?? null
  if (!product) notFound()

  const rawId = String(product._id ?? id)
  const productSlug = typeof product.slug === "string" ? product.slug : rawId
  const url = `${SITE_URL}/products/${productSlug}`
  const imgs = absolutizeImages((product.imageUrls as string[]) || [])
  const productName = String(product.name)
  const category = typeof product.category === "string" ? product.category : undefined
  const rating = typeof product.rating === "number" ? product.rating : undefined
  const reviewsCount = typeof product.reviewsCount === "number" ? product.reviewsCount : undefined
  const priceRange = typeof product.priceRange === "string" ? product.priceRange : undefined
  const inStock = product.inStock !== false
  const features = Array.isArray(product.features) ? (product.features as string[]) : []
  const badges = Array.isArray(product.badges) ? (product.badges as string[]) : []
  const shortDescription = plainTextFromHtml(product.shortDescription || product.detailedDescription || "")

  // VideoObject schema when product has a YouTube link
  const youtubeLink = typeof product.youtubeLink === "string" ? product.youtubeLink : null
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
      <ProductDetailV2 product={JSON.parse(JSON.stringify(product))} />
      <RelatedProductsSection category={category} excludeId={rawId} limit={4} />
    </>
  )
}
