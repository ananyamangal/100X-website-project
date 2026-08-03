// Phase 1 (see i18n/routing.ts for the locale list): only these top-level
// paths have locale variants. Everything else on the site stays untouched,
// un-prefixed, English-only. Shared between middleware.ts (raw request
// pathname, may carry a "/hi" or "/id" prefix) and LanguageSwitcher (the
// locale-agnostic pathname next-intl's usePathname() returns).
export const LOCALE_MANAGED_SLUGS = new Set([
  "thermal-and-cold-fogging-machine-100xtfs50",
  "double-barrel-thermal-fogging-machine-vehicle-mountable-100xdb400",
  "gem-approved-fogging-machine-oem",
  "fogging-machine-supplier-in-uttar-pradesh",
  "fogging-machine-supplier-in-bihar",
  "dengue-control-fogging-machine",
  "thermal-vs-cold-fogging-machine",
  "fogging-machine-buying-guide",
  "thermal-fogging-machine-with-stainless-steel-tank-100xssma20",
])

// `pathname` must be locale-agnostic (no "/hi" or "/id" prefix).
export function isLocaleManagedPathname(pathname: string): boolean {
  if (pathname === "/blog" || pathname.startsWith("/blog/")) return true
  return LOCALE_MANAGED_SLUGS.has(pathname.slice(1))
}

// The 3 "type":"product" landing pages (see lib/seo/landing-pages.ts) render
// body content straight from the live Mongo product document, which has no
// translation mechanism — they 404 under /hi and /id. Kept here (rather than
// importing the full landing-pages registry into middleware, which runs on
// the Edge runtime and would pull in that whole data file just to check 3
// slugs) so middleware can strip next-intl's automatic hreflang Link header
// for these specific pages: that header advertises every configured locale
// for any locale-managed path with no idea some of them 404.
export const UNTRANSLATABLE_PRODUCT_SLUGS = new Set([
  "thermal-and-cold-fogging-machine-100xtfs50",
  "double-barrel-thermal-fogging-machine-vehicle-mountable-100xdb400",
  "thermal-fogging-machine-with-stainless-steel-tank-100xssma20",
])

// The blog index (app/[locale]/blog/page.tsx) has static UI copy (hero
// heading, empty-state text, etc.) rather than per-post DB content, so its
// hreflang can't be gated by a translation-collection lookup the way
// landing pages and blog posts are. Kept as an explicit list here — bump it
// only once that page's copy is actually translated in messages/*.json
// under the "BlogIndex" namespace, so hreflang never advertises a locale
// that still renders English chrome.
export const BLOG_INDEX_TRANSLATED_LOCALES = ["en"]
