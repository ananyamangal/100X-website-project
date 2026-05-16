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
  return blogs.find((b) => blogPostSlug(b) === slug) ?? null
}

export async function getAllBlogSlugs() {
  const blogs = await getPublicBlogs()
  return blogs.map((b) => ({ slug: blogPostSlug(b) }))
}
