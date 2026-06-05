/**
 * Google Ads API client (GAQL — Google Ads Query Language).
 * Auth is handled by lib/google-oauth.ts — this module only does the API calls.
 *
 * Required env var:
 *   GOOGLE_ADS_DEVELOPER_TOKEN — from Google Ads API center → Tools → API Center
 *
 * All cost/CPC values from the API are in micros (millionths).
 * Use fromMicros() to convert to currency units.
 */

import clientPromise from "@/lib/mongodb"

const API_VERSION = "v24"
const BASE = `https://googleads.googleapis.com/${API_VERSION}`
const SETTINGS_DOC_ID = "ads-settings"

// ── Env ───────────────────────────────────────────────────────────────────────

export function getDeveloperToken(): string {
  return (process.env.GOOGLE_ADS_DEVELOPER_TOKEN || "").trim()
}

export function isDeveloperTokenConfigured(): boolean {
  return !!getDeveloperToken()
}

function adsHeaders(accessToken: string, loginCustomerId?: string): Record<string, string> {
  const h: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "developer-token": getDeveloperToken(),
    "Content-Type": "application/json",
  }
  if (loginCustomerId) h["login-customer-id"] = loginCustomerId
  return h
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AdsCustomer {
  customerId: string
  descriptiveName: string
  currencyCode: string
  isManager: boolean
}

export interface AdsSettings {
  customerId: string
  customerName: string
  currencyCode: string
  loginCustomerId?: string
  savedAt: string
}

// ── Account discovery ─────────────────────────────────────────────────────────

export async function listAccessibleCustomerIds(accessToken: string): Promise<string[]> {
  const url = `${BASE}/customers:listAccessibleCustomers`
  console.log("[Ads] listAccessibleCustomers →", "GET", url)
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "developer-token": getDeveloperToken(),
    },
  })
  console.log("[Ads] listAccessibleCustomers ←", res.status, res.headers.get("content-type"))
  if (!res.ok) {
    const body = await res.text()
    console.error("[Ads] listAccessibleCustomers error body:", body.slice(0, 500))
    throw new Error(`Ads listAccessibleCustomers ${res.status}: ${body.slice(0, 500)}`)
  }
  const data = await res.json() as { resourceNames?: string[] }
  return (data.resourceNames || []).map(r => r.replace("customers/", ""))
}

export async function discoverCustomers(accessToken: string): Promise<AdsCustomer[]> {
  const ids = await listAccessibleCustomerIds(accessToken)
  const results = await Promise.allSettled(
    ids.slice(0, 20).map(async id => {
      try {
        const rows = await searchAds(id, "SELECT customer.id, customer.descriptive_name, customer.currency_code, customer.manager FROM customer LIMIT 1", accessToken)
        const r = rows[0] as { customer?: { id?: unknown; descriptiveName?: unknown; currencyCode?: unknown; manager?: unknown } }
        return {
          customerId: String(r?.customer?.id ?? id),
          descriptiveName: String(r?.customer?.descriptiveName ?? `Account ${id}`),
          currencyCode: String(r?.customer?.currencyCode ?? "INR"),
          isManager: Boolean(r?.customer?.manager),
        } satisfies AdsCustomer
      } catch {
        return { customerId: id, descriptiveName: `Account ${id}`, currencyCode: "INR", isManager: false } satisfies AdsCustomer
      }
    })
  )
  return results.filter((r): r is PromiseFulfilledResult<AdsCustomer> => r.status === "fulfilled").map(r => r.value)
}

// ── GAQL search (auto-paginated) ──────────────────────────────────────────────

export async function searchAds(
  customerId: string,
  query: string,
  accessToken: string,
  loginCustomerId?: string,
): Promise<Record<string, unknown>[]> {
  const url = `${BASE}/customers/${customerId}/googleAds:search`
  console.log("[Ads] searchAds →", "POST", url, { loginCustomerId: loginCustomerId ?? "(none)" })
  const all: Record<string, unknown>[] = []
  let pageToken: string | undefined

  do {
    const body: Record<string, unknown> = { query, pageSize: 1000 }
    if (pageToken) body.pageToken = pageToken

    const res = await fetch(url, {
      method: "POST",
      headers: adsHeaders(accessToken, loginCustomerId),
      body: JSON.stringify(body),
    })
    console.log("[Ads] searchAds ←", res.status, res.headers.get("content-type"), `(customer ${customerId})`)
    if (!res.ok) {
      const text = await res.text()
      console.error("[Ads] searchAds error body:", text.slice(0, 500))
      throw new Error(`Ads API ${res.status} (customer ${customerId}): ${text.slice(0, 500)}`)
    }
    const data = await res.json() as { results?: Record<string, unknown>[]; nextPageToken?: string }
    all.push(...(data.results || []))
    pageToken = data.nextPageToken
  } while (pageToken && all.length < 5000)

  return all
}

// ── Settings ──────────────────────────────────────────────────────────────────

export async function getAdsSettings(): Promise<AdsSettings | null> {
  const db = (await clientPromise).db()
  const doc = await db.collection("ads_settings").findOne({ _docId: SETTINGS_DOC_ID })
  if (!doc?.customerId) return null
  return {
    customerId: doc.customerId as string,
    customerName: doc.customerName as string,
    currencyCode: doc.currencyCode as string,
    loginCustomerId: doc.loginCustomerId as string | undefined,
    savedAt: doc.savedAt as string,
  }
}

export async function saveAdsSettings(s: Omit<AdsSettings, "savedAt">): Promise<void> {
  const db = (await clientPromise).db()
  await db.collection("ads_settings").updateOne(
    { _docId: SETTINGS_DOC_ID },
    { $set: { ...s, savedAt: new Date().toISOString(), _docId: SETTINGS_DOC_ID } },
    { upsert: true }
  )
}

// ── Micros → currency ─────────────────────────────────────────────────────────

export function fromMicros(v: unknown): number {
  return Math.round(Number(v ?? 0) / 1_000_000 * 100) / 100
}

// ── GAQL queries ──────────────────────────────────────────────────────────────

export const QUERIES = {
  campaigns: `
    SELECT
      campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type,
      metrics.cost_micros, metrics.clicks, metrics.impressions,
      metrics.ctr, metrics.average_cpc, metrics.conversions, metrics.cost_per_conversion
    FROM campaign
    WHERE segments.date DURING LAST_30_DAYS
      AND campaign.status != 'REMOVED'
    ORDER BY metrics.cost_micros DESC
    LIMIT 50
  `.trim(),

  keywords: `
    SELECT
      ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type,
      campaign.name, ad_group.name,
      metrics.cost_micros, metrics.clicks, metrics.impressions,
      metrics.ctr, metrics.average_cpc, metrics.conversions
    FROM keyword_view
    WHERE segments.date DURING LAST_30_DAYS
      AND ad_group_criterion.status != 'REMOVED'
    ORDER BY metrics.clicks DESC
    LIMIT 100
  `.trim(),

  searchTerms: `
    SELECT
      search_term_view.search_term, search_term_view.status,
      campaign.name, ad_group.name,
      metrics.cost_micros, metrics.clicks, metrics.impressions,
      metrics.ctr, metrics.average_cpc, metrics.conversions
    FROM search_term_view
    WHERE segments.date DURING LAST_30_DAYS
    ORDER BY metrics.clicks DESC
    LIMIT 100
  `.trim(),

  devices: `
    SELECT
      segments.device,
      metrics.cost_micros, metrics.clicks, metrics.impressions,
      metrics.ctr, metrics.average_cpc, metrics.conversions
    FROM campaign
    WHERE segments.date DURING LAST_30_DAYS
      AND campaign.status != 'REMOVED'
    ORDER BY metrics.cost_micros DESC
  `.trim(),

  locations: `
    SELECT
      geographic_view.country_criterion_id, geographic_view.location_type,
      metrics.cost_micros, metrics.clicks, metrics.impressions, metrics.conversions
    FROM geographic_view
    WHERE segments.date DURING LAST_30_DAYS
    ORDER BY metrics.cost_micros DESC
    LIMIT 50
  `.trim(),

  conversions: `
    SELECT
      conversion_action.name, conversion_action.category,
      metrics.conversions, metrics.cost_per_conversion, metrics.all_conversions
    FROM conversion_action
    WHERE segments.date DURING LAST_30_DAYS
      AND metrics.conversions > 0
    ORDER BY metrics.conversions DESC
  `.trim(),
}
