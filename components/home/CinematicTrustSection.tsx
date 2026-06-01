"use client"

import React from "react"
import ScrollReveal from "@/components/cinematic/ScrollReveal"
import { ShieldCheck, Award, Globe2, Zap } from "lucide-react"

const TRUST_PILLARS = [
  {
    icon: ShieldCheck,
    title: "ISO Certified",
    body: "Manufacturing processes certified to international quality management standards.",
    accent: "text-blue-400",
  },
  {
    icon: Award,
    title: "GeM OEM Registered",
    body: "Listed as Original Equipment Manufacturer on Government e-Marketplace for direct procurement.",
    accent: "text-brand-400",
  },
  {
    icon: Globe2,
    title: "Pan-India Presence",
    body: "Service network across 29 states. Spare parts dispatched within 24 hours.",
    accent: "text-purple-400",
  },
  {
    icon: Zap,
    title: "15+ Years Manufacturing",
    body: "A decade and a half of thermal fogging expertise — built into every machine we make.",
    accent: "text-yellow-400",
  },
]

interface Accreditation {
  _id?: string
  logo: string
  name?: string
  url?: string
}

interface Props {
  accreditations?: Accreditation[]
}

export default function CinematicTrustSection({ accreditations = [] }: Props) {
  return (
    <section className="py-20 md:py-28 bg-gray-950">
      <div className="container mx-auto px-4 md:px-6">

        {/* Eyebrow + heading */}
        <div className="text-center mb-16 md:mb-20">
          <ScrollReveal animation="fade-up">
            <p className="eyebrow text-brand-400 mb-4">Why 100X Circle</p>
          </ScrollReveal>
          <ScrollReveal animation="fade-up" delay={100}>
            <h2 className="text-display-sm text-white mb-5 text-balance">
              Trusted by governments,<br /> institutions, and farmers.
            </h2>
          </ScrollReveal>
          <ScrollReveal animation="fade-up" delay={200}>
            <p className="text-cinema-300 text-lg max-w-2xl mx-auto">
              Every machine leaves our facility with the backing of certifications, warranties, and a service promise that lasts the machine's lifetime.
            </p>
          </ScrollReveal>
        </div>

        {/* Pillars */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-16">
          {TRUST_PILLARS.map((pillar, i) => {
            const Icon = pillar.icon
            return (
              <ScrollReveal key={i} animation="fade-up" delay={i * 80}>
                <div className="glass-card rounded-2xl p-6 h-full">
                  <div className={`mb-4 ${pillar.accent}`}>
                    <Icon size={28} strokeWidth={1.5} />
                  </div>
                  <h3 className="text-white font-700 mb-2">{pillar.title}</h3>
                  <p className="text-cinema-400 text-sm leading-relaxed">{pillar.body}</p>
                </div>
              </ScrollReveal>
            )
          })}
        </div>

        {/* Accreditation logos */}
        {accreditations.length > 0 && (
          <>
            <hr className="cinema-divider mb-12" />
            <ScrollReveal animation="fade-up" delay={100}>
              <p className="text-center eyebrow text-cinema-500 mb-8">Certifications & Accreditations</p>
            </ScrollReveal>
            <div className="flex flex-wrap justify-center items-center gap-6 md:gap-10">
              {accreditations.map((acc, i) => (
                <ScrollReveal key={acc._id || i} animation="scale" delay={i * 60}>
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center p-3 hover:bg-white/10 transition-colors">
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
