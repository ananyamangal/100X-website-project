import { NextResponse } from "next/server"
import { runGSCSync } from "@/lib/gsc-sync"
import { runSEOOpportunityAgent } from "@/lib/growth-os/agents/seo-opportunity"

export const maxDuration = 300
export const dynamic = "force-dynamic"

/**
 * Daily Vercel Cron — Search Console synchronization workflow:
 * 1) sync GSC query + page data (current + previous 28-day windows)
 * 2) run the SEO Opportunity agent on the fresh data
 * No-op (200) when the Google account isn't connected yet.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get("authorization")
    if (auth !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const sync = await runGSCSync()
    let seo: unknown = null
    if (sync.ok && (sync.queryCount > 0 || sync.pageCount > 0)) {
      try { seo = await runSEOOpportunityAgent() } catch (e) { console.error("SEO agent after GSC sync:", e) }
    }
    return NextResponse.json({ ok: true, queryCount: sync.queryCount, pageCount: sync.pageCount, seo })
  } catch (err) {
    const msg = String(err)
    // Not connected yet — not a failure, just nothing to sync.
    if (msg.startsWith("NOT_CONNECTED")) {
      return NextResponse.json({ ok: true, skipped: "not_connected" })
    }
    console.error("GSC sync cron error:", msg)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
