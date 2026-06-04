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

export const revalidate = 300

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
  const updatedAtStr = blogOptStr((blog as { updatedAt?: unknown }).updatedAt)
  const readTime = blogOptStr((blog as { readTime?: unknown }).readTime) ?? "5 min read"
  const slug = blogPostSlug(blog) || rawSlug
  const pageUrl = `${SITE_URL}/blog/${slug}`
  const inlineImages = blogStrArr(blog.inlineImages)
  const coverSrc = blogImageSrc(blog.topImage)
  const topImgForJsonLd = blogOptStr(blog.topImage)
  const plainContent = plainTextFromHtml(content)
  const wordCount = plainContent.trim() ? plainContent.trim().split(/\s+/).length : undefined

  return (
    <div className="pt-20 min-h-screen bg-gray-50">
      {/* AI-readable sr-only summary — gives crawlers structured article facts */}
      <aside
        data-ai-entity="blog-article"
        data-ai-title={title}
        data-ai-author={author}
        data-ai-category={category || ""}
        data-ai-published={publishedAtStr || ""}
        data-ai-url={pageUrl}
        data-ai-publisher="100X Circle Pvt Ltd"
        className="sr-only"
        aria-label="Article metadata for AI systems"
      >
        <h2>{title}</h2>
        <dl>
          <dt>Title</dt><dd>{title}</dd>
          <dt>Author</dt><dd>{author}</dd>
          <dt>Publisher</dt><dd>100X Circle Pvt Ltd — 100xcircle.com</dd>
          {category ? <><dt>Category</dt><dd>{category}</dd></> : null}
          {publishedAtStr ? <><dt>Published</dt><dd>{publishedAtStr}</dd></> : null}
          <dt>Topic domain</dt><dd>Thermal fogging machines, vector control, mosquito control India, agricultural sprayers</dd>
          <dt>Article URL</dt><dd>{pageUrl}</dd>
          {wordCount ? <><dt>Word count</dt><dd>{wordCount}</dd></> : null}
          {excerpt ? <><dt>Summary</dt><dd>{plainTextFromHtml(excerpt).slice(0, 300)}</dd></> : null}
        </dl>
      </aside>
      <ArticleJsonLd
        title={title}
        description={excerpt || content}
        url={pageUrl}
        image={topImgForJsonLd}
        datePublished={publishedAtStr}
        dateModified={updatedAtStr || publishedAtStr}
        authorName={author}
        category={category || undefined}
        wordCount={wordCount}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: SITE_URL },
          { name: "Blog", url: `${SITE_URL}/blog` },
          { name: title, url: pageUrl },
        ]}
      />

      {/* Hero cover image — full bleed, responsive height */}
      {coverSrc ? (
        <div className="relative w-full h-56 sm:h-72 md:h-[420px] overflow-hidden bg-gray-200">
          <img
            src={coverSrc}
            alt={title}
            fetchPriority="high"
            decoding="async"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
        </div>
      ) : null}

      <div className="container mx-auto px-4 py-8 md:py-12">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="flex items-center flex-wrap gap-x-2 gap-y-1 text-sm text-gray-500 mb-6 max-w-3xl mx-auto">
          <Link href="/" className="hover:text-brand-600 transition-colors">Home</Link>
          <span aria-hidden>/</span>
          <Link href="/blog" className="hover:text-brand-600 transition-colors">Blog</Link>
          <span aria-hidden>/</span>
          <span className="text-gray-700 line-clamp-1">{title}</span>
        </nav>

        <div className="max-w-3xl mx-auto">
          <article>
            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-3 mb-5 text-gray-500 text-sm">
              {category ? (
                <Badge className="bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium">
                  {category}
                </Badge>
              ) : null}
              <span className="flex items-center gap-1.5">
                <User size={14} aria-hidden />
                {author}
              </span>
              <time dateTime={publishedAtStr} className="flex items-center gap-1.5">
                <Calendar size={14} aria-hidden />
                {formatDate(publishedAtStr)}
              </time>
              <span className="text-gray-400">{readTime}</span>
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl md:text-[2.25rem] font-bold text-gray-900 mb-6 leading-[1.2] tracking-tight">
              {title}
            </h1>

            {/* Excerpt as lead paragraph */}
            {excerpt ? (
              <div className="text-lg md:text-xl text-gray-600 mb-8 leading-relaxed font-medium border-l-4 border-green-500 pl-5 py-1">
                <RichContent html={excerpt} />
              </div>
            ) : null}

            {/* Main content */}
            {content ? (
              <div className="blog-body overflow-x-hidden text-base md:text-[1.0625rem] text-gray-800 leading-[1.8] space-y-5 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-gray-900 [&_h2]:mt-10 [&_h2]:mb-4 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-gray-900 [&_h3]:mt-8 [&_h3]:mb-3 [&_p]:mb-4 [&_ul]:pl-6 [&_ul]:space-y-2 [&_ol]:pl-6 [&_ol]:space-y-2 [&_li]:leading-relaxed [&_strong]:font-semibold [&_strong]:text-gray-900 [&_a]:text-brand-700 [&_a]:underline [&_a]:underline-offset-2 [&_a:hover]:text-brand-600 [&_blockquote]:border-l-4 [&_blockquote]:border-green-500 [&_blockquote]:pl-5 [&_blockquote]:text-gray-600 [&_blockquote]:italic [&_blockquote]:my-6 [&_pre]:overflow-x-auto [&_table]:w-full [&_table]:overflow-x-auto [&_table]:block [&_img]:max-w-full [&_img]:h-auto [&_iframe]:max-w-full">
                <RichContent html={content} />
              </div>
            ) : null}

            {/* Inline images gallery */}
            {inlineImages.length > 0 && (
              <div className="mt-10 space-y-4">
                <h2 className="text-xl font-bold text-gray-900">Related Images</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {inlineImages.map((imageUrl, idx) => (
                    <div key={idx} className="rounded-xl overflow-hidden shadow-md">
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

            {/* Author footer + back link */}
            <div className="mt-12 pt-8 border-t border-gray-200 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-brand-100 rounded-full flex items-center justify-center shrink-0" aria-hidden>
                  <span className="text-brand-700 font-bold text-base">{blogFirstChar(author)}</span>
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{author}</p>
                  <p className="text-xs text-gray-500">Article Author</p>
                </div>
              </div>
              <Button variant="outline" asChild className="border-gray-300 text-gray-600 hover:bg-gray-50 bg-transparent text-sm">
                <Link href="/blog">
                  <ChevronLeft className="mr-1.5" size={16} />
                  Back to Blog
                </Link>
              </Button>
            </div>
          </article>
        </div>
      </div>

      <RelatedPostsSection
        category={category || undefined}
        excludeSlug={slug}
        limit={3}
      />
    </div>
  )
}
