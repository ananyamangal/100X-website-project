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
  "gbraid",
  "wbraid",
  "fbclid",
  "msclkid",
] as const

/** Campaign touch (utm_*, click ids): localStorage, 30-day expiry. */
export const ATTRIBUTION_STORAGE_KEY = "attribution_v1"
/** Per-visit fields (landingPage, sessionPageCount...): sessionStorage. */
export const SESSION_ATTRIBUTION_STORAGE_KEY = "attribution_session_v1"
export const ATTRIBUTION_TTL_MS = 30 * 24 * 60 * 60 * 1000

export const CONTACT_LEAD_CTX_KEY = "contact_lead_ctx"
export const BROCHURE_LEAD_CTX_KEY = "brochure_lead_ctx"
export const QUOTE_LEAD_CTX_KEY = "quote_lead_ctx"

export type PersistedAttribution = Record<string, string>

interface StoredCampaign {
  ts: number
  data: PersistedAttribution
}

/** Parse a stored campaign wrapper; null when malformed or older than 30 days. */
export function parseStoredCampaign(
  raw: string | null,
  now: number = Date.now(),
): PersistedAttribution | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<StoredCampaign> | null
    if (!parsed || typeof parsed.ts !== "number" || !parsed.data || typeof parsed.data !== "object") {
      return null
    }
    if (now - parsed.ts > ATTRIBUTION_TTL_MS || parsed.ts > now + 60_000) return null
    const out: PersistedAttribution = {}
    for (const [k, v] of Object.entries(parsed.data)) {
      if (typeof v === "string") out[k] = v
    }
    return out
  } catch {
    return null
  }
}

function readCampaign(now: number = Date.now()): PersistedAttribution {
  try {
    const fromLocal = parseStoredCampaign(localStorage.getItem(ATTRIBUTION_STORAGE_KEY), now)
    if (fromLocal) return fromLocal
    // Expired or missing: clear a stale local entry (best effort).
    try {
      if (localStorage.getItem(ATTRIBUTION_STORAGE_KEY)) localStorage.removeItem(ATTRIBUTION_STORAGE_KEY)
    } catch {
      /* ignore */
    }
  } catch {
    /* localStorage unavailable — fall back to sessionStorage */
  }
  try {
    const fromSession = parseStoredCampaign(sessionStorage.getItem(ATTRIBUTION_STORAGE_KEY), now)
    if (fromSession) return fromSession
    if (sessionStorage.getItem(ATTRIBUTION_STORAGE_KEY)) sessionStorage.removeItem(ATTRIBUTION_STORAGE_KEY)
  } catch {
    /* ignore */
  }
  return {}
}

function writeCampaign(data: PersistedAttribution, now: number = Date.now()): void {
  const payload = JSON.stringify({ ts: now, data } satisfies StoredCampaign)
  try {
    localStorage.setItem(ATTRIBUTION_STORAGE_KEY, payload)
    return
  } catch {
    /* fall through to sessionStorage */
  }
  try {
    sessionStorage.setItem(ATTRIBUTION_STORAGE_KEY, payload)
  } catch {
    /* no storage available */
  }
}

function readSessionFields(): PersistedAttribution {
  try {
    return JSON.parse(
      sessionStorage.getItem(SESSION_ATTRIBUTION_STORAGE_KEY) || "{}",
    ) as PersistedAttribution
  } catch {
    return {}
  }
}

function writeSessionFields(data: PersistedAttribution): void {
  try {
    sessionStorage.setItem(SESSION_ATTRIBUTION_STORAGE_KEY, JSON.stringify(data))
  } catch {
    /* sessionStorage unavailable — no-op */
  }
}

/**
 * Merge utm_* / click ids from the URL into the 30-day campaign store.
 * Values present in the URL overwrite stored ones (so a new gclid/gbraid/wbraid
 * always wins); keys absent from the URL keep their stored value.
 */
export function mergePersistedAttributionFromUrl(): void {
  if (typeof window === "undefined") return
  const params = new URLSearchParams(window.location.search)
  const next: PersistedAttribution = {}
  for (const k of UTM_KEYS) {
    const v = params.get(k)
    if (v) next[k] = v
  }
  if (!Object.keys(next).length) return
  writeCampaign({ ...readCampaign(), ...next })
}

/**
 * Called on every page navigation. On the first call of a session, records
 * landingPage, firstPageVisited, entryReferrer, and sessionStart. On every
 * subsequent call, increments sessionPageCount. UTM params are merged
 * separately by mergePersistedAttributionFromUrl().
 */
export function initSessionAttribution(): void {
  if (typeof window === "undefined") return
  try {
    const path = window.location.pathname
    const existing = readSessionFields()
    if (!existing.landingPage) {
      // First page of this session — record entry context
      writeSessionFields({
        ...existing,
        landingPage: path,
        firstPageVisited: path,
        entryReferrer: document.referrer || "",
        sessionPageCount: "1",
        sessionStart: new Date().toISOString(),
      })
    } else {
      const count = parseInt(existing.sessionPageCount || "1", 10)
      writeSessionFields({ ...existing, sessionPageCount: String(count + 1) })
    }
  } catch {
    // storage unavailable — no-op
  }
}

export function getPersistedAttribution(): PersistedAttribution {
  if (typeof window === "undefined") return {}
  try {
    return { ...readCampaign(), ...readSessionFields() }
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
