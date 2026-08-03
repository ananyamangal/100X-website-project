import { defineRouting } from "next-intl/routing"

// Phase 1 bellwether pair. Phase 2 adds the remaining 10 Indian regional
// languages; Phase 3 adds the remaining export-market languages. See
// project memory for the full planned list.
export const routing = defineRouting({
  locales: ["en", "hi", "id"],
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
})

export type AppLocale = (typeof routing.locales)[number]
