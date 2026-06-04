import { NextResponse } from "next/server"
import { runSEOOpportunityAgent } from "@/lib/growth-os/agents/seo-opportunity"

export const maxDuration = 60

export async function POST() {
  try {
    const result = await runSEOOpportunityAgent()
    return NextResponse.json(result)
  } catch (err) {
    console.error("SEO opportunity agent error:", err)
    return NextResponse.json({ error: "Agent failed", detail: String(err) }, { status: 500 })
  }
}

export async function GET() {
  const { default: clientPromise } = await import("@/lib/mongodb")
  const db = (await clientPromise).db()
  const log = await db.collection("growth_os_logs")
    .findOne({ agent: "SEO Opportunity Agent" }, { sort: { ts: -1 } })
  return NextResponse.json({ lastRun: log?.ts, lastSummary: log?.action || "Never run" })
}
