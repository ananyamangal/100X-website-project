import { NextResponse } from "next/server"
import { runDealerOpportunityAgent } from "@/lib/growth-os/agents/dealer-opportunity"

export const maxDuration = 120

// POST — run the Dealer Opportunity Engine on demand (admin "Run now")
export async function POST() {
  try {
    const result = await runDealerOpportunityAgent()
    return NextResponse.json(result)
  } catch (err) {
    console.error("Dealer opportunity agent error:", err)
    return NextResponse.json({ error: "Agent failed", detail: String(err) }, { status: 500 })
  }
}

// GET — last run summary from the agent log
export async function GET() {
  const { default: clientPromise } = await import("@/lib/mongodb")
  const db = (await clientPromise).db()
  const log = await db
    .collection("growth_os_logs")
    .findOne({ agent: "Dealer Opportunity Engine" }, { sort: { ts: -1 } })
  return NextResponse.json({ lastRun: log?.ts || null, lastSummary: log?.action || "Never run" })
}
