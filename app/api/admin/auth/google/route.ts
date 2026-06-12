// GET /api/admin/auth/google
// Initiates Google OAuth 2.0 login with PKCE (RFC 7636) and CSRF state protection.
// Redirects the browser to Google's authorization endpoint.

import { type NextRequest, NextResponse } from "next/server"
import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  storeOAuthState,
  buildGoogleAuthUrl,
} from "@/lib/rbac/googleOAuth"

export async function GET(request: NextRequest) {
  const clientId    = (process.env.GOOGLE_LOGIN_CLIENT_ID ?? "").trim()
  const redirectUri = (process.env.GOOGLE_LOGIN_REDIRECT_URI ?? "").trim()

  if (!clientId || !redirectUri) {
    const url = request.nextUrl.clone()
    url.pathname = "/admin/login"
    url.search   = "?error=google_not_configured"
    return NextResponse.redirect(url)
  }

  const state        = generateState()
  const codeVerifier = generateCodeVerifier()
  const challenge    = generateCodeChallenge(codeVerifier)

  // Persist state + code_verifier in MongoDB (TTL 10 min)
  await storeOAuthState(state, codeVerifier)

  const authUrl = buildGoogleAuthUrl({ clientId, redirectUri, state, codeChallenge: challenge })

  // Set state in a short-lived cookie for double-submit CSRF protection
  const response = NextResponse.redirect(authUrl)
  response.cookies.set("__oauth_state", state, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",  // lax required: cookie must travel to Google and back
    maxAge:   600,    // 10 minutes
    path:     "/",
  })
  return response
}
