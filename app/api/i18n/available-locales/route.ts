import { NextRequest, NextResponse } from "next/server"
import { getAvailableLocales } from "@/lib/seo/hreflang"
import { isUntranslatableProductLanding } from "@/lib/seo/landing-pages"
import { isLocaleManagedPathname, BLOG_INDEX_TRANSLATED_LOCALES } from "@/lib/i18n/locale-routes"
import { getBlogBySlug } from "@/lib/blogsQuery"

export const dynamic = "force-dynamic"

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
    return NextResponse.json({ locales: ["en"] })
  }

  if (pathname === "/blog") {
    return NextResponse.json({ locales: BLOG_INDEX_TRANSLATED_LOCALES })
  }

  if (pathname.startsWith("/blog/")) {
    const slug = pathname.slice("/blog/".length)
    let blog: { _id?: unknown } | null = null
    try {
      blog = await getBlogBySlug(slug)
    } catch {
      blog = null
    }
    if (!blog?._id) return NextResponse.json({ locales: ["en"] })
    const locales = await getAvailableLocales("blog", String(blog._id))
    return NextResponse.json({ locales })
  }

  const slug = pathname.slice(1)
  const locales = (await getAvailableLocales("landing", slug)).filter(
    (l) => !isUntranslatableProductLanding(slug, l),
  )
  return NextResponse.json({ locales })
}
