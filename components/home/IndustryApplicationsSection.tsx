"use client"

import React from "react"
import ScrollReveal from "@/components/cinematic/ScrollReveal"
import { ArrowRight } from "lucide-react"
import Link from "next/link"

const INDUSTRIES = [
  {
    id: "municipal",
    name: "Municipal Corporations",
    tagline: "City-scale vector control",
    description: "Deployed across 200+ municipalities for mosquito & pest management in residential zones, drains, and public parks.",
    icon: "🏛️",
    gradient: "from-blue-600 to-blue-800",
    stat: "200+ Cities",
    link: "/knowledge/mosquito-control-india",
  },
  {
    id: "agriculture",
    name: "Agriculture & Farms",
    tagline: "Precision crop protection",
    description: "High-reach thermal fog for orchards, paddy fields, and plantation crops. Superior penetration to standard ULV sprayers.",
    icon: "🌾",
    gradient: "from-brand-600 to-brand-800",
    stat: "50+ Crop Types",
    link: "/products",
  },
  {
    id: "defence",
    name: "Defence & Cantonments",
    tagline: "Mission-critical hygiene",
    description: "Trusted by Indian Armed Forces installations for perimeter sanitation and vector control in sensitive environments.",
    icon: "⚔️",
    gradient: "from-gray-600 to-gray-800",
    stat: "GeM Verified",
    link: "/knowledge/government-procurement-guide",
  },
  {
    id: "hospitals",
    name: "Hospitals & Healthcare",
    tagline: "Infection prevention",
    description: "Disinfection fogging for ICUs, wards, and large healthcare complexes. Hospital-grade chemical compatibility.",
    icon: "🏥",
    gradient: "from-teal-600 to-teal-800",
    stat: "Zero-residue mode",
    link: "/products",
  },
  {
    id: "industrial",
    name: "Industrial & Warehouses",
    tagline: "Large-area coverage",
    description: "Vehicle-mounted systems cover factories, cold storage, and logistics hubs efficiently in a single pass.",
    icon: "🏭",
    gradient: "from-orange-600 to-orange-800",
    stat: "2 km²/hour",
    link: "/vehicle-mounted-fogging-machine",
  },
  {
    id: "government",
    name: "Government Procurement",
    tagline: "GeM portal ready",
    description: "Registered on Government e-Marketplace with full documentation for direct government purchase orders.",
    icon: "🏛",
    gradient: "from-purple-600 to-purple-800",
    stat: "GeM OEM",
    link: "/knowledge/government-procurement-guide",
  },
]

export default function IndustryApplicationsSection() {
  return (
    <section className="section-cinema py-24 md:py-32">
      <div className="container mx-auto px-4 md:px-6">

        {/* Header */}
        <div className="max-w-3xl mb-16 md:mb-20">
          <ScrollReveal animation="fade-up">
            <p className="eyebrow text-brand-400 mb-4">Applications</p>
          </ScrollReveal>
          <ScrollReveal animation="fade-up" delay={100}>
            <h2 className="text-display-md text-white mb-6 text-balance">
              Built for every environment that demands reliability.
            </h2>
          </ScrollReveal>
          <ScrollReveal animation="fade-up" delay={200}>
            <p className="text-lg text-cinema-300 max-w-2xl leading-relaxed">
              From city-scale mosquito control to precision agriculture — 100X Circle machines operate where failure is not an option.
            </p>
          </ScrollReveal>
        </div>

        {/* Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {INDUSTRIES.map((ind, i) => (
            <ScrollReveal key={ind.id} animation="fade-up" delay={i * 80} className="h-full">
              <Link href={ind.link} className="group block h-full">
                <article className="glass-card rounded-2xl p-6 h-full flex flex-col hover:border-brand-600/40 transition-all duration-500 hover:-translate-y-1">
                  <div className="flex items-start justify-between mb-4">
                    <span className="text-3xl">{ind.icon}</span>
                    <span className="eyebrow text-brand-400 text-[10px]">{ind.stat}</span>
                  </div>
                  <h3 className="font-700 text-white text-lg mb-1">{ind.name}</h3>
                  <p className="text-brand-400 text-sm font-500 mb-3">{ind.tagline}</p>
                  <p className="text-cinema-300 text-sm leading-relaxed flex-1">{ind.description}</p>
                  <div className="mt-5 flex items-center gap-1.5 text-brand-400 text-sm font-500 group-hover:gap-3 transition-all">
                    Learn more <ArrowRight size={14} />
                  </div>
                </article>
              </Link>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  )
}
