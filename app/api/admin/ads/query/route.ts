/**
 * POST /api/admin/ads/query
 * Read-only GAQL diagnostic endpoint. Runs an arbitrary GAQL SELECT against
 * the connected account (or an explicit customerId). The googleAds:search
 * endpoint cannot mutate — this route is safe by construction, but only
 * SELECT statements are accepted as a guard.
 */
import { NextResponse } from "next/server"
import { searchAds, getAdsSettings } from "@/lib/google-ads"
import { getValidAccessToken } from "@/lib/google-oauth"

export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const body = await req.json() as { query: string; customerId?: string }
    const query = (body.query || "").trim()

    if (!/^SELECT\s/i.test(query)) {
      return NextResponse.json({ error: "Only GAQL SELECT queries are allowed" }, { status: 400 })
    }

    const settings = await getAdsSettings()
    const customerId = (body.customerId || settings?.customerId || "").replace(/-/g, "")
    if (!customerId) {
      return NextResponse.json({ error: "No customerId — connect an Ads account first" }, { status: 400 })
    }

    const accessToken = await getValidAccessToken()
    const rows = await searchAds(customerId, query, accessToken, settings?.loginCustomerId)

    return NextResponse.json({ customerId, rowCount: rows.length, rows })
  } catch (err) {
    console.error("[ads/query] error:", String(err))
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
