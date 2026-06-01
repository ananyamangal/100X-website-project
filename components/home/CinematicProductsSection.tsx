"use client"

import React, { useState } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import ScrollReveal from "@/components/cinematic/ScrollReveal"
import CinematicProductCard from "./CinematicProductCard"

interface Product {
  _id?: string
  id?: string
  name: string
  imageUrls: string[]
  priceRange?: string
  rating?: number
  reviewsCount?: number
  shortDescription?: string
  category?: string
  badges?: string[]
  brochureUrl?: string
  whatsappMessageText?: string
}

interface Props {
  products: Product[]
  onBrochureDownload: (name: string, url?: string) => void
}

export default function CinematicProductsSection({ products, onBrochureDownload }: Props) {
  const categories = ["All", ...Array.from(new Set(products.map((p) => p.category).filter((c): c is string => Boolean(c))))]
  const [active, setActive] = useState("All")

  const filtered = active === "All" ? products : products.filter((p) => p.category === active)
  const displayed = filtered.slice(0, 6)

  return (
    <section id="products" className="py-20 md:py-28 bg-white">
      <div className="container mx-auto px-4 md:px-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <ScrollReveal animation="fade-up">
              <p className="eyebrow text-brand-600 mb-3">Our Products</p>
            </ScrollReveal>
            <ScrollReveal animation="fade-up" delay={100}>
              <h2 className="text-display-sm text-gray-900 text-balance">
                GeM-approved OEM.<br className="hidden md:block" /> India's most trusted fogger.
              </h2>
            </ScrollReveal>
          </div>
          <ScrollReveal animation="fade-left" delay={150}>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 text-brand-600 font-600 hover:text-brand-700 transition-colors group whitespace-nowrap"
            >
              View all products <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </ScrollReveal>
        </div>

        {/* Category filter tabs */}
        {categories.length > 2 && (
          <ScrollReveal animation="fade-up" delay={200}>
            <div className="flex flex-wrap gap-2 mb-10">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActive(cat)}
                  className={`px-4 py-1.5 rounded-full text-sm font-500 border transition-all ${
                    active === cat
                      ? "bg-brand-600 text-white border-brand-600"
                      : "text-gray-600 border-gray-200 hover:border-brand-400 hover:text-brand-600"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </ScrollReveal>
        )}

        {/* Product grid */}
        {displayed.length === 0 ? (
          <div className="py-20 text-center text-gray-400">No products in this category yet.</div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {displayed.map((product, i) => (
              <ScrollReveal key={product._id || product.id || i} animation="fade-up" delay={i * 70}>
                <CinematicProductCard
                  product={product}
                  index={i}
                  onBrochureDownload={onBrochureDownload}
                />
              </ScrollReveal>
            ))}
          </div>
        )}

        {/* Bottom CTA if more products */}
        {filtered.length > 6 && (
          <ScrollReveal animation="fade-up" delay={200}>
            <div className="flex justify-center mt-12">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 px-8 py-4 bg-brand-600 hover:bg-brand-700 text-white font-600 rounded-full transition-all hover:-translate-y-0.5 shadow-lg shadow-brand-900/20 hover:shadow-brand-900/30"
              >
                View All {filtered.length} Products <ArrowRight size={18} />
              </Link>
            </div>
          </ScrollReveal>
        )}
      </div>
    </section>
  )
}
