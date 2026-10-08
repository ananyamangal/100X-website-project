import { NextResponse } from "next/server"
import { missingCronEnv } from "@/lib/cron/require-env"

export const maxDuration = 300
export const dynamic = "force-dynamic"

// Reads synced Google Ads data only; with no developer token there is never a sync to read.
const REQUIRED_ENV = ["GOOGLE_ADS_DEVELOPER_TOKEN"] as const

/** Weekly Vercel Cron — Google Ads Director (read-only intelligence). */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get("authorization")
    if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const missing = missingCronEnv("google-ads-director", REQUIRED_ENV)
  if (missing) return NextResponse.json({ ok: true, skipped: "missing_env", missing })
  try {
    // Loaded only past the guard so a skipped run never opens a database connection.
    const { runGoogleAdsDirector } = await import("@/lib/growth-os/agents/google-ads-director")
    const result = await runGoogleAdsDirector()
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error("Google Ads Director cron error:", err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
