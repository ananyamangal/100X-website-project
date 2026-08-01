"use client"

import { useEffect, useRef } from "react"
import { pushDataLayer, readContactLeadContext } from "@/lib/gtm"

const CONTACT_LEAD_VALUE_INR =
  Number(process.env.NEXT_PUBLIC_CONTACT_LEAD_VALUE_INR) || 150000

interface Props {
  /** Passed from the server component via searchParams.type */
  type?: string
}

export function ContactThankYouTracker({ type }: Props) {
  const fired = useRef(false)

  useEffect(() => {
    if (fired.current) return
    fired.current = true

    const normalizedType = (type ?? "").toLowerCase()
    if (normalizedType !== "contact") return

    // Require a real lead context set by ContactSection.tsx at submit time —
    // guards against firing on a bookmarked/shared /thank-you?type=contact
    // link that was never reached via an actual submission.
    const ctx = readContactLeadContext()
    if (!ctx) return

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
  }, [type])

  return null
}
