"use client"

import { useEffect } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { mergePersistedAttributionFromUrl } from "@/lib/gtm"

/**
 * Merges UTM/gclid from the URL into sessionStorage so redirects retain attribution.
 */
export default function UtmPersist() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    mergePersistedAttributionFromUrl()
  }, [pathname, searchParams])

  return null
}
