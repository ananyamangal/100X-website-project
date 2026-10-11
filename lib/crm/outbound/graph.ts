/**
 * WhatsApp Cloud API client for OUTBOUND sends:
 * text, template, document, image, audio.
 *
 * - Every send function takes a `SendPass` from lib/crm/outbound/gate.ts and consumes it: no pass,
 *   a reused/expired pass, or a payload that differs from what the gate approved → GatePassError,
 *   and Meta is never called. The recipient and the sending phone_number_id come from the pass.
 * - Text arguments are `OutboundText` only (minted in compose.ts).
 * - Token: `CRM_WA_ACCESS_TOKEN` as a Bearer header only, never in a URL, error or log field.
 * - Timeouts via AbortSignal.timeout. A timeout / network error after the request left is an
 *   UNKNOWN outcome (Meta may have accepted it): reported as `outcomeUnknown`, never auto-retried.
 * - Meta errors are parsed to {code, subcode, type, title, detail, fbtraceId}; URLs and long digit
 *   runs (phone numbers) are masked so a returned error is safe to log and store.
 * - `fetch` is injectable; tests never reach Meta.
 */
import type { OutboundText } from "../model"
import { consumePass, GatePassError, type PassData, type SendPass } from "./gate"

export type FetchLike = (
  input: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string | FormData; signal?: AbortSignal },
) => Promise<Response>

export const DEFAULT_GRAPH_API_VERSION = "v23.0"
export const GRAPH_SEND_TIMEOUT_MS = 15_000
const GRAPH_ORIGIN = "https://graph.facebook.com"

export interface GraphConfig {
  accessToken: string
  apiVersion: string
  fetch: FetchLike
  timeoutMs: number
}

/** null when CRM_WA_ACCESS_TOKEN is unset (callers answer 503 not_configured). */
export function graphConfigFrom(
  env: { waAccessToken?: string | undefined; waApiVersion?: string | undefined },
  fetchImpl?: FetchLike,
  timeoutMs: number = GRAPH_SEND_TIMEOUT_MS,
): GraphConfig | null {
  const token = env.waAccessToken?.trim()
  if (!token) return null
  const version = (env.waApiVersion?.trim() || DEFAULT_GRAPH_API_VERSION).replace(/^\/+|\/+$/g, "")
  return { accessToken: token, apiVersion: version, fetch: fetchImpl ?? ((u, i) => fetch(u, i)), timeoutMs }
}

// ─────────────────────────────────────────────────────────────────────────────
// Errors
// ─────────────────────────────────────────────────────────────────────────────

export interface GraphError {
  kind: "http" | "timeout" | "network" | "bad_response"
  httpStatus: number | null
  /** Meta error code (e.g. 131026, 131047, 132001), null when none was returned. */
  code: number | null
  subcode: number | null
  type: string | null
  title: string
  detail: string | null
  fbtraceId: string | null
  /** Safe to retry automatically (rate limits, temporary Meta errors, 5xx). */
  retryable: boolean
  /** The request may have reached Meta: never resend automatically (DATA_MODEL §5). */
  outcomeUnknown: boolean
}

export type GraphSendResult = { ok: true; wamid: string } | { ok: false; error: GraphError }

/** Retryable Meta codes: throughput 130429, pair rate 131056, temporary 131000/131016, generic 1/2/4/17/341/80007. */
const RETRYABLE_META_CODES = new Set([1, 2, 4, 17, 341, 80007, 130429, 131000, 131016, 131056])

/** Masks URLs and digit runs of 7+ (phone numbers) and clips. */
export function scrubMetaText(v: unknown, max = 300): string | null {
  if (typeof v !== "string" || !v) return null
  return v.replace(/https?:\/\/\S+/gi, "[url]").replace(/\+?\d[\d\s-]{6,}\d/g, "[num]").slice(0, max)
}

export function parseMetaError(httpStatus: number, body: unknown): GraphError {
  const e = body && typeof body === "object" && "error" in body ? (body as { error: unknown }).error : null
  const o: Record<string, unknown> = e && typeof e === "object" ? (e as Record<string, unknown>) : {}
  const code = typeof o.code === "number" ? o.code : null
  const subcode = typeof o.error_subcode === "number" ? o.error_subcode : null
  const data = o.error_data && typeof o.error_data === "object" ? (o.error_data as Record<string, unknown>) : {}
  return {
    kind: "http",
    httpStatus,
    code,
    subcode,
    type: scrubMetaText(o.type, 80),
    title: scrubMetaText(o.error_user_title, 200) ?? scrubMetaText(o.message, 200) ?? `HTTP ${httpStatus}`,
    detail: scrubMetaText(data.details) ?? scrubMetaText(o.error_user_msg),
    fbtraceId: scrubMetaText(o.fbtrace_id, 80),
    retryable: httpStatus >= 500 || httpStatus === 429 || (code !== null && RETRYABLE_META_CODES.has(code)),
    outcomeUnknown: false,
  }
}

const isAbort = (e: unknown) => e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")

const transportError = (kind: "timeout" | "network" | "bad_response", title: string, httpStatus: number | null = null): GraphError => ({
  kind,
  httpStatus,
  code: null,
  subcode: null,
  type: null,
  title,
  detail: null,
  fbtraceId: null,
  retryable: false,
  outcomeUnknown: true,
})

// ─────────────────────────────────────────────────────────────────────────────
// Transport
// ─────────────────────────────────────────────────────────────────────────────

export type GraphJsonResult = { ok: true; status: number; json: unknown } | { ok: false; error: GraphError }

/** One Graph request. `path` is built by our own code only (ids are URI-encoded by callers). */
export async function graphRequest(cfg: GraphConfig, method: "GET" | "POST", path: string, body?: unknown): Promise<GraphJsonResult> {
  const url = `${GRAPH_ORIGIN}/${cfg.apiVersion}/${path.replace(/^\/+/, "")}`
  let res: Response
  try {
    res = await cfg.fetch(url, {
      method,
      headers: { Authorization: `Bearer ${cfg.accessToken}`, ...(body !== undefined ? { "Content-Type": "application/json" } : {}) },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(cfg.timeoutMs),
    })
  } catch (e) {
    return { ok: false, error: isAbort(e) ? transportError("timeout", "Graph request timed out") : transportError("network", "Graph network error") }
  }
  let json: unknown = null
  try {
    json = await res.json()
  } catch {
    json = null
  }
  if (!res.ok) {
    const err = parseMetaError(res.status, json)
    // GET is side-effect free; a failed POST answered by Meta was not accepted.
    return { ok: false, error: err }
  }
  return { ok: true, status: res.status, json }
}

export type MediaUploadResult = { ok: true; id: string } | { ok: false; error: GraphError }

/**
 * POST /{phone-number-id}/media (multipart): uploads a buffer to Meta and returns the media id used
 * in a document/image message or a template header (quotation PDFs; DATA_MODEL §1.12). Not a send,
 * so no gate pass; the bytes were already checked when the quotation was issued.
 */
export async function uploadMedia(cfg: GraphConfig, phoneNumberId: string, file: { data: Uint8Array; mime: string; filename: string }): Promise<MediaUploadResult> {
  const url = `${GRAPH_ORIGIN}/${cfg.apiVersion}/${encodeURIComponent(phoneNumberId)}/media`
  const form = new FormData()
  form.set("messaging_product", "whatsapp")
  form.set("type", file.mime)
  form.set("file", new Blob([new Uint8Array(file.data)], { type: file.mime }), file.filename)
  let res: Response
  try {
    res = await cfg.fetch(url, { method: "POST", headers: { Authorization: `Bearer ${cfg.accessToken}` }, body: form, signal: AbortSignal.timeout(cfg.timeoutMs) })
  } catch (e) {
    return { ok: false, error: isAbort(e) ? transportError("timeout", "Graph media upload timed out") : transportError("network", "Graph network error") }
  }
  let json: unknown = null
  try {
    json = await res.json()
  } catch {
    json = null
  }
  if (!res.ok) return { ok: false, error: parseMetaError(res.status, json) }
  const id = json && typeof json === "object" ? (json as { id?: unknown }).id : null
  if (typeof id !== "string" || !id) return { ok: false, error: transportError("bad_response", "Graph accepted the upload but returned no media id", res.status) }
  return { ok: true, id }
}

async function postMessage(cfg: GraphConfig, d: PassData, payload: Record<string, unknown>): Promise<GraphSendResult> {
  const r = await graphRequest(cfg, "POST", `${encodeURIComponent(d.phoneNumberId)}/messages`, {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: d.to,
    ...payload,
  })
  if (!r.ok) return r
  const msgs = r.json && typeof r.json === "object" ? (r.json as { messages?: unknown }).messages : null
  const first = Array.isArray(msgs) ? msgs[0] : null
  const id = first && typeof first === "object" ? (first as { id?: unknown }).id : null
  if (typeof id !== "string" || !id) return { ok: false, error: transportError("bad_response", "Graph accepted the request but returned no message id", r.status) }
  return { ok: true, wamid: id }
}

// ─────────────────────────────────────────────────────────────────────────────
// Pass verification: the payload must be exactly what the gate approved
// ─────────────────────────────────────────────────────────────────────────────

const same = (a: string | null | undefined, b: string | null | undefined) => (a ?? null) === (b ?? null)

function take(pass: SendPass, kind: PassData["approved"]["kind"]): PassData {
  const d = consumePass(pass)
  if (d.approved.kind !== kind) throw new GatePassError("payload_mismatch")
  return d
}

// ─────────────────────────────────────────────────────────────────────────────
// Sends
// ─────────────────────────────────────────────────────────────────────────────

export async function sendText(cfg: GraphConfig, pass: SendPass, text: OutboundText, opts: { contextWaMessageId?: string | null } = {}): Promise<GraphSendResult> {
  const d = take(pass, "session_text")
  if (!same(d.approved.text, text)) throw new GatePassError("payload_mismatch")
  return postMessage(cfg, d, {
    type: "text",
    text: { body: text, preview_url: false },
    ...(opts.contextWaMessageId ? { context: { message_id: opts.contextWaMessageId } } : {}),
  })
}

export interface TemplateRef {
  name: string
  language: string
}

export interface TemplateSendOptions {
  /** Media header (e.g. the quotation PDF on fog_quote_document). */
  header?: { type: "document" | "image" | "video"; link?: string; id?: string; filename?: string }
  /** Quick-reply payloads by button index (e.g. "Stop promotions" → OPT_OUT). */
  quickReplyPayloads?: { index: number; payload: string }[]
}

export async function sendTemplate(
  cfg: GraphConfig,
  pass: SendPass,
  template: TemplateRef,
  params: readonly OutboundText[],
  opts: TemplateSendOptions = {},
): Promise<GraphSendResult> {
  const d = take(pass, "template")
  const a = d.approved
  if (!same(a.templateName, template.name) || !same(a.language, template.language) || a.params.length !== params.length || a.params.some((p, i) => p !== params[i])) {
    throw new GatePassError("payload_mismatch")
  }
  const components: Record<string, unknown>[] = []
  if (opts.header) {
    const h = opts.header
    const media: Record<string, string> = h.id ? { id: h.id } : { link: h.link ?? "" }
    if (h.type === "document" && h.filename) media.filename = h.filename
    components.push({ type: "header", parameters: [{ type: h.type, [h.type]: media }] })
  }
  if (params.length) components.push({ type: "body", parameters: params.map(p => ({ type: "text", text: p })) })
  for (const b of opts.quickReplyPayloads ?? []) {
    components.push({ type: "button", sub_type: "quick_reply", index: String(b.index), parameters: [{ type: "payload", payload: b.payload }] })
  }
  return postMessage(cfg, d, {
    type: "template",
    template: { name: template.name, language: { code: template.language }, ...(components.length ? { components } : {}) },
  })
}

export interface MediaSource {
  /** Public https link (Cloudinary secure_url) or a Meta media id. */
  link?: string
  id?: string
}

function mediaObject(src: MediaSource, extra: Record<string, string>): Record<string, string> {
  if (src.id) return { id: src.id, ...extra }
  if (!src.link || !/^https:\/\//i.test(src.link)) throw new Error("media link must be https")
  return { link: src.link, ...extra }
}

export async function sendDocument(cfg: GraphConfig, pass: SendPass, src: MediaSource & { filename?: string | null; caption?: OutboundText | null }): Promise<GraphSendResult> {
  const d = take(pass, "session_media")
  if (!same(d.approved.caption, src.caption)) throw new GatePassError("payload_mismatch")
  const extra: Record<string, string> = {}
  if (src.filename) extra.filename = src.filename
  if (src.caption) extra.caption = src.caption
  return postMessage(cfg, d, { type: "document", document: mediaObject(src, extra) })
}

export async function sendImage(cfg: GraphConfig, pass: SendPass, src: MediaSource & { caption?: OutboundText | null }): Promise<GraphSendResult> {
  const d = take(pass, "session_media")
  if (!same(d.approved.caption, src.caption)) throw new GatePassError("payload_mismatch")
  return postMessage(cfg, d, { type: "image", image: mediaObject(src, src.caption ? { caption: src.caption } : {}) })
}

/** Audio has no caption on WhatsApp. */
export async function sendAudio(cfg: GraphConfig, pass: SendPass, src: MediaSource): Promise<GraphSendResult> {
  const d = take(pass, "session_media")
  if (d.approved.caption) throw new GatePassError("payload_mismatch")
  return postMessage(cfg, d, { type: "audio", audio: mediaObject(src, {}) })
}
