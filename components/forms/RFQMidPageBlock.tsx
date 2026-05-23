"use client"

import React from "react"
import { Badge } from "@/components/ui/badge"
import RFQForm from "./RFQForm"

export default function RFQMidPageBlock() {
  return (
    <section
      className="bg-gradient-to-b from-gray-50 to-white py-16 md:py-24"
      aria-labelledby="rfq-mid-heading"
    >
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="text-center mb-10 md:mb-12">
          <Badge className="mb-4 bg-green-100 text-green-800 hover:bg-green-200 text-base px-5 py-1.5">
            Procurement & Bulk Inquiry
          </Badge>
          <h2
            id="rfq-mid-heading"
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 leading-tight"
          >
            Request a Quote for Government, Municipal & Bulk Orders
          </h2>
          <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            GeM-ready documentation, GST invoices, and compliance certificates included. Upload your tender or specifications and our procurement desk will respond within 48 hours.
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <RFQForm variant="card" location="mid_page_block" />
        </div>
      </div>
    </section>
  )
}
