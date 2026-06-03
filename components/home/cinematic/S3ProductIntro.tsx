"use client"

import React from "react"
import Link from "next/link"
import ScrollReveal from "@/components/cinematic/ScrollReveal"
import { ArrowRight } from "lucide-react"

interface Props {
  featuredProduct?: {
    _id?: string
    slug?: string
    name?: string
    imageUrls?: string[]
    tagline?: string
    shortDescription?: string
  }
}

const QUICK_SPECS = [
  { value: "Sub-50μm", label: "Fog droplet VMD" },
  { value: "IS14855", label: "BIS certified" },
  { value: "10–15m", label: "Fog throw range" },
  { value: "ISO 9001", label: "Quality standard" },
]

export default function S3ProductIntro({ featuredProduct }: Props) {
  const productImage = featuredProduct?.imageUrls?.[0]
  const productSlug = featuredProduct?.slug || featuredProduct?._id
  const productName = featuredProduct?.name || "100X Circle Thermal Fogger"

  return (
    <section
      className="relative py-24 md:py-36 overflow-hidden"
      style={{ background: "#070707" }}
    >
      {/* Brand red glow — source light */}
      <div
        className="absolute pointer-events-none"
        aria-hidden="true"
        style={{
          top: "20%",
          left: "-5%",
          width: "40%",
          height: "60%",
          background:
            "radial-gradient(ellipse, rgba(220,38,38,0.08) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      <div className="container mx-auto px-6 md:px-10 relative z-10">

        {/* Section header */}
        <div className="text-center mb-16 md:mb-20">
          <ScrollReveal animation="fade-up">
            <div className="flex items-center justify-center gap-3 mb-5">
              <div className="w-8 h-px bg-brand-500/50" />
              <span className="eyebrow text-brand-400">The Answer</span>
              <div className="w-8 h-px bg-brand-500/50" />
            </div>
          </ScrollReveal>
          <ScrollReveal animation="fade-up" delay={80}>
            <h2
              className="text-white mb-5 text-balance"
              style={{
                fontSize: "clamp(2rem, 4.5vw, 4rem)",
                fontWeight: 800,
                lineHeight: 1.05,
                letterSpacing: "-0.03em",
              }}
            >
              Helmholtz Resonance.
              <br />
              <span className="text-cinema-500">No Moving Parts.</span>
            </h2>
          </ScrollReveal>
          <ScrollReveal animation="fade-up" delay={150}>
            <p className="text-cinema-400 text-lg max-w-xl mx-auto leading-relaxed">
              A standing wave of combustion that turns fuel into billions of
              sub-50 micron droplets — reaching every void a sprayer never will.
            </p>
          </ScrollReveal>
        </div>

        {/* Product visual + specs */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* Left: product image with cinematic treatment */}
          <ScrollReveal animation="fade-right">
            <div className="relative">
              <div
                className="rounded-2xl overflow-hidden aspect-square relative"
                style={{ background: "#0e0e0e" }}
              >
                {productImage ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={productImage}
                      alt={productName}
                      className="w-full h-full object-contain p-8"
                      loading="lazy"
                    />
                    {/* Dramatic overhead light effect */}
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background:
                          "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(255,255,255,0.06) 0%, transparent 70%)",
                      }}
                    />
                    {/* Bottom shadow */}
                    <div
                      className="absolute bottom-0 left-0 right-0 h-24"
                      style={{
                        background: "linear-gradient(to top, #0e0e0e, transparent)",
                      }}
                    />
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {/* SVG silhouette of a portable thermal fogger */}
                    <svg
                      viewBox="0 0 200 260"
                      className="w-48 h-60 opacity-20"
                      fill="none"
                      stroke="white"
                      strokeWidth="1.5"
                      aria-hidden="true"
                    >
                      {/* Tank body */}
                      <ellipse cx="100" cy="80" rx="50" ry="65" />
                      {/* Resonator tube */}
                      <rect x="145" y="60" width="50" height="10" rx="5" />
                      {/* Nozzle */}
                      <path d="M195 63 L210 58 L210 72 L195 70 Z" />
                      {/* Handle */}
                      <path d="M75 130 Q55 160 65 185 Q70 195 80 195 Q90 195 95 185 L90 145" />
                      {/* Fuel cap */}
                      <circle cx="100" cy="25" r="8" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Floating resonator spec badge */}
              <div
                className="absolute -bottom-4 -left-4 rounded-2xl p-4 border border-white/6"
                style={{ background: "rgba(5,5,5,0.92)" }}
              >
                <p className="text-cinema-500 text-xs eyebrow mb-1">Core technology</p>
                <p className="text-white font-700 text-sm">Helmholtz Resonance</p>
                <p className="text-cinema-600 text-xs">Pulsating combustion · zero drive components</p>
              </div>
            </div>
          </ScrollReveal>

          {/* Right: specs + positioning */}
          <div>
            <ScrollReveal animation="fade-left" delay={100}>
              <h3 className="text-white text-display-xs mb-2 text-balance">
                {productName}
              </h3>
            </ScrollReveal>
            <ScrollReveal animation="fade-left" delay={150}>
              <p className="text-cinema-400 text-base leading-relaxed mb-10 max-w-sm">
                {featuredProduct?.shortDescription ||
                  "IS14855 BIS-certified pulse-jet thermal fogger. ISO 9001 manufactured. GeM-listed. Gurugram."}
              </p>
            </ScrollReveal>

            {/* Spec grid */}
            <div className="grid grid-cols-2 gap-4 mb-10">
              {QUICK_SPECS.map((spec, i) => (
                <ScrollReveal key={i} animation="fade-left" delay={200 + i * 60}>
                  <div
                    className="rounded-xl p-4 border border-white/6"
                    style={{ background: "rgba(255,255,255,0.03)" }}
                  >
                    <p
                      className="text-white font-800 mb-1"
                      style={{ fontSize: "1.25rem", letterSpacing: "-0.02em" }}
                    >
                      {spec.value}
                    </p>
                    <p className="text-cinema-600 text-xs">{spec.label}</p>
                  </div>
                </ScrollReveal>
              ))}
            </div>

            <ScrollReveal animation="fade-left" delay={480}>
              {productSlug ? (
                <Link
                  href={`/products/${productSlug}`}
                  className="inline-flex items-center gap-2 text-brand-400 hover:text-brand-300 font-600 transition-colors group"
                >
                  Explore the full machine{" "}
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              ) : (
                <Link
                  href="/products"
                  className="inline-flex items-center gap-2 text-brand-400 hover:text-brand-300 font-600 transition-colors group"
                >
                  See all machines{" "}
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              )}
            </ScrollReveal>
          </div>
        </div>
      </div>
    </section>
  )
}
