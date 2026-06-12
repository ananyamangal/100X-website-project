/**
 * Role-Based Post-Login Routing
 * ─────────────────────────────
 * Single source of truth for where each role lands after a successful login.
 * Used by: password login API, Google OAuth callback, login page client redirect.
 *
 * Verified in production 2026-06-12:
 *   super_admin  → /admin/growth/dashboard  ✅
 *   content_team → /admin                   ✅
 *
 * To extend: add a new role entry below when its workspace page is built.
 * The three call sites (auth/route.ts, google/callback/route.ts, login/page.tsx)
 * all call this function — no other changes needed.
 */

const ROLE_LANDING: Record<string, string> = {
  super_admin:         "/admin/growth",
  growth_admin:        "/admin/growth",
  content_team:        "/admin",
  sales_manager:       "/admin",           // extend to /admin/sales when built
  sales_executive:     "/admin",           // extend to /admin/sales when built
  procurement_analyst: "/admin",           // extend to /admin/procurement when built
  viewer:              "/admin",
}

const FALLBACK = "/admin"

export function getDefaultLandingPage(role: string): string {
  return ROLE_LANDING[role] ?? FALLBACK
}
