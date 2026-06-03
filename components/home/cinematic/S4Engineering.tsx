"use client"

import React from "react"
import ScrollReveal from "@/components/cinematic/ScrollReveal"

const ENGINEERING_TRUTHS = [
  {
    number: "01",
    headline: "No Moving Parts",
    body: "Helmholtz resonance sustains combustion through thermodynamic physics alone. No piston. No compressor. No drive shaft. The only wear component is a diaphragm valve — ₹500, 15 minutes to replace.",
    stat: "0",
    statLabel: "Drive components",
  },
  {
    number: "02",
    headline: "Sub-50 Micron Output",
    body: "Chemical is injected into 300–400°C exhaust gas at the resonator outlet. It vaporises, then instantly condenses at the nozzle as billions of droplets sized 5–50 µm — small enough to drift into voids, large enough to deposit on contact.",
    stat: "<50μm",
    statLabel: "Fog droplet VMD",
  },
  {
    number: "03",
    headline: "IS14855 : BIS Certified",
    body: "The Bureau of Indian Standards has codified pulse-jet thermal foggers under IS14855 Part 1. 100X Circle machines are manufactured to this standard and carry the ISI mark — the government's quality guarantee pressed into the metal.",
    stat: "ISI",
    statLabel: "Mark on every unit",
  },
  {
    number: "04",
    headline: "10–15 Metre Throw",
    body: "The kinetic energy of the resonator's exhaust gas propels the fog cloud 10–15 metres from the nozzle. One vehicle pass covers both sides of a standard Indian residential street — 6–10 metre width — in a single sweep.",
    stat: "15m",
    statLabel: "Maximum fog throw",
  },
]

export default function S4Engineering() {
  return (
    <section className="section-cinema py-24 md:py-36">
      <div className="container mx-auto px-6 md:px-10">

        {/* Section header */}
        <div className="mb-16 md:mb-20">
          <ScrollReveal animation="fade-up">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-6 h-px bg-brand-500" />
              <span className="eyebrow text-brand-400">Engineering Excellence</span>
            </div>
          </ScrollReveal>
          <div className="grid lg:grid-cols-2 gap-8 items-end">
            <ScrollReveal animation="fade-up" delay={80}>
              <h2
                className="text-white text-balance"
                style={{
                  fontSize: "clamp(2rem, 4vw, 3.75rem)",
                  fontWeight: 800,
                  lineHeight: 1.05,
                  letterSpacing: "-0.03em",
                }}
              >
                Four truths.
                <br />
                One machine.
              </h2>
            </ScrollReveal>
            <ScrollReveal animation="fade-up" delay={150}>
              <p className="text-cinema-400 text-lg leading-relaxed">
                The engineering behind every 100X fogger — no marketing language,
                just the physics and specifications that determine field performance.
              </p>
            </ScrollReveal>
          </div>
        </div>

        <hr className="cinema-divider mb-16 md:mb-20" />

        {/* Engineering truths grid */}
        <div className="grid md:grid-cols-2 gap-0.5">
          {ENGINEERING_TRUTHS.map((truth, i) => (
            <ScrollReveal key={i} animation="fade-up" delay={i * 80}>
              <div
                className="p-8 md:p-10 border border-white/5 rounded-2xl cinema-card-hover relative overflow-hidden group"
                style={{ background: "rgba(255,255,255,0.025)" }}
              >
                {/* Number watermark */}
                <span
                  className="absolute top-6 right-8 font-900 text-white/4 select-none pointer-events-none transition-all duration-500 group-hover:text-white/6"
                  style={{ fontSize: "5rem", lineHeight: 1, letterSpacing: "-0.05em" }}
                  aria-hidden="true"
                >
                  {truth.number}
                </span>

                {/* Stat */}
                <div className="mb-5">
                  <span
                    className="text-brand-500 font-900"
                    style={{ fontSize: "2.25rem", lineHeight: 1, letterSpacing: "-0.04em" }}
                  >
                    {truth.stat}
                  </span>
                  <span className="text-cinema-600 text-xs ml-2 font-500">{truth.statLabel}</span>
                </div>

                <h3 className="text-white font-700 text-xl mb-4">{truth.headline}</h3>
                <p className="text-cinema-400 text-sm leading-relaxed">{truth.body}</p>

                {/* Brand accent line on hover */}
                <div
                  className="absolute bottom-0 left-0 h-0.5 bg-brand-600 w-0 group-hover:w-full transition-all duration-500"
                  aria-hidden="true"
                />
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* Resonator diagram — CSS/SVG */}
        <ScrollReveal animation="fade-up" delay={200} className="mt-16 md:mt-20">
          <div
            className="rounded-2xl p-8 md:p-12 border border-white/5 relative overflow-hidden"
            style={{ background: "rgba(255,255,255,0.02)" }}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-4 h-px bg-brand-500/50" />
              <span className="eyebrow text-cinema-500">Pulse-jet engine diagram</span>
            </div>

            {/* Schematic SVG */}
            <div className="overflow-x-auto">
              <svg
                viewBox="0 0 700 120"
                className="w-full min-w-[500px] h-24 md:h-32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-label="Pulse-jet thermal fogger engine diagram"
              >
                {/* Combustion chamber — flask shape */}
                <ellipse cx="90" cy="60" rx="55" ry="48" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
                <text x="90" y="64" textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="8" fontFamily="monospace">combustion</text>
                <text x="90" y="75" textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="8" fontFamily="monospace">chamber</text>

                {/* Diaphragm valve */}
                <rect x="140" y="48" width="10" height="24" rx="2" fill="rgba(220,38,38,0.3)" stroke="rgba(220,38,38,0.6)" strokeWidth="1" />
                <text x="145" y="44" textAnchor="middle" fill="rgba(220,38,38,0.6)" fontSize="7" fontFamily="monospace">valve</text>

                {/* Resonator tube */}
                <rect x="150" y="54" width="350" height="12" rx="4" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" fill="rgba(255,255,255,0.04)" />
                <text x="325" y="50" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="8" fontFamily="monospace">resonator tube — 300–400°C exhaust gas</text>

                {/* Specular highlight on resonator */}
                <rect x="155" y="55" width="340" height="2" rx="1" fill="rgba(255,255,255,0.08)" />

                {/* Chemical injection port */}
                <rect x="460" y="42" width="8" height="12" rx="2" fill="rgba(251,191,36,0.3)" stroke="rgba(251,191,36,0.6)" strokeWidth="1" />
                <path d="M464 42 L464 30" stroke="rgba(251,191,36,0.5)" strokeWidth="1" strokeDasharray="2 2" />
                <text x="464" y="26" textAnchor="middle" fill="rgba(251,191,36,0.6)" fontSize="7" fontFamily="monospace">chemical</text>
                <text x="464" y="18" textAnchor="middle" fill="rgba(251,191,36,0.6)" fontSize="7" fontFamily="monospace">injection</text>

                {/* Nozzle */}
                <path d="M500 54 L540 46 L540 74 L500 66 Z" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" fill="rgba(255,255,255,0.06)" />
                <text x="520" y="100" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="8" fontFamily="monospace">nozzle</text>

                {/* Fog cloud */}
                <ellipse cx="590" cy="60" rx="30" ry="20" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
                <ellipse cx="618" cy="52" rx="20" ry="14" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.10)" strokeWidth="1" />
                <ellipse cx="610" cy="68" rx="15" ry="10" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                <text x="600" y="95" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="8" fontFamily="monospace">fog output</text>
                <text x="600" y="105" textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="7" fontFamily="monospace">{"<"}50μm VMD</text>

                {/* Spark ignition indicator */}
                <circle cx="90" cy="60" r="6" fill="rgba(220,38,38,0.15)" stroke="rgba(220,38,38,0.4)" strokeWidth="1" />
                <path d="M88 56 L93 61 L89 61 L94 66" stroke="rgba(251,191,36,0.8)" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </div>

            <p className="text-cinema-600 text-xs mt-4">
              Helmholtz-type pulsating combustion. Chemical injected into 300–400°C resonator exhaust gas — vaporises, condenses at nozzle as sub-50μm droplets.
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
