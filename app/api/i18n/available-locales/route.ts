import { NextRequest, NextResponse } from "next/server"
import { getAvailableLocales } from "@/lib/seo/hreflang"
import { isUntranslatableProductLanding } from "@/lib/seo/locale-gate"
import { isLocaleManagedPathname, BLOG_INDEX_TRANSLATED_LOCALES } from "@/lib/i18n/locale-routes"
import { getBlogBySlug } from "@/lib/blogsQuery"

export const dynamic = "force-dynamic"

// Fetched by LanguageSwitcher on every locale-managed page view. The answer
// only changes when a reviewed translation is published, so the CDN may hold
// each pathname's response for 5 min instead of invoking this per view.
const CACHE_HEADERS = { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" }
const json = (body: { locales: readonly string[] }) => NextResponse.json(body, { headers: CACHE_HEADERS })

/**
 * Client-side counterpart to lib/seo/hreflang.ts's getAvailableLocales(),
 * used only by LanguageSwitcher (a client component mounted in the global
 * Navbar, which has no per-page slug/blogId context of its own). Resolves
 * the same reviewed-content-gated locale list that hreflang/sitemap already
 * use, so the switcher never offers a locale with no real content behind it
 * — mirrors the server-side resolution in LandingRenderer.tsx and
 * app/[locale]/blog/[slug]/page.tsx exactly, just reachable over HTTP.
 */
export async function GET(request: NextRequest) {
  const pathname = request.nextUrl.searchParams.get("pathname") || ""

  if (!isLocaleManagedPathname(pathname)) {
    return json({ locales: ["en"] })
  }

  if (pathname === "/blog") {
    return json({ locales: BLOG_INDEX_TRANSLATED_LOCALES })
  }

  if (pathname.startsWith("/blog/")) {
    const slug = pathname.slice("/blog/".length)
    let blog: { _id?: unknown } | null = null
    try {
      blog = await getBlogBySlug(slug)
    } catch {
      blog = null
    }
    if (!blog?._id) return json({ locales: ["en"] })
    const locales = await getAvailableLocales("blog", String(blog._id))
    return json({ locales })
  }

  const slug = pathname.slice(1)
  const candidates = await getAvailableLocales("landing", slug)
  // isUntranslatableProductLanding is now async (it may need a DB lookup for
  // non-registered products) — resolve all candidates' gate checks in
  // parallel first, then filter, rather than filtering with an async
  // predicate (which silently never awaits and keeps everything).
  const gated = await Promise.all(candidates.map((l) => isUntranslatableProductLanding(slug, l)))
  const locales = candidates.filter((_, i) => !gated[i])
  return json({ locales })
}
