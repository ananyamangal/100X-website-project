import { NextResponse } from "next/server"
import { runDealerLeadAgent } from "@/lib/growth-os/agents/dealer-lead"

export const maxDuration = 60

export async function POST() {
  try {
    const result = await runDealerLeadAgent()
    return NextResponse.json(result)
  } catch (err) {
    console.error("Dealer lead agent error:", err)
    return NextResponse.json({ error: "Agent failed", detail: String(err) }, { status: 500 })
  }
}

export async function GET() {
  const { default: clientPromise } = await import("@/lib/mongodb")
  const db = (await clientPromise).db()
  const log = await db.collection("growth_os_logs")
    .findOne({ agent: "Dealer Lead Agent" }, { sort: { ts: -1 } })
  return NextResponse.json({ lastRun: log?.ts, lastSummary: log?.action || "Never run" })
}
