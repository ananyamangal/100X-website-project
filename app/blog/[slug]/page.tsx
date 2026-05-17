import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Calendar, ChevronLeft, User } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RichContent } from "@/components/RichContent"
import { ArticleJsonLd, BreadcrumbJsonLd } from "@/components/seo/ArticleJsonLd"
import { plainTextFromHtml } from "@/lib/rich-text"
import { getBlogBySlug } from "@/lib/blogsQuery"
import { blogPostSlug } from "@/lib/blogSlug"
import { SITE_URL, defaultOgImage } from "@/lib/seo/site-config"

export const dynamic = "force-dynamic"

function formatDate(value: string | Date | undefined) {
  if (!value) return ""
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  const day = String(d.getUTCDate()).padStart(2, "0")
  const month = String(d.getUTCMonth() + 1).padStart(2, "0")
  const year = d.getUTCFullYear()
  return `${day}/${month}/${year}`
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug: rawSlug } = await params
  const blog = await getBlogBySlug(rawSlug)
  if (!blog) {
    return {
      title: "Blog | 100x Circle",
      robots: { index: false, follow: true },
    }
  }
  const desc = plainTextFromHtml(blog.excerpt || "").slice(0, 155)
  const slug = blogPostSlug(blog)
  const url = `${SITE_URL}/blog/${slug}`
  const img = blog.topImage
    ? blog.topImage.startsWith("http")
      ? blog.topImage
      : `${SITE_URL}${String(blog.topImage).startsWith("/") ? "" : "/"}${blog.topImage}`
    : defaultOgImage

  return {
    title: `${blog.title} | 100x Circle`,
    description: desc || "Industry insights from 100x Circle.",
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      title: String(blog.title),
      description: desc,
      url,
      siteName: "100x Circle",
      locale: "en_IN",
      type: "article",
      images: [{ url: img, alt: String(blog.title) }],
    },
    twitter: {
      card: "summary_large_image",
      title: String(blog.title),
      description: desc || undefined,
      images: [img],
    },
  }
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug: rawSlug } = await params
  const blog = await getBlogBySlug(rawSlug)
  if (!blog) notFound()

  const slug = blogPostSlug(blog)
  const pageUrl = `${SITE_URL}/blog/${slug}`
  const inlineImages = Array.isArray(blog.inlineImages) ? (blog.inlineImages as string[]) : []
  const topImg = blog.topImage ? String(blog.topImage) : undefined

  return (
    <div className="pt-32 min-h-screen bg-gray-50">
      <ArticleJsonLd
        title={String(blog.title)}
        description={String(blog.excerpt || blog.content || "")}
        url={pageUrl}
        image={topImg}
        datePublished={typeof blog.publishedAt === "string" ? blog.publishedAt : undefined}
        authorName={typeof blog.author === "string" ? blog.author : undefined}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: SITE_URL },
          { name: "Blog", url: `${SITE_URL}/blog` },
          { name: String(blog.title), url: pageUrl },
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
          <span className="text-gray-900 line-clamp-1">{blog.title}</span>
        </nav>

        <article className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="relative h-72 md:h-96">
              <img
                src={blog.topImage || "/placeholder.svg"}
                alt={String(blog.title)}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/10" />
            </div>

            <div className="p-8 md:p-12">
              <div className="flex flex-wrap items-center gap-4 mb-6 text-gray-500">
                <Badge variant="secondary" className="text-sm">
                  {blog.category}
                </Badge>
                <span className="flex items-center gap-2 text-sm">
                  <User size={16} aria-hidden />
                  {blog.author}
                </span>
                <time dateTime={typeof blog.publishedAt === "string" ? blog.publishedAt : undefined} className="flex items-center gap-2 text-sm">
                  <Calendar size={16} aria-hidden />
                  {formatDate(blog.publishedAt)}
                </time>
                <span className="text-sm">{(blog as { readTime?: string }).readTime || "5 min read"}</span>
              </div>

              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">{blog.title}</h1>

              {blog.excerpt ? <RichContent html={String(blog.excerpt)} className="text-xl text-gray-600 mb-8" /> : null}

              {blog.content ? <RichContent html={String(blog.content)} className="text-lg text-gray-700" /> : null}

              {inlineImages.length > 0 && (
                <div className="mt-8 space-y-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Related Images</h2>
                  <div className="grid md:grid-cols-2 gap-6">
                    {inlineImages.map((imageUrl, idx) => (
                      <div key={idx} className="rounded-xl overflow-hidden shadow-lg">
                        <img
                          src={imageUrl}
                          alt={`Illustration ${idx + 1} for ${String(blog.title)}`}
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
                    <span className="text-green-600 font-semibold text-lg">{blog.author?.charAt(0) || "A"}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{blog.author}</p>
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
    </div>
  )
}
