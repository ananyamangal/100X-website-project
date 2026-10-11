/**
 * Broadcast tracking from the webhook (STEP 9; DATA_MODEL §1.15):
 * - status ticks for a broadcast message move its recipient forward (sent → delivered → read;
 *   failed is terminal). Each status is written with its own guarded update
 *   ({"statusAt.<s>": {$exists: false}}) and its count is $inc'ed only by the update that wrote it,
 *   so concurrent ticks never lose one and never double count;
 * - reconcileRecipient: ticks that arrived before the recipient row knew its wamid are copied from
 *   the message row once the recipient is updated (the chunk loop calls it after a send);
 * - an inbound message from a number that got a broadcast in the last 72 h marks the latest such
 *   recipient `repliedAt` (once) and $inc counts.replied.
 */
import type { ObjectId } from "mongodb"
import type { CrmDb } from "../db"
import { COLL } from "../model"

const REPLY_WINDOW_MS = 72 * 3600_000
type Status = "sent" | "delivered" | "read" | "failed"
const RANK: Record<string, number> = { queued: 0, sent: 1, delivered: 2, read: 3 }

async function applyToRecipient(crm: CrmDb, rec: { _id: ObjectId; broadcastId: ObjectId }, s: Status, at: Date): Promise<boolean> {
  const recs = crm.collection(COLL.broadcastRecipients)
  let changed = false
  // read implies delivered (Meta can skip the delivered tick)
  for (const st of s === "read" ? (["delivered", "read"] as const) : [s]) {
    const r = await recs.updateOne({ _id: rec._id, [`statusAt.${st}`]: { $exists: false } }, { $set: { [`statusAt.${st}`]: at } })
    if (r.modifiedCount === 1) {
      changed = true
      await crm.collection(COLL.broadcasts).updateOne({ _id: rec.broadcastId }, { $inc: { [`counts.${st}`]: 1 } })
    }
  }
  if (s === "failed") {
    const r = await recs.updateOne({ _id: rec._id, deliveryStatus: { $ne: "failed" } }, { $set: { deliveryStatus: "failed" } })
    changed = changed || r.modifiedCount === 1
  } else {
    const lower = Object.keys(RANK).filter(k => RANK[k] < RANK[s])
    const r = await recs.updateOne({ _id: rec._id, deliveryStatus: { $in: lower } }, { $set: { deliveryStatus: s } })
    changed = changed || r.modifiedCount === 1
  }
  return changed
}

export async function applyRecipientStatus(crm: CrmDb, wamid: string, status: string, at: Date): Promise<boolean> {
  if (!["sent", "delivered", "read", "failed"].includes(status)) return false
  const rec = await crm.collection(COLL.broadcastRecipients).findOne({ waMessageId: wamid }, { projection: { broadcastId: 1 } })
  if (!rec) return false
  return applyToRecipient(crm, rec as unknown as { _id: ObjectId; broadcastId: ObjectId }, status as Status, at)
}

/** Copy delivered / read / failed ticks already on the message row to the recipient (once each). */
export async function reconcileRecipient(crm: CrmDb, recipientId: ObjectId): Promise<void> {
  const rec = await crm.collection(COLL.broadcastRecipients).findOne({ _id: recipientId }, { projection: { broadcastId: 1, messageId: 1 } })
  if (!rec?.messageId) return
  const msg = await crm.collection(COLL.messages).findOne({ _id: rec.messageId }, { projection: { statusAt: 1 } })
  const statusAt = (msg?.statusAt ?? {}) as Record<string, unknown>
  for (const st of ["delivered", "read", "failed"] as const) {
    const at = statusAt[st]
    if (at instanceof Date) await applyToRecipient(crm, rec as unknown as { _id: ObjectId; broadcastId: ObjectId }, st, at)
  }
}

export async function attributeReply(crm: CrmDb, phoneE164: string, now: Date): Promise<boolean> {
  const rec = await crm.collection(COLL.broadcastRecipients).findOneAndUpdate(
    { phoneE164, repliedAt: null, "statusAt.sent": { $gte: new Date(now.getTime() - REPLY_WINDOW_MS) } },
    { $set: { repliedAt: now } },
    { sort: { "statusAt.sent": -1 }, projection: { broadcastId: 1 } },
  )
  if (!rec) return false
  await crm.collection(COLL.broadcasts).updateOne({ _id: rec.broadcastId }, { $inc: { "counts.replied": 1 } })
  return true
}
