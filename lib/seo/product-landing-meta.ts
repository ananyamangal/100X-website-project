import type { Metadata } from "next"
import { SITE_URL } from "@/lib/seo/site-config"
import {
  LANDING_PAGES,
  type LandingPageDef,
} from "./landing-pages"
import { getMergedLandingPage } from "./get-merged-landing-page"

/**
 * @deprecated Read from `LANDING_PAGES[slug].metadata` directly.
 * Kept as a re-export so older imports continue to resolve.
 */
export const PRODUCT_LANDING_META: Record<
  string,
  { title: string; description: string; keywords?: string }
> = Object.fromEntries(
  Object.entries(LANDING_PAGES).map(([slug, def]) => [
    slug,
    {
      title: def.metadata.title,
      description: def.metadata.description,
      keywords: def.metadata.keywords,
    },
  ]),
)

export { SITE_URL }

function resolveOgImage(def: LandingPageDef | undefined): string {
  const raw = def?.metadata.ogImage
  if (!raw) return `${SITE_URL}/logo-main.png`
  if (raw.startsWith("http")) return raw
  return `${SITE_URL}${raw.startsWith("/") ? "" : "/"}${raw}`
}

export async function productLandingMetadata(slug: string): Promise<Metadata> {
  const def = await getMergedLandingPage(slug) ?? undefined
  const title       = def?.metadata.title       ?? "Product | 100x Circle"
  const description = def?.metadata.description ??
    "Thermal fogging machines and agricultural equipment from 100x Circle, India."
  const ogTitle       = def?.metadata.ogTitle       || title
  const ogDescription = def?.metadata.ogDescription || description
  const keywords = def?.metadata.keywords
  const url      = `${SITE_URL}/${slug}`
  const ogImage  = resolveOgImage(def)
  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: `/${slug}`,
    },
    openGraph: {
      title:       ogTitle,
      description: ogDescription,
      url,
      siteName: "100x Circle",
      locale:   "en_IN",
      type:     "website",
      images:   [{ url: ogImage }],
    },
    twitter: {
      card:        "summary_large_image",
      title:       ogTitle,
      description: ogDescription,
    },
  }
}
