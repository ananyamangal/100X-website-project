// ── Campaign / Negative keyword shared types ──────────────────────────────────
// Single definition consumed by campaign-factory-v2 (server) and UI pages (client).

export interface NegativeDraftV2 {
  text:       string
  matchType:  "EXACT" | "PHRASE"
  reason:     string
  confidence: number
  category:   string
}

// ── Growth OS primitives ───────────────────────────────────────────────────────
export type LogLevel = "info" | "warning" | "error" | "success"
export type RiskLevel = "low" | "medium" | "high"
export type Status = "active" | "paused" | "disabled" | "pending"
export type ApprovalStatus = "pending" | "approved" | "rejected" | "deferred"

export interface GrowthLog {
  _id?: string
  ts: string
  agent: string
  action: string
  reason: string
  expectedImpact: string
  actualImpact?: string
  level: LogLevel
  before?: string
  after?: string
  rollbackData?: string
  module: string
}

export interface Opportunity {
  _id?: string
  title: string
  description: string
  module: string
  source: "manual" | "agent" | "competitor" | "keyword" | "gem"
  businessValue: "low" | "medium" | "high" | "critical"
  seoValue: "low" | "medium" | "high"
  geoValue: "low" | "medium" | "high"
  dealerImpact: "low" | "medium" | "high"
  effort: "low" | "medium" | "high"
  status: ApprovalStatus
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface ContentDraft {
  _id?: string
  title: string
  targetIntent: string
  opportunitySource: string
  confidenceScore: number
  expectedImpact: string
  slug?: string
  content?: string
  status: "draft" | "approved" | "published" | "rejected"
  riskLevel: RiskLevel
  targetUrl?: string
  createdAt: string
  updatedAt: string
}

export interface Automation {
  _id?: string
  id: string
  name: string
  description: string
  module: string
  riskLevel: RiskLevel
  status: Status
  schedule: string
  lastRun?: string
  nextRun?: string
  successRate?: number
  runCount: number
  lastResult?: string
  config?: Record<string, string>
  createdAt: string
  updatedAt: string
}

export interface DashboardStats {
  leads: {
    today: number
    week: number
    month: number
    total: number
  }
  byType: {
    rfq: number
    gem: number
    contact: number
    brochure: number
    wa: number
    tender: number
  }
  trend: Array<{ date: string; count: number }>
  recentLeads: Array<{
    _id: string
    source: string
    name: string
    phone: string
    email: string
    product: string
    createdAt: string
  }>
  automations: {
    active: number
    paused: number
    total: number
  }
  logs: {
    today: number
    total: number
  }
  opportunities: {
    pending: number
    total: number
  }
  content: {
    drafts: number
    published: number
  }
}
