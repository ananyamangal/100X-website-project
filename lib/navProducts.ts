import { PRODUCT_LANDING_MAP, getProductCanonicalUrl } from "@/lib/seo/product-landing-map"

/**
 * Data for the header "Products" menu: every published product, grouped by
 * category, with its canonical URL and a small thumbnail. Kept free of any
 * database import so the shaping rules can be unit-tested on plain objects;
 * the cached reader lives in lib/layoutData.ts (getNavProducts).
 */
export interface NavProduct {
  name: string
  /** Canonical URL: the SEO landing page when one exists, else /products/<slug|id>. */
  href: string
  /** ~160x160 Cloudinary rendition, or null (the menu draws a placeholder). */
  thumb: string | null
}

export interface NavProductGroup {
  category: string
  products: NavProduct[]
}

export const NAV_THUMB_PX = 160
const FALLBACK_CATEGORY = "Other"

/**
 * Small square rendition of a Cloudinary image: fill crop, auto format and
 * quality, so each thumbnail is a few KB. Anything that is not a Cloudinary
 * upload URL returns null rather than shipping a full-size original.
 */
export function navThumbUrl(url: unknown): string | null {
  if (typeof url !== "string" || !url.includes("res.cloudinary.com") || !url.includes("/upload/")) return null
  const t = `f_auto,q_auto,w_${NAV_THUMB_PX},h_${NAV_THUMB_PX},c_fill`
  return url.replace("/upload/", `/upload/${t}/`)
}

/**
 * Same rule as the product cards (getProductCanonicalUrl on slug || id), plus
 * the sitemap's extra check of the ObjectId against PRODUCT_LANDING_MAP, so a
 * product with a landing page always links to the landing page directly.
 */
export function navProductHref(slug: string | undefined, id: string): string {
  const landing = (slug && PRODUCT_LANDING_MAP[slug]) || PRODUCT_LANDING_MAP[id]
  return landing ? `/${landing}` : getProductCanonicalUrl(slug || id)
}

function firstImage(doc: Record<string, unknown>): unknown {
  const urls = doc.imageUrls
  if (Array.isArray(urls) && urls.length > 0) return urls[0]
  return doc.imageUrl
}

function time(v: unknown): number {
  const t = v instanceof Date ? v.getTime() : typeof v === "string" ? Date.parse(v) : NaN
  return Number.isFinite(t) ? t : 0
}

/**
 * Raw product documents → menu groups. Published only (isPublished !== false,
 * the rule /products, the product page and the sitemap all use), unnamed rows
 * dropped. Products keep the /products listing order (order ascending, then
 * newest first); groups appear in the order of their first product.
 */
export function shapeNavProducts(docs: Record<string, unknown>[]): NavProductGroup[] {
  const rows = docs
    .filter((d) => d && d.isPublished !== false && typeof d.name === "string" && d.name.trim() !== "")
    .map((d) => ({
      name: (d.name as string).trim(),
      id: String(d._id ?? d.id ?? ""),
      slug: typeof d.slug === "string" && d.slug.trim() ? d.slug.trim() : undefined,
      category: typeof d.category === "string" && d.category.trim() ? d.category.trim() : FALLBACK_CATEGORY,
      order: typeof d.order === "number" ? d.order : Infinity,
      created: time(d.createdAt),
      image: firstImage(d),
    }))
    .filter((r) => r.id || r.slug)
    .sort((a, b) => (a.order !== b.order ? a.order - b.order : b.created - a.created))

  const groups = new Map<string, NavProduct[]>()
  for (const r of rows) {
    if (!groups.has(r.category)) groups.set(r.category, [])
    groups.get(r.category)!.push({ name: r.name, href: navProductHref(r.slug, r.id), thumb: navThumbUrl(r.image) })
  }
  return [...groups].map(([category, products]) => ({ category, products }))
}
