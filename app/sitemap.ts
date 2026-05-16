import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/seo/site-config"
import { getAllBlogSlugs } from "@/lib/blogsQuery"
import { getAllProductIds } from "@/lib/productsQuery"
import { SEO_PRODUCT_SLUGS } from "@/lib/seo/seo-product-slugs"

const STATIC_PATHS = [
  "",
  "/about",
  "/blog",
  "/contact-us",
  "/products",
  "/privacy-policy",
  "/terms-and-conditions",
  "/return-policy",
  "/shipping-policy",
  "/power-tiller",
  "/vehicle-mounted-fogging-machine",
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date()
  const entries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.8,
  }))

  for (const slug of SEO_PRODUCT_SLUGS) {
    entries.push({
      url: `${SITE_URL}/${slug}`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    })
  }

  const [blogSlugs, productIds] = await Promise.all([getAllBlogSlugs(), getAllProductIds()])

  for (const { slug } of blogSlugs) {
    entries.push({
      url: `${SITE_URL}/blog/${slug}`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.75,
    })
  }

  for (const id of productIds) {
    entries.push({
      url: `${SITE_URL}/products/${id}`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.85,
    })
  }

  return entries
}
