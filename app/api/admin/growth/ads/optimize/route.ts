/**
 * Optimization Loop Trigger.
 *
 * POST /api/admin/growth/ads/optimize
 *
 * Runs the full daily optimization cycle:
 *   1. Expire stale queue items
 *   2. Conversion Intelligence (winner/loser keywords, landing page analysis)
 *   3. Auto-Negative Engine (detect irrelevant queries)
 *   4. Budget Allocation Engine (detect waste and scaling opportunities)
 *
 * All outputs go to the Recommendation Queue as "pending" items.
 * Nothing is applied automatically.
 *
 * Idempotent: safe to call multiple times per day, but useful only when
 * new lead data or search term data has been added to MongoDB.
 */

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { runOptimizationLoop } from "@/lib/growth-os/optimization-loop"

export const dynamic = "force-dynamic"
export const maxDuration = 60  // seconds — optimization loop may take up to 60s

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const triggeredBy = String((body as { triggeredBy?: string }).triggeredBy ?? "api-manual")

    const run = await runOptimizationLoop({ triggeredBy })

    const allSucceeded =
      run.steps.conversionIntelligence.success &&
      run.steps.autoNegative.success &&
      run.steps.budgetAllocation.success

    return NextResponse.json({
      ok:     true,
      runId:  run.runId,
      durationMs: run.durationMs,
      steps: {
        expiredItems:       run.steps.expiredItems,
        conversionLeads:    run.steps.conversionIntelligence.leads,
        ciRecommendations:  run.steps.conversionIntelligence.recommendations,
        negativesDetected:  run.steps.autoNegative.detected,
        negativesQueued:    run.steps.autoNegative.pushed,
        adGroupsAnalyzed:   run.steps.budgetAllocation.adGroups,
        budgetRecs:         run.steps.budgetAllocation.recommendations,
      },
      queueAfter:  run.queueSummaryAfter,
      allSucceeded,
      errors: [
        run.steps.conversionIntelligence.error,
        run.steps.autoNegative.error,
        run.steps.budgetAllocation.error,
      ].filter(Boolean),
      governanceNote: run.governanceNote,
    })
  } catch (err) {
    console.error("[optimize] error:", String(err))
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// GET — returns the last 5 optimization loop runs (for the admin dashboard)
export async function GET() {
  try {
    const { default: clientPromise } = await import("@/lib/mongodb")
    const db = (await clientPromise).db()

    const runs = await db
      .collection("ads_optimization_loop_runs")
      .find({})
      .sort({ startedAt: -1 })
      .limit(5)
      .toArray()

    return NextResponse.json({
      runs: runs.map(({ _id, ...r }) => r),
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
