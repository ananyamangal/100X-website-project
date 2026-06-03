"use client"

import React from "react"
import ScrollReveal from "@/components/cinematic/ScrollReveal"

const APPLICATIONS = [
  {
    eyebrow: "Municipal",
    headline: "The City's Shield",
    body: "Ward-level dengue and malaria drives. Vehicle-mounted. 10–30 km streets per hour. Standard municipal health protocol.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-8 h-8">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
    gradient: "radial-gradient(ellipse at 30% 70%, rgba(59,130,246,0.18) 0%, transparent 70%)",
  },
  {
    eyebrow: "Agricultural",
    headline: "Every Acre. One Operator.",
    body: "Paddy, sugarcane, orchards, vegetables. Sub-50 micron fog penetrates dense canopy. 1–3 acres per tank fill.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-8 h-8">
        <path d="M12 2a10 10 0 0 1 10 10c0 5.52-4.48 10-10 10S2 17.52 2 12" />
        <path d="M12 6v6l4 2" />
        <path d="M2 2l3 3M5 2l3 3" />
      </svg>
    ),
    gradient: "radial-gradient(ellipse at 70% 30%, rgba(34,197,94,0.15) 0%, transparent 70%)",
  },
  {
    eyebrow: "Vector Control",
    headline: "Where Malaria Lives",
    body: "Peridomestic and forest-fringe Anopheles control. Dusk-to-dawn operations. Portable units for health workers in endemic zones.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-8 h-8">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4l3 3" />
        <path d="M4.93 4.93l14.14 14.14" />
      </svg>
    ),
    gradient: "radial-gradient(ellipse at 50% 80%, rgba(168,85,247,0.15) 0%, transparent 70%)",
  },
  {
    eyebrow: "Commercial PCO",
    headline: "Visible Proof. Every Contract.",
    body: "Housing society fogging, commercial pest control contracts. Dense fog — clients can see coverage. Manufacturer direct warranty.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-8 h-8">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </svg>
    ),
    gradient: "radial-gradient(ellipse at 20% 20%, rgba(251,191,36,0.12) 0%, transparent 70%)",
  },
]

export default function S8Applications() {
  return (
    <section className="py-24 md:py-36 bg-gray-950">
      <div className="container mx-auto px-6 md:px-10">

        {/* Section header */}
        <div className="text-center mb-14 md:mb-18">
          <ScrollReveal animation="fade-up">
            <div className="flex items-center justify-center gap-3 mb-5">
              <div className="w-6 h-px bg-brand-500/50" />
              <span className="eyebrow text-brand-400">Applications</span>
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
              Four worlds.
              <br />
              One machine.
            </h2>
          </ScrollReveal>
          <ScrollReveal animation="fade-up" delay={150}>
            <p className="text-cinema-400 text-lg max-w-xl mx-auto leading-relaxed">
              From India's largest city to its smallest farm. The machine that fits every mandate.
            </p>
          </ScrollReveal>
        </div>

        {/* Application grid */}
        <div className="grid sm:grid-cols-2 gap-4">
          {APPLICATIONS.map((app, i) => (
            <ScrollReveal key={i} animation="fade-up" delay={i * 80}>
              <div
                className="rounded-2xl p-8 border border-white/6 relative overflow-hidden cinema-card-hover group h-full"
                style={{ background: "#0e0e0e" }}
              >
                {/* Gradient atmosphere */}
                <div
                  className="absolute inset-0 opacity-60 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: app.gradient }}
                  aria-hidden="true"
                />

                <div className="relative z-10">
                  {/* Icon */}
                  <div className="text-cinema-400 group-hover:text-white transition-colors duration-300 mb-5">
                    {app.icon}
                  </div>

                  {/* Eyebrow */}
                  <p className="eyebrow text-cinema-600 mb-3 text-xs">{app.eyebrow}</p>

                  {/* Headline */}
                  <h3
                    className="text-white font-700 mb-4"
                    style={{ fontSize: "1.35rem", lineHeight: 1.2, letterSpacing: "-0.01em" }}
                  >
                    {app.headline}
                  </h3>

                  {/* Body */}
                  <p className="text-cinema-400 text-sm leading-relaxed">{app.body}</p>
                </div>

                {/* Bottom accent */}
                <div
                  className="absolute bottom-0 left-0 h-0.5 bg-brand-600/60 w-0 group-hover:w-full transition-all duration-500"
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
