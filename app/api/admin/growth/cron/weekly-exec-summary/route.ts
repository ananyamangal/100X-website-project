import { NextResponse } from "next/server"
import { runWeeklyExecSummary } from "@/lib/growth-os/agents/weekly-exec-summary"

export const maxDuration = 300
export const dynamic = "force-dynamic"

/** Monday Vercel Cron — runs after the opportunity engines. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get("authorization")
    if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const result = await runWeeklyExecSummary()
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error("Weekly exec summary cron error:", err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
