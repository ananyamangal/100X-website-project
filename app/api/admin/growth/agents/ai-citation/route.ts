import { NextResponse } from "next/server"
import { runAICitationAgent } from "@/lib/growth-os/agents/ai-citation"

export const maxDuration = 60

export async function POST() {
  try {
    const result = await runAICitationAgent()
    return NextResponse.json(result)
  } catch (err) {
    console.error("AI citation agent error:", err)
    return NextResponse.json({ error: "Agent failed", detail: String(err) }, { status: 500 })
  }
}

export async function GET() {
  const { default: clientPromise } = await import("@/lib/mongodb")
  const db = (await clientPromise).db()
  const lastRun = await db.collection("growth_os_citation_runs").findOne({}, { sort: { createdAt: -1 } })
  return NextResponse.json(lastRun || { message: "Not yet run" })
}
