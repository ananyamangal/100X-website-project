import type { Metadata } from "next"
import { SITE_URL } from "@/lib/seo/site-config"
import {
  LANDING_PAGES,
  getLandingPage,
  type LandingPageDef,
} from "./landing-pages"

/**
 * @deprecated Read from `LANDING_PAGES` in `./landing-pages.ts` directly.
 * Kept as a re-export so older imports continue to resolve.
 */
export const PRODUCT_LANDING_META: Record<
  string,
  { title: string; description: string; keywords?: string }
> = Object.fromEntries(
  Object.entries(LANDING_PAGES).map(([slug, def]) => [
    slug,
    {
      title: def.title,
      description: def.description,
      keywords: def.keywords,
    },
  ]),
)

export { SITE_URL }

function resolveOgImage(def: LandingPageDef | undefined): string {
  const raw = def?.ogImage
  if (!raw) return `${SITE_URL}/logo-main.png`
  if (raw.startsWith("http")) return raw
  return `${SITE_URL}${raw.startsWith("/") ? "" : "/"}${raw}`
}

export function productLandingMetadata(slug: string): Metadata {
  const def = getLandingPage(slug)
  const title = def?.title ?? "Product | 100x Circle"
  const description =
    def?.description ??
    "Thermal fogging machines and agricultural equipment from 100x Circle, India."
  const keywords = def?.keywords
  const url = `${SITE_URL}/${slug}`
  const ogImage = resolveOgImage(def)
  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: `/${slug}`,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: "100x Circle",
      locale: "en_IN",
      type: "website",
      images: [{ url: ogImage }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  }
}
