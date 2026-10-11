/**
 * WhatsApp webhook ingest: crm_wa_events rows → contacts/deals/conversations/messages
 * (DATA_MODEL §1.5–1.8, §5; ADR §16).
 *
 * - buildEventDocs(): webhook slices → crm_wa_events docs (allow-list applied at insert; rows for
 *   other phone_number_ids get allowed:false, status "cancelled", expireAt now+30d, never processed).
 * - processFreshEvents() / drainStaleEvents(): claim (lease) → process → done | retry | failed | dead.
 * - Inbound: wamid dedupe (unique u_wamid, insert-first) → captureLead → conversation upsert
 *   (unread++, lastInboundAt/lastMessageAt via $max of waTimestamp) → message row → media.
 * - Status: update the message by wamid, forward-only by rank; message not there yet → retry.
 * - Failures are recorded on the event (lastError/attempts/nextAttemptAt), never swallowed.
 *
 * Opt-out compliance (STEP 5): every inbound pass runs lib/crm/outbound/optout.ts
 * handleInboundOptOut (STOP / UNSUBSCRIBE / बंद / "Stop promotions" button → crm_optouts +
 * confirmation; START → re-subscribe). Idempotent; a failed opt-out write retries the event.
 *
 * Out of scope here (STEP 8): keyword tagging, auto-ack, after-hours reply. They plug in at
 * `inboundAutomationHook` (the single hook point), which is a no-op today and is skipped for
 * opt-out / opt-in keyword messages.
 */
import { ObjectId, type Document } from "mongodb"
import type { CrmDb } from "../db"
import { captureLead, isDuplicateKeyError, type CaptureResult } from "../capture"
import { COLL, CRM_DEFAULTS, DELIVERY_STATUS_RANK, type WaEventKind } from "../model"
import { fromWaId } from "../phone"
import { parseSlice, previewOf, type EventSlice, type InboundMessageEvent, type StatusEvent } from "./parse"
import { fetchAndStoreMedia, MediaError, type FetchLike, type MediaKind, type MediaUploader } from "./media"
import { touchWaNumber } from "./numbers"
import { graphConfigFrom, type GraphConfig } from "../outbound/graph"
import { runInboundAutomation } from "../automation/inbound"
import { applyRecipientStatus, attributeReply } from "../broadcasts/tracking"
import { handleInboundOptOut } from "../outbound/optout"

// ─────────────────────────────────────────────────────────────────────────────
// Logging (request id on every line; callers never pass URLs, tokens or secrets)
// ─────────────────────────────────────────────────────────────────────────────

export type LogFields = Record<string, string | number | boolean | null | undefined>
export interface CrmLogger {
  info(msg: string, fields?: LogFields): void
  warn(msg: string, fields?: LogFields): void
  error(msg: string, fields?: LogFields): void
}

export function consoleLogger(requestId: string): CrmLogger {
  const line = (level: string, msg: string, fields?: LogFields) =>
    JSON.stringify({ scope: "crm.wa", level, requestId, msg, ...(fields ?? {}) })
  return {
    info: (m, f) => console.log(line("info", m, f)),
    warn: (m, f) => console.warn(line("warn", m, f)),
    error: (m, f) => console.error(line("error", m, f)),
  }
}

export const silentLogger: CrmLogger = { info: () => {}, warn: () => {}, error: () => {} }

// ─────────────────────────────────────────────────────────────────────────────
// STEP 8 hook point (keyword tagging / auto-ack / business hours / STOP). No-op in step 3b.
// ─────────────────────────────────────────────────────────────────────────────

export interface InboundHookContext {
  crm: CrmDb
  event: InboundMessageEvent
  capture: CaptureResult
  conversationId: string
  messageId: string
  log: CrmLogger
  /** What automatic replies need to send (STEP 8). */
  send?: { allowList: readonly string[]; graph: GraphConfig | null; requestId: string; now: Date }
}

/**
 * THE single hook point for inbound automation (STEP 8: keyword tagging, auto-ack, after-hours
 * reply — lib/crm/automation/inbound.ts). Called once per newly stored inbound message; skipped for
 * STOP / START keyword messages. Errors are logged by the caller and never fail the event.
 */
export async function inboundAutomationHook(ctx: InboundHookContext): Promise<void> {
  if (!ctx.send) return
  const r = await runInboundAutomation(
    ctx.crm,
    {
      contactId: new ObjectId(ctx.capture.contactId),
      contactCreated: ctx.capture.contactCreated,
      conversationId: new ObjectId(ctx.conversationId),
      messageId: new ObjectId(ctx.messageId),
      text: ctx.event.text,
    },
    { ...ctx.send, log: ctx.log },
  )
  if (r.suggestionsAdded || r.reply || r.skipped) {
    ctx.log.info("inbound automation", { messageId: ctx.messageId, suggestions: r.suggestionsAdded, reply: r.reply, outcome: r.replyOutcome ?? null, skipped: r.skipped ?? null })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Deps
// ─────────────────────────────────────────────────────────────────────────────

export interface IngestDeps {
  /** CRM_WA_PHONE_NUMBER_IDS (trimmed list). */
  allowList: readonly string[]
  /** CRM_WA_ACCESS_TOKEN — used only as a Bearer header for media download. */
  accessToken: string | undefined
  apiVersion?: string
  fetch?: FetchLike
  upload?: MediaUploader
  now?: () => Date
  log?: CrmLogger
  leaseOwner?: string
  /** Request id of the webhook call (outbound opt-out confirmations carry it). */
  requestId?: string
  /** Defaults to inboundAutomationHook. */
  afterInbound?: (ctx: InboundHookContext) => Promise<void>
}

const nowOf = (deps: IngestDeps) => (deps.now ? deps.now() : new Date())
const DAY = 86_400_000

// ─────────────────────────────────────────────────────────────────────────────
// Event docs
// ─────────────────────────────────────────────────────────────────────────────

export function buildEventDocs(slices: readonly EventSlice[], allowList: readonly string[], now: Date): Document[] {
  const allowed = new Set(allowList)
  return slices.map(s => {
    const ok = s.phoneNumberId !== null && allowed.has(s.phoneNumberId)
    return {
      _id: new ObjectId(),
      dedupeKey: s.dedupeKey,
      kind: s.kind as WaEventKind,
      phoneNumberId: s.phoneNumberId,
      allowed: ok,
      receivedAt: now,
      // Another number's traffic: keep only routing metadata, never its customers' messages.
      payload: ok ? s.payload : { metadata: s.payload.metadata ?? null, field: s.field },
      status: ok ? "pending" : "cancelled",
      attempts: 0,
      maxAttempts: CRM_DEFAULTS.jobMaxAttempts,
      nextAttemptAt: now,
      leaseUntil: null,
      leaseOwner: null,
      lastError: ok ? null : { code: "not_allow_listed", message: "phone_number_id not in CRM_WA_PHONE_NUMBER_IDS", at: now, retryable: false },
      doneAt: null,
      ...(ok ? {} : { expireAt: new Date(now.getTime() + CRM_DEFAULTS.waEventRetentionDays * DAY) }),
    }
  })
}

/** insertMany(ordered:false); duplicate keys are expected (Meta retries). Returns the newly inserted _ids. */
export async function storeEvents(crm: CrmDb, docs: Document[]): Promise<{ inserted: ObjectId[]; duplicates: number }> {
  if (docs.length === 0) return { inserted: [], duplicates: 0 }
  try {
    await crm.collection(COLL.waEvents).insertMany(docs, { ordered: false })
    return { inserted: docs.map(d => d._id as ObjectId), duplicates: 0 }
  } catch (e) {
    const err = e as { writeErrors?: unknown; code?: unknown }
    const raw = err.writeErrors
    type WriteErr = { code?: number; index?: number; err?: { code?: number; index?: number } }
    const writeErrors: WriteErr[] = Array.isArray(raw) ? raw : raw ? [raw as WriteErr] : []
    if (writeErrors.length === 0) {
      if (isDuplicateKeyError(e) && docs.length === 1) return { inserted: [], duplicates: 1 }
      throw e
    }
    const codeOf = (w: (typeof writeErrors)[number]) => w.code ?? w.err?.code
    const indexOf = (w: (typeof writeErrors)[number]) => w.index ?? w.err?.index
    if (writeErrors.some(w => codeOf(w) !== 11000)) throw e
    const failed = new Set(writeErrors.map(indexOf))
    return { inserted: docs.filter((_, i) => !failed.has(i)).map(d => d._id as ObjectId), duplicates: failed.size }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// crm_wa_numbers bookkeeping (auto-create allow-listed numbers, /health fields)
// ─────────────────────────────────────────────────────────────────────────────

// touchWaNumber lives in ./numbers (the send path needs it too, without importing ingest).
export { touchWaNumber }

// ─────────────────────────────────────────────────────────────────────────────
// Processing outcomes + queue transitions
// ─────────────────────────────────────────────────────────────────────────────

export type Outcome =
  | { kind: "done"; note?: string }
  | { kind: "retry"; code: string; message: string }
  | { kind: "failed"; code: string; message: string }
  | { kind: "cancelled"; code: string; message: string }

export function backoffMs(attempts: number): number {
  const n = Math.max(1, attempts)
  return Math.min(CRM_DEFAULTS.jobBackoffBaseMs * 4 ** (n - 1), CRM_DEFAULTS.jobBackoffCapMs)
}

async function finish(crm: CrmDb, ev: Document, outcome: Outcome, now: Date, owner: string): Promise<string> {
  const filter = { _id: ev._id, status: "leased", leaseOwner: owner }
  const events = crm.collection(COLL.waEvents)
  const retention = new Date(now.getTime() + CRM_DEFAULTS.waEventRetentionDays * DAY)
  if (outcome.kind === "done") {
    await events.updateOne(filter, {
      $set: { status: "done", doneAt: now, expireAt: retention, leaseUntil: null, leaseOwner: null, lastError: null },
    })
    return "done"
  }
  const lastError = { code: outcome.code, message: outcome.message, at: now, retryable: outcome.kind === "retry" }
  if (outcome.kind === "cancelled") {
    await events.updateOne(filter, { $set: { status: "cancelled", doneAt: now, expireAt: retention, leaseUntil: null, leaseOwner: null, lastError } })
    return "cancelled"
  }
  if (outcome.kind === "retry" && (ev.attempts ?? 0) < (ev.maxAttempts ?? CRM_DEFAULTS.jobMaxAttempts)) {
    await events.updateOne(filter, {
      $set: { status: "pending", nextAttemptAt: new Date(now.getTime() + backoffMs(ev.attempts ?? 1)), leaseUntil: null, leaseOwner: null, lastError },
    })
    return "pending"
  }
  if (outcome.kind === "retry" && outcome.code === "message_not_found") {
    // Status for a wamid that still has no crm_messages row after maxAttempts: not a message this
    // CRM sent (e.g. another app on the WABA). "ignored", TTL'd, and not counted as dead in /health.
    await events.updateOne(filter, { $set: { status: "ignored", doneAt: now, expireAt: retention, leaseUntil: null, leaseOwner: null, lastError } })
    return "ignored"
  }
  // failed (permanent) or retries exhausted (dead). Neither gets expireAt: kept for review.
  const status = outcome.kind === "failed" ? "failed" : "dead"
  await events.updateOne(filter, { $set: { status, doneAt: now, leaseUntil: null, leaseOwner: null, lastError } })
  return status
}

const ATTEMPTS_LEFT = { $expr: { $lt: ["$attempts", { $ifNull: ["$maxAttempts", CRM_DEFAULTS.jobMaxAttempts] }] } }
const ATTEMPTS_USED = { $expr: { $gte: ["$attempts", { $ifNull: ["$maxAttempts", CRM_DEFAULTS.jobMaxAttempts] }] } }

/**
 * Due = pending past nextAttemptAt, or leased with an expired lease AND attempts left. Attempts are
 * incremented at claim time, so a worker that is killed mid-event still used up one attempt; a
 * poison event therefore cannot be re-claimed forever (it is retired by retireExhaustedLeases).
 */
const DUE = (now: Date) => ({
  $or: [{ status: "pending", nextAttemptAt: { $lte: now } }, { status: "leased", leaseUntil: { $lt: now }, ...ATTEMPTS_LEFT }],
})

/** Lease expired with no attempts left: the last worker died → dead (kept for review, no expireAt). */
export async function retireExhaustedLeases(crm: CrmDb, now: Date): Promise<number> {
  const res = await crm.collection(COLL.waEvents).updateMany(
    { status: "leased", leaseUntil: { $lt: now }, ...ATTEMPTS_USED },
    {
      $set: {
        status: "dead",
        doneAt: now,
        leaseUntil: null,
        leaseOwner: null,
        lastError: { code: "lease_expired_max_attempts", message: "worker never finished; attempts exhausted", at: now, retryable: false },
      },
    },
  )
  return res.modifiedCount
}

async function claim(crm: CrmDb, filter: Document, now: Date, owner: string): Promise<Document | null> {
  return crm.collection(COLL.waEvents).findOneAndUpdate(
    { allowed: true, ...filter, ...DUE(now) },
    { $set: { status: "leased", leaseUntil: new Date(now.getTime() + CRM_DEFAULTS.jobLeaseMs), leaseOwner: owner }, $inc: { attempts: 1 } },
    { sort: { nextAttemptAt: 1 }, returnDocument: "after" },
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Inbound message
// ─────────────────────────────────────────────────────────────────────────────

const MEDIA_TYPES = new Set(["image", "document", "audio", "video", "sticker"])

function messageDoc(ev: InboundMessageEvent, ids: { _id: ObjectId; conversationId: unknown; contactId: unknown }, now: Date): Document {
  return {
    _id: ids._id,
    conversationId: ids.conversationId,
    contactId: ids.contactId,
    phoneNumberId: ev.phoneNumberId,
    direction: "in",
    waMessageId: ev.wamid,
    type: ev.type,
    text: ev.text,
    media: ev.media
      ? {
          waMediaId: ev.media.waMediaId,
          mime: ev.media.mime,
          sha256: ev.media.sha256,
          filename: ev.media.filename,
          caption: ev.media.caption,
          bytes: null,
          cloudinaryPublicId: null,
          url: null,
          storage: ev.media.waMediaId ? "pending" : "failed",
          ...(ev.type === "audio" ? { voice: ev.media.voice } : {}),
        }
      : null,
    template: null,
    interactive: ev.interactive,
    location: ev.location,
    contextWaMessageId: ev.contextWaMessageId,
    unsupported: ev.unsupported,
    inboxApplied: false,
    status: null,
    statusRank: 0,
    statusAt: {},
    error: null,
    sendAttemptedAt: null,
    author: { kind: "customer" },
    idempotencyKey: null,
    waTimestamp: ev.waTimestamp,
    createdAt: now,
  }
}

async function upsertConversation(
  crm: CrmDb,
  ev: InboundMessageEvent,
  preId: ObjectId,
  contactId: unknown,
  at: Date,
  now: Date,
): Promise<Document> {
  const convs = crm.collection(COLL.conversations)
  const filter = { phoneNumberId: ev.phoneNumberId, waId: ev.waId }
  const update = {
    $setOnInsert: {
      _id: preId,
      contactId,
      status: "open",
      hasUnread: false,
      unreadCount: 0,
      lastMessageAt: at,
      lastInboundAt: null,
      lastOutboundAt: null,
      lastMessagePreview: "",
      assignedTo: null,
      stage: null,
      autoAckSentAt: null,
      lastAutoReplyAt: null,
      resolvedAt: null,
      resolvedBy: null,
      handler: "human",
      flow: null,
      createdAt: now,
    },
    $set: { updatedAt: now },
  }
  for (let i = 0; i < 2; i++) {
    try {
      const doc = await convs.findOneAndUpdate(filter, update, { upsert: true, returnDocument: "after" })
      if (doc) return doc
    } catch (e) {
      if (!isDuplicateKeyError(e) || i === 1) throw e // concurrent upsert race → retry once as an update
    }
  }
  const doc = await convs.findOne(filter)
  if (!doc) throw new Error("conversation upsert returned nothing")
  return doc
}

/**
 * Atomic claim of the per-message inbox step. Only the worker whose conditional update matches
 * applies the conversation counters, so concurrent runs of one wamid never double-count. The
 * claim (`inboxClaimAt`) goes stale after the event lease (60 s): a worker that crashed between
 * claim and apply is retried by the next lease holder, so an unread is never lost. A crash after
 * the $inc but before `inboxApplied:true` can still count it twice (preferred over missing it).
 */
async function claimInboxStep(crm: CrmDb, messageId: ObjectId, now: Date): Promise<boolean> {
  const staleBefore = new Date(now.getTime() - CRM_DEFAULTS.jobLeaseMs)
  const res = await crm.collection(COLL.messages).updateOne(
    {
      _id: messageId,
      inboxApplied: { $ne: true },
      $or: [{ inboxClaimAt: null }, { inboxClaimAt: { $exists: false } }, { inboxClaimAt: { $lt: staleBefore } }],
    },
    { $set: { inboxClaimAt: now } },
  )
  return res.modifiedCount === 1
}

/** unread++, preview, $max lastInboundAt/lastMessageAt, reopen, stage denorm. Caller holds the inbox claim. */
async function applyToInbox(crm: CrmDb, msg: Document, preview: string, stage: string | null, now: Date): Promise<void> {
  const convs = crm.collection(COLL.conversations)
  const at: Date = msg.waTimestamp instanceof Date ? msg.waTimestamp : msg.createdAt
  // Preview only moves forward in time (out-of-order webhooks keep the newest preview).
  await convs.updateOne({ _id: msg.conversationId, lastMessageAt: { $lte: at } }, { $set: { lastMessagePreview: preview } })
  await convs.updateOne(
    { _id: msg.conversationId },
    {
      $set: { hasUnread: true, status: "open", resolvedAt: null, resolvedBy: null, updatedAt: now, ...(stage ? { stage } : {}) },
      $inc: { unreadCount: 1 },
      $max: { lastInboundAt: at, lastMessageAt: at },
    },
  )
  await crm.collection(COLL.messages).updateOne({ _id: msg._id }, { $set: { inboxApplied: true, inboxClaimAt: null } })
}

async function storeMedia(crm: CrmDb, msg: Document, deps: IngestDeps, log: CrmLogger, now: Date): Promise<Outcome | null> {
  const media = msg.media as Document | null
  if (!media || !MEDIA_TYPES.has(msg.type) || !(media.storage === "pending" || media.storage === "failed")) return null
  if (!media.waMediaId) return null
  const messages = crm.collection(COLL.messages)
  try {
    const r = await fetchAndStoreMedia(
      {
        waMediaId: media.waMediaId,
        mime: media.mime,
        filename: media.filename ?? null,
        kind: msg.type as MediaKind,
        waTimestamp: msg.waTimestamp instanceof Date ? msg.waTimestamp : null,
      },
      { accessToken: deps.accessToken, apiVersion: deps.apiVersion, fetch: deps.fetch, upload: deps.upload, now },
    )
    const set: Document =
      r.storage === "stored"
        ? { "media.storage": "stored", "media.url": r.url, "media.cloudinaryPublicId": r.publicId, "media.bytes": r.bytes, "media.mime": r.mime }
        : { "media.storage": "too_large", "media.bytes": r.bytes, "media.mime": r.mime }
    await messages.updateOne({ _id: msg._id }, { $set: set, $unset: { "media.error": "" } })
    log.info("media stored", { messageId: String(msg._id), storage: r.storage, bytes: r.bytes ?? null })
    return null
  } catch (e) {
    const me = e instanceof MediaError ? e : new MediaError("media_unexpected", "unexpected media error", true)
    await messages.updateOne({ _id: msg._id }, { $set: { "media.storage": "failed", "media.error": { code: me.code, at: now } } })
    log.warn("media fetch failed", {
      messageId: String(msg._id),
      code: me.code,
      httpStatus: me.httpStatus,
      retryable: me.retryable,
      metaCode: me.meta?.code,
      metaSubcode: me.meta?.subcode,
      metaType: me.meta?.type,
      metaMessage: me.meta?.message,
      fbtraceId: me.meta?.fbtraceId,
    })
    return me.retryable ? { kind: "retry", code: me.code, message: me.message } : { kind: "failed", code: me.code, message: me.message }
  }
}

export async function processInbound(crm: CrmDb, ev: InboundMessageEvent, deps: IngestDeps, log: CrmLogger): Promise<Outcome> {
  const now = nowOf(deps)
  if (!ev.from || !ev.waId) return { kind: "failed", code: "bad_from", message: "messages[].from is not a valid wa_id" }
  const messages = crm.collection(COLL.messages)

  let msg: Document | null = await messages.findOne({ waMessageId: ev.wamid })
  let fresh = false
  let capture: CaptureResult | null = null

  if (!msg) {
    const at = ev.waTimestamp ?? now
    const existingConv = await crm.collection(COLL.conversations).findOne({ phoneNumberId: ev.phoneNumberId, waId: ev.waId }, { projection: { _id: 1 } })
    const preConvId: ObjectId = existingConv ? (existingConv._id as ObjectId) : new ObjectId()
    const msgId = new ObjectId()

    capture = await captureLead(crm, {
      channel: "whatsapp",
      phone: { phoneE164: ev.from, waId: ev.waId, phoneKind: ev.from.startsWith("+91") ? "mobile" : "international" },
      profile: { waProfileName: ev.profileName },
      createdBy: { system: "webhook" },
      origin: { conversationId: preConvId.toHexString(), firstMessageId: msgId.toHexString() },
      now,
    })
    const contactOid = new ObjectId(capture.contactId)
    const conv = await upsertConversation(crm, ev, preConvId, contactOid, at, now)

    const doc = messageDoc(ev, { _id: msgId, conversationId: conv._id, contactId: conv.contactId ?? contactOid }, now)
    try {
      await messages.insertOne(doc)
      msg = doc
      fresh = true
    } catch (e) {
      if (!isDuplicateKeyError(e)) throw e
      msg = await messages.findOne({ waMessageId: ev.wamid }) // a concurrent run stored it first
      if (!msg) throw e
    }
    await touchWaNumber(crm, ev.phoneNumberId, { lastInboundAt: at }, now, ev.displayPhone)
  }

  if (msg.inboxApplied !== true && (await claimInboxStep(crm, msg._id as ObjectId, now))) {
    let stage: string | null = capture?.dealStage ?? null
    if (!capture) {
      const open = await crm.collection(COLL.deals).findOne({ contactId: msg.contactId, isOpen: true }, { projection: { stage: 1 } })
      stage = open ? String(open.stage) : null
    }
    await applyToInbox(crm, msg, previewOf(ev), stage, now)
  }

  // Opt-out compliance on every pass (idempotent). A failed write retries the whole event.
  let optAction: "stop" | "start" | null = null
  try {
    const o = await handleInboundOptOut(
      crm,
      {
        event: { type: ev.type, text: ev.text, interactive: ev.interactive, from: ev.from },
        contactId: msg.contactId as ObjectId,
        conversationId: msg.conversationId as ObjectId,
        messageId: msg._id as ObjectId,
      },
      {
        allowList: deps.allowList,
        graph: graphConfigFrom({ waAccessToken: deps.accessToken, waApiVersion: deps.apiVersion }, deps.fetch),
        requestId: deps.requestId ?? deps.leaseOwner ?? "webhook",
        now: deps.now,
        log,
      },
    )
    optAction = o.action
    if (o.action) log.info("opt keyword handled", { messageId: String(msg._id), action: o.action, confirmation: o.confirmation ?? null })
  } catch (e) {
    log.error("opt-out handling failed", { messageId: String(msg._id), error: e instanceof Error ? e.name : "unknown" })
    return { kind: "retry", code: "optout_failed", message: "opt-out handling failed" }
  }

  if (fresh && ev.from) {
    // Broadcast reply attribution (any fresh inbound, incl. STOP). Best-effort.
    try {
      await attributeReply(crm, ev.from, now)
    } catch (e) {
      log.error("broadcast reply attribution failed", { messageId: String(msg._id), error: e instanceof Error ? e.name : "unknown" })
    }
  }

  if (fresh && capture && !optAction) {
    const hook = deps.afterInbound ?? inboundAutomationHook
    try {
      await hook({
        crm, event: ev, capture, conversationId: String(msg.conversationId), messageId: String(msg._id), log,
        send: {
          allowList: deps.allowList,
          graph: graphConfigFrom({ waAccessToken: deps.accessToken, waApiVersion: deps.apiVersion }, deps.fetch),
          requestId: deps.requestId ?? deps.leaseOwner ?? "webhook",
          now,
        },
      })
    } catch (e) {
      log.error("inbound hook failed", { messageId: String(msg._id), error: e instanceof Error ? e.name : "unknown" })
    }
    log.info("inbound stored", {
      messageId: String(msg._id),
      type: ev.type,
      contactCreated: capture.contactCreated,
      deal: capture.dealOutcome,
      existingDealer: capture.existingDealer,
    })
  }

  const mediaOutcome = await storeMedia(crm, msg, deps, log, now)
  return mediaOutcome ?? { kind: "done" }
}

// ─────────────────────────────────────────────────────────────────────────────
// Status
// ─────────────────────────────────────────────────────────────────────────────

export async function processStatus(crm: CrmDb, ev: StatusEvent, deps: IngestDeps, log: CrmLogger): Promise<Outcome> {
  const now = nowOf(deps)
  const messages = crm.collection(COLL.messages)
  const msg = await messages.findOne({ waMessageId: ev.wamid }, { projection: { _id: 1, contactId: 1, conversationId: 1, statusRank: 1 } })
  if (!msg) {
    // The send response / row may still be in flight: retry with backoff, dead after maxAttempts.
    return { kind: "retry", code: "message_not_found", message: "status for a wamid not yet in crm_messages" }
  }
  const at = ev.at ?? now
  const rank = DELIVERY_STATUS_RANK[ev.status]
  const firstErr = ev.errors[0]
  // statusAt.<status> is always recorded; status/statusRank only move forward (failed = terminal).
  await messages.updateOne({ _id: msg._id }, { $min: { [`statusAt.${ev.status}`]: at } })
  await messages.updateOne(
    { _id: msg._id, statusRank: { $lt: rank } },
    {
      $set: {
        status: ev.status,
        statusRank: rank,
        ...(ev.status === "failed"
          ? { error: { code: firstErr?.code ?? 0, title: firstErr?.title ?? "failed", ...(firstErr?.detail ? { detail: firstErr.detail } : {}) } }
          : {}),
      },
    },
  )
  if (ev.status === "failed") {
    log.warn("outbound failed status", { messageId: String(msg._id), metaCode: firstErr?.code ?? null, metaTitle: firstErr?.title ?? null })
    if (firstErr?.code === 131026 && msg.contactId) {
      await crm.collection(COLL.contacts).updateOne({ _id: msg.contactId, notOnWhatsApp: null }, { $set: { notOnWhatsApp: now, updatedAt: now } })
    }
    if (firstErr?.code === 131050 && msg.contactId) {
      // "User stopped marketing messages" (DATA_MODEL §5): record the opt-out.
      const c = await crm.collection(COLL.contacts).findOne({ _id: msg.contactId }, { projection: { phoneE164: 1 } })
      if (c?.phoneE164) {
        await crm.collection(COLL.optOuts).updateOne(
          { phoneE164: c.phoneE164 },
          { $setOnInsert: { scope: "marketing", via: "meta_131050", at: now, by: null, sourceMessageId: msg._id } },
          { upsert: true },
        )
        await crm.collection(COLL.contacts).updateOne({ _id: msg.contactId, marketingOptOut: null }, { $set: { marketingOptOut: { at: now, via: "meta_131050" }, updatedAt: now } })
      }
    }
  }
  // Broadcast recipient + campaign counts (no-op for non-broadcast messages).
  await applyRecipientStatus(crm, ev.wamid, ev.status, at)
  // Inbox polling validator: a tick change must invalidate the conversation's ETag.
  if (msg.conversationId) await crm.collection(COLL.conversations).updateOne({ _id: msg.conversationId }, { $set: { updatedAt: now } })
  return { kind: "done" }
}

// ─────────────────────────────────────────────────────────────────────────────
// One event
// ─────────────────────────────────────────────────────────────────────────────

export async function processEventDoc(crm: CrmDb, ev: Document, deps: IngestDeps, log: CrmLogger): Promise<Outcome> {
  if (!ev.allowed || !ev.phoneNumberId || !deps.allowList.includes(ev.phoneNumberId)) {
    return { kind: "cancelled", code: "not_allow_listed", message: "phone_number_id not in CRM_WA_PHONE_NUMBER_IDS" }
  }
  const parsed = parseSlice(ev.payload)
  let worst: Outcome = { kind: "done" }
  const rankOf = (o: Outcome) => ({ done: 0, cancelled: 0, failed: 1, retry: 2 })[o.kind]
  for (const p of parsed) {
    let o: Outcome
    if (p.kind === "message") o = await processInbound(crm, p, deps, log)
    else if (p.kind === "status") o = await processStatus(crm, p, deps, log)
    else o = { kind: "done", note: p.reason }
    if (rankOf(o) > rankOf(worst)) worst = o
  }
  return worst
}

async function runClaimed(crm: CrmDb, ev: Document, deps: IngestDeps, log: CrmLogger, owner: string): Promise<string> {
  let outcome: Outcome
  try {
    outcome = await processEventDoc(crm, ev, deps, log)
  } catch (e) {
    const code = typeof (e as { code?: unknown })?.code === "number" ? `mongo_${(e as { code: number }).code}` : "exception"
    log.error("event processing threw", { eventId: String(ev._id), kind: ev.kind, code, error: e instanceof Error ? e.name : "unknown" })
    outcome = { kind: "retry", code, message: e instanceof Error ? e.message.replace(/https?:\/\/\S+/gi, "[url]").slice(0, 300) : "unknown error" }
  }
  const status = await finish(crm, ev, outcome, nowOf(deps), owner)
  if (status !== "done") {
    log.warn("event not done", { eventId: String(ev._id), kind: ev.kind, status, attempts: ev.attempts, code: "code" in outcome ? outcome.code : null })
  }
  return status
}

/** Processes the just-inserted events (by _id), in order. */
export async function processFreshEvents(crm: CrmDb, ids: readonly ObjectId[], deps: IngestDeps): Promise<Record<string, number>> {
  const log = deps.log ?? silentLogger
  const owner = deps.leaseOwner ?? `wa:${new ObjectId().toHexString()}`
  const tally: Record<string, number> = {}
  for (const id of ids) {
    const ev = await claim(crm, { _id: id }, nowOf(deps), owner)
    if (!ev) continue
    const s = await runClaimed(crm, ev, deps, log, owner)
    tally[s] = (tally[s] ?? 0) + 1
  }
  return tally
}

/** Sweeps up to `limit` due pending (or lease-expired) allowed events, oldest due first. */
export async function drainStaleEvents(crm: CrmDb, deps: IngestDeps, limit: number = CRM_DEFAULTS.staleEventSweepLimit): Promise<Record<string, number>> {
  const log = deps.log ?? silentLogger
  const owner = deps.leaseOwner ?? `wa:${new ObjectId().toHexString()}`
  const tally: Record<string, number> = {}
  const retired = await retireExhaustedLeases(crm, nowOf(deps))
  if (retired) {
    tally.dead = retired
    log.warn("retired lease-expired events with no attempts left", { count: retired })
  }
  for (let i = 0; i < limit; i++) {
    const ev = await claim(crm, {}, nowOf(deps), owner)
    if (!ev) break
    const s = await runClaimed(crm, ev, deps, log, owner)
    tally[s] = (tally[s] ?? 0) + 1
  }
  return tally
}
