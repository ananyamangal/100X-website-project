/**
 * GTM / GA4 dataLayer helpers — consistent attribution + page context on every push.
 */

const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
  "msclkid",
] as const

export const ATTRIBUTION_STORAGE_KEY = "attribution_v1"

export const CONTACT_LEAD_CTX_KEY = "contact_lead_ctx"
export const BROCHURE_LEAD_CTX_KEY = "brochure_lead_ctx"
export const QUOTE_LEAD_CTX_KEY = "quote_lead_ctx"

export type PersistedAttribution = Record<string, string>

export function mergePersistedAttributionFromUrl(): void {
  if (typeof window === "undefined") return
  const params = new URLSearchParams(window.location.search)
  const next: PersistedAttribution = {}
  for (const k of UTM_KEYS) {
    const v = params.get(k)
    if (v) next[k] = v
  }
  if (!Object.keys(next).length) return
  try {
    const prev = JSON.parse(
      sessionStorage.getItem(ATTRIBUTION_STORAGE_KEY) || "{}",
    ) as PersistedAttribution
    sessionStorage.setItem(
      ATTRIBUTION_STORAGE_KEY,
      JSON.stringify({ ...prev, ...next }),
    )
  } catch {
    sessionStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(next))
  }
}

export function getPersistedAttribution(): PersistedAttribution {
  if (typeof window === "undefined") return {}
  try {
    return JSON.parse(
      sessionStorage.getItem(ATTRIBUTION_STORAGE_KEY) || "{}",
    ) as PersistedAttribution
  } catch {
    return {}
  }
}

export function buildGtmBaseContext(
  overrides?: Record<string, unknown>,
): Record<string, unknown> {
  const attribution = getPersistedAttribution()
  const base: Record<string, unknown> = {
    page_path:
      typeof window !== "undefined" ? window.location.pathname : "",
    page_url: typeof window !== "undefined" ? window.location.href : "",
    timestamp_iso: new Date().toISOString(),
    ...attribution,
  }
  if (overrides) Object.assign(base, overrides)
  return base
}

export function pushDataLayer(payload: Record<string, unknown>): void {
  if (typeof window === "undefined") return
  const w = window as Window & { dataLayer?: unknown[] }
  w.dataLayer = w.dataLayer || []
  w.dataLayer.push(buildGtmBaseContext(payload))
}

export function setContactLeadContext(ctx: Record<string, unknown>): void {
  sessionStorage.setItem(
    CONTACT_LEAD_CTX_KEY,
    JSON.stringify({
      ...ctx,
      saved_at: new Date().toISOString(),
    }),
  )
}

export function readContactLeadContext(): Record<string, unknown> | null {
  const raw = sessionStorage.getItem(CONTACT_LEAD_CTX_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    return null
  }
}

export function setBrochureLeadContext(ctx: Record<string, unknown>): void {
  sessionStorage.setItem(
    BROCHURE_LEAD_CTX_KEY,
    JSON.stringify({
      ...ctx,
      saved_at: new Date().toISOString(),
    }),
  )
}

export function readBrochureLeadContext(): Record<string, unknown> | null {
  const raw = sessionStorage.getItem(BROCHURE_LEAD_CTX_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    return null
  }
}

export function setQuoteLeadContext(ctx: Record<string, unknown>): void {
  sessionStorage.setItem(
    QUOTE_LEAD_CTX_KEY,
    JSON.stringify({
      ...ctx,
      saved_at: new Date().toISOString(),
    }),
  )
}

export function readQuoteLeadContext(): Record<string, unknown> | null {
  const raw = sessionStorage.getItem(QUOTE_LEAD_CTX_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    return null
  }
}
