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
    <section className="relative overflow-hidden py-24 md:py-32 bg-brand-700">
      {/* Background pattern */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

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
