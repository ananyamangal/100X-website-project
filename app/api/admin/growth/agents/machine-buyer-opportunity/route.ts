import { NextResponse } from "next/server"
import { runMachineBuyerOpportunityAgent } from "@/lib/growth-os/agents/machine-buyer-opportunity"

export const maxDuration = 120

// POST — run the Machine Buyer Opportunity Engine on demand
export async function POST() {
  try {
    const result = await runMachineBuyerOpportunityAgent()
    return NextResponse.json(result)
  } catch (err) {
    console.error("Machine buyer agent error:", err)
    return NextResponse.json({ error: "Agent failed", detail: String(err) }, { status: 500 })
  }
}

// GET — last run summary
export async function GET() {
  const { default: clientPromise } = await import("@/lib/mongodb")
  const db = (await clientPromise).db()
  const log = await db.collection("growth_os_logs")
    .findOne({ agent: "Machine Buyer Opportunity Engine" }, { sort: { ts: -1 } })
  return NextResponse.json({ lastRun: log?.ts || null, lastSummary: log?.action || "Never run" })
}
