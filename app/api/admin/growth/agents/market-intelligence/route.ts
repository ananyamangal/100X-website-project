import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { runMarketIntelligence, type MIModelTier } from "@/lib/growth-os/agents/market-intelligence"

export async function GET() {
  const db   = (await clientPromise).db()
  const runs = await db.collection("market_intelligence_runs")
    .find({})
    .sort({ generatedAt: -1 })
    .limit(10)
    .project({ productOpportunities: 0, stateOpportunities: 0, campaignScores: 0 })
    .toArray()

  return NextResponse.json(JSON.parse(JSON.stringify(runs)))
}

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    action?:    string
    dateRange?: number
    model?:     MIModelTier
    runId?:     string
  }

  // Fetch specific run
  if (body.runId) {
    const db  = (await clientPromise).db()
    const run = await db.collection("market_intelligence_runs").findOne({ runId: body.runId })
    if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json(JSON.parse(JSON.stringify(run)))
  }

  // Run analysis
  if (body.action === "run" || !body.action) {
    try {
      const run = await runMarketIntelligence({
        dateRange: body.dateRange ?? 90,
        model:     body.model ?? "sonnet",
      })
      return NextResponse.json({ ok: true, run })
    } catch (err) {
      return NextResponse.json(
        { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
        { status: 500 },
      )
    }
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}
