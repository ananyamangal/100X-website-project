"use client"

import React, { useEffect, useRef } from "react"
import Link from "next/link"
import { X, MessageCircle, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BUSINESS } from "@/lib/seo/site-config"

interface Props {
  open: boolean;
  onClose: () => void;
  youtubeId: string;
}

const WA_HREF = `https://wa.me/${BUSINESS.whatsappE164}?text=${encodeURIComponent(
  "Hi 100x Circle, I just watched the demo video and would like to discuss further.",
)}`

export default function HeroVideoModal({ open, onClose, youtubeId }: Props) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    // Move focus into the modal for keyboard users.
    closeButtonRef.current?.focus()
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  const embedSrc = `https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&playsinline=1&rel=0&modestbranding=1`

  return (
    <div
      className="fixed inset-0 z-[95] bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hero-video-modal-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl rounded-2xl overflow-hidden bg-black shadow-2xl ring-1 ring-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          ref={closeButtonRef}
          type="button"
          aria-label="Close video"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <X size={20} aria-hidden="true" />
        </button>

        <h2 id="hero-video-modal-title" className="sr-only">
          100X Fogging Machine Demo Video
        </h2>

        <div className="aspect-video w-full bg-black">
          <iframe
            className="w-full h-full border-0"
            src={embedSrc}
            title="100X Fogging Machine Demo"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 bg-gray-950 px-4 py-4 md:py-5 border-t border-white/10">
          <Button
            asChild
            size="lg"
            className="bg-brand-600 hover:bg-brand-700 text-base md:text-lg px-6 py-3 min-h-[44px]"
          >
            <Link href="/contact-us" className="flex items-center">
              Request a Demo <ArrowRight className="ml-2" size={18} />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-2 border-white text-white hover:bg-white hover:text-gray-900 bg-transparent text-base md:text-lg px-6 py-3 min-h-[44px]"
          >
            <a
              href={WA_HREF}
              target="_blank"
              rel="noopener noreferrer"
              data-gtm="cta_whatsapp"
              data-gtm-location="hero_video_modal"
              className="flex items-center"
            >
              <MessageCircle className="mr-2" size={18} />
              WhatsApp Us
            </a>
          </Button>
        </div>
      </div>
    </div>
  )
}
