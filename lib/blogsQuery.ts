import { cache } from "react"
import { unstable_cache } from "next/cache"
import { ObjectId } from "mongodb"
import clientPromise from "@/lib/mongodb"
import { serializeBlog, serializeBlogs } from "@/lib/blogSerialize"
import { blogPostSlug } from "@/lib/blogSlug"

/**
 * Cache tag for every public blog read below. Admin blog writes call
 * `revalidateTag(BLOGS_CACHE_TAG)` so edits go live immediately instead of
 * waiting out the time-based revalidation.
 */
export const BLOGS_CACHE_TAG = "blogs"

/** Published or legacy documents without isPublished flag */
const publishedMatch = {
  $or: [{ isPublished: true }, { isPublished: { $exists: false } }],
} as const

type SerializedBlog = Record<string, unknown> & { _id: string; id: string }

// unstable_cache stores JSON, which would turn BSON Dates (createdAt,
// updatedAt) into strings. Callers type-check these fields (e.g. the article
// page only uses `updatedAt` when it is a string), so a cached read must hand
// back exactly what an uncached read does — Dates are tagged on the way in
// and revived on the way out.
function encodeDates(doc: SerializedBlog): SerializedBlog {
  const out: Record<string, unknown> = { ...doc }
  for (const [k, v] of Object.entries(out)) {
    if (v instanceof Date) out[k] = { __date: v.toISOString() }
  }
  return out as SerializedBlog
}

function reviveDates(doc: SerializedBlog): SerializedBlog {
  const out: Record<string, unknown> = { ...doc }
  for (const [k, v] of Object.entries(out)) {
    if (v && typeof v === "object" && typeof (v as { __date?: unknown }).__date === "string") {
      out[k] = new Date((v as { __date: string }).__date)
    }
  }
  return out as SerializedBlog
}

// Errors are thrown (not swallowed) inside the cached functions so a DB
// hiccup is never cached as "no blogs" — the public wrappers below catch.
const fetchPublicBlogList = unstable_cache(
  async () => {
    const client = await clientPromise
    const blogs = await client
      .db()
      .collection("blogs")
      .aggregate([
        { $match: publishedMatch },
        {
          $addFields: {
            orderSort: { $ifNull: ["$order", Number.MAX_SAFE_INTEGER] },
          },
        },
        { $sort: { orderSort: 1, publishedAt: -1 } },
        // The article body is ~95% of the collection's bytes and no list
        // consumer renders it — getBlogBySlug fetches it per post instead.
        { $project: { orderSort: 0, content: 0 } },
      ])
      .toArray()
    return serializeBlogs(blogs as unknown[]).map(encodeDates)
  },
  ["public-blog-list-v1"],
  { tags: [BLOGS_CACHE_TAG], revalidate: 120 },
)

function fetchPublicBlogById(id: string) {
  return unstable_cache(
    async () => {
      const client = await clientPromise
      const doc = await client
        .db()
        .collection("blogs")
        .findOne({ _id: new ObjectId(id), $or: [...publishedMatch.$or] })
      return doc ? encodeDates(serializeBlog(doc as unknown as Record<string, unknown>)) : null
    },
    ["public-blog-by-id-v1", id],
    { tags: [BLOGS_CACHE_TAG], revalidate: 300 },
  )()
}

/**
 * Every published post, in display order, WITHOUT the `content` body (it
 * comes back as ""). Use getBlogBySlug for a full article.
 */
export const getPublicBlogs = cache(async (): Promise<SerializedBlog[]> => {
  try {
    return (await fetchPublicBlogList()).map(reviveDates)
  } catch {
    return []
  }
})

/** Full post (including `content`) for a public slug, or null. */
export const getBlogBySlug = cache(async (slug: string): Promise<SerializedBlog | null> => {
  const blogs = await getPublicBlogs()
  // Match by explicit slug first, then by generated title+id slug (backward compat)
  const hit =
    blogs.find((b) => typeof b.slug === "string" && b.slug.trim() === slug) ??
    blogs.find((b) => blogPostSlug(b) === slug) ??
    null
  if (!hit || !ObjectId.isValid(hit._id)) return null
  try {
    const full = await fetchPublicBlogById(hit._id)
    return full ? reviveDates(full) : null
  } catch {
    return null
  }
})

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
