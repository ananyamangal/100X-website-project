/**
 * Normalize Mongo / JSON blog documents for JSON responses and the client UI.
 */

export function mongoIdToString(id: unknown): string {
  if (id == null) return ''
  if (typeof id === 'string') return id
  if (typeof id === 'object' && id !== null && '$oid' in id) {
    return String((id as { $oid: string }).$oid)
  }
  try {
    return String(id)
  } catch {
    return ''
  }
}

function asStringHtml(v: unknown): string {
  if (typeof v === 'string') return v
  if (v == null) return ''
  return String(v)
}

export function serializeBlog(doc: Record<string, unknown>): Record<string, unknown> & { _id: string; id: string } {
  const _id = mongoIdToString(doc._id)

  let inlineImages = doc.inlineImages
  if (!Array.isArray(inlineImages)) inlineImages = []
  else inlineImages = inlineImages.filter((u) => typeof u === 'string')

  let publishedRaw = doc.publishedAt
  let publishedAt: string
  if (publishedRaw instanceof Date) publishedAt = publishedRaw.toISOString()
  else if (typeof publishedRaw === 'string' && publishedRaw.trim()) publishedAt = publishedRaw
  else publishedAt = new Date(0).toISOString()

  return {
    ...doc,
    _id,
    id: _id,
    title: typeof doc.title === 'string' ? doc.title : asStringHtml(doc.title),
    excerpt: asStringHtml(doc.excerpt),
    content: asStringHtml(doc.content),
    topImage: typeof doc.topImage === 'string' ? doc.topImage : asStringHtml(doc.topImage),
    inlineImages,
    category: typeof doc.category === 'string' ? doc.category : asStringHtml(doc.category),
    author: typeof doc.author === 'string' ? doc.author : asStringHtml(doc.author),
    isPublished: Boolean(doc.isPublished),
    publishedAt,
    order: typeof doc.order === 'number' && Number.isFinite(doc.order) ? doc.order : undefined,
  }
}

export function serializeBlogs(docs: unknown[]): Array<Record<string, unknown> & { _id: string; id: string }> {
  if (!Array.isArray(docs)) return []
  return docs.filter((d) => d && typeof d === 'object').map((d) => serializeBlog(d as Record<string, unknown>))
}
