// Centralized post-login landing page helper.
// Works in both Node.js (API routes) and the browser (client components).
// Update the map here when new role-specific workspaces are built.

const ROLE_LANDING: Record<string, string> = {
  super_admin:         "/admin/growth",
  growth_admin:        "/admin/growth",
  content_team:        "/admin",
  sales_manager:       "/admin",           // future: /admin/sales
  sales_executive:     "/admin",           // future: /admin/sales
  procurement_analyst: "/admin",           // future: /admin/procurement
  viewer:              "/admin",
}

const FALLBACK = "/admin"

/**
 * Returns the correct post-login destination for a given RBAC role.
 * Falls back to /admin for unknown roles.
 */
export function getDefaultLandingPage(role: string): string {
  return ROLE_LANDING[role] ?? FALLBACK
}
