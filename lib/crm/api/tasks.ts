/** /api/crm/tasks (STEP 7). Imports no notes module. */
import type { Document, ObjectId } from "mongodb"
import { crmError, crmJson, leadScopeOf } from "./auth"
import { readJsonObject } from "../validate"
import { COLL } from "../model"
import { bucketOf, createTask, listTasks, parseListParams, parseTaskInput, taskView, updateTask, type TaskDeps } from "../tasks/service"
import { assignableOf, auditCtx, idParam, nowOf, route, type CrmApiDeps } from "./route"
import { prettyName } from "../tasks/display"
import { driveReminders } from "../reminders/drive"
import { readCrmEnv } from "../env"

const depsOf = (deps: CrmApiDeps, request: Request): TaskDeps => ({ now: nowOf(deps), assignable: assignableOf(deps), ...auditCtx(request) })

/** Adds {bucket, contact:{id,name,phoneE164}} for the list / response rows. */
async function decorate(crm: Awaited<ReturnType<CrmApiDeps["getDb"]>>, rows: Document[], now: Date) {
  const ids = Array.from(new Map(rows.filter(r => r.contactId).map(r => [String(r.contactId), r.contactId as ObjectId])).values())
  const contacts = ids.length ? await crm.collection(COLL.contacts).find({ _id: { $in: ids } }, { projection: { name: 1, waProfileName: 1, company: 1, phoneE164: 1 } }).toArray() : []
  const byId = new Map(contacts.map(c => [String(c._id), c]))
  return rows.map(r => {
    const c = r.contactId ? byId.get(String(r.contactId)) : null
    return {
      ...(taskView(r) as Record<string, unknown>),
      bucket: bucketOf({ status: String(r.status), dueAt: r.dueAt as Date }, now),
      contact: c ? { id: String(c._id), name: prettyName(c), phoneE164: c.phoneE164 ?? null } : null,
    }
  })
}

/** GET /api/crm/tasks?view=mine|all&status=open|done|all&contactId= */
export const listTasksHandler = route("tasks.list", [], async ({ request, deps, requestId, actor, log }) => {
  const p = parseListParams(new URL(request.url).searchParams)
  if (!p.ok) return crmError(400, "validation", requestId, { fields: p.fields })
  const crm = await deps.getDb()
  // Lazy reminder evaluation (≤ once per 15 min per workspace): in after() on Vercel, inline in tests.
  const lazy = async () => {
    try {
      await driveReminders(crm, { env: deps.env ?? readCrmEnv(), fetch: deps.fetch, requestId, now: nowOf(deps), lazy: true, jobLimit: 10, budgetMs: 15_000 })
    } catch (e) {
      log.error("lazy reminder evaluation failed", { error: e instanceof Error ? e.name : "unknown" })
    }
  }
  if (deps.schedule) deps.schedule(lazy)
  else await lazy()
  const r = await listTasks(crm, actor, leadScopeOf(actor), p.p)
  if (!r.ok) return crmError(r.status, r.error, requestId, r.status === 403 ? { required: ["crm.leads.view_all"] } : {})
  return crmJson({ items: await decorate(crm, r.items, nowOf(deps)) }, requestId)
})

/** POST /api/crm/tasks {title, dueAt, assignedTo?, contactId?, dealId?} — crm.tasks.manage. */
export const createTaskHandler = route("tasks.create", ["crm.tasks.manage"], async ({ request, deps, requestId, actor }) => {
  const body = await readJsonObject(request)
  if (!body) return crmError(400, "invalid_json", requestId)
  const p = parseTaskInput(body, "create")
  if (!p.ok) return crmError(400, "validation", requestId, { fields: p.fields })
  const crm = await deps.getDb()
  const r = await createTask(crm, actor, leadScopeOf(actor), p.input, depsOf(deps, request))
  if (!r.ok) return crmError(r.status, r.error, requestId, { ...(r.fields ? { fields: r.fields } : {}), ...(r.required ? { required: r.required } : {}) })
  return crmJson({ task: (await decorate(crm, [r.task], nowOf(deps)))[0] }, requestId, 201)
})

/** PATCH /api/crm/tasks/:id {status?, title?, dueAt?, assignedTo?} — own task done/reopen with crm.view; else crm.tasks.manage. */
export const updateTaskHandler = route("tasks.update", [], async ({ request, ctx, deps, requestId, actor }) => {
  const id = await idParam(ctx)
  if (!id) return crmError(400, "validation", requestId, { fields: { id: "invalid_id" } })
  const body = await readJsonObject(request)
  if (!body) return crmError(400, "invalid_json", requestId)
  const p = parseTaskInput(body, "patch")
  if (!p.ok) return crmError(400, "validation", requestId, { fields: p.fields })
  const crm = await deps.getDb()
  const r = await updateTask(crm, actor, leadScopeOf(actor), id, p.input, depsOf(deps, request))
  if (!r.ok) return crmError(r.status, r.error, requestId, { ...(r.fields ? { fields: r.fields } : {}), ...(r.required ? { required: r.required } : {}) })
  return crmJson({ task: (await decorate(crm, [r.task], nowOf(deps)))[0] }, requestId)
})
