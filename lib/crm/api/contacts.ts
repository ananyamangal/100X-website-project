/** /api/crm/contacts/:id (contact + deals + timeline, never notes) and PATCH /api/crm/deals/:id. Must not import lib/crm/notes. */
import { crmError, crmJson, leadScopeOf } from "./auth"
import { readJsonObject } from "../validate"
import { contactVisible, getContactDetail, loadTimeline, parseBefore } from "../leads/query"
import { COLL } from "../model"
import { applyDealPatch, parseDealPatch } from "../leads/deal-patch"
import { assignableOf, auditCtx, idParam, nowOf, route } from "./route"

// ─────────────────────────────────────────────────────────────────────────────
// /api/crm/contacts/:id
// ─────────────────────────────────────────────────────────────────────────────

/** GET /api/crm/contacts/:id?before=&limit= — contact + deals + timeline. NO internal notes. */
export const contactDetailHandler = route("contacts.get", [], async ({ request, ctx, deps, requestId, actor }) => {
  const scope = leadScopeOf(actor)
  if (scope.kind === "none") return crmError(403, "forbidden", requestId, { required: ["crm.leads.view_all|crm.leads.view_assigned"] })
  const id = await idParam(ctx)
  if (!id) return crmError(400, "validation", requestId, { fields: { id: "invalid_id" } })
  const sp = new URL(request.url).searchParams
  const before = parseBefore(sp.get("before"))
  if (before === null) return crmError(400, "validation", requestId, { fields: { before: "invalid_date" } })
  const limit = sp.get("limit") ? Number(sp.get("limit")) : 50
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) return crmError(400, "validation", requestId, { fields: { limit: "invalid_number" } })
  const crm = await deps.getDb()
  const out = await getContactDetail(crm, scope, id, { before, limit })
  if (!out.ok) return crmError(404, "not_found", requestId)
  const { ok: _ok, ...payload } = out
  return crmJson(payload, requestId)
})

/** GET /api/crm/contacts/:id/timeline?before=&limit= — next timeline page only (DATA_MODEL §1.3). */
export const contactTimelineHandler = route("contacts.timeline", [], async ({ request, ctx, deps, requestId, actor }) => {
  const scope = leadScopeOf(actor)
  if (scope.kind === "none") return crmError(403, "forbidden", requestId, { required: ["crm.leads.view_all|crm.leads.view_assigned"] })
  const id = await idParam(ctx)
  if (!id) return crmError(400, "validation", requestId, { fields: { id: "invalid_id" } })
  const sp = new URL(request.url).searchParams
  const before = parseBefore(sp.get("before"))
  if (before === null) return crmError(400, "validation", requestId, { fields: { before: "invalid_date" } })
  const limit = sp.get("limit") ? Number(sp.get("limit")) : 50
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) return crmError(400, "validation", requestId, { fields: { limit: "invalid_number" } })
  const crm = await deps.getDb()
  const contact = await crm.collection(COLL.contacts).findOne({ _id: id }, { projection: { assignedTo: 1 } })
  if (!contact || !(await contactVisible(crm, scope, contact))) return crmError(404, "not_found", requestId)
  return crmJson(await loadTimeline(crm, id, { before, limit }), requestId)
})

// ─────────────────────────────────────────────────────────────────────────────
// /api/crm/deals/:id
// ─────────────────────────────────────────────────────────────────────────────

/** PATCH /api/crm/deals/:id — crm.view; assignedTo needs crm.leads.assign, other fields crm.leads.edit. */
export const patchDealHandler = route("deals.patch", [], async ({ request, ctx, deps, requestId, actor, log }) => {
  const id = await idParam(ctx)
  if (!id) return crmError(400, "validation", requestId, { fields: { id: "invalid_id" } })
  const body = await readJsonObject(request)
  if (!body) return crmError(400, "invalid_json", requestId)
  const p = parseDealPatch(body)
  if (!p.ok) return crmError(p.status, p.error, requestId, p.fields ? { fields: p.fields } : {})
  const scope = leadScopeOf(actor)
  const crm = await deps.getDb()
  const res = await applyDealPatch(crm, actor, scope, id, p.patch, { assignable: assignableOf(deps), now: nowOf(deps), ...auditCtx(request) })
  if (!res.ok) return crmError(res.status, res.error, requestId, { ...(res.fields ? { fields: res.fields } : {}), ...(res.required ? { required: res.required } : {}) })
  log.info("deal patched", { dealId: id.toHexString(), fields: Object.keys(p.patch).join(",") })
  return crmJson({ deal: res.deal }, requestId)
})
