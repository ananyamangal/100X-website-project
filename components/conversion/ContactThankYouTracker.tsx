"use client"

import { useEffect, useRef } from "react"
import { pushDataLayer, readContactLeadContext } from "@/lib/gtm"

/**
 * Fires GA4-friendly conversion events once on the contact thank-you page.
 */
export function ContactThankYouTracker() {
  const fired = useRef(false)

  useEffect(() => {
    if (fired.current) return
    fired.current = true
    const ctx = readContactLeadContext() || {}
    const base = {
      conversion_step: "thank_you",
      lead_type: "contact_form",
      ...ctx,
    }
    pushDataLayer({ event: "generate_lead", ...base })
    pushDataLayer({ event: "contact_form_submission", ...base })
  }, [])

  return null
}
