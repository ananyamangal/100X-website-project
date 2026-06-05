/**
 * GET /api/admin/gsc/oauth/start
 * Initiates the Google OAuth2 flow. Generates a CSRF state token,
 * stores it in an httpOnly cookie, then redirects to Google's consent screen.
 */
import { NextResponse } from "next/server"
import { randomBytes } from "crypto"
import { buildAuthUrl, isOAuthAppConfigured, getMissingEnvVars, SCOPES } from "@/lib/google-oauth"

export async function GET() {
  if (!isOAuthAppConfigured()) {
    const missing = getMissingEnvVars()
    return NextResponse.json(
      { error: "OAuth app not configured", missing },
      { status: 400 }
    )
  }

  // CSRF state — stored in cookie, validated in callback
  const state = randomBytes(20).toString("hex")

  const authUrl = buildAuthUrl(state, [SCOPES.gsc, SCOPES.ga4, SCOPES.ads])

  const response = NextResponse.redirect(authUrl)
  response.cookies.set("gsc_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,   // 10 minutes — enough for user to complete consent screen
    path: "/",
  })
  return response
}
