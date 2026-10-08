import { cache } from "react"
import { unstable_cache } from "next/cache"
import clientPromise from "@/lib/mongodb"

/**
 * The root layout wraps every public route and every route currently renders
 * on demand, so its reads (brand assets, social links, brochure flag, trust
 * badges) used to cost four MongoDB round-trips per page view. They are now
 * served from the Data Cache: refreshed every LAYOUT_DATA_REVALIDATE_SECONDS,
 * and immediately when an admin save calls `revalidateTag(LAYOUT_DATA_TAG)`.
 *
 * Pattern used by every reader: the cached inner function THROWS on a DB
 * error (so a hiccup is never cached as the fallback value) and the exported
 * wrapper catches and returns the same fallback the uncached code returned.
 */
export const LAYOUT_DATA_TAG = "layout-data"
export const LAYOUT_DATA_REVALIDATE_SECONDS = 60

const fetchHasMainBrochure = unstable_cache(
  async (): Promise<boolean> => {
    const client = await clientPromise
    const count = await client
      .db()
      .collection("brochures.files")
      .countDocuments({ filename: "main-brochure.pdf" })
    return count > 0
  },
  ["layout-has-main-brochure-v1"],
  { tags: [LAYOUT_DATA_TAG], revalidate: LAYOUT_DATA_REVALIDATE_SECONDS },
)

export const getHasMainBrochure = cache(async (): Promise<boolean> => {
  try {
    return await fetchHasMainBrochure()
  } catch {
    return false
  }
})

const fetchActiveTrustBadges = unstable_cache(
  async () => {
    const client = await clientPromise
    const raw = await client
      .db()
      .collection("trust_badges")
      .find({ isActive: true })
      .sort({ order: 1 })
      .toArray()
    return JSON.parse(JSON.stringify(raw))
  },
  ["layout-active-trust-badges-v1"],
  { tags: [LAYOUT_DATA_TAG], revalidate: LAYOUT_DATA_REVALIDATE_SECONDS },
)

export const getActiveTrustBadges = cache(async () => {
  try {
    return await fetchActiveTrustBadges()
  } catch {
    return []
  }
})
