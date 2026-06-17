/**
 * Platform Capability Registry — static inventory of all Growth OS capabilities.
 * Updated: 2026-06-16 | Source: full codebase scan
 */

export const PLATFORM_VERSION = "v3.0"

export type CapabilityStatus =
  | "active"      // confirmed working and discoverable
  | "hidden"      // functional but removed from nav
  | "orphaned"    // backend/API exists, no UI surface
  | "legacy"      // intentionally replaced by newer system
  | "duplicate"   // overlapping functionality with another capability
  | "broken"      // known errors or missing dependencies

export type CapabilityCategory =
  | "revenue_intelligence"
  | "google_ads"
  | "seo_content"
  | "market_intelligence"
  | "crm"
  | "analytics"
  | "system"
  | "procurement"
  | "fogging"

export interface Capability {
  id: string
  name: string
  category: CapabilityCategory
  status: CapabilityStatus
  description: string
  route?: string
  api?: string
  collections?: string[]
  usedBy?: string
  trigger?: string
  output?: string
  statusNote?: string
}

export const CAPABILITY_REGISTRY: Capability[] = [

  // ─── REVENUE INTELLIGENCE ───────────────────────────────────────────────────

  {
    id: "revenue-director",
    name: "Revenue Director",
    category: "revenue_intelligence",
    status: "active",
    description: "Autonomous daily revenue orchestrator. Reads fogging + ads + GSC, generates ranked recommendations, sends morning email brief.",
    route: "/admin/growth/director",
    api: "/api/admin/growth/director/*",
    collections: ["director_recommendations", "director_daily_runs", "director_outcomes", "director_execution_packs"],
    trigger: "Daily cron 07:00 IST + manual",
    output: "Ranked recs with execution packs on approval. Morning email brief.",
    usedBy: "Founder (daily review)",
  },
  {
    id: "operations-center",
    name: "Operations Center",
    category: "revenue_intelligence",
    status: "active",
    description: "Full automation health dashboard. Shows Active/Dormant/Broken/Unknown status for all 17 automations, next scheduled runs, manual trigger buttons.",
    route: "/admin/growth/operations",
    api: "/api/admin/growth/operations",
    collections: ["automation_registry", "growth_os_logs"],
    trigger: "Manual / live queries",
    output: "Automation health grid with live last-run data",
    usedBy: "Founder (daily check)",
  },
  {
    id: "opportunity-engine",
    name: "Opportunity Engine",
    category: "revenue_intelligence",
    status: "hidden",
    description: "AI-ranked cross-signal opportunity scoring. Different from Revenue Director — uses AI analysis rather than signal generators.",
    route: "/admin/growth/opportunities",
    api: "/api/admin/growth/opportunities",
    collections: ["growth_opportunities", "growth_opportunity_status"],
    trigger: "Weekly cron (dealer + machine buyer signals)",
    output: "Ranked opportunity list with context",
    statusNote: "Hidden from nav since nav simplification. Still functional. Revenue Director now surfaces the highest-value version of this.",
  },
  {
    id: "market-intelligence-agent",
    name: "Market Intelligence Agent",
    category: "revenue_intelligence",
    status: "active",
    description: "Manual cross-signal AI analysis agent. Reads GSC + Ads + Fogging + Procurement simultaneously. 3 model tiers.",
    route: "/admin/growth/market-intelligence",
    api: "/api/admin/growth/agents/market-intelligence",
    collections: ["market_intelligence_runs"],
    trigger: "Manual",
    output: "AI synthesis document with ranked actions",
    usedBy: "Founder (Advanced Tools)",
  },
  {
    id: "exec-summary",
    name: "Weekly Executive Summary",
    category: "revenue_intelligence",
    status: "active",
    description: "Monday morning 7-day rollup briefing — top dealers, buyers, wins, losses, week-on-week trends.",
    route: "/admin/growth/reports",
    api: "/api/admin/growth/cron/weekly-exec-summary",
    collections: ["growth_exec_summaries"],
    trigger: "Weekly cron Monday 08:30 IST",
    output: "Email + stored summary doc",
    usedBy: "Founder (Monday morning)",
  },

  // ─── GOOGLE ADS ─────────────────────────────────────────────────────────────

  {
    id: "google-ads-director",
    name: "Google Ads Director",
    category: "google_ads",
    status: "active",
    description: "Weekly ads intelligence engine. Read-only. Generates 4 recommendation types: negative keywords, new keywords, high-CPC terms, low-CTR ads. Approval-gated.",
    route: "/admin/growth/ads/director",
    api: "/api/admin/growth/cron/google-ads-director",
    collections: ["ads_recommendations", "ads_director_snapshots", "ads_approval_queue"],
    trigger: "Weekly cron Monday 09:30 IST",
    output: "Ranked ads recommendations requiring approval",
    usedBy: "Founder (weekly review)",
  },
  {
    id: "ads-approval-queue",
    name: "Ads Approval Queue",
    category: "google_ads",
    status: "active",
    description: "Approval queue for Google Ads recommendations. Separate from Revenue Director approvals — specific to ads changes.",
    route: "/admin/growth/ads/director",
    api: "/api/admin/growth/ads/approval-queue",
    collections: ["ads_approval_queue"],
    trigger: "Triggered by Ads Director cron",
    output: "Approval/rejection decisions stored; no auto-execution",
  },
  {
    id: "campaign-factory",
    name: "Campaign Factory",
    category: "google_ads",
    status: "active",
    description: "AI media buyer — generates complete campaign structures (ad groups, keywords, bids, targeting) from product + audience data.",
    route: "/admin/growth/ads/campaign-factory",
    api: "/api/admin/growth/ads/campaign-factory",
    collections: ["campaign_plans", "campaign_deployments"],
    trigger: "Manual",
    output: "Campaign plan JSON + deployment artifacts",
    usedBy: "Marketing (Advanced Tools > Ads)",
  },
  {
    id: "creative-director",
    name: "Creative Director",
    category: "google_ads",
    status: "active",
    description: "AI ad creative generator. Produces RSA headlines, descriptions, callouts, sitelinks. 8 persuasion frameworks.",
    route: "/admin/growth/ads/creative-director",
    api: "/api/admin/growth/agents/creative-director",
    collections: ["creative_director_runs", "creative_asset_performance", "creative_learnings"],
    trigger: "Manual",
    output: "Ad copy drafts per framework, ready to paste into Google Ads",
    usedBy: "Founder / Marketing",
  },
  {
    id: "creative-asset-performance",
    name: "Creative Asset Performance",
    category: "google_ads",
    status: "orphaned",
    description: "Tracks performance of generated ad creatives vs actual Google Ads data.",
    collections: ["creative_asset_performance", "creative_learnings"],
    statusNote: "Collections exist and are written to. No dedicated UI to browse or analyze performance. Orphaned.",
  },
  {
    id: "remarketing-readiness",
    name: "Remarketing Readiness",
    category: "google_ads",
    status: "hidden",
    description: "Checks whether remarketing infrastructure is properly set up — audience lists, pixel, campaign structure.",
    route: "/admin/growth/ads/remarketing-readiness",
    api: "/api/admin/growth/ads/remarketing-readiness",
    trigger: "Manual",
    statusNote: "Hidden from nav. Functional. Revenue Director now recommends remarketing campaigns.",
  },
  {
    id: "revenue-attribution",
    name: "Revenue Attribution",
    category: "google_ads",
    status: "active",
    description: "Multi-touch revenue attribution model mapping ad spend → leads → dealer activity → revenue.",
    route: "/admin/growth/ads/revenue",
    api: "/api/admin/growth/ads/revenue-attribution",
    collections: ["revenue_attribution"],
    trigger: "Manual validation",
    usedBy: "Marketing (Advanced Tools)",
  },
  {
    id: "keyword-intelligence",
    name: "Keyword Intelligence",
    category: "google_ads",
    status: "orphaned",
    description: "Keyword analysis pipeline — intent scoring, competition, bid recommendations.",
    api: "/api/admin/growth/ads/keyword-intelligence",
    collections: ["ads_keyword_rows"],
    statusNote: "API exists. No dedicated UI page. Data accessible via ads dashboard.",
  },

  // ─── SEO & CONTENT ──────────────────────────────────────────────────────────

  {
    id: "seo-command-center",
    name: "SEO Command Center",
    category: "seo_content",
    status: "active",
    description: "Central SEO hub — GSC data overview, query/page analysis, opportunity identification.",
    route: "/admin/growth/seo",
    api: "/api/admin/growth/agents/seo-opportunity",
    collections: ["gsc_query_rows", "gsc_page_rows", "growth_os_opportunities"],
    trigger: "Daily GSC sync + manual opportunity agent",
    output: "SEO opportunities ranked by traffic potential",
    usedBy: "Marketing",
  },
  {
    id: "gsc-sync",
    name: "GSC Daily Sync",
    category: "seo_content",
    status: "active",
    description: "Daily sync of Google Search Console data — current 28-day window + prior 28-day for comparison. Triggers SEO Opportunity Agent.",
    api: "/api/admin/growth/cron/gsc-sync",
    collections: ["gsc_syncs", "gsc_query_rows", "gsc_page_rows"],
    trigger: "Daily cron 10:30 IST",
    output: "Query rows, page rows for GSC period",
  },
  {
    id: "offpage-seo",
    name: "Off-Page SEO Director",
    category: "seo_content",
    status: "active",
    description: "Backlink opportunity discovery — 11 opportunity types (HARO, guest posts, citations, forum mentions, competitor links, etc.).",
    route: "/admin/growth/seo/offpage",
    api: "/api/admin/growth/seo/offpage/validate",
    collections: ["offpage_opportunities"],
    trigger: "Manual",
    output: "Ranked backlink/citation opportunities",
    usedBy: "Marketing",
  },
  {
    id: "schema-auditor",
    name: "Schema Auditor",
    category: "seo_content",
    status: "active",
    description: "JSON-LD schema validation — validates Product, FAQPage, Article, BreadcrumbList, Organization schemas.",
    route: "/admin/growth/seo/offpage/validate",
    api: "/api/admin/growth/agents/schema-audit",
    collections: ["growth_os_schema_audit", "schema_health_results"],
    trigger: "Manual",
    output: "Schema health report with fix recommendations",
  },
  {
    id: "internal-link-auditor",
    name: "Internal Link Auditor",
    category: "seo_content",
    status: "active",
    description: "Site-wide internal link graph analysis — orphan pages, weak pages, strong hub pages.",
    api: "/api/admin/growth/agents/internal-link",
    collections: ["growth_os_link_graph"],
    trigger: "Manual",
    output: "Link graph with orphan/weak/hub classification",
    statusNote: "API functional. Accessible via SEO module. No dedicated page.",
  },
  {
    id: "ai-citation-audit",
    name: "AI Citation Audit",
    category: "seo_content",
    status: "active",
    description: "Audits whether 100X Circle is mentioned by ChatGPT, Perplexity, and Gemini for 21 query combinations.",
    api: "/api/admin/growth/agents/ai-citation",
    collections: ["growth_os_citations", "growth_os_citation_runs", "growth_os_citation_tasks"],
    trigger: "Manual",
    output: "Citation report per AI model + query",
    statusNote: "API functional. Accessible via GEO module.",
  },
  {
    id: "content-factory",
    name: "Content Factory",
    category: "seo_content",
    status: "active",
    description: "AI content generation — blog posts, product descriptions, comparison pages, knowledge articles.",
    route: "/admin/growth/content",
    api: "/api/admin/growth/content",
    collections: ["growth_os_drafts", "blogs"],
    trigger: "Manual",
    output: "Draft content for review and publishing",
    usedBy: "Marketing",
  },
  {
    id: "landing-pages",
    name: "Landing Pages",
    category: "seo_content",
    status: "active",
    description: "Landing page CMS — create, edit, publish campaign and product landing pages with section builder.",
    route: "/admin/growth/landing-pages",
    api: "/api/admin/landing-pages",
    collections: ["landing_page_overrides"],
    trigger: "Manual",
    output: "Published landing pages at custom slugs",
    usedBy: "Marketing",
  },
  {
    id: "geo-ai-search",
    name: "GEO / AI Search Intelligence",
    category: "seo_content",
    status: "active",
    description: "Generative Engine Optimization — tracks 100X visibility in AI search (ChatGPT, Perplexity, Gemini, Google SGE).",
    route: "/admin/growth/geo",
    trigger: "Manual citation audits",
    output: "Citation presence + gaps across AI engines",
    usedBy: "Marketing",
  },
  {
    id: "competitor-intel",
    name: "Competitor Intelligence",
    category: "seo_content",
    status: "active",
    description: "Competitor tracking — market position, keyword overlap, content gap analysis.",
    route: "/admin/growth/competitors",
    trigger: "Manual",
    output: "Competitor position and keyword gap analysis",
    usedBy: "Marketing (Advanced Tools)",
  },

  // ─── MARKET INTELLIGENCE ────────────────────────────────────────────────────

  {
    id: "fogging-intelligence",
    name: "Fogging Intelligence v1.4",
    category: "fogging",
    status: "active",
    description: "FROZEN dataset: 1,418 GeM contracts, ₹75.08 Cr GMV, 670 orgs, 679 sellers. Organization-first entity resolution. Full drill-down: contract → org → seller → OEM → state.",
    route: "/admin/growth/fogging",
    collections: ["fogging_contracts", "fogging_buyers", "fogging_oems", "fogging_models", "fogging_sellers", "fogging_organizations"],
    output: "Contract browser, org profiles, seller profiles, OEM profiles, state analysis",
    usedBy: "Founder / Market Intelligence",
    statusNote: "FROZEN v1.4 (commit 0ffb640). Do not modify collections.",
  },
  {
    id: "dealer-intelligence",
    name: "Dealer Intelligence",
    category: "market_intelligence",
    status: "active",
    description: "GeM seller analysis — existing 100X dealers, competitor dealers, geographic gaps, acquisition targets.",
    route: "/admin/growth/dealers",
    api: "/api/admin/procurement/dealer-acquisition",
    collections: ["fogging_sellers", "buyer_profiles", "seller_profiles"],
    trigger: "Weekly dealer opportunity cron + manual",
    output: "Ranked dealer acquisition targets by state/tier",
    usedBy: "Founder / Market Intelligence",
  },
  {
    id: "procurement-intelligence",
    name: "Procurement Intelligence",
    category: "procurement",
    status: "active",
    description: "Full GeM contract intelligence — buyer profiles, seller profiles, contract analytics, knowledge graph, AI analyst chatbot.",
    route: "/admin/growth/procurement",
    api: "/api/admin/procurement/*",
    collections: ["gem_contracts", "buyer_profiles", "seller_profiles", "contract_analytics"],
    trigger: "Daily insights cron 06:30 IST + manual harvest",
    output: "Contract data, buyer/seller profiles, insights, alerts",
    usedBy: "Market Intelligence",
  },
  {
    id: "procurement-ai-analyst",
    name: "Procurement AI Analyst",
    category: "procurement",
    status: "orphaned",
    description: "AI chatbot for natural language queries over GeM procurement data.",
    api: "/api/admin/procurement/ai-analyst",
    statusNote: "API functional. No dedicated UI chat surface in Growth OS. Accessible only via direct API call.",
  },
  {
    id: "procurement-knowledge-graph",
    name: "Procurement Knowledge Graph",
    category: "procurement",
    status: "orphaned",
    description: "Graph of relationships between buyers, sellers, products, categories.",
    api: "/api/admin/procurement/knowledge-graph",
    statusNote: "API functional. No UI to visualize or browse the graph.",
  },
  {
    id: "gem-intel-legacy",
    name: "GeM Intel (Legacy)",
    category: "fogging",
    status: "legacy",
    description: "Original GeM contract browser — predates Fogging Intelligence v1.4.",
    route: "/admin/growth/gem",
    collections: ["gem_contracts"],
    statusNote: "Replaced by Fogging Intelligence v1.4. Route still accessible. Not in nav.",
  },

  // ─── CRM ────────────────────────────────────────────────────────────────────

  {
    id: "brochure-leads",
    name: "Brochure Leads",
    category: "crm",
    status: "active",
    description: "Tracks all brochure download requests — name, company, phone, email, state, timestamp.",
    api: "/api/admin/brochure-leads",
    collections: ["brochure_leads"],
    trigger: "Event-driven (public form submit)",
    output: "Lead record in brochure_leads collection",
    statusNote: "Managed in main admin panel (BrochureLeadsTab). No dedicated Growth OS page. Connected to lead analytics.",
  },
  {
    id: "rfq-leads",
    name: "RFQ Submissions",
    category: "crm",
    status: "active",
    description: "All RFQ form submissions — product, quantity, org, contact, state, requirements.",
    api: "/api/rfq-submit",
    collections: ["rfq_popup_leads"],
    trigger: "Event-driven (public RFQ form)",
    output: "Lead record in rfq_popup_leads collection",
    statusNote: "Managed in main admin panel. No dedicated Growth OS CRM page.",
  },
  {
    id: "dealer-leads",
    name: "Dealer Lead Classifier",
    category: "crm",
    status: "active",
    description: "AI classifier for incoming dealer applications, OEM auth requests, tender support inquiries. Intent scoring.",
    api: "/api/admin/growth/agents/dealer-lead",
    collections: ["dealer_lead_classifications"],
    trigger: "Event-driven (dealer application submit)",
    output: "Lead classification with intent score and recommended action",
  },
  {
    id: "contact-this-week",
    name: "Contact This Week",
    category: "crm",
    status: "hidden",
    description: "Lead follow-up tracking — shows who needs to be contacted this week based on lead age and score.",
    route: "/admin/growth/contact-this-week",
    statusNote: "Hidden from nav in simplification sprint. Functional. Should be in CRM section.",
  },
  {
    id: "opportunities-crm",
    name: "Opportunities",
    category: "crm",
    status: "hidden",
    description: "Revenue opportunity tracking — scored leads, follow-up status, expected value.",
    route: "/admin/growth/opportunities",
    api: "/api/admin/growth/opportunities",
    collections: ["growth_opportunities", "growth_opportunity_status"],
    statusNote: "Hidden from nav. Functional. Should be in CRM section.",
  },
  {
    id: "execution-packs",
    name: "Execution Packs",
    category: "crm",
    status: "orphaned",
    description: "Auto-generated execution artifacts when Revenue Director recommendations are approved — outreach emails, call scripts, SEO briefs, ad copy.",
    api: "/api/admin/growth/director/packs/[id]",
    collections: ["director_execution_packs"],
    statusNote: "Packs are viewable inline in Revenue Director card. No standalone browsable page to see all packs across all recommendations.",
  },
  {
    id: "weekly-review",
    name: "Founder Weekly Review",
    category: "revenue_intelligence",
    status: "active",
    description: "Weekly revenue execution summary: won/lost revenue, dealer activations, SEO/Ads output, Director outcomes, and platform preservation audit.",
    route: "/admin/growth/reports/weekly-review",
    api: "/api/admin/growth/reports/weekly-review",
    collections: ["crm_opportunities", "crm_dealers", "seo_workflow_items", "ads_workflow_items", "director_recommendations"],
    trigger: "Manual (founder opens page)",
    output: "Revenue summary, pipeline state, execution counts, preservation audit.",
    usedBy: "Founder (weekly review)",
  },
  {
    id: "dealer-crm",
    name: "Dealer CRM",
    category: "crm",
    status: "active",
    description: "Dealer relationship pipeline — 7 stages from Lead to Active Dealer. Tracks contact info, GeM/OEM status, expected revenue, follow-up dates. Attribution to Revenue Director recommendations via source_recommendation_id.",
    route: "/admin/growth/crm/dealers",
    api: "/api/admin/growth/crm/dealers",
    collections: ["crm_dealers"],
    trigger: "Manual entry",
    output: "Pipeline view with stage progression, revenue forecasting",
    usedBy: "Founder / Sales",
  },
  {
    id: "opportunity-crm",
    name: "Opportunity CRM",
    category: "crm",
    status: "active",
    description: "Opportunity pipeline — 8 stages from Identified to Won/Lost. Types: dealer recruitment, OEM displacement, procurement, other. Tracks value, probability, weighted pipeline, actual revenue.",
    route: "/admin/growth/crm/opportunities",
    api: "/api/admin/growth/crm/opportunities",
    collections: ["crm_opportunities"],
    trigger: "Manual entry",
    output: "Pipeline with weighted value, won/lost tracking",
    usedBy: "Founder / Sales",
  },
  {
    id: "execution-hub",
    name: "Execution Hub",
    category: "revenue_intelligence",
    status: "active",
    description: "Unified execution view — approved Revenue Director recommendations, active dealer pipeline, and open opportunities in one page. Connects Director recs → CRM dealers → CRM opportunities via source_recommendation_id.",
    route: "/admin/growth/execution",
    api: "/api/admin/growth/execution",
    collections: ["director_recommendations", "crm_dealers", "crm_opportunities"],
    trigger: "Live aggregation on page load",
    output: "3-column view: Director recs | Dealer pipeline | Opportunities",
    usedBy: "Founder (daily execution review)",
  },
  {
    id: "seo-workflow",
    name: "SEO Workflow",
    category: "seo_content",
    status: "active",
    description: "SEO editorial pipeline — 7 stages: identified → approved → draft → review → edit → published → tracking. No automatic publishing. Draft content stored in DB. Links to Opportunity CRM via source_opportunity_id.",
    route: "/admin/growth/seo/workflow",
    api: "/api/admin/growth/seo/workflow",
    collections: ["seo_workflow_items"],
    trigger: "Manual entry",
    output: "Editorial pipeline with draft content, stage transitions, publish URL tracking",
    usedBy: "Marketing",
  },
  {
    id: "ads-workflow",
    name: "Ads Workflow",
    category: "google_ads",
    status: "active",
    description: "Campaign management pipeline — 6 stages: recommendation → approved → draft → review → deployed → tracking. 6 campaign types: Search, PMax, Remarketing, Customer Match, Competitor Conquest, YouTube. No automatic deployment — all submissions manual.",
    route: "/admin/growth/ads/workflow",
    api: "/api/admin/growth/ads/workflow",
    collections: ["ads_workflow_items"],
    trigger: "Manual entry",
    output: "Campaign pipeline with brief, budget, actuals (spend/clicks/conversions), computed CPC/CPA/CVR",
    usedBy: "Marketing / Founder",
  },

  // ─── ANALYTICS ──────────────────────────────────────────────────────────────

  {
    id: "ga4-analytics",
    name: "GA4 Analytics",
    category: "analytics",
    status: "active",
    description: "Google Analytics 4 data — sessions, users, conversions, events, traffic sources.",
    route: "/admin/growth/analytics",
    api: "/api/admin/ga4/*",
    collections: [],
    trigger: "Manual sync + display",
    usedBy: "Marketing / Founder",
  },
  {
    id: "conversion-dashboard",
    name: "Conversion Dashboard",
    category: "analytics",
    status: "active",
    description: "Full funnel conversion tracking — impressions → clicks → leads → deals.",
    route: "/admin/growth/founder",
    api: "/api/admin/growth/conversion-dashboard",
    usedBy: "Founder",
    statusNote: "Lives inside Founder Revenue Dashboard page at /admin/growth/founder. Not separately navigable.",
  },
  {
    id: "lead-analytics",
    name: "Lead Analytics",
    category: "analytics",
    status: "active",
    description: "Lead scoring, source attribution, state-wise breakdown, daily/weekly trend.",
    api: "/api/admin/lead-analytics",
    collections: ["brochure_leads", "rfq_popup_leads"],
    statusNote: "API active. Data visible in founder dashboard. No dedicated Growth OS page.",
  },
  {
    id: "founder-revenue-dashboard",
    name: "Founder Revenue Dashboard",
    category: "analytics",
    status: "hidden",
    description: "Comprehensive revenue dashboard — GuidedActionCard, 4 revenue tiles, BusinessDashboard, ConversionDashboard, Playbook, Advanced metrics.",
    route: "/admin/growth/founder",
    api: "/api/admin/growth/founder-v2",
    statusNote: "Hidden from nav in simplification sprint. Extremely valuable. Should surface under Advanced Tools.",
  },
  {
    id: "reporting-center",
    name: "Reporting Center",
    category: "analytics",
    status: "active",
    description: "Weekly/monthly executive reports — GSC trends, ad performance, lead funnel, fogging intelligence summary.",
    route: "/admin/growth/reports",
    api: "/api/admin/growth/exec-summary",
    collections: ["growth_exec_summaries"],
    usedBy: "Founder",
  },

  // ─── SYSTEM ─────────────────────────────────────────────────────────────────

  {
    id: "rbac-users",
    name: "User Management",
    category: "system",
    status: "active",
    description: "Full RBAC user management — 8 roles, per-user permission overrides, password management.",
    route: "/admin/growth/users",
    api: "/api/admin/users",
    collections: ["rbac_users", "rbac_user_permissions"],
    usedBy: "Admin",
  },
  {
    id: "permissions",
    name: "Permission Matrix",
    category: "system",
    status: "active",
    description: "74-permission RBAC matrix — role-permission assignments, per-user overrides, audit trail.",
    route: "/admin/growth/permissions",
    api: "/api/admin/permissions",
    collections: ["rbac_role_permissions", "auth_audit_log"],
    usedBy: "Admin",
  },
  {
    id: "security",
    name: "Security Center",
    category: "system",
    status: "active",
    description: "Session management, active sessions, orphan cleanup, auth diagnostics.",
    route: "/admin/growth/security",
    api: "/api/admin/security/*",
    collections: ["active_sessions", "auth_audit_log"],
    usedBy: "Admin",
  },
  {
    id: "activity-logs",
    name: "Activity Logs",
    category: "system",
    status: "active",
    description: "Growth OS agent run logs — all agent actions, errors, outputs logged here.",
    route: "/admin/growth/logs",
    api: "/api/admin/growth/logs",
    collections: ["growth_os_logs"],
    usedBy: "Admin / Founder",
  },
  {
    id: "launch-status",
    name: "Launch Status",
    category: "system",
    status: "hidden",
    description: "Launch readiness checklist — all systems, integrations, and configurations with green/amber/red status.",
    route: "/admin/growth/launch",
    api: "/api/admin/growth/launch-status",
    statusNote: "Hidden from nav. Functional. Still useful for system health review.",
  },
  {
    id: "ai-health-check",
    name: "Agent Health Check",
    category: "system",
    status: "hidden",
    description: "Tests all AI agents for responsiveness, correct output format, dependency health.",
    route: "/admin/growth/agents/health-check",
    api: "/api/admin/growth/agents/health-check",
    statusNote: "Hidden from nav. Accessible from Operations Center. Functional.",
  },
  {
    id: "automation-center",
    name: "Automation Center (Legacy)",
    category: "system",
    status: "legacy",
    description: "Original automation management page.",
    route: "/admin/growth/automation",
    statusNote: "Replaced by Operations Center. Route still functional.",
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const STATUS_LABELS: Record<CapabilityStatus, string> = {
  active:    "Active",
  hidden:    "Hidden",
  orphaned:  "Orphaned",
  legacy:    "Legacy",
  duplicate: "Duplicate",
  broken:    "Broken",
}

export const STATUS_COLOR: Record<CapabilityStatus, string> = {
  active:    "bg-green-100 text-green-700 border-green-200",
  hidden:    "bg-yellow-100 text-yellow-700 border-yellow-200",
  orphaned:  "bg-orange-100 text-orange-700 border-orange-200",
  legacy:    "bg-gray-100 text-gray-500 border-gray-200",
  duplicate: "bg-blue-100 text-blue-700 border-blue-200",
  broken:    "bg-red-100 text-red-700 border-red-200",
}

export const CATEGORY_LABELS: Record<CapabilityCategory, string> = {
  revenue_intelligence: "Revenue Intelligence",
  google_ads:           "Google Ads",
  seo_content:          "SEO & Content",
  market_intelligence:  "Market Intelligence",
  crm:                  "CRM",
  analytics:            "Analytics",
  system:               "System",
  procurement:          "Procurement",
  fogging:              "Fogging Intel",
}

// ─── MongoDB Collection Registry ──────────────────────────────────────────────

export interface CollectionEntry {
  name: string
  category: string
  purpose: string
  writtenBy: string
  readBy: string
  status: "active" | "frozen" | "legacy" | "orphaned"
  estimatedDocs?: string
}

export const COLLECTION_REGISTRY: CollectionEntry[] = [
  // Fogging Intelligence (frozen)
  { name: "fogging_contracts",      category: "Fogging Intel",  purpose: "1,418 GeM thermal fogging contracts",                   writtenBy: "ETL pipeline",               readBy: "Fogging Intel, Revenue Director",   status: "frozen", estimatedDocs: "1,418" },
  { name: "fogging_buyers",         category: "Fogging Intel",  purpose: "Government buyer profiles from fogging data",           writtenBy: "ETL pipeline",               readBy: "Fogging Intel, Revenue Director",   status: "frozen", estimatedDocs: "~1,200" },
  { name: "fogging_sellers",        category: "Fogging Intel",  purpose: "GeM seller profiles including 100X and competitors",    writtenBy: "ETL pipeline",               readBy: "Fogging Intel, Revenue Director",   status: "frozen", estimatedDocs: "679" },
  { name: "fogging_oems",           category: "Fogging Intel",  purpose: "OEM brand profiles from fogging data",                  writtenBy: "ETL pipeline",               readBy: "Fogging Intel",                    status: "frozen" },
  { name: "fogging_models",         category: "Fogging Intel",  purpose: "Machine model catalog from fogging data",               writtenBy: "ETL pipeline",               readBy: "Fogging Intel",                    status: "frozen" },
  { name: "fogging_organizations",  category: "Fogging Intel",  purpose: "670 canonical government orgs with entity resolution",  writtenBy: "ETL pipeline",               readBy: "Fogging Intel, Revenue Director, Execution Pack Gen", status: "frozen", estimatedDocs: "670" },
  // Revenue Director
  { name: "director_recommendations", category: "Revenue Director", purpose: "Ranked revenue recommendations with full lifecycle",  writtenBy: "Revenue Director cron",     readBy: "Director UI, Approvals API",  status: "active" },
  { name: "director_daily_runs",    category: "Revenue Director", purpose: "Daily run records — idempotency, source health",        writtenBy: "Revenue Director cron",     readBy: "Director UI, Operations Center", status: "active" },
  { name: "director_outcomes",      category: "Revenue Director", purpose: "Decision log for all lifecycle transitions",            writtenBy: "Approvals API",             readBy: "Measurement API",             status: "active" },
  { name: "director_execution_packs", category: "Revenue Director", purpose: "Execution artifacts generated on approval",          writtenBy: "Execution Pack Generator",  readBy: "Packs API, Director UI",      status: "active" },
  // Ads
  { name: "ads_settings",           category: "Google Ads",     purpose: "Google Ads API credentials and config",                  writtenBy: "Ads Setup UI",              readBy: "Ads sync agents",             status: "active" },
  { name: "ads_syncs",              category: "Google Ads",     purpose: "Sync history and metadata",                              writtenBy: "Ads sync",                  readBy: "Revenue Director, Ops Center", status: "active" },
  { name: "ads_searchterm_rows",    category: "Google Ads",     purpose: "Search term performance data",                           writtenBy: "Ads sync",                  readBy: "Revenue Director, Ads UI",    status: "active" },
  { name: "ads_keyword_rows",       category: "Google Ads",     purpose: "Keyword-level performance data",                         writtenBy: "Ads sync",                  readBy: "Keyword Intelligence API",    status: "active" },
  { name: "ads_campaign_rows",      category: "Google Ads",     purpose: "Campaign-level performance data",                        writtenBy: "Ads sync",                  readBy: "Ads dashboard",               status: "active" },
  { name: "ads_recommendations",    category: "Google Ads",     purpose: "Ads Director weekly recommendations",                    writtenBy: "Ads Director cron",         readBy: "Ads Approval Queue UI",       status: "active" },
  { name: "ads_approval_queue",     category: "Google Ads",     purpose: "Pending/approved/rejected ads recommendations",          writtenBy: "Ads Approval API",          readBy: "Ads Director UI",             status: "active" },
  { name: "campaign_plans",         category: "Google Ads",     purpose: "AI-generated campaign structures",                       writtenBy: "Campaign Factory",          readBy: "Campaign Factory UI",         status: "active" },
  { name: "campaign_deployments",   category: "Google Ads",     purpose: "Deployment records for approved campaigns",              writtenBy: "Campaign Deployment API",   readBy: "Campaign Factory UI",         status: "active" },
  { name: "creative_director_runs", category: "Google Ads",     purpose: "Creative Director run outputs",                          writtenBy: "Creative Director",         readBy: "Creative Director UI",        status: "active" },
  { name: "creative_asset_performance", category: "Google Ads", purpose: "Performance tracking of generated creatives",            writtenBy: "Ads sync",                  readBy: "No UI (orphaned)",            status: "orphaned" },
  { name: "creative_learnings",     category: "Google Ads",     purpose: "AI learnings from creative performance",                 writtenBy: "Creative Director",         readBy: "No UI (orphaned)",            status: "orphaned" },
  // GSC / SEO
  { name: "gsc_syncs",              category: "SEO",            purpose: "GSC sync history",                                       writtenBy: "GSC Sync cron",             readBy: "SEO UI, Revenue Director",    status: "active" },
  { name: "gsc_query_rows",         category: "SEO",            purpose: "Query-level GSC performance data",                       writtenBy: "GSC Sync cron",             readBy: "SEO UI, Revenue Director",    status: "active" },
  { name: "gsc_page_rows",          category: "SEO",            purpose: "Page-level GSC performance data",                        writtenBy: "GSC Sync cron",             readBy: "SEO UI",                      status: "active" },
  { name: "offpage_opportunities",  category: "SEO",            purpose: "Off-page SEO backlink opportunities",                    writtenBy: "Off-Page SEO Director",     readBy: "Off-Page SEO UI",             status: "active" },
  { name: "growth_os_opportunities", category: "SEO",           purpose: "SEO + cross-signal opportunities",                       writtenBy: "SEO Opportunity Agent",     readBy: "Opportunity Engine UI",       status: "active" },
  { name: "growth_os_citations",    category: "SEO",            purpose: "AI citation audit results",                              writtenBy: "AI Citation Audit",         readBy: "GEO UI",                      status: "active" },
  { name: "growth_os_link_graph",   category: "SEO",            purpose: "Internal link graph data",                               writtenBy: "Internal Link Auditor",     readBy: "SEO UI",                      status: "active" },
  { name: "growth_os_schema_audit", category: "SEO",            purpose: "JSON-LD schema validation results",                      writtenBy: "Schema Auditor",            readBy: "SEO validation UI",           status: "active" },
  { name: "growth_os_drafts",       category: "Content",        purpose: "AI-generated content drafts",                            writtenBy: "Content Factory",           readBy: "Content Factory UI",          status: "active" },
  { name: "landing_page_overrides", category: "Content",        purpose: "Custom landing page section data",                       writtenBy: "Landing Pages UI",          readBy: "Public landing pages",        status: "active" },
  // Procurement
  { name: "gem_contracts",          category: "Procurement",    purpose: "GeM contract harvest data",                              writtenBy: "Harvest agents",            readBy: "Procurement Intel, Fogging",  status: "active" },
  { name: "buyer_profiles",         category: "Procurement",    purpose: "Enriched buyer profiles",                                writtenBy: "Enrichment agent",          readBy: "Procurement Intel UI",        status: "active" },
  { name: "seller_profiles",        category: "Procurement",    purpose: "Enriched seller profiles",                               writtenBy: "Enrichment agent",          readBy: "Procurement Intel UI",        status: "active" },
  { name: "contract_analytics",     category: "Procurement",    purpose: "Pre-computed analytics (buyer-seller pairs, stats)",     writtenBy: "Analytics pipeline",        readBy: "Procurement Intel UI",        status: "active" },
  { name: "gem_procurement_insights", category: "Procurement",  purpose: "Daily AI-generated procurement insights",                writtenBy: "Procurement Insights cron", readBy: "Procurement UI",              status: "active" },
  { name: "gem_procurement_alerts", category: "Procurement",    purpose: "Procurement alerts and notifications",                   writtenBy: "Procurement Insights cron", readBy: "Procurement UI",              status: "active" },
  // CRM
  { name: "brochure_leads",         category: "CRM",            purpose: "All brochure download requests",                         writtenBy: "Public brochure form",      readBy: "Main admin panel, Lead Analytics", status: "active" },
  { name: "rfq_popup_leads",        category: "CRM",            purpose: "All RFQ form submissions",                               writtenBy: "Public RFQ form",           readBy: "Main admin panel",            status: "active" },
  { name: "dealer_lead_classifications", category: "CRM",       purpose: "AI-classified dealer/OEM auth leads",                    writtenBy: "Dealer Lead Classifier",    readBy: "No dedicated UI (orphaned)",  status: "orphaned" },
  { name: "growth_opportunities",   category: "CRM",            purpose: "Scored revenue opportunities",                           writtenBy: "Dealer + Buyer opportunity crons", readBy: "Opportunity Engine UI", status: "active" },
  { name: "growth_exec_summaries",  category: "CRM",            purpose: "Weekly executive summary reports",                       writtenBy: "Exec Summary cron",         readBy: "Reports UI",                  status: "active" },
  { name: "revenue_attribution",    category: "CRM",            purpose: "Multi-touch attribution model",                          writtenBy: "Attribution system",        readBy: "Revenue Attribution UI",      status: "active" },
  // System
  { name: "rbac_users",             category: "System",         purpose: "User accounts and role assignments",                     writtenBy: "Users API",                 readBy: "Auth system, Users UI",       status: "active" },
  { name: "growth_os_logs",         category: "System",         purpose: "Agent run logs — all Growth OS automation events",       writtenBy: "All agents (logAgentRun())", readBy: "Logs UI, Operations Center", status: "active" },
  { name: "automation_registry",    category: "System",         purpose: "Seeded automation catalog for Operations Center",        writtenBy: "Operations seed API",       readBy: "Operations Center",           status: "active" },
  { name: "active_sessions",        category: "System",         purpose: "Active admin sessions",                                  writtenBy: "Auth system",               readBy: "Security Center",             status: "active" },
  { name: "market_intelligence_runs", category: "Analytics",    purpose: "Market Intelligence agent run outputs",                  writtenBy: "Market Intelligence Agent", readBy: "Market Intelligence UI",      status: "active" },
  // Revenue OS v2.1
  { name: "platform_changelog", category: "System",         purpose: "Platform changelog — every capability/route addition, auto-seeded on first call",   writtenBy: "Changelog API",              readBy: "Knowledge Center",            status: "active" },
  // Revenue OS v2 CRM
  { name: "crm_dealers",         category: "CRM",            purpose: "Dealer CRM pipeline — 7 stages, GeM/OEM status, expected revenue, attribution to Director recs",   writtenBy: "Dealer CRM UI / API",       readBy: "Dealer CRM UI, Execution Hub", status: "active" },
  { name: "crm_opportunities",   category: "CRM",            purpose: "Opportunity pipeline — 8 stages, value/probability, 4 types, attribution to Director recs",        writtenBy: "Opportunity CRM UI / API",  readBy: "Opportunity CRM UI, Execution Hub", status: "active" },
  // Revenue OS v2 SEO + Ads Workflows
  { name: "seo_workflow_items",  category: "SEO",            purpose: "SEO editorial pipeline items — 7 stages, draft content, keyword targeting, no auto-publish",       writtenBy: "SEO Workflow UI / API",     readBy: "SEO Workflow UI",             status: "active" },
  { name: "ads_workflow_items",  category: "Google Ads",     purpose: "Ads campaign pipeline — 6 stages, 6 types, brief, budget, actuals, no auto-deployment",            writtenBy: "Ads Workflow UI / API",     readBy: "Ads Workflow UI",             status: "active" },
]

// ─── Summary stats ────────────────────────────────────────────────────────────

export function getRegistryStats() {
  const byStatus = CAPABILITY_REGISTRY.reduce((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1
    return acc
  }, {} as Record<CapabilityStatus, number>)

  const byCategory = CAPABILITY_REGISTRY.reduce((acc, c) => {
    acc[c.category] = (acc[c.category] || 0) + 1
    return acc
  }, {} as Record<CapabilityCategory, number>)

  return { byStatus, byCategory, total: CAPABILITY_REGISTRY.length }
}
