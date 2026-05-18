import type { Metadata } from "next"
import Link from "next/link"
import { Calendar, User } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { plainTextFromHtml } from "@/lib/rich-text"
import { getPublicBlogs } from "@/lib/blogsQuery"
import { blogPostSlug } from "@/lib/blogSlug"
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd"
import { ItemListJsonLd } from "@/components/seo/ItemListJsonLd"
import {
  blogStr,
  blogOptStr,
  blogImageSrc,
} from "@/lib/blogFieldGuards"

import { SITE_URL, SITE_NAME, defaultOgImage } from "@/lib/seo/site-config"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Fogging Machine Industry Blog | 100x Circle",
  description:
    "Practical tips, maintenance guides, and industry insights from 100x Circle — thermal fogging machine manufacturer serving customers across India.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: `Industry Blog | ${SITE_NAME}`,
    description:
      "Fogging machine maintenance, safety, and application guides from a leading Indian manufacturer.",
    url: `${SITE_URL}/blog`,
    siteName: SITE_NAME,
    locale: "en_IN",
    type: "website",
    images: [{ url: defaultOgImage }],
  },
  twitter: {
    card: "summary_large_image",
    title: `Industry Blog | ${SITE_NAME}`,
    description: "Thermal fogging insights and equipment guides from 100x Circle.",
    images: [defaultOgImage],
  },
} satisfies Metadata

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

export default async function BlogIndexPage() {
  // Hard guard: if getPublicBlogs throws (Mongo timeout, etc.) we
  // still render the empty-state branch rather than crash the route.
  let posts: Array<Record<string, unknown>> = []
  try {
    posts = await getPublicBlogs()
  } catch {
    posts = []
  }

  const itemListEntries: { name: string; url: string; image?: string }[] = []
  for (const p of posts.slice(0, 20)) {
    const slug = blogPostSlug(p)
    if (!slug) continue
    const title = blogStr(p.title)
    const topImage = blogOptStr(p.topImage)
    itemListEntries.push({
      name: title || "Blog post",
      url: `/blog/${slug}`,
      image: topImage,
    })
  }

  return (
    <div className="pt-32 min-h-screen bg-gray-50">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Blog", url: "/blog" },
        ]}
      />
      <ItemListJsonLd
        name="100x Circle blog — fogging machine insights"
        url="/blog"
        items={itemListEntries}
      />
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-purple-100 text-purple-800 hover:bg-purple-200">Blog</Badge>
          <h1 className="text-5xl font-bold text-gray-800 mb-4">Mosquito Fogging Machine Manufacturer — Industry Insights &amp; Tips</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Stay updated with fogging methods, maintenance, safety practices, and application guides from 100x Circle.
          </p>
        </div>

        {posts.length === 0 ? (
          // Empty state. Shown when getPublicBlogs() returns no rows
          // (typically: DB unreachable from this environment, or no
          // posts have been published yet). Production with active
          // posts never renders this branch.
          <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-16 px-6 text-center max-w-3xl mx-auto">
            <p className="mx-auto max-w-xl text-base md:text-lg text-gray-600 leading-relaxed">
              New industry insights, maintenance guides, and application tips are on the way. In the meantime, explore our product range or get in touch with our team.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link
                href="/products"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-green-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-green-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
              >
                Browse Products
              </Link>
              <Link
                href="/contact-us"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-800 transition-all hover:-translate-y-0.5 hover:border-gray-400 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-600 focus-visible:ring-offset-2"
              >
                Contact Us
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            {posts.map((post, index) => {
              const id = blogOptStr(post._id) ?? String(index)
              const title = blogStr(post.title, "Blog post")
              const excerpt = blogStr(post.excerpt)
              const category = blogStr(post.category)
              const author = blogStr(post.author)
              const readTime = blogOptStr((post as { readTime?: unknown }).readTime) ?? "5 min read"
              const slug = blogPostSlug(post)
              if (!slug) return null
              return (
                <Card key={id} className="overflow-hidden hover:shadow-xl transition-all duration-300 border-0 shadow-lg">
                  <Link href={`/blog/${slug}`} className="block">
                    <img
                      src={blogImageSrc(post.topImage)}
                      alt={title}
                      className="w-full h-48 object-cover"
                    />
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-3">
                        {category ? <Badge variant="secondary">{category}</Badge> : <span />}
                        <span className="text-sm text-gray-500">{readTime}</span>
                      </div>
                      <h2 className="text-xl font-bold text-gray-800 mb-3 line-clamp-2">{title}</h2>
                      <p className="text-gray-600 mb-4 line-clamp-4">{plainTextFromHtml(excerpt)}</p>
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <User size={16} aria-hidden className="text-gray-400" />
                          {author || "100x Circle"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar size={16} aria-hidden className="text-gray-400" />
                          {formatDate(post.publishedAt)}
                        </span>
                      </div>
                      <span className="mt-4 inline-block text-purple-600 font-semibold text-sm">Read article →</span>
                    </CardContent>
                  </Link>
                </Card>
              )
            })}
          </div>
        )}

        <div className="text-center">
          <Link href="/" className="text-green-600 font-semibold hover:underline">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
