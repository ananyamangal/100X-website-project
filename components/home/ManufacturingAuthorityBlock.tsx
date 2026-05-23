"use client"

import React from "react"
import { Factory, MapPin, Award, Wrench } from "lucide-react"

const STATS = [
  { icon: Factory, value: "Gurugram", label: "Manufacturing facility" },
  { icon: Award, value: "10+ years", label: "Of OEM production" },
  { icon: Wrench, value: "In-house", label: "Engineering & assembly" },
  { icon: MapPin, value: "50+", label: "Distribution points" },
]

export default function ManufacturingAuthorityBlock() {
  return (
    <section
      className="bg-gradient-to-b from-gray-950 to-gray-900 py-16 md:py-24"
      aria-labelledby="manufacturing-heading"
    >
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-12 md:mb-16">
          <p className="text-xs md:text-sm uppercase tracking-widest text-green-400 font-semibold mb-3">
            Manufacturing Authority
          </p>
          <h2
            id="manufacturing-heading"
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight"
          >
            Designed, Built, and Tested in India
          </h2>
          <p className="text-base md:text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Pulse-jet thermal foggers engineered and assembled at our Gurugram facility. Every machine field-tested for Indian conditions before it ships — from monsoon humidity to high-vegetation municipal terrain.
          </p>
        </div>

        <ul className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 list-none">
          {STATS.map((s) => {
            const Icon = s.icon
            return (
              <li
                key={s.label}
                className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-7 text-center"
              >
                <Icon className="text-green-400 mx-auto mb-3" size={28} aria-hidden="true" />
                <div className="text-xl md:text-2xl font-bold text-white mb-1">{s.value}</div>
                <div className="text-xs md:text-sm text-gray-400">{s.label}</div>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
