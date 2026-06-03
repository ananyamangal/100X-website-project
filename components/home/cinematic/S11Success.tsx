"use client"

import React from "react"
import ScrollReveal from "@/components/cinematic/ScrollReveal"

const SUCCESS_STORIES = [
  {
    segment: "Municipal",
    headline: "Ward 14. Protected.",
    quote:
      "The machine ran all season without a single failure. Not one missed morning drive during the dengue outbreak months.",
    attribution: "Vector Control Operator, Nagar Nigam, Lucknow UP",
    stat: "0",
    statLabel: "Failures in a full season",
    accentColor: "rgba(59,130,246,0.08)",
    borderColor: "rgba(59,130,246,0.20)",
  },
  {
    segment: "Agricultural",
    headline: "The Season He Didn't Lose",
    quote:
      "Before this machine I was losing 30% of my paddy to leaf blast every year. First full harvest this season — the fog reaches where my sprayer never did.",
    attribution: "Farmer, Gorakhpur, Uttar Pradesh",
    stat: "30%",
    statLabel: "Crop loss eliminated",
    accentColor: "rgba(34,197,94,0.06)",
    borderColor: "rgba(34,197,94,0.18)",
  },
  {
    segment: "Government / Defense",
    headline: "Zero Tolerance. Zero Failure.",
    quote:
      "IS14855-certified, MHA QR-compliant. The documentation was complete and the machine performed exactly as specified under field conditions.",
    attribution: "Procurement Officer, Central Paramilitary Forces",
    stat: "IS14855",
    statLabel: "BIS standard met",
    accentColor: "rgba(168,85,247,0.07)",
    borderColor: "rgba(168,85,247,0.18)",
  },
]

export default function S11Success() {
  return (
    <section className="relative py-24 md:py-36 overflow-hidden" style={{ background: "#060606" }}>
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 100%, rgba(220,38,38,0.05) 0%, transparent 60%)",
        }}
      />

      <div className="container mx-auto px-6 md:px-10 relative z-10">

        {/* Section header */}
        <div className="text-center mb-14 md:mb-18">
          <ScrollReveal animation="fade-up">
            <div className="flex items-center justify-center gap-3 mb-5">
              <div className="w-6 h-px bg-brand-500/50" />
              <span className="eyebrow text-brand-400">In Their Words</span>
              <div className="w-6 h-px bg-brand-500/50" />
            </div>
          </ScrollReveal>
          <ScrollReveal animation="fade-up" delay={80}>
            <h2
              className="text-white text-balance mb-5"
              style={{
                fontSize: "clamp(2rem, 4vw, 3.5rem)",
                fontWeight: 800,
                lineHeight: 1.05,
                letterSpacing: "-0.03em",
              }}
            >
              One Decade.
              <br />
              Every State.
            </h2>
          </ScrollReveal>
          <ScrollReveal animation="fade-up" delay={150}>
            <p className="text-cinema-400 text-lg max-w-xl mx-auto leading-relaxed">
              Municipal corporations. Farmers. Government departments. 10,000+ machines
              in the field — across every condition India presents.
            </p>
          </ScrollReveal>
        </div>

        {/* Story cards */}
        <div className="grid md:grid-cols-3 gap-5">
          {SUCCESS_STORIES.map((story, i) => (
            <ScrollReveal key={i} animation="fade-up" delay={i * 80}>
              <div
                className="rounded-2xl p-7 border h-full flex flex-col cinema-card-hover"
                style={{ background: story.accentColor, borderColor: story.borderColor }}
              >
                {/* Segment */}
                <p className="eyebrow text-cinema-600 mb-4 text-xs">{story.segment}</p>

                {/* Stat */}
                <div className="mb-5">
                  <span
                    className="text-white font-900"
                    style={{ fontSize: "2rem", lineHeight: 1, letterSpacing: "-0.04em" }}
                  >
                    {story.stat}
                  </span>
                  <br />
                  <span className="text-cinema-600 text-xs">{story.statLabel}</span>
                </div>

                {/* Headline */}
                <h3 className="text-white font-700 text-lg mb-4">{story.headline}</h3>

                {/* Quote */}
                <blockquote className="text-cinema-400 text-sm leading-relaxed mb-5 flex-1">
                  &ldquo;{story.quote}&rdquo;
                </blockquote>

                {/* Attribution */}
                <p className="text-cinema-700 text-xs border-t border-white/6 pt-4">
                  — {story.attribution}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
