import type { Metadata } from "next"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { plainTextFromHtml } from "@/lib/rich-text"
import { getPublicBlogs } from "@/lib/blogsQuery"
import { blogPostSlug } from "@/lib/blogSlug"
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd"
import { ItemListJsonLd } from "@/components/seo/ItemListJsonLd"

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

function formatDate(value: string | Date | undefined) {
  if (!value) return ""
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  const day = String(d.getUTCDate()).padStart(2, "0")
  const month = String(d.getUTCMonth() + 1).padStart(2, "0")
  const year = d.getUTCFullYear()
  return `${day}/${month}/${year}`
}

export default async function BlogIndexPage() {
  const posts = await getPublicBlogs()
  const itemListEntries: { name: string; url: string; image?: string }[] = []
  for (const p of posts.slice(0, 20)) {
    const slug = blogPostSlug(p)
    if (!slug) continue
    const title = typeof p.title === "string" ? p.title : ""
    const topImage =
      typeof p.topImage === "string" && p.topImage ? p.topImage : undefined
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
          <p className="text-center text-gray-600 py-16">New articles will appear here soon.</p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            {posts.map((post, index) => (
              <Card key={post._id || index} className="overflow-hidden hover:shadow-xl transition-all duration-300 border-0 shadow-lg">
                <Link href={`/blog/${blogPostSlug(post)}`} className="block">
                  <img
                    src={post.topImage || "/placeholder.svg"}
                    alt={String(post.title)}
                    className="w-full h-48 object-cover"
                  />
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <Badge variant="secondary">{post.category}</Badge>
                      <span className="text-sm text-gray-500">{(post as { readTime?: string }).readTime || "5 min read"}</span>
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-3 line-clamp-2">{post.title}</h2>
                    <p className="text-gray-600 mb-4 line-clamp-4">{plainTextFromHtml(post.excerpt || "")}</p>
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <User size={16} className="text-gray-400" />
                        {post.author}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar size={16} className="text-gray-400" />
                        {formatDate(post.publishedAt)}
                      </span>
                    </div>
                    <span className="mt-4 inline-block text-purple-600 font-semibold text-sm">Read article →</span>
                  </CardContent>
                </Link>
              </Card>
            ))}
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
