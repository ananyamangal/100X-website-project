import { NextResponse } from "next/server"
import { runDealerOpportunityAgent } from "@/lib/growth-os/agents/dealer-opportunity"

export const maxDuration = 300
export const dynamic = "force-dynamic"

/**
 * Weekly Vercel Cron entry for the Dealer Opportunity Engine.
 * Scheduling: vercel.json crons (no queue infrastructure at this stage).
 * If CRON_SECRET is set, Vercel sends "Authorization: Bearer <CRON_SECRET>".
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get("authorization")
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }
  try {
    const result = await runDealerOpportunityAgent()
    return NextResponse.json({ ok: true, week: result.week, count: result.count })
  } catch (err) {
    console.error("Dealer opportunity cron error:", err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
