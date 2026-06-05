/**
 * GET /api/admin/ga4/debug
 * Diagnostic endpoint — surfaces raw token data, actual Google tokeninfo,
 * and full API response bodies to identify exactly why GA4 calls are failing.
 * Admin-only (protected by middleware).
 */
import { NextResponse } from "next/server"
import { getStoredTokens, getValidAccessToken, refreshAccessToken } from "@/lib/google-oauth"

export async function GET() {
  const result: Record<string, unknown> = {}

  // 1. What's stored in MongoDB
  const stored = await getStoredTokens()
  if (!stored) {
    return NextResponse.json({ error: "No tokens in MongoDB. Connect Google account first." })
  }

  result.stored = {
    connectedEmail: stored.connectedEmail,
    connectedAt: stored.connectedAt,
    updatedAt: stored.updatedAt,
    expiresAt: stored.expiresAt,
    scope: stored.scope,
    hasAnalyticsScopeInDB: stored.scope?.includes("analytics.readonly") ?? false,
    accessTokenPrefix: stored.accessToken?.slice(0, 20) + "…",
    refreshTokenPrefix: stored.refreshToken?.slice(0, 20) + "…",
  }

  // 2. Force a token refresh and see what scopes Google returns
  try {
    const { refreshAccessToken: refreshFn } = await import("@/lib/google-oauth")
    const refreshed = await refreshFn(stored.refreshToken)
    result.freshRefresh = {
      note: "Forced a fresh token refresh to inspect what Google actually returns",
      newAccessTokenPrefix: refreshed.access_token?.slice(0, 20) + "…",
      expiresIn: refreshed.expires_in,
    }
    // Use the freshly refreshed token for all subsequent checks
    const freshToken = refreshed.access_token

    // 3. Google tokeninfo — what scopes does Google say this access token has?
    const tokenInfoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${freshToken}`)
    const tokenInfo = await tokenInfoRes.json()
    result.googleTokeninfo = {
      status: tokenInfoRes.status,
      body: tokenInfo,
      scopesGrantedByGoogle: tokenInfo.scope || null,
      hasAnalyticsScopeAtGoogle: tokenInfo.scope?.includes("analytics.readonly") ?? false,
    }

    // 4. Raw Admin API call — full response body on any error
    const adminRes = await fetch("https://analyticsadmin.googleapis.com/v1beta/accountSummaries", {
      headers: { Authorization: `Bearer ${freshToken}` },
    })
    const adminBody = await adminRes.text()
    result.adminApiRaw = {
      url: "https://analyticsadmin.googleapis.com/v1beta/accountSummaries",
      status: adminRes.status,
      statusText: adminRes.statusText,
      body: adminBody.slice(0, 2000),
    }

    // 5. Raw Data API call against property 520046025
    const dataRes = await fetch(
      "https://analyticsdata.googleapis.com/v1beta/properties/520046025:runReport",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${freshToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dimensions: [],
          metrics: [{ name: "activeUsers" }],
          dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
          limit: 1,
        }),
      }
    )
    const dataBody = await dataRes.text()
    result.dataApiRaw = {
      url: "https://analyticsdata.googleapis.com/v1beta/properties/520046025:runReport",
      status: dataRes.status,
      statusText: dataRes.statusText,
      body: dataBody.slice(0, 2000),
    }

  } catch (err) {
    result.refreshError = String(err)
  }

  // 6. Stored access token tokeninfo (without refresh, to check if it's still valid)
  try {
    const storedTokenInfo = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${stored.accessToken}`)
    const storedInfo = await storedTokenInfo.json()
    result.storedTokenInfo = {
      status: storedTokenInfo.status,
      scope: storedInfo.scope,
      email: storedInfo.email,
      expiresIn: storedInfo.expires_in,
      error: storedInfo.error,
    }
  } catch (err) {
    result.storedTokenInfoError = String(err)
  }

  return NextResponse.json(result, { status: 200 })
}
