import { cache } from "react"
import clientPromise from "@/lib/mongodb"
import { DEFAULT_SOCIAL_LINKS, normalizeSocialLinks, type SocialLinks } from "@/lib/socialLinksShared"

/**
 * Single source of truth for social platform links + visibility, shared by
 * the admin Site Settings "Social Media" tab, the public API, and every
 * public renderer (Navbar, SiteFooter, Contact page, Product pages,
 * Organization JSON-LD sameAs). Previously each of those read from a
 * hardcoded `BUSINESS` object in lib/seo/site-config.ts that the admin save
 * never touched — this module is what closes that gap.
 *
 * Server-only (imports MongoDB) — client components must import the pure
 * helpers/types from `lib/socialLinksShared` instead.
 */
export * from "@/lib/socialLinksShared"

export const getSocialLinks = cache(async (): Promise<SocialLinks> => {
  try {
    const client = await clientPromise
    const doc = await client.db().collection("site_settings").findOne({ key: "main" })
    return normalizeSocialLinks(doc?.social)
  } catch {
    return DEFAULT_SOCIAL_LINKS
  }
})
