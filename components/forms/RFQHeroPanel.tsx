"use client"

import React, { useState } from "react"
import { ChevronDown, ChevronUp, FileText } from "lucide-react"
import RFQForm from "./RFQForm"

export default function RFQHeroPanel() {
  // Mobile starts collapsed to keep hero scannable.
  const [mobileOpen, setMobileOpen] = useState(false)
  return (
    <>
      {/* Desktop: persistent side panel */}
      <div className="hidden md:block w-full max-w-md mx-auto md:ml-auto md:mr-0">
        <RFQForm variant="panel" location="hero_panel_desktop" />
      </div>

      {/* Mobile: collapsible block */}
      <div className="md:hidden mt-6 mx-auto max-w-md">
        <button
          type="button"
          aria-expanded={mobileOpen}
          aria-controls="rfq-hero-mobile"
          onClick={() => setMobileOpen((v) => !v)}
          className="w-full inline-flex items-center justify-between rounded-xl bg-white shadow-md ring-1 ring-gray-200 px-4 py-3 text-sm font-semibold text-gray-900"
        >
          <span className="inline-flex items-center gap-2">
            <FileText className="text-green-700" size={18} aria-hidden="true" />
            Request a Quote / Tender Inquiry
          </span>
          {mobileOpen ? <ChevronUp size={18} aria-hidden="true" /> : <ChevronDown size={18} aria-hidden="true" />}
        </button>
        {mobileOpen && (
          <div id="rfq-hero-mobile" className="mt-3">
            <RFQForm variant="panel" location="hero_panel_mobile" />
          </div>
        )}
      </div>
    </>
  )
}
