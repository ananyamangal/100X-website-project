/**
 * Growth OS exports (STEP 10; DATA_MODEL §7, ADR §15). The only CRM module (with the website ingest
 * and the conversion writer) allowed to read the sales-invisible collections. Never imports
 * lib/growth-os (static test).
 *
 * - conversionsCsv: Google Ads Offline Conversion Import, rows with a click id only. Columns
 *   Google Click ID, GBRAID, WBRAID, Conversion Name, Conversion Time (yyyy-MM-dd HH:mm:ss+05:30),
 *   Conversion Value (rupees), Conversion Currency, Order ID. Each exported event gets
 *   exports[] += {batchId, at, by}.
 * - customerMatchCsv: one column "Phone" = SHA-256 of the E.164 number (with "+"), lower-case hex;
 *   opted-out and not-on-WhatsApp numbers are excluded.
 * Both refuse with growth_sync_disabled when CRM_GROWTH_OS_SYNC is off.
 */
import { createHash } from "node:crypto"
import { ObjectId, type Document } from "mongodb"
import type { CrmDb } from "../db"
import { COLL, type SegmentFilter, type UserRef } from "../model"
import { audienceContacts, MAX_AUDIENCE } from "../broadcasts/segments"

export const CONVERSION_NAMES: Record<"closed_won" | "quotation_sent", string> = {
  closed_won: "CRM Closed Won",
  quotation_sent: "CRM Quotation Sent",
}
const MAX_ROWS = 10_000
const IST = 5.5 * 3600_000

export function csvCell(v: string): string {
  // Leading = + - @ would be executed as a formula by spreadsheet apps: prefix with an apostrophe.
  const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}
const row = (cells: string[]) => cells.map(csvCell).join(",")

/** "2026-10-10 15:30:00+05:30" */
export function adsTime(d: Date): string {
  const t = new Date(d.getTime() + IST).toISOString()
  return `${t.slice(0, 10)} ${t.slice(11, 19)}+05:30`
}

export const sha256Phone = (e164: string) => createHash("sha256").update(e164.trim()).digest("hex")

export interface ConversionQuery { kind: "closed_won" | "quotation_sent" | "all"; from: Date | null; to: Date | null }

export async function conversionsCsv(crm: CrmDb, q: ConversionQuery, by: UserRef, now: Date): Promise<{ csv: string; rows: number; batchId: string }> {
  const filter: Document = { hasClickId: true }
  if (q.kind !== "all") filter.kind = q.kind
  if (q.from || q.to) filter.conversionAt = { ...(q.from ? { $gte: q.from } : {}), ...(q.to ? { $lt: q.to } : {}) }
  const events = await crm.collection(COLL.conversionEvents).find(filter, { sort: { conversionAt: 1 }, limit: MAX_ROWS, projection: { kind: 1, orderId: 1, value: 1, currency: 1, conversionAt: 1, gclid: 1, gbraid: 1, wbraid: 1 } }).toArray()
  const lines = [row(["Google Click ID", "GBRAID", "WBRAID", "Conversion Name", "Conversion Time", "Conversion Value", "Conversion Currency", "Order ID"])]
  for (const e of events) {
    lines.push(row([
      String(e.gclid ?? ""), String(e.gbraid ?? ""), String(e.wbraid ?? ""),
      CONVERSION_NAMES[e.kind as "closed_won" | "quotation_sent"] ?? String(e.kind),
      adsTime(e.conversionAt as Date),
      (Number(e.value) / 100).toFixed(2),
      String(e.currency ?? "INR"),
      String(e.orderId),
    ]))
  }
  const batchId = new ObjectId().toHexString()
  if (events.length) {
    await crm.collection(COLL.conversionEvents).updateMany({ _id: { $in: events.map(e => e._id) } }, { $push: { exports: { batchId, at: now, by } } } as Document)
  }
  return { csv: lines.join("\r\n") + "\r\n", rows: events.length, batchId }
}

export async function customerMatchCsv(crm: CrmDb, filter: SegmentFilter, now: Date): Promise<{ csv: string; rows: number; excluded: number; tooMany: boolean }> {
  const contacts = await audienceContacts(crm, filter, now)
  const tooMany = contacts.length > MAX_AUDIENCE
  const list = contacts.slice(0, MAX_AUDIENCE)
  const opted = new Set((await crm.collection(COLL.optOuts).find({ phoneE164: { $in: list.map(c => c.phoneE164) } }, { projection: { phoneE164: 1 } }).toArray()).map(r => String(r.phoneE164)))
  const lines = [row(["Phone"])]
  let excluded = 0
  const seen = new Set<string>()
  for (const c of list) {
    const p = typeof c.phoneE164 === "string" ? c.phoneE164 : ""
    if (!p || c.marketingOptOut || opted.has(p) || c.notOnWhatsApp) { excluded++; continue }
    const h = sha256Phone(p)
    if (seen.has(h)) continue
    seen.add(h)
    lines.push(h)
  }
  return { csv: lines.join("\r\n") + "\r\n", rows: seen.size, excluded, tooMany }
}
