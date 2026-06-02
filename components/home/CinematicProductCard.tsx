"use client"

import React from "react"
import Link from "next/link"
import { ArrowRight, MessageCircle } from "lucide-react"
import { BUSINESS } from "@/lib/seo/site-config"

interface Product {
  _id?: string
  id?: string
  slug?: string
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
  product: Product
  index?: number
  onBrochureDownload?: (name: string, url?: string) => void
}

export default function CinematicProductCard({ product, index = 0, onBrochureDownload }: Props) {
  const id = product._id || product.id || ""
  const productPath = product.slug || id
  const img = product.imageUrls?.[0] || "/placeholder.svg"
  const waText = product.whatsappMessageText || `Hi, I'm interested in ${product.name}. Please share pricing.`
  const waHref = `https://wa.me/${BUSINESS.whatsappE164}?text=${encodeURIComponent(waText)}`

  return (
    <article
      className="product-cinema-card group relative bg-white rounded-2xl overflow-hidden border border-gray-100/80 hover:border-brand-100"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Image container */}
      <Link href={`/products/${productPath}`} className="block relative overflow-hidden bg-gray-50/60 aspect-[4/3]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img}
          alt={product.name}
          className="w-full h-full object-contain p-5 transition-transform duration-700 group-hover:scale-[1.04]"
          loading="lazy"
          decoding="async"
        />

        {/* Badge strip */}
        {product.badges && product.badges.length > 0 && (
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
            {product.badges.slice(0, 2).map((badge, i) => (
              <span key={i} className="text-[9px] font-700 uppercase tracking-widest px-2 py-1 rounded-full bg-brand-600 text-white">
                {badge}
              </span>
            ))}
          </div>
        )}

        {/* Price badge — top right */}
        {product.priceRange && (
          <div className="absolute top-3 right-3">
            <span className="text-xs font-700 text-brand-700 bg-brand-50 border border-brand-100 px-2.5 py-1 rounded-full">
              {product.priceRange}
            </span>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-cinema-900/0 group-hover:bg-cinema-900/30 transition-colors duration-500 flex items-end justify-center pb-5 opacity-0 group-hover:opacity-100">
          <span className="bg-white text-cinema-900 font-600 text-sm px-5 py-2 rounded-full flex items-center gap-2 shadow-xl translate-y-2 group-hover:translate-y-0 transition-transform duration-400">
            View Product <ArrowRight size={13} />
          </span>
        </div>
      </Link>

      {/* Content */}
      <div className="p-5 pt-4">
        {product.category && (
          <p className="eyebrow text-brand-600 mb-2">{product.category}</p>
        )}

        <h3 className="font-700 text-gray-900 text-[1.0625rem] leading-snug mb-3 group-hover:text-brand-700 transition-colors line-clamp-2">
          <Link href={`/products/${productPath}`}>
            {product.name}
          </Link>
        </h3>

        {product.shortDescription && (
          <p className="text-sm text-gray-400 leading-relaxed mb-4 line-clamp-2">
            {product.shortDescription.replace(/<[^>]*>/g, '')}
          </p>
        )}

        {/* CTA row */}
        <div className="flex items-center gap-2 pt-3 border-t border-gray-50">
          <Link
            href={`/products/${productPath}`}
            className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-600 text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-2.5 rounded-full transition-colors"
          >
            Details <ArrowRight size={12} />
          </Link>
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-600 text-white bg-brand-600 hover:bg-brand-700 px-3 py-2.5 rounded-full transition-colors"
          >
            <MessageCircle size={12} /> Quote
          </a>
        </div>
      </div>
    </article>
  )
}
