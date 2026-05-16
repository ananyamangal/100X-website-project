import { ProductJsonLd } from "@/components/seo/ProductJsonLd"
import { PRODUCT_LANDING_META, SITE_URL } from "@/lib/seo/product-landing-meta"

/** Structured data for SEO landing product URLs (/[slug]) */
export function ProductLandingJsonLd({ slug }: { slug: string }) {
  const meta = PRODUCT_LANDING_META[slug]
  if (!meta) return null
  const url = `${SITE_URL}/${slug}`
  const name = meta.title.split("|")[0]?.trim() || meta.title
  return (
    <ProductJsonLd
      name={name}
      description={meta.description}
      images={[`${SITE_URL}/logo-main.png`]}
      url={url}
      sku={slug}
      inStock
    />
  )
}
