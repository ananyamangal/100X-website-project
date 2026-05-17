import type { Metadata } from "next"
import ProductDetailClient from "./ProductDetailClient"
import { ProductJsonLd } from "@/components/seo/ProductJsonLd"
import { getProductById } from "@/lib/productsQuery"
import { SITE_URL } from "@/lib/seo/site-config"
import { plainTextFromHtml } from "@/lib/rich-text"

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
  const product = await getProductById(id)
  if (!product) {
    return {
      title: "Product | 100x Circle",
      description: "This product could not be found.",
      robots: { index: false, follow: true },
    }
  }
  const name = String(product.name ?? "Product")
  const title = `${name} | 100x Circle`
  const rawDesc = String(product.shortDescription || product.detailedDescription || "")
  const description =
    plainTextFromHtml(rawDesc).slice(0, 155) ||
    `Buy ${name} from 100x Circle — thermal fogging and agricultural equipment in India.`
  const url = `${SITE_URL}/products/${id}`
  const imgs = absolutizeImages((product.imageUrls as string[]) || [])
  return {
    title,
    description,
    alternates: { canonical: `/products/${id}` },
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

export default async function ProductRoutePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const product = await getProductById(id)
  const url = `${SITE_URL}/products/${id}`
  const imgs = product ? absolutizeImages((product.imageUrls as string[]) || []) : []

  return (
    <>
      {product ? (
        <ProductJsonLd
          name={String(product.name)}
          description={String(product.shortDescription || product.detailedDescription || "")}
          images={imgs.length ? imgs : [`${SITE_URL}/logo-main.png`]}
          url={url}
          sku={String(product._id ?? id)}
          inStock={product.inStock !== false}
        />
      ) : null}
      <ProductDetailClient productId={id} />
    </>
  )
}
