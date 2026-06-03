"use client"

import React from "react"
import ScrollReveal from "@/components/cinematic/ScrollReveal"

const PROBLEM_POINTS = [
  {
    label: "Under leaves",
    body: "Aedes aegypti rests on leaf undersurfaces. Conventional spray coats the topside only.",
  },
  {
    label: "Inside drains",
    body: "Open drains, construction voids, and pipe channels harbour dense adult populations.",
  },
  {
    label: "In wall voids",
    body: "Gaps between structures create protected refugia where insecticide cannot penetrate.",
  },
]

export default function S2Problem() {
  return (
    <section
      className="relative py-24 md:py-36 overflow-hidden"
      style={{ background: "#030303" }}
    >
      {/* Ambient grain texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E\")",
        }}
        aria-hidden="true"
      />

      <div className="container mx-auto px-6 md:px-10 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">

          {/* Left — typography-as-visual */}
          <div>
            <ScrollReveal animation="fade-right">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-6 h-px bg-brand-500" />
                <span className="eyebrow text-brand-400">The Problem</span>
              </div>
            </ScrollReveal>

            <ScrollReveal animation="fade-right" delay={100}>
              <h2
                className="text-white mb-8 text-balance"
                style={{
                  fontSize: "clamp(2.5rem, 5.5vw, 5rem)",
                  fontWeight: 800,
                  lineHeight: 1.0,
                  letterSpacing: "-0.035em",
                }}
              >
                Where
                <br />
                It Hides
              </h2>
            </ScrollReveal>

            <ScrollReveal animation="fade-right" delay={180}>
              <p className="text-cinema-400 text-lg leading-relaxed mb-12 max-w-md">
                The vector does not live where you can see it. It lives beneath things —
                in the negative space that conventional sprayers can never reach.
              </p>
            </ScrollReveal>

            {/* Problem points */}
            <div className="space-y-6">
              {PROBLEM_POINTS.map((p, i) => (
                <ScrollReveal key={i} animation="fade-right" delay={260 + i * 80}>
                  <div className="flex gap-5 items-start">
                    <div
                      className="flex-shrink-0 w-8 h-8 rounded-full border border-brand-800 flex items-center justify-center mt-0.5"
                      style={{ background: "rgba(220,38,38,0.08)" }}
                    >
                      <div className="w-2 h-2 rounded-full bg-brand-600" />
                    </div>
                    <div>
                      <p className="text-white font-600 mb-1">{p.label}</p>
                      <p className="text-cinema-500 text-sm leading-relaxed">{p.body}</p>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>

          {/* Right — visual: dark atmospheric with micro-scale hint */}
          <ScrollReveal animation="fade-left" delay={100}>
            <div className="relative">
              {/* Main dark visual block */}
              <div
                className="rounded-2xl overflow-hidden aspect-[4/5] relative"
                style={{ background: "#0d0d0d" }}
              >
                {/* Atmospheric gradient — simulates leaf-underside darkness */}
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(ellipse 80% 60% at 30% 40%, rgba(34,85,34,0.18) 0%, transparent 60%), linear-gradient(to bottom, #050f05 0%, #0a0a0a 100%)",
                  }}
                />

                {/* Decorative leaf-rib geometry — CSS lines */}
                <svg
                  className="absolute inset-0 w-full h-full opacity-10"
                  viewBox="0 0 400 500"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  {/* Main rib */}
                  <path d="M200 0 L200 500" stroke="rgba(255,255,255,0.6)" strokeWidth="0.8" />
                  {/* Secondary ribs — diagonal */}
                  {[...Array(8)].map((_, i) => (
                    <path
                      key={i}
                      d={`M200 ${60 + i * 55} L${40 + i * 10} ${120 + i * 55}`}
                      stroke="rgba(255,255,255,0.4)"
                      strokeWidth="0.5"
                    />
                  ))}
                  {[...Array(8)].map((_, i) => (
                    <path
                      key={`r${i}`}
                      d={`M200 ${60 + i * 55} L${360 - i * 10} ${120 + i * 55}`}
                      stroke="rgba(255,255,255,0.4)"
                      strokeWidth="0.5"
                    />
                  ))}
                </svg>

                {/* Centre glow — the hidden threat */}
                <div
                  className="absolute"
                  style={{
                    top: "38%",
                    left: "42%",
                    width: "80px",
                    height: "80px",
                    background: "radial-gradient(circle, rgba(220,38,38,0.25) 0%, transparent 70%)",
                    filter: "blur(12px)",
                  }}
                />

                {/* Bottom label */}
                <div className="absolute bottom-6 left-6 right-6">
                  <div
                    className="glass-card rounded-xl px-5 py-4"
                    style={{ background: "rgba(0,0,0,0.6)" }}
                  >
                    <p className="text-cinema-400 text-xs eyebrow mb-1">
                      Aedes aegypti · Preferred habitat
                    </p>
                    <p className="text-white text-sm font-500 leading-snug">
                      Leaf undersurface, drain void, wall cavity.
                      <br />
                      <span className="text-brand-400">
                        0 of 3 reachable by conventional spray.
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Floating stat */}
              <div
                className="absolute -top-5 -right-5 rounded-2xl px-5 py-4 border border-white/8"
                style={{ background: "rgba(220,38,38,0.12)" }}
              >
                <p
                  className="text-brand-400 font-900"
                  style={{ fontSize: "2.5rem", lineHeight: 1, letterSpacing: "-0.04em" }}
                >
                  Sub-50
                </p>
                <p className="text-cinema-500 text-xs mt-1">micron VMD fog</p>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}
