"use client"

import React from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Calendar, User } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { plainTextFromHtml } from "@/lib/rich-text"
import { blogPostSlug } from "@/lib/blogSlug"

// Stable date formatting (avoids locale-based hydration mismatches).
// Mirrors the helper in app/page.tsx — duplicated for Phase 1 to keep the
// move purely local. Dedupe later if needed.
const formatDate = (value: string | Date | undefined) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
};

interface Props {
  posts: any[];
  hasApiPosts: boolean;
}

export default function BlogBlock({ posts, hasApiPosts }: Props) {
  return (
    <section className="py-16 md:py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <p className="eyebrow text-brand-600 mb-3">Knowledge Centre</p>
          <h2 className="text-display-xs text-gray-900 mb-4 text-balance">Industry insights &amp; guides.</h2>
          <p className="text-base md:text-lg text-gray-500 max-w-2xl mx-auto">
            Practical articles on thermal fogging, pest control, agricultural equipment, and government procurement — written by our technical team.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {posts.slice(0, 3).map((post, index) => (
            <Card
              key={post.id || post._id || post.slug || index}
              className="overflow-hidden hover:shadow-xl transition-all duration-300"
            >
              <Image src={post.topImage || post.image || "/placeholder.svg"} alt={post.title} width={480} height={192} className="w-full h-48 object-cover" decoding="async" />


              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-2">
                  {post.category && <p className="eyebrow text-brand-600">{post.category}</p>}
                  <span className="text-xs text-gray-400 ml-auto">{post.readTime}</span>
                </div>
                <h3 className="font-700 text-gray-900 text-base mb-2 line-clamp-2">{post.title}</h3>
                <p className="text-gray-500 text-sm mb-4 line-clamp-3">{plainTextFromHtml(post.excerpt || "")}</p>
                <div className="flex items-center justify-between text-xs text-gray-400 mb-4">
                  <span className="flex items-center gap-1">
                    <User size={12} aria-hidden />
                    {post.author || "100x Circle"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar size={12} aria-hidden />
                    {formatDate(post.date)}
                  </span>
                </div>
                {hasApiPosts ? (
                  <Link href={`/blog/${blogPostSlug(post)}`} className="inline-flex items-center gap-1.5 text-brand-600 hover:text-brand-700 font-600 text-sm transition-colors">
                    Read article <ArrowRight size={13} />
                  </Link>
                ) : (
                  <Link href="/blog" className="inline-flex items-center gap-1.5 text-brand-600 hover:text-brand-700 font-600 text-sm transition-colors">
                    View blog <ArrowRight size={13} />
                  </Link>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link href="/blog" className="inline-flex items-center gap-2 px-6 py-3 border border-brand-200 text-brand-600 hover:bg-brand-50 font-600 rounded-full text-sm transition-colors">
            View all articles <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  )
}
