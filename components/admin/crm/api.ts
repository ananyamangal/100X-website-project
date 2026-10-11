// Thin client for /api/crm/*. Browser-only. No secrets, no caching.

export class ApiError extends Error {
  status: number
  code: string
  fields: Record<string, string>
  required: string[]
  headers: string[]
  detail: Record<string, unknown>
  constructor(status: number, code: string, fields: Record<string, string> = {}, required: string[] = [], headers: string[] = [], detail: Record<string, unknown> = {}) {
    super(code)
    this.status = status
    this.code = code
    this.fields = fields
    this.required = required
    this.headers = headers
    this.detail = detail
  }
}

export async function crmFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const isForm = typeof FormData !== "undefined" && init.body instanceof FormData
  const res = await fetch(path, {
    ...init,
    cache: "no-store",
    credentials: "same-origin",
    headers: {
      ...(init.body && !isForm ? { "Content-Type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
  })
  if (res.status === 401) {
    if (typeof window !== "undefined") window.location.href = "/admin/login?reason=session_expired"
    throw new ApiError(401, "unauthorized")
  }
  let body: unknown = null
  try {
    body = await res.json()
  } catch {
    /* non-JSON body */
  }
  if (!res.ok) {
    const b = (body ?? {}) as { error?: string; fields?: Record<string, string>; required?: string[]; headers?: string[]; detail?: unknown }
    const detail = b.detail && typeof b.detail === "object" && !Array.isArray(b.detail) ? (b.detail as Record<string, unknown>) : {}
    throw new ApiError(res.status, b.error ?? "request_failed", b.fields ?? {}, b.required ?? [], Array.isArray(b.headers) ? b.headers : [], detail)
  }
  return body as T
}

export function qs(params: Record<string, string | number | null | undefined>): string {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) if (v !== null && v !== undefined && v !== "") sp.set(k, String(v))
  const s = sp.toString()
  return s ? `?${s}` : ""
}

const FIELD_TEXT: Record<string, string> = {
  required: "This is required.",
  invalid_phone: "That does not look like a valid mobile number.",
  too_long: "Too long.",
  invalid_enum: "Pick one of the options.",
  invalid_number: "Enter a valid number.",
  required_with_quantity: "Add the product when you enter a quantity.",
  unknown_user: "That person cannot be assigned.",
  invalid_id: "Invalid selection.",
  csv_only: "Please upload a .csv file.",
  not_text: "Text only, please.",
  invalid_email: "That does not look like a valid email address.",
  no_email_on_contact: "This customer has no email address. Enter one.",
}

export function fieldText(code: string | undefined): string | null {
  if (!code) return null
  return FIELD_TEXT[code] ?? code.replace(/_/g, " ")
}

// Specific server error codes (quotations, sends). Checked before the generic status messages.
const ERROR_TEXT: Record<string, string> = {
  audience_too_large: "That CSV is too big to store (too many columns or rows). Remove unused columns and try again.",
  not_draft: "This quotation is already issued, so it cannot be edited. Start a revision instead.",
  not_issued: "Issue the quotation first.",
  not_latest: "A newer revision exists. Open the latest version.",
  revision_exists: "A revision draft already exists for this quotation.",
  empty_quotation: "Add at least one item with a price before issuing.",
  matches_internal_note: "This text matches an internal note, and internal notes can never be sent to a customer. Rephrase it.",
  conflict: "Someone else just changed this quotation. Reload and try again.",
  window_closed: "The customer has not messaged in the last 24 hours, so only an approved template can be sent.",
  template_unknown: "The WhatsApp quotation template is not set up yet. Send it by email, or ask the owner to get the template approved.",
  template_not_approved: "The WhatsApp quotation template is not approved yet.",
  template_paused: "The WhatsApp quotation template is paused by Meta.",
  not_on_whatsapp: "This number is not on WhatsApp.",
  opted_out: "This customer opted out of promotional messages; outside their 24-hour window nothing can be sent on WhatsApp.",
  sending_paused: "WhatsApp sending is paused for this number. Check the CRM health page.",
  tier_cap: "Today's WhatsApp sending limit is reached. Try again later or send by email.",
  media_upload_failed: "Uploading the PDF to WhatsApp failed. Try again.",
  send_failed: "WhatsApp did not accept the message. Check the timeline for the reason, then try again.",
  whatsapp_not_configured: "WhatsApp is not connected yet.",
  email_not_configured: "Email sending is not configured.",
  email_failed: "The email could not be sent. Try again.",
}

export function errorText(e: unknown): string {
  if (e instanceof UiError) return e.message
  if (e instanceof ApiError) {
    if (e.status === 403) return "You do not have access to this."
    if (e.status === 404) return "Not found (it may have been removed or is not assigned to you)."
    if (e.status === 413 && e.code !== "audience_too_large") return "That file is too large (2 MB maximum)."
    const special = Object.hasOwn(ERROR_TEXT, e.code) ? ERROR_TEXT[e.code] : null
    if (special) return special
    if (e.status === 503) return "Permissions are temporarily unavailable. Please try again."
    if (e.status === 409 && e.code === "other_open_deal") return "This customer already has another open deal. Close that one first."
    if (e.status === 409 && e.code === "stage_conflict") return "Someone else just changed this stage. Reload and try again."
    if (e.status === 409 && e.code === "deal_closed") return "This deal is closed, so it cannot be changed."
    if (e.status === 400 && Object.keys(e.fields).length) return Object.entries(e.fields).map(([k, v]) => `${k}: ${fieldText(v)}`).join("; ")
    return "Something went wrong. Please try again."
  }
  return "Network problem. Please check your connection and try again."
}

/** An error whose message is already written for the user. */
export class UiError extends Error {}

/**
 * Whether a send's idempotency key must be replaced before the user tries again. A definite failure
 * (the server answered and nothing can still go out) gets a new key, or the retry would dedupe to
 * the failed row. An uncertain one (no answer, a retry queued, or an unknown Graph outcome) keeps it,
 * so pressing Send again can never produce a second copy.
 */
export function rotateKeyAfter(e: unknown): boolean {
  if (!(e instanceof ApiError)) return false
  return !(e.detail.retryQueued === true || e.detail.outcomeUnknown === true)
}

/** A 200 dedupe can return an earlier attempt that failed: that is not a successful send. */
export function sentMessageFailed(r: unknown): boolean {
  const m = (r as { message?: { status?: unknown } } | null)?.message
  return !!m && m.status === "failed"
}
