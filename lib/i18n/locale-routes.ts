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
