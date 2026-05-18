import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Calendar, ChevronLeft, User } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RichContent } from "@/components/RichContent"
import { ArticleJsonLd } from "@/components/seo/ArticleJsonLd"
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd"
import RelatedPostsSection from "@/components/RelatedPostsSection"
import { plainTextFromHtml } from "@/lib/rich-text"
import { getBlogBySlug } from "@/lib/blogsQuery"
import { blogPostSlug } from "@/lib/blogSlug"
import { SITE_URL, defaultOgImage } from "@/lib/seo/site-config"
import {
  blogStr,
  blogOptStr,
  blogStrArr,
  blogFirstChar,
  blogSafeStartsWith,
  blogImageSrc,
} from "@/lib/blogFieldGuards"

export const dynamic = "force-dynamic"

function formatDate(value: unknown) {
  const s = blogOptStr(value)
  if (!s) return ""
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return ""
  const day = String(d.getUTCDate()).padStart(2, "0")
  const month = String(d.getUTCMonth() + 1).padStart(2, "0")
  const year = d.getUTCFullYear()
  return `${day}/${month}/${year}`
}

/** Resolve a blog cover image to an absolute URL safely. */
function resolveCoverImage(topImage: unknown): string {
  const src = blogOptStr(topImage)
  if (!src) return defaultOgImage
  if (blogSafeStartsWith(src, "http")) return src
  return `${SITE_URL}${blogSafeStartsWith(src, "/") ? "" : "/"}${src}`
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug: rawSlug } = await params

  // Defensive: getBlogBySlug shouldn't throw, but if the DB is dark we
  // must still emit a valid Metadata object — never let metadata
  // generation crash the route.
  let blog: Record<string, unknown> | null = null
  try {
    blog = await getBlogBySlug(rawSlug)
  } catch {
    blog = null
  }

  if (!blog) {
    return {
      title: "Blog | 100x Circle",
      robots: { index: false, follow: true },
    }
  }
  const title = blogStr(blog.title, "Blog post")
  const desc = plainTextFromHtml(blogStr(blog.excerpt)).slice(0, 155)
  const slug = blogPostSlug(blog) || rawSlug
  const url = `${SITE_URL}/blog/${slug}`
  const img = resolveCoverImage(blog.topImage)

  return {
    title: `${title} | 100x Circle`,
    description: desc || "Industry insights from 100x Circle.",
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      title,
      description: desc,
      url,
      siteName: "100x Circle",
      locale: "en_IN",
      type: "article",
      images: [{ url: img, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc || undefined,
      images: [img],
    },
  }
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: rawSlug } = await params

  // Hard guard around the DB read.
  let blog: Record<string, unknown> | null = null
  try {
    blog = await getBlogBySlug(rawSlug)
  } catch {
    blog = null
  }
  if (!blog) notFound()

  // All field reads go through guards. Mongo can return any of these
  // as undefined, an object, or a non-string primitive — none of which
  // is allowed as a React child.
  const title = blogStr(blog.title, "Blog post")
  const excerpt = blogStr(blog.excerpt)
  const content = blogStr(blog.content)
  const author = blogStr(blog.author, "100x Circle")
  const category = blogStr(blog.category)
  const publishedAtStr = blogOptStr(blog.publishedAt)
  const readTime = blogOptStr((blog as { readTime?: unknown }).readTime) ?? "5 min read"
  const slug = blogPostSlug(blog) || rawSlug
  const pageUrl = `${SITE_URL}/blog/${slug}`
  const inlineImages = blogStrArr(blog.inlineImages)
  const coverSrc = blogImageSrc(blog.topImage)
  const topImgForJsonLd = blogOptStr(blog.topImage)

  return (
    <div className="pt-32 min-h-screen bg-gray-50">
      <ArticleJsonLd
        title={title}
        description={excerpt || content}
        url={pageUrl}
        image={topImgForJsonLd}
        datePublished={publishedAtStr}
        authorName={author}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: SITE_URL },
          { name: "Blog", url: `${SITE_URL}/blog` },
          { name: title, url: pageUrl },
        ]}
      />
      <div className="container mx-auto px-4 py-12">
        <nav aria-label="Breadcrumb" className="flex items-center space-x-2 text-sm text-gray-600 mb-8">
          <Link href="/" className="hover:text-green-600">
            Home
          </Link>
          <span aria-hidden>/</span>
          <Link href="/blog" className="hover:text-green-600">
            Blog
          </Link>
          <span aria-hidden>/</span>
          <span className="text-gray-900 line-clamp-1">{title}</span>
        </nav>

        <article className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="relative h-72 md:h-96">
              <img
                src={coverSrc}
                alt={title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/10" />
            </div>

            <div className="p-8 md:p-12">
              <div className="flex flex-wrap items-center gap-4 mb-6 text-gray-500">
                {category ? (
                  <Badge variant="secondary" className="text-sm">
                    {category}
                  </Badge>
                ) : null}
                <span className="flex items-center gap-2 text-sm">
                  <User size={16} aria-hidden />
                  {author}
                </span>
                <time dateTime={publishedAtStr} className="flex items-center gap-2 text-sm">
                  <Calendar size={16} aria-hidden />
                  {formatDate(publishedAtStr)}
                </time>
                <span className="text-sm">{readTime}</span>
              </div>

              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">{title}</h1>

              {excerpt ? <RichContent html={excerpt} className="text-xl text-gray-600 mb-8" /> : null}

              {content ? <RichContent html={content} className="text-lg text-gray-700" /> : null}

              {inlineImages.length > 0 && (
                <div className="mt-8 space-y-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Related Images</h2>
                  <div className="grid md:grid-cols-2 gap-6">
                    {inlineImages.map((imageUrl, idx) => (
                      <div key={idx} className="rounded-xl overflow-hidden shadow-lg">
                        <img
                          src={imageUrl}
                          alt={`Illustration ${idx + 1} for ${title}`}
                          className="w-full h-auto object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-12 pt-8 border-t border-gray-200 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center" aria-hidden>
                    <span className="text-green-600 font-semibold text-lg">{blogFirstChar(author)}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{author}</p>
                    <p className="text-sm text-gray-500">Article Author</p>
                  </div>
                </div>
                <Button variant="outline" asChild className="border-gray-600 text-gray-600 hover:bg-gray-50 bg-transparent">
                  <Link href="/blog">
                    <ChevronLeft className="mr-2" size={20} />
                    Back to Blog
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </article>
      </div>
      <RelatedPostsSection
        category={category || undefined}
        excludeSlug={slug}
        limit={3}
      />
    </div>
  )
}
