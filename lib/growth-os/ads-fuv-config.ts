/**
 * AI Media Buyer — First Usable Version configuration.
 * Funnel A (Dealer Acquisition), Search only.
 * All seeds, assets, match-type heuristics, LP scores, and thresholds live here.
 * Bump ADS_FUV_VERSION when this config changes.
 */

export const ADS_FUV_VERSION = "v1.0.0"
export const ADS_FUNNEL_A = "A" as const
export type Funnel = "A" | "B" | "C"

// ── Demand detection ────────────────────────────────────────────────────────

export const SEED_TERMS: string[] = [
  "fogging machine dealership",
  "fogging machine dealer",
  "thermal fogging machine dealer",
  "fogging machine distributor",
  "oem authorization fogging machine",
  "fogging machine oem",
  "gem fogging machine reseller",
  "fogging machine franchise",
  "ulv machine dealer",
  "become fogging machine dealer",
  "fogging machine dealership opportunity",
  "100x fogging machine",
  "thermal fogger dealership",
  "ulv fogger dealer",
]

export const DEMAND_MIN_IMPRESSIONS = 1

// ── Ad group definitions ────────────────────────────────────────────────────

export interface KeywordEntry {
  text: string
  matchType: "EXACT" | "PHRASE" | "BROAD"
  rationale: string
}

export interface AdGroupConfig {
  name: string
  theme: "dealer" | "oem" | "gem"
  landingPage: string
  keywords: KeywordEntry[]
}

export const AD_GROUPS: AdGroupConfig[] = [
  {
    name: "Dealer Program",
    theme: "dealer",
    landingPage: "/become-a-dealer",
    keywords: [
      { text: "fogging machine dealership",            matchType: "EXACT",  rationale: "High commercial dealer intent — protect efficiency" },
      { text: "thermal fogging machine distributor",   matchType: "EXACT",  rationale: "Proven dealer term, specific enough for Exact" },
      { text: "fogging machine dealer",                matchType: "PHRASE", rationale: "Catch variants (become fogging machine dealer)" },
      { text: "fogging machine dealership opportunity",matchType: "PHRASE", rationale: "Intent + variants covered by Phrase" },
      { text: "fogging machine franchise",             matchType: "BROAD",  rationale: "Discovery — guarded by campaign negatives" },
      { text: "thermal fogger dealership",             matchType: "PHRASE", rationale: "Variant of primary term" },
      { text: "ulv fogger dealer",                     matchType: "PHRASE", rationale: "ULV-specific dealer intent" },
    ],
  },
  {
    name: "OEM Authorization",
    theme: "oem",
    landingPage: "/gem-oem-authorization",
    keywords: [
      { text: "oem authorization fogging machine",         matchType: "EXACT",  rationale: "Specific high-intent — Exact protects budget" },
      { text: "oem authorized fogging machine supplier",   matchType: "PHRASE", rationale: "Variant capture — supplier/dealer synonyms" },
      { text: "fogging machine oem partnership",           matchType: "PHRASE", rationale: "Dealer + OEM intent cluster" },
      { text: "fogging machine brand authorization",       matchType: "PHRASE", rationale: "Alternative phrasing for OEM auth" },
    ],
  },
  {
    name: "GeM Reseller",
    theme: "gem",
    landingPage: "/dealers-and-government",
    keywords: [
      { text: "gem fogging machine reseller",              matchType: "EXACT",  rationale: "GeM dealer intent — Exact for precision" },
      { text: "gem reseller fogging machine",              matchType: "PHRASE", rationale: "Word-order variant" },
      { text: "fogging machine gem seller registration",   matchType: "PHRASE", rationale: "Tender/reseller onboarding intent" },
      { text: "gem portal fogging machine seller",         matchType: "PHRASE", rationale: "GeM-platform-specific intent" },
    ],
  },
]

// ── Campaign-level negative keywords ──────────────────────────────────────────

export const CAMPAIGN_NEGATIVES: string[] = [
  "price",
  "cost",
  "buy",
  "purchase",
  "repair",
  "service",
  "spare parts",
  "second hand",
  "used",
  "rent",
  "rental",
  "how to use",
  "manual",
  "pesticide",
  "chemical only",
  "mist fan",
  "nebulizer",
  "air freshener",
  "room spray",
]

// ── RSA asset bank ─────────────────────────────────────────────────────────

export interface RSAAssets {
  headlines: string[]
  descriptions: string[]
  callouts: string[]
  sitelinks: Array<{ text: string; url: string }>
  structuredSnippets: { header: string; values: string[] }
}

export const RSA_ASSETS: Record<"dealer" | "oem" | "gem" | "direct_buyer", RSAAssets> = {
  direct_buyer: {
    headlines: [
      "Thermal Fogging Machine",
      "India's Fogging Machine Brand",
      "IS 14855 Certified Fogger",
      "Mosquito Control Equipment",
      "Vehicle Mounted Fogger",
      "ULV Fogger India",
      "Public Health Fogging",
      "100X Fogging Machines",
      "Thermal Fogger Manufacturer",
      "Vector Control Equipment",
      "Buy Direct from Factory",
      "Enquire About Our Machines",
    ],
    descriptions: [
      "IS 14855 certified fogging machines for municipal, government, and commercial use. Enquire now.",
      "Thermal & ULV foggers for mosquito control, public health, and vector control programs.",
      "Vehicle-mounted and portable fogging machines. Direct from manufacturer. Pan-India supply.",
    ],
    callouts: ["IS 14855 Certified", "GeM Listed", "Mosquito Control", "Pan-India Delivery"],
    sitelinks: [
      { text: "Product Range",       url: "/products" },
      { text: "Public Health",       url: "/public-health-equipment" },
      { text: "Vehicle Mounted",     url: "/vehicle-mounted-fogging-machine" },
      { text: "Make in India",       url: "/make-in-india-fogging-machine" },
    ],
    structuredSnippets: {
      header: "Products",
      values: ["Thermal Foggers", "ULV Foggers", "Vehicle-Mounted", "Mosquito Control"],
    },
  },
  dealer: {
    headlines: [
      "Become a 100X Dealer",
      "Fogging Machine Dealership",
      "OEM Authorized Brand",
      "GeM-Listed Manufacturer",
      "Pan-India Dealer Network",
      "IS 14855 Certified",
      "Govt Supply Experience",
      "High-Margin Dealership",
      "Apply for Dealership",
      "Trusted Fogging OEM",
      "Authorized Dealer Program",
      "Official Dealer Enquiry",
    ],
    descriptions: [
      "Partner with a leading Indian fogging machine manufacturer. Apply for dealership today.",
      "OEM authorization, GeM support, pan-India network. Become a 100X dealer.",
      "IS 14855 certified machines, government supply experience, strong margins.",
    ],
    callouts: ["OEM Authorized", "GeM Listed", "Pan-India Dealers", "Govt Supply Experience"],
    sitelinks: [
      { text: "Become a Dealer",    url: "/become-a-dealer" },
      { text: "OEM Authorization",  url: "/gem-oem-authorization" },
      { text: "GeM Support",        url: "/dealers-and-government" },
      { text: "Product Range",      url: "/products" },
    ],
    structuredSnippets: {
      header: "Products",
      values: ["Thermal Foggers", "ULV Foggers", "Vehicle-Mounted", "Power Sprayers"],
    },
  },
  oem: {
    headlines: [
      "OEM Authorized Supplier",
      "Official Brand Authorization",
      "Fogging Machine OEM Partner",
      "Become an OEM Dealer",
      "GeM-Ready OEM Brand",
      "IS 14855 Certified OEM",
      "Government Supply OEM",
      "100X OEM Partnership",
      "OEM Authorization India",
      "Apply for OEM Auth",
      "Direct Manufacturer OEM",
      "Certified OEM Program",
    ],
    descriptions: [
      "Become an authorized OEM partner for India's fogging machine brand. Apply today.",
      "GeM-listed manufacturer offering OEM authorization for government supply chains.",
      "IS 14855 certified fogging machines with full OEM authorization support.",
    ],
    callouts: ["IS 14855 Certified", "GeM Listed", "OEM Support", "Govt Experience"],
    sitelinks: [
      { text: "OEM Authorization",  url: "/gem-oem-authorization" },
      { text: "Become a Dealer",    url: "/become-a-dealer" },
      { text: "GeM Tender Support", url: "/gem-tender-support" },
      { text: "Product Range",      url: "/products" },
    ],
    structuredSnippets: {
      header: "Products",
      values: ["Thermal Foggers", "ULV Foggers", "Vehicle-Mounted", "Power Sprayers"],
    },
  },
  gem: {
    headlines: [
      "GeM Fogging Machine Seller",
      "Register on GeM Portal",
      "GeM Reseller Program",
      "Government Buyer Supply",
      "Sell on GeM with 100X",
      "GeM-Listed Fogger Brand",
      "GeM Reseller Authorization",
      "Become a GeM Vendor",
      "GeM Tender Support",
      "Government Supply Network",
      "GeM Seller Registration",
      "GeM Compliant Foggers",
    ],
    descriptions: [
      "Become a GeM-authorized reseller for 100X fogging machines. Full tender support included.",
      "GeM portal registration assistance and manufacturer support for resellers.",
      "Supply government tenders with IS 14855 certified fogging machines via GeM.",
    ],
    callouts: ["GeM Listed", "Tender Support", "OEM Authorized", "Pan-India Supply"],
    sitelinks: [
      { text: "GeM Support",        url: "/dealers-and-government" },
      { text: "GeM Tender Help",    url: "/gem-tender-support" },
      { text: "OEM Authorization",  url: "/gem-oem-authorization" },
      { text: "Become a Dealer",    url: "/become-a-dealer" },
    ],
    structuredSnippets: {
      header: "Products",
      values: ["Thermal Foggers", "ULV Foggers", "Vehicle-Mounted", "Power Sprayers"],
    },
  },
}

// ── Landing page scores (advisory) ─────────────────────────────────────────

export interface LandingPageProfile {
  score: number
  gaps: string[]
}

export const LANDING_PAGE_PROFILES: Record<string, LandingPageProfile> = {
  "/become-a-dealer":      { score: 84, gaps: [] },
  "/gem-oem-authorization":{ score: 73, gaps: ["Add FAQ schema markup", "Add 'How OEM authorization works' section", "Add sticky CTA"] },
  "/dealers-and-government":{ score: 78, gaps: ["Add GeM-registration steps", "Add trust signals (dealer count, states served)"] },
  "/gem-tender-support":   { score: 71, gaps: ["Add dealer case studies", "Add CTA for reseller enquiry"] },
}

// ── Geo targeting ───────────────────────────────────────────────────────────

export const GEO_INDIA = "geoTargetConstants/2356"

// ── Budget ──────────────────────────────────────────────────────────────────

export const CAMPAIGN_DAILY_BUDGET_MICROS = 500_000_000 // ₹500/day — inert until APPROVE

// ── Quality scoring thresholds ──────────────────────────────────────────────

export const QUALITY_THRESHOLDS = {
  recommendedConfidence: 65,
  recommendedLandingPage: 60,
  minHeadlines:          10,
  minDescriptions:        3,
  minKeywordsPerAdGroup:  2,
  exactMatchPresent:     true,
  phraseMatchPresent:    true,
  negativeCountMin:       5,
  staleGscDays:          14,
}
