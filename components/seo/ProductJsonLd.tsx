import { SITE_NAME, SITE_URL } from "@/lib/seo/site-config"
import { plainTextFromHtml } from "@/lib/rich-text"

type Props = {
  name: string
  description: string
  images: string[]
  url: string
  sku?: string
  inStock?: boolean
  /** 0-5 star rating; emits AggregateRating when present and >0. */
  rating?: number
  reviewsCount?: number
  /** Free-form price band, e.g. "₹35,000 - ₹85,000" — only used as a visible offer note. */
  priceRange?: string
  /** Optional category name; used to label the breadcrumb position. */
  category?: string
}

function absolutize(url: string): string {
  if (!url) return ""
  if (/^https?:\/\//.test(url)) return url
  return `${SITE_URL}${url.startsWith("/") ? "" : "/"}${url}`
}

export function ProductJsonLd({
  name,
  description,
  images,
  url,
  sku,
  inStock,
  rating,
  reviewsCount,
  priceRange,
  category,
}: Props) {
  const cleanDescription = plainTextFromHtml(description).slice(0, 5000)
  const validImages = images
    .filter(Boolean)
    .slice(0, 10)
    .map(absolutize)

  const aggregateRating =
    typeof rating === "number" && rating > 0 && reviewsCount && reviewsCount > 0
      ? {
          "@type": "AggregateRating",
          ratingValue: Number(rating.toFixed(1)),
          reviewCount: reviewsCount,
          bestRating: 5,
          worstRating: 1,
        }
      : undefined

  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description: cleanDescription,
    image: validImages,
    sku: sku || undefined,
    category: category || undefined,
    brand: {
      "@type": "Brand",
      name: SITE_NAME,
    },
    offers: {
      "@type": "Offer",
      url: absolutize(url),
      priceCurrency: "INR",
      availability:
        inStock === false
          ? "https://schema.org/OutOfStock"
          : "https://schema.org/InStock",
      priceSpecification:
        priceRange
          ? {
              "@type": "PriceSpecification",
              priceCurrency: "INR",
              valueAddedTaxIncluded: false,
              description: priceRange,
            }
          : undefined,
    },
    aggregateRating,
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
