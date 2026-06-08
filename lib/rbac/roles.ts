import type { Permission } from "./permissions"
import { PERMISSIONS } from "./permissions"
import type { RoleSlug, DBRole } from "./types"

// Role permission templates — the starting point for each role.
// These are seeded into rbac_role_permissions (MongoDB) via the seed endpoint.
// Live changes go to the DB; this serves as the fallback/default.

const P = PERMISSIONS

export const ROLE_PERMISSIONS: Record<RoleSlug, Permission[]> = {

  super_admin: [
    // All permissions — super admin gets everything
    "dashboard.view",
    "seo.view", "seo.edit", "seo.export", "seo.gsc.view", "seo.gsc.connect",
    "analytics.view", "analytics.export",
    "geo.view",
    "competitors.view", "competitors.edit",
    "opportunities.view", "opportunities.edit",
    "content.view", "content.edit", "content.publish", "content.delete",
    "procurement.view", "procurement.edit", "procurement.export",
    "procurement.ai_analyst.view", "procurement.auto_insights.view",
    "procurement.dealer_acq.view", "procurement.dealer_acq.edit",
    "procurement.product_discovery.view",
    "procurement.relationships.view", "procurement.relationships.edit",
    "procurement.contracts.view", "procurement.contracts.export",
    "procurement.opportunities.view",
    "procurement.buyer_profiles.view",
    "procurement.target_lists.view", "procurement.target_lists.export",
    "procurement.sales_report.view", "procurement.sales_report.export",
    "procurement.map.view",
    "procurement.storage.view", "procurement.storage.export",
    "procurement.batch_collect.run",
    "procurement.single_bid.view",
    "procurement.knowledge_graph.view",
    "procurement.governance.view",
    "dealer.view", "dealer.edit", "dealer.export",
    "ads.view", "ads.edit",
    "automation.view", "automation.edit",
    "logs.view", "audit.view",
    "reports.view", "reports.export",
    "paid.view",
    "blog.view", "blog.create", "blog.edit", "blog.delete", "blog.publish",
    "products.view", "products.create", "products.edit", "products.delete",
    "case_studies.view", "case_studies.create", "case_studies.edit", "case_studies.delete",
    "landing_pages.view", "landing_pages.edit", "landing_pages.publish",
    "spare_parts.view", "spare_parts.edit",
    "banners.view", "banners.edit",
    "dealers.view_all", "dealers.create", "dealers.edit", "dealers.delete", "dealers.export",
    "leads.view_all", "leads.edit", "leads.export",
    "data.export_unlimited", "data.all_leads",
    "product_cat.fogging.view", "product_cat.fogging.edit",
    "product_cat.agricultural.view", "product_cat.agricultural.edit",
    "product_cat.municipal.view", "product_cat.municipal.edit",
    "users.view", "users.create", "users.edit", "users.delete",
    "roles.view", "roles.edit",
    "permissions.view", "permissions.edit",
    "system.settings", "billing.view",
    "api_keys.view", "api_keys.edit",
  ],

  growth_admin: [
    "dashboard.view",
    "procurement.view", "procurement.edit", "procurement.export",
    "procurement.ai_analyst.view", "procurement.auto_insights.view",
    "procurement.dealer_acq.view", "procurement.dealer_acq.edit",
    "procurement.product_discovery.view",
    "procurement.relationships.view", "procurement.relationships.edit",
    "procurement.contracts.view", "procurement.contracts.export",
    "procurement.opportunities.view",
    "procurement.buyer_profiles.view",
    "procurement.target_lists.view", "procurement.target_lists.export",
    "procurement.sales_report.view", "procurement.sales_report.export",
    "procurement.map.view",
    "procurement.storage.view",
    "procurement.single_bid.view",
    "procurement.knowledge_graph.view",
    "procurement.governance.view",
    "seo.view", "seo.edit", "seo.export", "seo.gsc.view",
    "analytics.view", "analytics.export",
    "geo.view",
    "competitors.view", "competitors.edit",
    "opportunities.view", "opportunities.edit",
    "content.view", "content.edit", "content.publish",
    "dealer.view", "dealer.edit",
    "ads.view",
    "automation.view",
    "logs.view",
    "reports.view", "reports.export",
    "paid.view",
    "blog.view", "blog.create", "blog.edit", "blog.publish",
    "products.view", "products.edit",
    "dealers.view_all", "dealers.edit",
    "leads.view_all",
    "data.export_unlimited", "data.all_leads",
    "permissions.view",
    "roles.view",
  ],

  seo_team: [
    "dashboard.view",
    "seo.view", "seo.edit", "seo.gsc.view",
    "analytics.view",
    "geo.view",
    "competitors.view",
    "content.view", "content.edit",
    "logs.view",
    "blog.view", "blog.create", "blog.edit",
    "products.view",
    "landing_pages.view", "landing_pages.edit",
    "data.export_limited",
  ],

  sales_manager: [
    "dashboard.view",
    "dealer.view", "dealer.edit", "dealer.export",
    "reports.view", "reports.export",
    "logs.view",
    "dealers.view_all", "dealers.edit", "dealers.export",
    "leads.view_all", "leads.edit", "leads.export",
    "data.all_leads", "data.export_unlimited",
  ],

  sales_executive: [
    "dashboard.view",
    "dealer.view",
    "dealers.view_assigned",
    "leads.view_assigned", "leads.edit",
    "logs.view",
  ],

  procurement_analyst: [
    "dashboard.view",
    "procurement.view",
    "procurement.contracts.view", "procurement.contracts.export",
    "procurement.ai_analyst.view",
    "procurement.relationships.view",
    "procurement.buyer_profiles.view",
    "procurement.target_lists.view",
    "procurement.sales_report.view",
    "procurement.map.view",
    "procurement.knowledge_graph.view",
    "dealer.view",
    "dealers.view_all",
    "logs.view",
    "data.export_limited",
  ],

  content_team: [
    "dashboard.view",
    "content.view", "content.edit",
    "seo.view",
    "logs.view",
    "blog.view", "blog.create", "blog.edit",
    "products.view",
    "case_studies.view", "case_studies.create", "case_studies.edit",
    "landing_pages.view", "landing_pages.edit",
    "spare_parts.view",
    "banners.view",
  ],

  viewer: [
    "dashboard.view",
    "products.view",
    "blog.view",
  ],
}

export const ROLE_DEFINITIONS: Omit<DBRole, "_id" | "createdAt" | "updatedAt">[] = [
  {
    slug: "super_admin",
    name: "Super Admin",
    description: "Full access — all modules, user management, system settings, and audit logs",
    permissions: ROLE_PERMISSIONS.super_admin,
    isSystem: true,
  },
  {
    slug: "growth_admin",
    name: "Growth Admin",
    description: "Full growth stack — procurement, SEO, analytics, content, dealers. No system settings.",
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
    description: "All dealer and lead data, export enabled, sales reports",
    permissions: ROLE_PERMISSIONS.sales_manager,
    isSystem: true,
  },
  {
    slug: "sales_executive",
    name: "Sales Executive",
    description: "Assigned leads and dealer profiles only. No exports.",
    permissions: ROLE_PERMISSIONS.sales_executive,
    isSystem: true,
  },
  {
    slug: "procurement_analyst",
    name: "Procurement Analyst",
    description: "Read-only Procurement Intelligence and Dealer data.",
    permissions: ROLE_PERMISSIONS.procurement_analyst,
    isSystem: true,
  },
  {
    slug: "content_team",
    name: "Content Team",
    description: "Content Factory, Blog, Products, Case Studies. Cannot publish without approval.",
    permissions: ROLE_PERMISSIONS.content_team,
    isSystem: true,
  },
  {
    slug: "viewer",
    name: "Viewer",
    description: "Read-only dashboard access. Cannot edit, export, or delete.",
    permissions: ROLE_PERMISSIONS.viewer,
    isSystem: true,
  },
]

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
