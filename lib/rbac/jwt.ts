// JWT implementation using the Web Crypto API.
// Works in both Next.js Edge Runtime (middleware) and Node.js (API routes).

import type { JWTPayload } from "./types"

const SECRET_ENV = (): string => {
  const s = process.env.JWT_SECRET
  if (!s) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET environment variable is not set. Set it in Vercel environment variables.")
    }
    console.warn("[RBAC] JWT_SECRET not set — using insecure dev default. Set JWT_SECRET before going to production.")
    return "100x-rbac-dev-secret-CHANGE-IN-PROD"
  }
  return s
}

function b64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "")
}

function b64urlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/")
  const pad = (4 - (padded.length % 4)) % 4
  const b64 = padded + "=".repeat(pad)
  const bin = atob(b64)
  return new Uint8Array(bin.split("").map(c => c.charCodeAt(0)))
}

async function importKey(secret: string, usage: "sign" | "verify"): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    [usage]
  )
}

// Role-based session timeout in seconds
const ROLE_TIMEOUT: Record<string, number> = {
  super_admin:  24 * 3600,  // 24 hours
  growth_admin: 24 * 3600,  // 24 hours
}
const DEFAULT_TIMEOUT = 24 * 3600  // 24 hours

export function getRoleTimeout(role: string): number {
  return ROLE_TIMEOUT[role] ?? DEFAULT_TIMEOUT
}

export async function signJWT(
  payload: Omit<JWTPayload, "iat" | "exp">,
  expiresInSeconds?: number
): Promise<string> {
  const ttl = expiresInSeconds ?? getRoleTimeout(payload.role)
  const now = Math.floor(Date.now() / 1000)
  const full: JWTPayload = { ...payload, iat: now, exp: now + ttl }

  const header = b64url(new TextEncoder().encode(JSON.stringify({ alg: "HS256", typ: "JWT" })).buffer as ArrayBuffer)
  const body   = b64url(new TextEncoder().encode(JSON.stringify(full)).buffer as ArrayBuffer)
  const key    = await importKey(SECRET_ENV(), "sign")
  const sig    = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${header}.${body}`))

  return `${header}.${body}.${b64url(sig)}`
}

export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    const parts = token.split(".")
    if (parts.length !== 3) return null

    const [header, body, sig] = parts
    const key   = await importKey(SECRET_ENV(), "verify")
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      b64urlDecode(sig),
      new TextEncoder().encode(`${header}.${body}`)
    )
    if (!valid) return null

    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(body))) as JWTPayload
    if (payload.exp < Math.floor(Date.now() / 1000)) return null

    return payload
  } catch {
    return null
  }
}

// Cookie helpers
export const SESSION_COOKIE = "admin-token"
export const SESSION_MAX_AGE = 60 * 60 * 24  // 24 hours
