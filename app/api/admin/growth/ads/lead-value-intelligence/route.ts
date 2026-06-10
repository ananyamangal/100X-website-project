/**
 * Lead Value Intelligence API.
 *
 * GET /api/admin/growth/ads/lead-value-intelligence
 *   Returns the latest LVI run (keyword ranks, state ranks, landing page ranks, lead mix).
 *
 * POST /api/admin/growth/ads/lead-value-intelligence
 *   Triggers a fresh run. Body: { periodDays?: number }
 */

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import clientPromise from "@/lib/mongodb"
import { runLeadValueIntelligence } from "@/lib/growth-os/lead-value-intelligence"

export const dynamic     = "force-dynamic"
export const maxDuration = 120

export async function GET() {
  try {
    const db = (await clientPromise).db()
    const latest = await db
      .collection("ads_lead_value_intelligence")
      .findOne({}, { sort: { generatedAt: -1 } })

    if (!latest) {
      return NextResponse.json({
        run:     null,
        message: "No Lead Value Intelligence run found. POST to trigger one.",
      })
    }

    return NextResponse.json({
      runId:               latest.runId,
      periodDays:          latest.periodDays,
      totalLeads:          latest.totalLeads,
      totalWeightedScore:  latest.totalWeightedScore,
      avgWeightedScore:    latest.avgWeightedScore,
      topLeadType:         latest.topLeadType,
      leadMixSummary:      latest.leadMixSummary,
      keywordRanks:        (latest.keywordRanks ?? []).slice(0, 50),     // top 50
      landingPageRanks:    (latest.landingPageRanks ?? []).slice(0, 20),
      stateRanks:          (latest.stateRanks ?? []).slice(0, 30),
      topScoredLeads:      (latest.topScoredLeads ?? []).slice(0, 20),  // top 20 highest-value leads
      scoredLeadCount:     latest.scoredLeadCount ?? latest.totalLeads,
      generatedAt:         latest.generatedAt,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body       = await req.json().catch(() => ({}))
    const periodDays = Number((body as { periodDays?: number }).periodDays ?? 90)

    const run = await runLeadValueIntelligence({ periodDays })

    return NextResponse.json({
      ok:                  true,
      runId:               run.runId,
      periodDays:          run.periodDays,
      totalLeads:          run.totalLeads,
      totalWeightedScore:  run.totalWeightedScore,
      avgWeightedScore:    run.avgWeightedScore,
      topLeadType:         run.topLeadType,
      leadMixSummary:      run.leadMixSummary,
      keywordRanks:        run.keywordRanks.slice(0, 20),
      stateRanks:          run.stateRanks.slice(0, 15),
      landingPageRanks:    run.landingPageRanks.slice(0, 10),
      generatedAt:         run.generatedAt,
    })
  } catch (err) {
    console.error("[lead-value-intelligence] error:", String(err))
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
