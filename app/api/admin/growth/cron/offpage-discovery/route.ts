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

  const base = process.env.NEXT_PUBLIC_APP_URL || "https://www.100xcircle.com"
  const db = (await clientPromise).db()
  const now = new Date().toISOString()

  const results: Record<string, unknown> = {}
  const errors:  Record<string, string>  = {}

  // Competitor discovery
  try {
    const res = await fetch(`${base}/api/admin/growth/seo/offpage/discover/competitors`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ competitor: "all" }),
    })
    results.competitors = await res.json()
  } catch (e) { errors.competitors = String(e) }

  // Citation discovery
  try {
    const res = await fetch(`${base}/api/admin/growth/seo/offpage/discover/citations`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
    results.citations = await res.json()
  } catch (e) { errors.citations = String(e) }

  // GeM discovery
  try {
    const res = await fetch(`${base}/api/admin/growth/seo/offpage/discover/gem`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
    results.gem = await res.json()
  } catch (e) { errors.gem = String(e) }

  // Recalculate authority score
  try {
    const res = await fetch(`${base}/api/admin/growth/seo/offpage/authority-score`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
    results.authority_score = await res.json()
  } catch (e) { errors.authority_score = String(e) }

  // Log run to audit
  await db.collection("seo_offpage_audit_log").insertOne({
    action: "cron_weekly_discovery",
    detail: `Weekly off-page discovery cron completed. Errors: ${Object.keys(errors).length}`,
    results,
    errors,
    created_at: now,
  })

  const ok = Object.keys(errors).length === 0

  console.log(`[offpage-discovery cron] ran_at=${now} ok=${ok}`, { results, errors })

  return NextResponse.json({ ok, results, errors, ran_at: now })
}
