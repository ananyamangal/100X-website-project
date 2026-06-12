import { NextResponse } from "next/server"
import { runSchemaHealthAudit, getLatestSchemaHealth } from "@/lib/seo/schemaHealthAuditor"

export const maxDuration = 120

export async function GET() {
  try {
    const data = await getLatestSchemaHealth()
    return NextResponse.json(data ?? { message: "Not yet run" })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const trigger = (body?.trigger as "manual" | "post_deploy" | "daily_sync") ?? "manual"
    const report = await runSchemaHealthAudit(trigger)
    return NextResponse.json(report)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
