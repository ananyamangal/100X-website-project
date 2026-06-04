/**
 * POST /api/admin/gsc/test
 * Live OAuth connection test — 5 steps from env vars to a real GSC query.
 */
import { NextResponse } from "next/server"
import { isOAuthAppConfigured, getMissingEnvVars, getStoredTokens, getValidAccessToken, getOAuthRedirectUri } from "@/lib/google-oauth"
import { queryGSC, getGSCSiteUrl, dateRange } from "@/lib/gsc"

export interface GCSTestResult {
  ok: boolean
  steps: Array<{
    id: string
    label: string
    status: "pass" | "fail" | "skip" | "warn"
    detail: string
  }>
  connectedEmail?: string
  siteUrl: string
  redirectUri: string
  rowsFetched?: number
}

export async function POST() {
  const steps: GCSTestResult["steps"] = []
  const siteUrl = getGSCSiteUrl()
  const redirectUri = getOAuthRedirectUri()

  // Step 1: OAuth app env vars
  const oauthConfigured = isOAuthAppConfigured()
  const missing = getMissingEnvVars()
  if (!oauthConfigured) {
    steps.push({
      id: "env_vars",
      label: "OAuth app credentials",
      status: "fail",
      detail: `Missing env vars: ${missing.join(", ")}. Add these in Vercel → Settings → Environment Variables.`,
    })
    return NextResponse.json({ ok: false, steps, siteUrl, redirectUri })
  }
  steps.push({ id: "env_vars", label: "OAuth app credentials", status: "pass", detail: `GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET are set.` })

  // Step 2: Redirect URI
  const redirectUriEnv = process.env.GOOGLE_OAUTH_REDIRECT_URI
  if (!redirectUriEnv) {
    steps.push({
      id: "redirect_uri",
      label: "GOOGLE_OAUTH_REDIRECT_URI",
      status: "warn",
      detail: `Not set — using computed fallback: ${redirectUri}. Recommend setting GOOGLE_OAUTH_REDIRECT_URI explicitly and registering this exact URI in Google Cloud Console → Credentials → OAuth 2.0 Client ID → Authorized redirect URIs.`,
    })
  } else {
    steps.push({ id: "redirect_uri", label: "GOOGLE_OAUTH_REDIRECT_URI", status: "pass", detail: `Set to: ${redirectUri}` })
  }

  // Step 3: Tokens stored in MongoDB
  const stored = await getStoredTokens()
  if (!stored) {
    steps.push({
      id: "tokens",
      label: "Google account connected",
      status: "fail",
      detail: "No tokens found in MongoDB. Click 'Connect Google Account' on this page to complete the OAuth flow.",
    })
    return NextResponse.json({ ok: false, steps, siteUrl, redirectUri })
  }
  steps.push({
    id: "tokens",
    label: "Google account connected",
    status: "pass",
    detail: `Tokens found. Connected as: ${stored.connectedEmail || "unknown"}`,
  })

  // Step 4: Get a valid access token (auto-refresh if needed)
  let accessToken: string
  try {
    accessToken = await getValidAccessToken()
    steps.push({ id: "access_token", label: "Access token valid", status: "pass", detail: `Token obtained (expires: ${new Date(stored.expiresAt).toLocaleString("en-IN")}).` })
  } catch (err) {
    steps.push({ id: "access_token", label: "Access token valid", status: "fail", detail: `${String(err)}` })
    return NextResponse.json({ ok: false, steps, siteUrl, redirectUri, connectedEmail: stored.connectedEmail })
  }

  // Step 5: Live GSC query
  const { startDate, endDate } = dateRange(7)
  try {
    const rows = await queryGSC({ startDate, endDate, dimensions: ["query"], rowLimit: 1 }, accessToken)
    steps.push({
      id: "gsc_query",
      label: `Query Search Console (${siteUrl})`,
      status: "pass",
      detail: rows.length > 0
        ? `Success. ${rows.length} row returned. Connection fully operational.`
        : `Success. 0 rows — GSC confirmed accessible but no query data in the last 7 days. This is normal for new properties or low-traffic periods. Run a full sync to see 28-day data.`,
    })
    return NextResponse.json({ ok: true, steps, siteUrl, redirectUri, connectedEmail: stored.connectedEmail, rowsFetched: rows.length })
  } catch (err) {
    const msg = String(err)
    let detail = msg.slice(0, 300)
    if (msg.includes("403")) {
      detail = `Your Google account (${stored.connectedEmail}) does not have access to ${siteUrl}. In Google Search Console → Settings → Users and permissions → verify this account is listed.`
    } else if (msg.includes("404")) {
      detail = `Property not found: ${siteUrl}. Check GOOGLE_SC_SITE_URL matches the URL exactly as shown in Search Console (including or excluding www, and trailing slash).`
    }
    steps.push({ id: "gsc_query", label: `Query Search Console (${siteUrl})`, status: "fail", detail })
    return NextResponse.json({ ok: false, steps, siteUrl, redirectUri, connectedEmail: stored.connectedEmail })
  }
}
