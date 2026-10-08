import { blogPostSlug } from "@/lib/blogSlug"
import { navThumbUrl } from "@/lib/navProducts"

/**
 * Data for the header "Blog" menu: the latest published posts with their
 * canonical URL (/blog/<blogPostSlug>, the rule the blog index and the sitemap
 * use), a small cover thumbnail and the publish date. Database-free so the
 * shaping is unit-tested on plain objects; the cached reader is
 * getNavBlogPosts() in lib/layoutData.ts.
 */
export interface NavBlogPost {
  title: string
  href: string
  /** "8 Oct 2026" (publishedAt, else createdAt) or null — formatted here, in UTC like
   *  the blog index, so server and browser render the same text. */
  date: string | null
  thumb: string | null
}

export const NAV_BLOG_LIMIT = 6

/** Same rule as lib/blogsQuery.ts: published, or legacy rows without the flag. */
export const isPublishedBlog = (d: Record<string, unknown>) => d.isPublished === true || !("isPublished" in d)

function iso(v: unknown): string | null {
  const t = v instanceof Date ? v.getTime() : typeof v === "string" ? Date.parse(v) : NaN
  return Number.isFinite(t) ? new Date(t).toISOString() : null
}

/** Raw blog documents → the newest NAV_BLOG_LIMIT published posts. */
export function shapeNavBlogPosts(docs: Record<string, unknown>[]): NavBlogPost[] {
  return docs
    .filter((d) => d && isPublishedBlog(d) && typeof d.title === "string" && d.title.trim() !== "")
    .map((d) => ({ d, date: iso(d.publishedAt) ?? iso(d.createdAt) }))
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
    .slice(0, NAV_BLOG_LIMIT)
    .map(({ d, date }) => ({
      title: (d.title as string).trim(),
      href: `/blog/${blogPostSlug(d as { slug?: string; title?: string; _id?: unknown })}`,
      date: date && new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }),
      thumb: navThumbUrl(d.topImage),
    }))
}
