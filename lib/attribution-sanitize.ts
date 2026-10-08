/**
 * Whitelist + length-cap an `attribution` object received from a lead form
 * before it is stored. Additive helper: returns undefined when there is
 * nothing usable, so callers can omit the field entirely.
 */
const ALLOWED_KEYS = [
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
  "landingPage",
  "firstPageVisited",
  "entryReferrer",
  "sessionPageCount",
  "sessionStart",
] as const

const MAX_VALUE_LENGTH = 300

export function sanitizeAttribution(input: unknown): Record<string, string> | undefined {
  if (!input || typeof input !== "object" || Array.isArray(input)) return undefined
  const src = input as Record<string, unknown>
  const out: Record<string, string> = {}
  for (const key of ALLOWED_KEYS) {
    const v = src[key]
    if (typeof v === "string" && v.trim()) out[key] = v.trim().slice(0, MAX_VALUE_LENGTH)
  }
  return Object.keys(out).length ? out : undefined
}
