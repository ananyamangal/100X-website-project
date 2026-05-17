"use client"

import { useEffect, useState } from "react"
import { FileText, MessageCircle, Phone } from "lucide-react"
import { BUSINESS } from "@/lib/seo/site-config"

const WA_HREF = `https://wa.me/${BUSINESS.whatsappE164}?text=${encodeURIComponent(
  "Hi, I'd like a quote for 100x Circle fogging machines.",
)}`
const TEL_HREF = `tel:${BUSINESS.phonePrimary.replace(/\s+/g, "")}`

/**
 * Desktop-only sticky CTA capsule. Mirrors the mobile sticky bar but
 * placed bottom-center as a pill, appears after the user scrolls past
 * the hero so it never competes with hero CTAs.
 *
 * Hidden on mobile — the existing MobileCtaBar continues to own the
 * sub-768px experience. Inherits the global GTM listener via
 * `data-gtm-location="desktop_inquiry_bar"` so phone_click /
 * whatsapp_click events auto-fire with location.
 */
export default function DesktopInquiryBar({
  appearAfterPx = 540,
}: {
  appearAfterPx?: number
}) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > appearAfterPx)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [appearAfterPx])

  return (
    <div
      role="region"
      aria-label="Quick inquiry"
      data-gtm-location="desktop_inquiry_bar"
      className={
        "hidden md:flex fixed bottom-6 left-1/2 -translate-x-1/2 z-40 " +
        "items-center gap-1 rounded-full border border-[var(--rd-border-strong)] " +
        "bg-black/85 backdrop-blur-md p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.55)] " +
        "transition-all duration-300 motion-safe:will-change-transform " +
        (visible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-4 pointer-events-none")
      }
    >
      <a
        href={TEL_HREF}
        data-gtm="desktop_inquiry_call"
        className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-[var(--rd-text)] transition-colors hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rd-accent)]"
      >
        <Phone size={16} aria-hidden="true" />
        Call {BUSINESS.phonePrimary}
      </a>

      <a
        href={WA_HREF}
        target="_blank"
        rel="noopener noreferrer"
        data-gtm="desktop_inquiry_whatsapp"
        className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-[var(--rd-text)] transition-colors hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rd-accent)]"
      >
        <MessageCircle size={16} aria-hidden="true" />
        WhatsApp
      </a>

      <a
        href="/contact-us"
        data-gtm="desktop_inquiry_quote"
        className="inline-flex items-center gap-2 rounded-full bg-[var(--rd-accent)] px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-[var(--rd-accent-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
      >
        <FileText size={16} aria-hidden="true" />
        Request Quote
      </a>
    </div>
  )
}
