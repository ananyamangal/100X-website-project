"use client"

import { useEffect, useRef } from "react"
import { pushDataLayer, readContactLeadContext } from "@/lib/gtm"

const CONTACT_LEAD_VALUE_INR =
  Number(process.env.NEXT_PUBLIC_CONTACT_LEAD_VALUE_INR) || 150000

// Types that have already fired generate_lead in their form component.
// The thank-you page must NOT re-fire to prevent double Google Ads conversions.
const INLINE_FIRED_TYPES = new Set([
  "rfq",
  "oem_authorization",
  "dealer_inquiry",
  "tender_inquiry",
  "guide_download",
  "use_case_quote",
  "sticky_quote",
])

interface Props {
  /** Passed from the server component via searchParams.type */
  type?: string
}

export function ContactThankYouTracker({ type }: Props) {
  const fired = useRef(false)

  useEffect(() => {
    if (fired.current) return
    fired.current = true

    const normalizedType = (type ?? "contact").toLowerCase()

    // Only fire generate_lead for contact form — all other types fired it inline.
    if (!INLINE_FIRED_TYPES.has(normalizedType)) {
      const ctx = readContactLeadContext() || {}
      pushDataLayer({
        event: "generate_lead",
        value: CONTACT_LEAD_VALUE_INR,
        currency: "INR",
        lead_type: "contact_form",
        conversion_step: "thank_you",
        ...ctx,
      })
      pushDataLayer({
        event: "contact_form_submission",
        lead_type: "contact_form",
        conversion_step: "thank_you",
        ...ctx,
      })
    }
  }, [type])

  return null
}
