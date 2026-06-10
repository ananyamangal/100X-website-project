import { NextResponse } from "next/server"
import { runMachineBuyerOpportunityAgent } from "@/lib/growth-os/agents/machine-buyer-opportunity"

export const maxDuration = 300
export const dynamic = "force-dynamic"

/** Weekly Vercel Cron entry for the Machine Buyer Opportunity Engine. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get("authorization")
    if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const result = await runMachineBuyerOpportunityAgent()
    return NextResponse.json({ ok: true, week: result.week, count: result.count })
  } catch (err) {
    console.error("Machine buyer cron error:", err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
