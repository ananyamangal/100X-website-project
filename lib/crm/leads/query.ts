/**
 * Read side for the dashboard (STEP 4a lead list, 4b contact page).
 *
 * Sales-invisible rule (DATA_MODEL conventions, ADR §15): every read uses an explicit field
 * whitelist. crm_attribution / crm_conversion_events are never referenced here, and
 * crm_internal_notes is never read here (notes have their own route and permission).
 */
import { ObjectId, type Document } from "mongodb"
import type { CrmDb } from "../db"
import { scopedLookup } from "../db"
import { fromHumanInput } from "../phone"
import { COLL, CUSTOMER_TYPES, LEAD_SOURCES, STAGES, type CustomerType, type LeadSource, type Stage } from "../model"
import type { LeadScope } from "../api/auth"
import { escapeRegex, type FieldErrors } from "../validate"

// ─────────────────────────────────────────────────────────────────────────────
// Projections (whitelists)
// ─────────────────────────────────────────────────────────────────────────────

export const CONTACT_SUMMARY_FIELDS = [
  "phoneE164", "phoneKind", "name", "waProfileName", "company", "customerType", "state", "city",
  "existingDealer", "assignedTo", "lastActivityAt", "marketingOptOut", "notOnWhatsApp",
] as const

export const CONTACT_DETAIL_FIELDS = [
  ...CONTACT_SUMMARY_FIELDS,
  "waId", "altPhones", "email", "language", "interestTags", "suggestions", "amcDueAt", "origin", "mergedInto",
  "createdBy", "createdAt", "updatedAt",
] as const

export const DEAL_LIST_FIELDS = [
  "contactId", "stage", "stageEnteredAt", "isOpen", "isRepeat", "leadSource", "customerType", "assignedTo",
  "productInterest", "nextFollowUpAt", "state", "city", "closedAt", "createdAt", "updatedAt",
] as const

export const DEAL_DETAIL_FIELDS = [
  ...DEAL_LIST_FIELDS,
  "stageHistory", "intent", "lastQuotation", "won", "lost", "customerReminders", "origin", "createdBy",
] as const

export const ACTIVITY_FIELDS = ["contactId", "dealId", "kind", "at", "by", "summary", "data"] as const

export const MESSAGE_FIELDS = [
  "conversationId", "direction", "type", "text", "media.mime", "media.filename", "media.caption", "media.bytes",
  "media.url", "media.storage", "template", "interactive", "location", "contextWaMessageId", "unsupported",
  "status", "statusAt", "error", "author", "waTimestamp", "createdAt",
] as const

const proj = (fields: readonly string[]): Record<string, 1> => Object.fromEntries(fields.map(f => [f, 1]))

// ─────────────────────────────────────────────────────────────────────────────
// Serialisation: ObjectId → hex, Date → ISO, recursively
// ─────────────────────────────────────────────────────────────────────────────

export function toClient(v: unknown): unknown {
  if (v === null || v === undefined) return v ?? null
  if (v instanceof ObjectId) return v.toHexString()
  if (v instanceof Date) return v.toISOString()
  if (Array.isArray(v)) return v.map(toClient)
  if (typeof v === "object") {
    const proto = Object.getPrototypeOf(v)
    if (proto !== Object.prototype && proto !== null) return String(v)
    const out: Record<string, unknown> = {}
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) out[k === "_id" ? "id" : k] = toClient(x)
    return out
  }
  return v
}

// ─────────────────────────────────────────────────────────────────────────────
// Visibility
// ─────────────────────────────────────────────────────────────────────────────

const assignedTo = (doc: Document | null | undefined, userId: string) =>
  !!doc && !!doc.assignedTo && String(doc.assignedTo.userId) === userId

/** A contact is visible to an "assigned" scope when the contact or any of its deals is assigned to the user. */
export async function contactVisible(crm: CrmDb, scope: LeadScope, contact: Document): Promise<boolean> {
  if (scope.kind === "all") return true
  if (scope.kind === "none") return false
  if (assignedTo(contact, scope.userId)) return true
  const d = await crm.collection(COLL.deals).findOne({ contactId: contact._id, "assignedTo.userId": scope.userId }, { projection: { _id: 1 } })
  return !!d
}

export async function dealVisible(crm: CrmDb, scope: LeadScope, deal: Document): Promise<boolean> {
  if (scope.kind === "all") return true
  if (scope.kind === "none") return false
  if (assignedTo(deal, scope.userId)) return true
  const c = await crm.collection(COLL.contacts).findOne({ _id: deal.contactId }, { projection: { assignedTo: 1 } })
  return assignedTo(c, scope.userId)
}

// ─────────────────────────────────────────────────────────────────────────────
// Lead list (deals + contact summary)
// ─────────────────────────────────────────────────────────────────────────────

export interface LeadListParams {
  stages: Stage[]
  sources: LeadSource[]
  customerTypes: CustomerType[]
  /** userId, or "unassigned". */
  assignee: string | null
  existingDealer: boolean | null
  status: "open" | "closed" | "all"
  q: string | null
  page: number
  pageSize: number
}

const listOf = <T extends string>(sp: URLSearchParams, name: string, allowed: readonly T[], errors: FieldErrors): T[] => {
  const raw = sp.getAll(name).flatMap(v => v.split(",")).map(v => v.trim()).filter(Boolean)
  const bad = raw.filter(v => !(allowed as readonly string[]).includes(v))
  if (bad.length) errors[name] = "invalid_enum"
  return raw.filter((v): v is T => (allowed as readonly string[]).includes(v))
}

export function parseLeadListParams(sp: URLSearchParams): { ok: true; params: LeadListParams } | { ok: false; fields: FieldErrors } {
  const errors: FieldErrors = {}
  const stages = listOf(sp, "stage", STAGES, errors)
  const sources = listOf(sp, "source", LEAD_SOURCES, errors)
  const customerTypes = listOf(sp, "customerType", CUSTOMER_TYPES, errors)
  const assigneeRaw = sp.get("assignee")?.trim() || null
  if (assigneeRaw && assigneeRaw !== "unassigned" && !/^[a-f0-9]{24}$/i.test(assigneeRaw) && assigneeRaw !== "legacy-super-admin") errors.assignee = "invalid_id"
  const ed = sp.get("existingDealer")?.trim() ?? ""
  const existingDealer = ed === "" ? null : ed === "true" || ed === "1" ? true : ed === "false" || ed === "0" ? false : (errors.existingDealer = "invalid_boolean", null)
  const st = sp.get("status")?.trim() || "all"
  if (!["open", "closed", "all"].includes(st)) errors.status = "invalid_enum"
  const q = sp.get("q")?.trim() || null
  if (q && q.length > 100) errors.q = "too_long"
  const page = Number(sp.get("page") ?? "1")
  const pageSize = Number(sp.get("pageSize") ?? "25")
  if (!Number.isInteger(page) || page < 1 || page > 400) errors.page = "invalid_number"
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) errors.pageSize = "invalid_number"
  if (Object.keys(errors).length) return { ok: false, fields: errors }
  return {
    ok: true,
    params: { stages, sources, customerTypes, assignee: assigneeRaw, existingDealer, status: st as LeadListParams["status"], q, page, pageSize },
  }
}

/** Contact-level match for `q`: mobile in any format (exact via fromHumanInput + digit prefix) or name/company. */
export function contactSearchFilter(q: string, prefix = ""): Document {
  const f = (k: string) => prefix + k
  const digits = q.replace(/\D/g, "")
  const phoneLike = /^[\d\s+()\-.]+$/.test(q) && digits.length >= 3
  if (phoneLike) {
    const ors: Document[] = []
    const p = fromHumanInput(q)
    if (p.ok) ors.push({ [f("phoneE164")]: p.phoneE164 }, { [f("altPhones")]: p.phoneE164 })
    const d = q.trim().startsWith("+") ? digits : digits.replace(/^0+/, "")
    if (d) {
      ors.push({ [f("phoneE164")]: { $regex: "^\\+" + d } })
      if (!q.trim().startsWith("+")) ors.push({ [f("phoneE164")]: { $regex: "^\\+91" + d } }, { [f("altPhones")]: { $regex: "^\\+91" + d } })
    }
    return { $or: ors }
  }
  const rx = { $regex: escapeRegex(q), $options: "i" }
  return { $or: [{ [f("name")]: rx }, { [f("company")]: rx }, { [f("waProfileName")]: rx }] }
}

export interface LeadListResult {
  items: unknown[]
  total: number
  page: number
  pageSize: number
}

export async function listLeads(crm: CrmDb, scope: LeadScope, p: LeadListParams): Promise<LeadListResult> {
  const dealMatch: Document = {}
  if (p.stages.length) dealMatch.stage = { $in: p.stages }
  if (p.sources.length) dealMatch.leadSource = { $in: p.sources }
  if (p.customerTypes.length) dealMatch.customerType = { $in: p.customerTypes }
  if (p.status !== "all") dealMatch.isOpen = p.status === "open"
  const and: Document[] = []
  if (p.assignee === "unassigned") and.push({ assignedTo: null })
  else if (p.assignee) and.push({ "assignedTo.userId": p.assignee })
  if (scope.kind === "assigned") and.push({ "assignedTo.userId": scope.userId })
  if (and.length) dealMatch.$and = and

  const contactMatch: Document[] = []
  if (p.existingDealer === true) contactMatch.push({ "c.existingDealer": { $ne: null } })
  if (p.existingDealer === false) contactMatch.push({ "c.existingDealer": null })
  if (p.q) contactMatch.push(contactSearchFilter(p.q, "c."))

  const pipeline: Document[] = [
    { $match: dealMatch },
    scopedLookup(crm.workspace, {
      from: COLL.contacts,
      as: "c",
      localField: "contactId",
      foreignField: "_id",
      pipeline: [{ $project: proj([...CONTACT_SUMMARY_FIELDS, "altPhones"]) }],
    }),
    { $unwind: "$c" },
    ...(contactMatch.length ? [{ $match: { $and: contactMatch } }] : []),
    { $sort: { "c.lastActivityAt": -1, createdAt: -1, _id: -1 } },
    {
      $facet: {
        items: [
          { $skip: (p.page - 1) * p.pageSize },
          { $limit: p.pageSize },
          { $project: { ...proj(DEAL_LIST_FIELDS), ...Object.fromEntries(CONTACT_SUMMARY_FIELDS.map(k => ["c." + k, 1])) } },
        ],
        total: [{ $count: "n" }],
      },
    },
  ]
  const [out] = await crm.collection(COLL.deals).aggregate(pipeline).toArray()
  const rows: Document[] = (out?.items as Document[]) ?? []
  const total = Number((out?.total as Document[])?.[0]?.n ?? 0)
  const items = rows.map(r => {
    const { c, _id, ...deal } = r
    return { dealId: toClient(_id), ...(toClient(deal) as Record<string, unknown>), contact: toClient(c) }
  })
  return { items, total, page: p.page, pageSize: p.pageSize }
}

// ─────────────────────────────────────────────────────────────────────────────
// Contact page: contact + deals + merged timeline (activities ⊕ messages). No notes.
// ─────────────────────────────────────────────────────────────────────────────

export interface TimelineItem {
  type: "activity" | "message"
  at: string
  item: unknown
}

export async function loadTimeline(
  crm: CrmDb,
  contactId: ObjectId,
  opts: { before?: Date | null; limit?: number } = {},
): Promise<{ items: TimelineItem[]; nextBefore: string | null }> {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 100)
  const before = opts.before ?? null
  const [acts, msgs] = await Promise.all([
    crm
      .collection(COLL.activities)
      .find({ contactId, ...(before ? { at: { $lt: before } } : {}) }, { sort: { at: -1, _id: -1 }, limit: limit + 1, projection: proj(ACTIVITY_FIELDS) })
      .toArray(),
    crm
      .collection(COLL.messages)
      .find({ contactId, ...(before ? { createdAt: { $lt: before } } : {}) }, { sort: { createdAt: -1, _id: -1 }, limit: limit + 1, projection: proj(MESSAGE_FIELDS) })
      .toArray(),
  ])
  const merged: { t: number; type: "activity" | "message"; doc: Document }[] = [
    ...acts.map(d => ({ t: d.at instanceof Date ? d.at.getTime() : 0, type: "activity" as const, doc: d })),
    ...msgs.map(d => ({ t: d.createdAt instanceof Date ? d.createdAt.getTime() : 0, type: "message" as const, doc: d })),
  ].sort((a, b) => b.t - a.t)
  const page = merged.slice(0, limit)
  const more = merged.length > limit
  const items: TimelineItem[] = page.map(m => ({ type: m.type, at: new Date(m.t).toISOString(), item: toClient(m.doc) }))
  return { items, nextBefore: more && page.length ? new Date(page[page.length - 1].t).toISOString() : null }
}

export type ContactDetail =
  | { ok: true; contact: unknown; deals: unknown[]; timeline: { items: TimelineItem[]; nextBefore: string | null } }
  | { ok: false; status: 404 }

export async function getContactDetail(
  crm: CrmDb,
  scope: LeadScope,
  contactId: ObjectId,
  opts: { before?: Date | null; limit?: number } = {},
): Promise<ContactDetail> {
  const contact = await crm.collection(COLL.contacts).findOne({ _id: contactId }, { projection: proj(CONTACT_DETAIL_FIELDS) })
  if (!contact || !(await contactVisible(crm, scope, contact))) return { ok: false, status: 404 }
  const deals = await crm
    .collection(COLL.deals)
    .find({ contactId }, { sort: { createdAt: -1 }, limit: 50, projection: proj(DEAL_DETAIL_FIELDS) })
    .toArray()
  const timeline = await loadTimeline(crm, contactId, opts)
  return { ok: true, contact: toClient(contact), deals: deals.map(toClient), timeline }
}

/** Parses an ISO `before` cursor; undefined when absent, null when invalid. */
export function parseBefore(v: string | null): Date | undefined | null {
  if (!v) return undefined
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d
}
