"use client"

import React from "react"
import Link from "next/link"
import {
  Flame,
  Droplets,
  Wind,
  Target,
  Leaf,
  ShieldCheck,
  Building2,
  Sprout,
  ArrowRight,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const PROCESS_STEPS = [
  {
    icon: Flame,
    title: "Pulse-Jet Combustion",
    body: "A pulse-jet engine ignites a controlled fuel-air mix at high frequency — no moving compressor parts, low maintenance, consistent output.",
  },
  {
    icon: Droplets,
    title: "Chemical Vaporization",
    body: "Heat from the combustion chamber vaporizes the chemical or water-based solution as it passes through the resonator tube.",
  },
  {
    icon: Wind,
    title: "Ultra-Fine Fog Ejection",
    body: "The vapor cools instantly at the nozzle, forming sub-50-micron droplets — small enough to drift, large enough to deposit on target surfaces.",
  },
  {
    icon: Target,
    title: "Deep Penetration",
    body: "The dense fog penetrates foliage, open drains, voids, and construction sites that conventional sprayers cannot reach.",
  },
]

const BENEFITS = [
  {
    icon: Leaf,
    title: "Lower Chemical Consumption",
    body: "Up to 10× less pesticide per acre compared to manual spraying — ultra-fine droplets cover more surface area per litre.",
  },
  {
    icon: ShieldCheck,
    title: "Effective Vector Control",
    body: "Field-proven against dengue, malaria, and chikungunya vectors. Deployed by municipal bodies during outbreaks.",
  },
  {
    icon: Building2,
    title: "Municipal-Grade",
    body: "GeM-listed OEM equipment trusted by Nagar Nigams, Nagar Palikas, and Panchayats for public-health fogging drives.",
  },
  {
    icon: Sprout,
    title: "Agricultural Applications",
    body: "Pesticides, fungicides, and plant-growth regulators for orchards, paddy fields, and vegetable farms — single-operator friendly.",
  },
]

export default function TechnologyBlock() {
  return (
    <section
      className="bg-white py-16 md:py-24"
      aria-labelledby="technology-heading"
    >
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-12 md:mb-16">
          <Badge className="mb-5 bg-green-100 text-green-800 hover:bg-green-200 text-base px-5 py-1.5">
            How It Works
          </Badge>
          <h2
            id="technology-heading"
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-5 leading-tight"
          >
            Pulse-Jet Thermal Fogging Technology
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Four engineered stages that turn a fuel-air spark into a dense, deep-penetrating fog — built for both municipal vector control and agricultural crop protection.
          </p>
        </div>

        <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 mb-16 md:mb-20 list-none">
          {PROCESS_STEPS.map((step, index) => {
            const Icon = step.icon
            return (
              <li
                key={step.title}
                className="relative rounded-2xl border border-gray-200 bg-gray-50/60 p-6 md:p-7 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="grid place-items-center w-10 h-10 rounded-full bg-green-600 text-white text-sm font-bold">
                    {index + 1}
                  </span>
                  <Icon className="text-green-700" size={28} aria-hidden="true" />
                </div>
                <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">
                  {step.title}
                </h3>
                <p className="text-sm md:text-base text-gray-700 leading-relaxed">
                  {step.body}
                </p>
              </li>
            )
          })}
        </ol>

        <div className="rounded-3xl bg-gradient-to-b from-gray-950 to-gray-900 p-8 md:p-10">
          <h3 className="text-2xl md:text-3xl font-bold text-white text-center mb-8 md:mb-10">
            Why pulse-jet beats conventional spraying
          </h3>
          <ul className="grid sm:grid-cols-2 gap-6 md:gap-8 list-none">
            {BENEFITS.map((b) => {
              const Icon = b.icon
              return (
                <li
                  key={b.title}
                  className="flex gap-4 items-start"
                >
                  <span className="shrink-0 grid place-items-center w-11 h-11 rounded-xl bg-green-600/15 ring-1 ring-green-500/30">
                    <Icon className="text-green-400" size={22} aria-hidden="true" />
                  </span>
                  <div>
                    <h4 className="text-base md:text-lg font-semibold text-white mb-1">
                      {b.title}
                    </h4>
                    <p className="text-sm md:text-base text-gray-300 leading-relaxed">
                      {b.body}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>

          <div className="mt-10 md:mt-12 flex justify-center">
            <Button
              asChild
              size="lg"
              className="bg-green-600 hover:bg-green-700 text-lg px-8 py-4"
            >
              <Link href="#products" className="flex items-center">
                Explore Machines <ArrowRight className="ml-2" size={20} />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
