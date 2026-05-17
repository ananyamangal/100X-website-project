import { getLandingSlugs } from "./landing-pages"

/**
 * @deprecated Read from `LANDING_PAGES` / `getLandingSlugs()` in
 * `./landing-pages.ts` instead. This re-export exists so consumers
 * like `app/sitemap.ts` keep working through the registry migration.
 */
export const SEO_PRODUCT_SLUGS = getLandingSlugs() as readonly string[]
