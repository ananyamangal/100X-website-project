/**
 * Budget Recommendation Engine V2 API.
 *
 * GET /api/admin/growth/ads/budget-recommendation-v2
 *   Returns the latest budget recommendation run.
 *
 * POST /api/admin/growth/ads/budget-recommendation-v2
 *   Triggers a fresh run. Body: { periodDays?: number, enqueueRecommendations?: boolean }
 *
 * All recommendations land in the Approval Queue as "pending".
 * No budget is changed automatically.
 */

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import clientPromise from "@/lib/mongodb"
import { runBudgetRecommendationV2 } from "@/lib/growth-os/budget-recommendation-v2"

export const dynamic     = "force-dynamic"
export const maxDuration = 120

export async function GET() {
  try {
    const db = (await clientPromise).db()
    const latest = await db
      .collection("ads_budget_recommendations_v2")
      .findOne({}, { sort: { generatedAt: -1 } })

    if (!latest) {
      return NextResponse.json({
        run:     null,
        message: "No Budget Recommendation V2 run found. POST to trigger one.",
      })
    }

    return NextResponse.json({
      runId:           latest.runId,
      periodDays:      latest.periodDays,
      lviRunId:        latest.lviRunId,
      siRunId:         latest.siRunId,
      recommendations: latest.recommendations,
      queued:          latest.queued,
      summary:         latest.summary,
      generatedAt:     latest.generatedAt,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body                = await req.json().catch(() => ({}))
    const periodDays          = Number((body as { periodDays?: number }).periodDays ?? 90)
    const enqueueRecommendations = (body as { enqueueRecommendations?: boolean }).enqueueRecommendations ?? true

    const run = await runBudgetRecommendationV2({ periodDays, enqueueRecommendations })

    return NextResponse.json({
      ok:              true,
      runId:           run.runId,
      periodDays:      run.periodDays,
      lviRunId:        run.lviRunId,
      siRunId:         run.siRunId,
      recommendations: run.recommendations,
      queued:          run.queued,
      summary:         run.summary,
      generatedAt:     run.generatedAt,
    })
  } catch (err) {
    console.error("[budget-recommendation-v2] error:", String(err))
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
