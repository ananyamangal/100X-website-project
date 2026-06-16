import { NextResponse } from "next/server"
import { runRevenueDirector } from "@/lib/growth-os/agents/revenue-director"

export const maxDuration = 300
export const dynamic = "force-dynamic"

/** Daily Vercel Cron — Revenue Director (01:30 UTC = 07:00 IST). */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get("authorization")
    if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const result = await runRevenueDirector()
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error("Revenue Director cron error:", err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
