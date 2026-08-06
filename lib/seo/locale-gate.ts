/**
 * Server-only locale-availability gate for `/[locale]/[slug]` pages.
 *
 * Deliberately split out of `landing-pages.ts`: that file is also imported
 * by `ProductPage.tsx` ('use client', for `getLandingPage`) and must stay
 * free of server-only dependencies. This file imports `getProductBySlug`
 * (`lib/productsQuery.ts` → `mongodb`, which needs Node's `net` module), so
 * anything importing THIS file must be server-only — an RSC layout/page or
 * a route handler, never a client component. A prior version put this
 * function straight in `landing-pages.ts`; that broke the dev server with
 * "Module not found: Can't resolve 'net'" the moment `ProductPage.tsx`'s
 * existing `getLandingPage` import dragged the mongodb import chain into
 * its client bundle. Splitting the file is what makes the server-only
 * boundary enforced by the bundler instead of accidental.
 */
import { getLandingPage } from "./landing-pages"
import { getProductBySlug } from "@/lib/productsQuery"

// type:"product" landing pages (TFS50, DB400, SSMA20) render via
// LandingRenderer's product branch, which pulls body content straight from
// the live Mongo product document — not from any translatable field. There
// is no mechanism to localize that body today, so serving them under a
// locale prefix would just be English content at a second URL: duplicate
// content, not a translation. 404 for non-English locales until product-doc
// translation is built, rather than silently duplicating.
//
// The same problem exists one level down: products with NO landing-page
// entry at all (e.g. 100XMCF42, 100XHM20 — anything not in LANDING_PAGES)
// still render at /[locale]/[slug] via page.tsx's plain-product branch
// (getProductBySlug → <ProductPage>), which is equally non-locale-aware.
// Until now that branch had no gate at all, so /hi/<slug> etc. silently
// served the identical English product page — worse than the registered
// product-landing case above, which at least 404s. Checking getProductBySlug
// here (the exact function the render branch itself calls, cache()-deduped
// so this adds no extra DB round-trip) keeps both branches consistent: any
// live product, registered or not, 404s under a non-English locale prefix
// until it has a real translation mechanism. Draft products (isPublished:
// false) are deliberately left untouched here — they're a separate,
// pre-existing gap (see .claude-session-status.md), not this fix's scope.
export async function isUntranslatableProductLanding(slug: string, locale: string): Promise<boolean> {
  if (locale === "en") return false
  if (getLandingPage(slug)?.type === "product") return true
  if (getLandingPage(slug)) return false // some other translatable landing-page type — never gate these
  const product = await getProductBySlug(slug)
  return !!product && product.isPublished !== false
}
