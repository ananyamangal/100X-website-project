/**
 * GET /api/admin/gsc/oauth/callback?code=...&state=...
 * Google redirects here after the user grants permission.
 * Validates CSRF state, exchanges code for tokens, stores in MongoDB.
 */
import { NextRequest, NextResponse } from "next/server"
import { exchangeCode, storeTokens, fetchConnectedEmail } from "@/lib/google-oauth"

const SETUP_PAGE = "/admin/growth/seo/setup"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const error = searchParams.get("error")

  // User denied permission on the consent screen
  if (error) {
    const msg = error === "access_denied" ? "access_denied" : encodeURIComponent(error)
    return NextResponse.redirect(new URL(`${SETUP_PAGE}?error=${msg}`, req.url))
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL(`${SETUP_PAGE}?error=missing_params`, req.url))
  }

  // Validate CSRF state
  const stateCookie = req.cookies.get("gsc_oauth_state")?.value
  if (!stateCookie || stateCookie !== state) {
    return NextResponse.redirect(new URL(`${SETUP_PAGE}?error=invalid_state`, req.url))
  }

  try {
    // Exchange authorization code for tokens
    const tokens = await exchangeCode(code)

    if (!tokens.refresh_token) {
      // This can happen if the user previously connected and Google didn't re-issue
      // a refresh token. The prompt=consent in the auth URL should prevent this,
      // but handle gracefully.
      return NextResponse.redirect(
        new URL(`${SETUP_PAGE}?error=no_refresh_token`, req.url)
      )
    }

    // Fetch the user's email to display in the UI
    const connectedEmail = await fetchConnectedEmail(tokens.access_token)

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

    await storeTokens({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt,
      scope: tokens.scope,
      connectedEmail,
    })

    // Clear the state cookie and redirect to success
    const response = NextResponse.redirect(new URL(`${SETUP_PAGE}?connected=1`, req.url))
    response.cookies.set("gsc_oauth_state", "", { maxAge: 0, path: "/" })
    return response

  } catch (err) {
    console.error("OAuth callback error:", err)
    const msg = encodeURIComponent(String(err).slice(0, 200))
    return NextResponse.redirect(new URL(`${SETUP_PAGE}?error=exchange_failed&detail=${msg}`, req.url))
  }
}
