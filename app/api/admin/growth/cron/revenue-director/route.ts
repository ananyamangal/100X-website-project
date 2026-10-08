import { NextResponse } from "next/server"
import { missingCronEnv } from "@/lib/cron/require-env"

export const maxDuration = 300
export const dynamic = "force-dynamic"

// The director is built around Google Ads signals; without the Ads developer token
// it only re-ranks the same frozen data and e-mails the same brief every morning.
const REQUIRED_ENV = ["GOOGLE_ADS_DEVELOPER_TOKEN"] as const

/** Daily Vercel Cron — Revenue Director (01:30 UTC = 07:00 IST). */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get("authorization")
    if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const missing = missingCronEnv("revenue-director", REQUIRED_ENV)
  if (missing) return NextResponse.json({ ok: true, skipped: "missing_env", missing })
  try {
    // Loaded only past the guard so a skipped run never opens a database connection.
    const { runRevenueDirector } = await import("@/lib/growth-os/agents/revenue-director")
    const result = await runRevenueDirector()
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error("Revenue Director cron error:", err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
