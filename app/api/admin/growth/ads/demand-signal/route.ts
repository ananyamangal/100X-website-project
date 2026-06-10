/**
 * Demand Signal Intelligence API — Phase 2A.5
 *
 * GET  — returns last 5 keyword intelligence runs with source contribution report
 * POST — runs the demand signal intelligence engine and returns a validation report
 *
 * The validation report shows keyword contribution by source and whether the system
 * meets the success criterion (Expansion Engine < 30% of selected keywords).
 */

import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import {
  runKeywordIntelligence,
  KEYWORD_INTELLIGENCE_COLL,
  type KeywordSource,
  type SourceContribution,
} from "@/lib/growth-os/ads-keyword-intelligence"

export const dynamic = "force-dynamic"

// ── GET — historical runs with source contribution ────────────────────────────

export async function GET() {
  try {
    const db = (await clientPromise).db()

    const runs = await db
      .collection(KEYWORD_INTELLIGENCE_COLL)
      .find(
        {},
        {
          sort:       { generatedAt: -1 },
          limit:      5,
          projection: {
            runId:                    1,
            funnel:                   1,
            generatedAt:              1,
            totalCount:               1,
            bySource:                 1,
            byIntent:                 1,
            sourceContribution:       1,
            expansionContributionPct: 1,
            meetsSuccessCriterion:    1,
            engineVersion:            1,
            // omit byTheme (verbose) — fetch individual run if needed
          },
        },
      )
      .toArray()

    const formatted = runs.map(({ _id, ...r }) => ({
      ...r,
      validationReport: buildValidationSummary(
        r.sourceContribution as SourceContribution[] | undefined,
        r.expansionContributionPct as number | undefined,
        r.meetsSuccessCriterion as boolean | undefined,
        r.totalCount as number | undefined,
      ),
    }))

    return NextResponse.json({
      runs: formatted,
      successCriterion: "Expansion Engine contribution < 30% of selected keywords",
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// ── POST — run engine + return validation report ───────────────────────────────

export async function POST() {
  try {
    const kwRun = await runKeywordIntelligence({ funnel: "A" })

    const allKws = [
      ...kwRun.byTheme.dealer,
      ...kwRun.byTheme.oem,
      ...kwRun.byTheme.gem,
    ]

    // Per-theme source breakdown
    const themeBreakdown = (["dealer", "oem", "gem"] as const).reduce(
      (acc, theme) => {
        const kws = kwRun.byTheme[theme]
        acc[theme] = {
          total: kws.length,
          bySource: kws.reduce((s, k) => {
            s[k.source] = (s[k.source] ?? 0) + 1
            return s
          }, {} as Partial<Record<KeywordSource, number>>),
          byMatchType: kws.reduce((s, k) => {
            s[k.matchType] = (s[k.matchType] ?? 0) + 1
            return s
          }, {} as Partial<Record<string, number>>),
          byLeadQuality: kws.reduce((s, k) => {
            s[k.expectedLeadQuality] = (s[k.expectedLeadQuality] ?? 0) + 1
            return s
          }, {} as Partial<Record<string, number>>),
        }
        return acc
      },
      {} as Record<string, {
        total: number
        bySource: Partial<Record<KeywordSource, number>>
        byMatchType: Partial<Record<string, number>>
        byLeadQuality: Partial<Record<string, number>>
      }>,
    )

    // Discovery method breakdown
    const discoveryMethods = allKws.reduce((acc, k) => {
      acc[k.discoveryMethod] = (acc[k.discoveryMethod] ?? 0) + 1
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      ok:       true,
      runId:    kwRun.runId,
      funnel:   kwRun.funnel,
      generatedAt: kwRun.generatedAt,
      engineVersion: kwRun.engineVersion,

      // Phase 2A.5 success criterion
      successCriterion: "Expansion Engine contribution < 30% of selected keywords",
      meetsSuccessCriterion:    kwRun.meetsSuccessCriterion,
      expansionContributionPct: kwRun.expansionContributionPct,

      // Source contribution validation report
      sourceContribution: kwRun.sourceContribution,

      // Keyword counts
      totalKeywords: kwRun.totalCount,
      byTheme: {
        dealer: kwRun.byTheme.dealer.length,
        oem:    kwRun.byTheme.oem.length,
        gem:    kwRun.byTheme.gem.length,
      },
      bySource:          kwRun.bySource,
      byIntent:          kwRun.byIntent,
      discoveryMethods,

      // Per-theme detail
      themeBreakdown,

      // Full keyword list (for inspection)
      keywords: allKws,

      validationReport: buildValidationSummary(
        kwRun.sourceContribution,
        kwRun.expansionContributionPct,
        kwRun.meetsSuccessCriterion,
        kwRun.totalCount,
      ),
    })
  } catch (err) {
    console.error("[demand-signal] error:", String(err))
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// ── Validation report builder ─────────────────────────────────────────────────

function buildValidationSummary(
  contribution:  SourceContribution[] | undefined,
  expansionPct:  number | undefined,
  meetsCriterion: boolean | undefined,
  total:         number | undefined,
): Record<string, unknown> {
  if (!contribution) return { status: "no_data" }

  const discovered = contribution
    .filter(s => s.source !== "expansion" && s.status === "active")
    .reduce((sum, s) => sum + s.count, 0)

  const discoveredPct = total && total > 0 ? Math.round((discovered / total) * 100) : 0

  return {
    status:           meetsCriterion ? "PASS" : "FAIL",
    message:          meetsCriterion
      ? `✓ Expansion Engine at ${expansionPct ?? 0}% — below 30% threshold. ${discoveredPct}% of keywords are market-discovered.`
      : `✗ Expansion Engine at ${expansionPct ?? 0}% — above 30% threshold. Connect more live data sources (GSC, Ads search terms, GeM) to improve signal quality.`,
    expansionPct:     expansionPct ?? 0,
    discoveredPct,
    sourceSummary:    contribution.map(s => ({
      source:  s.source,
      count:   s.count,
      pct:     s.pct,
      status:  s.status,
      note:    s.status === "pending_data"
        ? "Pending — data source not yet connected"
        : s.status === "no_data"
        ? "No matching data found in database"
        : `${s.count} keyword${s.count !== 1 ? "s" : ""} (${s.pct}%)`,
    })),
  }
}
