import { defineRouting } from "next-intl/routing"

// Phase 1 bellwether pair (en/hi/id). Phase 2 adds the remaining 11 Indian
// regional languages below; Phase 3 adds the remaining export-market
// languages. See project memory for the full planned list.
export const routing = defineRouting({
  locales: ["en", "hi", "id", "bn", "mr", "te", "ta", "gu", "ur", "kn", "or", "ml", "pa", "as"],
  defaultLocale: "en",
  localePrefix: "as-needed",
  // Off deliberately: with this on, next-intl auto-redirects (307) an
  // unprefixed English URL to a locale prefix based on the visitor's
  // Accept-Language header. That diverts real traffic off the canonical
  // English URL search engines have indexed and outreach links point to —
  // confirmed via curl against the Bihar/UP/GeM landing pages, which
  // redirected to /hi/... for any Accept-Language: hi request. Locale
  // switching stays available, just explicit (LanguageSwitcher / a direct
  // /hi or /id link) rather than guessed from a header.
  localeDetection: false,
  // Off, as of 2026-08-06 (was on). next-intl's automatic Link header
  // advertises every entry in `locales` above unconditionally — it has no
  // concept of lib/seo/hreflang.ts's reviewed-content gate, so it was
  // advertising hi/id/all 11 Phase 2 locales as hreflang alternates on every
  // locale-managed page regardless of whether a REVIEWED translation
  // actually existed (confirmed via curl against the live Link header — see
  // project memory "hreflang-locale-gate-bug"). The previous version of
  // this comment claimed generateMetadata's own alternates
  // (lib/seo/hreflang.ts's buildPageAlternates, wired in via
  // lib/seo/product-landing-meta.ts's productLandingMetadata) "never make
  // it into the response" and kept this header on as the only working
  // mechanism — that claim doesn't hold up: the SAME alternates object's
  // `canonical` key demonstrably reaches the response (verified live,
  // <link rel="canonical"> correctly shows the page-specific URL, not the
  // root layout's competing `alternates: {canonical: '/'}` — proving
  // page-level `generateMetadata` alternates do win the merge), and
  // `languages` is a sibling key on the exact same object processed by the
  // exact same Next.js metadata pipeline. buildPageAlternates() already
  // correctly gates on reviewed content via getAvailableLocales() and is
  // the sole hreflang mechanism now. middleware.ts's old per-slug Link-
  // header-delete workaround for the 3 untranslatable product pages
  // (TFS50/DB400/SSMA20) is gone too — with this off, next-intl never sets
  // that header for anything, so there was nothing left to delete.
  alternateLinks: false,
})

export type AppLocale = (typeof routing.locales)[number]
