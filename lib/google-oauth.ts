/**
 * Google OAuth2 — web flow for Growth OS.
 *
 * One Google login powers all integrations (Search Console, GA4, Ads).
 * Tokens are stored in MongoDB `google_oauth_tokens` (single document, upserted).
 * Access tokens auto-refresh from the stored refresh token.
 *
 * Required env vars:
 *   GOOGLE_OAUTH_CLIENT_ID      — from Cloud Console → Credentials → OAuth 2.0 Client ID
 *   GOOGLE_OAUTH_CLIENT_SECRET  — same
 *   GOOGLE_OAUTH_REDIRECT_URI   — exact URI registered in Cloud Console
 *                                  e.g. https://100-x-website-project.vercel.app/api/admin/gsc/oauth/callback
 */

import clientPromise from "@/lib/mongodb"

const DOC_ID = "google-oauth-singleton"

// ── Scope registry — add GA4, Ads scopes here when those integrations land ──
export const SCOPES = {
  gsc: "https://www.googleapis.com/auth/webmasters.readonly",
  ga4: "https://www.googleapis.com/auth/analytics.readonly",
  ads: "https://www.googleapis.com/auth/adwords",
}

// ── Env helpers ───────────────────────────────────────────────────────────────

// Trim all OAuth env vars — Vercel can introduce trailing newlines when pasting credentials
function clientId(): string { return (process.env.GOOGLE_OAUTH_CLIENT_ID || "").trim() }
function clientSecret(): string { return (process.env.GOOGLE_OAUTH_CLIENT_SECRET || "").trim() }

export function isOAuthAppConfigured(): boolean {
  return !!(clientId() && clientSecret())
}

export function getOAuthRedirectUri(): string {
  if (process.env.GOOGLE_OAUTH_REDIRECT_URI) return process.env.GOOGLE_OAUTH_REDIRECT_URI.trim()
  // Fallback: use brand domain. Set GOOGLE_OAUTH_REDIRECT_URI explicitly in Vercel to override.
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.100xcircle.com").replace(/\/$/, "")
  return `${base}/api/admin/gsc/oauth/callback`
}

export function getMissingEnvVars(): string[] {
  const missing: string[] = []
  if (!clientId()) missing.push("GOOGLE_OAUTH_CLIENT_ID")
  if (!clientSecret()) missing.push("GOOGLE_OAUTH_CLIENT_SECRET")
  return missing
}

// ── OAuth2 URL builder ────────────────────────────────────────────────────────

export function buildAuthUrl(state: string, scopes: string[] = [SCOPES.gsc]): string {
  const params = new URLSearchParams({
    client_id: clientId(),
    redirect_uri: getOAuthRedirectUri(),
    response_type: "code",
    scope: scopes.join(" "),
    access_type: "offline",
    prompt: "consent",   // always get refresh_token, even if previously granted
    state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

// ── Token exchange (code → tokens) ───────────────────────────────────────────

interface RawTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  scope: string
  token_type: string
}

export async function exchangeCode(code: string): Promise<RawTokenResponse> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId(),
      client_secret: clientSecret(),
      redirect_uri: getOAuthRedirectUri(),
      grant_type: "authorization_code",
    }).toString(),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Code exchange failed (${res.status}): ${err.slice(0, 300)}`)
  }
  return res.json() as Promise<RawTokenResponse>
}

// ── Token refresh (refresh_token → new access_token) ─────────────────────────

interface RefreshResponse { access_token: string; expires_in: number }

export async function refreshAccessToken(refreshToken: string): Promise<RefreshResponse> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId(),
      client_secret: clientSecret(),
      grant_type: "refresh_token",
    }).toString(),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Token refresh failed (${res.status}): ${err.slice(0, 300)}`)
  }
  return res.json() as Promise<RefreshResponse>
}

// ── Google user info ──────────────────────────────────────────────────────────

export async function fetchConnectedEmail(accessToken: string): Promise<string> {
  try {
    const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) return ""
    const d = await res.json() as { email?: string }
    return d.email || ""
  } catch { return "" }
}

// ── MongoDB token storage ─────────────────────────────────────────────────────

export interface StoredTokens {
  accessToken: string
  refreshToken: string
  expiresAt: string   // ISO string
  scope: string
  connectedEmail: string
  connectedAt: string
  updatedAt: string
}

export async function getStoredTokens(): Promise<StoredTokens | null> {
  const db = (await clientPromise).db()
  const doc = await db.collection("google_oauth_tokens").findOne({ _docId: DOC_ID })
  if (!doc?.refreshToken) return null
  return {
    accessToken: doc.accessToken as string,
    refreshToken: doc.refreshToken as string,
    expiresAt: doc.expiresAt as string,
    scope: doc.scope as string,
    connectedEmail: doc.connectedEmail as string,
    connectedAt: doc.connectedAt as string,
    updatedAt: doc.updatedAt as string,
  }
}

export async function storeTokens(tokens: {
  accessToken: string
  refreshToken: string
  expiresAt: string
  scope: string
  connectedEmail: string
}): Promise<void> {
  const db = (await clientPromise).db()
  await db.collection("google_oauth_tokens").updateOne(
    { _docId: DOC_ID },
    {
      $set: { ...tokens, updatedAt: new Date().toISOString() },
      $setOnInsert: { _docId: DOC_ID, connectedAt: new Date().toISOString() },
    },
    { upsert: true }
  )
}

async function updateAccessToken(accessToken: string, expiresAt: string): Promise<void> {
  const db = (await clientPromise).db()
  await db.collection("google_oauth_tokens").updateOne(
    { _docId: DOC_ID },
    { $set: { accessToken, expiresAt, updatedAt: new Date().toISOString() } }
  )
}

export async function revokeTokens(): Promise<void> {
  const stored = await getStoredTokens()
  if (stored?.accessToken) {
    // Best-effort revoke at Google
    fetch(`https://oauth2.googleapis.com/revoke?token=${stored.accessToken}`, { method: "POST" }).catch(() => {})
  }
  const db = (await clientPromise).db()
  await db.collection("google_oauth_tokens").deleteOne({ _docId: DOC_ID })
}

// ── Main: get a valid access token (auto-refresh if within 5 min of expiry) ──

export async function getValidAccessToken(): Promise<string> {
  const stored = await getStoredTokens()
  if (!stored) {
    throw new Error("NOT_CONNECTED: No Google account connected. Go to Growth OS → SEO → Search Console Setup and click Connect Google Account.")
  }

  const expiresAt = new Date(stored.expiresAt).getTime()
  const nowMs = Date.now()
  const fiveMinMs = 5 * 60 * 1000

  if (nowMs < expiresAt - fiveMinMs) {
    // Token is still valid
    return stored.accessToken
  }

  // Token expired or expiring soon — refresh
  try {
    const refreshed = await refreshAccessToken(stored.refreshToken)
    const newExpiresAt = new Date(nowMs + refreshed.expires_in * 1000).toISOString()
    await updateAccessToken(refreshed.access_token, newExpiresAt)
    return refreshed.access_token
  } catch (err) {
    throw new Error(`REFRESH_FAILED: ${String(err)}. Try reconnecting your Google account.`)
  }
}
