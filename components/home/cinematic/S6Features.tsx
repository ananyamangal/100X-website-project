"use client"

import React from "react"
import ScrollReveal from "@/components/cinematic/ScrollReveal"

const FEATURES = [
  {
    eyebrow: "Feature 01",
    headline: "Into The Canopy",
    body: "Sub-50 micron droplets drift under leaf surfaces, into plant voids, along stem undersides. Where spray deposits on top, fog penetrates throughout. One tank fill: 1–3 acres of dense canopy.",
    stat: "10×",
    statLabel: "less pesticide per acre vs manual spray",
    accentColor: "rgba(220,38,38,0.12)",
    borderColor: "rgba(220,38,38,0.25)",
    highlight: "text-brand-400",
  },
  {
    eyebrow: "Feature 02",
    headline: "One Machine. One Ward.",
    body: "Vehicle-mounted configuration. 10–30 km of streets per hour. 10–15 metre fog throw. The machine that a municipal health drive depends on — covering an entire ward before the sun rises.",
    stat: "30km",
    statLabel: "streets covered per hour",
    accentColor: "rgba(255,255,255,0.04)",
    borderColor: "rgba(255,255,255,0.10)",
    highlight: "text-white",
  },
  {
    eyebrow: "Feature 03",
    headline: "3 Days. Anywhere.",
    body: "Every component manufactured in Gurugram. No import. No 6-week lead time. No machine idle when a city needs it most. The diaphragm valve arrives in 3 days to any Indian address.",
    stat: "₹500",
    statLabel: "cost of the only wear component",
    accentColor: "rgba(251,146,60,0.08)",
    borderColor: "rgba(251,146,60,0.20)",
    highlight: "text-orange-400",
  },
]

export default function S6Features() {
  return (
    <section className="py-24 md:py-36 bg-white">
      <div className="container mx-auto px-6 md:px-10">

        {/* Section header */}
        <div className="mb-14 md:mb-18">
          <ScrollReveal animation="fade-up">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-6 h-px bg-brand-600" />
              <span className="eyebrow text-brand-600">Three Reasons</span>
            </div>
          </ScrollReveal>
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
              What separates
              <br />
              <span className="text-brand-600">this machine.</span>
            </h2>
          </ScrollReveal>
        </div>

        {/* Feature cards */}
        <div className="grid md:grid-cols-3 gap-5">
          {FEATURES.map((feat, i) => (
            <ScrollReveal key={i} animation="fade-up" delay={i * 100}>
              <div
                className="rounded-2xl p-8 h-full relative overflow-hidden border cinema-card-hover group"
                style={{
                  background: feat.accentColor,
                  borderColor: feat.borderColor,
                }}
              >
                {/* Eyebrow */}
                <p className="eyebrow text-gray-400 mb-5 text-xs">{feat.eyebrow}</p>

                {/* Stat */}
                <div className="mb-6">
                  <span
                    className={`font-900 ${feat.highlight}`}
                    style={{
                      fontSize: "clamp(2rem, 5vw, 3rem)",
                      lineHeight: 1,
                      letterSpacing: "-0.04em",
                    }}
                  >
                    {feat.stat}
                  </span>
                  <br />
                  <span className="text-gray-400 text-xs mt-1 inline-block">{feat.statLabel}</span>
                </div>

                <h3 className="text-gray-900 font-700 text-xl mb-4">{feat.headline}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{feat.body}</p>

                {/* Bottom accent line on hover */}
                <div
                  className="absolute bottom-0 left-0 h-0.5 bg-brand-600 w-0 group-hover:w-full transition-all duration-500"
                  aria-hidden="true"
                />
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
