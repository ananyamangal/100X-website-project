import { NextRequest, NextResponse } from "next/server"
import { verifyJWT, SESSION_COOKIE } from "@/lib/rbac/jwt"

const OID_PATTERN = /^[a-f0-9]{24}$/i

// Endpoints that stay public — login itself and OAuth callbacks
const AUTH_WHITELIST = new Set([
  "/api/admin/auth",
  "/api/admin/auth/logout",
  "/api/admin/auth/change-password",
  "/api/admin/health",
  "/api/admin/gsc/oauth/callback",
  "/api/admin/rbac/seed",
])

async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (!token) return false

  // Legacy session cookie — kept for zero-downtime migration
  if (token === "authenticated") return true

  // JWT session — verify signature and expiry
  const payload = await verifyJWT(token)
  return payload !== null
}

export async function middleware(request: NextRequest) {
  const { pathname, origin } = request.nextUrl

  // ── Admin page routes: inject x-is-admin + protect Growth OS ────────────────
  if (pathname.startsWith("/admin")) {
    if (
      (pathname.startsWith("/admin/growth") || pathname === "/admin/growth") &&
      !(await isAuthenticated(request))
    ) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = "/admin/login"
      return NextResponse.redirect(loginUrl)
    }

    const cloned = new Headers(request.headers)
    cloned.set("x-is-admin", "1")
    return NextResponse.next({ request: { headers: cloned } })
  }

  // ── Protect admin API routes ─────────────────────────────────────────────────
  if (pathname.startsWith("/api/admin/")) {
    if (!AUTH_WHITELIST.has(pathname)) {
      const token = request.cookies.get(SESSION_COOKIE)?.value

      // ── 401: no session ────────────────────────────────────────────────────
      if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

      // Legacy super-admin cookie — full access, skip permission checks
      if (token === "authenticated") return NextResponse.next()

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
  ],
}
