import type { Metadata, MetadataRoute } from "next"
import clientPromise from "@/lib/mongodb"
import { routing } from "@/i18n/routing"
import { SITE_URL } from "@/lib/seo/site-config"

export type LocalizedContentKind = "landing" | "blog"

/**
 * Locales with real translated content for one piece of content — always
 * includes "en" (the source content). A locale is only included if a
 * REVIEWED translation row actually exists in Mongo (landing:
 * `reviewed: true`; blog: `status: "approved"`) — an unreviewed row is
 * treated as not existing. This is what keeps hreflang from ever
 * advertising a locale that would silently render English fallback content
 * (a duplicate-content signal to search engines) or, worse, unreviewed
 * machine-translated content, and it's what lets Phase 2 languages appear
 * in hreflang/sitemap automatically the moment their content is seeded AND
 * reviewed, with zero per-page code changes.
 */
export async function getAvailableLocales(kind: LocalizedContentKind, key: string): Promise<string[]> {
  const found = new Set<string>(["en"])
  try {
    const client = await clientPromise
    const db = client.db()
    const collection = kind === "landing" ? "landing_page_translations" : "translations"
    const filter =
      kind === "landing"
        ? { slug: key, reviewed: true }
        : { contentType: "blog", contentId: key, status: "approved" }
    const rows: unknown[] = await db.collection(collection).distinct("locale", filter)
    for (const l of rows) {
      if (typeof l === "string" && (routing.locales as readonly string[]).includes(l)) found.add(l)
    }
  } catch (err) {
    console.warn(
      `[i18n] Could not resolve available locales for ${kind}/${key} — hreflang will only include English.`,
      (err as Error).message,
    )
  }
  // Order follows routing.locales so output is stable and always English-first.
  return routing.locales.filter((l) => found.has(l))
}

/** `canonicalPath` is the locale-agnostic path, e.g. "/blog/my-post" or "/some-slug". */
export function localizedPath(canonicalPath: string, locale: string): string {
  return locale === "en" ? canonicalPath : `/${locale}${canonicalPath}`
}

/**
 * Builds the Metadata `alternates` block for one rendered page. Each locale
 * variant canonicalizes to itself (standard hreflang practice) — this does
 * NOT force canonical back to English; that's a separate, deliberate
 * decision from the English-stays-default routing behavior (see
 * i18n/routing.ts's localeDetection:false). x-default and the language map
 * always resolve to whichever locales actually have content.
 */
export function buildPageAlternates(opts: {
  canonicalPath: string
  currentLocale: string
  availableLocales: string[]
}): Metadata["alternates"] {
  const { canonicalPath, currentLocale, availableLocales } = opts
  const canonical = localizedPath(canonicalPath, currentLocale)

  // No genuine alternate exists yet (only "en" has content) — omit the
  // languages map entirely rather than emitting self-referencing hreflang
  // tags that assert nothing. Keeps output identical to a page with no
  // locale variants until a real second-language version exists.
  if (availableLocales.length <= 1) return { canonical }

  const languages: Record<string, string> = { "x-default": localizedPath(canonicalPath, "en") }
  for (const locale of availableLocales) languages[locale] = localizedPath(canonicalPath, locale)

  return { canonical, languages }
}

/**
 * Builds one sitemap <url> entry per available locale variant, each
 * carrying the full reciprocal hreflang set (including itself) — this is
 * Google's documented multi-language sitemap format: every language version
 * needs its own entry, not just the English one annotated with alternates.
 * Called only for locale-managed content; everything else keeps its single
 * unprefixed sitemap entry with no alternates block, unchanged.
 */
export function buildLocalizedSitemapEntries(opts: {
  canonicalPath: string
  availableLocales: string[]
  lastModified: Date
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]
  priority: number
}): MetadataRoute.Sitemap {
  const { canonicalPath, availableLocales, lastModified, changeFrequency, priority } = opts
  const base = { lastModified, changeFrequency, priority }

  // No genuine alternate exists yet — a single plain entry, identical in
  // shape to non-locale-managed content (no alternates block at all).
  if (availableLocales.length <= 1) {
    return [{ url: `${SITE_URL}${canonicalPath}`, ...base }]
  }

  const languages: Record<string, string> = {
    "x-default": `${SITE_URL}${localizedPath(canonicalPath, "en")}`,
  }
  for (const locale of availableLocales) {
    languages[locale] = `${SITE_URL}${localizedPath(canonicalPath, locale)}`
  }

  return availableLocales.map((locale) => ({
    url: `${SITE_URL}${localizedPath(canonicalPath, locale)}`,
    ...base,
    alternates: { languages },
  }))
}
