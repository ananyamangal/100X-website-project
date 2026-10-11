/**
 * sendMessage(): the one synchronous outbound path (DATA_MODEL §5 "Idempotency and at-most-once",
 * §1.6, §1.10, §4; ADR §16 "interactive sends are synchronous; only failures are queued").
 *
 *   idempotency lookup (client key) → gate (checkSend) → ledger row (business-initiated only, BEFORE
 *   the Graph call) → message row (direction "out", status "queued", wamid null) →
 *   sendAttemptedAt → Graph → wamid + "sent" | "failed" with Meta's error →
 *   conversation lastOutboundAt/preview, contact lastActivityAt, crm_wa_numbers lastSendAt /
 *   lastSendError (/health) → audit → log.
 *
 * - A repeated idempotency key returns the stored message and never calls Graph again (also when
 *   the first attempt failed: resending is a deliberate new request with a new key).
 * - Status webhooks (lib/crm/whatsapp/ingest.ts processStatus) advance sent → delivered → read.
 * - Meta side effects: 131026 → contact.notOnWhatsApp; 131050 → opt-out; 131048 / 368 → number
 *   sendingPaused. Retryable failures (rate limits, temporary, 5xx) get one `wa_send` job (run by
 *   the step-9 chunk loop, which re-gates via fromPersistedOutbound). Unknown outcomes (timeout
 *   after the request left) are never retried automatically.
 * - Logs and audit rows carry the request id, ids, Meta code/subcode/title/fbtrace_id only: never
 *   the token, message text, phone numbers or URLs.
 * - Messages are not copied into crm_activities (DATA_MODEL §1.3: one source per fact); the
 *   contact's lastActivityAt is bumped instead.
 */
import { ObjectId, type Document } from "mongodb"
import type { CrmDb } from "../db"
import { logCrmAction, type AuditActor } from "../audit"
import { isDuplicateKeyError } from "../capture"
import { COLL, CRM_DEFAULTS, DELIVERY_STATUS_RANK, type OutboundText, type UserRef } from "../model"
import { checkSend, GatePassError, peekPass, type GateDenyReason, type SendPurpose } from "./gate"
import { sendAudio, sendDocument, sendImage, sendTemplate, sendText, type GraphConfig, type GraphError, type GraphSendResult, type TemplateSendOptions } from "./graph"
import { writeLedgerRow } from "./ledger"
import { touchWaNumber } from "../whatsapp/numbers"

export type SendContent =
  | { kind: "text"; text: OutboundText; contextWaMessageId?: string | null }
  | ({ kind: "template"; name: string; language: string; params: OutboundText[] } & TemplateSendOptions)
  | {
      kind: "media"
      mediaType: "document" | "image" | "audio"
      link?: string
      id?: string
      mime: string
      filename?: string | null
      caption?: OutboundText | null
      bytes?: number | null
    }

export interface SendRequest {
  contactId: ObjectId
  conversationId?: ObjectId | null
  /** Full, namespaced key (e.g. "reply:<userId>:<clientKey>", "optout:<messageId>"). Unique per workspace. */
  idempotencyKey: string
  purpose?: SendPurpose
  /** Caller label for logs/audit (e.g. "inbox.reply"). */
  route: string
  content: SendContent
  /** STEP 9: a broadcast send — the message is authored by the broadcast. */
  broadcastId?: ObjectId | null
  /** STEP 9: the caller owns retries (broadcast recipients, wa_send jobs): never enqueue a wa_send job. */
  noRetryJob?: boolean
}

export interface SendLogger {
  info(msg: string, fields?: Record<string, string | number | boolean | null>): void
  error(msg: string, fields?: Record<string, string | number | boolean | null>): void
}

export interface SendDeps {
  /** CRM_WA_PHONE_NUMBER_IDS. */
  allowList: readonly string[]
  /** null = CRM_WA_ACCESS_TOKEN unset → 503 whatsapp_not_configured (after the gate, before any write). */
  graph: GraphConfig | null
  requestId: string
  now?: () => Date
  log?: SendLogger
  ip?: string | null
  userAgent?: string | null
}

export type SendActor = UserRef | { system: string }

export type SendResult =
  | { ok: true; deduped: boolean; message: Document }
  | { ok: false; status: number; error: GateDenyReason | "idempotency_conflict" | "whatsapp_not_configured" | "send_failed" | "gate_pass_rejected"; detail?: Record<string, unknown>; message?: Document }

const silent: SendLogger = { info: () => {}, error: () => {} }
const NUMBER_PAUSE_CODES = new Set([131048, 368])

function previewOf(c: SendContent): string {
  let s: string
  if (c.kind === "text") s = c.text
  else if (c.kind === "template") s = `Template: ${c.name}`
  else s = c.mediaType === "image" ? `Photo${c.caption ? `: ${c.caption}` : ""}` : c.mediaType === "audio" ? "Audio" : `Document${c.filename ? `: ${c.filename}` : ""}`
  return s.length > 120 ? s.slice(0, 119) + "…" : s
}

function authorOf(actor: SendActor): Document {
  if ("userId" in actor) return { kind: "user", user: { userId: actor.userId, name: actor.name } }
  return { kind: "system" }
}

function errorFields(e: GraphError): Record<string, string | number | boolean | null> {
  return {
    errKind: e.kind,
    httpStatus: e.httpStatus,
    metaCode: e.code,
    metaSubcode: e.subcode,
    metaType: e.type,
    metaTitle: e.title,
    metaDetail: e.detail,
    fbtraceId: e.fbtraceId,
    retryable: e.retryable,
    outcomeUnknown: e.outcomeUnknown,
  }
}

async function ensureConversation(crm: CrmDb, contactId: ObjectId, phoneNumberId: string, waId: string, now: Date): Promise<ObjectId> {
  const convs = crm.collection(COLL.conversations)
  const filter = { phoneNumberId, waId }
  const update = {
    $setOnInsert: {
      contactId,
      status: "open",
      hasUnread: false,
      unreadCount: 0,
      lastMessageAt: now,
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
      updatedAt: now,
    },
  }
  for (let i = 0; i < 2; i++) {
    try {
      const doc = await convs.findOneAndUpdate(filter, update, { upsert: true, returnDocument: "after", projection: { _id: 1 } })
      if (doc) return doc._id as ObjectId
    } catch (e) {
      if (!isDuplicateKeyError(e) || i === 1) throw e
    }
  }
  const doc = await convs.findOne(filter, { projection: { _id: 1 } })
  if (!doc) throw new Error("conversation upsert returned nothing")
  return doc._id as ObjectId
}

async function applyMetaSideEffects(crm: CrmDb, err: GraphError, contactId: ObjectId, phoneNumberId: string, messageId: ObjectId, now: Date): Promise<void> {
  if (err.code === 131026) {
    await crm.collection(COLL.contacts).updateOne({ _id: contactId, notOnWhatsApp: null }, { $set: { notOnWhatsApp: now, updatedAt: now } })
  } else if (err.code === 131050) {
    const c = await crm.collection(COLL.contacts).findOne({ _id: contactId }, { projection: { phoneE164: 1 } })
    if (c?.phoneE164) {
      await crm.collection(COLL.optOuts).updateOne(
        { phoneE164: c.phoneE164 },
        { $setOnInsert: { scope: "marketing", via: "meta_131050", at: now, by: null, sourceMessageId: messageId } },
        { upsert: true },
      )
      await crm.collection(COLL.contacts).updateOne({ _id: contactId, marketingOptOut: null }, { $set: { marketingOptOut: { at: now, via: "meta_131050" }, updatedAt: now } })
    }
  } else if (err.code !== null && NUMBER_PAUSE_CODES.has(err.code)) {
    await touchWaNumber(crm, phoneNumberId, {}, now, null, { sendingPaused: { reason: `meta_${err.code}`, at: now, until: null } })
  }
}

async function enqueueRetry(crm: CrmDb, messageId: ObjectId, phoneNumberId: string, err: GraphError, now: Date): Promise<boolean> {
  try {
    await crm.collection(COLL.jobs).insertOne({
      kind: "wa_send",
      phoneNumberId,
      payload: { messageId },
      status: "pending",
      attempts: 0,
      maxAttempts: CRM_DEFAULTS.jobMaxAttempts,
      nextAttemptAt: new Date(now.getTime() + CRM_DEFAULTS.jobBackoffBaseMs),
      leaseUntil: null,
      leaseOwner: null,
      lastError: { code: err.code ?? err.kind, message: err.title, at: now, retryable: true },
      idempotencyKey: `retry:${messageId.toHexString()}`,
      doneAt: null,
      createdAt: now,
    })
    return true
  } catch (e) {
    if (isDuplicateKeyError(e)) return true
    throw e
  }
}

export async function sendMessage(crm: CrmDb, actor: SendActor, req: SendRequest, deps: SendDeps): Promise<SendResult> {
  const now = deps.now ? deps.now() : new Date()
  const log = deps.log ?? silent
  const purpose: SendPurpose = req.purpose ?? "staff"
  const messages = crm.collection(COLL.messages)
  const c = req.content
  const auditActor: AuditActor = actor

  // 1. idempotency: a retried request never sends twice
  const existing = await messages.findOne({ idempotencyKey: req.idempotencyKey })
  if (existing) {
    if (String(existing.contactId) !== req.contactId.toHexString()) return { ok: false, status: 409, error: "idempotency_conflict" }
    log.info("send deduped", { route: req.route, messageId: String(existing._id), status: existing.status ?? null })
    return { ok: true, deduped: true, message: existing }
  }

  // 2. gate
  const gate = await checkSend(
    crm,
    {
      contact: req.contactId,
      conversationId: req.conversationId ?? null,
      kind: c.kind === "text" ? "session_text" : c.kind === "media" ? "session_media" : "template",
      text: c.kind === "text" ? c.text : null,
      caption: c.kind === "media" ? c.caption ?? null : null,
      templateName: c.kind === "template" ? c.name : null,
      language: c.kind === "template" ? c.language : null,
      params: c.kind === "template" ? c.params : [],
      headerMedia: c.kind === "template" ? !!c.header : false,
      purpose,
      route: req.route,
    },
    { allowList: deps.allowList, now, actor: auditActor, requestId: deps.requestId },
  )
  if (!gate.ok) {
    log.info("send refused by gate", { route: req.route, contactId: req.contactId.toHexString(), reason: gate.reason })
    return { ok: false, status: gate.status, error: gate.reason, ...(gate.detail ? { detail: gate.detail } : {}) }
  }
  if (!deps.graph) {
    log.error("send not configured", { route: req.route, reason: "CRM_WA_ACCESS_TOKEN unset" })
    return { ok: false, status: 503, error: "whatsapp_not_configured" }
  }
  const pass = gate.pass
  const pd = peekPass(pass)
  if (!pd) return { ok: false, status: 500, error: "gate_pass_rejected" }

  // 3. ledger row BEFORE the Graph call (business-initiated only)
  if (gate.businessInitiated) await writeLedgerRow(crm, gate.phoneNumberId, gate.recipient, now)

  // 4. message row (queued, wamid null)
  const conversationId = gate.conversationId ?? (await ensureConversation(crm, req.contactId, gate.phoneNumberId, gate.to, now))
  const msgId = new ObjectId()
  const row: Document = {
    _id: msgId,
    conversationId,
    contactId: req.contactId,
    phoneNumberId: gate.phoneNumberId,
    direction: "out",
    waMessageId: null,
    type: c.kind === "text" ? "text" : c.kind === "template" ? "template" : c.mediaType,
    text: c.kind === "text" ? c.text : null,
    media:
      c.kind === "media"
        ? {
            waMediaId: c.id ?? null,
            mime: c.mime,
            sha256: null,
            filename: c.filename ?? null,
            caption: c.caption ?? null,
            bytes: c.bytes ?? null,
            cloudinaryPublicId: null,
            url: c.link ?? null,
            storage: "stored",
          }
        : null,
    template: c.kind === "template" ? { name: c.name, language: c.language, params: [...c.params] } : null,
    interactive: null,
    location: null,
    contextWaMessageId: c.kind === "text" ? c.contextWaMessageId ?? null : null,
    status: "queued",
    statusRank: DELIVERY_STATUS_RANK.queued,
    statusAt: { queued: now },
    error: null,
    sendAttemptedAt: null,
    author: req.broadcastId ? { kind: "broadcast", broadcastId: req.broadcastId } : authorOf(actor),
    idempotencyKey: req.idempotencyKey,
    sendRequestId: deps.requestId,
    businessInitiated: gate.businessInitiated,
    waTimestamp: null,
    createdAt: now,
  }
  try {
    await messages.insertOne(row)
  } catch (e) {
    if (!isDuplicateKeyError(e)) throw e
    const raced = await messages.findOne({ idempotencyKey: req.idempotencyKey })
    if (!raced) throw e
    return { ok: true, deduped: true, message: raced }
  }

  // 5. Graph (sendAttemptedAt first: a lease/timeout after this point is an unknown outcome)
  await messages.updateOne({ _id: msgId }, { $set: { sendAttemptedAt: now } })
  let result: GraphSendResult
  try {
    if (c.kind === "text") result = await sendText(deps.graph, pass, c.text, { contextWaMessageId: c.contextWaMessageId ?? null })
    else if (c.kind === "template") result = await sendTemplate(deps.graph, pass, { name: c.name, language: c.language }, c.params, { header: c.header, quickReplyPayloads: c.quickReplyPayloads })
    else if (c.mediaType === "document") result = await sendDocument(deps.graph, pass, { link: c.link, id: c.id, filename: c.filename ?? null, caption: c.caption ?? null })
    else if (c.mediaType === "image") result = await sendImage(deps.graph, pass, { link: c.link, id: c.id, caption: c.caption ?? null })
    else result = await sendAudio(deps.graph, pass, { link: c.link, id: c.id })
  } catch (e) {
    const code = e instanceof GatePassError ? e.code : "send_exception"
    await messages.updateOne(
      { _id: msgId },
      { $set: { status: "failed", statusRank: DELIVERY_STATUS_RANK.failed, "statusAt.failed": now, error: { code: 0, title: code } } },
    )
    // The failed row must reach pollers too (inbox ETag = conversation updatedAt).
    await crm.collection(COLL.conversations).updateOne({ _id: conversationId }, { $set: { updatedAt: now } })
    log.error("send aborted before Graph", { route: req.route, messageId: msgId.toHexString(), code, error: e instanceof Error ? e.name : "unknown" })
    return { ok: false, status: 500, error: "gate_pass_rejected", message: await messages.findOne({ _id: msgId }) ?? row }
  }

  const done = deps.now ? deps.now() : new Date()
  if (result.ok) {
    await messages.updateOne(
      { _id: msgId },
      { $set: { waMessageId: result.wamid, status: "sent", statusRank: DELIVERY_STATUS_RANK.sent, "statusAt.sent": done } },
    )
    const convs = crm.collection(COLL.conversations)
    await convs.updateOne({ _id: conversationId, lastMessageAt: { $lte: done } }, { $set: { lastMessagePreview: previewOf(c) } })
    await convs.updateOne({ _id: conversationId }, { $set: { updatedAt: done }, $max: { lastOutboundAt: done, lastMessageAt: done } })
    await crm.collection(COLL.contacts).updateOne({ _id: req.contactId }, { $max: { lastActivityAt: done } })
    await touchWaNumber(crm, gate.phoneNumberId, { lastSendAt: done }, done)
    await logCrmAction(crm, auditActor, "message.send", { type: "message", id: msgId.toHexString() }, {
      after: {
        outcome: "sent",
        route: req.route,
        kind: c.kind,
        templateName: c.kind === "template" ? c.name : null,
        businessInitiated: gate.businessInitiated,
        conversationId: conversationId.toHexString(),
        contactId: req.contactId.toHexString(),
        requestId: deps.requestId,
      },
      ip: deps.ip ?? null,
      userAgent: deps.userAgent ?? null,
    })
    log.info("message sent", { route: req.route, messageId: msgId.toHexString(), kind: c.kind, businessInitiated: gate.businessInitiated })
    return { ok: true, deduped: false, message: (await messages.findOne({ _id: msgId })) ?? row }
  }

  // failure
  const err = result.error
  const error = {
    code: err.code ?? 0,
    title: err.title,
    ...(err.detail ? { detail: err.detail } : {}),
    subcode: err.subcode,
    fbtraceId: err.fbtraceId,
    kind: err.kind,
    retryable: err.retryable,
    outcomeUnknown: err.outcomeUnknown,
  }
  await messages.updateOne(
    { _id: msgId },
    { $set: { status: "failed", statusRank: DELIVERY_STATUS_RANK.failed, "statusAt.failed": done, error } },
  )
  // The failed row must reach pollers too (inbox ETag = conversation updatedAt).
  await crm.collection(COLL.conversations).updateOne({ _id: conversationId }, { $set: { updatedAt: done } })
  await touchWaNumber(crm, gate.phoneNumberId, {}, done, null, { lastSendError: { code: err.code ?? err.kind, message: err.title, at: done } })
  await applyMetaSideEffects(crm, err, req.contactId, gate.phoneNumberId, msgId, done)
  const queued = err.retryable && !err.outcomeUnknown && !req.noRetryJob ? await enqueueRetry(crm, msgId, gate.phoneNumberId, err, done) : false
  await logCrmAction(crm, auditActor, "message.send", { type: "message", id: msgId.toHexString() }, {
    after: {
      outcome: "failed",
      route: req.route,
      kind: c.kind,
      templateName: c.kind === "template" ? c.name : null,
      metaCode: err.code,
      metaSubcode: err.subcode,
      fbtraceId: err.fbtraceId,
      retryQueued: queued,
      requestId: deps.requestId,
    },
    ip: deps.ip ?? null,
    userAgent: deps.userAgent ?? null,
  })
  log.error("message send failed", { route: req.route, messageId: msgId.toHexString(), kind: c.kind, retryQueued: queued, ...errorFields(err) })
  return { ok: false, status: 502, error: "send_failed", detail: { code: err.code, title: err.title, retryQueued: queued, retryable: err.retryable && !err.outcomeUnknown, outcomeUnknown: err.outcomeUnknown }, message: (await messages.findOne({ _id: msgId })) ?? row }
}
