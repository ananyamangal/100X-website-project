/**
 * Keyword Pipeline Audit API.
 *
 * GET /api/admin/growth/ads/keyword-pipeline
 *
 * Returns a Keyword Pipeline Audit table for the Media Buyer Review dashboard.
 * Shows the full funnel: Generated → Validator Rejected → Eligible → Deployed.
 *
 * Response shape:
 * {
 *   summary: { source, generated, validatorRejected, eligible, deployed }[]
 *   validatorRejections: { text, source, reason, category }[]
 *   eligibleKeywords: { text, source, theme, matchType, effectiveScore }[]
 *   viabilityReport: CampaignViabilityReport | null
 *   lastRunAt: string | null
 * }
 *
 * POST /api/admin/growth/ads/keyword-pipeline
 *   Triggers a fresh keyword intelligence run + viability check.
 *   Body: { funnel?: "A" | "B" }
 */

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import clientPromise from "@/lib/mongodb"
import { runKeywordIntelligence } from "@/lib/growth-os/ads-keyword-intelligence"
import { checkCampaignViability } from "@/lib/growth-os/campaign-viability-checker"
import { validateKeywords } from "@/lib/growth-os/ads-keyword-validator"

export const dynamic     = "force-dynamic"
export const maxDuration = 90

// ── GET: read latest run from DB ──────────────────────────────────────────────

export async function GET() {
  try {
    const db = (await clientPromise).db()

    const latest = await db
      .collection("ads_keyword_intelligence")
      .findOne({}, { sort: { generatedAt: -1 } })

    if (!latest) {
      return NextResponse.json({
        summary:             [],
        validatorRejections: [],
        eligibleKeywords:    [],
        viabilityReport:     null,
        lastRunAt:           null,
        message:             "No keyword intelligence run found. POST to /keyword-pipeline to generate.",
      })
    }

    // Build source summary table (Source | Generated | Validator Rejected | Eligible | Deployed)
    const allSources = [
      "ads_search_terms", "rfq_conversion", "whatsapp_conversion", "phone_conversion",
      "dealer_conversion", "oem_conversion", "gsc", "ai_search",
      "gem_demand", "competitor", "indiamart", "expansion",
    ]

    const eligible: Array<{ text: string; source: string; theme: string; matchType: string }> =
      (Object.values(latest.byTheme ?? {}) as unknown[][])
        .flat()
        .map((k) => {
          const kw = k as Record<string, unknown>
          return {
            text:      String(kw.text ?? ""),
            source:    String(kw.source ?? ""),
            theme:     String(kw.adGroupTheme ?? ""),
            matchType: String(kw.matchType ?? ""),
          }
        })

    const eligibleBySrc = eligible.reduce((acc, k) => {
      acc[k.source] = (acc[k.source] ?? 0) + 1
      return acc
    }, {} as Record<string, number>)

    const validatorRejectionsBySrc = ((latest.validatorRejections ?? []) as Array<{ source: string }>)
      .reduce((acc, r) => {
        acc[r.source] = (acc[r.source] ?? 0) + 1
        return acc
      }, {} as Record<string, number>)

    const summary = allSources.map(src => {
      const elig   = eligibleBySrc[src]             ?? 0
      const rej    = validatorRejectionsBySrc[src]  ?? 0
      const gen    = elig + rej
      return {
        source:            src,
        generated:         gen,
        validatorRejected: rej,
        eligible:          elig,
        deployed:          0,  // will be non-zero once campaigns are active and we track deployments
      }
    }).filter(r => r.generated > 0 || r.source === "ads_search_terms" || r.source === "gsc")

    const topValidatorRejections = ((latest.validatorRejections ?? []) as Array<{
      text: string; source: string; reason: string
    }>).slice(0, 50)

    return NextResponse.json({
      summary,
      validatorRejections: topValidatorRejections,
      eligibleKeywords:    eligible,
      eligibleCount:       eligible.length,
      rawCount:            latest.rawCount ?? 0,
      validatorRejectionCount: latest.validatorRejectionCount ?? 0,
      expansionContributionPct: latest.expansionContributionPct ?? 0,
      meetsSuccessCriterion:    latest.meetsSuccessCriterion ?? false,
      lastRunAt: latest.generatedAt ?? null,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// ── POST: fresh run ───────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json().catch(() => ({}))
    const funnel = (body as { funnel?: string }).funnel === "B" ? "B" : "A"
    const db     = (await clientPromise).db()

    // 1. Run keyword intelligence (includes validator inside)
    const kwRun = await runKeywordIntelligence({ funnel: funnel as "A" | "B" })

    // 2. Flatten selected keywords for viability check
    const flat = [
      ...(kwRun.byTheme.dealer      ?? []),
      ...(kwRun.byTheme.oem         ?? []),
      ...(kwRun.byTheme.gem         ?? []),
      ...(kwRun.byTheme.direct_buyer ?? []),
    ]

    // 3. Validate the selected set (second pass for viability — validator already ran inside kwRun)
    const validationResult = validateKeywords(flat.map(k => k.text))

    // 4. Run viability check
    const viabilityReport = await checkCampaignViability(db, {
      campaignName: `Funnel ${funnel} — Viability Check — ${new Date().toLocaleDateString("en-IN")}`,
      funnel:       funnel as "A" | "B",
      keywords:     flat.map(k => ({
        text:     k.text,
        intent:   k.intent,
        eligible: validationResult.eligible.some(v => v.text === k.text),
      })),
      dailyBudgetINR: funnel === "B" ? 300 : 150,
    })

    return NextResponse.json({
      ok:          true,
      kwRunId:     kwRun.runId,
      rawCount:    kwRun.rawCount,
      totalCount:  kwRun.totalCount,
      validatorRejectionCount: kwRun.validatorRejectionCount,
      expansionContributionPct: kwRun.expansionContributionPct,
      meetsSuccessCriterion:    kwRun.meetsSuccessCriterion,
      viabilityReport: {
        viabilityTier:       viabilityReport.viabilityTier,
        viabilityScore:      viabilityReport.viabilityScore,
        recommendActivation: viabilityReport.recommendActivation,
        issues:              viabilityReport.issues,
        recommendations:     viabilityReport.recommendations,
        deploymentEligible:  viabilityReport.deploymentEligible,
        avgCPCRange:         viabilityReport.avgCPCRange,
        estimatedMonthlyClicks: viabilityReport.estimatedMonthlyClicks,
        estimatedMonthlySpend:  viabilityReport.estimatedMonthlySpend,
        lowViabilityReason:     viabilityReport.lowViabilityReason,
      },
      validatorRejections: kwRun.validatorRejections.slice(0, 20),
    })
  } catch (err) {
    console.error("[keyword-pipeline] error:", String(err))
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
