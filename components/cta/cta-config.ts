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

const TENDER_KEYWORDS = ["gem", "tender", "government", "govt", "institutional"]
const DISTRIBUTOR_KEYWORDS = ["dealer", "distributor", "partner", "reseller"]
const PRODUCT_PREFIXES = [
  "/products/",
  "/power-tiller",
  "/vehicle-mounted-fogging-machine",
]

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
  if (PRODUCT_PREFIXES.some((prefix) => p === prefix || p.startsWith(prefix))) {
    return "product"
  }

  // SEO product slug fallback: top-level single-segment route, not on the
  // non-product allow-list, containing at least one product keyword.
  const segments = p.split("/").filter(Boolean)
  if (
    segments.length === 1 &&
    !NON_PRODUCT_TOP_LEVEL.has(p) &&
    PRODUCT_SLUG_KEYWORDS.some((k) => p.includes(k))
  ) {
    return "product"
  }

  return "default"
}
