export const dynamic = "force-dynamic"

import type { Metadata } from "next"
import { notFound, permanentRedirect } from "next/navigation"
import { cookies } from "next/headers"
import Link from "next/link"
import ProductDetailV2 from "@/components/product/ProductDetailV2"
import { ProductJsonLd } from "@/components/seo/ProductJsonLd"
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd"
import RelatedProductsSection from "@/components/RelatedProductsSection"
import { getProductBySlugOrId } from "@/lib/productsQuery"
import { toDisplayStrings } from "@/lib/normalizeProduct"
import { PRODUCT_LANDING_MAP } from "@/lib/seo/product-landing-map"
import { SITE_URL } from "@/lib/seo/site-config"
import { plainTextFromHtml } from "@/lib/rich-text"
import ProductAiSummary from "@/components/seo/ProductAiSummary"
import clientPromise from "@/lib/mongodb"

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

  // Legacy ObjectId URL → redirect. If the product has a canonical SEO
  // landing page, go there directly (single hop). Otherwise fall through
  // to the slug-based URL.
  if (result?.resolvedBy === "id") {
    const product = result.product
    const slug = typeof product.slug === "string" ? product.slug : null
    if (slug) {
      const landingSlug = PRODUCT_LANDING_MAP[slug]
      permanentRedirect(landingSlug ? `/${landingSlug}` : `/products/${slug}`)
    }
  }

  // Slug-based URL that has a canonical SEO landing page → redirect there.
  // next.config.mjs static redirects handle this at the edge layer, but this
  // is a runtime safety net for any slug that slips through (e.g. new aliases).
  if (result?.resolvedBy === "slug") {
    const landingSlug = PRODUCT_LANDING_MAP[id]
    if (landingSlug) permanentRedirect(`/${landingSlug}`)
  }

  const product = result?.product ?? null
  if (!product) notFound()

  const rawId = String(product._id ?? id)
  const productSlug = typeof product.slug === "string" ? product.slug : rawId
  const url = `${SITE_URL}/products/${productSlug}`
  const imgs = absolutizeImages((product.imageUrls as string[]) || [])
  const productName = String(product.name)

  // Trust graph: fetch related case studies and deployments
  let relatedCaseStudies: any[] = []
  let relatedDeployments: any[] = []
  try {
    const client = await clientPromise
    const db = client.db();
    [relatedCaseStudies, relatedDeployments] = await Promise.all([
      db.collection("case_studies").find({
        published: true,
        $or: [
          { linkedProductIds: rawId },
          { productUsed: { $regex: productName.split(" ").slice(0, 3).join(" "), $options: "i" } },
        ],
      }).sort({ createdAt: -1 }).limit(3).toArray(),
      db.collection("deployments").find({
        images: { $exists: true, $ne: [] },
        product: { $regex: productName.split(" ").slice(0, 2).join(" "), $options: "i" },
      }).sort({ createdAt: -1 }).limit(3).toArray(),
    ])
    relatedCaseStudies = JSON.parse(JSON.stringify(relatedCaseStudies))
    relatedDeployments = JSON.parse(JSON.stringify(relatedDeployments))
  } catch { /* non-fatal — trust graph is additive */ }
  const category = typeof product.category === "string" ? product.category : undefined
  const rating = typeof product.rating === "number" ? product.rating : undefined
  const reviewsCount = typeof product.reviewsCount === "number" ? product.reviewsCount : undefined
  const priceRange = typeof product.priceRange === "string" ? product.priceRange : undefined
  const inStock = product.inStock !== false
  const features = toDisplayStrings(product.features)
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

      {/* Trust graph: Related Case Studies */}
      {relatedCaseStudies.length > 0 && (
        <section className="py-14 bg-gray-50 border-t border-gray-100">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex items-end justify-between mb-6">
              <div>
                <p className="text-xs font-700 text-brand-600 uppercase tracking-widest mb-1.5">Government Deployments</p>
                <h2 className="text-xl font-bold text-gray-900">Case Studies using {productName}</h2>
              </div>
              <Link href="/case-studies" className="shrink-0 text-sm font-600 text-brand-600 hover:text-brand-700">
                View all →
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {relatedCaseStudies.map((s: any) => (
                <Link key={s._id} href={`/case-studies/${s.slug}`}
                  className="group bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-md hover:border-brand-200 transition-all flex flex-col">
                  <div className="relative h-40 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
                    {s.images?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.images[0]} alt={s.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl">🏛</div>
                    )}
                    {s.state && <span className="absolute top-3 left-3 px-2.5 py-1 bg-white/90 text-xs font-600 text-gray-700 rounded-full">{s.state}</span>}
                    {s.department && <span className="absolute top-3 right-3 px-2.5 py-1 bg-brand-600/90 text-xs font-600 text-white rounded-full">{s.department}</span>}
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <h3 className="font-700 text-sm text-gray-900 mb-1 group-hover:text-brand-700 transition-colors">{s.customer || s.title}</h3>
                    {s.problem && <p className="text-xs text-gray-500 line-clamp-2">{s.problem}</p>}
                    <p className="mt-auto pt-3 text-xs font-600 text-brand-600">Read case study →</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Trust graph: Related Deployments */}
      {relatedDeployments.length > 0 && (
        <section className="py-14 bg-white border-t border-gray-100">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex items-end justify-between mb-6">
              <div>
                <p className="text-xs font-700 text-brand-600 uppercase tracking-widest mb-1.5">Field Deployments</p>
                <h2 className="text-xl font-bold text-gray-900">Where this machine is deployed</h2>
              </div>
              <Link href="/deployments" className="shrink-0 text-sm font-600 text-brand-600 hover:text-brand-700">
                View all →
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {relatedDeployments.map((d: any) => (
                <div key={d._id} className="group rounded-2xl overflow-hidden border border-gray-200 hover:border-brand-300 hover:shadow-md transition-all bg-white">
                  {d.images?.[0] && (
                    <div className="relative aspect-[16/10] overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={d.images[0]} alt={d.location || "Deployment"} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      {d.department && <span className="absolute top-3 left-3 px-2.5 py-1 bg-brand-600/90 text-xs font-700 text-white rounded-full">{d.department}</span>}
                    </div>
                  )}
                  <div className="p-4">
                    {d.location && <p className="text-sm font-700 text-gray-800">{d.location}</p>}
                    {d.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{d.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  )
}
