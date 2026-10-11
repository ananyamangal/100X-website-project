/**
 * The per-number chunk loop (STEP 9; DATA_MODEL §5 driver 3). One run per phone_number_id at a time
 * (crm_locks "<ws>:chunk:<pnid>", 60 s lease renewed each round, released only by its owner).
 * Each round: broadcast recipients (≤ 25), then crm_jobs (wa_send retries, staff_push,
 * customer_reminder), then up to 5 stale webhook events — until the time budget is spent or nothing
 * is due. Sends are paced (≤ 10/s). The caller (POST /api/crm/queue/run) re-invokes itself while
 * due work remains (`more`), except when only cap-deferred work is left.
 *
 * Recipient outcomes: sent → done; tier cap → deferred (not failed: nextAttemptAt = the cap's
 * retryAfter, deferredForCap++, attempt not consumed); sending_paused → the broadcast pauses;
 * retryable Meta errors → backoff (dead → failed at maxAttempts); permanent → failed;
 * a replay that finds a half-sent row → failed unknown_outcome (never re-sent).
 */
import { ObjectId, type Document } from "mongodb"
import type { CrmDb } from "../db"
import { isDuplicateKeyError } from "../capture"
import { COLL, CRM_DEFAULTS } from "../model"
import { fromPersistedOutbound, fromTemplateParams } from "../outbound/compose"
import type { GraphConfig, FetchLike } from "../outbound/graph"
import { sendMessage, type SendContent, type SendLogger, type SendResult } from "../outbound/send"
import { reminderHandlers } from "../reminders/send"
import { drainStaleEvents } from "../whatsapp/ingest"
import { reconcileRecipient } from "../broadcasts/tracking"
import { backoffMs, runJobs, type JobHandler, type JobOutcome } from "./jobs"

const LOCK_MS = 60_000

export interface ChunkDeps {
  allowList: readonly string[]
  graph: GraphConfig | null
  accessToken?: string
  apiVersion?: string
  fetch?: FetchLike
  requestId: string
  now?: () => Date
  sleep?: (ms: number) => Promise<void>
  budgetMs?: number
  log?: SendLogger
}

export interface ChunkResult {
  locked: boolean
  rounds: number
  recipients: { sent: number; failed: number; deferred: number; released: number }
  jobs: { done: number; retry: number; failed: number; dead: number }
  events: number
  completed: string[]
  more: boolean
  onlyDeferred: boolean
}

const realSleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

async function acquire(crm: CrmDb, id: string, owner: string, now: Date): Promise<boolean> {
  try {
    await crm.collection(COLL.locks).updateOne({ _id: id, leaseUntil: { $lt: now } } as Document, { $set: { owner, leaseUntil: new Date(now.getTime() + LOCK_MS) } }, { upsert: true })
    return true
  } catch (e) {
    if (isDuplicateKeyError(e)) return false
    throw e
  }
}
const renew = (crm: CrmDb, id: string, owner: string, now: Date) =>
  crm.collection(COLL.locks).updateOne({ _id: id, owner } as Document, { $set: { leaseUntil: new Date(now.getTime() + LOCK_MS) } }).then(r => r.matchedCount === 1)
const release = (crm: CrmDb, id: string, owner: string, now: Date) =>
  crm.collection(COLL.locks).updateOne({ _id: id, owner } as Document, { $set: { leaseUntil: new Date(now.getTime() - 1) } })

/** wa_send retry: re-send a persisted outbound row under key retry:<messageId> (re-gated; no further wa_send). */
export function waSendHandler(crm: CrmDb, deps: ChunkDeps): JobHandler {
  return async job => {
    const id = job.payload?.messageId
    const p = id ? await fromPersistedOutbound(crm, id as ObjectId) : null
    if (!p) return { kind: "failed", code: "message_not_found", message: "original row missing" }
    let content: SendContent
    if (p.template) content = { kind: "template", name: p.template.name, language: p.template.language, params: p.template.params }
    else if (p.media && (p.type === "document" || p.type === "image" || p.type === "audio")) content = { kind: "media", mediaType: p.type, link: p.media.url ?? undefined, id: p.media.waMediaId ?? undefined, mime: p.media.mime, filename: p.media.filename, caption: p.caption }
    else if (p.text) content = { kind: "text", text: p.text }
    else return { kind: "failed", code: "unsupported_retry", message: `cannot re-send type ${p.type}` }
    const prior = await priorAttempts(crm, `retry:${String(id)}`)
    if (prior.done) return { kind: "done", note: "already_sent" }
    if (prior.unknown) return { kind: "failed", code: "unknown_outcome", message: "an earlier attempt may have reached Meta; not re-sent" }
    const r = await sendMessage(crm, { system: "queue" }, { contactId: p.contactId, conversationId: p.conversationId, idempotencyKey: `retry:${String(id)}:a${Number(job.attempts ?? 1)}`, route: "queue.wa_send", content, noRetryJob: true },
      { allowList: deps.allowList, graph: deps.graph, requestId: deps.requestId, now: deps.now, log: deps.log })
    return sendOutcome(r)
  }
}

/** sendMessage result → queue outcome for callers that own retries (noRetryJob). */
export function sendOutcome(r: SendResult): JobOutcome {
  if (r.ok) {
    if (r.deduped && r.message.status === "queued") return { kind: "failed", code: "unknown_outcome", message: "an earlier attempt may have reached Meta; not re-sent" }
    return { kind: "done", note: r.deduped ? "deduped" : "sent" }
  }
  if (r.error === "send_failed") {
    const d = (r.detail ?? {}) as { code?: number | null; retryable?: boolean; title?: string }
    return d.retryable ? { kind: "retry", code: `meta_${d.code ?? "temporary"}`, message: String(d.title ?? "temporary") } : { kind: "failed", code: `meta_${d.code ?? "error"}`, message: String(d.title ?? "failed") }
  }
  if (r.error === "tier_cap" || r.error === "sending_paused" || r.error === "template_paused") return { kind: "retry", code: r.error, message: r.error }
  return { kind: "failed", code: r.error, message: r.error }
}

async function activeBroadcasts(crm: CrmDb, pnid: string): Promise<ObjectId[]> {
  return (await crm.collection(COLL.broadcasts).find({ phoneNumberId: pnid, status: "sending" }, { projection: { _id: 1 } }).toArray()).map(b => b._id as ObjectId)
}

const escapeRe = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

/**
 * Earlier attempts under one logical key (`<base>` or `<base>:a<n>`): a delivered/sent one means the
 * work is already done (never send again); one still queued (sendAttemptedAt, no wamid) is an unknown
 * outcome (never re-sent automatically); only all-failed earlier attempts allow a new attempt.
 */
export async function priorAttempts(crm: CrmDb, base: string): Promise<{ done: Document | null; unknown: Document | null }> {
  const rows = await crm.collection(COLL.messages).find({ idempotencyKey: { $regex: `^${escapeRe(base)}(:a\\d+)?$` } }, { projection: { status: 1, waMessageId: 1, "error.outcomeUnknown": 1, sendAttemptedAt: 1 } }).toArray()
  return {
    // Meta accepted it (a wamid) = done, even when a later webhook tick marked it failed.
    done: rows.find(r => ["sent", "delivered", "read"].includes(String(r.status)) || Boolean(r.waMessageId)) ?? null,
    // Still queued, or failed with an unknown outcome (timeout / network after the request left).
    unknown: rows.find(r => String(r.status) === "queued" || (String(r.status) === "failed" && r.error?.outcomeUnknown === true)) ?? null,
  }
}

async function processRecipient(crm: CrmDb, rec: Document, b: Document, deps: ChunkDeps, now: Date, owner: string, res: ChunkResult): Promise<void> {
  const recs = crm.collection(COLL.broadcastRecipients)
  const bcs = crm.collection(COLL.broadcasts)
  const mine = { _id: rec._id, leaseOwner: owner, status: "leased" }
  // Campaign counts move only when this runner's row update actually happened (a lost lease changes nothing).
  const finish = async (set: Document, inc: Record<string, number> | null) => {
    const r = await recs.updateOne(mine, { $set: { leaseUntil: null, ...set } })
    if (r.modifiedCount === 1 && inc) await bcs.updateOne({ _id: b._id }, { $inc: inc })
    return r.modifiedCount === 1
  }
  const giveBack = (extra: Document = {}) => recs.updateOne(mine, { $set: { status: "pending", leaseUntil: null, leaseOwner: null, ...extra }, $inc: { attempts: -1 } })
  if (b.status === "cancelled") {
    await finish({ status: "cancelled", deliveryStatus: "skipped", skipReason: "cancelled", doneAt: now }, { "counts.queued": -1, "counts.skipped": 1 })
    res.recipients.released++
    return
  }
  if (b.status !== "sending") { await giveBack(); res.recipients.released++; return }
  // Stored params are re-minted (never cast): a tampered row fails here or at the gate's tripwire.
  const minted = fromTemplateParams(Array.isArray(rec.params) ? rec.params.map(String) : [])
  if (!minted.ok) {
    if (await finish({ status: "failed", doneAt: now, deliveryStatus: "failed", skipReason: "template_missing_param", lastError: { code: "template_param_invalid", message: minted.reason, at: now, retryable: false } }, { "counts.failed": 1, "counts.queued": -1 })) res.recipients.failed++
    return
  }
  const base = `bc:${String(b._id)}:${rec.phoneE164}`
  const prior = await priorAttempts(crm, base)
  if (prior.done) {
    if (await finish({ status: "done", doneAt: now, deliveryStatus: "sent", messageId: prior.done._id, waMessageId: prior.done.waMessageId ?? null, "statusAt.sent": rec.statusAt?.sent ?? now }, rec.statusAt?.sent ? { "counts.queued": -1 } : { "counts.sent": 1, "counts.queued": -1 })) {
      res.recipients.sent++
      await reconcileRecipient(crm, rec._id)
    }
    return
  }
  if (prior.unknown) {
    if (await finish({ status: "failed", doneAt: now, deliveryStatus: "failed", messageId: prior.unknown._id, lastError: { code: "unknown_outcome", message: "an earlier attempt may have reached Meta; not re-sent", at: now, retryable: false } }, { "counts.failed": 1, "counts.queued": -1 })) res.recipients.failed++
    return
  }
  const r = await sendMessage(
    crm,
    { system: "broadcast" },
    {
      contactId: rec.contactId as ObjectId, conversationId: null, idempotencyKey: `${base}:a${Number(rec.attempts ?? 1)}`, purpose: "broadcast", route: "broadcast.send",
      content: { kind: "template", name: String(b.templateName), language: String(rec.language), params: minted.params }, broadcastId: b._id as ObjectId, noRetryJob: true,
    },
    { allowList: deps.allowList, graph: deps.graph, requestId: deps.requestId, now: deps.now, log: deps.log },
  )
  if (!r.ok && r.error === "tier_cap") {
    const retryAt = r.detail && (r.detail as { retryAfter?: unknown }).retryAfter ? new Date(String((r.detail as { retryAfter: unknown }).retryAfter)) : new Date(now.getTime() + 3600_000)
    const back = await giveBack({ nextAttemptAt: Number.isNaN(retryAt.getTime()) ? new Date(now.getTime() + 3600_000) : retryAt, deliveryStatus: "queued" })
    if (back.modifiedCount === 1) {
      await recs.updateOne({ _id: rec._id }, { $inc: { deferredForCap: 1 } })
      if (!rec.deferredForCap) await bcs.updateOne({ _id: b._id }, { $inc: { "counts.deferred_cap": 1 } })
    }
    res.recipients.deferred++
    return
  }
  if (!r.ok && r.error === "sending_paused") {
    await giveBack()
    await bcs.updateOne({ _id: b._id, status: "sending" }, { $set: { status: "paused", pausedReason: "number_paused", updatedAt: now } })
    res.recipients.released++
    return
  }
  const out = sendOutcome(r)
  const msg = (r.ok ? r.message : r.message) ?? null
  if (out.kind === "done") {
    const sentSet = { status: "done", doneAt: now, deliveryStatus: "sent", skipReason: null, messageId: msg?._id ?? null, waMessageId: msg?.waMessageId ?? null, "statusAt.sent": now }
    let recorded = await finish(sentSet, { "counts.sent": 1, "counts.queued": -1 })
    if (!recorded) {
      // Cancelled mid-send: the message really went, so the row records it (never "cancelled" with a lost wamid).
      const r2 = await recs.updateOne({ _id: rec._id, status: "cancelled", deliveryStatus: "skipped" }, { $set: { leaseUntil: null, leaseOwner: null, ...sentSet } })
      if (r2.modifiedCount === 1) { await bcs.updateOne({ _id: b._id }, { $inc: { "counts.sent": 1, "counts.skipped": -1 } }); recorded = true }
    }
    if (recorded) {
      res.recipients.sent++
      // A delivered/read/failed tick may have arrived before the recipient knew its wamid.
      await reconcileRecipient(crm, rec._id)
    }
    return
  }
  const attempts = Number(rec.attempts ?? 1)
  if (out.kind === "retry" && attempts < Number(rec.maxAttempts ?? CRM_DEFAULTS.jobMaxAttempts)) {
    await finish({ status: "pending", leaseOwner: null, nextAttemptAt: new Date(now.getTime() + backoffMs(attempts)), lastError: { code: out.code, message: out.message, at: now, retryable: true } }, null)
    return
  }
  const skipReason = out.code === "not_on_whatsapp" || out.code === "meta_131026" ? "not_on_whatsapp" : out.code === "opted_out" || out.code === "meta_131050" ? "opted_out" : null
  if (await finish({ status: out.kind === "retry" ? "dead" : "failed", doneAt: now, deliveryStatus: "failed", skipReason, messageId: msg?._id ?? null, lastError: { code: out.code, message: out.message, at: now, retryable: false } }, { "counts.failed": 1, "counts.queued": -1 })) res.recipients.failed++
}

export async function runChunk(crm: CrmDb, pnid: string, deps: ChunkDeps): Promise<ChunkResult> {
  const nowOf = deps.now ?? (() => new Date())
  const sleep = deps.sleep ?? realSleep
  const owner = `chunk:${deps.requestId}:${new ObjectId().toHexString()}`
  const lockId = `${crm.workspace}:chunk:${pnid}`
  const res: ChunkResult = { locked: false, rounds: 0, recipients: { sent: 0, failed: 0, deferred: 0, released: 0 }, jobs: { done: 0, retry: 0, failed: 0, dead: 0 }, events: 0, completed: [], more: false, onlyDeferred: false }
  if (!(await acquire(crm, lockId, owner, nowOf()))) { res.locked = true; return res }
  const started = Date.now()
  const budget = deps.budgetMs ?? CRM_DEFAULTS.chunkTimeBudgetMs
  const handlers: Record<string, JobHandler> = deps.graph
    ? { wa_send: waSendHandler(crm, deps), ...reminderHandlers(crm, { allowList: deps.allowList, graph: deps.graph, requestId: deps.requestId, now: deps.now, log: deps.log }) }
    : {}
  let lost = false
  try {
    while (Date.now() - started < budget) {
      const now = nowOf()
      if (!(await renew(crm, lockId, owner, now))) break
      res.rounds++
      let did = 0
      // 1. broadcast recipients
      if (deps.graph) {
        const active = await activeBroadcasts(crm, pnid)
        if (active.length) {
          const byId = new Map((await crm.collection(COLL.broadcasts).find({ _id: { $in: active } }).toArray()).map(b => [String(b._id), b]))
          for (let i = 0; i < CRM_DEFAULTS.chunkBatchSize && Date.now() - started < budget; i++) {
            const t = nowOf()
            // Renew before every send: a runner that lost its lease must stop at once (no overlap).
            if (!(await renew(crm, lockId, owner, t))) { lost = true; break }
            const rec = await crm.collection(COLL.broadcastRecipients).findOneAndUpdate(
              { broadcastId: { $in: active }, $or: [{ status: "pending", nextAttemptAt: { $lte: t } }, { status: "leased", leaseUntil: { $lt: t } }] },
              { $set: { status: "leased", leaseUntil: new Date(t.getTime() + LOCK_MS), leaseOwner: owner }, $inc: { attempts: 1 } },
              { sort: { nextAttemptAt: 1 }, returnDocument: "after" },
            )
            if (!rec) break
            const b = (await crm.collection(COLL.broadcasts).findOne({ _id: rec.broadcastId })) ?? byId.get(String(rec.broadcastId))
            await processRecipient(crm, rec, b as Document, deps, t, owner, res)
            did++
            await sleep(100)
          }
        }
        if (lost) break
        // 2. jobs (lock renewed before each; at most 30 s per round)
        const jt = await runJobs(crm, handlers, {
          owner, limit: CRM_DEFAULTS.chunkBatchSize, budgetMs: Math.min(30_000, Math.max(1000, budget - (Date.now() - started))), now: nowOf,
          beforeEach: async () => { const ok = await renew(crm, lockId, owner, nowOf()); if (!ok) lost = true; return ok },
        })
        res.jobs.done += jt.done; res.jobs.retry += jt.retry; res.jobs.failed += jt.failed; res.jobs.dead += jt.dead
        did += jt.claimed
        if (lost) break
      }
      // 3. stale webhook events
      const tally = await drainStaleEvents(crm, { allowList: deps.allowList, accessToken: deps.accessToken, apiVersion: deps.apiVersion, fetch: deps.fetch, requestId: deps.requestId, leaseOwner: owner, now: nowOf })
      const ev = Object.values(tally).reduce((a, b) => a + b, 0)
      res.events += ev
      did += ev
      if (!did) break
    }
    // completion
    for (const b of await crm.collection(COLL.broadcasts).find({ phoneNumberId: pnid, status: "sending" }, { projection: { _id: 1 } }).toArray()) {
      const open = await crm.collection(COLL.broadcastRecipients).findOne({ broadcastId: b._id, status: { $in: ["pending", "leased"] } }, { projection: { _id: 1 } })
      if (!open) {
        const t = nowOf()
        const r = await crm.collection(COLL.broadcasts).updateOne({ _id: b._id, status: "sending" }, { $set: { status: "completed", completedAt: t, updatedAt: t } })
        if (r.modifiedCount) res.completed.push(String(b._id))
      }
    }
    // more due work?
    const t = nowOf()
    const active = await activeBroadcasts(crm, pnid)
    const dueRec = active.length
      ? await crm.collection(COLL.broadcastRecipients).findOne({ broadcastId: { $in: active }, $or: [{ status: "pending", nextAttemptAt: { $lte: t } }, { status: "leased", leaseUntil: { $lt: t } }] }, { projection: { _id: 1 } })
      : null
    const dueJob = deps.graph ? await crm.collection(COLL.jobs).findOne({ kind: { $in: Object.keys(handlers) }, status: "pending", nextAttemptAt: { $lte: t } }, { projection: { _id: 1 } }) : null
    const dueEvent = await crm.collection(COLL.waEvents).findOne({ allowed: true, status: "pending", nextAttemptAt: { $lte: t } }, { projection: { _id: 1 } })
    res.more = !!(dueRec || dueJob || dueEvent)
    const deferred = active.length ? await crm.collection(COLL.broadcastRecipients).findOne({ broadcastId: { $in: active }, status: "pending", nextAttemptAt: { $gt: t } }, { projection: { _id: 1 } }) : null
    res.onlyDeferred = !res.more && !!deferred
  } finally {
    await release(crm, lockId, owner, nowOf())
  }
  return res
}
