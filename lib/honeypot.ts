// Honeypot (owner-approved item A7, 2026-10-09).
//
// Every public lead form renders <HoneypotField /> (components/forms/HoneypotField.tsx):
// an off-screen, aria-hidden, tabIndex -1, autocomplete="off" text input with no label.
// Humans never see or reach it, so they always send an empty string; form-filling bots
// tend to fill every text input. Each form sends the value in its POST body and every
// receiving route calls isHoneypotFilled() first: a filled value gets a normal-looking
// success response, one console.warn line (timestamp, route, page path; no lead data)
// and is neither saved nor e-mailed. An empty or absent value changes nothing, so old
// cached clients that never send the field keep saving.
//
// Field name: "website" -- unremarkable to bots, and (unlike the old "company_website")
// it does not contain "company", which Chrome's address-autofill heuristics map to the
// organisation name. That match is how real buyers' browsers filled the old decoy (see
// the history notes in BrochureLeadModal / ContactSection / LandingFormBlock).
//
// This file is shared by client components and route handlers: no server-only imports.

/** The name the forms send. */
export const HONEYPOT_FIELD = "website"

/**
 * Every body key the server treats as the honeypot. "website" is the one the forms send
 * now; the others were already recognised by /api/submissions (company_website is what the
 * pre-A7 forms rendered, so a bot that scraped an old page still trips it).
 */
export const HONEYPOT_FIELDS = ["website", "company_website", "hp", "url"] as const

/** True when any honeypot key in the body carries a non-blank string. */
export function isHoneypotFilled(body: unknown): boolean {
  if (!body || typeof body !== "object") return false
  const rec = body as Record<string, unknown>
  return HONEYPOT_FIELDS.some((k) => typeof rec[k] === "string" && (rec[k] as string).trim() !== "")
}

/** A copy of the body without any honeypot key (so it is never stored or e-mailed). */
export function withoutHoneypot<T extends Record<string, unknown>>(body: T): T {
  const out = { ...body }
  for (const k of HONEYPOT_FIELDS) delete out[k]
  return out
}

/** Reads the honeypot value from a form element synchronously (call before any await). */
export function readHoneypot(form: HTMLFormElement | null | undefined): string {
  if (!form) return ""
  const el = form.elements.namedItem(HONEYPOT_FIELD)
  return el && "value" in el && typeof (el as HTMLInputElement).value === "string"
    ? (el as HTMLInputElement).value
    : ""
}

function pathOnly(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return ""
  const v = value.trim()
  let p = v
  if (/^https?:\/\//i.test(v)) {
    try {
      p = new URL(v).pathname
    } catch {
      return ""
    }
  }
  if (!p.startsWith("/")) return ""
  // Path only: no query string or fragment (they can carry identifiers), no control
  // characters or spaces (one log line), capped.
  return p.split(/[?#]/)[0].replace(/[\u0000-\u001f\u007f\s]/g, "").slice(0, 200)
}

/**
 * The page a submission came from, as a bare path: the body's form_page_path / pagePath /
 * page, else the path of form_page_url / pageUrl, else the Referer header's path.
 */
export function honeypotPagePath(body: unknown, referer?: string | null): string {
  const rec = body && typeof body === "object" ? (body as Record<string, unknown>) : {}
  for (const v of [rec.form_page_path, rec.pagePath, rec.page, rec.form_page_url, rec.pageUrl, referer]) {
    const p = pathOnly(v)
    if (p) return p
  }
  return "unknown"
}

/** The single log line for a discarded submission. No lead data, no PII. */
export function honeypotLogLine(route: string, page: string, now: Date = new Date()): string {
  return `[honeypot] discarded submission at=${now.toISOString()} route=${route} page=${page}`
}

/**
 * A 24-hex-character id shaped like a MongoDB ObjectId, for success responses that
 * normally carry the inserted id. Nothing is inserted, so it matches no document.
 */
export function decoyId(): string {
  const bytes = new Uint8Array(12)
  globalThis.crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
}

/** Logs a discarded submission (one console.warn line). */
export function logHoneypotDiscard(route: string, body: unknown, referer?: string | null, now: Date = new Date()): void {
  console.warn(honeypotLogLine(route, honeypotPagePath(body, referer), now))
}
