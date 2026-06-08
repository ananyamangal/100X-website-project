// Central permission registry — all permission strings live here.
// UI components and API routes import from this file, never hardcode strings.

export const PERMISSIONS = {
  // Dashboard
  DASHBOARD_VIEW: "dashboard.view",

  // SEO
  SEO_VIEW: "seo.view",
  SEO_EDIT: "seo.edit",
  SEO_EXPORT: "seo.export",

  // Analytics
  ANALYTICS_VIEW: "analytics.view",
  ANALYTICS_EXPORT: "analytics.export",

  // GEO / AI Search
  GEO_VIEW: "geo.view",

  // Competitor Intelligence
  COMPETITORS_VIEW: "competitors.view",

  // Opportunity Engine
  OPPORTUNITIES_VIEW: "opportunities.view",
  OPPORTUNITIES_EDIT: "opportunities.edit",

  // Content Factory
  CONTENT_VIEW: "content.view",
  CONTENT_EDIT: "content.edit",
  CONTENT_PUBLISH: "content.publish",
  CONTENT_DELETE: "content.delete",

  // Procurement Intelligence (highly strategic — restricted)
  PROCUREMENT_VIEW: "procurement.view",
  PROCUREMENT_EDIT: "procurement.edit",
  PROCUREMENT_EXPORT: "procurement.export",

  // Dealer Intelligence
  DEALER_VIEW: "dealer.view",
  DEALER_EDIT: "dealer.edit",
  DEALER_EXPORT: "dealer.export",

  // Google Ads
  ADS_VIEW: "ads.view",
  ADS_EDIT: "ads.edit",

  // Automation
  AUTOMATION_VIEW: "automation.view",
  AUTOMATION_EDIT: "automation.edit",

  // Logs
  LOGS_VIEW: "logs.view",
  AUDIT_VIEW: "audit.view",

  // Reports
  REPORTS_VIEW: "reports.view",
  REPORTS_EXPORT: "reports.export",

  // User Management
  USERS_VIEW: "users.view",
  USERS_CREATE: "users.create",
  USERS_EDIT: "users.edit",
  USERS_DELETE: "users.delete",

  // Role Management
  ROLES_VIEW: "roles.view",
  ROLES_EDIT: "roles.edit",

  // System
  SYSTEM_SETTINGS: "system.settings",
  BILLING_VIEW: "billing.view",
  API_KEYS_VIEW: "api_keys.view",
  API_KEYS_EDIT: "api_keys.edit",
} as const

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

// All defined permissions as an array (used for role matrix validation)
export const ALL_PERMISSIONS: Permission[] = Object.values(PERMISSIONS)

// Human-readable labels for the admin UI
export const PERMISSION_LABELS: Record<Permission, string> = {
  "dashboard.view":       "View Executive Dashboard",
  "seo.view":             "View SEO Command Center",
  "seo.edit":             "Edit SEO / Run Agents",
  "seo.export":           "Export SEO Reports",
  "analytics.view":       "View GA4 Analytics",
  "analytics.export":     "Export Analytics Data",
  "geo.view":             "View GEO / AI Search",
  "competitors.view":     "View Competitor Intelligence",
  "opportunities.view":   "View Opportunity Engine",
  "opportunities.edit":   "Edit Opportunities",
  "content.view":         "View Content Factory",
  "content.edit":         "Edit Content Drafts",
  "content.publish":      "Publish Content",
  "content.delete":       "Delete Content",
  "procurement.view":     "View Procurement Intelligence",
  "procurement.edit":     "Edit Procurement Data",
  "procurement.export":   "Export Procurement Reports",
  "dealer.view":          "View Dealer Intelligence",
  "dealer.edit":          "Edit Dealer Data",
  "dealer.export":        "Export Dealer Lists",
  "ads.view":             "View Google Ads Intel",
  "ads.edit":             "Edit Ads Settings",
  "automation.view":      "View Automation Center",
  "automation.edit":      "Edit Automation Rules",
  "logs.view":            "View Activity Logs",
  "audit.view":           "View Audit Logs",
  "reports.view":         "View Reporting Center",
  "reports.export":       "Export Reports",
  "users.view":           "View User List",
  "users.create":         "Create Users",
  "users.edit":           "Edit Users",
  "users.delete":         "Delete / Disable Users",
  "roles.view":           "View Roles",
  "roles.edit":           "Edit Role Permissions",
  "system.settings":      "System Settings",
  "billing.view":         "View Billing",
  "api_keys.view":        "View API Keys",
  "api_keys.edit":        "Manage API Keys",
}

// Maps sidebar module routes → required permission
export const MODULE_PERMISSIONS: Record<string, Permission> = {
  "/admin/growth/dashboard":        "dashboard.view",
  "/admin/growth/seo":              "seo.view",
  "/admin/growth/seo/setup":        "seo.view",
  "/admin/growth/analytics":        "analytics.view",
  "/admin/growth/analytics/setup":  "analytics.view",
  "/admin/growth/geo":              "geo.view",
  "/admin/growth/competitors":      "competitors.view",
  "/admin/growth/opportunities":    "opportunities.view",
  "/admin/growth/content":          "content.view",
  "/admin/growth/procurement":      "procurement.view",
  "/admin/growth/dealers":          "dealer.view",
  "/admin/growth/gem":              "procurement.view",
  "/admin/growth/ads":              "ads.view",
  "/admin/growth/ads/setup":        "ads.view",
  "/admin/growth/ads/dashboard":    "ads.view",
  "/admin/growth/automation":       "automation.view",
  "/admin/growth/logs":             "logs.view",
  "/admin/growth/reports":          "reports.view",
  "/admin/growth/paid":             "ads.view",
  "/admin/growth/users":            "users.view",
}

// Export security matrix — what roles can export
export const EXPORT_PERMISSIONS: Permission[] = [
  "procurement.export",
  "dealer.export",
  "analytics.export",
  "seo.export",
  "reports.export",
]
