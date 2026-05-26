import { ProductJsonLd } from "@/components/seo/ProductJsonLd"
import { SITE_URL } from "@/lib/seo/site-config"
import { getLandingPage } from "@/lib/seo/landing-pages"

/**
 * Indicative price ranges for known product-type landing pages.
 * Used exclusively for Product structured data (never displayed on-page).
 * Values reflect realistic B2B starting prices in the Indian market.
 */
const SLUG_PRICE_RANGE: Record<string, string> = {
  "thermal-and-cold-fogging-machine-100xtfs50": "₹25000 - ₹45000",
  "double-barrel-thermal-fogging-machine-vehicle-mountable-100xdb400": "₹80000 - ₹150000",
}

/** Structured data for SEO landing product URLs (/[slug]) */
export function ProductLandingJsonLd({ slug }: { slug: string }) {
  const def = getLandingPage(slug)
  if (!def) return null

  // Only emit Product schema for product-type pages. GeM, state, city, and
  // use-case pages describe services/programs — Product schema is wrong there.
  if (def.type !== "product") return null

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
      priceRange={SLUG_PRICE_RANGE[slug]}
    />
  )
}
