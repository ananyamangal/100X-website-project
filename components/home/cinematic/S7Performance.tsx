"use client"

import React from "react"
import ScrollReveal from "@/components/cinematic/ScrollReveal"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

export default function S7Performance() {
  return (
    <section
      className="relative py-24 md:py-40 overflow-hidden"
      style={{ background: "#040404" }}
    >
      {/* Full-bleed atmospheric background */}
      <div className="absolute inset-0" aria-hidden="true">
        {/* Warm amber fog source — bottom left */}
        <div
          className="absolute fog-layer-1"
          style={{
            bottom: "-20%",
            left: "-10%",
            width: "80%",
            height: "80%",
            background:
              "radial-gradient(ellipse 70% 60% at 20% 80%, rgba(234,88,12,0.18) 0%, rgba(251,146,60,0.08) 35%, transparent 70%)",
            filter: "blur(50px)",
          }}
        />
        <div
          className="absolute fog-layer-2"
          style={{
            top: "0%",
            right: "-5%",
            width: "60%",
            height: "70%",
            background:
              "radial-gradient(ellipse, rgba(255,255,255,0.04) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />
        {/* Street-canyon edge lines */}
        <svg
          className="absolute inset-0 w-full h-full opacity-5"
          viewBox="0 0 1200 600"
          preserveAspectRatio="xMidYMid slice"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          {/* Perspective vanishing-point lines — suggests street canyon */}
          <line x1="600" y1="300" x2="0" y2="0" stroke="white" strokeWidth="1" />
          <line x1="600" y1="300" x2="1200" y2="0" stroke="white" strokeWidth="1" />
          <line x1="600" y1="300" x2="0" y2="600" stroke="white" strokeWidth="1" />
          <line x1="600" y1="300" x2="1200" y2="600" stroke="white" strokeWidth="1" />
          {/* Mid-distance cross lines */}
          <line x1="0" y1="200" x2="1200" y2="200" stroke="white" strokeWidth="0.5" opacity="0.5" />
          <line x1="0" y1="400" x2="1200" y2="400" stroke="white" strokeWidth="0.5" opacity="0.5" />
        </svg>
        {/* Vignette */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 100% 100% at 50% 50%, transparent 20%, rgba(0,0,0,0.7) 100%)",
          }}
        />
      </div>

      <div className="container mx-auto px-6 md:px-10 relative z-10">
        <div className="max-w-3xl">
          <ScrollReveal animation="fade-up">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-6 h-px bg-brand-500" />
              <span className="eyebrow text-brand-400">In The Field</span>
            </div>
          </ScrollReveal>

          <ScrollReveal animation="fade-up" delay={80}>
            <h2
              className="text-white mb-6 text-balance"
              style={{
                fontSize: "clamp(2.5rem, 6vw, 5.5rem)",
                fontWeight: 900,
                lineHeight: 0.95,
                letterSpacing: "-0.04em",
              }}
            >
              The Drive
              <br />
              <span className="text-brand-500">That Protects</span>
            </h2>
          </ScrollReveal>

          <ScrollReveal animation="fade-up" delay={160}>
            <p className="text-cinema-300 text-lg leading-relaxed mb-10 max-w-2xl">
              Dawn. Every monsoon morning. In wards across UP, Bihar, Maharashtra, and Delhi.
              This is not a product demonstration. This is a municipal health operation —
              and it depends on the machine not failing.
            </p>
          </ScrollReveal>

          {/* Field operation facts */}
          <div className="grid sm:grid-cols-3 gap-4 mb-12">
            {[
              { value: "4:30 AM", label: "Standard operation start time" },
              { value: "6–8 AM", label: "Peak vector activity window" },
              { value: "Zero", label: "Tolerance for machine failure" },
            ].map((fact, i) => (
              <ScrollReveal key={i} animation="fade-up" delay={240 + i * 80}>
                <div
                  className="rounded-xl p-5 border border-white/6"
                  style={{ background: "rgba(255,255,255,0.03)" }}
                >
                  <p
                    className="text-white font-800 mb-1"
                    style={{ fontSize: "1.35rem", letterSpacing: "-0.02em" }}
                  >
                    {fact.value}
                  </p>
                  <p className="text-cinema-600 text-xs">{fact.label}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>

          <ScrollReveal animation="fade-up" delay={480}>
            <Link
              href="/deployments"
              className="inline-flex items-center gap-2 text-brand-400 hover:text-brand-300 font-600 transition-colors group"
            >
              See deployment record
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}
