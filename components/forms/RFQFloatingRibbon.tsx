"use client"

import React, { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { FileText, X } from "lucide-react"
import RFQForm from "./RFQForm"

// Routes that should NOT show the floating ribbon (admin tooling, success
// pages, etc.). Match by prefix.
const HIDE_ON_PREFIXES = ["/admin", "/thank-you", "/brochure-thank-you"]

export default function RFQFloatingRibbon() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  const hidden = pathname ? HIDE_ON_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/")) : false

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", onKey)
    // Prevent background scroll while open
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    closeButtonRef.current?.focus()
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
    }
  }, [open])

  if (hidden) return null

  return (
    <>
      {/* Mobile: vertical ribbon pinned mid-left (MobileCtaBar occupies the
          full-width bottom strip on mobile, so this avoids colliding with it).
          Desktop (md+): repositioned to a bottom-left corner pill so it never
          overlaps scrolled mid-page content regardless of scroll position,
          and sits opposite WhatsAppFloatingButton (bottom-right, desktop-only)
          instead of on top of it. */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Submit RFQ / Tender inquiry"
        data-gtm="rfq_ribbon_open"
        className="flex fixed left-0 top-1/2 -translate-y-1/2 rotate-180 [writing-mode:vertical-rl] md:left-6 md:right-auto md:top-auto md:bottom-6 md:translate-y-0 md:rotate-0 md:[writing-mode:horizontal-tb] z-[60] items-center gap-1.5 md:gap-2 px-2 md:px-4 py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold tracking-wide shadow-lg rounded-tr-xl rounded-br-xl md:rounded-full text-xs md:text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-green-700"
      >
        <FileText size={14} aria-hidden="true" className="md:hidden" />
        <FileText size={16} aria-hidden="true" className="hidden md:block" />
        <span className="md:hidden">Request for Quotation</span>
        <span className="hidden md:inline">Request for Quotation</span>
      </button>

      {/* Slide-over modal */}
      {open && (
        <div
          className="fixed inset-0 z-[90] bg-black/55 flex items-stretch justify-end"
          role="dialog"
          aria-modal="true"
          aria-labelledby="rfq-modal-title"
          onClick={() => setOpen(false)}
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
                <p className="text-sm text-gray-600 mt-1">Government, municipal, dealer, and bulk orders.</p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                aria-label="Close RFQ form"
                className="-mr-2 -mt-2 rounded-md p-2 text-gray-500 hover:text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
                onClick={() => setOpen(false)}
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <RFQForm variant="card" location="floating_ribbon" />
          </div>
        </div>
      )}
    </>
  )
}
