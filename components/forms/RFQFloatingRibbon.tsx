"use client"

import React, { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { FileText, ShieldCheck, X } from "lucide-react"
import { cn } from "@/lib/utils"
import RFQForm from "./RFQForm"

// Routes that should NOT show the floating ribbon (admin tooling, success
// pages, etc.). Match by prefix.
const HIDE_ON_PREFIXES = ["/admin", "/thank-you", "/brochure-thank-you"]

// On the homepage the pills wait until the visitor has scrolled this far, then
// stay for the rest of the visit (also on scroll-up). Other pages: immediate.
const HOME_REVEAL_SCROLL_PX = 300

/**
 * The two floating entry points share ONE slide-over and ONE RFQForm; only
 * the telemetry location, the subtitle and the GeM checkbox preselect differ.
 */
/**
 * GeM pill chip image. null = neutral shield icon. The only GeM logo in the repo
 * ("/Logos clipart 2/GeM logo.png") has an opaque dark background; when a clean
 * transparent file is supplied, set its public path here — nothing else changes.
 */
const GEM_PILL_LOGO: string | null = null

type Entry = "rfq" | "gem"
const ENTRY: Record<Entry, { location: string; subtitle: string; gemAuth: boolean }> = {
  rfq: { location: "floating_ribbon", subtitle: "Government, municipal, dealer, and bulk orders.", gemAuth: false },
  gem: {
    location: "floating_gem_authorisation",
    subtitle: "GeM OEM authorization code for resellers, plus tender and registration support",
    gemAuth: true,
  },
}

export default function RFQFloatingRibbon() {
  const pathname = usePathname()
  const [open, setOpen] = useState<Entry | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const rfqButtonRef = useRef<HTMLButtonElement>(null)
  const gemButtonRef = useRef<HTMLButtonElement>(null)
  const openerRef = useRef<HTMLButtonElement | null>(null)

  const hidden = pathname ? HIDE_ON_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/")) : false
  const isHome = pathname === "/"
  const [homeRevealed, setHomeRevealed] = useState(false)

  useEffect(() => {
    if (!isHome) return
    setHomeRevealed(false)
    const check = () => {
      if (window.scrollY >= HOME_REVEAL_SCROLL_PX) {
        setHomeRevealed(true)
        window.removeEventListener("scroll", check)
      }
    }
    check()
    window.addEventListener("scroll", check, { passive: true })
    return () => window.removeEventListener("scroll", check)
  }, [isHome])

  const openFrom = (entry: Entry) => {
    openerRef.current = entry === "gem" ? gemButtonRef.current : rfqButtonRef.current
    setOpen(entry)
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null)
    }
    document.addEventListener("keydown", onKey)
    // Prevent background scroll while open
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    closeButtonRef.current?.focus()
    const opener = openerRef.current
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
      // Focus returns to the pill that opened the form.
      opener?.focus()
    }
  }, [open])

  if (hidden) return null
  const showPills = !isHome || homeRevealed

  return (
    <>
      {/* Bottom-left corner pill on every viewport. Mobile sits above
          MobileCtaBar's full-width strip via --mobile-cta-bar-h (the same
          CSS var MobileCtaBar itself keeps in sync with its rendered
          height) instead of a fixed offset, so it can't end up overlapping
          the bar if the bar ever grows taller (wrapped labels on tiny
          viewports). Desktop uses a plain bottom-6 since there's no bottom
          bar to clear there, and sits opposite WhatsAppFloatingButton
          (bottom-right, desktop-only) instead of on top of it. */}
      {showPills && (<>
      <button
        ref={rfqButtonRef}
        type="button"
        onClick={() => openFrom("rfq")}
        aria-label="Submit RFQ / Tender inquiry"
        data-gtm="rfq_ribbon_open"
        className="flex fixed left-4 md:left-6 bottom-[calc(var(--mobile-cta-bar-h)+1rem)] md:bottom-6 z-[60] items-center gap-1.5 md:gap-2 px-3 md:px-4 py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold tracking-wide shadow-lg rounded-full text-xs md:text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-green-700"
      >
        <FileText size={14} aria-hidden="true" className="md:hidden" />
        <FileText size={16} aria-hidden="true" className="hidden md:block" />
        <span className="md:hidden">Request for Quotation</span>
        <span className="hidden md:inline">Request for Quotation</span>
      </button>

      {/* Second pill, stacked directly above the RFQ pill (40 px tall on
          mobile, 44 px on desktop, plus an 8 px gap). Outlined so it reads
          as the secondary action. Hidden (not unmounted) while the slide-over is
          open, so focus can return to it on close. */}
      <button
        ref={gemButtonRef}
        type="button"
        onClick={() => openFrom("gem")}
        aria-label="Get GeM OEM authorization code"
        data-gtm="gem_authorisation_open"
        className={cn(open ? "hidden" : "flex", "fixed left-4 md:left-6 bottom-[calc(var(--mobile-cta-bar-h)+1rem+3rem)] md:bottom-[calc(1.5rem+3.25rem)] z-[60] min-h-[44px] items-center gap-2 pl-1.5 pr-3 md:pr-4 bg-white hover:bg-brand-50 text-brand-700 border-2 border-brand-600 font-semibold tracking-wide shadow-lg rounded-full text-xs md:text-sm motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2")}
      >
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-gray-200">
          {GEM_PILL_LOGO
            ? <Image src={GEM_PILL_LOGO} alt="GeM" width={22} height={22} sizes="22px" className="h-[22px] w-[22px] rounded-[4px] object-cover" />
            : <ShieldCheck size={18} aria-hidden="true" className="text-brand-700" />}
        </span>
        <span>Get GeM Auth Code</span>
      </button>
      </>)}

      {/* Slide-over modal */}
      {open && (
        <div
          className="fixed inset-0 z-[90] bg-black/55 flex items-stretch justify-end"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rfq-modal-title"
          onClick={() => setOpen(null)}
        >
          <div
            className="h-full w-full max-w-xl bg-white shadow-2xl overflow-y-auto p-5 md:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 id="rfq-modal-title" className="text-xl md:text-2xl font-bold text-gray-900">
                  RFQ / Tender Inquiry
                </h2>
                <p className="text-sm text-gray-600 mt-1">{ENTRY[open].subtitle}</p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                aria-label="Close RFQ form"
                className="-mr-2 -mt-2 rounded-md p-2 text-gray-500 hover:text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
                onClick={() => setOpen(null)}
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <RFQForm key={open} variant="card" location={ENTRY[open].location} defaultGemAuth={ENTRY[open].gemAuth} />
          </div>
        </div>
      )}
    </>
  )
}
