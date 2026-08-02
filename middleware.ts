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

// pathname here is the raw incoming request path, which may still carry a
// "/hi" or "/id" prefix — isLocaleManagedPathname alone only recognizes the
// locale-agnostic form, so prefixed paths are checked separately.
function isLocaleManagedPath(pathname: string): boolean {
  if (pathname.startsWith("/hi") || pathname.startsWith("/id")) return true
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
    return intlMiddleware(request)
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

export const config = {
  matcher: [
    "/products/:path*",
    "/api/admin/:path*",
    "/api/submissions",
    "/admin/:path*",
    // i18n (Phase 1) — locale-managed content only
    "/blog",
    "/blog/:path*",
    "/hi",
    "/hi/:path*",
    "/id",
    "/id/:path*",
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
