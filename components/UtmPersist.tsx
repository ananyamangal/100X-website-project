"use client"

import { useEffect } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { mergePersistedAttributionFromUrl, initSessionAttribution } from "@/lib/gtm"

/**
 * Runs on every page navigation:
 * 1. initSessionAttribution — records landingPage, firstPageVisited,
 *    sessionPageCount, entryReferrer on the first page of each session;
 *    increments sessionPageCount on subsequent pages.
 * 2. mergePersistedAttributionFromUrl — copies UTM/gclid params from the URL
 *    into sessionStorage so redirects don't lose campaign attribution.
 */
export default function UtmPersist() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    initSessionAttribution()
    mergePersistedAttributionFromUrl()
  }, [pathname, searchParams])

  return null
}
