"use client"

import React from "react"
import RFQForm from "./RFQForm"

export default function RFQMidPageBlock() {
  return (
    <section
      className="bg-gradient-to-b from-gray-50 to-white py-16 md:py-24"
      aria-labelledby="rfq-mid-heading"
    >
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="text-center mb-10 md:mb-12">
          <p className="eyebrow text-brand-600 mb-3">Procurement & Bulk Inquiry</p>
          <h2
            id="rfq-mid-heading"
            className="text-display-xs text-gray-900 mb-4 text-balance"
          >
            Get a quote in 24 hours.
          </h2>
          <p className="text-base md:text-lg text-gray-500 max-w-2xl mx-auto leading-relaxed">
            GeM-ready documentation, GST invoices, and compliance certificates included. Our procurement desk responds within 48 hours.
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <RFQForm variant="card" location="mid_page_block" />
        </div>
      </div>
    </section>
  )
}
