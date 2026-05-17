export type Audience = "default" | "product" | "tender" | "distributor"

export type MobileCtaContextValue = {
  audience: Audience
  productName?: string
  whatsappMessage?: string
  /** Optional anchor id on the page to scroll to for "Get Quote" (used on /contact-us). */
  anchorFormId?: string
}

// Approximate B2B lead value for sticky-bar quote submissions.
// Mid-funnel: lower than ContactThankYouTracker (₹150k) but higher than the
// brochure download (₹50k). Overridable per environment without code change.
export const QUOTE_LEAD_VALUE_INR =
  Number(process.env.NEXT_PUBLIC_QUOTE_LEAD_VALUE_INR) || 75000

type CopySet = {
  call: string
  whatsapp: string
  quote: string
  whatsappPrefill: string
  modalTitle: string
  modalSubject: string
}

export const CTA_COPY: Record<Audience, CopySet> = {
  default: {
    call: "Call Now",
    whatsapp: "WhatsApp",
    quote: "Get Quote",
    whatsappPrefill: "Hi, I'd like to know more about 100x Circle products.",
    modalTitle: "Request a quote",
    modalSubject: "Sticky mobile quote request",
  },
  product: {
    call: "Call Now",
    whatsapp: "WhatsApp",
    quote: "Get Price",
    whatsappPrefill: "Hi, I'd like the price and availability for this product.",
    modalTitle: "Get price for this product",
    modalSubject: "Sticky mobile quote — product",
  },
  tender: {
    call: "Call Now",
    whatsapp: "WhatsApp",
    quote: "Request Tender Quote",
    whatsappPrefill:
      "Hi, I'd like a tender / GeM / institutional quote. Please share rate, GST, delivery, and compliance certificates.",
    modalTitle: "Request a tender / GeM quote",
    modalSubject: "Sticky mobile quote — tender / GeM",
  },
  distributor: {
    call: "Call Now",
    whatsapp: "WhatsApp",
    quote: "Become Distributor",
    whatsappPrefill:
      "Hi, I'd like to discuss becoming a dealer / distributor for 100x Circle. Please share margins and territory details.",
    modalTitle: "Apply to become a distributor",
    modalSubject: "Sticky mobile quote — distributor",
  },
}

const TENDER_KEYWORDS = [
  "gem",
  "tender",
  "government",
  "govt",
  "institutional",
  "municipal",
  "panchayat",
]
const DISTRIBUTOR_KEYWORDS = ["dealer", "distributor", "partner", "reseller"]

/**
 * Routes treated as product pages.
 *   - Strings ending in `/` match by prefix (the Mongo catalogue).
 *   - Strings without a trailing `/` match exactly so we don't
 *     accidentally classify `/power-tiller-supplier-in-up` as product
 *     when we add that state landing later.
 */
const PRODUCT_PREFIXES = [
  "/products/",
  "/power-tiller",
  "/vehicle-mounted-fogging-machine",
]

function matchesProductPrefix(p: string): boolean {
  return PRODUCT_PREFIXES.some((prefix) =>
    prefix.endsWith("/") ? p.startsWith(prefix) : p === prefix,
  )
}

// Top-level SEO slug pages (single path segment) carrying any of these tokens
// are treated as product pages so the bar shows "Get Price" on first paint
// instead of waiting for the client-side per-page override to fire.
const PRODUCT_SLUG_KEYWORDS = [
  "fogging",
  "fogger",
  "tiller",
  "mounted",
  "barrel",
  "sprayer",
  "mistblower",
]

/**
 * Slug-substring patterns that DOWNGRADE a product-keyword match back to
 * the "default" audience. These signal content / location / comparison
 * pages where the visitor is browsing — they want "Get Quote" (a generic
 * enquiry), not "Get Price" (a SKU-level intent).
 *
 * Examples that flip product → default:
 *   /fogging-machine-supplier-in-uttar-pradesh   (state, "-in-")
 *   /thermal-vs-cold-fogging-machine             (comparison, "-vs-")
 *   /fogging-machine-buying-guide                (guide, "buying-guide")
 *   /fogging-machine-supplier-lucknow            (city, "supplier")
 */
const NON_PRODUCT_SLUG_PATTERNS = [
  "-vs-",
  "buying-guide",
  "-guide",
  "supplier-in-",
  "-supplier-",
  "-supplier",
  "-in-",
]

// Single-segment top-level routes that are deliberately NOT products
// (catalogue, content, policy, thank-you pages). Used to gate the
// slug-keyword fallback so a future /fogging-knowledge blog or similar
// content route isn't mis-classified.
const NON_PRODUCT_TOP_LEVEL = new Set([
  "/blog",
  "/about",
  "/contact-us",
  "/products",
  "/privacy-policy",
  "/terms-and-conditions",
  "/return-policy",
  "/shipping-policy",
  "/brochure-thank-you",
  "/thank-you",
])

export function detectAudienceFromPath(pathname: string | null | undefined): Audience {
  if (!pathname) return "default"
  const p = pathname.toLowerCase()

  if (DISTRIBUTOR_KEYWORDS.some((k) => p.includes(k))) return "distributor"
  if (TENDER_KEYWORDS.some((k) => p.includes(k))) return "tender"
  if (matchesProductPrefix(p)) return "product"

  // SEO product slug fallback: top-level single-segment route, not on the
  // non-product allow-list, containing at least one product keyword AND
  // none of the content/location/comparison override patterns.
  const segments = p.split("/").filter(Boolean)
  if (
    segments.length === 1 &&
    !NON_PRODUCT_TOP_LEVEL.has(p) &&
    PRODUCT_SLUG_KEYWORDS.some((k) => p.includes(k)) &&
    !NON_PRODUCT_SLUG_PATTERNS.some((pat) => p.includes(pat))
  ) {
    return "product"
  }

  return "default"
}
