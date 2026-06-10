/**
 * State Intelligence API.
 *
 * GET /api/admin/growth/ads/state-intelligence
 *   Returns the latest State Intelligence run (state profiles + recommendations).
 *
 * POST /api/admin/growth/ads/state-intelligence
 *   Triggers a fresh run. Body: { periodDays?: number, enqueueRecommendations?: boolean }
 */

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import clientPromise from "@/lib/mongodb"
import { runStateIntelligence } from "@/lib/growth-os/state-intelligence"

export const dynamic     = "force-dynamic"
export const maxDuration = 120

export async function GET() {
  try {
    const db = (await clientPromise).db()
    const latest = await db
      .collection("ads_state_intelligence")
      .findOne({}, { sort: { generatedAt: -1 } })

    if (!latest) {
      return NextResponse.json({
        run:     null,
        message: "No State Intelligence run found. POST to trigger one.",
      })
    }

    return NextResponse.json({
      runId:           latest.runId,
      periodDays:      latest.periodDays,
      lviRunId:        latest.lviRunId,
      statesAnalyzed:  latest.statesAnalyzed,
      topState:        latest.topState,
      untappedTier1:   latest.untappedTier1,
      profiles:        latest.profiles,
      recommendations: latest.recommendations,
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

    const run = await runStateIntelligence({ periodDays, enqueueRecommendations })

    return NextResponse.json({
      ok:              true,
      runId:           run.runId,
      periodDays:      run.periodDays,
      lviRunId:        run.lviRunId,
      statesAnalyzed:  run.statesAnalyzed,
      topState:        run.topState,
      untappedTier1:   run.untappedTier1,
      profiles:        run.profiles,
      recommendations: run.recommendations,
      summary:         run.summary,
      generatedAt:     run.generatedAt,
      queued:          run.recommendations.filter(r => r.queuedAt).length,
    })
  } catch (err) {
    console.error("[state-intelligence] error:", String(err))
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
