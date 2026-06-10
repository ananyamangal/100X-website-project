/**
 * Campaign Factory V2 API.
 *
 * POST /api/admin/growth/ads/campaign-factory-v2
 *   Runs the conversion-intelligence-driven campaign factory.
 *   Uses all 5 signal types: conversion, demand, search term, negative, budget.
 *   Produces a DRAFT campaign → pushed to the Approval Queue.
 *   Nothing is deployed to Google Ads. Nothing spends money.
 *
 * GET /api/admin/growth/ads/campaign-factory-v2
 *   Returns the last 5 factory runs.
 */

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { runCampaignFactoryV2 } from "@/lib/growth-os/campaign-factory-v2"

export const dynamic     = "force-dynamic"
export const maxDuration = 120  // V2 loads 6 signal sources in parallel — may take up to 2 min

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const triggeredBy    = String((body as { triggeredBy?: string }).triggeredBy    ?? "api-manual")
    const dataWindowDays = Number((body as { dataWindowDays?: number }).dataWindowDays ?? 30)
    const pushToQueue    = (body as { pushToQueue?: boolean }).pushToQueue !== false

    const run = await runCampaignFactoryV2({ triggeredBy, dataWindowDays, pushToQueue })

    const draft = run.drafts[0]
    const convBacked = draft?.adGroups.reduce(
      (s, g) => s + g.keywords.filter(k =>
        ["rfq_conversion","whatsapp_conversion","phone_conversion","dealer_conversion","oem_conversion","ads_search_terms"]
          .includes(k.source)
      ).length, 0,
    ) ?? 0

    return NextResponse.json({
      ok:          true,
      runId:       run.runId,
      draftCount:  run.draftCount,
      pushedToQueue: run.pushedToQueue,
      signalSummary: run.signalSummary,
      draft: draft ? {
        planId:         draft.planId,
        campaignName:   draft.campaignName,
        objective:      draft.objective,
        adGroupCount:   draft.adGroups.length,
        totalKeywords:  draft.adGroups.reduce((s, g) => s + g.keywords.length, 0),
        conversionBackedKeywords: convBacked,
        themes:         draft.adGroups.map(g => g.theme),
        estimatedImpact: draft.estimatedImpact,
        signalsUsed:    draft.signalsUsed,
        whyCreated:     draft.whyCreated,
        governance:     draft.governance,
      } : null,
      governance: run.governance,
    })
  } catch (err) {
    console.error("[campaign-factory-v2] error:", String(err))
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function GET() {
  try {
    const { default: clientPromise } = await import("@/lib/mongodb")
    const db = (await clientPromise).db()

    const runs = await db
      .collection("ads_campaign_factory_v2_runs")
      .find({})
      .sort({ generatedAt: -1 })
      .limit(5)
      .toArray()

    return NextResponse.json({
      runs: runs.map(({ _id, ...r }) => r),
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
