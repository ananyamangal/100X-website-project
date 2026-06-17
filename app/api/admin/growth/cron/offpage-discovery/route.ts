import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export const maxDuration = 300
export const dynamic = "force-dynamic"

/** Weekly Vercel Cron — Off-Page SEO Discovery (Mon 06:00 UTC = 11:30 IST). */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get("authorization")
    if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const base    = process.env.NEXT_PUBLIC_APP_URL || "https://www.100xcircle.com"
  const startMs = Date.now()
  const now     = new Date().toISOString()

  // Delegate to run-all which handles timing, analysis, and storage
  try {
    const res = await fetch(`${base}/api/admin/growth/seo/offpage/discover/run-all`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body:   JSON.stringify({ triggered_by: "cron" }),
    })
    const data = await res.json()

    const db = (await clientPromise).db()
    // Patch the stored run to mark triggered_by: "cron"
    await db.collection("seo_discovery_runs").updateOne(
      { ran_at: data.ran_at },
      { $set: { triggered_by: "cron" } }
    )

    console.log(`[offpage-discovery cron] ran_at=${now} status=${data.overall_status} duration=${Date.now()-startMs}ms`)

    return NextResponse.json({ ok: data.ok, overall_status: data.overall_status, totals: data.totals, ran_at: now })
  } catch (err) {
    console.error("[offpage-discovery cron] fatal error:", err)
    return NextResponse.json({ ok: false, error: String(err), ran_at: now }, { status: 500 })
  }
}
