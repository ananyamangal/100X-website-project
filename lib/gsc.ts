/**
 * Google Search Console API client — service account auth, no external dependencies.
 *
 * Required env vars:
 *   GOOGLE_SC_KEY      — JSON string of the service account key file
 *   GOOGLE_SC_SITE_URL — GSC property URL, e.g. "https://www.100xcircle.com/"
 *                        or "sc-domain:100xcircle.com"
 */

import { createSign } from "crypto"

export interface GSCCredentials {
  type: string
  project_id: string
  private_key_id: string
  private_key: string
  client_email: string
  client_id: string
  token_uri: string
}

export interface GSCRow {
  query?: string
  page?: string
  country?: string
  device?: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

export type GSCDimension = "query" | "page" | "country" | "device"

// In-process token cache — valid for 55 min (token lifetime is 60 min)
let _tokenCache: { token: string; exp: number } | null = null

export function getGSCCredentials(): GSCCredentials | null {
  const raw = process.env.GOOGLE_SC_KEY
  if (!raw) return null
  try {
    const creds = JSON.parse(raw) as GSCCredentials
    // Normalize escaped newlines in private_key (common when set via Vercel dashboard)
    creds.private_key = creds.private_key.replace(/\\n/g, "\n")
    return creds
  } catch {
    return null
  }
}

export function getGSCSiteUrl(): string {
  return (process.env.GOOGLE_SC_SITE_URL || "https://www.100xcircle.com/").trim()
}

export function isGSCConfigured(): boolean {
  return !!getGSCCredentials()
}

function toBase64Url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "")
}

function createServiceAccountJWT(creds: GSCCredentials): string {
  const now = Math.floor(Date.now() / 1000)
  const header = toBase64Url(Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })))
  const payload = toBase64Url(Buffer.from(JSON.stringify({
    iss: creds.client_email,
    sub: creds.client_email,
    scope: "https://www.googleapis.com/auth/webmasters.readonly",
    aud: creds.token_uri || "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })))
  const sigInput = `${header}.${payload}`
  const sign = createSign("RSA-SHA256")
  sign.update(sigInput)
  const sig = toBase64Url(sign.sign(creds.private_key))
  return `${sigInput}.${sig}`
}

async function fetchAccessToken(creds: GSCCredentials): Promise<string> {
  if (_tokenCache && Date.now() < _tokenCache.exp) return _tokenCache.token
  const jwt = createServiceAccountJWT(creds)
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`GSC token error ${res.status}: ${err}`)
  }
  const data = await res.json() as { access_token: string; expires_in: number }
  _tokenCache = { token: data.access_token, exp: Date.now() + (data.expires_in - 300) * 1000 }
  return data.access_token
}

export interface QueryGSCOptions {
  siteUrl?: string
  startDate: string   // YYYY-MM-DD
  endDate: string     // YYYY-MM-DD
  dimensions: GSCDimension[]
  rowLimit?: number
  startRow?: number
  dimensionFilterGroups?: unknown[]
}

export async function queryGSC(opts: QueryGSCOptions): Promise<GSCRow[]> {
  const creds = getGSCCredentials()
  if (!creds) throw new Error("GOOGLE_SC_KEY not configured")
  const token = await fetchAccessToken(creds)
  const siteUrl = opts.siteUrl || getGSCSiteUrl()
  const encodedSite = encodeURIComponent(siteUrl)

  const body: Record<string, unknown> = {
    startDate: opts.startDate,
    endDate: opts.endDate,
    dimensions: opts.dimensions,
    rowLimit: opts.rowLimit ?? 1000,
    startRow: opts.startRow ?? 0,
    dataState: "final",
  }
  if (opts.dimensionFilterGroups) body.dimensionFilterGroups = opts.dimensionFilterGroups

  const res = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodedSite}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  )

  if (res.status === 403) throw new Error("GSC 403: service account not added to Search Console property")
  if (res.status === 404) throw new Error(`GSC 404: site URL not found — check GOOGLE_SC_SITE_URL (current: ${siteUrl})`)
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`GSC API ${res.status}: ${err.slice(0, 300)}`)
  }

  const data = await res.json() as { rows?: Array<{ keys: string[]; clicks: number; impressions: number; ctr: number; position: number }> }
  if (!data.rows) return []

  return data.rows.map(row => {
    const result: Record<string, unknown> = { clicks: row.clicks, impressions: row.impressions, ctr: row.ctr, position: row.position }
    opts.dimensions.forEach((dim, i) => { result[dim] = row.keys[i] })
    return result as unknown as GSCRow
  })
}

// Fetch all rows, handling GSC's 1000-row pagination limit
export async function fetchAllGSCRows(opts: Omit<QueryGSCOptions, "rowLimit" | "startRow">): Promise<GSCRow[]> {
  const all: GSCRow[] = []
  let startRow = 0
  const BATCH = 1000
  while (true) {
    const batch = await queryGSC({ ...opts, rowLimit: BATCH, startRow })
    all.push(...batch)
    if (batch.length < BATCH) break
    startRow += BATCH
    if (startRow >= 5000) break // cap at 5000 rows to avoid runaway fetches
  }
  return all
}

// Date helpers
export function toGSCDate(d: Date): string {
  return d.toISOString().split("T")[0]
}

export function dateRange(daysBack: number, end = new Date()): { startDate: string; endDate: string } {
  const e = new Date(end)
  const s = new Date(end)
  s.setDate(s.getDate() - daysBack)
  return { startDate: toGSCDate(s), endDate: toGSCDate(e) }
}
