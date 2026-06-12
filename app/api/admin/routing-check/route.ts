// Read-only diagnostic: confirms deployment version, caller role, and landing page.
// Requires a valid session — protected by middleware (not in AUTH_WHITELIST).

import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/rbac/server"
import { getDefaultLandingPage } from "@/lib/rbac/landing"

export const dynamic = "force-dynamic"

const ROLE_MAP: Record<string, string> = {
  super_admin:         "/admin/growth",
  growth_admin:        "/admin/growth",
  content_team:        "/admin",
  sales_manager:       "/admin",
  sales_executive:     "/admin",
  procurement_analyst: "/admin",
  viewer:              "/admin",
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request)
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  return NextResponse.json({
    deployment: {
      gitCommit:  process.env.VERCEL_GIT_COMMIT_SHA ?? "local-dev",
      gitBranch:  process.env.VERCEL_GIT_COMMIT_REF ?? "unknown",
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
    },
    caller: {
      email:       user.email,
      role:        user.role,
      landingPage: getDefaultLandingPage(user.role),
    },
    routing: {
      map:      ROLE_MAP,
      fallback: "/admin",
    },
  }, { headers: { "Cache-Control": "no-store" } })
}
