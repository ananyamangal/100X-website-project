/**
 * Type vocabulary for the scalable landing-page system.
 *
 * A landing page is described entirely as data in `lib/seo/landing-pages.ts`
 * — a typed list of sections rendered by the generic `LandingRenderer`.
 * Adding a new landing = appending one entry to the registry.
 *
 * `LandingPageDef` is the shape consumed by the renderer, the sitemap, the
 * metadata builder, and the mobile-CTA audience detection. Every field
 * except `slug`, `type`, `metadata`, and `hero` is optional so simple
 * landings stay terse.
 */

import type { MetadataRoute } from "next"

// ─── Page taxonomy ────────────────────────────────────────────────────────

export type LandingType =
  | "product"     // existing product landing (back-compat path)
  | "gem"         // GeM / government / OEM authority pages
  | "state"       // state-level supplier pages
  | "city"        // city-level supplier pages
  | "use-case"    // problem-led pages (dengue, poultry, warehouse, hospital…)
  | "comparison"  // model A vs model B
  | "guide"       // long-form buyer guide

export type LandingTheme = "light" | "dark-industrial"

/**
 * Default theme by type — overrideable per landing via
 * `LandingPageDef.theme`. Matches the agreed strategy:
 *   dark-industrial: gem · comparison · use-case
 *   light:           product · state · city · guide
 */
export const DEFAULT_THEME_BY_TYPE: Record<LandingType, LandingTheme> = {
  product: "light",
  gem: "dark-industrial",
  state: "light",
  city: "light",
  "use-case": "dark-industrial",
  comparison: "dark-industrial",
  guide: "light",
}

/**
 * Default sitemap weighting by type. GeM + comparison + use-case are
 * authority hubs; state/city are high-intent commercial; guides are
 * supporting top-of-funnel content. Override per landing if needed.
 */
export const DEFAULT_SITEMAP_BY_TYPE: Record<
  LandingType,
  { priority: number; changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]> }
> = {
  product: { priority: 0.9, changeFrequency: "weekly" },
  gem: { priority: 0.95, changeFrequency: "monthly" },
  state: { priority: 0.85, changeFrequency: "monthly" },
  city: { priority: 0.85, changeFrequency: "monthly" },
  "use-case": { priority: 0.85, changeFrequency: "monthly" },
  comparison: { priority: 0.8, changeFrequency: "monthly" },
  guide: { priority: 0.75, changeFrequency: "monthly" },
}

// ─── Hero block ───────────────────────────────────────────────────────────

export type HeroAccent = "default" | "green" | "yellow"
/** Headline part — accent lets us colour-tokenise without HTML in copy. */
export type HeroHeadlinePart = { text: string; accent?: HeroAccent }

export type HeroCta = { label: string; href: string; track?: string }

export type HeroBlock = {
  /** Tiny chip above the headline, e.g. "GeM Q2 Category — Fogging Machines". */
  eyebrow?: string
  /** Optional badge for the sticky-nav slot, e.g. "GeM Approved OEM". */
  navBadge?: string
  /**
   * Headline. Provide a plain string for simple cases, or an array of parts
   * for two-tone titles ("Sell on <green>GeM Portal</green> with <yellow>OEM</yellow>").
   */
  headline: string | HeroHeadlinePart[]
  /** Single subheading paragraph. */
  sub: string
  primary?: HeroCta
  secondary?: HeroCta
}

// ─── Block-level pieces ───────────────────────────────────────────────────

export type TrustMetric = { value: string; label: string }
export type BenefitItem = { icon: string; title: string; description: string }
export type ProcessStep = { title: string; description: string }
export type ComparisonRow = {
  label: string
  cells: string[]
  /** Highlight a column (0-indexed) to bias toward the recommended option. */
  highlight?: number
}
export type CaseStudy = {
  client: string
  location?: string
  /** One-sentence outcome ("Cut mosquito complaints 78% in one season"). */
  result: string
  quote?: string
  /** Asset path or absolute URL. */
  logo?: string
}
export type FaqEntry = {
  q: string
  /** Plain text; rendered as-is and mirrored into FAQPage JSON-LD. */
  a: string
}

export type LandingFormVariant =
  | "reseller"          // GeM reseller registration
  | "tender-quote"      // government tender quote request
  | "state-dealer"      // state dealer application
  | "guide-download"    // buyer-guide email-gated download
  | "use-case-quote"    // use-case-specific quote

/**
 * Mapping from form variant → `/api/submissions` `type` field. The submit
 * handler reads this so backend filtering stays one source of truth.
 */
export const FORM_SUBMISSION_TYPE: Record<LandingFormVariant, string> = {
  reseller: "gem_reseller_registration",
  "tender-quote": "tender_quote",
  "state-dealer": "state_dealer",
  "guide-download": "buyer_guide_download",
  "use-case-quote": "use_case_quote",
}

export type LandingFormBlockData = {
  variant: LandingFormVariant
  eyebrow?: string
  title: string
  sub?: string
  checklist?: string[]
  /** Override default GA4 event name; falls back to `${variant}_submit`. */
  gaEvent?: string
}

export type CtaBandData = {
  heading: string
  sub?: string
  primary: { label: string; href: string }
  secondary?: { label: string; href: string }
}

// ─── Section discriminated union ──────────────────────────────────────────

export type LandingSection =
  /** Headline + paragraphs — back-compat shape for the existing 3 entries. */
  | { kind: "rich-text"; h2: string; paragraphs: string[] }
  | { kind: "trust-strip"; metrics: TrustMetric[] }
  | {
      kind: "benefits-grid"
      eyebrow?: string
      title: string
      items: BenefitItem[]
    }
  | {
      kind: "process-timeline"
      eyebrow?: string
      title: string
      steps: ProcessStep[]
    }
  | {
      kind: "comparison-table"
      eyebrow?: string
      title: string
      columns: string[]
      rows: ComparisonRow[]
      /** Footnote rendered under the table. */
      note?: string
    }
  | {
      kind: "case-studies"
      eyebrow?: string
      title: string
      items: CaseStudy[]
    }
  | {
      kind: "recommended-products"
      eyebrow?: string
      title?: string
      /** Pull from Mongo by category — uses lib/productsQuery#getRelatedProducts. */
      categoryFilter?: string
      /** Or pin to specific landing slugs (cross-link to other landings). */
      slugs?: string[]
      limit?: number
    }
  | {
      kind: "related-landings"
      eyebrow?: string
      title?: string
      /** Falls back to LandingPageDef.relatedLandingSlugs when omitted. */
      slugs?: string[]
    }
  | {
      kind: "faq"
      eyebrow?: string
      title?: string
      /** Falls back to LandingPageDef.faqs when omitted. */
      faqs?: FaqEntry[]
    }
  | ({ kind: "form" } & LandingFormBlockData)
  | { kind: "cta-band"; band: CtaBandData }

// ─── Top-level registry entry ─────────────────────────────────────────────

export type LandingMetadata = {
  title: string
  description: string
  keywords?: string
  /** Absolute URL or site-relative path. */
  ogImage?: string
}

export type LandingPageDef = {
  /** URL slug (no leading slash). Becomes /<slug>. */
  slug: string

  /** Page taxonomy — picks theme defaults, sitemap weighting, schema. */
  type: LandingType

  /** Override the type's default theme. */
  theme?: LandingTheme

  metadata: LandingMetadata

  /**
   * Hero is required for new section-style landings. Existing product
   * landings (back-compat) may omit it — the renderer synthesises a
   * minimal hero from `metadata.title` in that case.
   */
  hero?: HeroBlock

  /**
   * Ordered body sections rendered after the hero. Required for new
   * landings; product landings (back-compat) may omit and rely on
   * `content1/2/3` legacy fields below.
   */
  sections?: LandingSection[]

  /** Used by FAQ sections (when no inline `faqs` provided) and FAQPage JSON-LD. */
  faqs?: FaqEntry[]

  /** Override the default Home → Products → name breadcrumb. */
  breadcrumb?: { name: string; url?: string }[]

  /** Used by `<RelatedLandingsBlock>` when no explicit slugs are passed. */
  relatedLandingSlugs?: string[]

  /** Used by `<RecommendedProductsBlock>` when no explicit category is passed. */
  relatedProductCategories?: string[]

  /** Per-page sitemap overrides; otherwise falls back to DEFAULT_SITEMAP_BY_TYPE. */
  sitemap?: {
    priority?: number
    changeFrequency?: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>
  }

  // ─── Back-compat fields for the existing 3 product landings ─────────────
  // Renderer maps these to rich-text sections when `sections` is absent.

  content1?: { h2: string; p: string[] }
  content2?: { h2: string; p: string[] }
  content3?: { h2: string; p: string[] }
}
