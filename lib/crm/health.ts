/**
 * /api/crm/health (DATA_MODEL §8). Session-exempt in middleware; authenticated ONLY by
 * `Authorization: Bearer <CRON_SECRET>` (constant-time, same contract as lib/rbac/cron.ts —
 * never a query parameter; no secret configured = nothing qualifies).
 *
 * Reports per workspace: last webhook received, last inbound, last send (if any), queue depth
 * (pending/due crm_wa_events + crm_jobs + crm_broadcast_recipients), oldest due age, dead and
 * failed counts, and per allow-listed number its /health fields. Every query is indexed and
 * workspace-scoped through the wrapper.
 */
import { createHash, timingSafeEqual } from "node:crypto"
import type { Document } from "mongodb"
import type { CrmDb } from "./db"
import { COLL } from "./model"
import type { CrmEnv } from "./env"
import { tierUsed24h } from "./outbound/ledger"

export function isHealthAuthorized(authorization: string | null | undefined, secret: string | null | undefined): boolean {
  const s = typeof secret === "string" ? secret.trim() : ""
  if (!s || typeof authorization !== "string") return false
  const a = createHash("sha256").update(authorization).digest()
  const b = createHash("sha256").update(`Bearer ${s}`).digest()
  return timingSafeEqual(a, b)
}

const iso = (d: unknown): string | null => (d instanceof Date ? d.toISOString() : null)
const maxDate = (ds: unknown[]): Date | null =>
  ds.reduce<Date | null>((m, d) => (d instanceof Date && (!m || d > m) ? d : m), null)

async function queueStats(crm: CrmDb, coll: (typeof COLL)[keyof typeof COLL], now: Date) {
  const c = crm.collection(coll)
  const dueFilter = { $or: [{ status: "pending" }, { status: "leased" }] }
  const [pending, leased, dead, failed, ignored, oldest] = await Promise.all([
    c.countDocuments({ status: "pending" }),
    c.countDocuments({ status: "leased" }),
    c.countDocuments({ status: "dead" }),
    c.countDocuments({ status: "failed" }),
    c.countDocuments({ status: "ignored" }), // statuses for wamids we never sent; not an error
    c.findOne(dueFilter, { sort: { nextAttemptAt: 1 }, projection: { nextAttemptAt: 1 } }),
  ])
  const oldestDue = oldest && oldest.nextAttemptAt instanceof Date && oldest.nextAttemptAt <= now ? oldest.nextAttemptAt : null
  return {
    pending,
    leased,
    dead,
    failed,
    ignored,
    oldestDueAgeSec: oldestDue ? Math.round((now.getTime() - oldestDue.getTime()) / 1000) : 0,
  }
}

export async function buildHealthReport(crm: CrmDb, env: CrmEnv, now: Date = new Date()) {
  const numbersRows: Document[] = await crm.collection(COLL.waNumbers).find({}).limit(50).toArray()
  const pnids = Array.from(new Set([...env.waPhoneNumberIds, ...numbersRows.map(r => String(r.phoneNumberId))]))

  const numbers = await Promise.all(
    pnids.map(async pnid => {
      const row = numbersRows.find(r => r.phoneNumberId === pnid) ?? null
      // lib/crm/outbound/send.ts maintains crm_wa_numbers.lastSendAt ($max) and lastSendError on every
      // send; the message scan (index last_send) only covers numbers whose row predates step 5.
      const lastOut = row?.lastSendAt
        ? null
        : await crm.collection(COLL.messages).findOne(
            { phoneNumberId: pnid, direction: "out" },
            { sort: { createdAt: -1 }, projection: { createdAt: 1 } },
          )
      return {
        phoneNumberId: pnid,
        allowListed: env.waPhoneNumberIds.includes(pnid),
        displayPhone: row?.displayPhone ?? null,
        lastWebhookAt: iso(row?.lastWebhookAt),
        lastInboundAt: iso(row?.lastInboundAt),
        lastSendAt: iso(row?.lastSendAt) ?? iso(lastOut?.createdAt),
        lastSendError: row?.lastSendError ? { code: row.lastSendError.code ?? null, at: iso(row.lastSendError.at) } : null,
        sendingPaused: row?.sendingPaused ? { reason: String(row.sendingPaused.reason ?? ""), at: iso(row.sendingPaused.at) } : null,
        tierCap: typeof row?.tierCap === "number" ? row.tierCap : null,
        tierUsed24h: await tierUsed24h(crm, pnid, now),
      }
    }),
  )

  const lastEvent = await crm.collection(COLL.waEvents).findOne({}, { sort: { receivedAt: -1 }, projection: { receivedAt: 1 } })
  const [waEvents, jobs, broadcastRecipients] = await Promise.all([
    queueStats(crm, COLL.waEvents, now),
    queueStats(crm, COLL.jobs, now),
    queueStats(crm, COLL.broadcastRecipients, now),
  ])

  return {
    ok: true,
    workspace: crm.workspace,
    at: now.toISOString(),
    lastWebhookAt: iso(maxDate([lastEvent?.receivedAt, ...numbers.map(n => (n.lastWebhookAt ? new Date(n.lastWebhookAt) : null))])),
    lastInboundAt: iso(maxDate(numbers.map(n => (n.lastInboundAt ? new Date(n.lastInboundAt) : null)))),
    lastSendAt: iso(maxDate(numbers.map(n => (n.lastSendAt ? new Date(n.lastSendAt) : null)))),
    queueDepth: waEvents.pending + waEvents.leased + jobs.pending + jobs.leased + broadcastRecipients.pending + broadcastRecipients.leased,
    queues: { waEvents, jobs, broadcastRecipients },
    numbers,
    config: {
      allowListedNumbers: env.waPhoneNumberIds.length,
      appSecretSet: env.waAppSecret !== undefined,
      verifyTokenSet: env.waVerifyToken !== undefined,
      accessTokenSet: env.waAccessToken !== undefined,
    },
  }
}
