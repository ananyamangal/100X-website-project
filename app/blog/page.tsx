import type { Metadata } from "next"
import Link from "next/link"
import { Calendar, User, ArrowRight } from "lucide-react"
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
  title: "Knowledge & Industry Insights | 100x Circle",
  description:
    "Practical tips, maintenance guides, and industry insights from 100x Circle — thermal fogging machine manufacturer serving customers across India.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: `Industry Insights | ${SITE_NAME}`,
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
    title: `Industry Insights | ${SITE_NAME}`,
    description: "Thermal fogging insights and equipment guides from 100x Circle.",
    images: [defaultOgImage],
  },
} satisfies Metadata

function formatDate(value: unknown) {
  const s = blogOptStr(value)
  if (!s) return ""
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
}

export default async function BlogIndexPage() {
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
    itemListEntries.push({ name: title || "Blog post", url: `/blog/${slug}`, image: topImage })
  }

  return (
    <div className="min-h-screen bg-white">
      <BreadcrumbJsonLd items={[{ name: "Home", url: "/" }, { name: "Blog", url: "/blog" }]} />
      <ItemListJsonLd name="100x Circle blog — fogging machine insights" url="/blog" items={itemListEntries} />

      {/* Hero */}
      <section className="bg-gray-950 pt-24 pb-14 md:pt-28 md:pb-16">
        <div className="container mx-auto px-4 md:px-6">
          <nav className="flex items-center gap-2 text-xs text-cinema-500 mb-8">
            <Link href="/" className="hover:text-cinema-300 transition-colors">Home</Link>
            <span>/</span>
            <span className="text-cinema-300">Blog</span>
          </nav>
          <div className="max-w-3xl">
            <p className="eyebrow text-brand-400 mb-4">Knowledge Centre</p>
            <h1 className="text-4xl md:text-5xl font-800 text-white mb-5 leading-tight text-balance">
              Industry insights & guides.
            </h1>
            <p className="text-cinema-300 text-lg leading-relaxed">
              Practical knowledge on thermal fogging, pest control, agricultural equipment, and public health operations.
            </p>
          </div>
        </div>
      </section>

      {/* Articles */}
      <section className="py-14 md:py-20 bg-white">
        <div className="container mx-auto px-4 md:px-6">
          {posts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-100 bg-gray-50 py-20 px-6 text-center max-w-2xl mx-auto">
              <p className="text-gray-500 text-base mb-6">
                New industry insights and guides are on the way. Explore our product range in the meantime.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link href="/products" className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 text-white font-600 rounded-full text-sm hover:bg-brand-700 transition-colors">
                  Browse Products <ArrowRight size={14} />
                </Link>
                <Link href="/contact-us" className="inline-flex items-center gap-2 px-6 py-3 border border-gray-200 text-gray-700 font-600 rounded-full text-sm hover:border-gray-400 transition-colors">
                  Contact Us
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((post, index) => {
                const id = blogOptStr(post._id) ?? String(index)
                const title = blogStr(post.title, "Blog post")
                const excerpt = blogStr(post.excerpt)
                const category = blogStr(post.category)
                const author = blogStr(post.author)
                const readTime = blogOptStr((post as { readTime?: unknown }).readTime) ?? "5 min read"
                const slug = blogPostSlug(post)
                if (!slug) return null
                const imgSrc = blogImageSrc(post.topImage)
                return (
                  <article key={id} className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-lg hover:border-brand-200 hover:-translate-y-1 transition-all duration-300 flex flex-col">
                    <Link href={`/blog/${slug}`} className="block overflow-hidden bg-gray-50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imgSrc}
                        alt={title}
                        className="w-full aspect-[16/9] object-cover group-hover:scale-[1.03] transition-transform duration-500"
                        loading={index < 3 ? "eager" : "lazy"}
                      />
                    </Link>
                    <div className="p-5 flex flex-col flex-1">
                      <div className="flex items-center justify-between mb-3">
                        {category && (
                          <span className="eyebrow text-brand-600">{category}</span>
                        )}
                        <span className="text-xs text-gray-400 ml-auto">{readTime}</span>
                      </div>
                      <Link href={`/blog/${slug}`}>
                        <h2 className="font-700 text-gray-900 text-lg leading-snug mb-2 group-hover:text-brand-700 transition-colors line-clamp-2">
                          {title}
                        </h2>
                      </Link>
                      <p className="text-gray-500 text-sm leading-relaxed mb-4 line-clamp-3 flex-1">
                        {plainTextFromHtml(excerpt)}
                      </p>
                      <div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t border-gray-50">
                        <span className="flex items-center gap-1">
                          <User size={13} aria-hidden />
                          {author || "100x Circle"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar size={13} aria-hidden />
                          {formatDate(post.publishedAt)}
                        </span>
                      </div>
                      <Link href={`/blog/${slug}`} className="mt-4 inline-flex items-center gap-1.5 text-brand-600 hover:text-brand-700 font-600 text-sm transition-colors group-hover:gap-2.5">
                        Read article <ArrowRight size={13} />
                      </Link>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
