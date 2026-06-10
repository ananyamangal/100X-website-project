/**
 * Daily Briefing API.
 *
 * GET /api/admin/growth/daily-briefing
 *   Returns today's briefing (cached or freshly generated).
 *
 * POST /api/admin/growth/daily-briefing
 *   Forces a fresh regeneration (ignores cache).
 */

import { NextResponse } from "next/server"
import { getDailyBriefing, generateDailyBriefing } from "@/lib/growth-os/user-success/daily-briefing"

export const dynamic     = "force-dynamic"
export const maxDuration = 60

export async function GET() {
  try {
    const briefing = await getDailyBriefing()
    return NextResponse.json(briefing)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function POST() {
  try {
    const briefing = await generateDailyBriefing()
    return NextResponse.json({ ok: true, briefing })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
