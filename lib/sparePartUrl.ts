/**
 * Public URL of a spare part: /spare-parts/<product-slug>/<part-slug>, the
 * product slug derived from the first compatible product name (category as a
 * fallback). Shared by the /spare-parts index and the header Spare Parts menu
 * so both always link to the same page.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- kept byte-for-byte from the page it came from
export function buildPartUrl(part: any): string {
  // Parts live at /spare-parts/[product-slug]/[part-slug]
  // Derive product slug from the first compatible product name
  const productName = part.compatibleProductNames?.[0]
  if (productName) {
    const productSlug = productName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
    return `/spare-parts/${productSlug}/${part.slug}`
  }
  // Fallback: try to use the part category as a grouping key
  const cat = (part.category || "parts").toLowerCase().replace(/[^a-z0-9]+/g, "-")
  return `/spare-parts/${cat}/${part.slug}`
}
