import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { runCreativeDirector } from "@/lib/growth-os/agents/creative-director"
import type { CampaignObjective, AudienceType } from "@/lib/growth-os/agents/creative-director"

// ── Preset validation campaigns ────────────────────────────────────────────────

const VALIDATION_CAMPAIGNS = [
  {
    id:        "dealer",
    label:     "Dealer Acquisition",
    theme:     "dealer",
    product:   "Thermal Fogging Machine Dealer Program",
    objective: "dealer_acquisition" as CampaignObjective,
    audience:  "dealers" as AudienceType,
    keywords:  ["fogging machine dealer", "thermal fogger distributor", "100x circle dealer", "fogging machine franchise"],
    notes:     "Focus on territorial exclusivity, ₹5L–15L monthly revenue potential, training support",
  },
  {
    id:        "oem",
    label:     "OEM Authorization",
    theme:     "oem",
    product:   "Government OEM Authorized Thermal Fogger",
    objective: "oem_authorization" as CampaignObjective,
    audience:  "government_buyers" as AudienceType,
    keywords:  ["oem authorized fogger", "gem thermal fogger", "government fogging machine", "bis certified fogger"],
    notes:     "GeM OEM registration, IS 14855:2019, NVBDCP/NHM procurement",
  },
  {
    id:        "gem",
    label:     "GeM Tender",
    theme:     "gem",
    product:   "GeM Listed Thermal Fogging Machine",
    objective: "gem_tender" as CampaignObjective,
    audience:  "government_buyers" as AudienceType,
    keywords:  ["gem fogging machine", "thermal fogger gem tender", "government fogging equipment", "nhm fogger procurement"],
    notes:     "Municipal corporations, NHM, MSME seller preference, L1 tender strategy",
  },
]

// ── Quick scoring for existing RSA assets (no import needed) ─────────────────

const AUTHORITY_WORDS = ["certified", "authorized", "bis", "oem", "msme", "registered", "official", "licensed"]
const URGENCY_WORDS   = ["now", "today", "limited", "season", "deadline", "pre-monsoon", "fast", "urgent"]
const TRUST_WORDS     = ["trusted", "years", "states", "india", "machines", "deployed", "proven"]
const GOVT_WORDS      = ["gem", "tender", "nvbdcp", "nhm", "municipal", "government", "procurement"]
const DEALER_WORDS    = ["dealer", "distributor", "territory", "franchise", "resell"]
const CTA_WORDS       = ["call", "get", "apply", "contact", "enquire", "request", "buy"]
const NUMBER_RE       = /[\d₹%+]/

function quickScoreHeadline(text: string, keywords: string[]): number {
  const t  = text.toLowerCase()
  const kw = keywords.map(k => k.toLowerCase())
  let score = 5
  score += Math.min(kw.filter(k => t.includes(k)).length * 1.5, 3)
  score += Math.min(AUTHORITY_WORDS.filter(w => t.includes(w)).length * 0.8, 2)
  score += Math.min(URGENCY_WORDS.filter(w => t.includes(w)).length * 0.7, 1.5)
  score += Math.min(TRUST_WORDS.filter(w => t.includes(w)).length * 0.5, 1)
  score += Math.min(GOVT_WORDS.filter(w => t.includes(w)).length * 0.8, 1.5)
  score += Math.min(DEALER_WORDS.filter(w => t.includes(w)).length * 0.8, 1.5)
  score += Math.min(CTA_WORDS.filter(w => t.includes(w)).length * 0.4, 1)
  if (NUMBER_RE.test(text)) score += 0.5
  if (text.includes("?")) score += 0.3
  const len = text.trim().length
  if (len >= 20 && len <= 30) score += 0.5
  else if (len < 12) score -= 2
  return Math.min(10, Math.max(0, Math.round(score * 10) / 10))
}

function computeExistingCQS(headlines: string[], keywords: string[]): number {
  if (!headlines.length) return 0
  const scored = headlines.map(h => quickScoreHeadline(h, keywords))
  const top    = scored.sort((a, b) => b - a).slice(0, 10)
  const avg    = top.reduce((s, v) => s + v, 0) / top.length
  const withinLimit = headlines.filter(h => h.length <= 30).length / headlines.length
  return Math.round(Math.min(10, (avg * 0.60 + withinLimit * 10 * 0.40)) * 10) / 10
}

function makeDecision(existingCQS: number, newCQS: number): {
  verdict: "REPLACE" | "HYBRID" | "KEEP"
  reason:  string
} {
  const delta = newCQS - existingCQS
  if (delta >= 1.0) return {
    verdict: "REPLACE",
    reason:  `Creative Director scores ${delta.toFixed(1)} pts higher (+${Math.round(delta / existingCQS * 100)}%). Full replacement recommended.`,
  }
  if (delta >= 0) return {
    verdict: "HYBRID",
    reason:  `Comparable quality (delta ${delta >= 0 ? "+" : ""}${delta.toFixed(1)} pts). Use Creative Director for A/B testing against top existing headlines.`,
  }
  return {
    verdict: "KEEP",
    reason:  `Existing assets score ${Math.abs(delta).toFixed(1)} pts higher. Run Creative Director again with broader keywords before replacing.`,
  }
}

// ── GET: return latest validation report ─────────────────────────────────────

export async function GET() {
  const db      = (await clientPromise).db()
  const reports = await db.collection("cd_validation_reports")
    .find({})
    .sort({ createdAt: -1 })
    .limit(3)
    .toArray()
  return NextResponse.json(JSON.parse(JSON.stringify(reports)))
}

// ── POST ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    action?:    string
    campaignId?: string  // run single: "dealer" | "oem" | "gem"
    model?:     "haiku" | "sonnet" | "opus"
  }

  const db = (await clientPromise).db()

  if (body.action === "run_validation" || !body.action) {
    const toRun = body.campaignId
      ? VALIDATION_CAMPAIGNS.filter(c => c.id === body.campaignId)
      : VALIDATION_CAMPAIGNS

    const results = []

    for (const campaign of toRun) {
      // Pull most recent plan with this theme from ads_campaign_plans
      const existingPlan = await db.collection("ads_campaign_plans")
        .findOne(
          { "adGroups.theme": campaign.theme, status: { $in: ["approved", "deployed", "pending_approval"] } },
          { sort: { createdAt: -1 } },
        )

      const existingHeadlines: string[] = []
      const existingDescriptions: string[] = []

      if (existingPlan?.adGroups) {
        for (const ag of existingPlan.adGroups) {
          if (ag.theme === campaign.theme && ag.rsa) {
            existingHeadlines.push(...(ag.rsa.headlines ?? []))
            existingDescriptions.push(...(ag.rsa.descriptions ?? []))
          }
        }
      }

      const existingCQS = computeExistingCQS(existingHeadlines, campaign.keywords)

      // Run Creative Director
      let cdRun = null
      let cdError = ""
      try {
        cdRun = await runCreativeDirector({
          product:        campaign.product,
          landingPage:    "",
          objective:      campaign.objective,
          audience:       campaign.audience,
          keywordCluster: campaign.keywords,
          notes:          campaign.notes,
          model:          body.model ?? "sonnet",
        })
      } catch (e) {
        cdError = e instanceof Error ? e.message : "Generation failed"
      }

      const newCQS = cdRun?.creativeQualityScore ?? 0
      const decision = cdRun ? makeDecision(existingCQS, newCQS) : null

      results.push({
        campaignId:           campaign.id,
        campaignLabel:        campaign.label,
        objective:            campaign.objective,
        audience:             campaign.audience,
        existingAssets: {
          headlines:           existingHeadlines,
          descriptions:        existingDescriptions,
          cqs:                 existingCQS,
          source:              existingPlan ? "ads_campaign_plans" : "none",
          planId:              existingPlan?.planId ?? null,
          planStatus:          existingPlan?.status ?? null,
        },
        newAssets: cdRun ? {
          runId:               cdRun.runId,
          topHeadlines:        cdRun.topHeadlines.slice(0, 10).map(h => ({ text: h.text, composite: h.scores.composite, withinLimit: h.withinLimit })),
          topDescriptions:     cdRun.topDescriptions.map(d => ({ text: d.text, composite: d.scores.composite })),
          cqs:                 cdRun.creativeQualityScore,
          frameworkCoverage:   Object.keys(cdRun.frameworkCounts).filter(k => cdRun!.frameworkCounts[k as keyof typeof cdRun.frameworkCounts] > 0).length,
          cost:                cdRun.cost,
        } : null,
        cdError,
        decision,
      })
    }

    const report = {
      reportId:  `cdv_${Date.now()}`,
      createdAt: new Date().toISOString(),
      model:     body.model ?? "sonnet",
      results,
    }

    await db.collection("cd_validation_reports").insertOne({ ...report })

    return NextResponse.json({ ok: true, report: JSON.parse(JSON.stringify(report)) })
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}
