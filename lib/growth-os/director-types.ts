// Recommendation types — original 10 + 5 new campaign types
export type DirectorRecType =
  | "oem_displacement"           // Target org buying from competitor OEM
  | "dealer_recruit"             // Recruit dealer in state with no 100X presence
  | "procurement_target"         // Direct outreach to org that recently bid on competitor
  | "search_campaign"            // New search campaign to capture unserved demand
  | "landing_page_create"        // New LP needed before launching campaign
  | "creative_refresh"           // Ad creative underperforming vs impression share
  | "budget_reallocate"          // Shift budget from zero-ROAS to high-ROAS campaign
  | "negative_keyword"           // Stop bleeding spend on zero-conversion queries
  | "customer_match"             // Build Customer Match audience from procurement orgs
  | "content_create"             // SEO content gap — high-impression, zero-content
  // v1.1 Campaign types (Part 3)
  | "remarketing_campaign"       // Retarget site visitors showing fogging intent
  | "youtube_campaign"           // Video brand awareness for fogging market
  | "performance_max_campaign"   // Full-funnel Performance Max across all channels
  | "customer_match_campaign"    // Customer Match upload from audience intelligence
  | "competitor_conquest_campaign" // Conquest campaign on competitor brand terms

export type DirectorPriority = "critical" | "high" | "medium" | "low"

// v1.1: extended lifecycle (original 5 preserved for backward compat)
export type DirectorStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "deferred"
  | "applied"       // legacy — equivalent to in_progress
  | "in_progress"   // execution underway
  | "completed"     // execution done, outcome TBD
  | "won"           // resulted in revenue
  | "lost"          // did not convert

export type DirectorSource = "ads" | "fogging" | "gsc" | "ga4" | "procurement"

// ─── Core recommendation ──────────────────────────────────────────────────────

export interface DirectorRec {
  _id?: string
  run_date: string               // YYYY-MM-DD
  type: DirectorRecType
  priority: DirectorPriority
  title: string                  // 5-8 word action title
  why_now: string                // one sentence — the specific trigger today
  evidence: string               // what data triggered this (formatted for human reading)
  expected_action: string        // what to do in the next 24h
  expected_revenue_impact: number // INR
  confidence: number             // 0-100
  effort: "5_min" | "30_min" | "1_hour" | "half_day" | "project"
  sources: DirectorSource[]
  payload: Record<string, unknown>
  status: DirectorStatus
  generated_at: string
  expires_at: string
  // Original review fields
  reviewed_at?: string
  rejection_reason?: string
  applied_at?: string
  // v1.1 lifecycle fields
  owner?: string
  target_completion_date?: string
  in_progress_at?: string
  completed_at?: string
  won_at?: string
  lost_at?: string
  realized_impact?: number
  outcome_notes?: string
  // v1.1 help system (Part 6)
  help_what?: string             // What is this recommendation?
  help_why?: string              // Why was it generated?
  help_if_approved?: string      // What happens if approved?
  help_if_ignored?: string       // What happens if ignored?
  // v1.1 execution pack reference
  execution_pack_id?: string
}

// ─── Daily run record ─────────────────────────────────────────────────────────

export interface DirectorDailyRun {
  _id?: string
  date: string                   // YYYY-MM-DD — unique per day
  status: "running" | "completed" | "failed"
  started_at: string
  completed_at?: string
  duration_ms?: number
  rec_count: number
  critical_count: number
  high_count: number
  sources_connected: DirectorSource[]
  sources_missing: DirectorSource[]
  email_sent: boolean
  error?: string
}

// ─── Outcome tracking ─────────────────────────────────────────────────────────

export interface DirectorOutcome {
  _id?: string
  rec_id: string
  run_date: string
  rec_type: DirectorRecType
  title: string
  decision: "approved" | "rejected" | "deferred" | "in_progress" | "completed" | "won" | "lost"
  decided_at: string
  expected_revenue: number
  actual_revenue?: number
  outcome_notes?: string
  closed_at?: string
}

// ─── Execution packs (Part 2) ─────────────────────────────────────────────────

export interface DealerRecruitmentPack {
  type: "dealer_recruitment"
  target_state: string
  market_gmv: number
  market_contracts: number
  org_count: number
  top_organizations: Array<{
    name: string
    state: string
    gmv: number
    incumbent_oem: string
    dept_category: string
  }>
  market_evidence: string
  outreach_email_draft: string
  whatsapp_draft: string
  call_script: string
  meeting_agenda: string
  // v2.3 execution layer
  outreach_schedule?: {
    day_1: { whatsapp: string; email: string; note: string }
    day_3: { call_script: string; note: string }
    day_7: { follow_up_whatsapp: string; note: string }
    day_14: { final_whatsapp: string; note: string }
  }
  whatsapp_sequence?: {
    first_message: string
    follow_up: string
    reminder: string
    meeting_confirmation: string
  }
}

export interface OEMDisplacementPack {
  type: "oem_displacement"
  organization_name: string
  organization_state: string
  incumbent_oem: string
  incumbent_gmv: number
  total_gmv: number
  market_evidence: string
  outreach_email_draft: string
  whatsapp_draft: string
  call_script: string
  meeting_agenda: string
  // v2.3 execution layer
  whatsapp_sequence?: {
    first_message: string
    follow_up: string
    reminder: string
    meeting_confirmation: string
  }
}

export interface LandingPagePack {
  type: "landing_page"
  keyword: string
  search_demand: { impressions: number; position: number; ctr_pct: number; clicks: number }
  recommended_structure: string[]
  seo_brief: string
  content_outline: string
  cta_recommendation: string
  meta_title: string
  meta_description: string
}

export interface CampaignPack {
  type: "campaign"
  campaign_type: DirectorRecType
  campaign_label: string
  target_audience: string
  audience_description: string
  keywords: string[]
  budget_recommendation_inr: number
  expected_reach: number
  expected_ctr_pct: number
  ad_copy_drafts: Array<{ headline: string; description: string; display_url: string }>
  creative_brief: string
  targeting_notes: string
  // v2.3 deployment package
  campaign_name?: string
  campaign_objective?: string
  ad_groups?: Array<{
    name: string
    match_type: string
    keywords: string[]
    headlines: string[]
    descriptions: string[]
  }>
  negative_keywords?: string[]
}

export interface CustomerMatchPack {
  type: "customer_match"
  audience_name: string
  estimated_size: number
  audience_segments: Array<{
    segment_name: string
    count: number
    gmv: number
    description: string
  }>
  upload_format: string
  upload_instructions: string
  campaign_brief: string
  expected_reach: number
}

export type ExecutionPack =
  | DealerRecruitmentPack
  | OEMDisplacementPack
  | LandingPagePack
  | CampaignPack
  | CustomerMatchPack

export interface DirectorExecutionPack {
  _id?: string
  rec_id: string
  rec_type: DirectorRecType
  rec_title: string
  generated_at: string
  pack: ExecutionPack
}

// ─── Measurement (Part 7) ─────────────────────────────────────────────────────

export interface DirectorMeasurement {
  total_generated: number
  total_approved: number          // approved + in_progress + completed + won + lost
  total_in_progress: number
  total_completed: number         // completed + won + lost
  total_won: number
  total_lost: number
  total_rejected: number
  total_deferred: number
  approval_rate_pct: number
  completion_rate_pct: number
  win_rate_pct: number            // won / (won + lost)
  estimated_impact_total: number  // sum of expected_revenue_impact for approved recs
  realized_impact_total: number   // sum of realized_impact for won recs
  impact_realization_rate_pct: number
  packs_generated: number
}
