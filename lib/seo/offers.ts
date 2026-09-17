import { SITE_URL } from "@/lib/seo/site-config"

/**
 * Single generator for schema.org Offer nodes built from the free-text price
 * fields the admin stores ("Price on Request", "₹1,250", "₹450 - ₹650",
 * "Free — included with purchase").
 *
 * Rules (GSC Merchant listings / Product rich results):
 *  - `price`, `lowPrice`, `highPrice` are ALWAYS plain number strings
 *    ("1250") — never "₹1,250", "1,250.00" or "Price on Request".
 *  - A price is never invented. When the text carries no number, the Offer is
 *    emitted WITHOUT a price but with everything that is true: currency,
 *    availability, condition, url and seller.
 *  - The moment an admin saves a numeric price, a complete Offer follows with
 *    no code change.
 */
export type ParsedPrice = { low: number; high?: number }

function absolutize(url: string): string {
  if (/^https?:\/\//.test(url)) return url
  return `${SITE_URL}${url.startsWith("/") ? "" : "/"}${url}`
}

const AMOUNT = String.raw`(?:₹|rs\.?|inr)?\s*(\d[\d,]*(?:\.\d+)?)(?:\s*\/-)?`
// The WHOLE string must be a price or a price range. Digits inside other text
// ("Call for price 24x7", "Pack of 2") are never treated as a price.
const PRICE_EXPRESSION = new RegExp(String.raw`^${AMOUNT}(?:\s*(?:-|–|—|to)\s*${AMOUNT})?$`, "i")

/**
 * "₹35,000 - ₹85,000" / "1250" / "₹1,250.50" → numbers; "Free…" → `{ low: 0 }`;
 * anything else ("Price on Request", free text) → null.
 */
export function parsePriceText(raw: string | null | undefined): ParsedPrice | null {
  const text = raw?.trim()
  if (!text) return null
  if (/^free\b/i.test(text)) return { low: 0 }
  const m = PRICE_EXPRESSION.exec(text)
  if (!m) return null
  const low = Number(m[1].replace(/,/g, ""))
  const second = m[2] !== undefined ? Number(m[2].replace(/,/g, "")) : undefined
  if (!Number.isFinite(low) || low <= 0) return null
  return { low, high: second !== undefined && Number.isFinite(second) && second > low ? second : undefined }
}

/** "1250" / "1250.5" — no currency symbol, no thousands separator, no trailing zeros. */
function priceString(n: number): string {
  return String(Number(n.toFixed(2)))
}

export function buildOfferNode(opts: {
  /** Page the item is sold/enquired on — relative or absolute. */
  url: string
  priceText?: string | null
  /** Only an explicit `false` marks the item out of stock. */
  inStock?: boolean
}): Record<string, unknown> {
  const common = {
    url: absolutize(opts.url),
    priceCurrency: "INR",
    availability: opts.inStock === false ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
    itemCondition: "https://schema.org/NewCondition",
    seller: { "@id": `${SITE_URL}/#organization` },
  }
  const parsed = parsePriceText(opts.priceText)
  if (parsed?.high !== undefined) {
    return {
      "@type": "AggregateOffer",
      ...common,
      lowPrice: priceString(parsed.low),
      highPrice: priceString(parsed.high),
      offerCount: 1,
    }
  }
  return {
    "@type": "Offer",
    ...common,
    ...(parsed ? { price: priceString(parsed.low) } : {}),
  }
}
