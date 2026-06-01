"use client"

import React from "react"
import Link from "next/link"
import { ArrowRight, Download, MessageCircle, Star } from "lucide-react"
import { BUSINESS } from "@/lib/seo/site-config"

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
  product: Product
  index?: number
  onBrochureDownload?: (name: string, url?: string) => void
}

export default function CinematicProductCard({ product, index = 0, onBrochureDownload }: Props) {
  const id = product._id || product.id || ""
  const img = product.imageUrls?.[0] || "/placeholder.svg"
  const waText = product.whatsappMessageText || `Hi, I'm interested in ${product.name}. Please share pricing.`
  const waHref = `https://wa.me/${BUSINESS.whatsappE164}?text=${encodeURIComponent(waText)}`

  return (
    <article
      className="product-cinema-card group relative bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-2xl border border-gray-100"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Image container */}
      <div className="relative overflow-hidden bg-gray-50 aspect-[4/3]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img}
          alt={product.name}
          className="w-full h-full object-contain p-4 transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
          decoding="async"
        />

        {/* Badge strip */}
        {product.badges && product.badges.length > 0 && (
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
            {product.badges.slice(0, 2).map((badge, i) => (
              <span
                key={i}
                className="text-[10px] font-700 uppercase tracking-wide px-2 py-0.5 rounded-full bg-brand-600 text-white shadow-sm"
              >
                {badge}
              </span>
            ))}
          </div>
        )}

        {/* Quick-action overlay */}
        <div className="absolute inset-0 bg-cinema-900/0 group-hover:bg-cinema-900/40 transition-colors duration-500 flex items-center justify-center opacity-0 group-hover:opacity-100">
          <Link
            href={`/products/${id}`}
            className="bg-white text-cinema-900 font-600 text-sm px-5 py-2.5 rounded-full flex items-center gap-2 shadow-lg hover:bg-brand-600 hover:text-white transition-colors"
          >
            View Product <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Category */}
        {product.category && (
          <p className="eyebrow text-brand-600 mb-1.5">{product.category}</p>
        )}

        {/* Name */}
        <h3 className="font-700 text-gray-900 text-lg leading-snug mb-2 group-hover:text-brand-700 transition-colors">
          <Link href={`/products/${id}`} className="hover:underline underline-offset-2">
            {product.name}
          </Link>
        </h3>

        {/* Rating */}
        {product.rating && (
          <div className="flex items-center gap-1.5 mb-3">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  size={12}
                  className={s <= Math.floor(product.rating!) ? "text-yellow-400 fill-yellow-400" : "text-gray-200 fill-gray-200"}
                />
              ))}
            </div>
            <span className="text-xs text-gray-500 font-500">
              {product.rating} ({product.reviewsCount ?? 0})
            </span>
          </div>
        )}

        {/* Short description */}
        {product.shortDescription && (
          <p className="text-sm text-gray-500 leading-relaxed mb-4 line-clamp-2">
            {product.shortDescription.replace(/<[^>]*>/g, '')}
          </p>
        )}

        {/* Price + CTAs */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          {product.priceRange && (
            <span className="font-700 text-brand-700 text-base">{product.priceRange}</span>
          )}
          <div className="flex items-center gap-2 ml-auto">
            {onBrochureDownload && (
              <button
                onClick={() => onBrochureDownload(product.name, product.brochureUrl)}
                className="p-2 rounded-lg text-gray-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                aria-label="Download brochure"
              >
                <Download size={16} />
              </button>
            )}
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-600 text-white bg-brand-600 hover:bg-brand-700 px-3 py-2 rounded-lg transition-colors"
            >
              <MessageCircle size={13} /> Quote
            </a>
          </div>
        </div>
      </div>
    </article>
  )
}
