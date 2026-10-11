/**
 * Request handling for /api/crm/whatsapp/webhook (DATA_MODEL §8, ADR §11/§16), kept out of the
 * route file so it can be tested with injected deps (DB, env, after(), fetch, uploader).
 *
 * GET  — Meta verify handshake: hub.mode=subscribe + hub.verify_token === CRM_WA_VERIFY_TOKEN
 *        (trimmed, constant-time) → echo hub.challenge as text/plain; else 403.
 * POST — raw bytes → X-Hub-Signature-256 check (401 on fail) → split into per-message/status
 *        slices → insertMany(ordered:false) into crm_wa_events (dupes ignored; any other DB error
 *        → 500 so Meta retries) → 200 at once → in after(): process the new rows, touch
 *        crm_wa_numbers.lastWebhookAt, then sweep ≤5 stale pending rows.
 * Every log line carries the request id; no secrets, tokens, URLs or message bodies are logged.
 */
import { createHash, timingSafeEqual } from "node:crypto"
import type { CrmDb } from "../db"
import { CRM_DEFAULTS, type Workspace } from "../model"
import { readCrmEnv, type CrmEnv } from "../env"
import { checkWaSignature } from "./signature"
import { isWhatsAppWebhook, splitWebhook } from "./parse"
import {
  buildEventDocs,
  consoleLogger,
  drainStaleEvents,
  processFreshEvents,
  storeEvents,
  touchWaNumber,
  type CrmLogger,
  type IngestDeps,
} from "./ingest"
import type { FetchLike, MediaUploader } from "./media"

export const WEBHOOK_WORKSPACE: Workspace = "fogging"

export interface WebhookDeps {
  getDb: () => Promise<CrmDb>
  /** next/server after() in production; tests pass a queue. */
  schedule: (task: () => Promise<void>) => void
  env?: CrmEnv
  fetch?: FetchLike
  upload?: MediaUploader
  now?: () => Date
  logger?: (requestId: string) => CrmLogger
  requestId?: string
  afterInbound?: IngestDeps["afterInbound"]
}

export function requestIdOf(headers: Headers): string {
  const given = headers.get("x-request-id") ?? headers.get("x-vercel-id")
  const safe = given && /^[\w:.\-]{1,128}$/.test(given) ? given : null
  return safe ?? crypto.randomUUID()
}

function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest()
  const hb = createHash("sha256").update(b).digest()
  return timingSafeEqual(ha, hb) && a.length === b.length
}

export function handleVerify(url: URL, env: CrmEnv = readCrmEnv(), log: CrmLogger = consoleLogger(crypto.randomUUID())): Response {
  const mode = url.searchParams.get("hub.mode")
  const token = url.searchParams.get("hub.verify_token")
  const challenge = url.searchParams.get("hub.challenge")
  const expected = env.waVerifyToken
  if (!expected) {
    log.error("verify: CRM_WA_VERIFY_TOKEN not set")
    return new Response("Forbidden", { status: 403 })
  }
  if (mode === "subscribe" && typeof token === "string" && safeEqual(token.trim(), expected) && challenge !== null) {
    log.info("verify: ok")
    return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } })
  }
  log.warn("verify: rejected", { mode: mode ?? null })
  return new Response("Forbidden", { status: 403 })
}

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } })

export async function handleWebhookPost(request: Request, deps: WebhookDeps): Promise<Response> {
  const requestId = deps.requestId ?? requestIdOf(request.headers)
  const log = (deps.logger ?? consoleLogger)(requestId)
  const env = deps.env ?? readCrmEnv()
  const now = deps.now ? deps.now() : new Date()

  const raw = new Uint8Array(await request.arrayBuffer())
  const sig = checkWaSignature(raw, request.headers.get("x-hub-signature-256"), env.waAppSecret)
  if (!sig.ok) {
    if (sig.reason === "no_secret") log.error("webhook: CRM_WA_APP_SECRET not set")
    else log.warn("webhook: signature rejected", { reason: sig.reason, bytes: raw.byteLength })
    return json({ error: "invalid_signature" }, 401)
  }

  let body: unknown
  try {
    body = JSON.parse(new TextDecoder("utf-8").decode(raw))
  } catch {
    log.warn("webhook: body is not JSON", { bytes: raw.byteLength })
    return json({ error: "invalid_json" }, 400)
  }
  if (!isWhatsAppWebhook(body)) {
    log.info("webhook: ignored non-WABA object")
    return json({ ok: true, ignored: true }, 200)
  }

  const slices = splitWebhook(body)
  const docs = buildEventDocs(slices, env.waPhoneNumberIds, now)
  let crm: CrmDb
  let inserted: Awaited<ReturnType<typeof storeEvents>>
  try {
    crm = await deps.getDb()
    inserted = await storeEvents(crm, docs)
  } catch (e) {
    // Not stored → non-200 so Meta redelivers.
    log.error("webhook: storing events failed", { error: e instanceof Error ? e.name : "unknown", code: (e as { code?: number })?.code ?? null })
    return json({ error: "store_failed" }, 500)
  }
  const allowedPnids = Array.from(new Set(docs.filter(d => d.allowed).map(d => String(d.phoneNumberId))))
  const disallowed = docs.filter(d => !d.allowed).length
  log.info("webhook: stored", { slices: docs.length, inserted: inserted.inserted.length, duplicates: inserted.duplicates, disallowed })

  const freshIds = new Set(inserted.inserted.map(String))
  const freshAllowed = docs.filter(d => d.allowed && freshIds.has(String(d._id))).map(d => d._id)
  const ingestDeps: IngestDeps = {
    allowList: env.waPhoneNumberIds,
    accessToken: env.waAccessToken,
    apiVersion: env.waApiVersion,
    fetch: deps.fetch,
    upload: deps.upload,
    now: deps.now,
    log,
    leaseOwner: `wa:${requestId}`,
    requestId,
    afterInbound: deps.afterInbound,
  }

  deps.schedule(async () => {
    try {
      for (const pnid of allowedPnids) {
        const display = docs.find(d => d.phoneNumberId === pnid)?.payload?.metadata?.display_phone_number
        await touchWaNumber(crm, pnid, { lastWebhookAt: now }, now, typeof display === "string" ? display : null)
      }
      const fresh = await processFreshEvents(crm, freshAllowed, ingestDeps)
      const stale = await drainStaleEvents(crm, ingestDeps, CRM_DEFAULTS.staleEventSweepLimit)
      log.info("webhook: processed", { ...prefixed("fresh_", fresh), ...prefixed("stale_", stale) })
    } catch (e) {
      // Rows stay pending/leased; the next webhook, inbox poll or daily cron sweeps them.
      log.error("webhook: after() processing failed", { error: e instanceof Error ? e.name : "unknown" })
    }
  })

  return json({ ok: true }, 200)
}

function prefixed(p: string, o: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(o)) out[p + k] = v
  return out
}
