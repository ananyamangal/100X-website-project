"use client"

import { useEffect, useRef } from "react"
import { pushDataLayer, readBrochureLeadContext } from "@/lib/gtm"

// Brochure-download intent is softer than a contact form — value is set lower
// so blended optimisation in Ads/GA4 doesn't over-weight top-of-funnel leads.
const BROCHURE_LEAD_VALUE_INR =
  Number(process.env.NEXT_PUBLIC_BROCHURE_LEAD_VALUE_INR) || 50000

export function BrochureThankYouTracker() {
  const fired = useRef(false)

  useEffect(() => {
    if (fired.current) return
    fired.current = true
    const ctx = readBrochureLeadContext() || {}
    const base = {
      conversion_step: "brochure_thank_you",
      ...ctx,
    }
    pushDataLayer({ event: "brochure_download", ...base })
    pushDataLayer({
      event: "generate_lead",
      lead_type: "brochure",
      value: BROCHURE_LEAD_VALUE_INR,
      currency: "INR",
      ...base,
    })
  }, [])

  return null
}
