/**
 * Tasks (STEP 7; DATA_MODEL §1.13). One collection for manual tasks and rule tasks (the rule
 * evaluator in ./rules.ts writes the same shape with origin {kind:"rule"} and a unique dedupeKey).
 *
 * Visibility: view_all sees every task; others see tasks assigned to them, plus — when listing a
 * contact's tasks — the tasks on a contact they can see. Completing your own task never needs more
 * than crm.view; creating, editing, reassigning and cancelling need crm.tasks.manage, and assigning
 * to someone else also crm.leads.assign. Done tasks with a contact write a `task_done` timeline row.
 * Audit rows hold ids, enums and dates only (titles can name the customer).
 */
import { ObjectId, type Document } from "mongodb"
import type { CrmDb } from "../db"
import { logCrmAction } from "../audit"
import { COLL } from "../model"
import { can, userRefOf, type CrmActor, type LeadScope } from "../api/auth"
import { contactVisible, toClient } from "../leads/query"
import { Checker, type FieldErrors } from "../validate"

export const TASK_FIELDS = ["title", "dueAt", "assignedTo", "status", "doneAt", "contactId", "dealId", "origin", "staffPush", "createdAt", "updatedAt"] as const
const proj = Object.fromEntries(TASK_FIELDS.map(f => [f, 1]))
const IST = 5.5 * 3600_000
const DAY = 86_400_000

/** Start of the IST day containing `d`, as a UTC instant. */
export function istDayStart(d: Date): Date {
  const t = d.getTime() + IST
  return new Date(t - (t % DAY) - IST)
}

export type TaskBucket = "overdue" | "today" | "upcoming" | "done"
export function bucketOf(task: { status: string; dueAt: Date }, now: Date): TaskBucket {
  if (task.status !== "open") return "done"
  const start = istDayStart(now)
  if (task.dueAt < start) return "overdue"
  if (task.dueAt < new Date(start.getTime() + DAY)) return "today"
  return "upcoming"
}

export interface TaskInput {
  title?: string
  dueAt?: Date
  assignedTo?: string
  contactId?: ObjectId | null
  dealId?: ObjectId | null
  status?: "open" | "done" | "cancelled"
}

const CREATE_KEYS = new Set(["title", "dueAt", "assignedTo", "contactId", "dealId"])
const PATCH_KEYS = new Set(["title", "dueAt", "assignedTo", "status"])

export function parseTaskInput(body: Record<string, unknown>, mode: "create" | "patch"): { ok: true; input: TaskInput } | { ok: false; fields: FieldErrors } {
  const c = new Checker()
  const keys = mode === "create" ? CREATE_KEYS : PATCH_KEYS
  for (const k of Object.getOwnPropertyNames(body)) if (!keys.has(k) || k === "__proto__") c.fail(k, "unknown_field")
  const input: TaskInput = {}
  const title = c.str(body, "title", 200, { required: mode === "create" })
  if (title !== null) input.title = title
  if (mode === "create" || body.dueAt !== undefined) {
    const v = body.dueAt
    const d = typeof v === "string" && v.length <= 40 ? new Date(v) : null
    if (v === undefined || v === null || v === "") { if (mode === "create") c.fail("dueAt", "required") }
    else if (!d || Number.isNaN(d.getTime())) c.fail("dueAt", "invalid_date")
    else if (d.getUTCFullYear() < 2020 || d.getUTCFullYear() > 2100) c.fail("dueAt", "out_of_range")
    else input.dueAt = d
  }
  if (body.assignedTo !== undefined) {
    if (typeof body.assignedTo !== "string" || !/^[\w-]{1,64}$/.test(body.assignedTo)) c.fail("assignedTo", "invalid")
    else input.assignedTo = body.assignedTo
  }
  if (mode === "create") {
    const cid = c.oid(body, "contactId")
    const did = c.oid(body, "dealId")
    input.contactId = cid ? new ObjectId(cid) : null
    input.dealId = did ? new ObjectId(did) : null
    if (did && !cid) c.fail("contactId", "required_with_deal")
  } else if (body.status !== undefined) {
    if (body.status !== "open" && body.status !== "done" && body.status !== "cancelled") c.fail("status", "invalid_enum")
    else input.status = body.status
  }
  if (mode === "patch" && c.ok && Object.keys(input).length === 0) c.fail("body", "empty")
  return c.ok ? { ok: true, input } : { ok: false, fields: c.errors }
}

export type TaskResult = { ok: true; task: Document } | { ok: false; status: 400 | 403 | 404 | 409; error: string; fields?: FieldErrors; required?: string[] }

export interface TaskDeps {
  now?: Date
  assignable: () => Promise<{ id: string; name: string }[]>
  ip?: string | null
  userAgent?: string | null
}

export const taskView = (t: Document) => toClient(t)

async function resolveAssignee(actor: CrmActor, target: string | undefined, deps: TaskDeps): Promise<{ ok: true; ref: { userId: string; name: string } } | { ok: false; res: TaskResult }> {
  if (!target || target === actor.userId) return { ok: true, ref: userRefOf(actor) }
  if (!can(actor, "crm.leads.assign")) return { ok: false, res: { ok: false, status: 403, error: "forbidden", required: ["crm.leads.assign"] } }
  const u = (await deps.assignable()).find(x => x.id === target)
  if (!u) return { ok: false, res: { ok: false, status: 400, error: "validation", fields: { assignedTo: "not_assignable" } } }
  return { ok: true, ref: { userId: u.id, name: u.name } }
}

async function taskVisible(crm: CrmDb, actor: CrmActor, scope: LeadScope, t: Document): Promise<boolean> {
  if (scope.kind === "all") return true
  if (t.assignedTo && String(t.assignedTo.userId) === actor.userId) return true
  if (scope.kind === "none" || !t.contactId) return false
  const contact = await crm.collection(COLL.contacts).findOne({ _id: t.contactId }, { projection: { assignedTo: 1 } })
  return !!contact && (await contactVisible(crm, scope, contact))
}

export async function createTask(crm: CrmDb, actor: CrmActor, scope: LeadScope, input: TaskInput, deps: TaskDeps): Promise<TaskResult> {
  const now = deps.now ?? new Date()
  if (input.contactId) {
    const contact = await crm.collection(COLL.contacts).findOne({ _id: input.contactId }, { projection: { assignedTo: 1 } })
    if (!contact || !(await contactVisible(crm, scope, contact))) return { ok: false, status: 404, error: "not_found" }
    if (input.dealId) {
      const deal = await crm.collection(COLL.deals).findOne({ _id: input.dealId, contactId: input.contactId }, { projection: { _id: 1 } })
      if (!deal) return { ok: false, status: 400, error: "validation", fields: { dealId: "not_of_contact" } }
    }
  }
  const a = await resolveAssignee(actor, input.assignedTo, deps)
  if (!a.ok) return a.res
  const me = userRefOf(actor)
  const doc: Document = {
    _id: new ObjectId(),
    title: input.title,
    dueAt: input.dueAt,
    assignedTo: a.ref,
    status: "open",
    doneAt: null,
    contactId: input.contactId ?? null,
    dealId: input.dealId ?? null,
    origin: { kind: "manual", by: me },
    dedupeKey: null,
    staffPush: { status: "none" },
    createdAt: now,
    updatedAt: now,
  }
  await crm.collection(COLL.tasks).insertOne(doc)
  await logCrmAction(crm, me, "task.create", { type: "task", id: String(doc._id) }, {
    after: { assignedTo: a.ref.userId, dueAt: (input.dueAt as Date).toISOString(), contactId: input.contactId ? String(input.contactId) : null },
    ip: deps.ip ?? null, userAgent: deps.userAgent ?? null,
  })
  return { ok: true, task: doc }
}

export async function updateTask(crm: CrmDb, actor: CrmActor, scope: LeadScope, id: ObjectId, input: TaskInput, deps: TaskDeps): Promise<TaskResult> {
  const now = deps.now ?? new Date()
  const t = await crm.collection(COLL.tasks).findOne({ _id: id })
  if (!t || !(await taskVisible(crm, actor, scope, t))) return { ok: false, status: 404, error: "not_found" }
  const mine = t.assignedTo && String(t.assignedTo.userId) === actor.userId
  // The assignee may complete or reopen their own task; everything else is task management.
  const onlyStatus = Object.keys(input).length === 1 && (input.status === "done" || input.status === "open")
  if (!(onlyStatus && mine) && !can(actor, "crm.tasks.manage")) return { ok: false, status: 403, error: "forbidden", required: ["crm.tasks.manage"] }
  const $set: Document = { updatedAt: now }
  if (input.title !== undefined) $set.title = input.title
  if (input.dueAt !== undefined) $set.dueAt = input.dueAt
  if (input.assignedTo !== undefined) {
    const a = await resolveAssignee(actor, input.assignedTo, deps)
    if (!a.ok) return a.res
    $set.assignedTo = a.ref
  }
  if (input.status !== undefined && input.status !== t.status) {
    $set.status = input.status
    $set.doneAt = input.status === "done" ? now : null
  }
  // Optimistic concurrency on a revision counter (timestamps can tie within a millisecond).
  // `rev: null` also matches rows written before the counter existed.
  const res = await crm.collection(COLL.tasks).updateOne({ _id: id, rev: typeof t.rev === "number" ? t.rev : null }, { $set, $inc: { rev: 1 } })
  if (res.matchedCount !== 1) return { ok: false, status: 409, error: "conflict" }
  const me = userRefOf(actor)
  if ($set.status === "done" && t.contactId) {
    await crm.collection(COLL.activities).insertOne({
      contactId: t.contactId,
      dealId: t.dealId ?? null,
      kind: "task_done",
      at: now,
      by: me,
      summary: `Task done: ${String($set.title ?? t.title).slice(0, 120)}`,
      data: { taskId: id },
    })
  }
  await logCrmAction(crm, me, "task.update", { type: "task", id: id.toHexString() }, {
    before: { status: t.status, assignedTo: t.assignedTo?.userId ?? null, dueAt: t.dueAt instanceof Date ? t.dueAt.toISOString() : null },
    after: { status: $set.status ?? t.status, assignedTo: ($set.assignedTo ?? t.assignedTo)?.userId ?? null, dueAt: ($set.dueAt ?? t.dueAt)?.toISOString?.() ?? null },
    ip: deps.ip ?? null, userAgent: deps.userAgent ?? null,
  })
  return { ok: true, task: { ...t, ...$set } }
}

export interface ListParams {
  view: "mine" | "all"
  status: "open" | "done" | "all"
  contactId: ObjectId | null
  limit: number
}

export function parseListParams(sp: URLSearchParams): { ok: true; p: ListParams } | { ok: false; fields: FieldErrors } {
  const fields: FieldErrors = {}
  const view = sp.get("view") ?? "mine"
  if (view !== "mine" && view !== "all") fields.view = "invalid_enum"
  const status = sp.get("status") ?? "open"
  if (!["open", "done", "all"].includes(status)) fields.status = "invalid_enum"
  const cid = sp.get("contactId")
  if (cid && !/^[a-f0-9]{24}$/i.test(cid)) fields.contactId = "invalid_id"
  const limit = sp.get("limit") ? Number(sp.get("limit")) : 100
  if (!Number.isInteger(limit) || limit < 1 || limit > 200) fields.limit = "invalid_number"
  if (Object.keys(fields).length) return { ok: false, fields }
  return { ok: true, p: { view: view as "mine" | "all", status: status as ListParams["status"], contactId: cid ? new ObjectId(cid) : null, limit } }
}

export async function listTasks(crm: CrmDb, actor: CrmActor, scope: LeadScope, p: ListParams): Promise<{ ok: true; items: Document[] } | { ok: false; status: 403 | 404; error: string }> {
  const filter: Document = {}
  if (p.status !== "all") filter.status = p.status === "open" ? "open" : { $in: ["done", "cancelled"] }
  if (p.contactId) {
    const contact = await crm.collection(COLL.contacts).findOne({ _id: p.contactId }, { projection: { assignedTo: 1 } })
    if (!contact || !(await contactVisible(crm, scope, contact))) return { ok: false, status: 404, error: "not_found" }
    filter.contactId = p.contactId
  } else if (p.view === "all") {
    if (scope.kind !== "all") return { ok: false, status: 403, error: "forbidden" }
  } else filter["assignedTo.userId"] = actor.userId
  const items = await crm
    .collection(COLL.tasks)
    .find(filter, { sort: p.status === "open" ? { dueAt: 1, _id: 1 } : { doneAt: -1, updatedAt: -1 }, limit: p.limit, projection: proj })
    .toArray()
  return { ok: true, items }
}

