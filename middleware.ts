import { NextRequest, NextResponse } from "next/server"

const OID_PATTERN = /^[a-f0-9]{24}$/i

// Auth endpoints that must stay public (the login/auth calls themselves)
const AUTH_WHITELIST = new Set([
  "/api/admin/auth",
  "/api/admin/auth/change-password",
  "/api/admin/health",
])

function isAuthenticated(request: NextRequest): boolean {
  return request.cookies.get("admin-token")?.value === "authenticated"
}

export async function middleware(request: NextRequest) {
  const { pathname, origin } = request.nextUrl

  // ── Admin routes: inject x-is-admin header + protect Growth OS ──────────
  // The x-is-admin header lets app/layout.tsx skip the public Navbar/Footer
  // for all /admin/* routes so the public UI doesn't overlay the admin UI.
  if (pathname.startsWith("/admin")) {
    // Redirect unauthenticated users away from Growth OS pages
    if (pathname.startsWith("/admin/growth") && !isAuthenticated(request)) {
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = "/admin"
      return NextResponse.redirect(loginUrl)
    }
    // Forward a header so the root layout can detect admin context
    const res = NextResponse.next({
      request: {
        headers: new Headers({ ...Object.fromEntries(request.headers), "x-is-admin": "1" }),
      },
    })
    return res
  }

  // ── Protect admin API routes ──────────────────────────────────────────────
  // Every /api/admin/* route requires the admin-token cookie except the
  // auth endpoints themselves (login POST and change-password POST).
  if (pathname.startsWith("/api/admin/")) {
    if (!AUTH_WHITELIST.has(pathname) && !isAuthenticated(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.next()
  }

  // ── Protect /api/submissions GET (lead data) ──────────────────────────────
  // POST is public (form submissions from visitors are allowed).
  // GET lists all lead records — admin-only.
  if (pathname === "/api/submissions" && request.method === "GET") {
    if (!isAuthenticated(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.next()
  }

  // ── Legacy product ObjectId → slug redirect ───────────────────────────────
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
    // On any error, let the page handle it normally
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
