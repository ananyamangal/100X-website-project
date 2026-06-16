export type DirectorRecType =
  | "oem_displacement"     // Target org buying from competitor OEM
  | "dealer_recruit"       // Recruit dealer in state with no 100X presence
  | "procurement_target"   // Direct outreach to org that recently bid on competitor
  | "search_campaign"      // New search campaign to capture unserved demand
  | "landing_page_create"  // New LP needed before launching campaign
  | "creative_refresh"     // Ad creative underperforming vs impression share
  | "budget_reallocate"    // Shift budget from zero-ROAS to high-ROAS campaign
  | "negative_keyword"     // Stop bleeding spend on zero-conversion queries
  | "customer_match"       // Build Customer Match audience from procurement orgs
  | "content_create"       // SEO content gap — high-impression, zero-content

export type DirectorPriority = "critical" | "high" | "medium" | "low"
export type DirectorStatus = "pending" | "approved" | "rejected" | "deferred" | "applied"
export type DirectorSource = "ads" | "fogging" | "gsc" | "ga4" | "procurement"

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
  reviewed_at?: string
  rejection_reason?: string
  applied_at?: string
}

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

export interface DirectorOutcome {
  _id?: string
  rec_id: string
  run_date: string
  rec_type: DirectorRecType
  title: string
  decision: "approved" | "rejected" | "deferred"
  decided_at: string
  expected_revenue: number
  actual_revenue?: number
  outcome_notes?: string
  closed_at?: string
}
