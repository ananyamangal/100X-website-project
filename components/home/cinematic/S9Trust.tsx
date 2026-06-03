"use client"

import React from "react"
import ScrollReveal from "@/components/cinematic/ScrollReveal"
import { ShieldCheck, Award, Star } from "lucide-react"

interface Accreditation {
  _id?: string
  logo: string
  name?: string
  url?: string
}

interface Props {
  accreditations?: Accreditation[]
}

const TRUST_ITEMS = [
  {
    icon: ShieldCheck,
    label: "IS14855 : BIS Certified",
    sub: "Government of India quality mark — pressed into the metal of every unit",
    accent: "rgba(220,38,38,0.15)",
    border: "rgba(220,38,38,0.3)",
    iconColor: "text-brand-400",
  },
  {
    icon: Award,
    label: "ISO 9001:2015",
    sub: "Externally audited quality management system — annual surveillance",
    accent: "rgba(59,130,246,0.10)",
    border: "rgba(59,130,246,0.25)",
    iconColor: "text-blue-400",
  },
  {
    icon: Star,
    label: "GeM MSME OEM",
    sub: "Government e-Marketplace verified. MSME mandatory preference — 25% procurement reserve",
    accent: "rgba(251,191,36,0.08)",
    border: "rgba(251,191,36,0.25)",
    iconColor: "text-yellow-400",
  },
]

const DECADE_STATS = [
  { value: "10+", label: "Years supplying Indian municipalities" },
  { value: "29", label: "States served pan-India" },
  { value: "50+", label: "Distribution points nationwide" },
  { value: "3–5 days", label: "Spare part delivery anywhere in India" },
]

export default function S9Trust({ accreditations = [] }: Props) {
  return (
    <section
      className="relative py-24 md:py-36 overflow-hidden"
      style={{ background: "#060606" }}
    >
      {/* Subtle brand glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(220,38,38,0.05) 0%, transparent 60%)",
        }}
      />

      <div className="container mx-auto px-6 md:px-10 relative z-10">

        {/* Section header */}
        <div className="text-center mb-14 md:mb-18">
          <ScrollReveal animation="fade-up">
            <div className="flex items-center justify-center gap-3 mb-5">
              <div className="w-6 h-px bg-brand-500/50" />
              <span className="eyebrow text-brand-400">Trust & Reliability</span>
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
              The Standard. Met.
            </h2>
          </ScrollReveal>
          <ScrollReveal animation="fade-up" delay={150}>
            <p className="text-cinema-400 text-lg max-w-xl mx-auto leading-relaxed">
              Not self-claimed. Not marketing language.
              Every certification is externally audited and physically present on the machine.
            </p>
          </ScrollReveal>
        </div>

        {/* Certification cards */}
        <div className="grid md:grid-cols-3 gap-4 mb-16">
          {TRUST_ITEMS.map((item, i) => {
            const Icon = item.icon
            return (
              <ScrollReveal key={i} animation="fade-up" delay={i * 80}>
                <div
                  className="rounded-2xl p-7 border h-full cinema-card-hover"
                  style={{ background: item.accent, borderColor: item.border }}
                >
                  <Icon size={28} strokeWidth={1.4} className={`mb-5 ${item.iconColor}`} />
                  <h3 className="text-white font-700 text-lg mb-3">{item.label}</h3>
                  <p className="text-cinema-400 text-sm leading-relaxed">{item.sub}</p>
                </div>
              </ScrollReveal>
            )
          })}
        </div>

        <hr className="cinema-divider mb-14" />

        {/* Decade stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-14">
          {DECADE_STATS.map((s, i) => (
            <ScrollReveal key={i} animation="fade-up" delay={i * 60}>
              <div className="text-center">
                <p
                  className="text-white font-900 mb-1"
                  style={{
                    fontSize: "clamp(1.5rem, 3.5vw, 2.5rem)",
                    lineHeight: 1,
                    letterSpacing: "-0.04em",
                  }}
                >
                  {s.value}
                </p>
                <p className="text-cinema-600 text-xs">{s.label}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* Accreditation logos from CMS */}
        {accreditations.length > 0 && (
          <>
            <hr className="cinema-divider mb-10" />
            <ScrollReveal animation="fade-up" delay={100}>
              <p className="text-center eyebrow text-cinema-600 mb-8">
                Certifications &amp; Accreditations
              </p>
            </ScrollReveal>
            <div className="flex flex-wrap justify-center items-center gap-5 md:gap-8">
              {accreditations.map((acc, i) => (
                <ScrollReveal key={acc._id || i} animation="scale" delay={i * 50}>
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl glass-card flex items-center justify-center p-3 hover:bg-white/10 transition-colors">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={acc.logo}
                      alt={acc.name || "Accreditation"}
                      className="max-w-full max-h-full object-contain"
                      loading="lazy"
                    />
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  )
}
