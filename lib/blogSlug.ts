/**
 * SEO-friendly URL segment for a blog post. Uses title + short id suffix for uniqueness.
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

export function blogPostSlug(blog: { title?: string; _id?: unknown; id?: string }): string {
  const id = blogDocumentId(blog).replace(/[^a-f0-9]/gi, "")
  const short = id.length >= 6 ? id.slice(-6) : id || "post"
  return `${slugifyTitle(String(blog.title || "blog"))}-${short}`
}
