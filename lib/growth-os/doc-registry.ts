/**
 * Founder Knowledge System — Documentation Registry
 * Source of truth for all contextual help, Knowledge Center content, and AI chat context.
 * Self-updating: add a DocEntry here → docs appear everywhere automatically.
 */

export interface WorkflowStep {
  step: number
  label: string
  detail: string
}

export interface DocEntry {
  id: string                // matches capability ID in platform-registry
  name: string
  route: string
  section: "revenue" | "marketing" | "intelligence" | "crm" | "automations" | "system"
  purpose: string           // one-sentence answer to "what does this do?"
  when_to_use: string       // scenario / trigger
  how_to_use: string[]      // 5–10 bullet points
  connects_to: string[]     // IDs of related capabilities
  frequency: string         // how often founder should open this
  common_actions: string[]  // 3–5 top things done here
  workflow?: WorkflowStep[] // optional step-by-step flow
  tips?: string[]           // optional gotchas or pro tips
  collections?: string[]    // MongoDB collections this reads/writes
}

export const DOC_REGISTRY: DocEntry[] = [

  // ── REVENUE ───────────────────────────────────────────────────────────────

  {
    id: "revenue-director",
    name: "Revenue Director",
    route: "/admin/growth/director",
    section: "revenue",
    purpose: "Autonomous AI that reads all intelligence signals daily at 07:00 IST and generates a ranked shortlist of revenue actions for founder approval.",
    when_to_use: "Every morning after 07:00 IST to review yesterday's intelligence and approve today's revenue actions.",
    how_to_use: [
      "Open the page — you see today's Director run with ranked recommendations.",
      "Each recommendation shows: type, target, confidence score, estimated value, and evidence.",
      "Click 'Approve' to move a rec to execution. Click 'Reject' with a reason to exclude it.",
      "Approved recs auto-generate Execution Packs — detailed action plans ready to execute.",
      "Check the Execution Pack panel at the bottom to see what work is queued.",
      "Deferred recs stay in queue for the next day's review.",
      "Won / Lost outcomes feed back into the intelligence signals for future scoring.",
    ],
    connects_to: ["execution-packs", "execution-hub", "dealer-crm", "opportunity-crm"],
    frequency: "Daily — every morning",
    common_actions: ["Approve high-confidence recs", "Reject irrelevant recs with reason", "Open Execution Pack for approved rec", "Review signal breakdown"],
    workflow: [
      { step: 1, label: "Signal Ingestion", detail: "Director reads: fogging contracts, dealer targets, GSC keywords, Ads performance, procurement bids." },
      { step: 2, label: "Scoring", detail: "Each opportunity scored on: revenue potential, confidence, effort, strategic fit." },
      { step: 3, label: "Ranked Output", detail: "Top N recs delivered to founder's review queue every morning." },
      { step: 4, label: "Approval", detail: "Founder approves / rejects / defers each rec." },
      { step: 5, label: "Pack Generation", detail: "Approved recs auto-generate Execution Packs with specific action steps." },
      { step: 6, label: "Execution", detail: "Founder executes each pack, updates CRM stage, tracks outcome." },
      { step: 7, label: "Outcome", detail: "Mark Won or Lost — feeds back into future scoring." },
    ],
    tips: [
      "Focus on the top 3–5 recs. Don't try to execute everything.",
      "Reject quickly with a reason — it teaches the AI your preferences over time.",
      "Check 'Evidence' on each rec to understand why it was recommended.",
    ],
    collections: ["director_recommendations", "director_daily_runs", "director_outcomes"],
  },

  {
    id: "execution-hub",
    name: "Execution Hub",
    route: "/admin/growth/execution",
    section: "revenue",
    purpose: "Aggregated 3-column view of all active work: approved Director recs, dealer pipeline, and open opportunities in a single screen.",
    when_to_use: "Mid-morning after Director review, or any time you want a single-screen status of all active revenue work.",
    how_to_use: [
      "Left column shows Director recs in approved / in_progress / applied / completed states.",
      "Middle column shows active dealer pipeline entries not yet lost or active_dealer.",
      "Right column shows open opportunities not yet won or lost.",
      "Click 'View all' on any column to go to the full management page.",
      "Attribution links connect recs → dealer entries → opportunities.",
      "The amber summary strip shows total active items at a glance.",
      "Execution Packs panel at the bottom shows ready-to-use action plans.",
    ],
    connects_to: ["revenue-director", "dealer-crm", "opportunity-crm", "execution-packs"],
    frequency: "Daily — after Director review",
    common_actions: ["Check active item count", "Jump to specific CRM record", "Review execution packs", "Navigate to Director for approval"],
    collections: ["director_recommendations", "crm_dealers", "crm_opportunities"],
  },

  {
    id: "execution-packs",
    name: "Execution Packs",
    route: "/admin/growth/director",
    section: "revenue",
    purpose: "Auto-generated step-by-step action plans created when a Director recommendation is approved — one pack per approved rec.",
    when_to_use: "After approving a Director recommendation, scroll to the Execution Pack panel to see exactly what to do.",
    how_to_use: [
      "Approve a Director rec → pack is generated within 5–10 seconds.",
      "Each pack contains: target details, action steps, outreach templates, relevant data.",
      "Dealer recruitment packs include: dealer profile, suggested approach, GeM history, market share data.",
      "OEM displacement packs include: competitive analysis, entry strategy, contact targets.",
      "Landing page packs include: section structure, key messages, target keywords.",
      "Campaign packs include: ad copy, targeting, budget recommendation.",
      "Customer match packs include: segment definition and match strategy.",
    ],
    connects_to: ["revenue-director", "execution-hub", "dealer-crm"],
    frequency: "On-demand — after each Director approval",
    common_actions: ["View pack details", "Copy outreach template", "Navigate to CRM to log contact"],
    tips: [
      "Packs for 'procurement_target' rec type may show 'Pack not ready' — this is a known gap being fixed in v2.1.",
    ],
    collections: ["director_recommendations", "execution_packs"],
  },

  {
    id: "executive-dashboard",
    name: "Executive Dashboard",
    route: "/admin/growth/dashboard",
    section: "revenue",
    purpose: "High-level KPI overview: revenue pipeline health, marketing performance, and platform activity in one page.",
    when_to_use: "Weekly review or when you need a top-level health check of the business.",
    how_to_use: [
      "Revenue KPIs show pipeline value, weighted value, opportunities won this month.",
      "Marketing strip shows active campaigns, GSC impressions, and SEO pipeline.",
      "Automation health shows cron run status and last-run times.",
      "Each section links to the detailed management page for drill-down.",
    ],
    connects_to: ["operations-center", "reports"],
    frequency: "Weekly",
    common_actions: ["Review KPI trends", "Spot broken automations", "Check pipeline health"],
    collections: ["director_recommendations", "crm_opportunities", "automation_registry"],
  },

  {
    id: "reports",
    name: "Reporting Center",
    route: "/admin/growth/reports",
    section: "revenue",
    purpose: "Weekly AI-generated executive summaries covering revenue, marketing, and intelligence — delivered every Monday at 08:30 IST.",
    when_to_use: "Monday mornings after the weekly exec summary cron runs, or any time you want to review weekly progress.",
    how_to_use: [
      "Each report is a structured summary: top wins, pipeline movement, marketing performance.",
      "Reports are generated automatically — no manual input needed.",
      "Use reports for founder accountability and tracking week-over-week progress.",
      "Archive reports stay available indefinitely for trend review.",
    ],
    connects_to: ["executive-dashboard", "revenue-director"],
    frequency: "Weekly — Monday mornings",
    common_actions: ["Read weekly summary", "Compare week-over-week", "Share with stakeholders"],
    collections: ["weekly_exec_reports"],
  },

  // ── MARKETING ─────────────────────────────────────────────────────────────

  {
    id: "ads-workflow",
    name: "Ads Workflow",
    route: "/admin/growth/ads/workflow",
    section: "marketing",
    purpose: "6-stage campaign pipeline for managing Google Ads campaigns from brief through deployment and performance tracking.",
    when_to_use: "When creating, reviewing, or tracking a Google Ads campaign at any stage of its lifecycle.",
    how_to_use: [
      "Create a new campaign item with type (Search / PMax / Remarketing / Customer Match / Competitor Conquest / YouTube).",
      "Stage 1 — Draft: Write brief, set budget, define audience.",
      "Stage 2 — Review: Check targeting and copy against governance rules.",
      "Stage 3 — Approved: Campaign cleared for deployment.",
      "Stage 4 — Deployed: Live in Google Ads. Update stage manually after deployment.",
      "Stage 5 — Paused: Temporarily suspended.",
      "Stage 6 — Completed: Campaign ended. Log final results in the Results tab.",
      "Results tab auto-computes CPC, CPA, and CVR from actuals entered.",
      "IMPORTANT: No automatic deployment. All campaigns are manually deployed in Google Ads.",
    ],
    connects_to: ["ads-director", "creative-director", "opportunity-crm"],
    frequency: "Weekly or per campaign launch",
    common_actions: ["Create campaign brief", "Approve for deployment", "Log results", "Move to next stage"],
    tips: [
      "Mark stage as 'deployed' after you manually deploy in Google Ads — this keeps the pipeline accurate.",
      "Enter actual spend, impressions, and conversions in the Results tab to see CPC/CPA/CVR auto-calculated.",
    ],
    collections: ["ads_workflow_items"],
  },

  {
    id: "seo-workflow",
    name: "SEO Workflow",
    route: "/admin/growth/seo/workflow",
    section: "marketing",
    purpose: "7-stage editorial pipeline for managing SEO content from keyword research through publishing.",
    when_to_use: "When creating or tracking an SEO content piece — blog post, landing page copy, or product description.",
    how_to_use: [
      "Stage 1 — Keyword Research: Identify target keyword and search intent.",
      "Stage 2 — Outline: Structure headings and content sections.",
      "Stage 3 — Draft: Write content in the 'Draft Content' tab of the item modal.",
      "Stage 4 — Edit: Review for quality, keyword density, and accuracy.",
      "Stage 5 — SEO Review: Check meta title, description, and internal links.",
      "Stage 6 — Ready: Content cleared for publishing.",
      "Stage 7 — Published: Manually deploy to website and mark stage as published.",
      "Progress bar on each card shows how far through the pipeline the content is.",
      "IMPORTANT: No automatic publishing. All content is manually deployed.",
    ],
    connects_to: ["seo-setup", "content", "opportunity-crm"],
    frequency: "Weekly or per content piece",
    common_actions: ["Create content item", "Write draft", "Move to published", "Track progress"],
    tips: [
      "Target one primary keyword per content piece. Enter it in the Keyword field.",
      "Set a target URL before the content goes to SEO Review stage.",
    ],
    collections: ["seo_workflow_items"],
  },

  {
    id: "ads-director",
    name: "Ads Approvals",
    route: "/admin/growth/ads/director",
    section: "marketing",
    purpose: "AI-generated Google Ads recommendations waiting for founder approval before any spend is triggered.",
    when_to_use: "When the Google Ads Director cron runs (Monday 09:30 IST) and surfaces new campaign recommendations.",
    how_to_use: [
      "Review each recommendation: ad type, target keyword/audience, suggested budget.",
      "Approve to allow spend, reject to exclude from future recommendations.",
      "Approved recs link to the Ads Workflow for campaign execution tracking.",
      "No spend is ever triggered automatically — approval is required.",
    ],
    connects_to: ["ads-workflow", "creative-director"],
    frequency: "Weekly — Monday mornings",
    common_actions: ["Approve recommendations", "Reject with reason", "Review budget suggestions"],
    collections: ["ads_director_approvals"],
  },

  {
    id: "seo-setup",
    name: "Search Console",
    route: "/admin/growth/seo/setup",
    section: "marketing",
    purpose: "Google Search Console integration — syncs GSC data daily to power SEO keyword recommendations and performance tracking.",
    when_to_use: "When checking GSC connection status or reviewing raw keyword performance data.",
    how_to_use: [
      "OAuth connection to Google Search Console is authenticated.",
      "GSC data syncs daily at 10:30 IST.",
      "View top queries, impressions, clicks, and average position.",
      "Keyword data feeds into Revenue Director's SEO signal for recommendations.",
    ],
    connects_to: ["revenue-director", "seo-workflow"],
    frequency: "As needed — data syncs automatically",
    common_actions: ["Check sync status", "View top queries", "Verify OAuth connection"],
    collections: ["gsc_sync_data"],
  },

  {
    id: "landing-pages",
    name: "Landing Pages",
    route: "/admin/growth/landing-pages",
    section: "marketing",
    purpose: "CMS for creating and managing product landing pages with section-based builder.",
    when_to_use: "When creating a new landing page for a product variant, campaign, or segment.",
    how_to_use: [
      "Create a new page with a URL slug and headline.",
      "Add sections: hero, features, proof, CTA.",
      "Publish the page — it becomes live at /[slug].",
      "Use execution pack landing page templates as a starting point.",
    ],
    connects_to: ["execution-packs", "ads-workflow"],
    frequency: "Monthly or per campaign",
    common_actions: ["Create page", "Add sections", "Publish", "Edit copy"],
    collections: ["landing_pages"],
  },

  // ── INTELLIGENCE ──────────────────────────────────────────────────────────

  {
    id: "fogging-intelligence",
    name: "Fogging Intelligence",
    route: "/admin/growth/fogging",
    section: "intelligence",
    purpose: "Complete market intelligence for the thermal fogging machine category on GeM: 1,418 contracts, ₹75.08 Cr, 670 buying orgs, 679 sellers.",
    when_to_use: "When researching buyer organizations, competitor sellers, contract trends, or pricing benchmarks in the thermal fogging category.",
    how_to_use: [
      "Start from the Organization view — 670 buying orgs ranked by total spend.",
      "Click any org to see Contract 360: all contracts, sellers, pricing, and timeline.",
      "Use the Seller view to analyze competitor market share and win rates.",
      "Category search: filter by category ID, district, or date range.",
      "Contract list: detailed table with unit price, quantity, and seller for each contract.",
      "Use the search bar for natural language queries (requires ANTHROPIC_API_KEY).",
      "Voice search available on mobile for hands-free querying.",
    ],
    connects_to: ["revenue-director", "dealer-intelligence", "procurement-intel"],
    frequency: "Weekly or when researching a specific buyer/seller",
    common_actions: ["Find top buying orgs", "Check competitor market share", "Look up unit price benchmarks", "Research a specific district"],
    tips: [
      "Start with Org view, not Contract view — orgs show total opportunity at a glance.",
      "Bihar state shows higher variance in pricing — treat as directional, not exact.",
      "65% of contracts have unit prices — use category averages for the remaining 35%.",
    ],
    collections: ["fogging_contracts", "fogging_orgs", "fogging_sellers", "fogging_categories"],
  },

  {
    id: "dealer-intelligence",
    name: "Dealer Intelligence",
    route: "/admin/growth/dealers",
    section: "intelligence",
    purpose: "Ranked list of dealer acquisition targets generated from GeM seller analysis and market concentration data.",
    when_to_use: "When identifying which dealers to approach for recruitment or displacement.",
    how_to_use: [
      "View ranked dealer targets with scores and rationale.",
      "Each target shows: location, current market presence, opportunity size.",
      "Use 'Add to CRM' to move a target into the Dealer Pipeline.",
      "Filter by district or state for regional focus.",
    ],
    connects_to: ["fogging-intelligence", "dealer-crm", "revenue-director"],
    frequency: "Monthly or when starting a dealer recruitment push",
    common_actions: ["Find top dealer targets", "Move target to CRM pipeline", "Filter by region"],
    collections: ["dealer_targets"],
  },

  {
    id: "procurement-intel",
    name: "Procurement Intel",
    route: "/admin/growth/procurement",
    section: "intelligence",
    purpose: "GeM tender and contract intelligence: active tenders, buyer profiles, and bid opportunity scoring.",
    when_to_use: "When looking for active GeM procurement opportunities to bid on.",
    how_to_use: [
      "Active tenders view shows current open tenders with deadlines.",
      "Buyer profiles show past purchase history for each buying organization.",
      "Bid scoring shows estimated win probability based on past tender data.",
      "Backfill of 8.5M–9.5M contract IDs is ongoing — coverage improves weekly.",
    ],
    connects_to: ["fogging-intelligence", "revenue-director"],
    frequency: "Weekly — check for new active tenders",
    common_actions: ["Find active tenders", "Review buyer history", "Check bid deadline"],
    tips: [
      "Harvester fetches new bids daily at 06:30 IST. Check after that time for fresh data.",
    ],
    collections: ["gem_contracts", "procurement_bids", "buyer_profiles"],
  },

  // ── CRM ───────────────────────────────────────────────────────────────────

  {
    id: "dealer-crm",
    name: "Dealer Pipeline",
    route: "/admin/growth/crm/dealers",
    section: "crm",
    purpose: "7-stage CRM pipeline for managing dealer recruitment from initial lead to active dealer status.",
    when_to_use: "When tracking progress on a specific dealer — after first contact, after a meeting, after authorization.",
    how_to_use: [
      "Stage Lead: Identified target, not yet contacted.",
      "Stage Contacted: First outreach made, awaiting response.",
      "Stage Qualified: Dealer confirmed interest and meets criteria.",
      "Stage Discussion: Active negotiation or demo in progress.",
      "Stage Authorized: Agreement signed, onboarding in progress.",
      "Stage Active Dealer: Fully operational, placing orders.",
      "Stage Lost: Pursuit ended — log reason for future learning.",
      "Click a card to expand inline — update stage, notes, follow-up date.",
      "Each card links back to the Director recommendation that originated the lead.",
      "All changes require manual entry — no automatic CRM actions.",
    ],
    connects_to: ["revenue-director", "dealer-intelligence", "opportunity-crm"],
    frequency: "Daily — check follow-up dates and update stages",
    common_actions: ["Move dealer to next stage", "Log call notes", "Set follow-up date", "Add new dealer from intel"],
    tips: [
      "Set a follow-up date on every dealer in Contacted or Discussion stage.",
      "The Execution Hub shows dealers with overdue follow-ups.",
    ],
    collections: ["crm_dealers"],
  },

  {
    id: "opportunity-crm",
    name: "Opportunity Pipeline",
    route: "/admin/growth/crm/opportunities",
    section: "crm",
    purpose: "8-stage CRM for tracking revenue opportunities from identification through win/loss — with weighted pipeline value.",
    when_to_use: "When tracking a specific revenue opportunity: a GeM tender, a dealer opening, or a direct sale.",
    how_to_use: [
      "Stage Identified: Opportunity found, not yet approved for pursuit.",
      "Stage Approved: Cleared for active pursuit.",
      "Stage Research: Gathering information about the buyer/tender.",
      "Stage Meeting Scheduled: Demo or call arranged.",
      "Stage Quotation Submitted: Formal quote sent.",
      "Stage Bid Submitted: GeM bid or formal proposal submitted.",
      "Stage Won: Opportunity closed successfully.",
      "Stage Lost: Opportunity lost — log reason.",
      "Weighted Value = raw value × (probability %). Use this for pipeline forecasting.",
      "Set Probability % at each stage to keep weighted value accurate.",
      "Opportunity types: Dealer Recruitment / OEM Displacement / Procurement / Other.",
    ],
    connects_to: ["revenue-director", "dealer-crm", "execution-hub"],
    frequency: "Daily — update stages and probability as opportunities progress",
    common_actions: ["Update stage", "Log next action", "Adjust probability", "Mark won/lost"],
    tips: [
      "Pipeline Value (top KPI) shows total raw value. Weighted Value is more realistic.",
      "Set 'Next Action' field on every open opportunity so you know what to do next.",
    ],
    collections: ["crm_opportunities"],
  },

  // ── AUTOMATIONS ───────────────────────────────────────────────────────────

  {
    id: "operations-center",
    name: "Operations Center",
    route: "/admin/growth/operations",
    section: "automations",
    purpose: "Complete automation registry: all 17 automations with status, schedule, last run, next run, and health indicators.",
    when_to_use: "When checking if automations ran correctly, diagnosing a failed cron, or reviewing the automation schedule.",
    how_to_use: [
      "Green status = automation ran successfully.",
      "Red status = last run failed — check logs for the specific error.",
      "Each automation shows: trigger schedule, last run time, next run time, output.",
      "Click any automation to see its full run history.",
      "Manual trigger button available for on-demand runs.",
      "7 scheduled crons run automatically — Revenue Director, GSC Sync, Procurement Insights, Google Ads Director, Dealer Opportunity Engine, Machine Buyer Opportunities, Weekly Exec Summary.",
    ],
    connects_to: ["revenue-director", "reports", "executive-dashboard"],
    frequency: "Daily — check morning status after crons run",
    common_actions: ["Check cron health", "View last run output", "Trigger manual run", "Diagnose failure"],
    tips: [
      "Revenue Director runs at 07:00 IST — check Operations at 07:15 to confirm.",
      "If GSC Sync fails, SEO signal in Director will be stale — check the OAuth token.",
    ],
    collections: ["automation_registry", "automation_runs"],
  },

  // ── SYSTEM ────────────────────────────────────────────────────────────────

  {
    id: "platform-registry",
    name: "Platform Registry",
    route: "/admin/growth/platform-registry",
    section: "system",
    purpose: "Full inventory of all 52 capabilities and 53 collections in the Growth OS — the master map of the platform.",
    when_to_use: "When you want to know what exists in the platform, what's active vs hidden, and what each collection stores.",
    how_to_use: [
      "Capabilities tab: all 52 capabilities with status (active / hidden / orphaned / legacy / broken).",
      "Collections tab: all 53 MongoDB collections with descriptions.",
      "Filter by status to find broken or orphaned capabilities that need attention.",
      "Click any capability to see its route, API, and associated collections.",
    ],
    connects_to: ["operations-center"],
    frequency: "As needed — reference when exploring the platform",
    common_actions: ["Find a capability", "Check collection names", "Identify broken capabilities"],
    collections: [],
  },

  {
    id: "permissions",
    name: "Permissions",
    route: "/admin/growth/permissions",
    section: "system",
    purpose: "RBAC permission matrix: 8 roles, 36 permissions — controls what each user can see and do across Growth OS.",
    when_to_use: "When adding a new user, changing a user's role, or troubleshooting an 'access denied' error.",
    how_to_use: [
      "8 roles: superadmin, admin, growth_manager, analyst, marketing_manager, content_editor, viewer, dealer_manager.",
      "Each role has a specific set of the 36 permissions.",
      "Assign roles via the Users page, not here — this page shows the permission matrix.",
      "Founder role = superadmin (all permissions).",
    ],
    connects_to: ["user-management"],
    frequency: "Rarely — when onboarding team members",
    common_actions: ["Review permission matrix", "Identify which role grants a permission"],
    collections: ["user_sessions"],
  },

  {
    id: "fogging-ai-copilot",
    name: "AI Copilot (Fogging)",
    route: "/admin/growth/fogging",
    section: "intelligence",
    purpose: "Natural language query interface for Fogging Intelligence — ask questions in plain English and get data-backed answers.",
    when_to_use: "When you want to ask a specific question about fogging contract data without building a filter manually.",
    how_to_use: [
      "Type a question in the search bar: 'Who are the top buyers in Maharashtra?'",
      "Or use voice search on mobile.",
      "The AI interprets the question, queries the database, and returns a structured answer.",
      "Requires ANTHROPIC_API_KEY to be set in Vercel environment variables.",
    ],
    connects_to: ["fogging-intelligence"],
    frequency: "On-demand",
    common_actions: ["Ask natural language questions", "Get contract data summaries"],
    tips: ["If AI Copilot shows an error, check that ANTHROPIC_API_KEY is set in Vercel env vars."],
    collections: ["fogging_contracts", "fogging_orgs"],
  },
]

// ── Lookup helpers ─────────────────────────────────────────────────────────────

export function getDocByRoute(route: string): DocEntry | undefined {
  // exact match first
  let entry = DOC_REGISTRY.find(d => d.route === route)
  if (entry) return entry
  // prefix match (e.g. /admin/growth/fogging/contracts → fogging-intelligence)
  const sorted = [...DOC_REGISTRY].sort((a, b) => b.route.length - a.route.length)
  return sorted.find(d => route.startsWith(d.route))
}

export function getDocById(id: string): DocEntry | undefined {
  return DOC_REGISTRY.find(d => d.id === id)
}

export function getDocsBySection(section: DocEntry["section"]): DocEntry[] {
  return DOC_REGISTRY.filter(d => d.section === section)
}

export const DOC_SECTIONS: { id: DocEntry["section"]; label: string; description: string }[] = [
  { id: "revenue",       label: "Revenue",        description: "Director, Execution Hub, Reporting" },
  { id: "marketing",     label: "Marketing",      description: "Ads, SEO, Content, Landing Pages" },
  { id: "intelligence",  label: "Intelligence",   description: "Fogging, Dealers, Procurement" },
  { id: "crm",           label: "CRM",            description: "Dealer Pipeline, Opportunities" },
  { id: "automations",   label: "Automations",    description: "Operations Center, Cron Schedule" },
  { id: "system",        label: "System",         description: "Platform Registry, Permissions, Admin" },
]

// Flat context string for AI chat — injected into system prompt
export function buildDocContext(): string {
  return DOC_REGISTRY.map(d => [
    `## ${d.name} (${d.route})`,
    `Purpose: ${d.purpose}`,
    `When to use: ${d.when_to_use}`,
    `How to use:\n${d.how_to_use.map(b => `- ${b}`).join("\n")}`,
    d.tips ? `Tips:\n${d.tips.map(t => `- ${t}`).join("\n")}` : "",
    `Connects to: ${d.connects_to.join(", ")}`,
  ].filter(Boolean).join("\n")).join("\n\n")
}
