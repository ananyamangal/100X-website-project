"use client"

import { useEffect, useRef } from "react"
import { pushDataLayer, readContactLeadContext } from "@/lib/gtm"

// Estimated value of an inbound contact lead. Tune via env (or update here)
// so GA4 / Google Ads can optimise on revenue instead of raw lead count.
const CONTACT_LEAD_VALUE_INR =
  Number(process.env.NEXT_PUBLIC_CONTACT_LEAD_VALUE_INR) || 150000

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
    pushDataLayer({
      event: "generate_lead",
      value: CONTACT_LEAD_VALUE_INR,
      currency: "INR",
      ...base,
    })
    pushDataLayer({ event: "contact_form_submission", ...base })
  }, [])

  return null
}
