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

// Phase 1 locales served under this route. 'en' has no URL prefix
// (localePrefix: 'as-needed' in i18n/routing.ts) — everything else does.
const OG_LOCALE: Record<string, string> = { en: "en_IN", hi: "hi_IN", id: "id_ID" }

function localizedPath(slug: string, locale: string): string {
  return locale === "en" ? `/${slug}` : `/${locale}/${slug}`
}

export async function productLandingMetadata(slug: string, locale: string = "en"): Promise<Metadata> {
  const def = await getMergedLandingPage(slug, locale) ?? undefined
  const title       = def?.metadata.title       ?? "Product | 100x Circle"
  const description = def?.metadata.description ??
    "Thermal fogging machines and agricultural equipment from 100x Circle, India."
  const ogTitle       = def?.metadata.ogTitle       || title
  const ogDescription = def?.metadata.ogDescription || description
  const keywords = def?.metadata.keywords
  const path     = localizedPath(slug, locale)
  const url      = `${SITE_URL}${path}`
  const ogImage  = resolveOgImage(def)
  return {
    title,
    description,
    keywords,
    // Slug not in the landing-page registry → page calls notFound(), but ISR may
    // serve a stale 200. Noindex the fallback so Google ignores any such ghost response.
    ...(!def && { robots: { index: false, follow: true } }),
    alternates: {
      canonical: path,
      languages: {
        "x-default": `/${slug}`,
        en: `/${slug}`,
        hi: `/hi/${slug}`,
        id: `/id/${slug}`,
      },
    },
    openGraph: {
      title:       ogTitle,
      description: ogDescription,
      url,
      siteName: "100x Circle",
      locale:   OG_LOCALE[locale] ?? "en_IN",
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
