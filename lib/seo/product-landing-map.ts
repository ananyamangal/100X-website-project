/**
 * Maps every /products/<segment> that has a canonical SEO landing page
 * to that landing page's slug.
 *
 * Keys are the segment that appears after /products/ — either a DB slug or
 * a MongoDB ObjectId string. Values are the landing-page slug (no leading /).
 *
 * Used by:
 *   - next.config.mjs   → static 301 redirects (edge layer, no runtime cost)
 *   - app/products/[id] → runtime safety-net redirect
 *   - app/sitemap.ts    → suppress /products/ duplicates
 *   - link components   → emit canonical href directly (no redirect hop)
 */
export const PRODUCT_LANDING_MAP: Record<string, string> = {
  // ── Thermal & Cold Fogging Machine 100XTFS50 ────────────────────────────
  "thermal-cold-fogging-machine-100xtfs50-90602f":  "thermal-and-cold-fogging-machine-100xtfs50",
  "thermal-cold-fogging-machine-100xtfs50-290275":  "thermal-and-cold-fogging-machine-100xtfs50",
  "68e5217a0bab18231190602f":                       "thermal-and-cold-fogging-machine-100xtfs50",
  "6a1fccbf04cb8e079f290275":                       "thermal-and-cold-fogging-machine-100xtfs50",
  // historical backlink variants
  "thermal-and-cold-fogging-machine-100xtfs50":     "thermal-and-cold-fogging-machine-100xtfs50",
  "thermal-cold-fogging-machine-100xtfs50":         "thermal-and-cold-fogging-machine-100xtfs50",
  "100xtfs50":                                      "thermal-and-cold-fogging-machine-100xtfs50",
  "tfs50":                                          "thermal-and-cold-fogging-machine-100xtfs50",

  // ── Stainless Steel Thermal Fogger 100XSSMA20 ───────────────────────────
  "thermal-fogging-machine-with-stainless-steel-tank-100xssma20-1b5dd8":
    "thermal-fogging-machine-with-stainless-steel-tank-100xssma20",
  "68e523cd8d624609ac1b5dd8":
    "thermal-fogging-machine-with-stainless-steel-tank-100xssma20",
  // historical backlink variants
  "thermal-fogging-machine-with-stainless-steel-tank-100xssma20":
    "thermal-fogging-machine-with-stainless-steel-tank-100xssma20",
  "100xssma20":                                     "thermal-fogging-machine-with-stainless-steel-tank-100xssma20",
  "ssma20":                                         "thermal-fogging-machine-with-stainless-steel-tank-100xssma20",

  // ── Double Barrel Vehicle-Mountable Fogger 100XDB400 ────────────────────
  "100xdb400-double-barrel-thermal-fogging-machine-vehicle-moun-f377e0":
    "double-barrel-thermal-fogging-machine-vehicle-mountable-100xdb400",
  "double-barrel-thermal-fogging-machine-vehicle-mounted":
    "double-barrel-thermal-fogging-machine-vehicle-mountable-100xdb400",
  "68e52538f84599d156f377e0":
    "double-barrel-thermal-fogging-machine-vehicle-mountable-100xdb400",
  "6a1e6c08ef20ab52efaa3d69":
    "double-barrel-thermal-fogging-machine-vehicle-mountable-100xdb400",
  // historical backlink variants
  "double-barrel-thermal-fogging-machine-vehicle-mountable-100xdb400":
    "double-barrel-thermal-fogging-machine-vehicle-mountable-100xdb400",
  "100xdb400-double-barrel-thermal-fogging-machine-vehicle-moun-aa3d69":
    "double-barrel-thermal-fogging-machine-vehicle-mountable-100xdb400",
  "100xdb400":                                      "double-barrel-thermal-fogging-machine-vehicle-mountable-100xdb400",
  "db400":                                          "double-barrel-thermal-fogging-machine-vehicle-mountable-100xdb400",
}

/**
 * Returns the canonical URL for a product given its slug or ObjectId.
 * Falls back to /products/<slugOrId> when no landing page exists.
 */
export function getProductCanonicalUrl(slugOrId: string): string {
  const landing = PRODUCT_LANDING_MAP[slugOrId]
  return landing ? `/${landing}` : `/products/${slugOrId}`
}
