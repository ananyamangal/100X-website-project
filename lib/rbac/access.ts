// Permission-driven access map for roles confined to the surfaces they own.
// Shared by middleware.ts (the perimeter) and app/admin/page.tsx (sidebar mirror)
// so the two cannot drift. Pure and dependency-free: it runs in the Edge runtime
// and is imported directly by the node:test regression test.
//
// Which roles are confined is still a role list (default-deny needs one), but
// WHAT a confined role can reach is decided only by the user's effective
// permissions (role base + grants - denials, as embedded in the JWT).

export const RESTRICTED_ROLES: ReadonlySet<string> = new Set(["seo_team", "content_team"])

export function isRestrictedRole(role: string | null | undefined): boolean {
  return !!role && RESTRICTED_ROLES.has(role)
}

// Dashboard sidebar tab -> permission required to see it. Insertion order is the
// order a restricted role is redirected to when its current tab is not allowed.
export const DASHBOARD_TAB_PERMISSIONS: Readonly<Record<string, string>> = {
  blogs:       "blog.view",
  knowledge:   "knowledge.view",
  products:    "products.view",
  caseStudies: "case_studies.view",
  spareParts:  "spare_parts.view",
  banners:     "banners.view",
}

export const LANDING_PAGES_PERMISSION = "landing_pages.view"

// Growth OS is read-only for a confined role: holding any of these opens GET on
// the growth/gsc/ga4 surface, and writes there stay closed regardless.
export const GROWTH_OS_READ_PERMISSIONS: readonly string[] = ["seo.view", "analytics.view"]

interface ApiRule {
  prefix: string
  // Any-of lists. A missing list means the method class is closed to confined roles.
  read?: readonly string[]     // GET / HEAD
  create?: readonly string[]   // POST   (falls back to write)
  write?: readonly string[]    // PUT / PATCH, and the fallback for POST / DELETE
  delete?: readonly string[]   // DELETE (falls back to write)
}

// Default-deny: a path not covered by a rule here is closed to confined roles.
// A new /api/admin route therefore stays closed until someone opens it here.
const API_RULES: readonly ApiRule[] = [
  // Handlers re-check blog.* / knowledge.* per method; this is the coarse perimeter.
  {
    prefix: "/api/admin/blogs",
    read: ["blog.view"],
    write: ["blog.create", "blog.edit", "blog.publish", "blog.delete"],
  },
  // Stricter rule FIRST (first match wins): seo_team / content_team hold knowledge.edit but must not run the sync.
  { prefix: "/api/admin/knowledge/rebuild", read: ["knowledge.rebuild"], write: ["knowledge.rebuild"] },
  { prefix: "/api/admin/knowledge", read: ["knowledge.view"], write: ["knowledge.edit"] },

  // These handlers have no permission check of their own, so the method-level
  // split below is the only thing enforcing create / edit / delete.
  {
    prefix: "/api/admin/products",
    read: ["products.view"],
    create: ["products.create"],
    write: ["products.edit"],
    delete: ["products.delete"],
  },
  {
    prefix: "/api/admin/case-studies",
    read: ["case_studies.view"],
    create: ["case_studies.create"],
    write: ["case_studies.edit"],
    delete: ["case_studies.delete"],
  },
  { prefix: "/api/admin/spare-parts", read: ["spare_parts.view"], write: ["spare_parts.edit"] },
  { prefix: "/api/admin/banners", read: ["banners.view"], write: ["banners.edit"] },

  // Handlers re-check landing_pages.* themselves.
  {
    prefix: "/api/admin/landing-pages",
    read: ["landing_pages.view"],
    write: ["landing_pages.edit", "landing_pages.publish"],
  },

  // Supporting endpoints the Products / Case Studies / Spare Parts editors call.
  { prefix: "/api/admin/categories", read: ["products.view"] },
  { prefix: "/api/admin/product-badges", read: ["products.view"], write: ["products.edit"] },
  { prefix: "/api/admin/certifications", read: ["products.view"], write: ["products.edit"] },
  {
    prefix: "/api/admin/upload-file",
    write: [
      "products.create", "products.edit",
      "case_studies.create", "case_studies.edit",
      "spare_parts.edit", "banners.edit",
    ],
  },
]

const GROWTH_READ_PREFIXES: readonly string[] = [
  "/api/admin/growth/",
  "/api/admin/gsc/",
  "/api/admin/ga4/",
]

function isPathOrChild(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(prefix.endsWith("/") ? prefix : prefix + "/")
}

function holdsAny(permissions: readonly string[], required: readonly string[] | undefined): boolean {
  return !!required && required.some(p => permissions.includes(p))
}

/**
 * Whether a request to /api/admin/* is permitted for a confined role. Callers
 * apply this only when isRestrictedRole(role); other roles are not gated here.
 */
export function canAccessAdminApi(
  permissions: readonly string[],
  method: string,
  pathname: string
): boolean {
  const m = method.toUpperCase()
  const isRead = m === "GET" || m === "HEAD"

  if (pathname === "/api/admin/auth/me") return true

  if (GROWTH_READ_PREFIXES.some(prefix => isPathOrChild(pathname, prefix))) {
    return isRead && holdsAny(permissions, GROWTH_OS_READ_PERMISSIONS)
  }

  const rule = API_RULES.find(r => isPathOrChild(pathname, r.prefix))
  if (!rule) return false

  if (isRead) return holdsAny(permissions, rule.read)
  if (m === "POST") return holdsAny(permissions, rule.create ?? rule.write)
  if (m === "DELETE") return holdsAny(permissions, rule.delete ?? rule.write)
  return holdsAny(permissions, rule.write)
}

export function canSeeDashboardTab(permissions: readonly string[], tab: string): boolean {
  const required = DASHBOARD_TAB_PERMISSIONS[tab]
  return !!required && permissions.includes(required)
}

export function firstVisibleDashboardTab(permissions: readonly string[]): string | null {
  return Object.keys(DASHBOARD_TAB_PERMISSIONS).find(tab => canSeeDashboardTab(permissions, tab)) ?? null
}

export function canSeeGrowthOS(permissions: readonly string[]): boolean {
  return holdsAny(permissions, GROWTH_OS_READ_PERMISSIONS)
}

export function canSeeLandingPages(permissions: readonly string[]): boolean {
  return permissions.includes(LANDING_PAGES_PERMISSION)
}
