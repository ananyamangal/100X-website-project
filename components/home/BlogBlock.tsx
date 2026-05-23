"use client"

import React from "react"
import Link from "next/link"
import { ArrowRight, Calendar, User } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
        <div className="text-center mb-20">
          <Badge className="mb-6 bg-purple-100 text-purple-800 hover:bg-purple-200 text-lg px-6 py-2">
            Latest Blog Posts
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6">Mosquito Fogging Machine Manufacturer – Industry Insights & Tips</h2>
          <p className="text-xl text-gray-600 max-w-5xl mx-auto mb-4">
            As a leading <a className="text-blue-500" href="https://www.100xcircle.com/">mosquito fogging machine manufacturer</a>, 100x Circle shares practical industry insights, usage techniques, and expert guidance to help you get the best performance from your equipment.
          </p>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Stay updated with the latest fogging methods, maintenance tips, safety practices, and application guides for effective disinfection and pest control. Our insights are designed to help industries, Municipalities, Nagar Nigam, Nagar Palika & Panchayats to improve efficiency, coverage, and long-term machine performance.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {posts.slice(0, 3).map((post, index) => (
            <Card
              key={post.id || post._id || post.slug || index}
              className="overflow-hidden hover:shadow-xl transition-all duration-300"
            >
              <img src={post.topImage || post.image || "/placeholder.svg"} alt={post.title} className="w-full h-48 object-cover" />


              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="secondary">{post.category}</Badge>
                  <span className="text-sm text-gray-500">{post.readTime}</span>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-3 line-clamp-2">{post.title}</h3>
                <p className="text-gray-600 mb-4 line-clamp-3">{plainTextFromHtml(post.excerpt || "")}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <User size={16} className="text-gray-400" />
                    <span className="text-sm text-gray-600">{post.author}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar size={16} className="text-gray-400" />
                    <span className="text-sm text-gray-600">{formatDate(post.date)}</span>
                  </div>
                </div>
                {hasApiPosts ? (
                  <Button className="w-full bg-purple-600 hover:bg-purple-700" asChild>
                    <Link href={`/blog/${blogPostSlug(post)}`}>
                      Read Full Article <ArrowRight className="ml-2" size={16} />
                    </Link>
                  </Button>
                ) : (
                  <Button className="w-full bg-purple-600 hover:bg-purple-700" asChild>
                    <Link href="/blog">
                      View Blog <ArrowRight className="ml-2" size={16} />
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Button
            size="lg"
            variant="outline"
            className="border-purple-600 text-purple-600 hover:bg-purple-50 bg-transparent"
            asChild
          >
            <Link href="/blog">
              View All Blog Posts <ArrowRight className="ml-2" size={20} />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
