import Link from "next/link"
import { ArrowRight, Calendar } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { blogPostSlug } from "@/lib/blogSlug"
import { getRelatedBlogPosts } from "@/lib/blogsQuery"

type Props = {
  category: string | undefined
  excludeSlug: string
  heading?: string
  limit?: number
}

function formatDate(value: unknown): string {
  if (typeof value !== "string" || !value) return ""
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  const day = String(d.getUTCDate()).padStart(2, "0")
  const month = String(d.getUTCMonth() + 1).padStart(2, "0")
  const year = d.getUTCFullYear()
  return `${day}/${month}/${year}`
}

export default async function RelatedPostsSection({
  category,
  excludeSlug,
  heading = "Keep reading",
  limit = 3,
}: Props) {
  const posts = await getRelatedBlogPosts(category, excludeSlug, limit)
  if (posts.length === 0) return null

  return (
    <section className="bg-white py-12 md:py-16" aria-labelledby="related-posts-heading">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex items-end justify-between mb-6 md:mb-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-purple-700">
              {category ?? "From the 100x Circle blog"}
            </p>
            <h2
              id="related-posts-heading"
              className="mt-1 text-2xl md:text-3xl font-bold text-gray-900"
            >
              {heading}
            </h2>
          </div>
          <Link
            href="/blog"
            className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-purple-700 hover:text-purple-800"
          >
            All articles
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>

        <ul className="grid md:grid-cols-3 gap-6 list-none">
          {posts.map((post) => {
            const slug = blogPostSlug(post)
            const title = typeof post.title === "string" ? post.title : "Blog post"
            const excerpt =
              typeof post.excerpt === "string" ? post.excerpt.slice(0, 140) : ""
            const topImage =
              typeof post.topImage === "string" && post.topImage
                ? post.topImage
                : undefined
            const cat = typeof post.category === "string" ? post.category : ""
            const date = formatDate(post.publishedAt)
            return (
              <li key={String(post._id)}>
                <Link
                  href={`/blog/${slug}`}
                  className="group block bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600 focus-visible:ring-offset-2"
                >
                  {topImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={topImage}
                      alt={title}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-44 object-cover"
                    />
                  ) : (
                    <div className="w-full h-44 bg-gradient-to-br from-purple-100 to-purple-50" />
                  )}
                  <div className="p-5">
                    {cat ? (
                      <Badge className="mb-2 bg-purple-100 text-purple-800 hover:bg-purple-200">
                        {cat}
                      </Badge>
                    ) : null}
                    <h3 className="text-base md:text-lg font-semibold text-gray-900 line-clamp-2 group-hover:text-purple-700 transition-colors">
                      {title}
                    </h3>
                    {excerpt ? (
                      <p className="mt-2 text-sm text-gray-600 line-clamp-3">{excerpt}</p>
                    ) : null}
                    {date ? (
                      <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-gray-500">
                        <Calendar size={12} aria-hidden="true" />
                        <time dateTime={String(post.publishedAt)}>{date}</time>
                      </p>
                    ) : null}
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
