/**
 * SEO Page Risk Scoring Engine — v2.5.1
 * Used by: risk-score API route + execute route (server-side enforcement)
 */

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"

export interface PageRiskProfile {
  path: string
  risk_level: RiskLevel
  risk_score: number          // 0–100
  clicks_28d: number
  impressions_28d: number
  avg_position: number
  ranking_keywords: number
  top10_keywords: number
  backlink_count: number       // 0 if unknown (no external API wired)
  referring_domains: number    // 0 if unknown
  revenue_attribution_30d: number  // estimated ₹ / month at current traffic
  requires_founder_approval: boolean
  requires_admin_approval: boolean
  warnings: string[]
  scored_at: string
}

// Pages that always get at least HIGH risk regardless of traffic
const PROTECTED_PATHS = new Set(["/", "/contact-us", "/contact", "/products", "/products/"])

const REVENUE_PER_CLICK = 150

export function scorePageRisk(data: {
  path: string
  clicks_28d: number
  impressions_28d: number
  avg_position: number
  ranking_keywords: number
  top10_keywords: number
  backlink_count: number
  referring_domains: number
}): PageRiskProfile {
  const { path, clicks_28d, impressions_28d, avg_position, ranking_keywords, top10_keywords, backlink_count, referring_domains } = data

  let score = 0
  const warnings: string[] = []

  // ── Traffic risk (0-40 pts) ──────────────────────────────────────────────────
  if (clicks_28d > 500) { score += 40; warnings.push(`Very high traffic: ${clicks_28d} clicks/28d`) }
  else if (clicks_28d > 150) { score += 28; warnings.push(`High traffic: ${clicks_28d} clicks/28d`) }
  else if (clicks_28d > 40) { score += 18 }
  else if (clicks_28d > 10) { score += 8 }

  // ── Ranking risk (0-25 pts) ──────────────────────────────────────────────────
  if (top10_keywords >= 5) { score += 25; warnings.push(`${top10_keywords} keywords in top 10`) }
  else if (top10_keywords >= 2) { score += 18; warnings.push(`${top10_keywords} top-10 keywords`) }
  else if (top10_keywords >= 1) { score += 10; warnings.push(`${top10_keywords} top-10 keyword`) }
  if (ranking_keywords > 20) score += 5

  // ── Backlink risk (0-20 pts) ──────────────────────────────────────────────────
  if (backlink_count > 10) { score += 20; warnings.push(`${backlink_count} backlinks pointing to this page`) }
  else if (backlink_count > 2) { score += 14; warnings.push(`${backlink_count} backlinks`) }
  else if (backlink_count > 0) { score += 8; warnings.push(`${backlink_count} backlink(s)`) }

  // ── Referring domains risk (0-15 pts) ─────────────────────────────────────────
  if (referring_domains > 5) { score += 15; warnings.push(`${referring_domains} referring domains`) }
  else if (referring_domains > 0) { score += 8; warnings.push(`${referring_domains} referring domain(s)`) }

  // ── Protected page override ───────────────────────────────────────────────────
  if (PROTECTED_PATHS.has(path) || path === "") {
    score = Math.max(score, 75)
    warnings.unshift("Protected page — Founder approval required for any SEO changes")
  }

  score = Math.min(score, 100)

  const risk_level: RiskLevel = score >= 75 ? "CRITICAL" : score >= 50 ? "HIGH" : score >= 25 ? "MEDIUM" : "LOW"
  const revenue_attribution_30d = Math.round((clicks_28d / 28) * 30 * REVENUE_PER_CLICK)

  return {
    path,
    risk_level,
    risk_score: score,
    clicks_28d,
    impressions_28d,
    avg_position,
    ranking_keywords,
    top10_keywords,
    backlink_count,
    referring_domains,
    revenue_attribution_30d,
    requires_founder_approval: risk_level === "HIGH" || risk_level === "CRITICAL",
    requires_admin_approval: risk_level === "MEDIUM",
    warnings,
    scored_at: new Date().toISOString(),
  }
}

export function getRiskColor(level: RiskLevel): string {
  return level === "CRITICAL" ? "text-red-700 bg-red-100 border-red-300"
    : level === "HIGH"     ? "text-orange-700 bg-orange-100 border-orange-300"
    : level === "MEDIUM"   ? "text-amber-700 bg-amber-100 border-amber-300"
    :                        "text-green-700 bg-green-100 border-green-300"
}
