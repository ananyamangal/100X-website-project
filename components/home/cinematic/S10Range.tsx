"use client"

import React from "react"
import Link from "next/link"
import ScrollReveal from "@/components/cinematic/ScrollReveal"
import { ArrowRight } from "lucide-react"

interface Product {
  _id?: string
  slug?: string
  name: string
  imageUrls?: string[]
  shortDescription?: string
  priceRange?: string
  category?: string
  badges?: string[]
}

interface Props {
  products: Product[]
}

const RANGE_LABELS = [
  {
    match: ["portable", "hand", "backpack"],
    sub: "The Individual's Machine",
    desc: "Single operator. 5–12 litre tank. 1–3 acres per fill. For farmers, PCOs, and health workers.",
  },
  {
    match: ["vehicle", "mounted", "truck"],
    sub: "The Institution's Machine",
    desc: "20–100 litre tank. 10–15m fog throw. Continuous operation. For municipalities and health drives.",
  },
  {
    match: ["double", "dual", "barrel"],
    sub: "The City's Machine",
    desc: "Simultaneous bilateral output. Wide arterials covered in one pass. For high-density municipal operations.",
  },
]

function getRangeLabel(product: Product) {
  const name = (product.name + " " + (product.category || "")).toLowerCase()
  for (const r of RANGE_LABELS) {
    if (r.match.some((m) => name.includes(m))) return r
  }
  return null
}

export default function S10Range({ products }: Props) {
  const displayProducts = products.slice(0, 6)

  return (
    <section className="py-24 md:py-36 bg-white">
      <div className="container mx-auto px-6 md:px-10">

        {/* Section header */}
        <div className="mb-14 md:mb-18">
          <ScrollReveal animation="fade-up">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-6 h-px bg-brand-600" />
              <span className="eyebrow text-brand-600">Product Range</span>
            </div>
          </ScrollReveal>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <ScrollReveal animation="fade-up" delay={80}>
              <h2
                className="text-gray-900 text-balance"
                style={{
                  fontSize: "clamp(2rem, 4vw, 3.5rem)",
                  fontWeight: 800,
                  lineHeight: 1.05,
                  letterSpacing: "-0.03em",
                }}
              >
                Find your machine.
              </h2>
            </ScrollReveal>
            <ScrollReveal animation="fade-up" delay={120}>
              <Link
                href="/products"
                className="inline-flex items-center gap-2 text-brand-600 hover:text-brand-700 font-600 transition-colors group flex-shrink-0"
              >
                Full catalogue
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </ScrollReveal>
          </div>
        </div>

        {/* Product grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayProducts.map((product, i) => {
            const href = `/products/${product.slug || product._id}`
            const image = product.imageUrls?.[0]
            const rangeLabel = getRangeLabel(product)

            return (
              <ScrollReveal key={product._id || i} animation="fade-up" delay={i * 80}>
                <Link
                  href={href}
                  className="group block rounded-2xl overflow-hidden border border-gray-100 hover:border-gray-200 hover:shadow-xl transition-all duration-500 bg-white"
                >
                  {/* Image */}
                  <div className="relative aspect-square overflow-hidden bg-gray-50">
                    {image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={image}
                        alt={product.name}
                        className="w-full h-full object-contain p-6 group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg
                          viewBox="0 0 100 100"
                          className="w-20 h-20 text-gray-200"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          aria-hidden="true"
                        >
                          <ellipse cx="50" cy="40" rx="25" ry="32" />
                          <rect x="72" y="32" width="22" height="6" rx="3" />
                          <path d="M94 33 L100 30 L100 38 L94 37 Z" />
                        </svg>
                      </div>
                    )}
                    {/* Badges */}
                    {product.badges && product.badges.length > 0 && (
                      <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                        {product.badges.slice(0, 2).map((badge) => (
                          <span
                            key={badge}
                            className="text-xs font-600 px-2 py-0.5 rounded-full bg-brand-600 text-white"
                          >
                            {badge}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-6">
                    {rangeLabel && (
                      <p className="eyebrow text-brand-600 mb-2 text-xs">{rangeLabel.sub}</p>
                    )}
                    <h3 className="text-gray-900 font-700 text-lg mb-2 leading-snug group-hover:text-brand-600 transition-colors">
                      {product.name}
                    </h3>
                    {rangeLabel ? (
                      <p className="text-gray-400 text-xs leading-relaxed mb-3">{rangeLabel.desc}</p>
                    ) : (
                      product.shortDescription && (
                        <p className="text-gray-400 text-xs leading-relaxed mb-3 line-clamp-2">
                          {product.shortDescription}
                        </p>
                      )
                    )}
                    {product.priceRange && (
                      <p className="text-brand-600 font-700 text-sm">{product.priceRange}</p>
                    )}
                  </div>
                </Link>
              </ScrollReveal>
            )
          })}
        </div>

        {/* Bottom CTA */}
        <ScrollReveal animation="fade-up" delay={200} className="mt-12 text-center">
          <Link
            href="/products"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-gray-900 hover:bg-gray-800 text-white font-600 rounded-full transition-all duration-200 text-sm"
          >
            View full range <ArrowRight size={16} />
          </Link>
        </ScrollReveal>
      </div>
    </section>
  )
}
