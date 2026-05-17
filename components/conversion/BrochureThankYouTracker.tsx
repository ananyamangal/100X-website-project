"use client"

import { useEffect, useRef } from "react"
import { pushDataLayer, readBrochureLeadContext } from "@/lib/gtm"

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
    pushDataLayer({ event: "generate_lead", lead_type: "brochure", ...base })
  }, [])

  return null
}
