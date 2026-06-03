"use client"

import React from "react"
import Link from "next/link"
import ScrollReveal from "@/components/cinematic/ScrollReveal"
import { MessageCircle, Mail, ArrowRight, Phone } from "lucide-react"
import { BUSINESS } from "@/lib/seo/site-config"

const PATHWAYS = [
  {
    segment: "Government & Institutional",
    description: "GeM procurement, tender support, ISO certificate copies, MSME documentation",
    action: "Get Procurement Pack",
    icon: MessageCircle,
    href: `https://wa.me/${BUSINESS.whatsappE164}?text=${encodeURIComponent(
      "Hi 100X Circle, I am a government/institutional buyer. Please send me GeM and tender procurement documentation."
    )}`,
    external: true,
    accent: "rgba(59,130,246,0.12)",
    border: "rgba(59,130,246,0.25)",
  },
  {
    segment: "Agricultural & Commercial",
    description: "Product demo, pricing, dealer in your district, WhatsApp quote in 2 hours",
    action: "Get a Quote",
    icon: Phone,
    href: `https://wa.me/${BUSINESS.whatsappE164}?text=${encodeURIComponent(
      "Hi 100X Circle, I want a quote for a fogging machine. Please share current pricing."
    )}`,
    external: true,
    accent: "rgba(34,197,94,0.08)",
    border: "rgba(34,197,94,0.20)",
  },
  {
    segment: "Export & OEM",
    description: "CE documentation, bulk pricing, OEM manufacturing enquiry, international shipping",
    action: "Send Enquiry",
    icon: Mail,
    href: `mailto:${BUSINESS.email}?subject=Export%20%2F%20OEM%20Enquiry%20%E2%80%94%20100X%20Circle`,
    external: true,
    accent: "rgba(168,85,247,0.08)",
    border: "rgba(168,85,247,0.20)",
  },
]

export default function S12CTA() {
  return (
    <section
      className="relative py-24 md:py-36 overflow-hidden"
      style={{ background: "#050505" }}
    >
      {/* Brand red ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 50%, rgba(220,38,38,0.10) 0%, transparent 70%)",
        }}
      />

      {/* Fog atmosphere echoing S1 */}
      <div
        className="absolute fog-layer-1 pointer-events-none"
        aria-hidden="true"
        style={{
          bottom: "-30%",
          left: "-10%",
          width: "70%",
          height: "60%",
          background:
            "radial-gradient(ellipse, rgba(234,88,12,0.08) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      <div className="container mx-auto px-6 md:px-10 relative z-10">

        {/* Main CTA header */}
        <div className="text-center mb-14 md:mb-18">
          <ScrollReveal animation="fade-up">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="w-8 h-px bg-brand-500/40" />
              <span className="eyebrow text-brand-400">100X Circle · Gurugram, India</span>
              <div className="w-8 h-px bg-brand-500/40" />
            </div>
          </ScrollReveal>
          <ScrollReveal animation="fade-up" delay={80}>
            <h2
              className="text-white text-balance mb-6"
              style={{
                fontSize: "clamp(2.5rem, 6vw, 5.5rem)",
                fontWeight: 900,
                lineHeight: 0.95,
                letterSpacing: "-0.04em",
              }}
            >
              Built In India.
              <br />
              <span className="text-brand-500">For India.</span>
            </h2>
          </ScrollReveal>
          <ScrollReveal animation="fade-up" delay={150}>
            <p className="text-cinema-400 text-lg max-w-2xl mx-auto leading-relaxed mb-10">
              IS14855-certified. ISO 9001:2015. GeM MSME OEM. CE export models.
              Supplied to municipalities, health departments, and farms across every Indian state —
              and exported to South Asia, Africa, and the Middle East.
            </p>
          </ScrollReveal>

          {/* Primary CTA pair */}
          <ScrollReveal animation="fade-up" delay={220}>
            <div className="flex flex-wrap justify-center gap-4 mb-4">
              <a
                href={`https://wa.me/${BUSINESS.whatsappE164}?text=${encodeURIComponent(
                  "Hi 100X Circle, I want to know more about your fogging machines."
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-4 bg-brand-600 hover:bg-brand-700 text-white font-700 rounded-full transition-all duration-200 shadow-lg shadow-brand-900/40 hover:-translate-y-0.5 text-sm"
              >
                <MessageCircle size={18} />
                WhatsApp Us Now
              </a>
              <Link
                href="/contact-us"
                className="inline-flex items-center gap-2 px-8 py-4 border border-white/20 hover:border-white/40 hover:bg-white/5 text-white font-500 rounded-full transition-all duration-200 text-sm"
              >
                Contact Form
                <ArrowRight size={16} />
              </Link>
            </div>
          </ScrollReveal>

          <ScrollReveal animation="fade-up" delay={280}>
            <p className="text-cinema-700 text-xs">
              {BUSINESS.phonePrimary} · {BUSINESS.email}
            </p>
          </ScrollReveal>
        </div>

        <hr className="cinema-divider mb-12" />

        {/* Three pathway cards */}
        <div className="grid md:grid-cols-3 gap-4">
          {PATHWAYS.map((path, i) => {
            const Icon = path.icon
            return (
              <ScrollReveal key={i} animation="fade-up" delay={i * 80}>
                <a
                  href={path.href}
                  target={path.external ? "_blank" : undefined}
                  rel={path.external ? "noopener noreferrer" : undefined}
                  className="rounded-2xl p-7 border flex flex-col gap-5 cinema-card-hover group block"
                  style={{ background: path.accent, borderColor: path.border }}
                >
                  <div>
                    <p className="eyebrow text-cinema-600 mb-3 text-xs">{path.segment}</p>
                    <p className="text-white font-600 text-sm leading-relaxed">{path.description}</p>
                  </div>
                  <div className="flex items-center gap-2 text-cinema-400 group-hover:text-white transition-colors text-sm font-600 mt-auto">
                    <Icon size={16} />
                    <span>{path.action}</span>
                    <ArrowRight size={14} className="ml-auto group-hover:translate-x-1 transition-transform" />
                  </div>
                </a>
              </ScrollReveal>
            )
          })}
        </div>

        {/* Made in India badge row */}
        <ScrollReveal animation="fade-up" delay={300} className="mt-14 md:mt-18">
          <div className="flex flex-wrap justify-center items-center gap-6 md:gap-10 opacity-40">
            {[
              "Made in India",
              "ISO 9001:2015",
              "IS14855 BIS",
              "GeM MSME OEM",
              "CE Export",
              "UDYAM Registered",
            ].map((label) => (
              <span key={label} className="eyebrow text-white" style={{ fontSize: "0.6rem" }}>
                {label}
              </span>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
