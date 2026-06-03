"use client"

import React from "react"
import ScrollReveal from "@/components/cinematic/ScrollReveal"
import { CheckCircle2 } from "lucide-react"

const STATS = [
  { value: "15+", label: "Years of OEM production" },
  { value: "10,000+", label: "Machines deployed across India" },
  { value: "200+", label: "Municipalities supplied" },
  { value: "29", label: "States served" },
]

const PILLARS = [
  "ISO 9001:2015 certified production line",
  "BIS IS14855 — government quality mark",
  "In-house R&D and field-testing",
  "GeM MSME OEM registered",
  "Domestic spare parts chain — 3–5 day delivery",
  "MHA QR-compliant (paramilitary-grade)",
]

export default function S5Manufacturing() {
  return (
    <section className="relative py-24 md:py-36 overflow-hidden" style={{ background: "#060606" }}>
      {/* Warm amber side light */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 50% 70% at 100% 50%, rgba(234,88,12,0.06) 0%, transparent 60%)",
        }}
      />

      <div className="container mx-auto px-6 md:px-10 relative z-10">

        {/* Section header */}
        <div className="mb-16 md:mb-20">
          <ScrollReveal animation="fade-up">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-6 h-px bg-brand-500" />
              <span className="eyebrow text-brand-400">Manufacturing Story</span>
            </div>
          </ScrollReveal>
          <ScrollReveal animation="fade-up" delay={80}>
            <h2
              className="text-white mb-5 text-balance"
              style={{
                fontSize: "clamp(2rem, 4.5vw, 4rem)",
                fontWeight: 800,
                lineHeight: 1.0,
                letterSpacing: "-0.035em",
              }}
            >
              Built By Hand.
              <br />
              <span className="text-cinema-500">Tested In India.</span>
            </h2>
          </ScrollReveal>
          <ScrollReveal animation="fade-up" delay={150}>
            <p className="text-cinema-400 text-lg leading-relaxed max-w-2xl">
              IMT Manesar, Gurugram. Every resonator tube inspected. Every weld tested.
              Every machine run-cleared before it leaves the facility.
              This is not assembly — it is manufacture.
            </p>
          </ScrollReveal>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16 md:mb-20">
          {STATS.map((stat, i) => (
            <ScrollReveal key={i} animation="fade-up" delay={i * 80}>
              <div
                className="rounded-2xl p-6 border border-white/5"
                style={{ background: "rgba(255,255,255,0.025)" }}
              >
                <p
                  className="text-white font-900 mb-1"
                  style={{ fontSize: "clamp(1.75rem, 4vw, 2.75rem)", lineHeight: 1, letterSpacing: "-0.04em" }}
                >
                  {stat.value}
                </p>
                <p className="text-cinema-500 text-xs">{stat.label}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <hr className="cinema-divider mb-16 md:mb-20" />

        {/* Two-column: visual + pillars */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* Left: factory visual */}
          <ScrollReveal animation="fade-right">
            <div className="relative">
              <div
                className="rounded-2xl overflow-hidden aspect-[4/3] relative"
                style={{ background: "#0e0e0e" }}
              >
                {/* Factory floor atmospheric CSS */}
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(ellipse 80% 60% at 30% 70%, rgba(251,146,60,0.12) 0%, transparent 50%), radial-gradient(ellipse 60% 40% at 70% 30%, rgba(255,255,255,0.04) 0%, transparent 60%), linear-gradient(135deg, #0a0a0a 0%, #111111 100%)",
                  }}
                />

                {/* Factory grid lines — suggests assembly floor */}
                <svg
                  className="absolute inset-0 w-full h-full opacity-6"
                  viewBox="0 0 400 300"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  {/* Perspective grid lines */}
                  {[...Array(8)].map((_, i) => (
                    <line
                      key={`h${i}`}
                      x1="0" y1={i * 40}
                      x2="400" y2={i * 40}
                      stroke="rgba(255,255,255,0.15)"
                      strokeWidth="0.5"
                    />
                  ))}
                  {[...Array(10)].map((_, i) => (
                    <line
                      key={`v${i}`}
                      x1={i * 44} y1="0"
                      x2={i * 44} y2="300"
                      stroke="rgba(255,255,255,0.08)"
                      strokeWidth="0.5"
                    />
                  ))}
                  {/* Assembly station indicator */}
                  <rect x="140" y="100" width="120" height="80" rx="4" stroke="rgba(220,38,38,0.3)" strokeWidth="1" fill="rgba(220,38,38,0.04)" strokeDasharray="4 3" />
                  <text x="200" y="145" textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="8" fontFamily="monospace">QC Station</text>
                </svg>

                {/* Pendant light pools */}
                <div
                  className="absolute"
                  style={{
                    top: "-20%",
                    left: "30%",
                    width: "40%",
                    height: "80%",
                    background: "radial-gradient(ellipse, rgba(251,191,36,0.08) 0%, transparent 70%)",
                    filter: "blur(20px)",
                  }}
                />

                {/* Overlay badge */}
                <div className="absolute bottom-5 left-5 right-5">
                  <div
                    className="rounded-xl px-5 py-4 border border-white/8"
                    style={{ background: "rgba(0,0,0,0.75)" }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-brand-600/20 border border-brand-600/40 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 size={16} className="text-brand-400" />
                      </div>
                      <div>
                        <p className="text-white font-600 text-sm">ISO 9001:2015 Certified Facility</p>
                        <p className="text-cinema-500 text-xs">IMT Manesar, Sector 7, Gurugram</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Decorative corners */}
              <div className="absolute -top-4 -right-4 w-24 h-24 border border-brand-600/15 rounded-2xl -z-10" />
              <div className="absolute -bottom-4 -left-4 w-16 h-16 border border-white/5 rounded-xl -z-10" />
            </div>
          </ScrollReveal>

          {/* Right: pillars */}
          <div>
            <ScrollReveal animation="fade-left" delay={80}>
              <h3 className="text-white font-700 text-xl mb-8">
                Every certification earned.
                <br />
                Every standard met.
              </h3>
            </ScrollReveal>

            <div className="space-y-4">
              {PILLARS.map((pillar, i) => (
                <ScrollReveal key={i} animation="fade-left" delay={150 + i * 60}>
                  <div className="flex items-start gap-4">
                    <div
                      className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5"
                      style={{ background: "rgba(220,38,38,0.15)", border: "1px solid rgba(220,38,38,0.3)" }}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                    </div>
                    <p className="text-cinema-300 text-sm leading-relaxed">{pillar}</p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
