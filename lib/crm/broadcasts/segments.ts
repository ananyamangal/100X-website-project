/**
 * Segments (STEP 9; DATA_MODEL §1.15): a saved filter, evaluated fresh at preview and at broadcast
 * expand time (never cached). Contact criteria (customer type, state, interest tags, existing
 * dealer) and deal criteria (stage, Closed-Won within N days, lead source) are ANDed; values within
 * one criterion are ORed. Merged contacts and team members' own numbers are never in an audience.
 */
import { ObjectId, type Document } from "mongodb"
import type { CrmDb } from "../db"
import { logCrmAction } from "../audit"
import { COLL, CUSTOMER_TYPES, LEAD_SOURCES, STAGES, type SegmentFilter } from "../model"
import { userRefOf, type CrmActor } from "../api/auth"
import { Checker, isPlainObject, type FieldErrors } from "../validate"
import { toClient } from "../leads/query"

export const MAX_AUDIENCE = 10_000
const DAY = 86_400_000

const enumList = <T extends string>(c: Checker, v: unknown, field: string, allowed: readonly T[]): T[] | undefined => {
  if (v === undefined || v === null) return undefined
  if (!Array.isArray(v) || v.length > 50 || !v.every(x => typeof x === "string" && (allowed as readonly string[]).includes(x))) { c.fail(field, "invalid_list"); return undefined }
  return v.length ? Array.from(new Set(v as T[])) : undefined
}

export function parseSegmentInput(body: Record<string, unknown>): { ok: true; name: string; filter: SegmentFilter } | { ok: false; fields: FieldErrors } {
  const c = new Checker()
  for (const k of Object.getOwnPropertyNames(body)) if (k !== "name" && k !== "filter") c.fail(k, "unknown_field")
  const name = c.str(body, "name", 80, { required: true })
  const f = isPlainObject(body.filter) ? body.filter : (c.fail("filter", "invalid_object"), {})
  const KEYS = new Set(["customerTypes", "states", "stages", "closedWonWithinDays", "existingDealer", "interestTags", "leadSources"])
  for (const k of Object.getOwnPropertyNames(f)) if (!KEYS.has(k)) c.fail(`filter.${k}`, "unknown_field")
  const filter: SegmentFilter = {}
  const ct = enumList(c, f.customerTypes, "filter.customerTypes", CUSTOMER_TYPES); if (ct) filter.customerTypes = ct
  const st = enumList(c, f.stages, "filter.stages", STAGES); if (st) filter.stages = st
  const ls = enumList(c, f.leadSources, "filter.leadSources", LEAD_SOURCES); if (ls) filter.leadSources = ls
  if (f.states !== undefined && f.states !== null) {
    if (!Array.isArray(f.states) || f.states.length > 40 || !f.states.every(x => typeof x === "string" && x.trim() && x.length <= 60)) c.fail("filter.states", "invalid_list")
    else if (f.states.length) filter.states = Array.from(new Set((f.states as string[]).map(s => s.trim())))
  }
  if (f.interestTags !== undefined && f.interestTags !== null) {
    if (!Array.isArray(f.interestTags) || f.interestTags.length > 30 || !f.interestTags.every(x => typeof x === "string" && /^[a-z0-9][a-z0-9-]{0,39}$/.test(x))) c.fail("filter.interestTags", "invalid_list")
    else if (f.interestTags.length) filter.interestTags = Array.from(new Set(f.interestTags as string[]))
  }
  if (f.closedWonWithinDays !== undefined && f.closedWonWithinDays !== null) {
    if (!Number.isInteger(f.closedWonWithinDays) || (f.closedWonWithinDays as number) < 1 || (f.closedWonWithinDays as number) > 3650) c.fail("filter.closedWonWithinDays", "invalid_number")
    else filter.closedWonWithinDays = f.closedWonWithinDays as number
  }
  if (f.existingDealer !== undefined && f.existingDealer !== null) {
    if (typeof f.existingDealer !== "boolean") c.fail("filter.existingDealer", "invalid")
    else filter.existingDealer = f.existingDealer
  }
  return c.ok ? { ok: true, name: name as string, filter } : { ok: false, fields: c.errors }
}

/** Contacts matching a filter (projection for expansion), capped at MAX_AUDIENCE + 1 so callers can tell "too many". */
export async function audienceContacts(crm: CrmDb, filter: SegmentFilter, now: Date): Promise<Document[]> {
  const and: Document[] = [{ mergedInto: null }, { $or: [{ staffUserId: null }, { staffUserId: { $exists: false } }] }]
  if (filter.customerTypes?.length) and.push({ customerType: { $in: filter.customerTypes } })
  if (filter.states?.length) and.push({ state: { $in: filter.states } })
  if (filter.interestTags?.length) and.push({ interestTags: { $in: filter.interestTags } })
  if (filter.existingDealer === true) and.push({ existingDealer: { $ne: null } })
  if (filter.existingDealer === false) and.push({ existingDealer: null })
  const dealClauses: Document[] = []
  if (filter.stages?.length) dealClauses.push({ stage: { $in: filter.stages } })
  if (filter.leadSources?.length) dealClauses.push({ leadSource: { $in: filter.leadSources } })
  if (filter.closedWonWithinDays) dealClauses.push({ stage: "closed_won", closedAt: { $gte: new Date(now.getTime() - filter.closedWonWithinDays * DAY) } })
  for (const clause of dealClauses) {
    const ids = await crm.collection(COLL.deals).distinct("contactId", clause)
    and.push({ _id: { $in: ids } })
  }
  return crm.collection(COLL.contacts).find(
    { $and: and },
    { sort: { _id: 1 }, limit: MAX_AUDIENCE + 1, projection: { phoneE164: 1, name: 1, waProfileName: 1, company: 1, city: 1, language: 1, marketingOptOut: 1, notOnWhatsApp: 1 } },
  ).toArray()
}

export interface AudiencePreview { total: number; sendable: number; optedOut: number; notOnWhatsApp: number; tooMany: boolean }

export async function previewAudience(crm: CrmDb, filter: SegmentFilter, now: Date): Promise<AudiencePreview> {
  const rows = await audienceContacts(crm, filter, now)
  const tooMany = rows.length > MAX_AUDIENCE
  const list = rows.slice(0, MAX_AUDIENCE)
  const optedPhones = new Set((await crm.collection(COLL.optOuts).find({ phoneE164: { $in: list.map(r => r.phoneE164) } }, { projection: { phoneE164: 1 } }).toArray()).map(r => String(r.phoneE164)))
  let optedOut = 0, notOn = 0
  for (const r of list) {
    if (r.marketingOptOut || optedPhones.has(String(r.phoneE164))) optedOut++
    else if (r.notOnWhatsApp) notOn++
  }
  return { total: list.length, sendable: list.length - optedOut - notOn, optedOut, notOnWhatsApp: notOn, tooMany }
}

export const segmentView = (s: Document) => toClient(s)

export async function createSegment(crm: CrmDb, actor: CrmActor, name: string, filter: SegmentFilter, now: Date): Promise<Document> {
  const doc = { _id: new ObjectId(), name, filter, createdBy: userRefOf(actor), createdAt: now, updatedAt: now }
  await crm.collection(COLL.segments).insertOne(doc)
  await logCrmAction(crm, userRefOf(actor), "segment.create", { type: "segment", id: String(doc._id) }, { after: { name, criteria: Object.keys(filter) } })
  return doc
}

export async function updateSegment(crm: CrmDb, actor: CrmActor, id: ObjectId, name: string, filter: SegmentFilter, now: Date): Promise<Document | null> {
  const before = await crm.collection(COLL.segments).findOne({ _id: id })
  if (!before) return null
  await crm.collection(COLL.segments).updateOne({ _id: id }, { $set: { name, filter, updatedAt: now } })
  await logCrmAction(crm, userRefOf(actor), "segment.update", { type: "segment", id: id.toHexString() }, { before: { name: before.name, criteria: Object.keys(before.filter ?? {}) }, after: { name, criteria: Object.keys(filter) } })
  return { ...before, name, filter, updatedAt: now }
}
