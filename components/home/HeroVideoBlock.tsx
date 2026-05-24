"use client"

import React, { useState } from "react"
import Link from "next/link"
import { ArrowRight, MessageCircle, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BUSINESS } from "@/lib/seo/site-config"
import HeroVideoModal from "./HeroVideoModal"

// Hero demo from @100Xcircle: https://www.youtube.com/shorts/ZiVGNkvAI9g
const HERO_VIDEO_ID = "ZiVGNkvAI9g"

interface Props {
  youtubeId?: string;
}

export default function HeroVideoBlock({ youtubeId = HERO_VIDEO_ID }: Props) {
  const isPlaceholder = youtubeId === "REPLACE_WITH_HERO_VIDEO_ID"
  const [open, setOpen] = useState(false)
  const posterSrc = `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`

  return (
    <section
      className="relative bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 py-16 md:py-24 overflow-hidden"
      aria-labelledby="hero-video-heading"
    >
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="text-center mb-10 md:mb-14">
          <h2
            id="hero-video-heading"
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight"
          >
            See 100X Fogging Machines in Real-World Operation
          </h2>
          <p className="text-base md:text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed">
            Watch our pulse-jet thermal foggers cover dense vegetation, narrow lanes, and open fields — the same machines deployed by municipalities, Nagar Nigams, and farm cooperatives across India.
          </p>
        </div>

        <div className="relative rounded-2xl overflow-hidden shadow-2xl ring-1 ring-white/10 bg-black">
          {isPlaceholder ? (
            <div
              className="aspect-video w-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center text-gray-400"
              role="status"
              aria-label="Demo video placeholder"
            >
              <div className="text-center">
                <Play className="mx-auto mb-3 opacity-60" size={48} aria-hidden="true" />
                <p className="text-sm md:text-base">Demo video coming soon</p>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Play 100X Fogging Machine demo video"
              data-gtm="hero_video_open"
              className="group relative block w-full aspect-video focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-inset"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={posterSrc}
                alt=""
                aria-hidden="true"
                loading="lazy"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
              <span className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              <span className="absolute inset-0 grid place-items-center">
                <span className="grid place-items-center w-16 h-16 md:w-20 md:h-20 rounded-full bg-green-600/95 text-white shadow-2xl ring-4 ring-white/20 group-hover:scale-110 transition-transform">
                  <Play size={28} className="ml-0.5" aria-hidden="true" />
                </span>
              </span>
            </button>
          )}
        </div>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            asChild
            size="lg"
            className="bg-green-600 hover:bg-green-700 text-lg px-8 py-4"
          >
            <Link href="/contact-us" className="flex items-center">
              Talk to Our Team <ArrowRight className="ml-2" size={20} />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-2 border-white text-white hover:bg-white hover:text-gray-900 text-lg px-8 py-4 bg-transparent"
          >
            <a
              href={`https://wa.me/${BUSINESS.whatsappE164}?text=${encodeURIComponent("Hi, I saw the demo video on your homepage and would like to discuss further.")}`}
              target="_blank"
              rel="noopener noreferrer"
              data-gtm="cta_whatsapp"
              data-gtm-location="hero_video"
              className="flex items-center"
            >
              <MessageCircle className="mr-2" size={20} />
              WhatsApp
            </a>
          </Button>
        </div>
      </div>

      {!isPlaceholder && (
        <HeroVideoModal open={open} onClose={() => setOpen(false)} youtubeId={youtubeId} />
      )}
    </section>
  )
}
