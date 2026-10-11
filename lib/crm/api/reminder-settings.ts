/**
 * STEP 7 settings that make reminders usable:
 *   PATCH /api/crm/deals/:id/reminders {quoteFollowUp?, serviceAmc?, amcDueAt?}  — crm.leads.edit
 *     (works on closed deals: the AMC opt-in lives on the Closed-Won deal; amcDueAt is on the contact)
 *   GET / PUT /api/crm/settings/staff {staff:[{userId, waE164|null, pushTasks}]}  — crm.settings.edit
 * Imports no notes module.
 */
import type { Document } from "mongodb"
import { crmError, crmJson, leadScopeOf, userRefOf } from "./auth"
import { isPlainObject, readJsonObject } from "../validate"
import { logCrmAction } from "../audit"
import { COLL } from "../model"
import { dealVisible } from "../leads/query"
import { fromHumanInput } from "../phone"
import { staffList, type StaffEntry } from "../staff"
import { assignableOf, auditCtx, idParam, nowOf, route } from "./route"

const KEYS = new Set(["quoteFollowUp", "serviceAmc", "amcDueAt"])
const isoOrNull = (d: unknown) => (d instanceof Date ? d.toISOString() : null)

export const dealRemindersHandler = route("deals.reminders", ["crm.leads.edit"], async ({ request, ctx, deps, requestId, actor }) => {
  const id = await idParam(ctx)
  if (!id) return crmError(400, "validation", requestId, { fields: { id: "invalid_id" } })
  const body = await readJsonObject(request)
  if (!body) return crmError(400, "invalid_json", requestId)
  const fields: Record<string, string> = {}
  for (const k of Object.getOwnPropertyNames(body)) if (!KEYS.has(k)) fields[k] = "unknown_field"
  for (const k of ["quoteFollowUp", "serviceAmc"]) if (Object.hasOwn(body, k) && typeof body[k] !== "boolean") fields[k] = "invalid"
  let amc: Date | null | undefined
  if (Object.hasOwn(body, "amcDueAt")) {
    const v = body.amcDueAt
    if (v === null || v === "") amc = null
    else if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
      amc = new Date(`${v}T04:30:00Z`) // 10:00 IST on that day
      if (Number.isNaN(amc.getTime()) || amc.getUTCFullYear() < 2020 || amc.getUTCFullYear() > 2100) fields.amcDueAt = "invalid_date"
    } else fields.amcDueAt = "invalid_date"
  }
  if (Object.keys(body).length === 0) fields.body = "empty"
  if (Object.keys(fields).length) return crmError(400, "validation", requestId, { fields })
  const crm = await deps.getDb()
  const deal = await crm.collection(COLL.deals).findOne({ _id: id }, { projection: { contactId: 1, assignedTo: 1, customerReminders: 1 } })
  if (!deal || !(await dealVisible(crm, leadScopeOf(actor), deal))) return crmError(404, "not_found", requestId)
  const now = nowOf(deps)
  const before = { quoteFollowUp: deal.customerReminders?.quoteFollowUp === true, serviceAmc: deal.customerReminders?.serviceAmc === true }
  const next = {
    quoteFollowUp: Object.hasOwn(body, "quoteFollowUp") ? body.quoteFollowUp === true : before.quoteFollowUp,
    serviceAmc: Object.hasOwn(body, "serviceAmc") ? body.serviceAmc === true : before.serviceAmc,
  }
  await crm.collection(COLL.deals).updateOne({ _id: id }, { $set: { customerReminders: next, updatedAt: now } })
  const contact = await crm.collection(COLL.contacts).findOne({ _id: deal.contactId }, { projection: { amcDueAt: 1 } })
  const prevAmc = isoOrNull(contact?.amcDueAt)
  if (amc !== undefined) await crm.collection(COLL.contacts).updateOne({ _id: deal.contactId }, { $set: { amcDueAt: amc, updatedAt: now } })
  const nextAmc = amc !== undefined ? isoOrNull(amc) : prevAmc
  const changed: string[] = []
  if (before.quoteFollowUp !== next.quoteFollowUp) changed.push(`quotation follow-up reminders ${next.quoteFollowUp ? "on" : "off"}`)
  if (before.serviceAmc !== next.serviceAmc) changed.push(`service reminders ${next.serviceAmc ? "on" : "off"}`)
  if (prevAmc !== nextAmc) changed.push(nextAmc ? `service due ${nextAmc.slice(0, 10)}` : "service due date cleared")
  if (changed.length) {
    const me = userRefOf(actor)
    await crm.collection(COLL.activities).insertOne({
      contactId: deal.contactId, dealId: id, kind: "field_change", at: now, by: me,
      summary: `Customer reminders: ${changed.join(", ")}`,
      data: { fields: ["customerReminders", ...(prevAmc !== nextAmc ? ["amcDueAt"] : [])] },
    })
    await logCrmAction(crm, me, "deal.reminders", { type: "deal", id: id.toHexString() }, { before: { ...before, amcDueAt: prevAmc }, after: { ...next, amcDueAt: nextAmc }, ...auditCtx(request) })
  }
  return crmJson({ customerReminders: next, amcDueAt: nextAmc }, requestId)
})

export const getStaffHandler = route("settings.staff.get", ["crm.settings.edit"], async ({ deps, requestId }) => {
  const crm = await deps.getDb()
  const [staff, team] = await Promise.all([staffList(crm), assignableOf(deps)()])
  const byId = new Map(staff.map(s => [String(s.userId), s]))
  return crmJson({ items: team.map(u => ({ userId: u.id, name: u.name, waE164: byId.get(u.id)?.waE164 ?? null, pushTasks: byId.get(u.id)?.pushTasks ?? false })) }, requestId)
})

export const putStaffHandler = route("settings.staff.put", ["crm.settings.edit"], async ({ request, deps, requestId, actor }) => {
  const body = await readJsonObject(request)
  if (!body) return crmError(400, "invalid_json", requestId)
  if (!Array.isArray(body.staff) || body.staff.length > 50) return crmError(400, "validation", requestId, { fields: { staff: "invalid_list" } })
  const fields: Record<string, string> = {}
  const team = new Map((await assignableOf(deps)()).map(u => [u.id, u.name]))
  const out: StaffEntry[] = []
  const seenPhones = new Set<string>()
  const seenUsers = new Set<string>()
  body.staff.forEach((row: unknown, i: number) => {
    if (!isPlainObject(row)) { fields[`staff.${i}`] = "invalid"; return }
    const userId = typeof row.userId === "string" ? row.userId : ""
    if (!team.has(userId)) { fields[`staff.${i}.userId`] = "not_assignable"; return }
    if (seenUsers.has(userId)) { fields[`staff.${i}.userId`] = "duplicate_user"; return }
    seenUsers.add(userId)
    let wa: string | null = null
    if (row.waE164 !== null && row.waE164 !== undefined && row.waE164 !== "") {
      const p = fromHumanInput(String(row.waE164))
      if (!p.ok || !p.phoneE164) { fields[`staff.${i}.waE164`] = "invalid_phone"; return }
      if (seenPhones.has(p.phoneE164)) { fields[`staff.${i}.waE164`] = "duplicate_phone"; return }
      seenPhones.add(p.phoneE164)
      wa = p.phoneE164
    }
    if (typeof row.pushTasks !== "boolean") { fields[`staff.${i}.pushTasks`] = "invalid"; return }
    out.push({ userId, name: team.get(userId) as string, waE164: wa, pushTasks: row.pushTasks && !!wa })
  })
  if (Object.keys(fields).length) return crmError(400, "validation", requestId, { fields })
  const crm = await deps.getDb()
  const now = nowOf(deps)
  const before = await staffList(crm)
  await crm.collection(COLL.settings).updateOne({ _id: crm.workspace } as Document, { $set: { staff: out, updatedAt: now, updatedBy: userRefOf(actor) } }, { upsert: true })
  // Contacts of numbers that are no longer staff lose the marker (they may become leads again).
  const keep = new Set(out.filter(s => s.waE164).map(s => s.waE164 as string))
  for (const s of before) {
    if (s.waE164 && !keep.has(s.waE164)) await crm.collection(COLL.contacts).updateMany({ phoneE164: s.waE164, staffUserId: String(s.userId) }, { $set: { staffUserId: null, updatedAt: now } })
  }
  await logCrmAction(crm, userRefOf(actor), "settings.staff", { type: "settings", id: "staff" }, {
    before: { count: before.length, withPhone: before.filter(s => s.waE164).length, push: before.filter(s => s.pushTasks).length },
    after: { count: out.length, withPhone: out.filter(s => s.waE164).length, push: out.filter(s => s.pushTasks).length },
    ...auditCtx(request),
  })
  return crmJson({ items: out }, requestId)
})
