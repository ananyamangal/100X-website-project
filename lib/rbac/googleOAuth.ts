// Google OAuth 2.0 helpers with PKCE (RFC 7636) and CSRF state protection.
// Only used in API routes (Node.js) — never in Edge Runtime middleware.

import { createHash, randomBytes } from "crypto"
import clientPromise from "@/lib/mongodb"

const STATE_EXPIRY_MS = 10 * 60 * 1000  // 10 minutes

function base64urlEncode(buf: Buffer): string {
  return buf.toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "")
}

// ── PKCE helpers ──────────────────────────────────────────────────────────────

export function generateCodeVerifier(): string {
  // 64 random bytes → 86 base64url chars (well within 43–128 char limit)
  return base64urlEncode(randomBytes(64))
}

export function generateCodeChallenge(verifier: string): string {
  return base64urlEncode(createHash("sha256").update(verifier).digest())
}

export function generateState(): string {
  return randomBytes(16).toString("hex")
}

// ── State persistence (DB-backed, 10-min TTL) ─────────────────────────────────

async function ensureIndexes() {
  try {
    const db  = (await clientPromise).db()
    const col = db.collection("oauth_states")
    await col.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, background: true })
    await col.createIndex({ state: 1 },     { unique: true, background: true })
  } catch { /* idempotent */ }
}

export async function storeOAuthState(state: string, codeVerifier: string): Promise<void> {
  await ensureIndexes()
  const db  = (await clientPromise).db()
  const now = new Date()
  await db.collection("oauth_states").insertOne({
    state,
    codeVerifier,
    createdAt: now,
    expiresAt: new Date(now.getTime() + STATE_EXPIRY_MS),
  })
}

export async function consumeOAuthState(
  state: string
): Promise<{ codeVerifier: string } | null> {
  const db  = (await clientPromise).db()
  const doc = await db.collection("oauth_states").findOneAndDelete({ state })
  if (!doc) return null
  if (new Date(doc.expiresAt as Date) < new Date()) return null
  return { codeVerifier: doc.codeVerifier as string }
}

// ── Authorization URL builder ─────────────────────────────────────────────────

export function buildGoogleAuthUrl(opts: {
  clientId:     string
  redirectUri:  string
  state:        string
  codeChallenge: string
}): string {
  const params = new URLSearchParams({
    client_id:             opts.clientId,
    redirect_uri:          opts.redirectUri,
    response_type:         "code",
    scope:                 "openid email profile",
    state:                 opts.state,
    code_challenge:        opts.codeChallenge,
    code_challenge_method: "S256",
    access_type:           "online",
    prompt:                "select_account",
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

// ── Token exchange ────────────────────────────────────────────────────────────

export interface GoogleTokens {
  access_token:  string
  id_token?:     string
  expires_in?:   number
  token_type:    string
}

export async function exchangeCodeForTokens(opts: {
  code:          string
  codeVerifier:  string
  clientId:      string
  clientSecret:  string
  redirectUri:   string
}): Promise<GoogleTokens | null> {
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method:  "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body:    new URLSearchParams({
        code:          opts.code,
        client_id:     opts.clientId,
        client_secret: opts.clientSecret,
        redirect_uri:  opts.redirectUri,
        grant_type:    "authorization_code",
        code_verifier: opts.codeVerifier,
      }),
    })
    if (!res.ok) {
      const err = await res.text()
      console.error("[Google OAuth] Token exchange failed:", err)
      return null
    }
    return res.json() as Promise<GoogleTokens>
  } catch (err) {
    console.error("[Google OAuth] Token exchange exception:", err)
    return null
  }
}

// ── User info ─────────────────────────────────────────────────────────────────

export interface GoogleUserInfo {
  sub:            string
  email:          string
  email_verified: boolean
  name:           string
  given_name?:    string
  family_name?:   string
  picture?:       string
}

export async function getGoogleUserInfo(
  accessToken: string
): Promise<GoogleUserInfo | null> {
  try {
    const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) return null
    return res.json() as Promise<GoogleUserInfo>
  } catch {
    return null
  }
}
