import { NextResponse } from "next/server"
import { runGoogleAdsDirector } from "@/lib/growth-os/agents/google-ads-director"

export const maxDuration = 300
export const dynamic = "force-dynamic"

/** Weekly Vercel Cron — Google Ads Director (read-only intelligence). */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get("authorization")
    if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const result = await runGoogleAdsDirector()
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error("Google Ads Director cron error:", err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
