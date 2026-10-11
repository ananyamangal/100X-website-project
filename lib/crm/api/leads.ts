/** /api/crm/leads (list + manual call entry, STEP 3d). Imports lib/crm/notes via leads/manual (write-only call note). */
import { crmError, crmJson, leadScopeOf } from "./auth"
import { readJsonObject } from "../validate"
import { createManualLead, validateManualLead } from "../leads/manual"
import { listLeads, parseLeadListParams } from "../leads/query"
import { assignableOf, auditCtx, nowOf, route } from "./route"

// ─────────────────────────────────────────────────────────────────────────────
// /api/crm/leads
// ─────────────────────────────────────────────────────────────────────────────

/** GET /api/crm/leads — crm.view + (crm.leads.view_all | crm.leads.view_assigned). */
export const listLeadsHandler = route("leads.list", [], async ({ request, deps, requestId, actor, log }) => {
  const scope = leadScopeOf(actor)
  if (scope.kind === "none") return crmError(403, "forbidden", requestId, { required: ["crm.leads.view_all|crm.leads.view_assigned"] })
  const parsed = parseLeadListParams(new URL(request.url).searchParams)
  if (!parsed.ok) return crmError(400, "validation", requestId, { fields: parsed.fields })
  const crm = await deps.getDb()
  const out = await listLeads(crm, scope, parsed.params)
  log.info("listed", { count: out.items.length, total: out.total, leadScope: scope.kind })
  return crmJson(out, requestId)
})

/** POST /api/crm/leads — manual call entry; crm.view + crm.leads.create (+ crm.leads.assign to assign someone else). */
export const createLeadHandler = route("leads.create", ["crm.leads.create"], async ({ request, deps, requestId, actor, log }) => {
  const body = await readJsonObject(request)
  if (!body) return crmError(400, "invalid_json", requestId)
  const v = validateManualLead(body)
  if (!v.ok) return crmError(400, "validation", requestId, { fields: v.fields })
  const crm = await deps.getDb()
  const res = await createManualLead(crm, actor, v.input, { assignable: assignableOf(deps), now: nowOf(deps), ...auditCtx(request) })
  if (!res.ok) return crmError(res.status, res.error, requestId, { ...(res.fields ? { fields: res.fields } : {}), ...(res.required ? { required: res.required } : {}) })
  log.info("lead captured", { contactId: res.contactId, dealId: res.dealId, created: res.created, dealOutcome: res.dealOutcome, existingDealer: res.existingDealer })
  const { ok: _ok, ...payload } = res
  return crmJson(payload, requestId, res.created || res.dealCreated ? 201 : 200)
})
