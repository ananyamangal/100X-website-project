/**
 * PATCH /api/crm/deals/:id — assignment, follow-up date, product interest, customer-type confirm.
 * Stage changes are STEP 4c and are refused here (400 stage_changes_not_supported).
 *
 * Permissions (route requires crm.view): `assignedTo` needs crm.leads.assign; every other field
 * needs crm.leads.edit. Only open deals can be patched (409 deal_closed): re-opening is a stage
 * change (4c). Writes: deal (+ contact/conversation assignee sync, contact customerType +
 * suggestion decision), one `assignment` and/or `field_change` activity, one audit row.
 */
import { ObjectId, type Document } from "mongodb"
import type { CrmDb } from "../db"
import { COLL, CUSTOMER_TYPES, type CustomerType, type ProductInterest, type UserRef } from "../model"
import { Checker, isPlainObject, parseCustomerType, type FieldErrors } from "../validate"
import { can, userRefOf, type CrmActor, type LeadScope } from "../api/auth"
import { dealVisible, toClient, DEAL_DETAIL_FIELDS } from "./query"
import { logCrmAction } from "../audit"

const ALLOWED = new Set(["assignedTo", "nextFollowUpAt", "productInterest", "customerType", "rejectSuggestion", "acceptSuggestion"])
const SUGGESTION_OPS = new Set(["rejectSuggestion", "acceptSuggestion"])

/** Suggestion kinds (contact.suggestions[].field). A Map: user input never resolves an Object.prototype key. */
const SUGGESTION_KINDS: ReadonlyMap<string, SuggestionKind> = new Map<string, SuggestionKind>([
  ["customerType", "customerType"],
  ["interestTag", "interestTag"],
])
export type SuggestionKind = "customerType" | "interestTag"
export interface SuggestionOp {
  kind: SuggestionKind
  value: string
}
const STAGE_KEYS = new Set(["stage", "won", "lost", "isOpen", "closedAt", "stageHistory"])

export interface DealPatch {
  assignedTo?: string | null
  nextFollowUpAt?: Date | null
  productInterest?: ProductInterest[]
  customerType?: CustomerType
  /** Contact-level: mark a pending suggestion rejected (customerType or interestTag). */
  rejectSuggestion?: SuggestionOp
  /** Contact-level: accept a pending interestTag suggestion (adds the tag). customerType is accepted via `customerType`. */
  acceptSuggestion?: SuggestionOp
}

function parseSuggestionOp(c: Checker, body: Record<string, unknown>, field: "rejectSuggestion" | "acceptSuggestion"): SuggestionOp | null {
  const v = body[field]
  if (!isPlainObject(v)) {
    c.fail(field, "invalid_object")
    return null
  }
  const extra = Object.keys(v).filter(k => k !== "kind" && k !== "value")
  if (extra.length) {
    c.fail(field, "unknown_field")
    return null
  }
  const kind = typeof v.kind === "string" ? SUGGESTION_KINDS.get(v.kind) : undefined
  if (!kind) {
    c.fail(`${field}.kind`, "invalid_enum")
    return null
  }
  if (field === "acceptSuggestion" && kind === "customerType") {
    c.fail(`${field}.kind`, "use_customerType_field")
    return null
  }
  const ic = new Checker()
  const value = ic.str(v, "value", 80, { required: true })
  if (!value) {
    c.fail(`${field}.value`, ic.errors.value ?? "required")
    return null
  }
  if (kind === "customerType" && !(CUSTOMER_TYPES as readonly string[]).includes(value)) {
    c.fail(`${field}.value`, "invalid_enum")
    return null
  }
  return { kind, value }
}

export type DealPatchParse =
  | { ok: true; patch: DealPatch }
  | { ok: false; status: 400; error: string; fields?: FieldErrors }

export function parseDealPatch(body: Record<string, unknown>): DealPatchParse {
  const keys = Object.keys(body)
  if (keys.some(k => STAGE_KEYS.has(k))) return { ok: false, status: 400, error: "stage_changes_not_supported" }
  const unknown = keys.filter(k => !ALLOWED.has(k))
  if (unknown.length) return { ok: false, status: 400, error: "validation", fields: Object.fromEntries(unknown.map(k => [k, "unknown_field"])) }
  if (keys.length === 0) return { ok: false, status: 400, error: "validation", fields: { body: "empty_patch" } }
  if (keys.some(k => SUGGESTION_OPS.has(k)) && keys.some(k => !SUGGESTION_OPS.has(k))) return { ok: false, status: 400, error: "combined_patch_not_supported" }

  const c = new Checker()
  const patch: DealPatch = {}
  if ("assignedTo" in body) {
    if (body.assignedTo === null) patch.assignedTo = null
    else {
      const id = c.oid(body, "assignedTo")
      if (id) patch.assignedTo = id
      else c.fail("assignedTo", "invalid_id")
    }
  }
  if ("nextFollowUpAt" in body) {
    const v = body.nextFollowUpAt
    if (v === null) patch.nextFollowUpAt = null
    else if (typeof v === "string" && v.length <= 40 && !Number.isNaN(new Date(v).getTime())) {
      const d = new Date(v)
      const y = d.getUTCFullYear()
      if (y < 2020 || y > 2100) c.fail("nextFollowUpAt", "out_of_range")
      else patch.nextFollowUpAt = d
    } else c.fail("nextFollowUpAt", "invalid_date")
  }
  if ("productInterest" in body) {
    const v = body.productInterest
    if (!Array.isArray(v) || v.length > 20) c.fail("productInterest", "invalid_list")
    else {
      const out: ProductInterest[] = []
      v.forEach((row, i) => {
        if (!isPlainObject(row)) return c.fail(`productInterest.${i}`, "invalid_item")
        const ic = new Checker()
        const label = ic.str(row, "label", 160, { required: true })
        const qty = ic.int(row, "qty", 1, 1_000_000)
        const slug = ic.str(row, "productSlug", 120)
        if (slug !== null && !/^[a-z0-9][a-z0-9\-]*$/.test(slug)) ic.fail("productSlug", "invalid_slug")
        for (const [k, code] of Object.entries(ic.errors)) c.fail(`productInterest.${i}.${k}`, code)
        if (ic.ok && label) out.push({ productSlug: slug, label, qty })
      })
      patch.productInterest = out
    }
  }
  for (const op of ["rejectSuggestion", "acceptSuggestion"] as const) {
    if (op in body) {
      const parsed = parseSuggestionOp(c, body, op)
      if (parsed) patch[op] = parsed
    }
  }
  if ("customerType" in body) {
    const t = parseCustomerType(c, body, "customerType", true)
    if (t) patch.customerType = t
  }
  if (!c.ok) return { ok: false, status: 400, error: "validation", fields: c.errors }
  return { ok: true, patch }
}

export type DealPatchResult =
  | { ok: true; deal: unknown }
  | { ok: false; status: 400 | 403 | 404 | 409; error: string; fields?: FieldErrors; required?: string[] }

const iso = (d: unknown) => (d instanceof Date ? d.toISOString() : d ?? null)

export async function applyDealPatch(
  crm: CrmDb,
  actor: CrmActor,
  scope: LeadScope,
  dealId: ObjectId,
  patch: DealPatch,
  deps: { assignable: () => Promise<{ id: string; name: string }[]>; now?: Date; ip?: string | null; userAgent?: string | null },
): Promise<DealPatchResult> {
  if (patch.customerType && !(CUSTOMER_TYPES as readonly string[]).includes(patch.customerType)) {
    // Defence in depth: parseDealPatch only yields enum values; refuse before anything is written (no accept-all on suggestions).
    return { ok: false, status: 400, error: "validation", fields: { customerType: "invalid_enum" } }
  }
  const needs: string[] = []
  if ("assignedTo" in patch && !can(actor, "crm.leads.assign")) needs.push("crm.leads.assign")
  const editKeys = Object.keys(patch).filter(k => k !== "assignedTo")
  if (editKeys.length && !can(actor, "crm.leads.edit")) needs.push("crm.leads.edit")
  if (needs.length) return { ok: false, status: 403, error: "forbidden", required: needs }

  const deals = crm.collection(COLL.deals)
  const deal = await deals.findOne({ _id: dealId })
  if (!deal || !(await dealVisible(crm, scope, deal))) return { ok: false, status: 404, error: "not_found" }
  // Suggestion ops are contact-level and allowed on a closed deal's contact; every other field needs an open deal.
  const dealFieldKeys = Object.keys(patch).filter(k => !SUGGESTION_OPS.has(k))
  if (!deal.isOpen && dealFieldKeys.length) return { ok: false, status: 409, error: "deal_closed" }

  // Suggestion decisions first: a missing suggestion answers 404 before anything is written.
  for (const op of ["rejectSuggestion", "acceptSuggestion"] as const) {
    const sop = patch[op]
    if (!sop) continue
    const r = await decideSuggestion(crm, actor, deal, dealId, sop, op === "acceptSuggestion" ? "accepted" : "rejected", deps)
    if (!r.ok) return r
  }
  if (dealFieldKeys.length === 0) {
    const fresh = await deals.findOne({ _id: dealId }, { projection: Object.fromEntries(DEAL_DETAIL_FIELDS.map(f => [f, 1])) })
    return { ok: true, deal: toClient(fresh) }
  }

  const now = deps.now ?? new Date()
  const me = userRefOf(actor)
  const $set: Document = {}
  const before: Record<string, unknown> = {}
  const after: Record<string, unknown> = {}

  let newAssignee: UserRef | null | undefined
  if ("assignedTo" in patch) {
    if (patch.assignedTo === null) newAssignee = null
    else {
      const hit = (await deps.assignable()).find(u => u.id === patch.assignedTo)
      if (!hit) return { ok: false, status: 400, error: "validation", fields: { assignedTo: "unknown_user" } }
      newAssignee = { userId: hit.id, name: hit.name }
    }
    const prev = deal.assignedTo ? String(deal.assignedTo.userId) : null
    const next = newAssignee ? newAssignee.userId : null
    if (prev !== next) {
      $set.assignedTo = newAssignee
      before.assignedTo = prev
      after.assignedTo = next
    } else newAssignee = undefined
  }
  if ("nextFollowUpAt" in patch) {
    const prev = deal.nextFollowUpAt instanceof Date ? deal.nextFollowUpAt.getTime() : null
    const next = patch.nextFollowUpAt ? patch.nextFollowUpAt.getTime() : null
    if (prev !== next) {
      $set.nextFollowUpAt = patch.nextFollowUpAt ?? null
      before.nextFollowUpAt = iso(deal.nextFollowUpAt)
      after.nextFollowUpAt = iso(patch.nextFollowUpAt)
    }
  }
  if (patch.productInterest) {
    $set.productInterest = patch.productInterest
    before.productInterest = Array.isArray(deal.productInterest) ? deal.productInterest.length : 0
    after.productInterest = patch.productInterest.length
  }
  if (patch.customerType && patch.customerType !== deal.customerType) {
    $set.customerType = patch.customerType
    before.customerType = deal.customerType ?? null
    after.customerType = patch.customerType
  }

  if (Object.keys($set).length === 0 && !patch.customerType) {
    const fresh = await deals.findOne({ _id: dealId }, { projection: Object.fromEntries(DEAL_DETAIL_FIELDS.map(f => [f, 1])) })
    return { ok: true, deal: toClient(fresh) }
  }

  if (Object.keys($set).length) {
    $set.updatedAt = now
    const res = await deals.updateOne({ _id: dealId, isOpen: true }, { $set })
    if (res.matchedCount !== 1) return { ok: false, status: 409, error: "deal_closed" }
  }

  const contacts = crm.collection(COLL.contacts)
  const activities = crm.collection(COLL.activities)
  const contactId = deal.contactId as ObjectId

  if (newAssignee !== undefined) {
    // The open deal's assignee is the contact's and its conversations' assignee too (inbox filter).
    await contacts.updateOne({ _id: contactId }, { $set: { assignedTo: newAssignee, updatedAt: now } })
    await crm.collection(COLL.conversations).updateMany({ contactId }, { $set: { assignedTo: newAssignee, updatedAt: now } })
    await activities.insertOne({
      contactId,
      dealId,
      kind: "assignment",
      at: now,
      by: me,
      summary: newAssignee ? `Assigned to ${newAssignee.name}` : "Unassigned",
      data: { from: before.assignedTo ?? null, to: newAssignee ? newAssignee.userId : null },
    })
  }

  if (patch.customerType) {
    // Confirm on the contact; decide pending customerType suggestions (accepted if equal, else rejected).
    await contacts.updateOne({ _id: contactId }, { $set: { customerType: patch.customerType, updatedAt: now } })
    const decided = { decidedBy: me }
    await contacts.updateOne(
      { _id: contactId },
      { $set: { "suggestions.$[s].status": "accepted", "suggestions.$[s].decidedBy": decided.decidedBy } },
      { arrayFilters: [{ "s.field": "customerType", "s.status": "pending", "s.value": patch.customerType }] },
    )
    await contacts.updateOne(
      { _id: contactId },
      { $set: { "suggestions.$[s].status": "rejected", "suggestions.$[s].decidedBy": decided.decidedBy } },
      { arrayFilters: [{ "s.field": "customerType", "s.status": "pending", "s.value": { $ne: patch.customerType } }] },
    )
  }

  const changed = Object.keys(after).filter(k => k !== "assignedTo")
  if (changed.length || (patch.customerType && !("customerType" in after))) {
    const label: Record<string, string> = { nextFollowUpAt: "follow-up date", productInterest: "product interest", customerType: "customer type" }
    const keys = changed.length ? changed : ["customerType"]
    await activities.insertOne({
      contactId,
      dealId,
      kind: "field_change",
      at: now,
      by: me,
      summary: `Updated ${keys.map(k => label[k] ?? k).join(", ")}`,
      data: {
        fields: keys,
        ...(patch.nextFollowUpAt !== undefined ? { nextFollowUpAt: iso(patch.nextFollowUpAt) } : {}),
        ...(patch.productInterest ? { productInterest: patch.productInterest } : {}),
        ...(patch.customerType ? { customerType: patch.customerType } : {}),
      },
    })
  }

  await logCrmAction(crm, me, "deal.update", { type: "deal", id: dealId.toHexString() }, { before, after: { ...after, ...(patch.customerType ? { customerTypeConfirmed: patch.customerType } : {}) }, ip: deps.ip ?? null, userAgent: deps.userAgent ?? null })

  const fresh = await deals.findOne({ _id: dealId }, { projection: Object.fromEntries(DEAL_DETAIL_FIELDS.map(f => [f, 1])) })
  return { ok: true, deal: toClient(fresh) }
}

/**
 * Marks the pending contact suggestion {field: kind, value} accepted / rejected (accepting an
 * interestTag also adds the tag). One field_change activity + one audit row (kind/value/ids only).
 */
async function decideSuggestion(
  crm: CrmDb,
  actor: CrmActor,
  deal: Document,
  dealId: ObjectId,
  op: SuggestionOp,
  decision: "accepted" | "rejected",
  deps: { now?: Date; ip?: string | null; userAgent?: string | null },
): Promise<{ ok: true } | { ok: false; status: 404; error: string }> {
  const now = deps.now ?? new Date()
  const me = userRefOf(actor)
  const contactId = deal.contactId as ObjectId
  const update: Document = {
    $set: { "suggestions.$[s].status": decision, "suggestions.$[s].decidedBy": me, updatedAt: now },
  }
  if (decision === "accepted" && op.kind === "interestTag") update.$addToSet = { interestTags: op.value }
  const res = await crm.collection(COLL.contacts).updateOne(
    { _id: contactId, suggestions: { $elemMatch: { field: op.kind, value: op.value, status: "pending" } } },
    update,
    { arrayFilters: [{ "s.field": op.kind, "s.value": op.value, "s.status": "pending" }] },
  )
  if (res.matchedCount !== 1) return { ok: false, status: 404, error: "suggestion_not_found" }
  const what = op.kind === "customerType" ? "customer type" : "tag"
  await crm.collection(COLL.activities).insertOne({
    contactId,
    dealId,
    kind: "field_change",
    at: now,
    by: me,
    summary: `${decision === "accepted" ? "Accepted" : "Rejected"} suggested ${what}: ${op.value}`.slice(0, 200),
    data: { suggestion: { kind: op.kind, value: op.value, decision } },
  })
  await logCrmAction(
    crm,
    me,
    decision === "accepted" ? "contact.suggestion_accept" : "contact.suggestion_reject",
    { type: "contact", id: contactId.toHexString() },
    { after: { kind: op.kind, value: op.value, dealId: dealId.toHexString(), contactId: contactId.toHexString() }, ip: deps.ip ?? null, userAgent: deps.userAgent ?? null },
  )
  return { ok: true }
}
