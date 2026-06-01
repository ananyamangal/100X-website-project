"use client"

import React from "react"
import Link from "next/link"
import { MessageCircle, ArrowRight } from "lucide-react"

import { BUSINESS } from "@/lib/seo/site-config"

interface Props {
  /** Lead-in line shown above the buttons. */
  text: string;
  /** Pre-filled WhatsApp message context. */
  whatsappMessage?: string;
  /** Tone: light (gray-50) or dark (gray-950). Use sparingly. */
  tone?: "light" | "dark";
}

export default function InlineInquiryCTA({
  text,
  whatsappMessage = "Hi, I'd like to discuss 100x Circle fogging machines.",
  tone = "light",
}: Props) {
  const waHref = `https://wa.me/${BUSINESS.whatsappE164}?text=${encodeURIComponent(whatsappMessage)}`
  const isDark = tone === "dark"
  return (
    <section
      className={isDark ? "bg-gray-950 py-12 md:py-16" : "bg-gray-50 py-12 md:py-16"}
      aria-label="Quick inquiry"
    >
      <div className="container mx-auto px-4 max-w-4xl text-center">
        <p className={`text-lg md:text-xl font-semibold mb-6 ${isDark ? "text-white" : "text-gray-900"}`}>
          {text}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/contact-us"
            className={`inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-600 text-sm transition-all hover:-translate-y-0.5 shadow-lg ${isDark ? 'bg-brand-600 hover:bg-brand-700 text-white shadow-brand-900/30' : 'bg-brand-600 hover:bg-brand-700 text-white shadow-brand-900/20'}`}
          >
            Get a Quote <ArrowRight size={16} />
          </Link>
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            data-gtm="cta_whatsapp"
            data-gtm-location="inline_inquiry"
            className={`inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-600 text-sm border-2 transition-all hover:-translate-y-0.5 ${isDark ? 'border-white/50 text-white hover:border-white hover:bg-white/10' : 'border-brand-600 text-brand-700 hover:bg-brand-50'}`}
          >
            <MessageCircle size={16} />
            WhatsApp
          </a>
        </div>
      </div>
    </section>
  )
}
