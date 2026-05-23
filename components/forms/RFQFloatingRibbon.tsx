"use client"

import React, { useEffect, useState } from "react"
import { FileText, X } from "lucide-react"
import RFQForm from "./RFQForm"

export default function RFQFloatingRibbon() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", onKey)
    // Prevent background scroll while open
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
    }
  }, [open])

  return (
    <>
      {/* Vertical ribbon — desktop only */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open RFQ / Tender inquiry form"
        data-gtm="rfq_ribbon_open"
        className="hidden md:flex fixed left-0 top-1/2 -translate-y-1/2 z-[60] origin-left rotate-180 [writing-mode:vertical-rl] items-center gap-2 px-3 py-4 bg-green-600 hover:bg-green-700 text-white font-semibold tracking-wide shadow-lg rounded-tr-xl rounded-br-xl text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-green-700"
      >
        <FileText size={16} aria-hidden="true" />
        <span>RFQ / Tender Inquiry</span>
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
                type="button"
                aria-label="Close RFQ form"
                className="-mr-2 -mt-2 rounded-md p-2 text-gray-500 hover:text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
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
