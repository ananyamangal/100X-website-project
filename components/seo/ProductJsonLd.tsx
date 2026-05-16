import { SITE_NAME } from "@/lib/seo/site-config"
import { plainTextFromHtml } from "@/lib/rich-text"

type Props = {
  name: string
  description: string
  images: string[]
  url: string
  sku?: string
  inStock?: boolean
}

export function ProductJsonLd({ name, description, images, url, sku, inStock }: Props) {
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description: plainTextFromHtml(description).slice(0, 5000),
    image: images.filter(Boolean).slice(0, 10),
    sku: sku || undefined,
    brand: {
      "@type": "Brand",
      name: SITE_NAME,
    },
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "INR",
      availability:
        inStock === false
          ? "https://schema.org/OutOfStock"
          : "https://schema.org/InStock",
    },
  }
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  )
}
