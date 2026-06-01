"use client"

import React from "react"
import ScrollReveal from "@/components/cinematic/ScrollReveal"
import CinematicStatCounter from "@/components/cinematic/CinematicStatCounter"
import { ArrowRight, CheckCircle2 } from "lucide-react"
import Link from "next/link"

const MANUFACTURING_STATS = [
  { value: 15, suffix: "+", label: "Years Experience", description: "Thermal fogging OEM manufacturing" },
  { value: 10000, suffix: "+", label: "Machines Deployed", description: "Across India and abroad" },
  { value: 200, suffix: "+", label: "Municipalities", description: "Government supply network" },
  { value: 29, label: "States Reached", description: "Pan-India service coverage" },
]

const MANUFACTURING_PILLARS = [
  "ISO-certified production line",
  "GeM registered OEM",
  "In-house R&D and testing",
  "BIS-approved components",
  "Post-sale spares ecosystem",
  "Government tender ready",
]

interface Props {
  content?: {
    eyebrow?: string
    headline?: string
    body?: string
    stats?: Array<{ value: number; suffix?: string; label: string; description?: string }>
    pillars?: string[]
    imageUrl?: string
  }
}

export default function CinematicManufacturingSection({ content }: Props) {
  const eyebrow = content?.eyebrow || "Manufacturing Excellence"
  const headline = content?.headline || "Precision-engineered in India.\nBuilt to last a decade."
  const body = content?.body || "Every 100X Circle machine begins its journey at our Gurugram facility — where engineering tolerances are non-negotiable and every unit is run-tested before dispatch."
  const stats = content?.stats || MANUFACTURING_STATS
  const pillars = content?.pillars || MANUFACTURING_PILLARS

  return (
    <section className="section-cinema py-24 md:py-32">
      <div className="container mx-auto px-4 md:px-6">

        {/* Stats row */}
        <ScrollReveal animation="fade-up" className="mb-20 md:mb-28">
          <CinematicStatCounter stats={stats} dark />
        </ScrollReveal>

        <hr className="cinema-divider mb-20 md:mb-28" />

        {/* Two-column layout */}
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">

          {/* Left: copy */}
          <div>
            <ScrollReveal animation="fade-right">
              <p className="eyebrow text-brand-400 mb-5">{eyebrow}</p>
            </ScrollReveal>
            <ScrollReveal animation="fade-right" delay={100}>
              <h2 className="text-display-md text-white mb-6 text-balance whitespace-pre-line">
                {headline}
              </h2>
            </ScrollReveal>
            <ScrollReveal animation="fade-right" delay={200}>
              <p className="text-cinema-300 text-lg leading-relaxed mb-10">
                {body}
              </p>
            </ScrollReveal>

            {/* Pillars */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10">
              {pillars.map((pillar, i) => (
                <ScrollReveal key={i} animation="fade-right" delay={300 + i * 60}>
                  <div className="flex items-center gap-2.5 text-cinema-200">
                    <CheckCircle2 size={16} className="text-brand-500 flex-shrink-0" />
                    <span className="text-sm font-500">{pillar}</span>
                  </div>
                </ScrollReveal>
              ))}
            </div>

            <ScrollReveal animation="fade-right" delay={600}>
              <Link
                href="/factory"
                className="inline-flex items-center gap-2 text-brand-400 font-600 hover:text-brand-300 transition-colors group"
              >
                See our factory <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </ScrollReveal>
          </div>

          {/* Right: visual stack */}
          <div className="relative">
            <ScrollReveal animation="fade-left">
              <div className="relative rounded-2xl overflow-hidden bg-cinema-800 aspect-[4/3]">
                {content?.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={content.imageUrl}
                    alt="100X Circle manufacturing facility"
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-6xl mb-4">🏭</div>
                      <p className="text-cinema-400 text-sm">Gurugram Manufacturing Facility</p>
                      <p className="text-cinema-500 text-xs mt-1">Sector 7, Industrial Model Township</p>
                    </div>
                  </div>
                )}
                {/* Overlay badge */}
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="glass-card rounded-xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand-600 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 size={20} className="text-white" />
                    </div>
                    <div>
                      <p className="text-white font-600 text-sm">ISO Certified Facility</p>
                      <p className="text-cinema-400 text-xs">Quality-assured at every stage</p>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            {/* Decorative accent */}
            <div className="absolute -top-4 -right-4 w-32 h-32 rounded-2xl border border-brand-600/20 -z-10" />
            <div className="absolute -bottom-4 -left-4 w-20 h-20 rounded-xl border border-brand-600/10 -z-10" />
          </div>
        </div>
      </div>
    </section>
  )
}
