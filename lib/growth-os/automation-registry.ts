/**
 * Automation Registry — canonical config for every bot/agent in Growth OS.
 * This is the source of truth. Seed to MongoDB via POST /api/admin/growth/operations/seed.
 * Live run data is fetched at query time from individual MongoDB collections.
 */

export type TriggerType = "scheduled" | "manual" | "event_driven"
export type AutomationStatus = "active" | "dormant" | "broken" | "unknown"
export type FounderVisibility = "dashboard" | "email" | "logs_only" | "none"
export type AutomationCategory = "daily_cron" | "weekly_cron" | "manual_ai" | "manual_data" | "etl"

export interface AutomationConfig {
  id: string
  module: string               // matches spec module names
  purpose: string              // one sentence
  trigger_type: TriggerType
  category: AutomationCategory

  // Scheduling (scheduled only)
  schedule?: string            // cron expression
  schedule_label?: string      // human-readable "Daily 07:00 IST"
  expected_interval_hours?: number  // for staleness detection
  cron_path?: string           // vercel.json path

  // Identification for live lookup
  agent_string?: string        // AGENT constant used in growth_os_logs
  api_path?: string            // manual trigger endpoint
  run_collection?: string      // primary collection for run tracking
  run_ts_field?: string        // timestamp field in run_collection
  run_status_field?: string    // status/level field (success vs error)
  run_status_ok_values?: string[]  // values that mean success

  // Output
  output_type: string          // "recommendations" | "sync" | "report" | "email" | "creative" | "plan"
  output_collections: string[] // collections written to
  output_description: string   // what gets created (for display)

  // Founder access
  founder_url?: string
  founder_visibility: FounderVisibility
  founder_visibility_label: string   // human-readable

  // Metadata
  version?: string
  dependencies?: string[]      // IDs of automations that must run first
}

export const AUTOMATION_REGISTRY: AutomationConfig[] = [
  // ─── Daily Crons ────────────────────────────────────────────────────────────

  {
    id: "revenue-director",
    module: "Revenue Director",
    purpose: "Autonomous daily revenue engine — generates ranked recommendations from Fogging, Ads, and GSC signals with morning email brief.",
    trigger_type: "scheduled",
    category: "daily_cron",
    schedule: "30 1 * * *",
    schedule_label: "Daily 07:00 IST",
    expected_interval_hours: 25,
    cron_path: "/api/admin/growth/cron/revenue-director",
    agent_string: "Revenue Director",
    api_path: "/api/admin/growth/director/run",
    run_collection: "director_daily_runs",
    run_ts_field: "completed_at",
    run_status_field: "status",
    run_status_ok_values: ["completed"],
    output_type: "recommendations",
    output_collections: ["director_recommendations", "director_daily_runs", "director_outcomes", "growth_os_logs"],
    output_description: "Ranked revenue recommendations + morning email brief",
    founder_url: "/admin/growth/director",
    founder_visibility: "dashboard",
    founder_visibility_label: "Revenue Director dashboard + email",
    version: "1.0",
  },

  {
    id: "procurement-insights",
    module: "Procurement Intelligence",
    purpose: "Daily synthesis of GeM contract data into dealer, buyer, product, and sector opportunities.",
    trigger_type: "scheduled",
    category: "daily_cron",
    schedule: "0 1 * * *",
    schedule_label: "Daily 06:30 IST",
    expected_interval_hours: 25,
    cron_path: "/api/admin/procurement/insights",
    run_collection: "gem_procurement_alerts",
    run_ts_field: "generatedAt",
    output_type: "report",
    output_collections: ["gem_procurement_insights", "gem_procurement_alerts"],
    output_description: "7 insight types: new dealers, repeat buyers, emerging products, fragmented markets, sector opportunities",
    founder_url: "/admin/growth/procurement",
    founder_visibility: "dashboard",
    founder_visibility_label: "Procurement Intel dashboard",
  },

  {
    id: "gsc-sync",
    module: "Search Console",
    purpose: "Daily 2-window Google Search Console sync (current + previous 28d), followed by SEO Opportunity Agent.",
    trigger_type: "scheduled",
    category: "daily_cron",
    schedule: "0 5 * * *",
    schedule_label: "Daily 10:30 IST",
    expected_interval_hours: 25,
    cron_path: "/api/admin/growth/cron/gsc-sync",
    run_collection: "gsc_syncs",
    run_ts_field: "syncedAt",
    run_status_field: "status",
    run_status_ok_values: ["ok", "success"],
    output_type: "sync",
    output_collections: ["gsc_syncs", "gsc_query_rows", "gsc_page_rows", "growth_os_opportunities", "growth_os_schema_audit"],
    output_description: "GSC query + page rows for current & previous 28d windows + SEO opportunity cards",
    founder_url: "/admin/growth/seo/setup",
    founder_visibility: "dashboard",
    founder_visibility_label: "SEO Command Center",
  },

  // ─── Weekly Crons ───────────────────────────────────────────────────────────

  {
    id: "dealer-opportunity",
    module: "Dealer Intelligence",
    purpose: "Weekly ranking of GeM equipment sellers (Tier A/B) for 100X dealer network expansion.",
    trigger_type: "scheduled",
    category: "weekly_cron",
    schedule: "0 2 * * 1",
    schedule_label: "Monday 07:30 IST",
    expected_interval_hours: 9 * 24,
    cron_path: "/api/admin/growth/cron/dealer-opportunity",
    agent_string: "Dealer Opportunity Engine",
    run_collection: "growth_os_logs",
    run_ts_field: "ts",
    run_status_field: "level",
    run_status_ok_values: ["success", "info"],
    output_type: "report",
    output_collections: ["growth_opportunities", "growth_opportunity_status", "growth_os_logs"],
    output_description: "Ranked dealer opportunities with OEM-authorization probability scores",
    founder_url: "/admin/growth/dealers",
    founder_visibility: "dashboard",
    founder_visibility_label: "Dealer Intelligence dashboard",
  },

  {
    id: "machine-buyer-opportunity",
    module: "Opportunity Engine",
    purpose: "Weekly ranking of government buyers for direct machine sales (machine/chemical intent scoring).",
    trigger_type: "scheduled",
    category: "weekly_cron",
    schedule: "30 2 * * 1",
    schedule_label: "Monday 08:00 IST",
    expected_interval_hours: 9 * 24,
    cron_path: "/api/admin/growth/cron/machine-buyer-opportunity",
    agent_string: "Machine Buyer Opportunity Engine",
    run_collection: "growth_os_logs",
    run_ts_field: "ts",
    run_status_field: "level",
    run_status_ok_values: ["success", "info"],
    output_type: "report",
    output_collections: ["growth_opportunities", "growth_opportunity_status", "growth_os_logs"],
    output_description: "Ranked machine buyer opportunities with intent and conversion scoring",
    founder_url: "/admin/growth/opportunities",
    founder_visibility: "dashboard",
    founder_visibility_label: "Opportunity Engine dashboard",
  },

  {
    id: "weekly-exec-summary",
    module: "Revenue Attribution",
    purpose: "Monday leadership rollup — top dealers, top buyers, wins, losses, new opportunities from the past 7 days.",
    trigger_type: "scheduled",
    category: "weekly_cron",
    schedule: "0 3 * * 1",
    schedule_label: "Monday 08:30 IST",
    expected_interval_hours: 9 * 24,
    cron_path: "/api/admin/growth/cron/weekly-exec-summary",
    agent_string: "Weekly Executive Summary",
    run_collection: "growth_exec_summaries",
    run_ts_field: "createdAt",
    output_type: "report",
    output_collections: ["growth_exec_summaries", "growth_os_opportunities", "growth_os_logs"],
    output_description: "Exec summary: top 20 dealers, top 20 buyers, week-over-week trends",
    founder_url: "/admin/growth/reports",
    founder_visibility: "dashboard",
    founder_visibility_label: "Executive Summary report",
    dependencies: ["dealer-opportunity", "machine-buyer-opportunity"],
  },

  {
    id: "google-ads-director",
    module: "Google Ads Director",
    purpose: "Weekly read-only Ads intelligence — negative keywords, new keyword opportunities, high-CPC waste, low-CTR alerts.",
    trigger_type: "scheduled",
    category: "weekly_cron",
    schedule: "0 4 * * 1",
    schedule_label: "Monday 09:30 IST",
    expected_interval_hours: 9 * 24,
    cron_path: "/api/admin/growth/cron/google-ads-director",
    agent_string: "Google Ads Director",
    run_collection: "ads_director_snapshots",
    run_ts_field: "generatedAt",
    output_type: "recommendations",
    output_collections: ["ads_recommendations", "ads_director_snapshots", "growth_os_opportunities", "growth_os_logs"],
    output_description: "4 recommendation types: negative_keyword, new_keyword, high_cpc, low_ctr — all approval-gated",
    founder_url: "/admin/growth/ads/director",
    founder_visibility: "dashboard",
    founder_visibility_label: "Ads Director approval queue",
  },

  // ─── Manual / On-Demand ─────────────────────────────────────────────────────

  {
    id: "seo-opportunity",
    module: "SEO Command Center",
    purpose: "Scan GSC data for near-wins, rank drops, CTR gaps, and new keyword opportunities.",
    trigger_type: "manual",
    category: "manual_data",
    agent_string: "SEO Opportunity Agent",
    api_path: "/api/admin/growth/agents/seo-opportunity",
    run_collection: "growth_os_logs",
    run_ts_field: "ts",
    run_status_field: "level",
    run_status_ok_values: ["success", "info"],
    output_type: "recommendations",
    output_collections: ["growth_os_opportunities", "growth_os_logs"],
    output_description: "SEO opportunity cards: near-wins, rank drops, CTR gaps, new keywords",
    founder_url: "/admin/growth/seo",
    founder_visibility: "dashboard",
    founder_visibility_label: "SEO Command Center",
  },

  {
    id: "ai-citation",
    module: "GEO / AI Search",
    purpose: "Audit 100X Circle citations across ChatGPT, Perplexity, and Gemini for target queries (21 combinations).",
    trigger_type: "manual",
    category: "manual_ai",
    api_path: "/api/admin/growth/agents/ai-citation",
    run_collection: "growth_os_citation_runs",
    run_ts_field: "startedAt",
    run_status_field: "status",
    run_status_ok_values: ["completed"],
    output_type: "report",
    output_collections: ["growth_os_citations", "growth_os_citation_runs", "growth_os_logs"],
    output_description: "Citation audit: 7 queries × 3 AI platforms — presence, accuracy, verification task queue",
    founder_url: "/admin/growth/geo",
    founder_visibility: "dashboard",
    founder_visibility_label: "GEO / AI Search dashboard",
  },

  {
    id: "internal-link",
    module: "SEO Command Center",
    purpose: "Audit site internal link graph — orphan pages, weak pages, strong hubs, linking suggestions.",
    trigger_type: "manual",
    category: "manual_data",
    api_path: "/api/admin/growth/agents/internal-link",
    run_collection: "growth_os_link_graph",
    run_ts_field: "updatedAt",
    output_type: "report",
    output_collections: ["growth_os_link_graph"],
    output_description: "Internal link audit: authority pages, orphan pages, weak pages, improvement recommendations",
    founder_url: "/admin/growth/seo",
    founder_visibility: "dashboard",
    founder_visibility_label: "SEO Command Center (link graph)",
  },

  {
    id: "schema-audit",
    module: "SEO Validation",
    purpose: "Verify JSON-LD schema compliance across site pages (Product, FAQPage, Article, BreadcrumbList, Organization).",
    trigger_type: "manual",
    category: "manual_data",
    api_path: "/api/admin/growth/agents/schema-audit",
    run_collection: "growth_os_schema_audit",
    run_ts_field: "updatedAt",
    output_type: "report",
    output_collections: ["growth_os_schema_audit"],
    output_description: "Schema validation report: ~30 pages, critical/warning issues per page",
    founder_url: "/admin/growth/seo/offpage/validate",
    founder_visibility: "dashboard",
    founder_visibility_label: "SEO Validation page",
  },

  {
    id: "offpage-seo",
    module: "Off-Page SEO",
    purpose: "Discover and manage backlink opportunities across 11 types: directories, guest posts, government listings, PR.",
    trigger_type: "manual",
    category: "manual_data",
    api_path: "/api/admin/growth/agents/offpage-seo",
    run_collection: "offpage_opportunities",
    run_ts_field: "updatedAt",
    output_type: "plan",
    output_collections: ["offpage_opportunities", "growth_os_logs"],
    output_description: "Backlink opportunity pipeline: discover → approve → outreach → track",
    founder_url: "/admin/growth/seo/offpage",
    founder_visibility: "dashboard",
    founder_visibility_label: "Off-Page SEO dashboard",
  },

  {
    id: "market-intelligence",
    module: "Competitor Intel",
    purpose: "AI-powered cross-signal analysis of GSC + Ads + Leads + GeM into product, state, and campaign opportunities.",
    trigger_type: "manual",
    category: "manual_ai",
    api_path: "/api/admin/growth/agents/market-intelligence",
    run_collection: "market_intelligence_runs",
    run_ts_field: "createdAt",
    output_type: "report",
    output_collections: ["market_intelligence_runs", "growth_os_logs"],
    output_description: "Product opportunities, state opportunities, campaign budget scores, founder briefing — 3 model tiers",
    founder_url: "/admin/growth/market-intelligence",
    founder_visibility: "dashboard",
    founder_visibility_label: "Market Intelligence dashboard",
  },

  {
    id: "creative-director",
    module: "Creative Director",
    purpose: "Generate Google Ads creative assets (RSA headlines, descriptions, callouts, sitelinks) across 8 persuasion frameworks.",
    trigger_type: "manual",
    category: "manual_ai",
    api_path: "/api/admin/growth/agents/creative-director",
    run_collection: "creative_director_runs",
    run_ts_field: "createdAt",
    output_type: "creative",
    output_collections: ["creative_director_runs"],
    output_description: "Scored creative assets per framework: headlines, descriptions, callouts, sitelinks, image concepts",
    founder_url: "/admin/growth/ads/creative-director",
    founder_visibility: "dashboard",
    founder_visibility_label: "Creative Director dashboard",
  },

  {
    id: "ads-campaign-factory",
    module: "Google Ads Director",
    purpose: "AI media buyer — detect demand → generate keywords → write copy → create paused campaign in Google Ads.",
    trigger_type: "manual",
    category: "manual_ai",
    api_path: "/api/admin/growth/ads/campaign-factory",
    run_collection: "campaign_plans",
    run_ts_field: "createdAt",
    output_type: "plan",
    output_collections: ["campaign_plans", "campaign_deployments"],
    output_description: "Campaign plans: keywords, negatives, ad copy, paused campaign created in Google Ads (approval required)",
    founder_url: "/admin/growth/ads",
    founder_visibility: "dashboard",
    founder_visibility_label: "Ads dashboard (campaign factory tab)",
  },

  {
    id: "dealer-lead",
    module: "Dealer Intelligence",
    purpose: "Classify and score incoming leads by intent type (dealer application, OEM authorization, tender support).",
    trigger_type: "event_driven",
    category: "manual_data",
    agent_string: "Dealer Lead Agent",
    api_path: "/api/admin/growth/agents/dealer-lead",
    run_collection: "growth_os_logs",
    run_ts_field: "ts",
    run_status_field: "level",
    run_status_ok_values: ["success", "info"],
    output_type: "report",
    output_collections: ["dealer_lead_classifications", "growth_os_logs"],
    output_description: "Lead classifications with intent scoring: dealer_application, oem_authorization, tender_support",
    founder_url: "/admin/growth/dealers",
    founder_visibility: "dashboard",
    founder_visibility_label: "Dealer Intelligence dashboard",
  },

  {
    id: "fogging-etl",
    module: "Fogging Intelligence",
    purpose: "Manual ETL pipeline — builds all 6 fogging collections from GeM contract archive (1,418 contracts, ₹75 Cr GMV).",
    trigger_type: "manual",
    category: "etl",
    run_collection: "fogging_contracts",
    run_ts_field: "_id",  // use ObjectId timestamp fallback
    output_type: "sync",
    output_collections: ["fogging_contracts", "fogging_buyers", "fogging_oems", "fogging_models", "fogging_sellers", "fogging_organizations"],
    output_description: "6 frozen collections: 1,418 contracts, 670 orgs, 679 sellers, 34 OEMs, 229 models — FROZEN at v1.4",
    founder_url: "/admin/growth/fogging",
    founder_visibility: "dashboard",
    founder_visibility_label: "Fogging Intelligence dashboard",
    version: "1.4",
  },
]

// ─── Schedule utilities ──────────────────────────────────────────────────────

export function nextScheduledRun(cronExpr: string): string {
  const parts = cronExpr.trim().split(/\s+/)
  if (parts.length < 5) return ""
  const [minStr, hourStr, , , dowStr] = parts
  const min = parseInt(minStr)
  const hour = parseInt(hourStr)

  const now = new Date()

  if (dowStr === "*") {
    const next = new Date(now)
    next.setUTCHours(hour, min, 0, 0)
    if (next <= now) next.setUTCDate(next.getUTCDate() + 1)
    return next.toISOString()
  }

  if (dowStr === "1") {
    const next = new Date(now)
    const currentDay = now.getUTCDay()
    const daysUntilMon = currentDay === 1 ? 0 : (1 + 7 - currentDay) % 7
    next.setUTCDate(now.getUTCDate() + daysUntilMon)
    next.setUTCHours(hour, min, 0, 0)
    if (next <= now) next.setUTCDate(next.getUTCDate() + 7)
    return next.toISOString()
  }

  return ""
}

export function computeStatus(
  config: AutomationConfig,
  lastRunAt: string | null,
  lastRunFailed: boolean,
): AutomationStatus {
  if (!lastRunAt) return "unknown"
  if (lastRunFailed) return "broken"

  const ageHours = (Date.now() - new Date(lastRunAt).getTime()) / 3_600_000

  if (config.trigger_type === "scheduled") {
    const threshold = (config.expected_interval_hours || 25) * 1.5
    return ageHours < threshold ? "active" : "dormant"
  }

  // Manual / event-driven — active if run within 14 days, dormant otherwise
  return ageHours < 14 * 24 ? "active" : "dormant"
}
