import { SITE_NAME, SITE_URL } from "@/lib/seo/site-config"
import { plainTextFromHtml } from "@/lib/rich-text"

type Props = {
  name: string
  description: string
  images: string[]
  url: string
  sku?: string
  inStock?: boolean
  /** 0–5 star rating; emits AggregateRating when present and > 0. */
  rating?: number
  reviewsCount?: number
  /**
   * Free-form price band, e.g. "₹35,000 - ₹85,000".
   * Numeric values are parsed out and used in the Offer/AggregateOffer block.
   * If no numeric value can be extracted, offers is omitted entirely.
   */
  priceRange?: string
  /** Optional category name. */
  category?: string
}

function absolutize(url: string): string {
  if (!url) return ""
  if (/^https?:\/\//.test(url)) return url
  return `${SITE_URL}${url.startsWith("/") ? "" : "/"}${url}`
}

/**
 * Parse numeric low/high from strings like "₹35,000 - ₹85,000" or "35000".
 * Returns null when no valid number can be extracted.
 */
function parsePriceNums(raw: string): { low: number; high?: number } | null {
  const nums = raw.replace(/[₹,\s]/g, "").match(/\d+/g)
  if (!nums || nums.length === 0) return null
  const low = parseInt(nums[0], 10)
  if (isNaN(low) || low <= 0) return null
  const high = nums.length > 1 ? parseInt(nums[1], 10) : undefined
  return { low, high: high && !isNaN(high) && high > low ? high : undefined }
}

/**
 * Build a valid Offer or AggregateOffer node.
 *
 * Google requires either `price` (on Offer) or `lowPrice` (on AggregateOffer).
 * Returns undefined — not null — so JSON.stringify omits the key entirely
 * when no parseable price is available, preventing invalid empty-offer errors.
 */
function buildOffers(
  url: string,
  inStock: boolean | undefined,
  priceRange: string | undefined,
): Record<string, unknown> | undefined {
  const availability =
    inStock === false
      ? "https://schema.org/OutOfStock"
      : "https://schema.org/InStock"
  const abs = absolutize(url)

  if (priceRange) {
    const parsed = parsePriceNums(priceRange)
    if (parsed) {
      if (parsed.high) {
        // Price range → AggregateOffer with lowPrice + highPrice
        return {
          "@type": "AggregateOffer",
          url: abs,
          priceCurrency: "INR",
          lowPrice: parsed.low,
          highPrice: parsed.high,
          offerCount: 1,
          availability,
        }
      }
      // Single numeric price
      return {
        "@type": "Offer",
        url: abs,
        priceCurrency: "INR",
        price: parsed.low,
        availability,
      }
    }
  }

  // No parseable numeric price — omit offers entirely rather than emitting
  // an incomplete Offer that Google Search Console would flag as an error.
  return undefined
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
      "@id": `${SITE_URL}/#brand`,
    },
    manufacturer: {
      "@id": `${SITE_URL}/#organization`,
    },
    countryOfOrigin: {
      "@type": "Country",
      name: "India",
    },
    offers: buildOffers(url, inStock, priceRange),
    aggregateRating,
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
