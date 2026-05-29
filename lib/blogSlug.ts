/**
 * Converts a string to a URL-safe kebab-case slug.
 */
export function slugifyTitle(title: string): string {
  const s = String(title || "blog")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return s || "blog"
}

export function blogDocumentId(blog: { _id?: unknown; id?: string }): string {
  const raw = blog._id ?? blog.id
  if (raw == null) return ""
  if (typeof raw === "object" && raw !== null && "$oid" in (raw as object)) {
    return String((raw as { $oid: string }).$oid)
  }
  return String(raw)
}

/**
 * Returns the canonical URL slug for a blog post.
 * Priority: explicit `slug` field > title-only slug > title+id fallback.
 * The title+id suffix (`-xxxxxx`) is kept for backward-compat with older posts
 * that don't have an explicit slug set.
 */
export function blogPostSlug(blog: { slug?: string; title?: string; _id?: unknown; id?: string }): string {
  // Admin-set explicit slug takes priority
  if (blog.slug && typeof blog.slug === "string" && blog.slug.trim()) {
    return blog.slug.trim()
  }
  // Legacy fallback: title + 6-char ObjectId suffix (keeps old URLs working)
  const id = blogDocumentId(blog).replace(/[^a-f0-9]/gi, "")
  const short = id.length >= 6 ? id.slice(-6) : id || "post"
  return `${slugifyTitle(String(blog.title || "blog"))}-${short}`
}

/**
 * Generate a clean SEO slug from a title (no ID suffix).
 * Use this when creating new blog posts.
 */
export function generateCleanSlug(title: string): string {
  return slugifyTitle(title)
}
