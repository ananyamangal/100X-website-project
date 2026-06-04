"use client"

import React from "react"
import Link from "next/link"
import { ChevronRight, Award, ShieldCheck, Zap } from "lucide-react"

interface Props {
  name: string
  h1?: string
  tagline?: string
  category?: string
  badges?: string[]
  price?: string
  specs?: string[]   // first 3 used as hero bullets
  rating?: number
  reviewsCount?: number
  imageUrl?: string  // hero bg hint (blurred, dark overlay)
}

const BADGE_COLOR: Record<string, string> = {
  "Best Seller":  "bg-red-900/40 text-red-300 border-red-800/50",
  "GeM":          "bg-blue-900/40 text-blue-300 border-blue-800/50",
  "GeM logo":     "bg-blue-900/40 text-blue-300 border-blue-800/50",
  "BIS Approved": "bg-amber-900/40 text-amber-300 border-amber-800/50",
}

function getBadgeClass(b: string) {
  return BADGE_COLOR[b] ?? "bg-white/5 text-cinema-300 border-white/10"
}

function specIcon(spec: string) {
  const l = spec.toLowerCase()
  if (l.includes("engine") || l.includes("power") || l.includes("hp")) return <Zap size={14} />
  if (l.includes("bis") || l.includes("iso") || l.includes("gem") || l.includes("cert")) return <Award size={14} />
  return <ShieldCheck size={14} />
}

export default function ProductCinematicHero({
  name,
  h1,
  tagline,
  category,
  badges = [],
  price,
  specs = [],
  rating,
  reviewsCount,
  imageUrl,
}: Props) {
  const headline = h1 || name
  // Pick 3 most informative specs for the hero bullets
  const heroSpecs = specs.slice(0, 3)

  return (
    <div
      className="relative overflow-hidden"
      style={{ background: "#050505" }}
    >
      {/* ── Consistent brand gradient — identical on every product ── */}
      {/* No image bleed-through: color accuracy independent of product photo */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background: [
            "radial-gradient(ellipse 60% 80% at 0% 50%, rgba(185,28,28,0.12) 0%, transparent 55%)",
            "radial-gradient(ellipse 40% 60% at 100% 0%, rgba(80,10,10,0.08) 0%, transparent 50%)",
          ].join(","),
        }}
      />

      {/* ── Subtle noise texture for depth ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.025'/%3E%3C/svg%3E\")",
          opacity: 1,
        }}
      />

      {/* ── Bottom fade ── */}
      <div
        className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none"
        style={{ background: "linear-gradient(to bottom, transparent, rgba(0,0,0,0.3))" }}
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 pt-24 pb-10 md:pt-28 md:pb-12">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 mb-8" aria-label="Breadcrumb">
          <Link href="/" className="text-cinema-600 hover:text-cinema-400 transition-colors text-xs">Home</Link>
          <ChevronRight size={11} className="text-cinema-700" />
          <Link href="/products" className="text-cinema-600 hover:text-cinema-400 transition-colors text-xs">Products</Link>
          <ChevronRight size={11} className="text-cinema-700" />
          <span className="text-cinema-400 text-xs truncate max-w-[200px]">{name}</span>
        </nav>

        <div className="grid lg:grid-cols-[1fr_auto] gap-8 lg:gap-16 items-end">
          <div>
            {/* Category + badges row */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {category && (
                <span className="eyebrow text-brand-400" style={{ fontSize: "0.6rem" }}>
                  {category}
                </span>
              )}
              {badges.slice(0, 3).map((b) => (
                <span
                  key={b}
                  className={`text-[10px] font-600 px-2.5 py-0.5 rounded-full border ${getBadgeClass(b)}`}
                >
                  {b}
                </span>
              ))}
            </div>

            {/* Headline */}
            <h1
              className="text-white mb-3 text-balance"
              style={{
                fontSize: "clamp(1.75rem, 4vw, 3.5rem)",
                fontWeight: 800,
                lineHeight: 1.05,
                letterSpacing: "-0.03em",
              }}
            >
              {headline}
            </h1>

            {/* Tagline */}
            {tagline && (
              <p className="text-cinema-400 text-base md:text-lg mb-6 max-w-xl leading-relaxed">
                {tagline}
              </p>
            )}

            {/* Hero spec bullets */}
            {heroSpecs.length > 0 && (
              <div className="flex flex-wrap gap-4">
                {heroSpecs.map((spec, i) => {
                  const ci = spec.indexOf(":")
                  const label = ci !== -1 ? spec.slice(0, ci).trim() : spec.trim()
                  const value = ci !== -1 ? spec.slice(ci + 1).trim() : ""
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-cinema-400 text-sm"
                    >
                      <span className="text-brand-500 flex-shrink-0">{specIcon(spec)}</span>
                      <span className="text-cinema-500">{label}</span>
                      {value && (
                        <>
                          <span className="text-cinema-700">·</span>
                          <span className="text-white font-600">{value}</span>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right: price + rating */}
          <div className="flex lg:flex-col items-start lg:items-end gap-4">
            {price && (
              <div className="text-right">
                <p className="text-cinema-600 text-xs eyebrow mb-1">Price range</p>
                <p
                  className="text-white font-900"
                  style={{ fontSize: "clamp(1.25rem, 3vw, 2rem)", letterSpacing: "-0.03em" }}
                >
                  {price}
                </p>
              </div>
            )}
            {rating && rating > 0 ? (
              <div className="flex items-center gap-1.5">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <svg
                      key={s}
                      viewBox="0 0 16 16"
                      className={`w-3.5 h-3.5 ${s <= Math.floor(rating) ? "text-yellow-400 fill-yellow-400" : "text-cinema-700 fill-cinema-700"}`}
                    >
                      <path d="M8 1l1.8 3.6L14 5.2l-3 2.9.7 4.1L8 10.1l-3.7 2.1.7-4.1-3-2.9 4.2-.6z" />
                    </svg>
                  ))}
                </div>
                <span className="text-cinema-500 text-xs">
                  {rating} ({reviewsCount || 0})
                </span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Bottom rule */}
        <div className="mt-10 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
      </div>
    </div>
  )
}
