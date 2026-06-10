/**
 * Google Ads Director — Phase 1 configuration (read-only intelligence).
 * Config-driven thresholds so recommendation logic is tunable without code changes.
 * GOVERNANCE: generates recommendations ONLY. Never changes spend, bids, budgets,
 * keywords, or campaign state. Every recommendation requires human approval.
 */
export const ADS_DIRECTOR_VERSION = "v1.0.0"

export const ADS_DIRECTOR_CONFIG = {
  // Search terms burning clicks with no conversion → negative keyword candidates
  negativeKeyword: { minClicks: 8, maxConversions: 0 },
  // Search terms that converted but may not be a dedicated keyword yet
  newKeyword: { minConversions: 1, minClicks: 3 },
  // Keywords with high CPC and nothing to show for it
  highCpc: { cpcPercentile: 0.75, maxConversions: 0, minClicks: 5 },
  // Keywords with poor CTR despite real impressions → ad relevance issue
  lowCtr: { maxCtrPct: 1.0, minImpressions: 100 },
  // Website enquiry proxy window (V1 ROAS: spend → clicks → calls → WhatsApp → RFQ)
  enquiryWindowDays: 30,
}

export type AdsConfidence = "high" | "medium" | "low"
export type AdsRecType = "negative_keyword" | "new_keyword" | "high_cpc" | "low_ctr"
