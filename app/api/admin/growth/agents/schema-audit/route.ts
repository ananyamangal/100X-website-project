import { NextResponse } from "next/server"
import { runSchemaAuditAgent } from "@/lib/growth-os/agents/schema-audit"

export const maxDuration = 60

export async function POST() {
  try {
    const result = await runSchemaAuditAgent()
    return NextResponse.json(result)
  } catch (err) {
    console.error("Schema audit agent error:", err)
    return NextResponse.json({ error: "Agent failed", detail: String(err) }, { status: 500 })
  }
}

export async function GET() {
  const { default: clientPromise } = await import("@/lib/mongodb")
  const db = (await clientPromise).db()
  const stored = await db.collection("growth_os_schema_audit").findOne({ _type: "latest" })
  return NextResponse.json(stored || { message: "Not yet run" })
}
