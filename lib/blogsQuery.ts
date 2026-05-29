import clientPromise from "@/lib/mongodb"
import { serializeBlogs } from "@/lib/blogSerialize"
import { blogPostSlug } from "@/lib/blogSlug"

/** Published or legacy documents without isPublished flag */
const publishedMatch = {
  $or: [{ isPublished: true }, { isPublished: { $exists: false } }],
} as const

export async function getPublicBlogs() {
  try {
    const client = await clientPromise
    const db = client.db()
    const blogs = await db
      .collection("blogs")
      .aggregate([
        { $match: publishedMatch },
        {
          $addFields: {
            orderSort: { $ifNull: ["$order", Number.MAX_SAFE_INTEGER] },
          },
        },
        { $sort: { orderSort: 1, publishedAt: -1 } },
        { $project: { orderSort: 0 } },
      ])
      .toArray()
    return serializeBlogs(blogs as unknown[])
  } catch {
    return []
  }
}

export async function getBlogBySlug(slug: string) {
  const blogs = await getPublicBlogs()
  // Match by explicit slug first, then by generated title+id slug (backward compat)
  return (
    blogs.find((b) => typeof b.slug === "string" && b.slug.trim() === slug) ??
    blogs.find((b) => blogPostSlug(b) === slug) ??
    null
  )
}

export async function getAllBlogSlugs() {
  const blogs = await getPublicBlogs()
  return blogs.map((b) => ({ slug: blogPostSlug(b) }))
}

/**
 * Fetch up to `limit` other published posts in the same category as the
 * given slug. Used by the related-posts surface on blog detail pages.
 * Falls back to "most recent other posts" when the source post has no
 * category, so the related rail is rarely empty.
 */
export async function getRelatedBlogPosts(
  category: string | undefined,
  excludeSlug: string,
  limit = 3,
) {
  const blogs = await getPublicBlogs()
  const filtered = blogs.filter((b) => blogPostSlug(b) !== excludeSlug)
  if (category) {
    const sameCat = filtered.filter(
      (b) => typeof b.category === "string" && b.category === category,
    )
    if (sameCat.length >= limit) return sameCat.slice(0, limit)
    // Fill remaining slots with most-recent other posts so the rail is full.
    const others = filtered.filter((b) => !sameCat.includes(b))
    return [...sameCat, ...others].slice(0, limit)
  }
  return filtered.slice(0, limit)
}
