"use client"

import Link from "next/link"
import { ArrowRight, MessageCircle } from "lucide-react"
import { BUSINESS } from "@/lib/seo/site-config"

const GOV_BADGE_PRIORITY = ["BIS Approved", "ISI", "GeM", "GeM Registered", "Made in India", "Heavy Duty"]
const GOV_CATEGORIES = ["Fogging Machines", "Thermal Fogging Machines"]
const EXCLUDE_TERMS = ["trolley", "baggage", "power tiller", "tiller", "sprayer"]

export interface ProductSlim {
  _id: string
  name: string
  slug: string
  imageUrls: string[]
  badges: string[]
  category: string
}

function govScore(p: ProductSlim): number {
  const n = p.name.toLowerCase()
  if (p.badges.includes("BIS Approved")) return 10
  if (n.includes("double barrel")) return 8
  if (n.includes("vehicle") || n.includes("heavy")) return 7
  if (n.includes("isi") || n.includes("hdpe")) return 6
  if (p.badges.includes("Best Seller")) return 5
  if (p.badges.some(b => ["GeM", "GeM Registered"].includes(b))) return 4
  return 1
}

function specLine(p: ProductSlim): string {
  const n = p.name.toLowerCase()
  if (n.includes("double barrel")) return "Vehicle-mountable · Dual output · City-wide coverage"
  if (n.includes("vehicle")) return "Vehicle-mounted · High-capacity · Municipal-grade"
  if (n.includes("isi") || n.includes("hdpe")) return "ISI marked · IS 14855 (Part 1) · HDPE tank"
  if (n.includes("stainless") || n.includes("ss")) return "Stainless steel tank · Heavy-duty"
  if (n.includes("mini") || n.includes("small")) return "Portable · Single operator · Gram Panchayat use"
  if (n.includes("cold")) return "Cold ULV fogging · Indoor & outdoor"
  return "IS 14855 compliant · GeM listed"
}

export default function GovProductCarousel({ products }: { products: ProductSlim[] }) {
  const filtered = products
    .filter(p =>
      (GOV_CATEGORIES.includes(p.category) || p.badges.some(b => ["GeM", "GeM Registered"].includes(b))) &&
      !EXCLUDE_TERMS.some(t => p.name.toLowerCase().includes(t))
    )
    .sort((a, b) => govScore(b) - govScore(a))
    .slice(0, 6)

  if (filtered.length === 0) return null

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
      {filtered.map((p, i) => {
        const img = p.imageUrls?.[0]
        const govBadges = p.badges.filter(b => GOV_BADGE_PRIORITY.includes(b)).slice(0, 3)
        const cleanName = p.name.trim().replace(/\s+/g, " ")
        const productUrl = `/${p.slug}`
        const waText = `Hi 100X Circle, I'm interested in ${cleanName} for government procurement. Please share details.`
        const waHref = `https://wa.me/${BUSINESS.whatsappE164}?text=${encodeURIComponent(waText)}`

        return (
          <article
            key={p._id || p.slug}
            className="product-cinema-card group relative bg-white rounded-2xl overflow-hidden border border-gray-100/80 hover:border-brand-100"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            {/* Image */}
            <Link href={productUrl} className="block relative overflow-hidden bg-gray-50/60 aspect-[4/3]">
              {img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={img}
                  alt={cleanName}
                  className="w-full h-full object-contain p-5 transition-transform duration-700 group-hover:scale-[1.04]"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs font-500">No image</div>
              )}
              {/* Brand badge */}
              <div className="absolute top-2.5 left-2.5 flex items-center bg-white/90 backdrop-blur-sm rounded-full pl-1.5 pr-2.5 py-1 shadow-sm border border-gray-100/60">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo-main.png" alt="100X Circle" className="h-4 w-auto object-contain" />
              </div>
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-gray-900/0 group-hover:bg-gray-900/20 transition-colors duration-500 flex items-end justify-center pb-5 opacity-0 group-hover:opacity-100">
                <span className="bg-white text-gray-900 font-600 text-sm px-5 py-2 rounded-full flex items-center gap-2 shadow-xl translate-y-2 group-hover:translate-y-0 transition-transform duration-400">
                  View Product <ArrowRight size={13} />
                </span>
              </div>
            </Link>

            {/* Content */}
            <div className="p-5 pt-4">
              {/* Category + badges */}
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {p.category && (
                  <span className="eyebrow text-brand-600 text-[10px]">{p.category}</span>
                )}
                {govBadges.slice(0, 1).map((b, bi) => (
                  <span key={bi} className="text-[9px] font-700 uppercase tracking-widest px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-100">
                    {b}
                  </span>
                ))}
              </div>

              {/* Product name — must be highly visible */}
              <h3 className="font-700 text-gray-900 text-[1.0625rem] leading-snug mb-1.5 group-hover:text-brand-700 transition-colors line-clamp-2">
                <Link href={productUrl}>{cleanName}</Link>
              </h3>

              {/* Spec line */}
              <p className="text-xs text-gray-500 mb-3 leading-relaxed">{specLine(p)}</p>

              {/* All gov badges */}
              {govBadges.length > 1 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {govBadges.slice(1).map((b, bi) => (
                    <span key={bi} className="text-[10px] bg-brand-50 text-brand-700 border border-brand-100 px-1.5 py-0.5 rounded-full font-600">
                      {b}
                    </span>
                  ))}
                </div>
              )}

              {/* CTA row */}
              <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                <Link
                  href={productUrl}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-600 text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-2.5 rounded-full transition-colors"
                >
                  Details <ArrowRight size={12} />
                </Link>
                <a
                  href={waHref}
                  target="_blank" rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-600 bg-brand-600 hover:bg-brand-700 text-white px-3 py-2.5 rounded-full transition-colors"
                >
                  <MessageCircle size={12} /> Quote
                </a>
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}
