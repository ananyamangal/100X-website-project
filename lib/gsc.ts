/**
 * Google Search Console HTTP client.
 * Auth is handled by lib/google-oauth.ts — this module only does the API calls.
 *
 * Required env var:
 *   GOOGLE_SC_SITE_URL — GSC property URL (optional — falls back to 100xcircle.com)
 */

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

export function getGSCSiteUrl(): string {
  return (process.env.GOOGLE_SC_SITE_URL || "https://www.100xcircle.com/").trim()
}

export interface QueryGSCOptions {
  siteUrl?: string
  startDate: string   // YYYY-MM-DD
  endDate: string     // YYYY-MM-DD
  dimensions: GSCDimension[]
  rowLimit?: number
  startRow?: number
}

export async function queryGSC(opts: QueryGSCOptions, accessToken: string): Promise<GSCRow[]> {
  const siteUrl = opts.siteUrl || getGSCSiteUrl()
  const encodedSite = encodeURIComponent(siteUrl)

  const res = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodedSite}/searchAnalytics/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startDate: opts.startDate,
        endDate: opts.endDate,
        dimensions: opts.dimensions,
        rowLimit: opts.rowLimit ?? 1000,
        startRow: opts.startRow ?? 0,
        dataState: "final",
      }),
    }
  )

  if (res.status === 401) throw new Error("GSC 401: access token invalid or expired — reconnect your Google account")
  if (res.status === 403) throw new Error("GSC 403: your Google account does not have access to this Search Console property")
  if (res.status === 404) throw new Error(`GSC 404: property not found — check GOOGLE_SC_SITE_URL (current: ${siteUrl})`)
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`GSC API ${res.status}: ${err.slice(0, 300)}`)
  }

  const data = await res.json() as {
    rows?: Array<{ keys: string[]; clicks: number; impressions: number; ctr: number; position: number }>
  }
  if (!data.rows) return []

  return data.rows.map(row => {
    const result: Record<string, unknown> = {
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
    }
    opts.dimensions.forEach((dim, i) => { result[dim] = row.keys[i] })
    return result as unknown as GSCRow
  })
}

// Paginate through all rows (GSC max 1000/request, site cap 5000 for safety)
export async function fetchAllGSCRows(
  opts: Omit<QueryGSCOptions, "rowLimit" | "startRow">,
  accessToken: string
): Promise<GSCRow[]> {
  const all: GSCRow[] = []
  let startRow = 0
  const BATCH = 1000
  while (true) {
    const batch = await queryGSC({ ...opts, rowLimit: BATCH, startRow }, accessToken)
    all.push(...batch)
    if (batch.length < BATCH) break
    startRow += BATCH
    if (startRow >= 5000) break
  }
  return all
}

// Date helpers
export function toGSCDate(d: Date): string {
  return d.toISOString().split("T")[0]
}

export function dateRange(
  daysBack: number,
  end = new Date()
): { startDate: string; endDate: string } {
  const e = new Date(end)
  const s = new Date(end)
  s.setDate(s.getDate() - daysBack)
  return { startDate: toGSCDate(s), endDate: toGSCDate(e) }
}
