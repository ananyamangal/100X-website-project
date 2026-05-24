"use client"

import React from "react"
import { Badge } from "@/components/ui/badge"
import { CheckCircle } from "lucide-react"

export default function ManufacturerIntroBlock() {
  return (
    <section className="py-16 md:py-20 bg-white" aria-labelledby="manufacturer-intro-heading">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 lg:gap-16 items-center mb-14 md:mb-16">
          <div className="order-2 md:order-1 text-center md:text-left">
            <Badge className="mb-5 bg-green-600 hover:bg-green-700 text-base md:text-lg px-5 md:px-6 py-1.5 md:py-2">
              Trusted Manufacturer
            </Badge>
            <h2
              id="manufacturer-intro-heading"
              className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-800 mb-5 leading-tight"
            >
              Trusted Thermal Fogging Machine Manufacturer in India
            </h2>
            <p className="text-base md:text-lg text-gray-600 leading-relaxed mb-6">
              100X Circle designs and manufactures field-ready thermal foggers from our Gurugram facility — trusted by 10,000+ customers including municipalities, Nagar Nigams, agricultural cooperatives, and private pest-control operators.
            </p>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm md:text-[15px] text-gray-700 list-none max-w-md mx-auto md:mx-0">
              {[
                "GeM-approved OEM",
                "Made in India",
                "10,000+ customers",
                "50+ distributors",
              ].map((item) => (
                <li key={item} className="flex items-start">
                  <span className="mt-1.5 mr-2 inline-block w-1.5 h-1.5 rounded-full bg-green-600 shrink-0" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="order-1 md:order-2 relative">
            <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 shadow-md aspect-[4/3]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/production.png"
                alt="100X Circle thermal fogging machine manufacturing in Gurugram"
                loading="lazy"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-4 -left-4 hidden sm:flex flex-col items-start gap-0.5 rounded-xl bg-white shadow-lg ring-1 ring-gray-200 px-4 py-3">
              <span className="text-xs uppercase tracking-wider text-green-700 font-semibold">Manufactured in</span>
              <span className="text-base md:text-lg font-bold text-gray-900">Gurugram, India</span>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 md:gap-12 mb-12">
          <div>
            <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">
              Public Health Fogging Solutions
            </h3>
            <p className="text-gray-700 leading-relaxed">
              Industrial thermal fogging equipment built for large-scale mosquito control drives. Pulse-jet technology penetrates thick vegetation, open drains, and construction sites where conventional spraying cannot reach. GeM-procurable for municipal bodies, Nagar Panchayats, and public health departments across Bihar, UP, Delhi, Maharashtra, Gujarat, and beyond.
            </p>
          </div>
          <div>
            <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3">
              Agricultural Fogging Machines for Farm-Level Use
            </h3>
            <p className="text-gray-700 leading-relaxed">
              Lightweight, single-operator foggers used by farmers across India to apply fungicides, pesticides, and plant growth regulators across orchards, paddy fields, and vegetable farms. Handles both diesel-based and water-based formulations.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-gray-50/60 p-7 md:p-9">
          <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-5 text-center">
            Why Choose 100X Circle
          </h3>
          <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-3 list-none">
            {[
              "10+ years of focused manufacturing experience in fogging equipment",
              "GeM-approved OEM status for direct government procurement",
              "Pulse-jet engine technology for consistent, powerful fog output",
              "50+ active distributors across India for local support",
              "Full range covering vehicle-mounted, portable, and combination foggers",
              "Direct warranty and after-sales service from the manufacturer",
            ].map((item) => (
              <li key={item} className="flex items-start text-gray-700">
                <CheckCircle
                  size={18}
                  aria-hidden="true"
                  className="mt-1 mr-2.5 shrink-0 text-green-600"
                />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
