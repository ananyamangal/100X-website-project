"use client"

import React from "react"
import Link from "next/link"
import { MapPin, ArrowRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"

// Curated list of major states/regions served. Each entry can optionally link
// to a state-specific landing page; entries without `href` render as a plain
// list item. Add new state landings here as they ship.
const STATES = [
  { name: "Bihar", href: "/fogging-machine-supplier-in-bihar" },
  { name: "Uttar Pradesh" },
  { name: "Delhi" },
  { name: "Haryana" },
  { name: "Maharashtra" },
  { name: "Gujarat" },
  { name: "Rajasthan" },
  { name: "Madhya Pradesh" },
  { name: "Karnataka" },
  { name: "Tamil Nadu" },
  { name: "West Bengal" },
  { name: "Punjab" },
  { name: "Telangana" },
  { name: "Andhra Pradesh" },
  { name: "Odisha" },
  { name: "Jharkhand" },
]

export default function StatesServedBlock() {
  return (
    <section
      className="bg-gray-50 py-16 md:py-20"
      aria-labelledby="states-served-heading"
    >
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-10 md:mb-14">
          <Badge className="mb-5 bg-green-100 text-green-800 hover:bg-green-200 text-base px-5 py-1.5">
            Pan-India Coverage
          </Badge>
          <h2
            id="states-served-heading"
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 leading-tight"
          >
            States We Serve
          </h2>
          <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Active distributors and direct supply across major Indian states — for municipal corporations, Nagar Nigams, Nagar Palikas, Panchayats, and private buyers.
          </p>
        </div>

        <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4 list-none">
          {STATES.map((s) => {
            const inner = (
              <span className="flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-200 bg-white hover:border-green-600 hover:shadow-sm transition-all">
                <MapPin className="text-green-700 shrink-0" size={18} aria-hidden="true" />
                <span className="text-sm md:text-base text-gray-800 font-medium">{s.name}</span>
                {s.href && (
                  <ArrowRight className="text-green-700 ml-auto shrink-0" size={16} aria-hidden="true" />
                )}
              </span>
            )
            return (
              <li key={s.name}>
                {s.href ? <Link href={s.href}>{inner}</Link> : inner}
              </li>
            )
          })}
        </ul>

        <p className="text-center mt-8 text-sm text-gray-600">
          Don't see your state listed? <Link href="/contact-us" className="text-green-700 underline-offset-2 hover:underline font-medium">Get in touch</Link> — we ship nationwide.
        </p>
      </div>
    </section>
  )
}
