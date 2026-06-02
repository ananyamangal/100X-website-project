import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/seo/site-config"
import { getPublicBlogs } from "@/lib/blogsQuery"
import { getAllProductsForSitemap } from "@/lib/productsQuery"
import { getAllLandingPages } from "@/lib/seo/landing-pages"
import { DEFAULT_SITEMAP_BY_TYPE } from "@/lib/seo/landing-types"
import { blogPostSlug } from "@/lib/blogSlug"

/**
 * Static, hand-curated routes that are always present in the sitemap.
 * SEO landing pages and dynamic product/blog routes are appended below.
 *
 * Thank-you, admin, and api routes are intentionally absent — they are
 * also blocked at the robots.txt level (see app/robots.ts).
 */
const STATIC_ROUTES: Array<{
  path: string
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]
  priority: number
}> = [
  { path: "", changeFrequency: "weekly", priority: 1 },
  { path: "/about", changeFrequency: "monthly", priority: 0.7 },
  { path: "/blog", changeFrequency: "weekly", priority: 0.8 },
  { path: "/contact-us", changeFrequency: "monthly", priority: 0.7 },
  { path: "/products", changeFrequency: "weekly", priority: 0.9 },
  { path: "/privacy-policy", changeFrequency: "yearly", priority: 0.2 },
  { path: "/terms-and-conditions", changeFrequency: "yearly", priority: 0.2 },
  { path: "/return-policy", changeFrequency: "yearly", priority: 0.2 },
  { path: "/shipping-policy", changeFrequency: "yearly", priority: 0.2 },
  { path: "/power-tiller", changeFrequency: "monthly", priority: 0.8 },
  { path: "/vehicle-mounted-fogging-machine", changeFrequency: "monthly", priority: 0.8 },
  // AI landing pages
  { path: "/ai/about-100x", changeFrequency: "monthly", priority: 0.7 },
  { path: "/ai/factory", changeFrequency: "monthly", priority: 0.6 },
  { path: "/ai/certifications", changeFrequency: "monthly", priority: 0.6 },
  { path: "/ai/product-catalog", changeFrequency: "weekly", priority: 0.7 },
  { path: "/ai/government-supplies", changeFrequency: "monthly", priority: 0.6 },
  { path: "/ai/manufacturing-capabilities", changeFrequency: "monthly", priority: 0.6 },
  { path: "/ai/scorecard", changeFrequency: "monthly", priority: 0.5 },
  { path: "/ai/entity-graph", changeFrequency: "monthly", priority: 0.5 },
  // Knowledge base
  { path: "/knowledge", changeFrequency: "monthly", priority: 0.7 },
  { path: "/knowledge/how-thermal-fogging-works", changeFrequency: "yearly", priority: 0.7 },
  { path: "/knowledge/thermal-vs-ulv-fogging", changeFrequency: "yearly", priority: 0.7 },
  { path: "/knowledge/government-procurement-guide", changeFrequency: "yearly", priority: 0.7 },
  { path: "/knowledge/mosquito-control-india", changeFrequency: "yearly", priority: 0.7 },
  // Phase C pages
  { path: "/factory", changeFrequency: "monthly", priority: 0.7 },
  { path: "/case-studies", changeFrequency: "monthly", priority: 0.7 },
  { path: "/compare", changeFrequency: "monthly", priority: 0.7 },
  // Comparison pages (20)
  { path: "/compare/100x-circle-vs-korean-fogging-machines", changeFrequency: "yearly", priority: 0.75 },
  { path: "/compare/100x-circle-vs-german-fogging-machines", changeFrequency: "yearly", priority: 0.75 },
  { path: "/compare/vehicle-mounted-vs-portable-thermal-fogger", changeFrequency: "yearly", priority: 0.75 },
  { path: "/compare/best-thermal-fogging-machine-for-municipal-use", changeFrequency: "yearly", priority: 0.8 },
  { path: "/compare/best-thermal-fogger-for-agriculture-india", changeFrequency: "yearly", priority: 0.75 },
  { path: "/compare/fogging-machine-for-dengue-control-india", changeFrequency: "yearly", priority: 0.8 },
  { path: "/compare/fogging-machine-for-malaria-control-india", changeFrequency: "yearly", priority: 0.75 },
  { path: "/compare/gem-fogging-machines-india", changeFrequency: "yearly", priority: 0.8 },
  { path: "/compare/fogging-machine-for-pest-control-companies", changeFrequency: "yearly", priority: 0.75 },
  { path: "/compare/double-barrel-vs-single-barrel-thermal-fogger", changeFrequency: "yearly", priority: 0.7 },
  { path: "/compare/fogging-machine-price-guide-india-2026", changeFrequency: "yearly", priority: 0.8 },
  { path: "/compare/msme-fogging-machine-manufacturers-india", changeFrequency: "yearly", priority: 0.75 },
  { path: "/compare/iso-certified-fogging-machines-india", changeFrequency: "yearly", priority: 0.75 },
  { path: "/compare/fogging-machine-for-hospitals-healthcare", changeFrequency: "yearly", priority: 0.7 },
  { path: "/compare/fogging-machine-for-agricultural-cooperatives", changeFrequency: "yearly", priority: 0.7 },
  { path: "/compare/fogging-machine-for-small-municipalities-nagar-panchayat", changeFrequency: "yearly", priority: 0.75 },
  { path: "/compare/fogging-machine-export-india", changeFrequency: "yearly", priority: 0.7 },
  { path: "/compare/make-in-india-fogging-machines", changeFrequency: "yearly", priority: 0.75 },
  { path: "/compare/fogging-machine-buyer-guide-india", changeFrequency: "yearly", priority: 0.8 },
]

function toDate(value: string | undefined): Date | undefined {
  if (!value) return undefined
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? undefined : d
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const entries: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }))

  for (const def of getAllLandingPages()) {
    const fallback = DEFAULT_SITEMAP_BY_TYPE[def.type]
    entries.push({
      url: `${SITE_URL}/${def.slug}`,
      lastModified: now,
      changeFrequency: def.sitemap?.changeFrequency ?? fallback.changeFrequency,
      priority: def.sitemap?.priority ?? fallback.priority,
    })
  }

  const [blogs, products] = await Promise.all([
    getPublicBlogs(),
    getAllProductsForSitemap(),
  ])

  for (const blog of blogs) {
    const slug = blogPostSlug(blog)
    if (!slug) continue
    const lastModified =
      toDate(typeof blog.publishedAt === "string" ? blog.publishedAt : undefined) ?? now
    entries.push({
      url: `${SITE_URL}/blog/${slug}`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.7,
    })
  }

  for (const product of products) {
    const lastModified = toDate(product.updatedAt) ?? now
    // Use SEO slug if available; fall back to ObjectId for products not yet migrated
    const productPath = product.slug || product.id
    entries.push({
      url: `${SITE_URL}/products/${productPath}`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.85,
    })
  }

  return entries
}
