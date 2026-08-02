import { defineRouting } from "next-intl/routing"

// Phase 1 bellwether pair. Phase 2 adds the remaining 10 Indian regional
// languages; Phase 3 adds the remaining export-market languages. See
// project memory for the full planned list.
export const routing = defineRouting({
  locales: ["en", "hi", "id"],
  defaultLocale: "en",
  localePrefix: "as-needed",
  localeDetection: true,
})

export type AppLocale = (typeof routing.locales)[number]
