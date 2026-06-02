"use client"

import React from "react"
import ScrollReveal from "@/components/cinematic/ScrollReveal"
import { MessageCircle, ArrowRight, Download } from "lucide-react"
import { BUSINESS } from "@/lib/seo/site-config"
import Link from "next/link"

interface Props {
  headline?: string
  subheadline?: string
  primaryCTA?: string
  brochureUrl?: string | null
}

export default function CinematicCTASection({
  headline = "Ready to deploy India's most trusted fogging machine?",
  subheadline = "Talk to our technical team. Get a quote in 24 hours. Zero commitment.",
  primaryCTA = "Request a Quote",
  brochureUrl,
}: Props) {
  const waHref = `https://wa.me/${BUSINESS.whatsappE164}?text=${encodeURIComponent("Hi, I'd like a price quote for your fogging machines. Please share details.")}`

  return (
    <section className="relative overflow-hidden py-24 md:py-32 bg-brand-800">
      {/* Gradient depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-700 via-brand-800 to-brand-900 opacity-80" />
      {/* Subtle noise */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
      {/* Glow orb */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative container mx-auto px-4 md:px-6 text-center">
        <ScrollReveal animation="fade-up">
          <p className="eyebrow text-brand-200 mb-5">Get Started Today</p>
        </ScrollReveal>
        <ScrollReveal animation="fade-up" delay={100}>
          <h2 className="text-display-sm text-white mb-6 text-balance max-w-3xl mx-auto">
            {headline}
          </h2>
        </ScrollReveal>
        <ScrollReveal animation="fade-up" delay={200}>
          <p className="text-brand-100 text-lg mb-10 max-w-xl mx-auto">
            {subheadline}
          </p>
        </ScrollReveal>

        <ScrollReveal animation="scale" delay={300}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 px-8 py-4 bg-white text-brand-700 font-700 rounded-full hover:bg-brand-50 transition-all hover:-translate-y-0.5 shadow-xl shadow-brand-900/30 text-base"
            >
              <MessageCircle size={20} />
              {primaryCTA}
            </a>

            <Link
              href="/contact-us"
              className="inline-flex items-center gap-2 px-7 py-4 border-2 border-white/40 text-white font-600 rounded-full hover:border-white hover:bg-white/10 transition-all text-base"
            >
              Talk to an Expert <ArrowRight size={16} />
            </Link>

            {brochureUrl && (
              <a
                href={brochureUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-brand-200 hover:text-white font-500 transition-colors text-sm underline-offset-4 hover:underline"
              >
                <Download size={15} /> Download Catalogue
              </a>
            )}
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
