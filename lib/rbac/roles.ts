import type { Permission } from "./permissions"
import { PERMISSIONS } from "./permissions"
import type { RoleSlug, DBRole } from "./types"

// Default permission sets for each role.
// These are seeded into MongoDB and can be customized from the UI.
// Super admin has a wildcard — computed dynamically, never stored as array.

const P = PERMISSIONS

export const ROLE_PERMISSIONS: Record<RoleSlug, Permission[]> = {
  super_admin: Object.values(P) as Permission[],  // all permissions

  growth_admin: [
    P.DASHBOARD_VIEW,
    P.PROCUREMENT_VIEW, P.PROCUREMENT_EDIT, P.PROCUREMENT_EXPORT,
    P.SEO_VIEW, P.SEO_EDIT, P.SEO_EXPORT,
    P.ANALYTICS_VIEW, P.ANALYTICS_EXPORT,
    P.GEO_VIEW,
    P.COMPETITORS_VIEW,
    P.OPPORTUNITIES_VIEW, P.OPPORTUNITIES_EDIT,
    P.CONTENT_VIEW, P.CONTENT_EDIT, P.CONTENT_PUBLISH,
    P.DEALER_VIEW, P.DEALER_EDIT,
    P.ADS_VIEW,
    P.AUTOMATION_VIEW,
    P.LOGS_VIEW,
    P.REPORTS_VIEW, P.REPORTS_EXPORT,
  ],

  seo_team: [
    P.DASHBOARD_VIEW,
    P.SEO_VIEW, P.SEO_EDIT,
    P.ANALYTICS_VIEW,
    P.GEO_VIEW,
    P.COMPETITORS_VIEW,
    P.CONTENT_VIEW, P.CONTENT_EDIT,
    P.LOGS_VIEW,
  ],

  sales_manager: [
    P.DASHBOARD_VIEW,
    P.DEALER_VIEW, P.DEALER_EDIT, P.DEALER_EXPORT,
    P.REPORTS_VIEW, P.REPORTS_EXPORT,
    P.LOGS_VIEW,
  ],

  sales_executive: [
    P.DASHBOARD_VIEW,
    P.DEALER_VIEW,
    P.LOGS_VIEW,
  ],

  procurement_analyst: [
    P.DASHBOARD_VIEW,
    P.PROCUREMENT_VIEW, P.PROCUREMENT_EXPORT,
    P.DEALER_VIEW,
    P.LOGS_VIEW,
  ],

  content_team: [
    P.DASHBOARD_VIEW,
    P.CONTENT_VIEW, P.CONTENT_EDIT,
    P.SEO_VIEW,
    P.LOGS_VIEW,
  ],

  viewer: [
    P.DASHBOARD_VIEW,
  ],
}

export const ROLE_DEFINITIONS: Omit<DBRole, "_id" | "createdAt" | "updatedAt">[] = [
  {
    slug: "super_admin",
    name: "Super Admin",
    description: "Full access — all modules including user management, system settings, and audit logs",
    permissions: ROLE_PERMISSIONS.super_admin,
    isSystem: true,
  },
  {
    slug: "growth_admin",
    name: "Growth Admin",
    description: "Full growth stack access — procurement, SEO, analytics, content, dealers. No user management or system settings.",
    permissions: ROLE_PERMISSIONS.growth_admin,
    isSystem: true,
  },
  {
    slug: "seo_team",
    name: "SEO Team",
    description: "SEO Command Center, Search Console, GA4, GEO, Competitor Intel, Content Factory",
    permissions: ROLE_PERMISSIONS.seo_team,
    isSystem: true,
  },
  {
    slug: "sales_manager",
    name: "Sales Manager",
    description: "Dealer Intelligence, Buyer Profiles, Sales Reports. Can export dealer lists.",
    permissions: ROLE_PERMISSIONS.sales_manager,
    isSystem: true,
  },
  {
    slug: "sales_executive",
    name: "Sales Executive",
    description: "Assigned dealer profiles and contact information only. Read-only.",
    permissions: ROLE_PERMISSIONS.sales_executive,
    isSystem: true,
  },
  {
    slug: "procurement_analyst",
    name: "Procurement Analyst",
    description: "Read-only access to Procurement Intelligence and Dealer data. No editing.",
    permissions: ROLE_PERMISSIONS.procurement_analyst,
    isSystem: true,
  },
  {
    slug: "content_team",
    name: "Content Team",
    description: "Content Factory and Blog. Can draft and edit. Cannot publish without approval.",
    permissions: ROLE_PERMISSIONS.content_team,
    isSystem: true,
  },
  {
    slug: "viewer",
    name: "Viewer",
    description: "Read-only dashboard access only. Cannot edit, export, or delete.",
    permissions: ROLE_PERMISSIONS.viewer,
    isSystem: true,
  },
]

// Resolve effective permissions for a user (role + custom overrides)
export function resolvePermissions(
  role: RoleSlug,
  customPermissions: Permission[] = [],
  deniedPermissions: Permission[] = []
): Permission[] {
  const base = new Set(ROLE_PERMISSIONS[role] ?? [])
  for (const p of customPermissions) base.add(p)
  for (const p of deniedPermissions) base.delete(p)
  return Array.from(base)
}

export function hasPermission(permissions: Permission[], permission: Permission): boolean {
  return permissions.includes(permission)
}

export function hasAnyPermission(permissions: Permission[], required: Permission[]): boolean {
  return required.some(p => permissions.includes(p))
}

export function hasAllPermissions(permissions: Permission[], required: Permission[]): boolean {
  return required.every(p => permissions.includes(p))
}
