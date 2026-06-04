/**
 * GET  /api/admin/gsc/oauth/status — returns connection status (no tokens exposed)
 * DELETE /api/admin/gsc/oauth/status — disconnects (revokes + deletes tokens)
 */
import { NextResponse } from "next/server"
import { getStoredTokens, revokeTokens, isOAuthAppConfigured, getMissingEnvVars, getOAuthRedirectUri } from "@/lib/google-oauth"
import { getGSCSiteUrl } from "@/lib/gsc"

export async function GET() {
  const oauthConfigured = isOAuthAppConfigured()
  const missing = getMissingEnvVars()
  const stored = await getStoredTokens()
  const redirectUri = getOAuthRedirectUri()

  return NextResponse.json({
    oauthConfigured,
    missing,
    connected: !!stored,
    connectedEmail: stored?.connectedEmail || null,
    connectedAt: stored?.connectedAt || null,
    scope: stored?.scope || null,
    tokenExpiresAt: stored?.expiresAt || null,
    siteUrl: getGSCSiteUrl(),
    redirectUri,
  })
}

export async function DELETE() {
  await revokeTokens()
  return NextResponse.json({ ok: true, message: "Google account disconnected. Tokens deleted." })
}
