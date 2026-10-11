/**
 * Broadcast life cycle (STEP 9; DATA_MODEL §1.15, §5):
 *   start  draft → expanding → sending: the segment is evaluated fresh; one recipient row per phone
 *          (unique per broadcast, so duplicates collapse). Opted-out → skipped(opted_out);
 *          notOnWhatsApp → skipped(not_on_whatsapp); a missing contact value for a parameter →
 *          skipped(template_missing_param). Everyone else is queued (QueueFields, sent by ./chunk.ts).
 *   pause / resume / cancel; recount (aggregate fallback for counts).
 * Counts are kept with $inc on each transition.
 */
import { ObjectId, type Document } from "mongodb"
import type { CrmDb } from "../db"
import { logCrmAction } from "../audit"
import { COLL, CRM_DEFAULTS, type WaLanguage } from "../model"
import { userRefOf, type CrmActor } from "../api/auth"
import { fromTemplateParam } from "../outbound/compose"
import { audienceContacts, MAX_AUDIENCE } from "./segments"
import { contactsForCsv, csvAudienceRows } from "./audience-csv"
import { autoDetectColumns } from "../dealers/import"
import { checkBroadcastTemplate, EMPTY_COUNTS, type ParamSource } from "./service"

export type RunResult = { ok: true; broadcast: Document } | { ok: false; status: 400 | 404 | 409; error: string; fields?: Record<string, string> }

function resolveParam(p: ParamSource, c: Document, csvRow?: Record<string, string>): string | null {
  if ("literal" in p) return p.literal
  const v = p.from === "csv.column" ? csvRow?.[p.column] : p.from === "contact.name" ? (c.name || c.waProfileName) : p.from === "contact.company" ? c.company : c.city
  return typeof v === "string" && v.trim() ? v.trim().replace(/\s+/g, " ") : null
}

export async function startBroadcast(crm: CrmDb, actor: CrmActor, id: ObjectId, now: Date): Promise<RunResult> {
  const bcs = crm.collection(COLL.broadcasts)
  const b = await bcs.findOne({ _id: id })
  if (!b) return { ok: false, status: 404, error: "not_found" }
  if (b.status !== "draft") return { ok: false, status: 409, error: "not_draft" }
  const tplErr = await checkBroadcastTemplate(crm, { templateName: b.templateName, languageMode: b.languageMode, params: b.params })
  if (tplErr) return { ok: false, status: 400, error: "validation", fields: tplErr }
  const isCsv = b.audience?.kind === "csv"
  const segment = isCsv ? null : await crm.collection(COLL.segments).findOne({ _id: b.audience?.segmentId })
  const csv = isCsv ? await csvAudienceRows(crm, b.audience.importId as ObjectId) : null
  if (!isCsv && !segment) return { ok: false, status: 400, error: "validation", fields: { segmentId: "not_found" } }
  if (isCsv && !csv) return { ok: false, status: 400, error: "validation", fields: { csvImportId: "not_found" } }
  const claim = await bcs.updateOne({ _id: id, status: "draft" }, { $set: { status: "expanding", updatedAt: now } })
  if (claim.modifiedCount !== 1) return { ok: false, status: 409, error: "not_draft" }

  try {
    // Audience → [contact, csv row?]: a fresh segment evaluation, or the CSV rows matched to contacts.
    let entries: { c: Document; row?: Record<string, string> }[]
    if (csv) {
      const cols = Object.fromEntries(Object.entries(autoDetectColumns(csv.headers)).filter(([k]) => ["name", "company", "city"].includes(k))) as { name?: string; company?: string; city?: string }
      const byPhone = await contactsForCsv(crm, csv.rows, cols, now)
      entries = csv.rows.flatMap(r => { const c = byPhone.get(r.phoneE164); return c ? [{ c, row: r.raw }] : [] })
    } else entries = (await audienceContacts(crm, segment?.filter ?? {}, now)).map(c => ({ c }))
    const contacts = entries.map(e => e.c)
    if (contacts.length > MAX_AUDIENCE) {
      await bcs.updateOne({ _id: id, status: "expanding" }, { $set: { status: "draft", updatedAt: now } })
      return { ok: false, status: 409, error: "audience_too_large" }
    }
    const opted = new Set((await crm.collection(COLL.optOuts).find({ phoneE164: { $in: contacts.map(c => c.phoneE164) } }, { projection: { phoneE164: 1 } }).toArray()).map(r => String(r.phoneE164)))
    const hiOk = b.languageMode === "contact_preference" && !!(await crm.collection(COLL.waTemplates).findOne({ name: b.templateName, language: "hi", status: "APPROVED" }, { projection: { _id: 1 } }))
    const params = b.params as ParamSource[]
    const base = {
      broadcastId: id, messageId: null, waMessageId: null, statusAt: {}, repliedAt: null, deferredForCap: 0,
      attempts: 0, maxAttempts: CRM_DEFAULTS.jobMaxAttempts, nextAttemptAt: now, leaseUntil: null, leaseOwner: null, lastError: null, doneAt: null, createdAt: now,
    }
    const rows: Document[] = []
    for (const { c, row } of entries) {
      if (typeof c.phoneE164 !== "string") continue
      const language: WaLanguage = b.languageMode === "contact_preference" ? (c.language === "hi" && hiOk ? "hi" : "en_US") : b.languageMode
      let skip: string | null = null
      if (typeof c.staffUserId === "string" && c.staffUserId) skip = "team_member"
      else if (c.marketingOptOut || opted.has(c.phoneE164)) skip = "opted_out"
      else if (c.notOnWhatsApp) skip = "not_on_whatsapp"
      const values: string[] = []
      if (!skip) for (const p of params) {
        const v = resolveParam(p, c, row)
        if (v === null || !fromTemplateParam(v).ok) { skip = "template_missing_param"; break }
        values.push(v)
      }
      rows.push({
        ...base, _id: new ObjectId(), phoneE164: c.phoneE164, contactId: c._id, language, params: skip ? [] : values,
        deliveryStatus: skip ? "skipped" : "queued", skipReason: skip, status: skip ? "done" : "pending", ...(skip ? { doneAt: now } : {}),
      })
    }
    let inserted = 0
    for (let i = 0; i < rows.length; i += 500) {
      const batch = rows.slice(i, i + 500)
      try {
        const r = await crm.collection(COLL.broadcastRecipients).insertMany(batch, { ordered: false })
        inserted += r.insertedCount
      } catch (e) {
        const n = (e as { insertedCount?: number; result?: { insertedCount?: number } }).insertedCount ?? (e as { result?: { insertedCount?: number } }).result?.insertedCount
        if ((e as { code?: number }).code !== 11000 && !String((e as Error).message).includes("E11000")) throw e
        inserted += typeof n === "number" ? n : 0
      }
    }
    const agg = await recountRows(crm, id)
    const counts = { ...EMPTY_COUNTS, ...agg }
    const flip = await bcs.updateOne({ _id: id, status: "expanding" }, { $set: { status: "sending", startedAt: now, counts, updatedAt: now } })
    if (flip.modifiedCount !== 1) {
      // Cancelled while expanding: the rows inserted meanwhile must never be sent.
      await crm.collection(COLL.broadcastRecipients).updateMany({ broadcastId: id, status: { $in: ["pending", "leased"] } }, { $set: { status: "cancelled", deliveryStatus: "skipped", skipReason: "cancelled", doneAt: now } })
      const final = { ...EMPTY_COUNTS, ...(await recountRows(crm, id)) }
      await bcs.updateOne({ _id: id }, { $set: { counts: final, updatedAt: now } })
      return { ok: false, status: 409, error: "cancelled_during_expand" }
    }
    await logCrmAction(crm, userRefOf(actor), "broadcast.start", { type: "broadcast", id: id.toHexString() }, { after: { total: counts.total, queued: counts.queued, skipped: counts.skipped, rowsBuilt: rows.length, inserted } })
    return { ok: true, broadcast: { ...b, status: "sending", startedAt: now, counts } }
  } catch (e) {
    await bcs.updateOne({ _id: id, status: "expanding" }, { $set: { status: "draft", updatedAt: now } })
    throw e
  }
}

async function recountRows(crm: CrmDb, id: ObjectId): Promise<Record<string, number>> {
  const rows = await crm.collection(COLL.broadcastRecipients).aggregate([
    { $match: { broadcastId: id } },
    { $group: {
      _id: null,
      total: { $sum: 1 },
      skipped: { $sum: { $cond: [{ $eq: ["$deliveryStatus", "skipped"] }, 1, 0] } },
      queued: { $sum: { $cond: [{ $eq: ["$deliveryStatus", "queued"] }, 1, 0] } },
      sent: { $sum: { $cond: [{ $ifNull: ["$statusAt.sent", false] }, 1, 0] } },
      delivered: { $sum: { $cond: [{ $ifNull: ["$statusAt.delivered", false] }, 1, 0] } },
      read: { $sum: { $cond: [{ $ifNull: ["$statusAt.read", false] }, 1, 0] } },
      failed: { $sum: { $cond: [{ $eq: ["$deliveryStatus", "failed"] }, 1, 0] } },
      replied: { $sum: { $cond: [{ $ifNull: ["$repliedAt", false] }, 1, 0] } },
      deferred_cap: { $sum: { $cond: [{ $gt: ["$deferredForCap", 0] }, 1, 0] } },
    } },
  ]).toArray()
  const r = rows[0] ?? {}
  return Object.fromEntries(Object.keys(EMPTY_COUNTS).map(k => [k, Number(r[k] ?? 0)]))
}

/** Admin "recount": counts rebuilt from the recipient rows. */
export async function recountBroadcast(crm: CrmDb, id: ObjectId, now: Date): Promise<RunResult> {
  const b = await crm.collection(COLL.broadcasts).findOne({ _id: id })
  if (!b) return { ok: false, status: 404, error: "not_found" }
  const counts = { ...EMPTY_COUNTS, ...(await recountRows(crm, id)) }
  await crm.collection(COLL.broadcasts).updateOne({ _id: id }, { $set: { counts, updatedAt: now } })
  return { ok: true, broadcast: { ...b, counts } }
}

export async function setBroadcastState(crm: CrmDb, actor: CrmActor, id: ObjectId, action: "pause" | "resume" | "cancel", now: Date): Promise<RunResult> {
  const bcs = crm.collection(COLL.broadcasts)
  const from = action === "pause" ? ["sending"] : action === "resume" ? ["paused"] : ["sending", "paused", "expanding"]
  const to = action === "pause" ? "paused" : action === "resume" ? "sending" : "cancelled"
  const r = await bcs.findOneAndUpdate(
    { _id: id, status: { $in: from } },
    { $set: { status: to, updatedAt: now, ...(action === "cancel" ? { completedAt: now } : {}), ...(action === "resume" ? { pausedReason: null } : {}) } },
    { returnDocument: "after" },
  )
  if (!r) {
    const exists = await bcs.findOne({ _id: id }, { projection: { status: 1 } })
    return exists ? { ok: false, status: 409, error: `cannot_${action}_${exists.status}` } : { ok: false, status: 404, error: "not_found" }
  }
  if (action === "cancel") {
    // Leased rows too: a live runner's own finish() then matches nothing, so nothing is counted twice.
    await crm.collection(COLL.broadcastRecipients).updateMany({ broadcastId: id, status: { $in: ["pending", "leased"] } }, { $set: { status: "cancelled", deliveryStatus: "skipped", skipReason: "cancelled", doneAt: now, leaseUntil: null } })
    // Rebuilt from the rows (no $inc race with an in-flight expand).
    await bcs.updateOne({ _id: id }, { $set: { counts: { ...EMPTY_COUNTS, ...(await recountRows(crm, id)) } } })
  }
  await logCrmAction(crm, userRefOf(actor), `broadcast.${action}`, { type: "broadcast", id: id.toHexString() }, { before: { status: from.join("|") }, after: { status: to } })
  return { ok: true, broadcast: (await bcs.findOne({ _id: id })) ?? r }
}
