import { cache } from "react"
import { unstable_cache } from "next/cache"
import clientPromise from "@/lib/mongodb"
import type { KnowledgeArticle, KnowledgeArticleSummary } from "@/lib/knowledge/types"

/**
 * Cache tag for every public knowledge read. Admin writes call
 * `revalidateTag(KNOWLEDGE_CACHE_TAG)` so edits go live immediately.
 */
export const KNOWLEDGE_CACHE_TAG = "knowledge"

const COLLECTION = "knowledge_articles"

/** Fields that never reach the renderer (Mongo internals / audit). */
function toArticle(doc: Record<string, unknown>): KnowledgeArticle {
  const { _id, createdAt, updatedAt, ...rest } = doc
  void _id
  void createdAt
  void updatedAt
  return rest as unknown as KnowledgeArticle
}

// Thrown (not swallowed) inside the cached fn so a DB hiccup is never cached
// as "no articles"; the public wrappers below catch.
const fetchPublishedArticles = unstable_cache(
  async (): Promise<KnowledgeArticle[]> => {
    const client = await clientPromise
    const docs = await client
      .db()
      .collection(COLLECTION)
      .find({ isPublished: true })
      .sort({ order: 1 })
      .toArray()
    return docs.map((d) => toArticle(d as unknown as Record<string, unknown>))
  },
  ["knowledge-published-v1"],
  { tags: [KNOWLEDGE_CACHE_TAG], revalidate: 300 },
)

/** All published knowledge articles, full documents, in hub order. */
export const getPublishedKnowledgeArticles = cache(async (): Promise<KnowledgeArticle[]> => {
  try {
    return await fetchPublishedArticles()
  } catch {
    return []
  }
})

/** One published article by slug, or null. */
export const getKnowledgeArticleBySlug = cache(
  async (slug: string): Promise<KnowledgeArticle | null> => {
    const all = await getPublishedKnowledgeArticles()
    return all.find((a) => a.slug === slug) ?? null
  },
)

/** Hub-list projection for /knowledge and hasPart. */
export const getKnowledgeSummaries = cache(async (): Promise<KnowledgeArticleSummary[]> => {
  const all = await getPublishedKnowledgeArticles()
  return all.map((a) => ({
    slug: a.slug,
    title: a.title,
    metaDescription: a.metaDescription,
    tags: a.tags,
    readTime: a.byline.readTime,
    order: a.order,
    isPublished: a.isPublished,
  }))
})

/** For generateStaticParams. */
export async function getAllKnowledgeSlugs(): Promise<{ slug: string }[]> {
  const all = await getPublishedKnowledgeArticles()
  return all.map((a) => ({ slug: a.slug }))
}
