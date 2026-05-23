"use client"

import React from "react"
import Link from "next/link"
import { MessageCircle, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
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
          <Button
            asChild
            size="lg"
            className="bg-green-600 hover:bg-green-700 text-base md:text-lg px-7 py-5 shadow-lg shadow-green-900/20"
          >
            <Link href="/contact-us" className="flex items-center">
              Get a Quote <ArrowRight className="ml-2" size={20} />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className={
              isDark
                ? "border-2 border-white text-white hover:bg-white hover:text-gray-900 bg-transparent text-base md:text-lg px-7 py-5"
                : "border-2 border-green-700 text-green-700 hover:bg-green-50 text-base md:text-lg px-7 py-5"
            }
          >
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center"
              data-gtm="cta_whatsapp"
              data-gtm-location="inline_inquiry"
            >
              <MessageCircle className="mr-2" size={20} />
              WhatsApp
            </a>
          </Button>
        </div>
      </div>
    </section>
  )
}
