import { NextRequest, NextResponse } from "next/server"
import createIntlMiddleware from "next-intl/middleware"
import { verifyJWT, SESSION_COOKIE } from "@/lib/rbac/jwt"
import { routing } from "@/i18n/routing"
import { isLocaleManagedPathname } from "@/lib/i18n/locale-routes"

const OID_PATTERN = /^[a-f0-9]{24}$/i

// Endpoints that stay public — login itself and OAuth callbacks
const AUTH_WHITELIST = new Set([
  "/api/admin/auth",
  "/api/admin/auth/logout",
  "/api/admin/auth/change-password",
  "/api/admin/auth/sessions/heartbeat",
  "/api/admin/auth/forgot-password",
  "/api/admin/auth/reset-password",
  "/api/admin/auth/google",
  "/api/admin/auth/google/callback",
  "/api/admin/health",
  "/api/admin/gsc/oauth/callback",
  "/api/admin/rbac/seed",
])

const intlMiddleware = createIntlMiddleware(routing)

// pathname here is the raw incoming request path, which may still carry an
// explicit locale prefix ("/hi", "/id", "/en", ...) — isLocaleManagedPathname
// alone only recognizes the locale-agnostic form, so prefixed paths are
// checked separately, generically over every configured locale (including
// the default "en"). "en" must be included even though it's the default
// locale: next-intl's client router always force-prefixes an explicit
// locale switch (see i18n/navigation.ts / next-intl's createNavigation), so
// "switch to English" from /hi or /id lands on "/en/<slug>" — without this
// middleware running for it, next-intl's own "as-needed" redirect (stripping
// the redundant default-locale prefix back to the bare canonical URL) never
// fires, and "/en/<slug>" renders live at 200 instead of 307ing to "/<slug>".
// Adding a locale to routing.locales is the only change this function ever
// needs again — see the matching config.matcher generation below.
function isLocaleManagedPath(pathname: string): boolean {
  for (const locale of routing.locales) {
    if (pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)) return true
  }
  return isLocaleManagedPathname(pathname)
}

async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (!token) return false
  const payload = await verifyJWT(token)
  return payload !== null
}

export async function middleware(request: NextRequest) {
  const { pathname, origin } = request.nextUrl

  // ── Admin page routes: inject x-is-admin + enforce unified auth ─────────────
  if (pathname.startsWith("/admin")) {
    const cloned = new Headers(request.headers)
    cloned.set("x-is-admin", "1")

    // Public admin pages — no authentication required
    if (pathname === "/admin/login" || pathname.startsWith("/admin/reset-password")) {
      return NextResponse.next({ request: { headers: cloned } })
    }

    // All other admin pages require authentication
    if (!(await isAuthenticated(request))) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = "/admin/login"
      return NextResponse.redirect(loginUrl)
    }

    return NextResponse.next({ request: { headers: cloned } })
  }

  // ── Protect admin API routes ─────────────────────────────────────────────────
  if (pathname.startsWith("/api/admin/")) {
    if (!AUTH_WHITELIST.has(pathname)) {
      const token = request.cookies.get(SESSION_COOKIE)?.value

      // ── 401: no session ────────────────────────────────────────────────────
      if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

      // Verify JWT — 401 if invalid/expired
      const payload = await verifyJWT(token)
      if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

      // ── 403: permission enforcement for sensitive route groups ─────────────
      const perms: string[] = payload.permissions ?? []

      // Procurement Intelligence — ALL routes require procurement.view
      if (pathname.startsWith("/api/admin/procurement/")) {
        if (!perms.includes("procurement.view")) {
          return NextResponse.json(
            { error: "Forbidden", required: "procurement.view", role: payload.role },
            { status: 403 }
          )
        }
      }

      // Growth AI agents — require at least one growth module permission
      // (these call external AI APIs and incur cost)
      if (pathname.startsWith("/api/admin/growth/agents/")) {
        const agentPerms = ["seo.view","geo.view","dealer.view","content.view","opportunities.view","automation.view"]
        if (!agentPerms.some(p => perms.includes(p))) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }
      }

      // GSC / GA4 — require seo.view / analytics.view respectively
      if (pathname.startsWith("/api/admin/gsc/")) {
        if (!perms.includes("seo.view")) {
          return NextResponse.json({ error: "Forbidden", required: "seo.view" }, { status: 403 })
        }
      }
      if (pathname.startsWith("/api/admin/ga4/")) {
        if (!perms.includes("analytics.view")) {
          return NextResponse.json({ error: "Forbidden", required: "analytics.view" }, { status: 403 })
        }
      }
    }
    return NextResponse.next()
  }

  // ── Protect /api/submissions GET (lead data) ─────────────────────────────────
  if (pathname === "/api/submissions" && request.method === "GET") {
    if (!(await isAuthenticated(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.next()
  }

  // ── i18n: only for routes moved under app/[locale]/ (Phase 1 slice) ─────────
  // Everything else (all other static/marketing pages) is untouched by design.
  if (isLocaleManagedPath(pathname)) {
    const intlResponse = await intlMiddleware(request)
    // Redirects (rare — e.g. URL normalization) skip rendering entirely, so
    // there's no <html lang> to fix; pass through unchanged.
    if (intlResponse.headers.get("location")) return intlResponse

    // x-locale-managed tells RootLayout (which wraps every route, including
    // the ~400 untouched pages outside app/[locale]/) that this specific
    // request is for one of the 9 locale-managed pages and should use the
    // resolved next-intl locale for <html lang>. Without this flag,
    // RootLayout can't tell "en because this genuinely is a locale-managed
    // page in English" apart from "en because getLocale() just falls back
    // to its default on an untouched page" — and it must not: every other
    // page needs to keep lang="en-IN" exactly as before Phase 1.
    //
    // next-intl's own response already carries its own request-header
    // override (x-next-intl-locale) via the same x-middleware-override-headers
    // / x-middleware-request-* mechanism NextResponse.next({request}) uses.
    // Blindly copying intlResponse.headers onto a second, independently
    // constructed override response clobbers that manifest instead of
    // merging it — Next then only decodes whichever manifest wrote last, and
    // the other header is left as an undecoded raw x-middleware-request-*
    // entry. So decode next-intl's manifest first and fold it into the same
    // Headers object our own override is built from, producing one manifest
    // that lists both headers.
    const cloned = new Headers(request.headers)
    const intlOverrideManifest = intlResponse.headers.get("x-middleware-override-headers")
    if (intlOverrideManifest) {
      for (const name of intlOverrideManifest.split(",").map((s) => s.trim())) {
        const value = intlResponse.headers.get(`x-middleware-request-${name}`)
        if (value !== null) cloned.set(name, value)
      }
    }
    cloned.set("x-locale-managed", "1")

    // For the default locale under "as-needed" prefixing, next-intl issues
    // an internal rewrite (bare "/slug" -> "/en/slug") so the App Router can
    // resolve app/[locale]/[slug] at all — without it, Next has no literal
    // page matching the un-rewritten external pathname and 404s (this broke
    // every locale-managed page's canonical English URL except the one slug
    // that still happened to have a leftover non-locale route folder masking
    // it). Rebuilding via NextResponse.next() below discards that rewrite
    // destination, so it has to be read off intlResponse and reapplied.
    const rewriteUrl = intlResponse.headers.get("x-middleware-rewrite")
    const response = rewriteUrl
      ? NextResponse.rewrite(new URL(rewriteUrl), { request: { headers: cloned } })
      : NextResponse.next({ request: { headers: cloned } })
    intlResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie))
    intlResponse.headers.forEach((value, key) => {
      if (!key.toLowerCase().startsWith("x-middleware-")) response.headers.set(key, value)
    })

    // next-intl's alternateLinks Link header (formerly worked around here
    // per-slug for TFS50/DB400/SSMA20) is now off globally in
    // i18n/routing.ts — see that file's comment. next-intl never sets this
    // header anymore, for any slug, so there's nothing left to delete here.
    return response
  }

  // ── Legacy product ObjectId → slug redirect ──────────────────────────────────
  const match = pathname.match(/^\/products\/([a-f0-9]{24})$/i)
  if (!match) return NextResponse.next()

  const id = match[1]
  if (!OID_PATTERN.test(id)) return NextResponse.next()

  try {
    const res = await fetch(`${origin}/api/product-slug?id=${id}`, {
      headers: { "x-middleware-internal": "1" },
    })
    if (!res.ok) return NextResponse.next()

    const data = await res.json()
    if (data.resolvedBy === "id" && data.slug && data.slug !== id) {
      const url = request.nextUrl.clone()
      url.pathname = `/products/${data.slug}`
      return NextResponse.redirect(url, { status: 308 })
    }
  } catch {
    // Let the page handle it normally
  }

  return NextResponse.next()
}

// NOTE ON WHY THIS IS HARDCODED, NOT GENERATED:
// This used to be `...routing.locales.flatMap(...)` / `...Array.from(LOCALE_MANAGED_SLUGS).map(...)`
// spread directly into config.matcher below — generated at module-eval time from
// routing.locales (i18n/routing.ts) and LOCALE_MANAGED_SLUGS (lib/i18n/locale-routes.ts)
// so the two lists could never drift. That broke the production build: Next.js
// statically analyzes `export const config = { matcher: [...] }` at build time (it has
// to, since middleware config is read before any JS runs, e.g. by the Edge routing
// layer) and REJECTS anything in that array that isn't a literal string — no spread
// operators, no computed/imported variables, no function calls. "Unsupported spread
// operator in the Array Expression at config.matcher" is exactly that check firing.
//
// So the entries below are the RESOLVED OUTPUT of that generation logic, computed and
// hardcoded as of 2026-08-06 (verified by running the exact same flatMap/map logic —
// see scripts/verify-locale-matchers.mjs), not hand-typed guesses:
//   - one `/${locale}`, `/${locale}/:path*` pair per entry in routing.locales (14
//     locales today: en, hi, id, bn, mr, te, ta, gu, ur, kn, or, ml, pa, as)
//   - one `/${slug}` per entry in LOCALE_MANAGED_SLUGS (9 slugs today)
//
// DRIFT RISK — READ BEFORE EDITING routing.locales OR LOCALE_MANAGED_SLUGS:
// If a locale is added/removed in i18n/routing.ts, or a slug is added/removed in
// lib/i18n/locale-routes.ts, this array does NOT update itself anymore and must be
// manually regenerated to match. Run `node scripts/verify-locale-matchers.mjs` after
// any such change — it recomputes both lists from the live source of truth and diffs
// them against this hardcoded array, so drift is caught instead of silently shipping
// stale matcher patterns. Do NOT "fix" this back into a spread over routing.locales /
// LOCALE_MANAGED_SLUGS — that reintroduces the exact build failure this comment exists
// to prevent (Next.js's static analyzer will reject it again, every time).
export const config = {
  matcher: [
    "/products/:path*",
    "/api/admin/:path*",
    "/api/submissions",
    "/admin/:path*",
    // i18n — locale-managed content only
    "/blog",
    "/blog/:path*",
    // --- locale-prefix matchers (routing.locales, 14 locales x 2 patterns) ---
    "/en",
    "/en/:path*",
    "/hi",
    "/hi/:path*",
    "/id",
    "/id/:path*",
    "/bn",
    "/bn/:path*",
    "/mr",
    "/mr/:path*",
    "/te",
    "/te/:path*",
    "/ta",
    "/ta/:path*",
    "/gu",
    "/gu/:path*",
    "/ur",
    "/ur/:path*",
    "/kn",
    "/kn/:path*",
    "/or",
    "/or/:path*",
    "/ml",
    "/ml/:path*",
    "/pa",
    "/pa/:path*",
    "/as",
    "/as/:path*",
    // --- locale-managed-slug matchers (LOCALE_MANAGED_SLUGS, 9 slugs) ---
    "/thermal-and-cold-fogging-machine-100xtfs50",
    "/double-barrel-thermal-fogging-machine-vehicle-mountable-100xdb400",
    "/gem-approved-fogging-machine-oem",
    "/fogging-machine-supplier-in-uttar-pradesh",
    "/fogging-machine-supplier-in-bihar",
    "/dengue-control-fogging-machine",
    "/thermal-vs-cold-fogging-machine",
    "/fogging-machine-buying-guide",
    "/thermal-fogging-machine-with-stainless-steel-tank-100xssma20",
  ],
}
