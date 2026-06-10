import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { getGSCSiteUrl } from "@/lib/gsc"
import { getStoredTokens, isOAuthAppConfigured } from "@/lib/google-oauth"
import { runGSCSync } from "@/lib/gsc-sync"

export const maxDuration = 60

export async function GET() {
  const db = (await clientPromise).db()
  const [last, stored] = await Promise.all([
    db.collection("gsc_syncs").findOne({}, { sort: { syncedAt: -1 } }),
    getStoredTokens(),
  ])

  return NextResponse.json({
    oauthConfigured: isOAuthAppConfigured(),
    connected: !!stored,
    connectedEmail: stored?.connectedEmail || null,
    siteUrl: getGSCSiteUrl(),
    lastSync: last ? JSON.parse(JSON.stringify(last)) : null,
  })
}

export async function POST() {
  try {
    const result = await runGSCSync()
    if (!result.ok) {
      return NextResponse.json({ ok: false, errors: result.errors, syncedAt: result.syncedAt }, { status: 500 })
    }
    return NextResponse.json({ ok: true, queryCount: result.queryCount, pageCount: result.pageCount, syncedAt: result.syncedAt, currentPeriod: result.currentPeriod })
  } catch (err) {
    const msg = String(err)
    if (msg.startsWith("NOT_CONNECTED")) {
      return NextResponse.json({ error: "not_connected", message: "Connect your Google account first in Growth OS → SEO → Search Console Setup." }, { status: 400 })
    }
    return NextResponse.json({ error: "auth_failed", message: msg }, { status: 401 })
  }
}
