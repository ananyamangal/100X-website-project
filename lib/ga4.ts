/**
 * Google Analytics 4 API client.
 * Auth is handled by lib/google-oauth.ts — this module only does the API calls.
 *
 * Uses:
 *   GA4 Admin API v1beta — list properties
 *   GA4 Data API v1beta  — run reports
 */

import clientPromise from "@/lib/mongodb"

const SETTINGS_DOC_ID = "ga4-settings"

// ── Property types ────────────────────────────────────────────────────────────

export interface GA4Property {
  propertyId: string   // numeric string e.g. "123456789"
  displayName: string
  accountName: string
}

export interface GA4Settings {
  propertyId: string
  propertyName: string
  accountName: string
  savedAt: string
}

// ── Property listing (Admin API) ──────────────────────────────────────────────

export async function listGA4Properties(accessToken: string): Promise<GA4Property[]> {
  const res = await fetch("https://analyticsadmin.googleapis.com/v1beta/accountSummaries", {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`GA4 Admin API ${res.status}: ${body.slice(0, 500)}`)
  }
  const data = await res.json() as {
    accountSummaries?: Array<{
      displayName: string
      propertySummaries?: Array<{ property: string; displayName: string }>
    }>
  }
  const properties: GA4Property[] = []
  for (const account of data.accountSummaries || []) {
    for (const prop of account.propertySummaries || []) {
      properties.push({
        propertyId: prop.property.replace("properties/", ""),
        displayName: prop.displayName,
        accountName: account.displayName,
      })
    }
  }
  return properties
}

// ── Settings persistence ──────────────────────────────────────────────────────

export async function getGA4Settings(): Promise<GA4Settings | null> {
  const db = (await clientPromise).db()
  const doc = await db.collection("ga4_settings").findOne({ _docId: SETTINGS_DOC_ID })
  if (!doc?.propertyId) return null
  return {
    propertyId: doc.propertyId as string,
    propertyName: doc.propertyName as string,
    accountName: doc.accountName as string,
    savedAt: doc.savedAt as string,
  }
}

export async function saveGA4Settings(settings: Omit<GA4Settings, "savedAt">): Promise<void> {
  const db = (await clientPromise).db()
  await db.collection("ga4_settings").updateOne(
    { _docId: SETTINGS_DOC_ID },
    { $set: { ...settings, savedAt: new Date().toISOString(), _docId: SETTINGS_DOC_ID } },
    { upsert: true }
  )
}

// ── Data API ──────────────────────────────────────────────────────────────────

export interface GA4ReportRow {
  [key: string]: string | number
}

interface RunReportOptions {
  propertyId: string
  dimensions: string[]
  metrics: string[]
  startDate: string
  endDate: string
  limit?: number
  orderBy?: Array<{ metric: { metricName: string }; desc?: boolean }>
}

export async function runGA4Report(opts: RunReportOptions, accessToken: string): Promise<GA4ReportRow[]> {
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${opts.propertyId}:runReport`
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      dimensions: opts.dimensions.map(name => ({ name })),
      metrics: opts.metrics.map(name => ({ name })),
      dateRanges: [{ startDate: opts.startDate, endDate: opts.endDate }],
      limit: opts.limit ?? 1000,
      orderBys: (opts.orderBy ?? []).map(o => ({ metric: o.metric, desc: o.desc ?? true })),
    }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`GA4 Data API ${res.status} (property ${opts.propertyId}): ${body.slice(0, 500)}`)
  }
  const data = await res.json() as {
    rows?: Array<{
      dimensionValues: Array<{ value: string }>
      metricValues: Array<{ value: string }>
    }>
  }
  if (!data.rows) return []
  return data.rows.map(row => {
    const result: GA4ReportRow = {}
    opts.dimensions.forEach((dim, i) => { result[dim] = row.dimensionValues[i]?.value ?? "" })
    opts.metrics.forEach((metric, i) => {
      result[metric] = parseFloat(row.metricValues[i]?.value ?? "0") || 0
    })
    return result
  })
}

// ── Date helpers ──────────────────────────────────────────────────────────────

export function ga4DateRange(daysBack: number, end = new Date()): { startDate: string; endDate: string } {
  const e = new Date(end)
  const s = new Date(end)
  s.setDate(s.getDate() - daysBack)
  return {
    startDate: s.toISOString().split("T")[0],
    endDate: e.toISOString().split("T")[0],
  }
}
