import { cache } from "react"
import { unstable_cache } from "next/cache"
import clientPromise from "@/lib/mongodb"
import { shapeNavProducts, type NavProductGroup } from "@/lib/navProducts"
import { shapeNavCaseStudies, type NavCaseStudy } from "@/lib/navPerformance"
import { shapeNavBlogPosts, NAV_BLOG_LIMIT, type NavBlogPost } from "@/lib/navBlog"
import { BLOGS_CACHE_TAG } from "@/lib/blogsQuery"
import { shapeNavSpareParts, type NavSparePartGroup } from "@/lib/navSpareParts"

/**
 * The root layout wraps every public route and every route currently renders
 * on demand, so its reads (brand assets, social links, brochure flag, trust
 * badges) used to cost four MongoDB round-trips per page view. They are now
 * served from the Data Cache: refreshed every LAYOUT_DATA_REVALIDATE_SECONDS,
 * and immediately when an admin save calls `revalidateTag(LAYOUT_DATA_TAG)`.
 *
 * Pattern used by every reader: the cached inner function THROWS on a DB
 * error (so a hiccup is never cached as the fallback value) and the exported
 * wrapper catches and returns the same fallback the uncached code returned.
 */
export const LAYOUT_DATA_TAG = "layout-data"
export const LAYOUT_DATA_REVALIDATE_SECONDS = 60

const fetchHasMainBrochure = unstable_cache(
  async (): Promise<boolean> => {
    const client = await clientPromise
    const count = await client
      .db()
      .collection("brochures.files")
      .countDocuments({ filename: "main-brochure.pdf" })
    return count > 0
  },
  ["layout-has-main-brochure-v1"],
  { tags: [LAYOUT_DATA_TAG], revalidate: LAYOUT_DATA_REVALIDATE_SECONDS },
)

export const getHasMainBrochure = cache(async (): Promise<boolean> => {
  try {
    return await fetchHasMainBrochure()
  } catch {
    return false
  }
})

const fetchActiveTrustBadges = unstable_cache(
  async () => {
    const client = await clientPromise
    const raw = await client
      .db()
      .collection("trust_badges")
      .find({ isActive: true })
      .sort({ order: 1 })
      .toArray()
    return JSON.parse(JSON.stringify(raw))
  },
  ["layout-active-trust-badges-v1"],
  { tags: [LAYOUT_DATA_TAG], revalidate: LAYOUT_DATA_REVALIDATE_SECONDS },
)

export const getActiveTrustBadges = cache(async () => {
  try {
    return await fetchActiveTrustBadges()
  } catch {
    return []
  }
})

// Header "Products" menu. Minimal projection; shaping (published only,
// canonical URLs, grouping, thumbnails) is in lib/navProducts.ts.
const fetchNavProducts = unstable_cache(
  async (): Promise<NavProductGroup[]> => {
    const client = await clientPromise
    const docs = await client
      .db()
      .collection("products")
      .find(
        { isPublished: { $ne: false } },
        { projection: { _id: 1, name: 1, slug: 1, category: 1, order: 1, createdAt: 1, isPublished: 1, imageUrls: { $slice: 1 }, imageUrl: 1 } },
      )
      .toArray()
    return shapeNavProducts(JSON.parse(JSON.stringify(docs)))
  },
  ["layout-nav-products-v1"],
  { tags: [LAYOUT_DATA_TAG], revalidate: LAYOUT_DATA_REVALIDATE_SECONDS },
)

export const getNavProducts = cache(async (): Promise<NavProductGroup[]> => {
  try {
    return await fetchNavProducts()
  } catch {
    return []
  }
})

// Header "Performance" menu: published case studies. Minimal projection;
// shaping (published only, detail URLs, thumbnails) is in lib/navPerformance.ts.
const fetchNavCaseStudies = unstable_cache(
  async (): Promise<NavCaseStudy[]> => {
    const client = await clientPromise
    const docs = await client
      .db()
      .collection("case_studies")
      .find(
        { published: true },
        { projection: { _id: 0, slug: 1, title: 1, customer: 1, state: 1, published: 1, createdAt: 1, images: { $slice: 1 } } },
      )
      .toArray()
    return shapeNavCaseStudies(JSON.parse(JSON.stringify(docs)))
  },
  ["layout-nav-case-studies-v1"],
  { tags: [LAYOUT_DATA_TAG], revalidate: LAYOUT_DATA_REVALIDATE_SECONDS },
)

export const getNavCaseStudies = cache(async (): Promise<NavCaseStudy[]> => {
  try {
    return await fetchNavCaseStudies()
  } catch {
    return []
  }
})

// Header "Blog" menu: the latest published posts. Also tagged BLOGS_CACHE_TAG,
// which every admin blog write already revalidates. No post body is read.
const fetchNavBlogPosts = unstable_cache(
  async (): Promise<NavBlogPost[]> => {
    const client = await clientPromise
    const docs = await client
      .db()
      .collection("blogs")
      .find(
        { $or: [{ isPublished: true }, { isPublished: { $exists: false } }] },
        { projection: { _id: 1, title: 1, slug: 1, topImage: 1, publishedAt: 1, createdAt: 1, isPublished: 1 } },
      )
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(NAV_BLOG_LIMIT * 4)
      .toArray()
    return shapeNavBlogPosts(JSON.parse(JSON.stringify(docs)))
  },
  ["layout-nav-blog-posts-v1"],
  { tags: [LAYOUT_DATA_TAG, BLOGS_CACHE_TAG], revalidate: LAYOUT_DATA_REVALIDATE_SECONDS },
)

export const getNavBlogPosts = cache(async (): Promise<NavBlogPost[]> => {
  try {
    return await fetchNavBlogPosts()
  } catch {
    return []
  }
})

// Header "Spare Parts" menu: a capped, machine-grouped selection of published
// parts. Minimal projection; shaping is in lib/navSpareParts.ts.
const fetchNavSpareParts = unstable_cache(
  async (): Promise<NavSparePartGroup[]> => {
    const client = await clientPromise
    const docs = await client
      .db()
      .collection("spare_parts")
      .find(
        { isPublished: true },
        { projection: { _id: 0, name: 1, slug: 1, category: 1, order: 1, isPublished: 1, compatibleProductNames: { $slice: 1 }, images: { $slice: 1 } } },
      )
      .toArray()
    return shapeNavSpareParts(JSON.parse(JSON.stringify(docs)))
  },
  ["layout-nav-spare-parts-v1"],
  { tags: [LAYOUT_DATA_TAG], revalidate: LAYOUT_DATA_REVALIDATE_SECONDS },
)

export const getNavSpareParts = cache(async (): Promise<NavSparePartGroup[]> => {
  try {
    return await fetchNavSpareParts()
  } catch {
    return []
  }
})
