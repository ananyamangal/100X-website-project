import { NextResponse } from "next/server"
import { runInternalLinkAgent } from "@/lib/growth-os/agents/internal-link"

export const maxDuration = 60

export async function POST() {
  try {
    const result = await runInternalLinkAgent()
    return NextResponse.json(result)
  } catch (err) {
    console.error("Internal link agent error:", err)
    return NextResponse.json({ error: "Agent failed", detail: String(err) }, { status: 500 })
  }
}

export async function GET() {
  const { default: clientPromise } = await import("@/lib/mongodb")
  const db = (await clientPromise).db()
  const stored = await db.collection("growth_os_link_graph").findOne({ _type: "latest" })
  return NextResponse.json(stored || { message: "Not yet run" })
}
