"use client"

import React from "react"
import Link from "next/link"
import { ArrowRight, ChevronDown } from "lucide-react"
import { BUSINESS } from "@/lib/seo/site-config"

export default function S1Hero() {
  const waLink = `https://wa.me/${BUSINESS.whatsappE164}?text=${encodeURIComponent(
    "Hi, I want to know more about 100X Circle fogging machines. Please share details."
  )}`

  return (
    <section
      className="relative min-h-screen flex flex-col justify-center overflow-hidden"
      style={{ background: "#050505" }}
      aria-label="100X Circle — Thermal Fogging Machines"
    >
      {/* ── Fog layers: CSS-animated radial gradients ── */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {/* Warm amber source glow — bottom-left (simulates the fogger origin) */}
        <div
          className="absolute fog-layer-1"
          style={{
            bottom: "-10%",
            left: "-5%",
            width: "70%",
            height: "65%",
            background:
              "radial-gradient(ellipse at 30% 80%, rgba(251,146,60,0.22) 0%, rgba(234,88,12,0.12) 30%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />
        {/* Mid fog — fills center street-canyon */}
        <div
          className="absolute fog-layer-2"
          style={{
            top: "30%",
            left: "0%",
            width: "100%",
            height: "55%",
            background:
              "radial-gradient(ellipse at 20% 60%, rgba(251,191,36,0.10) 0%, rgba(255,255,255,0.08) 40%, transparent 75%)",
            filter: "blur(60px)",
          }}
        />
        {/* Upper atmospheric haze */}
        <div
          className="absolute fog-layer-3"
          style={{
            top: "-5%",
            right: "-10%",
            width: "55%",
            height: "50%",
            background:
              "radial-gradient(ellipse at 70% 20%, rgba(255,255,255,0.05) 0%, transparent 65%)",
            filter: "blur(50px)",
          }}
        />
        {/* Far-end street lamp — soft point glow */}
        <div
          className="absolute"
          style={{
            bottom: "28%",
            left: "18%",
            width: "4px",
            height: "4px",
            borderRadius: "50%",
            background: "rgba(251,191,36,0.9)",
            boxShadow:
              "0 0 40px 30px rgba(251,191,36,0.18), 0 0 120px 80px rgba(234,88,12,0.10), 0 0 300px 200px rgba(220,38,38,0.06)",
          }}
        />
        {/* Subtle dark vignette overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 120% 100% at 50% 50%, transparent 30%, rgba(0,0,0,0.65) 100%)",
          }}
        />
      </div>

      {/* ── Hero content ── */}
      <div className="relative z-10 container mx-auto px-6 md:px-10 pt-28 pb-20 md:pt-36 md:pb-28">
        <div className="max-w-4xl">

          {/* Eyebrow */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-6 h-px bg-brand-500" />
            <span className="eyebrow text-brand-400">100X Circle · Gurugram, India</span>
          </div>

          {/* Main headline — max 4 words per line */}
          <h1
            className="text-white mb-6 text-balance"
            style={{
              fontSize: "clamp(3rem, 7vw, 6.5rem)",
              fontWeight: 900,
              lineHeight: 0.95,
              letterSpacing: "-0.04em",
            }}
          >
            Fog That
            <br />
            <span className="text-brand-500">Finds Them</span>
          </h1>

          {/* Sub-headline */}
          <p
            className="text-cinema-300 mb-10 max-w-xl"
            style={{ fontSize: "clamp(1rem, 2vw, 1.25rem)", lineHeight: 1.6 }}
          >
            Sub-50 micron. No void unreached. No vector escapes.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap gap-4 mb-16">
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-600 rounded-full transition-all duration-200 text-sm shadow-lg shadow-brand-900/40 hover:-translate-y-0.5"
            >
              Get a Quote
              <ArrowRight size={16} />
            </a>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 px-7 py-3.5 border border-white/20 hover:border-white/40 hover:bg-white/5 text-white font-500 rounded-full transition-all duration-200 text-sm"
            >
              See All Machines
            </Link>
          </div>

          {/* Credential strip */}
          <div className="flex flex-wrap gap-x-7 gap-y-2">
            {[
              "IS14855 · BIS Certified",
              "ISO 9001:2015",
              "GeM MSME OEM",
              "Made in India",
              "10,000+ Deployed",
            ].map((cred) => (
              <span key={cred} className="text-xs text-cinema-500 font-500 tracking-wide">
                {cred}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Scroll indicator ── */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 opacity-40">
        <span className="eyebrow text-white" style={{ fontSize: "0.55rem" }}>
          Scroll
        </span>
        <ChevronDown size={14} className="text-white animate-bounce" />
      </div>

      {/* ── Bottom edge fade ── */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
        style={{
          background: "linear-gradient(to bottom, transparent, #050505)",
        }}
        aria-hidden="true"
      />
    </section>
  )
}
