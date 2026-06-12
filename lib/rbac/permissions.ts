// Central permission registry.
// PERMISSION_REGISTRY is the source of truth — all UI and API reads from here.
// Permissions are stored in MongoDB (rbac_permissions) via seed; this is the fallback.

// ── Action and category types ─────────────────────────────────────────────────

export type PermAction =
  | "view" | "create" | "edit" | "delete"
  | "export" | "import" | "approve" | "publish" | "run"

export type PermGroup =
  | "Core Modules"
  | "Procurement Intelligence"
  | "Procurement Submodules"
  | "Content & CMS"
  | "Dealer & CRM"
  | "Data Access"
  | "Product Categories"
  | "Administration"

export interface PermDef {
  key: string
  label: string
  description: string
  group: PermGroup
  subgroup?: string    // e.g. "AI Analyst", "Contracts Intel"
  module: string       // e.g. "procurement", "seo"
  action: PermAction
  critical?: boolean   // highly sensitive — shown with warning in UI
  sortOrder: number
}

// ── Permission registry ───────────────────────────────────────────────────────

export const PERMISSION_REGISTRY: PermDef[] = [

  // ── CORE MODULES ─────────────────────────────────────────────────────────
  { key: "dashboard.view",       label: "View Dashboard",            description: "Access the executive dashboard",                       group: "Core Modules", module: "dashboard",   action: "view",   sortOrder: 100 },

  { key: "seo.view",             label: "View SEO Center",           description: "Access SEO Command Center",                            group: "Core Modules", module: "seo",         action: "view",   sortOrder: 200 },
  { key: "seo.edit",             label: "Edit SEO / Run Agents",     description: "Run SEO agents and edit settings",                     group: "Core Modules", module: "seo",         action: "edit",   sortOrder: 201 },
  { key: "seo.export",           label: "Export SEO Reports",        description: "Export SEO data to CSV/PDF",                           group: "Core Modules", module: "seo",         action: "export", sortOrder: 202 },
  { key: "seo.gsc.view",         label: "View Search Console",       description: "Access Google Search Console data",                    group: "Core Modules", module: "seo",         action: "view",   subgroup: "Search Console", sortOrder: 203 },
  { key: "seo.gsc.connect",      label: "Connect Search Console",    description: "Connect/disconnect Google Search Console",             group: "Core Modules", module: "seo",         action: "edit",   subgroup: "Search Console", sortOrder: 204 },

  { key: "analytics.view",       label: "View GA4 Analytics",        description: "Access GA4 Analytics dashboard",                       group: "Core Modules", module: "analytics",   action: "view",   sortOrder: 300 },
  { key: "analytics.export",     label: "Export Analytics",          description: "Export analytics data",                                group: "Core Modules", module: "analytics",   action: "export", sortOrder: 301 },

  { key: "geo.view",             label: "View GEO / AI Search",      description: "Access GEO and AI Search Intelligence",                group: "Core Modules", module: "geo",         action: "view",   sortOrder: 400 },

  { key: "competitors.view",     label: "View Competitor Intel",     description: "Access Competitor Intelligence",                       group: "Core Modules", module: "competitors", action: "view",   sortOrder: 500 },
  { key: "competitors.edit",     label: "Edit Competitors",          description: "Add/edit competitor data",                             group: "Core Modules", module: "competitors", action: "edit",   sortOrder: 501 },

  { key: "opportunities.view",   label: "View Opportunity Engine",   description: "Access Opportunity Engine",                            group: "Core Modules", module: "opportunities",action: "view",   sortOrder: 600 },
  { key: "opportunities.edit",   label: "Edit Opportunities",        description: "Create and manage opportunities",                      group: "Core Modules", module: "opportunities",action: "edit",   sortOrder: 601 },

  { key: "content.view",         label: "View Content Factory",      description: "Access Content Factory",                               group: "Core Modules", module: "content",     action: "view",   sortOrder: 700 },
  { key: "content.edit",         label: "Edit Content Drafts",       description: "Create and edit content drafts",                       group: "Core Modules", module: "content",     action: "edit",   sortOrder: 701 },
  { key: "content.publish",      label: "Publish Content",           description: "Approve and publish content",                          group: "Core Modules", module: "content",     action: "publish",sortOrder: 702 },
  { key: "content.delete",       label: "Delete Content",            description: "Delete content drafts",                                group: "Core Modules", module: "content",     action: "delete", sortOrder: 703 },

  { key: "procurement.view",     label: "View Procurement Intel",    description: "Access Procurement Intelligence module",               group: "Core Modules", module: "procurement", action: "view",   critical: true, sortOrder: 800 },

  { key: "dealer.view",          label: "View Dealer Intel",         description: "Access Dealer Intelligence",                           group: "Core Modules", module: "dealer",      action: "view",   sortOrder: 900 },
  { key: "dealer.edit",          label: "Edit Dealer Data",          description: "Edit dealer profiles and add notes",                   group: "Core Modules", module: "dealer",      action: "edit",   sortOrder: 901 },
  { key: "dealer.export",        label: "Export Dealer Lists",       description: "Export dealer data to CSV",                            group: "Core Modules", module: "dealer",      action: "export", sortOrder: 902 },

  { key: "ads.view",             label: "View Google Ads Intel",     description: "Access Google Ads Intelligence",                       group: "Core Modules", module: "ads",         action: "view",   sortOrder: 1000 },
  { key: "ads.edit",             label: "Edit Ads Settings",         description: "Edit ads configuration",                               group: "Core Modules", module: "ads",         action: "edit",   sortOrder: 1001 },

  { key: "automation.view",      label: "View Automation Center",    description: "Access Automation Center",                             group: "Core Modules", module: "automation",  action: "view",   sortOrder: 1100 },
  { key: "automation.edit",      label: "Edit Automation Rules",     description: "Create and manage automation rules",                   group: "Core Modules", module: "automation",  action: "edit",   sortOrder: 1101 },

  { key: "logs.view",            label: "View Activity Logs",        description: "Access activity and growth logs",                      group: "Core Modules", module: "logs",        action: "view",   sortOrder: 1200 },
  { key: "reports.view",         label: "View Reports",              description: "Access Reporting Center",                              group: "Core Modules", module: "reports",     action: "view",   sortOrder: 1300 },
  { key: "reports.export",       label: "Export Reports",            description: "Export reports to CSV/PDF",                            group: "Core Modules", module: "reports",     action: "export", sortOrder: 1301 },
  { key: "paid.view",            label: "View Paid Growth",          description: "Access Paid Growth tracking",                          group: "Core Modules", module: "paid",        action: "view",   sortOrder: 1400 },

  // ── PROCUREMENT INTELLIGENCE ──────────────────────────────────────────────
  { key: "procurement.edit",             label: "Edit Procurement Data",       description: "Edit procurement entries (requires view)",            group: "Procurement Intelligence", module: "procurement", action: "edit",   critical: true, sortOrder: 2000 },
  { key: "procurement.export",           label: "Export Procurement Data",     description: "Export procurement reports",                          group: "Procurement Intelligence", module: "procurement", action: "export", critical: true, sortOrder: 2001 },

  // ── PROCUREMENT SUBMODULES ────────────────────────────────────────────────
  { key: "procurement.ai_analyst.view",       label: "AI Analyst",             description: "Access AI Analyst chat and queries",                  group: "Procurement Submodules", subgroup: "AI Analyst",       module: "procurement", action: "view",   critical: true, sortOrder: 2100 },
  { key: "procurement.auto_insights.view",    label: "Auto Insights",          description: "Access automated procurement insights",               group: "Procurement Submodules", subgroup: "Auto Insights",    module: "procurement", action: "view",   critical: true, sortOrder: 2200 },
  { key: "procurement.dealer_acq.view",       label: "Dealer Acquisition",     description: "View dealer acquisition targets",                     group: "Procurement Submodules", subgroup: "Dealer Acq.",      module: "procurement", action: "view",   critical: true, sortOrder: 2300 },
  { key: "procurement.dealer_acq.edit",       label: "Edit Dealer Acquisition","description": "Edit dealer acquisition data",                      group: "Procurement Submodules", subgroup: "Dealer Acq.",      module: "procurement", action: "edit",   critical: true, sortOrder: 2301 },
  { key: "procurement.product_discovery.view","label": "Product Discovery",    description: "View product discovery analysis",                     group: "Procurement Submodules", subgroup: "Product Discovery",module: "procurement", action: "view",   critical: true, sortOrder: 2400 },
  { key: "procurement.relationships.view",    label: "Relationships",          description: "View procurement relationship graph",                 group: "Procurement Submodules", subgroup: "Relationships",    module: "procurement", action: "view",   critical: true, sortOrder: 2500 },
  { key: "procurement.relationships.edit",    label: "Edit Relationships",     description: "Edit relationship data",                              group: "Procurement Submodules", subgroup: "Relationships",    module: "procurement", action: "edit",   critical: true, sortOrder: 2501 },
  { key: "procurement.contracts.view",        label: "Contracts Intel",        description: "View contracts intelligence",                         group: "Procurement Submodules", subgroup: "Contracts Intel",  module: "procurement", action: "view",   critical: true, sortOrder: 2600 },
  { key: "procurement.contracts.export",      label: "Export Contracts",       description: "Export contracts data to CSV",                        group: "Procurement Submodules", subgroup: "Contracts Intel",  module: "procurement", action: "export", critical: true, sortOrder: 2601 },
  { key: "procurement.opportunities.view",    label: "Opportunity Engine",     description: "View procurement opportunity scores",                 group: "Procurement Submodules", subgroup: "Opportunity Eng.", module: "procurement", action: "view",   critical: true, sortOrder: 2700 },
  { key: "procurement.buyer_profiles.view",   label: "Buyer Profiles",         description: "View government buyer profiles",                      group: "Procurement Submodules", subgroup: "Buyer Profiles",   module: "procurement", action: "view",   critical: true, sortOrder: 2800 },
  { key: "procurement.target_lists.view",     label: "Target Lists",           description: "View target dealer lists",                            group: "Procurement Submodules", subgroup: "Target Lists",     module: "procurement", action: "view",   critical: true, sortOrder: 2900 },
  { key: "procurement.target_lists.export",   label: "Export Target Lists",    description: "Export target lists to CSV",                          group: "Procurement Submodules", subgroup: "Target Lists",     module: "procurement", action: "export", critical: true, sortOrder: 2901 },
  { key: "procurement.sales_report.view",     label: "Sales Report",           description: "View procurement sales reports",                      group: "Procurement Submodules", subgroup: "Sales Report",     module: "procurement", action: "view",   critical: true, sortOrder: 3000 },
  { key: "procurement.sales_report.export",   label: "Export Sales Report",    description: "Export procurement sales reports",                    group: "Procurement Submodules", subgroup: "Sales Report",     module: "procurement", action: "export", critical: true, sortOrder: 3001 },
  { key: "procurement.map.view",              label: "Procurement Map",        description: "View the procurement geographic map",                 group: "Procurement Submodules", subgroup: "Procurement Map",  module: "procurement", action: "view",   critical: true, sortOrder: 3100 },
  { key: "procurement.storage.view",          label: "PDF Storage",            description: "View PDF storage and archive",                        group: "Procurement Submodules", subgroup: "PDF Storage",      module: "procurement", action: "view",   critical: true, sortOrder: 3200 },
  { key: "procurement.storage.export",        label: "Export PDF Storage",     description: "Export PDF storage data",                             group: "Procurement Submodules", subgroup: "PDF Storage",      module: "procurement", action: "export", critical: true, sortOrder: 3201 },
  { key: "procurement.batch_collect.run",     label: "Run Batch Collect",      description: "Run batch collection harvester",                      group: "Procurement Submodules", subgroup: "Batch Collect",    module: "procurement", action: "run",    critical: true, sortOrder: 3300 },
  { key: "procurement.single_bid.view",       label: "Single Bid View",        description: "View individual bid details",                         group: "Procurement Submodules", subgroup: "Single Bid",       module: "procurement", action: "view",   critical: true, sortOrder: 3400 },
  { key: "procurement.knowledge_graph.view",  label: "Knowledge Graph",        description: "View procurement knowledge graph",                    group: "Procurement Submodules", subgroup: "Knowledge Graph",  module: "procurement", action: "view",   critical: true, sortOrder: 3500 },
  { key: "procurement.governance.view",       label: "Governance Strip",       description: "View procurement governance and compliance strip",    group: "Procurement Submodules", subgroup: "Governance",       module: "procurement", action: "view",   critical: true, sortOrder: 3600 },

  // ── CONTENT & CMS ─────────────────────────────────────────────────────────
  { key: "blog.view",            label: "View Blog",             description: "Read blog posts",                                   group: "Content & CMS", subgroup: "Blog",         module: "blog",         action: "view",   sortOrder: 4000 },
  { key: "blog.create",          label: "Create Blog Post",      description: "Create new blog posts",                             group: "Content & CMS", subgroup: "Blog",         module: "blog",         action: "create", sortOrder: 4001 },
  { key: "blog.edit",            label: "Edit Blog Post",        description: "Edit existing blog posts",                          group: "Content & CMS", subgroup: "Blog",         module: "blog",         action: "edit",   sortOrder: 4002 },
  { key: "blog.delete",          label: "Delete Blog Post",      description: "Delete blog posts",                                 group: "Content & CMS", subgroup: "Blog",         module: "blog",         action: "delete", sortOrder: 4003 },
  { key: "blog.publish",         label: "Publish Blog Post",     description: "Publish / unpublish blog posts",                    group: "Content & CMS", subgroup: "Blog",         module: "blog",         action: "publish",sortOrder: 4004 },
  { key: "products.view",        label: "View Products",         description: "View product catalog",                              group: "Content & CMS", subgroup: "Products",     module: "products",     action: "view",   sortOrder: 4100 },
  { key: "products.create",      label: "Create Product",        description: "Add new products",                                  group: "Content & CMS", subgroup: "Products",     module: "products",     action: "create", sortOrder: 4101 },
  { key: "products.edit",        label: "Edit Product",          description: "Edit existing products",                            group: "Content & CMS", subgroup: "Products",     module: "products",     action: "edit",   sortOrder: 4102 },
  { key: "products.delete",      label: "Delete Product",        description: "Delete products",                                   group: "Content & CMS", subgroup: "Products",     module: "products",     action: "delete", sortOrder: 4103 },
  { key: "case_studies.view",    label: "View Case Studies",     description: "View case studies",                                 group: "Content & CMS", subgroup: "Case Studies", module: "case_studies", action: "view",   sortOrder: 4200 },
  { key: "case_studies.create",  label: "Create Case Study",     description: "Create new case studies",                          group: "Content & CMS", subgroup: "Case Studies", module: "case_studies", action: "create", sortOrder: 4201 },
  { key: "case_studies.edit",    label: "Edit Case Study",       description: "Edit existing case studies",                        group: "Content & CMS", subgroup: "Case Studies", module: "case_studies", action: "edit",   sortOrder: 4202 },
  { key: "case_studies.delete",  label: "Delete Case Study",     description: "Delete case studies",                               group: "Content & CMS", subgroup: "Case Studies", module: "case_studies", action: "delete", sortOrder: 4203 },
  { key: "landing_pages.view",   label: "View Landing Pages",    description: "View landing pages",                                group: "Content & CMS", subgroup: "Landing Pages",module: "landing_pages",action: "view",   sortOrder: 4300 },
  { key: "landing_pages.edit",   label: "Edit Landing Pages",    description: "Edit landing pages",                                group: "Content & CMS", subgroup: "Landing Pages",module: "landing_pages",action: "edit",   sortOrder: 4301 },
  { key: "landing_pages.publish",label: "Publish Landing Pages", description: "Publish / unpublish landing pages",                 group: "Content & CMS", subgroup: "Landing Pages",module: "landing_pages",action: "publish",sortOrder: 4302 },
  { key: "spare_parts.view",     label: "View Spare Parts",      description: "View spare parts catalog",                          group: "Content & CMS", subgroup: "Spare Parts",  module: "spare_parts",  action: "view",   sortOrder: 4400 },
  { key: "spare_parts.edit",     label: "Edit Spare Parts",      description: "Edit spare parts catalog",                          group: "Content & CMS", subgroup: "Spare Parts",  module: "spare_parts",  action: "edit",   sortOrder: 4401 },
  { key: "banners.view",         label: "View Banners",          description: "View homepage banners",                             group: "Content & CMS", subgroup: "Banners",      module: "banners",      action: "view",   sortOrder: 4500 },
  { key: "banners.edit",         label: "Edit Banners",          description: "Edit homepage banners",                             group: "Content & CMS", subgroup: "Banners",      module: "banners",      action: "edit",   sortOrder: 4501 },

  // ── DEALER & CRM ──────────────────────────────────────────────────────────
  { key: "dealers.view_all",     label: "View All Dealers",      description: "See all dealer records",                            group: "Dealer & CRM", subgroup: "Dealers",  module: "dealers", action: "view",   sortOrder: 5000 },
  { key: "dealers.view_assigned",label: "View Assigned Dealers", description: "See only dealers assigned to this user",            group: "Dealer & CRM", subgroup: "Dealers",  module: "dealers", action: "view",   sortOrder: 5001 },
  { key: "dealers.create",       label: "Create Dealer",         description: "Add new dealer records",                            group: "Dealer & CRM", subgroup: "Dealers",  module: "dealers", action: "create", sortOrder: 5002 },
  { key: "dealers.edit",         label: "Edit Dealer",           description: "Edit dealer profiles and notes",                    group: "Dealer & CRM", subgroup: "Dealers",  module: "dealers", action: "edit",   sortOrder: 5003 },
  { key: "dealers.delete",       label: "Delete Dealer",         description: "Delete dealer records",                             group: "Dealer & CRM", subgroup: "Dealers",  module: "dealers", action: "delete", sortOrder: 5004 },
  { key: "dealers.export",       label: "Export Dealers",        description: "Export dealer list to CSV",                         group: "Dealer & CRM", subgroup: "Dealers",  module: "dealers", action: "export", sortOrder: 5005 },
  { key: "leads.view_all",       label: "View All Leads",        description: "See all RFQ / contact leads",                       group: "Dealer & CRM", subgroup: "Leads",    module: "leads",   action: "view",   sortOrder: 5100 },
  { key: "leads.view_assigned",  label: "View Assigned Leads",   description: "See only leads assigned to this user",              group: "Dealer & CRM", subgroup: "Leads",    module: "leads",   action: "view",   sortOrder: 5101 },
  { key: "leads.edit",           label: "Edit Leads",            description: "Update lead status and notes",                      group: "Dealer & CRM", subgroup: "Leads",    module: "leads",   action: "edit",   sortOrder: 5102 },
  { key: "leads.export",         label: "Export Leads",          description: "Export lead data to CSV",                           group: "Dealer & CRM", subgroup: "Leads",    module: "leads",   action: "export", sortOrder: 5103 },

  // ── DATA ACCESS LEVELS ────────────────────────────────────────────────────
  { key: "data.export_unlimited",label: "Unlimited Export",      description: "No row limit on exports",                           group: "Data Access", module: "data", action: "export", sortOrder: 6000 },
  { key: "data.export_limited",  label: "Limited Export",        description: "Export up to 1,000 rows",                           group: "Data Access", module: "data", action: "export", sortOrder: 6001 },
  { key: "data.all_leads",       label: "All Leads Access",      description: "Access all leads regardless of assignment",         group: "Data Access", module: "data", action: "view",   sortOrder: 6002 },

  // ── PRODUCT CATEGORIES ────────────────────────────────────────────────────
  { key: "product_cat.fogging.view",      label: "Fogging — View",       description: "View fogging machine products",             group: "Product Categories", subgroup: "Fogging",      module: "products", action: "view", sortOrder: 7000 },
  { key: "product_cat.fogging.edit",      label: "Fogging — Edit",       description: "Edit fogging machine products",             group: "Product Categories", subgroup: "Fogging",      module: "products", action: "edit", sortOrder: 7001 },
  { key: "product_cat.agricultural.view", label: "Agricultural — View",  description: "View agricultural products",                group: "Product Categories", subgroup: "Agricultural", module: "products", action: "view", sortOrder: 7100 },
  { key: "product_cat.agricultural.edit", label: "Agricultural — Edit",  description: "Edit agricultural products",                group: "Product Categories", subgroup: "Agricultural", module: "products", action: "edit", sortOrder: 7101 },
  { key: "product_cat.municipal.view",    label: "Municipal — View",     description: "View municipal products",                   group: "Product Categories", subgroup: "Municipal",    module: "products", action: "view", sortOrder: 7200 },
  { key: "product_cat.municipal.edit",    label: "Municipal — Edit",     description: "Edit municipal products",                   group: "Product Categories", subgroup: "Municipal",    module: "products", action: "edit", sortOrder: 7201 },

  // ── PRODUCT MODEL-LEVEL PERMISSIONS ──────────────────────────────────────
  // Enforce access per SKU — used by products API and future catalog access control.
  // Grant these per-user to restrict editors to specific models only.
  { key: "product.bf105.view",   label: "BF-105 — View",   description: "View BF-105 ULV Cold Fogger product",          group: "Product Categories", subgroup: "Model: BF-105", module: "products", action: "view",   sortOrder: 7300 },
  { key: "product.bf105.edit",   label: "BF-105 — Edit",   description: "Edit BF-105 ULV Cold Fogger product",          group: "Product Categories", subgroup: "Model: BF-105", module: "products", action: "edit",   sortOrder: 7301 },
  { key: "product.bf105.delete", label: "BF-105 — Delete", description: "Delete BF-105 ULV Cold Fogger product",        group: "Product Categories", subgroup: "Model: BF-105", module: "products", action: "delete", critical: true, sortOrder: 7302 },
  { key: "product.bf115.view",   label: "BF-115 — View",   description: "View BF-115 ULV Cold Fogger product",          group: "Product Categories", subgroup: "Model: BF-115", module: "products", action: "view",   sortOrder: 7310 },
  { key: "product.bf115.edit",   label: "BF-115 — Edit",   description: "Edit BF-115 ULV Cold Fogger product",          group: "Product Categories", subgroup: "Model: BF-115", module: "products", action: "edit",   sortOrder: 7311 },
  { key: "product.bf115.delete", label: "BF-115 — Delete", description: "Delete BF-115 ULV Cold Fogger product",        group: "Product Categories", subgroup: "Model: BF-115", module: "products", action: "delete", critical: true, sortOrder: 7312 },
  { key: "product.bf150.view",   label: "BF-150 — View",   description: "View BF-150 Thermal Fogger product",           group: "Product Categories", subgroup: "Model: BF-150", module: "products", action: "view",   sortOrder: 7320 },
  { key: "product.bf150.edit",   label: "BF-150 — Edit",   description: "Edit BF-150 Thermal Fogger product",           group: "Product Categories", subgroup: "Model: BF-150", module: "products", action: "edit",   sortOrder: 7321 },
  { key: "product.bf150.delete", label: "BF-150 — Delete", description: "Delete BF-150 Thermal Fogger product",         group: "Product Categories", subgroup: "Model: BF-150", module: "products", action: "delete", critical: true, sortOrder: 7322 },
  { key: "product.bf200.view",   label: "BF-200 — View",   description: "View BF-200 Thermal Fogger product",           group: "Product Categories", subgroup: "Model: BF-200", module: "products", action: "view",   sortOrder: 7330 },
  { key: "product.bf200.edit",   label: "BF-200 — Edit",   description: "Edit BF-200 Thermal Fogger product",           group: "Product Categories", subgroup: "Model: BF-200", module: "products", action: "edit",   sortOrder: 7331 },
  { key: "product.bf200.delete", label: "BF-200 — Delete", description: "Delete BF-200 Thermal Fogger product",         group: "Product Categories", subgroup: "Model: BF-200", module: "products", action: "delete", critical: true, sortOrder: 7332 },
  { key: "product.bf400.view",   label: "BF-400 — View",   description: "View BF-400 Heavy Duty Thermal Fogger",        group: "Product Categories", subgroup: "Model: BF-400", module: "products", action: "view",   sortOrder: 7340 },
  { key: "product.bf400.edit",   label: "BF-400 — Edit",   description: "Edit BF-400 Heavy Duty Thermal Fogger",        group: "Product Categories", subgroup: "Model: BF-400", module: "products", action: "edit",   sortOrder: 7341 },
  { key: "product.bf400.delete", label: "BF-400 — Delete", description: "Delete BF-400 Heavy Duty Thermal Fogger",      group: "Product Categories", subgroup: "Model: BF-400", module: "products", action: "delete", critical: true, sortOrder: 7342 },

  // ── EXPORT PERMISSIONS (granular) ─────────────────────────────────────────
  // export.view = see export button / initiate; export.download = actually receive file;
  // export.bulk = export >1000 rows or all records (use with data.export_unlimited)
  { key: "export.view",     label: "Export — Initiate",     description: "Can see and initiate exports",                         group: "Data Access", subgroup: "Exports", module: "export", action: "view",   sortOrder: 6010 },
  { key: "export.download", label: "Export — Download",     description: "Can download exported files",                          group: "Data Access", subgroup: "Exports", module: "export", action: "export", sortOrder: 6011 },
  { key: "export.bulk",     label: "Export — Bulk",         description: "Can export all records (>1000 rows); use with caution",group: "Data Access", subgroup: "Exports", module: "export", action: "export", critical: true, sortOrder: 6012 },

  // ── ADMINISTRATION ────────────────────────────────────────────────────────
  { key: "users.view",           label: "View Users",            description: "View user list",                                    group: "Administration", subgroup: "Users",       module: "users",       action: "view",   critical: true, sortOrder: 8000 },
  { key: "users.create",         label: "Create Users",          description: "Create new user accounts",                          group: "Administration", subgroup: "Users",       module: "users",       action: "create", critical: true, sortOrder: 8001 },
  { key: "users.edit",           label: "Edit Users",            description: "Edit user details and roles",                       group: "Administration", subgroup: "Users",       module: "users",       action: "edit",   critical: true, sortOrder: 8002 },
  { key: "users.delete",         label: "Delete / Disable Users","description": "Disable or delete user accounts",                 group: "Administration", subgroup: "Users",       module: "users",       action: "delete", critical: true, sortOrder: 8003 },
  { key: "roles.view",           label: "View Roles",            description: "View role definitions",                             group: "Administration", subgroup: "Roles",       module: "roles",       action: "view",   critical: true, sortOrder: 8100 },
  { key: "roles.edit",           label: "Edit Role Permissions", description: "Change which permissions a role includes",          group: "Administration", subgroup: "Roles",       module: "roles",       action: "edit",   critical: true, sortOrder: 8101 },
  { key: "permissions.view",     label: "View Permission Matrix","description": "View the permission matrix",                      group: "Administration", subgroup: "Permissions", module: "permissions", action: "view",   critical: true, sortOrder: 8200 },
  { key: "permissions.edit",     label: "Edit Permissions",      description: "Manage per-user permission overrides",              group: "Administration", subgroup: "Permissions", module: "permissions", action: "edit",   critical: true, sortOrder: 8201 },
  { key: "audit.view",           label: "View Audit Logs",       description: "Access audit trail",                               group: "Administration", subgroup: "Audit",       module: "audit",       action: "view",   critical: true, sortOrder: 8300 },
  { key: "system.settings",      label: "System Settings",       description: "Access system configuration",                      group: "Administration", subgroup: "System",      module: "system",      action: "edit",   critical: true, sortOrder: 8400 },
  { key: "billing.view",         label: "View Billing",          description: "View billing and subscription info",                group: "Administration", subgroup: "System",      module: "billing",     action: "view",   critical: true, sortOrder: 8500 },
  { key: "api_keys.view",        label: "View API Keys",         description: "View API keys (masked)",                           group: "Administration", subgroup: "System",      module: "api_keys",    action: "view",   critical: true, sortOrder: 8600 },
  { key: "api_keys.edit",        label: "Manage API Keys",       description: "Create and revoke API keys",                       group: "Administration", subgroup: "System",      module: "api_keys",    action: "edit",   critical: true, sortOrder: 8601 },
]

// ── Key constants (used in existing code — backward compat) ──────────────────

export const PERMISSIONS = {
  DASHBOARD_VIEW: "dashboard.view",
  SEO_VIEW: "seo.view", SEO_EDIT: "seo.edit", SEO_EXPORT: "seo.export",
  SEO_GSC_VIEW: "seo.gsc.view", SEO_GSC_CONNECT: "seo.gsc.connect",
  ANALYTICS_VIEW: "analytics.view", ANALYTICS_EXPORT: "analytics.export",
  GEO_VIEW: "geo.view",
  COMPETITORS_VIEW: "competitors.view", COMPETITORS_EDIT: "competitors.edit",
  OPPORTUNITIES_VIEW: "opportunities.view", OPPORTUNITIES_EDIT: "opportunities.edit",
  CONTENT_VIEW: "content.view", CONTENT_EDIT: "content.edit",
  CONTENT_PUBLISH: "content.publish", CONTENT_DELETE: "content.delete",
  PROCUREMENT_VIEW: "procurement.view", PROCUREMENT_EDIT: "procurement.edit", PROCUREMENT_EXPORT: "procurement.export",
  PROCUREMENT_AI_ANALYST: "procurement.ai_analyst.view",
  PROCUREMENT_AUTO_INSIGHTS: "procurement.auto_insights.view",
  PROCUREMENT_CONTRACTS_VIEW: "procurement.contracts.view",
  PROCUREMENT_CONTRACTS_EXPORT: "procurement.contracts.export",
  PROCUREMENT_OPPORTUNITIES: "procurement.opportunities.view",
  PROCUREMENT_BATCH_COLLECT: "procurement.batch_collect.run",
  DEALER_VIEW: "dealer.view", DEALER_EDIT: "dealer.edit", DEALER_EXPORT: "dealer.export",
  ADS_VIEW: "ads.view", ADS_EDIT: "ads.edit",
  AUTOMATION_VIEW: "automation.view", AUTOMATION_EDIT: "automation.edit",
  LOGS_VIEW: "logs.view", AUDIT_VIEW: "audit.view",
  REPORTS_VIEW: "reports.view", REPORTS_EXPORT: "reports.export",
  USERS_VIEW: "users.view", USERS_CREATE: "users.create", USERS_EDIT: "users.edit", USERS_DELETE: "users.delete",
  ROLES_VIEW: "roles.view", ROLES_EDIT: "roles.edit",
  PERMISSIONS_VIEW: "permissions.view", PERMISSIONS_EDIT: "permissions.edit",
  SYSTEM_SETTINGS: "system.settings",
  BILLING_VIEW: "billing.view",
  API_KEYS_VIEW: "api_keys.view", API_KEYS_EDIT: "api_keys.edit",
  BLOG_VIEW: "blog.view", BLOG_CREATE: "blog.create", BLOG_EDIT: "blog.edit", BLOG_DELETE: "blog.delete", BLOG_PUBLISH: "blog.publish",
  PRODUCTS_VIEW: "products.view", PRODUCTS_CREATE: "products.create", PRODUCTS_EDIT: "products.edit", PRODUCTS_DELETE: "products.delete",
  DATA_EXPORT_UNLIMITED: "data.export_unlimited", DATA_EXPORT_LIMITED: "data.export_limited", DATA_ALL_LEADS: "data.all_leads",
} as const

export type Permission = string   // runtime strings — full union would be 100+ literals

// All permission keys
export const ALL_PERMISSIONS: string[] = PERMISSION_REGISTRY.map(p => p.key)

// Grouped for UI rendering
export const PERMISSION_GROUPS: PermGroup[] = [
  "Core Modules",
  "Procurement Intelligence",
  "Procurement Submodules",
  "Content & CMS",
  "Dealer & CRM",
  "Data Access",
  "Product Categories",
  "Administration",
]

export function getPermsByGroup(group: PermGroup): PermDef[] {
  return PERMISSION_REGISTRY.filter(p => p.group === group).sort((a, b) => a.sortOrder - b.sortOrder)
}

export function getPermsByGrouped(): Map<PermGroup, Map<string, PermDef[]>> {
  const out = new Map<PermGroup, Map<string, PermDef[]>>()
  for (const perm of PERMISSION_REGISTRY) {
    if (!out.has(perm.group)) out.set(perm.group, new Map())
    const grp = out.get(perm.group)!
    const sub = perm.subgroup ?? "__root__"
    if (!grp.has(sub)) grp.set(sub, [])
    grp.get(sub)!.push(perm)
  }
  return out
}

// Human-readable labels (backward compat)
export const PERMISSION_LABELS: Record<string, string> = Object.fromEntries(
  PERMISSION_REGISTRY.map(p => [p.key, p.label])
)

// Sidebar module → permission map
export const MODULE_PERMISSIONS: Record<string, string> = {
  "/admin/growth/dashboard":        "dashboard.view",
  "/admin/growth/seo":              "seo.view",
  "/admin/growth/seo/setup":        "seo.view",
  "/admin/growth/analytics":        "analytics.view",
  "/admin/growth/analytics/setup":  "analytics.view",
  "/admin/growth/geo":              "geo.view",
  "/admin/growth/competitors":      "competitors.view",
  "/admin/growth/opportunities":    "opportunities.view",
  "/admin/growth/content":          "content.view",
  "/admin/growth/landing-pages":    "landing_pages.view",
  "/admin/growth/procurement":      "procurement.view",
  "/admin/growth/dealers":          "dealer.view",
  "/admin/growth/gem":              "procurement.view",
  "/admin/growth/ads":              "ads.view",
  "/admin/growth/ads/setup":        "ads.view",
  "/admin/growth/ads/dashboard":    "ads.view",
  "/admin/growth/automation":       "automation.view",
  "/admin/growth/logs":             "logs.view",
  "/admin/growth/reports":          "reports.view",
  "/admin/growth/paid":             "paid.view",
  "/admin/growth/users":            "users.view",
  "/admin/growth/permissions":      "permissions.view",
}
