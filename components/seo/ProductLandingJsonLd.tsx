import { ProductJsonLd } from "@/components/seo/ProductJsonLd"
import { SITE_URL } from "@/lib/seo/site-config"
import { getLandingPage } from "@/lib/seo/landing-pages"

/** Structured data for SEO landing product URLs (/[slug]) */
export function ProductLandingJsonLd({ slug }: { slug: string }) {
  const def = getLandingPage(slug)
  if (!def) return null
  const url = `${SITE_URL}/${slug}`
  const name = def.title.split("|")[0]?.trim() || def.title
  const ogImage = def.ogImage
    ? def.ogImage.startsWith("http")
      ? def.ogImage
      : `${SITE_URL}${def.ogImage.startsWith("/") ? "" : "/"}${def.ogImage}`
    : `${SITE_URL}/logo-main.png`
  return (
    <ProductJsonLd
      name={name}
      description={def.description}
      images={[ogImage]}
      url={url}
      sku={slug}
      inStock
    />
  )
}
