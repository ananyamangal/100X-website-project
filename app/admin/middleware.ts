import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // In production, this should check for proper authentication
  const isProduction = process.env.NODE_ENV === "production"
  const isAuthenticated = request.cookies.get("admin-token")

  if (isProduction && !isAuthenticated) {
    return NextResponse.redirect(new URL("/admin/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: "/admin/:path*",
}
