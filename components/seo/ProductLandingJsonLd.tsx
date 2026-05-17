import { ProductJsonLd } from "@/components/seo/ProductJsonLd"
import { SITE_URL } from "@/lib/seo/site-config"
import { getLandingPage } from "@/lib/seo/landing-pages"

/** Structured data for SEO landing product URLs (/[slug]) */
export function ProductLandingJsonLd({ slug }: { slug: string }) {
  const def = getLandingPage(slug)
  if (!def) return null
  const url = `${SITE_URL}/${slug}`
  const name = def.metadata.title.split("|")[0]?.trim() || def.metadata.title
  const og = def.metadata.ogImage
  const ogImage = og
    ? og.startsWith("http")
      ? og
      : `${SITE_URL}${og.startsWith("/") ? "" : "/"}${og}`
    : `${SITE_URL}/logo-main.png`
  return (
    <ProductJsonLd
      name={name}
      description={def.metadata.description}
      images={[ogImage]}
      url={url}
      sku={slug}
      inStock
    />
  )
}
