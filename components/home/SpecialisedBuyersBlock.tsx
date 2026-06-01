"use client"

import React from "react"
import Link from "next/link"
import {
  Building2,
  Handshake,
  Globe2,
  Factory,
  ArrowRight,
} from "lucide-react"
import { BUSINESS } from "@/lib/seo/site-config"

const PROGRAMS = [
  {
    icon: Building2,
    title: "Government & Tender",
    body: "GeM-listed OEM. Direct supply to Nagar Nigams, Nagar Palikas, Panchayats, and Health Departments. Tender-ready documentation in 48 hours.",
    cta: "Request Tender Quote",
    whatsappMessage:
      "Hi, I'd like a tender / GeM quote. Please share rate, GST, delivery, and compliance certificates.",
  },
  {
    icon: Handshake,
    title: "Dealer & Distributor",
    body: "Active partners across 50+ Indian locations. Marketing collateral, training, demo machines, and territory-routed leads.",
    cta: "Become a Distributor",
    whatsappMessage:
      "Hi, I'd like to discuss becoming a dealer / distributor for 100x Circle. Please share margins and territory details.",
  },
  {
    icon: Globe2,
    title: "Export Buyers",
    body: "Shipping to South Asia, Africa, and the Middle East. FOB Mumbai / EXW Gurugram, with CIF and DDP on larger orders.",
    cta: "Export Inquiry",
    whatsappMessage:
      "Hi, I'm interested in importing 100x Circle fogging machines. Please share export catalog, prices, and incoterms.",
  },
  {
    icon: Factory,
    title: "Industrial & Estate",
    body: "Pest control companies, warehouses, factories, and agricultural estates. Single-operator and vehicle-mounted ranges available.",
    cta: "Talk to Our Team",
    whatsappMessage:
      "Hi, I'm looking at industrial / estate fogging machines for our facility. Please share recommended models.",
  },
]

export default function SpecialisedBuyersBlock() {
  return (
    <section
      className="bg-white py-16 md:py-24"
      aria-labelledby="specialised-buyers-heading"
    >
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-12 md:mb-14">
          <p className="eyebrow text-brand-600 mb-3">Specialised Programs</p>
          <h2
            id="specialised-buyers-heading"
            className="text-display-xs text-gray-900 mb-4 text-balance"
          >
            Built for every kind of buyer.
          </h2>
          <p className="text-base md:text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
            Government procurement, distributor partnerships, export, and industrial supply — each with a dedicated lane and a dedicated team.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-5 md:gap-6">
          {PROGRAMS.map((p) => {
            const Icon = p.icon
            const waHref = `https://wa.me/${BUSINESS.whatsappE164}?text=${encodeURIComponent(p.whatsappMessage)}`
            return (
              <div
                key={p.title}
                className="group rounded-2xl border border-gray-100 bg-white p-6 md:p-7 hover:shadow-lg hover:border-brand-200 hover:-translate-y-0.5 transition-all duration-300 flex flex-col"
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="grid place-items-center w-10 h-10 rounded-xl bg-brand-50 group-hover:bg-brand-100 transition-colors">
                    <Icon className="text-brand-700" size={20} aria-hidden="true" />
                  </span>
                  <h3 className="font-700 text-gray-900 text-lg">{p.title}</h3>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed mb-6 flex-1">
                  {p.body}
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/contact-us"
                    className="inline-flex items-center gap-1.5 text-sm font-600 text-white bg-brand-600 hover:bg-brand-700 px-4 py-2.5 rounded-full transition-colors"
                  >
                    {p.cta} <ArrowRight size={13} />
                  </Link>
                  <a
                    href={waHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-gtm="cta_whatsapp"
                    data-gtm-location={`specialised_${p.title.toLowerCase().replace(/\s+/g, "_")}`}
                    className="inline-flex items-center gap-1 text-sm font-500 text-gray-500 hover:text-brand-600 transition-colors"
                  >
                    WhatsApp →
                  </a>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
